'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp, TrendingDown, BarChart3, MessageSquare,
  Users, Clock, ChevronDown,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { Agent, Meeting, AnalyticsData } from './shared-types'

// ============================================================
// Types
// ============================================================

type MetricKey = 'meetings' | 'messages' | 'agents' | 'duration'

interface MetricDef {
  key: MetricKey
  label: string
  labelZh: string
  icon: React.ElementType
  color: string
}

interface MetricStats {
  current: number
  previous: number
  change: number
  changePercent: number
  sparkData: number[]
  min: number
  max: number
  avg: number
}

// ============================================================
// Constants
// ============================================================

const METRICS: MetricDef[] = [
  { key: 'meetings', label: 'Total Meetings', labelZh: '会议总数', icon: BarChart3, color: '#10b981' },
  { key: 'messages', label: 'Messages', labelZh: '消息数', icon: MessageSquare, color: '#06b6d4' },
  { key: 'agents', label: 'Agents', labelZh: '智能体', icon: Users, color: '#f59e0b' },
  { key: 'duration', label: 'Avg Duration', labelZh: '平均时长', icon: Clock, color: '#8b5cf6' },
]

// ============================================================
// Helpers
// ============================================================

function generateSparkData(meetings: Meeting[], agents: Agent[], metric: MetricKey): number[] {
  const days = 30
  const now = Date.now()
  const oneDay = 24 * 60 * 60 * 1000

  // Group meetings by day
  const meetingCountsByDay: Record<string, number> = {}
  const messageCountsByDay: Record<string, number> = {}

  for (const m of meetings) {
    const dayIdx = Math.floor((now - new Date(m.createdAt).getTime()) / oneDay)
    const key = String(dayIdx)
    meetingCountsByDay[key] = (meetingCountsByDay[key] || 0) + 1
    messageCountsByDay[key] = (messageCountsByDay[key] || 0) + (m.messages?.length || 0)
  }

  const data: number[] = []

  for (let d = days - 1; d >= 0; d--) {
    const key = String(d)
    switch (metric) {
      case 'meetings':
        data.push(meetingCountsByDay[key] || 0)
        break
      case 'messages':
        data.push(messageCountsByDay[key] || 0)
        break
      case 'agents': {
        // Cumulative agent count by day
        const dayStart = now - (d + 1) * oneDay
        const count = agents.filter(a => new Date(a.createdAt).getTime() <= dayStart).length
        data.push(count)
        break
      }
      case 'duration': {
        // Average messages per meeting on that day
        const msgCount = messageCountsByDay[key] || 0
        const mtgCount = meetingCountsByDay[key] || 0
        data.push(mtgCount > 0 ? Math.round(msgCount / mtgCount) : 0)
        break
      }
    }
  }

  return data
}

function computeStats(sparkData: number[]): Omit<MetricStats, 'current' | 'previous' | 'change' | 'changePercent'> {
  const valid = sparkData.filter(n => n > 0)
  return {
    sparkData,
    min: valid.length > 0 ? Math.min(...valid) : 0,
    max: valid.length > 0 ? Math.max(...valid) : 0,
    avg: valid.length > 0 ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0,
  }
}

function buildSparklinePath(data: number[], width: number, height: number): string {
  if (data.length === 0) return ''
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const padding = 2
  const usableW = width - padding * 2
  const usableH = height - padding * 2
  const step = usableW / Math.max(data.length - 1, 1)

  const points = data.map((val, i) => {
    const x = padding + i * step
    const y = padding + usableH - ((val - min) / range) * usableH
    return `${x},${y}`
  })

  return `M${points.join(' L')}`
}

function buildGradientArea(data: number[], width: number, height: number): string {
  if (data.length === 0) return ''
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const padding = 2
  const usableW = width - padding * 2
  const usableH = height - padding * 2
  const step = usableW / Math.max(data.length - 1, 1)

  const points = data.map((val, i) => {
    const x = padding + i * step
    const y = padding + usableH - ((val - min) / range) * usableH
    return `${x},${y}`
  })

  const baseline = padding + usableH
  return `M${padding},${baseline} L${points.join(' L')} L${padding + (data.length - 1) * step},${baseline} Z`
}

// ============================================================
// Sub-components
// ============================================================

