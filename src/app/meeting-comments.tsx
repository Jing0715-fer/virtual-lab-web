'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, ThumbsUp, ThumbsDown, Heart, PartyPopper,
  HelpCircle, Lightbulb, Plus, Trash2, X, ChevronDown, ChevronUp,
  Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

// ============================================================
// Types
// ============================================================

const REACTION_EMOJIS = [
  { emoji: '👍', label: 'thumbsUp' },
  { emoji: '👎', label: 'thumbsDown' },
  { emoji: '❤️', label: 'heart' },
  { emoji: '🎉', label: 'celebrate' },
  { emoji: '🤔', label: 'thinking' },
  { emoji: '💡', label: 'insight' },
] as const

export interface MeetingComment {
  id: string
  content: string
  createdAt: string
}

export interface MessageReaction {
  emoji: string
  count: number
  userId: string // 'you'
}

export interface MessageCommentsData {
  comments: MeetingComment[]
  reactions: MessageReaction[]
}

interface MessageCommentsKey {
  meetingId: string
  messageIndex: number
}

const STORAGE_PREFIX = 'vl-meeting-comments'

function storageKey(meetingId: string, messageIndex: number) {
  return `${STORAGE_PREFIX}-${meetingId}-${messageIndex}`
}

function loadCommentsData(meetingId: string, messageIndex: number): MessageCommentsData {
  if (typeof window === 'undefined') return { comments: [], reactions: [] }
  try {
    const raw = localStorage.getItem(storageKey(meetingId, messageIndex))
    return raw ? JSON.parse(raw) : { comments: [], reactions: [] }
  } catch {
    return { comments: [], reactions: [] }
  }
}

function saveCommentsData(meetingId: string, messageIndex: number, data: MessageCommentsData) {
  if (typeof window === 'undefined') return
  localStorage.setItem(storageKey(meetingId, messageIndex), JSON.stringify(data))
}

// ============================================================
// Single message comment indicator badge
// ============================================================

export function MessageCommentIndicator({
  meetingId,
  messageIndex,
  lang,
  onToggle,
}: {
  meetingId: string
  messageIndex: number
  lang: Lang
  onToggle: () => void
}) {
  const [data, setData] = useState<MessageCommentsData>({ comments: [], reactions: [] })

  useEffect(() => {
    setData(loadCommentsData(meetingId, messageIndex))
  }, [meetingId, messageIndex])

  const total = data.comments.length + data.reactions.reduce((s, r) => s + r.count, 0)
  if (total === 0) return null

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle() }}
      className="inline-flex items-center gap-1 text-[9px] vl-text-muted hover:text-emerald-400 transition-colors px-1.5 py-0.5 rounded-md hover:bg-emerald-500/10"
    >
      <MessageSquare className="size-2.5" />
      {total}
    </button>
  )
}

// ============================================================
// Message Comments & Reactions Panel (accordion below message)
// ============================================================

