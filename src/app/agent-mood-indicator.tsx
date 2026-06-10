'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Brain, Volume2, Moon, Sparkles, Crosshair } from 'lucide-react'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

// ============================================================
// Types
// ============================================================

export type AgentMood = 'thinking' | 'speaking' | 'idle' | 'excited' | 'focused'

interface MoodConfig {
  key: AgentMood
  i18nKey: string
  icon: React.ElementType
  color: string          // Tailwind text color class
  bgColor: string       // Tailwind bg color class
  borderColor: string   // Tailwind border color class
  animationClass: string
  dotColor: string      // raw color for inline styles
}

const MOOD_CONFIGS: MoodConfig[] = [
  {
    key: 'thinking',
    i18nKey: 'agents.mood.thinking',
    icon: Brain,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/15',
    borderColor: 'border-cyan-500/30',
    animationClass: 'mood-thinking',
    dotColor: '#06b6d4',
  },
  {
    key: 'speaking',
    i18nKey: 'agents.mood.speaking',
    icon: Volume2,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/15',
    borderColor: 'border-emerald-500/30',
    animationClass: 'mood-speaking',
    dotColor: '#10b981',
  },
  {
    key: 'idle',
    i18nKey: 'agents.mood.idle',
    icon: Moon,
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/15',
    borderColor: 'border-slate-500/30',
    animationClass: 'mood-idle',
    dotColor: '#64748b',
  },
  {
    key: 'excited',
    i18nKey: 'agents.mood.excited',
    icon: Sparkles,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/15',
    borderColor: 'border-amber-500/30',
    animationClass: 'mood-excited',
    dotColor: '#f59e0b',
  },
  {
    key: 'focused',
    i18nKey: 'agents.mood.focused',
    icon: Crosshair,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/15',
    borderColor: 'border-violet-500/30',
    animationClass: 'mood-focused',
    dotColor: '#8b5cf6',
  },
]

const AUTO_CYCLE_INTERVAL = 8000 // 8 seconds

// ============================================================
// MoodIndicator — Compact badge next to agent avatars
// ============================================================

interface MoodIndicatorProps {
  mood: AgentMood
  lang: Lang
  size?: 'sm' | 'md'
  showLabel?: boolean
  onClick?: () => void
  className?: string
}

