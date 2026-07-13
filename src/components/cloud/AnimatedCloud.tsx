import {
    animate,
    motion,
    useMotionValue,
    useTransform,
    type MotionValue,
} from 'motion/react'
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useIsVisible } from '@/hooks/useIsVisible'

type Point = { x: number; y: number }

interface OutlineStyle {
    fillColor: string
    innerColor: string
    outerColor: string
    fillOpacity: number
    innerOpacity: number
    outerOpacity: number
    innerWidth: number
    outerWidth: number
}

interface BlobConfig {
    id: string
    size: number
    orbitRadius: number
    orbitDuration: number
    startRotation: number
    scaleMin: number
    scaleMax: number
    radiusOscAmplitude: number
    radiusOscPhaseOffset: number
    polarity: 1 | -1
}

interface TailBlobConfig {
    id: string
    baseX: number
    baseY: number
    normalX: number
    normalY: number
    size: number
    scaleMin: number
    scaleMax: number
    positionAmplitude: number
    radiusOscPhaseOffset: number
}

export type CloudParams = {
    renderMode: 'filled' | 'outline' | 'outlineFill'
    blobSize: number
    blobCount: number
    orbitRadius: number
    orbitSpeed: number
    scaleAmplitude: number
    color: string
    variation: {
        size: number
        radius: number
        scaleAmplitude: number
    }
    radiusOscillation: {
        amplitude: number
        speed: number
    }
    duoMode: boolean
    outline: {
        fillColor: string
        innerColor: string
        outerColor: string
        fillOpacity: number
        innerOpacity: number
        outerOpacity: number
        innerWidth: number
        outerWidth: number
    }
    tail: {
        blobCount: number
        blobSize: number
        scaleAmplitude: number
        positionAmplitude: number
        oscillationSpeed: number
        bigBlob: { x: number; y: number }
        smallBlob: { x: number; y: number }
        handle1: { x: number; y: number }
        handle2: { x: number; y: number }
    }
}

export const DEFAULT_CLOUD_PARAMS: CloudParams = {
    renderMode: 'filled',
    blobSize: 190,
    blobCount: 6,
    orbitRadius: 70,
    orbitSpeed: 12,
    scaleAmplitude: 0.05,
    color: '#E8F4FC',
    variation: {
        size: 0.04,
        radius: 3,
        scaleAmplitude: 0.01,
    },
    radiusOscillation: {
        amplitude: 14,
        speed: 2,
    },
    duoMode: false,
    outline: {
        fillColor: '#E8F4FC',
        innerColor: '#1F1F1F',
        outerColor: '#FFFFFF',
        fillOpacity: 1,
        innerOpacity: 1,
        outerOpacity: 1,
        innerWidth: 1.2,
        outerWidth: 1,
    },
    tail: {
        blobCount: 2,
        blobSize: 47,
        scaleAmplitude: 0.08,
        positionAmplitude: 5,
        oscillationSpeed: 2,
        bigBlob: { x: -150, y: 150 },
        smallBlob: { x: -130, y: 210 },
        handle1: { x: -170, y: 190 },
        handle2: { x: -130, y: 208 },
    },
}

function getStaggerPhaseOffset(index: number, count: number) {
    return (index / count) * Math.PI * 2
}

function sampleCubicBezier(p0: Point, p1: Point, p2: Point, p3: Point, t: number) {
    const u = 1 - t
    const tt = t * t
    const uu = u * u
    const uuu = uu * u
    const ttt = tt * t

    return {
        x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
        y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
    }
}

function sampleCubicBezierTangent(
    p0: Point,
    p1: Point,
    p2: Point,
    p3: Point,
    t: number,
) {
    const u = 1 - t
    return {
        x:
            3 * u * u * (p1.x - p0.x) +
            6 * u * t * (p2.x - p1.x) +
            3 * t * t * (p3.x - p2.x),
        y:
            3 * u * u * (p1.y - p0.y) +
            6 * u * t * (p2.y - p1.y) +
            3 * t * t * (p3.y - p2.y),
    }
}

