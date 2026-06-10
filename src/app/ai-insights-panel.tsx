'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, TrendingUp, Users, BarChart3, AlertTriangle, Clock,
  Brain, ShieldAlert, MessageCircle, ChevronDown, ChevronRight,
  CheckCircle2, X, Filter, Eye, EyeOff, Zap, BookOpen, Target,
  ArrowUpRight, ArrowDownRight, Minus, Star, Lightbulb, Activity,
  UserMinus, UserCheck, Link2, Search, Hash,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Slider } from '@/components/ui/slider'
import type { Agent, Meeting, DiscussionMessage, AnalyticsData } from './shared-components'

// ============================================================
// Types
// ============================================================

type InsightCategory =
  | 'underutilized_agent'
  | 'high_performer'
  | 'collaboration_gap'
  | 'research_trend'
  | 'meeting_fatigue'
  | 'knowledge_silo'
  | 'stale_discussion'
  | 'team_imbalance'

interface InsightItem {
  id: string
  category: InsightCategory
  confidence: number
  title: string
  description: string
  recommendation: string
  agentNames?: string[]
  meetingIds?: string[]
  keywords?: string[]
  createdAt: string
}

interface Props {
  agents: Agent[]
  meetings: Meeting[]
  analytics: AnalyticsData | null
}

// ============================================================
// Constants
// ============================================================

