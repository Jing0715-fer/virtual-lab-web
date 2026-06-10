'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  BarChart3, Clock, MessageSquare, Users, CheckCircle2, Hash,
  TrendingUp, Calendar, Activity, Zap, BarChart3 as BarChartIcon,
  PieChart as PieChartIcon, LineChart as LineChartIcon, Target,
  Loader2,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Area, AreaChart, LineChart, Line,
  Tooltip as RechartsTooltip, Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { t } from '@/lib/i18n'

// ── Types ──
interface AnalyticsOverview {
  totalMeetings: number
  totalMessages: number
  avgDurationMin: number
  avgMessagesPerMeeting: number
  participationRate: number
  completionRate: number
  activeTopicsCount: number
  teamCount: number
  individualCount: number
}

interface HeatmapCell {
  week: number
  day: number
  count: number
  date: string
}

interface AgentContribution {
  agentName: string
  totalMessages: number
  meetingsParticipated: number
  avgResponseLength: number
}

interface ResponseTimePoint {
  round: number
  messagesPerRound: number
}

interface WeeklyTrendPoint {
  week: string
  count: number
}

interface AnalyticsData {
  overview: AnalyticsOverview
  heatmap: HeatmapCell[]
  agentContributions: AgentContribution[]
  meetingType: { team: number; individual: number }
  responseTime: ResponseTimePoint[]
  efficiencyScore: number
  weeklyTrend: WeeklyTrendPoint[]
}

// ── Animated Number Counter ──
function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let start = 0
    const end = value
    const duration = 1200
    const startTime = performance.now()
    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      start = eased * end
      setDisplay(decimals > 0 ? parseFloat(start.toFixed(decimals)) : Math.round(start))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [value, decimals])
  return <>{decimals > 0 ? display.toFixed(decimals) : display}</>
}

