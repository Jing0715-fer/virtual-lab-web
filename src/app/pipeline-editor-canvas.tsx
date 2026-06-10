'use client'

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Trash2, GripVertical, X, CheckCircle2, Calendar,
  ChevronRight, ChevronDown, ZoomIn, ZoomOut, Maximize2,
  Edit3, AlertTriangle, CircleDot, Clock, Tag, User, MoreHorizontal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  TooltipProvider, Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { useAnimatedCounter } from './shared-hooks'
import type { PipelineStageData, PipelineTaskData } from './shared-components'
import { PRIORITY_COLORS, PRIORITY_LABELS } from './shared-components'
import { useIsMobile } from '@/hooks/use-mobile'

// ============================================================
// Types
// ============================================================

interface PipelineEditorCanvasProps {
  pipeline: {
    id: string
    name: string
    description?: string
    status: string
    stages: PipelineStageData[]
    createdAt: string
    updatedAt: string
  }
  onUpdate: (pipeline: typeof PipelineEditorCanvasProps extends { pipeline: infer P } ? P : never) => void
}

interface DragState {
  taskId: string
  task: PipelineTaskData
  sourceStageId: string
  sourceIndex: number
}

// ============================================================
// Status badge config
// ============================================================

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; label: string; icon: React.ElementType }> = {
  todo: { bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/30', label: 'Pending', icon: CircleDot },
  in_progress: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', label: 'Active', icon: Clock },
  done: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'Done', icon: CheckCircle2 },
}

// ============================================================
// Animated Counter Component
// ============================================================

function AnimatedNumber({ value, color }: { value: number; color?: string }) {
  const animated = useAnimatedCounter(value)
  return (
    <span style={color ? { color } : undefined} className="font-bold tabular-nums">
      {animated}
    </span>
  )
}

// ============================================================
// Task Card Component
// ============================================================

