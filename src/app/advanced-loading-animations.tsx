'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Loader2, Radio, Wifi, WifiOff, RefreshCw, Activity } from 'lucide-react'

// ============================================================
// Enhanced Skeleton Components
// ============================================================

// --- Shimmer gradient keyframe is in animations.css ---
// Components use .shimmer-skeleton, .skeleton-gradient classes

/**
 * EnhancedSkeletonCard — Card-shaped skeleton with shimmer effect
 */
export function EnhancedSkeletonCard({
  className = '',
  lines = 3,
  hasHeader = true,
  hasAvatar = true,
  hasButton = false,
}: {
  className?: string
  lines?: number
  hasHeader?: boolean
  hasAvatar?: boolean
  hasButton?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`vl-card p-4 ${className}`}
    >
      {hasHeader && (
        <div className="flex items-center gap-3 mb-4">
          {hasAvatar && (
            <div className="shimmer-skeleton shimmer-avatar w-10 h-10 rounded-full shrink-0" />
          )}
          <div className="flex-1 space-y-1.5">
            <div className="shimmer-skeleton shimmer-heading h-4 w-2/3 rounded-md" />
            <div className="shimmer-skeleton shimmer-text h-3 w-1/2 rounded" />
          </div>
        </div>
      )}
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, translateX: -10 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ delay: i * 0.08, duration: 0.3 }}
            className={`shimmer-skeleton shimmer-text h-3 rounded ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
          />
        ))}
      </div>
      {hasButton && (
        <div className="mt-4">
          <div className="shimmer-skeleton shimmer-button h-8 w-28 rounded-lg" />
        </div>
      )}
    </motion.div>
  )
}

/**
 * EnhancedSkeletonList — List of skeleton items with stagger
 */
export function EnhancedSkeletonList({
  count = 5,
  className = '',
  showAvatar = true,
}: {
  count?: number
  className?: string
  showAvatar?: boolean
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 25,
            delay: i * 0.06,
          }}
          className="flex items-center gap-3 p-3 rounded-xl vl-inner/50"
        >
          {showAvatar && (
            <div className="shimmer-skeleton shimmer-avatar w-8 h-8 rounded-full shrink-0" />
          )}
          <div className="flex-1 space-y-1.5">
            <div className="shimmer-skeleton shimmer-text h-3.5 w-3/4 rounded" />
            <div className="shimmer-skeleton shimmer-text h-2.5 w-1/2 rounded" />
          </div>
          <div className="shimmer-skeleton shimmer-text h-3 w-16 rounded" />
        </motion.div>
      ))}
    </div>
  )
}

/**
 * EnhancedSkeletonChart — Chart-shaped skeleton (bar chart / donut)
 */
export function EnhancedSkeletonChart({
  variant = 'bar',
  className = '',
}: {
  variant?: 'bar' | 'donut' | 'line'
  className?: string
}) {
  if (variant === 'donut') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`vl-card p-4 flex flex-col items-center ${className}`}
      >
        <div className="shimmer-skeleton shimmer-heading h-5 w-32 rounded-md mb-4" />
        <div className="relative w-32 h-32 rounded-full shimmer-skeleton shimmer-image" />
        <div className="shimmer-skeleton shimmer-text h-3 w-24 rounded mt-3" />
      </motion.div>
    )
  }

  if (variant === 'line') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`vl-card p-4 ${className}`}
      >
        <div className="shimmer-skeleton shimmer-heading h-5 w-40 rounded-md mb-4" />
        <div className="h-40 flex items-end gap-1.5">
          <svg width="100%" height="100%" viewBox="0 0 200 120" className="opacity-20">
            <polyline
              fill="none"
              stroke="var(--vl-accent, #10b981)"
              strokeWidth="2"
              points="10,90 40,60 70,80 100,30 130,50 160,20 190,40"
            />
          </svg>
        </div>
        <div className="shimmer-skeleton shimmer-text h-3 w-48 rounded mt-2" />
      </motion.div>
    )
  }

  // Default: bar chart
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`vl-card p-4 ${className}`}
    >
      <div className="shimmer-skeleton shimmer-heading h-5 w-40 rounded-md mb-4" />
      <div className="h-40 flex items-end gap-2 px-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <motion.div
            key={i}
            className="flex-1 rounded-t-md shimmer-skeleton shimmer-card"
            initial={{ height: 0 }}
            animate={{ height: `${20 + Math.random() * 80}%` }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 20,
              delay: i * 0.08,
            }}
          />
        ))}
      </div>
      <div className="flex gap-2 mt-3 px-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex-1 shimmer-skeleton shimmer-text h-2 rounded" />
        ))}
      </div>
    </motion.div>
  )
}

/**
 * EnhancedSkeletonTable — Table with skeleton rows
 */
export function EnhancedSkeletonTable({
  rows = 5,
  columns = 4,
  className = '',
}: {
  rows?: number
  columns?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`vl-card overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="flex gap-4 px-4 py-3 border-b border-[var(--vl-border-subtle)] bg-[var(--vl-bg-inner)]/30">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className={`shimmer-skeleton shimmer-heading h-3.5 rounded ${i === 0 ? 'w-8' : 'flex-1'}`} />
        ))}
      </div>
      {/* Rows */}
      <div className="divide-y divide-[var(--vl-border-subtle)]">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <motion.div
            key={rowIdx}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: rowIdx * 0.06 }}
            className="flex gap-4 px-4 py-3 items-center"
          >
            {Array.from({ length: columns }).map((_, colIdx) => (
              <div
                key={colIdx}
                className={`shimmer-skeleton shimmer-text h-3 rounded ${
                  colIdx === 0 ? 'w-8 shrink-0' : colIdx === columns - 1 ? 'w-16 shrink-0' : 'flex-1'
                }`}
              />
            ))}
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

