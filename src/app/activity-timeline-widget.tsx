'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LiveIndicator } from './realtime-indicators'

// ============================================================
// Types
// ============================================================
export type ActivityEventType =
  | 'meeting_created'
  | 'meeting_completed'
  | 'meeting_running'
  | 'agent_added'
  | 'agent_edited'
  | 'pipeline_updated'
  | 'paper_added'
  | 'note_created'
  | 'milestone_reached'

interface ActivityEvent {
  id: string
  type: ActivityEventType
  title: string
  description: string
  timestamp: string
  actionLabel?: string
  actionHref?: string
}

type DateRange = 'all' | 'today' | 'thisWeek' | 'thisMonth'

const EVENT_TYPE_COLORS: Record<ActivityEventType, string> = {
  meeting_created: '#10b981',
  meeting_completed: '#3b82f6',
  meeting_running: '#06b6d4',
  agent_added: '#8b5cf6',
  agent_edited: '#f59e0b',
  pipeline_updated: '#ec4899',
  paper_added: '#14b8a6',
  note_created: '#f97316',
  milestone_reached: '#a855f7',
}

const EVENT_TYPE_ICONS: Record<ActivityEventType, string> = {
  meeting_created: '⊕',
  meeting_completed: '✓',
  meeting_running: '▶',
  agent_added: '🤖',
  agent_edited: '✎',
  pipeline_updated: '⟳',
  paper_added: '📄',
  note_created: '📝',
  milestone_reached: '🏆',
}

const ALL_EVENT_TYPES: ActivityEventType[] = [
  'meeting_created',
  'meeting_completed',
  'meeting_running',
  'agent_added',
  'agent_edited',
  'pipeline_updated',
  'paper_added',
  'note_created',
  'milestone_reached',
]

// ============================================================
// Derive activities from meetings & agents data
// ============================================================
// Map snake_case event types to camelCase i18n keys
const EVENT_TYPE_I18N_KEY: Record<ActivityEventType, string> = {
  meeting_created: 'activityTimeline.eventTypes.meetingCreated',
  meeting_completed: 'activityTimeline.eventTypes.meetingCompleted',
  meeting_running: 'activityTimeline.eventTypes.meetingRunning',
  agent_added: 'activityTimeline.eventTypes.agentAdded',
  agent_edited: 'activityTimeline.eventTypes.agentEdited',
  pipeline_updated: 'activityTimeline.eventTypes.pipelineUpdated',
  paper_added: 'activityTimeline.eventTypes.paperAdded',
  note_created: 'activityTimeline.eventTypes.noteCreated',
  milestone_reached: 'activityTimeline.eventTypes.milestoneReached',
}

function deriveActivities(meetings: { id: string; status: string; saveName: string; type: string; createdAt: string; updatedAt: string }[], agents: { id: string; title: string; createdAt: string; updatedAt: string }[], lang: Lang): ActivityEvent[] {
  const events: ActivityEvent[] = []

  for (const m of meetings) {
    events.push({
      id: `mc-${m.id}`,
      type: 'meeting_created',
      title: m.type === 'team'
        ? t(lang, 'meeting.teamMeeting')
        : t(lang, 'meeting.individualMeeting'),
      description: m.saveName || m.id,
      timestamp: m.createdAt,
    })
    if (m.status === 'running') {
      events.push({
        id: `mr-${m.id}`,
        type: 'meeting_running',
        title: t(lang, 'common.running'),
        description: m.saveName || m.id,
        timestamp: m.updatedAt,
      })
    }
    if (m.status === 'completed') {
      events.push({
        id: `mcomp-${m.id}`,
        type: 'meeting_completed',
        title: t(lang, 'common.completed'),
        description: m.saveName || m.id,
        timestamp: m.updatedAt,
      })
    }
  }

  for (const a of agents) {
    events.push({
      id: `aa-${a.id}`,
      type: 'agent_added',
      title: t(lang, 'activityTimeline.eventTypes.agentAdded'),
      description: a.title,
      timestamp: a.createdAt,
    })
    // If updated is significantly different from created, add an edited event
    if (new Date(a.updatedAt).getTime() - new Date(a.createdAt).getTime() > 60000) {
      events.push({
        id: `ae-${a.id}`,
        type: 'agent_edited',
        title: t(lang, 'activityTimeline.eventTypes.agentEdited'),
        description: a.title,
        timestamp: a.updatedAt,
      })
    }
  }

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

// ============================================================
// Date range filter helper
// ============================================================
function matchesDateRange(timestamp: string, range: DateRange): boolean {
  if (range === 'all') return true
  const now = new Date()
  const date = new Date(timestamp)
  switch (range) {
    case 'today':
      return date.toDateString() === now.toDateString()
    case 'thisWeek': {
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - now.getDay())
      weekStart.setHours(0, 0, 0, 0)
      return date >= weekStart
    }
    case 'thisMonth': {
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    }
    default:
      return true
  }
}

function formatTimeAgo(timestamp: string): string {
  const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// ============================================================
// Activity Graph (Pure CSS sparkline)
// ============================================================
function ActivityGraph({ events, lang }: { events: ActivityEvent[]; lang: Lang }) {
  // Generate 30-day bar data
  const bars = useMemo(() => {
    const days: { date: string; count: number }[] = []
    const now = new Date()
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const count = events.filter(e => e.timestamp.split('T')[0] === dateStr).length
      days.push({ date: dateStr, count })
    }
    return days
  }, [events])

  const maxCount = Math.max(...bars.map(b => b.count), 1)

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] vl-text-muted">{t(lang, 'activityTimeline.activityGraph')}</span>
        <span className="text-[10px] vl-text-muted">{t(lang, 'activityTimeline.graph.30days')}</span>
      </div>
      <div className="flex items-end gap-[2px] h-8">
        {bars.map((bar) => (
          <div
            key={bar.date}
            className="activity-graph-bar flex-1 min-w-[3px]"
            style={{
              height: `${Math.max((bar.count / maxCount) * 100, 4)}%`,
              backgroundColor: bar.count > 0
                ? 'var(--vl-accent, #10b981)'
                : 'var(--vl-bg-inner)',
              opacity: bar.count > 0 ? 0.8 : 0.3,
            }}
            data-tooltip={`${bar.date}: ${bar.count}`}
          />
        ))}
      </div>
    </div>
  )
}

