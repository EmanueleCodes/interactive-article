import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { getChapterIdleBorderRadius, type TrackUnit } from './chapterTrackLayout'
import { useNarration } from './NarrationContext'

type WaveformVisualizationProps = {
    className?: string
}

/** Default slot count when no chapter layout is configured */
export const DEFAULT_TRACK_SLOTS = 48

const IDLE_BAR_WIDTH = 6
/** Figma 1610:3467 — playback bar width + gap */
const PLAYING_BAR_WIDTH = 4
const PLAYING_BAR_GAP = 2

/** Figma 1610:3467 — Dots Container level bar heights (px) */
const FIGMA_LEVEL_BAR_HEIGHTS = [
    12, 12, 18, 16, 8, 8, 20, 12, 8, 12, 8, 16, 8, 12, 4, 6, 10, 14, 18, 14, 8,
    14, 16, 20, 20, 14, 8, 12, 18, 18, 18, 10, 12, 6, 16, 4,
] as const

const PLAYING_BAR_RADIUS = 20

/** Packed track width — same in idle and playing (last slot has no trailing gap). */
export function getWaveformTrackWidth(unitCount: number): number {
    if (unitCount <= 0) return 0
    return (
        unitCount * PLAYING_BAR_WIDTH +
        (unitCount - 1) * PLAYING_BAR_GAP
    )
}

/** Figma 1610:3467 — waveform row height */
const TRACK_HEIGHT = 20

const IDLE_BAR_HEIGHT = 4

function playingBarHeight(index: number): number {
    return FIGMA_LEVEL_BAR_HEIGHTS[index % FIGMA_LEVEL_BAR_HEIGHTS.length]
}

/** Map transcript peaks (0–1) to Figma bar height range when data is present. */
function heightFromWaveformPeak(peak: number): number {
    const min = Math.min(...FIGMA_LEVEL_BAR_HEIGHTS)
    const max = Math.max(...FIGMA_LEVEL_BAR_HEIGHTS)
    const clamped = Math.min(1, Math.max(0, peak))
    return Math.round(min + clamped * (max - min))
}

const MORPH_DURATION = 0.24
const HEIGHT_STAGGER_DELAY = 0.005
const morphEase = [0.16, 1, 0.3, 1] as const

const PROGRESS_BRIGHT = 'rgb(255 255 255)'
const PROGRESS_DIM_IDLE = 'rgb(255 255 255 / 0.2)'
/** Figma 1610:3467 — unplayed level bars */
const PROGRESS_DIM_PLAYING = '#4e4c4c'

const FILL_TRANSITION = { duration: 0.1, ease: 'linear' as const }

function isUnitPastProgress(
    unitIndex: number,
    unitCount: number,
    progress: number,
): boolean {
    const unitCenter = (unitIndex + 0.5) / unitCount
    return unitCenter <= progress
}

function getMorphTransition(staggerIndex?: number) {
    return {
        duration: MORPH_DURATION,
        ease: morphEase,
        ...(staggerIndex !== undefined
            ? { delay: staggerIndex * HEIGHT_STAGGER_DELAY }
            : {}),
    }
}

function getPlayingBarHeight(
    index: number,
    resampledPeaks: readonly number[] | null,
): number {
    const peak = resampledPeaks?.[index]
    if (peak !== undefined) return heightFromWaveformPeak(peak)
    return playingBarHeight(index)
}

function getContentUnitLayout(
    isPlaying: boolean,
    layoutIndex: number,
    contentIndex: number,
    contentUnitCount: number,
    resampledPeaks: readonly number[] | null,
    track: readonly TrackUnit[],
) {
    const unit = track[layoutIndex]
    if (!unit || unit.type === 'gap') return null

    if (isPlaying) {
        return {
            width: PLAYING_BAR_WIDTH,
            height: getPlayingBarHeight(contentIndex, resampledPeaks),
            borderRadius: `${PLAYING_BAR_RADIUS}px`,
        }
    }

    const isLastBar = contentIndex === contentUnitCount - 1

    return {
        width: isLastBar
            ? IDLE_BAR_WIDTH - PLAYING_BAR_GAP
            : IDLE_BAR_WIDTH,
        height: IDLE_BAR_HEIGHT,
        borderRadius: getChapterIdleBorderRadius(
            contentIndex,
            contentUnitCount,
            IDLE_BAR_HEIGHT,
        ),
    }
}

