'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, XCircle, AlertTriangle, Info, Loader2, X,
  RotateCcw, ExternalLink, ChevronRight,
} from 'lucide-react'

// ============================================================
// Types
// ============================================================

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading'
type ToastPosition = 'top-right' | 'bottom-right' | 'top-center' | 'bottom-center'

interface EnhancedToastData {
  id: string
  type: ToastType
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  duration?: number
  persistent?: boolean
  createdAt: number
  exiting: boolean
}

// ============================================================
// Internal Store (singleton, works across components)
// ============================================================

const toastListeners: Array<(toasts: EnhancedToastData[]) => void> = []
let toastStore: EnhancedToastData[] = []

function syncListeners() {
  toastListeners.forEach(listener => listener([...toastStore]))
}

function addEnhancedToast(item: Omit<EnhancedToastData, 'id' | 'createdAt' | 'exiting'>): string {
  const id = `et-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const newItem: EnhancedToastData = {
    ...item,
    id,
    createdAt: Date.now(),
    exiting: false,
  }
  toastStore = [newItem, ...toastStore].slice(0, 10) // Max 10
  syncListeners()
  return id
}

function dismissEnhancedToast(id: string) {
  toastStore = toastStore.map(t => t.id === id ? { ...t, exiting: true } : t)
  syncListeners()
  // Remove after animation
  setTimeout(() => {
    toastStore = toastStore.filter(t => t.id !== id)
    syncListeners()
  }, 350)
}

function clearAllEnhancedToasts() {
  toastStore = toastStore.map(t => ({ ...t, exiting: true }))
  syncListeners()
  setTimeout(() => {
    toastStore = []
    syncListeners()
  }, 350)
}

// ============================================================
// Toast type configuration
// ============================================================

const TOAST_CONFIG: Record<ToastType, {
  icon: React.ElementType
  color: string
  bg: string
  border: string
  glow: string
  textColor: string
  iconBg: string
}> = {
  success: {
    icon: CheckCircle2,
    color: '#10b981',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    glow: 'shadow-emerald-500/10',
    textColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/20',
  },
  error: {
    icon: XCircle,
    color: '#ef4444',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    glow: 'shadow-red-500/10',
    textColor: 'text-red-400',
    iconBg: 'bg-red-500/20',
  },
  warning: {
    icon: AlertTriangle,
    color: '#f59e0b',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    glow: 'shadow-amber-500/10',
    textColor: 'text-amber-400',
    iconBg: 'bg-amber-500/20',
  },
  info: {
    icon: Info,
    color: '#06b6d4',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    glow: 'shadow-cyan-500/10',
    textColor: 'text-cyan-400',
    iconBg: 'bg-cyan-500/20',
  },
  loading: {
    icon: Loader2,
    color: '#64748b',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
    glow: 'shadow-slate-500/10',
    textColor: 'text-slate-400',
    iconBg: 'bg-slate-500/20',
  },
}

// ============================================================
// Position styles
// ============================================================

const POSITION_STYLES: Record<ToastPosition, string> = {
  'top-right': 'fixed top-4 right-4 z-[100]',
  'bottom-right': 'fixed bottom-4 right-4 z-[100]',
  'top-center': 'fixed top-4 left-1/2 -translate-x-1/2 z-[100]',
  'bottom-center': 'fixed bottom-4 left-1/2 -translate-x-1/2 z-[100]',
}

const POSITION_VARIANTS = {
  'top-right': { initial: { x: 300, opacity: 0, scale: 0.95 }, animate: { x: 0, opacity: 1, scale: 1 }, exit: { x: 300, opacity: 0, scale: 0.95 } },
  'bottom-right': { initial: { x: 300, opacity: 0, scale: 0.95 }, animate: { x: 0, opacity: 1, scale: 1 }, exit: { x: 300, opacity: 0, scale: 0.95 } },
  'top-center': { initial: { y: -60, opacity: 0, scale: 0.95 }, animate: { y: 0, opacity: 1, scale: 1 }, exit: { y: -60, opacity: 0, scale: 0.95 } },
  'bottom-center': { initial: { y: 60, opacity: 0, scale: 0.95 }, animate: { y: 0, opacity: 1, scale: 1 }, exit: { y: 60, opacity: 0, scale: 0.95 } },
}

// ============================================================
// Toast Auto-Dismiss Progress Bar
// ============================================================

function ToastProgressBar({
  duration,
  color,
  paused,
}: {
  duration: number
  color: string
  paused: boolean
}) {
  const [width, setWidth] = useState('100%')
  const startTimeRef = useRef<number>(Date.now())
  const rafRef = useRef<number>(0)
  const pausedAtRef = useRef<number>(0)
  const pausedDurationRef = useRef<number>(0)

  useEffect(() => {
    if (paused) {
      pausedAtRef.current = Date.now()
      cancelAnimationFrame(rafRef.current)
      return
    }

    if (pausedAtRef.current > 0) {
      pausedDurationRef.current += Date.now() - pausedAtRef.current
      pausedAtRef.current = 0
    }

    startTimeRef.current = Date.now()

    const tick = () => {
      const elapsed = Date.now() - startTimeRef.current - pausedDurationRef.current
      const remaining = Math.max(0, 1 - elapsed / duration)
      setWidth(`${remaining * 100}%`)
      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [duration, paused])

  return (
    <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-none"
        style={{
          width,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          boxShadow: `0 0 4px ${color}44`,
        }}
      />
    </div>
  )
}

// ============================================================
// Single Toast Item
// ============================================================

function EnhancedToastItem({
  item,
  onDismiss,
  position,
}: {
  item: EnhancedToastData
  onDismiss: (id: string) => void
  position: ToastPosition
}) {
  const [isHovered, setIsHovered] = useState(false)
  const config = TOAST_CONFIG[item.type]
  const IconComp = config.icon
  const duration = item.duration ?? (item.type === 'error' ? 6000 : item.type === 'loading' ? 0 : 4000)
  const isPersistent = item.persistent || item.type === 'loading' || duration === 0

  // Auto dismiss (skip for persistent/loading)
  useEffect(() => {
    if (item.exiting || isPersistent) return
    const timer = setTimeout(() => {
      onDismiss(item.id)
    }, duration)
    return () => clearTimeout(timer)
  }, [item.id, item.exiting, isPersistent, duration, onDismiss])

  const variants = POSITION_VARIANTS[position]

  return (
    <motion.div
      layout
      initial={variants.initial}
      animate={variants.animate}
      exit={variants.exit}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 30,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        relative overflow-hidden rounded-xl border backdrop-blur-md
        ${config.bg} ${config.border}
        shadow-lg ${config.glow}
        max-w-[360px] w-full pointer-events-auto
      `}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="flex items-start gap-3 p-3.5">
        {/* Icon */}
        <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${config.iconBg}`}>
          {item.type === 'loading' ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
            >
              <IconComp className={`size-3.5 ${config.textColor}`} />
            </motion.div>
          ) : (
            <motion.div
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 12 }}
            >
              <IconComp className={`size-3.5 ${config.textColor}`} />
            </motion.div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold leading-snug ${config.textColor}`}>
            {item.title}
          </p>
          {item.description && (
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--vl-text-muted)' }}>
              {item.description}
            </p>
          )}
          {/* Action button */}
          {item.action && (
            <motion.button
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              onClick={(e) => {
                e.stopPropagation()
                item.action?.onClick()
              }}
              className={`mt-2 text-[10px] font-medium px-2.5 py-1 rounded-md ${config.textColor} bg-[var(--vl-bg-inner)] border border-[var(--vl-border-subtle)] hover:bg-[var(--vl-bg-card-hover)] transition-colors inline-flex items-center gap-1`}
            >
              {item.action.label}
              <ChevronRight className="size-2.5" />
            </motion.button>
          )}
        </div>

        {/* Dismiss button */}
        {!isPersistent && (
          <button
            onClick={() => onDismiss(item.id)}
            className="shrink-0 w-5 h-5 rounded-md flex items-center justify-center opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity vl-text-muted hover:text-red-400 hover:bg-red-500/10"
            aria-label="Dismiss"
          >
            <X className="size-3" />
          </button>
        )}
      </div>

      {/* Auto-dismiss progress bar */}
      {!isPersistent && duration > 0 && (
        <ToastProgressBar
          duration={duration}
          color={config.color}
          paused={isHovered}
        />
      )}
    </motion.div>
  )
}

