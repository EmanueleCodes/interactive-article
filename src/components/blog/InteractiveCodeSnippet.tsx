import { Copy } from 'lucide-react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import {
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react'
import { EditableHighlightedCode } from '@/components/blog/EditableHighlightedCode'
import { HighlightedCode } from '@/components/blog/HighlightedCode'
import type { BlogCodeLanguage } from '@/components/blog/shiki'
import { useCheckpointHighlight } from '@/components/blog/useCheckpointHighlight'
import { BlogPressable } from '@/components/blog/BlogPressable'
import { MAGIC_CURSOR_IGNORE_ATTR } from '@/components/blog/magicCursorTypes'
import { useMeasure } from '@/hooks/useMeasure'

type ViewMode = 'snippet' | 'full'

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false)

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(text)
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1500)
        } catch {
            /* clipboard unavailable */
        }
    }

    return (
        <BlogPressable
            onClick={handleCopy}
            aria-label={copied ? 'Copied' : 'Copy code'}
            className="flex items-center justify-center rounded-[6px] bg-[#242424] p-1 text-[#878787] outline-none transition-colors hover:text-white focus:outline-none focus-visible:outline-none"
        >
            <Copy className="size-4" strokeWidth={1.5} />
        </BlogPressable>
    )
}

function ViewToggle({
    mode,
    onChange,
}: {
    mode: ViewMode
    onChange: (mode: ViewMode) => void
}) {
    return (
        <div className="flex items-center gap-[10px]">
            <BlogPressable
                onClick={() => onChange('snippet')}
                className={`rounded p-1 font-geist-mono text-sm leading-[21px] outline-none transition-colors focus:outline-none focus-visible:outline-none ${
                    mode === 'snippet'
                        ? 'text-white'
                        : 'text-[#878787] hover:text-[#b0b0b0]'
                }`}
            >
                Snippet
            </BlogPressable>
            <BlogPressable
                onClick={() => onChange('full')}
                className={`rounded p-1 font-geist-mono text-sm leading-[21px] outline-none transition-colors focus:outline-none focus-visible:outline-none ${
                    mode === 'full'
                        ? 'text-white'
                        : 'text-[#878787] hover:text-[#b0b0b0]'
                }`}
            >
                Full Code
            </BlogPressable>
        </div>
    )
}

/**
 * Combined preview + code card (Figma 1498:10881).
 * Layout: outer shell → preview slot (top) → code panel (bottom).
 * Cloud previews are passed in via the `preview` prop from `cloud-tutorial.tsx`;
 * see `StaticOrbitPreview.tsx` and `CloudBuildStages.tsx` for preview implementations.
 */
export function InteractiveCodeSnippet({
    filepath,
    snippetCode,
    fullCode,
    preview,
    lang = 'tsx',
    previewHeight = 340,
    codePanelClassName,
    editable = false,
    onSnippetChange,
    checkpointAfterSegmentId,
}: {
    filepath: string
    snippetCode: string
    fullCode: string
    preview?: ReactNode
    lang?: BlogCodeLanguage
    previewHeight?: number
    codePanelClassName?: string
    editable?: boolean
    onSnippetChange?: (code: string) => void
    /** Narrated segment immediately before this block (Checkpoints mode). */
    checkpointAfterSegmentId?: string
}) {
    const [mode, setMode] = useState<ViewMode>('snippet')
    const [liveSnippet, setLiveSnippet] = useState(snippetCode)
    const [contentRef, contentBounds] = useMeasure()
    const { shellRef, usesGsapBorder } =
        useCheckpointHighlight(checkpointAfterSegmentId)
    const isEditableSnippet = editable && mode === 'snippet'
    const activeCode = mode === 'snippet' ? liveSnippet : fullCode

    useEffect(() => {
        setLiveSnippet(snippetCode)
    }, [snippetCode])

    useEffect(() => {
        if (isEditableSnippet) return
        const active = document.activeElement
        if (
            active instanceof HTMLTextAreaElement &&
            active.classList.contains('blog-shiki-editable-input')
        ) {
            active.blur()
        }
    }, [isEditableSnippet])

    function handleSnippetChange(nextCode: string) {
        setLiveSnippet(nextCode)
        onSnippetChange?.(nextCode)
    }

    const header = useMemo(
        () => (
            <div className="flex items-center justify-between bg-[#1f1f1f] px-3 py-2">
                <span className="truncate p-1 font-geist-mono text-sm leading-[21px] text-[#878787]">
                    {filepath}
                </span>
                <div className="flex shrink-0 items-center gap-[10px]">
                    <ViewToggle mode={mode} onChange={setMode} />
                    <CopyButton text={activeCode} />
                </div>
            </div>
        ),
        [activeCode, filepath, mode],
    )

    return (
        <div
            className="flex w-full flex-col overflow-visible"
            {...{ [MAGIC_CURSOR_IGNORE_ATTR]: '' }}
        >
            {/* Full container (this div): stacks preview on top + code panel below. */}

            {preview ? (
                <div
                    className="relative flex shrink-0 items-center justify-center overflow-hidden "
                    style={{ height: previewHeight }}
                >
                    {/* Preview slot — page passes cloud components via `preview` prop. */}
                    {preview}
                </div>
            ) : null}

            {/* Code box — filepath header, Snippet/Full toggle, copy, highlighted code. */}
            <div
                ref={shellRef}
                className={`flex flex-col overflow-hidden rounded-[22px] border bg-[#1b1b1b] ${
                    usesGsapBorder ? '' : 'border-[#262626]'
                } ${codePanelClassName ?? ''}`.trim()}
            >
                {header}
                <MotionConfig
                    transition={{
                        duration: 0.4,
                        ease: [0.19, 1, 0.22, 1],
                        delay: 0.05,
                    }}
                >
                    <motion.div
                        animate={{
                            height:
                                contentBounds.height > 0
                                    ? contentBounds.height
                                    : 'auto',
                        }}
                        className="overflow-hidden bg-[#1b1b1b]"
                    >
                        <div ref={contentRef} className="relative">
                            <AnimatePresence mode="popLayout" initial={false}>
                                <motion.div
                                    key={mode}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{
                                        opacity: {
                                            duration: 0.25,
                                            ease: 'easeInOut',
                                        },
                                    }}
                                    className="overflow-x-auto p-3 outline-none focus:outline-none focus-within:outline-none"
                                >
                                    {/* Shiki-highlighted source (editable in snippet mode). */}
                                    {isEditableSnippet ? (
                                        <EditableHighlightedCode
                                            code={liveSnippet}
                                            onChange={handleSnippetChange}
                                            lang={lang}
                                        />
                                    ) : (
                                        <HighlightedCode
                                            code={activeCode}
                                            lang={lang}
                                        />
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </MotionConfig>
            </div>
        </div>
    )
}
