import { centerScrollYForContentY } from './articleScrollProgress'
import {
    getSegmentById,
    getTranscriptDuration,
    getWordHighlightEnd,
    type NarrationTranscript,
} from './narrationTypes'

const NARRATION_WORD_SELECTOR = '[data-narration-word]'
const CHAPTER_SELECTOR = '[data-chapter]'

function clamp01(value: number): number {
    return Math.min(1, Math.max(0, value))
}

function getViewportCenterY(): number {
    return window.innerHeight / 2
}

/** Chapter block that contains the viewport center (walk up from hit target, then by Y). */
export function getChapterAtViewportCenter(): HTMLElement | null {
    const x = window.innerWidth / 2
    const y = getViewportCenterY()

    let node = document.elementFromPoint(x, y)
    while (node) {
        if (node instanceof HTMLElement && node.hasAttribute('data-chapter')) {
            return node
        }
        node = node.parentElement
    }

    const centerDocY = window.scrollY + y
    const chapters = document.querySelectorAll(CHAPTER_SELECTOR)

    for (const chapter of chapters) {
        if (!(chapter instanceof HTMLElement)) continue
        const rect = chapter.getBoundingClientRect()
        const top = window.scrollY + rect.top
        const bottom = top + rect.height
        if (centerDocY >= top && centerDocY <= bottom) return chapter
    }

    let best: HTMLElement | null = null
    let bestDist = Infinity

    for (const chapter of chapters) {
        if (!(chapter instanceof HTMLElement)) continue
        const rect = chapter.getBoundingClientRect()
        const top = window.scrollY + rect.top
        const chapterCenter = top + rect.height / 2
        const dist = Math.abs(chapterCenter - centerDocY)
        if (dist < bestDist) {
            bestDist = dist
            best = chapter
        }
    }

    return best
}

function getClosestWordInRoot(
    root: ParentNode,
    centerY: number,
    requireVisible = true,
): HTMLElement | null {
    const words = root.querySelectorAll(NARRATION_WORD_SELECTOR)

    let best: HTMLElement | null = null
    let bestDist = Infinity

    for (const word of words) {
        if (!(word instanceof HTMLElement)) continue
        const rect = word.getBoundingClientRect()
        if (requireVisible && (rect.bottom < 0 || rect.top > window.innerHeight)) {
            continue
        }

        const wordCenterY = rect.top + rect.height / 2
        const dist = Math.abs(wordCenterY - centerY)
        if (dist < bestDist) {
            bestDist = dist
            best = word
        }
    }

    return best
}

function getClosestWordInChapter(
    chapter: HTMLElement,
    centerY: number,
): HTMLElement | null {
    return (
        getClosestWordInRoot(chapter, centerY, true) ??
        getClosestWordInRoot(chapter, centerY, false)
    )
}

/** Space reserved above the fixed narration player (px). */
export const NARRATION_PLAYER_VIEWPORT_BOTTOM_PX = 96

const NARRATION_VIEWPORT_TOP_RATIO = 0.08

export function getActiveWordElement(
    segmentId: string | null,
    wordIndex: number,
): HTMLElement | null {
    if (!segmentId || wordIndex < 0) return null
    const el = document.querySelector(
        `${NARRATION_WORD_SELECTOR}[data-segment-id="${segmentId}"][data-word-index="${wordIndex}"]`,
    )
    return el instanceof HTMLElement ? el : null
}

export type ActiveWordViewportState = {
    inView: boolean
    aboveViewport: boolean
}

/** Whether the active word overlaps the readable band above the fixed player. */
export function measureActiveWordViewport(
    element: HTMLElement | null,
): ActiveWordViewportState {
    if (!element) {
        return { inView: true, aboveViewport: false }
    }

    const rect = element.getBoundingClientRect()
    const topMargin = window.innerHeight * NARRATION_VIEWPORT_TOP_RATIO
    const playerTopY = window.innerHeight - NARRATION_PLAYER_VIEWPORT_BOTTOM_PX
    const overlapsReadableBand =
        rect.bottom > topMargin && rect.top < playerTopY

    if (overlapsReadableBand) {
        return { inView: true, aboveViewport: false }
    }

    return {
        inView: false,
        aboveViewport: rect.bottom <= topMargin,
    }
}

