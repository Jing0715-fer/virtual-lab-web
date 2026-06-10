'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, Calendar, Clock, Users, UserPlus,
  CheckCircle2, Play, Minus, Expand,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { Agent, Meeting } from './shared-types'

// ============================================================
// Types
// ============================================================

interface CalendarEvent {
  date: string // YYYY-MM-DD
  type: 'meeting_completed' | 'meeting_created' | 'agent_added'
  label: string
  meeting?: Meeting
}

interface UpcomingEvent {
  date: string
  label: string
  type: CalendarEvent['type']
  time?: string
}

// ============================================================
// Constants
// ============================================================

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const EVENT_DOT_COLORS: Record<CalendarEvent['type'], string> = {
  meeting_completed: '#10b981',
  meeting_created: '#f59e0b',
  agent_added: '#06b6d4',
}

// ============================================================
// Helpers
// ============================================================

function toDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

function buildCalendarEvents(meetings: Meeting[], agents: Agent[]): CalendarEvent[] {
  const events: CalendarEvent[] = []

  for (const meeting of meetings) {
    if (meeting.createdAt) {
      const date = toDateString(new Date(meeting.createdAt))
      events.push({
        date,
        type: meeting.status === 'completed' ? 'meeting_completed' : 'meeting_created',
        label: meeting.saveName || 'Meeting',
        meeting,
      })
    }
  }

  for (const agent of agents) {
    if (agent.createdAt) {
      const date = toDateString(new Date(agent.createdAt))
      events.push({
        date,
        type: 'agent_added',
        label: `${agent.title} joined`,
      })
    }
  }

  return events
}

// ============================================================
// Sub-components
// ============================================================

function EventDot({ type }: { type: CalendarEvent['type'] }) {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
      style={{ backgroundColor: EVENT_DOT_COLORS[type] }}
      title={type.replace(/_/g, ' ')}
    />
  )
}

