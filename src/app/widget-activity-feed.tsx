import { v4 as uuidv4 } from 'uuid';
'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, Play, UserPlus, Pencil, GitBranch, BookOpen, Settings,
  Users, Clock, Bot, Filter,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { Agent, Meeting } from './shared-types'

// ============================================================
// Types
// ============================================================

type WidgetActivityType =
  | 'meeting_created'
  | 'meeting_completed'
  | 'meeting_running'
  | 'agent_created'
  | 'agent_edited'
  | 'pipeline_updated'
  | 'knowledge_created'
  | 'system'

interface WidgetActivityItem {
  id: string
  type: WidgetActivityType
  title: string
  description: string
  timestamp: string
  read: boolean
  agentName?: string
  agentInitial?: string
  agentColor?: string
}

type FilterCategory = 'all' | 'meetings' | 'agents' | 'system'

interface TimeGroup {
  label: string
  items: WidgetActivityItem[]
}

// ============================================================
// Constants
// ============================================================

const TYPE_COLORS: Record<WidgetActivityType, string> = {
  meeting_created: '#10b981',
  meeting_completed: '#10b981',
  meeting_running: '#f59e0b',
  agent_created: '#06b6d4',
  agent_edited: '#06b6d4',
  pipeline_updated: '#8b5cf6',
  knowledge_created: '#f59e0b',
  system: '#64748b',
}

const TYPE_ICONS: Record<WidgetActivityType, React.ElementType> = {
  meeting_created: Users,
  meeting_completed: CheckCircle2,
  meeting_running: Play,
  agent_created: UserPlus,
  agent_edited: Pencil,
  pipeline_updated: GitBranch,
  knowledge_created: BookOpen,
  system: Settings,
}

const CATEGORY_MAP: Record<FilterCategory, WidgetActivityType[]> = {
  all: [],
  meetings: ['meeting_created', 'meeting_completed', 'meeting_running'],
  agents: ['agent_created', 'agent_edited'],
  system: ['pipeline_updated', 'knowledge_created', 'system'],
}

const CATEGORY_LABELS: Record<FilterCategory, string> = {
  all: 'All',
  meetings: 'Meetings',
  agents: 'Agents',
  system: 'System',
}

// ============================================================
// Helpers
// ============================================================

function generateId(): string {
  return uuidv4()
}

function relativeTime(iso: string, lang: Lang): string {
  const now = Date.now()
  const ts = new Date(iso).getTime()
  const diffSec = Math.floor((now - ts) / 1000)
  if (diffSec < 60) return t(lang, 'common.justNow')
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}${t(lang, 'common.minutesAgo')}`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}${t(lang, 'common.hoursAgo')}`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay === 1) return t(lang, 'activityFeed.timestamp.yesterday') || 'Yesterday'
  return `${diffDay}${t(lang, 'common.daysAgo')}`
}

function groupByTime(items: WidgetActivityItem[], lang: Lang): TimeGroup[] {
  const now = Date.now()
  const oneHourAgo = now - 60 * 60 * 1000
  const todayStart = new Date().setHours(0, 0, 0, 0)
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000
  const weekStart = now - 7 * 24 * 60 * 60 * 1000

  const groups: TimeGroup[] = []
  const justNow: WidgetActivityItem[] = []
  const today: WidgetActivityItem[] = []
  const yesterday: WidgetActivityItem[] = []
  const thisWeek: WidgetActivityItem[] = []
  const older: WidgetActivityItem[] = []

  for (const item of items) {
    const ts = new Date(item.timestamp).getTime()
    if (ts >= oneHourAgo) justNow.push(item)
    else if (ts >= todayStart) today.push(item)
    else if (ts >= yesterdayStart) yesterday.push(item)
    else if (ts >= weekStart) thisWeek.push(item)
    else older.push(item)
  }

  if (justNow.length > 0) groups.push({ label: 'Just now', items: justNow })
  if (today.length > 0) groups.push({ label: 'Today', items: today })
  if (yesterday.length > 0) groups.push({ label: 'Yesterday', items: yesterday })
  if (thisWeek.length > 0) groups.push({ label: 'This Week', items: thisWeek })
  if (older.length > 0) groups.push({ label: 'Earlier', items: older })

  return groups
}

