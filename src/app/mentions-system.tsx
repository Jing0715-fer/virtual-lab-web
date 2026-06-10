'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  AtSign, Bell, BellOff, Check, CheckCheck,
  MessageSquare, Sparkles, UserPlus, Trash2,
  Filter, X, ArrowRight, ExternalLink,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { Agent } from './shared-components'

// ============================================================
// Types
// ============================================================

interface MentionNotification {
  id: string
  type: 'mention' | 'reply' | 'general'
  text: string
  source: string // meeting name or context
  actorName: string
  actorColor: string
  timestamp: string
  read: boolean
  link?: string
  mentions: string[] // array of mentioned agent names
}

interface MentionsState {
  notifications: MentionNotification[]
}

// ============================================================
// Constants
// ============================================================

const STORAGE_KEY = 'vl-mentions'

const MENTION_REGEX = /@(\w+)/g

// ============================================================
// Hooks
// ============================================================

function useMentionsPersistence(agents: Agent[]) {
  const [state, setState] = useState<MentionsState>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) return JSON.parse(stored)
      } catch { /* ignore */ }
    }
    return { notifications: [] }
  })

  // Generate initial simulated notifications
  useEffect(() => {
    if (state.notifications.length > 0) return

    // Generate simulated notifications
    const simulated: MentionNotification[] = agents.slice(0, 4).map((agent, idx) => ({
      id: `notif-${agent.id}-${idx}`,
      type: 'mention' as const,
      text: `${agents[(idx + 1) % agents.length]?.title || 'Someone'} mentioned @${agent.title} in the discussion`,
      source: `Team Meeting #${idx + 1}`,
      actorName: agents[(idx + 1) % agents.length]?.title || 'System',
      actorColor: agents[(idx + 1) % agents.length]?.color || '#6366f1',
      timestamp: new Date(Date.now() - (idx + 1) * 15 * 60000).toISOString(),
      read: idx > 1,
      mentions: [agent.title],
    }))

    // Add some reply notifications
    simulated.push({
      id: 'notif-reply-1',
      type: 'reply',
      text: `${agents[0]?.title || 'Agent'} replied to your question about nanobody design`,
      source: 'Individual Meeting #1',
      actorName: agents[0]?.title || 'System',
      actorColor: agents[0]?.color || '#6366f1',
      timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
      read: false,
      mentions: [],
    })

    simulated.push({
      id: 'notif-general-1',
      type: 'general',
      text: 'Pipeline stage "Analysis" has been completed',
      source: 'Research Pipeline',
      actorName: 'System',
      actorColor: '#10b981',
      timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
      read: true,
      mentions: [],
    })

    const newState = { notifications: simulated }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrating from simulated data on mount
    setState(newState)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(newState)) } catch { /* ignore */ }
  }, [agents])

  const persist = useCallback((newState: MentionsState) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(newState)) } catch { /* ignore */ }
  }, [])

  const markAsRead = useCallback((id: string) => {
    setState(prev => {
      const updated = {
        ...prev,
        notifications: prev.notifications.map(n =>
          n.id === id ? { ...n, read: true } : n
        ),
      }
      persist(updated)
      return updated
    })
  }, [persist])

  const markAllRead = useCallback(() => {
    setState(prev => {
      const updated = {
        ...prev,
        notifications: prev.notifications.map(n => ({ ...n, read: true })),
      }
      persist(updated)
      return updated
    })
    toast.success('All notifications marked as read', { duration: 1500 })
  }, [persist])

  const addNotification = useCallback((notification: Omit<MentionNotification, 'id'>) => {
    const newNotif: MentionNotification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    }
    setState(prev => {
      const updated = {
        notifications: [newNotif, ...prev.notifications],
      }
      persist(updated)
      return updated
    })
  }, [persist])

  const unreadCount = state.notifications.filter(n => !n.read).length

  return { state, markAsRead, markAllRead, addNotification, unreadCount }
}

// ============================================================
// MentionHighlight Component
// ============================================================

export function MentionHighlight({ text, agents }: { text: string; agents: Agent[] }) {
  const parts = useMemo(() => {
    const result: React.ReactNode[] = []
    let lastIndex = 0
    let match

    const regex = new RegExp(MENTION_REGEX.source, 'g')
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        result.push(text.slice(lastIndex, match.index))
      }
      const mentionName = match[1]
      const isAgent = agents.some(a => a.title.toLowerCase() === mentionName.toLowerCase())
      if (isAgent) {
        result.push(
          <span
            key={match.index}
            className="mention-highlight"
            onClick={() => toast.info(`Viewing ${mentionName}'s profile`, { duration: 1500 })}
          >
            @{mentionName}
          </span>
        )
      } else {
        result.push(match[0])
      }
      lastIndex = regex.lastIndex
    }
    if (lastIndex < text.length) {
      result.push(text.slice(lastIndex))
    }
    return result
  }, [text, agents])

  return <>{parts}</>
}

