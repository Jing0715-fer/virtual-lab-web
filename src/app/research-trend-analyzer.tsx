'use client'

import React, { useState, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp, TrendingDown, Minus, Star, Calendar, Hash,
  ArrowUpRight, ArrowDownRight, ChevronRight, BarChart3,
  Sparkles, Eye, EyeOff, RefreshCw, ZoomIn, Info,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { Meeting, DiscussionMessage } from './shared-components'

// ============================================================
// Types
// ============================================================

type TimeRange = '7days' | '30days' | '90days' | 'all'
type TrendDirection = 'rising' | 'declining' | 'stable' | 'new'

interface TrendKeyword {
  word: string
  totalFreq: number
  direction: TrendDirection
  changePercent: number
  periodFreqs: number[]
}

interface TimePeriod {
  label: string
  startDate: Date
  endDate: Date
}

interface TooltipState {
  show: boolean
  x: number
  y: number
  period: string
  data: { word: string; value: number; color: string }[]
}

interface Props {
  meetings: Meeting[]
}

// ============================================================
// Constants
// ============================================================

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
  'example', 'several', 'note', 'therefore', 'thus',
  'since', 'although', 'furthermore', 'addition', 'fact', 'often',
  'within', 'different', 'various', 'related', 'provide',
  'able', 'high', 'found', 'show', 'shown', 'given', 'current',
  'overall', 'particularly', 'significant', 'number',
])

const LINE_COLORS = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444']

