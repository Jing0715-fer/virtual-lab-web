'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Highlighter, MessageSquare, Bookmark, CheckSquare, X, ChevronDown, ChevronRight, Filter, Download, Trash2, Plus, AlertCircle, Clock, User } from 'lucide-react'

// ============================================================
// Types
// ============================================================

type AnnotationType = 'highlight' | 'comment' | 'bookmark' | 'action-item'
type AnnotationColor = 'yellow' | 'green' | 'blue' | 'red' | 'purple'

interface Annotation {
  id: string
  type: AnnotationType
  color: AnnotationColor
  messageId: string
  authorName: string
  createdAt: string
  text?: string
  note?: string
  assignee?: string
  dueDate?: string
  priority?: 'low' | 'medium' | 'high'
  completed?: boolean
}

interface MessageItem {
  id: string
  agentName: string
  agentColor?: string
  message: string
  roundIndex: number
  createdAt: string
}

interface AgentItem {
  id: string
  title: string
  color?: string
}

interface MeetingAnnotationSystemProps {
  meetingId: string
  messages: MessageItem[]
  agents: AgentItem[]
  lang?: string
}

// ============================================================
// Helpers
// ============================================================

const COLOR_MAP: Record<AnnotationColor, string> = {
  yellow: 'rgba(245, 158, 11, 0.15)',
  green: 'rgba(16, 185, 129, 0.15)',
  blue: 'rgba(59, 130, 246, 0.15)',
  red: 'rgba(239, 68, 68, 0.15)',
  purple: 'rgba(139, 92, 246, 0.15)',
}

const COLOR_BORDER: Record<AnnotationColor, string> = {
  yellow: 'border-l-amber-400',
  green: 'border-l-emerald-400',
  blue: 'border-l-blue-400',
  red: 'border-l-red-400',
  purple: 'border-l-violet-400',
}

const TYPE_ICONS: Record<AnnotationType, React.ElementType> = {
  highlight: Highlighter,
  comment: MessageSquare,
  bookmark: Bookmark,
  'action-item': CheckSquare,
}

const STORAGE_KEY = 'virtual-lab-meeting-annotations'

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function loadAnnotations(meetingId: string): Annotation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    return data[meetingId] || []
  } catch { return [] }
}

function saveAnnotations(meetingId: string, annotations: Annotation[]) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const data = raw ? JSON.parse(raw) : {}
    data[meetingId] = annotations
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch { /* ignore */ }
}

// ============================================================
// Annotation Toggle Button (exported)
// ============================================================

