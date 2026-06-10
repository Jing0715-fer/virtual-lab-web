'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  TrendingUp, BarChart3, Users, PieChart, MessageSquare,
  Download, Calendar, Award, AlertCircle, Clock, Activity,
  Zap, Globe, ThumbsUp, ThumbsDown, Minus,
} from 'lucide-react'

// ============================================================
// Types
// ============================================================

interface AnalyticsData {
  completionRate: number
  sentiment: { positive: number; neutral: number; negative: number }
  wordFrequencies: { word: string; count: number }[]
  agentScores: { name: string; avgRating: number; meetingCount: number }[]
  typeComparison: {
    team: { count: number; avgRating: number }
    individual: { count: number; avgRating: number }
  }
  reviewActivity: {
    date: string
    meetingTitle: string
    rating: number
    reviewer: string
  }[]
  heatmap: {
    category: string
    period: string
    avg: number
  }[]
}

// ============================================================
// Constants
// ============================================================

const CATEGORY_SHORT: Record<string, string> = {
  discussionQuality: 'Discussion',
  relevanceToGoal: 'Relevance',
  actionableOutcomes: 'Actionable',
  agentPerformance: 'Agent Perf',
  timeEfficiency: 'Time Eff',
}

const CLOUD_COLORS = [
  '#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
  '#0ea5e9', '#d946ef', '#22c55e', '#eab308',
]

// ============================================================
// Helpers
// ============================================================

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getAgentColor(name: string): string {
  const colors = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ec4899']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function getAgentInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

// ============================================================
// Progress Ring Component
// ============================================================

function ProgressRing({
  value,
  size = 120,
  strokeWidth = 10,
}: {
  value: number
  size?: number
  strokeWidth?: number
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference
  const color = value >= 80 ? '#10b981' : value >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <div className="review-progress-ring">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--vl-bg-tertiary, var(--color-muted))"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <span className="review-progress-ring-text">{value}%</span>
    </div>
  )
}

// ============================================================
// Rating Trends Area Chart (SVG)
// ============================================================

function RatingTrendsChart({
  reviews,
}: {
  reviews: {
    reviewedAt: string
    overallRating: number
  }[]
}) {
  const chartData = useMemo(() => {
    const now = Date.now()
    const days: Record<string, { total: number; count: number }> = {}

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * 86400000)
      const key = d.toISOString().split('T')[0]
      days[key] = { total: 0, count: 0 }
    }

    reviews.forEach(r => {
      const key = r.reviewedAt.split('T')[0]
      if (days[key]) {
        days[key].total += r.overallRating
        days[key].count++
      }
    })

    return Object.entries(days)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        avg: data.count > 0 ? Math.round((data.total / data.count) * 10) / 10 : null,
      }))
      .filter(d => d.avg !== null)
  }, [reviews])

  if (chartData.length < 2) {
    return <p className="text-[11px] vl-text-muted text-center py-6">Not enough data for trends</p>
  }

  const w = 600
  const h = 200
  const padX = 30
  const padY = 20
  const chartW = w - padX * 2
  const chartH = h - padY * 2
  const stepX = chartData.length > 1 ? chartW / (chartData.length - 1) : chartW

  const points = chartData.map((d, i) => {
    const x = padX + i * stepX
    const y = padY + chartH - ((d.avg! - 1) / 4) * chartH
    return { x, y, ...d }
  })

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const areaPath = `${linePath} L${points[points.length - 1].x},${padY + chartH} L${points[0].x},${padY + chartH} Z`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="rating-trend-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {[1, 2, 3, 4, 5].map(star => {
        const y = padY + chartH - ((star - 1) / 4) * chartH
        return (
          <g key={star}>
            <line x1={padX} y1={y} x2={w - padX} y2={y} stroke="var(--vl-border-subtle, rgba(255,255,255,0.04))" strokeWidth={1} />
            <text x={padX - 8} y={y + 4} textAnchor="end" fontSize="9" fill="var(--vl-text-muted)" fontWeight="500">
              {star}
            </text>
          </g>
        )
      })}

      {/* Area */}
      <path d={areaPath} fill="url(#rating-trend-gradient)" />

      {/* Line */}
      <path d={linePath} fill="none" stroke="#10b981" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="#10b981" stroke="var(--vl-bg-card)" strokeWidth={2}>
          <title>{p.date}: {p.avg}★</title>
        </circle>
      ))}

      {/* Date labels (sparse) */}
      {points.filter((_, i) => i % Math.max(1, Math.floor(points.length / 6)) === 0).map((p, i) => (
        <text key={i} x={p.x} y={h - 2} textAnchor="middle" fontSize="8" fill="var(--vl-text-muted)">
          {p.date.slice(5)}
        </text>
      ))}
    </svg>
  )
}

