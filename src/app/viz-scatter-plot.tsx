'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, Grid3x3 } from 'lucide-react'
import { t } from '@/lib/i18n'

// ============================================================
// Types
// ============================================================

export interface ScatterAgent {
  id: string
  label: string
  color: string
  avgMessagesPerMeeting: number
  participationRate: number
  totalMessages: number
}

export interface ScatterPlotProps {
  agents: ScatterAgent[]
  width?: number
  height?: number
}

// ============================================================
// Demo Data
// ============================================================

export function generateScatterDemoData(): ScatterAgent[] {
  return [
    { id: 'a1', label: 'PI Lead', color: '#8b5cf6', avgMessagesPerMeeting: 12.5, participationRate: 0.95, totalMessages: 92 },
    { id: 'a2', label: 'Critic', color: '#ec4899', avgMessagesPerMeeting: 10.2, participationRate: 0.82, totalMessages: 78 },
    { id: 'a3', label: 'Analyst', color: '#14b8a6', avgMessagesPerMeeting: 7.5, participationRate: 0.68, totalMessages: 58 },
    { id: 'a4', label: 'Reporter', color: '#f97316', avgMessagesPerMeeting: 5.8, participationRate: 0.55, totalMessages: 42 },
    { id: 'a5', label: 'Developer', color: '#06b6d4', avgMessagesPerMeeting: 9.1, participationRate: 0.75, totalMessages: 65 },
    { id: 'a6', label: 'Reviewer', color: '#10b981', avgMessagesPerMeeting: 4.2, participationRate: 0.42, totalMessages: 35 },
    { id: 'a7', label: 'Student', color: '#f59e0b', avgMessagesPerMeeting: 3.1, participationRate: 0.32, totalMessages: 22 },
    { id: 'a8', label: 'PM', color: '#ef4444', avgMessagesPerMeeting: 6.5, participationRate: 0.60, totalMessages: 48 },
    { id: 'a9', label: 'ML Eng', color: '#a78bfa', avgMessagesPerMeeting: 8.3, participationRate: 0.48, totalMessages: 30 },
    { id: 'a10', label: 'Biochemist', color: '#34d399', avgMessagesPerMeeting: 7.0, participationRate: 0.58, totalMessages: 40 },
  ]
}

// ============================================================
// Linear Regression
// ============================================================

function linearRegression(points: { x: number; y: number }[]): { slope: number; intercept: number; r2: number } {
  const n = points.length
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 }

  const sumX = points.reduce((s, p) => s + p.x, 0)
  const sumY = points.reduce((s, p) => s + p.y, 0)
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0)
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0)

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) || 0
  const intercept = (sumY - slope * sumX) / n

  const yMean = sumY / n
  const ssTotal = points.reduce((s, p) => s + (p.y - yMean) ** 2, 0)
  const ssResidual = points.reduce((s, p) => s + (p.y - (slope * p.x + intercept)) ** 2, 0)
  const r2 = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0

  return { slope, intercept, r2 }
}

// ============================================================
// Quadrant Labels
// ============================================================

const QUADRANT_LABELS = [
  { x: 'Low Volume', y: 'High Participation', align: 'start', label: 'Quiet Achiever' },
  { x: 'High Volume', y: 'High Participation', align: 'end', label: 'Power Contributor' },
  { x: 'Low Volume', y: 'Low Participation', align: 'start', label: 'Peripheral' },
  { x: 'High Volume', y: 'Low Participation', align: 'end', label: 'Verbose Lurker' },
]

// ============================================================
// Scatter Plot Component
// ============================================================

