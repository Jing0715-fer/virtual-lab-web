'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Clock, Play, Pause, RotateCcw, Timer, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

const POMODORO_WORK = 25 * 60 // 25 minutes in seconds
const POMODORO_BREAK = 5 * 60 // 5 minutes in seconds
const RING_RADIUS = 42
const RING_STROKE = 5
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

export function ResearchClockWidget({ lang }: { lang: Lang }) {
  const [now, setNow] = useState(new Date())
  const [sessionStart] = useState(() => new Date())
  const [sessionSeconds, setSessionSeconds] = useState(0)

  // Pomodoro state
  const [pomodoroSeconds, setPomodoroSeconds] = useState(POMODORO_WORK)
  const [pomodoroRunning, setPomodoroRunning] = useState(false)
  const [pomodoroIsWork, setPomodoroIsWork] = useState(true)
  const [pomodoroSessions, setPomodoroSessions] = useState(0)
  const [pomodoroComplete, setPomodoroComplete] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Clock tick
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Session timer tick
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionSeconds(Math.floor((Date.now() - sessionStart.getTime()) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [sessionStart])

  // Pomodoro tick
  useEffect(() => {
    if (pomodoroRunning) {
      intervalRef.current = setInterval(() => {
        setPomodoroSeconds(prev => {
          if (prev <= 1) {
            // Timer complete
            setPomodoroRunning(false)
            if (pomodoroIsWork) {
              setPomodoroSessions(s => s + 1)
              setPomodoroIsWork(false)
              setPomodoroSeconds(POMODORO_BREAK)
              setPomodoroComplete(true)
              setTimeout(() => setPomodoroComplete(false), 2000)
            } else {
              setPomodoroIsWork(true)
              setPomodoroSeconds(POMODORO_WORK)
            }
            return pomodoroIsWork ? POMODORO_BREAK : POMODORO_WORK
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [pomodoroRunning, pomodoroIsWork])

  const handleStart = useCallback(() => setPomodoroRunning(true), [])
  const handlePause = useCallback(() => setPomodoroRunning(false), [])
  const handleReset = useCallback(() => {
    setPomodoroRunning(false)
    setPomodoroIsWork(true)
    setPomodoroSeconds(POMODORO_WORK)
    setPomodoroComplete(false)
  }, [])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const formatTimeHMS = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const pomodoroTotal = pomodoroIsWork ? POMODORO_WORK : POMODORO_BREAK
  const pomodoroProgress = 1 - pomodoroSeconds / pomodoroTotal
  const ringOffset = RING_CIRCUMFERENCE - pomodoroProgress * RING_CIRCUMFERENCE
  const ringColor = pomodoroIsWork ? '#10b981' : '#06b6d4'

  const localTimeStr = now.toLocaleTimeString('en-US', { hour12: false })
  const utcTimeStr = now.toISOString().slice(11, 19)

  return (
    <div className="space-y-4">
      {/* Clock display */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <Clock className="size-3 vl-text-muted" />
            <span className="text-[10px] vl-text-muted">{t(lang, 'dashboard.widgets.clock.localTime')}</span>
          </div>
          <span className="text-lg font-mono font-bold vl-text-heading tracking-wider">{localTimeStr}</span>
        </div>
        <div className="space-y-0.5 text-right">
          <div className="flex items-center gap-1.5 justify-end">
            <Globe className="size-3 vl-text-muted" />
            <span className="text-[10px] vl-text-muted">{t(lang, 'dashboard.widgets.clock.utcTime')}</span>
          </div>
          <span className="text-lg font-mono font-bold vl-text-heading tracking-wider">{utcTimeStr}</span>
        </div>
      </div>

      {/* Session timer */}
      <div className="vl-inner rounded-lg p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer className="size-4 text-cyan-400" />
          <div>
            <span className="text-[10px] vl-text-muted">{t(lang, 'dashboard.widgets.clock.sessionTimer')}</span>
            <span className="ml-2 text-sm font-mono font-semibold vl-text-heading">{formatTimeHMS(sessionSeconds)}</span>
          </div>
        </div>
      </div>

      {/* Pomodoro */}
      <div className="flex flex-col items-center space-y-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] vl-text-muted">{t(lang, 'dashboard.widgets.clock.pomodoro')}</span>
          <span className={`text-[10px] font-medium ${pomodoroIsWork ? 'text-emerald-400' : 'text-cyan-400'}`}>
            {pomodoroIsWork ? t(lang, 'dashboard.widgets.clock.work') : t(lang, 'dashboard.widgets.clock.break')}
          </span>
        </div>

        {/* Progress ring */}
        <div className={`relative ${pomodoroRunning ? 'pomodoro-ring-active' : ''} ${pomodoroComplete ? 'pomodoro-complete' : ''}`}>
          <svg width={100} height={100} viewBox="0 0 100 100" className="-rotate-90">
            {/* Background ring */}
            <circle
              cx="50" cy="50" r={RING_RADIUS}
              stroke="var(--vl-border)"
              strokeWidth={RING_STROKE}
              fill="none"
              opacity="0.4"
            />
            {/* Progress ring */}
            <circle
              cx="50" cy="50" r={RING_RADIUS}
              stroke={ringColor}
              strokeWidth={RING_STROKE}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={ringOffset}
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-mono font-bold vl-text-heading">{formatTime(pomodoroSeconds)}</span>
            {pomodoroComplete && (
              <span className="text-[8px] text-emerald-400 font-medium">{t(lang, 'dashboard.widgets.clock.sessionComplete')}</span>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {pomodoroRunning ? (
            <Button size="sm" onClick={handlePause} variant="outline" className="h-7 px-3 text-[10px] border-[var(--vl-border)] vl-text-body hover:bg-[var(--vl-bg-inner)] rounded-lg gap-1">
              <Pause className="size-3" />
              {t(lang, 'dashboard.widgets.clock.pause')}
            </Button>
          ) : (
            <Button size="sm" onClick={handleStart} className="h-7 px-3 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg gap-1">
              <Play className="size-3" />
              {t(lang, 'dashboard.widgets.clock.start')}
            </Button>
          )}
          <Button size="sm" onClick={handleReset} variant="outline" className="h-7 px-3 text-[10px] border-[var(--vl-border)] vl-text-body hover:bg-[var(--vl-bg-inner)] rounded-lg gap-1">
            <RotateCcw className="size-3" />
            {t(lang, 'dashboard.widgets.clock.reset')}
          </Button>
        </div>

        {/* Session count */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] vl-text-muted">{t(lang, 'dashboard.widgets.clock.sessions')}:</span>
          <span className="text-xs font-semibold vl-text-heading">{pomodoroSessions}</span>
        </div>
      </div>
    </div>
  )
}
