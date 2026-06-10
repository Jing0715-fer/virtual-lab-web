'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import { useWebSocketSync, type Participant, type ActivityEvent } from './use-websocket-sync'
import {
  Users, Activity, StickyNote, ChevronDown, Clock, Eye,
  MessageSquare, Plus, Loader2, Zap, User, Circle, Type,
  PanelRightOpen,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'

// ============================================================
// Types
// ============================================================

export type PresenceStatus = 'available' | 'away' | 'busy' | 'in-meeting' | 'dnd'

const STATUS_COLORS: Record<PresenceStatus, string> = {
  available: '#10b981',
  away: '#f59e0b',
  busy: '#ef4444',
  'in-meeting': '#8b5cf6',
  dnd: '#6b7280',
}

const STATUS_DOT_CLASS: Record<PresenceStatus, string> = {
  available: 'status-dot-available',
  away: 'status-dot-away',
  busy: 'status-dot-busy',
  'in-meeting': 'status-dot-away',
  dnd: 'status-dot-dnd',
}

const MOCK_USERS: { id: string; name: string; color: string; status: PresenceStatus }[] = [
  { id: 'u1', name: 'Alice Chen', color: '#10b981', status: 'available' },
  { id: 'u2', name: 'Bob Martinez', color: '#06b6d4', status: 'in-meeting' },
  { id: 'u3', name: 'Charlie Kim', color: '#8b5cf6', status: 'busy' },
  { id: 'u4', name: 'Diana Patel', color: '#f59e0b', status: 'away' },
  { id: 'u5', name: 'Ethan Johnson', color: '#ef4444', status: 'available' },
]

const MOCK_ACTIVITIES: ActivityEvent[] = [
  { id: 'a1', userId: 'u1', userName: 'Alice Chen', userColor: '#10b981', action: 'viewing', target: 'Dashboard', timestamp: Date.now() - 120_000, icon: Eye },
  { id: 'a2', userId: 'u2', userName: 'Bob Martinez', userColor: '#06b6d4', action: 'started', target: 'a team meeting', timestamp: Date.now() - 300_000, icon: Plus },
  { id: 'a3', userId: 'u5', userName: 'Ethan Johnson', userColor: '#ef4444', action: 'added', target: 'a pipeline task', timestamp: Date.now() - 600_000, icon: MessageSquare },
  { id: 'a4', userId: 'u3', userName: 'Charlie Kim', userColor: '#8b5cf6', action: 'updated', target: 'agent configuration', timestamp: Date.now() - 900_000, icon: Loader2 },
]

const MOCK_CURSORS = [
  { userId: 'u1', name: 'Alice Chen', color: '#10b981', x: 340, y: 220 },
  { userId: 'u2', name: 'Bob Martinez', color: '#06b6d4', x: 680, y: 480 },
]

// ============================================================
// Helpers
// ============================================================

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

// ============================================================
// OnlinePresenceBar
// ============================================================

export function OnlinePresenceBar({ lang = 'en' }: { lang?: Lang }) {
  const [users, setUsers] = useState(MOCK_USERS)
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set(['u1']))

  // Simulate typing indicator changes
  useEffect(() => {
    const interval = setInterval(() => {
      const userIds = users.map(u => u.id)
      const randomId = userIds[Math.floor(Math.random() * userIds.length)]
      setTypingUsers(prev => {
        const next = new Set(prev)
        if (next.has(randomId)) next.delete(randomId)
        else if (next.size < 2) next.add(randomId)
        return next
      })
    }, 4000)
    return () => clearInterval(interval)
  }, [users])

  return (
    <div className="vl-card rounded-xl p-3 flex items-center gap-3">
      <div className="flex items-center gap-1 shrink-0">
        <div className="w-2 h-2 rounded-full bg-emerald-500 presence-pulse" />
        <span className="text-xs font-medium vl-text-body">{users.length} {t(lang, 'collab.online')}</span>
      </div>
      <div className="flex items-center -space-x-2">
        {users.map(user => (
          <div key={user.id} className="relative" title={`${user.name} — ${user.status}`}>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white ring-2 ring-[var(--vl-bg-card)] transition-transform hover:scale-110 hover:z-10 cursor-pointer"
              style={{ backgroundColor: user.color }}
            >
              {user.name.split(' ').map(n => n[0]).join('')}
            </div>
            {/* Status dot */}
            <div className="absolute -bottom-0.5 -right-0.5">
              <div className={`w-2.5 h-2.5 rounded-full border border-[var(--vl-bg-card)] ${STATUS_DOT_CLASS[user.status]}`} />
            </div>
            {/* Typing indicator */}
            {typingUsers.has(user.id) && (
              <motion.div
                initial={{ opacity: 0, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute -top-1 left-1/2 -translate-x-1/2"
              >
                <span className="text-[9px] vl-text-muted whitespace-nowrap bg-[var(--vl-bg-inner)] px-1 rounded shadow-sm">
                  {t(lang, 'collab.typing')}
                </span>
              </motion.div>
            )}
          </div>
        ))}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] vl-text-muted truncate">
          {typingUsers.size > 0
            ? `${users.find(u => typingUsers.has(u.id))?.name.split(' ')[0]} ${t(lang, 'collab.typing')}`
            : `${users.filter(u => u.status === 'available').length} ${t(lang, 'collab.available')}`
          }
        </p>
      </div>
    </div>
  )
}

// ============================================================
// LiveActivityFeed
// ============================================================

export function LiveActivityFeed({ lang = 'en', activities: initialActivities = MOCK_ACTIVITIES }: { lang?: Lang; activities?: ActivityEvent[] }) {
  const [activities, setActivities] = useState<ActivityEvent[]>(initialActivities)
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  // Simulate new activities arriving periodically
  useEffect(() => {
    const names = MOCK_USERS.map(u => u.name)
    const targets = ['Dashboard', 'a team meeting', 'a pipeline task', 'agent configuration', 'meeting notes', 'analytics data']
    const actions = ['viewing', 'started', 'added', 'updated'] as const
    const icons = [Eye, Plus, MessageSquare, Loader2] as const

    const interval = setInterval(() => {
      const idx = Math.floor(Math.random() * names.length)
      const user = MOCK_USERS[idx]
      const actionIdx = Math.floor(Math.random() * actions.length)
      const targetIdx = Math.floor(Math.random() * targets.length)

      const newEvent: ActivityEvent = {
        id: `sim-${Date.now()}`,
        userId: user.id,
        userName: user.name,
        userColor: user.color,
        action: actions[actionIdx],
        target: targets[targetIdx],
        timestamp: Date.now(),
        icon: icons[actionIdx],
      }

      setActivities(prev => [...prev.slice(-49), newEvent])
    }, 8000)

    return () => clearInterval(interval)
  }, [])

  // Auto-scroll on new events
  useEffect(() => {
    scrollToBottom()
  }, [activities.length, scrollToBottom])

  return (
    <div className="vl-card rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--vl-border-subtle)]">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-emerald-400" />
          <h3 className="text-sm font-medium vl-text-heading">{t(lang, 'collab.activity')}</h3>
        </div>
        <Badge variant="outline" className="text-[10px] px-1.5 bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
          {activities.length} {t(lang, 'collab.activity').toLowerCase()}
        </Badge>
      </div>
      <ScrollArea className="h-64" ref={scrollRef}>
        <div className="p-3 space-y-1">
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Activity className="size-8 vl-text-muted mb-2" />
              <p className="text-xs vl-text-muted">{t(lang, 'collab.noActivity')}</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {activities.map((event, i) => {
                const IconComp = event.icon || MessageSquare
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex items-start gap-2.5 py-2 px-2 rounded-lg hover:bg-[var(--vl-bg-inner)] transition-colors ${i === activities.length - 1 ? 'activity-feed-enter' : ''}`}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{ backgroundColor: `${event.userColor}20` }}
                    >
                      <IconComp className="size-3" style={{ color: event.userColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs vl-text-body leading-relaxed">
                        <span className="font-medium" style={{ color: event.userColor }}>{event.userName.split(' ')[0]}</span>
                        {' '}
                        <span className="vl-text-muted">{t(lang, `collab.${String(event.action)}`)}</span>
                        {' '}
                        <span className="vl-text-heading">{event.target}</span>
                      </p>
                      <p className="text-[10px] vl-text-muted mt-0.5">
                        <Clock className="size-2.5 inline mr-0.5" />
                        {formatTimeAgo(event.timestamp)}
                      </p>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// ============================================================
// CollaborativeCursorsOverlay
// ============================================================

function CollaborativeCursorsOverlay({ cursors = MOCK_CURSORS }: { cursors?: { userId: string; name: string; color: string; x: number; y: number }[] }) {
  const [positions, setPositions] = useState(cursors)
  const animFrameRef = useRef<number>(0)

  // Simulate smooth cursor movement
  useEffect(() => {
    const targets = cursors.map(c => ({
      ...c,
      targetX: c.x + (Math.random() - 0.5) * 400,
      targetY: c.y + (Math.random() - 0.5) * 300,
    }))

    const animate = () => {
      setPositions(prev => prev.map((p, i) => {
        const target = targets[i]
        if (!target) return p
        return {
          ...p,
          x: p.x + (target.targetX - p.x) * 0.02 + (Math.random() - 0.5) * 2,
          y: p.y + (target.targetY - p.y) * 0.02 + (Math.random() - 0.5) * 2,
        }
      }))
      animFrameRef.current = requestAnimationFrame(animate)
    }

    animFrameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [cursors])

  if (positions.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[998] overflow-hidden" aria-hidden="true">
      {positions.map(cursor => (
        <div
          key={cursor.userId}
          className="absolute collab-cursor-trail"
          style={{
            transform: `translate(${cursor.x}px, ${cursor.y}px)`,
            transition: 'transform 0.1s ease-out',
          }}
        >
          {/* Cursor pointer */}
          <svg width="16" height="20" viewBox="0 0 16 20" fill="none" className="drop-shadow-sm">
            <path
              d="M1 1L6 18L8.5 10.5L15 8L1 1Z"
              fill={cursor.color}
              stroke={cursor.color}
              strokeWidth="1"
              strokeLinejoin="round"
            />
          </svg>
          {/* Name label */}
          <div
            className="absolute left-4 top-5 px-1.5 py-0.5 rounded text-[9px] font-medium text-white whitespace-nowrap shadow-sm"
            style={{ backgroundColor: cursor.color }}
          >
            {cursor.name.split(' ')[0]}
          </div>
          {/* Trailing dot */}
          <div
            className="absolute left-1 top-1 w-2 h-2 rounded-full opacity-30"
            style={{ backgroundColor: cursor.color }}
          />
        </div>
      ))}
    </div>
  )
}

// ============================================================
// SharedNotesWidget
// ============================================================

export function SharedNotesWidget({ lang = 'en' }: { lang?: Lang }) {
  const [content, setContent] = useState('')
  const [synced, setSynced] = useState(true)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const STORAGE_KEY = 'vl-collab-shared-notes'

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        setContent(saved)
        setLastSaved(new Date())
      }
    } catch { /* ignore */ }
  }, [])

  // Auto-save to localStorage
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    setContent(newContent)
    setSynced(false)

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, newContent)
        setSynced(true)
        setLastSaved(new Date())
      } catch { /* ignore */ }
    }, 1000)
  }, [])

  const charCount = content.length

  return (
    <div className="vl-card rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--vl-border-subtle)]">
        <div className="flex items-center gap-2">
          <StickyNote className="size-4 text-amber-400" />
          <h3 className="text-sm font-medium vl-text-heading">{t(lang, 'collab.sharedNotes')}</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <motion.div
            animate={{ scale: synced ? 1 : 0.8 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            <div className={`w-2 h-2 rounded-full ${synced ? 'bg-emerald-500 presence-pulse' : 'bg-amber-500'}`} />
          </motion.div>
          <span className={`text-[10px] ${synced ? 'text-emerald-400' : 'text-amber-400'}`}>
            {synced ? t(lang, 'collab.synced') : t(lang, 'common.autoSaving')}
          </span>
        </div>
      </div>
      <div className="p-3">
        <Textarea
          value={content}
          onChange={handleContentChange}
          placeholder={lang === 'zh' ? '在此记录协作笔记...' : 'Take collaborative notes here...'}
          className="min-h-[120px] resize-y text-sm vl-input vl-text-body border-0 focus-visible:ring-1 focus-visible:ring-[var(--vl-accent)]"
          style={{ background: 'var(--vl-bg-inner)', color: 'var(--vl-text-white)' }}
        />
        <div className="flex items-center justify-between mt-2 px-1">
          <span className="text-[10px] vl-text-muted">
            {charCount} {t(lang, 'collab.noteCharCount')}
          </span>
          {lastSaved && (
            <span className="text-[10px] vl-text-muted">
              <Clock className="size-2.5 inline mr-0.5" />
              {formatTimeAgo(lastSaved.getTime())}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// PresenceStatusSelector
// ============================================================

function PresenceStatusSelector({ lang = 'en', currentStatus, onStatusChange }: { lang?: Lang; currentStatus: PresenceStatus; onStatusChange: (status: PresenceStatus) => void }) {
  const statusOptions: { value: PresenceStatus; label: string; dotColor: string }[] = [
    { value: 'available', label: t(lang, 'collab.available'), dotColor: '#10b981' },
    { value: 'away', label: t(lang, 'collab.away'), dotColor: '#f59e0b' },
    { value: 'busy', label: t(lang, 'collab.busy'), dotColor: '#ef4444' },
    { value: 'in-meeting', label: t(lang, 'collab.inMeeting'), dotColor: '#8b5cf6' },
    { value: 'dnd', label: t(lang, 'collab.dnd'), dotColor: '#6b7280' },
  ]

  const currentOption = statusOptions.find(o => o.value === currentStatus)!

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg vl-inner border border-[var(--vl-border-subtle)] text-xs vl-text-body hover:bg-[var(--vl-bg-card-hover)] transition-colors"
          aria-label={t(lang, 'collab.status')}
        >
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: currentOption.dotColor }} />
          <span>{currentOption.label}</span>
          <ChevronDown className="size-3 vl-text-muted" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-40 vl-dialog border-[var(--vl-border)]" align="start">
        <DropdownMenuLabel className="text-xs font-medium">{t(lang, 'collab.status')}</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-[var(--vl-border-subtle)]" />
        {statusOptions.map(option => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onStatusChange(option.value)}
            className={`flex items-center gap-2 text-xs cursor-pointer ${currentStatus === option.value ? 'bg-[var(--vl-accent-bg)]' : ''}`}
          >
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: option.dotColor }} />
            <span>{option.label}</span>
            {currentStatus === option.value && (
              <span className="ml-auto text-emerald-400">✓</span>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="bg-[var(--vl-border-subtle)]" />
        <div className="px-2 py-1.5 text-[9px] vl-text-muted flex items-center gap-1">
          <Clock className="size-2.5" />
          {t(lang, 'collab.autoAway')}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ============================================================
// CollaborationPanel (Main Component)
// ============================================================

export function CollaborationPanel({ lang = 'en', roomId = 'default', showCursors = true }: { lang?: Lang; roomId?: string; showCursors?: boolean }) {
  const [myStatus, setMyStatus] = useState<PresenceStatus>('available')
  const [showCursorsOverlay, setShowCursorsOverlay] = useState(showCursors)
  const [autoAwayTimer, setAutoAwayTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const lastActivityRef = useRef(Date.now())

  const { connected, reconnecting, connectionState, activities, participants, sendMessage } = useWebSocketSync(roomId)

  // Auto-away detection: 15 minutes of inactivity
  useEffect(() => {
    const ACTIVITY_TIMEOUT = 15 * 60 * 1000 // 15 minutes

    const handleActivity = () => {
      lastActivityRef.current = Date.now()
      if (myStatus === 'away') {
        setMyStatus('available')
      }
      // Reset timer
      if (autoAwayTimer) clearTimeout(autoAwayTimer)
      const timer = setTimeout(() => {
        if (Date.now() - lastActivityRef.current >= ACTIVITY_TIMEOUT) {
          setMyStatus('away')
        }
      }, ACTIVITY_TIMEOUT)
      setAutoAwayTimer(timer)
    }

    window.addEventListener('mousemove', handleActivity)
    window.addEventListener('keydown', handleActivity)
    window.addEventListener('click', handleActivity)
    window.addEventListener('scroll', handleActivity)

    // Set initial timer
    handleActivity()

    return () => {
      window.removeEventListener('mousemove', handleActivity)
      window.removeEventListener('keydown', handleActivity)
      window.removeEventListener('click', handleActivity)
      window.removeEventListener('scroll', handleActivity)
      if (autoAwayTimer) clearTimeout(autoAwayTimer)
    }
  }, [myStatus, autoAwayTimer])

  const mergedActivities = useMemo(() => {
    if (activities.length > 0) return activities
    return MOCK_ACTIVITIES
  }, [activities])

  return (
    <div className="collab-panel-slide space-y-3">
      {/* Connection status bar */}
      <div className="vl-card rounded-xl p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            connectionState === 'connected' ? 'bg-emerald-500 presence-pulse' :
            connectionState === 'connecting' || connectionState === 'reconnecting' ? 'bg-amber-500 animate-pulse' :
            'bg-gray-400'
          }`} />
          <span className="text-xs vl-text-body">
            {connectionState === 'connected' ? t(lang, 'collab.connected') :
             connectionState === 'reconnecting' ? t(lang, 'collab.reconnecting') :
             connectionState === 'connecting' ? t(lang, 'common.loading') :
             t(lang, 'collab.disconnected')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <PresenceStatusSelector lang={lang} currentStatus={myStatus} onStatusChange={setMyStatus} />
          <button
            onClick={() => setShowCursorsOverlay(!showCursorsOverlay)}
            className="p-1.5 rounded-lg vl-inner border border-[var(--vl-border-subtle)] hover:bg-[var(--vl-bg-card-hover)] transition-colors"
            title={showCursorsOverlay ? 'Hide cursors' : 'Show cursors'}
          >
            <Eye className={`size-3.5 ${showCursorsOverlay ? 'text-emerald-400' : 'vl-text-muted'}`} />
          </button>
        </div>
      </div>

      {/* Participants info */}
      {participants.length > 0 && (
        <div className="vl-card rounded-xl p-3 flex items-center gap-2">
          <Users className="size-4 text-emerald-400" />
          <span className="text-xs vl-text-body">
            {participants.length} {t(lang, 'collab.participants')}
          </span>
          <span className="text-[10px] vl-text-muted">·</span>
          <span className="text-[10px] vl-text-muted">
            {MOCK_CURSORS.length} {t(lang, 'collab.cursorCount')}
          </span>
        </div>
      )}

      {/* Online Presence Bar */}
      <OnlinePresenceBar lang={lang} />

      {/* Live Activity Feed */}
      <LiveActivityFeed lang={lang} activities={mergedActivities} />

      {/* Shared Notes Widget */}
      <SharedNotesWidget lang={lang} />

      {/* Collaborative Cursors Overlay */}
      <AnimatePresence>
        {showCursorsOverlay && (
          <CollaborativeCursorsOverlay cursors={MOCK_CURSORS} />
        )}
      </AnimatePresence>
    </div>
  )
}
