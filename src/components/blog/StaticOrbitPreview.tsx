/** Static cloud preview (Step 1 — circles on an orbit). Rendered inside InteractiveCodeSnippet's preview slot. */
import { TUTORIAL_CIRCLE_DEFAULTS } from '@/data/tutorial-snippet-defaults'

export function StaticOrbitPreview({
    blobCount = TUTORIAL_CIRCLE_DEFAULTS.blobCount,
    orbitRadius = TUTORIAL_CIRCLE_DEFAULTS.orbitRadius,
    blobSize = TUTORIAL_CIRCLE_DEFAULTS.blobSize,
    color = '#5a5a5a',
}: {
    blobCount?: number
    orbitRadius?: number
    blobSize?: number
    color?: string
}) {
    return (
        <div className="flex h-full w-full items-center justify-center">
            <div className="relative size-0">
                {Array.from({ length: blobCount }, (_, index) => {
                    const angle = (index / blobCount) * 360
                    const radians = (angle * Math.PI) / 180
                    const x = Math.cos(radians) * orbitRadius
                    const y = Math.sin(radians) * orbitRadius

                    return (
                        <div
                            key={index}
                            className="absolute rounded-full"
                            style={{
                                width: blobSize,
                                height: blobSize,
                                left: x,
                                top: y,
                                transform: 'translate(-50%, -50%)',
                                backgroundColor: color,
                            }}
                        />
                    )
                })}
            </div>
        </div>
    )
}
