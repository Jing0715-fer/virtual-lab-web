'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { toast } from 'sonner'
import {
  FlaskConical, Users, Bot, MessageSquare, History, Plus, Trash2, Play,
  Loader2, Sparkles, Crown, ShieldAlert, X,
  Bot as BotIcon, Microscope, Beaker, Atom, FlaskRound, Brain, Eye,
  Settings, Target, Goal, BookOpen, ThermometerSun,
  CircleDot, Send, RotateCcw, LayoutDashboard,
  CheckCircle2, ChevronDown, ChevronRight, Download, Search, Copy,
  ExternalLink, Zap, ArrowRight, FileText, Moon, Sun,
  Dna, Cpu, GitBranch, Database, ChevronUp, Type, Info, Clock, Hash, ListChecks, ArrowUp,
  BarChart3, TrendingUp, Activity, ArrowLeft, ClipboardList, UserPlus, Repeat, MessageCircle,
  FileJson, FileSpreadsheet, Filter, XCircle, Calendar, ArrowDownUp, Maximize2, Minimize2, Timer, GitCommit,
  HelpCircle, Keyboard, GitCompareArrows, CheckSquare, Square, Command as CommandIcon,
  Kanban, Bell, CheckCheck, Trash, Smile, Frown, Meh, Cloud,
  Languages, Upload, AlertCircle, StickyNote, PanelRightOpen, PanelRightClose,
  Bold, Italic, Code as CodeIcon, Link, List as ListIcon, Plus as PlusIcon,
  PlayCircle, Pause, SkipBack, SkipForward,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Area, AreaChart, Tooltip as RechartsTooltip, Legend,
} from 'recharts'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu'
import { Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut } from '@/components/ui/command'
import { t, getAvailableLanguages } from '@/lib/i18n'
import { EnhancedMarkdown, enhancedMarkdownComponents } from './enhanced-markdown'
import type { Lang } from '@/lib/i18n'
import { useAnnotations, AnnotationBar, AnnotationPanel } from './annotations-system'

// Re-exports from split modules for convenience
export type { Agent, DiscussionMessage, Meeting, TabValue, CollaborationNode, CollaborationEdge, AnalyticsData, PipelineStageData, PipelineTaskData, PipelineData, NotificationData } from './shared-types'
export { PIPELINE_TEMPLATES, PRIORITY_COLORS, PRIORITY_LABELS, NOTIFICATION_ICONS, AGENT_ICON_OPTIONS, AGENT_COLOR_OPTIONS, MODEL_OPTIONS, AGENT_TEMPLATES, NANOBODY_WORKFLOW_STEPS, QUICK_START_AGENDA } from './shared-types'
export { TiltCard, ScrollProgress, DNAHelixBackground, HowItWorksSection, NanobodyWorkflowSection } from './shared-animations'
export { useAnimatedCounter, useTypingEffect } from './shared-hooks'
export { AgentForm, AgentTemplateDialog, DynamicList } from './shared-forms'
export { ShimmerSkeleton, ProgressiveImageLoader, LoadingOverlay, StaggeredLoader, ErrorBoundaryUI, EmptyStateEnhanced } from './enhanced-loading-states'
export { SectionTransition, ContentFadeIn, TabContentTransition, StaggerChildren, PageTransitionOverlay } from './page-transitions'
export { CustomCursor, CursorTrail, ClickRipple, HoverGlow } from './cursor-effects'

// Internal imports
import { TiltCard, DNAHelixBackground } from './shared-animations'
import { MeetingDiffView } from './meeting-diff-view'
import { useAnimatedCounter, useTypingEffect } from './shared-hooks'
import type { Agent, DiscussionMessage, Meeting, CollaborationNode, CollaborationEdge, AnalyticsData, PipelineData } from './shared-types'
import { AGENT_ICON_OPTIONS } from './shared-types'

// Types, constants, hooks, animations, and forms are now in split modules.
// They are re-exported above for backward compatibility.

// ============================================================
// API Helpers
// ============================================================

export async function fetchAgents(): Promise<Agent[]> {
  const res = await fetch('/api/agents')
  if (!res.ok) throw new Error('Failed to fetch agents')
  return res.json()
}

export async function createAgent(data: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>): Promise<Agent> {
  const res = await fetch('/api/agents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to create agent')
  }
  return res.json()
}

export async function updateAgent(id: string, data: Partial<Agent>): Promise<Agent> {
  const res = await fetch(`/api/agents/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to update agent')
  }
  return res.json()
}

export async function deleteAgent(id: string): Promise<void> {
  const res = await fetch(`/api/agents/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to delete agent')
  }
}

export async function fetchMeetings(): Promise<Meeting[]> {
  const res = await fetch('/api/meetings')
  if (!res.ok) throw new Error('Failed to fetch meetings')
  return res.json()
}

export async function createMeeting(data: Record<string, unknown>): Promise<Meeting> {
  const res = await fetch('/api/meetings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to create meeting')
  }
  return res.json()
}

export async function startMeeting(id: string): Promise<{ status: string; meetingId: string }> {
  const res = await fetch(`/api/meetings/${id}/run`, { method: 'POST' })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to start meeting')
  }
  return res.json()
}

export async function fetchMeeting(id: string): Promise<Meeting> {
  const res = await fetch(`/api/meetings/${id}`)
  if (!res.ok) throw new Error('Failed to fetch meeting')
  return res.json()
}

export async function deleteMeeting(id: string, type: string): Promise<void> {
  const res = await fetch(`/api/meetings/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to delete meeting')
  }
}

export async function addMessage(meetingId: string, data: { message: string; agentName: string; roundIndex: number; type: string }): Promise<DiscussionMessage> {
  const res = await fetch(`/api/meetings/${meetingId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to add message')
  }
  return res.json()
}

export async function seedAgents(): Promise<unknown> {
  const res = await fetch('/api/seed', { method: 'POST' })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to seed agents')
  }
  return res.json()
}

export async function checkSeedStatus(): Promise<{ principalInvestigator: { exists: boolean }; scientificCritic: { exists: boolean } }> {
  const res = await fetch('/api/seed')
  if (!res.ok) throw new Error('Failed to check seed status')
  return res.json()
}

// ============================================================
// Helpers
// ============================================================

export function renderAgentIcon(iconName: string, className: string) {
  const found = AGENT_ICON_OPTIONS.find(o => o.value === iconName)
  const IconComp = found ? found.Icon : BotIcon
  return <IconComp className={className} />
}

export function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function statusColor(status: string) {
  switch (status) {
    case 'draft': return 'bg-[var(--vl-status-draft-bg)] text-[var(--vl-text-muted)] border-[var(--vl-status-draft-border)]'
    case 'running': return 'bg-[var(--vl-status-running-bg)] text-[var(--vl-status-running-text)] border-[var(--vl-status-running-border)]'
    case 'completed': return 'bg-emerald-500/70 text-emerald-950 border-emerald-400/50 dark:text-emerald-50 dark:bg-emerald-600/70 dark:border-emerald-500/50'
    case 'processing': return 'bg-amber-500/70 text-amber-950 border-amber-400/50 dark:text-amber-50 dark:bg-amber-600/70 dark:border-amber-500/50'
    case 'queued': return 'bg-cyan-500/70 text-cyan-950 border-cyan-400/50 dark:text-cyan-50 dark:bg-cyan-600/70 dark:border-cyan-500/50'
    default: return 'bg-[var(--vl-status-draft-bg)] text-[var(--vl-text-muted)] border-[var(--vl-status-draft-border)]'
  }
}

export function getTimeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export function generateSystemPromptPreview(agent: Agent): string {
  return `You are ${agent.title}, an AI agent with the following profile:

Expertise: ${agent.expertise}
Goal: ${agent.goal}
Role: ${agent.role}

You are participating in a Virtual Lab meeting. Use your expertise to provide thoughtful, evidence-based contributions. Be concise but thorough. Focus on actionable insights that advance the research agenda.

When providing analysis or recommendations, consider:
- Scientific rigor and evidence-based reasoning
- Practical feasibility of proposed approaches
- Potential risks and mitigation strategies
- Interdisciplinary connections relevant to your expertise

Model: ${agent.model}`
}

export function exportDiscussionAsMarkdown(meeting: Meeting): void {
  const messages = meeting.messages || []
  let md = `# ${meeting.saveName}\n\n`
  md += `**Type**: ${meeting.type === 'team' ? 'Team Meeting' : 'Individual Meeting'}\n`
  md += `**Status**: ${meeting.status}\n`
  md += `**Created**: ${new Date(meeting.createdAt).toLocaleString()}\n\n`
  md += `## Agenda\n\n${meeting.agenda}\n\n`

  if (meeting.agendaQuestions?.length) {
    md += `## Questions\n\n`
    meeting.agendaQuestions.forEach((q, i) => { md += `${i + 1}. ${q}\n` })
    md += '\n'
  }

  if (meeting.agendaRules?.length) {
    md += `## Rules\n\n`
    meeting.agendaRules.forEach((r, i) => { md += `${i + 1}. ${r}\n` })
    md += '\n'
  }

  md += `## Discussion\n\n`
  let lastRound = -1
  messages.forEach(msg => {
    if (msg.roundIndex !== lastRound) {
      lastRound = msg.roundIndex
      md += `### Round ${msg.roundIndex + 1}\n\n`
    }
    md += `**${msg.agentName}**: ${msg.message}\n\n`
  })

  if (meeting.summary) {
    md += `## Summary\n\n${meeting.summary}\n`
  }

  const blob = new Blob([md], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${meeting.saveName.replace(/\s+/g, '_')}_discussion.md`
  a.click()
  URL.revokeObjectURL(url)
}

export function exportDiscussionAsJSON(meeting: Meeting): void {
  const data = {
    id: meeting.id,
    type: meeting.type,
    agenda: meeting.agenda,
    agendaQuestions: meeting.agendaQuestions,
    agendaRules: meeting.agendaRules,
    status: meeting.status,
    summary: meeting.summary,
    saveName: meeting.saveName,
    numRounds: meeting.numRounds ?? null,
    temperature: meeting.temperature,
    createdAt: meeting.createdAt,
    updatedAt: meeting.updatedAt,
    teamLead: meeting.teamLead?.title || null,
    teamMembers: meeting.teamMembers?.map(a => a.title) || [],
    messages: (meeting.messages || []).map(msg => ({
      id: msg.id,
      agentName: msg.agentName,
      message: msg.message,
      roundIndex: msg.roundIndex,
      createdAt: msg.createdAt,
    })),
  }
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${meeting.saveName.replace(/\s+/g, '_')}_discussion.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function exportDiscussionAsCSV(meeting: Meeting): void {
  const messages = meeting.messages || []
  const escapeCSVField = (value: string) => {
    if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }
  const headers = ['Round', 'Agent', 'Message', 'Timestamp']
  const rows = messages.map(msg =>
    [String(msg.roundIndex), escapeCSVField(msg.agentName), escapeCSVField(msg.message), new Date(msg.createdAt).toISOString()].join(',')
  )
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${meeting.saveName.replace(/\s+/g, '_')}_discussion.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export async function triggerExport(type: string, format: string, meetingId?: string): Promise<void> {
  try {
    const params = new URLSearchParams({ type, format })
    if (meetingId) params.set('meetingId', meetingId)
    const res = await fetch(`/api/export?${params.toString()}`)
    if (!res.ok) throw new Error('Export failed')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    // Extract filename from Content-Disposition header or use default
    const disposition = res.headers.get('Content-Disposition')
    let filename = `${type}.${format}`
    if (disposition) {
      const match = disposition.match(/filename="?(.+?)"?$/)
      if (match) filename = match[1]
    }
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${type} as ${format.toUpperCase()}`)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Export failed')
  }
}

// ============================================================
// Sub-Components
// ============================================================

export const AgentAvatar = React.memo(function AgentAvatar({ agent, size = 'md' }: { agent: { color: string; icon: string; title: string }; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = { sm: 'w-8 h-8 text-sm', md: 'w-10 h-10 text-base', lg: 'w-12 h-12 text-lg' }
  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center shrink-0 font-semibold text-white`}
      style={{ backgroundColor: agent.color }}
    >
      {renderAgentIcon(agent.icon, 'size-5')}
    </div>
  )
})

// Pulsing dot for running meetings
export const PulsingDot = React.memo(function PulsingDot({ color = '#10b981' }: { color?: string }) {
  return (
    <span className="relative flex h-2.5 w-2.5" role="status" aria-label="Running">
      <span
        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
        style={{ backgroundColor: color }}
      />
      <span
        className="relative inline-flex rounded-full h-2.5 w-2.5"
        style={{ backgroundColor: color }}
      />
    </span>
  )
})

// TiltCard is now in shared-animations.tsx (re-exported above)

// ScrollProgress is now in shared-animations.tsx (re-exported above)

// Meeting Timer badge for running meetings
export function MeetingTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState('0s')

  useEffect(() => {
    const start = new Date(startedAt).getTime()
    const update = () => {
      const now = Date.now()
      const diff = Math.max(0, Math.floor((now - start) / 1000))
      const m = Math.floor(diff / 60)
      const s = diff % 60
      setElapsed(m > 0 ? `${m}m ${s}s` : `${s}s`)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [startedAt])

  return (
    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] px-1.5 flex items-center gap-1">
      <PulsingDot color="#10b981" />
      Running for {elapsed}
    </Badge>
  )
}

// Agent Typing Indicator with bouncing dots
export function AgentTypingIndicator({ agentName }: { agentName: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center gap-2 py-2"
    >
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-emerald-400">{agentName}</span>
        <span className="text-xs vl-text-muted">is typing</span>
      </div>
      <div className="flex items-center gap-0.5">
        <motion.span
          className="w-1.5 h-1.5 rounded-full bg-emerald-400"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
        />
        <motion.span
          className="w-1.5 h-1.5 rounded-full bg-emerald-400"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
        />
        <motion.span
          className="w-1.5 h-1.5 rounded-full bg-emerald-400"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
        />
      </div>
    </motion.div>
  )
}

// useAnimatedCounter is now in shared-hooks.ts (re-exported above)

// Mini sparkline component for stat cards
export const MiniSparkline = React.memo(function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null
  const max = Math.max(...data, 1)
  const w = 80
  const h = 28
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(' ')
  return (
    <svg width={w} height={h} className="opacity-60">
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
    </svg>
  )
})

export const StatCard = React.memo(function StatCard({ icon: Icon, label, value, color, gradient, trend, sparkData, glow = false, subtitle, ctaLabel, ctaOnClick }: {
  icon: React.ElementType; label: string; value: number | string; color: string
  gradient?: string; trend?: string; sparkData?: number[]; glow?: boolean
  subtitle?: string; ctaLabel?: string; ctaOnClick?: () => void
}) {
  const numValue = typeof value === 'number' ? value : parseInt(value, 10) || 0
  const animatedCount = useAnimatedCounter(numValue)
  const displayValue = typeof value === 'number' ? animatedCount : value
  const spotlightRef = useCardSpotlight()

  return (
    <TiltCard>
      <motion.div whileHover={{ scale: 1.03 }} transition={{ type: 'spring', stiffness: 300 }}>
        <Card ref={spotlightRef} className={`vl-card backdrop-blur-sm hover:scale-[1.02] transition-transform duration-200 transition-shadow duration-300 overflow-hidden relative spotlight-card card-spotlight neon-border-card stat-card-hover ripple-surface glass-panel hover-lift-sm transition-all-smooth card-3d-tilt ${glow ? 'hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]' : ''}`} role="group" aria-label={`${label}: ${value}`}>
          {gradient && (
            <div className={`absolute inset-0 ${gradient} opacity-30 pointer-events-none`} />
          )}
          <CardContent className="p-4 sm:p-6 relative z-10">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon className="size-5 sm:size-6 text-white" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-4xl font-bold tracking-tight" style={{ color: 'var(--vl-text-white)' }}>{displayValue}</p>
                  <p className="text-xs vl-text-muted mt-0.5">{label}</p>
                  {subtitle && (
                    <p className="text-[10px] vl-text-muted mt-0.5">{subtitle}</p>
                  )}
                  {ctaLabel && ctaOnClick && (
                    <button
                      onClick={ctaOnClick}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors mt-0.5 flex items-center gap-0.5"
                    >
                      <ArrowRight className="size-2.5" /> {ctaLabel}
                    </button>
                  )}
              </div>
            </div>
            {sparkData && <MiniSparkline data={sparkData} color={color.includes('amber') ? '#f59e0b' : color.includes('emerald') ? '#10b981' : color.includes('cyan') ? '#06b6d4' : '#8b5cf6'} />}
          </div>
          {trend && (
            <p className="text-xs vl-text-muted mt-3 flex items-center gap-1">
              <TrendingUp className="size-3" /> {trend}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
    </TiltCard>
  )
})

export const AgentCard = React.memo(function AgentCard({ agent, onEdit, onDelete, onClick, meetingCount = 0 }: { agent: Agent; onEdit: () => void; onDelete: () => void; onClick: () => void; meetingCount?: number }) {
  const [copyConfig, setCopyConfig] = useState(false)

  const handleCopyConfig = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const config = { title: agent.title, expertise: agent.expertise, goal: agent.goal, role: agent.role, model: agent.model, color: agent.color, icon: agent.icon }
    await navigator.clipboard.writeText(JSON.stringify(config, null, 2))
    setCopyConfig(true)
    toast.success('Agent config copied as JSON!')
    setTimeout(() => setCopyConfig(false), 2000)
  }

  return (
    <TiltCard>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <Card
        className="vl-card backdrop-blur-sm overflow-hidden transition-all duration-300 group cursor-pointer relative tilt-card card-3d neon-border-card magnetic-hover-enhanced stat-card-hover ripple-surface card-depth-lift glass-panel-hover hover-lift-sm transition-all-smooth hover-glow-emerald card-3d-lift border-corner-accent"
        onClick={onClick}
        aria-label={`${agent.title} agent`}
      >
        {/* Gradient border on hover */}
        <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ background: `linear-gradient(135deg, ${agent.color}22, transparent 50%, ${agent.color}11)`, border: `1px solid ${agent.color}33` }} />
        <div className="absolute inset-0 rounded-lg border-l-[3px] pointer-events-none" style={{ borderLeftColor: agent.color }} />
        <CardHeader className="pb-2 relative z-10">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <AgentAvatar agent={agent} size="md" />
                {meetingCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-emerald-500 text-[9px] text-white font-bold flex items-center justify-center">
                    {meetingCount}
                  </span>
                )}
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2" style={{ color: 'var(--vl-text-white)' }}>
                  {agent.title}
                  <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium bg-[var(--vl-bg-inner)] vl-text-muted border border-[var(--vl-border-subtle)]">{agent.model}</span>
                </CardTitle>
              </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 vl-text-muted hover:text-emerald-400 hover:bg-emerald-500/10 focus-ring-glow" onClick={handleCopyConfig} aria-label="Copy agent config as JSON">
                      {copyConfig ? <CheckCircle2 className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="tooltip-glass">{copyConfig ? 'Copied!' : 'Copy agent config as JSON'}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 vl-text-muted hover:text-white hover:bg-[var(--vl-bg-card-hover)] focus-ring-glow" onClick={onEdit} aria-label="Edit agent">
                <Settings className="size-3.5" aria-hidden="true" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 vl-text-muted hover:text-red-400 hover:bg-[var(--vl-bg-card-hover)] focus-ring-glow" onClick={onDelete} aria-label="Delete agent">
                <Trash2 className="size-3.5" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 relative z-10">
          <div className="border-t border-[var(--vl-border-subtle)] my-2" />
          <div className="space-y-1.5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-start gap-2 cursor-default">
                    <BookOpen className="size-3.5 vl-text-muted mt-0.5 shrink-0" />
                    <p className="vl-text-body text-sm line-clamp-2">{agent.expertise}</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs tooltip-glass">{agent.expertise}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-start gap-2 cursor-default">
                    <Target className="size-3.5 vl-text-muted mt-0.5 shrink-0" />
                    <p className="vl-text-body text-sm line-clamp-2">{agent.goal}</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs tooltip-glass">{agent.goal}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-start gap-2 cursor-default">
                    <Goal className="size-3.5 vl-text-muted mt-0.5 shrink-0" />
                    <p className="vl-text-body text-sm line-clamp-2">{agent.role}</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs tooltip-glass">{agent.role}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>
    </motion.div>
    </TiltCard>
  )
})

export const MeetingCard = React.memo(function MeetingCard({ meeting, onClick, onDelete, isSelected }: { meeting: Meeting; onClick: () => void; onDelete: () => void; isSelected?: boolean }) {
  const isTeam = meeting.type === 'team'
  return (
    <TiltCard>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ scale: 1.01, y: -1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <Card
        className={`vl-card backdrop-blur-sm meeting-card-glow hover:shadow-[0_0_20px_rgba(16,185,129,0.1)] transition-all duration-300 cursor-pointer group card-entrance ${
          isSelected
            ? 'border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15),inset_0_0_0_1px_rgba(16,185,129,0.1)]'
            : ''
        }`}
        onClick={onClick}
        aria-label={`${isTeam ? 'Team' : 'Individual'} meeting: ${meeting.saveName || 'Untitled'} - ${meeting.status}`}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isTeam ? 'bg-emerald-500/20' : 'bg-cyan-500/20'}`}>
                {isTeam ? <Users className="size-5 text-emerald-400" /> : <BotIcon className="size-5 text-cyan-400" />}
              </div>
              <div>
                <CardTitle className="text-sm" style={{ color: 'var(--vl-text-white)' }}>
                  {isTeam ? 'Team' : 'Individual'} Meeting
                </CardTitle>
                <CardDescription className="vl-text-muted text-xs">{meeting.saveName}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`${statusColor(meeting.status)} text-[10px] px-1.5`}>
                {meeting.status === 'running' && <PulsingDot color="#f59e0b" />}
                {meeting.status !== 'running' && meeting.status}
                {meeting.status === 'running' && <span className="ml-1">running</span>}
              </Badge>
              {meeting.status === 'running' && <MeetingTimer startedAt={meeting.updatedAt} />}
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 vl-text-muted hover:text-red-400 hover:bg-[var(--vl-bg-card-hover)] opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); onDelete() }} aria-label="Delete meeting">
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-1.5">
          <p className="vl-text-body text-xs vl-truncate-2">{meeting.agenda}</p>
          <div className="flex items-center gap-3 text-[10px] vl-text-muted">
            {isTeam && meeting.numRounds && <span>Rounds: {meeting.numRounds}</span>}
            <span className="flex items-center gap-1">
              <MessageSquare className="size-2.5" />
              {meeting.messages?.length || 0}
            </span>
            <span>{timeAgo(meeting.createdAt)}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
    </TiltCard>
  )
})