// ============================================================
// Progress Indicators
// ============================================================

/**
 * CircularProgress — SVG circular progress with percentage
 */
export function CircularProgress({
  value = 0,
  size = 80,
  strokeWidth = 6,
  color = '#10b981',
  bgColor = 'var(--vl-border-subtle)',
  showPercentage = true,
  label = '',
  className = '',
}: {
  value?: number
  size?: number
  strokeWidth?: number
  color?: string
  bgColor?: string
  showPercentage?: boolean
  label?: string
  className?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (Math.min(value, 100) / 100) * circumference
  const center = size / 2

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="relative" style={{ width: size, height: size }}
      >
        <svg width={size} height={size} className="-rotate-90">
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={bgColor}
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <motion.circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        {/* Percentage text */}
        {showPercentage && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold" style={{ color }}>
              {Math.round(value)}%
            </span>
          </div>
        )}
      </motion.div>
      {label && (
        <span className="text-[10px] vl-text-muted text-center">{label}</span>
      )}
    </div>
  )
}

/**
 * LinearProgress — Animated linear bar with gradient, label, percentage
 */
export function LinearProgress({
  value = 0,
  label = '',
  showPercentage = true,
  color = '#10b981',
  height = 6,
  className = '',
  animated = true,
}: {
  value?: number
  label?: string
  showPercentage?: boolean
  color?: string
  height?: number
  className?: string
  animated?: boolean
}) {
  return (
    <div className={`w-full ${className}`}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && <span className="text-xs vl-text-body">{label}</span>}
          {showPercentage && (
            <span className="text-[10px] vl-text-muted font-medium">{Math.round(value)}%</span>
          )}
        </div>
      )}
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height, background: 'var(--vl-border-subtle)' }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, ${color}88, ${color}, ${color}cc)`,
            boxShadow: `0 0 8px ${color}44`,
          }}
          initial={{ width: '0%' }}
          animate={{ width: `${Math.min(value, 100)}%` }}
          transition={{
            duration: animated ? 0.8 : 0,
            ease: 'easeOut',
          }}
        />
      </div>
    </div>
  )
}

/**
 * StepsProgress — Multi-step progress with numbered circles
 */
export function StepsProgress({
  steps,
  currentStep = 0,
  className = '',
}: {
  steps: { label: string; description?: string }[]
  currentStep?: number
  className?: string
}) {
  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between">
        {steps.map((step, i) => {
          const isCompleted = i < currentStep
          const isCurrent = i === currentStep
          const isPending = i > currentStep

          return (
            <React.Fragment key={i}>
              {/* Step circle */}
              <div className="flex flex-col items-center gap-2 flex-1">
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: isCurrent ? 1.15 : 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors
                    ${isCompleted
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : isCurrent
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                        : 'bg-[var(--vl-bg-inner)] border-[var(--vl-border-subtle)] vl-text-muted'
                    }
                  `}
                >
                  {isCompleted ? (
                    <motion.div
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    >
                      <Check className="size-3.5" />
                    </motion.div>
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </motion.div>
                <div className="text-center">
                  <p className={`text-[10px] font-medium ${isCurrent ? 'text-emerald-400' : isCompleted ? 'vl-text-body' : 'vl-text-muted'}`}>
                    {step.label}
                  </p>
                  {step.description && isCurrent && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[8px] vl-text-muted mt-0.5"
                    >
                      {step.description}
                    </motion.p>
                  )}
                </div>
              </div>

              {/* Connecting line */}
              {i < steps.length - 1 && (
                <div className="flex-shrink-0 w-12 sm:w-20 relative -mt-8 mb-2">
                  <div className="h-[2px] bg-[var(--vl-border-subtle)] rounded-full w-full" />
                  <motion.div
                    className="absolute top-0 left-0 h-full bg-emerald-500 rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: i < currentStep ? '100%' : '0%' }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

/**
 * OrbitProgress — Unique orbiting dots progress indicator
 */
export function OrbitProgress({
  size = 48,
  color = '#10b981',
  className = '',
}: {
  size?: number
  color?: string
  className?: string
}) {
  const center = size / 2
  const orbitRadius = size * 0.32
  const dotSize = 4

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* Center dot */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: dotSize * 1.5,
          height: dotSize * 1.5,
          background: color,
          top: center - dotSize * 0.75,
          left: center - dotSize * 0.75,
        }}
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Orbiting dots */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: dotSize,
            height: dotSize,
            background: color,
            opacity: 1 - i * 0.25,
            top: center - dotSize / 2,
            left: center - dotSize / 2,
          }}
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 2 + i * 0.5,
            repeat: Infinity,
            ease: 'linear',
          }}
          // Offset each dot to a different orbit radius
          initial={false}
        />
      ))}

      {/* Orbit ring */}
      <svg
        className="absolute inset-0"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          cx={center}
          cy={center}
          r={orbitRadius}
          fill="none"
          stroke={color}
          strokeWidth={0.5}
          opacity={0.2}
          strokeDasharray="4 4"
        />
      </svg>
    </div>
  )
}

