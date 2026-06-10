'use client'

/**
 * Productivity Analytics Dashboard
 *
 * Comprehensive productivity analytics with:
 * - Daily summary card (focus time, sessions, streak, avg session)
 * - Weekly heatmap (Mon-Sun x weeks, color intensity = hours)
 * - Session history timeline (vertical, expandable notes)
 * - Time distribution donut chart (work/break/deep work ratio)
 * - Hourly activity bar chart (24 bars)
 * - Streak calendar (GitHub-style 30-day grid)
 * - Weekly goal progress (circular ring)
 * - Best day/session highlights
 * - Focus score (0-100 calculated score)
 * - Export session data (JSON/CSV)
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  BarChart3, TrendingUp, Clock, Flame, Trophy,
  Brain, Coffee, Timer, Target, CalendarDays,
  Download, ChevronDown, ChevronUp, Award,
  Zap, Activity, Sun, Moon, Star,
  CheckCircle2, Circle,
} from 'lucide-react'

// ============================================================
// Types
// ============================================================

interface FocusSession {
  id: string
  mode: string
  phase: string
  durationSeconds: number
  completedAt: string
  status: string
  notes: string
  associatedTask: string
}

interface DailyStats {
  date: string
  totalFocusMin: number
  sessionCount: number
  workMin: number
  breakMin: number
  deepWorkMin: number
}

interface HourlyActivity {
  hour: number
  minutes: number
}

// ============================================================
// Constants
// ============================================================

const STORAGE_SESSIONS = 'vl-focus-sessions'
const STORAGE_SETTINGS = 'vl-focus-settings'

const MODE_COLORS: Record<string, string> = {
  work: '#10b981',
  'short-break': '#06b6d4',
  'long-break': '#3b82f6',
  'deep-work': '#8b5cf6',
  countdown: '#f59e0b',
  stopwatch: '#ec4899',
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// ============================================================
// Utility Functions
// ============================================================

function formatMin(min: number): string {
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function getDayOfWeek(dateStr: string): number {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay()
  return day === 0 ? 6 : day - 1 // 0=Mon, 6=Sun
}

function getHourFromISO(iso: string): number {
  return new Date(iso).getHours()
}

function calculateFocusScore(
  totalFocusMin: number,
  streak: number,
  sessionCount: number,
  consistency: number
): number {
  // Score components (weighted):
  // Total focus: up to 30 points (3+ hours = max)
  const focusScore = Math.min((totalFocusMin / 180) * 30, 30)
  // Streak: up to 25 points (7+ days = max)
  const streakScore = Math.min((streak / 7) * 25, 25)
  // Sessions: up to 20 points (8+ = max)
  const sessionScore = Math.min((sessionCount / 8) * 20, 20)
  // Consistency (ratio of active days this week): up to 25 points
  const consistencyScore = consistency * 25
  return Math.round(focusScore + streakScore + sessionScore + consistencyScore)
}

function getScoreGrade(score: number): { grade: string; color: string } {
  if (score >= 90) return { grade: 'A+', color: '#10b981' }
  if (score >= 80) return { grade: 'A', color: '#10b981' }
  if (score >= 70) return { grade: 'B+', color: '#3b82f6' }
  if (score >= 60) return { grade: 'B', color: '#3b82f6' }
  if (score >= 50) return { grade: 'C', color: '#f59e0b' }
  if (score >= 40) return { grade: 'D', color: '#f59e0b' }
  return { grade: 'F', color: '#ef4444' }
}

function getHeatmapLevel(hours: number): number {
  if (hours === 0) return 0
  if (hours < 0.5) return 1
  if (hours < 1.5) return 2
  if (hours < 3) return 3
  if (hours < 5) return 4
  return 5
}

// ============================================================
// Donut Chart (Pure SVG)
// ============================================================

function DonutChart({
  segments,
  size = 160,
  strokeWidth = 14,
}: {
  segments: { label: string; value: number; color: string }[]
  size?: number
  strokeWidth?: number
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * Math.max(radius, 1)
  const total = segments.reduce((sum, s) => sum + s.value, 0)

  let offset = 0
  const arcs = segments
    .filter(s => s.value > 0)
    .map(s => {
      const pct = s.value / Math.max(total, 1)
      const dashLen = pct * circumference
      const dashGap = circumference - dashLen
      const arc = {
        ...s,
        pct,
        dashLen,
        dashGap,
        dashOffset: -offset,
      }
      offset += dashLen
      return arc
    })

  return (
    <div className="pd-donut-chart">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          className="ft-ring-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        {arcs.map((arc, i) => (
          <circle
            key={i}
            fill="none"
            stroke={arc.color}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arc.dashLen} ${arc.dashGap}`}
            strokeDashoffset={arc.dashOffset}
            strokeLinecap="butt"
            style={{ transition: 'stroke-dasharray 0.8s ease, stroke-dashoffset 0.8s ease' }}
          />
        ))}
      </svg>
      <div className="pd-donut-center">
        <div className="pd-donut-center-value">{total > 0 ? formatMin(total) : '0m'}</div>
        <div className="pd-donut-center-label">total</div>
      </div>
    </div>
  )
}

// ============================================================
// Hourly Bar Chart (Pure SVG)
// ============================================================

function HourlyBarChart({ data }: { data: HourlyActivity[] }) {
  const chartWidth = 480
  const chartHeight = 140
  const padding = { top: 10, right: 10, bottom: 28, left: 10 }
  const innerW = chartWidth - padding.left - padding.right
  const innerH = chartHeight - padding.top - padding.bottom
  const maxVal = Math.max(...data.map(d => d.minutes), 1)
  const barWidth = (innerW / 24) - 2

  return (
    <div className="pd-hourly-chart">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {[0, 0.5, 1].map((pct, i) => {
          const y = padding.top + innerH * (1 - pct)
          return (
            <line
              key={i}
              x1={padding.left}
              y1={y}
              x2={chartWidth - padding.right}
              y2={y}
              stroke="var(--vl-border-subtle)"
              strokeWidth="0.5"
              strokeDasharray="3,3"
            />
          )
        })}
        {/* Bars */}
        {data.map((d, i) => {
          const x = padding.left + (i / 24) * innerW + 1
          const barH = (d.minutes / maxVal) * innerH
          const y = padding.top + innerH - barH
          const isCurrentHour = new Date().getHours() === d.hour
          return (
            <g key={i}>
              <rect
                className="pd-hourly-bar"
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barH, 1)}
                rx={2}
                fill={isCurrentHour ? '#10b981' : 'var(--vl-accent)'}
                opacity={d.minutes > 0 ? (isCurrentHour ? 1 : 0.6) : 0.15}
              />
              {d.minutes > 0 && (
                <text
                  className="pd-hourly-value"
                  x={x + barWidth / 2}
                  y={y - 3}
                  fill="var(--vl-text-muted)"
                  fontSize="8"
                >
                  {d.minutes}
                </text>
              )}
            </g>
          )
        })}
        {/* Hour labels */}
        {[0, 3, 6, 9, 12, 15, 18, 21].map(hour => {
          const x = padding.left + (hour / 24) * innerW + barWidth / 2 + 1
          return (
            <text
              key={hour}
              className="pd-hourly-label"
              x={x}
              y={chartHeight - 4}
            >
              {String(hour).padStart(2, '0')}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

// ============================================================
// Focus Score Ring (Pure SVG)
// ============================================================

function FocusScoreRing({ score }: { score: number }) {
  const size = 120
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * Math.max(radius, 1)
  const clampedScore = Math.max(0, Math.min(100, score))
  const dashOffset = circumference * (1 - clampedScore / 100)
  const { grade, color } = getScoreGrade(clampedScore)

  return (
    <div className="pd-focus-score">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          className="pd-focus-score-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <circle
          className="pd-focus-score-fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="pd-focus-score-center">
        <div className="pd-focus-score-value" style={{ color }}>{clampedScore}</div>
        <div className="pd-focus-score-label">Focus Score</div>
        <div className="pd-focus-score-grade" style={{ color }}>{grade}</div>
      </div>
    </div>
  )
}

// ============================================================
// Weekly Goal Ring (Pure SVG)
// ============================================================

function WeeklyGoalRing({ completed, target }: { completed: number; target: number }) {
  const size = 100
  const strokeWidth = 10
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * Math.max(radius, 1)
  const pct = Math.min(completed / Math.max(target, 1), 1)
  const dashOffset = circumference * (1 - pct)

  return (
    <div className="pd-weekly-goal">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          className="pd-weekly-goal-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <circle
          className="pd-weekly-goal-fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={pct >= 1 ? { stroke: '#f59e0b' } : {}}
        />
      </svg>
      <div className="pd-weekly-goal-center">
        <div className="pd-weekly-goal-value">{completed}</div>
        <div className="pd-weekly-goal-label">/ {target}</div>
      </div>
    </div>
  )
}

// ============================================================
// Productivity Dashboard — Main Component
// ============================================================

export default function ProductivityDashboard() {
  const [sessions, setSessions] = useState<FocusSession[]>([])
  const [dailyGoal, setDailyGoal] = useState(8)
  const [expandedSession, setExpandedSession] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'analytics'>('overview')
  const [mounted, setMounted] = useState(false)

  // ---- Load data ----
  useEffect(() => {
    try {
      const savedSessions = localStorage.getItem(STORAGE_SESSIONS)
      if (savedSessions) {
        setSessions(JSON.parse(savedSessions) as FocusSession[])
      }
      const savedSettings = localStorage.getItem(STORAGE_SETTINGS)
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings)
        if (parsed.dailyGoal) setDailyGoal(parsed.dailyGoal)
      }
    } catch {
      // Ignore
    }
    setMounted(true)
  }, [])

  // ---- Daily stats aggregation ----
  const dailyStats = useMemo((): DailyStats[] => {
    const statsMap = new Map<string, DailyStats>()

    for (const s of sessions) {
      if (s.status !== 'completed') continue
      const dateStr = s.completedAt.split('T')[0]
      const existing = statsMap.get(dateStr) || {
        date: dateStr,
        totalFocusMin: 0,
        sessionCount: 0,
        workMin: 0,
        breakMin: 0,
        deepWorkMin: 0,
      }
      existing.sessionCount++
      const durationMin = Math.round(s.durationSeconds / 60)
      if (s.phase === 'work') {
        existing.workMin += durationMin
        existing.totalFocusMin += durationMin
      } else if (s.phase === 'short-break' || s.phase === 'long-break') {
        existing.breakMin += durationMin
      }
      if (s.mode === 'deep-work') {
        existing.deepWorkMin += durationMin
      }
      statsMap.set(dateStr, existing)
    }

    return Array.from(statsMap.values()).sort((a, b) => a.date.localeCompare(b.date))
  }, [sessions])

  // ---- Today's stats ----
  const todayStr = getTodayStr()
  const todayStats = useMemo(() => {
    return dailyStats.find(d => d.date === todayStr) || {
      date: todayStr,
      totalFocusMin: 0,
      sessionCount: 0,
      workMin: 0,
      breakMin: 0,
      deepWorkMin: 0,
    }
  }, [dailyStats, todayStr])

  // ---- Weekly stats ----
  const weeklyStats = useMemo(() => {
    const now = new Date()
    const weekStart = new Date(now.getTime() - 6 * 86400000)
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(now)
    weekEnd.setHours(23, 59, 59, 999)

    const weekDays = dailyStats.filter(d => {
      const date = new Date(d.date + 'T12:00:00')
      return date >= weekStart && date <= weekEnd
    })

    const totalFocus = weekDays.reduce((sum, d) => sum + d.totalFocusMin, 0)
    const totalSessions = weekDays.reduce((sum, d) => sum + d.sessionCount, 0)
    const activeDays = weekDays.filter(d => d.sessionCount > 0).length
    const consistency = activeDays / 7

    return { totalFocus, totalSessions, activeDays, consistency, weekDays }
  }, [dailyStats])

  // ---- Streak ----
  const streak = useMemo(() => {
    let currentStreak = 0
    const checkDate = new Date()
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0]
      const hasSession = dailyStats.some(d => d.date === dateStr && d.sessionCount > 0)
      if (!hasSession) break
      currentStreak++
      checkDate.setDate(checkDate.getDate() - 1)
    }

    let longestStreak = 0
    let tmpStreak = 0
    for (const d of dailyStats) {
      if (d.sessionCount > 0) {
        tmpStreak++
        longestStreak = Math.max(longestStreak, tmpStreak)
      } else {
        tmpStreak = 0
      }
    }

    return { current: currentStreak, longest: longestStreak }
  }, [dailyStats])

  // ---- Average session length ----
  const avgSessionMin = useMemo(() => {
    const completed = sessions.filter(s => s.status === 'completed')
    if (completed.length === 0) return 0
    return Math.round(completed.reduce((sum, s) => sum + s.durationSeconds, 0) / completed.length / 60)
  }, [sessions])

  // ---- Focus score ----
  const focusScore = useMemo(() => {
    return calculateFocusScore(
      todayStats.totalFocusMin,
      streak.current,
      todayStats.sessionCount,
      weeklyStats.consistency
    )
  }, [todayStats, streak, weeklyStats])

  // ---- Hourly activity ----
  const hourlyActivity = useMemo((): HourlyActivity[] => {
    const hours: HourlyActivity[] = Array.from({ length: 24 }, (_, i) => ({ hour: i, minutes: 0 }))
    const todaySessionsList = sessions.filter(s => s.status === 'completed' && s.completedAt.startsWith(todayStr))
    for (const s of todaySessionsList) {
      const h = getHourFromISO(s.completedAt)
      hours[h].minutes += Math.round(s.durationSeconds / 60)
    }
    return hours
  }, [sessions, todayStr])

  // ---- Weekly heatmap data (4 weeks x 7 days) ----
  const heatmapData = useMemo(() => {
    const now = new Date()
    const weeks: { date: string; dayIdx: number; hours: number; label: string }[][] = []

    // Build 4 weeks of data
    for (let w = 3; w >= 0; w--) {
      const week: { date: string; dayIdx: number; hours: number; label: string }[] = []
      const weekStart = new Date(now.getTime() - (w * 7 + now.getDay() - 1) * 86400000)
      for (let d = 0; d < 7; d++) {
        const date = new Date(weekStart.getTime() + d * 86400000)
        const dateStr = date.toISOString().split('T')[0]
        const dayStat = dailyStats.find(ds => ds.date === dateStr)
        week.push({
          date: dateStr,
          dayIdx: d,
          hours: dayStat ? dayStat.totalFocusMin / 60 : 0,
          label: `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`,
        })
      }
      weeks.push(week)
    }
    return weeks
  }, [dailyStats])

  // ---- 30-day streak calendar ----
  const streakCalendar = useMemo(() => {
    const days: { date: string; hours: number; isToday: boolean }[] = []
    const now = new Date()
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 86400000)
      const dateStr = date.toISOString().split('T')[0]
      const dayStat = dailyStats.find(ds => ds.date === dateStr)
      days.push({
        date: dateStr,
        hours: dayStat ? dayStat.totalFocusMin / 60 : 0,
        isToday: i === 0,
      })
    }
    return days
  }, [dailyStats])

  // ---- Time distribution for donut ----
  const timeDistribution = useMemo(() => {
    const work = todayStats.workMin
    const brk = todayStats.breakMin
    const deep = todayStats.deepWorkMin
    return [
      { label: 'Focus', value: work, color: '#10b981' },
      { label: 'Break', value: brk, color: '#06b6d4' },
      { label: 'Deep Work', value: deep, color: '#8b5cf6' },
    ]
  }, [todayStats])

  // ---- Best day / best session ----
  const bestDay = useMemo(() => {
    if (dailyStats.length === 0) return null
    return dailyStats.reduce((best, d) => d.totalFocusMin > best.totalFocusMin ? d : best, dailyStats[0])
  }, [dailyStats])

  const bestSession = useMemo(() => {
    const completed = sessions.filter(s => s.status === 'completed')
    if (completed.length === 0) return null
    return completed.reduce((best, s) => s.durationSeconds > best.durationSeconds ? s : best, completed[0])
  }, [sessions])

  // ---- Weekly goal progress ----
  const weeklyGoalCompleted = useMemo(() => {
    return weeklyStats.weekDays.reduce((sum, d) => {
      return sum + dailyStats
        .filter(ds => ds.date === d.date)
        .reduce((s, ds) => s + ds.workMin, 0)
    }, 0)
  }, [weeklyStats, dailyStats])

  const weeklyPomodoroCount = useMemo(() => {
    const now = new Date()
    const weekStart = new Date(now.getTime() - 6 * 86400000)
    weekStart.setHours(0, 0, 0, 0)
    return sessions.filter(s => {
      return s.status === 'completed' && s.phase === 'work' &&
        new Date(s.completedAt) >= weekStart
    }).length
  }, [sessions])

  // ---- Export functions ----
  const exportJSON = useCallback(() => {
    const data = JSON.stringify({ sessions, exportedAt: new Date().toISOString() }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `focus-sessions-${getTodayStr()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [sessions])

  const exportCSV = useCallback(() => {
    const headers = ['id', 'mode', 'phase', 'duration_seconds', 'completed_at', 'status', 'notes', 'task']
    const rows = sessions.map(s => [
      s.id, s.mode, s.phase, s.durationSeconds, s.completedAt, s.status,
      `"${(s.notes || '').replace(/"/g, '""')}"`,
      `"${(s.associatedTask || '').replace(/"/g, '""')}"`,
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `focus-sessions-${getTodayStr()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [sessions])

  // ---- Recent sessions for timeline ----
  const recentSessions = useMemo(() => {
    return sessions
      .filter(s => s.status === 'completed')
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
      .slice(0, 30)
  }, [sessions])

  // ---- Don't render until mounted ----
  if (!mounted) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, color: 'var(--vl-text-muted)' }}>
        Loading productivity data...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--vl-space-6)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--vl-space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--vl-space-3)' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 'var(--vl-radius-lg)',
            background: 'rgba(16, 185, 129, 0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BarChart3 size={18} style={{ color: '#10b981' }} />
          </div>
          <div>
            <h3 style={{ fontSize: 'var(--vl-text-base)', fontWeight: 600, color: 'var(--vl-text-heading)' }}>
              Productivity Dashboard
            </h3>
            <p style={{ fontSize: 'var(--vl-text-xs)', color: 'var(--vl-text-muted)' }}>
              Focus analytics & session insights
            </p>
          </div>
        </div>

        {/* Tab selector */}
        <div className="ft-mode-selector">
          {([
            { id: 'overview' as const, label: 'Overview', icon: <BarChart3 size={14} /> },
            { id: 'history' as const, label: 'History', icon: <Clock size={14} /> },
            { id: 'analytics' as const, label: 'Analytics', icon: <TrendingUp size={14} /> },
          ]).map(tab => (
            <button
              key={tab.id}
              className={`ft-mode-tab ${activeTab === tab.id ? 'ft-mode-tab-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span style={{ marginLeft: 4 }}>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ===== OVERVIEW TAB ===== */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--vl-space-6)' }}>
          {/* Daily summary card */}
          <div className="pd-summary-card ft-animate-fade-in">
            <div className="pd-summary-item">
              <div className="pd-summary-icon ft-stat-icon-emerald">
                <Flame size={20} />
              </div>
              <div className="pd-summary-label">Focus Time</div>
              <div className="pd-summary-value">{formatMin(todayStats.totalFocusMin)}</div>
              <div className="pd-summary-sub">today</div>
            </div>
            <div className="pd-summary-item">
              <div className="pd-summary-icon ft-stat-icon-violet">
                <Target size={20} />
              </div>
              <div className="pd-summary-label">Sessions</div>
              <div className="pd-summary-value">{todayStats.sessionCount}</div>
              <div className="pd-summary-sub">completed</div>
            </div>
            <div className="pd-summary-item">
              <div className="pd-summary-icon ft-stat-icon-amber">
                <Trophy size={20} />
              </div>
              <div className="pd-summary-label">Streak</div>
              <div className="pd-summary-value">{streak.current}</div>
              <div className="pd-summary-sub">days</div>
            </div>
            <div className="pd-summary-item">
              <div className="pd-summary-icon ft-stat-icon-cyan">
                <Activity size={20} />
              </div>
              <div className="pd-summary-label">Avg Session</div>
              <div className="pd-summary-value">{avgSessionMin}m</div>
              <div className="pd-summary-sub">per focus</div>
            </div>
          </div>

          {/* Two columns: Focus Score + Weekly Goal */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--vl-space-4)' }}>
            {/* Focus Score */}
            <div className="pd-section ft-animate-fade-in">
              <div className="pd-section-title">
                <Star size={16} />
                Focus Score
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--vl-space-4)' }}>
                <FocusScoreRing score={focusScore} />
                <div style={{ fontSize: 'var(--vl-text-xs)', color: 'var(--vl-text-muted)', textAlign: 'center', maxWidth: 200 }}>
                  Based on focus time, consistency, streak, and session count
                </div>
              </div>
            </div>

            {/* Weekly Goal */}
            <div className="pd-section ft-animate-fade-in">
              <div className="pd-section-title">
                <Target size={16} />
                Weekly Goal
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--vl-space-6)' }}>
                <WeeklyGoalRing completed={weeklyPomodoroCount} target={dailyGoal * 7} />
                <div>
                  <div style={{ fontSize: 'var(--vl-text-sm)', fontWeight: 600, color: 'var(--vl-text-heading)' }}>
                    {weeklyPomodoroCount} pomodoros
                  </div>
                  <div style={{ fontSize: 'var(--vl-text-xs)', color: 'var(--vl-text-muted)', marginTop: 4 }}>
                    Target: {dailyGoal} per day ({dailyGoal * 7}/week)
                  </div>
                  <div style={{ fontSize: 'var(--vl-text-xs)', color: 'var(--vl-text-muted)', marginTop: 2 }}>
                    Avg: {weeklyPomodoroCount > 0 ? Math.round(weeklyPomodoroCount / weeklyStats.activeDays) : 0} per active day
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Heatmap */}
          <div className="pd-section ft-animate-fade-in">
            <div className="pd-section-title">
              <Sun size={16} />
              Weekly Heatmap
            </div>
            <div className="pd-heatmap">
              {/* Header row */}
              <div />
              {DAY_NAMES.map(day => (
                <div key={day} className="pd-heatmap-header">{day}</div>
              ))}
              {/* Data rows */}
              {heatmapData.map((week, wi) => (
                <React.Fragment key={wi}>
                  <div className="pd-heatmap-label">
                    W{4 - wi}
                  </div>
                  {week.map((cell, di) => (
                    <div
                      key={di}
                      className={`pd-heatmap-cell pd-heatmap-level-${getHeatmapLevel(cell.hours)}`}
                    >
                      <div className="pd-heatmap-tooltip">
                        {cell.label}: {cell.hours.toFixed(1)}h
                      </div>
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
            <div className="pd-heatmap-legend">
              <span className="pd-heatmap-legend-label">Less</span>
              {[0, 1, 2, 3, 4, 5].map(level => (
                <div
                  key={level}
                  className={`pd-heatmap-legend-cell pd-heatmap-level-${level}`}
                />
              ))}
              <span className="pd-heatmap-legend-label">More</span>
            </div>
          </div>

          {/* Hourly Activity */}
          <div className="pd-section ft-animate-fade-in">
            <div className="pd-section-title">
              <Clock size={16} />
              Hourly Activity (Today)
            </div>
            <HourlyBarChart data={hourlyActivity} />
          </div>

          {/* Highlights */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--vl-space-4)' }}>
            {/* Best Day */}
            <div className="pd-highlight-card ft-animate-fade-in">
              <div className="pd-highlight-icon pd-highlight-icon-gold">
                <Award size={22} />
              </div>
              <div>
                <div className="pd-highlight-label">Best Day</div>
                <div className="pd-highlight-value">
                  {bestDay ? formatMin(bestDay.totalFocusMin) : '—'}
                </div>
                <div className="pd-highlight-sub">
                  {bestDay ? new Date(bestDay.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'No data yet'}
                </div>
              </div>
            </div>

            {/* Best Session */}
            <div className="pd-highlight-card ft-animate-fade-in">
              <div className="pd-highlight-icon pd-highlight-icon-emerald">
                <Zap size={22} />
              </div>
              <div>
                <div className="pd-highlight-label">Longest Session</div>
                <div className="pd-highlight-value">
                  {bestSession ? formatMin(Math.round(bestSession.durationSeconds / 60)) : '—'}
                </div>
                <div className="pd-highlight-sub">
                  {bestSession ? bestSession.associatedTask || bestSession.mode : 'No data yet'}
                </div>
              </div>
            </div>

            {/* Longest Streak */}
            <div className="pd-highlight-card ft-animate-fade-in">
              <div className="pd-highlight-icon pd-highlight-icon-violet">
                <Flame size={22} />
              </div>
              <div>
                <div className="pd-highlight-label">Longest Streak</div>
                <div className="pd-highlight-value">{streak.longest} days</div>
                <div className="pd-highlight-sub">
                  Current: {streak.current} days
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== HISTORY TAB ===== */}
      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--vl-space-4)' }}>
          {/* Export buttons */}
          <div style={{ display: 'flex', gap: 'var(--vl-space-3)', justifyContent: 'flex-end' }}>
            <button className="pd-export-btn" onClick={exportJSON}>
              <Download size={14} />
              Export JSON
            </button>
            <button className="pd-export-btn" onClick={exportCSV}>
              <Download size={14} />
              Export CSV
            </button>
          </div>

          {/* Session Timeline */}
          <div className="pd-section">
            <div className="pd-section-title">
              <Clock size={16} />
              Session History
              <span style={{ fontSize: 'var(--vl-text-xs)', color: 'var(--vl-text-muted)', fontWeight: 400, marginLeft: 'auto' }}>
                {recentSessions.length} sessions
              </span>
            </div>
            {recentSessions.length === 0 ? (
              <div className="ft-session-empty">
                <div className="ft-session-empty-icon">
                  <CalendarDays size={24} />
                </div>
                <div className="ft-session-empty-title">No sessions recorded</div>
                <div className="ft-session-empty-desc">Complete a focus session to see it here.</div>
              </div>
            ) : (
              <div className="pd-timeline">
                {recentSessions.map((session, idx) => (
                  <div
                    key={session.id}
                    className="pd-timeline-item"
                    style={{ animationDelay: `${idx * 40}ms`, opacity: 0 }}
                  >
                    <div className={`pd-timeline-dot ${session.phase === 'work' ? 'pd-timeline-dot-work' : session.phase === 'deep-work' ? 'pd-timeline-dot-deep-work' : session.phase === 'short-break' ? 'pd-timeline-dot-short-break' : 'pd-timeline-dot-long-break'}`} />
                    <div className="pd-timeline-content">
                      <div className="pd-timeline-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--vl-space-2)' }}>
                          <span className={`ft-session-type-badge ${getBadgeClassFromPhase(session.mode, session.phase)}`}>
                            {session.mode}
                          </span>
                          <span className="pd-timeline-type">
                            {session.associatedTask || 'Untitled'}
                          </span>
                        </div>
                        <span className="pd-timeline-time">
                          {new Date(session.completedAt).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric',
                          })}
                          {' '}
                          {new Date(session.completedAt).toLocaleTimeString([], {
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="pd-timeline-duration">
                        <Clock size={10} style={{ display: 'inline', marginRight: 2, verticalAlign: 'middle' }} />
                        {formatMin(Math.round(session.durationSeconds / 60))}
                        {session.status === 'completed'
                          ? <CheckCircle2 size={10} style={{ display: 'inline', marginLeft: 6, color: '#10b981', verticalAlign: 'middle' }} />
                          : <Circle size={10} style={{ display: 'inline', marginLeft: 6, color: '#ef4444', verticalAlign: 'middle' }} />
                        }
                      </div>
                      {session.notes && (
                        <div>
                          <button
                            className="pd-timeline-notes-toggle"
                            onClick={() => setExpandedSession(
                              expandedSession === session.id ? null : session.id
                            )}
                          >
                            {expandedSession === session.id ? (
                              <><ChevronUp size={10} style={{ display: 'inline', marginRight: 2, verticalAlign: 'middle' }} /> Hide notes</>
                            ) : (
                              <><ChevronDown size={10} style={{ display: 'inline', marginRight: 2, verticalAlign: 'middle' }} /> Show notes</>
                            )}
                          </button>
                          {expandedSession === session.id && (
                            <div className="pd-timeline-notes">{session.notes}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== ANALYTICS TAB ===== */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--vl-space-6)' }}>
          {/* Weekly overview row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--vl-space-3)' }}>
            <div className="ft-stat-card ft-animate-fade-in">
              <div className="ft-stat-icon ft-stat-icon-emerald"><Flame size={18} /></div>
              <div>
                <div className="ft-stat-label">Weekly Focus</div>
                <div className="ft-stat-value">{formatMin(weeklyStats.totalFocus)}</div>
                <div className="ft-stat-sub">{weeklyStats.totalSessions} sessions</div>
              </div>
            </div>
            <div className="ft-stat-card ft-animate-fade-in">
              <div className="ft-stat-icon ft-stat-icon-violet"><CalendarDays size={18} /></div>
              <div>
                <div className="ft-stat-label">Active Days</div>
                <div className="ft-stat-value">{weeklyStats.activeDays}/7</div>
                <div className="ft-stat-sub">{Math.round(weeklyStats.consistency * 100)}% consistency</div>
              </div>
            </div>
            <div className="ft-stat-card ft-animate-fade-in">
              <div className="ft-stat-icon ft-stat-icon-amber"><Brain size={18} /></div>
              <div>
                <div className="ft-stat-label">Deep Work</div>
                <div className="ft-stat-value">{formatMin(todayStats.deepWorkMin)}</div>
                <div className="ft-stat-sub">today</div>
              </div>
            </div>
            <div className="ft-stat-card ft-animate-fade-in">
              <div className="ft-stat-icon ft-stat-icon-cyan"><TrendingUp size={18} /></div>
              <div>
                <div className="ft-stat-label">Focus Score</div>
                <div className="ft-stat-value">{focusScore}</div>
                <div className="ft-stat-sub">{getScoreGrade(focusScore).grade}</div>
              </div>
            </div>
          </div>

          {/* Time distribution + Streak calendar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--vl-space-4)' }}>
            {/* Donut chart */}
            <div className="pd-section ft-animate-fade-in">
              <div className="pd-section-title">
                <Timer size={16} />
                Time Distribution (Today)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--vl-space-6)', flexWrap: 'wrap', justifyContent: 'center' }}>
                <DonutChart segments={timeDistribution} />
                <div className="pd-donut-legend">
                  {timeDistribution.filter(s => s.value > 0).map(s => (
                    <div key={s.label} className="pd-donut-legend-item">
                      <div className="pd-donut-legend-dot" style={{ background: s.color }} />
                      <span>{s.label}</span>
                      <span className="pd-donut-legend-value">{formatMin(s.value)}</span>
                    </div>
                  ))}
                  {timeDistribution.every(s => s.value === 0) && (
                    <div style={{ fontSize: 'var(--vl-text-xs)', color: 'var(--vl-text-muted)', textAlign: 'center', padding: 'var(--vl-space-4)' }}>
                      No focus data today
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 30-day streak calendar */}
            <div className="pd-section ft-animate-fade-in">
              <div className="pd-section-title">
                <Moon size={16} />
                30-Day Activity
              </div>
              <div className="pd-streak-calendar">
                {streakCalendar.map((day, i) => (
                  <div
                    key={i}
                    className={`pd-streak-cell pd-heatmap-level-${getHeatmapLevel(day.hours)} ${day.isToday ? 'pd-streak-cell-today' : ''}`}
                    title={`${day.date}: ${day.hours.toFixed(1)}h focused`}
                  />
                ))}
              </div>
              <div className="pd-heatmap-legend" style={{ marginTop: 'var(--vl-space-3)' }}>
                <span className="pd-heatmap-legend-label">Less</span>
                {[0, 1, 2, 3, 4, 5].map(level => (
                  <div
                    key={level}
                    className={`pd-heatmap-legend-cell pd-heatmap-level-${level}`}
                  />
                ))}
                <span className="pd-heatmap-legend-label">More</span>
              </div>
            </div>
          </div>

          {/* Daily breakdown table */}
          <div className="pd-section ft-animate-fade-in">
            <div className="pd-section-title">
              <Activity size={16} />
              Daily Breakdown (Last 14 days)
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="exp-sort-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Sessions</th>
                    <th>Focus</th>
                    <th>Break</th>
                    <th>Deep Work</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyStats.slice(-14).reverse().map(day => (
                    <tr key={day.date}>
                      <td style={{ fontWeight: 500, color: 'var(--vl-text-heading)' }}>
                        {new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', {
                          weekday: 'short', month: 'short', day: 'numeric',
                        })}
                      </td>
                      <td>{day.sessionCount}</td>
                      <td style={{ color: '#10b981' }}>{formatMin(day.workMin)}</td>
                      <td style={{ color: '#06b6d4' }}>{formatMin(day.breakMin)}</td>
                      <td style={{ color: '#8b5cf6' }}>{formatMin(day.deepWorkMin)}</td>
                      <td style={{ fontWeight: 600 }}>{formatMin(day.totalFocusMin + day.breakMin)}</td>
                    </tr>
                  ))}
                  {dailyStats.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--vl-space-6)', color: 'var(--vl-text-muted)' }}>
                        No data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Export */}
          <div style={{ display: 'flex', gap: 'var(--vl-space-3)', justifyContent: 'center' }}>
            <button className="pd-export-btn" onClick={exportJSON}>
              <Download size={14} />
              Export JSON
            </button>
            <button className="pd-export-btn" onClick={exportCSV}>
              <Download size={14} />
              Export CSV
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper for badge class
function getBadgeClassFromPhase(mode: string, phase: string): string {
  if (mode === 'deep-work') return 'ft-session-type-badge-deep-work'
  if (mode === 'countdown') return 'ft-session-type-badge-countdown'
  if (mode === 'stopwatch') return 'ft-session-type-badge-stopwatch'
  if (phase === 'work') return 'ft-session-type-badge-work'
  if (phase === 'short-break') return 'ft-session-type-badge-short-break'
  return 'ft-session-type-badge-long-break'
}
