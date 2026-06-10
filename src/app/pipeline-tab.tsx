'use client'

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Kanban, Plus, Trash2, X, CheckCircle2, Target, Calendar, CircleDot, Loader2,
  GripVertical, Eye, ArrowRight, Info, Dna, FlaskConical, Atom, Beaker,
  LayoutGrid, Users, TrendingUp, BarChart3, PieChart as PieChartIcon, Box,
  MapPinned, CheckSquare, AlertTriangle, ShieldCheck, Clock,
  BookOpen, Code2, FileText, BrainCircuit, Search, Download, Upload, Star, ChevronRight,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip as RechartsTooltip,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import { useScrollReveal, ScrollRevealSection } from './scroll-reveal'
import type { Agent, PipelineData, PipelineStageData, PipelineTaskData } from './shared-components'
import { EmptyState, PipelineSkeletonBoard, renderAgentIcon, PRIORITY_COLORS, PRIORITY_LABELS } from './shared-components'
import { Pipeline3DView } from './pipeline-3d-view'
import { GlassPanel } from './glassmorphism-kit'

import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDraggable,
  useDroppable,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ============================================================
// Pipeline Health Indicator
// ============================================================
function PipelineHealthIndicator({
  stages,
  lang,
}: {
  stages: PipelineStageData[]
  lang: Lang
}) {
  const healthData = useMemo(() => {
    const allTasks = stages.flatMap(s => s.tasks)
    const total = allTasks.length
    const done = allTasks.filter(t => t.status === 'done').length
    const blocked = allTasks.filter(t => t.status === 'in_progress' && t.priority === 'high').length
    const overdue = allTasks.filter(t => {
      if (!t.dueDate || t.status === 'done') return false
      return new Date(t.dueDate) < new Date()
    }).length
    const pct = total > 0 ? Math.round((done / total) * 100) : 0

    let health: 'good' | 'warning' | 'critical' = 'critical'
    if (pct > 70) health = 'good'
    else if (pct >= 30) health = 'warning'

    return { total, done, blocked, overdue, pct, health }
  }, [stages])

  const healthColors = {
    good: '#10b981',
    warning: '#f59e0b',
    critical: '#ef4444',
  }

  const healthBg = {
    good: 'bg-emerald-500/20',
    warning: 'bg-amber-500/20',
    critical: 'bg-red-500/20',
  }

  const healthText = {
    good: 'text-emerald-400',
    warning: 'text-amber-400',
    critical: 'text-red-400',
  }

  return (
    <div className={`health-indicator health-${healthData.health} ${healthBg[healthData.health]} rounded-xl p-4 flex items-center gap-4`}>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className={`size-4 ${healthText[healthData.health]}`} />
          <h4 className="text-sm font-semibold vl-text-heading">{t(lang, 'pipeline.health')}</h4>
          <Badge className={`${healthBg[healthData.health]} ${healthText[healthData.health]} border text-[10px] h-5 px-2`} style={{ borderColor: `${healthColors[healthData.health]}40` }}>
            {t(lang, `pipeline.health.${healthData.health}`) }
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[11px] vl-text-muted">
            {t(lang, 'common.total')}: <span className="font-semibold vl-text-heading">{healthData.total}</span>
          </span>
          <span className="text-[11px] vl-text-muted">
            {healthData.done}/{healthData.total} ({healthData.pct}%)
          </span>
          {healthData.overdue > 0 && (
            <span className="text-[11px] text-red-400">
              {t(lang, 'pipeline.overdue')}: {healthData.overdue}
            </span>
          )}
          {healthData.blocked > 0 && (
            <span className="text-[11px] text-amber-400">
              {t(lang, 'pipeline.blocked')}: {healthData.blocked}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="pipeline-progress-bar progress-bar-animated h-3 w-32 rounded-full bg-[var(--vl-bg-inner)] overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: healthColors[healthData.health] }}
            initial={{ width: 0 }}
            animate={{ width: `${healthData.pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <span className="text-lg font-bold" style={{ color: healthColors[healthData.health] }}>{healthData.pct}%</span>
      </div>
    </div>
  )
}

// ============================================================
// Stage Quick-Jump Pills
// ============================================================
function StageQuickJumpPills({
  stages,
  lang,
  activeStageIndex,
  onJumpToStage,
}: {
  stages: PipelineStageData[]
  lang: Lang
  activeStageIndex: number
  onJumpToStage: (index: number) => void
}) {
  if (stages.length === 0) return null
  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin pb-2 custom-scrollbar">
      {stages.map((stage, idx) => {
        const isActive = idx === activeStageIndex
        return (
          <button
            key={stage.id}
            className={`stage-pill shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors ${
              isActive
                ? 'vl-text-heading'
                : 'vl-text-muted border-transparent hover:border-[var(--vl-border)]'
            }`}
            style={{
              color: isActive ? stage.color : undefined,
              backgroundColor: isActive ? `${stage.color}15` : undefined,
              borderColor: isActive ? `${stage.color}40` : undefined,
              boxShadow: isActive ? `0 0 0 1px ${stage.color}60` : undefined,
            }}
            onClick={() => onJumpToStage(idx)}
          >
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
            <span className="max-w-[80px] truncate">{stage.title}</span>
            <span className={`px-1 rounded-full text-[9px] ${isActive ? '' : 'bg-[var(--vl-bg-inner)]'}`}>
              {stage.tasks.length}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ============================================================
// Pipeline Mini-Map
// ============================================================
function PipelineMiniMap({
  stages,
  visible,
  onToggle,
  onJumpToStage,
}: {
  stages: PipelineStageData[]
  visible: boolean
  onToggle: () => void
  onJumpToStage: (index: number) => void
}) {
  const [activeMinimapStage, setActiveMinimapStage] = useState<number | null>(null)

  // Calculate mini-map dimensions
  const minimapWidth = 192 // w-48
  const minimapHeight = 128 // h-32
  const stageCount = stages.length
  const maxTasksInStage = Math.max(1, ...stages.map(s => s.tasks.length))
  const stageBarHeight = Math.max(20, minimapHeight - 16)

  if (stageCount === 0) return null

  return (
    <React.Fragment>
      {/* Mini-map panel */}
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.2 }}
            className="pipeline-minimap vl-card backdrop-blur-xl border rounded-xl p-2 shadow-xl"
            style={{ position: 'fixed', bottom: 80, right: 20, width: minimapWidth, height: minimapHeight, zIndex: 50 }}
          >
            <div className="relative w-full h-full">
              {/* Stage bars */}
              <div className="flex gap-1 h-full items-end px-1">
                {stages.map((stage, idx) => {
                  const barH = maxTasksInStage > 0 ? Math.max(8, (stage.tasks.length / maxTasksInStage) * (stageBarHeight - 8)) : 8
                  const isHovered = activeMinimapStage === idx
                  return (
                    <div
                      key={stage.id}
                      className="flex flex-col items-center flex-1 cursor-pointer group"
                      onMouseEnter={() => setActiveMinimapStage(idx)}
                      onMouseLeave={() => setActiveMinimapStage(null)}
                      onClick={() => onJumpToStage(idx)}
                    >
                      <div
                        className="w-full rounded-sm transition-all duration-150"
                        style={{
                          height: barH,
                          backgroundColor: isHovered ? stage.color : `${stage.color}50`,
                          opacity: isHovered ? 1 : 0.7,
                        }}
                      />
                      <span className="text-[7px] mt-0.5 vl-text-muted leading-none">{stage.tasks.length}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="vl-card backdrop-blur-xl border rounded-lg p-2 shadow-lg transition-all hover:shadow-xl"
        style={{ position: 'fixed', bottom: 80, right: 20, zIndex: 51 }}
        aria-label="Toggle mini-map"
      >
        <MapPinned className="size-4 vl-text-heading" />
      </button>
    </React.Fragment>
  )
}

interface PipelineTabProps {
  agents: Agent[]
  pipelines: PipelineData[]
  selectedPipelineId: string | null
  selectedPipeline: PipelineData | null
  loading: boolean
  lang: Lang
  // Setters
  setSelectedPipelineId: (id: string | null) => void
  setNewPipelineDialogOpen: (open: boolean) => void
  setAddStageDialogOpen: (open: boolean) => void
  setAddTaskDialogOpen: (open: boolean) => void
  setAddTaskStageId: (id: string | null) => void
  setEditingTaskId: (id: string | null) => void
  setEditTaskDialogOpen: (open: boolean) => void
  // Handlers
  handleDeletePipeline: (id: string) => void
  handleDeleteStage: (stageId: string) => void
  handleDeleteTask: (taskId: string, stageId: string) => void
  handleUpdateTask: (taskId: string, stageId: string, updates: Record<string, unknown>) => void
  handleMoveTask?: (taskId: string, fromStageId: string, toStageId: string, newOrder: number) => void
  // Template handler
  handleCreatePipelineFromTemplate?: (name: string, stages: { title: string; order: number; color: string }[]) => void
}

// Task status badge colors
const STATUS_BADGES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  todo: { bg: 'bg-[var(--vl-status-draft-bg)]', text: 'text-[var(--vl-text-muted)]', border: 'border-[var(--vl-status-draft-border)]', label: 'Pending' },
  in_progress: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', label: 'In Progress' },
  done: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'Completed' },
}

// Dependency type colors
const DEP_COLORS = {
  valid: '#10b981',
  blocked: '#ef4444',
  optional: '#6b7280',
  critical: '#059669',
}

// ============================================================
// Sortable Task Card
// ============================================================
function SortableTaskCard({
  task,
  stage,
  agents,
  lang,
  onDelete,
  onUpdate,
  onClick,
}: {
  task: PipelineTaskData
  stage: PipelineStageData
  agents: Agent[]
  lang: Lang
  onDelete: () => void
  onUpdate: () => void
  onClick: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: 'task', task, stage } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : 1,
  }

  const tags = (() => { try { return JSON.parse(task.tags) } catch { return [] } })()
  const statusBadge = STATUS_BADGES[task.status] || STATUS_BADGES.todo

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className="vl-inner rounded-lg p-3 cursor-pointer transition-all duration-200 hover:shadow-md group relative card-gradient-border"
        onClick={onClick}
        aria-label={`Task: ${task.title} - ${task.status}`}
      >
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 left-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="size-3.5 vl-text-muted" />
        </div>

        <div className="flex items-start justify-between gap-1 mb-1 pl-3">
          <p className="text-xs font-medium vl-text-heading leading-tight">{task.title}</p>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            {task.status !== 'done' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0 vl-text-muted hover:text-emerald-400" onClick={(e) => {
                      e.stopPropagation()
                      onUpdate()
                    }}>
                      <CheckCircle2 className="size-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{task.status === 'todo' ? t(lang, 'pipeline.badge.inProgress') : t(lang, 'pipeline.badge.done')}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0 vl-text-muted hover:text-red-400" onClick={(e) => {
                    e.stopPropagation()
                    onDelete()
                  }}>
                    <Trash2 className="size-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t(lang, 'common.delete')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        {task.description && (
          <p className="text-[10px] vl-text-muted line-clamp-2 mb-2 ml-3">{task.description}</p>
        )}
        <div className="flex items-center gap-2 flex-wrap ml-3">
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[task.priority] || 'bg-[var(--vl-text-muted)]'}`} />
            <span className="text-[9px] vl-text-muted">{PRIORITY_LABELS[task.priority] || task.priority}</span>
          </div>
          {/* Status Badge */}
          <Badge className={`${statusBadge.bg} ${statusBadge.text} border ${statusBadge.border} text-[9px] h-4 px-1.5`}>
            {statusBadge.label}
          </Badge>
          {task.assignee && (
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: task.assignee.color || '#6366f1' }}>
                <span className="text-[7px] font-bold">{task.assignee.title.charAt(0)}</span>
              </div>
              <span className="text-[9px] vl-text-muted">{task.assignee.title.split(' ').pop()}</span>
            </div>
          )}
          {task.dueDate && (
            <span className="text-[9px] vl-text-muted flex items-center gap-0.5">
              <Calendar className="size-2.5" />
              {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
        {tags.length > 0 && (
          <div className="flex items-center gap-1 mt-1.5 flex-wrap ml-3">
            {tags.slice(0, 3).map((tag: string, i: number) => (
              <span key={i} className="text-[8px] px-1.5 py-0.5 rounded bg-[var(--vl-bg-inner)] vl-text-muted">{tag}</span>
            ))}
            {tags.length > 3 && <span className="text-[8px] vl-text-muted">+{tags.length - 3}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Task Detail Popover
// ============================================================
function TaskDetailPopover({
  task,
  agents,
  lang,
  onUpdate,
}: {
  task: PipelineTaskData
  agents: Agent[]
  lang: Lang
  onUpdate: (updates: Record<string, unknown>) => void
}) {
  const tags = (() => { try { return JSON.parse(task.tags) } catch { return [] } })()
  const statusBadge = STATUS_BADGES[task.status] || STATUS_BADGES.todo

  return (
    <div className="space-y-3 p-1" aria-label={`Task details: ${task.title}`}>
      <div>
        <h4 className="text-sm font-semibold vl-text-heading">{task.title}</h4>
        {task.description && (
          <p className="text-xs vl-text-muted mt-1">{task.description}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="vl-inner rounded-lg p-2">
          <p className="text-[10px] vl-text-muted">{t(lang, 'common.status')}</p>
          <Badge className={`${statusBadge.bg} ${statusBadge.text} border ${statusBadge.border} text-[9px] h-4 px-1.5 mt-0.5`}>
            {statusBadge.label}
          </Badge>
        </div>
        <div className="vl-inner rounded-lg p-2">
          <p className="text-[10px] vl-text-muted">{t(lang, 'pipeline.task.priority')}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <div className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[task.priority] || 'bg-[var(--vl-text-muted)]'}`} />
            <span className="text-xs vl-text-body">{PRIORITY_LABELS[task.priority] || task.priority}</span>
          </div>
        </div>
        {task.assignee && (
          <div className="vl-inner rounded-lg p-2">
            <p className="text-[10px] vl-text-muted">{t(lang, 'pipeline.task.assignee')}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <div className="w-4 h-4 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: task.assignee.color || '#6366f1' }}>
                <span className="text-[7px] font-bold">{task.assignee.title.charAt(0)}</span>
              </div>
              <span className="text-xs vl-text-body">{task.assignee.title}</span>
            </div>
          </div>
        )}
        {task.dueDate && (
          <div className="vl-inner rounded-lg p-2">
            <p className="text-[10px] vl-text-muted">{t(lang, 'pipeline.task.dueDate')}</p>
            <span className="text-xs vl-text-body mt-0.5 flex items-center gap-1">
              <Calendar className="size-3" />
              {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        )}
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag: string, i: number) => (
            <Badge key={i} variant="outline" className="text-[9px] h-5 px-1.5">{tag}</Badge>
          ))}
        </div>
      )}
      <div className="flex gap-1.5 pt-1">
        {task.status === 'todo' && (
          <Button size="sm" className="text-[10px] h-7 bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30" onClick={() => onUpdate({ status: 'in_progress' })}>
            <ArrowRight className="size-3 mr-1" /> {t(lang, 'pipeline.badge.inProgress')}
          </Button>
        )}
        {task.status === 'in_progress' && (
          <Button size="sm" className="text-[10px] h-7 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30" onClick={() => onUpdate({ status: 'done' })}>
            <CheckCircle2 className="size-3 mr-1" /> {t(lang, 'pipeline.badge.done')}
          </Button>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Droppable Stage Column
// ============================================================
function SortableStageColumn({
  stage,
  agents,
  lang,
  onDelete,
  onAddTask,
  onDeleteTask,
  onUpdateTask,
  onEditTask,
  isDropTarget,
}: {
  stage: PipelineStageData
  agents: Agent[]
  lang: Lang
  onDelete: () => void
  onAddTask: () => void
  onDeleteTask: (taskId: string) => void
  onUpdateTask: (taskId: string, updates: Record<string, unknown>) => void
  onEditTask: (task: PipelineTaskData) => void
  isDropTarget: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `stage-${stage.id}`,
    data: { type: 'stage', stage },
  })

  const taskIds = stage.tasks.map(t => t.id)

  return (
    <div className="w-72 flex-shrink-0">
      <div
        ref={setNodeRef}
        className={`vl-card border rounded-xl overflow-hidden transition-all duration-200 glass-panel hover-lift-sm transition-all-smooth card-hover-glow ${
          isDropTarget ? 'ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-500/10' : ''
        } ${isOver ? 'scale-[1.02] shadow-lg shadow-emerald-500/20' : ''}`}
      >
        {/* Stage Header */}
        <div
          className="p-3 flex items-center justify-between transition-colors"
          style={{
            background: `${stage.color}15`,
            borderBottom: `2px solid ${stage.color}40`,
          }}
        >
          <div className="flex items-center gap-2">
            <motion.div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: stage.color }}
              animate={isDropTarget ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.6, repeat: Infinity }}
            />
            <h3 className="text-sm font-semibold vl-text-heading">{stage.title}</h3>
            <Badge variant="outline" className="text-[10px] h-5 px-1.5" style={{ borderColor: `${stage.color}60`, color: stage.color }}>
              {stage.tasks.length}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 vl-text-muted hover:text-red-400" onClick={onDelete}>
            <X className="size-3" />
          </Button>
        </div>

        {/* Task List */}
        <div className="p-2 space-y-2 max-h-[500px] overflow-y-auto scrollbar-thin custom-scrollbar">
          {stage.tasks.length === 0 ? (
            <div className={`py-4 text-center rounded-lg transition-colors ${isOver ? 'bg-emerald-500/10 border border-dashed border-emerald-500/30' : ''}`}>
              <p className="text-[11px] vl-text-muted">{isOver ? t(lang, 'pipeline.dropHere') : t(lang, 'pipeline.noTasksYet')}</p>
            </div>
          ) : (
            <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
              {stage.tasks.map(task => (
                <Popover key={task.id}>
                  <PopoverTrigger asChild>
                    <div>
                      <SortableTaskCard
                        task={task}
                        stage={stage}
                        agents={agents}
                        lang={lang}
                        onDelete={() => onDeleteTask(task.id)}
                        onUpdate={() => {
                          const nextStatus = task.status === 'todo' ? 'in_progress' : 'done'
                          onUpdateTask(task.id, { status: nextStatus })
                        }}
                        onClick={() => onEditTask(task)}
                      />
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-4 vl-dialog" side="right" align="start">
                    <TaskDetailPopover
                      task={task}
                      agents={agents}
                      lang={lang}
                      onUpdate={(updates) => onUpdateTask(task.id, updates)}
                    />
                  </PopoverContent>
                </Popover>
              ))}
            </SortableContext>
          )}
        </div>

        {/* Add Task Button */}
        <div className="p-2 border-t" style={{ borderColor: 'var(--vl-border)' }}>
          <Button
            variant="ghost"
            size="sm"
            className="w-full vl-text-muted hover:text-emerald-400 hover:bg-emerald-500/10 justify-start text-xs h-8"
            onClick={onAddTask}
          >
            <Plus className="size-3 mr-1" /> {t(lang, 'pipeline.addTask')}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// SVG Dependency Graph Overlay
// ============================================================
function DependencyGraphSVG({
  stages,
  hoveredCurve,
  selectedCurve,
  onCurveHover,
  onCurveClick,
  criticalPathTasks,
}: {
  stages: PipelineStageData[]
  hoveredCurve: string | null
  selectedCurve: string | null
  onCurveHover: (id: string | null) => void
  onCurveClick: (id: string) => void
  criticalPathTasks: Set<string>
}) {
  const boardRef = useRef<HTMLDivElement>(null)
  const [svgSize, setSvgSize] = useState({ width: 800, height: 600 })

  useEffect(() => {
    const updateSize = () => {
      if (boardRef.current) {
        const rect = boardRef.current.getBoundingClientRect()
        setSvgSize({ width: rect.width, height: rect.height })
      }
    }
    updateSize()
    const ro = new ResizeObserver(updateSize)
    if (boardRef.current) ro.observe(boardRef.current)
    return () => ro.disconnect()
  }, [])

  // Build a map of task positions (approximate)
  const taskPositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {}
    const columnWidth = 288 + 16 // w-72 + gap-4
    const headerHeight = 48
    const taskHeight = 80

    stages.forEach((stage, stageIdx) => {
      stage.tasks.forEach((task, taskIdx) => {
        const x = stageIdx * columnWidth + 144 // center of column
        const y = headerHeight + taskIdx * taskHeight + 40 + taskHeight / 2
        positions[task.id] = { x, y }
      })
    })
    return positions
  }, [stages])

  // Generate dependency curves (synthetic - tasks in earlier stages depend on tasks in later stages)
  const dependencies = useMemo(() => {
    const deps: { id: string; from: string; to: string; type: 'valid' | 'blocked' | 'optional'; fromTask: PipelineTaskData; toTask: PipelineTaskData }[] = []
    for (let i = 0; i < stages.length - 1; i++) {
      const currentStage = stages[i]
      const nextStage = stages[i + 1]
      if (currentStage.tasks.length > 0 && nextStage.tasks.length > 0) {
        // Connect first task of current stage to first task of next stage
        const fromTask = currentStage.tasks[0]
        const toTask = nextStage.tasks[0]
        const type = (fromTask.status === 'done' && toTask.status !== 'done') ? 'optional' as const
          : (fromTask.status === 'done') ? 'valid' as const
          : (fromTask.status === 'done' ? 'valid' as const : 'optional' as const)
        deps.push({
          id: `${fromTask.id}->${toTask.id}`,
          from: fromTask.id,
          to: toTask.id,
          type,
          fromTask,
          toTask,
        })
      }
      // Additional cross-links for multi-task stages
      if (currentStage.tasks.length > 1 && nextStage.tasks.length > 1) {
        const fromTask = currentStage.tasks[currentStage.tasks.length - 1]
        const toTask = nextStage.tasks[nextStage.tasks.length - 1]
        const type = (fromTask.status === 'done' && toTask.status === 'in_progress') ? 'blocked' as const : 'optional' as const
        deps.push({
          id: `${fromTask.id}->${toTask.id}`,
          from: fromTask.id,
          to: toTask.id,
          type,
          fromTask,
          toTask,
        })
      }
    }
    return deps
  }, [stages])

  if (stages.length < 2 || dependencies.length === 0) return null

  const arrowDefId = 'dep-arrow'

  return (
    <div ref={boardRef} className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 40 }}>
      <svg width={svgSize.width} height={svgSize.height} className="absolute inset-0">
        <defs>
          <marker id={arrowDefId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
          </marker>
          {/* Glow filter */}
          <filter id="dep-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {dependencies.map(dep => {
          const fromPos = taskPositions[dep.from]
          const toPos = taskPositions[dep.to]
          if (!fromPos || !toPos) return null

          const isHovered = hoveredCurve === dep.id
          const isSelected = selectedCurve === dep.id
          const isCritical = criticalPathTasks.has(dep.from) && criticalPathTasks.has(dep.to)

          const color = isCritical ? DEP_COLORS.critical : DEP_COLORS[dep.type]
          const strokeWidth = isHovered || isSelected ? 2.5 : 1.5

          // Bezier control points
          const dx = toPos.x - fromPos.x
          const cp1x = fromPos.x + dx * 0.4
          const cp1y = fromPos.y
          const cp2x = toPos.x - dx * 0.4
          const cp2y = toPos.y
          const path = `M ${fromPos.x} ${fromPos.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${toPos.x} ${toPos.y}`

          return (
            <g key={dep.id} className="pointer-events-auto" style={{ cursor: 'pointer' }}>
              {/* Invisible wider path for easier hover */}
              <path
                d={path}
                fill="none"
                stroke="transparent"
                strokeWidth={12}
                onMouseEnter={() => onCurveHover(dep.id)}
                onMouseLeave={() => onCurveHover(null)}
                onClick={() => onCurveClick(dep.id)}
              />
              {/* Visible path */}
              <motion.path
                d={path}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeDasharray={dep.type === 'optional' ? '6 3' : undefined}
                markerEnd={`url(#${arrowDefId})`}
                initial={{ opacity: 0.5 }}
                animate={{
                  opacity: isHovered || isSelected ? 1 : 0.5,
                  strokeWidth: isHovered || isSelected ? 2.5 : 1.5,
                }}
                transition={{ duration: 0.2 }}
                style={{ color }}
                filter={isHovered || isSelected ? 'url(#dep-glow)' : undefined}
              />
              {/* Critical path glow */}
              {isCritical && (
                <motion.path
                  d={path}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth={4}
                  strokeOpacity={0.2}
                  animate={{ strokeOpacity: [0.1, 0.25, 0.1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ============================================================
// Pipeline Templates Gallery System
// ============================================================

type TemplateStage = { nameKey: string; color: string }
type PipelineTemplate = {
  id: string
  nameKey: string
  descKey: string
  icon: React.ElementType
  category: string
  accentColor: string
  stages: TemplateStage[]
  isCustom?: boolean
  customName?: string
  customDesc?: string
}

const BUILTIN_TEMPLATES: PipelineTemplate[] = [
  {
    id: 'research',
    nameKey: 'pipelineTemplates.template.research.name',
    descKey: 'pipelineTemplates.template.research.desc',
    icon: BookOpen,
    category: 'research',
    accentColor: '#10b981',
    stages: [
      { nameKey: 'pipelineTemplates.stage.idea', color: '#10b981' },
      { nameKey: 'pipelineTemplates.stage.literatureReview', color: '#06b6d4' },
      { nameKey: 'pipelineTemplates.stage.hypothesis', color: '#f59e0b' },
      { nameKey: 'pipelineTemplates.stage.experiment', color: '#ef4444' },
      { nameKey: 'pipelineTemplates.stage.analysis', color: '#8b5cf6' },
      { nameKey: 'pipelineTemplates.stage.publication', color: '#ec4899' },
    ],
  },
  {
    id: 'software-dev',
    nameKey: 'pipelineTemplates.template.softwareDev.name',
    descKey: 'pipelineTemplates.template.softwareDev.desc',
    icon: Code2,
    category: 'engineering',
    accentColor: '#3b82f6',
    stages: [
      { nameKey: 'pipelineTemplates.stage.planning', color: '#3b82f6' },
      { nameKey: 'pipelineTemplates.stage.design', color: '#06b6d4' },
      { nameKey: 'pipelineTemplates.stage.implementation', color: '#10b981' },
      { nameKey: 'pipelineTemplates.stage.testing', color: '#f59e0b' },
      { nameKey: 'pipelineTemplates.stage.review', color: '#8b5cf6' },
      { nameKey: 'pipelineTemplates.stage.deploy', color: '#ef4444' },
    ],
  },
  {
    id: 'drug-discovery',
    nameKey: 'pipelineTemplates.template.drugDiscovery.name',
    descKey: 'pipelineTemplates.template.drugDiscovery.desc',
    icon: FlaskConical,
    category: 'science',
    accentColor: '#8b5cf6',
    stages: [
      { nameKey: 'pipelineTemplates.stage.targetId', color: '#8b5cf6' },
      { nameKey: 'pipelineTemplates.stage.screening', color: '#3b82f6' },
      { nameKey: 'pipelineTemplates.stage.leadOptimization', color: '#06b6d4' },
      { nameKey: 'pipelineTemplates.stage.preclinical', color: '#f59e0b' },
      { nameKey: 'pipelineTemplates.stage.clinical', color: '#10b981' },
      { nameKey: 'pipelineTemplates.stage.approval', color: '#ec4899' },
    ],
  },
  {
    id: 'content-creation',
    nameKey: 'pipelineTemplates.template.contentCreation.name',
    descKey: 'pipelineTemplates.template.contentCreation.desc',
    icon: FileText,
    category: 'content',
    accentColor: '#f59e0b',
    stages: [
      { nameKey: 'pipelineTemplates.stage.researchContent', color: '#f59e0b' },
      { nameKey: 'pipelineTemplates.stage.outline', color: '#06b6d4' },
      { nameKey: 'pipelineTemplates.stage.draft', color: '#3b82f6' },
      { nameKey: 'pipelineTemplates.stage.review', color: '#8b5cf6' },
      { nameKey: 'pipelineTemplates.stage.edit', color: '#10b981' },
      { nameKey: 'pipelineTemplates.stage.publish', color: '#ef4444' },
    ],
  },
  {
    id: 'ml-pipeline',
    nameKey: 'pipelineTemplates.template.mlPipeline.name',
    descKey: 'pipelineTemplates.template.mlPipeline.desc',
    icon: BrainCircuit,
    category: 'ml',
    accentColor: '#06b6d4',
    stages: [
      { nameKey: 'pipelineTemplates.stage.dataCollection', color: '#06b6d4' },
      { nameKey: 'pipelineTemplates.stage.preprocessing', color: '#3b82f6' },
      { nameKey: 'pipelineTemplates.stage.featureEngineering', color: '#8b5cf6' },
      { nameKey: 'pipelineTemplates.stage.training', color: '#f59e0b' },
      { nameKey: 'pipelineTemplates.stage.evaluation', color: '#10b981' },
      { nameKey: 'pipelineTemplates.stage.deployment', color: '#ef4444' },
    ],
  },
  {
    id: 'nanobody-design',
    nameKey: 'pipelineTemplates.template.nanobodyDesign.name',
    descKey: 'pipelineTemplates.template.nanobodyDesign.desc',
    icon: Dna,
    category: 'science',
    accentColor: '#10b981',
    stages: [
      { nameKey: 'pipelineTemplates.stage.esm', color: '#10b981' },
      { nameKey: 'pipelineTemplates.stage.alphaFold', color: '#3b82f6' },
      { nameKey: 'pipelineTemplates.stage.rosetta', color: '#f59e0b' },
      { nameKey: 'pipelineTemplates.stage.docking', color: '#8b5cf6' },
      { nameKey: 'pipelineTemplates.stage.mdSimulation', color: '#06b6d4' },
      { nameKey: 'pipelineTemplates.stage.selection', color: '#ef4444' },
    ],
  },
]

const TEMPLATE_CATEGORIES = [
  { key: 'all', nameKey: 'pipelineTemplates.allCategories' },
  { key: 'research', nameKey: 'pipelineTemplates.category.research' },
  { key: 'engineering', nameKey: 'pipelineTemplates.category.engineering' },
  { key: 'science', nameKey: 'pipelineTemplates.category.science' },
  { key: 'content', nameKey: 'pipelineTemplates.categoryContent' },
  { key: 'ml', nameKey: 'pipelineTemplates.category.ml' },
  { key: 'custom', nameKey: 'pipelineTemplates.category.custom' },
] as const

const CUSTOM_TEMPLATES_STORAGE_KEY = 'vl-pipeline-templates'

// Hydration-safe localStorage read/write
function readCustomTemplates(): Omit<PipelineTemplate, 'icon'>[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(CUSTOM_TEMPLATES_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch { return [] }
}

function writeCustomTemplates(templates: Omit<PipelineTemplate, 'icon'>[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CUSTOM_TEMPLATES_STORAGE_KEY, JSON.stringify(templates))
  } catch { /* quota exceeded */ }
}

// Merge custom templates with built-in ones, assigning a generic icon
function getAllTemplates(customTemplates: Omit<PipelineTemplate, 'icon'>[]): PipelineTemplate[] {
  const customWithIcon: PipelineTemplate[] = customTemplates.map(ct => ({
    ...ct,
    icon: Star,
    isCustom: true,
  }))
  return [...BUILTIN_TEMPLATES, ...customWithIcon]
}

// Template Preview Modal
function TemplatePreviewModal({
  template,
  lang,
  onClose,
  onUse,
}: {
  template: PipelineTemplate
  lang: Lang
  onClose: () => void
  onUse: () => void
}) {
  const name = template.isCustom ? (template.customName || t(lang, template.nameKey)) : t(lang, template.nameKey)
  const desc = template.isCustom ? (template.customDesc || t(lang, template.descKey)) : t(lang, template.descKey)
  const IconComp = template.icon

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 dialog-overlay-blur"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
        className="template-preview-modal p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${template.accentColor}20` }}
            >
              <IconComp className="size-5" style={{ color: template.accentColor }} />
            </div>
            <div>
              <h3 className="text-base font-semibold vl-text-heading">{name}</h3>
              <p className="text-xs vl-text-muted">{desc}</p>
            </div>
          </div>
          <button onClick={onClose} className="vl-text-muted hover:text-red-400 transition-colors p-1">
            <X className="size-4" />
          </button>
        </div>

        <div className="mb-4">
          <h4 className="text-xs font-medium vl-text-muted mb-2 uppercase tracking-wider">
            {t(lang, 'pipelineTemplates.previewStages')} ({template.stages.length})
          </h4>
          <div className="space-y-2">
            {template.stages.map((stage, i) => {
              const stageName = t(lang, stage.nameKey)
              return (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                    style={{ backgroundColor: stage.color }}
                  >
                    {i + 1}
                  </div>
                  <span className="text-sm vl-text-heading flex-1">{stageName}</span>
                  <ChevronRight className="size-3 vl-text-muted" />
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            className="flex-1 text-xs h-9"
            style={{
              backgroundColor: `${template.accentColor}20`,
              color: template.accentColor,
              border: `1px solid ${template.accentColor}40`,
            }}
            onClick={() => { onUse(); onClose() }}
          >
            <Plus className="size-3 mr-1" />
            {t(lang, 'pipelineTemplates.useTemplate')}
          </Button>
          <Button variant="outline" className="text-xs h-9" onClick={onClose}>
            {t(lang, 'pipelineTemplates.close')}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// Import/Export Dialog
function ImportExportDialog({
  lang,
  mode,
  onClose,
  onImport,
  initialJSON,
}: {
   lang: Lang
  mode: 'import' | 'export'
  onClose: () => void
  onImport: (json: string) => void
  initialJSON?: string
}) {
  const [jsonText, setJsonText] = useState(initialJSON || '')

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 dialog-overlay-blur"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
        className="template-preview-modal p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold vl-text-heading">
            {mode === 'import' ? t(lang, 'pipelineTemplates.importJSON') : t(lang, 'pipelineTemplates.exportJSON')}
          </h3>
          <button onClick={onClose} className="vl-text-muted hover:text-red-400 transition-colors p-1">
            <X className="size-4" />
          </button>
        </div>

        <textarea
          className="template-json-textarea"
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          placeholder={t(lang, 'pipelineTemplates.importFileHint')}
          rows={8}
          readOnly={mode === 'export'}
        />

        <div className="flex gap-2 mt-4">
          {mode === 'import' ? (
            <Button
              className="flex-1 text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => { onImport(jsonText); onClose() }}
              disabled={!jsonText.trim()}
            >
              <Upload className="size-3 mr-1" />
              {t(lang, 'common.confirm')}
            </Button>
          ) : (
            <Button
              className="flex-1 text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                navigator.clipboard.writeText(jsonText).catch(() => {})
                onClose()
              }}
            >
              <Download className="size-3 mr-1" />
              {t(lang, 'common.copy')}
            </Button>
          )}
          <Button variant="outline" className="text-xs h-9" onClick={onClose}>
            {t(lang, 'pipelineTemplates.cancel')}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// Save as Template Dialog
function SaveAsTemplateDialog({
  lang,
  onClose,
  onSave,
}: {
  lang: Lang
  onClose: () => void
  onSave: (name: string, desc: string) => void
}) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 dialog-overlay-blur"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
        className="template-preview-modal p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold vl-text-heading">{t(lang, 'pipelineTemplates.saveAsTemplate')}</h3>
          <button onClick={onClose} className="vl-text-muted hover:text-red-400 transition-colors p-1">
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs vl-text-muted block mb-1">{t(lang, 'pipelineTemplates.templateName')}</label>
            <Input
              className="vl-input text-sm h-9"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t(lang, 'pipelineTemplates.templateNamePlaceholder')}
            />
          </div>
          <div>
            <label className="text-xs vl-text-muted block mb-1">{t(lang, 'pipelineTemplates.templateDescPlaceholder').replace('...', '').trim()}</label>
            <Input
              className="vl-input text-sm h-9"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder={t(lang, 'pipelineTemplates.templateDescPlaceholder')}
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            className="flex-1 text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => { onSave(name, desc); onClose() }}
            disabled={!name.trim()}
          >
            <CheckCircle2 className="size-3 mr-1" />
            {t(lang, 'pipelineTemplates.save')}
          </Button>
          <Button variant="outline" className="text-xs h-9" onClick={onClose}>
            {t(lang, 'pipelineTemplates.cancel')}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// Pipeline Templates Gallery Section
function PipelineTemplatesSection({
  lang,
  onUseTemplate,
  currentPipeline,
}: {
  lang: Lang
  onUseTemplate?: (name: string, stages: { title: string; order: number; color: string }[]) => void
  currentPipeline?: PipelineData | null
}) {
  // Hydration-safe custom templates
  const [customTemplates, setCustomTemplates] = useState<Omit<PipelineTemplate, 'icon'>[]>([])
  useEffect(() => {
    setCustomTemplates(readCustomTemplates())
  }, [])

  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [previewTemplate, setPreviewTemplate] = useState<PipelineTemplate | null>(null)
  const [confirmUseTemplate, setConfirmUseTemplate] = useState<PipelineTemplate | null>(null)
  const [importExportMode, setImportExportMode] = useState<'import' | 'export' | null>(null)
  const [exportJSON, setExportJSON] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Auto-clear toast
  useEffect(() => {
    if (!toastMessage) return
    const timer = setTimeout(() => setToastMessage(null), 2500)
    return () => clearTimeout(timer)
  }, [toastMessage])

  const allTemplates = useMemo(() => getAllTemplates(customTemplates), [customTemplates])

  const filteredTemplates = useMemo(() => {
    let result = allTemplates
    if (activeCategory !== 'all') {
      if (activeCategory === 'custom') {
        result = result.filter(t => t.isCustom)
      } else {
        result = result.filter(t => t.category === activeCategory && !t.isCustom)
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(tmpl => {
        const name = tmpl.isCustom ? (tmpl.customName || '') : t(lang, tmpl.nameKey).toLowerCase()
        return name.includes(q)
      })
    }
    return result
  }, [allTemplates, activeCategory, searchQuery, lang])

  // Use template handler with confirmation
  const handleUseTemplate = (template: PipelineTemplate) => {
    const name = template.isCustom ? (template.customName || t(lang, template.nameKey)) : t(lang, template.nameKey)
    const stages = template.stages.map((s, i) => ({
      title: t(lang, s.nameKey),
      order: i,
      color: s.color,
    }))
    onUseTemplate?.(name, stages)
    setToastMessage(t(lang, 'pipelineTemplates.templateSaved'))
  }

  // Save current pipeline as template
  const handleSaveAsTemplate = (name: string, desc: string) => {
    if (!currentPipeline || !name.trim()) return
    const stages: TemplateStage[] = currentPipeline.stages.map(s => ({
      nameKey: `custom.${s.title}`,
      color: s.color,
    }))
    const customTemplate: Omit<PipelineTemplate, 'icon'> = {
      id: `custom-${Date.now()}`,
      nameKey: `custom.${name}`,
      descKey: `custom.${desc}`,
      category: 'custom',
      accentColor: '#f59e0b',
      stages,
      isCustom: true,
      customName: name,
      customDesc: desc,
    }
    const updated = [...customTemplates, customTemplate]
    setCustomTemplates(updated)
    writeCustomTemplates(updated)
    setToastMessage(t(lang, 'pipelineTemplates.templateSaved'))
  }

  // Delete custom template
  const handleDeleteTemplate = (template: PipelineTemplate) => {
    const updated = customTemplates.filter(ct => ct.id !== template.id)
    setCustomTemplates(updated)
    writeCustomTemplates(updated)
    setToastMessage(t(lang, 'pipelineTemplates.templateDeleted'))
  }

  // Export template as JSON
  const handleExportTemplate = (template: PipelineTemplate) => {
    const name = template.isCustom ? (template.customName || t(lang, template.nameKey)) : t(lang, template.nameKey)
    const exportData = {
      name,
      description: template.isCustom ? (template.customDesc || '') : t(lang, template.descKey),
      category: template.category,
      stages: template.stages.map((s, i) => ({
        title: t(lang, s.nameKey),
        order: i,
        color: s.color,
      })),
    }
    setExportJSON(JSON.stringify(exportData, null, 2))
    setImportExportMode('export')
  }

  // Import template from JSON
  const handleImportTemplate = (json: string) => {
    try {
      const data = JSON.parse(json)
      if (!data.name || !Array.isArray(data.stages)) throw new Error('Invalid')
      const stages: TemplateStage[] = data.stages.map((s: { title: string; color: string }) => ({
        nameKey: `custom.${s.title}`,
        color: s.color || '#10b981',
      }))
      const customTemplate: Omit<PipelineTemplate, 'icon'> = {
        id: `custom-${Date.now()}`,
        nameKey: `custom.${data.name}`,
        descKey: `custom.${data.description || ''}`,
        category: 'custom',
        accentColor: '#f59e0b',
        stages,
        isCustom: true,
        customName: data.name,
        customDesc: data.description || '',
      }
      const updated = [...customTemplates, customTemplate]
      setCustomTemplates(updated)
      writeCustomTemplates(updated)
      setToastMessage(t(lang, 'pipelineTemplates.importSuccess'))
    } catch {
      setToastMessage(t(lang, 'pipelineTemplates.importError'))
    }
  }

  return (
    <Card className="vl-card backdrop-blur-sm transition-all duration-200">
      <CardHeader className="pb-3" style={{ padding: '16px 24px 12px 24px' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/10 flex items-center justify-center">
              <Kanban className="size-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold vl-text-heading">{t(lang, 'pipelineTemplates.title')}</h3>
              <p className="text-xs vl-text-muted">{t(lang, 'pipeline.templates.desc')}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {currentPipeline && currentPipeline.stages.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="text-[10px] h-7 px-2 vl-text-muted"
                onClick={() => setShowSaveDialog(true)}
              >
                <Star className="size-3 mr-1" />
                {t(lang, 'pipelineTemplates.saveAsTemplate')}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="text-[10px] h-7 px-2 vl-text-muted"
              onClick={() => {
                setExportJSON('')
                setImportExportMode('import')
              }}
            >
              <Upload className="size-3 mr-1" />
              {t(lang, 'pipelineTemplates.importExport')}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent style={{ padding: '0 24px 16px 24px' }}>
        {/* Search + Category Filter */}
        <div className="space-y-3 mb-4">
          <div className="relative">
            <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 vl-text-muted" />
            <Input
              className="vl-input text-xs h-8 pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t(lang, 'pipelineTemplates.searchPlaceholder')}
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            {TEMPLATE_CATEGORIES.map(cat => (
              <button
                key={cat.key}
                className={`template-category-tab ${activeCategory === cat.key ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.key)}
              >
                {t(lang, cat.nameKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Template Grid */}
        {filteredTemplates.length === 0 ? (
          <div className="py-8 text-center">
            <Kanban className="size-8 vl-text-muted mx-auto mb-2 opacity-50" />
            <p className="text-xs vl-text-muted">{t(lang, 'pipelineTemplates.noTemplates')}</p>
          </div>
        ) : (
          <div className="template-gallery-grid stagger-children">
            {filteredTemplates.map((template) => {
              const name = template.isCustom ? (template.customName || t(lang, template.nameKey)) : t(lang, template.nameKey)
              const desc = template.isCustom ? (template.customDesc || t(lang, template.descKey)) : t(lang, template.descKey)
              const IconComp = template.icon

              return (
                <div key={template.id} className="template-card glass-panel">
                  {/* Header with icon */}
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${template.accentColor}20` }}
                    >
                      <IconComp className="size-4" style={{ color: template.accentColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-semibold vl-text-heading truncate">{name}</h4>
                        {template.isCustom && (
                          <Badge className="text-[8px] h-4 px-1 bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            {t(lang, 'pipelineTemplates.customBadge')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] vl-text-muted mt-0.5 line-clamp-2">{desc}</p>
                    </div>
                  </div>

                  {/* Stage preview pills */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {template.stages.slice(0, 4).map((stage, j) => {
                      const stageName = template.isCustom && stage.nameKey.startsWith('custom.')
                        ? stage.nameKey.replace('custom.', '')
                        : t(lang, stage.nameKey)
                      return (
                        <span
                          key={j}
                          className="template-stage-pill"
                          style={{
                            backgroundColor: `${stage.color}20`,
                            color: stage.color,
                          }}
                        >
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stage.color }} />
                          {stageName.length > 12 ? stageName.slice(0, 12) + '…' : stageName}
                        </span>
                      )
                    })}
                    {template.stages.length > 4 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full vl-text-muted bg-[var(--vl-bg-inner)]">
                        +{template.stages.length - 4}
                      </span>
                    )}
                  </div>

                  {/* Stage count + actions */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] vl-text-muted">
                      {t(lang, 'pipelineTemplates.stageCount').replace('{count}', String(template.stages.length))}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[10px] h-6 px-2 vl-text-muted hover:text-emerald-400"
                        onClick={() => setPreviewTemplate(template)}
                      >
                        <Eye className="size-3 mr-0.5" />
                        {t(lang, 'pipelineTemplates.preview')}
                      </Button>
                      {!template.isCustom && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[10px] h-6 px-2 vl-text-muted hover:text-blue-400"
                          onClick={() => handleExportTemplate(template)}
                        >
                          <Download className="size-3" />
                        </Button>
                      )}
                      {template.isCustom && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[10px] h-6 px-2 vl-text-muted hover:text-blue-400"
                            onClick={() => handleExportTemplate(template)}
                          >
                            <Download className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[10px] h-6 px-2 vl-text-muted hover:text-red-400"
                            onClick={() => handleDeleteTemplate(template)}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Use Template button */}
                  <Button
                    size="sm"
                    className="w-full text-xs h-8 mt-3"
                    style={{
                      backgroundColor: `${template.accentColor}20`,
                      color: template.accentColor,
                      border: `1px solid ${template.accentColor}40`,
                    }}
                    onClick={() => setConfirmUseTemplate(template)}
                  >
                    <Plus className="size-3 mr-1" />
                    {t(lang, 'pipelineTemplates.useTemplate')}
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewTemplate && (
          <TemplatePreviewModal
            template={previewTemplate}
            lang={lang}
            onClose={() => setPreviewTemplate(null)}
            onUse={() => handleUseTemplate(previewTemplate)}
          />
        )}
      </AnimatePresence>

      {/* Confirm Use Modal */}
      <AnimatePresence>
        {confirmUseTemplate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 dialog-overlay-blur"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={() => setConfirmUseTemplate(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="template-preview-modal p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-semibold vl-text-heading mb-2">
                {t(lang, 'pipelineTemplates.confirmUseTitle')}
              </h3>
              <p className="text-xs vl-text-muted mb-4">
                {t(lang, 'pipelineTemplates.confirmUse')}
              </p>
              <div className="flex gap-2">
                <Button
                  className="flex-1 text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => {
                    handleUseTemplate(confirmUseTemplate)
                    setConfirmUseTemplate(null)
                  }}
                >
                  <CheckCircle2 className="size-3 mr-1" />
                  {t(lang, 'common.confirm')}
                </Button>
                <Button variant="outline" className="text-xs h-9" onClick={() => setConfirmUseTemplate(null)}>
                  {t(lang, 'pipelineTemplates.cancel')}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import/Export Dialog */}
      <AnimatePresence>
        {importExportMode && (
          <ImportExportDialog
            lang={lang}
            mode={importExportMode}
            initialJSON={exportJSON}
            onClose={() => { setImportExportMode(null); setExportJSON('') }}
            onImport={handleImportTemplate}
          />
        )}
      </AnimatePresence>

      {/* Save as Template Dialog */}
      <AnimatePresence>
        {showSaveDialog && (
          <SaveAsTemplateDialog
            lang={lang}
            onClose={() => setShowSaveDialog(false)}
            onSave={handleSaveAsTemplate}
          />
        )}
      </AnimatePresence>

      {/* Toast notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 vl-card border rounded-lg px-4 py-2 shadow-lg"
            style={{ borderColor: 'var(--vl-border-accent)' }}
          >
            <span className="text-xs vl-text-heading flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-400" />
              {toastMessage}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

// ============================================================
// Swimlane Task Card (lightweight, non-draggable for swimlanes view)
// ============================================================
function SwimlaneTaskCard({
  task,
  lang,
  onClick,
  onDelete,
}: {
  task: PipelineTaskData & { stageTitle?: string; stageColor?: string }
  lang: Lang
  onClick: () => void
  onDelete: () => void
}) {
  const statusBadge = STATUS_BADGES[task.status] || STATUS_BADGES.todo
  const tags = (() => { try { return JSON.parse(task.tags) } catch { return [] } })()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div
          className="vl-inner rounded-lg p-3 cursor-pointer transition-all duration-200 hover:shadow-md group relative w-64 flex-shrink-0"
          onClick={onClick}
          aria-label={`Task: ${task.title} - ${task.status}`}
        >
          {/* Grip handle indicator */}
          <div className="absolute top-2.5 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="size-3.5 vl-text-muted opacity-60 group-hover:opacity-100 transition-opacity" />
          </div>

          <div className="flex items-start justify-between gap-1 mb-1.5 pl-4">
            <p className="text-xs font-medium vl-text-heading leading-tight flex-1">{task.title}</p>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0 vl-text-muted hover:text-red-400" onClick={(e) => { e.stopPropagation(); onDelete() }}>
                      <Trash2 className="size-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t(lang, 'common.delete')}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {task.description && (
            <p className="text-[10px] vl-text-muted line-clamp-1 mb-2 pl-4">{task.description}</p>
          )}

          <div className="flex items-center gap-2 flex-wrap pl-4">
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[task.priority] || 'bg-[var(--vl-text-muted)]'}`} />
              <span className="text-[9px] vl-text-muted">{PRIORITY_LABELS[task.priority] || task.priority}</span>
            </div>
            <Badge className={`${statusBadge.bg} ${statusBadge.text} border ${statusBadge.border} text-[9px] h-4 px-1.5`}>
              {statusBadge.label}
            </Badge>
            {task.stageTitle && (
              <Badge
                variant="outline"
                className="text-[9px] h-4 px-1.5"
                style={{ borderColor: `${task.stageColor}60`, color: task.stageColor }}
              >
                {task.stageTitle}
              </Badge>
            )}
            {task.dueDate && (
              <span className="text-[9px] vl-text-muted flex items-center gap-0.5">
                <Calendar className="size-2.5" />
                {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
          {tags.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5 flex-wrap pl-4">
              {tags.slice(0, 2).map((tag: string, i: number) => (
                <span key={i} className="text-[8px] px-1.5 py-0.5 rounded bg-[var(--vl-bg-inner)] vl-text-muted">{tag}</span>
              ))}
              {tags.length > 2 && <span className="text-[8px] vl-text-muted">+{tags.length - 2}</span>}
            </div>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4 vl-dialog" side="bottom" align="start">
        <TaskDetailPopover
          task={task}
          agents={[]}
          lang={lang}
          onUpdate={() => {}}
        />
      </PopoverContent>
    </Popover>
  )
}

// ============================================================
// Pipeline Analytics Component (Enhanced — SVG-based)
// ============================================================
function PipelineAnalytics({
  pipeline,
  pipelines,
  lang,
}: {
  pipeline: PipelineData
  pipelines: PipelineData[]
  lang: Lang
}) {
  // ============================================================
  // Computed analytics data
  // ============================================================

  // -- Stage-level metrics for the selected pipeline --
  const stageMetrics = useMemo(() => {
    return pipeline.stages.map((stage, idx) => {
      const total = stage.tasks.length
      const done = stage.tasks.filter(t => t.status === 'done').length
      const inProgress = stage.tasks.filter(t => t.status === 'in_progress').length
      const blocked = stage.tasks.filter(t => t.status === 'todo' && t.priority === 'high').length
      const completionPct = total > 0 ? Math.round((done / total) * 100) : 0
      // Synthetic duration: use task count as proxy for complexity (hours)
      const durationHours = total * 2 + (inProgress > 0 ? 4 : 0)
      // Dependencies: previous stage
      const depCount = idx > 0 ? 1 : 0
      // Determine stage status
      let status: 'completed' | 'in_progress' | 'blocked' | 'pending' = 'pending'
      if (total > 0 && done === total) status = 'completed'
      else if (inProgress > 0) status = 'in_progress'
      else if (blocked > 0 && done === 0) status = 'blocked'
      // Health: based on completion and blocked ratio
      let health = 100
      if (blocked > 0) health = 25
      else if (completionPct >= 80) health = 95
      else if (completionPct >= 50) health = 70
      else if (completionPct >= 25) health = 45
      else if (total > 0) health = 30

      return {
        id: stage.id,
        title: stage.title,
        color: stage.color,
        status,
        duration: durationHours,
        dependencies: depCount,
        tasksCount: total,
        completionPct,
        health,
        order: idx,
      }
    })
  }, [pipeline])

  // -- Overall Health Score --
  const healthScore = useMemo(() => {
    if (stageMetrics.length === 0) return 0
    const avgCompletion = stageMetrics.reduce((s, m) => s + m.completionPct, 0) / stageMetrics.length
    const avgHealth = stageMetrics.reduce((s, m) => s + m.health, 0) / stageMetrics.length
    const blockedCount = stageMetrics.filter(m => m.status === 'blocked').length
    const blockedPenalty = blockedCount > 0 ? Math.min(blockedCount * 10, 30) : 0
    return Math.max(0, Math.min(100, Math.round((avgCompletion * 0.4 + avgHealth * 0.4 + (100 - blockedPenalty) * 0.2))))
  }, [stageMetrics])

  // -- Sub-scores --
  const completionRate = useMemo(() => {
    if (stageMetrics.length === 0) return 0
    const completed = stageMetrics.filter(m => m.status === 'completed').length
    return Math.round((completed / stageMetrics.length) * 100)
  }, [stageMetrics])

  const velocity = useMemo(() => {
    // Simulate: stages completed per week (use pipeline creation date if available)
    const completed = stageMetrics.filter(m => m.status === 'completed').length
    return (completed * 1.5).toFixed(1) // simulated stages/week
  }, [stageMetrics])

  const bottleneckScore = useMemo(() => {
    if (stageMetrics.length === 0) return 0
    const avgDuration = stageMetrics.reduce((s, m) => s + m.duration, 0) / stageMetrics.length
    if (avgDuration === 0) return 0
    const maxDuration = Math.max(...stageMetrics.map(m => m.duration))
    // Inverted: higher score means worse bottleneck
    return Math.round((maxDuration / avgDuration) * 25)
  }, [stageMetrics])

  const efficiency = useMemo(() => {
    if (stageMetrics.length === 0) return 0
    const activeOrCompleted = stageMetrics.filter(m => m.status === 'completed' || m.status === 'in_progress').length
    return Math.round((activeOrCompleted / stageMetrics.length) * 100)
  }, [stageMetrics])

  // -- Pipeline-level stats --
  const pipelineStats = useMemo(() => {
    const allStages = pipelines.flatMap(p => p.stages)
    const totalPipelines = pipelines.length
    const activeStages = allStages.filter(s => {
      const hasActive = s.tasks.some(t => t.status === 'in_progress')
      return hasActive
    }).length
    const completedStages = allStages.filter(s => s.tasks.length > 0 && s.tasks.every(t => t.status === 'done')).length
    const blockedStages = allStages.filter(s => {
      const hasHighTodo = s.tasks.some(t => t.status === 'todo' && t.priority === 'high')
      return hasHighTodo
    }).length
    return { totalPipelines, activeStages, completedStages, blockedStages }
  }, [pipelines])

  // -- Overall progress (for ring) --
  const overallProgress = useMemo(() => {
    if (stageMetrics.length === 0) return 0
    return Math.round(stageMetrics.reduce((s, m) => s + m.completionPct, 0) / stageMetrics.length)
  }, [stageMetrics])

  // -- Bottleneck detection (stage > 2x avg duration) --
  const bottleneckAlert = useMemo(() => {
    if (stageMetrics.length < 2) return null
    const avgDuration = stageMetrics.reduce((s, m) => s + m.duration, 0) / stageMetrics.length
    if (avgDuration === 0) return null
    const worst = stageMetrics.reduce((prev, curr) => curr.duration > prev.duration ? curr : prev, stageMetrics[0])
    if (worst.duration > avgDuration * 2) {
      return worst
    }
    return null
  }, [stageMetrics])

  // -- Sortable table state --
  const [sortColumn, setSortColumn] = useState<'title' | 'status' | 'duration' | 'health' | 'completionPct'>('title')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const tableRef = useRef<HTMLDivElement>(null)

  const handleSort = useCallback((col: typeof sortColumn) => {
    if (sortColumn === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(col)
      setSortDir('asc')
    }
  }, [sortColumn])

  const sortedStages = useMemo(() => {
    return [...stageMetrics].sort((a, b) => {
      const aVal = a[sortColumn]
      const bVal = b[sortColumn]
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal
      }
      return sortDir === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal))
    })
  }, [stageMetrics, sortColumn, sortDir])

  // -- Milestones --
  const milestones = useMemo(() => {
    const ms: { label: string; position: number }[] = []
    ms.push({ label: t(lang, 'pipelineAnalytics.pipelineCreated'), position: 0 })
    if (completionRate >= 50) ms.push({ label: t(lang, 'pipelineAnalytics.halfComplete'), position: 0.5 })
    if (efficiency >= 100) ms.push({ label: t(lang, 'pipelineAnalytics.allStarted'), position: 0.3 })
    if (completionRate >= 100) ms.push({ label: t(lang, 'pipelineAnalytics.pipelineComplete'), position: 1 })
    return ms
  }, [completionRate, efficiency, lang])

  // -- Bottleneck history (synthetic) --
  const bottleneckHistory = useMemo(() => {
    return [
      { stage: 'Implementation', duration: '8h', resolved: '2d ago' },
      { stage: 'Testing', duration: '6h', resolved: '5d ago' },
    ]
  }, [])

  // -- Health color helpers --
  const getHealthColor = (score: number) => {
    if (score >= 80) return '#10b981'
    if (score >= 50) return '#f59e0b'
    return '#ef4444'
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; border: string; label: string }> = {
      completed: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', label: t(lang, 'pipelineAnalytics.completed') },
      in_progress: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', label: t(lang, 'pipelineAnalytics.inProgress') },
      blocked: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', label: t(lang, 'pipelineAnalytics.blocked') },
      pending: { bg: 'bg-[var(--vl-bg-inner)]', text: 'text-[var(--vl-text-muted)]', border: 'border-[var(--vl-border-subtle)]', label: t(lang, 'pipelineAnalytics.pending') },
    }
    return map[status] || map.pending
  }

  const SortIcon = ({ col }: { col: typeof sortColumn }) => {
    if (sortColumn !== col) return <ChevronRight className="size-3 opacity-0 group-hover:opacity-30" />
    return <ChevronRight className={`size-3 vl-text-heading transition-transform ${sortDir === 'desc' ? '-rotate-90' : 'rotate-90'}`} />
  }

  // ============================================================
  // Render
  // ============================================================
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="pipeline-analytics-panel space-y-6"
    >
      {/* ---- Analytics Header ---- */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 flex items-center justify-center">
          <BarChart3 className="size-5 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold vl-text-heading">{t(lang, 'pipelineAnalytics.title')}</h3>
          <p className="text-xs vl-text-muted">{pipeline.name}</p>
        </div>
      </div>

      {/* ---- 1. Pipeline Statistics Summary (4 stat cards + progress ring) ---- */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Stat Cards */}
        {[
          { label: t(lang, 'pipelineAnalytics.totalPipelines'), value: pipelineStats.totalPipelines, icon: Kanban, color: '#10b981' },
          { label: t(lang, 'pipelineAnalytics.activeStages'), value: pipelineStats.activeStages, icon: Loader2, color: '#f59e0b' },
          { label: t(lang, 'pipelineAnalytics.completedStages'), value: pipelineStats.completedStages, icon: CheckCircle2, color: '#06b6d4' },
          { label: t(lang, 'pipelineAnalytics.blockedStages'), value: pipelineStats.blockedStages, icon: AlertTriangle, color: pipelineStats.blockedStages > 0 ? '#ef4444' : '#6b7280' },
        ].map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + idx * 0.05 }}
            className="stat-card-pipeline vl-card rounded-xl p-4 border"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${stat.color}15` }}>
                <stat.icon className="size-3.5" style={{ color: stat.color }} />
              </div>
              <span className="text-[10px] vl-text-muted truncate">{stat.label}</span>
            </div>
            <motion.p
              className="text-xl font-bold vl-text-heading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 + idx * 0.05 }}
              style={{ color: stat.color }}
            >
              {stat.value}
            </motion.p>
          </motion.div>
        ))}

        {/* Progress Ring */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="stat-card-pipeline vl-card rounded-xl p-4 border col-span-2 md:col-span-1 flex flex-col items-center justify-center"
        >
          <span className="text-[10px] vl-text-muted mb-1">{t(lang, 'pipelineAnalytics.overallProgress')}</span>
          <div className="progress-ring" style={{ width: 80, height: 80 }}>
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="var(--vl-bg-inner)" strokeWidth="6" />
              <circle
                className="progress-ring-fill"
                cx="40" cy="40" r="34" fill="none"
                stroke={getHealthColor(overallProgress)}
                strokeWidth="6" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 34}`}
                strokeDashoffset={`${2 * Math.PI * 34 * (1 - overallProgress / 100)}`}
              />
            </svg>
            <span className="absolute text-sm font-bold vl-text-heading">{overallProgress}%</span>
          </div>
        </motion.div>
      </div>

      {/* ---- 2. Bottleneck Alert ---- */}
      <AnimatePresence>
        {bottleneckAlert && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bottleneck-alert bg-red-500/10 border border-red-500/30 rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="size-4 text-red-400" />
              <span className="text-xs font-semibold text-red-400">{t(lang, 'pipelineAnalytics.bottleneckDetected')}</span>
            </div>
            <p className="text-xs vl-text-heading">
              <strong>{bottleneckAlert.title}</strong> {t(lang, 'pipelineAnalytics.bottleneckDesc')}
            </p>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-[10px] vl-text-muted">
                {t(lang, 'pipelineAnalytics.duration')}: <span className="text-red-400 font-semibold">{bottleneckAlert.duration}h</span>
              </span>
              <span className="text-[10px] vl-text-muted">
                {t(lang, 'pipelineAnalytics.health')}: <span className="font-semibold" style={{ color: getHealthColor(bottleneckAlert.health) }}>{bottleneckAlert.health}%</span>
              </span>
            </div>
            <Button
              size="sm"
              className="mt-3 text-[10px] h-7 bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
              onClick={() => {
                tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
            >
              {t(lang, 'pipelineAnalytics.viewDetails')}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- 3. Health Score Gauge + Sub-scores ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="vl-card">
          <CardHeader className="pb-3" style={{ padding: '16px 20px 12px 20px' }}>
            <h4 className="text-sm font-semibold vl-text-heading flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-400" />
              {t(lang, 'pipelineAnalytics.healthScore')}
            </h4>
          </CardHeader>
          <CardContent className="flex flex-col items-center" style={{ padding: '0 20px 20px' }}>
            {/* Semi-circle gauge */}
            <div className="health-gauge" style={{ width: 200, height: 110 }}>
              <svg width="200" height="110" viewBox="0 0 200 110">
                {/* Background arc */}
                <path
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none" stroke="var(--vl-bg-inner)" strokeWidth="16" strokeLinecap="round"
                />
                {/* Filled arc */}
                <motion.path
                  className="health-gauge-fill"
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke={getHealthColor(healthScore)}
                  strokeWidth="16" strokeLinecap="round"
                  strokeDasharray={`${Math.PI * 80}`}
                  initial={{ strokeDashoffset: Math.PI * 80 }}
                  animate={{ strokeDashoffset: Math.PI * 80 * (1 - healthScore / 100) }}
                  transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                />
              </svg>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <motion.span
                  className="text-2xl font-bold"
                  style={{ color: getHealthColor(healthScore) }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  {healthScore}
                </motion.span>
                <span className="text-[9px] vl-text-muted">/ 100</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Health Breakdown: 4 mini cards */}
        <Card className="vl-card">
          <CardHeader className="pb-3" style={{ padding: '16px 20px 12px 20px' }}>
            <h4 className="text-sm font-semibold vl-text-heading">{t(lang, 'pipelineAnalytics.healthScore')} Breakdown</h4>
          </CardHeader>
          <CardContent style={{ padding: '0 20px 20px 20px' }}>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: t(lang, 'pipelineAnalytics.completionRate'), value: `${completionRate}%`, color: getHealthColor(completionRate) },
                { label: t(lang, 'pipelineAnalytics.velocity'), value: `${velocity} ${t(lang, 'pipelineAnalytics.perWeek')}`, color: '#06b6d4' },
                { label: t(lang, 'pipelineAnalytics.bottleneckScore'), value: `${bottleneckScore}/100`, color: getHealthColor(100 - bottleneckScore), sub: t(lang, 'pipelineAnalytics.lowerBetter') },
                { label: t(lang, 'pipelineAnalytics.efficiency'), value: `${efficiency}%`, color: getHealthColor(efficiency) },
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + idx * 0.08 }}
                  className="vl-inner rounded-lg p-3"
                >
                  <p className="text-[10px] vl-text-muted mb-1">{item.label}</p>
                  <p className="text-base font-bold vl-text-heading" style={{ color: item.color }}>{item.value}</p>
                  {item.sub && <p className="text-[9px] vl-text-muted mt-0.5">{item.sub}</p>}
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ---- 4. Stage Performance Table ---- */}
      <Card className="vl-card" ref={tableRef}>
        <CardHeader className="pb-3" style={{ padding: '16px 20px 12px 20px' }}>
          <h4 className="text-sm font-semibold vl-text-heading flex items-center gap-2">
            <Target className="size-4 text-emerald-400" />
            {t(lang, 'pipelineAnalytics.stagePerformance')}
          </h4>
        </CardHeader>
        <CardContent style={{ padding: '0 0 0 0' }}>
          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            <table className="stage-table text-xs">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--vl-border)' }}>
                  {[
                    { col: 'title' as const, label: t(lang, 'pipelineAnalytics.stageName') },
                    { col: 'status' as const, label: t(lang, 'pipelineAnalytics.status') },
                    { col: 'duration' as const, label: t(lang, 'pipelineAnalytics.duration') },
                    { col: 'completionPct' as const, label: t(lang, 'pipelineAnalytics.progress') },
                    { col: 'health' as const, label: t(lang, 'pipelineAnalytics.health') },
                  ].map(h => (
                    <th
                      key={h.col}
                      className="stage-table-header group px-4 py-2.5 text-left vl-text-muted font-medium text-[10px] uppercase tracking-wider"
                      onClick={() => handleSort(h.col)}
                    >
                      <div className="flex items-center gap-1">
                        {h.label}
                        <SortIcon col={h.col} />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedStages.map((stage, idx) => {
                  const badge = getStatusBadge(stage.status)
                  return (
                    <tr key={stage.id} className="stage-row border-b" style={{ borderColor: 'var(--vl-border-subtle)' }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                          <span className="vl-text-heading font-medium text-xs">{stage.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`${badge.bg} ${badge.text} border ${badge.border} text-[9px] h-5 px-1.5`}>
                          {badge.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 vl-text-muted">{stage.duration}h</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 health-mini-bar bg-[var(--vl-bg-inner)] rounded-full overflow-hidden">
                            <div className="health-mini-bar-fill h-full rounded-full" style={{ width: `${stage.completionPct}%`, backgroundColor: getHealthColor(stage.completionPct) }} />
                          </div>
                          <span className="text-[10px] vl-text-muted">{stage.completionPct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <svg width="60" height="20" className="health-mini-bar">
                            <rect x="0" y="0" width="60" height="20" rx="10" fill="var(--vl-bg-inner)" />
                            <motion.rect
                              x="0" y="0" height="20" rx="10"
                              fill={getHealthColor(stage.health)}
                              initial={{ width: 0 }}
                              animate={{ width: Math.max(4, stage.health * 0.6) }}
                              transition={{ duration: 0.6, delay: idx * 0.05 }}
                            />
                          </svg>
                          <span className="text-[10px] font-medium" style={{ color: getHealthColor(stage.health) }}>{stage.health}</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {sortedStages.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-xs vl-text-muted">{t(lang, 'pipelineAnalytics.noStages')}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ---- 5. Pipeline Timeline Visualization ---- */}
      <Card className="vl-card">
        <CardHeader className="pb-3" style={{ padding: '16px 20px 12px 20px' }}>
          <h4 className="text-sm font-semibold vl-text-heading flex items-center gap-2">
            <Clock className="size-4 text-emerald-400" />
            {t(lang, 'pipelineAnalytics.timeline')}
          </h4>
        </CardHeader>
        <CardContent style={{ padding: '0 20px 20px 20px' }}>
          <div className="pipeline-timeline">
            <div className="flex items-end gap-1 min-w-max pb-8 pt-2" style={{ minHeight: 120 }}>
              {stageMetrics.map((stage, idx) => {
                const blockWidth = Math.max(80, stage.duration * 12)
                const isCurrent = stage.status === 'in_progress'
                const isCompleted = stage.status === 'completed'
                return (
                  <React.Fragment key={stage.id}>
                    {/* Connecting arrow */}
                    {idx > 0 && (
                      <div className="flex items-center shrink-0" style={{ height: 60 }}>
                        <svg width="24" height="24" viewBox="0 0 24 24">
                          <path d="M 4 12 L 18 12" stroke="var(--vl-border)" strokeWidth="1.5" fill="none" />
                          <path d="M 14 8 L 18 12 L 14 16" stroke="var(--vl-border)" strokeWidth="1.5" fill="none" />
                        </svg>
                      </div>
                    )}
                    <motion.div
                      className="timeline-stage-block relative rounded-lg px-3 py-2 flex flex-col items-center justify-center text-center"
                      style={{
                        width: blockWidth,
                        height: 60,
                        backgroundColor: isCompleted ? `${stage.color}20` : isCurrent ? `${stage.color}15` : 'var(--vl-bg-inner)',
                        border: `2px solid ${isCompleted ? stage.color : isCurrent ? stage.color : 'var(--vl-border-subtle)'}`,
                        animation: isCurrent ? 'bottleneck-pulse 2s ease-in-out infinite' : undefined,
                      }}
                      initial={{ opacity: 0, scaleX: 0 }}
                      animate={{ opacity: 1, scaleX: 1 }}
                      transition={{ delay: idx * 0.08, duration: 0.4 }}
                    >
                      <span className="text-[10px] font-medium vl-text-heading truncate max-w-full">{stage.title}</span>
                      <span className="text-[9px] vl-text-muted mt-0.5">{stage.duration}h</span>
                      {/* Checkmark for completed */}
                      {isCompleted && (
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                          <CheckCircle2 className="size-3 text-white" />
                        </div>
                      )}
                    </motion.div>
                  </React.Fragment>
                )
              })}
              {/* Milestone markers */}
              {milestones.map((ms, idx) => (
                <div key={idx} className="timeline-milestone absolute bottom-0 flex flex-col items-center" style={{ left: `${(ms.position * 100 + 5)}%` }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" style={{ transform: 'rotate(45deg)' }}>
                    <rect x="1" y="1" width="10" height="10" rx="2" fill="#f59e0b" opacity="0.8" />
                  </svg>
                  <span className="text-[8px] vl-text-muted mt-1 whitespace-nowrap">{ms.label}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ---- 6. Pipeline Flow Diagram ---- */}
      <Card className="vl-card">
        <CardHeader className="pb-3" style={{ padding: '16px 20px 12px 20px' }}>
          <h4 className="text-sm font-semibold vl-text-heading flex items-center gap-2">
            <Dna className="size-4 text-emerald-400" />
            {t(lang, 'pipelineAnalytics.flowDiagram')}
          </h4>
        </CardHeader>
        <CardContent style={{ padding: '0 20px 20px 20px' }}>
          <div className="pipeline-flow-diagram">
            <svg width="100%" height="200" viewBox="0 0 800 200" className="min-w-[600px]">
              <defs>
                <marker id="flow-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--vl-text-muted)" />
                </marker>
              </defs>
              {stageMetrics.map((stage, idx) => {
                const nodeW = Math.max(100, 80 + stage.tasksCount * 10)
                const nodeH = 44
                const gapX = 140
                const x = 40 + idx * gapX
                const y = 100 - nodeH / 2
                const fillColor = stage.status === 'completed' ? `${stage.color}20`
                  : stage.status === 'in_progress' ? `${stage.color}15`
                  : stage.status === 'blocked' ? 'rgba(239,68,68,0.1)'
                  : 'var(--vl-bg-inner)'
                const strokeColor = stage.status === 'completed' ? stage.color
                  : stage.status === 'in_progress' ? stage.color
                  : stage.status === 'blocked' ? '#ef4444'
                  : 'var(--vl-border-subtle)'

                return (
                  <g key={stage.id}>
                    {/* Edge to next node */}
                    {idx < stageMetrics.length - 1 && (
                      <motion.path
                        className="flow-edge"
                        d={`M ${x + nodeW} ${y + nodeH / 2} C ${x + nodeW + 30} ${y + nodeH / 2}, ${x + gapX - 10} ${y + nodeH / 2}, ${x + gapX} ${y + nodeH / 2}`}
                        fill="none"
                        stroke="var(--vl-border)"
                        strokeWidth="1.5"
                        strokeDasharray={stage.status === 'in_progress' ? '6 3' : undefined}
                        markerEnd="url(#flow-arrow)"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.6 }}
                        transition={{ delay: idx * 0.1 }}
                        style={stage.status === 'in_progress' ? { animation: 'flow-edge-dash 1s linear infinite' } : undefined}
                      />
                    )}
                    {/* Node */}
                    <motion.g
                      className="flow-node"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <rect
                        x={x} y={y}
                        width={nodeW} height={nodeH}
                        rx="10" ry="10"
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth="2"
                      />
                      <text x={x + nodeW / 2} y={y + nodeH / 2 + 1} textAnchor="middle" dominantBaseline="middle" fill="var(--vl-text-heading)" fontSize="11" fontWeight="500">
                        {stage.title}
                      </text>
                      {/* Task count badge */}
                      <circle cx={x + nodeW - 8} cy={y + 8} r="8" fill={fillColor} stroke={strokeColor} strokeWidth="1" />
                      <text x={x + nodeW - 8} y={y + 9} textAnchor="middle" dominantBaseline="middle" fill="var(--vl-text-muted)" fontSize="8">
                        {stage.tasksCount}
                      </text>
                    </motion.g>
                  </g>
                )
              })}
            </svg>
          </div>
        </CardContent>
      </Card>

      {/* ---- 7. Bottleneck History ---- */}
      <Card className="vl-card">
        <CardHeader className="pb-3" style={{ padding: '16px 20px 12px 20px' }}>
          <h4 className="text-sm font-semibold vl-text-heading flex items-center gap-2">
            <AlertTriangle className="size-4 text-rose-400" />
            {t(lang, 'pipelineAnalytics.bottleneckHistory')}
          </h4>
        </CardHeader>
        <CardContent style={{ padding: '0 20px 20px 20px' }}>
          {bottleneckHistory.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-xs vl-text-muted">{t(lang, 'pipelineAnalytics.noBottleneckHistory')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {bottleneckHistory.map((bn, idx) => (
                <div key={idx} className="vl-inner rounded-lg px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-xs vl-text-heading">{bn.stage}</span>
                    <span className="text-[10px] text-amber-400 font-medium">{bn.duration}</span>
                  </div>
                  <span className="text-[10px] vl-text-muted flex items-center gap-1">
                    <CheckCircle2 className="size-2.5 text-emerald-400" />
                    {t(lang, 'pipelineAnalytics.resolutionTime')} {bn.resolved}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ============================================================
// SVG Donut Chart Sub-component
// ============================================================
function DonutChart({
  data,
  total,
  size,
  strokeWidth,
}: {
  data: { value: number; color: string; label: string }[]
  total: number
  size: number
  strokeWidth: number
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number; text: string } | null>(null)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const center = size / 2

  const arcs = useMemo(() => {
    return data.map((d, i) => {
      const pct = total > 0 ? d.value / total : 0
      const angle = pct * 360
      const previousAngle = data.slice(0, i).reduce((sum, prev) => sum + (total > 0 ? (prev.value / total) * 360 : 0), 0)
      return { ...d, pct, angle, startAngle: previousAngle, index: i }
    })
  }, [data, total])

  const handleSegmentHover = (arc: typeof arcs[0], e: React.MouseEvent<SVGCircleElement>) => {
    setHoveredIndex(arc.index)
    const rect = e.currentTarget.closest('svg')?.getBoundingClientRect()
    if (rect) {
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top - 8,
        text: `${arc.label}: ${arc.value} (${Math.round(arc.pct * 100)}%)`,
      })
    }
  }

  const handleSegmentLeave = () => {
    setHoveredIndex(null)
    setTooltipPos(null)
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--vl-bg-inner)"
          strokeWidth={strokeWidth}
        />
        {/* Segments */}
        {arcs.map((arc) => {
          const startRad = ((arc.startAngle - 90) * Math.PI) / 180
          const endRad = ((arc.startAngle + arc.angle - 90) * Math.PI) / 180
          const x1 = center + radius * Math.cos(startRad)
          const y1 = center + radius * Math.sin(startRad)
          const x2 = center + radius * Math.cos(endRad)
          const y2 = center + radius * Math.sin(endRad)
          const largeArcFlag = arc.angle > 180 ? 1 : 0
          const isHovered = hoveredIndex === arc.index
          const extraR = isHovered ? 4 : 0

          // Use arc path for more precise rendering
          const arcRadius = radius + extraR
          const sx = center + arcRadius * Math.cos(startRad)
          const sy = center + arcRadius * Math.sin(startRad)
          const ex = center + arcRadius * Math.cos(endRad)
          const ey = center + arcRadius * Math.sin(endRad)
          const d = `M ${sx} ${sy} A ${arcRadius} ${arcRadius} 0 ${largeArcFlag} 1 ${ex} ${ey}`

          return (
            <g key={arc.label}>
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="transparent"
                strokeWidth={strokeWidth}
                strokeDasharray={`${(arc.pct * circumference)} ${circumference}`}
                strokeDashoffset={`${-((arc.startAngle / 360) * circumference)}`}
                className="cursor-pointer"
                onMouseEnter={(e) => handleSegmentHover(arc, e)}
                onMouseLeave={handleSegmentLeave}
              />
              <path
                d={d}
                fill="none"
                stroke={arc.color}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeLinecap="round"
                opacity={isHovered ? 1 : 0.85}
                className="pointer-events-none transition-all duration-150"
                filter={isHovered ? 'drop-shadow(0 0 4px ' + arc.color + '60)' : undefined}
              />
            </g>
          )
        })}
        {/* Center text */}
        <text
          x={center}
          y={center - 6}
          textAnchor="middle"
          className="vl-text-heading"
          fontSize="20"
          fontWeight="bold"
          fill="currentColor"
        >
          {total}
        </text>
      </svg>
      {/* Tooltip */}
      {tooltipPos && hoveredIndex !== null && (
        <div
          className="absolute pointer-events-none vl-card border rounded-lg px-2.5 py-1.5 shadow-lg text-xs vl-text-heading"
          style={{
            left: tooltipPos.x - 30,
            top: tooltipPos.y - 36,
            zIndex: 10,
          }}
        >
          {tooltipPos.text}
        </div>
      )}
      {/* Center overlay text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-xl font-bold vl-text-heading">{total}</span>
        <span className="text-[10px] vl-text-muted">tasks</span>
      </div>
    </div>
  )
}

// ============================================================
// Main Pipeline Tab Component
// ============================================================
export function PipelineTab(props: PipelineTabProps) {
  const {
    agents, pipelines, selectedPipelineId, selectedPipeline, loading, lang,
    setSelectedPipelineId, setNewPipelineDialogOpen,
    setAddStageDialogOpen, setAddTaskDialogOpen, setAddTaskStageId,
    setEditingTaskId, setEditTaskDialogOpen,
    handleDeletePipeline, handleDeleteStage, handleDeleteTask, handleUpdateTask,
    handleMoveTask, handleCreatePipelineFromTemplate,
  } = props

  // DnD state
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeTask, setActiveTask] = useState<PipelineTaskData | null>(null)
  const [activeStage, setActiveStage] = useState<PipelineStageData | null>(null)
  const [dropTargetStageId, setDropTargetStageId] = useState<string | null>(null)

  // Dependency graph state
  const [hoveredCurve, setHoveredCurve] = useState<string | null>(null)
  const [selectedCurve, setSelectedCurve] = useState<string | null>(null)
  const [highlightedTaskIds, setHighlightedTaskIds] = useState<Set<string>>(new Set())

  // Pipeline working copy for DnD (optimistic updates)
  const [localPipeline, setLocalPipeline] = useState<PipelineData | null>(null)
  const [syncedId, setSyncedId] = useState<string | null>(null)

  // Sync local pipeline when selectedPipeline changes
  if (selectedPipeline?.id !== syncedId && !activeId) {
    setLocalPipeline(selectedPipeline)
    setSyncedId(selectedPipeline?.id || null)
  }

  const workingPipeline = activeId ? localPipeline : selectedPipeline

  // Scroll reveal observer
  const { observe: observeScrollReveal, disconnect: disconnectScrollReveal } = useScrollReveal()
  useEffect(() => {
    const timer = setTimeout(observeScrollReveal, 100)
    return () => {
      clearTimeout(timer)
      disconnectScrollReveal()
    }
  }, [observeScrollReveal, disconnectScrollReveal])

  // Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  )

  // Compute critical path
  const criticalPathTasks = useMemo(() => {
    const cp = new Set<string>()
    if (!workingPipeline || workingPipeline.stages.length < 2) return cp
    // Simple critical path: longest chain from first to last stage
    for (let i = 0; i < workingPipeline.stages.length - 1; i++) {
      const stage = workingPipeline.stages[i]
      const nextStage = workingPipeline.stages[i + 1]
      if (stage.tasks.length > 0 && nextStage.tasks.length > 0) {
        cp.add(stage.tasks[0].id)
        cp.add(nextStage.tasks[0].id)
      }
    }
    return cp
  }, [workingPipeline])

  // Handle DnD start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    setActiveId(active.id as string)
    // Find the task
    if (workingPipeline) {
      for (const stage of workingPipeline.stages) {
        const task = stage.tasks.find(t => t.id === active.id)
        if (task) {
          setActiveTask(task)
          setActiveStage(stage)
          break
        }
      }
    }
  }, [workingPipeline])

  // Handle DnD over
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event
    if (!over || !workingPipeline) return

    // Check if hovering over a stage droppable
    const overId = over.id as string
    if (overId.startsWith('stage-')) {
      const stageId = overId.replace('stage-', '')
      setDropTargetStageId(stageId)
    } else {
      // Check if over a task, determine its stage
      for (const stage of workingPipeline.stages) {
        if (stage.tasks.some(t => t.id === overId)) {
          setDropTargetStageId(stage.id)
          break
        }
      }
    }
  }, [workingPipeline])

  // Handle DnD end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setActiveTask(null)
    setActiveStage(null)
    setDropTargetStageId(null)

    if (!over || !active || !workingPipeline || !activeTask || !activeStage) return

    const overId = over.id as string
    let targetStageId: string | null = null
    let targetOrder: number = 0

    // Determine target stage
    if (overId.startsWith('stage-')) {
      targetStageId = overId.replace('stage-', '')
      targetOrder = 0
    } else {
      // Find which stage the target task belongs to
      for (const stage of workingPipeline.stages) {
        const overTask = stage.tasks.find(t => t.id === overId)
        if (overTask) {
          targetStageId = stage.id
          targetOrder = overTask.order
          break
        }
      }
    }

    if (!targetStageId || targetStageId === activeStage.id) return

    // Optimistic local update
    if (localPipeline) {
      const updatedStages = localPipeline.stages.map(s => {
        if (s.id === activeStage.id) {
          return { ...s, tasks: s.tasks.filter(t => t.id !== active.id) }
        }
        if (s.id === targetStageId) {
          const newTasks = [...s.tasks, { ...activeTask, stageId: targetStageId, order: targetOrder }]
          return { ...s, tasks: newTasks }
        }
        return s
      })
      setLocalPipeline({ ...localPipeline, stages: updatedStages })
    }

    // Server update
    if (handleMoveTask) {
      handleMoveTask(String(active.id), activeStage.id, targetStageId, targetOrder)
    } else {
      // Fallback: use handleUpdateTask with stageId change
      handleUpdateTask(String(active.id), activeStage.id, { stageId: targetStageId, order: targetOrder })
    }
  }, [activeTask, activeStage, workingPipeline, localPipeline, handleMoveTask, handleUpdateTask])

  // Handle dependency curve click - highlight connected tasks
  const handleCurveClick = useCallback((curveId: string) => {
    if (selectedCurve === curveId) {
      setSelectedCurve(null)
      setHighlightedTaskIds(new Set())
    } else {
      setSelectedCurve(curveId)
      const [fromId, toId] = curveId.split('->')
      setHighlightedTaskIds(new Set([fromId, toId]))
      // Auto-clear after 3 seconds
      setTimeout(() => {
        setSelectedCurve(null)
        setHighlightedTaskIds(new Set())
      }, 3000)
    }
  }, [selectedCurve])

  // View mode: 'board' | 'swimlanes' | 'analytics' | '3d'
  const [viewMode, setViewMode] = useState<'board' | 'swimlanes' | 'analytics' | '3d'>('board')

  // Mini-map state
  const [minimapVisible, setMinimapVisible] = useState(false)
  const boardContainerRef = useRef<HTMLDivElement>(null)

  // Multi-select state
  const [multiSelectMode, setMultiSelectMode] = useState(false)
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())

  // Active stage index for quick-jump pills
  const [activeStageIndex, setActiveStageIndex] = useState(0)

  // Scroll tracking for active stage
  useEffect(() => {
    if (viewMode !== 'board') return
    const el = boardContainerRef.current
    if (!el || !workingPipeline) return
    const columns = el.querySelectorAll('[data-stage-id]')
    if (columns.length === 0) return

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
          const idx = Array.from(columns).indexOf(entry.target as Element)
          if (idx >= 0) setActiveStageIndex(idx)
        }
      }
    }, { threshold: 0.5, root: el })
    columns.forEach(col => observer.observe(col))
    return () => observer.disconnect()
  }, [viewMode, workingPipeline])

  // Jump to stage column
  const handleJumpToStage = useCallback((index: number) => {
    if (!workingPipeline) return
    const el = boardContainerRef.current
    if (!el) return
    const columns = el.querySelectorAll('[data-stage-id]')
    if (columns[index]) {
      columns[index].scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
      setActiveStageIndex(index)
    }
  }, [workingPipeline])

  // Toggle task selection
  const toggleTaskSelection = useCallback((taskId: string) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }, [])

  // Bulk mark complete
  const handleBulkMarkComplete = useCallback(() => {
    if (!workingPipeline) return
    selectedTaskIds.forEach(taskId => {
      for (const stage of workingPipeline.stages) {
        const task = stage.tasks.find(t => t.id === taskId)
        if (task && task.status !== 'done') {
          handleUpdateTask(taskId, stage.id, { status: 'done' })
        }
      }
    })
    setSelectedTaskIds(new Set())
    setMultiSelectMode(false)
  }, [workingPipeline, selectedTaskIds, handleUpdateTask])

  // Bulk delete
  const handleBulkDelete = useCallback(() => {
    if (!workingPipeline) return
    selectedTaskIds.forEach(taskId => {
      for (const stage of workingPipeline.stages) {
        if (stage.tasks.some(t => t.id === taskId)) {
          handleDeleteTask(taskId, stage.id)
        }
      }
    })
    setSelectedTaskIds(new Set())
    setMultiSelectMode(false)
  }, [workingPipeline, selectedTaskIds, handleDeleteTask])

  // Bulk priority change
  const [bulkPriorityTarget, setBulkPriorityTarget] = useState<string | null>(null)
  const handleBulkChangePriority = useCallback((priority: string) => {
    if (!workingPipeline) return
    selectedTaskIds.forEach(taskId => {
      for (const stage of workingPipeline.stages) {
        const task = stage.tasks.find(t => t.id === taskId)
        if (task) {
          handleUpdateTask(taskId, stage.id, { priority })
        }
      }
    })
    setSelectedTaskIds(new Set())
    setMultiSelectMode(false)
    setBulkPriorityTarget(null)
  }, [workingPipeline, selectedTaskIds, handleUpdateTask])

  // Swimlane data: group tasks by assignee
  const swimlaneData = useMemo(() => {
    if (!workingPipeline) return { lanes: [] as { agent: Agent | null; tasks: PipelineTaskData[] }[] }
    const allTasks = workingPipeline.stages.flatMap(s => s.tasks.map(t => ({ ...t, stageTitle: s.title, stageColor: s.color })))
    const lanes: { agent: Agent | null; tasks: (PipelineTaskData & { stageTitle: string; stageColor: string })[] }[] = []
    // Group by assigneeId
    const grouped = new Map<string | null, (PipelineTaskData & { stageTitle: string; stageColor: string })[]>()
    allTasks.forEach(t => {
      const key = t.assigneeId
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(t)
    })
    // Build lanes: agents first, then unassigned
    const usedAgentIds = new Set<string>()
    agents.forEach(agent => {
      const tasks = grouped.get(agent.id)
      if (tasks && tasks.length > 0) {
        lanes.push({ agent, tasks })
        usedAgentIds.add(agent.id)
      }
    })
    // Unassigned lane
    const unassigned = grouped.get(null)
    if (unassigned && unassigned.length > 0) {
      lanes.push({ agent: null, tasks: unassigned })
    }
    // Any leftover lanes
    grouped.forEach((tasks, key) => {
      if (key === null) return
      if (!usedAgentIds.has(key)) {
        const agent = agents.find(a => a.id === key) || null
        lanes.push({ agent, tasks })
      }
    })
    return { lanes }
  }, [workingPipeline, agents])

  return (
    <AnimatePresence mode="wait">
      <motion.div key="pipeline" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
        {/* Pipeline Templates Section */}
        <ScrollRevealSection direction="up" delay={0}>
        <PipelineTemplatesSection lang={lang} onUseTemplate={handleCreatePipelineFromTemplate} currentPipeline={workingPipeline} />
        </ScrollRevealSection>

        {/* Pipeline Header */}
        <ScrollRevealSection direction="left" delay={1}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Kanban className="size-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold vl-text-heading">{t(lang, 'pipeline.title')}</h2>
              <p className="text-xs vl-text-muted">{t(lang, 'pipeline.subtitle') || 'Track and manage research workflows'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pipelines.length > 0 && (
              <Select value={selectedPipelineId || ''} onValueChange={setSelectedPipelineId}>
                <SelectTrigger className="w-48 vl-input">
                  <SelectValue placeholder={t(lang, 'pipeline.selectPipeline')} />
                </SelectTrigger>
                <SelectContent className="vl-dialog">
                  {pipelines.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              size="sm"
              onClick={() => setNewPipelineDialogOpen(true)}
            >
              <Plus className="size-3.5 mr-1.5" /> {t(lang, 'pipeline.new')}
            </Button>
            {selectedPipeline && (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                onClick={() => handleDeletePipeline(selectedPipeline.id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        </div>
        </ScrollRevealSection>

        {/* View Toggle + Kanban / Swimlanes Board */}
        {loading ? (
          <PipelineSkeletonBoard />
        ) : workingPipeline ? (
          <>
            {/* View Mode Toggle + Select Multiple */}
            <ScrollRevealSection direction="left" delay={2}>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--vl-bg-inner)] w-fit">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`text-xs h-8 px-3 ${viewMode === 'board' ? 'bg-[var(--vl-bg-card)] shadow-sm vl-text-heading' : 'vl-text-muted'}`}
                  onClick={() => setViewMode('board')}
                >
                  <Kanban className="size-3.5 mr-1.5" />
                  Board
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`text-xs h-8 px-3 ${viewMode === 'swimlanes' ? 'bg-[var(--vl-bg-card)] shadow-sm vl-text-heading' : 'vl-text-muted'}`}
                  onClick={() => setViewMode('swimlanes')}
                >
                  <LayoutGrid className="size-3.5 mr-1.5" />
                  {t(lang, 'pipeline.view.swimlanes')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`text-xs h-8 px-3 ${viewMode === 'analytics' ? 'bg-[var(--vl-bg-card)] shadow-sm vl-text-heading' : 'vl-text-muted'}`}
                  onClick={() => setViewMode('analytics')}
                >
                  <BarChart3 className="size-3.5 mr-1.5" />
                  {t(lang, 'pipeline.view.analytics')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`text-xs h-8 px-3 ${viewMode === '3d' ? 'bg-[var(--vl-bg-card)] shadow-sm vl-text-heading' : 'vl-text-muted'}`}
                  onClick={() => setViewMode('3d')}
                >
                  <Box className="size-3.5 mr-1.5" />
                  {t(lang, 'pipeline.3d.view')}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={multiSelectMode ? 'default' : 'outline'}
                  size="sm"
                  className={`text-xs h-8 ${multiSelectMode ? 'bg-emerald-600 text-white border-emerald-600' : 'vl-text-muted'}`}
                  onClick={() => {
                    setMultiSelectMode(!multiSelectMode)
                    setSelectedTaskIds(new Set())
                  }}
                >
                  <CheckSquare className="size-3.5 mr-1.5" />
                  {t(lang, 'pipeline.selectMultiple')}
                </Button>
              </div>
            </div>
            </ScrollRevealSection>

            {/* Pipeline Health Indicator */}
            <ScrollRevealSection direction="up" delay={1}>
            <GlassPanel title={
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-3.5 text-amber-400" />
                <span className="text-xs font-semibold vl-text-heading">{t(lang, 'pipeline.health')}</span>
              </div>
            } blur="lg" opacity={0.4} glowColor="#f59e0b" className="border border-[var(--vl-border)]">
              <PipelineHealthIndicator stages={workingPipeline.stages} lang={lang} />
            </GlassPanel>
            </ScrollRevealSection>

            {/* Stage Quick-Jump Pills (board mode only) */}
            {viewMode === 'board' && workingPipeline.stages.length > 0 && (
              <ScrollRevealSection direction="left" delay={2}>
              <StageQuickJumpPills
                stages={workingPipeline.stages}
                lang={lang}
                activeStageIndex={activeStageIndex}
                onJumpToStage={handleJumpToStage}
              />
              </ScrollRevealSection>
            )}

            {viewMode === 'board' ? (
          <ScrollRevealSection direction="left" delay={1}>
            <div className="relative">
              <div className="overflow-x-auto pb-4" ref={boardContainerRef}>
              <div className="flex gap-4 min-w-max glass-card-depth rounded-xl p-2 glass-toolbar container-hover-border glass-panel-glow" id="pipeline-board">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCorners}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                >
                  {workingPipeline.stages.map(stage => (
                    <React.Fragment key={stage.id}>
                      <div data-stage-id={stage.id}>
                      <SortableStageColumn
                        stage={stage}
                        agents={agents}
                        lang={lang}
                        onDelete={() => handleDeleteStage(stage.id)}
                        onAddTask={() => {
                          setAddTaskStageId(stage.id)
                          setAddTaskDialogOpen(true)
                        }}
                        onDeleteTask={(taskId) => handleDeleteTask(taskId, stage.id)}
                        onUpdateTask={(taskId, updates) => handleUpdateTask(taskId, stage.id, updates)}
                        onEditTask={(task) => {
                          setEditingTaskId(task.id)
                          setEditTaskDialogOpen(true)
                        }}
                        isDropTarget={dropTargetStageId === stage.id}
                      />
                      </div>
                      {/* Stage droppable zone */}
                      <SortableContext items={[`stage-${stage.id}`]} strategy={verticalListSortingStrategy}>
                        <div />
                      </SortableContext>
                    </React.Fragment>
                  ))}

                  {/* Add Stage Column */}
                  <div className="w-72 flex-shrink-0">
                    <Button
                      variant="outline"
                      className="w-full h-full min-h-[200px] border-dashed border-2 vl-text-muted hover:text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/5 flex flex-col items-center justify-center gap-2"
                      onClick={() => setAddStageDialogOpen(true)}
                    >
                      <Plus className="size-6" />
                      <span className="text-xs">{t(lang, 'pipeline.addStage')}</span>
                    </Button>
                  </div>

                  {/* Drag Overlay */}
                  <DragOverlay>
                    {activeTask && activeStage ? (
                      <div className="w-[268px] opacity-80 shadow-2xl">
                        <div className="vl-inner rounded-lg p-3 border border-emerald-500/30 bg-[var(--vl-bg-card)]">
                          <div className="flex items-center gap-2 mb-1">
                            <GripVertical className="size-3 vl-text-muted" />
                            <p className="text-xs font-medium vl-text-heading">{activeTask.title}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[activeTask.priority] || 'bg-[var(--vl-text-muted)]'}`} />
                            <span className="text-[9px] vl-text-muted">{activeStage.title}</span>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              </div>
            </div>

            {/* SVG Dependency Graph Overlay */}
            <DependencyGraphSVG
              stages={workingPipeline.stages}
              hoveredCurve={hoveredCurve}
              selectedCurve={selectedCurve}
              onCurveHover={setHoveredCurve}
              onCurveClick={handleCurveClick}
              criticalPathTasks={criticalPathTasks}
            />

            {/* Dependency Graph Legend */}
            {workingPipeline.stages.length >= 2 && (
              <div className="flex items-center gap-4 mt-2 px-2">
                <span className="text-[10px] vl-text-muted flex items-center gap-1">
                  <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke={DEP_COLORS.valid} strokeWidth="2" /></svg>
                  Valid
                </span>
                <span className="text-[10px] vl-text-muted flex items-center gap-1">
                  <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke={DEP_COLORS.blocked} strokeWidth="2" /></svg>
                  Blocked
                </span>
                <span className="text-[10px] vl-text-muted flex items-center gap-1">
                  <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke={DEP_COLORS.optional} strokeWidth="2" strokeDasharray="4 2" /></svg>
                  Optional
                </span>
                <span className="text-[10px] vl-text-muted flex items-center gap-1">
                  <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke={DEP_COLORS.critical} strokeWidth="3" /></svg>
                  Critical Path
                </span>
                <span className="text-[10px] vl-text-muted ml-auto flex items-center gap-1">
                  <GripVertical className="size-3" />
                  {t(lang, 'pipeline.dragHint') || 'Drag tasks between stages to reorder'}
                </span>
              </div>
            )}
          </div>
          </ScrollRevealSection>
            ) : viewMode === 'swimlanes' ? (
              /* Swimlanes View */
              <ScrollRevealSection direction="left" delay={2}>
              <div className="space-y-3">
                {swimlaneData.lanes.length === 0 ? (
                  <div className="vl-card rounded-xl p-8 text-center">
                    <Users className="size-8 vl-text-muted mx-auto mb-2" />
                    <p className="text-sm vl-text-heading">No tasks in this pipeline</p>
                    <p className="text-xs vl-text-muted mt-1">Add tasks to stages to see them organized by assignee.</p>
                  </div>
                ) : (
                  swimlaneData.lanes.map((lane, idx) => (
                    <motion.div
                      key={lane.agent?.id || 'unassigned'}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`vl-card border rounded-xl overflow-hidden ${idx % 2 === 1 ? 'opacity-[0.97]' : ''}`}
                    >
                      {/* Swimlane Header */}
                      <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--vl-border)' }}>
                        {lane.agent ? (
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0" style={{ backgroundColor: lane.agent.color || '#6366f1' }}>
                            {renderAgentIcon(lane.agent.icon, 'size-4')}
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[var(--vl-bg-inner)] flex items-center justify-center shrink-0">
                            <Users className="size-4 vl-text-muted" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold vl-text-heading truncate">
                            {lane.agent?.title || 'Unassigned'}
                          </h4>
                          <p className="text-[10px] vl-text-muted">
                            {lane.tasks.filter(t => t.status === 'in_progress').length} in progress, {lane.tasks.filter(t => t.status === 'done').length} completed
                          </p>
                        </div>
                        <Badge className="text-[10px] h-5 px-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {lane.tasks.length} task{lane.tasks.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>

                      {/* Swimlane Tasks */}
                      <div className="overflow-x-auto">
                        {lane.tasks.length === 0 ? (
                          <div className="px-4 py-6 text-center">
                            <p className="text-xs vl-text-muted">No tasks assigned</p>
                          </div>
                        ) : (
                          <div className="flex gap-3 px-4 py-3 min-w-max">
                            {lane.tasks.map(task => (
                              <SwimlaneTaskCard
                                key={task.id}
                                task={task}
                                lang={lang}
                                onClick={() => {
                                  setEditingTaskId(task.id)
                                  setEditTaskDialogOpen(true)
                                }}
                                onDelete={() => {
                                  const stage = workingPipeline!.stages.find(s => s.id === task.stageId)
                                  if (stage) handleDeleteTask(task.id, stage.id)
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Swimlane Summary Row */}
                      {lane.tasks.length > 0 && (() => {
                        const done = lane.tasks.filter(t => t.status === 'done').length
                        const total = lane.tasks.length
                        const pct = total > 0 ? Math.round((done / total) * 100) : 0
                        return (
                          <div className="flex items-center gap-3 px-4 py-2.5 border-t" style={{ borderColor: 'var(--vl-border)' }}>
                            <span className="text-[10px] vl-text-muted">{total} {t(lang, 'pipeline.swimlane.tasks')}</span>
                            <div className="flex-1 h-1.5 rounded-full bg-[var(--vl-bg-inner)] overflow-hidden">
                              <motion.div
                                className="h-full rounded-full"
                                style={{ background: 'linear-gradient(90deg, #10b981, #059669)' }}
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.5, ease: 'easeOut' }}
                              />
                            </div>
                            <span className="text-[10px] vl-text-muted font-medium">
                              {done} {t(lang, 'pipeline.swimlane.ofComplete').replace('{total}', String(total))}
                            </span>
                          </div>
                        )
                      })()}
                    </motion.div>
                  ))
                )}
              </div>
            </ScrollRevealSection>
            ) : viewMode === '3d' ? (
              /* 3D View */
              <ScrollRevealSection direction="up" delay={1}>
                <Pipeline3DView stages={workingPipeline.stages} lang={lang} />
              </ScrollRevealSection>
            ) : (
              /* Analytics View */
              <ScrollRevealSection direction="left" delay={2}>
              <PipelineAnalytics
                pipeline={workingPipeline}
                pipelines={pipelines}
                lang={lang}
              />
              </ScrollRevealSection>
            )}
          </>
        ) : (
          <EmptyState
            icon={Kanban}
            title={t(lang, 'pipeline.noPipelineSelected')}
            description={t(lang, 'pipeline.noPipelineSelectedDesc')}
            accentColor="#10b981"
            action={
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setNewPipelineDialogOpen(true)}>
                <Plus className="size-4 mr-2" /> {t(lang, 'pipeline.createPipeline')}
              </Button>
            }
          />
        )}

        {/* Mini-Map (board mode) */}
        {viewMode === 'board' && workingPipeline && (
          <PipelineMiniMap
            stages={workingPipeline.stages}
            visible={minimapVisible}
            onToggle={() => setMinimapVisible(!minimapVisible)}
            onJumpToStage={handleJumpToStage}
          />
        )}

        {/* Bulk Action Bar */}
        <AnimatePresence>
          {multiSelectMode && selectedTaskIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bulk-action-bar vl-card backdrop-blur-xl border rounded-xl shadow-xl p-3 flex items-center justify-between gap-3"
              style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 50 }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium vl-text-heading">
                  {t(lang, 'pipeline.selected').replace('{count}', String(selectedTaskIds.size))}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" className="text-xs h-8 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30" onClick={handleBulkMarkComplete}>
                  <CheckCircle2 className="size-3.5 mr-1" />
                  {t(lang, 'pipeline.markComplete')}
                </Button>
                <Button size="sm" className="text-xs h-8 bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30" onClick={handleBulkDelete}>
                  <Trash2 className="size-3.5 mr-1" />
                  {t(lang, 'pipeline.deleteSelected')}
                </Button>
                <Popover open={bulkPriorityTarget !== null} onOpenChange={(open) => setBulkPriorityTarget(open ? 'low' : null)}>
                  <PopoverTrigger asChild>
                    <Button size="sm" className="text-xs h-8 bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30">
                      <Target className="size-3.5 mr-1" />
                      {t(lang, 'pipeline.changePriority')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="vl-dialog p-2" side="top">
                    <div className="space-y-1">
                      {(['high', 'medium', 'low'].map(p => (
                        <Button key={p} variant="ghost" size="sm" className="w-full justify-start text-xs h-7" onClick={() => handleBulkChangePriority(p)}>
                          <div className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[p]} mr-2`} />
                          {PRIORITY_LABELS[p]}
                        </Button>
                      )))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pipeline Stats */}
        {workingPipeline && (
          <ScrollRevealSection direction="up" delay={3}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {(() => {
              const allTasks = workingPipeline.stages.flatMap(s => s.tasks)
              const todo = allTasks.filter(t => t.status === 'todo').length
              const inProgress = allTasks.filter(t => t.status === 'in_progress').length
              const done = allTasks.filter(t => t.status === 'done').length
              const total = allTasks.length
              return (
                <>
                  <Card className="vl-card"><CardContent className="p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center"><CircleDot className="size-4 text-blue-400" /></div>
                    <div><p className="text-2xl font-bold vl-text-heading">{todo}</p><p className="text-[10px] vl-text-muted">{t(lang, 'pipeline.stats.todo')}</p></div>
                  </CardContent></Card>
                  <Card className="vl-card"><CardContent className="p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center"><Loader2 className="size-4 text-amber-400" /></div>
                    <div><p className="text-2xl font-bold vl-text-heading">{inProgress}</p><p className="text-[10px] vl-text-muted">{t(lang, 'pipeline.stats.inProgress')}</p></div>
                  </CardContent></Card>
                  <Card className="vl-card"><CardContent className="p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center"><CheckCircle2 className="size-4 text-emerald-400" /></div>
                    <div><p className="text-2xl font-bold vl-text-heading">{done}</p><p className="text-[10px] vl-text-muted">{t(lang, 'pipeline.stats.done')}</p></div>
                  </CardContent></Card>
                  <Card className="vl-card"><CardContent className="p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center"><Target className="size-4 text-violet-400" /></div>
                    <div><p className="text-2xl font-bold vl-text-heading">{total > 0 ? Math.round((done / total) * 100) : 0}%</p><p className="text-[10px] vl-text-muted">{t(lang, 'pipeline.stats.progress')}</p></div>
                  </CardContent></Card>
                </>
              )
            })()}
          </div>
          </ScrollRevealSection>
        )}

        {/* Pipeline Analytics */}
        {workingPipeline && (
          <ScrollRevealSection direction="up" delay={4}>
          <PipelineAnalytics
            pipeline={workingPipeline}
            pipelines={pipelines}
            lang={lang}
          />
          </ScrollRevealSection>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
