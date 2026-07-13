import { createHighlighterCore, type HighlighterCore } from 'shiki/core'
import { createOnigurumaEngine } from 'shiki/engine/oniguruma'
import bash from 'shiki/langs/bash.mjs'
import javascript from 'shiki/langs/javascript.mjs'
import shell from 'shiki/langs/shell.mjs'
import tsx from 'shiki/langs/tsx.mjs'
import typescript from 'shiki/langs/typescript.mjs'
import { enhanceBlogCodeHtml } from '@/components/blog/blogCodeHtmlEnhance'
import { blogPhaseWaveTheme } from '@/components/blog/blogWhiteBlueTheme'
import { cursorDarkTheme } from '@/components/blog/cursorDarkTheme'

export type BlogShikiThemeId = 'blog-phase-wave' | 'cursor-dark'

/** Active blog code theme — set to `'cursor-dark'` to restore Cursor Dark. */
export const BLOG_SHIKI_THEME_ID: BlogShikiThemeId = 'blog-phase-wave'

const BLOG_SHIKI_THEMES = {
    'blog-phase-wave': blogPhaseWaveTheme,
    'cursor-dark': cursorDarkTheme,
} as const satisfies Record<BlogShikiThemeId, typeof blogPhaseWaveTheme>

export const BLOG_CODE_THEME =
    BLOG_SHIKI_THEMES[BLOG_SHIKI_THEME_ID].name ?? BLOG_SHIKI_THEME_ID

const LANG_MODULES = [tsx, typescript, javascript, bash, shell] as const

let highlighterPromise: Promise<HighlighterCore> | null = null

function getHighlighter() {
    if (!highlighterPromise) {
        highlighterPromise = createHighlighterCore({
            themes: [blogPhaseWaveTheme, cursorDarkTheme],
            langs: [...LANG_MODULES],
            engine: createOnigurumaEngine(() => import('shiki/wasm')),
        })
    }
    return highlighterPromise
}

export type BlogCodeLanguage = 'tsx' | 'typescript' | 'javascript' | 'bash' | 'shell'

const PLAIN_SHELL_LANGS = new Set<BlogCodeLanguage>(['bash', 'shell'])

export function isPlainShellLang(lang: BlogCodeLanguage): boolean {
    return PLAIN_SHELL_LANGS.has(lang)
}

export async function highlightBlogCode(code: string, lang: BlogCodeLanguage) {
    if (isPlainShellLang(lang)) {
        return ''
    }
    const highlighter = await getHighlighter()
    const html = highlighter.codeToHtml(code, {
        lang,
        theme: BLOG_CODE_THEME,
    })
    return enhanceBlogCodeHtml(html)
}

/** Flat typography for textarea overlay — strip inline bold/italic that shifts caret alignment */
export async function highlightBlogCodeForEditable(
    code: string,
    lang: BlogCodeLanguage,
) {
    const html = await highlightBlogCode(code, lang)
    return html
        .replace(/\s*font-weight:\s*(?:bold|[5-9]00);?/gi, '')
        .replace(/\s*font-style:\s*italic;?/gi, '')
}
