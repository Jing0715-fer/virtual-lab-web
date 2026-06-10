'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { WifiOff, Wifi } from 'lucide-react'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

interface OfflineIndicatorProps {
  lang: Lang
}

type Status = 'online' | 'offline' | 'back-online' | 'checking'

/**
 * Enhanced offline detection:
 * 1. Use navigator.onLine as a first check
 * 2. If navigator.onLine is false, do a lightweight fetch probe to confirm
 *    (in sandbox/proxy environments, navigator.onLine may be inaccurate)
 */
function useConnectivityCheck() {
  const [status, setStatus] = useState<Status>('checking')
  const probeRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const probeServer = useCallback(async (): Promise<boolean> => {
    try {
      // Lightweight probe — just fetch the page root with no-cache
      const res = await fetch('/?_probe=' + Date.now(), {
        method: 'HEAD',
        cache: 'no-store',
        signal: AbortSignal.timeout(3000),
      })
      return res.ok || res.status === 200
    } catch {
      return false
    }
  }, [])

  const handleOnline = useCallback(() => {
    setStatus('back-online')
    // Auto-transition to 'online' after 3 seconds
    setTimeout(() => setStatus('online'), 3000)
  }, [])

  const handleOffline = useCallback(() => {
    // Don't trust navigator offline blindly — probe the server
    probeServer().then(reachable => {
      if (reachable) {
        setStatus('online')
      } else {
        setStatus('offline')
      }
    })
  }, [probeServer])

  useEffect(() => {
    // Initial check
    if (typeof navigator === 'undefined') {
      setStatus('online')
      return
    }

    if (navigator.onLine) {
      setStatus('online')
    } else {
      // navigator says offline, but verify
      probeServer().then(reachable => {
        setStatus(reachable ? 'online' : 'offline')
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Periodic connectivity check every 30s when we think we're offline
    probeRef.current = setInterval(() => {
      if (!navigator.onLine) {
        probeServer().then(reachable => {
          if (reachable && status === 'offline') {
            setStatus('back-online')
            setTimeout(() => setStatus('online'), 3000)
          }
        })
      }
    }, 30000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (probeRef.current) clearInterval(probeRef.current)
    }
  }, [handleOnline, handleOffline, probeServer, status])

  return status
}

export function OfflineIndicator({ lang }: OfflineIndicatorProps) {
  const status = useConnectivityCheck()

  const isOffline = status === 'offline'
  const isBackOnline = status === 'back-online'
  const show = isOffline || isBackOnline

  if (!show) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[101] transition-transform duration-300 ease-out translate-y-0"
      role="alert"
      aria-live="polite"
    >
      <div
        className={`px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium shadow-md ${
          isOffline
            ? 'bg-amber-500 text-white'
            : 'bg-emerald-500 text-white'
        }`}
      >
        {isOffline ? (
          <>
            <WifiOff className="w-3.5 h-3.5" />
            <span>{t(lang, 'pwa.offlineMessage')}</span>
          </>
        ) : (
          <>
            <Wifi className="w-3.5 h-3.5" />
            <span>{t(lang, 'pwa.backOnlineMessage')}</span>
          </>
        )}
      </div>
    </div>
  )
}
