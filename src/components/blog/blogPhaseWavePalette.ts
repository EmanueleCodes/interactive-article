/** Phase-shift visualizer + blog Shiki palette (Figma 1639:2634 + intermediate hues). */
export const BLOG_PHASE_WAVE_COLORS = [
    '#115DFF',
    '#49A4FF',
    '#FFFFFF',
    '#FFE8C4',
    '#FF9B6C',
] as const

export const BLOG_PHASE_WAVE_COUNT = BLOG_PHASE_WAVE_COLORS.length

export const BLOG_PHASE_WAVE = {
    deepBlue: BLOG_PHASE_WAVE_COLORS[0],
    skyBlue: BLOG_PHASE_WAVE_COLORS[1],
    white: BLOG_PHASE_WAVE_COLORS[2],
    peach: BLOG_PHASE_WAVE_COLORS[3],
    coral: BLOG_PHASE_WAVE_COLORS[4],
    /** Between deepBlue ↔ skyBlue */
    midBlue: '#2B80FF',
    /** Between white ↔ peach */
    blush: '#FFF0D8',
    /** Between peach ↔ coral */
    apricot: '#FFC99A',
    /** Punctuation / comments — soft periwinkle */
    slate: '#88B8FF',
    /** Pale blue for constants / UPPER_SNAKE */
    mist: '#9EC8FF',
    /** Keywords — const, function, return, etc. */
    keywordYellow: '#FFF5D7',
} as const
