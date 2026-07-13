import { useEffect, useRef, useState, type RefObject } from 'react'

/**
 * Returns true when the element is visible in the viewport.
 * Uses IntersectionObserver for efficient visibility detection.
 */
export function useIsVisible<T extends HTMLElement = HTMLElement>(
    ref: RefObject<T | null>,
    options?: IntersectionObserverInit,
): boolean {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const element = ref.current
        if (!element) return

        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsVisible(entry.isIntersecting)
            },
            {
                threshold: 0,
                rootMargin: '100px', // Start animating slightly before visible
                ...options,
            },
        )

        observer.observe(element)
        return () => observer.disconnect()
    }, [ref, options])

    return isVisible
}

/**
 * Returns a ref and visibility state together for convenience.
 */
export function useVisibilityRef<T extends HTMLElement = HTMLElement>(
    options?: IntersectionObserverInit,
): [RefObject<T | null>, boolean] {
    const ref = useRef<T | null>(null)
    const isVisible = useIsVisible(ref, options)
    return [ref, isVisible]
}