// ============================================================
// Toast Container
// ============================================================

export function EnhancedToastContainer({
  position = 'top-right',
  gap = 8,
}: {
  position?: ToastPosition
  gap?: number
}) {
  const [toasts, setToasts] = useState<EnhancedToastData[]>([])

  useEffect(() => {
    toastListeners.push(setToasts)
    return () => {
      const idx = toastListeners.indexOf(setToasts)
      if (idx > -1) toastListeners.splice(idx, 1)
    }
  }, [])

  const handleDismiss = useCallback((id: string) => {
    dismissEnhancedToast(id)
  }, [])

  const isHorizontal = position === 'top-center' || position === 'bottom-center'

  return (
    <div
      className={POSITION_STYLES[position]}
      aria-label="Toast notifications"
    >
      <div className={`flex flex-col gap-${Math.min(Math.round(gap / 4), 4)} ${isHorizontal ? 'items-center' : 'items-end'}`}
        style={{ gap: `${gap}px` }}
      >
        <AnimatePresence mode="popLayout">
          {toasts.map(toast => (
            <EnhancedToastItem
              key={toast.id}
              item={toast}
              onDismiss={handleDismiss}
              position={position}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ============================================================
// useAdvancedToast Hook
// ============================================================

export function useAdvancedToast() {
  const addToast = useCallback((item: Omit<EnhancedToastData, 'id' | 'createdAt' | 'exiting'>): string => {
    return addEnhancedToast(item)
  }, [])

  const toastApi = useMemo(() => ({
    success: (title: string, description?: string, options?: { action?: EnhancedToastData['action']; duration?: number; persistent?: boolean }) => {
      return addToast({ type: 'success', title, description, ...options, duration: options?.duration ?? 4000 })
    },
    error: (title: string, description?: string, options?: { action?: EnhancedToastData['action']; duration?: number; persistent?: boolean }) => {
      return addToast({ type: 'error', title, description, ...options, duration: options?.duration ?? 6000 })
    },
    warning: (title: string, description?: string, options?: { action?: EnhancedToastData['action']; duration?: number; persistent?: boolean }) => {
      return addToast({ type: 'warning', title, description, ...options, duration: options?.duration ?? 4000 })
    },
    info: (title: string, description?: string, options?: { action?: EnhancedToastData['action']; duration?: number; persistent?: boolean }) => {
      return addToast({ type: 'info', title, description, ...options, duration: options?.duration ?? 4000 })
    },
    loading: (title: string, description?: string) => {
      return addToast({ type: 'loading', title, description, duration: 0 })
    },
    dismiss: dismissEnhancedToast,
    clearAll: clearAllEnhancedToasts,
  }), [addToast])

  return toastApi
}

// ============================================================
// Standalone toast functions (fire-and-forget, no hook needed)
// ============================================================

export const advancedToast = {
  success: (title: string, description?: string, duration?: number) => {
    addEnhancedToast({ type: 'success', title, description, duration: duration ?? 4000 })
  },
  error: (title: string, description?: string, duration?: number) => {
    addEnhancedToast({ type: 'error', title, description, duration: duration ?? 6000 })
  },
  warning: (title: string, description?: string, duration?: number) => {
    addEnhancedToast({ type: 'warning', title, description, duration: duration ?? 4000 })
  },
  info: (title: string, description?: string, duration?: number) => {
    addEnhancedToast({ type: 'info', title, description, duration: duration ?? 4000 })
  },
  loading: (title: string, description?: string) => {
    return addEnhancedToast({ type: 'loading', title, description, duration: 0 })
  },
  dismiss: dismissEnhancedToast,
  clearAll: clearAllEnhancedToasts,
}
