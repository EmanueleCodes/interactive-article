export interface WordTimestamp {
    word: string
    start: number
    end: number
    /** When set, word renders as a link */
    href?: string
    /** `accent` = blue BlogAccentLink; default = BlogLink */
    linkVariant?: 'default' | 'accent'
    /** Start a new paragraph before this word */
    breakBefore?: boolean
    /** Step labels, emphasis */
    bold?: boolean
    /** Inline emphasis (e.g. “feels right”) */
    italic?: boolean
}

export interface NarrationSegment {
    id: string
    words: WordTimestamp[]
}

export interface NarrationTranscript {
    audioSrc: string
    /** Normalized amplitude peaks in [0, 1], ~100–200 samples */
    waveformData: number[]
    segments: NarrationSegment[]
    /** Override mock/demo duration (seconds); defaults to last word end + padding */
    demoDuration?: number
    /**
     * When Checkpoints mode is on, playback pauses at the end of each listed
     * segment (e.g. body copy immediately before a code block).
     */
    checkpointAfterSegmentIds?: readonly string[]
}

/** Total narration length derived from word timestamps */
export function getTranscriptDuration(transcript: NarrationTranscript): number {
    if (transcript.demoDuration != null && transcript.demoDuration > 0) {
        return transcript.demoDuration
    }

    let maxEnd = 0
    for (const segment of transcript.segments) {
        for (const word of segment.words) {
            maxEnd = Math.max(maxEnd, word.end)
        }
    }

    return maxEnd > 0 ? maxEnd + 0.35 : 0
}

/** End of the highlight window for word `i` (extends through pauses until the next word). */
export function getWordHighlightEnd(
    words: WordTimestamp[],
    index: number,
): number {
    const word = words[index]
    if (!word) return 0
    const next = words[index + 1]
    return next ? next.start : word.end + 0.15
}

export function getActiveWordIndex(
    words: WordTimestamp[],
    currentTime: number,
): number {
    if (words.length === 0) return -1

    for (let i = 0; i < words.length; i++) {
        if (
            currentTime >= words[i].start &&
            currentTime < getWordHighlightEnd(words, i)
        ) {
            return i
        }
    }

    const last = words[words.length - 1]
    if (currentTime >= last.start && currentTime < last.end + 0.35) {
        return words.length - 1
    }

    return -1
}

/** When a word should switch from active/upcoming to read. */
export function isWordRead(
    words: WordTimestamp[],
    index: number,
    currentTime: number,
): boolean {
    return currentTime >= getWordHighlightEnd(words, index)
}

export function getSegmentById(
    transcript: NarrationTranscript,
    segmentId: string,
): NarrationSegment | undefined {
    return transcript.segments.find((s) => s.id === segmentId)
}

export type CheckpointStop = {
    segmentId: string
    /** Pause when playback reaches this time (end of narrated segment). */
    pauseTime: number
    /** Resume playback from here (start of content after the checkpoint). */
    resumeTime: number
}

/** Time to continue from after finishing a checkpoint segment (next segment or just after pause). */
export function getResumeTimeAfterSegment(
    transcript: NarrationTranscript,
    segmentId: string,
): number {
    const index = transcript.segments.findIndex((s) => s.id === segmentId)
    if (index < 0) return 0

    const segment = transcript.segments[index]
    if (!segment || segment.words.length === 0) return 0

    const lastIndex = segment.words.length - 1
    const pauseTime = getWordHighlightEnd(segment.words, lastIndex)
    const fallback = pauseTime + 0.05

    for (let i = index + 1; i < transcript.segments.length; i++) {
        const words = transcript.segments[i]?.words
        if (!words || words.length === 0) continue
        const start = words[0].start
        if (start > pauseTime + 0.02) return start
    }

    /** Segments can be out of time order in the JSON — pick the earliest start after pause. */
    let nextStart: number | null = null
    for (const seg of transcript.segments) {
        const words = seg.words
        if (!words || words.length === 0) continue
        const start = words[0].start
        if (start > pauseTime + 0.02) {
            nextStart =
                nextStart == null ? start : Math.min(nextStart, start)
        }
    }

    return nextStart ?? fallback
}

export function getCheckpointStops(
    transcript: NarrationTranscript,
    segmentIds: readonly string[],
): CheckpointStop[] {
    const stops: CheckpointStop[] = []

    for (const id of segmentIds) {
        const segment = getSegmentById(transcript, id)
        if (!segment || segment.words.length === 0) continue
        const lastIndex = segment.words.length - 1
        const pauseTime = getWordHighlightEnd(segment.words, lastIndex)
        stops.push({
            segmentId: id,
            pauseTime,
            resumeTime: Math.max(
                getResumeTimeAfterSegment(transcript, id),
                pauseTime + 0.05,
            ),
        })
    }

    return stops.sort((a, b) => a.pauseTime - b.pauseTime)
}

/** Pause times (seconds) at the end of each checkpoint segment’s last word. */
export function getCheckpointTimes(
    transcript: NarrationTranscript,
    segmentIds: readonly string[],
): number[] {
    return getCheckpointStops(transcript, segmentIds).map((stop) => stop.pauseTime)
}
