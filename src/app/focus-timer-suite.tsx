'use client'

/**
 * Focus Timer Productivity Suite
 *
 * Comprehensive Pomodoro-style focus timer with:
 * - 5 timer modes: Pomodoro, Custom, Countdown, Stopwatch, Deep Work
 * - Circular SVG progress ring with color-coded phases
 * - Auto-rotation between work/break phases
 * - Web Audio API sound alerts (chime, tone, tick)
 * - Browser tab title updates with remaining time
 * - Toast notifications on phase change
 * - Screen border glow effect during focus
 * - Session logging with notes, task/agent/meeting association
 * - Daily session history view
 * - Session goals (target pomodoros per day)
 * - Statistics (total focus time, avg session, streak)
 * - Full localStorage persistence
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  Play, Pause, SkipForward, RotateCcw, Square,
  Timer, Coffee, Brain, Clock, Flame, Target,
  Volume2, VolumeX, Bell, BellOff, ChevronDown, ChevronUp,
  Trophy, TrendingUp, CalendarDays, ListChecks,
  Settings, Zap, Award, StickyNote, X, CheckCircle2,
  Circle, AlertCircle,
} from 'lucide-react'

// ============================================================
// Types
// ============================================================

type TimerMode = 'pomodoro' | 'custom' | 'countdown' | 'stopwatch' | 'deep-work'
type PhaseType = 'work' | 'short-break' | 'long-break'
type TimerStatus = 'idle' | 'running' | 'paused' | 'completed'

interface TimerSettings {
  pomodoroWork: number
  pomodoroShortBreak: number
  pomodoroLongBreak: number
  pomodorosBeforeLongBreak: number
  customWork: number
  customBreak: number
  countdownMinutes: number
  soundEnabled: boolean
  soundVolume: number
  dailyGoal: number
}

interface FocusSession {
  id: string
  mode: TimerMode
  phase: PhaseType
  durationSeconds: number
  completedAt: string
  status: 'completed' | 'abandoned'
  notes: string
  associatedTask: string
  associatedAgent: string
  associatedMeeting: string
}

interface TimerState {
  mode: TimerMode
  phase: PhaseType
  status: TimerStatus
  remainingSeconds: number
  totalSeconds: number
  elapsedSeconds: number
  currentPomodoro: number
}

interface ToastNotification {
  id: string
  title: string
  message: string
  type: 'work' | 'break' | 'warning'
  visible: boolean
}

// ============================================================
// Default Settings
// ============================================================

const DEFAULT_SETTINGS: TimerSettings = {
  pomodoroWork: 25,
  pomodoroShortBreak: 5,
  pomodoroLongBreak: 15,
  pomodorosBeforeLongBreak: 4,
  customWork: 30,
  customBreak: 10,
  countdownMinutes: 10,
  soundEnabled: true,
  soundVolume: 0.5,
  dailyGoal: 8,
}

const STORAGE_SESSIONS = 'vl-focus-sessions'
const STORAGE_SETTINGS = 'vl-focus-settings'
const STORAGE_STATE = 'vl-focus-state'

// ============================================================
// Utility Functions
// ============================================================

function formatTime(seconds: number): string {
  const m = Math.floor(Math.abs(seconds) / 60)
  const s = Math.abs(seconds) % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function generateId(): string {
  return `ft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function getPhaseColor(phase: PhaseType, mode: TimerMode): string {
  if (mode === 'deep-work') return 'violet'
  if (mode === 'countdown') return 'amber'
  if (mode === 'stopwatch') return 'pink'
  if (phase === 'work') return 'emerald'
  if (phase === 'short-break') return 'cyan'
  return 'blue'
}

function getPhaseLabel(phase: PhaseType, mode: TimerMode): string {
  if (mode === 'deep-work') return 'Deep Work'
  if (mode === 'countdown') return 'Countdown'
  if (mode === 'stopwatch') return 'Stopwatch'
  if (phase === 'work') return 'Focus Time'
  if (phase === 'short-break') return 'Short Break'
  return 'Long Break'
}

function getPhaseStrokeClass(phase: PhaseType, mode: TimerMode): string {
  if (mode === 'deep-work') return 'ft-ring-progress-deep-work'
  if (mode === 'countdown') return 'ft-ring-progress-countdown'
  if (mode === 'stopwatch') return 'ft-ring-progress-stopwatch'
  if (phase === 'work') return 'ft-ring-progress-work'
  if (phase === 'short-break') return 'ft-ring-progress-short-break'
  return 'ft-ring-progress-long-break'
}

function getLabelClass(phase: PhaseType, mode: TimerMode): string {
  if (mode === 'deep-work') return 'ft-mode-label-deep-work'
  if (mode === 'countdown') return 'ft-mode-label-countdown'
  if (mode === 'stopwatch') return 'ft-mode-label-stopwatch'
  if (phase === 'work') return 'ft-mode-label-work'
  if (phase === 'short-break') return 'ft-mode-label-short-break'
  return 'ft-mode-label-long-break'
}

function getBadgeClass(mode: TimerMode): string {
  switch (mode) {
    case 'pomodoro': return 'ft-session-type-badge-work'
    case 'deep-work': return 'ft-session-type-badge-deep-work'
    case 'countdown': return 'ft-session-type-badge-countdown'
    case 'stopwatch': return 'ft-session-type-badge-stopwatch'
    default: return 'ft-session-type-badge-short-break'
  }
}

function getGlowClass(phase: PhaseType, mode: TimerMode): string {
  if (mode === 'deep-work') return 'ft-glow-border-deep-work'
  if (phase === 'short-break') return 'ft-glow-border-short-break'
  if (phase === 'long-break') return 'ft-glow-border-long-break'
  return ''
}

function getDotClass(phase: PhaseType): string {
  switch (phase) {
    case 'work': return 'pd-timeline-dot-work'
    case 'short-break': return 'pd-timeline-dot-short-break'
    default: return 'pd-timeline-dot-long-break'
  }
}

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0]
}

// ============================================================
// Web Audio API Sound Manager
// ============================================================

class SoundManager {
  private audioCtx: AudioContext | null = null
  private _volume: number = 0.5
  private _enabled: boolean = true

  get volume(): number { return this._volume }
  set volume(v: number) { this._volume = Math.max(0, Math.min(1, v)) }
  get enabled(): boolean { return this._enabled }
  set enabled(e: boolean) { this._enabled = e }

  private getContext(): AudioContext | null {
    if (!this._enabled) return null
    if (!this.audioCtx) {
      try { this.audioCtx = new (window.AudioContext || (window as unknown as Record<string, unknown>).webkitAudioContext as typeof AudioContext)() }
      catch { return null }
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume()
    }
    return this.audioCtx
  }

  playWorkComplete() {
    const ctx = this.getContext()
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(523.25, ctx.currentTime) // C5
    gain.gain.setValueAtTime(this._volume * 0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.8)
    // Second tone
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.2) // E5
    gain2.gain.setValueAtTime(0.001, ctx.currentTime)
    gain2.gain.linearRampToValueAtTime(this._volume * 0.3, ctx.currentTime + 0.2)
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0)
    osc2.start(ctx.currentTime + 0.2)
    osc2.stop(ctx.currentTime + 1.0)
  }

  playBreakComplete() {
    const ctx = this.getContext()
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(783.99, ctx.currentTime) // G5
    gain.gain.setValueAtTime(this._volume * 0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 1.0)
    // Lower tone
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.type = 'triangle'
    osc2.frequency.setValueAtTime(392, ctx.currentTime + 0.3) // G4
    gain2.gain.setValueAtTime(0.001, ctx.currentTime)
    gain2.gain.linearRampToValueAtTime(this._volume * 0.2, ctx.currentTime + 0.3)
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2)
    osc2.start(ctx.currentTime + 0.3)
    osc2.stop(ctx.currentTime + 1.2)
  }

  playTick() {
    const ctx = this.getContext()
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(1000, ctx.currentTime)
    gain.gain.setValueAtTime(this._volume * 0.1, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.1)
  }
}

// ============================================================
// Circular Progress Ring Component (SVG)
// ============================================================

function CircularProgressRing({
  progress,
  size = 240,
  strokeWidth = 8,
  strokeClass,
  showGlow = false,
}: {
  progress: number
  size?: number
  strokeWidth?: number
  strokeClass: string
  showGlow?: boolean
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * Math.max(radius, 1)
  const clampedProgress = Math.max(0, Math.min(1, progress))
  const dashArray = circumference
  const dashOffset = circumference * (1 - clampedProgress)

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Track */}
      <circle
        className="ft-ring-track"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
      />
      {/* Glow effect */}
      {showGlow && clampedProgress > 0 && (
        <circle
          className={strokeClass}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth + 6}
          strokeDasharray={dashArray}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          opacity={0.15}
        />
      )}
      {/* Progress */}
      <circle
        className={strokeClass}
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        strokeDasharray={dashArray}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
      />
    </svg>
  )
}

