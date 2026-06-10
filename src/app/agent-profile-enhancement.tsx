'use client'

/**
 * Agent Profile Enhancement System
 * Rich visual presentation of agent profiles with activity graphs,
 * conversation summaries, relationship maps, and skills radar charts.
 * All visualizations use pure CSS/SVG — NO recharts dependency.
 */

import React, { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Users, MessageSquare, Calendar, Clock, TrendingUp,
  Sparkles, ChevronDown, ChevronUp, Activity, Tag, Brain,
  Network, Zap, BarChart3, Eye, BookOpen,
} from 'lucide-react'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { Agent, Meeting } from './shared-components'
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

// ============================================================
// Interfaces
// ============================================================

interface AgentProfileProps {
  agent: Agent
  meetings: Meeting[]
  lang: Lang
  onClose?: () => void
}

// ============================================================
// AgentProfileCard — Enhanced card for agent display
// ============================================================

export function AgentProfileCard({ agent, meetings, lang, onClose }: AgentProfileProps) {
  const [systemPromptExpanded, setSystemPromptExpanded] = useState(false)
  const [expertiseExpanded, setExpertiseExpanded] = useState(false)

  const stats = useMemo(() => {
    const agentMessages = meetings.flatMap(m =>
      (m.messages?.filter(msg => msg.agentName === agent.title) || [])
    )
    const meetingsJoined = meetings.filter(m =>
      m.messages?.some(msg => msg.agentName === agent.title)
    ).length
    const totalMessages = agentMessages.length
    const avgMessageLength = totalMessages > 0
      ? Math.round(agentMessages.reduce((sum, msg) => sum + msg.message.length, 0) / totalMessages)
      : 0

    // Activity level for ring thickness (0-1)
    const activityLevel = Math.min(totalMessages / 50, 1)

    return { totalMessages, meetingsJoined, avgMessageLength, activityLevel }
  }, [agent, meetings])

  const status = useMemo(() => {
    const recent = meetings.filter(m =>
      m.messages?.some(msg => msg.agentName === agent.title) &&
      Date.now() - new Date(m.updatedAt).getTime() < 300000
    )
    return recent.length > 0 ? 'online' as const : 'offline' as const
  }, [agent, meetings])

  const initials = agent.title
    .split(' ')
    .map(w => w.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const expertiseTags = useMemo(() => {
    const words = agent.expertise
      .split(/[,.;]+/)
      .map(w => w.trim())
      .filter(w => w.length > 0 && w.length < 40)
    return words.slice(0, 8)
  }, [agent.expertise])

  const statusColor = status === 'online' ? '#10b981' : '#64748b'
  const statusLabel = status === 'online' ? t(lang, 'agentProfile.status.online') : t(lang, 'agentProfile.status.offline')

  return (
    <div className="agent-profile-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold vl-text-heading flex items-center gap-2">
          <Eye className="size-4 text-emerald-500" />
          {t(lang, 'agentProfile.title')}
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[var(--vl-bg-inner)] vl-text-muted hover:text-white transition-colors"
            aria-label={t(lang, 'common.close')}
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Avatar + Info */}
      <div className="flex flex-col items-center text-center mb-5">
        {/* Animated ring avatar */}
        <div className="relative mb-3">
          <div
            className="agent-avatar-ring"
            style={{
              '--ring-color': agent.color,
              '--ring-opacity': 0.3 + stats.activityLevel * 0.7,
              '--ring-width': 2 + stats.activityLevel * 3,
            } as React.CSSProperties}
          />
          <div
            className="relative z-10 w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${agent.color}, ${agent.color}cc)`,
            }}
          >
            {initials}
          </div>
          {/* Status dot */}
          <div
            className="absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-[var(--vl-bg-card)] z-20"
            style={{ backgroundColor: statusColor }}
            title={statusLabel}
          />
        </div>

        {/* Name + Role */}
        <h4 className="text-base font-bold vl-text-heading">{agent.title}</h4>
        <div className="flex items-center gap-1.5 mt-1">
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
            style={{ backgroundColor: `${agent.color}88` }}
          >
            <Sparkles className="size-2.5" />
            {agent.role || t(lang, 'agentProfile.role')}
          </span>
          <span className="text-[10px] vl-text-muted">· {statusLabel}</span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { icon: Calendar, value: stats.meetingsJoined, label: t(lang, 'agentProfile.meetingsJoined'), color: '#10b981' },
          { icon: MessageSquare, value: stats.totalMessages, label: t(lang, 'agentProfile.messagesSent'), color: '#06b6d4' },
          { icon: BookOpen, value: stats.avgMessageLength, label: t(lang, 'agentProfile.avgResponseLength'), color: '#8b5cf6' },
        ].map(stat => (
          <div key={stat.label} className="text-center p-2 rounded-lg bg-[var(--vl-bg-inner)] border border-[var(--vl-border-subtle)]">
            <stat.icon className="size-3.5 mx-auto mb-1" style={{ color: stat.color }} />
            <span className="text-sm font-bold vl-text-heading block">{stat.value}</span>
            <span className="text-[9px] vl-text-muted leading-tight block">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Expandable Expertise Tags */}
      <div className="mb-3">
        <button
          onClick={() => setExpertiseExpanded(!expertiseExpanded)}
          className="flex items-center justify-between w-full text-[10px] font-semibold vl-text-muted uppercase tracking-wider hover:text-emerald-400 transition-colors"
        >
          <span className="flex items-center gap-1">
            <Tag className="size-3" />
            {t(lang, 'agentProfile.expertise')}
          </span>
          {expertiseExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
        </button>
        <AnimatePresence>
          {expertiseExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-1.5 mt-2">
                {expertiseTags.map((tag, i) => (
                  <motion.span
                    key={tag}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="px-2 py-0.5 rounded-full text-[10px] border border-[var(--vl-border-subtle)] vl-text-body"
                    style={{ backgroundColor: `${agent.color}10` }}
                  >
                    {tag}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* System Prompt Preview */}
      <div>
        <button
          onClick={() => setSystemPromptExpanded(!systemPromptExpanded)}
          className="flex items-center justify-between w-full text-[10px] font-semibold vl-text-muted uppercase tracking-wider hover:text-emerald-400 transition-colors"
        >
          <span className="flex items-center gap-1">
            <Brain className="size-3" />
            {t(lang, 'agentProfile.systemPrompt')}
          </span>
          {systemPromptExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
        </button>
        <AnimatePresence>
          {systemPromptExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <pre className="mt-2 p-3 rounded-lg bg-[var(--vl-bg-inner)] border border-[var(--vl-border-subtle)] text-[10px] font-mono vl-text-muted whitespace-pre-wrap break-all max-h-48 overflow-y-auto scrollbar-thin custom-scrollbar leading-relaxed">
                {agent.expertise}
                {'\n\n'}
                {agent.goal}
                {'\n\n'}
                {agent.role}
              </pre>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ============================================================
// AgentActivityGraph — Mini activity visualization (pure CSS/SVG)
// ============================================================

export function AgentActivityGraph({ agent, meetings, lang }: { agent: Agent; meetings: Meeting[]; lang: Lang }) {
  const data = useMemo(() => {
    const agentMessages = meetings.flatMap(m =>
      (m.messages?.filter(msg => msg.agentName === agent.title) || [])
    )

    // Build last 7 days bar chart data
    const days: { label: string; count: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dayStr = date.toISOString().slice(0, 10)
      const count = agentMessages.filter(m => m.createdAt.slice(0, 10) === dayStr).length
      const label = date.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { weekday: 'short' })
      days.push({ label, count })
    }

    // Build heatmap (7 days × 4 time slots = 28 cells)
    const heatmap: number[][] = []
    const timeSlots = ['00-06', '06-12', '12-18', '18-24']
    for (let d = 6; d >= 0; d--) {
      const row: number[] = []
      const date = new Date()
      date.setDate(date.getDate() - d)
      const dayStr = date.toISOString().slice(0, 10)
      for (let s = 0; s < 4; s++) {
        const count = agentMessages.filter(m => {
          if (m.createdAt.slice(0, 10) !== dayStr) return false
          const hour = parseInt(m.createdAt.slice(11, 13), 10)
          return hour >= s * 6 && hour < (s + 1) * 6
        }).length
        row.push(count)
      }
      heatmap.push(row)
    }

    const maxCount = Math.max(...days.map(d => d.count), 1)
    const maxHeat = Math.max(...heatmap.flat(), 1)

    return { days, heatmap, maxCount, maxHeat, timeSlots }
  }, [agent, meetings])

  const heatColor = (val: number, max: number): string => {
    if (val === 0) return 'var(--vl-bg-inner)'
    const intensity = val / max
    return `rgba(16, 185, 129, ${0.15 + intensity * 0.75})`
  }

  return (
    <div className="space-y-4">
      {/* Mini Bar Chart */}
      <div>
        <h4 className="text-xs font-semibold vl-text-heading mb-2 flex items-center gap-1.5">
          <BarChart3 className="size-3.5 text-emerald-500" />
          {t(lang, 'agentProfile.activity')} — {t(lang, 'agentProfile.last7Days')}
        </h4>
        <div className="flex items-end gap-1.5 h-24 px-1">
          {data.days.map((day, i) => (
            <TooltipProvider key={day.label} delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end justify-center" style={{ height: 64 }}>
                      <motion.div
                        className="w-full max-w-[28px] rounded-t-md min-h-[2px]"
                        style={{
                          backgroundColor: agent.color,
                        }}
                        initial={{ height: 0 }}
                        animate={{ height: `${(day.count / data.maxCount) * 100}%` }}
                        transition={{ delay: i * 0.08, duration: 0.5, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="text-[8px] vl-text-muted">{day.label}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="tooltip-glass text-[10px]">
                  {day.count} {t(lang, 'common.messages').toLowerCase()}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </div>

      {/* Heatmap */}
      <div className="agent-activity-heatmap">
        <h4 className="text-xs font-semibold vl-text-heading mb-2 flex items-center gap-1.5">
          <Activity className="size-3.5 text-emerald-500" />
          {t(lang, 'agentProfile.heatmap')}
        </h4>
        <div className="space-y-0.5">
          {data.heatmap.map((row, dIdx) => (
            <div key={dIdx} className="flex gap-0.5">
              {row.map((val, sIdx) => (
                <TooltipProvider key={`${dIdx}-${sIdx}`} delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="flex-1 h-5 rounded-sm transition-all duration-200 hover:scale-110 cursor-default"
                        style={{ backgroundColor: heatColor(val, data.maxHeat) }}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="tooltip-glass text-[10px]">
                      {data.timeSlots[sIdx]}: {val} {t(lang, 'common.messages').toLowerCase()}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          ))}
          <div className="flex gap-0.5 mt-1">
            {data.timeSlots.map(slot => (
              <span key={slot} className="flex-1 text-center text-[7px] vl-text-muted">{slot}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// AgentConversationSummary — Extract key phrases & topics
// ============================================================

export function AgentConversationSummary({ agent, meetings, lang }: { agent: Agent; meetings: Meeting[]; lang: Lang }) {
  const summary = useMemo(() => {
    const agentMessages = meetings.flatMap(m =>
      (m.messages?.filter(msg => msg.agentName === agent.title) || [])
    )

    // Extract word frequencies (stop words removed)
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'shall', 'can', 'need', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'about', 'like', 'through', 'after', 'over', 'between', 'out', 'against', 'during', 'without', 'before', 'under', 'around', 'among', 'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both', 'either', 'neither', 'each', 'every', 'all', 'any', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'only', 'own', 'same', 'than', 'too', 'very', 'just', 'because', 'if', 'when', 'where', 'how', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'it', 'its', 'we', 'our', 'they', 'their', 'my', 'your', 'his', 'her', 'i', 'me', 'you', 'he', 'she', 'them', 'us'])
    const wordFreq: Record<string, number> = {}
    agentMessages.forEach(msg => {
      const words = msg.message.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2 && !stopWords.has(w))
      words.forEach(w => { wordFreq[w] = (wordFreq[w] || 0) + 1 })
    })

    const topTopics = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word, count]) => ({ word, count }))

    // Tag cloud (top 15 words)
    const tagCloud = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([word, count]) => ({ word, count, size: 0.7 + (count / (topTopics[0]?.count || 1)) * 0.5 }))

    const avgResponseLength = agentMessages.length > 0
      ? Math.round(agentMessages.reduce((sum, msg) => sum + msg.message.split(/\s+/).length, 0) / agentMessages.length)
      : 0

    return { topTopics, tagCloud, avgResponseLength, totalMessages: agentMessages.length }
  }, [agent, meetings])

  return (
    <div>
      <h4 className="text-xs font-semibold vl-text-heading mb-3 flex items-center gap-1.5">
        <Brain className="size-3.5 text-violet-500" />
        {t(lang, 'agentProfile.topics')}
      </h4>

      {summary.totalMessages === 0 ? (
        <p className="text-[11px] vl-text-muted text-center py-4">{t(lang, 'common.noData')}</p>
      ) : (
        <>
          {/* Top 5 Topics */}
          <div className="mb-3">
            <p className="text-[10px] vl-text-muted mb-1.5">{t(lang, 'agentProfile.top5Topics')}</p>
            <div className="space-y-1">
              {summary.topTopics.map((topic, i) => (
                <div key={topic.word} className="flex items-center gap-2">
                  <span className="text-[9px] w-3 vl-text-muted">{i + 1}</span>
                  <div className="flex-1 h-4 rounded-full bg-[var(--vl-bg-inner)] overflow-hidden">
                    <motion.div
                      className="h-full rounded-full flex items-center px-2"
                      style={{ backgroundColor: `${agent.color}99` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(topic.count / (summary.topTopics[0]?.count || 1)) * 100}%` }}
                      transition={{ delay: i * 0.1, duration: 0.5 }}
                    >
                      <span className="text-[8px] font-medium text-white whitespace-nowrap">{topic.word}</span>
                    </motion.div>
                  </div>
                  <span className="text-[9px] vl-text-muted w-6 text-right">{topic.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tag Cloud */}
          <div className="mb-3">
            <p className="text-[10px] vl-text-muted mb-1.5">{t(lang, 'agentProfile.wordCloud')}</p>
            <div className="flex flex-wrap gap-1.5 items-center justify-center py-2">
              {summary.tagCloud.map((tag, i) => (
                <motion.span
                  key={tag.word}
                  className="inline-block px-2 py-0.5 rounded-full border border-[var(--vl-border-subtle)] vl-text-body transition-colors hover:border-emerald-500/50 tag-cloud-float"
                  style={{
                    fontSize: `${tag.size}rem`,
                    animationDelay: `${i * 0.3}s`,
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  {tag.word}
                </motion.span>
              ))}
            </div>
          </div>

          {/* Avg response length indicator */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--vl-bg-inner)] border border-[var(--vl-border-subtle)]">
            <BookOpen className="size-3 text-violet-400" />
            <span className="text-[10px] vl-text-muted">{t(lang, 'agentProfile.avgWordsPerMsg')}:</span>
            <span className="text-[11px] font-semibold vl-text-heading">{summary.avgResponseLength}</span>
            <span className="text-[9px] vl-text-muted">{t(lang, 'common.words').toLowerCase()}</span>
          </div>
        </>
      )}
    </div>
  )
}

// ============================================================
// AgentRelationshipMap — SVG network graph
// ============================================================

interface RelationshipEdge {
  targetAgent: Agent
  sharedMeetings: number
}

export function AgentRelationshipMap({ agent, allAgents, meetings, lang }: {
  agent: Agent; allAgents: Agent[]; meetings: Meeting[]; lang: Lang
}) {
  const relationships = useMemo(() => {
    const edges: RelationshipEdge[] = []
    allAgents.forEach(otherAgent => {
      if (otherAgent.id === agent.id) return
      const sharedMeetings = meetings.filter(m =>
        m.messages?.some(msg => msg.agentName === agent.title) &&
        m.messages?.some(msg => msg.agentName === otherAgent.title)
      ).length
      if (sharedMeetings > 0) {
        edges.push({ targetAgent: otherAgent, sharedMeetings })
      }
    })
    return edges.sort((a, b) => b.sharedMeetings - a.sharedMeetings)
  }, [agent, allAgents, meetings])

  if (relationships.length === 0) {
    return (
      <div className="agent-relationship-map">
        <h4 className="text-xs font-semibold vl-text-heading mb-2 flex items-center gap-1.5">
          <Network className="size-3.5 text-emerald-500" />
          {t(lang, 'agentProfile.relationships')}
        </h4>
        <p className="text-[11px] vl-text-muted text-center py-4">{t(lang, 'common.noData')}</p>
      </div>
    )
  }

  const maxShared = Math.max(...relationships.map(e => e.sharedMeetings), 1)
  const centerX = 120
  const centerY = 100
  const radius = 70
  const angleStep = (2 * Math.PI) / relationships.length

  return (
    <div className="agent-relationship-map">
      <h4 className="text-xs font-semibold vl-text-heading mb-2 flex items-center gap-1.5">
        <Network className="size-3.5 text-emerald-500" />
        {t(lang, 'agentProfile.relationships')}
      </h4>

      {/* Legend */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[9px] vl-text-muted">{t(lang, 'agentProfile.collaboration')}:</span>
        <div className="flex items-center gap-1">
          {[1, 2, 3].map(level => (
            <div key={level} className="flex items-center gap-0.5">
              <div className="h-[1px] bg-emerald-500" style={{ width: 4 + level * 4, opacity: 0.3 + level * 0.25 }} />
            </div>
          ))}
          <span className="text-[8px] vl-text-muted ml-1">1-3+ {t(lang, 'common.meetings').toLowerCase()}</span>
        </div>
      </div>

      <svg viewBox="0 0 240 200" className="w-full h-auto">
        {/* Connection lines */}
        {relationships.map((edge, i) => {
          const angle = i * angleStep - Math.PI / 2
          const x = centerX + radius * Math.cos(angle)
          const y = centerY + radius * Math.sin(angle)
          const lineWidth = 1 + (edge.sharedMeetings / maxShared) * 4
          const opacity = 0.3 + (edge.sharedMeetings / maxShared) * 0.6
          return (
            <line
              key={edge.targetAgent.id}
              x1={centerX}
              y1={centerY}
              x2={x}
              y2={y}
              stroke="#10b981"
              strokeWidth={lineWidth}
              opacity={opacity}
              className="relationship-line-draw"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          )
        })}

        {/* Center node */}
        <circle cx={centerX} cy={centerY} r={18} fill={agent.color} />
        <text x={centerX} y={centerY + 4} textAnchor="middle" fill="white" fontSize={10} fontWeight="bold">
          {agent.title.charAt(0)}
        </text>

        {/* Outer nodes */}
        {relationships.map((edge, i) => {
          const angle = i * angleStep - Math.PI / 2
          const x = centerX + radius * Math.cos(angle)
          const y = centerY + radius * Math.sin(angle)
          return (
            <g key={edge.targetAgent.id}>
              <circle cx={x} cy={y} r={14} fill={edge.targetAgent.color} opacity={0.9} />
              <text x={x} y={y + 3.5} textAnchor="middle" fill="white" fontSize={8} fontWeight="bold">
                {edge.targetAgent.title.charAt(0)}
              </text>
              <text x={x} y={y + 22} textAnchor="middle" fill="var(--vl-text-muted, #888)" fontSize={7}>
                {edge.targetAgent.title.slice(0, 8)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ============================================================
// AgentSkillsRadar — Pure SVG radar chart (NO recharts)
// ============================================================

interface SkillAxis {
  key: string
  labelKey: string
  value: number // 0-100
}

export function AgentSkillsRadar({ agent, meetings, lang, compareAgent }: {
  agent: Agent; meetings: Meeting[]; lang: Lang; compareAgent?: Agent | null
}) {
  const skills = useMemo((): SkillAxis[] => {
    const agentMessages = meetings.flatMap(m =>
      (m.messages?.filter(msg => msg.agentName === agent.title) || [])
    )
    const totalMessages = agentMessages.length
    const meetingsJoined = meetings.filter(m =>
      m.messages?.some(msg => msg.agentName === agent.title)
    ).length

    // Derive skills from data
    const avgWords = totalMessages > 0
      ? agentMessages.reduce((sum, msg) => sum + msg.message.split(/\s+/).length, 0) / totalMessages
      : 0

    // Expertise: based on expertise field length and specificity
    const expertiseScore = Math.min(30 + agent.expertise.length * 0.8 + (agent.expertise.split(',').length - 1) * 10, 95)

    // Participation: based on meetings joined
    const participationScore = Math.min(meetingsJoined * 15, 95)

    // Creativity: based on unique word count
    const uniqueWords = new Set(agentMessages.flatMap(m => m.message.toLowerCase().split(/[^a-z]+/)))
    const creativityScore = Math.min(20 + uniqueWords.size * 0.5, 95)

    // Consistency: based on message length variance (lower variance = higher consistency)
    const msgLengths = agentMessages.map(m => m.message.length)
    const avgLen = msgLengths.length > 0 ? msgLengths.reduce((a, b) => a + b, 0) / msgLengths.length : 0
    const variance = msgLengths.length > 0 ? msgLengths.reduce((sum, len) => sum + Math.pow(len - avgLen, 2), 0) / msgLengths.length : 0
    const consistencyScore = Math.min(80 + (1 - Math.min(variance / 10000, 1)) * 15, 95)

    // Responsiveness: based on avg response time (heuristic)
    const responsivenessScore = Math.min(40 + Math.min(avgWords, 50) * 1.1, 95)

    // Leadership: based on being team lead
    const leadershipCount = meetings.filter(m => m.teamLead?.id === agent.id).length
    const leadershipScore = Math.min(15 + leadershipCount * 25, 95)

    return [
      { key: 'expertise', labelKey: 'agentProfile.skills.expertise', value: expertiseScore },
      { key: 'participation', labelKey: 'agentProfile.skills.participation', value: participationScore },
      { key: 'creativity', labelKey: 'agentProfile.skills.creativity', value: creativityScore },
      { key: 'consistency', labelKey: 'agentProfile.skills.consistency', value: consistencyScore },
      { key: 'responsiveness', labelKey: 'agentProfile.skills.responsiveness', value: responsivenessScore },
      { key: 'leadership', labelKey: 'agentProfile.skills.leadership', value: leadershipScore },
    ]
  }, [agent, meetings])

  const compareSkills = useMemo((): SkillAxis[] | null => {
    if (!compareAgent) return null
    const agentMessages = meetings.flatMap(m =>
      (m.messages?.filter(msg => msg.agentName === compareAgent.title) || [])
    )
    const totalMessages = agentMessages.length
    const meetingsJoined = meetings.filter(m =>
      m.messages?.some(msg => msg.agentName === compareAgent.title)
    ).length
    const avgWords = totalMessages > 0
      ? agentMessages.reduce((sum, msg) => sum + msg.message.split(/\s+/).length, 0) / totalMessages
      : 0
    const expertiseScore = Math.min(30 + compareAgent.expertise.length * 0.8 + (compareAgent.expertise.split(',').length - 1) * 10, 95)
    const participationScore = Math.min(meetingsJoined * 15, 95)
    const uniqueWords = new Set(agentMessages.flatMap(m => m.message.toLowerCase().split(/[^a-z]+/)))
    const creativityScore = Math.min(20 + uniqueWords.size * 0.5, 95)
    const msgLengths = agentMessages.map(m => m.message.length)
    const avgLen = msgLengths.length > 0 ? msgLengths.reduce((a, b) => a + b, 0) / msgLengths.length : 0
    const variance = msgLengths.length > 0 ? msgLengths.reduce((sum, len) => sum + Math.pow(len - avgLen, 2), 0) / msgLengths.length : 0
    const consistencyScore = Math.min(80 + (1 - Math.min(variance / 10000, 1)) * 15, 95)
    const responsivenessScore = Math.min(40 + Math.min(avgWords, 50) * 1.1, 95)
    const leadershipCount = meetings.filter(m => m.teamLead?.id === compareAgent.id).length
    const leadershipScore = Math.min(15 + leadershipCount * 25, 95)
    return [
      { key: 'expertise', labelKey: 'agentProfile.skills.expertise', value: expertiseScore },
      { key: 'participation', labelKey: 'agentProfile.skills.participation', value: participationScore },
      { key: 'creativity', labelKey: 'agentProfile.skills.creativity', value: creativityScore },
      { key: 'consistency', labelKey: 'agentProfile.skills.consistency', value: consistencyScore },
      { key: 'responsiveness', labelKey: 'agentProfile.skills.responsiveness', value: responsivenessScore },
      { key: 'leadership', labelKey: 'agentProfile.skills.leadership', value: leadershipScore },
    ]
  }, [compareAgent, meetings])

  const n = skills.length
  const cx = 100
  const cy = 100
  const maxR = 70
  const angleStep = (2 * Math.PI) / n

  const getPoint = (index: number, value: number) => {
    const angle = index * angleStep - Math.PI / 2
    const r = (value / 100) * maxR
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  }

  const getPolygon = (skillList: SkillAxis[]) => {
    return skillList.map((s, i) => getPoint(i, s.value))
  }

  return (
    <div className="agent-skill-radar">
      <h4 className="text-xs font-semibold vl-text-heading mb-2 flex items-center gap-1.5">
        <Zap className="size-3.5 text-emerald-500" />
        {t(lang, 'agentProfile.skills.title')}
      </h4>

      <svg viewBox="0 0 200 200" className="w-full h-auto">
        {/* Background rings */}
        {[20, 40, 60, 80, 100].map(level => (
          <polygon
            key={level}
            points={Array.from({ length: n }, (_, i) => {
              const p = getPoint(i, level)
              return `${p.x},${p.y}`
            }).join(' ')}
            fill="none"
            stroke="var(--vl-border-subtle)"
            strokeWidth={0.5}
            opacity={0.5}
          />
        ))}

        {/* Axis lines */}
        {skills.map((_, i) => {
          const p = getPoint(i, 100)
          return (
            <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--vl-border-subtle)" strokeWidth={0.5} opacity={0.3} />
          )
        })}

        {/* Compare agent polygon (if present) */}
        {compareSkills && (
          <motion.polygon
            points={getPolygon(compareSkills).map(p => `${p.x},${p.y}`).join(' ')}
            fill={compareAgent?.color || '#f59e0b'}
            fillOpacity={0.1}
            stroke={compareAgent?.color || '#f59e0b'}
            strokeWidth={1.5}
            strokeDasharray="4 2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          />
        )}

        {/* Main agent polygon */}
        <motion.polygon
          points={getPolygon(skills).map(p => `${p.x},${p.y}`).join(' ')}
          fill={agent.color}
          fillOpacity={0.2}
          stroke={agent.color}
          strokeWidth={2}
          className="skill-radar-fill"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />

        {/* Data points */}
        {skills.map((skill, i) => {
          const p = getPoint(i, skill.value)
          return (
            <g key={skill.key}>
              <circle cx={p.x} cy={p.y} r={3} fill={agent.color} stroke="var(--vl-bg-card)" strokeWidth={1.5} />
              <text
                x={getPoint(i, 110).x}
                y={getPoint(i, 110).y + 3}
                textAnchor="middle"
                fill="var(--vl-text-muted, #888)"
                fontSize={7}
              >
                {t(lang, skill.labelKey)}
              </text>
            </g>
          )
        })}

        {/* Skill values */}
        {skills.map((skill, i) => {
          const p = getPoint(i, skill.value)
          return (
            <text
              key={`val-${skill.key}`}
              x={p.x}
              y={p.y - 7}
              textAnchor="middle"
              fill="white"
              fontSize={7}
              fontWeight="bold"
              opacity={0.8}
            >
              {Math.round(skill.value)}
            </text>
          )
        })}
      </svg>

      {/* Compare legend */}
      {compareAgent && (
        <div className="flex items-center justify-center gap-4 mt-2">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: agent.color }} />
            <span className="text-[9px] vl-text-muted">{agent.title}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: compareAgent.color }} />
            <span className="text-[9px] vl-text-muted">{compareAgent.title}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// AgentProfileEnhancement — Main wrapper with slide-over panel
// ============================================================

export function AgentProfileEnhancement({
  agent,
  meetings,
  allAgents,
  lang,
  open,
  onClose,
  compareAgent,
  onCompareChange,
}: {
  agent: Agent | null
  meetings: Meeting[]
  allAgents: Agent[]
  lang: Lang
  open: boolean
  onClose: () => void
  compareAgent?: Agent | null
  onCompareChange?: (agent: Agent | null) => void
}) {
  const [activeSection, setActiveSection] = useState<'activity' | 'topics' | 'relationships' | 'skills'>('activity')

  if (!agent) return null

  const sections = [
    { key: 'activity' as const, icon: Activity, label: t(lang, 'agentProfile.activity') },
    { key: 'topics' as const, icon: Brain, label: t(lang, 'agentProfile.topics') },
    { key: 'relationships' as const, icon: Network, label: t(lang, 'agentProfile.relationships') },
    { key: 'skills' as const, icon: Zap, label: t(lang, 'agentProfile.skills.title') },
  ]

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Slide-over Panel */}
          <motion.div
            className="fixed top-0 right-0 z-50 w-full sm:w-[420px] h-full overflow-y-auto scrollbar-thin custom-scrollbar"
            style={{
              background: 'var(--vl-bg-card)',
              borderLeft: '1px solid var(--vl-border)',
            }}
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="p-4 space-y-4">
              {/* Profile Card */}
              <AgentProfileCard agent={agent} meetings={meetings} lang={lang} onClose={onClose} />

              {/* Section Tabs */}
              <div className="flex gap-1 border border-[var(--vl-border-subtle)] rounded-lg p-0.5">
                {sections.map(section => (
                  <button
                    key={section.key}
                    onClick={() => setActiveSection(section.key)}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-[10px] font-medium transition-colors ${
                      activeSection === section.key
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'vl-text-muted hover:text-white hover:bg-[var(--vl-bg-inner)]'
                    }`}
                  >
                    <section.icon className="size-3" />
                    <span className="hidden sm:inline">{section.label}</span>
                  </button>
                ))}
              </div>

              {/* Section Content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeSection === 'activity' && (
                    <AgentActivityGraph agent={agent} meetings={meetings} lang={lang} />
                  )}
                  {activeSection === 'topics' && (
                    <AgentConversationSummary agent={agent} meetings={meetings} lang={lang} />
                  )}
                  {activeSection === 'relationships' && (
                    <AgentRelationshipMap agent={agent} allAgents={allAgents} meetings={meetings} lang={lang} />
                  )}
                  {activeSection === 'skills' && (
                    <>
                      <AgentSkillsRadar
                        agent={agent}
                        meetings={meetings}
                        lang={lang}
                        compareAgent={compareAgent}
                      />
                      {/* Compare selector */}
                      <div className="mt-3">
                        <p className="text-[10px] vl-text-muted mb-1">{t(lang, 'agentProfile.compareAgent')}</p>
                        <select
                          value={compareAgent?.id || ''}
                          onChange={(e) => {
                            const found = allAgents.find(a => a.id === e.target.value)
                            onCompareChange?.(found || null)
                          }}
                          className="vl-input h-7 text-xs w-full"
                        >
                          <option value="">{t(lang, 'common.none')}</option>
                          {allAgents.filter(a => a.id !== agent.id).map(a => (
                            <option key={a.id} value={a.id}>{a.title}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
