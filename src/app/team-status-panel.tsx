'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Users, MessageSquare, Calendar, Clock,
  Send, Eye, CalendarPlus, UserCircle,
  Sparkles, Activity, Wifi, WifiOff, Zap,
  ChevronRight, AlertCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { Agent, Meeting } from './shared-components'

// ============================================================
// Types
// ============================================================

type AgentStatus = 'online' | 'busy' | 'offline' | 'in_meeting'

interface AgentPresence {
  agentId: string
  agentTitle: string
  agentColor: string
  agentIcon: string
  status: AgentStatus
  currentActivity: string
  lastActive: string
  currentMeetingId?: string
  currentMeetingName?: string
  statusHistory: { status: AgentStatus; activity: string; timestamp: string }[]
}

interface TeamOverviewStats {
  agentsOnline: number
  agentsTotal: number
  meetingsInProgress: number
  messagesToday: number
}

// ============================================================
// Status Config
// ============================================================

const STATUS_CONFIG: Record<AgentStatus, { dotClass: string; label: string; color: string }> = {
  online: { dotClass: 'status-dot status-dot-online', label: 'Online', color: '#10b981' },
  busy: { dotClass: 'status-dot status-dot-busy', label: 'Busy', color: '#f59e0b' },
  offline: { dotClass: 'status-dot status-dot-offline', label: 'Offline', color: '#6b7280' },
  in_meeting: { dotClass: 'status-dot status-dot-in-meeting', label: 'In Meeting', color: '#06b6d4' },
}

// ============================================================
// Helpers
// ============================================================

function generateSimulatedPresence(agents: Agent[], meetings: Meeting[]): AgentPresence[] {
  const now = Date.now()
  const meetingMap = new Map(meetings.map(m => [m.id, m]))

  return agents.map((agent, idx) => {
    // Simulate status based on deterministic randomness from agent ID
    const hash = agent.id.charCodeAt(0) + agent.id.charCodeAt(1) + idx
    const statuses: AgentStatus[] = ['online', 'busy', 'offline', 'in_meeting']
    const status = statuses[hash % 4]

    // Find if agent is in an active meeting
    const activeMeeting = meetings.find(m =>
      m.status === 'running' && (
        (m.type === 'team' && (m.teamMembers?.some(am => am.id === agent.id) || m.teamLeadId === agent.id)) ||
        (m.type === 'individual' && m.teamMemberId === agent.id)
      )
    )

    const activities: Record<AgentStatus, string[]> = {
      online: ['Reviewing literature', 'Analyzing data', 'Preparing report', 'Writing notes', 'Idle'],
      busy: ['Running analysis', 'Processing pipeline', 'Generating report', 'Compiling results'],
      offline: ['Last seen recently', 'Away'],
      in_meeting: [`In Team Meeting #${Math.floor(idx / 2) + 1}`, `In ${activeMeeting?.saveName || 'meeting'}`],
    }

    const activityList = activities[activeMeeting ? 'in_meeting' : status]
    const activity = activityList[hash % activityList.length]

    // Generate status history (last 5)
    const historyInterval = 30 * 60 * 1000 // 30 min
    const statusHistory: { status: AgentStatus; activity: string; timestamp: string }[] = []
    for (let i = 0; i < 5; i++) {
      const histStatus = statuses[(hash + i) % 4]
      const histActivity = activities[histStatus][(hash + i + 2) % activities[histStatus].length]
      statusHistory.push({
        status: histStatus,
        activity: histActivity,
        timestamp: new Date(now - (i + 1) * historyInterval).toISOString(),
      })
    }

    return {
      agentId: agent.id,
      agentTitle: agent.title,
      agentColor: agent.color,
      agentIcon: agent.icon,
      status: activeMeeting ? 'in_meeting' : status,
      currentActivity: activeMeeting ? `In ${activeMeeting.saveName || 'meeting'}` : activity,
      lastActive: new Date(now - (hash % 120) * 60000).toISOString(),
      currentMeetingId: activeMeeting?.id,
      currentMeetingName: activeMeeting?.saveName,
      statusHistory,
    }
  })
}