function getBlobSurfaceStyle(fillColor: string) {
    return {
        backgroundColor: fillColor,
        border: 'none',
    }
}

function getCloudBlobPosition(
    config: BlobConfig,
    angleDeg: number,
    radiusPhase: number,
): Point {
    const radialPulse =
        config.polarity *
        config.radiusOscAmplitude *
        Math.sin(radiusPhase)
    const currentRadius = config.orbitRadius + radialPulse
    const angleRad = (angleDeg * Math.PI) / 180

    return {
        x: Math.cos(angleRad) * currentRadius,
        y: Math.sin(angleRad) * currentRadius,
    }
}

function useCloudBlobTransforms(
    config: BlobConfig,
    globalOrbitAngle: MotionValue<number>,
    globalRadiusPhase: MotionValue<number>,
) {
    const angle = useTransform(
        globalOrbitAngle,
        (orbitAngle) => config.startRotation + orbitAngle,
    )
    const radiusPhase = useTransform(
        globalRadiusPhase,
        (global) => global + config.radiusOscPhaseOffset,
    )
    const x = useTransform([angle, radiusPhase], ([a, r]) => {
        return getCloudBlobPosition(config, a as number, r as number).x
    })
    const y = useTransform([angle, radiusPhase], ([a, r]) => {
        return getCloudBlobPosition(config, a as number, r as number).y
    })
    const scale = useTransform(radiusPhase, (r) => {
        const pulse = (Math.sin(r) + 1) / 2
        const scaleRange = config.scaleMax - config.scaleMin

        if (config.polarity === 1) {
            return config.scaleMin + pulse * scaleRange
        }

        return config.scaleMax - pulse * scaleRange
    })

    return { x, y, scale }
}

function useTailBlobTransforms(
    config: TailBlobConfig,
    globalTailPhase: MotionValue<number>,
) {
    const radiusPhase = useTransform(
        globalTailPhase,
        (global) => global + config.radiusOscPhaseOffset,
    )
    const x = useTransform(radiusPhase, (r) => {
        const pulse = Math.sin(r)
        return config.baseX + config.normalX * config.positionAmplitude * pulse
    })
    const y = useTransform(radiusPhase, (r) => {
        const pulse = Math.sin(r)
        return config.baseY + config.normalY * config.positionAmplitude * pulse
    })
    const scale = useTransform(radiusPhase, (r) => {
        const pulse = (Math.sin(r) + 1) / 2
        return config.scaleMin + pulse * (config.scaleMax - config.scaleMin)
    })

    return { x, y, scale }
}

