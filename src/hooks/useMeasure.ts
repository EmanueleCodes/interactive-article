import { useCallback, useLayoutEffect, useState } from 'react'

function readBorderBoxSize(element: Element): { width: number; height: number } {
    const rect = element.getBoundingClientRect()
    return { width: rect.width, height: rect.height }
}

/** Track element border-box size via ResizeObserver — for animating container bounds. */
export function useMeasure<T extends HTMLElement = HTMLDivElement>(): [
    (node: T | null) => void,
    { width: number; height: number },
] {
    const [element, setElement] = useState<T | null>(null)
    const [bounds, setBounds] = useState({ width: 0, height: 0 })

    const ref = useCallback((node: T | null) => {
        setElement(node)
    }, [])

    useLayoutEffect(() => {
        if (!element) return

        const observer = new ResizeObserver(([entry]) => {
            setBounds(readBorderBoxSize(entry.target))
        })

        observer.observe(element)
        setBounds(readBorderBoxSize(element))
        return () => observer.disconnect()
    }, [element])

    return [ref, bounds]
}
