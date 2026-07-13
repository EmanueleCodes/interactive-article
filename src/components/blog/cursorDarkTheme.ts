import type { ThemeRegistration } from 'shiki'
import { applyBoldToTokenColors } from '@/components/blog/blogCodeBoldTokens'
import cursorDarkJson from '@/components/blog/cursor-dark.json'

/**
 * Authentic Cursor Dark palette (CedricVerlinden/cursor-dark, MIT).
 * Bold emphasis on keywords, functions, tags, and JSX attributes.
 */
export const cursorDarkTheme: ThemeRegistration = {
    ...(cursorDarkJson as unknown as ThemeRegistration),
    name: 'cursor-dark',
    colors: {
        ...(cursorDarkJson as unknown as ThemeRegistration).colors,
        'editor.background': '#1b1b1b',
    },
    tokenColors: applyBoldToTokenColors(
        (cursorDarkJson as unknown as ThemeRegistration).tokenColors,
    ),
}
