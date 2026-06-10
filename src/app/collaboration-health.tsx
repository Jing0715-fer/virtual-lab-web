'use client'

import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity, Users, MessageSquare, Clock, Target, Heart,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  UserPlus, BarChart3, ArrowRight, Lightbulb, RefreshCw,
  Brain, Shield, Zap, PieChart, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { Agent, Meeting } from './shared-components'

// ============================================================
// Types
// ============================================================

interface Props {
  agents: Agent[]
  meetings: Meeting[]
}

interface HealthDimensions {
  participationBalance: number // 0-100, Gini-based (inverted so higher = better)
  meetingCadence: number       // 0-100
  responseQuality: number      // 0-100
  agentCoverage: number        // 0-100
}

interface HealthRecommendation {
  id: string
  icon: React.ElementType
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  color: string
}

// ============================================================
// Helpers
// ============================================================

function giniCoefficient(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const n = sorted.length
  if (n === 0) return 0
  const mean = sorted.reduce((a, b) => a + b, 0) / n
  if (mean === 0) return 0

  let sumDiff = 0
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      sumDiff += Math.abs(sorted[i] - sorted[j])
    }
  }
  return sumDiff / (2 * n * n * mean)
}

function getMeetingParticipants(m: Meeting): string[] {
  const names: string[] = []
  if (m.teamLead?.title) names.push(m.teamLead.title)
  if (m.teamMembers) m.teamMembers.forEach(a => { if (!names.includes(a.title)) names.push(a.title) })
  if (m.teamMember?.title && !names.includes(m.teamMember.title)) names.push(m.teamMember.title)
  return names
}

function computeHealthDimensions(agents: Agent[], meetings: Meeting[]): HealthDimensions {
  const now = new Date()
  const completedMeetings = meetings.filter(m => m.status === 'completed')
  const allMessages = completedMeetings.flatMap(m => m.messages || [])

  // --- Participation Balance (Gini of message counts) ---
  const agentMsgCounts: Record<string, number> = {}
  agents.forEach(a => { agentMsgCounts[a.title] = 0 })
  allMessages.forEach(msg => {
    if (msg.agentName !== 'User') {
      agentMsgCounts[msg.agentName] = (agentMsgCounts[msg.agentName] || 0) + 1
    }
  })
  const counts = Object.values(agentMsgCounts).filter(c => c > 0)
  const gini = counts.length > 1 ? giniCoefficient(counts) : 0
  const participationBalance = Math.round((1 - gini) * 100) // higher = more equal = better

  // --- Meeting Cadence (avg meetings per week, scored) ---
  const meetingsByWeek = new Map<string, Meeting[]>()
  meetings.forEach(m => {
    const d = new Date(m.createdAt)
    const weekStart = new Date(d)
    weekStart.setDate(d.getDate() - d.getDay())
    const key = weekStart.toISOString().slice(0, 10)
    if (!meetingsByWeek.has(key)) meetingsByWeek.set(key, [])
    meetingsByWeek.get(key)!.push(m)
  })
  const avgMeetingsPerWeek = meetingsByWeek.size > 0
    ? meetings.reduce((sum) => sum + 1, 0) / Math.max(meetingsByWeek.size, 1)
    : 0
  // Ideal: 2-4 per week. Score: too few or too many = lower
  let meetingCadence: number
  if (avgMeetingsPerWeek >= 2 && avgMeetingsPerWeek <= 4) {
    meetingCadence = 95
  } else if (avgMeetingsPerWeek >= 1 && avgMeetingsPerWeek <= 6) {
    meetingCadence = 75
  } else if (avgMeetingsPerWeek > 0) {
    meetingCadence = 50
  } else {
    meetingCadence = 10
  }

  // --- Response Quality (avg message length, keyword diversity) ---
  const msgLengths = allMessages.map(m => m.message.length)
  const avgLength = msgLengths.length > 0 ? msgLengths.reduce((a, b) => a + b, 0) / msgLengths.length : 0
  // Score based on length: >200 chars = excellent, >100 = good, >50 = ok
  let qualityByLength: number
  if (avgLength > 200) qualityByLength = 95
  else if (avgLength > 150) qualityByLength = 85
  else if (avgLength > 100) qualityByLength = 70
  else if (avgLength > 50) qualityByLength = 55
  else if (avgLength > 0) qualityByLength = 40
  else qualityByLength = 10

  // Keyword diversity
  const uniqueWords = new Set<string>()
  allMessages.forEach(msg => {
    msg.message.toLowerCase().split(/\s+/).filter(w => w.length > 3).forEach(w => uniqueWords.add(w))
  })
  const diversityRatio = msgLengths.length > 0 ? uniqueWords.size / msgLengths.length : 0
  const qualityByDiversity = Math.min(100, Math.round(diversityRatio * 50))
  const responseQuality = Math.round(qualityByLength * 0.7 + qualityByDiversity * 0.3)

  // --- Agent Coverage (% of agents used in last 30 days) ---
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const recentMeetings = meetings.filter(m => new Date(m.createdAt) >= thirtyDaysAgo)
  const usedAgents = new Set<string>()
  recentMeetings.forEach(m => {
    getMeetingParticipants(m).forEach(name => usedAgents.add(name))
  })
  const agentCoverage = agents.length > 0 ? Math.round((usedAgents.size / agents.length) * 100) : 0

  return {
    participationBalance,
    meetingCadence,
    responseQuality,
    agentCoverage,
  }
}

