'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { toast } from 'sonner'
import {
  Settings2, GripVertical, RotateCcw, Save, Maximize2, Minimize2,
  LayoutGrid, BarChart3, TrendingUp, Workflow, History, Dna, Activity,
  Brain, Zap, Lightbulb, ChevronUp, ChevronDown, Eye, EyeOff,
  Sparkles, Network, Clock, MessageSquare, Bot, Users, Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { Agent, Meeting, AnalyticsData } from './shared-components'
import { WidgetActivityFeed } from './widget-activity-feed'
import { WidgetMiniCalendar } from './widget-mini-calendar'
import { WidgetAgentStatusGrid } from './widget-agent-status-grid'
import { WidgetStatsTrend } from './widget-stats-trend'

// ============================================================
// Types & Constants
// ============================================================

export type WidgetSize = 'sm' | 'md' | 'lg'

interface WidgetDefinition {
  id: string
  titleKey: string
  icon: React.ElementType
  color: string
  defaultSize: WidgetSize
  defaultVisible: boolean
  defaultOrder: number
  /** Grid column span for each size */
  sizeSpans: { sm: number; md: number; lg: number }
}

interface WidgetLayoutEntry {
  id: string
  visible: boolean
  size: WidgetSize
  order: number
}

interface WidgetLayout {
  widgets: WidgetLayoutEntry[]
}

const WIDGET_STORAGE_KEY = 'vl-dashboard-widget-layout'

// ============================================================
// Widget Registry — defines all available dashboard widgets
// ============================================================
const WIDGET_DEFINITIONS: WidgetDefinition[] = [
  {
    id: 'stats-cards',
    titleKey: 'dashboardCustomize.statCards',
    icon: BarChart3,
    color: '#f59e0b',
    defaultSize: 'lg',
    defaultVisible: true,
    defaultOrder: 0,
    sizeSpans: { sm: 1, md: 2, lg: 3 },
  },
  {
    id: 'research-analytics',
    titleKey: 'dashboardCustomize.researchAnalytics',
    icon: TrendingUp,
    color: '#10b981',
    defaultSize: 'lg',
    defaultVisible: true,
    defaultOrder: 1,
    sizeSpans: { sm: 1, md: 2, lg: 3 },
  },
  {
    id: 'recent-meetings',
    titleKey: 'dashboard.recentMeetings',
    icon: Calendar,
    color: '#06b6d4',
    defaultSize: 'md',
    defaultVisible: true,
    defaultOrder: 2,
    sizeSpans: { sm: 1, md: 1, lg: 2 },
  },
  {
    id: 'quick-actions',
    titleKey: 'dashboard.quickActions',
    icon: Zap,
    color: '#ec4899',
    defaultSize: 'sm',
    defaultVisible: true,
    defaultOrder: 3,
    sizeSpans: { sm: 1, md: 1, lg: 1 },
  },
  {
    id: 'how-it-works',
    titleKey: 'dashboard.howItWorks',
    icon: Lightbulb,
    color: '#8b5cf6',
    defaultSize: 'lg',
    defaultVisible: true,
    defaultOrder: 4,
    sizeSpans: { sm: 1, md: 2, lg: 3 },
  },
  {
    id: 'agent-network',
    titleKey: 'dashboardCustomize.agentNetwork',
    icon: Network,
    color: '#f97316',
    defaultSize: 'lg',
    defaultVisible: true,
    defaultOrder: 5,
    sizeSpans: { sm: 1, md: 2, lg: 3 },
  },
  {
    id: 'activity-timeline',
    titleKey: 'dashboardCustomize.activityTimeline',
    icon: Activity,
    color: '#14b8a6',
    defaultSize: 'md',
    defaultVisible: true,
    defaultOrder: 6,
    sizeSpans: { sm: 1, md: 1, lg: 2 },
  },
  {
    id: 'sentiment',
    titleKey: 'dashboardCustomize.sentiment',
    icon: Brain,
    color: '#a855f7',
    defaultSize: 'md',
    defaultVisible: true,
    defaultOrder: 7,
    sizeSpans: { sm: 1, md: 2, lg: 2 },
  },
  {
    id: 'nanobody-progress',
    titleKey: 'dashboardCustomize.nanobodyProgress',
    icon: Dna,
    color: '#22d3ee',
    defaultSize: 'md',
    defaultVisible: true,
    defaultOrder: 8,
    sizeSpans: { sm: 1, md: 2, lg: 2 },
  },
  {
    id: 'discussion-timeline',
    titleKey: 'dashboardCustomize.discussionTimeline',
    icon: History,
    color: '#f43f5e',
    defaultSize: 'md',
    defaultVisible: true,
    defaultOrder: 9,
    sizeSpans: { sm: 1, md: 2, lg: 2 },
  },
  {
    id: 'research-insights',
    titleKey: 'dashboardCustomize.researchInsights',
    icon: Brain,
    color: '#6366f1',
    defaultSize: 'md',
    defaultVisible: true,
    defaultOrder: 10,
    sizeSpans: { sm: 1, md: 2, lg: 2 },
  },
  {
    id: 'widget-activity-feed',
    titleKey: 'dashboard.activityFeed.title',
    icon: Activity,
    color: '#10b981',
    defaultSize: 'md',
    defaultVisible: true,
    defaultOrder: 11,
    sizeSpans: { sm: 1, md: 1, lg: 2 },
  },
  {
    id: 'widget-mini-calendar',
    titleKey: 'dashboard.widgetCalendar',
    icon: Calendar,
    color: '#f59e0b',
    defaultSize: 'sm',
    defaultVisible: true,
    defaultOrder: 12,
    sizeSpans: { sm: 1, md: 1, lg: 1 },
  },
  {
    id: 'widget-agent-status-grid',
    titleKey: 'dashboard.agentGauges.title',
    icon: Users,
    color: '#06b6d4',
    defaultSize: 'md',
    defaultVisible: true,
    defaultOrder: 13,
    sizeSpans: { sm: 1, md: 1, lg: 2 },
  },
  {
    id: 'widget-stats-trend',
    titleKey: 'dashboard.trendSparklines.title',
    icon: TrendingUp,
    color: '#8b5cf6',
    defaultSize: 'md',
    defaultVisible: true,
    defaultOrder: 14,
    sizeSpans: { sm: 1, md: 1, lg: 2 },
  },
]

const DEF_MAP = new Map(WIDGET_DEFINITIONS.map(d => [d.id, d]))

function getDefaultLayout(): WidgetLayout {
  return {
    widgets: WIDGET_DEFINITIONS.map(d => ({
      id: d.id,
      visible: d.defaultVisible,
      size: d.defaultSize,
      order: d.defaultOrder,
    })),
  }
}

// ============================================================
// Size label map
// ============================================================
const SIZE_LABELS: Record<WidgetSize, string> = {
  sm: 'S',
  md: 'M',
  lg: 'L',
}

// ============================================================
// Animated Widget Card Wrapper
// ============================================================
function WidgetCard({
  widgetId,
  definition,
  isConfiguring,
  onToggleVisibility,
  isCollapsed,
  onToggleCollapse,
  children,
  lang,
  currentSize,
}: {
  widgetId: string
  definition: WidgetDefinition
  isConfiguring: boolean
  onToggleVisibility: () => void
  isCollapsed: boolean
  onToggleCollapse: () => void
  children: React.ReactNode
  lang: Lang
  currentSize: WidgetSize
}) {
  const Icon = definition.icon
  const colSpan = gridColSpanClass(isCollapsed ? 'sm' : currentSize, definition)
  const displayColSpan = isConfiguring ? 'widget-size-sm' : colSpan

  return (
    <motion.div
      layout
      layoutId={`widget-${widgetId}`}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      className={`widget-card ${displayColSpan} ${isConfiguring ? 'widget-configuring' : ''}`}
    >
      <div className="vl-card backdrop-blur-sm overflow-hidden group h-full flex flex-col">
        {/* Widget Header */}
        <div
          className="flex items-center gap-2 px-4 py-3 select-none border-b border-[var(--vl-border-subtle)]"
          style={{ background: `linear-gradient(135deg, ${definition.color}08, transparent)` }}
        >
          {/* Drag Handle — shown during configuration */}
          <AnimatePresence>
            {isConfiguring && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="widget-drag-handle shrink-0"
                aria-label="Drag to reorder"
              >
                <GripVertical className="size-4 vl-text-muted cursor-grab active:cursor-grabbing" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Icon + Title */}
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
            style={{ background: `${definition.color}15` }}
          >
            <Icon className="size-3.5" style={{ color: definition.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold vl-text-heading truncate">
              {t(lang, definition.titleKey)}
            </h3>
          </div>

          {/* Size Badge (during config) */}
          <AnimatePresence>
            {isConfiguring && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Badge
                  variant="outline"
                  className="text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border-emerald-500/30 px-1.5 py-0 h-5"
                >
                  {currentSize === 'sm' && <Minimize2 className="size-2.5 mr-0.5" />}
                  {currentSize === 'lg' && <Maximize2 className="size-2.5 mr-0.5" />}
                  {SIZE_LABELS[currentSize]}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="flex items-center gap-0.5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="w-7 h-7 rounded-md hover:bg-[var(--vl-bg-inner)] flex items-center justify-center transition-colors"
                    onClick={(e) => { e.stopPropagation(); onToggleVisibility() }}
                    aria-label="Hide widget"
                  >
                    <EyeOff className="size-3.5 vl-text-muted" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {t(lang, 'dashboardCustomize.sectionHidden')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="w-7 h-7 rounded-md hover:bg-[var(--vl-bg-inner)] flex items-center justify-center transition-colors"
                    onClick={(e) => { e.stopPropagation(); onToggleCollapse() }}
                    aria-label={isCollapsed ? 'Expand' : 'Collapse'}
                  >
                    {isCollapsed
                      ? <ChevronDown className="size-3.5 vl-text-muted" />
                      : <ChevronUp className="size-3.5 vl-text-muted" />
                    }
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {isCollapsed ? 'Expand' : 'Collapse'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Widget Content */}
        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="p-4 pt-3 flex-1">
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ============================================================
// Grid column span class resolver
// ============================================================
function gridColSpanClass(size: WidgetSize, def?: WidgetDefinition): string {
  const spans = def?.sizeSpans ?? { sm: 1, md: 1, lg: 1 }
  const span = spans[size] ?? 1
  switch (span) {
    case 1: return 'widget-size-sm'
    case 2: return 'widget-size-md'
    case 3: return 'widget-size-lg'
    default: return 'widget-size-sm'
  }
}

// ============================================================
// Widget Configuration Panel (Sheet)
// ============================================================
interface WidgetConfigPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  layout: WidgetLayout
  onToggleVisibility: (id: string) => void
  onSetSize: (id: string, size: WidgetSize) => void
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  onReset: () => void
  onSave: () => void
  lang: Lang
}

function WidgetConfigPanel({
  open, onOpenChange, layout, onToggleVisibility, onSetSize,
  onMoveUp, onMoveDown, onReset, onSave, lang,
}: WidgetConfigPanelProps) {
  const sortedWidgets = useMemo(
    () => [...layout.widgets].sort((a, b) => a.order - b.order),
    [layout.widgets]
  )

  const visibleCount = layout.widgets.filter(w => w.visible).length

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="vl-dialog w-[340px] sm:w-[400px] overflow-y-auto custom-scrollbar p-0"
      >
        <SheetHeader className="p-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Settings2 className="size-4.5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <SheetTitle className="vl-text-heading text-base font-semibold">
                {t(lang, 'dashboardCustomize.title')}
              </SheetTitle>
              <SheetDescription className="vl-text-muted text-xs mt-0.5">
                {lang === 'zh' ? '管理仪表盘小部件的显示、大小和顺序' : 'Manage widget visibility, size, and order'}
              </SheetDescription>
            </div>
            <Badge
              variant="outline"
              className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shrink-0"
            >
              {visibleCount}/{WIDGET_DEFINITIONS.length}
            </Badge>
          </div>
        </SheetHeader>

        <Separator className="bg-[var(--vl-border-subtle)]" />

        {/* Widget List */}
        <div className="p-4 space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
          {sortedWidgets.map((widget, idx) => {
            const def = DEF_MAP.get(widget.id)
            if (!def) return null
            const Icon = def.icon

            return (
              <motion.div
                key={widget.id}
                layout
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03, duration: 0.2 }}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 ${
                  widget.visible
                    ? 'border-[var(--vl-border)] bg-[var(--vl-bg-card)]'
                    : 'border-[var(--vl-border-subtle)] bg-[var(--vl-bg-secondary)] opacity-50'
                }`}
              >
                {/* Reorder Controls */}
                <div className="flex flex-col items-center gap-0.5 pt-0.5 shrink-0">
                  <button
                    className="p-0.5 rounded hover:bg-[var(--vl-bg-inner)] transition-colors"
                    onClick={() => onMoveUp(widget.id)}
                    disabled={idx === 0}
                    aria-label="Move up"
                  >
                    <ChevronUp className={`size-3.5 transition-colors ${idx === 0 ? 'vl-text-muted/20' : 'vl-text-muted hover:text-emerald-400'}`} />
                  </button>
                  <div className="widget-drag-handle px-0.5 cursor-grab active:cursor-grabbing" aria-label="Drag to reorder">
                    <GripVertical className="size-3.5 vl-text-muted" />
                  </div>
                  <button
                    className="p-0.5 rounded hover:bg-[var(--vl-bg-inner)] transition-colors"
                    onClick={() => onMoveDown(widget.id)}
                    disabled={idx === sortedWidgets.length - 1}
                    aria-label="Move down"
                  >
                    <ChevronDown className={`size-3.5 transition-colors ${idx === sortedWidgets.length - 1 ? 'vl-text-muted/20' : 'vl-text-muted hover:text-emerald-400'}`} />
                  </button>
                </div>

                {/* Icon + Info */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: `${def.color}15` }}
                >
                  <Icon className="size-4" style={{ color: def.color }} />
                </div>

                {/* Name + Size */}
                <div className="flex-1 min-w-0 py-0.5">
                  <p className={`text-sm font-medium truncate ${widget.visible ? 'vl-text-heading' : 'vl-text-muted'}`}>
                    {t(lang, def.titleKey)}
                  </p>
                  {/* Size Selector */}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {(['sm', 'md', 'lg'] as WidgetSize[]).map(size => {
                      const isActive = widget.size === size
                      return (
                        <button
                          key={size}
                          className={`w-8 h-6 rounded text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${
                            isActive
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                              : 'bg-[var(--vl-bg-inner)] vl-text-muted border border-transparent hover:border-[var(--vl-border)] hover:vl-text-heading'
                          }`}
                          onClick={() => onSetSize(widget.id, size)}
                          aria-label={`Size ${size}`}
                        >
                          {size}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Visibility Toggle */}
                <div className="pt-1 shrink-0">
                  <Switch
                    checked={widget.visible}
                    onCheckedChange={() => onToggleVisibility(widget.id)}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>
              </motion.div>
            )
          })}
        </div>

        <Separator className="bg-[var(--vl-border-subtle)]" />

        {/* Actions */}
        <div className="p-4 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-[var(--vl-border)] vl-text-body hover:bg-[var(--vl-bg-inner)] text-xs gap-1.5 h-9"
            onClick={onReset}
          >
            <RotateCcw className="size-3" />
            {t(lang, 'dashboardCustomize.reset')}
          </Button>
          <Button
            size="sm"
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 h-9 shadow-sm shadow-emerald-500/20"
            onClick={() => { onSave(); onOpenChange(false) }}
          >
            <Save className="size-3" />
            {t(lang, 'common.save')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ============================================================
// Widget Content: Stats Cards
// ============================================================
function StatsCardsWidget({
  totalAgents, activeMeetings, completedMeetings, totalMessages, lang,
}: {
  totalAgents: number; activeMeetings: number; completedMeetings: number; totalMessages: number; lang: Lang
}) {
  const stats = [
    { icon: Bot, label: t(lang, 'dashboard.stat.totalAgents'), value: totalAgents, color: '#f59e0b', bg: 'bg-amber-500/20' },
    { icon: MessageSquare, label: t(lang, 'dashboard.activeMeetings'), value: activeMeetings, color: '#10b981', bg: 'bg-emerald-500/20' },
    { icon: Users, label: t(lang, 'common.completed'), value: completedMeetings, color: '#06b6d4', bg: 'bg-cyan-500/20' },
    { icon: BarChart3, label: t(lang, 'dashboard.totalMessages'), value: totalMessages, color: '#8b5cf6', bg: 'bg-violet-500/20' },
  ]

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map(stat => {
        const Icon = stat.icon
        return (
          <div key={stat.label} className="vl-inner rounded-lg p-3 hover:border-emerald-500/20 transition-colors cursor-default">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-6 h-6 rounded-md ${stat.bg} flex items-center justify-center`}>
                <Icon className="size-3" style={{ color: stat.color }} />
              </div>
              <span className="text-[11px] vl-text-muted truncate">{stat.label}</span>
            </div>
            <div className="text-2xl font-bold vl-text-heading stat-number-animate">{stat.value}</div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================
// Widget Content: Recent Meetings
// ============================================================
function RecentMeetingsWidget({ meetings, lang }: { meetings: Meeting[]; lang: Lang }) {
  const recent = meetings.slice(0, 6)

  if (recent.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Calendar className="size-10 vl-text-muted mb-3 vl-float-animation" />
        <p className="text-sm vl-text-muted">{t(lang, 'dashboard.empty.noMeetings.title')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
      {recent.map(m => (
        <div key={m.id} className="flex items-center gap-3 py-2.5 px-2.5 rounded-lg hover:bg-[var(--vl-bg-inner)] transition-colors cursor-default">
          <div className={`w-2 h-2 rounded-full shrink-0 ${
            m.status === 'running' ? 'bg-amber-400 breathing-glow' :
            m.status === 'completed' ? 'bg-emerald-400' : 'bg-slate-400'
          }`} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium vl-text-heading truncate">
              {m.saveName || m.agenda?.substring(0, 35) || 'Untitled'}
            </p>
            <p className="text-[10px] vl-text-muted mt-0.5">
              {m.type === 'team' ? t(lang, 'meeting.type.team') : t(lang, 'meeting.type.individual')}
              {m.messages?.length ? ` · ${m.messages.length} ${t(lang, 'common.messages')}` : ''}
            </p>
          </div>
          <Badge
            variant="outline"
            className={`text-[9px] shrink-0 ${
              m.status === 'running'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : m.status === 'completed'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
            }`}
          >
            {m.status === 'running' ? t(lang, 'common.running') : m.status === 'completed' ? t(lang, 'common.completed') : t(lang, 'meeting.status.draft')}
          </Badge>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// Widget Content: Quick Actions
// ============================================================
function QuickActionsWidget({ lang }: { lang: Lang }) {
  const actions = [
    { label: t(lang, 'dashboard.createAgent'), color: '#f59e0b', icon: Bot },
    { label: t(lang, 'dashboard.teamMeeting'), color: '#10b981', icon: Users },
    { label: t(lang, 'dashboard.individualMeeting'), color: '#06b6d4', icon: MessageSquare },
    { label: t(lang, 'dashboard.viewAnalytics'), color: '#8b5cf6', icon: BarChart3 },
  ]

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {actions.map(action => {
        const Icon = action.icon
        return (
          <button
            key={action.label}
            className="flex flex-col items-center gap-2 px-3 py-4 rounded-xl vl-inner hover:bg-[var(--vl-bg-card-hover)] transition-all duration-200 text-center group"
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
              style={{ background: `${action.color}15` }}
            >
              <Icon className="size-4" style={{ color: action.color }} />
            </div>
            <span className="text-[11px] font-medium vl-text-heading group-hover:text-emerald-400 transition-colors">
              {action.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ============================================================
// Widget Content: Placeholder for advanced widgets
// ============================================================
function PlaceholderWidget({ titleKey, lang, color, description }: {
  titleKey: string; lang: Lang; color: string; description?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 vl-inner rounded-xl">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 vl-float-animation"
        style={{ background: `${color}12` }}
      >
        <LayoutGrid className="size-5" style={{ color }} />
      </div>
      <p className="text-sm font-medium vl-text-heading">{t(lang, titleKey)}</p>
      <p className="text-xs vl-text-muted mt-1 text-center max-w-[200px]">
        {description || (lang === 'zh' ? '完整内容请查看主仪表盘' : 'Full content available in main dashboard view')}
      </p>
    </div>
  )
}

// ============================================================
// Main DashboardWidgetSystem Component
// ============================================================
export interface DashboardWidgetSystemProps {
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
  setActiveTab: (tab: any) => void
  setEditingAgent: (agent: any) => void
  setAgentDialogOpen: (open: boolean) => void
}

export function DashboardWidgetSystem(props: DashboardWidgetSystemProps) {
  const { agents, meetings, lang } = props

  // ============================================================
  // Layout State (Hydration-safe)
  // ============================================================
  const [layout, setLayout] = useState<WidgetLayout>(getDefaultLayout)
  const [configOpen, setConfigOpen] = useState(false)
  const [collapsedWidgets, setCollapsedWidgets] = useState<Set<string>>(new Set())
  const [isConfiguring, setIsConfiguring] = useState(false)
  const isInitialized = useRef(false)

  // Load layout from localStorage on mount
  useEffect(() => {
    if (isInitialized.current) return
    isInitialized.current = true
    try {
      const stored = localStorage.getItem(WIDGET_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<WidgetLayout>
        if (Array.isArray(parsed.widgets) && parsed.widgets.length > 0) {
          const defaultLayout = getDefaultLayout()
          const storedIds = new Set(parsed.widgets.map(w => w.id))
          const merged = [...parsed.widgets]
          defaultLayout.widgets.forEach(dw => {
            if (!storedIds.has(dw.id)) merged.push(dw)
          })
          requestAnimationFrame(() => setLayout({ widgets: merged }))
        }
      }
    } catch { /* ignore */ }
  }, [])

  // Save layout to localStorage on change
  useEffect(() => {
    if (!isInitialized.current) return
    try {
      localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(layout))
    } catch { /* ignore */ }
  }, [layout])

  // ============================================================
  // Computed
  // ============================================================
  const visibleOrderedWidgets = useMemo(() => {
    return layout.widgets
      .filter(w => w.visible)
      .sort((a, b) => a.order - b.order)
  }, [layout.widgets])

  const visibleCount = layout.widgets.filter(w => w.visible).length

  // ============================================================
  // Layout Handlers
  // ============================================================
  const handleToggleVisibility = useCallback((id: string) => {
    setLayout(prev => ({
      ...prev,
      widgets: prev.widgets.map(w =>
        w.id === id ? { ...w, visible: !w.visible } : w
      ),
    }))
  }, [])

  const handleSetSize = useCallback((id: string, size: WidgetSize) => {
    setLayout(prev => ({
      ...prev,
      widgets: prev.widgets.map(w =>
        w.id === id ? { ...w, size } : w
      ),
    }))
  }, [])

  const handleMoveUp = useCallback((id: string) => {
    setLayout(prev => {
      const sorted = [...prev.widgets].sort((a, b) => a.order - b.order)
      const idx = sorted.findIndex(w => w.id === id)
      if (idx <= 0) return prev
      const swapWith = sorted[idx - 1]
      return {
        ...prev,
        widgets: prev.widgets.map(w => {
          if (w.id === id) return { ...w, order: swapWith.order }
          if (w.id === swapWith.id) return { ...w, order: sorted[idx].order }
          return w
        }),
      }
    })
  }, [])

  const handleMoveDown = useCallback((id: string) => {
    setLayout(prev => {
      const sorted = [...prev.widgets].sort((a, b) => a.order - b.order)
      const idx = sorted.findIndex(w => w.id === id)
      if (idx < 0 || idx >= sorted.length - 1) return prev
      const swapWith = sorted[idx + 1]
      return {
        ...prev,
        widgets: prev.widgets.map(w => {
          if (w.id === id) return { ...w, order: swapWith.order }
          if (w.id === swapWith.id) return { ...w, order: sorted[idx].order }
          return w
        }),
      }
    })
  }, [])

  const handleResetLayout = useCallback(() => {
    setLayout(getDefaultLayout())
    setCollapsedWidgets(new Set())
    toast.success(lang === 'zh' ? '布局已恢复默认' : 'Layout reset to default')
  }, [lang])

  const handleSaveLayout = useCallback(() => {
    try {
      localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(layout))
      toast.success(lang === 'zh' ? '布局已保存' : 'Layout saved successfully')
    } catch {
      toast.error(lang === 'zh' ? '保存失败' : 'Failed to save layout')
    }
  }, [layout, lang])

  const toggleConfiguring = useCallback(() => {
    const next = !isConfiguring
    setIsConfiguring(next)
    setConfigOpen(next)
  }, [isConfiguring])

  const toggleCollapse = useCallback((id: string) => {
    setCollapsedWidgets(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // ============================================================
  // Render Widget Content
  // ============================================================
  const renderWidgetContent = useCallback((widgetId: string) => {
    switch (widgetId) {
      case 'stats-cards':
        return (
          <StatsCardsWidget
            totalAgents={props.totalAgents}
            activeMeetings={props.activeMeetings}
            completedMeetings={props.completedMeetings}
            totalMessages={props.totalMessages}
            lang={lang}
          />
        )
      case 'recent-meetings':
        return <RecentMeetingsWidget meetings={props.recentMeetings} lang={lang} />
      case 'quick-actions':
        return <QuickActionsWidget lang={lang} />
      case 'how-it-works':
        return (
          <PlaceholderWidget
            titleKey="dashboard.howItWorks"
            lang={lang}
            color="#8b5cf6"
            description={lang === 'zh' ? '三步开始你的 AI 研究之旅' : 'Three steps to start your AI research journey'}
          />
        )
      case 'agent-network':
        return (
          <PlaceholderWidget
            titleKey="dashboardCustomize.agentNetwork"
            lang={lang}
            color="#f97316"
            description={lang === 'zh' ? '智能体协作网络可视化' : 'Agent collaboration network visualization'}
          />
        )
      case 'activity-timeline':
        return (
          <PlaceholderWidget
            titleKey="dashboardCustomize.activityTimeline"
            lang={lang}
            color="#14b8a6"
            description={lang === 'zh' ? '最近活动时间线' : 'Recent activity timeline'}
          />
        )
      case 'sentiment':
        return (
          <PlaceholderWidget
            titleKey="dashboardCustomize.sentiment"
            lang={lang}
            color="#a855f7"
            description={lang === 'zh' ? '会议讨论情感分析' : 'Meeting discussion sentiment analysis'}
          />
        )
      case 'nanobody-progress':
        return (
          <PlaceholderWidget
            titleKey="dashboardCustomize.nanobodyProgress"
            lang={lang}
            color="#22d3ee"
            description={lang === 'zh' ? '纳米抗体设计工作流进度' : 'Nanobody design workflow progress'}
          />
        )
      case 'discussion-timeline':
        return (
          <PlaceholderWidget
            titleKey="dashboardCustomize.discussionTimeline"
            lang={lang}
            color="#f43f5e"
            description={lang === 'zh' ? '讨论时间线热力图' : 'Discussion timeline heatmap'}
          />
        )
      case 'research-insights':
        return (
          <PlaceholderWidget
            titleKey="dashboardCustomize.researchInsights"
            lang={lang}
            color="#6366f1"
            description={lang === 'zh' ? '研究洞察与建议' : 'Research insights and suggestions'}
          />
        )
      case 'research-analytics':
        return (
          <PlaceholderWidget
            titleKey="dashboardCustomize.researchAnalytics"
            lang={lang}
            color="#10b981"
            description={lang === 'zh' ? '会议活动与参与度洞察' : 'Meeting activity and participation insights'}
          />
        )
      case 'widget-activity-feed':
        return (
          <WidgetActivityFeed
            lang={lang}
            agents={props.agents}
            meetings={props.meetings}
          />
        )
      case 'widget-mini-calendar':
        return (
          <WidgetMiniCalendar
            lang={lang}
            agents={props.agents}
            meetings={props.meetings}
          />
        )
      case 'widget-agent-status-grid':
        return (
          <WidgetAgentStatusGrid
            lang={lang}
            agents={props.agents}
            meetings={props.meetings}
            onAgentClick={(agentId) => {
              props.setActiveTab('agents')
            }}
          />
        )
      case 'widget-stats-trend':
        return (
          <WidgetStatsTrend
            lang={lang}
            agents={props.agents}
            meetings={props.meetings}
            analytics={props.analytics}
          />
        )
      default:
        return null
    }
  }, [props, lang])

  // ============================================================
  // Render
  // ============================================================
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <LayoutGrid className="size-4 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold vl-text-heading leading-tight">
              {t(lang, 'dashboardCustomize.title')}
            </h2>
            <p className="text-[10px] vl-text-muted">
              {lang === 'zh' ? '拖拽调整小部件布局' : 'Drag to adjust widget layout'}
            </p>
          </div>
          <Badge
            variant="outline"
            className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30 px-1.5 py-0"
          >
            {visibleCount}/{WIDGET_DEFINITIONS.length}
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          className={`border-[var(--vl-border)] vl-text-body hover:bg-[var(--vl-bg-inner)] text-xs gap-1.5 h-8 transition-all duration-200 ${
            isConfiguring
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-sm shadow-emerald-500/10'
              : ''
          }`}
          onClick={toggleConfiguring}
        >
          <Settings2 className="size-3.5" />
          <span className="hidden sm:inline">
            {t(lang, 'dashboardCustomize.title')}
          </span>
        </Button>
      </div>

      {/* Configuring banner */}
      <AnimatePresence>
        {isConfiguring && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs vl-text-body">
              <Sparkles className="size-3.5 text-emerald-400 shrink-0" />
              <span className="flex-1">
                {lang === 'zh'
                  ? '配置模式 — 在右侧面板中调整小部件的显示、大小和排列顺序'
                  : 'Configure mode — adjust widget visibility, size, and order in the panel'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 px-2"
                onClick={toggleConfiguring}
              >
                {t(lang, 'common.done')}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Widget Grid */}
      <LayoutGroup>
        <div className="widget-grid">
          <AnimatePresence mode="popLayout">
            {visibleOrderedWidgets.map(widget => {
              const def = DEF_MAP.get(widget.id)
              if (!def) return null
              const isCollapsed = collapsedWidgets.has(widget.id)

              return (
                <WidgetCard
                  key={widget.id}
                  widgetId={widget.id}
                  definition={def}
                  isConfiguring={isConfiguring}
                  onToggleVisibility={() => handleToggleVisibility(widget.id)}
                  isCollapsed={isCollapsed}
                  onToggleCollapse={() => toggleCollapse(widget.id)}
                  lang={lang}
                  currentSize={widget.size}
                >
                  {renderWidgetContent(widget.id)}
                </WidgetCard>
              )
            })}
          </AnimatePresence>
        </div>
      </LayoutGroup>

      {/* Hidden widgets indicator */}
      {visibleCount < WIDGET_DEFINITIONS.length && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-3"
        >
          <p className="text-xs vl-text-muted">
            {lang === 'zh'
              ? `${WIDGET_DEFINITIONS.length - visibleCount} 个小部件已隐藏 — 点击上方设置按钮恢复`
              : `${WIDGET_DEFINITIONS.length - visibleCount} widget${WIDGET_DEFINITIONS.length - visibleCount > 1 ? 's' : ''} hidden — click Settings to restore`}
          </p>
        </motion.div>
      )}

      {/* Configuration Panel */}
      <WidgetConfigPanel
        open={configOpen}
        onOpenChange={(open) => { setConfigOpen(open); setIsConfiguring(open) }}
        layout={layout}
        onToggleVisibility={handleToggleVisibility}
        onSetSize={handleSetSize}
        onMoveUp={handleMoveUp}
        onMoveDown={handleMoveDown}
        onReset={handleResetLayout}
        onSave={handleSaveLayout}
        lang={lang}
      />
    </div>
  )
}
