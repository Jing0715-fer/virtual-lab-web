'use client'

/**
 * Enhanced Glassmorphism Kit — Theme-aware glass effect components with
 * frosted blur, layered gradients, and subtle borders.
 *
 * Components:
 *   - GlassCard: Frosted glass card with configurable blur & glow
 *   - GlassToolbar: Sticky toolbar with glass effect (top or bottom)
 *   - GlassBadge: Badge with glass effect and subtle glow
 *
 * All use CSS backdrop-filter and work in both light and dark modes.
 * Complements the existing glassmorphism-kit.tsx (does not replace it).
 */

import React, { useState, useEffect, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

// ============================================================
// Types
// ============================================================

type GlassBlurLevel = 'sm' | 'md' | 'lg' | 'xl'
type GlassPosition = 'top' | 'bottom'

interface GlassCardProps {
  children: ReactNode
  /** Blur level (default 'lg') */
  blur?: GlassBlurLevel
  /** Background opacity 0–1 (default 0.5) */
  opacity?: number
  /** Glow accent color (default emerald) */
  glowColor?: string
  /** Show glow on hover (default false) */
  glowOnHover?: boolean
  /** Inner gradient decoration (default true) */
  innerGradient?: boolean
  /** Border glow ring on hover (default false) */
  borderGlow?: boolean
  className?: string
  onClick?: () => void
}

interface GlassToolbarProps {
  children: ReactNode
  /** Stick to top or bottom (default 'top') */
  position?: GlassPosition
  /** Blur level (default 'xl') */
  blur?: GlassBlurLevel
  className?: string
}

interface GlassBadgeProps {
  children: ReactNode
  /** Glow color (default emerald) */
  glowColor?: string
  /** Badge size variant */
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

// ============================================================
// Blur mapping
// ============================================================

const BLUR_MAP: Record<GlassBlurLevel, string> = {
  sm: 'backdrop-blur-sm',
  md: 'backdrop-blur-md',
  lg: 'backdrop-blur-lg',
  xl: 'backdrop-blur-xl',
}

// ============================================================
// GlassCard — Enhanced frosted glass card
// ============================================================

export function GlassCard({
  children,
  blur = 'lg',
  opacity = 0.5,
  glowColor = '#10b981',
  glowOnHover = false,
  innerGradient = true,
  borderGlow = false,
  className = '',
  onClick,
}: GlassCardProps) {
  const [mounted, setMounted] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true))
    // Detect dark mode
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    setIsDark(document.documentElement.classList.contains('dark'))
    return () => observer.disconnect()
  }, [])

  if (!mounted) {
    return (
      <div className={cn('glass-card-enhanced rounded-xl p-4', className)}>
        <div className="h-16 rounded-lg animate-pulse" style={{ background: 'var(--vl-bg-secondary, #f1f3f5)' }} />
      </div>
    )
  }

  // Theme-aware colors
  const bgOpacity = isDark ? opacity * 0.3 : opacity * 0.6
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.5)'

  return (
    <motion.div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn('glass-card-enhanced relative rounded-xl border overflow-hidden', BLUR_MAP[blur], className)}
      style={{
        backgroundColor: `rgba(255, 255, 255, ${bgOpacity})`,
        borderColor: hovered && borderGlow ? `${glowColor}30` : borderColor,
      }}
      whileHover={{
        scale: 1.005,
        boxShadow: glowColor && (glowOnHover || borderGlow)
          ? `0 8px 32px ${glowColor}15, 0 0 0 1px ${glowColor}15`
          : '0 8px 32px rgba(0,0,0,0.1)',
      }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {/* Inner gradient decoration */}
      {innerGradient && (
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            background: `linear-gradient(135deg, ${glowColor}12 0%, transparent 50%, ${glowColor}08 100%)`,
          }}
        />
      )}

      {/* Glow border on hover */}
      {borderGlow && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          animate={{
            boxShadow: hovered
              ? `inset 0 0 0 1px ${glowColor}25, 0 0 24px ${glowColor}12`
              : `inset 0 0 0 1px transparent`,
          }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent, ${glowColor}25, transparent)`,
        }}
      />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </motion.div>
  )
}

// ============================================================
// GlassToolbar — Sticky glass toolbar
// ============================================================

export function GlassToolbar({
  children,
  position = 'top',
  blur = 'xl',
  className = '',
}: GlassToolbarProps) {
  const [mounted, setMounted] = useState(false)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true))
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    setIsDark(document.documentElement.classList.contains('dark'))
    return () => observer.disconnect()
  }, [])

  if (!mounted) {
    return (
      <div
        className={cn(
          'glass-toolbar-enhanced px-4 py-2',
          position === 'top' ? 'sticky top-0 z-40' : 'sticky bottom-0 z-40',
          className
        )}
      >
        <div className="h-8 rounded animate-pulse" style={{ background: 'var(--vl-bg-secondary, #f1f3f5)' }} />
      </div>
    )
  }

  const bgOpacity = isDark ? 0.6 : 0.7
  const borderColor = isDark ? 'rgba(51,65,85,0.3)' : 'rgba(229,231,235,0.5)'

  return (
    <div
      className={cn(
        'glass-toolbar-enhanced border-b',
        BLUR_MAP[blur],
        position === 'top' ? 'sticky top-0 z-40' : 'sticky bottom-0 z-40 border-t border-b-0',
        className
      )}
      style={{
        backgroundColor: isDark
          ? `rgba(2, 6, 23, ${bgOpacity})`
          : `rgba(255, 255, 255, ${bgOpacity})`,
        borderColor: borderColor,
        backdropFilter: `blur(${blur === 'sm' ? 4 : blur === 'md' ? 8 : blur === 'lg' ? 16 : 24}px) saturate(1.2)`,
      }}
    >
      {/* Top gradient fade for visual separation */}
      <div
        className="absolute inset-x-0 pointer-events-none"
        style={{
          top: position === 'top' ? '-100%' : undefined,
          bottom: position === 'bottom' ? '-100%' : undefined,
          height: '100%',
          background: isDark
            ? 'linear-gradient(to bottom, rgba(2,6,23,0.8), transparent)'
            : 'linear-gradient(to bottom, rgba(255,255,255,0.8), transparent)',
          ...(position === 'bottom'
            ? {
                background: isDark
                  ? 'linear-gradient(to top, rgba(2,6,23,0.8), transparent)'
                  : 'linear-gradient(to top, rgba(255,255,255,0.8), transparent)',
              }
            : {}),
        }}
        aria-hidden="true"
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

// ============================================================
// GlassBadge — Glass effect badge with subtle glow
// ============================================================

export function GlassBadge({
  children,
  glowColor = '#10b981',
  size = 'md',
  className = '',
}: GlassBadgeProps) {
  const [mounted, setMounted] = useState(false)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true))
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    setIsDark(document.documentElement.classList.contains('dark'))
    return () => observer.disconnect()
  }, [])

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px] rounded-md',
    md: 'px-2.5 py-1 text-xs rounded-lg',
    lg: 'px-3 py-1.5 text-sm rounded-xl',
  }

  if (!mounted) {
    return (
      <span className={cn('glass-badge-enhanced inline-block', sizeClasses[size], className)}>
        {children}
      </span>
    )
  }

  const bgOpacity = isDark ? 0.15 : 0.3

  return (
    <motion.span
      className={cn(
        'glass-badge-enhanced inline-flex items-center gap-1 border',
        sizeClasses[size],
        className
      )}
      style={{
        backgroundColor: `${glowColor}${Math.round(bgOpacity * 255).toString(16).padStart(2, '0')}`,
        borderColor: `${glowColor}30`,
        color: glowColor,
        backdropFilter: 'blur(8px)',
      }}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.2 }}
    >
      {/* Subtle glow dot */}
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{
          backgroundColor: glowColor,
          boxShadow: `0 0 6px ${glowColor}50`,
        }}
      />
      {children}
    </motion.span>
  )
}

export default GlassCard
