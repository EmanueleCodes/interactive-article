import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore,
    type RefObject,
    type ReactNode,
} from 'react'
import {
    measureArticleScrollProgress,
    measureWeightedChapterScrollProgress,
    scrollArticleToProgress,
    scrollToWeightedChapterProgress,
    type WeightedScrollSection,
} from './articleScrollProgress'
import { buildChapterTrack, type TrackUnit } from './chapterTrackLayout'
import {
    getActiveWordElement,
    getTimeAtViewportCenter,
    measureActiveWordViewport,
    scrollToNarrationProgress,
    scrollToNarrationTime,
} from './narrationViewport'
import {
    getActiveWordIndex,
    getCheckpointStops,
    getTranscriptDuration,
    type CheckpointStop,
    type NarrationTranscript,
} from './narrationTypes'
import {
    applyAudioPlaybackRate,
    readStoredPlaybackRate,
    stepPlaybackRate,
    storePlaybackRate,
    type NarrationPlaybackRate,
} from './playbackRate'

const NARRATION_DEBUG = true

function logNarration(event: string, details?: Record<string, unknown>) {
    if (!NARRATION_DEBUG) return
    console.log(`[narration] ${event}`, details ?? {})
}

type PlayheadStore = {
    time: number
    activeSegment: string | null
    activeWordIndex: number
    subscribe: (listener: () => void) => () => void
    getSnapshot: () => PlayheadSnapshot
}

type PlayheadSnapshot = {
    time: number
    activeSegment: string | null
    activeWordIndex: number
}

function createPlayheadStore(transcript: NarrationTranscript): PlayheadStore {
    let snapshot: PlayheadSnapshot = {
        time: 0,
        activeSegment: null,
        activeWordIndex: -1,
    }
    const listeners = new Set<() => void>()

    const notify = () => {
        for (const listener of listeners) listener()
    }

    const findActiveWord = (
        time: number,
    ): { segment: string | null; index: number } => {
        for (const seg of transcript.segments) {
            const idx = getActiveWordIndex(seg.words, time)
            if (idx >= 0) {
                return { segment: seg.id, index: idx }
            }
        }
        return { segment: null, index: -1 }
    }

    return {
        get time() {
            return snapshot.time
        },
        set time(t: number) {
            const { segment, index } = findActiveWord(t)
            const changed =
                segment !== snapshot.activeSegment ||
                index !== snapshot.activeWordIndex

            snapshot = {
                time: t,
                activeSegment: segment,
                activeWordIndex: index,
            }

            if (changed) notify()
        },
        get activeSegment() {
            return snapshot.activeSegment
        },
        get activeWordIndex() {
            return snapshot.activeWordIndex
        },
        subscribe(listener: () => void) {
            listeners.add(listener)
            return () => listeners.delete(listener)
        },
        getSnapshot() {
            return snapshot
        },
    }
}

type RegisteredChapter = {
    id: string
    ref: RefObject<HTMLElement | null>
    order: number
}

export type ChapterRegistryContextValue = {
    registerChapter: (id: string, ref: RefObject<HTMLElement | null>) => void
    unregisterChapter: (id: string) => void
}

const ChapterRegistryContext = createContext<ChapterRegistryContextValue | null>(
    null,
)

export function useChapterRegistry(): ChapterRegistryContextValue {
    const ctx = useContext(ChapterRegistryContext)
    if (!ctx) {
        throw new Error('Chapter must be used within NarrationProvider')
    }
    return ctx
}

