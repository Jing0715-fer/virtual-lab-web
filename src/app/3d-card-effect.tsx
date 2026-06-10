'use client'

/**
 * ThreeDCardEffect — Reusable 3D tilt card component with dynamic light
 * reflection overlay and configurable tilt intensity, glow, and border shine.
 *
 * Uses framer-motion useSpring for smooth spring-back animation on mouse leave.
 * Wraps any existing card component as a drop-in enhancer.
 */

import React, { useRef, useState, useCallback, type ReactNode } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { cn } from '@/lib/utils'

// ============================================================
// Types
// ============================================================

interface ThreeDCardProps {
  children: ReactNode
  /** Maximum tilt rotation in degrees (default 10) */
  tiltDeg?: number
  /** Glow color for hover shadow (default #10b981 emerald) */
  glowColor?: string
  /** Enable animated border shine on hover */
  borderShine?: boolean
  /** Enable light reflection overlay that follows mouse */
  lightReflection?: boolean
  /** Spring damping (default 25) */
  damping?: number
  /** Spring stiffness (default 200) */
  stiffness?: number
  className?: string
  /** Disable 3D effect */
  disabled?: boolean
}

// ============================================================
// ThreeDCard — Main component
// ============================================================

export function ThreeDCard({
  children,
  tiltDeg = 10,
  glowColor = '#10b981',
  borderShine = true,
  lightReflection = true,
  damping = 25,
  stiffness = 200,
  className = '',
  disabled = false,
}: ThreeDCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  // Motion values for rotation
  const rotateX = useMotionValue(0)
  const rotateY = useMotionValue(0)

  // Spring-animated rotation
  const springRotateX = useSpring(rotateX, { damping, stiffness, mass: 0.5 })
  const springRotateY = useSpring(rotateY, { damping, stiffness, mass: 0.5 })

  // Light position follows mouse
  const lightX = useMotionValue(50)
  const lightY = useMotionValue(50)
  const springLightX = useSpring(lightX, { damping: 40, stiffness: 300 })
  const springLightY = useSpring(lightY, { damping: 40, stiffness: 300 })

  // Check reduced motion preference
  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!cardRef.current || disabled || reducedMotion) return
      const rect = cardRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const dx = e.clientX - centerX
      const dy = e.clientY - centerY

      // Normalize to -1..1 and scale by tilt degrees
      const normalX = dx / (rect.width / 2)
      const normalY = dy / (rect.height / 2)

      rotateX.set(-normalY * tiltDeg)
      rotateY.set(normalX * tiltDeg)

      // Light position as percentage
      lightX.set((e.clientX - rect.left) / rect.width * 100)
      lightY.set((e.clientY - rect.top) / rect.height * 100)
    },
    [tiltDeg, rotateX, rotateY, lightX, lightY, disabled, reducedMotion]
  )

  const handleMouseEnter = useCallback(() => setIsHovered(true), [])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
    rotateX.set(0)
    rotateY.set(0)
    lightX.set(50)
    lightY.set(50)
  }, [rotateX, rotateY, lightX, lightY])

  // If disabled or reduced motion, render plain wrapper
  if (disabled || reducedMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      ref={cardRef}
      className={cn('three-d-card relative overflow-hidden', className)}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        perspective: 1200,
        transformStyle: 'preserve-3d',
      }}
    >
      {/* The card body with 3D rotation */}
      <motion.div
        className="relative"
        style={{
          rotateX: springRotateX,
          rotateY: springRotateY,
          transformStyle: 'preserve-3d',
          willChange: 'transform',
        }}
      >
        {/* Light reflection overlay */}
        {lightReflection && (
          <motion.div
            className="absolute inset-0 rounded-xl pointer-events-none z-10 three-d-card-light"
            style={{
              background: `radial-gradient(
                300px circle at ${springLightX.get()}% ${springLightY.get()}%,
                rgba(255, 255, 255, 0.06) 0%,
                transparent 60%
              )`,
              opacity: isHovered ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
          />
        )}

        {/* Border shine effect */}
        {borderShine && (
          <motion.div
            className="absolute inset-0 rounded-xl pointer-events-none z-10 three-d-card-border-shine"
            style={{
              background: `conic-gradient(
                from ${springLightX.get() * 3.6}deg at ${springLightX.get()}% ${springLightY.get()}%,
                ${glowColor}00 0%,
                ${glowColor}30 15%,
                ${glowColor}00 30%,
                transparent 50%
              )`,
              opacity: isHovered ? 1 : 0,
              transition: 'opacity 0.4s ease',
              mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              maskComposite: 'exclude',
              WebkitMaskComposite: 'xor',
              padding: '1px',
              borderRadius: 'inherit',
            }}
          />
        )}

        {/* Glow shadow on hover */}
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          animate={{
            boxShadow: isHovered
              ? `0 20px 60px ${glowColor}15, 0 0 0 1px ${glowColor}20`
              : '0 1px 3px rgba(0,0,0,0.08)',
          }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />

        {/* Children (the actual card content) */}
        <div className="relative z-[5]">
          {children}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default ThreeDCard