// ============================================================
// Loading Overlays & Spinners
// ============================================================

/**
 * LoadingOverlay — Full-screen or container loading overlay
 */
export function AdvancedLoadingOverlay({
  text = '',
  fullScreen = false,
  blur = true,
  className = '',
}: {
  text?: string
  fullScreen?: boolean
  blur?: boolean
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`
        ${fullScreen ? 'fixed inset-0 z-[90]' : 'absolute inset-0 z-10'}
        flex flex-col items-center justify-center gap-4
        bg-[var(--vl-bg-primary)]/60 backdrop-blur-sm ${className}
      `}
    >
      <LoadingSpinner />
      {text && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-sm vl-text-muted animate-pulse"
        >
          {text}
        </motion.p>
      )}
    </motion.div>
  )
}

/**
 * LoadingDots — Three animated dots with various patterns
 */
export function LoadingDots({
  pattern = 'bounce',
  color = 'var(--vl-accent, #10b981)',
  size = 8,
  className = '',
}: {
  pattern?: 'bounce' | 'wave' | 'pulse' | 'scale'
  color?: string
  size?: number
  className?: string
}) {
  const animations = {
    bounce: (i: number) => ({
      y: [0, -size * 1.2, 0],
    }),
    wave: (i: number) => ({
      scaleY: [0.5, 1.2, 0.5],
      originY: 0.5,
    }),
    pulse: (i: number) => ({
      scale: [0.7, 1.2, 0.7],
      opacity: [0.5, 1, 0.5],
    }),
    scale: (i: number) => ({
      scale: [0.5, 1, 0.5],
    }),
  }

  return (
    <div className={`flex items-center gap-1.5 ${className}`} role="status" aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="rounded-full"
          style={{
            width: size,
            height: size,
            background: color,
          }}
          animate={animations[pattern](i)}
          transition={{
            duration: pattern === 'bounce' ? 0.6 : 0.8,
            repeat: Infinity,
            delay: i * (pattern === 'bounce' ? 0.12 : 0.15),
            ease: 'easeInOut',
          }}
        />
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  )
}

/**
 * LoadingSpinner — Emerald-themed spinner with glow
 */
