import type { Transition } from 'motion/react'

export type BlogPressConfig = {
    /** Scale while pressed (e.g. 0.84 ≈ 16% shrink). */
    scale?: number
    /** Motion transition for release — spring or tween with `ease`. */
    transition?: Transition
}

/**
 * Unified tap/press controls for blog buttons (player, code snippets, copy, tabs).
 * Edit here or override per `BlogPressable` via the `press` prop.
 */
export const BLOG_PRESS: Required<BlogPressConfig> = {
    scale: 0.9,
    transition: {
        type: 'spring',
        stiffness: 680,
        damping: 30,
    },
}

/** Tween example — swap into `BLOG_PRESS.transition` for ease-based tap:
 * `{ duration: 0.14, ease: [0.4, 0, 0.2, 1] }` or `{ duration: 0.12, ease: 'easeOut' }`
 */

export function resolveBlogPress(
    overrides?: BlogPressConfig,
): Required<BlogPressConfig> {
    return {
        scale: overrides?.scale ?? BLOG_PRESS.scale,
        transition: {
            ...BLOG_PRESS.transition,
            ...overrides?.transition,
        },
    }
}

export function blogPressWhileTap(press: Required<BlogPressConfig> = BLOG_PRESS) {
    return {
        scale: press.scale,
        transition: press.transition,
    }
}
