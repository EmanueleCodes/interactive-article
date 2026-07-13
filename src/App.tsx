import { useEffect, useMemo, useState } from 'react'
import {
    AnimatedCloud,
    DEFAULT_CLOUD_PARAMS,
} from '@/components/cloud/AnimatedCloud'
import {
    AudioPlayer,
    MagicCursor,
    Chapter,
    BlogDivider,
    BlogInfoCallout,
    CloudDemo,
    TUTORIAL_CLOUD_SVG_PARAMS,
    InteractiveCodeSnippet,
    NarratedText,
    NarrationProvider,
    PackageManagerCodeBox,
    StaticOrbitPreview,
    ScalePulsePreview,
    RadialPulsePreview,
    StaggeredPulsePreview,
    VariedPulsePreview,
    PhaseShiftVisualizer,
} from '@/components/blog'
import { CLOUD_TUTORIAL_CHECKPOINT_SEGMENT_IDS } from '@/data/cloud-tutorial-checkpoints'
import { loadCloudTutorialTranscript } from '@/data/loadCloudTutorialTranscript'
import type { NarrationTranscript } from '@/components/blog/narrationTypes'
import {
    parseCircleSnippet,
    parseMotionSnippet,
    parseRadialOscSnippet,
    parseScaleSnippet,
    parseSvgSnippet,
    parseTailSnippet,
    parseVariationSnippet,
} from '@/components/blog/parseSnippetParams'
import { TUTORIAL_CIRCLE_DEFAULTS } from '@/data/tutorial-snippet-defaults'
import { TUTORIAL_SVG_OUTLINE_DEFAULTS } from '@/data/tutorial-svg-snippet-defaults'

/** Source files shown in InteractiveCodeSnippet headers (must match real paths in this repo). */
const STATIC_ORBIT_PREVIEW_PATH = '/src/components/blog/StaticOrbitPreview.tsx'
const ANIMATED_CLOUD_PATH = '/src/components/cloud/AnimatedCloud.tsx'

const CIRCLES_SNIPPET = `const BLOB_COUNT = ${TUTORIAL_CIRCLE_DEFAULTS.blobCount}
const ORBIT_RADIUS = ${TUTORIAL_CIRCLE_DEFAULTS.orbitRadius}
const BLOB_SIZE = ${TUTORIAL_CIRCLE_DEFAULTS.blobSize}`

const CIRCLES_FULL = `function CloudCircles({
    blobCount = ${TUTORIAL_CIRCLE_DEFAULTS.blobCount},
    orbitRadius = ${TUTORIAL_CIRCLE_DEFAULTS.orbitRadius},
    blobSize = ${TUTORIAL_CIRCLE_DEFAULTS.blobSize},
}) {
    return (
        <div className="relative size-0">
            {Array.from({ length: blobCount }, (_, index) => {
                const angle = (index / blobCount) * 360
                const radians = (angle * Math.PI) / 180
                const x = Math.cos(radians) * orbitRadius
                const y = Math.sin(radians) * orbitRadius

                return (
                    <div
                        key={index}
                        className="absolute rounded-full bg-white"
                        style={{
                            width: blobSize,
                            height: blobSize,
                            left: x,
                            top: y,
                            transform: 'translate(-50%, -50%)',
                        }}
                    />
                )
            })}
        </div>
    )
}`

const SCALE_SNIPPET = `const SCALE_AMPLITUDE = 0.12
const RADIUS_SPEED = 2

const scale = useTransform(radiusPhase, (r) => {
    const pulse = (Math.sin(r) + 1) / 2
    return scaleMin + pulse * (scaleMax - scaleMin)
})`

const SCALE_FULL = `function useCloudBlobTransforms(config, globalOrbitAngle, globalRadiusPhase) {
    const radiusPhase = useTransform(
        globalRadiusPhase,
        (global) => global + config.radiusOscPhaseOffset,
    )
    const scale = useTransform(radiusPhase, (r) => {
        const pulse = (Math.sin(r) + 1) / 2
        const scaleRange = config.scaleMax - config.scaleMin
        return config.scaleMin + pulse * scaleRange
    })

    return { scale, radiusPhase }
}`

const STAGGER_SNIPPET = `const SCALE_AMPLITUDE = 0.05
const RADIUS_AMPLITUDE = 14
const RADIUS_SPEED = 2

function getStaggerPhaseOffset(index, count) {
    return (index / count) * Math.PI * 2
}`

