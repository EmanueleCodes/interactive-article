import { Fragment, memo, useLayoutEffect, useMemo, useRef } from 'react'
import { getSegmentById, type WordTimestamp } from './narrationTypes'
import { useNarration, useSegmentPlayhead } from './NarrationContext'

type NarratedTextProps = {
    /** Matches `NarrationSegment.id` in the transcript */
    segmentId: string
    className?: string
    as?: 'p' | 'h1' | 'h2' | 'h3'
    /** When set, render only this paragraph from a multi-paragraph body segment. */
    paragraphIndex?: number
}

type WordPhase = 'upcoming' | 'active' | 'read'

type WordSpanProps = {
    word: WordTimestamp
    phase: WordPhase
}

const COLOR_TRANSITION_MS = 500
const COLOR_TRANSITION = `color ${COLOR_TRANSITION_MS}ms ease-out`

const bodyPhaseColors: Record<WordPhase, string> = {
    upcoming: '#989898',
    active: '#009dff',
    read: '#ffffff',
}

const headingPhaseColors: Record<WordPhase, string> = {
    upcoming: '#ffffff',
    active: '#009dff',
    read: '#ffffff',
}

const linkClassNames = {
    default: 'group/link no-underline',
    accent: 'group/link text-[#009dff] no-underline',
} as const

const linkWordClassNames = {
    default: '',
    accent: 'text-[#009dff]',
} as const

const WordSpan = memo(function WordSpan({
    word,
    phase,
    isHeading = false,
    inLink = false,
}: WordSpanProps & { isHeading?: boolean; inLink?: boolean }) {
    const prevPhaseRef = useRef<WordPhase | null>(null)
    const prevPhase = prevPhaseRef.current
    const fadeToRead = phase === 'read' && prevPhase === 'active'
    const fadeToUpcoming =
        phase === 'upcoming' &&
        (prevPhase === 'read' || prevPhase === 'active')
    const colorTransition = fadeToRead || fadeToUpcoming ? COLOR_TRANSITION : undefined

    useLayoutEffect(() => {
        prevPhaseRef.current = phase
    }, [phase])

    const isActive = phase === 'active'
    const colors = isHeading ? headingPhaseColors : bodyPhaseColors

    return (
        <span className={`relative ${inLink ? 'inline' : 'inline-block'}`}>
            {isActive && (
                <span
                    aria-hidden
                    className="pointer-events-none absolute -inset-x-[3px] inset-y-[2px] z-0 rounded bg-[rgba(0,157,255,0.22)]"
                />
            )}
            <span
                className={`relative z-1 ${
                    inLink
                        ? 'underline decoration-from-font underline-offset-2 decoration-current transition-colors group-hover/link:!text-[#009dff]'
                        : ''
                }`.trim()}
                style={{
                    color: colors[phase],
                    transition: colorTransition,
                }}
            >
                {word.word}
            </span>
        </span>
    )
})

const tagClassNames: Record<NonNullable<NarratedTextProps['as']>, string> = {
    p: 'text-blog-body m-0 leading-relaxed text-[#989898]',
    h1: 'text-blog-h1 m-0 text-center text-white',
    h2: 'text-blog-h2 m-0 text-white',
    h3: 'text-blog-h3 m-0 text-white',
}

function groupWordsIntoParagraphs(words: WordTimestamp[]): WordTimestamp[][] {
    const groups: WordTimestamp[][] = []
    let current: WordTimestamp[] = []

    for (const word of words) {
        if (word.breakBefore && current.length > 0) {
            groups.push(current)
            current = []
        }
        current.push(word)
    }

    if (current.length > 0) {
        groups.push(current)
    }

    return groups.length > 0 ? groups : [[]]
}

type MarkupGroup = {
    key: string
    words: WordTimestamp[]
    bold: boolean
    italic: boolean
    href?: string
    linkVariant?: 'default' | 'accent'
}

function markupGroupKey(word: WordTimestamp): string {
    if (word.href) {
        return `link:${word.href}:${word.linkVariant ?? 'default'}`
    }
    if (word.bold) return 'strong'
    if (word.italic) return 'em'
    return 'text'
}

function groupWordsByMarkup(words: WordTimestamp[]): MarkupGroup[] {
    const groups: MarkupGroup[] = []

    for (const word of words) {
        const key = markupGroupKey(word)
        const last = groups[groups.length - 1]

        if (last && last.key === key) {
            last.words.push(word)
            continue
        }

        groups.push({
            key,
            words: [word],
            bold: Boolean(word.bold),
            italic: Boolean(word.italic),
            href: word.href,
            linkVariant: word.linkVariant,
        })
    }

    return groups
}

type WordRunProps = {
    segmentId: string
    words: WordTimestamp[]
    startIndex: number
    activeIndex: number
    activeRef: React.RefObject<HTMLSpanElement | null>
    isHeading?: boolean
    isPlaying: boolean
}

