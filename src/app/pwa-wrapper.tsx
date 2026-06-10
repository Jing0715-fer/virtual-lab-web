'use client'

/**
 * Enhanced PWA Wrapper
 *
 * Manages:
 * - PWA install prompt (deferred, dismiss-able)
 * - Offline detection with debounced status changes
 * - Offline capabilities popup
 * - Service worker registration
 */

import { PWAInstallPrompt } from './pwa-prompt'
import { OfflineIndicator } from './offline-indicator'
import { useOnlineStatus } from './offline-status-bar'
import type { Lang } from '@/lib/i18n'
import { useEffect, useCallback } from 'react'

function getStoredLang(): Lang {
  if (typeof window === 'undefined') return 'en'
  try {
    const saved = localStorage.getItem('vl-lang') as Lang
    if (saved === 'en' || saved === 'zh') return saved
  } catch { /* ignore */ }
  return 'en'
}

// Service worker registration
function registerServiceWorker() {
  if (typeof window === 'undefined') return
  if (!('serviceWorker' in navigator)) return

  try {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[PWA] Service Worker registered:', registration.scope)

        // Check for updates periodically
        setInterval(() => {
          registration.update()
        }, 60 * 60 * 1000) // Every hour

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated') {
                // Notify the app about the update
                if (navigator.serviceWorker.controller) {
                  navigator.serviceWorker.controller.postMessage({ type: 'SW_UPDATED' })
                }
              }
            })
          }
        })
      })
      .catch((err) => {
        console.warn('[PWA] Service Worker registration failed:', err)
      })

    // Listen for messages from the service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'SW_UPDATED') {
        // Could show a toast notification here
        console.log('[PWA] New service worker version available')
      }
    })
  } catch { /* ignore */ }
}

export function PWAWrapper() {
  const lang = getStoredLang()
  const { isOnline, isTransitioning } = useOnlineStatus()

  // Register service worker on mount
  useEffect(() => {
    registerServiceWorker()
  }, [])

  return (
    <>
      <PWAInstallPrompt lang={lang} />
      <OfflineIndicator lang={lang} />
    </>
  )
}
