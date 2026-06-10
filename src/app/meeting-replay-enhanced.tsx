'use client'

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { Agent, Meeting, DiscussionMessage } from './shared-components'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  Play, Pause, SkipBack, SkipForward, FastForward,
  ChevronRight, Keyboard,
} from 'lucide-react'

type MessageFilter = 'all' | 'lead' | 'members' | 'critic' | 'system'

interface EnhancedMeetingReplayProps {
  meeting: Meeting
  agents: Agent[]
  lang: Lang
}

export function EnhancedMeetingReplay({ meeting, agents, lang }: EnhancedMeetingReplayProps) {
  const messages = useMemo(() => meeting.messages || [], [meeting])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1) // 0.5, 1, 2, 3
  const [activeFilter, setActiveFilter] = useState<MessageFilter>('all')
  const scrollRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    mountedRef.current = true
    queueMicrotask(() => setMounted(true))
  }, [])

  // Filter messages based on current filter
  const filteredMessages = useMemo(() => {
    if (!meeting) return []
    const msgs = messages

    if (activeFilter === 'all') return msgs

    // Determine team lead, members, critic from meeting data
    const teamLeadName = meeting.type === 'team' ? meeting.teamLead?.title : meeting.teamMember?.title
    const criticAgent = agents.find(a => a.title.toLowerCase().includes('critic'))

    switch (activeFilter) {
      case 'lead':
        return teamLeadName ? msgs.filter(m => m.agentName === teamLeadName) : msgs
      case 'members':
        return teamLeadName
          ? msgs.filter(m => m.agentName !== teamLeadName && m.agentName !== 'User' && m.agentName !== (criticAgent?.title || ''))
          : msgs.filter(m => m.agentName !== 'User')
      case 'critic':
        return criticAgent ? msgs.filter(m => m.agentName === criticAgent.title) : []
      case 'system':
        return msgs.filter(m => m.agentName === 'System' || m.agentName === 'User')
      default:
        return msgs
    }
  }, [messages, activeFilter, meeting, agents])

  // Auto-play timer
  useEffect(() => {
    if (isPlaying && filteredMessages.length > 0) {
      const intervalMs = Math.max(500, 3000 / speed)
      timerRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= filteredMessages.length - 1) {
            setIsPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, intervalMs)
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isPlaying, speed, filteredMessages.length])

  // Auto-scroll to current message
  useEffect(() => {
    if (scrollRef.current && filteredMessages.length > 0) {
      const msgEl = scrollRef.current.querySelector(`[data-msg-index="${currentIndex}"]`)
      if (msgEl) {
        msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [currentIndex])

  // Keyboard shortcuts
  useEffect(() => {
    if (!mounted) return
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if an input/textarea is focused
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      switch (e.key) {
        case ' ':
          e.preventDefault()
          setIsPlaying(prev => !prev)
          break
        case 'ArrowLeft':
          e.preventDefault()
          setCurrentIndex(prev => Math.max(0, prev - 1))
          setIsPlaying(false)
          break
        case 'ArrowRight':
          e.preventDefault()
          setCurrentIndex(prev => Math.min(filteredMessages.length - 1, prev + 1))
          setIsPlaying(false)
          break
        case '+':
        case '=':
          e.preventDefault()
          setSpeed(prev => {
            const speeds = [0.5, 1, 2, 3]
            const idx = speeds.indexOf(prev)
            return speeds[Math.min(idx + 1, speeds.length - 1)]
          })
          break
        case '-':
        case '_':
          e.preventDefault()
          setSpeed(prev => {
            const speeds = [0.5, 1, 2, 3]
            const idx = speeds.indexOf(prev)
            return speeds[Math.max(idx - 1, 0)]
          })
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [mounted, filteredMessages.length])

  // Reset index when filter changes
  useEffect(() => {
    queueMicrotask(() => {
      setCurrentIndex(0)
      setIsPlaying(false)
    })
  }, [activeFilter])

  const handlePrev = useCallback(() => {
    setCurrentIndex(prev => Math.max(0, prev - 1))
  }, [])

  const handleNext = useCallback(() => {
    setCurrentIndex(prev => Math.min(filteredMessages.length - 1, prev + 1))
  }, [filteredMessages.length])

  const handleTogglePlay = useCallback(() => {
    setIsPlaying(prev => !prev)
  }, [])

  const currentMsg = filteredMessages[currentIndex] || null
  const currentAgent = currentMsg ? agents.find(a => a.title === currentMsg.agentName) : null

  // Build agent color map for mini-map
  const agentColorMap = useMemo(() => {
    const map: Record<string, string> = {}
    messages.forEach(m => {
      if (!map[m.agentName]) {
        const agent = agents.find(a => a.title === m.agentName)
        map[m.agentName] = agent?.color || '#94a3b8'
      }
    })
    return map
  }, [messages, agents])

  // Filter chips config
  const filterChips: { key: MessageFilter; label: string }[] = [
    { key: 'all', label: t(lang, 'replay.filter.all') },
    { key: 'lead', label: t(lang, 'replay.filter.lead') },
    { key: 'members', label: t(lang, 'replay.filter.members') },
    { key: 'critic', label: t(lang, 'replay.filter.critic') },
    { key: 'system', label: t(lang, 'replay.filter.system') },
  ]

  if (!mounted) return null

  return (
    <div className="space-y-3">
      {/* Controls Bar */}
      <div className="vl-inner rounded-xl p-3 space-y-3">
        {/* Timeline Scrubber */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] vl-text-muted font-medium">
              {t(lang, 'replay.progress').replace('{current}', String(currentIndex + 1)).replace('{total}', String(filteredMessages.length))}
            </span>
            <span className="text-[10px] vl-text-muted">
              {currentMsg?.agentName || '—'}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(0, filteredMessages.length - 1)}
            value={currentIndex}
            onChange={(e) => {
              setCurrentIndex(Number(e.target.value))
              setIsPlaying(false)
            }}
            className="enhanced-replay-scrubber w-full h-1.5 rounded-full appearance-none cursor-pointer bg-[var(--vl-bg-inner)]"
            style={{
              background: `linear-gradient(to right, #10b981 0%, #10b981 ${filteredMessages.length > 1 ? (currentIndex / (filteredMessages.length - 1)) * 100 : 0}%, var(--vl-bg-inner) ${filteredMessages.length > 1 ? (currentIndex / (filteredMessages.length - 1)) * 100 : 0}%, var(--vl-bg-inner) 100%)`,
            }}
          />
        </div>

        {/* Playback controls row */}
        <div className="flex items-center justify-between">
          {/* Transport controls */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 vl-text-muted hover:text-white"
              onClick={() => { setCurrentIndex(0); setIsPlaying(false) }}
              aria-label="Go to start"
            >
              <SkipBack className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 vl-text-muted hover:text-white"
              onClick={handlePrev}
              aria-label="Previous message"
            >
              <ChevronRight className="size-3.5 rotate-180" />
            </Button>
            <Button
              variant="default"
              size="sm"
              className="h-9 w-9 p-0 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg shadow-emerald-500/20"
              onClick={handleTogglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={isPlaying ? 'pause' : 'play'}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 ml-0.5" />}
                </motion.div>
              </AnimatePresence>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 vl-text-muted hover:text-white"
              onClick={handleNext}
              aria-label="Next message"
            >
              <ChevronRight className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 vl-text-muted hover:text-white"
              onClick={() => {
                setCurrentIndex(filteredMessages.length - 1)
                setIsPlaying(false)
              }}
              aria-label="Go to end"
              disabled={filteredMessages.length === 0}
            >
              <SkipForward className="size-3.5" />
            </Button>
          </div>

          {/* Speed control */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] vl-text-muted mr-1">{t(lang, 'replay.speed')}:</span>
            {([0.5, 1, 2, 3] as const).map((s) => (
              <button
                key={s}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-all ${
                  speed === s
                    ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
                    : 'vl-text-muted hover:text-white hover:bg-[var(--vl-bg-inner)]'
                }`}
                onClick={() => setSpeed(s)}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Keyboard hint */}
          <div className="hidden sm:flex items-center gap-1 text-[9px] vl-text-muted">
            <Keyboard className="size-3" />
            <span>Space · ← →</span>
          </div>
        </div>

        {/* Message Type Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] vl-text-muted mr-1">{t(lang, 'replay.filter')}:</span>
          {filterChips.map(chip => (
            <button
              key={chip.key}
              className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${
                activeFilter === chip.key
                  ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
                  : 'vl-text-muted hover:text-white hover:bg-[var(--vl-bg-inner)]'
              }`}
              onClick={() => setActiveFilter(chip.key)}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Message List */}
      <div
        ref={scrollRef}
        className="vl-card rounded-xl overflow-y-auto max-h-[450px] custom-scrollbar p-3 space-y-3"
      >
        {filteredMessages.length === 0 ? (
          <p className="text-sm vl-text-muted text-center py-8">
            {t(lang, 'replay.noMessages')}
          </p>
        ) : (
          filteredMessages.map((msg, idx) => {
            const agent = agents.find(a => a.title === msg.agentName)
            const isCurrent = idx === currentIndex
            return (
              <motion.div
                key={msg.id}
                data-msg-index={idx}
                initial={false}
                animate={{
                  opacity: isCurrent ? 1 : 0.6,
                }}
                className={`rounded-xl p-3 transition-all duration-300 ${
                  isCurrent
                    ? 'bg-emerald-500/5 ring-1 ring-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                    : 'hover:bg-[var(--vl-bg-inner)]'
                }`}
              >
                <div className="flex gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white text-[10px] font-bold ring-2 transition-all duration-300"
                    style={{
                      backgroundColor: agent?.color || '#94a3b8',
                      ['--tw-ring-color' as string]: isCurrent ? (agent?.color || '#10b981') : 'transparent',
                      boxShadow: isCurrent ? `0 0 8px ${agent?.color || '#10b981'}40` : 'none',
                    }}
                  >
                    {msg.agentName.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold" style={{ color: agent?.color || '#94a3b8' }}>
                        {msg.agentName}
                      </span>
                      <Badge variant="outline" className="text-[8px] bg-[var(--vl-bg-inner)] vl-text-muted border-[var(--vl-border-subtle)] px-1 py-0">
                        {t(lang, 'common.round')} {msg.roundIndex + 1}
                      </Badge>
                      {isCurrent && (
                        <motion.span
                          className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                          animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                      )}
                    </div>
                    <p className={`text-xs leading-relaxed whitespace-pre-wrap ${
                      isCurrent ? 'vl-text-heading' : 'vl-text-body'
                    }`}>
                      {msg.message}
                    </p>
                  </div>
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      {/* Mini-map */}
      <div className="vl-inner rounded-lg p-2">
        <div className="flex items-center gap-0.5 flex-wrap">
          {messages.map((msg, idx) => {
            const color = agentColorMap[msg.agentName] || '#94a3b8'
            const isFilteredInView = filteredMessages.some(fm => fm.id === msg.id)
            const filteredIdx = isFilteredInView ? filteredMessages.findIndex(fm => fm.id === msg.id) : -1
            const isCurrent = filteredIdx === currentIndex

            return (
              <button
                key={msg.id}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  isCurrent ? 'scale-[2] ring-1 ring-white/50' : 'hover:scale-[1.4]'
                } ${!isFilteredInView ? 'opacity-20' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => {
                  if (isFilteredInView) {
                    setCurrentIndex(filteredIdx)
                    setIsPlaying(false)
                  }
                }}
                title={`${msg.agentName} — ${t(lang, 'common.round')} ${msg.roundIndex + 1}`}
              />
            )
          })}
        </div>
        {/* Mini-map legend */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {Object.entries(agentColorMap).slice(0, 6).map(([name, color]) => (
            <div key={name} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[9px] vl-text-muted truncate max-w-[60px]">{name}</span>
            </div>
          ))}
          {Object.keys(agentColorMap).length > 6 && (
            <span className="text-[9px] vl-text-muted">
              +{Object.keys(agentColorMap).length - 6}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
