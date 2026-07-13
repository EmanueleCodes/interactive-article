import { Copy } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { BlogPressable } from '@/components/blog/BlogPressable'
import { HighlightedCode } from '@/components/blog/HighlightedCode'
import type { BlogCodeLanguage } from '@/components/blog/shiki'
import { useCheckpointHighlight } from '@/components/blog/useCheckpointHighlight'
import { MAGIC_CURSOR_IGNORE_ATTR } from '@/components/blog/magicCursorTypes'

const PACKAGE_MANAGERS = ['npm', 'pnpm', 'bun', 'yarn'] as const

type PackageManager = (typeof PACKAGE_MANAGERS)[number]

const INSTALL_COMMANDS: Record<PackageManager, string> = {
    npm: 'npm i',
    pnpm: 'pnpm i',
    bun: 'bun i',
    yarn: 'yarn',
}

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

/** Standalone code box shell (no preview). Used by PackageManagerCodeBox and FileCodeBox. */
function CodeShell({
    header,
    children,
    copyText,
    floatingCopy = false,
    checkpointAfterSegmentId,
}: {
    header?: ReactNode
    children: ReactNode
    copyText?: string
    floatingCopy?: boolean
    checkpointAfterSegmentId?: string
}) {
    const { shellRef, usesGsapBorder } =
        useCheckpointHighlight(checkpointAfterSegmentId)

    return (
        <div
            ref={shellRef}
            {...{ [MAGIC_CURSOR_IGNORE_ATTR]: '' }}
            className={`relative w-full overflow-hidden rounded-[22px] border bg-[#1b1b1b] ${
                usesGsapBorder ? '' : 'border-[#262626]'
            }`.trim()}
        >
            {/* Code box header + optional copy button */}
            {header ? (
                <div className="flex items-center justify-between bg-[#1f1f1f] px-3 py-2">
                    {header}
                    {copyText && !floatingCopy ? (
                        <CopyButton text={copyText} />
                    ) : null}
                </div>
            ) : null}
            {/* Syntax-highlighted code body */}
            <div className="overflow-x-auto p-3 outline-none focus:outline-none focus-within:outline-none">
                {children}
            </div>
            {copyText && floatingCopy ? (
                <div className="absolute right-2 top-2 shadow-[0_0_5px_16px_rgba(27,27,27,0.89)]">
                    <CopyButton text={copyText} />
                </div>
            ) : null}
        </div>
    )
}

export function PackageManagerCodeBox({
    checkpointAfterSegmentId,
}: {
    checkpointAfterSegmentId?: string
} = {}) {
    const [manager, setManager] = useState<PackageManager>('npm')

    return (
        <CodeShell
            checkpointAfterSegmentId={checkpointAfterSegmentId}
            header={
                <div className="flex gap-2.5">
                    {PACKAGE_MANAGERS.map((item) => {
                        const active = item === manager
                        return (
                            <BlogPressable
                                key={item}
                                onClick={() => setManager(item)}
                                className={`rounded p-1 font-geist-mono text-sm leading-[21px] outline-none transition-colors focus:outline-none focus-visible:outline-none ${
                                    active
                                        ? 'text-white'
                                        : 'text-[#878787] hover:text-[#b0b0b0]'
                                }`}
                            >
                                {item}
                            </BlogPressable>
                        )
                    })}
                </div>
            }
            copyText={INSTALL_COMMANDS[manager]}
        >
            <HighlightedCode
                code={INSTALL_COMMANDS[manager]}
                lang="bash"
            />
        </CodeShell>
    )
}

export function FileCodeBox({
    filename,
    code,
    lang = 'tsx',
}: {
    filename: string
    code: string
    lang?: BlogCodeLanguage
}) {
    return (
        <CodeShell
            header={
                <div className="flex min-w-0 items-center gap-2.5">
                    <span className="truncate p-1 font-geist-mono text-sm leading-[21px] text-[#878787]">
                        {filename}
                    </span>
                </div>
            }
            copyText={code}
        >
            <HighlightedCode code={code} lang={lang} />
        </CodeShell>
    )
}

export function HighlightedCodeBox({
    code,
    lang = 'typescript',
}: {
    code: string
    lang?: BlogCodeLanguage
}) {
    return (
        <CodeShell copyText={code} floatingCopy>
            <HighlightedCode code={code} lang={lang} />
        </CodeShell>
    )
}
