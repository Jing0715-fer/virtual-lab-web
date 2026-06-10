'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Activity, Users, Bot, MessageSquare, Calendar, BarChart3, Settings2,
  GripVertical, ChevronDown, ChevronUp, X, Plus, RotateCcw,
  Server, Wifi, HardDrive, Clock, Zap, CheckCircle2,
  LayoutGrid, Eye, EyeOff,
  PlayCircle, UserPlus, PlusCircle, GitBranch,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { Agent, Meeting } from './shared-types'

// ============================================================
// Types
// ============================================================
export interface WidgetConfig {
  id: string
  title: string
  titleKey: string
  icon: React.ElementType
  color: string
  defaultVisible: boolean
  defaultOrder: number
}

export const WIDGET_CONFIGS: WidgetConfig[] = [
  { id: 'recent-activity', title: 'Recent Activity', titleKey: 'dashboard.widgets.recentActivity', icon: Activity, color: '#10b981', defaultVisible: true, defaultOrder: 0 },
  { id: 'quick-stats', title: 'Quick Stats', titleKey: 'dashboard.widgets.quickStats', icon: BarChart3, color: '#06b6d4', defaultVisible: true, defaultOrder: 1 },
  { id: 'upcoming-meetings', title: 'Upcoming Meetings', titleKey: 'dashboard.widgets.upcomingMeetings', icon: Calendar, color: '#8b5cf6', defaultVisible: true, defaultOrder: 2 },
  { id: 'agent-performance', title: 'Agent Performance', titleKey: 'dashboard.widgets.agentPerformance', icon: Bot, color: '#f59e0b', defaultVisible: true, defaultOrder: 3 },
  { id: 'system-health', title: 'System Health', titleKey: 'dashboard.widgets.systemHealth', icon: Server, color: '#ef4444', defaultVisible: true, defaultOrder: 4 },
  { id: 'quick-actions', title: 'Quick Actions', titleKey: 'dashboard.widgets.quickActions', icon: Zap, color: '#ec4899', defaultVisible: true, defaultOrder: 5 },
]

const WIDGET_LAYOUT_KEY = 'vl-widget-layout'

interface WidgetLayout {
  order: string[]
  visible: string[]
  collapsed: string[]
}

function getDefaultLayout(): WidgetLayout {
  return {
    order: WIDGET_CONFIGS.map(w => w.id),
    visible: WIDGET_CONFIGS.filter(w => w.defaultVisible).map(w => w.id),
    collapsed: [],
  }
}

// ============================================================
// Sortable Widget Card
// ============================================================
function SortableWidgetCard({
  widgetId,
  config,
  isCollapsed,
  onToggleCollapse,
  children,
}: {
  widgetId: string
  config: WidgetConfig
  isCollapsed: boolean
  onToggleCollapse: () => void
  children: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widgetId })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.85 : 1,
  }

  const Icon = config.icon

  return (
    <div ref={setNodeRef} style={style} className="widget-card-wrapper">
      <Card className="vl-card backdrop-blur-xl border transition-all duration-300 widget-glass-effect overflow-hidden group">
        {/* Widget Header — draggable grip + title + actions */}
        <div
          className="flex items-center gap-2 px-4 py-3 cursor-grab active:cursor-grabbing select-none widget-header-gradient"
          style={{ background: `linear-gradient(135deg, ${config.color}10, ${config.color}05)` }}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4 vl-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
            style={{ background: `${config.color}20` }}
          >
            <Icon className="size-3.5" style={{ color: config.color }} />
          </div>
          <CardTitle className="text-sm font-semibold vl-text-heading flex-1 min-w-0 truncate">
            {config.title}
          </CardTitle>
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="w-6 h-6 rounded-md hover:bg-[var(--vl-bg-inner)] flex items-center justify-center transition-colors"
                    onClick={(e) => { e.stopPropagation(); /* reserved for future settings */ }}
                    aria-label="Widget settings"
                  >
                    <Settings2 className="size-3 vl-text-muted" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Settings (coming soon)</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <button
              className="w-6 h-6 rounded-md hover:bg-[var(--vl-bg-inner)] flex items-center justify-center transition-colors"
              onClick={(e) => { e.stopPropagation(); onToggleCollapse() }}
              aria-label={isCollapsed ? 'Expand widget' : 'Collapse widget'}
            >
              {isCollapsed ? (
                <ChevronDown className="size-3 vl-text-muted" />
              ) : (
                <ChevronUp className="size-3 vl-text-muted" />
              )}
            </button>
          </div>
        </div>
        {/* Widget Content */}
        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <CardContent className="px-4 pb-4 pt-0">
                {children}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  )
}

