'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar, Clock, Users, User, AlertTriangle,
  CheckCircle2, Repeat, Zap, ChevronLeft, ChevronRight,
  Timer, Globe, Sparkles, X, Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import type { Agent, Meeting } from './shared-components'

// ============================================================
// Types
// ============================================================

interface ScheduledMeeting {
  type: 'team' | 'individual'
  agenda: string
  scheduledStart: string // ISO date string
  duration: number // minutes
  recurring?: string // 'daily' | 'weekly' | 'bi-weekly'
  teamLeadId?: string
  teamMemberIds?: string[]
  teamMemberId?: string
}

interface Props {
  agents: Agent[]
  existingMeetings: Meeting[]
  onSchedule: (meeting: ScheduledMeeting) => void
}

interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  hasMeetings: boolean
  meetingCount: number
  isWeekend: boolean
}

interface TimeSlot {
  hour: number
  minute: number
  label: string
  isAvailable: boolean
  conflictingAgents: string[]
}

// ============================================================
// Constants
// ============================================================

const DURATION_OPTIONS = [
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
]

const QUICK_SCHEDULE_OPTIONS = [
  { label: 'Tomorrow 9 AM', getStart: () => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(9, 0, 0, 0)
    return d
  }},
  { label: 'Tomorrow 2 PM', getStart: () => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(14, 0, 0, 0)
    return d
  }},
  { label: 'Next Monday 10 AM', getStart: () => {
    const d = new Date()
    const dayOfWeek = d.getDay()
    const daysUntilMon = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
    d.setDate(d.getDate() + daysUntilMon)
    d.setHours(10, 0, 0, 0)
    return d
  }},
  { label: 'Next Monday 2 PM', getStart: () => {
    const d = new Date()
    const dayOfWeek = d.getDay()
    const daysUntilMon = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
    d.setDate(d.getDate() + daysUntilMon)
    d.setHours(14, 0, 0, 0)
    return d
  }},
]

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// ============================================================
// Helpers
// ============================================================

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatTime(hour: number, minute: number): string {
  const h = hour % 12 || 12
  const ampm = hour < 12 ? 'AM' : 'PM'
  return `${h}:${minute.toString().padStart(2, '0')} ${ampm}`
}

