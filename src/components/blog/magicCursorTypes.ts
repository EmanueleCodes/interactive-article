/** Combine a hex (or rgb) color with opacity for the word-hover pill. */
export function magicCursorWordHoverBackground(
    color: string,
    opacity: number,
): string {
    const trimmed = color.trim()
    if (trimmed.startsWith('rgba(') || trimmed.startsWith('rgb(')) {
        return trimmed
    }

    const hex = trimmed.replace(/^#/, '')
    const full =
        hex.length === 3
            ? hex
                  .split('')
                  .map((c) => c + c)
                  .join('')
            : hex

    if (full.length !== 6 || !/^[0-9a-f]{6}$/i.test(full)) {
        return `rgba(0,157,255,${opacity})`
    }

    const r = Number.parseInt(full.slice(0, 2), 16)
    const g = Number.parseInt(full.slice(2, 4), 16)
    const b = Number.parseInt(full.slice(4, 6), 16)
    return `rgba(${r},${g},${b},${opacity})`
}

export const MAGIC_CURSOR_WORD_HOVER = {
    color: '#009dff',
    opacity: 0.4,
} as const

export const MAGIC_CURSOR_WORD_HOVER_BACKGROUND = magicCursorWordHoverBackground(
    MAGIC_CURSOR_WORD_HOVER.color,
    MAGIC_CURSOR_WORD_HOVER.opacity,
)

/** Mark UI that should keep native pointer + cursors (player, sliders, code). */
export const MAGIC_CURSOR_IGNORE_ATTR = 'data-magic-cursor-ignore'
export const MAGIC_CURSOR_IGNORE_SELECTOR = `[${MAGIC_CURSOR_IGNORE_ATTR}]`