function generateRecommendations(
  dimensions: HealthDimensions,
  agents: Agent[],
  meetings: Meeting[]
): HealthRecommendation[] {
  const recs: HealthRecommendation[] = []

  // Low participation balance
  if (dimensions.participationBalance < 60) {
    const allMessages = meetings.flatMap(m => m.messages || [])
    const agentCounts: Record<string, number> = {}
    allMessages.forEach(msg => {
      if (msg.agentName !== 'User') {
        agentCounts[msg.agentName] = (agentCounts[msg.agentName] || 0) + 1
      }
    })
    const dominant = Object.entries(agentCounts).sort((a, b) => b[1] - a[1])[0]
    const quiet = Object.entries(agentCounts).sort((a, b) => a[1] - b[1])[0]

    if (dominant) {
      recs.push({
        id: 'rec-balance',
        icon: BarChart3,
        title: 'Balance Team Participation',
        description: dominant[0] ? `${dominant[0]} dominates the discussion. ${quiet?.[0] || 'Some agents'} could contribute more. Consider using structured turn-taking.` : 'Some agents dominate discussions. Balance participation for richer insights.',
        priority: dimensions.participationBalance < 40 ? 'high' : 'medium',
        color: 'text-amber-400',
      })
    }
  }

  // Low agent coverage
  if (dimensions.agentCoverage < 70) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const unusedAgents = agents.filter(a => {
      return !meetings.some(m => {
        if (new Date(m.createdAt) < thirtyDaysAgo) return false
        const parts = getMeetingParticipants(m)
        return parts.includes(a.title)
      })
    })

    if (unusedAgents.length > 0) {
      recs.push({
        id: 'rec-coverage',
        icon: UserPlus,
        title: `Engage ${unusedAgents.length} Idle Agent${unusedAgents.length > 1 ? 's' : ''}`,
        description: `${unusedAgents.slice(0, 2).map(a => a.title).join(', ')}${unusedAgents.length > 2 ? ` and ${unusedAgents.length - 2} others` : ''} haven't participated in the last 30 days. Schedule meetings to leverage their expertise.`,
        priority: 'high',
        color: 'text-red-400',
      })
    }
  }

  // Meeting cadence issues
  if (dimensions.meetingCadence < 60) {
    recs.push({
      id: 'rec-cadence',
      icon: Clock,
      title: 'Optimize Meeting Cadence',
      description: dimensions.meetingCadence < 30
        ? 'Very few meetings scheduled. Regular collaboration improves research velocity. Aim for 2-4 meetings per week.'
        : 'Meeting frequency is suboptimal. Consider spreading meetings more evenly across the week.',
      priority: 'medium',
      color: 'text-cyan-400',
    })
  }

  // Response quality
  if (dimensions.responseQuality < 65) {
    recs.push({
      id: 'rec-quality',
      icon: Brain,
      title: 'Improve Response Quality',
      description: 'Average responses are shorter than ideal. Consider increasing temperature slightly or providing more detailed agenda prompts to elicit deeper analysis.',
      priority: 'medium',
      color: 'text-violet-400',
    })
  }

  // Always suggest something positive
  if (dimensions.participationBalance >= 80) {
    recs.push({
      id: 'rec-good-balance',
      icon: CheckCircle2,
      title: 'Excellent Team Balance',
      description: 'Your team participation is well-distributed. Keep maintaining this collaborative approach for continued research success.',
      priority: 'low',
      color: 'text-emerald-400',
    })
  }

  return recs.sort((a, b) => {
    const pOrder = { high: 0, medium: 1, low: 2 }
    return pOrder[a.priority] - pOrder[b.priority]
  })
}