const STAGGER_FULL = `const blobs = useMemo(() => {
    return Array.from({ length: params.blobCount }, (_, i) => ({
        id: \`\${i}\`,
        startRotation: (i / params.blobCount) * 360,
        radiusOscPhaseOffset: getStaggerPhaseOffset(i, params.blobCount),
        scaleMin: 1 - params.scaleAmplitude,
        scaleMax: 1 + params.scaleAmplitude,
    }))
}, [params.blobCount, params.scaleAmplitude])`

const RADIAL_OSC_SNIPPET = `const SCALE_AMPLITUDE = 0.05
const RADIUS_AMPLITUDE = 14
const RADIUS_SPEED = 2`

const RADIAL_OSC_FULL = `function getCloudBlobPosition(config, angleDeg, radiusPhase) {
    const radialPulse = config.radiusOscAmplitude * Math.sin(radiusPhase)
    const currentRadius = config.orbitRadius + radialPulse
    const angleRad = (angleDeg * Math.PI) / 180

    return {
        x: Math.cos(angleRad) * currentRadius,
        y: Math.sin(angleRad) * currentRadius,
    }
}`

const VARIATION_SNIPPET = `const SCALE_AMPLITUDE = 0.05
const RADIUS_AMPLITUDE = 14
const RADIUS_SPEED = 2

const variation = {
    size: 0.04,
    radius: 3,
    scaleAmplitude: 0.01,
}`

const VARIATION_FULL = `const blobs = useMemo(() => {
    return Array.from({ length: params.blobCount }, (_, i) => {
        const phase = getStaggerPhaseOffset(i, params.blobCount)
        const wave = Math.sin(phase)
        const wave2 = Math.cos(phase)

        return {
            id: \`\${i}\`,
            size: params.blobSize * (1 + params.variation.size * wave),
            orbitRadius: params.orbitRadius + params.variation.radius * wave2,
            scaleMin: 1 - params.scaleAmplitude - params.variation.scaleAmplitude * Math.abs(wave),
            scaleMax: 1 + params.scaleAmplitude + params.variation.scaleAmplitude * Math.abs(wave2),
            radiusOscPhaseOffset: phase,
        }
    })
}, [params])`

const TAIL_SNIPPET = `const tail = {
    blobCount: 2,
    blobSize: 47,
    scaleAmplitude: 0.08,
    positionAmplitude: 5,
}`

const TAIL_FULL = `const tailBlobs = useMemo(() => {
    const configs = []
    const count = params.tail.blobCount

    for (let i = 0; i < count; i++) {
        const t = count === 1 ? 0 : i / (count - 1)
        const point = sampleCubicBezier(tailCurve, t)
        const tangent = sampleCubicBezierTangent(tailCurve, t)
        const tangentLength = Math.hypot(tangent.x, tangent.y) || 1
        const normalX = -tangent.y / tangentLength
        const normalY = tangent.x / tangentLength
        const sizeTaper = 1 - t * 0.45

        configs.push({
            id: \`tail-\${i}\`,
            baseX: point.x,
            baseY: point.y,
            normalX,
            normalY,
            size: params.tail.blobSize * sizeTaper,
            scaleMin: 1 - params.tail.scaleAmplitude,
            scaleMax: 1 + params.tail.scaleAmplitude,
            positionAmplitude: params.tail.positionAmplitude,
            radiusOscPhaseOffset: getStaggerPhaseOffset(i, count),
        })
    }

    return configs
}, [params.tail, tailCurve])`

const SVG_SNIPPET = `renderMode: 'outlineFill'

outline: {
  fillColor: '${TUTORIAL_SVG_OUTLINE_DEFAULTS.fillColor}',
  innerColor: '${TUTORIAL_SVG_OUTLINE_DEFAULTS.innerColor}',
  outerColor: '${TUTORIAL_SVG_OUTLINE_DEFAULTS.outerColor}',
  fillOpacity: ${TUTORIAL_SVG_OUTLINE_DEFAULTS.fillOpacity},
  innerOpacity: ${TUTORIAL_SVG_OUTLINE_DEFAULTS.innerOpacity},
  outerOpacity: ${TUTORIAL_SVG_OUTLINE_DEFAULTS.outerOpacity},
  innerWidth: ${TUTORIAL_SVG_OUTLINE_DEFAULTS.innerWidth},
  outerWidth: ${TUTORIAL_SVG_OUTLINE_DEFAULTS.outerWidth},
}`

