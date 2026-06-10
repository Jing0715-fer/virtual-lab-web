'use client'

/**
 * Text Reveal Animations — Sophisticated text animation components.
 *
 * Exports:
 *   - TextReveal   — Characters / words / sentences animate in on scroll or mount
 *   - TextGlitch   — Brief glitch effect on text (hover or interval triggered)
 *   - TextGradient — Animated gradient text with configurable colors and speed
 *
 * All components are theme-aware and respect prefers-reduced-motion.
 */

import React, {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
  type CSSProperties,
} from 'react'
import { cn } from '@/lib/utils'

/* ─── Shared: Reduced Motion Hook ─── */

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return reduced
}

/* ================================================================
   TextReveal — Characters/words/sentences animate in
   ================================================================ */

export type TextRevealMode = 'characters' | 'words' | 'sentences'
export type TextRevealDirection = 'up' | 'down' | 'left' | 'right'
export type TextRevealTrigger = 'mount' | 'scroll'

export interface TextRevealProps {
  /** The text content to reveal. */
  text: string
  /** Mode: characters (typewriter), words (stagger), sentences (fade-slide). */
  mode?: TextRevealMode
  /** Direction of reveal animation. */
  direction?: TextRevealDirection
  /** Trigger: animate on mount or on scroll into view. */
  trigger?: TextRevealTrigger
  /** Delay per unit in ms (default 30). */
  delay?: number
  /** Stagger multiplier applied to each subsequent unit (default 1). */
  staggerMultiplier?: number
  /** Base animation duration in ms (default 500). */
  duration?: number
  /** IntersectionObserver threshold when trigger=scroll (default 0.3). */
  observerThreshold?: number
  /** HTML tag to render (default 'span'). */
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'div'
  className?: string
  style?: CSSProperties
}

const directionKeyframeMap: Record<TextRevealDirection, string> = {
  up: 'mi-text-reveal-up',
  down: 'mi-text-reveal-down',
  left: 'mi-text-reveal-left',
  right: 'mi-text-reveal-right',
}

export function TextReveal({
  text,
  mode = 'words',
  direction = 'up',
  trigger = 'mount',
  delay = 30,
  staggerMultiplier = 1,
  duration = 500,
  observerThreshold = 0.3,
  as: Tag = 'span',
  className,
  style,
}: TextRevealProps) {
  const ref = useRef<HTMLSpanElement>(null!)
  const [inView, setInView] = useState(trigger === 'mount')
  const reducedMotion = usePrefersReducedMotion()

  // IntersectionObserver for scroll trigger
  useEffect(() => {
    if (trigger !== 'scroll' || !ref.current) return
    const el = ref.current
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.unobserve(el)
        }
      },
      { threshold: observerThreshold }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [trigger, observerThreshold])

  // Split text into units based on mode
  const units = useMemo(() => {
    if (mode === 'characters') return text.split('')
    if (mode === 'words') return text.split(/(\s+)/) // keep whitespace as units
    // sentences: split by period, question mark, exclamation
    return text.match(/[^.!?]*[.!?]+|[^.!?]+$/g) || [text]
  }, [text, mode])

  if (reducedMotion) {
    return (
      <Tag ref={ref as React.Ref<HTMLElement>} className={className} style={style}>
        {text}
      </Tag>
    )
  }

  const kf = directionKeyframeMap[direction]

  return (
    <Tag ref={ref as React.Ref<HTMLElement>} className={className} style={style} aria-label={text}>
      {units.map((unit, i) => {
        const unitDelay = delay * i * staggerMultiplier
        const animName = mode === 'characters' ? 'mi-char-reveal' : kf

        return (
          <span
            key={`${unit}-${i}`}
            className="mi-reveal-unit"
            style={{
              animationName: animName,
              animationDuration: `${duration}ms`,
              animationDelay: `${unitDelay}ms`,
            } as CSSProperties}
          >
            {unit}
          </span>
        )
      })}
    </Tag>
  )
}

/* ================================================================
   TextGlitch — Brief glitch effect on hover or interval
   ================================================================ */