function formatLastActive(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

// ============================================================
// Status Indicator Component
// ============================================================

function StatusIndicator({ status, size = 'sm' }: { status: AgentStatus; size?: 'sm' | 'lg' }) {
  const config = STATUS_CONFIG[status]
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`${config.dotClass} ${size === 'lg' ? 'status-dot-lg' : ''}`} />
        </TooltipTrigger>
        <TooltipContent className="vl-inner text-[10px]">{config.label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ============================================================
// Agent Presence Card
// ============================================================

function AgentPresenceCard({ presence, lang }: { presence: AgentPresence; lang: Lang }) {
  const [expanded, setExpanded] = useState(false)
  const config = STATUS_CONFIG[presence.status]

  const handleQuickAction = useCallback((action: string) => {
    toast.info(`${action}: ${presence.agentTitle}`, { duration: 2000 })
  }, [presence.agentTitle])

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: 2 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <div className="team-status-card p-3">
        <div className="flex items-start gap-3">
          {/* Avatar with status */}
          <div className="relative">
            <Avatar className="w-9 h-9 border-2 border-[var(--vl-border)]">
              <AvatarFallback
                className="text-white font-bold text-xs"
                style={{ backgroundColor: presence.agentColor }}
              >
                {presence.agentTitle.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className={`absolute -bottom-0.5 -right-0.5 ${config.dotClass} status-dot-lg`} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold truncate" style={{ color: 'var(--vl-text-white)' }}>
                {presence.agentTitle}
              </span>
              <Badge
                variant="outline"
                className="text-[8px] px-1 py-0 leading-tight"
                style={{
                  borderColor: `${config.color}40`,
                  color: config.color,
                  background: `${config.color}10`,
                }}
              >
                {config.label}
              </Badge>
            </div>
            <p className="text-[10px] vl-text-muted mt-0.5 truncate">{presence.currentActivity}</p>
            <p className="text-[9px] vl-text-muted mt-0.5">
              <Clock className="size-2.5 inline mr-0.5" />
              {formatLastActive(presence.lastActive)}
            </p>

            {/* Current meeting badge */}
            {presence.currentMeetingName && (
              <Badge className="mt-1 text-[8px] px-1.5 py-0 bg-cyan-500/15 text-cyan-400 border-0 rounded-full">
                <Zap className="size-2.5 mr-0.5" />
                {presence.currentMeetingName}
              </Badge>
            )}

            {/* Quick actions */}
            <div className="flex items-center gap-1.5 mt-2">
              <button
                className="quick-action-btn"
                onClick={() => handleQuickAction('Message')}
              >
                <Send className="size-3" />
                Message
              </button>
              <button
                className="quick-action-btn"
                onClick={() => handleQuickAction('View Profile')}
              >
                <Eye className="size-3" />
                Profile
              </button>
              <button
                className="quick-action-btn"
                onClick={() => handleQuickAction('Schedule Meeting')}
              >
                <CalendarPlus className="size-3" />
                Schedule
              </button>
              <button
                className="quick-action-btn"
                onClick={() => setExpanded(!expanded)}
              >
                <ChevronRight className={`size-3 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
                History
              </button>
            </div>
          </div>
        </div>

        {/* Status history (expanded) */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-2 border-t border-[var(--vl-border-subtle)] space-y-2">
                <p className="text-[9px] font-semibold vl-text-muted uppercase tracking-wider">Status History</p>
                {presence.statusHistory.map((item, i) => {
                  const itemConfig = STATUS_CONFIG[item.status]
                  return (
                    <div key={i} className="status-history-item flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`${itemConfig.dotClass}`} style={{ width: '0.375rem', height: '0.375rem' }} />
                        <span className="text-[10px] vl-text-body">{item.activity}</span>
                      </div>
                      <span className="text-[9px] vl-text-muted">{formatLastActive(item.timestamp)}</span>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ============================================================
// Main Component: TeamStatusPanel
// ============================================================

export function TeamStatusPanel({
  lang,
  agents,
  meetings,
}: {
  lang: Lang
  agents: Agent[]
  meetings: Meeting[]
}) {
  const [presenceList, setPresenceList] = useState<AgentPresence[]>([])
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null)

  const refreshPresence = useCallback(() => {
    const presence = generateSimulatedPresence(agents, meetings)
    setPresenceList(presence)
  }, [agents, meetings])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial presence population
    refreshPresence()
    // Auto-refresh every 15s
    refreshTimerRef.current = setInterval(refreshPresence, 15000)
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current)
    }
  }, [refreshPresence])

  const stats = useMemo<TeamOverviewStats>(() => {
    const online = presenceList.filter(p => p.status === 'online').length
    const inMeeting = presenceList.filter(p => p.status === 'in_meeting').length
    const meetingsRunning = meetings.filter(m => m.status === 'running').length
    const messagesToday = meetings.reduce((sum, m) => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return sum + (m.messages || []).filter(msg => new Date(msg.createdAt) >= today).length
    }, 0)
    return {
      agentsOnline: online + inMeeting,
      agentsTotal: agents.length,
      meetingsInProgress: meetingsRunning,
      messagesToday,
    }
  }, [presenceList, agents.length, meetings])

  if (agents.length === 0) {
    return (
      <Card className="vl-card backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="activity-empty-state">
            <Users className="size-10 vl-text-muted mb-3" />
            <p className="text-sm vl-text-body font-medium">No agents yet</p>
            <p className="text-xs vl-text-muted mt-1">Create agents to see their status</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="vl-card backdrop-blur-sm overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 flex items-center justify-center">
              <Wifi className="size-4 text-cyan-400" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold" style={{ color: 'var(--vl-text-white)' }}>
                Team Presence
              </CardTitle>
              <p className="text-[10px] vl-text-muted">
                {stats.agentsOnline}/{stats.agentsTotal} agents active
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] vl-text-muted">
            <span className="status-dot status-dot-online" /> Online
            <span className="status-dot status-dot-busy ml-1" /> Busy
            <span className="status-dot status-dot-offline ml-1" /> Offline
            <span className="status-dot status-dot-in-meeting ml-1" /> In Meeting
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {/* Overview stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="vl-inner rounded-lg p-2.5 text-center border border-[var(--vl-border-subtle)]">
            <div className="flex items-center justify-center gap-1">
              <span className="status-dot status-dot-online" />
              <span className="text-lg font-bold" style={{ color: 'var(--vl-text-white)' }}>{stats.agentsOnline}</span>
            </div>
            <p className="text-[9px] vl-text-muted mt-0.5">Online</p>
          </div>
          <div className="vl-inner rounded-lg p-2.5 text-center border border-[var(--vl-border-subtle)]">
            <div className="flex items-center justify-center gap-1">
              <Zap className="size-3.5 text-cyan-400" />
              <span className="text-lg font-bold" style={{ color: 'var(--vl-text-white)' }}>{stats.meetingsInProgress}</span>
            </div>
            <p className="text-[9px] vl-text-muted mt-0.5">Meetings</p>
          </div>
          <div className="vl-inner rounded-lg p-2.5 text-center border border-[var(--vl-border-subtle)]">
            <div className="flex items-center justify-center gap-1">
              <MessageSquare className="size-3.5 text-emerald-400" />
              <span className="text-lg font-bold" style={{ color: 'var(--vl-text-white)' }}>{stats.messagesToday}</span>
            </div>
            <p className="text-[9px] vl-text-muted mt-0.5">Messages</p>
          </div>
        </div>

        {/* Agent presence cards */}
        <ScrollArea className="max-h-[20rem]">
          <div className="space-y-2 pr-2">
            {presenceList.map(presence => (
              <AgentPresenceCard key={presence.agentId} presence={presence} lang={lang} />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
