'use client'

import { useState, useEffect, useCallback } from 'react'
import { Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

interface PWAInstallPromptProps {
  lang: Lang
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'vlab-pwa-dismissed'
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days

export function PWAInstallPrompt({ lang }: PWAInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [animating, setAnimating] = useState(false)

  // Check if previously dismissed
  const isDismissed = useCallback(() => {
    try {
      const dismissedAt = localStorage.getItem(DISMISS_KEY)
      if (dismissedAt) {
        const elapsed = Date.now() - parseInt(dismissedAt, 10)
        return elapsed < DISMISS_DURATION
      }
    } catch { /* ignore */ }
    return false
  }, [])

  // Listen for beforeinstallprompt
  useEffect(() => {
    if (isDismissed()) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Show with a slight delay for smooth entrance
      setTimeout(() => {
        setAnimating(true)
        setVisible(true)
      }, 1000)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [isDismissed])

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return
    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setVisible(false)
      }
    } catch { /* ignore */ }
    setDeferredPrompt(null)
  }, [deferredPrompt])

  const handleDismiss = useCallback(() => {
    setAnimating(false)
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch { /* ignore */ }
    setTimeout(() => setVisible(false), 300)
  }, [])

  if (!visible) return null

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[100] transition-transform duration-300 ease-out ${
        animating ? 'translate-y-0' : '-translate-y-full'
      }`}
      role="banner"
      aria-label={t(lang, 'pwa.installLabel')}
    >
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white px-4 py-2.5 flex items-center justify-between gap-3 shadow-lg shadow-emerald-500/20">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Download className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium truncate">
            {t(lang, 'pwa.installMessage')}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-3 text-xs font-semibold bg-white/20 hover:bg-white/30 text-white border-0 rounded-md"
            onClick={handleInstall}
          >
            {t(lang, 'pwa.installButton')}
          </Button>
          <button
            onClick={handleDismiss}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/20 transition-colors"
            aria-label={t(lang, 'a11y.close')}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
