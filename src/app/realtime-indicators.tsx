'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

// ============================================================
// LiveDot — Universal live indicator
// ============================================================
export function LiveDot({
  variant = 'online',
  label,
  className = '',
}: {
  variant?: 'online' | 'busy' | 'offline'
  label?: string
  className?: string
}) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`} role="status" aria-label={label || variant}>
      <div className={`live-dot ${variant}`} />
      {label && (
        <span className="text-[10px] font-medium vl-text-muted">{label}</span>
      )}
    </div>
  )
}

// ============================================================
// ConnectionStatus — API/backend connection status
// ============================================================
export function ConnectionStatus({ lang }: { lang: Lang }) {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const checkConnection = async () => {
    setStatus('checking')
    try {
      const res = await fetch('/api/agents', { method: 'HEAD', cache: 'no-store' })
      setStatus(res.ok ? 'connected' : 'disconnected')
    } catch {
      setStatus('disconnected')
    }
  }

  useEffect(() => {
    const doCheck = async () => {
      setStatus('checking')
      try {
        const res = await fetch('/api/agents', { method: 'HEAD', cache: 'no-store' })
        setStatus(res.ok ? 'connected' : 'disconnected')
      } catch {
        setStatus('disconnected')
      }
    }
    doCheck()
    intervalRef.current = setInterval(doCheck, 30000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const statusLabel = status === 'connected'
    ? t(lang, 'realtime.connected')
    : status === 'disconnected'
    ? t(lang, 'realtime.disconnected')
    : t(lang, 'realtime.checking')

  return (
    <div className="flex items-center gap-1.5" role="status" aria-label={statusLabel}>
      <div className={`connection-status-dot ${status}`} />
      <span className="text-[10px] vl-text-muted">{statusLabel}</span>
    </div>
  )
}

// ============================================================
// MeetingStatusTicker — Scrolling ticker for recent activities
// ============================================================
export function MeetingStatusTicker({
  activities,
  lang,
}: {
  activities: { text: string }[]
  lang: Lang
}) {
  // Only show when there are activities
  if (!activities || activities.length === 0) return null

  // Duplicate items for seamless loop
  const items = [...activities, ...activities]

  return (
    <div className="ticker-container" role="marquee" aria-label={t(lang, 'activityTimeline.title')}>
      <div className="ticker-track">
        {items.map((item, i) => (
          <span key={i} className="ticker-item">
            {item.text}
            <span className="ticker-separator">·</span>
          </span>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// UnreadBadgePulse — Enhanced badge with pulse animation
// ============================================================
export function UnreadBadgePulse({
  count,
  className = '',
}: {
  count: number
  className?: string
}) {
  if (count <= 0) return null

  return (
    <span
      className={`unread-badge-pulse absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-gradient-to-r from-red-500 to-red-600 text-white text-[10px] font-bold flex items-center justify-center px-1 shadow-lg shadow-red-500/30 ${className}`}
      role="status"
      aria-live="polite"
    >
      {count > 9 ? '9+' : count}
    </span>
  )
}

// ============================================================
// LiveIndicator — Combined Live badge for sections
// ============================================================
export function LiveIndicator({ lang }: { lang: Lang }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
      <div className="live-dot online" />
      <span className="text-[10px] font-medium text-emerald-400">{t(lang, 'activityTimeline.live')}</span>
    </div>
  )
}

// ============================================================
// deriveTickerActivities — Generate ticker text from meetings/agents
// ============================================================
export function deriveTickerActivities(meetings: { status: string; saveName: string; type: string; updatedAt: string }[], agents: { title: string; updatedAt: string }[], lang: Lang): { text: string }[] {
  const activities: { text: string; time: string }[] = []

  for (const m of meetings) {
    if (m.status === 'running') {
      activities.push({
        text: `${m.type === 'team' ? 'Team' : 'Individual'} meeting "${m.saveName || 'Untitled'}" is running`,
        time: m.updatedAt,
      })
    } else if (m.status === 'completed') {
      activities.push({
        text: `Meeting "${m.saveName || 'Untitled'}" completed`,
        time: m.updatedAt,
      })
    }
  }

  for (const a of agents) {
    activities.push({
      text: `Agent "${a.title}" active`,
      time: a.updatedAt,
    })
  }

  // Sort by recency and return top 10
  return activities
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 10)
    .map(a => ({ text: a.text }))
}
