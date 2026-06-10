'use client'

import React, { useState, useMemo, useCallback } from 'react'
import {
  LayoutDashboard, MessageSquare, Users, FlaskConical, TrendingUp,
  FolderOpen, UsersRound, BarChart3, ChevronLeft, ChevronRight,
  ArrowUpRight, ArrowDownRight, Minus, Clock, FileText, Activity,
  Zap, BookOpen, Save, Download, RefreshCw, Eye, Star,
} from 'lucide-react'

// ─── Navigation Items ────────────────────────────────────────────────

type TabId = 'overview' | 'meetings' | 'agents' | 'research' | 'productivity' | 'resources' | 'team' | 'custom'

interface NavItem {
  id: TabId
  label: string
  Icon: React.ElementType
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', Icon: LayoutDashboard },
  { id: 'meetings', label: 'Meetings', Icon: MessageSquare },
  { id: 'agents', label: 'Agents', Icon: Users },
  { id: 'research', label: 'Research', Icon: FlaskConical },
  { id: 'productivity', label: 'Productivity', Icon: TrendingUp },
  { id: 'resources', label: 'Resources', Icon: FolderOpen },
  { id: 'team', label: 'Team', Icon: UsersRound },
  { id: 'custom', label: 'Custom', Icon: BarChart3 },
]

const DATASET_COLORS: Record<string, string> = {
  Meetings: '#10b981',
  Messages: '#3b82f6',
  Experiments: '#8b5cf6',
  Publications: '#f59e0b',
  Citations: '#ec4899',
}

const AGENT_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#ef4444', '#14b8a6', '#d97706', '#a78bfa']

// ─── Sparkline SVG ──────────────────────────────────────────────────