function useCloudStage(params: CloudParams, paused = false) {
    const globalOrbitAngle = useMotionValue(0)
    const globalRadiusPhase = useMotionValue(0)
    const globalTailPhase = useMotionValue(0)

    useEffect(() => {
        if (paused) return

        const controls = animate(globalOrbitAngle, [0, 360], {
            duration: params.orbitSpeed,
            repeat: Infinity,
            ease: 'linear',
        })

        return () => controls.stop()
    }, [globalOrbitAngle, params.orbitSpeed, paused])

    useEffect(() => {
        if (paused) return

        const controls = animate(globalRadiusPhase, [0, Math.PI * 2], {
            duration: params.radiusOscillation.speed,
            repeat: Infinity,
            ease: 'linear',
        })

        return () => controls.stop()
    }, [globalRadiusPhase, params.radiusOscillation.speed, paused])

    useEffect(() => {
        if (paused) return

        const controls = animate(globalTailPhase, [0, Math.PI * 2], {
            duration: params.tail.oscillationSpeed,
            repeat: Infinity,
            ease: 'linear',
        })

        return () => controls.stop()
    }, [globalTailPhase, params.tail.oscillationSpeed, paused])

    const blobs = useMemo(() => {
        if (params.duoMode) {
            const configs: BlobConfig[] = []

            for (let i = 0; i < params.blobCount; i++) {
                const startRotation = (i / params.blobCount) * 360
                const radiusOscPhaseOffset = getStaggerPhaseOffset(
                    i,
                    params.blobCount,
                )
                const pairConfig: Omit<BlobConfig, 'id' | 'polarity'> = {
                    size: params.blobSize,
                    orbitRadius: params.orbitRadius,
                    orbitDuration: params.orbitSpeed,
                    startRotation,
                    scaleMin: 1 - params.scaleAmplitude,
                    scaleMax: 1 + params.scaleAmplitude,
                    radiusOscAmplitude: params.radiusOscillation.amplitude,
                    radiusOscPhaseOffset,
                }

                configs.push(
                    { ...pairConfig, id: `${i}-inner`, polarity: -1 },
                    { ...pairConfig, id: `${i}-outer`, polarity: 1 },
                )
            }

            return configs
        }

        const configs: BlobConfig[] = []
        for (let i = 0; i < params.blobCount; i++) {
            const phase = getStaggerPhaseOffset(i, params.blobCount)
            const wave = Math.sin(phase)
            const wave2 = Math.cos(phase)
            const startRotation = (i / params.blobCount) * 360

            configs.push({
                id: `${i}`,
                size: params.blobSize * (1 + params.variation.size * wave),
                orbitRadius: params.orbitRadius + params.variation.radius * wave2,
                orbitDuration: params.orbitSpeed,
                startRotation,
                scaleMin:
                    1 -
                    params.scaleAmplitude -
                    params.variation.scaleAmplitude * Math.abs(wave),
                scaleMax:
                    1 +
                    params.scaleAmplitude +
                    params.variation.scaleAmplitude * Math.abs(wave2),
                radiusOscAmplitude: params.radiusOscillation.amplitude,
                radiusOscPhaseOffset: phase,
                polarity: 1,
            })
        }
        return configs
    }, [
        params.blobCount,
        params.blobSize,
        params.orbitRadius,
        params.orbitSpeed,
        params.scaleAmplitude,
        params.duoMode,
        params.variation.size,
        params.variation.radius,
        params.variation.scaleAmplitude,
        params.radiusOscillation.amplitude,
    ])

    const tailCurve = useMemo(
        () => ({
            p0: { x: params.tail.bigBlob.x, y: params.tail.bigBlob.y },
            p1: { x: params.tail.handle1.x, y: params.tail.handle1.y },
            p2: { x: params.tail.handle2.x, y: params.tail.handle2.y },
            p3: { x: params.tail.smallBlob.x, y: params.tail.smallBlob.y },
        }),
        [
            params.tail.bigBlob.x,
            params.tail.bigBlob.y,
            params.tail.handle1.x,
            params.tail.handle1.y,
            params.tail.handle2.x,
            params.tail.handle2.y,
            params.tail.smallBlob.x,
            params.tail.smallBlob.y,
        ],
    )

    const tailBlobs = useMemo(() => {
        const configs: TailBlobConfig[] = []
        const count = params.tail.blobCount
        const scaleMin = 1 - params.tail.scaleAmplitude
        const scaleMax = 1 + params.tail.scaleAmplitude

        for (let i = 0; i < count; i++) {
            const t = count === 1 ? 0 : i / (count - 1)
            const point = sampleCubicBezier(
                tailCurve.p0,
                tailCurve.p1,
                tailCurve.p2,
                tailCurve.p3,
                t,
            )
            const tangent = sampleCubicBezierTangent(
                tailCurve.p0,
                tailCurve.p1,
                tailCurve.p2,
                tailCurve.p3,
                t,
            )
            const tangentLength = Math.hypot(tangent.x, tangent.y) || 1
            const normalX = -tangent.y / tangentLength
            const normalY = tangent.x / tangentLength
            const sizeTaper = 1 - t * 0.45

            configs.push({
                id: `tail-${i}`,
                baseX: point.x,
                baseY: point.y,
                normalX,
                normalY,
                size: params.tail.blobSize * sizeTaper,
                scaleMin,
                scaleMax,
                positionAmplitude: params.tail.positionAmplitude,
                radiusOscPhaseOffset: getStaggerPhaseOffset(i, count),
            })
        }

        return configs
    }, [
        params.tail.blobCount,
        params.tail.blobSize,
        params.tail.scaleAmplitude,
        params.tail.positionAmplitude,
        tailCurve,
    ])

    const stageSize = useMemo(() => {
        const cloudReach =
            params.orbitRadius +
            params.variation.radius +
            params.radiusOscillation.amplitude +
            params.blobSize

        const tailPoints = [
            tailCurve.p0,
            tailCurve.p1,
            tailCurve.p2,
            tailCurve.p3,
            ...tailBlobs.map((blob) => ({ x: blob.baseX, y: blob.baseY })),
        ]

        let extent = cloudReach
        for (const point of tailPoints) {
            extent = Math.max(
                extent,
                Math.hypot(point.x, point.y) + params.tail.blobSize,
            )
        }

        return extent * 2.4
    }, [
        params.orbitRadius,
        params.variation.radius,
        params.radiusOscillation.amplitude,
        params.blobSize,
        params.tail.blobSize,
        tailCurve,
        tailBlobs,
    ])

    const outlineStyle = useMemo(
        () => ({
            fillColor: params.outline.fillColor,
            innerColor: params.outline.innerColor,
            outerColor: params.outline.outerColor,
            fillOpacity: params.outline.fillOpacity,
            innerOpacity: params.outline.innerOpacity,
            outerOpacity: params.outline.outerOpacity,
            innerWidth: params.outline.innerWidth,
            outerWidth: params.outline.outerWidth,
        }),
        [
            params.outline.fillColor,
            params.outline.innerColor,
            params.outline.outerColor,
            params.outline.fillOpacity,
            params.outline.innerOpacity,
            params.outline.outerOpacity,
            params.outline.innerWidth,
            params.outline.outerWidth,
        ],
    )

    return {
        blobs,
        tailBlobs,
        tailCurve,
        stageSize,
        outlineStyle,
        globalOrbitAngle,
        globalRadiusPhase,
        globalTailPhase,
    }
}

