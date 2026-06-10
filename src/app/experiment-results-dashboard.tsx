'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  BarChart3, PieChart, Clock, TrendingUp, Activity,
  Beaker, CheckCircle2, Play, XCircle, Layers, Archive,
  Target, Flame, Calendar, Zap, ArrowUpDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

// ============================================================
// Types (shared with tracker)
// ============================================================

type ExperimentStatus = 'planned' | 'running' | 'completed' | 'failed' | 'archived'
type ExperimentPriority = 'low' | 'medium' | 'high' | 'critical'

interface ExperimentVariable {
  name: string
  type: 'independent' | 'dependent'
  unit: string
  description?: string
}

interface ExperimentResult {
  trial: number
  value: number
  notes: string
  timestamp: string
}

interface StatusChange {
  status: ExperimentStatus
  timestamp: string
  note?: string
}

interface ExperimentStats {
  mean: number
  median: number
  stdDev: number
  min: number
  max: number
  sampleSize: number
}

interface Experiment {
  id: string
  title: string
  hypothesis: string
  description: string
  methodology: string
  status: ExperimentStatus
  priority: ExperimentPriority
  variables: ExperimentVariable[]
  results: ExperimentResult[]
  statusHistory: StatusChange[]
  tags: string[]
  expectedDuration: string
  associatedMeetingIds: string[]
  associatedAgentIds: string[]
  createdAt: string
  updatedAt: string
  completedAt?: string
  stats: ExperimentStats | null
}

export interface ExperimentResultsDashboardProps {
  lang?: Lang
}

// ============================================================
// Constants
// ============================================================

const STORAGE_KEY = 'vl-experiments'

const STATUS_COLORS: Record<ExperimentStatus, string> = {
  planned: '#3b82f6',
  running: '#f59e0b',
  completed: '#10b981',
  failed: '#ef4444',
  archived: '#6b7280',
}

const STATUS_LABELS: Record<ExperimentStatus, string> = {
  planned: 'Planned',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
  archived: 'Archived',
}

const ALL_STATUSES: ExperimentStatus[] = ['planned', 'running', 'completed', 'failed', 'archived']

// ============================================================
// Helpers
// ============================================================

function formatDate(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function computeStats(results: ExperimentResult[]): ExperimentStats | null {
  if (results.length === 0) return null
  const values = results.map(r => r.value)
  const sorted = [...values].sort((a, b) => a - b)
  const sum = values.reduce((a, b) => a + b, 0)
  const mean = sum / values.length
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)]
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length
  const stdDev = Math.sqrt(variance)
  return {
    mean: Math.round(mean * 100) / 100,
    median: Math.round(median * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100,
    min: Math.round(sorted[0] * 100) / 100,
    max: Math.round(sorted[sorted.length - 1] * 100) / 100,
    sampleSize: values.length,
  }
}

function daysBetween(a: string, b: string): number {
  const msDay = 86400000
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / msDay)
}

// ============================================================
// Animated Counter Hook
// ============================================================

