'use client'

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart3, TrendingUp, Clock, AlertTriangle, Users, Target,
  Activity, Zap, ArrowRight, Flame,
} from 'lucide-react'
import { useAnimatedCounter } from './shared-hooks'
import type { PipelineStageData, PipelineTaskData } from './shared-components'

// ============================================================
// Types
// ============================================================

interface PipelineAnalyticsWidgetProps {
  pipeline: {
    id: string
    name: string
    description?: string
    status: string
    stages: PipelineStageData[]
    createdAt: string
    updatedAt: string
  }
  tasks?: PipelineTaskData[]
}

interface AgentWorkload {
  agentId: string
  agentName: string
  agentColor: string
  tasks: number
  completed: number
  inProgress: number
}

// ============================================================
// Helper Functions
// ============================================================

function useStaggeredCounter(values: number[], duration = 1000) {
  const [counts, setCounts] = useState(values)

  useEffect(() => {
    const startTime = performance.now()
    let raf: number

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)

      const newCounts = values.map((target, i) => {
        const start = (counts[i] || 0)
        return Math.round(start + (target - start) * eased)
      })
      setCounts(newCounts)

      if (progress < 1) {
        raf = requestAnimationFrame(animate)
      }
    }

    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [values])

  return counts
}

// ============================================================
// SVG Components
// ============================================================

function CircularProgressRing({
  value,
  size = 120,
  strokeWidth = 8,
  color = '#10b981',
  label,
  sublabel,
}: {
  value: number
  size?: number
  strokeWidth?: number
  color?: string
  label: string
  sublabel?: string
}) {
  const [animatedValue, setAnimatedValue] = useState(0)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (animatedValue / 100) * circumference

  useEffect(() => {
    const startTime = performance.now()
    const target = value
    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / 1200, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimatedValue(target * eased)
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [value])

  return (
    <div className="relative flex flex-col items-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--vl-bg-inner)"
          strokeWidth={strokeWidth}
          className="opacity-50"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold vl-text-heading tabular-nums">
          {Math.round(animatedValue)}%
        </span>
        <span className="text-[9px] vl-text-muted mt-0.5">{label}</span>
      </div>
      {sublabel && (
        <span className="text-[10px] vl-text-muted mt-2">{sublabel}</span>
      )}
    </div>
  )
}

function StackedBarChart({
  data,
  maxTasks,
  stageWidth = 100,
  barHeight = 28,
}: {
  data: { label: string; color: string; done: number; active: number; pending: number }[]
  maxTasks: number
  stageWidth?: number
  barHeight?: number
}) {
  const chartWidth = Math.max(data.length * (stageWidth + 20) + 40, 300)

  return (
    <svg width="100%" viewBox={`0 0 ${chartWidth} ${(data.length + 1) * (barHeight + 24)}`} className="overflow-visible">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
        <line
          key={frac}
          x1={60}
          y1={10}
          x2={60}
          y2={data.length * (barHeight + 24) + 10}
          stroke="var(--vl-chart-grid)"
          strokeWidth={0.5}
          strokeDasharray="3 3"
          transform={`translate(${(maxTasks > 0 ? frac : 0) * (chartWidth - 120)}, 0)`}
        />
      ))}
      {data.map((stage, idx) => {
        const y = idx * (barHeight + 24) + 20
        const total = stage.done + stage.active + stage.pending
        const barW = maxTasks > 0 ? (total / maxTasks) * (chartWidth - 120) : 0
        const doneW = maxTasks > 0 ? (stage.done / maxTasks) * (chartWidth - 120) : 0
        const activeW = maxTasks > 0 ? (stage.active / maxTasks) * (chartWidth - 120) : 0
        const pendingW = maxTasks > 0 ? (stage.pending / maxTasks) * (chartWidth - 120) : 0

        return (
          <g key={idx}>
            {/* Label */}
            <text x={0} y={y + barHeight / 2 + 4} className="text-[9px] fill-[var(--vl-text-muted)]" textAnchor="start">
              {stage.label.length > 12 ? stage.label.slice(0, 12) + '…' : stage.label}
            </text>

            {/* Background bar */}
            <rect x={60} y={y} width={chartWidth - 120} height={barHeight} rx={6} fill="var(--vl-bg-inner)" opacity={0.5} />

            {/* Done segment */}
            {stage.done > 0 && (
              <motion.rect
                x={60} y={y} width={doneW} height={barHeight} rx={6}
                fill="#10b981" opacity={0.8}
                initial={{ width: 0 }}
                animate={{ width: doneW }}
                transition={{ duration: 0.8, delay: idx * 0.08, ease: 'easeOut' }}
              />
            )}

            {/* Active segment */}
            {stage.active > 0 && (
              <motion.rect
                x={60 + doneW} y={y} width={activeW} height={barHeight}
                fill="#f59e0b" opacity={0.8}
                initial={{ width: 0 }}
                animate={{ width: activeW }}
                transition={{ duration: 0.8, delay: idx * 0.08 + 0.1, ease: 'easeOut' }}
              />
            )}

            {/* Pending segment */}
            {stage.pending > 0 && (
              <motion.rect
                x={60 + doneW + activeW} y={y}
                width={pendingW} height={barHeight}
                rx={pendingW > 0 && doneW + activeW === 0 ? 6 : 0}
                fill="var(--vl-text-muted)" opacity={0.3}
                initial={{ width: 0 }}
                animate={{ width: pendingW }}
                transition={{ duration: 0.8, delay: idx * 0.08 + 0.2, ease: 'easeOut' }}
              />
            )}

            {/* Count label */}
            <text
              x={68}
              y={y + barHeight / 2 + 3}
              className="text-[9px] fill-white font-medium"
              style={{ textAnchor: barW > 30 ? 'start' : 'start', fill: total > 0 ? 'white' : 'var(--vl-text-muted)' }}
            >
              {total > 0 ? `${total}` : '0'}
            </text>
          </g>
        )
      })}

      {/* Legend */}
      <g transform={`translate(60, ${data.length * (barHeight + 24) + 20})`}>
        <circle cx={4} cy={4} r={4} fill="#10b981" />
        <text x={12} y={7} className="text-[9px] fill-[var(--vl-text-muted)]">Done</text>
        <circle cx={54} cy={4} r={4} fill="#f59e0b" />
        <text x={62} y={7} className="text-[9px] fill-[var(--vl-text-muted)]">Active</text>
        <circle cx={110} cy={4} r={4} fill="var(--vl-text-muted)" opacity={0.5} />
        <text x={118} y={7} className="text-[9px] fill-[var(--vl-text-muted)]">Pending</text>
      </g>
    </svg>
  )
}

