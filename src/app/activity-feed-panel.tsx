import { v4 as uuidv4 } from 'uuid';
'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Clock, Users, CheckCircle2, Play, UserPlus, Pencil,
  GitBranch, BookOpen, Settings, Search, Filter,
  ChevronDown, Bell, CheckCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

// ============================================================
// Types
// ============================================================

export type ActivityType =
  | 'meeting_created'
  | 'meeting_completed'
  | 'meeting_running'
  | 'agent_created'
  | 'agent_edited'
  | 'pipeline_updated'
  | 'knowledge_created'
  | 'system'

export interface ActivityItem {
  id: string
  type: ActivityType
  description: string
  timestamp: string // ISO string
  read: boolean
  metadata?: Record<string, string>
}

interface ActivityFeedData {
  activities: ActivityItem[]
  lastUpdated: string
}

type TimeRange = 'last-hour' | 'today' | 'last-7-days' | 'all'

const STORAGE_KEY = 'virtual-lab-activity-feed'

const VISIBLE_COUNT = 20

// ============================================================
// Icon mapping per activity type
// ============================================================

const ACTIVITY_ICONS: Record<ActivityType, React.ElementType> = {
  meeting_created: Users,
  meeting_completed: CheckCircle2,
  meeting_running: Play,
  agent_created: UserPlus,
  agent_edited: Pencil,
  pipeline_updated: GitBranch,
  knowledge_created: BookOpen,
  system: Settings,
}

const ACTIVITY_TYPE_KEYS: Record<ActivityType, string> = {
  meeting_created: 'activityFeed.type.meeting_created',
  meeting_completed: 'activityFeed.type.meeting_completed',
  meeting_running: 'activityFeed.type.meeting_running',
  agent_created: 'activityFeed.type.agent_created',
  agent_edited: 'activityFeed.type.agent_edited',
  pipeline_updated: 'activityFeed.type.pipeline_updated',
  knowledge_created: 'activityFeed.type.knowledge_created',
  system: 'activityFeed.type.system',
}

// ============================================================
// Helpers
// ============================================================

function generateId(): string {
  return uuidv4()
}

function formatTimestamp(iso: string, lang: Lang): string {
  const now = Date.now()
  const ts = new Date(iso).getTime()
  const diffSec = Math.floor((now - ts) / 1000)

  if (diffSec < 60) return t(lang, 'activityFeed.timestamp.justNow')
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return t(lang, 'activityFeed.timestamp.minutesAgo').replace('{count}', String(diffMin))
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr === 1) return t(lang, 'activityFeed.timestamp.hourAgo')
  if (diffHr < 24) return t(lang, 'activityFeed.timestamp.hoursAgo').replace('{count}', String(diffHr))
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay === 1) return t(lang, 'activityFeed.timestamp.yesterday')
  return t(lang, 'activityFeed.timestamp.daysAgo').replace('{count}', String(diffDay))
}

function isInTimeRange(iso: string, range: TimeRange): boolean {
  const now = Date.now()
  const ts = new Date(iso).getTime()
  const diffMs = now - ts
  const oneHour = 60 * 60 * 1000
  const oneDay = 24 * oneHour
  const sevenDays = 7 * oneDay

  switch (range) {
    case 'last-hour': return diffMs <= oneHour
    case 'today': return diffMs <= oneDay
    case 'last-7-days': return diffMs <= sevenDays
    case 'all': return true
  }
}