// ============================================================
// Category Heatmap
// ============================================================

function CategoryHeatmap({ heatmapData }: { heatmapData: AnalyticsData['heatmap'] }) {
  const categories = useMemo(() => {
    const cats = [...new Set(heatmapData.map(h => h.category))]
    return cats
  }, [heatmapData])

  const periods = useMemo(() => {
    return [...new Set(heatmapData.map(h => h.period))]
  }, [heatmapData])

  const getVal = (cat: string, period: string) => {
    const entry = heatmapData.find(h => h.category === cat && h.period === period)
    return entry?.avg || 0
  }

  return (
    <div
      className="review-heatmap"
      style={{ gridTemplateColumns: `auto repeat(${periods.length}, minmax(28px, 1fr))` }}
    >
      {/* Header row */}
      <div />
      {periods.map(p => (
        <div key={p} className="review-heatmap-header">{p}</div>
      ))}

      {/* Data rows */}
      {categories.map(cat => (
        <React.Fragment key={cat}>
          <div className="review-heatmap-row-label">{CATEGORY_SHORT[cat] || cat}</div>
          {periods.map(period => {
            const val = getVal(cat, period)
            const cls = val >= 4 ? 'review-heatmap-cell--4' : val >= 3 ? 'review-heatmap-cell--3' : val >= 2 ? 'review-heatmap-cell--2' : val > 0 ? 'review-heatmap-cell--1' : ''
            return (
              <div
                key={period}
                className={`review-heatmap-cell ${cls}`}
                title={`${CATEGORY_SHORT[cat] || cat} — ${period}: ${val}`}
              >
                {val > 0 ? val : '–'}
              </div>
            )
          })}
        </React.Fragment>
      ))}
    </div>
  )
}

// ============================================================
// Agent Performance Scores
// ============================================================

