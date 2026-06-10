'use client'

import React, { useEffect, useRef, useCallback, type ReactNode, type HTMLAttributes } from 'react'

// ============================================================
// Types
// ============================================================

interface ScrollRevealOptions {
  /** IntersectionObserver threshold (0-1). Default: 0.1 */
  threshold?: number
  /** Root margin for the observer. Default: '0px 0px -50px 0px' */
  rootMargin?: string
  /** If true, element only animates once then stays revealed. Default: true */
  once?: boolean
}

type ScrollRevealDirection = 'up' | 'left' | 'right' | 'scale'

interface ScrollRevealSectionProps extends HTMLAttributes<HTMLDivElement> {
  /** Direction the element should animate from */
  direction?: ScrollRevealDirection
  /** Stagger delay (0-5), maps to .scroll-reveal-delay-{N} */
  delay?: number
  /** Child content */
  children: ReactNode
}

// ============================================================
// useScrollReveal Hook
// ============================================================

export function useScrollReveal(options: ScrollRevealOptions = {}) {
  const {
    threshold = 0.1,
    rootMargin = '0px 0px -50px 0px',
    once = true,
  } = options

  const observerRef = useRef<IntersectionObserver | null>(null)
  const revealedSetRef = useRef<Set<Element>>(new Set())

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement
          // Respect data-scroll-delay attribute for staggered animations
          const delay = el.getAttribute('data-scroll-delay')
          if (delay) {
            el.style.transitionDelay = `${Number(delay) * 0.1}s`
          }
          el.classList.add('revealed')
          revealedSetRef.current.add(el)

          // If once mode, stop observing
          if (once && observerRef.current) {
            observerRef.current.unobserve(el)
          }
        } else if (!once) {
          // Re-hide element when scrolling away (for repeating animations)
          entry.target.classList.remove('revealed')
        }
      })
    },
    [once]
  )

  const disconnect = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }
  }, [])

  const observe = useCallback(() => {
    // Clean up previous observer
    disconnect()

    observerRef.current = new IntersectionObserver(handleIntersect, {
      threshold,
      rootMargin,
    })

    // Find all scroll-reveal elements
    const selector = [
      '.scroll-reveal',
      '.scroll-reveal-left',
      '.scroll-reveal-right',
      '.scroll-reveal-scale',
      '.scroll-reveal-rotate',
    ].join(', ')

    const elements = document.querySelectorAll(selector)
    elements.forEach((el) => {
      // Skip already revealed elements if once mode
      if (once && el.classList.contains('revealed')) return
      observerRef.current?.observe(el)
    })
  }, [handleIntersect, threshold, rootMargin, once, disconnect])

  return { observe, disconnect }
}

// ============================================================
// ScrollRevealProvider
// ============================================================

interface ScrollRevealProviderProps {
  children: ReactNode
  options?: ScrollRevealOptions
}

export function ScrollRevealProvider({ children, options }: ScrollRevealProviderProps) {
  const { observe, disconnect } = useScrollReveal(options)

  useEffect(() => {
    observe()
    return () => disconnect()
  }, [observe, disconnect])

  return <>{children}</>
}

// ============================================================
// ScrollRevealSection Component
// ============================================================

const DIRECTION_CLASS_MAP: Record<ScrollRevealDirection, string> = {
  up: 'scroll-reveal',
  left: 'scroll-reveal-left',
  right: 'scroll-reveal-right',
  scale: 'scroll-reveal-scale',
}

/**
 * A convenience wrapper that applies the correct scroll-reveal class
 * and optional delay class to a div. The parent tab component must call
 * `useScrollReveal()` and render the content inside a `ScrollRevealProvider`
 * (or manually call `observe()` in a useEffect).
 */
export function ScrollRevealSection({
  direction = 'up',
  delay = 0,
  className = '',
  children,
  ...rest
}: ScrollRevealSectionProps) {
  const directionClass = DIRECTION_CLASS_MAP[direction] || DIRECTION_CLASS_MAP.up
  const delayClass = delay > 0 && delay <= 5 ? `scroll-reveal-delay-${delay}` : ''

  return (
    <div
      className={`${directionClass} ${delayClass} ${className}`.trim()}
      data-scroll-delay={delay > 0 ? String(delay) : undefined}
      {...rest}
    >
      {children}
    </div>
  )
}