const SVG_FULL = `<AnimatedCloud
  params={{
    ...DEFAULT_CLOUD_PARAMS,
    renderMode: 'outlineFill',
    outline: {
      fillColor: '${TUTORIAL_SVG_OUTLINE_DEFAULTS.fillColor}',
      innerColor: '${TUTORIAL_SVG_OUTLINE_DEFAULTS.innerColor}',
      outerColor: '${TUTORIAL_SVG_OUTLINE_DEFAULTS.outerColor}',
      fillOpacity: ${TUTORIAL_SVG_OUTLINE_DEFAULTS.fillOpacity},
      innerOpacity: ${TUTORIAL_SVG_OUTLINE_DEFAULTS.innerOpacity},
      outerOpacity: ${TUTORIAL_SVG_OUTLINE_DEFAULTS.outerOpacity},
      innerWidth: ${TUTORIAL_SVG_OUTLINE_DEFAULTS.innerWidth},
      outerWidth: ${TUTORIAL_SVG_OUTLINE_DEFAULTS.outerWidth},
    },
  }}
/>`

export default function App() {
    const [transcript, setTranscript] = useState<NarrationTranscript | null>(
        null,
    )

    useEffect(() => {
        document.documentElement.classList.add('overscroll-none')
        document.body.classList.add('overscroll-none')
        return () => {
            document.documentElement.classList.remove('overscroll-none')
            document.body.classList.remove('overscroll-none')
        }
    }, [])

    useEffect(() => {
        let cancelled = false
        loadCloudTutorialTranscript().then((data) => {
            if (!cancelled) setTranscript(data)
        })
        return () => {
            cancelled = true
        }
    }, [])

    if (!transcript) {
        return <main className="min-h-screen bg-[#141414] text-white" />
    }

    return <CloudTutorialContent transcript={transcript} />
}