export function AnnotationToggleButton({
  isOpen,
  onClick,
  count
}: {
  isOpen: boolean
  onClick: () => void
  count: number
}) {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-lg transition-all duration-200 hover:bg-[var(--vl-bg-inner)] ${
        isOpen ? 'bg-emerald-500/10 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.2)]' : 'text-[var(--vl-text-muted)] hover:text-[var(--vl-text-body)]'
      }`}
      title="Annotations"
      aria-label={`Toggle annotation panel (${count} annotations)`}
    >
      <Bookmark className="w-4 h-4" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-emerald-500 text-white text-[10px] font-bold px-1 annotation-count-badge">
          {count}
        </span>
      )}
    </button>
  )
}

// ============================================================
// AnnotatedMessageWrapper (exported)
// ============================================================

export function AnnotatedMessageWrapper({
  messageId,
  children,
  annotations
}: {
  messageId: string
  children: React.ReactNode
  annotations: Annotation[]
}) {
  const msgAnnotations = annotations.filter(a => a.messageId === messageId)
  const highlight = msgAnnotations.find(a => a.type === 'highlight')
  const hasComment = msgAnnotations.some(a => a.type === 'comment')
  const hasBookmark = msgAnnotations.some(a => a.type === 'bookmark')
  const hasAction = msgAnnotations.some(a => a.type === 'action-item')

  return (
    <div className="relative annotation-message-indicator group">
      {highlight && (
        <div
          className="absolute inset-0 rounded-lg annotation-highlight-pulse pointer-events-none"
          style={{ backgroundColor: COLOR_MAP[highlight.color] || COLOR_MAP.yellow }}
        />
      )}
      <div className={`relative rounded-lg border-l-2 ${hasBookmark ? 'border-l-emerald-400' : 'border-l-transparent'} transition-colors duration-200`}>
        {children}
      </div>
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {hasComment && (
          <span className="p-1 rounded bg-blue-500/10 text-blue-400 text-[10px]" title="Has comment">
            <MessageSquare className="w-3 h-3" />
          </span>
        )}
        {hasBookmark && (
          <span className="p-1 rounded bg-emerald-500/10 text-emerald-400 text-[10px]" title="Bookmarked">
            <Bookmark className="w-3 h-3" />
          </span>
        )}
        {hasAction && (
          <span className="p-1 rounded bg-amber-500/10 text-amber-400 text-[10px]" title="Has action item">
            <CheckSquare className="w-3 h-3" />
          </span>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Main Component
// ============================================================

export default function MeetingAnnotationSystem({
  meetingId,
  messages,
  agents,
  lang = 'en'
}: MeetingAnnotationSystemProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [mounted, setMounted] = useState(false)
  const [selectedType, setSelectedType] = useState<AnnotationType | 'all'>('all')
  const [selectedColor, setSelectedColor] = useState<AnnotationColor>('yellow')
  const [commentText, setCommentText] = useState('')
  const [actionNote, setActionNote] = useState('')
  const [actionAssignee, setActionAssignee] = useState('')
  const [actionPriority, setActionPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [actionDueDate, setActionDueDate] = useState('')
  const [targetMessageId, setTargetMessageId] = useState<string | null>(null)

  // Load annotations on mount
  useEffect(() => {
    requestAnimationFrame(() => {
      setMounted(true)
      setAnnotations(loadAnnotations(meetingId))
    })
  }, [meetingId])

  // Save annotations whenever they change
  useEffect(() => {
    if (!mounted) return
    saveAnnotations(meetingId, annotations)
  }, [annotations, meetingId, mounted])

  // Add annotation
  const addAnnotation = useCallback((type: AnnotationType, messageId: string) => {
    const newAnnotation: Annotation = {
      id: crypto.randomUUID(),
      type,
      color: selectedColor,
      messageId,
      authorName: 'You',
      createdAt: new Date().toISOString(),
    }
    if (type === 'comment') {
      newAnnotation.note = commentText
      setCommentText('')
    } else if (type === 'highlight') {
      const msg = messages.find(m => m.id === messageId)
      newAnnotation.text = msg ? msg.message.substring(0, 100) : ''
    } else if (type === 'action-item') {
      newAnnotation.note = actionNote
      newAnnotation.assignee = actionAssignee
      newAnnotation.priority = actionPriority
      newAnnotation.dueDate = actionDueDate
      setActionNote('')
      setActionAssignee('')
      setActionPriority('medium')
      setActionDueDate('')
    }
    setAnnotations(prev => [newAnnotation, ...prev])
    setTargetMessageId(null)
  }, [selectedColor, commentText, actionNote, actionAssignee, actionPriority, actionDueDate, messages])

  // Delete annotation
  const deleteAnnotation = useCallback((id: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== id))
  }, [])

  // Toggle action item completion
  const toggleAction = useCallback((id: string) => {
    setAnnotations(prev => prev.map(a => a.id === id && a.type === 'action-item' ? { ...a, completed: !a.completed } : a))
  }, [])

  // Clear all annotations
  const clearAll = useCallback(() => {
    setAnnotations([])
  }, [])

  // Quick bookmark a message
  const quickBookmark = useCallback((messageId: string) => {
    const exists = annotations.some(a => a.type === 'bookmark' && a.messageId === messageId)
    if (exists) {
      setAnnotations(prev => prev.filter(a => !(a.type === 'bookmark' && a.messageId === messageId)))
    } else {
      const msg = messages.find(m => m.id === messageId)
      const newAnnotation: Annotation = {
        id: crypto.randomUUID(),
        type: 'bookmark',
        color: 'green',
        messageId,
        authorName: 'You',
        createdAt: new Date().toISOString(),
        text: msg ? msg.message.substring(0, 80) : '',
      }
      setAnnotations(prev => [newAnnotation, ...prev])
    }
  }, [annotations, messages])

  // Export as JSON
  const exportAnnotations = useCallback(() => {
    const data = JSON.stringify(annotations, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `annotations-${meetingId}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [annotations, meetingId])

  // Filtered annotations
  const filteredAnnotations = useMemo(() => {
    if (selectedType === 'all') return annotations
    return annotations.filter(a => a.type === selectedType)
  }, [annotations, selectedType])

  // Counts
  const counts = useMemo(() => ({
    total: annotations.length,
    highlight: annotations.filter(a => a.type === 'highlight').length,
    comment: annotations.filter(a => a.type === 'comment').length,
    bookmark: annotations.filter(a => a.type === 'bookmark').length,
    'action-item': annotations.filter(a => a.type === 'action-item').length,
    completed: annotations.filter(a => a.type === 'action-item' && a.completed).length,
  }), [annotations])

  if (!mounted) return null

  return (
    <div className="flex gap-2">
      {/* Toggle Button */}
      <AnnotationToggleButton isOpen={isOpen} onClick={() => setIsOpen(!isOpen)} count={counts.total} />

      {/* Side Panel */}
      {isOpen && (
        <div className="w-80 flex-shrink-0 vl-card rounded-xl overflow-hidden flex flex-col annotation-panel" style={{ maxHeight: '70vh' }}>
          {/* Header */}
          <div className="p-3 border-b border-[var(--vl-border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold vl-text-heading">{lang === 'zh' ? '标注' : 'Annotations'}</h3>
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium annotation-count-badge">
                {counts.total}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={exportAnnotations} className="p-1 rounded hover:bg-[var(--vl-bg-inner)] text-[var(--vl-text-muted)] hover:text-[var(--vl-text-body)] transition-colors" title="Export">
                <Download className="w-3.5 h-3.5" />
              </button>
              <button onClick={clearAll} className="p-1 rounded hover:bg-red-500/10 text-[var(--vl-text-muted)] hover:text-red-400 transition-colors" title="Clear all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setIsOpen(false)} className="p-1 rounded hover:bg-[var(--vl-bg-inner)] text-[var(--vl-text-muted)] transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Summary Bar */}
          <div className="px-3 py-2 border-b border-[var(--vl-border)] bg-[var(--vl-bg-inner)]/50">
            <div className="flex items-center gap-2 text-[10px] text-[var(--vl-text-muted)]">
              <span className="flex items-center gap-1"><Highlighter className="w-3 h-3 text-amber-400" />{counts.highlight}</span>
              <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3 text-blue-400" />{counts.comment}</span>
              <span className="flex items-center gap-1"><Bookmark className="w-3 h-3 text-emerald-400" />{counts.bookmark}</span>
              <span className="flex items-center gap-1"><CheckSquare className="w-3 h-3 text-amber-400" />{counts['action-item']}{counts['action-item'] > 0 && <span className="text-emerald-400">({counts.completed}/{counts['action-item']})</span>}</span>
            </div>
          </div>

          {/* Type Filter */}
          <div className="px-3 py-2 border-b border-[var(--vl-border)] flex items-center gap-1 overflow-x-auto">
            <button
              onClick={() => setSelectedType('all')}
              className={`px-2 py-1 rounded text-[10px] font-medium transition-colors whitespace-nowrap annotation-type-btn ${selectedType === 'all' ? 'bg-emerald-500/10 text-emerald-400' : 'text-[var(--vl-text-muted)] hover:text-[var(--vl-text-body)] hover:bg-[var(--vl-bg-inner)]'}`}
            >
              <Filter className="w-3 h-3 inline mr-1" />{lang === 'zh' ? '全部' : 'All'}
            </button>
            {(['highlight', 'comment', 'bookmark', 'action-item'] as AnnotationType[]).map(type => {
              const Icon = TYPE_ICONS[type]
              return (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition-colors whitespace-nowrap annotation-type-btn ${selectedType === type ? 'bg-emerald-500/10 text-emerald-400' : 'text-[var(--vl-text-muted)] hover:text-[var(--vl-text-body)] hover:bg-[var(--vl-bg-inner)]'}`}
                >
                  <Icon className="w-3 h-3 inline mr-1" />{type === 'action-item' ? (lang === 'zh' ? '待办' : 'Actions') : type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              )
            })}
          </div>

          {/* Annotation List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {filteredAnnotations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-[var(--vl-text-muted)]">
                <Bookmark className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-xs">{lang === 'zh' ? '暂无标注' : 'No annotations yet'}</p>
                <p className="text-[10px] mt-1">{lang === 'zh' ? '点击消息旁的书签图标添加标注' : 'Click bookmark icon on messages to annotate'}</p>
              </div>
            ) : (
              filteredAnnotations.map(annotation => {
                const Icon = TYPE_ICONS[annotation.type]
                const msg = messages.find(m => m.id === annotation.messageId)
                return (
                  <div
                    key={annotation.id}
                    className={`p-2 rounded-lg vl-inner border-l-2 ${annotation.type === 'highlight' ? COLOR_BORDER[annotation.color] : annotation.type === 'comment' ? 'border-l-blue-400' : annotation.type === 'bookmark' ? 'border-l-emerald-400' : 'border-l-amber-400'} annotation-item hover:bg-[var(--vl-bg-card-hover)] transition-colors cursor-pointer group/ann`}
                    onClick={() => setTargetMessageId(annotation.messageId)}
                  >
                    <div className="flex items-start gap-2">
                      <Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${annotation.type === 'highlight' ? 'text-amber-400' : annotation.type === 'comment' ? 'text-blue-400' : annotation.type === 'bookmark' ? 'text-emerald-400' : 'text-amber-500'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-0.5">
                          {annotation.type === 'action-item' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleAction(annotation.id) }}
                              className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${annotation.completed ? 'bg-emerald-500 border-emerald-500' : 'border-[var(--vl-border)]'}`}
                            >
                              {annotation.completed && <CheckSquare className="w-2 h-2 text-white" />}
                            </button>
                          )}
                          {msg && <span className="text-[10px] text-[var(--vl-text-muted)] truncate">{msg.agentName}</span>}
                          <span className="text-[10px] text-[var(--vl-text-muted)] ml-auto">{timeAgo(annotation.createdAt)}</span>
                        </div>
                        {annotation.text && <p className="text-[11px] text-[var(--vl-text-body)] line-clamp-2">{annotation.text}</p>}
                        {annotation.note && <p className="text-[11px] text-[var(--vl-text-secondary)] mt-0.5 italic">{annotation.note}</p>}
                        {(annotation.assignee || annotation.priority || annotation.dueDate) && (
                          <div className="flex items-center gap-2 mt-1 text-[9px] text-[var(--vl-text-muted)]">
                            {annotation.assignee && <span className="flex items-center gap-0.5"><User className="w-2.5 h-2.5" />{annotation.assignee}</span>}
                            {annotation.priority && <span className={`px-1 rounded ${annotation.priority === 'high' ? 'bg-red-500/10 text-red-400' : annotation.priority === 'medium' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}>{annotation.priority}</span>}
                            {annotation.dueDate && <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{annotation.dueDate}</span>}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteAnnotation(annotation.id) }}
                        className="p-1 rounded opacity-0 group-hover/ann:opacity-100 hover:bg-red-500/10 text-[var(--vl-text-muted)] hover:text-red-400 transition-all flex-shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Creator Section */}
          {targetMessageId && (
            <div className="p-3 border-t border-[var(--vl-border)] bg-[var(--vl-bg-inner)]/30">
              <div className="flex items-center gap-1 mb-2">
                <Plus className="w-3 h-3 text-emerald-400" />
                <span className="text-[11px] font-medium vl-text-heading">
                  {lang === 'zh' ? '添加标注到' : 'Annotate'}: {messages.find(m => m.id === targetMessageId)?.agentName || 'Unknown'}
                </span>
                <button onClick={() => setTargetMessageId(null)} className="ml-auto p-0.5 rounded hover:bg-[var(--vl-bg-inner)]">
                  <X className="w-3 h-3 text-[var(--vl-text-muted)]" />
                </button>
              </div>

              {/* Highlight creator */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] text-[var(--vl-text-muted)]">{lang === 'zh' ? '颜色:' : 'Color:'}</span>
                <div className="flex gap-1">
                  {(['yellow', 'green', 'blue', 'red', 'purple'] as AnnotationColor[]).map(c => (
                    <button
                      key={c}
                      onClick={() => setSelectedColor(c)}
                      className={`w-4 h-4 rounded-full border transition-transform ${selectedColor === c ? 'scale-125 ring-2 ring-offset-1 ring-[var(--vl-bg-primary)]' : 'hover:scale-110'}`}
                      style={{ backgroundColor: c === 'yellow' ? '#f59e0b' : c === 'green' ? '#10b981' : c === 'blue' ? '#3b82f6' : c === 'red' ? '#ef4444' : '#8b5cf6' }}
                    />
                  ))}
                </div>
                <button
                  onClick={() => addAnnotation('highlight', targetMessageId)}
                  className="ml-auto px-2 py-0.5 text-[10px] rounded bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors flex items-center gap-1"
                >
                  <Highlighter className="w-3 h-3" />{lang === 'zh' ? '高亮' : 'Highlight'}
                </button>
              </div>

              {/* Bookmark creator */}
              <button
                onClick={() => quickBookmark(targetMessageId)}
                className="w-full px-2 py-1 text-[10px] rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors flex items-center gap-1 mb-2"
              >
                <Bookmark className="w-3 h-3" />{annotations.some(a => a.type === 'bookmark' && a.messageId === targetMessageId) ? (lang === 'zh' ? '取消书签' : 'Remove Bookmark') : (lang === 'zh' ? '添加书签' : 'Add Bookmark')}
              </button>

              {/* Comment creator */}
              <div className="flex gap-1 mb-2">
                <input
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder={lang === 'zh' ? '添加评论...' : 'Add comment...'}
                  className="flex-1 px-2 py-1 text-[10px] rounded vl-input bg-transparent border border-[var(--vl-border)]"
                />
                <button
                  onClick={() => commentText.trim() && addAnnotation('comment', targetMessageId)}
                  className="px-2 py-1 text-[10px] rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors disabled:opacity-30"
                  disabled={!commentText.trim()}
                >
                  <MessageSquare className="w-3 h-3" />
                </button>
              </div>

              {/* Action item creator */}
              <div className="space-y-1">
                <input
                  value={actionNote}
                  onChange={e => setActionNote(e.target.value)}
                  placeholder={lang === 'zh' ? '待办事项...' : 'Action item...'}
                  className="w-full px-2 py-1 text-[10px] rounded vl-input bg-transparent border border-[var(--vl-border)]"
                />
                <div className="flex items-center gap-1">
                  <select
                    value={actionAssignee}
                    onChange={e => setActionAssignee(e.target.value)}
                    className="flex-1 px-1 py-0.5 text-[10px] rounded vl-input bg-transparent border border-[var(--vl-border)]"
                  >
                    <option value="">{lang === 'zh' ? '指派给...' : 'Assign to...'}</option>
                    {agents.map(a => <option key={a.id} value={a.title}>{a.title}</option>)}
                  </select>
                  <select
                    value={actionPriority}
                    onChange={e => setActionPriority(e.target.value as 'low' | 'medium' | 'high')}
                    className="px-1 py-0.5 text-[10px] rounded vl-input bg-transparent border border-[var(--vl-border)]"
                  >
                    <option value="low">{lang === 'zh' ? '低' : 'Low'}</option>
                    <option value="medium">{lang === 'zh' ? '中' : 'Med'}</option>
                    <option value="high">{lang === 'zh' ? '高' : 'High'}</option>
                  </select>
                  <input
                    type="date"
                    value={actionDueDate}
                    onChange={e => setActionDueDate(e.target.value)}
                    className="px-1 py-0.5 text-[10px] rounded vl-input bg-transparent border border-[var(--vl-border)]"
                  />
                  <button
                    onClick={() => actionNote.trim() && addAnnotation('action-item', targetMessageId)}
                    className="px-2 py-0.5 text-[10px] rounded bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-30"
                    disabled={!actionNote.trim()}
                  >
                    <CheckSquare className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Empty state prompt */}
          {!targetMessageId && annotations.length === 0 && (
            <div className="p-3 border-t border-[var(--vl-border)] text-center">
              <AlertCircle className="w-4 h-4 text-[var(--vl-text-muted)] mx-auto mb-1 opacity-50" />
              <p className="text-[10px] text-[var(--vl-text-muted)]">{lang === 'zh' ? '点击消息旁的按钮来添加标注' : 'Click buttons on messages to annotate'}</p>
            </div>
          )}
        </div>
      )}

      {/* Exported helpers for external use */}
      <span data-annotations-count={counts.total} className="hidden" />
    </div>
  )
}
