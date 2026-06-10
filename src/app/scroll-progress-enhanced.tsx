'use client'

/**
 * EnhancedScrollProgress — Advanced scroll progress indicator with:
 *   - Top gradient progress bar
 *   - Section progress dots (shows current section)
 *   - Reading time estimate based on scroll position
 *   - Smooth gradient color transitions per section
 *
 * Uses framer-motion for smooth animations.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

// ============================================================
// Types
// ============================================================

export interface ScrollSection {
  /** Unique id for the section */
  id: string
  /** Label to show in tooltip */
  label: string
  /** Color for the progress gradient at this section */
  color: string
}

interface EnhancedScrollProgressProps {
  /** Sections to track (by id matching) */
  sections?: ScrollSection[]
  /** Words per minute for reading estimate (default 200) */
  wordsPerMinute?: number
  /** Show reading time (default true) */
  showReadingTime?: boolean
  /** Show section dots (default true) */
  showSectionDots?: boolean
  /** Position of section dots: 'right' or 'left' (default 'right') */
  dotsPosition?: 'right' | 'left'
  /** Progress bar height in px (default 3) */
  barHeight?: number
  className?: string
  lang?: Lang
}

// ============================================================
// Helpers
// ============================================================

const SECTION_COLORS = [
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#8b5cf6', // violet
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
]