export function LoadingSpinner({
  size = 32,
  color = '#10b981',
  className = '',
}: {
  size?: number
  color?: string
  className?: string
}) {
  const center = size / 2
  const radius = size / 2 - 3
  const circumference = radius * 2 * Math.PI

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* Glow backdrop */}
      <div
        className="absolute inset-0 rounded-full blur-lg opacity-30 animate-pulse"
        style={{ background: color }}
      />
      <svg className="animate-spin" viewBox={`0 0 ${size} ${size}`} fill="none" style={{ width: size, height: size }}>
        {/* Background ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={2.5}
          opacity={0.15}
        />
        {/* Spinning arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray={`${circumference * 0.7} ${circumference * 0.3}`}
          style={{
            filter: `drop-shadow(0 0 3px ${color})`,
          }}
        />
      </svg>
    </div>
  )
}

/**
 * PageTransition — Page/content transition wrapper using framer-motion
 */
export function PageTransition({
  children,
  transitionKey,
  direction = 1,
  className = '',
}: {
  children: React.ReactNode
  transitionKey: string
  direction?: number
  className?: string
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={transitionKey}
        initial={{ opacity: 0, x: direction * 30, filter: 'blur(4px)' }}
        animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, x: -direction * 30, filter: 'blur(4px)' }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
        }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

// ============================================================
// Status Indicators
// ============================================================

/**
 * StatusBadge — Enhanced status badge with pulse for "running" state
 */
export function StatusBadge({
  status,
  label,
  className = '',
}: {
  status: 'running' | 'completed' | 'error' | 'idle' | 'pending'
  label?: string
  className?: string
}) {
  const config = useMemo(() => {
    switch (status) {
      case 'running':
        return {
          color: '#10b981',
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/30',
          textColor: 'text-emerald-400',
          defaultLabel: 'Running',
          pulse: true,
        }
      case 'completed':
        return {
          color: '#10b981',
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/20',
          textColor: 'text-emerald-400',
          defaultLabel: 'Completed',
          pulse: false,
        }
      case 'error':
        return {
          color: '#ef4444',
          bg: 'bg-red-500/10',
          border: 'border-red-500/30',
          textColor: 'text-red-400',
          defaultLabel: 'Error',
          pulse: false,
        }
      case 'pending':
        return {
          color: '#f59e0b',
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/30',
          textColor: 'text-amber-400',
          defaultLabel: 'Pending',
          pulse: false,
        }
      default:
        return {
          color: '#64748b',
          bg: 'bg-slate-500/10',
          border: 'border-slate-500/30',
          textColor: 'vl-text-muted',
          defaultLabel: 'Idle',
          pulse: false,
        }
    }
  }, [status])

  const displayLabel = label || config.defaultLabel

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-medium ${config.bg} ${config.border} ${config.textColor} ${className}`}
      role="status"
    >
      <span className="relative flex h-2 w-2">
        {config.pulse && (
          <motion.span
            className="absolute inset-0 rounded-full"
            style={{ background: config.color }}
            animate={{ scale: [1, 1.8], opacity: [0.7, 0] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
        )}
        <span
          className="relative rounded-full h-2 w-2"
          style={{ background: config.color }}
        />
      </span>
      {displayLabel}
    </motion.div>
  )
}

/**
 * LiveIndicator — "LIVE" badge with red dot and pulse
 */
export function LiveIndicator({
  label = 'LIVE',
  className = '',
}: {
  label?: string
  className?: string
}) {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 ${className}`}
      role="status"
      aria-label={`${label} — live`}
    >
      <span className="relative flex h-2 w-2">
        <motion.span
          className="absolute inset-0 rounded-full bg-red-500"
          animate={{ scale: [1, 2], opacity: [0.7, 0] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
        <span className="relative rounded-full h-2 w-2 bg-red-500" />
      </span>
      <span className="text-[10px] font-bold text-red-400 tracking-wider">{label}</span>
    </motion.div>
  )
}

/**
 * SyncIndicator — Syncing spinner + "Synced" checkmark transition
 */
export function SyncIndicator({
  isSyncing,
  lastSynced,
  className = '',
}: {
  isSyncing: boolean
  lastSynced?: string | null
  className?: string
}) {
  return (
    <AnimatePresence mode="wait">
      {isSyncing ? (
        <motion.div
          key="syncing"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-medium ${className}`}
          role="status"
          aria-label="Syncing"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          >
            <RefreshCw className="size-3" />
          </motion.div>
          Syncing...
        </motion.div>
      ) : (
        <motion.div
          key="synced"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-medium ${className}`}
          role="status"
          aria-label={lastSynced ? `Synced ${lastSynced}` : 'Synced'}
        >
          <motion.div
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            <Check className="size-3" />
          </motion.div>
          Synced{lastSynced ? ` · ${lastSynced}` : ''}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ============================================================
// prefers-reduced-motion wrapper
// ============================================================

/**
 * withReducedMotion — HOC that disables animations when prefers-reduced-motion is set
 */
export function withReducedMotion<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  const ReducedMotionWrapper = (props: P) => {
    const [prefersReduced, setPrefersReduced] = useState(false)

    useEffect(() => {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
      setPrefersReduced(mq.matches)
      const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches)
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }, [])

    if (prefersReduced) {
      return (
        <div style={{ animation: 'none !important', transition: 'none !important' }}>
          <Component {...props} />
        </div>
      )
    }

    return <Component {...props} />
  }

  ReducedMotionWrapper.displayName = `withReducedMotion(${Component.displayName || Component.name || 'Component'})`
  return ReducedMotionWrapper
}

// ============================================================
// Utility: usePrefersReducedMotion hook
// ============================================================

export function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReduced(mq.matches)
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return prefersReduced
}
