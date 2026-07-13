import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, Minus, Pause, Play, Plus } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
    BarIconTooltip,
    BarIconTooltipItem,
    type BarIconTooltipId,
} from './AudioPlayerBarTooltip'
import { CheckpointsIcon, MagicCursorIcon } from './AudioPlayerIcons'
import { useNarration } from './NarrationContext'
import { useBarIconTooltipGroup } from './useBarIconTooltipGroup'
import {
    formatPlaybackRateLabel,
    NARRATION_PLAYBACK_RATES,
    WIDEST_PLAYBACK_RATE_LABEL,
    type NarrationPlaybackRate,
} from './playbackRate'
import { TextMorph } from '@/components/motion-primitives/text-morph'
import { WaveformVisualization } from './WaveformVisualization'
import { blogPressWhileTap, BlogPressable } from './BlogPressable'
import { MAGIC_CURSOR_IGNORE_ATTR } from './magicCursorTypes'

type AudioPlayerProps = {
    className?: string
}

const INTRO_SPRING = {
    type: 'spring' as const,
    duration: 1,
    bounce: 0.25,
    delay:0.5,
}

const GO_TO_TEXT_SPRING = {
    type: 'spring' as const,
    duration: 0.55,
    bounce: 0.32,
}

/** Playback bar width when speed +/- slots open/close. */
const BAR_RESIZE_SPRING = {
    type: 'spring' as const,
    duration: 0.6,
    bounce: 0.35,
}

const SPEED_LABEL_CLASS =
    'whitespace-nowrap font-geist-mono text-[11px] font-medium tracking-[0.24px] tabular-nums text-white md:text-xs'

/** Figma 1615:3575 — 36px tall; width pinned to widest label (e.g. 1.75×) */
const SPEED_CENTER_CLASS =
    'relative z-10 flex h-8 shrink-0 items-center justify-center rounded-full bg-[#2b2b2b] px-1.5 md:h-9 md:px-2'

/** Figma 1615:3571 — ~25px ± chips */
const SPEED_STEP_BUTTON =
    'flex size-[22px] shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#2b2b2b] text-white outline-none transition-colors hover:bg-[#353535] focus:outline-none focus-visible:outline-none disabled:pointer-events-none disabled:opacity-35 md:size-[25px]'

const BAR_TOGGLE_ICON_BASE =
    'flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full outline-none transition-colors focus:outline-none focus-visible:outline-none md:size-10'

const PLAYBACK_CONTROL_CLASS =
    'flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full outline-none transition-colors hover:bg-white/10 focus:outline-none focus-visible:outline-none disabled:opacity-40 md:size-10'

function useCompactPlayerLayout() {
    const [compact, setCompact] = useState(false)

    useEffect(() => {
        const mq = window.matchMedia('(max-width: 767px)')
        const update = () => setCompact(mq.matches)
        update()
        mq.addEventListener('change', update)
        return () => mq.removeEventListener('change', update)
    }, [])

    return compact
}

function barToggleIconClass(_active: boolean) {
    return `${BAR_TOGGLE_ICON_BASE} bg-[#2b2b2b] hover:bg-[#353535]`
}

function useIntroMotion() {
    const prefersReducedMotion = useReducedMotion()
    const introPlayedRef = useRef(false)

    if (prefersReducedMotion || introPlayedRef.current) {
        return { initial: false, transition: undefined, onIntroComplete: undefined }
    }

    return {
        initial: { y: 120 },
        transition: INTRO_SPRING,
        onIntroComplete: () => {
            introPlayedRef.current = true
        },
    }
}

function useGoToTextTransition() {
    const prefersReducedMotion = useReducedMotion()
    return prefersReducedMotion ? { duration: 0.15 } : GO_TO_TEXT_SPRING
}

function useBarResizeTransition() {
    const prefersReducedMotion = useReducedMotion()
    return prefersReducedMotion ? { duration: 0.15 } : BAR_RESIZE_SPRING
}

type PlayerShellProps = {
    className?: string
    children: ReactNode
}

function PlayerShell({ className = '', children }: PlayerShellProps) {
    const { initial, transition, onIntroComplete } = useIntroMotion()

    return (
        <div
            className={`pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 md:bottom-6 md:px-6 ${className}`.trim()}
        >
            <motion.div
                className="pointer-events-auto mx-auto flex w-full max-w-[700px] justify-center"
                {...{ [MAGIC_CURSOR_IGNORE_ATTR]: '' }}
                initial={initial}
                animate={{ y: 0, opacity: 1 }}
                transition={transition}
                onAnimationComplete={onIntroComplete}
            >
                {children}
            </motion.div>
        </div>
    )
}

