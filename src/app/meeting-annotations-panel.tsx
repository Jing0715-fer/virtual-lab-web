'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Highlighter, MessageSquare, Bookmark, Tag, Smile, X, ChevronDown,
  ChevronRight, Filter, Plus, Trash2, Search, Download, FileText,
  CheckSquare, Star, Clock, User, ArrowDownToLine, BookOpen,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

// ============================================================
// Types
// ============================================================

export type MeetingAnnotationType = 'highlight' | 'comment' | 'bookmark' | 'tag' | 'reaction'

export type HighlightColor = 'yellow' | 'emerald' | 'orange' | 'red'

export interface MeetingAnnotation {
  id: string
  type: MeetingAnnotationType
  messageId: string
  color?: HighlightColor
  text?: string
  comment?: string
  tagName?: string
  tagColor?: string
  reaction?: string
  createdAt: string
  authorName: string
}

interface MeetingMessage {
  id: string
  agentName: string
  content: string
  roundIndex: number
}

export interface MeetingAnnotationsPanelProps {
  meetingId: string
  messages: MeetingMessage[]
  isOpen: boolean
  onClose: () => void
  onAnnotationChange?: (messageId: string, annotations: MeetingAnnotation[]) => void
}

// ============================================================
// Constants
// ============================================================

const STORAGE_KEY_PREFIX = 'vl-meeting-annotations-'

const HIGHLIGHT_COLORS: Record<HighlightColor, string> = {
  yellow: '#eab308',
  emerald: '#10b981',
  orange: '#f97316',
  red: '#ef4444',
}

const TAG_OPTIONS = [
  { label: 'Key Insight', value: 'key-insight', color: '#10b981' },
  { label: 'Action Item', value: 'action-item', color: '#f59e0b' },
  { label: 'Question', value: 'question', color: '#06b6d4' },
  { label: 'Follow-up', value: 'follow-up', color: '#8b5cf6' },
  { label: 'Important', value: 'important', color: '#ef4444' },
  { label: 'Idea', value: 'idea', color: '#ec4899' },
  { label: 'Decision', value: 'decision', color: '#3b82f6' },
  { label: 'Note', value: 'note', color: '#64748b' },
]

const REACTION_OPTIONS = [
  { emoji: '👍', label: 'Thumbs up' },
  { emoji: '❗', label: 'Important' },
  { emoji: '💡', label: 'Insight' },
  { emoji: '🎯', label: 'On target' },
  { emoji: '✅', label: 'Verified' },
  { emoji: '❓', label: 'Question' },
]

const TYPE_CONFIG: Record<MeetingAnnotationType, { icon: typeof Highlighter; color: string; label: string }> = {
  highlight: { icon: Highlighter, color: '#eab308', label: 'Highlight' },
  comment: { icon: MessageSquare, color: '#3b82f6', label: 'Comment' },
  bookmark: { icon: Bookmark, color: '#f59e0b', label: 'Bookmark' },
  tag: { icon: Tag, color: '#8b5cf6', label: 'Tag' },
  reaction: { icon: Smile, color: '#ec4899', label: 'Reaction' },
}

// ============================================================
// Helpers
// ============================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function loadAnnotations(meetingId: string): Record<string, MeetingAnnotation[]> {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${meetingId}`)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function saveAnnotations(meetingId: string, data: Record<string, MeetingAnnotation[]>) {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${meetingId}`, JSON.stringify(data))
  } catch { /* ignore */ }
}

// ============================================================
// Summary Types & Helpers
// ============================================================

