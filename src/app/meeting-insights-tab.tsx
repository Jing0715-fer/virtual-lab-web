'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain, TrendingUp, BarChart3, Users, Activity,
  MessageSquare, Clock, Zap, Target, Lightbulb,
  ChevronRight, Loader2, RefreshCw, Hash, Sparkles,
  Calendar, FileText, Eye,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip as RechartsTooltip, Legend, Cell,
} from 'recharts'
import { renderAgentIcon } from './shared-components'

// ============================================================
// Types
// ============================================================

interface MeetingInsightsData {
  totalMeetings: number
  completedMeetings: number
  completionRate: number
  avgMeetingDuration: number
  totalMessages: number
  avgMessagesPerMeeting: number
  mostActiveAgents: Array<{
    agentName: string
    totalMessages: number
    color: string
    icon: string
  }>
  collaborationMatrix: Array<{
    agent1: string
    agent2: string
    sharedMeetings: number
  }>
  agentNames: string[]
  globalTopicFrequency: Array<{ word: string; count: number }>
  meetingTimeline: Array<{
    id: string
    name: string
    type: string
    status: string
    date: string
    messageCount: number
  }>
  teamAvgMessages: number
  individualAvgMessages: number
  messageDifference: number
  agentPerMeetingData: Array<{
    agentName: string
    color: string
    icon: string
    totalMessages: number
    meetingsParticipated: number
    avgMessagesPerMeeting: number
    messagesPerMeeting: number[]
    last5Messages: number[]
  }>
  agentRadarData: Array<{
    agentName: string
    color: string
    icon: string
    metrics: {
      participationRate: number
      avgMessageLength: number
      proactivity: number
      responsiveness: number
      conciseness: number
    }
  }>
  insights: string[]
}

const CHART_COLORS = [
  '#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
]

const RADAR_AXES = [
  { key: 'participationRate', label: 'Participation' },
  { key: 'avgMessageLength', label: 'Detail Level' },
  { key: 'proactivity', label: 'Proactivity' },
  { key: 'responsiveness', label: 'Responsiveness' },
  { key: 'conciseness', label: 'Conciseness' },
]

// ============================================================
// Agent Performance Radar Chart (SVG)
// ============================================================

