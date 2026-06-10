'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, RefreshCw, Inbox, ArrowRight, Loader2, Search, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

// ============================================================
// ShimmerSkeleton — Gradient shimmer skeleton loader
// ============================================================

type ShimmerVariant = 'text' | 'heading' | 'avatar' | 'card' | 'button' | 'image'

export function ShimmerSkeleton({
  variant = 'text',
  width,
  height,
  lines = 1,
  gap = 8,
  className = '',
}: {
  variant?: ShimmerVariant
  width?: string | number
  height?: string | number
  lines?: number
  gap?: number
  className?: string
}) {
  const getVariantClass = () => {
    switch (variant) {
      case 'heading': return 'shimmer-heading rounded-md'
      case 'avatar': return 'shimmer-avatar rounded-full'
      case 'card': return 'shimmer-card rounded-xl'
      case 'button': return 'shimmer-button rounded-lg'
      case 'image': return 'shimmer-image rounded-lg'
      default: return 'shimmer-text rounded'
    }
  }

  const getVariantSize = () => {
    const s = (w: string | number | undefined, h: string | number | undefined) => ({
      width: w ? (typeof w === 'number' ? `${w}px` : w) : undefined,
      height: h ? (typeof h === 'number' ? `${h}px` : h) : undefined,
    })

    switch (variant) {
      case 'heading': return s(width || '60%', height || '24px')
      case 'avatar': return s(width || '40px', height || '40px')
      case 'card': return s(width || '100%', height || '200px')
      case 'button': return s(width || '120px', height || '36px')
      case 'image': return s(width || '100%', height || '180px')
      default: return s(width || (lines > 1 ? '100%' : '70%'), height || '14px')
    }
  }

  if (variant === 'text' && lines > 1) {
    return (
      <div className={`space-y-${Math.min(gap, 4)} ${className}`} style={{ display: 'flex', flexDirection: 'column', gap }}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`shimmer-text rounded ${i === lines - 1 ? 'w-3/5' : 'w-full'}`}
            style={{ height: height || '14px' }}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={`shimmer-skeleton ${getVariantClass()} ${className}`}
      style={getVariantSize()}
    />
  )
}

// ============================================================
// ProgressiveImageLoader — Blur-up image loading
// ============================================================

export function ProgressiveImageLoader({
  src,
  alt = '',
  className = '',
  width,
  height,
}: {
  src: string
  alt?: string
  className?: string
  width?: number
  height?: number
}) {
  return (
    <ProgressiveImageInner src={src} alt={alt} className={className} width={width} height={height} />
  )
}

function ProgressiveImageInner({
  src,
  alt = '',
  className = '',
  width,
  height,
}: {
  src: string
  alt?: string
  className?: string
  width?: number
  height?: number
}) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    const img = new Image()
    img.onload = () => { if (!cancelled) setLoaded(true) }
    img.onerror = () => { if (!cancelled) setError(true) }
    img.src = src
    return () => { cancelled = true }
  }, [src])

  return (
    <div className={`progressive-image-wrapper relative overflow-hidden rounded-lg ${className}`} style={{ width, height }}>
      {!loaded && !error && (
        <div className="shimmer-image absolute inset-0" />
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--vl-bg-card)]">
          <WifiOff className="size-6 vl-text-muted" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`progressive-image object-cover w-full h-full ${loaded ? 'loaded' : ''}`}
        style={{ filter: loaded ? 'blur(0px)' : 'blur(20px)' }}
      />
    </div>
  )
}

// ============================================================
// LoadingOverlay — Full-content loading overlay
// ============================================================

type SpinnerStyle = 'ring' | 'dots' | 'bars' | 'pulse'