function TaskCard({
  task,
  onDragStart,
  onDragEnd,
  onStatusChange,
  onDelete,
  onEdit,
}: {
  task: PipelineTaskData
  onDragStart: (e: React.DragEvent, task: PipelineTaskData, index: number) => void
  onDragEnd: () => void
  onStatusChange: (taskId: string, newStatus: string) => void
  onDelete: (taskId: string) => void
  onEdit: (task: PipelineTaskData) => void
}) {
  const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo
  const StatusIcon = statusCfg.icon
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSubmitEdit = useCallback(() => {
    if (editTitle.trim() && editTitle !== task.title) {
      onEdit({ ...task, title: editTitle.trim() })
    }
    setIsEditing(false)
  }, [editTitle, task, onEdit])

  const tags = (() => { try { return JSON.parse(task.tags) } catch { return [] } })()
  const isOverdue = task.dueDate && task.status !== 'done' && new Date(task.dueDate) < new Date()

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', task.id)
        onDragStart(e, task, task.order)
      }}
      onDragEnd={onDragEnd}
      className="vl-inner rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-md group relative"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
        border: '1px solid var(--vl-border-subtle)',
      }}
    >
      {/* Drag handle */}
      <div className="absolute top-2 left-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
        <GripVertical className="size-3.5 vl-text-muted" />
      </div>

      {/* Task title */}
      <div className="flex items-start justify-between gap-1 mb-1.5 pl-3">
        {isEditing ? (
          <input
            ref={inputRef}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSubmitEdit}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitEdit(); if (e.key === 'Escape') setIsEditing(false) }}
            className="text-xs font-medium vl-text-heading bg-transparent border-b border-[var(--vl-border)] outline-none w-full py-0.5"
          />
        ) : (
          <p
            className="text-xs font-medium vl-text-heading leading-tight cursor-text flex-1"
            onClick={(e) => { e.stopPropagation(); setIsEditing(true) }}
          >
            {task.title}
          </p>
        )}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {task.status !== 'done' && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost" size="sm"
                    className="h-5 w-5 p-0 vl-text-muted hover:text-emerald-400"
                    onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, task.status === 'todo' ? 'in_progress' : 'done') }}
                  >
                    <CheckCircle2 className="size-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{task.status === 'todo' ? 'Start' : 'Complete'}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0 vl-text-muted hover:text-red-400" onClick={(e) => { e.stopPropagation(); onDelete(task.id) }}>
                  <Trash2 className="size-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {task.description && (
        <p className="text-[10px] vl-text-muted line-clamp-2 mb-2 ml-3">{task.description}</p>
      )}

      {/* Meta row */}
      <div className="flex items-center gap-2 flex-wrap ml-3">
        <div className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[task.priority] || 'bg-slate-500'}`} />
          <span className="text-[9px] vl-text-muted">{PRIORITY_LABELS[task.priority] || task.priority}</span>
        </div>

        <div className={`${statusCfg.bg} ${statusCfg.text} border ${statusCfg.border} rounded-full px-1.5 py-0 flex items-center gap-0.5`}>
          <StatusIcon className="size-2.5" />
          <span className="text-[9px]">{statusCfg.label}</span>
        </div>

        {task.assignee && (
          <div className="flex items-center gap-1">
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[7px] font-bold"
              style={{ backgroundColor: task.assignee.color || '#6366f1' }}
            >
              {task.assignee.title.charAt(0)}
            </div>
          </div>
        )}

        {task.dueDate && (
          <span className={`text-[9px] flex items-center gap-0.5 ${isOverdue ? 'text-red-400' : 'vl-text-muted'}`}>
            <Calendar className="size-2.5" />
            {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex items-center gap-1 mt-1.5 flex-wrap ml-3">
          {tags.slice(0, 3).map((tag: string, i: number) => (
            <span key={i} className="text-[8px] px-1.5 py-0.5 rounded bg-[var(--vl-bg-inner)] vl-text-muted">{tag}</span>
          ))}
          {tags.length > 3 && <span className="text-[8px] vl-text-muted">+{tags.length - 3}</span>}
        </div>
      )}
    </motion.div>
  )
}

// ============================================================
// Stage Column Component
// ============================================================

function StageColumn({
  stage,
  isDropTarget,
  dropPosition,
  onDrop,
  onDragOver,
  onDragLeave,
  onAddTask,
  onDeleteTask,
  onStatusChange,
  onEditTask,
  onDragStart,
  onDragEnd,
  onRenameStage,
  onDeleteStage,
  stageIndex,
  totalStages,
}: {
  stage: PipelineStageData
  isDropTarget: boolean
  dropPosition: 'top' | 'bottom' | null
  onDrop: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onAddTask: (stageId: string) => void
  onDeleteTask: (taskId: string) => void
  onStatusChange: (taskId: string, newStatus: string) => void
  onEditTask: (task: PipelineTaskData) => void
  onDragStart: (e: React.DragEvent, task: PipelineTaskData, index: number) => void
  onDragEnd: () => void
  onRenameStage: (stageId: string, name: string) => void
  onDeleteStage: (stageId: string) => void
  stageIndex: number
  totalStages: number
}) {
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(stage.title)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [addingTask, setAddingTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const renameRef = useRef<HTMLInputElement>(null)
  const newTaskRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isRenaming && renameRef.current) {
      renameRef.current.focus()
      renameRef.current.select()
    }
  }, [isRenaming])

  useEffect(() => {
    if (addingTask && newTaskRef.current) {
      newTaskRef.current.focus()
    }
  }, [addingTask])

  const handleRenameSubmit = useCallback(() => {
    if (renameValue.trim()) {
      onRenameStage(stage.id, renameValue.trim())
    }
    setIsRenaming(false)
  }, [renameValue, stage.id, onRenameStage])

  const handleAddTask = useCallback(() => {
    if (newTaskTitle.trim()) {
      onAddTask(stage.id)
      setNewTaskTitle('')
      setAddingTask(false)
    }
  }, [newTaskTitle, stage.id, onAddTask])

  const stageIcons = ['📋', '🔬', '🧪', '📊', '🧬', '⚙️', '🔬', '💻']
  const stageIcon = stageIcons[stageIndex % stageIcons.length]

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: stageIndex * 0.05 }}
        className="w-72 flex-shrink-0"
      >
        <div
          className={`vl-card border rounded-xl overflow-hidden transition-all duration-200 backdrop-blur-sm ${
            isDropTarget ? 'ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-500/10 scale-[1.02]' : ''
          }`}
          style={{
            borderColor: isDropTarget ? 'var(--vl-accent)' : undefined,
          }}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
        >
          {/* Stage Header */}
          <div
            className="p-3 flex items-center justify-between transition-colors"
            style={{
              background: `linear-gradient(135deg, ${stage.color}18 0%, ${stage.color}08 100%)`,
              borderBottom: `2px solid ${stage.color}40`,
            }}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-sm shrink-0">{stageIcon}</span>
              {isRenaming ? (
                <input
                  ref={renameRef}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={handleRenameSubmit}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSubmit(); if (e.key === 'Escape') setIsRenaming(false) }}
                  className="text-sm font-semibold vl-text-heading bg-transparent border-b border-[var(--vl-border)] outline-none w-full"
                />
              ) : (
                <h3
                  className="text-sm font-semibold vl-text-heading truncate cursor-text"
                  onClick={() => { setRenameValue(stage.title); setIsRenaming(true) }}
                >
                  {stage.title}
                </h3>
              )}
              <Badge
                className="text-[10px] h-5 px-1.5 shrink-0"
                style={{
                  backgroundColor: `${stage.color}20`,
                  color: stage.color,
                  borderColor: `${stage.color}40`,
                }}
                variant="outline"
              >
                {stage.tasks.length}
              </Badge>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost" size="sm"
                      className="h-6 w-6 p-0 vl-text-muted hover:text-red-400"
                      onClick={() => setShowConfirmDelete(true)}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete stage</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* Drop indicator top */}
          <AnimatePresence>
            {isDropTarget && dropPosition === 'top' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 3, opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mx-2 mt-2 rounded-full overflow-hidden"
                style={{ backgroundColor: 'var(--vl-accent)' }}
              />
            )}
          </AnimatePresence>

          {/* Task List */}
          <div className="p-2 space-y-2 max-h-[420px] overflow-y-auto scrollbar-thin custom-scrollbar">
            {stage.tasks.length === 0 ? (
              <div className={`py-6 text-center rounded-lg transition-colors ${
                isDropTarget ? 'bg-emerald-500/10 border border-dashed border-emerald-500/30' : ''
              }`}>
                <p className="text-[11px] vl-text-muted">
                  {isDropTarget ? 'Drop task here' : 'No tasks yet'}
                </p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {stage.tasks.map((task, idx) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    onStatusChange={onStatusChange}
                    onDelete={onDeleteTask}
                    onEdit={onEditTask}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Drop indicator bottom */}
          <AnimatePresence>
            {isDropTarget && dropPosition === 'bottom' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 3, opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mx-2 mb-2 rounded-full overflow-hidden"
                style={{ backgroundColor: 'var(--vl-accent)' }}
              />
            )}
          </AnimatePresence>

          {/* Add Task */}
          <div className="p-2 border-t" style={{ borderColor: 'var(--vl-border)' }}>
            <AnimatePresence mode="wait">
              {addingTask ? (
                <motion.div
                  key="add-form"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5"
                >
                  <input
                    ref={newTaskRef}
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddTask(); if (e.key === 'Escape') setAddingTask(false) }}
                    placeholder="Task title..."
                    className="w-full text-xs bg-transparent border border-[var(--vl-border)] rounded-md px-2 py-1.5 outline-none vl-text-heading placeholder:text-[var(--vl-text-muted)] focus:border-emerald-500/50 transition-colors"
                  />
                  <div className="flex items-center gap-1">
                    <Button size="sm" className="h-6 text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 px-2" onClick={handleAddTask}>
                      <Plus className="size-3 mr-0.5" /> Add
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] vl-text-muted px-2" onClick={() => setAddingTask(false)}>
                      Cancel
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="add-btn"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full vl-text-muted hover:text-emerald-400 hover:bg-emerald-500/10 justify-start text-xs h-8"
                    onClick={() => setAddingTask(true)}
                  >
                    <Plus className="size-3 mr-1" /> Add task
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Connection arrow */}
          {stageIndex < totalStages - 1 && (
            <div className="flex justify-center py-1" style={{ borderTop: `1px solid var(--vl-border-subtle)` }}>
              <ChevronRight className="size-4 vl-text-muted" style={{ color: `${stage.color}60` }} />
            </div>
          )}
        </div>
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showConfirmDelete} onOpenChange={setShowConfirmDelete}>
        <DialogContent className="vl-dialog sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="vl-text-heading">Delete Stage</DialogTitle>
            <DialogDescription className="vl-text-muted">
              Are you sure you want to delete &quot;{stage.title}&quot; and all its {stage.tasks.length} task(s)?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConfirmDelete(false)} className="vl-text-muted">Cancel</Button>
            <Button className="bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30" onClick={() => { onDeleteStage(stage.id); setShowConfirmDelete(false) }}>
              <Trash2 className="size-3 mr-1" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ============================================================
// Mobile Stage Accordion Component
// ============================================================

function MobileStageAccordion({
  stage,
  onAddTask,
  onDeleteTask,
  onStatusChange,
  onEditTask,
  onDragStart,
  onDragEnd,
  onRenameStage,
  onDeleteStage,
  isOpen,
  onToggle,
}: {
  stage: PipelineStageData
  onAddTask: (stageId: string) => void
  onDeleteTask: (taskId: string) => void
  onStatusChange: (taskId: string, newStatus: string) => void
  onEditTask: (task: PipelineTaskData) => void
  onDragStart: (e: React.DragEvent, task: PipelineTaskData, index: number) => void
  onDragEnd: () => void
  onRenameStage: (stageId: string, name: string) => void
  onDeleteStage: (stageId: string) => void
  isOpen: boolean
  onToggle: () => void
}) {
  const [addingTask, setAddingTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')

  const handleAddTask = useCallback(() => {
    if (newTaskTitle.trim()) {
      onAddTask(stage.id)
      setNewTaskTitle('')
      setAddingTask(false)
    }
  }, [newTaskTitle, stage.id, onAddTask])

  return (
    <div className="border rounded-xl overflow-hidden vl-card">
      <button
        onClick={onToggle}
        className="w-full p-3 flex items-center justify-between"
        style={{
          background: `linear-gradient(135deg, ${stage.color}18 0%, ${stage.color}08 100%)`,
          borderBottom: isOpen ? `2px solid ${stage.color}40` : 'none',
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
          <h3 className="text-sm font-semibold vl-text-heading">{stage.title}</h3>
          <Badge className="text-[10px] h-5 px-1.5" style={{ backgroundColor: `${stage.color}20`, color: stage.color }} variant="outline">
            {stage.tasks.length}
          </Badge>
        </div>
        {isOpen ? <ChevronDown className="size-4 vl-text-muted" /> : <ChevronRight className="size-4 vl-text-muted" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-2 space-y-2 max-h-[300px] overflow-y-auto">
              {stage.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  onStatusChange={onStatusChange}
                  onDelete={onDeleteTask}
                  onEdit={onEditTask}
                />
              ))}
              {stage.tasks.length === 0 && (
                <p className="text-[11px] vl-text-muted text-center py-4">No tasks yet</p>
              )}
            </div>
            <div className="p-2 border-t" style={{ borderColor: 'var(--vl-border)' }}>
              <AnimatePresence mode="wait">
                {addingTask ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-1.5">
                    <input
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddTask(); if (e.key === 'Escape') setAddingTask(false) }}
                      placeholder="Task title..."
                      className="w-full text-xs bg-transparent border border-[var(--vl-border)] rounded-md px-2 py-1.5 outline-none vl-text-heading placeholder:text-[var(--vl-text-muted)]"
                      autoFocus
                    />
                    <div className="flex gap-1">
                      <Button size="sm" className="h-6 text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2" onClick={handleAddTask}>
                        <Plus className="size-3 mr-0.5" /> Add
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] vl-text-muted px-2" onClick={() => setAddingTask(false)}>
                        Cancel
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <Button variant="ghost" size="sm" className="w-full vl-text-muted hover:text-emerald-400 hover:bg-emerald-500/10 justify-start text-xs h-8" onClick={() => setAddingTask(true)}>
                    <Plus className="size-3 mr-1" /> Add task
                  </Button>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================
// Pipeline Editor Canvas Main Component
// ============================================================

export default function PipelineEditorCanvas({ pipeline, onUpdate }: PipelineEditorCanvasProps) {
  const [zoom, setZoom] = useState(1)
  const isMobile = useIsMobile()
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [dropPosition, setDropPosition] = useState<'top' | 'bottom' | null>(null)
  const [openMobileStages, setOpenMobileStages] = useState<Set<string>>(new Set())
  const [addingStage, setAddingStage] = useState(false)
  const [newStageName, setNewStageName] = useState('')
  const [pendingTaskTitle, setPendingTaskTitle] = useState('')
  const [pendingTaskStageId, setPendingTaskStageId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const stages = useMemo(() => {
    return [...pipeline.stages].sort((a, b) => a.order - b.order)
  }, [pipeline.stages])

  // All tasks flattened
  const allTasks = useMemo(() => {
    return stages.flatMap(s => s.tasks)
  }, [stages])

  // Stats
  const totalTasks = allTasks.length
  const completedTasks = allTasks.filter(t => t.status === 'done').length
  const activeTasks = allTasks.filter(t => t.status === 'in_progress').length
  const completionPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // ─── Drag handlers ───
  const handleDragStart = useCallback((e: React.DragEvent, task: PipelineTaskData, index: number) => {
    // Find source stage
    const sourceStage = stages.find(s => s.tasks.some(t => t.id === task.id))
    if (!sourceStage) return
    setDragState({
      taskId: task.id,
      task,
      sourceStageId: sourceStage.id,
      sourceIndex: index,
    })
  }, [stages])

  const handleDragEnd = useCallback(() => {
    setDragState(null)
    setDropTarget(null)
    setDropPosition(null)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, stageId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTarget(stageId)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    setDropPosition(e.clientY < midY ? 'top' : 'bottom')
  }, [])

  const handleDragLeave = useCallback(() => {
    setDropTarget(null)
    setDropPosition(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, targetStageId: string) => {
    e.preventDefault()
    if (!dragState || dragState.sourceStageId === targetStageId) {
      setDragState(null)
      setDropTarget(null)
      setDropPosition(null)
      return
    }

    const updatedStages = pipeline.stages.map(stage => {
      if (stage.id === dragState.sourceStageId) {
        return { ...stage, tasks: stage.tasks.filter(t => t.id !== dragState.taskId) }
      }
      if (stage.id === targetStageId) {
        const newTask = { ...dragState.task, stageId: targetStageId }
        if (dropPosition === 'top') {
          return { ...stage, tasks: [newTask, ...stage.tasks] }
        }
        return { ...stage, tasks: [...stage.tasks, newTask] }
      }
      return stage
    })

    onUpdate({ ...pipeline, stages: updatedStages })
    setDragState(null)
    setDropTarget(null)
    setDropPosition(null)
  }, [dragState, dropPosition, pipeline, onUpdate])

  // ─── Task handlers ───
  const handleAddTask = useCallback((stageId: string) => {
    setPendingTaskStageId(stageId)
    // The effect above will handle creating the task
  }, [])

  const handleAddTaskConfirm = useCallback((stageId: string, title: string) => {
    const updatedStages = pipeline.stages.map(stage => {
      if (stage.id === stageId) {
        const newTask: PipelineTaskData = {
          id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          title,
          description: '',
          status: 'todo',
          priority: 'medium',
          order: stage.tasks.length,
          stageId,
          assigneeId: null,
          assignee: null,
          meetingId: null,
          dueDate: null,
          tags: '[]',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        return { ...stage, tasks: [...stage.tasks, newTask] }
      }
      return stage
    })
    onUpdate({ ...pipeline, stages: updatedStages })
  }, [pipeline, onUpdate])

  const handleDeleteTask = useCallback((taskId: string) => {
    const updatedStages = pipeline.stages.map(stage => ({
      ...stage,
      tasks: stage.tasks.filter(t => t.id !== taskId),
    }))
    onUpdate({ ...pipeline, stages: updatedStages })
  }, [pipeline, onUpdate])

  const handleStatusChange = useCallback((taskId: string, newStatus: string) => {
    const updatedStages = pipeline.stages.map(stage => ({
      ...stage,
      tasks: stage.tasks.map(t => t.id === taskId ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t),
    }))
    onUpdate({ ...pipeline, stages: updatedStages })
  }, [pipeline, onUpdate])

  const handleEditTask = useCallback((task: PipelineTaskData) => {
    const updatedStages = pipeline.stages.map(stage => ({
      ...stage,
      tasks: stage.tasks.map(t => t.id === task.id ? { ...task, updatedAt: new Date().toISOString() } : t),
    }))
    onUpdate({ ...pipeline, stages: updatedStages })
  }, [pipeline, onUpdate])

  // ─── Stage handlers ───
  const handleRenameStage = useCallback((stageId: string, name: string) => {
    const updatedStages = pipeline.stages.map(s =>
      s.id === stageId ? { ...s, title: name, updatedAt: new Date().toISOString() } : s
    )
    onUpdate({ ...pipeline, stages: updatedStages })
  }, [pipeline, onUpdate])

  const handleDeleteStage = useCallback((stageId: string) => {
    const updatedStages = pipeline.stages.filter(s => s.id !== stageId)
    onUpdate({ ...pipeline, stages: updatedStages })
  }, [pipeline, onUpdate])

  const handleAddStage = useCallback(() => {
    if (!newStageName.trim()) return
    const stageColors = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316']
    const newStage: PipelineStageData = {
      id: `stage-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      title: newStageName.trim(),
      order: stages.length,
      color: stageColors[stages.length % stageColors.length],
      pipelineId: pipeline.id,
      tasks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    onUpdate({ ...pipeline, stages: [...pipeline.stages, newStage] })
    setNewStageName('')
    setAddingStage(false)
  }, [newStageName, stages.length, pipeline, onUpdate])

  const handleMobileStageToggle = useCallback((stageId: string) => {
    setOpenMobileStages(prev => {
      const next = new Set(prev)
      if (next.has(stageId)) next.delete(stageId)
      else next.add(stageId)
      return next
    })
  }, [])

  // ─── Zoom handlers ───
  const handleZoomIn = useCallback(() => setZoom(prev => Math.min(prev + 0.1, 1.5)), [])
  const handleZoomOut = useCallback(() => setZoom(prev => Math.max(prev - 0.1, 0.5)), [])
  const handleResetZoom = useCallback(() => setZoom(1), [])

  // ─── Drag ghost (custom ghost via drag image) ───
  useEffect(() => {
    if (dragState) {
      document.body.style.cursor = 'grabbing'
      document.body.style.userSelect = 'none'
    }
    return () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [dragState])

  return (
    <div className="space-y-3">
      {/* Header & Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-base font-semibold vl-text-heading">{pipeline.name}</h2>
            {pipeline.description && (
              <p className="text-[11px] vl-text-muted mt-0.5">{pipeline.description}</p>
            )}
          </div>
        </div>

        {/* Stats summary */}
        <div className="flex items-center gap-3 text-[11px] vl-text-muted">
          <div className="flex items-center gap-1">
            <span>Total:</span>
            <AnimatedNumber value={totalTasks} />
          </div>
          <div className="flex items-center gap-1 text-amber-400">
            <Clock className="size-3" />
            <AnimatedNumber value={activeTasks} />
          </div>
          <div className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="size-3" />
            <AnimatedNumber value={completedTasks} />
          </div>
          <div className="hidden sm:flex items-center gap-1">
            <div className="w-16 h-1.5 rounded-full bg-[var(--vl-bg-inner)] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${completionPct}%` }}
                transition={{ duration: 0.6 }}
              />
            </div>
            <span className="text-emerald-400 font-medium">{completionPct}%</span>
          </div>
        </div>

        {/* Zoom controls */}
        {!isMobile && (
          <div className="flex items-center gap-1 vl-inner rounded-lg px-1.5 py-1 border border-[var(--vl-border-subtle)]">
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 vl-text-muted hover:text-emerald-400" onClick={handleZoomOut} disabled={zoom <= 0.5}>
              <ZoomOut className="size-3" />
            </Button>
            <span className="text-[10px] vl-text-muted w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 vl-text-muted hover:text-emerald-400" onClick={handleZoomIn} disabled={zoom >= 1.5}>
              <ZoomIn className="size-3" />
            </Button>
            <div className="w-px h-4 bg-[var(--vl-border)] mx-0.5" />
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 vl-text-muted hover:text-emerald-400" onClick={handleResetZoom}>
              <Maximize2 className="size-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Mobile: Accordion view */}
      {isMobile ? (
        <div className="space-y-2">
          {stages.map(stage => (
            <MobileStageAccordion
              key={stage.id}
              stage={stage}
              isOpen={openMobileStages.has(stage.id)}
              onToggle={() => handleMobileStageToggle(stage.id)}
              onAddTask={(stageId) => {
                // Create a temp title for mobile - in real use this opens a dialog
                const title = prompt('Enter task title:')
                if (title?.trim()) handleAddTaskConfirm(stageId, title.trim())
              }}
              onDeleteTask={handleDeleteTask}
              onStatusChange={handleStatusChange}
              onEditTask={handleEditTask}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onRenameStage={handleRenameStage}
              onDeleteStage={handleDeleteStage}
            />
          ))}

          {/* Add Stage (mobile) */}
          <AnimatePresence>
            {addingStage ? (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="border rounded-xl p-3 vl-card space-y-2">
                <input
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddStage(); if (e.key === 'Escape') setAddingStage(false) }}
                  placeholder="Stage name..."
                  className="w-full text-sm bg-transparent border border-[var(--vl-border)] rounded-md px-3 py-2 outline-none vl-text-heading placeholder:text-[var(--vl-text-muted)]"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30" onClick={handleAddStage}>
                    <Plus className="size-3 mr-1" /> Add Stage
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setAddingStage(false)}>Cancel</Button>
                </div>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Button variant="outline" className="w-full border-dashed vl-text-muted hover:text-emerald-400 hover:border-emerald-500/30" onClick={() => setAddingStage(true)}>
                  <Plus className="size-3 mr-1" /> Add Stage
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* Desktop: Horizontal scroll canvas */
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin custom-scrollbar"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
          }}
        >
          {stages.map((stage, idx) => (
            <StageColumn
              key={stage.id}
              stage={stage}
              isDropTarget={dropTarget === stage.id}
              dropPosition={dropTarget === stage.id ? dropPosition : null}
              onDrop={(e) => handleDrop(e, stage.id)}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onAddTask={(stageId) => {
                // Create a temp task for the inline form approach
                const title = prompt('Enter task title:')
                if (title?.trim()) handleAddTaskConfirm(stageId, title.trim())
              }}
              onDeleteTask={handleDeleteTask}
              onStatusChange={handleStatusChange}
              onEditTask={handleEditTask}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onRenameStage={handleRenameStage}
              onDeleteStage={handleDeleteStage}
              stageIndex={idx}
              totalStages={stages.length}
            />
          ))}

          {/* Add Stage Column */}
          <AnimatePresence>
            {addingStage ? (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 288 }}
                exit={{ opacity: 0, width: 0 }}
                className="w-72 flex-shrink-0"
              >
                <div className="vl-card border border-dashed border-emerald-500/30 rounded-xl p-4 space-y-3">
                  <h3 className="text-sm font-medium vl-text-heading">New Stage</h3>
                  <input
                    value={newStageName}
                    onChange={(e) => setNewStageName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddStage(); if (e.key === 'Escape') setAddingStage(false) }}
                    placeholder="Stage name..."
                    className="w-full text-xs bg-transparent border border-[var(--vl-border)] rounded-md px-2 py-1.5 outline-none vl-text-heading placeholder:text-[var(--vl-text-muted)] focus:border-emerald-500/50 transition-colors"
                    autoFocus
                  />
                  <div className="flex gap-1.5">
                    <Button size="sm" className="h-7 text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 px-2" onClick={handleAddStage}>
                      <Plus className="size-3 mr-0.5" /> Add
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-[10px] vl-text-muted px-2" onClick={() => setAddingStage(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-72 flex-shrink-0"
              >
                <button
                  onClick={() => setAddingStage(true)}
                  className="w-full h-full min-h-[200px] border-2 border-dashed rounded-xl vl-card flex flex-col items-center justify-center gap-2 transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/5 group"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                    <Plus className="size-5 text-emerald-400" />
                  </div>
                  <span className="text-xs vl-text-muted group-hover:text-emerald-400 transition-colors">Add Stage</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Spacer for scroll */}
          <div className="w-4 flex-shrink-0" />
        </div>
      )}

      {/* Drag overlay ghost indicator */}
      {dragState && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="vl-card border rounded-lg px-3 py-2 shadow-xl backdrop-blur-md flex items-center gap-2"
            style={{
              background: 'rgba(16, 185, 129, 0.1)',
              borderColor: 'var(--vl-accent)',
            }}
          >
            <GripVertical className="size-3 text-emerald-400" />
            <span className="text-xs vl-text-heading">{dragState.task.title}</span>
            <span className="text-[9px] vl-text-muted">→ Moving</span>
          </motion.div>
        </div>
      )}
    </div>
  )
}