// ============================================================
// Widget: Recent Activity
// ============================================================
function RecentActivityWidget({ agents, meetings, lang }: { agents: Agent[]; meetings: Meeting[]; lang: Lang }) {
  const events = useMemo(() => {
    const items: { id: string; type: string; label: string; description: string; timestamp: string; color: string }[] = []
    meetings.forEach(m => {
      const name = m.saveName || m.agenda?.substring(0, 40) || 'Untitled'
      items.push({ id: `mc-${m.id}`, type: 'meeting_created', label: lang === 'zh' ? '会议已创建' : 'Meeting created', description: name, timestamp: m.createdAt, color: '#10b981' })
      if (m.status === 'completed') {
        items.push({ id: `mco-${m.id}`, type: 'meeting_completed', label: lang === 'zh' ? '会议已完成' : 'Meeting completed', description: name, timestamp: m.updatedAt, color: '#06b6d4' })
      }
      if (m.status === 'running') {
        items.push({ id: `mr-${m.id}`, type: 'meeting_running', label: lang === 'zh' ? '会议运行中' : 'Meeting running', description: name, timestamp: m.updatedAt, color: '#f59e0b' })
      }
    })
    agents.forEach(a => {
      items.push({ id: `aa-${a.id}`, type: 'agent_added', label: lang === 'zh' ? '智能体已添加' : 'Agent added', description: a.title, timestamp: a.createdAt, color: '#8b5cf6' })
    })
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    return items.slice(0, 5)
  }, [agents, meetings, lang])

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Activity className="size-8 vl-text-muted mb-2 vl-float-animation" />
        <p className="text-xs vl-text-muted">{t(lang, 'dashboard.activityFeed.noActivity')}</p>
      </div>
    )
  }

  const formatTime = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime()
    if (diff < 60000) return t(lang, 'common.justNow')
    if (diff < 3600000) return `${Math.floor(diff / 60000)} ${t(lang, 'common.minutesAgo')}`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ${t(lang, 'common.hoursAgo')}`
    return `${Math.floor(diff / 86400000)} ${t(lang, 'common.daysAgo')}`
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
      {events.map(event => (
        <div key={event.id} className="flex items-start gap-2.5 py-1.5 px-2 rounded-lg hover:bg-[var(--vl-bg-inner)] transition-colors">
          <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: event.color }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium vl-text-heading">{event.label}</span>
              <span className="text-[10px] vl-text-muted whitespace-nowrap">{formatTime(event.timestamp)}</span>
            </div>
            <p className="text-[11px] vl-text-body truncate">{event.description}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// Widget: Quick Stats
// ============================================================
function QuickStatsWidget({ agents, meetings, lang }: { agents: Agent[]; meetings: Meeting[]; lang: Lang }) {
  const stats = useMemo(() => {
    const totalAgents = agents.length
    const totalMeetings = meetings.length
    const totalMessages = meetings.reduce((sum, m) => sum + (m.messages?.length || 0), 0)
    return [
      { label: lang === 'zh' ? '智能体' : 'Agents', value: totalAgents, color: '#f59e0b', sparkData: [totalAgents] },
      { label: lang === 'zh' ? '会议' : 'Meetings', value: totalMeetings, color: '#10b981', sparkData: meetings.slice(-7).map(() => 1) },
      { label: lang === 'zh' ? '消息' : 'Messages', value: totalMessages, color: '#06b6d4', sparkData: [totalMessages] },
    ]
  }, [agents, meetings, lang])

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map(stat => (
        <div key={stat.label} className="vl-inner rounded-lg p-3 text-center">
          {/* Mini sparkline */}
          <svg className="w-full h-6 mb-1" viewBox="0 0 40 20" preserveAspectRatio="none">
            <polyline
              fill="none"
              stroke={stat.color}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={stat.sparkData.map((v, i) => `${(i / Math.max(stat.sparkData.length - 1, 1)) * 38 + 1},${20 - (v / Math.max(...stat.sparkData, 1)) * 16 - 2}`).join(' ')}
              opacity={0.6}
            />
          </svg>
          <div className="text-xl font-bold tracking-tight" style={{ color: stat.color }}>{stat.value}</div>
          <div className="text-[10px] vl-text-muted">{stat.label}</div>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// Widget: Upcoming Meetings
// ============================================================
function UpcomingMeetingsWidget({ meetings, lang }: { meetings: Meeting[]; lang: Lang }) {
  const upcoming = useMemo(() => {
    return meetings
      .filter(m => m.status === 'draft' || m.status === 'running')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
  }, [meetings])

  if (upcoming.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Calendar className="size-8 vl-text-muted mb-2 vl-float-animation" />
        <p className="text-xs vl-text-muted">{lang === 'zh' ? '没有待处理的会议' : 'No upcoming meetings'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
      {upcoming.map(meeting => (
        <div key={meeting.id} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-[var(--vl-bg-inner)] transition-colors">
          <div className={`w-2 h-2 rounded-full shrink-0 ${meeting.status === 'running' ? 'bg-amber-400 breathing-glow' : 'bg-slate-400'}`} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium vl-text-heading truncate">{meeting.saveName || meeting.agenda?.substring(0, 30) || 'Untitled'}</p>
            <p className="text-[10px] vl-text-muted">
              {meeting.type === 'team' ? (lang === 'zh' ? '团队会议' : 'Team Meeting') : (lang === 'zh' ? '个人会议' : 'Individual Meeting')}
            </p>
          </div>
          <Badge
            variant="outline"
            className={`text-[9px] ${
              meeting.status === 'running'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
            }`}
          >
            {meeting.status === 'running' ? t(lang, 'common.running') : t(lang, 'meeting.status.draft')}
          </Badge>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// Widget: Agent Performance
// ============================================================
function AgentPerformanceWidget({ agents, meetings, lang }: { agents: Agent[]; meetings: Meeting[]; lang: Lang }) {
  const topAgents = useMemo(() => {
    const completed = meetings.filter(m => m.status === 'completed')
    const agentMsgCounts: Record<string, number> = {}
    completed.forEach(m => {
      (m.messages || []).forEach(msg => {
        if (msg.agentName !== 'User') {
          agentMsgCounts[msg.agentName] = (agentMsgCounts[msg.agentName] || 0) + 1
        }
      })
    })
    return agents
      .map(a => ({ ...a, msgCount: agentMsgCounts[a.title] || 0 }))
      .sort((a, b) => b.msgCount - a.msgCount)
      .slice(0, 3)
  }, [agents, meetings])

  if (topAgents.length === 0 || topAgents.every(a => a.msgCount === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Bot className="size-8 vl-text-muted mb-2 vl-float-animation" />
        <p className="text-xs vl-text-muted">{lang === 'zh' ? '暂无智能体数据' : 'No agent data yet'}</p>
      </div>
    )
  }

  const maxMsg = Math.max(...topAgents.map(a => a.msgCount), 1)

  return (
    <div className="space-y-3">
      {topAgents.map((agent, i) => (
        <div key={agent.id} className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white" style={{ backgroundColor: agent.color }}>
            {i + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium vl-text-heading truncate">{agent.title}</span>
              <span className="text-[10px] vl-text-muted">{agent.msgCount} {t(lang, 'common.messages')}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--vl-bg-inner)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: agent.color }}
                initial={{ width: 0 }}
                animate={{ width: `${(agent.msgCount / maxMsg) * 100}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// Widget: System Health