const WordRun = memo(function WordRun({
    segmentId,
    words,
    startIndex,
    activeIndex,
    activeRef,
    isHeading = false,
    isPlaying,
}: WordRunProps) {
    const groups = groupWordsByMarkup(words)
    let runningIndex = startIndex

    return (
        <>
            {groups.map((group) => {
                const groupStartIndex = runningIndex

                const inner = group.words.map((word, index) => {
                    const globalIndex = groupStartIndex + index

                    const phase: WordPhase = !isPlaying
                        ? 'upcoming'
                        : globalIndex === activeIndex
                          ? 'active'
                          : activeIndex >= 0 && globalIndex < activeIndex
                            ? 'read'
                            : 'upcoming'

                    const linkVariant = group.linkVariant ?? 'default'

                    return (
                        <Fragment key={globalIndex}>
                            {globalIndex > startIndex ? ' ' : null}
                            <span
                                data-narration-word
                                data-segment-id={segmentId}
                                data-word-index={globalIndex}
                                data-word-start={word.start}
                                className={
                                    group.href
                                        ? linkWordClassNames[linkVariant]
                                        : undefined
                                }
                                ref={
                                    globalIndex === activeIndex
                                        ? activeRef
                                        : undefined
                                }
                            >
                                <WordSpan
                                    word={word}
                                    phase={phase}
                                    isHeading={isHeading}
                                    inLink={Boolean(group.href)}
                                />
                            </span>
                        </Fragment>
                    )
                })

                runningIndex += group.words.length

                if (group.href) {
                    const variant = group.linkVariant ?? 'default'
                    return (
                        <a
                            key={`${group.key}-${groupStartIndex}`}
                            href={group.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-blog-body ${linkClassNames[variant]}`.trim()}
                        >
                            {inner}
                        </a>
                    )
                }

                if (group.bold) {
                    return (
                        <strong
                            key={`${group.key}-${groupStartIndex}`}
                            className="font-semibold text-white"
                        >
                            {inner}
                        </strong>
                    )
                }

                if (group.italic) {
                    return (
                        <em key={`${group.key}-${groupStartIndex}`}>
                            {inner}
                        </em>
                    )
                }

                return (
                    <Fragment key={`${group.key}-${groupStartIndex}`}>
                        {inner}
                    </Fragment>
                )
            })}
        </>
    )
})

export function NarratedText({
    segmentId,
    className = '',
    as = 'p',
    paragraphIndex,
}: NarratedTextProps) {
    const { transcript, isPlaying } = useNarration()
    const { activeIndex } = useSegmentPlayhead(segmentId)
    const activeRef = useRef<HTMLSpanElement | null>(null)
    const segment = getSegmentById(transcript, segmentId)
    const words = segment?.words ?? []
    const paragraphs = useMemo(() => groupWordsIntoParagraphs(words), [words])

    if (!segment) {
        return null
    }

    const Tag = as
    const tagClass = `${tagClassNames[as]} ${className}`.trim()
    const multiParagraph = as === 'p' && paragraphs.length > 1
    const isHeading = as !== 'p'

    if (paragraphIndex !== undefined) {
        const paragraph = paragraphs[paragraphIndex]
        if (!paragraph) {
            return null
        }

        let startIndex = 0
        for (let i = 0; i < paragraphIndex; i++) {
            startIndex += paragraphs[i]?.length ?? 0
        }

        return (
            <p className={tagClass}>
                <WordRun
                    segmentId={segmentId}
                    words={paragraph}
                    startIndex={startIndex}
                    activeIndex={activeIndex}
                    activeRef={activeRef}
                    isHeading={false}
                    isPlaying={isPlaying}
                />
            </p>
        )
    }

    if (!multiParagraph) {
        return (
            <Tag className={tagClass}>
                <WordRun
                    segmentId={segmentId}
                    words={words}
                    startIndex={0}
                    activeIndex={activeIndex}
                    activeRef={activeRef}
                    isHeading={isHeading}
                    isPlaying={isPlaying}
                />
            </Tag>
        )
    }

    let wordOffset = 0

    return (
        <div className={`flex flex-col gap-4 ${className}`.trim()}>
            {paragraphs.map((paragraph, paragraphIndex) => {
                const startIndex = wordOffset
                wordOffset += paragraph.length

                return (
                    <p
                        key={`${segmentId}-p-${paragraphIndex}`}
                        className={tagClassNames.p}
                    >
                        <WordRun
                            segmentId={segmentId}
                            words={paragraph}
                            startIndex={startIndex}
                            activeIndex={activeIndex}
                            activeRef={activeRef}
                            isPlaying={isPlaying}
                        />
                    </p>
                )
            })}
        </div>
    )
}
