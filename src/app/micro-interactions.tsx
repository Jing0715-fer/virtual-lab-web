'use client'

/**
 * Micro-Interactions Collection — A comprehensive pack of polished
 * micro-interaction components for the Virtual Lab platform.
 *
 * Components:
 *   - MagneticButton: Apple-style magnetic cursor-following button
 *   - RippleEffect: Material-design expanding ripple on click
 *   - MorphingIcon: SVG path morphing between two icon states
 *   - CountUpNumber: Animated number counter with easing
 *   - TypewriterText: Typewriter effect with cursor blink
 *   - ShimmerButton: Animated shimmer/shine sweeping button
 *
 * All use framer-motion for smooth animations and respect prefers-reduced-motion.
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from 'react'
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
} from 'framer-motion'
import { cn } from '@/lib/utils'

// ============================================================
// MagneticButton — Button that follows cursor within a radius
// ============================================================

interface MagneticButtonProps {
  children: ReactNode
  /** Pull strength 0–1 (default 0.35) */
  magneticStrength?: number
  /** Activation radius in px (default 100) */
  radius?: number
  className?: string
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  [key: string]: unknown
}

export function MagneticButton({
  children,
  magneticStrength = 0.35,
  radius = 100,
  className = '',
  onClick,
  disabled = false,
  ...props
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { damping: 20, stiffness: 250 })
  const springY = useSpring(y, { damping: 20, stiffness: 250 })
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!ref.current || reducedMotion || disabled) return
      const rect = ref.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const dx = e.clientX - centerX
      const dy = e.clientY - centerY
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < radius) {
        const pull = (1 - distance / radius) * magneticStrength
        x.set(dx * pull)
        y.set(dy * pull)
      }
    },
    [radius, magneticStrength, x, y, reducedMotion, disabled]
  )

  const handleMouseLeave = useCallback(() => {
    x.set(0)
    y.set(0)
  }, [x, y])

  return (
    <motion.button
      ref={ref}
      type="button"
      className={cn('magnetic-button-v2 inline-flex items-center justify-center', className)}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  )
}

// ============================================================
// RippleEffect — Material-design ripple on click
// ============================================================

interface RippleEffectProps {
  children: ReactNode
  /** Ripple color (default rgba(16,185,129,0.3)) */
  color?: string
  className?: string
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void
}

interface RippleItem {
  id: number
  x: number
  y: number
  size: number
}

export function RippleEffect({
  children,
  color = 'rgba(16, 185, 129, 0.3)',
  className = '',
  onClick,
}: RippleEffectProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [ripples, setRipples] = useState<RippleItem[]>([])
  const nextId = useRef(0)

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const size = Math.max(rect.width, rect.height) * 2
      const x = e.clientX - rect.left - size / 2
      const y = e.clientY - rect.top - size / 2

      const id = nextId.current++
      setRipples((prev) => [...prev, { id, x, y, size }])

      // Remove ripple after animation
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id))
      }, 600)

      onClick?.(e)
    },
    [onClick]
  )

  return (
    <div
      ref={containerRef}
      className={cn('ripple-container relative overflow-hidden', className)}
      onClick={handleClick}
    >
      {children}
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            className="absolute rounded-full pointer-events-none ripple-wave"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: ripple.size,
              height: ripple.size,
              backgroundColor: color,
            }}
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

// ============================================================
// MorphingIcon — SVG path morphing between states
// ============================================================

interface MorphingIconProps {
  /** SVG path d attribute for "inactive" state */
  from: string
  /** SVG path d attribute for "active" state */
  to: string
  /** Whether the icon is in active state */
  active: boolean
  className?: string
  /** Viewbox size (default 24) */
  size?: number
  /** Stroke color (default currentColor) */
  stroke?: string
  /** Fill color (default none) */
  fill?: string
  /** Stroke width (default 2) */
  strokeWidth?: number
  onClick?: () => void
}

export function MorphingIcon({
  from,
  to,
  active,
  className = '',
  size = 24,
  stroke = 'currentColor',
  fill = 'none',
  strokeWidth = 2,
  onClick,
}: MorphingIconProps) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('morphing-icon cursor-pointer', className)}
      onClick={onClick}
      aria-hidden="true"
    >
      <motion.path
        d={active ? to : from}
        animate={{ d: active ? to : from }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
      />
    </motion.svg>
  )
}

// ============================================================
// CountUpNumber — Animated number counter with easing
// ============================================================

interface CountUpNumberProps {
  /** Target value to count to */
  value: number
  /** Animation duration in ms (default 1500) */
  duration?: number
  /** Text before number (e.g., "$") */
  prefix?: string
  /** Text after number (e.g., "%") */
  suffix?: string
  /** Number of decimal places (default 0) */
  decimals?: number
  className?: string
  /** Trigger animation when in viewport (default true) */
  triggerOnView?: boolean
}