function isSvgOutlineMode(mode: CloudParams['renderMode']) {
    return mode === 'outline' || mode === 'outlineFill'
}

function scaleOutlineForDisplay(
    outlineStyle: OutlineStyle,
    displayScale: number,
): OutlineStyle {
    if (displayScale === 1) {
        return outlineStyle
    }

    const strokeScale = 1 / displayScale
    return {
        ...outlineStyle,
        innerWidth: outlineStyle.innerWidth * strokeScale,
        outerWidth: outlineStyle.outerWidth * strokeScale,
    }
}

export function AnimatedCloud({
    params = DEFAULT_CLOUD_PARAMS,
    showTailGuides = false,
    flipY = false,
    mergedOutline = false,
    displayScale = 1,
    labelOffsetY = 0,
    filled = false,
    className,
    children,
}: {
    params?: CloudParams
    showTailGuides?: boolean
    flipY?: boolean
    /** Outline as a merged silhouette — overlapping fills, no per-blob inner strokes. */
    mergedOutline?: boolean
    displayScale?: number
    labelOffsetY?: number
    filled?: boolean
    className?: string
    children?: ReactNode
}) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const isVisible = useIsVisible(containerRef)
    const stage = useCloudStage(params, !isVisible)
    const scaledStageSize = stage.stageSize * displayScale
    const outlineStyle = useMemo(
        () => scaleOutlineForDisplay(stage.outlineStyle, displayScale),
        [stage.outlineStyle, displayScale],
    )

    const svgVariant = useMemo((): 'outline' | 'outlineFill' => {
        if (!isSvgOutlineMode(params.renderMode)) {
            return 'outline'
        }

        return filled ? 'outlineFill' : 'outline'
    }, [filled, params.renderMode])

    const fillColor = isSvgOutlineMode(params.renderMode)
            ? params.outline.fillColor
            : params.color

    return (
        <div
            ref={containerRef}
            className={`relative ${className ?? ''}`}
            style={{
                width: scaledStageSize,
                height: scaledStageSize,
            }}
        >
            <div
                className="absolute left-1/2 top-1/2 origin-center"
                style={{
                    width: stage.stageSize,
                    height: stage.stageSize,
                    transform: `translate(-50%, -50%) scale(${displayScale * (flipY ? -1 : 1)}, ${displayScale})`,
                    filter:
                        mergedOutline && params.renderMode === 'outline'
                            ? `drop-shadow(0 0 ${params.outline.outerWidth}px ${params.outline.innerColor})`
                            : undefined,
                }}
            >
                {isSvgOutlineMode(params.renderMode) && !mergedOutline ? (
                    <OutlineSvgScene
                        blobs={stage.blobs}
                        tailBlobs={stage.tailBlobs}
                        globalOrbitAngle={stage.globalOrbitAngle}
                        globalRadiusPhase={stage.globalRadiusPhase}
                        globalTailPhase={stage.globalTailPhase}
                        outlineStyle={outlineStyle}
                        variant={svgVariant}
                    />
                ) : (
                    <>
                        {stage.blobs.map((blob) => (
                            <Blob
                                key={blob.id}
                                config={blob}
                                color={fillColor}
                                globalOrbitAngle={stage.globalOrbitAngle}
                                globalRadiusPhase={stage.globalRadiusPhase}
                            />
                        ))}

                        <Tail
                            blobs={stage.tailBlobs}
                            color={fillColor}
                            globalTailPhase={stage.globalTailPhase}
                            curve={stage.tailCurve}
                            showGuides={showTailGuides}
                        />
                    </>
                )}
            </div>

            {filled && children ? (
                <div
                    className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
                    style={{ transform: `translateY(${labelOffsetY}px)` }}
                >
                    {children}
                </div>
            ) : null}
        </div>
    )
}

