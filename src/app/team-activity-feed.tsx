'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Activity, Filter, ChevronDown, ChevronUp, Loader2,
  PlayCircle, CheckCircle2, UserPlus, MessageSquare,
  StickyNote, GitBranch, Download, Pencil, Users, Bot,
  TrendingUp, Sparkles, X, Clock, GroupBy,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { Agent, Meeting } from './shared-components'

// ============================================================
// Types
// ============================================================

export type ActivityType =
  | 'meeting_created'
  | 'meeting_completed'
  | 'agent_created'
  | 'message_sent'
  | 'note_added'
  | 'pipeline_stage_completed'
  | 'export_generated'
  | 'agent_updated'

interface ActivityItem {
  id: string
  type: ActivityType
  description: string
  timestamp: string
  actorName: string
  actorColor?: string
  actorIcon?: string
  metadata?: Record<string, string>
}

interface ActivityFeedResponse {
  activities: ActivityItem[]
  total: number
  limit: number
  offset: number
  density: number[]
}

type GroupByMode = 'none' | 'hour' | 'day' | 'agent'

// ============================================================
// Activity type config
// ============================================================

const ACTIVITY_TYPE_CONFIG: Record<ActivityType, { icon: React.ElementType; color: string; label: string }> = {
  meeting_created: { icon: PlayCircle, color: '#10b981', label: 'Meeting Created' },
  meeting_completed: { icon: CheckCircle2, color: '#06b6d4', label: 'Meeting Completed' },
  agent_created: { icon: UserPlus, color: '#8b5cf6', label: 'Agent Created' },
  agent_updated: { icon: Pencil, color: '#f97316', label: 'Agent Updated' },
  message_sent: { icon: MessageSquare, color: '#06b6d4', label: 'Message Sent' },
  note_added: { icon: StickyNote, color: '#f59e0b', label: 'Note Added' },
  pipeline_stage_completed: { icon: GitBranch, color: '#10b981', label: 'Pipeline Stage Done' },
  export_generated: { icon: Download, color: '#ec4899', label: 'Export Generated' },
}

// ============================================================
// Activity Density Sparkline
// ============================================================

function ActivityDensitySparkline({ data }: { data: number[] }) {
  const maxVal = Math.max(...data, 1)
  const w = 200
  const h = 32
  const padding = 2

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * (w - padding * 2)
    const y = h - padding - (v / maxVal) * (h - padding * 2)
    return `${x},${y}`
  }).join(' ')

  const areaPoints = `${padding},${h - padding} ${points} ${w - padding},${h - padding}`

  return (
    <svg width={w} height={h} className="opacity-70">
      <defs>
        <linearGradient id="sparklineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" className="sparkline-gradient-stop" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" className="sparkline-gradient-stop" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#sparklineGrad)" className="activity-sparkline-area" />
      <polyline points={points} fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="activity-sparkline" />
    </svg>
  )
}

// ============================================================
// Single Activity Item
// ============================================================