export function CodeBlockWithCopy({ className, children, ...props }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false)
  const codeText = String(children).replace(/\n$/, '')

  const handleCopy = async () => {
    await navigator.clipboard.writeText(codeText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isCodeBlock = className?.includes('language-')

  if (isCodeBlock) {
    return (
      <div className="relative group/code">
        <pre className={`${className || ''} rounded-lg p-3 overflow-x-auto text-xs`} style={{ background: 'var(--vl-bg-inner)' }}>
          <code className={className} {...props}>{children}</code>
        </pre>
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 p-1.5 rounded-md opacity-0 group-hover/code:opacity-100 transition-opacity vl-inner border hover:bg-[var(--vl-bg-card-hover)]"
          aria-label="Copy code"
        >
          {copied ? <CheckCircle2 className="size-3 text-emerald-400" /> : <Copy className="size-3 vl-text-muted" />}
        </button>
      </div>
    )
  }

  return <code className={`${className || ''} px-1.5 py-0.5 rounded text-xs font-mono`} style={{ background: 'var(--vl-bg-inner)' }} {...props}>{children}</code>
}

export const markdownComponents = {
  code: CodeBlockWithCopy,
}

// Enhanced markdown components merge (extends base with table/math support)
export const enhancedComponents = {
  ...markdownComponents,
  ...enhancedMarkdownComponents,
}

const QUICK_REACTION_EMOJIS = ['👍', '❤️', '🤔', '💡', '🔬', '⭐']

// Hook for managing reactions for a message
function useMessageReactions(meetingId: string, msgId: string) {
  const [reactions, setReactions] = useState<Record<string, number>>({})

  useEffect(() => {
    try {
      const key = `vl-reactions-${meetingId}-${msgId}`
      const stored = localStorage.getItem(key)
      if (stored) setReactions(JSON.parse(stored))
    } catch { /* ignore */ }
  }, [meetingId, msgId])

  const addReaction = useCallback((emoji: string) => {
    setReactions(prev => {
      const next = { ...prev, [emoji]: (prev[emoji] || 0) + 1 }
      try {
        const key = `vl-reactions-${meetingId}-${msgId}`
        localStorage.setItem(key, JSON.stringify(next))
      } catch { /* ignore */ }
      return next
    })
    // Fire-and-forget API call
    fetch(`/api/meetings/${meetingId}/messages/${msgId}/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji }),
    }).catch(() => {})
  }, [meetingId, msgId])

  const removeReaction = useCallback((emoji: string) => {
    setReactions(prev => {
      const count = prev[emoji] || 0
      if (count <= 1) {
        const { [emoji]: _, ...rest } = prev
        try {
          const key = `vl-reactions-${meetingId}-${msgId}`
          localStorage.setItem(key, JSON.stringify(rest))
        } catch { /* ignore */ }
        return rest
      }
      const next = { ...prev, [emoji]: count - 1 }
      try {
        const key = `vl-reactions-${meetingId}-${msgId}`
        localStorage.setItem(key, JSON.stringify(next))
      } catch { /* ignore */ }
      return next
    })
  }, [meetingId, msgId])

  return { reactions, addReaction, removeReaction }
}

export const ChatMessage = React.memo(function ChatMessage({ msg, agents, isLatest = false, showWordCount = false, onAgentClick }: { msg: DiscussionMessage; agents: Agent[]; isLatest?: boolean; showWordCount?: boolean; onAgentClick?: (agentName: string) => void }) {
  const agent = agents.find(a => a.title === msg.agentName)
  const wordCount = msg.message.trim().split(/\s+/).length
  const meetingId = msg.teamMeetingId || msg.individualMeetingId || ''
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
  const { reactions, addReaction } = useMessageReactions(meetingId, msg.id)
  const hasReactions = Object.keys(reactions).length > 0

  if (msg.agentName === 'User') {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex justify-end"
      >
      <div className="max-w-[80%] vl-inner rounded-2xl rounded-br-sm px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium vl-text-body">You</span>
            <span className="text-[10px] vl-text-muted">{timeAgo(msg.createdAt)}</span>
            {showWordCount && <span className="text-[9px] vl-text-muted ml-auto">{wordCount} words</span>}
          </div>
          <div className="text-sm vl-text-body vl-prose prose-sm max-w-none">
            <ReactMarkdown components={enhancedComponents}>{msg.message}</ReactMarkdown>
          </div>
          {/* Reaction bar */}
          {hasReactions && (
            <div className="flex flex-wrap gap-1 mt-2">
              {Object.entries(reactions).map(([emoji, count]) => (
                <motion.span
                  key={emoji}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs vl-inner border border-[var(--vl-border-subtle)] cursor-default select-none"
                  title={`${emoji}`}
                >
                  <span>{emoji}</span>
                  {count > 1 && <span className="text-[9px] vl-text-muted">{count}</span>}
                </motion.span>
              ))}
            </div>
          )}
          {/* Add reaction button */}
          <div className="flex items-center gap-1 mt-1.5 opacity-0 hover:opacity-100 transition-opacity group/msg">
            <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
              <PopoverTrigger asChild>
                <button className="p-1 rounded-md hover:bg-[var(--vl-bg-card-hover)] transition-colors" aria-label="Add reaction">
                  <Smile className="size-3.5 vl-text-muted" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2 vl-dialog" align="end" side="top">
                <div className="flex gap-1">
                  {QUICK_REACTION_EMOJIS.map(emoji => (
                    <motion.button
                      key={emoji}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--vl-bg-card-hover)] transition-colors text-lg"
                      onClick={() => { addReaction(emoji); setEmojiPickerOpen(false) }}
                      aria-label={`React with ${emoji}`}
                    >
                      {emoji}
                    </motion.button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex gap-3"
    >
      <AgentAvatar agent={agent || { color: '#6366f1', icon: 'bot', title: msg.agentName }} size="sm" />
      <div className="max-w-[80%] vl-card rounded-2xl rounded-bl-sm px-4 py-3 border">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`text-xs font-semibold cursor-pointer hover:underline transition-all ${onAgentClick && msg.agentName !== 'User' ? 'hover:opacity-80' : ''}`}
            style={{ color: agent?.color || '#94a3b8' }}
            onClick={(e) => {
              if (onAgentClick && msg.agentName !== 'User') {
                e.stopPropagation()
                onAgentClick(msg.agentName)
              }
            }}
          >
            {msg.agentName}
          </span>
          <span className="text-[10px] vl-text-muted">{timeAgo(msg.createdAt)}</span>
          {showWordCount && <span className="text-[9px] vl-text-muted ml-auto">{wordCount} words</span>}
        </div>
        <div className="text-sm vl-text-body vl-prose prose-sm max-w-none">
          <ReactMarkdown components={markdownComponents}>{msg.message}</ReactMarkdown>
        </div>
        {isLatest && (
          <span className="inline-block w-1.5 h-4 bg-emerald-400 animate-pulse ml-0.5 mt-1" />
        )}
        {/* Reaction bar */}
        {(hasReactions || true) && (
          <div className={`flex flex-wrap items-center gap-1 mt-2 ${hasReactions ? '' : ''}`}>
            {Object.entries(reactions).map(([emoji, count]) => (
              <motion.span
                key={emoji}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs vl-inner border border-[var(--vl-border-subtle)] cursor-default select-none"
                title={`${emoji}`}
              >
                <span>{emoji}</span>
                {count > 1 && <span className="text-[9px] vl-text-muted">{count}</span>}
              </motion.span>
            ))}
            {/* Add reaction button */}
            <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
              <PopoverTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-0.5 rounded-md hover:bg-[var(--vl-bg-card-hover)] transition-colors opacity-0 group-hover:opacity-100"
                  style={{ opacity: hasReactions ? 1 : undefined }}
                  aria-label="Add reaction"
                >
                  <Smile className="size-3.5 vl-text-muted" />
                </motion.button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2 vl-dialog" align="start" side="top">
                <div className="flex gap-1">
                  {QUICK_REACTION_EMOJIS.map(emoji => (
                    <motion.button
                      key={emoji}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--vl-bg-card-hover)] transition-colors text-lg"
                      onClick={() => { addReaction(emoji); setEmojiPickerOpen(false) }}
                      aria-label={`React with ${emoji}`}
                    >
                      {emoji}
                    </motion.button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>
    </motion.div>
  )
})

export const RoundDivider = React.memo(function RoundDivider({ round, total }: { round: number; total?: number }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px" style={{ background: 'var(--vl-border)' }} />
      <Badge variant="outline" className="vl-inner vl-text-muted border-[var(--vl-border-subtle)] text-xs">
        Round {round}{total ? ` of ${total}` : ''}
      </Badge>
      <div className="flex-1 h-px" style={{ background: 'var(--vl-border)' }} />
    </div>
  )
})

// ============================================================
// Agent Detail Dialog
// ============================================================

export function AgentDetailDialog({ agent, meetings, open, onOpenChange }: {
  agent: Agent | null
  meetings: Meeting[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [copied, setCopied] = useState(false)
  const [radarAnimProgress, setRadarAnimProgress] = useState(0)

  // Animate radar chart when dialog opens
  useEffect(() => {
    if (open && agent) {
      const startTime = performance.now()
      const duration = 800
      let frameId: number
      const animate = (now: number) => {
        const elapsed = now - startTime
        const progress = Math.min(elapsed / duration, 1)
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3)
        setRadarAnimProgress(eased)
        if (progress < 1) frameId = requestAnimationFrame(animate)
      }
      frameId = requestAnimationFrame(animate)
      return () => { if (frameId) cancelAnimationFrame(frameId) }
    }
  }, [open, agent])

  if (!agent) return null

  const agentMeetings = meetings.filter(m =>
    m.messages?.some(msg => msg.agentName === agent.title)
  )

  const agentMessages = meetings.flatMap(m =>
    (m.messages || []).filter(msg => msg.agentName === agent.title)
  )

  const meetingCount = agentMeetings.length
  const totalMessages = agentMessages.length
  const avgMessageLength = totalMessages > 0
    ? Math.round(agentMessages.reduce((sum, msg) => sum + msg.message.length, 0) / totalMessages)
    : 0

  // Compute most active time period
  const hourCounts: Record<number, number> = {}
  agentMessages.forEach(msg => {
    const hour = new Date(msg.createdAt).getHours()
    hourCounts[hour] = (hourCounts[hour] || 0) + 1
  })
  const mostActiveHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]
  const mostActivePeriod = mostActiveHour
    ? `${mostActiveHour[0]}:00`
    : 'N/A'

  // Compute performance dimensions based on real data
  // Participation: ratio of messages sent to total messages in meetings they're in
  const totalMeetingMsgs = agentMeetings.reduce((sum, m) => sum + (m.messages?.length || 0), 0)
  const participation = totalMeetingMsgs > 0 ? Math.min((totalMessages / totalMeetingMsgs) * 100, 100) : 0

  // Leadership: how often agent appears in the first round
  const firstRoundMsgs = agentMessages.filter(msg => msg.roundIndex === 0).length
  const leadership = totalMessages > 0 ? Math.min((firstRoundMsgs / totalMessages) * 200, 100) : 0

  // Technical depth: average message length (longer = more technical)
  const technicalDepth = Math.min((avgMessageLength / 300) * 100, 100)

  // Collaboration: number of distinct meetings participated in
  const collaboration = Math.min((meetingCount / 10) * 100, 100)

  // Critical thinking: ratio of questions raised (messages with ?) 
  const questionMsgs = agentMessages.filter(msg => msg.message.includes('?')).length
  const criticalThinking = totalMessages > 0 ? Math.min((questionMsgs / totalMessages) * 300, 100) : 0

  const dimensions = [
    { label: 'Participation', value: participation },
    { label: 'Leadership', value: leadership },
    { label: 'Technical', value: technicalDepth },
    { label: 'Collaboration', value: collaboration },
    { label: 'Critical', value: criticalThinking },
  ]

  const systemPrompt = generateSystemPromptPreview(agent)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(systemPrompt)
    setCopied(true)
    toast.success('System prompt copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  // SVG Radar chart helper
  const radarSize = 160
  const radarCenter = radarSize / 2
  const radarRadius = 60
  const angleStep = (Math.PI * 2) / dimensions.length
  const points = dimensions.map((dim, i) => {
    const angle = i * angleStep - Math.PI / 2
    const r = (dim.value / 100) * radarRadius * radarAnimProgress
    return {
      x: radarCenter + r * Math.cos(angle),
      y: radarCenter + r * Math.sin(angle),
    }
  })
  const polygonPoints = points.map(p => `${p.x},${p.y}`).join(' ')

  // Grid lines for radar
  const gridLevels = [0.25, 0.5, 0.75, 1.0]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="vl-dialog max-h-[85vh] overflow-y-auto scrollbar-thin sm:max-w-2xl custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3" style={{ color: 'var(--vl-text-white)' }}>
            <AgentAvatar agent={agent} size="md" />
            <div>
              <div>{agent.title}</div>
              <div className="text-xs vl-text-muted font-normal">{agent.model}</div>
            </div>
          </DialogTitle>
          <DialogDescription className="vl-text-muted sr-only">Agent details</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 mt-2">

          {/* Performance Radar Chart */}
          <div className="vl-inner rounded-xl p-4">
            <h3 className="text-sm font-semibold vl-text-heading mb-3 flex items-center gap-2">
              <BarChart3 className="size-4 text-emerald-400" />
              Performance Dashboard
            </h3>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Radar SVG */}
              <div className="shrink-0">
                <svg width={radarSize} height={radarSize} viewBox={`0 0 ${radarSize} ${radarSize}`}>
                  {/* Grid circles */}
                  {gridLevels.map(level => (
                    <polygon
                      key={level}
                      points={Array.from({ length: dimensions.length }, (_, i) => {
                        const angle = i * angleStep - Math.PI / 2
                        const r = level * radarRadius
                        return `${radarCenter + r * Math.cos(angle)},${radarCenter + r * Math.sin(angle)}`
                      }).join(' ')}
                      fill="none"
                      stroke="var(--vl-border-subtle)"
                      strokeWidth="1"
                    />
                  ))}
                  {/* Axis lines */}
                  {dimensions.map((_, i) => {
                    const angle = i * angleStep - Math.PI / 2
                    return (
                      <line
                        key={i}
                        x1={radarCenter}
                        y1={radarCenter}
                        x2={radarCenter + radarRadius * Math.cos(angle)}
                        y2={radarCenter + radarRadius * Math.sin(angle)}
                        stroke="var(--vl-border-subtle)"
                        strokeWidth="1"
                      />
                    )
                  })}
                  {/* Data polygon */}
                  <motion.polygon
                    points={polygonPoints}
                    fill="rgba(16, 185, 129, 0.2)"
                    stroke="#10b981"
                    strokeWidth="2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: radarAnimProgress > 0.1 ? 1 : 0 }}
                    transition={{ duration: 0.3 }}
                  />
                  {/* Data points */}
                  {points.map((p, i) => (
                    <motion.circle
                      key={i}
                      cx={p.x}
                      cy={p.y}
                      r="3"
                      fill="#10b981"
                      initial={{ scale: 0 }}
                      animate={{ scale: radarAnimProgress > 0.3 ? 1 : 0 }}
                      transition={{ duration: 0.2, delay: i * 0.05 }}
                    />
                  ))}
                  {/* Labels */}
                  {dimensions.map((dim, i) => {
                    const angle = i * angleStep - Math.PI / 2
                    const labelR = radarRadius + 14
                    return (
                      <text
                        key={i}
                        x={radarCenter + labelR * Math.cos(angle)}
                        y={radarCenter + labelR * Math.sin(angle)}
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="text-[8px] fill-[var(--vl-text-muted)]"
                      >
                        {dim.label}
                      </text>
                    )
                  })}
                </svg>
              </div>
              {/* Dimension scores */}
              <div className="flex-1 grid grid-cols-1 gap-1.5 w-full">
                {dimensions.map((dim) => (
                  <div key={dim.label} className="flex items-center gap-2">
                    <span className="text-[10px] vl-text-muted w-20 shrink-0">{dim.label}</span>
                    <div className="flex-1 h-2 rounded-full bg-[var(--vl-bg-secondary)] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: agent.color }}
                        initial={{ width: '0%' }}
                        animate={{ width: `${Math.round(dim.value * radarAnimProgress)}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="text-[10px] vl-text-muted w-8 text-right">{Math.round(dim.value)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Message Statistics Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="vl-inner rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <MessageSquare className="size-3 text-emerald-400" />
                <p className="text-[10px] vl-text-muted">Total Messages</p>
              </div>
              <p className="text-xl font-bold vl-text-heading stat-number-animate">{totalMessages}</p>
            </div>
            <div className="vl-inner rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Type className="size-3 text-cyan-400" />
                <p className="text-[10px] vl-text-muted">Avg Length</p>
              </div>
              <p className="text-xl font-bold vl-text-heading stat-number-animate">{avgMessageLength}<span className="text-[10px] vl-text-muted ml-0.5">chars</span></p>
            </div>
            <div className="vl-inner rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Clock className="size-3 text-amber-400" />
                <p className="text-[10px] vl-text-muted">Active Time</p>
              </div>
              <p className="text-lg font-bold vl-text-heading stat-number-animate">{mostActivePeriod}</p>
            </div>
          </div>

          {/* Meeting History Timeline */}
          <div className="vl-inner rounded-xl p-4">
            <h3 className="text-sm font-semibold vl-text-heading mb-3 flex items-center gap-2">
              <History className="size-4 text-emerald-400" />
              Meeting History
              <span className="glass-badge text-[10px] vl-text-muted font-normal">{meetingCount}</span>
            </h3>
            {agentMeetings.length > 0 ? (
              <div className="relative max-h-48 overflow-y-auto scrollbar-thin custom-scrollbar pl-4">
                {/* Timeline gradient line */}
                <div className="absolute left-[7px] top-2 bottom-2 w-[2px]" style={{
                  background: 'linear-gradient(180deg, #10b981, #06b6d4, #8b5cf6)',
                  borderRadius: '1px',
                }} />
                <div className="space-y-3">
                  {agentMeetings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8).map((m, idx) => (
                    <div key={m.id} className="relative flex items-start gap-3">
                      {/* Timeline node */}
                      <div className="absolute -left-4 top-1 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 z-10"
                        style={{
                          borderColor: m.type === 'team' ? '#10b981' : '#06b6d4',
                          backgroundColor: 'var(--vl-bg-secondary)',
                        }}
                      >
                        <div className="w-1.5 h-1.5 rounded-full" style={{
                          backgroundColor: m.type === 'team' ? '#10b981' : '#06b6d4',
                        }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] vl-text-muted">{timeAgo(m.createdAt)}</span>
                          <Badge variant="outline" className={`${statusColor(m.status)} text-[8px] px-1`}>{m.status}</Badge>
                        </div>
                        <p className="text-xs vl-text-heading truncate">{m.saveName}</p>
                        <p className="text-[10px] vl-text-muted truncate">{m.agenda.slice(0, 80)}{m.agenda.length > 80 ? '...' : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs vl-text-muted text-center py-4">No meeting data yet</p>
            )}
          </div>

          {/* Agent Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="vl-inner rounded-lg p-3">
              <p className="text-[10px] vl-text-muted mb-1">Expertise</p>
              <p className="text-xs vl-text-body">{agent.expertise}</p>
            </div>
            <div className="vl-inner rounded-lg p-3">
              <p className="text-[10px] vl-text-muted mb-1">Goal</p>
              <p className="text-xs vl-text-body">{agent.goal}</p>
            </div>
            <div className="vl-inner rounded-lg p-3">
              <p className="text-[10px] vl-text-muted mb-1">Role</p>
              <p className="text-xs vl-text-body">{agent.role}</p>
            </div>
            <div className="vl-inner rounded-lg p-3">
              <p className="text-[10px] vl-text-muted mb-1">Meetings</p>
              <p className="text-xs vl-text-body flex items-center gap-1.5">
                <MessageSquare className="size-3 text-emerald-400" />
                {meetingCount} participated
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="vl-text-label text-sm flex items-center gap-1.5">
                <FileText className="size-3.5" /> System Prompt Preview
              </Label>
              <Button variant="ghost" size="sm" className="h-7 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 text-xs" onClick={handleCopy}>
                {copied ? <CheckCircle2 className="size-3 mr-1" /> : <Copy className="size-3 mr-1" />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <div className="vl-inner rounded-lg p-3 max-h-48 overflow-y-auto">
              <pre className="text-[11px] vl-text-body whitespace-pre-wrap font-mono leading-relaxed">{systemPrompt}</pre>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px] vl-text-muted">
            <span>Created {timeAgo(agent.createdAt)}</span>
            <span>&middot;</span>
            <span>Updated {timeAgo(agent.updatedAt)}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Meeting Comparison Dialog
// ============================================================

export function MeetingComparisonDialog({ meetingA, meetingB, agents, lang = 'en', open, onOpenChange }: {
  meetingA: Meeting | null
  meetingB: Meeting | null
  agents: Agent[]
  lang?: Lang
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [diffOpen, setDiffOpen] = useState(false)

  if (!meetingA || !meetingB) return null

  // Participant comparison
  const participantsA = [...new Set((meetingA.messages || []).map(m => m.agentName).filter(n => n !== 'User'))]
  const participantsB = [...new Set((meetingB.messages || []).map(m => m.agentName).filter(n => n !== 'User'))]
  const sharedParticipants = participantsA.filter(p => participantsB.includes(p))
  const uniqueA = participantsA.filter(p => !participantsB.includes(p))
  const uniqueB = participantsB.filter(p => !participantsA.includes(p))

  // Agenda topic comparison (by agenda sentences/questions)
  const topicsA = meetingA.agendaQuestions?.length ? meetingA.agendaQuestions : meetingA.agenda.split(/[.!?\n]/).filter(s => s.trim().length > 10)
  const topicsB = meetingB.agendaQuestions?.length ? meetingB.agendaQuestions : meetingB.agenda.split(/[.!?\n]/).filter(s => s.trim().length > 10)
  const sharedTopics = topicsA.filter(ta => topicsB.some(tb => tb.toLowerCase().trim() === ta.toLowerCase().trim()))
  const uniqueTopicsA = topicsA.filter(ta => !topicsB.some(tb => tb.toLowerCase().trim() === ta.toLowerCase().trim()))
  const uniqueTopicsB = topicsB.filter(tb => !topicsA.some(ta => ta.toLowerCase().trim() === tb.toLowerCase().trim()))

  // Message count by round for bar chart
  const maxRounds = Math.max(
    ...(meetingA.messages || []).map(m => m.roundIndex),
    ...(meetingB.messages || []).map(m => m.roundIndex),
    0
  ) + 1
  const roundData = Array.from({ length: maxRounds }, (_, i) => {
    const countA = (meetingA.messages || []).filter(m => m.roundIndex === i).length
    const countB = (meetingB.messages || []).filter(m => m.roundIndex === i).length
    return { round: `Round ${i + 1}`, [meetingA.saveName]: countA, [meetingB.saveName]: countB }
  })

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="vl-dialog max-w-6xl max-h-[90vh] overflow-y-auto scrollbar-thin p-4 sm:p-6 custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 vl-text-heading text-lg">
            <GitCompareArrows className="size-5 text-emerald-400" />
            Meeting Comparison
          </DialogTitle>
          <DialogDescription className="vl-text-muted">
            Comparing &ldquo;{meetingA.saveName}&rdquo; with &ldquo;{meetingB.saveName}&rdquo;
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Side-by-side Meeting Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Meeting A */}
            <div className="vl-inner rounded-xl p-4 border-l-4" style={{ borderLeftColor: '#10b981' }}>
              <h3 className="font-semibold text-sm mb-2" style={{ color: '#10b981' }}>Meeting A</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`${meetingA.type === 'team' ? 'bg-emerald-600/70 text-white border-emerald-500/50' : 'bg-cyan-600/70 text-white border-cyan-500/50'} text-[10px]`}>
                    {meetingA.type === 'team' ? 'Team' : 'Individual'}
                  </Badge>
                  <Badge variant="outline" className={`${statusColor(meetingA.status)} text-[10px]`}>
                    {meetingA.status}
                  </Badge>
                </div>
                <p className="font-medium vl-text-heading text-sm">{meetingA.saveName}</p>
                <p className="vl-text-body text-xs line-clamp-3">{meetingA.agenda}</p>
                <div className="flex gap-3 text-[10px] vl-text-muted">
                  <span>{meetingA.messages?.length || 0} messages</span>
                  <span>{meetingA.numRounds || 0} rounds</span>
                  <span>Temp: {meetingA.temperature}</span>
                </div>
              </div>
            </div>

            {/* Meeting B */}
            <div className="vl-inner rounded-xl p-4 border-l-4" style={{ borderLeftColor: '#3b82f6' }}>
              <h3 className="font-semibold text-sm mb-2" style={{ color: '#3b82f6' }}>Meeting B</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`${meetingB.type === 'team' ? 'bg-emerald-600/70 text-white border-emerald-500/50' : 'bg-cyan-600/70 text-white border-cyan-500/50'} text-[10px]`}>
                    {meetingB.type === 'team' ? 'Team' : 'Individual'}
                  </Badge>
                  <Badge variant="outline" className={`${statusColor(meetingB.status)} text-[10px]`}>
                    {meetingB.status}
                  </Badge>
                </div>
                <p className="font-medium vl-text-heading text-sm">{meetingB.saveName}</p>
                <p className="vl-text-body text-xs line-clamp-3">{meetingB.agenda}</p>
                <div className="flex gap-3 text-[10px] vl-text-muted">
                  <span>{meetingB.messages?.length || 0} messages</span>
                  <span>{meetingB.numRounds || 0} rounds</span>
                  <span>Temp: {meetingB.temperature}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Participant Comparison - Venn Diagram */}
          <div className="vl-card rounded-xl p-6">
            <h3 className="font-semibold text-sm vl-text-heading mb-4 flex items-center gap-2">
              <Users className="size-4 text-emerald-400" /> Participant Comparison
            </h3>
            <div className="flex flex-col md:flex-row items-center justify-center gap-6">
              {/* Venn Diagram */}
              <div className="relative w-64 h-48 flex-shrink-0">
                {/* Circle A */}
                <div className="absolute w-36 h-36 rounded-full border-2 flex items-center justify-center" style={{ left: '8px', top: '20px', borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)' }}>
                  <div className="absolute -top-5 text-[10px] font-semibold" style={{ color: '#10b981' }}>A ({participantsA.length})</div>
                </div>
                {/* Circle B */}
                <div className="absolute w-36 h-36 rounded-full border-2 flex items-center justify-center" style={{ right: '8px', top: '20px', borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)' }}>
                  <div className="absolute -top-5 text-[10px] font-semibold" style={{ color: '#3b82f6' }}>B ({participantsB.length})</div>
                </div>
                {/* Overlap indicator */}
                <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 text-[10px] font-bold" style={{ color: '#f59e0b' }}>
                  {sharedParticipants.length > 0 ? `${sharedParticipants.length} shared` : 'No overlap'}
                </div>
              </div>
              {/* Lists */}
              <div className="flex-1 space-y-3 min-w-0">
                {uniqueA.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold mb-1" style={{ color: '#10b981' }}>Unique to A (green)</p>
                    <div className="flex flex-wrap gap-1">
                      {uniqueA.map(name => { const agent = agents.find(a => a.title === name); return <Badge key={name} variant="outline" className="bg-emerald-600/70 text-white border-emerald-500/50 text-[10px]">{agent?.icon && renderAgentIcon(agent.icon, 'size-3 mr-0.5')}{name}</Badge> })}
                    </div>
                  </div>
                )}
                {sharedParticipants.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold mb-1" style={{ color: '#f59e0b' }}>Shared (amber)</p>
                    <div className="flex flex-wrap gap-1">
                      {sharedParticipants.map(name => { const agent = agents.find(a => a.title === name); return <Badge key={name} variant="outline" className="bg-amber-600/70 text-white border-amber-500/50 text-[10px]">{agent?.icon && renderAgentIcon(agent.icon, 'size-3 mr-0.5')}{name}</Badge> })}
                    </div>
                  </div>
                )}
                {uniqueB.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold mb-1" style={{ color: '#3b82f6' }}>Unique to B (blue)</p>
                    <div className="flex flex-wrap gap-1">
                      {uniqueB.map(name => { const agent = agents.find(a => a.title === name); return <Badge key={name} variant="outline" className="bg-blue-600/70 text-white border-blue-500/50 text-[10px]">{agent?.icon && renderAgentIcon(agent.icon, 'size-3 mr-0.5')}{name}</Badge> })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Agenda Topic Comparison */}
          <div className="vl-card rounded-xl p-6">
            <h3 className="font-semibold text-sm vl-text-heading mb-4 flex items-center gap-2">
              <BookOpen className="size-4 text-cyan-400" /> Agenda Topic Comparison
            </h3>
            <div className="space-y-3">
              {sharedTopics.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold mb-1" style={{ color: '#f59e0b' }}>Shared Topics (amber)</p>
                  <ul className="space-y-1">
                    {sharedTopics.map((t, i) => <li key={i} className="text-xs vl-text-body flex items-start gap-1.5"><span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: '#f59e0b' }} />{t.trim()}</li>)}
                  </ul>
                </div>
              )}
              {uniqueTopicsA.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold mb-1" style={{ color: '#10b981' }}>Unique to A (green)</p>
                  <ul className="space-y-1">
                    {uniqueTopicsA.map((t, i) => <li key={i} className="text-xs vl-text-body flex items-start gap-1.5"><span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: '#10b981' }} />{t.trim()}</li>)}
                  </ul>
                </div>
              )}
              {uniqueTopicsB.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold mb-1" style={{ color: '#3b82f6' }}>Unique to B (blue)</p>
                  <ul className="space-y-1">
                    {uniqueTopicsB.map((t, i) => <li key={i} className="text-xs vl-text-body flex items-start gap-1.5"><span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: '#3b82f6' }} />{t.trim()}</li>)}
                  </ul>
                </div>
              )}
              {sharedTopics.length === 0 && uniqueTopicsA.length === 0 && uniqueTopicsB.length === 0 && (
                <p className="text-xs vl-text-muted">No agenda topics to compare</p>
              )}
            </div>
          </div>

          {/* Summary Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="vl-inner rounded-xl p-4 border-t-2" style={{ borderTopColor: '#10b981' }}>
              <h4 className="text-xs font-semibold mb-2" style={{ color: '#10b981' }}>Summary — A</h4>
              <div className="text-xs vl-prose prose-sm max-h-40 overflow-y-auto">
                {meetingA.summary ? <ReactMarkdown>{meetingA.summary}</ReactMarkdown> : <span className="vl-text-muted italic">No summary available</span>}
              </div>
            </div>
            <div className="vl-inner rounded-xl p-4 border-t-2" style={{ borderTopColor: '#3b82f6' }}>
              <h4 className="text-xs font-semibold mb-2" style={{ color: '#3b82f6' }}>Summary — B</h4>
              <div className="text-xs vl-prose prose-sm max-h-40 overflow-y-auto">
                {meetingB.summary ? <ReactMarkdown>{meetingB.summary}</ReactMarkdown> : <span className="vl-text-muted italic">No summary available</span>}
              </div>
            </div>
          </div>

          {/* View Discussion Diff Button */}
          <Button
            variant="outline"
            size="sm"
            className="vl-input text-xs h-auto py-2 flex items-center gap-1.5 w-full"
            onClick={() => setDiffOpen(true)}
          >
            <GitCompareArrows className="size-3.5 text-emerald-400" />
            {t(lang, 'meetingDiff.viewDiff')}
          </Button>

          {/* Message Count Bar Chart */}
          <div className="vl-card rounded-xl p-6">
            <h3 className="font-semibold text-sm vl-text-heading mb-4 flex items-center gap-2">
              <BarChart3 className="size-4 text-violet-400" /> Messages Per Round
            </h3>
            {roundData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={roundData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" className="[stroke:var(--vl-chart-grid)]" />
                  <XAxis dataKey="round" tick={{ fill: 'var(--vl-chart-axis)', fontSize: 11 }} axisLine={{ stroke: 'var(--vl-chart-axis-line)' }} />
                  <YAxis tick={{ fill: 'var(--vl-chart-axis)', fontSize: 11 }} axisLine={{ stroke: 'var(--vl-chart-axis-line)' }} />
                  <Bar dataKey={meetingA.saveName} fill="#10b981" radius={[4, 4, 0, 0]} name="A" />
                  <Bar dataKey={meetingB.saveName} fill="#3b82f6" radius={[4, 4, 0, 0]} name="B" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs vl-text-muted text-center py-6">No message data to chart</p>
            )}
          </div>
        </div>
      </DialogContent>

    </Dialog>

    {/* Meeting Diff View as separate dialog */}
    {meetingA && meetingB && (
      <MeetingDiffView
        meetingA={meetingA}
        meetingB={meetingB}
        agents={agents}
        lang={lang}
        open={diffOpen}
        onOpenChange={setDiffOpen}
      />
    )}
    </>
  )
}