function CloudTutorialContent({
    transcript,
}: {
    transcript: NarrationTranscript
}) {
    const [circlesSnippet, setCirclesSnippet] = useState(CIRCLES_SNIPPET)
    const [scaleSnippet, setScaleSnippet] = useState(SCALE_SNIPPET)
    const [radialOscSnippet, setRadialOscSnippet] = useState(RADIAL_OSC_SNIPPET)
    const [staggerSnippet, setStaggerSnippet] = useState(STAGGER_SNIPPET)
    const [variationSnippet, setVariationSnippet] = useState(VARIATION_SNIPPET)
    const [tailSnippet, setTailSnippet] = useState(TAIL_SNIPPET)
    const [svgSnippet, setSvgSnippet] = useState(SVG_SNIPPET)

    const circleParams = useMemo(
        () => parseCircleSnippet(circlesSnippet),
        [circlesSnippet],
    )
    const scaleParams = useMemo(
        () => parseScaleSnippet(scaleSnippet),
        [scaleSnippet],
    )
    const radialOscParams = useMemo(
        () => parseRadialOscSnippet(radialOscSnippet),
        [radialOscSnippet],
    )
    const staggerParams = useMemo(
        () => parseMotionSnippet(staggerSnippet),
        [staggerSnippet],
    )
    const variationMotionParams = useMemo(
        () => parseMotionSnippet(variationSnippet),
        [variationSnippet],
    )
    const variationParams = useMemo(
        () => parseVariationSnippet(variationSnippet),
        [variationSnippet],
    )
    const tailParams = useMemo(
        () => parseTailSnippet(tailSnippet),
        [tailSnippet],
    )

    const tailCloudParams = useMemo(
        () => ({
            ...DEFAULT_CLOUD_PARAMS,
            color: '#ffffff',
            tail: {
                ...DEFAULT_CLOUD_PARAMS.tail,
                blobCount: tailParams.blobCount,
                blobSize: tailParams.blobSize,
                scaleAmplitude: tailParams.scaleAmplitude,
                positionAmplitude: tailParams.positionAmplitude,
            },
        }),
        [tailParams],
    )

    const svgParams = useMemo(() => parseSvgSnippet(svgSnippet), [svgSnippet])

    const svgCloudParams = useMemo(
        () => ({
            ...TUTORIAL_CLOUD_SVG_PARAMS,
            renderMode: svgParams.renderMode,
            color: svgParams.fillColor,
            outline: {
                ...TUTORIAL_CLOUD_SVG_PARAMS.outline,
                fillColor: svgParams.fillColor,
                innerColor: svgParams.innerColor,
                outerColor: svgParams.outerColor,
                fillOpacity: svgParams.fillOpacity,
                innerOpacity: svgParams.innerOpacity,
                outerOpacity: svgParams.outerOpacity,
                innerWidth: svgParams.innerWidth,
                outerWidth: svgParams.outerWidth,
            },
        }),
        [svgParams],
    )

    return (
        <NarrationProvider
            transcript={transcript}
            checkpointAfterSegmentIds={CLOUD_TUTORIAL_CHECKPOINT_SEGMENT_IDS}
        >
        <main className="min-h-screen bg-[#141414] text-white">
            <div className="mx-auto flex w-full max-w-[700px] flex-col gap-10 px-5 pb-24 pt-20 md:gap-16 md:px-10 md:pb-28 md:pt-[120px]">
                <header className="flex flex-col items-center gap-6 md:gap-8">
                    <p className="text-blog-meta m-0 text-[#7f7f7f]">
                        Code /{' '}
                        <span className="text-white">ChatGPT cloud</span>
                    </p>

                    <Chapter
                        id="intro"
                        className="flex flex-col items-center gap-6 md:gap-8"
                    >
                        <NarratedText
                            segmentId="intro-title"
                            as="h1"
                        />
                        <NarratedText
                            segmentId="intro-subtitle"
                            className="text-center"
                        />
                    </Chapter>
                </header>

                <section className="flex flex-col gap-4">
                    <CloudDemo />

                    <div className="flex items-center justify-between">
                        <p className="text-blog-meta m-0 text-[#7f7f7f]">
                            Code, design, and engineering by{' '}
                            <a
                                href="https://x.com/emanuelecodes"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white no-underline transition-colors hover:text-[#009dff]"
                            >
                                Emanuele
                            </a>
                        </p>
                        <p className="text-blog-meta m-0 text-[#838383]">
                            June 2nd
                        </p>
                    </div>
                </section>

                <article className="flex flex-col gap-6 md:gap-8">
                    <Chapter id="idea" className="flex flex-col gap-6 md:gap-8">
                        <NarratedText segmentId="the-idea-heading" as="h2" />
                        <NarratedText segmentId="the-idea" />

                        <BlogInfoCallout>
                            <NarratedText segmentId="idea-callout" />
                        </BlogInfoCallout>
                    </Chapter>

                    <Chapter id="setup" className="flex flex-col gap-6 md:gap-8">
                        <BlogDivider />

                        <NarratedText segmentId="setup-heading" as="h3" />
                        <NarratedText segmentId="setup" />

                        <PackageManagerCodeBox checkpointAfterSegmentId="setup" />
                    </Chapter>

                    <Chapter id="framework" className="flex flex-col gap-6 md:gap-8">
                        <BlogDivider />

                        <NarratedText segmentId="framework-heading" as="h2" />
                        <NarratedText segmentId="framework" />
                    </Chapter>

                    <Chapter id="shape" className="flex flex-col gap-6 md:gap-8">
                        <BlogDivider />

                        <NarratedText segmentId="shape-heading" as="h2" />
                        <NarratedText segmentId="shape" />

                        {/*
                          Preview + code pairs: InteractiveCodeSnippet is the outer card;
                          pass a *Preview component as `preview` and snippet/full strings as props.
                        */}
                        <InteractiveCodeSnippet
                            checkpointAfterSegmentId="shape"
                            editable
                            filepath={STATIC_ORBIT_PREVIEW_PATH}
                            snippetCode={circlesSnippet}
                            fullCode={CIRCLES_FULL}
                            onSnippetChange={setCirclesSnippet}
                            preview={
                                <StaticOrbitPreview
                                    color="#ffffff"
                                    blobCount={circleParams.blobCount}
                                    orbitRadius={circleParams.orbitRadius}
                                    blobSize={circleParams.blobSize}
                                />
                            }
                        />
                    </Chapter>

                    <Chapter id="compound-motion" className="flex flex-col gap-6 md:gap-8">
                        <BlogDivider />

                        <NarratedText segmentId="compound-motion-heading" as="h2" />
                        <NarratedText segmentId="compound-motion" paragraphIndex={0} />

                        <InteractiveCodeSnippet
                            checkpointAfterSegmentId="compound-motion"
                            editable
                            filepath={ANIMATED_CLOUD_PATH}
                            snippetCode={scaleSnippet}
                                fullCode={SCALE_FULL}
                                onSnippetChange={setScaleSnippet}
                                preview={
                                    <ScalePulsePreview
                                        scaleAmplitude={scaleParams.scaleAmplitude}
                                        speed={scaleParams.speed}
                                    />
                                }
                        />

                        <NarratedText segmentId="compound-motion" paragraphIndex={1} />

                        <InteractiveCodeSnippet
                            checkpointAfterSegmentId="compound-motion"
                            editable
                            filepath={ANIMATED_CLOUD_PATH}
                            snippetCode={radialOscSnippet}
                                fullCode={RADIAL_OSC_FULL}
                                onSnippetChange={setRadialOscSnippet}
                                preview={
                                    <RadialPulsePreview
                                        scaleAmplitude={
                                            radialOscParams.scaleAmplitude
                                        }
                                        radiusAmplitude={
                                            radialOscParams.radiusAmplitude
                                        }
                                        speed={radialOscParams.speed}
                                    />
                                }
                        />
                    </Chapter>

                    <Chapter id="phase-distribution" className="flex flex-col gap-6 md:gap-8">
                        <BlogDivider />

                        <NarratedText segmentId="phase-distribution-heading" as="h2" />
                        <NarratedText segmentId="phase-distribution" />

                        <InteractiveCodeSnippet
                            checkpointAfterSegmentId="phase-distribution"
                            editable
                            filepath={ANIMATED_CLOUD_PATH}
                            snippetCode={staggerSnippet}
                                fullCode={STAGGER_FULL}
                                onSnippetChange={setStaggerSnippet}
                                preview={
                                    <StaggeredPulsePreview
                                        scaleAmplitude={
                                            staggerParams.scaleAmplitude
                                        }
                                        radiusAmplitude={
                                            staggerParams.radiusAmplitude
                                        }
                                        speed={staggerParams.speed}
                                    />
                                }
                        />

                        <PhaseShiftVisualizer />
                    </Chapter>

                    <Chapter id="controlled-variation" className="flex flex-col gap-6 md:gap-8">
                        <BlogDivider />

                        <NarratedText segmentId="controlled-variation-heading" as="h2" />
                        <NarratedText segmentId="controlled-variation" />

                        <InteractiveCodeSnippet
                            checkpointAfterSegmentId="controlled-variation"
                            editable
                            filepath={ANIMATED_CLOUD_PATH}
                            snippetCode={variationSnippet}
                                fullCode={VARIATION_FULL}
                                onSnippetChange={setVariationSnippet}
                                preview={
                                    <VariedPulsePreview
                                        scaleAmplitude={
                                            variationMotionParams.scaleAmplitude
                                        }
                                        radiusAmplitude={
                                            variationMotionParams.radiusAmplitude
                                        }
                                        sizeVariation={variationParams.size}
                                        radiusVariation={variationParams.radius}
                                        scaleVariation={
                                            variationParams.scaleAmplitude
                                        }
                                        speed={variationMotionParams.speed}
                                    />
                                }
                        />
                    </Chapter>

                    <Chapter id="edge-details" className="flex flex-col gap-6 md:gap-8">
                        <BlogDivider />

                        <NarratedText segmentId="edge-details-heading" as="h2" />
                        <NarratedText segmentId="edge-details" />

                        <InteractiveCodeSnippet
                            checkpointAfterSegmentId="edge-details"
                            editable
                            filepath={ANIMATED_CLOUD_PATH}
                            snippetCode={tailSnippet}
                                fullCode={TAIL_FULL}
                                onSnippetChange={setTailSnippet}
                                preview={
                                    <div className="flex h-full items-center justify-center">
                                        <AnimatedCloud
                                            params={tailCloudParams}
                                            displayScale={0.55}
                                            showTailGuides
                                        />
                                    </div>
                                }
                        />
                    </Chapter>

                    <Chapter id="svg-mode" className="flex flex-col gap-6 md:gap-8">
                        <BlogDivider />

                        <NarratedText segmentId="svg-mode-heading" as="h2" />
                        <NarratedText segmentId="svg-mode" />

                        <InteractiveCodeSnippet
                            checkpointAfterSegmentId="svg-mode"
                            editable
                            filepath={ANIMATED_CLOUD_PATH}
                            snippetCode={svgSnippet}
                                fullCode={SVG_FULL}
                                onSnippetChange={setSvgSnippet}
                                preview={
                                    <div className="flex h-full items-center justify-center">
                                        <AnimatedCloud
                                            params={svgCloudParams}
                                            filled={
                                                svgParams.renderMode ===
                                                'outlineFill'
                                            }
                                            displayScale={0.55}
                                        />
                                    </div>
                                }
                        />
                    </Chapter>

                    <Chapter id="conclusion" className="flex flex-col gap-6 md:gap-8">
                        <BlogDivider />

                        <NarratedText segmentId="conclusion-heading" as="h2" />
                        <NarratedText segmentId="conclusion-intro" />

                        <CloudDemo variant="svg" />

                        <NarratedText segmentId="conclusion-body" />
                    </Chapter>
                </article>

                <BlogDivider />
            </div>
            <AudioPlayer />
            <MagicCursor />
        </main>
        </NarrationProvider>
    )
}