function buildSeedActivities(agents: Agent[], meetings: Meeting[]): WidgetActivityItem[] {
  const now = new Date()
  const items: WidgetActivityItem[] = []

  agents.slice(0, 4).forEach((agent, i) => {
    const initial = agent.title.charAt(0).toUpperCase()
    items.push({
      id: generateId(),
      type: i % 2 === 0 ? 'agent_created' : 'agent_edited',
      title: i % 2 === 0 ? 'New agent added' : 'Agent modified',
      description: `${agent.title} ${i % 2 === 0 ? 'joined the lab' : 'profile was updated'}`,
      timestamp: new Date(now.getTime() - (i * 30 + 5) * 60 * 1000).toISOString(),
      read: i > 0,
      agentName: agent.title,
      agentInitial: initial,
      agentColor: agent.color,
    })
  })

  meetings.slice(0, 5).forEach((meeting, i) => {
    const type = meeting.status === 'completed' ? 'meeting_completed' as WidgetActivityType
      : meeting.status === 'running' ? 'meeting_running' as WidgetActivityType
      : 'meeting_created' as WidgetActivityType
    const title = type === 'meeting_completed' ? 'Meeting completed'
      : type === 'meeting_running' ? 'Meeting in progress'
      : 'Meeting scheduled'
    const desc = meeting.saveName || meeting.agenda?.substring(0, 50) || 'Untitled meeting'
    const memberName = meeting.teamLead?.title || meeting.teamMember?.title

    items.push({
      id: generateId(),
      type,
      title,
      description: desc,
      timestamp: new Date(now.getTime() - (i * 25 + 10) * 60 * 1000).toISOString(),
      read: i > 0,
      agentName: memberName,
      agentInitial: memberName?.charAt(0).toUpperCase(),
      agentColor: meeting.teamLead?.color || meeting.teamMember?.color,
    })
  })

  items.push({
    id: generateId(),
    type: 'system',
    title: 'System update',
    description: 'Dashboard widgets have been updated with new features',
    timestamp: new Date(now.getTime() - 120 * 60 * 1000).toISOString(),
    read: true,
  })

  return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

// ============================================================
// Sub-components
// ============================================================

function ActivityIconBadge({ type }: { type: WidgetActivityType }) {
  const Icon = TYPE_ICONS[type]
  const color = TYPE_COLORS[type]
  return (
    <div
      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
      style={{ background: `${color}15` }}
    >
      <Icon className="size-3.5" style={{ color }} />
    </div>
  )
}

function AgentAvatar({ initial, color }: { initial?: string; color?: string }) {
  if (!initial) return null
  return (
    <div
      className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
      style={{ background: `${color || '#64748b'}25`, color: color || '#64748b' }}
    >
      {initial}
    </div>
  )
}

function EmptyActivityState({ lang }: { lang: Lang }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="w-12 h-12 rounded-xl bg-[var(--vl-bg-inner)] flex items-center justify-center mb-3">
          <Clock className="size-5 vl-text-muted" />
        </div>
      </motion.div>
      <p className="text-xs font-medium vl-text-heading">
        {t(lang, 'dashboard.activityFeed.noActivity')}
      </p>
      <p className="text-[10px] vl-text-muted mt-0.5 text-center max-w-[180px]">
        {t(lang, 'dashboard.activityFeed.noActivityDesc')}
      </p>
    </div>
  )
}

function LiveIndicator() {
  return (
    <span className="flex items-center gap-1">
      <span className="widget-live-dot w-2 h-2 rounded-full bg-emerald-400 inline-block" />
      <span className="text-[10px] text-emerald-500 font-medium">Live</span>
    </span>
  )
}

// ============================================================
// Main Component
// ============================================================

