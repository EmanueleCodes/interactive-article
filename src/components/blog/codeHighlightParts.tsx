import { useEffect, useState } from 'react'
import type { BlogCodeLanguage } from '@/components/blog/shiki'

export const BLOG_CODE_LINE_HEIGHT_PX = 21
/** Space between gutter numbers and code (single gap — avoid pr-4 + pl-4 doubling) */
export const BLOG_CODE_GUTTER_CLASS = 'gap-3'

export function BlogCodeLineNumbers({ count }: { count: number }) {
    return (
        <div
            className="select-none shrink-0 text-right font-geist-mono text-sm text-[#565656]"
            aria-hidden
        >
            {Array.from({ length: count }, (_, index) => (
                <div
                    key={index}
                    style={{
                        height: BLOG_CODE_LINE_HEIGHT_PX,
                        lineHeight: `${BLOG_CODE_LINE_HEIGHT_PX}px`,
                    }}
                >
                    {index + 1}
                </div>
            ))}
        </div>
    )
}

function PlainShellCode({ code }: { code: string }) {
    const lines = code.split('\n')

    return (
        <pre
            className="m-0 bg-transparent p-0 font-geist-mono text-sm font-normal text-white"
            style={{ lineHeight: `${BLOG_CODE_LINE_HEIGHT_PX}px` }}
        >
            <code>
                {lines.map((line, index) => (
                    <span key={index} className="line">
                        {line.length > 0 ? line : '\u00A0'}
                    </span>
                ))}
            </code>
        </pre>
    )
}

function BlogShikiHighlightedCode({
    code,
    lang,
}: {
    code: string
    lang: BlogCodeLanguage
}) {
    const [html, setHtml] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false

        void import('@/components/blog/shiki').then(({ highlightBlogCode, isPlainShellLang }) => {
            if (isPlainShellLang(lang)) return ''
            return highlightBlogCode(code, lang)
        }).then((result) => {
            if (!cancelled && result != null) setHtml(result)
        })

        return () => {
            cancelled = true
        }
    }, [code, lang])

    if (html) {
        return <div dangerouslySetInnerHTML={{ __html: html }} />
    }

    const lines = code.split('\n')

    return (
        <pre
            className="shiki m-0 bg-transparent p-0 font-geist-mono text-sm text-[#e8e8e8]"
            style={{ lineHeight: `${BLOG_CODE_LINE_HEIGHT_PX}px` }}
        >
            <code>
                {lines.map((line, index) => (
                    <span key={index} className="line">
                        {line.length > 0 ? line : '\u00A0'}
                    </span>
                ))}
            </code>
        </pre>
    )
}

export function BlogShikiCode({
    code,
    lang,
}: {
    code: string
    lang: BlogCodeLanguage
}) {
    if (lang === 'bash' || lang === 'shell') {
        return <PlainShellCode code={code} />
    }

    return <BlogShikiHighlightedCode code={code} lang={lang} />
}
