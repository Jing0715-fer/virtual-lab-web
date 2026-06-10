'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Highlighter, MessageSquare, HelpCircle, X, ChevronDown, ChevronRight,
  Filter, Plus, Trash2, Search, StickyNote, PanelRightOpen, PanelRightClose,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

// ============================================================
// Types
// ============================================================

export type AnnotationType = 'highlight' | 'comment' | 'question'

export interface Annotation {
  id: string
  text: string
  color: string
  createdAt: string
  type: AnnotationType
}

export interface AnnotationRecord {
  annotations: Record<string, Annotation[]>
}

const ANNOTATION_TYPE_CONFIG: Record<AnnotationType, { color: string; icon: typeof Highlighter; labelKey: string }> = {
  highlight: { color: '#eab308', icon: Highlighter, labelKey: 'annotations.highlight' },
  comment: { color: '#3b82f6', icon: MessageSquare, labelKey: 'annotations.comment' },
  question: { color: '#f59e0b', icon: HelpCircle, labelKey: 'annotations.question' },
}

// ============================================================
// useAnnotations Hook
// ============================================================

const STORAGE_KEY_PREFIX = 'vl-annotations-'

export function useAnnotations(meetingId: string) {
  const [annotations, setAnnotations] = useState<Record<string, Annotation[]>>({})

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${meetingId}`)
      if (stored) {
        requestAnimationFrame(() => { setAnnotations(JSON.parse(stored)) })
      }
    } catch { /* ignore */ }
  }, [meetingId])

  // Save to localStorage
  const persist = useCallback((data: Record<string, Annotation[]>) => {
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${meetingId}`, JSON.stringify(data))
    } catch { /* ignore */ }
  }, [meetingId])

  const addAnnotation = useCallback((messageId: string, annotation: Omit<Annotation, 'id' | 'createdAt'>) => {
    setAnnotations(prev => {
      const existing = prev[messageId] || []
      const newAnnotation: Annotation = {
        ...annotation,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: new Date().toISOString(),
      }
      const next = { ...prev, [messageId]: [...existing, newAnnotation] }
      persist(next)
      return next
    })
  }, [persist])

  const removeAnnotation = useCallback((messageId: string, annotationId: string) => {
    setAnnotations(prev => {
      const existing = prev[messageId] || []
      const next = { ...prev, [messageId]: existing.filter(a => a.id !== annotationId) }
      if (next[messageId].length === 0) delete next[messageId]
      persist(next)
      return next
    })
  }, [persist])

  const getAnnotations = useCallback((messageId: string): Annotation[] => {
    return annotations[messageId] || []
  }, [annotations])

  const totalCount = useMemo(() => {
    return Object.values(annotations).reduce((sum, arr) => sum + arr.length, 0)
  }, [annotations])

  const annotationsByType = useMemo(() => {
    const grouped: Record<AnnotationType, number> = { highlight: 0, comment: 0, question: 0 }
    Object.values(annotations).forEach(arr => {
      arr.forEach(a => { grouped[a.type]++ })
    })
    return grouped
  }, [annotations])

  return {
    annotations,
    addAnnotation,
    removeAnnotation,
    getAnnotations,
    totalCount,
    annotationsByType,
  }
}

// ============================================================
// AnnotationBar Component
// ============================================================

