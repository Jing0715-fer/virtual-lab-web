'use client'

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ZoomIn, ZoomOut, ChevronDown, ChevronRight, Diamond,
  Calendar, GripVertical, ArrowRight as ArrowRightIcon,
  Clock, User, CheckCircle2, AlertTriangle, BarChart3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import type { Agent } from './shared-components'
import type { PipelineStageData, PipelineTaskData } from './shared-types'
import type { PipelineData } from './shared-types'

// ============================================================
// Types
// ============================================================

interface GanttTask {
  id: string
  title: string
  description: string
  status: string
  priority: string
  order: number
  stageId: string
  assigneeId: string | null
  assignee: Agent | null
  meetingId: string | null
  dueDate: string | null
  tags: string
  createdAt: string
  updatedAt: string
  // Gantt computed
  startDate?: string
  endDate?: string
  progress?: number
  dependencies?: string[]
  isMilestone?: boolean
}

interface GanttStage {
  id: string
  title: string
  order: number
  color: string
  pipelineId: string
  tasks: GanttTask[]
  collapsed?: boolean
}

interface Props {
  pipeline: PipelineData
  onTaskUpdate?: (taskId: string, updates: Partial<GanttTask>) => void
}

type ZoomLevel = 'day' | 'week' | 'month'

// ============================================================
// Constants
// ============================================================

const ROW_HEIGHT = 36
const STAGE_HEADER_HEIGHT = 32
const LABEL_WIDTH = 200
const MIN_BAR_WIDTH = 24
const DAY_MS = 24 * 60 * 60 * 1000

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  planned: { bg: '#475569', border: '#64748b', text: '#e2e8f0' },
  active: { bg: '#10b981', border: '#34d399', text: '#ecfdf5' },
  completed: { bg: '#3b82f6', border: '#60a5fa', text: '#eff6ff' },
  blocked: { bg: '#ef4444', border: '#f87171', text: '#fef2f2' },
  todo: { bg: '#64748b', border: '#94a3b8', text: '#f1f5f9' },
  in_progress: { bg: '#10b981', border: '#34d399', text: '#ecfdf5' },
  done: { bg: '#3b82f6', border: '#60a5fa', text: '#eff6ff' },
}

// ============================================================
// Helpers
// ============================================================

function getTaskDateRange(task: GanttTask, fallbackStart: Date, fallbackEnd: Date): { start: Date; end: Date } {
  if (task.startDate && task.endDate) {
    return { start: new Date(task.startDate), end: new Date(task.endDate) }
  }
  if (task.dueDate) {
    const due = new Date(task.dueDate)
    const created = new Date(task.createdAt)
    return { start: created, end: due }
  }
  // Fallback: use created + 3 days
  const created = new Date(task.createdAt)
  return {
    start: new Date(Math.max(created.getTime(), fallbackStart.getTime())),
    end: new Date(Math.min(created.getTime() + 3 * DAY_MS, fallbackEnd.getTime())),
  }
}

function daysBetween(a: Date, b: Date): number {
  return Math.max(1, Math.ceil((b.getTime() - a.getTime()) / DAY_MS))
}

function formatDate(date: Date, zoom: ZoomLevel): string {
  switch (zoom) {
    case 'day':
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    case 'week':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    case 'month':
      return date.toLocaleDateString('en-US', { month: 'short' })
  }
}

function formatFullDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ============================================================
// Component
// ============================================================

