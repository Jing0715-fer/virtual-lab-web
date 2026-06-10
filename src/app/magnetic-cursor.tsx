'use client'

/**
 * Magnetic Cursor Effect — Elements that subtly attract toward the mouse cursor.
 *
 * Exports:
 *   - useMagneticEffect(ref, options)  — Hook that applies magnetic pull to any element
 *   - MagneticButton                   — Button with magnetic cursor-following
 *   - MagneticCard                     — Card with magnetic cursor-following
 *
 * Uses requestAnimationFrame for smooth 60fps performance.
 * Respects prefers-reduced-motion — disables in reduced motion mode.
 */

import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  type RefObject,
  type ReactNode,
  type CSSProperties,
} from 'react'
import { cn } from '@/lib/utils'

/* ─── Types ─── */

export interface MagneticOptions {
  /** Pull strength 0–0.5 (default 0.3). Higher = stronger pull. */
  strength?: number
  /** Activation threshold distance in px (50–200, default 120). */
  threshold?: number
  /** Spring damping factor (0.1–0.95, default 0.85). Higher = more damping. */
  springDamping?: number
  /** Spring stiffness (0.01–0.5, default 0.15). */
  springStiffness?: number
  /** Whether the effect is enabled (default true). */
  enabled?: boolean
}

export interface UseMagneticReturn {
  /** Inline style to apply to the element. */
  style: CSSProperties
  /** Event handlers to attach to the element. */
  handlers: {
    onMouseMove: (e: React.MouseEvent) => void
    onMouseLeave: () => void
  }
}

/* ─── Shared reduced-motion check ─── */

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

/* ─── useMagneticEffect Hook ─── */

export function useMagneticEffect(
  ref: RefObject<HTMLElement | null>,
  options: MagneticOptions = {}
): UseMagneticReturn {
  const {
    strength = 0.3,
    threshold = 120,
    springDamping = 0.85,
    springStiffness = 0.15,
    enabled = true,
  } = options

  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const velocityRef = useRef({ x: 0, y: 0 })
  const targetRef = useRef({ x: 0, y: 0 })
  const isHoveringRef = useRef(false)
  const frameRef = useRef<number>(0)
  const reducedMotion = usePrefersReducedMotion()

  // Physics simulation loop
  useEffect(() => {
    if (reducedMotion || !enabled) return

    const animate = () => {
      const vx = (targetRef.current.x - offset.x) * springStiffness
      const vy = (targetRef.current.y - offset.y) * springStiffness

      velocityRef.current.x = velocityRef.current.x * springDamping + vx
      velocityRef.current.y = velocityRef.current.y * springDamping + vy

      const newX = offset.x + velocityRef.current.x
      const newY = offset.y + velocityRef.current.y

      // Snap to zero if close enough and not hovering
      if (!isHoveringRef.current) {
        const totalVel = Math.abs(velocityRef.current.x) + Math.abs(velocityRef.current.y)
        if (totalVel < 0.1 && Math.abs(newX) < 0.5 && Math.abs(newY) < 0.5) {
          velocityRef.current.x = 0
          velocityRef.current.y = 0
          setOffset({ x: 0, y: 0 })
          targetRef.current.x = 0
          targetRef.current.y = 0
          return
        }
      }

      setOffset({ x: newX, y: newY })
      frameRef.current = requestAnimationFrame(animate)
    }

    frameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameRef.current)
  }, [offset, reducedMotion, enabled, springDamping, springStiffness])

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!ref.current || reducedMotion || !enabled) return

      const rect = ref.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const dx = e.clientX - centerX
      const dy = e.clientY - centerY
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < threshold) {
        const factor = (1 - distance / threshold) * strength
        targetRef.current.x = dx * factor
        targetRef.current.y = dy * factor
      }
    },
    [ref, threshold, strength, reducedMotion, enabled]
  )

  const onMouseLeave = useCallback(() => {
    isHoveringRef.current = false
    targetRef.current.x = 0
    targetRef.current.y = 0
  }, [])

  const style: CSSProperties = {
    transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
    willChange: 'transform',
    transition: 'none',
  }

  return { style, handlers: { onMouseMove, onMouseLeave } }
}

/* ─── MagneticButton Component ─── */

export interface MagneticButtonProps {
  children: ReactNode
  className?: string
  strength?: number
  threshold?: number
  springDamping?: number
  disabled?: boolean
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  type?: 'button' | 'submit' | 'reset'
  [key: string]: unknown
}

export function MagneticButton({
  children,
  className,
  strength = 0.3,
  threshold = 100,
  springDamping = 0.85,
  disabled = false,
  onClick,
  type = 'button',
  ...rest
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const { style, handlers } = useMagneticEffect(ref, {
    strength,
    threshold,
    springDamping,
    enabled: !disabled,
  })

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={cn(
        'mi-magnetic-element inline-flex items-center justify-center rounded-lg px-5 py-2.5 font-medium',
        'bg-emerald-600 text-white shadow-md shadow-emerald-500/20',
        'hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/30',
        'active:scale-[0.97] transition-colors duration-200',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500',
        disabled && 'opacity-50 pointer-events-none',
        className
      )}
      style={style}
      onClick={onClick}
      {...handlers}
      {...rest}
    >
      {children}
    </button>
  )
}

/* ─── MagneticCard Component ─── */

export interface MagneticCardProps {
  children: ReactNode
  className?: string
  strength?: number
  threshold?: number
  springDamping?: number
  as?: 'div' | 'article' | 'section'
  [key: string]: unknown
}

export function MagneticCard({
  children,
  className,
  strength = 0.15,
  threshold = 150,
  springDamping = 0.9,
  as: Tag = 'div',
  ...rest
}: MagneticCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { style, handlers } = useMagneticEffect(ref, {
    strength,
    threshold,
    springDamping,
    springStiffness: 0.08,
  })

  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      className={cn(
        'mi-magnetic-element rounded-xl border border-[var(--vl-border)] bg-[var(--vl-bg-card)] p-6',
        'shadow-sm hover:shadow-md transition-shadow duration-300',
        className
      )}
      style={style}
      {...handlers}
      {...rest}
    >
      {children}
    </Tag>
  )
}
