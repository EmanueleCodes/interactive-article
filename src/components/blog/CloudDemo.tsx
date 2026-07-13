import { useMemo } from 'react'
import {
    AnimatedCloud,
    DEFAULT_CLOUD_PARAMS,
    type CloudParams,
} from '@/components/cloud/AnimatedCloud'
import { TUTORIAL_SVG_OUTLINE_DEFAULTS } from '@/data/tutorial-svg-snippet-defaults'

export const TUTORIAL_CLOUD_FILLED_PARAMS: CloudParams = {
    ...DEFAULT_CLOUD_PARAMS,
    renderMode: 'filled',
    color: '#FFFFFF',
}

/** SVG params — interactive section defaults to outlineFill in the snippet. */
export const TUTORIAL_CLOUD_SVG_PARAMS: CloudParams = {
    ...DEFAULT_CLOUD_PARAMS,
    renderMode: 'outlineFill',
    color: '#FFFFFF',
    outline: {
        ...TUTORIAL_SVG_OUTLINE_DEFAULTS,
    },
}

/** Conclusion demo — stroke + outer halo only, no SVG fill layer. */
export const TUTORIAL_CLOUD_OUTLINE_PARAMS: CloudParams = {
    ...TUTORIAL_CLOUD_SVG_PARAMS,
    renderMode: 'outline',
}

export function CloudDemo({
    variant = 'filled',
}: {
    variant?: 'filled' | 'svg'
}) {
    const params = useMemo(
        () =>
            variant === 'svg'
                ? TUTORIAL_CLOUD_OUTLINE_PARAMS
                : TUTORIAL_CLOUD_FILLED_PARAMS,
        [variant],
    )

    return (
        <div className="relative h-[443px] w-full overflow-hidden rounded-2xl border border-[#292929] bg-[#1b1b1b]">
            <div className="absolute inset-0 flex items-center justify-center">
                <AnimatedCloud
                    params={params}
                    displayScale={0.55}
                />
            </div>
        </div>
    )
}