function SparklineSVG({ data, width = 80, height = 28, color = '#10b981' }: { data: number[]; width?: number; height?: number; color?: string }) {
  const maxVal = Math.max(...data, 1)
  const minVal = Math.min(...data, 0)
  const range = maxVal - minVal || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - minVal) / range) * (height - 4) - 2
    return `${x},${y}`
  })
  const fillPts = `0,${height} ${pts.join(' ')} ${width},${height}`
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`spark-grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPts} fill={`url(#spark-grad-${color.replace('#', '')})`} />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Area Chart SVG ──────────────────────────────────────────────────

function AreaChartSVG({
  datasets, labels, width = 700, height = 300,
  toggles, onToggle, tooltipIdx, onHover,
}: {
  datasets: Record<string, number[]>
  labels: string[]
  width?: number
  height?: number
  toggles: Record<string, boolean>
  onToggle: (k: string) => void
  tooltipIdx: number | null
  onHover: (idx: number | null) => void
}) {
  const pad = { top: 20, right: 20, bottom: 30, left: 50 }
  const chartW = width - pad.left - pad.right
  const chartH = height - pad.top - pad.bottom

  const allVals = Object.values(datasets).flat()
  const maxVal = Math.max(...allVals, 1)
  const n = labels.length

  const colX = (i: number) => pad.left + (i / (n - 1)) * chartW
  const valY = (v: number) => pad.top + chartH - (v / maxVal) * chartH

  const activeKeys = Object.keys(datasets).filter(k => toggles[k] !== false)
  const activeMax = Math.max(...activeKeys.flatMap(k => datasets[k]), 1)

  return (
    <div style={{ position: 'relative' }}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        <defs>
          {Object.entries(datasets).map(([key]) => {
            const c = DATASET_COLORS[key] || '#10b981'
            return (
              <linearGradient key={key} id={`area-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c} stopOpacity="0.25" />
                <stop offset="100%" stopColor={c} stopOpacity="0.02" />
              </linearGradient>
            )
          })}
        </defs>

        {/* Grid lines */}
        {Array.from({ length: 5 }, (_, i) => {
          const yy = pad.top + (i / 4) * chartH
          const val = Math.round(maxVal - (i / 4) * maxVal)
          return (
            <g key={`grid-${i}`}>
              <line x1={pad.left} y1={yy} x2={width - pad.right} y2={yy} stroke="var(--vl-chart-grid)" strokeDasharray="4 4" />
              <text x={pad.left - 8} y={yy + 4} textAnchor="end" fill="var(--vl-chart-axis)" fontSize="10">{val}</text>
            </g>
          )
        })}

        {/* X axis labels */}
        {labels.map((lbl, i) => (
          <text key={`xlbl-${i}`} x={colX(i)} y={height - 6} textAnchor="middle" fill="var(--vl-chart-axis)" fontSize="10">{lbl}</text>
        ))}

        {/* Hover line */}
        {tooltipIdx !== null && tooltipIdx >= 0 && tooltipIdx < n && (
          <line x1={colX(tooltipIdx)} y1={pad.top} x2={colX(tooltipIdx)} y2={pad.top + chartH} stroke="var(--vl-accent)" strokeOpacity="0.3" strokeDasharray="4 4" />
        )}

        {/* Areas and lines */}
        {Object.entries(datasets).map(([key, vals]) => {
          if (toggles[key] === false) return null
          const c = DATASET_COLORS[key] || '#10b981'
          const pts = vals.map((v, i) => `${colX(i)},${valY(v)}`)
          const areaPts = `${colX(0)},${pad.top + chartH} ${pts.join(' ')} ${colX(vals.length - 1)},${pad.top + chartH}`
          return (
            <g key={key}>
              <polygon points={areaPts} fill={`url(#area-${key})`} />
              <polyline points={pts.join(' ')} fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              {vals.map((v, i) => (
                <circle key={`pt-${key}-${i}`} cx={colX(i)} cy={valY(v)} r="3" fill={c} stroke="var(--vl-bg-card)" strokeWidth="2" />
              ))}
            </g>
          )
        })}

        {/* Hover zones (invisible rects) */}
        {labels.map((_, i) => {
          const x0 = i === 0 ? pad.left : colX(i) - chartW / (n - 1) / 2
          const x1 = i === n - 1 ? width - pad.right : colX(i) + chartW / (n - 1) / 2
          return (
            <rect key={`hover-${i}`} x={x0} y={pad.top} width={x1 - x0} height={chartH}
              fill="transparent" style={{ cursor: 'pointer' }}
              onMouseEnter={() => onHover(i)} onMouseLeave={() => onHover(null)} />
          )
        })}
      </svg>

      {/* Tooltip */}
      {tooltipIdx !== null && tooltipIdx >= 0 && tooltipIdx < n && (
        <div className="ah-tooltip" style={{ left: `${(colX(tooltipIdx) / width) * 100}%`, top: '0px' }}>
          <div className="ah-tooltip-label">{labels[tooltipIdx]}</div>
          {activeKeys.map(k => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: DATASET_COLORS[k] || '#10b981', display: 'inline-block' }} />
              <span style={{ color: 'var(--vl-text-muted)' }}>{k}:</span>
              <span style={{ fontWeight: 600 }}>{datasets[k][tooltipIdx]}</span>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="ah-legend">
        {Object.keys(datasets).map(k => (
          <div key={k} className={`ah-legend-item ${toggles[k] === false ? 'ah-legend-item-disabled' : ''}`} onClick={() => onToggle(k)}>
            <span className="ah-legend-dot" style={{ background: DATASET_COLORS[k] || '#10b981' }} />
            {k}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Donut Chart SVG ─────────────────────────────────────────────────

function DonutChartSVG({ data, size = 160, strokeWidth = 28 }: { data: Record<string, number>; size?: number; strokeWidth?: number }) {
  const cx = size / 2
  const cy = size / 2
  const r = (size - strokeWidth) / 2
  const total = Object.values(data).reduce((a, b) => a + b, 0) || 1
  const circum = 2 * Math.PI * r
  const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4']
  let offset = 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {Object.entries(data).map(([label, val], i) => {
          const pct = val / total
          const dashLen = pct * circum
          const dashOffset = -offset
          offset += dashLen
          return (
            <circle key={label} cx={cx} cy={cy} r={r} fill="none"
              stroke={colors[i % colors.length]} strokeWidth={strokeWidth}
              strokeDasharray={`${dashLen} ${circum - dashLen}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="round" opacity={0.85}
              style={{ transition: 'all 0.5s ease' }} />
          )
        })}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="var(--vl-text-primary)" fontSize="22" fontWeight="700">{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="var(--vl-text-muted)" fontSize="10">Total</text>
      </svg>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        {Object.entries(data).map(([label, val], i) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--vl-text-muted)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: colors[i % colors.length] }} />
            {label}: {val} ({Math.round(val / total * 100)}%)
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Horizontal Bar Chart SVG ───────────────────────────────────────

function HorizontalBarSVG({ data, width = 300, barHeight = 24, gap = 8 }: {
  data: { name: string; value: number; color?: string }[]
  width?: number
  barHeight?: number
  gap?: number
}) {
  const maxVal = Math.max(...data.map(d => d.value), 1)
  const barAreaWidth = width - 100
  const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899']

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${data.length * (barHeight + gap)}`} style={{ overflow: 'visible' }}>
      {data.map((item, i) => {
        const y = i * (barHeight + gap)
        const barW = (item.value / maxVal) * barAreaWidth
        const c = item.color || colors[i % colors.length]
        return (
          <g key={item.name}>
            <text x={0} y={y + barHeight / 2 + 4} fill="var(--vl-text-body)" fontSize="11" fontWeight="500">{item.name}</text>
            <rect x={95} y={y} width={barW} height={barHeight} rx={4} fill={c} opacity={0.8}>
              <animate attributeName="width" from="0" to={barW} dur="0.6s" fill="freeze" />
            </rect>
            <text x={100 + barW} y={y + barHeight / 2 + 4} fill="var(--vl-text-muted)" fontSize="10" fontWeight="600">{item.value}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── Heatmap SVG ────────────────────────────────────────────────────

function HeatmapSVG({ grid, width = 336, height = 168, cols = 24, rows = 7, dayLabels }: {
  grid: number[][]
  width?: number
  height?: number
  cols?: number
  rows?: number
  dayLabels?: string[]
}) {
  const cellW = (width - 40) / cols
  const cellH = (height - 20) / rows
  const maxVal = Math.max(...grid.flat(), 1)
  const days = dayLabels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  const getLevel = (v: number) => {
    if (v === 0) return 0
    if (v / maxVal < 0.25) return 1
    if (v / maxVal < 0.5) return 2
    if (v / maxVal < 0.75) return 3
    return 4
  }

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      {days.map((d, i) => (
        <text key={`dlbl-${i}`} x={36} y={i * cellH + cellH / 2 + 3} textAnchor="end" fill="var(--vl-text-muted)" fontSize="9">{d}</text>
      ))}
      {grid.map((row, r) =>
        row.map((val, c) => {
          const x = 40 + c * cellW
          const y = r * cellH
          return (
            <rect key={`hm-${r}-${c}`} x={x} y={y} width={cellW - 1} height={cellH - 1}
              rx={2} className={`ah-heatmap-cell ah-heatmap-${getLevel(val)}`} />
          )
        })
      )}
    </svg>
  )
}

// ─── Gauge SVG ───────────────────────────────────────────────────────

function GaugeSVG({ value, max = 100, size = 120, strokeWidth = 10, label, color = '#10b981' }: {
  value: number; max?: number; size?: number; strokeWidth?: number; label?: string; color?: string
}) {
  const cx = size / 2
  const cy = size / 2
  const r = (size - strokeWidth) / 2
  const circum = Math.PI * r
  const pct = value / max

  return (
    <div className="ah-gauge-container">
      <svg width={size} height={size * 0.65} viewBox={`0 0 ${size} ${size * 0.65}`}>
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke="var(--vl-bg-inner)" strokeWidth={strokeWidth} strokeLinecap="round" />
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={`${pct * circum} ${circum}`}
          style={{ filter: `drop-shadow(0 0 4px ${color}40)` }}>
          <animate attributeName="stroke-dasharray" from={`0 ${circum}`} to={`${pct * circum} ${circum}`} dur="1s" fill="freeze" />
        </path>
        <text x={cx} y={cy - 10} textAnchor="middle" fill="var(--vl-text-primary)" fontSize="24" fontWeight="800">{value}{label === '%' ? '%' : ''}</text>
        {label && label !== '%' && <text x={cx} y={cy + 8} textAnchor="middle" fill="var(--vl-text-muted)" fontSize="10">{label}</text>}
      </svg>
    </div>
  )
}

// ─── Line Chart SVG ─────────────────────────────────────────────────

function LineChartSVG({ datasets, labels, width = 600, height = 250, colors }: {
  datasets: { name: string; values: number[] }[]
  labels: string[]
  width?: number
  height?: number
  colors?: string[]
}) {
  const pad = { top: 20, right: 20, bottom: 30, left: 50 }
  const chartW = width - pad.left - pad.right
  const chartH = height - pad.top - pad.bottom
  const allVals = datasets.flatMap(d => d.values)
  const maxVal = Math.max(...allVals, 1)
  const n = labels.length
  const palette = colors || AGENT_COLORS

  const colX = (i: number) => pad.left + (i / (n - 1)) * chartW
  const valY = (v: number) => pad.top + chartH - (v / maxVal) * chartH

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      {Array.from({ length: 5 }, (_, i) => {
        const yy = pad.top + (i / 4) * chartH
        return (
          <g key={`lgrid-${i}`}>
            <line x1={pad.left} y1={yy} x2={width - pad.right} y2={yy} stroke="var(--vl-chart-grid)" strokeDasharray="4 4" />
            <text x={pad.left - 8} y={yy + 4} textAnchor="end" fill="var(--vl-chart-axis)" fontSize="10">{Math.round(maxVal - (i / 4) * maxVal)}</text>
          </g>
        )
      })}
      {labels.map((lbl, i) => (
        <text key={`lx-${i}`} x={colX(i)} y={height - 6} textAnchor="middle" fill="var(--vl-chart-axis)" fontSize="10">{lbl}</text>
      ))}
      {datasets.map((ds, di) => {
        const c = palette[di % palette.length]
        const pts = ds.values.map((v, i) => `${colX(i)},${valY(v)}`)
        return (
          <g key={ds.name}>
            <polyline points={pts.join(' ')} fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {ds.values.map((v, i) => (
              <circle key={`lpt-${di}-${i}`} cx={colX(i)} cy={valY(v)} r="3" fill={c} stroke="var(--vl-bg-card)" strokeWidth="2" />
            ))}
          </g>
        )
      })}
    </svg>
  )
}

// ─── Stacked Area SVG ────────────────────────────────────────────────

function StackedAreaSVG({ datasets, labels, width = 600, height = 280 }: {
  datasets: { name: string; values: number[]; color: string }[]
  labels: string[]
  width?: number
  height?: number
}) {
  const pad = { top: 20, right: 20, bottom: 30, left: 50 }
  const chartW = width - pad.left - pad.right
  const chartH = height - pad.top - pad.bottom
  const n = labels.length

  // Compute stacked totals
  const stacks: number[][] = Array.from({ length: n }, () => [])
  for (let i = 0; i < n; i++) {
    let cumul = 0
    for (const ds of datasets) {
      cumul += ds.values[i]
      stacks[i].push(cumul)
    }
  }
  const maxVal = Math.max(...stacks.flat(), 1)

  const colX = (i: number) => pad.left + (i / (n - 1)) * chartW
  const valY = (v: number) => pad.top + chartH - (v / maxVal) * chartH

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      {Array.from({ length: 5 }, (_, i) => {
        const yy = pad.top + (i / 4) * chartH
        return (
          <g key={`sgrid-${i}`}>
            <line x1={pad.left} y1={yy} x2={width - pad.right} y2={yy} stroke="var(--vl-chart-grid)" strokeDasharray="4 4" />
            <text x={pad.left - 8} y={yy + 4} textAnchor="end" fill="var(--vl-chart-axis)" fontSize="10">{Math.round(maxVal - (i / 4) * maxVal)}</text>
          </g>
        )
      })}
      {labels.map((lbl, i) => (
        <text key={`sx-${i}`} x={colX(i)} y={height - 6} textAnchor="middle" fill="var(--vl-chart-axis)" fontSize="10">{lbl}</text>
      ))}
      {/* Render from top layer to bottom */}
      {[...datasets].reverse().map((ds, ri) => {
        const di = datasets.length - 1 - ri
        const topPts = stacks.map((s, i) => `${colX(i)},${valY(s[di])}`).join(' ')
        const botPts = di === 0
          ? stacks.map((_, i) => `${colX(i)},${valY(0)}`).join(' ')
          : stacks.map((s, i) => `${colX(i)},${valY(s[di - 1])}`).join(' ')
        const botReversed = botPts.split(' ').reverse().join(' ')
        const polygonPts = `${topPts} ${botReversed}`
        return (
          <g key={ds.name}>
            <polygon points={polygonPts} fill={ds.color} opacity={0.7} />
            <polyline points={topPts} fill="none" stroke={ds.color} strokeWidth="1.5" />
          </g>
        )
      })}
    </svg>
  )
}

// ─── Bar Chart SVG ───────────────────────────────────────────────────

function BarChartSVG({ data, width = 400, height = 200, barColor = '#10b981' }: {
  data: { label: string; value: number }[]
  width?: number
  height?: number
  barColor?: string
}) {
  const pad = { top: 10, right: 10, bottom: 30, left: 40 }
  const chartW = width - pad.left - pad.right
  const chartH = height - pad.top - pad.bottom
  const maxVal = Math.max(...data.map(d => d.value), 1)
  const barW = Math.min(40, chartW / data.length - 8)

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      {Array.from({ length: 4 }, (_, i) => {
        const yy = pad.top + (i / 3) * chartH
        return (
          <g key={`bgrid-${i}`}>
            <line x1={pad.left} y1={yy} x2={width - pad.right} y2={yy} stroke="var(--vl-chart-grid)" strokeDasharray="4 4" />
            <text x={pad.left - 6} y={yy + 4} textAnchor="end" fill="var(--vl-chart-axis)" fontSize="10">{Math.round(maxVal - (i / 3) * maxVal)}</text>
          </g>
        )
      })}
      {data.map((item, i) => {
        const x = pad.left + (i / data.length) * chartW + (chartW / data.length - barW) / 2
        const barH = (item.value / maxVal) * chartH
        const y = pad.top + chartH - barH
        return (
          <g key={item.label}>
            <rect x={x} y={y} width={barW} height={barH} rx={4} fill={barColor} opacity={0.8}>
              <animate attributeName="height" from="0" to={barH} dur="0.5s" fill="freeze" />
              <animate attributeName="y" from={pad.top + chartH} to={y} dur="0.5s" fill="freeze" />
            </rect>
            <text x={x + barW / 2} y={height - 8} textAnchor="middle" fill="var(--vl-chart-axis)" fontSize="10">{item.label}</text>
            <text x={x + barW / 2} y={y - 4} textAnchor="middle" fill="var(--vl-text-muted)" fontSize="10" fontWeight="600">{item.value}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── Scatter Plot SVG ────────────────────────────────────────────────

function ScatterPlotSVG({ points, width = 500, height = 300 }: {
  points: { x: number; y: number; label?: string; color?: string; size?: number }[]
  width?: number
  height?: number
}) {
  const pad = { top: 20, right: 20, bottom: 40, left: 50 }
  const chartW = width - pad.left - pad.right
  const chartH = height - pad.top - pad.bottom
  const maxX = Math.max(...points.map(p => p.x), 1)
  const maxY = Math.max(...points.map(p => p.y), 1)

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      {Array.from({ length: 5 }, (_, i) => {
        const yy = pad.top + (i / 4) * chartH
        return (
          <g key={`scgrid-${i}`}>
            <line x1={pad.left} y1={yy} x2={width - pad.right} y2={yy} stroke="var(--vl-chart-grid)" strokeDasharray="4 4" />
            <text x={pad.left - 6} y={yy + 4} textAnchor="end" fill="var(--vl-chart-axis)" fontSize="10">{Math.round(maxY - (i / 4) * maxY)}</text>
          </g>
        )
      })}
      {points.map((p, i) => {
        const px = pad.left + (p.x / maxX) * chartW
        const py = pad.top + chartH - (p.y / maxY) * chartH
        const sz = p.size || 6
        return (
          <g key={`sc-${i}`}>
            <circle cx={px} cy={py} r={sz} fill={p.color || '#10b981'} opacity={0.7} stroke={p.color || '#10b981'} strokeWidth="1" />
            {p.label && <title>{p.label}: (${p.x}, ${p.y})</title>}
          </g>
        )
      })}
      <text x={width / 2} y={height - 4} textAnchor="middle" fill="var(--vl-chart-axis)" fontSize="10">Date →</text>
      <text x={8} y={height / 2} textAnchor="middle" fill="var(--vl-chart-axis)" fontSize="10" transform={`rotate(-90, 8, ${height / 2})`}>Citations →</text>
    </svg>
  )
}

// ─── Funnel SVG ─────────────────────────────────────────────────────

function FunnelSVG({ data, width = 400 }: {
  data: { stage: string; count: number; color: string }[]
  width?: number
}) {
  const maxCount = Math.max(...data.map(d => d.count), 1)

  return (
    <div style={{ padding: '0 8px' }}>
      {data.map((item, i) => {
        const barW = (item.count / maxCount) * (width - 160)
        const convRate = i === 0 ? 100 : Math.round((item.count / data[0].count) * 100)
        return (
          <div key={item.stage} className="ah-funnel-stage">
            <span className="ah-funnel-label">{item.stage}</span>
            <div className="ah-funnel-bar" style={{ width: barW, background: item.color }}>
              {item.count}
            </div>
            <span className="ah-funnel-rate">{convRate}%</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Word Cloud (Bubble) SVG ─────────────────────────────────────────

function WordCloudSVG({ topics }: { topics: { word: string; count: number; size: number }[] }) {
  const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#ef4444', '#14b8a6', '#d97706']
  const radius = (sz: number) => sz * 0.55

  return (
    <div className="ah-word-cloud" style={{ padding: 16 }}>
      {topics.map((t, i) => (
        <span key={t.word} className="ah-word-bubble" title={`${t.word}: ${t.count} mentions`}
          style={{
            fontSize: Math.max(10, t.size * 0.55),
            padding: `${Math.max(3, t.size * 0.15)}px ${Math.max(5, t.size * 0.25)}px`,
            background: `${colors[i % colors.length]}18`,
            color: colors[i % colors.length],
            fontWeight: t.size > 30 ? 700 : t.size > 20 ? 600 : 500,
            borderRadius: 9999,
          }}>
          {t.word}
        </span>
      ))}
    </div>
  )
}

// ─── Force-Directed Network SVG ────────────────────────────────────

function ForceNetworkSVG({ nodes, edges, width = 500, height = 350 }: {
  nodes: { id: string; name: string; x: number; y: number; contribution: number; color: string }[]
  edges: { source: string; target: string; weight: number }[]
  width?: number
  height?: number
}) {
  const maxContrib = Math.max(...nodes.map(n => n.contribution), 1)
  const nodeMap = new Map(nodes.map(n => [n.id, n]))

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      {/* Edges */}
      {edges.map((e, i) => {
        const src = nodeMap.get(e.source)
        const tgt = nodeMap.get(e.target)
        if (!src || !tgt) return null
        return (
          <line key={`edge-${i}`} x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
            stroke="var(--vl-border)" strokeWidth={e.weight * 0.5 + 0.5} strokeOpacity={0.5} />
        )
      })}
      {/* Nodes */}
      {nodes.map(n => {
        const r = 12 + (n.contribution / maxContrib) * 20
        return (
          <g key={n.id}>
            <circle cx={n.x} cy={n.y} r={r} fill={n.color} opacity={0.2} />
            <circle cx={n.x} cy={n.y} r={r * 0.6} fill={n.color} opacity={0.9} />
            <text x={n.x} y={n.y + 1} textAnchor="middle" fill="#fff" fontSize="8" fontWeight="600">{n.name.slice(0, 8)}</text>
            <text x={n.x} y={n.y + r + 12} textAnchor="middle" fill="var(--vl-text-muted)" fontSize="9">{n.name}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── Performance Matrix (Heatmap) SVG ────────────────────────────────

function PerformanceMatrixSVG({ agents, metrics, data, width = 500 }: {
  agents: string[]; metrics: string[]; data: number[][]; width?: number
}) {
  const cellW = 42
  const cellH = 36
  const headerW = 80
  const headerH = 24
  const svgH = headerH + agents.length * cellH

  const getColor = (v: number) => {
    if (v < 0.55) return '#ef4444'
    if (v < 0.7) return '#f59e0b'
    if (v < 0.8) return '#eab308'
    return '#10b981'
  }

  return (
    <div className="ah-scrollable" style={{ overflowX: 'auto' }}>
      <svg width="100%" viewBox={`0 0 ${width} ${svgH}`} style={{ overflow: 'visible' }}>
        {/* Column headers (metrics) */}
        {metrics.map((m, i) => (
          <text key={`mh-${i}`} x={headerW + i * cellW + cellW / 2} y={14} textAnchor="middle" fill="var(--vl-text-muted)" fontSize="9" fontWeight="600">{m}</text>
        ))}
        {/* Rows */}
        {agents.map((agent, ri) =>
          metrics.map((metric, ci) => {
            const v = data[ri]?.[ci] ?? 0
            const x = headerW + ci * cellW
            const y = headerH + ri * cellH
            return (
              <g key={`cell-${ri}-${ci}`}>
                <rect x={x} y={y} width={cellW - 2} height={cellH - 2} rx={4} fill={getColor(v)} opacity={0.8} />
                <text x={x + cellW / 2 - 1} y={y + cellH / 2 + 4} textAnchor="middle" fill="#fff" fontSize="11" fontWeight="600">
                  {Math.round(v * 100)}
                </text>
              </g>
            )
          })
        )}
        {/* Row labels (agents) */}
        {agents.map((agent, ri) => (
          <text key={`al-${ri}`} x={headerW - 6} y={headerH + ri * cellH + cellH / 2 + 4} textAnchor="end" fill="var(--vl-text-body)" fontSize="10" fontWeight="500">{agent}</text>
        ))}
      </svg>
    </div>
  )
}

// ─── Histogram SVG ──────────────────────────────────────────────────

function HistogramSVG({ buckets, counts, width = 400, height = 200 }: {
  buckets: string[]; counts: number[]; width?: number; height?: number
}) {
  const pad = { top: 10, right: 10, bottom: 40, left: 40 }
  const chartW = width - pad.left - pad.right
  const chartH = height - pad.top - pad.bottom
  const maxVal = Math.max(...counts, 1)
  const barW = Math.min(50, chartW / buckets.length - 6)

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      {Array.from({ length: 4 }, (_, i) => {
        const yy = pad.top + (i / 3) * chartH
        return (
          <g key={`hgrid-${i}`}>
            <line x1={pad.left} y1={yy} x2={width - pad.right} y2={yy} stroke="var(--vl-chart-grid)" strokeDasharray="4 4" />
            <text x={pad.left - 6} y={yy + 4} textAnchor="end" fill="var(--vl-chart-axis)" fontSize="10">{Math.round(maxVal - (i / 3) * maxVal)}</text>
          </g>
        )
      })}
      {buckets.map((b, i) => {
        const x = pad.left + (i / buckets.length) * chartW + (chartW / buckets.length - barW) / 2
        const barH = (counts[i] / maxVal) * chartH
        const y = pad.top + chartH - barH
        return (
          <g key={b}>
            <rect x={x} y={y} width={barW} height={barH} rx={4} fill="#3b82f6" opacity={0.8}>
              <animate attributeName="height" from="0" to={barH} dur="0.5s" fill="freeze" />
              <animate attributeName="y" from={pad.top + chartH} to={y} dur="0.5s" fill="freeze" />
            </rect>
            <text x={x + barW / 2} y={y - 4} textAnchor="middle" fill="var(--vl-text-muted)" fontSize="10" fontWeight="600">{counts[i]}</text>
            <text x={x + barW / 2} y={height - 8} textAnchor="middle" fill="var(--vl-chart-axis)" fontSize="9" transform={`rotate(-20, ${x + barW / 2}, ${height - 8})`}>{b}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ═══════════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════════

const MOCK = {
  kpis: [
    { label: 'Total Meetings', value: 47, trend: 'up' as const, change: 12.5, sparkline: [28, 32, 35, 30, 38, 42, 47] },
    { label: 'Active Agents', value: 12, trend: 'up' as const, change: 8.3, sparkline: [8, 9, 9, 10, 10, 11, 12] },
    { label: 'Messages This Week', value: 1243, trend: 'up' as const, change: 18.2, sparkline: [890, 950, 1020, 1100, 1050, 1150, 1243] },
    { label: 'Avg Duration (min)', value: 34, trend: 'flat' as const, change: 0, sparkline: [32, 34, 33, 35, 34, 34, 34] },
    { label: 'Research Papers', value: 23, trend: 'up' as const, change: 21.1, sparkline: [15, 16, 17, 18, 19, 21, 23] },
    { label: 'Experiments Running', value: 7, trend: 'down' as const, change: 12.5, sparkline: [12, 10, 11, 9, 8, 8, 7] },
  ],
  researchActivity: {
    months: ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: {
      Meetings: [12, 15, 18, 14, 20, 22],
      Messages: [890, 1020, 1150, 980, 1200, 1350],
      Experiments: [8, 12, 15, 10, 14, 18],
      Publications: [2, 3, 1, 4, 3, 5],
      Citations: [15, 22, 28, 25, 35, 42],
    },
  },
  meetingTypes: { Team: 28, Individual: 14, Review: 5 },
  agentUtilization: [
    { name: 'AlphaFold Agent', value: 342 },
    { name: 'CRISPR Expert', value: 287 },
    { name: 'Drug Screening', value: 231 },
    { name: 'Protein Designer', value: 198 },
    { name: 'Data Analyst', value: 156 },
  ],
  weeklyHeatmap: Array.from({ length: 7 }, (_, day) =>
    Array.from({ length: 24 }, (_, hour) => {
      const base = Math.sin((hour - 12) * 0.5) * 3 + 4
      const weekend = day >= 5 ? 0.3 : 1
      return Math.max(0, Math.round(base * weekend + Math.random() * 2))
    })
  ),
  recentActivity: [
    { id: 'a1', icon: 'message' as const, desc: 'AlphaFold Agent completed structure prediction for Nanobody-47', time: '2 min ago', color: '#10b981' },
    { id: 'a2', icon: 'flask' as const, desc: 'Experiment CRISPR-OFF-12 moved to Analysis stage', time: '8 min ago', color: '#8b5cf6' },
    { id: 'a3', icon: 'users' as const, desc: 'Team meeting on Protein Folding Review started', time: '15 min ago', color: '#3b82f6' },
    { id: 'a4', icon: 'file' as const, desc: 'New paper published: Multi-Chain Prediction Validation', time: '32 min ago', color: '#f59e0b' },
    { id: 'a5', icon: 'trending' as const, desc: 'Weekly productivity score increased by 15%', time: '1 hour ago', color: '#10b981' },
    { id: 'a6', icon: 'message' as const, desc: 'CRISPR Expert responded to off-target analysis', time: '1.5 hours ago', color: '#06b6d4' },
    { id: 'a7', icon: 'flask' as const, desc: 'Drug screening pipeline Round 3 completed', time: '2 hours ago', color: '#ec4899' },
    { id: 'a8', icon: 'users' as const, desc: 'Individual meeting with Data Analyst finished', time: '2.5 hours ago', color: '#8b5cf6' },
    { id: 'a9', icon: 'file' as const, desc: 'Dataset uploaded: Single-Cell RNA-Seq Atlas v4', time: '3 hours ago', color: '#f59e0b' },
    { id: 'a10', icon: 'trending' as const, desc: 'Research output trend shows 21% growth this month', time: '4 hours ago', color: '#10b981' },
  ],
  meetingTrends: {
    weeks: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9', 'W10', 'W11', 'W12'],
    team: [4, 3, 5, 4, 6, 5, 3, 4, 5, 6, 4, 5],
    individual: [2, 3, 2, 3, 2, 3, 2, 2, 3, 2, 3, 2],
  },
  meetingDurations: { buckets: ['<15min', '15-30min', '30-60min', '60-120min', '>120min'], counts: [8, 15, 14, 7, 3] },
  meetingTopics: [
    { name: 'Protein Folding', value: 34 },
    { name: 'CRISPR Off-Target', value: 28 },
    { name: 'Drug Screening', value: 22 },
    { name: 'Nanobody Design', value: 19 },
    { name: 'Structure Prediction', value: 17 },
    { name: 'Binding Affinity', value: 14 },
    { name: 'Molecular Dynamics', value: 11 },
    { name: 'Validation', value: 9 },
  ],
  meetingSuccessRate: 87,
  meetingComparison: [
    { name: 'Protein Folding Review', participants: 6, duration: 45, messages: 78, sentiment: 'Positive' },
    { name: 'CRISPR Strategy Session', participants: 4, duration: 32, messages: 56, sentiment: 'Positive' },
    { name: 'Drug Screening Update', participants: 5, duration: 28, messages: 42, sentiment: 'Neutral' },
    { name: 'Nanobody Design Sprint', participants: 3, duration: 55, messages: 91, sentiment: 'Positive' },
    { name: 'Data Analysis Sync', participants: 2, duration: 18, messages: 24, sentiment: 'Neutral' },
  ],
  agentPerfMatrix: {
    agents: ['AlphaFold', 'CRISPR', 'DrugScr', 'ProtDes', 'DataAn', 'MolDyn', 'GeneEx', 'Valid'],
    metrics: ['Messages', 'Quality', 'Particip.', 'Resp.Time', 'Suggest.'],
    data: [
      [0.95, 0.88, 0.92, 0.78, 0.85],
      [0.85, 0.91, 0.88, 0.82, 0.79],
      [0.72, 0.85, 0.75, 0.90, 0.88],
      [0.80, 0.76, 0.82, 0.85, 0.92],
      [0.65, 0.90, 0.70, 0.95, 0.78],
      [0.78, 0.82, 0.80, 0.76, 0.85],
      [0.70, 0.88, 0.72, 0.88, 0.80],
      [0.60, 0.95, 0.65, 0.92, 0.90],
    ],
  },
  agentNetwork: {
    nodes: [
      { id: 'n1', name: 'AlphaFold', x: 200, y: 140, contribution: 95, color: '#10b981' },
      { id: 'n2', name: 'CRISPR', x: 340, y: 90, contribution: 85, color: '#3b82f6' },
      { id: 'n3', name: 'DrugScr', x: 310, y: 240, contribution: 72, color: '#8b5cf6' },
      { id: 'n4', name: 'ProtDes', x: 140, y: 260, contribution: 80, color: '#f59e0b' },
      { id: 'n5', name: 'DataAn', x: 430, y: 190, contribution: 65, color: '#ec4899' },
      { id: 'n6', name: 'MolDyn', x: 240, y: 50, contribution: 78, color: '#06b6d4' },
      { id: 'n7', name: 'GeneEx', x: 90, y: 170, contribution: 70, color: '#ef4444' },
      { id: 'n8', name: 'Valid', x: 390, y: 290, contribution: 60, color: '#14b8a6' },
    ],
    edges: [
      { source: 'n1', target: 'n2', weight: 8 },
      { source: 'n1', target: 'n4', weight: 6 },
      { source: 'n1', target: 'n6', weight: 7 },
      { source: 'n2', target: 'n3', weight: 5 },
      { source: 'n2', target: 'n5', weight: 4 },
      { source: 'n3', target: 'n5', weight: 6 },
      { source: 'n3', target: 'n8', weight: 5 },
      { source: 'n4', target: 'n6', weight: 4 },
      { source: 'n4', target: 'n7', weight: 3 },
      { source: 'n5', target: 'n8', weight: 5 },
      { source: 'n6', target: 'n7', weight: 4 },
      { source: 'n1', target: 'n8', weight: 3 },
    ],
  },
  agentGrowth: {
    months: ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      { name: 'AlphaFold', values: [180, 320, 520, 680, 870, 1050] },
      { name: 'CRISPR', values: [120, 250, 400, 530, 680, 820] },
      { name: 'DrugScr', values: [80, 180, 300, 410, 540, 650] },
      { name: 'ProtDes', values: [60, 140, 240, 350, 450, 560] },
    ],
  },
  researchOutput: {
    months: ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      { name: 'Papers', values: [3, 4, 2, 5, 3, 6], color: '#ef4444' },
      { name: 'Experiments', values: [5, 8, 10, 7, 9, 12], color: '#3b82f6' },
      { name: 'Reviews', values: [2, 3, 2, 4, 3, 4], color: '#8b5cf6' },
      { name: 'Datasets', values: [1, 2, 3, 2, 4, 3], color: '#10b981' },
    ],
  },
  researchTopics: [
    { word: 'AlphaFold', count: 45, size: 48 },
    { word: 'CRISPR', count: 38, size: 42 },
    { word: 'Nanobody', count: 32, size: 38 },
    { word: 'Drug Screening', count: 28, size: 35 },
    { word: 'Binding Affinity', count: 24, size: 32 },
    { word: 'Structure Pred.', count: 22, size: 30 },
    { word: 'Molecular Dyn.', count: 20, size: 28 },
    { word: 'Protein Folding', count: 19, size: 27 },
    { word: 'Off-Target', count: 17, size: 25 },
    { word: 'Gene Expression', count: 16, size: 24 },
    { word: 'Deep Learning', count: 15, size: 23 },
    { word: 'Cryo-EM', count: 14, size: 22 },
    { word: 'Single-Cell', count: 13, size: 21 },
    { word: 'Transformer', count: 12, size: 20 },
    { word: 'Docking', count: 11, size: 19 },
    { word: 'Phosphorylation', count: 10, size: 18 },
    { word: 'RNA-Seq', count: 9, size: 17 },
    { word: 'Epigenomics', count: 8, size: 16 },
    { word: 'Proteomics', count: 8, size: 16 },
    { word: 'Variant Call', count: 7, size: 15 },
    { word: 'Clustering', count: 6, size: 14 },
    { word: 'Embedding', count: 5, size: 13 },
  ],
  experimentFunnel: [
    { stage: 'Proposed', count: 52, color: '#94a3b8' },
    { stage: 'Active', count: 38, color: '#3b82f6' },
    { stage: 'Analysis', count: 24, color: '#8b5cf6' },
    { stage: 'Complete', count: 15, color: '#f59e0b' },
    { stage: 'Published', count: 8, color: '#10b981' },
  ],
  citationScatter: [
    { x: 1, y: 42, label: 'Multi-Chain AF', color: '#ef4444', size: 10 },
    { x: 2, y: 38, label: 'CRISPR OT v3', color: '#3b82f6', size: 9 },
    { x: 3, y: 25, label: 'Nanobody Bind', color: '#10b981', size: 7 },
    { x: 1, y: 55, label: 'Folding Atlas', color: '#f59e0b', size: 12 },
    { x: 4, y: 18, label: 'Drug Pipeline', color: '#8b5cf6', size: 6 },
    { x: 2, y: 30, label: 'MD Review', color: '#ec4899', size: 8 },
    { x: 5, y: 22, label: 'SC Methods', color: '#06b6d4', size: 6 },
    { x: 3, y: 48, label: 'Trans Prot.', color: '#d97706', size: 10 },
    { x: 6, y: 12, label: 'Docking Opt.', color: '#14b8a6', size: 5 },
    { x: 4, y: 35, label: 'CryoEM Valid', color: '#a78bfa', size: 8 },
    { x: 5, y: 8, label: 'Variant Call', color: '#f472b6', size: 4 },
    { x: 6, y: 20, label: 'Gene Expr.', color: '#fb923c', size: 6 },
  ],
  productivityScores: Array.from({ length: 30 }, (_, i) => {
    const base = 65 + Math.sin(i * 0.3) * 15
    return Math.round(base + Math.random() * 10)
  }),
  focusDistribution: { Research: 42, Meetings: 28, Admin: 18, Break: 12 },
  taskCompletionRate: 78,
  productivityByDay: [
    { label: 'Mon', value: 82 }, { label: 'Tue', value: 88 }, { label: 'Wed', value: 85 },
    { label: 'Thu', value: 90 }, { label: 'Fri', value: 78 }, { label: 'Sat', value: 45 }, { label: 'Sun', value: 32 },
  ],
  streakDays: 12,
  streakCalendar: Array.from({ length: 35 }, () => Math.random() > 0.3 ? 1 : 0),
  resourceUtilization: [
    { type: 'Papers', value: 4.2, color: '#ef4444' },
    { type: 'Datasets', value: 18.7, color: '#3b82f6' },
    { type: 'Code', value: 6.8, color: '#10b981' },
    { type: 'Images', value: 3.1, color: '#8b5cf6' },
    { type: 'Other', value: 1.9, color: '#64748b' },
  ],
  downloadTrends: {
    weeks: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9', 'W10', 'W11', 'W12'],
    downloads: [120, 145, 160, 180, 210, 195, 230, 250, 245, 270, 290, 310],
  },
  mostViewed: [
    { title: 'AlphaFold Multi-Chain Pipeline', views: 1245, sparkline: [45, 52, 48, 60, 55, 68, 72] },
    { title: 'CRISPR Guide RNA Database', views: 987, sparkline: [38, 42, 45, 50, 48, 55, 60] },
    { title: 'Drug Screening Hit List Q4', views: 856, sparkline: [30, 35, 32, 40, 42, 38, 45] },
    { title: 'Nanobody Structure Collection', views: 743, sparkline: [25, 28, 30, 35, 32, 38, 40] },
    { title: 'Single-Cell RNA-Seq Atlas v3', views: 689, sparkline: [22, 25, 28, 30, 32, 35, 38] },
    { title: 'Molecular Dynamics Trajectories', views: 612, sparkline: [18, 22, 20, 25, 28, 30, 32] },
    { title: 'Protein Folding Benchmark', views: 534, sparkline: [15, 18, 20, 22, 25, 24, 28] },
    { title: 'Gene Expression Heatmaps', views: 478, sparkline: [12, 15, 18, 20, 18, 22, 25] },
    { title: 'Cryo-EM Density Maps', views: 421, sparkline: [10, 12, 15, 16, 18, 20, 22] },
    { title: 'ADMET Prediction Results', views: 389, sparkline: [8, 10, 12, 15, 14, 18, 20] },
  ],
  storageGrowth: {
    months: ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    values: [22.4, 24.8, 27.1, 29.5, 31.8, 34.7],
  },
  teamHeatmap: Array.from({ length: 7 }, (_, day) =>
    Array.from({ length: 24 }, (_, hour) => {
      const base = Math.sin((hour - 14) * 0.4) * 4 + 5
      const weekend = day >= 5 ? 0.25 : 1
      return Math.max(0, Math.round(base * weekend + Math.random() * 2))
    })
  ),
  teamLeaderboard: [
    { rank: 1, name: 'Dr. Sarah Chen', initials: 'SC', color: '#10b981', score: 245, badge: 'Gold' as const },
    { rank: 2, name: 'Dr. Maria Garcia', initials: 'MG', color: '#8b5cf6', score: 218, badge: 'Silver' as const },
    { rank: 3, name: 'Dr. James Park', initials: 'JP', color: '#3b82f6', score: 195, badge: 'Bronze' as const },
    { rank: 4, name: 'Dr. Wei Zhang', initials: 'WZ', color: '#f59e0b', score: 178 },
    { rank: 5, name: 'Dr. David Kim', initials: 'DK', color: '#ef4444', score: 162 },
    { rank: 6, name: 'Dr. Lisa Wang', initials: 'LW', color: '#ec4899', score: 148 },
    { rank: 7, name: 'Dr. Alex Rivera', initials: 'AR', color: '#06b6d4', score: 134 },
    { rank: 8, name: 'Dr. Priya Sharma', initials: 'PS', color: '#14b8a6', score: 121 },
  ],
  collabIndex: [
    { metric: 'Communication', value: 88 },
    { metric: 'Coordination', value: 76 },
    { metric: 'Knowledge Sharing', value: 82 },
    { metric: 'Trust', value: 91 },
    { metric: 'Shared Goals', value: 85 },
  ],
  responseTimeDist: { buckets: ['<1min', '1-5min', '5-15min', '15-30min', '30-60min', '>60min'], counts: [45, 82, 68, 35, 18, 8] },
}

// ═══════════════════════════════════════════════════════════════════
// TAB COMPONENTS
// ═══════════════════════════════════════════════════════════════════

// ─── Overview Tab ────────────────────────────────────────────────────

function OverviewTab() {
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    Meetings: true, Messages: true, Experiments: true, Publications: true, Citations: true,
  })
  const [tooltipIdx, setTooltipIdx] = useState<number | null>(null)

  const toggleDataset = useCallback((k: string) => {
    setToggles(prev => ({ ...prev, [k]: prev[k] !== false }))
  }, [])

  const getIcon = useCallback((type: string, c: string) => {
    if (type === 'message') return <MessageSquare size={14} color={c} />
    if (type === 'flask') return <FlaskConical size={14} color={c} />
    if (type === 'users') return <Users size={14} color={c} />
    if (type === 'file') return <FileText size={14} color={c} />
    return <TrendingUp size={14} color={c} />
  }, [])

  return (
    <div className="ah-animate-fade-in">
      {/* KPI Row */}
      <div className="ah-kpi-grid">
        {MOCK.kpis.map(kpi => (
          <div key={kpi.label} className="ah-kpi-card">
            <p className="ah-kpi-label">{kpi.label}</p>
            <p className="ah-kpi-value">{kpi.label === 'Messages This Week' ? kpi.value.toLocaleString() : kpi.value}</p>
            <div className="ah-kpi-footer">
              <span className={`ah-kpi-change ah-kpi-change-${kpi.trend}`}>
                {kpi.trend === 'up' && <ArrowUpRight size={10} />}
                {kpi.trend === 'down' && <ArrowDownRight size={10} />}
                {kpi.trend === 'flat' && <Minus size={10} />}
                {kpi.change > 0 ? '+' : ''}{kpi.change}%
              </span>
              <span className="ah-kpi-sparkline">
                <SparklineSVG data={kpi.sparkline} color={kpi.trend === 'down' ? '#ef4444' : '#10b981'} />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Chart */}
      <div className="ah-card" style={{ marginBottom: 24 }}>
        <div className="ah-card-header">
          <h3 className="ah-card-title"><Activity size={14} color="#10b981" /> 6-Month Research Activity</h3>
        </div>
        <div className="ah-card-body">
          <AreaChartSVG
            datasets={MOCK.researchActivity.datasets}
            labels={MOCK.researchActivity.months}
            toggles={toggles}
            onToggle={toggleDataset}
            tooltipIdx={tooltipIdx}
            onHover={setTooltipIdx}
          />
        </div>
      </div>

      {/* Secondary Charts Row */}
      <div className="ah-charts-row">
        {/* Meeting Type Donut */}
        <div className="ah-card">
          <div className="ah-card-header">
            <h3 className="ah-card-title"><MessageSquare size={14} color="#3b82f6" /> Meeting Types</h3>
          </div>
          <div className="ah-card-body" style={{ display: 'flex', justifyContent: 'center' }}>
            <DonutChartSVG data={MOCK.meetingTypes} />
          </div>
        </div>

        {/* Agent Utilization */}
        <div className="ah-card">
          <div className="ah-card-header">
            <h3 className="ah-card-title"><Users size={14} color="#8b5cf6" /> Agent Utilization</h3>
          </div>
          <div className="ah-card-body">
            <HorizontalBarSVG data={MOCK.agentUtilization} />
          </div>
        </div>

        {/* Weekly Activity Pattern */}
        <div className="ah-card">
          <div className="ah-card-header">
            <h3 className="ah-card-title"><Clock size={14} color="#f59e0b" /> Weekly Activity</h3>
            <span className="ah-card-subtitle">7 days × 24 hours</span>
          </div>
          <div className="ah-card-body">
            <HeatmapSVG grid={MOCK.weeklyHeatmap} />
          </div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="ah-card">
        <div className="ah-card-header">
          <h3 className="ah-card-title"><Zap size={14} color="#10b981" /> Recent Activity</h3>
          <span className="ah-card-subtitle">Last 10 events</span>
        </div>
        <div className="ah-card-body">
          <div className="ah-feed-list">
            {MOCK.recentActivity.map(item => (
              <div key={item.id} className="ah-feed-item">
                <div className="ah-feed-icon" style={{ background: `${item.color}15` }}>
                  {getIcon(item.icon, item.color)}
                </div>
                <span className="ah-feed-text">{item.desc}</span>
                <span className="ah-feed-time">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Meetings Tab ────────────────────────────────────────────────────

function MeetingsTab() {
  return (
    <div className="ah-animate-fade-in">
      {/* Meeting Trends */}
      <div className="ah-card" style={{ marginBottom: 24 }}>
        <div className="ah-card-header">
          <h3 className="ah-card-title"><TrendingUp size={14} color="#10b981" /> Meeting Trends (12 Weeks)</h3>
        </div>
        <div className="ah-card-body">
          <LineChartSVG
            datasets={[
              { name: 'Team', values: MOCK.meetingTrends.team },
              { name: 'Individual', values: MOCK.meetingTrends.individual },
            ]}
            labels={MOCK.meetingTrends.weeks}
            colors={['#10b981', '#3b82f6']}
          />
          <div className="ah-legend">
            <div className="ah-legend-item"><span className="ah-legend-dot" style={{ background: '#10b981' }} />Team</div>
            <div className="ah-legend-item"><span className="ah-legend-dot" style={{ background: '#3b82f6' }} />Individual</div>
          </div>
        </div>
      </div>

      <div className="ah-charts-row">
        {/* Duration Distribution */}
        <div className="ah-card">
          <div className="ah-card-header">
            <h3 className="ah-card-title"><Clock size={14} color="#3b82f6" /> Duration Distribution</h3>
          </div>
          <div className="ah-card-body">
            <HistogramSVG buckets={MOCK.meetingDurations.buckets} counts={MOCK.meetingDurations.counts} />
          </div>
        </div>

        {/* Top Topics */}
        <div className="ah-card">
          <div className="ah-card-header">
            <h3 className="ah-card-title"><BookOpen size={14} color="#8b5cf6" /> Top Meeting Topics</h3>
          </div>
          <div className="ah-card-body">
            <HorizontalBarSVG data={MOCK.meetingTopics} />
          </div>
        </div>

        {/* Success Rate Gauge */}
        <div className="ah-card">
          <div className="ah-card-header">
            <h3 className="ah-card-title"><Star size={14} color="#f59e0b" /> Meeting Success Rate</h3>
          </div>
          <div className="ah-card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <GaugeSVG value={MOCK.meetingSuccessRate} label="%" color="#10b981" size={160} />
            <p style={{ fontSize: 12, color: 'var(--vl-text-muted)', margin: 0 }}>Based on completion and goal achievement</p>
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="ah-card">
        <div className="ah-card-header">
          <h3 className="ah-card-title"><BarChart3 size={14} color="#06b6d4" /> Meeting Comparison</h3>
        </div>
        <div className="ah-card-body" style={{ overflowX: 'auto' }}>
          <table className="ah-table">
            <thead>
              <tr>
                <th>Meeting</th>
                <th>Participants</th>
                <th>Duration (min)</th>
                <th>Messages</th>
                <th>Sentiment</th>
              </tr>
            </thead>
            <tbody>
              {MOCK.meetingComparison.map(m => (
                <tr key={m.name}>
                  <td style={{ fontWeight: 600 }}>{m.name}</td>
                  <td>{m.participants}</td>
                  <td>{m.duration}</td>
                  <td>{m.messages}</td>
                  <td>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999,
                      background: m.sentiment === 'Positive' ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.12)',
                      color: m.sentiment === 'Positive' ? '#10b981' : '#64748b',
                    }}>
                      {m.sentiment}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Agents Tab ──────────────────────────────────────────────────────

function AgentsTab() {
  return (
    <div className="ah-animate-fade-in">
      {/* Performance Matrix */}
      <div className="ah-card" style={{ marginBottom: 24 }}>
        <div className="ah-card-header">
          <h3 className="ah-card-title"><Users size={14} color="#10b981" /> Agent Performance Matrix</h3>
          <span className="ah-card-subtitle">Scores 0-100 · Color: red → amber → emerald</span>
        </div>
        <div className="ah-card-body">
          <PerformanceMatrixSVG
            agents={MOCK.agentPerfMatrix.agents}
            metrics={MOCK.agentPerfMatrix.metrics}
            data={MOCK.agentPerfMatrix.data}
          />
        </div>
      </div>

      {/* Collaboration Network */}
      <div className="ah-card" style={{ marginBottom: 24 }}>
        <div className="ah-card-header">
          <h3 className="ah-card-title"><Activity size={14} color="#3b82f6" /> Agent Collaboration Network</h3>
          <span className="ah-card-subtitle">Node size = contribution · Edge weight = shared meetings</span>
        </div>
        <div className="ah-card-body">
          <ForceNetworkSVG nodes={MOCK.agentNetwork.nodes} edges={MOCK.agentNetwork.edges} />
        </div>
      </div>

      {/* Growth Timeline */}
      <div className="ah-card">
        <div className="ah-card-header">
          <h3 className="ah-card-title"><TrendingUp size={14} color="#8b5cf6" /> Agent Growth Timeline</h3>
          <span className="ah-card-subtitle">Cumulative messages over time</span>
        </div>
        <div className="ah-card-body">
          <LineChartSVG datasets={MOCK.agentGrowth.datasets} labels={MOCK.agentGrowth.months} />
        </div>
      </div>
    </div>
  )
}

// ─── Research Tab ───────────────────────────────────────────────────

function ResearchTab() {
  return (
    <div className="ah-animate-fade-in">
      {/* Research Output (Stacked Area) */}
      <div className="ah-card" style={{ marginBottom: 24 }}>
        <div className="ah-card-header">
          <h3 className="ah-card-title"><FlaskConical size={14} color="#10b981" /> Research Output Over Time</h3>
        </div>
        <div className="ah-card-body">
          <StackedAreaSVG datasets={MOCK.researchOutput.datasets} labels={MOCK.researchOutput.months} />
          <div className="ah-legend">
            {MOCK.researchOutput.datasets.map(ds => (
              <div key={ds.name} className="ah-legend-item"><span className="ah-legend-dot" style={{ background: ds.color }} />{ds.name}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="ah-charts-row">
        {/* Topic Cloud */}
        <div className="ah-card" style={{ gridColumn: 'span 2' }}>
          <div className="ah-card-header">
            <h3 className="ah-card-title"><BookOpen size={14} color="#8b5cf6" /> Research Topics Cloud</h3>
            <span className="ah-card-subtitle">20+ trending topics · Hover for count</span>
          </div>
          <div className="ah-card-body">
            <WordCloudSVG topics={MOCK.researchTopics} />
          </div>
        </div>

        {/* Experiment Funnel */}
        <div className="ah-card">
          <div className="ah-card-header">
            <h3 className="ah-card-title"><FlaskConical size={14} color="#3b82f6" /> Experiment Pipeline</h3>
          </div>
          <div className="ah-card-body">
            <FunnelSVG data={MOCK.experimentFunnel} width={350} />
          </div>
        </div>
      </div>

      {/* Citation Impact Scatter */}
      <div className="ah-card">
        <div className="ah-card-header">
          <h3 className="ah-card-title"><Star size={14} color="#f59e0b" /> Citation Impact</h3>
          <span className="ah-card-subtitle">Citations vs. publication month · Color by topic · Size by impact</span>
        </div>
        <div className="ah-card-body">
          <ScatterPlotSVG points={MOCK.citationScatter} />
        </div>
      </div>
    </div>
  )
}

// ─── Productivity Tab ────────────────────────────────────────────────

function ProductivityTab() {
  const dayLabels = MOCK.productivityScores.map((_, i) => `D${i + 1}`)
  const maxScore = Math.max(...MOCK.productivityScores, 1)

  return (
    <div className="ah-animate-fade-in">
      {/* Daily Productivity Score */}
      <div className="ah-card" style={{ marginBottom: 24 }}>
        <div className="ah-card-header">
          <h3 className="ah-card-title"><TrendingUp size={14} color="#10b981" /> Daily Productivity Score</h3>
          <span className="ah-card-subtitle">30-day rolling score</span>
        </div>
        <div className="ah-card-body">
          <LineChartSVG
            datasets={[{ name: 'Score', values: MOCK.productivityScores }]}
            labels={dayLabels}
            colors={['#10b981']}
            width={800}
            height={220}
          />
        </div>
      </div>

      <div className="ah-charts-row">
        {/* Focus Distribution */}
        <div className="ah-card">
          <div className="ah-card-header">
            <h3 className="ah-card-title"><Clock size={14} color="#3b82f6" /> Focus Time Distribution</h3>
          </div>
          <div className="ah-card-body" style={{ display: 'flex', justifyContent: 'center' }}>
            <DonutChartSVG data={MOCK.focusDistribution} />
          </div>
        </div>

        {/* Task Completion Gauge */}
        <div className="ah-card">
          <div className="ah-card-header">
            <h3 className="ah-card-title"><Star size={14} color="#f59e0b" /> Task Completion Rate</h3>
          </div>
          <div className="ah-card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <GaugeSVG value={MOCK.taskCompletionRate} label="%" color="#f59e0b" size={160} />
            <p style={{ fontSize: 12, color: 'var(--vl-text-muted)', margin: 0 }}>Tasks completed vs. planned this month</p>
          </div>
        </div>

        {/* By Day of Week */}
        <div className="ah-card">
          <div className="ah-card-header">
            <h3 className="ah-card-title"><BarChart3 size={14} color="#8b5cf6" /> Productivity by Day</h3>
          </div>
          <div className="ah-card-body">
            <BarChartSVG data={MOCK.productivityByDay} barColor="#8b5cf6" />
          </div>
        </div>
      </div>

      {/* Streak Counter */}
      <div className="ah-card">
        <div className="ah-card-header">
          <h3 className="ah-card-title"><Zap size={14} color="#10b981" /> Productivity Streak</h3>
        </div>
        <div className="ah-card-body" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 48, fontWeight: 800, color: '#10b981', margin: 0, lineHeight: 1 }}>{MOCK.streakDays}</p>
            <p style={{ fontSize: 12, color: 'var(--vl-text-muted)', margin: '4px 0 0' }}>Consecutive productive days</p>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, color: 'var(--vl-text-muted)', marginBottom: 8 }}>Last 35 days</p>
            <div className="ah-streak-strip">
              {MOCK.streakCalendar.map((active, i) => (
                <div key={`streak-${i}`} className={`ah-streak-day ${active ? 'ah-streak-day-active' : 'ah-streak-day-inactive'}`} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Resources Tab ──────────────────────────────────────────────────

function ResourcesTab() {
  return (
    <div className="ah-animate-fade-in">
      {/* Utilization + Downloads Row */}
      <div className="ah-charts-row">
        <div className="ah-card">
          <div className="ah-card-header">
            <h3 className="ah-card-title"><FolderOpen size={14} color="#3b82f6" /> Storage Utilization</h3>
            <span className="ah-card-subtitle">34.7 GB total</span>
          </div>
          <div className="ah-card-body">
            <BarChartSVG data={MOCK.resourceUtilization.map(r => ({ label: r.type, value: r.value }))} barColor="#3b82f6" />
          </div>
        </div>

        <div className="ah-card" style={{ gridColumn: 'span 2' }}>
          <div className="ah-card-header">
            <h3 className="ah-card-title"><Download size={14} color="#10b981" /> Download Trends</h3>
            <span className="ah-card-subtitle">12-week overview</span>
          </div>
          <div className="ah-card-body">
            <LineChartSVG
              datasets={[{ name: 'Downloads', values: MOCK.downloadTrends.downloads }]}
              labels={MOCK.downloadTrends.weeks}
              colors={['#10b981']}
              width={600}
              height={200}
            />
          </div>
        </div>
      </div>

      {/* Most Viewed + Storage Growth */}
      <div className="ah-charts-row">
        <div className="ah-card">
          <div className="ah-card-header">
            <h3 className="ah-card-title"><Eye size={14} color="#8b5cf6" /> Most Viewed Resources</h3>
          </div>
          <div className="ah-card-body ah-scrollable">
            {MOCK.mostViewed.map((res, i) => (
              <div key={res.title} className="ah-resource-item">
                <span className="ah-resource-rank">{i + 1}</span>
                <span className="ah-resource-name">{res.title}</span>
                <span className="ah-resource-views">{res.views.toLocaleString()}</span>
                <span className="ah-kpi-sparkline">
                  <SparklineSVG data={res.sparkline} color="#8b5cf6" width={60} height={20} />
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="ah-card" style={{ gridColumn: 'span 2' }}>
          <div className="ah-card-header">
            <h3 className="ah-card-title"><TrendingUp size={14} color="#f59e0b" /> Storage Growth</h3>
            <span className="ah-card-subtitle">6-month trend</span>
          </div>
          <div className="ah-card-body">
            <AreaChartSVG
              datasets={{ Storage: MOCK.storageGrowth.values }}
              labels={MOCK.storageGrowth.months}
              toggles={{ Storage: true }}
              onToggle={() => {}}
              tooltipIdx={null}
              onHover={() => {}}
              width={500}
              height={200}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Team Tab ───────────────────────────────────────────────────────

function TeamTab() {
  return (
    <div className="ah-animate-fade-in">
      {/* Team Activity Heatmap */}
      <div className="ah-card" style={{ marginBottom: 24 }}>
        <div className="ah-card-header">
          <h3 className="ah-card-title"><UsersRound size={14} color="#10b981" /> Team Activity Heatmap</h3>
          <span className="ah-card-subtitle">Activity by day × hour</span>
        </div>
        <div className="ah-card-body">
          <HeatmapSVG grid={MOCK.teamHeatmap} width={500} height={180} />
        </div>
      </div>

      {/* Leaderboard + Collaboration Index + Response Time */}
      <div className="ah-charts-row">
        {/* Leaderboard */}
        <div className="ah-card" style={{ gridColumn: 'span 2' }}>
          <div className="ah-card-header">
            <h3 className="ah-card-title"><Star size={14} color="#f59e0b" /> Contribution Leaderboard</h3>
          </div>
          <div className="ah-card-body ah-scrollable">
            {MOCK.teamLeaderboard.map(member => {
              const maxScore = MOCK.teamLeaderboard[0]?.score || 1
              return (
                <div key={member.name} className="ah-leaderboard-item">
                  <div className={`ah-leaderboard-rank ${member.rank <= 3 ? `ah-leaderboard-rank-${member.badge?.toLowerCase() || 'default'}` : 'ah-leaderboard-rank-default'}`}>
                    {member.rank}
                  </div>
                  <div className="ah-leaderboard-avatar" style={{ background: member.color }}>{member.initials}</div>
                  <div className="ah-leaderboard-info">
                    <p className="ah-leaderboard-name">{member.name}</p>
                    {member.badge && (
                      <span className={`ah-leaderboard-badge ah-badge-${member.badge.toLowerCase()}`}>{member.badge}</span>
                    )}
                  </div>
                  <div className="ah-leaderboard-bar-bg">
                    <div className="ah-leaderboard-bar-fill" style={{ width: `${(member.score / maxScore) * 100}%` }} />
                  </div>
                  <span className="ah-leaderboard-score">{member.score}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Collaboration Index + Response Time */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="ah-card">
            <div className="ah-card-header">
              <h3 className="ah-card-title"><Activity size={14} color="#3b82f6" /> Collaboration Index</h3>
            </div>
            <div className="ah-card-body">
              {MOCK.collabIndex.map(item => (
                <div key={item.metric} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--vl-text-muted)', width: 100, flexShrink: 0 }}>{item.metric}</span>
                  <div style={{ flex: 1, height: 8, background: 'var(--vl-bg-inner)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      width: `${item.value}%`, height: '100%', borderRadius: 4,
                      background: `linear-gradient(90deg, ${item.value > 85 ? '#10b981' : item.value > 70 ? '#f59e0b' : '#ef4444'}, ${item.value > 85 ? '#06b6d4' : item.value > 70 ? '#f59e0b' : '#ef4444'})`,
                      transition: 'width 0.8s ease-out',
                    }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--vl-text-primary)', width: 28, textAlign: 'right' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="ah-card">
            <div className="ah-card-header">
              <h3 className="ah-card-title"><Clock size={14} color="#8b5cf6" /> Response Time</h3>
            </div>
            <div className="ah-card-body">
              <HistogramSVG buckets={MOCK.responseTimeDist.buckets} counts={MOCK.responseTimeDist.counts} width={320} height={170} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Custom Tab ──────────────────────────────────────────────────────

function CustomTab() {
  const [selectedMetric, setSelectedMetric] = useState('meetings')
  const [selectedChart, setSelectedChart] = useState('bar')
  const [selectedRange, setSelectedRange] = useState('6months')

  const customChartData = useMemo(() => {
    const labels = selectedRange === '6months'
      ? ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      : ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9', 'W10', 'W11', 'W12']
    const metricData: Record<string, number[]> = {
      meetings: selectedRange === '6months' ? [12, 15, 18, 14, 20, 22] : [4, 3, 5, 4, 6, 5, 3, 4, 5, 6, 4, 5],
      messages: selectedRange === '6months' ? [890, 1020, 1150, 980, 1200, 1350] : [180, 210, 240, 200, 260, 240, 190, 230, 250, 280, 240, 310],
      experiments: selectedRange === '6months' ? [8, 12, 15, 10, 14, 18] : [3, 2, 4, 3, 3, 4, 2, 3, 4, 3, 2, 4],
    }
    const vals = metricData[selectedMetric] || []
    return labels.map((label, i) => ({ label, value: vals[i] || 0 }))
  }, [selectedMetric, selectedRange])

  const savedViews = [
    { name: 'Meeting Frequency', desc: 'Weekly meetings over 3 months', color: '#10b981', icon: <MessageSquare size={16} color="#10b981" /> },
    { name: 'Agent Messages', desc: 'Messages per agent breakdown', color: '#3b82f6', icon: <Users size={16} color="#3b82f6" /> },
    { name: 'Research Output', desc: 'Papers and experiments per month', color: '#8b5cf6', icon: <FlaskConical size={16} color="#8b5cf6" /> },
  ]

  const [savedNotification, setSavedNotification] = useState(false)
  const [activeView, setActiveView] = useState<number | null>(null)

  const handleSave = useCallback(() => {
    setSavedNotification(true)
    setTimeout(() => setSavedNotification(false), 2000)
  }, [])

  return (
    <div className="ah-animate-fade-in">
      {/* Query Builder */}
      <div className="ah-card" style={{ marginBottom: 24 }}>
        <div className="ah-card-header">
          <h3 className="ah-card-title"><BarChart3 size={14} color="#10b981" /> Query Builder</h3>
        </div>
        <div className="ah-card-body">
          <div className="ah-query-builder">
            <div className="ah-select-wrapper">
              <label className="ah-select-label">Metric</label>
              <select className="ah-select-input" value={selectedMetric} onChange={e => setSelectedMetric(e.target.value)}>
                <option value="meetings">Meetings</option>
                <option value="messages">Messages</option>
                <option value="experiments">Experiments</option>
              </select>
            </div>
            <div className="ah-select-wrapper">
              <label className="ah-select-label">Time Range</label>
              <select className="ah-select-input" value={selectedRange} onChange={e => setSelectedRange(e.target.value)}>
                <option value="6months">6 Months</option>
                <option value="12weeks">12 Weeks</option>
              </select>
            </div>
            <div className="ah-select-wrapper">
              <label className="ah-select-label">Chart Type</label>
              <select className="ah-select-input" value={selectedChart} onChange={e => setSelectedChart(e.target.value)}>
                <option value="bar">Bar</option>
                <option value="line">Line</option>
                <option value="donut">Donut</option>
              </select>
            </div>
            <button className="ah-btn ah-btn-primary" onClick={handleSave}>
              <Save size={14} /> Save View
            </button>
          </div>
          {savedNotification && (
            <p style={{ fontSize: 12, color: '#10b981', margin: '12px 0 0', animation: 'ah-fade-in 0.3s ease' }}>
              View saved successfully!
            </p>
          )}
        </div>
      </div>

      {/* Custom Chart */}
      <div className="ah-card" style={{ marginBottom: 24 }}>
        <div className="ah-card-header">
          <h3 className="ah-card-title">
            <RefreshCw size={14} color="#3b82f6" /> Custom Chart
            <span className="ah-card-subtitle" style={{ marginLeft: 8 }}>
              {selectedMetric} · {selectedRange} · {selectedChart}
            </span>
          </h3>
        </div>
        <div className="ah-card-body" style={{ display: 'flex', justifyContent: 'center' }}>
          {selectedChart === 'bar' && (
            <BarChartSVG data={customChartData} barColor="#3b82f6" width={600} height={220} />
          )}
          {selectedChart === 'line' && (
            <LineChartSVG
              datasets={[{ name: selectedMetric, values: customChartData.map(d => d.value) }]}
              labels={customChartData.map(d => d.label)}
              colors={['#3b82f6']}
              width={600}
              height={220}
            />
          )}
          {selectedChart === 'donut' && (
            <DonutChartSVG
              data={Object.fromEntries(customChartData.map(d => [d.label, d.value]))}
              size={200}
            />
          )}
        </div>
      </div>

      {/* Pre-built Views */}
      <div className="ah-card">
        <div className="ah-card-header">
          <h3 className="ah-card-title"><Star size={14} color="#f59e0b" /> Pre-built Custom Views</h3>
        </div>
        <div className="ah-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {savedViews.map((view, i) => (
            <div key={view.name} className="ah-saved-view-card" onClick={() => setActiveView(activeView === i ? null : i)}
              style={activeView === i ? { borderColor: 'var(--vl-accent)', background: 'var(--vl-accent-bg)' } : {}}>
              <div className="ah-saved-view-icon" style={{ background: `${view.color}15` }}>{view.icon}</div>
              <div className="ah-saved-view-info">
                <p className="ah-saved-view-name">{view.name}</p>
                <p className="ah-saved-view-desc">{view.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════

export default function AnalyticsHubPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [sidebarExpanded, setSidebarExpanded] = useState(false)

  const handleNavClick = useCallback((id: TabId) => {
    setActiveTab(id)
  }, [])

  const toggleSidebar = useCallback(() => {
    setSidebarExpanded(prev => !prev)
  }, [])

  const renderTabContent = useMemo(() => {
    switch (activeTab) {
      case 'overview': return <OverviewTab />
      case 'meetings': return <MeetingsTab />
      case 'agents': return <AgentsTab />
      case 'research': return <ResearchTab />
      case 'productivity': return <ProductivityTab />
      case 'resources': return <ResourcesTab />
      case 'team': return <TeamTab />
      case 'custom': return <CustomTab />
      default: return <OverviewTab />
    }
  }, [activeTab])

  return (
    <div className="ah-root">
      {/* ── Sidebar ── */}
      <nav className={`ah-sidebar ${sidebarExpanded ? 'ah-sidebar-expanded' : ''}`}>
        <div style={{ marginBottom: 16, padding: sidebarExpanded ? '8px 12px' : '0', flexShrink: 0 }}>
          {sidebarExpanded ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <BarChart3 size={14} color="#fff" />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--vl-text-primary)', whiteSpace: 'nowrap' }}>Analytics Hub</span>
            </div>
          ) : (
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #10b981, #06b6d4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <BarChart3 size={16} color="#fff" />
            </div>
          )}
        </div>

        <div className="ah-sidebar-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`ah-nav-item ${activeTab === item.id ? 'ah-nav-item-active' : ''}`}
              onClick={() => handleNavClick(item.id)}
              title={item.label}
            >
              <item.Icon size={18} />
              <span className="ah-nav-label">{item.label}</span>
            </button>
          ))}
        </div>

        <button className="ah-sidebar-toggle" onClick={toggleSidebar} title={sidebarExpanded ? 'Collapse' : 'Expand'}>
          {sidebarExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </nav>

      {/* ── Main Content ── */}
      <main className={`ah-main ${sidebarExpanded ? 'ah-main-expanded' : ''}`}>
        <div className="ah-header">
          <div className="ah-header-icon">
            {NAV_ITEMS.find(n => n.id === activeTab) && (() => {
              const nav = NAV_ITEMS.find(n => n.id === activeTab)
              return nav ? <nav.Icon size={20} color="#fff" /> : null
            })()}
          </div>
          <div>
            <h1 className="ah-title">Analytics Hub</h1>
            <p className="ah-subtitle">Comprehensive multi-view research metrics dashboard</p>
          </div>
        </div>

        {renderTabContent}
      </main>
    </div>
  )
}
