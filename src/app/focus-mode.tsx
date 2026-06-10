'use client'

/**
 * Focus Mode Component
 *
 * Distraction-free focus mode with:
 * - Toggle with Ctrl+.
 * - Hides all navigation, tabs, sidebar, footer, quick actions
 * - Shows only active content area with generous padding
 * - Smooth fade in/out animation (opacity + scale)
 * - Floating minimal toolbar at top
 * - Ambient darker background
 * - Pomodoro Timer with circular SVG progress ring
 * - Session counter, word count, reading stats
 * - useFocusMode() hook
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Timer, Play, Pause, RotateCcw, X,
  BookOpen, FileText, Clock, Target, ChevronLeft, ChevronRight,
  Eye, Sparkles, Flame, Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { DiscussionMessage } from './shared-types'

// ============================================================
// Types
// ============================================================

interface FocusModeProps {
  children: React.ReactNode
  isActive: boolean
  onToggle: () => void
  messages?: DiscussionMessage[]
  meetingName?: string
}

interface FocusTimerState {
  totalSeconds: number
  remainingSeconds: number
  isRunning: boolean
  isBreak: boolean
  sessionsCompleted: number
  startTime: number | null
}

interface FocusSessionStats {
  totalFocusMinutes: number
  meetingsReviewed: number
  notesTaken: number
}

// ============================================================
// Pomodoro Constants
// ============================================================

const POMODORO_WORK_SECONDS = 25 * 60
const POMODORO_BREAK_SECONDS = 5 * 60

// ============================================================
// Circular Progress Ring (SVG)
// ============================================================

function CircularProgressRing({
  progress,
  size = 56,
  strokeWidth = 3,
  color = '#10b981',
  bgColor = 'var(--vl-border-subtle)',
}: {
  progress: number   // 0 to 1
  size?: number
  strokeWidth?: number
  color?: string
  bgColor?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - progress * circumference

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={bgColor}
        strokeWidth={strokeWidth}
      />
      {/* Progress arc */}
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </svg>
  )
}

// ============================================================
// Word Count / Reading Stats
// ============================================================

function WordCountStats({ messages }: { messages: DiscussionMessage[] }) {
  const stats = useMemo(() => {
    const allText = messages.map(m => m.message).join(' ')
    const totalWords = allText.trim().split(/\s+/).filter(w => w.length > 0).length
    const readingTimeMinutes = Math.max(1, Math.ceil(totalWords / 200))

    // Agent message breakdown
    const agentCounts: Record<string, number> = {}
    for (const msg of messages) {
      agentCounts[msg.agentName] = (agentCounts[msg.agentName] || 0) + 1
    }

    return { totalWords, readingTimeMinutes, agentCounts, messageCount: messages.length }
  }, [messages])

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3"
    >
      <div className="flex items-center gap-1.5 text-[10px] vl-text-muted">
        <FileText className="size-3" />
        <span>{stats.totalWords.toLocaleString()} words</span>
      </div>
      <div className="w-px h-3 bg-[var(--vl-border-subtle)]" />
      <div className="flex items-center gap-1.5 text-[10px] vl-text-muted">
        <BookOpen className="size-3" />
        <span>{stats.readingTimeMinutes} min read</span>
      </div>
      <div className="w-px h-3 bg-[var(--vl-border-subtle)]" />
      <div className="flex items-center gap-1.5 text-[10px] vl-text-muted">
        <Sparkles className="size-3" />
        <span>{stats.messageCount} messages</span>
      </div>
    </motion.div>
  )
}

// ============================================================
// Focus Timer (Pomodoro)
// ============================================================

