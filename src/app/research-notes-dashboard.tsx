'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import {
  BookOpen, FileText, Tag, Flame, Plus, Clock, TrendingUp,
  Sparkles, ArrowRight, Calendar, MessageSquare, Award,
  ChevronRight, BarChart3, PieChart as PieChartIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip as ShadTooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import { ResearchNotesSystem, type ResearchNote } from './research-notes'
import { LabJournal, type JournalEntry } from './lab-journal'

// ============================================================
// Types
// ============================================================

interface ResearchNotesDashboardProps {
  lang?: Lang
  meetings?: Array<{ id: string; saveName: string; summary: string | null; status: string }>
  agents?: Array<{ id: string; title: string }>
}

// ============================================================
// Constants
// ============================================================

const NOTES_STORAGE_KEY = 'vl-research-notes'
const JOURNAL_STORAGE_KEY = 'vl-lab-journal'

const CATEGORY_COLORS: Record<string, string> = {
  hypothesis: '#8b5cf6',
  observation: '#10b981',
  protocol: '#06b6d4',
  analysis: '#f59e0b',
  conclusion: '#f43f5e',
  reference: '#94a3b8',
}

const TAG_COLORS = [
  { bg: 'rgba(16, 185, 129, 0.12)', text: '#34d399', border: 'rgba(16, 185, 129, 0.25)' },
  { bg: 'rgba(6, 182, 212, 0.12)', text: '#22d3ee', border: 'rgba(6, 182, 212, 0.25)' },
  { bg: 'rgba(139, 92, 246, 0.12)', text: '#a78bfa', border: 'rgba(139, 92, 246, 0.25)' },
  { bg: 'rgba(245, 158, 11, 0.12)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.25)' },
  { bg: 'rgba(244, 63, 94, 0.12)', text: '#fb7185', border: 'rgba(244, 63, 94, 0.25)' },
  { bg: 'rgba(56, 189, 248, 0.12)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.25)' },
]

const PIE_CHART_COLORS = ['#8b5cf6', '#10b981', '#06b6d4', '#f59e0b', '#f43f5e', '#94a3b8']

// ============================================================
// Helpers
// ============================================================

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function getTagColorStyle(tag: string): { bg: string; text: string; border: string } {
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

function getLast7DaysDates(): string[] {
  const dates: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString(undefined, { weekday: 'short' })
}

// ============================================================
// Chart Tooltip Component (defined outside render to avoid "created during render" error)
// ============================================================

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="vl-dialog p-2.5 rounded-lg border border-[var(--vl-border-subtle)] shadow-lg text-xs">
      <p className="vl-text-heading font-medium mb-1">{label}</p>
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="vl-text-muted capitalize">{entry.name}:</span>
          <span className="vl-text-heading font-medium">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// Animated Counter Component
// ============================================================

function AnimatedCounter({ value, className = '' }: { value: number; className?: string }) {
  const displayRef = useRef(0)
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const duration = 800
    const steps = 30
    const increment = value / steps
    let step = 0

    const timer = setInterval(() => {
      step++
      const current = Math.min(Math.round(increment * step), value)
      if (current !== displayRef.current) {
        displayRef.current = current
        setDisplay(current)
      }
      if (step >= steps) clearInterval(timer)
    }, duration / steps)

    return () => clearInterval(timer)
  }, [value])

  return <span className={className}>{display.toLocaleString()}</span>
}

// ============================================================
// Main Dashboard Component
// ============================================================

