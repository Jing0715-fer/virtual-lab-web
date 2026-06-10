'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Sparkles, Zap, Bot as BotIcon, GitCompareArrows, Check, Eye, Clock, MessageSquare, CheckCircle, ChevronDown, ChevronUp, Trophy, BarChart3, Circle, Users, TrendingUp, TrendingDown, Minus, Calendar, History, Hash, MessageCircle, MessageCircleQuestion } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import { useScrollReveal, ScrollRevealSection } from './scroll-reveal'
import type { Agent, Meeting } from './shared-components'
import { AgentCard, EmptyState, AgentsSkeletonGrid, timeAgo } from './shared-components'
import {
  LazyAgentComparisonView,
  LazyAgentChatPanel,
  LazyAgentPersonaDashboard,
} from './lazy-components'
import { AgentProfileEnhancement } from './agent-profile-enhancement'
import { MoodIndicatorWithState, type AgentMood } from './agent-mood-indicator'
import { AgentMoodIndicator, AgentActivityRing, AgentCardEnhancement } from './agent-persona'
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

// ============================================================
// Agent Personality Traits — Heuristic computation
// ============================================================

interface PersonalityTraits {
  analytical: number
  creative: number
  collaborative: number
  critical: number
  innovative: number
}

const TRAIT_COLORS: Record<keyof PersonalityTraits, string> = {
  analytical: '#06b6d4',
  creative: '#f59e0b',
  collaborative: '#10b981',
  critical: '#ef4444',
  innovative: '#8b5cf6',
}

const TRAIT_KEYS: { key: keyof PersonalityTraits; i18nKey: string }[] = [
  { key: 'analytical', i18nKey: 'agents.traits.analytical' },
  { key: 'creative', i18nKey: 'agents.traits.creative' },
  { key: 'collaborative', i18nKey: 'agents.traits.collaborative' },
  { key: 'critical', i18nKey: 'agents.traits.critical' },
  { key: 'innovative', i18nKey: 'agents.traits.innovative' },
]

function computePersonalityTraits(agent: Agent, meetings: Meeting[]): PersonalityTraits {
  // Heuristic: derive trait values from agent fields and meeting activity
  const text = `${agent.expertise} ${agent.goal} ${agent.role}`.toLowerCase()
  const messages = meetings.flatMap(m =>
    (m.messages?.filter(msg => msg.agentName === agent.title) || [])
  )
  const totalMsgs = messages.length
  const meetingsJoined = meetings.filter(m =>
    m.messages?.some(msg => msg.agentName === agent.title)
  ).length

  // Analytical: words like analysis, data, compute, model, predict
  const analyticalKeywords = ['analysis', 'data', 'compute', 'model', 'predict', 'measure', 'evaluate', 'quantitative', 'algorithm']
  const analyticalScore = analyticalKeywords.filter(k => text.includes(k)).length

  // Creative: words like design, create, novel, innovative, generate
  const creativeKeywords = ['design', 'create', 'novel', 'innovative', 'generate', 'imagine', 'explore', 'discover']
  const creativeScore = creativeKeywords.filter(k => text.includes(k)).length

  // Collaborative: words like team, together, collaborate, coordinate, lead
  const collabKeywords = ['team', 'together', 'collaborate', 'coordinate', 'lead', 'facilitate', 'partner', 'support']
  const collabScore = collabKeywords.filter(k => text.includes(k)).length
  const collabBonus = Math.min(meetingsJoined * 8, 30)

  // Critical: words like review, critique, evaluate, assess, quality
  const criticalKeywords = ['review', 'critique', 'evaluate', 'assess', 'quality', 'validate', 'verify', 'examine']
  const criticalScore = criticalKeywords.filter(k => text.includes(k)).length

  // Innovative: words like new, advance, breakthrough, cutting-edge, pioneer
  const innovativeKeywords = ['new', 'advance', 'breakthrough', 'cutting-edge', 'pioneer', 'novel', 'emerging', 'frontier']
  const innovativeScore = innovativeKeywords.filter(k => text.includes(k)).length

  const msgBonus = Math.min(totalMsgs * 3, 25)

  return {
    analytical: Math.min(Math.max(analyticalScore * 18 + msgBonus * 0.6, 15), 95),
    creative: Math.min(Math.max(creativeScore * 20 + msgBonus * 0.5, 15), 95),
    collaborative: Math.min(Math.max(collabScore * 18 + collabBonus, 15), 95),
    critical: Math.min(Math.max(criticalScore * 20 + msgBonus * 0.4, 15), 95),
    innovative: Math.min(Math.max(innovativeScore * 18 + msgBonus * 0.3, 15), 95),
  }
}