// ============================================================
function SystemHealthWidget({ lang }: { lang: Lang }) {
  type HealthStatus = 'good' | 'warning' | 'critical'
  type LucideIcon = typeof Wifi
  const [healthData, setHealthData] = useState<{ label: string; value: string; status: HealthStatus; icon: LucideIcon }[]>([
    { label: lang === 'zh' ? 'API 响应' : 'API Response', value: '124ms', status: 'good', icon: Wifi },
    { label: lang === 'zh' ? '数据库大小' : 'DB Size', value: '2.4 MB', status: 'good', icon: HardDrive },
    { label: lang === 'zh' ? '活动连接' : 'Active Conns', value: '3', status: 'good', icon: Server },
    { label: lang === 'zh' ? '运行时间' : 'Uptime', value: '99.9%', status: 'good', icon: Clock },
  ])

  // Simulate minor fluctuations
  useEffect(() => {
    const interval = setInterval(() => {
      setHealthData(prev => prev.map(item => {
        if (item.label.includes('API') || item.label.includes('API 响应')) {
          const ms = Math.round(100 + Math.random() * 80)
          return { ...item, value: `${ms}ms`, status: (ms < 200 ? 'good' : ms < 400 ? 'warning' : 'critical') as HealthStatus }
        }
        if (item.label.includes('Active') || item.label.includes('活动')) {
          const conns = Math.round(1 + Math.random() * 8)
          return { ...item, value: `${conns}`, status: (conns < 10 ? 'good' : 'warning') as HealthStatus }
        }
        return item
      }))
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const statusColor = (s: 'good' | 'warning' | 'critical') => {
    switch (s) {
      case 'good': return '#10b981'
      case 'warning': return '#f59e0b'
      case 'critical': return '#ef4444'
    }
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {healthData.map(item => {
        const Icon = item.icon
        return (
          <div key={item.label} className="vl-inner rounded-lg p-2.5 flex items-center gap-2">
            <Icon className="size-3.5 shrink-0" style={{ color: statusColor(item.status) }} />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] vl-text-muted truncate">{item.label}</div>
              <div className="text-xs font-semibold vl-text-heading">{item.value}</div>
            </div>
            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: statusColor(item.status) }} />
          </div>
        )
      })}
    </div>
  )
}

// ============================================================
// Widget: Quick Actions
// ============================================================
function QuickActionsWidget({ lang, onAction }: { lang: Lang; onAction: (action: string) => void }) {
  const actions = [
    { id: 'create-meeting', label: t(lang, 'dashboard.teamMeeting'), icon: Users, color: '#10b981' },
    { id: 'add-agent', label: t(lang, 'dashboard.createAgent'), icon: PlusCircle, color: '#f59e0b' },
    { id: 'individual-meeting', label: t(lang, 'dashboard.individualMeeting'), icon: Bot, color: '#06b6d4' },
    { id: 'pipeline', label: lang === 'zh' ? '研究流程' : 'Pipeline', icon: GitBranch, color: '#8b5cf6' },
  ]

  return (
    <div className="grid grid-cols-2 gap-2">
      {actions.map(action => {
        const Icon = action.icon
        return (
          <button
            key={action.id}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg vl-inner hover:bg-[var(--vl-bg-card-hover)] transition-all duration-200 hover:shadow-[0_0_12px_rgba(16,185,129,0.08)] text-left group"
            onClick={() => onAction(action.id)}
          >
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
              style={{ background: `${action.color}20` }}
            >
              <Icon className="size-3.5" style={{ color: action.color }} />
            </div>
            <span className="text-[11px] font-medium vl-text-heading truncate group-hover:text-[var(--vl-accent)] transition-colors">{action.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ============================================================
// Widget Picker Dialog
// ============================================================
function WidgetPickerDialog({
  open,
  onOpenChange,
  widgetLayout,
  onToggleVisibility,
  onResetLayout,
  lang,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  widgetLayout: WidgetLayout
  onToggleVisibility: (id: string) => void
  onResetLayout: () => void
  lang: Lang
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="vl-dialog border max-w-md">
        <DialogHeader>
          <DialogTitle className="vl-text-heading text-lg font-semibold">
            {t(lang, 'dashboard.widgets.pickerTitle')}
          </DialogTitle>
          <DialogDescription className="vl-text-muted text-sm">
            {t(lang, 'dashboard.widgets.pickerDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          {WIDGET_CONFIGS.map(config => {
            const Icon = config.icon
            const isVisible = widgetLayout.visible.includes(config.id)
            return (
              <div key={config.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-[var(--vl-bg-inner)] transition-colors">
                <Checkbox
                  checked={isVisible}
                  onCheckedChange={() => onToggleVisibility(config.id)}
                  className="border-[var(--vl-border)]"
                />
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                  style={{ background: `${config.color}20` }}
                >
                  <Icon className="size-3" style={{ color: config.color }} />
                </div>
                <span className="text-sm vl-text-body flex-1">{config.title}</span>
                {isVisible ? (
                  <Eye className="size-3.5 text-emerald-400" />
                ) : (
                  <EyeOff className="size-3.5 vl-text-muted" />
                )}
              </div>
            )
          })}
        </div>
        <DialogFooter className="flex-row gap-2 justify-between sm:justify-between">
          <Button
            variant="outline"
            size="sm"
            className="border-[var(--vl-border)] vl-text-body hover:bg-[var(--vl-bg-inner)] text-xs"
            onClick={onResetLayout}
          >
            <RotateCcw className="size-3 mr-1.5" />
            {t(lang, 'dashboardCustomize.reset')}
          </Button>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
            onClick={() => onOpenChange(false)}
          >
            {t(lang, 'common.done')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Main WidgetContainer
// ============================================================
interface WidgetContainerProps {
  agents: Agent[]
  meetings: Meeting[]
  lang: Lang
  onQuickAction: (action: string) => void
}

export function WidgetContainer({ agents, meetings, lang, onQuickAction }: WidgetContainerProps) {
  // Hydration-safe layout state
  const [widgetLayout, setWidgetLayout] = useState<WidgetLayout>(getDefaultLayout)
  const [pickerOpen, setPickerOpen] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(WIDGET_LAYOUT_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<WidgetLayout>
        const defaults = getDefaultLayout()
        requestAnimationFrame(() => {
          setWidgetLayout({
            order: Array.isArray(parsed.order) ? parsed.order : defaults.order,
            visible: Array.isArray(parsed.visible) ? parsed.visible : defaults.visible,
            collapsed: Array.isArray(parsed.collapsed) ? parsed.collapsed : defaults.collapsed,
          })
        })
      }
    } catch { /* ignore */ }
  }, [])

  // Save to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(WIDGET_LAYOUT_KEY, JSON.stringify(widgetLayout))
    } catch { /* ignore */ }
  }, [widgetLayout])

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setWidgetLayout(prev => ({
        ...prev,
        order: arrayMove(prev.order, prev.order.indexOf(String(active.id)), prev.order.indexOf(String(over.id))),
      }))
    }
  }, [])

  const handleToggleCollapse = useCallback((id: string) => {
    setWidgetLayout(prev => ({
      ...prev,
      collapsed: prev.collapsed.includes(id)
        ? prev.collapsed.filter(c => c !== id)
        : [...prev.collapsed, id],
    }))
  }, [])

  const handleToggleVisibility = useCallback((id: string) => {
    setWidgetLayout(prev => ({
      ...prev,
      visible: prev.visible.includes(id)
        ? prev.visible.filter(v => v !== id)
        : [...prev.visible, id],
    }))
  }, [])

  const handleResetLayout = useCallback(() => {
    setWidgetLayout(getDefaultLayout())
    // toast notification - layout reset
    console.log(lang === 'zh' ? '小部件布局已重置' : 'Widget layout reset to default')
  }, [lang])

  // Get visible widgets in order
  const visibleWidgets = widgetLayout.order.filter(id => widgetLayout.visible.includes(id))
  const configMap = useMemo(() => new Map(WIDGET_CONFIGS.map(c => [c.id, c])), [])

  return (
    <div className="space-y-4">
      {/* Widget Controls Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutGrid className="size-4 text-emerald-400" />
          <h3 className="text-sm font-semibold vl-text-heading">
            {t(lang, 'dashboard.widgets.title')}
          </h3>
          <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
            {visibleWidgets.length}/{WIDGET_CONFIGS.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-[var(--vl-border)] vl-text-body hover:bg-[var(--vl-bg-inner)] text-xs h-7 gap-1.5"
            onClick={() => setPickerOpen(true)}
          >
            <Plus className="size-3" />
            {t(lang, 'dashboard.widgets.addWidget')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-[var(--vl-border)] vl-text-body hover:bg-[var(--vl-bg-inner)] text-xs h-7 gap-1.5"
            onClick={handleResetLayout}
          >
            <RotateCcw className="size-3" />
            {t(lang, 'dashboardCustomize.reset')}
          </Button>
        </div>
      </div>

      {/* Widget Grid — 2 cols mobile, 3 cols desktop */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={visibleWidgets} strategy={verticalListSortingStrategy}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleWidgets.map(widgetId => {
              const config = configMap.get(widgetId)
              if (!config) return null
              const isCollapsed = widgetLayout.collapsed.includes(widgetId)

              return (
                <SortableWidgetCard
                  key={widgetId}
                  widgetId={widgetId}
                  config={config}
                  isCollapsed={isCollapsed}
                  onToggleCollapse={() => handleToggleCollapse(widgetId)}
                >
                  {widgetId === 'recent-activity' && <RecentActivityWidget agents={agents} meetings={meetings} lang={lang} />}
                  {widgetId === 'quick-stats' && <QuickStatsWidget agents={agents} meetings={meetings} lang={lang} />}
                  {widgetId === 'upcoming-meetings' && <UpcomingMeetingsWidget meetings={meetings} lang={lang} />}
                  {widgetId === 'agent-performance' && <AgentPerformanceWidget agents={agents} meetings={meetings} lang={lang} />}
                  {widgetId === 'system-health' && <SystemHealthWidget lang={lang} />}
                  {widgetId === 'quick-actions' && <QuickActionsWidget lang={lang} onAction={onQuickAction} />}
                </SortableWidgetCard>
              )
            })}
          </div>
        </SortableContext>
      </DndContext>

      {/* Widget Picker Dialog */}
      <WidgetPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        widgetLayout={widgetLayout}
        onToggleVisibility={handleToggleVisibility}
        onResetLayout={handleResetLayout}
        lang={lang}
      />
    </div>
  )
}