export function ScatterPlot({ agents, width = 800, height = 500 }: ScatterPlotProps) {
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; agent: ScatterAgent } | null>(null)
  const [showTrend, setShowTrend] = useState(true)
  const [showQuadrants, setShowQuadrants] = useState(true)
  const [animated, setAnimated] = useState(false)

  const padding = { top: 30, right: 30, bottom: 50, left: 55 }
  const plotW = width - padding.left - padding.right
  const plotH = height - padding.top - padding.bottom

  // Scale domains
  const maxX = Math.max(...agents.map(a => a.avgMessagesPerMeeting), 1)
  const maxY = Math.max(...agents.map(a => a.participationRate), 1)
  const maxMsgs = Math.max(...agents.map(a => a.totalMessages), 1)

  const scaleX = (val: number) => padding.left + (val / (maxX * 1.15)) * plotW
  const scaleY = (val: number) => padding.top + plotH - (val / (maxY * 1.15)) * plotH
  const scaleR = (val: number) => 8 + (val / maxMsgs) * 24

  // Trend line
  const trend = useMemo(() => {
    const points = agents.map(a => ({ x: a.avgMessagesPerMeeting, y: a.participationRate }))
    return linearRegression(points)
  }, [agents])

  // Quadrant center
  const midX = maxX * 0.575
  const midY = maxY * 0.575

  // Start animation
  React.useEffect(() => {
    setTimeout(() => setAnimated(true), 100)
  }, [])

  const handleBubbleEnter = (agent: ScatterAgent, e: React.MouseEvent) => {
    setHoveredAgent(agent.id)
    const svgEl = e.currentTarget.closest('svg')
    if (svgEl) {
      const svgRect = svgEl.getBoundingClientRect()
      const scaleXRatio = svgRect.width / width
      const px = scaleX(agent.avgMessagesPerMeeting) * scaleXRatio
      const py = scaleY(agent.participationRate) * (svgRect.height / height)
      setTooltip({ x: px, y: py - 10, agent })
    }
  }

  const handleBubbleLeave = () => {
    setHoveredAgent(null)
    setTooltip(null)
  }

  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1.0].filter(v => v <= maxY * 1.1)
  // X-axis ticks
  const xTicks: number[] = []
  const xStep = maxX > 10 ? 5 : maxX > 5 ? 2 : 1
  for (let i = 0; i <= maxX * 1.1; i += xStep) xTicks.push(i)

  return (
    <div className="viz-scatter-container vl-inner rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-xs font-semibold vl-text-heading flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400" />
          {t('en', 'viz.scatter.title') || 'Agent Analysis Scatter'}
        </h3>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowTrend(v => !v)}
            className={`text-[10px] px-2 py-1 rounded-md border transition-colors flex items-center gap-1 ${
              showTrend ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
            }`}
          >
            <TrendingUp className="size-3" /> Trend
          </button>
          <button
            onClick={() => setShowQuadrants(v => !v)}
            className={`text-[10px] px-2 py-1 rounded-md border transition-colors flex items-center gap-1 ${
              showQuadrants ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
            }`}
          >
            <Grid3x3 className="size-3" /> Quadrants
          </button>
        </div>
      </div>

      {/* SVG */}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full rounded-lg" style={{ height: 'auto' }}>
        {/* Grid lines */}
        {yTicks.map(tick => (
          <line
            key={`y-grid-${tick}`}
            x1={padding.left} y1={scaleY(tick)}
            x2={width - padding.right} y2={scaleY(tick)}
            stroke="var(--vl-chart-grid, #334155)"
            strokeWidth="0.5"
            opacity="0.3"
          />
        ))}
        {xTicks.map(tick => (
          <line
            key={`x-grid-${tick}`}
            x1={scaleX(tick)} y1={padding.top}
            x2={scaleX(tick)} y2={height - padding.bottom}
            stroke="var(--vl-chart-grid, #334155)"
            strokeWidth="0.5"
            opacity="0.3"
          />
        ))}

        {/* Quadrant lines */}
        {showQuadrants && (
          <>
            <line
              x1={scaleX(midX)} y1={padding.top}
              x2={scaleX(midX)} y2={height - padding.bottom}
              className="viz-scatter-quadrant"
            />
            <line
              x1={padding.left} y1={scaleY(midY)}
              x2={width - padding.right} y2={scaleY(midY)}
              className="viz-scatter-quadrant"
            />
            {/* Quadrant labels */}
            <text x={scaleX(midX / 2)} y={scaleY(midY) - 8} className="viz-scatter-quadrant-label" textAnchor="middle">
              Quiet Achiever
            </text>
            <text x={scaleX((midX + maxX * 1.15) / 2)} y={scaleY(midY) - 8} className="viz-scatter-quadrant-label" textAnchor="middle">
              Power Contributor
            </text>
            <text x={scaleX(midX / 2)} y={scaleY(0) - 8} className="viz-scatter-quadrant-label" textAnchor="middle">
              Peripheral
            </text>
            <text x={scaleX((midX + maxX * 1.15) / 2)} y={scaleY(0) - 8} className="viz-scatter-quadrant-label" textAnchor="middle">
              Verbose Lurker
            </text>
          </>
        )}

        {/* Trend line */}
        {showTrend && animated && (
          <motion.line
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.7 }}
            transition={{ duration: 1.2, delay: 0.3 }}
            x1={scaleX(0)} y1={scaleY(trend.intercept)}
            x2={scaleX(maxX * 1.15)} y2={scaleY(trend.slope * maxX * 1.15 + trend.intercept)}
            className="viz-scatter-trend-line"
            style={{ strokeDasharray: 500, strokeDashoffset: 0 }}
          />
        )}

        {/* Axes */}
        <line
          x1={padding.left} y1={height - padding.bottom}
          x2={width - padding.right} y2={height - padding.bottom}
          stroke="var(--vl-chart-axis-line, #475569)" strokeWidth="1"
        />
        <line
          x1={padding.left} y1={padding.top}
          x2={padding.left} y2={height - padding.bottom}
          stroke="var(--vl-chart-axis-line, #475569)" strokeWidth="1"
        />

        {/* X-axis ticks and labels */}
        {xTicks.map(tick => (
          <g key={`x-tick-${tick}`}>
            <line x1={scaleX(tick)} y1={height - padding.bottom} x2={scaleX(tick)} y2={height - padding.bottom + 4} stroke="var(--vl-chart-axis, #94a3b8)" strokeWidth="1" />
            <text x={scaleX(tick)} y={height - padding.bottom + 16} className="viz-scatter-axis-label">
              {tick.toFixed(0)}
            </text>
          </g>
        ))}

        {/* Y-axis ticks and labels */}
        {yTicks.map(tick => (
          <g key={`y-tick-${tick}`}>
            <line x1={padding.left - 4} y1={scaleY(tick)} x2={padding.left} y2={scaleY(tick)} stroke="var(--vl-chart-axis, #94a3b8)" strokeWidth="1" />
            <text x={padding.left - 8} y={scaleY(tick)} className="viz-scatter-axis-label" textAnchor="end">
              {(tick * 100).toFixed(0)}%
            </text>
          </g>
        ))}

        {/* Axis titles */}
        <text x={width / 2} y={height - 4} className="viz-scatter-axis-title">
          Messages per Meeting (avg)
        </text>
        <text x={12} y={height / 2} className="viz-scatter-axis-title" transform={`rotate(-90, 12, ${height / 2})`}>
          Participation Rate
        </text>

        {/* Bubbles */}
        {agents.map((agent, idx) => {
          const r = scaleR(agent.totalMessages)
          const cx = scaleX(agent.avgMessagesPerMeeting)
          const cy = scaleY(agent.participationRate)
          const isHovered = hoveredAgent === agent.id

          return (
            <motion.g
              key={agent.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={animated ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
              transition={{ delay: idx * 0.08, duration: 0.5, type: 'spring', stiffness: 200, damping: 20 }}
              style={{ transformOrigin: `${cx}px ${cy}px` }}
            >
              {/* Shadow */}
              <circle cx={cx} cy={cy + 2} r={r} fill="rgba(0,0,0,0.2)" />
              {/* Bubble */}
              <circle
                cx={cx} cy={cy} r={r}
                fill={agent.color}
                opacity={hoveredAgent && !isHovered ? 0.3 : 0.7}
                stroke={isHovered ? '#ffffff' : agent.color}
                strokeWidth={isHovered ? 2 : 1}
                className="viz-scatter-bubble"
                onMouseEnter={(e) => handleBubbleEnter(agent, e)}
                onMouseLeave={handleBubbleLeave}
              />
              {/* Label inside large bubbles */}
              {r > 18 && (
                <text
                  x={cx} y={cy}
                  textAnchor="middle" dominantBaseline="middle"
                  fill="#ffffff" fontSize="9" fontWeight="600"
                  className="pointer-events-none"
                >
                  {agent.label.length > 8 ? agent.label.slice(0, 7) + '…' : agent.label}
                </text>
              )}
            </motion.g>
          )
        })}
      </svg>

      {/* Tooltip */}
      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="viz-scatter-tooltip"
            style={{
              left: Math.min(tooltip.x - 60, width - 180),
              top: Math.max(tooltip.y - 70, 4),
            }}
          >
            <p className="font-semibold" style={{ color: tooltip.agent.color }}>{tooltip.agent.label}</p>
            <p className="text-[10px] mt-1">Avg msgs/meeting: {tooltip.agent.avgMessagesPerMeeting.toFixed(1)}</p>
            <p className="text-[10px]">Participation: {(tooltip.agent.participationRate * 100).toFixed(0)}%</p>
            <p className="text-[10px]">Total messages: {tooltip.agent.totalMessages}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trend info */}
      {showTrend && (
        <p className="text-[10px] vl-text-muted text-center mt-2">
          Trend line (R² = {trend.r2.toFixed(2)}): {trend.slope > 0 ? 'Positive correlation' : 'Negative correlation'} between message volume and participation
        </p>
      )}

      {/* Legend note */}
      <div className="flex items-center justify-center gap-4 mt-1">
        <div className="text-[10px] vl-text-muted flex items-center gap-1">
          <span>Bubble size</span> = total messages
        </div>
        <div className="text-[10px] vl-text-muted flex items-center gap-1">
          <span>Color</span> = agent color
        </div>
      </div>
    </div>
  )
}