// ============================================================
// Keyboard Shortcuts Help Dialog
// ============================================================

export function KeyboardShortcutsHelp({ open, onOpenChange, lang }: { open: boolean; onOpenChange: (open: boolean) => void; lang: Lang }) {
  const shortcuts = [
    { keys: '⌘K / Ctrl+K', description: 'Open command palette', icon: CommandIcon },
    { keys: '1–8', description: 'Switch tabs (Dashboard, Agents, Team, Individual, History, Pipeline, Bio Tools, Settings)', icon: Hash },
    { keys: 'N', description: 'Create new agent (outside input fields)', icon: Plus },
    { keys: 'T', description: 'Go to Team Meeting tab', icon: Users },
    { keys: 'M', description: 'Go to Individual Meeting tab', icon: UserPlus },
    { keys: '/', description: 'Focus global search (command palette)', icon: Search },
    { keys: '?', description: 'Show keyboard shortcuts', icon: HelpCircle },
    { keys: 'Esc', description: 'Close any open dialog / command palette', icon: X },
    { keys: '↑ / ↓', description: 'Navigate command palette items', icon: ArrowDownUp },
    { keys: 'Enter', description: 'Execute selected command', icon: Play },
  ]
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="vl-dialog sm:max-w-md max-h-[85vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="vl-text-heading flex items-center gap-2">
            <Keyboard className="size-5 text-emerald-400" /> {t(lang, 'settings.shortcuts')}
          </DialogTitle>
          <DialogDescription className="vl-text-muted">{t(lang, 'shortcuts.description')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 mt-2">
          {shortcuts.map(s => (
            <div key={s.keys} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--vl-border-subtle)' }}>
              <div className="flex items-center gap-2">
                <s.icon className="size-3.5 vl-text-muted" />
                <span className="text-sm vl-text-body">{s.description}</span>
              </div>
              <kbd className="vl-inner rounded px-2 py-0.5 text-[10px] font-mono vl-text-muted border">{s.keys}</kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// AgentForm is now in shared-forms.tsx (re-exported above)

// AgentTemplateDialog is now in shared-forms.tsx (re-exported above)

// DynamicList is now in shared-forms.tsx (re-exported above)

// ============================================================
// Discussion Viewer Component (Enhanced)
// ============================================================

export function DiscussionViewer({
  meeting,
  agents,
  meetings = [],
  onRefresh,
  onSelectMeeting,
  onRunMeeting,
  runningMeetingId,
  lang = 'en',
  onAgentClick,
}: {
  meeting: Meeting
  agents: Agent[]
  meetings?: Meeting[]
  onRefresh: () => void
  onSelectMeeting?: (meeting: Meeting) => void
  onRunMeeting?: (meeting: Meeting) => void
  runningMeetingId?: string | null
  lang?: Lang
  onAgentClick?: (agentName: string) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null)
  const [userMessage, setUserMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [showAgenda, setShowAgenda] = useState(true)
  const [showMeetingInfo, setShowMeetingInfo] = useState(false)
  const [toolbarExpanded, setToolbarExpanded] = useState(false)
  const [filterAgent, setFilterAgent] = useState<string | null>(null)
  const [showWordCloud, setShowWordCloud] = useState(false)
  const [showAnnotationPanel, setShowAnnotationPanel] = useState(false)

  // Replay state
  const [replayMode, setReplayMode] = useState(false)
  const [replayIndex, setReplayIndex] = useState(0)
  const [replayPlaying, setReplayPlaying] = useState(false)
  const [replaySpeed, setReplaySpeed] = useState(1)
  const replayIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const {
    annotations,
    addAnnotation,
    removeAnnotation,
    getAnnotations,
    totalCount: annotationCount,
  } = useAnnotations(meeting.id)

  const messages = meeting.messages || []

  // Get participants for this meeting
  const participants = useMemo(() => {
    const names = [...new Set(messages.map(m => m.agentName).filter(n => n !== 'User'))]
    return names.map(name => agents.find(a => a.title === name) || { color: '#6366f1', icon: 'bot', title: name, id: name })
  }, [messages, agents])

  // Agent participation summary
  const agentParticipation = useMemo(() => {
    const totalMsgs = messages.filter(m => m.agentName !== 'User').length
    const counts: Record<string, number> = {}
    messages.forEach(m => {
      if (m.agentName !== 'User') {
        counts[m.agentName] = (counts[m.agentName] || 0) + 1
      }
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalMsgs > 0 ? Math.round((count / totalMsgs) * 100) : 0,
        agent: agents.find(a => a.title === name),
      }))
  }, [messages, agents])

  // Word cloud data
  const wordCloudData = useMemo(() => {
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
      'on', 'with', 'at', 'by', 'from', 'up', 'about', 'into', 'through',
      'during', 'before', 'after', 'above', 'below', 'between', 'under',
      'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where',
      'why', 'how', 'all', 'both', 'each', 'few', 'more', 'most', 'other',
      'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
      'than', 'too', 'very', 'just', 'because', 'as', 'until', 'while',
      'it', 'its', 'this', 'that', 'these', 'those', 'i', 'me', 'my',
      'we', 'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her',
      'they', 'them', 'their', 'what', 'which', 'who', 'whom', 'and',
      'but', 'or', 'if', 'also', 'like', 'well', 'us', 'much', 'many',
      'any', 'get', 'got', 'make', 'made', 'know', 'think', 'see', 'new',
      'way', 'even', 'still', 'back', 'need', 'good', 'great', 'use',
      'used', 'using', 'based', 'one', 'two', 'three', 'first', 'second',
    ])
    const wordCounts: Record<string, number> = {}
    messages.forEach(m => {
      const words = m.message.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w))
      words.forEach(w => {
        wordCounts[w] = (wordCounts[w] || 0) + 1
      })
    })
    return Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
  }, [messages])

  const displayMessages = useMemo(() => {
    let msgs = searchQuery.trim()
      ? messages.filter(m => {
          const q = searchQuery.toLowerCase()
          return m.message.toLowerCase().includes(q) || m.agentName.toLowerCase().includes(q)
        })
      : messages

    if (filterAgent) {
      msgs = msgs.filter(m => m.agentName === filterAgent)
    }
    return msgs
  }, [messages, searchQuery, filterAgent])

  useEffect(() => {
    if (scrollRef.current && !searchQuery.trim()) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [meeting.messages, searchQuery])

  const handleSendMessage = async () => {
    if (!userMessage.trim()) return
    setSending(true)
    try {
      await addMessage(meeting.id, {
        message: userMessage.trim(),
        agentName: 'User',
        roundIndex: meeting.messages?.length || 0,
        type: meeting.type,
      })
      setUserMessage('')
      onRefresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const isRunning = runningMeetingId === meeting.id
  const isDraft = meeting.status === 'draft'

  // Rich text toolbar helpers
  const insertAtCursor = useCallback((before: string, after: string = '') => {
    const el = inputRef.current
    if (!el) return
    const start = el.selectionStart ?? userMessage.length
    const end = el.selectionEnd ?? userMessage.length
    const selectedText = userMessage.substring(start, end)
    const replacement = before + (selectedText || 'text') + after
    const newValue = userMessage.substring(0, start) + replacement + userMessage.substring(end)
    setUserMessage(newValue)
    // Focus back and position cursor
    setTimeout(() => {
      el.focus()
      const cursorPos = start + before.length + (selectedText || 'text').length
      el.setSelectionRange(cursorPos, cursorPos)
    }, 0)
  }, [userMessage])

  const handleToolbarAction = useCallback((action: string) => {
    switch (action) {
      case 'bold': insertAtCursor('**', '**'); break
      case 'italic': insertAtCursor('*', '*'); break
      case 'code': insertAtCursor('`', '`'); break
      case 'codeblock': insertAtCursor('```\n', '\n```'); break
      case 'link': insertAtCursor('[', '](url)'); break
      case 'list': insertAtCursor('- '); break
    }
  }, [insertAtCursor])

  // Keyboard shortcuts for formatting
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') return
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault(); handleToolbarAction('bold')
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
        e.preventDefault(); handleToolbarAction('italic')
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        // Don't override command palette shortcut in input
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleToolbarAction])

  // Calculate running progress
  const runningProgress = useMemo(() => {
    if (meeting.status !== 'running' || !meeting.numRounds) return null
    const currentRound = messages.length > 0 ? Math.max(...messages.map(m => m.roundIndex)) + 1 : 0
    return { currentRound, totalRounds: meeting.numRounds }
  }, [meeting, messages])

  // Replay: auto-play interval
  useEffect(() => {
    if (replayMode && replayPlaying) {
      const intervalMs = Math.max(200, 2000 / replaySpeed)
      replayIntervalRef.current = setInterval(() => {
        setReplayIndex(prev => {
          if (prev >= messages.length - 1) {
            setReplayPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, intervalMs)
    } else {
      if (replayIntervalRef.current) {
        clearInterval(replayIntervalRef.current)
        replayIntervalRef.current = null
      }
    }
    return () => {
      if (replayIntervalRef.current) {
        clearInterval(replayIntervalRef.current)
        replayIntervalRef.current = null
      }
    }
  }, [replayMode, replayPlaying, replaySpeed, messages.length])

  // Replay: enter / exit handlers
  const enterReplay = useCallback(() => {
    setReplayMode(true)
    setReplayIndex(0)
    setReplayPlaying(false)
    setReplaySpeed(1)
  }, [])

  const exitReplay = useCallback(() => {
    setReplayMode(false)
    setReplayIndex(0)
    setReplayPlaying(false)
  }, [])

  // Replay: step forward / backward
  const replayNext = useCallback(() => {
    setReplayIndex(prev => Math.min(prev + 1, messages.length - 1))
  }, [messages.length])

  const replayPrev = useCallback(() => {
    setReplayIndex(prev => Math.max(prev - 1, 0))
  }, [])

  // Replay: toggle play/pause
  const toggleReplayPlay = useCallback(() => {
    if (replayIndex >= messages.length - 1) {
      setReplayIndex(0)
      setReplayPlaying(true)
    } else {
      setReplayPlaying(p => !p)
    }
  }, [replayIndex, messages.length])

  // Replay: is complete
  const isReplayComplete = replayMode && replayIndex >= messages.length - 1 && !replayPlaying

  // Replay: scroll active message into view
  useEffect(() => {
    if (replayMode && scrollRef.current) {
      const activeEl = scrollRef.current.querySelector('[data-replay-active="true"]')
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [replayIndex, replayMode])

  let lastRound = -1

  const handleScrollToMessage = useCallback((messageId: string) => {
    const el = messageRefs.current[messageId]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('ring-2', 'ring-emerald-400/50', 'rounded-lg')
      setTimeout(() => el.classList.remove('ring-2', 'ring-emerald-400/50', 'rounded-lg'), 2000)
    }
  }, [])

  return (
    <div className="flex h-full">
      {/* Annotation Panel (sidebar) */}
      <AnimatePresence>
        {showAnnotationPanel && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="overflow-hidden shrink-0"
          >
            <AnnotationPanel
              meetingId={meeting.id}
              annotations={annotations}
              messages={messages}
              agents={agents}
              onRemove={removeAnnotation}
              onScrollToMessage={handleScrollToMessage}
              lang={lang}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col h-full flex-1 min-w-0">
      {/* Glassmorphism Header */}
      <div className="px-4 py-3 border-b backdrop-blur-lg glass-toolbar">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Meeting Selector Dropdown */}
            {meetings.length > 1 && onSelectMeeting ? (
              <Select value={meeting.id} onValueChange={(id) => {
                const found = meetings.find(m => m.id === id)
                if (found) onSelectMeeting(found)
              }}>
                <SelectTrigger className="vl-input h-7 text-xs w-auto max-w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="vl-dialog">
                  {meetings.map(m => (
                    <SelectItem key={m.id} value={m.id} className="vl-text-heading focus:bg-[var(--vl-bg-card-hover)] focus:text-[var(--vl-text-white)] text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: m.status === 'completed' ? '#10b981' : m.status === 'running' ? '#f59e0b' : '#64748b' }} />
                        {m.saveName}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <h3 className="text-sm font-medium" style={{ color: 'var(--vl-text-white)' }}>{meeting.saveName}</h3>
            )}
            <Badge variant="outline" className={`${statusColor(meeting.status)} text-[10px]`}>
              {meeting.status === 'running' && <PulsingDot color="#f59e0b" />}
              {meeting.status !== 'running' && meeting.status}
              {meeting.status === 'running' && <span className="ml-1">running</span>}
            </Badge>
            {meeting.status === 'running' && <MeetingTimer startedAt={meeting.updatedAt} />}
      <Badge variant="secondary" className="vl-inner vl-text-body text-[10px] px-1.5">
              <MessageSquare className="size-2.5 mr-0.5" />
              {messages.length}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className={`h-7 w-7 p-0 transition-colors ${showAnnotationPanel ? 'text-emerald-400 bg-emerald-500/10' : 'vl-text-muted hover:text-white'}`} onClick={() => setShowAnnotationPanel(!showAnnotationPanel)} aria-label={t(lang, 'annotations.title')}>
                    <StickyNote className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t(lang, 'annotations.title')} {annotationCount > 0 ? `(${annotationCount})` : ''}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {/* Replay Button — only for completed meetings with messages */}
            {meeting.status === 'completed' && messages.length > 0 && !replayMode && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 vl-text-muted hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors" onClick={enterReplay} aria-label={t(lang, 'replay.title')}>
                      <PlayCircle className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t(lang, 'replay.title')}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 vl-text-muted hover:text-white" onClick={() => setShowMeetingInfo(!showMeetingInfo)} aria-label="Toggle meeting info">
                    <Info className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="tooltip-glass">Meeting Info</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 vl-text-muted hover:text-white" onClick={() => setShowSearch(!showSearch)} aria-label="Search messages">
                    <Search className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Search messages</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 vl-text-muted hover:text-white" aria-label="Export discussion">
                  <Download className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="vl-dialog" align="end">
                <DropdownMenuLabel className="vl-text-muted text-xs">Export Discussion</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[var(--vl-border)]" />
                <DropdownMenuItem className="vl-text-body focus:bg-[var(--vl-bg-card-hover)] focus:text-[var(--vl-text-white)] cursor-pointer text-xs" onClick={() => exportDiscussionAsMarkdown(meeting)}>
                  <FileText className="size-3.5 mr-2 text-emerald-400" /> Export as Markdown
                </DropdownMenuItem>
                <DropdownMenuItem className="vl-text-body focus:bg-[var(--vl-bg-card-hover)] focus:text-[var(--vl-text-white)] cursor-pointer text-xs" onClick={() => exportDiscussionAsJSON(meeting)}>
                  <FileJson className="size-3.5 mr-2 text-cyan-400" /> Export as JSON
                </DropdownMenuItem>
                <DropdownMenuItem className="vl-text-body focus:bg-[var(--vl-bg-card-hover)] focus:text-[var(--vl-text-white)] cursor-pointer text-xs" onClick={() => exportDiscussionAsCSV(meeting)}>
                  <FileSpreadsheet className="size-3.5 mr-2 text-amber-400" /> Export as CSV
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[var(--vl-border)]" />
                <DropdownMenuItem className="vl-text-body focus:bg-[var(--vl-bg-card-hover)] focus:text-[var(--vl-text-white)] cursor-pointer text-xs" onClick={() => { window.open(`/api/export/pdf?meetingId=${meeting.id}`, '_blank') }}>
                  <FileText className="size-3.5 mr-2 text-emerald-400" /> Print Report (PDF)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 vl-text-muted hover:text-white" onClick={onRefresh} aria-label="Refresh discussion">
              <RotateCcw className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Participant Avatars Row */}
        {participants.length > 0 && (
          <div className="flex items-center gap-1 mt-1.5">
            <span className="text-[10px] vl-text-muted mr-1">Participants:</span>
            <div className="flex items-center">
              {participants.map((p, i) => (
                <TooltipProvider key={p.id || i}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white ring-2 ring-[var(--vl-border)]"
                        style={{ backgroundColor: p.color, marginLeft: i > 0 ? '-4px' : '0', zIndex: participants.length - i }}
                      >
                        {renderAgentIcon(p.icon, 'size-3')}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{p.title}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>
        )}

        {/* Running Progress Bar */}
        {meeting.status === 'running' && runningProgress && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--vl-border)' }}>
              <motion.div
                className="h-full bg-emerald-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.max((runningProgress.currentRound / runningProgress.totalRounds) * 100, 5)}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <span className="text-[10px] vl-text-muted shrink-0">Round {runningProgress.currentRound}/{runningProgress.totalRounds}</span>
          </div>
        )}
      </div>

      {/* Replay Control Bar */}
      <AnimatePresence>
        {replayMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="replay-control-bar">
              {/* Scrubber row */}
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[10px] vl-text-muted shrink-0 font-mono w-16 text-right">
                  {replayIndex + 1}/{messages.length}
                </span>
                <input
                  type="range"
                  min={0}
                  max={messages.length - 1}
                  value={replayIndex}
                  onChange={(e) => { setReplayIndex(Number(e.target.value)); setReplayPlaying(false) }}
                  className="replay-scrubber flex-1"
                  aria-label={t(lang, 'replay.progress')}
                />
                <span className="text-[10px] vl-text-muted shrink-0 w-10">
                  {messages.length > 0 ? Math.round(((replayIndex + 1) / messages.length) * 100) : 0}%
                </span>
              </div>
              {/* Controls row */}
              <div className="flex items-center gap-2">
                {/* Exit Replay */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[10px] vl-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        onClick={exitReplay}
                        aria-label={t(lang, 'replay.exit')}
                      >
                        <X className="size-3.5 mr-1" />
                        {t(lang, 'replay.exit')}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t(lang, 'replay.exit')}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <div className="flex-1" />

                {/* Previous */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 vl-text-muted hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                        onClick={replayPrev}
                        disabled={replayIndex <= 0}
                        aria-label={t(lang, 'replay.prev')}
                      >
                        <SkipBack className="size-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t(lang, 'replay.prev')}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Play / Pause */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 hover:text-emerald-300 transition-colors"
                        onClick={toggleReplayPlay}
                        aria-label={replayPlaying ? t(lang, 'replay.pause') : t(lang, 'replay.play')}
                      >
                        {replayPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5 ml-0.5" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{replayPlaying ? t(lang, 'replay.pause') : t(lang, 'replay.play')}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Next */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 vl-text-muted hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                        onClick={replayNext}
                        disabled={replayIndex >= messages.length - 1}
                        aria-label={t(lang, 'replay.next')}
                      >
                        <SkipForward className="size-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t(lang, 'replay.next')}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Speed Control */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[10px] font-mono vl-text-muted hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                        onClick={() => {
                          const speeds = [0.5, 1, 2]
                          const idx = speeds.indexOf(replaySpeed)
                          setReplaySpeed(speeds[(idx + 1) % speeds.length])
                        }}
                        aria-label={t(lang, 'replay.speed')}
                      >
                        <Timer className="size-3 mr-1" />
                        {replaySpeed}x
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t(lang, 'replay.speed')}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Replay Complete badge */}
              <AnimatePresence>
                {isReplayComplete && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="mt-2 flex items-center justify-center"
                  >
                    <span className="replay-complete-badge inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="size-3.5" />
                      {t(lang, 'replay.finished')}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Meeting Info Panel (collapsible) */}
      <Collapsible open={showMeetingInfo} onOpenChange={setShowMeetingInfo}>
        <CollapsibleContent>
          <div className="px-4 py-3 border-b vl-inner space-y-3 max-h-64 overflow-y-auto">
            <div className="flex items-center gap-1.5 mb-2">
              <Info className="size-3 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-400">Meeting Info</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="vl-inner rounded-lg p-2">
                <p className="text-[10px] vl-text-muted mb-0.5">Type</p>
                <p className="text-xs vl-text-body">{meeting.type === 'team' ? 'Team Meeting' : 'Individual Meeting'}</p>
              </div>
              <div className="vl-inner rounded-lg p-2">
                <p className="text-[10px] vl-text-muted mb-0.5">Status</p>
                <p className="text-xs vl-text-body capitalize">{meeting.status}</p>
              </div>
              <div className="vl-inner rounded-lg p-2">
                <p className="text-[10px] vl-text-muted mb-0.5 flex items-center gap-1"><ThermometerSun className="size-2.5" /> Temperature</p>
                <p className="text-xs vl-text-body font-mono">{meeting.temperature}</p>
              </div>
              {meeting.numRounds && (
                <div className="vl-inner rounded-lg p-2">
                  <p className="text-[10px] vl-text-muted mb-0.5 flex items-center gap-1"><Hash className="size-2.5" /> Rounds</p>
                  <p className="text-xs vl-text-body font-mono">{meeting.numRounds}</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-[10px] vl-text-muted">
              <Clock className="size-2.5" />
              <span>Created: {new Date(meeting.createdAt).toLocaleString()}</span>
              <span>&middot;</span>
              <span>Updated: {new Date(meeting.updatedAt).toLocaleString()}</span>
            </div>
            {meeting.agendaQuestions?.length > 0 && (
              <div>
                <p className="text-[10px] vl-text-muted mb-1 flex items-center gap-1"><ListChecks className="size-2.5" /> Agenda Questions:</p>
                {meeting.agendaQuestions.map((q, i) => (
                  <p key={i} className="vl-text-body text-xs ml-3">{i + 1}. {q}</p>
                ))}
              </div>
            )}
            {meeting.agendaRules?.length > 0 && (
              <div>
                <p className="text-[10px] vl-text-muted mb-1 flex items-center gap-1"><ShieldAlert className="size-2.5" /> Agenda Rules:</p>
                {meeting.agendaRules.map((r, i) => (
                  <p key={i} className="vl-text-body text-xs ml-3">{i + 1}. {r}</p>
                ))}
              </div>
            )}
            {/* Participants with system prompts */}
            {meeting.teamLead && (
              <div>
                <p className="text-[10px] vl-text-muted mb-1 flex items-center gap-1"><Crown className="size-2.5" /> Team Lead:</p>
                <div className="flex items-center gap-2 ml-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: meeting.teamLead.color }}>
                    {renderAgentIcon(meeting.teamLead.icon, 'size-3 text-white')}
                  </div>
                  <span className="text-xs vl-text-body">{meeting.teamLead.title}</span>
                </div>
              </div>
            )}
            {meeting.teamMembers && meeting.teamMembers.length > 0 && (
              <div>
                <p className="text-[10px] vl-text-muted mb-1 flex items-center gap-1"><Users className="size-2.5" /> Team Members:</p>
                {meeting.teamMembers.map(m => (
                  <div key={m.id} className="flex items-center gap-2 ml-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: m.color }}>
                      {renderAgentIcon(m.icon, 'size-3 text-white')}
                    </div>
                    <span className="text-xs vl-text-body">{m.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {showSearch && (
        <div className="px-4 py-2 border-b vl-inner">
          <div className="relative">
            <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 vl-text-muted" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              className="vl-input text-sm pl-9 h-8"
            />
            {searchQuery && (
              <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 vl-text-muted hover:text-white" onClick={() => setSearchQuery('')}>
                <X className="size-3" />
              </Button>
            )}
          </div>
          {searchQuery && (
            <p className="text-[10px] vl-text-muted mt-1">{displayMessages.length} of {messages.length} messages</p>
          )}
        </div>
      )}

      {/* Agent Participation Summary */}
      {agentParticipation.length > 0 && (
        <div className="px-4 py-2 border-b vl-inner">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] vl-text-muted mr-1">
              {t(lang, 'meeting.participation') || 'Participation'}:
            </span>
            {agentParticipation.map(p => (
              <button
                key={p.name}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] transition-colors border ${
                  filterAgent === p.name
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                    : 'border-[var(--vl-border-subtle)] vl-text-muted hover:border-emerald-500/30 hover:text-emerald-400'
                }`}
                onClick={() => setFilterAgent(filterAgent === p.name ? null : p.name)}
                title={`${p.name}: ${p.count} messages (${p.percentage}%)`}
              >
                {p.agent && (
                  <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: p.agent.color }}>
                    <span className="text-[6px] font-bold">{p.agent.title.charAt(0)}</span>
                  </div>
                )}
                <span className="font-medium">{p.name}</span>
                <span className="vl-text-muted">{p.percentage}%</span>
              </button>
            ))}
            {/* Word Cloud toggle */}
            {wordCloudData.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-6 w-6 p-0 ml-auto shrink-0 ${showWordCloud ? 'text-emerald-400' : 'vl-text-muted hover:text-emerald-400'}`}
                      onClick={() => setShowWordCloud(!showWordCloud)}
                    >
                      <Cloud className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t(lang, 'meeting.wordCloud') || 'Word Cloud'}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {filterAgent && (
              <Button variant="ghost" size="sm" className="h-5 text-[9px] vl-text-muted hover:text-emerald-400 px-1.5" onClick={() => setFilterAgent(null)}>
                <X className="size-2.5 mr-0.5" /> {t(lang, 'common.filter')}: {filterAgent}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Word Cloud */}
      <AnimatePresence>
        {showWordCloud && wordCloudData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-3 border-b vl-inner overflow-hidden"
          >
            <p className="text-[10px] vl-text-muted mb-2 flex items-center gap-1">
              <Cloud className="size-3" />
              {t(lang, 'meeting.wordCloud') || 'Word Cloud'} — {t(lang, 'meeting.topWords') || 'Top 20 words'}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 justify-center">
              {wordCloudData.map(([word, count], i) => {
                const maxCount = wordCloudData[0][1]
                const minCount = wordCloudData[wordCloudData.length - 1][1]
                const range = maxCount - minCount || 1
                const normalized = (count - minCount) / range
                const fontSize = 10 + normalized * 16 // 10px to 26px
                const opacity = 0.4 + normalized * 0.6 // 0.4 to 1.0
                const colors = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ec4899', '#ef4444', '#14b8a6']
                const color = colors[i % colors.length]
                return (
                  <motion.span
                    key={word}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity }}
                    transition={{ delay: i * 0.03, type: 'spring', stiffness: 200, damping: 15 }}
                    className="inline-block cursor-default hover:scale-125 transition-transform"
                    style={{ fontSize: `${fontSize}px`, color, fontWeight: normalized > 0.5 ? 700 : 500 }}
                    title={`${word}: ${count}x`}
                  >
                    {word}
                  </motion.span>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef}>
        <div className="space-y-4">
          {/* Collapsible Agenda at top */}
          {meeting.agenda && (
            <Collapsible open={showAgenda} onOpenChange={setShowAgenda}>
              <CollapsibleTrigger className="flex items-center gap-2 text-xs vl-text-muted hover:text-[var(--vl-text-secondary)] transition-colors w-full text-left py-1 group">
                <BookOpen className="size-3 shrink-0" />
                <span className="font-medium">Agenda</span>
                <motion.div animate={{ rotate: showAgenda ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown className="size-3" />
                </motion.div>
                <span className="text-[10px] vl-text-muted ml-auto group-hover:text-[var(--vl-text-muted)]">{meeting.agenda.substring(0, 60)}...</span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="vl-inner rounded-lg p-3 vl-text-body text-xs vl-prose prose-sm max-w-none mb-2">
                  <ReactMarkdown>{meeting.agenda}</ReactMarkdown>
                  {meeting.agendaQuestions?.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-[var(--vl-border-subtle)]">
                      <p className="text-[10px] vl-text-muted mb-1">Questions:</p>
                      {meeting.agendaQuestions.map((q, i) => (
                        <p key={i} className="vl-text-body">{i + 1}. {q}</p>
                      ))}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Draft Meeting - Run Banner */}
          {isDraft && onRunMeeting && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 rounded-xl p-6 border border-emerald-500/20 text-center relative overflow-hidden"
            >
              {/* Animated glow background */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-teal-500/5"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />
              <div className="relative z-10">
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/10">
                    <Play className="size-7 text-emerald-400 ml-0.5" />
                  </div>
                </motion.div>
                <h4 className="text-base font-semibold mb-1" style={{ color: 'var(--vl-text-white)' }}>Ready to Run</h4>
                <p className="text-xs vl-text-muted mb-4 max-w-sm mx-auto">
                  This meeting is configured and ready. Click to start the AI agent discussion.
                  {meeting.numRounds && (
                    <span className="block mt-1 vl-text-muted">It will run for {meeting.numRounds} round{meeting.numRounds > 1 ? 's' : ''} with temperature {meeting.temperature}.</span>
                  )}
                </p>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    onClick={() => onRunMeeting(meeting)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/25 px-8 glow-pulse-border depth-shadow-glow"
                    disabled={isRunning}
                    size="lg"
                  >
                    {isRunning ? (
                      <Loader2 className="size-5 animate-spin mr-2" />
                    ) : (
                      <Play className="size-5 mr-2" />
                    )}
                    {isRunning ? 'Running...' : 'Run Meeting'}
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}

          {messages.length === 0 && !isDraft && (
            <EmptyState
              icon={MessageSquare}
              title="No messages yet"
              description="Run the meeting to start the discussion"
            />
          )}
          <AnimatePresence>
            {(replayMode ? messages : displayMessages).map((msg, idx) => {
              // In replay mode, use the message's actual index in the full messages array
              const actualIndex = replayMode ? idx : messages.indexOf(msg)
              const showRoundDivider = msg.roundIndex !== lastRound
              lastRound = msg.roundIndex
              const isLatest = idx === messages.length - 1 && meeting.status === 'running'

              // Replay visibility
              const isReplayRevealed = !replayMode || actualIndex <= replayIndex
              const isReplayActive = replayMode && actualIndex === replayIndex
              const isReplayHidden = replayMode && actualIndex > replayIndex

              // In replay mode, only show round divider if this is the first revealed message of this round
              const showReplayRoundDivider = replayMode && isReplayRevealed && showRoundDivider && !messages.slice(0, actualIndex).some(m => m.roundIndex === msg.roundIndex)

              return (
                <React.Fragment key={msg.id}>
                  {(showRoundDivider && !replayMode) || (showReplayRoundDivider && replayMode) ? (
                    <RoundDivider round={msg.roundIndex + 1} total={meeting.numRounds} />
                  ) : null}
                  <div
                    ref={(el) => { messageRefs.current[msg.id] = el }}
                    className={`group/ann-wrapper ${isReplayActive ? 'replay-active-message' : ''} ${isReplayRevealed && !isReplayHidden ? 'replay-message-enter' : ''} ${isReplayHidden ? 'opacity-0 max-h-0 overflow-hidden transition-all duration-500 pointer-events-none' : ''}`}
                    data-replay-active={isReplayActive ? 'true' : undefined}
                  >
                    <ChatMessage msg={msg} agents={agents} isLatest={isLatest} showWordCount={!replayMode} onAgentClick={onAgentClick} />
                    {!replayMode && (
                      <AnnotationBar
                        messageId={msg.id}
                        annotations={getAnnotations(msg.id)}
                        onAdd={addAnnotation}
                        onRemove={removeAnnotation}
                        lang={lang}
                      />
                    )}
                  </div>
                </React.Fragment>
              )
            })}
          </AnimatePresence>
          {meeting.status === 'running' && (
            <AgentTypingIndicator agentName={(() => {
              const participantNames = participants.map(p => p.title)
              if (participantNames.length === 0) return 'Agent'
              const lastMsgIdx = messages.length - 1
              const nextIdx = lastMsgIdx >= 0 ? (participantNames.indexOf(messages[lastMsgIdx].agentName) + 1) % participantNames.length : 0
              return participantNames[nextIdx] || 'Agent'
            })()} />
          )}
          {searchQuery && displayMessages.length === 0 && messages.length > 0 && (
            <div className="text-center py-8">
              <Search className="size-8 vl-text-muted mx-auto mb-2" />
              <p className="vl-text-muted text-sm">No messages match &ldquo;{searchQuery}&rdquo;</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Enhanced Summary */}
      {meeting.status === 'completed' && meeting.summary && (
        <div className="px-4 py-3 border-t vl-inner">
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center gap-2 mb-2 w-full group">
              <Sparkles className="size-4 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-400">Meeting Summary</span>
              <motion.div animate={{ rotate: 180 }} transition={{ duration: 0.2 }} className="ml-auto">
                <ChevronDown className="size-3 text-emerald-400" />
              </motion.div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="vl-inner rounded-lg p-3 border border-emerald-500/10 vl-text-body text-xs vl-prose prose-sm max-w-none">
                <ReactMarkdown>{meeting.summary}</ReactMarkdown>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] vl-text-muted hover:text-emerald-400 hover:bg-emerald-500/10"
                    >
                      <Download className="size-3 mr-1" /> Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="vl-dialog" align="end">
                    <DropdownMenuItem className="vl-text-body focus:bg-[var(--vl-bg-card-hover)] focus:text-[var(--vl-text-white)] cursor-pointer text-xs" onClick={() => exportDiscussionAsMarkdown(meeting)}>
                      <FileText className="size-3.5 mr-2 text-emerald-400" /> Markdown
                    </DropdownMenuItem>
                    <DropdownMenuItem className="vl-text-body focus:bg-[var(--vl-bg-card-hover)] focus:text-[var(--vl-text-white)] cursor-pointer text-xs" onClick={() => exportDiscussionAsJSON(meeting)}>
                      <FileJson className="size-3.5 mr-2 text-cyan-400" /> JSON
                    </DropdownMenuItem>
                    <DropdownMenuItem className="vl-text-body focus:bg-[var(--vl-bg-card-hover)] focus:text-[var(--vl-text-white)] cursor-pointer text-xs" onClick={() => exportDiscussionAsCSV(meeting)}>
                      <FileSpreadsheet className="size-3.5 mr-2 text-amber-400" /> CSV
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-[var(--vl-border)]" />
                    <DropdownMenuItem className="vl-text-body focus:bg-[var(--vl-bg-card-hover)] focus:text-[var(--vl-text-white)] cursor-pointer text-xs" onClick={() => { window.open(`/api/export/pdf?meetingId=${meeting.id}`, '_blank') }}>
                      <FileText className="size-3.5 mr-2 text-emerald-400" /> Print Report (PDF)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <span className="text-[10px] vl-text-muted">{messages.length} messages &middot; {meeting.numRounds || '?'} rounds</span>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {/* Message Input - Enhanced Human Injection */}
      {!isDraft && (
        <div className="px-4 py-3 border-t vl-inner">
          {/* Join Discussion Banner for running meetings */}
          {meeting.status === 'running' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 mb-3 flex items-center gap-2"
            >
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                <UserPlus className="size-3 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-emerald-400">Join Discussion</p>
                <p className="text-[10px] vl-text-muted">Your messages will be visible to all agents in the meeting</p>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="size-3.5 vl-text-muted cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[240px]">
                    <p className="text-xs">When you send a message, it appears as &ldquo;User&rdquo; in the discussion. Agents will see and respond to your input in subsequent rounds.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </motion.div>
          )}
          <div className="flex gap-2">
            {/* Collapsible Formatting Toolbar */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`p-1 rounded-md transition-colors ${toolbarExpanded ? 'text-emerald-400 bg-emerald-500/10' : 'vl-text-muted hover:text-emerald-400 hover:bg-[var(--vl-bg-card-hover)]'}`}
                        onClick={() => setToolbarExpanded(prev => !prev)}
                        aria-label={toolbarExpanded ? t(lang, 'toolbar.collapse') : t(lang, 'toolbar.expand')}
                      >
                        <PlusIcon className="size-3.5" />
                      </motion.button>
                    </TooltipTrigger>
                    <TooltipContent>{toolbarExpanded ? t(lang, 'toolbar.collapse') : t(lang, 'toolbar.expand')}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <AnimatePresence>
                {toolbarExpanded && (
                  <motion.div
                    initial={{ opacity: 0, width: 0, overflow: 'hidden' }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="flex items-center gap-0.5 overflow-hidden"
                  >
                    {([
                      { action: 'bold', icon: Bold, label: t(lang, 'toolbar.bold') },
                      { action: 'italic', icon: Italic, label: t(lang, 'toolbar.italic') },
                      { action: 'code', icon: CodeIcon, label: t(lang, 'toolbar.code') },
                      { action: 'codeblock', icon: CodeIcon, label: t(lang, 'toolbar.codeBlock') },
                      { action: 'link', icon: Link, label: t(lang, 'toolbar.link') },
                      { action: 'list', icon: ListIcon, label: t(lang, 'toolbar.list') },
                    ]).map(tool => (
                      <TooltipProvider key={tool.action}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="p-1.5 rounded-md vl-text-muted hover:text-emerald-400 hover:bg-[var(--vl-bg-card-hover)] transition-colors"
                              onClick={() => handleToolbarAction(tool.action)}
                              aria-label={tool.label}
                            >
                              <tool.icon className="size-3.5" />
                            </motion.button>
                          </TooltipTrigger>
                          <TooltipContent>{tool.label}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <Input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage() } }}
              placeholder={meeting.status === 'running' ? 'Type a message to join the discussion...' : 'Add a message to the discussion...'}
              className="vl-input text-sm flex-1"
              disabled={sending}
            />
            <Button
              onClick={handleSendMessage}
              disabled={sending || !userMessage.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
              size="sm"
            >
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}

// ============================================================
// Dashboard Hero Component
// ============================================================

export function DashboardHero({ totalAgents, activeMeetings, onCreateMeeting }: {
  totalAgents: number; activeMeetings: number; onCreateMeeting: () => void
}) {
  const subtitleText = 'AI agents collaborating on scientific research — create, discuss, discover.'
  const typedSubtitle = useTypingEffect(subtitleText, 30, 800)

  return (
    <div className="relative overflow-hidden rounded-xl border border-emerald-500/10 h-[180px] sm:h-[280px] fluid-morph-bg">
      <DNAHelixBackground />
      <div className="absolute inset-0" style={{ background: 'var(--vl-bg-hero-overlay)' }} />
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/20 via-transparent to-teal-900/10" />
      <div className="absolute inset-0 flex items-center p-4 sm:p-6 md:p-8" style={{ zIndex: 2 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-4">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2 gradient-text text-shimmer neon-glow-text vl-text-balance">
              Virtual Lab
            </h2>
            <p className="text-sm sm:text-base max-w-xl leading-relaxed" style={{ color: 'var(--vl-text-secondary)' }}>
              {typedSubtitle}
              {typedSubtitle.length < subtitleText.length && (
                <span className="inline-block w-0.5 h-4 bg-emerald-400 animate-pulse ml-0.5 align-middle" />
              )}
            </p>
            <div className="flex items-center gap-3 mt-3">
              <Badge variant="outline" className="bg-emerald-600/70 text-white border-emerald-500/50 text-xs">
                <FlaskConical className="size-3 mr-1" /> {totalAgents} agents
              </Badge>
              {activeMeetings > 0 && (
                <Badge variant="outline" className="bg-amber-600/70 text-white border-amber-500/50 text-xs">
                  <PulsingDot color="#fbbf24" /> {activeMeetings} active
                </Badge>
              )}
            </div>
          </div>
          <div className="glass-card-depth rounded-xl inline-block">
            <Button
              onClick={onCreateMeeting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all duration-300 shrink-0 magnetic-btn hover-lift depth-shadow-glow floating-element"
              size="lg"
            >
              <Sparkles className="size-4 mr-2" /> Start Research
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}


// ============================================================
// Agent Collaboration Network Graph (SVG)
// ============================================================

export function AgentCollaborationNetwork({ network }: { network: { nodes: CollaborationNode[]; edges: CollaborationEdge[] } }) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null)

  if (network.nodes.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center text-sm vl-text-muted">
        No agent collaboration data yet
      </div>
    )
  }

  const W = 400
  const H = 280
  const CX = W / 2
  const CY = H / 2
  const radius = Math.min(W, H) * 0.32

  // Position nodes in a circle
  const nodePositions = new Map<string, { x: number; y: number }>()
  network.nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / network.nodes.length - Math.PI / 2
    nodePositions.set(node.id, {
      x: CX + radius * Math.cos(angle),
      y: CY + radius * Math.sin(angle),
    })
  })

  const maxMeetings = Math.max(...network.nodes.map((n) => n.meetings), 1)
  const maxWeight = Math.max(...network.edges.map((e) => e.weight), 1)

  return (
    <div className="h-[280px] flex items-center justify-center overflow-hidden">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="max-w-full">
        {/* Edges */}
        {network.edges.map((edge) => {
          const srcNode = network.nodes.find((n) => n.name === edge.source)
          const tgtNode = network.nodes.find((n) => n.name === edge.target)
          if (!srcNode || !tgtNode) return null
          const src = nodePositions.get(srcNode.id)
          const tgt = nodePositions.get(tgtNode.id)
          if (!src || !tgt) return null

          const edgeKey = `${edge.source}-${edge.target}`
          const isHovered = hoveredEdge === edgeKey
          const strokeW = 1 + (edge.weight / maxWeight) * 4

          return (
            <g key={edgeKey}>
              <line
                x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                stroke={isHovered ? '#10b981' : 'rgba(100,116,139,0.4)'}
                strokeWidth={isHovered ? strokeW + 1 : strokeW}
                onMouseEnter={() => setHoveredEdge(edgeKey)}
                onMouseLeave={() => setHoveredEdge(null)}
                style={{ cursor: 'pointer', transition: 'stroke 0.2s, stroke-width 0.2s' }}
              />
              {/* Edge tooltip */}
              {isHovered && (
                <text
                  x={(src.x + tgt.x) / 2}
                  y={(src.y + tgt.y) / 2 - 8}
                  textAnchor="middle"
                  fill="#10b981"
                  fontSize={10}
                  fontWeight={600}
                >
                  {edge.weight} shared meeting{edge.weight > 1 ? 's' : ''}
                </text>
              )}
            </g>
          )
        })}

        {/* Nodes */}
        {network.nodes.map((node) => {
          const pos = nodePositions.get(node.id)
          if (!pos) return null
          const r = 14 + (node.meetings / maxMeetings) * 16
          const isHovered = hoveredNode === node.id
          const isConnected = hoveredNode
            ? network.edges.some(
                (e) =>
                  (e.source === network.nodes.find((n) => n.id === hoveredNode)?.name &&
                    e.target === node.name) ||
                  (e.target === network.nodes.find((n) => n.id === hoveredNode)?.name &&
                    e.source === node.name) ||
                  node.id === hoveredNode
              )
            : true

          return (
            <g
              key={node.id}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{ cursor: 'pointer', opacity: isConnected ? 1 : 0.3, transition: 'opacity 0.2s' }}
            >
              {/* Glow effect */}
              {isHovered && (
                <circle cx={pos.x} cy={pos.y} r={r + 6} fill={node.color} opacity={0.15} />
              )}
              <circle
                cx={pos.x} cy={pos.y} r={r}
                fill={node.color}
                stroke={isHovered ? '#fff' : 'rgba(255,255,255,0.15)'}
                strokeWidth={isHovered ? 2.5 : 1.5}
                style={{ transition: 'stroke 0.2s, stroke-width 0.2s' }}
              />
              {/* Initials */}
              <text
                x={pos.x} y={pos.y}
                textAnchor="middle" dominantBaseline="central"
                fill="white" fontSize={11} fontWeight={700}
              >
                {node.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
              </text>
              {/* Label */}
              <text
                x={pos.x} y={pos.y + r + 14}
                textAnchor="middle"
                fill={isHovered ? 'var(--vl-text-white)' : 'var(--vl-text-muted)'}
                fontSize={9} fontWeight={isHovered ? 600 : 400}
              >
                {node.name}
              </text>
              {/* Meeting count on hover */}
              {isHovered && (
                <text
                  x={pos.x} y={pos.y + r + 25}
                  textAnchor="middle"
                  fill="#10b981"
                  fontSize={8}
                >
                  {node.meetings} meeting{node.meetings !== 1 ? 's' : ''}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ============================================================
// Message Timeline Heatmap
// ============================================================

export function MessageTimelineHeatmap({ timeline }: { timeline: { hour: number; agentName: string; count: number }[] }) {
  const [tooltip, setTooltip] = useState<{ hour: number; agent: string; count: number; x: number; y: number } | null>(null)

  if (timeline.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-sm vl-text-muted">
        No message timeline data yet
      </div>
    )
  }

  // Get unique agents and hours
  const agents = [...new Set(timeline.map((t) => t.agentName))].sort()
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const maxCount = Math.max(...timeline.map((t) => t.count), 1)

  // Build lookup map
  const lookup = new Map<string, number>()
  timeline.forEach((t) => {
    lookup.set(`${t.hour}-${t.agentName}`, t.count)
  })

  const getHeatColor = (count: number) => {
    if (count === 0) return 'var(--vl-bg-inner)'
    const intensity = count / maxCount
    if (intensity < 0.25) return 'rgba(16, 185, 129, 0.2)'
    if (intensity < 0.5) return 'rgba(16, 185, 129, 0.4)'
    if (intensity < 0.75) return 'rgba(16, 185, 129, 0.65)'
    return 'rgba(16, 185, 129, 0.9)'
  }

  // Only show hours that have data, or a reasonable subset
  const activeHours = hours.filter((h) => timeline.some((t) => t.hour === h))
  const displayHours = activeHours.length > 0 ? activeHours : [9, 10, 11, 12, 13, 14, 15, 16, 17]

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[360px]">
        {/* Header row: hours */}
        <div className="flex items-center gap-0">
          <div className="w-[90px] flex-shrink-0" />
          {displayHours.map((h) => (
            <div key={h} className="flex-1 min-w-[18px] text-center text-[8px] vl-text-muted pb-1">
              {h}
            </div>
          ))}
        </div>
        {/* Agent rows */}
        {agents.map((agent) => (
          <div key={agent} className="flex items-center gap-0">
            <div className="w-[90px] flex-shrink-0 text-[9px] vl-text-muted truncate pr-2 text-right">
              {agent}
            </div>
            {displayHours.map((h) => {
              const count = lookup.get(`${h}-${agent}`) || 0
              return (
                <div
                  key={`${h}-${agent}`}
                  className="flex-1 min-w-[18px] h-[20px] border border-[var(--vl-border-subtle)]"
                  style={{ backgroundColor: getHeatColor(count) }}
                  onMouseEnter={(e) => {
                    if (count > 0) {
                      const rect = e.currentTarget.getBoundingClientRect()
                      const parentRect = e.currentTarget.parentElement?.parentElement?.getBoundingClientRect()
                      setTooltip({
                        hour: h,
                        agent,
                        count,
                        x: rect.left - (parentRect?.left || 0),
                        y: rect.top - (parentRect?.top || 0),
                      })
                    }
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              )
            })}
          </div>
        ))}
        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute z-50 px-2 py-1 rounded text-[10px] bg-[var(--vl-bg-secondary)] text-white border border-[var(--vl-border)] pointer-events-none"
            style={{ left: tooltip.x, top: tooltip.y - 28 }}
          >
            {tooltip.count} message{tooltip.count !== 1 ? 's' : ''} at {tooltip.hour}:00 by {tooltip.agent}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Research Progress Tracker (Workflow Pipeline)
// ============================================================

export function ResearchProgressTracker({ workflowProgress }: { workflowProgress: Record<string, number> }) {
  const steps = [
    { key: 'ESM', name: 'ESM', description: 'Sequence generation', icon: Dna, color: '#10b981' },
    { key: 'AlphaFold', name: 'AlphaFold', description: 'Structure prediction', icon: Cpu, color: '#8b5cf6' },
    { key: 'Rosetta', name: 'Rosetta', description: 'Energy scoring', icon: FlaskConical, color: '#f59e0b' },
    { key: 'Combine', name: 'Combine', description: 'Rank candidates', icon: GitBranch, color: '#06b6d4' },
    { key: 'Select', name: 'Select', description: 'Final selection', icon: CheckCircle2, color: '#ef4444' },
  ]

  const hasData = Object.values(workflowProgress).some((v) => v > 0)

  if (!hasData) {
    return (
      <div className="h-[120px] flex items-center justify-center text-sm vl-text-muted">
        Run meetings to see workflow progress
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch gap-2 sm:gap-0">
        {steps.map((step, i) => {
          const progress = workflowProgress[step.key] || 0
          const Icon = step.icon
          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center gap-1.5 p-2 rounded-lg vl-inner min-w-[70px] sm:min-w-0 sm:flex-1">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center relative"
                  style={{ backgroundColor: `${step.color}20` }}
                >
                  <Icon className="size-4" style={{ color: step.color }} />
                  {/* Progress ring */}
                  <svg className="absolute inset-0" viewBox="0 0 32 32">
                    <circle
                      cx="16" cy="16" r="14"
                      fill="none" stroke="rgba(100,116,139,0.2)" strokeWidth="2"
                    />
                    <circle
                      cx="16" cy="16" r="14"
                      fill="none"
                      stroke={step.color}
                      strokeWidth="2"
                      strokeDasharray={`${progress * 88} ${88 - progress * 88}`}
                      strokeDashoffset="22"
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dasharray 0.6s ease' }}
                    />
                  </svg>
                </div>
                <span className="text-[9px] font-medium vl-text-heading">{step.name}</span>
                <span className="text-[9px] font-bold" style={{ color: step.color }}>
                  {Math.round(progress * 100)}%
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className="hidden sm:flex items-center px-0.5 shrink-0">
                  <div className="flex items-center w-3">
                    <div className="h-0.5 flex-1" style={{ background: `linear-gradient(to right, ${step.color}40, ${steps[i + 1].color}40)` }} />
                    <ArrowRight className="size-2 shrink-0" style={{ color: `${steps[i + 1].color}60` }} />
                  </div>
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>
      {/* Overall progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] vl-text-muted">
          <span>Overall Pipeline Progress</span>
          <span>{Math.round(Object.values(workflowProgress).reduce((a, b) => a + b, 0) / steps.length * 100)}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--vl-border)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${(Object.values(workflowProgress).reduce((a, b) => a + b, 0) / steps.length) * 100}%`,
              background: 'linear-gradient(to right, #10b981, #06b6d4)',
            }}
          />
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Research Analytics Section
// ============================================================

const PIE_COLORS = ['#10b981', '#06b6d4', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899', '#14b8a6']

export function ResearchAnalyticsSection({ analytics, meetings }: { analytics: AnalyticsData | null; meetings: Meeting[] }) {
  if (!analytics) return null

  // Activity chart data - show last 7 days
  const activityChartData = analytics.meetingsByDay.map(d => ({
    date: d.date.slice(5), // MM-DD
    Team: d.team,
    Individual: d.individual,
  }))

  // Agent participation pie data
  const pieData = analytics.agentParticipation.map(a => ({
    name: a.agentName,
    value: a.count,
  }))

  // Meeting type ratio
  const total = analytics.meetingTypeRatio.team + analytics.meetingTypeRatio.individual
  const teamPct = total > 0 ? Math.round((analytics.meetingTypeRatio.team / total) * 100) : 0
  const indivPct = total > 0 ? 100 - teamPct : 0

  const activityChartConfig = {
    Team: { label: 'Team', color: '#10b981' },
    Individual: { label: 'Individual', color: '#06b6d4' },
  }

  const pieChartConfig = analytics.agentParticipation.reduce((acc, a, i) => {
    acc[a.agentName] = { label: a.agentName, color: PIE_COLORS[i % PIE_COLORS.length] }
    return acc
  }, {} as Record<string, { label: string; color: string }>)

  return (
    <Card className="vl-card backdrop-blur-sm transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-4 text-emerald-400" />
          <CardTitle className="text-xl font-semibold tracking-tight vl-heading-4" style={{ color: 'var(--vl-text-white)' }}>Research Analytics</CardTitle>
        </div>
        <CardDescription className="text-sm vl-text-body">Meeting activity and agent participation insights</CardDescription>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Meeting Activity Chart */}
          <div className="space-y-3">
            <h3 className="text-base font-medium vl-text-body tracking-tight">Meeting Activity (7 days)</h3>
            <div className="vl-inner rounded-xl p-4">
              {activityChartData.some(d => d.Team > 0 || d.Individual > 0) ? (
                <ChartContainer config={activityChartConfig} className="h-[200px] w-full">
                  <BarChart data={activityChartData} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" className="[stroke:var(--vl-chart-grid)]" />
                    <XAxis dataKey="date" tick={{ fill: 'var(--vl-chart-axis)', fontSize: 11 }} axisLine={{ stroke: 'var(--vl-chart-axis-line)' }} />
                    <YAxis tick={{ fill: 'var(--vl-chart-axis)', fontSize: 11 }} axisLine={{ stroke: 'var(--vl-chart-axis-line)' }} allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="Team" fill="var(--color-Team)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Individual" fill="var(--color-Individual)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-sm vl-text-muted">
                  No meeting activity yet
                </div>
              )}
            </div>
          </div>

          {/* Agent Participation Pie */}
          <div className="space-y-3">
            <h3 className="text-base font-medium vl-text-body tracking-tight">Agent Participation</h3>
            <div className="vl-inner rounded-xl p-4">
              {pieData.length > 0 ? (
                <ChartContainer config={pieChartConfig} className="h-[200px] w-full">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-sm vl-text-muted">
                  No agent participation data yet
                </div>
              )}
              {/* Legend */}
              {pieData.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-3 justify-center">
                  {pieData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs vl-text-muted">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      {d.name} ({d.value})
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Meeting Type Distribution */}
        <div className="mt-6 space-y-3">
          <h3 className="text-base font-medium vl-text-body tracking-tight">Meeting Type Distribution</h3>
          <div className="vl-inner rounded-xl p-4">
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
                    Team ({analytics.meetingTypeRatio.team}) — {teamPct}%
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm bg-cyan-500" />
                    Individual ({analytics.meetingTypeRatio.individual}) — {indivPct}%
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm vl-text-muted text-center py-2">No meetings yet</div>
            )}
          </div>
        </div>

        {/* Agent Collaboration Network */}
        <div className="mt-6 space-y-3">
          <h3 className="text-base font-medium vl-text-body tracking-tight">Agent Collaboration Network</h3>
          <div className="vl-inner rounded-xl p-4">
            <AgentCollaborationNetwork network={analytics.collaborationNetwork} />
          </div>
        </div>

        {/* Message Timeline Heatmap */}
        <div className="mt-6 space-y-3">
          <h3 className="text-base font-medium vl-text-body tracking-tight">Discussion Timeline</h3>
          <div className="vl-inner rounded-xl p-4 relative">
            <MessageTimelineHeatmap timeline={analytics.messageTimeline} />
          </div>
        </div>

        {/* Research Progress Tracker */}
        <div className="mt-6 space-y-3">
          <h3 className="text-base font-medium vl-text-body tracking-tight">Nanobody Design Progress</h3>
          <div className="vl-inner rounded-xl p-4">
            <ResearchProgressTracker workflowProgress={analytics.workflowProgress} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Sentiment Analysis Section
// ============================================================

const POSITIVE_KEYWORDS = [
  'excellent', 'great', 'promising', 'innovative', 'effective', 'successful',
  'breakthrough', 'optimal', 'robust', 'significant', 'beneficial', 'impressive',
  'outstanding', 'remarkable', 'advantage',
]

const NEGATIVE_KEYWORDS = [
  'concern', 'risk', 'fail', 'problem', 'issue', 'limitation', 'difficult',
  'challenge', 'weakness', 'drawback', 'error', 'flaw', 'insufficient',
  'unreliable', 'inadequate',
]

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought', 'used',
  'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
  'through', 'during', 'before', 'after', 'above', 'below', 'between', 'out',
  'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there',
  'when', 'where', 'why', 'how', 'all', 'both', 'each', 'few', 'more', 'most',
  'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
  'than', 'too', 'very', 'just', 'because', 'but', 'and', 'or', 'if', 'while',
  'about', 'against', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'me',
  'my', 'we', 'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'they',
  'them', 'their', 'what', 'which', 'who',
])

export function analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
  const lower = text.toLowerCase()
  const words = lower.split(/\W+/)
  let posScore = 0
  let negScore = 0
  for (const word of words) {
    if (POSITIVE_KEYWORDS.includes(word)) posScore++
    if (NEGATIVE_KEYWORDS.includes(word)) negScore++
  }
  if (posScore > negScore) return 'positive'
  if (negScore > posScore) return 'negative'
  return 'neutral'
}

export function SentimentAnalysisSection({ meetings }: { meetings: Meeting[] }) {
  const allMessages = meetings.flatMap(m => m.messages || [])

  // Sentiment overview data
  const sentimentCounts = useMemo(() => {
    let positive = 0
    let neutral = 0
    let negative = 0
    for (const msg of allMessages) {
      const sentiment = analyzeSentiment(msg.message)
      if (sentiment === 'positive') positive++
      else if (sentiment === 'negative') negative++
      else neutral++
    }
    return { positive, neutral, negative }
  }, [allMessages])

  const totalSentiment = sentimentCounts.positive + sentimentCounts.neutral + sentimentCounts.negative

  const donutData = [
    { name: 'Positive', value: sentimentCounts.positive, color: '#10b981' },
    { name: 'Neutral', value: sentimentCounts.neutral, color: '#f59e0b' },
    { name: 'Negative', value: sentimentCounts.negative, color: '#f43f5e' },
  ]

  const sentimentChartConfig = {
    Positive: { label: 'Positive', color: '#10b981' },
    Neutral: { label: 'Neutral', color: '#f59e0b' },
    Negative: { label: 'Negative', color: '#f43f5e' },
  }

  // Sentiment trend by round
  const sentimentTrend = useMemo(() => {
    const roundMap = new Map<number, { positive: number; neutral: number; negative: number; total: number }>()
    for (const msg of allMessages) {
      const round = msg.roundIndex
      if (!roundMap.has(round)) {
        roundMap.set(round, { positive: 0, neutral: 0, negative: 0, total: 0 })
      }
      const entry = roundMap.get(round)!
      entry.total++
      const sentiment = analyzeSentiment(msg.message)
      entry[sentiment]++
    }
    return Array.from(roundMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([round, counts]) => ({
        round: `R${round + 1}`,
        Positive: counts.total > 0 ? Math.round((counts.positive / counts.total) * 100) : 0,
        Neutral: counts.total > 0 ? Math.round((counts.neutral / counts.total) * 100) : 0,
        Negative: counts.total > 0 ? Math.round((counts.negative / counts.total) * 100) : 0,
      }))
  }, [allMessages])

  if (allMessages.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <Card className="vl-card backdrop-blur-sm transition-all duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Smile className="size-4 text-emerald-400" />
            <CardTitle className="text-xl font-semibold tracking-tight vl-heading-4" style={{ color: 'var(--vl-text-white)' }}>
              Sentiment Analysis
            </CardTitle>
          </div>
          <CardDescription className="text-sm vl-text-body">
            Analyze the emotional tone of meeting discussions across rounds
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sentiment Overview Donut */}
            <div className="space-y-3">
              <h3 className="text-base font-medium vl-text-body tracking-tight">Sentiment Overview</h3>
              <div className="vl-inner rounded-xl p-4">
                {totalSentiment > 0 ? (
                  <div className="flex flex-col items-center">
                    <div className="relative w-full max-w-[220px]">
                      <ChartContainer config={sentimentChartConfig} className="h-[200px] w-full">
                        <PieChart>
                          <Pie
                            data={donutData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={3}
                            dataKey="value"
                            strokeWidth={0}
                          >
                            {donutData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            contentStyle={{
                              background: 'var(--vl-bg-surface)',
                              border: '1px solid var(--vl-border)',
                              borderRadius: '8px',
                              color: 'var(--vl-text-white)',
                              fontSize: '12px',
                            }}
                            formatter={(value: number, name: string) => [`${value} messages`, name]}
                          />
                        </PieChart>
                      </ChartContainer>
                      {/* Center label */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                          <p className="text-2xl font-bold" style={{ color: 'var(--vl-text-white)' }}>{totalSentiment}</p>
                          <p className="text-[10px] vl-text-muted">messages</p>
                        </div>
                      </div>
                    </div>
                    {/* Legend */}
                    <div className="flex flex-wrap gap-4 mt-4 justify-center">
                      {donutData.map(d => (
                        <div key={d.name} className="flex items-center gap-1.5 text-xs vl-text-body">
                          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                          {d.name} ({d.value})
                        </div>
                      ))}
                    </div>
                    {/* Percentage bars */}
                    <div className="mt-4 space-y-2 w-full">
                      {donutData.map(d => {
                        const pct = totalSentiment > 0 ? Math.round((d.value / totalSentiment) * 100) : 0
                        return (
                          <div key={d.name} className="flex items-center gap-2">
                            <span className="text-[10px] w-14 text-right vl-text-muted">{d.name}</span>
                            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--vl-border)' }}>
                              <motion.div
                                className="h-full rounded-full"
                                style={{ backgroundColor: d.color }}
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                              />
                            </div>
                            <span className="text-[10px] w-8 vl-text-muted">{pct}%</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-sm vl-text-muted">
                    No messages to analyze
                  </div>
                )}
              </div>
            </div>

            {/* Sentiment Trend Area Chart */}
            <div className="space-y-3">
              <h3 className="text-base font-medium vl-text-body tracking-tight">Sentiment Trend by Round</h3>
              <div className="vl-inner rounded-xl p-4">
                {sentimentTrend.length > 0 ? (
                  <ChartContainer config={sentimentChartConfig} className="h-[250px] w-full">
                    <AreaChart data={sentimentTrend} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="[stroke:var(--vl-chart-grid)]" />
                      <XAxis dataKey="round" tick={{ fill: 'var(--vl-chart-axis)', fontSize: 11 }} axisLine={{ stroke: 'var(--vl-chart-axis-line)' }} />
                      <YAxis tick={{ fill: 'var(--vl-chart-axis)', fontSize: 11 }} axisLine={{ stroke: 'var(--vl-chart-axis-line)' }} unit="%" />
                      <RechartsTooltip
                        contentStyle={{
                          background: 'var(--vl-bg-surface)',
                          border: '1px solid var(--vl-border)',
                          borderRadius: '8px',
                          color: 'var(--vl-text-white)',
                          fontSize: '12px',
                        }}
                        formatter={(value: number) => [`${value}%`]}
                      />
                      <Area type="monotone" dataKey="Positive" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
                      <Area type="monotone" dataKey="Neutral" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.4} />
                      <Area type="monotone" dataKey="Negative" stackId="1" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.4} />
                    </AreaChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-sm vl-text-muted">
                    No rounds data available
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sentiment summary cards */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="vl-inner rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Smile className="size-4 text-emerald-400" />
                <span className="text-xs vl-text-muted">Positive</span>
              </div>
              <p className="text-2xl font-bold text-emerald-400">
                {totalSentiment > 0 ? Math.round((sentimentCounts.positive / totalSentiment) * 100) : 0}%
              </p>
              <p className="text-[10px] vl-text-muted mt-0.5">{sentimentCounts.positive} messages</p>
            </div>
            <div className="vl-inner rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Meh className="size-4 text-amber-400" />
                <span className="text-xs vl-text-muted">Neutral</span>
              </div>
              <p className="text-2xl font-bold text-amber-400">
                {totalSentiment > 0 ? Math.round((sentimentCounts.neutral / totalSentiment) * 100) : 0}%
              </p>
              <p className="text-[10px] vl-text-muted mt-0.5">{sentimentCounts.neutral} messages</p>
            </div>
            <div className="vl-inner rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Frown className="size-4 text-rose-400" />
                <span className="text-xs vl-text-muted">Negative</span>
              </div>
              <p className="text-2xl font-bold text-rose-400">
                {totalSentiment > 0 ? Math.round((sentimentCounts.negative / totalSentiment) * 100) : 0}%
              </p>
              <p className="text-[10px] vl-text-muted mt-0.5">{sentimentCounts.negative} messages</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ============================================================
// Word Cloud Section
// ============================================================

export function extractKeyTerms(meetings: Meeting[]): { word: string; count: number }[] {
  const allMessages = meetings.flatMap(m => m.messages || [])
  const wordFreq = new Map<string, number>()

  for (const msg of allMessages) {
    const words = msg.message.toLowerCase().split(/\W+/)
    for (const word of words) {
      if (word.length < 3 || STOP_WORDS.has(word)) continue
      // Skip pure numbers
      if (/^\d+$/.test(word)) continue
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1)
    }
  }

  return Array.from(wordFreq.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 60)
}

export function WordCloudSection({ meetings }: { meetings: Meeting[] }) {
  const terms = useMemo(() => extractKeyTerms(meetings), [meetings])

  if (terms.length === 0) return null

  const maxCount = terms[0]?.count || 1

  // Theme-aware colors for word cloud
  const wordColors = [
    'var(--vl-accent)',
    'var(--vl-text-white)',
    'var(--vl-text-secondary)',
    'var(--vl-text-muted)',
    '#10b981',
    '#06b6d4',
    '#f59e0b',
    '#8b5cf6',
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="vl-card backdrop-blur-sm transition-all duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Cloud className="size-4 text-emerald-400" />
            <CardTitle className="text-xl font-semibold tracking-tight vl-heading-4" style={{ color: 'var(--vl-text-white)' }}>
              Key Terms Cloud
            </CardTitle>
          </div>
          <CardDescription className="text-sm vl-text-body">
            Most frequently used terms across all meeting discussions
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="vl-inner rounded-xl p-6">
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 py-4">
              {terms.map((term, i) => {
                const ratio = term.count / maxCount
                const fontSize = Math.max(0.65, 0.65 + ratio * 1.6)
                const fontWeight = ratio > 0.6 ? 700 : ratio > 0.3 ? 600 : 400
                const opacity = Math.max(0.5, 0.5 + ratio * 0.5)
                // Top 5 words use accent color, rest use theme-aware cycling
                const color = i < 5 ? wordColors[0] : wordColors[i % wordColors.length]

                return (
                  <motion.span
                    key={term.word}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity, scale: 1 }}
                    transition={{ duration: 0.3, delay: i * 0.015 }}
                    className="cursor-default hover:scale-110 transition-transform duration-200 select-none"
                    style={{
                      fontSize: `${fontSize}rem`,
                      fontWeight,
                      color,
                      lineHeight: 1.3,
                    }}
                    title={`${term.word}: ${term.count} occurrences`}
                  >
                    {term.word}
                  </motion.span>
                )
              })}
            </div>
            {/* Top terms legend */}
            <div className="mt-4 pt-3 border-t" style={{ borderColor: 'var(--vl-border)' }}>
              <p className="text-xs vl-text-muted mb-2">Top 10 Terms</p>
              <div className="flex flex-wrap gap-2">
                {terms.slice(0, 10).map((term, i) => (
                  <div
                    key={term.word}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs"
                    style={{
                      background: i < 3 ? 'var(--vl-accent-bg)' : 'var(--vl-bg-surface)',
                      border: `1px solid ${i < 3 ? 'rgba(16,185,129,0.3)' : 'var(--vl-border)'}`,
                    }}
                  >
                    <span className={i < 3 ? 'text-emerald-400 font-semibold' : 'vl-text-body'}>
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
    </motion.div>
  )
}

// ============================================================
// Paper Reference Section
// ============================================================

export function PaperReferenceSection() {
  return (
    <Card className="vl-card backdrop-blur-sm transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="size-4 text-emerald-400" />
          <CardTitle className="text-base" style={{ color: 'var(--vl-text-white)' }}>Paper Reference</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="vl-inner rounded-xl p-4">
          <p className="text-sm vl-text-body leading-relaxed italic">
            &ldquo;The Virtual Lab of AI agents designs new SARS-CoV-2 nanobodies.&rdquo;
          </p>
          <p className="text-xs vl-text-muted mt-2">
            Swanson, K., Wu, W., Bulaong, N.L. et al.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="bg-emerald-600/70 text-white border-emerald-500/50 text-[10px]">
              Nature (2025)
            </Badge>
            <a
              href="https://doi.org/10.1038/s41586-025-08428-x"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] vl-text-muted hover:text-emerald-400 transition-colors flex items-center gap-1"
            >
              <ExternalLink className="size-2.5" /> DOI
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Team Preview Component (Enhanced)
// ============================================================

// ============================================================
// Step Indicator Component
// ============================================================

export const StepIndicator = React.memo(function StepIndicator({ steps, currentStep, completedSteps }: {
  steps: { label: string; icon: React.ElementType }[]
  currentStep: number
  completedSteps: Set<number>
}) {
  return (
    <div className="flex items-center gap-0 w-full">
      {steps.map((step, i) => {
        const isCompleted = completedSteps.has(i)
        const isCurrent = i === currentStep
        const Icon = step.icon
        return (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <motion.div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                  isCompleted
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                    : isCurrent
                    ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/50'
                    : 'bg-[var(--vl-bg-inner)] vl-text-muted border border-[var(--vl-border-subtle)]'
                }`}
                animate={isCurrent ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 2, repeat: isCurrent ? Infinity : 0, ease: 'easeInOut' }}
              >
                {isCompleted ? <CheckCircle2 className="size-4" /> : <Icon className="size-4" />}
              </motion.div>
              <span className={`text-[10px] font-medium ${isCurrent ? 'text-emerald-400' : isCompleted ? 'vl-text-body' : 'vl-text-muted'}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 h-px mx-2 mt-[-16px]">
                <motion.div
                  className="h-full"
                  style={{
                    background: isCompleted
                      ? 'linear-gradient(to right, #10b981, #10b981)'
                      : isCurrent
                      ? 'linear-gradient(to right, #10b981, #334155)'
                      : '#334155',
                  }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
})

export function TeamPreview({ lead, members, numRounds }: { lead: Agent | undefined; members: Agent[]; numRounds?: number }) {
  if (!lead && members.length === 0) return null
  return (
    <div className="vl-inner rounded-xl p-3">
      <p className="text-xs vl-text-muted mb-2 flex items-center gap-1">
        <Users className="size-3" /> Team Preview
      </p>
      <div className="flex flex-wrap gap-2 mb-2">
        {lead && (
          <div className="flex items-center gap-1.5 vl-inner rounded-lg px-2 py-1.5 border border-emerald-500/20">
            <Crown className="size-3 text-amber-400" />
            <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: lead.color }}>
              {renderAgentIcon(lead.icon, 'size-2.5 text-white')}
            </div>
            <span className="text-[10px] vl-text-body">{lead.title}</span>
          </div>
        )}
        {members.map(m => (
          <div key={m.id} className="flex items-center gap-1.5 vl-inner rounded-lg px-2 py-1.5 border border-[var(--vl-border-subtle)]">
            <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: m.color }}>
              {renderAgentIcon(m.icon, 'size-2.5 text-white')}
            </div>
            <span className="text-[10px] vl-text-body">{m.title}</span>
          </div>
        ))}
      </div>
      {numRounds && (
        <p className="text-[10px] vl-text-muted">{numRounds} round{numRounds > 1 ? 's' : ''} &middot; {members.length + (lead ? 1 : 0)} participants</p>
      )}
    </div>
  )
}

// ============================================================
// Empty State Component
// ============================================================

export const EmptyState = React.memo(function EmptyState({ icon: Icon, title, description, action, accentColor, variant = 'default', actionLabel, onAction, iconClassName, titleClassName }: {
  icon: React.ElementType
  title: string
  description: string
  action?: React.ReactNode
  accentColor?: string
  variant?: 'default' | 'compact' | 'illustrated'
  actionLabel?: string
  onAction?: () => void
  iconClassName?: string
  titleClassName?: string
}) {
  const color = accentColor || 'var(--vl-accent)'

  // Compact variant: smaller icon, less padding
  if (variant === 'compact') {
    return (
      <div className="text-center py-6 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          <div className="relative w-12 h-12 mx-auto mb-3">
            <div
              className="absolute inset-0 rounded-xl blur-lg opacity-25"
              style={{ background: `linear-gradient(135deg, ${color}, ${accentColor ? `${accentColor}66` : 'rgba(16,185,129,0.4)'})` }}
            />
            <div className={`relative float-gentle w-12 h-12 rounded-xl flex items-center justify-center ${iconClassName || ''}`} style={{ background: accentColor ? `${accentColor}15` : 'var(--vl-accent-bg)' }}>
              <Icon className="size-6" style={{ color }} />
            </div>
          </div>
        </motion.div>
        <p className={`vl-text-heading text-sm font-semibold mb-1 ${titleClassName || ''}`}>{title}</p>
        <p className="vl-text-muted text-xs mb-3 max-w-xs mx-auto">{description}</p>
        {action || (actionLabel && onAction && (
          <Button
            size="sm"
            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        ))}
      </div>
    )
  }

  // Illustrated variant: gradient background card with larger icon
  if (variant === 'illustrated') {
    return (
      <Card className="vl-card overflow-hidden">
        <CardContent className="py-12 text-center relative">
          {/* Gradient background */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{ background: `radial-gradient(ellipse at 50% 30%, ${color}40, transparent 70%)` }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div
                className="absolute inset-0 rounded-3xl blur-2xl opacity-40"
                style={{ background: `linear-gradient(135deg, ${color}, ${accentColor ? `${accentColor}88` : 'rgba(16,185,129,0.6)'})` }}
              />
              <div className={`relative float-gentle w-24 h-24 rounded-3xl flex items-center justify-center border border-white/10 ${iconClassName || ''}`} style={{ background: accentColor ? `${accentColor}20` : 'var(--vl-accent-bg)' }}>
                <Icon className="size-12" style={{ color }} />
              </div>
            </div>
          </motion.div>
          <p className={`vl-text-heading text-2xl font-bold mb-2 relative z-10 ${titleClassName || ''}`}>{title}</p>
          <p className="vl-text-muted text-sm mb-6 max-w-md mx-auto relative z-10 leading-relaxed">{description}</p>
          {action || (actionLabel && onAction && (
            <div className="relative z-10">
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={onAction}
              >
                {actionLabel}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  // Default variant: current style
  return (
    <Card className="vl-card">
      <CardContent className="py-16 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          {/* Gradient background circle behind the icon */}
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div
              className="absolute inset-0 rounded-2xl blur-xl opacity-30"
              style={{ background: `linear-gradient(135deg, ${color}, ${accentColor ? `${accentColor}66` : 'rgba(16,185,129,0.4)'})` }}
            />
            <div className={`relative float-gentle w-20 h-20 rounded-2xl flex items-center justify-center ${iconClassName || ''}`} style={{ background: accentColor ? `${accentColor}15` : 'var(--vl-accent-bg)' }}>
              <Icon className="size-10" style={{ color }} />
            </div>
          </div>
        </motion.div>
        <p className={`vl-text-heading text-xl font-semibold mb-2 ${titleClassName || ''}`}>{title}</p>
        <p className="vl-text-muted text-sm mb-6 max-w-sm mx-auto">{description}</p>
        {action || (actionLabel && onAction && (
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        ))}
      </CardContent>
    </Card>
  )
})

// ============================================================
// Scroll To Top Button
// ============================================================

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const progress = docHeight > 0 ? scrollTop / docHeight : 0
      setScrollProgress(progress)
      setVisible(scrollTop > 300)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // SVG arc for progress indicator
  const radius = 16
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - scrollProgress)

  return (
    <AnimatePresence>
      {visible && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.button
                initial={{ opacity: 0, y: 16, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.8 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                onClick={scrollToTop}
                className="vl-scroll-top fixed bottom-24 md:bottom-6 right-5 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-lg border cursor-pointer group"
                style={{ background: 'var(--vl-bg-card)', borderColor: 'var(--vl-border-accent)' }}
                aria-label="Scroll to top"
              >
                {/* Progress ring */}
                <svg className="absolute inset-0 w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18" cy="18" r={radius}
                    fill="none"
                    stroke="var(--vl-border-subtle)"
                    strokeWidth="2"
                    className="opacity-50"
                  />
                  <circle
                    cx="18" cy="18" r={radius}
                    fill="none"
                    stroke="var(--vl-accent, #10b981)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-[stroke-dashoffset] duration-150 ease-linear"
                  />
                </svg>
                <ArrowUp className="size-5 relative z-10 group-hover:translate-y-[-1px] transition-transform duration-150" style={{ color: 'var(--vl-accent)' }} />
              </motion.button>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs tooltip-glass">
              Scroll to top
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </AnimatePresence>
  )
}

// ============================================================
// Skeleton Loading Components
// ============================================================

export function DashboardSkeletonCards() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => (
        <Card key={i} className="vl-card overflow-hidden">
          <CardContent className="p-6 relative">
            {/* Shimmer overlay */}
            <div className="absolute inset-0 card-shimmer rounded-[var(--radius)] pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-12 h-12 rounded-xl skeleton-gradient" style={{ background: 'var(--vl-bg-inner)' }} />
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-16 rounded-md skeleton-gradient" style={{ background: 'var(--vl-bg-inner)', animationDelay: `${i * 0.15}s` }} />
                    <Skeleton className="h-3 w-24 rounded-md skeleton-gradient" style={{ background: 'var(--vl-bg-inner)', animationDelay: `${i * 0.15 + 0.05}s` }} />
                  </div>
                </div>
              </div>
              <Skeleton className="h-3 w-32 mt-4 rounded-md skeleton-gradient" style={{ background: 'var(--vl-bg-inner)', animationDelay: `${i * 0.15 + 0.1}s` }} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function DashboardSkeletonChart() {
  return (
    <Card className="vl-card overflow-hidden">
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-40 rounded-md skeleton-gradient" style={{ background: 'var(--vl-bg-inner)' }} />
      </CardHeader>
      <CardContent>
        <div className="relative rounded-lg overflow-hidden" style={{ background: 'var(--vl-bg-inner)', height: 200 }}>
          <div className="absolute inset-0 card-shimmer pointer-events-none" />
        </div>
      </CardContent>
    </Card>
  )
}

export function AgentsSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <Card key={i} className="vl-card overflow-hidden">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full skeleton-shimmer" style={{ background: 'var(--vl-bg-inner)', animationDelay: `${i * 0.1}s` }} />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32 rounded-md skeleton-shimmer" style={{ background: 'var(--vl-bg-inner)', animationDelay: `${i * 0.1 + 0.05}s` }} />
                <Skeleton className="h-3 w-20 rounded-md skeleton-shimmer" style={{ background: 'var(--vl-bg-inner)', animationDelay: `${i * 0.1 + 0.1}s` }} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-3 w-full rounded-md skeleton-shimmer" style={{ background: 'var(--vl-bg-inner)', animationDelay: `${i * 0.1 + 0.15}s` }} />
              <Skeleton className="h-3 w-3/4 rounded-md skeleton-shimmer" style={{ background: 'var(--vl-bg-inner)', animationDelay: `${i * 0.1 + 0.2}s` }} />
              <Skeleton className="h-3 w-5/6 rounded-md skeleton-shimmer" style={{ background: 'var(--vl-bg-inner)', animationDelay: `${i * 0.1 + 0.25}s` }} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function HistorySkeletonRows() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map(i => (
        <Card key={i} className="vl-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full skeleton-shimmer" style={{ background: 'var(--vl-bg-inner)', animationDelay: `${i * 0.1}s` }} />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-1/3 rounded-md skeleton-shimmer" style={{ background: 'var(--vl-bg-inner)', animationDelay: `${i * 0.1 + 0.05}s` }} />
                <Skeleton className="h-3 w-1/2 rounded-md skeleton-shimmer" style={{ background: 'var(--vl-bg-inner)', animationDelay: `${i * 0.1 + 0.1}s` }} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function PipelineSkeletonBoard() {
  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {[1, 2, 3].map(i => (
          <div key={i} className="w-72 flex-shrink-0">
            <Card className="vl-card rounded-xl overflow-hidden">
              <div className="p-3 flex items-center gap-2" style={{ background: 'var(--vl-bg-inner)' }}>
                <Skeleton className="w-3 h-3 rounded-full skeleton-shimmer" style={{ background: 'var(--vl-bg-inner)', animationDelay: `${i * 0.1}s` }} />
                <Skeleton className="h-4 w-24 rounded-md skeleton-shimmer" style={{ background: 'var(--vl-bg-inner)', animationDelay: `${i * 0.1 + 0.05}s` }} />
              </div>
              <div className="p-2 space-y-2">
                {[1, 2].map(j => (
                  <div key={j} className="vl-inner rounded-lg p-3">
                    <Skeleton className="h-3 w-full mb-2 rounded-md skeleton-shimmer" style={{ background: 'var(--vl-bg-inner)', animationDelay: `${i * 0.1 + j * 0.1}s` }} />
                    <Skeleton className="h-3 w-2/3 rounded-md skeleton-shimmer" style={{ background: 'var(--vl-bg-inner)', animationDelay: `${i * 0.1 + j * 0.1 + 0.05}s` }} />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// Onboarding Tour Component
// ============================================================

export function OnboardingTour({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0)
  const steps = [
    { title: 'Welcome to Virtual Lab! 👋', description: 'This is your AI-human collaboration dashboard for scientific research. Let us show you around.', target: 'hero' },
    { title: 'Create AI Agents', description: 'Define agents with specialized expertise, goals, and roles for your research team.', target: 'agents' },
    { title: 'Team Meetings', description: 'Start team meetings where multiple agents collaborate under a team lead.', target: 'team' },
    { title: 'Individual Meetings', description: 'Run focused one-on-one discussions between an agent and the Scientific Critic.', target: 'individual' },
    { title: 'Research History', description: 'View your research history, export discussions, and review summaries.', target: 'history' },
  ]

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1)
    } else {
      localStorage.setItem('virtual-lab-onboarded', 'true')
      onComplete()
    }
  }

  const handleSkip = () => {
    localStorage.setItem('virtual-lab-onboarded', 'true')
    onComplete()
  }

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Semi-transparent backdrop */}
      <div className="absolute inset-0 bg-black/40 pointer-events-auto" onClick={handleSkip} />

      {/* Tooltip callout */}
      <div
        className="absolute pointer-events-auto z-[101] w-80"
        style={{
          top: step === 0 ? '120px' : '80px',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="vl-dialog rounded-xl border border-emerald-500/30 shadow-2xl p-5"
        >
          <div className="flex items-start gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
              <Sparkles className="size-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--vl-text-white)' }}>{steps[step].title}</h3>
              <p className="text-xs vl-text-body mt-1 leading-relaxed">{steps[step].description}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {steps.map((_, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === step ? 'bg-emerald-400' : i < step ? 'bg-emerald-600' : 'bg-[var(--vl-border)]'}`} />
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="text-xs vl-text-muted hover:text-white h-7" onClick={handleSkip}>
                Skip
              </Button>
              <Button size="sm" className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white h-7" onClick={handleNext}>
                {step === steps.length - 1 ? 'Get Started' : 'Next'}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// ============================================================
// Enhanced Toast Notification System
// ============================================================

type EnhancedToastType = 'success' | 'error' | 'warning' | 'info'

interface EnhancedToastItem {
  id: string
  type: EnhancedToastType
  title: string
  description?: string
  duration: number
  createdAt: number
  exiting: boolean
}

const TOAST_ICONS: Record<EnhancedToastType, React.ElementType> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
}

const MAX_VISIBLE_TOASTS = 3

const toastListeners: Array<(toasts: EnhancedToastItem[]) => void> = []
let toastStore: EnhancedToastItem[] = []

function emitToasts() {
  toastListeners.forEach(listener => listener([...toastStore]))
}

function addToast(item: Omit<EnhancedToastItem, 'id' | 'createdAt' | 'exiting'>) {
  const newItem: EnhancedToastItem = {
    ...item,
    id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
    exiting: false,
  }
  // Enforce max visible toasts — dismiss older ones
  toastStore = [newItem, ...toastStore]
  if (toastStore.length > MAX_VISIBLE_TOASTS) {
    const dismissed = toastStore.slice(MAX_VISIBLE_TOASTS)
    toastStore = toastStore.slice(0, MAX_VISIBLE_TOASTS)
    dismissed.forEach(t => {
      emitToasts()
    })
  }
  emitToasts()
}

function dismissToast(id: string) {
  toastStore = toastStore.map(t => t.id === id ? { ...t, exiting: true } : t)
  emitToasts()
  // Remove after animation completes
  setTimeout(() => {
    toastStore = toastStore.filter(t => t.id !== id)
    emitToasts()
  }, 250)
}

// ============================================================
// useCardSpotlight — JS mouse tracking for card-spotlight CSS class
// ============================================================
export function useCardSpotlight() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      el.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`)
      el.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`)
    }
    const handleMouseLeave = () => {
      el.style.setProperty('--mouse-x', '50%')
      el.style.setProperty('--mouse-y', '50%')
    }
    el.addEventListener('mousemove', handleMouseMove)
    el.addEventListener('mouseleave', handleMouseLeave)
    return () => {
      el.removeEventListener('mousemove', handleMouseMove)
      el.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])
  return ref
}

export function useEnhancedToast() {
  const [toasts, setToasts] = useState<EnhancedToastItem[]>([])

  useEffect(() => {
    toastListeners.push(setToasts)
    return () => {
      const idx = toastListeners.indexOf(setToasts)
      if (idx > -1) toastListeners.splice(idx, 1)
    }
  }, [])

  const toastApi = useMemo(() => ({
    success: (title: string, description?: string, duration = 4000) => {
      addToast({ type: 'success', title, description, duration })
    },
    error: (title: string, description?: string, duration = 5000) => {
      addToast({ type: 'error', title, description, duration })
    },
    warning: (title: string, description?: string, duration = 4000) => {
      addToast({ type: 'warning', title, description, duration })
    },
    info: (title: string, description?: string, duration = 4000) => {
      addToast({ type: 'info', title, description, duration })
    },
    dismiss: dismissToast,
  }), [])

  return { toasts, ...toastApi }
}

function ToastProgress({ duration, type }: { duration: number; type: EnhancedToastType }) {
  const [width, setWidth] = useState('100%')
  const startTimeRef = useRef<number>(Date.now())
  const rafRef = useRef<number>(0)

  useEffect(() => {
    startTimeRef.current = Date.now()
    const tick = () => {
      const elapsed = Date.now() - startTimeRef.current
      const remaining = Math.max(0, 1 - elapsed / duration)
      setWidth(`${remaining * 100}%`)
      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [duration])

  return (
    <div className="vl-toast-progress">
      <div className="vl-toast-progress-bar" style={{ width, transitionDuration: `${duration}ms` }} />
    </div>
  )
}

function EnhancedToastItem({ item, onDismiss }: { item: EnhancedToastItem; onDismiss: (id: string) => void }) {
  const IconComp = TOAST_ICONS[item.type]

  useEffect(() => {
    if (item.exiting) return
    const timer = setTimeout(() => {
      onDismiss(item.id)
    }, item.duration)
    return () => clearTimeout(timer)
  }, [item.id, item.duration, item.exiting, onDismiss])

  return (
    <div
      className={`vl-toast vl-toast-${item.type} ${item.exiting ? 'vl-toast-exit' : 'vl-toast-enter'} ${!item.exiting ? 'notification-slide-in' : 'notification-slide-in-exit'}`}
      role="alert"
      aria-live="polite"
    >
      <div className="vl-toast-icon-wrap">
        <IconComp className="size-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium vl-text-heading leading-snug">{item.title}</p>
        {item.description && (
          <p className="text-xs vl-text-muted mt-0.5 leading-relaxed">{item.description}</p>
        )}
      </div>
      <button
        className="vl-toast-close"
        onClick={() => onDismiss(item.id)}
        aria-label="Dismiss notification"
      >
        <X className="size-3" />
      </button>
      <ToastProgress duration={item.duration} type={item.type} />
    </div>
  )
}

export function EnhancedToastContainer() {
  const { toasts, dismiss } = useEnhancedToast()

  return (
    <div className="vl-toast-container" aria-label="Notifications">
      {toasts.map(toast => (
        <EnhancedToastItem key={toast.id} item={toast} onDismiss={dismiss} />
      ))}
    </div>
  )
}

// ============================================================
// Main Page Component
// ============================================================

// Auto-save indicator component
export function AutoSaveIndicator({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 1500)
    return () => clearTimeout(timer)
  }, [onDone])

  return (
    <span className="text-[10px] text-emerald-400 flex items-center gap-1">
      <Loader2 className="size-2.5 animate-spin" /> Auto-saving...
    </span>
  )
}
