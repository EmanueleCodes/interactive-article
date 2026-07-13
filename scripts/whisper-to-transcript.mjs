#!/usr/bin/env node
/**
 * Converts whisper-timestamped JSON output into NarrationTranscript format.
 *
 * Usage:
 *   node scripts/whisper-to-transcript.mjs \
 *     --input whisper-out.json \
 *     --audio /audio/cloud-tutorial.mp3 \
 *     --segment the-idea \
 *     --output src/data/cloud-tutorial-transcript.json
 *
 * Optional: pass --waveform path/to/peaks.json (array of numbers 0–1)
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

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

function normalizeWord(raw) {
    return raw.trim()
}

function extractWordsFromWhisper(data) {
    const segments = data.segments ?? data.transcription ?? []
    const words = []

    for (const segment of segments) {
        const segmentWords = segment.words ?? []
        for (const w of segmentWords) {
            const text = normalizeWord(w.text ?? w.word ?? '')
            if (!text) continue
            words.push({
                word: text,
                start: Number(w.start ?? w.timestamp?.[0] ?? 0),
                end: Number(w.end ?? w.timestamp?.[1] ?? w.start ?? 0),
            })
        }
    }

    if (words.length === 0 && Array.isArray(data.words)) {
        for (const w of data.words) {
            words.push({
                word: normalizeWord(w.word ?? w.text),
                start: Number(w.start),
                end: Number(w.end),
            })
        }
    }

    return words
}

function defaultWaveform(count = 120) {
    const peaks = []
    for (let i = 0; i < count; i++) {
        const t = i / count
        peaks.push(
            Math.min(
                1,
                0.2 +
                    0.5 * Math.abs(Math.sin(t * Math.PI * 6)) +
                    0.3 * Math.random(),
            ),
        )
    }
    return peaks.map((v) => Math.round(v * 1000) / 1000)
}

function main() {
    const args = parseArgs(process.argv)
    const inputPath = args.input
    const outputPath = args.output
    const audioSrc = args.audio ?? '/audio/cloud-tutorial.mp3'
    const segmentId = args.segment ?? 'the-idea'

    if (!inputPath || !outputPath) {
        console.error(
            'Required: --input <whisper.json> --output <transcript.json>',
        )
        process.exit(1)
    }

    const raw = JSON.parse(readFileSync(resolve(inputPath), 'utf8'))
    const words = extractWordsFromWhisper(raw)

    let waveformData = defaultWaveform()
    if (args.waveform) {
        waveformData = JSON.parse(
            readFileSync(resolve(args.waveform), 'utf8'),
        )
    }

    const transcript = {
        audioSrc,
        waveformData,
        segments: [{ id: segmentId, words }],
    }

    writeFileSync(
        resolve(outputPath),
        `${JSON.stringify(transcript, null, 2)}\n`,
        'utf8',
    )
    console.log(
        `Wrote ${words.length} words to ${outputPath} (segment: ${segmentId})`,
    )
}

main()