const CATEGORY_CONFIG: Record<InsightCategory, {
  label: string
  icon: React.ElementType
  color: string
  bgColor: string
  borderColor: string
}> = {
  underutilized_agent: {
    label: 'Underutilized Agent',
    icon: UserMinus,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
  },
  high_performer: {
    label: 'High Performer',
    icon: Star,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
  },
  collaboration_gap: {
    label: 'Collaboration Gap',
    icon: Link2,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
  },
  research_trend: {
    label: 'Research Trend',
    icon: TrendingUp,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/30',
  },
  meeting_fatigue: {
    label: 'Meeting Fatigue',
    icon: Clock,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  knowledge_silo: {
    label: 'Knowledge Silo',
    icon: ShieldAlert,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  stale_discussion: {
    label: 'Stale Discussion',
    icon: AlertTriangle,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  team_imbalance: {
    label: 'Team Imbalance',
    icon: BarChart3,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
}

const STOP_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her',
  'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there',
  'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get',
  'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no',
  'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your',
  'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then',
  'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
  'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first',
  'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these',
  'give', 'day', 'most', 'us', 'is', 'are', 'was', 'were', 'been',
  'has', 'had', 'did', 'does', 'should', 'may', 'might', 'must',
  'shall', 'need', 'very', 'still', 'much', 'more', 'here', 'where',
  'while', 'both', 'between', 'each', 'own', 'too', 'same', 'such',
  'through', 'during', 'before', 'being', 'those', 'however', 'based',
  'suggest', 'suggests', 'important', 'approach', 'study', 'data',
  'result', 'results', 'potential', 'focus', 'including', 'consider',
  'using', 'used', 'model', 'models', 'analysis', 'key', 'specific',
  'example', 'several', 'note', 'also', 'therefore', 'thus',
  'since', 'although', 'furthermore', 'addition', 'fact', 'often',
  'within', 'several', 'different', 'various', 'related', 'provide',
  'role', 'able', 'high', 'found', 'show', 'shown', 'given',
])

function confidenceColor(c: number): string {
  if (c >= 80) return 'bg-emerald-500'
  if (c >= 60) return 'bg-cyan-500'
  if (c >= 40) return 'bg-amber-500'
  return 'bg-red-500'
}

function confidenceLabel(c: number): string {
  if (c >= 80) return 'High'
  if (c >= 60) return 'Medium'
  if (c >= 40) return 'Low'
  return 'Very Low'
}

// ============================================================
// Insight Generation
// ============================================================

function generateInsights(agents: Agent[], meetings: Meeting[]): InsightItem[] {
  const insights: InsightItem[] = []
  const now = new Date()
  const completedMeetings = meetings.filter(m => m.status === 'completed')
  const allMessages = meetings.flatMap(m => m.messages || [])

  // --- Agent meeting counts ---
  const agentMeetingCounts: Record<string, number> = {}
  const agentMessageCounts: Record<string, number> = {}
  const agentMeetingTypes: Record<string, Set<string>> = {}
  const agentLastMeeting: Record<string, string> = {}

  agents.forEach(a => {
    agentMeetingCounts[a.title] = 0
    agentMessageCounts[a.title] = 0
    agentMeetingTypes[a.title] = new Set()
  })

  meetings.forEach(m => {
    const participants = getMeetingParticipants(m)
    participants.forEach(name => {
      agentMeetingCounts[name] = (agentMeetingCounts[name] || 0) + 1
      if (!agentLastMeeting[name] || m.updatedAt > agentLastMeeting[name]) {
        agentLastMeeting[name] = m.updatedAt
      }
      if (m.type === 'team') agentMeetingTypes[name]?.add('team')
      if (m.type === 'individual') agentMeetingTypes[name]?.add('individual')
    })
  })

  allMessages.forEach(msg => {
    if (msg.agentName !== 'User') {
      agentMessageCounts[msg.agentName] = (agentMessageCounts[msg.agentName] || 0) + 1
    }
  })

  const avgMeetings = agents.length > 0
    ? Object.values(agentMeetingCounts).reduce((a, b) => a + b, 0) / agents.length
    : 0

  // --- Message quality (length) per agent ---
  const agentMsgLengths: Record<string, number[]> = {}
  allMessages.forEach(msg => {
    if (msg.agentName !== 'User') {
      if (!agentMsgLengths[msg.agentName]) agentMsgLengths[msg.agentName] = []
      agentMsgLengths[msg.agentName].push(msg.message.length)
    }
  })
  const avgMsgLength = Object.values(agentMsgLengths).flat().length > 0
    ? Object.values(agentMsgLengths).flat().reduce((a, b) => a + b, 0) / Object.values(agentMsgLengths).flat().length
    : 0

  // 1. Underutilized Agent
  agents.forEach(agent => {
    const count = agentMeetingCounts[agent.title] || 0
    if (count < avgMeetings * 0.5 && avgMeetings > 0) {
      const confidence = Math.min(95, Math.max(30, Math.round((1 - count / Math.max(avgMeetings, 1)) * 100)))
      insights.push({
        id: `underutilized-${agent.id}`,
        category: 'underutilized_agent',
        confidence,
        title: `${agent.title} is Underutilized`,
        description: `${agent.title} has participated in only ${count} meeting${count !== 1 ? 's' : ''}, which is below the average of ${avgMeetings.toFixed(1)}.`,
        recommendation: `Consider scheduling a meeting involving ${agent.title} to leverage their expertise in ${agent.expertise.split(',')[0] || 'their field'}.`,
        agentNames: [agent.title],
        createdAt: now.toISOString(),
      })
    }
  })

  // 2. High Performer
  agents.forEach(agent => {
    const lengths = agentMsgLengths[agent.title] || []
    if (lengths.length > 2) {
      const agentAvg = lengths.reduce((a, b) => a + b, 0) / lengths.length
      if (agentAvg > avgMsgLength * 1.3 && avgMsgLength > 0) {
        const confidence = Math.min(95, Math.max(50, Math.round((agentAvg / avgMsgLength) * 50)))
        insights.push({
          id: `high-perf-${agent.id}`,
          category: 'high_performer',
          confidence,
          title: `${agent.title} is a High Performer`,
          description: `${agent.title} average response length is ${Math.round(agentAvg)} chars, ${Math.round(((agentAvg / Math.max(avgMsgLength, 1)) - 1) * 100)}% above the team average.`,
          recommendation: `${agent.title} provides consistently detailed responses. Consider assigning them as lead reviewer for critical discussions.`,
          agentNames: [agent.title],
          createdAt: now.toISOString(),
        })
      }
    }
  })

  // 3. Collaboration Gap — pairs of agents that haven't met
  const agentPairs = new Set<string>()
  completedMeetings.forEach(m => {
    const parts = getMeetingParticipants(m).filter(n => n !== 'User')
    for (let i = 0; i < parts.length; i++) {
      for (let j = i + 1; j < parts.length; j++) {
        const pair = [parts[i], parts[j]].sort().join('|||')
        agentPairs.add(pair)
      }
    }
  })
  const agentNames = agents.map(a => a.title)
  for (let i = 0; i < agentNames.length; i++) {
    for (let j = i + 1; j < agentNames.length; j++) {
      const pair = [agentNames[i], agentNames[j]].sort().join('|||')
      if (!agentPairs.has(pair) && completedMeetings.length >= 2) {
        const confidence = Math.min(85, Math.max(30, Math.round((completedMeetings.length / Math.max(completedMeetings.length + 2, 1)) * 100)))
        insights.push({
          id: `collab-gap-${i}-${j}`,
          category: 'collaboration_gap',
          confidence,
          title: `Collaboration Gap: ${agentNames[i]} & ${agentNames[j]}`,
          description: `${agentNames[i]} and ${agentNames[j]} have never been in the same meeting. They may bring valuable cross-perspective insights.`,
          recommendation: `Schedule a meeting that includes both ${agentNames[i]} and ${agentNames[j]} to foster cross-domain collaboration.`,
          agentNames: [agentNames[i], agentNames[j]],
          createdAt: now.toISOString(),
        })
      }
    }
  }

  // 4. Research Trend — frequent keywords
  const wordFreq: Record<string, number> = {}
  allMessages.forEach(msg => {
    const words = msg.message.toLowerCase().split(/[\s,.!?;:()"'[\]{}<>\/\\|`~@#$%^&*+=_-]+/).filter(w => w.length > 3 && !STOP_WORDS.has(w))
    words.forEach(w => { wordFreq[w] = (wordFreq[w] || 0) + 1 })
  })
  const topKeywords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  if (topKeywords.length > 0 && topKeywords[0][1] >= 3) {
    const keywordStr = topKeywords.slice(0, 3).map(([w]) => `"${w}"`).join(', ')
    insights.push({
      id: 'research-trend-topics',
      category: 'research_trend',
      confidence: Math.min(95, Math.max(50, 50 + topKeywords[0][1] * 5)),
      title: 'Emerging Research Trends Detected',
      description: `The keywords ${keywordStr} are appearing frequently across recent discussions (${topKeywords[0][1]} mentions for top topic).`,
      recommendation: `Consider dedicating a focused meeting to explore ${topKeywords[0][0]} in depth — it appears to be a growing area of interest.`,
      keywords: topKeywords.map(([w]) => w),
      createdAt: now.toISOString(),
    })
  }

  // 5. Meeting Fatigue — many meetings in short period
  const meetingsByWeek = new Map<string, Meeting[]>()
  meetings.forEach(m => {
    const d = new Date(m.createdAt)
    const weekStart = new Date(d)
    weekStart.setDate(d.getDate() - d.getDay())
    const key = weekStart.toISOString().slice(0, 10)
    if (!meetingsByWeek.has(key)) meetingsByWeek.set(key, [])
    meetingsByWeek.get(key)!.push(m)
  })
  meetingsByWeek.forEach((weekMeetings, weekKey) => {
    if (weekMeetings.length >= 5) {
      insights.push({
        id: `fatigue-${weekKey}`,
        category: 'meeting_fatigue',
        confidence: Math.min(90, Math.max(40, weekMeetings.length * 10)),
        title: `Meeting Fatigue Detected (Week of ${weekKey})`,
        description: `${weekMeetings.length} meetings were scheduled in a single week, which may lead to diminished engagement.`,
        recommendation: 'Consider consolidating some meetings into fewer, more focused sessions to maintain discussion quality.',
        meetingIds: weekMeetings.map(m => m.id),
        createdAt: now.toISOString(),
      })
    }
  })

  // 6. Knowledge Silo — agent in only one meeting type
  agents.forEach(agent => {
    const types = agentMeetingTypes[agent.title] || new Set()
    if (types.size === 1 && (agentMeetingCounts[agent.title] || 0) >= 2) {
      insights.push({
        id: `silo-${agent.id}`,
        category: 'knowledge_silo',
        confidence: Math.min(80, Math.max(35, 35 + (agentMeetingCounts[agent.title] || 0) * 5)),
        title: `${agent.title} in a Knowledge Silo`,
        description: `${agent.title} has only participated in ${[...types][0]} meetings, potentially limiting cross-pollination of ideas.`,
        recommendation: `Include ${agent.title} in a different type of meeting to broaden their collaborative perspective.`,
        agentNames: [agent.title],
        createdAt: now.toISOString(),
      })
    }
  })

  // 7. Stale Discussion — draft meetings older than 7 days
  meetings.forEach(m => {
    if (m.status === 'draft') {
      const age = (now.getTime() - new Date(m.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      if (age > 7) {
        insights.push({
          id: `stale-${m.id}`,
          category: 'stale_discussion',
          confidence: Math.min(90, Math.max(40, Math.round(age * 5))),
          title: `Stale Discussion: "${m.saveName || m.agenda.slice(0, 40)}"`,
          description: `This draft meeting has been idle for ${Math.round(age)} days without being run or updated.`,
          recommendation: age > 14
            ? 'Consider deleting this draft or refreshing its agenda.'
            : 'Either run this meeting or update its agenda to keep it relevant.',
          meetingIds: [m.id],
          createdAt: now.toISOString(),
        })
      }
    }
  })

  // 8. Team Imbalance — uneven message distribution in team meetings
  completedMeetings.filter(m => m.type === 'team' && (m.messages || []).length > 6).forEach(m => {
    const msgs = m.messages || []
    const counts: Record<string, number> = {}
    msgs.forEach(msg => {
      if (msg.agentName !== 'User') {
        counts[msg.agentName] = (counts[msg.agentName] || 0) + 1
      }
    })
    const values = Object.values(counts)
    if (values.length > 1) {
      const maxMsg = Math.max(...values)
      const total = values.reduce((a, b) => a + b, 0)
      const topAgentShare = maxMsg / total
      if (topAgentShare > 0.55) {
        const topAgent = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
        insights.push({
          id: `imbalance-${m.id}`,
          category: 'team_imbalance',
          confidence: Math.min(90, Math.max(40, Math.round(topAgentShare * 100))),
          title: `Team Imbalance in "${m.saveName || m.agenda.slice(0, 30)}"`,
          description: `${topAgent?.[0]} dominated ${Math.round(topAgentShare * 100)}% of the discussion (${topAgent?.[1]} of ${total} messages).`,
          recommendation: `Consider adjusting the agenda to ensure more balanced participation from all team members.`,
          agentNames: topAgent ? [topAgent[0]] : undefined,
          meetingIds: [m.id],
          createdAt: now.toISOString(),
        })
      }
    }
  })

  return insights.sort((a, b) => b.confidence - a.confidence)
}

function getMeetingParticipants(m: Meeting): string[] {
  const names: string[] = []
  if (m.teamLead?.title) names.push(m.teamLead.title)
  if (m.teamMembers) m.teamMembers.forEach(a => { if (!names.includes(a.title)) names.push(a.title) })
  if (m.teamMember?.title && !names.includes(m.teamMember.title)) names.push(m.teamMember.title)
  return names
}

// ============================================================
// Component
// ============================================================

export default function AIInsightsPanel({ agents, meetings, analytics }: Props) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try { const s = localStorage.getItem('vl-insights-dismissed'); return s ? new Set(JSON.parse(s)) : new Set() } catch { return new Set() }
  })
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [minConfidence, setMinConfidence] = useState(0)
  const [showDismissed, setShowDismissed] = useState(false)
  const [appliedIds, setAppliedIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try { const s = localStorage.getItem('vl-insights-applied'); return s ? new Set(JSON.parse(s)) : new Set() } catch { return new Set() }
  })

  const insights = useMemo(() => generateInsights(agents, meetings), [agents, meetings])

  const filteredInsights = useMemo(() => {
    return insights.filter(ins => {
      if (dismissedIds.has(ins.id) && !showDismissed) return false
      if (categoryFilter !== 'all' && ins.category !== categoryFilter) return false
      if (ins.confidence < minConfidence) return false
      return true
    })
  }, [insights, dismissedIds, categoryFilter, minConfidence, showDismissed])

  const handleDismiss = useCallback((id: string) => {
    setDismissedIds(prev => {
      const next = new Set(prev)
      next.add(id)
      try { localStorage.setItem('vl-insights-dismissed', JSON.stringify([...next])) } catch { /* ignore */ }
      return next
    })
  }, [])

  const handleApply = useCallback((id: string) => {
    setAppliedIds(prev => {
      const next = new Set(prev)
      next.add(id)
      try { localStorage.setItem('vl-insights-applied', JSON.stringify([...next])) } catch { /* ignore */ }
      return next
    })
  }, [])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    insights.forEach(ins => {
      counts[ins.category] = (counts[ins.category] || 0) + 1
    })
    return counts
  }, [insights])

  const avgConfidence = insights.length > 0
    ? Math.round(insights.reduce((a, b) => a + b.confidence, 0) / insights.length)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Brain className="size-4 text-white" />
            </div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--vl-text-white)' }}>
              AI Insights
            </h2>
          </div>
          <p className="text-sm vl-text-muted mt-1">
            {filteredInsights.length} actionable insight{filteredInsights.length !== 1 ? 's' : ''} generated from your research data
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs border-violet-500/30 text-violet-400 bg-violet-500/5">
            <Zap className="size-3 mr-1" />
            Avg Confidence: {avgConfidence}%
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-8 gap-1"
            onClick={() => setShowDismissed(!showDismissed)}
          >
            {showDismissed ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
            {showDismissed ? 'Hide Dismissed' : 'Show Dismissed'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="vl-card backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="size-3.5 vl-text-muted" />
              <span className="text-xs font-medium vl-text-muted">Filters:</span>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center justify-between gap-4 w-full">
                    <span>All Categories</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5">{insights.length}</Badge>
                  </div>
                </SelectItem>
                {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center justify-between gap-4 w-full">
                      <span className="flex items-center gap-1.5">
                        <cfg.icon className="size-3" />
                        {cfg.label}
                      </span>
                      <Badge variant="secondary" className="text-[10px] px-1.5">{categoryCounts[key] || 0}</Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 min-w-[200px]">
              <span className="text-xs vl-text-muted whitespace-nowrap">Min Confidence:</span>
              <Slider
                value={[minConfidence]}
                onValueChange={([v]) => setMinConfidence(v)}
                max={100}
                step={10}
                className="flex-1"
              />
              <span className="text-xs font-mono vl-text-muted w-8 text-right">{minConfidence}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Summary Chips */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
          const count = categoryCounts[key] || 0
          if (count === 0) return null
          return (
            <button
              key={key}
              onClick={() => setCategoryFilter(categoryFilter === key ? 'all' : key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
                categoryFilter === key
                  ? `${cfg.bgColor} ${cfg.color} ${cfg.borderColor}`
                  : 'vl-inner vl-text-muted border-[var(--vl-border-subtle)] hover:border-[var(--vl-border)]'
              }`}
            >
              <cfg.icon className="size-3" />
              {cfg.label}
              <span className="ml-0.5 opacity-70">{count}</span>
            </button>
          )
        })}
      </div>

      {/* Insights List */}
      <ScrollArea className="max-h-[600px] overflow-y-auto">
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredInsights.map((insight, index) => {
              const config = CATEGORY_CONFIG[insight.category]
              const isDismissed = dismissedIds.has(insight.id)
              const isApplied = appliedIds.has(insight.id)
              const Icon = config.icon

              return (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: isDismissed ? 0.5 : 1, y: 0 }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  transition={{ delay: index * 0.03, duration: 0.25 }}
                  layout
                >
                  <Card className={`vl-card backdrop-blur-sm transition-all duration-200 ${isDismissed ? 'opacity-50' : ''} ${isApplied ? 'border-emerald-500/30' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${config.bgColor}`}>
                          <Icon className={`size-4 ${config.color}`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--vl-text-white)' }}>
                              {insight.title}
                            </h3>
                            {isApplied && (
                              <Badge variant="outline" className="text-[10px] px-1.5 border-emerald-500/30 text-emerald-400 bg-emerald-500/5 shrink-0">
                                <CheckCircle2 className="size-2.5 mr-0.5" />
                                Applied
                              </Badge>
                            )}
                          </div>

                          <p className="text-xs vl-text-body mb-2 leading-relaxed">
                            {insight.description}
                          </p>

                          {/* Recommendation */}
                          <div className="vl-inner rounded-lg p-3 mb-3">
                            <div className="flex items-start gap-1.5">
                              <Lightbulb className="size-3 text-amber-400 mt-0.5 shrink-0" />
                              <p className="text-xs vl-text-muted leading-relaxed">
                                <span className="font-medium text-amber-400/80">Recommendation:</span>{' '}
                                {insight.recommendation}
                              </p>
                            </div>
                          </div>

                          {/* Meta */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-3">
                              {/* Confidence bar */}
                              <div className="flex items-center gap-1.5">
                                <div className="w-20 h-1.5 rounded-full bg-[var(--vl-bg-inner)] overflow-hidden">
                                  <motion.div
                                    className={`h-full rounded-full ${confidenceColor(insight.confidence)}`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${insight.confidence}%` }}
                                    transition={{ duration: 0.6, delay: index * 0.03 }}
                                  />
                                </div>
                                <span className="text-[10px] vl-text-muted font-mono">{insight.confidence}%</span>
                              </div>

                              {/* Tags */}
                              {insight.agentNames && insight.agentNames.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <Users className="size-3 vl-text-muted" />
                                  {insight.agentNames.slice(0, 2).map(name => (
                                    <Badge key={name} variant="secondary" className="text-[10px] px-1.5 py-0">
                                      {name.length > 15 ? name.slice(0, 15) + '…' : name}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              {insight.keywords && insight.keywords.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <Hash className="size-3 vl-text-muted" />
                                  {insight.keywords.slice(0, 3).map(kw => (
                                    <Badge key={kw} variant="outline" className="text-[10px] px-1.5 py-0 border-violet-500/20 text-violet-400">
                                      {kw}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1">
                              {!isApplied && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs gap-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                        onClick={() => handleApply(insight.id)}
                                      >
                                        <CheckCircle2 className="size-3" />
                                        Apply
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="tooltip-glass">Mark as applied</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs gap-1 vl-text-muted hover:text-red-400 hover:bg-red-500/10"
                                      onClick={() => handleDismiss(insight.id)}
                                    >
                                      <X className="size-3" />
                                      Dismiss
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="tooltip-glass">Dismiss insight</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {filteredInsights.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12"
            >
              <Sparkles className="size-12 vl-text-muted mb-3" />
              <p className="text-sm vl-text-muted font-medium">No insights match your filters</p>
              <p className="text-xs vl-text-muted mt-1">Try adjusting the confidence slider or category filter</p>
            </motion.div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