// ============================================================
// MentionAutocomplete Component
// ============================================================

export function MentionAutocomplete({
  agents,
  query,
  onSelect,
  visible,
  position,
}: {
  agents: Agent[]
  query: string
  onSelect: (agent: Agent) => void
  visible: boolean
  position: { top: number; left: number }
}) {
  const filtered = useMemo(() => {
    if (!query) return agents.slice(0, 5)
    return agents.filter(a =>
      a.title.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5)
  }, [agents, query])

  const [activeIdx, setActiveIdx] = useState(0)

  useEffect(() => {
    // Reset active index when query changes
    const timer = requestAnimationFrame(() => setActiveIdx(0))
    return () => cancelAnimationFrame(timer)
  }, [query])

  if (!visible || filtered.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      className="mention-autocomplete"
      style={{ position: 'fixed', top: position.top, left: position.left, width: 220, zIndex: 50 }}
    >
      <div className="p-1">
        <p className="text-[9px] font-semibold vl-text-muted px-2 py-1 uppercase tracking-wider">Mention Agents</p>
        {filtered.map((agent, idx) => (
          <button
            key={agent.id}
            className={`mention-autocomplete-item w-full text-left ${idx === activeIdx ? 'active' : ''}`}
            onClick={() => onSelect(agent)}
            onMouseEnter={() => setActiveIdx(idx)}
          >
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] text-white font-bold shrink-0"
              style={{ backgroundColor: agent.color }}
            >
              {agent.title.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs vl-text-heading font-medium">{agent.title}</span>
              <span className="text-[9px] vl-text-muted ml-1 truncate">{agent.role}</span>
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  )
}

// ============================================================
// MentionComposerInput Component
// ============================================================

export function MentionComposerInput({
  agents,
  lang,
  onSend,
}: {
  agents: Agent[]
  lang: Lang
  onSend: (text: string) => void
}) {
  const [text, setText] = useState('')
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [cursorPos, setCursorPos] = useState({ top: 0, left: 0 })
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setText(value)

    // Detect @mention trigger
    const cursorIndex = e.target.selectionStart
    const textBeforeCursor = value.slice(0, cursorIndex)
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/)

    if (mentionMatch) {
      setMentionQuery(mentionMatch[1])
      setShowAutocomplete(true)

      // Calculate dropdown position
      if (textareaRef.current) {
        const rect = textareaRef.current.getBoundingClientRect()
        setCursorPos({ top: rect.top - 180, left: rect.left })
      }
    } else {
      setShowAutocomplete(false)
      setMentionQuery('')
    }
  }, [])

  const handleSelectAgent = useCallback((agent: Agent) => {
    if (!textareaRef.current) return
    const cursorIndex = textareaRef.current.selectionStart
    const textBeforeCursor = text.slice(0, cursorIndex)
    const mentionStart = textBeforeCursor.lastIndexOf('@')
    if (mentionStart === -1) return

    const newText = text.slice(0, mentionStart) + `@${agent.title} ` + text.slice(cursorIndex)
    setText(newText)
    setShowAutocomplete(false)
    setMentionQuery('')

    // Move cursor to after the inserted mention
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = mentionStart + agent.title.length + 2
        textareaRef.current.selectionStart = newCursorPos
        textareaRef.current.selectionEnd = newCursorPos
        textareaRef.current.focus()
      }
    }, 0)
  }, [text])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (text.trim()) {
        onSend(text)
        setText('')
        setShowAutocomplete(false)
      }
    }
  }, [text, onSend])

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Type @ to mention an agent..."
        className="w-full min-h-[60px] p-3 text-sm vl-text-body bg-[var(--vl-bg-inner)] border border-[var(--vl-border)] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[var(--vl-accent)] focus:ring-opacity-30 transition-shadow placeholder:text-[var(--vl-text-muted)]"
        rows={2}
      />
      <AnimatePresence>
        {showAutocomplete && (
          <MentionAutocomplete
            agents={agents}
            query={mentionQuery}
            onSelect={handleSelectAgent}
            visible={showAutocomplete}
            position={cursorPos}
          />
        )}
      </AnimatePresence>
      <div className="flex items-center justify-between mt-1.5">
        <p className="text-[9px] vl-text-muted">
          <AtSign className="size-2.5 inline mr-0.5" />
          Type @ to mention agents · Press Enter to send
        </p>
        <Button
          size="sm"
          className="h-6 text-[10px] bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-0"
          onClick={() => {
            if (text.trim()) { onSend(text); setText('') }
          }}
          disabled={!text.trim()}
        >
          <MessageSquare className="size-3 mr-1" />
          Send
        </Button>
      </div>
    </div>
  )
}

// ============================================================
// Notification Item Component
// ============================================================

