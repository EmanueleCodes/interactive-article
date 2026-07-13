export type TrackGapUnit = { type: 'gap' }

export type TrackContentUnit = {
    type: 'content'
    chapterIndex: number
    /** Index within this chapter's allocated units (for peaks / stagger) */
    unitInChapter: number
}

export type TrackUnit = TrackGapUnit | TrackContentUnit

export type ChapterUnitAllocation = {
    chapterUnits: number[]
    totalUnits: number
}

/**
 * Split `totalSlots` into chapter unit counts by text weight (largest remainder).
 * Each chapter gets at least `minUnitsPerChapter` when possible.
 */
export function allocateChapterUnits(
    weights: readonly number[],
    totalSlots: number,
    minUnitsPerChapter = 2,
): ChapterUnitAllocation {
    const chapterCount = weights.length
    const contentSlots = totalSlots

    if (contentSlots < chapterCount * minUnitsPerChapter) {
        throw new Error(
            `Not enough slots (${totalSlots}) for ${chapterCount} chapters with ${minUnitsPerChapter} units each.`,
        )
    }

    const totalWeight = weights.reduce((sum, w) => sum + w, 0) || 1
    const distributable = contentSlots - chapterCount * minUnitsPerChapter

    const rawExtras = weights.map(
        (w) => (w / totalWeight) * distributable,
    )
    const flooredExtras = rawExtras.map((r) => Math.floor(r))
    let remainder =
        distributable - flooredExtras.reduce((sum, n) => sum + n, 0)

    const order = rawExtras
        .map((r, i) => ({ i, frac: r - Math.floor(r) }))
        .sort((a, b) => b.frac - a.frac)

    const extras = [...flooredExtras]
    for (const { i } of order) {
        if (remainder <= 0) break
        extras[i] += 1
        remainder -= 1
    }

    const chapterUnits = weights.map(
        (_, i) => minUnitsPerChapter + (extras[i] ?? 0),
    )

    return {
        chapterUnits,
        totalUnits: chapterUnits.reduce((sum, n) => sum + n, 0),
    }
}

/** Concatenate chapter content units into one continuous track (no gap spacers). */
export function buildChapterTrack(
    weights: readonly number[],
    totalSlots: number,
): TrackUnit[] {
    const { chapterUnits } = allocateChapterUnits(weights, totalSlots)
    const units: TrackUnit[] = []

    chapterUnits.forEach((count, chapterIndex) => {
        for (let unitInChapter = 0; unitInChapter < count; unitInChapter++) {
            units.push({
                type: 'content',
                chapterIndex,
                unitInChapter,
            })
        }
    })

    return units
}

export type ChapterTrackSpan = {
    chapterIndex: number
    startPx: number
    widthPx: number
}

/** Pixel span of each chapter segment on the progress track. */
export function getChapterTrackSpans(
    track: readonly TrackUnit[],
    unitSlotSize = 6,
): ChapterTrackSpan[] {
    const spans: ChapterTrackSpan[] = []
    let px = 0
    let currentChapter = -1
    let spanStart = 0

    for (const unit of track) {
        if (unit.type === 'gap') continue

        if (unit.chapterIndex !== currentChapter) {
            if (currentChapter >= 0) {
                const span = spans[currentChapter]
                if (span) span.widthPx = px - spanStart
            }
            currentChapter = unit.chapterIndex
            spanStart = px
            spans[currentChapter] = {
                chapterIndex: currentChapter,
                startPx: spanStart,
                widthPx: 0,
            }
        }
        px += unitSlotSize
    }

    if (currentChapter >= 0) {
        const span = spans[currentChapter]
        if (span) span.widthPx = px - spanStart
    }

    return spans.filter((s): s is ChapterTrackSpan => s != null)
}

/** Idle track — round the outer ends of the first/last bar only. */
export function getChapterIdleBorderRadius(
    barIndex: number,
    barCount: number,
    barHeightPx = 4,
): string {
    if (barCount <= 0) return '0px'

    const radius = barHeightPx / 2

    if (barCount === 1) return `${radius}px`
    if (barIndex === 0) return `${radius}px 0 0 ${radius}px`
    if (barIndex === barCount - 1) return `0 ${radius}px ${radius}px 0`
    return '0px'
}