function FocusTimer({ onComplete }: { onComplete: () => void }) {
  const [timerState, setTimerState] = useState<FocusTimerState>({
    totalSeconds: POMODORO_WORK_SECONDS,
    remainingSeconds: POMODORO_WORK_SECONDS,
    isRunning: false,
    isBreak: false,
    sessionsCompleted: 0,
    startTime: null,
  })
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const progress = 1 - timerState.remainingSeconds / timerState.totalSeconds
  const minutes = Math.floor(timerState.remainingSeconds / 60)
  const seconds = timerState.remainingSeconds % 60
  const displayTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`

  const timerColor = timerState.isBreak ? '#f59e0b' : '#10b981'

  // Timer tick
  useEffect(() => {
    if (!timerState.isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }

    intervalRef.current = setInterval(() => {
      setTimerState(prev => {
        const next = prev.remainingSeconds - 1
        if (next <= 0) {
          // Timer completed
          if (intervalRef.current) clearInterval(intervalRef.current)

          // Switch to break or work
          if (!prev.isBreak) {
            // Work session complete → break
            toast.success('🍅 Work session complete! Take a break.', { duration: 5000 })
            return {
              ...prev,
              remainingSeconds: POMODORO_BREAK_SECONDS,
              totalSeconds: POMODORO_BREAK_SECONDS,
              isBreak: true,
              isRunning: false,
              sessionsCompleted: prev.sessionsCompleted + 1,
              startTime: null,
            }
          } else {
            // Break complete → work
            toast.info('☕ Break over! Ready for another session?', { duration: 5000 })
            onComplete()
            return {
              ...prev,
              remainingSeconds: POMODORO_WORK_SECONDS,
              totalSeconds: POMODORO_WORK_SECONDS,
              isBreak: false,
              isRunning: false,
              startTime: null,
            }
          }
        }
        return { ...prev, remainingSeconds: next }
      })
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [timerState.isRunning, onComplete])

  const handleStartPause = useCallback(() => {
    setTimerState(prev => ({
      ...prev,
      isRunning: !prev.isRunning,
      startTime: prev.isRunning ? null : Date.now(),
    }))
  }, [])

  const handleReset = useCallback(() => {
    setTimerState(prev => ({
      ...prev,
      remainingSeconds: prev.isBreak ? POMODORO_BREAK_SECONDS : POMODORO_WORK_SECONDS,
      isRunning: false,
      startTime: null,
    }))
  }, [])

  const handleSkip = useCallback(() => {
    setTimerState(prev => {
      if (!prev.isBreak) {
        toast.success('🍅 Skipped to break', { duration: 3000 })
        return {
          ...prev,
          remainingSeconds: POMODORO_BREAK_SECONDS,
          totalSeconds: POMODORO_BREAK_SECONDS,
          isBreak: true,
          isRunning: false,
          sessionsCompleted: prev.sessionsCompleted + 1,
          startTime: null,
        }
      } else {
        toast.info('☕ Skipped to work session', { duration: 3000 })
        return {
          ...prev,
          remainingSeconds: POMODORO_WORK_SECONDS,
          totalSeconds: POMODORO_WORK_SECONDS,
          isBreak: false,
          isRunning: false,
          startTime: null,
        }
      }
    })
  }, [])

  return (
    <div className="flex items-center gap-3">
      {/* Timer display */}
      <div className="relative flex items-center justify-center">
        <CircularProgressRing
          progress={progress}
          size={40}
          strokeWidth={2.5}
          color={timerColor}
        />
        <span className="absolute text-[11px] font-mono font-semibold vl-text-heading">
          {displayTime}
        </span>
      </div>

      {/* Timer label */}
      <div className="flex flex-col">
        <span className={`text-[10px] font-medium ${timerState.isBreak ? 'text-amber-400' : 'text-emerald-400'}`}>
          {timerState.isBreak ? '☕ Break' : '🍅 Focus'}
        </span>
        {timerState.sessionsCompleted > 0 && (
          <span className="text-[9px] vl-text-muted">
            {timerState.sessionsCompleted} session{timerState.sessionsCompleted !== 1 ? 's' : ''} done
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handleStartPause}
          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
            timerState.isRunning
              ? 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25'
              : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
          }`}
          aria-label={timerState.isRunning ? 'Pause timer' : 'Start timer'}
        >
          {timerState.isRunning ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
        </button>
        <button
          type="button"
          onClick={handleSkip}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-violet-400 bg-violet-500/15 hover:bg-violet-500/25 transition-all"
          aria-label="Skip to next"
        >
          <ChevronRight className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--vl-text-muted)] bg-[var(--vl-bg-inner)] hover:bg-[var(--vl-bg-card-hover)] transition-all"
          aria-label="Reset timer"
        >
          <RotateCcw className="size-3" />
        </button>
      </div>
    </div>
  )
}

