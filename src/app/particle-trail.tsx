'use client'

/**
 * Particle Trail Effect — Mouse-following particle trail with object pool.
 *
 * Exports:
 *   - ParticleTrail   — Renders floating particles following mouse movement
 *   - useParticleTrail — Hook for programmatic control of the particle system
 *
 * Features:
 *   - Object pool pattern for DOM element reuse (max 50 particles)
 *   - CSS transforms + opacity transitions (no canvas, compositor-friendly)
 *   - Particles spawn on mouse move → fade out over lifetime → return to pool
 *   - Pauses when mouse is idle
 *   - Configurable colors, size, spread, lifetime, count
 *   - Respects prefers-reduced-motion
 */

import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type CSSProperties,
  type ReactNode,
} from 'react'

/* ─── Types ─── */

export interface ParticleConfig {
  /** Max number of live particles (default 50). */
  particleCount?: number
  /** Particle color gradient (from → to, default emerald → cyan). */
  colors?: [string, string]
  /** Min and max particle diameter in px (default [2, 6]). */
  sizeRange?: [number, number]
  /** Particle lifetime in seconds (default 1.5). */
  lifetime?: number
  /** Spread distance from cursor in px (default 30). */
  spread?: number
  /** Minimum mouse movement in px to spawn (default 8). */
  spawnThreshold?: number
  /** Whether the trail is enabled (default true). */
  enabled?: boolean
}

interface ParticleData {
  id: number
  x: number
  y: number
  size: number
  color: string
  lifetime: number
  dx: number
  dy: number
  active: boolean
}

/* ─── Color Interpolation ─── */

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const num = parseInt(clean, 16)
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

function lerpColor(c1: string, c2: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(c1)
  const [r2, g2, b2] = hexToRgb(c2)
  const r = Math.round(r1 + (r2 - r1) * t)
  const g = Math.round(g1 + (g2 - g1) * t)
  const b = Math.round(b1 + (b2 - b1) * t)
  return `rgb(${r},${g},${b})`
}

/* ─── useParticleTrail Hook ─── */

export function useParticleTrail(config: ParticleConfig = {}) {
  const {
    particleCount = 50,
    colors = ['#10b981', '#06b6d4'],
    sizeRange = [2, 6],
    lifetime = 1.5,
    spread = 30,
    spawnThreshold = 8,
    enabled = true,
  } = config

  const [particles, setParticles] = useState<ParticleData[]>([])
  const lastPos = useRef({ x: 0, y: 0 })
  const poolRef = useRef<Map<number, ParticleData>>(new Map())
  const nextId = useRef(0)
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches
  })
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  // Subscribe to media query changes
  useEffect(() => {
    const mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const mqDesktop = window.matchMedia('(hover: hover) and (pointer: fine)')

    const onMotionChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    const onDesktopChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mqMotion.addEventListener('change', onMotionChange)
    mqDesktop.addEventListener('change', onDesktopChange)

    return () => {
      mqMotion.removeEventListener('change', onMotionChange)
      mqDesktop.removeEventListener('change', onDesktopChange)
      timersRef.current.forEach(t => clearTimeout(t))
      timersRef.current.clear()
    }
  }, [])

  const isActive = enabled && isDesktop && !reducedMotion

  // Mouse move handler
  useEffect(() => {
    if (!isActive) return

    const onMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - lastPos.current.x
      const dy = e.clientY - lastPos.current.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < spawnThreshold) return
      lastPos.current = { x: e.clientX, y: e.clientY }

      // Spawn 1-2 particles per move event
      const count = dist > 40 ? 2 : 1

      for (let i = 0; i < count; i++) {
        // Find or recycle a particle slot
        let slotId = -1
        // Check for inactive slots first
        poolRef.current.forEach((p, id) => {
          if (!p.active && slotId === -1) {
            slotId = id
          }
        })

        // If no inactive slots and pool is not full, create new
        if (slotId === -1 && poolRef.current.size < particleCount) {
          slotId = nextId.current++
        }

        if (slotId === -1) return // Pool full

        const t = Math.random()
        const size = sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0])
        const angle = Math.random() * Math.PI * 2
        const distance = Math.random() * spread

        const particle: ParticleData = {
          id: slotId,
          x: e.clientX + Math.cos(angle) * distance * 0.5,
          y: e.clientY + Math.sin(angle) * distance * 0.5,
          size,
          color: lerpColor(colors[0], colors[1], t),
          lifetime,
          dx: Math.cos(angle) * distance * 0.4,
          dy: Math.sin(angle) * distance * 0.4 - 15, // slight upward drift
          active: true,
        }

        poolRef.current.set(slotId, particle)

        // Schedule removal
        const removeTimer = setTimeout(() => {
          poolRef.current.set(slotId, { ...particle, active: false })
          setParticles(prev => {
            const updated = prev.map(p => (p.id === slotId ? { ...p, active: false } : p))
            // Prune inactive particles that have been inactive for a cycle
            return updated.filter(p => p.active)
          })
          timersRef.current.delete(slotId)
        }, lifetime * 1000)
        timersRef.current.set(slotId, removeTimer)

        setParticles(prev => {
          const filtered = prev.filter(p => p.id !== slotId)
          return [...filtered, particle]
        })
      }
    }

    window.addEventListener('mousemove', onMouseMove)
    return () => window.removeEventListener('mousemove', onMouseMove)
  }, [isActive, particleCount, colors, sizeRange, lifetime, spread, spawnThreshold])

  return { particles, isActive }
}

/* ─── ParticleTrail Component ─── */

export interface ParticleTrailProps extends ParticleConfig {
  className?: string
}

export function ParticleTrail({ className, ...config }: ParticleTrailProps) {
  const { particles, isActive } = useParticleTrail(config)

  if (!isActive) return null

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[9997]"
      aria-hidden="true"
      style={{ willChange: 'contents' }}
    >
      {particles.map(p => (
        <div
          key={p.id}
          className="mi-particle mi-particle-spawning"
          style={
            {
              left: p.x - p.size / 2,
              top: p.y - p.size / 2,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              '--mi-particle-dx': `${p.dx}px`,
              '--mi-particle-dy': `${p.dy}px`,
              '--mi-particle-life': `${p.lifetime}s`,
              boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}

export default ParticleTrail
