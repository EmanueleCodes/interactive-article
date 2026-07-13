export function measureArticleScrollProgress(element: HTMLElement): number {
    const scrollY = window.scrollY
    const viewportHeight = window.innerHeight
    const rect = element.getBoundingClientRect()
    const elementTop = scrollY + rect.top
    const elementHeight = element.offsetHeight
    const scrollRange = elementHeight - viewportHeight

    if (scrollRange <= 0) return 1

    const progress = (scrollY - elementTop) / scrollRange
    return Math.min(1, Math.max(0, progress))
}

export function scrollArticleToProgress(
    element: HTMLElement,
    ratio: number,
): void {
    const scrollY = window.scrollY
    const viewportHeight = window.innerHeight
    const rect = element.getBoundingClientRect()
    const elementTop = scrollY + rect.top
    const elementHeight = element.offsetHeight
    const scrollRange = Math.max(elementHeight - viewportHeight, 0)
    const clamped = Math.min(1, Math.max(0, ratio))
    const target = elementTop + clamped * scrollRange

    window.scrollTo({ top: target, behavior: 'smooth' })
}

export type WeightedScrollSection = {
    element: HTMLElement
    weight: number
}

type ChapterDocumentBounds = {
    element: HTMLElement
    weight: number
    startY: number
    endY: number
}

function getMaxScrollY(): number {
    return Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight,
    )
}

/** Scroll position that places `contentY` at viewport center, clamped to page limits. */
export function centerScrollYForContentY(contentY: number): number {
    const viewportHeight = window.innerHeight
    const maxScroll = getMaxScrollY()
    return Math.min(maxScroll, Math.max(0, contentY - viewportHeight / 2))
}

function getSectionDocumentBounds(
    element: HTMLElement,
): { startY: number; endY: number } {
    const rect = element.getBoundingClientRect()
    const startY = window.scrollY + rect.top
    return { startY, endY: startY + element.offsetHeight }
}

function resolveChapterBounds(
    sections: readonly WeightedScrollSection[],
): ChapterDocumentBounds[] {
    return sections.map(({ element, weight }) => {
        const { startY, endY } = getSectionDocumentBounds(element)
        return { element, weight, startY, endY }
    })
}

export type ContentScrollRange = {
    startY: number
    endY: number
    scrollRange: number
}

/** Document span from first chapter top through last chapter bottom. */
export function getContentScrollRange(
    sections: readonly WeightedScrollSection[],
): ContentScrollRange | null {
    const chapters = resolveChapterBounds(sections)
    if (chapters.length === 0) return null

    const startY = chapters[0]!.startY
    const endY = chapters[chapters.length - 1]!.endY
    const viewportHeight = window.innerHeight
    const scrollRange = Math.max(endY - startY - viewportHeight, 1)

    return { startY, endY, scrollRange }
}

/**
 * 0% at scroll top (clamped when first chapter starts below the fold).
 * 100% at the page’s maximum scroll — matches how far the user can actually scroll.
 */
export function measureWeightedChapterScrollProgress(
    sections: readonly WeightedScrollSection[],
): number {
    const range = getContentScrollRange(sections)
    if (!range) return 0

    const maxScroll = getMaxScrollY()
    const scrollSpan = Math.max(maxScroll - range.startY, 1)
    const progress = (window.scrollY - range.startY) / scrollSpan
    return Math.min(1, Math.max(0, progress))
}

/** Seek along first-chapter top → max scroll (0 = top, 1 = bottom of page). */
export function scrollToWeightedChapterProgress(
    sections: readonly WeightedScrollSection[],
    ratio: number,
): void {
    const range = getContentScrollRange(sections)
    if (!range) return

    const maxScroll = getMaxScrollY()
    const scrollSpan = Math.max(maxScroll - range.startY, 1)
    const clamped = Math.min(1, Math.max(0, ratio))
    const target = range.startY + clamped * scrollSpan

    window.scrollTo({ top: target, behavior: 'smooth' })
}