function SparklineChart({ data, color = '#10b981', width = 80, height = 24 }: { data: number[]; color?: string; width?: number; height?: number }) {
  if (data.length < 2) return null
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * height
    return `${x},${y}`
  }).join(' ')

  const areaPoints = `0,${height} ${points} ${width},${height}`

  return (
    <svg width={width} height={height}>
      <defs>
        <linearGradient id={`spark-grad-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#spark-grad-${color.replace('#', '')})`} />
      <polyline fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" points={points} />
      <circle cx={(data.length - 1) / (data.length - 1) * width} cy={height - ((data[data.length - 1] - min) / range) * height} r={2.5} fill={color} />
    </svg>
  )
}

function AgentWorkloadChart({ agents }: { agents: AgentWorkload[] }) {
  if (agents.length === 0) return null

  const maxTasks = Math.max(...agents.map(a => a.tasks), 1)

  return (
    <div className="space-y-2">
      {agents.map((agent, idx) => (
        <motion.div
          key={agent.agentId}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.05 }}
          className="flex items-center gap-2"
        >
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0"
            style={{ backgroundColor: agent.agentColor }}
          >
            {agent.agentName.charAt(0)}
          </div>
          <span className="text-[10px] vl-text-heading w-16 truncate shrink-0">{agent.agentName}</span>
          <div className="flex-1 h-5 rounded-full bg-[var(--vl-bg-inner)] overflow-hidden flex">
            {agent.completed > 0 && (
              <motion.div
                className="h-full bg-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${(agent.completed / maxTasks) * 100}%` }}
                transition={{ duration: 0.6, delay: idx * 0.05 }}
              />
            )}
            {agent.inProgress > 0 && (
              <motion.div
                className="h-full bg-amber-500"
                initial={{ width: 0 }}
                animate={{ width: `${(agent.inProgress / maxTasks) * 100}%` }}
                transition={{ duration: 0.6, delay: idx * 0.05 + 0.1 }}
              />
            )}
          </div>
          <span className="text-[9px] vl-text-muted w-8 text-right tabular-nums">{agent.tasks}</span>
        </motion.div>
      ))}
    </div>
  )
}

