'use client'

/**
 * Quick Meeting Switcher
 *
 * Fuzzy-search meeting switcher dialog (Ctrl+G) with:
 * - Meeting list with name/agenda snippet, type badge, status badge, timestamp
 * - Fuzzy search across agenda, agent names, summary
 * - Arrow key navigation (up/down), Enter to select
 * - Groups: Running, Recent (today), This Week, Older
 * - Selected meeting navigates to correct tab
 * - Animated entrance, glassmorphism styling
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, X, Users, Bot, Clock, ChevronRight,
  ArrowUp, ArrowDown, Loader2, PlayCircle,
  CheckCircle2, FileText, Sparkles, GitBranch, Calendar,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Meeting } from './shared-types'

// ============================================================
// Types
// ============================================================

interface QuickMeetingSwitcherProps {
  open: boolean
  onClose: () => void
  meetings: Meeting[]
  onSelect: (meeting: Meeting) => void
}

interface MeetingGroup {
  id: string
  label: string
  icon: React.ElementType
  color: string
  meetings: Meeting[]
}

// ============================================================
// Fuzzy Match Utility
// ============================================================

function fuzzyScore(query: string, target: string): number {
  if (!query) return 1
  const q = query.toLowerCase()
  const t = target.toLowerCase()

  // Exact match
  if (t.includes(q)) return 2

  // Fuzzy character-by-character match
  let qi = 0
  let score = 0
  let lastMatchIdx = -2
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      score += (ti === lastMatchIdx + 1) ? 2 : 1 // Consecutive matches score higher
      lastMatchIdx = ti
      qi++
    }
  }
  return qi === q.length ? score / q.length : 0
}

function fuzzyMatch(query: string, text: string): boolean {
  return fuzzyScore(query, text) > 0
}

// ============================================================
// Highlight Fuzzy Matches
// ============================================================

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  const parts: React.ReactNode[] = []
  let lastIdx = 0
  let qi = 0

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      if (ti > lastIdx) parts.push(<span key={`pre-${ti}`}>{text.slice(lastIdx, ti)}</span>)
      parts.push(
        <mark key={`hi-${ti}`} className="bg-emerald-500/30 text-inherit rounded-sm px-0.5">
          {text.slice(ti, ti + 1)}
        </mark>
      )
      lastIdx = ti + 1
      qi++
    }
  }
  if (lastIdx < text.length) parts.push(<span key={`post-${lastIdx}`}>{text.slice(lastIdx)}</span>)
  return <>{parts.length > 0 ? parts : text}</>
}

// ============================================================
// Meeting Status Icon
// ============================================================

function MeetingStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'running':
      return (
        <Badge className="h-5 px-1.5 text-[9px] bg-amber-500/15 text-amber-400 border-amber-500/30 border">
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          Running
        </Badge>
      )
    case 'completed':
      return (
        <Badge className="h-5 px-1.5 text-[9px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30 border">
          Completed
        </Badge>
      )
    default:
      return (
        <Badge className="h-5 px-1.5 text-[9px] bg-[var(--vl-bg-inner)] text-[var(--vl-text-muted)] border border-[var(--vl-border-subtle)]">
          Draft
        </Badge>
      )
  }
}

// ============================================================
// Time Ago Helper
// ============================================================

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

// ============================================================
// Meeting Row Component
// ============================================================

function MeetingRow({
  meeting,
  query,
  isActive,
  index,
  globalStartIndex,
  onSelect,
  onActivate,
}: {
  meeting: Meeting
  query: string
  isActive: boolean
  index: number
  globalStartIndex: number
  onSelect: (meeting: Meeting) => void
  onActivate: (globalIndex: number) => void
}) {
  const isTeam = meeting.type === 'team'
  const globalIndex = globalStartIndex + index

  // Build searchable text for highlighting
  const agendaSnippet = meeting.agenda.length > 80
    ? meeting.agenda.slice(0, 80) + '...'
    : meeting.agenda

  const participants = isTeam
    ? meeting.teamMembers?.map(a => a.title).filter(Boolean) || []
    : meeting.teamMember ? [meeting.teamMember.title] : []

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02, duration: 0.15 }}
      onClick={() => onSelect(meeting)}
      onMouseEnter={() => onActivate(globalIndex)}
      className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 cursor-pointer group ${
        isActive
          ? 'bg-[var(--vl-accent,#10b981)]/10 border border-[var(--vl-accent,#10b981)]/20'
          : 'hover:bg-[var(--vl-bg-inner)] border border-transparent'
      }`}
      data-meeting-button
      aria-selected={isActive}
    >
      {/* Type icon */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
        isTeam ? 'bg-emerald-500/15' : 'bg-cyan-500/15'
      }`}>
        {isTeam
          ? <Users className="size-4 text-emerald-400" />
          : <Bot className="size-4 text-cyan-400" />
        }
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-[11px] font-medium ${isTeam ? 'text-emerald-400' : 'text-cyan-400'}`}>
            {isTeam ? 'Team' : 'Solo'}
          </span>
          <span className="text-xs font-medium vl-text-heading truncate">
            {meeting.saveName || 'Untitled'}
          </span>
        </div>
        <p className="text-[11px] vl-text-muted line-clamp-1">
          <HighlightedText text={agendaSnippet} query={query} />
        </p>
        <div className="flex items-center gap-2 mt-1">
          <MeetingStatusBadge status={meeting.status} />
          {meeting.messages?.length ? (
            <span className="text-[9px] vl-text-muted">{meeting.messages.length} msgs</span>
          ) : null}
          <span className="text-[9px] vl-text-muted flex items-center gap-0.5">
            <Clock className="size-2.5" />
            {timeAgo(meeting.updatedAt || meeting.createdAt)}
          </span>
        </div>
      </div>

      {/* Arrow */}
      <ChevronRight className={`size-3.5 shrink-0 mt-2 transition-opacity ${
        isActive ? 'opacity-100 text-[var(--vl-accent,#10b981)]' : 'opacity-0 group-hover:opacity-50'
      }`} />
    </motion.button>
  )
}

