'use client'

/**
 * Agent Persona Dashboard — Rich agent persona view
 *
 * Sections:
 * 1. Agent Identity Card — avatar, name, mood badge, status
 * 2. Mood Timeline — 7-day mood history (recharts line chart)
 * 3. Communication Style Radar — 5-axis SVG radar
 * 4. Collaboration Network Mini — SVG network graph
 * 5. AI Insights Panel — Generate & display AI insights
 * 6. Activity Heatmap — GitHub-style 12-week heatmap
 * 7. Performance Metrics Grid — 6 metric cards with sparklines
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Sparkles, Brain, Network, BarChart3, Activity, RefreshCw,
  MessageSquare, Users, Calendar, Clock, Hash, Zap, Eye, TrendingUp, TrendingDown,
  Lightbulb, CheckCircle, HelpCircle, Award, Book, Edit, ChevronRight, Loader2,
  Camera,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { Agent, Meeting } from './shared-components'
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'

// ============================================================
// Types
// ============================================================

interface AgentMoodData {
  agentId: string
  agentName: string
  mood: string
  moodScore: number
  confidence: number
  trend: 'rising' | 'stable' | 'declining'
  triggers: string[]
  moodEmoji: string
  color: string
  lastUpdated: string
}

interface AgentInsight {
  category: string
  title: string
  description: string
  icon: string
  confidence: number
}

interface AgentInsightsResponse {
  agentId: string
  agentName: string
  insights: AgentInsight[]
  generatedAt: string
  source: 'ai' | 'rule-based'
}

interface AgentPersonaDashboardProps {
  agent: Agent
  meetings: Meeting[]
  allAgents: Agent[]
  lang: Lang
  open: boolean
  onClose: () => void
}

// ============================================================
// Icon map for insights
// ============================================================

const INSIGHT_ICON_MAP: Record<string, React.ElementType> = {
  'message-square': MessageSquare,
  'lightbulb': Lightbulb,
  'users': Users,
  'trending-up': TrendingUp,
  'edit': Edit,
  'help-circle': HelpCircle,
  'check-circle': CheckCircle,
  'award': Award,
  'book': Book,
  'activity': Activity,
}

const CATEGORY_COLORS: Record<string, string> = {
  communication: '#06b6d4',
  contributions: '#10b981',
  collaboration: '#8b5cf6',
  improvements: '#f59e0b',
  expertise: '#ec4899',
  general: '#6b7280',
}

const MOOD_COLORS: Record<string, string> = {
  enthusiastic: '#10b981',
  focused: '#8b5cf6',
  analytical: '#06b6d4',
  creative: '#f59e0b',
  cautious: '#f97316',
  collaborative: '#ec4899',
}

// ============================================================
// Section: Agent Identity Card
// ============================================================

function AgentIdentityCard({ agent, moodData, lang }: {
  agent: Agent
  moodData: AgentMoodData | null
  lang: Lang
}) {
  const initials = agent.title.split(' ').map(w => w.charAt(0)).slice(0, 2).join('').toUpperCase()

  const status = useMemo(() => {
    const recentMeeting = agent.updatedAt
    const diff = Date.now() - new Date(recentMeeting).getTime()
    if (diff < 5 * 60 * 1000) return { label: lang === 'zh' ? '会议中' : 'In Meeting', color: '#f59e0b' }
    if (diff < 60 * 60 * 1000) return { label: lang === 'zh' ? '可用' : 'Available', color: '#10b981' }
    return { label: lang === 'zh' ? '空闲' : 'Idle', color: '#64748b' }
  }, [agent.updatedAt, lang])

  const moodColor = moodData ? (MOOD_COLORS[moodData.mood] || moodData.color) : '#6b7280'

  return (
    <div className="flex flex-col items-center text-center py-6">
      {/* Animated gradient border avatar */}
      <div className="relative mb-4">
        <div
          className="w-24 h-24 rounded-full p-[3px]"
          style={{
            background: `conic-gradient(from 0deg, ${agent.color}, ${moodColor}, ${agent.color}66, ${moodColor}, ${agent.color})`,
            animation: 'agent-dashboard-border-spin 4s linear infinite',
          }}
        >
          <div className="w-full h-full rounded-full flex items-center justify-center text-2xl font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${agent.color}, ${agent.color}cc)` }}>
            {initials}
          </div>
        </div>

        {/* Mood emoji badge */}
        {moodData && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.3 }}
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center text-lg"
            title={moodData.mood}
          >
            {moodData.moodEmoji}
          </motion.span>
        )}

        {/* Status indicator */}
        <div
          className="absolute top-0 right-0 w-5 h-5 rounded-full border-[3px] border-white shadow-md"
          style={{ backgroundColor: status.color }}
          title={status.label}
        />
      </div>

      {/* Name & Role */}
      <h3 className="text-xl font-bold vl-text-heading">{agent.title}</h3>
      <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
        <span
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium text-white"
          style={{ backgroundColor: `${agent.color}88` }}
        >
          <Sparkles className="size-3" />
          {agent.role || 'Agent'}
        </span>

        {/* Status badge */}
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border"
          style={{ borderColor: `${status.color}44`, color: status.color, backgroundColor: `${status.color}10` }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: status.color }} />
          {status.label}
        </span>

        {/* Dynamic mood badge */}
        {moodData && (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border"
            style={{ borderColor: `${moodColor}44`, color: moodColor, backgroundColor: `${moodColor}10` }}
          >
            {moodData.moodEmoji} {moodData.mood}
            {moodData.trend === 'rising' && <TrendingUp className="size-3" />}
            {moodData.trend === 'declining' && <TrendingDown className="size-3" />}
          </span>
        )}
      </div>

      {/* Expertise */}
      <p className="text-xs vl-text-muted mt-2 max-w-[280px] leading-relaxed">{agent.expertise}</p>
    </div>
  )
}

