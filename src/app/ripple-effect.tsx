'use client'

/**
 * Ripple Effect System — Comprehensive expanding ripple for buttons and interactive elements.
 *
 * Exports:
 *   - useRipple(config?)   — Hook that attaches ripple behavior to any element ref
 *   - RippleButton           — Pre-built button with ripple on click
 *   - withRipple             — Higher-order component that adds ripple to any component
 *
 * Uses pure CSS @keyframes animations (mi-ripple-expand) for GPU-accelerated performance.
 * Supports rapid clicks with multiple concurrent ripples, configurable color/duration/size.
 */

import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { cn } from '@/lib/utils'

/* ─── Types ─── */

export interface RippleConfig {
  /** Ripple color. Defaults to emerald-500 at 30% opacity, or agent color via CSS variable. */
  color?: string
  /** Animation duration in ms (300–800, default 600). */
  duration?: number
  /** Max ripple diameter in px. If 0, auto-calculated from element size. */
  maxSize?: number
  /** Opacity of the ripple at peak (0–1, default 0.55). */
  opacity?: number
}

interface RippleEntry {
  id: number
  x: number
  y: number
  size: number
  duration: number
  color: string
  opacity: number
}

export interface UseRippleReturn {
  /** Ref to attach to the container element. */
  ref: React.RefObject<HTMLDivElement>
  /** Inline styles for the ripple container. */
  containerStyle: CSSProperties
  /** JSX ripple elements to render inside the container. */
  ripples: ReactNode
  /** Handler to call on pointerdown / click. */
  onPointerDown: (e: ReactMouseEvent<HTMLDivElement>) => void
}

/* ─── Helpers ─── */

let nextRippleId = 0

function getComputedColor(el: HTMLElement, configuredColor?: string): string {
  if (configuredColor) return configuredColor
  const style = getComputedStyle(el)
  const accent = style.getPropertyValue('--vl-accent').trim() || '#10b981'
  return accent
}

/* ─── useRipple Hook ─── */

export function useRipple(config: RippleConfig = {}): UseRippleReturn {
  const { color, duration = 600, maxSize = 0, opacity = 0.55 } = config
  const ref = useRef<HTMLDivElement>(null!)
  const [entries, setEntries] = useState<RippleEntry[]>([])
  const timeoutsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const onPointerDown = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      const el = ref.current
      if (!el) return

      const rect = el.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      // Size: diagonal of the element, or maxSize if set
      const diag = Math.sqrt(rect.width ** 2 + rect.height ** 2)
      const size = maxSize > 0 ? maxSize : diag * 2

      const resolvedColor = getComputedColor(el, color)

      const id = nextRippleId++
      setEntries(prev => [...prev, { id, x, y, size, duration, color: resolvedColor, opacity }])

      const timeout = setTimeout(() => {
        setEntries(prev => prev.filter(r => r.id !== id))
        timeoutsRef.current.delete(id)
      }, duration + 50)
      timeoutsRef.current.set(id, timeout)
    },
    [color, duration, maxSize, opacity]
  )

  // Cleanup on unmount
  useEffect(() => {
    const map = timeoutsRef.current
    return () => {
      map.forEach(t => clearTimeout(t))
      map.clear()
    }
  }, [])

  const containerStyle: CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    isolation: 'isolate' as unknown as string,
  }

  const ripples = (
    <>
      {entries.map(entry => (
        <span
          key={entry.id}
          className="mi-ripple-wave"
          style={
            {
              left: entry.x,
              top: entry.y,
              width: entry.size,
              height: entry.size,
              '--mi-ripple-duration': `${entry.duration}ms`,
              backgroundColor: entry.color,
              opacity: entry.opacity,
            } as CSSProperties
          }
        />
      ))}
    </>
  )

  return { ref, containerStyle, ripples, onPointerDown }
}

/* ─── RippleButton Component ─── */

export interface RippleButtonProps {
  children: ReactNode
  className?: string
  color?: string
  duration?: number
  disabled?: boolean
  onClick?: (e: ReactMouseEvent<HTMLButtonElement>) => void
  type?: 'button' | 'submit' | 'reset'
  [key: string]: unknown
}

export function RippleButton({
  children,
  className,
  color,
  duration = 600,
  disabled = false,
  onClick,
  type = 'button',
  ...rest
}: RippleButtonProps) {
  const { containerStyle, ripples, onPointerDown } = useRipple({ color, duration })

  const handleClick = useCallback(
    (e: ReactMouseEvent<HTMLButtonElement>) => {
      onPointerDown(e as unknown as ReactMouseEvent<HTMLDivElement>)
      onClick?.(e)
    },
    [onPointerDown, onClick]
  )

  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        'mi-ripple-container inline-flex items-center justify-center rounded-lg px-4 py-2 font-medium transition-all duration-200',
        'bg-emerald-600 text-white hover:bg-emerald-500 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500',
        disabled && 'opacity-50 pointer-events-none',
        className
      )}
      style={containerStyle}
      onClick={handleClick}
      {...rest}
    >
      <span className="relative z-10">{children}</span>
      {ripples}
    </button>
  )
}

/* ─── withRipple HOC ─── */

export interface WithRippleProps {
  rippleColor?: string
  rippleDuration?: number
}

export function withRipple<P extends Record<string, unknown>>(
  WrappedComponent: React.ComponentType<P & WithRippleProps>
): React.FC<Omit<P, 'rippleColor' | 'rippleDuration'> & RippleConfig> {
  const WithRippleComponent: React.FC<Omit<P, 'rippleColor' | 'rippleDuration'> & RippleConfig> = (
    props
  ) => {
    const { color, duration, ...rest } = props
    const { containerStyle, ripples, onPointerDown } = useRipple({ color, duration })

    return (
      <div style={containerStyle} onClick={onPointerDown as never}>
        <WrappedComponent {...((rest as unknown) as P & WithRippleProps)} />
        {ripples}
      </div>
    )
  }

  WithRippleComponent.displayName = `WithRipple(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`

  return WithRippleComponent
}