function AgentPerformanceList({ agents }: { agents: AnalyticsData['agentScores'] }) {
  if (agents.length === 0) {
    return <p className="text-[11px] vl-text-muted text-center py-6">No agent data</p>
  }

  return (
    <div>
      {agents.map((agent, idx) => (
        <div key={agent.name} className="review-agent-score">
          <span className={`review-agent-score-rank review-agent-score-rank--${Math.min(idx + 1, 3)}`}>
            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
          </span>
          <div
            className="review-agent-score-avatar"
            style={{ background: getAgentColor(agent.name) }}
          >
            {getAgentInitials(agent.name)}
          </div>
          <div className="review-agent-score-info">
            <div className="review-agent-score-name">{agent.name}</div>
            <div className="review-agent-score-meetings">{agent.meetingCount} meetings</div>
          </div>
          <div className="review-agent-score-bar">
            <div
              className="review-agent-score-bar-fill"
              style={{ width: `${(agent.avgRating / 5) * 100}%` }}
            />
          </div>
          <span className="review-agent-score-value">{agent.avgRating}</span>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// Sentiment Analysis Display
// ============================================================

function SentimentDisplay({ sentiment }: { sentiment: AnalyticsData['sentiment'] }) {
  const total = sentiment.positive + sentiment.neutral + sentiment.negative || 1

  return (
    <div className="space-y-3">
      {/* Bar */}
      <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden' }}>
        <div
          style={{
            width: `${(sentiment.positive / total) * 100}%`,
            background: '#10b981',
            transition: 'width 0.6s ease',
          }}
        />
        <div
          style={{
            width: `${(sentiment.neutral / total) * 100}%`,
            background: '#6b7280',
            transition: 'width 0.6s ease',
          }}
        />
        <div
          style={{
            width: `${(sentiment.negative / total) * 100}%`,
            background: '#ef4444',
            transition: 'width 0.6s ease',
          }}
        />
      </div>

      {/* Badges */}
      <div className="flex items-center justify-center gap-4">
        <div className="flex items-center gap-2">
          <span className="review-sentiment-badge review-sentiment-badge--positive">
            <ThumbsUp size={10} />
            Positive: {sentiment.positive}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="review-sentiment-badge review-sentiment-badge--neutral">
            <Minus size={10} />
            Neutral: {sentiment.neutral}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="review-sentiment-badge review-sentiment-badge--negative">
            <ThumbsDown size={10} />
            Negative: {sentiment.negative}%
          </span>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Word Cloud
// ============================================================

function ReviewWordCloud({ words }: { words: { word: string; count: number }[] }) {
  if (words.length === 0) {
    return <p className="text-[11px] vl-text-muted text-center py-6">No word data</p>
  }

  const maxCount = words[0]?.count || 1
  const minCount = words[words.length - 1]?.count || 1
  const range = maxCount - minCount || 1

  return (
    <div className="review-word-cloud">
      {words.map((item, idx) => {
        const normalized = (item.count - minCount) / range
        const fontSize = 0.7 + normalized * 1.5
        const opacity = 0.5 + normalized * 0.5
        const color = CLOUD_COLORS[idx % CLOUD_COLORS.length]
        const rotation = seededRandom(idx * 7 + 1) > 0.75
          ? (seededRandom(idx * 3 + 2) > 0.5 ? -8 : 8)
          : 0

        return (
          <span
            key={item.word}
            className="review-word-cloud-word"
            style={{
              fontSize: `${fontSize}rem`,
              opacity,
              color,
              transform: `rotate(${rotation}deg)`,
              fontWeight: normalized > 0.6 ? 700 : normalized > 0.3 ? 500 : 400,
            }}
            title={`${item.word}: ${item.count} occurrences`}
          >
            {item.word}
          </span>
        )
      })}
    </div>
  )
}

// ============================================================
// Comparison Table
// ============================================================

function TypeComparisonTable({
  comparison,
}: {
  comparison: AnalyticsData['typeComparison']
}) {
  const cats = [
    { label: 'Review Count', team: comparison.team.count, individual: comparison.individual.count },
    { label: 'Average Rating', team: comparison.team.avgRating, individual: comparison.individual.avgRating },
    { label: 'Higher Rated', team: comparison.team.avgRating >= comparison.individual.avgRating ? '✓' : '', individual: comparison.individual.avgRating >= comparison.team.avgRating ? '✓' : '' },
  ]

  return (
    <table className="review-comparison-table">
      <thead>
        <tr>
          <th>Metric</th>
          <th style={{ textAlign: 'center' }}>
            <span className="flex items-center justify-center gap-1">
              <Users size={10} /> Team
            </span>
          </th>
          <th style={{ textAlign: 'center' }}>
            <span className="flex items-center justify-center gap-1">
              <Activity size={10} /> Individual
            </span>
          </th>
        </tr>
      </thead>
      <tbody>
        {cats.map(row => (
          <tr key={row.label}>
            <td style={{ fontWeight: 500 }}>{row.label}</td>
            <td style={{ textAlign: 'center' }}>{row.team}</td>
            <td style={{ textAlign: 'center' }}>{row.individual}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ============================================================
// Review Activity Timeline
// ============================================================

function ReviewTimeline({ activity }: { activity: AnalyticsData['reviewActivity'] }) {
  if (activity.length === 0) {
    return <p className="text-[11px] vl-text-muted text-center py-6">No activity yet</p>
  }

  return (
    <div className="review-timeline" style={{ maxHeight: 300, overflowY: 'auto' }}>
      {activity.map((item, idx) => (
        <div key={idx} className="review-timeline-item" style={{ animationDelay: `${idx * 0.05}s` }}>
          <div className="review-timeline-item-date">{formatDate(item.date)}</div>
          <div className="review-timeline-item-text">{item.meetingTitle}</div>
          <div className="review-timeline-item-rating">
            <svg viewBox="0 0 24 24" fill="#f59e0b" width={12} height={12}>
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            {item.rating}★ — by {item.reviewer}
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// Export Functions
// ============================================================

function exportAsJSON(data: AnalyticsData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  downloadBlob(blob, 'review-analytics.json')
}

function exportAsCSV(data: AnalyticsData) {
  let csv = 'Category,Period,Average Rating\n'
  data.heatmap.forEach(h => {
    csv += `"${h.category}","${h.period}",${h.avg}\n`
  })
  csv += '\nAgent,Rating,Meetings\n'
  data.agentScores.forEach(a => {
    csv += `"${a.name}",${a.avgRating},${a.meetingCount}\n`
  })
  const blob = new Blob([csv], { type: 'text/csv' })
  downloadBlob(blob, 'review-analytics.csv')
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ============================================================
// Main Component
// ============================================================

export function ReviewAnalyticsPanel({
  reviews,
}: {
  reviews: {
    id: string
    reviewedAt: string
    overallRating: number
    meetingTitle: string
    reviewerName: string
    participants: string[]
  }[]
}) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch('/api/reviews?mode=analytics')
        if (res.ok) {
          const data = await res.json()
          setAnalytics(data)
        }
      } catch { /* silent */ }
      setLoading(false)
    }
    fetchAnalytics()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16" style={{ color: 'var(--vl-text-muted)' }}>
        <div className="text-sm">Loading analytics...</div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-10" style={{ color: 'var(--vl-text-muted)' }}>
        <AlertCircle size={32} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm">Unable to load analytics</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Export Buttons */}
      <div className="flex items-center justify-end gap-2">
        <button
          className="review-export-btn"
          onClick={() => exportAsJSON(analytics)}
        >
          <Download size={12} /> JSON
        </button>
        <button
          className="review-export-btn"
          onClick={() => exportAsCSV(analytics)}
        >
          <Download size={12} /> CSV
        </button>
      </div>

      {/* Top Row: Completion Rate + Sentiment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="review-form-section" style={{ textAlign: 'center' }}>
          <div className="review-form-section-title" style={{ justifyContent: 'center' }}>
            <PieChart size={16} /> Review Completion Rate
          </div>
          <div className="flex flex-col items-center">
            <ProgressRing value={analytics.completionRate} size={130} strokeWidth={12} />
            <div className="review-progress-ring-label mt-1">
              {analytics.completionRate}% of meetings reviewed
            </div>
          </div>
        </div>

        <div className="review-form-section">
          <div className="review-form-section-title">
            <Zap size={16} /> Sentiment Analysis
          </div>
          <div className="flex flex-col items-center justify-center" style={{ minHeight: 100 }}>
            <SentimentDisplay sentiment={analytics.sentiment} />
          </div>
        </div>
      </div>

      {/* Rating Trends */}
      <div className="review-form-section">
        <div className="review-form-section-title">
          <TrendingUp size={16} /> Rating Trends (Last 30 Days)
        </div>
        <RatingTrendsChart reviews={reviews} />
      </div>

      {/* Category Heatmap + Word Cloud */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="review-form-section">
          <div className="review-form-section-title">
            <Globe size={16} /> Category Heatmap
          </div>
          {analytics.heatmap.length > 0 ? (
            <CategoryHeatmap heatmapData={analytics.heatmap} />
          ) : (
            <p className="text-[11px] vl-text-muted text-center py-4">No heatmap data</p>
          )}
        </div>

        <div className="review-form-section">
          <div className="review-form-section-title">
            <MessageSquare size={16} /> Word Cloud
          </div>
          <ReviewWordCloud words={analytics.wordFrequencies} />
        </div>
      </div>

      {/* Agent Performance */}
      <div className="review-form-section">
        <div className="review-form-section-title">
          <Users size={16} /> Agent Performance Scores
        </div>
        <AgentPerformanceList agents={analytics.agentScores} />
      </div>

      {/* Type Comparison + Activity Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="review-form-section">
          <div className="review-form-section-title">
            <BarChart3 size={16} /> Type Comparison
          </div>
          <TypeComparisonTable comparison={analytics.typeComparison} />
        </div>

        <div className="review-form-section">
          <div className="review-form-section-title">
            <Clock size={16} /> Review Activity
          </div>
          <ReviewTimeline activity={analytics.reviewActivity} />
        </div>
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="review-summary-card" style={{ animationDelay: '0s' }}>
          <div className="flex items-center justify-center mb-1">
            <ThumbsUp size={18} style={{ color: '#10b981' }} />
          </div>
          <div className="review-summary-value">{analytics.sentiment.positive}%</div>
          <div className="review-summary-label">Positive</div>
        </div>
        <div className="review-summary-card" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-center mb-1">
            <Award size={18} style={{ color: '#f59e0b' }} />
          </div>
          <div className="review-summary-value">
            {analytics.agentScores.length > 0 ? analytics.agentScores[0].avgRating : 0}
          </div>
          <div className="review-summary-label">Top Agent Score</div>
        </div>
        <div className="review-summary-card" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-center mb-1">
            <MessageSquare size={18} style={{ color: '#06b6d4' }} />
          </div>
          <div className="review-summary-value">{analytics.wordFrequencies.length}</div>
          <div className="review-summary-label">Unique Keywords</div>
        </div>
      </div>
    </div>
  )
}
