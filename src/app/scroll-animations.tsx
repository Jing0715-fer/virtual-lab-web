'use client'

import React, { useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ============================================================
// ScrollProgress — Thin gradient bar (emerald→cyan) fixed at top
// ============================================================
export function AdvancedScrollProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      setProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="scroll-progress-bar fixed top-0 left-0 right-0 z-[60] h-[3px]" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
      <div
        className="scroll-progress-fill h-full"
        style={{
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #10b981, #06b6d4, #8b5cf6)',
          opacity: progress > 0 && progress < 100 ? 1 : progress >= 100 ? 0.5 : 0,
          transition: 'width 0.1s linear, opacity 0.3s ease',
        }}
      />
    </div>
  )
}

// ============================================================
// ParallaxSection — Wrapper for parallax scrolling effect
// ============================================================
export function ParallaxSection({
  children,
  speed = 0.3,
  direction = 'up',
  className = '',
}: {
  children: ReactNode
  speed?: number
  direction?: 'up' | 'down'
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const handleScroll = () => {
      const rect = el.getBoundingClientRect()
      const centerY = rect.top + rect.height / 2
      const viewCenter = window.innerHeight / 2
      const delta = (centerY - viewCenter) * speed * (direction === 'up' ? -1 : 1)
      setOffset(delta)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [speed, direction])

  return (
    <div
      ref={ref}
      className={`parallax-section ${className}`}
      style={{
        transform: `translateY(${offset}px)`,
        willChange: 'transform',
        contain: 'layout style paint',
      }}
    >
      {children}
    </div>
  )
}

// ============================================================
// ScrollRevealGroup — Staggered reveal for groups of children
// ============================================================
export function ScrollRevealGroup({
  children,
  stagger = 80,
  direction = 'up',
  animationType = 'fade',
  className = '',
}: {
  children: ReactNode
  stagger?: number
  direction?: 'up' | 'down' | 'left' | 'right'
  animationType?: 'fade' | 'slide-up' | 'scale' | 'blur'
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const childArray = Array.isArray(children) ? children : [children]

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(el)
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const getInitial = () => {
    switch (direction) {
      case 'up': return { opacity: 0, y: 24 }
      case 'down': return { opacity: 0, y: -24 }
      case 'left': return { opacity: 0, x: 24 }
      case 'right': return { opacity: 0, x: -24 }
    }
  }

  const getAnimate = () => {
    switch (animationType) {
      case 'fade': return { opacity: 1 }
      case 'slide-up': return { opacity: 1, y: 0 }
      case 'scale': return { opacity: 1, scale: 1 }
      case 'blur': return { opacity: 1, filter: 'blur(0px)' }
    }
  }

  return (
    <div ref={ref} className={`scroll-reveal-group ${className}`}>
      {childArray.map((child, i) => (
        <motion.div
          key={i}
          initial={animationType === 'scale'
            ? { opacity: 0, scale: 0.9 }
            : animationType === 'blur'
              ? { filter: 'blur(8px)', ...getInitial() }
              : getInitial()
          }
          animate={isVisible ? getAnimate() : undefined}
          transition={{
            duration: 0.5,
            delay: isVisible ? i * stagger / 1000 : 0,
            ease: [0.23, 1, 0.32, 1],
          }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  )
}

// ============================================================
// ScrollRotate3D — Rotates element based on scroll position
// ============================================================
export function ScrollRotate3D({
  children,
  maxRotation = 15,
  axis = 'y',
  className = '',
}: {
  children: ReactNode
  maxRotation?: number
  axis?: 'x' | 'y' | 'z'
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [rotation, setRotation] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const handleScroll = () => {
      const rect = el.getBoundingClientRect()
      const centerY = rect.top + rect.height / 2
      const viewCenter = window.innerHeight / 2
      const delta = ((centerY - viewCenter) / window.innerHeight) * maxRotation
      setRotation(Math.max(-maxRotation, Math.min(maxRotation, delta)))
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [maxRotation])

  const transformMap = {
    x: `perspective(800px) rotateX(${rotation}deg)`,
    y: `perspective(800px) rotateY(${rotation}deg)`,
    z: `rotateZ(${rotation}deg)`,
  }

  return (
    <div
      ref={ref}
      className={`scroll-rotate-3d ${className}`}
      style={{
        transform: transformMap[axis],
        willChange: 'transform',
        transition: 'transform 0.15s linear',
      }}
    >
      {children}
    </div>
  )
}

// ============================================================
// MorphingNumber — Number that morphs/counters on scroll trigger
// ============================================================
export function MorphingNumber({
  value,
  duration = 1200,
  className = '',
  prefix = '',
  suffix = '',
}: {
  value: number
  duration?: number
  className?: string
  prefix?: string
  suffix?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [displayValue, setDisplayValue] = useState(0)
  const hasAnimated = useRef(false)

  const animateTo = useCallback((target: number) => {
    const start = performance.now()
    const from = 0
    const step = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(Math.round(from + (target - from) * eased))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [duration])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true
          animateTo(value)
          observer.unobserve(el)
        }
      },
      { threshold: 0.5 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [value, animateTo])

  return (
    <span ref={ref} className={`morph-number ${className}`}>
      {prefix}{displayValue.toLocaleString()}{suffix}
    </span>
  )
}