// ============================================================
// Empty State
// ============================================================

function EmptyState({ query }: { query: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-12 px-4"
    >
      <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-3">
        <Search className="size-6 text-emerald-400/50" />
      </div>
      <p className="text-sm font-medium vl-text-heading mb-1">
        {query ? 'No meetings found' : 'No meetings yet'}
      </p>
      <p className="text-[11px] vl-text-muted text-center max-w-[240px]">
        {query
          ? 'Try a different search term or create a new meeting'
          : 'Create your first meeting to get started'
        }
      </p>
    </motion.div>
  )
}

// ============================================================
// QuickMeetingSwitcher — Main Component
// ============================================================

export default function QuickMeetingSwitcher({ open, onClose, meetings, onSelect }: QuickMeetingSwitcherProps) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsListRef = useRef<HTMLDivElement>(null)

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus())
    } else {
      setQuery('')
      setActiveIndex(-1)
    }
  }, [open])

  // Group meetings by time period
  const groups = useMemo((): MeetingGroup[] => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const running: Meeting[] = []
    const today: Meeting[] = []
    const thisWeek: Meeting[] = []
    const older: Meeting[] = []

    for (const m of meetings) {
      const d = new Date(m.updatedAt || m.createdAt)
      if (m.status === 'running') {
        running.push(m)
      } else if (d >= todayStart) {
        today.push(d)
      } else if (d >= weekStart) {
        thisWeek.push(m)
      } else {
        older.push(m)
      }
    }

    const result: MeetingGroup[] = []
    if (running.length > 0) result.push({ id: 'running', label: 'Running Now', icon: PlayCircle, color: 'text-amber-400', meetings: running })
    if (today.length > 0) result.push({ id: 'today', label: 'Today', icon: Clock, color: 'text-emerald-400', meetings: today })
    if (thisWeek.length > 0) result.push({ id: 'week', label: 'This Week', icon: Calendar, color: 'text-cyan-400', meetings: thisWeek })
    if (older.length > 0) result.push({ id: 'older', label: 'Older', icon: FileText, color: 'text-violet-400', meetings: older })

    return result
  }, [meetings])

  // Filter and sort with fuzzy search
  const filteredGroups = useMemo((): MeetingGroup[] => {
    if (!query.trim()) return groups

    return groups
      .map(group => {
        const scored = group.meetings
          .map(m => {
            const searchText = [
              m.saveName,
              m.agenda,
              m.summary || '',
              m.type,
              ...(m.teamMembers?.map(a => a.title) || []),
              m.teamLead?.title || '',
              m.teamMember?.title || '',
            ].join(' ')

            const score = fuzzyScore(query, searchText)
            return { meeting: m, score }
          })
          .filter(item => item.score > 0)
          .sort((a, b) => b.score - a.score)
          .map(item => item.meeting)

        return { ...group, meetings: scored }
      })
      .filter(g => g.meetings.length > 0)
  }, [groups, query])

  // Flat list for keyboard navigation
  const flatMeetings = useMemo(() => {
    return filteredGroups.flatMap(g => g.meetings)
  }, [filteredGroups])

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(-1)
  }, [query])

  // Keyboard navigation
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex(prev => {
          const next = prev + 1
          return next >= flatMeetings.length ? 0 : next
        })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex(prev => {
          const next = prev - 1
          return next < 0 ? Math.max(0, flatMeetings.length - 1) : next
        })
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < flatMeetings.length) {
          const meeting = flatMeetings[activeIndex]
          onSelect(meeting)
          onClose()
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, flatMeetings, activeIndex, onSelect, onClose])

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && resultsListRef.current) {
      const buttons = resultsListRef.current.querySelectorAll('[data-meeting-button]')
      const activeButton = buttons[activeIndex] as HTMLElement | undefined
      activeButton?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [activeIndex])

  // Cumulative index tracking for keyboard navigation
  const getGlobalStartIndex = (groupIndex: number) => {
    let idx = 0
    for (let i = 0; i < groupIndex; i++) {
      idx += filteredGroups[i]?.meetings.length || 0
    }
    return idx
  }

  return (
    <div className={`fixed inset-0 z-[110] transition-all duration-300 ${
      open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
    }`}>
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: open ? 1 : 0 }}
        onClick={onClose}
      />

      {/* Dialog */}
      <motion.div
        className="absolute top-[10%] sm:top-[15%] left-1/2 -translate-x-1/2 w-[95vw] max-w-xl vl-dialog rounded-2xl border border-[var(--vl-border)] shadow-2xl overflow-hidden"
        initial={{ opacity: 0, scale: 0.96, y: -10 }}
        animate={{ opacity: open ? 1 : 0, scale: open ? 1 : 0.96, y: open ? 0 : -10 }}
        exit={{ opacity: 0, scale: 0.96, y: -10 }}
        transition={{ type: 'spring', damping: 30, stiffness: 350 }}
      >
        {/* Search Header */}
        <div className="px-4 sm:px-5 pt-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-emerald-400/70" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search meetings by name, agenda, or agent..."
              className="w-full h-11 pl-10 pr-20 rounded-xl bg-[var(--vl-bg-inner)] border border-[var(--vl-border)] text-sm vl-text-heading placeholder:text-[var(--vl-text-muted)] focus:outline-none focus:border-[var(--vl-accent,#10b981)]/40 focus:ring-1 focus:ring-[var(--vl-accent,#10b981)]/20 transition-all"
              aria-label="Search meetings"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <Badge variant="outline" className="h-5 px-1.5 text-[9px] border-[var(--vl-border-subtle)]">
                {flatMeetings.length}
              </Badge>
              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--vl-text-muted)] hover:bg-[var(--vl-bg-inner)] transition-colors"
                aria-label="Close"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Results Area */}
        <div
          ref={resultsListRef}
          className="px-4 sm:px-5 pb-4 max-h-[50vh] overflow-y-auto custom-scrollbar"
        >
          {flatMeetings.length > 0 ? (
            <div className="space-y-3">
              {filteredGroups.map((group, gi) => (
                <div key={group.id}>
                  {/* Group header */}
                  <div className="flex items-center gap-2 px-1 mb-1.5">
                    <group.icon className={`size-3 ${group.color}`} />
                    <span className="text-[10px] font-medium uppercase tracking-wider vl-text-muted">
                      {group.label}
                    </span>
                    <Badge variant="outline" className="h-4 px-1.5 text-[9px] border-[var(--vl-border-subtle)]">
                      {group.meetings.length}
                    </Badge>
                  </div>

                  {/* Meeting rows */}
                  <div className="space-y-0.5">
                    {group.meetings.map((meeting, mi) => (
                      <MeetingRow
                        key={meeting.id}
                        meeting={meeting}
                        query={query}
                        isActive={activeIndex === getGlobalStartIndex(gi) + mi}
                        index={mi}
                        globalStartIndex={getGlobalStartIndex(gi)}
                        onSelect={(m) => { onSelect(m); onClose() }}
                        onActivate={setActiveIndex}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState query={query} />
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-2.5 border-t border-[var(--vl-border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <kbd className="inline-flex items-center justify-center min-w-[18px] h-5 px-1 rounded bg-[var(--vl-bg-inner)] text-[9px] font-mono vl-text-muted border border-[var(--vl-border-subtle)]">↑↓</kbd>
              <span className="text-[9px] vl-text-muted">navigate</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="inline-flex items-center justify-center min-w-[18px] h-5 px-1 rounded bg-[var(--vl-bg-inner)] text-[9px] font-mono vl-text-muted border border-[var(--vl-border-subtle)]">↵</kbd>
              <span className="text-[9px] vl-text-muted">open</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="inline-flex items-center justify-center min-w-[18px] h-5 px-1 rounded bg-[var(--vl-bg-inner)] text-[9px] font-mono vl-text-muted border border-[var(--vl-border-subtle)]">esc</kbd>
              <span className="text-[9px] vl-text-muted">close</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[9px] vl-text-muted">
            <span>Ctrl</span>
            <span>G</span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}


