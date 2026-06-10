'use client'

import React, { useState, useMemo, useCallback } from 'react'
import {
  Brain, Sparkles, TrendingUp, TrendingDown, Minus,
  Gauge, Users, Network, Target, CheckCircle, Zap,
  ChevronDown, ChevronUp, Clock, BarChart3, Activity,
  ThumbsUp, ThumbsDown, Meh, ArrowUpRight, ArrowDownRight,
  Lightbulb, AlertTriangle, CheckCircle2, XCircle,
  Search, RefreshCw, Download, Eye, MessageSquare,
  GitBranch, Calendar, Star, Hash, Award,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────

interface InsightCard {
  id: string; title: string; icon: string
  primaryMetric: number; primaryUnit: string
  secondaryMetric: string; trend: 'up' | 'down' | 'flat'
  color: string; details: string
  agents?: { name: string; pct: number; color: string }[]
  clusters?: { name: string; size: number; x: number; y: number; color: string }[]
}

interface TrendPoint { month: string; value: number }
interface TrendSeries { name: string; color: string; data: number[] }

interface Recommendation {
  id: string; priority: 'high' | 'medium' | 'low'
  title: string; description: string
  expectedImpact: string; effort: 'easy' | 'medium' | 'hard'
  category: string
}

interface WordSentiment { word: string; score: number }

interface ClusterNode { name: string; size: number; x: number; y: number; color: string }

interface InteractionMatrix { agents: string[]; matrix: number[][] }

interface TimePattern { days: string[]; hours: string[]; effectiveness: number[][] }

interface InsightHistory { id: string; title: string; timestamp: string; summary: string }

interface SentimentData {
  overall: { positive: number; neutral: number; negative: number }
  trendOverTime: number[]
  wordSentiment: WordSentiment[]
  positivePhrases: string[]
  negativePhrases: string[]
}

interface PatternData {
  recurringTopics: { topic: string; count: number; weight: number }[]
  agentInteractions: InteractionMatrix
  timePatterns: TimePattern
  decisions: { unanimous: number; voted: number; deferred: number; total: number }
}

// ─── Sample Data (fallback if API fails) ─────────────────────

const ICON_MAP: Record<string, React.ReactNode> = {
  Gauge: <Gauge size={18} />, Users: <Users size={18} />,
  Network: <Network size={18} />, Target: <Target size={18} />,
  CheckCircle: <CheckCircle size={18} />, TrendingUp: <Zap size={18} />,
}

const TREND_DATA: TrendSeries[] = [
  { name: 'Meeting Frequency', color: '#10b981', data: [18, 22, 25, 20, 28, 32, 16, 30, 24, 32, 18, 27] },
  { name: 'Discussion Depth', color: '#06b6d4', data: [65, 70, 72, 68, 78, 82, 60, 85, 80, 88, 75, 84] },
  { name: 'Decision Rate', color: '#8b5cf6', data: [45, 52, 58, 55, 62, 68, 50, 72, 70, 75, 65, 78] },
  { name: 'Innovation Score', color: '#f59e0b', data: [30, 35, 42, 38, 48, 52, 28, 55, 60, 65, 50, 68] },
]
const MONTHS = ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan']

const RECOMMENDATIONS: Recommendation[] = [
  { id: 'r1', priority: 'high', title: 'Restructure Weekly Standup Format', description: 'Current 60-minute standups show declining engagement after 25 minutes. Switch to async update + focused discussion.', expectedImpact: '35% time savings, 20% higher engagement', effort: 'easy', category: 'Scheduling' },
  { id: 'r2', priority: 'high', title: 'Add Computational Chemist to Drug Discovery', description: 'Drug discovery discussions lack molecular dynamics expertise. Adding a specialist agent could reduce decision cycles by 40%.', expectedImpact: '40% faster decision cycles', effort: 'medium', category: 'Agent Selection' },
  { id: 'r3', priority: 'medium', title: 'Implement Structured Debate Protocol', description: 'Meetings with dissenting opinions produce 60% more innovative outcomes. Introduce a Devil\'s Advocate rotation.', expectedImpact: '60% increase in novel directions', effort: 'easy', category: 'Discussion Format' },
  { id: 'r4', priority: 'high', title: 'Automated Follow-up Action Tracking', description: '24% of action items are forgotten. Implement automated reminders with escalation at 3-day and 7-day intervals.', expectedImpact: '90% action item awareness', effort: 'medium', category: 'Follow-up' },
  { id: 'r5', priority: 'medium', title: 'Schedule Cross-Project Knowledge Sync', description: 'Three themes span multiple projects. Monthly cross-project syncs could eliminate redundant discussions.', expectedImpact: '25% reduction in repeated discussions', effort: 'easy', category: 'Scheduling' },
  { id: 'r6', priority: 'low', title: 'Explore Cryo-EM Integration Pipeline', description: 'Growing interest in experimental validation through Cryo-EM. Allocate research time for integration.', expectedImpact: '2-3 high-impact publications', effort: 'hard', category: 'Research Direction' },
  { id: 'r7', priority: 'medium', title: 'Optimize Meeting Timing', description: 'Meetings 10:00-11:30 AM produce 30% more concrete decisions. Consider shifting weekly review.', expectedImpact: '30% increase in decision quality', effort: 'easy', category: 'Scheduling' },
  { id: 'r8', priority: 'low', title: 'Create Molecular Dynamics Agent', description: 'Frequent references to simulation parameters suggest adding an MD simulation specialist agent.', expectedImpact: 'Better-informed computational decisions', effort: 'hard', category: 'Agent Selection' },
]

const WORD_SENTIMENT: WordSentiment[] = [
  { word: 'promising', score: 0.92 }, { word: 'breakthrough', score: 0.95 },
  { word: 'efficient', score: 0.85 }, { word: 'validated', score: 0.88 },
  { word: 'excellent', score: 0.94 }, { word: 'optimized', score: 0.80 },
  { word: 'innovative', score: 0.82 }, { word: 'robust', score: 0.78 },
  { word: 'successful', score: 0.90 }, { word: 'interesting', score: 0.65 },
  { word: 'neutral', score: 0.50 }, { word: 'review', score: 0.52 },
  { word: 'update', score: 0.48 }, { word: 'baseline', score: 0.45 },
  { word: 'preliminary', score: 0.42 }, { word: 'iteration', score: 0.40 },
  { word: 'concern', score: 0.30 }, { word: 'delay', score: -0.35 },
  { word: 'issue', score: -0.40 }, { word: 'bottleneck', score: -0.55 },
  { word: 'unclear', score: -0.50 }, { word: 'overdue', score: -0.65 },
  { word: 'risk', score: -0.45 }, { word: 'problematic', score: -0.70 },
]

const CLUSTERS: ClusterNode[] = [
  { name: 'Protein Folding', size: 42, x: 25, y: 30, color: '#10b981' },
  { name: 'Drug Screening', size: 35, x: 60, y: 20, color: '#06b6d4' },
  { name: 'Gene Editing', size: 28, x: 15, y: 65, color: '#8b5cf6' },
  { name: 'Biomarkers', size: 24, x: 75, y: 55, color: '#f59e0b' },
  { name: 'ML Models', size: 38, x: 45, y: 50, color: '#ef4444' },
  { name: 'Data Pipeline', size: 20, x: 85, y: 30, color: '#ec4899' },
  { name: 'Clinical Trial', size: 18, x: 50, y: 80, color: '#14b8a6' },
  { name: 'Validation', size: 22, x: 30, y: 75, color: '#a855f7' },
]

const INTERACTIONS: InteractionMatrix = {
  agents: ['Chen', 'Zhang', 'Wang', 'Davis', 'Ross', 'Nakamura'],
  matrix: [
    [0, 12, 8, 6, 10, 4], [12, 0, 5, 9, 7, 3],
    [8, 5, 0, 4, 11, 6], [6, 9, 4, 0, 8, 7],
    [10, 7, 11, 8, 0, 5], [4, 3, 6, 7, 5, 0],
  ],
}

const TIME_PATTERNS: TimePattern = {
  days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  hours: ['9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM', '4PM', '5PM'],
  effectiveness: [
    [0.6, 0.85, 0.9, 0.5, 0.4, 0.7, 0.75, 0.6, 0.3],
    [0.7, 0.9, 0.95, 0.55, 0.45, 0.8, 0.7, 0.65, 0.35],
    [0.65, 0.88, 0.92, 0.6, 0.5, 0.75, 0.8, 0.7, 0.4],
    [0.55, 0.82, 0.88, 0.5, 0.45, 0.72, 0.78, 0.6, 0.3],
    [0.5, 0.78, 0.85, 0.45, 0.4, 0.65, 0.7, 0.55, 0.25],
  ],
}

const DECISIONS = { unanimous: 18, voted: 8, deferred: 5, total: 31 }

const HISTORY: InsightHistory[] = [
  { id: 'h1', title: 'Q4 2024 Research Review Analysis', timestamp: '2025-01-15T14:30:00Z', summary: 'Cross-project collaboration increased by 28%.' },
  { id: 'h2', title: 'December Efficiency Report', timestamp: '2024-12-31T10:00:00Z', summary: 'Temporary dip in efficiency (78%) due to holiday scheduling.' },
  { id: 'h3', title: 'CRISPR Project Deep Dive', timestamp: '2024-12-15T16:45:00Z', summary: 'Identified 3 key bottlenecks in guide RNA design workflow.' },
  { id: 'h4', title: 'Agent Performance Quarterly', timestamp: '2024-12-01T09:15:00Z', summary: 'Dr. Chen and Dr. Zhang identified as collaboration anchors.' },
  { id: 'h5', title: 'Innovation Index Assessment', timestamp: '2024-11-15T11:00:00Z', summary: 'Innovation score trending upward (+22% YoY).' },
]

// ─── Helper: Trend Arrow ─────────────────────────────────────

function TrendArrow({ trend }: { trend: string }) {
  if (trend === 'up') return <ArrowUpRight size={14} className="ai-trend-up" />
  if (trend === 'down') return <ArrowDownRight size={14} className="ai-trend-down" />
  return <Minus size={14} className="ai-trend-flat" />
}

// ─── Helper: Sentiment Color ─────────────────────────────────

function sentimentColor(score: number): string {
  if (score >= 0.6) return '#10b981'
  if (score >= 0.3) return '#f59e0b'
  if (score >= 0) return '#64748b'
  return '#ef4444'
}

function sentimentBg(score: number): string {
  if (score >= 0.6) return 'rgba(16, 185, 129, 0.12)'
  if (score >= 0.3) return 'rgba(245, 158, 11, 0.10)'
  if (score >= 0) return 'rgba(100, 116, 139, 0.10)'
  return 'rgba(239, 68, 68, 0.12)'
}

// ─── Helper: Heatmap color ───────────────────────────────────

function heatmapColor(value: number): string {
  if (value >= 0.9) return '#10b981'
  if (value >= 0.8) return '#34d399'
  if (value >= 0.7) return '#6ee7b7'
  if (value >= 0.6) return '#fbbf24'
  if (value >= 0.5) return '#f59e0b'
  if (value >= 0.4) return '#fb923c'
  return '#ef4444'
}

// ─── Gauge Component ─────────────────────────────────────────

function GaugeChart({ value, color }: { value: number; color: string }) {
  const radius = 55
  const circumference = Math.PI * radius
  const filled = (value / 100) * circumference
  const strokeDasharray = `${circumference} ${circumference}`
  const strokeDashoffset = circumference - filled

  return (
    <div className="ai-gauge-container">
      <svg width="140" height="70" viewBox="0 0 140 70">
        <path
          d="M 10 65 A 55 55 0 0 1 130 65"
          fill="none" stroke="rgba(51,65,85,0.2)" strokeWidth="10" strokeLinecap="round"
        />
        <path
          d="M 10 65 A 55 55 0 0 1 130 65"
          fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset}
          style={{ filter: `drop-shadow(0 0 6px ${color}66)` }}
        />
      </svg>
      <span className="ai-gauge-label" style={{ color }}>{value}</span>
    </div>
  )
}

