/** Supported narration speeds (pitch-preserved via `HTMLMediaElement.preservesPitch`). */
export const NARRATION_PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 1.75, 2] as const

export type NarrationPlaybackRate = (typeof NARRATION_PLAYBACK_RATES)[number]

const STORAGE_KEY = 'narration-playback-rate'

export function isNarrationPlaybackRate(
    value: number,
): value is NarrationPlaybackRate {
    return (NARRATION_PLAYBACK_RATES as readonly number[]).includes(value)
}

export function readStoredPlaybackRate(): NarrationPlaybackRate {
    if (typeof window === 'undefined') return 1
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return 1
    const parsed = Number.parseFloat(raw)
    return isNarrationPlaybackRate(parsed) ? parsed : 1
}

export function storePlaybackRate(rate: NarrationPlaybackRate) {
    try {
        window.localStorage.setItem(STORAGE_KEY, String(rate))
    } catch {
        /* quota / private mode */
    }
}

export function nextPlaybackRate(
    current: NarrationPlaybackRate,
): NarrationPlaybackRate {
    const idx = NARRATION_PLAYBACK_RATES.indexOf(current)
    const next =
        NARRATION_PLAYBACK_RATES[(idx + 1) % NARRATION_PLAYBACK_RATES.length]
    return next ?? 1
}

export function stepPlaybackRate(
    current: NarrationPlaybackRate,
    direction: 'up' | 'down',
): NarrationPlaybackRate {
    const idx = NARRATION_PLAYBACK_RATES.indexOf(current)
    if (idx < 0) return 1

    if (direction === 'up') {
        return (
            NARRATION_PLAYBACK_RATES[
                Math.min(idx + 1, NARRATION_PLAYBACK_RATES.length - 1)
            ] ?? current
        )
    }

    return NARRATION_PLAYBACK_RATES[Math.max(idx - 1, 0)] ?? current
}

export function formatPlaybackRateLabel(rate: number): string {
    const text = Number.isInteger(rate) ? String(rate) : String(rate)
    return `${text}×`
}

/** Widest speed label — chip width is pinned to this so ± hover does not resize it. */
export const WIDEST_PLAYBACK_RATE_LABEL = NARRATION_PLAYBACK_RATES.map(
    formatPlaybackRateLabel,
).reduce((longest, label) => (label.length > longest.length ? label : longest))

/** Keep timestretch from shifting pitch (chipmunk / slow-mo voice). */
export function applyAudioPlaybackRate(
    audio: HTMLMediaElement,
    rate: NarrationPlaybackRate,
) {
    audio.playbackRate = rate
    audio.defaultPlaybackRate = rate
    audio.preservesPitch = true

    const legacy = audio as HTMLMediaElement & {
        mozPreservesPitch?: boolean
        webkitPreservesPitch?: boolean
    }
    legacy.mozPreservesPitch = true
    legacy.webkitPreservesPitch = true
}