function interpolateColor(colors: string[], progress: number): string {
  if (colors.length === 0) return '#10b981'
  const scaledProgress = progress * (colors.length - 1)
  const index = Math.floor(scaledProgress)
  const lower = Math.max(0, Math.min(colors.length - 1, index))
  const upper = Math.max(0, Math.min(colors.length - 1, lower + 1))
  const localProgress = scaledProgress - index

  // Simple hex interpolation
  const lowerColor = hexToRgb(colors[lower])
  const upperColor = hexToRgb(colors[upper])
  if (!lowerColor || !upperColor) return colors[lower]

  const r = Math.round(lowerColor.r + (upperColor.r - lowerColor.r) * localProgress)
  const g = Math.round(lowerColor.g + (upperColor.g - lowerColor.g) * localProgress)
  const b = Math.round(lowerColor.b + (upperColor.b - lowerColor.b) * localProgress)

  return `rgb(${r}, ${g}, ${b})`
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

function estimateReadingTime(scrollProgress: number): string {
  const minutes = Math.max(0, Math.ceil((1 - scrollProgress) * 5))
  if (minutes <= 1) return '<1m'
  if (minutes >= 10) return '10m+'
  return `${minutes}m`
}

// ============================================================
// EnhancedScrollProgress — Main component
// ============================================================

export function EnhancedScrollProgress({
  sections = [],
  showReadingTime = true,
  showSectionDots = true,
  dotsPosition = 'right',
  barHeight = 3,
  className = '',
  lang,
}: EnhancedScrollProgressProps) {
  const [progress, setProgress] = useState(0)
  const [activeSection, setActiveSection] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Track scroll and section visibility
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const currentProgress = docHeight > 0 ? scrollTop / docHeight : 0
      setProgress(currentProgress)

      // Determine active section based on element visibility
      if (sections.length > 0) {
        const viewportMid = window.innerHeight / 2
        let closestIndex = 0
        let closestDistance = Infinity

        for (let i = 0; i < sections.length; i++) {
          const el = document.getElementById(sections[i].id)
          if (el) {
            const rect = el.getBoundingClientRect()
            const elMid = rect.top + rect.height / 2
            const distance = Math.abs(elMid - viewportMid)
            if (distance < closestDistance) {
              closestDistance = distance
              closestIndex = i
            }
          }
        }
        setActiveSection(closestIndex)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [sections])

  // Build gradient colors array
  const colors = sections.length > 0
    ? sections.map((s) => s.color)
    : SECTION_COLORS

  const currentColor = interpolateColor(colors, progress)
  const readingTime = estimateReadingTime(progress)

  return (
    <>
      {/* Top progress bar */}
      <div
        className={cn('fixed top-0 left-0 right-0 z-[60]', className)}
        style={{ height: barHeight }}
        role="progressbar"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Page scroll progress"
      >
        <motion.div
          className="enhanced-scroll-progress-fill h-full rounded-r-full"
          style={{
            width: reducedMotion ? `${progress * 100}%` : undefined,
            background: currentColor,
            opacity: progress > 0 && progress < 1 ? 1 : progress >= 1 ? 0.5 : 0,
            transition: 'opacity 0.3s ease',
          }}
          animate={reducedMotion ? undefined : { width: `${progress * 100}%` }}
          transition={!reducedMotion ? { duration: 0.1, ease: 'linear' } : undefined}
        />
      </div>

      {/* Section progress dots */}
      <AnimatePresence>
        {showSectionDots && sections.length > 1 && (
          <motion.div
            className={cn(
              'fixed top-1/2 -translate-y-1/2 z-[55] flex flex-col gap-2',
              dotsPosition === 'right' ? 'right-3' : 'left-3'
            )}
            initial={{ opacity: 0, x: dotsPosition === 'right' ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            aria-label="Section navigation"
          >
            {sections.map((section, i) => {
              const isActive = i === activeSection
              const isPast = i < activeSection
              return (
                <motion.button
                  key={section.id}
                  type="button"
                  className={cn(
                    'scroll-section-dot group relative flex items-center gap-2',
                    dotsPosition === 'right' ? 'flex-row-reverse' : 'flex-row'
                  )}
                  onClick={() => {
                    const el = document.getElementById(section.id)
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }
                  }}
                  whileHover={{ scale: 1.2 }}
                  aria-label={section.label}
                >
                  <motion.div
                    className="rounded-full transition-colors duration-300"
                    style={{
                      width: isActive ? 10 : 6,
                      height: isActive ? 10 : 6,
                      backgroundColor: isActive
                        ? section.color
                        : isPast
                          ? `${section.color}80`
                          : 'var(--vl-border, rgba(100,116,139,0.3))',
                      boxShadow: isActive
                        ? `0 0 8px ${section.color}50`
                        : 'none',
                    }}
                    animate={
                      reducedMotion
                        ? {}
                        : isActive
                          ? { scale: [1, 1.2, 1] }
                          : { scale: 1 }
                    }
                    transition={
                      reducedMotion
                        ? {}
                        : { duration: 2, repeat: Infinity, ease: 'easeInOut' }
                    }
                  />
                  {/* Tooltip on hover */}
                  <span
                    className={cn(
                      'scroll-section-tooltip text-[10px] whitespace-nowrap px-1.5 py-0.5 rounded-md',
                      'opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none',
                      dotsPosition === 'right' ? 'mr-1' : 'ml-1',
                    )}
                    style={{
                      background: 'var(--vl-bg-secondary, #f1f3f5)',
                      color: 'var(--vl-text-secondary, #374151)',
                      border: '1px solid var(--vl-border, #e5e7eb)',
                    }}
                  >
                    {section.label}
                  </span>
                </motion.button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reading time estimate */}
      <AnimatePresence>
        {showReadingTime && progress > 0.05 && progress < 0.95 && (
          <motion.div
            className="fixed bottom-4 right-4 z-[55] px-2.5 py-1 rounded-lg text-[11px]"
            style={{
              background: 'var(--vl-bg-card, #ffffff)',
              border: '1px solid var(--vl-border, #e5e7eb)',
              color: 'var(--vl-text-muted, #6b7280)',
              boxShadow: 'var(--vl-shadow, 0 1px 3px rgba(0,0,0,0.08))',
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            <span className="scroll-reading-time">
              {t(lang, 'common.readingTime') || 'Reading'}: {readingTime}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default EnhancedScrollProgress
