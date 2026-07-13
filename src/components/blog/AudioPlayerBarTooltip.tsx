import {
    AnimatePresence,
    motion,
    useReducedMotion,
    type Transition,
} from 'motion/react'
import {
    useCallback,
    useLayoutEffect,
    useRef,
    useState,
    type MouseEvent,
    type ReactNode,
    type RefObject,
} from 'react'
import { TextMorph } from '@/components/motion-primitives/text-morph'

export type BarIconTooltipId = 'magic-cursor' | 'checkpoints'

export const BAR_ICON_TOOLTIP_LABELS: Record<BarIconTooltipId, string> = {
    'magic-cursor': 'Magic cursor',
    checkpoints: 'Checkpoints',
}

const TOOLTIP_SPRING: Transition = {
    type: 'spring',
    duration: 0.45,
    bounce: 0.18,
}

const TEXT_MORPH_SPRING: Transition = {
    type: 'spring',
    stiffness: 280,
    damping: 18,
    mass: 0.3,
}

const TOOLTIP_CHIP_CLASS =
    'rounded-[6px] bg-[#3b3b3b] px-1 py-0.5 text-sm leading-[18px] text-white'

function getAnchorCenterX(
    visibleId: BarIconTooltipId,
    anchorRefs: Record<BarIconTooltipId, RefObject<HTMLDivElement | null>>,
    groupRef: RefObject<HTMLDivElement | null>,
): number | null {
    const anchor = anchorRefs[visibleId]?.current
    const group = groupRef.current
    if (!anchor || !group) return null

    const anchorRect = anchor.getBoundingClientRect()
    const groupRect = group.getBoundingClientRect()
    return anchorRect.left + anchorRect.width / 2 - groupRect.left
}

function useTooltipAnchorX(
    visibleId: BarIconTooltipId | null,
    anchorRefs: Record<BarIconTooltipId, RefObject<HTMLDivElement | null>>,
    groupRef: RefObject<HTMLDivElement | null>,
) {
    const centerXRef = useRef<number | null>(null)
    const [, bump] = useState(0)

    if (visibleId) {
        const measured = getAnchorCenterX(visibleId, anchorRefs, groupRef)
        if (measured !== null) {
            centerXRef.current = measured
        }
    }

    const remeasure = useCallback(() => {
        if (!visibleId) return
        const measured = getAnchorCenterX(visibleId, anchorRefs, groupRef)
        if (measured !== null && measured !== centerXRef.current) {
            centerXRef.current = measured
            bump((n) => n + 1)
        }
    }, [anchorRefs, groupRef, visibleId])

    useLayoutEffect(() => {
        remeasure()
    }, [remeasure])

    useLayoutEffect(() => {
        if (!visibleId) return
        window.addEventListener('resize', remeasure)
        return () => window.removeEventListener('resize', remeasure)
    }, [remeasure, visibleId])

    return visibleId ? centerXRef.current : null
}

type BarIconTooltipProps = {
    visibleId: BarIconTooltipId | null
    anchorRefs: Record<BarIconTooltipId, RefObject<HTMLDivElement | null>>
    groupRef: RefObject<HTMLDivElement | null>
}

/** One tooltip: slides above the active icon and morphs its label. */
export function BarIconTooltip({
    visibleId,
    anchorRefs,
    groupRef,
}: BarIconTooltipProps) {
    const prefersReducedMotion = useReducedMotion()
    const centerX = useTooltipAnchorX(visibleId, anchorRefs, groupRef)
    const label = visibleId ? BAR_ICON_TOOLTIP_LABELS[visibleId] : ''

    return (
        <AnimatePresence>
            {visibleId && centerX !== null ? (
                <motion.div
                    key="bar-icon-tooltip"
                    role="tooltip"
                    initial={
                        prefersReducedMotion
                            ? false
                            : { opacity: 0, y: 4, left: centerX }
                    }
                    animate={{ opacity: 1, y: 0, left: centerX }}
                    exit={
                        prefersReducedMotion
                            ? undefined
                            : { opacity: 0, y: 4 }
                    }
                    transition={{
                        left: TOOLTIP_SPRING,
                        opacity: { duration: 0.15, ease: 'easeOut' },
                        y: { duration: 0.15, ease: 'easeOut' },
                    }}
                    className="pointer-events-none absolute bottom-[calc(100%+8px)] z-100 -translate-x-1/2"
                >
                    <motion.div
                        layout
                        transition={{ layout: TOOLTIP_SPRING }}
                        className={`${TOOLTIP_CHIP_CLASS} inline-flex items-center justify-center`}
                    >
                        <TextMorph
                            as="span"
                            className="whitespace-nowrap"
                            transition={TEXT_MORPH_SPRING}
                        >
                            {label}
                        </TextMorph>
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    )
}

type BarIconTooltipItemProps = {
    anchorRef: RefObject<HTMLDivElement | null>
    onMouseEnter: () => void
    onMouseLeave: (e: MouseEvent) => void
    children: ReactNode
}

export function BarIconTooltipItem({
    anchorRef,
    onMouseEnter,
    onMouseLeave,
    children,
}: BarIconTooltipItemProps) {
    return (
        <div
            ref={anchorRef}
            className="relative shrink-0 overflow-visible"
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            {children}
        </div>
    )
}
