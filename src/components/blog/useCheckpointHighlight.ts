import gsap from 'gsap'
import { useCallback, useLayoutEffect, useRef } from 'react'
import { useNarrationOptional } from './NarrationContext'

const CHECKPOINT_BORDER_ACTIVE = 'rgba(0, 157, 255, 0.85)'
const CHECKPOINT_BORDER_IDLE = 'rgb(38, 38, 38)'

const CHECKPOINT_FADE_IN_DURATION_S = 0.2
const CHECKPOINT_FADE_OUT_DURATION_S = 1.5
const CHECKPOINT_EASE = 'power2.inOut'

const GLOW_BLUR_PX = 24
const GLOW_ALPHA = 0.5
const RING_ALPHA = 0.35

type HighlightProgress = { value: number }

function applyHighlightProgress(el: HTMLElement, t: number) {
    el.style.borderColor = gsap.utils.interpolate(
        CHECKPOINT_BORDER_IDLE,
        CHECKPOINT_BORDER_ACTIVE,
        t,
    ) as string

    if (t <= 0.001) {
        el.style.boxShadow = '0 0 0 0 transparent'
        return
    }

    const blur = gsap.utils.interpolate(0, GLOW_BLUR_PX, t)
    const glowAlpha = gsap.utils.interpolate(0, GLOW_ALPHA, t)
    const ringAlpha = gsap.utils.interpolate(0, RING_ALPHA, t)
    el.style.boxShadow = `0 0 ${blur}px rgba(0, 157, 255, ${glowAlpha}), 0 0 0 1px rgba(0, 157, 255, ${ringAlpha})`
}

function applyIdleHighlight(el: HTMLElement, progress: HighlightProgress) {
    progress.value = 0
    gsap.killTweensOf(progress)
    applyHighlightProgress(el, 0)
}

/** Border + glow on the code block; GSAP fade in then fade out when the checkpoint is hit. */
export function useCheckpointHighlight(afterSegmentId?: string) {
    const pausedCheckpoint = useNarrationOptional()?.pausedCheckpoint ?? null
    const shellRef = useRef<HTMLElement | null>(null)
    const progressRef = useRef<HighlightProgress>({ value: 0 })
    const timelineRef = useRef<gsap.core.Timeline | null>(null)

    const isAtCheckpoint = Boolean(
        afterSegmentId &&
            pausedCheckpoint?.segmentId === afterSegmentId,
    )

    const setShellRef = useCallback(
        (node: HTMLElement | null) => {
            shellRef.current = node
            if (!node || !afterSegmentId) return
            timelineRef.current?.kill()
            timelineRef.current = null
            applyIdleHighlight(node, progressRef.current)
        },
        [afterSegmentId],
    )

    useLayoutEffect(() => {
        const el = shellRef.current
        const progress = progressRef.current
        if (!el || !afterSegmentId) return

        if (!isAtCheckpoint) {
            timelineRef.current?.kill()
            timelineRef.current = null
            applyIdleHighlight(el, progress)
            return
        }

        timelineRef.current?.kill()
        applyIdleHighlight(el, progress)

        const tl = gsap.timeline()
        tl.to(progress, {
            value: 1,
            duration: CHECKPOINT_FADE_IN_DURATION_S,
            ease: CHECKPOINT_EASE,
            onUpdate: () => applyHighlightProgress(el, progress.value),
        }).to(progress, {
            value: 0,
            duration: CHECKPOINT_FADE_OUT_DURATION_S,
            ease: CHECKPOINT_EASE,
            onUpdate: () => applyHighlightProgress(el, progress.value),
            onComplete: () => applyHighlightProgress(el, 0),
        })

        timelineRef.current = tl

        return () => {
            timelineRef.current?.kill()
            timelineRef.current = null
        }
    }, [isAtCheckpoint, afterSegmentId])

    useLayoutEffect(() => {
        return () => {
            const el = shellRef.current
            if (!el) return
            timelineRef.current?.kill()
            timelineRef.current = null
            applyIdleHighlight(el, progressRef.current)
        }
    }, [])

    return {
        isAtCheckpoint,
        /** Omit Tailwind border color when set — GSAP drives `borderColor`. */
        usesGsapBorder: Boolean(afterSegmentId),
        shellRef: afterSegmentId ? setShellRef : undefined,
    }
}
