'use client'

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Smile, Plus, Sparkles } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

// ============================================================
// Types
// ============================================================

export interface ReactionType {
  emoji: string
  name: string
}

export interface ReactionData {
  emoji: string
  count: number
  reactors: string[]
  hasReacted: boolean
}

interface ReactionsState {
  [targetId: string]: Record<string, ReactionData>
}

// ============================================================
// Constants
// ============================================================

export const REACTION_TYPES: ReactionType[] = [
  { emoji: '👍', name: 'thumbs_up' },
  { emoji: '❤️', name: 'heart' },
  { emoji: '🤔', name: 'thinking' },
  { emoji: '🚀', name: 'rocket' },
  { emoji: '💡', name: 'lightbulb' },
  { emoji: '✅', name: 'checkmark' },
  { emoji: '❓', name: 'question' },
  { emoji: '🔥', name: 'fire' },
]

const STORAGE_KEY = 'vl-reactions'

// ============================================================
// Hooks
// ============================================================

function useReactionsPersistence() {
  const [reactionsState, setReactionsState] = useState<ReactionsState>({})

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setReactionsState(JSON.parse(stored))
    } catch { /* ignore */ }
  }, [])

  const persist = useCallback((state: ReactionsState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch { /* ignore */ }
  }, [])

  const toggleReaction = useCallback((targetId: string, emoji: string, currentUser: string) => {
    setReactionsState(prev => {
      const targetReactions = prev[targetId] || {}
      const existing = targetReactions[emoji]

      let updated: ReactionData
      if (existing) {
        if (existing.hasReacted) {
          // Remove our reaction
          const newCount = existing.count - 1
          const newReactors = existing.reactors.filter(r => r !== currentUser)
          if (newCount <= 0) {
            const { [emoji]: _, ...rest } = targetReactions
            const nextState = { ...prev, [targetId]: rest }
            persist(nextState)
            return nextState
          }
          updated = { emoji, count: newCount, reactors: newReactors, hasReacted: false }
        } else {
          // Add our reaction
          updated = { emoji, count: existing.count + 1, reactors: [...existing.reactors, currentUser], hasReacted: true }
        }
      } else {
        // New reaction
        updated = { emoji, count: 1, reactors: [currentUser], hasReacted: true }
      }

      const nextState = { ...prev, [targetId]: { ...targetReactions, [emoji]: updated } }
      persist(nextState)
      return nextState
    })
  }, [persist])

  const getReactions = useCallback((targetId: string): Record<string, ReactionData> => {
    return reactionsState[targetId] || {}
  }, [reactionsState])

  const getMostReacted = useCallback((): string | null => {
    let maxCount = 0
    let maxId: string | null = null
    Object.entries(reactionsState).forEach(([id, reactions]) => {
      const total = Object.values(reactions).reduce((sum, r) => sum + r.count, 0)
      if (total > maxCount) {
        maxCount = total
        maxId = id
      }
    })
    return maxCount >= 3 ? maxId : null
  }, [reactionsState])

  return { getReactions, toggleReaction, getMostReacted, reactionsState }
}

// ============================================================
// ReactionPicker Component
// ============================================================

export function ReactionPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-[var(--vl-bg-card-hover)] transition-colors opacity-0 group-hover/reaction:opacity-100"
          aria-label="Add reaction"
        >
          <Smile className="size-3.5 vl-text-muted" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-1.5 vl-dialog" align="start" side="top">
        <div className="reaction-picker-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {REACTION_TYPES.map(reaction => (
            <motion.button
              key={reaction.emoji}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              className="reaction-picker-item"
              onClick={() => onSelect(reaction.emoji)}
              aria-label={`React with ${reaction.name}`}
            >
              {reaction.emoji}
            </motion.button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================
// AvatarStack Component
// ============================================================