export function WaveformVisualization({
    className = '',
}: WaveformVisualizationProps) {
    const {
        currentTime,
        duration,
        isPlaying,
        scrollProgress,
        seekRatio,
        seekScrollRatio,
        trackLayout,
        transcript,
    } = useNarration()
    const containerRef = useRef<HTMLDivElement>(null)
    const shellRef = useRef<HTMLDivElement>(null)
    const [availableWidth, setAvailableWidth] = useState<number | null>(null)
    const prefersReducedMotion = useReducedMotion()

    useEffect(() => {
        const el = shellRef.current
        if (!el) return

        const measure = () => {
            setAvailableWidth(el.clientWidth > 0 ? el.clientWidth : null)
        }

        measure()
        const observer = new ResizeObserver(measure)
        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    const playbackProgress =
        duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0

    const progress = isPlaying ? playbackProgress : scrollProgress

    const layoutTransition = prefersReducedMotion
        ? { duration: 0 }
        : getMorphTransition()

    const contentUnitCount = trackLayout.filter((u) => u.type !== 'gap').length
    const trackWidth = getWaveformTrackWidth(contentUnitCount)
    const displayWidth =
        availableWidth != null
            ? Math.min(trackWidth, availableWidth)
            : trackWidth
    const progressDim = isPlaying ? PROGRESS_DIM_PLAYING : PROGRESS_DIM_IDLE

    const resampledPeaks = useMemo(() => {
        const peaks = transcript.waveformData
        if (!peaks.length || contentUnitCount <= 0) return null
        return Array.from({ length: contentUnitCount }, (_, i) => {
            const srcIndex = Math.floor((i / contentUnitCount) * peaks.length)
            return peaks[srcIndex] ?? 0
        })
    }, [transcript.waveformData, contentUnitCount])

    const trackBars = useMemo(() => {
        const bars: {
            unit: Extract<TrackUnit, { type: 'content' }>
            layoutIndex: number
            barIndex: number
        }[] = []
        let barIndex = 0
        trackLayout.forEach((unit, layoutIndex) => {
            if (unit.type === 'gap') return
            bars.push({ unit, layoutIndex, barIndex: barIndex++ })
        })
        return bars
    }, [trackLayout])
    const fillTransition = prefersReducedMotion
        ? { duration: 0 }
        : FILL_TRANSITION

    const handlePointer = useCallback(
        (clientX: number) => {
            const el = containerRef.current
            if (!el) return
            const rect = el.getBoundingClientRect()
            const trackRatio = (clientX - rect.left) / rect.width

            if (isPlaying) {
                if (duration <= 0) return
                seekRatio(trackRatio)
            } else {
                seekScrollRatio(trackRatio)
            }
        },
        [duration, isPlaying, seekRatio, seekScrollRatio],
    )

    const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        handlePointer(e.clientX)
    }

    const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.buttons !== 1) return
        handlePointer(e.clientX)
    }

    return (
        <div
            ref={shellRef}
            className={`min-w-0 ${className}`.trim()}
        >
            <motion.div
                ref={containerRef}
                role="slider"
                aria-label={isPlaying ? 'Narration waveform' : 'Reading progress'}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress * 100)}
                tabIndex={-1}
                className="flex max-w-full cursor-pointer items-center overflow-hidden outline-none"
                animate={{ width: displayWidth }}
                transition={{ width: layoutTransition }}
                style={{
                    height: TRACK_HEIGHT,
                }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onKeyDown={(e) => {
                    if (e.key === 'ArrowLeft') {
                        e.preventDefault()
                        if (isPlaying) seekRatio(progress - 0.02)
                        else seekScrollRatio(progress - 0.02)
                    } else if (e.key === 'ArrowRight') {
                        e.preventDefault()
                        if (isPlaying) seekRatio(progress + 0.02)
                        else seekScrollRatio(progress + 0.02)
                    }
                }}
            >
            {trackBars.map(({ unit, layoutIndex, barIndex }) => {
                const layout = getContentUnitLayout(
                    isPlaying,
                    layoutIndex,
                    barIndex,
                    contentUnitCount,
                    resampledPeaks,
                    trackLayout,
                )
                if (!layout) return null

                const heightTransition = prefersReducedMotion
                    ? { duration: 0 }
                    : getMorphTransition(
                          isPlaying ? unit.unitInChapter : undefined,
                      )
                const isPast = isUnitPastProgress(
                    barIndex,
                    contentUnitCount,
                    progress,
                )
                const isLastBar = barIndex === contentUnitCount - 1
                const barGap =
                    isPlaying && !isLastBar ? PLAYING_BAR_GAP : 0

                return (
                    <motion.span
                        key={`c${unit.chapterIndex}-u${unit.unitInChapter}-${layoutIndex}`}
                        className="block shrink-0"
                        initial={false}
                        animate={{
                            ...layout,
                            marginRight: barGap,
                            backgroundColor: isPast
                                ? PROGRESS_BRIGHT
                                : progressDim,
                        }}
                        transition={{
                            width: layoutTransition,
                            marginRight: layoutTransition,
                            borderRadius: layoutTransition,
                            backgroundColor: fillTransition,
                            height: heightTransition,
                        }}
                    />
                )
            })}
            </motion.div>
        </div>
    )
}