export function ResearchNotesDashboard({
  lang = 'en',
  meetings = [],
  agents = [],
}: ResearchNotesDashboardProps) {
  const [notes, setNotes] = useState<ResearchNote[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const saved = localStorage.getItem(NOTES_STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const saved = localStorage.getItem(JOURNAL_STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('dashboard')
  const [creatingNote, setCreatingNote] = useState(false)
  const [creatingJournal, setCreatingJournal] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true))
  }, [])

  // Listen for changes from child components
  const handleNoteCreated = useCallback((note: ResearchNote) => {
    setNotes(prev => [...prev, note])
  }, [])

  const handleEntryCreated = useCallback((entry: JournalEntry) => {
    setJournalEntries(prev => [...prev, entry])
  }, [])

  // ============================================================
  // Computed Stats
  // ============================================================

  const totalNotes = notes.length
  const totalJournalEntries = journalEntries.length
  const allTags = useMemo(() => {
    const tagSet = new Map<string, number>()
    notes.forEach(n => n.tags.forEach(tag => {
      tagSet.set(tag, (tagSet.get(tag) || 0) + 1)
    }))
    return Array.from(tagSet.entries()).sort((a, b) => b[1] - a[1])
  }, [notes])

  const tagsUsed = allTags.length
  const totalWords = useMemo(() => {
    const noteWords = notes.reduce((sum, n) => sum + n.wordCount, 0)
    const journalWords = journalEntries.reduce((sum, e) => sum + e.wordCount, 0)
    return noteWords + journalWords
  }, [notes, journalEntries])

  // Category distribution for pie chart
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {}
    notes.forEach(n => {
      counts[n.category] = (counts[n.category] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: CATEGORY_COLORS[name] || '#94a3b8',
    }))
  }, [notes])

  // Productivity chart: entries per day (last 7 days)
  const productivityData = useMemo(() => {
    const last7 = getLast7DaysDates()
    return last7.map(date => {
      const dayNotes = notes.filter(n => n.updatedAt.startsWith(date)).length
      const dayJournal = journalEntries.filter(e => e.date === date).length
      return {
        date,
        label: formatDayLabel(date),
        notes: dayNotes,
        journal: dayJournal,
        total: dayNotes + dayJournal,
      }
    })
  }, [notes, journalEntries])

  // Tag cloud data (sorted by frequency)
  const tagCloudData = useMemo(() => {
    if (allTags.length === 0) return []
    const maxCount = allTags[0]?.[1] || 1
    return allTags.map(([tag, count]) => ({
      tag,
      count,
      size: 0.7 + (count / maxCount) * 0.6, // 0.7rem to 1.3rem
    }))
  }, [allTags])

  // Recent activity feed (merged notes + journal, sorted by date)
  const recentActivity = useMemo(() => {
    const items: Array<{
      id: string
      type: 'note' | 'journal'
      title: string
      timestamp: string
      subtitle: string
    }> = []

    notes.forEach(n => {
      items.push({
        id: n.id,
        type: 'note',
        title: n.title || 'Untitled',
        timestamp: n.updatedAt,
        subtitle: `${n.category} · ${n.wordCount} words`,
      })
    })

    journalEntries.forEach(e => {
      items.push({
        id: e.id,
        type: 'journal',
        title: `Journal: ${e.date}`,
        timestamp: e.timestamp,
        subtitle: `${e.moodLabel} · ${e.wordCount} words`,
      })
    })

    items.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    return items.slice(0, 15)
  }, [notes, journalEntries])

  if (!mounted) return null

  // ============================================================
  // Dashboard View
  // ============================================================
  return (
    <div className="p-6 space-y-6 min-h-screen">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold rn-gradient-text flex items-center gap-2">
            <Sparkles className="size-6" />
            Research Notes & Lab Journal
          </h1>
          <p className="text-sm vl-text-muted mt-1">
            Capture, organize, and track your research progress
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="vl-inner border-[var(--vl-border-subtle)] gap-1"
            onClick={() => {
              setCreatingNote(true)
              setActiveTab('notes')
            }}
          >
            <Plus className="size-3.5" />
            New Note
          </Button>
          <Button
            size="sm"
            className="rn-quick-capture gap-1"
            onClick={() => {
              setCreatingJournal(true)
              setActiveTab('journal')
            }}
          >
            <Plus className="size-3.5" />
            New Entry
          </Button>
        </div>
      </div>

      <Separator className="bg-[var(--vl-border-subtle)]" />

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="vl-inner border border-[var(--vl-border-subtle)]">
          <TabsTrigger value="dashboard" className="text-xs">
            <BarChart3 className="size-3.5 mr-1.5" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="notes" className="text-xs">
            <FileText className="size-3.5 mr-1.5" />
            Notes
          </TabsTrigger>
          <TabsTrigger value="journal" className="text-xs">
            <BookOpen className="size-3.5 mr-1.5" />
            Journal
          </TabsTrigger>
        </TabsList>

        {/* ============================================================ */}
        {/* Dashboard Tab */}
        {/* ============================================================ */}
        <TabsContent value="dashboard" className="mt-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0 }}
            >
              <div className="rn-stat-card rn-stat-card-emerald rn-animate-glow">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <FileText className="size-4 text-emerald-400" />
                      <span className="text-xs vl-text-muted">Total Notes</span>
                    </div>
                    <div className="rn-stat-number rn-animate-counter">
                      <AnimatedCounter value={totalNotes} />
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <FileText className="size-5 text-emerald-400" />
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="rn-stat-card rn-stat-card-cyan">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <BookOpen className="size-4 text-cyan-400" />
                      <span className="text-xs vl-text-muted">Journal Entries</span>
                    </div>
                    <div className="rn-stat-number rn-animate-counter">
                      <AnimatedCounter value={totalJournalEntries} />
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                    <BookOpen className="size-5 text-cyan-400" />
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="rn-stat-card rn-stat-card-violet">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Tag className="size-4 text-violet-400" />
                      <span className="text-xs vl-text-muted">Tags Used</span>
                    </div>
                    <div className="rn-stat-number rn-stat-number-violet rn-animate-counter">
                      <AnimatedCounter value={tagsUsed} />
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                    <Tag className="size-5 text-violet-400" />
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="rn-stat-card rn-stat-card-amber">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <TrendingUp className="size-4 text-amber-400" />
                      <span className="text-xs vl-text-muted">Words Written</span>
                    </div>
                    <div className="rn-stat-number rn-stat-number-amber rn-animate-counter">
                      <AnimatedCounter value={totalWords} />
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <TrendingUp className="size-5 text-amber-400" />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Distribution Donut */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="rn-chart-container"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold vl-text-heading flex items-center gap-1.5">
                  <PieChartIcon className="size-4 text-violet-400" />
                  Category Distribution
                </h3>
              </div>
              {categoryData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 opacity-50">
                  <PieChartIcon className="size-8 vl-text-muted mb-2" />
                  <p className="text-xs vl-text-muted">No notes to categorize</p>
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              {/* Legend */}
              {categoryData.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-3 justify-center">
                  {categoryData.map(item => (
                    <div key={item.name} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                      <span className="text-[10px] vl-text-muted capitalize">{item.name}</span>
                      <span className="text-[10px] vl-text-heading font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Productivity Chart: Entries per Day */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="rn-chart-container"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold vl-text-heading flex items-center gap-1.5">
                  <BarChart3 className="size-4 text-emerald-400" />
                  Activity (Last 7 Days)
                </h3>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={productivityData} barGap={2}>
                  <XAxis
                    dataKey="label"
                    tick={{ fill: 'var(--vl-text-muted)', fontSize: 10 }}
                    axisLine={{ stroke: 'var(--vl-border-subtle)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--vl-text-muted)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="notes" name="Notes" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="journal" name="Journal" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </div>

          {/* Bottom Row: Tag Cloud + Activity Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tag Cloud */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="rn-chart-container"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold vl-text-heading flex items-center gap-1.5">
                  <Tag className="size-4 text-emerald-400" />
                  Tag Cloud
                </h3>
                <Badge variant="secondary" className="text-[10px]">{tagsUsed} tags</Badge>
              </div>
              {tagCloudData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 opacity-50">
                  <Tag className="size-8 vl-text-muted mb-2" />
                  <p className="text-xs vl-text-muted">No tags yet. Add tags to your notes.</p>
                </div>
              ) : (
                <div className="rn-tag-cloud py-4">
                  {tagCloudData.map(({ tag, count, size }) => {
                    const color = getTagColorStyle(tag)
                    return (
                      <span
                        key={tag}
                        className="rn-tag-cloud-item"
                        style={{
                          fontSize: `${size}rem`,
                          background: color.bg,
                          color: color.text,
                          borderColor: color.border,
                        }}
                        title={`${tag}: ${count} uses`}
                      >
                        {tag}
                      </span>
                    )
                  })}
                </div>
              )}
            </motion.div>

            {/* Recent Activity Feed */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="rn-chart-container"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold vl-text-heading flex items-center gap-1.5">
                  <Clock className="size-4 text-cyan-400" />
                  Recent Activity
                </h3>
                <Badge variant="secondary" className="text-[10px]">
                  {recentActivity.length} items
                </Badge>
              </div>
              {recentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 opacity-50">
                  <Clock className="size-8 vl-text-muted mb-2" />
                  <p className="text-xs vl-text-muted">No activity yet</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[280px]">
                  <div className="space-y-0.5">
                    {recentActivity.map((item, idx) => (
                      <div key={item.id} className="rn-activity-feed-item">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          item.type === 'note'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-cyan-500/10 text-cyan-400'
                        }`}>
                          {item.type === 'note' ? (
                            <FileText className="size-3.5" />
                          ) : (
                            <BookOpen className="size-3.5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium vl-text-heading truncate">
                              {item.title}
                            </span>
                          </div>
                          <p className="text-[10px] vl-text-muted">{item.subtitle}</p>
                        </div>
                        <span className="text-[10px] vl-text-muted shrink-0">{timeAgo(item.timestamp)}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </motion.div>
          </div>

          {/* Quick Capture */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="rn-glass-card p-6"
          >
            <h3 className="text-sm font-semibold vl-text-heading mb-4 flex items-center gap-1.5">
              <Sparkles className="size-4 text-emerald-400" />
              Quick Capture
            </h3>
            <div className="flex flex-wrap gap-3">
              <Button
                className="rn-quick-capture gap-2"
                onClick={() => {
                  // Create a quick note
                  const newNote: ResearchNote = {
                    id: crypto.randomUUID(),
                    title: 'Quick Capture',
                    content: '',
                    category: 'observation' as ResearchNote['category'],
                    tags: ['quick-capture'],
                    pinned: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    linkedMeetingId: null,
                    linkedAgentIds: [],
                    wordCount: 0,
                    charCount: 0,
                  }
                  const existing = localStorage.getItem(NOTES_STORAGE_KEY)
                  const existingNotes: ResearchNote[] = existing ? JSON.parse(existing) : []
                  const updated = [newNote, ...existingNotes]
                  localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(updated))
                  setNotes(updated)
                  setActiveTab('notes')
                  toast.success('Quick note created')
                }}
              >
                <FileText className="size-4" /> Quick Note
                <ArrowRight className="size-3 opacity-60" />
              </Button>
              <Button
                variant="outline"
                className="vl-inner border-[var(--vl-border-subtle)] gap-2 hover:border-emerald-500/30 hover:text-emerald-400"
                onClick={() => {
                  setCreatingJournal(true)
                  setActiveTab('journal')
                }}
              >
                <BookOpen className="size-4" /> Journal Entry
                <ArrowRight className="size-3 opacity-60" />
              </Button>
              <Button
                variant="outline"
                className="vl-inner border-[var(--vl-border-subtle)] gap-2 hover:border-violet-500/30 hover:text-violet-400"
                onClick={() => {
                  const newNote: ResearchNote = {
                    id: crypto.randomUUID(),
                    title: 'New Hypothesis',
                    content: '## Hypothesis\n\n',
                    category: 'hypothesis' as ResearchNote['category'],
                    tags: ['hypothesis'],
                    pinned: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    linkedMeetingId: null,
                    linkedAgentIds: [],
                    wordCount: 1,
                    charCount: 20,
                  }
                  const existing = localStorage.getItem(NOTES_STORAGE_KEY)
                  const existingNotes: ResearchNote[] = existing ? JSON.parse(existing) : []
                  const updated = [newNote, ...existingNotes]
                  localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(updated))
                  setNotes(updated)
                  setActiveTab('notes')
                  toast.success('Hypothesis template created')
                }}
              >
                <Sparkles className="size-4" /> New Hypothesis
                <ArrowRight className="size-3 opacity-60" />
              </Button>
            </div>
          </motion.div>
        </TabsContent>

        {/* ============================================================ */}
        {/* Notes Tab */}
        {/* ============================================================ */}
        <TabsContent value="notes" className="mt-2" style={{ height: 'calc(100vh - 220px)' }}>
          <ResearchNotesSystem
            lang={lang}
            meetings={meetings}
            agents={agents}
            onNoteCreated={handleNoteCreated}
          />
        </TabsContent>

        {/* ============================================================ */}
        {/* Journal Tab */}
        {/* ============================================================ */}
        <TabsContent value="journal" className="mt-2" style={{ height: 'calc(100vh - 220px)' }}>
          <LabJournal
            lang={lang}
            meetings={meetings}
            onEntryCreated={handleEntryCreated}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ResearchNotesDashboard