function AgentPerformanceRadar({ agents, lang }: { agents: MeetingInsightsData['agentRadarData']; lang: Lang }) {
  const [mounted, setMounted] = useState(false)
  const [hoveredPoint, setHoveredPoint] = useState<{ agent: number; axis: number } | null>(null)

  useEffect(() => { requestAnimationFrame(() => setMounted(true)) }, [])

  if (agents.length === 0) return null

  const width = 360
  const height = 360
  const cx = width / 2
  const cy = height / 2
  const maxRadius = Math.min(width, height) / 2 - 55
  const numAxes = RADAR_AXES.length
  const angleStep = (2 * Math.PI) / numAxes
  const startAngle = -Math.PI / 2

  const axisCoords = useMemo(() => {
    return RADAR_AXES.map((_, i) => ({
      x: cx + maxRadius * Math.cos(startAngle + i * angleStep),
      y: cy + maxRadius * Math.sin(startAngle + i * angleStep),
    }))
  }, [cx, cy, maxRadius, angleStep, startAngle])

  return (
    <div className="vl-inner rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Brain className="size-4 text-violet-400" />
        <h3 className="text-xs font-semibold vl-text-heading">{t(lang, 'meetingInsightsTab.radarTitle') || 'Agent Performance Radar'}</h3>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[360px] h-auto mx-auto">
        {/* Grid rings */}
        {[0.2, 0.4, 0.6, 0.8, 1.0].map((scale, ri) => {
          const points = RADAR_AXES.map((_, i) => {
            const r = maxRadius * scale
            return `${cx + r * Math.cos(startAngle + i * angleStep)},${cy + r * Math.sin(startAngle + i * angleStep)}`
          }).join(' ')
          return (
            <polygon
              key={`grid-${ri}`}
              points={points}
              fill="none"
              stroke="var(--vl-border-subtle)"
              strokeWidth={1}
              opacity={mounted ? 0.5 : 0}
              style={{ transition: 'opacity 0.6s ease' }}
            />
          )
        })}

        {/* Axis lines + labels */}
        {axisCoords.map((coord, i) => (
          <g key={`axis-${i}`}>
            <line
              x1={cx} y1={cy} x2={coord.x} y2={coord.y}
              stroke="var(--vl-border-subtle)" strokeWidth={1}
              opacity={mounted ? 0.4 : 0}
              style={{ transition: 'opacity 0.6s ease' }}
            />
            <text
              x={cx + (maxRadius + 20) * Math.cos(startAngle + i * angleStep)}
              y={cy + (maxRadius + 20) * Math.sin(startAngle + i * angleStep)}
              textAnchor="middle" fill="var(--vl-text-muted)"
              fontSize={9} fontWeight={500}
              dominantBaseline="middle"
            >
              {RADAR_AXES[i].label}
            </text>
          </g>
        ))}

        {/* Agent polygons */}
        {agents.slice(0, 4).map((agent, ai) => {
          const metrics = agent.metrics as Record<string, number>
          const points = RADAR_AXES.map((axis, i) => {
            const val = metrics[axis.key] ?? 0
            const r = Math.max((val / 100) * maxRadius, 0)
            return `${cx + r * Math.cos(startAngle + i * angleStep)},${cy + r * Math.sin(startAngle + i * angleStep)}`
          }).join(' ')

          const dataPoints = RADAR_AXES.map((axis, i) => {
            const val = metrics[axis.key] ?? 0
            const r = Math.max((val / 100) * maxRadius, 0)
            return {
              x: cx + r * Math.cos(startAngle + i * angleStep),
              y: cy + r * Math.sin(startAngle + i * angleStep),
              value: val,
              label: axis.label,
            }
          })

          return (
            <g key={`agent-${ai}`}>
              <polygon
                points={points}
                fill={agent.color}
                fillOpacity={mounted ? 0.12 : 0}
                stroke={agent.color}
                strokeWidth={2}
                strokeOpacity={mounted ? 0.7 : 0}
                style={{
                  transition: `fill-opacity 0.8s ease ${ai * 0.15}s, stroke-opacity 0.8s ease ${ai * 0.15}s`,
                }}
              />
              {dataPoints.map((pt, pi) => {
                const isHovered = hoveredPoint?.agent === ai && hoveredPoint?.axis === pi
                return (
                  <g key={`pt-${ai}-${pi}`}>
                    <circle
                      cx={pt.x} cy={pt.y}
                      r={isHovered ? 5 : 3}
                      fill={agent.color}
                      stroke="var(--vl-bg-card)"
                      strokeWidth={1.5}
                      className="cursor-pointer"
                      opacity={mounted ? 1 : 0}
                      style={{ transition: 'opacity 0.6s ease, r 0.15s ease' }}
                      onMouseEnter={() => setHoveredPoint({ agent: ai, axis: pi })}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                    {isHovered && (
                      <g className="pointer-events-none">
                        <rect
                          x={pt.x - 40} y={pt.y - 24}
                          width={80} height={20} rx={5}
                          fill="var(--vl-bg-secondary)" stroke="var(--vl-border)"
                        />
                        <text
                          x={pt.x} y={pt.y - 10}
                          textAnchor="middle" fill="var(--vl-text-white)"
                          fontSize={9} fontWeight={600}
                        >
                          {pt.label}: {pt.value}
                        </text>
                      </g>
                    )}
                  </g>
                )
              })}
            </g>
          )
        })}

        {/* Legend */}
        <g transform={`translate(${width - 90}, 12)`}>
          {agents.slice(0, 4).map((agent, di) => (
            <g key={`legend-${di}`} transform={`translate(0, ${di * 16})`}>
              <rect x={0} y={0} width={10} height={10} rx={2} fill={agent.color} />
              <text x={14} y={9} fill="var(--vl-text-muted)" fontSize={8}>{agent.agentName.length > 10 ? agent.agentName.slice(0, 10) + '…' : agent.agentName}</text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  )
}

// ============================================================
// Topic Word Cloud (CSS-based)
// ============================================================

function TopicWordCloud({ topics, lang }: { topics: Array<{ word: string; count: number }>; lang: Lang }) {
  if (topics.length === 0) return null

  const maxCount = topics[0]?.count || 1
  const minCount = topics[topics.length - 1]?.count || 1

  const getColor = (normalized: number) => {
    const hue = 160 + normalized * 50
    const sat = 55 + normalized * 25
    const light = 35 + (1 - normalized) * 20
    return `hsl(${hue}, ${sat}%, ${light}%)`
  }

  const categories = ['methodology', 'analysis', 'results', 'biological', 'computational']

  return (
    <div className="vl-inner rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Hash className="size-4 text-cyan-400" />
        <h3 className="text-xs font-semibold vl-text-heading">{t(lang, 'meetingInsightsTab.wordCloudTitle') || 'Topic Word Cloud'}</h3>
      </div>
      <div className="word-cloud flex flex-wrap items-center justify-center gap-x-3 gap-y-2 py-3">
        {topics.map((item, idx) => {
          const range = maxCount - minCount || 1
          const normalized = (item.count - minCount) / range
          const fontSize = 0.7 + normalized * 1.3
          const opacity = 0.45 + normalized * 0.55
          const rotation = (idx * 7 + 1) % 11 > 8 ? ((idx * 3) % 2 === 0 ? -8 : 8) : 0
          const category = categories[idx % categories.length]

          return (
            <motion.span
              key={item.word}
              className="word-cloud-item inline-block cursor-default select-none"
              style={{
                fontSize: `${fontSize}rem`,
                opacity,
                color: getColor(normalized),
                transform: `rotate(${rotation}deg)`,
                fontWeight: normalized > 0.6 ? 700 : normalized > 0.3 ? 500 : 400,
              }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity }}
              transition={{ delay: idx * 0.03, duration: 0.3 }}
              whileHover={{ scale: 1.15, opacity: 1 }}
              title={`${item.word}: ${item.count} occurrences`}
            >
              {item.word}
            </motion.span>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================
// Collaboration Heatmap
// ============================================================

function CollaborationHeatmap({ matrix, agentNames, lang }: {
  matrix: MeetingInsightsData['collaborationMatrix']
  agentNames: string[]
  lang: Lang
}) {
  const displayNames = agentNames.slice(0, 6)
  if (displayNames.length < 2) return null

  // Build lookup matrix
  const lookup = new Map<string, number>()
  for (const entry of matrix) {
    const key1 = `${entry.agent1}|${entry.agent2}`
    const key2 = `${entry.agent2}|${entry.agent1}`
    lookup.set(key1, entry.sharedMeetings)
    lookup.set(key2, entry.sharedMeetings)
  }

  const getShared = (a: string, b: string) => lookup.get(`${a}|${b}`) || 0

  // Find max for color normalization
  let maxShared = 1
  for (const entry of matrix) {
    if (entry.sharedMeetings > maxShared) maxShared = entry.sharedMeetings
  }

  const getColor = (val: number) => {
    if (val === 0) return 'var(--vl-bg-inner)'
    const intensity = val / maxShared
    return `rgba(16, 185, 129, ${0.15 + intensity * 0.65})`
  }

  return (
    <div className="vl-inner rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="size-4 text-emerald-400" />
        <h3 className="text-xs font-semibold vl-text-heading">{t(lang, 'meetingInsightsTab.heatmapTitle') || 'Collaboration Heatmap'}</h3>
      </div>
      <div className="overflow-x-auto">
        <div className="collab-heatmap inline-grid gap-1" style={{ gridTemplateColumns: `auto repeat(${displayNames.length}, 1fr)` }}>
          {/* Header row */}
          <div />
          {displayNames.map(name => (
            <div key={`header-${name}`} className="text-[8px] vl-text-muted text-center truncate px-1" title={name}>
              {name.length > 6 ? name.slice(0, 6) + '…' : name}
            </div>
          ))}

          {/* Rows */}
          {displayNames.map((rowName, ri) => (
            <React.Fragment key={`row-${ri}`}>
              <div className="text-[8px] vl-text-muted text-right pr-2 truncate flex items-center" title={rowName}>
                {rowName.length > 6 ? rowName.slice(0, 6) + '…' : rowName}
              </div>
              {displayNames.map((colName, ci) => {
                const val = getShared(rowName, colName)
                return (
                  <motion.div
                    key={`cell-${ri}-${ci}`}
                    className="heatmap-cell flex items-center justify-center rounded-md text-[9px] font-medium min-h-[28px] min-w-[32px]"
                    style={{
                      backgroundColor: getColor(val),
                      color: val > maxShared * 0.5 ? 'var(--vl-text-white)' : 'var(--vl-text-muted)',
                    }}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: (ri + ci) * 0.04, duration: 0.3 }}
                    title={`${rowName} × ${colName}: ${val} shared meetings`}
                  >
                    {val > 0 ? val : '—'}
                  </motion.div>
                )
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Meeting Timeline Chart (recharts BarChart)
// ============================================================

function MeetingTimelineChart({ timeline, lang }: {
  timeline: MeetingInsightsData['meetingTimeline']
  lang: Lang
}) {
  if (timeline.length === 0) return null

  const data = timeline.slice(-20).map(m => ({
    name: m.name.length > 12 ? m.name.slice(0, 12) + '…' : m.name,
    messages: m.messageCount,
    status: m.status,
    type: m.type,
  }))

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981'
      case 'running': return '#f59e0b'
      default: return '#6b7280'
    }
  }

  const tooltipStyle: React.CSSProperties = {
    background: 'var(--vl-bg-secondary)',
    border: '1px solid var(--vl-border)',
    borderRadius: '8px',
    fontSize: '11px',
    color: 'var(--vl-text-secondary)',
  }

  return (
    <div className="vl-inner rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="size-4 text-amber-400" />
        <h3 className="text-xs font-semibold vl-text-heading">{t(lang, 'meetingInsightsTab.timelineTitle') || 'Meeting Timeline'}</h3>
      </div>
      <div style={{ animation: 'chart-grow-in 0.6s ease forwards' }}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--vl-border-subtle)" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 8, fill: 'var(--vl-text-muted)', angle: -30, textAnchor: 'end' }}
              height={50}
            />
            <YAxis tick={{ fontSize: 9, fill: 'var(--vl-text-muted)' }} />
            <RechartsTooltip contentStyle={tooltipStyle} />
            <Bar dataKey="messages" name="Messages" radius={[3, 3, 0, 0]}>
              {data.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={getStatusColor(entry.status)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 mt-2 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
          <span className="text-[9px] vl-text-muted">Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
          <span className="text-[9px] vl-text-muted">Running</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-gray-500" />
          <span className="text-[9px] vl-text-muted">Draft</span>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Insight Cards
// ============================================================

function InsightCards({ insights, lang }: { insights: string[]; lang: Lang }) {
  if (insights.length === 0) return null

  return (
    <div className="vl-inner rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="size-4 text-amber-400" />
        <h3 className="text-xs font-semibold vl-text-heading">{t(lang, 'meetingInsightsTab.insightCardsTitle') || 'Auto-Generated Insights'}</h3>
      </div>
      <div className="space-y-2">
        {insights.map((insight, idx) => (
          <motion.div
            key={`insight-${idx}`}
            className="insight-card flex items-start gap-3 rounded-lg p-3 border border-[var(--vl-border-subtle)]"
            style={{
              background: `linear-gradient(135deg, ${CHART_COLORS[idx % CHART_COLORS.length]}08, transparent)`,
            }}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1, duration: 0.4 }}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
              style={{
                backgroundColor: `${CHART_COLORS[idx % CHART_COLORS.length]}20`,
              }}
            >
              <Sparkles className="size-3.5" style={{ color: CHART_COLORS[idx % CHART_COLORS.length] }} />
            </div>
            <p className="text-xs vl-text-body leading-relaxed">{insight}</p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// Empty State
// ============================================================

function EmptyInsightsState({ lang }: { lang: Lang }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <BarChart3 className="size-12 vl-text-muted mb-4" />
      </motion.div>
      <h3 className="text-sm font-semibold vl-text-heading mb-1">
        {t(lang, 'meetingInsightsTab.noInsightsTitle') || 'No Insights Yet'}
      </h3>
      <p className="text-xs vl-text-muted text-center max-w-[280px]">
        {t(lang, 'meetingInsightsTab.noInsightsDesc') || 'Complete some meetings with messages to generate analytics and insights.'}
      </p>
    </div>
  )
}

// ============================================================
// Main Export: MeetingInsightsPanel
// ============================================================

export function MeetingInsightsPanel({ lang = 'en' }: { lang?: Lang }) {
  const [data, setData] = useState<MeetingInsightsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInsights = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/meeting-insights')
      if (!res.ok) throw new Error('Failed to fetch insights')
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load insights')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInsights()
  }, [fetchInsights])

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="vl-inner rounded-xl p-4" style={{ animation: `insights-fade-in 0.4s ease ${i * 0.1}s forwards`, opacity: 0 }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="skeleton-shimmer h-4 w-4 rounded" />
              <div className="skeleton-shimmer h-4 w-32 rounded" />
            </div>
            <div className="skeleton-shimmer h-48 rounded-lg" />
          </div>
        ))}
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="vl-inner rounded-xl p-6 text-center">
        <p className="text-sm vl-text-muted mb-3">{error || 'No data available'}</p>
        <Button variant="outline" size="sm" onClick={fetchInsights} className="gap-2">
          <RefreshCw className="size-3" /> Retry
        </Button>
      </div>
    )
  }

  if (data.totalMeetings === 0) {
    return <EmptyInsightsState lang={lang} />
  }

  return (
    <div className="space-y-4">
      {/* Stats header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="size-5 text-emerald-400" />
          <h2 className="text-sm font-semibold vl-text-heading">
            {t(lang, 'meetingInsightsTab.title') || 'Meeting Insights'}
          </h2>
          <Badge variant="outline" className="text-[9px] border-[var(--vl-border)] vl-text-muted">
            {data.totalMeetings} meetings
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[10px] vl-text-muted hover:text-emerald-400"
          onClick={fetchInsights}
        >
          <RefreshCw className="size-3 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Quick stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 card-entrance-cascade">
        {[
          { icon: <BarChart3 className="size-4" />, value: data.totalMessages, label: 'Total Messages', color: 'bg-emerald-500/15 text-emerald-400' },
          { icon: <Target className="size-4" />, value: `${data.completionRate}%`, label: 'Completion Rate', color: 'bg-cyan-500/15 text-cyan-400' },
          { icon: <Users className="size-4" />, value: data.mostActiveAgents.length, label: 'Active Agents', color: 'bg-violet-500/15 text-violet-400' },
          { icon: <Clock className="size-4" />, value: `${data.avgMeetingDuration}s`, label: 'Avg Duration', color: 'bg-amber-500/15 text-amber-400' },
        ].map((stat) => (
          <div key={stat.label} className="vl-inner rounded-xl p-3 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${stat.color}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-lg font-bold vl-text-heading">{stat.value}</p>
              <p className="text-[9px] vl-text-muted">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Agent Performance Radar Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <AgentPerformanceRadar agents={data.agentRadarData} lang={lang} />
      </motion.div>

      {/* Two-column: Word Cloud + Heatmap */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <TopicWordCloud topics={data.globalTopicFrequency} lang={lang} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <CollaborationHeatmap matrix={data.collaborationMatrix} agentNames={data.agentNames} lang={lang} />
        </motion.div>
      </div>

      {/* Meeting Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <MeetingTimelineChart timeline={data.meetingTimeline} lang={lang} />
      </motion.div>

      {/* Insight Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        <InsightCards insights={data.insights} lang={lang} />
      </motion.div>
    </div>
  )
}
