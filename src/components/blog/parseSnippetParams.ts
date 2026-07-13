import { TUTORIAL_CIRCLE_DEFAULTS } from '@/data/tutorial-snippet-defaults'
import { TUTORIAL_SVG_OUTLINE_DEFAULTS } from '@/data/tutorial-svg-snippet-defaults'

export function parseNumericConstant(
    code: string,
    name: string,
    fallback: number,
): number {
    const match = code.match(
        new RegExp(`(?:const|let|var)\\s+${name}\\s*=\\s*([\\d.]+)`),
    )
    if (!match) return fallback

    const value = Number(match[1])
    return Number.isFinite(value) ? value : fallback
}

export function parseCircleSnippet(code: string) {
    return {
        blobCount: Math.round(
            Math.min(
                20,
                Math.max(
                    2,
                    parseNumericConstant(code, 'BLOB_COUNT', TUTORIAL_CIRCLE_DEFAULTS.blobCount),
                ),
            ),
        ),
        orbitRadius: Math.min(
            200,
            Math.max(10, parseNumericConstant(code, 'ORBIT_RADIUS', TUTORIAL_CIRCLE_DEFAULTS.orbitRadius)),
        ),
        blobSize: Math.min(
            300,
            Math.max(20, parseNumericConstant(code, 'BLOB_SIZE', TUTORIAL_CIRCLE_DEFAULTS.blobSize)),
        ),
    }
}

export function parseScaleSnippet(code: string) {
    return {
        scaleAmplitude: clamp(
            parseNumericConstant(code, 'SCALE_AMPLITUDE', 0.12),
            0,
            0.5,
        ),
        speed: clamp(parseNumericConstant(code, 'RADIUS_SPEED', 2), 0.5, 12),
    }
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value))
}

export function parseObjectProperty(
    code: string,
    property: string,
    fallback: number,
): number {
    const match = code.match(new RegExp(`${property}:\\s*([\\d.]+)`))
    if (!match) return fallback

    const value = Number(match[1])
    return Number.isFinite(value) ? value : fallback
}

export function parseRadialOscSnippet(code: string) {
    return {
        scaleAmplitude: clamp(
            parseNumericConstant(code, 'SCALE_AMPLITUDE', 0.05),
            0,
            0.5,
        ),
        radiusAmplitude: clamp(
            parseNumericConstant(code, 'RADIUS_AMPLITUDE', 14),
            0,
            80,
        ),
        speed: clamp(parseNumericConstant(code, 'RADIUS_SPEED', 2), 0.5, 12),
    }
}

export function parseMotionSnippet(code: string) {
    return {
        scaleAmplitude: clamp(
            parseNumericConstant(code, 'SCALE_AMPLITUDE', 0.05),
            0,
            0.5,
        ),
        radiusAmplitude: clamp(
            parseNumericConstant(code, 'RADIUS_AMPLITUDE', 14),
            0,
            80,
        ),
        speed: clamp(parseNumericConstant(code, 'RADIUS_SPEED', 2), 0.5, 12),
    }
}

export function parseVariationSnippet(code: string) {
    return {
        size: clamp(parseObjectProperty(code, 'size', 0.04), 0, 0.2),
        radius: clamp(parseObjectProperty(code, 'radius', 3), 0, 20),
        scaleAmplitude: clamp(
            parseObjectProperty(code, 'scaleAmplitude', 0.01),
            0,
            0.15,
        ),
    }
}

export function parseTailSnippet(code: string) {
    return {
        blobCount: Math.round(
            clamp(parseObjectProperty(code, 'blobCount', 2), 1, 5),
        ),
        blobSize: clamp(parseObjectProperty(code, 'blobSize', 47), 10, 120),
        scaleAmplitude: clamp(
            parseObjectProperty(code, 'scaleAmplitude', 0.08),
            0,
            0.3,
        ),
        positionAmplitude: clamp(
            parseObjectProperty(code, 'positionAmplitude', 5),
            0,
            30,
        ),
    }
}

function parseQuotedProperty(code: string, property: string, fallback: string) {
    const match = code.match(
        new RegExp(`${property}:\\s*['"]([^'"]+)['"]`, 'i'),
    )
    return match ? match[1] : fallback
}

function parseHexProperty(code: string, property: string, fallback: string) {
    const match = code.match(
        new RegExp(`${property}:\\s*['"](#[0-9a-fA-F]{3,8})['"]`, 'i'),
    )
    return match ? match[1] : fallback
}

export function parseSvgSnippet(code: string) {
    const {
        fillColor,
        innerColor,
        outerColor,
        fillOpacity,
        innerOpacity,
        outerOpacity,
        innerWidth,
        outerWidth,
    } = TUTORIAL_SVG_OUTLINE_DEFAULTS

    const renderModeRaw = parseQuotedProperty(code, 'renderMode', 'outlineFill')
    const renderMode: 'filled' | 'outline' | 'outlineFill' =
        renderModeRaw === 'filled' ||
        renderModeRaw === 'outline' ||
        renderModeRaw === 'outlineFill'
            ? renderModeRaw
            : 'outlineFill'

    return {
        renderMode,
        fillColor: parseHexProperty(code, 'fillColor', fillColor),
        innerColor: parseHexProperty(code, 'innerColor', innerColor),
        outerColor: parseHexProperty(code, 'outerColor', outerColor),
        fillOpacity: clamp(parseObjectProperty(code, 'fillOpacity', fillOpacity), 0, 1),
        innerOpacity: clamp(
            parseObjectProperty(code, 'innerOpacity', innerOpacity),
            0,
            1,
        ),
        outerOpacity: clamp(
            parseObjectProperty(code, 'outerOpacity', outerOpacity),
            0,
            1,
        ),
        innerWidth: clamp(parseObjectProperty(code, 'innerWidth', innerWidth), 0.5, 8),
        outerWidth: clamp(parseObjectProperty(code, 'outerWidth', outerWidth), 0.5, 8),
    }
}