// ============================================================
// ActivityTimelineWidget
// ============================================================
interface ActivityTimelineWidgetProps {
  meetings: { id: string; status: string; saveName: string; type: string; createdAt: string; updatedAt: string }[]
  agents: { id: string; title: string; createdAt: string; updatedAt: string }[]
  lang: Lang
}

export function ActivityTimelineWidget({ meetings, agents, lang }: ActivityTimelineWidgetProps) {
  const allEvents = useMemo(() => deriveActivities(meetings, agents, lang), [meetings, agents, lang])
  const [visibleCount, setVisibleCount] = useState(20)
  const [activeTypes, setActiveTypes] = useState<Set<ActivityEventType>>(new Set(ALL_EVENT_TYPES))
  const [dateRange, setDateRange] = useState<DateRange>('all')
  const [isLive, setIsLive] = useState(false)

  // Auto-refresh detection (check for new data every 10s)
  useEffect(() => {
    const interval = setInterval(() => {
      setIsLive(true)
      setTimeout(() => setIsLive(false), 3000)
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  // Filtered events
  const filteredEvents = useMemo(() => {
    return allEvents.filter(e =>
      activeTypes.has(e.type) && matchesDateRange(e.timestamp, dateRange)
    )
  }, [allEvents, activeTypes, dateRange])

  const displayedEvents = filteredEvents.slice(0, visibleCount)

  const toggleType = useCallback((type: ActivityEventType) => {
    setActiveTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }, [])

  const loadMore = useCallback(() => {
    setVisibleCount(prev => prev + 20)
  }, [])

  const dateRanges: { key: DateRange; labelKey: string }[] = [
    { key: 'all', labelKey: 'activityTimeline.filter.allTime' },
    { key: 'thisMonth', labelKey: 'activityTimeline.filter.thisMonth' },
    { key: 'thisWeek', labelKey: 'activityTimeline.filter.thisWeek' },
    { key: 'today', labelKey: 'activityTimeline.filter.today' },
  ]

  return (
    <div className="space-y-3">
      {/* Live indicator */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium vl-text-muted">{t(lang, 'activityTimeline.description')}</h3>
        <LiveIndicator lang={lang} />
      </div>

      {/* Activity Graph */}
      <ActivityGraph events={allEvents} lang={lang} />

      {/* Filter Bar */}
      <div className="space-y-2">
        {/* Date range filter */}
        <div className="flex flex-wrap gap-1">
          {dateRanges.map(dr => (
            <button
              key={dr.key}
              className={`timeline-filter-chip ${dateRange === dr.key ? 'active' : ''}`}
              onClick={() => setDateRange(dr.key)}
            >
              {t(lang, dr.labelKey)}
            </button>
          ))}
        </div>
        {/* Event type filter chips */}
        <div className="flex flex-wrap gap-1">
          {ALL_EVENT_TYPES.map(type => (
            <button
              key={type}
              className={`timeline-filter-chip ${activeTypes.has(type) ? '' : 'opacity-40'}`}
              style={activeTypes.has(type) ? { borderColor: EVENT_TYPE_COLORS[type], color: EVENT_TYPE_COLORS[type] } : {}}
              onClick={() => toggleType(type)}
            >
              <span>{EVENT_TYPE_ICONS[type]}</span>
              <span className="hidden sm:inline">{t(lang, EVENT_TYPE_I18N_KEY[type])}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      {displayedEvents.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm vl-text-muted">{t(lang, 'activityTimeline.noActivity')}</p>
          <p className="text-xs vl-text-muted mt-1">{t(lang, 'activityTimeline.noActivityDesc')}</p>
        </div>
      ) : (
        <div className="timeline-container">
          {/* Connecting line */}
          <div className="timeline-line" style={{ backgroundColor: 'var(--vl-border)', opacity: 0.3 }} />

          {displayedEvents.map((event, index) => (
            <div
              key={event.id}
              className="relative pl-6 pb-4 last:pb-0"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {/* Node */}
              <div
                className="timeline-node"
                style={{
                  top: '2px',
                  backgroundColor: `${EVENT_TYPE_COLORS[event.type]}20`,
                  border: `2px solid ${EVENT_TYPE_COLORS[event.type]}`,
                  animationDelay: `${index * 0.05}s`,
                }}
              >
                <span style={{ fontSize: '8px' }}>{EVENT_TYPE_ICONS[event.type]}</span>
              </div>

              {/* Card */}
              <div className="timeline-card rounded-lg p-3 vl-inner border" style={{ borderColor: 'var(--vl-border)', animationDelay: `${index * 0.05 + 0.1}s` }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium vl-text-heading truncate">{event.title}</p>
                    <p className="text-[11px] vl-text-muted truncate mt-0.5">{event.description}</p>
                  </div>
                  <span className="text-[10px] vl-text-muted whitespace-nowrap flex-shrink-0">
                    {formatTimeAgo(event.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More */}
      {visibleCount < filteredEvents.length && (
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 text-xs"
            onClick={loadMore}
          >
            {t(lang, 'activityTimeline.loadMore')}
          </Button>
        </div>
      )}
    </div>
  )
}
