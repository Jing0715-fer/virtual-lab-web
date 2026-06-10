'use client'

import React, { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  RadarChart as RechartsRadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar as RechartsRadar, ResponsiveContainer, Legend, Tooltip as RechartsTooltip,
} from 'recharts'
import { GitCompareArrows, MessageSquare, Type, Clock, Users, Zap } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { Agent, Meeting } from './shared-types'
import { renderAgentIcon } from './shared-components'

interface AgentMetrics {
  agent: Agent
  meetingsJoined: number
  messagesSent: number
  avgMessageLength: number
  dimensions: { dimension: string; value: number }[]
  strengths: string[]
  weaknesses: string[]
}

const DIMENSION_LABELS = ['Participation', 'Leadership', 'Technical', 'Collaboration', 'Critical']
const AGENT_COLORS = ['#10b981', '#06b6d4', '#8b5cf6']

function computeAgentMetrics(agent: Agent, meetings: Meeting[]): AgentMetrics {
  const agentMessages = meetings.flatMap(m =>
    (m.messages || []).filter(msg => msg.agentName === agent.title)
  )
  const agentMeetings = meetings.filter(m =>
    m.messages?.some(msg => msg.agentName === agent.title)
  )

  const meetingsJoined = agentMeetings.length
  const messagesSent = agentMessages.length
  const avgMessageLength = messagesSent > 0
    ? Math.round(agentMessages.reduce((sum, msg) => sum + msg.message.length, 0) / messagesSent)
    : 0

  // Compute performance dimensions
  const totalMeetingMsgs = agentMeetings.reduce((sum, m) => sum + (m.messages?.length || 0), 0)
  const participation = totalMeetingMsgs > 0 ? Math.min((messagesSent / totalMeetingMsgs) * 100, 100) : 0

  const firstRoundMsgs = agentMessages.filter(msg => msg.roundIndex === 0).length
  const leadership = messagesSent > 0 ? Math.min((firstRoundMsgs / messagesSent) * 200, 100) : 0

  const technicalDepth = Math.min((avgMessageLength / 300) * 100, 100)
  const collaboration = Math.min((meetingsJoined / 10) * 100, 100)

  const questionMsgs = agentMessages.filter(msg => msg.message.includes('?')).length
  const criticalThinking = messagesSent > 0 ? Math.min((questionMsgs / messagesSent) * 300, 100) : 0

  const dimensions = [
    { dimension: 'Participation', value: Math.round(participation) },
    { dimension: 'Leadership', value: Math.round(leadership) },
    { dimension: 'Technical', value: Math.round(technicalDepth) },
    { dimension: 'Collaboration', value: Math.round(collaboration) },
    { dimension: 'Critical', value: Math.round(criticalThinking) },
  ]

  // Derive strengths/weaknesses from dimensions
  const strengths: string[] = []
  const weaknesses: string[] = []
  dimensions.forEach(d => {
    if (d.value >= 70) strengths.push(d.dimension)
    else if (d.value <= 30) weaknesses.push(d.dimension)
  })

  // Add contextual strengths/weaknesses
  if (avgMessageLength > 200) strengths.push('Detailed Analysis')
  if (avgMessageLength < 50 && messagesSent > 0) weaknesses.push('Concise Output')
  if (meetingsJoined >= 5) strengths.push('Experienced')
  if (meetingsJoined <= 1) weaknesses.push('Limited Exposure')

  return { agent, meetingsJoined, messagesSent, avgMessageLength, dimensions, strengths, weaknesses }
}

function computeCollaborationScore(agents: Agent[], meetings: Meeting[]): number {
  if (agents.length < 2) return 0
  let sharedMeetings = 0
  for (const meeting of meetings) {
    const msgAgents = new Set((meeting.messages || []).map(m => m.agentName).filter(n => n !== 'User'))
    const agentNames = agents.map(a => a.title)
    if (agentNames.every(name => msgAgents.has(name))) {
      sharedMeetings++
    }
  }
  const maxShared = Math.min(meetings.length, 10)
  return maxShared > 0 ? Math.round((sharedMeetings / maxShared) * 100) : 0
}

