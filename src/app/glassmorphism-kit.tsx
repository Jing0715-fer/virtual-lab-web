'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  X, CheckCircle2, AlertTriangle, AlertCircle, Info,
  Minus, Maximize2, GripHorizontal, Loader2,
} from 'lucide-react'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

// ============================================================
// Types
// ============================================================

type GlassBlur = 'sm' | 'md' | 'lg' | 'xl'
type GlassButtonVariant = 'default' | 'glow' | 'outline' | 'ghost'
type GlassToastType = 'success' | 'error' | 'warning' | 'info'

interface GlassCardProps {
  children: React.ReactNode
  blur?: GlassBlur
  opacity?: number
  glowColor?: string
  glowOnHover?: boolean
  innerGradient?: boolean
  className?: string
  onClick?: () => void
}

interface GlassPanelProps {
  children: React.ReactNode
  title?: React.ReactNode
  blur?: GlassBlur
  opacity?: number
  collapsible?: boolean
  defaultOpen?: boolean
  draggable?: boolean
  resizable?: boolean
  glowColor?: string
  className?: string
  lang?: Lang
}

interface GlassButtonProps {
  children: React.ReactNode
  variant?: GlassButtonVariant
  glowColor?: string
  loading?: boolean
  disabled?: boolean
  className?: string
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  type?: 'button' | 'submit' | 'reset'
  size?: 'sm' | 'md' | 'lg'
  icon?: React.ReactNode
}

interface GlassToastProps {
  id?: string
  type?: GlassToastType
  title: string
  message?: string
  duration?: number
  onClose?: () => void
  lang?: Lang
}

interface GlassToastItem {
  id: string
  type: GlassToastType
  title: string
  message?: string
  duration: number
}

// ============================================================
// Blur mapping
// ============================================================

const BLUR_MAP: Record<GlassBlur, string> = {
  sm: 'backdrop-blur-sm',
  md: 'backdrop-blur-md',
  lg: 'backdrop-blur-lg',
  xl: 'backdrop-blur-xl',
}

// ============================================================
// GlassCard — Glassmorphism card with configurable effects
// ============================================================

export function GlassCard({
  children,
  blur = 'md',
  opacity = 0.6,
  glowColor,
  glowOnHover = false,
  innerGradient = false,
  className = '',
  onClick,
}: GlassCardProps) {
  const [mounted, setMounted] = useState(false)
  const [hovered, setHovered] = useState(false)
  useEffect(() => { requestAnimationFrame(() => { setMounted(true) }) }, [])

  if (!mounted) {
    return (
      <div className={cn('rounded-xl border bg-gray-100 p-4', className)}>
        <div className="h-16 bg-gray-200 rounded animate-pulse" />
      </div>
    )
  }

  return (
    <motion.div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'relative rounded-xl border overflow-hidden',
        BLUR_MAP[blur],
        className,
      )}
      style={{
        backgroundColor: `rgba(255, 255, 255, ${opacity * 0.08})`,
        borderColor: 'rgba(255, 255, 255, 0.12)',
      }}
      whileHover={{
        scale: 1.005,
        boxShadow: glowColor
          ? `0 8px 32px ${glowColor}25, 0 0 0 1px ${glowColor}20`
          : '0 8px 32px rgba(0, 0, 0, 0.12)',
      }}
      transition={{ duration: 0.3 }}
    >
      {/* Inner gradient decoration */}
      {innerGradient && (
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            background: `linear-gradient(135deg, ${glowColor || '#10b981'}15 0%, transparent 50%, ${glowColor || '#8b5cf6'}10 100%)`,
          }}
        />
      )}

      {/* Glow border on hover */}
      {(glowOnHover || glowColor) && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          animate={{
            boxShadow: hovered && glowColor
              ? `inset 0 0 0 1px ${glowColor}30, 0 0 20px ${glowColor}15`
              : glowColor
                ? `inset 0 0 0 1px ${glowColor}15`
                : 'inset 0 0 0 0px transparent',
          }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  )
}

// ============================================================
// GlassPanel — Collapsible, optionally draggable & resizable panel
// ============================================================