// ── Mini Sparkline SVG ──
function Sparkline({ data, color, width = 80, height = 28 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (!data || data.length < 2) return null
  const max = Math.max(...data, 1)
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - (v / max) * height}`).join(' ')
  return (
    <svg width={width} height={height} className="opacity-50">
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
    </svg>
  )
}

// ── Circular Gauge ──
function CircularGauge({ value, label, size = 140 }: { value: number; label: string; size?: number }) {
  const radius = (size - 16) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference
  const color = value >= 70 ? '#10b981' : value >= 40 ? '#f59e0b' : '#ef4444'

  return (
    <div className="gauge-container" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth="8"
          className="gauge-bg"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="gauge-circle"
          style={{ filter: `drop-shadow(0 0 6px ${color}66)` }}
        />
      </svg>
      <div className="gauge-label">
        <span className="text-2xl font-bold" style={{ color }}>{value}</span>
        <span className="text-[10px] vl-text-muted">{label}</span>
      </div>
    </div>
  )
}

// ── Stat Card ──
function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  color,
  gradient,
  sparkData,
}: {
  icon: React.ElementType
  label: string
  value: number
  suffix?: string
  color: string
  gradient: string
  sparkData?: number[]
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.03, y: -2 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <Card className="analytics-stat-card vl-card overflow-hidden">
        <div className={`stat-gradient-overlay ${gradient}`} />
        <CardContent className="p-4 relative z-10">
          <div className="flex items-center justify-between mb-2">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
              <Icon className="size-4 text-white" />
            </div>
            {sparkData && sparkData.length > 1 && (
              <Sparkline data={sparkData} color={color.includes('emerald') ? '#10b981' : color.includes('amber') ? '#f59e0b' : color.includes('cyan') ? '#06b6d4' : '#8b5cf6'} />
            )}
          </div>
          <p className="text-2xl font-bold vl-text-heading">
            <AnimatedNumber value={value} decimals={value % 1 !== 0 ? 1 : 0} />
            {suffix && <span className="text-sm vl-text-muted ml-0.5">{suffix}</span>}
          </p>
          <p className="text-[11px] vl-text-muted mt-0.5">{label}</p>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ── Heatmap ──
function ActivityHeatmap({ data }: { data: HeatmapCell[] }) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const maxCount = Math.max(...data.map((d) => d.count), 1)
  const weeks = [0, 1, 2, 3, 4]

  const getHeatLevel = (count: number): number => {
    if (count === 0) return 0
    const ratio = count / maxCount
    if (ratio <= 0.25) return 1
    if (ratio <= 0.5) return 2
    if (ratio <= 0.75) return 3
    return 4
  }

  return (
    <div className="overflow-x-auto">
      <div className="heatmap-container" style={{ minWidth: 360 }}>
        {days.map((day, i) => (
          <div key={day} className="heatmap-day-label" style={{ gridRow: 1, gridColumn: i + 2 }}>
            {day}
          </div>
        ))}
        {weeks.map((week) => (
          <div key={week} className="heatmap-label" style={{ gridRow: week + 2, gridColumn: 1 }}>
            W{week + 1}
          </div>
        ))}
        {data.map((cell, idx) => (
          <TooltipProvider key={idx}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`heatmap-cell heat-${getHeatLevel(cell.count)}`}
                  style={{ gridRow: cell.week + 2, gridColumn: cell.day + 2 }}
                />
              </TooltipTrigger>
              <TooltipContent className="analytics-tooltip">
                <p className="text-xs font-medium">{cell.date}</p>
                <p className="text-xs vl-text-muted">
                  {cell.count} meeting{cell.count !== 1 ? 's' : ''}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 justify-end">
        <span className="text-[10px] vl-text-muted">Less</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <div key={level} className={`heatmap-cell heat-${level}`} style={{ width: 12, height: 12, cursor: 'default' }} />
        ))}
        <span className="text-[10px] vl-text-muted">More</span>
      </div>
    </div>
  )
}

// ── Agent Contribution Bars ──
function AgentContributionChart({ data }: { data: AgentContribution[] }) {
  if (!data?.length) {
    return <p className="text-sm vl-text-muted text-center py-8">No agent data available</p>
  }

  const chartData = data.slice(0, 8).map((a) => ({
    name: a.agentName.length > 14 ? a.agentName.slice(0, 12) + '...' : a.agentName,
    fullName: a.agentName,
    messages: a.totalMessages,
    meetings: a.meetingsParticipated,
    avgLength: a.avgResponseLength,
  }))

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 36)}>
      <BarChart layout="vertical" data={chartData} margin={{ left: 10, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--vl-chart-grid)" />
        <XAxis type="number" tick={{ fill: 'var(--vl-chart-axis)', fontSize: 11 }} />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fill: 'var(--vl-chart-axis)', fontSize: 11 }}
          width={100}
        />
        <RechartsTooltip
          contentStyle={{
            background: 'var(--vl-bg-card)',
            border: '1px solid var(--vl-border)',
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value: number, name: string) => [value, name === 'messages' ? 'Messages' : name === 'meetings' ? 'Meetings' : 'Avg Length']}
          labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
        />
        <Bar dataKey="messages" fill="#10b981" radius={[0, 4, 4, 0]} barSize={14} name="messages" />
        <Bar dataKey="avgLength" fill="#06b6d4" radius={[0, 4, 4, 0]} barSize={14} name="avgLength" />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Meeting Type Donut ──
function MeetingTypeDonut({ team, individual }: { team: number; individual: number }) {
  const data = [
    { name: 'Team', value: team, color: '#10b981' },
    { name: 'Individual', value: individual, color: '#06b6d4' },
  ].filter((d) => d.value > 0)

  if (data.length === 0) {
    return <p className="text-sm vl-text-muted text-center py-8">No meetings yet</p>
  }

  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className="relative flex items-center justify-center">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
            animationBegin={0}
            animationDuration={1200}
          >
            {data.map((entry, idx) => (
              <Cell key={idx} fill={entry.color} stroke="none" />
            ))}
          </Pie>
          <RechartsTooltip
            contentStyle={{
              background: 'var(--vl-bg-card)',
              border: '1px solid var(--vl-border)',
              borderRadius: 8,
              fontSize: 12,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-bold vl-text-heading">{total}</span>
        <span className="text-[10px] vl-text-muted">Meetings</span>
      </div>
    </div>
  )
}

// ── Response Time Line Chart ──
function ResponseTimeChart({ data }: { data: ResponseTimePoint[] }) {
  if (!data?.length) {
    return <p className="text-sm vl-text-muted text-center py-8">No data available</p>
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="respGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--vl-chart-grid)" />
        <XAxis dataKey="round" tick={{ fill: 'var(--vl-chart-axis)', fontSize: 11 }} label={{ value: 'Round', position: 'insideBottom', offset: -5, fill: 'var(--vl-text-muted)', fontSize: 11 }} />
        <YAxis tick={{ fill: 'var(--vl-chart-axis)', fontSize: 11 }} />
        <RechartsTooltip
          contentStyle={{
            background: 'var(--vl-bg-card)',
            border: '1px solid var(--vl-border)',
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value: number) => [value.toFixed(1), 'Msgs/Round']}
        />
        <Line
          type="monotone"
          dataKey="messagesPerRound"
          stroke="#10b981"
          strokeWidth={2.5}
          dot={{ r: 4, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
          activeDot={{ r: 6, fill: '#10b981' }}
        />
        <Area type="monotone" dataKey="messagesPerRound" fill="url(#respGradient)" stroke="none" />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ── Weekly Trend Area Chart ──
function WeeklyTrendChart({ data }: { data: WeeklyTrendPoint[] }) {
  if (!data?.length) {
    return <p className="text-sm vl-text-muted text-center py-8">No data available</p>
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="weekGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--vl-chart-grid)" />
        <XAxis dataKey="week" tick={{ fill: 'var(--vl-chart-axis)', fontSize: 11 }} />
        <YAxis tick={{ fill: 'var(--vl-chart-axis)', fontSize: 11 }} allowDecimals={false} />
        <RechartsTooltip
          contentStyle={{
            background: 'var(--vl-bg-card)',
            border: '1px solid var(--vl-border)',
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value: number) => [value, 'Meetings']}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#06b6d4"
          strokeWidth={2.5}
          fill="url(#weekGradient)"
          dot={{ r: 4, fill: '#06b6d4', stroke: '#fff', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ── Section Wrapper ──
function Section({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className={`analytics-chart-container vl-card ${className || ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <Icon className="size-4 text-emerald-400" />
            </div>
            <CardTitle className="text-sm font-semibold vl-text-heading">{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">{children}</CardContent>
      </Card>
    </motion.div>
  )
}

// ════════════════════════════════════════════════════════════════
// Main Export: MeetingAnalyticsDashboard
// ════════════════════════════════════════════════════════════════
export function MeetingAnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const fetchData = async () => {
      try {
        const res = await fetch('/api/meeting-analytics')
        if (res.ok && !cancelled) {
          const json = await res.json()
          setData(json)
        }
      } catch (err) {
        if (!cancelled) {
          toast.error('Failed to load analytics data')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [])

  const sparkData = useMemo(() => {
    if (!data) return {}
    return {
      meetings: data.weeklyTrend.map((d) => d.count),
      messages: data.responseTime.map((d) => d.messagesPerRound),
    }
  }, [data])

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl vl-card animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-64 rounded-xl vl-card animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <BarChart3 className="size-12 text-emerald-400/40" />
        <p className="vl-text-muted text-sm">No analytics data available</p>
        <p className="vl-text-muted text-xs">Create and run meetings to see analytics</p>
      </div>
    )
  }

  const overview = data?.overview

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* ── Overview Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 analytics-grid-6">
        <StatCard
          icon={BarChart3}
          label="Total Meetings"
          value={overview?.totalMeetings ?? 0}
          color="bg-emerald-500/20"
          gradient="bg-gradient-to-br from-emerald-500/10 to-cyan-500/5"
          sparkData={sparkData.meetings}
        />
        <StatCard
          icon={Clock}
          label="Avg Duration"
          value={overview?.avgDurationMin ?? 0}
          suffix="m"
          color="bg-cyan-500/20"
          gradient="bg-gradient-to-br from-cyan-500/10 to-blue-500/5"
        />
        <StatCard
          icon={MessageSquare}
          label="Msgs/Meeting"
          value={overview?.avgMessagesPerMeeting ?? 0}
          decimals={1}
          color="bg-violet-500/20"
          gradient="bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5"
          sparkData={sparkData.messages}
        />
        <StatCard
          icon={Users}
          label="Participation Rate"
          value={overview?.participationRate ?? 0}
          suffix="%"
          color="bg-amber-500/20"
          gradient="bg-gradient-to-br from-amber-500/10 to-orange-500/5"
        />
        <StatCard
          icon={CheckCircle2}
          label="Completion Rate"
          value={overview?.completionRate ?? 0}
          suffix="%"
          color="bg-teal-500/20"
          gradient="bg-gradient-to-br from-teal-500/10 to-emerald-500/5"
        />
        <StatCard
          icon={Hash}
          label="Active Topics"
          value={overview?.activeTopicsCount ?? 0}
          color="bg-rose-500/20"
          gradient="bg-gradient-to-br from-rose-500/10 to-pink-500/5"
        />
      </div>

      {/* ── Charts Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 analytics-charts-grid">
        {/* Heatmap */}
        <Section title="Meeting Activity Heatmap" icon={Calendar} className="lg:col-span-2">
          <ActivityHeatmap data={data?.heatmap ?? []} />
        </Section>

        {/* Meeting Efficiency Gauge */}
        <Section title="Meeting Efficiency Score" icon={Target}>
          <div className="flex flex-col items-center gap-4 py-4">
            <CircularGauge value={data?.efficiencyScore ?? 0} label="out of 100" size={140} />
            <div className="text-center">
              <p className="text-xs vl-text-muted">
                {data && data.efficiencyScore >= 70
                  ? 'Excellent meeting quality'
                  : data && data.efficiencyScore >= 40
                    ? 'Good meeting efficiency'
                    : 'Needs improvement'}
              </p>
            </div>
          </div>
        </Section>

        {/* Agent Contributions */}
        <Section title="Agent Contribution Scores" icon={Users} className="lg:col-span-2">
          <div className="analytics-scrollable" style={{ maxHeight: data && data.agentContributions.length > 5 ? 320 : undefined }}>
            <AgentContributionChart data={data?.agentContributions ?? []} />
          </div>
        </Section>

        {/* Meeting Type Donut */}
        <Section title="Meeting Type Distribution" icon={PieChartIcon}>
          <MeetingTypeDonut team={data?.meetingType.team ?? 0} individual={data?.meetingType.individual ?? 0} />
          <div className="flex justify-center gap-4 mt-2">
            <div className="flex items-center gap-1.5 text-xs">
              <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              <span className="vl-text-muted">Team</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <div className="w-2.5 h-2.5 rounded-sm bg-cyan-500" />
              <span className="vl-text-muted">Individual</span>
            </div>
          </div>
        </Section>

        {/* Response Time Analysis */}
        <Section title="Response Time Analysis" icon={Activity}>
          <ResponseTimeChart data={data?.responseTime ?? []} />
        </Section>

        {/* Weekly Trend */}
        <Section title="Weekly Trend" icon={TrendingUp} className="lg:col-span-2">
          <WeeklyTrendChart data={data?.weeklyTrend ?? []} />
        </Section>
      </div>
    </div>
  )
}

export default MeetingAnalyticsDashboard
