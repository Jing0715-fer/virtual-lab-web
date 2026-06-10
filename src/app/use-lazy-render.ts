'use client'

/**
 * useLazyRender - IntersectionObserver-based lazy rendering hook
 *
 * Returns `isVisible` boolean that becomes true when the element
 * enters the viewport. Useful for delaying rendering of expensive
 * off-screen components.
 *
 * @example
 * ```tsx
 * function HeavySection() {
 *   const { ref, isVisible } = useLazyRender({ rootMargin: '200px' })
 *   return (
 *     <div ref={ref}>
 *       {isVisible && <ExpensiveChart />}
 *     </div>
 *   )
 * }
 * ```
 */

import { useState, useEffect, useRef, useCallback } from 'react'

interface UseLazyRenderOptions {
  /** Margin around the root element before triggering (CSS margin syntax) */
  rootMargin?: string
  /** Visibility threshold (0-1). Default: 0 */
  threshold?: number | number[]
  /** Only trigger once */
  once?: boolean
  /** Whether the hook is enabled (default: true). Useful for SSR safety. */
  enabled?: boolean
}

interface UseLazyRenderReturn {
  /** Ref to attach to the container element */
  ref: React.RefObject<HTMLDivElement | null>
  /** Whether the element is currently visible in the viewport */
  isVisible: boolean
}

export function useLazyRender(options: UseLazyRenderOptions = {}): UseLazyRenderReturn {
  const {
    rootMargin = '100px',
    threshold = 0,
    once = true,
    enabled = true,
  } = options

  const ref = useRef<HTMLDivElement | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const entry = entries[0]
      if (entry) {
        const isIntersecting = entry.isIntersecting
        setIsVisible(isIntersecting)

        if (once && isIntersecting && observerRef.current) {
          observerRef.current.unobserve(entry.target)
          observerRef.current.disconnect()
          observerRef.current = null
        }
      }
    },
    [once]
  )

  useEffect(() => {
    if (!enabled) return
    if (!ref.current) return

    // Skip IntersectionObserver for servers — mark visible after mount
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      // Use queueMicrotask to avoid synchronous setState in effect
      queueMicrotask(() => setIsVisible(true))
      return
    }

    observerRef.current = new IntersectionObserver(handleIntersection, {
      rootMargin,
      threshold,
    })

    observerRef.current.observe(ref.current)

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
    }
  }, [enabled, rootMargin, threshold, handleIntersection])

  return { ref, isVisible }
}

/**
 * useLazyRenderWithDelay - Like useLazyRender but with an optional delay
 * after becoming visible before showing content. Useful for staggering
 * loads of multiple heavy components.
 */
export function useLazyRenderWithDelay(
  options: UseLazyRenderOptions & { delay?: number } = {}
): UseLazyRenderReturn {
  const { delay = 0, ...lazyOptions } = options
  const { ref, isVisible: rawIsVisible } = useLazyRender(lazyOptions)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (rawIsVisible) {
      if (delay <= 0) {
        queueMicrotask(() => setIsVisible(true))
      } else {
        const timer = setTimeout(() => setIsVisible(true), delay)
        return () => clearTimeout(timer)
      }
    }
  }, [rawIsVisible, delay])

  return { ref, isVisible }
}