export function GlassPanel({
  children,
  title,
  blur = 'lg',
  opacity = 0.5,
  collapsible = true,
  defaultOpen = true,
  draggable = false,
  resizable = false,
  glowColor,
  className = '',
  lang,
}: GlassPanelProps) {
  const [mounted, setMounted] = useState(false)
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [isResizing, setIsResizing] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const dragStart = useRef({ x: 0, y: 0, pos_x: 0, pos_y: 0 })
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 })

  useEffect(() => { requestAnimationFrame(() => { setMounted(true) }) }, [])

  // Draggable handlers
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (!draggable) return
    setIsDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY, pos_x: position.x, pos_y: position.y }

    const handleDragMove = (ev: MouseEvent) => {
      const dx = ev.clientX - dragStart.current.x
      const dy = ev.clientY - dragStart.current.y
      setPosition({
        x: dragStart.current.pos_x + dx,
        y: dragStart.current.pos_y + dy,
      })
    }

    const handleDragEnd = () => {
      setIsDragging(false)
      document.removeEventListener('mousemove', handleDragMove)
      document.removeEventListener('mouseup', handleDragEnd)
    }

    document.addEventListener('mousemove', handleDragMove)
    document.addEventListener('mouseup', handleDragEnd)
  }, [draggable, position])

  // Resizable handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    if (!resizable || !panelRef.current) return
    setIsResizing(true)
    const rect = panelRef.current.getBoundingClientRect()
    resizeStart.current = { x: e.clientX, y: e.clientY, w: rect.width, h: rect.height }

    const handleResizeMove = (ev: MouseEvent) => {
      const dw = ev.clientX - resizeStart.current.x
      const dh = ev.clientY - resizeStart.current.y
      setDimensions({
        width: Math.max(200, resizeStart.current.w + dw),
        height: Math.max(100, resizeStart.current.h + dh),
      })
    }

    const handleResizeEnd = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleResizeMove)
      document.removeEventListener('mouseup', handleResizeEnd)
    }

    document.addEventListener('mousemove', handleResizeMove)
    document.addEventListener('mouseup', handleResizeEnd)
  }, [resizable])

  if (!mounted) {
    return (
      <div className={cn('rounded-xl border bg-gray-100 p-4', className)}>
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-2" />
        <div className="h-20 bg-gray-200 rounded" />
      </div>
    )
  }

  return (
    <motion.div
      ref={panelRef}
      className={cn(
        'relative rounded-xl border overflow-hidden',
        BLUR_MAP[blur],
        className,
        isDragging && 'cursor-grabbing z-50',
      )}
      style={{
        backgroundColor: `rgba(255, 255, 255, ${opacity * 0.06})`,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        transform: draggable ? `translate(${position.x}px, ${position.y}px)` : undefined,
        ...(dimensions.width > 0 ? { width: dimensions.width } : {}),
        ...(dimensions.height > 0 ? { height: dimensions.height } : {}),
      }}
    >
      {/* Header */}
      {(title || collapsible) && (
        <div
          className={cn(
            'flex items-center gap-2 px-4 py-3 border-b',
            'border-white/10',
            draggable && 'cursor-grab',
          )}
          onMouseDown={handleDragStart}
        >
          {draggable && (
            <GripHorizontal className="size-4 vl-text-muted flex-shrink-0" />
          )}
          {title && (
            <h3 className="text-sm font-semibold vl-text-heading flex-1">{title}</h3>
          )}
          {collapsible && (
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors"
              aria-label={isOpen ? 'Collapse' : 'Expand'}
            >
              <motion.div
                animate={{ rotate: isOpen ? 0 : 180 }}
                transition={{ duration: 0.2 }}
              >
                <Minus className="size-3.5 vl-text-muted" />
              </motion.div>
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resize handle */}
      {resizable && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize opacity-40 hover:opacity-80 transition-opacity"
          onMouseDown={handleResizeStart}
        >
          <Maximize2 className="size-3 vl-text-muted rotate-180" />
        </div>
      )}

      {/* Glow accent */}
      {glowColor && (
        <div
          className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{ background: `linear-gradient(90deg, transparent, ${glowColor}40, transparent)` }}
        />
      )}
    </motion.div>
  )
}

// ============================================================
// GlassButton — Glassmorphism button with variants
// ============================================================