function OutlineSvgScene({
    blobs,
    tailBlobs,
    globalOrbitAngle,
    globalRadiusPhase,
    globalTailPhase,
    outlineStyle,
    variant,
}: {
    blobs: BlobConfig[]
    tailBlobs: TailBlobConfig[]
    globalOrbitAngle: MotionValue<number>
    globalRadiusPhase: MotionValue<number>
    globalTailPhase: MotionValue<number>
    outlineStyle: OutlineStyle
    variant: 'outline' | 'outlineFill'
}) {
    const filterId = useId().replace(/:/g, '')
    const [outerMaskLayer, setOuterMaskLayer] = useState<SVGGElement | null>(null)

    const sharedBlobProps = {
        globalOrbitAngle,
        globalRadiusPhase,
        outerMaskLayer,
        fillColor: outlineStyle.fillColor,
        strokeColor: outlineStyle.innerColor,
        strokeWidth: outlineStyle.innerWidth,
        variant,
    }

    return (
        <svg
            className="pointer-events-none absolute left-1/2 top-1/2 overflow-visible"
            style={{ transform: 'translate(-50%, -50%)' }}
            width={1}
            height={1}
            aria-hidden
        >
            <defs>
                <filter
                    id={filterId}
                    x="-20%"
                    y="-20%"
                    width="140%"
                    height="140%"
                    colorInterpolationFilters="sRGB"
                >
                    <feMorphology
                        in="SourceAlpha"
                        operator="dilate"
                        radius={outlineStyle.outerWidth}
                        result="dilated"
                    />
                    <feComposite
                        in="dilated"
                        in2="SourceAlpha"
                        operator="xor"
                        result="outline"
                    />
                    <feFlood
                        floodColor={outlineStyle.outerColor}
                        floodOpacity={outlineStyle.outerOpacity}
                        result="color"
                    />
                    <feComposite in="color" in2="outline" operator="in" />
                </filter>
            </defs>

            <g ref={setOuterMaskLayer} filter={`url(#${filterId})`} />

            {variant === 'outlineFill' ? (
                <g
                    fill={outlineStyle.fillColor}
                    fillOpacity={outlineStyle.fillOpacity}
                >
                    {blobs.map((blob) => (
                        <OutlineCloudBlob
                            key={`fill-${blob.id}`}
                            config={blob}
                            {...sharedBlobProps}
                            layer="fill"
                        />
                    ))}
                    {tailBlobs.map((blob) => (
                        <OutlineTailBlob
                            key={`fill-${blob.id}`}
                            config={blob}
                            globalTailPhase={globalTailPhase}
                            {...sharedBlobProps}
                            layer="fill"
                        />
                    ))}
                </g>
            ) : null}

            {variant === 'outlineFill' ? (
                <g
                    fill="none"
                    stroke={outlineStyle.innerColor}
                    strokeOpacity={outlineStyle.innerOpacity}
                    strokeWidth={outlineStyle.innerWidth}
                >
                    {blobs.map((blob) => (
                        <OutlineCloudBlob
                            key={`stroke-${blob.id}`}
                            config={blob}
                            {...sharedBlobProps}
                            layer="stroke"
                        />
                    ))}
                    {tailBlobs.map((blob) => (
                        <OutlineTailBlob
                            key={`stroke-${blob.id}`}
                            config={blob}
                            globalTailPhase={globalTailPhase}
                            {...sharedBlobProps}
                            layer="stroke"
                        />
                    ))}
                </g>
            ) : null}

            {blobs.map((blob) => (
                <OutlineCloudBlob
                    key={`outer-${blob.id}`}
                    config={blob}
                    {...sharedBlobProps}
                    layer="outerMask"
                />
            ))}
            {tailBlobs.map((blob) => (
                <OutlineTailBlob
                    key={`outer-${blob.id}`}
                    config={blob}
                    globalTailPhase={globalTailPhase}
                    {...sharedBlobProps}
                    layer="outerMask"
                />
            ))}

        </svg>
    )
}

