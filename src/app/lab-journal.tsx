'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, X, Download, ChevronLeft, ChevronRight,
  Calendar, Flame, BookOpen, Trash2, FileText, MessageSquare,
  Clock, Award,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

// ============================================================
// Types
// ============================================================

export interface JournalEntry {
  id: string
  date: string // ISO date string YYYY-MM-DD
  timestamp: string
  mood: number // 1-5
  moodLabel: string
  whatIDid: string
  whatILearned: string
  nextSteps: string
  meetingReferences: string[]
  wordCount: number
}

export interface LabJournalProps {
  lang?: Lang
  meetings?: Array<{ id: string; saveName: string }>
  onEntryCreated?: (entry: JournalEntry) => void
}

// ============================================================
// Constants
// ============================================================

const STORAGE_KEY = 'vl-lab-journal'

const MOODS = [
  { level: 1, emoji: '😫', label: 'Frustrated', color: 'text-red-400' },
  { level: 2, emoji: '😔', label: 'Sluggish', color: 'text-orange-400' },
  { level: 3, emoji: '😐', label: 'Neutral', color: 'text-amber-400' },
  { level: 4, emoji: '😊', label: 'Productive', color: 'text-emerald-400' },
  { level: 5, emoji: '🚀', label: 'On Fire', color: 'text-cyan-400' },
]

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ============================================================
// Helpers
// ============================================================

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function getTodayStr(): string {
  const d = new Date()
  return d.toISOString().split('T')[0]
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

function calculateStreak(entries: JournalEntry[]): number {
  if (entries.length === 0) return 0

  const entryDates = new Set(entries.map(e => e.date))
  let streak = 0
  let current = new Date()

  // If today doesn't have an entry, start from yesterday
  const todayStr = getTodayStr()
  if (!entryDates.has(todayStr)) {
    current.setDate(current.getDate() - 1)
  }

  while (entryDates.has(current.toISOString().split('T')[0])) {
    streak++
    current.setDate(current.getDate() - 1)
  }

  return streak
}

// ============================================================
// Mini Calendar Component
// ============================================================

function MiniCalendar({
  entries,
  selectedDate,
  onSelectDate,
  currentMonth,
  currentYear,
  onPrevMonth,
  onNextMonth,
}: {
  entries: JournalEntry[]
  selectedDate: string | null
  onSelectDate: (date: string) => void
  currentMonth: number
  currentYear: number
  onPrevMonth: () => void
  onNextMonth: () => void
}) {
  const entryDates = useMemo(() => new Set(entries.map(e => e.date)), [entries])

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)
  const todayStr = getTodayStr()

  const days: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(i)

  return (
    <div className="rn-mini-calendar rn-glass-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={onPrevMonth}
          className="p-1 rounded-md hover:bg-[var(--vl-bg-inner)] transition-colors"
        >
          <ChevronLeft className="size-4 vl-text-muted" />
        </button>
        <span className="text-sm font-semibold vl-text-heading">
          {MONTH_NAMES[currentMonth]} {currentYear}
        </span>
        <button
          onClick={onNextMonth}
          className="p-1 rounded-md hover:bg-[var(--vl-bg-inner)] transition-colors"
        >
          <ChevronRight className="size-4 vl-text-muted" />
        </button>
      </div>

      {/* Day Names */}
      <div className="rn-mini-calendar-grid mb-1">
        {DAY_NAMES.map(d => (
          <div key={d} className="rn-mini-calendar-header">{d}</div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="rn-mini-calendar-grid">
        {days.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="rn-mini-calendar-day rn-mini-calendar-day-empty" />
          }

          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const hasEntry = entryDates.has(dateStr)
          const isToday = dateStr === todayStr
          const isSelected = dateStr === selectedDate

          return (
            <div
              key={dateStr}
              className={`rn-mini-calendar-day ${isToday ? 'rn-mini-calendar-day-today' : ''} ${isSelected ? 'rn-mini-calendar-day-selected' : ''} ${hasEntry ? 'rn-mini-calendar-day-has-entry' : ''}`}
              onClick={() => onSelectDate(dateStr)}
            >
              {day}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================
// Journal Entry Card
// ============================================================

function JournalEntryCard({
  entry,
  meetings,
  onDelete,
  onEdit,
}: {
  entry: JournalEntry
  meetings: Array<{ id: string; saveName: string }>
  onDelete: () => void
  onEdit: () => void
}) {
  const mood = MOODS.find(m => m.level === entry.mood) || MOODS[2]

  return (
    <div className="rn-journal-entry">
      <div className="rn-glass-card p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold vl-text-heading">
              {formatDateDisplay(entry.date)}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-lg ${mood.color}`}>{mood.emoji}</span>
              <span className={`text-xs font-medium ${mood.color}`}>{mood.label}</span>
              <span className="text-[10px] vl-text-muted">
                {entry.wordCount} words
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              className="p-1.5 rounded-md hover:bg-[var(--vl-bg-inner)] transition-colors vl-text-muted"
              onClick={onEdit}
            >
              <FileText className="size-3.5" />
            </button>
            <button
              className="p-1.5 rounded-md hover:bg-red-500/10 text-red-400 transition-colors"
              onClick={onDelete}
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>

        {/* What I Did */}
        {entry.whatIDid && (
          <div>
            <h4 className="text-xs font-semibold text-emerald-400 mb-1 flex items-center gap-1">
              <Flame className="size-3" /> What I Did
            </h4>
            <p className="text-sm vl-text-body whitespace-pre-wrap leading-relaxed">
              {entry.whatIDid}
            </p>
          </div>
        )}

        {/* What I Learned */}
        {entry.whatILearned && (
          <div>
            <h4 className="text-xs font-semibold text-cyan-400 mb-1 flex items-center gap-1">
              <BookOpen className="size-3" /> What I Learned
            </h4>
            <p className="text-sm vl-text-body whitespace-pre-wrap leading-relaxed">
              {entry.whatILearned}
            </p>
          </div>
        )}

        {/* Next Steps */}
        {entry.nextSteps && (
          <div>
            <h4 className="text-xs font-semibold text-violet-400 mb-1 flex items-center gap-1">
              <Award className="size-3" /> Next Steps
            </h4>
            <p className="text-sm vl-text-body whitespace-pre-wrap leading-relaxed">
              {entry.nextSteps}
            </p>
          </div>
        )}

        {/* Meeting References */}
        {entry.meetingReferences.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {entry.meetingReferences.map(mId => {
              const meeting = meetings.find(m => m.id === mId)
              return (
                <span key={mId} className="rn-tag rn-tag-emerald text-[10px]">
                  <MessageSquare className="size-2.5" />
                  {meeting?.saveName || 'Meeting'}
                </span>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Main Lab Journal Component
// ============================================================

export function LabJournal({
  lang = 'en',
  meetings = [],
  onEntryCreated,
}: LabJournalProps) {
  const [entries, setEntries] = useState<JournalEntry[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null)

  // Calendar state
  const now = new Date()
  const [currentMonth, setCurrentMonth] = useState(now.getMonth())
  const [currentYear, setCurrentYear] = useState(now.getFullYear())

  // New entry form state
  const [showNewEntry, setShowNewEntry] = useState(false)
  const [newEntryDate, setNewEntryDate] = useState(getTodayStr())
  const [newEntryMood, setNewEntryMood] = useState(3)
  const [newEntryWhatIDid, setNewEntryWhatIDid] = useState('')
  const [newEntryWhatILearned, setNewEntryWhatILearned] = useState('')
  const [newEntryNextSteps, setNewEntryNextSteps] = useState('')
  const [newEntryMeetings, setNewEntryMeetings] = useState<string[]>([])

  // Load from localStorage
  useEffect(() => {
    requestAnimationFrame(() => setMounted(true))
  }, [])

  // Persist entries
  const persistEntries = useCallback((updated: JournalEntry[]) => {
    setEntries(updated)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) } catch { /* ignore */ }
  }, [])

  // Stats
  const stats = useMemo(() => {
    const totalEntries = entries.length
    const streak = calculateStreak(entries)
    const totalWords = entries.reduce((sum, e) => sum + e.wordCount, 0)
    const avgMood = entries.length > 0
      ? entries.reduce((sum, e) => sum + e.mood, 0) / entries.length
      : 0
    return { totalEntries, streak, totalWords, avgMood: Math.round(avgMood * 10) / 10 }
  }, [entries])

  // Create entry
  const handleCreateEntry = useCallback(() => {
    const content = `${newEntryWhatIDid} ${newEntryWhatILearned} ${newEntryNextSteps}`
    const mood = MOODS.find(m => m.level === newEntryMood) || MOODS[2]

    const entry: JournalEntry = {
      id: crypto.randomUUID(),
      date: newEntryDate,
      timestamp: new Date().toISOString(),
      mood: newEntryMood,
      moodLabel: mood.label,
      whatIDid: newEntryWhatIDid.trim(),
      whatILearned: newEntryWhatILearned.trim(),
      nextSteps: newEntryNextSteps.trim(),
      meetingReferences: newEntryMeetings,
      wordCount: countWords(content),
    }

    persistEntries([...entries, entry])
    setSelectedDate(newEntryDate)

    // Reset form
    setShowNewEntry(false)
    setNewEntryWhatIDid('')
    setNewEntryWhatILearned('')
    setNewEntryNextSteps('')
    setNewEntryMood(3)
    setNewEntryMeetings([])
    setNewEntryDate(getTodayStr())

    toast.success('Journal entry saved')
    onEntryCreated?.(entry)
  }, [newEntryDate, newEntryMood, newEntryWhatIDid, newEntryWhatILearned, newEntryNextSteps, newEntryMeetings, entries, persistEntries, onEntryCreated])

  // Delete entry
  const handleDeleteEntry = useCallback((id: string) => {
    persistEntries(entries.filter(e => e.id !== id))
    setDeleteDialogOpen(false)
    setDeleteEntryId(null)
    toast.success('Entry deleted')
  }, [entries, persistEntries])

  // Edit entry
  const handleEditEntry = useCallback((entry: JournalEntry) => {
    setEditingEntry(entry)
    setNewEntryDate(entry.date)
    setNewEntryMood(entry.mood)
    setNewEntryWhatIDid(entry.whatIDid)
    setNewEntryWhatILearned(entry.whatILearned)
    setNewEntryNextSteps(entry.nextSteps)
    setNewEntryMeetings(entry.meetingReferences)
    setShowNewEntry(true)
  }, [])

  // Save edited entry
  const handleSaveEdit = useCallback(() => {
    if (!editingEntry) return
    const content = `${newEntryWhatIDid} ${newEntryWhatILearned} ${newEntryNextSteps}`
    const mood = MOODS.find(m => m.level === newEntryMood) || MOODS[2]

    const updated = entries.map(e => e.id === editingEntry.id ? {
      ...e,
      date: newEntryDate,
      mood: newEntryMood,
      moodLabel: mood.label,
      whatIDid: newEntryWhatIDid.trim(),
      whatILearned: newEntryWhatILearned.trim(),
      nextSteps: newEntryNextSteps.trim(),
      meetingReferences: newEntryMeetings,
      wordCount: countWords(content),
    } : e)

    persistEntries(updated)
    setEditingEntry(null)
    setShowNewEntry(false)
    setNewEntryWhatIDid('')
    setNewEntryWhatILearned('')
    setNewEntryNextSteps('')
    setNewEntryMood(3)
    setNewEntryMeetings([])
    setNewEntryDate(getTodayStr())
    toast.success('Entry updated')
  }, [editingEntry, newEntryDate, newEntryMood, newEntryWhatIDid, newEntryWhatILearned, newEntryNextSteps, newEntryMeetings, entries, persistEntries])

  // Export journal
  const handleExportJournal = useCallback(() => {
    const content = entries.sort((a, b) => b.date.localeCompare(a.date)).map(e => {
      const mood = MOODS.find(m => m.level === e.mood) || MOODS[2]
      let md = `# ${formatDateDisplay(e.date)} ${mood.emoji}\n\n`
      if (e.whatIDid) md += `## What I Did\n${e.whatIDid}\n\n`
      if (e.whatILearned) md += `## What I Learned\n${e.whatILearned}\n\n`
      if (e.nextSteps) md += `## Next Steps\n${e.nextSteps}\n\n`
      if (e.meetingReferences.length > 0) {
        md += `**Meetings:** ${e.meetingReferences.map(id => meetings.find(m => m.id === id)?.saveName || id).join(', ')}\n\n`
      }
      return md
    }).join('---\n\n')

    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'lab-journal.md'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Journal exported')
  }, [entries, meetings])

  // Calendar navigation
  const handlePrevMonth = useCallback(() => {
    setCurrentMonth(prev => {
      if (prev === 0) {
        setCurrentYear(y => y - 1)
        return 11
      }
      return prev - 1
    })
  }, [setCurrentMonth, setCurrentYear])

  const handleNextMonth = useCallback(() => {
    setCurrentMonth(prev => {
      if (prev === 11) {
        setCurrentYear(y => y + 1)
        return 0
      }
      return prev + 1
    })
  }, [setCurrentMonth, setCurrentYear])

  // Filtered entries
  const filteredEntries = useMemo(() => {
    let result = [...entries]

    if (selectedDate) {
      result = result.filter(e => e.date === selectedDate)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(e =>
        e.whatIDid.toLowerCase().includes(q) ||
        e.whatILearned.toLowerCase().includes(q) ||
        e.nextSteps.toLowerCase().includes(q)
      )
    }

    result.sort((a, b) => b.date.localeCompare(a.date))

    return result
  }, [entries, selectedDate, searchQuery])

  if (!mounted) return null

  // ============================================================
  // Empty State
  // ============================================================
  if (entries.length === 0 && !showNewEntry) {
    return (
      <div className="rn-empty-state p-6">
        <div className="rn-empty-state-icon rn-animate-fade-scale">
          <Calendar />
        </div>
        <h3 className="text-lg font-semibold vl-text-heading mb-2">
          Your Lab Journal Awaits
        </h3>
        <p className="text-sm vl-text-muted mb-6 max-w-md">
          Track your daily research progress, insights, and next steps.
          Build a streak to maintain research momentum.
        </p>
        <Button
          className="rn-quick-capture gap-2"
          onClick={() => setShowNewEntry(true)}
        >
          <Plus className="size-4" /> Start Your First Entry
        </Button>
      </div>
    )
  }

  // ============================================================
  // Main Layout
  // ============================================================
  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 min-h-0">
      {/* Sidebar: Calendar & Stats */}
      <div className="w-full lg:w-80 shrink-0 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rn-stat-card rn-stat-card-emerald">
            <div className="flex items-center gap-1.5 mb-1">
              <BookOpen className="size-3.5 text-emerald-400" />
              <span className="text-[10px] vl-text-muted">Entries</span>
            </div>
            <div className="rn-stat-number">{stats.totalEntries}</div>
          </div>
          <div className="rn-stat-card rn-stat-card-amber">
            <div className="flex items-center gap-1.5 mb-1">
              <Flame className="size-3.5 text-amber-400" />
              <span className="text-[10px] vl-text-muted">Streak</span>
            </div>
            <div className="rn-stat-number rn-stat-number-amber">{stats.streak}d</div>
          </div>
          <div className="rn-stat-card rn-stat-card-cyan">
            <div className="flex items-center gap-1.5 mb-1">
              <FileText className="size-3.5 text-cyan-400" />
              <span className="text-[10px] vl-text-muted">Words</span>
            </div>
            <div className="rn-stat-number">{stats.totalWords.toLocaleString()}</div>
          </div>
          <div className="rn-stat-card rn-stat-card-violet">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-sm">😊</span>
              <span className="text-[10px] vl-text-muted">Avg Mood</span>
            </div>
            <div className="rn-stat-number rn-stat-number-violet">{stats.avgMood}</div>
          </div>
        </div>

        {/* Calendar */}
        <MiniCalendar
          entries={entries}
          selectedDate={selectedDate}
          onSelectDate={date => setSelectedDate(selectedDate === date ? null : date)}
          currentMonth={currentMonth}
          currentYear={currentYear}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
        />

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            className="rn-quick-capture flex-1 gap-1"
            size="sm"
            onClick={() => {
              setEditingEntry(null)
              setShowNewEntry(true)
              setNewEntryDate(getTodayStr())
              setNewEntryMood(3)
              setNewEntryWhatIDid('')
              setNewEntryWhatILearned('')
              setNewEntryNextSteps('')
              setNewEntryMeetings([])
            }}
          >
            <Plus className="size-3.5" /> New Entry
          </Button>
          <Button variant="outline" size="sm" className="vl-inner border-[var(--vl-border-subtle)]" onClick={handleExportJournal}>
            <Download className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Search & Filter Bar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 vl-text-muted" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search journal entries..."
              className="pl-9 vl-inner"
            />
            {searchQuery && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 vl-text-muted hover:text-white"
                onClick={() => setSearchQuery('')}
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          {selectedDate && (
            <Button
              variant="outline"
              size="sm"
              className="rn-tag rn-tag-emerald h-8"
              onClick={() => setSelectedDate(null)}
            >
              {formatDateDisplay(selectedDate)}
              <X className="size-3 ml-1" />
            </Button>
          )}
        </div>

        {/* New Entry Form */}
        <AnimatePresence>
          {showNewEntry && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden"
            >
              <div className="rn-glass-card p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold vl-text-heading">
                    {editingEntry ? 'Edit Entry' : 'New Journal Entry'}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => {
                      setShowNewEntry(false)
                      setEditingEntry(null)
                    }}
                  >
                    <X className="size-4" />
                  </Button>
                </div>

                {/* Date */}
                <div className="flex items-center gap-3">
                  <Calendar className="size-4 vl-text-muted" />
                  <Input
                    type="date"
                    value={newEntryDate}
                    onChange={e => setNewEntryDate(e.target.value)}
                    className="vl-inner w-48"
                  />
                </div>

                {/* Mood Selector */}
                <div>
                  <label className="text-xs font-medium vl-text-muted mb-2 block">How was your day?</label>
                  <div className="rn-mood-selector">
                    {MOODS.map(mood => (
                      <button
                        key={mood.level}
                        className={`rn-mood-btn ${newEntryMood === mood.level ? 'rn-mood-btn-active' : ''}`}
                        onClick={() => setNewEntryMood(mood.level)}
                        title={mood.label}
                      >
                        {mood.emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* What I Did */}
                <div>
                  <label className="text-xs font-medium text-emerald-400 mb-2 flex items-center gap-1">
                    <Flame className="size-3" /> What I Did
                  </label>
                  <Textarea
                    value={newEntryWhatIDid}
                    onChange={e => setNewEntryWhatIDid(e.target.value)}
                    placeholder="Describe what you worked on today..."
                    className="vl-inner min-h-[80px]"
                  />
                </div>

                {/* What I Learned */}
                <div>
                  <label className="text-xs font-medium text-cyan-400 mb-2 flex items-center gap-1">
                    <BookOpen className="size-3" /> What I Learned
                  </label>
                  <Textarea
                    value={newEntryWhatILearned}
                    onChange={e => setNewEntryWhatILearned(e.target.value)}
                    placeholder="Key insights and learnings..."
                    className="vl-inner min-h-[80px]"
                  />
                </div>

                {/* Next Steps */}
                <div>
                  <label className="text-xs font-medium text-violet-400 mb-2 flex items-center gap-1">
                    <Award className="size-3" /> Next Steps
                  </label>
                  <Textarea
                    value={newEntryNextSteps}
                    onChange={e => setNewEntryNextSteps(e.target.value)}
                    placeholder="What will you work on next?"
                    className="vl-inner min-h-[60px]"
                  />
                </div>

                {/* Meeting References */}
                {meetings.length > 0 && (
                  <div>
                    <label className="text-xs font-medium vl-text-muted mb-2 block">
                      <MessageSquare className="size-3 inline mr-1" /> Meeting References
                    </label>
                    <Select
                      value={newEntryMeetings[0] || ''}
                      onValueChange={(val) => {
                        if (val && !newEntryMeetings.includes(val)) {
                          setNewEntryMeetings([...newEntryMeetings, val])
                        }
                      }}
                    >
                      <SelectTrigger className="vl-inner">
                        <SelectValue placeholder="Select a meeting to attach..." />
                      </SelectTrigger>
                      <SelectContent className="vl-dialog">
                        {meetings
                          .filter(m => !newEntryMeetings.includes(m.id))
                          .map(m => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.saveName}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {newEntryMeetings.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {newEntryMeetings.map(mId => {
                          const meeting = meetings.find(m => m.id === mId)
                          return (
                            <span key={mId} className="rn-tag rn-tag-emerald text-[10px]">
                              {meeting?.saveName || 'Meeting'}
                              <button
                                className="ml-1 hover:text-white/80"
                                onClick={() => setNewEntryMeetings(newEntryMeetings.filter(id => id !== mId))}
                              >
                                <X className="size-2.5" />
                              </button>
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="vl-inner"
                    onClick={() => {
                      setShowNewEntry(false)
                      setEditingEntry(null)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                    onClick={editingEntry ? handleSaveEdit : handleCreateEntry}
                    disabled={!newEntryWhatIDid.trim() && !newEntryWhatILearned.trim() && !newEntryNextSteps.trim()}
                  >
                    <Plus className="size-3" />
                    {editingEntry ? 'Save Changes' : 'Save Entry'}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Journal Timeline */}
        <ScrollArea className="flex-1">
          {filteredEntries.length === 0 ? (
            <div className="rn-empty-state">
              <div className="rn-empty-state-icon">
                <BookOpen />
              </div>
              <h3 className="text-sm font-semibold vl-text-heading mb-1">No entries found</h3>
              <p className="text-xs vl-text-muted">
                {searchQuery ? 'Try a different search term' : selectedDate ? 'No entries for this date' : 'Start your first entry'}
              </p>
            </div>
          ) : (
            <div className="rn-journal-timeline">
              <AnimatePresence>
                {filteredEntries.map(entry => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  >
                    <JournalEntryCard
                      entry={entry}
                      meetings={meetings}
                      onDelete={() => {
                        setDeleteEntryId(entry.id)
                        setDeleteDialogOpen(true)
                      }}
                      onEdit={() => handleEditEntry(entry)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="vl-dialog max-w-sm">
          <DialogHeader>
            <DialogTitle className="vl-text-heading text-sm">Delete Entry?</DialogTitle>
          </DialogHeader>
          <p className="text-xs vl-text-muted">
            This journal entry will be permanently deleted.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" className="vl-inner" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => deleteEntryId && handleDeleteEntry(deleteEntryId)}>
              <Trash2 className="size-3 mr-1" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default LabJournal
