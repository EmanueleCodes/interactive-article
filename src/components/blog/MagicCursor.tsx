import { useEffect, useRef, useState } from 'react'
import {
    animate,
    motion,
    useMotionValue,
    useReducedMotion,
    type AnimationPlaybackControls,
} from 'motion/react'
import {
    MAGIC_CURSOR_IGNORE_SELECTOR,
    MAGIC_CURSOR_WORD_HOVER_BACKGROUND,
} from './magicCursorTypes'
import { useNarration } from './NarrationContext'

const DOT_SIZE_PX = 10
const HIGHLIGHT_INSET_X_PX = 3
const HIGHLIGHT_INSET_Y_PX = 2
const HIGHLIGHT_RADIUS_PX = 4

const WORD_MORPH_SPRING = {
    type: 'spring' as const,
    duration: 0.22,
    bounce: 0.12,
}

const NARRATION_WORD_SELECTOR = '[data-narration-word]'

function logMagicCursor(event: string, details?: Record<string, unknown>) {
    console.log(`[magic-cursor] ${event}`, details ?? {})
}

type CursorRect = {
    left: number
    top: number
    width: number
    height: number
    borderRadius: number
}

type MotionValues = {
    left: ReturnType<typeof useMotionValue<number>>
    top: ReturnType<typeof useMotionValue<number>>
    width: ReturnType<typeof useMotionValue<number>>
    height: ReturnType<typeof useMotionValue<number>>
    borderRadius: ReturnType<typeof useMotionValue<number>>
}

function getDotRect(clientX: number, clientY: number): CursorRect {
    return {
        left: clientX - DOT_SIZE_PX / 2,
        top: clientY - DOT_SIZE_PX / 2,
        width: DOT_SIZE_PX,
        height: DOT_SIZE_PX,
        borderRadius: DOT_SIZE_PX,
    }
}

function getWordHighlightRect(element: HTMLElement): CursorRect {
    const box = element.getBoundingClientRect()
    return {
        left: box.left - HIGHLIGHT_INSET_X_PX,
        top: box.top + HIGHLIGHT_INSET_Y_PX,
        width: box.width + HIGHLIGHT_INSET_X_PX * 2,
        height: box.height - HIGHLIGHT_INSET_Y_PX * 2,
        borderRadius: HIGHLIGHT_RADIUS_PX,
    }
}

function hitElementAt(clientX: number, clientY: number): Element | null {
    return document.elementFromPoint(clientX, clientY)
}

function isOverIgnoredSurface(clientX: number, clientY: number): boolean {
    const hit = hitElementAt(clientX, clientY)
    return hit?.closest(MAGIC_CURSOR_IGNORE_SELECTOR) != null
}

function findNarrationWordAt(
    clientX: number,
    clientY: number,
): HTMLElement | null {
    const hit = hitElementAt(clientX, clientY)
    if (hit?.closest(MAGIC_CURSOR_IGNORE_SELECTOR)) return null
    return hit?.closest<HTMLElement>(NARRATION_WORD_SELECTOR) ?? null
}

function applyRectInstant(rect: CursorRect, values: MotionValues) {
    values.left.set(rect.left)
    values.top.set(rect.top)
    values.width.set(rect.width)
    values.height.set(rect.height)
    values.borderRadius.set(rect.borderRadius)
}

function animateToRect(
    rect: CursorRect,
    values: MotionValues,
    transition: typeof WORD_MORPH_SPRING | { duration: number },
): AnimationPlaybackControls[] {
    return [
        animate(values.left, rect.left, transition),
        animate(values.top, rect.top, transition),
        animate(values.width, rect.width, transition),
        animate(values.height, rect.height, transition),
        animate(values.borderRadius, rect.borderRadius, transition),
    ]
}

