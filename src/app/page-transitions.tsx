'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

// ============================================================
// PageTransitionOverlay — Full-page diagonal wipe transition
// ============================================================

export function PageTransitionOverlay({ isActive, duration = 400 }: { isActive: boolean; duration?: number }) {
  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="page-transition-overlay fixed inset-0 z-[100] pointer-events-none"
          initial={{ clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' }}
          animate={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
          exit={{ clipPath: 'polygon(100% 0, 100% 0, 100% 100%, 100% 100%)' }}
          transition={{ duration: duration / 1000, ease: [0.65, 0, 0.35, 1] }}
          style={{
            background: 'linear-gradient(135deg, var(--vl-accent) 0%, rgba(6, 182, 212, 0.8) 50%, var(--vl-accent) 100%)',
          }}
        />
      )}
    </AnimatePresence>
  )
}

// ============================================================
// TabContentTransition — Slide + fade tab content wrapper
// ============================================================

export function TabContentTransition({ children, direction = 0 }: { children: React.ReactNode; direction?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: direction * 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: direction * -30 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

// ============================================================
// SectionTransition — Animated section divider
// ============================================================

export function SectionTransition({
  variant = 'thin',
  style = 'gradient',
  showDot = true,
  lang = 'en',
}: {
  variant?: 'thin' | 'thick' | 'dotted'
  style?: 'gradient' | 'solid' | 'dotted'
  showDot?: boolean
  lang?: Lang
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.2 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  const heightClass = variant === 'thick' ? 'h-[3px]' : variant === 'dotted' ? 'h-[2px]' : 'h-[1px]'
  const bgClass = style === 'gradient'
    ? 'bg-gradient-to-r from-transparent via-[var(--vl-accent)] to-transparent'
    : style === 'dotted'
      ? 'section-divider-dotted'
      : 'bg-[var(--vl-border)]'

  return (
    <div ref={ref} className="section-divider-wrapper flex items-center justify-center py-6 relative">
      {/* Left line */}
      <motion.div
        className={`flex-1 ${heightClass} rounded-full ${bgClass}`}
        initial={{ scaleX: 0, transformOrigin: 'right' }}
        animate={isVisible ? { scaleX: 1, transformOrigin: 'left' } : {}}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
      />
      {/* Center dot or diamond */}
      {showDot && (
        <motion.div
          className="section-divider-dot mx-3 w-2 h-2 rounded-full bg-[var(--vl-accent)] shadow-[0_0_8px_var(--vl-accent)]"
          initial={{ scale: 0, rotate: -90 }}
          animate={isVisible ? { scale: 1, rotate: 0 } : {}}
          transition={{ duration: 0.4, ease: 'backOut', delay: 0.4 }}
        />
      )}
      {/* Right line */}
      <motion.div
        className={`flex-1 ${heightClass} rounded-full ${bgClass}`}
        initial={{ scaleX: 0 }}
        animate={isVisible ? { scaleX: 1 } : {}}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
      />
    </div>
  )
}

// ============================================================
// ContentFadeIn — Simple mount animation wrapper
// ============================================================

export function ContentFadeIn({
  children,
  delay = 0,
  duration = 0.5,
  direction = 'up',
}: {
  children: React.ReactNode
  delay?: number
  duration?: number
  direction?: 'up' | 'down' | 'left' | 'right' | 'none'
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  const directionMap = {
    up: { y: 20, x: 0 },
    down: { y: -20, x: 0 },
    left: { x: 20, y: 0 },
    right: { x: -20, y: 0 },
    none: { x: 0, y: 0 },
  }

  const offset = directionMap[direction]

  return (
    <div
      ref={ref}
      className="content-fade-in"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translate(0, 0)' : `translate(${offset.x}px, ${offset.y}px)`,
        transition: `opacity ${duration}s ease-out ${delay}s, transform ${duration}s ease-out ${delay}s`,
      }}
    >
      {children}
    </div>
  )
}

// ============================================================
// StaggerChildren — Wraps children for staggered entrance
// ============================================================

export function StaggerChildren({
  children,
  staggerDelay = 0.08,
  className = '',
}: {
  children: React.ReactNode
  staggerDelay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className={`stagger-children-wrapper ${className}`}>
      {React.Children.map(children, (child, i) => (
        <div
          className="stagger-child-item"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(16px)',
            transition: `opacity 0.4s ease-out ${i * staggerDelay}s, transform 0.4s ease-out ${i * staggerDelay}s`,
          }}
        >
          {child}
        </div>
      ))}
    </div>
  )
}