function PlaybackSpeedControl({
    rate,
    disabled,
    onIncrease,
    onDecrease,
    barResizeTransition,
    compact,
}: {
    rate: NarrationPlaybackRate
    disabled: boolean
    onIncrease: () => void
    onDecrease: () => void
    barResizeTransition: ReturnType<typeof useBarResizeTransition>
    compact: boolean
}) {
    const [hovered, setHovered] = useState(false)
    const label = formatPlaybackRateLabel(rate)
    const speedStepSlotPx = compact ? 22 : 26
    const speedSlotGapPx = compact ? 1 : 2

    const rateIndex = NARRATION_PLAYBACK_RATES.indexOf(rate)
    const canIncrease =
        rateIndex < NARRATION_PLAYBACK_RATES.length - 1 && rateIndex >= 0
    const canDecrease = rateIndex > 0

    return (
        <div
            className="relative flex shrink-0 items-center gap-0.5"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocusCapture={() => setHovered(true)}
            onBlurCapture={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                    setHovered(false)
                }
            }}
        >
            <motion.div
                initial={false}
                animate={{
                    width: hovered ? speedStepSlotPx : 0,
                    marginRight: hovered ? speedSlotGapPx : 0,
                    opacity: hovered ? 1 : 0,
                }}
                transition={{
                    width: barResizeTransition,
                    marginRight: barResizeTransition,
                    opacity: { duration: 0.12 },
                }}
                className="z-0 shrink-0 overflow-hidden"
                aria-hidden={!hovered}
            >
                <BlogPressable
                    tabIndex={hovered ? 0 : -1}
                    onClick={onDecrease}
                    disabled={disabled || !canDecrease}
                    className={SPEED_STEP_BUTTON}
                    aria-label="Decrease playback speed"
                >
                    <Minus className="size-3 md:size-3.5" strokeWidth={2.5} />
                </BlogPressable>
            </motion.div>

            <div
                className={`${SPEED_CENTER_CLASS} ${
                    disabled ? 'opacity-40' : ''
                }`}
                aria-live="polite"
                aria-label={`Playback speed ${label}`}
            >
                <span
                    className={`${SPEED_LABEL_CLASS} invisible pointer-events-none select-none`}
                    aria-hidden
                >
                    {WIDEST_PLAYBACK_RATE_LABEL}
                </span>
                <TextMorph
                    as="span"
                    className={`${SPEED_LABEL_CLASS} absolute inset-0 flex items-center justify-center`}
                >
                    {label}
                </TextMorph>
            </div>

            <motion.div
                initial={false}
                animate={{
                    width: hovered ? speedStepSlotPx : 0,
                    marginLeft: hovered ? speedSlotGapPx : 0,
                    opacity: hovered ? 1 : 0,
                }}
                transition={{
                    width: barResizeTransition,
                    marginLeft: barResizeTransition,
                    opacity: { duration: 0.12 },
                }}
                className="z-0 shrink-0 overflow-hidden"
                aria-hidden={!hovered}
            >
                <BlogPressable
                    tabIndex={hovered ? 0 : -1}
                    onClick={onIncrease}
                    disabled={disabled || !canIncrease}
                    className={SPEED_STEP_BUTTON}
                    aria-label="Increase playback speed"
                >
                    <Plus className="size-3 md:size-3.5" strokeWidth={2.5} />
                </BlogPressable>
            </motion.div>
        </div>
    )
}

/** Same row as the bar (z below pill); slides out left → right at full opacity. */
function GoToTextArrow({
    show,
    arrowUp,
    onClick,
    compact,
}: {
    show: boolean
    arrowUp: boolean
    onClick: () => void
    compact: boolean
}) {
    const transition = useGoToTextTransition()
    const prefersReducedMotion = useReducedMotion()
    /** Tucked under the bar’s trailing edge before sliding into ml-2 rest. */
    const emergeX = compact ? -40 : -50

    return (
        <AnimatePresence>
            {show ? (
                <motion.button
                    key={arrowUp ? 'go-to-text-up' : 'go-to-text-down'}
                    type="button"
                    initial={{ opacity: 1, x: emergeX }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 1, x: emergeX }}
                    transition={transition}
                    whileTap={
                        prefersReducedMotion
                            ? undefined
                            : blogPressWhileTap()
                    }
                    onClick={onClick}
                    className="pointer-events-auto absolute top-1/2 left-full z-0 ml-1.5 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-[#009dff] text-white outline-none transition-colors hover:bg-[#1aadff] focus:outline-none focus-visible:outline-none md:ml-2 md:size-10"
                    aria-label={
                        arrowUp ? 'Go to text above' : 'Go to text below'
                    }
                >
                    {arrowUp ? (
                        <ArrowUp className="size-4" strokeWidth={2.5} />
                    ) : (
                        <ArrowDown className="size-4" strokeWidth={2.5} />
                    )}
                </motion.button>
            ) : null}
        </AnimatePresence>
    )
}