export function CountUpNumber({
  value,
  duration = 1500,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = '',
  triggerOnView = true,
}: CountUpNumberProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const [hasAnimated, setHasAnimated] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const animateTo = useCallback(
    (target: number) => {
      if (reducedMotion) {
        setDisplayValue(target)
        return
      }
      const start = performance.now()
      const from = 0
      const step = (now: number) => {
        const elapsed = now - start
        const progress = Math.min(elapsed / duration, 1)
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3)
        setDisplayValue(from + (target - from) * eased)
        if (progress < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    },
    [duration, reducedMotion]
  )

  // Viewport trigger
  useEffect(() => {
    if (!triggerOnView || !ref.current) {
      animateTo(value)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true)
          animateTo(value)
          observer.unobserve(entry.target)
        }
      },
      { threshold: 0.5 }
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [value, animateTo, triggerOnView, hasAnimated])

  // Animate on value change if already visible
  useEffect(() => {
    if (hasAnimated) {
      animateTo(value)
    }
  }, [value, hasAnimated, animateTo])

  return (
    <span
      ref={ref}
      className={cn('count-up-number inline-block', className)}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {prefix}
      {decimals > 0
        ? displayValue.toFixed(decimals)
        : Math.round(displayValue).toLocaleString()}
      {suffix}
    </span>
  )
}

// ============================================================
// TypewriterText — Typewriter effect with cursor blink
// ============================================================

interface TypewriterTextProps {
  /** Text to type out */
  text: string
  /** Speed per character in ms (default 50) */
  speed?: number
  /** Delay before starting in ms (default 0) */
  delay?: number
  className?: string
  /** Show blinking cursor (default true) */
  cursor?: boolean
  /** Loop the animation (default false) */
  loop?: boolean
  /** Pause at end of text before looping in ms (default 2000) */
  loopPause?: number
}

export function TypewriterText({
  text,
  speed = 50,
  delay = 0,
  className = '',
  cursor = true,
  loop = false,
  loopPause = 2000,
}: TypewriterTextProps) {
  const [displayed, setDisplayed] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const indexRef = useRef(0)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (reducedMotion) {
      setDisplayed(text)
      return
    }

    indexRef.current = 0
    setDisplayed('')

    const startTimeout = setTimeout(() => {
      setIsTyping(true)
    }, delay)

    return () => clearTimeout(startTimeout)
  }, [text, delay, reducedMotion])

  useEffect(() => {
    if (!isTyping || reducedMotion) return

    const interval = setInterval(() => {
      if (indexRef.current < text.length) {
        indexRef.current++
        setDisplayed(text.slice(0, indexRef.current))
      } else {
        setIsTyping(false)
        if (loop) {
          setTimeout(() => {
            indexRef.current = 0
            setDisplayed('')
            setIsTyping(true)
          }, loopPause)
        }
      }
    }, speed)

    return () => clearInterval(interval)
  }, [isTyping, text, speed, loop, loopPause, reducedMotion])

  return (
    <span className={cn('typewriter-text', className)}>
      {displayed}
      {cursor && (
        <motion.span
          className="typewriter-cursor-v2 inline-block ml-0.5 font-light"
          aria-hidden="true"
          animate={{ opacity: [1, 0, 1] }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'steps(2)',
          }}
        >
          |
        </motion.span>
      )}
    </span>
  )
}

// ============================================================
// ShimmerButton — Button with animated shimmer/shine effect
// ============================================================

interface ShimmerButtonProps {
  children: ReactNode
  /** Shimmer color (default rgba(255,255,255,0.15)) */
  shimmerColor?: string
  className?: string
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  [key: string]: unknown
}

export function ShimmerButton({
  children,
  shimmerColor = 'rgba(255, 255, 255, 0.15)',
  className = '',
  onClick,
  disabled = false,
  ...props
}: ShimmerButtonProps) {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return (
    <motion.button
      type="button"
      className={cn(
        'shimmer-button-v2 relative overflow-hidden inline-flex items-center justify-center',
        className
      )}
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      transition={{ duration: 0.2 }}
      {...props}
    >
      {/* Shimmer sweep overlay */}
      {!reducedMotion && (
        <motion.div
          className="absolute inset-0 pointer-events-none shimmer-sweep"
          style={{
            background: `linear-gradient(
              105deg,
              transparent 30%,
              ${shimmerColor} 45%,
              ${shimmerColor} 55%,
              transparent 70%
            )`,
          }}
          animate={{ x: ['-100%', '100%'] }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: 'linear',
            repeatDelay: 1.5,
          }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </motion.button>
  )
}

export default MagneticButton