export function GlassButton({
  children,
  variant = 'default',
  glowColor,
  loading = false,
  disabled = false,
  className = '',
  onClick,
  type = 'button',
  size = 'md',
  icon,
}: GlassButtonProps) {
  const [mounted, setMounted] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  useEffect(() => { requestAnimationFrame(() => { setMounted(true) }) }, [])

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5',
  }

  const color = glowColor || '#10b981'

  if (!mounted) {
    return (
      <button
        type={type}
        disabled
        className={cn(
          'rounded-xl border bg-gray-100',
          sizeClasses[size],
          className,
        )}
      >
        <span className="opacity-0">{children}</span>
      </button>
    )
  }

  return (
    <motion.button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      className={cn(
        'relative rounded-xl border overflow-hidden font-medium',
        'transition-all duration-200 inline-flex items-center justify-center',
        'backdrop-blur-md',
        sizeClasses[size],
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
      style={{
        ...(variant === 'default' && {
          backgroundColor: `${color}15`,
          borderColor: `${color}30`,
          color: color,
        }),
        ...(variant === 'glow' && {
          backgroundColor: `${color}20`,
          borderColor: `${color}50`,
          color: color,
        }),
        ...(variant === 'outline' && {
          backgroundColor: 'transparent',
          borderColor: `${color}40`,
          color: color,
        }),
        ...(variant === 'ghost' && {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          color: color,
        }),
      }}
      whileHover={
        variant === 'glow'
          ? { boxShadow: `0 0 20px ${color}30, 0 0 40px ${color}15` }
          : variant === 'ghost'
            ? { backgroundColor: `${color}10` }
            : { boxShadow: `0 4px 16px ${color}20` }
      }
      whileTap={disabled || loading ? {} : { scale: 0.96, y: 1 }}
      animate={
        isPressed
          ? { boxShadow: `inset 0 2px 4px rgba(0,0,0,0.2)` }
          : variant === 'glow'
            ? { boxShadow: `0 0 12px ${color}20` }
            : {}
      }
    >
      {/* Loading spinner */}
      {loading && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Loader2 className="size-4 animate-spin" style={{ color }} />
        </motion.div>
      )}

      {/* Animated glow ring for loading state */}
      {loading && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          animate={{
            boxShadow: [
              `inset 0 0 0 1px ${color}20`,
              `inset 0 0 0 1px ${color}50, 0 0 15px ${color}20`,
              `inset 0 0 0 1px ${color}20`,
            ],
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      <span className={cn(loading && 'invisible', 'flex items-center gap-inherit')}>
        {icon && !loading && <span className="flex-shrink-0">{icon}</span>}
        {children}
      </span>
    </motion.button>
  )
}

// ============================================================
// GlassToast — Glassmorphism toast notification
// ============================================================

const TOAST_ICONS: Record<GlassToastType, React.ElementType> = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const TOAST_COLORS: Record<GlassToastType, string> = {
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
}

function SingleToast({ id, type, title, message, duration, onClose, lang }: GlassToastProps) {
  const [mounted, setMounted] = useState(false)
  const [progress, setProgress] = useState(100)
  const startTime = useRef(Date.now())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => { requestAnimationFrame(() => { setMounted(true) }) }, [])

  const handleClose = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    onClose?.()
  }, [onClose])

  useEffect(() => {
    startTime.current = Date.now()
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime.current
      const remaining = Math.max(0, 100 - (elapsed / (duration ?? 5000)) * 100)
      setProgress(remaining)
      if (remaining <= 0 && intervalRef.current) {
        clearInterval(intervalRef.current)
        handleClose()
      }
    }, 50)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [duration, handleClose])

  if (!mounted) return null

  const Icon = TOAST_ICONS[type || 'info']
  const color = TOAST_COLORS[type || 'info']

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.9 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className={cn(
        'relative w-80 rounded-xl border overflow-hidden',
        'backdrop-blur-xl shadow-2xl',
      )}
      style={{
        backgroundColor: `rgba(255, 255, 255, 0.08)`,
        borderColor: `${color}25`,
      }}
      role="alert"
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{ backgroundColor: color }}
      />

      <div className="flex items-start gap-3 p-4">
        <div
          className="flex-shrink-0 p-1.5 rounded-lg"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="size-4" style={{ color }} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold vl-text-heading">{title}</p>
          {message && (
            <p className="text-xs vl-text-muted mt-0.5 line-clamp-2">{message}</p>
          )}
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <X className="size-3.5 vl-text-muted" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-white/5">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.1, ease: 'linear' }}
        />
      </div>
    </motion.div>
  )
}

// ============================================================
// Toast Container — Global toast manager
// ============================================================

let toastIdCounter = 0
const toastListeners: Set<(toasts: GlassToastItem[]) => void> = new Set()
let currentToasts: GlassToastItem[] = []

function emitToasts() {
  toastListeners.forEach(listener => listener([...currentToasts]))
}

function addToast(item: Omit<GlassToastItem, 'id'>): string {
  const id = `glass-toast-${++toastIdCounter}`
  currentToasts.push({ ...item, id })
  emitToasts()
  return id
}

function removeToast(id: string) {
  currentToasts = currentToasts.filter(t => t.id !== id)
  emitToasts()
}

export function glassToast(params: {
  type?: GlassToastType
  title: string
  message?: string
  duration?: number
}) {
  return addToast({
    type: params.type || 'info',
    title: params.title,
    message: params.message,
    duration: params.duration || 5000,
  })
}

export function GlassToastContainer({ lang }: { lang?: Lang }) {
  const [mounted, setMounted] = useState(false)
  const [toasts, setToasts] = useState<GlassToastItem[]>([])

  useEffect(() => {
    setMounted(true)
    const listener = (newToasts: GlassToastItem[]) => setToasts(newToasts)
    toastListeners.add(listener)
    return () => { toastListeners.delete(listener) }
  }, [])

  if (!mounted || toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <SingleToast
              id={toast.id}
              type={toast.type}
              title={toast.title}
              message={toast.message}
              duration={toast.duration}
              onClose={() => removeToast(toast.id)}
              lang={lang}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}

// ============================================================
// Export all
// ============================================================

export default GlassCard
