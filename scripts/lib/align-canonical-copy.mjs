/**
 * Aligns authored copy tokens to whisper word timings for display + highlight sync.
 */

export function normalizeToken(raw) {
    return raw
        .trim()
        .toLowerCase()
        .replace(/['']/g, "'")
        .replace(/[.,!?;:()[\]"“”]/g, '')
}

function tokenKey(raw) {
    return normalizeToken(raw).replace(/\s+/g, '')
}

/** Canonical copy vs ASR pronunciation mismatches (display copy wins). */
const TOKEN_ALIASES = {
    vercel: ['versatile'],
    versatile: ['vercel'],
}

function aliasTokenMatch(copyKey, whisperKey) {
    return (
        TOKEN_ALIASES[copyKey]?.includes(whisperKey) ||
        TOKEN_ALIASES[whisperKey]?.includes(copyKey)
    )
}

function tokensMatch(copyKey, whisperKey) {
    return (
        copyKey === whisperKey ||
        fuzzyTokenMatch(copyKey, whisperKey) ||
        aliasTokenMatch(copyKey, whisperKey)
    )
}

function fuzzyTokenMatch(copyKey, whisperKey) {
    if (!copyKey || !whisperKey) return false
    if (copyKey === whisperKey) return true
    if (copyKey.length >= 4 && whisperKey.length >= 4) {
        if (copyKey.includes(whisperKey) || whisperKey.includes(copyKey)) {
            return true
        }
        let mismatches = 0
        const len = Math.min(copyKey.length, whisperKey.length)
        for (let i = 0; i < len; i++) {
            if (copyKey[i] !== whisperKey[i]) mismatches++
            if (mismatches > 2) return false
        }
        return mismatches <= 2 && Math.abs(copyKey.length - whisperKey.length) <= 3
    }
    return false
}

/**
 * @param {import('./align-canonical-copy.mjs').CopyPart} part
 */
function tokenizePart(part) {
    const content = part.content.trim()
    if (!content) return []

    if (part.type === 'link' || part.type === 'accent') {
        return [
            {
                word: content,
                href: part.href ?? '#',
                linkVariant: part.type === 'accent' ? 'accent' : 'default',
            },
        ]
    }

    const words = content.split(/\s+/).filter(Boolean)

    if (part.type === 'strong') {
        return words.map((word) => ({ word, bold: true }))
    }

    if (part.type === 'em') {
        return words.map((word) => ({ word, italic: true }))
    }

    return words.map((word) => ({ word }))
}

/**
 * @param {{ parts: { type: string, content: string, href?: string }[] }} paragraph
 */
function tokenizeStructuredParagraph(paragraph) {
    const tokens = []
    for (const part of paragraph.parts ?? []) {
        tokens.push(...tokenizePart(part))
    }
    return tokens
}

/**
 * @param {(string | { parts: object[] })[]} paragraphs
 */
export function tokenizeParagraphs(paragraphs) {
    const tokens = []
    for (const paragraph of paragraphs) {
        const partTokens =
            typeof paragraph === 'string'
                ? tokenizePart({ type: 'text', content: paragraph })
                : tokenizeStructuredParagraph(paragraph)

        for (let i = 0; i < partTokens.length; i++) {
            tokens.push({
                ...partTokens[i],
                ...(i === 0 && tokens.length > 0 ? { breakBefore: true } : {}),
            })
        }
    }
    return tokens
}

/**
 * @param {{ word: string }[]} copyTokens
 * @param {{ word: string, start: number, end: number }[]} whisperWords
 */
export function alignCopyToWhisper(copyTokens, whisperWords) {
    const aligned = []
    let wi = 0

    for (let ci = 0; ci < copyTokens.length; ci++) {
        const copy = copyTokens[ci]
        const ck = tokenKey(copy.word)

        let match = null
        for (let j = wi; j < Math.min(wi + 10, whisperWords.length); j++) {
            const single = tokenKey(whisperWords[j].word)
            if (tokensMatch(ck, single)) {
                match = {
                    start: whisperWords[j].start,
                    end: whisperWords[j].end,
                    nextWi: j + 1,
                }
                break
            }

            let acc = ''
            for (let k = j; k < Math.min(j + 8, whisperWords.length); k++) {
                acc += tokenKey(whisperWords[k].word)
                if (acc === ck || tokensMatch(ck, acc)) {
                    match = {
                        start: whisperWords[j].start,
                        end: whisperWords[k].end,
                        nextWi: k + 1,
                    }
                    break
                }
                if (acc.length > ck.length + 6) break
            }
            if (match) break
        }

        const prev = aligned[aligned.length - 1]

        if (match) {
            aligned.push({
                ...copy,
                start: match.start,
                end: match.end,
            })
            wi = match.nextWi
            continue
        }

        // Deliberate copy/ASR label drift (e.g. Vercel vs versatile) — keep copy text,
        // take the next Whisper timing so later words do not jump forward.
        if (wi < whisperWords.length) {
            const whisper = whisperWords[wi]
            const wk = tokenKey(whisper.word)
            const prefixMismatch =
                ck.length >= 4 &&
                wk.length >= 4 &&
                ck.slice(0, 3) === wk.slice(0, 3)
            if (aliasTokenMatch(ck, wk) || prefixMismatch) {
                aligned.push({
                    ...copy,
                    start: whisper.start,
                    end: whisper.end,
                })
                wi++
                continue
            }
        }

        let nextMatchStart = null
        let nextWi = wi
        for (let j = wi; j < whisperWords.length; j++) {
            const probe = copyTokens[ci + 1]
            if (!probe) break
            const pk = tokenKey(probe.word)
            const single = tokenKey(whisperWords[j].word)
            if (tokensMatch(pk, single)) {
                nextMatchStart = whisperWords[j].start
                nextWi = j
                break
            }
        }

        const start = prev?.end ?? whisperWords[wi]?.start ?? 0
        const end =
            nextMatchStart != null
                ? nextMatchStart
                : start + 0.12

        aligned.push({
            ...copy,
            start,
            end: Math.max(start + 0.06, end),
        })

        if (nextMatchStart == null && wi < whisperWords.length) {
            wi++
        } else if (nextWi > wi) {
            wi = nextWi
        }
    }

    return bridgeWordGaps(aligned)
}

/** Extend each word's active window through pauses until the next word starts. */
export function bridgeWordGaps(words) {
    if (words.length === 0) return words

    const bridged = words.map((w) => ({ ...w }))

    for (let i = 0; i < bridged.length; i++) {
        const next = bridged[i + 1]
        if (next) {
            bridged[i].end = Math.max(bridged[i].end, next.start)
        } else {
            bridged[i].end = Math.max(bridged[i].end, bridged[i].start + 0.12)
        }
    }

    for (let i = 1; i < bridged.length; i++) {
        if (bridged[i].start < bridged[i - 1].end) {
            bridged[i].start = bridged[i - 1].end
        }
        if (bridged[i].end <= bridged[i].start) {
            bridged[i].end = bridged[i].start + 0.06
        }
    }

    return bridged
}
