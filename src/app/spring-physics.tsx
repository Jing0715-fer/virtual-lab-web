'use client'

/**
 * Spring Physics Animation Utilities
 *
 * Provides spring-based animation hooks and components that simulate natural
 * physics motion (mass, tension, friction, velocity) using requestAnimationFrame
 * for smooth 60fps updates. All components use 'use client' for Next.js.
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from 'react'

// ============================================================
// Types
// ============================================================

export interface SpringConfig {
  mass?: number
  tension?: number
  friction?: number
  precision?: number
}

const DEFAULT_SPRING_CONFIG: Required<SpringConfig> = {
  mass: 1,
  tension: 170,
  friction: 26,
  precision: 0.01,
}

// ============================================================
// useSpring — Animate a number value with spring physics
// ============================================================

export function useSpring(
  target: number,
  config?: SpringConfig
): { value: number; isAnimating: boolean } {
  const cfg = { ...DEFAULT_SPRING_CONFIG, ...config }
  const [value, setValue] = useState(target)
  const [isAnimating, setIsAnimating] = useState(false)
  const frameRef = useRef<number>(0)
  const currentRef = useRef(target)
  const velocityRef = useRef(0)

  useEffect(() => {
    currentRef.current = value
  }, [value])

  useEffect(() => {
    let position = currentRef.current
    let velocity = 0
    setIsAnimating(true)

    const step = () => {
      const displacement = position - target
      // Spring force: F = -tension * displacement
      const springForce = -cfg.tension * displacement
      // Damping force: F = -friction * velocity
      const dampingForce = -cfg.friction * velocity
      // Acceleration = Force / mass
      const acceleration = (springForce + dampingForce) / cfg.mass

      velocity += acceleration * (1 / 60)
      position += velocity * (1 / 60)

      if (
        Math.abs(position - target) < cfg.precision &&
        Math.abs(velocity) < cfg.precision
      ) {
        setValue(target)
        velocityRef.current = 0
        setIsAnimating(false)
        return
      }

      setValue(position)
      velocityRef.current = velocity
      frameRef.current = requestAnimationFrame(step)
    }

    frameRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frameRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  return { value, isAnimating }
}

// ============================================================
// useSpringTransform — Spring-based CSS transform animation
// ============================================================

interface TransformTarget {
  x?: number
  y?: number
  scale?: number
  rotate?: number
}

export function useSpringTransform(
  target: TransformTarget,
  config?: SpringConfig
): React.CSSProperties {
  const cfg = { ...DEFAULT_SPRING_CONFIG, ...config }
  const [transform, setTransform] = useState<TransformTarget>({
    x: 0,
    y: 0,
    scale: 1,
    rotate: 0,
  })
  const frameRef = useRef<number>(0)
  const currentRef = useRef<TransformTarget>(transform)
  const velocityRef = useRef<TransformTarget>({
    x: 0,
    y: 0,
    scale: 0,
    rotate: 0,
  })

  useEffect(() => {
    currentRef.current = transform
  }, [transform])

  const defaultTarget: Required<TransformTarget> = {
    x: target.x ?? 0,
    y: target.y ?? 0,
    scale: target.scale ?? 1,
    rotate: target.rotate ?? 0,
  }

  useEffect(() => {
    const keys = ['x', 'y', 'scale', 'rotate'] as const
    const position: Record<string, number> = {
      x: currentRef.current.x ?? 0,
      y: currentRef.current.y ?? 0,
      scale: currentRef.current.scale ?? 1,
      rotate: currentRef.current.rotate ?? 0,
    }
    const velocity: Record<string, number> = {
      x: 0,
      y: 0,
      scale: 0,
      rotate: 0,
    }
    let settled = false

    const step = () => {
      settled = true
      for (const key of keys) {
        const displacement = position[key] - defaultTarget[key]
        const springForce = -cfg.tension * displacement
        const dampingForce = -cfg.friction * velocity[key]
        const acceleration = (springForce + dampingForce) / cfg.mass

        velocity[key] += acceleration * (1 / 60)
        position[key] += velocity[key] * (1 / 60)

        if (
          Math.abs(position[key] - defaultTarget[key]) >= cfg.precision ||
          Math.abs(velocity[key]) >= cfg.precision
        ) {
          settled = false
        }
      }

      setTransform({
        x: position.x,
        y: position.y,
        scale: position.scale,
        rotate: position.rotate,
      })

      if (settled) {
        setTransform({ ...defaultTarget })
        return
      }
      frameRef.current = requestAnimationFrame(step)
    }

    frameRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frameRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultTarget.x, defaultTarget.y, defaultTarget.scale, defaultTarget.rotate])

  return {
    transform: `translate(${transform.x ?? 0}px, ${transform.y ?? 0}px) scale(${transform.scale ?? 1}) rotate(${transform.rotate ?? 0}deg)`,
    willChange: 'transform',
  }
}

// ============================================================
// SpringNumber — Displays a number that springs to target value
// ============================================================

export function SpringNumber({
  value,
  className = '',
  prefix = '',
  suffix = '',
  decimals = 0,
  config,
}: {
  value: number
  className?: string
  prefix?: string
  suffix?: string
  decimals?: number
  config?: SpringConfig
}) {
  const { value: animated, isAnimating } = useSpring(value, config)

  return (
    <span
      className={`spring-number ${isAnimating ? 'spring-ease-out' : ''} ${className}`}
      style={{
        display: 'inline-block',
        fontVariantNumeric: 'tabular-nums',
        transition: isAnimating ? 'none' : 'color 0.2s ease',
      }}
    >
      {prefix}
      {decimals > 0 ? animated.toFixed(decimals) : Math.round(animated).toLocaleString()}
      {suffix}
    </span>
  )
}

// ============================================================
// SpringScale — Applies spring-based scale transform to children
// ============================================================

export function SpringScale({
  children,
  mounted = true,
  scaleOnMount = 1,
  scaleOnUnmount = 0,
  config,
  className = '',
}: {
  children: ReactNode
  mounted?: boolean
  scaleOnMount?: number
  scaleOnUnmount?: number
  config?: SpringConfig
  className?: string
}) {
  const style = useSpringTransform(
    { scale: mounted ? scaleOnMount : scaleOnUnmount },
    config
  )

  return (
    <div className={`spring-scale ${className}`} style={style}>
      {!(mounted === false && scaleOnUnmount === 0) ? children : null}
    </div>
  )
}

// ============================================================
// MagneticButton — Button attracted toward cursor within 80px radius
// ============================================================

export function MagneticButton({
  children,
  className = '',
  radius = 80,
  strength = 0.3,
  as: Component = 'button',
  ...props
}: {
  children: ReactNode
  className?: string
  radius?: number
  strength?: number
  as?: React.ElementType
  [key: string]: unknown
}) {
  const ref = useRef<HTMLElement>(null)
  const frameRef = useRef<number>(0)
  const positionRef = useRef({ x: 0, y: 0 })
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!ref.current) return
      const rect = ref.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const dx = e.clientX - centerX
      const dy = e.clientY - centerY
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < radius) {
        // Inverse distance ratio — closer = stronger pull
        const pull = (1 - distance / radius) * strength
        positionRef.current = {
          x: dx * pull,
          y: dy * pull,
        }
      } else {
        positionRef.current = { x: 0, y: 0 }
      }

      cancelAnimationFrame(frameRef.current)
      frameRef.current = requestAnimationFrame(() => {
        setOffset({ ...positionRef.current })
      })
    },
    [radius, strength]
  )

  const handleMouseLeave = useCallback(() => {
    cancelAnimationFrame(frameRef.current)
    frameRef.current = requestAnimationFrame(() => {
      setOffset({ x: 0, y: 0 })
    })
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(frameRef.current)
    }
  }, [handleMouseMove])

  return (
    <Component
      ref={ref as React.Ref<HTMLElement>}
      className={`magnetic-hover ${className}`}
      style={{
        transform: `translate(${offset.x}px, ${offset.y}px)`,
        transition: 'box-shadow 0.3s ease',
      }}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </Component>
  )
}

// ============================================================
// ParallaxDepth — Depth-based parallax movement from mouse
// ============================================================

export function ParallaxDepth({
  children,
  depth = 3,
  className = '',
  as: Component = 'div',
  maxOffset = 20,
}: {
  children: ReactNode
  depth?: number
  className?: string
  as?: React.ElementType
  maxOffset?: number
}) {
  const clampedDepth = Math.max(1, Math.min(5, depth))
  const depthFactor = clampedDepth * 0.2
  const frameRef = useRef<number>(0)
  const offsetRef = useRef({ x: 0, y: 0 })
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = requestAnimationFrame(() => {
        const centerX = window.innerWidth / 2
        const centerY = window.innerHeight / 2
        const dx = ((e.clientX - centerX) / centerX) * maxOffset * depthFactor
        const dy = ((e.clientY - centerY) / centerY) * maxOffset * depthFactor
        offsetRef.current = { x: dx, y: dy }
        setOffset({ x: dx, y: dy })
      })
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(frameRef.current)
    }
  }, [depthFactor, maxOffset])

  return (
    <Component
      className={`parallax-depth-${clampedDepth} ${className}`}
      style={{
        transform: `translate(${offset.x}px, ${offset.y}px)`,
        willChange: 'transform',
      }}
    >
      {children}
    </Component>
  )
}
