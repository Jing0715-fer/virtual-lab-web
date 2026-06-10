'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ============================================================
// CustomCursor — Main dot + trailing circle + click ripple + hover grow
// ============================================================

export function CustomCursor() {
  const [position, setPosition] = useState({ x: -100, y: -100 })
  const [trailPosition, setTrailPosition] = useState({ x: -100, y: -100 })
  const [isHovering, setIsHovering] = useState(false)
  const [clickRipples, setClickRipples] = useState<{ id: number; x: number; y: number }[]>([])
  const [isVisible, setIsVisible] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const frameRef = useRef<number>(0)
  const trailRef = useRef({ x: -100, y: -100 })

  useEffect(() => {
    requestAnimationFrame(() => {
      setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      setIsDesktop(window.matchMedia('(hover: hover) and (pointer: fine)').matches)
    })
  }, [])

  useEffect(() => {
    if (!isDesktop || reducedMotion) return

    const onMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY })
      setIsVisible(true)
      // Smooth trail follow via animation frame
      const animate = () => {
        trailRef.current.x += (e.clientX - trailRef.current.x) * 0.15
        trailRef.current.y += (e.clientY - trailRef.current.y) * 0.15
        setTrailPosition({ x: trailRef.current.x, y: trailRef.current.y })
        frameRef.current = requestAnimationFrame(animate)
      }
      cancelAnimationFrame(frameRef.current)
      frameRef.current = requestAnimationFrame(animate)
    }

    const onMouseLeave = () => setIsVisible(false)
    const onMouseEnter = () => setIsVisible(true)

    const onClick = (e: MouseEvent) => {
      const id = Date.now()
      setClickRipples(prev => [...prev, { id, x: e.clientX, y: e.clientY }])
      setTimeout(() => setClickRipples(prev => prev.filter(r => r.id !== id)), 600)
    }

    // Detect hover over interactive elements
    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('a, button, [role="button"], input, select, textarea, [data-cursor-hover], .vl-card, .cursor-interactive')) {
        setIsHovering(true)
      }
    }
    const onMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('a, button, [role="button"], input, select, textarea, [data-cursor-hover], .vl-card, .cursor-interactive')) {
        setIsHovering(false)
      }
    }

    window.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseleave', onMouseLeave)
    document.addEventListener('mouseenter', onMouseEnter)
    window.addEventListener('click', onClick)
    window.addEventListener('mouseover', onMouseOver)
    window.addEventListener('mouseout', onMouseOut)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseleave', onMouseLeave)
      document.removeEventListener('mouseenter', onMouseEnter)
      window.removeEventListener('click', onClick)
      window.removeEventListener('mouseover', onMouseOver)
      window.removeEventListener('mouseout', onMouseOut)
      cancelAnimationFrame(frameRef.current)
    }
  }, [isDesktop, reducedMotion])

  if (!isDesktop || reducedMotion || !isVisible) return null

  return (
    <div className="custom-cursor-container pointer-events-none fixed inset-0 z-[9999]" aria-hidden="true">
      {/* Main dot */}
      <motion.div
        className="cursor-dot"
        animate={{
          x: position.x - 4,
          y: position.y - 4,
          scale: isHovering ? 1.5 : 1,
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 28, mass: 0.5 }}
      />
      {/* Trail circle */}
      <motion.div
        className="cursor-trail"
        animate={{
          x: trailPosition.x - 16,
          y: trailPosition.y - 16,
          scale: isHovering ? 1.8 : 1,
          opacity: isHovering ? 0.6 : 0.3,
        }}
        transition={{ type: 'spring', stiffness: 150, damping: 15, mass: 0.8 }}
      />
      {/* Click ripples */}
      <AnimatePresence>
        {clickRipples.map(ripple => (
          <motion.div
            key={ripple.id}
            className="cursor-click-ripple"
            initial={{ x: ripple.x - 20, y: ripple.y - 20, scale: 0.5, opacity: 0.6 }}
            animate={{ scale: 2.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

// ============================================================
// CursorTrail — Particle trail following cursor movement (CSS-based)
// ============================================================

export function CursorTrail() {
  const [trail, setTrail] = useState<{ id: number; x: number; y: number }[]>([])
  const [reducedMotion, setReducedMotion] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const trailIdRef = useRef(0)
  const throttleRef = useRef(0)

  useEffect(() => {
    requestAnimationFrame(() => {
      setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      setIsDesktop(window.matchMedia('(hover: hover) and (pointer: fine)').matches)
    })
  }, [])

  useEffect(() => {
    if (!isDesktop || reducedMotion) return

    const onMouseMove = (e: MouseEvent) => {
      const now = Date.now()
      if (now - throttleRef.current < 30) return // ~33fps throttle
      throttleRef.current = now

      const id = trailIdRef.current++
      setTrail(prev => [...prev.slice(-11), { id, x: e.clientX, y: e.clientY }])

      // Auto-remove after animation
      setTimeout(() => {
        setTrail(prev => prev.filter(p => p.id !== id))
      }, 800)
    }

    window.addEventListener('mousemove', onMouseMove)
    return () => window.removeEventListener('mousemove', onMouseMove)
  }, [isDesktop, reducedMotion])

  if (!isDesktop || reducedMotion) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[9998]" aria-hidden="true">
      {trail.map((point, i) => {
        const opacity = ((i + 1) / trail.length) * 0.5
        const size = 3 + (i / trail.length) * 5
        return (
          <div
            key={point.id}
            className="cursor-trail-particle"
            style={{
              left: point.x - size / 2,
              top: point.y - size / 2,
              width: size,
              height: size,
              opacity,
              animationDelay: `${i * 20}ms`,
            }}
          />
        )
      })}
    </div>
  )
}

// ============================================================
// ClickRipple — Material-design radial ripple on click
// ============================================================

export function ClickRipple({ children }: { children: React.ReactNode }) {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  const onClick = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const id = Date.now()
    setRipples(prev => [...prev, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }])
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 700)
  }, [])

  return (
    <div ref={containerRef} className="click-ripple-container relative overflow-hidden" onClick={onClick}>
      {children}
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="click-ripple-effect"
          style={{ left: ripple.x, top: ripple.y }}
        />
      ))}
    </div>
  )
}

// ============================================================
// HoverGlow — Cursor-following glow on card hover
// ============================================================

export function HoverGlow({ children, glowColor = 'rgba(16, 185, 129, 0.12)' }: { children: React.ReactNode; glowColor?: string }) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }, [])

  return (
    <div
      ref={containerRef}
      className="hover-glow-container relative overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={onMouseMove}
    >
      {isHovered && (
        <div
          className="cursor-glow-effect pointer-events-none absolute inset-0 rounded-xl transition-opacity duration-300"
          style={{
            background: `radial-gradient(300px circle at ${mousePos.x}px ${mousePos.y}px, ${glowColor}, transparent 70%)`,
            opacity: isHovered ? 1 : 0,
          }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  )
}