export function MagicCursor() {
    const { magicCursorEnabled, playFromTime } = useNarration()
    const prefersReducedMotion = useReducedMotion()
    const [onWord, setOnWord] = useState(false)
    const [passthrough, setPassthrough] = useState(false)

    const left = useMotionValue(0)
    const top = useMotionValue(0)
    const width = useMotionValue(DOT_SIZE_PX)
    const height = useMotionValue(DOT_SIZE_PX)
    const borderRadius = useMotionValue(DOT_SIZE_PX)

    const values: MotionValues = { left, top, width, height, borderRadius }

    useEffect(() => {
        if (!magicCursorEnabled) return

        document.documentElement.classList.add('magic-cursor-active')

        const hoveredWordRef = { current: null as HTMLElement | null }
        const morphControls: AnimationPlaybackControls[] = []

        const morphTransition = prefersReducedMotion
            ? { duration: 0 }
            : WORD_MORPH_SPRING

        const stopMorph = () => {
            for (const control of morphControls) control.stop()
            morphControls.length = 0
        }

        const goToWord = (word: HTMLElement) => {
            stopMorph()
            setOnWord(true)
            morphControls.push(
                ...animateToRect(
                    getWordHighlightRect(word),
                    values,
                    morphTransition,
                ),
            )
        }

        const goToDot = (clientX: number, clientY: number) => {
            stopMorph()
            setOnWord(false)
            applyRectInstant(getDotRect(clientX, clientY), values)
        }

        const trackWord = (word: HTMLElement) => {
            const rect = getWordHighlightRect(word)
            if (prefersReducedMotion) {
                applyRectInstant(rect, values)
                return
            }
            stopMorph()
            morphControls.push(
                ...animateToRect(rect, values, { duration: 0.06 }),
            )
        }

        const onMove = (event: MouseEvent) => {
            if (isOverIgnoredSurface(event.clientX, event.clientY)) {
                setPassthrough(true)
                hoveredWordRef.current = null
                stopMorph()
                setOnWord(false)
                return
            }

            setPassthrough(false)

            const word = findNarrationWordAt(event.clientX, event.clientY)

            if (word !== hoveredWordRef.current) {
                hoveredWordRef.current = word
                if (word) goToWord(word)
                else goToDot(event.clientX, event.clientY)
                return
            }

            if (!word) {
                applyRectInstant(
                    getDotRect(event.clientX, event.clientY),
                    values,
                )
            }
        }

        const onScrollOrResize = () => {
            const word = hoveredWordRef.current
            if (word) trackWord(word)
        }

        const onClick = (event: MouseEvent) => {
            if (
                (event.target as Element | null)?.closest(
                    MAGIC_CURSOR_IGNORE_SELECTOR,
                ) ??
                isOverIgnoredSurface(event.clientX, event.clientY)
            ) {
                return
            }

            const word =
                (event.target as Element | null)?.closest<HTMLElement>(
                    NARRATION_WORD_SELECTOR,
                ) ?? findNarrationWordAt(event.clientX, event.clientY)

            if (!word) return

            event.preventDefault()
            event.stopPropagation()

            const start = Number.parseFloat(
                word.getAttribute('data-word-start') ?? '',
            )
            if (!Number.isFinite(start)) {
                logMagicCursor('word click ignored: invalid start time', {
                    text: word.textContent,
                    rawStart: word.getAttribute('data-word-start'),
                })
                return
            }

            logMagicCursor('word click playFromTime', {
                text: word.textContent,
                start,
                segmentId: word.getAttribute('data-segment-id'),
                wordIndex: word.getAttribute('data-word-index'),
            })
            playFromTime(start)
        }

        window.addEventListener('mousemove', onMove, { passive: true })
        window.addEventListener('scroll', onScrollOrResize, { passive: true })
        window.addEventListener('resize', onScrollOrResize)
        window.addEventListener('click', onClick, { capture: true })

        return () => {
            document.documentElement.classList.remove('magic-cursor-active')
            document.documentElement.classList.remove('magic-cursor-passthrough')
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('scroll', onScrollOrResize)
            window.removeEventListener('resize', onScrollOrResize)
            window.removeEventListener('click', onClick, { capture: true })
            stopMorph()
        }
    }, [magicCursorEnabled, playFromTime, prefersReducedMotion])

    useEffect(() => {
        if (!magicCursorEnabled) return

        document.documentElement.classList.toggle(
            'magic-cursor-passthrough',
            passthrough,
        )
    }, [magicCursorEnabled, passthrough])

    if (!magicCursorEnabled) return null

    return (
        <motion.div
            aria-hidden
            className={`pointer-events-none fixed z-200 ${
                onWord ? '' : 'bg-[#4db8ff]'
            }`}
            style={{
                left,
                top,
                width,
                height,
                borderRadius,
                opacity: passthrough ? 0 : 1,
                ...(onWord
                    ? { backgroundColor: MAGIC_CURSOR_WORD_HOVER_BACKGROUND }
                    : undefined),
            }}
        />
    )
}