export function WidgetActivityFeed({
  lang = 'en',
  agents = [],
  meetings = [],
}: {
  lang?: Lang
  agents?: Agent[]
  meetings?: Meeting[]
}) {
  const [activities, setActivities] = useState<WidgetActivityItem[]>([])
  const [mounted, setMounted] = useState(false)
  const [filter, setFilter] = useState<FilterCategory>('all')
  const [hasNewItems, setHasNewItems] = useState(false)
  const prevCountRef = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Initialize
  useEffect(() => {
    const seed = buildSeedActivities(agents, meetings)
    setActivities(seed)
    prevCountRef.current = seed.length
    requestAnimationFrame(() => setMounted(true))
  }, [])

  // Refresh seed data
  useEffect(() => {
    if (!mounted || (agents.length === 0 && meetings.length === 0)) return
    const seed = buildSeedActivities(agents, meetings)
    setActivities(seed)
  }, [agents.length, meetings.length, mounted])

  // Listen for new activity events
  useEffect(() => {
    const handlePush = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (!detail) return
      const newItem: WidgetActivityItem = {
        id: generateId(),
        type: detail.type || 'system',
        title: detail.title || 'New activity',
        description: detail.description || '',
        timestamp: new Date().toISOString(),
        read: false,
        agentName: detail.agentName,
        agentInitial: detail.agentInitial,
        agentColor: detail.agentColor,
      }
      setActivities(prev => [newItem, ...prev])
      setHasNewItems(true)
    }
    window.addEventListener('widget-activity:push', handlePush)
    return () => window.removeEventListener('widget-activity:push', handlePush)
  }, [])

  // Detect new items
  useEffect(() => {
    if (activities.length > prevCountRef.current) {
      setHasNewItems(true)
    }
    prevCountRef.current = activities.length
  }, [activities.length])

  // Filtered activities
  const filtered = useMemo(() => {
    if (filter === 'all') return activities
    const types = CATEGORY_MAP[filter]
    return activities.filter(a => types.includes(a.type))
  }, [activities, filter])

  const grouped = useMemo(() => groupByTime(filtered.slice(0, 20), lang), [filtered, lang])

  // Auto-dismiss live indicator on scroll
  const handleScroll = useCallback(() => {
    if (hasNewItems) setHasNewItems(false)
  }, [hasNewItems])

  if (!mounted) {
    return (
      <div className="space-y-3 animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-[var(--vl-bg-inner)]" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-3/4 rounded bg-[var(--vl-bg-inner)]" />
              <div className="h-2.5 w-1/2 rounded bg-[var(--vl-bg-inner)]" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Filter pills + live indicator */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {(Object.keys(CATEGORY_LABELS) as FilterCategory[]).map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all duration-200 whitespace-nowrap ${
                filter === cat
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-[var(--vl-bg-inner)] vl-text-muted border border-transparent hover:border-[var(--vl-border)] hover:vl-text-heading'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
        {hasNewItems && <LiveIndicator />}
      </div>

      {/* Activity list */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="max-h-64 overflow-y-auto custom-scrollbar pr-0.5 relative scroll-fade"
      >
        {grouped.length === 0 ? (
          <EmptyActivityState lang={lang} />
        ) : (
          <AnimatePresence mode="popLayout">
            {grouped.map((group, gIdx) => (
              <div key={group.label} className={gIdx > 0 ? 'mt-3' : ''}>
                {/* Time group header */}
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-semibold vl-text-muted uppercase tracking-wider">
                    {group.label}
                  </span>
                  <div className="flex-1 h-px bg-[var(--vl-border-subtle)]" />
                  <Badge
                    variant="outline"
                    className="text-[9px] bg-[var(--vl-bg-inner)] vl-text-muted border-transparent h-4 px-1.5"
                  >
                    {group.items.length}
                  </Badge>
                </div>

                {/* Items */}
                {group.items.map((item, iIdx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: -6, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, delay: iIdx * 0.03, ease: [0.23, 1, 0.32, 1] }}
                    className="flex items-center gap-2.5 py-2 px-2 rounded-lg hover:bg-[var(--vl-bg-inner)] transition-colors cursor-default"
                  >
                    <ActivityIconBadge type={item.type} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <AgentAvatar initial={item.agentInitial} color={item.agentColor} />
                        <p className={`text-[11px] leading-snug truncate ${item.read ? 'vl-text-muted' : 'vl-text-heading font-medium'}`}>
                          {item.title}
                        </p>
                        {!item.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] vl-text-muted mt-0.5 truncate pl-[26px]">
                        {item.description}
                      </p>
                    </div>
                    <span className="text-[9px] vl-text-muted whitespace-nowrap shrink-0">
                      {relativeTime(item.timestamp, lang)}
                    </span>
                  </motion.div>
                ))}
              </div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
