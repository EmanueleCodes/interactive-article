import {
    motion,
    useMotionValue,
    useTransform,
    type MotionValue,
} from 'motion/react'
import { useEffect, useMemo, useRef } from 'react'
import { useVisibilityRef } from '@/hooks/useIsVisible'
import { TUTORIAL_CIRCLE_DEFAULTS } from '@/data/tutorial-snippet-defaults'

/** Animated cloud previews for the cloud tutorial code snippets (Steps 2+). */

interface BlobConfig {
    index: number
    angle: number
    x: number
    y: number
    size: number
}

function useBaseBlobs(count: number, orbitRadius: number, blobSize: number) {
    return useMemo(() => {
        return Array.from({ length: count }, (_, i) => {
            const angle = (i / count) * Math.PI * 2
            return {
                index: i,
                angle,
                x: Math.cos(angle) * orbitRadius,
                y: Math.sin(angle) * orbitRadius,
                size: blobSize,
            }
        })
    }, [count, orbitRadius, blobSize])
}

/** Continuous phase clock — does not restart when \`speed\` changes. Pauses when not visible. */
function useOscillationPhase(speed: number, paused = false) {
    const phase = useMotionValue(0)
    const speedRef = useRef(speed)
    const accumulatedPhase = useRef(0)

    useEffect(() => {
        speedRef.current = speed
    }, [speed])

    useEffect(() => {
        if (paused) return

        let frame = 0
        let last = performance.now()

        const tick = (now: number) => {
            const dt = (now - last) / 1000
            last = now
            const twoPi = Math.PI * 2
            accumulatedPhase.current += (dt / speedRef.current) * twoPi
            accumulatedPhase.current %= twoPi
            phase.set(accumulatedPhase.current)
            frame = requestAnimationFrame(tick)
        }

        frame = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(frame)
    }, [phase, paused])

    return phase
}

/** Scale pulse preview (compound motion — scale only). */
export function ScalePulsePreview({
    blobCount = TUTORIAL_CIRCLE_DEFAULTS.blobCount,
    orbitRadius = TUTORIAL_CIRCLE_DEFAULTS.orbitRadius,
    blobSize = TUTORIAL_CIRCLE_DEFAULTS.blobSize,
    scaleAmplitude = 0.12,
    speed = 2,
    color = '#ffffff',
}: {
    blobCount?: number
    orbitRadius?: number
    blobSize?: number
    scaleAmplitude?: number
    speed?: number
    color?: string
}) {
    const [containerRef, isVisible] = useVisibilityRef<HTMLDivElement>()
    const blobs = useBaseBlobs(blobCount, orbitRadius, blobSize)
    const phase = useOscillationPhase(speed, !isVisible)

    return (
        <div ref={containerRef} className="flex h-full w-full items-center justify-center">
            <div className="relative size-0">
                {blobs.map((blob) => (
                    <ScalePulseBlob
                        key={blob.index}
                        blob={blob}
                        phase={phase}
                        scaleAmplitude={scaleAmplitude}
                        color={color}
                    />
                ))}
            </div>
        </div>
    )
}

function ScalePulseBlob({
    blob,
    phase,
    scaleAmplitude,
    color,
}: {
    blob: BlobConfig
    phase: MotionValue<number>
    scaleAmplitude: number
    color: string
}) {
    const scale = useTransform(phase, (p) => {
        const pulse = (Math.sin(p) + 1) / 2
        return 1 - scaleAmplitude + pulse * scaleAmplitude * 2
    })

    return (
        <motion.div
            className="absolute rounded-full"
            style={{
                width: blob.size,
                height: blob.size,
                left: blob.x,
                top: blob.y,
                translateX: '-50%',
                translateY: '-50%',
                backgroundColor: color,
                scale,
            }}
        />
    )
}

