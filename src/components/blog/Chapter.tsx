import { useEffect, useRef, type ReactNode } from 'react'
import { useChapterRegistry } from './NarrationContext'

export type ChapterProps = {
    /** Stable id for this chapter (used in registry + devtools) */
    id: string
    children: ReactNode
    className?: string
}

/**
 * Wraps an article section and auto-registers it with NarrationProvider
 * for chapter-segmented progress bar + weighted scroll.
 */
export function Chapter({ id, children, className }: ChapterProps) {
    const ref = useRef<HTMLDivElement>(null)
    const { registerChapter, unregisterChapter } = useChapterRegistry()

    useEffect(() => {
        registerChapter(id, ref)
        return () => unregisterChapter(id)
    }, [id, registerChapter, unregisterChapter])

    return (
        <div ref={ref} className={className} data-chapter={id}>
            {children}
        </div>
    )
}