export function MessageCommentsPanel({
  meetingId,
  messageIndex,
  lang,
}: {
  meetingId: string
  messageIndex: number
  lang: Lang
}) {
  const [data, setData] = useState<MessageCommentsData>({ comments: [], reactions: [] })
  const [showReactions, setShowReactions] = useState(false)
  const [commentInput, setCommentInput] = useState('')

  useEffect(() => {
    setData(loadCommentsData(meetingId, messageIndex))
  }, [meetingId, messageIndex])

  const updateData = useCallback((updater: (prev: MessageCommentsData) => MessageCommentsData) => {
    setData(prev => {
      const next = updater(prev)
      saveCommentsData(meetingId, messageIndex, next)
      return next
    })
  }, [meetingId, messageIndex])

  const addComment = useCallback(() => {
    const text = commentInput.trim()
    if (!text) return
    const newComment: MeetingComment = {
      id: `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      content: text,
      createdAt: new Date().toISOString(),
    }
    updateData(prev => ({ ...prev, comments: [...prev.comments, newComment] }))
    setCommentInput('')
  }, [commentInput, updateData])

  const deleteComment = useCallback((id: string) => {
    updateData(prev => ({
      ...prev,
      comments: prev.comments.filter(c => c.id !== id),
    }))
    toast.success(t(lang, 'meetingComments.deleted'))
  }, [updateData, lang])

  const toggleReaction = useCallback((emoji: string) => {
    updateData(prev => {
      const existing = prev.reactions.find(r => r.emoji === emoji)
      if (existing) {
        if (existing.userId === 'you') {
          // Remove own reaction
          if (existing.count <= 1) {
            return { ...prev, reactions: prev.reactions.filter(r => r.emoji !== emoji) }
          }
          return { ...prev, reactions: prev.reactions.map(r => r.emoji === emoji ? { ...r, count: r.count - 1, userId: '' } : r) }
        }
        // Add to existing
        return { ...prev, reactions: prev.reactions.map(r => r.emoji === emoji ? { ...r, count: r.count + 1, userId: 'you' } : r) }
      }
      // New reaction
      return { ...prev, reactions: [...prev.reactions, { emoji, count: 1, userId: 'you' }] }
    })
  }, [updateData])

  const totalInteractions = data.comments.length + data.reactions.reduce((s, r) => s + r.count, 0)

  if (totalInteractions === 0 && !commentInput) return null

  return (
    <div className="mt-1.5 space-y-1.5 pl-8 border-l-2 border-[var(--vl-border-subtle)]">
      {/* Reactions bar */}
      {data.reactions.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {data.reactions.map(r => (
            <button
              key={r.emoji}
              onClick={() => toggleReaction(r.emoji)}
              className={`inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full border transition-colors ${
                r.userId === 'you'
                  ? 'bg-emerald-500/15 border-emerald-500/30'
                  : 'border-[var(--vl-border-subtle)] hover:border-emerald-500/30 hover:bg-emerald-500/5'
              }`}
            >
              <span>{r.emoji}</span>
              <span className="text-[9px] vl-text-muted">{r.count}</span>
            </button>
          ))}
          <button
            onClick={() => setShowReactions(!showReactions)}
            className="p-0.5 rounded hover:bg-[var(--vl-bg-inner)] vl-text-muted hover:text-emerald-400 transition-colors"
          >
            <Plus className="size-3" />
          </button>
        </div>
      )}

      {/* Emoji picker */}
      <AnimatePresence>
        {showReactions && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex gap-1 p-1.5 vl-inner rounded-lg border border-[var(--vl-border-subtle)]"
          >
            {REACTION_EMOJIS.map(re => (
              <button
                key={re.emoji}
                onClick={() => { toggleReaction(re.emoji); setShowReactions(false) }}
                className="p-1 rounded hover:bg-[var(--vl-bg-card-hover)] transition-transform hover:scale-125 active:scale-90"
              >
                <span className="text-sm">{re.emoji}</span>
              </button>
            ))}
            <button
              onClick={() => setShowReactions(false)}
              className="ml-auto p-1 rounded hover:bg-[var(--vl-bg-card-hover)] vl-text-muted"
            >
              <X className="size-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comments list */}
      <AnimatePresence>
        {data.comments.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-1"
          >
            {data.comments.map(cmt => (
              <motion.div
                key={cmt.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8, height: 0 }}
                className="flex items-start gap-2 group"
              >
                <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[7px] font-bold text-emerald-400">{t(lang, 'meetingComments.you').charAt(0)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-medium text-emerald-400">{t(lang, 'meetingComments.you')}</span>
                    <span className="text-[8px] vl-text-muted">{new Date(cmt.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-[10px] vl-text-body mt-0.5">{cmt.content}</p>
                </div>
                <button
                  onClick={() => deleteComment(cmt.id)}
                  className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 vl-text-muted hover:text-rose-400 transition-all shrink-0"
                >
                  <Trash2 className="size-2.5" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comment input */}
      <div className="flex items-center gap-1.5">
        <Input
          value={commentInput}
          onChange={(e) => setCommentInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addComment() }}
          placeholder={t(lang, 'meetingComments.placeholder')}
          className="vl-input h-7 text-[10px] flex-1"
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-emerald-400 hover:bg-emerald-500/10 shrink-0"
          onClick={addComment}
          disabled={!commentInput.trim()}
        >
          <Send className="size-3" />
        </Button>
      </div>
    </div>
  )
}

// ============================================================
// Comment count badge (for message row)
// ============================================================

export function getCommentCountBadge(meetingId: string, messageIndex: number): number {
  if (typeof window === 'undefined') return 0
  const data = loadCommentsData(meetingId, messageIndex)
  return data.comments.length + data.reactions.reduce((s, r) => s + r.count, 0)
}
