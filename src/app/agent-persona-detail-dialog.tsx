'use client'

/**
 * Agent Persona Detail Dialog — Full-screen dialog with comprehensive agent profile
 *
 * Tabs:
 * 1. Overview — Avatar, name, role, expertise, goal, model info
 * 2. Persona — Personality radar chart, collaboration score, research domains, strengths/weaknesses
 * 3. Collaboration History — List of meetings, collaboration matrix
 * 4. Response Analytics — Charts: response length distribution, word frequency, participation timeline
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Sparkles, Brain, Users, BarChart3, MessageSquare,
  Calendar, Clock, TrendingUp, TrendingDown, Activity,
  Loader2, RefreshCw, BookOpen, Target, Cpu, Award,
  AlertTriangle, CheckCircle, Zap, Hash,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import type { Agent, Meeting } from './shared-components'
import type { AgentProfile } from './agent-persona-card'
import AgentCollaborationMatrix from './agent-collaboration-matrix'

// ============================================================
// Types
// ============================================================

interface AgentPersonaDetailDialogProps {
  agent: Agent
  open: boolean
  onClose: () => void
}

// ============================================================
// Helpers
// ============================================================

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return date.toLocaleDateString()
}

// ============================================================
// SVG Radar Chart (used in Persona tab)
// ============================================================

function DetailedRadarChart({
  data,
  color,
}: {
  data: AgentProfile['personalityRadar']
  color: string
}) {
  const axes = useMemo(
    () => [
      { key: 'analytical', label: 'Analytical', value: data.analytical },
      { key: 'creative', label: 'Creative', value: data.creative },
      { key: 'critical', label: 'Critical', value: data.critical },
      { key: 'collaborative', label: 'Collaborative', value: data.collaborative },
      { key: 'detailOriented', label: 'Detail-Oriented', value: data.detailOriented },
    ],
    [data]
  )

  const size = 260
  const n = axes.length
  const cx = size / 2
  const cy = size / 2
  const maxR = size * 0.36
  const angleStep = (2 * Math.PI) / n

  const getPoint = (index: number, value: number) => {
    const angle = index * angleStep - Math.PI / 2
    const r = (value / 100) * maxR
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  }

  const gradId = `detail-radar-${color.replace('#', '')}`

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto" style={{ maxWidth: 280 }}>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0.08} />
        </linearGradient>
        <filter id={`glow-${color.replace('#', '')}`}>
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background rings */}
      {[20, 40, 60, 80, 100].map((level) => (
        <polygon
          key={level}
          points={Array.from({ length: n }, (_, i) => {
            const p = getPoint(i, level)
            return `${p.x},${p.y}`
          }).join(' ')}
          fill="none"
          stroke="var(--vl-border-subtle)"
          strokeWidth={0.8}
          opacity={0.3}
        />
      ))}

      {/* Axis lines */}
      {axes.map((axis, i) => {
        const p = getPoint(i, 100)
        return (
          <line
            key={axis.key}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke="var(--vl-border-subtle)"
            strokeWidth={0.6}
            opacity={0.25}
          />
        )
      })}

      {/* Data polygon */}
      <motion.polygon
        points={axes
          .map((axis, i) => {
            const p = getPoint(i, axis.value)
            return `${p.x},${p.y}`
          })
          .join(' ')}
        fill={`url(#${gradId})`}
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        initial={{ opacity: 0, scale: 0.3 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
        filter={`url(#glow-${color.replace('#', '')})`}
      />

      {/* Data points + value labels */}
      {axes.map((axis, i) => {
        const p = getPoint(i, axis.value)
        return (
          <g key={`point-${axis.key}`}>
            <motion.circle
              cx={p.x}
              cy={p.y}
              r={4.5}
              fill={color}
              stroke="var(--vl-bg-card)"
              strokeWidth={2}
              initial={{ opacity: 0, r: 0 }}
              animate={{ opacity: 1, r: 4.5 }}
              transition={{ duration: 0.5, delay: 0.6 + i * 0.1 }}
            />
            <motion.text
              x={p.x}
              y={p.y - 10}
              textAnchor="middle"
              fill="white"
              fontSize={10}
              fontWeight="bold"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.9 }}
              transition={{ delay: 0.8 + i * 0.1 }}
            >
              {axis.value}
            </motion.text>
          </g>
        )
      })}

      {/* Axis labels */}
      {axes.map((axis, i) => {
        const labelP = getPoint(i, 122)
        return (
          <text
            key={`label-${axis.key}`}
            x={labelP.x}
            y={labelP.y + 4}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--vl-text-muted, #888)"
            fontSize={11}
            fontWeight="600"
          >
            {axis.label}
          </text>
        )
      })}
    </svg>
  )
}