export interface TextGlitchProps {
  /** The text content to display with glitch effect. */
  text: string
  /** Trigger: 'hover' activates on mouse hover, 'interval' triggers periodically. */
  trigger?: 'hover' | 'interval'
  /** Interval duration in ms when trigger=interval (default 4000). */
  intervalDuration?: number
  /** Duration of the glitch animation in ms (default 300). */
  glitchDuration?: number
  /** HTML tag to render (default 'span'). */
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'div'
  className?: string
  style?: CSSProperties
}

export function TextGlitch({
  text,
  trigger = 'hover',
  intervalDuration = 4000,
  glitchDuration = 300,
  as: Tag = 'span',
  className,
  style,
}: TextGlitchProps) {
  const ref = useRef<HTMLSpanElement>(null!)
  const [glitching, setGlitching] = useState(false)
  const reducedMotion = usePrefersReducedMotion()

  // Interval trigger
  useEffect(() => {
    if (trigger !== 'interval' || reducedMotion) return
    const timer = setInterval(() => {
      setGlitching(true)
      setTimeout(() => setGlitching(false), glitchDuration)
    }, intervalDuration)
    return () => clearInterval(timer)
  }, [trigger, intervalDuration, glitchDuration, reducedMotion])

  if (reducedMotion) {
    return (
      <Tag ref={ref as React.Ref<HTMLElement>} className={className} style={style}>
        {text}
      </Tag>
    )
  }

  const isHoverTrigger = trigger === 'hover'

  return (
    <Tag
      ref={ref as React.Ref<HTMLElement>}
      className={cn(isHoverTrigger && 'mi-glitch-hover', className)}
      style={style}
      aria-label={text}
    >
      {/* Base text */}
      <span className="relative">{text}</span>

      {/* Glitch layers — only visible during glitch state for interval trigger */}
      <span
        className="mi-glitch-layer-1"
        aria-hidden="true"
        style={{
          opacity: isHoverTrigger ? undefined : glitching ? 0.8 : 0,
          animationPlayState: isHoverTrigger ? 'paused' : glitching ? 'running' : 'paused',
        }}
      >
        {text}
      </span>
      <span
        className="mi-glitch-layer-2"
        aria-hidden="true"
        style={{
          opacity: isHoverTrigger ? undefined : glitching ? 0.8 : 0,
          animationPlayState: isHoverTrigger ? 'paused' : glitching ? 'running' : 'paused',
        }}
      >
        {text}
      </span>
    </Tag>
  )
}

/* ================================================================
   TextGradient — Animated gradient text
   ================================================================ */

export interface TextGradientProps {
  /** The text content. */
  text: string
  /** Gradient colors (default emerald → cyan → violet → amber → emerald). */
  colors?: string[]
  /** Animation speed in seconds (default 6). */
  speed?: number
  /** Gradient angle direction (default 135). */
  angle?: number
  /** HTML tag to render (default 'span'). */
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'div'
  className?: string
  style?: CSSProperties
}

export function TextGradient({
  text,
  colors,
  speed = 6,
  angle = 135,
  as: Tag = 'span',
  className,
  style,
}: TextGradientProps) {
  const reducedMotion = usePrefersReducedMotion()

  const gradientColors = colors || ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#10b981']

  // Build the percentage stops evenly
  const gradientStops = gradientColors
    .map((c, i) => `${c} ${(i / (gradientColors.length - 1)) * 100}%`)
    .join(', ')

  const gradientBg = `linear-gradient(${angle}deg, ${gradientStops})`

  const textStyle: CSSProperties = reducedMotion
    ? { ...style, WebkitTextFillColor: gradientColors[0] }
    : {
        ...style,
        background: gradientBg,
        backgroundSize: '300% 300%',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        animation: `mi-gradient-shift ${speed}s ease infinite`,
      }

  return (
    <Tag className={cn('mi-text-gradient', reducedMotion && 'mi-text-gradient', className)} style={textStyle}>
      {text}
    </Tag>
  )
}
