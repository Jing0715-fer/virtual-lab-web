'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bookmark, Star, HelpCircle, ListChecks, Lightbulb, Forward,
  Plus, Trash2, Download, X, ChevronDown, ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

// ============================================================
// Types
// ============================================================

export type BookmarkType = 'important' | 'question' | 'actionItem' | 'insight' | 'followUp'

export interface MeetingBookmark {
  id: string
  type: BookmarkType
  messageIndex: number
  messageSnippet: string
  agentName: string
  createdAt: string
}

interface MeetingBookmarksProps {
  meetingId: string
  messages: { id: string; agentName: string; message: string; roundIndex: number }[]
  lang: Lang
  onJumpToMessage?: (messageIndex: number) => void
}

// ============================================================
// Bookmark type config
// ============================================================

const BOOKMARK_TYPES: { value: BookmarkType; icon: React.ElementType; color: string; bgColor: string }[] = [
  { value: 'important', icon: Star, color: 'text-amber-400', bgColor: 'bg-amber-500/10 border-amber-500/30' },
  { value: 'question', icon: HelpCircle, color: 'text-violet-400', bgColor: 'bg-violet-500/10 border-violet-500/30' },
  { value: 'actionItem', icon: ListChecks, color: 'text-cyan-400', bgColor: 'bg-cyan-500/10 border-cyan-500/30' },
  { value: 'insight', icon: Lightbulb, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10 border-emerald-500/30' },
  { value: 'followUp', icon: Forward, color: 'text-rose-400', bgColor: 'bg-rose-500/10 border-rose-500/30' },
]

const BOOKMARK_TYPE_ICONS: Record<BookmarkType, React.ElementType> = {
  important: Star,
  question: HelpCircle,
  actionItem: ListChecks,
  insight: Lightbulb,
  followUp: Forward,
}

const STORAGE_KEY_PREFIX = 'vl-meeting-bookmarks'

function getBookmarks(meetingId: string): MeetingBookmark[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}-${meetingId}`)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveBookmarks(meetingId: string, bookmarks: MeetingBookmark[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(`${STORAGE_KEY_PREFIX}-${meetingId}`, JSON.stringify(bookmarks))
}

// ============================================================
// Add Bookmark Dialog
// ============================================================

function AddBookmarkDialog({
  messageIndex,
  messageSnippet,
  agentName,
  meetingId,
  existingBookmarks,
  lang,
  onAdd,
  onClose,
}: {
  messageIndex: number
  messageSnippet: string
  agentName: string
  meetingId: string
  existingBookmarks: MeetingBookmark[]
  lang: Lang
  onAdd: (bookmark: MeetingBookmark) => void
  onClose: () => void
}) {
  const [type, setType] = useState<BookmarkType>('important')

  const handleAdd = () => {
    const bookmark: MeetingBookmark = {
      id: `bm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      messageIndex,
      messageSnippet: messageSnippet.slice(0, 200),
      agentName,
      createdAt: new Date().toISOString(),
    }
    onAdd(bookmark)
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -4 }}
      className="vl-card border border-[var(--vl-border)] rounded-xl p-3 shadow-lg z-50 min-w-[220px]"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold vl-text-heading">{t(lang, 'meetingBookmarks.add')}</span>
        <button onClick={onClose} className="p-1 rounded hover:bg-[var(--vl-bg-inner)] vl-text-muted">
          <X className="size-3" />
        </button>
      </div>
      <p className="text-[10px] vl-text-muted line-clamp-2 mb-2">"{messageSnippet.slice(0, 100)}..."</p>
      <Select value={type} onValueChange={(v) => setType(v as BookmarkType)}>
        <SelectTrigger className="vl-input h-7 text-xs">
          <SelectValue placeholder={t(lang, 'meetingBookmarks.selectType')} />
        </SelectTrigger>
        <SelectContent className="vl-dialog">
          {BOOKMARK_TYPES.map(bt => (
            <SelectItem key={bt.value} value={bt.value} className="text-xs vl-text-heading">
              {t(lang, `meetingBookmarks.type.${bt.value}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" className="mt-2 h-7 w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs" onClick={handleAdd}>
        <Plus className="size-3 mr-1" /> {t(lang, 'meetingBookmarks.add')}
      </Button>
    </motion.div>
  )
}

// ============================================================
// Meeting Bookmarks Panel
// ============================================================

export function MeetingBookmarksPanel({
  meetingId,
  messages,
  lang,
  onJumpToMessage,
}: MeetingBookmarksProps) {
  const [bookmarks, setBookmarks] = useState<MeetingBookmark[]>([])
  const [expanded, setExpanded] = useState(true)

  // Load from localStorage
  useEffect(() => {
    setBookmarks(getBookmarks(meetingId))
  }, [meetingId])

  const addBookmark = useCallback((bookmark: MeetingBookmark) => {
    setBookmarks(prev => {
      const next = [...prev, bookmark]
      saveBookmarks(meetingId, next)
      return next
    })
    toast.success(t(lang, 'meetingBookmarks.title'))
  }, [meetingId, lang])

  const removeBookmark = useCallback((id: string) => {
    setBookmarks(prev => {
      const next = prev.filter(b => b.id !== id)
      saveBookmarks(meetingId, next)
      return next
    })
  }, [meetingId])

  const exportSummary = useCallback(() => {
    if (bookmarks.length === 0) return
    const lines = bookmarks.map(b => {
      const typeLabel = t(lang, `meetingBookmarks.type.${b.type}`)
      const time = new Date(b.createdAt).toLocaleString()
      return `[${typeLabel}] ${b.agentName} (Round ${messages[b.messageIndex]?.roundIndex ?? '?'}): ${b.messageSnippet} — ${time}`
    })
    const text = lines.join('\n')
    navigator.clipboard.writeText(text)
    toast.success(t(lang, 'meetingBookmarks.copied'))
  }, [bookmarks, lang, messages])

  // Stats per type
  const stats = useMemo(() => {
    const s: Record<string, number> = {}
    bookmarks.forEach(b => { s[b.type] = (s[b.type] || 0) + 1 })
    return s
  }, [bookmarks])

  return (
    <div className="vl-inner rounded-xl border border-[var(--vl-border-subtle)] p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bookmark className="size-4 text-emerald-400" />
          <span className="text-xs font-semibold vl-text-heading">{t(lang, 'meetingBookmarks.title')}</span>
          <Badge variant="secondary" className="text-[9px] px-1.5 bg-emerald-500/15 text-emerald-400">
            {t(lang, 'meetingBookmarks.count').replace('{count}', String(bookmarks.length))}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          {bookmarks.length > 0 && (
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 vl-text-muted hover:text-emerald-400" onClick={exportSummary}>
              <Download className="size-3" />
            </Button>
          )}
          <button onClick={() => setExpanded(!expanded)} className="p-1 rounded hover:bg-[var(--vl-bg-inner)] vl-text-muted">
            {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </button>
        </div>
      </div>

      {/* Type stats */}
      {bookmarks.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {BOOKMARK_TYPES.filter(bt => stats[bt.value]).map(bt => (
            <span key={bt.value} className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-md border ${bt.bgColor}`}>
              <bt.icon className="size-2.5" />
              <span className={bt.color}>{stats[bt.value]}</span>
            </span>
          ))}
        </div>
      )}

      {/* Bookmark list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar">
              {bookmarks.length === 0 ? (
                <div className="text-center py-4">
                  <Bookmark className="size-6 mx-auto mb-2 vl-text-muted opacity-40" />
                  <p className="text-[10px] vl-text-muted">{t(lang, 'meetingBookmarks.noBookmarks')}</p>
                  <p className="text-[9px] vl-text-muted opacity-60">{t(lang, 'meetingBookmarks.noBookmarksDesc')}</p>
                </div>
              ) : (
                bookmarks.map(bm => {
                  const TypeIcon = BOOKMARK_TYPE_ICONS[bm.type]
                  const bt = BOOKMARK_TYPES.find(x => x.value === bm.type)
                  return (
                    <motion.div
                      key={bm.id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10, height: 0 }}
                      className={`flex items-start gap-2 p-2 rounded-lg border ${bt?.bgColor || ''} group`}
                    >
                      <TypeIcon className={`size-3.5 mt-0.5 shrink-0 ${bt?.color || ''}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-medium ${bt?.color || ''}`}>
                            {t(lang, `meetingBookmarks.type.${bm.type}`)}
                          </span>
                          <span className="text-[9px] vl-text-muted">
                            {t(lang, 'meetingBookmarks.bookmarkedAt').replace('{time}', new Date(bm.createdAt).toLocaleTimeString())}
                          </span>
                        </div>
                        <p className="text-[10px] vl-text-body line-clamp-2 mt-0.5">{bm.messageSnippet}</p>
                      </div>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {onJumpToMessage && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => onJumpToMessage(bm.messageIndex)}
                                  className="p-1 rounded hover:bg-white/10 vl-text-muted hover:text-emerald-400"
                                >
                                  <Forward className="size-3" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>{t(lang, 'meetingBookmarks.jumpToMessage')}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        <button
                          onClick={() => removeBookmark(bm.id)}
                          className="p-1 rounded hover:bg-rose-500/10 vl-text-muted hover:text-rose-400"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    </motion.div>
                  )
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================
// Bookmark button with badge (for meeting detail header)
// ============================================================

export function BookmarkButton({
  meetingId,
  onClick,
}: {
  meetingId: string
  onClick: () => void
}) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const bms = getBookmarks(meetingId)
    requestAnimationFrame(() => { setCount(bms.length) })
  }, [meetingId])

  return (
    <button
      onClick={onClick}
      className="relative p-2 rounded-lg transition-all duration-200 btn-hover-lift touch-action-manipulation text-[var(--vl-text-muted)] hover:text-[var(--vl-text-body)] hover:bg-[var(--vl-bg-inner)]"
      aria-label={t('en', 'meetingBookmarks.toggle')}
    >
      <Bookmark className="size-3.5" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white text-[8px] font-bold flex items-center justify-center">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  )
}

// ============================================================
// Add bookmark trigger per message
// ============================================================

export function MessageBookmarkTrigger({
  messageIndex,
  messageSnippet,
  agentName,
  meetingId,
  lang,
}: {
  messageIndex: number
  messageSnippet: string
  agentName: string
  meetingId: string
  lang: Lang
}) {
  const [open, setOpen] = useState(false)
  const bookmarks = useMemo(() => getBookmarks(meetingId), [meetingId])

  const handleAdd = (bookmark: MeetingBookmark) => {
    const existing = getBookmarks(meetingId)
    saveBookmarks(meetingId, [...existing, bookmark])
    setOpen(false)
  }

  const isBookmarked = bookmarks.some(b => b.messageIndex === messageIndex)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`p-1 rounded transition-colors ${isBookmarked ? 'text-amber-400' : 'vl-text-muted hover:text-amber-400'}`}
      >
        <Bookmark className={`size-3 ${isBookmarked ? 'fill-current' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <div className="absolute right-0 top-full z-50 mt-1">
            <AddBookmarkDialog
              messageIndex={messageIndex}
              messageSnippet={messageSnippet}
              agentName={agentName}
              meetingId={meetingId}
              existingBookmarks={bookmarks}
              lang={lang}
              onAdd={handleAdd}
              onClose={() => setOpen(false)}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export { BOOKMARK_TYPES, BOOKMARK_TYPE_ICONS }