/** Radial + scale pulse preview (compound motion — radius oscillation). */
export function RadialPulsePreview({
    blobCount = TUTORIAL_CIRCLE_DEFAULTS.blobCount,
    orbitRadius = TUTORIAL_CIRCLE_DEFAULTS.orbitRadius,
    blobSize = TUTORIAL_CIRCLE_DEFAULTS.blobSize,
    scaleAmplitude = 0.05,
    radiusAmplitude = 14,
    speed = 2,
    color = '#ffffff',
}: {
    blobCount?: number
    orbitRadius?: number
    blobSize?: number
    scaleAmplitude?: number
    radiusAmplitude?: number
    speed?: number
    color?: string
}) {
    const [containerRef, isVisible] = useVisibilityRef<HTMLDivElement>()
    const blobs = useBaseBlobs(blobCount, orbitRadius, blobSize)
    const phase = useOscillationPhase(speed, !isVisible)

    return (
        <div ref={containerRef} className="flex h-full w-full items-center justify-center">
            <div className="relative size-0">
                {blobs.map((blob) => (
                    <RadialPulseBlob
                        key={blob.index}
                        blob={blob}
                        baseRadius={orbitRadius}
                        phase={phase}
                        scaleAmplitude={scaleAmplitude}
                        radiusAmplitude={radiusAmplitude}
                        color={color}
                    />
                ))}
            </div>
        </div>
    )
}

function RadialPulseBlob({
    blob,
    baseRadius,
    phase,
    scaleAmplitude,
    radiusAmplitude,
    color,
}: {
    blob: BlobConfig
    baseRadius: number
    phase: MotionValue<number>
    scaleAmplitude: number
    radiusAmplitude: number
    color: string
}) {
    const x = useTransform(phase, (p) => {
        const currentRadius = baseRadius + Math.sin(p) * radiusAmplitude
        return Math.cos(blob.angle) * currentRadius
    })
    const y = useTransform(phase, (p) => {
        const currentRadius = baseRadius + Math.sin(p) * radiusAmplitude
        return Math.sin(blob.angle) * currentRadius
    })
    const scale = useTransform(phase, (p) => {
        const pulse = (Math.sin(p) + 1) / 2
        return 1 - scaleAmplitude + pulse * scaleAmplitude * 2
    })

    return (
        <motion.div
            className="absolute rounded-full"
            style={{
                width: blob.size,
                height: blob.size,
                left: 0,
                top: 0,
                x,
                y,
                backgroundColor: color,
                scale,
                translateX: '-50%',
                translateY: '-50%',
            }}
        />
    )
}

/** Staggered phase pulse preview (phase distribution). */
export function StaggeredPulsePreview({
    blobCount = TUTORIAL_CIRCLE_DEFAULTS.blobCount,
    orbitRadius = TUTORIAL_CIRCLE_DEFAULTS.orbitRadius,
    blobSize = TUTORIAL_CIRCLE_DEFAULTS.blobSize,
    scaleAmplitude = 0.05,
    radiusAmplitude = 14,
    speed = 2,
    color = '#ffffff',
}: {
    blobCount?: number
    orbitRadius?: number
    blobSize?: number
    scaleAmplitude?: number
    radiusAmplitude?: number
    speed?: number
    color?: string
}) {
    const [containerRef, isVisible] = useVisibilityRef<HTMLDivElement>()
    const blobs = useBaseBlobs(blobCount, orbitRadius, blobSize)
    const phase = useOscillationPhase(speed, !isVisible)

    const phaseOffsets = useMemo(
        () =>
            Array.from(
                { length: blobCount },
                (_, i) => (i / blobCount) * Math.PI * 2,
            ),
        [blobCount],
    )

    return (
        <div ref={containerRef} className="flex h-full w-full items-center justify-center">
            <div className="relative size-0">
                {blobs.map((blob, i) => (
                    <StaggeredPulseBlob
                        key={blob.index}
                        blob={blob}
                        baseRadius={orbitRadius}
                        globalPhase={phase}
                        phaseOffset={phaseOffsets[i]}
                        scaleAmplitude={scaleAmplitude}
                        radiusAmplitude={radiusAmplitude}
                        color={color}
                    />
                ))}
            </div>
        </div>
    )
}

function StaggeredPulseBlob({
    blob,
    baseRadius,
    globalPhase,
    phaseOffset,
    scaleAmplitude,
    radiusAmplitude,
    color,
}: {
    blob: BlobConfig
    baseRadius: number
    globalPhase: MotionValue<number>
    phaseOffset: number
    scaleAmplitude: number
    radiusAmplitude: number
    color: string
}) {
    const x = useTransform(globalPhase, (p) => {
        const localPhase = p + phaseOffset
        const currentRadius = baseRadius + Math.sin(localPhase) * radiusAmplitude
        return Math.cos(blob.angle) * currentRadius
    })
    const y = useTransform(globalPhase, (p) => {
        const localPhase = p + phaseOffset
        const currentRadius = baseRadius + Math.sin(localPhase) * radiusAmplitude
        return Math.sin(blob.angle) * currentRadius
    })
    const scale = useTransform(globalPhase, (p) => {
        const localPhase = p + phaseOffset
        const pulse = (Math.sin(localPhase) + 1) / 2
        return 1 - scaleAmplitude + pulse * scaleAmplitude * 2
    })

    return (
        <motion.div
            className="absolute rounded-full"
            style={{
                width: blob.size,
                height: blob.size,
                left: 0,
                top: 0,
                x,
                y,
                backgroundColor: color,
                scale,
                translateX: '-50%',
                translateY: '-50%',
            }}
        />
    )
}

