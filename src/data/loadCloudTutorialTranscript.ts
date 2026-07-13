import type { NarrationTranscript } from '@/components/blog/narrationTypes'

const TRANSCRIPT_URL = '/data/cloud-tutorial-transcript.json'

let cached: Promise<NarrationTranscript> | null = null

export function loadCloudTutorialTranscript(): Promise<NarrationTranscript> {
    if (!cached) {
        cached = fetch(TRANSCRIPT_URL).then(async (res) => {
            if (!res.ok) {
                throw new Error(`Failed to load narration transcript (${res.status})`)
            }
            return (await res.json()) as NarrationTranscript
        })
    }
    return cached
}
