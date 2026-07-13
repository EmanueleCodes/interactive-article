import type { ThemeRegistration } from 'shiki'

type TokenColor = NonNullable<ThemeRegistration['tokenColors']>[number]

const BOLD_SCOPE_PATTERNS = [
    /^keyword(\.|$)/,
    /^storage(\.|$)/,
    /^entity\.name\.(function|tag)/,
    /^support\.(function|class)/,
    /^entity\.other\.attribute-name/,
    /^variable\.language/,
    /^meta\.object-literal\.key/,
]

export function scopeMatchesBold(scope: TokenColor['scope']) {
    if (!scope) return false
    const scopes = Array.isArray(scope) ? scope : [scope]
    return scopes.some((item) =>
        BOLD_SCOPE_PATTERNS.some((pattern) => pattern.test(item)),
    )
}

export function withBoldFontStyle(settings: TokenColor['settings']) {
    if (!settings) return { fontStyle: 'bold' }

    const fontStyle = settings.fontStyle

    if (fontStyle?.includes('bold')) {
        return settings
    }

    return {
        ...settings,
        fontStyle: fontStyle ? `${fontStyle} bold` : 'bold',
    }
}

export function applyBoldToTokenColors(
    tokenColors: ThemeRegistration['tokenColors'],
    mapSettings: (settings: TokenColor['settings']) => TokenColor['settings'] = (
        s,
    ) => s,
): ThemeRegistration['tokenColors'] {
    return (tokenColors ?? []).map((rule) => {
        const settings = mapSettings(rule.settings)
        return scopeMatchesBold(rule.scope)
            ? { ...rule, settings: withBoldFontStyle(settings) }
            : { ...rule, settings }
    })
}
