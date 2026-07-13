import { useCallback, useEffect, useRef, useState } from 'react'

export const BAR_ICON_TOOLTIP_HOLD_MS = 750

export function useBarIconTooltipGroup<T extends string>() {
    const [armed, setArmed] = useState(false)
    const [visibleId, setVisibleId] = useState<T | null>(null)
    const groupRef = useRef<HTMLDivElement>(null)
    const hoveredIdRef = useRef<T | null>(null)
    const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const clearHoldTimer = useCallback(() => {
        if (holdTimerRef.current) {
            clearTimeout(holdTimerRef.current)
            holdTimerRef.current = null
        }
    }, [])

    const reset = useCallback(() => {
        clearHoldTimer()
        hoveredIdRef.current = null
        setArmed(false)
        setVisibleId(null)
    }, [clearHoldTimer])

    const show = useCallback((id: T) => {
        setVisibleId(id)
        setArmed(true)
    }, [])

    const onEnter = useCallback(
        (id: T) => {
            hoveredIdRef.current = id
            clearHoldTimer()

            if (armed) {
                show(id)
                return
            }

            holdTimerRef.current = setTimeout(() => {
                holdTimerRef.current = null
                if (hoveredIdRef.current === id) show(id)
            }, BAR_ICON_TOOLTIP_HOLD_MS)
        },
        [armed, clearHoldTimer, show],
    )

    const onLeaveItem = useCallback(
        (id: T, relatedTarget: EventTarget | null) => {
            if (hoveredIdRef.current === id) {
                hoveredIdRef.current = null
            }

            const group = groupRef.current
            if (
                relatedTarget instanceof Node &&
                group?.contains(relatedTarget)
            ) {
                clearHoldTimer()
                if (!armed) setVisibleId(null)
                return
            }

            reset()
        },
        [armed, clearHoldTimer, reset],
    )

    const onLeaveGroup = useCallback(() => {
        reset()
    }, [reset])

    useEffect(() => () => clearHoldTimer(), [clearHoldTimer])

    return {
        groupRef,
        visibleId,
        onEnter,
        onLeaveItem,
        onLeaveGroup,
    }
}
