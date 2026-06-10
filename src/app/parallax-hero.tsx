'use client'

/**
 * ParallaxHero — Enhanced hero section with multi-layer parallax scrolling,
 * mouse-follow tilt effect, and floating particles that react to cursor position.
 *
 * Wraps existing hero content with 3 depth layers:
 *   Layer 1 (slow): Background pattern
 *   Layer 2 (medium): DNA helix / decorative elements
 *   Layer 3 (fast): Text content (passed as children)
 *
 * Uses framer-motion useScroll, useMotionValue, useSpring, useTransform.
 */

import React, { useRef, useState, useEffect, useCallback, type ReactNode } from 'react'
import { motion, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion'
import { cn } from '@/lib/utils'

// ============================================================
// Types
// ============================================================

interface ParallaxHeroProps {
  children: ReactNode
  /** Background pattern layer (optional — pass custom JSX) */
  backgroundLayer?: ReactNode
  /** Middle decorative layer (e.g. DNA helix particles) */
  middleLayer?: ReactNode
  className?: string
  /** Tilt intensity in degrees (default 6) */
  tiltDeg?: number
  /** Number of floating particles (default 20) */
  particleCount?: number
  /** Particle color (default emerald) */
  particleColor?: string
  /** Parallax speed multipliers per layer [bg, mid, fg] */
  speeds?: [number, number, number]
}

interface Particle {
  id: number
  x: number
  y: number
  size: number
  speed: number
  opacity: number
  delay: number
}

// ============================================================
// FloatingParticles — Reactive particles
// ============================================================

function FloatingParticles({
  count = 20,
  color = 'rgba(16, 185, 129, 0.4)',
  mouseX,
  mouseY,
}: {
  count?: number
  color?: string
  mouseX: ReturnType<typeof useMotionValue<number>>
  mouseY: ReturnType<typeof useMotionValue<number>>
}) {
  const [particles] = useState<Particle[]>(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      speed: Math.random() * 15 + 8,
      opacity: Math.random() * 0.6 + 0.2,
      delay: Math.random() * 5,
    }))
  )

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full parallax-particle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: color,
            opacity: p.opacity,
          }}
          animate={{
            y: [0, -p.speed, 0, p.speed * 0.5, 0],
            x: [0, p.speed * 0.3, -p.speed * 0.2, 0],
          }}
          transition={{
            duration: p.speed,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: p.delay,
          }}
          // Subtle parallax offset from mouse
          whileHover={{ scale: 1.5, opacity: 1 }}
        />
      ))}
      {/* Mouse-reactive glow that follows cursor */}
      <motion.div
        className="absolute w-64 h-64 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${color.replace('0.4', '0.08')} 0%, transparent 70%)`,
          x: mouseX,
          y: mouseY,
          translateX: '-50%',
          translateY: '-50%',
        }}
      />
    </div>
  )
}

// ============================================================
// ParallaxHero — Main component
// ============================================================

export function ParallaxHero({
  children,
  backgroundLayer,
  middleLayer,
  className = '',
  tiltDeg = 6,
  particleCount = 20,
  particleColor = 'rgba(16, 185, 129, 0.4)',
  speeds = [0.15, 0.3, 0.5],
}: ParallaxHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  // Mouse motion values
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  // Spring-configured tilt values
  const springConfig = { damping: 30, stiffness: 200, mass: 0.5 }
  const rotateX = useSpring(useMotionValue(0), springConfig)
  const rotateY = useSpring(useMotionValue(0), springConfig)

  // Scroll progress for parallax layers
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  })

  const bgY = useTransform(scrollYProgress, [0, 1], [0, -80 * speeds[0]])
  const midY = useTransform(scrollYProgress, [0, 1], [0, -80 * speeds[1]])
  const fgY = useTransform(scrollYProgress, [0, 1], [0, -80 * speeds[2]])

  // Check reduced motion preference
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Handle mouse move for tilt + particles
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current || reducedMotion) return
      const rect = containerRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const dx = e.clientX - centerX
      const dy = e.clientY - centerY

      // Normalize to -1..1
      const normalX = dx / (rect.width / 2)
      const normalY = dy / (rect.height / 2)

      rotateX.set(-normalY * tiltDeg)
      rotateY.set(normalX * tiltDeg)
      mouseX.set(e.clientX - rect.left)
      mouseY.set(e.clientY - rect.top)
    },
    [tiltDeg, rotateX, rotateY, mouseX, mouseY, reducedMotion]
  )

  const handleMouseEnter = useCallback(() => setIsHovered(true), [])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
    rotateX.set(0)
    rotateY.set(0)
  }, [rotateX, rotateY])

  if (reducedMotion) {
    return (
      <div ref={containerRef} className={cn('relative overflow-hidden', className)}>
        <div className="parallax-layer-bg">{backgroundLayer}</div>
        {middleLayer && <div className="parallax-layer-mid">{middleLayer}</div>}
        <div className="parallax-layer-fg relative z-10">{children}</div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden', className)}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Layer 1 — Background (slowest parallax) */}
      <motion.div
        className="absolute inset-0 parallax-layer-bg"
        style={{ y: bgY, willChange: 'transform' }}
        aria-hidden="true"
      >
        {backgroundLayer || (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 50%, rgba(16,185,129,0.06) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(6,182,212,0.04) 0%, transparent 40%)',
            }}
          />
        )}
      </motion.div>

      {/* Layer 2 — Middle (medium parallax) */}
      <motion.div
        className="absolute inset-0 parallax-layer-mid"
        style={{ y: midY, willChange: 'transform' }}
        aria-hidden="true"
      >
        {middleLayer}
      </motion.div>

      {/* Floating particles (react to mouse) */}
      {isHovered && (
        <FloatingParticles
          count={particleCount}
          color={particleColor}
          mouseX={mouseX}
          mouseY={mouseY}
        />
      )}

      {/* Layer 3 — Foreground content (fastest parallax + 3D tilt) */}
      <motion.div
        className="relative z-10 parallax-layer-fg"
        style={{
          y: fgY,
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
          perspective: 1200,
          willChange: 'transform',
        }}
      >
        {children}
      </motion.div>
    </div>
  )
}

export default ParallaxHero
