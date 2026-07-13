#!/usr/bin/env node
/**
 * Builds full-article narration transcript from whisper-timestamped JSON.
 *
 * Usage:
 *   node scripts/build-cloud-tutorial-transcript.mjs \
 *     --input whisper-out/cloud-tutorial.mp3.words.json \
 *     --output src/data/cloud-tutorial-transcript.json
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
    tokenizeParagraphs,
    alignCopyToWhisper,
} from './lib/align-canonical-copy.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const COPY_PATH = join(__dirname, '../src/data/cloud-tutorial-copy.json')

function parseArgs(argv) {
    const args = {}
    for (let i = 2; i < argv.length; i++) {
        const key = argv[i]
        if (key.startsWith('--')) {
            args[key.slice(2)] = argv[i + 1]
            i++
        }
    }
    return args
}

function normalizeToken(raw) {
    return raw.trim().toLowerCase().replace(/[.,!?;:]/g, '')
}

function extractAllWords(data) {
    const words = []
    for (const segment of data.segments ?? []) {
        for (const w of segment.words ?? []) {
            const text = (w.text ?? w.word ?? '').trim()
            if (!text) continue
            words.push({
                word: text,
                start: Number(w.start ?? 0),
                end: Number(w.end ?? w.start ?? 0),
            })
        }
    }
    return words
}

function findPhraseIndex(words, phraseTokens, minIndex = 0) {
    const target = phraseTokens.map(normalizeToken)
    for (let i = minIndex; i <= words.length - target.length; i++) {
        let match = true
        for (let j = 0; j < target.length; j++) {
            if (normalizeToken(words[i + j].word) !== target[j]) {
                match = false
                break
            }
        }
        if (match) return i
    }
    return -1
}

/** Ordered section anchors — must match spoken order in the recording */
const SECTION_ANCHORS = [
    { id: 'intro-title', phrase: ['The', 'perfect', 'cloud', 'animation'] },
    { id: 'intro-subtitle', phrase: ['A', 'breakdown'] },
    { id: 'the-idea-heading', phrase: ['The', 'idea'] },
    { id: 'the-idea', phrase: ['Chances'] },
    { id: 'idea-callout', phrase: ['I', "won't"] },
    { id: 'setup-heading', phrase: ['Set', 'up'], fromIndex: 138 },
    { id: 'setup', phrase: ['This', 'project', 'is', 'built'] },
    { id: 'framework-heading', phrase: ['The', 'framework'] },
    { id: 'framework', phrase: ['When', 'it', 'comes'] },
    { id: 'shape-heading', phrase: ['The', 'shape'] },
    { id: 'shape', phrase: ['I', 'tried'] },
    { id: 'compound-motion-heading', phrase: ['compound', 'motion'] },
    { id: 'compound-motion', phrase: ['Now', "let's"] },
    { id: 'phase-distribution-heading', phrase: ['Phase', 'distribution'] },
    { id: 'phase-distribution', phrase: ['This', 'is', 'the', 'key'] },
    { id: 'controlled-variation-heading', phrase: ['Controlled', 'variation'] },
    { id: 'controlled-variation', phrase: ['The', 'cloud', 'moves'] },
    { id: 'edge-details-heading', phrase: ['Eye', 'candy'] },
    { id: 'edge-details', phrase: ['The', 'finishing', 'touch'] },
    { id: 'svg-mode-heading', phrase: ['SVG', 'mode'] },
    { id: 'svg-mode', phrase: ['Every', 'preview'] },
    { id: 'conclusion-heading', phrase: ['The', 'principles'] },
    { id: 'conclusion-intro', phrase: ["Here's", 'the', 'final'] },
    { id: 'conclusion-body', phrase: ['Four', 'principles'] },
]

function markRange(words, start, end, props) {
    for (let i = start; i <= end && i < words.length; i++) {
        Object.assign(words[i], props)
    }
}

function markWord(words, index, props) {
    if (index >= 0 && index < words.length) {
        Object.assign(words[index], props)
    }
}