function UpcomingEventsList({ events, lang }: { events: UpcomingEvent[]; lang: Lang }) {
  if (events.length === 0) return null

  return (
    <div className="mt-3 pt-3 border-t border-[var(--vl-border-subtle)]">
      <div className="flex items-center gap-1.5 mb-2">
        <Clock className="size-3 vl-text-muted" />
        <span className="text-[10px] font-semibold vl-text-muted uppercase tracking-wider">
          Upcoming
        </span>
      </div>
      <div className="space-y-1.5">
        {events.slice(0, 3).map((event, idx) => (
          <motion.div
            key={`${event.date}-${idx}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.06, duration: 0.2 }}
            className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-[var(--vl-bg-inner)] transition-colors"
          >
            <EventDot type={event.type} />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium vl-text-heading truncate">{event.label}</p>
              <p className="text-[9px] vl-text-muted">{event.date}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function EmptyCalendarState({ lang }: { lang: Lang }) {
  return (
    <div className="flex flex-col items-center justify-center py-6">
      <Calendar className="size-8 vl-text-muted mb-2" style={{ opacity: 0.4 }} />
      <p className="text-[10px] vl-text-muted">
        {lang === 'zh' ? '暂无日历事件' : 'No calendar events'}
      </p>
    </div>
  )
}

// ============================================================
// Main Component
// ============================================================

export function WidgetMiniCalendar({
  lang = 'en',
  agents = [],
  meetings = [],
  onDateSelect,
}: {
  lang?: Lang
  agents?: Agent[]
  meetings?: Meeting[]
  onDateSelect?: (date: string) => void
}) {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isFullMode, setIsFullMode] = useState(false)

  const events = useMemo(() => buildCalendarEvents(meetings, agents), [meetings, agents])

  // Build event map: date -> events
  const eventMap = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    for (const evt of events) {
      if (!map[evt.date]) map[evt.date] = []
      map[evt.date].push(evt)
    }
    return map
  }, [events])

  // Upcoming events (sorted)
  const upcomingEvents = useMemo((): UpcomingEvent[] => {
    const todayStr = toDateString(today)
    return events
      .filter(e => e.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 3)
      .map(e => ({
        date: e.date,
        label: e.label,
        type: e.type,
        time: e.meeting?.createdAt,
      }))
  }, [events])

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)
  const todayStr = toDateString(today)

  // Calendar cells
  const calendarCells = useMemo(() => {
    const cells: (number | null)[] = []
    for (let i = 0; i < firstDay; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    return cells
  }, [daysInMonth, firstDay])

  // Navigation
  const handlePrevMonth = useCallback(() => {
    setCurrentMonth(prev => {
      if (prev === 0) {
        setCurrentYear(y => y - 1)
        return 11
      }
      return prev - 1
    })
  }, [])

  const handleNextMonth = useCallback(() => {
    setCurrentMonth(prev => {
      if (prev === 11) {
        setCurrentYear(y => y + 1)
        return 0
      }
      return prev + 1
    })
  }, [])

  // Date click
  const handleDateClick = useCallback((day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    setSelectedDate(prev => prev === dateStr ? null : dateStr)
    onDateSelect?.(dateStr)
  }, [currentYear, currentMonth, onDateSelect])

  const toggleMode = useCallback(() => {
    setIsFullMode(prev => !prev)
  }, [])

  return (
    <div className="flex flex-col gap-0">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={handlePrevMonth}
          className="w-6 h-6 rounded-md hover:bg-[var(--vl-bg-inner)] flex items-center justify-center transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="size-3.5 vl-text-muted" />
        </button>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold vl-text-heading">
            {MONTH_LABELS[currentMonth]}
          </span>
          <span className="text-xs vl-text-muted">
            {currentYear}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleNextMonth}
            className="w-6 h-6 rounded-md hover:bg-[var(--vl-bg-inner)] flex items-center justify-center transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="size-3.5 vl-text-muted" />
          </button>
          <button
            onClick={toggleMode}
            className="w-6 h-6 rounded-md hover:bg-[var(--vl-bg-inner)] flex items-center justify-center transition-colors"
            aria-label="Toggle mode"
            title={isFullMode ? 'Compact mode' : 'Full mode'}
          >
            <Expand className="size-3 vl-text-muted" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {WEEKDAY_LABELS.map(day => (
          <div
            key={day}
            className="text-[9px] font-medium vl-text-muted text-center py-0.5"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        <AnimatePresence mode="popLayout">
          {calendarCells.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="aspect-square" />
            }

            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const isToday = dateStr === todayStr
            const isSelected = dateStr === selectedDate
            const dayEvents = eventMap[dateStr]

            return (
              <motion.button
                key={dateStr}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.15, delay: idx * 0.005 }}
                onClick={() => handleDateClick(day)}
                className={`aspect-square rounded-md flex flex-col items-center justify-center gap-0.5 transition-all duration-200 relative ${
                  isToday
                    ? 'ring-2 ring-emerald-400/50 bg-emerald-400/10'
                    : isSelected
                    ? 'bg-emerald-500/15'
                    : 'hover:bg-[var(--vl-bg-inner)]'
                }`}
                aria-label={`Date ${day}`}
              >
                <span
                  className={`text-[10px] leading-none font-medium ${
                    isToday
                      ? 'text-emerald-500 font-bold'
                      : isSelected
                      ? 'vl-text-heading'
                      : 'vl-text-body'
                  }`}
                >
                  {day}
                </span>
                {/* Event dots */}
                {dayEvents && dayEvents.length > 0 && (
                  <div className="flex items-center gap-0.5 absolute bottom-0.5">
                    {dayEvents.slice(0, 3).map((evt, eIdx) => (
                      <EventDot key={eIdx} type={evt.type} />
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[7px] vl-text-muted leading-none">+{dayEvents.length - 3}</span>
                    )}
                  </div>
                )}
              </motion.button>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-2 mb-1">
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#10b981' }} />
          <span className="text-[8px] vl-text-muted">{lang === 'zh' ? '完成' : 'Done'}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#f59e0b' }} />
          <span className="text-[8px] vl-text-muted">{lang === 'zh' ? '创建' : 'Created'}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#06b6d4' }} />
          <span className="text-[8px] vl-text-muted">{lang === 'zh' ? '智能体' : 'Agent'}</span>
        </div>
      </div>

      {/* Upcoming events (full mode only, or always on desktop) */}
      {(isFullMode || typeof window !== 'undefined') && (
        <AnimatePresence>
          {isFullMode && upcomingEvents.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <UpcomingEventsList events={upcomingEvents} lang={lang} />
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  )
}