const TREND_DIR_CONFIG: Record<TrendDirection, {
  icon: React.ElementType
  label: string
  color: string
  bgColor: string
}> = {
  rising: { icon: ArrowUpRight, label: 'Rising', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
  declining: { icon: ArrowDownRight, label: 'Declining', color: 'text-red-400', bgColor: 'bg-red-500/10' },
  stable: { icon: Minus, label: 'Stable', color: 'text-slate-400', bgColor: 'bg-slate-500/10' },
  new: { icon: Star, label: 'New', color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
}

// ============================================================
// Helpers
// ============================================================

function getTimePeriods(range: TimeRange): TimePeriod[] {
  const now = new Date()
  let startDate: Date
  let numPeriods: number
  let periodLabel: string

  switch (range) {
    case '7days':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      numPeriods = 7
      periodLabel = 'day'
      break
    case '30days':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      numPeriods = 6
      periodLabel = 'week'
      break
    case '90days':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      numPeriods = 6
      periodLabel = '2 weeks'
      break
    default: // 'all'
      startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
      numPeriods = 6
      periodLabel = 'month'
      break
  }

  const periods: TimePeriod[] = []
  for (let i = 0; i < numPeriods; i++) {
    const pStart = new Date(startDate.getTime() + (i / numPeriods) * (now.getTime() - startDate.getTime()))
    const pEnd = new Date(startDate.getTime() + ((i + 1) / numPeriods) * (now.getTime() - startDate.getTime()))
    periods.push({
      label: `${periodLabel} ${i + 1}`,
      startDate: pStart,
      endDate: pEnd,
    })
  }
  return periods
}

function extractWords(text: string): string[] {
  return text.toLowerCase()
    .split(/[\s,.!?;:()"'[\]{}<>\/\\|`~@#$%^&*+=_-]+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w))
}

function computeKeywordTrends(meetings: Meeting[], range: TimeRange): {
  keywords: TrendKeyword[]
  periods: TimePeriod[]
  allWordFreq: Record<string, number>
} {
  const periods = getTimePeriods(range)
  const allMessages = meetings.flatMap(m => m.messages || [])

  // Group messages into periods
  const periodMessages: string[][] = periods.map(() => [])
  allMessages.forEach(msg => {
    const msgDate = new Date(msg.createdAt)
    for (let i = 0; i < periods.length; i++) {
      if (msgDate >= periods[i].startDate && msgDate < periods[i].endDate) {
        periodMessages[i].push(msg.message)
        break
      }
    }
  })

  // Count word frequency per period
  const periodWordFreqs = periodMessages.map(msgs => {
    const freq: Record<string, number> = {}
    msgs.forEach(msg => {
      extractWords(msg).forEach(w => { freq[w] = (freq[w] || 0) + 1 })
    })
    return freq
  })

  // Total frequency across all periods
  const allWordFreq: Record<string, number> = {}
  periodWordFreqs.forEach(pwf => {
    Object.entries(pwf).forEach(([w, c]) => { allWordFreq[w] = (allWordFreq[w] || 0) + c })
  })

  // Top 10 keywords by total frequency
  const topWords = Object.entries(allWordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([w]) => w)

  // Compute trend direction
  const keywords: TrendKeyword[] = topWords.map(word => {
    const periodFreqs = periodWordFreqs.map(pwf => pwf[word] || 0)
    const totalFreq = periodFreqs.reduce((a, b) => a + b, 0)

    let direction: TrendDirection = 'stable'
    let changePercent = 0

    if (periodFreqs.length >= 2) {
      const firstHalf = periodFreqs.slice(0, Math.floor(periodFreqs.length / 2))
      const secondHalf = periodFreqs.slice(Math.floor(periodFreqs.length / 2))
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length

      if (firstAvg === 0 && secondAvg > 0) {
        direction = 'new'
        changePercent = 100
      } else if (firstAvg > 0) {
        changePercent = Math.round(((secondAvg - firstAvg) / firstAvg) * 100)
        if (changePercent > 15) direction = 'rising'
        else if (changePercent < -15) direction = 'declining'
        else direction = 'stable'
      }
    } else if (periodFreqs.length === 1 && periodFreqs[0] > 0) {
      direction = 'new'
      changePercent = 100
    }

    return { word, totalFreq, direction, changePercent, periodFreqs }
  })

  return { keywords, periods, allWordFreq }
}

// ============================================================
// SVG Trend Chart Component
// ============================================================

function TrendLineChart({
  keywords,
  periods,
  visibleKeywords,
  tooltip,
  onMouseLeave,
}: {
  keywords: TrendKeyword[]
  periods: TimePeriod[]
  visibleKeywords: Set<string>
  tooltip: TooltipState
  onMouseLeave: () => void
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const top5 = keywords.slice(0, 5)
  const maxVal = Math.max(...top5.flatMap(k => k.periodFreqs), 1)

  const width = 700
  const height = 300
  const padding = { top: 20, right: 20, bottom: 40, left: 45 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const getX = (i: number) => padding.left + (i / Math.max(periods.length - 1, 1)) * chartW
  const getY = (v: number) => padding.top + chartH - (v / maxVal) * chartH

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto"
      preserveAspectRatio="xMidYMid meet"
      onMouseLeave={onMouseLeave}
    >
      <defs>
        {top5.map((kw, i) => (
          <linearGradient key={`grad-${i}`} id={`area-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={LINE_COLORS[i]} stopOpacity={0.25} />
            <stop offset="100%" stopColor={LINE_COLORS[i]} stopOpacity={0.02} />
          </linearGradient>
        ))}
      </defs>

      {/* Grid lines */}
      {Array.from({ length: 5 }).map((_, i) => {
        const y = padding.top + (i / 4) * chartH
        const val = Math.round(maxVal * (1 - i / 4))
        return (
          <g key={`grid-${i}`}>
            <line
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke="var(--vl-chart-grid)"
              strokeWidth="0.5"
              strokeDasharray="4,4"
            />
            <text
              x={padding.left - 8}
              y={y + 4}
              textAnchor="end"
              fill="var(--vl-chart-axis)"
              fontSize="10"
            >
              {val}
            </text>
          </g>
        )
      })}

      {/* X axis labels */}
      {periods.map((period, i) => (
        <text
          key={`x-${i}`}
          x={getX(i)}
          y={height - 8}
          textAnchor="middle"
          fill="var(--vl-chart-axis)"
          fontSize="10"
        >
          {period.label}
        </text>
      ))}

      {/* Lines and area fills */}
      {top5.map((kw, i) => {
        if (!visibleKeywords.has(kw.word)) return null

        const points = kw.periodFreqs.map((freq, j) => ({
          x: getX(j),
          y: getY(freq),
        }))

        const linePath = points.map((p, j) => `${j === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
        const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`

        return (
          <g key={`line-${kw.word}`}>
            <motion.path
              d={areaPath}
              fill={`url(#area-grad-${i})`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
            />
            <motion.path
              d={linePath}
              fill="none"
              stroke={LINE_COLORS[i]}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, delay: i * 0.1 }}
            />
            {/* Data points */}
            {points.map((p, j) => (
              <motion.circle
                key={`pt-${j}`}
                cx={p.x}
                cy={p.y}
                r="3.5"
                fill={LINE_COLORS[i]}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, delay: 0.6 + i * 0.1 + j * 0.05 }}
              />
            ))}
          </g>
        )
      })}

      {/* Hover vertical line */}
      {tooltip.show && (
        <line
          x1={tooltip.x}
          y1={padding.top}
          x2={tooltip.x}
          y2={padding.top + chartH}
          stroke="var(--vl-border)"
          strokeWidth="1"
          strokeDasharray="3,3"
          opacity={0.6}
        />
      )}

      {/* Tooltip box */}
      {tooltip.show && tooltip.data.length > 0 && (
        <g>
          <rect
            x={Math.min(tooltip.x + 12, width - 160)}
            y={tooltip.y - 10}
            width="148"
            height={20 + tooltip.data.length * 22}
            rx="8"
            fill="var(--vl-bg-card)"
            stroke="var(--vl-border)"
            strokeWidth="1"
            opacity="0.95"
          />
          <text
            x={Math.min(tooltip.x + 20, width - 152)}
            y={tooltip.y + 6}
            fill="var(--vl-text-muted)"
            fontSize="10"
            fontWeight="600"
          >
            {tooltip.period}
          </text>
          {tooltip.data.map((d, i) => (
            <g key={d.word}>
              <circle
                cx={Math.min(tooltip.x + 26, width - 146)}
                cy={tooltip.y + 24 + i * 22}
                r="4"
                fill={d.color}
              />
              <text
                x={Math.min(tooltip.x + 36, width - 136)}
                y={tooltip.y + 28 + i * 22}
                fill="var(--vl-text-body)"
                fontSize="10"
              >
                {d.word.length > 14 ? d.word.slice(0, 14) + '…' : d.word}: {d.value}
              </text>
            </g>
          ))}
        </g>
      )}
    </svg>
  )
}

// ============================================================
// Word Cloud Component
// ============================================================

function WordCloud({ keywords }: { keywords: TrendKeyword[] }) {
  const maxFreq = Math.max(...keywords.map(k => k.totalFreq), 1)

  const getFontSize = (freq: number) => {
    const ratio = freq / maxFreq
    if (ratio > 0.7) return 'text-3xl font-bold'
    if (ratio > 0.5) return 'text-2xl font-bold'
    if (ratio > 0.3) return 'text-xl font-semibold'
    if (ratio > 0.15) return 'text-base font-medium'
    return 'text-sm font-medium'
  }

  const getColor = (dir: TrendDirection) => {
    switch (dir) {
      case 'rising': return 'text-emerald-400 hover:text-emerald-300'
      case 'declining': return 'text-red-400 hover:text-red-300'
      case 'stable': return 'text-slate-400 hover:text-slate-300'
      case 'new': return 'text-amber-400 hover:text-amber-300'
    }
  }

  const getIcon = (dir: TrendDirection) => {
    const config = TREND_DIR_CONFIG[dir]
    return config.icon
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 py-4">
      <AnimatePresence>
        {keywords.map((kw, i) => {
          const Icon = getIcon(kw.direction)
          return (
            <motion.div
              key={kw.word}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="flex items-center gap-1 cursor-default"
            >
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={`${getFontSize(kw.totalFreq)} ${getColor(kw.direction)} transition-colors duration-200 leading-none`}>
                      {kw.word}
                      <Icon className="inline-block size-3 ml-0.5 align-middle" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="tooltip-glass">
                    <p className="text-xs">{kw.word}: {kw.totalFreq} mentions</p>
                    <p className="text-xs text-emerald-400">{TREND_DIR_CONFIG[kw.direction].label} ({kw.changePercent > 0 ? '+' : ''}{kw.changePercent}%)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

// ============================================================
// Main Component
// ============================================================

export default function ResearchTrendAnalyzer({ meetings }: Props) {
  const [timeRange, setTimeRange] = useState<TimeRange>('30days')
  const [tooltip, setTooltip] = useState<TooltipState>({ show: false, x: 0, y: 0, period: '', data: [] })
  const [visibleKeywords, setVisibleKeywords] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    return new Set()
  })

  const { keywords, periods, allWordFreq } = useMemo(
    () => computeKeywordTrends(meetings, timeRange),
    [meetings, timeRange]
  )

  // Initialize visible keywords when keywords change
  const initRef = React.useRef(false)
  React.useEffect(() => {
    if (!initRef.current && keywords.length > 0 && visibleKeywords.size === 0) {
      initRef.current = true
      queueMicrotask(() => {
        setVisibleKeywords(new Set(keywords.slice(0, 5).map(k => k.word)))
      })
    }
  }, [keywords, visibleKeywords.size])

  const toggleKeyword = useCallback((word: string) => {
    setVisibleKeywords(prev => {
      const next = new Set(prev)
      if (next.has(word)) next.delete(word)
      else next.add(word)
      return next
    })
  }, [])

  const handleChartMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const svgWidth = svg.viewBox.baseVal.width
    const scaleX = svgWidth / rect.width
    const x = (e.clientX - rect.left) * scaleX

    const padding = { left: 45, right: 20 }
    const chartW = svgWidth - padding.left - padding.right

    const periodIndex = Math.round(((x - padding.left) / chartW) * (periods.length - 1))

    if (periodIndex >= 0 && periodIndex < periods.length) {
      const top5 = keywords.slice(0, 5)
      const data = top5
        .filter(k => visibleKeywords.has(k.word))
        .map((k, i) => ({
          word: k.word,
          value: k.periodFreqs[periodIndex] || 0,
          color: LINE_COLORS[i],
        }))
        .filter(d => d.value > 0)

      setTooltip({
        show: true,
        x,
        y: e.clientY - rect.top,
        period: periods[periodIndex].label,
        data,
      })
    }
  }, [keywords, periods, visibleKeywords])

  const handleMouseLeave = useCallback(() => {
    setTooltip(prev => ({ ...prev, show: false }))
  }, [])

  const totalKeywords = Object.keys(allWordFreq).length
  const totalMentions = Object.values(allWordFreq).reduce((a, b) => a + b, 0)
  const risingCount = keywords.filter(k => k.direction === 'rising' || k.direction === 'new').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <TrendingUp className="size-4 text-white" />
            </div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--vl-text-white)' }}>
              Research Trend Analyzer
            </h2>
          </div>
          <p className="text-sm vl-text-muted mt-1">
            Tracking {totalKeywords} unique keywords across {totalMentions} mentions in {meetings.length} meetings
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400 bg-emerald-500/5">
            <ArrowUpRight className="size-3 mr-1" />
            {risingCount} Rising
          </Badge>
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <Calendar className="size-3 mr-1.5 vl-text-muted" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {keywords.length === 0 ? (
        <Card className="vl-card backdrop-blur-sm">
          <CardContent className="py-12 flex flex-col items-center">
            <BarChart3 className="size-12 vl-text-muted mb-3" />
            <p className="text-sm vl-text-muted font-medium">No trend data available</p>
            <p className="text-xs vl-text-muted mt-1">Complete some meetings with messages to see research trends</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Trend Chart */}
          <Card className="vl-card backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold" style={{ color: 'var(--vl-text-white)' }}>
                Keyword Frequency Over Time
              </CardTitle>
              <CardDescription className="text-xs vl-text-muted">
                Top 5 keywords tracked across {periods.length} time periods
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="vl-inner rounded-xl p-4 overflow-x-auto">
                <TrendLineChart
                  keywords={keywords}
                  periods={periods}
                  visibleKeywords={visibleKeywords}
                  tooltip={tooltip}
                  onMouseLeave={handleMouseLeave}
                />
              </div>

              {/* Interactive Legend */}
              <div className="flex flex-wrap gap-2 mt-4">
                {keywords.slice(0, 5).map((kw, i) => {
                  const isVisible = visibleKeywords.has(kw.word)
                  const dirCfg = TREND_DIR_CONFIG[kw.direction]
                  const DirIcon = dirCfg.icon
                  return (
                    <button
                      key={kw.word}
                      onClick={() => toggleKeyword(kw.word)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
                        isVisible
                          ? 'border-[var(--vl-border)] bg-[var(--vl-bg-inner)]'
                          : 'border-transparent bg-transparent opacity-40'
                      }`}
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full transition-opacity duration-200"
                        style={{ backgroundColor: LINE_COLORS[i], opacity: isVisible ? 1 : 0.3 }}
                      />
                      {kw.word}
                      <DirIcon className={`size-3 ${dirCfg.color}`} />
                      <span className="text-[10px] vl-text-muted">({kw.totalFreq})</span>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Two-column: Word Cloud + Trend Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Word Cloud */}
            <Card className="vl-card backdrop-blur-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-violet-400" />
                  <CardTitle className="text-base font-semibold" style={{ color: 'var(--vl-text-white)' }}>
                    Word Cloud
                  </CardTitle>
                </div>
                <CardDescription className="text-xs vl-text-muted">
                  Size = frequency, Color = trend direction
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="min-h-[120px]">
                  <WordCloud keywords={keywords} />
                </div>
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[var(--vl-border-subtle)]">
                  {Object.entries(TREND_DIR_CONFIG).map(([dir, cfg]) => (
                    <div key={dir} className="flex items-center gap-1 text-[10px]">
                      <cfg.icon className={`size-3 ${cfg.color}`} />
                      <span className="vl-text-muted">{cfg.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Keywords Table */}
            <Card className="vl-card backdrop-blur-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Hash className="size-4 text-cyan-400" />
                  <CardTitle className="text-base font-semibold" style={{ color: 'var(--vl-text-white)' }}>
                    Top 10 Keywords
                  </CardTitle>
                </div>
                <CardDescription className="text-xs vl-text-muted">
                  Ranked by total frequency
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-1.5 max-h-[280px] overflow-y-auto custom-scrollbar">
                  {keywords.map((kw, index) => {
                    const dirCfg = TREND_DIR_CONFIG[kw.direction]
                    const DirIcon = dirCfg.icon
                    const maxFreq = Math.max(...keywords.map(k => k.totalFreq), 1)
                    const barWidth = (kw.totalFreq / maxFreq) * 100

                    return (
                      <motion.div
                        key={kw.word}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.04 }}
                        className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-[var(--vl-bg-inner)] transition-colors"
                      >
                        <span className="text-xs font-mono vl-text-muted w-5 text-right">{index + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-medium truncate" style={{ color: 'var(--vl-text-white)' }}>
                              {kw.word}
                            </span>
                            <span className="text-[10px] vl-text-muted ml-auto">{kw.totalFreq}</span>
                          </div>
                          <div className="w-full h-1 rounded-full bg-[var(--vl-bg-inner)] overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: LINE_COLORS[index % LINE_COLORS.length] }}
                              initial={{ width: 0 }}
                              animate={{ width: `${barWidth}%` }}
                              transition={{ duration: 0.5, delay: index * 0.04 }}
                            />
                          </div>
                        </div>
                        <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${dirCfg.color} ${dirCfg.bgColor}`}>
                          <DirIcon className="size-3" />
                          {kw.changePercent > 0 ? '+' : ''}{kw.changePercent}%
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