type OutlineBlobLayer = 'fill' | 'stroke' | 'outerMask'

function OutlineCloudBlob({
    config,
    globalOrbitAngle,
    globalRadiusPhase,
    outerMaskLayer,
    fillColor,
    strokeColor,
    strokeWidth,
    layer,
}: {
    config: BlobConfig
    globalOrbitAngle: MotionValue<number>
    globalRadiusPhase: MotionValue<number>
    outerMaskLayer: SVGGElement | null
    fillColor: string
    strokeColor: string
    strokeWidth: number
    variant: 'outline' | 'outlineFill'
    layer: OutlineBlobLayer
}) {
    const { x, y, scale } = useCloudBlobTransforms(
        config,
        globalOrbitAngle,
        globalRadiusPhase,
    )
    const radius = useTransform(scale, (value) => (config.size * value) / 2)

    if (layer === 'fill') {
        return <motion.circle cx={x} cy={y} r={radius} fill={fillColor} />
    }

    if (layer === 'stroke') {
        return (
            <motion.circle
                cx={x}
                cy={y}
                r={radius}
                fill="none"
                stroke={strokeColor}
                strokeWidth={strokeWidth}
            />
        )
    }

    const outerMaskCircle = outerMaskLayer
        ? createPortal(
              <motion.circle cx={x} cy={y} r={radius} fill="#ffffff" />,
              outerMaskLayer,
          )
        : null

    return outerMaskCircle
}

