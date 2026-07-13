# Tutorial narration audio

Place the full article narration here:

- `cloud-tutorial.mp3` (referenced as `/audio/cloud-tutorial.mp3` in the transcript)

## Generate word timestamps (full article)

Requires `ffmpeg` on your PATH and `whisper-timestamped`:

```bash
pip install whisper-timestamped
whisper_timestamped public/audio/cloud-tutorial.mp3 --model base --language en --output_format json -o whisper-out
node scripts/build-cloud-tutorial-transcript.mjs \
  --input whisper-out/cloud-tutorial.mp3.words.json \
  --output src/data/cloud-tutorial-transcript.json
```

This builds **24 narrated segments** (headings + body per chapter) with absolute timestamps for the full ~6.5 minute recording.

## Authoritative copy (what appears on screen)

Edit [`src/data/cloud-tutorial-copy.json`](../../src/data/cloud-tutorial-copy.json) with the exact text you want readers to see. Use plain strings per paragraph, or structured `parts` for **bold** (`strong`), *italic* (`em`), links (`link` / `accent`), and multi-word links (e.g. one `TanStack Start` token). Re-run the build script above to align copy to Whisper timings. You do not need to change the MP3 unless the spoken order changes.

## Single-segment export (legacy)

```bash
node scripts/whisper-to-transcript.mjs \
  --input whisper-out/cloud-tutorial.mp3.words.json \
  --audio /audio/cloud-tutorial.mp3 \
  --segment the-idea \
  --output src/data/cloud-tutorial-transcript.json
```