export function AgentComparisonView({
  agents,
  meetings,
  lang = 'en',
  open,
  onOpenChange,
}: {
  agents: Agent[]
  meetings: Meeting[]
  lang?: Lang
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const metrics = useMemo(
    () => agents.map(a => computeAgentMetrics(a, meetings)),
    [agents, meetings]
  )

  const collaborationScore = useMemo(
    () => computeCollaborationScore(agents, meetings),
    [agents, meetings]
  )

  // Build radar chart data: one entry per dimension, with each agent's value
  const radarData = useMemo(() => {
    return DIMENSION_LABELS.map((label, idx) => {
      const entry: Record<string, string | number> = { dimension: label }
      agents.forEach((a, i) => {
        entry[a.title] = metrics[i]?.dimensions[idx]?.value ?? 0
      })
      return entry
    })
  }, [agents, metrics])

  if (agents.length < 2) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="vl-dialog max-w-5xl max-h-[90vh] overflow-y-auto sm:p-6 custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 vl-text-heading text-lg">
            <GitCompareArrows className="size-5 text-emerald-400" />
            Agent Comparison
          </DialogTitle>
          <DialogDescription className="vl-text-muted">
            Comparing {agents.length} agents across key performance dimensions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Collaboration Score Banner */}
          <div className="vl-inner rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Users className="size-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold vl-text-heading">Collaboration Score</p>
                <p className="text-xs vl-text-muted">How often these agents work together</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-32 rounded-full overflow-hidden" style={{ background: 'var(--vl-border)' }}>
                <motion.div
                  className="h-full rounded-full bg-emerald-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${collaborationScore}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
              <span className="text-sm font-bold vl-text-heading">{collaborationScore}%</span>
            </div>
          </div>

          {/* Agent Cards Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {metrics.map((m, i) => (
              <motion.div
                key={m.agent.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="vl-card rounded-xl p-4 border-l-4 relative overflow-hidden"
                style={{ borderLeftColor: AGENT_COLORS[i % AGENT_COLORS.length] }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: m.agent.color }}
                  >
                    {renderAgentIcon(m.agent.icon, 'size-5 text-white')}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold vl-text-heading truncate">{m.agent.title}</p>
                    <p className="text-xs vl-text-muted truncate">{m.agent.expertise}</p>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="vl-inner rounded-lg p-2 text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      <Users className="size-3 text-emerald-400" />
                    </div>
                    <p className="text-lg font-bold vl-text-heading">{m.meetingsJoined}</p>
                    <p className="text-[9px] vl-text-muted">Meetings</p>
                  </div>
                  <div className="vl-inner rounded-lg p-2 text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      <MessageSquare className="size-3 text-cyan-400" />
                    </div>
                    <p className="text-lg font-bold vl-text-heading">{m.messagesSent}</p>
                    <p className="text-[9px] vl-text-muted">Messages</p>
                  </div>
                  <div className="vl-inner rounded-lg p-2 text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      <Type className="size-3 text-amber-400" />
                    </div>
                    <p className="text-lg font-bold vl-text-heading">{m.avgMessageLength}</p>
                    <p className="text-[9px] vl-text-muted">Avg Len</p>
                  </div>
                </div>

                {/* Strengths / Weaknesses */}
                <div className="space-y-2">
                  {m.strengths.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-emerald-400 mb-1 flex items-center gap-1">
                        <Zap className="size-3" /> Strengths
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {m.strengths.map(s => (
                          <Badge key={s} variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] px-1.5">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {m.weaknesses.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-amber-400 mb-1 flex items-center gap-1">
                        <Clock className="size-3" /> Areas to Grow
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {m.weaknesses.map(w => (
                          <Badge key={w} variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px] px-1.5">
                            {w}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {m.strengths.length === 0 && m.weaknesses.length === 0 && (
                    <p className="text-xs vl-text-muted italic">Not enough data yet</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Radar Chart */}
          <div className="vl-card rounded-xl p-6 radar-animate-in">
            <h3 className="text-sm font-semibold vl-text-heading mb-4 flex items-center gap-2">
              <GitCompareArrows className="size-4 text-emerald-400" />
              Performance Radar — {agents.length} Agents
            </h3>
            <div className="h-[320px] w-full radar-chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsRadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                  <PolarGrid
                    stroke="var(--vl-chart-grid)"
                    strokeDasharray="3 3"
                    className="radar-grid-lines"
                  />
                  <PolarAngleAxis
                    dataKey="dimension"
                    tick={{ fill: 'var(--vl-text-muted)', fontSize: 11 }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fill: 'var(--vl-text-muted)', fontSize: 9 }}
                    axisLine={false}
                    label={{
                      value: 'Score',
                      angle: 90,
                      position: 'insideStart',
                      fill: 'var(--vl-text-muted)',
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  />
                  {agents.map((a, i) => (
                    <RechartsRadar
                      key={a.id}
                      name={a.title}
                      dataKey={a.title}
                      stroke={AGENT_COLORS[i % AGENT_COLORS.length]}
                      fill={AGENT_COLORS[i % AGENT_COLORS.length]}
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                  ))}
                  <Legend
                    wrapperStyle={{ fontSize: 12, color: 'var(--vl-text-muted)' }}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      background: 'var(--vl-bg-card)',
                      border: '1px solid var(--vl-border)',
                      borderRadius: '8px',
                      color: 'var(--vl-text-white)',
                      fontSize: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    }}
                    formatter={(value: number, name: string) => [`${value}`, name]}
                    labelFormatter={(label: string) => {
                      return label
                    }}
                  />
                </RechartsRadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