/** Pause + sentence boundary → new paragraph */
function addPauseParagraphBreaks(words, minGap = 0.75) {
    for (let i = 1; i < words.length; i++) {
        const prev = words[i - 1]
        const curr = words[i]
        const gap = curr.start - prev.end
        const prevEndsSentence = /[.!?]["']?$/.test(prev.word)
        const startsUpper = /^[A-Z]/.test(curr.word)

        if (gap >= minGap && prevEndsSentence && startsUpper) {
            curr.breakBefore = true
        }
    }
}

function enrichFramework(words) {
    for (let i = 0; i < words.length; i++) {
        if (!/^[1-6]\./.test(words[i].word) || words[i].bold) continue
        let end = i
        while (end < words.length) {
            if (/[.!?]$/.test(words[end].word)) {
                if (end > i || words[i].word.length > 3) break
            }
            end++
        }
        markRange(words, i, end, { bold: true })
    }
}

function enrichSegmentStyle(segment) {
    const { id, words } = segment
    if (words.length === 0) return

    if (id === 'framework') {
        enrichFramework(words)
        return
    }

    if (id === 'setup' || id === 'idea-callout') {
        addPauseParagraphBreaks(words)
        return
    }

    if (id.endsWith('-heading')) return

    addPauseParagraphBreaks(words)
}

function sliceSegments(words) {
    const anchors = []
    let minIndex = 0

    for (const { id, phrase, fromIndex } of SECTION_ANCHORS) {
        const searchFrom = fromIndex ?? minIndex
        const index = findPhraseIndex(words, phrase, searchFrom)
        if (index < 0) {
            throw new Error(
                `Could not find anchor for segment "${id}" (${phrase.join(' ')}) after index ${minIndex}`,
            )
        }
        anchors.push({ id, index })
        minIndex = index + 1
    }

    const segments = []
    for (let i = 0; i < anchors.length; i++) {
        const start = anchors[i].index
        const end =
            i + 1 < anchors.length ? anchors[i + 1].index : words.length
        const slice = words.slice(start, end)
        if (slice.length === 0) continue
        segments.push({ id: anchors[i].id, words: slice })
    }

    return segments
}

function applyCanonicalCopy(segments, copyById) {
    for (const segment of segments) {
        const entry = copyById[segment.id]
        if (!entry?.paragraphs?.length) continue

        const copyTokens = tokenizeParagraphs(entry.paragraphs)
        segment.words = alignCopyToWhisper(copyTokens, segment.words)
    }
}

function main() {
    const args = parseArgs(process.argv)
    const inputPath = args.input
    const outputPath =
        args.output ?? 'src/data/cloud-tutorial-transcript.json'
    const audioSrc = args.audio ?? '/audio/cloud-tutorial.mp3'

    if (!inputPath) {
        console.error('Required: --input <whisper.json>')
        process.exit(1)
    }

    const raw = JSON.parse(readFileSync(resolve(inputPath), 'utf8'))
    const copyById = JSON.parse(readFileSync(COPY_PATH, 'utf8'))
    const words = extractAllWords(raw)
    const segments = sliceSegments(words)
    applyCanonicalCopy(segments, copyById)
    for (const segment of segments) {
        enrichSegmentStyle(segment)
    }

    const transcript = {
        audioSrc,
        waveformData: [],
        segments,
    }

    const pretty = `${JSON.stringify(transcript, null, 2)}\n`
    const compact = `${JSON.stringify(transcript)}\n`

    writeFileSync(resolve(outputPath), pretty, 'utf8')
    writeFileSync(
        join(__dirname, '../public/data/cloud-tutorial-transcript.json'),
        compact,
        'utf8',
    )

    for (const seg of segments) {
        const first = seg.words[0]
        const last = seg.words[seg.words.length - 1]
        console.log(
            `${seg.id}: ${seg.words.length} words (${first.start.toFixed(1)}s–${last.end.toFixed(1)}s)`,
        )
    }
    console.log(`\nWrote ${segments.length} segments to ${outputPath}`)
}

main()