function generateSummaryText(annotations: MeetingAnnotation[], messages: MeetingMessage[]): string {
  const lines: string[] = []
  lines.push(`=== Meeting Annotations Summary ===`)
  lines.push(`Generated: ${new Date().toLocaleString()}`)
  lines.push('')

  const bookmarks = annotations.filter(a => a.type === 'bookmark')
  if (bookmarks.length > 0) {
    lines.push(`--- Bookmarks (${bookmarks.length}) ---`)
    bookmarks.forEach(a => {
      const msg = messages.find(m => m.id === a.messageId)
      lines.push(`  [${msg?.agentName || 'Unknown'}] ${a.text || msg?.content?.substring(0, 80) || 'N/A'}`)
    })
    lines.push('')
  }

  const keyInsights = annotations.filter(a => a.type === 'tag' && a.tagName === 'key-insight')
  if (keyInsights.length > 0) {
    lines.push(`--- Key Insights (${keyInsights.length}) ---`)
    keyInsights.forEach(a => {
      const msg = messages.find(m => m.id === a.messageId)
      lines.push(`  [${msg?.agentName || 'Unknown'}] ${msg?.content?.substring(0, 120) || 'N/A'}`)
    })
    lines.push('')
  }

  const actionItems = annotations.filter(a => a.type === 'tag' && a.tagName === 'action-item')
  if (actionItems.length > 0) {
    lines.push(`--- Action Items (${actionItems.length}) ---`)
    actionItems.forEach(a => {
      const msg = messages.find(m => m.id === a.messageId)
      lines.push(`  [${msg?.agentName || 'Unknown'}] ${msg?.content?.substring(0, 120) || 'N/A'}`)
    })
    lines.push('')
  }

  const questions = annotations.filter(a => a.type === 'tag' && a.tagName === 'question')
  if (questions.length > 0) {
    lines.push(`--- Questions (${questions.length}) ---`)
    questions.forEach(a => {
      const msg = messages.find(m => m.id === a.messageId)
      lines.push(`  [${msg?.agentName || 'Unknown'}] ${msg?.content?.substring(0, 120) || 'N/A'}`)
    })
    lines.push('')
  }

  const comments = annotations.filter(a => a.type === 'comment')
  if (comments.length > 0) {
    lines.push(`--- Comments (${comments.length}) ---`)
    comments.forEach(a => {
      const msg = messages.find(m => m.id === a.messageId)
      lines.push(`  [${msg?.agentName || 'Unknown'}] "${a.comment}" — ${a.text || msg?.content?.substring(0, 60) || ''}`)
    })
    lines.push('')
  }

  return lines.join('\n')
}

// ============================================================
// Hook: useMeetingAnnotations
// ============================================================