function OutlineTailBlob({
    config,
    globalTailPhase,
    outerMaskLayer,
    fillColor,
    strokeColor,
    strokeWidth,
    layer,
}: {
    config: TailBlobConfig
    globalTailPhase: MotionValue<number>
    outerMaskLayer: SVGGElement | null
    fillColor: string
    strokeColor: string
    strokeWidth: number
    variant: 'outline' | 'outlineFill'
    layer: OutlineBlobLayer
}) {
    const { x, y, scale } = useTailBlobTransforms(config, globalTailPhase)
    const radius = useTransform(scale, (value) => (config.size * value) / 2)

    if (layer === 'fill') {
        return <motion.circle cx={x} cy={y} r={radius} fill={fillColor} />
    }

    if (layer === 'stroke') {
        return (
            <motion.circle
                cx={x}
                cy={y}
                r={radius}
                fill="none"
                stroke={strokeColor}
                strokeWidth={strokeWidth}
            />
        )
    }

    const outerMaskCircle = outerMaskLayer
        ? createPortal(
              <motion.circle cx={x} cy={y} r={radius} fill="#ffffff" />,
              outerMaskLayer,
          )
        : null

    return outerMaskCircle
}

function Blob({
    config,
    color,
    globalOrbitAngle,
    globalRadiusPhase,
}: {
    config: BlobConfig
    color: string
    globalOrbitAngle: MotionValue<number>
    globalRadiusPhase: MotionValue<number>
}) {
    const { x, y, scale } = useCloudBlobTransforms(
        config,
        globalOrbitAngle,
        globalRadiusPhase,
    )

    return (
        <motion.div
            className="absolute rounded-full"
            style={{
                width: config.size,
                height: config.size,
                left: '50%',
                top: '50%',
                marginLeft: -config.size / 2,
                marginTop: -config.size / 2,
                x,
                y,
                scale,
                ...getBlobSurfaceStyle(color),
            }}
        />
    )
}

function Tail({
    blobs,
    color,
    globalTailPhase,
    curve,
    showGuides = false,
}: {
    blobs: TailBlobConfig[]
    color: string
    globalTailPhase: MotionValue<number>
    curve: { p0: Point; p1: Point; p2: Point; p3: Point }
    showGuides?: boolean
}) {
    const pathD = useMemo(() => {
        const { p0, p1, p2, p3 } = curve
        return `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`
    }, [curve])

    return (
        <>
            {showGuides ? (
                <svg
                    className="pointer-events-none absolute left-1/2 top-1/2 overflow-visible"
                    style={{ transform: 'translate(-50%, -50%)' }}
                    width={1}
                    height={1}
                    aria-hidden
                >
                    <path
                        d={pathD}
                        fill="none"
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth={1}
                        strokeDasharray="4 4"
                    />
                    <circle
                        cx={curve.p0.x}
                        cy={curve.p0.y}
                        r={3}
                        fill="rgba(255,255,255,0.2)"
                    />
                    <circle
                        cx={curve.p3.x}
                        cy={curve.p3.y}
                        r={3}
                        fill="rgba(255,255,255,0.2)"
                    />
                    <circle
                        cx={curve.p1.x}
                        cy={curve.p1.y}
                        r={2.5}
                        fill="rgba(255,255,255,0.12)"
                    />
                    <circle
                        cx={curve.p2.x}
                        cy={curve.p2.y}
                        r={2.5}
                        fill="rgba(255,255,255,0.12)"
                    />
                </svg>
            ) : null}

            {blobs.map((blob) => (
                <TailBlob
                    key={blob.id}
                    config={blob}
                    color={color}
                    globalTailPhase={globalTailPhase}
                />
            ))}
        </>
    )
}

