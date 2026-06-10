'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Bot, CheckCircle2, Clock, MessageSquare, Users,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { Agent, Meeting } from './shared-types'

// ============================================================
// Types
// ============================================================

type AgentStatus = 'available' | 'idle' | 'never'

interface AgentStatusInfo {
  agent: Agent
  status: AgentStatus
  meetingCount: number
  lastActivity: string | null
  relativeTime: string
}

// ============================================================
// Helpers
// ============================================================

function getRelativeTime(iso: string, lang: Lang): string {
  const now = Date.now()
  const ts = new Date(iso).getTime()
  const diffSec = Math.floor((now - ts) / 1000)
  if (diffSec < 60) return t(lang, 'common.justNow')
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}${t(lang, 'common.minutesAgo')}`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}${t(lang, 'common.hoursAgo')}`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay}${t(lang, 'common.daysAgo')}`
}

function computeAgentStatuses(
  agents: Agent[],
  meetings: Meeting[],
  lang: Lang
): AgentStatusInfo[] {
  const now = Date.now()
  const oneDay = 24 * 60 * 60 * 1000
  const sevenDays = 7 * oneDay

  // Count meetings per agent and find last activity
  const agentMeetingMap: Record<string, { count: number; lastTs: number }> = {}

  for (const meeting of meetings) {
    const participants: Agent[] = []
    if (meeting.teamLead) participants.push(meeting.teamLead)
    if (meeting.teamMembers) participants.push(...meeting.teamMembers)
    if (meeting.teamMember) participants.push(meeting.teamMember)

    const meetingTs = new Date(meeting.updatedAt || meeting.createdAt).getTime()

    for (const p of participants) {
      const existing = agentMeetingMap[p.id] || { count: 0, lastTs: 0 }
      agentMeetingMap[p.id] = {
        count: existing.count + 1,
        lastTs: Math.max(existing.lastTs, meetingTs),
      }
    }
  }

  return agents.map(agent => {
    const info = agentMeetingMap[agent.id]
    const meetingCount = info?.count || 0
    const lastTs = info?.lastTs || 0
    const timeSinceLast = now - lastTs

    let status: AgentStatus = 'never'
    let lastActivity: string | null = null

    if (lastTs > 0) {
      status = timeSinceLast <= oneDay ? 'available'
        : timeSinceLast <= sevenDays ? 'idle'
        : 'never'
      lastActivity = new Date(lastTs).toISOString()
    }

    return {
      agent,
      status,
      meetingCount,
      lastActivity,
      relativeTime: lastActivity ? getRelativeTime(lastActivity, lang) : (lang === 'zh' ? '无活动' : 'No activity'),
    }
  })
}

// ============================================================
// Constants
// ============================================================

const STATUS_CONFIG: Record<AgentStatus, {
  label: string
  labelZh: string
  bgColor: string
  textColor: string
  dotColor: string
  pulse: boolean
}> = {
  available: {
    label: 'Available',
    labelZh: '可用',
    bgColor: 'bg-emerald-500/10',
    textColor: 'text-emerald-400',
    dotColor: '#10b981',
    pulse: true,
  },
  idle: {
    label: 'Idle',
    labelZh: '空闲',
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-400',
    dotColor: '#f59e0b',
    pulse: false,
  },
  never: {
    label: 'Never',
    labelZh: '未参与',
    bgColor: 'bg-slate-500/10',
    textColor: 'text-slate-400',
    dotColor: '#64748b',
    pulse: false,
  },
}

// ============================================================
// Sub-components
// ============================================================

function AgentStatusCard({
  info,
  lang,
  index,
  onClick,
}: {
  info: AgentStatusInfo
  lang: Lang
  index: number
  onClick?: (agentId: string) => void
}) {
  const config = STATUS_CONFIG[info.status]
  const initial = info.agent.title.charAt(0).toUpperCase()

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.3,
        delay: index * 0.06,
        ease: [0.23, 1, 0.32, 1],
      }}
      whileHover={{ scale: 1.04, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick?.(info.agent.id)}
      className="vl-inner rounded-lg p-2.5 cursor-pointer transition-all duration-200 hover:shadow-sm group"
      role="button"
      tabIndex={0}
      aria-label={`${info.agent.title} — ${config.label}`}
    >
      {/* Avatar + Status dot */}
      <div className="flex items-center gap-2 mb-2">
        <div className="relative">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
            style={{
              background: `${info.agent.color}18`,
              color: info.agent.color,
            }}
          >
            {initial}
          </div>
          <span
            className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--vl-bg-card)] ${config.pulse ? 'widget-live-dot' : ''}`}
            style={{ backgroundColor: config.dotColor }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold vl-text-heading truncate">
            {info.agent.title}
          </p>
          <p className="text-[9px] vl-text-muted truncate">
            {info.agent.expertise.split(',')[0]?.substring(0, 25) || info.agent.role}
          </p>
        </div>
      </div>

      {/* Status badge + meeting count */}
      <div className="flex items-center justify-between">
        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-md ${config.bgColor} ${config.textColor}`}>
          {lang === 'zh' ? config.labelZh : config.label}
        </span>
        {info.meetingCount > 0 && (
          <div className="flex items-center gap-0.5">
            <MessageSquare className="size-2.5 vl-text-muted" />
            <span className="text-[9px] vl-text-muted">{info.meetingCount}</span>
          </div>
        )}
      </div>

      {/* Last activity */}
      <div className="flex items-center gap-1 mt-1.5">
        <Clock className="size-2.5 vl-text-muted" />
        <span className="text-[8px] vl-text-muted">{info.relativeTime}</span>
      </div>

      {/* Expertise tooltip (visible on hover via group) */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-1.5 pt-1.5 border-t border-[var(--vl-border-subtle)]">
        <p className="text-[8px] vl-text-muted leading-snug line-clamp-2">
          {info.agent.expertise}
        </p>
      </div>
    </motion.div>
  )
}

function SummaryBar({ statuses, lang }: { statuses: AgentStatusInfo[]; lang: Lang }) {
  const available = statuses.filter(s => s.status === 'available').length
  const idle = statuses.filter(s => s.status === 'idle').length
  const never = statuses.filter(s => s.status === 'never').length

  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
        <span className="text-[10px] vl-text-body font-medium">{available}</span>
        <span className="text-[9px] vl-text-muted">{lang === 'zh' ? '可用' : 'available'}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-amber-400" />
        <span className="text-[10px] vl-text-body font-medium">{idle}</span>
        <span className="text-[9px] vl-text-muted">{lang === 'zh' ? '空闲' : 'idle'}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-slate-400" />
        <span className="text-[10px] vl-text-body font-medium">{never}</span>
        <span className="text-[9px] vl-text-muted">{lang === 'zh' ? '未参与' : 'never'}</span>
      </div>
      <div className="flex-1" />
      <Badge
        variant="outline"
        className="text-[9px] bg-[var(--vl-bg-inner)] vl-text-muted border-transparent h-4 px-1.5"
      >
        {statuses.length} {lang === 'zh' ? '总计' : 'total'}
      </Badge>
    </div>
  )
}

function EmptyAgentGrid({ lang }: { lang: Lang }) {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="w-12 h-12 rounded-xl bg-[var(--vl-bg-inner)] flex items-center justify-center mb-3">
          <Bot className="size-5 vl-text-muted" />
        </div>
      </motion.div>
      <p className="text-xs font-medium vl-text-heading">
        {lang === 'zh' ? '暂无智能体' : 'No agents yet'}
      </p>
      <p className="text-[10px] vl-text-muted mt-0.5 text-center max-w-[180px]">
        {lang === 'zh' ? '创建智能体以查看其状态' : 'Create agents to see their status'}
      </p>
    </div>
  )
}

// ============================================================
// Main Component
// ============================================================

export function WidgetAgentStatusGrid({
  lang = 'en',
  agents = [],
  meetings = [],
  onAgentClick,
}: {
  lang?: Lang
  agents?: Agent[]
  meetings?: Meeting[]
  onAgentClick?: (agentId: string) => void
}) {
  const agentStatuses = useMemo(
    () => computeAgentStatuses(agents, meetings, lang),
    [agents, meetings, lang]
  )

  // Sort: available first, then idle, then never
  const sorted = useMemo(() => {
    const order: Record<AgentStatus, number> = { available: 0, idle: 1, never: 2 }
    return [...agentStatuses].sort((a, b) => order[a.status] - order[b.status])
  }, [agentStatuses])

  if (sorted.length === 0) {
    return <EmptyAgentGrid lang={lang} />
  }

  return (
    <div>
      <SummaryBar statuses={sorted} lang={lang} />
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
        {sorted.map((info, idx) => (
          <AgentStatusCard
            key={info.agent.id}
            info={info}
            lang={lang}
            index={idx}
            onClick={onAgentClick}
          />
        ))}
      </div>
    </div>
  )
}
