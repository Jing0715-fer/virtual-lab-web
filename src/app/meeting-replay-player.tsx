'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import {
  Play, Pause, SkipBack, SkipForward, X, Gauge,
  Clock, MessageSquare, Award, RotateCcw, ChevronLeft, ChevronRight,
  Share2, FileDown, Eye, EyeOff, User, ArrowDownToLine,
  Volume2, BarChart3,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { Meeting, DiscussionMessage, Agent } from './shared-types'
import { renderAgentIcon } from './shared-components'

// ============================================================
// Types
// ============================================================

export interface MeetingReplayPlayerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  meeting: Meeting | null
  agents: Agent[]
  lang: Lang
}

// ============================================================
// Constants
// ============================================================

const SPEED_OPTIONS = [0.5, 1, 1.5, 2] as const
type PlaybackSpeed = (typeof SPEED_OPTIONS)[number]

const BASE_INTERVAL_MS = 2000 // Base auto-advance interval in ms

// ============================================================
// useMeetingReplay Hook
// ============================================================

export function useMeetingReplay(messages: DiscussionMessage[]) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1)
  const [autoScroll, setAutoScroll] = useState(true)
  const [spoilerMode, setSpoilerMode] = useState(false)
  const [focusedAgent, setFocusedAgent] = useState<string | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const totalMessages = messages.length
  const isFinished = totalMessages > 0 && currentMessageIndex >= totalMessages - 1 && !isPlaying

  // Filter messages by agent focus
  const filteredMessageIndices = useMemo(() => {
    if (!focusedAgent) return messages.map((_, i) => i)
    return messages.reduce<number[]>((acc, msg, i) => {
      if (msg.agentName === focusedAgent) acc.push(i)
      return acc
    }, [])
  }, [messages, focusedAgent])

  const filteredCount = filteredMessageIndices.length
  const currentFilteredIndex = focusedAgent
    ? filteredMessageIndices.indexOf(currentMessageIndex)
    : currentMessageIndex

  // Auto-advance timer
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    if (isPlaying && currentMessageIndex < totalMessages - 1) {
      const interval = BASE_INTERVAL_MS / playbackSpeed
      timerRef.current = setInterval(() => {
        setCurrentMessageIndex(prev => {
          if (prev >= totalMessages - 1) {
            setIsPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, interval)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isPlaying, playbackSpeed, currentMessageIndex, totalMessages])

  const play = useCallback(() => {
    if (currentMessageIndex >= totalMessages - 1) {
      setCurrentMessageIndex(0)
    }
    setIsPlaying(true)
  }, [currentMessageIndex, totalMessages])

  const pause = useCallback(() => {
    setIsPlaying(false)
  }, [])

  const next = useCallback(() => {
    if (currentMessageIndex < totalMessages - 1) {
      setCurrentMessageIndex(prev => prev + 1)
    }
  }, [currentMessageIndex, totalMessages])

  const prev = useCallback(() => {
    if (currentMessageIndex > 0) {
      setCurrentMessageIndex(prev => prev - 1)
    }
  }, [currentMessageIndex])

  const goTo = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, totalMessages - 1))
    setCurrentMessageIndex(clamped)
  }, [totalMessages])

  const toggleSpeed = useCallback(() => {
    setPlaybackSpeed(prev => {
      const idx = SPEED_OPTIONS.indexOf(prev)
      const nextIdx = (idx + 1) % SPEED_OPTIONS.length
      return SPEED_OPTIONS[nextIdx]
    })
  }, [])

  const reset = useCallback(() => {
    setCurrentMessageIndex(0)
    setIsPlaying(false)
    setPlaybackSpeed(1)
  }, [])

  // Reset when messages change
  useEffect(() => {
    requestAnimationFrame(() => {
      setCurrentMessageIndex(0)
      setIsPlaying(false)
      setFocusedAgent(null)
    })
  }, [messages])

  return {
    currentMessageIndex,
    isPlaying,
    playbackSpeed,
    isFinished,
    totalMessages,
    autoScroll,
    spoilerMode,
    focusedAgent,
    filteredMessageIndices,
    filteredCount,
    currentFilteredIndex,
    play,
    pause,
    next,
    prev,
    goTo,
    toggleSpeed,
    reset,
    setAutoScroll,
    setSpoilerMode,
    setFocusedAgent,
    setCurrentMessageIndex,
    setIsPlaying,
  }
}