export default function GanttChart({ pipeline, onTaskUpdate }: Props) {
  const [zoom, setZoom] = useState<ZoomLevel>('week')
  const [collapsedStages, setCollapsedStages] = useState<Set<string>>(new Set())
  const [hoveredTask, setHoveredTask] = useState<{ task: GanttTask; stage: GanttStage; rect: DOMRect } | null>(null)
  const [resizing, setResizing] = useState<{ taskId: string; edge: 'left' | 'right'; startX: number; originalStart: Date; originalEnd: Date } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollLeft, setScrollLeft] = useState(0)

  // Transform pipeline stages into Gantt stages with computed dates
  const ganttStages: GanttStage[] = useMemo(() => {
    return pipeline.stages
      .sort((a, b) => a.order - b.order)
      .map(stage => ({
        id: stage.id,
        title: stage.title,
        order: stage.order,
        color: stage.color,
        pipelineId: stage.pipelineId,
        collapsed: collapsedStages.has(stage.id),
        tasks: stage.tasks
          .sort((a, b) => a.order - b.order)
          .map(task => ({
            ...task,
            status: task.status,
            progress: task.status === 'done' ? 100 : task.status === 'in_progress' ? 50 : 0,
          })),
      }))
  }, [pipeline.stages, collapsedStages])

  // Compute overall date range
  const { rangeStart, rangeEnd, totalDays } = useMemo(() => {
    const now = new Date()
    let minDate = now.getTime()
    let maxDate = now.getTime() + 30 * DAY_MS

    ganttStages.forEach(stage => {
      stage.tasks.forEach(task => {
        const { start, end } = getTaskDateRange(task, new Date(minDate), new Date(maxDate))
        minDate = Math.min(minDate, start.getTime() - 2 * DAY_MS)
        maxDate = Math.max(maxDate, end.getTime() + 2 * DAY_MS)
      })
    })

    return {
      rangeStart: new Date(minDate),
      rangeEnd: new Date(maxDate),
      totalDays: daysBetween(new Date(minDate), new Date(maxDate)),
    }
  }, [ganttStages])

  const dayWidth = zoom === 'day' ? 60 : zoom === 'week' ? 28 : 8
  const chartWidth = totalDays * dayWidth

  // Generate date columns
  const dateColumns = useMemo(() => {
    const columns: Date[] = []
    let current = new Date(rangeStart)
    while (current <= rangeEnd) {
      columns.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    return columns
  }, [rangeStart, rangeEnd])

  // Month headers
  const monthHeaders = useMemo(() => {
    const months: { label: string; startDay: number; days: number }[] = []
    const seen = new Set<string>()
    dateColumns.forEach((date, i) => {
      const key = `${date.getFullYear()}-${date.getMonth()}`
      if (!seen.has(key)) {
        seen.add(key)
        let days = 1
        for (let j = i + 1; j < dateColumns.length; j++) {
          const next = dateColumns[j]
          if (next.getMonth() !== date.getMonth() || next.getFullYear() !== date.getFullYear()) break
          days++
        }
        months.push({
          label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          startDay: i,
          days,
        })
      }
    })
    return months
  }, [dateColumns])

  // Week headers
  const weekHeaders = useMemo(() => {
    if (zoom !== 'day') return []
    const weeks: { label: string; startDay: number; days: number }[] = []
    let weekStart = 0
    for (let i = 0; i < dateColumns.length; i++) {
      if (dateColumns[i].getDay() === 0 || i === 0) {
        if (i > 0) {
          weeks.push({
            label: `W${Math.ceil((dateColumns[weekStart].getDate()) / 7)}`,
            startDay: weekStart,
            days: i - weekStart,
          })
        }
        weekStart = i
      }
    }
    if (weekStart < dateColumns.length) {
      weeks.push({
        label: `W${Math.ceil((dateColumns[weekStart].getDate()) / 7)}`,
        startDay: weekStart,
        days: dateColumns.length - weekStart,
      })
    }
    return weeks
  }, [dateColumns, zoom])

  // Compute total height
  const totalHeight = useMemo(() => {
    let h = 0
    ganttStages.forEach(stage => {
      h += STAGE_HEADER_HEIGHT
      if (!stage.collapsed) {
        h += stage.tasks.length * ROW_HEIGHT + 8
      }
    })
    return h
  }, [ganttStages])

  // Toggle stage collapse
  const toggleCollapse = useCallback((stageId: string) => {
    setCollapsedStages(prev => {
      const next = new Set(prev)
      if (next.has(stageId)) next.delete(stageId)
      else next.add(stageId)
      return next
    })
  }, [])

  // Row Y positions
  const rowPositions = useMemo(() => {
    const positions: { stageId: string; taskId?: string; y: number; height: number }[] = []
    let y = 0
    ganttStages.forEach(stage => {
      positions.push({ stageId: stage.id, y, height: STAGE_HEADER_HEIGHT })
      y += STAGE_HEADER_HEIGHT
      if (!stage.collapsed) {
        stage.tasks.forEach(task => {
          positions.push({ stageId: stage.id, taskId: task.id, y, height: ROW_HEIGHT })
          y += ROW_HEIGHT
        })
        y += 8
      }
    })
    return positions
  }, [ganttStages])

  // Mouse/touch drag for resize
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizing) return
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const x = e.clientX - rect.left + container.scrollLeft
    const dayDelta = Math.round((x - resizing.startX) / dayWidth)

    const newStart = new Date(resizing.originalStart)
    const newEnd = new Date(resizing.originalEnd)

    if (resizing.edge === 'left') {
      newStart.setDate(newStart.getDate() + dayDelta)
      if (newStart >= newEnd) return
    } else {
      newEnd.setDate(newEnd.getDate() + dayDelta)
      if (newEnd <= newStart) return
    }

    onTaskUpdate?.(resizing.taskId, {
      startDate: newStart.toISOString(),
      endDate: newEnd.toISOString(),
    })
  }, [resizing, dayWidth, onTaskUpdate])

  const handleMouseUp = useCallback(() => {
    setResizing(null)
  }, [])

  useEffect(() => {
    if (resizing) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [resizing, handleMouseMove, handleMouseUp])

  // Now line position
  const nowX = useMemo(() => {
    const now = new Date()
    const daysSinceStart = (now.getTime() - rangeStart.getTime()) / DAY_MS
    return daysSinceStart * dayWidth
  }, [rangeStart, dayWidth])

  // Zoom controls
  const zoomOrder: ZoomLevel[] = ['day', 'week', 'month']
  const zoomIn = () => {
    const idx = zoomOrder.indexOf(zoom)
    if (idx > 0) setZoom(zoomOrder[idx - 1])
  }
  const zoomOut = () => {
    const idx = zoomOrder.indexOf(zoom)
    if (idx < zoomOrder.length - 1) setZoom(zoomOrder[idx + 1])
  }

  // Empty state
  if (!pipeline.stages || pipeline.stages.length === 0) {
    return (
      <Card className="vl-card border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-5">
            <BarChart3 className="size-10 text-emerald-400" />
          </div>
          <h3 className="text-lg font-semibold vl-text-heading mb-2">No Pipeline Stages</h3>
          <p className="text-sm vl-text-muted text-center max-w-md leading-relaxed">
            Add stages and tasks to your pipeline to visualize the Gantt chart.
            Track progress, dependencies, and milestones over time.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Card className="vl-card overflow-hidden">
        {/* Header */}
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-emerald-400" />
              <CardTitle className="text-sm font-semibold vl-text-heading">
                {pipeline.name} — Gantt View
              </CardTitle>
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              <Button variant="outline" size="icon" className="size-7" onClick={zoomIn} disabled={zoom === 'day'}>
                <ZoomIn className="size-3" />
              </Button>
              <Select value={zoom} onValueChange={(v) => setZoom(v as ZoomLevel)}>
                <SelectTrigger className="w-[80px] h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {zoomOrder.map(z => (
                    <SelectItem key={z} value={z} className="text-xs">{z.charAt(0).toUpperCase() + z.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" className="size-7" onClick={zoomOut} disabled={zoom === 'month'}>
                <ZoomOut className="size-3" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div ref={containerRef} className="overflow-x-auto overflow-y-auto custom-scrollbar" style={{ maxHeight: 500 }}>
            <div style={{ width: LABEL_WIDTH + chartWidth, minWidth: '100%' }}>
              {/* Top header: months */}
              <div className="flex border-b border-[var(--vl-border)]" style={{ height: 28 }}>
                <div className="shrink-0 bg-[var(--vl-bg-secondary)] border-r border-[var(--vl-border)] flex items-center px-3" style={{ width: LABEL_WIDTH }}>
                  <span className="text-[10px] font-semibold vl-text-muted uppercase tracking-wider">Tasks</span>
                </div>
                <div className="flex-1 flex relative">
                  {monthHeaders.map((m, i) => (
                    <div
                      key={i}
                      className="border-r border-[var(--vl-border)] flex items-center px-2 shrink-0"
                      style={{ width: m.days * dayWidth }}
                    >
                      <span className="text-[10px] font-medium vl-text-muted whitespace-nowrap">{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sub-header: weeks/days */}
              <div className="flex border-b border-[var(--vl-border)]" style={{ height: zoom === 'day' ? 48 : 24 }}>
                <div className="shrink-0 bg-[var(--vl-bg-secondary)] border-r border-[var(--vl-border)]" style={{ width: LABEL_WIDTH }} />
                <div className="flex-1 flex relative">
                  {zoom === 'day' && weekHeaders.map((w, i) => (
                    <div
                      key={`week-${i}`}
                      className="border-r border-[var(--vl-border)] border-b border-b-[var(--vl-border)] flex items-center justify-center shrink-0 bg-[var(--vl-bg-secondary)]"
                      style={{ width: w.days * dayWidth, height: 22 }}
                    >
                      <span className="text-[9px] vl-text-muted">{w.label}</span>
                    </div>
                  ))}
                  {dateColumns.map((date, i) => {
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6
                    const isToday = date.toDateString() === new Date().toDateString()
                    return (
                      <div
                        key={`day-${i}`}
                        className={`border-r border-[var(--vl-border)] flex items-center justify-center shrink-0 text-[9px] ${
                          isToday ? 'bg-emerald-500/10 font-bold text-emerald-500' :
                          isWeekend ? 'bg-[var(--vl-bg-secondary)]/50 vl-text-muted' : 'vl-text-muted'
                        }`}
                        style={{ width: dayWidth, height: zoom === 'day' ? 26 : 24 }}
                      >
                        {zoom !== 'month' && date.getDate()}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Body: stages and tasks */}
              <div className="relative">
                {/* Now line (vertical) */}
                <div
                  className="absolute top-0 bottom-0 z-20 pointer-events-none"
                  style={{
                    left: LABEL_WIDTH + nowX,
                    width: 2,
                  }}
                >
                  <div className="w-full h-full bg-red-500 opacity-70" />
                  <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-red-500" />
                </div>

                {/* Stage rows */}
                {ganttStages.map((stage, stageIdx) => {
                  const stageRow = rowPositions.find(r => r.stageId === stage.id && !r.taskId)
                  if (!stageRow) return null

                  return (
                    <div key={stage.id}>
                      {/* Stage header */}
                      <div
                        className="flex items-center border-b border-[var(--vl-border)] cursor-pointer hover:bg-[var(--vl-bg-card-hover)] transition-colors"
                        style={{ height: STAGE_HEADER_HEIGHT }}
                        onClick={() => toggleCollapse(stage.id)}
                      >
                        <div
                          className="shrink-0 flex items-center gap-2 px-3 border-r border-[var(--vl-border)]"
                          style={{ width: LABEL_WIDTH }}
                        >
                          <motion.div
                            animate={{ rotate: stage.collapsed ? 0 : 90 }}
                            transition={{ duration: 0.15 }}
                          >
                            <ChevronRight className="size-3 vl-text-muted" />
                          </motion.div>
                          <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: stage.color }} />
                          <span className="text-xs font-semibold vl-text-heading truncate">{stage.title}</span>
                          <Badge variant="outline" className="text-[9px] px-1.5 ml-auto bg-[var(--vl-bg-secondary)]">
                            {stage.tasks.length}
                          </Badge>
                        </div>
                        {/* Stage bar spanning its task date range */}
                        <div className="flex-1 relative h-full flex items-center">
                          {stage.tasks.length > 0 && (() => {
                            const allDates = stage.tasks.map(t => getTaskDateRange(t, rangeStart, rangeEnd))
                            const minDate = Math.min(...allDates.map(d => d.start.getTime()))
                            const maxDate = Math.max(...allDates.map(d => d.end.getTime()))
                            const barLeft = ((minDate - rangeStart.getTime()) / DAY_MS) * dayWidth
                            const barWidth = Math.max(MIN_BAR_WIDTH, ((maxDate - minDate) / DAY_MS) * dayWidth)
                            return (
                              <div
                                className="absolute h-2 rounded-full opacity-30"
                                style={{
                                  left: barLeft,
                                  width: barWidth,
                                  backgroundColor: stage.color,
                                }}
                              />
                            )
                          })()}
                        </div>
                      </div>

                      {/* Task rows */}
                      <AnimatePresence initial={false}>
                        {!stage.collapsed && stage.tasks.map((task) => {
                          const taskRow = rowPositions.find(r => r.taskId === task.id)
                          if (!taskRow) return null
                          const { start, end } = getTaskDateRange(task, rangeStart, rangeEnd)
                          const barLeft = ((start.getTime() - rangeStart.getTime()) / DAY_MS) * dayWidth
                          const barWidth = Math.max(MIN_BAR_WIDTH, ((end.getTime() - start.getTime()) / DAY_MS) * dayWidth)
                          const statusColor = STATUS_COLORS[task.status] || STATUS_COLORS.planned
                          const progress = task.progress || 0

                          return (
                            <motion.div
                              key={task.id}
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: ROW_HEIGHT }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.15 }}
                              className="flex items-center border-b border-[var(--vl-border)] hover:bg-[var(--vl-bg-card-hover)] transition-colors group"
                              style={{ height: ROW_HEIGHT }}
                            >
                              {/* Task label */}
                              <div
                                className="shrink-0 flex items-center gap-2 px-3 pl-7 border-r border-[var(--vl-border)]"
                                style={{ width: LABEL_WIDTH }}
                              >
                                {task.isMilestone && (
                                  <Diamond className="size-3 text-amber-500 shrink-0" />
                                )}
                                <span className="text-xs vl-text-body truncate">{task.title}</span>
                              </div>

                              {/* Chart area */}
                              <div className="flex-1 relative h-full flex items-center">
                                {/* Weekend shading */}
                                {dateColumns.map((date, i) => {
                                  const isWeekend = date.getDay() === 0 || date.getDay() === 6
                                  if (!isWeekend) return null
                                  return (
                                    <div
                                      key={`we-${i}`}
                                      className="absolute top-0 bottom-0 bg-[var(--vl-bg-secondary)]/30"
                                      style={{
                                        left: i * dayWidth,
                                        width: dayWidth,
                                      }}
                                    />
                                  )
                                })}

                                {/* Task bar */}
                                <div
                                  className="absolute h-5 rounded-md cursor-pointer transition-shadow hover:shadow-md"
                                  style={{
                                    left: barLeft,
                                    width: barWidth,
                                    backgroundColor: statusColor.bg,
                                    borderLeft: `3px solid ${statusColor.border}`,
                                    zIndex: 5,
                                  }}
                                  onMouseEnter={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect()
                                    setHoveredTask({ task, stage, rect })
                                  }}
                                  onMouseLeave={() => setHoveredTask(null)}
                                >
                                  {/* Progress fill */}
                                  <div
                                    className="absolute top-0 left-0 h-full rounded-md"
                                    style={{
                                      width: `${progress}%`,
                                      backgroundColor: statusColor.border,
                                      opacity: 0.5,
                                    }}
                                  />
                                  {/* Task title inside bar */}
                                  {barWidth > 80 && (
                                    <span className="absolute top-1/2 left-2 -translate-y-1/2 text-[9px] font-medium truncate pr-2 pointer-events-none" style={{ color: statusColor.text, maxWidth: barWidth - 16 }}>
                                      {task.title}
                                    </span>
                                  )}
                                </div>

                                {/* Resize handles */}
                                {onTaskUpdate && (
                                  <>
                                    <div
                                      className="absolute top-1/2 -translate-y-1/2 w-1.5 h-5 rounded-sm cursor-ew-resize hover:bg-emerald-400/50 transition-colors z-10"
                                      style={{ left: barLeft - 2 }}
                                      onMouseDown={(e) => {
                                        e.stopPropagation()
                                        setResizing({
                                          taskId: task.id,
                                          edge: 'left',
                                          startX: e.clientX,
                                          originalStart: start,
                                          originalEnd: end,
                                        })
                                      }}
                                    >
                                      <GripVertical className="size-2.5 vl-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <div
                                      className="absolute top-1/2 -translate-y-1/2 w-1.5 h-5 rounded-sm cursor-ew-resize hover:bg-emerald-400/50 transition-colors z-10"
                                      style={{ left: barLeft + barWidth }}
                                      onMouseDown={(e) => {
                                        e.stopPropagation()
                                        setResizing({
                                          taskId: task.id,
                                          edge: 'right',
                                          startX: e.clientX,
                                          originalStart: start,
                                          originalEnd: end,
                                        })
                                      }}
                                    >
                                      <GripVertical className="size-2.5 vl-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                  </>
                                )}

                                {/* Milestone diamond */}
                                {task.isMilestone && (
                                  <div
                                    className="absolute top-1/2 -translate-y-1/2 z-10"
                                    style={{ left: barLeft + barWidth / 2 - 6 }}
                                  >
                                    <Diamond className="size-4 text-amber-500 fill-amber-500" />
                                  </div>
                                )}

                                {/* Dependency arrows (simplified: connect to next task in same stage) */}
                                {stage.tasks.indexOf(task) < stage.tasks.length - 1 && (() => {
                                  const nextTask = stage.tasks[stage.tasks.indexOf(task) + 1]
                                  const nextDates = getTaskDateRange(nextTask, rangeStart, rangeEnd)
                                  const nextLeft = ((nextDates.start.getTime() - rangeStart.getTime()) / DAY_MS) * dayWidth
                                  const arrowEndX = Math.max(barLeft + barWidth + 4, nextLeft - 4)
                                  const midY = ROW_HEIGHT / 2
                                  if (arrowEndX >= nextLeft) return null
                                  return (
                                    <svg
                                      className="absolute inset-0 pointer-events-none z-0"
                                      style={{ left: 0, width: chartWidth, height: ROW_HEIGHT }}
                                    >
                                      <path
                                        d={`M ${barLeft + barWidth} ${midY} C ${arrowEndX - 10} ${midY}, ${nextLeft + 10} ${midY}, ${nextLeft} ${midY}`}
                                        fill="none"
                                        stroke="var(--vl-chart-axis, #6b7280)"
                                        strokeWidth={1}
                                        strokeDasharray="4,2"
                                        opacity={0.4}
                                        markerEnd="url(#arrowhead)"
                                      />
                                    </svg>
                                  )
                                })()}
                              </div>
                            </motion.div>
                          )
                        })}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Arrow marker definition */}
          <svg width="0" height="0" className="absolute">
            <defs>
              <marker
                id="arrowhead"
                markerWidth="6"
                markerHeight="4"
                refX="5"
                refY="2"
                orient="auto"
              >
                <polygon points="0 0, 6 2, 0 4" fill="var(--vl-chart-axis, #6b7280)" opacity={0.5} />
              </marker>
            </defs>
          </svg>
        </CardContent>
      </Card>

      {/* Hover tooltip */}
      <AnimatePresence>
        {hoveredTask && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="fixed z-50 pointer-events-none"
            style={{
              left: Math.min(hoveredTask.rect.right + 8, window.innerWidth - 240),
              top: hoveredTask.rect.top,
            }}
          >
            <Card className="shadow-xl vl-card p-3 w-56" style={{ background: 'var(--vl-bg-card, #fff)' }}>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: hoveredTask.stage.color }} />
                  <span className="text-xs font-semibold vl-text-heading truncate">{hoveredTask.task.title}</span>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[9px] px-1.5 w-fit ${
                    hoveredTask.task.status === 'done' ? 'bg-blue-500/15 text-blue-500 border-blue-500/30' :
                    hoveredTask.task.status === 'in_progress' ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' :
                    'bg-slate-500/15 text-slate-400 border-slate-500/30'
                  }`}
                >
                  {hoveredTask.task.status.replace('_', ' ')}
                </Badge>
                <div className="grid grid-cols-2 gap-2 text-[10px] vl-text-muted">
                  <div className="flex items-center gap-1">
                    <Calendar className="size-3" />
                    {formatFullDate(new Date(hoveredTask.task.createdAt))}
                  </div>
                  {hoveredTask.task.assignee && (
                    <div className="flex items-center gap-1">
                      <User className="size-3" />
                      {hoveredTask.task.assignee.title}
                    </div>
                  )}
                  {hoveredTask.task.dueDate && (
                    <div className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {formatFullDate(new Date(hoveredTask.task.dueDate))}
                    </div>
                  )}
                </div>
                {/* Progress bar */}
                {hoveredTask.task.progress !== undefined && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="vl-text-muted">Progress</span>
                      <span className="font-medium vl-text-heading">{hoveredTask.task.progress}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--vl-bg-secondary)] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-emerald-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${hoveredTask.task.progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </TooltipProvider>
  )
}
