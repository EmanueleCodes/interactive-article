import { useMemo } from 'react'
import {
    BLOG_CODE_GUTTER_CLASS,
    BlogCodeLineNumbers,
    BlogShikiCode,
} from '@/components/blog/codeHighlightParts'
import type { BlogCodeLanguage } from '@/components/blog/shiki'

export function HighlightedCode({
    code,
    lang = 'tsx',
}: {
    code: string
    lang?: BlogCodeLanguage
}) {
    const lineCount = useMemo(() => code.split('\n').length, [code])

    return (
        <div
            className={`flex overflow-x-auto outline-none focus:outline-none focus-within:outline-none ${BLOG_CODE_GUTTER_CLASS}`}
        >
            <BlogCodeLineNumbers count={lineCount} />
            <div className="blog-shiki blog-shiki-readonly min-w-0 flex-1 outline-none focus:outline-none focus-within:outline-none">
                <BlogShikiCode code={code} lang={lang} />
            </div>
        </div>
    )
}