function useAnimatedCounter(target: number, duration: number = 1200): number {
  const [current, setCurrent] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const startTime = performance.now()
    const startVal = 0

    function animate(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setCurrent(startVal + (target - startVal) * eased)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return current
}

// ============================================================
// Circular Progress Ring (SVG)
// ============================================================

function CircularProgressRing({
  value,
  max,
  size = 100,
  strokeWidth = 8,
  color = '#10b981',
  label,
  sublabel,
}: {
  value: number
  max: number
  size?: number
  strokeWidth?: number
  color?: string
  label: string
  sublabel: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const pct = max > 0 ? Math.min(value / max, 1) : 0
  const offset = circumference * (1 - pct)

  return (
    <div className="exp-stat-card flex flex-col items-center text-center">
      <div className="exp-progress-ring mb-3" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle className="exp-progress-ring-track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} />
          <circle
            className="exp-progress-ring-fill"
            cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth}
            stroke={color}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="exp-donut-center">
          <div className="exp-donut-center-value">{Math.round(value)}%</div>
        </div>
      </div>
      <div className="exp-stat-card-label">{label}</div>
      <div className="exp-stat-card-sub">{sublabel}</div>
    </div>
  )
}

// ============================================================
// Stat Card Component
// ============================================================

function StatCard({
  icon,
  iconClass,
  value,
  label,
  sublabel,
}: {
  icon: React.ReactNode
  iconClass: string
  value: number
  label: string
  sublabel: string
}) {
  const animatedValue = useAnimatedCounter(value)
  const displayValue = Number.isInteger(value) ? Math.round(animatedValue) : Math.round(animatedValue * 10) / 10

  return (
    <div className="exp-stat-card">
      <div className={`exp-stat-card-icon ${iconClass}`}>{icon}</div>
      <div className="exp-stat-card-value exp-counter-animate">{displayValue}</div>
      <div className="exp-stat-card-label">{label}</div>
      <div className="exp-stat-card-sub">{sublabel}</div>
    </div>
  )
}

// ============================================================
// Results Bar Chart (Pure SVG)
// ============================================================

function ResultsBarChart({ experiments }: { experiments: Experiment[] }) {
  const chartData = useMemo(() => {
    return experiments
      .filter(e => e.stats && e.results.length > 0)
      .sort((a, b) => (b.stats?.mean || 0) - (a.stats?.mean || 0))
      .slice(0, 8)
      .map(e => ({
        title: e.title.length > 30 ? e.title.slice(0, 28) + '...' : e.title,
        mean: e.stats?.mean || 0,
        status: e.status,
      }))
  }, [experiments])

  if (chartData.length === 0) {
    return (
      <div className="exp-empty-state py-8">
        <div className="exp-empty-state-icon"><BarChart3 className="size-5" /></div>
        <p className="text-sm vl-text-muted">No result data to display</p>
      </div>
    )
  }

  const maxValue = Math.max(...chartData.map(d => d.mean), 1)
  const barHeight = 28
  const gapY = 8
  const labelWidth = 180
  const valueWidth = 60
  const chartPadding = { top: 8, right: 16, bottom: 8, left: 0 }
  const chartWidth = 500
  const totalHeight = chartPadding.top + chartPadding.bottom + chartData.length * (barHeight + gapY)

  const barColors: Record<ExperimentStatus, string> = {
    planned: '#3b82f6',
    running: '#f59e0b',
    completed: '#10b981',
    failed: '#ef4444',
    archived: '#6b7280',
  }

  return (
    <div className="exp-bar-chart">
      <svg viewBox={`0 0 ${labelWidth + chartWidth + valueWidth + chartPadding.right} ${totalHeight}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          {ALL_STATUSES.map(s => (
            <linearGradient key={s} id={`bar-gradient-${s}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={barColors[s]} stopOpacity="0.8" />
              <stop offset="100%" stopColor={barColors[s]} stopOpacity="1" />
            </linearGradient>
          ))}
        </defs>
        {chartData.map((d, idx) => {
          const y = chartPadding.top + idx * (barHeight + gapY)
          const barW = Math.max((d.mean / maxValue) * chartWidth, 4)
          return (
            <g key={idx}>
              <text x={labelWidth - 8} y={y + barHeight / 2 + 4} textAnchor="end" className="exp-bar-chart-label">
                {d.title}
              </text>
              <rect x={labelWidth} y={y} width={chartWidth} height={barHeight} className="exp-bar-chart-bg" />
              <rect
                x={labelWidth} y={y} width={barW} height={barHeight}
                fill={`url(#bar-gradient-${d.status})`}
                rx={4}
                className="exp-bar-chart-bar"
              />
              <text x={labelWidth + barW + 8} y={y + barHeight / 2 + 4} className="exp-bar-chart-value">
                {d.mean}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ============================================================
// Status Distribution Donut (SVG)
// ============================================================

function StatusDonutChart({ experiments }: { experiments: Experiment[] }) {
  const distribution = useMemo(() => {
    const counts: Record<ExperimentStatus, number> = {
      planned: 0, running: 0, completed: 0, failed: 0, archived: 0,
    }
    experiments.forEach(e => { counts[e.status]++ })
    return counts
  }, [experiments])

  const total = experiments.length
  const size = 200
  const strokeWidth = 24
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  let currentOffset = 0
  const segments = ALL_STATUSES
    .filter(s => distribution[s] > 0)
    .map(s => {
      const pct = total > 0 ? distribution[s] / total : 0
      const segmentLength = pct * circumference
      const seg = {
        status: s,
        pct,
        offset: currentOffset,
        length: segmentLength,
        color: STATUS_COLORS[s],
        count: distribution[s],
      }
      currentOffset += segmentLength
      return seg
    })

  // Center text: the dominant status
  const dominant = segments.sort((a, b) => b.count - a.count)[0]

  return (
    <div className="flex flex-col items-center">
      <div className="exp-donut-chart" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--vl-bg-secondary)" strokeWidth={strokeWidth} />
          {segments.map((seg, idx) => (
            <circle
              key={idx}
              cx={size / 2} cy={size / 2} r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${seg.length} ${circumference - seg.length}`}
              strokeDashoffset={-seg.offset}
              strokeLinecap="butt"
              className="exp-donut-chart-ring"
              style={{ opacity: 0.85 }}
            />
          ))}
        </svg>
        <div className="exp-donut-center">
          <div className="exp-donut-center-value">{total}</div>
          <div className="exp-donut-center-label">{dominant?.status ? STATUS_LABELS[dominant.status] : 'No data'}</div>
        </div>
      </div>
      {/* Legend */}
      <div className="exp-legend mt-4">
        {segments.map(seg => (
          <div key={seg.status} className="exp-legend-item">
            <div className="exp-legend-dot" style={{ background: seg.color }} />
            <span>{STATUS_LABELS[seg.status]}: {seg.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// Timeline View
// ============================================================

function TimelineView({ experiments }: { experiments: Experiment[] }) {
  const sorted = useMemo(() => {
    return [...experiments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [experiments])

  return (
    <div className="exp-timeline max-h-[400px] overflow-y-auto pl-2">
      {sorted.map((exp, idx) => {
        const latestStatus = exp.statusHistory[exp.statusHistory.length - 1]
        return (
          <div key={exp.id} className="exp-timeline-item">
            <div className={`exp-timeline-dot exp-timeline-dot-${exp.status}`} />
            <div className="exp-timeline-content">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="exp-timeline-label truncate flex-1">{exp.title}</span>
                <span className={`exp-status-badge exp-status-badge-${exp.status} text-[10px]`}>
                  {STATUS_LABELS[exp.status]}
                </span>
              </div>
              <div className="exp-timeline-date">{formatDate(exp.createdAt)}</div>
              {exp.hypothesis && (
                <div className="text-xs vl-text-muted mt-1 line-clamp-1">{exp.hypothesis}</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================
// Trend Sparkline (SVG)
// ============================================================

function TrendSparkline({ experiments }: { experiments: Experiment[] }) {
  const sparkData = useMemo(() => {
    const now = Date.now()
    const weekMs = 7 * 86400000
    const weeks: { label: string; count: number }[] = []

    for (let i = 11; i >= 0; i--) {
      const weekStart = now - (i + 1) * weekMs
      const weekEnd = now - i * weekMs
      const count = experiments.filter(exp => {
        const t = new Date(exp.createdAt).getTime()
        return t >= weekStart && t < weekEnd
      }).length
      const weekDate = new Date(weekStart + weekMs / 2)
      weeks.push({
        label: weekDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        count,
      })
    }
    return weeks
  }, [experiments])

  const maxCount = Math.max(...sparkData.map(d => d.count), 1)
  const width = 500
  const height = 80
  const padding = { top: 10, right: 10, bottom: 20, left: 10 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const points = sparkData.map((d, idx) => ({
    x: padding.left + (idx / (sparkData.length - 1)) * chartW,
    y: padding.top + chartH - (d.count / maxCount) * chartH,
    ...d,
  }))

  const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = linePath + ` L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" className="w-full">
      <defs>
        <linearGradient id="sparkline-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map(pct => (
        <line
          key={pct}
          x1={padding.left}
          y1={padding.top + chartH * (1 - pct)}
          x2={width - padding.right}
          y2={padding.top + chartH * (1 - pct)}
          stroke="var(--vl-border-subtle)"
          strokeDasharray="3 3"
          strokeWidth={0.5}
        />
      ))}
      {/* Area */}
      <path d={areaPath} fill="url(#sparkline-gradient)" />
      {/* Line */}
      <path d={linePath} fill="none" stroke="#10b981" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots */}
      {points.map((p, idx) => (
        <g key={idx}>
          <circle cx={p.x} cy={p.y} r={3} fill="#10b981" stroke="var(--vl-bg-card)" strokeWidth={1.5} />
          {/* X-axis labels (every 3rd) */}
          {idx % 3 === 0 && (
            <text x={p.x} y={height - 4} textAnchor="middle" fill="var(--vl-text-muted)" fontSize={9}>
              {p.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}

// ============================================================
// Priority Matrix (2x2 Effort vs Impact)
// ============================================================

function PriorityMatrix({ experiments }: { experiments: Experiment[] }) {
  // Score experiments: effort = based on duration estimate, impact = based on priority + results
  const matrixData = useMemo(() => {
    return experiments
      .filter(e => e.status !== 'archived')
      .map(exp => {
        const priorityScore = { low: 1, medium: 2, high: 3, critical: 4 }[exp.priority] || 2
        const hasResults = exp.results.length > 0
        const resultScore = hasResults ? Math.min(exp.stats?.mean || 0, 10) / 10 : 0.5
        const impact = priorityScore * 0.6 + resultScore * 0.4

        const durationDays = parseInt(exp.expectedDuration) || 14
        const effort = Math.min(durationDays / 30, 1) // normalize to 0-1

        return { ...exp, impact, effort }
      })
  }, [experiments])

  const dotColor = (status: ExperimentStatus) => STATUS_COLORS[status]

  return (
    <div className="relative">
      <div className="exp-priority-matrix">
        {/* Q1: High Impact, Low Effort (top-left) */}
        <div className="exp-priority-quadrant exp-priority-quadrant-q1">
          <span className="exp-priority-quadrant-label">Quick Wins</span>
          <div className="flex flex-wrap gap-2 mt-1">
            {matrixData.filter(d => d.impact > 0.6 && d.effort <= 0.5).map(d => (
              <div key={d.id} className="exp-priority-dot" style={{ background: dotColor(d.status) }} title={d.title}>
                <div className="exp-priority-dot-tooltip">{d.title}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Q2: High Impact, High Effort (top-right) */}
        <div className="exp-priority-quadrant exp-priority-quadrant-q2">
          <span className="exp-priority-quadrant-label">Big Bets</span>
          <div className="flex flex-wrap gap-2 mt-1">
            {matrixData.filter(d => d.impact > 0.6 && d.effort > 0.5).map(d => (
              <div key={d.id} className="exp-priority-dot" style={{ background: dotColor(d.status) }} title={d.title}>
                <div className="exp-priority-dot-tooltip">{d.title}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Q3: Low Impact, Low Effort (bottom-left) */}
        <div className="exp-priority-quadrant exp-priority-quadrant-q3">
          <span className="exp-priority-quadrant-label">Fill-Ins</span>
          <div className="flex flex-wrap gap-2 mt-1">
            {matrixData.filter(d => d.impact <= 0.6 && d.effort <= 0.5).map(d => (
              <div key={d.id} className="exp-priority-dot" style={{ background: dotColor(d.status) }} title={d.title}>
                <div className="exp-priority-dot-tooltip">{d.title}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Q4: Low Impact, High Effort (bottom-right) */}
        <div className="exp-priority-quadrant exp-priority-quadrant-q4">
          <span className="exp-priority-quadrant-label">Avoid</span>
          <div className="flex flex-wrap gap-2 mt-1">
            {matrixData.filter(d => d.impact <= 0.6 && d.effort > 0.5).map(d => (
              <div key={d.id} className="exp-priority-dot" style={{ background: dotColor(d.status) }} title={d.title}>
                <div className="exp-priority-dot-tooltip">{d.title}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Axis labels */}
      <span className="exp-priority-axis-label exp-priority-axis-x">Impact →</span>
      <span className="exp-priority-axis-label exp-priority-axis-y">↑ Effort</span>
      {/* Legend */}
      <div className="exp-legend mt-6">
        {ALL_STATUSES.filter(s => s !== 'archived').map(s => (
          <div key={s} className="exp-legend-item">
            <div className="exp-legend-dot" style={{ background: STATUS_COLORS[s], borderRadius: '50%' }} />
            <span>{STATUS_LABELS[s]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// Statistical Summary Table (Sortable)
// ============================================================

function SummaryTable({ experiments }: { experiments: Experiment[] }) {
  const [sortField, setSortField] = useState<string>('updatedAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const handleSort = useCallback((field: string) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }, [sortField])

  const sorted = useMemo(() => {
    return [...experiments].sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'title':
          cmp = a.title.localeCompare(b.title)
          break
        case 'status':
          cmp = a.status.localeCompare(b.status)
          break
        case 'priority': {
          const pOrder = { critical: 4, high: 3, medium: 2, low: 1 }
          cmp = (pOrder[a.priority] || 0) - (pOrder[b.priority] || 0)
          break
        }
        case 'mean':
          cmp = (a.stats?.mean || 0) - (b.stats?.mean || 0)
          break
        case 'trials':
          cmp = a.results.length - b.results.length
          break
        case 'updatedAt':
          cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
          break
        default:
          cmp = 0
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [experiments, sortField, sortDir])

  const SortIcon = ({ field }: { field: string }) => (
    <span className={`exp-sort-indicator ${sortField === field ? 'exp-sort-indicator-active' : ''}`}>
      <svg width="10" height="12" viewBox="0 0 10 12">
        <path d="M5 1 L8 5 L2 5 Z" fill={sortField === field && sortDir === 'asc' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1" />
        <path d="M5 11 L8 7 L2 7 Z" fill={sortField === field && sortDir === 'desc' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1" />
      </svg>
    </span>
  )

  return (
    <div className="overflow-x-auto">
      <table className="exp-sort-table">
        <thead>
          <tr>
            <th onClick={() => handleSort('title')}>Experiment <SortIcon field="title" /></th>
            <th onClick={() => handleSort('status')}>Status <SortIcon field="status" /></th>
            <th onClick={() => handleSort('priority')}>Priority <SortIcon field="priority" /></th>
            <th onClick={() => handleSort('mean')}>Mean <SortIcon field="mean" /></th>
            <th onClick={() => handleSort('trials')}>Trials <SortIcon field="trials" /></th>
            <th>Mini Chart</th>
            <th onClick={() => handleSort('updatedAt')}>Updated <SortIcon field="updatedAt" /></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(exp => (
            <tr key={exp.id}>
              <td className="font-medium vl-text-heading max-w-[200px] truncate">{exp.title}</td>
              <td>
                <span className={`exp-status-badge exp-status-badge-${exp.status} text-[10px]`}>
                  <span className={`exp-status-dot exp-status-dot-${exp.status}`} />
                  {STATUS_LABELS[exp.status]}
                </span>
              </td>
              <td>
                <span className={`exp-priority-indicator exp-priority-indicator-${exp.priority}`}>
                  {exp.priority}
                </span>
              </td>
              <td className="font-mono text-sm">{exp.stats?.mean ?? '—'}</td>
              <td>{exp.results.length}</td>
              <td>
                {exp.results.length > 0 ? (
                  <MiniSparkline data={exp.results.map(r => r.value)} />
                ) : (
                  <span className="text-xs vl-text-muted">—</span>
                )}
              </td>
              <td className="text-xs vl-text-muted whitespace-nowrap">{formatDate(exp.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ============================================================
// Mini Sparkline (inline SVG)
// ============================================================

function MiniSparkline({ data }: { data: number[] }) {
  if (data.length === 0) return null
  const maxVal = Math.max(...data)
  const minVal = Math.min(...data)
  const range = maxVal - minVal || 1
  const width = 60
  const height = 24
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - minVal) / range) * height
    return `${x},${y}`
  })
  const pathD = `M ${points.join(' L ')}`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="inline-block" style={{ width, height }}>
      <path d={pathD} fill="none" stroke="#10b981" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ============================================================
// Activity Heatmap
// ============================================================

function ActivityHeatmap({ experiments }: { experiments: Experiment[] }) {
  const now = Date.now()
  const dayMs = 86400000

  const heatmap = useMemo(() => {
    const grid: number[][] = Array(4).fill(null).map(() => Array(7).fill(0))

    // Count events per day across last 4 weeks
    const events = new Map<string, number>()
    experiments.forEach(exp => {
      // Created
      const createdKey = new Date(exp.createdAt).toDateString()
      events.set(createdKey, (events.get(createdKey) || 0) + 1)
      // Updated (if different from created)
      const updatedKey = new Date(exp.updatedAt).toDateString()
      if (updatedKey !== createdKey) {
        events.set(updatedKey, (events.get(updatedKey) || 0) + 1)
      }
      // Status changes
      exp.statusHistory.forEach(sh => {
        const key = new Date(sh.timestamp).toDateString()
        events.set(key, (events.get(key) || 0) + 1)
      })
      // Results
      exp.results.forEach(r => {
        const key = new Date(r.timestamp).toDateString()
        events.set(key, (events.get(key) || 0) + 1)
      })
    })

    // Fill grid: 4 weeks ago (row 0) to this week (row 3)
    for (let w = 0; w < 4; w++) {
      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(now - (3 - w) * 7 * dayMs - (6 - d) * dayMs)
        const key = cellDate.toDateString()
        grid[w][d] = events.get(key) || 0
      }
    }

    return grid
  }, [experiments])

  const maxActivity = Math.max(...heatmap.flat(), 1)
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const weekLabels = ['4w ago', '3w ago', '2w ago', 'Last week']

  function getLevel(count: number): number {
    if (count === 0) return 0
    if (count <= maxActivity * 0.2) return 1
    if (count <= maxActivity * 0.4) return 2
    if (count <= maxActivity * 0.6) return 3
    if (count <= maxActivity * 0.8) return 4
    return 5
  }

  return (
    <div>
      <div className="exp-heatmap">
        {/* Day headers */}
        <div className="exp-heatmap-header"></div>
        {dayNames.map(d => (
          <div key={d} className="exp-heatmap-header">{d}</div>
        ))}
        {/* Rows */}
        {heatmap.map((row, wIdx) => (
          <React.Fragment key={wIdx}>
            <div className="exp-heatmap-label">{weekLabels[wIdx]}</div>
            {row.map((count, dIdx) => (
              <div
                key={dIdx}
                className={`exp-heatmap-cell exp-heatmap-level-${getLevel(count)}`}
                title={`${count} event${count !== 1 ? 's' : ''}`}
              />
            ))}
          </React.Fragment>
        ))}
      </div>
      {/* Intensity legend */}
      <div className="flex items-center gap-2 mt-3 justify-end">
        <span className="text-[10px] vl-text-muted">Less</span>
        {[0, 1, 2, 3, 4, 5].map(l => (
          <div key={l} className={`exp-heatmap-cell exp-heatmap-level-${l}`} style={{ width: 16, height: 16, minHeight: 16 }} />
        ))}
        <span className="text-[10px] vl-text-muted">More</span>
      </div>
    </div>
  )
}

// ============================================================
// Top Hypotheses List
// ============================================================

function TopHypotheses({ experiments }: { experiments: Experiment[] }) {
  const hypotheses = useMemo(() => {
    // Group by primary tag
    const groups = new Map<string, { hypothesis: string; success: number; total: number; title: string }>()
    experiments.forEach(exp => {
      const tag = exp.tags[0] || 'general'
      const existing = groups.get(tag)
      if (existing) {
        existing.total++
        if (exp.status === 'completed') existing.success++
      } else {
        groups.set(tag, {
          hypothesis: exp.hypothesis,
          success: exp.status === 'completed' ? 1 : 0,
          total: 1,
          title: exp.title,
        })
      }
    })

    return Array.from(groups.entries())
      .map(([tag, data]) => ({
        tag,
        ...data,
        successRate: data.total > 0 ? Math.round((data.success / data.total) * 100) : 0,
      }))
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 6)
  }, [experiments])

  return (
    <div className="space-y-1">
      {hypotheses.map((h, idx) => (
        <div key={h.tag} className="exp-hypothesis-rank">
          <div className="exp-hypothesis-rank-number">{idx + 1}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="exp-tag text-[9px]">{h.tag}</span>
              <span className="text-[10px] vl-text-muted">{h.total} experiment{h.total !== 1 ? 's' : ''}</span>
            </div>
            <p className="exp-hypothesis-rank-text line-clamp-2">{h.hypothesis}</p>
          </div>
          <div className="exp-hypothesis-rank-rate">
            {h.successRate}%
            {h.successRate >= 70 && <CheckCircle2 className="size-3 ml-1 text-emerald-500" />}
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// Main Results Dashboard
// ============================================================

export function ExperimentResultsDashboard({ lang = 'en' }: ExperimentResultsDashboardProps) {
  const [mounted, setMounted] = useState(false)
  const [experiments, setExperiments] = useState<Experiment[]>([])

  // Load data
  useEffect(() => {
    requestAnimationFrame(() => {
      setMounted(true)
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved) as Experiment[]
          setExperiments(parsed.map(exp => ({ ...exp, stats: computeStats(exp.results) })))
        }
      } catch { /* ignore */ }
    })
  }, [])

  // Computed stats
  const computedStats = useMemo(() => {
    const total = experiments.length
    const completed = experiments.filter(e => e.status === 'completed')
    const failed = experiments.filter(e => e.status === 'failed')
    const active = experiments.filter(e => e.status === 'running' || e.status === 'planned')
    const successRate = (completed.length + failed.length) > 0
      ? Math.round((completed.length / (completed.length + failed.length)) * 100)
      : 0

    // Average duration
    const durations = completed.map(e => {
      const created = new Date(e.createdAt).getTime()
      const ended = new Date(e.completedAt || e.updatedAt).getTime()
      return (ended - created) / (1000 * 60 * 60 * 24)
    })
    const avgDuration = durations.length > 0
      ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10
      : 0

    return { total, completedCount: completed.length, activeCount: active.length, successRate, avgDuration }
  }, [experiments])

  if (!mounted) return null

  return (
    <div className="p-6 min-h-0 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold vl-text-heading flex items-center gap-2">
          <BarChart3 className="size-6" />
          Results Dashboard
        </h1>
        <p className="text-sm vl-text-muted mt-1">
          Statistical analysis and visualization of experiment results
        </p>
      </div>

      {/* Stat Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Beaker className="size-5" />}
          iconClass="exp-stat-card-icon-emerald"
          value={computedStats.total}
          label="Total Experiments"
          sublabel={`${computedStats.completedCount} completed`}
        />
        <CircularProgressRing
          value={computedStats.successRate}
          max={100}
          color="#10b981"
          label="Success Rate"
          sublabel="Completed / (Completed + Failed)"
        />
        <StatCard
          icon={<Clock className="size-5" />}
          iconClass="exp-stat-card-icon-amber"
          value={computedStats.avgDuration}
          label="Avg Duration"
          sublabel="Days to completion"
        />
        <StatCard
          icon={<Play className="size-5" />}
          iconClass="exp-stat-card-icon-blue"
          value={computedStats.activeCount}
          label="Active Experiments"
          sublabel="Running + Planned"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Results Bar Chart */}
        <div className="exp-dashboard-section">
          <div className="exp-dashboard-section-title">
            <BarChart3 className="size-4" /> Results Comparison (Mean Values)
          </div>
          <ResultsBarChart experiments={experiments} />
        </div>

        {/* Status Distribution Donut */}
        <div className="exp-dashboard-section">
          <div className="exp-dashboard-section-title">
            <PieChart className="size-4" /> Status Distribution
          </div>
          <StatusDonutChart experiments={experiments} />
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Line */}
        <div className="exp-dashboard-section">
          <div className="exp-dashboard-section-title">
            <TrendingUp className="size-4" /> Experiment Creation Rate (12 Weeks)
          </div>
          <TrendSparkline experiments={experiments} />
        </div>

        {/* Priority Matrix */}
        <div className="exp-dashboard-section">
          <div className="exp-dashboard-section-title">
            <Target className="size-4" /> Priority Matrix (Effort vs Impact)
          </div>
          <PriorityMatrix experiments={experiments} />
        </div>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Heatmap */}
        <div className="exp-dashboard-section">
          <div className="exp-dashboard-section-title">
            <Activity className="size-4" /> Activity Heatmap (Last 4 Weeks)
          </div>
          <ActivityHeatmap experiments={experiments} />
        </div>

        {/* Top Hypotheses */}
        <div className="exp-dashboard-section">
          <div className="exp-dashboard-section-title">
            <Flame className="size-4" /> Top Hypotheses by Success Rate
          </div>
          <TopHypotheses experiments={experiments} />
        </div>
      </div>

      {/* Statistical Summary Table */}
      <div className="exp-dashboard-section">
        <div className="exp-dashboard-section-title">
          <ArrowUpDown className="size-4" /> Statistical Summary (Sortable)
        </div>
        <SummaryTable experiments={experiments} />
      </div>

      {/* Timeline */}
      <div className="exp-dashboard-section">
        <div className="exp-dashboard-section-title">
          <Calendar className="size-4" /> Experiment Timeline
        </div>
        <TimelineView experiments={experiments} />
      </div>
    </div>
  )
}

export default ExperimentResultsDashboard