export interface NarrationContextValue {
    transcript: NarrationTranscript
    audioRef: React.RefObject<HTMLAudioElement | null>
    /** Low-frequency state update (for UI that doesn't need 60fps) */
    currentTime: number
    duration: number
    isPlaying: boolean
    isReady: boolean
    /** Simulated playback (no audio file); uses transcript word timings */
    isDemo: boolean
    /** 0–1 read position when paused (article scroll) */
    scrollProgress: number
    /** Progress track layout (continuous content units) */
    trackLayout: TrackUnit[]
    /** Registered chapter ids in mount order */
    chapterIds: readonly string[]
    /** DOM-height weights per registered chapter (for track segment sizing) */
    chapterWeights: readonly number[]
    /** Efficient playhead store for word highlighting (only notifies on active word change) */
    playheadStore: PlayheadStore
    /** Whether the current spoken word is visible in the viewport */
    isActiveWordInView: boolean
    /** When off-screen, true if the active word is above the viewport band */
    isActiveWordAboveViewport: boolean
    scrollToActiveWord: () => void
    /** Custom narration cursor (replaces system pointer over the article). */
    magicCursorEnabled: boolean
    toggleMagicCursor: () => void
    /** Seek to `time` (seconds) and start playback. */
    playFromTime: (time: number) => void
    checkpointsEnabled: boolean
    toggleCheckpoints: () => void
    /** Set when paused at a checkpoint; play resumes after `resumeTime`. */
    pausedCheckpoint: CheckpointStop | null
    toggle: () => void
    seek: (time: number) => void
    seekRatio: (ratio: number) => void
    seekScrollRatio: (ratio: number) => void
    /** Pitch-preserved speed (`HTMLMediaElement.playbackRate` + `preservesPitch`). */
    playbackRate: NarrationPlaybackRate
    increasePlaybackRate: () => void
    decreasePlaybackRate: () => void
}

const NarrationContext = createContext<NarrationContextValue | null>(null)

export function useNarration(): NarrationContextValue {
    const ctx = useContext(NarrationContext)
    if (!ctx) {
        throw new Error('useNarration must be used within NarrationProvider')
    }
    return ctx
}

export function useNarrationOptional(): NarrationContextValue | null {
    return useContext(NarrationContext)
}

/**
 * Efficiently subscribe to playhead changes for a specific segment.
 * Only re-renders when the active word within this segment changes.
 */
export function useSegmentPlayhead(segmentId: string): {
    activeIndex: number
    currentTime: number
} {
    const { playheadStore } = useNarration()

    const snapshot = useSyncExternalStore(
        playheadStore.subscribe,
        playheadStore.getSnapshot,
        playheadStore.getSnapshot,
    )

    const activeIndex =
        snapshot.activeSegment === segmentId ? snapshot.activeWordIndex : -1

    return { activeIndex, currentTime: snapshot.time }
}

type NarrationProviderProps = {
    transcript: NarrationTranscript
    /**
     * Drive playback from transcript timestamps (no audio required).
     * Falls back to demo automatically if the audio file fails to load.
     */
    demoMode?: boolean
    /**
     * Segment ids after which playback pauses when Checkpoints mode is on
     * (defaults to `transcript.checkpointAfterSegmentIds`).
     */
    checkpointAfterSegmentIds?: readonly string[]
    /** Fallback scroll target when no Chapter components are registered */
    scrollTargetRef?: RefObject<HTMLElement | null>
    /** Total progress track slots (content units) */
    trackSlots?: number
    children: ReactNode
}

function measureRegistryHeights(
    registry: readonly RegisteredChapter[],
): Record<string, number> {
    const heights: Record<string, number> = {}
    for (const { id, ref } of registry) {
        const h = ref.current?.offsetHeight ?? 0
        if (h > 0) heights[id] = h
    }
    return heights
}

function buildWeightedSections(
    registry: readonly RegisteredChapter[],
    heights: Record<string, number>,
): WeightedScrollSection[] {
    const sorted = [...registry].sort((a, b) => a.order - b.order)
    const sections: WeightedScrollSection[] = []

    for (const { id, ref } of sorted) {
        const el = ref.current
        if (!el) continue
        sections.push({
            element: el,
            weight: Math.max(1, heights[id] ?? el.offsetHeight ?? 1),
        })
    }

    return sections
}