// ============================================================
// Metric Card
// ============================================================

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
  bgColor,
  sparkData,
}: {
  icon: React.ElementType
  label: string
  value: number
  color: string
  bgColor: string
  sparkData?: number[]
}) {
  const animated = useAnimatedCounter(value)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, scale: 1.02 }}
      className="vl-card border rounded-xl p-3 backdrop-blur-sm transition-shadow hover:shadow-md relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-16 h-16 opacity-10 pointer-events-none" style={{ background: `radial-gradient(circle at top right, ${color}, transparent)` }} />
      <div className="flex items-start justify-between relative z-10">
        <div className="space-y-1">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bgColor}`}>
            <Icon className="size-4" style={{ color }} />
          </div>
          <p className="text-lg font-bold vl-text-heading tabular-nums">{animated}</p>
          <p className="text-[10px] vl-text-muted">{label}</p>
        </div>
        {sparkData && sparkData.length > 1 && (
          <SparklineChart data={sparkData} color={color} />
        )}
      </div>
    </motion.div>
  )
}

// ============================================================
// Pipeline Analytics Widget Main Component
// ============================================================

export default function PipelineAnalyticsWidget({ pipeline, tasks }: PipelineAnalyticsWidgetProps) {
  const stages = useMemo(() => {
    return [...pipeline.stages].sort((a, b) => a.order - b.order)
  }, [pipeline.stages])

  const allTasks = useMemo(() => {
    if (tasks) return tasks
    return stages.flatMap(s => s.tasks)
  }, [stages, tasks])

  // ─── Computed metrics ───
  const totalTasks = allTasks.length
  const completedTasks = allTasks.filter(t => t.status === 'done').length
  const activeTasks = allTasks.filter(t => t.status === 'in_progress').length
  const pendingTasks = allTasks.filter(t => t.status === 'todo').length
  const completionPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  const overdueTasks = allTasks.filter(t => {
    if (!t.dueDate || t.status === 'done') return false
    return new Date(t.dueDate) < new Date()
  }).length

  // Bottleneck detection
  const bottleneckStage = useMemo(() => {
    if (stages.length === 0) return null
    let maxTaskStage = stages[0]
    for (const stage of stages) {
      if (stage.tasks.length > maxTaskStage.tasks.length) {
        maxTaskStage = stage
      }
    }
    return maxTaskStage.tasks.length > 0 ? maxTaskStage : null
  }, [stages])

  // Average time per stage (simulated from createdAt timestamps)
  const avgTimePerStage = useMemo(() => {
    return stages.map(stage => {
      const doneTasks = stage.tasks.filter(t => t.status === 'done')
      if (doneTasks.length === 0) return { name: stage.title, avgMs: 0, color: stage.color }
      const times = doneTasks.map(t => {
        const created = new Date(t.createdAt).getTime()
        const updated = new Date(t.updatedAt).getTime()
        return updated - created
      })
      const avgMs = times.reduce((a, b) => a + b, 0) / times.length
      return { name: stage.title, avgMs, color: stage.color }
    })
  }, [stages])

  // Agent workload
  const agentWorkloads: AgentWorkload[] = useMemo(() => {
    const agentMap = new Map<string, AgentWorkload>()
    for (const task of allTasks) {
      if (!task.assigneeId) continue
      const existing = agentMap.get(task.assigneeId)
      if (existing) {
        existing.tasks++
        if (task.status === 'done') existing.completed++
        if (task.status === 'in_progress') existing.inProgress++
      } else {
        agentMap.set(task.assigneeId, {
          agentId: task.assigneeId,
          agentName: task.assignee?.title || 'Unknown',
          agentColor: task.assignee?.color || '#6366f1',
          tasks: 1,
          completed: task.status === 'done' ? 1 : 0,
          inProgress: task.status === 'in_progress' ? 1 : 0,
        })
      }
    }
    return Array.from(agentMap.values()).sort((a, b) => b.tasks - a.tasks)
  }, [allTasks])

  // Stacked bar chart data
  const barData = useMemo(() => {
    return stages.map(s => ({
      label: s.title,
      color: s.color,
      done: s.tasks.filter(t => t.status === 'done').length,
      active: s.tasks.filter(t => t.status === 'in_progress').length,
      pending: s.tasks.filter(t => t.status === 'todo').length,
    }))
  }, [stages])

  const maxBarTasks = Math.max(...barData.map(d => d.done + d.active + d.pending), 1)

  // Sparkline data (simulated trend)
  const sparkDataCompleted = useMemo(() => {
    const pts = [completedTasks]
    for (let i = 0; i < 9; i++) {
      pts.unshift(Math.max(0, completedTasks - Math.floor(Math.random() * 3)))
    }
    return pts
  }, [completedTasks])

  const sparkDataActive = useMemo(() => {
    const pts = [activeTasks]
    for (let i = 0; i < 9; i++) {
      pts.unshift(Math.max(0, activeTasks - Math.floor(Math.random() * 2) + Math.floor(Math.random() * 2)))
    }
    return pts
  }, [activeTasks])

  if (stages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <BarChart3 className="size-10 vl-text-muted mb-3" />
        <p className="text-sm vl-text-muted">No pipeline data to analyze</p>
        <p className="text-[11px] vl-text-muted mt-1">Add stages and tasks to see analytics</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Top Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          icon={Target}
          label="Total Tasks"
          value={totalTasks}
          color="#10b981"
          bgColor="bg-emerald-500/15"
          sparkData={sparkDataCompleted}
        />
        <MetricCard
          icon={Activity}
          label="In Progress"
          value={activeTasks}
          color="#f59e0b"
          bgColor="bg-amber-500/15"
          sparkData={sparkDataActive}
        />
        <MetricCard
          icon={Zap}
          label="Overdue"
          value={overdueTasks}
          color="#ef4444"
          bgColor="bg-red-500/15"
        />
        <MetricCard
          icon={TrendingUp}
          label="Completion"
          value={completionPct}
          color="#06b6d4"
          bgColor="bg-cyan-500/15"
        />
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Completion Ring */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="vl-card border rounded-xl p-4 backdrop-blur-sm"
        >
          <div className="flex items-center gap-2 mb-4">
            <Target className="size-4 text-emerald-400" />
            <h3 className="text-sm font-semibold vl-text-heading">Completion Rate</h3>
          </div>
          <div className="flex items-center justify-center py-2">
            <CircularProgressRing
              value={completionPct}
              size={130}
              strokeWidth={10}
              color="#10b981"
              label="Complete"
              sublabel={`${completedTasks} of ${totalTasks} tasks`}
            />
          </div>
          {/* Stage breakdown mini */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="text-center p-2 rounded-lg" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
              <p className="text-lg font-bold text-emerald-400 tabular-nums">{completedTasks}</p>
              <p className="text-[9px] vl-text-muted">Done</p>
            </div>
            <div className="text-center p-2 rounded-lg" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
              <p className="text-lg font-bold text-amber-400 tabular-nums">{activeTasks}</p>
              <p className="text-[9px] vl-text-muted">Active</p>
            </div>
            <div className="text-center p-2 rounded-lg" style={{ background: 'rgba(100, 116, 139, 0.1)' }}>
              <p className="text-lg font-bold vl-text-muted tabular-nums">{pendingTasks}</p>
              <p className="text-[9px] vl-text-muted">Pending</p>
            </div>
          </div>
        </motion.div>

        {/* Task Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="vl-card border rounded-xl p-4 backdrop-blur-sm"
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="size-4 text-cyan-400" />
            <h3 className="text-sm font-semibold vl-text-heading">Task Distribution</h3>
          </div>
          <div className="overflow-x-auto scrollbar-thin custom-scrollbar pb-2">
            <StackedBarChart data={barData} maxTasks={maxBarTasks} />
          </div>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Bottleneck Detection */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="vl-card border rounded-xl p-4 backdrop-blur-sm"
        >
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="size-4 text-amber-400" />
            <h3 className="text-sm font-semibold vl-text-heading">Bottleneck</h3>
          </div>
          {bottleneckStage ? (
            <div className="space-y-3">
              <div
                className="rounded-lg p-3 relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${bottleneckStage.color}15, ${bottleneckStage.color}05)`,
                  border: `1px solid ${bottleneckStage.color}30`,
                }}
              >
                <div className="absolute top-0 right-0 w-12 h-12 opacity-10 pointer-events-none" style={{ background: `radial-gradient(circle, ${bottleneckStage.color}, transparent)` }} />
                <div className="flex items-center gap-2 mb-1">
                  <Flame className="size-3.5" style={{ color: bottleneckStage.color }} />
                  <span className="text-xs font-semibold vl-text-heading">{bottleneckStage.title}</span>
                </div>
                <p className="text-[10px] vl-text-muted">
                  {bottleneckStage.tasks.length} tasks — highest load
                </p>
                <div className="mt-2 h-1.5 rounded-full bg-[var(--vl-bg-inner)] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: bottleneckStage.color }}
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
              </div>
              {stages.length > 1 && (
                <div className="space-y-1">
                  {stages
                    .filter(s => s.id !== bottleneckStage.id)
                    .sort((a, b) => b.tasks.length - a.tasks.length)
                    .slice(0, 3)
                    .map(stage => (
                      <div key={stage.id} className="flex items-center gap-2 text-[10px] vl-text-muted">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                        <span className="truncate flex-1">{stage.title}</span>
                        <span className="tabular-nums">{stage.tasks.length}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs vl-text-muted">No bottleneck detected</p>
          )}
        </motion.div>

        {/* Average Time per Stage */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="vl-card border rounded-xl p-4 backdrop-blur-sm"
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock className="size-4 text-violet-400" />
            <h3 className="text-sm font-semibold vl-text-heading">Avg. Time / Stage</h3>
          </div>
          <div className="space-y-2">
            {avgTimePerStage.map((stage, idx) => {
              const hours = Math.round(stage.avgMs / (1000 * 60 * 60) * 10) / 10
              const display = stage.avgMs === 0 ? '—' : hours < 1 ? `${Math.round(stage.avgMs / (1000 * 60))}m` : `${hours}h`
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center gap-2"
                >
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                  <span className="text-[10px] vl-text-heading flex-1 truncate">{stage.name}</span>
                  <span className="text-[10px] vl-text-muted tabular-nums font-mono">{display}</span>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Team Workload */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="vl-card border rounded-xl p-4 backdrop-blur-sm"
        >
          <div className="flex items-center gap-2 mb-4">
            <Users className="size-4 text-pink-400" />
            <h3 className="text-sm font-semibold vl-text-heading">Team Workload</h3>
          </div>
          {agentWorkloads.length > 0 ? (
            <AgentWorkloadChart agents={agentWorkloads} />
          ) : (
            <div className="flex flex-col items-center justify-center py-6">
              <Users className="size-8 vl-text-muted mb-2 opacity-30" />
              <p className="text-[11px] vl-text-muted">No agents assigned yet</p>
            </div>
          )}
          {agentWorkloads.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[var(--vl-border-subtle)] flex items-center gap-3 text-[9px] vl-text-muted">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Done</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Active</span>
              </div>
              <span className="ml-auto">{agentWorkloads.length} agent{agentWorkloads.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
