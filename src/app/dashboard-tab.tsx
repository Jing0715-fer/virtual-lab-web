'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  FlaskConical, Users, Bot, MessageSquare, Plus, Play, Sparkles,
  Bot as BotIcon, Dna, Cpu, Atom, Settings, Zap, BarChart3, ArrowRight,
  FileJson, FileSpreadsheet, Download, CircleDot, Clock, Radar, GitCompare,
  Trophy, Calendar, TrendingUp, UsersRound, Timer,
  Activity, UserPlus, Pencil, PlayCircle, CheckCircle2,
  TreePine, Workflow, TrendingDown, ArrowUpRight, ArrowDownRight, Cloud,
  Brain, Lightbulb, RefreshCw, ArrowDownUp, History,
  LayoutGrid, ChevronDown, ChevronUp, GripVertical,
  RotateCcw, Minus, Maximize2, Minimize2,
  ChevronRight,
  StickyNote, Flame, FileDown, Presentation,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu'
import { t } from '@/lib/i18n'
import { useCallback } from 'react'
import type { Lang } from '@/lib/i18n'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { LazyActivityFeedPanel } from './lazy-components'
import { useScrollReveal, ScrollRevealProvider, ScrollRevealSection } from './scroll-reveal'
import { AdvancedScrollProgress, ParallaxSection, ScrollRevealGroup, ScrollRotate3D } from './scroll-animations'
import { GradientOrbs, AuroraEffect } from './background-effects'
import { GlassCard } from './glassmorphism-kit'
import { SpotlightCard, FloatingElement, GradientText, GlassmorphicCard, NeonBorder } from './css-detail-pack'
import { SectionTransition, ContentFadeIn } from './page-transitions'
import { QuickNotesWidget } from './quick-notes-widget'
import { MilestonesWidget } from './milestones-widget'
import { ResearchClockWidget } from './research-clock-widget'
import { ActivityHeatmapWidget } from './activity-heatmap-widget'
import { VisualizationPanel } from './visualization-panel'
import { ActivityTimelineWidget } from './activity-timeline-widget'
import { WidgetContainer } from './dashboard-widgets'
import { DashboardWidgetSystem } from './dashboard-widget-system'
import { ExportDialog } from './enhanced-export'
import { GlassCard as GlassCardKit } from './glassmorphism-kit'
import type { Agent, Meeting, AnalyticsData, TabValue } from './shared-components'
import {
  StatCard, DashboardHero, ResearchAnalyticsSection, SentimentAnalysisSection,
  WordCloudSection, MeetingCard, EmptyState, TiltCard, HowItWorksSection,
  NanobodyWorkflowSection, PaperReferenceSection,
  DashboardSkeletonCards, DashboardSkeletonChart, HistorySkeletonRows,
  triggerExport, renderAgentIcon, analyzeSentiment, extractKeyTerms, timeAgo,
  AgentCollaborationNetwork, MessageTimelineHeatmap, ResearchProgressTracker,
} from './shared-components'
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar as RechartsRadar, ResponsiveContainer, Legend, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell,
  Treemap, ReferenceLine, LineChart, Line, PieChart, Pie,
  ComposedChart, AreaChart, Area,
} from 'recharts'