function createSeedActivities(agents: { id: string; title: string }[], meetings: { id: string; saveName: string; type: string; status: string }[], lang: Lang): ActivityItem[] {
  const now = new Date()
  const items: ActivityItem[] = []

  // Add seed activities from agents
  agents.slice(0, 5).forEach((agent, i) => {
    items.push({
      id: generateId(),
      type: 'agent_created',
      description: t(lang, 'activityFeed.desc.agentCreated').replace('{name}', agent.title),
      timestamp: new Date(now.getTime() - (i * 45 + 15) * 60 * 1000).toISOString(),
      read: i > 1,
      metadata: { agentId: agent.id },
    })
  })

  // Add seed activities from meetings
  meetings.slice(0, 5).forEach((meeting, i) => {
    const type = meeting.status === 'completed' ? 'meeting_completed' as ActivityType
      : meeting.status === 'running' ? 'meeting_running' as ActivityType
      : 'meeting_created' as ActivityType
    items.push({
      id: generateId(),
      type,
      description: t(lang, `activityFeed.desc.${
        type === 'meeting_completed' ? 'meetingCompleted' : type === 'meeting_running' ? 'meetingRunning' : 'meetingCreated'
      }`).replace('{name}', meeting.saveName),
      timestamp: new Date(now.getTime() - (i * 60 + 30) * 60 * 1000).toISOString(),
      read: i > 0,
      metadata: { meetingId: meeting.id },
    })
  })

  return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

// ============================================================
// Sub-components
// ============================================================

function ActivityIcon({ type }: { type: ActivityType }) {
  const Icon = ACTIVITY_ICONS[type]
  return (
    <div className={`activity-icon-${type}`}>
      <Icon className="size-4" />
    </div>
  )
}

function ActivityItemRow({
  item,
  lang,
}: {
  item: ActivityItem
  lang: Lang
}) {
  return (
    <div
      className={`activity-item activity-item-${item.type} ${item.read ? '' : 'activity-highlight'}`}
      role="listitem"
      aria-label={item.description}
    >
      <div className="flex items-start gap-3 w-full">
        <ActivityIcon type={item.type} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm leading-snug ${item.read ? 'vl-text-muted' : 'vl-text-heading font-medium'}`}>
            {item.description}
          </p>
          <span className="activity-timestamp">
            {formatTimestamp(item.timestamp, lang)}
          </span>
        </div>
        {!item.read && (
          <div className="activity-badge w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 mt-1.5" />
        )}
      </div>
    </div>
  )
}

function EmptyFeedState({ lang }: { lang: Lang }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="empty-float-enhanced mb-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center">
          <Clock className="size-8 text-slate-400" />
        </div>
      </div>
      <h3 className="text-lg font-semibold vl-text-heading mb-1">
        {t(lang, 'activityFeed.noActivities')}
      </h3>
      <p className="text-sm vl-text-muted max-w-xs text-center">
        {t(lang, 'activityFeed.noActivitiesDesc')}
      </p>
    </div>
  )
}

// ============================================================
// Main Component
// ============================================================

export function ActivityFeedPanel({
  lang = 'en',
  agents = [],
  meetings = [],
}: {
  lang?: Lang
  agents?: { id: string; title: string }[]
  meetings?: { id: string; saveName: string; type: string; status: string }[]
}) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [mounted, setMounted] = useState(false)
  const [visibleCount, setVisibleCount] = useState(VISIBLE_COUNT)
  const [typeFilter, setTypeFilter] = useState<ActivityType | 'all'>('all')
  const [timeRange, setTimeRange] = useState<TimeRange>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [hasNewItems, setHasNewItems] = useState(false)
  const prevCountRef = useRef<number>(0)
  const feedEndRef = useRef<HTMLDivElement>(null)

  // Hydration-safe localStorage load
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const data: ActivityFeedData = JSON.parse(raw)
        if (data.activities && data.activities.length > 0) {
          requestAnimationFrame(() => {
            setActivities(data.activities)
            prevCountRef.current = data.activities.length
            setMounted(true)
          })
          return
        }
      }
    } catch { /* ignore parse errors */ }

    // Seed from agents and meetings if no data
    const seed = createSeedActivities(agents, meetings, lang)
    requestAnimationFrame(() => {
      setActivities(seed)
      prevCountRef.current = seed.length
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ activities: seed, lastUpdated: new Date().toISOString() }))
      } catch { /* ignore */ }
      setMounted(true)
    })
  }, [])

  // Refresh seed data when agents/meetings load
  useEffect(() => {
    if (!mounted) return
    if (agents.length === 0 && meetings.length === 0) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const data: ActivityFeedData = JSON.parse(raw)
        if (data.activities && data.activities.length > 0) return // already seeded
      }
    } catch { /* ignore */ }
    const seed = createSeedActivities(agents, meetings, lang)
    requestAnimationFrame(() => {
      setActivities(seed)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ activities: seed, lastUpdated: new Date().toISOString() }))
      } catch { /* ignore */ }
    })
  }, [agents, meetings, mounted])

  // Persist to localStorage
  const persistActivities = useCallback((updated: ActivityItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ activities: updated, lastUpdated: new Date().toISOString() }))
    } catch { /* ignore */ }
  }, [])

  // Push new activity
  const pushActivity = useCallback((type: ActivityType, description: string) => {
    const newItem: ActivityItem = {
      id: generateId(),
      type,
      description,
      timestamp: new Date().toISOString(),
      read: false,
    }
    setActivities(prev => {
      const next = [newItem, ...prev].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      persistActivities(next)
      return next
    })
    setHasNewItems(true)
  }, [persistActivities])

  // Expose pushActivity via custom event for cross-component communication
  useEffect(() => {
    const handlePush = (e: Event) => {
      const detail = (e as CustomEvent<{ type: ActivityType; description: string }>).detail
      if (detail) pushActivity(detail.type, detail.description)
    }
    window.addEventListener('activity-feed:push', handlePush)
    return () => window.removeEventListener('activity-feed:push', handlePush)
  }, [pushActivity])

  // Detect new items (unread badge)
  useEffect(() => {
    if (activities.length > prevCountRef.current) {
      requestAnimationFrame(() => { setHasNewItems(true) })
    }
    prevCountRef.current = activities.length
  }, [activities.length])

  // Filtering
  const filteredActivities = useMemo(() => {
    let result = activities
    if (typeFilter !== 'all') {
      result = result.filter(a => a.type === typeFilter)
    }
    if (timeRange !== 'all') {
      result = result.filter(a => isInTimeRange(a.timestamp, timeRange))
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(a => a.description.toLowerCase().includes(q))
    }
    return result
  }, [activities, typeFilter, timeRange, searchQuery])

  const visibleActivities = filteredActivities.slice(0, visibleCount)
  const hasMore = filteredActivities.length > visibleCount
  const unreadCount = activities.filter(a => !a.read).length

  // Mark all as read
  const handleMarkAllRead = useCallback(() => {
    setActivities(prev => {
      const next = prev.map(a => ({ ...a, read: true }))
      persistActivities(next)
      return next
    })
    setHasNewItems(false)
  }, [persistActivities])

  // Load more
  const handleLoadMore = useCallback(() => {
    setVisibleCount(prev => prev + VISIBLE_COUNT)
  }, [])

  // Clear search on type/time filter change
  const handleTypeFilterChange = useCallback((val: string) => {
    setTypeFilter(val === 'all' ? 'all' : val as ActivityType)
    setVisibleCount(VISIBLE_COUNT)
  }, [])

  const handleTimeRangeChange = useCallback((val: string) => {
    setTimeRange(val as TimeRange)
    setVisibleCount(VISIBLE_COUNT)
  }, [])

  // Auto-refresh indicator: dismiss on scroll
  const handleScroll = useCallback(() => {
    if (hasNewItems) setHasNewItems(false)
  }, [hasNewItems])

  if (!mounted) {
    return (
      <div className="p-4 space-y-4">
        <div className="skeleton-shimmer h-8 w-48 rounded-lg" />
        <div className="skeleton-shimmer h-10 w-full rounded-lg" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton-shimmer h-16 rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--vl-border-subtle)]">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-base font-semibold vl-text-heading truncate">
            {t(lang, 'activityFeed.title')}
          </h2>
          {hasNewItems && (
            <span className="activity-badge flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 activity-pulse-dot" />
              {t(lang, 'activityFeed.newActivities')}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={handleMarkAllRead}
                >
                  <CheckCheck className="size-3.5 mr-1" />
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                    {unreadCount}
                  </Badge>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t(lang, 'activityFeed.markAllRead')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-[var(--vl-border-subtle)]">
        <div className="relative flex-1 min-w-[140px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 vl-text-muted" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t(lang, 'activityFeed.searchPlaceholder')}
            className="h-8 pl-9 text-xs"
          />
        </div>
        <Select value={typeFilter} onValueChange={handleTypeFilterChange}>
          <SelectTrigger className="h-8 w-auto min-w-[120px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t(lang, 'activityFeed.filter.allTypes')}</SelectItem>
            {(Object.keys(ACTIVITY_ICONS) as ActivityType[]).map(type => (
              <SelectItem key={type} value={type}>
                {t(lang, ACTIVITY_TYPE_KEYS[type])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={timeRange} onValueChange={handleTimeRangeChange}>
          <SelectTrigger className="h-8 w-auto min-w-[110px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t(lang, 'activityFeed.filter.allTime')}</SelectItem>
            <SelectItem value="last-hour">{t(lang, 'activityFeed.filter.lastHour')}</SelectItem>
            <SelectItem value="today">{t(lang, 'activityFeed.filter.today')}</SelectItem>
            <SelectItem value="last-7-days">{t(lang, 'activityFeed.filter.last7Days')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Activity list */}
      <ScrollArea
        className="flex-1 custom-scrollbar"
        onScrollCapture={handleScroll}
      >
        <div className="px-4 py-2 space-y-1" role="list" aria-label={t(lang, 'activityFeed.title')}>
          {visibleActivities.length === 0 ? (
            <EmptyFeedState lang={lang} />
          ) : (
            <>
              {visibleActivities.map((item) => (
                <ActivityItemRow key={item.id} item={item} lang={lang} />
              ))}
              {hasMore && (
                <div className="pt-2 pb-4 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={handleLoadMore}
                  >
                    <ChevronDown className="size-3.5 mr-1" />
                    {t(lang, 'activityFeed.loadMore')}
                    <span className="ml-1 text-[10px] vl-text-muted">
                      ({filteredActivities.length - visibleCount} remaining)
                    </span>
                  </Button>
                </div>
              )}
            </>
          )}
          <div ref={feedEndRef} />
        </div>
      </ScrollArea>
    </div>
  )
}

export default ActivityFeedPanel