function SparklineChart({
  data,
  color,
  width = 200,
  height = 48,
}: {
  data: number[]
  color: string
  width?: number
  height?: number
}) {
  const path = buildSparklinePath(data, width, height)
  const area = buildGradientArea(data, width, height)
  const gradientId = `sparkline-grad-${color.replace('#', '')}`

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
      role="img"
      aria-label="Trend sparkline"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      {area && (
        <path
          d={area}
          fill={`url(#${gradientId})`}
        />
      )}
      {/* Line */}
      {path && (
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {/* End dot */}
      {data.length > 0 && (() => {
        const max = Math.max(...data, 1)
        const min = Math.min(...data, 0)
        const range = max - min || 1
        const padding = 2
        const usableH = height - padding * 2
        const lastVal = data[data.length - 1]
        const cx = width - padding
        const cy = padding + usableH - ((lastVal - min) / range) * usableH
        return (
          <circle
            cx={cx}
            cy={cy}
            r="2.5"
            fill={color}
            className="animate-pulse"
          />
        )
      })()}
    </svg>
  )
}

function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-md bg-[var(--vl-bg-inner)]">
      <span className="text-[9px] vl-text-muted">{label}</span>
      <span className="text-[11px] font-semibold vl-text-heading">{value}</span>
    </div>
  )
}

// ============================================================
// Main Component
// ============================================================

export function WidgetStatsTrend({
  lang = 'en',
  agents = [],
  meetings = [],
  analytics = null,
}: {
  lang?: Lang
  agents?: Agent[]
  meetings?: Meeting[]
  analytics?: AnalyticsData | null
}) {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('meetings')
  const currentDef = METRICS.find(m => m.key === selectedMetric) || METRICS[0]
  const Icon = currentDef.icon

  const stats = useMemo<MetricStats>(() => {
    const sparkData = generateSparkData(meetings, agents, selectedMetric)
    const { min, max, avg } = computeStats(sparkData)

    // Current period: last 15 days, previous period: before that
    const current = sparkData.slice(-15)
    const previous = sparkData.slice(0, 15)

    const currentSum = current.reduce((a, b) => a + b, 0)
    const previousSum = previous.reduce((a, b) => a + b, 0)

    const change = currentSum - previousSum
    const changePercent = previousSum > 0 ? Math.round((change / previousSum) * 100) : 0

    return {
      current: currentSum,
      previous: previousSum,
      change,
      changePercent,
      sparkData,
      min,
      max,
      avg,
    }
  }, [meetings, agents, selectedMetric])

  const isPositive = stats.changePercent >= 0

  const handleMetricChange = useCallback((key: MetricKey) => {
    setSelectedMetric(key)
  }, [])

  return (
    <div className="flex flex-col gap-3">
      {/* Metric selector */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {METRICS.map(m => {
          const MIcon = m.icon
          return (
            <button
              key={m.key}
              onClick={() => handleMetricChange(m.key)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all duration-200 whitespace-nowrap ${
                selectedMetric === m.key
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-[var(--vl-bg-inner)] vl-text-muted border border-transparent hover:border-[var(--vl-border)]'
              }`}
            >
              <MIcon className="size-3" style={selectedMetric === m.key ? { color: m.color } : undefined} />
              {lang === 'zh' ? m.labelZh : m.label}
            </button>
          )
        })}
      </div>

      {/* Current value + change */}
      <div className="flex items-end gap-3">
        <motion.div
          key={selectedMetric}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <span className="text-2xl font-bold vl-text-heading stat-number-animate">
            {stats.current.toLocaleString()}
          </span>
        </motion.div>
        <div className="flex items-center gap-1 pb-0.5">
          {isPositive ? (
            <TrendingUp className="size-3.5 text-emerald-400" />
          ) : (
            <TrendingDown className="size-3.5 text-red-400" />
          )}
          <span className={`text-xs font-semibold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{stats.changePercent}%
          </span>
        </div>
        <span className="text-[10px] vl-text-muted pb-0.5">
          vs {lang === 'zh' ? '上一周期' : 'last period'}
        </span>
      </div>

      {/* Sparkline */}
      <motion.div
        key={`spark-${selectedMetric}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="w-full"
      >
        <SparklineChart
          data={stats.sparkData}
          color={currentDef.color}
          width={280}
          height={52}
        />
      </motion.div>

      {/* Min / Max / Avg chips */}
      <div className="flex items-center justify-between gap-2">
        <StatChip label={lang === 'zh' ? '最小' : 'Min'} value={stats.min} />
        <StatChip label={lang === 'zh' ? '平均' : 'Avg'} value={stats.avg} />
        <StatChip label={lang === 'zh' ? '最大' : 'Max'} value={stats.max} />
        <div className="flex-1" />
        <span className="text-[9px] vl-text-muted">
          {lang === 'zh' ? '最近 30 天' : 'Last 30 days'}
        </span>
      </div>
    </div>
  )
}