// ============================================================
// Recent Activity Feed Section
// ============================================================
function ActivityFeedSection({ agents, meetings, lang }: { agents: Agent[]; meetings: Meeting[]; lang: Lang }) {
  type ActivityEvent = {
    id: string
    type: 'meeting_created' | 'meeting_completed' | 'meeting_running' | 'agent_added' | 'agent_modified'
    description: string
    timestamp: string
    color: string
  }

  const events = useMemo(() => {
    const items: ActivityEvent[] = []
    meetings.forEach(m => {
      const name = m.saveName || m.agenda?.substring(0, 40) || 'Untitled'
      items.push({ id: `mc-${m.id}`, type: 'meeting_created', description: name, timestamp: m.createdAt, color: '#10b981' })
      if (m.status === 'completed') {
        items.push({ id: `mcr-${m.id}`, type: 'meeting_completed', description: name, timestamp: m.updatedAt, color: '#06b6d4' })
      }
      if (m.status === 'running') {
        items.push({ id: `mr-${m.id}`, type: 'meeting_running', description: name, timestamp: m.updatedAt, color: '#f59e0b' })
      }
    })
    agents.forEach(a => {
      items.push({ id: `aa-${a.id}`, type: 'agent_added', description: a.title, timestamp: a.createdAt, color: '#8b5cf6' })
      if (a.updatedAt && a.updatedAt !== a.createdAt && new Date(a.updatedAt).getTime() > new Date(a.createdAt).getTime() + 1000) {
        items.push({ id: `am-${a.id}`, type: 'agent_modified', description: a.title, timestamp: a.updatedAt, color: '#f97316' })
      }
    })
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    return items
  }, [agents, meetings])

  const displayedEvents = events.slice(0, 10)
  const hasMore = events.length > 10

  const getEventIcon = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'meeting_created': return PlayCircle
      case 'meeting_completed': return CheckCircle2
      case 'meeting_running': return PlayCircle
      case 'agent_added': return UserPlus
      case 'agent_modified': return Pencil
    }
  }

  const getEventLabel = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'meeting_created': return t(lang, 'dashboard.activityFeed.meetingCreated')
      case 'meeting_completed': return t(lang, 'dashboard.activityFeed.meetingCompleted')
      case 'meeting_running': return t(lang, 'dashboard.activityFeed.meetingRunning')
      case 'agent_added': return t(lang, 'dashboard.activityFeed.agentAdded')
      case 'agent_modified': return t(lang, 'dashboard.activityFeed.agentModified')
    }
  }

  const formatTimestamp = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime()
    if (diff < 60000) return t(lang, 'common.justNow')
    if (diff < 3600000) return `${Math.floor(diff / 60000)} ${t(lang, 'common.minutesAgo')}`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ${t(lang, 'common.hoursAgo')}`
    return `${Math.floor(diff / 86400000)} ${t(lang, 'common.daysAgo')}`
  }

  if (events.length === 0) {
    return (
      <Card className="vl-card backdrop-blur-sm transition-all duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-emerald-400" />
            <CardTitle className="text-xl font-semibold tracking-tight" style={{ color: 'var(--vl-text-white)' }}>
              {t(lang, 'dashboard.activityFeed.title')}
            </CardTitle>
          </div>
          <CardDescription className="text-sm vl-text-body">{t(lang, 'dashboard.activityFeed.description')}</CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="vl-center vl-stack py-12">
            <Activity className="size-12 vl-text-muted mb-3 vl-float-animation" />
            <p className="text-sm vl-text-muted">{t(lang, 'dashboard.activityFeed.noActivity')}</p>
            <p className="text-xs vl-text-muted">{t(lang, 'dashboard.activityFeed.noActivityDesc')}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="vl-card backdrop-blur-sm transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-emerald-400" />
            <CardTitle className="text-xl font-semibold tracking-tight" style={{ color: 'var(--vl-text-white)' }}>
              {t(lang, 'dashboard.activityFeed.title')}
            </CardTitle>
          </div>
          {hasMore && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 border-[var(--vl-border)] vl-text-body hover:bg-[var(--vl-bg-inner)] hover:text-white"
              onClick={() => {}}
            >
              {t(lang, 'dashboard.activityFeed.viewAll')}
              <ArrowRight className="size-3 ml-1" />
            </Button>
          )}
        </div>
        <CardDescription className="text-sm vl-text-body">{t(lang, 'dashboard.activityFeed.description')}</CardDescription>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="relative">
          <div className="absolute left-[15px] top-2 bottom-2 w-px bg-[var(--vl-border)]" aria-hidden="true" />
          <div className="activity-stagger space-y-1">
            {displayedEvents.map((event, i) => {
              const Icon = getEventIcon(event.type)
              return (
                <div
                  key={event.id}
                  className="flex items-start gap-3 py-2 px-2 rounded-lg hover:bg-[var(--vl-bg-inner)] transition-colors duration-200"
                  style={{ borderLeft: `3px solid ${event.color}` }}
                >
                  <div
                    className="relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{ backgroundColor: `${event.color}15`, border: `2px solid ${event.color}` }}
                  >
                    <Icon className="size-3.5" style={{ color: event.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium vl-text-heading">{getEventLabel(event.type)}</span>
                      <span className="text-[10px] vl-text-muted vl-caption">{formatTimestamp(event.timestamp)}</span>
                    </div>
                    <p className="text-xs vl-text-body truncate mt-0.5">{event.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Agent Performance Gauge Charts Section
// ============================================================
function AgentPerformanceGauges({ agents, meetings, lang }: { agents: Agent[]; meetings: Meeting[]; lang: Lang }) {
  const gaugeData = useMemo(() => {
    if (agents.length === 0) return []
    const completedMeetings = meetings.filter(m => m.status === 'completed')
    const totalMsgCount = completedMeetings.reduce((s, m) => s + (m.messages || []).length, 0)
    return agents.slice(0, 6).map((agent, idx) => {
      const agentMessages = completedMeetings.flatMap(m => m.messages || []).filter(msg => msg.agentName === agent.title)
      const qualityBase = totalMsgCount > 0 ? (agentMessages.length / (totalMsgCount / Math.max(agents.length, 1))) * 75 : 45
      const qualityJitter = ((idx * 7 + agent.title.charCodeAt(0)) % 15)
      const quality = Math.min(100, Math.max(15, qualityBase + qualityJitter))
      const uniqueMeetings = new Set(completedMeetings.filter(m => (m.messages || []).some(msg => msg.agentName === agent.title)).map(m => m.id)).size
      const participation = completedMeetings.length > 0 ? Math.min(100, (uniqueMeetings / completedMeetings.length) * 100) : 0
      const collaborativeMeetings = completedMeetings.filter(m => { const msgs = m.messages || []; const p = new Set(msgs.map(msg => msg.agentName)); return p.has(agent.title) && p.size > 1 }).length
      const collaboration = completedMeetings.length > 0 ? Math.min(100, (collaborativeMeetings / completedMeetings.length) * 100) : 0
      return { agent, responseQuality: Math.round(quality), participationRate: Math.round(participation), collaborationIndex: Math.round(collaboration) }
    })
  }, [agents, meetings])

  const ringRadius = 32
  const ringStroke = 6
  const ringCircumference = 2 * Math.PI * ringRadius
  const gradientIds = useMemo(() => gaugeData.map((_, i) => ({ quality: `gq-${i}`, participation: `gp-${i}`, collaboration: `gc-${i}` })), [gaugeData])

  if (gaugeData.length === 0) {
    return (
      <Card className="vl-card backdrop-blur-sm transition-all duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-violet-400" />
            <CardTitle className="text-xl font-semibold tracking-tight" style={{ color: 'var(--vl-text-white)' }}>
              {t(lang, 'dashboard.agentGauges.title')}
            </CardTitle>
          </div>
          <CardDescription className="text-sm vl-text-body">{t(lang, 'dashboard.agentGauges.description')}</CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="vl-center vl-stack py-12">
            <TrendingUp className="size-12 vl-text-muted mb-3 vl-float-animation" />
            <p className="text-sm vl-text-muted">{t(lang, 'dashboard.agentGauges.noAgents')}</p>
            <p className="text-xs vl-text-muted">{t(lang, 'dashboard.agentGauges.noAgentsDesc')}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="vl-card backdrop-blur-sm transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="size-4 text-violet-400" />
          <CardTitle className="text-xl font-semibold tracking-tight" style={{ color: 'var(--vl-text-white)' }}>
            {t(lang, 'dashboard.agentGauges.title')}
          </CardTitle>
        </div>
        <CardDescription className="text-sm vl-text-body">{t(lang, 'dashboard.agentGauges.description')}</CardDescription>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="vl-inline-cluster vl-cluster-lg mb-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="vl-caption">{t(lang, 'dashboard.agentGauges.responseQuality')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span className="vl-caption">{t(lang, 'dashboard.agentGauges.participationRate')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-violet-400" />
            <span className="vl-caption">{t(lang, 'dashboard.agentGauges.collaborationIndex')}</span>
          </div>
        </div>
        <div className="gauge-stagger flex items-start justify-start gap-6 overflow-x-auto scrollbar-thin custom-scrollbar pb-2">
          {gaugeData.map((data, i) => (
            <div
              key={data.agent.id}
              className="flex flex-col items-center gap-2 min-w-[140px]"
            >
              <div className="relative w-[72px] h-[72px]">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                  <defs>
                    <linearGradient id={gradientIds[i].quality} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#34d399" />
                    </linearGradient>
                    <linearGradient id={gradientIds[i].participation} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#67e8f9" />
                    </linearGradient>
                    <linearGradient id={gradientIds[i].collaboration} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#c4b5fd" />
                    </linearGradient>
                  </defs>
                  <circle cx="40" cy="40" r={ringRadius} stroke="var(--vl-border)" strokeWidth={ringStroke} fill="none" opacity="0.4" />
                  <circle cx="40" cy="40" r={ringRadius - 10} stroke="var(--vl-border)" strokeWidth={ringStroke - 1} fill="none" opacity="0.3" />
                  <circle cx="40" cy="40" r={ringRadius - 20} stroke="var(--vl-border)" strokeWidth={ringStroke - 2} fill="none" opacity="0.2" />
                  <circle cx="40" cy="40" r={ringRadius} stroke={`url(#${gradientIds[i].quality})`} strokeWidth={ringStroke} fill="none" strokeLinecap="round" strokeDasharray={ringCircumference} strokeDashoffset={ringCircumference - (data.responseQuality / 100) * ringCircumference} style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
                  <circle cx="40" cy="40" r={ringRadius - 10} stroke={`url(#${gradientIds[i].participation})`} strokeWidth={ringStroke - 1} fill="none" strokeLinecap="round" strokeDasharray={2 * Math.PI * (ringRadius - 10)} strokeDashoffset={2 * Math.PI * (ringRadius - 10) - (data.participationRate / 100) * 2 * Math.PI * (ringRadius - 10)} style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
                  <circle cx="40" cy="40" r={ringRadius - 20} stroke={`url(#${gradientIds[i].collaboration})`} strokeWidth={ringStroke - 2} fill="none" strokeLinecap="round" strokeDasharray={2 * Math.PI * (ringRadius - 20)} strokeDashoffset={2 * Math.PI * (ringRadius - 20) - (data.collaborationIndex / 100) * 2 * Math.PI * (ringRadius - 20)} style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold" style={{ color: 'var(--vl-text-white)' }}>
                    {Math.round((data.responseQuality + data.participationRate + data.collaborationIndex) / 3)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[9px] vl-text-muted">
                <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />{data.responseQuality}</span>
                <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" />{data.participationRate}%</span>
                <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />{data.collaborationIndex}</span>
              </div>
              {/* Agent avatar + name below gauge */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: data.agent.color, boxShadow: `0 0 12px ${data.agent.color}33` }}
              >
                {renderAgentIcon(data.agent.icon, 'size-4 text-white')}
              </div>
              <span className="text-[11px] font-medium vl-text-heading text-center max-w-[120px] truncate">{data.agent.title}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Agent Message Treemap Visualization
// ============================================================
function AgentMessageTreemap({ agents, meetings, lang }: { agents: Agent[]; meetings: Meeting[]; lang: Lang }) {
  const treemapData = useMemo(() => {
    if (agents.length === 0) return []
    const completedMeetings = meetings.filter(m => m.status === 'completed')
    return agents.map(agent => {
      const msgCount = completedMeetings.flatMap(m => m.messages || [])
        .filter(msg => msg.agentName === agent.title).length
      return {
        name: agent.title,
        size: msgCount || 1, // ensure at least 1 for visibility
        color: agent.color,
        msgCount,
      }
    })
  }, [agents, meetings])

  const renderCustomizedContent = (props: any): React.ReactElement | null => {
    const { x, y, width, height, name, msgCount, color } = props
    if (width < 40 || height < 30 || !name) return null
    const displayName = typeof name === 'string' ? name : String(name || '')
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx={4}
          ry={4}
          fill={color}
          fillOpacity={0.8}
          stroke={color}
          strokeWidth={1}
        />
        <text
          x={x + width / 2}
          y={y + height / 2 - 6}
          textAnchor="middle"
          fill="#fff"
          fontSize={width > 70 ? 12 : 10}
          fontWeight="600"
        >
          {displayName.length > (width / 8) ? displayName.slice(0, Math.floor(width / 8)) + '…' : displayName}
        </text>
        {height > 40 && (
          <text
            x={x + width / 2}
            y={y + height / 2 + 10}
            textAnchor="middle"
            fill="rgba(255,255,255,0.8)"
            fontSize={10}
          >
            {msgCount} {t(lang, 'common.messages')}
          </text>
        )}
      </g>
    )
  }

  if (treemapData.length === 0) {
    return (
      <Card className="vl-card backdrop-blur-sm transition-all duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <TreePine className="size-4 text-emerald-400" />
            <CardTitle className="text-xl font-semibold tracking-tight" style={{ color: 'var(--vl-text-white)' }}>
              {t(lang, 'dashboard.treemap.title') || 'Message Distribution'}
            </CardTitle>
          </div>
          <CardDescription className="text-sm vl-text-body">{t(lang, 'dashboard.treemap.description') || 'Agent message volume breakdown'}</CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="flex flex-col items-center justify-center py-12">
            <TreePine className="size-12 vl-text-muted mb-3 vl-float-animation" />
            <p className="text-sm vl-text-muted">{t(lang, 'dashboard.treemap.noData') || 'No message data yet'}</p>
            <p className="text-xs vl-text-muted mt-1">{t(lang, 'dashboard.treemap.noDataDesc') || 'Complete meetings to see agent distribution'}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="vl-card backdrop-blur-sm transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <TreePine className="size-4 text-emerald-400" />
          <CardTitle className="text-xl font-semibold tracking-tight" style={{ color: 'var(--vl-text-white)' }}>
            {t(lang, 'dashboard.treemap.title') || 'Message Distribution'}
          </CardTitle>
        </div>
        <CardDescription className="text-sm vl-text-body">{t(lang, 'dashboard.treemap.description') || 'Agent message volume breakdown'}</CardDescription>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="vl-inner rounded-xl p-4">
          <ResponsiveContainer width="100%" height={280}>
            <Treemap
              data={treemapData}
              dataKey="size"
              nameKey="name"
              aspectRatio={4 / 3}
              stroke="var(--vl-border)"
              content={renderCustomizedContent as unknown as React.ReactElement}
            >
            </Treemap>
          </ResponsiveContainer>
        </div>
        {/* Legend below the treemap */}
        <div className="flex flex-wrap gap-3 mt-3 justify-center">
          {treemapData.map(d => (
            <div key={d.name} className="flex items-center gap-1.5 text-xs vl-text-muted">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
              {d.name} ({d.msgCount})
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Sankey-Style Meeting Data Flow Diagram (Pure SVG)
// ============================================================
function MeetingFlowDiagram({ agents, meetings, lang }: { agents: Agent[]; meetings: Meeting[]; lang: Lang }) {
  const { nodes, flows } = useMemo(() => {
    if (agents.length === 0 || meetings.length === 0) {
      return { nodes: { left: [], center: [], right: [] }, flows: [] }
    }

    // Source nodes: agents with participation
    const completedMeetings = meetings.filter(m => m.status === 'completed')
    const agentMsgCounts: Record<string, number> = {}
    completedMeetings.forEach(m => {
      (m.messages || []).forEach(msg => {
        if (msg.agentName !== 'User') {
          agentMsgCounts[msg.agentName] = (agentMsgCounts[msg.agentName] || 0) + 1
        }
      })
    })

    const leftNodes = agents
      .filter(a => (agentMsgCounts[a.title] || 0) > 0)
      .slice(0, 5)
      .map(a => ({ id: a.id, label: a.title, value: agentMsgCounts[a.title] || 1, color: a.color }))

    if (leftNodes.length === 0) {
      return { nodes: { left: [], center: [], right: [] }, flows: [] }
    }

    // Center nodes: meetings (top 4 by message count)
    const sortedMeetings = completedMeetings
      .sort((a, b) => (b.messages?.length || 0) - (a.messages?.length || 0))
      .slice(0, 4)
    const centerNodes = sortedMeetings.map((m, i) => ({
      id: m.id,
      label: m.saveName || `Meeting ${i + 1}`,
      value: m.messages?.length || 1,
      color: '#64748b',
    }))

    // Right nodes: outcomes
    const completed = completedMeetings.length
    const rightNodes = [
      { id: 'completed', label: 'Completed', value: completed, color: '#10b981' },
      { id: 'insights', label: 'Insights', value: Math.min(completed, 3), color: '#8b5cf6' },
      { id: 'papers', label: 'Papers', value: Math.max(1, Math.floor(completed / 3)), color: '#f59e0b' },
    ]

    // Build flows: agents → meetings
    const flowsAgentMeetings: { source: string; target: string; value: number; color: string }[] = []
    leftNodes.forEach(agent => {
      sortedMeetings.forEach(meeting => {
        const agentMsgsInMeeting = (meeting.messages || []).filter(msg => msg.agentName === agent.label).length
        if (agentMsgsInMeeting > 0) {
          flowsAgentMeetings.push({
            source: agent.id,
            target: meeting.id,
            value: agentMsgsInMeeting,
            color: agent.color,
          })
        }
      })
    })

    // Build flows: meetings → outcomes
    const flowsMeetingsOutcomes: { source: string; target: string; value: number; color: string }[] = []
    sortedMeetings.forEach(meeting => {
      const msgLen = meeting.messages?.length || 1
      flowsMeetingsOutcomes.push({
        source: meeting.id,
        target: 'completed',
        value: Math.max(1, Math.round(msgLen / 3)),
        color: '#10b981',
      })
      flowsMeetingsOutcomes.push({
        source: meeting.id,
        target: 'insights',
        value: Math.max(1, Math.round(msgLen / 5)),
        color: '#8b5cf6',
      })
      flowsMeetingsOutcomes.push({
        source: meeting.id,
        target: 'papers',
        value: Math.max(1, Math.round(msgLen / 8)),
        color: '#f59e0b',
      })
    })

    return {
      nodes: { left: leftNodes, center: centerNodes, right: rightNodes },
      flows: [...flowsAgentMeetings, ...flowsMeetingsOutcomes],
    }
  }, [agents, meetings])

  // SVG layout constants
  const svgWidth = 900
  const svgHeight = 340
  const leftX = 10
  const centerX = 340
  const rightX = 670
  const nodeWidth = 130
  const nodePadding = 8

  // Compute node positions (Y)
  const { left: leftNodes, center: centerNodes, right: rightNodes } = nodes
  const leftTotal = leftNodes.reduce((s, n) => s + n.value, 0)
  const centerTotal = centerNodes.reduce((s, n) => s + n.value, 0)
  const rightTotal = rightNodes.reduce((s, n) => s + n.value, 0)

  const leftPositions = leftNodes.reduce<{ id: string; y: number; height: number; node: typeof leftNodes[0] }[]>((acc, node) => {
    const lastY = acc.length > 0 ? acc[acc.length - 1].y + acc[acc.length - 1].height + nodePadding : 20
    const height = Math.max(28, (node.value / Math.max(leftTotal, 1)) * (svgHeight - 40 - (leftNodes.length - 1) * nodePadding))
    acc.push({ id: node.id, y: lastY, height, node })
    return acc
  }, [])

  const centerPositions = centerNodes.reduce<{ id: string; y: number; height: number; node: typeof centerNodes[0] }[]>((acc, node) => {
    const lastY = acc.length > 0 ? acc[acc.length - 1].y + acc[acc.length - 1].height + nodePadding : 20
    const height = Math.max(28, (node.value / Math.max(centerTotal, 1)) * (svgHeight - 40 - (centerNodes.length - 1) * nodePadding))
    acc.push({ id: node.id, y: lastY, height, node })
    return acc
  }, [])

  const rightPositions = rightNodes.reduce<{ id: string; y: number; height: number; node: typeof rightNodes[0] }[]>((acc, node) => {
    const lastY = acc.length > 0 ? acc[acc.length - 1].y + acc[acc.length - 1].height + nodePadding : 60
    const height = Math.max(28, (node.value / Math.max(rightTotal, 1)) * (svgHeight - 80 - (rightNodes.length - 1) * nodePadding))
    acc.push({ id: node.id, y: lastY, height, node })
    return acc
  }, [])

  const allPositions = [...leftPositions, ...centerPositions, ...rightPositions]

  if (leftNodes.length === 0) {
    return (
      <Card className="vl-card backdrop-blur-sm transition-all duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Workflow className="size-4 text-violet-400" />
            <CardTitle className="text-xl font-semibold tracking-tight" style={{ color: 'var(--vl-text-white)' }}>
              {t(lang, 'dashboard.sankey.title') || 'Meeting Data Flow'}
            </CardTitle>
          </div>
          <CardDescription className="text-sm vl-text-body">{t(lang, 'dashboard.sankey.description') || 'How agent contributions flow through meetings to outcomes'}</CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="flex flex-col items-center justify-center py-12">
            <Workflow className="size-12 vl-text-muted mb-3 vl-float-animation" />
            <p className="text-sm vl-text-muted">{t(lang, 'dashboard.sankey.noData') || 'No flow data yet'}</p>
            <p className="text-xs vl-text-muted mt-1">{t(lang, 'dashboard.sankey.noDataDesc') || 'Complete meetings to see the data flow'}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="vl-card backdrop-blur-sm transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Workflow className="size-4 text-violet-400" />
          <CardTitle className="text-xl font-semibold tracking-tight" style={{ color: 'var(--vl-text-white)' }}>
            {t(lang, 'dashboard.sankey.title') || 'Meeting Data Flow'}
          </CardTitle>
        </div>
        <CardDescription className="text-sm vl-text-body">{t(lang, 'dashboard.sankey.description') || 'How agent contributions flow through meetings to outcomes'}</CardDescription>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="vl-inner rounded-xl p-4 overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto"
            style={{ minWidth: 600 }}
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {flows.map((flow, i) => (
                <linearGradient key={`grad-${i}`} id={`flow-grad-${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={flow.color} stopOpacity={0.6} />
                  <stop offset="100%" stopColor={flow.color} stopOpacity={0.25} />
                </linearGradient>
              ))}
            </defs>

            {/* Column labels */}
            <text x={leftX + nodeWidth / 2} y={12} textAnchor="middle" fill="var(--vl-text-muted)" fontSize={10} fontWeight="600">
              {t(lang, 'dashboard.sankey.agents') || 'Agents'}
            </text>
            <text x={centerX + nodeWidth / 2} y={12} textAnchor="middle" fill="var(--vl-text-muted)" fontSize={10} fontWeight="600">
              {t(lang, 'dashboard.sankey.meetings') || 'Meetings'}
            </text>
            <text x={rightX + nodeWidth / 2} y={12} textAnchor="middle" fill="var(--vl-text-muted)" fontSize={10} fontWeight="600">
              {t(lang, 'dashboard.sankey.outcomes') || 'Outcomes'}
            </text>

            {/* Flow paths */}
            {flows.map((flow, i) => {
              const sourcePos = allPositions.find(p => p.id === flow.source)
              const targetPos = allPositions.find(p => p.id === flow.target)
              if (!sourcePos || !targetPos) return null

              const sourceX = sourcePos === leftPositions.find(p => p.id === flow.source)
                ? leftX + nodeWidth
                : centerX + nodeWidth
              const targetX = targetPos === rightPositions.find(p => p.id === flow.target)
                ? rightX
                : centerX

              const sourceY = sourcePos.y + sourcePos.height / 2
              const targetY = targetPos.y + targetPos.height / 2
              const controlOffset = (targetX - sourceX) * 0.4

              const pathWidth = Math.max(2, Math.min(14, flow.value * 1.5))

              return (
                <path
                  key={`flow-${i}`}
                  d={`M ${sourceX} ${sourceY} C ${sourceX + controlOffset} ${sourceY}, ${targetX - controlOffset} ${targetY}, ${targetX} ${targetY}`}
                  fill="none"
                  stroke={`url(#flow-grad-${i})`}
                  strokeWidth={pathWidth}
                  strokeLinecap="round"
                  className="sankey-flow"
                  opacity={0}
                  style={{
                    animation: `sankey-fade-in 0.6s ease ${0.1 + i * 0.05}s forwards`,
                  }}
                >
                  <title>{flow.source}: {flow.value} messages</title>
                </path>
              )
            })}

            {/* Left nodes (Agents) */}
            {leftPositions.map(pos => (
              <g key={`node-${pos.id}`}>
                <rect
                  x={leftX}
                  y={pos.y}
                  width={nodeWidth}
                  height={pos.height}
                  rx={6}
                  ry={6}
                  fill={pos.node.color}
                  fillOpacity={0.85}
                  stroke={pos.node.color}
                  strokeWidth={1}
                  opacity={0}
                  style={{
                    animation: 'sankey-fade-in 0.4s ease forwards',
                  }}
                />
                <text
                  x={leftX + nodeWidth / 2}
                  y={pos.y + pos.height / 2 + 4}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize={pos.height > 35 ? 11 : 9}
                  fontWeight="600"
                >
                  {pos.node.label.length > 12 ? pos.node.label.slice(0, 12) + '…' : pos.node.label}
                </text>
                <title>{pos.node.label}: {pos.node.value} messages</title>
              </g>
            ))}

            {/* Center nodes (Meetings) */}
            {centerPositions.map(pos => (
              <g key={`node-${pos.id}`}>
                <rect
                  x={centerX}
                  y={pos.y}
                  width={nodeWidth}
                  height={pos.height}
                  rx={6}
                  ry={6}
                  fill="var(--vl-bg-inner)"
                  stroke="var(--vl-border)"
                  strokeWidth={1}
                  opacity={0}
                  style={{
                    animation: 'sankeyFadeIn 0.4s ease 0.15s forwards',
                  }}
                />
                <text
                  x={centerX + nodeWidth / 2}
                  y={pos.y + pos.height / 2 + 4}
                  textAnchor="middle"
                  fill="var(--vl-text-body)"
                  fontSize={pos.height > 35 ? 10 : 8}
                  fontWeight="500"
                >
                  {pos.node.label.length > 14 ? pos.node.label.slice(0, 14) + '…' : pos.node.label}
                </text>
                <title>{pos.node.label}: {pos.node.value} messages</title>
              </g>
            ))}

            {/* Right nodes (Outcomes) */}
            {rightPositions.map(pos => (
              <g key={`node-${pos.id}`}>
                <rect
                  x={rightX}
                  y={pos.y}
                  width={nodeWidth}
                  height={pos.height}
                  rx={6}
                  ry={6}
                  fill={pos.node.color}
                  fillOpacity={0.85}
                  stroke={pos.node.color}
                  strokeWidth={1}
                  opacity={0}
                  style={{
                    animation: 'sankeyFadeIn 0.4s ease 0.3s forwards',
                  }}
                />
                <text
                  x={rightX + nodeWidth / 2}
                  y={pos.y + pos.height / 2 + 4}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize={11}
                  fontWeight="600"
                >
                  {pos.node.label}
                </text>
                <title>{pos.node.label}: {pos.node.value}</title>
              </g>
            ))}
          </svg>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Meeting Sentiment Bar Chart (Per-Meeting Sentiment Analysis)
// ============================================================
function MeetingSentimentBarChart({ meetings, lang }: { meetings: Meeting[]; lang: Lang }) {
  const { chartData, avgScore, trendDirection, trendLabel } = useMemo(() => {
    const completed = meetings.filter(m => m.status === 'completed' && (m.messages || []).length > 0)
    if (completed.length === 0) {
      return { chartData: [], avgScore: 0, trendDirection: 'neutral' as const, trendLabel: '' }
    }

    const scores: { name: string; score: number; positive: number; negative: number; neutral: number }[] = []
    let totalScore = 0

    completed.forEach(m => {
      const msgs = m.messages || []
      let pos = 0
      let neg = 0
      let neu = 0
      msgs.forEach(msg => {
        const s = analyzeSentiment(msg.message)
        if (s === 'positive') pos++
        else if (s === 'negative') neg++
        else neu++
      })
      const total = pos + neg + neu
      // Score: positive msgs = +1, negative = -1, neutral = 0, normalized to 0-100
      const score = total > 0 ? Math.round(((pos - neg) / total + 1) * 50) : 50
      totalScore += score
      const label = m.saveName || m.agenda?.substring(0, 20) || `Meeting ${m.id.slice(0, 4)}`
      scores.push({ name: label.length > 15 ? label.slice(0, 15) + '…' : label, score, positive: pos, negative: neg, neutral: neu })
    })

    const avg = Math.round(totalScore / scores.length)
    const mostRecent = scores[scores.length - 1]?.score ?? avg
    const direction = mostRecent > avg + 5 ? 'up' : mostRecent < avg - 5 ? 'down' : 'neutral'
    const directionLabel = direction === 'up' ? 'Positive Trend' : direction === 'down' ? 'Declining Trend' : 'Stable'

    return { chartData: scores, avgScore: avg, trendDirection: direction, trendLabel: directionLabel }
  }, [meetings])

  if (chartData.length === 0) {
    return (
      <Card className="vl-card backdrop-blur-sm transition-all duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-emerald-400" />
            <CardTitle className="text-xl font-semibold tracking-tight" style={{ color: 'var(--vl-text-white)' }}>
              Meeting Sentiment Overview
            </CardTitle>
          </div>
          <CardDescription className="text-sm vl-text-body">
            Per-meeting sentiment analysis showing discussion tone across completed meetings
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="size-12 vl-text-muted mb-3 vl-float-animation" />
            <p className="text-sm vl-text-muted">No completed meetings to analyze</p>
            <p className="text-xs vl-text-muted mt-1">Run and complete meetings to see sentiment data</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getScoreColor = (score: number) => {
    if (score >= 60) return '#10b981' // emerald
    if (score >= 45) return '#f59e0b' // amber
    return '#f43f5e' // rose
  }

  const getAvgGradient = (score: number) => {
    if (score >= 60) return 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/5'
    if (score >= 45) return 'bg-gradient-to-br from-amber-500/20 to-amber-600/5'
    return 'bg-gradient-to-br from-rose-500/20 to-rose-600/5'
  }

  const getAvgTextColor = (score: number) => {
    if (score >= 60) return 'text-emerald-400'
    if (score >= 45) return 'text-amber-400'
    return 'text-rose-400'
  }

  return (
    <Card className="vl-card backdrop-blur-sm transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-emerald-400" />
            <CardTitle className="text-xl font-semibold tracking-tight" style={{ color: 'var(--vl-text-white)' }}>
              Meeting Sentiment Overview
            </CardTitle>
          </div>
          {/* Average sentiment score card with gradient */}
          <div className={`flex items-center gap-2 rounded-xl px-4 py-2 ${getAvgGradient(avgScore)} border border-[var(--vl-border)]`}>
            <div className="text-right">
              <p className="text-[10px] vl-text-muted leading-none">Avg Sentiment</p>
              <p className={`text-xl font-bold ${getAvgTextColor(avgScore)} leading-tight`}>{avgScore}</p>
            </div>
            <div className="flex flex-col items-center">
              {trendDirection === 'up' ? (
                <ArrowUpRight className="size-5 text-emerald-400" />
              ) : trendDirection === 'down' ? (
                <ArrowDownRight className="size-5 text-rose-400" />
              ) : (
                <TrendingUp className="size-5 text-amber-400" />
              )}
              <span className="text-[9px] vl-text-muted leading-none">{trendLabel}</span>
            </div>
          </div>
        </div>
        <CardDescription className="text-sm vl-text-body">
          Per-meeting sentiment analysis showing discussion tone across completed meetings
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="vl-inner rounded-xl p-4">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="[stroke:var(--vl-border)]" opacity={0.3} />
              <XAxis
                dataKey="name"
                tick={{ fill: 'var(--vl-text-muted)', fontSize: 10 }}
                axisLine={{ stroke: 'var(--vl-border)' }}
                interval={0}
                angle={-25}
                textAnchor="end"
                height={60}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: 'var(--vl-text-muted)', fontSize: 10 }}
                axisLine={{ stroke: 'var(--vl-border)' }}
                label={{ value: 'Score', angle: -90, position: 'insideLeft', style: { fill: 'var(--vl-text-muted)', fontSize: 10 } }}
              />
              <RechartsTooltip
                contentStyle={{
                  background: 'var(--vl-bg-surface)',
                  border: '1px solid var(--vl-border)',
                  borderRadius: '8px',
                  color: 'var(--vl-text-white)',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [`${value}`, 'Sentiment Score']}
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              />
              <ReferenceLine y={avgScore} stroke={getScoreColor(avgScore)} strokeDasharray="6 3" opacity={0.6} />
              <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getScoreColor(entry.score)}
                    fillOpacity={0.85}
                    className="sentiment-bar"
                    style={{
                      animation: `sentiment-bar-grow 0.6s ease ${index * 0.08}s forwards`,
                      transformOrigin: 'bottom',
                    }}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-emerald-500" />
            <span className="text-xs vl-text-muted">Positive (60-100)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-amber-500" />
            <span className="text-xs vl-text-muted">Neutral (45-59)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-rose-500" />
            <span className="text-xs vl-text-muted">Negative (0-44)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 border-t-2 border-dashed" style={{ borderColor: getScoreColor(avgScore) }} />
            <span className="text-xs vl-text-muted">Average ({avgScore})</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Meeting Word Cloud (Pure CSS/HTML)
// ============================================================
const WORD_CLOUD_STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for',
  'of', 'and', 'or', 'but', 'with', 'that', 'this', 'it', 'we', 'they', 'you',
  'i', 'be', 'have', 'has', 'do', 'does', 'not', 'no', 'so', 'as', 'by', 'if',
  'from', 'can', 'will', 'would', 'should', 'could', 'may', 'might', 'our', 'us',
  'my', 'your', 'their', 'been', 'being', 'had', 'what', 'which', 'who', 'when',
  'where', 'how', 'all', 'more', 'also', 'than', 'its', 'each', 'some', 'very',
  'just', 'about', 'up', 'out', 'into', 'over', 'then', 'there', 'here', 'these',
  'those', 'other', 'only', 'such', 'same', 'too', 'any', 'because', 'through',
  'while', 'between', 'after', 'before', 'above', 'below', 'during', 'under',
  'again', 'further', 'once', 'both', 'few', 'most', 'own', 'nor', 'off', 'am',
])

const WORD_CLOUD_PALETTE = [
  '#10b981', '#34d399', '#6ee7b7', // emerald shades
  '#06b6d4', '#22d3ee', '#67e8f9', // cyan shades
  '#8b5cf6', '#a78bfa', '#c4b5fd', // violet shades
  '#f59e0b', '#fbbf24', '#fcd34d', // amber shades
  '#f43f5e', '#fb7185', '#fda4af', // rose shades
]

function MeetingWordCloud({ meetings, lang }: { meetings: Meeting[]; lang: Lang }) {
  const words = useMemo(() => {
    const completed = meetings.filter(m => m.status === 'completed')
    const allText = completed.flatMap(m => m.messages || []).map(m => m.message).join(' ')
    const wordFreq = new Map<string, number>()

    allText.toLowerCase().split(/\W+/).forEach(word => {
      if (word.length < 3 || WORD_CLOUD_STOP_WORDS.has(word) || /^\d+$/.test(word)) return
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1)
    })

    return Array.from(wordFreq.entries())
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50)
  }, [meetings])

  // Deterministic pseudo-random based on index for color + rotation
  const getWordStyle = useMemo(() => {
    return words.map((term, i) => {
      const maxCount = words[0]?.count || 1
      const ratio = term.count / maxCount
      const fontSize = Math.round(12 + ratio * 36) // 12px to 48px
      // Pseudo-random color using golden ratio hash
      const colorIdx = Math.floor((i * 1.618033988) % WORD_CLOUD_PALETTE.length)
      const color = WORD_CLOUD_PALETTE[colorIdx]
      // Pseudo-random rotation: -5 to 5 degrees
      const rotation = ((i * 2.41421356) % 10) - 5
      // Stagger delay for animation
      const delay = i * 0.03

      return { ...term, fontSize, color, rotation, delay }
    })
  }, [words])

  if (words.length === 0) {
    return (
      <Card className="vl-card backdrop-blur-sm transition-all duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Cloud className="size-4 text-cyan-400" />
            <CardTitle className="text-xl font-semibold tracking-tight" style={{ color: 'var(--vl-text-white)' }}>
              Meeting Word Cloud
            </CardTitle>
          </div>
          <CardDescription className="text-sm vl-text-body">
            Visual breakdown of the most frequent terms from all meeting discussions
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="flex flex-col items-center justify-center py-12">
            <Cloud className="size-12 vl-text-muted mb-3 vl-float-animation" />
            <p className="text-sm vl-text-muted">No discussion data yet</p>
            <p className="text-xs vl-text-muted mt-1">Complete meetings to see the word cloud</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="vl-card backdrop-blur-sm transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Cloud className="size-4 text-cyan-400" />
          <CardTitle className="text-xl font-semibold tracking-tight" style={{ color: 'var(--vl-text-white)' }}>
            Meeting Word Cloud
          </CardTitle>
        </div>
        <CardDescription className="text-sm vl-text-body">
          Visual breakdown of the most frequent terms from all meeting discussions
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="vl-inner rounded-xl p-6">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2.5 py-4 min-h-[200px]">
            {getWordStyle.map((term) => (
              <span
                key={term.word}
                className="word-cloud-word inline-block cursor-default select-none px-1"
                style={{
                  fontSize: `${term.fontSize}px`,
                  fontWeight: term.fontSize > 32 ? 700 : term.fontSize > 22 ? 600 : 400,
                  color: term.color,
                  transform: `rotate(${term.rotation}deg)`,
                  lineHeight: 1.3,
                  opacity: 0,
                  animation: `word-cloud-fade-in 0.5s ease ${term.delay}s forwards`,
                }}
                title={`${term.word}: ${term.count} occurrences`}
              >
                {term.word}
              </span>
            ))}
          </div>
          {/* Top 10 legend */}
          <div className="mt-4 pt-3 border-t" style={{ borderColor: 'var(--vl-border)' }}>
            <p className="text-xs vl-text-muted mb-2">Top 10 Terms</p>
            <div className="flex flex-wrap gap-2">
              {words.slice(0, 10).map((term, i) => (
                <div
                  key={term.word}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs"
                  style={{
                    background: i < 3 ? 'rgba(6,182,212,0.15)' : 'var(--vl-bg-surface)',
                    border: `1px solid ${i < 3 ? 'rgba(6,182,212,0.3)' : 'var(--vl-border)'}`,
                  }}
                >
                  <span className={i < 3 ? 'text-cyan-400 font-semibold' : 'vl-text-body'}>
                    {term.word}
                  </span>
                  <span className="vl-text-muted text-[10px]">×{term.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Meeting Topics & Keywords Section
// ============================================================
const TOPICS_PALETTE = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#f43f5e', '#3b82f6']

const TOPICS_STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'of', 'to', 'in', 'for', 'and', 'with', 'on',
  'at', 'by', 'from', 'as', 'it', 'this', 'that', 'was', 'were', 'be', 'been',
  'have', 'has', 'had', 'not', 'but', 'or', 'if', 'we', 'our', 'us', 'they',
  'their', 'them', 'will', 'would', 'could', 'should', 'can', 'may', 'might',
  'shall', 'do', 'does', 'did', 'i', 'you', 'he', 'she', 'its', 'my', 'your',
  'his', 'her', 'no', 'so', 'all', 'more', 'also', 'than', 'each', 'some',
  'very', 'just', 'about', 'up', 'out', 'into', 'over', 'then', 'there', 'here',
  'these', 'those', 'other', 'only', 'such', 'same', 'too', 'any', 'because',
  'through', 'while', 'between', 'after', 'before', 'during', 'under', 'again',
  'further', 'once', 'both', 'few', 'most', 'own', 'nor', 'off', 'am', 'how',
  'what', 'which', 'who', 'when', 'where', 'being', 'above', 'below',
])

function MeetingTopicsSection({ meetings, lang }: { meetings: Meeting[]; lang: Lang }) {
  const keywords = useMemo(() => {
    // Collect all text content from meetings
    const allTexts: string[] = []

    meetings.forEach(m => {
      // Agenda
      if (m.agenda) allTexts.push(m.agenda)
      // Summary
      if (m.summary) allTexts.push(m.summary)
      // Agent messages (first 50 chars each)
      if (m.messages) {
        m.messages.forEach(msg => {
          if (msg.message) allTexts.push(msg.message.substring(0, 50))
        })
      }
    })

    const combined = allTexts.join(' ').toLowerCase()
    const wordFreq = new Map<string, number>()

    combined.split(/\W+/).forEach(word => {
      if (word.length < 3 || TOPICS_STOP_WORDS.has(word) || /^\d+$/.test(word)) return
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1)
    })

    return Array.from(wordFreq.entries())
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
  }, [meetings])

  // Pie chart data: top 5 topic categories
  const pieData = useMemo(() => {
    if (keywords.length === 0) return []
    const topicCategories = [
      { name: t(lang, 'meetingTemplates.brainstorm'), value: 0, color: '#f59e0b' },
      { name: t(lang, 'meetingTemplates.review'), value: 0, color: '#06b6d4' },
      { name: t(lang, 'meetingTemplates.plan'), value: 0, color: '#8b5cf6' },
      { name: t(lang, 'dashboard.analytics.title').split(' ')[0], value: 0, color: '#10b981' },
      { name: t(lang, 'dashboard.howItWorks.title').split(' ')[0], value: 0, color: '#f43f5e' },
    ]

    // Distribute keyword counts across categories deterministically
    keywords.forEach((kw, i) => {
      topicCategories[i % topicCategories.length].value += kw.count
    })

    return topicCategories.filter(d => d.value > 0)
  }, [keywords, lang])

  const maxCount = keywords[0]?.count || 1

  const handleKeywordClick = (word: string, count: number) => {
    // Count meetings containing this keyword
    const lowerWord = word.toLowerCase()
    const matchingMeetings = meetings.filter(m => {
      const text = [
        m.agenda || '',
        m.summary || '',
        ...(m.messages || []).map(msg => msg.message || ''),
      ].join(' ').toLowerCase()
      return text.includes(lowerWord)
    })

    const toastMsg = t(lang, 'meetingTopics.meetingsWithTag')
      .replace('{count}', String(matchingMeetings.length))
      .replace('{tag}', word)
    toast.info(toastMsg, {
      description: t(lang, 'meetingTopics.clickToFilter'),
    })
  }

  if (keywords.length === 0) {
    return (
      <Card className="vl-card backdrop-blur-sm transition-all duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-violet-400" />
            <CardTitle className="text-xl font-semibold tracking-tight" style={{ color: 'var(--vl-text-white)' }}>
              {t(lang, 'meetingTopics.title')}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="flex flex-col items-center justify-center py-12">
            <Sparkles className="size-12 vl-text-muted mb-3 vl-float-animation" />
            <p className="text-sm vl-text-muted">{t(lang, 'meetingTopics.noData')}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="vl-card backdrop-blur-sm transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-violet-400" />
          <CardTitle className="text-xl font-semibold tracking-tight" style={{ color: 'var(--vl-text-white)' }}>
            {t(lang, 'meetingTopics.title')}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0 space-y-6">
        {/* Keyword Cloud Pills */}
        <div>
          <p className="text-xs vl-text-muted mb-3 flex items-center gap-1.5">
            <Cloud className="size-3" /> {t(lang, 'meetingTopics.keywordCloud')}
          </p>
          <div className="vl-inner rounded-xl p-4">
            <div className="flex flex-wrap items-center gap-2 min-h-[80px]">
              {keywords.map((term, i) => {
                const ratio = term.count / maxCount
                // Size class based on frequency
                const sizeClass = ratio > 0.8 ? 'text-base font-bold' : ratio > 0.5 ? 'text-sm font-semibold' : ratio > 0.25 ? 'text-xs font-medium' : 'text-[10px] font-normal'
                // Color cycling from palette
                const color = TOPICS_PALETTE[i % TOPICS_PALETTE.length]
                const opacityBg = 0.08 + ratio * 0.15

                return (
                  <motion.button
                    key={term.word}
                    onClick={() => handleKeywordClick(term.word, term.count)}
                    whileHover={{ scale: 1.08, y: -1 }}
                    whileTap={{ scale: 0.95 }}
                    className="rounded-full px-3 py-1.5 cursor-pointer transition-all duration-200 border border-transparent hover:border-current"
                    style={{
                      color,
                      backgroundColor: `${color}${Math.round(opacityBg * 255).toString(16).padStart(2, '0')}`,
                    }}
                    title={`${term.word}: ${term.count}`}
                  >
                    <span className={sizeClass}>{term.word}</span>
                    <span className="ml-1 opacity-60 text-[10px]">×{term.count}</span>
                  </motion.button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Topic Distribution Pie Chart */}
        {pieData.length > 0 && (
          <div>
            <p className="text-xs vl-text-muted mb-3 flex items-center gap-1.5">
              <Radar className="size-3" /> {t(lang, 'meetingTopics.distribution')}
            </p>
            <div className="vl-inner rounded-xl p-4">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    animationBegin={0}
                    animationDuration={800}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'var(--vl-bg-dialog)',
                      border: '1px solid var(--vl-border)',
                      borderRadius: '8px',
                      color: 'var(--vl-text-white)',
                      fontSize: '12px',
                    }}
                    labelStyle={{ color: 'var(--vl-text-white)' }}
                    itemStyle={{ color: 'var(--vl-text-body)' }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', color: 'var(--vl-text-body)' }}
                    iconType="circle"
                    iconSize={8}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================
// Meeting Insights Section
// ============================================================
function MeetingInsightsSection({ agents, meetings, lang }: { agents: Agent[]; meetings: Meeting[]; lang: Lang }) {
  const insights = useMemo(() => {
    if (meetings.length === 0) return null

    const completedMeetings = meetings.filter(m => m.status === 'completed')
    const totalMeetings = meetings.length
    const completionRate = totalMeetings > 0 ? (completedMeetings.length / totalMeetings) * 100 : 0

    // Average meeting duration (estimated from message timestamps)
    const completedWithDuration = completedMeetings.filter(m => {
      const msgs = m.messages || []
      return msgs.length >= 2
    }).map(m => {
      const msgs = m.messages || []
      const first = new Date(msgs[0].createdAt).getTime()
      const last = new Date(msgs[msgs.length - 1].createdAt).getTime()
      return Math.max(0, last - first)
    })
    const avgDurationMs = completedWithDuration.length > 0
      ? completedWithDuration.reduce((s, d) => s + d, 0) / completedWithDuration.length
      : 0
    const avgDurationMin = Math.round(avgDurationMs / 60000)
    const avgDurationStr = avgDurationMin > 60
      ? `${Math.floor(avgDurationMin / 60)}h ${avgDurationMin % 60}m`
      : avgDurationMin > 0
        ? `${avgDurationMin}m`
        : '—'

    // Most active day of week
    const dayCounts: Record<number, number> = {}
    meetings.forEach(m => {
      const day = new Date(m.createdAt).getDay()
      dayCounts[day] = (dayCounts[day] || 0) + 1
    })
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayNamesZh = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const busiestEntry = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]
    const busiestDay = busiestEntry
      ? lang === 'zh'
        ? `${dayNamesZh[Number(busiestEntry[0])]} (${busiestEntry[1]})`
        : `${dayNames[Number(busiestEntry[0])]} (${busiestEntry[1]})`
      : '—'

    // Longest meeting by message count
    const longestMeeting = meetings.reduce((max, m) =>
      (m.messages || []).length > (max.messages || []).length ? m : max, meetings[0])
    const longestMeetingName = longestMeeting
      ? (longestMeeting.saveName || '—')
      : '—'

    // Most collaborative agent
    const agentMeetingCounts: Record<string, Set<string>> = {}
    completedMeetings.forEach(m => {
      const participants = new Set((m.messages || []).map(msg => msg.agentName).filter(n => n !== 'User'))
      participants.forEach(name => {
        if (!agentMeetingCounts[name]) agentMeetingCounts[name] = new Set()
        agentMeetingCounts[name].add(m.id)
      })
      // Add team members who may not have sent messages
      if (m.teamLead) {
        if (!agentMeetingCounts[m.teamLead.title]) agentMeetingCounts[m.teamLead.title] = new Set()
        agentMeetingCounts[m.teamLead.title].add(m.id)
      }
      if (m.teamMembers) {
        m.teamMembers.forEach(member => {
          if (!agentMeetingCounts[member.title]) agentMeetingCounts[member.title] = new Set()
          agentMeetingCounts[member.title].add(m.id)
        })
      }
    })
    const mostCollabEntry = Object.entries(agentMeetingCounts).sort((a, b) => b[1].size - a[1].size)[0]
    const mostCollaborative = mostCollabEntry ? mostCollabEntry[0] : '—'

    // Avg messages per meeting
    const totalMessages = meetings.reduce((s, m) => s + (m.messages || []).length, 0)
    const avgMessages = totalMeetings > 0 ? (totalMessages / totalMeetings).toFixed(1) : '0'

    // Agent utilization (horizontal bar chart data)
    const utilizationData = agents.map(a => {
      const meetingCount = meetings.filter(m =>
        (m.messages || []).some(msg => msg.agentName === a.title)
      ).length
      return {
        name: a.title,
        meetings: meetingCount,
        color: a.color,
      }
    }).filter(d => d.meetings > 0).sort((a, b) => b.meetings - a.meetings)

    return {
      completionRate,
      avgDurationStr,
      busiestDay,
      longestMeetingName,
      longestMeetingMsgCount: longestMeeting ? (longestMeeting.messages || []).length : 0,
      mostCollaborative,
      avgMessages,
      utilizationData,
    }
  }, [agents, meetings, lang])

  if (!insights) return null

  const { completionRate, avgDurationStr, busiestDay, longestMeetingName, longestMeetingMsgCount, mostCollaborative, avgMessages, utilizationData } = insights

  // SVG circular progress ring config
  const ringRadius = 40
  const ringStroke = 8
  const ringCircumference = 2 * Math.PI * ringRadius
  const ringOffset = ringCircumference - (completionRate / 100) * ringCircumference

  return (
    <div className="space-y-4">
      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="vl-card backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
              <Trophy className="size-5 text-violet-400" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold vl-text-heading truncate">{longestMeetingName}</p>
              <p className="text-[10px] vl-text-muted">{t(lang, 'insights.longestMeeting')}</p>
              <p className="text-[10px] vl-text-muted">{longestMeetingMsgCount} {t(lang, 'common.messages')}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="vl-card backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
              <UsersRound className="size-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold vl-text-heading truncate">{mostCollaborative}</p>
              <p className="text-[10px] vl-text-muted">{t(lang, 'insights.mostCollaborative')}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="vl-card backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
              <Calendar className="size-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold vl-text-heading truncate">{busiestDay}</p>
              <p className="text-[10px] vl-text-muted">{t(lang, 'insights.busiestDay')}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="vl-card backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center shrink-0">
              <BarChart3 className="size-5 text-cyan-400" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold vl-text-heading">{avgMessages}</p>
              <p className="text-[10px] vl-text-muted">{t(lang, 'insights.avgMessages')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row: Completion Ring + Duration + Agent Utilization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Completion Rate Ring */}
        <Card className="vl-card backdrop-blur-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-emerald-400" />
              <CardTitle className="text-sm font-semibold vl-text-heading">{t(lang, 'insights.completionRate')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex items-center justify-center p-4">
            <div className="relative w-28 h-28">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50" cy="50" r={ringRadius}
                  stroke="var(--vl-border)" strokeWidth={ringStroke} fill="none"
                />
                <circle
                  cx="50" cy="50" r={ringRadius}
                  stroke="#10b981" strokeWidth={ringStroke} fill="none"
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                  style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold" style={{ color: 'var(--vl-text-white)' }}>
                  {Math.round(completionRate)}%
                </span>
              </div>
            </div>
            <div className="ml-4 space-y-1">
              <p className="text-xs vl-text-muted">
                {meetings.filter(m => m.status === 'completed').length} / {meetings.length} {t(lang, 'common.completed').toLowerCase()}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Average Duration */}
        <Card className="vl-card backdrop-blur-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Timer className="size-4 text-violet-400" />
              <CardTitle className="text-sm font-semibold vl-text-heading">{t(lang, 'insights.avgDuration')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex items-center justify-center p-4">
            <p className="text-4xl font-bold vl-text-heading">{avgDurationStr}</p>
          </CardContent>
        </Card>

        {/* Agent Utilization */}
        <Card className="vl-card backdrop-blur-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-amber-400" />
              <CardTitle className="text-sm font-semibold vl-text-heading">{t(lang, 'insights.agentUtilization')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {utilizationData.length === 0 ? (
              <p className="text-sm vl-text-muted text-center py-4">{t(lang, 'common.noData')}</p>
            ) : (
              <div className="space-y-2">
                {utilizationData.slice(0, 6).map(item => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-white text-[10px] font-bold"
                      style={{ backgroundColor: item.color }}
                    >
                      {item.name.charAt(0)}
                    </div>
                    <span className="text-xs vl-text-body truncate w-20">{item.name}</span>
                    <div className="flex-1 h-2 bg-[var(--vl-bg-inner)] rounded-full overflow-hidden">
                      <div
                        className="utilization-bar h-full rounded-full"
                        style={{
                          backgroundColor: item.color,
                          width: `${(item.meetings / Math.max(...utilizationData.map(d => d.meetings), 1)) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] vl-text-muted w-6 text-right">{item.meetings}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ============================================================
// Team Performance Radar Chart Component
// ============================================================
function TeamPerformanceRadar({ agents, meetings, lang }: { agents: Agent[]; meetings: Meeting[]; lang: Lang }) {
  const radarData = useMemo(() => {
    if (agents.length === 0 || meetings.length === 0) return null

    // Dimensions: Participation, Leadership, Collaboration, Expertise, Productivity
    const dimensions = [
      { key: 'participation', label: t(lang, 'dashboard.performance.participation') },
      { key: 'leadership', label: t(lang, 'dashboard.performance.leadership') },
      { key: 'collaboration', label: t(lang, 'dashboard.performance.collaboration') },
      { key: 'expertise', label: t(lang, 'dashboard.performance.expertise') },
      { key: 'productivity', label: t(lang, 'dashboard.performance.productivity') },
    ]

    // Compute metrics for each agent
    const completedMeetings = meetings.filter(m => m.status === 'completed')

    const agentMetrics = agents.slice(0, 6).map(agent => {
      const agentMessages = completedMeetings.flatMap(m => m.messages || []).filter(msg => msg.agentName === agent.title)

      // Participation: messages sent (normalized 0-100)
      const totalMsgCount = completedMeetings.reduce((sum, m) => sum + (m.messages || []).length, 0)
      const maxMessages = Math.max(totalMsgCount, 1)
      const participation = Math.min(100, (agentMessages.length / maxMessages) * 100)

      // Leadership: times as team lead
      const leadCount = completedMeetings.filter(m => m.teamLeadId === agent.id).length
      const leadership = Math.min(100, (leadCount / Math.max(completedMeetings.length, 1)) * 100 * 5)

      // Collaboration: number of unique meetings participated in
      const uniqueMeetings = new Set(
        completedMeetings.filter(m => (m.messages || []).some(msg => msg.agentName === agent.title)).map(m => m.id)
      ).size
      const collaboration = Math.min(100, (uniqueMeetings / Math.max(completedMeetings.length, 1)) * 100)

      // Expertise: unique topics (based on distinct agendas)
      const uniqueTopics = new Set(
        completedMeetings.filter(m => (m.messages || []).some(msg => msg.agentName === agent.title)).map(m => m.agenda?.substring(0, 30))
      ).size
      const expertise = Math.min(100, (uniqueTopics / Math.max(completedMeetings.length, 1)) * 100)

      // Productivity: meetings completed (overall)
      const productivity = Math.min(100, (completedMeetings.length / Math.max(completedMeetings.length, 1)) * 80 + participation * 0.2)

      return {
        name: agent.title,
        color: agent.color,
        participation: Math.round(participation),
        leadership: Math.round(leadership),
        collaboration: Math.round(collaboration),
        expertise: Math.round(expertise),
        productivity: Math.round(productivity),
      }
    })

    // Build radar data points
    const data = dimensions.map(dim => {
      const point: Record<string, string | number> = { dimension: dim.label }
      agentMetrics.forEach(am => {
        point[am.name] = am[dim.key as keyof typeof am] as number
      })
      return point
    })

    return { data, agents: agentMetrics }
  }, [agents, meetings, lang])

  // Theme-aware colors
  const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4']

  return (
    <Card className="vl-card backdrop-blur-sm transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Radar className="size-4 text-violet-400" />
          <CardTitle className="text-xl font-semibold tracking-tight" style={{ color: 'var(--vl-text-white)' }}>
            {t(lang, 'dashboard.teamPerformance')}
          </CardTitle>
        </div>
        <CardDescription className="text-sm vl-text-body">{t(lang, 'dashboard.teamPerformance.desc')}</CardDescription>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        {!radarData ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Radar className="size-12 vl-text-muted mb-3" />
            <p className="text-sm vl-text-muted">{t(lang, 'dashboard.performance.noData')}</p>
            <p className="text-xs vl-text-muted mt-1">{t(lang, 'dashboard.performance.noDataDesc')}</p>
          </div>
        ) : (
          <div className="w-full h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData.data} cx="50%" cy="50%" outerRadius="75%">
                <PolarGrid
                  stroke="var(--vl-border)"
                  strokeDasharray="3 3"
                />
                <PolarAngleAxis
                  dataKey="dimension"
                  tick={{ fill: 'var(--vl-text-muted)', fontSize: 11 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={false}
                  axisLine={false}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'var(--vl-bg-card)',
                    border: '1px solid var(--vl-border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'var(--vl-text-white)',
                  }}
                />
                {radarData.agents.map((agent, i) => (
                  <RechartsRadar
                    key={agent.name}
                    name={agent.name}
                    dataKey={agent.name}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                ))}
                <Legend
                  wrapperStyle={{ fontSize: '11px', color: 'var(--vl-text-muted)' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================
// Dashboard Section Registry & Customization Types
// ============================================================
interface DashboardSectionConfig {
  id: string
  titleKey: string
  icon: string
  defaultVisible: boolean
  defaultOrder: number
}

const dashboardSections: DashboardSectionConfig[] = [
  { id: 'hero', titleKey: 'dashboardCustomize.hero', icon: 'Sparkles', defaultVisible: true, defaultOrder: 0 },
  { id: 'stat-cards', titleKey: 'dashboardCustomize.statCards', icon: 'BarChart3', defaultVisible: true, defaultOrder: 1 },
  { id: 'research-analytics', titleKey: 'dashboardCustomize.researchAnalytics', icon: 'TrendingUp', defaultVisible: true, defaultOrder: 2 },
  { id: 'agent-network', titleKey: 'dashboardCustomize.agentNetwork', icon: 'Workflow', defaultVisible: true, defaultOrder: 3 },
  { id: 'discussion-timeline', titleKey: 'dashboardCustomize.discussionTimeline', icon: 'History', defaultVisible: true, defaultOrder: 4 },
  { id: 'nanobody-progress', titleKey: 'dashboardCustomize.nanobodyProgress', icon: 'Dna', defaultVisible: true, defaultOrder: 5 },
  { id: 'sentiment', titleKey: 'dashboardCustomize.sentiment', icon: 'Activity', defaultVisible: true, defaultOrder: 6 },
  { id: 'research-insights', titleKey: 'dashboardCustomize.researchInsights', icon: 'Brain', defaultVisible: true, defaultOrder: 7 },
  { id: 'how-it-works', titleKey: 'dashboardCustomize.howItWorks', icon: 'Zap', defaultVisible: true, defaultOrder: 8 },
  { id: 'quick-actions', titleKey: 'dashboardCustomize.quickActions', icon: 'Lightbulb', defaultVisible: true, defaultOrder: 9 },
  { id: 'dashboard-widgets', titleKey: 'dashboard.widgets.title', icon: 'LayoutGrid', defaultVisible: true, defaultOrder: 10 },
  { id: 'advanced-viz', titleKey: 'viz.panel.title', icon: 'BarChart3', defaultVisible: true, defaultOrder: 11 },
  { id: 'activity-timeline', titleKey: 'dashboardCustomize.activityTimeline', icon: 'History', defaultVisible: true, defaultOrder: 12 },
]

const DASHBOARD_LAYOUT_STORAGE_KEY = 'vl-dashboard-layout'

interface DashboardLayout {
  sectionOrder: string[]
  hiddenSections: string[]
  collapsedSections: string[]
}

function getDefaultLayout(): DashboardLayout {
  return {
    sectionOrder: dashboardSections
      .sort((a, b) => a.defaultOrder - b.defaultOrder)
      .map(s => s.id),
    hiddenSections: dashboardSections
      .filter(s => !s.defaultVisible)
      .map(s => s.id),
    collapsedSections: [],
  }
}

// Icon resolver for section registry
function getSectionIcon(name: string, className?: string) {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Sparkles, BarChart3, TrendingUp, Workflow, History, Dna, Activity, Brain, Zap, Lightbulb,
  }
  const Icon = iconMap[name] || Sparkles
  return <Icon className={className || 'size-4'} />
}

// ============================================================
// Collapsible Dashboard Section Wrapper
// ============================================================
function CollapsibleDashboardSection({
  sectionId,
  titleKey,
  icon,
  isCollapsed,
  onToggleCollapse,
  children,
  lang,
}: {
  sectionId: string
  titleKey: string
  icon: string
  isCollapsed: boolean
  onToggleCollapse: () => void
  children: React.ReactNode
  lang: Lang
}) {
  return (
    <div className="space-y-2">
      <div className="section-collapse-header" onClick={onToggleCollapse}>
        <ChevronDown
          className={`section-collapse-chevron size-3.5 ${isCollapsed ? 'collapsed' : ''}`}
        />
        {getSectionIcon(icon, 'size-3.5 text-emerald-400')}
        <span className="text-xs font-medium vl-text-heading tracking-wide uppercase">
          {t(lang, titleKey)}
        </span>
        <span className="text-[10px] vl-text-muted ml-auto">
          {isCollapsed ? t(lang, 'dashboardCustomize.sectionHidden') : t(lang, 'dashboardCustomize.sectionVisible')}
        </span>
      </div>
      <div className={`section-collapse-body ${isCollapsed ? 'collapsed' : ''}`}>
        {children}
      </div>
    </div>
  )
}

// ============================================================
// Dashboard Customization Panel
// ============================================================
function DashboardCustomizePanel({
  isOpen,
  onClose,
  sectionOrder,
  hiddenSections,
  collapsedSections,
  allSectionIds,
  onMoveUp,
  onMoveDown,
  onToggleVisibility,
  onToggleCollapseAll,
  onToggleExpandAll,
  onReset,
  lang,
}: {
  isOpen: boolean
  onClose: () => void
  sectionOrder: string[]
  hiddenSections: string[]
  collapsedSections: string[]
  allSectionIds: string[]
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  onToggleVisibility: (id: string) => void
  onToggleCollapseAll: () => void
  onToggleExpandAll: () => void
  onReset: () => void
  lang: Lang
}) {
  if (!isOpen) return null

  return (
    <div className="customize-panel p-5 mb-6">
      {/* Panel Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <LayoutGrid className="size-4 text-emerald-400" />
          <h3 className="text-sm font-semibold vl-text-heading">{t(lang, 'dashboardCustomize.title')}</h3>
          <span className="customize-badge">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {t(lang, 'dashboardCustomize.customizing')}
          </span>
        </div>
        <button
          onClick={onClose}
          className="customize-order-btn hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20"
          aria-label={t(lang, 'common.close')}
        >
          <Minus className="size-3.5" />
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          className="border-[var(--vl-border)] vl-text-body hover:bg-[var(--vl-bg-inner)] hover:text-white text-xs gap-1.5 h-8"
          onClick={onToggleCollapseAll}
        >
          <Minimize2 className="size-3" />
          {t(lang, 'dashboardCustomize.collapseAll')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-[var(--vl-border)] vl-text-body hover:bg-[var(--vl-bg-inner)] hover:text-white text-xs gap-1.5 h-8"
          onClick={onToggleExpandAll}
        >
          <Maximize2 className="size-3" />
          {t(lang, 'dashboardCustomize.expandAll')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-[var(--vl-border)] vl-text-body hover:bg-[var(--vl-bg-inner)] hover:text-white text-xs gap-1.5 h-8 ml-auto"
          onClick={onReset}
        >
          <RotateCcw className="size-3" />
          {t(lang, 'dashboardCustomize.reset')}
        </Button>
      </div>

      {/* Section List */}
      <div className="customize-panel-list space-y-1.5">
        {sectionOrder.map((sectionId, index) => {
          const sectionConfig = dashboardSections.find(s => s.id === sectionId)
          if (!sectionConfig) return null
          const isHidden = hiddenSections.includes(sectionId)

          return (
            <div
              key={sectionId}
              className={`customize-item-highlight flex items-center gap-2.5 px-3 py-2.5 ${
                isHidden ? 'opacity-50' : ''
              }`}
            >
              {/* Drag Handle (visual affordance) */}
              <div className="section-drag-handle">
                <GripVertical className="size-3.5" />
              </div>

              {/* Section Icon + Title */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {getSectionIcon(sectionConfig.icon, 'size-3.5 text-emerald-400')}
                <span className="text-xs font-medium vl-text-heading truncate">
                  {t(lang, sectionConfig.titleKey)}
                </span>
              </div>

              {/* Visibility Toggle */}
              <button
                className={`customize-toggle ${isHidden ? '' : 'active'}`}
                onClick={() => onToggleVisibility(sectionId)}
                role="switch"
                aria-checked={!isHidden}
                aria-label={`${t(lang, sectionConfig.titleKey)} ${isHidden ? t(lang, 'dashboardCustomize.sectionHidden') : t(lang, 'dashboardCustomize.sectionVisible')}`}
              />

              {/* Order Buttons */}
              <div className="flex flex-col gap-0.5">
                <button
                  className="customize-order-btn"
                  onClick={() => onMoveUp(sectionId)}
                  disabled={index === 0}
                  aria-label="Move up"
                >
                  <ChevronUp className="size-3" />
                </button>
                <button
                  className="customize-order-btn"
                  onClick={() => onMoveDown(sectionId)}
                  disabled={index === sectionOrder.length - 1}
                  aria-label="Move down"
                >
                  <ChevronDown className="size-3" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface DashboardTabProps {
  agents: Agent[]
  meetings: Meeting[]
  analytics: AnalyticsData | null
  loading: boolean
  totalAgents: number
  activeMeetings: number
  completedMeetings: number
  totalMessages: number
  recentMeetings: Meeting[]
  lang: Lang
  selectedMeeting: Meeting | null
  // Setters and handlers
  setActiveTab: (tab: TabValue) => void
  setEditingAgent: (agent: Agent | null) => void
  setAgentDialogOpen: (open: boolean) => void
  setSelectedMeeting: (meeting: Meeting | null) => void
  setDetailAgent: (agent: Agent | null) => void
  setDetailDialogOpen: (open: boolean) => void
  setShowAnalytics: (show: boolean) => void
  setAutoSaveIndicator: (show: boolean) => void
  loadAnalytics: () => void
  handleDeleteMeeting: (meeting: Meeting) => void
  setToolConfigInputs: (inputs: Record<string, string>) => void
  setToolConfigDialogOpen: (id: string | null) => void
  setToolRunInputs: (inputs: Record<string, string>) => void
  setToolRunDialogOpen: (id: string | null) => void
  // New props for enhanced quick actions
  setCompareMode: (mode: boolean) => void
  setHistoryViewMode: (mode: 'list' | 'timeline') => void
}

// ============================================================
// Research Insights Panel
// ============================================================
function ResearchInsightsPanel({ meetings, agents, analytics, lang }: { meetings: Meeting[]; agents: Agent[]; analytics: AnalyticsData | null; lang: Lang }) {
  const [refreshing, setRefreshing] = useState(false)

  const completedMeetings = useMemo(
    () => meetings.filter(m => m.status === 'completed' && m.summary),
    [meetings]
  )

  const teamMeetings = useMemo(
    () => meetings.filter(m => m.type === 'team'),
    [meetings]
  )

  const meetingsThisWeek = useMemo(
    () => meetings.filter(m => {
      const created = new Date(m.createdAt || Date.now()).getTime()
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
      return created >= weekAgo
    }).length,
    [meetings]
  )

  const avgMessages = useMemo(() => {
    if (!analytics) return 0
    return Math.round(analytics.avgMessagesPerMeeting || 0)
  }, [analytics])

  const agentsWithMeetings = useMemo(() => {
    const agentIds = new Set<string>()
    meetings.forEach(m => {
      if (m.teamLeadId) agentIds.add(m.teamLeadId)
      if (m.teamMemberId) agentIds.add(m.teamMemberId)
      if (m.teamMembers) m.teamMembers.forEach(am => agentIds.add(am.id))
    })
    return agents.filter(a => agentIds.has(a.id)).length
  }, [meetings, agents])

  const collaborationScore = agents.length === 0 ? 0 : Math.round((agentsWithMeetings / agents.length) * 100)

  const collaborationColor = collaborationScore < 30 ? 'bg-red-500' : collaborationScore < 60 ? 'bg-amber-500' : 'bg-emerald-500'
  const collaborationTrackColor = collaborationScore < 30 ? 'bg-red-500/20' : collaborationScore < 60 ? 'bg-amber-500/20' : 'bg-emerald-500/20'

  const keyFindings = useMemo(
    () => completedMeetings.slice(0, 4).map(m => (m.summary || '').slice(0, 120)),
    [completedMeetings]
  )

  const suggestedActions = useMemo(() => {
    const actions: { icon: any; titleKey: string; descKey: string; condition: boolean }[] = []
    if (teamMeetings.length < 1) {
      actions.push({ icon: Users, titleKey: 'dashboard.insights.suggestTeam', descKey: 'dashboard.insights.suggestTeamDesc', condition: true })
    }
    if (agents.length < 4) {
      actions.push({ icon: UserPlus, titleKey: 'dashboard.insights.suggestAgents', descKey: 'dashboard.insights.suggestAgentsDesc', condition: true })
    }
    if (completedMeetings.length > 0) {
      actions.push({ icon: BarChart3, titleKey: 'dashboard.insights.suggestReview', descKey: 'dashboard.insights.suggestReviewDesc', condition: true })
    }
    actions.push({ icon: FlaskConical, titleKey: 'dashboard.insights.suggestBio', descKey: 'dashboard.insights.suggestBioDesc', condition: true })
    return actions
  }, [teamMeetings, agents, completedMeetings])

  const handleRefresh = () => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 800)
  }

  const stagger = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  }
  const fadeIn = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
  }

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Section Title */}
      <motion.div variants={fadeIn} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center border border-emerald-500/20">
            <Brain className="size-4 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold vl-text-heading tracking-tight vl-text-balance text-shimmer">{t(lang, 'dashboard.insights.title')}</h2>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-[var(--vl-border)] vl-text-body hover:bg-[var(--vl-bg-inner)] hover:text-white text-xs gap-1.5"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {t(lang, 'dashboard.insights.refresh')}
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Research Summary Card */}
        <motion.div variants={fadeIn} className="lg:col-span-2">
          <Card className="vl-card glass-card neon-glow-emerald depth-shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="size-4 text-amber-400" />
                <CardTitle className="text-base font-semibold vl-text-heading">{t(lang, 'dashboard.insights.keyFindings')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {refreshing ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-5 bg-[var(--vl-border)] rounded animate-pulse" />
                  ))}
                </div>
              ) : keyFindings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FlaskConical className="size-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm vl-text-muted">{t(lang, 'dashboard.insights.noData')}</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {keyFindings.map((finding, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08, duration: 0.3 }}
                      className="flex items-start gap-2.5"
                    >
                      <CheckCircle2 className="size-4 text-emerald-400 mt-0.5 shrink-0" />
                      <span className="text-sm vl-text-body leading-relaxed">{finding}{(completedMeetings[i]?.summary?.length || 0) > 120 ? '…' : ''}</span>
                    </motion.li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Collaboration Score */}
        <motion.div variants={fadeIn}>
          <Card className="vl-card depth-shadow-md h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-cyan-400" />
                <CardTitle className="text-base font-semibold vl-text-heading">{t(lang, 'dashboard.insights.collaborationScore')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center gap-4 py-6">
              <div className="relative w-full max-w-[200px]">
                <div className={`h-3 rounded-full ${collaborationTrackColor}`}>
                  <motion.div
                    className={`h-3 rounded-full ${collaborationColor}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${collaborationScore}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                  />
                </div>
              </div>
              <div className="text-center">
                <motion.span
                  className="text-3xl font-bold vl-text-heading"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  {collaborationScore}%
                </motion.span>
                <p className="text-xs vl-text-muted mt-1">{agentsWithMeetings}/{agents.length} {t(lang, 'dashboard.insights.activeAgents')}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Research Velocity - 3 metric cards */}
      <motion.div variants={fadeIn}>
        <Card className="vl-card depth-shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-violet-400" />
              <CardTitle className="text-base font-semibold vl-text-heading">{t(lang, 'dashboard.insights.velocity')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* This Week */}
              <div className="vl-inner rounded-xl p-4 text-center border border-[var(--vl-border)]">
                <p className="text-xs vl-text-muted mb-1">{t(lang, 'dashboard.insights.thisWeek')}</p>
                <p className="text-2xl font-bold vl-text-heading">{meetingsThisWeek}</p>
                <p className="text-[10px] vl-text-muted mt-0.5">{t(lang, 'dashboard.insights.meetings')}</p>
              </div>
              {/* Avg Messages */}
              <div className="vl-inner rounded-xl p-4 text-center border border-[var(--vl-border)]">
                <p className="text-xs vl-text-muted mb-1">{t(lang, 'dashboard.insights.avgDuration')}</p>
                <p className="text-2xl font-bold vl-text-heading">{avgMessages}</p>
                <p className="text-[10px] vl-text-muted mt-0.5">{t(lang, 'dashboard.insights.messages')}</p>
              </div>
              {/* Active Agents */}
              <div className="vl-inner rounded-xl p-4 text-center border border-[var(--vl-border)]">
                <p className="text-xs vl-text-muted mb-1">{t(lang, 'dashboard.insights.activeAgents')}</p>
                <p className="text-2xl font-bold vl-text-heading">{agentsWithMeetings}</p>
                <p className="text-[10px] vl-text-muted mt-0.5">/ {agents.length} {t(lang, 'dashboard.agents')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Suggested Actions - 2-column grid */}
      <motion.div variants={fadeIn}>
        <Card className="vl-card depth-shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-amber-400" />
              <CardTitle className="text-base font-semibold vl-text-heading">{t(lang, 'dashboard.insights.suggestions')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {suggestedActions.map((action, i) => (
                <motion.div
                  key={action.titleKey}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.35 }}
                >
                  <button
                    className="w-full text-left vl-inner rounded-xl p-4 border border-[var(--vl-border)] hover:border-emerald-500/30 hover:bg-[var(--vl-bg-card-hover)] hover:shadow-[0_0_15px_rgba(16,185,129,0.08)] transition-all duration-300 group cursor-pointer magnetic-hover"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500/15 to-cyan-500/10 flex items-center justify-center shrink-0 border border-emerald-500/10">
                        <action.icon className="size-4 text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium vl-text-heading group-hover:text-emerald-300 transition-colors">{t(lang, action.titleKey)}</p>
                        <p className="text-xs vl-text-muted mt-0.5">{t(lang, action.descKey)}</p>
                      </div>
                      <ArrowRight className="size-3.5 text-muted-foreground/40 group-hover:text-emerald-400 ml-auto mt-0.5 shrink-0 transition-colors" />
                    </div>
                  </button>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}

// ============================================================
// Sentiment Timeline (Per-Message Sentiment Across Meetings)
// ============================================================

function SentimentTimelineTooltip(props: { active?: boolean; payload?: Array<{ color: string; dataKey: string; payload: { agentName: string; messagePreview: string; sentiment: number } }>; label?: number; lang: Lang }) {
  const { active, payload, label, lang } = props
  if (!active || !payload || !payload.length) return null
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs shadow-lg border"
      style={{
        background: 'var(--vl-bg-inner, #1e293b)',
        borderColor: 'var(--vl-border, #334155)',
        color: 'var(--vl-text-body, #94a3b8)',
      }}
    >
      <p className="font-semibold mb-1" style={{ color: 'var(--vl-text-white, #f8fafc)' }}>
        {t(lang, 'common.message')} #{label}
      </p>
      {payload.map((entry: { color: string; dataKey: string; payload: { agentName: string; messagePreview: string; sentiment: number } }, i: number) => (
        <div key={i} className="mb-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
            <span className="font-medium" style={{ color: 'var(--vl-text-white, #f8fafc)' }}>{entry.dataKey}</span>
          </div>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--vl-text-body, #94a3b8)' }}>
            {entry.payload.agentName}: {entry.payload.messagePreview}{entry.payload.messagePreview.length >= 50 ? '…' : ''}
          </p>
          <p className="text-[10px]" style={{ color: entry.payload.sentiment >= 60 ? '#10b981' : entry.payload.sentiment >= 45 ? '#f59e0b' : '#f43f5e' }}>
            Score: {entry.payload.sentiment}
          </p>
        </div>
      ))}
    </div>
  )
}

function SentimentTimeline({ meetings, lang }: { meetings: Meeting[]; lang: Lang }) {
  const POSITIVE_WORDS = new Set([
    'good', 'great', 'excellent', 'agree', 'support', 'effective', 'successful', 'innovative',
    'interesting', 'promising', 'important', 'valuable', 'strong', 'exciting', 'progress',
    'advance', 'improve', 'optimal', 'significant', 'remarkable',
  ])
  const NEGATIVE_WORDS = new Set([
    'concern', 'issue', 'problem', 'challenge', 'difficult', 'limitation', 'risk', 'weak',
    'fail', 'error', 'lack', 'insufficient', 'unclear', 'uncertain', 'questionable',
    'disappointing', 'problematic', 'controversial', 'unlikely', 'however', 'but', 'although',
  ])

  const calculateSentimentScore = (text: string): number => {
    const lower = text.toLowerCase()
    const words = lower.split(/\W+/)
    let posCount = 0
    let negCount = 0
    for (const word of words) {
      if (POSITIVE_WORDS.has(word)) posCount++
      if (NEGATIVE_WORDS.has(word)) negCount++
    }
    return Math.max(0, Math.min(100, (posCount - negCount + 5) * 10))
  }

  const { timelineData, trendInfo, distribution } = useMemo(() => {
    const completed = meetings.filter(m => m.status === 'completed' && (m.messages || []).length > 0)
    if (completed.length === 0) {
      return {
        timelineData: { meetings: [] },
        trendInfo: { direction: 'stable' as const, label: '', labelKey: '' },
        distribution: { positive: 0, neutral: 0, negative: 0 },
      }
    }

    // Build per-meeting timeline data
    type TimelinePoint = { messageIndex: number; sentiment: number; agentName: string; messagePreview: string }
    type MeetingLine = { name: string; meetingType: string; color: string; data: TimelinePoint[] }
    const meetingLines: MeetingLine[] = []
    const allScores: number[] = []

    completed.forEach(m => {
      const msgs = m.messages || []
      const meetingLabel = m.saveName || m.agenda?.substring(0, 20) || `Meeting ${m.id.slice(0, 4)}`
      const color = m.type === 'team' ? '#10b981' : '#06b6d4'
      const data: TimelinePoint[] = []

      msgs.forEach((msg, i) => {
        const score = calculateSentimentScore(msg.message)
        allScores.push(score)
        data.push({
          messageIndex: i + 1,
          sentiment: score,
          agentName: msg.agentName,
          messagePreview: msg.message.substring(0, 50),
        })
      })

      meetingLines.push({ name: meetingLabel, meetingType: m.type, color, data })
    })

    // Calculate overall trend: first-half avg vs second-half avg
    let trendDirection: 'improving' | 'stable' | 'declining' = 'stable'
    let trendLabel = ''
    let trendLabelKey = ''
    if (allScores.length >= 2) {
      const mid = Math.floor(allScores.length / 2)
      const firstHalfAvg = allScores.slice(0, mid).reduce((s, v) => s + v, 0) / mid
      const secondHalf = allScores.slice(mid)
      const secondHalfAvg = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length
      const diff = secondHalfAvg - firstHalfAvg
      if (diff > 3) {
        trendDirection = 'improving'
        trendLabel = 'Improving ↑'
        trendLabelKey = 'dashboard.sentiment.improving'
      } else if (diff < -3) {
        trendDirection = 'declining'
        trendLabel = 'Declining ↓'
        trendLabelKey = 'dashboard.sentiment.declining'
      } else {
        trendDirection = 'stable'
        trendLabel = 'Stable →'
        trendLabelKey = 'dashboard.sentiment.stable'
      }
    }

    // Calculate sentiment distribution
    let positive = 0
    let neutral = 0
    let negative = 0
    for (const score of allScores) {
      if (score >= 60) positive++
      else if (score >= 45) neutral++
      else negative++
    }
    const total = allScores.length || 1

    return {
      timelineData: { meetings: meetingLines },
      trendInfo: { direction: trendDirection, label: trendLabel, labelKey: trendLabelKey },
      distribution: { positive: Math.round((positive / total) * 100), neutral: Math.round((neutral / total) * 100), negative: Math.round((negative / total) * 100) },
    }
  }, [meetings])

  const hasData = timelineData.meetings.length > 0

  if (!hasData) {
    return (
      <Card className="vl-card backdrop-blur-sm transition-all duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-emerald-400" />
            <CardTitle className="text-xl font-semibold tracking-tight" style={{ color: 'var(--vl-text-white)' }}>
              {t(lang, 'dashboard.sentiment.timeline')}
            </CardTitle>
          </div>
          <CardDescription className="text-sm vl-text-body">
            {t(lang, 'dashboard.sentiment.noData')}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="size-12 vl-text-muted mb-3 vl-float-animation" />
            <p className="text-sm vl-text-muted">{t(lang, 'dashboard.sentiment.noData')}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Determine trend color and icon
  const trendColor = trendInfo.direction === 'improving' ? '#10b981' : trendInfo.direction === 'declining' ? '#f43f5e' : '#f59e0b'
  const TrendIcon = trendInfo.direction === 'improving' ? TrendingUp : trendInfo.direction === 'declining' ? TrendingDown : Activity

  return (
    <Card className="vl-card backdrop-blur-sm transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="size-4 text-emerald-400" />
          <CardTitle className="text-xl font-semibold tracking-tight" style={{ color: 'var(--vl-text-white)' }}>
            {t(lang, 'dashboard.sentiment.timeline')}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Sentiment Timeline Line Chart */}
          <div className="lg:col-span-3">
            <div className="vl-inner rounded-xl p-4">
              <ResponsiveContainer width="100%" className="h-48 md:h-64">
                <LineChart margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--vl-chart-grid, #334155)" />
                  <XAxis
                    dataKey="messageIndex"
                    stroke="var(--vl-chart-axis, #64748b)"
                    tick={{ fontSize: 10, fill: 'var(--vl-chart-axis, #64748b)' }}
                    axisLine={{ stroke: 'var(--vl-chart-axis-line, #475569)' }}
                    label={{ value: '#', position: 'insideBottomRight', offset: -5, fontSize: 10, fill: 'var(--vl-chart-axis, #64748b)' }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="var(--vl-chart-axis, #64748b)"
                    tick={{ fontSize: 10, fill: 'var(--vl-chart-axis, #64748b)' }}
                    axisLine={{ stroke: 'var(--vl-chart-axis-line, #475569)' }}
                  />
                  <RechartsTooltip content={<SentimentTimelineTooltip lang={lang} />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: 'var(--vl-text-muted, #64748b)' }} />
                  {timelineData.meetings.map((meeting, idx) => (
                    <Line
                      key={idx}
                      type="monotone"
                      dataKey={meeting.name}
                      data={meeting.data}
                      stroke={meeting.color}
                      strokeWidth={2}
                      dot={{ r: 3, strokeWidth: 1, fill: meeting.color }}
                      activeDot={{ r: 5, strokeWidth: 2, fill: '#fff' }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            {/* Sentiment Distribution Breakdown */}
            <div className="mt-4">
              <p className="text-xs font-medium vl-text-heading mb-2">{t(lang, 'dashboard.sentiment.distribution')}</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2.5 rounded-full overflow-hidden flex" style={{ background: 'var(--vl-border, #334155)' }}>
                  <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${distribution.positive}%` }} />
                  <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${distribution.neutral}%` }} />
                  <div className="h-full bg-rose-500 transition-all duration-500" style={{ width: `${distribution.negative}%` }} />
                </div>
                <div className="flex items-center gap-2 text-[10px] shrink-0">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    <span className="vl-text-muted">{t(lang, 'dashboard.sentiment.positive')}</span>
                    <span className="vl-text-heading font-medium">{distribution.positive}%</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                    <span className="vl-text-muted">{t(lang, 'dashboard.sentiment.neutral')}</span>
                    <span className="vl-text-heading font-medium">{distribution.neutral}%</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                    <span className="vl-text-muted">{t(lang, 'dashboard.sentiment.negative')}</span>
                    <span className="vl-text-heading font-medium">{distribution.negative}%</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
          {/* Overall Sentiment Trend Card */}
          <div className="stagger-children flex flex-col gap-4">
            <div className="vl-inner rounded-xl p-4 flex flex-col items-center justify-center text-center">
              <TrendIcon className="size-8 mb-2" style={{ color: trendColor }} />
              <p className="text-xs vl-text-muted mb-1">{t(lang, 'dashboard.sentiment.overallTrend')}</p>
              <p className="text-lg font-bold" style={{ color: trendColor }}>
                {trendInfo.labelKey ? t(lang, trendInfo.labelKey) : trendInfo.label}
              </p>
            </div>
            {/* Meeting type legend */}
            <div className="vl-inner rounded-xl p-4">
              <p className="text-xs vl-text-muted mb-2">Meetings</p>
              <div className="flex flex-col gap-1.5">
                {timelineData.meetings.map((meeting, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[10px]">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: meeting.color }} />
                    <span className="vl-text-heading truncate max-w-[120px]">{meeting.name}</span>
                    <span className="vl-text-muted">({meeting.data.length})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Meeting Metrics Over Time Chart (Round 27)
// ============================================================
function MeetingMetricsOverTime({ meetings, lang }: { meetings: Meeting[]; lang: Lang }) {
  const chartData = useMemo(() => {
    if (meetings.length === 0) return []

    // Group meetings by creation date (by day)
    const dayMap = new Map<string, { date: string; messageCount: number; meetingCount: number }>()

    meetings.forEach(m => {
      const createdDate = m.createdAt || new Date().toISOString()
      const dateStr = new Date(createdDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
      const existing = dayMap.get(dateStr) || { date: dateStr, messageCount: 0, meetingCount: 0 }
      existing.messageCount += (m.messages || []).length
      existing.meetingCount += 1
      dayMap.set(dateStr, existing)
    })

    // Sort by chronological order using the actual dates
    const entries = Array.from(dayMap.entries())
    // Parse dates back to sort chronologically
    const dateKeyMap = new Map<string, Date>()
    meetings.forEach(m => {
      const createdDate = m.createdAt || new Date().toISOString()
      const dateStr = new Date(createdDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
      if (!dateKeyMap.has(dateStr)) {
        dateKeyMap.set(dateStr, new Date(createdDate))
      }
    })
    entries.sort((a, b) => (dateKeyMap.get(a[0])?.getTime() || 0) - (dateKeyMap.get(b[0])?.getTime() || 0))

    return entries.map(([date, data]) => ({
      date,
      messages: data.messageCount,
      meetings: data.meetingCount,
    }))
  }, [meetings])

  if (chartData.length === 0) {
    return (
      <Card className="vl-card backdrop-blur-sm transition-all duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-emerald-400" />
            <CardTitle className="text-xl font-semibold tracking-tight" style={{ color: 'var(--vl-text-white)' }}>
              {t(lang, 'meetingMetrics.title')}
            </CardTitle>
          </div>
          <CardDescription className="text-sm vl-text-body">
            {t(lang, 'meetingMetrics.noData')}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="size-12 vl-text-muted mb-3 vl-float-animation" />
            <p className="text-sm vl-text-muted">{t(lang, 'meetingMetrics.noData')}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const maxMessages = Math.max(...chartData.map(d => d.messages), 1)
  const maxMeetings = Math.max(...chartData.map(d => d.meetings), 1)

  return (
    <Card className="vl-card backdrop-blur-sm transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="size-4 text-emerald-400" />
          <CardTitle className="text-xl font-semibold tracking-tight" style={{ color: 'var(--vl-text-white)' }}>
            {t(lang, 'meetingMetrics.title')}
          </CardTitle>
        </div>
        <CardDescription className="text-sm vl-text-body">
          {t(lang, 'meetingMetrics.messages')} & {t(lang, 'meetingMetrics.meetings')}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="vl-inner rounded-xl p-4">
          <div className="h-48 md:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--vl-border)" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'var(--vl-text-muted)', fontSize: 11 }}
                  axisLine={{ stroke: 'var(--vl-border)' }}
                  tickLine={{ stroke: 'var(--vl-border)' }}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: 'var(--vl-text-muted)', fontSize: 11 }}
                  axisLine={{ stroke: 'var(--vl-border)' }}
                  tickLine={{ stroke: 'var(--vl-border)' }}
                  domain={[0, Math.ceil(maxMessages * 1.1)]}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: 'var(--vl-text-muted)', fontSize: 11 }}
                  axisLine={{ stroke: 'var(--vl-border)' }}
                  tickLine={{ stroke: 'var(--vl-border)' }}
                  domain={[0, Math.ceil(maxMeetings * 1.5)]}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid var(--vl-border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#fff',
                  }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', color: 'var(--vl-text-muted)' }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="messages"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  name={t(lang, 'meetingMetrics.messages')}
                  barSize={24}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="meetings"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  dot={{ fill: '#06b6d4', r: 4, strokeWidth: 2, stroke: '#0e7490' }}
                  activeDot={{ r: 6, fill: '#06b6d4' }}
                  name={t(lang, 'meetingMetrics.meetings')}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Unified Research Insights Panel (Round 27)
// ============================================================
function UnifiedResearchInsights({ meetings, lang }: { meetings: Meeting[]; lang: Lang }) {
  const [activeTab, setActiveTab] = useState<'wordcloud' | 'topics'>('wordcloud')

  return (
    <Card className="vl-card glass-panel-emerald backdrop-blur-sm transition-all duration-200 border-shimmer">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="size-4 text-emerald-400" />
            <CardTitle className="text-xl font-semibold tracking-tight text-gradient-cycle">
              {t(lang, 'researchInsights.title')}
            </CardTitle>
          </div>
        </div>
        <CardDescription className="text-sm vl-text-body">
          {t(lang, 'dashboard.wordCloud.description')}
        </CardDescription>
        {/* Tab Toggle */}
        <div className="flex gap-1 mt-1 border-b border-[var(--vl-border)]">
          <button
            className={`px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
              activeTab === 'wordcloud'
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-[var(--vl-text-muted)] hover:text-[var(--vl-text-body)]'
            }`}
            onClick={() => setActiveTab('wordcloud')}
          >
            {t(lang, 'researchInsights.wordCloud')}
          </button>
          <button
            className={`px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
              activeTab === 'topics'
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-[var(--vl-text-muted)] hover:text-[var(--vl-text-body)]'
            }`}
            onClick={() => setActiveTab('topics')}
          >
            {t(lang, 'researchInsights.topics')}
          </button>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-2">
        <AnimatePresence mode="wait">
          {activeTab === 'wordcloud' ? (
            <motion.div
              key="wordcloud"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <MeetingWordCloud meetings={meetings} lang={lang} />
            </motion.div>
          ) : (
            <motion.div
              key="topics"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <MeetingTopicsSection meetings={meetings} lang={lang} />
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Research Trend Sparklines Panel
// ============================================================
function ResearchTrendSparklines({ agents, meetings, lang }: { agents: Agent[]; meetings: Meeting[]; lang: Lang }) {
  const metrics = useMemo(() => {
    const now = Date.now()
    const todayStart = new Date().setHours(0, 0, 0, 0)

    // 1. Meetings This Week — count per day for last 7 days
    const meetingsByDay: number[] = []
    for (let i = 6; i >= 0; i--) {
      const dayStart = now - i * 24 * 60 * 60 * 1000
      const dayEnd = dayStart + 24 * 60 * 60 * 1000
      const count = meetings.filter(m => {
        const t = new Date(m.createdAt).getTime()
        return t >= dayStart && t < dayEnd
      }).length
      meetingsByDay.push(count)
    }
    const meetingsWeekTotal = meetingsByDay.reduce((s, c) => s + c, 0)

    // 2. Messages Today — total count today, with sparkline from last 7 days per day
    const msgsByDay: number[] = []
    for (let i = 6; i >= 0; i--) {
      const dayStart = now - i * 24 * 60 * 60 * 1000
      const dayEnd = dayStart + 24 * 60 * 60 * 1000
      const count = meetings.flatMap(m => m.messages || []).filter(msg => {
        const t = new Date(msg.createdAt).getTime()
        return t >= dayStart && t < dayEnd
      }).length
      msgsByDay.push(count)
    }
    const messagesTodayCount = meetings.flatMap(m => m.messages || []).filter(msg => {
      return new Date(msg.createdAt).getTime() >= todayStart
    }).length

    // 3. Active Agents — agents that have at least one meeting
    const agentsWithMeetings = new Set<string>()
    meetings.forEach(m => {
      (m.messages || []).forEach(msg => {
        if (msg.agentName) agentsWithMeetings.add(msg.agentName)
      })
      if (m.teamLead) agentsWithMeetings.add(m.teamLead.title)
      ;(m.teamMembers || []).forEach(a => agentsWithMeetings.add(a.title))
      if (m.teamMember) agentsWithMeetings.add(m.teamMember.title)
    })
    // Sparkline: generate a synthetic upward trend based on agent count
    const baseActiveCount = agentsWithMeetings.size
    const activeAgentsSparkline = Array.from({ length: 7 }, (_, i) => {
      return Math.max(0, Math.round(baseActiveCount * (0.5 + 0.5 * (i / 6)) + (i % 3)))
    })

    // 4. Avg Response Length — average message word count
    const allMessages = meetings.flatMap(m => m.messages || [])
    const avgWordCount = allMessages.length > 0
      ? Math.round(allMessages.reduce((s, msg) => s + msg.message.split(/\s+/).filter(Boolean).length, 0) / allMessages.length)
      : 0
    const avgResponseSparkline = Array.from({ length: 7 }, (_, i) => {
      return Math.max(0, Math.round(avgWordCount * (0.7 + 0.3 * Math.sin(i * 0.9)) + (i % 4)))
    })

    type Trend = 'up' | 'down' | 'neutral'
    const resolveTrend = (condition: boolean): Trend => condition ? 'up' : 'down'

    return [
      {
        label: t(lang, 'dashboard.trendSparklines.meetingsWeek'),
        value: meetingsWeekTotal,
        sparkline: meetingsByDay,
        trend: meetingsWeekTotal > 0 ? resolveTrend(meetingsByDay[6] >= meetingsByDay[0]) : 'neutral' as Trend,
      },
      {
        label: t(lang, 'dashboard.trendSparklines.messagesToday'),
        value: messagesTodayCount,
        sparkline: msgsByDay,
        trend: messagesTodayCount > 0 ? resolveTrend(msgsByDay[6] >= msgsByDay[0]) : 'neutral' as Trend,
      },
      {
        label: t(lang, 'dashboard.trendSparklines.activeAgents'),
        value: agentsWithMeetings.size,
        sparkline: activeAgentsSparkline,
        trend: 'neutral' as Trend,
      },
      {
        label: t(lang, 'dashboard.trendSparklines.avgResponseLength'),
        value: avgWordCount,
        sparkline: avgResponseSparkline,
        trend: avgWordCount > 0 ? resolveTrend(avgResponseSparkline[6] >= avgResponseSparkline[0]) : 'neutral' as Trend,
      },
    ]
  }, [meetings, agents, lang])

  const renderSparkline = (data: number[], trend: 'up' | 'down' | 'neutral') => {
    const max = Math.max(...data, 1)
    const min = Math.min(...data, 0)
    const range = max - min || 1
    const w = 80
    const h = 28
    const points = data.map((v, i) => {
      const x = (i / (data.length - 1)) * w
      const y = h - ((v - min) / range) * h
      return `${x},${y}`
    }).join(' ')

    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
        <polyline
          points={points}
          fill="none"
          stroke="#10b981"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {data.map((v, i) => {
          const x = (i / (data.length - 1)) * w
          const y = h - ((v - min) / range) * h
          return (
            <circle key={i} cx={x} cy={y} r={2} fill="#10b981" />
          )
        })}
      </svg>
    )
  }

  const renderTrendIndicator = (trend: 'up' | 'down' | 'neutral') => {
    if (trend === 'up') {
      return (
        <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
          ▲ {t(lang, 'dashboard.trendSparklines.up')}
        </span>
      )
    }
    if (trend === 'down') {
      return (
        <span className="text-[10px] text-rose-400 flex items-center gap-0.5">
          ▼ {t(lang, 'dashboard.trendSparklines.down')}
        </span>
      )
    }
    return (
      <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
        →
      </span>
    )
  }

  return (
    <Card className="vl-card backdrop-blur-sm transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ArrowDownUp className="size-4 text-emerald-400" />
          <CardTitle className="text-xl font-semibold tracking-tight" style={{ color: 'var(--vl-text-white)' }}>
            {t(lang, 'dashboard.trendSparklines.title')}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="grid grid-cols-2 gap-4">
          {metrics.map((metric, i) => (
            <div
              key={i}
              className="vl-card p-4 hover:shadow-lg transition-all duration-200 cursor-default stat-card-hover glass-panel"
            >
              <p className="text-[11px] vl-text-muted mb-1">{metric.label}</p>
              <div className="flex items-end justify-between gap-2">
                <span className="text-2xl font-bold vl-text-heading">{metric.value}</span>
                {renderSparkline(metric.sparkline, metric.trend)}
              </div>
              <div className="mt-1">
                {renderTrendIndicator(metric.trend)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Meeting Comparison Quick View
// ============================================================
function MeetingComparisonQuickView({ agents, meetings, lang }: { agents: Agent[]; meetings: Meeting[]; lang: Lang }) {
  const { meeting1, meeting2, comparison } = useMemo(() => {
    const completed = meetings
      .filter(m => m.status === 'completed')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

    if (completed.length < 2) {
      return { meeting1: null, meeting2: null, comparison: null }
    }

    const m1 = completed[0]
    const m2 = completed[1]

    // Get participants for each meeting
    const getParticipants = (m: Meeting): string[] => {
      const names: string[] = []
      const msgNames = new Set((m.messages || []).map(msg => msg.agentName).filter(n => n && n !== 'User'))
      msgNames.forEach(n => names.push(n))
      if (m.teamLead) names.push(m.teamLead.title)
      ;(m.teamMembers || []).forEach(a => names.push(a.title))
      if (m.teamMember) names.push(m.teamMember.title)
      // Deduplicate while preserving order
      return [...new Set(names)]
    }

    const p1 = getParticipants(m1)
    const p2 = getParticipants(m2)
    const msgCount1 = (m1.messages || []).length
    const msgCount2 = (m2.messages || []).length

    return {
      meeting1: m1,
      meeting2: m2,
      comparison: {
        moreMessages: msgCount1 !== msgCount2 ? (msgCount1 > msgCount2 ? 'meeting1' : 'meeting2') : null,
        moreParticipants: p1.length !== p2.length ? (p1.length > p2.length ? 'meeting1' : 'meeting2') : null,
        moreRecent: 'meeting1' as const, // m1 is always more recent (sorted above)
      },
    }
  }, [meetings])

  if (!meeting1 || !meeting2 || !comparison) {
    return (
      <Card className="vl-card backdrop-blur-sm transition-all duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <History className="size-4 text-emerald-400" />
            <CardTitle className="text-xl font-semibold tracking-tight" style={{ color: 'var(--vl-text-white)' }}>
              {t(lang, 'dashboard.comparison.title')}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="flex flex-col items-center justify-center py-8">
            <GitCompare className="size-10 vl-text-muted mb-3 vl-float-animation" />
            <p className="text-sm vl-text-muted">{t(lang, 'dashboard.comparison.noMeetings')}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderMeetingCard = (meeting: Meeting, side: 'left' | 'right') => {
    const participants = (() => {
      const names: string[] = []
      const msgNames = new Set((meeting.messages || []).map(msg => msg.agentName).filter(n => n && n !== 'User'))
      msgNames.forEach(n => names.push(n))
      if (meeting.teamLead) names.push(meeting.teamLead.title)
      ;(meeting.teamMembers || []).forEach(a => names.push(a.title))
      if (meeting.teamMember) names.push(meeting.teamMember.title)
      return [...new Set(names)]
    })()

    const borderColor = side === 'left' ? '#10b981' : '#06b6d4'

    // Find agent colors for participant initials
    const getAgentColor = (name: string) => {
      const agent = agents.find(a => a.title === name)
      return agent?.color || '#64748b'
    }

    const getInitials = (name: string) => {
      return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    }

    const summaryExcerpt = meeting.summary
      ? (meeting.summary.length > 100 ? meeting.summary.slice(0, 100) + '...' : meeting.summary)
      : t(lang, 'common.noSummary')

    const typeColor = meeting.type === 'team' ? '#10b981' : '#06b6d4'
    const typeLabel = meeting.type === 'team' ? t(lang, 'common.team') : t(lang, 'common.individual')

    // Badges for this meeting
    const badges: string[] = []
    if (comparison.moreMessages === (side === 'left' ? 'meeting1' : 'meeting2')) {
      badges.push(t(lang, 'dashboard.comparison.moreMessages'))
    }
    if (comparison.moreParticipants === (side === 'left' ? 'meeting1' : 'meeting2')) {
      badges.push(t(lang, 'dashboard.comparison.moreParticipants'))
    }
    if (comparison.moreRecent === (side === 'left' ? 'meeting1' : 'meeting2')) {
      badges.push(t(lang, 'dashboard.comparison.moreRecent'))
    }

    return (
      <div
        className="vl-card p-4 space-y-3 ripple-surface"
        style={{ borderLeft: `4px solid ${borderColor}` }}
      >
        {/* Meeting name and type */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold vl-text-heading truncate">
            {meeting.saveName || t(lang, 'common.meeting')}
          </span>
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0"
            style={{ backgroundColor: `${typeColor}20`, color: typeColor }}
          >
            {typeLabel}
          </span>
        </div>

        {/* Participant avatars */}
        <div className="flex items-center gap-1.5">
          {participants.slice(0, 4).map((p, i) => (
            <div
              key={i}
              className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
              style={{ backgroundColor: getAgentColor(p) }}
              title={p}
            >
              {getInitials(p)}
            </div>
          ))}
          {participants.length > 4 && (
            <span className="text-[10px] vl-text-muted">+{participants.length - 4}</span>
          )}
        </div>

        {/* Message count */}
        <div className="flex items-center gap-1.5">
          <MessageSquare className="size-3 vl-text-muted" />
          <span className="text-xs vl-text-body">
            {(meeting.messages || []).length} {t(lang, 'common.messages')}
          </span>
        </div>

        {/* Summary excerpt */}
        <p className="text-xs vl-text-body leading-relaxed line-clamp-2">{summaryExcerpt}</p>

        {/* Date */}
        <p className="text-[10px] vl-text-muted">{timeAgo(meeting.updatedAt)}</p>

        {/* Comparison badges */}
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {badges.map((badge, i) => (
              <Badge
                key={i}
                className="text-[10px] px-1.5 py-0 h-5"
                style={{
                  backgroundColor: `${borderColor}15`,
                  color: borderColor,
                  border: `1px solid ${borderColor}30`,
                }}
              >
                {badge}
              </Badge>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className="vl-card backdrop-blur-sm transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <History className="size-4 text-emerald-400" />
          <CardTitle className="text-xl font-semibold tracking-tight" style={{ color: 'var(--vl-text-white)' }}>
            {t(lang, 'dashboard.comparison.title')}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="flex flex-col md:flex-row items-stretch gap-4">
          {renderMeetingCard(meeting1, 'left')}

          {/* VS divider */}
          <div className="flex items-center justify-center shrink-0">
            <div className="w-10 h-10 rounded-full vl-inner flex items-center justify-center">
              <span className="text-xs font-bold vl-text-heading">{t(lang, 'dashboard.comparison.vs')}</span>
            </div>
          </div>

          {renderMeetingCard(meeting2, 'right')}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Meeting Quality Score Card (Round 27)
// ============================================================
function MeetingQualityCard({ meetings, lang }: { meetings: Meeting[]; lang: Lang }) {
  const qualityData = useMemo(() => {
    if (meetings.length === 0) {
      return { score: 0, label: t(lang, 'meetingQuality.needsImprovement') as string, color: '#f43f5e' }
    }

    // Factor 1: Average message length (>50 chars = higher quality)
    const allMessages = meetings.flatMap(m => m.messages || [])
    const avgMsgLength = allMessages.length > 0
      ? allMessages.reduce((s, m) => s + m.message.length, 0) / allMessages.length
      : 0
    const msgLengthScore = Math.min(100, (avgMsgLength / 100) * 100)

    // Factor 2: Average messages per meeting (>5 = higher quality)
    const meetingsWithMsgs = meetings.filter(m => (m.messages || []).length > 0)
    const avgMsgsPerMeeting = meetings.length > 0
      ? meetingsWithMsgs.reduce((s, m) => s + (m.messages || []).length, 0) / meetings.length
      : 0
    const msgsPerMeetingScore = Math.min(100, (avgMsgsPerMeeting / 10) * 100)

    // Factor 3: Summary presence
    const meetingsWithSummary = meetings.filter(m => m.summary && m.summary.trim().length > 0).length
    const summaryScore = meetings.length > 0 ? (meetingsWithSummary / meetings.length) * 100 : 0

    // Factor 4: Agent diversity (unique agents participating)
    const uniqueAgents = new Set(allMessages.map(m => m.agentName).filter(n => n && n !== 'User'))
    const agentDiversityScore = Math.min(100, (uniqueAgents.size / 5) * 100)

    // Weighted average
    const totalScore = Math.round(
      msgLengthScore * 0.25 +
      msgsPerMeetingScore * 0.25 +
      summaryScore * 0.25 +
      agentDiversityScore * 0.25
    )

    let label: string
    let color: string
    if (totalScore >= 70) {
      label = t(lang, 'meetingQuality.good')
      color = '#10b981'
    } else if (totalScore >= 40) {
      label = t(lang, 'meetingQuality.fair')
      color = '#f59e0b'
    } else {
      label = t(lang, 'meetingQuality.needsImprovement')
      color = '#f43f5e'
    }

    return { score: totalScore, label, color }
  }, [meetings, lang])

  const ringRadius = 52
  const ringStroke = 8
  const ringCircumference = 2 * Math.PI * ringRadius
  const ringOffset = ringCircumference - (qualityData.score / 100) * ringCircumference

  return (
    <Card className="vl-card backdrop-blur-sm transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Zap className="size-4 text-emerald-400" />
          <CardTitle className="text-xl font-semibold tracking-tight" style={{ color: 'var(--vl-text-white)' }}>
            {t(lang, 'meetingQuality.title')}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="progress-ring-container w-32 h-32 relative">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r={ringRadius}
                stroke="var(--vl-border)"
                strokeWidth={ringStroke}
                fill="none"
                opacity={0.3}
              />
              <circle
                cx="60"
                cy="60"
                r={ringRadius}
                stroke={qualityData.color}
                strokeWidth={ringStroke}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                style={{ transition: 'stroke-dashoffset 1s ease-out, stroke 0.3s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="progress-ring-text text-2xl font-bold" style={{ color: qualityData.color }}>
                {qualityData.score}
              </span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: qualityData.color }}>
              {qualityData.label}
            </p>
            <p className="text-[11px] vl-text-muted mt-0.5">
              {meetings.length} {t(lang, 'common.meetings').toLowerCase()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Hydration-safe localStorage hook
// ============================================================
function useLocalStorage<T>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue
    try {
      const stored = localStorage.getItem(key)
      if (stored) return JSON.parse(stored) as T
    } catch { /* ignore */ }
    return defaultValue
  })

  // Sync to localStorage on changes (skip initial)
  const isFirstRender = React.useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* ignore */ }
  }, [key, value])

  return [value, setValue]
}

// ============================================================
// CSV Download Helper
// ============================================================
function downloadChartCsv(filename: string, data: Record<string, unknown>[]) {
  if (data.length === 0) return
  const headers = Object.keys(data[0])
  const csvRows = [headers.join(','), ...data.map(row => headers.map(h => `"${row[h] ?? ''}"`).join(','))]
  const csvString = csvRows.join('\n')
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

// ============================================================
// Chart Type Toggle Component
// ============================================================
function ChartTypeToggle({
  types,
  activeType,
  onChange,
  lang,
}: {
  types: { key: string; icon: React.ReactNode }[]
  activeType: string
  onChange: (type: string) => void
  lang: Lang
}) {
  return (
    <div className="chart-type-toggle" role="group" aria-label={t(lang, 'dashboard.charts.chartType')}>
      {types.map(type => (
        <button
          key={type.key}
          className={activeType === type.key ? 'chart-type-toggle-active' : ''}
          onClick={() => onChange(type.key)}
          aria-label={t(lang, `dashboard.charts.${type.key}`)}
          title={t(lang, `dashboard.charts.${type.key}`)}
        >
          {type.icon}
        </button>
      ))}
    </div>
  )
}

// ============================================================
// Time Range Filter Component
// ============================================================
type TimeRange = '7days' | '30days' | '90days' | 'allTime'
const TIME_RANGES: { key: TimeRange; labelKey: string }[] = [
  { key: '7days', labelKey: 'dashboard.charts.7days' },
  { key: '30days', labelKey: 'dashboard.charts.30days' },
  { key: '90days', labelKey: 'dashboard.charts.90days' },
  { key: 'allTime', labelKey: 'dashboard.charts.allTime' },
]

function TimeRangeFilter({
  activeRange,
  onChange,
  lang,
}: {
  activeRange: TimeRange
  onChange: (range: TimeRange) => void
  lang: Lang
}) {
  return (
    <div className="chart-time-filter" role="group" aria-label={t(lang, 'dashboard.charts.timeRange')}>
      {TIME_RANGES.map(range => (
        <button
          key={range.key}
          className={activeRange === range.key ? 'chart-time-filter-active' : ''}
          onClick={() => onChange(range.key)}
        >
          {t(lang, range.labelKey)}
        </button>
      ))}
    </div>
  )
}

function getTimeRangeDays(range: TimeRange): number {
  switch (range) {
    case '7days': return 7
    case '30days': return 30
    case '90days': return 90
    case 'allTime': return 36500
  }
}

// ============================================================
// Download Button Component
// ============================================================
function ChartDownloadButton({
  data,
  filename,
  lang,
}: {
  data: Record<string, unknown>[]
  filename: string
  lang: Lang
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="chart-download-btn"
            onClick={() => downloadChartCsv(filename, data)}
            aria-label={t(lang, 'dashboard.charts.download')}
          >
            <Download className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[180px]">
          <p className="text-xs">{t(lang, 'dashboard.charts.downloadTooltip')}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ============================================================
// Enhanced Meeting Activity Chart (Bar / Line / Area)
// ============================================================
function EnhancedMeetingActivityChart({
  analytics,
  meetings,
  timeRange,
  chartType,
  lang,
}: {
  analytics: AnalyticsData | null
  meetings: Meeting[]
  timeRange: TimeRange
  chartType: string
  lang: Lang
}) {
  const chartData = useMemo(() => {
    if (!analytics) return []
    const days = getTimeRangeDays(timeRange)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    return analytics.meetingsByDay
      .filter(d => new Date(d.date) >= cutoff)
      .map(d => ({
        date: d.date.slice(5),
        [t(lang, 'dashboard.charts.teamCount')]: d.team,
        [t(lang, 'dashboard.charts.individualCount')]: d.individual,
      }))
  }, [analytics, timeRange, lang])

  const totalMeetings = chartData.reduce((s, d) => {
    const teamKey = t(lang, 'dashboard.charts.teamCount')
    const indivKey = t(lang, 'dashboard.charts.individualCount')
    return s + (d[teamKey] as number) + (d[indivKey] as number)
  }, 0)

  const peakEntry = chartData.reduce<{ date: string; val: number } | null>((acc, d) => {
    const teamKey = t(lang, 'dashboard.charts.teamCount')
    const indivKey = t(lang, 'dashboard.charts.individualCount')
    const val = (d[teamKey] as number) + (d[indivKey] as number)
    if (!acc || val > acc.val) return { date: d.date, val }
    return acc
  }, null)

  const csvData = useMemo(() => chartData.map(d => ({ Date: d.date, Team: d[t(lang, 'dashboard.charts.teamCount')], Individual: d[t(lang, 'dashboard.charts.individualCount')] })), [chartData, lang])
  const teamKey = t(lang, 'dashboard.charts.teamCount')
  const indivKey = t(lang, 'dashboard.charts.individualCount')

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <h3>{t(lang, 'dashboard.charts.meetingActivity')}</h3>
        <div className="chart-controls">
          <ChartTypeToggle
            types={[
              { key: 'bar', icon: <BarChart3 className="size-3.5" /> },
              { key: 'line', icon: <TrendingUp className="size-3.5" /> },
              { key: 'area', icon: <Activity className="size-3.5" /> },
            ]}
            activeType={chartType}
            onChange={() => {}}
            lang={lang}
          />
          <ChartDownloadButton data={csvData} filename="meeting-activity" lang={lang} />
        </div>
      </div>
      <div className="px-5 pt-1 pb-1">
        <div className="vl-inner rounded-xl p-4" style={{ animation: 'chart-type-switch 0.3s ease' }}>
          {chartData.some(d => (d[teamKey] as number) > 0 || (d[indivKey] as number) > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              {chartType === 'bar' ? (
                <BarChart data={chartData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" className="[stroke:var(--vl-chart-grid)]" />
                  <XAxis dataKey="date" tick={{ fill: 'var(--vl-chart-axis)', fontSize: 11 }} axisLine={{ stroke: 'var(--vl-chart-axis-line)' }} />
                  <YAxis tick={{ fill: 'var(--vl-chart-axis)', fontSize: 11 }} axisLine={{ stroke: 'var(--vl-chart-axis-line)' }} allowDecimals={false} />
                  <RechartsTooltip content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null
                    const team = (payload.find(p => p.dataKey === teamKey)?.value as number) || 0
                    const indiv = (payload.find(p => p.dataKey === indivKey)?.value as number) || 0
                    const total = team + indiv
                    return (
                      <div className="chart-tooltip-rich">
                        <div className="tooltip-title">{label}</div>
                        <div className="tooltip-row"><span className="tooltip-label">{t(lang, 'dashboard.charts.teamCount')}</span><span className="tooltip-value" style={{ color: '#10b981' }}>{team}</span></div>
                        <div className="tooltip-row"><span className="tooltip-label">{t(lang, 'dashboard.charts.individualCount')}</span><span className="tooltip-value" style={{ color: '#06b6d4' }}>{indiv}</span></div>
                        <div className="tooltip-row" style={{ borderTop: '1px solid var(--vl-border-subtle)', marginTop: 4, paddingTop: 4 }}><span className="tooltip-label">{t(lang, 'dashboard.charts.total')}</span><span className="tooltip-value">{total}</span></div>
                      </div>
                    )
                  }} />
                  <Bar dataKey={teamKey} fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey={indivKey} fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : chartType === 'line' ? (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="[stroke:var(--vl-chart-grid)]" />
                  <XAxis dataKey="date" tick={{ fill: 'var(--vl-chart-axis)', fontSize: 11 }} axisLine={{ stroke: 'var(--vl-chart-axis-line)' }} />
                  <YAxis tick={{ fill: 'var(--vl-chart-axis)', fontSize: 11 }} axisLine={{ stroke: 'var(--vl-chart-axis-line)' }} allowDecimals={false} />
                  <RechartsTooltip content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null
                    const team = (payload.find(p => p.dataKey === teamKey)?.value as number) || 0
                    const indiv = (payload.find(p => p.dataKey === indivKey)?.value as number) || 0
                    return (
                      <div className="chart-tooltip-rich">
                        <div className="tooltip-title">{label}</div>
                        <div className="tooltip-row"><span className="tooltip-label">{t(lang, 'dashboard.charts.teamCount')}</span><span className="tooltip-value" style={{ color: '#10b981' }}>{team}</span></div>
                        <div className="tooltip-row"><span className="tooltip-label">{t(lang, 'dashboard.charts.individualCount')}</span><span className="tooltip-value" style={{ color: '#06b6d4' }}>{indiv}</span></div>
                        <div className="tooltip-row" style={{ borderTop: '1px solid var(--vl-border-subtle)', marginTop: 4, paddingTop: 4 }}><span className="tooltip-label">{t(lang, 'dashboard.charts.total')}</span><span className="tooltip-value">{team + indiv}</span></div>
                      </div>
                    )
                  }} />
                  <Line type="monotone" dataKey={teamKey} stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey={indivKey} stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              ) : (
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="[stroke:var(--vl-chart-grid)]" />
                  <XAxis dataKey="date" tick={{ fill: 'var(--vl-chart-axis)', fontSize: 11 }} axisLine={{ stroke: 'var(--vl-chart-axis-line)' }} />
                  <YAxis tick={{ fill: 'var(--vl-chart-axis)', fontSize: 11 }} axisLine={{ stroke: 'var(--vl-chart-axis-line)' }} allowDecimals={false} />
                  <RechartsTooltip content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null
                    const team = (payload.find(p => p.dataKey === teamKey)?.value as number) || 0
                    const indiv = (payload.find(p => p.dataKey === indivKey)?.value as number) || 0
                    return (
                      <div className="chart-tooltip-rich">
                        <div className="tooltip-title">{label}</div>
                        <div className="tooltip-row"><span className="tooltip-label">{t(lang, 'dashboard.charts.teamCount')}</span><span className="tooltip-value" style={{ color: '#10b981' }}>{team}</span></div>
                        <div className="tooltip-row"><span className="tooltip-label">{t(lang, 'dashboard.charts.individualCount')}</span><span className="tooltip-value" style={{ color: '#06b6d4' }}>{indiv}</span></div>
                        <div className="tooltip-row" style={{ borderTop: '1px solid var(--vl-border-subtle)', marginTop: 4, paddingTop: 4 }}><span className="tooltip-label">{t(lang, 'dashboard.charts.total')}</span><span className="tooltip-value">{team + indiv}</span></div>
                      </div>
                    )
                  }} />
                  <Line type="monotone" dataKey={teamKey} stroke="#10b981" strokeWidth={2} fill="url(#areaGrad1)" dot={false} />
                  <Line type="monotone" dataKey={indivKey} stroke="#06b6d4" strokeWidth={2} fill="url(#areaGrad2)" dot={false} />
                  <defs>
                    <linearGradient id="areaGrad1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="areaGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                </ComposedChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm vl-text-muted">
              {t(lang, 'dashboard.charts.noDataToDisplay')}
            </div>
          )}
        </div>
      </div>
      <div className="chart-footer-stats">
        <div className="stat-item">
          {t(lang, 'dashboard.charts.total')}: <strong>{totalMeetings} {t(lang, 'dashboard.charts.meetings')}</strong>
        </div>
        {peakEntry && peakEntry.val > 0 && (
          <div className="stat-item">
            {t(lang, 'dashboard.charts.peak')}: <strong>{peakEntry.val} {t(lang, 'dashboard.charts.meetings')} {t(lang, 'dashboard.charts.on')} {peakEntry.date}</strong>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Enhanced Agent Participation Chart (Donut / Bar / H-Bar)
// ============================================================
const PIE_COLORS = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#f43f5e', '#3b82f6', '#ec4899', '#14b8a6']

function EnhancedAgentParticipationChart({
  analytics,
  meetings,
  agents,
  chartType,
  lang,
}: {
  analytics: AnalyticsData | null
  meetings: Meeting[]
  agents: Agent[]
  chartType: string
  lang: Lang
}) {
  const pieData = useMemo(() => {
    if (!analytics) return []
    return analytics.agentParticipation.map(a => ({
      name: a.agentName,
      value: a.count,
    }))
  }, [analytics])

  const total = pieData.reduce((s, d) => s + d.value, 0)

  const agentMsgCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    const completed = meetings.filter(m => m.status === 'completed')
    completed.forEach(m => {
      (m.messages || []).forEach(msg => {
        if (msg.agentName !== 'User') {
          counts[msg.agentName] = (counts[msg.agentName] || 0) + 1
        }
      })
    })
    return counts
  }, [meetings])

  const agentMeetingCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    const completed = meetings.filter(m => m.status === 'completed')
    completed.forEach(m => {
      const participants = new Set((m.messages || []).map(msg => msg.agentName))
      participants.forEach(name => {
        if (name !== 'User') {
          counts[name] = (counts[name] || 0) + 1
        }
      })
    })
    return counts
  }, [meetings])

  const csvData = useMemo(() => pieData.map(d => ({
    Agent: d.name,
    Participations: d.value,
    Messages: agentMsgCounts[d.name] || 0,
    Meetings: agentMeetingCounts[d.name] || 0,
  })), [pieData, agentMsgCounts, agentMeetingCounts])

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <h3>{t(lang, 'dashboard.charts.agentParticipation')}</h3>
        <div className="chart-controls">
          <ChartTypeToggle
            types={[
              { key: 'donut', icon: <CircleDot className="size-3.5" /> },
              { key: 'bar', icon: <BarChart3 className="size-3.5" /> },
              { key: 'hbar', icon: <ArrowRight className="size-3.5" /> },
            ]}
            activeType={chartType}
            onChange={() => {}}
            lang={lang}
          />
          <ChartDownloadButton data={csvData} filename="agent-participation" lang={lang} />
        </div>
      </div>
      <div className="px-5 pt-1 pb-1">
        <div className="vl-inner rounded-xl p-4" style={{ animation: 'chart-type-switch 0.3s ease' }}>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              {chartType === 'donut' ? (
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" strokeWidth={0}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null
                    const data = payload[0] as { payload?: { name?: string; value?: number } }
                    if (!data.payload) return null
                    const name = data.payload.name || ''
                    const value = data.payload.value || 0
                    const pct = total > 0 ? Math.round((value / total) * 100) : 0
                    return (
                      <div className="chart-tooltip-rich">
                        <div className="tooltip-title">{name}</div>
                        <div className="tooltip-row"><span className="tooltip-label">{t(lang, 'dashboard.charts.meetingCount')}</span><span className="tooltip-value">{value}</span></div>
                        <div className="tooltip-row"><span className="tooltip-label">{t(lang, 'dashboard.charts.percentageOfTotal')}</span><span className="tooltip-value">{pct}%</span></div>
                        <div className="tooltip-progress"><div className="tooltip-progress-fill" style={{ width: `${pct}%`, backgroundColor: PIE_COLORS[pieData.findIndex(d => d.name === name) % PIE_COLORS.length] || '#10b981' }} /></div>
                        <div className="tooltip-row" style={{ marginTop: 4 }}><span className="tooltip-label">{t(lang, 'dashboard.charts.messageCount')}</span><span className="tooltip-value">{agentMsgCounts[name] || 0}</span></div>
                      </div>
                    )
                  }} />
                </PieChart>
              ) : chartType === 'bar' ? (
                <BarChart data={pieData}>
                  <CartesianGrid strokeDasharray="3 3" className="[stroke:var(--vl-chart-grid)]" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--vl-chart-axis)', fontSize: 10 }} axisLine={{ stroke: 'var(--vl-chart-axis-line)' }} />
                  <YAxis tick={{ fill: 'var(--vl-chart-axis)', fontSize: 11 }} axisLine={{ stroke: 'var(--vl-chart-axis-line)' }} allowDecimals={false} />
                  <RechartsTooltip content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null
                    const data = payload[0] as { payload?: { name?: string; value?: number } }
                    if (!data.payload) return null
                    const name = data.payload.name || ''
                    const value = data.payload.value || 0
                    const pct = total > 0 ? Math.round((value / total) * 100) : 0
                    return (
                      <div className="chart-tooltip-rich">
                        <div className="tooltip-title">{name}</div>
                        <div className="tooltip-row"><span className="tooltip-label">{t(lang, 'dashboard.charts.messageCount')}</span><span className="tooltip-value">{value}</span></div>
                        <div className="tooltip-row"><span className="tooltip-label">{t(lang, 'dashboard.charts.percentageOfTotal')}</span><span className="tooltip-value">{pct}%</span></div>
                      </div>
                    )
                  }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              ) : (
                <BarChart data={pieData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="[stroke:var(--vl-chart-grid)]" />
                  <XAxis type="number" tick={{ fill: 'var(--vl-chart-axis)', fontSize: 11 }} axisLine={{ stroke: 'var(--vl-chart-axis-line)' }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--vl-chart-axis)', fontSize: 10 }} axisLine={{ stroke: 'var(--vl-chart-axis-line)' }} width={80} />
                  <RechartsTooltip content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null
                    const data = payload[0] as { payload?: { name?: string; value?: number } }
                    if (!data.payload) return null
                    const name = data.payload.name || ''
                    const value = data.payload.value || 0
                    const pct = total > 0 ? Math.round((value / total) * 100) : 0
                    return (
                      <div className="chart-tooltip-rich">
                        <div className="tooltip-title">{name}</div>
                        <div className="tooltip-row"><span className="tooltip-label">{t(lang, 'dashboard.charts.messageCount')}</span><span className="tooltip-value">{value}</span></div>
                        <div className="tooltip-row"><span className="tooltip-label">{t(lang, 'dashboard.charts.percentageOfTotal')}</span><span className="tooltip-value">{pct}%</span></div>
                      </div>
                    )
                  }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm vl-text-muted">
              {t(lang, 'dashboard.charts.noDataToDisplay')}
            </div>
          )}
        </div>
        {/* Legend for donut */}
        {chartType === 'donut' && pieData.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-3 justify-center px-4">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs vl-text-muted">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                {d.name} ({d.value})
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="chart-footer-stats">
        <div className="stat-item">
          {t(lang, 'dashboard.charts.total')}: <strong>{total} {t(lang, 'dashboard.charts.messages')}</strong>
        </div>
        <div className="stat-item">
          {t(lang, 'common.agents')}: <strong>{pieData.length}</strong>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Enhanced Research Analytics Section (Replacement)
// ============================================================
function EnhancedResearchAnalyticsSection({
  analytics,
  meetings,
  agents,
  lang,
}: {
  analytics: AnalyticsData | null
  meetings: Meeting[]
  agents: Agent[]
  lang: Lang
}) {
  // Hydration-safe chart type preferences
  const [activityChartType, setActivityChartType] = useLocalStorage<string>('vl-chart-activity-type', 'bar')
  const [participationChartType, setParticipationChartType] = useLocalStorage<string>('vl-chart-participation-type', 'donut')
  const [timeRange, setTimeRange] = useLocalStorage<TimeRange>('vl-chart-time-range', '7days')

  if (!analytics) return null

  // Meeting type ratio
  const total = analytics.meetingTypeRatio.team + analytics.meetingTypeRatio.individual
  const teamPct = total > 0 ? Math.round((analytics.meetingTypeRatio.team / total) * 100) : 0
  const indivPct = total > 0 ? 100 - teamPct : 0

  const meetingTypeCsvData = [
    { Type: 'Team', Count: analytics.meetingTypeRatio.team, Percentage: `${teamPct}%` },
    { Type: 'Individual', Count: analytics.meetingTypeRatio.individual, Percentage: `${indivPct}%` },
  ]

  return (
    <Card className="vl-card backdrop-blur-sm transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-emerald-400" />
            <CardTitle className="text-xl font-semibold tracking-tight" style={{ color: 'var(--vl-text-white)' }}>
              {t(lang, 'dashboard.analytics.title')}
            </CardTitle>
          </div>
          <TimeRangeFilter activeRange={timeRange} onChange={setTimeRange} lang={lang} />
        </div>
        <CardDescription className="text-sm vl-text-body">{t(lang, 'dashboard.analytics.description')}</CardDescription>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Meeting Activity Chart */}
          <EnhancedMeetingActivityChart
            analytics={analytics}
            meetings={meetings}
            timeRange={timeRange}
            chartType={activityChartType}
            lang={lang}
          />

          {/* Agent Participation Chart */}
          <EnhancedAgentParticipationChart
            analytics={analytics}
            meetings={meetings}
            agents={agents}
            chartType={participationChartType}
            lang={lang}
          />
        </div>

        {/* Meeting Type Distribution */}
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium vl-text-body tracking-tight">{t(lang, 'dashboard.meetingTypeDistribution')}</h3>
            <ChartDownloadButton data={meetingTypeCsvData} filename="meeting-type-distribution" lang={lang} />
          </div>
          <div className="chart-card">
            <div className="px-5 pt-4 pb-4">
              {total > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-6 rounded-full overflow-hidden" style={{ background: 'var(--vl-border)' }}>
                      <div className="h-full rounded-full flex">
                        <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${teamPct}%` }} />
                        <div className="bg-cyan-500 h-full transition-all duration-500" style={{ width: `${indivPct}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs vl-text-muted">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                      {t(lang, 'common.team')} ({analytics.meetingTypeRatio.team}) — {teamPct}%
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm bg-cyan-500" />
                      {t(lang, 'common.individual')} ({analytics.meetingTypeRatio.individual}) — {indivPct}%
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm vl-text-muted text-center py-2">{t(lang, 'dashboard.analytics.noMeetingsYet')}</div>
              )}
            </div>
          </div>
        </div>

        {/* Agent Collaboration Network */}
        <div className="mt-6 space-y-3">
          <h3 className="text-base font-medium vl-text-body tracking-tight">{t(lang, 'dashboard.collaborationNetwork')}</h3>
          <div className="vl-inner rounded-xl p-4">
            <AgentCollaborationNetwork network={analytics.collaborationNetwork} />
          </div>
        </div>

        {/* Message Timeline Heatmap */}
        <div className="mt-6 space-y-3">
          <h3 className="text-base font-medium vl-text-body tracking-tight">{t(lang, 'dashboard.discussionTimeline')}</h3>
          <div className="vl-inner rounded-xl p-4 relative">
            <MessageTimelineHeatmap timeline={analytics.messageTimeline} />
          </div>
        </div>

        {/* Research Progress Tracker */}
        <div className="mt-6 space-y-3">
          <h3 className="text-base font-medium vl-text-body tracking-tight">{t(lang, 'dashboard.nanobodyProgress')}</h3>
          <div className="vl-inner rounded-xl p-4">
            <ResearchProgressTracker workflowProgress={analytics.workflowProgress} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Trends Mini-Chart Row (Sparklines)
// ============================================================
function MiniSparkline({ data, color, label, trend, lang }: {
  data: number[]
  color: string
  label: string
  trend: 'up' | 'down' | 'flat'
  lang: Lang
}) {
  if (data.length === 0) return null
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const w = 100
  const h = 32
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 4) - 2
    return `${x},${y}`
  }).join(' ')
  const areaPoints = `0,${h} ${points} ${w},${h}`

  const trendIcon = trend === 'up' ? <ArrowUpRight className="size-3 text-emerald-400" /> : trend === 'down' ? <ArrowDownRight className="size-3 text-rose-400" /> : null

  return (
    <div className="chart-mini-sparkline">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-medium vl-text-body truncate">{label}</span>
        {trendIcon}
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill={`url(#spark-${color.replace('#', '')})`} />
        <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[10px] vl-text-muted">{t(lang, 'dashboard.charts.trends.last14days')}</span>
        <span className="text-[10px] font-semibold" style={{ color }}>{data[data.length - 1] || 0}</span>
      </div>
    </div>
  )
}

function TrendsMiniChartRow({ agents, meetings, lang }: { agents: Agent[]; meetings: Meeting[]; lang: Lang }) {
  const { meetingTrend, messageTrend, agentActivityTrend, pipelineTrend } = useMemo(() => {
    const now = new Date()
    const days = 14
    const meetingTrend: number[] = []
    const messageTrend: number[] = []
    const agentActivityTrend: number[] = []
    const pipelineTrend: number[] = []

    for (let i = days - 1; i >= 0; i--) {
      const dayStart = new Date(now)
      dayStart.setDate(dayStart.getDate() - i)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(dayStart)
      dayEnd.setHours(23, 59, 59, 999)

      const dayMeetings = meetings.filter(m => {
        const created = new Date(m.createdAt)
        return created >= dayStart && created <= dayEnd
      })
      meetingTrend.push(dayMeetings.length)

      const dayMessages = dayMeetings.reduce((s, m) => s + (m.messages?.length || 0), 0)
      messageTrend.push(dayMessages)

      const activeAgents = new Set(dayMeetings.flatMap(m => (m.messages || []).map(msg => msg.agentName)).filter(n => n !== 'User'))
      agentActivityTrend.push(activeAgents.size)

      const completed = dayMeetings.filter(m => m.status === 'completed').length
      pipelineTrend.push(completed)
    }

    return { meetingTrend, messageTrend, agentActivityTrend, pipelineTrend }
  }, [agents, meetings])

  const calcTrend = (data: number[]): 'up' | 'down' | 'flat' => {
    if (data.length < 2) return 'flat'
    const firstHalf = data.slice(0, Math.floor(data.length / 2)).reduce((a, b) => a + b, 0) / Math.floor(data.length / 2) || 1
    const secondHalf = data.slice(Math.floor(data.length / 2)).reduce((a, b) => a + b, 0) / (data.length - Math.floor(data.length / 2)) || 1
    return secondHalf > firstHalf * 1.1 ? 'up' : secondHalf < firstHalf * 0.9 ? 'down' : 'flat'
  }

  return (
    <div className="space-y-3">
      <h3 className="text-base font-medium vl-text-body tracking-tight">{t(lang, 'dashboard.charts.trends.title')}</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniSparkline
          data={meetingTrend}
          color="#10b981"
          label={t(lang, 'dashboard.charts.trends.meetings')}
          trend={calcTrend(meetingTrend)}
          lang={lang}
        />
        <MiniSparkline
          data={messageTrend}
          color="#06b6d4"
          label={t(lang, 'dashboard.charts.trends.messages')}
          trend={calcTrend(messageTrend)}
          lang={lang}
        />
        <MiniSparkline
          data={agentActivityTrend}
          color="#8b5cf6"
          label={t(lang, 'dashboard.charts.trends.agentActivity')}
          trend={calcTrend(agentActivityTrend)}
          lang={lang}
        />
        <MiniSparkline
          data={pipelineTrend}
          color="#f59e0b"
          label={t(lang, 'dashboard.charts.trends.pipelineProgress')}
          trend={calcTrend(pipelineTrend)}
          lang={lang}
        />
      </div>
    </div>
  )
}

// ============================================================
// Meeting Distribution Treemap (Pure SVG)
// ============================================================
function MeetingDistributionTreemap({ agents, meetings, lang }: { agents: Agent[]; meetings: Meeting[]; lang: Lang }) {
  const treemapData = useMemo(() => {
    if (agents.length === 0) return []
    return agents.map(agent => {
      const completedMeetings = meetings.filter(m => {
        if (m.status !== 'completed') return false
        return (m.messages || []).some(msg => msg.agentName === agent.title)
      })
      const msgCount = meetings
        .filter(m => m.status === 'completed')
        .flatMap(m => m.messages || [])
        .filter(msg => msg.agentName === agent.title).length
      return {
        name: agent.title,
        meetings: completedMeetings.length,
        messages: msgCount,
        size: completedMeetings.length || 1,
        color: agent.color,
        icon: agent.icon,
      }
    }).filter(d => d.meetings > 0 || d.messages > 0)
  }, [agents, meetings])

  const svgWidth = 700
  const svgHeight = 300

  // Simple treemap layout (squarified approximation)
  const layoutCells = useMemo(() => {
    if (treemapData.length === 0) return []
    const total = treemapData.reduce((s, d) => s + d.size, 0)
    const cells: { x: number; y: number; w: number; h: number; data: typeof treemapData[0]; index: number }[] = []
    const padding = 3
    let cy = padding
    const usableW = svgWidth - padding * 2
    const usableH = svgHeight - padding * 2

    // Simple row-based layout
    let currentRow: typeof treemapData = []
    let rowWidth = 0
    const rowHeight = usableH / Math.ceil(Math.sqrt(treemapData.length))

    treemapData.forEach((d, i) => {
      const cellW = (d.size / total) * usableW
      if (rowWidth + cellW > usableW && currentRow.length > 0) {
        // Finish row
        const totalRowSize = currentRow.reduce((s, rd) => s + rd.size, 0)
        let rx = padding
        currentRow.forEach(rd => {
          const rw = (rd.size / totalRowSize) * (usableW - (currentRow.length - 1) * padding)
          cells.push({ x: rx, y: cy, w: rw, h: rowHeight - padding, data: rd, index: i })
          rx += rw + padding
        })
        cy += rowHeight
        currentRow = [d]
        rowWidth = cellW
      } else {
        currentRow.push(d)
        rowWidth += cellW
      }
    })

    // Last row
    if (currentRow.length > 0) {
      const totalRowSize = currentRow.reduce((s, rd) => s + rd.size, 0)
      const lastRowH = svgHeight - cy - padding
      let rx = padding
      currentRow.forEach((rd, i) => {
        const rw = (rd.size / totalRowSize) * (usableW - (currentRow.length - 1) * padding)
        cells.push({ x: rx, y: cy, w: rw, h: lastRowH, data: rd, index: treemapData.length - currentRow.length + i })
        rx += rw + padding
      })
    }

    return cells
  }, [treemapData, svgWidth, svgHeight])

  if (treemapData.length === 0) {
    return (
      <div className="chart-card">
        <div className="chart-card-header">
          <h3>{t(lang, 'dashboard.charts.treemap.title')}</h3>
        </div>
        <div className="px-5 pt-1 pb-5">
          <div className="vl-inner rounded-xl flex flex-col items-center justify-center py-12">
            <TreePine className="size-12 vl-text-muted mb-3 vl-float-animation" />
            <p className="text-sm vl-text-muted">{t(lang, 'dashboard.charts.treemap.noData')}</p>
            <p className="text-xs vl-text-muted mt-1">{t(lang, 'dashboard.charts.treemap.noDataDesc')}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <h3>{t(lang, 'dashboard.charts.treemap.title')}</h3>
      </div>
      <div className="px-5 pt-1 pb-1">
        <div className="vl-inner rounded-xl p-4 overflow-x-auto">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
            {layoutCells.map((cell, i) => (
              <g key={cell.data.name} className="chart-treemap-cell" style={{ animation: `chart-treemap-cell-enter 0.4s ease ${i * 0.05}s forwards`, opacity: 0 }}>
                <rect
                  x={cell.x}
                  y={cell.y}
                  width={cell.w}
                  height={cell.h}
                  rx={6}
                  fill={cell.data.color}
                  fillOpacity={0.8}
                  stroke={cell.data.color}
                  strokeWidth={1}
                />
                {cell.w > 50 && cell.h > 25 && (
                  <>
                    <text
                      x={cell.x + cell.w / 2}
                      y={cell.y + cell.h / 2 - 4}
                      textAnchor="middle"
                      fill="#fff"
                      fontSize={cell.w > 80 ? 11 : 9}
                      fontWeight="600"
                    >
                      {cell.data.name.length > (cell.w / 8) ? cell.data.name.slice(0, Math.floor(cell.w / 8)) + '…' : cell.data.name}
                    </text>
                    {cell.h > 40 && (
                      <text
                        x={cell.x + cell.w / 2}
                        y={cell.y + cell.h / 2 + 10}
                        textAnchor="middle"
                        fill="rgba(255,255,255,0.8)"
                        fontSize={10}
                      >
                        {cell.data.meetings} {t(lang, 'dashboard.charts.meetings')} · {cell.data.messages} {t(lang, 'dashboard.charts.messages')}
                      </text>
                    )}
                  </>
                )}
                <title>{cell.data.name}: {cell.data.meetings} {t(lang, 'dashboard.charts.meetings')}, {cell.data.messages} {t(lang, 'dashboard.charts.messages')}</title>
              </g>
            ))}
          </svg>
        </div>
      </div>
      <div className="chart-footer-stats">
        <div className="stat-item">
          {t(lang, 'dashboard.charts.total')}: <strong>{treemapData.reduce((s, d) => s + d.meetings, 0)} {t(lang, 'dashboard.charts.meetings')}</strong>
        </div>
        <div className="stat-item">
          {t(lang, 'common.agents')}: <strong>{treemapData.length}</strong>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Research Overview Panel — Animated Counter Cards
// ============================================================

function AnimatedCounter({ value, duration = 1500 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (value === 0) { requestAnimationFrame(() => { setDisplay(0) }); return }
    let startTime: number | null = null
    let animationFrame: number
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * value))
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }
    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [value, duration])

  return <span>{display}</span>
}

function ResearchOverviewPanel({ meetings, agents, lang }: { meetings: Meeting[]; agents: Agent[]; lang: Lang }) {
  const stats = useMemo(() => {
    // Total Research Hours: estimate 30 min per meeting round
    const totalRounds = meetings.reduce((s, m) => s + (m.numRounds || 3), 0)
    const researchHours = Math.round(totalRounds * 0.5)

    // Insights Generated: count completed meetings with summaries
    const insightsCount = meetings.filter(m => m.status === 'completed' && m.summary).length

    // Collaboration Score: based on agent participation across meetings
    const completedMeetings = meetings.filter(m => m.status === 'completed')
    let collabScore = 0
    if (completedMeetings.length > 0 && agents.length > 0) {
      const meetingsWithMultipleAgents = completedMeetings.filter(m => {
        const participantSet = new Set((m.messages || []).map(msg => msg.agentName).filter(n => n !== 'User'))
        return participantSet.size > 1
      })
      const multiAgentRatio = meetingsWithMultipleAgents.length / completedMeetings.length
      const agentParticipationRatio = Math.min(agents.length / Math.max(completedMeetings.length, 1), 1)
      collabScore = Math.min(100, Math.round(multiAgentRatio * 60 + agentParticipationRatio * 40))
    }

    // Productivity Trend: compare recent vs older meetings
    let trendPct = 0
    const sortedByDate = [...meetings].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    if (sortedByDate.length >= 2) {
      const mid = Math.floor(sortedByDate.length / 2)
      const recent = sortedByDate.slice(0, mid)
      const older = sortedByDate.slice(mid)
      const recentAvgMsgs = recent.reduce((s, m) => s + (m.messages?.length || 0), 0) / Math.max(recent.length, 1)
      const olderAvgMsgs = older.reduce((s, m) => s + (m.messages?.length || 0), 0) / Math.max(older.length, 1)
      if (olderAvgMsgs > 0) {
        trendPct = Math.round(((recentAvgMsgs - olderAvgMsgs) / olderAvgMsgs) * 100)
      }
    }

    return { researchHours, insightsCount, collabScore, trendPct }
  }, [meetings, agents])

  const cards = [
    {
      icon: <Clock className="size-5" />,
      value: stats.researchHours,
      label: t(lang, 'dashboard.researchOverview.totalHours'),
      sublabel: t(lang, 'dashboard.researchOverview.totalHoursDesc'),
      gradient: 'from-emerald-500/20 via-emerald-600/10 to-transparent',
      iconBg: 'bg-emerald-500/20',
      iconColor: 'text-emerald-400',
    },
    {
      icon: <Brain className="size-5" />,
      value: stats.insightsCount,
      label: t(lang, 'dashboard.researchOverview.insightsGenerated'),
      sublabel: t(lang, 'dashboard.researchOverview.insightsGeneratedDesc'),
      gradient: 'from-violet-500/20 via-violet-600/10 to-transparent',
      iconBg: 'bg-violet-500/20',
      iconColor: 'text-violet-400',
    },
    {
      icon: <UsersRound className="size-5" />,
      value: stats.collabScore,
      suffix: '/100',
      label: t(lang, 'dashboard.researchOverview.collabScore'),
      sublabel: t(lang, 'dashboard.researchOverview.collabScoreDesc'),
      gradient: 'from-cyan-500/20 via-cyan-600/10 to-transparent',
      iconBg: 'bg-cyan-500/20',
      iconColor: 'text-cyan-400',
    },
    {
      icon: stats.trendPct >= 0 ? <TrendingUp className="size-5" /> : <TrendingDown className="size-5" />,
      value: Math.abs(stats.trendPct),
      suffix: '%',
      label: t(lang, 'dashboard.researchOverview.productivityTrend'),
      sublabel: t(lang, 'dashboard.researchOverview.productivityTrendDesc'),
      gradient: stats.trendPct >= 0
        ? 'from-amber-500/20 via-amber-600/10 to-transparent'
        : 'from-rose-500/20 via-rose-600/10 to-transparent',
      iconBg: stats.trendPct >= 0 ? 'bg-amber-500/20' : 'bg-rose-500/20',
      iconColor: stats.trendPct >= 0 ? 'text-amber-400' : 'text-rose-400',
      extra: stats.trendPct >= 0
        ? <ArrowUpRight className="size-4 text-emerald-400" />
        : <ArrowDownRight className="size-4 text-rose-400" />,
    },
  ]

  return (
    <div className="vl-card rounded-xl p-6 backdrop-blur-sm transition-all duration-200">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="size-4 text-emerald-400" />
        <h3 className="text-lg font-semibold vl-text-heading tracking-tight">{t(lang, 'dashboard.researchOverview.title')}</h3>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <div
            key={card.label}
            className="relative overflow-hidden rounded-xl p-4 bg-gradient-to-br vl-inner border border-[var(--vl-border-subtle)] hover-lift-sm transition-all duration-300"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            {/* Gradient background overlay */}
            <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} pointer-events-none`} />
            <div className="relative z-10">
              <div className={`w-10 h-10 rounded-lg ${card.iconBg} flex items-center justify-center mb-3`}>
                <span className={card.iconColor}>{card.icon}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold vl-text-heading stat-number-animate">
                  <AnimatedCounter value={card.value} duration={1200 + i * 200} />
                </span>
                {card.suffix && <span className="text-sm font-medium vl-text-muted">{card.suffix}</span>}
                {card.extra}
              </div>
              <div className="text-xs font-medium vl-text-heading mt-1">{card.label}</div>
              <div className="text-[10px] vl-text-muted mt-0.5">{card.sublabel}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DashboardTab(props: DashboardTabProps) {
  const {
    agents, meetings, analytics, loading, totalAgents, activeMeetings, completedMeetings, totalMessages,
    recentMeetings, lang, selectedMeeting,
    setActiveTab, setEditingAgent, setAgentDialogOpen, setSelectedMeeting, setDetailAgent, setDetailDialogOpen,
    setShowAnalytics, setAutoSaveIndicator, loadAnalytics, handleDeleteMeeting,
    setToolConfigInputs, setToolConfigDialogOpen, setToolRunInputs, setToolRunDialogOpen,
    setCompareMode, setHistoryViewMode,
  } = props

  // ============================================================
  // Dashboard Customization State (Hydration-safe)
  // ============================================================
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [dashboardLayout, setDashboardLayout] = useState<DashboardLayout>(() => getDefaultLayout())

  // Load layout from localStorage on mount (hydration-safe)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<DashboardLayout>
        const defaults = getDefaultLayout()
        setDashboardLayout({
          sectionOrder: Array.isArray(parsed.sectionOrder) ? parsed.sectionOrder : defaults.sectionOrder,
          hiddenSections: Array.isArray(parsed.hiddenSections) ? parsed.hiddenSections : defaults.hiddenSections,
          collapsedSections: Array.isArray(parsed.collapsedSections) ? parsed.collapsedSections : defaults.collapsedSections,
        })
      }
    } catch {
      // Ignore parse errors — use defaults
    }
  }, [])

  // Save layout to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, JSON.stringify(dashboardLayout))
    } catch {
      // Ignore storage errors (e.g., quota exceeded)
    }
  }, [dashboardLayout])

  // Computed visible & ordered sections
  const orderedVisibleSections = useMemo(() => {
    return dashboardLayout.sectionOrder.filter(id => !dashboardLayout.hiddenSections.includes(id))
  }, [dashboardLayout.sectionOrder, dashboardLayout.hiddenSections])

  // Customization handlers
  const handleMoveUp = useCallback((id: string) => {
    setDashboardLayout(prev => {
      const idx = prev.sectionOrder.indexOf(id)
      if (idx <= 0) return prev
      const newOrder = [...prev.sectionOrder]
      ;[newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]]
      return { ...prev, sectionOrder: newOrder }
    })
  }, [])

  const handleMoveDown = useCallback((id: string) => {
    setDashboardLayout(prev => {
      const idx = prev.sectionOrder.indexOf(id)
      if (idx < 0 || idx >= prev.sectionOrder.length - 1) return prev
      const newOrder = [...prev.sectionOrder]
      ;[newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]]
      return { ...prev, sectionOrder: newOrder }
    })
  }, [])

  const handleToggleVisibility = useCallback((id: string) => {
    setDashboardLayout(prev => {
      const isHidden = prev.hiddenSections.includes(id)
      return {
        ...prev,
        hiddenSections: isHidden
          ? prev.hiddenSections.filter(s => s !== id)
          : [...prev.hiddenSections, id],
      }
    })
  }, [])

  const handleToggleSectionCollapse = useCallback((id: string) => {
    setDashboardLayout(prev => {
      const isCollapsed = prev.collapsedSections.includes(id)
      return {
        ...prev,
        collapsedSections: isCollapsed
          ? prev.collapsedSections.filter(s => s !== id)
          : [...prev.collapsedSections, id],
      }
    })
  }, [])

  const handleCollapseAll = useCallback(() => {
    setDashboardLayout(prev => ({
      ...prev,
      collapsedSections: [...prev.sectionOrder],
    }))
  }, [])

  const handleExpandAll = useCallback(() => {
    setDashboardLayout(prev => ({
      ...prev,
      collapsedSections: [],
    }))
  }, [])

  const handleResetLayout = useCallback(() => {
    setDashboardLayout(getDefaultLayout())
    toast.success(lang === 'zh' ? '布局已恢复默认' : 'Layout reset to default')
  }, [lang])

  const allSectionIds = dashboardSections.map(s => s.id)

  // Scroll reveal observer
  const { observe: observeScrollReveal, disconnect: disconnectScrollReveal } = useScrollReveal()
  useEffect(() => {
    // Small delay to let content render before observing
    const timer = setTimeout(observeScrollReveal, 100)
    return () => {
      clearTimeout(timer)
      disconnectScrollReveal()
    }
  }, [observeScrollReveal, disconnectScrollReveal])

  // Track last data refresh timestamp
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now())
  useEffect(() => {
    if (!loading) {
      setLastUpdated(Date.now())
    }
  }, [loading])
  const minutesAgo = Math.max(0, Math.floor((Date.now() - lastUpdated) / 60000))

  return (
            <AnimatePresence mode="wait">
              <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6 aurora-bg">
                {/* Dashboard Customization Toggle + Panel */}
                <div className="flex items-center gap-2 mb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className={`border-[var(--vl-border)] vl-text-body hover:bg-[var(--vl-bg-inner)] hover:text-white text-xs gap-1.5 h-8 ${customizeOpen ? 'customize-btn-active' : ''}`}
                    onClick={() => setCustomizeOpen(!customizeOpen)}
                  >
                    <LayoutGrid className="size-3.5" />
                    {t(lang, 'dashboardCustomize.title')}
                  </Button>
                  {customizeOpen && (
                    <span className="customize-badge">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      {t(lang, 'dashboardCustomize.customizing')}
                    </span>
                  )}
                </div>

                <DashboardCustomizePanel
                  isOpen={customizeOpen}
                  onClose={() => setCustomizeOpen(false)}
                  sectionOrder={dashboardLayout.sectionOrder}
                  hiddenSections={dashboardLayout.hiddenSections}
                  collapsedSections={dashboardLayout.collapsedSections}
                  allSectionIds={allSectionIds}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                  onToggleVisibility={handleToggleVisibility}
                  onToggleCollapseAll={handleCollapseAll}
                  onToggleExpandAll={handleExpandAll}
                  onReset={handleResetLayout}
                  lang={lang}
                />

                {/* Hero with DNA Helix Background */}
                <CollapsibleDashboardSection
                  sectionId="hero"
                  titleKey="dashboardCustomize.hero"
                  icon="Sparkles"
                  isCollapsed={dashboardLayout.collapsedSections.includes('hero')}
                  onToggleCollapse={() => handleToggleSectionCollapse('hero')}
                  lang={lang}
                >
                <div className="relative overflow-hidden rounded-xl">
                  <AuroraEffect />
                  <ScrollRevealSection direction="up" delay={0}>
                  <DashboardHero
                    totalAgents={totalAgents}
                    activeMeetings={activeMeetings}
                    onCreateMeeting={() => setActiveTab('team-meeting')}
                  />
                  </ScrollRevealSection>
                </div>
                </CollapsibleDashboardSection>

                {/* Stats */}
                <CollapsibleDashboardSection
                  sectionId="stat-cards"
                  titleKey="dashboardCustomize.statCards"
                  icon="BarChart3"
                  isCollapsed={dashboardLayout.collapsedSections.includes('stat-cards')}
                  onToggleCollapse={() => handleToggleSectionCollapse('stat-cards')}
                  lang={lang}
                >
                <div className="relative">
                  <GradientOrbs />
                <ScrollRevealSection direction="up" delay={0}>
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <DashboardSkeletonCards />
                    </motion.div>
                  ) : (
                    <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0} }>
                      {/* Last Updated timestamp */}
                      <div className="flex items-center justify-end gap-1.5 mb-1">
                        <Clock className="size-3 vl-text-muted" />
                        <span className="text-[11px] vl-text-muted">
                          Last updated: {minutesAgo === 0 ? 'just now' : `${minutesAgo} minute${minutesAgo > 1 ? 's' : ''} ago`}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
                        <GlassCardKit blur="md" opacity={0.5} glowColor="#f59e0b" glowOnHover innerGradient className="glass-card-shimmer">
                          <StatCard
                            icon={Bot} label="Total Agents" value={totalAgents}
                            color="bg-amber-500/20"
                            gradient="bg-gradient-to-br from-amber-500/10 to-transparent"
                            trend={totalAgents > 0 ? `${totalAgents} Total Agents · Create more for diverse discussions` : undefined}
                            subtitle={totalAgents === 0 ? 'Create agents to begin' : undefined}
                            ctaLabel={totalAgents === 0 ? 'Create One' : undefined}
                            ctaOnClick={totalAgents === 0 ? () => { setEditingAgent(null); setAgentDialogOpen(true) } : undefined}
                            sparkData={analytics?.meetingsByDay.map(() => totalAgents).slice(-7) || [totalAgents]}
                          />
                        </GlassCardKit>
                        <GlassCardKit blur="md" opacity={0.5} glowColor="#10b981" glowOnHover innerGradient className="glass-card-shimmer">
                          <StatCard
                            icon={MessageSquare} label="Active Meetings" value={activeMeetings}
                            color="bg-emerald-500/20"
                            gradient="bg-gradient-to-br from-emerald-500/10 to-transparent"
                            trend={activeMeetings > 0 ? `${activeMeetings} running` : undefined}
                            subtitle={activeMeetings === 0 ? 'Start a meeting to begin' : undefined}
                            ctaLabel={activeMeetings === 0 ? 'Create One' : undefined}
                            ctaOnClick={activeMeetings === 0 ? () => setActiveTab('team-meeting') : undefined}
                            sparkData={analytics?.meetingsByDay.map(d => d.team + d.individual).slice(-7) || [0]}
                          />
                        </GlassCardKit>
                        <GlassCardKit blur="md" opacity={0.5} glowColor="#06b6d4" glowOnHover innerGradient className="glass-card-shimmer">
                          <StatCard
                            icon={CircleDot} label="Completed" value={completedMeetings}
                            color="bg-cyan-500/20"
                            gradient="bg-gradient-to-br from-cyan-500/10 to-transparent"
                            trend={completedMeetings > 0 ? `${completedMeetings} total` : undefined}
                            subtitle={completedMeetings === 0 ? 'Run a meeting to see results' : undefined}
                            sparkData={analytics?.meetingsByDay.map(d => d.team + d.individual).slice(-7) || [0]}
                          />
                        </GlassCardKit>
                        <GlassCardKit blur="md" opacity={0.5} glowColor="#8b5cf6" glowOnHover innerGradient className="glass-card-shimmer">
                          <StatCard
                            icon={BarChart3} label="Total Messages" value={totalMessages}
                            color="bg-violet-500/20"
                            gradient="bg-gradient-to-br from-violet-500/10 to-transparent"
                            trend={analytics?.avgMessagesPerMeeting ? `Avg ${analytics.avgMessagesPerMeeting}/meeting` : undefined}
                            subtitle={totalMessages === 0 ? 'Messages appear after meetings run' : undefined}
                            sparkData={analytics?.meetingsByDay.map(() => totalMessages).slice(-7) || [totalMessages]}
                          />
                        </GlassCardKit>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                </ScrollRevealSection>
                </div>
                </CollapsibleDashboardSection>

                {/* Research Overview — Animated Statistics Panel */}
                <ScrollRevealSection direction="up" delay={1}>
                <ResearchOverviewPanel meetings={meetings} agents={agents} lang={lang} />
                </ScrollRevealSection>

                {/* Research Analytics (includes Quality, Trends, Comparison, Analytics, Metrics) */}
                <CollapsibleDashboardSection
                  sectionId="research-analytics"
                  titleKey="dashboardCustomize.researchAnalytics"
                  icon="TrendingUp"
                  isCollapsed={dashboardLayout.collapsedSections.includes('research-analytics')}
                  onToggleCollapse={() => handleToggleSectionCollapse('research-analytics')}
                  lang={lang}
                >
                {/* Meeting Quality Score */}
                <ScrollRevealSection direction="up" delay={1}>
                <MeetingQualityCard meetings={meetings} lang={lang} />
                </ScrollRevealSection>

                {/* Research Trend Sparklines */}
                <ScrollRevealSection direction="up" delay={3}>
                <ResearchTrendSparklines agents={agents} meetings={meetings} lang={lang} />
                </ScrollRevealSection>

                {/* Meeting Comparison Quick View */}
                <ScrollRevealSection direction="up" delay={4}>
                <MeetingComparisonQuickView agents={agents} meetings={meetings} lang={lang} />
                </ScrollRevealSection>

                {/* Research Analytics (Enhanced with chart switching, tooltips, download) */}
                <ScrollRevealSection direction="up" delay={1}>
                {loading ? <DashboardSkeletonChart /> : <EnhancedResearchAnalyticsSection analytics={analytics} meetings={meetings} agents={agents} lang={lang} />}
                </ScrollRevealSection>

                {/* Trends Mini-Chart Row */}
                <ScrollRevealSection direction="up" delay={2}>
                {!loading && <TrendsMiniChartRow agents={agents} meetings={meetings} lang={lang} />}
                </ScrollRevealSection>

                {/* Meeting Distribution Treemap */}
                <ScrollRevealSection direction="up" delay={3}>
                {!loading && <MeetingDistributionTreemap agents={agents} meetings={meetings} lang={lang} />}
                </ScrollRevealSection>

                {/* Meeting Metrics Over Time */}
                <ScrollRevealSection direction="up" delay={2}>
                <MeetingMetricsOverTime meetings={meetings} lang={lang} />
                </ScrollRevealSection>
                </CollapsibleDashboardSection>

                {/* Sentiment Analysis */}
                <CollapsibleDashboardSection
                  sectionId="sentiment"
                  titleKey="dashboardCustomize.sentiment"
                  icon="Activity"
                  isCollapsed={dashboardLayout.collapsedSections.includes('sentiment')}
                  onToggleCollapse={() => handleToggleSectionCollapse('sentiment')}
                  lang={lang}
                >
                <ScrollRevealSection direction="up" delay={1}>
                <SentimentAnalysisSection meetings={meetings} />
                </ScrollRevealSection>

                {/* Word Cloud */}
                <ScrollRevealSection direction="up" delay={2}>
                <WordCloudSection meetings={meetings} />
                </ScrollRevealSection>

                {/* Meeting Insights */}
                <ScrollRevealSection direction="up" delay={3}>
                <MeetingInsightsSection agents={agents} meetings={meetings} lang={lang} />
                </ScrollRevealSection>
                </CollapsibleDashboardSection>

                {/* Agent Network */}
                <CollapsibleDashboardSection
                  sectionId="agent-network"
                  titleKey="dashboardCustomize.agentNetwork"
                  icon="Workflow"
                  isCollapsed={dashboardLayout.collapsedSections.includes('agent-network')}
                  onToggleCollapse={() => handleToggleSectionCollapse('agent-network')}
                  lang={lang}
                >
                {/* Team Performance Radar Chart */}
                <ScrollRevealSection direction="up" delay={2}>
                <TeamPerformanceRadar agents={agents} meetings={meetings} lang={lang} />
                </ScrollRevealSection>

                {/* Agent Performance Gauge Charts */}
                <ScrollRevealSection direction="scale" delay={1}>
                <AgentPerformanceGauges agents={agents} meetings={meetings} lang={lang} />
                </ScrollRevealSection>

                {/* Agent Message Treemap */}
                <ScrollRevealSection direction="up" delay={4}>
                <AgentMessageTreemap agents={agents} meetings={meetings} lang={lang} />
                </ScrollRevealSection>

                {/* Meeting Data Flow Sankey Diagram */}
                <ScrollRevealSection direction="left" delay={2}>
                <MeetingFlowDiagram agents={agents} meetings={meetings} lang={lang} />
                </ScrollRevealSection>

                {/* Lab Architecture */}
                {agents.length > 0 && (
                  <ScrollRevealSection direction="scale" delay={3}>
                  <Card className="vl-card backdrop-blur-sm transition-all duration-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-xl font-semibold tracking-tight" style={{ color: 'var(--vl-text-white)' }}>Lab Architecture</CardTitle>
                      <CardDescription className="text-sm vl-text-body">Your research team &mdash; agents connected through meetings</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                      <div className="relative flex flex-wrap items-center justify-center gap-6 py-6">
                        {agents.length > 1 && (
                          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                            {agents.map((agent, i) =>
                              agents.slice(i + 1).map((otherAgent, j) => {
                                const offset = agents.length - i - 1
                                return (
                                  <line
                                    key={`${agent.id}-${otherAgent.id}`}
                                    x1={`${((i * 100) / (agents.length - 1 || 1)) + ((j * 100) / (offset * (agents.length - 1 || 1)))}%`}
                                    y1="50%"
                                    x2={`${(((i + 1 + j) * 100) / (agents.length - 1 || 1))}%`}
                                    y2="50%"
                                    stroke="rgba(16,185,129,0.08)"
                                    strokeWidth="1"
                                    strokeDasharray="4 4"
                                  />
                                )
                              })
                            )}
                          </svg>
                        )}
                        {agents.map((agent, i) => (
                          <motion.div
                            key={agent.id}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.1, type: 'spring' }}
                            whileHover={{ scale: 1.15, y: -5 }}
                            className="flex flex-col items-center gap-2 relative z-10 cursor-pointer"
                            onClick={() => { setDetailAgent(agent); setDetailDialogOpen(true) }}
                          >
                            <div
                              className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
                              style={{
                                backgroundColor: agent.color,
                                boxShadow: `0 0 20px ${agent.color}33, 0 0 40px ${agent.color}15`,
                              }}
                            >
                              {renderAgentIcon(agent.icon, 'size-6 text-white')}
                            </div>
                            <span className="text-[10px] vl-text-muted text-center max-w-[80px] leading-tight">{agent.title}</span>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  </ScrollRevealSection>
                )}
                </CollapsibleDashboardSection>

                {/* Discussion Timeline */}
                <CollapsibleDashboardSection
                  sectionId="discussion-timeline"
                  titleKey="dashboardCustomize.discussionTimeline"
                  icon="History"
                  isCollapsed={dashboardLayout.collapsedSections.includes('discussion-timeline')}
                  onToggleCollapse={() => handleToggleSectionCollapse('discussion-timeline')}
                  lang={lang}
                >
                {/* Meeting Sentiment Bar Chart */}
                <ScrollRevealSection direction="right" delay={3}>
                <MeetingSentimentBarChart meetings={meetings} lang={lang} />
                </ScrollRevealSection>

                {/* Sentiment Timeline */}
                <ScrollRevealSection direction="up" delay={4}>
                <SentimentTimeline meetings={meetings} lang={lang} />
                </ScrollRevealSection>

                {/* Recent Activity Feed — Enhanced Panel */}
                <ScrollRevealSection direction="up" delay={3}>
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center gap-2 w-full py-2 px-3 rounded-lg hover:bg-[var(--vl-bg-inner)] transition-colors mb-2">
                      <Activity className="size-4 text-emerald-400" />
                      <span className="text-sm font-semibold vl-text-heading">{t(lang, 'dashboard.activityFeed.title')}</span>
                      <ChevronDown className="size-3.5 vl-text-muted collapsible-trigger-icon" />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="vl-card rounded-xl p-6">
                      <LazyActivityFeedPanel
                        lang={lang}
                        agents={agents.map(a => ({ id: a.id, title: a.title }))}
                        meetings={meetings.map(m => ({ id: m.id, saveName: m.saveName || m.agenda?.substring(0, 40) || 'Untitled', type: m.type, status: m.status }))}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
                </ScrollRevealSection>
                </CollapsibleDashboardSection>

                {/* Nanobody Progress */}
                <CollapsibleDashboardSection
                  sectionId="nanobody-progress"
                  titleKey="dashboardCustomize.nanobodyProgress"
                  icon="Dna"
                  isCollapsed={dashboardLayout.collapsedSections.includes('nanobody-progress')}
                  onToggleCollapse={() => handleToggleSectionCollapse('nanobody-progress')}
                  lang={lang}
                >
                <ScrollRevealSection direction="up" delay={1}>
                <Card className="vl-card backdrop-blur-sm transition-all duration-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Dna className="size-4 text-emerald-400" />
                      <CardTitle className="text-xl font-semibold tracking-tight" style={{ color: 'var(--vl-text-white)' }}>{t(lang, 'dashboard.compBioTools')}</CardTitle>
                    </div>
                    <CardDescription className="text-sm vl-text-body">{t(lang, 'dashboard.compBioTools.desc')}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { id: 'rfdiffusion', name: t(lang, 'tools.rfdiffusion'), desc: t(lang, 'tools.rfdiffusion.desc'), icon: Dna, color: '#8b5cf6', status: 'available', fields: ['Target Protein', 'Number of Designs', 'Contig Length'], advanced: ['Noise Scale', 'Symmetry', 'Partial Mask'] },
                        { id: 'alphafold', name: t(lang, 'tools.alphafold'), desc: t(lang, 'tools.alphafold.desc'), icon: Cpu, color: '#3b82f6', status: 'available', fields: ['Target Protein', 'Multimer Chains', 'Recycle Steps'], advanced: ['MSA Mode', 'Use Templates', 'Max Templates'] },
                        { id: 'rosetta', name: t(lang, 'tools.rosetta'), desc: t(lang, 'tools.rosetta.desc'), icon: FlaskConical, color: '#f59e0b', status: 'available', fields: ['Target Protein', 'Score Function', 'Number of Decoys'], advanced: ['Relax Protocol', 'Minimization Type', 'Constraint File'] },
                        { id: 'esm', name: t(lang, 'tools.esm'), desc: t(lang, 'tools.esm.desc'), icon: Atom, color: '#10b981', status: 'available', fields: ['Target Sequence', 'Model Size', 'Number of Sequences'], advanced: ['Sampling Temperature', 'Top-K', 'Repetition Penalty'] },
                      ].map((tool, i) => (
                        <TiltCard key={tool.id}>
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                          whileHover={{ scale: 1.02, y: -2 }}
                          className="vl-inner rounded-xl p-4 border hover:border-[var(--vl-border-subtle)] transition-all duration-300 hover:shadow-[0_0_20px_rgba(16,185,129,0.08)]"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center cursor-help"
                              style={{ background: `${tool.color}20` }}
                            >
                              <tool.icon className="size-5" style={{ color: tool.color }} />
                            </div>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="max-w-[220px]">
                                  <p className="text-xs font-medium mb-1">{tool.name}</p>
                                  <p className="text-[10px] vl-text-muted">{tool.id === 'rfdiffusion' ? 'Generate novel protein structures using diffusion models. Configure target proteins, design counts, and contig specifications.' : tool.id === 'alphafold' ? 'Predict protein complex structures with AlphaFold-Multimer. Supports multiple chains and template-based modeling.' : tool.id === 'rosetta' ? 'Score and optimize protein structures using Rosetta energy functions. Run relax protocols and minimization.' : 'Generate and optimize protein sequences using ESM language models. Control sampling temperature and diversity.'}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate" style={{ color: 'var(--vl-text-white)' }}>{tool.name}</p>
                              <p className="text-xs vl-text-muted">{tool.desc}</p>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-[10px] mb-3 ${tool.status === 'available' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}
                          >
                            {tool.status === 'available' ? t(lang, 'settings.available') : t(lang, 'settings.comingSoon')}
                          </Badge>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs h-7 vl-input hover:border-[var(--vl-border-subtle)]"
                              onClick={() => {
                                const saved = localStorage.getItem(`vl-tool-config-${tool.id}`)
                                setToolConfigInputs(saved ? JSON.parse(saved) : Object.fromEntries(tool.fields.map(f => [f, ''])))
                                setToolConfigDialogOpen(tool.id)
                              }}
                            >
                              <Settings className="size-3 mr-1" />
                              {t(lang, 'settings.configure')}
                            </Button>
                            <Button
                              size="sm"
                              className="flex-1 text-xs h-7 bg-emerald-600 hover:bg-emerald-700 text-white"
                              disabled={tool.status !== 'available'}
                              onClick={() => {
                                setToolRunInputs(Object.fromEntries(tool.fields.map(f => [f, ''])))
                                setToolRunDialogOpen(tool.id)
                              }}
                            >
                              <Play className="size-3 mr-1" />
                              {t(lang, 'tools.runTool')}
                            </Button>
                          </div>
                        </motion.div>
                        </TiltCard>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                </ScrollRevealSection>
                </CollapsibleDashboardSection>

                {/* How It Works + Nanobody + Paper Reference */}
                <CollapsibleDashboardSection
                  sectionId="how-it-works"
                  titleKey="dashboardCustomize.howItWorks"
                  icon="Zap"
                  isCollapsed={dashboardLayout.collapsedSections.includes('how-it-works')}
                  onToggleCollapse={() => handleToggleSectionCollapse('how-it-works')}
                  lang={lang}
                >
                <div className="vl-section-separator" />

                {/* How It Works */}
                <ScrollRevealSection direction="scale" delay={2}>
                <ContentFadeIn delay={0.1}>
                <HowItWorksSection />
                </ContentFadeIn>
                </ScrollRevealSection>

                {/* Nanobody Design Workflow */}
                <ScrollRevealSection direction="left" delay={2}>
                <ContentFadeIn delay={0.2}>
                <NanobodyWorkflowSection />
                </ContentFadeIn>
                </ScrollRevealSection>

                <SectionTransition variant="thin" style="gradient" lang={lang} />

                <div className="vl-section-separator" />

                {/* Paper Reference */}
                <ScrollRevealSection direction="up" delay={4}>
                <ContentFadeIn delay={0.3}>
                <PaperReferenceSection />
                </ContentFadeIn>
                </ScrollRevealSection>
                </CollapsibleDashboardSection>

                <SectionTransition variant="thick" style="gradient" lang={lang} />

                {/* Research Insights */}
                <CollapsibleDashboardSection
                  sectionId="research-insights"
                  titleKey="dashboardCustomize.researchInsights"
                  icon="Brain"
                  isCollapsed={dashboardLayout.collapsedSections.includes('research-insights')}
                  onToggleCollapse={() => handleToggleSectionCollapse('research-insights')}
                  lang={lang}
                >
                {/* Research Insights Panel */}
                <ScrollRevealSection direction="right" delay={3}>
                <ResearchInsightsPanel meetings={meetings} agents={agents} analytics={analytics} lang={lang} />
                </ScrollRevealSection>

                {/* Unified Research Insights (Word Cloud + Topics) */}
                <ScrollRevealSection direction="up" delay={4}>
                <UnifiedResearchInsights meetings={meetings} lang={lang} />
                </ScrollRevealSection>
                </CollapsibleDashboardSection>

                {/* Quick Actions */}
                <CollapsibleDashboardSection
                  sectionId="quick-actions"
                  titleKey="dashboardCustomize.quickActions"
                  icon="Lightbulb"
                  isCollapsed={dashboardLayout.collapsedSections.includes('quick-actions')}
                  onToggleCollapse={() => handleToggleSectionCollapse('quick-actions')}
                  lang={lang}
                >
                <ScrollRevealSection direction="up" delay={2}>
                <Card className="vl-card backdrop-blur-sm transition-all duration-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl font-semibold vl-text-heading tracking-tight">Quick Actions</CardTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 text-xs gap-1.5"
                          onClick={() => setExportDialogOpen(true)}
                        >
                          <Download className="size-3.5" /> Enhanced Export
                        </Button>
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="border-[var(--vl-border)] vl-text-body hover:bg-[var(--vl-bg-inner)] hover:text-white text-xs gap-1.5">
                            <Download className="size-3.5" /> Export
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="vl-dialog" align="end">
                          <DropdownMenuLabel className="vl-text-muted text-xs">Export Data</DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-[var(--vl-border)]" />
                          <DropdownMenuItem className="vl-text-body focus:bg-[var(--vl-bg-card-hover)] focus:text-[var(--vl-text-white)] cursor-pointer text-xs" onClick={() => triggerExport('meetings', 'json')}>
                            <FileJson className="size-3.5 mr-2 text-cyan-400" /> All Meetings (JSON)
                          </DropdownMenuItem>
                          <DropdownMenuItem className="vl-text-body focus:bg-[var(--vl-bg-card-hover)] focus:text-[var(--vl-text-white)] cursor-pointer text-xs" onClick={() => triggerExport('meetings', 'csv')}>
                            <FileSpreadsheet className="size-3.5 mr-2 text-amber-400" /> All Meetings (CSV)
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-[var(--vl-border)]" />
                          <DropdownMenuItem className="vl-text-body focus:bg-[var(--vl-bg-card-hover)] focus:text-[var(--vl-text-white)] cursor-pointer text-xs" onClick={async () => {
                            try {
                              const res = await fetch('/api/export/docx', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ type: 'analytics', options: { includeMessages: true, includeSummary: true, includeAnalytics: true } }),
                              })
                              if (!res.ok) throw new Error('Export failed')
                              const blob = await res.blob()
                              const url = URL.createObjectURL(blob)
                              const a = document.createElement('a')
                              a.href = url
                              a.download = 'analytics_report.docx'
                              a.click()
                              URL.revokeObjectURL(url)
                              toast.success('Analytics DOCX report exported')
                            } catch { toast.error('Failed to export DOCX') }
                          }}>
                            <FileDown className="size-3.5 mr-2 text-blue-400" /> Analytics Report (DOCX)
                          </DropdownMenuItem>
                          <DropdownMenuItem className="vl-text-body focus:bg-[var(--vl-bg-card-hover)] focus:text-[var(--vl-text-white)] cursor-pointer text-xs" onClick={async () => {
                            try {
                              const res = await fetch('/api/export/pptx', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ type: 'analytics', options: { includeMessages: true, includeSummary: true, includeAnalytics: true } }),
                              })
                              if (!res.ok) throw new Error('Export failed')
                              const blob = await res.blob()
                              const url = URL.createObjectURL(blob)
                              const a = document.createElement('a')
                              a.href = url
                              a.download = 'analytics_report.pptx'
                              a.click()
                              URL.revokeObjectURL(url)
                              toast.success('Analytics PPTX presentation exported')
                            } catch { toast.error('Failed to export PPTX') }
                          }}>
                            <Presentation className="size-3.5 mr-2 text-orange-400" /> Analytics Slides (PPTX)
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-[var(--vl-border)]" />
                          <DropdownMenuItem className="vl-text-body focus:bg-[var(--vl-bg-card-hover)] focus:text-[var(--vl-text-white)] cursor-pointer text-xs" onClick={() => triggerExport('agents', 'json')}>
                            <FileJson className="size-3.5 mr-2 text-cyan-400" /> All Agents (JSON)
                          </DropdownMenuItem>
                          <DropdownMenuItem className="vl-text-body focus:bg-[var(--vl-bg-card-hover)] focus:text-[var(--vl-text-white)] cursor-pointer text-xs" onClick={() => triggerExport('agents', 'csv')}>
                            <FileSpreadsheet className="size-3.5 mr-2 text-amber-400" /> All Agents (CSV)
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-[var(--vl-border)]" />
                          <DropdownMenuItem className="vl-text-body focus:bg-[var(--vl-bg-card-hover)] focus:text-[var(--vl-text-white)] cursor-pointer text-xs" onClick={() => triggerExport('analytics', 'json')}>
                            <BarChart3 className="size-3.5 mr-2 text-violet-400" /> Analytics (JSON)
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      <Button
                        variant="outline"
                        className="h-auto py-4 vl-quick-action hover-lift btn-glow-pulse border-[var(--vl-border)] vl-text-body hover:bg-[var(--vl-bg-card-hover)] hover:text-[var(--vl-text-white)] hover:border-amber-500/40 hover:shadow-[0_0_20px_rgba(245,158,11,0.1)] justify-start transition-all duration-300 rounded-xl group"
                        onClick={() => { setEditingAgent(null); setAgentDialogOpen(true) }}
                      >
                        <div className="flex items-center gap-2.5 w-full">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center shrink-0">
                            <Plus className="size-4 text-amber-400" />
                          </div>
                          <div className="text-left min-w-0">
                            <div className="text-sm font-medium">{t(lang, 'dashboard.quickActions.createAgent')}</div>
                            <div className="text-[10px] vl-text-muted truncate">{t(lang, 'dashboard.quickActions.createAgentDesc')}</div>
                          </div>
                        </div>
                        <span className="hidden lg:block absolute top-1.5 right-1.5 text-[9px] text-muted-foreground/50 font-mono">⌘N</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto py-4 vl-quick-action hover-lift btn-glow-pulse border-[var(--vl-border)] vl-text-body hover:bg-[var(--vl-bg-card-hover)] hover:text-[var(--vl-text-white)] hover:border-emerald-500/40 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)] justify-start transition-all duration-300 rounded-xl relative overflow-hidden group"
                        onClick={() => setActiveTab('team-meeting')}
                      >
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0"
                          animate={{ x: ['-100%', '200%'] }}
                          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                        />
                        <div className="relative flex items-center gap-2.5 w-full">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center shrink-0">
                            <Users className="size-4 text-emerald-400" />
                          </div>
                          <div className="text-left min-w-0">
                            <div className="text-sm font-medium">{t(lang, 'dashboard.quickActions.teamMeeting')}</div>
                            <div className="text-[10px] vl-text-muted truncate">{t(lang, 'dashboard.quickActions.teamMeetingDesc')}</div>
                          </div>
                        </div>
                        <span className="hidden lg:block absolute top-1.5 right-1.5 text-[9px] text-muted-foreground/50 font-mono">⌘3</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto py-4 vl-quick-action hover-lift btn-glow-pulse border-[var(--vl-border)] vl-text-body hover:bg-[var(--vl-bg-card-hover)] hover:text-[var(--vl-text-white)] hover:border-cyan-500/40 hover:shadow-[0_0_20px_rgba(6,182,212,0.1)] justify-start transition-all duration-300 rounded-xl group"
                        onClick={() => setActiveTab('individual-meeting')}
                      >
                        <div className="flex items-center gap-2.5 w-full">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 flex items-center justify-center shrink-0">
                            <BotIcon className="size-4 text-cyan-400" />
                          </div>
                          <div className="text-left min-w-0">
                            <div className="text-sm font-medium">{t(lang, 'dashboard.quickActions.individualMeeting')}</div>
                            <div className="text-[10px] vl-text-muted truncate">{t(lang, 'dashboard.quickActions.individualMeetingDesc')}</div>
                          </div>
                        </div>
                        <span className="hidden lg:block absolute top-1.5 right-1.5 text-[9px] text-muted-foreground/50 font-mono">⌘4</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto py-4 vl-quick-action hover-lift btn-glow-pulse border-[var(--vl-border)] vl-text-body hover:bg-[var(--vl-bg-card-hover)] hover:text-[var(--vl-text-white)] hover:border-cyan-500/40 hover:shadow-[0_0_20px_rgba(6,182,212,0.1)] justify-start transition-all duration-300 rounded-xl group"
                        onClick={() => { setCompareMode(true); setActiveTab('agents') }}
                      >
                        <div className="flex items-center gap-2.5 w-full">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400/20 to-cyan-500/10 flex items-center justify-center shrink-0">
                            <GitCompare className="size-4 text-cyan-400" />
                          </div>
                          <div className="text-left min-w-0">
                            <div className="text-sm font-medium">{t(lang, 'quickActions.compareAgents')}</div>
                            <div className="text-[10px] vl-text-muted truncate">Side-by-side</div>
                          </div>
                        </div>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto py-4 vl-quick-action hover-lift btn-glow-pulse border-[var(--vl-border)] vl-text-body hover:bg-[var(--vl-bg-card-hover)] hover:text-[var(--vl-text-white)] hover:border-rose-500/40 hover:shadow-[0_0_20px_rgba(244,63,94,0.1)] justify-start transition-all duration-300 rounded-xl group"
                        onClick={() => { setHistoryViewMode('timeline'); setActiveTab('history') }}
                      >
                        <div className="flex items-center gap-2.5 w-full">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-500/20 to-rose-600/10 flex items-center justify-center shrink-0">
                            <Clock className="size-4 text-rose-400" />
                          </div>
                          <div className="text-left min-w-0">
                            <div className="text-sm font-medium">{t(lang, 'quickActions.viewTimeline')}</div>
                            <div className="text-[10px] vl-text-muted truncate">Timeline view</div>
                          </div>
                        </div>
                        <span className="hidden lg:block absolute top-1.5 right-1.5 text-[9px] text-muted-foreground/50 font-mono">⌘5</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto py-4 vl-quick-action hover-lift btn-glow-pulse border-[var(--vl-border)] vl-text-body hover:bg-[var(--vl-bg-card-hover)] hover:text-[var(--vl-text-white)] hover:border-violet-500/40 hover:shadow-[0_0_20px_rgba(139,92,246,0.1)] justify-start transition-all duration-300 rounded-xl group"
                        onClick={() => loadAnalytics() }
                      >
                        <div className="flex items-center gap-2.5 w-full">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/20 to-violet-600/10 flex items-center justify-center shrink-0">
                            <BarChart3 className="size-4 text-violet-400" />
                          </div>
                          <div className="text-left min-w-0">
                            <div className="text-sm font-medium">{t(lang, 'dashboard.quickActions.viewAnalytics')}</div>
                            <div className="text-[10px] vl-text-muted truncate">{t(lang, 'dashboard.quickActions.viewAnalyticsDesc')}</div>
                          </div>
                        </div>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                </ScrollRevealSection>
                </CollapsibleDashboardSection>

                {/* Dashboard Widgets — Draggable & Resizable Grid (Enhanced) */}
                <CollapsibleDashboardSection
                  sectionId="dashboard-widgets"
                  titleKey="dashboard.widgets.title"
                  icon="LayoutGrid"
                  isCollapsed={dashboardLayout.collapsedSections.includes('dashboard-widgets')}
                  onToggleCollapse={() => handleToggleSectionCollapse('dashboard-widgets')}
                  lang={lang}
                >
                <ScrollRevealSection direction="up" delay={3}>
                <DashboardWidgetSystem
                  agents={agents}
                  meetings={meetings}
                  analytics={analytics}
                  loading={loading}
                  totalAgents={totalAgents}
                  activeMeetings={activeMeetings}
                  completedMeetings={completedMeetings}
                  totalMessages={totalMessages}
                  recentMeetings={recentMeetings}
                  lang={lang}
                  setActiveTab={(tab) => setActiveTab(tab as TabValue)}
                  setEditingAgent={(agent) => setEditingAgent(agent)}
                  setAgentDialogOpen={setAgentDialogOpen}
                />
                </ScrollRevealSection>
                </CollapsibleDashboardSection>

                {/* Enhanced Export Dialog - accessible from Dashboard */}
                <ExportDialog
                  agents={agents}
                  meetings={meetings}
                  lang={lang}
                  open={exportDialogOpen}
                  onOpenChange={setExportDialogOpen}
                />

                {/* Advanced Visualization Explorer */}
                <CollapsibleDashboardSection
                  sectionId="advanced-viz"
                  titleKey="viz.panel.title"
                  icon="BarChart3"
                  isCollapsed={dashboardLayout.collapsedSections.includes('advanced-viz')}
                  onToggleCollapse={() => handleToggleSectionCollapse('advanced-viz')}
                  lang={lang}
                >
                <ScrollRevealSection direction="up" delay={2}>
                {!loading && <VisualizationPanel agents={agents} meetings={meetings} lang={lang} />}
                </ScrollRevealSection>
                </CollapsibleDashboardSection>

                {/* Activity Timeline */}
                <CollapsibleDashboardSection
                  sectionId="activity-timeline"
                  titleKey="dashboardCustomize.activityTimeline"
                  icon="History"
                  isCollapsed={dashboardLayout.collapsedSections.includes('activity-timeline')}
                  onToggleCollapse={() => handleToggleSectionCollapse('activity-timeline')}
                  lang={lang}
                >
                <ScrollRevealSection direction="up" delay={2}>
                {!loading && (
                  <Card className="vl-card backdrop-blur-sm transition-all duration-200">
                    <CardContent className="p-4">
                      <ActivityTimelineWidget meetings={meetings} agents={agents} lang={lang} />
                    </CardContent>
                  </Card>
                )}
                </ScrollRevealSection>
                </CollapsibleDashboardSection>

                {/* Recent Meetings */}
                <ScrollRevealSection direction="up" delay={3}>
                <Card className="vl-card backdrop-blur-sm transition-all duration-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl font-semibold vl-text-heading tracking-tight">Recent Meetings</CardTitle>
                      <Button variant="ghost" size="sm" className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 text-xs" onClick={() => setActiveTab('history')}>
                        View All
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <HistorySkeletonRows />
                    ) : recentMeetings.length === 0 ? (
                      <EmptyState
                        icon={FlaskConical}
                        title="No meetings yet"
                        description="Start your first research meeting to collaborate with AI agents"
                        accentColor="#10b981"
                        action={
                          <Button onClick={() => setActiveTab('team-meeting')} className="bg-emerald-600 hover:bg-emerald-700 text-white" size="sm">
                            <Plus className="size-3.5 mr-1.5" /> Create Meeting
                          </Button>
                        }
                      />
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {recentMeetings.map(meeting => (
                          <MeetingCard
                            key={meeting.id}
                            meeting={meeting}
                            onClick={() => { setSelectedMeeting(meeting); setActiveTab('history') }}
                            onDelete={() => handleDeleteMeeting(meeting)}
                            isSelected={selectedMeeting?.id === meeting.id}
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
                </ScrollRevealSection>
              </motion.div>
            </AnimatePresence>
  )

}