/** Word span under the viewport center; scoped to the current chapter when center is on a demo/code block. */
export function getWordElementAtViewportCenter(): HTMLElement | null {
    const x = window.innerWidth / 2
    const y = getViewportCenterY()

    let node = document.elementFromPoint(x, y)
    while (node) {
        if (
            node instanceof HTMLElement &&
            node.hasAttribute('data-narration-word')
        ) {
            return node
        }
        node = node.parentElement
    }

    const chapter = getChapterAtViewportCenter()
    if (chapter) {
        const inChapter = getClosestWordInChapter(chapter, y)
        if (inChapter) return inChapter
    }

    return (
        getClosestWordInRoot(document, y, true) ??
        getClosestWordInRoot(document, y, false)
    )
}

export function getTimeForWordElement(
    transcript: NarrationTranscript,
    element: HTMLElement,
): number | null {
    const segmentId = element.getAttribute('data-segment-id')
    const wordIndex = Number(element.getAttribute('data-word-index'))
    if (!segmentId || Number.isNaN(wordIndex)) return null

    const segment = getSegmentById(transcript, segmentId)
    const word = segment?.words[wordIndex]
    return word?.start ?? null
}

/** Narration time (seconds) for the word at the viewport center, if any. */
export function getTimeAtViewportCenter(
    transcript: NarrationTranscript,
): number | null {
    const element = getWordElementAtViewportCenter()
    if (!element) return null
    return getTimeForWordElement(transcript, element)
}

/**
 * 0–1 progress aligned with narration: viewport center → word timestamp → duration.
 * Falls back when no narrated words are in the DOM (e.g. SSR).
 */
export function measureNarrationProgressAtViewportCenter(
    transcript: NarrationTranscript,
    fallback: () => number = () => 0,
): number {
    const duration = getTranscriptDuration(transcript)
    if (duration <= 0) return 0

    const time = getTimeAtViewportCenter(transcript)
    if (time == null) return fallback()

    return clamp01(time / duration)
}

/** Scroll so the word at `time` sits near the viewport center (clamped to page limits). */
export function scrollToNarrationTime(
    transcript: NarrationTranscript,
    time: number,
): boolean {
    const duration = getTranscriptDuration(transcript)
    if (duration <= 0) return false

    const targetTime = Math.min(duration, Math.max(0, time))

    for (const segment of transcript.segments) {
        const { words } = segment
        for (let i = 0; i < words.length; i++) {
            const word = words[i]
            const end = getWordHighlightEnd(words, i)
            const isLast = i === words.length - 1
            const inRange =
                (targetTime >= word.start && targetTime < end) ||
                (isLast && targetTime >= word.start && targetTime <= end + 0.35)

            if (!inRange) continue

            const el = document.querySelector(
                `${NARRATION_WORD_SELECTOR}[data-segment-id="${segment.id}"][data-word-index="${i}"]`,
            )
            if (!(el instanceof HTMLElement)) continue

            const rect = el.getBoundingClientRect()
            const contentY = window.scrollY + rect.top + rect.height / 2
            window.scrollTo({
                top: centerScrollYForContentY(contentY),
                behavior: 'smooth',
            })
            return true
        }
    }

    return false
}

export function scrollToNarrationProgress(
    transcript: NarrationTranscript,
    ratio: number,
    fallback: (ratio: number) => void,
): void {
    const duration = getTranscriptDuration(transcript)
    const clamped = clamp01(ratio)
    const time = clamped * duration

    if (scrollToNarrationTime(transcript, time)) return
    fallback(clamped)
}
