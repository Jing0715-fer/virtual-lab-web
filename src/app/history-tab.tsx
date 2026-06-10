'use client'

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, Filter, XCircle, GitCompareArrows, CheckSquare, Play, Pause,
  ChevronDown, ChevronUp, Trash2 as Trash2Icon,
  RotateCcw, Trash2, MessageSquare, Copy, Download, Bot as BotIcon, Users,
  Maximize2, Minimize2, ArrowDownUp, BarChart3, GitCommit, ListChecks,
  FileJson, FileSpreadsheet, Loader2, Repeat, Square, Calendar, Hash, Activity,
  Bookmark, Highlighter, FastForward, Table2, FileDown, Presentation,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { t } from '@/lib/i18n'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { Agent, Meeting } from './shared-components'
import { MeetingTimelineView } from './timeline-view'
import type { Lang } from '@/lib/i18n'
import {
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import {
  LazyMeetingComparisonDashboard,
  LazyMeetingComparisonView,
  LazyMeetingInsightsPanel,
  LazyMeetingAnnotationSystem,
  LazyMeetingBookmarks,
  LazyMeetingComments,
  LazyMeetingHighlighter,
} from './lazy-components'
import { EnhancedExportButton } from './enhanced-export-panel'
import { AdvancedDataTable, type DataTableColumn } from './advanced-data-table'
import { MeetingWordCloud } from './meeting-word-cloud'
import { MeetingComparisonView } from './meeting-comparison'
import { EnhancedMeetingReplay } from './meeting-replay-enhanced'
import {
  MeetingCard, DiscussionViewer, EmptyState, HistorySkeletonRows,
  exportDiscussionAsMarkdown, exportDiscussionAsJSON, exportDiscussionAsCSV,
  triggerExport, statusColor, MeetingTimer, timeAgo, getTimeAgo,
  PulsingDot, renderAgentIcon,
} from './shared-components'

// ============================================================
// Advanced Filter Types & Helpers
// ============================================================

interface FilterCondition {
  id: string
  field: string
  operator: string
  value: string
  value2?: string // for 'between'
}

const FILTER_FIELDS = [
  { value: 'status', label: 'Status' },
  { value: 'type', label: 'Type' },
  { value: 'date', label: 'Date' },
  { value: 'participant', label: 'Participant' },
  { value: 'messageCount', label: 'Message Count' },
]

const OPERATORS_BY_FIELD: Record<string, { value: string; label: string }[]> = {
  status: [
    { value: 'is', label: 'is' },
    { value: 'isNot', label: 'is not' },
  ],
  type: [
    { value: 'is', label: 'is' },
    { value: 'isNot', label: 'is not' },
  ],
  date: [
    { value: 'is', label: 'is' },
    { value: 'isAfter', label: 'is after' },
    { value: 'isBefore', label: 'is before' },
    { value: 'between', label: 'between' },
  ],
  participant: [
    { value: 'contains', label: 'contains' },
    { value: 'is', label: 'is' },
  ],
  messageCount: [
    { value: 'greaterThan', label: 'greater than' },
    { value: 'lessThan', label: 'less than' },
    { value: 'between', label: 'between' },
    { value: 'is', label: 'is' },
  ],
}

const STATUS_VALUES = ['draft', 'running', 'completed']
const TYPE_VALUES = ['team', 'individual']
const DATE_VALUES = [
  { value: 'today', label: 'Today' },
  { value: '7days', label: 'Last 7 days' },
  { value: '30days', label: 'Last 30 days' },
  { value: '90days', label: 'Last 90 days' },
]

function meetsCondition(meeting: Meeting, condition: FilterCondition, participants: string[]): boolean {
  const { field, operator, value, value2 } = condition
  switch (field) {
    case 'status': {
      const sv = value as Meeting['status']
      if (operator === 'is') return meeting.status === sv
      if (operator === 'isNot') return meeting.status !== sv
      break
    }
    case 'type': {
      const tv = value as Meeting['type']
      if (operator === 'is') return meeting.type === tv
      if (operator === 'isNot') return meeting.type !== tv
      break
    }
    case 'date': {
      const now = Date.now()
 const DAY = 86400000
      const created = new Date(meeting.createdAt).getTime()
      if (operator === 'is' || operator === 'isAfter') {
        const days = value === 'today' ? 0 : value === '7days' ? 7 : value === '30days' ? 30 : 90
        const cutoff = now - days * DAY
        return operator === 'is'
          ? created >= cutoff && created < cutoff + DAY
          : created >= cutoff
      }
      if (operator === 'isBefore') {
        const days = value === 'today' ? 0 : value === '7days' ? 7 : value === '30days' ? 30 : 90
        return created < now - days * DAY
      }
      if (operator === 'between' && value2) {
        const d1 = value === 'today' ? 0 : value === '7days' ? 7 : value === '30days' ? 30 : 90
        const d2 = value2 === 'today' ? 0 : value2 === '7days' ? 7 : value2 === '30days' ? 30 : 90
        const maxDays = Math.max(d1, d2)
        const minDays = Math.min(d1, d2)
        return created >= now - maxDays * DAY && created <= now - minDays * DAY
      }
      break
    }
    case 'participant': {
      const names = [...new Set((meeting.messages || []).map(m => m.agentName).filter(n => n !== 'User'))]
      if (operator === 'contains') return names.some(n => n.toLowerCase().includes(value.toLowerCase()))
      if (operator === 'is') return names.includes(value)
      break
    }
    case 'messageCount': {
      const count = meeting.messages?.length || 0
      const num = parseInt(value, 10) || 0
      if (operator === 'greaterThan') return count > num
      if (operator === 'lessThan') return count < num
      if (operator === 'is') return count === num
      if (operator === 'between' && value2) {
        const num2 = parseInt(value2, 10) || 0
        return count >= Math.min(num, num2) && count <= Math.max(num, num2)
      }
      break
    }
  }
  return true
}

export function applyAdvancedFilters(
  meetings: Meeting[],
  conditions: FilterCondition[],
  logic: 'AND' | 'OR',
  participants: string[]
): Meeting[] {
  if (conditions.length === 0) return meetings
  if (logic === 'AND') {
    return meetings.filter(m => conditions.every(c => meetsCondition(m, c, participants)))
  } else {
    return meetings.filter(m => conditions.some(c => meetsCondition(m, c, participants)))
  }
}

interface HistoryTabProps {
  meetings: Meeting[]
  agents: Agent[]
  selectedMeeting: Meeting | null
  runningMeetingId: string | null
  filteredMeetings: Meeting[]
  hasActiveFilters: boolean
  allParticipantNames: string[]
  sessionIds: Map<string, number>
  // History filters
  historyTypeFilter: string
  historyStatusFilter: string
  historySortBy: string
  historySearch: string
  historyDateRange: string
  historyParticipantFilter: string
  historyViewMode: string
  // Data table toggle
  // State
  expandedHistoryId: string | null
  loading: boolean
  // Compare mode
  compareMode: boolean
  compareSelection: string[]
  // Setters
  setActiveTab: (tab: any) => void
  setHistoryTypeFilter: (v: any) => void
  setHistoryStatusFilter: (v: any) => void
  setHistorySortBy: (v: any) => void
  setHistorySearch: (v: string) => void
  setHistoryDateRange: (v: any) => void
  setHistoryParticipantFilter: (v: string) => void
  setHistoryViewMode: (v: any) => void
  setCompareMode: (v: boolean) => void
  setCompareSelection: (v: string[] | ((prev: string[]) => string[])) => void
  setComparisonDialogOpen: (v: boolean) => void
  setSelectedMeeting: (m: Meeting | null) => void
  setExpandedHistoryId: (v: string | null) => void
  // Handlers
  handleDeleteMeeting: (m: Meeting) => void
  handleSelectMeeting: (m: Meeting) => void
  handleRefreshMeeting: () => void
  handleRunMeeting: (m: Meeting) => void
  onRerunMeeting?: (m: Meeting) => void
  onReplayMeeting?: (m: Meeting) => void
  // i18n
  lang: Lang
}

export function HistoryTab(props: HistoryTabProps) {
  const {
    meetings, agents, selectedMeeting, runningMeetingId, filteredMeetings,
    hasActiveFilters, allParticipantNames, sessionIds,
    historyTypeFilter, historyStatusFilter, historySortBy, historySearch,
    historyDateRange, historyParticipantFilter, historyViewMode,
    compareMode, compareSelection,
    expandedHistoryId, loading,
    setActiveTab, setHistoryTypeFilter, setHistoryStatusFilter, setHistorySortBy,
    setHistorySearch, setHistoryDateRange, setHistoryParticipantFilter,
    setHistoryViewMode, setCompareMode, setCompareSelection, setComparisonDialogOpen,
    setSelectedMeeting, setExpandedHistoryId,
    handleDeleteMeeting, handleSelectMeeting, handleRefreshMeeting, handleRunMeeting,
    onRerunMeeting, onReplayMeeting, lang,
  } = props

  // Advanced filter state
  const [advancedConditions, setAdvancedConditions] = useState<FilterCondition[]>([])
  const [advancedLogic, setAdvancedLogic] = useState<'AND' | 'OR'>('AND')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const addAdvancedCondition = useCallback(() => {
    setAdvancedConditions(prev => [
      ...prev,
      { id: `fc-${Date.now()}`, field: 'status', operator: 'is', value: '' },
    ])
  }, [])

  const removeAdvancedCondition = useCallback((id: string) => {
    setAdvancedConditions(prev => prev.filter(c => c.id !== id))
  }, [])

  const updateAdvancedCondition = useCallback((id: string, updates: Partial<FilterCondition>) => {
    setAdvancedConditions(prev =>
      prev.map(c => (c.id === id ? { ...c, ...updates } : c))
    )
  }, [])

  const clearAdvancedConditions = useCallback(() => {
    setAdvancedConditions([])
  }, [])

  // Apply advanced filters to meetings passed in
  const advancedFilteredMeetings = advancedConditions.length > 0
    ? applyAdvancedFilters(filteredMeetings, advancedConditions, advancedLogic, allParticipantNames)
    : filteredMeetings

  const activeAdvancedCount = advancedConditions.filter(c => c.value).length

  // ============================================================
  // Enhanced Replay dialog state
  // ============================================================
  const [enhancedReplayMeeting, setEnhancedReplayMeeting] = useState<Meeting | null>(null)

  // Word cloud filter state
  const [wordCloudFilter, setWordCloudFilter] = useState<string | null>(null)

  // ============================================================
  // Replay state
  // ============================================================
  const [replayMeeting, setReplayMeeting] = useState<Meeting | null>(null)
  const [replayRound, setReplayRound] = useState(0)
  const [replayPlaying, setReplayPlaying] = useState(false)
  const [replayShowAll, setReplayShowAll] = useState(false)
  const [typingTexts, setTypingTexts] = useState<Record<string, string>>({})
  const replayTimerRef = useRef<NodeJS.Timeout | null>(null)

  const replayMessages = useMemo(() => {
    if (!replayMeeting) return { messages: [], totalRounds: 0, uniqueRounds: [] as number[] }
    const msgs = replayMeeting.messages || []
    const uniqueRounds = [...new Set(msgs.map(m => m.roundIndex))].sort((a, b) => a - b)
    return { messages: msgs, totalRounds: uniqueRounds.length, uniqueRounds }
  }, [replayMeeting])

  useEffect(() => {
    if (replayPlaying && replayMeeting && !replayShowAll) {
      replayTimerRef.current = setInterval(() => {
        setReplayRound(prev => {
          const next = prev + 1
          if (next >= replayMessages.totalRounds) {
            setReplayPlaying(false)
            return prev
          }
          return next
        })
      }, 3000)
    }
    return () => {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current)
    }
  }, [replayPlaying, replayMeeting, replayShowAll, replayMessages.totalRounds])

  // Typing effect for replay
  useEffect(() => {
    if (!replayMeeting || replayShowAll) return
    const msgs = replayMeeting.messages || []
    const currentRoundIdx = replayMessages.uniqueRounds[replayRound]
    const currentRoundMsgs = currentRoundIdx !== undefined
      ? msgs.filter(m => m.roundIndex === currentRoundIdx)
      : []
    if (currentRoundMsgs.length === 0) {
      // No messages - clear typing state via microtask
      queueMicrotask(() => setTypingTexts({}))
      return
    }
    // Initialize typing texts for current round messages
    const initializedTexts: Record<string, string> = {}
    currentRoundMsgs.forEach(msg => {
      initializedTexts[msg.id] = ''
    })
    // Use microtask to avoid calling setState synchronously in effect body
    queueMicrotask(() => setTypingTexts(initializedTexts))
    const interval = setInterval(() => {
      setTypingTexts(prev => {
        const updated = { ...prev }
        let allDone = true
        currentRoundMsgs.forEach(msg => {
          const current = prev[msg.id] || ''
          if (current.length < msg.message.length) {
            const charsToAdd = Math.max(1, Math.ceil(msg.message.length / 90))
            updated[msg.id] = msg.message.slice(0, current.length + charsToAdd)
            allDone = false
          } else {
            updated[msg.id] = msg.message
          }
        })
        if (allDone) clearInterval(interval)
        return updated
      })
    }, 16)
    return () => clearInterval(interval)
  }, [replayRound, replayMeeting, replayShowAll, replayMessages.uniqueRounds])

  const openReplay = useCallback((meeting: Meeting) => {
    setReplayMeeting(meeting)
    setReplayRound(0)
    setReplayPlaying(false)
    setReplayShowAll(false)
    setTypingTexts({})
  }, [])

  // ============================================================
  // Statistics panel state
  // ============================================================
  const [statsOpen, setStatsOpen] = useState(false)
  const [insightsOpen, setInsightsOpen] = useState(false)

  // ============================================================
  // Annotation panel state
  // ============================================================
  const [annotationsOpen, setAnnotationsOpen] = useState(false)
  const [bookmarksOpen, setBookmarksOpen] = useState(false)
  const [commentsOpenMap, setCommentsOpenMap] = useState<Record<number, boolean>>({})
  const [highlighterOpen, setHighlighterOpen] = useState(false)

  // ============================================================
  // Full Comparison View state
  // ============================================================
  const [fullComparisonOpen, setFullComparisonOpen] = useState(false)

  // ============================================================
  // Comparison Dashboard state
  // ============================================================
  const [dashboardOpen, setDashboardOpen] = useState(false)
  const [dashboardMeetingA, setDashboardMeetingA] = useState<Meeting | null>(null)
  const [dashboardMeetingB, setDashboardMeetingB] = useState<Meeting | null>(null)

  const handleDashboardSelectMeetings = useCallback((mA: Meeting | null, mB: Meeting | null) => {
    setDashboardMeetingA(mA)
    setDashboardMeetingB(mB)
  }, [])

  const meetingStats = useMemo(() => {
    if (meetings.length === 0) return null
    const totalMessages = meetings.reduce((sum, m) => sum + (m.messages?.length || 0), 0)
    const avgMessages = totalMessages / meetings.length
    const agentMsgCounts: Record<string, number> = {}
    meetings.forEach(m => {
      (m.messages || []).forEach(msg => {
        if (msg.agentName !== 'User') {
          agentMsgCounts[msg.agentName] = (agentMsgCounts[msg.agentName] || 0) + 1
        }
      })
    })
    const mostActiveAgent = Object.entries(agentMsgCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
    const teamCount = meetings.filter(m => m.type === 'team').length
    const individualCount = meetings.filter(m => m.type === 'individual').length
    const dates = meetings.map(m => new Date(m.createdAt).getTime()).sort((a, b) => a - b)
    const earliestDate = new Date(dates[0])
    const latestDate = new Date(dates[dates.length - 1])
    return {
      totalMeetings: meetings.length,
      totalMessages,
      avgMessages: avgMessages.toFixed(1),
      mostActiveAgent,
      agentMsgCounts,
      teamCount,
      individualCount,
      earliestDate,
      latestDate,
    }
  }, [meetings])

  // Render value input based on field
  const renderValueInput = (condition: FilterCondition) => {
    switch (condition.field) {
      case 'status':
        return (
          <Select
            value={condition.value}
            onValueChange={(v) => updateAdvancedCondition(condition.id, { value: v })}
          >
            <SelectTrigger className="vl-input h-7 text-xs flex-1">
              <SelectValue placeholder="Status..." />
            </SelectTrigger>
            <SelectContent className="vl-dialog">
              {STATUS_VALUES.map(sv => (
                <SelectItem key={sv} value={sv} className="text-xs vl-text-heading">{sv}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      case 'type':
        return (
          <Select
            value={condition.value}
            onValueChange={(v) => updateAdvancedCondition(condition.id, { value: v })}
          >
            <SelectTrigger className="vl-input h-7 text-xs flex-1">
              <SelectValue placeholder="Type..." />
            </SelectTrigger>
            <SelectContent className="vl-dialog">
              {TYPE_VALUES.map(tv => (
                <SelectItem key={tv} value={tv} className="text-xs vl-text-heading">{tv}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      case 'date':
        return (
          <div className="flex items-center gap-1">
            <Select
              value={condition.value}
              onValueChange={(v) => updateAdvancedCondition(condition.id, { value: v })}
            >
              <SelectTrigger className="vl-input h-7 text-xs flex-1">
                <SelectValue placeholder="Date..." />
              </SelectTrigger>
              <SelectContent className="vl-dialog">
                {DATE_VALUES.map(dv => (
                  <SelectItem key={dv.value} value={dv.value} className="text-xs vl-text-heading">{dv.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {condition.operator === 'between' && (
              <>
                <span className="text-[10px] vl-text-muted">and</span>
                <Select
                  value={condition.value2 || 'today'}
                  onValueChange={(v) => updateAdvancedCondition(condition.id, { value2: v })}
                >
                  <SelectTrigger className="vl-input h-7 text-xs flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="vl-dialog">
                    {DATE_VALUES.map(dv => (
                      <SelectItem key={dv.value} value={dv.value} className="text-xs vl-text-heading">{dv.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
        )
      case 'participant':
        return (
          <Select
            value={condition.value}
            onValueChange={(v) => updateAdvancedCondition(condition.id, { value: v })}
          >
            <SelectTrigger className="vl-input h-7 text-xs flex-1">
              <SelectValue placeholder="Participant..." />
            </SelectTrigger>
            <SelectContent className="vl-dialog">
              {allParticipantNames.map(name => (
                <SelectItem key={name} value={name} className="text-xs vl-text-heading">{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      case 'messageCount':
        return (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={condition.value}
              onChange={(e) => updateAdvancedCondition(condition.id, { value: e.target.value })}
              placeholder="Count"
              className="vl-input h-7 text-xs w-16"
              min={0}
            />
            {condition.operator === 'between' && (
              <>
                <span className="text-[10px] vl-text-muted">and</span>
                <Input
                  type="number"
                  value={condition.value2 || ''}
                  onChange={(e) => updateAdvancedCondition(condition.id, { value2: e.target.value })}
                  placeholder="Count"
                  className="vl-input h-7 text-xs w-16"
                  min={0}
                />
              </>
            )}
          </div>
        )
      default:
        return null
    }
  }

  // Replace filteredMeetings in the JSX with advancedFilteredMeetings
  // Use advancedFilteredMeetings for the list rendering
  const displayedMeetings = advancedConditions.length > 0 ? advancedFilteredMeetings : filteredMeetings

  return (
          <>
            <AnimatePresence mode="wait">
              <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold vl-text-heading flex items-center gap-2 vl-text-balance">
                      Meeting History
                      {hasActiveFilters && (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                          <Filter className="size-2.5 mr-0.5" /> Filtered
                        </Badge>
                      )}
                    </h2>
                    <p className="text-sm vl-text-muted">
                      Showing {displayedMeetings.length} of {meetings.length} meetings
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap items-center">
                    {/* Compare Mode Toggle */}
                    <Button
                      variant={compareMode ? 'default' : 'outline'}
                      size="sm"
                      className={`text-xs gap-1.5 ${compareMode ? 'bg-emerald-600 text-white' : 'border-[var(--vl-border)] vl-text-body hover:bg-[var(--vl-bg-inner)] hover:text-white'}`}
                      onClick={() => { setCompareMode(!compareMode); setCompareSelection([]) }}
                      aria-label="Toggle compare mode"
                    >
                      <GitCompareArrows className="size-3.5" /> Compare
                    </Button>
                    {/* Side-by-Side Full Comparison View Button */}
                    <Button
                      variant={fullComparisonOpen ? 'default' : 'outline'}
                      size="sm"
                      className={`text-xs gap-1.5 ${fullComparisonOpen ? 'bg-emerald-600 text-white' : 'border-[var(--vl-border)] vl-text-body hover:bg-[var(--vl-bg-inner)] hover:text-white'}`}
                      onClick={() => setFullComparisonOpen(!fullComparisonOpen)}
                      aria-label="Toggle side-by-side comparison view"
                    >
                      <BarChart3 className="size-3.5" /> Side-by-Side
                    </Button>
                    {/* Compare Meetings Dashboard Button */}
                    <Button
                      variant={dashboardOpen ? 'default' : 'outline'}
                      size="sm"
                      className={`text-xs gap-1.5 ${dashboardOpen ? 'bg-violet-600 text-white' : 'border-[var(--vl-border)] vl-text-body hover:bg-[var(--vl-bg-inner)] hover:text-white'}`}
                      onClick={() => setDashboardOpen(!dashboardOpen)}
                      aria-label="Toggle comparison dashboard"
                    >
                      <BarChart3 className="size-3.5" /> {t(lang, 'comparison.dashboard')}
                    </Button>
                    {/* Compare Now Button */}
                    {compareMode && compareSelection.length === 2 && (
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                        onClick={() => setComparisonDialogOpen(true)}
                      >
                        <CheckSquare className="size-3.5" /> Compare Now
                      </Button>
                    )}
                    {compareMode && compareSelection.length > 0 && compareSelection.length < 2 && (
                      <span className="vl-caption">{compareSelection.length}/2 selected</span>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="border-[var(--vl-border)] vl-text-body hover:bg-[var(--vl-bg-inner)] hover:text-white text-xs gap-1.5">
                          <Download className="size-3.5" /> Export
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="vl-dialog" align="end">
                        <DropdownMenuLabel className="vl-text-muted text-xs">Export Data</DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-[var(--vl-border)]" />
                        <DropdownMenuItem className="vl-text-body focus:bg-[var(--vl-bg-card-hover)] focus:text-[var(--vl-text-white)] cursor-pointer text-xs" onClick={() => triggerExport('meetings', 'json')}>
                          <FileJson className="size-3.5 mr-2 text-cyan-400" /> All Meetings (JSON)
                        </DropdownMenuItem>
                        <DropdownMenuItem className="vl-text-body focus:bg-[var(--vl-bg-card-hover)] focus:text-[var(--vl-text-white)] cursor-pointer text-xs" onClick={() => triggerExport('meetings', 'csv')}>
                          <FileSpreadsheet className="size-3.5 mr-2 text-amber-400" /> All Meetings (CSV)
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-[var(--vl-border)]" />
                        <DropdownMenuItem className="vl-text-body focus:bg-[var(--vl-bg-card-hover)] focus:text-[var(--vl-text-white)] cursor-pointer text-xs" onClick={async () => {
                          try {
                            const res = await fetch('/api/export/docx', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ type: 'analytics', options: { includeMessages: true, includeSummary: true, includeAnalytics: true } }),
                            })
                            if (!res.ok) throw new Error('Export failed')
                            const blob = await res.blob()
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = 'analytics_report.docx'
                            a.click()
                            URL.revokeObjectURL(url)
                            toast.success('Analytics DOCX exported')
                          } catch { toast.error('Failed to export DOCX') }
                        }}>
                          <FileDown className="size-3.5 mr-2 text-blue-400" /> Analytics Report (DOCX)
                        </DropdownMenuItem>
                        <DropdownMenuItem className="vl-text-body focus:bg-[var(--vl-bg-card-hover)] focus:text-[var(--vl-text-white)] cursor-pointer text-xs" onClick={async () => {
                          try {
                            const res = await fetch('/api/export/pptx', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ type: 'analytics', options: { includeMessages: true, includeSummary: true, includeAnalytics: true } }),
                            })
                            if (!res.ok) throw new Error('Export failed')
                            const blob = await res.blob()
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = 'analytics_report.pptx'
                            a.click()
                            URL.revokeObjectURL(url)
                            toast.success('Analytics PPTX exported')
                          } catch { toast.error('Failed to export PPTX') }
                        }}>
                          <Presentation className="size-3.5 mr-2 text-orange-400" /> Analytics Slides (PPTX)
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-[var(--vl-border)]" />
                        <DropdownMenuItem className="vl-text-body focus:bg-[var(--vl-bg-card-hover)] focus:text-[var(--vl-text-white)] cursor-pointer text-xs" onClick={() => triggerExport('agents', 'json')}>
                          <FileJson className="size-3.5 mr-2 text-cyan-400" /> All Agents (JSON)
                        </DropdownMenuItem>
                        <DropdownMenuItem className="vl-text-body focus:bg-[var(--vl-bg-card-hover)] focus:text-[var(--vl-text-white)] cursor-pointer text-xs" onClick={() => triggerExport('analytics', 'json')}>
                          <BarChart3 className="size-3.5 mr-2 text-violet-400" /> Analytics (JSON)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <div className="flex gap-1 border border-[var(--vl-border-subtle)] rounded-lg p-0.5">
                      <Button
                        variant={historyViewMode === 'list' ? 'default' : 'ghost'}
                        size="sm"
                        className={`h-7 px-2 text-xs ${historyViewMode === 'list' ? 'bg-emerald-600 text-white' : 'vl-text-muted hover:text-white'}`}
                        onClick={() => setHistoryViewMode('list')}
                      >
                        <ListChecks className="size-3 mr-1" /> {t(lang, 'dataTable.cardsView')}
                      </Button>
                      <Button
                        variant={historyViewMode === 'timeline' ? 'default' : 'ghost'}
                        size="sm"
                        className={`h-7 px-2 text-xs ${historyViewMode === 'timeline' ? 'bg-emerald-600 text-white' : 'vl-text-muted hover:text-white'}`}
                        onClick={() => setHistoryViewMode('timeline')}
                      >
                        <GitCommit className="size-3 mr-1" /> Timeline
                      </Button>
                      <Button
                        variant={historyViewMode === 'table' ? 'default' : 'ghost'}
                        size="sm"
                        className={`h-7 px-2 text-xs ${historyViewMode === 'table' ? 'bg-emerald-600 text-white' : 'vl-text-muted hover:text-white'}`}
                        onClick={() => setHistoryViewMode('table')}
                      >
                        <Table2 className="size-3 mr-1" /> Table
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Advanced Filters Collapsible */}
                {!dashboardOpen && (                <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
                  <div className="flex items-center gap-2">
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={`h-8 text-xs gap-1.5 ${showAdvancedFilters ? 'border-emerald-500/50 text-emerald-400' : 'border-[var(--vl-border)] vl-text-muted hover:text-white hover:bg-[var(--vl-bg-inner)]'}`}
                      >
                        <ChevronDown className={`size-3 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
                        <Filter className="size-3" />
                        {t(lang, 'filters.advanced')}
                        {activeAdvancedCount > 0 && (
                          <Badge variant="secondary" className="text-[9px] px-1 ml-1 bg-emerald-500/20 text-emerald-400">
                            {activeAdvancedCount}
                          </Badge>
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    {activeAdvancedCount > 0 && (
                      <span className="text-[10px] text-emerald-400">
                        {t(lang, 'filters.activeFilters').replace('{count}', String(activeAdvancedCount))}
                      </span>
                    )}
                  </div>
                  <CollapsibleContent>
                    <div className="vl-inner rounded-lg border border-[var(--vl-border-subtle)] p-3 mt-2 space-y-2">
                      {/* Logic Toggle */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] vl-text-muted">{t(lang, 'filters.logic')}:</span>
                        <div className="flex items-center gap-1 border border-[var(--vl-border-subtle)] rounded-md p-0.5">
                          <button
                            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${advancedLogic === 'AND' ? 'bg-emerald-500/20 text-emerald-400' : 'vl-text-muted hover:text-white'}`}
                            onClick={() => setAdvancedLogic('AND')}
                          >
                            {t(lang, 'filters.and')}
                          </button>
                          <button
                            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${advancedLogic === 'OR' ? 'bg-emerald-500/20 text-emerald-400' : 'vl-text-muted hover:text-white'}`}
                            onClick={() => setAdvancedLogic('OR')}
                          >
                            {t(lang, 'filters.or')}
                          </button>
                        </div>
                      </div>

                      {/* Filter Conditions */}
                      {advancedConditions.map((condition, idx) => (
                        <div key={condition.id} className="flex items-center gap-1.5">
                          {/* Field Select */}
                          <Select
                            value={condition.field}
                            onValueChange={(v) => updateAdvancedCondition(condition.id, { field: v, operator: OPERATORS_BY_FIELD[v]?.[0]?.value || 'is', value: '' })}
                          >
                            <SelectTrigger className="vl-input h-7 text-xs w-[100px]">
                              <SelectValue placeholder={t(lang, 'filters.field')} />
                            </SelectTrigger>
                            <SelectContent className="vl-dialog">
                              {FILTER_FIELDS.map(f => (
                                <SelectItem key={f.value} value={f.value} className="text-xs vl-text-heading">{f.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Operator Select */}
                          <Select
                            value={condition.operator}
                            onValueChange={(v) => updateAdvancedCondition(condition.id, { operator: v })}
                          >
                            <SelectTrigger className="vl-input h-7 text-xs w-[100px]">
                              <SelectValue placeholder={t(lang, 'filters.operator')} />
                            </SelectTrigger>
                            <SelectContent className="vl-dialog">
                              {(OPERATORS_BY_FIELD[condition.field] || []).map(op => (
                                <SelectItem key={op.value} value={op.value} className="text-xs vl-text-heading">{op.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Value Input */}
                          <div className="flex-1 min-w-0 flex items-center gap-1">
                            {renderValueInput(condition)}
                          </div>

                          {/* Remove Button */}
                          <button
                            className="p-1 rounded vl-text-muted hover:text-rose-400 hover:bg-rose-500/10 shrink-0"
                            onClick={() => removeAdvancedCondition(condition.id)}
                          >
                            <XCircle className="size-3" />
                          </button>

                          {/* Logic Label between conditions */}
                          {idx < advancedConditions.length - 1 && (
                            <span className="text-[9px] font-medium vl-text-muted ml-1">{advancedLogic}</span>
                          )}
                        </div>
                      ))}

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1 border-[var(--vl-border)] vl-text-muted hover:text-white"
                          onClick={addAdvancedCondition}
                        >
                          <Plus className="size-3" />
                          {t(lang, 'filters.addCondition')}
                        </Button>
                        {advancedConditions.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1 vl-text-muted hover:text-rose-400"
                            onClick={clearAdvancedConditions}
                          >
                            <Trash2Icon className="size-3" />
                            {t(lang, 'filters.clearAll')}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
                )}

                {/* Meeting Comparison Dashboard */}
                {dashboardOpen && (
                  <LazyMeetingComparisonDashboard
                    meetings={meetings}
                    agents={agents}
                    lang={lang}
                    onSelectMeetings={handleDashboardSelectMeetings}
                  />
                )}

                {/* Full Side-by-Side Comparison View */}
                {fullComparisonOpen && (
                  <LazyMeetingComparisonView
                    meetings={meetings}
                    onClose={() => setFullComparisonOpen(false)}
                  />
                )}

                {/* Meeting Stats Summary Bar */}
                {meetings.length > 0 && (
                  <div className="glass-morphism-enhanced rounded-xl p-3">
                    <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
                      {[
                        { key: 'total', count: meetings.length, color: '#3b82f6' },
                        { key: 'completed', count: meetings.filter(m => m.status === 'completed').length, color: '#10b981' },
                        { key: 'running', count: meetings.filter(m => m.status === 'running').length, color: '#f59e0b' },
                        { key: 'draft', count: meetings.filter(m => m.status === 'draft').length, color: '#6b7280' },
                      ].map(stat => (
                        <div key={stat.key} className="flex items-center gap-2 shrink-0 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: stat.color }} />
                          <span className="text-xs font-medium text-white">{stat.count}</span>
                          <span className="text-xs vl-text-muted">{t(lang, `history.stats.${stat.key}`)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Filters Row */}
                <div className="flex flex-wrap gap-2 items-center">
                  {/* Search */}
                  <div className="relative flex-1 min-w-[200px] max-w-[300px]">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 vl-text-muted" />
                    <Input
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      placeholder="Search agenda, agents, name..."
                      className="vl-input pl-9 h-8 text-xs input-focus-glow"
                    />
                    {historySearch && (
                      <button
                        className="absolute right-2 top-1/2 -translate-y-1/2 vl-text-muted hover:text-white"
                        onClick={() => setHistorySearch('')}
                      >
                        <XCircle className="size-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Type filter */}
                  <Select value={historyTypeFilter} onValueChange={(v) => setHistoryTypeFilter(v as 'all' | 'team' | 'individual')}>
                    <SelectTrigger className="vl-input w-[110px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="vl-dialog">
                      <SelectItem value="all" className="vl-text-heading focus:bg-[var(--vl-bg-card-hover)] text-xs">All Types</SelectItem>
                      <SelectItem value="team" className="vl-text-heading focus:bg-[var(--vl-bg-card-hover)] text-xs">Team</SelectItem>
                      <SelectItem value="individual" className="vl-text-heading focus:bg-[var(--vl-bg-card-hover)] text-xs">Individual</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Status filter */}
                  <Select value={historyStatusFilter} onValueChange={(v) => setHistoryStatusFilter(v as 'all' | 'draft' | 'running' | 'completed')}>
                    <SelectTrigger className="vl-input w-[120px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="vl-dialog">
                      <SelectItem value="all" className="vl-text-heading focus:bg-[var(--vl-bg-card-hover)] text-xs">All Status</SelectItem>
                      <SelectItem value="draft" className="vl-text-heading focus:bg-[var(--vl-bg-card-hover)] text-xs">Draft</SelectItem>
                      <SelectItem value="running" className="vl-text-heading focus:bg-[var(--vl-bg-card-hover)] text-xs">Running</SelectItem>
                      <SelectItem value="completed" className="vl-text-heading focus:bg-[var(--vl-bg-card-hover)] text-xs">Completed</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Sort */}
                  <Select value={historySortBy} onValueChange={(v) => setHistorySortBy(v as 'newest' | 'oldest' | 'most-messages' | 'recently-updated')}>
                    <SelectTrigger className="vl-input w-[150px] h-8 text-xs">
                      <ArrowDownUp className="size-3 mr-1 vl-text-muted" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="vl-dialog">
                      <SelectItem value="newest" className="vl-text-heading focus:bg-[var(--vl-bg-card-hover)] text-xs">Newest First</SelectItem>
                      <SelectItem value="oldest" className="vl-text-heading focus:bg-[var(--vl-bg-card-hover)] text-xs">Oldest First</SelectItem>
                      <SelectItem value="most-messages" className="vl-text-heading focus:bg-[var(--vl-bg-card-hover)] text-xs">Most Messages</SelectItem>
                      <SelectItem value="recently-updated" className="vl-text-heading focus:bg-[var(--vl-bg-card-hover)] text-xs">Recently Updated</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Date Range */}
                  <div className="flex gap-1 flex-wrap">
                    {(['all', 'today', '7days', '30days'] as const).map((range) => (
                      <Button
                        key={range}
                        variant={historyDateRange === range ? 'default' : 'outline'}
                        size="sm"
                        className={`h-8 px-2.5 text-xs ${historyDateRange === range ? 'bg-emerald-600 text-white border-emerald-600' : 'border-[var(--vl-border)] vl-text-muted hover:text-white hover:bg-[var(--vl-bg-inner)]'}`}
                        onClick={() => setHistoryDateRange(range)}
                      >
                        {range === 'all' ? 'All Time' : range === 'today' ? 'Today' : range === '7days' ? '7 Days' : '30 Days'}
                      </Button>
                    ))}
                  </div>

                  {/* Participant filter */}
                  {allParticipantNames.length > 0 && (
                    <Select value={historyParticipantFilter} onValueChange={setHistoryParticipantFilter}>
                      <SelectTrigger className="vl-input w-[150px] h-8 text-xs">
                        <SelectValue placeholder="Participant" />
                      </SelectTrigger>
                      <SelectContent className="vl-dialog">
                        <SelectItem value="all" className="vl-text-heading focus:bg-[var(--vl-bg-card-hover)] text-xs">All Participants</SelectItem>
                        {allParticipantNames.map(name => (
                          <SelectItem key={name} value={name} className="vl-text-heading focus:bg-[var(--vl-bg-card-hover)] text-xs">{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Clear Filters */}
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs vl-text-muted hover:text-white hover:bg-[var(--vl-bg-inner)] gap-1"
                      onClick={() => {
                        setHistoryTypeFilter('all')
                        setHistoryStatusFilter('all')
                        setHistorySearch('')
                        setHistoryDateRange('all')
                        setHistoryParticipantFilter('all')
                        setHistorySortBy('newest')
                      }}
                    >
                      <XCircle className="size-3.5" /> Clear
                    </Button>
                  )}
                </div>

                {/* Content: Table view, Timeline view, or List view */}
                {historyViewMode === 'table' ? (
                  <HistoryTable
                    meetings={filteredMeetings}
                    agents={agents}
                    lang={lang}
                    onSelectMeeting={handleSelectMeeting}
                    loading={loading}
                  />
                ) : historyViewMode === 'timeline' ? (
                  /* Timeline View - dedicated MeetingTimelineView component */
                  <MeetingTimelineView
                    meetings={filteredMeetings}
                    agents={agents}
                    selectedMeetingId={selectedMeeting?.id || null}
                    onSelectMeeting={handleSelectMeeting}
                    lang={lang}
                  />
                ) : (
                  /* List View */
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Meeting List */}
                    <div className="space-y-3 max-h-[700px] overflow-y-auto pr-2 stagger-children">
                      {loading ? (
                        <HistorySkeletonRows />
                      ) : displayedMeetings.length === 0 ? (
                        <EmptyState
                          icon={Search}
                          title="No meetings found"
                          description={meetings.length === 0 ? "Start your first research meeting to get started" : "No results match your current filters"}
                          accentColor={meetings.length === 0 ? "#10b981" : "#06b6d4"}
                          iconClassName="magnetic-float"
                          titleClassName="text-glow-pulse"
                          action={
                            meetings.length === 0 ? (
                              <Button onClick={() => setActiveTab('team-meeting')} className="bg-emerald-600 hover:bg-emerald-700 text-white" size="sm">
                                <Plus className="size-3.5 mr-1.5" /> Create Meeting
                              </Button>
                            ) : (
                              <Button variant="outline" size="sm" className="border-[var(--vl-border)] vl-text-body" onClick={() => { setHistoryTypeFilter('all'); setHistoryStatusFilter('all'); setHistorySearch(''); setHistoryDateRange('all'); setHistoryParticipantFilter('all') }}>
                                <Filter className="size-3.5 mr-1.5" /> Clear Filters
                              </Button>
                            )
                          }
                        />
                      ) : (
                        <AnimatePresence>
                          {displayedMeetings.map(meeting => {
                            const isExpanded = expandedHistoryId === meeting.id
                            const sessionId = sessionIds.get(meeting.id) || 0
                            const isTeam = meeting.type === 'team'
                            const lastMessages = (meeting.messages || []).slice(-3)
                            const participantNames = [...new Set((meeting.messages || []).map(m => m.agentName).filter(n => n !== 'User'))]
                            const isSelectedForCompare = compareSelection.includes(meeting.id)
                            return (
                              <motion.div
                                key={meeting.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                              >
                                <div className="meeting-hover-wrapper">
                                <Card
                                  className={`vl-card card-hover-3d card-hover-elevated backdrop-blur-sm hover:shadow-[0_0_20px_rgba(16,185,129,0.1)] transition-all duration-300 cursor-pointer group glass-panel hover-lift-sm transition-all-smooth card-3d-glow-hover hover-lift-shadow${meeting.status === 'completed' ? ' stacked-card gradient-border-mask' : ''} ${
                                    selectedMeeting?.id === meeting.id ? 'glass-gradient-border' : ''
                                  } ${isSelectedForCompare ? 'ring-2 ring-emerald-400 ring-offset-1' : ''}`}
                                  onClick={() => {
                                    if (compareMode) {
                                      if (isSelectedForCompare) {
                                        setCompareSelection(prev => prev.filter(id => id !== meeting.id))
                                      } else if (compareSelection.length < 2) {
                                        setCompareSelection(prev => [...prev, meeting.id])
                                      } else {
                                        toast.info('You can only compare 2 meetings at a time')
                                      }
                                    } else {
                                      setExpandedHistoryId(isExpanded ? null : meeting.id)
                                      handleSelectMeeting(meeting)
                                    }
                                  }}
                                >
                                  <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                      <div className="flex items-center gap-3">
                                        {/* Compare mode checkbox */}
                                        {compareMode && (
                                          <button
                                            className="shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              if (isSelectedForCompare) {
                                                setCompareSelection(prev => prev.filter(id => id !== meeting.id))
                                              } else if (compareSelection.length < 2) {
                                                setCompareSelection(prev => [...prev, meeting.id])
                                              } else {
                                                toast.info('You can only compare 2 meetings at a time')
                                              }
                                            }}
                                            aria-label={isSelectedForCompare ? `Deselect ${meeting.saveName}` : `Select ${meeting.saveName} for comparison`}
                                          >
                                            {isSelectedForCompare
                                              ? <CheckSquare className="size-5 text-emerald-400" />
                                              : <Square className="size-5 vl-text-muted hover:text-[var(--vl-text-secondary)]" />
                                            }
                                          </button>
                                        )}
                                        <div className="relative">
                                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isTeam ? 'bg-emerald-500/20' : 'bg-cyan-500/20'}`}>
                                            {isTeam ? <Users className="size-5 text-emerald-400" /> : <BotIcon className="size-5 text-cyan-400" />}
                                          </div>
                                        </div>
                                        <div>
                                          <CardTitle className="text-sm flex items-center gap-2" style={{ color: 'var(--vl-text-white)' }}>
                                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[9px] px-1 py-0">
                                              Session #{sessionId}
                                            </Badge>
                                            {isTeam ? 'Team' : 'Individual'} Meeting
                                          </CardTitle>
                                          <CardDescription className="vl-text-muted text-xs">{meeting.saveName}</CardDescription>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className={`${statusColor(meeting.status)} text-[10px] px-1.5`}>
                                          {meeting.status === 'running' && <PulsingDot color="#f59e0b" />}
                                          {meeting.status !== 'running' && meeting.status}
                                          {meeting.status === 'running' && <span className="ml-1">running</span>}
                                        </Badge>
                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 vl-text-muted hover:text-red-400 hover:bg-[var(--vl-bg-card-hover)] opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); handleDeleteMeeting(meeting) }} aria-label="Delete meeting">
                                          <Trash2 className="size-3.5" />
                                        </Button>
                                        {meeting.status === 'completed' && (meeting.messages || []).length > 0 && (
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-7 w-7 p-0 vl-text-muted hover:text-emerald-400 hover:bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                                  onClick={(e) => { e.stopPropagation(); openReplay(meeting) }}
                                                  aria-label="Inline replay meeting"
                                                >
                                                  <Play className="size-3.5" />
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>Replay inline</TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        )}
                                        {onReplayMeeting && (
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-7 w-7 p-0 vl-text-muted hover:text-cyan-400 hover:bg-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                                  onClick={(e) => { e.stopPropagation(); onReplayMeeting(meeting) }}
                                                  aria-label="Open full replay player"
                                                >
                                                  <RotateCcw className="size-3.5" />
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>{t(lang, 'replay.openEnhanced')}</TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        )}
                                      </div>
                                    </div>
                                  </CardHeader>
                                  <CardContent className="pt-0 space-y-1.5">
                                    <p className="vl-text-body text-xs line-clamp-2">{meeting.agenda}</p>
                                    <div className="flex items-center gap-3 text-[10px] vl-text-muted">
                                      {isTeam && meeting.numRounds && <span>Rounds: {meeting.numRounds}</span>}
                                      <span className="flex items-center gap-1">
                                        <MessageSquare className="size-2.5" />
                                        {meeting.messages?.length || 0}
                                      </span>
                                      <span>{timeAgo(meeting.createdAt)}</span>
                                    </div>
                                    {/* Participant avatars */}
                                    {participantNames.length > 0 && (
                                      <div className="flex items-center gap-1 mt-1">
                                        <span className="text-[9px] vl-text-muted">Participants:</span>
                                        <div className="flex items-center">
                                          {participantNames.slice(0, 4).map((name, i) => {
                                            const agent = agents.find(a => a.title === name)
                                            return (
                                              <TooltipProvider key={name + i}>
                                                <Tooltip>
                                                  <TooltipTrigger asChild>
                                                    <div
                                                      className="w-5 h-5 rounded-full flex items-center justify-center text-white ring-1 ring-[var(--vl-border)]"
                                                      style={{ backgroundColor: agent?.color || '#6366f1', marginLeft: i > 0 ? '-3px' : '0', zIndex: participantNames.length - i }}
                                                    >
                                                      <span className="text-[8px] font-bold">{name.charAt(0)}</span>
                                                    </div>
                                                  </TooltipTrigger>
                                                  <TooltipContent className="text-xs">{name}</TooltipContent>
                                                </Tooltip>
                                              </TooltipProvider>
                                            )
                                          })}
                                          {participantNames.length > 4 && (
                                            <span className="text-[9px] vl-text-muted ml-1">+{participantNames.length - 4}</span>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </CardContent>

                                  {/* Inline expansion - mini preview */}
                                  <AnimatePresence>
                                    {isExpanded && lastMessages.length > 0 && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                      >
                                        <div className="px-4 pb-3 pt-1 border-t border-[var(--vl-border-subtle)] space-y-2">
                                          <p className="text-[10px] vl-text-muted font-medium">Last {lastMessages.length} messages:</p>
                                          {lastMessages.map(msg => {
                                            const agent = agents.find(a => a.title === msg.agentName)
                                            return (
                                              <div key={msg.id} className="flex gap-2 items-start">
                                                <div
                                                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-white"
                                                  style={{ backgroundColor: agent?.color || '#6366f1' }}
                                                >
                                                  <span className="text-[8px] font-bold">{msg.agentName.charAt(0)}</span>
                                                </div>
                                                <div className="min-w-0">
                                                  <span className="text-[10px] font-semibold" style={{ color: agent?.color || '#94a3b8' }}>{msg.agentName}</span>
                                                  <p className="text-[10px] vl-text-body line-clamp-2">{msg.message}</p>
                                                </div>
                                              </div>
                                            )
                                          })}
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 w-full"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleSelectMeeting(meeting)
                                            }}
                                          >
                                            <Maximize2 className="size-3 mr-1" /> View Full Discussion
                                          </Button>
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </Card>
                                {/* Hover Quick-View Preview */}
                                <div className="meeting-hover-preview">
                                  <div className="vl-card border border-[var(--vl-border)] rounded-xl p-3 shadow-lg backdrop-blur-sm">
                                    {/* Summary */}
                                    <p className="text-xs vl-text-body line-clamp-4 mb-2">
                                      {(meeting.agenda || '').slice(0, 150)}{(meeting.agenda || '').length > 150 ? '...' : ''}
                                    </p>
                                    {/* Participant avatars row */}
                                    {participantNames.length > 0 && (
                                      <div className="flex items-center gap-1 mb-2">
                                        <span className="text-[9px] vl-text-muted mr-1">Participants:</span>
                                        <div className="flex items-center">
                                          {participantNames.slice(0, 6).map((name, i) => {
                                            const agent = agents.find(a => a.title === name)
                                            return (
                                              <div
                                                key={name + i}
                                                className="w-5 h-5 rounded-full flex items-center justify-center text-white ring-1 ring-[var(--vl-border)]"
                                                style={{ backgroundColor: agent?.color || '#6366f1', marginLeft: i > 0 ? '-3px' : '0', zIndex: participantNames.length - i }}
                                              >
                                                <span className="text-[8px] font-bold">{name.charAt(0)}</span>
                                              </div>
                                            )
                                          })}
                                          {participantNames.length > 6 && (
                                            <span className="text-[9px] vl-text-muted ml-1">+{participantNames.length - 6}</span>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                    {/* Badges row */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Badge variant="outline" className={`${statusColor(meeting.status)} text-[9px] px-1.5`}>
                                        {meeting.status === 'running' && <PulsingDot color="#f59e0b" />}
                                        {meeting.status !== 'running' && meeting.status}
                                        {meeting.status === 'running' && <span className="ml-1">running</span>}
                                      </Badge>
                                      <span className="inline-flex items-center gap-0.5 text-[9px] vl-text-muted bg-[var(--vl-bg-inner)] px-1.5 py-0.5 rounded-md border border-[var(--vl-border-subtle)]">
                                        <MessageSquare className="size-2.5" />
                                        {meeting.messages?.length || 0} msgs
                                      </span>
                                      {isTeam && meeting.numRounds && (
                                        <span className="inline-flex items-center gap-0.5 text-[9px] vl-text-muted bg-[var(--vl-bg-inner)] px-1.5 py-0.5 rounded-md border border-[var(--vl-border-subtle)]">
                                          <GitCommit className="size-2.5" />
                                          {meeting.numRounds} rounds
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                </div>
                              </motion.div>
                            )
                          })}
                        </AnimatePresence>
                      )}
                    </div>

                    {/* Selected Meeting Detail */}
                    <Card className="vl-card backdrop-blur-sm h-[700px] flex flex-col sticky top-24 glass-panel">
                      {selectedMeeting ? (
                        <>
                          <div className="px-4 py-3 border-b flex items-center justify-between backdrop-blur-lg">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                                Session #{sessionIds.get(selectedMeeting.id) || ''}
                              </Badge>
                              <Badge variant="outline" className={`${selectedMeeting.type === 'team' ? 'bg-emerald-600/70 text-white border-emerald-500/50' : 'bg-cyan-600/70 text-white border-cyan-500/50'} text-xs`}>
                                {selectedMeeting.type === 'team' ? 'Team' : 'Individual'}
                              </Badge>
                              <span className="text-sm vl-text-heading font-medium">{selectedMeeting.saveName}</span>
                            </div>
                            <div className="flex gap-1">
                              {/* Bookmarks Toggle Button */}
                              {(selectedMeeting.messages || []).length > 0 && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        className={`relative p-2 rounded-lg transition-all duration-200 btn-hover-lift touch-action-manipulation ${
                                          bookmarksOpen
                                            ? 'bg-amber-500/10 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                                            : 'text-[var(--vl-text-muted)] hover:text-[var(--vl-text-body)] hover:bg-[var(--vl-bg-inner)]'
                                        }`}
                                        onClick={() => { setBookmarksOpen(!bookmarksOpen); if (annotationsOpen) setAnnotationsOpen(false) }}
                                        aria-label={t(lang, 'meetingBookmarks.toggle')}
                                      >
                                        <Bookmark className="size-3.5" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>{t(lang, 'meetingBookmarks.title')}</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              {/* Annotations Toggle Button */}
                              {(selectedMeeting.messages || []).length > 0 && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        className={`relative p-2 rounded-lg transition-all duration-200 btn-hover-lift touch-action-manipulation ${
                                          annotationsOpen
                                            ? 'bg-emerald-500/10 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                                            : 'text-[var(--vl-text-muted)] hover:text-[var(--vl-text-body)] hover:bg-[var(--vl-bg-inner)]'
                                        }`}
                                        onClick={() => { setAnnotationsOpen(!annotationsOpen); if (bookmarksOpen) setBookmarksOpen(false) }}
                                        aria-label={lang === 'zh' ? '切换标注面板' : 'Toggle annotation panel'}
                                      >
                                        <Bookmark className="size-3.5" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>{lang === 'zh' ? '📝 标注' : '📝 Annotations'}</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              {/* Highlighter Toggle Button */}
                              {selectedMeeting.summary && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        className={`relative p-2 rounded-lg transition-all duration-200 btn-hover-lift touch-action-manipulation ${
                                          highlighterOpen
                                            ? 'bg-violet-500/10 text-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.2)]'
                                            : 'text-[var(--vl-text-muted)] hover:text-[var(--vl-text-body)] hover:bg-[var(--vl-bg-inner)]'
                                        }`}
                                        onClick={() => setHighlighterOpen(!highlighterOpen)}
                                        aria-label={t(lang, 'meetingHighlighter.title')}
                                      >
                                        <Highlighter className="size-3.5" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>{t(lang, 'meetingHighlighter.title')}</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              {/* Copy Summary Button */}
                              {selectedMeeting.summary && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 vl-text-muted hover:text-emerald-400 hover:bg-emerald-500/10"
                                        onClick={async () => {
                                          await navigator.clipboard.writeText(selectedMeeting.summary || '')
                                          toast.success('Summary copied!')
                                        }}
                                        aria-label="Copy summary"
                                      >
                                        <Copy className="size-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Copy Summary</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              {/* Enhanced Export Button */}
                              <EnhancedExportButton meeting={selectedMeeting} lang={lang} />
                              {/* Re-run Meeting Button */}
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                      <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 vl-text-muted hover:text-cyan-400 hover:bg-cyan-500/10"
                                      disabled={!onRerunMeeting}
                                      onClick={() => { if (selectedMeeting) onRerunMeeting?.(selectedMeeting) }}
                                      aria-label="Re-run meeting with same parameters"
                                    >
                                      <Repeat className="size-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Re-run with same parameters</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              {/* Enhanced Replay Button */}
                              {selectedMeeting.status === 'completed' && (selectedMeeting.messages || []).length > 0 && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 vl-text-muted hover:text-violet-400 hover:bg-violet-500/10"
                                        onClick={() => setEnhancedReplayMeeting(selectedMeeting)}
                                        aria-label={t(lang, 'replay.openEnhanced')}
                                      >
                                        <FastForward className="size-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>{t(lang, 'replay.openEnhanced')}</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              {selectedMeeting.status === 'draft' && (
                                <Button
                                  onClick={() => handleRunMeeting(selectedMeeting)}
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-8"
                                  disabled={runningMeetingId === selectedMeeting.id}
                                >
                                  {runningMeetingId === selectedMeeting.id ? (
                                    <Loader2 className="size-3.5 animate-spin mr-1" />
                                  ) : (
                                    <Play className="size-3.5 mr-1" />
                                  )}
                                  Run
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 vl-text-muted hover:text-white"
                                onClick={handleRefreshMeeting}
                                aria-label="Refresh meeting"
                              >
                                <RotateCcw className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex-1 overflow-y-auto custom-scrollbar">
                          <AnimatePresence mode="wait">
                            {annotationsOpen && selectedMeeting && (
                              <motion.div
                                key="annotation-panel"
                                initial={{ opacity: 0, x: 20, width: 0 }}
                                animate={{ opacity: 1, x: 0, width: 'auto' }}
                                exit={{ opacity: 0, x: 20, width: 0 }}
                                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                                className="flex-shrink-0 overflow-hidden"
                              >
                                <LazyMeetingAnnotationSystem
                                  meetingId={selectedMeeting.id}
                                  messages={(selectedMeeting.messages || []).map(m => ({
                                    id: m.id,
                                    agentName: m.agentName,
                                    agentColor: agents.find(a => a.title === m.agentName)?.color,
                                    message: m.message,
                                    roundIndex: m.roundIndex,
                                    createdAt: m.createdAt,
                                  }))}
                                  agents={agents.map(a => ({
                                    id: a.id,
                                    title: a.title,
                                    color: a.color,
                                  }))}
                                  lang={lang}
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>
                          {/* Bookmarks Panel (toggleable) */}
                          <AnimatePresence>
                            {bookmarksOpen && selectedMeeting && (
                              <motion.div
                                key="bookmarks-panel"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.25 }}
                                className="overflow-hidden mx-4 mt-2"
                              >
                                <LazyMeetingBookmarks
                                  meetingId={selectedMeeting.id}
                                  messages={(selectedMeeting.messages || []).map(m => ({
                                    id: m.id,
                                    agentName: m.agentName,
                                    message: m.message,
                                    roundIndex: m.roundIndex,
                                  }))}
                                  lang={lang}
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>
                          {/* Highlighter for summary (above DiscussionViewer when summary exists) */}
                          <AnimatePresence>
                            {highlighterOpen && selectedMeeting && selectedMeeting.summary && (
                              <motion.div
                                key="highlighter-panel"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.25 }}
                                className="overflow-hidden mx-4 mt-2"
                              >
                                <LazyMeetingHighlighter
                                  meetingId={selectedMeeting.id}
                                  summary={selectedMeeting.summary || ''}
                                  lang={lang}
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>
                          <DiscussionViewer
                            meeting={selectedMeeting}
                            agents={agents}
                            onRefresh={handleRefreshMeeting}
                            onRunMeeting={handleRunMeeting}
                            runningMeetingId={runningMeetingId}
                          />

                          {/* Word Cloud — collapsible */}
                          {(selectedMeeting.messages || []).length > 0 && (
                            <div className="px-4 pb-2">
                              <Collapsible>
                                <CollapsibleTrigger asChild>
                                  <button
                                    className="flex items-center gap-2 w-full py-2.5 px-3 rounded-lg hover:bg-[var(--vl-bg-inner)] transition-colors"
                                  >
                                    <span className="text-xs font-semibold vl-text-heading">
                                      ☁️ {t(lang, 'wordCloud.title')}
                                    </span>
                                    <ChevronDown className="size-3.5 vl-text-muted group-data-[state=open]:rotate-180 transition-transform" />
                                  </button>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <div className="vl-card rounded-xl p-4 mt-1">
                                    <p className="text-[10px] vl-text-muted mb-2">{t(lang, 'wordCloud.description')}</p>
                                    <MeetingWordCloud
                                      meeting={selectedMeeting}
                                      agents={agents}
                                      lang={lang}
                                      onWordClick={(word) => setWordCloudFilter(prev => prev === word ? null : word)}
                                    />
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            </div>
                          )}

                          {/* Meeting Insights Panel — collapsible */}
                          {(selectedMeeting.messages || []).length > 0 && (
                            <div className="px-4 pb-4">
                              <Collapsible open={insightsOpen} onOpenChange={setInsightsOpen}>
                                <CollapsibleTrigger asChild>
                                  <button
                                    className="flex items-center gap-2 w-full py-2.5 px-3 rounded-lg hover:bg-[var(--vl-bg-inner)] transition-colors"
                                  >
                                    <span className="text-xs font-semibold vl-text-heading">
                                      📊 {t(lang, 'meetingInsights.title')}
                                    </span>
                                    {insightsOpen
                                      ? <ChevronUp className="size-3.5 vl-text-muted" />
                                      : <ChevronDown className="size-3.5 vl-text-muted" />
                                    }
                                  </button>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <div className="vl-card rounded-xl p-4 mt-2">
                                    <LazyMeetingInsightsPanel
                                      meeting={{ ...selectedMeeting, summary: selectedMeeting.summary || undefined }}
                                      messages={selectedMeeting.messages || []}
                                      lang={lang}
                                    />
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            </div>
                          )}
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 flex items-center justify-center">
                          <EmptyState
                            icon={MessageSquare}
                            title="Select a meeting"
                            description="Click a meeting from the list to view its details and discussion"
                          />
                        </div>
                      )}
                    </Card>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* ============================================================ */}
            {/* Enhanced Replay Dialog */}
            {/* ============================================================ */}
            <Dialog open={!!enhancedReplayMeeting} onOpenChange={(open) => { if (!open) setEnhancedReplayMeeting(null) }}>
              <DialogContent className="vl-dialog max-w-2xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle className="vl-text-heading flex items-center gap-2 text-base">
                    <FastForward className="size-4 text-emerald-400" />
                    {t(lang, 'replay.title')}
                    {enhancedReplayMeeting && (
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                        {enhancedReplayMeeting.saveName}
                      </Badge>
                    )}
                  </DialogTitle>
                </DialogHeader>
                {enhancedReplayMeeting && (
                  <div className="flex-1 overflow-hidden">
                    <EnhancedMeetingReplay
                      meeting={enhancedReplayMeeting}
                      agents={agents}
                      lang={lang}
                    />
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* ============================================================ */}
            {/* Replay Dialog */}
            {/* ============================================================ */}
            <Dialog open={!!replayMeeting} onOpenChange={(open) => { if (!open) { setReplayMeeting(null); setReplayPlaying(false) } }}>
              <DialogContent className="vl-dialog max-w-2xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle className="vl-text-heading flex items-center gap-2 text-base">
                    <Play className="size-4 text-emerald-400" />
                    Meeting Replay
                    {replayMeeting && (
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                        {replayMeeting.saveName}
                      </Badge>
                    )}
                  </DialogTitle>
                </DialogHeader>

                {replayMeeting && (
                  <div className="flex-1 overflow-hidden flex flex-col gap-3">
                    {/* Timeline Slider & Controls */}
                    <div className="vl-inner rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs vl-text-muted font-medium">
                          Round {replayRound + 1} of {replayMessages.totalRounds}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 vl-text-muted hover:text-emerald-400 hover:bg-emerald-500/10"
                            onClick={() => setReplayPlaying(!replayPlaying)}
                            aria-label={replayPlaying ? 'Pause' : 'Play'}
                          >
                            {replayPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className={`h-7 text-xs gap-1 px-2 ${replayShowAll ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'border-[var(--vl-border)] vl-text-muted hover:text-white'}`}
                            onClick={() => { setReplayShowAll(!replayShowAll); setReplayPlaying(false) }}
                          >
                            <ListChecks className="size-3" />
                            {replayShowAll ? 'Round View' : 'Full Transcript'}
                          </Button>
                        </div>
                      </div>

                      {/* Progress dots */}
                      {!replayShowAll && (
                        <div className="flex items-center gap-1">
                          {replayMessages.uniqueRounds.map((_, i) => (
                            <button
                              key={i}
                              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                                i === replayRound ? 'bg-emerald-400 min-w-[12px]' :
                                i < replayRound ? 'bg-emerald-400/40' : 'bg-[var(--vl-border-subtle)]'
                              }`}
                              onClick={() => { setReplayRound(i); setReplayPlaying(false) }}
                              aria-label={`Go to round ${i + 1}`}
                            />
                          ))}
                        </div>
                      )}

                      <Slider
                        value={[replayRound]}
                        min={0}
                        max={Math.max(0, replayMessages.totalRounds - 1)}
                        step={1}
                        onValueChange={([v]) => { setReplayRound(v); setReplayPlaying(false) }}
                        className="w-full"
                      />
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                      {replayShowAll ? (
                        replayMessages.uniqueRounds.map(roundIdx => (
                          <div key={roundIdx}>
                            <div className="flex items-center gap-2 mb-2 mt-2">
                              <Badge variant="outline" className="text-[9px] bg-[var(--vl-bg-inner)] vl-text-muted border-[var(--vl-border-subtle)] px-1.5 py-0">
                                Round {roundIdx + 1}
                              </Badge>
                              <div className="flex-1 h-px bg-[var(--vl-border-subtle)]" />
                            </div>
                            {(replayMeeting.messages || [])
                              .filter(m => m.roundIndex === roundIdx)
                              .map(msg => {
                                const agent = agents.find(a => a.title === msg.agentName)
                                return (
                                  <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex gap-2 mb-2"
                                  >
                                    <div
                                      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white text-[10px] font-bold"
                                      style={{ backgroundColor: agent?.color || '#6366f1' }}
                                    >
                                      {msg.agentName.charAt(0)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <span className="text-xs font-semibold" style={{ color: agent?.color || '#94a3b8' }}>{msg.agentName}</span>
                                      <p className="text-xs vl-text-body mt-0.5 whitespace-pre-wrap">{msg.message}</p>
                                    </div>
                                  </motion.div>
                                )
                              })}
                          </div>
                        ))
                      ) : (
                        (() => {
                          const currentRoundIdx = replayMessages.uniqueRounds[replayRound]
                          const currentMsgs = currentRoundIdx !== undefined
                            ? (replayMeeting.messages || []).filter(m => m.roundIndex === currentRoundIdx)
                            : []
                          return (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30 px-1.5 py-0">
                                  Round {replayRound + 1} of {replayMessages.totalRounds}
                                </Badge>
                                <div className="flex-1 h-px bg-[var(--vl-border-subtle)]" />
                              </div>
                              <AnimatePresence mode="wait">
                                {currentMsgs.map(msg => {
                                  const agent = agents.find(a => a.title === msg.agentName)
                                  const displayText = typingTexts[msg.id] || msg.message
                                  const isStillTyping = displayText.length < msg.message.length
                                  return (
                                    <motion.div
                                      key={msg.id}
                                      initial={{ opacity: 0, y: 8 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0 }}
                                      className="flex gap-2 mb-3"
                                    >
                                      <div
                                        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white text-[10px] font-bold"
                                        style={{ backgroundColor: agent?.color || '#6366f1' }}
                                      >
                                        {msg.agentName.charAt(0)}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <span className="text-xs font-semibold" style={{ color: agent?.color || '#94a3b8' }}>{msg.agentName}</span>
                                        <p className="text-xs vl-text-body mt-0.5 whitespace-pre-wrap">
                                          {displayText}
                                          {isStillTyping && (
                                            <span className="inline-block w-1.5 h-3.5 bg-emerald-400 animate-pulse ml-0.5 align-middle" />
                                          )}
                                        </p>
                                      </div>
                                    </motion.div>
                                  )
                                })}
                              </AnimatePresence>
                              {currentMsgs.length === 0 && (
                                <p className="text-xs vl-text-muted text-center py-4">No messages in this round.</p>
                              )}
                            </div>
                          )
                        })()
                      )}
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* ============================================================ */}
            {/* Statistics Panel */}
            {/* ============================================================ */}
            {meetingStats && meetings.length > 0 && (
              <div className="mt-6">
                <Collapsible open={statsOpen} onOpenChange={setStatsOpen}>
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center gap-2 text-sm vl-text-heading font-medium hover:text-emerald-400 transition-colors w-full">
                      <BarChart3 className="size-4" />
                      Meeting Statistics
                      {statsOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-3 space-y-4">
                      {/* Overview Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="vl-inner rounded-lg p-3 text-center border border-[var(--vl-border-subtle)]">
                          <Activity className="size-4 mx-auto mb-1 text-emerald-400" />
                          <p className="text-lg font-bold vl-text-heading">{meetingStats.totalMeetings}</p>
                          <p className="text-[10px] vl-text-muted">Total Meetings</p>
                        </div>
                        <div className="vl-inner rounded-lg p-3 text-center border border-[var(--vl-border-subtle)]">
                          <MessageSquare className="size-4 mx-auto mb-1 text-cyan-400" />
                          <p className="text-lg font-bold vl-text-heading">{meetingStats.totalMessages}</p>
                          <p className="text-[10px] vl-text-muted">Total Messages</p>
                        </div>
                        <div className="vl-inner rounded-lg p-3 text-center border border-[var(--vl-border-subtle)]">
                          <Hash className="size-4 mx-auto mb-1 text-violet-400" />
                          <p className="text-lg font-bold vl-text-heading">{meetingStats.avgMessages}</p>
                          <p className="text-[10px] vl-text-muted">Avg Msgs/Meeting</p>
                        </div>
                        <div className="vl-inner rounded-lg p-3 text-center border border-[var(--vl-border-subtle)]">
                          <BotIcon className="size-4 mx-auto mb-1 text-amber-400" />
                          <p className="text-sm font-bold vl-text-heading truncate" title={meetingStats.mostActiveAgent}>{meetingStats.mostActiveAgent}</p>
                          <p className="text-[10px] vl-text-muted">Most Active</p>
                        </div>
                      </div>

                      {/* Per-Agent Stats Bar Chart (CSS only) */}
                      {Object.keys(meetingStats.agentMsgCounts).length > 0 && (
                        <div className="vl-inner rounded-lg border border-[var(--vl-border-subtle)] p-4">
                          <p className="text-xs font-medium vl-text-heading mb-3">Messages per Agent</p>
                          <div className="space-y-2">
                            {Object.entries(meetingStats.agentMsgCounts)
                              .sort((a, b) => b[1] - a[1])
                              .map(([name, count], i) => {
                                const agent = agents.find(a => a.title === name)
                                const maxCount = Math.max(...Object.values(meetingStats.agentMsgCounts))
                                const pct = maxCount > 0 ? (count / maxCount) * 100 : 0
                                return (
                                  <div key={name} className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-white text-[9px] font-bold" style={{ backgroundColor: agent?.color || '#6366f1' }}>
                                      {name.charAt(0)}
                                    </div>
                                    <span className="text-xs vl-text-body w-24 truncate shrink-0" title={name}>{name}</span>
                                    <div className="flex-1 h-5 rounded-full bg-[var(--vl-border-subtle)] overflow-hidden">
                                      <motion.div
                                        className="h-full rounded-full"
                                        style={{ backgroundColor: agent?.color || '#10b981' }}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${pct}%` }}
                                        transition={{ duration: 0.6, delay: i * 0.1 }}
                                      />
                                    </div>
                                    <span className="text-xs font-medium vl-text-heading w-8 text-right shrink-0">{count}</span>
                                  </div>
                                )
                              })}
                          </div>
                        </div>
                      )}

                      {/* Meeting Distribution Pie + Time Range */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="vl-inner rounded-lg border border-[var(--vl-border-subtle)] p-4">
                          <p className="text-xs font-medium vl-text-heading mb-2">Meeting Distribution</p>
                          <div className="h-[120px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={[{ name: 'Team', value: meetingStats.teamCount }, { name: 'Individual', value: meetingStats.individualCount }]}
                                  cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={3} dataKey="value" stroke="none"
                                >
                                  <Cell fill="#10b981" />
                                  <Cell fill="#06b6d4" />
                                </Pie>
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex items-center justify-center gap-4 mt-1">
                            <span className="flex items-center gap-1.5 text-[10px] vl-text-muted">
                              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Team ({meetingStats.teamCount})
                            </span>
                            <span className="flex items-center gap-1.5 text-[10px] vl-text-muted">
                              <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500" /> Individual ({meetingStats.individualCount})
                            </span>
                          </div>
                        </div>
                        <div className="vl-inner rounded-lg border border-[var(--vl-border-subtle)] p-4 flex flex-col justify-center">
                          <p className="text-xs font-medium vl-text-heading mb-3">Time Range</p>
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="size-3.5 vl-text-muted shrink-0" />
                              <div>
                                <p className="text-[9px] vl-text-muted">Earliest</p>
                                <p className="text-xs vl-text-body">{meetingStats.earliestDate.toLocaleDateString()}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="size-3.5 vl-text-muted shrink-0" />
                              <div>
                                <p className="text-[9px] vl-text-muted">Latest</p>
                                <p className="text-xs vl-text-body">{meetingStats.latestDate.toLocaleDateString()}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}
          </>
        )
}

// ============================================================
// History Table View (using AdvancedDataTable)
// ============================================================

function HistoryTable({ meetings, agents, lang, onSelectMeeting, loading }: {
  meetings: Meeting[]
  agents: Agent[]
  lang: Lang
  onSelectMeeting: (m: Meeting) => void
  loading: boolean
}) {
  const columns: DataTableColumn<Meeting>[] = useMemo(() => [
    {
      id: 'saveName',
      label: t(lang, 'common.name'),
      sortable: true,
      filterable: true,
      width: 200,
      render: (_val, row) => (
        <button
          type="button"
          onClick={() => onSelectMeeting(row)}
          className="text-left text-xs font-medium vl-text-heading hover:text-emerald-400 transition-colors cursor-pointer truncate block max-w-[180px]"
        >
          {row.saveName || t(lang, 'common.meeting')}
        </button>
      ),
    },
    {
      id: 'type',
      label: t(lang, 'common.type'),
      sortable: true,
      filterable: true,
      width: 100,
      render: (val) => (
        <Badge variant="outline" className={`text-[10px] ${
          val === 'team'
            ? 'border-emerald-500/30 text-emerald-400'
            : 'border-cyan-500/30 text-cyan-400'
        }`}>
          {val === 'team' ? t(lang, 'common.team') : t(lang, 'common.individual')}
        </Badge>
      ),
    },
    {
      id: 'status',
      label: t(lang, 'common.status'),
      sortable: true,
      filterable: true,
      width: 100,
      render: (val) => (
        <Badge variant="outline" className={`text-[10px] ${
          val === 'completed'
            ? 'border-emerald-500/30 text-emerald-400'
            : val === 'running'
              ? 'border-amber-500/30 text-amber-400'
              : 'border-[var(--vl-border-subtle)] vl-text-muted'
        }`}>
          {val === 'completed' ? t(lang, 'common.completed') : val === 'running' ? t(lang, 'common.running') : t(lang, 'meeting.status.draft')}
        </Badge>
      ),
    },
    {
      id: 'messages',
      label: t(lang, 'common.messages'),
      sortable: true,
      width: 80,
      render: (val) => (
        <span className="text-xs vl-text-body">{(val as unknown[])?.length || 0}</span>
      ),
      sortValue: (row) => (row.messages as unknown[])?.length || 0,
    },
    {
      id: 'numRounds',
      label: t(lang, 'meeting.rounds'),
      sortable: true,
      width: 70,
    },
    {
      id: 'temperature',
      label: t(lang, 'meeting.temperature'),
      sortable: true,
      width: 80,
      render: (val) => (
        <span className="text-xs vl-text-body">{String(val ?? 0.2)}</span>
      ),
    },
    {
      id: 'createdAt',
      label: t(lang, 'agents.detail.created'),
      sortable: true,
      width: 120,
      render: (val) => (
        <span className="text-xs vl-text-muted">{val ? new Date(val as string).toLocaleDateString() : '—'}</span>
      ),
      sortValue: (row) => new Date(row.createdAt as string).getTime(),
    },
  ], [lang, onSelectMeeting])

  return (
    <AdvancedDataTable
      columns={columns as any}
      data={meetings as any}
      rowId={(row: any) => row.id}
      lang={lang}
      loading={loading}
      emptyMessage={t(lang, 'history.noMeetingsFound')}
      onRowClick={(row: any) => onSelectMeeting(row as Meeting)}
      expandableRow={(row: any) => (
        <div className="max-h-48 overflow-y-auto">
          <p className="text-xs vl-text-body whitespace-pre-wrap">{row.agenda}</p>
        </div>
      )}
    />
  )
}
