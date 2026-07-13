import gsap from 'gsap'
import { AnimatePresence, motion } from 'motion/react'
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type PointerEvent as ReactPointerEvent,
} from 'react'
import {
    BLOG_PHASE_WAVE_COLORS,
    BLOG_PHASE_WAVE_COUNT,
} from '@/components/blog/blogPhaseWavePalette'
import { MAGIC_CURSOR_IGNORE_ATTR } from '@/components/blog/magicCursorTypes'

const TWO_PI = Math.PI * 2
const SLIDER_MIN = 0
const SLIDER_MAX = TWO_PI
const SLIDER_DEFAULT = 0.43
const STAGGER_WAVE_COUNT = BLOG_PHASE_WAVE_COUNT

/** Matches getStaggerPhaseOffset in the cloud-tutorial stagger snippet. */
function getStaggerPhaseOffset(index: number, count: number) {
    return (index / count) * Math.PI * 2
}

/** Slider value where peaks are evenly staggered: (1 / count) × 2π. */
const EQUIDISTANT_PHASE = getStaggerPhaseOffset(1, STAGGER_WAVE_COUNT)

const SLIDER_MARKER_RADIUS_PX = 2

/** Stagger ticks between the ends — (index / count) × 2π for index 1…count−1. */
const STAGGER_MARKER_PHASES = Array.from(
    { length: STAGGER_WAVE_COUNT - 1 },
    (_, index) => getStaggerPhaseOffset(index + 1, STAGGER_WAVE_COUNT),
)

/** Snap on release only when close to a dot (~⅕ of the gap between checkpoints). */
const CHECKPOINT_SNAP_TOLERANCE = TWO_PI / (STAGGER_WAVE_COUNT * 5)
const SNAP_ANIMATION_DURATION_S = 0.32
const SNAP_ANIMATION_EASE = 'power3.out'

/** All multiples: (index / count) × 2π for index 0…count. */
const SLIDER_SNAP_PHASES = Array.from(
    { length: STAGGER_WAVE_COUNT + 1 },
    (_, index) => getStaggerPhaseOffset(index, STAGGER_WAVE_COUNT),
)

const SLIDER_CHECKPOINTS = STAGGER_MARKER_PHASES.map((phase, markerIndex) => ({
    index: markerIndex + 1,
    phase,
}))

function getNearestSnapTarget(phase: number) {
    let nearestPhase = phase
    let nearestDistance = Infinity

    for (const snapPhase of SLIDER_SNAP_PHASES) {
        const distance = Math.abs(phase - snapPhase)
        if (distance < nearestDistance) {
            nearestDistance = distance
            nearestPhase = snapPhase
        }
    }

    if (nearestDistance > CHECKPOINT_SNAP_TOLERANCE) {
        return null
    }

    return nearestPhase
}

function getActiveCheckpointIndex(phase: number) {
    for (const checkpoint of SLIDER_CHECKPOINTS) {
        if (Math.abs(phase - checkpoint.phase) <= CHECKPOINT_SNAP_TOLERANCE) {
            return checkpoint.index
        }
    }
    return null
}

const RIGHT_PHASE_FORMULA = 'Right_Phase = (index / count) * Math.PI * 2'

function getCheckpointLabel(index: number) {
    return `${index}*Right_Phase`
}

function formatPhaseLabel(phase: number) {
    return phase.toFixed(1)
}

const SVG_VIEW_WIDTH = 620
const SVG_HEIGHT = 107
const WAVE_AMPLITUDE = 42
const WAVE_CYCLES = 3
/** Extra length on each side so curves bleed past the viewport instead of cutting flat. */
const WAVE_OVERFLOW_PX = 10

export type WaveRevealConfig = {
    /** Delay after entering view before the first wave starts (seconds). */
    delay?: number
    /** Extra delay per wave index for staggered reveals (seconds). */
    stagger?: number
    /** How long each path takes to draw (seconds). */
    duration?: number
    /** GSAP ease, e.g. `power3.inOut`, `power4.inOut`, `expo.inOut`. */
    ease?: string
}

