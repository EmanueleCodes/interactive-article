import { useMemo } from 'react'
import type { KeyboardEvent } from 'react'
import {
    BLOG_CODE_GUTTER_CLASS,
    BLOG_CODE_LINE_HEIGHT_PX,
    BlogCodeLineNumbers,
    BlogShikiCode,
} from '@/components/blog/codeHighlightParts'
import type { BlogCodeLanguage } from '@/components/blog/shiki'

export function EditableHighlightedCode({
    code,
    onChange,
    lang = 'tsx',
}: {
    code: string
    onChange: (code: string) => void
    lang?: BlogCodeLanguage
}) {
    const lineCount = useMemo(
        () => Math.max(code.split('\n').length, 1),
        [code],
    )

    function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
        if (event.key !== 'Tab') return

        event.preventDefault()
        const textarea = event.currentTarget
        const { selectionStart, selectionEnd, value } = textarea
        const nextValue =
            value.slice(0, selectionStart) + '    ' + value.slice(selectionEnd)
        onChange(nextValue)

        requestAnimationFrame(() => {
            textarea.selectionStart = selectionStart + 4
            textarea.selectionEnd = selectionStart + 4
        })
    }

    return (
        <div className={`flex overflow-x-auto ${BLOG_CODE_GUTTER_CLASS}`}>
            <BlogCodeLineNumbers count={lineCount} />
            <div className="relative min-w-0 flex-1">
                <div
                    className="blog-shiki-editable-overlay pointer-events-none"
                    aria-hidden
                >
                    <div className="blog-shiki">
                        <BlogShikiCode code={code} lang={lang} />
                    </div>
                </div>
                <textarea
                    value={code}
                    onChange={(event) => onChange(event.target.value)}
                    onKeyDown={handleKeyDown}
                    spellCheck={false}
                    aria-label="Editable code snippet"
                    className="blog-shiki-editable-input absolute inset-0 m-0 box-border w-full resize-none overflow-hidden border-0 bg-transparent p-0 font-geist-mono text-sm font-normal tab-size-4 whitespace-pre text-transparent caret-white outline-none focus:outline-none focus-visible:outline-none focus:ring-0 selection:bg-[rgba(0,157,255,0.35)]"
                    style={{
                        lineHeight: `${BLOG_CODE_LINE_HEIGHT_PX}px`,
                        color: 'transparent',
                        caretColor: '#ffffff',
                    }}
                />
            </div>
        </div>
    )
}
