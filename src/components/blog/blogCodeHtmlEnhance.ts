import { BLOG_PHASE_WAVE } from '@/components/blog/blogPhaseWavePalette'
import {
    BLOG_CODE_OPACITY,
    toBlogCodeCssColor,
} from '@/components/blog/blogCodeThemeScales'

const PROPERTY_KEY_STYLE = `color:${toBlogCodeCssColor(BLOG_PHASE_WAVE.skyBlue, BLOG_CODE_OPACITY.type)}`
const PROPERTY_COLON_STYLE = `color:${toBlogCodeCssColor(BLOG_PHASE_WAVE.slate, 0.9)}`
const UPPER_CONST_STYLE = `color:${toBlogCodeCssColor(BLOG_PHASE_WAVE.mist, BLOG_CODE_OPACITY.identifier)}`
const DEFAULT_WHITE_PATTERN = /255,\s*255,\s*255/

/**
 * Shiki often leaves `propertyName: ` inside a single default-white span.
 * Split keys out so object/config snippets get readable hue separation.
 */
function tintPropertyKeys(html: string): string {
    return html.replace(
        /<span style="([^"]*)">(\s*)([A-Za-z_][\w]*)(: )<\/span>/g,
        (match, style, indent, key, colon) => {
            if (!DEFAULT_WHITE_PATTERN.test(style)) return match

            return `<span style="${style}">${indent}</span><span style="${PROPERTY_KEY_STYLE}">${key}</span><span style="${PROPERTY_COLON_STYLE}">${colon}</span>`
        },
    )
}

/** `BLOB_COUNT`-style names often share the same color as locals — nudge to mist blue. */
function tintUpperConstants(html: string): string {
    return html.replace(
        /<span style="([^"]*)">(\s*)([A-Z][A-Z0-9_]+)<\/span>/g,
        (match, style, indent, name) => {
            if (!style.includes('255, 232, 196')) return match

            return `<span style="${style}">${indent}</span><span style="${UPPER_CONST_STYLE}">${name}</span>`
        },
    )
}

export function enhanceBlogCodeHtml(html: string): string {
    return tintUpperConstants(tintPropertyKeys(html))
}