export function NarrationProvider({
    transcript,
    demoMode: demoModeProp = false,
    checkpointAfterSegmentIds: checkpointAfterSegmentIdsProp,
    scrollTargetRef,
    trackSlots = 48,
    children,
}: NarrationProviderProps) {
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(
        null,
    )
    const prevAudioSrcRef = useRef(transcript.audioSrc)
    const playheadRef = useRef(0)
    const orderCounterRef = useRef(0)
    const [registry, setRegistry] = useState<RegisteredChapter[]>([])
    const [chapterHeights, setChapterHeights] = useState<Record<string, number>>(
        {},
    )
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [isReady, setIsReady] = useState(false)
    const [audioFailed, setAudioFailed] = useState(false)
    const [scrollProgress, setScrollProgress] = useState(0)
    const [isActiveWordInView, setIsActiveWordInView] = useState(true)
    const [isActiveWordAboveViewport, setIsActiveWordAboveViewport] =
        useState(false)
    const [magicCursorEnabled, setMagicCursorEnabled] = useState(false)
    const [checkpointsEnabled, setCheckpointsEnabled] = useState(false)
    const [pausedCheckpoint, setPausedCheckpoint] =
        useState<CheckpointStop | null>(null)
    /** Tracks the time where playback was last paused. */
    const lastPausedTimeRef = useRef<number | null>(null)
    const [playbackRate, setPlaybackRate] = useState<NarrationPlaybackRate>(
        readStoredPlaybackRate,
    )
    const playbackRateRef = useRef(playbackRate)
    playbackRateRef.current = playbackRate
    const passedCheckpointsRef = useRef<Set<number>>(new Set())
    const prevPlayheadRef = useRef(0)

    const checkpointAfterSegmentIds =
        checkpointAfterSegmentIdsProp ??
        transcript.checkpointAfterSegmentIds ??
        []

    const checkpointStops = useMemo(
        () => getCheckpointStops(transcript, checkpointAfterSegmentIds),
        [transcript, checkpointAfterSegmentIds],
    )

    const playheadStore = useMemo(
        () => createPlayheadStore(transcript),
        [transcript],
    )

    const scrollToActiveWord = useCallback(() => {
        const { activeSegment, activeWordIndex } = playheadStore.getSnapshot()
        const el = getActiveWordElement(activeSegment, activeWordIndex)
        if (el) {
            el.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest',
            })
            return
        }

        scrollToNarrationTime(transcript, playheadRef.current)
    }, [playheadStore, transcript])

    useEffect(() => {
        if (!isPlaying) {
            setIsActiveWordInView(true)
            setIsActiveWordAboveViewport(false)
            return
        }

        const measure = () => {
            const { activeSegment, activeWordIndex } =
                playheadStore.getSnapshot()
            const el = getActiveWordElement(activeSegment, activeWordIndex)
            // Between words/segments the playhead has no active span; keep the
            // last in-view state so the go-to-text control does not flicker.
            if (!el) return

            const { inView, aboveViewport } = measureActiveWordViewport(el)
            setIsActiveWordInView(inView)
            setIsActiveWordAboveViewport(aboveViewport)
        }

        measure()
        const unsubscribe = playheadStore.subscribe(measure)
        window.addEventListener('scroll', measure, { passive: true })
        window.addEventListener('resize', measure)

        return () => {
            unsubscribe()
            window.removeEventListener('scroll', measure)
            window.removeEventListener('resize', measure)
        }
    }, [isPlaying, playheadStore])

    const registerChapter = useCallback(
        (id: string, ref: RefObject<HTMLElement | null>) => {
            setRegistry((prev) => {
                const existing = prev.find((c) => c.id === id)
                if (existing) {
                    return prev.map((c) =>
                        c.id === id ? { ...c, ref } : c,
                    )
                }
                return [
                    ...prev,
                    { id, ref, order: orderCounterRef.current++ },
                ]
            })
        },
        [],
    )

    const unregisterChapter = useCallback((id: string) => {
        setRegistry((prev) => prev.filter((c) => c.id !== id))
        setChapterHeights((prev) => {
            const next = { ...prev }
            delete next[id]
            return next
        })
    }, [])

    const registryContext = useMemo<ChapterRegistryContextValue>(
        () => ({ registerChapter, unregisterChapter }),
        [registerChapter, unregisterChapter],
    )

    const sortedRegistry = useMemo(
        () => [...registry].sort((a, b) => a.order - b.order),
        [registry],
    )

    const chapterIds = useMemo(
        () => sortedRegistry.map((c) => c.id),
        [sortedRegistry],
    )

    const chapterWeights = useMemo(
        () =>
            sortedRegistry.map((c) =>
                Math.max(1, chapterHeights[c.id] ?? 1),
            ),
        [sortedRegistry, chapterHeights],
    )

    const mockDuration = useMemo(
        () => getTranscriptDuration(transcript),
        [transcript],
    )

    const trackLayout = useMemo(() => {
        if (chapterWeights.length > 0) {
            return buildChapterTrack(chapterWeights, trackSlots)
        }
        return Array.from({ length: trackSlots }, (_, i) => ({
            type: 'content' as const,
            chapterIndex: 0,
            unitInChapter: i,
        }))
    }, [chapterWeights, trackSlots])

    const useChapterScroll = sortedRegistry.length > 0

    const isDemo =
        demoModeProp || audioFailed || !transcript.audioSrc

    const lastStateUpdateRef = useRef(0)
    const STATE_UPDATE_INTERVAL = 100

    const syncPlayhead = useCallback(
        (time: number, forceStateUpdate = false) => {
            const max = isDemo ? mockDuration : duration
            const clamped =
                max > 0 ? Math.max(0, Math.min(time, max)) : Math.max(0, time)
            playheadRef.current = clamped

            playheadStore.time = clamped

            const now = performance.now()
            if (
                forceStateUpdate ||
                now - lastStateUpdateRef.current > STATE_UPDATE_INTERVAL
            ) {
                lastStateUpdateRef.current = now
                setCurrentTime(clamped)
            }

            return clamped
        },
        [duration, isDemo, mockDuration, playheadStore],
    )

    const clearPassedCheckpointsAfter = useCallback((time: number) => {
        const next = new Set<number>()
        for (const cp of passedCheckpointsRef.current) {
            if (cp <= time) next.add(cp)
        }
        passedCheckpointsRef.current = next
    }, [])

    const seek = useCallback(
        (time: number) => {
            const max = isDemo ? mockDuration : duration
            if (max <= 0 && !isDemo) {
                logNarration('seek ignored: audio duration unavailable', {
                    requestedTime: time,
                    duration,
                    mockDuration,
                    isDemo,
                })
                return
            }

            const clamped = syncPlayhead(time, true)
            logNarration('seek', {
                requestedTime: time,
                clamped,
                max,
                isDemo,
                audioCurrentTime: audioElement?.currentTime,
            })
            clearPassedCheckpointsAfter(clamped)
            prevPlayheadRef.current = clamped
            // Clear saved pause state since user explicitly seeked
            lastPausedTimeRef.current = null

            if (
                pausedCheckpoint &&
                Math.abs(clamped - pausedCheckpoint.pauseTime) > 0.05
            ) {
                setPausedCheckpoint(null)
            }

            if (!isDemo) {
                const audio = audioRef.current ?? audioElement
                if (audio) audio.currentTime = clamped
            }
        },
        [
            audioElement,
            clearPassedCheckpointsAfter,
            duration,
            isDemo,
            mockDuration,
            pausedCheckpoint,
            syncPlayhead,
        ],
    )

    const seekRatio = useCallback(
        (ratio: number) => {
            const r = Math.max(0, Math.min(1, ratio))
            const max = isDemo ? mockDuration : duration
            seek(r * max)
        },
        [duration, isDemo, mockDuration, seek],
    )

    const seekScrollRatio = useCallback(
        (ratio: number) => {
            scrollToNarrationProgress(transcript, ratio, (r) => {
                if (useChapterScroll) {
                    const sections = buildWeightedSections(
                        sortedRegistry,
                        chapterHeights,
                    )
                    if (sections.length === sortedRegistry.length) {
                        scrollToWeightedChapterProgress(sections, r)
                    }
                    return
                }

                const el = scrollTargetRef?.current
                if (el) scrollArticleToProgress(el, r)
            })
        },
        [
            transcript,
            useChapterScroll,
            sortedRegistry,
            chapterHeights,
            scrollTargetRef,
        ],
    )

    useEffect(() => {
        if (!useChapterScroll) return

        const measureHeights = () => {
            setChapterHeights(measureRegistryHeights(registry))
        }

        const rafId = requestAnimationFrame(measureHeights)

        const observer = new ResizeObserver(measureHeights)
        for (const { ref } of registry) {
            const el = ref.current
            if (el) observer.observe(el)
        }

        return () => {
            cancelAnimationFrame(rafId)
            observer.disconnect()
        }
    }, [registry, useChapterScroll])

    const measureScrollProgressFallback = useCallback(() => {
        if (useChapterScroll) {
            const sections = buildWeightedSections(
                sortedRegistry,
                chapterHeights,
            )
            if (sections.length === sortedRegistry.length) {
                return measureWeightedChapterScrollProgress(sections)
            }
            return scrollProgress
        }

        const el = scrollTargetRef?.current
        if (el) return measureArticleScrollProgress(el)
        return scrollProgress
    }, [
        useChapterScroll,
        sortedRegistry,
        chapterHeights,
        scrollTargetRef,
        scrollProgress,
    ])

    useEffect(() => {
        const update = () => {
            setScrollProgress(measureScrollProgressFallback())
        }

        update()
        const rafId = requestAnimationFrame(update)

        window.addEventListener('scroll', update, { passive: true })
        window.addEventListener('resize', update)

        let observer: ResizeObserver | undefined
        const observeTarget = () => {
            observer?.disconnect()
            const elements: HTMLElement[] = []

            if (useChapterScroll) {
                for (const { ref } of sortedRegistry) {
                    const el = ref.current
                    if (el) elements.push(el)
                }
            } else {
                const el = scrollTargetRef?.current
                if (el) elements.push(el)
            }

            if (elements.length === 0) return

            observer = new ResizeObserver(update)
            for (const el of elements) observer.observe(el)
            update()
        }

        observeTarget()
        const observeRaf = requestAnimationFrame(observeTarget)

        return () => {
            cancelAnimationFrame(rafId)
            cancelAnimationFrame(observeRaf)
            window.removeEventListener('scroll', update)
            window.removeEventListener('resize', update)
            observer?.disconnect()
        }
    }, [measureScrollProgressFallback])

    const measureScrollProgress = measureScrollProgressFallback

    /** Map viewport-center word to time when resuming; pin to start/end at scroll extremes */
    const getTimeFromScrollPosition = useCallback(() => {
        const max = isDemo ? mockDuration : duration
        if (max <= 0) {
            logNarration('scroll start time: max unavailable', {
                duration,
                mockDuration,
                isDemo,
            })
            return 0
        }

        const scrollRatio = measureScrollProgressFallback()
        if (scrollRatio <= 0.01) {
            logNarration('scroll start time: top of article', {
                scrollRatio,
                max,
            })
            return 0
        }
        if (scrollRatio >= 0.99) {
            logNarration('scroll start time: end of article', {
                scrollRatio,
                max,
            })
            return max
        }

        const centerTime = getTimeAtViewportCenter(transcript)
        if (centerTime != null) {
            logNarration('scroll start time: viewport center word', {
                scrollRatio,
                centerTime,
                max,
            })
            return centerTime
        }

        logNarration('scroll start time: ratio fallback', {
            scrollRatio,
            fallbackTime: scrollRatio * max,
            max,
        })
        return scrollRatio * max
    }, [
        duration,
        isDemo,
        mockDuration,
        measureScrollProgressFallback,
        transcript,
    ])

    const toggleMagicCursor = useCallback(() => {
        setMagicCursorEnabled((on) => {
            logNarration('magic cursor toggle', { nextEnabled: !on })
            return !on
        })
    }, [])

    const toggleCheckpoints = useCallback(() => {
        setCheckpointsEnabled((on) => !on)
    }, [])

    const increasePlaybackRate = useCallback(() => {
        setPlaybackRate((current) => {
            const next = stepPlaybackRate(current, 'up')
            if (next !== current) storePlaybackRate(next)
            return next
        })
    }, [])

    const decreasePlaybackRate = useCallback(() => {
        setPlaybackRate((current) => {
            const next = stepPlaybackRate(current, 'down')
            if (next !== current) storePlaybackRate(next)
            return next
        })
    }, [])

    useEffect(() => {
        if (isDemo || !audioElement) return
        applyAudioPlaybackRate(audioElement, playbackRate)
    }, [audioElement, isDemo, playbackRate])

    const maybePauseAtCheckpoint = useCallback(
        (time: number, previousTime: number): boolean => {
            if (!checkpointsEnabled || checkpointStops.length === 0) {
                return false
            }

            let hit: CheckpointStop | null = null
            for (const stop of checkpointStops) {
                if (passedCheckpointsRef.current.has(stop.pauseTime)) continue
                if (
                    previousTime < stop.pauseTime - 0.01 &&
                    time >= stop.pauseTime - 0.02
                ) {
                    if (!hit || stop.pauseTime > hit.pauseTime) {
                        hit = stop
                    }
                }
            }

            if (!hit) return false

            passedCheckpointsRef.current.add(hit.pauseTime)
            syncPlayhead(hit.pauseTime, true)
            prevPlayheadRef.current = hit.pauseTime
            // Don't set lastPausedTimeRef - checkpoint uses its own resumeTime
            setPausedCheckpoint(hit)
            setIsPlaying(false)

            if (!isDemo) {
                const audio = audioRef.current ?? audioElement
                audio?.pause()
            }
            return true
        },
        [
            audioElement,
            checkpointStops,
            checkpointsEnabled,
            isDemo,
            syncPlayhead,
        ],
    )

    const getPlaybackStartTime = useCallback(() => {
        // Checkpoint resume takes priority
        if (pausedCheckpoint) {
            logNarration('playback start time: checkpoint resume', {
                pauseTime: pausedCheckpoint.pauseTime,
                resumeTime: pausedCheckpoint.resumeTime,
            })
            return pausedCheckpoint.resumeTime
        }
        
        // Get the time based on current scroll/viewport position
        const scrollTime = getTimeFromScrollPosition()
        
        // If we have a saved pause position, compare it to scroll-based time
        if (lastPausedTimeRef.current != null && lastPausedTimeRef.current > 0.1) {
            const pauseTime = lastPausedTimeRef.current
            const max = duration > 0 ? duration : mockDuration
            // If scroll-based time differs significantly from pause time (>3% of duration),
            // use scroll time (user scrolled to different section)
            const timeDiff = Math.abs(scrollTime - pauseTime)
            const threshold = max * 0.03 // 3% of total duration
            if (timeDiff <= threshold) {
                logNarration('playback start time: saved pause', {
                    pauseTime,
                    scrollTime,
                    timeDiff,
                    threshold,
                })
                return pauseTime
            }
            logNarration('playback start time: scroll differs from pause', {
                pauseTime,
                scrollTime,
                timeDiff,
                threshold,
            })
        }
        
        // Fresh start or scroll position differs: use scroll-based time
        logNarration('playback start time: scroll-based', { scrollTime })
        return scrollTime
    }, [pausedCheckpoint, getTimeFromScrollPosition, duration, mockDuration])

    const playFromTime = useCallback(
        (time: number) => {
            const max = isDemo ? mockDuration : duration
            if (max <= 0 && !isDemo) {
                logNarration('playFromTime ignored: audio duration unavailable', {
                    requestedTime: time,
                    duration,
                    mockDuration,
                    isDemo,
                })
                return
            }

            const clamped = syncPlayhead(time, true)
            logNarration('playFromTime', {
                requestedTime: time,
                clamped,
                max,
                isDemo,
                audioCurrentTime: audioElement?.currentTime,
                audioReadyState: audioElement?.readyState,
            })
            clearPassedCheckpointsAfter(clamped)
            prevPlayheadRef.current = clamped
            // Clear saved pause state since we're starting from a specific time
            lastPausedTimeRef.current = null
            setPausedCheckpoint(null)

            if (isDemo) {
                logNarration('playFromTime: demo play', { clamped })
                setIsPlaying(true)
                return
            }

            const audio = audioRef.current ?? audioElement
            if (!audio) {
                logNarration('playFromTime ignored: missing audio element', {
                    clamped,
                })
                return
            }

            if (Math.abs(audio.currentTime - clamped) > 0.02) {
                logNarration('playFromTime: setting audio currentTime', {
                    from: audio.currentTime,
                    to: clamped,
                })
                audio.currentTime = clamped
            }

            void audio.play().then(
                () => {
                    logNarration('playFromTime: audio play resolved', {
                        currentTime: audio.currentTime,
                    })
                    setIsPlaying(true)
                },
                (error) => {
                    logNarration('playFromTime: audio play rejected', {
                        error: String(error),
                    })
                    setAudioFailed(true)
                    setIsPlaying(false)
                },
            )
        },
        [
            audioElement,
            clearPassedCheckpointsAfter,
            duration,
            isDemo,
            mockDuration,
            syncPlayhead,
        ],
    )

    const toggle = useCallback(() => {
        logNarration('toggle requested', {
            isDemo,
            isPlaying,
            playhead: playheadRef.current,
            lastPausedTime: lastPausedTimeRef.current,
            duration,
            mockDuration,
            audioCurrentTime: audioElement?.currentTime,
            audioPaused: audioElement?.paused,
            audioReadyState: audioElement?.readyState,
        })
        if (isDemo) {
            setIsPlaying((playing) => {
                if (playing) {
                    // Save the current time for reliable resume
                    lastPausedTimeRef.current = playheadRef.current
                    logNarration('toggle: demo pause', {
                        savedPauseTime: lastPausedTimeRef.current,
                    })
                    setPausedCheckpoint(null)
                    return false
                }
                const startAt = getPlaybackStartTime()
                logNarration('toggle: demo play', { startAt })
                syncPlayhead(startAt, true)
                prevPlayheadRef.current = startAt
                // Clear the saved pause state since we're resuming
                lastPausedTimeRef.current = null
                setPausedCheckpoint(null)
                return true
            })
            return
        }

        const audio = audioRef.current ?? audioElement
        if (!audio) {
            logNarration('toggle ignored: missing audio element')
            return
        }

        if (audio.paused) {
            const startAt = getPlaybackStartTime()
            logNarration('toggle: audio play', {
                startAt,
                audioCurrentTime: audio.currentTime,
                readyState: audio.readyState,
            })
            syncPlayhead(startAt, true)
            prevPlayheadRef.current = startAt
            // Clear the saved pause state since we're resuming
            lastPausedTimeRef.current = null
            setPausedCheckpoint(null)
            if (Math.abs(audio.currentTime - startAt) > 0.02) {
                logNarration('toggle: setting audio currentTime', {
                    from: audio.currentTime,
                    to: startAt,
                })
                audio.currentTime = startAt
            }
            void audio.play().then(
                () => {
                    logNarration('toggle: audio play resolved', {
                        currentTime: audio.currentTime,
                    })
                    setIsPlaying(true)
                },
                (error) => {
                    logNarration('toggle: audio play rejected', {
                        error: String(error),
                    })
                    setAudioFailed(true)
                    setIsPlaying(false)
                },
            )
        } else {
            // Save the current time for reliable resume
            lastPausedTimeRef.current = audio.currentTime
            logNarration('toggle: audio pause', {
                savedPauseTime: lastPausedTimeRef.current,
            })
            syncPlayhead(audio.currentTime, true)
            setPausedCheckpoint(null)
            audio.pause()
        }
    }, [audioElement, getPlaybackStartTime, isDemo, syncPlayhead])

    useEffect(() => {
        if (!isDemo) return

        setDuration(mockDuration)
        setIsReady(mockDuration > 0)
        if (!isPlaying) return

        let rafId = 0
        const startedAt = performance.now()
        const offset = playheadRef.current

        const tick = (now: number) => {
            const elapsed =
                ((now - startedAt) / 1000) * playbackRateRef.current
            const next = offset + elapsed

            if (next >= mockDuration) {
                setIsPlaying(false)
                syncPlayhead(0)
                prevPlayheadRef.current = 0
                return
            }

            const prev = prevPlayheadRef.current
            syncPlayhead(next)
            prevPlayheadRef.current = next
            if (maybePauseAtCheckpoint(next, prev)) return
            rafId = requestAnimationFrame(tick)
        }

        rafId = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(rafId)
    }, [
        isDemo,
        isPlaying,
        mockDuration,
        maybePauseAtCheckpoint,
        syncPlayhead,
        playbackRate,
    ])

    // Poll audio.currentTime at 60fps for smooth word highlighting
    useEffect(() => {
        if (isDemo || !isPlaying || !audioElement) return

        let rafId = 0

        const tick = () => {
            if (audioElement && !audioElement.paused) {
                const t = audioElement.currentTime
                const prev = prevPlayheadRef.current
                syncPlayhead(t)
                prevPlayheadRef.current = t
                maybePauseAtCheckpoint(t, prev)
            }
            rafId = requestAnimationFrame(tick)
        }

        rafId = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(rafId)
    }, [audioElement, isDemo, isPlaying, maybePauseAtCheckpoint, syncPlayhead])

    useEffect(() => {
        if (prevAudioSrcRef.current === transcript.audioSrc) return
        prevAudioSrcRef.current = transcript.audioSrc
        setAudioFailed(false)
        setIsReady(false)
        setDuration(0)
        setIsPlaying(false)
        playheadRef.current = 0
        lastPausedTimeRef.current = null
        setCurrentTime(0)
    }, [transcript.audioSrc])

    useEffect(() => {
        if (isDemo || !audioElement) return

        const audio = audioElement

        const onLoadedMetadata = () => {
            const d = Number.isFinite(audio.duration) ? audio.duration : 0
            logNarration('audio loaded metadata', {
                duration: d,
                readyState: audio.readyState,
                src: audio.currentSrc || audio.src,
            })
            setDuration(d)
            setIsReady(d > 0 || mockDuration > 0)
            setAudioFailed(false)
        }

        const onTimeUpdate = () => {
            syncPlayhead(audio.currentTime)
        }

        const onPlay = () => {
            logNarration('audio event: play', {
                currentTime: audio.currentTime,
            })
            setIsPlaying(true)
        }
        const onPause = () => {
            logNarration('audio event: pause', {
                currentTime: audio.currentTime,
            })
            setIsPlaying(false)
            syncPlayhead(audio.currentTime, true)
        }
        const onEnded = () => {
            logNarration('audio event: ended', {
                currentTime: audio.currentTime,
            })
            setIsPlaying(false)
            syncPlayhead(0, true)
        }

        const onError = () => {
            logNarration('audio event: error', {
                error: audio.error?.message,
                code: audio.error?.code,
                src: audio.currentSrc || audio.src,
            })
            setAudioFailed(true)
            setIsPlaying(false)
            setIsReady(mockDuration > 0)
        }

        audio.addEventListener('loadedmetadata', onLoadedMetadata)
        audio.addEventListener('durationchange', onLoadedMetadata)
        audio.addEventListener('timeupdate', onTimeUpdate)
        audio.addEventListener('play', onPlay)
        audio.addEventListener('pause', onPause)
        audio.addEventListener('ended', onEnded)
        audio.addEventListener('error', onError)

        if (audio.readyState >= 1) {
            onLoadedMetadata()
        }

        return () => {
            audio.removeEventListener('loadedmetadata', onLoadedMetadata)
            audio.removeEventListener('durationchange', onLoadedMetadata)
            audio.removeEventListener('timeupdate', onTimeUpdate)
            audio.removeEventListener('play', onPlay)
            audio.removeEventListener('pause', onPause)
            audio.removeEventListener('ended', onEnded)
            audio.removeEventListener('error', onError)
        }
    }, [audioElement, isDemo, mockDuration, syncPlayhead])

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
            ) {
                return
            }

            if (e.code === 'Space') {
                e.preventDefault()
                toggle()
            } else if (e.code === 'ArrowLeft') {
                e.preventDefault()
                seek(currentTime - 5)
            } else if (e.code === 'ArrowRight') {
                e.preventDefault()
                seek(currentTime + 5)
            }
        }

        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [toggle, seek, currentTime])

    const value = useMemo<NarrationContextValue>(
        () => ({
            transcript,
            audioRef,
            currentTime,
            duration: isDemo ? mockDuration : duration,
            isPlaying,
            isReady: isDemo ? mockDuration > 0 : isReady,
            isDemo,
            scrollProgress,
            toggle,
            seek,
            seekRatio,
            seekScrollRatio,
            trackLayout,
            chapterIds,
            chapterWeights,
            playheadStore,
            isActiveWordInView,
            isActiveWordAboveViewport,
            scrollToActiveWord,
            magicCursorEnabled,
            toggleMagicCursor,
            playFromTime,
            checkpointsEnabled,
            toggleCheckpoints,
            pausedCheckpoint,
            playbackRate,
            increasePlaybackRate,
            decreasePlaybackRate,
        }),
        [
            transcript,
            currentTime,
            duration,
            mockDuration,
            isPlaying,
            isReady,
            isDemo,
            scrollProgress,
            toggle,
            seek,
            seekRatio,
            seekScrollRatio,
            playheadStore,
            trackLayout,
            chapterIds,
            chapterWeights,
            isActiveWordInView,
            isActiveWordAboveViewport,
            scrollToActiveWord,
            magicCursorEnabled,
            toggleMagicCursor,
            playFromTime,
            checkpointsEnabled,
            toggleCheckpoints,
            pausedCheckpoint,
            playbackRate,
            increasePlaybackRate,
            decreasePlaybackRate,
        ],
    )

    return (
        <ChapterRegistryContext.Provider value={registryContext}>
            <NarrationContext.Provider value={value}>
                {!demoModeProp && transcript.audioSrc ? (
                    <audio
                        ref={(node) => {
                            audioRef.current = node
                            setAudioElement(node)
                        }}
                        src={transcript.audioSrc}
                        preload="metadata"
                        className="sr-only"
                    />
                ) : null}
                {children}
            </NarrationContext.Provider>
        </ChapterRegistryContext.Provider>
    )
}