export function MoodIndicator({
  mood,
  lang,
  size = 'sm',
  showLabel = false,
  onClick,
  className = '',
}: MoodIndicatorProps) {
  const config = MOOD_CONFIGS.find(c => c.key === mood) || MOOD_CONFIGS[2] // fallback to idle
  const Icon = config.icon

  const sizeClasses = size === 'sm'
    ? 'w-5 h-5 text-[10px]'
    : 'w-7 h-7 text-xs'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        mood-badge inline-flex items-center gap-1.5 rounded-full border px-1.5 py-0.5
        ${config.bgColor} ${config.borderColor} ${config.animationClass}
        cursor-pointer select-none focus-ring
        ${sizeClasses}
        ${className}
      `}
      title={t(lang, 'agents.mood.clickToCycle')}
      aria-label={`${t(lang, config.i18nKey)} — ${t(lang, 'agents.mood.clickToCycle')}`}
    >
      <Icon className={`shrink-0 ${config.color} ${size === 'sm' ? 'size-3' : 'size-3.5'}`} />
      {showLabel && (
        <span className={`font-medium ${config.color} whitespace-nowrap`}>
          {t(lang, config.i18nKey)}
        </span>
      )}
    </button>
  )
}

// ============================================================
// MoodIndicatorWithState — Auto-cycling mood indicator
// ============================================================

interface MoodIndicatorWithStateProps {
  lang: Lang
  size?: 'sm' | 'md'
  showLabel?: boolean
  initialMood?: AgentMood
  className?: string
}

export function MoodIndicatorWithState({
  lang,
  size = 'sm',
  showLabel = false,
  initialMood = 'idle',
  className = '',
}: MoodIndicatorWithStateProps) {
  const [mood, setMood] = useState<AgentMood>(initialMood)

  // Auto-cycle through moods
  useEffect(() => {
    const timer = setInterval(() => {
      setMood(prev => {
        const currentIdx = MOOD_CONFIGS.findIndex(c => c.key === prev)
        const nextIdx = (currentIdx + 1) % MOOD_CONFIGS.length
        return MOOD_CONFIGS[nextIdx].key
      })
    }, AUTO_CYCLE_INTERVAL)
    return () => clearInterval(timer)
  }, [])

  const handleClick = useCallback(() => {
    setMood(prev => {
      const currentIdx = MOOD_CONFIGS.findIndex(c => c.key === prev)
      const nextIdx = (currentIdx + 1) % MOOD_CONFIGS.length
      return MOOD_CONFIGS[nextIdx].key
    })
  }, [])

  return (
    <MoodIndicator
      mood={mood}
      lang={lang}
      size={size}
      showLabel={showLabel}
      onClick={handleClick}
      className={className}
    />
  )
}

// ============================================================
// MoodSpeakingWaves — Animated wave bars for speaking mood
// ============================================================

function MoodSpeakingWaves({ color }: { color: string }) {
  return (
    <div className="flex items-end gap-[2px] h-4" aria-hidden="true">
      {[0, 1, 2, 3].map(i => (
        <div
          key={i}
          className={`mood-wave-bar w-[2.5px] rounded-full`}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  )
}

// ============================================================
// MoodAvatarOverlay — Badge overlay on agent avatars
// ============================================================

interface MoodAvatarOverlayProps {
  mood: AgentMood
  lang: Lang
}

export function MoodAvatarOverlay({ mood, lang }: MoodAvatarOverlayProps) {
  const config = MOOD_CONFIGS.find(c => c.key === mood) || MOOD_CONFIGS[2]
  const Icon = config.icon

  return (
    <div
      className={`
        absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[var(--vl-bg-card)]
        flex items-center justify-center z-10
        ${config.bgColor} ${config.animationClass}
      `}
      title={t(lang, config.i18nKey)}
      aria-label={t(lang, config.i18nKey)}
    >
      <Icon className={`size-2.5 ${config.color}`} />
    </div>
  )
}

// ============================================================
// MoodLabel — Text label showing current mood
// ============================================================

interface MoodLabelProps {
  mood: AgentMood
  lang: Lang
  className?: string
}

export function MoodLabel({ mood, lang, className = '' }: MoodLabelProps) {
  const config = MOOD_CONFIGS.find(c => c.key === mood) || MOOD_CONFIGS[2]
  const Icon = config.icon

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <Icon className={`size-3 ${config.color}`} />
      <span className={`text-xs font-medium ${config.color}`}>
        {t(lang, config.i18nKey)}
      </span>
    </span>
  )
}

// ============================================================
// Utility: Get mood config by key
// ============================================================

export function getMoodConfig(mood: AgentMood): MoodConfig {
  return MOOD_CONFIGS.find(c => c.key === mood) || MOOD_CONFIGS[2]
}

export function getAllMoodConfigs(): MoodConfig[] {
  return MOOD_CONFIGS
}

// ============================================================
// MoodSelector — Dropdown-style mood picker (optional advanced usage)
// ============================================================

interface MoodSelectorProps {
  currentMood: AgentMood
  lang: Lang
  onSelect: (mood: AgentMood) => void
  className?: string
}

export function MoodSelector({ currentMood, lang, onSelect, className = '' }: MoodSelectorProps) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`} role="radiogroup" aria-label="Select agent mood">
      {MOOD_CONFIGS.map(config => {
        const Icon = config.icon
        const isActive = config.key === currentMood
        return (
          <button
            key={config.key}
            type="button"
            onClick={() => onSelect(config.key)}
            className={`
              mood-badge inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium
              transition-all duration-200 select-none
              ${isActive
                ? `${config.bgColor} ${config.borderColor} ${config.color} ring-1 ${config.borderColor}`
                : 'bg-[var(--vl-bg-inner)] border-[var(--vl-border-subtle)] vl-text-muted hover:bg-[var(--vl-bg-card-hover)]'
              }
            `}
            role="radio"
            aria-checked={isActive}
            aria-label={t(lang, config.i18nKey)}
          >
            <Icon className="size-3" />
            {t(lang, config.i18nKey)}
          </button>
        )
      })}
    </div>
  )
}