export function AudioPlayer({ className = '' }: AudioPlayerProps) {
    const {
        isPlaying,
        toggle,
        isReady,
        isActiveWordInView,
        isActiveWordAboveViewport,
        scrollToActiveWord,
        magicCursorEnabled,
        toggleMagicCursor,
        checkpointsEnabled,
        toggleCheckpoints,
        pausedCheckpoint,
        playbackRate,
        increasePlaybackRate,
        decreasePlaybackRate,
    } = useNarration()
    const showGoToText = isPlaying && !isActiveWordInView
    const awaitingCheckpointResume =
        pausedCheckpoint != null && !isPlaying
    const compact = useCompactPlayerLayout()
    const barResizeTransition = useBarResizeTransition()
    const tooltip = useBarIconTooltipGroup<BarIconTooltipId>()
    const magicCursorAnchorRef = useRef<HTMLDivElement>(null)
    const checkpointsAnchorRef = useRef<HTMLDivElement>(null)
    const tooltipAnchorRefs = {
        'magic-cursor': magicCursorAnchorRef,
        checkpoints: checkpointsAnchorRef,
    }

    return (
        <PlayerShell className={className}>
            <div className="relative w-full max-w-full overflow-visible md:w-fit">
                <motion.div
                    layout
                    transition={{ layout: barResizeTransition }}
                    className="relative z-10 flex w-full max-w-full items-center gap-1.5 overflow-visible rounded-full border border-[#383838] bg-[#1f1f1f] p-0.5 shadow-[0_7px_7px_rgba(0,0,0,0.25),0_26px_13px_rgba(0,0,0,0.21),0_59px_17.5px_rgba(0,0,0,0.13)] md:w-fit md:gap-3 md:p-1"
                    role="region"
                    aria-label="Article narration"
                    initial={false}
                >
                    <BlogPressable
                        onClick={toggle}
                        disabled={!isReady}
                        className={`${PLAYBACK_CONTROL_CLASS} ${
                            awaitingCheckpointResume
                                ? 'text-[#009dff]'
                                : 'text-white'
                        }`}
                        aria-label={
                            isPlaying ? 'Pause narration' : 'Play narration'
                        }
                    >
                        {isPlaying ? (
                            <Pause className="size-3.5 fill-current md:size-4" />
                        ) : (
                            <Play className="size-3.5 fill-current md:size-4" />
                        )}
                    </BlogPressable>

                    <WaveformVisualization className="min-w-0 flex-1 overflow-hidden md:flex-none" />

                    <div
                        ref={tooltip.groupRef}
                        className="relative flex shrink-0 items-center gap-0.5 overflow-visible"
                        onMouseLeave={(e) => {
                            if (
                                !(
                                    e.relatedTarget instanceof Node &&
                                    tooltip.groupRef.current?.contains(
                                        e.relatedTarget,
                                    )
                                )
                            ) {
                                tooltip.onLeaveGroup()
                            }
                        }}
                    >
                        <PlaybackSpeedControl
                            rate={playbackRate}
                            disabled={!isReady}
                            onIncrease={increasePlaybackRate}
                            onDecrease={decreasePlaybackRate}
                            barResizeTransition={barResizeTransition}
                            compact={compact}
                        />

                        <BarIconTooltipItem
                            anchorRef={magicCursorAnchorRef}
                            onMouseEnter={() =>
                                tooltip.onEnter('magic-cursor')
                            }
                            onMouseLeave={(e) =>
                                tooltip.onLeaveItem(
                                    'magic-cursor',
                                    e.relatedTarget,
                                )
                            }
                        >
                            <BlogPressable
                                onClick={toggleMagicCursor}
                                aria-pressed={magicCursorEnabled}
                                aria-label={
                                    magicCursorEnabled
                                        ? 'Turn off Magic cursor'
                                        : 'Turn on Magic cursor'
                                }
                                className={barToggleIconClass(
                                    magicCursorEnabled,
                                )}
                            >
                                <MagicCursorIcon
                                    active={magicCursorEnabled}
                                />
                            </BlogPressable>
                        </BarIconTooltipItem>

                        <BarIconTooltipItem
                            anchorRef={checkpointsAnchorRef}
                            onMouseEnter={() =>
                                tooltip.onEnter('checkpoints')
                            }
                            onMouseLeave={(e) =>
                                tooltip.onLeaveItem(
                                    'checkpoints',
                                    e.relatedTarget,
                                )
                            }
                        >
                            <BlogPressable
                                onClick={toggleCheckpoints}
                                aria-pressed={checkpointsEnabled}
                                aria-label={
                                    checkpointsEnabled
                                        ? 'Turn off Checkpoints'
                                        : 'Turn on Checkpoints'
                                }
                                className={barToggleIconClass(checkpointsEnabled)}
                            >
                                <CheckpointsIcon
                                    active={checkpointsEnabled}
                                />
                            </BlogPressable>
                        </BarIconTooltipItem>

                        <BarIconTooltip
                            visibleId={tooltip.visibleId}
                            anchorRefs={tooltipAnchorRefs}
                            groupRef={tooltip.groupRef}
                        />
                    </div>
                </motion.div>

                <GoToTextArrow
                    show={showGoToText}
                    arrowUp={isActiveWordAboveViewport}
                    onClick={scrollToActiveWord}
                    compact={compact}
                />
            </div>
        </PlayerShell>
    )
}
