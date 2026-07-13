# Interactive Article Starter

A starter repo for building interactive narrated articles with synced audio, word highlighting, checkpoints, and a magic cursor.

This repo includes a complete example article: the cloud animation tutorial from Emanuele's portfolio. The cloud is just the demo content; the reusable pieces are the narration system, transcript format, audio player, magic cursor, and checkpoint/highlight flow.

## What is included

- `src/components/blog/NarrationContext.tsx` manages audio playback, seeking, checkpoints, and the shared playhead.
- `src/components/blog/NarratedText.tsx` renders transcript segments with word-by-word highlighting.
- `src/components/blog/AudioPlayer.tsx` renders the fixed playback bar, waveform, speed controls, magic cursor toggle, and checkpoint toggle.
- `src/components/blog/MagicCursor.tsx` adds click-to-seek word interactions.
- `src/components/blog/useCheckpointHighlight.ts` highlights code blocks when playback reaches a checkpoint.
- `src/App.tsx` is the example article implementation.
- `public/data/cloud-tutorial-transcript.json` is the generated transcript used by the app.
- `public/audio/cloud-tutorial.mp3` is the example narration audio.
- `scripts/build-cloud-tutorial-transcript.mjs` and `scripts/lib/align-canonical-copy.mjs` show the transcript generation pipeline.

## Run locally

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

## How the sync works

The app loads a transcript shaped like this:

```json
{
  "audioSrc": "/audio/cloud-tutorial.mp3",
  "segments": [
    {
      "id": "intro-title",
      "words": [
        { "word": "The", "start": 0.08, "end": 0.18 }
      ]
    }
  ]
}
```

`NarrationProvider` owns the audio element and polls `audio.currentTime` with `requestAnimationFrame` while playing. Individual text segments subscribe to the active word instead of re-rendering on every frame.

## Add your own article

1. Write your article as named segments.
2. Record narration in the same order.
3. Generate word-level timestamps with Whisper or another transcription tool.
4. Build a transcript JSON with segment IDs and word timings.
5. Render each segment with `<NarratedText segmentId="..." />`.
6. Wrap the page in `<NarrationProvider transcript={transcript}>`.
7. Add `<AudioPlayer />` and, optionally, `<MagicCursor />`.

## Checkpoints

Pass `checkpointAfterSegmentIds` to `NarrationProvider` to pause playback after specific segments. Components such as `InteractiveCodeSnippet` and `PackageManagerCodeBox` can receive `checkpointAfterSegmentId` to glow when the relevant checkpoint is reached.

## Repo description

Use this for GitHub:

> A starter repo for building interactive narrated articles with synced audio, word highlighting, checkpoints, and a magic cursor.