// ============================================================
// Response Length Distribution Bar Chart (SVG)
// ============================================================

function ResponseLengthChart({
  messages,
  color,
}: {
  messages: { message: string; createdAt: string }[]
  color: string
}) {
  const buckets = useMemo(() => {
    const ranges = [
      { label: '0-100', min: 0, max: 100 },
      { label: '101-300', min: 101, max: 300 },
      { label: '301-500', min: 301, max: 500 },
      { label: '501-800', min: 501, max: 800 },
      { label: '800+', min: 801, max: Infinity },
    ]

    const counts = ranges.map((r) => ({
      ...r,
      count: 0,
    }))

    messages.forEach((m) => {
      const len = m.message.length
      for (const bucket of counts) {
        if (len >= bucket.min && len <= bucket.max) {
          bucket.count++
          break
        }
      }
    })

    return counts
  }, [messages])

  const maxCount = Math.max(...buckets.map((b) => b.count), 1)

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--vl-text-heading)' }}>
        <BarChart3 className="size-3.5" style={{ color }} />
        Response Length Distribution
      </h4>
      <div className="flex items-end gap-2 h-32">
        {buckets.map((bucket, i) => {
          const height = bucket.count > 0 ? Math.max((bucket.count / maxCount) * 100, 4) : 4
          return (
            <TooltipProvider key={bucket.label} delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex-1 flex flex-col items-center gap-1">
                    <motion.div
                      className="w-full rounded-t-md cursor-default"
                      style={{
                        backgroundColor: bucket.count > 0 ? `${color}40` : 'var(--vl-bg-inner)',
                        border: `1px solid ${bucket.count > 0 ? `${color}60` : 'var(--vl-border-subtle)'}`,
                        minHeight: 4,
                      }}
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ duration: 0.6, delay: i * 0.08, ease: 'easeOut' }}
                    />
                    <span className="text-[8px]" style={{ color: 'var(--vl-text-muted)' }}>
                      {bucket.label}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="tooltip-glass text-[10px]">
                  {bucket.label} chars: {bucket.count} messages
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
// Word Frequency Chart (SVG horizontal bars)
// ============================================================

function WordFrequencyChart({
  words,
  color,
}: {
  words: { word: string; count: number }[]
  color: string
}) {
  const topWords = words.slice(0, 10)
  const maxCount = Math.max(...topWords.map((w) => w.count), 1)

  if (topWords.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-xs" style={{ color: 'var(--vl-text-muted)' }}>
          No word data available yet
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--vl-text-heading)' }}>
        <Hash className="size-3.5" style={{ color }} />
        Most Used Words
      </h4>
      <div className="space-y-1.5">
        {topWords.map((item, i) => (
          <motion.div
            key={item.word}
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <span
              className="text-[10px] font-mono w-16 truncate text-right shrink-0"
              style={{ color: 'var(--vl-text-body)' }}
            >
              {item.word}
            </span>
            <div className="flex-1 h-4 rounded-sm overflow-hidden" style={{ backgroundColor: 'var(--vl-bg-inner)' }}>
              <motion.div
                className="h-full rounded-sm"
                style={{ backgroundColor: `${color}50` }}
                initial={{ width: 0 }}
                animate={{ width: `${(item.count / maxCount) * 100}%` }}
                transition={{ duration: 0.6, delay: i * 0.04, ease: 'easeOut' }}
              />
            </div>
            <span
              className="text-[9px] w-6 text-right shrink-0 tabular-nums"
              style={{ color: 'var(--vl-text-muted)' }}
            >
              {item.count}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// Participation Timeline (SVG)
// ============================================================

function ParticipationTimeline({
  messages,
  color,
}: {
  messages: { message: string; createdAt: string }[]
  color: string
}) {
  const days = useMemo(() => {
    const result: { date: string; label: string; count: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dayStr = date.toISOString().slice(0, 10)
      const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const count = messages.filter((m) => m.createdAt.slice(0, 10) === dayStr).length
      result.push({ date: dayStr, label, count })
    }
    return result
  }, [messages])

  const maxCount = Math.max(...days.map((d) => d.count), 1)
  const chartH = 60

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--vl-text-heading)' }}>
        <TrendingUp className="size-3.5" style={{ color }} />
        Participation Timeline (30 days)
      </h4>
      <svg viewBox={`0 0 ${days.length * 10 + 20} ${chartH + 20}`} className="w-full overflow-visible">
        {/* Y-axis baseline */}
        <line
          x1="15"
          y1={chartH}
          x2={days.length * 10 + 15}
          y2={chartH}
          stroke="var(--vl-border-subtle)"
          strokeWidth={0.5}
        />

        {/* Bars */}
        {days.map((day, i) => {
          const barH = day.count > 0 ? Math.max((day.count / maxCount) * chartH, 2) : 0
          return (
            <g key={day.date}>
              <motion.rect
                x={15 + i * 10 + 1}
                y={chartH - barH}
                width={8}
                height={barH}
                rx={2}
                fill={day.count > 0 ? color : 'transparent'}
                opacity={day.count > 0 ? 0.3 + (day.count / maxCount) * 0.7 : 0}
                initial={{ height: 0, y: chartH }}
                animate={{ height: barH, y: chartH - barH }}
                transition={{ duration: 0.4, delay: i * 0.01 }}
              />
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ============================================================
// Score Breakdown Bars
// ============================================================

function ScoreBreakdown({
  breakdown,
  color,
}: {
  breakdown: AgentProfile['collaborationScoreBreakdown']
  color: string
}) {
  const items = [
    { label: 'Participation', value: breakdown.participationRate, icon: Users },
    { label: 'Contribution', value: breakdown.contributionQuality, icon: Sparkles },
    { label: 'Response Time', value: breakdown.responseTimeScore, icon: Clock },
    { label: 'Consistency', value: breakdown.consistencyScore, icon: Activity },
  ]

  return (
    <div className="space-y-2.5">
      <h4 className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--vl-text-heading)' }}>
        <Award className="size-3.5" style={{ color }} />
        Score Breakdown
      </h4>
      {items.map((item) => (
        <div key={item.label} className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--vl-text-muted)' }}>
              <item.icon className="size-3" style={{ color }} />
              {item.label}
            </span>
            <span className="text-[10px] font-semibold" style={{ color }}>
              {item.value}%
            </span>
          </div>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: `${color}12` }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: color }}
              initial={{ width: 0 }}
              animate={{ width: `${item.value}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// Main Component
// ============================================================

export default function AgentPersonaDetailDialog({
  agent,
  open,
  onClose,
}: AgentPersonaDetailDialogProps) {
  const [profile, setProfile] = useState<AgentProfile | null>(null)
  const [allMeetings, setAllMeetings] = useState<Meeting[]>([])
  const [allAgents, setAllAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  // Fetch profile data when dialog opens
  const fetchProfileData = useCallback(async () => {
    if (!agent?.id) return
    setLoading(true)
    setError(null)
    try {
      const [profileRes, meetingsRes, agentsRes] = await Promise.all([
        fetch(`/api/agents/${agent.id}/profile`),
        fetch('/api/meetings'),
        fetch('/api/agents'),
      ])

      if (!profileRes.ok) throw new Error('Failed to fetch profile')
      if (!meetingsRes.ok) throw new Error('Failed to fetch meetings')
      if (!agentsRes.ok) throw new Error('Failed to fetch agents')

      const profileData = await profileRes.json()
      const meetingsData = await meetingsRes.json()
      const agentsData = await agentsRes.json()

      setProfile(profileData)
      setAllMeetings(meetingsData)
      setAllAgents(agentsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }, [agent?.id])

  useEffect(() => {
    if (open) {
      setActiveTab('overview')
      fetchProfileData()
    }
  }, [open, fetchProfileData])

  // Derive agent messages for analytics
  const agentMessages = useMemo(() => {
    if (!allMeetings.length) return []
    return allMeetings.flatMap((m) =>
      (m.messages || [])
        .filter((msg) => msg.agentName === agent?.title)
        .map((msg) => ({ message: msg.message, createdAt: msg.createdAt }))
    )
  }, [allMeetings, agent?.title])

  const initials = agent?.title ? getInitials(agent.title) : ''

  // Score color
  const scoreColor = useMemo(() => {
    if (!profile) return '#6b7280'
    const s = profile.collaborationScore
    if (s >= 80) return '#10b981'
    if (s >= 60) return '#f59e0b'
    if (s >= 40) return '#f97316'
    return '#ef4444'
  }, [profile])

  if (!agent) return null

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] max-h-[90vh] p-0 overflow-hidden flex flex-col">
        {/* Header */}
        <DialogHeader className="p-4 pb-0 shrink-0">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
              style={{
                background: `linear-gradient(135deg, ${agent.color}, ${agent.color}bb)`,
                boxShadow: `0 0 16px ${agent.color}30`,
              }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base" style={{ color: 'var(--vl-text-heading)' }}>
                {agent.title}
              </DialogTitle>
              <p className="text-xs" style={{ color: 'var(--vl-text-muted)' }}>
                Comprehensive Agent Persona Profile
              </p>
            </div>
            {loading && <Loader2 className="size-4 animate-spin text-emerald-500" />}
            <button
              onClick={fetchProfileData}
              className="p-2 rounded-lg hover:bg-[var(--vl-bg-card-hover)] transition-colors"
              aria-label="Refresh profile"
              disabled={loading}
            >
              <RefreshCw className="size-4" style={{ color: 'var(--vl-text-muted)' }} />
            </button>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 mt-2">
          <div className="px-4 shrink-0 border-b" style={{ borderColor: 'var(--vl-border)' }}>
            <TabsList className="bg-transparent gap-1 h-auto p-0">
              {[
                { value: 'overview', label: 'Overview', icon: Sparkles },
                { value: 'persona', label: 'Persona', icon: Brain },
                { value: 'collaboration', label: 'Collaboration', icon: Users },
                { value: 'analytics', label: 'Response Analytics', icon: BarChart3 },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 rounded-none px-3 py-2.5 text-xs data-[state=active]:border-emerald-500 data-[state=active]:text-emerald-500 transition-all"
                  style={{ color: 'var(--vl-text-muted)' }}
                >
                  <tab.icon className="size-3.5 mr-1.5" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Error state */}
          {error && !loading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-3">
                <AlertTriangle className="size-8 mx-auto text-amber-500" />
                <p className="text-sm" style={{ color: 'var(--vl-text-muted)' }}>{error}</p>
                <button
                  onClick={fetchProfileData}
                  className="text-xs text-emerald-500 hover:text-emerald-400"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="flex-1 p-6 space-y-4">
              <div className="skeleton-shimmer h-24 rounded-xl w-full" />
              <div className="grid grid-cols-2 gap-4">
                <div className="skeleton-shimmer h-40 rounded-xl" />
                <div className="skeleton-shimmer h-40 rounded-xl" />
              </div>
              <div className="skeleton-shimmer h-32 rounded-xl" />
            </div>
          )}

          {/* Tab Contents */}
          {!loading && !error && profile && (
            <ScrollArea className="flex-1">
              {/* Tab 1: Overview */}
              <TabsContent value="overview" className="p-6 m-0 space-y-6">
                {/* Hero Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl p-6 relative overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${agent.color}10, var(--vl-bg-card))`,
                    border: `1px solid ${agent.color}20`,
                  }}
                >
                  {/* Background decoration */}
                  <div
                    className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-10"
                    style={{ backgroundColor: agent.color }}
                  />

                  <div className="flex flex-col sm:flex-row items-start gap-5 relative z-10">
                    {/* Large avatar */}
                    <div
                      className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${agent.color}, ${agent.color}aa)`,
                        boxShadow: `0 8px 24px ${agent.color}30`,
                      }}
                    >
                      {initials}
                    </div>

                    <div className="flex-1 space-y-3">
                      <div>
                        <h2 className="text-xl font-bold" style={{ color: 'var(--vl-text-heading)' }}>
                          {agent.title}
                        </h2>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge
                            className="text-[10px]"
                            style={{
                              backgroundColor: `${agent.color}20`,
                              color: agent.color,
                              border: `1px solid ${agent.color}30`,
                            }}
                          >
                            {agent.role}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]" style={{ color: 'var(--vl-text-muted)' }}>
                            <Cpu className="size-2.5 mr-1" />
                            {agent.model}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]" style={{ color: scoreColor, borderColor: `${scoreColor}40` }}>
                            <Award className="size-2.5 mr-1" />
                            Collab Score: {profile.collaborationScore}
                          </Badge>
                        </div>
                      </div>

                      {/* Info rows */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex items-start gap-2">
                          <BookOpen className="size-4 mt-0.5 shrink-0" style={{ color: agent.color }} />
                          <div>
                            <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--vl-text-muted)' }}>
                              Expertise
                            </p>
                            <p className="text-sm mt-0.5" style={{ color: 'var(--vl-text-body)' }}>
                              {agent.expertise}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Target className="size-4 mt-0.5 shrink-0" style={{ color: agent.color }} />
                          <div>
                            <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--vl-text-muted)' }}>
                              Goal
                            </p>
                            <p className="text-sm mt-0.5" style={{ color: 'var(--vl-text-body)' }}>
                              {agent.goal}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Quick Stats Grid */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="grid grid-cols-2 sm:grid-cols-4 gap-3"
                >
                  {[
                    {
                      icon: Calendar,
                      label: 'Meetings Joined',
                      value: profile.collaborationStats.meetingsJoined,
                      color: '#10b981',
                    },
                    {
                      icon: MessageSquare,
                      label: 'Messages Sent',
                      value: profile.collaborationStats.messagesSent,
                      color: '#06b6d4',
                    },
                    {
                      icon: Users,
                      label: 'Collaborators',
                      value: profile.collaborationStats.totalCollaborators,
                      color: '#8b5cf6',
                    },
                    {
                      icon: Zap,
                      label: 'Response Style',
                      value: profile.responseStyle.avgResponseLengthCategory,
                      color: '#f59e0b',
                      isText: true,
                    },
                  ].map((stat, i) => (
                    <div
                      key={stat.label}
                      className="p-3 rounded-xl border"
                      style={{
                        borderColor: 'var(--vl-border-subtle)',
                        background: 'var(--vl-bg-card)',
                      }}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <stat.icon className="size-3.5" style={{ color: stat.color }} />
                        <span className="text-[10px]" style={{ color: 'var(--vl-text-muted)' }}>
                          {stat.label}
                        </span>
                      </div>
                      <p className="text-lg font-bold" style={{ color: stat.color }}>
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </motion.div>

                {/* Collaboration Partners */}
                {profile.collaborationStats.sharedMeetingsWith.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="rounded-xl p-4 border"
                    style={{ borderColor: 'var(--vl-border-subtle)', background: 'var(--vl-bg-card)' }}
                  >
                    <h4 className="text-xs font-semibold flex items-center gap-1.5 mb-3" style={{ color: 'var(--vl-text-heading)' }}>
                      <Users className="size-3.5 text-emerald-500" />
                      Top Collaboration Partners
                    </h4>
                    <div className="space-y-2">
                      {profile.collaborationStats.sharedMeetingsWith.slice(0, 5).map((partner) => {
                        const partnerAgent = allAgents.find((a) => a.title === partner.agentName)
                        return (
                          <div key={partner.agentName} className="flex items-center gap-3">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                              style={{
                                backgroundColor: partnerAgent?.color || '#6b7280',
                              }}
                            >
                              {getInitials(partner.agentName)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate" style={{ color: 'var(--vl-text-heading)' }}>
                                {partner.agentName}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className="text-[9px]"
                              style={{ color: '#10b981', borderColor: 'rgba(16,185,129,0.3)' }}
                            >
                              {partner.count} meetings
                            </Badge>
                          </div>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </TabsContent>

              {/* Tab 2: Persona */}
              <TabsContent value="persona" className="p-6 m-0 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Radar Chart */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-xl p-5 border flex flex-col items-center"
                    style={{ borderColor: 'var(--vl-border-subtle)', background: 'var(--vl-bg-card)' }}
                  >
                    <h4 className="text-xs font-semibold flex items-center gap-1.5 mb-4 self-start" style={{ color: 'var(--vl-text-heading)' }}>
                      <Brain className="size-3.5" style={{ color: agent.color }} />
                      Personality Dimensions
                    </h4>
                    <DetailedRadarChart data={profile.personalityRadar} color={agent.color} />
                  </motion.div>

                  {/* Score Breakdown */}
                  <div className="space-y-4">
                    {/* Collaboration Score Card */}
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                      className="rounded-xl p-5 border"
                      style={{ borderColor: 'var(--vl-border-subtle)', background: 'var(--vl-bg-card)' }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--vl-text-heading)' }}>
                          <Award className="size-3.5" style={{ color: scoreColor }} />
                          Collaboration Score
                        </h4>
                        <motion.span
                          className="text-2xl font-bold"
                          style={{ color: scoreColor }}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.3, type: 'spring' }}
                        >
                          {profile.collaborationScore}
                          <span className="text-sm font-normal ml-0.5" style={{ color: 'var(--vl-text-muted)' }}>/100</span>
                        </motion.span>
                      </div>
                      <ScoreBreakdown breakdown={profile.collaborationScoreBreakdown} color={scoreColor} />
                    </motion.div>

                    {/* Research Domains */}
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="rounded-xl p-5 border"
                      style={{ borderColor: 'var(--vl-border-subtle)', background: 'var(--vl-bg-card)' }}
                    >
                      <h4 className="text-xs font-semibold mb-3" style={{ color: 'var(--vl-text-heading)' }}>
                        Research Domains
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.researchDomains.map((domain) => (
                          <span
                            key={domain}
                            className="px-2.5 py-1 rounded-full text-[11px] font-medium"
                            style={{
                              backgroundColor: `${agent.color}12`,
                              color: agent.color,
                              border: `1px solid ${agent.color}25`,
                            }}
                          >
                            {domain}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                </div>

                {/* Strengths & Weaknesses */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  {/* Strengths */}
                  <div className="rounded-xl p-5 border" style={{ borderColor: 'rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.03)' }}>
                    <h4 className="text-xs font-semibold flex items-center gap-1.5 mb-3 text-emerald-500">
                      <CheckCircle className="size-3.5" />
                      Strengths
                    </h4>
                    <div className="space-y-2">
                      {profile.strengths.map((s, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 + i * 0.05 }}
                          className="flex items-start gap-2"
                        >
                          <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0 mt-0.5">
                            <Sparkles className="size-2.5 text-emerald-500" />
                          </div>
                          <p className="text-xs" style={{ color: 'var(--vl-text-body)' }}>{s}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Weaknesses */}
                  <div className="rounded-xl p-5 border" style={{ borderColor: 'rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.03)' }}>
                    <h4 className="text-xs font-semibold flex items-center gap-1.5 mb-3 text-amber-500">
                      <AlertTriangle className="size-3.5" />
                      Areas for Improvement
                    </h4>
                    <div className="space-y-2">
                      {profile.weaknesses.map((w, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 + i * 0.05 }}
                          className="flex items-start gap-2"
                        >
                          <div className="w-5 h-5 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
                            <TrendingDown className="size-2.5 text-amber-500" />
                          </div>
                          <p className="text-xs" style={{ color: 'var(--vl-text-body)' }}>{w}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>

                {/* Response Style Summary */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="rounded-xl p-5 border"
                  style={{ borderColor: 'var(--vl-border-subtle)', background: 'var(--vl-bg-card)' }}
                >
                  <h4 className="text-xs font-semibold flex items-center gap-1.5 mb-3" style={{ color: 'var(--vl-text-heading)' }}>
                    <Activity className="size-3.5" style={{ color: agent.color }} />
                    Response Style Summary
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-[10px]" style={{ color: 'var(--vl-text-muted)' }}>Avg Length</p>
                      <p className="text-sm font-semibold" style={{ color: 'var(--vl-text-heading)' }}>
                        {profile.responseStyle.avgResponseLength} chars
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px]" style={{ color: 'var(--vl-text-muted)' }}>Category</p>
                      <p className="text-sm font-semibold" style={{ color: 'var(--vl-text-heading)' }}>
                        {profile.responseStyle.avgResponseLengthCategory}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px]" style={{ color: 'var(--vl-text-muted)' }}>Round Participation</p>
                      <p className="text-sm font-semibold" style={{ color: 'var(--vl-text-heading)' }}>
                        {profile.responseStyle.roundParticipation}%
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px]" style={{ color: 'var(--vl-text-muted)' }}>Active Time</p>
                      <p className="text-sm font-semibold" style={{ color: 'var(--vl-text-heading)' }}>
                        {profile.responseStyle.preferredTimeOfDay}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </TabsContent>

              {/* Tab 3: Collaboration History */}
              <TabsContent value="collaboration" className="p-6 m-0 space-y-6">
                {/* Collaboration Matrix */}
                {allAgents.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <AgentCollaborationMatrix agents={allAgents} meetings={allMeetings} />
                  </motion.div>
                )}

                {/* Collaboration History List */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="rounded-xl border"
                  style={{ borderColor: 'var(--vl-border-subtle)', background: 'var(--vl-bg-card)' }}
                >
                  <div className="p-4 border-b" style={{ borderColor: 'var(--vl-border)' }}>
                    <h4 className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--vl-text-heading)' }}>
                      <Calendar className="size-3.5 text-emerald-500" />
                      Collaboration History
                    </h4>
                  </div>
                  <div className="max-h-80 overflow-y-auto custom-scrollbar">
                    {profile.collaborationHistory.length === 0 ? (
                      <div className="p-8 text-center">
                        <Users className="size-8 mx-auto mb-2 opacity-30" style={{ color: 'var(--vl-text-muted)' }} />
                        <p className="text-xs" style={{ color: 'var(--vl-text-muted)' }}>
                          No collaboration history yet
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y" style={{ borderColor: 'var(--vl-border-subtle)' }}>
                        {profile.collaborationHistory.map((item, i) => (
                          <motion.div
                            key={item.meetingId}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="px-4 py-3 flex items-center gap-3 hover:bg-[var(--vl-bg-card-hover)] transition-colors"
                          >
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                              style={{
                                backgroundColor: item.meetingType === 'team' ? 'rgba(16,185,129,0.1)' : 'rgba(6,182,212,0.1)',
                              }}
                            >
                              {item.meetingType === 'team' ? (
                                <Users className="size-3.5 text-emerald-500" />
                              ) : (
                                <MessageSquare className="size-3.5 text-cyan-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate" style={{ color: 'var(--vl-text-heading)' }}>
                                {item.meetingName}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px]" style={{ color: 'var(--vl-text-muted)' }}>
                                  {item.collaborators.join(', ')}
                                </span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <Badge
                                variant="outline"
                                className="text-[9px]"
                                style={{
                                  color:
                                    item.status === 'completed'
                                      ? '#10b981'
                                      : item.status === 'running'
                                      ? '#f59e0b'
                                      : 'var(--vl-text-muted)',
                                  borderColor:
                                    item.status === 'completed'
                                      ? 'rgba(16,185,129,0.3)'
                                      : item.status === 'running'
                                      ? 'rgba(245,158,11,0.3)'
                                      : 'var(--vl-border-subtle)',
                                }}
                              >
                                {item.status}
                              </Badge>
                              <p className="text-[9px] mt-0.5" style={{ color: 'var(--vl-text-muted)' }}>
                                {timeAgo(item.participatedAt)}
                              </p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              </TabsContent>

              {/* Tab 4: Response Analytics */}
              <TabsContent value="analytics" className="p-6 m-0 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Response Length Distribution */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl p-5 border"
                    style={{ borderColor: 'var(--vl-border-subtle)', background: 'var(--vl-bg-card)' }}
                  >
                    <ResponseLengthChart messages={agentMessages} color={agent.color} />
                  </motion.div>

                  {/* Word Frequency */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="rounded-xl p-5 border"
                    style={{ borderColor: 'var(--vl-border-subtle)', background: 'var(--vl-bg-card)' }}
                  >
                    <WordFrequencyChart
                      words={profile.responseStyle.mostUsedWords}
                      color={agent.color}
                    />
                  </motion.div>
                </div>

                {/* Participation Timeline */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="rounded-xl p-5 border"
                  style={{ borderColor: 'var(--vl-border-subtle)', background: 'var(--vl-bg-card)' }}
                >
                  <ParticipationTimeline messages={agentMessages} color={agent.color} />
                </motion.div>

                {/* Summary Stats */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="rounded-xl p-5 border"
                  style={{ borderColor: 'var(--vl-border-subtle)', background: 'var(--vl-bg-card)' }}
                >
                  <h4 className="text-xs font-semibold mb-4 flex items-center gap-1.5" style={{ color: 'var(--vl-text-heading)' }}>
                    <BarChart3 className="size-3.5" style={{ color: agent.color }} />
                    Analytics Summary
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: 'Total Messages', value: agentMessages.length },
                      { label: 'Avg Response', value: `${profile.responseStyle.avgResponseLength} chars` },
                      { label: 'Longest Response', value: `${agentMessages.length > 0 ? Math.max(...agentMessages.map(m => m.message.length)) : 0} chars` },
                      { label: 'Unique Words', value: new Set(agentMessages.flatMap(m => m.message.toLowerCase().split(/[^a-z]+/)).filter(w => w.length > 3)).size },
                    ].map((stat) => (
                      <div key={stat.label}>
                        <p className="text-[10px]" style={{ color: 'var(--vl-text-muted)' }}>{stat.label}</p>
                        <p className="text-lg font-bold" style={{ color: agent.color }}>{stat.value}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </TabsContent>
            </ScrollArea>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
