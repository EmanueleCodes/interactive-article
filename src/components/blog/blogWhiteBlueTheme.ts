import type { ThemeRegistration } from 'shiki'
import { applyBoldToTokenColors } from '@/components/blog/blogCodeBoldTokens'
import { BLOG_PHASE_WAVE } from '@/components/blog/blogPhaseWavePalette'
import {
    BLOG_CODE_OPACITY,
    remapCursorForeground,
    toBlogCodeCssColor,
} from '@/components/blog/blogCodeThemeScales'
import cursorDarkJson from '@/components/blog/cursor-dark.json'
import { cursorDarkTheme } from '@/components/blog/cursorDarkTheme'

type TokenColor = NonNullable<ThemeRegistration['tokenColors']>[number]

type SemanticTokenColorValue =
    | string
    | { foreground?: string; fontStyle?: string }

type SemanticTokenColors = Record<string, SemanticTokenColorValue>

function remapTokenSettings(
    settings: TokenColor['settings'],
): TokenColor['settings'] {
    if (!settings || typeof settings !== 'object') return settings

    const next = { ...settings }

    if (typeof next.foreground === 'string') {
        next.foreground = remapCursorForeground(next.foreground)
    }

    if (typeof next.background === 'string') {
        next.background = remapCursorForeground(next.background)
    }

    return next
}

function remapTokenColors(
    tokenColors: ThemeRegistration['tokenColors'],
): ThemeRegistration['tokenColors'] {
    return applyBoldToTokenColors(tokenColors, remapTokenSettings)
}

function remapSemanticEntry(
    value: SemanticTokenColorValue,
): SemanticTokenColorValue {
    if (typeof value === 'string') {
        return remapCursorForeground(value)
    }

    return {
        ...value,
        foreground:
            typeof value.foreground === 'string'
                ? remapCursorForeground(value.foreground)
                : value.foreground,
    }
}

function remapSemanticTokenColors(
    semantic: ThemeRegistration['semanticTokenColors'],
): ThemeRegistration['semanticTokenColors'] {
    if (!semantic) return semantic

    return Object.fromEntries(
        Object.entries(semantic as SemanticTokenColors).map(([key, value]) => [
            key,
            remapSemanticEntry(value),
        ]),
    ) as ThemeRegistration['semanticTokenColors']
}

/**
 * Blog article syntax theme — phase-wave palette (blue / peach / coral / white).
 * Switch back via `BLOG_SHIKI_THEME_ID` in `shiki.ts`.
 */
export const blogPhaseWaveTheme: ThemeRegistration = {
    ...cursorDarkTheme,
    name: 'blog-phase-wave',
    colors: {
        ...cursorDarkTheme.colors,
        'editor.background': '#1b1b1b',
        'editor.foreground': toBlogCodeCssColor(
            BLOG_PHASE_WAVE.white,
            BLOG_CODE_OPACITY.default,
        ),
    },
    semanticTokenColors: remapSemanticTokenColors(
        cursorDarkTheme.semanticTokenColors,
    ),
    tokenColors: [
        ...(remapTokenColors(
            (cursorDarkJson as unknown as ThemeRegistration).tokenColors,
        ) ?? []),
        {
            scope: [
                'entity.name.function',
                'entity.name.function.member',
                'meta.function-call entity.name.function',
            ],
            settings: {
                foreground: toBlogCodeCssColor(
                    BLOG_PHASE_WAVE.coral,
                    BLOG_CODE_OPACITY.identifier,
                ),
            },
        },
        {
            scope: ['variable.parameter', 'meta.parameter'],
            settings: {
                foreground: toBlogCodeCssColor(
                    BLOG_PHASE_WAVE.midBlue,
                    BLOG_CODE_OPACITY.identifier,
                ),
            },
        },
        {
            scope: [
                'variable.other.constant',
                'variable.other.enummember',
                'support.constant',
            ],
            settings: {
                foreground: toBlogCodeCssColor(
                    BLOG_PHASE_WAVE.mist,
                    BLOG_CODE_OPACITY.identifier,
                ),
            },
        },
        {
            scope: ['constant.numeric', 'constant.language'],
            settings: {
                foreground: toBlogCodeCssColor(
                    BLOG_PHASE_WAVE.coral,
                    BLOG_CODE_OPACITY.literal,
                ),
            },
        },
        {
            scope: ['string', 'constant.other.color'],
            settings: {
                foreground: toBlogCodeCssColor(
                    BLOG_PHASE_WAVE.apricot,
                    BLOG_CODE_OPACITY.literal,
                ),
            },
        },
        {
            scope: [
                'meta.object-literal.key',
                'support.type.property-name',
                'variable.other.property',
            ],
            settings: {
                foreground: toBlogCodeCssColor(
                    BLOG_PHASE_WAVE.skyBlue,
                    BLOG_CODE_OPACITY.type,
                ),
            },
        },
        {
            scope: [
                'keyword',
                'keyword.control',
                'keyword.declaration',
                'keyword.operator.new',
                'keyword.operator.expression',
                'storage.type',
                'storage.modifier',
            ],
            settings: {
                foreground: toBlogCodeCssColor(
                    BLOG_PHASE_WAVE.keywordYellow,
                    BLOG_CODE_OPACITY.keyword,
                ),
                fontStyle: 'bold',
            },
        },
        {
            scope: [
                'punctuation',
                'punctuation.separator',
                'punctuation.definition',
                'meta.brace',
                'keyword.operator',
            ],
            settings: {
                foreground: toBlogCodeCssColor(
                    BLOG_PHASE_WAVE.slate,
                    BLOG_CODE_OPACITY.muted,
                ),
            },
        },
    ],
}

/** @deprecated Use `blogPhaseWaveTheme`. Kept for imports during transition. */
export const blogWhiteBlueTheme = blogPhaseWaveTheme
