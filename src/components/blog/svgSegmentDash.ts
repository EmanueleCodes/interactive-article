function clamp01(n: number) {
    return Math.max(0, Math.min(1, n))
}

function cubicBezierAt(
    t: number,
    a: number,
    b: number,
    c: number,
    d: number,
): number {
    const u = 1 - t
    const t2 = t * t
    const t3 = t2 * t
    const u2 = u * u
    const u3 = u2 * u
    return 3 * u2 * t * b + 3 * u * t2 * c + t3 * d
}

/** Map linear t in [0,1] to eased progress using a cubic-bezier curve. */
export function applyCubicBezierEase(
    t: number,
    ease: readonly [number, number, number, number],
): number {
    const x = clamp01(t)
    const [x1, y1, x2, y2] = ease
    let lo = 0
    let hi = 1
    for (let i = 0; i < 12; i++) {
        const mid = (lo + hi) / 2
        const bx = cubicBezierAt(mid, 0, x1, x2, 1)
        if (bx < x) lo = mid
        else hi = mid
    }
    const u = (lo + hi) / 2
    return cubicBezierAt(u, 0, y1, y2, 1)
}

/** Dash pattern: visible only from start%→end% of path length (in path direction). */
export function segmentDash(
    pathLength: number,
    startPct: number,
    endPct: number,
): { dasharray: string; dashoffset: number; hide: boolean } {
    if (pathLength <= 0) {
        return { dasharray: 'none', dashoffset: 0, hide: true }
    }

    const start = clamp01(startPct / 100)
    const end = clamp01(endPct / 100)
    const lo = Math.min(start, end)
    const hi = Math.max(start, end)
    const dashLen = (hi - lo) * pathLength

    if (dashLen < 0.001) {
        return { dasharray: 'none', dashoffset: 0, hide: true }
    }

    const gapBefore = lo * pathLength
    const gapAfter = Math.max(0, (1 - hi) * pathLength)

    return {
        dasharray: `${dashLen} ${gapAfter + gapBefore}`,
        dashoffset: -gapBefore,
        hide: false,
    }
}
