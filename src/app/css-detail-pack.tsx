'use client'

import React, { useRef, useState, useEffect, type ReactNode } from 'react'

// ============================================================
// GlassmorphicCard — Elevated glass card with multiple variants
// ============================================================
export function GlassmorphicCard({
  children,
  variant = 'medium',
  glow = false,
  borderGradient = false,
  className = '',
}: {
  children: ReactNode
  variant?: 'light' | 'medium' | 'heavy'
  glow?: boolean
  borderGradient?: boolean
  className?: string
}) {
  const blurMap = { light: 'backdrop-blur-sm', medium: 'backdrop-blur-md', heavy: 'backdrop-blur-xl' }
  const bgMap = {
    light: 'glass-card-light',
    medium: 'glass-card-medium',
    heavy: 'glass-card-heavy',
  }

  return (
    <div
      className={`
        glass-card ${bgMap[variant]} ${blurMap[variant]}
        rounded-xl border p-4 transition-all duration-300
        ${glow ? 'glass-card-glow' : ''}
        ${borderGradient ? 'animated-border-wrap' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  )
}

// ============================================================
// NeonBorder — Animated neon border wrapper
// ============================================================
export function NeonBorder({
  children,
  color = '#10b981',
  intensity = 'medium',
  pulse = false,
  className = '',
}: {
  children: ReactNode
  color?: string
  intensity?: 'subtle' | 'medium' | 'strong'
  className?: string
  pulse?: boolean
}) {
  const intensityMap = {
    subtle: { shadowBlur: 6, shadowSpread: 0, opacity: 0.4 },
    medium: { shadowBlur: 12, shadowSpread: 2, opacity: 0.6 },
    strong: { shadowBlur: 20, shadowSpread: 4, opacity: 0.8 },
  }
  const s = intensityMap[intensity]

  return (
    <div
      className={`neon-border rounded-xl border p-4 ${pulse ? 'neon-border-pulse' : ''} ${className}`}
      style={{
        borderColor: color,
        boxShadow: `0 0 ${s.shadowBlur}px ${s.shadowSpread}px ${color}${Math.round(s.opacity * 255).toString(16).padStart(2, '0')}, inset 0 0 ${s.shadowBlur / 2}px ${color}${Math.round(s.opacity * 0.2 * 255).toString(16).padStart(2, '0')}`,
      }}
    >
      {children}
    </div>
  )
}

// ============================================================
// GradientText — Animated gradient text
// ============================================================
export function GradientText({
  children,
  colors = ['#10b981', '#06b6d4', '#8b5cf6'],
  speed = 6,
  className = '',
}: {
  children: ReactNode
  colors?: string[]
  speed?: number
  className?: string
}) {
  const gradient = colors.join(', ')

  return (
    <span
      className={`gradient-text-animated inline-block ${className}`}
      style={{
        background: `linear-gradient(135deg, ${gradient}, ${colors[0]})`,
        backgroundSize: '300% 300%',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        animation: `gradient-text-shift ${speed}s ease infinite`,
      }}
    >
      {children}
    </span>
  )
}

// ============================================================
// FloatingElement — Gently floating animation wrapper
// ============================================================
export function FloatingElement({
  children,
  amplitude = 6,
  speed = 4,
  direction = 'vertical',
  className = '',
}: {
  children: ReactNode
  amplitude?: number
  speed?: number
  direction?: 'vertical' | 'horizontal' | 'diagonal'
  className?: string
}) {
  const animName = speed <= 3 ? 'float-gentle-slow' : speed <= 5 ? 'float-gentle' : 'float-medium'
  const dur = `${speed}s`

  return (
    <div
      className={`floating-element ${className}`}
      style={{
        animation: `${animName} ${dur} ease-in-out infinite`,
        '--float-amplitude': `${amplitude}px`,
        '--float-direction': direction === 'horizontal' ? 'X' : direction === 'diagonal' ? 'both' : 'Y',
      } as React.CSSProperties}
    >
      {children}
    </div>
  )
}

// ============================================================
// MagneticButton — Button that follows cursor slightly on hover
// ============================================================
export function MagneticButton({
  children,
  className = '',
  strength = 0.3,
}: {
  children: ReactNode
  className?: string
  strength?: number
}) {
  const ref = useRef<HTMLButtonElement>(null)
  const [transform, setTransform] = useState('translate(0, 0)')

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    setTransform(`translate(${x * strength}px, ${y * strength}px)`)
  }

  const handleMouseLeave = () => {
    setTransform('translate(0, 0)')
  }

  return (
    <button
      ref={ref}
      className={`magnetic-button ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform,
        transition: transform === 'translate(0, 0)' ? 'transform 0.4s cubic-bezier(0.23, 1, 0.32, 1)' : 'transform 0.1s ease-out',
        willChange: 'transform',
      }}
    >
      {children}
    </button>
  )
}

// ============================================================
// SpotlightCard — Card with cursor-following spotlight effect
// ============================================================
export function SpotlightCard({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [spotlightPos, setSpotlightPos] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setSpotlightPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  return (
    <div
      ref={ref}
      className={`spotlight-card rounded-xl border border-[var(--vl-border)] overflow-hidden ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        '--spotlight-x': `${spotlightPos.x}px`,
        '--spotlight-y': `${spotlightPos.y}px`,
        '--spotlight-opacity': isHovered ? '1' : '0',
      } as React.CSSProperties}
    >
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          background: `radial-gradient(300px circle at ${spotlightPos.x}px ${spotlightPos.y}px, rgba(16,185,129,0.1), transparent 60%)`,
          opacity: isHovered ? 1 : 0,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
