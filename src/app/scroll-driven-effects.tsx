'use client'

/**
 * Scroll-Driven Animation Components
 *
 * Provides a suite of scroll-driven animation components and hooks that
 * respond to scroll position, intersection, and viewport entry. All use
 * IntersectionObserver and scroll events for performant rendering.
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from 'react'

// ============================================================
// useScrollProgress — Returns scroll progress 0-1 for a given element
// ============================================================

export function useScrollProgress(ref: React.RefObject<HTMLElement | null>): number {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const handleScroll = () => {
      const rect = el.getBoundingClientRect()
      const windowHeight = window.innerHeight
      const elementTop = rect.top
      const elementHeight = rect.height

      // Progress from element entering viewport bottom to leaving viewport top
      const start = windowHeight
      const end = -elementHeight
      const range = start - end
      const current = start - elementTop

      setProgress(Math.max(0, Math.min(1, current / range)))
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [ref])

  return progress
}

// ============================================================
// useIntersectionProgress — Returns intersection progress 0-1
// ============================================================

export function useIntersectionProgress(
  ref: React.RefObject<HTMLElement | null>,
  threshold: number = 0.5
): { isInView: boolean; progress: number } {
  const [isInView, setIsInView] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting)
        setProgress(entry.isIntersecting ? 1 : 0)
      },
      { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0] }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [ref, threshold])

  return { isInView, progress }
}

// ============================================================
// ScrollRevealSection — Fades/slides in based on scroll position
// ============================================================

export function ScrollRevealSection({
  children,
  direction = 'up',
  delay = 0,
  stagger = false,
  staggerDelay = 0.05,
  className = '',
  threshold = 0.15,
}: {
  children: ReactNode
  direction?: 'up' | 'down' | 'left' | 'right'
  delay?: number
  stagger?: boolean
  staggerDelay?: number
  className?: string
  threshold?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(el)
        }
      },
      { threshold, rootMargin: '0px 0px -40px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  const directionClasses: Record<string, string> = {
    up: 'scroll-reveal-up',
    down: 'scroll-reveal-down',
    left: 'scroll-reveal-left',
    right: 'scroll-reveal-right',
  }

  const baseClass = directionClasses[direction] || directionClasses.up

  if (stagger) {
    return (
      <div ref={ref} className={className}>
        {React.Children.map(children, (child, i) => (
          <div
            key={i}
            className={`${baseClass} stagger-${Math.min(i + 1, 8)}`}
            style={{
              transitionDelay: `${delay + i * staggerDelay}s`,
            }}
          >
            <div className={isVisible ? 'scroll-reveal-visible' : ''}>{child}</div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      ref={ref}
      className={`${baseClass} ${isVisible ? 'scroll-reveal-visible' : ''} ${className}`}
      style={{ transitionDelay: `${delay}s` }}
    >
      {children}
    </div>
  )
}

// ============================================================
// ScrollParallaxLayer — Parallax movement layer on scroll
// ============================================================

export function ScrollParallaxLayer({
  children,
  speed = 0.5,
  direction = 'vertical',
  className = '',
}: {
  children: ReactNode
  speed?: number
  direction?: 'vertical' | 'horizontal'
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const handleScroll = () => {
      const rect = el.getBoundingClientRect()
      const centerY = rect.top + rect.height / 2
      const viewCenter = window.innerHeight / 2
      const delta = (centerY - viewCenter) * speed

      setOffset(delta)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [speed])

  const transform =
    direction === 'horizontal'
      ? `translateX(${offset}px)`
      : `translateY(${offset * -1}px)`

  return (
    <div
      ref={ref}
      className={className}
      style={{
        transform,
        willChange: 'transform',
        contain: 'layout style paint',
      }}
    >
      {children}
    </div>
  )
}

// ============================================================
// ScrollProgressBar — Thin gradient progress bar at top of viewport
// ============================================================

export function ScrollProgressBar({
  height = 3,
  gradient = 'linear-gradient(90deg, #10b981, #06b6d4, #8b5cf6)',
  zIndex = 9999,
  className = '',
}: {
  height?: number
  gradient?: string
  zIndex?: number
  className?: string
}) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      setProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div
      className={`scroll-progress-bar ${className}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: `${height}px`,
        width: '100%',
        zIndex,
        background: 'transparent',
        pointerEvents: 'none',
      }}
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Page scroll progress"
    >
      <div
        style={{
          height: '100%',
          width: `${progress}%`,
          background: gradient,
          transformOrigin: 'left',
          transition: 'width 0.1s linear',
          borderRadius: `0 ${height}px ${height}px 0`,
        }}
      />
    </div>
  )
}

// ============================================================
// ScrollMorphText — Text that morphs/transforms as user scrolls past
// ============================================================

export function ScrollMorphText({
  children,
  className = '',
  minScale = 0.85,
  maxScale = 1.1,
  minSpacing = '-0.02em',
  maxSpacing = '0.1em',
  minOpacity = 0.4,
}: {
  children: ReactNode
  className?: string
  minScale?: number
  maxScale?: number
  minSpacing?: string
  maxSpacing?: string
  minOpacity?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const progress = useScrollProgress(ref)

  // Morph peaks at center of viewport (progress ~ 0.5)
  const centeredProgress = 1 - Math.abs(progress - 0.5) * 2

  const scale = minScale + (maxScale - minScale) * centeredProgress
  const opacity = minOpacity + (1 - minOpacity) * Math.min(progress * 3, 1)
  const letterSpacing = centeredProgress > 0.5 ? maxSpacing : minSpacing

  return (
    <div
      ref={ref}
      className={`scroll-morph ${className}`}
      style={{
        fontSize: `${scale}em`,
        letterSpacing,
        opacity,
        transform: `scale(${scale})`,
        willChange: 'transform, opacity, font-size, letter-spacing',
      }}
    >
      {children}
    </div>
  )
}

// ============================================================
// StaggeredGrid — Grid items animate in with staggered delays
// ============================================================

export function StaggeredGrid({
  children,
  columns = 3,
  staggerDelay = 0.08,
  animationDuration = 0.5,
  direction = 'up',
  className = '',
  threshold = 0.1,
}: {
  children: ReactNode
  columns?: number
  staggerDelay?: number
  animationDuration?: number
  direction?: 'up' | 'down' | 'left' | 'right'
  className?: string
  threshold?: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const childArray = React.Children.toArray(children)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(el)
        }
      },
      { threshold, rootMargin: '0px 0px -20px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  const getInitialTransform = (dir: string): string => {
    switch (dir) {
      case 'up': return 'translateY(20px)'
      case 'down': return 'translateY(-20px)'
      case 'left': return 'translateX(20px)'
      case 'right': return 'translateX(-20px)'
      default: return 'translateY(20px)'
    }
  }

  const colClass = columns === 2
    ? 'grid-cols-1 sm:grid-cols-2'
    : columns === 4
      ? 'grid-cols-2 sm:grid-cols-4'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'

  return (
    <div ref={containerRef} className={`grid ${colClass} gap-4 ${className}`}>
      {childArray.map((child, i) => (
        <div
          key={i}
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translate(0, 0)' : getInitialTransform(direction),
            transition: `opacity ${animationDuration}s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * staggerDelay}s, transform ${animationDuration}s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * staggerDelay}s`,
          }}
        >
          {child}
        </div>
      ))}
    </div>
  )
}