function NotificationItem({
  notification,
  onMarkRead,
  onClick,
}: {
  notification: MentionNotification
  onMarkRead: (id: string) => void
  onClick: (notification: MentionNotification) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mention-notification-item ${!notification.read ? 'unread' : ''}`}
      onClick={() => {
        if (!notification.read) onMarkRead(notification.id)
        onClick(notification)
      }}
    >
      <div className="flex items-start gap-2.5">
        {/* Icon */}
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
          style={{ backgroundColor: `${notification.actorColor}15` }}
        >
          {notification.type === 'mention' ? (
            <AtSign className="size-3.5" style={{ color: '#06b6d4' }} />
          ) : notification.type === 'reply' ? (
            <MessageSquare className="size-3.5" style={{ color: notification.actorColor }} />
          ) : (
            <Sparkles className="size-3.5 text-emerald-400" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs vl-text-body leading-relaxed">
              <MentionHighlight text={notification.text} agents={[]} />
            </p>
            {!notification.read && (
              <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 mt-1" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[9px] vl-text-muted">{notification.source}</span>
            <span className="text-[9px] vl-text-muted">·</span>
            <span className="text-[9px] vl-text-muted">
              {(() => {
                const diff = Date.now() - new Date(notification.timestamp).getTime()
                if (diff < 60000) return 'just now'
                if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
                return `${Math.floor(diff / 3600000)}h ago`
              })()}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================
// Main Component: MentionsSystem
// ============================================================

export function MentionsSystem({
  lang,
  agents,
}: {
  lang: Lang
  agents: Agent[]
}) {
  const { state, markAsRead, markAllRead, addNotification, unreadCount } = useMentionsPersistence(agents)
  const [filter, setFilter] = useState<'all' | 'unread' | 'mentions'>('all')

  const filteredNotifications = useMemo(() => {
    let filtered = [...state.notifications]
    if (filter === 'unread') filtered = filtered.filter(n => !n.read)
    if (filter === 'mentions') filtered = filtered.filter(n => n.type === 'mention')
    return filtered
  }, [state.notifications, filter])

  const handleNotifClick = useCallback((notification: MentionNotification) => {
    toast.info(`Navigating to: ${notification.source}`, { duration: 1500 })
  }, [])

  const handleSend = useCallback((text: string) => {
    // Detect mentions in the text
    const mentions: string[] = []
    let match
    const regex = new RegExp(MENTION_REGEX.source, 'g')
    while ((match = regex.exec(text)) !== null) {
      mentions.push(match[1])
    }

    addNotification({
      type: mentions.length > 0 ? 'mention' : 'general',
      text: mentions.length > 0
        ? `You mentioned ${mentions.map(m => `@${m}`).join(', ')} in a message`
        : 'You sent a message',
      source: 'Discussion',
      actorName: 'You',
      actorColor: '#10b981',
      timestamp: new Date().toISOString(),
      read: true,
      mentions,
    })

    toast.success('Message sent!', { duration: 1500 })
  }, [addNotification])

  if (agents.length === 0) {
    return (
      <Card className="vl-card backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="activity-empty-state">
            <AtSign className="size-10 vl-text-muted mb-3" />
            <p className="text-sm vl-text-body font-medium">No agents to mention</p>
            <p className="text-xs vl-text-muted mt-1">Create agents to use mentions</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="vl-card backdrop-blur-sm overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 flex items-center justify-center">
              <div className="relative">
                <Bell className="size-4 text-cyan-400" />
                {unreadCount > 0 && (
                  <span className="notification-badge new">{unreadCount}</span>
                )}
              </div>
            </div>
            <div>
              <CardTitle className="text-base font-semibold" style={{ color: 'var(--vl-text-white)' }}>
                Mentions & Notifications
              </CardTitle>
              <p className="text-[10px] vl-text-muted">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <SelectTrigger className="h-7 w-[90px] text-[10px] border-[var(--vl-border)] bg-[var(--vl-bg-inner)]">
                <Filter className="size-3 mr-1 vl-text-muted" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="mentions">Mentions</SelectItem>
              </SelectContent>
            </Select>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[10px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                onClick={markAllRead}
              >
                <CheckCheck className="size-3 mr-1" />
                Mark All Read
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {/* Notifications list */}
        <ScrollArea className="max-h-[14rem]">
          <div className="space-y-1 pr-2">
            {filteredNotifications.length === 0 && (
              <div className="py-6 text-center">
                <BellOff className="size-6 vl-text-muted mx-auto mb-2" />
                <p className="text-xs vl-text-muted">
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
                </p>
              </div>
            )}
            {filteredNotifications.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={markAsRead}
                onClick={handleNotifClick}
              />
            ))}
          </div>
        </ScrollArea>

        {/* Composer */}
        <div className="mt-4 pt-3 border-t border-[var(--vl-border-subtle)]">
          <p className="text-[10px] font-semibold vl-text-muted mb-2 uppercase tracking-wider">
            <AtSign className="size-3 inline mr-0.5" />
            Compose with Mentions
          </p>
          <MentionComposerInput agents={agents} lang={lang} onSend={handleSend} />
        </div>
      </CardContent>
    </Card>
  )
}
