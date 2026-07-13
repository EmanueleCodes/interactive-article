import { useDialKit } from 'dialkit'
import {
    CLOUD_OUTLINE_DESIGN_TOKENS,
    WRITING_LABEL_CLOUD_LAYOUT,
    WRITING_LABEL_CLOUD_PARAMS,
    type CloudParams,
} from './AnimatedCloud'

type WritingLabelCloudDialKit = CloudParams & {
    displayScale: number
    labelOffsetY: number
    cloudTop: number
    flipY: boolean
    alwaysVisible: boolean
}

export function useWritingLabelCloudDialKit() {
    const defaults = WRITING_LABEL_CLOUD_PARAMS

    const dial = useDialKit('Writing Bubble', {
        alwaysVisible: false,
        renderMode: {
            type: 'select',
            options: [
                { value: 'outline', label: 'Outline' },
                { value: 'outlineFill', label: 'Outline + Fill' },
            ],
            default: defaults.renderMode,
        },
        displayScale: [
            WRITING_LABEL_CLOUD_LAYOUT.displayScale,
            0.05,
            0.5,
            0.01,
        ],
        labelOffsetY: [
            WRITING_LABEL_CLOUD_LAYOUT.labelOffsetY,
            -30,
            30,
            1,
        ],
        cloudTop: [WRITING_LABEL_CLOUD_LAYOUT.cloudTop, 0, 120, 1],
        flipY: WRITING_LABEL_CLOUD_LAYOUT.flipY,
        blobSize: [defaults.blobSize, 40, 300],
        blobCount: [defaults.blobCount, 4, 10, 1],
        orbitRadius: [defaults.orbitRadius, 20, 180],
        orbitSpeed: [defaults.orbitSpeed, 4, 24],
        scaleAmplitude: [defaults.scaleAmplitude, 0, 0.3],
        variation: {
            size: [defaults.variation.size, 0, 1],
            radius: [defaults.variation.radius, 0, 40],
            scaleAmplitude: [defaults.variation.scaleAmplitude, 0, 0.15],
        },
        radiusOscillation: {
            amplitude: [defaults.radiusOscillation.amplitude, 0, 80],
            speed: [defaults.radiusOscillation.speed, 0.5, 12],
        },
        outline: {
            fillColor: CLOUD_OUTLINE_DESIGN_TOKENS.fill,
            innerColor: CLOUD_OUTLINE_DESIGN_TOKENS.innerStroke,
            outerColor: CLOUD_OUTLINE_DESIGN_TOKENS.outerStroke,
            fillOpacity: [CLOUD_OUTLINE_DESIGN_TOKENS.fillOpacity, 0, 1, 0.01],
            innerOpacity: [CLOUD_OUTLINE_DESIGN_TOKENS.innerOpacity, 0, 1, 0.01],
            outerOpacity: [CLOUD_OUTLINE_DESIGN_TOKENS.outerOpacity, 0, 1, 0.01],
            innerWidth: [CLOUD_OUTLINE_DESIGN_TOKENS.innerWidth, 0.25, 4],
            outerWidth: [CLOUD_OUTLINE_DESIGN_TOKENS.outerWidth, 0.25, 4],
        },
        tail: {
            blobCount: [defaults.tail.blobCount, 0, 5, 1],
            blobSize: [defaults.tail.blobSize, 8, 120],
            scaleAmplitude: [defaults.tail.scaleAmplitude, 0, 0.3],
            positionAmplitude: [defaults.tail.positionAmplitude, 0, 24],
            oscillationSpeed: [defaults.tail.oscillationSpeed, 0.5, 12],
            bigBlob: {
                x: [defaults.tail.bigBlob.x, -400, 400],
                y: [defaults.tail.bigBlob.y, -400, 400],
            },
            smallBlob: {
                x: [defaults.tail.smallBlob.x, -400, 400],
                y: [defaults.tail.smallBlob.y, -400, 400],
            },
            handle1: {
                x: [defaults.tail.handle1.x, -400, 400],
                y: [defaults.tail.handle1.y, -400, 400],
            },
            handle2: {
                x: [defaults.tail.handle2.x, -400, 400],
                y: [defaults.tail.handle2.y, -400, 400],
            },
        },
    }) as WritingLabelCloudDialKit

    const cloudParams: CloudParams = {
        renderMode: dial.renderMode,
        blobSize: dial.blobSize,
        blobCount: dial.blobCount,
        orbitRadius: dial.orbitRadius,
        orbitSpeed: dial.orbitSpeed,
        scaleAmplitude: dial.scaleAmplitude,
        color: defaults.color,
        variation: dial.variation,
        radiusOscillation: dial.radiusOscillation,
        duoMode: false,
        outline: dial.outline,
        tail: dial.tail,
    }

    return {
        cloudParams,
        displayScale: dial.displayScale,
        labelOffsetY: dial.labelOffsetY,
        cloudTop: dial.cloudTop,
        flipY: dial.flipY,
        alwaysVisible: dial.alwaysVisible,
    }
}