/** Path reveal defaults — override via `reveal` prop or edit here. */
export const WAVE_REVEAL: Required<WaveRevealConfig> = {
    delay: 0,
    stagger: 0.12,
    duration: 3,
    ease: 'power4.inOut',
}

function resolveWaveReveal(overrides?: WaveRevealConfig): Required<WaveRevealConfig> {
    return { ...WAVE_REVEAL, ...overrides }
}

function buildSinePath(phaseRadians: number): string {
    const midY = SVG_HEIGHT / 2
    const points: string[] = []
    const startX = -WAVE_OVERFLOW_PX
    const endX = SVG_VIEW_WIDTH + WAVE_OVERFLOW_PX

    for (let x = startX; x <= endX; x += 2) {
        const t = (x / SVG_VIEW_WIDTH) * WAVE_CYCLES * TWO_PI + phaseRadians
        const y = midY + Math.sin(t) * WAVE_AMPLITUDE
        points.push(`${x},${y}`)
    }

    return `M ${points.join(' L ')}`
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value))
}

function phaseToRatio(phase: number) {
    return (phase - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)
}

function ratioToPhase(ratio: number) {
    return SLIDER_MIN + ratio * (SLIDER_MAX - SLIDER_MIN)
}

function WavePath({
    d,
    color,
    index,
    isInView,
    reveal,
}: {
    d: string
    color: string
    index: number
    isInView: boolean
    reveal: Required<WaveRevealConfig>
}) {
    const pathRef = useRef<SVGPathElement>(null)
    const [pathLength, setPathLength] = useState(0)
    const [drawComplete, setDrawComplete] = useState(false)
    const hasStartedRef = useRef(false)

    useLayoutEffect(() => {
        const path = pathRef.current
        if (!path) return

        const length = path.getTotalLength()
        setPathLength(length)

        // After reveal starts or finishes, never re-mask — slider updates `d` live.
        if (drawComplete || hasStartedRef.current) {
            gsap.killTweensOf(path)
            gsap.set(path, { clearProps: 'strokeDasharray,strokeDashoffset' })
            return
        }

        gsap.set(path, {
            strokeDasharray: length,
            strokeDashoffset: length,
        })
    }, [d, drawComplete])

    useEffect(() => {
        const path = pathRef.current
        if (!path || pathLength <= 0 || drawComplete || !isInView || hasStartedRef.current) {
            return
        }

        hasStartedRef.current = true

        const tween = gsap.to(path, {
            strokeDashoffset: 0,
            duration: reveal.duration,
            delay: reveal.delay + index * reveal.stagger,
            ease: reveal.ease,
            onComplete: () => {
                gsap.set(path, { clearProps: 'strokeDasharray,strokeDashoffset' })
                setDrawComplete(true)
            },
        })

        return () => {
            tween.kill()
        }
    }, [pathLength, drawComplete, index, isInView, reveal])

    return (
        <path
            ref={pathRef}
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    )
}

