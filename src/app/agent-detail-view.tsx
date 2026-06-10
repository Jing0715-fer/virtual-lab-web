'use client'

import React, { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, MessageSquare, Calendar, Crown, Handshake, Clock, ChevronDown, ChevronRight,
  BookOpen, Target, Goal, Settings,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { Agent, Meeting } from './shared-types'
import { renderAgentIcon, statusColor, generateSystemPromptPreview, timeAgo } from './shared-components'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip as RechartsTooltip, Cell,
} from 'recharts'

interface AgentDetailViewProps {
  agent: Agent
  meetings: Meeting[]
  agents: Agent[]
  lang: Lang
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ============================================================
// Helper: compute stats for a given agent
// ============================================================
function useAgentStats(agent: Agent | null, meetings: Meeting[], agents: Agent[]) {
  return useMemo(() => {
    if (!agent) return { agentMeetings: [], meetingsJoined: 0, messagesSent: 0, avgLength: 0, leadershipRoles: 0, collaborationScore: 0, activeDays: 0, participationData: [], collaborationMap: [] }

    // Meetings this agent participated in
    const agentMeetings = meetings.filter(m =>
      (m.messages || []).some(msg => msg.agentName === agent.title)
    )

    // All messages by this agent across all meetings
    const agentMessages = meetings.flatMap(m => (m.messages || [])).filter(msg => msg.agentName === agent.title)

    // Meetings joined
    const meetingsJoined = agentMeetings.length

    // Messages sent
    const messagesSent = agentMessages.length

    // Avg message length (words)
    const avgLength = messagesSent > 0
      ? Math.round(agentMessages.reduce((sum, msg) => sum + msg.message.trim().split(/\s+/).length, 0) / messagesSent)
      : 0

    // Leadership roles (times as team lead)
    const leadershipRoles = meetings.filter(m => m.teamLeadId === agent.id).length

    // Collaboration score (unique co-participants)
    const coParticipants = new Set<string>()
    agentMeetings.forEach(m => {
      if (m.type === 'team' && m.teamMembers) {
        m.teamMembers.forEach(member => {
          if (member.id !== agent.id) coParticipants.add(member.id)
        })
      }
      if (m.type === 'individual' && m.teamMember && m.teamMember.id !== agent.id) {
        coParticipants.add(m.teamMember.id)
      }
      if (m.teamLead && m.teamLead.id !== agent.id) {
        coParticipants.add(m.teamLead.id)
      }
      // Also from messages
      const msgAgents = new Set((m.messages || []).map(msg => msg.agentName).filter(n => n !== agent.title && n !== 'User'))
      msgAgents.forEach(name => {
        const found = agents.find(a => a.title === name)
        if (found) coParticipants.add(found.id)
      })
    })
    const collaborationScore = coParticipants.size

    // Active days (unique meeting dates)
    const activeDays = new Set(
      agentMeetings.map(m => new Date(m.createdAt).toISOString().split('T')[0])
    ).size

    // Participation chart data
    const participationData = agentMeetings.map(m => ({
      name: m.saveName.length > 15 ? m.saveName.substring(0, 15) + '...' : m.saveName,
      messages: (m.messages || []).filter(msg => msg.agentName === agent.title).length,
      color: agent.color,
    }))

    // Collaboration map
    const collaborationMap: { agentId: string; agentName: string; color: string; meetingCount: number }[] = []
    const meetingCounts: Record<string, number> = {}
    agentMeetings.forEach(m => {
      const participantIds: string[] = []
      if (m.type === 'team' && m.teamMembers) {
        m.teamMembers.forEach(member => { if (member.id !== agent.id) participantIds.push(member.id) })
      }
      if (m.type === 'individual' && m.teamMember && m.teamMember.id !== agent.id) {
        participantIds.push(m.teamMember.id)
      }
      if (m.teamLead && m.teamLead.id !== agent.id) {
        participantIds.push(m.teamLead.id)
      }
      const msgAgents = new Set((m.messages || []).map(msg => msg.agentName).filter(n => n !== agent.title && n !== 'User'))
      msgAgents.forEach(name => {
        const found = agents.find(a => a.title === name)
        if (found && !participantIds.includes(found.id)) participantIds.push(found.id)
      })
      participantIds.forEach(pid => {
        meetingCounts[pid] = (meetingCounts[pid] || 0) + 1
      })
    })
    Object.entries(meetingCounts).forEach(([agentId, meetingCount]) => {
      const found = agents.find(a => a.id === agentId)
      if (found) {
        collaborationMap.push({
          agentId: found.id,
          agentName: found.title,
          color: found.color,
          meetingCount,
        })
      }
    })
    collaborationMap.sort((a, b) => b.meetingCount - a.meetingCount)

    return {
      agentMeetings,
      meetingsJoined,
      messagesSent,
      avgLength,
      leadershipRoles,
      collaborationScore,
      activeDays,
      participationData,
      collaborationMap,
    }
  }, [agent, meetings, agents])
}

// ============================================================
// Stats Grid (2x3)
// ============================================================
function StatsGrid({ stats, lang }: { stats: ReturnType<typeof useAgentStats>; lang: Lang }) {
  const items = [
    { icon: Users, label: t(lang, 'agentDetail.stats.meetingsJoined'), value: stats.meetingsJoined, color: '#10b981' },
    { icon: MessageSquare, label: t(lang, 'agentDetail.stats.messagesSent'), value: stats.messagesSent, color: '#3b82f6' },
    { icon: BookOpen, label: t(lang, 'agentDetail.stats.avgLength'), value: stats.avgLength, color: '#f59e0b', suffix: ' ' + t(lang, 'common.words') },
    { icon: Crown, label: t(lang, 'agentDetail.stats.leadership'), value: stats.leadershipRoles, color: '#8b5cf6' },
    { icon: Handshake, label: t(lang, 'agentDetail.stats.collaboration'), value: stats.collaborationScore, color: '#06b6d4' },
    { icon: Calendar, label: t(lang, 'agentDetail.stats.activeDays'), value: stats.activeDays, color: '#ec4899' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="vl-inner rounded-xl p-3 border border-[var(--vl-border-subtle)] flex items-center gap-3"
        >
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${item.color}20` }}
          >
            <item.icon className="size-5" style={{ color: item.color }} />
          </div>
          <div>
            <p className="text-xl font-bold" style={{ color: 'var(--vl-text-white)' }}>{item.value}{item.suffix || ''}</p>
            <p className="text-[11px] vl-text-muted">{item.label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// Participation Chart
// ============================================================
function ParticipationChart({ data, agentColor }: { data: { name: string; messages: number; color: string }[]; agentColor: string }) {
  if (data.length === 0) return null

  return (
    <div className="w-full h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--vl-border)" />
          <XAxis
            dataKey="name"
            tick={{ fill: 'var(--vl-text-muted)', fontSize: 10 }}
            angle={-30}
            textAnchor="end"
            height={50}
          />
          <YAxis tick={{ fill: 'var(--vl-text-muted)', fontSize: 11 }} />
          <RechartsTooltip
            contentStyle={{
              backgroundColor: 'var(--vl-bg-card)',
              border: '1px solid var(--vl-border)',
              borderRadius: '8px',
              fontSize: '12px',
              color: 'var(--vl-text-white)',
            }}
          />
          <Bar dataKey="messages" radius={[4, 4, 0, 0]}>
            {data.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={agentColor} fillOpacity={0.7 + (index / data.length) * 0.3} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ============================================================
// Meeting History List
// ============================================================
function MeetingHistory({ agentMeetings, lang }: { agentMeetings: Meeting[]; lang: Lang }) {
  if (agentMeetings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Calendar className="size-10 vl-text-muted mb-2" />
        <p className="text-sm vl-text-muted">{t(lang, 'common.noData')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 max-h-[300px] overflow-y-auto">
      {agentMeetings
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .map(meeting => (
          <div
            key={meeting.id}
            className="vl-inner rounded-lg p-3 border border-[var(--vl-border-subtle)] flex items-center justify-between cursor-pointer hover-row-glow click-ripple transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${meeting.type === 'team' ? 'bg-emerald-500/20' : 'bg-cyan-500/20'}`}>
                <Users className={`size-4 ${meeting.type === 'team' ? 'text-emerald-400' : 'text-cyan-400'}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate vl-text-body">{meeting.saveName}</p>
                <div className="flex items-center gap-2 text-[10px] vl-text-muted">
                  <span>{timeAgo(meeting.createdAt)}</span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="size-2.5" />
                    {(meeting.messages || []).filter(m => m.agentName === 'User' || true).length}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className={`${statusColor(meeting.status)} text-[10px] px-1.5`}>
                {meeting.status}
              </Badge>
            </div>
          </div>
        ))}
    </div>
  )
}

// ============================================================
// Collaboration Map
// ============================================================
function CollaborationMap({ collaborationMap }: { collaborationMap: { agentName: string; color: string; meetingCount: number }[] }) {
  if (collaborationMap.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6">
        <Handshake className="size-10 vl-text-muted mb-2" />
        <p className="text-sm vl-text-muted">No collaboration data</p>
      </div>
    )
  }

  const maxCount = Math.max(...collaborationMap.map(c => c.meetingCount), 1)

  return (
    <div className="space-y-2">
      {collaborationMap.map(collab => (
        <div key={collab.agentName} className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold"
            style={{ backgroundColor: collab.color }}
          >
            {collab.agentName.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-sm font-medium vl-text-body truncate">{collab.agentName}</span>
              <span className="text-[11px] vl-text-muted">{collab.meetingCount}</span>
            </div>
            <div className="h-1.5 bg-[var(--vl-bg-inner)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(collab.meetingCount / maxCount) * 100}%`,
                  backgroundColor: collab.color,
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// Main Component
// ============================================================
export function AgentDetailView({ agent, meetings, agents, lang, open, onOpenChange }: AgentDetailViewProps) {
  const stats = useAgentStats(agent, meetings, agents)
  const [configOpen, setConfigOpen] = useState(false)

  const systemPrompt = agent ? generateSystemPromptPreview(agent) : ''

  if (!agent) return null

  return (
    <Dialog open={open && !!agent} onOpenChange={onOpenChange}>
      <DialogContent className="vl-dialog max-w-3xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>{t(lang, 'agentDetail.title')}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start gap-5">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center shrink-0 shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${agent.color}, ${agent.color}88)`,
                  boxShadow: `0 0 30px ${agent.color}33, 0 0 60px ${agent.color}15`,
                }}
              >
                {renderAgentIcon(agent.icon, 'size-8 text-white')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-2xl font-bold vl-text-heading">{agent.title}</h2>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-2 py-0.5"
                    style={{ borderColor: agent.color + '66', color: agent.color }}
                  >
                    {agent.role.length > 20 ? agent.role.substring(0, 20) + '...' : agent.role}
                  </Badge>
                </div>
                <p className="text-sm vl-text-body line-clamp-2">{agent.expertise}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: agent.color }} />
                  <span className="text-xs vl-text-muted">{agent.model}</span>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <StatsGrid stats={stats} lang={lang} />

            {/* Participation Chart */}
            {stats.participationData.length > 0 && (
              <div className="vl-inner rounded-xl border border-[var(--vl-border-subtle)] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart className="size-4 text-violet-400" />
                  <h3 className="text-sm font-semibold vl-text-heading">{t(lang, 'agentDetail.participationChart')}</h3>
                </div>
                <ParticipationChart data={stats.participationData} agentColor={agent.color} />
              </div>
            )}

            {/* Meeting History */}
            <div className="vl-inner rounded-xl border border-[var(--vl-border-subtle)] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="size-4 text-emerald-400" />
                <h3 className="text-sm font-semibold vl-text-heading">{t(lang, 'agentDetail.meetingHistory')}</h3>
                <Badge variant="outline" className="text-[10px] ml-auto">{stats.meetingsJoined}</Badge>
              </div>
              <MeetingHistory agentMeetings={stats.agentMeetings} lang={lang} />
            </div>

            {/* Collaboration Map */}
            <div className="vl-inner rounded-xl border border-[var(--vl-border-subtle)] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Handshake className="size-4 text-cyan-400" />
                <h3 className="text-sm font-semibold vl-text-heading">{t(lang, 'agentDetail.collaborationMap')}</h3>
                <Badge variant="outline" className="text-[10px] ml-auto">{stats.collaborationScore}</Badge>
              </div>
              <CollaborationMap collaborationMap={stats.collaborationMap} />
            </div>

            {/* Config (collapsible) */}
            <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 vl-inner rounded-xl border border-[var(--vl-border-subtle)] hover:border-[var(--vl-border)] transition-colors cursor-pointer">
                <Settings className="size-4 text-amber-400" />
                <h3 className="text-sm font-semibold vl-text-heading flex-1 text-left">{t(lang, 'agentDetail.config')}</h3>
                {configOpen ? <ChevronDown className="size-4 vl-text-muted" /> : <ChevronRight className="size-4 vl-text-muted" />}
              </CollapsibleTrigger>
              <AnimatePresence>
                {configOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 p-4 vl-inner rounded-xl border border-[var(--vl-border-subtle)] space-y-3">
                      <div className="flex items-start gap-2">
                        <BookOpen className="size-3.5 vl-text-muted mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[11px] font-medium vl-text-muted uppercase tracking-wide">System Prompt</p>
                          <pre className="text-xs vl-text-body mt-1 whitespace-pre-wrap max-h-[150px] overflow-y-auto leading-relaxed">
                            {systemPrompt}
                          </pre>
                        </div>
                      </div>
                      <div className="border-t border-[var(--vl-border-subtle)] pt-3 space-y-2">
                        <div className="flex items-start gap-2">
                          <Target className="size-3.5 vl-text-muted mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[11px] font-medium vl-text-muted uppercase tracking-wide">Goal</p>
                            <p className="text-sm vl-text-body mt-0.5">{agent.goal}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Goal className="size-3.5 vl-text-muted mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[11px] font-medium vl-text-muted uppercase tracking-wide">Role</p>
                            <p className="text-sm vl-text-body mt-0.5">{agent.role}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Settings className="size-3.5 vl-text-muted mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[11px] font-medium vl-text-muted uppercase tracking-wide">Model</p>
                            <p className="text-sm vl-text-body mt-0.5">{agent.model}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Collapsible>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