// ============================================================
// Session Stats
// ============================================================

function SessionStatsBar({ stats, isActive }: { stats: FocusSessionStats; isActive: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3"
    >
      <div className="flex items-center gap-1.5 text-[10px] vl-text-muted">
        <Clock className="size-3 text-emerald-400" />
        <span>{stats.totalFocusMinutes}m focused</span>
      </div>
      <div className="w-px h-3 bg-[var(--vl-border-subtle)]" />
      <div className="flex items-center gap-1.5 text-[10px] vl-text-muted">
        <Eye className="size-3 text-cyan-400" />
        <span>{stats.meetingsReviewed} reviewed</span>
      </div>
      <div className="w-px h-3 bg-[var(--vl-border-subtle)]" />
      <div className="flex items-center gap-1.5 text-[10px] vl-text-muted">
        <FileText className="size-3 text-violet-400" />
        <span>{stats.notesTaken} notes</span>
      </div>
      {isActive && (
        <>
          <div className="w-px h-3 bg-[var(--vl-border-subtle)]" />
          <div className="flex items-center gap-1">
            <motion.span
              className="w-2 h-2 rounded-full bg-emerald-400"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-[10px] text-emerald-400 font-medium">Focus</span>
          </div>
        </>
      )}
    </motion.div>
  )
}

// ============================================================
// useFocusMode Hook
// ============================================================

export function useFocusMode() {
  const [isActive, setIsActive] = useState(false)
  const [sessionStats, setSessionStats] = useState<FocusSessionStats>({
    totalFocusMinutes: 0,
    meetingsReviewed: 0,
    notesTaken: 0,
  })
  const focusStartRef = useRef<number | null>(null)

  // Load saved stats
  useEffect(() => {
    try {
      const saved = localStorage.getItem('vl-focus-stats')
      if (saved) {
        const parsed = JSON.parse(saved)
        setSessionStats(parsed)
      }
    } catch { /* ignore */ }
  }, [])

  const toggle = useCallback(() => {
    setIsActive(prev => {
      const next = !prev
      if (next) {
        focusStartRef.current = Date.now()
      } else if (focusStartRef.current) {
        const elapsed = Math.floor((Date.now() - focusStartRef.current) / 60000)
        if (elapsed > 0) {
          setSessionStats(prev => {
            const updated = { ...prev, totalFocusMinutes: prev.totalFocusMinutes + elapsed }
            try { localStorage.setItem('vl-focus-stats', JSON.stringify(updated)) } catch { /* ignore */ }
            return updated
          })
        }
        focusStartRef.current = null
      }
      return next
    })
  }, [])

  const incrementMeetingsReviewed = useCallback(() => {
    setSessionStats(prev => {
      const updated = { ...prev, meetingsReviewed: prev.meetingsReviewed + 1 }
      try { localStorage.setItem('vl-focus-stats', JSON.stringify(updated)) } catch { /* ignore */ }
      return updated
    })
  }, [])

  const incrementNotesTaken = useCallback(() => {
    setSessionStats(prev => {
      const updated = { ...prev, notesTaken: prev.notesTaken + 1 }
      try { localStorage.setItem('vl-focus-stats', JSON.stringify(updated)) } catch { /* ignore */ }
      return updated
    })
  }, [])

  return {
    isActive,
    toggle,
    sessionStats,
    incrementMeetingsReviewed,
    incrementNotesTaken,
  }
}

// ============================================================
// FocusMode — Main Component
// ============================================================