/** Per-blob variation preview (controlled variation). */
export function VariedPulsePreview({
    blobCount = TUTORIAL_CIRCLE_DEFAULTS.blobCount,
    orbitRadius = TUTORIAL_CIRCLE_DEFAULTS.orbitRadius,
    blobSize = TUTORIAL_CIRCLE_DEFAULTS.blobSize,
    scaleAmplitude = 0.05,
    radiusAmplitude = 14,
    sizeVariation = 0.04,
    radiusVariation = 3,
    scaleVariation = 0.01,
    speed = 2,
    color = '#ffffff',
}: {
    blobCount?: number
    orbitRadius?: number
    blobSize?: number
    scaleAmplitude?: number
    radiusAmplitude?: number
    sizeVariation?: number
    radiusVariation?: number
    scaleVariation?: number
    speed?: number
    color?: string
}) {
    const [containerRef, isVisible] = useVisibilityRef<HTMLDivElement>()
    const phase = useOscillationPhase(speed, !isVisible)

    const blobs = useMemo(() => {
        return Array.from({ length: blobCount }, (_, i) => {
            const phaseOffset = (i / blobCount) * Math.PI * 2
            const wave = Math.sin(phaseOffset)
            const wave2 = Math.cos(phaseOffset)
            const angle = (i / blobCount) * Math.PI * 2

            return {
                index: i,
                angle,
                phaseOffset,
                size: blobSize * (1 + sizeVariation * wave),
                orbitRadius: orbitRadius + radiusVariation * wave2,
                scaleMin: 1 - scaleAmplitude - scaleVariation * Math.abs(wave),
                scaleMax: 1 + scaleAmplitude + scaleVariation * Math.abs(wave2),
            }
        })
    }, [blobCount, blobSize, orbitRadius, scaleAmplitude, sizeVariation, radiusVariation, scaleVariation])

    return (
        <div ref={containerRef} className="flex h-full w-full items-center justify-center">
            <div className="relative size-0">
                {blobs.map((blob) => (
                    <VariedPulseBlob
                        key={blob.index}
                        blob={blob}
                        globalPhase={phase}
                        radiusAmplitude={radiusAmplitude}
                        color={color}
                    />
                ))}
            </div>
        </div>
    )
}

function VariedPulseBlob({
    blob,
    globalPhase,
    radiusAmplitude,
    color,
}: {
    blob: {
        index: number
        angle: number
        phaseOffset: number
        size: number
        orbitRadius: number
        scaleMin: number
        scaleMax: number
    }
    globalPhase: MotionValue<number>
    radiusAmplitude: number
    color: string
}) {
    const x = useTransform(globalPhase, (p) => {
        const localPhase = p + blob.phaseOffset
        const currentRadius = blob.orbitRadius + Math.sin(localPhase) * radiusAmplitude
        return Math.cos(blob.angle) * currentRadius
    })
    const y = useTransform(globalPhase, (p) => {
        const localPhase = p + blob.phaseOffset
        const currentRadius = blob.orbitRadius + Math.sin(localPhase) * radiusAmplitude
        return Math.sin(blob.angle) * currentRadius
    })
    const scale = useTransform(globalPhase, (p) => {
        const localPhase = p + blob.phaseOffset
        const pulse = (Math.sin(localPhase) + 1) / 2
        return blob.scaleMin + pulse * (blob.scaleMax - blob.scaleMin)
    })

    return (
        <motion.div
            className="absolute rounded-full"
            style={{
                width: blob.size,
                height: blob.size,
                left: 0,
                top: 0,
                x,
                y,
                backgroundColor: color,
                scale,
                translateX: '-50%',
                translateY: '-50%',
            }}
        />
    )
}
