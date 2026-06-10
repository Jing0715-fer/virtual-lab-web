'use client'

import React, { useState, useEffect, useRef, type ReactNode } from 'react'

// ============================================================
// GradientOrbs — Floating gradient orbs behind content
// ============================================================
export function GradientOrbs({ className = '' }: { className?: string }) {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    requestAnimationFrame(() => { setReducedMotion(mq.matches) })
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const orbs = [
    { color: 'rgba(16, 185, 129, 0.12)', size: 320, top: '10%', left: '5%', animDelay: '0s', animDuration: '18s' },
    { color: 'rgba(6, 182, 212, 0.10)', size: 260, top: '50%', right: '8%', animDelay: '-5s', animDuration: '22s' },
    { color: 'rgba(139, 92, 246, 0.08)', size: 380, bottom: '5%', left: '30%', animDelay: '-10s', animDuration: '25s' },
    { color: 'rgba(245, 158, 11, 0.06)', size: 200, top: '25%', right: '25%', animDelay: '-7s', animDuration: '20s' },
    { color: 'rgba(16, 185, 129, 0.07)', size: 280, bottom: '20%', right: '5%', animDelay: '-14s', animDuration: '28s' },
  ]

  return (
    <div className={`gradient-orbs-container pointer-events-none fixed inset-0 z-0 overflow-hidden mix-blend-screen ${className}`} aria-hidden="true">
      {orbs.map((orb, i) => (
        <div
          key={i}
          className="gradient-orb"
          style={{
            position: 'absolute',
            width: orb.size,
            height: orb.size,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${orb.color}, transparent 70%)`,
            top: orb.top,
            left: orb.left,
            right: orb.right,
            bottom: orb.bottom,
            filter: 'blur(60px)',
            animation: reducedMotion ? 'none' : `gradient-orb-float-${(i % 3) + 1} ${orb.animDuration} ease-in-out ${orb.animDelay} infinite`,
            willChange: 'transform, opacity',
          }}
        />
      ))}
    </div>
  )
}

// ============================================================
// GridPattern — Subtle animated grid background
// ============================================================
export function GridPattern({
  variant = 'lines',
  animated = false,
  className = '',
}: {
  variant?: 'lines' | 'dots'
  animated?: boolean
  className?: string
}) {
  const [scrollOffset, setScrollOffset] = useState(0)

  useEffect(() => {
    if (!animated) return
    const handleScroll = () => {
      setScrollOffset(window.scrollY * 0.02)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [animated])

  return (
    <div
      className={`grid-pattern grid-pattern-${variant} ${className}`}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        backgroundImage: variant === 'dots'
          ? 'radial-gradient(circle, var(--vl-border) 1px, transparent 1px)'
          : 'linear-gradient(var(--vl-border) 1px, transparent 1px), linear-gradient(90deg, var(--vl-border) 1px, transparent 1px)',
        backgroundSize: variant === 'dots' ? '24px 24px' : '40px 40px',
        backgroundPosition: animated ? `${scrollOffset}px ${scrollOffset}px` : '0 0',
        opacity: 0.15,
        transition: animated ? 'none' : undefined,
      }}
      aria-hidden="true"
    />
  )
}

// ============================================================
// NoiseTexture — SVG noise/grain overlay
// ============================================================
export function NoiseTexture({ className = '' }: { className?: string }) {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    requestAnimationFrame(() => { setReducedMotion(mq.matches) })
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  if (reducedMotion) return null

  return (
    <div className={`noise-texture ${className}`} aria-hidden="true">
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.04 }}>
        <filter id="noise-filter">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noise-filter)" />
      </svg>
    </div>
  )
}

// ============================================================
// AuroraEffect — Northern lights / aurora background effect
// ============================================================
export function AuroraEffect({ className = '' }: { className?: string }) {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    requestAnimationFrame(() => { setReducedMotion(mq.matches) })
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return (
    <div className={`aurora-container pointer-events-none absolute inset-0 z-0 overflow-hidden ${className}`} aria-hidden="true">
      <div className="aurora-band aurora-band-1" style={{ animation: reducedMotion ? 'none' : 'aurora-shift-1 12s ease-in-out infinite' }} />
      <div className="aurora-band aurora-band-2" style={{ animation: reducedMotion ? 'none' : 'aurora-shift-2 15s ease-in-out infinite' }} />
      <div className="aurora-band aurora-band-3" style={{ animation: reducedMotion ? 'none' : 'aurora-shift-3 18s ease-in-out infinite' }} />
    </div>
  )
}

// ============================================================
// DepthBlurLayers — Multi-layer depth effect with parallax
// ============================================================
export function DepthBlurLayers({ className = '' }: { className?: string }) {
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className={`depth-layers pointer-events-none absolute inset-0 z-0 overflow-hidden ${className}`} aria-hidden="true">
      {/* Far layer — most blur, slowest parallax */}
      <div
        className="depth-layer-far"
        style={{
          position: 'absolute',
          inset: '-20%',
          background: 'radial-gradient(ellipse at 30% 40%, rgba(16,185,129,0.04), transparent 60%)',
          filter: 'blur(20px)',
          transform: `translateY(${scrollY * 0.02}px)`,
          willChange: 'transform',
        }}
      />
      {/* Mid layer */}
      <div
        className="depth-layer-mid"
        style={{
          position: 'absolute',
          inset: '-10%',
          background: 'radial-gradient(ellipse at 70% 60%, rgba(6,182,212,0.05), transparent 60%)',
          filter: 'blur(12px)',
          transform: `translateY(${scrollY * 0.04}px)`,
          willChange: 'transform',
        }}
      />
      {/* Near layer — least blur, fastest parallax */}
      <div
        className="depth-layer-near"
        style={{
          position: 'absolute',
          inset: '-5%',
          background: 'radial-gradient(ellipse at 50% 30%, rgba(139,92,246,0.03), transparent 50%)',
          filter: 'blur(6px)',
          transform: `translateY(${scrollY * 0.06}px)`,
          willChange: 'transform',
        }}
      />
    </div>
  )
}