function AvatarStack({ reactors, max = 5 }: { reactors: string[]; max?: number }) {
  const displayed = reactors.slice(0, max)
  const remaining = reactors.length - max
  const colors = ['#10b981', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#ec4899', '#f97316']

  return (
    <div className="avatar-stack">
      {displayed.map((reactor, i) => (
        <TooltipProvider key={reactor}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="avatar-stack-item text-white font-bold"
                style={{ backgroundColor: colors[i % colors.length] }}
              >
                {reactor.charAt(0).toUpperCase()}
              </div>
            </TooltipTrigger>
            <TooltipContent className="vl-inner text-[10px]">{reactor}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
      {remaining > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="avatar-stack-more">+{remaining}</div>
            </TooltipTrigger>
            <TooltipContent className="vl-inner text-[10px]">
              {reactors.slice(max).join(', ')}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}

// ============================================================
// ReactionPill Component
// ============================================================

function ReactionPill({
  reaction,
  onClick,
  onHover,
}: {
  reaction: ReactionData
  onClick: () => void
  onHover?: (show: boolean) => void
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`reaction-pill ${reaction.hasReacted ? 'reacted' : ''}`}
            onClick={onClick}
            onMouseEnter={() => onHover?.(true)}
            onMouseLeave={() => onHover?.(false)}
            aria-label={`${reaction.emoji} ${reaction.count}`}
          >
            <span className="text-sm">{reaction.emoji}</span>
            {reaction.count > 1 && (
              <span className="reaction-count">{reaction.count}</span>
            )}
          </motion.button>
        </TooltipTrigger>
        <TooltipContent className="vl-inner">
          {reaction.hasReacted ? 'Click to remove' : 'Click to react'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ============================================================
// FloatingReactionEffect
// ============================================================

function FloatingReactionEffect({ emoji, x, y }: { emoji: string; x: number; y: number }) {
  return (
    <motion.div
      initial={{ opacity: 1, y: 0, scale: 1 }}
      animate={{ opacity: 0, y: -60, scale: 1.5 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className="reaction-float pointer-events-none fixed z-50 text-2xl"
      style={{ left: x, top: y }}
    >
      {emoji}
    </motion.div>
  )
}

// ============================================================
// ReactionBar Component (aggregate for meeting)
// ============================================================

export function ReactionBar({
  targetId,
  currentUser,
  onToggle,
  reactions,
  showAvatarStack = true,
  className = '',
}: {
  targetId: string
  currentUser: string
  onToggle: (targetId: string, emoji: string) => void
  reactions: Record<string, ReactionData>
  showAvatarStack?: boolean
  className?: string
}) {
  const reactionEntries = Object.entries(reactions).filter(([, r]) => r.count > 0)
  const totalReactions = reactionEntries.reduce((sum, [, r]) => sum + r.count, 0)

  return (
    <div className={`flex items-center gap-1.5 flex-wrap group/reaction ${className}`}>
      {reactionEntries.map(([emoji, data]) => (
        <ReactionPill
          key={`${targetId}-${emoji}`}
          reaction={data}
          onClick={() => onToggle(targetId, emoji)}
        />
      ))}
      {totalReactions > 0 && showAvatarStack && (
        <AvatarStack
          reactors={reactionEntries.flatMap(([, r]) => r.reactors)}
          max={5}
        />
      )}
    </div>
  )
}

// ============================================================
// MessageReactionRow Component
// ============================================================

export function MessageReactionRow({
  messageId,
  currentUser,
  lang,
}: {
  messageId: string
  currentUser: string
  lang: Lang
}) {
  const { getReactions, toggleReaction, getMostReacted } = useReactionsPersistence()
  const [showPicker, setShowPicker] = useState(false)
  const [floatingReaction, setFloatingReaction] = useState<{ emoji: string; x: number; y: number } | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  const reactions = getReactions(messageId)
  const reactionEntries = Object.entries(reactions).filter(([, r]) => r.count > 0)
  const mostReactedId = getMostReacted()
  const isMostReacted = mostReactedId === messageId && reactionEntries.length > 0

  const handleToggle = useCallback((emoji: string) => {
    toggleReaction(messageId, emoji, currentUser)

    // Show floating reaction effect
    if (triggerRef.current && !reactions[emoji]?.hasReacted) {
      const rect = triggerRef.current.getBoundingClientRect()
      setFloatingReaction({
        emoji,
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
      })
      setTimeout(() => setFloatingReaction(null), 800)
    }

    toast.success(
      reactions[emoji]?.hasReacted
        ? `Removed ${emoji} reaction`
        : `Added ${emoji} reaction`,
      { duration: 1500 }
    )
  }, [toggleReaction, messageId, currentUser, reactions])

  return (
    <div ref={triggerRef} className={isMostReacted ? 'most-reacted-highlight' : ''}>
      <div className="flex items-center gap-1 flex-wrap group/reaction">
        {reactionEntries.map(([emoji, data]) => (
          <ReactionPill
            key={emoji}
            reaction={data}
            onClick={() => handleToggle(emoji)}
          />
        ))}
        <ReactionPicker onSelect={(emoji) => handleToggle(emoji)} />
      </div>
      <AnimatePresence>
        {floatingReaction && (
          <FloatingReactionEffect
            emoji={floatingReaction.emoji}
            x={floatingReaction.x}
            y={floatingReaction.y}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================
// Main Export: ReactionsSystem
// ============================================================

export function ReactionsSystem({
  messages,
  agents,
  lang,
}: {
  messages: { id: string; agentName: string; message: string }[]
  agents: { title: string; color: string }[]
  lang: Lang
}) {
  const { getReactions, toggleReaction } = useReactionsPersistence()

  // Aggregate all reactions across messages
  const aggregateReactions = useMemo(() => {
    const aggregated: Record<string, ReactionData> = {}
    messages.forEach(msg => {
      const msgReactions = getReactions(msg.id)
      Object.entries(msgReactions).forEach(([emoji, data]) => {
        if (aggregated[emoji]) {
          aggregated[emoji] = {
            ...aggregated[emoji],
            count: aggregated[emoji].count + data.count,
            reactors: [...new Set([...aggregated[emoji].reactors, ...data.reactors])],
          }
        } else {
          aggregated[emoji] = { ...data }
        }
      })
    })
    return aggregated
  }, [messages, getReactions])

  const aggregateEntries = Object.entries(aggregateReactions).filter(([, r]) => r.count > 0)
  const totalReactionsCount = aggregateEntries.reduce((sum, [, r]) => sum + r.count, 0)

  const handleAggregateToggle = useCallback((_targetId: string, emoji: string) => {
    // Toggle on the first message (as a simplified demo)
    if (messages.length > 0) {
      toggleReaction(messages[0].id, emoji, 'You')
    }
  }, [messages, toggleReaction])

  return (
    <div className="vl-card backdrop-blur-sm border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-pink-500/15 flex items-center justify-center">
            <Sparkles className="size-3.5 text-pink-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--vl-text-white)' }}>Reactions & Social</h3>
            <p className="text-[10px] vl-text-muted">{totalReactionsCount} total reactions across {messages.length} messages</p>
          </div>
        </div>
      </div>

      {/* Aggregate reactions for the meeting */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        {aggregateEntries.map(([emoji, data]) => (
          <div key={emoji} className="flex items-center gap-1">
            <span className="text-lg">{emoji}</span>
            <span className="text-xs font-medium vl-text-body">{data.count}</span>
            <AvatarStack reactors={data.reactors} max={3} />
          </div>
        ))}
        {aggregateEntries.length === 0 && (
          <p className="text-xs vl-text-muted">No reactions yet — hover over messages to react!</p>
        )}
      </div>

      {/* Individual message reactions */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {messages.slice(0, 10).map(msg => {
          const msgReactions = getReactions(msg.id)
          const hasReactions = Object.values(msgReactions).some(r => r.count > 0)
          if (!hasReactions) return null
          return (
            <div key={msg.id} className="flex items-start gap-2 px-2 py-1.5 rounded-md bg-[var(--vl-bg-inner)] border border-[var(--vl-border-subtle)]">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] text-white font-bold shrink-0 mt-0.5"
                style={{ backgroundColor: agents.find(a => a.title === msg.agentName)?.color || '#6366f1' }}
              >
                {msg.agentName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] vl-text-muted truncate">{msg.agentName}: {msg.message.substring(0, 60)}{msg.message.length > 60 ? '...' : ''}</p>
                <ReactionBar
                  targetId={msg.id}
                  currentUser="You"
                  onToggle={handleAggregateToggle}
                  reactions={msgReactions}
                  showAvatarStack={false}
                  className="mt-1"
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
