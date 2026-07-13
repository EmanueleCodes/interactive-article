import { BLOG_PHASE_WAVE } from '@/components/blog/blogPhaseWavePalette'

/** Opacity tiers for syntax tokens (0–1). */
export const BLOG_CODE_OPACITY = {
    keyword: 1,
    type: 1,
    identifier: 0.92,
    literal: 0.95,
    default: 0.82,
    muted: 0.82,
    comment: 0.62,
    dim: 0.5,
} as const

export type BlogCodeColorToken = {
    hex: string
    opacity: number
}

export function toBlogCodeCssColor(hex: string, opacity: number): string {
    if (opacity >= 0.999) return hex

    const normalized =
        hex.length === 4
            ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
            : hex.slice(0, 7)

    const r = Number.parseInt(normalized.slice(1, 3), 16)
    const g = Number.parseInt(normalized.slice(3, 5), 16)
    const b = Number.parseInt(normalized.slice(5, 7), 16)

    return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

function token(hex: string, opacity: number): BlogCodeColorToken {
    return { hex, opacity }
}

/**
 * Cursor Dark foreground → phase-wave palette with intermediate hues.
 * Keywords: cream yellow. Types: sky/mid blue. Names: blush/mist. Strings: apricot. Numbers: coral.
 */
export const CURSOR_TO_BLOG_COLOR: Record<string, BlogCodeColorToken> = {
    '#83d6c5': token(BLOG_PHASE_WAVE.keywordYellow, BLOG_CODE_OPACITY.keyword),
    '#82d2ce': token(BLOG_PHASE_WAVE.keywordYellow, BLOG_CODE_OPACITY.keyword),
    '#a8cc7c': token(BLOG_PHASE_WAVE.keywordYellow, BLOG_CODE_OPACITY.keyword),
    '#87c3ff': token(BLOG_PHASE_WAVE.midBlue, BLOG_CODE_OPACITY.type),
    '#94c1fa': token(BLOG_PHASE_WAVE.skyBlue, BLOG_CODE_OPACITY.type),
    '#f8c762': token(BLOG_PHASE_WAVE.apricot, BLOG_CODE_OPACITY.literal),
    '#fad075': token(BLOG_PHASE_WAVE.apricot, BLOG_CODE_OPACITY.literal),
    '#ebc88d': token(BLOG_PHASE_WAVE.coral, BLOG_CODE_OPACITY.literal),
    '#e3c893': token(BLOG_PHASE_WAVE.apricot, BLOG_CODE_OPACITY.literal),
    '#efb080': token(BLOG_PHASE_WAVE.coral, BLOG_CODE_OPACITY.identifier),
    '#aa9bf5': token(BLOG_PHASE_WAVE.blush, BLOG_CODE_OPACITY.identifier),
    '#aaa0fa': token(BLOG_PHASE_WAVE.mist, BLOG_CODE_OPACITY.identifier),
    '#e394dc': token(BLOG_PHASE_WAVE.apricot, BLOG_CODE_OPACITY.literal),
    '#af9cff': token(BLOG_PHASE_WAVE.skyBlue, BLOG_CODE_OPACITY.identifier),
    '#cc7c8a': token(BLOG_PHASE_WAVE.coral, BLOG_CODE_OPACITY.default),
    '#c1808a': token(BLOG_PHASE_WAVE.apricot, BLOG_CODE_OPACITY.muted),
    '#d6d6dd': token(BLOG_PHASE_WAVE.slate, BLOG_CODE_OPACITY.muted),
    '#d1d1d1': token(BLOG_PHASE_WAVE.slate, BLOG_CODE_OPACITY.muted),
    '#d8dee9': token(BLOG_PHASE_WAVE.blush, BLOG_CODE_OPACITY.default),
    '#cccccc': token(BLOG_PHASE_WAVE.slate, BLOG_CODE_OPACITY.muted),
    '#898989': token(BLOG_PHASE_WAVE.slate, BLOG_CODE_OPACITY.comment),
    '#6d6d6d': token(BLOG_PHASE_WAVE.slate, BLOG_CODE_OPACITY.dim),
    '#f44747': token(BLOG_PHASE_WAVE.coral, BLOG_CODE_OPACITY.keyword),
}

export function remapCursorForeground(color: string): string {
    const normalized = color.length === 9 ? color.slice(0, 7) : color
    const key = normalized.toLowerCase()
    const mapped = CURSOR_TO_BLOG_COLOR[key]

    if (mapped) {
        return toBlogCodeCssColor(mapped.hex, mapped.opacity)
    }

    return color
}