// ============================================================
// Health Score Gauge (SVG)
// ============================================================

function HealthScoreGauge({ score, animate = true }: { score: number; animate?: boolean }) {
  const [displayScore, setDisplayScore] = useState(animate ? 0 : score)

  useEffect(() => {
    if (!animate) return
    let start = 0
    const duration = 1200
    const startTime = Date.now()

    const animateFrame = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setDisplayScore(Math.round(eased * score))

      if (progress < 1) {
        requestAnimationFrame(animateFrame)
      }
    }

    requestAnimationFrame(animateFrame)
  }, [score, animate])

  const radius = 90
  const strokeWidth = 12
  const center = 110
  const circumference = 2 * Math.PI * radius

  // Determine color based on score
  const getScoreColor = (s: number) => {
    if (s >= 75) return { primary: '#10b981', secondary: '#34d399', glow: 'rgba(16, 185, 129, 0.2)' }
    if (s >= 60) return { primary: '#eab308', secondary: '#facc15', glow: 'rgba(234, 179, 8, 0.2)' }
    if (s >= 40) return { primary: '#f59e0b', secondary: '#fbbf24', glow: 'rgba(245, 158, 11, 0.2)' }
    return { primary: '#ef4444', secondary: '#f87171', glow: 'rgba(239, 68, 68, 0.2)' }
  }

  const colors = getScoreColor(displayScore)
  const dashOffset = circumference - (displayScore / 100) * circumference

  const getScoreLabel = (s: number) => {
    if (s >= 75) return 'Excellent'
    if (s >= 60) return 'Good'
    if (s >= 40) return 'Fair'
    return 'Needs Attention'
  }

  const getScoreEmoji = (s: number) => {
    if (s >= 75) return '🟢'
    if (s >= 60) return '🟡'
    if (s >= 40) return '🟠'
    return '🔴'
  }

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={220} height={220} viewBox={`0 0 ${center * 2} ${center * 2}`}>
        <defs>
          <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.primary} />
            <stop offset="100%" stopColor={colors.secondary} />
          </linearGradient>
          <filter id="gauge-glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          {/* Background track gradient */}
          <linearGradient id="track-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--vl-border)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--vl-border)" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Glow circle behind */}
        <circle
          cx={center}
          cy={center}
          r={radius + 8}
          fill="none"
          stroke={colors.glow}
          strokeWidth="24"
          filter="url(#gauge-glow)"
          opacity="0"
          style={{
            animation: 'gaugeGlow 2s ease 0.8s forwards',
          }}
        />

        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="url(#track-gradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Progress arc */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="url(#gauge-gradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
          transform={`rotate(-90 ${center} ${center})`}
          filter="url(#gauge-glow)"
        />

        {/* Score text */}
        <text
          x={center}
          y={center - 8}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--vl-text-white)"
          fontSize="48"
          fontWeight="800"
          style={{ fontFeatureSettings: '"tnum"' }}
        >
          {displayScore}
        </text>
        <text
          x={center}
          y={center + 20}
          textAnchor="middle"
          fill="var(--vl-text-muted)"
          fontSize="12"
          fontWeight="500"
        >
          {getScoreLabel(displayScore)}
        </text>

        {/* Small decorative dots at quarter positions */}
        {[0, 90, 180, 270].map((angle, i) => {
          const rad = (angle - 90) * Math.PI / 180
          const x = center + (radius + strokeWidth + 4) * Math.cos(rad)
          const y = center + (radius + strokeWidth + 4) * Math.sin(rad)
          return (
            <circle
              key={`dot-${i}`}
              cx={x}
              cy={y}
              r="1.5"
              fill="var(--vl-text-muted)"
              opacity="0.3"
            />
          )
        })}
      </svg>

      {/* CSS animation for glow */}
      <style jsx>{`
        @keyframes gaugeGlow {
          from { opacity: 0; }
          to { opacity: 0.6; }
        }
      `}</style>
    </div>
  )
}

