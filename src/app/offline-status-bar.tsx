'use client'

/**
 * Enhanced Offline Status Bar
 *
 * Provides a compact connection status indicator for the header area.
 * Shows green/red dot with debounced detection, click for offline capabilities.
 * Integrates with the useOnlineStatus hook for robust detection.
 */

import React, { useState, useCallback, useMemo } from 'react'
import { Wifi, WifiOff, Database, ArrowRight, CheckCircle2, X, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

// ============================================================
// useOnlineStatus Hook — debounced connection detection
// ============================================================

interface OnlineStatus {
  isOnline: boolean
  wasOffline: boolean
  lastOnlineAt: number | null
  lastOfflineAt: number | null
  isTransitioning: boolean
}

export function useOnlineStatus(debounceMs = 500): OnlineStatus {
  const [status, setStatus] = React.useState<OnlineStatus>(() => ({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    wasOffline: false,
    lastOnlineAt: null,
    lastOfflineAt: null,
    isTransitioning: false,
  }))

  React.useEffect(() => {
    if (typeof window === 'undefined') return

    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    const handleOnline = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        setStatus(prev => ({
          ...prev,
          isOnline: true,
          wasOffline: prev.isOnline === false,
          lastOnlineAt: Date.now(),
          isTransitioning: true,
        }))
        // Clear transitioning flag after 3 seconds
        setTimeout(() => {
          setStatus(prev => ({ ...prev, isTransitioning: false }))
        }, 3000)
      }, debounceMs)
    }

    const handleOffline = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        setStatus(prev => ({
          ...prev,
          isOnline: false,
          lastOfflineAt: Date.now(),
          isTransitioning: false,
        }))
      }, debounceMs)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (debounceTimer) clearTimeout(debounceTimer)
    }
  }, [debounceMs])

  return status
}

// ============================================================
// Offline Capabilities
// ============================================================

interface OfflineCapability {
  name: string
  available: boolean
  icon: React.ReactNode
}

const OFFLINE_CAPABILITIES: OfflineCapability[] = [
  { name: 'View cached meetings', available: true, icon: <Database className="size-3" /> },
  { name: 'View cached agents', available: true, icon: <Database className="size-3" /> },
  { name: 'View dashboard stats', available: true, icon: <Database className="size-3" /> },
  { name: 'Create local notes', available: true, icon: <CheckCircle2 className="size-3" /> },
  { name: 'API calls', available: false, icon: <WifiOff className="size-3" /> },
  { name: 'Real-time updates', available: false, icon: <WifiOff className="size-3" /> },
]

// ============================================================
// OfflineStatusBar Component
// ============================================================

interface OfflineStatusBarProps {
  className?: string
}

export function OfflineStatusBar({ className = '' }: OfflineStatusBarProps) {
  const [showCapabilities, setShowCapabilities] = useState(false)
  const { isOnline, wasOffline, isTransitioning } = useOnlineStatus()

  const statusLabel = useMemo(() => {
    if (isTransitioning && isOnline) return 'Back Online'
    if (isOnline) return 'Online'
    return 'Offline'
  }, [isOnline, isTransitioning])

  const handleToggle = useCallback(() => {
    setShowCapabilities(prev => !prev)
  }, [])

  return (
    <div className={`relative ${className}`}>
      {/* Status indicator */}
      <button
        onClick={handleToggle}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium transition-colors hover:bg-[var(--vl-bg-inner)] cursor-pointer"
        aria-label={`Connection: ${statusLabel}. Click to see offline capabilities.`}
      >
        <span className={`relative flex h-2 w-2`}>
          {isOnline ? (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40" />
          ) : null}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              isOnline
                ? isTransitioning
                  ? 'bg-emerald-300 animate-pulse'
                  : 'bg-emerald-400'
                : 'bg-red-400'
            }`}
          />
        </span>
        <span className={isOnline ? 'text-emerald-400' : 'text-red-400'}>{statusLabel}</span>
      </button>

      {/* Capabilities popover */}
      {showCapabilities && (
        <>
          <div className="fixed inset-0 z-[99]" onClick={() => setShowCapabilities(false)} />
          <div
            className="absolute top-full right-0 mt-2 w-64 rounded-xl shadow-xl z-[100] p-3 space-y-2"
            style={{ background: 'var(--vl-bg-card)', border: '1px solid var(--vl-border)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold vl-text-heading">Offline Capabilities</span>
              <button onClick={() => setShowCapabilities(false)} className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--vl-bg-inner)]">
                <X className="size-3 vl-text-muted" />
              </button>
            </div>

            {isOnline ? (
              <div className="flex items-center gap-1.5 text-emerald-400 text-[10px]">
                <CheckCircle2 className="size-3" />
                <span>All features available</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-amber-400 text-[10px]">
                <WifiOff className="size-3" />
                <span>Limited features in offline mode</span>
              </div>
            )}

            <div className="space-y-1 border-t pt-2" style={{ borderColor: 'var(--vl-border)' }}>
              {OFFLINE_CAPABILITIES.map((cap, i) => (
                <div key={i} className="flex items-center justify-between py-0.5">
                  <div className="flex items-center gap-1.5 text-[10px] vl-text-body">
                    {cap.icon}
                    <span>{cap.name}</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`border-0 text-[8px] px-1 py-0 ${
                      cap.available || isOnline ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
                    }`}
                  >
                    {cap.available || isOnline ? 'OK' : 'Unavailable'}
                  </Badge>
                </div>
              ))}
            </div>

            {!isOnline && (
              <div className="text-[9px] vl-text-muted pt-1 border-t" style={{ borderColor: 'var(--vl-border)' }}>
                <Clock className="size-3 inline mr-1" />
                Actions will queue for sync when connection resumes.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