export function LoadingOverlay({
  text,
  spinnerStyle = 'ring',
  size = 40,
  lang = 'en',
}: {
  text?: string
  spinnerStyle?: SpinnerStyle
  size?: number
  lang?: Lang
}) {
  const label = text || t(lang, 'loading.overlay')

  const renderSpinner = () => {
    switch (spinnerStyle) {
      case 'dots':
        return (
          <div className="loading-dots flex gap-2">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="w-3 h-3 rounded-full bg-[var(--vl-accent)]"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </div>
        )
      case 'bars':
        return (
          <div className="loading-bars flex gap-1 items-end" style={{ height: size }}>
            {[0, 1, 2, 3].map(i => (
              <motion.div
                key={i}
                className="w-1.5 rounded-full bg-[var(--vl-accent)]"
                animate={{ height: ['40%', '100%', '40%'] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
              />
            ))}
          </div>
        )
      case 'pulse':
        return (
          <div className="loading-pulse relative" style={{ width: size, height: size }}>
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="absolute inset-0 rounded-full border-2 border-[var(--vl-accent)]"
                animate={{ scale: [0.5, 1.2], opacity: [0.8, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
              />
            ))}
          </div>
        )
      default:
        return (
          <div className="loading-ring" style={{ width: size, height: size }}>
            <svg className="animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="var(--vl-accent)" strokeWidth="3" />
              <path className="opacity-75" fill="var(--vl-accent)" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )
    }
  }

  return (
    <div className="loading-overlay fixed inset-0 z-[90] flex flex-col items-center justify-center gap-4 bg-[var(--vl-bg-primary)]/80 backdrop-blur-sm">
      {renderSpinner()}
      <p className="vl-text-muted text-sm animate-pulse">{label}</p>
    </div>
  )
}

// ============================================================
// StaggeredLoader — Skeleton items appearing one by one
// ============================================================

export function StaggeredLoader({
  count = 4,
  staggerDelay = 100,
  variant = 'card' as ShimmerVariant,
  className = '',
}: {
  count?: number
  staggerDelay?: number
  variant?: ShimmerVariant
  className?: string
}) {
  const [visibleCount, setVisibleCount] = useState(0)

  useEffect(() => {
    if (visibleCount < count) {
      const timer = setTimeout(() => setVisibleCount(prev => prev + 1), staggerDelay)
      return () => clearTimeout(timer)
    }
  }, [visibleCount, count, staggerDelay])

  return (
    <div className={`staggered-loader grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            opacity: i < visibleCount ? 1 : 0,
            transform: i < visibleCount ? 'translateY(0)' : 'translateY(12px)',
            transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
          }}
        >
          <ShimmerSkeleton variant={variant} />
        </div>
      ))}
    </div>
  )
}

// ============================================================
// ErrorBoundaryUI — User-friendly error display
// ============================================================

export function ErrorBoundaryUI({
  message,
  details,
  onRetry,
  lang = 'en',
}: {
  message?: string
  details?: string
  onRetry?: () => void
  lang?: Lang
}) {
  const [isRetrying, setIsRetrying] = useState(false)

  const handleRetry = () => {
    setIsRetrying(true)
    setTimeout(() => {
      setIsRetrying(false)
      onRetry?.()
    }, 600)
  }

  return (
    <div className="error-boundary flex flex-col items-center justify-center py-16 px-4 text-center">
      <motion.div
        className="error-boundary-icon w-20 h-20 rounded-2xl bg-red-500/10 flex items-center justify-center mb-6 relative"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
      >
        <AlertTriangle className="size-10 text-red-400" />
        <div className="absolute inset-0 rounded-2xl bg-red-500/5 blur-xl" />
      </motion.div>

      <h3 className="vl-text-heading text-xl font-bold mb-2">
        {message || t(lang, 'error.somethingWentWrong')}
      </h3>
      {details && (
        <p className="vl-text-muted text-sm max-w-md mb-6">{details}</p>
      )}

      <div className="flex items-center gap-3">
        {onRetry && (
          <Button
            onClick={handleRetry}
            className="bg-[var(--vl-accent)] hover:bg-[var(--vl-accent)]/90 text-white"
            disabled={isRetrying}
          >
            <motion.span
              animate={isRetrying ? { rotate: 360 } : { rotate: 0 }}
              transition={isRetrying ? { duration: 0.6, repeat: Infinity, ease: 'linear' } : {}}
              className="inline-flex items-center gap-2"
            >
              <RefreshCw className="size-4" />
              {t(lang, 'error.tryAgain')}
            </motion.span>
          </Button>
        )}
        <Button variant="ghost" className="vl-text-muted" onClick={() => window.location.reload()}>
          {t(lang, 'error.refreshPage')}
        </Button>
      </div>
    </div>
  )
}

// ============================================================
// EmptyStateEnhanced — Rich empty state with animated illustration
// ============================================================

export function EmptyStateEnhanced({
  icon: Icon = Inbox,
  title,
  description,
  primaryAction,
  primaryLabel,
  onPrimaryAction,
  secondaryAction,
  secondaryLabel,
  onSecondaryAction,
  tips,
  accentColor = 'var(--vl-accent)',
  lang = 'en',
}: {
  icon?: React.ElementType
  title?: string
  description?: string
  primaryAction?: React.ReactNode
  primaryLabel?: string
  onPrimaryAction?: () => void
  secondaryAction?: React.ReactNode
  secondaryLabel?: string
  onSecondaryAction?: () => void
  tips?: string
  accentColor?: string
  lang?: Lang
}) {
  return (
    <div className="empty-state-enhanced flex flex-col items-center justify-center py-16 px-4 text-center relative">
      {/* Animated floating illustration */}
      <motion.div
        className="empty-state-illustration w-24 h-24 rounded-3xl flex items-center justify-center mb-8 relative"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 150, damping: 12 }}
        style={{ background: `linear-gradient(135deg, ${accentColor}15, ${accentColor}05)` }}
      >
        {/* Glow backdrop */}
        <div className="absolute inset-0 rounded-3xl blur-2xl opacity-30" style={{ background: accentColor }} />
        {/* Main icon */}
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Icon className="size-12" style={{ color: accentColor }} />
        </motion.div>
        {/* Orbiting small dot */}
        <motion.div
          className="absolute w-2 h-2 rounded-full"
          style={{ background: accentColor, opacity: 0.6 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        />
      </motion.div>

      <h3 className="vl-text-heading text-2xl font-bold mb-2">
        {title || t(lang, 'empty.noData')}
      </h3>
      <p className="vl-text-muted text-sm max-w-md mb-6 leading-relaxed">
        {description || t(lang, 'empty.noDataDesc')}
      </p>

      {/* Primary action */}
      {primaryAction || (primaryLabel && onPrimaryAction && (
        <Button
          className="mb-3 text-white shadow-lg hover-scale-102"
          style={{
            background: accentColor,
            boxShadow: `0 4px 20px ${accentColor}33`,
          }}
          onClick={onPrimaryAction}
        >
          {primaryLabel}
          <ArrowRight className="size-4 ml-1" />
        </Button>
      ))}

      {/* Secondary action */}
      {secondaryAction || (secondaryLabel && onSecondaryAction && (
        <button
          className="vl-text-muted text-sm hover:text-[var(--vl-text-primary)] transition-colors cursor-pointer"
          onClick={onSecondaryAction}
        >
          {secondaryLabel}
        </button>
      ))}

      {/* Tips */}
      {tips && (
        <motion.p
          className="vl-text-muted text-xs mt-6 max-w-sm italic opacity-70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: 0.4 }}
        >
          💡 {tips}
        </motion.p>
      )}
    </div>
  )
}