// ============================================================
// Dimension Card Component
// ============================================================

function DimensionCard({
  title,
  icon: Icon,
  score,
  color,
  description,
  children,
}: {
  title: string
  icon: React.ElementType
  score: number
  color: string
  description: string
  children: React.ReactNode
}) {
  const barColor = score >= 75 ? '#10b981' : score >= 60 ? '#eab308' : score >= 40 ? '#f59e0b' : '#ef4444'

  return (
    <Card className="vl-card backdrop-blur-sm transition-all duration-200 hover:shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
              <Icon className="size-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--vl-text-white)' }}>
                {title}
              </h3>
              <p className="text-[10px] vl-text-muted">{description}</p>
            </div>
          </div>
          <span className="text-2xl font-bold" style={{ color: barColor }}>{score}</span>
        </div>
        {children}
      </CardContent>
    </Card>
  )
}

// ============================================================
// Participation Balance Bar
// ============================================================

function ParticipationBalanceBar({ agents, meetings }: { agents: Agent[]; meetings: Meeting[] }) {
  const data = useMemo(() => {
    const allMessages = meetings.flatMap(m => m.messages || [])
    const agentCounts: { name: string; count: number; color: string }[] = []
    agents.forEach(a => {
      const count = allMessages.filter(msg => msg.agentName === a.title).length
      if (count > 0) agentCounts.push({ name: a.title, count, color: a.color })
    })
    return agentCounts.sort((a, b) => b.count - a.count)
  }, [agents, meetings])

  const maxCount = Math.max(...data.map(d => d.count), 1)
  const total = data.reduce((a, b) => a + b.count, 0)

  if (data.length === 0) {
    return <p className="text-xs vl-text-muted text-center py-4">No message data available</p>
  }

  return (
    <div className="space-y-2">
      {/* Stacked bar */}
      <div className="h-6 rounded-full overflow-hidden flex">
        {data.map((d, i) => (
          <motion.div
            key={d.name}
            className="h-full transition-all duration-300 hover:opacity-80 relative group"
            style={{
              width: `${(d.count / total) * 100}%`,
              backgroundColor: d.color,
            }}
            initial={{ width: 0 }}
            animate={{ width: `${(d.count / total) * 100}%` }}
            transition={{ duration: 0.5, delay: i * 0.05 }}
          >
            {(d.count / total) > 0.1 && (
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white truncate px-1">
                {d.name.split(' ')[0]}
              </span>
            )}
          </motion.div>
        ))}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {data.map(d => (
          <div key={d.name} className="flex items-center gap-1 text-[10px]">
            <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
            <span className="vl-text-muted">{d.name.length > 12 ? d.name.slice(0, 12) + '…' : d.name}</span>
            <span className="font-mono vl-text-muted">{Math.round((d.count / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// Agent Coverage Pie Chart (SVG)
// ============================================================

function AgentCoveragePie({ used, total }: { used: number; total: number }) {
  const unused = total - used
  const pct = total > 0 ? used / total : 0

  const radius = 50
  const cx = 65
  const cy = 65
  const circumference = 2 * Math.PI * radius
  const dashArray = `${pct * circumference} ${circumference}`

  return (
    <div className="flex items-center gap-4">
      <svg width={130} height={130} viewBox="0 0 130 130">
        {/* Background circle */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="var(--vl-bg-inner)"
          strokeWidth="14"
        />
        {/* Used arc */}
        <motion.circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#10b981"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={dashArray}
          transform={`rotate(-90 ${cx} ${cy})`}
          initial={{ strokeDasharray: `0 ${circumference}` }}
          animate={{ strokeDasharray: dashArray }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
        {/* Center text */}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--vl-text-white)"
          fontSize="24"
          fontWeight="700"
        >
          {Math.round(pct * 100)}%
        </text>
        <text
          x={cx}
          y={cy + 16}
          textAnchor="middle"
          fill="var(--vl-text-muted)"
          fontSize="10"
        >
          {used}/{total} agents
        </text>
      </svg>
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-emerald-500" />
          <span className="vl-text-muted">Active: <span className="font-medium text-emerald-400">{used}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-[var(--vl-bg-inner)]" />
          <span className="vl-text-muted">Idle: <span className="font-medium text-red-400">{unused}</span></span>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Historical Health Trend Chart (SVG)
// ============================================================

function HistoricalTrendChart({ meetings, agents }: { meetings: Meeting[]; agents: Agent[] }) {
  const trendData = useMemo(() => {
    // Compute health score per week for last 6 available weeks
    const now = new Date()
    const weeks: { label: string; score: number }[] = []

    for (let w = 5; w >= 0; w--) {
      const weekEnd = new Date(now.getTime() - w * 7 * 24 * 60 * 60 * 1000)
      const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000)

      const weekMeetings = meetings.filter(m => {
        const d = new Date(m.createdAt)
        return d >= weekStart && d < weekEnd
      })

      if (weekMeetings.length === 0 && w > 0) continue

      const dims = computeHealthDimensions(agents, weekMeetings.length > 0 ? [...meetings.filter(m => new Date(m.createdAt) < weekEnd), ...weekMeetings] : meetings)
      const score = Math.round(
        dims.participationBalance * 0.25 +
        dims.meetingCadence * 0.25 +
        dims.responseQuality * 0.25 +
        dims.agentCoverage * 0.25
      )

      const dateStr = weekStart.toLocaleDateString('en', { month: 'short', day: 'numeric' })
      weeks.push({ label: dateStr, score })
    }

    return weeks
  }, [meetings, agents])

  if (trendData.length < 2) return null

  const width = 500
  const height = 140
  const padding = { top: 10, right: 10, bottom: 25, left: 30 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const maxScore = 100
  const getX = (i: number) => padding.left + (i / Math.max(trendData.length - 1, 1)) * chartW
  const getY = (v: number) => padding.top + chartH - (v / maxScore) * chartH

  const points = trendData.map((d, i) => `${getX(i)},${getY(d.score)}`).join(' ')
  const areaPath = `M ${getX(0)} ${getY(trendData[0].score)} ${trendData.slice(1).map((d, i) => `L ${getX(i + 1)} ${getY(d.score)}`).join(' ')} L ${getX(trendData.length - 1)} ${padding.top + chartH} L ${getX(0)} ${padding.top + chartH} Z`

  const currentScore = trendData[trendData.length - 1].score
  const prevScore = trendData.length > 1 ? trendData[trendData.length - 2].score : currentScore
  const trend = currentScore > prevScore ? 'up' : currentScore < prevScore ? 'down' : 'stable'

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {trend === 'up' && <ArrowUpRight className="size-3.5 text-emerald-400" />}
        {trend === 'down' && <ArrowDownRight className="size-3.5 text-red-400" />}
        {trend === 'stable' && <TrendingUp className="size-3.5 text-slate-400" />}
        <span className="text-xs vl-text-muted">
          {trend === 'up' ? 'Improving' : trend === 'down' ? 'Declining' : 'Stable'} over recent weeks
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="hist-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid */}
        {[0, 50, 100].map(v => {
          const y = getY(v)
          return (
            <g key={`grid-${v}`}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="var(--vl-chart-grid)" strokeWidth="0.5" strokeDasharray="3,3" />
              <text x={padding.left - 6} y={y + 3} textAnchor="end" fill="var(--vl-chart-axis)" fontSize="9">{v}</text>
            </g>
          )
        })}

        {/* Area */}
        <motion.path
          d={areaPath}
          fill="url(#hist-grad)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />

        {/* Line */}
        <motion.polyline
          points={points}
          fill="none"
          stroke="#10b981"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8 }}
        />

        {/* Data points */}
        {trendData.map((d, i) => (
          <motion.circle
            key={i}
            cx={getX(i)}
            cy={getY(d.score)}
            r="3"
            fill="#10b981"
            stroke="var(--vl-bg-card)"
            strokeWidth="1.5"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3 + i * 0.08 }}
          />
        ))}

        {/* X labels */}
        {trendData.map((d, i) => (
          <text
            key={`x-${i}`}
            x={getX(i)}
            y={height - 6}
            textAnchor="middle"
            fill="var(--vl-chart-axis)"
            fontSize="9"
          >
            {d.label}
          </text>
        ))}
      </svg>
    </div>
  )
}

// ============================================================
// Main Component
// ============================================================

export default function CollaborationHealth({ agents, meetings }: Props) {
  const dimensions = useMemo(
    () => computeHealthDimensions(agents, meetings),
    [agents, meetings]
  )

  const overallScore = Math.round(
    dimensions.participationBalance * 0.25 +
    dimensions.meetingCadence * 0.25 +
    dimensions.responseQuality * 0.25 +
    dimensions.agentCoverage * 0.25
  )

  const recommendations = useMemo(
    () => generateRecommendations(dimensions, agents, meetings),
    [dimensions, agents, meetings]
  )

  // Agent response quality data for bar chart
  const agentQualityData = useMemo(() => {
    const allMessages = meetings.filter(m => m.status === 'completed').flatMap(m => m.messages || [])
    return agents.map(a => {
      const msgs = allMessages.filter(msg => msg.agentName === a.title)
      const avgLen = msgs.length > 0
        ? msgs.reduce((sum, m) => sum + m.message.length, 0) / msgs.length
        : 0
      return { agent: a, avgLength: Math.round(avgLen), msgCount: msgs.length }
    }).sort((a, b) => b.avgLength - a.avgLength)
  }, [agents, meetings])

  // Meeting cadence data
  const meetingsPerWeek = useMemo(() => {
    const weeks = new Map<string, number>()
    meetings.forEach(m => {
      const d = new Date(m.createdAt)
      const weekStart = new Date(d)
      weekStart.setDate(d.getDate() - d.getDay())
      const key = weekStart.toISOString().slice(0, 10)
      weeks.set(key, (weeks.get(key) || 0) + 1)
    })
    return Array.from(weeks.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
  }, [meetings])

  const avgCadence = meetingsPerWeek.length > 0
    ? (meetingsPerWeek.reduce((a, b) => a + b[1], 0) / meetingsPerWeek.length).toFixed(1)
    : '0'

  const usedAgentsCount = useMemo(() => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const recentMeetings = meetings.filter(m => new Date(m.createdAt) >= thirtyDaysAgo)
    const used = new Set<string>()
    recentMeetings.forEach(m => getMeetingParticipants(m).forEach(name => used.add(name)))
    return used.size
  }, [meetings])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
          <Heart className="size-4 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--vl-text-white)' }}>
            Collaboration Health
          </h2>
          <p className="text-sm vl-text-muted">Team collaboration quality metrics and actionable insights</p>
        </div>
      </div>

      {/* Overall Score + Gauge */}
      <Card className="vl-card backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex flex-col items-center">
              <HealthScoreGauge score={overallScore} animate={true} />
              <p className="text-xs vl-text-muted mt-2">Composite Health Score</p>
            </div>

            <div className="flex-1 space-y-4 w-full">
              {/* Dimension summary bars */}
              {[
                { label: 'Participation Balance', score: dimensions.participationBalance, icon: Users, weight: '25%' },
                { label: 'Meeting Cadence', score: dimensions.meetingCadence, icon: Clock, weight: '25%' },
                { label: 'Response Quality', score: dimensions.responseQuality, icon: MessageSquare, weight: '25%' },
                { label: 'Agent Coverage', score: dimensions.agentCoverage, icon: UserPlus, weight: '25%' },
              ].map((dim, i) => {
                const barColor = dim.score >= 75 ? '#10b981' : dim.score >= 60 ? '#eab308' : dim.score >= 40 ? '#f59e0b' : '#ef4444'
                return (
                  <div key={dim.label} className="flex items-center gap-3">
                    <dim.icon className="size-4 vl-text-muted shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium" style={{ color: 'var(--vl-text-white)' }}>
                          {dim.label}
                        </span>
                        <span className="text-[10px] vl-text-muted">{dim.weight} weight</span>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--vl-bg-inner)] overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: barColor }}
                          initial={{ width: 0 }}
                          animate={{ width: `${dim.score}%` }}
                          transition={{ duration: 0.6, delay: i * 0.1 }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-bold min-w-[32px] text-right" style={{ color: barColor }}>
                      {dim.score}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4 Dimension Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Participation Balance */}
        <DimensionCard
          title="Participation Balance"
          icon={Users}
          score={dimensions.participationBalance}
          color="bg-emerald-500/20"
          description="Message distribution equality"
        >
          <ParticipationBalanceBar agents={agents} meetings={meetings} />
        </DimensionCard>

        {/* Meeting Cadence */}
        <DimensionCard
          title="Meeting Cadence"
          icon={Clock}
          score={dimensions.meetingCadence}
          color="bg-cyan-500/20"
          description={`Avg ${avgCadence} meetings/week`}
        >
          <div className="space-y-1.5">
            {meetingsPerWeek.map(([week, count]) => {
              const barW = Math.min(100, (count / Math.max(...meetingsPerWeek.map(([_, c]) => c), 1)) * 100)
              const barColor = count >= 2 && count <= 4 ? '#10b981' : count >= 1 ? '#eab308' : '#ef4444'
              return (
                <div key={week} className="flex items-center gap-2">
                  <span className="text-[10px] vl-text-muted w-16 truncate">{week.slice(5)}</span>
                  <div className="flex-1 h-3 rounded-full bg-[var(--vl-bg-inner)] overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: barColor }}
                      initial={{ width: 0 }}
                      animate={{ width: `${barW}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                  <span className="text-[10px] font-mono vl-text-muted w-4">{count}</span>
                </div>
              )
            })}
            <div className="flex items-center gap-2 pt-1 border-t border-[var(--vl-border-subtle)]">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[9px] vl-text-muted">Healthy (2-4/wk)</span>
              </div>
            </div>
          </div>
        </DimensionCard>

        {/* Response Quality */}
        <DimensionCard
          title="Response Quality"
          icon={MessageSquare}
          score={dimensions.responseQuality}
          color="bg-violet-500/20"
          description="Avg message length & diversity"
        >
          <div className="space-y-1.5 max-h-[160px] overflow-y-auto custom-scrollbar">
            {agentQualityData.slice(0, 5).map((d, i) => {
              const maxLen = agentQualityData[0]?.avgLength || 1
              const barW = (d.avgLength / maxLen) * 100
              return (
                <div key={d.agent.id} className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: d.agent.color }}
                  />
                  <span className="text-[10px] vl-text-muted truncate max-w-[60px]">{d.agent.title.split(' ')[0]}</span>
                  <div className="flex-1 h-2.5 rounded-full bg-[var(--vl-bg-inner)] overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: d.agent.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${barW}%` }}
                      transition={{ duration: 0.4, delay: i * 0.05 }}
                    />
                  </div>
                  <span className="text-[10px] font-mono vl-text-muted">{d.avgLen}</span>
                </div>
              )
            })}
          </div>
        </DimensionCard>

        {/* Agent Coverage */}
        <DimensionCard
          title="Agent Coverage"
          icon={UserPlus}
          score={dimensions.agentCoverage}
          color="bg-amber-500/20"
          description="Active in last 30 days"
        >
          <AgentCoveragePie used={usedAgentsCount} total={agents.length} />
        </DimensionCard>
      </div>

      {/* Recommendations + Historical Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recommendations */}
        <Card className="vl-card backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="size-4 text-amber-400" />
              <CardTitle className="text-base font-semibold" style={{ color: 'var(--vl-text-white)' }}>
                Recommendations
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            {recommendations.map((rec, i) => (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="vl-inner rounded-lg p-3 group hover:bg-[var(--vl-bg-card-hover)] transition-colors"
              >
                <div className="flex items-start gap-2.5">
                  <div className={`mt-0.5 shrink-0 ${rec.color}`}>
                    <rec.icon className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="text-sm font-semibold" style={{ color: 'var(--vl-text-white)' }}>
                        {rec.title}
                      </h4>
                      <Badge
                        variant="outline"
                        className={`text-[9px] px-1.5 py-0 ${
                          rec.priority === 'high'
                            ? 'border-red-500/30 text-red-400'
                            : rec.priority === 'medium'
                            ? 'border-amber-500/30 text-amber-400'
                            : 'border-emerald-500/30 text-emerald-400'
                        }`}
                      >
                        {rec.priority}
                      </Badge>
                    </div>
                    <p className="text-xs vl-text-muted leading-relaxed">{rec.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
            {recommendations.length === 0 && (
              <p className="text-xs vl-text-muted text-center py-4">All health metrics are excellent!</p>
            )}
          </CardContent>
        </Card>

        {/* Historical Trend */}
        <Card className="vl-card backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-emerald-400" />
              <CardTitle className="text-base font-semibold" style={{ color: 'var(--vl-text-white)' }}>
                Health Score Trend
              </CardTitle>
            </div>
            <CardDescription className="text-xs vl-text-muted">
              Weekly composite health score
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <HistoricalTrendChart meetings={meetings} agents={agents} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