function formatDateFull(d: Date): string {
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function checkAgentConflicts(
  selectedDate: Date,
  selectedHour: number,
  durationMinutes: number,
  existingMeetings: Meeting[],
  selectedAgentIds: string[],
  agents: Agent[]
): { conflictingAgents: string[]; conflictMeetings: Meeting[] } {
  const startTime = selectedDate.getTime() + selectedHour * 3600000
  const endTime = startTime + durationMinutes * 60000
  const conflictingAgents: string[] = []
  const conflictMeetings: Meeting[] = []

  // Check each existing meeting for time overlap with selected agents
  existingMeetings.forEach(meeting => {
    const meetingStart = new Date(meeting.createdAt).getTime()
    const meetingDuration = meeting.messages && meeting.messages.length > 2
      ? (new Date(meeting.messages[meeting.messages.length - 1].createdAt).getTime() - meetingStart)
      : 60 * 60000 // default 1 hour
    const meetingEnd = meetingStart + Math.max(meetingDuration, 30 * 60000)

    // Check overlap
    if (startTime < meetingEnd && endTime > meetingStart) {
      // Check if any selected agent is in this meeting
      const meetingAgentIds: string[] = []
      if (meeting.type === 'team') {
        if (meeting.teamLeadId) meetingAgentIds.push(meeting.teamLeadId)
        meeting.teamMembers?.forEach(m => meetingAgentIds.push(m.id))
      } else if (meeting.teamMemberId) {
        meetingAgentIds.push(meeting.teamMemberId)
      }

      const hasOverlap = meetingAgentIds.some(id => selectedAgentIds.includes(id))
      if (hasOverlap) {
        conflictMeetings.push(meeting)
        agents.forEach(a => {
          if (meetingAgentIds.includes(a.id) && selectedAgentIds.includes(a.id) && !conflictingAgents.includes(a.title)) {
            conflictingAgents.push(a.title)
          }
        })
      }
    }
  })

  return { conflictingAgents, conflictMeetings }
}

// ============================================================
// Component
// ============================================================

export default function MeetingScheduler({ agents, existingMeetings, onSchedule }: Props) {
  const [meetingType, setMeetingType] = useState<'team' | 'individual'>('team')
  const [agenda, setAgenda] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedHour, setSelectedHour] = useState<number>(9)
  const [selectedMinute, setSelectedMinute] = useState<number>(0)
  const [duration, setDuration] = useState<number>(60)
  const [customDuration, setCustomDuration] = useState<number | null>(null)
  const [recurring, setRecurring] = useState<string>('none')
  const [teamLeadId, setTeamLeadId] = useState<string>('')
  const [teamMemberIds, setTeamMemberIds] = useState<string[]>([])
  const [individualMemberId, setIndividualMemberId] = useState<string>('')
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth())
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear())
  const [showSummary, setShowSummary] = useState(false)
  const [activeTab, setActiveTab] = useState<'calendar' | 'quick'>('quick')

  // Timezone display
  const timezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone
    } catch {
      return 'UTC'
    }
  }, [])

  // Generate calendar days
  const calendarDays = useMemo((): CalendarDay[][] => {
    const weeks: CalendarDay[][] = []
    const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth)
    const daysInMonth = getDaysInMonth(calendarYear, calendarMonth)
    const daysInPrevMonth = getDaysInMonth(calendarYear, calendarMonth - 1)
    const today = new Date()

    // Count meetings per day
    const meetingDayCounts: Record<string, number> = {}
    existingMeetings.forEach(m => {
      const d = new Date(m.createdAt)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      meetingDayCounts[key] = (meetingDayCounts[key] || 0) + 1
    })

    let day: CalendarDay[] = []

    // Previous month fill
    for (let i = firstDay - 1; i >= 0; i--) {
      const date = new Date(calendarYear, calendarMonth - 1, daysInPrevMonth - i)
      day.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        hasMeetings: false,
        meetingCount: 0,
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
      })
    }

    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(calendarYear, calendarMonth, i)
      const key = `${calendarYear}-${calendarMonth}-${i}`
      day.push({
        date,
        isCurrentMonth: true,
        isToday: isSameDay(date, today),
        hasMeetings: (meetingDayCounts[key] || 0) > 0,
        meetingCount: meetingDayCounts[key] || 0,
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
      })
    }

    // Next month fill
    const remaining = 42 - day.length
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(calendarYear, calendarMonth + 1, i)
      day.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        hasMeetings: false,
        meetingCount: 0,
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
      })
    }

    // Split into weeks
    for (let i = 0; i < day.length; i += 7) {
      weeks.push(day.slice(i, i + 7))
    }
    return weeks
  }, [calendarYear, calendarMonth, existingMeetings])

  // Time slots for the selected date
  const timeSlots = useMemo((): TimeSlot[] => {
    const slots: TimeSlot[] = []
    for (let h = 6; h <= 22; h++) {
      for (const m of [0, 30]) {
        const selectedAgentIds = meetingType === 'team'
          ? [teamLeadId, ...teamMemberIds].filter(Boolean)
          : individualMemberId ? [individualMemberId] : []
        const { conflictingAgents } = checkAgentConflicts(
          selectedDate || new Date(),
          h,
          duration,
          existingMeetings,
          selectedAgentIds,
          agents
        )
        slots.push({
          hour: h,
          minute: m,
          label: formatTime(h, m),
          isAvailable: conflictingAgents.length === 0,
          conflictingAgents,
        })
      }
    }
    return slots
  }, [selectedDate, duration, existingMeetings, agents, teamLeadId, teamMemberIds, individualMemberId, meetingType])

  // Agent availability check
  const conflictInfo = useMemo(() => {
    if (!selectedDate) return { conflictingAgents: [] as string[], conflictMeetings: [] as Meeting[] }
    const selectedAgentIds = meetingType === 'team'
      ? [teamLeadId, ...teamMemberIds].filter(Boolean)
      : individualMemberId ? [individualMemberId] : []
    return checkAgentConflicts(selectedDate, selectedHour, customDuration || duration, existingMeetings, selectedAgentIds, agents)
  }, [selectedDate, selectedHour, duration, customDuration, existingMeetings, agents, teamLeadId, teamMemberIds, individualMemberId, meetingType])

  // Handle schedule submit
  const handleSchedule = useCallback(() => {
    if (!selectedDate || !agenda.trim()) return

    const scheduledDate = new Date(selectedDate)
    scheduledDate.setHours(selectedHour, selectedMinute, 0, 0)

    const scheduledMeeting: ScheduledMeeting = {
      type: meetingType,
      agenda: agenda.trim(),
      scheduledStart: scheduledDate.toISOString(),
      duration: customDuration || duration,
      recurring: recurring !== 'none' ? recurring : undefined,
    }

    if (meetingType === 'team') {
      scheduledMeeting.teamLeadId = teamLeadId
      scheduledMeeting.teamMemberIds = teamMemberIds
    } else {
      scheduledMeeting.teamMemberId = individualMemberId
    }

    onSchedule(scheduledMeeting)
  }, [meetingType, agenda, selectedDate, selectedHour, selectedMinute, customDuration, duration, recurring, teamLeadId, teamMemberIds, individualMemberId, onSchedule])

  // Selected agents for availability view
  const selectedAgentIds = useMemo(() => {
    if (meetingType === 'team') {
      return [teamLeadId, ...teamMemberIds].filter(Boolean)
    }
    return individualMemberId ? [individualMemberId] : []
  }, [meetingType, teamLeadId, teamMemberIds, individualMemberId])

  const selectedAgents = useMemo(() => {
    return agents.filter(a => selectedAgentIds.includes(a.id))
  }, [agents, selectedAgentIds])

  const canSubmit = selectedDate && agenda.trim() &&
    (meetingType === 'team' ? !!teamLeadId : !!individualMemberId)

  const isCustomDuration = duration === 180 && customDuration !== null

  return (
    <TooltipProvider delayDuration={200}>
      <div className="w-full space-y-4">
        {/* Meeting type selector */}
        <Card className="vl-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium vl-text-heading shrink-0">Meeting Type</Label>
              <RadioGroup
                value={meetingType}
                onValueChange={(v) => setMeetingType(v as 'team' | 'individual')}
                className="flex gap-3"
              >
                <Label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="team" />
                  <Users className="size-3.5 text-emerald-500" />
                  <span className="text-sm vl-text-body">Team</span>
                </Label>
                <Label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="individual" />
                  <User className="size-3.5 text-cyan-500" />
                  <span className="text-sm vl-text-body">Individual</span>
                </Label>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        {/* Agent selection */}
        <Card className="vl-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium vl-text-heading">
              {meetingType === 'team' ? 'Select Team Lead & Members' : 'Select Agent'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3">
            {meetingType === 'team' && (
              <div className="space-y-2">
                <Label className="text-xs vl-text-muted">Team Lead</Label>
                <Select value={teamLeadId} onValueChange={setTeamLeadId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a team lead..." />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: a.color }} />
                          <span>{a.title}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {meetingType === 'team' && (
              <div className="space-y-2">
                <Label className="text-xs vl-text-muted">Team Members</Label>
                <div className="flex flex-wrap gap-2">
                  {agents
                    .filter(a => a.id !== teamLeadId)
                    .map(a => (
                      <Button
                        key={a.id}
                        variant={teamMemberIds.includes(a.id) ? 'default' : 'outline'}
                        size="sm"
                        className={`text-xs h-8 gap-1.5 ${
                          teamMemberIds.includes(a.id)
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                            : ''
                        }`}
                        onClick={() => {
                          setTeamMemberIds(prev =>
                            prev.includes(a.id) ? prev.filter(id => id !== a.id) : [...prev, a.id]
                          )
                        }}
                      >
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: a.color }} />
                        {a.title}
                        {teamMemberIds.includes(a.id) && <CheckCircle2 className="size-3" />}
                      </Button>
                    ))}
                </div>
              </div>
            )}

            {meetingType === 'individual' && (
              <div className="space-y-2">
                <Label className="text-xs vl-text-muted">Agent</Label>
                <Select value={individualMemberId} onValueChange={setIndividualMemberId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose an agent..." />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: a.color }} />
                          <span>{a.title}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Agent availability indicator */}
            {selectedAgents.length > 0 && (
              <div className="flex items-center gap-2 pt-1">
                {conflictInfo.conflictingAgents.length === 0 ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                    <CheckCircle2 className="size-3 mr-1" />
                    All agents available
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px]">
                    <AlertTriangle className="size-3 mr-1" />
                    Conflict with: {conflictInfo.conflictingAgents.join(', ')}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Schedule + Calendar Tabs */}
        <Card className="vl-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Button
                variant={activeTab === 'quick' ? 'default' : 'ghost'}
                size="sm"
                className={`text-xs gap-1.5 ${activeTab === 'quick' ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25' : ''}`}
                onClick={() => setActiveTab('quick')}
              >
                <Zap className="size-3" />
                Quick Schedule
              </Button>
              <Button
                variant={activeTab === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                className={`text-xs gap-1.5 ${activeTab === 'calendar' ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25' : ''}`}
                onClick={() => setActiveTab('calendar')}
              >
                <Calendar className="size-3" />
                Calendar Pick
              </Button>

              {/* Timezone badge */}
              <Badge variant="outline" className="ml-auto text-[9px] bg-[var(--vl-bg-secondary)]">
                <Globe className="size-3 mr-1" />
                {timezone}
              </Badge>
            </div>

            {/* Quick Schedule */}
            <AnimatePresence mode="wait">
              {activeTab === 'quick' && (
                <motion.div
                  key="quick"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                  className="grid grid-cols-2 gap-2"
                >
                  {QUICK_SCHEDULE_OPTIONS.map((opt) => {
                    const d = opt.getStart()
                    const isSelected = selectedDate && isSameDay(selectedDate, d) && selectedHour === d.getHours()
                    return (
                      <Button
                        key={opt.label}
                        variant={isSelected ? 'default' : 'outline'}
                        className={`text-xs h-auto py-2.5 px-3 flex-col items-start gap-1 ${
                          isSelected
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/25'
                            : ''
                        }`}
                        onClick={() => {
                          setSelectedDate(d)
                          setSelectedHour(d.getHours())
                          setSelectedMinute(0)
                        }}
                      >
                        <span className="font-medium">{opt.label}</span>
                        <span className="text-[9px] opacity-60">{formatDateFull(d)}</span>
                      </Button>
                    )
                  })}
                </motion.div>
              )}

              {activeTab === 'calendar' && (
                <motion.div
                  key="calendar"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.15 }}
                >
                  {/* Calendar navigation */}
                  <div className="flex items-center justify-between mb-3">
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => {
                      if (calendarMonth === 0) {
                        setCalendarMonth(11)
                        setCalendarYear(y => y - 1)
                      } else {
                        setCalendarMonth(m => m - 1)
                      }
                    }}>
                      <ChevronLeft className="size-4" />
                    </Button>
                    <span className="text-sm font-medium vl-text-heading">
                      {MONTH_NAMES[calendarMonth]} {calendarYear}
                    </span>
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => {
                      if (calendarMonth === 11) {
                        setCalendarMonth(0)
                        setCalendarYear(y => y + 1)
                      } else {
                        setCalendarMonth(m => m + 1)
                      }
                    }}>
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>

                  {/* Calendar grid */}
                  <div className="border border-[var(--vl-border)] rounded-lg overflow-hidden">
                    {/* Weekday headers */}
                    <div className="grid grid-cols-7 bg-[var(--vl-bg-secondary)]">
                      {WEEKDAY_NAMES.map((d, i) => (
                        <div
                          key={i}
                          className={`text-center py-1.5 text-[10px] font-medium ${
                            i === 0 || i === 6 ? 'text-red-400' : 'vl-text-muted'
                          }`}
                        >
                          {d}
                        </div>
                      ))}
                    </div>

                    {/* Day cells */}
                    <div className="divide-y divide-[var(--vl-border)]">
                      {calendarDays.map((week, wi) => (
                        <div key={wi} className="grid grid-cols-7">
                          {week.map((day, di) => {
                            const isSameDaySelected = selectedDate && isSameDay(day.date, selectedDate)
                            return (
                              <button
                                key={di}
                                className={`relative p-1.5 text-center text-xs transition-colors min-h-[36px] flex flex-col items-center justify-center gap-0.5 ${
                                  !day.isCurrentMonth ? 'opacity-30' : ''
                                } ${
                                  day.isWeekend ? 'bg-red-500/5' : 'hover:bg-emerald-500/5'
                                } ${
                                  isSameDaySelected ? 'bg-emerald-500/15 ring-1 ring-emerald-500/40' : ''
                                }`}
                                onClick={() => setSelectedDate(day.date)}
                              >
                                <span className={`text-[11px] font-medium ${
                                  day.isToday ? 'bg-emerald-500 text-white w-6 h-6 rounded-full flex items-center justify-center' :
                                  isSameDaySelected ? 'text-emerald-400' :
                                  'vl-text-primary'
                                }`}>
                                  {day.date.getDate()}
                                </span>
                                {day.hasMeetings && (
                                  <div className="flex gap-0.5">
                                    {Array.from({ length: Math.min(day.meetingCount, 3) }).map((_, mi) => (
                                      <div key={mi} className="w-1 h-1 rounded-full bg-emerald-500" />
                                    ))}
                                  </div>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Time picker */}
                  {selectedDate && (
                    <div className="mt-3 space-y-2">
                      <Label className="text-xs font-medium vl-text-muted">Select Time</Label>
                      <div className="grid grid-cols-6 sm:grid-cols-8 gap-1 max-h-48 overflow-y-auto custom-scrollbar p-1">
                        {timeSlots.map((slot) => {
                          const isSelected = selectedHour === slot.hour && selectedMinute === slot.minute
                          const isConflicting = !slot.isAvailable
                          return (
                            <Tooltip key={`${slot.hour}-${slot.minute}`}>
                              <TooltipTrigger asChild>
                                <button
                                  className={`text-[10px] py-1.5 px-1 rounded-md transition-colors relative ${
                                    isSelected
                                      ? 'bg-emerald-500 text-white font-medium'
                                      : isConflicting
                                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                      : 'bg-[var(--vl-bg-secondary)] vl-text-body hover:bg-emerald-500/10 hover:text-emerald-400'
                                  }`}
                                  onClick={() => {
                                    setSelectedHour(slot.hour)
                                    setSelectedMinute(slot.minute)
                                  }}
                                >
                                  {slot.label}
                                  {isConflicting && (
                                    <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-red-500" />
                                  )}
                                </button>
                              </TooltipTrigger>
                              {isConflicting && (
                                <TooltipContent className="text-[10px]">
                                  Conflicts with: {slot.conflictingAgents.join(', ')}
                                </TooltipContent>
                              )}
                            </Tooltip>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Duration & Recurring */}
        <Card className="vl-card">
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium vl-text-muted">Duration</Label>
              <div className="flex flex-wrap gap-2">
                {DURATION_OPTIONS.map(opt => (
                  <Button
                    key={opt.value}
                    variant={(customDuration || duration) === opt.value ? 'default' : 'outline'}
                    size="sm"
                    className={`text-xs h-8 gap-1.5 ${
                      (customDuration || duration) === opt.value
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : ''
                    }`}
                    onClick={() => {
                      setDuration(opt.value)
                      setCustomDuration(null)
                    }}
                  >
                    <Timer className="size-3" />
                    {opt.label}
                  </Button>
                ))}
                {/* Custom duration */}
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={15}
                    max={480}
                    placeholder="Custom"
                    className="w-20 h-8 text-xs"
                    value={customDuration || ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value)
                      if (val && val >= 15) {
                        setCustomDuration(val)
                      } else {
                        setCustomDuration(null)
                      }
                    }}
                  />
                  <span className="text-[10px] vl-text-muted">min</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Recurring */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Repeat className="size-3.5 text-violet-400" />
                <Label className="text-xs font-medium vl-text-muted">Recurring (UI preference)</Label>
              </div>
              <RadioGroup value={recurring} onValueChange={setRecurring} className="flex flex-wrap gap-2">
                {[
                  { value: 'none', label: 'One-time' },
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'bi-weekly', label: 'Bi-weekly' },
                ].map(opt => (
                  <Label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
                    <RadioGroupItem value={opt.value} />
                    <span className="text-xs vl-text-body">{opt.label}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        {/* Agenda */}
        <Card className="vl-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium vl-text-heading">Agenda</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <Textarea
              placeholder="Describe the meeting agenda..."
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              rows={3}
              className="text-sm resize-none"
            />
          </CardContent>
        </Card>

        {/* Summary card */}
        <AnimatePresence>
          {showSummary && selectedDate && (
            <motion.div
              initial={{ opacity: 0, y: 12, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: 12, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="vl-card border-emerald-500/30 bg-emerald-500/5">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-emerald-400" />
                    <span className="text-sm font-semibold vl-text-heading">Schedule Summary</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-[10px] vl-text-muted">Type</span>
                      <div className="flex items-center gap-1.5">
                        {meetingType === 'team' ? <Users className="size-3 text-emerald-500" /> : <User className="size-3 text-cyan-500" />}
                        <span className="vl-text-heading font-medium capitalize">{meetingType}</span>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] vl-text-muted">Date & Time</span>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="size-3 text-emerald-500" />
                        <span className="vl-text-heading font-medium">
                          {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {' '}{formatTime(selectedHour, selectedMinute)}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] vl-text-muted">Duration</span>
                      <div className="flex items-center gap-1.5">
                        <Timer className="size-3 text-emerald-500" />
                        <span className="vl-text-heading font-medium">{customDuration || duration} minutes</span>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] vl-text-muted">Recurring</span>
                      <div className="flex items-center gap-1.5">
                        {recurring !== 'none' ? <Repeat className="size-3 text-violet-400" /> : <div className="size-3" />}
                        <span className="vl-text-heading font-medium capitalize">{recurring === 'none' ? 'One-time' : recurring}</span>
                      </div>
                    </div>
                    <div className="col-span-2 space-y-0.5">
                      <span className="text-[10px] vl-text-muted">Participants</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {selectedAgents.map(a => (
                          <Badge key={a.id} variant="outline" className="text-[9px] gap-1" style={{ borderColor: a.color + '50', color: a.color }}>
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: a.color }} />
                            {a.title}
                          </Badge>
                        ))}
                        {selectedAgents.length === 0 && (
                          <span className="text-[10px] vl-text-muted italic">No agents selected</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {conflictInfo.conflictingAgents.length > 0 && (
                    <div className="flex items-start gap-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
                      <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <span className="font-medium text-amber-500">Schedule Conflict Detected</span>
                        <p className="vl-text-muted mt-0.5">
                          The following agents have overlapping meetings: <strong className="text-amber-400">{conflictInfo.conflictingAgents.join(', ')}</strong>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs gap-1.5"
                      onClick={handleSchedule}
                      disabled={!canSubmit}
                    >
                      <CheckCircle2 className="size-3.5" />
                      Confirm Schedule
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowSummary(false)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Schedule button */}
        {!showSummary && (
          <Button
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm gap-2"
            onClick={() => setShowSummary(true)}
            disabled={!canSubmit}
          >
            <Plus className="size-4" />
            Schedule Meeting
          </Button>
        )}
      </div>
    </TooltipProvider>
  )
}
