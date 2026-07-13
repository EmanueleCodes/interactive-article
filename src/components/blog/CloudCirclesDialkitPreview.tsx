import { useDialKit } from 'dialkit'
import { StaticOrbitPreview } from '@/components/blog/StaticOrbitPreview'
import { TUTORIAL_CIRCLE_DEFAULTS } from '@/data/tutorial-snippet-defaults'

const PANEL_NAME = 'Cloud Tutorial'

export function CloudCirclesDialkitPreview() {
    const params = useDialKit(PANEL_NAME, {
        blobCount: [TUTORIAL_CIRCLE_DEFAULTS.blobCount, 4, 10, 1],
        orbitRadius: [TUTORIAL_CIRCLE_DEFAULTS.orbitRadius, 10, 200],
        blobSize: [TUTORIAL_CIRCLE_DEFAULTS.blobSize, 20, 300],
    })

    return (
        <div className="flex h-full w-full items-center justify-center">
            <StaticOrbitPreview
                color="#ffffff"
                blobCount={params.blobCount}
                orbitRadius={params.orbitRadius}
                blobSize={params.blobSize}
            />
        </div>
    )
}