// ============================================================
// Section: Mood Timeline (7 days)
// ============================================================

function MoodTimeline({ agent, meetings, lang }: { agent: Agent; meetings: Meeting[]; lang: Lang }) {
  const data = useMemo(() => {
    const days: { day: string; score: number; mood: string }[] = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dayStr = date.toISOString().slice(0, 10)
      const label = date.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { weekday: 'short' })
      const dayStart = new Date(dayStr).getTime()
      const dayEnd = dayStart + 86400000

      const dayMessages = meetings.flatMap(m =>
        (m.messages?.filter(msg =>
          msg.agentName === agent.title &&
          new Date(msg.createdAt).getTime() >= dayStart &&
          new Date(msg.createdAt).getTime() < dayEnd
        ) || [])
      )

      const score = Math.min(dayMessages.length * 15, 100)
      let mood = 'idle'
      if (dayMessages.length >= 10) mood = 'enthusiastic'
      else if (dayMessages.length >= 6) mood = 'focused'
      else if (dayMessages.length >= 3) mood = 'analytical'
      else if (dayMessages.length >= 1) mood = 'creative'

      days.push({ day: label, score, mood })
    }
    return days
  }, [agent, meetings, lang])

  return (
    <div className="vl-card rounded-xl border p-4">
      <h4 className="text-xs font-semibold vl-text-heading mb-3 flex items-center gap-1.5">
        <Activity className="size-3.5 text-emerald-500" />
        {lang === 'zh' ? '情绪时间线 (7天)' : 'Mood Timeline (7 days)'}
      </h4>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10, fill: 'var(--vl-text-muted, #888)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 9, fill: 'var(--vl-text-muted, #888)' }}
              axisLine={false}
              tickLine={false}
            />
            <RechartsTooltip
              contentStyle={{
                backgroundColor: 'var(--vl-bg-card, #1a1a2e)',
                border: '1px solid var(--vl-border, #333)',
                borderRadius: 8,
                fontSize: 11,
                color: 'var(--vl-text-body, #fff)',
              }}
              formatter={(value: number, _name: string, props: any) => [
                `Score: ${value}`,
                `Mood: ${props.payload.mood}`
              ]}
            />
            <ReferenceLine y={50} stroke="var(--vl-border-subtle)" strokeDasharray="3 3" />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#10b981"
              strokeWidth={2}
              dot={(props: any) => {
                const { cx, cy, payload } = props
                return (
                  <circle
                    key={`dot-${payload.day}`}
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={MOOD_COLORS[payload.mood] || '#10b981'}
                    stroke="var(--vl-bg-card)"
                    strokeWidth={2}
                  />
                )
              }}
              activeDot={{ r: 6, strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-2 flex-wrap">
        {Object.entries(MOOD_COLORS).slice(0, 4).map(([mood, color]) => (
          <span key={mood} className="flex items-center gap-1 text-[9px] vl-text-muted">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            {mood}
          </span>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// Section: Communication Style Radar (SVG)
// ============================================================

function CommunicationStyleRadar({ agent, meetings }: { agent: Agent; meetings: Meeting[] }) {
  const axes = useMemo(() => {
    const messages = meetings.flatMap(m =>
      (m.messages?.filter(msg => msg.agentName === agent.title) || [])
    )
    const total = messages.length
    const avgLen = total > 0 ? messages.reduce((s, m) => s + m.message.length, 0) / total : 0

    // Brevity: inversely proportional to avg length
    const brevity = Math.min(Math.max(100 - avgLen * 0.15, 15), 95)

    // Technical Depth: based on technical keywords
    const techTerms = ['algorithm', 'model', 'data', 'analysis', 'compute', 'predict', 'evaluate', 'method', 'framework', 'architecture']
    const techCount = messages.filter(m => techTerms.some(t => m.message.toLowerCase().includes(t))).length
    const technicalDepth = Math.min(Math.max(techCount * 10 + (total > 0 ? 20 : 0), 15), 95)

    // Collaboration: based on meetings joined
    const meetingsJoined = meetings.filter(m => m.messages?.some(msg => msg.agentName === agent.title)).length
    const collaboration = Math.min(Math.max(meetingsJoined * 12, 15), 95)

    // Leadership: based on being team lead
    const leadershipCount = meetings.filter(m => m.teamLead?.id === agent.id).length
    const leadership = Math.min(Math.max(15 + leadershipCount * 25, 15), 95)

    // Creativity: based on unique words
    const uniqueWords = new Set(messages.flatMap(m => m.message.toLowerCase().split(/[^a-z]+/)))
    const creativity = Math.min(Math.max(20 + uniqueWords.size * 0.4, 15), 95)

    return [
      { key: 'brevity', label: 'Brevity', value: brevity },
      { key: 'technical', label: 'Technical', value: technicalDepth },
      { key: 'collaboration', label: 'Collab', value: collaboration },
      { key: 'leadership', label: 'Leadership', value: leadership },
      { key: 'creativity', label: 'Creativity', value: creativity },
    ]
  }, [agent, meetings])

  const n = axes.length
  const cx = 100
  const cy = 100
  const maxR = 70
  const angleStep = (2 * Math.PI) / n

  const getPoint = (index: number, value: number) => {
    const angle = index * angleStep - Math.PI / 2
    const r = (value / 100) * maxR
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  }

  return (
    <div className="vl-card rounded-xl border p-4">
      <h4 className="text-xs font-semibold vl-text-heading mb-3 flex items-center gap-1.5">
        <Zap className="size-3.5 text-emerald-500" />
        Communication Style
      </h4>

      <svg viewBox="0 0 200 200" className="w-full h-auto max-w-[200px] mx-auto">
        {/* Background rings */}
        {[20, 40, 60, 80, 100].map(level => (
          <polygon
            key={level}
            points={Array.from({ length: n }, (_, i) => {
              const p = getPoint(i, level)
              return `${p.x},${p.y}`
            }).join(' ')}
            fill="none"
            stroke="var(--vl-border-subtle)"
            strokeWidth={0.5}
            opacity={0.5}
          />
        ))}

        {/* Axis lines + labels */}
        {axes.map((axis, i) => {
          const p = getPoint(i, 100)
          return (
            <g key={axis.key}>
              <line x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--vl-border-subtle)" strokeWidth={0.5} opacity={0.3} />
              <text
                x={getPoint(i, 118).x}
                y={getPoint(i, 118).y + 3}
                textAnchor="middle"
                fill="var(--vl-text-muted, #888)"
                fontSize={7}
              >
                {axis.label}
              </text>
            </g>
          )
        })}

        {/* Data polygon */}
        <motion.polygon
          points={axes.map((axis, i) => {
            const p = getPoint(i, axis.value)
            return `${p.x},${p.y}`
          }).join(' ')}
          fill={agent.color}
          fillOpacity={0.2}
          stroke={agent.color}
          strokeWidth={2}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />

        {/* Data points + values */}
        {axes.map((axis, i) => {
          const p = getPoint(i, axis.value)
          return (
            <g key={`point-${axis.key}`}>
              <circle cx={p.x} cy={p.y} r={3} fill={agent.color} stroke="var(--vl-bg-card)" strokeWidth={1.5} />
              <text x={p.x} y={p.y - 7} textAnchor="middle" fill="white" fontSize={7} fontWeight="bold" opacity={0.8}>
                {Math.round(axis.value)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ============================================================
// Section: Collaboration Network Mini (SVG)
// ============================================================

function CollaborationNetworkMini({ agent, allAgents, meetings }: {
  agent: Agent; allAgents: Agent[]; meetings: Meeting[]
}) {
  const edges = useMemo(() => {
    const result: { target: Agent; sharedMeetings: number; messageCount: number }[] = []
    allAgents.forEach(other => {
      if (other.id === agent.id) return
      const sharedMeetings = meetings.filter(m =>
        m.messages?.some(msg => msg.agentName === agent.title) &&
        m.messages?.some(msg => msg.agentName === other.title)
      ).length
      if (sharedMeetings > 0) {
        const messageCount = meetings.reduce((sum, m) => {
          const agentMsgs = (m.messages || []).filter(msg => msg.agentName === agent.title)
          const otherMsgs = (m.messages || []).filter(msg => msg.agentName === other.title)
          return m.messages?.some(msg => msg.agentName === agent.title) &&
            m.messages?.some(msg => msg.agentName === other.title)
            ? Math.min(agentMsgs.length, otherMsgs.length)
            : sum
        }, 0)
        result.push({ target: other, sharedMeetings, messageCount })
      }
    })
    return result.sort((a, b) => b.sharedMeetings - a.sharedMeetings).slice(0, 6)
  }, [agent, allAgents, meetings])

  if (edges.length === 0) {
    return (
      <div className="vl-card rounded-xl border p-4">
        <h4 className="text-xs font-semibold vl-text-heading mb-3 flex items-center gap-1.5">
          <Network className="size-3.5 text-emerald-500" />
          Collaboration Network
        </h4>
        <p className="text-[11px] vl-text-muted text-center py-6">No collaboration data yet</p>
      </div>
    )
  }

  const centerX = 120
  const centerY = 100
  const radius = 70
  const maxShared = Math.max(...edges.map(e => e.sharedMeetings), 1)
  const angleStep = (2 * Math.PI) / edges.length

  return (
    <div className="vl-card rounded-xl border p-4">
      <h4 className="text-xs font-semibold vl-text-heading mb-3 flex items-center gap-1.5">
        <Network className="size-3.5 text-emerald-500" />
        Collaboration Network
      </h4>

      <svg viewBox="0 0 240 200" className="w-full h-auto">
        {/* Connection lines */}
        {edges.map((edge, i) => {
          const angle = i * angleStep - Math.PI / 2
          const x = centerX + radius * Math.cos(angle)
          const y = centerY + radius * Math.sin(angle)
          const lineWidth = 1 + (edge.sharedMeetings / maxShared) * 4
          const opacity = 0.3 + (edge.sharedMeetings / maxShared) * 0.6
          return (
            <motion.line
              key={edge.target.id}
              x1={centerX} y1={centerY} x2={x} y2={y}
              stroke="#10b981" strokeWidth={lineWidth} opacity={opacity}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
            />
          )
        })}

        {/* Center node */}
        <motion.circle
          cx={centerX} cy={centerY} r={20}
          fill={agent.color}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', duration: 0.5 }}
        />
        <text x={centerX} y={centerY + 4} textAnchor="middle" fill="white" fontSize={11} fontWeight="bold">
          {agent.title.charAt(0)}
        </text>

        {/* Outer nodes */}
        {edges.map((edge, i) => {
          const angle = i * angleStep - Math.PI / 2
          const x = centerX + radius * Math.cos(angle)
          const y = centerY + radius * Math.sin(angle)
          const nodeSize = 10 + (edge.sharedMeetings / maxShared) * 8
          return (
            <g key={edge.target.id}>
              <motion.circle
                cx={x} cy={y} r={nodeSize}
                fill={edge.target.color} opacity={0.9}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.1, type: 'spring' }}
              />
              <text x={x} y={y + 3.5} textAnchor="middle" fill="white" fontSize={8} fontWeight="bold">
                {edge.target.title.charAt(0)}
              </text>
              <text x={x} y={y + nodeSize + 12} textAnchor="middle" fill="var(--vl-text-muted, #888)" fontSize={7}>
                {edge.target.title.slice(0, 8)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ============================================================
// Section: AI Insights Panel
// ============================================================

function AIInsightsPanel({ agentId, agentName, lang }: {
  agentId: string; agentName: string; lang: Lang
}) {
  const [insights, setInsights] = useState<AgentInsight[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [source, setSource] = useState<'ai' | 'rule-based'>('rule-based')

  // Check localStorage cache
  useEffect(() => {
    try {
      const cached = localStorage.getItem(`agent-insights-${agentId}`)
      if (cached) {
        const parsed = JSON.parse(cached) as AgentInsightsResponse
        setInsights(parsed.insights)
        setGeneratedAt(parsed.generatedAt)
        setSource(parsed.source)
      }
    } catch { /* ignore */ }
  }, [agentId])

  const generateInsights = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/agent-insights?agentId=${agentId}`)
      if (!res.ok) throw new Error('Failed to generate insights')
      const data: AgentInsightsResponse = await res.json()
      setInsights(data.insights)
      setGeneratedAt(data.generatedAt)
      setSource(data.source)
      // Cache in localStorage
      localStorage.setItem(`agent-insights-${agentId}`, JSON.stringify(data))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [agentId])

  return (
    <div className="vl-card rounded-xl border p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold vl-text-heading flex items-center gap-1.5">
          <Brain className="size-3.5 text-violet-500" />
          {lang === 'zh' ? 'AI 洞察' : 'AI Insights'}
        </h4>
        <div className="flex items-center gap-2">
          {generatedAt && (
            <span className="text-[9px] vl-text-muted">
              {source === 'ai' ? 'AI' : 'Rules'} · {new Date(generatedAt).toLocaleTimeString()}
            </span>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-[10px] px-2 vl-text-muted hover:text-emerald-400 hover:bg-emerald-500/10"
            onClick={generateInsights}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="size-3 animate-spin mr-1" />
            ) : (
              <RefreshCw className="size-3 mr-1" />
            )}
            {lang === 'zh' ? '生成洞察' : 'Generate'}
          </Button>
        </div>
      </div>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="skeleton-shimmer w-8 h-8 rounded-lg shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="skeleton-shimmer h-3 w-3/4 rounded" />
                <div className="skeleton-shimmer h-2 w-full rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="text-center py-4">
          <p className="text-xs text-red-400">{error}</p>
          <Button size="sm" variant="ghost" className="mt-2 text-[10px]" onClick={generateInsights}>
            {lang === 'zh' ? '重试' : 'Retry'}
          </Button>
        </div>
      )}

      {!loading && !error && insights.length === 0 && (
        <div className="text-center py-4">
          <Brain className="size-6 vl-text-muted mx-auto mb-2 opacity-40" />
          <p className="text-xs vl-text-muted">
            {lang === 'zh' ? '点击"生成洞察"以获取AI分析' : 'Click "Generate" to get AI-powered insights'}
          </p>
        </div>
      )}

      {!loading && insights.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin custom-scrollbar">
          <AnimatePresence>
            {insights.map((insight, i) => {
              const Icon = INSIGHT_ICON_MAP[insight.icon] || Activity
              const color = CATEGORY_COLORS[insight.category] || '#6b7280'
              return (
                <motion.div
                  key={`${insight.category}-${i}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-[var(--vl-bg-card-hover)] transition-colors cursor-default"
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${color}18` }}
                  >
                    <Icon className="size-3.5" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-medium vl-text-heading">{insight.title}</span>
                      <span
                        className="text-[8px] px-1 py-0.5 rounded-full border"
                        style={{ borderColor: `${color}33`, color, backgroundColor: `${color}08` }}
                      >
                        {insight.category}
                      </span>
                    </div>
                    <p className="text-[10px] vl-text-muted mt-0.5 leading-relaxed">{insight.description}</p>
                    {/* Confidence bar */}
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="flex-1 h-1 rounded-full bg-[var(--vl-bg-inner)] overflow-hidden max-w-[80px]">
                        <div className="h-full rounded-full" style={{ width: `${insight.confidence * 100}%`, backgroundColor: color }} />
                      </div>
                      <span className="text-[8px] vl-text-muted">{Math.round(insight.confidence * 100)}%</span>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Section: Activity Heatmap (GitHub-style, 12 weeks)
// ============================================================

function ActivityHeatmap({ agent, meetings }: { agent: Agent; meetings: Meeting[] }) {
  const heatmap = useMemo(() => {
    const now = new Date()
    const grid: { date: string; count: number; dayIdx: number }[] = []

    for (let w = 11; w >= 0; w--) {
      for (let d = 0; d < 7; d++) {
        const date = new Date(now)
        date.setDate(date.getDate() - (w * 7 + (6 - d)))
        const dayStr = date.toISOString().slice(0, 10)

        const count = meetings.reduce((sum, m) => {
          return sum + (m.messages?.filter(msg =>
            msg.agentName === agent.title && msg.createdAt.slice(0, 10) === dayStr
          ).length || 0)
        }, 0)

        grid.push({ date: dayStr, count, dayIdx: d })
      }
    }
    return grid
  }, [agent, meetings])

  const maxCount = Math.max(...heatmap.map(h => h.count), 1)

  const getColor = (count: number) => {
    if (count === 0) return 'var(--vl-bg-inner)'
    const intensity = count / maxCount
    const alpha = 0.15 + intensity * 0.75
    return `rgba(16, 185, 129, ${alpha})`
  }

  const months = useMemo(() => {
    const now = new Date()
    const result: { label: string; colIdx: number }[] = []
    for (let w = 11; w >= 0; w--) {
      const date = new Date(now)
      date.setDate(date.getDate() - w * 7)
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short' })
      const colIdx = 11 - w
      if (result.length === 0 || result[result.length - 1].label !== monthLabel) {
        result.push({ label: monthLabel, colIdx })
      }
    }
    return result
  }, [])

  return (
    <div className="vl-card rounded-xl border p-4">
      <h4 className="text-xs font-semibold vl-text-heading mb-3 flex items-center gap-1.5">
        <BarChart3 className="size-3.5 text-emerald-500" />
        Activity Heatmap (12 weeks)
      </h4>

      {/* Month labels */}
      <div className="flex gap-[3px] ml-8 mb-1">
        {months.map((m, i) => (
          <span key={i} className="text-[8px] vl-text-muted" style={{ width: `${100 / 12}%` }}>
            {m.label}
          </span>
        ))}
      </div>

      {/* Heatmap grid */}
      <div className="flex gap-[3px]">
        {/* Day labels */}
        <div className="flex flex-col gap-[3px] mr-1">
          {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((label, i) => (
            <span key={i} className="text-[8px] vl-text-muted h-3 leading-3">{label}</span>
          ))}
        </div>

        {/* Grid: 12 columns (weeks) × 7 rows (days) */}
        <div className="grid gap-[3px]" style={{ gridTemplateColumns: 'repeat(12, 1fr)' }}>
          {heatmap.map((cell) => (
            <TooltipProvider key={cell.date} delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="w-3 h-3 rounded-sm cursor-default transition-transform hover:scale-125"
                    style={{ backgroundColor: getColor(cell.count) }}
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="tooltip-glass text-[10px]">
                  {cell.date}: {cell.count} messages
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-2 justify-end">
        <span className="text-[8px] vl-text-muted">Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map((level, i) => (
          <div key={i} className="w-3 h-3 rounded-sm" style={{
            backgroundColor: level === 0 ? 'var(--vl-bg-inner)' : `rgba(16, 185, 129, ${0.15 + level * 0.75})`
          }} />
        ))}
        <span className="text-[8px] vl-text-muted">More</span>
      </div>
    </div>
  )
}

// ============================================================
// Section: Performance Metrics Grid
// ============================================================

function MiniSparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const w = 60
  const h = 20
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={w} height={h} className="opacity-60">
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PerformanceMetricsGrid({ agent, meetings, allAgents, lang }: {
  agent: Agent; meetings: Meeting[]; allAgents: Agent[]; lang: Lang
}) {
  const metrics = useMemo(() => {
    const messages = meetings.flatMap(m =>
      (m.messages?.filter(msg => msg.agentName === agent.title) || [])
    )
    const totalMessages = messages.length
    const avgLength = totalMessages > 0
      ? Math.round(messages.reduce((s, m) => s + m.message.length, 0) / totalMessages)
      : 0
    const meetingsJoined = meetings.filter(m =>
      m.messages?.some(msg => msg.agentName === agent.title)
    ).length
    const roundsActive = new Set(
      messages.map(m => `${m.teamMeetingId || m.individualMeetingId}-${m.roundIndex}`)
    ).size
    const uniqueTopics = new Set(
      messages.map(m => m.teamMeetingId || m.individualMeetingId)
    ).size

    // Team averages for comparison
    const teamTotalMessages = meetings.reduce((s, m) => s + (m.messages?.length || 0), 0) / Math.max(allAgents.length, 1)
    const teamMeetingsJoined = meetings.length / Math.max(allAgents.length, 1)

    // Sparkline data (simulated from meeting activity)
    const msgSparkline = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      const dayStr = date.toISOString().slice(0, 10)
      return messages.filter(m => m.createdAt.slice(0, 10) === dayStr).length
    })

    return [
      {
        icon: MessageSquare,
        label: lang === 'zh' ? '总消息数' : 'Total Messages',
        value: totalMessages,
        teamAvg: Math.round(teamTotalMessages),
        color: '#06b6d4',
        sparkline: msgSparkline,
      },
      {
        icon: Edit,
        label: lang === 'zh' ? '平均长度' : 'Avg Length',
        value: avgLength,
        suffix: ' chars',
        color: '#8b5cf6',
        sparkline: [avgLength * 0.8, avgLength * 1.1, avgLength * 0.9, avgLength, avgLength * 1.05, avgLength * 0.95, avgLength],
      },
      {
        icon: Calendar,
        label: lang === 'zh' ? '参与会议' : 'Meetings Joined',
        value: meetingsJoined,
        teamAvg: Math.round(teamMeetingsJoined),
        color: '#10b981',
        sparkline: [meetingsJoined * 0.6, meetingsJoined * 0.8, meetingsJoined, meetingsJoined * 0.9, meetingsJoined * 1.1, meetingsJoined, meetingsJoined * 1.05],
      },
      {
        icon: Hash,
        label: lang === 'zh' ? '活跃轮次' : 'Rounds Active',
        value: roundsActive,
        color: '#f59e0b',
        sparkline: [roundsActive * 0.5, roundsActive * 0.7, roundsActive * 0.9, roundsActive, roundsActive * 1.1, roundsActive * 0.95, roundsActive],
      },
      {
        icon: Clock,
        label: lang === 'zh' ? '响应速度' : 'Response Time',
        value: '<2s',
        color: '#ec4899',
        sparkline: [2.1, 1.8, 1.5, 1.9, 1.6, 1.7, 1.4],
      },
      {
        icon: BarChart3,
        label: lang === 'zh' ? '独特话题' : 'Unique Topics',
        value: uniqueTopics,
        color: '#f97316',
        sparkline: [uniqueTopics * 0.4, uniqueTopics * 0.6, uniqueTopics * 0.8, uniqueTopics * 0.9, uniqueTopics, uniqueTopics * 1.05, uniqueTopics],
      },
    ]
  }, [agent, meetings, allAgents, lang])

  return (
    <div className="vl-card rounded-xl border p-4">
      <h4 className="text-xs font-semibold vl-text-heading mb-3 flex items-center gap-1.5">
        <BarChart3 className="size-3.5 text-emerald-500" />
        {lang === 'zh' ? '性能指标' : 'Performance Metrics'}
      </h4>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {metrics.map((metric) => {
          const Icon = metric.icon
          const isAboveTeam = typeof metric.teamAvg === 'number' && typeof metric.value === 'number'
            ? metric.value > metric.teamAvg
            : null
          return (
            <TooltipProvider key={metric.label} delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-2.5 rounded-lg border border-[var(--vl-border-subtle)] hover:border-[var(--vl-border)] transition-colors cursor-default">
                    <div className="flex items-center justify-between mb-1.5">
                      <Icon className="size-3.5" style={{ color: metric.color }} />
                      <MiniSparkline values={metric.sparkline} color={metric.color} />
                    </div>
                    <span className="text-lg font-bold vl-text-heading">
                      {metric.value}
                      {metric.suffix && <span className="text-xs font-normal vl-text-muted ml-0.5">{metric.suffix}</span>}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[9px] vl-text-muted">{metric.label}</span>
                      {isAboveTeam !== null && (
                        <span className={`text-[8px] font-medium ${isAboveTeam ? 'text-emerald-400' : 'text-orange-400'}`}>
                          {isAboveTeam ? '↑' : '↓'} avg {metric.teamAvg}
                        </span>
                      )}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="tooltip-glass text-[10px]">
                  {metric.label}: {metric.value}{metric.suffix || ''}
                  {typeof metric.teamAvg === 'number' && ` (team avg: ${metric.teamAvg})`}
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
// Main: AgentPersonaDashboard
// ============================================================

export function AgentPersonaDashboard({
  agent,
  meetings,
  allAgents,
  lang,
  open,
  onClose,
}: AgentPersonaDashboardProps) {
  const [moodData, setMoodData] = useState<AgentMoodData | null>(null)
  const [activeSection, setActiveSection] = useState<'identity' | 'mood' | 'style' | 'network' | 'insights' | 'heatmap' | 'metrics'>('identity')

  // Fetch mood data
  useEffect(() => {
    if (!open || !agent) return
    const fetchMood = async () => {
      try {
        const res = await fetch(`/api/agent-moods?agentId=${agent.id}`)
        if (res.ok) {
          const data = await res.json()
          setMoodData(data.moods?.[0] || null)
        }
      } catch { /* ignore */ }
    }
    fetchMood()
  }, [open, agent])

  if (!agent) return null

  const sections = [
    { key: 'identity' as const, icon: Eye, label: lang === 'zh' ? '身份' : 'Identity' },
    { key: 'mood' as const, icon: Activity, label: lang === 'zh' ? '情绪' : 'Mood' },
    { key: 'style' as const, icon: Zap, label: lang === 'zh' ? '风格' : 'Style' },
    { key: 'network' as const, icon: Network, label: lang === 'zh' ? '协作' : 'Network' },
    { key: 'insights' as const, icon: Brain, label: lang === 'zh' ? '洞察' : 'Insights' },
    { key: 'heatmap' as const, icon: BarChart3, label: lang === 'zh' ? '活跃度' : 'Activity' },
    { key: 'metrics' as const, icon: TrendingUp, label: lang === 'zh' ? '指标' : 'Metrics' },
  ]

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Slide-over Panel */}
          <motion.div
            className="fixed top-0 right-0 z-50 w-full sm:w-[480px] h-full overflow-y-auto scrollbar-thin custom-scrollbar"
            style={{
              background: 'var(--vl-bg-card)',
              borderLeft: '1px solid var(--vl-border)',
            }}
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="p-4 sm:p-6 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold vl-text-heading flex items-center gap-2">
                  <Sparkles className="size-4 text-emerald-500" />
                  {lang === 'zh' ? '智能体画像' : 'Agent Persona'}
                </h3>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-[var(--vl-bg-inner)] vl-text-muted hover:text-white transition-colors"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Identity Card (always shown) */}
              <AgentIdentityCard agent={agent} moodData={moodData} lang={lang} />

              {/* Section Tabs */}
              <div className="flex gap-1 border border-[var(--vl-border-subtle)] rounded-lg p-0.5 overflow-x-auto scrollbar-none">
                {sections.map(section => (
                  <button
                    key={section.key}
                    onClick={() => setActiveSection(section.key)}
                    className={`flex items-center gap-1 py-1.5 px-2.5 rounded-md text-[10px] font-medium transition-colors whitespace-nowrap ${
                      activeSection === section.key
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'vl-text-muted hover:text-white hover:bg-[var(--vl-bg-inner)]'
                    }`}
                  >
                    <section.icon className="size-3" />
                    <span className="hidden sm:inline">{section.label}</span>
                  </button>
                ))}
              </div>

              {/* Section Content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeSection === 'identity' && (
                    <div className="space-y-4">
                      {/* Triggers */}
                      {moodData && moodData.triggers.length > 0 && (
                        <div className="vl-card rounded-xl border p-4">
                          <h4 className="text-xs font-semibold vl-text-heading mb-2 flex items-center gap-1.5">
                            <ChevronRight className="size-3 text-emerald-500" />
                            {lang === 'zh' ? '情绪驱动因素' : 'Mood Triggers'}
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {moodData.triggers.map((trigger, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-full text-[10px] border border-[var(--vl-border-subtle)] vl-text-body"
                                style={{ backgroundColor: `${moodData.color}10` }}>
                                {trigger}
                              </span>
                            ))}
                          </div>
                          <div className="mt-2 flex items-center gap-2 text-[10px] vl-text-muted">
                            <span>Score: {moodData.moodScore}/100</span>
                            <span>·</span>
                            <span>Confidence: {Math.round(moodData.confidence * 100)}%</span>
                            <span>·</span>
                            <span className="flex items-center gap-0.5">
                              {moodData.trend === 'rising' && <><TrendingUp className="size-3 text-emerald-400" /> Rising</>}
                              {moodData.trend === 'stable' && <>Stable</>}
                              {moodData.trend === 'declining' && <><TrendingDown className="size-3 text-orange-400" /> Declining</>}
                            </span>
                          </div>
                        </div>
                      )}
                      <MoodTimeline agent={agent} meetings={meetings} lang={lang} />
                    </div>
                  )}

                  {activeSection === 'mood' && (
                    <MoodTimeline agent={agent} meetings={meetings} lang={lang} />
                  )}

                  {activeSection === 'style' && (
                    <CommunicationStyleRadar agent={agent} meetings={meetings} />
                  )}

                  {activeSection === 'network' && (
                    <CollaborationNetworkMini agent={agent} allAgents={allAgents} meetings={meetings} />
                  )}

                  {activeSection === 'insights' && (
                    <AIInsightsPanel agentId={agent.id} agentName={agent.title} lang={lang} />
                  )}

                  {activeSection === 'heatmap' && (
                    <ActivityHeatmap agent={agent} meetings={meetings} />
                  )}

                  {activeSection === 'metrics' && (
                    <PerformanceMetricsGrid agent={agent} meetings={meetings} allAgents={allAgents} lang={lang} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