export default function FocusMode({ children, isActive, onToggle, messages = [], meetingName }: FocusModeProps) {
  const [toolbarVisible, setToolbarVisible] = useState(true)
  const [stats, setStats] = useState<FocusSessionStats>({
    totalFocusMinutes: 0,
    meetingsReviewed: 0,
    notesTaken: 0,
  })
  const focusStartRef = useRef<number | null>(null)

  // Load stats
  useEffect(() => {
    try {
      const saved = localStorage.getItem('vl-focus-stats')
      if (saved) setStats(JSON.parse(saved))
    } catch { /* ignore */ }
  }, [])

  // Track focus time
  useEffect(() => {
    if (isActive) {
      focusStartRef.current = Date.now()
    } else if (focusStartRef.current) {
      const elapsed = Math.floor((Date.now() - focusStartRef.current) / 60000)
      if (elapsed > 0) {
        setStats(prev => {
          const updated = { ...prev, totalFocusMinutes: prev.totalFocusMinutes + elapsed }
          try { localStorage.setItem('vl-focus-stats', JSON.stringify(updated)) } catch { /* ignore */ }
          return updated
        })
      }
      focusStartRef.current = null
    }
  }, [isActive])

  // Auto-hide toolbar after inactivity
  const toolbarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToolbar = useCallback(() => {
    setToolbarVisible(true)
    if (toolbarTimerRef.current) clearTimeout(toolbarTimerRef.current)
    toolbarTimerRef.current = setTimeout(() => {
      if (isActive) setToolbarVisible(false)
    }, 3000)
  }, [isActive])

  useEffect(() => {
    if (!isActive) {
      setToolbarVisible(true)
      return
    }
    const handleMouseMove = () => showToolbar()
    document.addEventListener('mousemove', handleMouseMove)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      if (toolbarTimerRef.current) clearTimeout(toolbarTimerRef.current)
    }
  }, [isActive, showToolbar])

  const handleTimerComplete = useCallback(() => {
    // Increment focus time for completed pomodoro
    setStats(prev => {
      const updated = { ...prev, totalFocusMinutes: prev.totalFocusMinutes + 25 }
      try { localStorage.setItem('vl-focus-stats', JSON.stringify(updated)) } catch { /* ignore */ }
      return updated
    })
  }, [])

  return (
    <>
      {/* Ambient background overlay when focus mode active */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            className="fixed inset-0 z-[90] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(2,6,23,0.4) 0%, rgba(2,6,23,0.7) 60%, rgba(2,6,23,0.9) 100%)',
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(circle at 30% 20%, rgba(16,185,129,0.05) 0%, transparent 40%), radial-gradient(circle at 70% 80%, rgba(139,92,246,0.03) 0%, transparent 40%)',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Minimal Toolbar */}
      <AnimatePresence>
        {isActive && toolbarVisible && (
          <motion.div
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[95]"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl border border-[var(--vl-border)] shadow-2xl backdrop-blur-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(30,41,59,0.85) 0%, rgba(15,23,42,0.9) 100%)',
              }}
            >
              {/* Back / Exit button */}
              <button
                type="button"
                onClick={onToggle}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--vl-text-muted)] hover:text-white hover:bg-white/10 transition-all"
                aria-label="Exit focus mode"
              >
                <X className="size-3.5" />
              </button>

              <div className="w-px h-6 bg-white/10" />

              {/* Mode indicator */}
              <div className="flex items-center gap-1.5">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Eye className="size-3.5 text-emerald-400" />
                </motion.div>
                <span className="text-[11px] font-medium text-white">Focus Mode</span>
              </div>

              {meetingName && (
                <>
                  <div className="w-px h-6 bg-white/10" />
                  <span className="text-[10px] text-white/50 max-w-[120px] truncate">{meetingName}</span>
                </>
              )}

              <div className="w-px h-6 bg-white/10" />

              {/* Pomodoro Timer */}
              <FocusTimer onComplete={handleTimerComplete} />

              <div className="w-px h-6 bg-white/10" />

              {/* Word Count Stats */}
              <WordCountStats messages={messages} />

              <div className="w-px h-6 bg-white/10" />

              {/* Session Stats */}
              <SessionStatsBar stats={stats} isActive={true} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Area — smooth scale/fade animation */}
      <AnimatePresence mode="wait">
        {isActive ? (
          <motion.div
            key="focus-active"
            className="relative z-[91]"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="max-w-4xl mx-auto px-6 sm:px-12 lg:px-20 pt-20 pb-12">
              {children}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="focus-inactive"
            initial={{ opacity: 0, scale: 1.01 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.01 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