function TailBlob({
    config,
    color,
    globalTailPhase,
}: {
    config: TailBlobConfig
    color: string
    globalTailPhase: MotionValue<number>
}) {
    const { x, y, scale } = useTailBlobTransforms(config, globalTailPhase)

    return (
        <motion.div
            className="absolute rounded-full"
            style={{
                width: config.size,
                height: config.size,
                left: '50%',
                top: '50%',
                marginLeft: -config.size / 2,
                marginTop: -config.size / 2,
                x,
                y,
                scale,
                ...getBlobSurfaceStyle(color),
            }}
        />
    )
}

export const CLOUD_OUTLINE_DESIGN_TOKENS = {
    fill: '#191919',
    innerStroke: '#191919',
    outerStroke: '#2C2C2C',
    fillOpacity: 1,
    innerOpacity: 1,
    outerOpacity: 1,
    innerWidth: 0.5,
    outerWidth: 0.5,
} as const

export const WRITING_LABEL_CLOUD_LAYOUT = {
    displayScale: 0.21,
    labelOffsetY: 0,
    cloudTop: 24,
    flipY: true,
} as const

export const WRITING_LABEL_CLOUD_PARAMS: CloudParams = {
    ...DEFAULT_CLOUD_PARAMS,
    renderMode: 'outlineFill',
    blobSize: 200,
    blobCount: 6,
    orbitRadius: 80,
    orbitSpeed: 12,
    scaleAmplitude: 0.05,
    variation: {
        size: 0.04,
        radius: 3,
        scaleAmplitude: 0.01,
    },
    radiusOscillation: {
        amplitude: 14,
        speed: 2,
    },
    outline: {
        fillColor: CLOUD_OUTLINE_DESIGN_TOKENS.fill,
        innerColor: CLOUD_OUTLINE_DESIGN_TOKENS.innerStroke,
        outerColor: CLOUD_OUTLINE_DESIGN_TOKENS.outerStroke,
        fillOpacity: CLOUD_OUTLINE_DESIGN_TOKENS.fillOpacity,
        innerOpacity: CLOUD_OUTLINE_DESIGN_TOKENS.innerOpacity,
        outerOpacity: CLOUD_OUTLINE_DESIGN_TOKENS.outerOpacity,
        innerWidth: CLOUD_OUTLINE_DESIGN_TOKENS.innerWidth,
        outerWidth: CLOUD_OUTLINE_DESIGN_TOKENS.outerWidth,
    },
    tail: {
        blobCount: 2,
        blobSize: 62,
        scaleAmplitude: 0.08,
        positionAmplitude: 4,
        oscillationSpeed: 7,
        bigBlob: { x: 80, y: 170 },
        smallBlob: { x: 40, y: 240 },
        handle1: { x: 70, y: 200 },
        handle2: { x: 45, y: 230 },
    },
}

/** Figma writing-label — SVG modes via `OutlineSvgScene`. */
export function WritingCloudLabel({
    params = WRITING_LABEL_CLOUD_PARAMS,
    displayScale = WRITING_LABEL_CLOUD_LAYOUT.displayScale,
    labelOffsetY = WRITING_LABEL_CLOUD_LAYOUT.labelOffsetY,
    cloudTop = WRITING_LABEL_CLOUD_LAYOUT.cloudTop,
    flipY = WRITING_LABEL_CLOUD_LAYOUT.flipY,
    filled = false,
    children,
}: {
    params?: CloudParams
    displayScale?: number
    labelOffsetY?: number
    cloudTop?: number
    flipY?: boolean
    filled?: boolean
    children?: ReactNode
}) {
    return (
        <div className="relative overflow-visible">
            <div
                className="absolute left-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
                style={{ top: cloudTop }}
            >
                <AnimatedCloud
                    params={params}
                    mergedOutline={false}
                    flipY={flipY}
                    displayScale={displayScale}
                    labelOffsetY={labelOffsetY}
                    filled={filled}
                >
                    <span className="text-content-serif-label text-white">
                        {children}
                    </span>
                </AnimatedCloud>
            </div>
        </div>
    )
}