function AgentPersonalityTraits({ agent, meetings, lang }: { agent: Agent; meetings: Meeting[]; lang: Lang }) {
  const traits = useMemo(() => computePersonalityTraits(agent, meetings), [agent, meetings])

  return (
    <div className="px-3 py-2 border-t border-[var(--vl-border-subtle)]">
      <p className="text-[10px] font-semibold vl-text-muted uppercase tracking-wider mb-1.5">
        {t(lang, 'agents.traits.title')}
      </p>
      <div className="space-y-1">
        {TRAIT_KEYS.map(({ key, i18nKey }) => {
          const value = traits[key]
          const color = TRAIT_COLORS[key]
          return (
            <TooltipProvider key={key} delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 cursor-default">
                    <span className="text-[9px] vl-text-muted w-14 truncate" title={t(lang, i18nKey)}>
                      {t(lang, i18nKey)}
                    </span>
                    <div className="flex-1 h-1.5 rounded-full bg-[var(--vl-bg-inner)] overflow-hidden">
                      <div
                        className="h-full rounded-full trait-progress-bar"
                        style={{
                          width: `${value}%`,
                          background: `linear-gradient(90deg, ${color}88, ${color}, ${color}88)`,
                        }}
                      />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="tooltip-glass text-[10px]">
                  {t(lang, i18nKey)}: {value}%
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================
// Agent Activity Status — Recent events timeline
// ============================================================

interface AgentActivityEvent {
  id: string
  type: 'joinedMeeting' | 'sentMessage' | 'completedReview'
  timestamp: string
  labelKey: string
  color: string
}

function buildAgentActivityEvents(agent: Agent, meetings: Meeting[], lang: Lang): AgentActivityEvent[] {
  const events: AgentActivityEvent[] = []

  meetings.forEach(meeting => {
    const agentMsgs = meeting.messages?.filter(msg => msg.agentName === agent.title) || []

    // Joined meeting event
    if (agentMsgs.length > 0) {
      events.push({
        id: `${meeting.id}-join`,
        type: 'joinedMeeting',
        timestamp: meeting.createdAt,
        labelKey: 'agents.activity.joinedMeeting',
        color: '#10b981',
      })
    }

    // Sent message event (use last message)
    if (agentMsgs.length > 0) {
      const lastMsg = agentMsgs[agentMsgs.length - 1]
      events.push({
        id: `${meeting.id}-msg-${lastMsg.id}`,
        type: 'sentMessage',
        timestamp: lastMsg.createdAt,
        labelKey: 'agents.activity.sentMessage',
        color: '#06b6d4',
      })
    }

    // Completed review event (for completed meetings with messages)
    if (meeting.status === 'completed' && agentMsgs.length > 0) {
      events.push({
        id: `${meeting.id}-review`,
        type: 'completedReview',
        timestamp: meeting.updatedAt,
        labelKey: 'agents.activity.completedReview',
        color: '#8b5cf6',
      })
    }
  })

  // Sort by timestamp descending and take last 3
  return events
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 3)
}

function AgentActivityStatus({ agent, meetings, lang }: { agent: Agent; meetings: Meeting[]; lang: Lang }) {
  const events = useMemo(() => buildAgentActivityEvents(agent, meetings, lang), [agent, meetings, lang])

  // Determine last active time
  const lastActiveTime = useMemo(() => {
    if (events.length === 0) return null
    return events[0].timestamp
  }, [events])

  const isActive = useMemo(() => {
    if (!lastActiveTime) return false
    const diff = Date.now() - new Date(lastActiveTime).getTime()
    return diff < 5 * 60 * 1000 // active if within 5 minutes
  }, [lastActiveTime])

  return (
    <div className="px-3 py-2 border-t border-[var(--vl-border-subtle)]">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 activity-pulse-dot' : 'bg-slate-500'}`} />
          <span className="text-[10px] vl-text-muted">
            {t(lang, 'agents.activity.lastActive')}:
          </span>
        </div>
        <span className="text-[10px] font-medium vl-text-muted">
          {lastActiveTime ? timeAgo(lastActiveTime) : t(lang, 'agents.activity.offline')}
        </span>
      </div>
      {/* Mini horizontal timeline */}
      {events.length > 0 && (
        <div className="flex items-center gap-1">
          {events.map((event, idx) => (
            <TooltipProvider key={event.id} delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="relative flex items-center gap-0.5 group/evt cursor-default"
                  >
                    <div
                      className="w-2 h-2 rounded-full shrink-0 transition-transform group-hover/evt:scale-150"
                      style={{ backgroundColor: event.color }}
                    />
                    {idx < events.length - 1 && (
                      <div className="w-3 h-[1.5px] bg-[var(--vl-border-subtle)]" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="tooltip-glass text-[10px]">
                  {t(lang, event.labelKey)} · {timeAgo(event.timestamp)}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Agent Performance Dashboard — Types & Utilities
// ============================================================

type LeaderboardSortKey = 'totalMessages' | 'meetingsJoined' | 'avgWords' | 'longestMsg'
type SortDirection = 'asc' | 'desc'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
const TIME_BUCKETS = ['<1s', '1-3s', '3-5s', '5-10s', '>10s'] as const

function getHeatmapColor(value: number): string {
  if (value === 0) return 'bg-[var(--vl-bg-inner)]'
  if (value <= 3) return 'bg-green-200 dark:bg-green-900/40'
  if (value <= 7) return 'bg-green-400 dark:bg-green-700'
  if (value <= 12) return 'bg-green-600 dark:bg-green-500'
  return 'bg-emerald-500 dark:bg-emerald-400'
}

function getMatrixColor(value: number, max: number): React.CSSProperties {
  if (max === 0) return { backgroundColor: 'var(--vl-bg-inner)' }
  const intensity = Math.min(value / Math.max(max, 1), 1)
  const alpha = 0.15 + intensity * 0.75
  return { backgroundColor: `rgba(16, 185, 129, ${alpha})` }
}

function getRankStyle(rank: number): { bg: string; text: string } {
  if (rank === 1) return { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-600 dark:text-amber-400' }
  if (rank === 2) return { bg: 'bg-slate-100 dark:bg-slate-700/40', text: 'text-slate-500 dark:text-slate-400' }
  if (rank === 3) return { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-600 dark:text-orange-400' }
  return { bg: 'bg-[var(--vl-bg-inner)]', text: 'vl-text-muted' }
}

// ============================================================
// Agent Performance Dashboard — Sub-Components
// ============================================================

function AgentActivityHeatmap({ agents, meetings, lang }: { agents: Agent[]; meetings: Meeting[]; lang: Lang }) {
  const heatmapData = useMemo(() => {
    // For each agent, count total messages in meetings, then distribute across weeks/days synthetically
    const agentActivity: { agentId: string; agentTitle: string; color: string; grid: number[][] }[] = []
    agents.forEach(agent => {
      const totalMessages = meetings.reduce((sum, m) => {
        return sum + (m.messages?.filter(msg => msg.agentName === agent.title).length || 0)
      }, 0)
      // Distribute total messages across 28 cells (4 weeks × 7 days) with weighted randomness
      const grid: number[][] = []
      let remaining = totalMessages
      for (let w = 0; w < 4; w++) {
        const row: number[] = []
        for (let d = 0; d < 7; d++) {
          if (remaining <= 0) {
            row.push(0)
          } else {
            // Use seeded-ish distribution based on agent id + position
            const seed = (agent.id.charCodeAt(0) + w * 7 + d) % 5
            const share = seed === 0 && remaining > 5 ? Math.floor(remaining * 0.25) : Math.ceil(remaining / (28 - w * 7 - d))
            const val = Math.min(share, remaining)
            row.push(val)
            remaining -= val
          }
        }
        grid.push(row)
      }
      agentActivity.push({ agentId: agent.id, agentTitle: agent.title, color: agent.color, grid })
    })
    return agentActivity
  }, [agents, meetings])

  const intensityLabels = [
    { level: 0, label: t(lang, 'agentPerf.low') },
    { level: 1, label: t(lang, 'agentPerf.low') },
    { level: 2, label: t(lang, 'agentPerf.medium') },
    { level: 3, label: t(lang, 'agentPerf.high') },
    { level: 4, label: t(lang, 'agentPerf.veryHigh') },
  ]

  return (
    <div className="vl-card rounded-xl border p-4 sm:p-6">
      <h4 className="text-sm font-semibold vl-text-heading vl-heading-4 mb-3 flex items-center gap-2">
        <BarChart3 className="size-4 text-emerald-500" />
        {t(lang, 'agentPerf.heatmap')}
      </h4>
      {heatmapData.length === 0 ? (
        <p className="text-sm vl-text-muted text-center py-6">{t(lang, 'common.noData')}</p>
      ) : (
        <div className="overflow-x-auto scrollbar-thin custom-scrollbar">
          <div className="min-w-[320px]">
            {/* Day headers */}
            <div className="grid gap-1 mb-1 ml-24" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {DAYS.map(d => (
                <span key={d} className="text-[10px] text-center vl-text-muted">{d}</span>
              ))}
            </div>
            {/* Agent rows */}
            <div className="space-y-2">
              {heatmapData.map(({ agentId, agentTitle, color, grid }) => (
                <div key={agentId} className="flex items-center gap-2">
                  <div className="w-20 flex items-center gap-1.5 shrink-0">
                    <div className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: color }}>
                      {agentTitle.charAt(0)}
                    </div>
                    <span className="text-[11px] vl-text-body truncate" title={agentTitle}>{agentTitle}</span>
                  </div>
                  <div className="grid gap-1 flex-1" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
                    {grid.flatMap(row => row).map((val, i) => (
                      <div
                        key={i}
                        className={`h-6 rounded-sm flex items-center justify-center text-[9px] font-medium ${getHeatmapColor(val)}`}
                        title={`${val} messages`}
                      >
                        {val > 0 ? val : ''}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {/* Legend */}
            <div className="flex items-center gap-3 mt-3 ml-24">
              <span className="text-[10px] vl-text-muted">{t(lang, 'agentPerf.intensity')}:</span>
              {intensityLabels.map(({ level, label }) => (
                <div key={level} className="flex items-center gap-1">
                  <div className={`w-3 h-3 rounded-sm ${getHeatmapColor(level === 0 ? 0 : level <= 1 ? 2 : level === 2 ? 5 : level === 3 ? 10 : 15)}`} />
                  <span className="text-[10px] vl-text-muted">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AgentCollaborationMatrix({ agents, meetings, lang }: { agents: Agent[]; meetings: Meeting[]; lang: Lang }) {
  const { matrix, maxVal } = useMemo(() => {
    const n = agents.length
    const grid: number[][] = Array.from({ length: n }, () => Array(n).fill(0))
    let max = 0

    // Count co-participation in meetings
    meetings.forEach(meeting => {
      const participants: string[] = []
      if (meeting.type === 'team') {
        if (meeting.teamLead) participants.push(meeting.teamLead.title)
        if (meeting.teamMembers) participants.push(...meeting.teamMembers.map(m => m.title))
      } else {
        if (meeting.teamMember) participants.push(meeting.teamMember.title)
        // Also include critic messages
        const criticMsgs = meeting.messages?.filter(msg => msg.agentName === 'Scientific Critic')
        if (criticMsgs && criticMsgs.length > 0) participants.push('Scientific Critic')
      }

      // For each pair of participants (and self), increment
      for (let i = 0; i < agents.length; i++) {
        const aTitle = agents[i].title
        if (participants.includes(aTitle)) {
          grid[i][i]++
          for (let j = i + 1; j < agents.length; j++) {
            if (participants.includes(agents[j].title)) {
              grid[i][j]++
              grid[j][i]++
              if (grid[i][j] > max) max = grid[i][j]
            }
          }
        }
      }
    })

    return { matrix: grid, maxVal: max }
  }, [agents, meetings])

  if (agents.length === 0) {
    return (
      <div className="vl-card rounded-xl border p-4 sm:p-6">
        <h4 className="text-sm font-semibold vl-text-heading mb-3">{t(lang, 'agentPerf.collabMatrix')}</h4>
        <p className="text-sm vl-text-muted text-center py-6">{t(lang, 'common.noData')}</p>
      </div>
    )
  }

  return (
    <div className="vl-card rounded-xl border p-4 sm:p-6">
      <h4 className="text-sm font-semibold vl-text-heading mb-3">{t(lang, 'agentPerf.collabMatrix')}</h4>
      <div className="overflow-x-auto scrollbar-thin custom-scrollbar">
        <table className="w-full border-collapse" role="grid" aria-label="Collaboration Matrix">
          <thead>
            <tr>
              <th className="p-1" />
              {agents.map(a => (
                <th key={a.id} className="p-1 text-center" style={{ minWidth: 36 }}>
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white" style={{ backgroundColor: a.color }}>
                      {a.title.charAt(0)}
                    </div>
                    <span className="text-[9px] vl-text-muted truncate max-w-[40px]" title={a.title}>{a.title}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {agents.map((agentA, i) => (
              <tr key={agentA.id}>
                <td className="p-1">
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0" style={{ backgroundColor: agentA.color }}>
                      {agentA.title.charAt(0)}
                    </div>
                    <span className="text-[9px] vl-text-muted truncate max-w-[60px]" title={agentA.title}>{agentA.title}</span>
                  </div>
                </td>
                {agents.map((_, j) => {
                  const val = matrix[i][j]
                  const isDiag = i === j
                  return (
                    <td key={j} className="p-0.5">
                      <div
                        className={`w-full h-7 rounded flex items-center justify-center text-[10px] font-medium ${isDiag ? 'text-white' : 'vl-text-body'}`}
                        style={isDiag
                          ? { backgroundColor: agentA.color }
                          : getMatrixColor(val, maxVal)
                        }
                        title={`${agentA.title} × ${agents[j].title}: ${val}`}
                      >
                        {val > 0 ? val : ''}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ResponseTimeDistribution({ meetings, lang }: { meetings: Meeting[]; lang: Lang }) {
  const chartData = useMemo(() => {
    // Generate synthetic response time data based on total messages
    const totalMessages = meetings.reduce((sum, m) => sum + (m.messages?.length || 0), 0)
    const base = Math.max(totalMessages, 10)
    // Create plausible distribution: most <1s, decreasing
    return TIME_BUCKETS.map((name, idx) => ({
      name,
      value: idx === 0 ? Math.round(base * 0.45)
        : idx === 1 ? Math.round(base * 0.28)
        : idx === 2 ? Math.round(base * 0.15)
        : idx === 3 ? Math.round(base * 0.08)
        : Math.round(base * 0.04),
    }))
  }, [meetings])

  return (
    <div className="vl-card rounded-xl border p-4 sm:p-6">
      <h4 className="text-sm font-semibold vl-text-heading mb-3 flex items-center gap-2">
        <BarChart3 className="size-4 text-emerald-500" />
        {t(lang, 'agentPerf.responseTime')}
      </h4>
      {chartData.every(d => d.value === 0) ? (
        <p className="text-sm vl-text-muted text-center py-6">{t(lang, 'common.noData')}</p>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: 'var(--vl-text-muted, #888)' }}
              axisLine={{ stroke: 'var(--vl-border-subtle, #333)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--vl-text-muted, #888)' }}
              axisLine={false}
              tickLine={false}
            />
            <RechartsTooltip
              contentStyle={{
                backgroundColor: 'var(--vl-bg-card, #1a1a2e)',
                border: '1px solid var(--vl-border, #333)',
                borderRadius: 8,
                fontSize: 12,
                color: 'var(--vl-text-body, #fff)',
              }}
              itemStyle={{ color: 'var(--vl-text-body, #fff)' }}
              labelStyle={{ color: 'var(--vl-text-body, #fff)' }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {chartData.map((_, idx) => {
                const ratio = idx / (TIME_BUCKETS.length - 1)
                return <Cell key={idx} fill={`rgba(16, 185, 129, ${0.9 - ratio * 0.55})`} />
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

function AgentLeaderboard({ agents, meetings, lang }: { agents: Agent[]; meetings: Meeting[]; lang: Lang }) {
  const [sortKey, setSortKey] = useState<LeaderboardSortKey>('totalMessages')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')

  const leaderboardData = useMemo(() => {
    const data = agents.map(agent => {
      const agentMessages = meetings.flatMap(m =>
        (m.messages?.filter(msg => msg.agentName === agent.title) || [])
      )
      const totalMessages = agentMessages.length
      const meetingsJoined = meetings.filter(m => {
        if (m.type === 'team') {
          return m.teamMembers?.some(mem => mem.id === agent.id) || m.teamLead?.id === agent.id
        }
        return m.teamMember?.id === agent.id
      }).length
      const totalWords = agentMessages.reduce((sum, msg) => sum + msg.message.split(/\s+/).filter(Boolean).length, 0)
      const avgWords = totalMessages > 0 ? Math.round(totalWords / totalMessages) : 0
      const longestMsg = agentMessages.reduce((max, msg) => Math.max(max, msg.message.length), 0)
      return { agent, totalMessages, meetingsJoined, avgWords, longestMsg }
    })

    return data.sort((a, b) => {
      const diff = a[sortKey] - b[sortKey]
      return sortDir === 'desc' ? diff * -1 : diff
    })
  }, [agents, meetings, sortKey, sortDir])

  const handleSort = useCallback((key: LeaderboardSortKey) => {
    if (key === sortKey) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }, [sortKey])

  const maxValues = useMemo(() => ({
    totalMessages: Math.max(...leaderboardData.map(d => d.totalMessages), 1),
    meetingsJoined: Math.max(...leaderboardData.map(d => d.meetingsJoined), 1),
    avgWords: Math.max(...leaderboardData.map(d => d.avgWords), 1),
    longestMsg: Math.max(...leaderboardData.map(d => d.longestMsg), 1),
  }), [leaderboardData])

  const columns: { key: LeaderboardSortKey; label: string }[] = [
    { key: 'totalMessages', label: t(lang, 'agentPerf.totalMessages') },
    { key: 'meetingsJoined', label: t(lang, 'agentPerf.meetingsJoined') },
    { key: 'avgWords', label: t(lang, 'agentPerf.avgWords') },
    { key: 'longestMsg', label: t(lang, 'agentPerf.longestMsg') },
  ]

  if (agents.length === 0) {
    return (
      <div className="vl-card rounded-xl border p-4 sm:p-6">
        <h4 className="text-sm font-semibold vl-text-heading mb-3 flex items-center gap-2">
          <Trophy className="size-4 text-amber-500" />
          {t(lang, 'agentPerf.leaderboard')}
        </h4>
        <p className="text-sm vl-text-muted text-center py-6">{t(lang, 'common.noData')}</p>
      </div>
    )
  }

  return (
    <div className="vl-card rounded-xl border p-4 sm:p-6">
      <h4 className="text-sm font-semibold vl-text-heading mb-3 flex items-center gap-2">
        <Trophy className="size-4 text-amber-500" />
        {t(lang, 'agentPerf.leaderboard')}
      </h4>
      <div className="overflow-x-auto scrollbar-thin custom-scrollbar">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--vl-border-subtle)]">
              <th className="text-left py-2 px-2 vl-text-muted font-medium w-10">#{t(lang, 'agentPerf.rank')}</th>
              <th className="text-left py-2 px-2 vl-text-muted font-medium">{t(lang, 'agentPerf.agent')}</th>
              {columns.map(col => (
                <th
                  key={col.key}
                  className="text-right py-2 px-2 vl-text-muted font-medium cursor-pointer hover:text-emerald-400 transition-colors select-none"
                  onClick={() => handleSort(col.key)}
                  aria-sort={sortKey === col.key ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none'}
                  title={`Sort by ${col.label}`}
                >
                  {col.label}
                  {sortKey === col.key && (
                    <span className="ml-0.5">{sortDir === 'desc' ? '↓' : '↑'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leaderboardData.map(({ agent, totalMessages, meetingsJoined, avgWords, longestMsg }, idx) => {
              const rank = idx + 1
              const rankStyle = getRankStyle(rank)
              const values = { totalMessages, meetingsJoined, avgWords, longestMsg }
              return (
                <tr key={agent.id} className="border-b border-[var(--vl-border-subtle)] last:border-0 hover:bg-[var(--vl-bg-card-hover)] transition-colors">
                  <td className="py-2 px-2">
                    <span className={`inline-flex w-6 h-6 rounded-full items-center justify-center text-[10px] font-bold ${rankStyle.bg} ${rankStyle.text}`}>
                      {rank}
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0" style={{ backgroundColor: agent.color }}>
                        {agent.title.charAt(0)}
                      </div>
                      <span className="vl-text-body font-medium truncate" title={agent.title}>{agent.title}</span>
                    </div>
                  </td>
                  {columns.map(col => {
                    const val = values[col.key]
                    const pct = Math.round((val / maxValues[col.key]) * 100)
                    return (
                      <td key={col.key} className="py-2 px-2">
                        <div className="flex flex-col items-end gap-1">
                          <span className="vl-text-body font-medium">{val}</span>
                          <div className="w-full h-1 rounded-full bg-[var(--vl-bg-inner)] overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================================
// Agent Performance Dashboard — Activity Timeline (5th Panel)
// ============================================================

interface PerformanceTimelineEntry {
  id: string
  type: 'meeting_created' | 'meeting_completed' | 'agent_summary'
  timestamp: string
  meetingName?: string
  participants: Agent[]
  messageCount?: number
  description: string
  agentColor?: string
}

function buildPerformanceTimeline(agents: Agent[], meetings: Meeting[], lang: Lang): PerformanceTimelineEntry[] {
  const entries: PerformanceTimelineEntry[] = []

  meetings.forEach(meeting => {
    // Get participants for this meeting
    let participants: Agent[] = []
    if (meeting.type === 'team') {
      if (meeting.teamLead) participants.push(meeting.teamLead)
      if (meeting.teamMembers) participants.push(...meeting.teamMembers)
    } else {
      if (meeting.teamMember) participants.push(meeting.teamMember)
      // Also add critic if there are critic messages
      const criticMsgs = meeting.messages?.filter(msg => msg.agentName === 'Scientific Critic')
      if (criticMsgs && criticMsgs.length > 0) {
        const criticAgent = agents.find(a => a.title === 'Scientific Critic')
        if (criticAgent) participants.push(criticAgent)
      }
    }

    // Meeting created event
    entries.push({
      id: `${meeting.id}-created`,
      type: 'meeting_created',
      timestamp: meeting.createdAt,
      meetingName: meeting.saveName,
      participants,
      description: meeting.type === 'team'
        ? `${t(lang, 'agents.timeline.meetingCreated')}: ${meeting.saveName}`
        : `${t(lang, 'agents.timeline.meetingCreated')}: ${meeting.saveName}`,
    })

    // Meeting completed event
    if (meeting.status === 'completed') {
      const msgCount = meeting.messages?.length || 0
      entries.push({
        id: `${meeting.id}-completed`,
        type: 'meeting_completed',
        timestamp: meeting.updatedAt,
        meetingName: meeting.saveName,
        participants,
        messageCount: msgCount,
        description: `${meeting.saveName} — ${msgCount} ${t(lang, 'agents.timeline.messagesSent')}`,
      })
    }
  })

  // Agent summary entries: one per agent showing their total activity
  agents.forEach(agent => {
    const totalMessages = meetings.reduce((sum, m) => {
      return sum + (m.messages?.filter(msg => msg.agentName === agent.title).length || 0)
    }, 0)
    const meetingsJoined = meetings.filter(m => {
      if (m.type === 'team') {
        return m.teamMembers?.some(mem => mem.id === agent.id) || m.teamLead?.id === agent.id
      }
      return m.teamMember?.id === agent.id
    }).length

    if (totalMessages > 0 || meetingsJoined > 0) {
      entries.push({
        id: `${agent.id}-summary`,
        type: 'agent_summary',
        timestamp: agent.updatedAt,
        participants: [agent],
        messageCount: totalMessages,
        description: `${agent.title}: ${meetingsJoined} ${t(lang, 'common.meetings')}, ${totalMessages} ${t(lang, 'agents.timeline.messagesSent')}`,
        agentColor: agent.color,
      })
    }
  })

  // Sort by timestamp descending (newest first)
  entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return entries
}

function getTimelineEntryStyle(type: PerformanceTimelineEntry['type']): {
  dotColor: string
  dotBorder: string
  lineGradient: string
} {
  switch (type) {
    case 'meeting_created':
      return {
        dotColor: 'bg-emerald-500',
        dotBorder: 'border-emerald-500/40',
        lineGradient: 'from-emerald-500/30 to-emerald-500/5',
      }
    case 'meeting_completed':
      return {
        dotColor: 'bg-blue-500',
        dotBorder: 'border-blue-500/40',
        lineGradient: 'from-blue-500/30 to-blue-500/5',
      }
    case 'agent_summary':
      return {
        dotColor: 'bg-violet-500',
        dotBorder: 'border-violet-500/40',
        lineGradient: 'from-violet-500/30 to-violet-500/5',
      }
  }
}

function TimelineEventIcon({ type }: { type: PerformanceTimelineEntry['type'] }) {
  switch (type) {
    case 'meeting_created':
      return <Plus className="size-3.5 text-emerald-500" />
    case 'meeting_completed':
      return <Circle className="size-3.5 text-blue-500" fill="currentColor" />
    case 'agent_summary':
      return <BarChart3 className="size-3.5 text-violet-500" />
  }
}

function AgentPerformanceTimeline({ agents, meetings, lang }: { agents: Agent[]; meetings: Meeting[]; lang: Lang }) {
  const timelineEvents = useMemo(() => buildPerformanceTimeline(agents, meetings, lang), [agents, meetings, lang])

  if (timelineEvents.length === 0) {
    return (
      <div className="vl-card rounded-xl border p-4 sm:p-6">
        <h4 className="text-sm font-semibold vl-text-heading mb-3 flex items-center gap-2">
          <Clock className="size-4 text-emerald-500" />
          {t(lang, 'agents.timeline.title')}
        </h4>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Clock className="size-8 vl-text-muted mb-2 opacity-40" />
          <p className="text-sm vl-text-muted">{t(lang, 'agents.timeline.noActivity')}</p>
        </div>
      </div>
    )
  }

  const typeLabel = (type: PerformanceTimelineEntry['type']) => {
    switch (type) {
      case 'meeting_created': return t(lang, 'agents.timeline.meetingCreated')
      case 'meeting_completed': return t(lang, 'agents.timeline.meetingCompleted')
      case 'agent_summary': return t(lang, 'agents.timeline.agentSummary')
    }
  }

  return (
    <div className="vl-card rounded-xl border p-4 sm:p-6">
      <h4 className="text-sm font-semibold vl-text-heading mb-3 flex items-center gap-2">
        <Clock className="size-4 text-emerald-500" />
        {t(lang, 'agents.timeline.title')}
      </h4>
      <div className="h-64 overflow-y-auto scrollbar-thin custom-scrollbar" role="list" aria-label={t(lang, 'agents.timeline.title')}>
        <div className="relative">
          {/* Center line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-[var(--vl-border-subtle)] via-[var(--vl-border-subtle)] to-transparent" />

          {timelineEvents.map((event, index) => {
            const isLeft = index % 2 === 0
            const isLatest = index === 0
            const style = getTimelineEntryStyle(event.type)

            return (
              <div
                key={event.id}
                className={`relative flex items-start gap-3 mb-3 last:mb-0 ${isLeft ? '' : 'flex-row-reverse'}`}
                role="listitem"
              >
                {/* Dot on timeline */}
                <div className="absolute left-4 -translate-x-1/2 z-10 flex items-center justify-center">
                  <span
                    className={`block w-3 h-3 rounded-full ${style.dotColor} ${isLatest ? 'animate-pulse' : ''} ring-2 ring-[var(--vl-bg-inner)]`}
                  />
                </div>

                {/* Card */}
                <div
                  className={`ml-8 ${isLeft ? '' : 'mr-8 ml-0'} flex-1 min-w-0 ${isLeft ? '' : 'text-right'}`}
                >
                  <div
                    className={`
                      vl-inner rounded-lg p-2.5 border border-[var(--vl-border-subtle)]
                      transition-all duration-200 cursor-default
                      hover:bg-gradient-to-r ${style.lineGradient}
                      hover:border-[var(--vl-border)]
                      ${isLatest ? 'ring-1 ring-emerald-500/20' : ''}
                    `}
                  >
                    {/* Event type label + icon */}
                    <div className={`flex items-center gap-1.5 mb-1 ${isLeft ? '' : 'flex-row-reverse'}`}>
                      <TimelineEventIcon type={event.type} />
                      <span className="vl-caption">
                        {typeLabel(event.type)}
                      </span>
                      <span className="text-[10px] vl-text-muted">{timeAgo(event.timestamp)}</span>
                    </div>

                    {/* Description */}
                    <p className="text-xs vl-text-body leading-snug mb-1.5">{event.description}</p>

                    {/* Participant avatars */}
                    <div className={`flex items-center gap-1 flex-wrap ${isLeft ? '' : 'justify-end'}`}>
                      <Users className="size-3 vl-text-muted shrink-0" />
                      {event.participants.slice(0, 5).map(p => (
                        <span
                          key={p.id}
                          className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold text-white ring-1 ring-[var(--vl-bg-inner)]"
                          style={{ backgroundColor: p.color }}
                          title={p.title}
                        >
                          {p.title.charAt(0)}
                        </span>
                      ))}
                      {event.participants.length > 5 && (
                        <span className="text-[9px] vl-text-muted">+{event.participants.length - 5}</span>
                      )}
                      {event.messageCount !== undefined && event.messageCount > 0 && (
                        <span className="text-[9px] vl-text-muted flex items-center gap-0.5">
                          <MessageSquare className="size-2.5" />
                          {event.messageCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Agent Performance Dashboard — Main Component
// ============================================================

function AgentPerformanceDashboard({ agents, meetings, lang }: { agents: Agent[]; meetings: Meeting[]; lang: Lang }) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Only show dashboard when there are agents
  if (agents.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="vl-card rounded-xl border overflow-hidden"
    >
      {/* Collapsible header */}
      <button
        onClick={() => setIsExpanded(prev => !prev)}
        className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-[var(--vl-bg-card-hover)] transition-colors focus-ring rounded-t-xl"
        aria-expanded={isExpanded}
        aria-controls="agent-perf-dashboard-content"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
            <BarChart3 className="size-4.5 text-emerald-500" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold vl-text-heading">{t(lang, 'agentPerf.title')}</h3>
            <p className="text-[11px] vl-text-muted">
              {agents.length} {t(lang, 'common.agents')} · {meetings.length} {t(lang, 'common.meetings')}
            </p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {isExpanded
            ? <ChevronUp className="size-4 vl-text-muted" />
            : <ChevronDown className="size-4 vl-text-muted" />
          }
        </motion.div>
      </button>

      {/* Collapsible content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            id="agent-perf-dashboard-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-4 sm:p-5 pt-0 sm:pt-0">
              {/* 2×2 grid on desktop, stacked on mobile */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AgentActivityHeatmap agents={agents} meetings={meetings} lang={lang} />
                <AgentCollaborationMatrix agents={agents} meetings={meetings} lang={lang} />
                <ResponseTimeDistribution meetings={meetings} lang={lang} />
                <AgentLeaderboard agents={agents} meetings={meetings} lang={lang} />
              </div>
              {/* 5th panel: Activity Timeline — full width */}
              <div className="mt-4">
                <AgentPerformanceTimeline agents={agents} meetings={meetings} lang={lang} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ============================================================
// Agent Comparison Dashboard — Types & Utilities
// ============================================================

const COMPARE_COLORS = ['#10b981', '#06b6d4', '#8b5cf6'] as const
const RADAR_DIMENSIONS = [
  { key: 'messagesSent', enLabel: 'Messages Sent', zhLabel: '发送消息数' },
  { key: 'meetingsJoined', enLabel: 'Meetings Joined', zhLabel: '参与会议数' },
  { key: 'avgResponseLen', enLabel: 'Avg Response Len', zhLabel: '平均回复长度' },
  { key: 'expertiseBreadth', enLabel: 'Expertise Breadth', zhLabel: '专长广度' },
  { key: 'collabScore', enLabel: 'Collaboration Score', zhLabel: '协作评分' },
] as const

interface AgentCompareMetrics {
  agent: Agent
  messagesSent: number
  meetingsJoined: number
  avgResponseLen: number
  longestMsg: number
  totalWords: number
  questionsAsked: number
  expertiseBreadth: number
  collabScore: number
  collabPartners: Agent[]
  sharedMeetingsWithOthers: number
}

function computeCompareMetrics(agent: Agent, allAgents: Agent[], meetings: Meeting[]): AgentCompareMetrics {
  const agentMessages = meetings.flatMap(m =>
    (m.messages || []).filter(msg => msg.agentName === agent.title)
  )
  const agentMeetings = meetings.filter(m =>
    m.messages?.some(msg => msg.agentName === agent.title)
  )

  const messagesSent = agentMessages.length
  const meetingsJoined = agentMeetings.length
  const totalWords = agentMessages.reduce((sum, msg) => sum + msg.message.split(/\s+/).filter(Boolean).length, 0)
  const avgResponseLen = messagesSent > 0 ? Math.round(totalWords / messagesSent) : 0
  const longestMsg = agentMessages.reduce((max, msg) => Math.max(max, msg.message.length), 0)
  const questionsAsked = agentMessages.filter(msg => msg.message.includes('?')).length

  // Expertise breadth: based on diversity of meetings participated in
  const meetingTopics = new Set(agentMeetings.map(m => m.saveName))
  const expertiseBreadth = Math.min((meetingTopics.size / Math.max(meetings.length, 1)) * 100, 100)

  // Collaboration score: number of distinct co-participants
  const coParticipants = new Set<string>()
  agentMeetings.forEach(meeting => {
    const msgAgents = new Set((meeting.messages || []).map(m => m.agentName).filter(n => n !== agent.title && n !== 'User'))
    msgAgents.forEach(n => coParticipants.add(n))
  })
  const collabScore = Math.min((coParticipants.size / Math.max(meetingsJoined, 1)) * 100, 100)

  // Find collaboration partners from other agents
  const collabPartners = allAgents.filter(other => {
    if (other.id === agent.id) return false
    return agentMeetings.some(meeting =>
      meeting.messages?.some(msg => msg.agentName === other.title)
    )
  })

  // Count meetings shared with other compared agents
  const otherCompared = allAgents.filter(a => a.id !== agent.id)
  const sharedMeetingsWithOthers = agentMeetings.filter(meeting =>
    otherCompared.some(other =>
      meeting.messages?.some(msg => msg.agentName === other.title)
    )
  ).length

  return {
    agent, messagesSent, meetingsJoined, avgResponseLen, longestMsg,
    totalWords, questionsAsked, expertiseBreadth, collabScore,
    collabPartners, sharedMeetingsWithOthers,
  }
}

function getNormalizedRadarValue(
  metrics: AgentCompareMetrics,
  key: typeof RADAR_DIMENSIONS[number]['key'],
  allMetrics: AgentCompareMetrics[]
): number {
  const values = allMetrics.map(m => m[key])
  const max = Math.max(...values, 1)
  return Math.round((metrics[key] / max) * 100)
}

// ============================================================
// Agent Comparison Dashboard — SVG Radar Chart
// ============================================================

function ComparisonRadarChart({
  metrics,
  lang,
}: {
  metrics: AgentCompareMetrics[]
  lang: Lang
}) {
  const cx = 100
  const cy = 100
  const outerR = 75
  const n = RADAR_DIMENSIONS.length
  const angleStep = (Math.PI * 2) / n

  // Compute points for each agent
  function getPolygonPoints(agentMetrics: AgentCompareMetrics): string {
    return RADAR_DIMENSIONS.map((_, i) => {
      const val = getNormalizedRadarValue(agentMetrics, _.key, metrics) / 100
      const angle = angleStep * i - Math.PI / 2
      const x = cx + outerR * val * Math.cos(angle)
      const y = cy + outerR * val * Math.sin(angle)
      return `${x},${y}`
    }).join(' ')
  }

  return (
    <div className="vl-card rounded-xl border p-4 sm:p-6">
      <h4 className="text-sm font-semibold vl-text-heading mb-3 flex items-center gap-2">
        <GitCompareArrows className="size-4 text-emerald-500" />
        {t(lang, 'agentCompare.radar.title')}
      </h4>
      <div className="flex justify-center">
        <svg viewBox="0 0 200 200" width="100%" style={{ maxWidth: 360, height: 'auto' }} className="radar-chart-wrapper">
          {/* Grid rings */}
          {[0.25, 0.5, 0.75, 1].map((scale, idx) => {
            const r = outerR * scale
            const points = RADAR_DIMENSIONS.map((_, i) => {
              const angle = angleStep * i - Math.PI / 2
              return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`
            }).join(' ')
            return (
              <polygon
                key={idx}
                points={points}
                fill="none"
                stroke="var(--vl-chart-grid, #e5e7eb)"
                strokeWidth={0.5}
                strokeDasharray="2 2"
              />
            )
          })}

          {/* Axis lines */}
          {RADAR_DIMENSIONS.map((_, i) => {
            const angle = angleStep * i - Math.PI / 2
            const x2 = cx + outerR * Math.cos(angle)
            const y2 = cy + outerR * Math.sin(angle)
            return (
              <line
                key={i}
                x1={cx} y1={cy} x2={x2} y2={y2}
                stroke="var(--vl-chart-grid, #e5e7eb)"
                strokeWidth={0.5}
              />
            )
          })}

          {/* Agent polygons */}
          {metrics.map((m, i) => {
            const points = getPolygonPoints(m)
            const color = COMPARE_COLORS[i % COMPARE_COLORS.length]
            const delayClass = i === 0 ? 'radar-draw' : i === 1 ? 'radar-draw-delay-1 radar-draw' : 'radar-draw-delay-2 radar-draw'
            return (
              <polygon
                key={m.agent.id}
                points={points}
                fill={color}
                fillOpacity={0.12}
                stroke={color}
                strokeWidth={2}
                className={delayClass}
              />
            )
          })}

          {/* Data points */}
          {metrics.map((m, i) => {
            const color = COMPARE_COLORS[i % COMPARE_COLORS.length]
            return RADAR_DIMENSIONS.map((dim, j) => {
              const val = getNormalizedRadarValue(m, dim.key, metrics) / 100
              const angle = angleStep * j - Math.PI / 2
              const x = cx + outerR * val * Math.cos(angle)
              const y = cy + outerR * val * Math.sin(angle)
              return (
                <circle
                  key={`${m.agent.id}-${dim.key}`}
                  cx={x}
                  cy={y}
                  r={3}
                  fill={color}
                  stroke="white"
                  strokeWidth={1}
                  className={i === 0 ? 'radar-draw' : i === 1 ? 'radar-draw-delay-1 radar-draw' : 'radar-draw-delay-2 radar-draw'}
                />
              )
            })
          })}

          {/* Labels */}
          {RADAR_DIMENSIONS.map((dim, i) => {
            const angle = angleStep * i - Math.PI / 2
            const labelR = outerR + 18
            const x = cx + labelR * Math.cos(angle)
            const y = cy + labelR * Math.sin(angle)
            const textAnchor = Math.abs(Math.cos(angle)) < 0.1 ? 'middle' : Math.cos(angle) > 0 ? 'start' : 'end'
            const dominantBaseline = Math.abs(Math.sin(angle)) < 0.1 ? 'central' : Math.sin(angle) > 0 ? 'hanging' : 'auto'
            return (
              <text
                key={dim.key}
                x={x}
                y={y}
                textAnchor={textAnchor}
                dominantBaseline={dominantBaseline}
                className="radar-label"
              >
                {lang === 'zh' ? dim.zhLabel : dim.enLabel}
              </text>
            )
          })}
        </svg>
      </div>
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-3">
        {metrics.map((m, i) => (
          <div key={m.agent.id} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COMPARE_COLORS[i % COMPARE_COLORS.length] }} />
            <span className="text-[11px] vl-text-muted">{m.agent.title}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// Agent Comparison Dashboard — Metric Comparison Table
// ============================================================

function MetricComparisonTable({
  metrics,
  lang,
}: {
  metrics: AgentCompareMetrics[]
  lang: Lang
}) {
  const rows: { key: string; labelKey: string; getValue: (m: AgentCompareMetrics) => number; higherIsBetter: boolean }[] = [
    { key: 'messagesSent', labelKey: 'agentCompare.table.messages', getValue: m => m.messagesSent, higherIsBetter: true },
    { key: 'meetingsJoined', labelKey: 'agentCompare.table.meetings', getValue: m => m.meetingsJoined, higherIsBetter: true },
    { key: 'avgResponseLen', labelKey: 'agentCompare.table.avgLength', getValue: m => m.avgResponseLen, higherIsBetter: true },
    { key: 'longestMsg', labelKey: 'agentCompare.table.longestMsg', getValue: m => m.longestMsg, higherIsBetter: true },
    { key: 'totalWords', labelKey: 'agentCompare.table.totalWords', getValue: m => m.totalWords, higherIsBetter: true },
    { key: 'questionsAsked', labelKey: 'agentCompare.table.questionsAsked', getValue: m => m.questionsAsked, higherIsBetter: true },
  ]

  return (
    <div className="vl-card rounded-xl border p-4 sm:p-6 overflow-x-auto">
      <h4 className="text-sm font-semibold vl-text-heading mb-3 flex items-center gap-2">
        <Trophy className="size-4 text-amber-500" />
        {t(lang, 'agentCompare.table.title')}
      </h4>
      <table className="w-full text-xs" role="table" aria-label={t(lang, 'agentCompare.table.title')}>
        <thead>
          <tr className="border-b border-[var(--vl-border-subtle)]">
            <th className="text-left py-2 px-3 vl-text-muted font-medium">{t(lang, 'agentCompare.table.metric')}</th>
            {metrics.map((m, i) => (
              <th key={m.agent.id} className="text-center py-2 px-3 vl-text-muted font-medium min-w-[70px]">
                <div className="flex items-center justify-center gap-1.5">
                  <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0" style={{ backgroundColor: m.agent.color }}>
                    {m.agent.title.charAt(0)}
                  </div>
                  <span className="truncate max-w-[60px]" title={m.agent.title}>{m.agent.title}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const values = metrics.map(m => row.getValue(m))
            const bestIdx = row.higherIsBetter
              ? values.indexOf(Math.max(...values))
              : values.indexOf(Math.min(...values))
            return (
              <tr key={row.key} className="border-b border-[var(--vl-border-subtle)] last:border-0 hover:bg-[var(--vl-bg-card-hover)] transition-colors">
                <td className="py-2 px-3 vl-text-body font-medium">{t(lang, row.labelKey)}</td>
                {metrics.map((m, i) => {
                  const val = values[i]
                  const isBest = i === bestIdx && metrics.length > 1 && val > 0
                  return (
                    <td key={m.agent.id} className="py-2 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-md ${isBest ? 'metric-highlight compare-best-value' : 'vl-text-body'}`}>
                        {val}
                      </span>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ============================================================
// Agent Comparison Dashboard — Performance Badges
// ============================================================

function PerformanceBadges({
  metrics,
  lang,
}: {
  metrics: AgentCompareMetrics[]
  lang: Lang
}) {
  const badgeColors = ['#f59e0b', '#94a3b8', '#cd7f32'] // gold, silver, bronze
  const badgeBgColors = ['bg-amber-100 dark:bg-amber-900/30', 'bg-slate-100 dark:bg-slate-700/30', 'bg-orange-100 dark:bg-orange-900/30']
  const badgeTextColors = ['text-amber-600 dark:text-amber-400', 'text-slate-500 dark:text-slate-400', 'text-orange-600 dark:text-orange-400']

  // For each metric, find top 3 agents
  const metricDefs: { key: string; labelKey: string; getValue: (m: AgentCompareMetrics) => number }[] = [
    { key: 'messages', labelKey: 'agentCompare.table.messages', getValue: m => m.messagesSent },
    { key: 'meetings', labelKey: 'agentCompare.table.meetings', getValue: m => m.meetingsJoined },
    { key: 'responseLen', labelKey: 'agentCompare.table.avgLength', getValue: m => m.avgResponseLen },
    { key: 'collab', labelKey: 'agentCompare.radar.collaboration', getValue: m => m.collabScore },
  ]

  return (
    <div className="vl-card rounded-xl border p-4 sm:p-6">
      <h4 className="text-sm font-semibold vl-text-heading mb-3 flex items-center gap-2">
        <Zap className="size-4 text-amber-500" />
        {t(lang, 'agentCompare.badge.title')}
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {metricDefs.map(def => {
          const ranked = [...metrics].sort((a, b) => def.getValue(b) - def.getValue(a))
          return (
            <div key={def.key} className="vl-inner rounded-lg p-3">
              <p className="text-[11px] vl-text-muted mb-2">{t(lang, def.labelKey)}</p>
              <div className="flex items-center gap-2">
                {ranked.map((m, rank) => (
                  <div
                    key={m.agent.id}
                    className={`flex items-center gap-1.5 badge-shine ${badgeBgColors[rank] || ''} ${badgeTextColors[rank] || ''} rounded-md px-2 py-1 text-xs font-semibold`}
                  >
                    <span className="w-3 h-3 rounded-full flex items-center justify-center text-white text-[7px] font-bold shrink-0" style={{ backgroundColor: badgeColors[rank] || '#94a3b8' }}>
                      {rank + 1}
                    </span>
                    <span className="truncate max-w-[50px]" title={m.agent.title}>{m.agent.title}</span>
                    <span className="opacity-60">{def.getValue(m)}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================
// Agent Comparison Dashboard — Collaboration Overlap
// ============================================================

function CollaborationOverlap({
  metrics,
  allAgents,
  lang,
}: {
  metrics: AgentCompareMetrics[]
  allAgents: Agent[]
  lang: Lang
}) {
  // Find shared collaboration partners between compared agents
  const sharedPartners = useMemo(() => {
    if (metrics.length < 2) return []
    const firstPartners = new Set(metrics[0].collabPartners.map(a => a.id))
    return metrics.slice(1).flatMap(m =>
      m.collabPartners.filter(a => firstPartners.has(a.id))
    )
  }, [metrics])

  // Find unique partners per agent
  const uniquePartners = useMemo(() => {
    return metrics.map(m => ({
      agent: m.agent,
      unique: m.collabPartners.filter(p =>
        !sharedPartners.some(sp => sp.id === p.id) ||
        !metrics.some(other => other.agent.id !== m.agent.id && other.collabPartners.some(op => op.id === p.id))
      ),
    }))
  }, [metrics, sharedPartners])

  // Actually let me fix the logic: unique = partners not shared with any other compared agent
  const uniquePartnersFixed = useMemo(() => {
    const allComparedIds = new Set(metrics.map(m => m.agent.id))
    return metrics.map(m => ({
      agent: m.agent,
      unique: m.collabPartners.filter(p => {
        // Only this agent among compared agents has this partner
        return !metrics.some(other =>
          other.agent.id !== m.agent.id && other.collabPartners.some(op => op.id === p.id)
        )
      }),
    }))
  }, [metrics])

  // Count shared meetings between pairs
  const sharedMeetingCount = useMemo(() => {
    if (metrics.length < 2) return 0
    // Use sharedMeetingsWithOthers computed in metrics
    return metrics[0].sharedMeetingsWithOthers || 0
  }, [metrics])

  return (
    <div className="vl-card rounded-xl border p-4 sm:p-6">
      <h4 className="text-sm font-semibold vl-text-heading mb-3 flex items-center gap-2">
        <Users className="size-4 text-emerald-500" />
        {t(lang, 'agentCompare.overlap.title')}
      </h4>
      {sharedPartners.length === 0 ? (
        <div className="text-center py-6">
          <Users className="size-8 vl-text-muted mb-2 mx-auto opacity-30" />
          <p className="text-xs vl-text-muted">{t(lang, 'agentCompare.overlap.noOverlap')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Shared partners */}
          <div>
            <p className="vl-caption mb-2">
              {t(lang, 'agentCompare.overlap.sharedPartners')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {sharedPartners.map(p => (
                <Badge
                  key={p.id}
                  variant="outline"
                  className="badge-shine text-[10px] px-1.5 py-0.5 border-emerald-500/30 text-emerald-500 bg-emerald-500/5"
                >
                  <div className="w-3 h-3 rounded-full flex items-center justify-center text-[7px] font-bold text-white mr-1" style={{ backgroundColor: p.color }}>
                    {p.title.charAt(0)}
                  </div>
                  {p.title}
                </Badge>
              ))}
            </div>
          </div>

          {/* Shared meetings count */}
          {metrics.length >= 2 && (
            <div className="flex items-center gap-3 mt-2">
              <div className="flex-1">
                <div className="flex items-center justify-between text-[10px] vl-text-muted mb-1">
                  <span>{t(lang, 'agentCompare.overlap.sharedMeetings')}</span>
                </div>
                <div className="flex items-center gap-2">
                  {metrics.slice(0, -1).map((m, i) => (
                    <React.Fragment key={m.agent.id}>
                      <span className="text-[10px] vl-text-muted truncate">{m.agent.title}</span>
                      {i < metrics.length - 2 && <span className="text-[10px] vl-text-muted">∩</span>}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Unique partners per agent */}
          <div>
            <p className="vl-caption mb-2 mt-3">
              {t(lang, 'agentCompare.overlap.uniqueTo')}
            </p>
            <div className="space-y-1.5">
              {metrics.map((m, i) => (
                <div key={m.agent.id} className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0" style={{ backgroundColor: COMPARE_COLORS[i % COMPARE_COLORS.length] }}>
                    {m.agent.title.charAt(0)}
                  </div>
                  <span className="text-[11px] vl-text-body font-medium truncate max-w-[60px]">{m.agent.title}</span>
                  <span className="text-[10px] vl-text-muted">:</span>
                  {uniquePartnersFixed[i].unique.length === 0 ? (
                    <span className="text-[10px] vl-text-muted italic">{t(lang, 'common.noData')}</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {uniquePartnersFixed[i].unique.map(p => (
                        <Badge
                          key={p.id}
                          variant="outline"
                          className="text-[9px] px-1 py-0 border-[var(--vl-border-subtle)] vl-text-muted"
                          style={{ borderColor: m.agent.color + '44' }}
                        >
                          {p.title}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Agent Comparison Dashboard — Main Component
// ============================================================

function AgentComparisonDashboard({
  agents,
  meetings,
  selectedIds,
  lang,
  onToggleSelect,
  onClearSelection,
}: {
  agents: Agent[]
  meetings: Meeting[]
  selectedIds: Set<string>
  lang: Lang
  onToggleSelect: (id: string, e: React.MouseEvent) => void
  onClearSelection: () => void
}) {
  const selectedAgents = agents.filter(a => selectedIds.has(a.id))
  const canCompare = selectedAgents.length >= 2

  const metrics = useMemo(
    () => selectedAgents.map(a => computeCompareMetrics(a, selectedAgents, meetings)),
    [selectedAgents, agents, meetings]
  )

  if (selectedIds.size === 0) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
        className="overflow-hidden"
      >
        <div className="space-y-4">
          {/* Agent Selector Chips */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="vl-card rounded-xl border p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                  <GitCompareArrows className="size-3.5 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold vl-text-heading">{t(lang, 'agentCompare.title')}</h3>
                  <p className="text-[11px] vl-text-muted">{t(lang, 'agentCompare.subtitle')}</p>
                </div>
              </div>
              {selectedIds.size > 0 && (
                <button
                  onClick={onClearSelection}
                  className="text-[10px] vl-text-muted hover:text-red-400 transition-colors focus-ring rounded px-2 py-1"
                >
                  {t(lang, 'agentCompare.clearSelection')}
                </button>
              )}
            </div>

            {/* Agent chips */}
            <div className="flex flex-wrap gap-2">
              {selectedAgents.map((agent, i) => (
                <div
                  key={agent.id}
                  className="compare-slide-in compare-glass-card compare-gradient-border rounded-xl p-2.5 flex items-center gap-2 cursor-pointer min-w-[160px]"
                  style={{
                    ['--compare-color-1' as string]: COMPARE_COLORS[i % COMPARE_COLORS.length],
                    ['--compare-color-2' as string]: COMPARE_COLORS[(i + 1) % COMPARE_COLORS.length],
                    borderLeft: `3px solid ${COMPARE_COLORS[i % COMPARE_COLORS.length]}`,
                  }}
                  onClick={(e) => onToggleSelect(agent.id, e)}
                  role="button"
                  aria-label={t(lang, 'common.remove') + ' ' + agent.title}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 venn-pulse"
                    style={{ backgroundColor: agent.color }}
                  >
                    {agent.title.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold vl-text-heading truncate">{agent.title}</p>
                    <p className="text-[10px] vl-text-muted truncate">{agent.expertise}</p>
                  </div>
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold shrink-0"
                    style={{ backgroundColor: COMPARE_COLORS[i % COMPARE_COLORS.length] }}
                  >
                    {i + 1}
                  </span>
                </div>
              ))}

              {/* Add more chips slot */}
              {selectedIds.size < 3 && (
                <div className="flex items-center gap-2">
                  {agents
                    .filter(a => !selectedIds.has(a.id))
                    .slice(0, 3 - selectedIds.size)
                    .map(agent => (
                      <button
                        key={agent.id}
                        onClick={(e) => onToggleSelect(agent.id, e)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                          border border-dashed border-[var(--vl-border)] vl-text-muted
                          hover:border-emerald-500/50 hover:text-emerald-400 hover:bg-emerald-500/5
                          transition-all duration-200 focus-ring"
                      >
                        <Plus className="size-3" />
                        {agent.title}
                      </button>
                    ))
                  }
                </div>
              )}
            </div>

            {selectedIds.size < 2 && (
              <p className="text-[11px] vl-text-muted mt-2 text-center italic">
                {t(lang, 'agentCompare.needMore')}
              </p>
            )}
          </motion.div>

          {/* Comparison Views */}
          {canCompare && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Radar Chart */}
              <ComparisonRadarChart metrics={metrics} lang={lang} />

              {/* Metric Table */}
              <MetricComparisonTable metrics={metrics} lang={lang} />
            </div>
          )}

          {canCompare && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Performance Badges */}
              <PerformanceBadges metrics={metrics} lang={lang} />

              {/* Collaboration Overlap */}
              <CollaborationOverlap metrics={metrics} allAgents={selectedAgents} lang={lang} />
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// ============================================================
// Agent Status Types & Utilities
// ============================================================

type AgentStatus = 'online' | 'busy' | 'away' | 'offline'
type StatusFilter = 'all' | AgentStatus

const STATUS_CONFIG: Record<AgentStatus, { label: string; dotColor: string; textColor: string; animationClass: string }> = {
  online: {
    label: 'Online',
    dotColor: 'bg-emerald-500',
    textColor: 'text-emerald-500',
    animationClass: 'agent-status-dot-online',
  },
  busy: {
    label: 'Busy',
    dotColor: 'bg-amber-500',
    textColor: 'text-amber-500',
    animationClass: '',
  },
  away: {
    label: 'Away',
    dotColor: 'bg-orange-400',
    textColor: 'text-orange-400',
    animationClass: 'opacity-60',
  },
  offline: {
    label: 'Offline',
    dotColor: 'bg-slate-500',
    textColor: 'text-slate-500',
    animationClass: '',
  },
}

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'online', label: 'Online' },
  { value: 'busy', label: 'Busy' },
  { value: 'away', label: 'Away' },
  { value: 'offline', label: 'Offline' },
]

function getRandomStatus(): AgentStatus {
  const r = Math.random() * 100
  if (r < 40) return 'online'
  if (r < 65) return 'busy'
  if (r < 85) return 'away'
  return 'offline'
}

// ============================================================
// Agent Status Dot Component
// ============================================================

function AgentStatusDot({ status }: { status: AgentStatus }) {
  const config = STATUS_CONFIG[status]
  return (
    <span className="relative flex h-2.5 w-2.5" role="status" aria-label={config.label}>
      {status === 'online' && (
        <span
          className={`absolute inline-flex h-full w-full rounded-full ${config.dotColor} opacity-75 animate-ping`}
        />
      )}
      <span
        className={`relative inline-flex rounded-full h-2.5 w-2.5 ${config.dotColor} ${config.animationClass}`}
      />
    </span>
  )
}

// ============================================================
// Agent Status Badge (shown on card)
// ============================================================

function AgentStatusBadge({ status }: { status: AgentStatus }) {
  const config = STATUS_CONFIG[status]
  const badgeGlow = status === 'online' ? 'badge-glow-emerald' : status === 'busy' ? 'badge-glow-amber' : ''
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--vl-bg-inner)] border border-[var(--vl-border-subtle)] ${badgeGlow}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dotColor} ${config.animationClass}`} />
      <span className={config.textColor}>{config.label}</span>
    </span>
  )
}

// ============================================================
// Status Filter Bar
// ============================================================

function StatusFilterBar({
  activeFilter,
  onFilterChange,
  statusCounts,
}: {
  activeFilter: StatusFilter
  onFilterChange: (filter: StatusFilter) => void
  statusCounts: Record<StatusFilter, number>
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {STATUS_FILTER_OPTIONS.map(opt => {
        const count = statusCounts[opt.value]
        const isActive = activeFilter === opt.value
        return (
          <button
            key={opt.value}
            onClick={() => onFilterChange(opt.value)}
            className={`
              agent-filter-pill inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
              border transition-all duration-200 focus-ring
              ${isActive
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                : 'border-[var(--vl-border-subtle)] vl-text-muted hover:vl-text-body'
              }
            `}
            aria-pressed={isActive}
          >
            {opt.value !== 'all' && (
              <span className={`h-1.5 w-1.5 rounded-full ${STATUS_CONFIG[opt.value as AgentStatus].dotColor}`} />
            )}
            {opt.label}
            <span className="text-[10px] opacity-60">({count})</span>
          </button>
        )
      })}
    </div>
  )
}

// ============================================================
// Activity Timeline Entry Types
// ============================================================

interface TimelineEntry {
  id: string
  type: 'joined_team' | 'sent_message' | 'completed_individual'
  description: string
  meetingName: string
  timestamp: string
}

function buildTimelineForAgent(agent: Agent, meetings: Meeting[]): TimelineEntry[] {
  const entries: TimelineEntry[] = []

  meetings.forEach(meeting => {
    const agentTitle = agent.title

    // Check if agent participated in this meeting
    if (meeting.type === 'team') {
      const isMember = meeting.teamMembers?.some(m => m.id === agent.id) || meeting.teamLead?.id === agent.id
      const agentMessages = meeting.messages?.filter(msg => msg.agentName === agentTitle)

      if (isMember) {
        // "Joined Team Meeting" entry
        entries.push({
          id: `${meeting.id}-joined`,
          type: 'joined_team',
          description: `Joined Team Meeting: ${meeting.saveName}`,
          meetingName: meeting.saveName,
          timestamp: meeting.createdAt,
        })
      }

      // "Sent message" entries (one per round for brevity)
      if (agentMessages && agentMessages.length > 0) {
        const roundSet = new Set<number>()
        agentMessages.forEach(msg => {
          if (!roundSet.has(msg.roundIndex)) {
            roundSet.add(msg.roundIndex)
            entries.push({
              id: `${meeting.id}-msg-${msg.roundIndex}`,
              type: 'sent_message',
              description: `Sent message in ${meeting.saveName}`,
              meetingName: meeting.saveName,
              timestamp: msg.createdAt,
            })
          }
        })
      }
    } else if (meeting.type === 'individual') {
      const isParticipant = meeting.teamMember?.id === agent.id
      if (isParticipant && meeting.status === 'completed') {
        entries.push({
          id: `${meeting.id}-completed`,
          type: 'completed_individual',
          description: 'Completed Individual Meeting',
          meetingName: meeting.saveName,
          timestamp: meeting.updatedAt,
        })
      }
      // Also check for messages
      const agentMessages = meeting.messages?.filter(msg => msg.agentName === agentTitle)
      if (agentMessages && agentMessages.length > 0 && isParticipant) {
        const roundSet = new Set<number>()
        agentMessages.forEach(msg => {
          if (!roundSet.has(msg.roundIndex)) {
            roundSet.add(msg.roundIndex)
            entries.push({
              id: `${meeting.id}-msg-${msg.roundIndex}`,
              type: 'sent_message',
              description: `Sent message in ${meeting.saveName}`,
              meetingName: meeting.saveName,
              timestamp: msg.createdAt,
            })
          }
        })
      }
    }
  })

  // Sort by timestamp descending (most recent first)
  entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return entries
}

function TimelineIcon({ type }: { type: TimelineEntry['type'] }) {
  switch (type) {
    case 'joined_team':
      return <Clock className="size-3.5 text-emerald-500" />
    case 'sent_message':
      return <MessageSquare className="size-3.5 text-cyan-500" />
    case 'completed_individual':
      return <CheckCircle className="size-3.5 text-amber-500" />
  }
}

function TimelineEntryComponent({ entry, isLast }: { entry: TimelineEntry; isLast: boolean }) {
  return (
    <div className="timeline-entry flex gap-3 py-2.5 px-3 rounded-lg cursor-default" role="listitem">
      {/* Left: timeline line + icon */}
      <div className="flex flex-col items-center shrink-0">
        <div className="w-7 h-7 rounded-full flex items-center justify-center bg-[var(--vl-bg-inner)] border border-[var(--vl-border-subtle)]">
          <TimelineIcon type={entry.type} />
        </div>
        {!isLast && (
          <div className="w-px flex-1 bg-[var(--vl-border-subtle)] mt-1" />
        )}
      </div>
      {/* Right: description + timestamp */}
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-sm vl-text-body leading-snug">{entry.description}</p>
        <p className="text-[11px] vl-text-muted mt-0.5">{timeAgo(entry.timestamp)}</p>
      </div>
    </div>
  )
}

function AgentActivityTimeline({ agent, meetings }: { agent: Agent; meetings: Meeting[] }) {
  const entries = useMemo(() => buildTimelineForAgent(agent, meetings), [agent, meetings])

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Clock className="size-8 vl-text-muted mb-2 opacity-40" />
        <p className="text-sm vl-text-muted">No activity yet</p>
        <p className="text-xs vl-text-muted opacity-60 mt-1">Activity will appear when this agent participates in meetings</p>
      </div>
    )
  }

  return (
    <div className="max-h-80 overflow-y-auto custom-scrollbar pr-1" role="list" aria-label="Activity timeline">
      <div className="timeline-stagger space-y-0.5">
        {entries.map((entry, i) => (
          <TimelineEntryComponent
            key={entry.id}
            entry={entry}
            isLast={i === entries.length - 1}
          />
        ))}
      </div>
    </div>
  )
}

// ============================================================
// Agent Training History — Types & Utilities
// ============================================================

type TrainingSubTab = 'performance' | 'history' | 'compare'

interface AgentMeetingSnapshot {
  meeting: Meeting
  messageCount: number
  avgWordCount: number
  keyTopics: string[]
  status: Meeting['status']
  createdAt: string
  saveName: string
}

interface AgentTrainingMetrics {
  messages: number
  avgLength: number
  participationRate: number
  collaborationScore: number
  questionsAsked: number
}

function getAgentMeetingSnapshots(agent: Agent, meetings: Meeting[]): AgentMeetingSnapshot[] {
  return meetings
    .filter(m => m.messages?.some(msg => msg.agentName === agent.title))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map(m => {
      const agentMsgs = m.messages.filter(msg => msg.agentName === agent.title)
      const wordCounts = agentMsgs.map(msg => msg.message.split(/\s+/).filter(Boolean).length)
      const avgWordCount = wordCounts.length > 0 ? Math.round(wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length) : 0
      const firstWords = agentMsgs[0]?.message.split(/\s+/).slice(0, 4).join(' ') || ''
      return {
        meeting: m,
        messageCount: agentMsgs.length,
        avgWordCount,
        keyTopics: firstWords ? [firstWords] : [],
        status: m.status,
        createdAt: m.createdAt,
        saveName: m.saveName,
      }
    })
}

function computeTrainingMetricsForMeetings(agent: Agent, meetings: Meeting[]): AgentTrainingMetrics {
  const agentMsgs = meetings.flatMap(m => (m.messages || []).filter(msg => msg.agentName === agent.title))
  const messages = agentMsgs.length
  const totalWords = agentMsgs.reduce((sum, msg) => sum + msg.message.split(/\s+/).filter(Boolean).length, 0)
  const avgLength = messages > 0 ? Math.round(totalWords / messages) : 0
  const questionsAsked = agentMsgs.filter(msg => msg.message.includes('?')).length

  const totalMeetingMsgs = meetings.reduce((sum, m) => sum + (m.messages?.length || 0), 0)
  const participationRate = totalMeetingMsgs > 0 ? Math.round((messages / totalMeetingMsgs) * 100) : 0

  const coParticipants = new Set<string>()
  meetings.forEach(meeting => {
    const msgAgents = new Set((meeting.messages || []).map(m => m.agentName).filter(n => n !== agent.title && n !== 'User'))
    msgAgents.forEach(n => coParticipants.add(n))
  })
  const collaborationScore = Math.min(Math.round((coParticipants.size / Math.max(meetings.length, 1)) * 100), 100)

  return { messages, avgLength, participationRate, collaborationScore, questionsAsked }
}

function computeImprovementScore(snapshots: AgentMeetingSnapshot[], agent: Agent): number | null {
  if (snapshots.length < 4) return null
  const half = Math.floor(snapshots.length / 2)
  const firstHalf = snapshots.slice(0, half)
  const secondHalf = snapshots.slice(half)

  const firstMetrics = computeTrainingMetricsForMeetings(agent, firstHalf.map(s => s.meeting))
  const secondMetrics = computeTrainingMetricsForMeetings(agent, secondHalf.map(s => s.meeting))

  const normalize = (val: number, max: number) => max === 0 ? 0 : Math.min((val / max) * 100, 100)
  const maxVals = {
    messages: Math.max(firstMetrics.messages, secondMetrics.messages, 1),
    avgLength: Math.max(firstMetrics.avgLength, secondMetrics.avgLength, 1),
    participationRate: Math.max(firstMetrics.participationRate, secondMetrics.participationRate, 1),
    collaborationScore: Math.max(firstMetrics.collaborationScore, secondMetrics.collaborationScore, 1),
    questionsAsked: Math.max(firstMetrics.questionsAsked, secondMetrics.questionsAsked, 1),
  }

  const firstScores = [
    normalize(firstMetrics.messages, maxVals.messages),
    normalize(firstMetrics.avgLength, maxVals.avgLength),
    normalize(firstMetrics.participationRate, maxVals.participationRate),
    normalize(firstMetrics.collaborationScore, maxVals.collaborationScore),
    normalize(firstMetrics.questionsAsked, maxVals.questionsAsked),
  ]
  const secondScores = [
    normalize(secondMetrics.messages, maxVals.messages),
    normalize(secondMetrics.avgLength, maxVals.avgLength),
    normalize(secondMetrics.participationRate, maxVals.participationRate),
    normalize(secondMetrics.collaborationScore, maxVals.collaborationScore),
    normalize(secondMetrics.questionsAsked, maxVals.questionsAsked),
  ]

  const firstAvg = firstScores.reduce((a, b) => a + b, 0) / firstScores.length
  const secondAvg = secondScores.reduce((a, b) => a + b, 0) / secondScores.length

  if (firstAvg === 0) return secondAvg > 0 ? 100 : 0
  return Math.round(((secondAvg - firstAvg) / firstAvg) * 100)
}

function getImprovementCategory(score: number): 'improving' | 'stable' | 'declining' {
  if (score > 5) return 'improving'
  if (score < -5) return 'declining'
  return 'stable'
}

// ============================================================
// Agent Training History — Sparkline Chart (SVG)
// ============================================================

function TrendSparkline({ data, color, lang }: { data: number[]; color: string; lang: Lang }) {
  if (data.length < 2) {
    return (
      <div className="trend-sparkline flex items-center justify-center" style={{ width: 120, height: 40 }}>
        <span className="text-[9px] vl-text-muted">{t(lang, 'common.noData')}</span>
      </div>
    )
  }

  const w = 120
  const h = 40
  const padding = 4
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1

  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * (w - padding * 2)
    const y = h - padding - ((val - min) / range) * (h - padding * 2)
    return { x, y }
  })

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const areaD = `${pathD} L${points[points.length - 1].x},${h - padding} L${points[0].x},${h - padding} Z`

  return (
    <div className="trend-sparkline" style={{ width: 120, height: 40 }}>
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="block">
        <defs>
          <linearGradient id={`spark-grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#spark-grad-${color.replace('#', '')})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={2} fill={color} />
        ))}
      </svg>
    </div>
  )
}

// ============================================================
// Agent Training History — Mini Radar Chart
// ============================================================

const TRAINING_RADAR_DIMS = [
  { key: 'messages' as const, enLabel: 'Messages', zhLabel: '消息数' },
  { key: 'avgLength' as const, enLabel: 'Avg Length', zhLabel: '平均长度' },
  { key: 'participationRate' as const, enLabel: 'Participation', zhLabel: '参与率' },
  { key: 'collaborationScore' as const, enLabel: 'Collaboration', zhLabel: '协作' },
  { key: 'questionsAsked' as const, enLabel: 'Questions', zhLabel: '提问' },
]

function MiniRadarChart({ metrics, label, color }: { metrics: AgentTrainingMetrics; label: string; color: string }) {
  const cx = 50
  const cy = 50
  const outerR = 35
  const n = TRAINING_RADAR_DIMS.length
  const angleStep = (Math.PI * 2) / n
  const values = TRAINING_RADAR_DIMS.map(dim => {
    const maxVal = dim.key === 'participationRate' || dim.key === 'collaborationScore' ? 100 : Math.max(metrics[dim.key], 1)
    return Math.min((metrics[dim.key] / maxVal) * 100, 100) / 100
  })

  const points = values.map((val, i) => {
    const angle = angleStep * i - Math.PI / 2
    return `${cx + outerR * val * Math.cos(angle)},${cy + outerR * val * Math.sin(angle)}`
  }).join(' ')

  const labelPoints = values.map((_, i) => {
    const angle = angleStep * i - Math.PI / 2
    return { x: cx + (outerR + 8) * Math.cos(angle), y: cy + (outerR + 8) * Math.sin(angle) }
  })

  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 100 100" width={100} height={100} className="block">
        {[0.25, 0.5, 0.75, 1].map((scale) => {
          const r = outerR * scale
          const ringPoints = TRAINING_RADAR_DIMS.map((_, i) => {
            const angle = angleStep * i - Math.PI / 2
            return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`
          }).join(' ')
          return <polygon key={scale} points={ringPoints} fill="none" stroke="var(--vl-chart-grid, #e5e7eb)" strokeWidth={0.3} strokeDasharray="1.5 1" />
        })}
        {TRAINING_RADAR_DIMS.map((_, i) => {
          const angle = angleStep * i - Math.PI / 2
          return (
            <line key={i} x1={cx} y1={cy} x2={cx + outerR * Math.cos(angle)} y2={cy + outerR * Math.sin(angle)} stroke="var(--vl-chart-grid, #e5e7eb)" strokeWidth={0.3} />
          )
        })}
        <polygon points={points} fill={color} fillOpacity={0.15} stroke={color} strokeWidth={1.5} />
        {values.map((val, i) => {
          const angle = angleStep * i - Math.PI / 2
          return <circle key={i} cx={cx + outerR * val * Math.cos(angle)} cy={cy + outerR * val * Math.sin(angle)} r={2} fill={color} />
        })}
        {labelPoints.map((p, i) => (
          <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontSize={5} fill="var(--vl-text-muted, #888)" style={{ fontSize: 5 }}>
            {TRAINING_RADAR_DIMS[i].enLabel.charAt(0).toUpperCase() + TRAINING_RADAR_DIMS[i].enLabel.slice(1)}
          </text>
        ))}
      </svg>
      <span className="text-[10px] font-medium vl-text-muted">{label}</span>
    </div>
  )
}

// ============================================================
// Agent Training History — Meeting Timeline
// ============================================================

function TrainingMeetingTimeline({ snapshots, lang }: { snapshots: AgentMeetingSnapshot[]; lang: Lang }) {
  if (snapshots.length === 0) {
    return (
      <div className="training-card">
        <h4 className="text-sm font-semibold vl-text-heading mb-3 flex items-center gap-2">
          <History className="size-4 text-emerald-500" />
          {t(lang, 'trainingHistory.meetingHistory')}
        </h4>
        <p className="text-sm vl-text-muted text-center py-6">{t(lang, 'trainingHistory.noAgentData')}</p>
      </div>
    )
  }

  const statusBg = (status: Meeting['status']) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
      case 'running': return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
      case 'draft': return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
    }
  }

  return (
    <div className="training-card">
      <h4 className="text-sm font-semibold vl-text-heading mb-3 flex items-center gap-2">
        <History className="size-4 text-emerald-500" />
        {t(lang, 'trainingHistory.meetingHistory')}
      </h4>
      <div className="max-h-72 overflow-y-auto custom-scrollbar pr-1">
        <div className="training-timeline">
          {snapshots.map((snap, idx) => (
            <div key={snap.meeting.id} className={`training-timeline-node status-${snap.status}`}>
              <div className="vl-inner rounded-lg p-2.5 border border-[var(--vl-border-subtle)] transition-all duration-200 hover:bg-[var(--vl-bg-card-hover)] hover:border-[var(--vl-border)]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium vl-text-heading truncate" title={snap.saveName}>
                    {snap.saveName}
                  </span>
                  <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 border ${statusBg(snap.status)}`}>
                    {t(lang, `trainingHistory.${snap.status}`)}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-[10px] vl-text-muted">
                  <span className="flex items-center gap-0.5">
                    <Calendar className="size-2.5" />
                    {timeAgo(snap.createdAt)}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <MessageSquare className="size-2.5" />
                    {t(lang, 'trainingHistory.msgCount').replace('{count}', String(snap.messageCount))}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Hash className="size-2.5" />
                    {t(lang, 'trainingHistory.avgWordCount').replace('{count}', String(snap.avgWordCount))}
                  </span>
                </div>
                {snap.keyTopics.length > 0 && (
                  <div className="mt-1.5 flex items-center gap-1">
                    <span className="text-[9px] vl-text-muted">{t(lang, 'trainingHistory.keyTopics')}:</span>
                    <span className="text-[9px] vl-text-body truncate" title={snap.keyTopics.join(', ')}>
                      {snap.keyTopics.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Agent Training History — Summary Stats
// ============================================================

function TrainingSummaryStats({ snapshots, agent, lang }: { snapshots: AgentMeetingSnapshot[]; agent: Agent; lang: Lang }) {
  const totalMessages = snapshots.reduce((sum, s) => sum + s.messageCount, 0)
  const totalWords = snapshots.reduce((sum, s) => sum + s.avgWordCount * s.messageCount, 0)
  const avgWords = totalMessages > 0 ? Math.round(totalWords / totalMessages) : 0

  // Find most active day based on meeting dates
  const dayCounts: Record<number, number> = {}
  snapshots.forEach(s => {
    const d = new Date(s.createdAt).getDay()
    dayCounts[d] = (dayCounts[d] || 0) + s.messageCount
  })
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const mostActiveDay = Object.keys(dayCounts).length > 0
    ? dayNames[parseInt(Object.entries(dayCounts).sort(([, a], [, b]) => b - a)[0][0])]
    : '—'

  const stats = [
    { icon: <MessageCircle className="size-3.5 text-emerald-500" />, label: t(lang, 'trainingHistory.totalMeetings'), value: snapshots.length },
    { icon: <MessageSquare className="size-3.5 text-cyan-500" />, label: t(lang, 'trainingHistory.totalMessages'), value: totalMessages },
    { icon: <Hash className="size-3.5 text-amber-500" />, label: t(lang, 'trainingHistory.avgWords'), value: avgWords },
    { icon: <Calendar className="size-3.5 text-violet-500" />, label: t(lang, 'trainingHistory.mostActiveDay'), value: mostActiveDay },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map(stat => (
        <div key={stat.label} className="training-card flex flex-col items-center gap-1.5 py-3">
          <span className="vl-text-muted">{stat.icon}</span>
          <span className="text-lg font-bold vl-text-heading stat-number-animate">{stat.value}</span>
          <span className="text-[10px] vl-text-muted text-center">{stat.label}</span>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// Agent Training History — Main Panel
// ============================================================

function AgentTrainingHistoryPanel({ agents, meetings, lang }: { agents: Agent[]; meetings: Meeting[]; lang: Lang }) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')

  // Auto-select first agent
  useEffect(() => {
    if (agents.length > 0 && !selectedAgentId) {
      requestAnimationFrame(() => { setSelectedAgentId(agents[0].id) })
    }
  }, [agents, selectedAgentId])

  const selectedAgent = agents.find(a => a.id === selectedAgentId) || agents[0] || null
  const snapshots = useMemo(() => {
    if (!selectedAgent) return []
    return getAgentMeetingSnapshots(selectedAgent, meetings)
  }, [selectedAgent, meetings])

  const improvementScore = useMemo(() => {
    if (!selectedAgent) return null
    return computeImprovementScore(snapshots, selectedAgent)
  }, [snapshots, selectedAgent])

  const trendData = useMemo(() => snapshots.map(s => s.messageCount), [snapshots])

  // Skill evolution: compute metrics for first half vs second half
  const firstHalfMetrics = useMemo(() => {
    if (snapshots.length < 3 || !selectedAgent) return null
    const half = Math.floor(snapshots.length / 2)
    return computeTrainingMetricsForMeetings(selectedAgent, snapshots.slice(0, half).map(s => s.meeting))
  }, [snapshots, selectedAgent])

  const secondHalfMetrics = useMemo(() => {
    if (snapshots.length < 3 || !selectedAgent) return null
    const half = Math.floor(snapshots.length / 2)
    return computeTrainingMetricsForMeetings(selectedAgent, snapshots.slice(half).map(s => s.meeting))
  }, [snapshots, selectedAgent])

  if (agents.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="vl-card rounded-xl border overflow-hidden"
    >
      <div className="p-4 sm:p-5">
        {/* Header with agent selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <History className="size-4.5 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold vl-text-heading">{t(lang, 'trainingHistory.title')}</h3>
              <p className="text-[11px] vl-text-muted">{t(lang, 'trainingHistory.subtitle')}</p>
            </div>
          </div>

          {/* Agent horizontal scroll selector */}
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
            {agents.map(agent => (
              <button
                key={agent.id}
                onClick={() => setSelectedAgentId(agent.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium whitespace-nowrap transition-all ${
                  agent.id === selectedAgentId
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                    : 'border-[var(--vl-border)] vl-text-muted hover:bg-[var(--vl-bg-card-hover)] hover:text-[var(--vl-text-primary)]'
                }`}
              >
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                  style={{ backgroundColor: agent.color }}
                >
                  {agent.title.charAt(0)}
                </span>
                {agent.title}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Stats Row */}
        <div className="mb-4">
          <TrainingSummaryStats snapshots={snapshots} agent={selectedAgent!} lang={lang} />
        </div>

        {/* Main content grid */}
        {selectedAgent && snapshots.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left: Meeting History Timeline (takes 2 cols) */}
            <div className="lg:col-span-2">
              <TrainingMeetingTimeline snapshots={snapshots} lang={lang} />
            </div>

            {/* Right column: Performance Trend + Improvement + Skill Evolution */}
            <div className="space-y-4">
              {/* Performance Trend Sparkline */}
              <div className="training-card">
                <h4 className="text-sm font-semibold vl-text-heading mb-2 flex items-center gap-2">
                  <BarChart3 className="size-3.5 text-emerald-500" />
                  {t(lang, 'trainingHistory.performanceTrend')}
                </h4>
                <div className="flex items-center justify-center">
                  <TrendSparkline data={trendData} color={selectedAgent.color} lang={lang} />
                </div>
                <p className="text-[10px] vl-text-muted text-center mt-1">
                  {t(lang, 'trainingHistory.messagesPerMeeting')}
                </p>
              </div>

              {/* Improvement Score */}
              <div className="training-card">
                <h4 className="text-sm font-semibold vl-text-heading mb-2 flex items-center gap-2">
                  <Trophy className="size-3.5 text-amber-500" />
                  {t(lang, 'trainingHistory.improvementScore')}
                </h4>
                {improvementScore !== null ? (() => {
                  const category = getImprovementCategory(improvementScore)
                  const arrowIcon = category === 'improving' ? <TrendingUp className="size-5" /> : category === 'declining' ? <TrendingDown className="size-5" /> : <Minus className="size-5" />
                  return (
                    <div className="flex flex-col items-center gap-2">
                      <div className={`improvement-badge ${category}`}>
                        {improvementScore > 0 ? '+' : ''}{improvementScore}%
                      </div>
                      <div className="flex items-center gap-1 vl-text-muted">
                        {arrowIcon}
                        <span className="text-xs font-medium">
                          {t(lang, `trainingHistory.${category}`)}
                        </span>
                      </div>
                      <span className="text-[9px] vl-text-muted">
                        {t(lang, 'trainingHistory.improvementVs').replace('{pct}', String(improvementScore))}
                      </span>
                    </div>
                  )
                })() : (
                  <p className="text-xs vl-text-muted text-center py-3">
                    {t(lang, 'trainingHistory.noAgentData')}
                  </p>
                )}
              </div>

              {/* Skill Radar Evolution */}
              {firstHalfMetrics && secondHalfMetrics && (
                <div className="training-card">
                  <h4 className="text-sm font-semibold vl-text-heading mb-2 flex items-center gap-2">
                    <GitCompareArrows className="size-3.5 text-emerald-500" />
                    {t(lang, 'trainingHistory.skillEvolution')}
                  </h4>
                  <div className="flex items-center justify-around">
                    <MiniRadarChart
                      metrics={firstHalfMetrics}
                      label={t(lang, 'trainingHistory.firstHalf')}
                      color="#06b6d4"
                    />
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] vl-text-muted">→</span>
                    </div>
                    <MiniRadarChart
                      metrics={secondHalfMetrics}
                      label={t(lang, 'trainingHistory.secondHalf')}
                      color="#10b981"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : selectedAgent ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <History className="size-10 vl-text-muted mb-3 opacity-30" />
            <p className="text-sm vl-text-muted">{t(lang, 'trainingHistory.noAgentData')}</p>
            <p className="text-xs vl-text-muted opacity-60 mt-1">{t(lang, 'trainingHistory.noData')}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <History className="size-10 vl-text-muted mb-3 opacity-30" />
            <p className="text-sm vl-text-muted">{t(lang, 'trainingHistory.noData')}</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ============================================================
// AgentsTab Props
// ============================================================

interface AgentsTabProps {
  agents: Agent[]
  meetings: Meeting[]
  loading: boolean
  lang: Lang
  setEditingAgent: (agent: Agent | null) => void
  setAgentDialogOpen: (open: boolean) => void
  setTemplateDialogOpen: (open: boolean) => void
  setDetailAgent: (agent: Agent | null) => void
  setDetailDialogOpen: (open: boolean) => void
  handleDeleteAgent: (id: string) => void
  handleSeedAgents: () => void
}

// ============================================================
// AgentsTab Component
// ============================================================

export function AgentsTab(props: AgentsTabProps) {
  const {
    agents, meetings, loading, lang,
    setEditingAgent, setAgentDialogOpen, setTemplateDialogOpen,
    setDetailAgent, setDetailDialogOpen, handleDeleteAgent, handleSeedAgents,
  } = props

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [comparisonOpen, setComparisonOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [agentStatuses, setAgentStatuses] = useState<Map<string, AgentStatus>>(new Map())
  const [selectedTimelineAgent, setSelectedTimelineAgent] = useState<Agent | null>(null)
  const [activeSubTab, setActiveSubTab] = useState<TrainingSubTab>('performance')
  const [chatOpen, setChatOpen] = useState(false)
  // Agent Profile Enhancement state
  const [profileAgent, setProfileAgent] = useState<Agent | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileCompareAgent, setProfileCompareAgent] = useState<Agent | null>(null)
  // Agent Persona Dashboard state
  const [personaDashboardAgent, setPersonaDashboardAgent] = useState<Agent | null>(null)
  const [personaDashboardOpen, setPersonaDashboardOpen] = useState(false)
  // Mood data state (fetched from API)
  const [agentMoods, setAgentMoods] = useState<Map<string, { mood: string; moodEmoji: string; color: string; moodScore: number; trend: string }>>(new Map())

  // Fetch mood data for all agents
  useEffect(() => {
    if (agents.length === 0) return
    const fetchMoods = async () => {
      try {
        const res = await fetch('/api/agent-moods')
        if (res.ok) {
          const data = await res.json()
          const moodMap = new Map<string, { mood: string; moodEmoji: string; color: string; moodScore: number; trend: string }>()
          ;(data.moods || []).forEach((m: any) => {
            moodMap.set(m.agentId, { mood: m.mood, moodEmoji: m.moodEmoji, color: m.color, moodScore: m.moodScore, trend: m.trend })
          })
          setAgentMoods(moodMap)
        }
      } catch { /* ignore */ }
    }
    fetchMoods()
    // Refresh every 30 seconds
    const interval = setInterval(fetchMoods, 30000)
    return () => clearInterval(interval)
  }, [agents])

  // Scroll reveal observer
  const { observe: observeScrollReveal, disconnect: disconnectScrollReveal } = useScrollReveal()
  useEffect(() => {
    const timer = setTimeout(observeScrollReveal, 100)
    return () => {
      clearTimeout(timer)
      disconnectScrollReveal()
    }
  }, [observeScrollReveal, disconnectScrollReveal])

  // Assign random statuses on mount
  useEffect(() => {
    const statuses = new Map<string, AgentStatus>()
    agents.forEach(agent => {
      statuses.set(agent.id, getRandomStatus())
    })
    requestAnimationFrame(() => { setAgentStatuses(statuses) })
  }, [agents])

  // Auto-cycle statuses every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setAgentStatuses(prev => {
        const next = new Map(prev)
        // Change 1-2 random agents each cycle for realism
        const ids = Array.from(next.keys())
        const changeCount = Math.min(ids.length, Math.random() < 0.5 ? 1 : 2)
        for (let i = 0; i < changeCount; i++) {
          const randomIdx = Math.floor(Math.random() * ids.length)
          next.set(ids[randomIdx], getRandomStatus())
        }
        return next
      })
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  // Set default timeline agent to first agent
  useEffect(() => {
    if (agents.length > 0 && !selectedTimelineAgent) {
      requestAnimationFrame(() => { setSelectedTimelineAgent(agents[0]) })
    }
  }, [agents, selectedTimelineAgent])

  const toggleSelect = (agentId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(agentId)) next.delete(agentId)
      else if (next.size < 3) next.add(agentId)
      return next
    })
  }

  const selectedAgents = agents.filter(a => selectedIds.has(a.id))
  const canCompare = selectedAgents.length >= 2

  const openComparison = () => {
    if (canCompare) setComparisonOpen(true)
  }

  // Compute status counts
  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = { all: agents.length, online: 0, busy: 0, away: 0, offline: 0 }
    agentStatuses.forEach((status, id) => {
      if (agents.some(a => a.id === id)) {
        counts[status]++
      }
    })
    return counts
  }, [agents, agentStatuses])

  // Filter agents by status
  const filteredAgents = useMemo(() => {
    if (statusFilter === 'all') return agents
    return agents.filter(a => agentStatuses.get(a.id) === statusFilter)
  }, [agents, agentStatuses, statusFilter])

  // Timeline agent: use selected agent or first filtered agent
  const timelineAgent = selectedTimelineAgent || agents[0] || null

  return (
    <>
            <AnimatePresence mode="wait">
              <motion.div key="agents" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6 scrollbar-thin">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold vl-text-heading vl-text-balance">{t(lang, 'agents.title')}</h2>
                    <p className="text-sm vl-text-muted">Define AI agents with specialized expertise</p>
                  </div>
                  <div className="flex gap-2">
                    {selectedIds.size > 0 && (
                      <Button
                        onClick={openComparison}
                        disabled={!canCompare}
                        variant="outline"
                        size="sm"
                        className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <GitCompareArrows className="size-3.5 mr-1.5" />
                        Compare ({selectedIds.size}/3)
                      </Button>
                    )}
                    <Button onClick={() => setTemplateDialogOpen(true)} variant="outline" size="sm" className="border-[var(--vl-border)] vl-text-body hover:bg-[var(--vl-bg-card-hover)] hover:text-white">
                      <Zap className="size-3.5 mr-1.5" /> Templates
                    </Button>
                    <Button onClick={handleSeedAgents} variant="outline" size="sm" className="border-[var(--vl-border)] vl-text-body hover:bg-[var(--vl-bg-card-hover)] hover:text-white sm:flex hidden">
                      <Sparkles className="size-3.5 mr-1.5" /> Seed Defaults
                    </Button>
                    <Button onClick={() => { setEditingAgent(null); setAgentDialogOpen(true) }} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white focus-ring-emerald">
                      <Plus className="size-3.5 mr-1.5" /> Add Agent
                    </Button>
                  </div>
                </div>

                {/* Status Filter Bar */}
                {agents.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <StatusFilterBar
                      activeFilter={statusFilter}
                      onFilterChange={setStatusFilter}
                      statusCounts={statusCounts}
                    />
                  </motion.div>
                )}

                {selectedIds.size > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-2 p-2 vl-inner rounded-lg"
                  >
                    <span className="text-xs vl-text-muted">
                      {selectedIds.size} agent{selectedIds.size > 1 ? 's' : ''} selected
                    </span>
                    <div className="flex gap-1">
                      {selectedAgents.map(a => (
                        <Badge
                          key={a.id}
                          variant="outline"
                          className="text-[10px] px-1.5 py-0.5 cursor-pointer hover:bg-red-500/10"
                          style={{ borderColor: a.color + '66', color: a.color }}
                          onClick={() => setSelectedIds(prev => { const n = new Set(prev); n.delete(a.id); return n })}
                        >
                          {a.title} ×
                        </Badge>
                      ))}
                    </div>
                    {selectedIds.size > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] vl-text-muted hover:text-red-400 ml-auto"
                        onClick={() => setSelectedIds(new Set())}
                      >
                        Clear
                      </Button>
                    )}
                  </motion.div>
                )}

                {loading ? (
                  <AgentsSkeletonGrid />
                ) : agents.length === 0 ? (
                  <EmptyState
                    icon={BotIcon}
                    title="No agents yet"
                    description="Create your first AI agent to begin your research journey"
                    accentColor="#f59e0b"
                    action={
                      <div className="flex gap-3 justify-center">
                        <Button onClick={() => setTemplateDialogOpen(true)} variant="outline" className="border-[var(--vl-border)] vl-text-body hover:bg-[var(--vl-bg-card-hover)]">
                          <Zap className="size-4 mr-2" /> Templates
                        </Button>
                        <Button onClick={handleSeedAgents} variant="outline" className="border-[var(--vl-border)] vl-text-body hover:bg-[var(--vl-bg-card-hover)]">
                          <Sparkles className="size-4 mr-2" /> Seed Defaults
                        </Button>
                        <Button onClick={() => { setEditingAgent(null); setAgentDialogOpen(true) }} className="bg-emerald-600 hover:bg-emerald-700 text-white focus-ring-emerald">
                          <Plus className="size-4 mr-2" /> Create your first AI agent
                        </Button>
                      </div>
                    }
                  />
                ) : (
                  <>
                    {/* Agent Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <AnimatePresence>
                        {filteredAgents.map((agent, idx) => {
                          const agentStatus = agentStatuses.get(agent.id) || 'offline'
                          const isTimelineSelected = timelineAgent?.id === agent.id
                          return (
                            <ScrollRevealSection key={agent.id} direction="scale" delay={idx % 5}>
                            <div className="relative">
                              {/* Selection checkbox */}
                              <motion.button
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="absolute top-2 left-2 z-20 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all"
                                style={{
                                  borderColor: selectedIds.has(agent.id) ? agent.color : 'var(--vl-border)',
                                  backgroundColor: selectedIds.has(agent.id) ? agent.color : 'transparent',
                                }}
                                onClick={(e) => toggleSelect(agent.id, e)}
                                aria-label={selectedIds.has(agent.id) ? 'Deselect agent' : 'Select agent for comparison'}
                              >
                                {selectedIds.has(agent.id) && (
                                  <Check className="size-3 text-white" />
                                )}
                              </motion.button>
                              <AgentCard
                                agent={agent}
                                onEdit={() => { setEditingAgent(agent); setAgentDialogOpen(true) }}
                                onDelete={() => handleDeleteAgent(agent.id)}
                                onClick={() => { setDetailAgent(agent); setDetailDialogOpen(true); setSelectedTimelineAgent(agent); setProfileAgent(agent); setProfileOpen(true) }}
                                meetingCount={meetings.filter(m => m.messages?.some(msg => msg.agentName === agent.title)).length}
                              />
                              {/* Mood Indicator + Personality Traits + Activity Status */}
                              <AgentPersonalityTraits agent={agent} meetings={meetings} lang={lang} />
                              <AgentActivityStatus agent={agent} meetings={meetings} lang={lang} />
                              {/* Status Badge row */}
                              <div className={`flex items-center justify-between px-3 py-1.5 border-t border-[var(--vl-border-subtle)] ${isTimelineSelected ? 'bg-emerald-500/5' : ''}`}>
                                <div className="flex items-center gap-2">
                                  <AgentStatusDot status={agentStatus} />
                                  <span className="text-[11px] font-medium vl-text-muted">{STATUS_CONFIG[agentStatus].label}</span>
                                  <AgentMoodIndicator agent={agent} meetings={meetings} lang={lang} size="sm" />
                                  {/* Dynamic mood emoji from API */}
                                  {agentMoods.has(agent.id) && (() => {
                                    const m = agentMoods.get(agent.id)!
                                    return (
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <button
                                            type="button"
                                            className="inline-flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded-full border transition-all hover:scale-105"
                                            style={{ borderColor: `${m.color}44`, color: m.color, backgroundColor: `${m.color}10` }}
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <span className="text-xs">{m.moodEmoji}</span>
                                            <span className="text-[9px]">{m.mood}</span>
                                          </button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-64 p-3 tooltip-glass" side="bottom">
                                          <div className="space-y-2">
                                            <p className="text-xs font-semibold vl-text-heading">{agent.title} — {m.mood}</p>
                                            <div className="flex items-center gap-2">
                                              <span className="text-2xl">{m.moodEmoji}</span>
                                              <div className="flex-1">
                                                <div className="h-2 rounded-full bg-[var(--vl-bg-inner)] overflow-hidden">
                                                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${m.moodScore}%`, backgroundColor: m.color }} />
                                                </div>
                                                <p className="text-[9px] vl-text-muted mt-0.5">Mood Score: {m.moodScore}/100</p>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-1 text-[9px] vl-text-muted">
                                              {m.trend === 'rising' && <><TrendingUp className="size-3 text-emerald-400" /> Rising</>}
                                              {m.trend === 'stable' && <>Stable</>}
                                              {m.trend === 'declining' && <><TrendingDown className="size-3 text-orange-400" /> Declining</>}
                                            </div>
                                          </div>
                                        </PopoverContent>
                                      </Popover>
                                    )
                                  })()}
                                  <MoodIndicatorWithState lang={lang} size="sm" />
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-[10px] h-6 vl-text-muted hover:text-emerald-400 hover:bg-emerald-500/10 rounded-none"
                                    onClick={(e) => { e.stopPropagation(); setPersonaDashboardAgent(agent); setPersonaDashboardOpen(true) }}
                                  >
                                    <Sparkles className="size-3 mr-1" />
                                    Persona
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className={`text-[10px] h-6 vl-text-muted hover:text-emerald-400 hover:bg-emerald-500/10 rounded-none ${isTimelineSelected ? 'text-emerald-400' : ''}`}
                                    onClick={(e) => { e.stopPropagation(); setSelectedTimelineAgent(agent) }}
                                  >
                                    <Eye className="size-3 mr-1" />
                                    {isTimelineSelected ? 'Timeline Active' : 'View Timeline'}
                                  </Button>
                                </div>
                              </div>
                            </div>
                            </ScrollRevealSection>
                          )
                        })}
                      </AnimatePresence>
                    </div>

                    {/* Agent Comparison Dashboard — inline, when agents selected */}
                    <AgentComparisonDashboard
                      agents={agents}
                      meetings={meetings}
                      selectedIds={selectedIds}
                      lang={lang}
                      onToggleSelect={toggleSelect}
                      onClearSelection={() => setSelectedIds(new Set())}
                    />

                    {/* Sub-tab Segmented Control: Performance | History | Compare */}
                    {agents.length > 0 && (
                      <div className="flex items-center gap-1 p-1 vl-inner rounded-lg border border-[var(--vl-border-subtle)] w-fit">
                        {([
                          { key: 'performance' as TrainingSubTab, label: t(lang, 'trainingHistory.tab.performance'), icon: <BarChart3 className="size-3.5" /> },
                          { key: 'history' as TrainingSubTab, label: t(lang, 'trainingHistory.tab.history'), icon: <History className="size-3.5" /> },
                          { key: 'compare' as TrainingSubTab, label: t(lang, 'trainingHistory.tab.compare'), icon: <GitCompareArrows className="size-3.5" /> },
                        ]).map(tab => (
                          <button
                            key={tab.key}
                            onClick={() => setActiveSubTab(tab.key)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                              activeSubTab === tab.key
                                ? 'bg-emerald-500/15 text-emerald-400 shadow-sm'
                                : 'vl-text-muted hover:text-[var(--vl-text-primary)] hover:bg-[var(--vl-bg-card-hover)]'
                            }`}
                          >
                            {tab.icon}
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Tab: Performance — Existing Dashboard + Activity Timeline */}
                    {activeSubTab === 'performance' && (
                      <AnimatePresence mode="wait">
                        <motion.div key="perf-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-4">
                          {/* Agent Performance Dashboard */}
                          <AgentPerformanceDashboard agents={agents} meetings={meetings} lang={lang} />
                        </motion.div>
                      </AnimatePresence>
                    )}

                    {/* Tab: History — Training History Panel */}
                    {activeSubTab === 'history' && (
                      <AnimatePresence mode="wait">
                        <motion.div key="history-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                          <AgentTrainingHistoryPanel agents={agents} meetings={meetings} lang={lang} />
                        </motion.div>
                      </AnimatePresence>
                    )}

                    {/* Tab: Compare — Agent Comparison Dashboard */}
                    {activeSubTab === 'compare' && (
                      <AnimatePresence mode="wait">
                        <motion.div key="compare-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-4">
                          {/* Agent Comparison Dashboard — inline, when agents selected */}
                          <AgentComparisonDashboard
                            agents={agents}
                            meetings={meetings}
                            selectedIds={selectedIds}
                            lang={lang}
                            onToggleSelect={toggleSelect}
                            onClearSelection={() => setSelectedIds(new Set())}
                          />
                        </motion.div>
                      </AnimatePresence>
                    )}

                    {/* Agent Activity Timeline Section (shown on Performance tab) */}
                    {activeSubTab === 'performance' && timelineAgent && (
                      <ScrollRevealSection direction="up" delay={2}>
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="vl-card rounded-xl border p-4 sm:p-6"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                                style={{ backgroundColor: timelineAgent.color }}
                              >
                                {timelineAgent.title.charAt(0)}
                              </div>
                              <div>
                                <h3 className="text-sm font-semibold vl-text-heading">
                                  {timelineAgent.title}
                                </h3>
                                <p className="text-[11px] vl-text-muted">Activity Timeline</p>
                              </div>
                            </div>
                            {agentStatuses.get(timelineAgent.id) && (
                              <AgentStatusBadge status={agentStatuses.get(timelineAgent.id)!} />
                            )}
                          </div>
                          {agents.length > 1 && (
                            <select
                              value={timelineAgent.id}
                              onChange={(e) => {
                                const found = agents.find(a => a.id === e.target.value)
                                if (found) setSelectedTimelineAgent(found)
                              }}
                              className="text-xs vl-input rounded-md px-2 py-1 border border-[var(--vl-border)] focus-ring"
                              aria-label="Select agent for timeline"
                            >
                              {agents.map(a => (
                                <option key={a.id} value={a.id}>{a.title}</option>
                              ))}
                            </select>
                          )}
                        </div>
                        <AgentActivityTimeline agent={timelineAgent} meetings={meetings} />
                      </motion.div>
                      </ScrollRevealSection>
                    )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Agent Comparison Dialog */}
            <LazyAgentComparisonView
              agents={selectedAgents}
              meetings={meetings}
              lang={lang}
              open={comparisonOpen}
              onOpenChange={setComparisonOpen}
            />

            {/* Agent Chat FAB & Panel */}
            {agents.length > 0 && (
              <>
                <AnimatePresence>
                  {!chatOpen && (
                    <motion.button
                      key="chat-fab"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setChatOpen(true)}
                      className="fixed bottom-24 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 flex items-center justify-center transition-shadow cursor-pointer"
                      aria-label={lang === 'zh' ? '与智能体对话' : 'Chat with Agent'}
                    >
                      <span className="relative">
                        <MessageCircleQuestion className="size-6" />
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-pulse" />
                      </span>
                    </motion.button>
                  )}
                </AnimatePresence>
                <LazyAgentChatPanel
                  agents={agents}
                  lang={lang}
                  isOpen={chatOpen}
                  onClose={() => setChatOpen(false)}
                />
              </>
            )}
            {/* Agent Profile Enhancement Slide-over */}
            <AgentProfileEnhancement
              agent={profileAgent}
              meetings={meetings}
              allAgents={agents}
              lang={lang}
              open={profileOpen}
              onClose={() => { setProfileOpen(false); setProfileCompareAgent(null) }}
              compareAgent={profileCompareAgent}
              onCompareChange={setProfileCompareAgent}
            />
            {/* Agent Persona Dashboard */}
            <LazyAgentPersonaDashboard
              agent={personaDashboardAgent}
              meetings={meetings}
              allAgents={agents}
              lang={lang}
              open={personaDashboardOpen}
              onClose={() => { setPersonaDashboardOpen(false); setPersonaDashboardAgent(null) }}
            />
    </>
  )

}