function PhaseShiftSlider({
    phase,
    onPhaseChange,
}: {
    phase: number
    onPhaseChange: (phase: number) => void
}) {
    const trackRef = useRef<HTMLDivElement>(null)
    const dragRef = useRef(false)
    const [isDragging, setIsDragging] = useState(false)
    const snapTweenRef = useRef<gsap.core.Tween | null>(null)
    const phaseProxyRef = useRef({ value: phase })
    const ratio = phaseToRatio(phase)
    const thumbPercent = ratio * 100

    useEffect(() => {
        phaseProxyRef.current.value = phase
    }, [phase])

    useEffect(() => {
        return () => {
            snapTweenRef.current?.kill()
        }
    }, [])

    const cancelSnapTween = useCallback(() => {
        snapTweenRef.current?.kill()
        snapTweenRef.current = null
    }, [])

    const animatePhaseTo = useCallback(
        (target: number) => {
            if (Math.abs(target - phaseProxyRef.current.value) < 0.0001) {
                onPhaseChange(target)
                return
            }

            cancelSnapTween()
            snapTweenRef.current = gsap.to(phaseProxyRef.current, {
                value: target,
                duration: SNAP_ANIMATION_DURATION_S,
                ease: SNAP_ANIMATION_EASE,
                onUpdate: () => {
                    onPhaseChange(phaseProxyRef.current.value)
                },
                onComplete: () => {
                    snapTweenRef.current = null
                    onPhaseChange(target)
                },
            })
        },
        [cancelSnapTween, onPhaseChange],
    )

    const phaseFromClientX = useCallback((clientX: number) => {
        const track = trackRef.current
        if (!track) return phaseProxyRef.current.value

        const rect = track.getBoundingClientRect()
        const nextRatio = clamp((clientX - rect.left) / rect.width, 0, 1)
        return ratioToPhase(nextRatio)
    }, [])

    const updateFromClientX = useCallback(
        (clientX: number, { animateSnap }: { animateSnap: boolean }) => {
            const rawPhase = phaseFromClientX(clientX)
            const snapTarget = getNearestSnapTarget(rawPhase)

            if (animateSnap && snapTarget !== null) {
                animatePhaseTo(snapTarget)
                return
            }

            cancelSnapTween()
            phaseProxyRef.current.value = rawPhase
            onPhaseChange(rawPhase)
        },
        [animatePhaseTo, cancelSnapTween, onPhaseChange, phaseFromClientX],
    )

    const onPointerDown = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            event.preventDefault()
            dragRef.current = true
            setIsDragging(true)
            event.currentTarget.setPointerCapture(event.pointerId)
            updateFromClientX(event.clientX, { animateSnap: false })
        },
        [updateFromClientX],
    )

    const onPointerMove = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            if (!dragRef.current) return
            updateFromClientX(event.clientX, { animateSnap: false })
        },
        [updateFromClientX],
    )

    const endDrag = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            if (!dragRef.current) return
            dragRef.current = false
            setIsDragging(false)
            event.currentTarget.releasePointerCapture(event.pointerId)
            updateFromClientX(event.clientX, { animateSnap: true })
        },
        [updateFromClientX],
    )

    return (
        <div
            className={`relative w-full py-2 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        >
            <div
                ref={trackRef}
                role="slider"
                aria-label="Phase shift"
                aria-valuemin={SLIDER_MIN}
                aria-valuemax={SLIDER_MAX}
                aria-valuenow={phase}
                tabIndex={0}
                className="relative h-[6px] w-full touch-none overflow-visible rounded-full bg-[#3b3b3b] outline-none focus:outline-none focus-visible:outline-none"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onKeyDown={(event) => {
                    const currentIndex = SLIDER_SNAP_PHASES.findIndex(
                        (snapPhase) =>
                            Math.abs(phase - snapPhase) <= CHECKPOINT_SNAP_TOLERANCE,
                    )
                    const resolvedIndex =
                        currentIndex === -1
                            ? SLIDER_SNAP_PHASES.reduce(
                                  (best, snapPhase, index) => {
                                      const distance = Math.abs(phase - snapPhase)
                                      return distance < best.distance
                                          ? { index, distance }
                                          : best
                                  },
                                  { index: 0, distance: Infinity },
                              ).index
                            : currentIndex

                    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
                        event.preventDefault()
                        const nextIndex = Math.max(0, resolvedIndex - 1)
                        animatePhaseTo(SLIDER_SNAP_PHASES[nextIndex])
                    }
                    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
                        event.preventDefault()
                        const nextIndex = Math.min(
                            SLIDER_SNAP_PHASES.length - 1,
                            resolvedIndex + 1,
                        )
                        animatePhaseTo(SLIDER_SNAP_PHASES[nextIndex])
                    }
                }}
            >
                
                <div
                    className="absolute left-0 top-0 h-full rounded-full bg-white"
                    style={{ width: `${thumbPercent}%` }}
                />

                {STAGGER_MARKER_PHASES.map((markerPhase, index) => (
                    <div
                        key={index}
                        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/20"
                        style={{
                            left: `${phaseToRatio(markerPhase) * 100}%`,
                            width: SLIDER_MARKER_RADIUS_PX * 2,
                            height: SLIDER_MARKER_RADIUS_PX * 2,
                        }}
                        aria-hidden
                    />
                ))}
                <div
                    className="absolute top-1/2 z-10 size-[10px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_1px_rgba(38,38,38,0.35)]"
                    style={{ left: `${thumbPercent}%` }}
                    aria-hidden
                />
            </div>

            <div
                className="pointer-events-none absolute top-[-34px] -translate-x-1/2 rounded-[6px] bg-[#3b3b3b] px-2 py-0.5"
                style={{ left: `${thumbPercent}%` }}
            >
                <span className="block whitespace-nowrap font-sans text-sm leading-[18px] text-white">
                    {formatPhaseLabel(phase)}
                </span>
            </div>
        </div>
    )
}

/** Interactive sine-wave phase shift demo (Figma 1639:2606). */
export function PhaseShiftVisualizer({
    reveal: revealOverrides,
}: {
    reveal?: WaveRevealConfig
} = {}) {
    const [globalPhase, setGlobalPhase] = useState(SLIDER_DEFAULT)
    const [isInView, setIsInView] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const reveal = useMemo(
        () => resolveWaveReveal(revealOverrides),
        [revealOverrides],
    )

    useEffect(() => {
        const el = containerRef.current
        if (!el) return

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true)
                    observer.disconnect()
                }
            },
            { threshold: 0.2 },
        )

        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    const waves = useMemo(() => {
        const staggerScale =
            EQUIDISTANT_PHASE > 0 ? globalPhase / EQUIDISTANT_PHASE : 0

        return BLOG_PHASE_WAVE_COLORS.map((color, index) => ({
            color,
            d: buildSinePath(
                getStaggerPhaseOffset(index, STAGGER_WAVE_COUNT) * staggerScale,
            ),
        }))
    }, [globalPhase])

    const activeCheckpointIndex = getActiveCheckpointIndex(globalPhase)

    return (
        <div className="flex w-full flex-col gap-4" {...{ [MAGIC_CURSOR_IGNORE_ATTR]: '' }}>
            <div
                ref={containerRef}
                className="w-full overflow-hidden rounded-[22px] border border-[#262626] bg-[#1b1b1b]"
            >
            <div className="flex items-center justify-between gap-3 bg-[#1f1f1f] px-3 py-2">
                <p className="m-0 p-1 font-geist-mono text-sm leading-[21px] text-white">
                    {RIGHT_PHASE_FORMULA}
                </p>
                <AnimatePresence mode="popLayout" initial={false}>
                    {activeCheckpointIndex !== null ? (
                        <motion.span
                            key={activeCheckpointIndex}
                            initial={{ opacity: 0, scale: 0.88 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.88 }}
                            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                            className="shrink-0 rounded-[6px] bg-[#3b3b3b] px-2 py-0.5 font-geist-mono text-sm leading-[18px] text-white"
                        >
                            {getCheckpointLabel(activeCheckpointIndex)}
                        </motion.span>
                    ) : null}
                </AnimatePresence>
            </div>

            <div className="flex flex-col items-center gap-12 px-8 py-8">
                <div className="relative -mx-8 h-[107px] w-[calc(100%+4rem)] overflow-visible">
                    <svg
                        viewBox={`0 0 ${SVG_VIEW_WIDTH} ${SVG_HEIGHT}`}
                        className="h-full w-full overflow-visible"
                        aria-hidden
                    >
                        {waves.map((wave, index) => (
                            <WavePath
                                key={index}
                                d={wave.d}
                                color={wave.color}
                                index={index}
                                isInView={isInView}
                                reveal={reveal}
                            />
                        ))}
                    </svg>
                </div>

                <PhaseShiftSlider
                    phase={globalPhase}
                    onPhaseChange={setGlobalPhase}
                />
            </div>
            </div>
            <p className="m-0 text-[14px] leading-[21px] text-[#878787]">
                At the right phase, the waves are equidistant.
            </p>
        </div>
    )
}
