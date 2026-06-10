'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp, MessageSquare, BarChart3, Activity,
  ChevronRight,
} from 'lucide-react'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import { renderAgentIcon } from './shared-components'

// ============================================================
// Types
// ============================================================

interface AgentPerformanceCardProps {
  agent: {
    id: string
    title: string
    color: string
    icon: string
    expertise?: string
  }
  meetings: Array<{
    id: string
    messages: Array<{
      agentName: string
      message: string
      roundIndex: number
    }>
    status: string
  }>
  lang?: Lang
  onClick?: () => void
}

interface AgentMetrics {
  totalMessages: number
  meetingsParticipated: number
  avgMessagesPerMeeting: number
  last5Messages: number[]
  participationTrend: number[] // last 5 values, normalized 0-100
  longestMessage: number
  avgMessageLength: number
  firstRoundMessages: number
  totalRounds: number
}

// ============================================================
// AgentPerformanceCard
// ============================================================

export function AgentPerformanceCard({
  agent,
  meetings,
  lang = 'en',
  onClick,
}: AgentPerformanceCardProps) {
  const metrics = useMemo<AgentMetrics>(() => {
    const completedMeetings = meetings.filter(m => m.status === 'completed')
    const relevantMeetings = meetings.filter(m =>
      m.messages.some(msg => msg.agentName === agent.title)
    )

    const allAgentMessages = completedMeetings.flatMap(m =>
      m.messages.filter(msg => msg.agentName === agent.title)
    )

    const totalMessages = allAgentMessages.length
    const meetingsParticipated = relevantMeetings.length

    // Messages per meeting
    const messagesPerMeeting = completedMeetings.map(m =>
      m.messages.filter(msg => msg.agentName === agent.title).length
    ).filter(c => c > 0)

    const avgMessagesPerMeeting = messagesPerMeeting.length > 0
      ? Math.round(messagesPerMeeting.reduce((a, b) => a + b, 0) / messagesPerMeeting.length)
      : 0

    const last5 = messagesPerMeeting.slice(-5)

    // Participation trend: normalize each value to 0-100
    const maxPerMeeting = Math.max(...messagesPerMeeting, 1)
    const participationTrend = messagesPerMeeting.slice(-5).map(v =>
      Math.round((v / maxPerMeeting) * 100)
    )

    // Message length stats
    const lengths = allAgentMessages.map(m => m.message.length)
    const avgMessageLength = lengths.length > 0
      ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length)
      : 0
    const longestMessage = lengths.length > 0 ? Math.max(...lengths) : 0

    // First round messages
    const firstRoundMessages = allAgentMessages.filter(m => m.roundIndex === 0).length

    // Total rounds agent participated in
    const rounds = new Set(allAgentMessages.map(m => m.roundIndex))

    return {
      totalMessages,
      meetingsParticipated,
      avgMessagesPerMeeting,
      last5Messages: last5,
      participationTrend,
      longestMessage,
      avgMessageLength,
      firstRoundMessages,
      totalRounds: rounds.size,
    }
  }, [agent.title, meetings])

  // Mini bar chart SVG for messages per meeting
  const miniBarWidth = 120
  const miniBarHeight = 36
  const last5 = metrics.last5Messages
  const maxBar = Math.max(...last5, 1)
  const barWidth = Math.min(12, (miniBarWidth - 10) / Math.max(last5.length, 1) - 2)

  // Trend line SVG
  const trendWidth = 120
  const trendHeight = 32
  const trend = metrics.participationTrend
  const trendPoints = trend.length > 1
    ? trend.map((v, i) => {
      const x = (i / (trend.length - 1)) * trendWidth
      const y = trendHeight - (v / 100) * trendHeight
      return `${x},${y}`
    }).join(' ')
    : ''

  const trendDirection = trend.length >= 2
    ? trend[trend.length - 1] - trend[trend.length - 2]
    : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      whileHover={{ scale: 1.02, y: -2 }}
      className="cursor-pointer"
      onClick={onClick}
    >
      <div className="agent-perf-card vl-inner rounded-xl overflow-hidden border border-[var(--vl-border-subtle)]">
        {/* Color accent top bar */}
        <div className="h-1" style={{ background: `linear-gradient(90deg, ${agent.color}, ${agent.color}66)` }} />

        <div className="p-4">
          {/* Agent header */}
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style={{
                backgroundColor: agent.color,
                boxShadow: `0 0 10px ${agent.color}33`,
              }}
            >
              {renderAgentIcon(agent.icon, 'size-4 text-white')}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold vl-text-heading truncate">{agent.title}</p>
              <p className="text-[10px] vl-text-muted">{agent.expertise?.slice(0, 40) || 'Research Agent'}</p>
            </div>
          </div>

          {/* Key metrics row */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { icon: <MessageSquare className="size-3" />, value: metrics.totalMessages, label: 'Messages' },
              { icon: <BarChart3 className="size-3" />, value: metrics.meetingsParticipated, label: 'Meetings' },
              { icon: <TrendingUp className="size-3" />, value: metrics.avgMessagesPerMeeting, label: 'Avg/Meeting' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <span className="vl-text-muted">{stat.icon}</span>
                  <span className="text-sm font-bold vl-text-heading">{stat.value}</span>
                </div>
                <span className="text-[8px] vl-text-muted">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-[var(--vl-border-subtle)] my-2" />

          {/* Mini bar chart: Messages per meeting */}
          {last5.length > 0 && (
            <div className="mb-2">
              <p className="text-[8px] vl-text-muted mb-1 uppercase tracking-wider">Messages per Meeting</p>
              <svg
                viewBox={`0 0 ${miniBarWidth} ${miniBarHeight}`}
                className="w-full h-auto"
              >
                {/* Baseline */}
                <line x1={0} y1={miniBarHeight - 2} x2={miniBarWidth} y2={miniBarHeight - 2} stroke="var(--vl-border-subtle)" strokeWidth={0.5} />
                {last5.map((val, i) => {
                  const h = Math.max((val / maxBar) * (miniBarHeight - 8), 2)
                  const x = i * (barWidth + 2) + 4
                  const y = miniBarHeight - 2 - h
                  return (
                    <rect
                      key={`bar-${i}`}
                      x={x}
                      y={y}
                      width={barWidth}
                      height={h}
                      rx={2}
                      fill={agent.color}
                      opacity={0.5 + (val / maxBar) * 0.5}
                    >
                      <animate
                        attributeName="height"
                        from={0}
                        to={h}
                        dur="0.5s"
                        fill="freeze"
                        begin={`${i * 0.08}s`}
                      />
                      <animate
                        attributeName="y"
                        from={miniBarHeight - 2}
                        to={y}
                        dur="0.5s"
                        fill="freeze"
                        begin={`${i * 0.08}s`}
                      />
                    </rect>
                  )
                })}
              </svg>
            </div>
          )}

          {/* Participation trend line */}
          {trend.length > 1 && (
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[8px] vl-text-muted mb-1 uppercase tracking-wider">Participation Trend</p>
                <svg
                  viewBox={`0 0 ${trendWidth} ${trendHeight}`}
                  className="w-full h-auto"
                >
                  {/* Area fill */}
                  {trendPoints && (
                    <polygon
                      points={`${trendPoints} ${trendWidth},${trendHeight} 0,${trendHeight}`}
                      fill={agent.color}
                      fillOpacity={0.08}
                    />
                  )}
                  {/* Line */}
                  {trendPoints && (
                    <polyline
                      fill="none"
                      stroke={agent.color}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={trendPoints}
                      strokeOpacity={0.7}
                    />
                  )}
                  {/* End dot */}
                  {trend.length > 0 && (
                    <circle
                      cx={trendWidth}
                      cy={trendHeight - (trend[trend.length - 1] / 100) * trendHeight}
                      r={3}
                      fill={agent.color}
                    />
                  )}
                </svg>
              </div>
              <div className="flex flex-col items-end ml-2">
                {trendDirection > 5 && (
                  <span className="text-[9px] text-emerald-400 font-medium flex items-center gap-0.5">
                    <TrendingUp className="size-3" /> Up
                  </span>
                )}
                {trendDirection < -5 && (
                  <span className="text-[9px] text-red-400 font-medium flex items-center gap-0.5 rotate-180">
                    <TrendingUp className="size-3" /> Down
                  </span>
                )}
                {Math.abs(trendDirection) <= 5 && (
                  <span className="text-[9px] text-amber-400 font-medium">Stable</span>
                )}
                <span className="text-[8px] vl-text-muted mt-0.5">
                  {metrics.totalRounds} rounds
                </span>
              </div>
            </div>
          )}

          {/* Additional metrics row */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="text-[8px] vl-text-muted">
              Avg length: <span className="vl-text-heading font-medium">{metrics.avgMessageLength} chars</span>
            </div>
            <div className="text-[8px] vl-text-muted">
              1st round: <span className="vl-text-heading font-medium">{metrics.firstRoundMessages} msgs</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================
// AgentPerformanceCardSkeleton — Loading state
// ============================================================

export function AgentPerformanceCardSkeleton() {
  return (
    <div className="vl-inner rounded-xl overflow-hidden">
      <div className="h-1 skeleton-shimmer" />
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full skeleton-shimmer shrink-0" />
          <div className="flex-1 space-y-1">
            <div className="skeleton-shimmer h-3.5 w-28 rounded" />
            <div className="skeleton-shimmer h-2.5 w-36 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="text-center space-y-1">
              <div className="skeleton-shimmer h-4 w-8 rounded mx-auto" />
              <div className="skeleton-shimmer h-2 w-14 rounded mx-auto" />
            </div>
          ))}
        </div>
        <div className="border-t border-[var(--vl-border-subtle)] my-2" />
        <div className="skeleton-shimmer h-8 rounded" />
        <div className="skeleton-shimmer h-8 rounded mt-2" />
      </div>
    </div>
  )
}