// ─── Progress Ring Component ─────────────────────────────────

function ProgressRing({ value, color, size = 80 }: { value: number; color: string; size?: number }) {
  const strokeWidth = 7
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const filled = (value / 100) * circumference

  return (
    <div className="ai-ring-container">
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} className="ai-ring-bg" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          className="ai-ring-fill"
          stroke={color}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference - filled}
          style={{
            animationDelay: '0.3s',
            filter: `drop-shadow(0 0 4px ${color}66)`,
          }}
        />
      </svg>
      <span style={{
        position: 'absolute', fontSize: 16, fontWeight: 700, color,
      }}>{value}%</span>
    </div>
  )
}

// ─── Radar SVG (simple pentagon) ──────────────────────────────

function RadarScore({ value, color }: { value: number; color: string }) {
  const cx = 50, cy = 50, maxR = 40
  const levels = 5
  const angleStep = (2 * Math.PI) / levels
  const offset = -Math.PI / 2

  const polygonPoints = Array.from({ length: levels }, (_, i) => {
    const angle = offset + i * angleStep
    return `${cx + maxR * Math.cos(angle)},${cy + maxR * Math.sin(angle)}`
  }).join(' ')

  const filledR = (value / 100) * maxR
  const filledPoints = Array.from({ length: levels }, (_, i) => {
    const angle = offset + i * angleStep
    return `${cx + filledR * Math.cos(angle)},${cy + filledR * Math.sin(angle)}`
  }).join(' ')

  return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      {[1, 0.75, 0.5, 0.25].map(scale => {
        const r = maxR * scale
        const pts = Array.from({ length: levels }, (_, i) => {
          const a = offset + i * angleStep
          return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`
        }).join(' ')
        return <polygon key={scale} points={pts} fill="none" stroke="rgba(100,116,139,0.15)" strokeWidth="0.5" />
      })}
      <polygon points={polygonPoints} fill="none" stroke="rgba(100,116,139,0.25)" strokeWidth="1" />
      <polygon points={filledPoints} fill={`${color}20`} stroke={color} strokeWidth="1.5" />
      {Array.from({ length: levels }, (_, i) => {
        const a = offset + i * angleStep
        return <circle key={i} cx={cx + filledR * Math.cos(a)} cy={cy + filledR * Math.sin(a)} r={2.5} fill={color} />
      })}
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="14" fontWeight="700" fill={color}>{value}</text>
    </svg>
  )
}

// ─── Sparkline ───────────────────────────────────────────────

function Sparkline({ data, color, width = 80, height = 28 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (!data || data.length < 2) return null
  const maxV = Math.max(...data)
  const minV = Math.min(...data)
  const range = maxV - minV || 1
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - minV) / range) * (height - 4) - 2}`).join(' ')

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
      <defs>
        <linearGradient id={`sp-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${pts} ${width},${height}`} fill={`url(#sp-${color.replace('#', '')})`} />
      <polyline points={pts} stroke={color} strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={width} cy={height - ((data[data.length - 1] - minV) / range) * (height - 4) - 2} r={2.5} fill={color} />
    </svg>
  )
}

// ─── Main Component ──────────────────────────────────────────

export default function AIInsightsPage() {
  const [generating, setGenerating] = useState(false)
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null)
  const [visibleSeries, setVisibleSeries] = useState<Record<string, boolean>>({
    'Meeting Frequency': true, 'Discussion Depth': true,
    'Decision Rate': true, 'Innovation Score': true,
  })
  const [hoveredTrend, setHoveredTrend] = useState<number | null>(null)
  const [acceptedRecs, setAcceptedRecs] = useState<Set<string>>(new Set())
  const [dismissedRecs, setDismissedRecs] = useState<Set<string>>(new Set())
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null)
  const [hoveredCell, setHoveredCell] = useState<{ day: number; hour: number } | null>(null)

  const handleGenerate = useCallback(() => {
    setGenerating(true)
    setTimeout(() => setGenerating(false), 2500)
  }, [])

  const toggleSeries = useCallback((name: string) => {
    setVisibleSeries(prev => ({ ...prev, [name]: !prev[name] }))
  }, [])

  const acceptRec = useCallback((id: string) => {
    setAcceptedRecs(prev => new Set(prev).add(id))
    setDismissedRecs(prev => { const n = new Set(prev); n.delete(id); return n })
  }, [])

  const dismissRec = useCallback((id: string) => {
    setDismissedRecs(prev => new Set(prev).add(id))
    setAcceptedRecs(prev => { const n = new Set(prev); n.delete(id); return n })
  }, [])

  // ── Trend chart calculation ──
  const trendChart = useMemo(() => {
    const w = 700, h = 280
    const pad = { top: 20, right: 20, bottom: 30, left: 45 }
    const iw = w - pad.left - pad.right
    const ih = h - pad.top - pad.bottom
    const allVals = TREND_DATA.flatMap(s => s.data)
    const maxV = Math.max(...allVals)
    const minV = Math.min(...allVals)
    const range = maxV - minV || 1
    return { w, h, pad, iw, ih, maxV, minV, range }
  }, [])

  // ── Insight cards data ──
  const insightCards: InsightCard[] = [
    {
      id: 'efficiency', title: 'Meeting Efficiency Score', icon: 'Gauge',
      primaryMetric: 87, primaryUnit: '/100', secondaryMetric: '+12% vs last quarter',
      trend: 'up', color: '#10b981',
      details: 'Average meeting achieves 87% of stated objectives within scheduled time. Key driver: improved pre-meeting agenda preparation.',
    },
    {
      id: 'utilization', title: 'Agent Utilization', icon: 'Users',
      primaryMetric: 94, primaryUnit: '%', secondaryMetric: 'Top: Dr. Chen (98%)',
      trend: 'up', color: '#06b6d4',
      details: 'Near-optimal participation. Dr. Chen leads at 98%. Consider increasing Dr. Nakamura\'s involvement (72%).',
      agents: [
        { name: 'Chen', pct: 98, color: '#10b981' },
        { name: 'Zhang', pct: 95, color: '#06b6d4' },
        { name: 'Wang', pct: 92, color: '#8b5cf6' },
        { name: 'Davis', pct: 88, color: '#f59e0b' },
        { name: 'Ross', pct: 85, color: '#ef4444' },
        { name: 'Nakamura', pct: 72, color: '#ec4899' },
      ],
    },
    {
      id: 'clustering', title: 'Topic Clustering', icon: 'Network',
      primaryMetric: 8, primaryUnit: ' clusters', secondaryMetric: '3 cross-project themes',
      trend: 'flat', color: '#8b5cf6',
      details: '8 major topic groups. Three themes span projects: computational efficiency, data quality, experimental validation.',
      clusters: CLUSTERS,
    },
    {
      id: 'decision', title: 'Decision Quality Index', icon: 'Target',
      primaryMetric: 82, primaryUnit: '/100', secondaryMetric: '18 unanimous, 4 voted',
      trend: 'up', color: '#f59e0b',
      details: '82% of decisions implemented within 2 weeks. Unanimous decisions show 95% follow-through.',
    },
    {
      id: 'action-items', title: 'Action Item Completion', icon: 'CheckCircle',
      primaryMetric: 76, primaryUnit: '%', secondaryMetric: '42 of 55 completed',
      trend: 'up', color: '#14b8a6',
      details: '76% completion rate, up from 68%. 13 open items: 5 blocked, 4 in progress, 3 overdue.',
    },
    {
      id: 'velocity', title: 'Research Velocity', icon: 'TrendingUp',
      primaryMetric: 3.2, primaryUnit: 'x', secondaryMetric: 'Acceleration: +0.4x',
      trend: 'up', color: '#ec4899',
      details: 'Output velocity at 3.2x baseline. Q2 targets achievable 3 weeks ahead of schedule.',
    },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--vl-bg-primary)',
      color: 'var(--vl-text-primary)',
    }}>
      {/* ── Header ── */}
      <header style={{
        padding: '32px 24px 24px',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.06) 0%, rgba(139, 92, 246, 0.04) 50%, rgba(6, 182, 212, 0.05) 100%)',
        borderBottom: '1px solid var(--vl-border)',
      }}>
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: 'linear-gradient(135deg, #10b981, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)',
              }}>
                <Brain size={24} color="#fff" />
              </div>
              <div>
                <h1 style={{
                  fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.5px',
                  background: 'linear-gradient(135deg, var(--vl-text-primary), #10b981)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                  AI Insight Engine
                </h1>
                <p style={{ fontSize: 13, color: 'var(--vl-text-muted)', margin: '2px 0 0' }}>
                  Comprehensive AI-powered meeting analysis, pattern detection, and recommendations
                </p>
              </div>
            </div>
            <button
              className={`ai-generate-btn ${generating ? 'ai-generating' : ''}`}
              onClick={handleGenerate}
            >
              <Sparkles size={16} />
              {generating ? 'Generating...' : 'Generate Insights'}
            </button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '24px' }}>

        {/* ── Key Insights Panel ── */}
        <section style={{ marginBottom: 32 }}>
          <div className="ai-section-header">
            <div>
              <h2 className="ai-section-title">Key Insights</h2>
              <p className="ai-section-subtitle">AI-generated analysis across 6 critical dimensions</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--vl-text-muted)' }}>
              <Clock size={12} /> Updated 2 hours ago
            </div>
          </div>

          <div className="ai-insight-grid-6" style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16,
          }}>
            {insightCards.map(card => {
              const isExpanded = expandedInsight === card.id
              const iconNode = ICON_MAP[card.icon] || <Sparkles size={18} />

              return (
                <div key={card.id} className="ai-card ai-insight-card">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 8,
                        background: `${card.color}15`, color: card.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {iconNode}
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--vl-text-primary)' }}>{card.title}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <TrendArrow trend={card.trend} />
                          <span style={{ fontSize: 11, color: 'var(--vl-text-muted)' }}>{card.secondaryMetric}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Visuals */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    {card.id === 'efficiency' && <RadarScore value={card.primaryMetric} color={card.color} />}
                    {card.id === 'utilization' && card.agents && (
                      <div style={{ width: '100%' }}>
                        <div className="ai-bar-container" style={{ height: 80 }}>
                          {card.agents.map((a, i) => (
                            <div key={a.name} className="ai-bar" style={{
                              height: `${a.pct}%`,
                              background: `linear-gradient(180deg, ${a.color}, ${a.color}88)`,
                              animationDelay: `${i * 0.1}s`,
                            }} title={`${a.name}: ${a.pct}%`} />
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'space-between', marginTop: 2 }}>
                          {card.agents.map(a => (
                            <span key={a.name} className="ai-bar-label">{a.name}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {card.id === 'clustering' && (
                      <div style={{ position: 'relative', width: '100%', height: 100 }}>
                        <svg width="100%" height="100%" viewBox="0 0 100 100">
                          {/* Cluster lines */}
                          <line x1="25" y1="30" x2="60" y2="20" className="ai-cluster-line" />
                          <line x1="25" y1="30" x2="45" y2="50" className="ai-cluster-line" />
                          <line x1="60" y1="20" x2="45" y2="50" className="ai-cluster-line" />
                          <line x1="45" y1="50" x2="75" y2="55" className="ai-cluster-line" />
                          <line x1="45" y1="50" x2="30" y2="75" className="ai-cluster-line" />
                          <line x1="45" y1="50" x2="50" y2="80" className="ai-cluster-line" />
                          {CLUSTERS.map((c, i) => (
                            <g key={c.name}>
                              <circle cx={c.x} cy={c.y} r={c.size * 0.5} fill={`${c.color}15`} stroke={`${c.color}40`} strokeWidth="0.5" />
                              <circle cx={c.x} cy={c.y} r={Math.max(c.size * 0.2, 5)} fill={`${c.color}cc`} />
                              <text x={c.x} y={c.y + 1} textAnchor="middle" fontSize="3" fill="#fff" fontWeight="600" style={{ pointerEvents: 'none' }}>{c.name.split(' ')[0]}</text>
                            </g>
                          ))}
                        </svg>
                      </div>
                    )}
                    {card.id === 'decision' && <GaugeChart value={card.primaryMetric} color={card.color} />}
                    {card.id === 'action-items' && <ProgressRing value={card.primaryMetric} color={card.color} />}
                    {card.id === 'velocity' && (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 36, fontWeight: 800, color: card.color, letterSpacing: '-1px' }}>
                          {card.primaryMetric}<span style={{ fontSize: 16, fontWeight: 500 }}>{card.primaryUnit}</span>
                        </div>
                        <Sparkline data={[1.8, 2.0, 2.1, 2.4, 2.6, 2.7, 2.5, 2.9, 3.0, 3.1, 2.8, 3.2]} color={card.color} width={160} height={32} />
                      </div>
                    )}
                  </div>

                  {/* Primary metric */}
                  {!['velocity', 'action-items', 'decision', 'efficiency'].includes(card.id) && (
                    <div style={{ textAlign: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 28, fontWeight: 700, color: card.color }}>
                        {card.primaryMetric}<span style={{ fontSize: 14, fontWeight: 400, color: 'var(--vl-text-muted)' }}>{card.primaryUnit}</span>
                      </span>
                    </div>
                  )}

                  {/* Expand button */}
                  <button
                    onClick={() => setExpandedInsight(isExpanded ? null : card.id)}
                    style={{
                      width: '100%', padding: '6px 0', borderRadius: 6, border: 'none',
                      background: 'var(--vl-bg-secondary)', color: 'var(--vl-text-muted)',
                      fontSize: 12, fontWeight: 500, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Eye size={12} />
                    {isExpanded ? 'Hide Details' : 'View Details'}
                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  <div className={`ai-details-panel ${isExpanded ? 'ai-details-open' : ''}`}>
                    <p style={{ fontSize: 12, color: 'var(--vl-text-secondary)', lineHeight: 1.6, margin: 0 }}>
                      {card.details}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Trend Analysis ── */}
        <section style={{ marginBottom: 32 }}>
          <div className="ai-section-header">
            <div>
              <h2 className="ai-section-title">Trend Analysis</h2>
              <p className="ai-section-subtitle">12-month trends across key meeting metrics</p>
            </div>
          </div>
          <div className="ai-chart-container">
            {/* Legend */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
              {TREND_DATA.map(s => (
                <div
                  key={s.name}
                  className={`ai-trend-legend-item ${!visibleSeries[s.name] ? 'ai-legend-inactive' : ''}`}
                  onClick={() => toggleSeries(s.name)}
                >
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color, opacity: visibleSeries[s.name] ? 1 : 0.3 }} />
                  {s.name}
                </div>
              ))}
            </div>
            {/* SVG Chart */}
            <div style={{ position: 'relative' }}>
              <svg viewBox={`0 0 ${trendChart.w} ${trendChart.h}`} style={{ width: '100%', height: 'auto' }}>
                <defs>
                  {TREND_DATA.map(s => (
                    <linearGradient key={s.name} id={`trend-fill-${s.name.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={s.color} stopOpacity={0.15} />
                      <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                {/* Grid */}
                {Array.from({ length: 5 }, (_, i) => {
                  const val = trendChart.minV + (trendChart.range / 4) * i
                  const y = trendChart.pad.top + trendChart.ih - ((val - trendChart.minV) / trendChart.range) * trendChart.ih
                  return (
                    <g key={`grid-${i}`}>
                      <line x1={trendChart.pad.left} y1={y} x2={trendChart.w - trendChart.pad.right} y2={y}
                        stroke="var(--vl-chart-grid)" strokeWidth="0.5" strokeDasharray="4,4" />
                      <text x={trendChart.pad.left - 6} y={y + 4} textAnchor="end"
                        fill="var(--vl-chart-axis)" fontSize="10">{Math.round(val)}</text>
                    </g>
                  )
                })}
                {/* X labels */}
                {MONTHS.map((m, i) => {
                  const x = trendChart.pad.left + (i / (MONTHS.length - 1)) * trendChart.iw
                  return <text key={m} x={x} y={trendChart.h - 6} textAnchor="middle" fill="var(--vl-chart-axis)" fontSize="10">{m}</text>
                })}
                {/* Hover line */}
                {hoveredTrend !== null && (
                  <line x1={trendChart.pad.left + (hoveredTrend / (MONTHS.length - 1)) * trendChart.iw}
                    y1={trendChart.pad.top} x2={trendChart.pad.left + (hoveredTrend / (MONTHS.length - 1)) * trendChart.iw}
                    y2={trendChart.pad.top + trendChart.ih}
                    stroke="var(--vl-accent)" strokeWidth="1" strokeDasharray="3,3" opacity={0.5} />
                )}
                {/* Series */}
                {TREND_DATA.filter(s => visibleSeries[s.name]).map(s => {
                  const pts = s.data.map((v, i) => ({
                    x: trendChart.pad.left + (i / (s.data.length - 1)) * trendChart.iw,
                    y: trendChart.pad.top + trendChart.ih - ((v - trendChart.minV) / trendChart.range) * trendChart.ih,
                  }))
                  const lineStr = pts.map(p => `${p.x},${p.y}`).join(' ')
                  const areaStr = `${pts[0].x},${trendChart.pad.top + trendChart.ih} ${lineStr} ${pts[pts.length - 1].x},${trendChart.pad.top + trendChart.ih}`
                  return (
                    <g key={s.name}>
                      <polygon points={areaStr} fill={`url(#trend-fill-${s.name.replace(/\s/g, '')})`} />
                      <polyline points={lineStr} fill="none" stroke={s.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      {pts.map((p, i) => (
                        <circle key={i} cx={p.x} cy={p.y} r={hoveredTrend === i ? 5 : 3}
                          fill={s.color} stroke="var(--vl-bg-card)" strokeWidth={1.5}
                          style={{ transition: 'r 0.15s ease' }} />
                      ))}
                    </g>
                  )
                })}
                {/* Hover overlay */}
                {hoveredTrend !== null && (
                  <rect x={trendChart.pad.left} y={trendChart.pad.top} width={trendChart.iw} height={trendChart.ih}
                    fill="transparent" onMouseLeave={() => setHoveredTrend(null)}
                    onMouseMove={e => {
                      const rect = (e.target as SVGSVGElement).getBoundingClientRect()
                      const xRatio = (e.clientX - rect.left) / rect.width
                      const idx = Math.round(xRatio * (MONTHS.length - 1))
                      setHoveredTrend(Math.max(0, Math.min(MONTHS.length - 1, idx)))
                    }}
                  />
                )}
              </svg>
              {/* Tooltip */}
              {hoveredTrend !== null && (
                <div className="ai-trend-tooltip" style={{
                  left: `${trendChart.pad.left + (hoveredTrend / (MONTHS.length - 1)) * 100}%`,
                  top: 10,
                  transform: 'translateX(-50%)',
                }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{MONTHS[hoveredTrend]}</div>
                  {TREND_DATA.filter(s => visibleSeries[s.name]).map(s => (
                    <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 3, borderRadius: 1, background: s.color }} />
                      <span>{s.name}: <strong>{s.data[hoveredTrend]}</strong></span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── AI Recommendations ── */}
        <section style={{ marginBottom: 32 }}>
          <div className="ai-section-header">
            <div>
              <h2 className="ai-section-title">AI Recommendations</h2>
              <p className="ai-section-subtitle">8 actionable improvements based on meeting analysis</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['high', 'medium', 'low'].map(p => {
                const count = RECOMMENDATIONS.filter(r => r.priority === p && !dismissedRecs.has(r.id)).length
                return (
                  <span key={p} className={`ai-priority-${p}`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {p === 'high' && <AlertTriangle size={10} />}
                    {p === 'medium' && <Lightbulb size={10} />}
                    {p === 'low' && <Star size={10} />}
                    {count} {p}
                  </span>
                )
              })}
            </div>
          </div>

          <div className="ai-rec-grid" style={{
            display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14,
          }}>
            {RECOMMENDATIONS.filter(r => !dismissedRecs.has(r.id)).map(rec => {
              const isAccepted = acceptedRecs.has(rec.id)
              return (
                <div key={rec.id} className="ai-rec-card" style={{
                  borderColor: isAccepted ? 'rgba(16, 185, 129, 0.3)' : undefined,
                  opacity: isAccepted ? 0.7 : 1,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span className={`ai-priority-${rec.priority}`}>{rec.priority}</span>
                    <span className={`ai-effort-${rec.effort}`}>{rec.effort}</span>
                    <span style={{ fontSize: 10, color: 'var(--vl-text-muted)', marginLeft: 'auto' }}>{rec.category}</span>
                  </div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 6px', color: 'var(--vl-text-primary)' }}>{rec.title}</h3>
                  <p style={{ fontSize: 12, color: 'var(--vl-text-secondary)', lineHeight: 1.6, margin: '0 0 8px' }}>{rec.description}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 11, color: 'var(--vl-text-muted)' }}>
                      <ArrowUpRight size={10} style={{ color: '#10b981', display: 'inline', verticalAlign: 'middle' }} /> {rec.expectedImpact}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="ai-action-btn ai-action-btn-accept" onClick={() => acceptRec(rec.id)}>
                      <CheckCircle2 size={12} /> Accept
                    </button>
                    <button className="ai-action-btn ai-action-btn-dismiss" onClick={() => dismissRec(rec.id)}>
                      <XCircle size={12} /> Dismiss
                    </button>
                    <button className="ai-action-btn">
                      <Clock size={12} /> Snooze
                    </button>
                    {isAccepted && (
                      <span style={{ fontSize: 11, color: '#10b981', display: 'flex', alignItems: 'center', gap: 3, marginLeft: 'auto' }}>
                        <CheckCircle2 size={12} /> Accepted
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Sentiment Analysis ── */}
        <section style={{ marginBottom: 32 }}>
          <div className="ai-section-header">
            <div>
              <h2 className="ai-section-title">Sentiment Analysis</h2>
              <p className="ai-section-subtitle">Meeting tone, word-level sentiment, and key phrases</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
            {/* Overall sentiment */}
            <div className="ai-card">
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px' }}>Overall Meeting Sentiment</h3>
              <div className="ai-sentiment-gauge" style={{ marginBottom: 12 }}>
                <div className="ai-sentiment-gauge-bar ai-sentiment-gauge-bar-positive" style={{ width: '62%' }} />
                <div className="ai-sentiment-gauge-bar ai-sentiment-gauge-bar-neutral" style={{ width: '28%' }} />
                <div className="ai-sentiment-gauge-bar ai-sentiment-gauge-bar-negative" style={{ width: '10%' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                {[
                  { label: 'Positive', pct: 62, icon: <ThumbsUp size={14} />, cls: 'positive' },
                  { label: 'Neutral', pct: 28, icon: <Meh size={14} />, cls: 'neutral' },
                  { label: 'Negative', pct: 10, icon: <ThumbsDown size={14} />, cls: 'negative' },
                ].map(s => (
                  <div key={s.label} className={`ai-sentiment-${s.cls}`} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8,
                  }}>
                    {s.icon}
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{s.pct}%</div>
                      <div style={{ fontSize: 10, opacity: 0.7 }}>{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>
              <h4 style={{ fontSize: 12, fontWeight: 600, margin: '0 0 6px', color: 'var(--vl-text-muted)' }}>Sentiment Over Time</h4>
              <Sparkline data={[65, 60, 58, 62, 68, 72, 55, 70, 74, 76, 68, 73]} color="#10b981" width={300} height={40} />
            </div>

            {/* Word-level sentiment heat map */}
            <div className="ai-card">
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px' }}>Word-Level Sentiment</h3>
              <div className="ai-word-heatmap">
                {WORD_SENTIMENT.map((ws, i) => (
                  <span key={ws.word} className="ai-word-token" style={{
                    background: sentimentBg(ws.score),
                    color: sentimentColor(ws.score),
                    animationDelay: `${i * 0.03}s`,
                  }}>
                    {ws.word}
                  </span>
                ))}
              </div>
              <div style={{ marginTop: 12 }}>
                <h4 style={{ fontSize: 12, fontWeight: 600, margin: '0 0 4px', color: '#10b981' }}>
                  <ThumbsUp size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> Key Positive Phrases
                </h4>
                {['Exceeded our expectations', 'Excellent progress on CRISPR', 'Reduced computation time by 40%'].map(p => (
                  <div key={p} style={{ fontSize: 11, color: 'var(--vl-text-secondary)', padding: '2px 0', paddingLeft: 8, borderLeft: '2px solid #10b981', marginBottom: 4 }}>
                    &ldquo;{p}&rdquo;
                  </div>
                ))}
                <h4 style={{ fontSize: 12, fontWeight: 600, margin: '8px 0 4px', color: '#ef4444' }}>
                  <ThumbsDown size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> Key Negative Phrases
                </h4>
                {['3 weeks behind schedule', 'Data quality issues', 'Resource constraints'].map(p => (
                  <div key={p} style={{ fontSize: 11, color: 'var(--vl-text-secondary)', padding: '2px 0', paddingLeft: 8, borderLeft: '2px solid #ef4444', marginBottom: 4 }}>
                    &ldquo;{p}&rdquo;
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Pattern Detection ── */}
        <section style={{ marginBottom: 32 }}>
          <div className="ai-section-header">
            <div>
              <h2 className="ai-section-title">Pattern Detection</h2>
              <p className="ai-section-subtitle">Recurring topics, agent dynamics, time patterns, and decisions</p>
            </div>
          </div>

          <div className="ai-pattern-grid" style={{
            display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16,
          }}>
            {/* Recurring Topics — Bubble Chart */}
            <div className="ai-card">
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px' }}>
                <Hash size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                Recurring Topics
              </h3>
              <div className="ai-bubble-chart">
                {CLUSTERS.map((c, i) => {
                  const bubbleSize = Math.max(c.size * 1.2, 32)
                  return (
                    <div key={c.name} className="ai-bubble" style={{
                      width: bubbleSize, height: bubbleSize, fontSize: Math.max(bubbleSize * 0.22, 8),
                      background: `linear-gradient(135deg, ${c.color}, ${c.color}aa)`,
                      animationDelay: `${i * 0.08}s`,
                      boxShadow: `0 2px 8px ${c.color}33`,
                    }} title={`${c.name}: ${c.size} mentions`}>
                      {c.name.split(' ')[0]}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Agent Dynamics — Interaction Matrix */}
            <div className="ai-card">
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px' }}>
                <GitBranch size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                Agent Dynamics
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <div className="ai-matrix" style={{
                  gridTemplateColumns: `48px repeat(${INTERACTIONS.agents.length}, 1fr)`,
                  gap: 2, minWidth: 340,
                }}>
                  {/* Header row */}
                  <div />
                  {INTERACTIONS.agents.map(a => (
                    <div key={a} style={{ fontSize: 9, fontWeight: 600, color: 'var(--vl-text-muted)', textAlign: 'center', padding: 4 }}>
                      {a}
                    </div>
                  ))}
                  {/* Matrix rows */}
                  {INTERACTIONS.matrix.map((row, ri) => (
                    <React.Fragment key={ri}>
                      <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--vl-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 6 }}>
                        {INTERACTIONS.agents[ri]}
                      </div>
                      {row.map((val, ci) => (
                        <div key={ci} className="ai-matrix-cell" style={{
                          height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 600, color: '#fff',
                          background: ri === ci ? 'var(--vl-bg-secondary)' : `rgba(16, 185, 129, ${val / 14})`,
                          borderRadius: 4,
                        }}>
                          {ri === ci ? '—' : val}
                        </div>
                      ))}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            {/* Time Patterns — Heatmap */}
            <div className="ai-card">
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px' }}>
                <Calendar size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                Meeting Effectiveness by Time
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <div className="ai-heatmap" style={{
                  gridTemplateColumns: `40px repeat(${TIME_PATTERNS.hours.length}, 1fr)`,
                  gap: 2, minWidth: 360,
                }}>
                  {/* Hour labels */}
                  <div />
                  {TIME_PATTERNS.hours.map(h => (
                    <div key={h} style={{ fontSize: 9, color: 'var(--vl-text-muted)', textAlign: 'center', padding: 2 }}>{h}</div>
                  ))}
                  {TIME_PATTERNS.effectiveness.map((row, di) => (
                    <React.Fragment key={di}>
                      <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--vl-text-muted)', display: 'flex', alignItems: 'center', paddingRight: 4 }}>
                        {TIME_PATTERNS.days[di]}
                      </div>
                      {row.map((val, hi) => (
                        <div
                          key={hi}
                          className="ai-heatmap-cell"
                          data-tooltip={`${TIME_PATTERNS.days[di]} ${TIME_PATTERNS.hours[hi]}: ${Math.round(val * 100)}%`}
                          style={{
                            height: 28, borderRadius: 3,
                            background: heatmapColor(val),
                            opacity: 0.8 + val * 0.2,
                          }}
                          onMouseEnter={() => setHoveredCell({ day: di, hour: hi })}
                          onMouseLeave={() => setHoveredCell(null)}
                        />
                      ))}
                    </React.Fragment>
                  ))}
                </div>
              </div>
              {hoveredCell && (
                <div style={{
                  marginTop: 8, fontSize: 11, color: 'var(--vl-text-secondary)',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <Activity size={12} />
                  {TIME_PATTERNS.days[hoveredCell.day]} {TIME_PATTERNS.hours[hoveredCell.hour]}:
                  {' '}<strong>{Math.round(TIME_PATTERNS.effectiveness[hoveredCell.day][hoveredCell.hour] * 100)}%</strong> effectiveness
                </div>
              )}
            </div>

            {/* Decision Patterns */}
            <div className="ai-card">
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px' }}>
                <Award size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                Decision Patterns
              </h3>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--vl-text-muted)', marginBottom: 6 }}>
                  <span>Total Decisions: {DECISIONS.total}</span>
                </div>
                <div className="ai-decision-bar">
                  <div className="ai-decision-segment" style={{
                    width: `${(DECISIONS.unanimous / DECISIONS.total) * 100}%`,
                    background: 'linear-gradient(90deg, #10b981, #34d399)',
                  }}>
                    {DECISIONS.unanimous}
                  </div>
                  <div className="ai-decision-segment" style={{
                    width: `${(DECISIONS.voted / DECISIONS.total) * 100}%`,
                    background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                  }}>
                    {DECISIONS.voted}
                  </div>
                  <div className="ai-decision-segment" style={{
                    width: `${(DECISIONS.deferred / DECISIONS.total) * 100}%`,
                    background: 'linear-gradient(90deg, #ef4444, #f87171)',
                  }}>
                    {DECISIONS.deferred}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Unanimous', count: DECISIONS.unanimous, color: '#10b981', pct: '58%' },
                  { label: 'Voted', count: DECISIONS.voted, color: '#f59e0b', pct: '26%' },
                  { label: 'Deferred', count: DECISIONS.deferred, color: '#ef4444', pct: '16%' },
                ].map(d => (
                  <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color }} />
                    <span style={{ fontSize: 12, color: 'var(--vl-text-secondary)', width: 72 }}>{d.label}</span>
                    <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--vl-bg-secondary)' }}>
                      <div style={{ height: '100%', borderRadius: 2, background: d.color, width: d.pct, transition: 'width 0.6s ease' }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: d.color }}>{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Insight History ── */}
        <section style={{ marginBottom: 32 }}>
          <div className="ai-section-header">
            <div>
              <h2 className="ai-section-title">Insight History</h2>
              <p className="ai-section-subtitle">Past insight reports and analysis snapshots</p>
            </div>
          </div>
          <div className="ai-card" style={{ padding: '16px 20px' }}>
            {HISTORY.map(h => {
              const isExp = expandedHistory === h.id
              return (
                <div key={h.id} className="ai-history-item" style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                    onClick={() => setExpandedHistory(isExp ? null : h.id)}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--vl-text-primary)' }}>{h.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--vl-text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <Clock size={10} />
                        {new Date(h.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                    {isExp ? <ChevronUp size={14} style={{ color: 'var(--vl-text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--vl-text-muted)' }} />}
                  </div>
                  {isExp && (
                    <p style={{ fontSize: 12, color: 'var(--vl-text-secondary)', marginTop: 6, lineHeight: 1.6, margin: '6px 0 0' }}>
                      {h.summary}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