// ============================================================
// Focus Timer Suite — Main Component
// ============================================================

export default function FocusTimerSuite() {
  // ---- State ----
  const [settings, setSettings] = useState<TimerSettings>(DEFAULT_SETTINGS)
  const [timerState, setTimerState] = useState<TimerState>({
    mode: 'pomodoro',
    phase: 'work',
    status: 'idle',
    remainingSeconds: DEFAULT_SETTINGS.pomodoroWork * 60,
    totalSeconds: DEFAULT_SETTINGS.pomodoroWork * 60,
    elapsedSeconds: 0,
    currentPomodoro: 1,
  })
  const [sessions, setSessions] = useState<FocusSession[]>([])
  const [toasts, setToasts] = useState<ToastNotification[]>([])
  const [showGlow, setShowGlow] = useState(false)
  const [showLog, setShowLog] = useState(false)
  const [showNotes, setShowNotes] = useState<string | null>(null)
  const [notesText, setNotesText] = useState('')
  const [taskLabel, setTaskLabel] = useState('')
  const [customWorkMin, setCustomWorkMin] = useState(30)
  const [customBreakMin, setCustomBreakMin] = useState(10)
  const [countdownMin, setCountdownMin] = useState(10)
  const [mounted, setMounted] = useState(false)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const soundRef = useRef(new SoundManager())
  const tickWarningRef = useRef(false)
  const sessionStartRef = useRef<number>(0)

  // ---- Load persisted state ----
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(STORAGE_SETTINGS)
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings) as Partial<TimerSettings>
        setSettings(prev => ({ ...prev, ...parsed }))
      }
      const savedSessions = localStorage.getItem(STORAGE_SESSIONS)
      if (savedSessions) {
        setSessions(JSON.parse(savedSessions) as FocusSession[])
      }
      const savedState = localStorage.getItem(STORAGE_STATE)
      if (savedState) {
        const parsed = JSON.parse(savedState) as TimerState
        if (parsed.status === 'running' || parsed.status === 'paused') {
          // Resume paused timer, reset running ones to paused
          setTimerState(prev => ({
            ...parsed,
            status: 'paused',
          }))
        } else {
          setTimerState(prev => ({ ...prev, ...parsed }))
        }
      }
    } catch {
      // Ignore parse errors
    }
    setMounted(true)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // ---- Persist state ----
  useEffect(() => {
    if (!mounted) return
    try {
      localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(settings))
    } catch { /* ignore */ }
  }, [settings, mounted])

  useEffect(() => {
    if (!mounted) return
    try {
      localStorage.setItem(STORAGE_SESSIONS, JSON.stringify(sessions))
    } catch { /* ignore */ }
  }, [sessions, mounted])

  useEffect(() => {
    if (!mounted) return
    try {
      localStorage.setItem(STORAGE_STATE, JSON.stringify(timerState))
    } catch { /* ignore */ }
  }, [timerState, mounted])

  // ---- Update sound manager from settings ----
  useEffect(() => {
    soundRef.current.volume = settings.soundVolume
    soundRef.current.enabled = settings.soundEnabled
  }, [settings.soundVolume, settings.soundEnabled])

  // ---- Browser tab title ----
  useEffect(() => {
    if (timerState.status === 'running') {
      if (timerState.mode === 'stopwatch') {
        document.title = `⏱ ${formatTime(timerState.elapsedSeconds)} - Virtual Lab`
      } else {
        document.title = `⏰ ${formatTime(timerState.remainingSeconds)} - Virtual Lab`
      }
    } else if (timerState.status === 'paused') {
      document.title = `⏸ ${formatTime(timerState.remainingSeconds)} - Virtual Lab`
    } else {
      document.title = 'Virtual Lab'
    }
    return () => {
      document.title = 'Virtual Lab'
    }
  }, [timerState.status, timerState.remainingSeconds, timerState.elapsedSeconds, timerState.mode])

  // ---- Toast helpers ----
  const addToast = useCallback((title: string, message: string, type: ToastNotification['type']) => {
    const toastId = generateId()
    setToasts(prev => [...prev, { id: toastId, title, message, type, visible: true }])
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === toastId ? { ...t, visible: false } : t))
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toastId))
      }, 300)
    }, 4000)
  }, [])

  // ---- Session log helper ----
  const logSession = useCallback((status: 'completed' | 'abandoned') => {
    const session: FocusSession = {
      id: generateId(),
      mode: timerState.mode,
      phase: timerState.phase,
      durationSeconds: timerState.mode === 'stopwatch'
        ? timerState.elapsedSeconds
        : timerState.totalSeconds - timerState.remainingSeconds,
      completedAt: new Date().toISOString(),
      status,
      notes: '',
      associatedTask: taskLabel,
      associatedAgent: '',
      associatedMeeting: '',
    }
    setSessions(prev => [session, ...prev])
    return session.id
  }, [timerState.mode, timerState.phase, timerState.totalSeconds, timerState.remainingSeconds, timerState.elapsedSeconds, taskLabel])

  // ---- Timer tick ----
  const tick = useCallback(() => {
    setTimerState(prev => {
      if (prev.status !== 'running') return prev

      // Stopwatch: count up
      if (prev.mode === 'stopwatch') {
        const newElapsed = prev.elapsedSeconds + 1
        // 5-min warning
        if (newElapsed === 300 && !tickWarningRef.current) {
          soundRef.current.playTick()
          addToast('5 Minute Mark', 'You have been focusing for 5 minutes.', 'warning')
          tickWarningRef.current = true
        }
        return { ...prev, elapsedSeconds: newElapsed, remainingSeconds: newElapsed }
      }

      const newRemaining = prev.remainingSeconds - 1

      // 5-minute warning for countdown modes
      if (newRemaining === 300 && prev.phase === 'work' && !tickWarningRef.current) {
        soundRef.current.playTick()
        addToast('5 Minute Warning', '5 minutes remaining in focus session.', 'warning')
        tickWarningRef.current = true
      }

      if (newRemaining <= 0) {
        // Timer completed
        return { ...prev, remainingSeconds: 0, status: 'completed' }
      }

      return { ...prev, remainingSeconds: newRemaining }
    })
  }, [addToast])

  // ---- Handle timer completion ----
  useEffect(() => {
    if (timerState.status !== 'completed') return

    // Play sound
    if (timerState.phase === 'work') {
      soundRef.current.playWorkComplete()
      addToast('Focus Complete!', `Great work! Time for a ${timerState.mode === 'deep-work' ? 'long' : 'short'} break.`, 'break')
    } else {
      soundRef.current.playBreakComplete()
      addToast('Break Over!', 'Ready to focus again?', 'work')
    }

    // Log session
    logSession('completed')

    // Auto-advance to next phase for pomodoro/custom
    if (timerState.mode === 'pomodoro' || timerState.mode === 'custom') {
      const isLastPomodoro = timerState.currentPomodoro >= settings.pomodorosBeforeLongBreak
      const nextPhase: PhaseType = timerState.phase === 'work'
        ? (isLastPomodoro ? 'long-break' : 'short-break')
        : 'work'
      const nextDuration = nextPhase === 'work'
        ? (timerState.mode === 'custom' ? settings.customWork : settings.pomodoroWork) * 60
        : (nextPhase === 'short-break'
          ? (timerState.mode === 'custom' ? settings.customBreak : settings.pomodoroShortBreak) * 60
          : settings.pomodoroLongBreak * 60)

      setTimeout(() => {
        setTimerState(prev => ({
          ...prev,
          phase: nextPhase,
          status: 'idle',
          remainingSeconds: nextDuration,
          totalSeconds: nextDuration,
          currentPomodoro: nextPhase === 'work' ? (isLastPomodoro ? 1 : prev.currentPomodoro + 1) : prev.currentPomodoro,
          elapsedSeconds: 0,
        }))
        tickWarningRef.current = false
      }, 1500)
    } else if (timerState.mode === 'deep-work') {
      setTimeout(() => {
        setTimerState(prev => ({
          ...prev,
          phase: 'long-break',
          status: 'idle',
          remainingSeconds: settings.pomodoroLongBreak * 60,
          totalSeconds: settings.pomodoroLongBreak * 60,
          elapsedSeconds: 0,
        }))
        tickWarningRef.current = false
      }, 1500)
    } else {
      // Countdown/stopwatch: just mark complete
      setTimeout(() => {
        setTimerState(prev => ({
          ...prev,
          status: 'idle',
          remainingSeconds: prev.mode === 'countdown' ? settings.countdownMinutes * 60 : 0,
          totalSeconds: prev.mode === 'countdown' ? settings.countdownMinutes * 60 : 0,
        }))
        tickWarningRef.current = false
      }, 1500)
    }
  }, [timerState.status, timerState.phase, timerState.mode, timerState.currentPomodoro, settings, addToast, logSession])

  // ---- Glow effect ----
  useEffect(() => {
    setShowGlow(timerState.status === 'running' && timerState.phase === 'work')
  }, [timerState.status, timerState.phase])

  // ---- Timer interval ----
  useEffect(() => {
    if (timerState.status === 'running') {
      timerRef.current = setInterval(tick, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [timerState.status, tick])

  // ---- Controls ----
  const handleStart = useCallback(() => {
    tickWarningRef.current = false
    sessionStartRef.current = Date.now()
    setTimerState(prev => ({ ...prev, status: 'running' }))
  }, [])

  const handlePause = useCallback(() => {
    setTimerState(prev => ({ ...prev, status: 'paused' }))
  }, [])

  const handleResume = useCallback(() => {
    setTimerState(prev => ({ ...prev, status: 'running' }))
  }, [])

  const handleStop = useCallback(() => {
    if (timerState.status === 'running' || timerState.status === 'paused') {
      logSession(timerState.elapsedSeconds > 10 ? 'completed' : 'abandoned')
    }
    setTimerState(prev => ({
      ...prev,
      status: 'idle',
      remainingSeconds: prev.totalSeconds,
      elapsedSeconds: 0,
    }))
    tickWarningRef.current = false
  }, [timerState.status, timerState.elapsedSeconds, logSession])

  const handleReset = useCallback(() => {
    setTimerState(prev => ({
      ...prev,
      status: 'idle',
      remainingSeconds: prev.totalSeconds,
      elapsedSeconds: 0,
    }))
    tickWarningRef.current = false
  }, [])

  const handleSkip = useCallback(() => {
    if (timerState.mode === 'stopwatch') return
    if (timerState.status === 'running' || timerState.status === 'paused') {
      logSession('abandoned')
    }
    if (timerState.mode === 'pomodoro' || timerState.mode === 'custom') {
      const isLastPomodoro = timerState.currentPomodoro >= settings.pomodorosBeforeLongBreak
      const nextPhase: PhaseType = timerState.phase === 'work'
        ? (isLastPomodoro ? 'long-break' : 'short-break')
        : 'work'
      const nextDuration = nextPhase === 'work'
        ? (timerState.mode === 'custom' ? settings.customWork : settings.pomodoroWork) * 60
        : (nextPhase === 'short-break'
          ? (timerState.mode === 'custom' ? settings.customBreak : settings.pomodoroShortBreak) * 60
          : settings.pomodoroLongBreak * 60)

      setTimerState(prev => ({
        ...prev,
        phase: nextPhase,
        status: 'idle',
        remainingSeconds: nextDuration,
        totalSeconds: nextDuration,
        currentPomodoro: nextPhase === 'work' ? (isLastPomodoro ? 1 : prev.currentPomodoro + 1) : prev.currentPomodoro,
        elapsedSeconds: 0,
      }))
    } else {
      setTimerState(prev => ({
        ...prev,
        status: 'idle',
        remainingSeconds: prev.totalSeconds,
        elapsedSeconds: 0,
      }))
    }
    tickWarningRef.current = false
  }, [timerState.mode, timerState.phase, timerState.status, timerState.currentPomodoro, settings, logSession])

  // ---- Mode switch ----
  const switchMode = useCallback((mode: TimerMode) => {
    const durations: Record<TimerMode, number> = {
      'pomodoro': settings.pomodoroWork * 60,
      'custom': settings.customWork * 60,
      'countdown': settings.countdownMinutes * 60,
      'stopwatch': 0,
      'deep-work': 90 * 60,
    }
    setTimerState({
      mode,
      phase: 'work',
      status: 'idle',
      remainingSeconds: durations[mode],
      totalSeconds: durations[mode],
      elapsedSeconds: 0,
      currentPomodoro: 1,
    })
    tickWarningRef.current = false
  }, [settings])

  // ---- Update session notes ----
  const updateSessionNotes = useCallback((sessionId: string, notes: string) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, notes } : s))
    setShowNotes(null)
    setNotesText('')
  }, [])

  // ---- Delete session ----
  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId))
  }, [])

  // ---- Statistics ----
  const stats = useMemo(() => {
    const today = getTodayStr()
    const todaySessions = sessions.filter(s => s.completedAt.startsWith(today))
    const completedToday = todaySessions.filter(s => s.status === 'completed')
    const totalFocusMinToday = completedToday
      .filter(s => s.phase === 'work' || s.mode === 'deep-work' || s.mode === 'countdown')
      .reduce((sum, s) => sum + Math.round(s.durationSeconds / 60), 0)
    const avgSessionMin = completedToday.length > 0
      ? Math.round(completedToday.reduce((sum, s) => sum + s.durationSeconds, 0) / completedToday.length / 60)
      : 0

    // Streak calculation
    let streak = 0
    const checkDate = new Date()
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0]
      const daySessions = sessions.filter(s => s.completedAt.startsWith(dateStr) && s.status === 'completed')
      if (daySessions.length === 0) break
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    }

    const longestStreak = (() => {
      let maxStreak = 0
      let currentStreak = 0
      const sortedDates = [...new Set(sessions.filter(s => s.status === 'completed').map(s => s.completedAt.split('T')[0]))].sort()
      for (let i = 0; i < sortedDates.length; i++) {
        if (i === 0) {
          currentStreak = 1
        } else {
          const prevDate = new Date(sortedDates[i - 1])
          const currDate = new Date(sortedDates[i])
          const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (86400000))
          if (diffDays === 1) {
            currentStreak++
          } else {
            currentStreak = 1
          }
        }
        maxStreak = Math.max(maxStreak, currentStreak)
      }
      return maxStreak
    })()

    return {
      sessionsToday: completedToday.length,
      totalFocusMinToday,
      avgSessionMin,
      streak,
      longestStreak,
      totalSessions: sessions.filter(s => s.status === 'completed').length,
    }
  }, [sessions])

  // ---- Progress calculation ----
  const progress = useMemo(() => {
    if (timerState.mode === 'stopwatch') {
      return 0 // Stopwatch has no "progress", it counts up
    }
    if (timerState.totalSeconds === 0) return 0
    return 1 - (timerState.remainingSeconds / timerState.totalSeconds)
  }, [timerState.remainingSeconds, timerState.totalSeconds, timerState.mode])

  const goalProgress = useMemo(() => {
    const todayWork = sessions.filter(
      s => s.completedAt.startsWith(getTodayStr()) && s.status === 'completed' && s.phase === 'work'
    ).length
    return Math.min(todayWork / settings.dailyGoal, 1)
  }, [sessions, settings.dailyGoal])

  const displayTime = useMemo(() => {
    if (timerState.mode === 'stopwatch') {
      return formatTime(timerState.elapsedSeconds)
    }
    return formatTime(timerState.remainingSeconds)
  }, [timerState.remainingSeconds, timerState.elapsedSeconds, timerState.mode])

  // ---- Today's sessions for log ----
  const todaySessions = useMemo(() => {
    return sessions.filter(s => s.completedAt.startsWith(getTodayStr())).slice(0, 20)
  }, [sessions])

  // ---- Don't render until mounted (SSR safety) ----
  if (!mounted) {
    return (
      <div className="ft-container">
        <div className="ft-timer-ring">
          <CircularProgressRing progress={0} strokeClass="ft-ring-progress-work" />
          <div className="ft-timer-center">
            <div className="ft-timer-display">--:--</div>
            <div className="ft-mode-label">Loading...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="ft-container">
      {/* Glow border effect */}
      <div
        className={`ft-glow-border ${showGlow ? 'ft-glow-border-active' : ''} ${showGlow ? getGlowClass(timerState.phase, timerState.mode) : ''}`}
      />

      {/* Toast notifications */}
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`ft-notification-toast ${toast.visible ? '' : 'ft-notification-toast-exit'}`}
        >
          <div className={`ft-notification-toast-icon ft-notification-toast-icon-${toast.type}`}>
            {toast.type === 'work' && <Brain size={18} />}
            {toast.type === 'break' && <Coffee size={18} />}
            {toast.type === 'warning' && <AlertCircle size={18} />}
          </div>
          <div className="ft-notification-toast-content">
            <div className="ft-notification-toast-title">{toast.title}</div>
            <div className="ft-notification-toast-message">{toast.message}</div>
          </div>
        </div>
      ))}

      {/* Mode selector */}
      <div className="ft-mode-selector">
        {([
          { mode: 'pomodoro' as TimerMode, label: 'Pomodoro', icon: <Timer size={14} /> },
          { mode: 'custom' as TimerMode, label: 'Custom', icon: <Settings size={14} /> },
          { mode: 'countdown' as TimerMode, label: 'Countdown', icon: <Clock size={14} /> },
          { mode: 'stopwatch' as TimerMode, label: 'Stopwatch', icon: <Zap size={14} /> },
          { mode: 'deep-work' as TimerMode, label: 'Deep Work', icon: <Brain size={14} /> },
        ]).map(item => (
          <button
            key={item.mode}
            className={`ft-mode-tab ${timerState.mode === item.mode ? 'ft-mode-tab-active' : ''}`}
            onClick={() => switchMode(item.mode)}
          >
            {item.icon}
            <span style={{ marginLeft: 4 }}>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Custom mode inputs */}
      {timerState.mode === 'custom' && timerState.status === 'idle' && (
        <div className="ft-custom-inputs ft-animate-fade-in">
          <div className="ft-custom-input-group">
            <label className="ft-custom-input-label">Work (min)</label>
            <input
              type="number"
              className="ft-custom-input"
              value={customWorkMin}
              onChange={e => {
                const v = Math.max(1, Math.min(120, parseInt(e.target.value) || 1))
                setCustomWorkMin(v)
                setSettings(prev => ({ ...prev, customWork: v }))
                if (timerState.phase === 'work') {
                  setTimerState(prev => ({
                    ...prev,
                    remainingSeconds: v * 60,
                    totalSeconds: v * 60,
                  }))
                }
              }}
              min={1}
              max={120}
            />
          </div>
          <div className="ft-custom-input-group">
            <label className="ft-custom-input-label">Break (min)</label>
            <input
              type="number"
              className="ft-custom-input"
              value={customBreakMin}
              onChange={e => {
                const v = Math.max(1, Math.min(60, parseInt(e.target.value) || 1))
                setCustomBreakMin(v)
                setSettings(prev => ({ ...prev, customBreak: v }))
              }}
              min={1}
              max={60}
            />
          </div>
        </div>
      )}

      {/* Countdown input */}
      {timerState.mode === 'countdown' && timerState.status === 'idle' && (
        <div className="ft-custom-inputs ft-animate-fade-in">
          <div className="ft-custom-input-group">
            <label className="ft-custom-input-label">Duration (min)</label>
            <input
              type="number"
              className="ft-custom-input"
              value={countdownMin}
              onChange={e => {
                const v = Math.max(1, Math.min(180, parseInt(e.target.value) || 1))
                setCountdownMin(v)
                setSettings(prev => ({ ...prev, countdownMinutes: v }))
                setTimerState(prev => ({
                  ...prev,
                  remainingSeconds: v * 60,
                  totalSeconds: v * 60,
                }))
              }}
              min={1}
              max={180}
            />
          </div>
        </div>
      )}

      {/* Pomodoro settings when idle */}
      {timerState.mode === 'pomodoro' && timerState.status === 'idle' && (
        <div className="ft-custom-inputs ft-animate-fade-in">
          <div className="ft-custom-input-group">
            <label className="ft-custom-input-label">Work (min)</label>
            <input
              type="number"
              className="ft-custom-input"
              value={settings.pomodoroWork}
              onChange={e => {
                const v = Math.max(1, Math.min(120, parseInt(e.target.value) || 25))
                setSettings(prev => ({ ...prev, pomodoroWork: v }))
                if (timerState.phase === 'work') {
                  setTimerState(prev => ({
                    ...prev,
                    remainingSeconds: v * 60,
                    totalSeconds: v * 60,
                  }))
                }
              }}
              min={1}
              max={120}
            />
          </div>
          <div className="ft-custom-input-group">
            <label className="ft-custom-input-label">Short Break</label>
            <input
              type="number"
              className="ft-custom-input"
              value={settings.pomodoroShortBreak}
              onChange={e => {
                const v = Math.max(1, Math.min(30, parseInt(e.target.value) || 5))
                setSettings(prev => ({ ...prev, pomodoroShortBreak: v }))
              }}
              min={1}
              max={30}
            />
          </div>
          <div className="ft-custom-input-group">
            <label className="ft-custom-input-label">Long Break</label>
            <input
              type="number"
              className="ft-custom-input"
              value={settings.pomodoroLongBreak}
              onChange={e => {
                const v = Math.max(1, Math.min(60, parseInt(e.target.value) || 15))
                setSettings(prev => ({ ...prev, pomodoroLongBreak: v }))
              }}
              min={1}
              max={60}
            />
          </div>
        </div>
      )}

      {/* Timer ring */}
      <div className="ft-timer-ring">
        <CircularProgressRing
          progress={timerState.mode === 'stopwatch' ? 0 : progress}
          size={240}
          strokeClass={getPhaseStrokeClass(timerState.phase, timerState.mode)}
          showGlow={timerState.status === 'running'}
        />
        <div className="ft-timer-center">
          <div className={`ft-timer-display ${timerState.status === 'completed' ? 'ft-animate-score' : ''}`}>
            {displayTime}
          </div>
          <div className={`ft-mode-label ${getLabelClass(timerState.phase, timerState.mode)}`}>
            {getPhaseLabel(timerState.phase, timerState.mode)}
          </div>
          {timerState.mode !== 'stopwatch' && timerState.totalSeconds > 0 && (
            <div className="ft-timer-progress-pct">
              {Math.round(progress * 100)}%
            </div>
          )}
          {(timerState.mode === 'pomodoro' || timerState.mode === 'custom') && (
            <div className="ft-timer-progress-pct" style={{ marginTop: 4 }}>
              Session {timerState.currentPomodoro} / {settings.pomodorosBeforeLongBreak}
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="ft-controls">
        {/* Reset */}
        <button
          className="ft-control-btn"
          onClick={handleReset}
          title="Reset"
          disabled={timerState.status === 'idle'}
        >
          <RotateCcw size={18} />
        </button>

        {/* Skip */}
        <button
          className="ft-control-btn"
          onClick={handleSkip}
          title="Skip to next phase"
          disabled={timerState.status === 'idle'}
        >
          <SkipForward size={18} />
        </button>

        {/* Start / Pause / Resume */}
        {timerState.status === 'idle' ? (
          <button
            className="ft-control-btn ft-control-btn-primary"
            onClick={handleStart}
            title="Start"
          >
            <Play size={24} />
          </button>
        ) : timerState.status === 'running' ? (
          <button
            className="ft-control-btn ft-control-btn-primary paused"
            onClick={handlePause}
            title="Pause"
          >
            <Pause size={24} />
          </button>
        ) : timerState.status === 'paused' ? (
          <button
            className="ft-control-btn ft-control-btn-primary"
            onClick={handleResume}
            title="Resume"
          >
            <Play size={24} />
          </button>
        ) : (
          <button
            className="ft-control-btn ft-control-btn-primary running"
            onClick={handleStop}
            title="Stop"
          >
            <Square size={24} />
          </button>
        )}

        {/* Stop */}
        {timerState.status === 'running' || timerState.status === 'paused' ? (
          <button
            className="ft-control-btn"
            onClick={handleStop}
            title="Stop & save"
          >
            <Square size={18} />
          </button>
        ) : (
          <div style={{ width: 48, height: 48 }} />
        )}
      </div>

      {/* Sound toggle */}
      <div className="ft-sound-toggle">
        <button
          className={`ft-sound-toggle-btn ${settings.soundEnabled ? 'ft-sound-toggle-btn-active' : ''}`}
          onClick={() => setSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
          title={settings.soundEnabled ? 'Mute' : 'Unmute'}
        >
          {settings.soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
        <input
          type="range"
          className="ft-volume-slider"
          min={0}
          max={1}
          step={0.1}
          value={settings.soundVolume}
          onChange={e => setSettings(prev => ({ ...prev, soundVolume: parseFloat(e.target.value) }))}
        />
        <button
          className={`ft-sound-toggle-btn ${settings.soundEnabled ? 'ft-sound-toggle-btn-active' : ''}`}
          onClick={() => {
            soundRef.current.playTick()
          }}
          title="Test sound"
        >
          <Bell size={16} />
        </button>
      </div>

      {/* Task label input */}
      <div style={{ width: '100%', maxWidth: 400 }}>
        <input
          type="text"
          className="ft-custom-input"
          style={{ width: '100%', textAlign: 'left' }}
          placeholder="What are you working on? (optional)"
          value={taskLabel}
          onChange={e => setTaskLabel(e.target.value)}
        />
      </div>

      {/* Daily goal progress */}
      <div className="ft-goal-progress">
        <div className="ft-goal-header">
          <div className="ft-goal-title">
            <Target size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
            Daily Goal
          </div>
          <div className="ft-goal-count">
            {Math.round(goalProgress * settings.dailyGoal)} / {settings.dailyGoal} pomodoros
          </div>
        </div>
        <div className="ft-goal-bar-track">
          <div className="ft-goal-bar-fill" style={{ width: `${goalProgress * 100}%` }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <label className="ft-custom-input-label">Target:</label>
          <input
            type="number"
            className="ft-custom-input"
            style={{ width: 56 }}
            value={settings.dailyGoal}
            onChange={e => {
              const v = Math.max(1, Math.min(20, parseInt(e.target.value) || 8))
              setSettings(prev => ({ ...prev, dailyGoal: v }))
            }}
            min={1}
            max={20}
          />
        </div>
      </div>

      {/* Statistics row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--vl-space-3)', width: '100%', maxWidth: 600 }}>
        <div className="ft-stat-card">
          <div className="ft-stat-icon ft-stat-icon-emerald">
            <Flame size={18} />
          </div>
          <div>
            <div className="ft-stat-label">Today</div>
            <div className="ft-stat-value">{stats.sessionsToday}</div>
            <div className="ft-stat-sub">sessions</div>
          </div>
        </div>
        <div className="ft-stat-card">
          <div className="ft-stat-icon ft-stat-icon-violet">
            <Clock size={18} />
          </div>
          <div>
            <div className="ft-stat-label">Focus</div>
            <div className="ft-stat-value">{stats.totalFocusMinToday}m</div>
            <div className="ft-stat-sub">today</div>
          </div>
        </div>
        <div className="ft-stat-card">
          <div className="ft-stat-icon ft-stat-icon-amber">
            <TrendingUp size={18} />
          </div>
          <div>
            <div className="ft-stat-label">Avg</div>
            <div className="ft-stat-value">{stats.avgSessionMin}m</div>
            <div className="ft-stat-sub">per session</div>
          </div>
        </div>
        <div className="ft-stat-card">
          <div className="ft-stat-icon ft-stat-icon-cyan">
            <Trophy size={18} />
          </div>
          <div>
            <div className="ft-stat-label">Streak</div>
            <div className="ft-stat-value">{stats.streak}</div>
            <div className="ft-stat-sub">days</div>
          </div>
        </div>
      </div>

      {/* Session log toggle */}
      <button
        className="ft-mode-tab"
        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
        onClick={() => setShowLog(prev => !prev)}
      >
        <ListChecks size={14} />
        <span>Session Log</span>
        {showLog ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {/* Session log */}
      {showLog && (
        <div className="ft-session-log ft-animate-slide-up">
          {todaySessions.length === 0 ? (
            <div className="ft-session-empty">
              <div className="ft-session-empty-icon">
                <CalendarDays size={24} />
              </div>
              <div className="ft-session-empty-title">No sessions today</div>
              <div className="ft-session-empty-desc">Start a focus session to begin tracking.</div>
            </div>
          ) : (
            todaySessions.map((session, idx) => (
              <div key={session.id} className="ft-session-log-item" style={{ animationDelay: `${idx * 50}ms` }}>
                <div className={`ft-session-type-badge ${getBadgeClass(session.mode)}`}>
                  {session.mode === 'pomodoro' && <Timer size={10} />}
                  {session.mode === 'deep-work' && <Brain size={10} />}
                  {session.mode === 'countdown' && <Clock size={10} />}
                  {session.mode === 'stopwatch' && <Zap size={10} />}
                  {session.mode === 'custom' && <Settings size={10} />}
                  <span>{session.mode}</span>
                </div>
                <div className="ft-session-info">
                  <div className="ft-session-task">
                    {session.associatedTask || 'Untitled Session'}
                  </div>
                  <div className="ft-session-meta">
                    <span>{Math.round(session.durationSeconds / 60)}m {Math.round(session.durationSeconds % 60)}s</span>
                    <span>·</span>
                    <span>{new Date(session.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className={`ft-session-status ft-session-status-${session.status}`}>
                      {session.status === 'completed' ? <CheckCircle2 size={10} /> : <Circle size={10} />}
                      {session.status}
                    </span>
                  </div>
                  {session.notes && (
                    <div className="ft-session-notes-preview">{session.notes}</div>
                  )}
                  {!session.notes && (
                    <button
                      className="ft-sound-toggle-btn"
                      style={{ marginTop: 4, fontSize: 10 }}
                      onClick={() => { setShowNotes(session.id); setNotesText('') }}
                    >
                      <StickyNote size={10} style={{ marginRight: 4 }} />
                      Add notes
                    </button>
                  )}
                </div>
                <button
                  className="ft-sound-toggle-btn"
                  onClick={() => deleteSession(session.id)}
                  title="Delete"
                  style={{ flexShrink: 0 }}
                >
                  <X size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Notes modal */}
      {showNotes && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 150,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowNotes(null)}>
          <div
            style={{
              background: 'var(--vl-bg-card)', borderRadius: 'var(--vl-radius-lg)',
              padding: 'var(--vl-space-6)', width: 'min(400px, 90vw)',
              border: '1px solid var(--vl-border-subtle)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <StickyNote size={16} />
                <span style={{ fontWeight: 600, color: 'var(--vl-text-heading)', fontSize: 'var(--vl-text-sm)' }}>Session Notes</span>
              </div>
              <button className="ft-sound-toggle-btn" onClick={() => setShowNotes(null)}>
                <X size={14} />
              </button>
            </div>
            <textarea
              className="ft-notes-input"
              placeholder="What did you accomplish?"
              value={notesText}
              onChange={e => setNotesText(e.target.value)}
              autoFocus
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button
                className="ft-mode-tab"
                onClick={() => setShowNotes(null)}
              >
                Cancel
              </button>
              <button
                className="ft-mode-tab ft-mode-tab-active"
                onClick={() => updateSessionNotes(showNotes, notesText)}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Longest streak stat */}
      <div style={{ fontSize: 'var(--vl-text-xs)', color: 'var(--vl-text-muted)', textAlign: 'center' }}>
        <Award size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
        Longest streak: {stats.longestStreak} days · Total sessions: {stats.totalSessions}
      </div>
    </div>
  )
}
