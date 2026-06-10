'use client'

import React, { useState, useCallback } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// ============================================================
// Sound Types
// ============================================================
export type SoundType = 'success' | 'error' | 'info' | 'meeting_complete'

interface SoundPreferences {
  enabled: boolean
  masterVolume: number
  perSound: Record<SoundType, boolean>
}

const DEFAULT_PREFS: SoundPreferences = {
  enabled: true,
  masterVolume: 0.5,
  perSound: {
    success: true,
    error: true,
    info: true,
    meeting_complete: true,
  },
}

function loadPrefs(): SoundPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFS
  try {
    const saved = localStorage.getItem('vl-notification-sound-prefs')
    if (saved) {
      const parsed = JSON.parse(saved)
      return {
        ...DEFAULT_PREFS,
        ...parsed,
        perSound: { ...DEFAULT_PREFS.perSound, ...(parsed.perSound || {}) },
      }
    }
  } catch { /* ignore */ }
  return DEFAULT_PREFS
}

function savePrefs(prefs: SoundPreferences) {
  try {
    localStorage.setItem('vl-notification-sound-prefs', JSON.stringify(prefs))
  } catch { /* ignore */ }
}

// ============================================================
// Web Audio API Sound Generator
// ============================================================
let audioCtxRef: (AudioContext | null)[] = [null]

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (audioCtxRef[0] && audioCtxRef[0].state !== 'closed') return audioCtxRef[0]
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    const ctx = new AC()
    audioCtxRef[0] = ctx
    return ctx
  } catch { /* AudioContext not supported */ }
  return null
}

function playTone(frequency: number, duration: number, volume: number, type: OscillatorType = 'sine', startDelay = 0) {
  const ctx = getAudioContext()
  if (!ctx) return
  if (ctx.state === 'suspended') ctx.resume()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.value = frequency
  gain.gain.setValueAtTime(volume * 0.3, ctx.currentTime + startDelay)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startDelay + duration)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(ctx.currentTime + startDelay)
  osc.stop(ctx.currentTime + startDelay + duration + 0.05)
}

const SOUND_GENERATORS: Record<SoundType, (volume: number) => void> = {
  success: (volume) => {
    // Ascending two-tone chime
    playTone(523.25, 0.15, volume, 'sine', 0)
    playTone(659.25, 0.2, volume, 'sine', 0.12)
  },
  error: (volume) => {
    // Descending tone
    playTone(440, 0.2, volume, 'sawtooth', 0)
    playTone(349.23, 0.25, volume, 'sawtooth', 0.15)
  },
  info: (volume) => {
    // Single ping
    playTone(880, 0.2, volume * 0.5, 'sine', 0)
  },
  meeting_complete: (volume) => {
    // Celebration chord: C major (C, E, G)
    playTone(523.25, 0.3, volume, 'sine', 0)
    playTone(659.25, 0.3, volume, 'sine', 0.05)
    playTone(783.99, 0.4, volume, 'sine', 0.1)
  },
}

// ============================================================
// useNotificationSound Hook
// ============================================================
export function useNotificationSound() {
  const [prefs, setPrefs] = useState<SoundPreferences>(() => {
    if (typeof window === 'undefined') return DEFAULT_PREFS
    return loadPrefs()
  })

  const play = useCallback((soundType: SoundType) => {
    if (!prefs.enabled) return
    if (!prefs.perSound[soundType]) return
    SOUND_GENERATORS[soundType]?.(prefs.masterVolume)
  }, [prefs.enabled, prefs.masterVolume, prefs.perSound])

  const updatePrefs = useCallback((updates: Partial<SoundPreferences>) => {
    setPrefs(prev => {
      const next = { ...prev, ...updates }
      savePrefs(next)
      return next
    })
  }, [])

  const toggleEnabled = useCallback(() => {
    updatePrefs({ enabled: !prefs.enabled })
  }, [prefs.enabled, updatePrefs])

  const setVolume = useCallback((volume: number) => {
    updatePrefs({ masterVolume: volume })
  }, [updatePrefs])

  const toggleSoundType = useCallback((soundType: SoundType) => {
    setPrefs(prev => {
      const next = {
        ...prev,
        perSound: { ...prev.perSound, [soundType]: !prev.perSound[soundType] },
      }
      savePrefs(next)
      return next
    })
  }, [])

  return {
    enabled: prefs.enabled,
    volume: prefs.masterVolume,
    perSound: prefs.perSound,
    play,
    toggleEnabled,
    setVolume,
    toggleSoundType,
  }
}

// ============================================================
// SoundToggle Component
// ============================================================
export function SoundToggle({ lang }: { lang: Lang }) {
  const { enabled, toggleEnabled, volume, setVolume } = useNotificationSound()

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 vl-text-muted hover:text-white"
        onClick={toggleEnabled}
        aria-label={enabled ? t(lang, 'sounds.enabled') : t(lang, 'sounds.disabled')}
      >
        {enabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
      </Button>
      {enabled && (
        <Slider
          value={[volume]}
          onValueChange={([v]) => setVolume(v)}
          min={0}
          max={1}
          step={0.1}
          className="w-16 h-1"
          aria-label={t(lang, 'sounds.volume')}
        />
      )}
    </div>
  )
}

// ============================================================
// SoundPreferencesPanel — for Settings tab
// ============================================================
export function SoundPreferencesPanel({ lang }: { lang: Lang }) {
  const { enabled, toggleEnabled, volume, setVolume, perSound, toggleSoundType, play } = useNotificationSound()

  const soundTypes: { key: SoundType; icon: string; labelKey: string }[] = [
    { key: 'success', icon: '✓', labelKey: 'sounds.success' },
    { key: 'error', icon: '✗', labelKey: 'sounds.error' },
    { key: 'info', icon: 'ℹ', labelKey: 'sounds.info' },
    { key: 'meeting_complete', icon: '🏆', labelKey: 'sounds.meetingComplete' },
  ]

  return (
    <Card className="vl-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold vl-text-heading">{t(lang, 'sounds.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Master toggle */}
        <div className="flex items-center justify-between">
          <Label className="text-sm vl-text-heading">{t(lang, 'sounds.enable')}</Label>
          <Switch checked={enabled} onCheckedChange={toggleEnabled} />
        </div>

        {/* Master volume */}
        {enabled && (
          <>
            <div className="space-y-2">
              <Label className="text-xs vl-text-muted">{t(lang, 'sounds.masterVolume')}</Label>
              <Slider
                value={[volume]}
                onValueChange={([v]) => setVolume(v)}
                min={0}
                max={1}
                step={0.05}
                className="w-full"
              />
            </div>

            <Separator />

            {/* Per-sound settings */}
            <div className="space-y-3">
              <Label className="text-xs font-medium vl-text-muted">{t(lang, 'sounds.perSoundSettings')}</Label>
              {soundTypes.map(({ key, icon, labelKey }) => (
                <div key={key} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{icon}</span>
                    <Label className="text-sm vl-text-heading">{t(lang, labelKey)}</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[10px] vl-text-muted hover:text-white"
                      onClick={() => play(key)}
                    >
                      {t(lang, 'sounds.preview')}
                    </Button>
                    <Switch
                      checked={perSound[key]}
                      onCheckedChange={() => toggleSoundType(key)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