// ============================================================
// Helper: format timestamp
// ============================================================

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// ============================================================
// Helper: get agent color
// ============================================================

function getAgentColor(agentName: string, agents: Agent[]): string {
  const agent = agents.find(a => a.title === agentName)
  return agent?.color || '#6366f1'
}

// ============================================================
// Agent Speaking Analysis
// ============================================================

function AgentSpeakingAnalysis({
  messages,
  agents,
  focusedAgent,
  onAgentClick,
  lang,
}: {
  messages: DiscussionMessage[]
  agents: Agent[]
  focusedAgent: string | null
  onAgentClick: (name: string | null) => void
  lang: Lang
}) {
  const analysis = useMemo(() => {
    const stats: Record<string, { count: number; totalChars: number; avgChars: number; firstSpeak: number; rounds: Set<number> }> = {}
    messages.forEach((msg, i) => {
      if (!stats[msg.agentName]) {
        stats[msg.agentName] = { count: 0, totalChars: 0, avgChars: 0, firstSpeak: i, rounds: new Set() }
      }
      stats[msg.agentName].count++
      stats[msg.agentName].totalChars += msg.message.length
      stats[msg.agentName].rounds.add(msg.roundIndex)
    })
    Object.entries(stats).forEach(([, s]) => {
      s.avgChars = s.count > 0 ? Math.round(s.totalChars / s.count) : 0
    })
    return stats
  }, [messages])

  const totalMessages = messages.length

  return (
    <div className="space-y-2">
      <div className="text-[10px] font-medium vl-text-muted uppercase tracking-wider">
        {t(lang, 'replay.agentAnalysis') || 'Agent Analysis'}
      </div>
      <div className="space-y-1.5">
        {Object.entries(analysis).sort((a, b) => b[1].count - a[1].count).map(([name, stats]) => {
          const color = getAgentColor(name, agents)
          const agent = agents.find(a => a.title === name)
          const pct = totalMessages > 0 ? (stats.count / totalMessages) * 100 : 0
          const isActive = focusedAgent === name

          return (
            <button
              key={name}
              className="w-full flex items-center gap-2 p-1.5 rounded-lg transition-all hover:bg-[var(--vl-bg-inner)] group"
              onClick={() => onAgentClick(isActive ? null : name)}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-white"
                style={{ backgroundColor: color }}
              >
                {renderAgentIcon(agent?.icon || 'bot', 'size-3')}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium vl-text-heading truncate">{name}</span>
                  <Badge
                    variant="outline"
                    className={`text-[8px] px-1 py-0 ${isActive ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10' : 'border-[var(--vl-border-subtle)] vl-text-muted bg-transparent'}`}
                  >
                    {stats.count}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex-1 h-1 rounded-full vl-bg-secondary overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                  <span className="text-[9px] vl-text-muted tabular-nums">{pct.toFixed(0)}%</span>
                </div>
              </div>
              {isActive && (
                <EyeOff className="size-3 vl-text-muted shrink-0" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================
// Message Bubble Component (inside replay)
// ============================================================

function ReplayMessageBubble({
  message,
  agents,
  lang,
  isCurrent,
  isPast,
  isFuture,
  spoilerMode,
}: {
  message: DiscussionMessage
  agents: Agent[]
  lang: Lang
  isCurrent: boolean
  isPast: boolean
  isFuture: boolean
  spoilerMode: boolean
}) {
  const agent = agents.find(a => a.title === message.agentName)
  const color = getAgentColor(message.agentName, agents)
  const isUser = message.agentName === 'User'

  // In spoiler mode, future messages are hidden
  if (spoilerMode && isFuture) {
    return (
      <motion.div
        className="flex gap-3 opacity-30"
      >
        <div className="w-10 h-10 rounded-full bg-[var(--vl-bg-inner)] flex items-center justify-center shrink-0">
          <span className="text-sm">...</span>
        </div>
        <div className="max-w-[85%] sm:max-w-[75%]">
          <div className="vl-card rounded-2xl px-4 py-3 border border-[var(--vl-border-subtle)]">
            <div className="text-sm vl-text-muted italic">Message hidden</div>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      key={message.id}
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{
        opacity: isPast ? 0.55 : 1,
        y: 0,
        scale: 1,
      }}
      exit={{ opacity: 0, y: -12, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-semibold text-white shadow-lg transition-all duration-300 ${
          isCurrent ? 'ring-2 scale-110' : ''
        }`}
        style={{
          backgroundColor: color,
          boxShadow: isCurrent ? `0 0 16px ${color}66` : undefined,
          // @ts-expect-error CSS variable
          '--tw-ring-color': isCurrent ? color : undefined,
        }}
      >
        {renderAgentIcon(agent?.icon || 'bot', 'size-5')}
      </div>

      {/* Message content */}
      <div className={`max-w-[85%] sm:max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Header */}
        <div className={`flex items-center gap-2 mb-1.5 ${isUser ? 'flex-row-reverse' : ''}`}>
          <span
            className="text-sm font-semibold"
            style={{ color: isUser ? 'var(--vl-text-white)' : color }}
          >
            {message.agentName}
          </span>
          <span className="text-[10px] vl-text-muted flex items-center gap-1">
            <Clock className="size-2.5" />
            {formatTimestamp(message.createdAt)}
          </span>
          <Badge
            variant="outline"
            className="text-[9px] px-1.5 py-0 vl-inner border-[var(--vl-border-subtle)] badge-pop-in"
          >
            {t(lang, 'replay.round').replace('{round}', String(message.roundIndex + 1))}
          </Badge>
          {isCurrent && (
            <motion.span
              className="w-1.5 h-1.5 rounded-full bg-emerald-400"
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </div>

        {/* Message body */}
        <div
          className={`vl-card rounded-2xl px-4 py-3 border shadow-sm transition-all duration-300 ${
            isUser ? 'rounded-tr-sm' : 'rounded-tl-sm'
          } ${isCurrent ? 'ring-1 ring-emerald-500/40 shadow-emerald-500/10' : ''}`}
          style={{
            borderLeftColor: isUser ? undefined : color,
            borderLeftWidth: isUser ? undefined : '3px',
          }}
        >
          <div className={`text-sm vl-text-body vl-prose prose-sm max-w-none content-fade-scale ${
            isCurrent ? 'vl-text-heading' : ''
          }`}>
            <ReactMarkdown>{message.message}</ReactMarkdown>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================
// Timeline Scrubber Component (Enhanced)
// ============================================================

function TimelineScrubber({
  messages,
  currentIndex,
  agents,
  lang,
  onJumpTo,
  focusedAgent,
}: {
  messages: DiscussionMessage[]
  currentIndex: number
  agents: Agent[]
  lang: Lang
  onJumpTo: (index: number) => void
  focusedAgent: string | null
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const dotRefs = useRef<(HTMLButtonElement | null)[]>([])
  const trackRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Auto-scroll to keep current dot visible
  useEffect(() => {
    const activeDot = dotRefs.current[currentIndex]
    if (activeDot && scrollRef.current) {
      const container = scrollRef.current
      const dotLeft = activeDot.offsetLeft
      const dotWidth = activeDot.offsetWidth
      const containerWidth = container.clientWidth
      const scrollLeft = container.scrollLeft

      if (dotLeft < scrollLeft + 20 || dotLeft + dotWidth > scrollLeft + containerWidth - 20) {
        container.scrollTo({
          left: dotLeft - containerWidth / 2 + dotWidth / 2,
          behavior: 'smooth',
        })
      }
    }
  }, [currentIndex])

  // Compute round boundaries for dividers
  const roundBoundaries = useMemo(() => {
    const boundaries: number[] = []
    let lastRound = -1
    messages.forEach((msg, i) => {
      if (msg.roundIndex !== lastRound) {
        boundaries.push(i)
        lastRound = msg.roundIndex
      }
    })
    return boundaries
  }, [messages])

  // Handle click on track to jump
  const handleTrackClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current || messages.length === 0) return
    const rect = trackRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const pct = x / rect.width
    const index = Math.round(pct * (messages.length - 1))
    onJumpTo(Math.max(0, Math.min(index, messages.length - 1)))
  }, [messages.length, onJumpTo])

  // Handle drag on track
  const handleDrag = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !trackRef.current || messages.length === 0) return
    const rect = trackRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const pct = Math.max(0, Math.min(1, x / rect.width))
    const index = Math.round(pct * (messages.length - 1))
    onJumpTo(Math.max(0, Math.min(index, messages.length - 1)))
  }, [isDragging, messages.length, onJumpTo])

  if (messages.length === 0) return null

  const progressPct = messages.length > 0 ? ((currentIndex + 1) / messages.length) * 100 : 0
  const currentMsg = messages[currentIndex]
  const maxRound = Math.max(...messages.map(m => m.roundIndex), 0)

  return (
    <div className="w-full space-y-1">
      {/* Progress indicator: Message X of Y · Round R of T */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] vl-inner border-[var(--vl-border-subtle)]">
            <MessageSquare className="size-3 mr-1" />
            {t(lang, 'replay.progress')
              .replace('{current}', String(currentIndex + 1))
              .replace('{total}', String(messages.length))}
          </Badge>
          {currentMsg && (
            <Badge variant="outline" className="text-[10px] vl-inner border-[var(--vl-border-subtle)]">
              <Award className="size-3 mr-1" />
              {t(lang, 'meeting.roundOf')
                .replace('{current}', String(currentMsg.roundIndex + 1))
                .replace('{total}', String(maxRound + 1))}
            </Badge>
          )}
        </div>
        <span className="text-[10px] font-mono tabular-nums vl-text-muted">
          {progressPct.toFixed(0)}%
        </span>
      </div>

      {/* Scrollable timeline track */}
      <div
        ref={scrollRef}
        className="flex items-center gap-0.5 overflow-x-auto pb-2 px-2 custom-scrollbar"
        role="group"
        aria-label={t(lang, 'replay.jumpTo')}
      >
        {/* Build dots with round dividers */}
        {messages.map((msg, index) => {
          const color = getAgentColor(msg.agentName, agents)
          const isActive = index === currentIndex
          const isPast = index < currentIndex
          const isRoundStart = roundBoundaries.includes(index)
          const isFiltered = focusedAgent && msg.agentName !== focusedAgent

          return (
            <React.Fragment key={msg.id || `msg-${index}`}>
              {/* Round divider marker */}
              {isRoundStart && index > 0 && (
                <div className="flex flex-col items-center mx-1 shrink-0">
                  <div className="w-px h-3 bg-[var(--vl-border-subtle)]" />
                  <span className="text-[8px] vl-text-muted whitespace-nowrap">
                    R{msg.roundIndex + 1}
                  </span>
                  <div className="w-px h-3 bg-[var(--vl-border-subtle)]" />
                </div>
              )}

              {/* Dot */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      ref={el => { dotRefs.current[index] = el }}
                      onClick={() => onJumpTo(index)}
                      className={`
                        relative shrink-0 rounded-full transition-all duration-200 focus-ring
                        ${isActive ? 'w-4 h-4 ring-2 ring-offset-1 ring-offset-transparent scale-125' : 'w-2.5 h-2.5'}
                        ${isPast ? 'opacity-70' : 'opacity-40'}
                        ${isFiltered ? 'opacity-20 scale-75' : ''}
                        hover:opacity-100 hover:scale-125
                      `}
                      style={{
                        backgroundColor: isFiltered ? '#64748b' : color,
                        boxShadow: isActive ? `0 0 8px ${color}66` : 'none',
                      }}
                      aria-label={`${t(lang, 'replay.jumpTo')} ${index + 1}`}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <span className="font-medium">{msg.agentName}</span>
                    <span className="vl-text-muted ml-1">
                      ({index + 1}/{messages.length})
                    </span>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </React.Fragment>
          )
        })}
      </div>

      {/* Progress bar with playhead */}
      <div
        ref={trackRef}
        className="relative w-full h-2 rounded-full vl-inner overflow-hidden cursor-pointer"
        onClick={handleTrackClick}
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        onMouseMove={handleDrag}
      >
        <motion.div
          className="h-full rounded-full progress-glow"
          style={{
            background: 'linear-gradient(90deg, #10b981, #06b6d4)',
            width: `${progressPct}%`,
          }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
        {/* Animated playhead */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg border-2 border-emerald-400"
          style={{ left: `${progressPct}%`, marginLeft: '-6px' }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </div>
  )
}

// ============================================================
// Summary Panel
// ============================================================

function SummaryPanel({ summary, lang }: { summary: string | null; lang: Lang }) {
  if (!summary) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="mt-4 glass-card rounded-xl p-4 neon-glow-emerald"
    >
      <div className="flex items-center gap-2 mb-3">
        <Award className="size-5 text-emerald-400" />
        <h3 className="text-sm font-semibold vl-text-heading">
          {t(lang, 'replay.summary')}
        </h3>
        <Badge className="badge-pop-in bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
          {t(lang, 'replay.finished')}
        </Badge>
      </div>
      <div className="text-sm vl-text-body vl-prose prose-sm max-w-none">
        <ReactMarkdown>{summary}</ReactMarkdown>
      </div>
    </motion.div>
  )
}

// ============================================================
// Export helpers
// ============================================================

function handleShareReplay(meetingId: string, lang: Lang) {
  const url = `${window.location.origin}?replay=true&meetingId=${meetingId}`
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => {
      toast.success(t(lang, 'common.copied'))
    }).catch(() => {
      // Fallback
      const input = document.createElement('input')
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      toast.success(t(lang, 'common.copied'))
    })
  }
}

function handleExportTranscript(meeting: Meeting, lang: Lang) {
  const msgs = meeting.messages || []
  const lines = [
    `# ${meeting.saveName}`,
    `> Exported: ${new Date().toLocaleString()}`,
    `> Type: ${meeting.type} | Status: ${meeting.status}`,
    '',
  ]

  if (meeting.agenda) {
    lines.push('## Agenda')
    lines.push(meeting.agenda)
    lines.push('')
  }

  let lastRound = -1
  msgs.forEach(msg => {
    if (msg.roundIndex !== lastRound) {
      lastRound = msg.roundIndex
      lines.push(`---\n### ${t(lang, 'meeting.roundDivider').replace('{round}', String(msg.roundIndex + 1))}`)
      lines.push('')
    }
    lines.push(`**${msg.agentName}** (${formatTimestamp(msg.createdAt)}):`)
    lines.push('')
    lines.push(msg.message)
    lines.push('')
  })

  if (meeting.summary) {
    lines.push('---')
    lines.push('')
    lines.push('## Summary')
    lines.push('')
    lines.push(meeting.summary)
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${meeting.saveName || 'meeting'}-transcript.md`
  a.click()
  URL.revokeObjectURL(url)
  toast.success(t(lang, 'common.download'))
}

// ============================================================
// MeetingReplayPlayer Component
// ============================================================

export function MeetingReplayPlayer({
  open,
  onOpenChange,
  meeting,
  agents,
  lang,
}: MeetingReplayPlayerProps) {
  const messages = meeting?.messages || []
  const {
    currentMessageIndex,
    isPlaying,
    playbackSpeed,
    isFinished,
    totalMessages,
    autoScroll,
    spoilerMode,
    focusedAgent,
    filteredMessageIndices,
    filteredCount,
    currentFilteredIndex,
    play,
    pause,
    next,
    prev,
    goTo,
    toggleSpeed,
    reset,
    setAutoScroll,
    setSpoilerMode,
    setFocusedAgent,
  } = useMeetingReplay(messages)

  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Reset replay when dialog opens
  useEffect(() => {
    if (open) {
      reset()
    } else {
      pause()
    }
  }, [open, reset, pause])

  // Auto-scroll to current message
  useEffect(() => {
    if (!autoScroll || !open || !scrollAreaRef.current) return
    const msgEl = scrollAreaRef.current.querySelector(`[data-msg-index="${currentMessageIndex}"]`)
    if (msgEl) {
      msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentMessageIndex, autoScroll, open])

  // Keyboard shortcuts: Space, Left, Right (only when dialog is open)
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || (active as HTMLElement).isContentEditable)) {
        return
      }

      switch (e.key) {
        case ' ':
          e.preventDefault()
          if (isPlaying) {
            pause()
          } else {
            play()
          }
          break
        case 'ArrowLeft':
          e.preventDefault()
          prev()
          break
        case 'ArrowRight':
          e.preventDefault()
          next()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, isPlaying, play, pause, next, prev])

  const currentMessage = messages[currentMessageIndex] || null

  // Speed label
  const speedLabel = `${playbackSpeed}x`

  // Agent list for focus filter
  const uniqueAgents = useMemo(() => {
    const agentNames = [...new Set(messages.map(m => m.agentName))]
    return agentNames.map(name => ({
      name,
      color: getAgentColor(name, agents),
      agent: agents.find(a => a.title === name),
      count: messages.filter(m => m.agentName === name).length,
    }))
  }, [messages, agents])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="vl-dialog max-w-5xl w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-6 pb-0 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <RotateCcw className="size-4 text-emerald-400" />
              </div>
              <div>
                <DialogTitle className="text-base vl-text-heading">
                  {t(lang, 'replay.title')}
                </DialogTitle>
                {meeting && (
                  <p className="text-xs vl-text-muted mt-0.5 truncate max-w-[200px] sm:max-w-[400px]">
                    {meeting.saveName}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Export buttons */}
              {meeting && (
                <>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 vl-text-muted hover:text-white hover:bg-[var(--vl-bg-card-hover)]"
                          onClick={() => handleShareReplay(meeting.id, lang)}
                          aria-label="Share Replay"
                        >
                          <Share2 className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Share Replay</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 vl-text-muted hover:text-white hover:bg-[var(--vl-bg-card-hover)]"
                          onClick={() => handleExportTranscript(meeting, lang)}
                          aria-label="Export Transcript"
                        >
                          <FileDown className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Export Transcript</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 vl-text-muted hover:text-white hover:bg-[var(--vl-bg-card-hover)]"
                onClick={() => onOpenChange(false)}
                aria-label={t(lang, 'a11y.close')}
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Timeline Scrubber */}
        {totalMessages > 0 && (
          <div className="px-4 sm:px-6 pt-4 shrink-0">
            <TimelineScrubber
              messages={messages}
              currentIndex={currentMessageIndex}
              agents={agents}
              lang={lang}
              onJumpTo={goTo}
              focusedAgent={focusedAgent}
            />
          </div>
        )}

        {/* Main Content Area: Messages + Agent Sidebar */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Message Display Area */}
          <div className="flex-1 overflow-hidden px-4 sm:px-6 py-4">
            {totalMessages === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 opacity-60">
                <MessageSquare className="size-12 vl-text-muted" />
                <p className="text-sm vl-text-muted">{t(lang, 'common.noData')}</p>
              </div>
            ) : currentMessage ? (
              <ScrollArea className="h-full" ref={scrollAreaRef}>
                <div className="max-w-2xl mx-auto space-y-4 pb-4">
                  {/* Round indicator header */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`round-header-${currentMessage.roundIndex}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="flex items-center gap-2"
                    >
                      <div
                        className="w-1 h-5 rounded-full"
                        style={{
                          backgroundColor: getAgentColor(currentMessage.agentName, agents),
                        }}
                      />
                      <Badge
                        variant="outline"
                        className="text-[10px] vl-inner border-[var(--vl-border-subtle)]"
                      >
                        {t(lang, 'replay.round').replace('{round}', String(currentMessage.roundIndex + 1))}
                      </Badge>
                      <div className="flex-1 h-px vl-section-separator" />
                    </motion.div>
                  </AnimatePresence>

                  {/* Show all messages (or only current if focused agent is active) */}
                  {(focusedAgent ? filteredMessageIndices : messages.map((_, i) => i)).map(idx => {
                    const msg = messages[idx]
                    return (
                      <div key={msg.id || `replay-msg-${idx}`} data-msg-index={idx}>
                        <ReplayMessageBubble
                          message={msg}
                          agents={agents}
                          lang={lang}
                          isCurrent={idx === currentMessageIndex}
                          isPast={idx < currentMessageIndex}
                          isFuture={idx > currentMessageIndex}
                          spoilerMode={spoilerMode}
                        />
                      </div>
                    )
                  })}

                  {/* Summary panel when finished */}
                  {isFinished && (
                    <SummaryPanel
                      summary={meeting?.summary || null}
                      lang={lang}
                    />
                  )}
                </div>
              </ScrollArea>
            ) : null}
          </div>

          {/* Agent Sidebar (desktop only) */}
          <div className="hidden md:block w-56 shrink-0 border-l border-[var(--vl-border-subtle)] p-3 overflow-y-auto custom-scrollbar">
            <div className="space-y-4">
              {/* Agent Focus Filter */}
              <div className="space-y-2">
                <div className="text-[10px] font-medium vl-text-muted uppercase tracking-wider">
                  {t(lang, 'replay.filter') || 'Agent Focus'}
                </div>
                {/* "All" button */}
                <button
                  className="w-full flex items-center gap-2 p-1.5 rounded-lg transition-all hover:bg-[var(--vl-bg-inner)]"
                  onClick={() => setFocusedAgent(null)}
                >
                  <div className="w-6 h-6 rounded-full bg-[var(--vl-bg-inner)] flex items-center justify-center shrink-0">
                    <User className="size-3 vl-text-muted" />
                  </div>
                  <span className={`text-xs font-medium ${!focusedAgent ? 'vl-text-heading' : 'vl-text-muted'}`}>
                    All Agents
                  </span>
                  {!focusedAgent && (
                    <Badge className="text-[8px] px-1 py-0 ml-auto bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                      {totalMessages}
                    </Badge>
                  )}
                </button>
              </div>

              <AgentSpeakingAnalysis
                messages={messages}
                agents={agents}
                focusedAgent={focusedAgent}
                onAgentClick={setFocusedAgent}
                lang={lang}
              />
            </div>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="shrink-0 border-t border-[var(--vl-border-subtle)] px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Left: Previous + Play/Pause + Next + Jump to Start/End */}
            <div className="flex items-center gap-1 sm:gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 p-0 vl-inner border-[var(--vl-border-subtle)] card-hover-glow"
                      onClick={() => { goTo(0); pause() }}
                      disabled={currentMessageIndex <= 0 || totalMessages === 0}
                      aria-label="Jump to start"
                    >
                      <SkipBack className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Jump to Start</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 p-0 vl-inner border-[var(--vl-border-subtle)] card-hover-glow"
                      onClick={prev}
                      disabled={currentMessageIndex <= 0 || totalMessages === 0}
                      aria-label={t(lang, 'replay.previous')}
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t(lang, 'replay.previous')}</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      className="h-10 w-10 p-0 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-emerald-500/30 neon-glow-emerald"
                      onClick={isPlaying ? pause : play}
                      disabled={totalMessages === 0}
                      aria-label={isPlaying ? t(lang, 'replay.pause') : t(lang, 'replay.play')}
                    >
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={isPlaying ? 'pause' : 'play'}
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.5, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                        >
                          {isPlaying ? (
                            <Pause className="size-4" />
                          ) : (
                            <Play className="size-4 ml-0.5" />
                          )}
                        </motion.div>
                      </AnimatePresence>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isPlaying ? t(lang, 'replay.pause') : t(lang, 'replay.play')}
                    <span className="vl-text-muted ml-1 text-[10px]">(Space)</span>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 p-0 vl-inner border-[var(--vl-border-subtle)] card-hover-glow"
                      onClick={next}
                      disabled={currentMessageIndex >= totalMessages - 1 || totalMessages === 0}
                      aria-label={t(lang, 'replay.next')}
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t(lang, 'replay.next')}</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 p-0 vl-inner border-[var(--vl-border-subtle)] card-hover-glow"
                      onClick={() => { goTo(totalMessages - 1); pause() }}
                      disabled={currentMessageIndex >= totalMessages - 1 || totalMessages === 0}
                      aria-label="Jump to end"
                    >
                      <SkipForward className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Jump to End</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Center: Progress text + Agent focus (mobile) */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-xs vl-text-muted">
                <ChevronLeft className="size-3" />
                <span className="font-mono tabular-nums">
                  {currentMessageIndex + 1}
                  <span className="opacity-40">/</span>
                  {totalMessages}
                </span>
                <ChevronRight className="size-3" />
              </div>
              {/* Mobile agent filter pills */}
              <div className="flex md:hidden items-center gap-1 overflow-x-auto max-w-[200px] scrollbar-hide">
                <button
                  className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                    !focusedAgent ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30' : 'vl-text-muted'
                  }`}
                  onClick={() => setFocusedAgent(null)}
                >
                  All
                </button>
                {uniqueAgents.slice(0, 3).map(a => (
                  <button
                    key={a.name}
                    className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                      focusedAgent === a.name ? 'ring-1 text-white' : 'vl-text-muted'
                    }`}
                    style={{
                      backgroundColor: focusedAgent === a.name ? a.color + '40' : undefined,
                      borderColor: focusedAgent === a.name ? a.color : undefined,
                    }}
                    onClick={() => setFocusedAgent(focusedAgent === a.name ? null : a.name)}
                  >
                    {a.name.split(' ').pop()}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Speed + Toggles */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Speed toggle */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 sm:px-3 text-xs font-mono vl-inner border-[var(--vl-border-subtle)] gap-1 card-hover-glow"
                      onClick={toggleSpeed}
                      aria-label={`${t(lang, 'replay.speed')}: ${speedLabel}`}
                    >
                      <Gauge className="size-3" />
                      <span className="hidden sm:inline">{speedLabel}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t(lang, 'replay.speed')}: {speedLabel}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Auto-scroll toggle */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <ArrowDownToLine className={`size-3 ${autoScroll ? 'text-emerald-400' : 'vl-text-muted'}`} />
                      <Switch
                        checked={autoScroll}
                        onCheckedChange={setAutoScroll}
                        className="scale-75"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Auto-scroll</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Spoiler mode toggle */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      {spoilerMode ? (
                        <Eye className="size-3 text-emerald-400" />
                      ) : (
                        <EyeOff className="size-3 vl-text-muted" />
                      )}
                      <Switch
                        checked={spoilerMode}
                        onCheckedChange={setSpoilerMode}
                        className="scale-75"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Spoiler Mode</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Reset */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 vl-text-muted hover:text-white hover:bg-[var(--vl-bg-card-hover)]"
                      onClick={reset}
                      aria-label="Reset replay"
                    >
                      <RotateCcw className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Reset replay</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* Keyboard hint (mobile only) */}
          <div className="flex items-center justify-center gap-4 mt-2 sm:hidden text-[10px] vl-text-muted">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded vl-inner border border-[var(--vl-border-subtle)] text-[9px] font-mono">Space</kbd>
              {isPlaying ? t(lang, 'replay.pause') : t(lang, 'replay.play')}
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded vl-inner border border-[var(--vl-border-subtle)] text-[9px] font-mono">←</kbd>
              <kbd className="px-1.5 py-0.5 rounded vl-inner border border-[var(--vl-border-subtle)] text-[9px] font-mono">→</kbd>
              Navigate
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