function ActivityItemCard({ item, index, lang }: { item: ActivityItem; index: number; lang: Lang }) {
  const config = ACTIVITY_TYPE_CONFIG[item.type] || { icon: Activity, color: '#6b7280', label: 'Activity' }
  const Icon = config.icon

  const formatTime = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime()
    if (diff < 60000) return t(lang, 'common.justNow')
    if (diff < 3600000) return `${Math.floor(diff / 60000)}${t(lang, 'common.minutesAgo')}`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}${t(lang, 'common.hoursAgo')}`
    return `${Math.floor(diff / 86400000)}${t(lang, 'common.daysAgo')}`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: Math.min(index * 0.04, 0.5), type: 'spring', stiffness: 300, damping: 25 }}
      className="activity-timeline-item"
    >
      <div className="flex items-start gap-3 py-2 px-2 rounded-lg hover:bg-[var(--vl-bg-inner)] transition-colors duration-150 group">
        <div
          className="activity-timeline-dot active"
          style={{ borderColor: config.color }}
        >
          <Icon className="size-2.5" style={{ color: config.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className="text-[9px] px-1.5 py-0 leading-tight"
              style={{ borderColor: `${config.color}40`, color: config.color, background: `${config.color}10` }}
            >
              {config.label}
            </Badge>
            <span className="text-[10px] vl-text-muted">{formatTime(item.timestamp)}</span>
          </div>
          <p className="text-xs vl-text-body mt-0.5 leading-relaxed">{item.description}</p>
          {item.actorName && (
            <div className="flex items-center gap-1.5 mt-1">
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white"
                style={{ backgroundColor: item.actorColor || '#6366f1' }}
              >
                {item.actorIcon === 'users' ? <Users className="size-2.5" /> : item.actorIcon === 'bot' ? <Bot className="size-2.5" /> : <Sparkles className="size-2.5" />}
              </div>
              <span className="text-[10px] font-medium vl-text-muted">{item.actorName}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================
// Empty State
// ============================================================

function ActivityEmptyState({ lang }: { lang: Lang }) {
  return (
    <div className="activity-empty-state">
      <Activity className="size-10 vl-text-muted mb-3" />
      <p className="text-sm vl-text-body font-medium">No activity yet</p>
      <p className="text-xs vl-text-muted mt-1">Create agents and meetings to see activity here</p>
    </div>
  )
}

// ============================================================
// Main Component: TeamActivityFeed
// ============================================================

export function TeamActivityFeed({ lang, agents }: { lang: Lang; agents: Agent[] }) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [density, setDensity] = useState<number[]>([])
  const [offset, setOffset] = useState(0)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [groupBy, setGroupBy] = useState<GroupByMode>('none')
  const [selectedTypes, setSelectedTypes] = useState<Set<ActivityType>>(new Set())
  const [selectedAgent, setSelectedAgent] = useState<string>('all')
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null)

  const PAGE_SIZE = 20

  const fetchActivities = useCallback(async (newOffset = 0, append = false) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('limit', String(PAGE_SIZE))
      params.set('offset', String(newOffset))
      if (selectedTypes.size > 0) {
        params.set('type', Array.from(selectedTypes).join(','))
      }
      if (selectedAgent !== 'all') {
        params.set('agent', selectedAgent)
      }

      const res = await fetch(`/api/activity?${params.toString()}`)
      if (res.ok) {
        const data: ActivityFeedResponse = await res.json()
        if (append) {
          setActivities(prev => [...prev, ...data.activities])
        } else {
          setActivities(data.activities)
        }
        setTotal(data.total)
        setDensity(data.density)
        setOffset(newOffset)
      }
    } catch {
      // Non-critical
    } finally {
      setLoading(false)
    }
  }, [selectedTypes, selectedAgent])

  // Initial load
  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  // Auto-refresh simulation every 30s
  useEffect(() => {
    autoRefreshRef.current = setInterval(() => {
      fetchActivities(0, false)
    }, 30000)
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current)
    }
  }, [fetchActivities])

  const handleLoadMore = useCallback(() => {
    fetchActivities(offset + PAGE_SIZE, true)
  }, [fetchActivities, offset])

  const toggleTypeFilter = useCallback((type: ActivityType) => {
    setSelectedTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }, [])

  // Group activities
  const groupedActivities = useMemo(() => {
    if (groupBy === 'none') return { 'All Activity': activities }

    const groups: Record<string, ActivityItem[]> = {}
    activities.forEach(item => {
      let key = ''
      const date = new Date(item.timestamp)
      if (groupBy === 'hour') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`
      } else if (groupBy === 'day') {
        key = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      } else if (groupBy === 'agent') {
        key = item.actorName || 'Unknown'
      }
      if (!key) key = 'Other'
      if (!groups[key]) groups[key] = []
      groups[key].push(item)
    })
    return groups
  }, [activities, groupBy])

  const uniqueAgents = useMemo(() => {
    const agentNames = new Set(activities.map(a => a.actorName).filter(Boolean))
    return Array.from(agentNames)
  }, [activities])

  const hasMore = offset + PAGE_SIZE < total
  const isEmpty = !loading && activities.length === 0

  return (
    <Card className="vl-card backdrop-blur-sm overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <Activity className="size-4 text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold" style={{ color: 'var(--vl-text-white)' }}>
                Team Activity Feed
              </CardTitle>
              <p className="text-[10px] vl-text-muted">
                {total} events {selectedTypes.size > 0 && `· ${selectedTypes.size} filtered`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Sparkline */}
            {density.some(d => d > 0) && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="opacity-70 hover:opacity-100 transition-opacity">
                      <ActivityDensitySparkline data={density} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="vl-inner">
                    Activity density over last 24h
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {/* Group by select */}
            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupByMode)}>
              <SelectTrigger className="h-7 w-[100px] text-[10px] border-[var(--vl-border)] bg-[var(--vl-bg-inner)]">
                <GroupBy className="size-3 mr-1 vl-text-muted" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="hour">Hour</SelectItem>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="agent">Agent</SelectItem>
              </SelectContent>
            </Select>
            {/* Filters toggle */}
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[10px] border-[var(--vl-border)] bg-[var(--vl-bg-inner)] hover:bg-[var(--vl-bg-card-hover)]"
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              <Filter className="size-3 mr-1" />
              Filters
              {selectedTypes.size > 0 && (
                <Badge className="ml-1 h-3.5 px-1 text-[8px] bg-emerald-500/20 text-emerald-400 border-0 rounded-full">
                  {selectedTypes.size}
                </Badge>
              )}
              {filtersOpen ? <ChevronUp className="size-3 ml-1" /> : <ChevronDown className="size-3 ml-1" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Filters Panel */}
      <AnimatePresence>
        {filtersOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-3 border-b border-[var(--vl-border-subtle)]">
              {/* Type filters */}
              <div className="mb-2">
                <p className="text-[10px] font-semibold vl-text-muted mb-1.5 uppercase tracking-wider">Activity Type</p>
                <div className="activity-filters-scroll grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {(Object.keys(ACTIVITY_TYPE_CONFIG) as ActivityType[]).map(type => {
                    const cfg = ACTIVITY_TYPE_CONFIG[type]
                    const isSelected = selectedTypes.has(type)
                    return (
                      <label
                        key={type}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-md cursor-pointer transition-colors text-[10px] hover:bg-[var(--vl-bg-inner)]"
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleTypeFilter(type)}
                          className="size-3"
                        />
                        <cfg.icon className="size-3" style={{ color: isSelected ? cfg.color : 'var(--vl-text-muted)' }} />
                        <span className={isSelected ? 'vl-text-body' : 'vl-text-muted'}>{cfg.label}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
              {/* Agent filter */}
              {uniqueAgents.length > 1 && (
                <div>
                  <p className="text-[10px] font-semibold vl-text-muted mb-1.5 uppercase tracking-wider">Participant</p>
                  <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                    <SelectTrigger className="h-7 w-full text-[10px] border-[var(--vl-border)] bg-[var(--vl-bg-inner)]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Participants</SelectItem>
                      {uniqueAgents.map(name => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {/* Clear filters */}
              {(selectedTypes.size > 0 || selectedAgent !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-6 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  onClick={() => { setSelectedTypes(new Set()); setSelectedAgent('all') }}
                >
                  <X className="size-3 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CardContent className="p-4 pt-3">
        {/* Loading skeleton */}
        {loading && activities.length === 0 && (
          <div className="space-y-3 py-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[var(--vl-bg-inner)] border border-[var(--vl-border)] animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-32 rounded bg-[var(--vl-bg-inner)] animate-pulse" />
                  <div className="h-2.5 w-48 rounded bg-[var(--vl-bg-inner)] animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {isEmpty && <ActivityEmptyState lang={lang} />}

        {/* Activity timeline */}
        {!isEmpty && (
          <div className="activity-scroll-area max-h-[24rem]">
            <div className="activity-timeline">
              {Object.entries(groupedActivities).map(([groupKey, items]) => (
                <React.Fragment key={groupKey}>
                  {groupBy !== 'none' && (
                    <div className="activity-group-header mb-2 mt-3 first:mt-0">{groupKey}</div>
                  )}
                  {items.map((item, idx) => (
                    <ActivityItemCard
                      key={item.id}
                      item={item}
                      index={idx}
                      lang={lang}
                    />
                  ))}
                </React.Fragment>
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center mt-4 pt-3 border-t border-[var(--vl-border-subtle)]">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-[var(--vl-border)] bg-[var(--vl-bg-inner)] hover:bg-[var(--vl-bg-card-hover)]"
                  onClick={handleLoadMore}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="size-3 mr-1 animate-spin" />
                  ) : (
                    <TrendingUp className="size-3 mr-1" />
                  )}
                  Load More ({total - offset - PAGE_SIZE} remaining)
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