export function useMeetingAnnotations(meetingId: string) {
  const [annotations, setAnnotations] = useState<Record<string, MeetingAnnotation[]>>({})
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => {
      setMounted(true)
      setAnnotations(loadAnnotations(meetingId))
    })
  }, [meetingId])

  const addAnnotation = useCallback((messageId: string, annotation: Omit<MeetingAnnotation, 'id' | 'createdAt' | 'authorName'>) => {
    setAnnotations(prev => {
      const existing = prev[messageId] || []
      const newAnnotation: MeetingAnnotation = {
        ...annotation,
        id: generateId(),
        createdAt: new Date().toISOString(),
        authorName: 'You',
      }
      const next = { ...prev, [messageId]: [...existing, newAnnotation] }
      saveAnnotations(meetingId, next)
      return next
    })
  }, [meetingId])

  const removeAnnotation = useCallback((messageId: string, annotationId: string) => {
    setAnnotations(prev => {
      const existing = prev[messageId] || []
      const next = { ...prev, [messageId]: existing.filter(a => a.id !== annotationId) }
      if (next[messageId].length === 0) delete next[messageId]
      saveAnnotations(meetingId, next)
      return next
    })
  }, [meetingId])

  const getMessageAnnotations = useCallback((messageId: string): MeetingAnnotation[] => {
    return annotations[messageId] || []
  }, [annotations])

  const clearAll = useCallback(() => {
    setAnnotations({})
    saveAnnotations(meetingId, {})
  }, [meetingId])

  const exportJSON = useCallback(() => {
    const data = JSON.stringify(annotations, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `annotations-${meetingId}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [annotations, meetingId])

  const totalCount = useMemo(() => {
    return Object.values(annotations).reduce((sum, arr) => sum + arr.length, 0)
  }, [annotations])

  const annotationsByType = useMemo(() => {
    const grouped: Record<MeetingAnnotationType, number> = {
      highlight: 0, comment: 0, bookmark: 0, tag: 0, reaction: 0,
    }
    Object.values(annotations).forEach(arr => {
      arr.forEach(a => { grouped[a.type]++ })
    })
    return grouped
  }, [annotations])

  return {
    annotations, addAnnotation, removeAnnotation, getMessageAnnotations,
    clearAll, exportJSON, totalCount, annotationsByType, mounted,
  }
}

// ============================================================
// MessageAnnotationBar: Inline annotation controls for a message
// ============================================================

export function MessageAnnotationBar({
  messageId,
  annotations,
  onAdd,
  onRemove,
  onBookmark,
  isBookmarked,
}: {
  messageId: string
  annotations: MeetingAnnotation[]
  onAdd: (messageId: string, annotation: Omit<MeetingAnnotation, 'id' | 'createdAt' | 'authorName'>) => void
  onRemove: (messageId: string, annotationId: string) => void
  onBookmark: (messageId: string) => void
  isBookmarked: boolean
}) {
  const [activePopup, setActivePopup] = useState<MeetingAnnotationType | null>(null)

  const highlightAnnotations = annotations.filter(a => a.type === 'highlight')
  const commentAnnotations = annotations.filter(a => a.type === 'comment')
  const tagAnnotations = annotations.filter(a => a.type === 'tag')
  const reactionAnnotations = annotations.filter(a => a.type === 'reaction')

  return (
    <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      {/* Highlight color picker */}
      <Popover open={activePopup === 'highlight'} onOpenChange={(open) => setActivePopup(open ? 'highlight' : null)}>
        <PopoverTrigger asChild>
          <button
            className="p-0.5 rounded hover:bg-[var(--vl-bg-inner)] transition-colors vl-text-muted hover:text-amber-400"
            aria-label="Highlight"
          >
            <Highlighter className="size-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2 vl-dialog" align="start" side="top">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] vl-text-muted mr-1">Color:</span>
            {(Object.entries(HIGHLIGHT_COLORS) as [HighlightColor, string][]).map(([color, hex]) => (
              <button
                key={color}
                onClick={() => {
                  onAdd(messageId, { type: 'highlight', messageId, color, text: '' })
                  setActivePopup(null)
                }}
                className={`w-5 h-5 rounded-full border-2 transition-all hover:scale-110`}
                style={{
                  backgroundColor: hex,
                  borderColor: highlightAnnotations.some(a => a.color === color) ? hex : 'transparent',
                }}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Add comment */}
      <Popover open={activePopup === 'comment'} onOpenChange={(open) => setActivePopup(open ? 'comment' : null)}>
        <PopoverTrigger asChild>
          <button className="p-0.5 rounded hover:bg-[var(--vl-bg-inner)] transition-colors vl-text-muted hover:text-blue-400" aria-label="Comment">
            <MessageSquare className="size-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 vl-dialog" align="start" side="top">
          <CommentInput
            onSubmit={(text) => {
              onAdd(messageId, { type: 'comment', messageId, comment: text })
              setActivePopup(null)
            }}
            placeholder="Add a comment..."
          />
        </PopoverContent>
      </Popover>

      {/* Bookmark toggle */}
      <button
        onClick={() => onBookmark(messageId)}
        className={`p-0.5 rounded transition-colors ${isBookmarked ? 'text-amber-400' : 'vl-text-muted hover:text-amber-400 hover:bg-[var(--vl-bg-inner)]'}`}
        aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
      >
        <Bookmark className={`size-3 ${isBookmarked ? 'fill-amber-400' : ''}`} />
      </button>

      {/* Tag picker */}
      <Popover open={activePopup === 'tag'} onOpenChange={(open) => setActivePopup(open ? 'tag' : null)}>
        <PopoverTrigger asChild>
          <button className="p-0.5 rounded hover:bg-[var(--vl-bg-inner)] transition-colors vl-text-muted hover:text-violet-400" aria-label="Add tag">
            <Tag className="size-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2 vl-dialog" align="start" side="top">
          <div className="flex flex-wrap gap-1">
            {TAG_OPTIONS.map(tag => {
              const active = tagAnnotations.some(a => a.tagName === tag.value)
              return (
                <button
                  key={tag.value}
                  onClick={() => {
                    if (active) {
                      const existing = tagAnnotations.find(a => a.tagName === tag.value)
                      if (existing) onRemove(messageId, existing.id)
                    } else {
                      onAdd(messageId, { type: 'tag', messageId, tagName: tag.value, tagColor: tag.color })
                    }
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors border ${
                    active
                      ? 'border-current'
                      : 'border-transparent vl-text-muted hover:text-white'
                  }`}
                  style={active ? { color: tag.color, backgroundColor: `${tag.color}15` } : {}}
                >
                  {tag.label}
                </button>
              )
            })}
          </div>
        </PopoverContent>
      </Popover>

      {/* Reaction picker */}
      <Popover open={activePopup === 'reaction'} onOpenChange={(open) => setActivePopup(open ? 'reaction' : null)}>
        <PopoverTrigger asChild>
          <button className="p-0.5 rounded hover:bg-[var(--vl-bg-inner)] transition-colors vl-text-muted hover:text-pink-400" aria-label="React">
            <Smile className="size-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2 vl-dialog" align="start" side="top">
          <div className="flex items-center gap-1">
            {REACTION_OPTIONS.map(r => {
              const active = reactionAnnotations.some(a => a.reaction === r.emoji)
              return (
                <button
                  key={r.emoji}
                  onClick={() => {
                    if (active) {
                      const existing = reactionAnnotations.find(a => a.reaction === r.emoji)
                      if (existing) onRemove(messageId, existing.id)
                    } else {
                      onAdd(messageId, { type: 'reaction', messageId, reaction: r.emoji })
                    }
                  }}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg text-base transition-all hover:scale-125 ${
                    active ? 'bg-[var(--vl-bg-inner)] ring-1 ring-[var(--vl-border)]' : ''
                  }`}
                  title={r.label}
                >
                  {r.emoji}
                </button>
              )
            })}
          </div>
        </PopoverContent>
      </Popover>

      {/* Visual indicators row */}
      <div className="flex items-center gap-1 ml-1">
        {/* Comment count badge */}
        {commentAnnotations.length > 0 && (
          <Badge variant="secondary" className="text-[9px] px-1 h-4 bg-blue-500/15 text-blue-400 border-blue-500/30">
            {commentAnnotations.length}
          </Badge>
        )}
        {/* Reactions */}
        {reactionAnnotations.length > 0 && (
          <div className="flex items-center gap-0">
            {Array.from(new Set(reactionAnnotations.map(r => r.reaction))).map(emoji => (
              <span key={emoji} className="text-[11px]">{emoji}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// CommentInput
// ============================================================

function CommentInput({ onSubmit, placeholder }: { onSubmit: (text: string) => void; placeholder?: string }) {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && text.trim()) {
      onSubmit(text.trim())
      setText('')
    }
    if (e.key === 'Escape') setText('')
  }

  return (
    <div className="flex items-center gap-1.5">
      <Input
        ref={inputRef}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || 'Add comment...'}
        className="h-7 text-xs vl-input"
      />
      <Button
        size="sm"
        className="h-7 px-2"
        disabled={!text.trim()}
        onClick={() => { if (text.trim()) { onSubmit(text.trim()); setText('') } }}
      >
        <Plus className="size-3" />
      </Button>
    </div>
  )
}

// ============================================================
// AnnotationListPanel: The sidebar/bottom panel listing all annotations
// ============================================================

function AnnotationListPanel({
  annotations,
  messages,
  typeFilter,
  searchQuery,
  onTypeFilterChange,
  onSearchChange,
  onRemove,
  onScrollToMessage,
}: {
  annotations: Record<string, MeetingAnnotation[]>
  messages: MeetingMessage[]
  typeFilter: MeetingAnnotationType | 'all'
  searchQuery: string
  onTypeFilterChange: (f: MeetingAnnotationType | 'all') => void
  onSearchChange: (q: string) => void
  onRemove: (messageId: string, annotationId: string) => void
  onScrollToMessage: (messageId: string) => void
}) {
  const allAnnotations = useMemo(() => {
    const flat: (MeetingAnnotation & { _msg?: MeetingMessage })[] = []
    Object.entries(annotations).forEach(([messageId, anns]) => {
      const msg = messages.find(m => m.id === messageId)
      anns.forEach(a => flat.push({ ...a, _msg: msg }))
    })
    flat.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return flat
  }, [annotations, messages])

  const filtered = useMemo(() => {
    let result = allAnnotations
    if (typeFilter !== 'all') result = result.filter(a => a.type === typeFilter)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(a =>
        (a.text || '').toLowerCase().includes(q) ||
        (a.comment || '').toLowerCase().includes(q) ||
        (a.tagName || '').toLowerCase().includes(q) ||
        (a.reaction || '').includes(q) ||
        (a._msg?.agentName || '').toLowerCase().includes(q) ||
        (a._msg?.content || '').toLowerCase().includes(q)
      )
    }
    return result
  }, [allAnnotations, typeFilter, searchQuery])

  // Group by type
  const grouped = useMemo(() => {
    const groups: Partial<Record<MeetingAnnotationType, typeof filtered>> = {}
    filtered.forEach(a => {
      if (!groups[a.type]) groups[a.type] = []
      groups[a.type]!.push(a)
    })
    return groups
  }, [filtered])

  const counts = useMemo(() => {
    const c: Record<string, number> = { highlight: 0, comment: 0, bookmark: 0, tag: 0, reaction: 0 }
    allAnnotations.forEach(a => { c[a.type]++ })
    return c
  }, [allAnnotations])

  return (
    <div className="flex flex-col h-full">
      {/* Search + Filter */}
      <div className="px-3 py-2 border-b border-[var(--vl-border-subtle)] space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3 vl-text-muted" />
            <Input
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="Search annotations..."
              className="h-7 text-xs pl-8 vl-input"
            />
          </div>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          <button
            onClick={() => onTypeFilterChange('all')}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors whitespace-nowrap ${
              typeFilter === 'all' ? 'bg-emerald-500/15 text-emerald-400' : 'vl-text-muted hover:text-white hover:bg-[var(--vl-bg-inner)]'
            }`}
          >
            All ({allAnnotations.length})
          </button>
          {(Object.entries(TYPE_CONFIG) as [MeetingAnnotationType, typeof TYPE_CONFIG[MeetingAnnotationType]][]).map(([type, config]) => (
            <button
              key={type}
              onClick={() => onTypeFilterChange(type)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors whitespace-nowrap flex items-center gap-0.5 ${
                typeFilter === type
                  ? 'ring-1'
                  : 'vl-text-muted hover:text-white hover:bg-[var(--vl-bg-inner)]'
              }`}
              style={typeFilter === type ? { boxShadow: `0 0 0 1px ${config.color}`, backgroundColor: `${config.color}15`, color: config.color } : {}}
            >
              <config.icon className="size-2.5" />
              {counts[type] || 0}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-3 max-h-96 overflow-y-auto scrollbar-thin">
          {filtered.length === 0 && (
            <div className="text-center py-8">
              <BookOpen className="size-6 vl-text-muted mx-auto mb-2 opacity-40" />
              <p className="text-xs vl-text-muted">No annotations found</p>
              <p className="text-[10px] vl-text-muted mt-1">Hover over messages to annotate</p>
            </div>
          )}

          {(Object.entries(grouped) as [MeetingAnnotationType, (MeetingAnnotation & { _msg?: MeetingMessage })[]][]).map(([type, items]) => (
            <div key={type}>
              <div className="flex items-center gap-1.5 px-1 mb-1.5">
                {React.createElement(TYPE_CONFIG[type].icon, { className: 'size-3', style: { color: TYPE_CONFIG[type].color } })}
                <span className="text-[10px] font-medium" style={{ color: TYPE_CONFIG[type].color }}>
                  {TYPE_CONFIG[type].label}s ({items.length})
                </span>
              </div>
              <div className="space-y-1">
                {items.map(annotation => (
                  <div
                    key={annotation.id}
                    className="vl-inner rounded-lg p-2 border border-[var(--vl-border-subtle)] group/item"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-0.5">
                          {annotation.type === 'highlight' && annotation.color && (
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: HIGHLIGHT_COLORS[annotation.color] }} />
                          )}
                          {annotation.type === 'tag' && annotation.tagColor && (
                            <Badge variant="secondary" className="text-[9px] px-1 h-4" style={{ backgroundColor: `${annotation.tagColor}15`, color: annotation.tagColor, borderColor: `${annotation.tagColor}30` }}>
                              {TAG_OPTIONS.find(t => t.value === annotation.tagName)?.label || annotation.tagName}
                            </Badge>
                          )}
                          {annotation.type === 'reaction' && (
                            <span className="text-sm">{annotation.reaction}</span>
                          )}
                          {annotation.type === 'comment' && (
                            <span className="text-[10px] font-medium text-blue-400">Comment</span>
                          )}
                          {annotation.type === 'bookmark' && (
                            <Star className="size-3 text-amber-400 fill-amber-400" />
                          )}
                          {annotation._msg && (
                            <span className="text-[10px] vl-text-muted truncate">{annotation._msg.agentName}</span>
                          )}
                          <span className="text-[9px] vl-text-muted ml-auto">{timeAgo(annotation.createdAt)}</span>
                        </div>
                        {annotation.text && (
                          <p className="text-[11px] vl-text-body line-clamp-2">{annotation.text}</p>
                        )}
                        {annotation.comment && (
                          <p className="text-[11px] vl-text-body italic">{annotation.comment}</p>
                        )}
                        {annotation._msg && !annotation.text && !annotation.comment && annotation.type !== 'reaction' && (
                          <p className="text-[10px] vl-text-muted line-clamp-2">{annotation._msg.content.substring(0, 100)}</p>
                        )}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); onRemove(annotation.messageId, annotation.id) }}
                        className="p-1 rounded opacity-0 group-hover/item:opacity-100 hover:bg-red-500/10 text-[var(--vl-text-muted)] hover:text-red-400 transition-all shrink-0"
                      >
                        <X className="size-2.5" />
                      </button>
                    </div>
                    {/* Click to scroll */}
                    <button
                      onClick={() => onScrollToMessage(annotation.messageId)}
                      className="mt-1 text-[9px] vl-text-muted hover:text-emerald-400 transition-colors"
                    >
                      Jump to message →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

// ============================================================
// SummaryView
// ============================================================

function SummaryView({
  annotations,
  messages,
  onClose,
}: {
  annotations: Record<string, MeetingAnnotation[]>
  messages: MeetingMessage[]
  onClose: () => void
}) {
  const allAnnotations = useMemo(() => {
    const flat: MeetingAnnotation[] = []
    Object.values(annotations).forEach(arr => flat.push(...arr))
    return flat
  }, [annotations])

  const summaryText = useMemo(() => generateSummaryText(allAnnotations, messages), [allAnnotations, messages])

  const bookmarks = allAnnotations.filter(a => a.type === 'bookmark')
  const keyInsights = allAnnotations.filter(a => a.type === 'tag' && a.tagName === 'key-insight')
  const actionItems = allAnnotations.filter(a => a.type === 'tag' && a.tagName === 'action-item')
  const decisions = allAnnotations.filter(a => a.type === 'tag' && a.tagName === 'decision')
  const questions = allAnnotations.filter(a => a.type === 'tag' && a.tagName === 'question')

  const exportText = useCallback(() => {
    const blob = new Blob([summaryText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'annotations-summary.txt'
    a.click()
    URL.revokeObjectURL(url)
  }, [summaryText])

  return (
    <div className="vl-card rounded-xl p-4 max-w-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-emerald-400" />
          <h3 className="text-sm font-semibold vl-text-heading">Annotations Summary</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={exportText}>
            <Download className="size-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {/* Stats row */}
        <div className="grid grid-cols-5 gap-2">
          {[
            { label: 'Bookmarks', count: bookmarks.length, icon: Bookmark, color: '#f59e0b' },
            { label: 'Insights', count: keyInsights.length, icon: Star, color: '#10b981' },
            { label: 'Actions', count: actionItems.length, icon: CheckSquare, color: '#f97316' },
            { label: 'Decisions', count: decisions.length, icon: FileText, color: '#3b82f6' },
            { label: 'Questions', count: questions.length, icon: Smile, color: '#06b6d4' },
          ].map(item => (
            <div key={item.label} className="text-center p-2 rounded-lg vl-inner">
              <item.icon className="size-3.5 mx-auto mb-1" style={{ color: item.color }} />
              <p className="text-lg font-bold vl-text-heading">{item.count}</p>
              <p className="text-[9px] vl-text-muted">{item.label}</p>
            </div>
          ))}
        </div>

        {/* Detailed sections */}
        {bookmarks.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-amber-400 mb-1.5 flex items-center gap-1">
              <Bookmark className="size-3" /> Bookmarked Messages
            </h4>
            <div className="space-y-1">
              {bookmarks.map(a => {
                const msg = messages.find(m => m.id === a.messageId)
                return (
                  <div key={a.id} className="text-[11px] vl-text-body p-1.5 rounded vl-inner">
                    <span className="font-medium text-amber-400">{msg?.agentName || 'Unknown'}:</span>{' '}
                    {msg?.content?.substring(0, 80) || 'N/A'}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {actionItems.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-orange-400 mb-1.5 flex items-center gap-1">
              <CheckSquare className="size-3" /> Action Items
            </h4>
            <div className="space-y-1">
              {actionItems.map((a, i) => {
                const msg = messages.find(m => m.id === a.messageId)
                return (
                  <div key={a.id} className="text-[11px] vl-text-body p-1.5 rounded vl-inner flex items-start gap-2">
                    <span className="text-orange-400 font-bold">{i + 1}.</span>
                    <span>{msg?.content?.substring(0, 120) || 'N/A'}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {bookmarks.length === 0 && actionItems.length === 0 && keyInsights.length === 0 && (
          <div className="text-center py-4">
            <p className="text-xs vl-text-muted">No summary data available</p>
            <p className="text-[10px] vl-text-muted mt-1">Add bookmarks, tags, or comments to generate a summary</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// MessageAnnotationOverlay: Visual indicators rendered on a message
// ============================================================

export function MessageAnnotationOverlay({
  messageId,
  annotations,
}: {
  messageId: string
  annotations: MeetingAnnotation[]
}) {
  const msgAnnotations = annotations.filter(a => a.messageId === messageId)
  if (msgAnnotations.length === 0) return null

  const highlight = msgAnnotations.find(a => a.type === 'highlight')
  const hasBookmark = msgAnnotations.some(a => a.type === 'bookmark')
  const comments = msgAnnotations.filter(a => a.type === 'comment')
  const tags = msgAnnotations.filter(a => a.type === 'tag')
  const reactions = msgAnnotations.filter(a => a.type === 'reaction')

  // Group reactions with counts
  const reactionCounts: Record<string, number> = {}
  reactions.forEach(r => {
    reactionCounts[r.reaction || ''] = (reactionCounts[r.reaction || ''] || 0) + 1
  })

  return (
    <div className="relative">
      {/* Highlighted left border */}
      {highlight?.color && (
        <div
          className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full"
          style={{ backgroundColor: HIGHLIGHT_COLORS[highlight.color] || '#eab308' }}
        />
      )}

      {/* Bookmark indicator */}
      {hasBookmark && (
        <div className="absolute top-1 right-1">
          <Bookmark className="size-3 text-amber-400 fill-amber-400/40" />
        </div>
      )}

      {/* Comment count badge */}
      {comments.length > 0 && (
        <div className="absolute top-1 right-1">
          <Badge variant="secondary" className="text-[8px] px-1 h-3.5 bg-blue-500/15 text-blue-400 border-blue-500/30">
            {comments.length}
          </Badge>
        </div>
      )}

      {/* Tag pills */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {tags.map(tag => {
            const tagOption = TAG_OPTIONS.find(t => t.value === tag.tagName)
            return (
              <Badge
                key={tag.id}
                variant="secondary"
                className="text-[9px] px-1.5 h-4"
                style={{
                  backgroundColor: tagOption ? `${tagOption.color}15` : undefined,
                  color: tagOption?.color || tag.tagColor,
                  borderColor: tagOption ? `${tagOption.color}30` : undefined,
                }}
              >
                {tagOption?.label || tag.tagName}
              </Badge>
            )
          })}
        </div>
      )}

      {/* Reaction row */}
      {Object.keys(reactionCounts).length > 0 && (
        <div className="flex items-center gap-1.5 mt-1">
          {Object.entries(reactionCounts).map(([emoji, count]) => (
            <span
              key={emoji}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[var(--vl-bg-inner)] text-xs hover:bg-[var(--vl-bg-card-hover)] transition-colors cursor-default"
            >
              <span>{emoji}</span>
              <span className="text-[9px] vl-text-muted">{count}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Main Component: MeetingAnnotationsPanel
// ============================================================

export function MeetingAnnotationsPanel({
  meetingId,
  messages,
  isOpen,
  onClose,
  onAnnotationChange,
}: MeetingAnnotationsPanelProps) {
  const [mounted, setMounted] = useState(false)
  const [typeFilter, setTypeFilter] = useState<MeetingAnnotationType | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSummary, setShowSummary] = useState(false)

  const {
    annotations, addAnnotation, removeAnnotation, getMessageAnnotations,
    clearAll, exportJSON, totalCount, annotationsByType,
  } = useMeetingAnnotations(meetingId)

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true))
  }, [])

  // Notify parent on change
  useEffect(() => {
    if (onAnnotationChange) {
      Object.entries(annotations).forEach(([messageId, anns]) => {
        onAnnotationChange(messageId, anns)
      })
    }
  }, [annotations, onAnnotationChange])

  const handleBookmark = useCallback((messageId: string) => {
    const existing = annotations[messageId]?.some(a => a.type === 'bookmark')
    if (existing) {
      const bookmark = annotations[messageId]?.find(a => a.type === 'bookmark')
      if (bookmark) removeAnnotation(messageId, bookmark.id)
    } else {
      const msg = messages.find(m => m.id === messageId)
      addAnnotation(messageId, {
        type: 'bookmark',
        messageId,
        text: msg?.content?.substring(0, 80) || '',
      })
    }
  }, [annotations, messages, addAnnotation, removeAnnotation])

  const allAnnotationsFlat = useMemo(() => {
    const flat: MeetingAnnotation[] = []
    Object.values(annotations).forEach(arr => flat.push(...arr))
    return flat
  }, [annotations])

  if (!mounted || !isOpen) return null

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-80 xl:w-96 flex-shrink-0 vl-card rounded-xl overflow-hidden flex flex-col annotation-panel"
            style={{ maxHeight: '80vh' }}
          >
            {/* Header */}
            <div className="px-3 py-2 border-b border-[var(--vl-border-subtle)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Bookmark className="size-3.5 text-amber-400" />
                  <span className="text-xs font-semibold vl-text-heading">Annotations</span>
                  <Badge variant="secondary" className="text-[9px] px-1.5 h-4 bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                    {totalCount}
                  </Badge>
                </div>
                <div className="flex items-center gap-0.5">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowSummary(!showSummary)}>
                          <FileText className="size-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="vl-dialog text-[10px]">View Summary</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={exportJSON}>
                          <Download className="size-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="vl-dialog text-[10px]">Export JSON</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 hover:text-red-300" onClick={clearAll}>
                          <Trash2 className="size-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="vl-dialog text-[10px]">Clear All</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
                    <X className="size-3" />
                  </Button>
                </div>
              </div>

              {/* Type counts */}
              <div className="flex items-center gap-2 mt-2 text-[10px]">
                {(Object.entries(annotationsByType) as [MeetingAnnotationType, number][]).map(([type, count]) => (
                  <span key={type} className="flex items-center gap-0.5 vl-text-muted">
                    {React.createElement(TYPE_CONFIG[type].icon, { className: 'size-2.5', style: { color: TYPE_CONFIG[type].color } })}
                    {count}
                  </span>
                ))}
              </div>
            </div>

            {showSummary ? (
              <SummaryView
                annotations={annotations}
                messages={messages}
                onClose={() => setShowSummary(false)}
              />
            ) : (
              <AnnotationListPanel
                annotations={annotations}
                messages={messages}
                typeFilter={typeFilter}
                searchQuery={searchQuery}
                onTypeFilterChange={setTypeFilter}
                onSearchChange={setSearchQuery}
                onRemove={removeAnnotation}
                onScrollToMessage={() => {}}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default MeetingAnnotationsPanel