export function AnnotationBar({
  messageId,
  annotations,
  onAdd,
  onRemove,
  lang = 'en',
}: {
  messageId: string
  annotations: Annotation[]
  onAdd: (messageId: string, annotation: Omit<Annotation, 'id' | 'createdAt'>) => void
  onRemove: (messageId: string, annotationId: string) => void
  lang?: Lang
}) {
  const [activeInput, setActiveInput] = useState<AnnotationType | null>(null)
  const [inputText, setInputText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (activeInput && inputRef.current) {
      inputRef.current.focus()
    }
  }, [activeInput])

  const handleAdd = () => {
    if (!inputText.trim() || !activeInput) return
    const config = ANNOTATION_TYPE_CONFIG[activeInput]
    onAdd(messageId, {
      text: inputText.trim(),
      color: config.color,
      type: activeInput,
    })
    setInputText('')
    setActiveInput(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd()
    if (e.key === 'Escape') { setActiveInput(null); setInputText('') }
  }

  const hasAnnotations = annotations.length > 0

  return (
    <div className="flex items-center gap-1 mt-1 opacity-0 hover:opacity-100 transition-opacity group/ann">
      {/* Annotation type buttons */}
      {(Object.entries(ANNOTATION_TYPE_CONFIG) as [AnnotationType, typeof ANNOTATION_TYPE_CONFIG[AnnotationType]][]).map(([type, config]) => {
        const Icon = config.icon
        const isActive = activeInput === type
        return (
          <TooltipProvider key={type}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={`p-0.5 rounded transition-colors ${
                    isActive
                      ? 'ring-1 ring-offset-0'
                      : 'vl-text-muted hover:text-white hover:bg-[var(--vl-bg-card-hover)]'
                  }`}
                  style={isActive ? { backgroundColor: `${config.color}20`, boxShadow: `0 0 0 1px ${config.color}` } : {}}
                  onClick={() => setActiveInput(isActive ? null : type)}
                  aria-label={t(lang, config.labelKey)}
                >
                  <Icon className="size-3" style={isActive ? { color: config.color } : {}} />
                </button>
              </TooltipTrigger>
              <TooltipContent>{t(lang, config.labelKey)}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      })}

      {/* Inline input */}
      <AnimatePresence>
        {activeInput && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'auto', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="flex items-center gap-1 overflow-hidden"
          >
            <Input
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t(lang, 'annotations.add')}
              className="h-5 text-[10px] w-32 bg-[var(--vl-bg-inner)] border-[var(--vl-border-subtle)] px-1.5 py-0"
              style={{ color: ANNOTATION_TYPE_CONFIG[activeInput].color }}
            />
            <button
              onClick={handleAdd}
              className="p-0.5 rounded hover:bg-[var(--vl-bg-card-hover)] transition-colors"
              style={{ color: ANNOTATION_TYPE_CONFIG[activeInput].color }}
              aria-label="Submit annotation"
            >
              <Plus className="size-2.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Annotation dots */}
      {hasAnnotations && (
        <Popover>
          <PopoverTrigger asChild>
            <div className="flex items-center gap-0.5 ml-1 cursor-pointer opacity-100!">
              {annotations.slice(0, 5).map((a) => (
                <span
                  key={a.id}
                  className="w-1.5 h-1.5 rounded-full ring-1 ring-[var(--vl-border)]"
                  style={{ backgroundColor: a.color }}
                />
              ))}
              {annotations.length > 5 && (
                <span className="text-[8px] vl-text-muted">+{annotations.length - 5}</span>
              )}
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2 vl-dialog" align="start" side="top">
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium vl-text-muted">{t(lang, 'annotations.title')}</p>
              {annotations.map((a) => (
                <div key={a.id} className="flex items-start gap-2 group/item">
                  <span
                    className="w-2 h-2 rounded-full mt-1 shrink-0"
                    style={{ backgroundColor: a.color }}
                  />
                  <p className="text-xs vl-text-body flex-1 min-w-0">{a.text}</p>
                  <button
                    className="opacity-0 group-hover/item:opacity-100 vl-text-muted hover:text-rose-400 shrink-0"
                    onClick={() => onRemove(messageId, a.id)}
                  >
                    <X className="size-2.5" />
                  </button>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}

// ============================================================
// AnnotationPanel Component
// ============================================================

export function AnnotationPanel({
  meetingId,
  annotations,
  messages,
  agents,
  onRemove,
  onScrollToMessage,
  lang = 'en',
}: {
  meetingId: string
  annotations: Record<string, Annotation[]>
  messages: { id: string; agentName: string; message: string }[]
  agents: { id: string; color: string; icon: string; title: string }[]
  onRemove: (messageId: string, annotationId: string) => void
  onScrollToMessage: (messageId: string) => void
  lang?: Lang
}) {
  const [typeFilter, setTypeFilter] = useState<AnnotationType | 'all'>('all')

  // Flatten all annotations with message context
  const flatAnnotations = useMemo(() => {
    const result: { annotation: Annotation; messageId: string; agentName: string; messageSnippet: string; agentColor: string }[] = []
    Object.entries(annotations).forEach(([messageId, anns]) => {
      const msg = messages.find(m => m.id === messageId)
      const agent = msg ? agents.find(a => a.title === msg.agentName) : null
      anns.forEach(a => {
        result.push({
          annotation: a,
          messageId,
          agentName: msg?.agentName || 'Unknown',
          messageSnippet: msg?.message.substring(0, 80) || '',
          agentColor: agent?.color || '#6366f1',
        })
      })
    })
    // Sort by creation time, newest first
    result.sort((a, b) => new Date(b.annotation.createdAt).getTime() - new Date(a.annotation.createdAt).getTime())
    return result
  }, [annotations, messages, agents])

  const filteredAnnotations = typeFilter === 'all'
    ? flatAnnotations
    : flatAnnotations.filter(item => item.annotation.type === typeFilter)

  // Group by message
  const groupedByMessage = useMemo(() => {
    const groups: Record<string, typeof filteredAnnotations> = {}
    filteredAnnotations.forEach(item => {
      if (!groups[item.messageId]) groups[item.messageId] = []
      groups[item.messageId].push(item)
    })
    return groups
  }, [filteredAnnotations])

  // Count by type
  const counts = useMemo(() => {
    const c: Record<string, number> = { highlight: 0, comment: 0, question: 0 }
    Object.values(annotations).forEach(anns => {
      anns.forEach(a => { c[a.type]++ })
    })
    return c
  }, [annotations])

  return (
    <div className="flex flex-col h-full border-l vl-inner">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[var(--vl-border-subtle)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <StickyNote className="size-3.5 text-emerald-400" />
            <span className="text-xs font-medium vl-text-heading">{t(lang, 'annotations.title')}</span>
            <Badge variant="secondary" className="text-[9px] px-1 vl-inner">
              {flatAnnotations.length}
            </Badge>
          </div>
        </div>

        {/* Filter by type */}
        <div className="flex items-center gap-1 mt-2">
          <span className="text-[9px] vl-text-muted mr-1">{t(lang, 'annotations.filter')}:</span>
          <button
            className={`px-1.5 py-0.5 rounded text-[9px] transition-colors ${
              typeFilter === 'all' ? 'bg-emerald-500/20 text-emerald-400' : 'vl-text-muted hover:text-white'
            }`}
            onClick={() => setTypeFilter('all')}
          >
            All
          </button>
          {(Object.entries(ANNOTATION_TYPE_CONFIG) as [AnnotationType, typeof ANNOTATION_TYPE_CONFIG[AnnotationType]][]).map(([type, config]) => (
            <button
              key={type}
              className={`px-1.5 py-0.5 rounded text-[9px] transition-colors flex items-center gap-0.5 ${
                typeFilter === type ? 'ring-1' : 'vl-text-muted hover:text-white'
              }`}
              style={typeFilter === type ? { boxShadow: `0 0 0 1px ${config.color}`, backgroundColor: `${config.color}15`, color: config.color } : {}}
              onClick={() => setTypeFilter(type)}
            >
              {counts[type] || 0}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {filteredAnnotations.length === 0 && (
            <div className="text-center py-8">
              <StickyNote className="size-6 vl-text-muted mx-auto mb-2" />
              <p className="text-xs vl-text-muted">{t(lang, 'annotations.empty')}</p>
            </div>
          )}

          {Object.entries(groupedByMessage).map(([messageId, items]) => (
            <div key={messageId} className="vl-inner rounded-lg p-2 border border-[var(--vl-border-subtle)] space-y-1.5">
              {/* Message header */}
              <button
                className="flex items-center gap-1.5 w-full text-left"
                onClick={() => onScrollToMessage(messageId)}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: items[0]?.agentColor || '#6366f1' }}
                />
                <span className="text-[10px] font-medium truncate" style={{ color: items[0]?.agentColor }}>
                  {items[0]?.agentName}
                </span>
                <span className="text-[9px] vl-text-muted truncate ml-1">
                  {items[0]?.messageSnippet}...
                </span>
              </button>

              {/* Annotations */}
              {items.map(({ annotation }) => {
                const config = ANNOTATION_TYPE_CONFIG[annotation.type]
                return (
                  <div key={annotation.id} className="flex items-start gap-1.5 pl-3.5 group/item">
                    <span
                      className="w-1.5 h-1.5 rounded-full mt-1 shrink-0"
                      style={{ backgroundColor: annotation.color }}
                    />
                    <p className="text-[11px] vl-text-body flex-1">{annotation.text}</p>
                    <button
                      className="opacity-0 group-hover/item:opacity-100 vl-text-muted hover:text-rose-400 shrink-0"
                      onClick={() => onRemove(messageId, annotation.id)}
                    >
                      <X className="size-2.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
