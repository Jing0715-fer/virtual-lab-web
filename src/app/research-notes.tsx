'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, X, Tag, Pin, PinOff, Trash2, Download, FileText,
  Link2, Edit3, Eye, LayoutGrid, List, Clock, MoreVertical,
  BookOpen, MessageSquare, Bold, Italic, Heading, Code,
  Link as LinkIcon, ListOrdered, Quote, Save, Loader2, Filter,
  ArrowUpDown, FileJson, ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

// ============================================================
// Types
// ============================================================

export interface ResearchNote {
  id: string
  title: string
  content: string
  category: NoteCategory
  tags: string[]
  pinned: boolean
  createdAt: string
  updatedAt: string
  linkedMeetingId: string | null
  linkedAgentIds: string[]
  wordCount: number
  charCount: number
}

type NoteCategory = 'hypothesis' | 'observation' | 'protocol' | 'analysis' | 'conclusion' | 'reference'

type ViewMode = 'edit' | 'preview' | 'split'
type SortBy = 'date' | 'category' | 'title'
type ListStyle = 'grid' | 'list'

export interface ResearchNotesProps {
  lang?: Lang
  meetings?: Array<{ id: string; saveName: string; summary: string | null; status: string }>
  agents?: Array<{ id: string; title: string }>
  onNoteCreated?: (note: ResearchNote) => void
}

// ============================================================
// Constants
// ============================================================

const STORAGE_KEY = 'vl-research-notes'

const CATEGORIES: { value: NoteCategory; label: string; icon: React.ElementType }[] = [
  { value: 'hypothesis', label: 'Hypothesis', icon: Lightbulb },
  { value: 'observation', label: 'Observation', icon: Eye },
  { value: 'protocol', label: 'Protocol', icon: ListOrdered },
  { value: 'analysis', label: 'Analysis', icon: ChartIcon },
  { value: 'conclusion', label: 'Conclusion', icon: CheckIcon },
  { value: 'reference', label: 'Reference', icon: BookMark },
]

const TAG_COLORS = [
  'rn-tag-emerald', 'rn-tag-cyan', 'rn-tag-violet',
  'rn-tag-amber', 'rn-tag-rose', 'rn-tag-sky',
]

const CATEGORY_COLORS: Record<NoteCategory, string> = {
  hypothesis: 'rn-category-hypothesis',
  observation: 'rn-category-observation',
  protocol: 'rn-category-protocol',
  analysis: 'rn-category-analysis',
  conclusion: 'rn-category-conclusion',
  reference: 'rn-category-reference',
}

// Placeholder icons
function Lightbulb(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" /><path d="M10 22h4" />
    </svg>
  )
}
function ChartIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
    </svg>
  )
}
function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}
function BookMark(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
    </svg>
  )
}

// ============================================================
// Helpers
// ============================================================

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function getTagColor(tag: string): string {
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
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

function readingTime(wordCount: number): string {
  const mins = Math.max(1, Math.ceil(wordCount / 200))
  return `${mins} min read`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

// ============================================================
// Main Component
// ============================================================

export function ResearchNotesSystem({
  lang = 'en',
  meetings = [],
  agents = [],
  onNoteCreated,
}: ResearchNotesProps) {
  const [mounted, setMounted] = useState(false)
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<NoteCategory | null>(null)
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [showPinnedOnly, setShowPinnedOnly] = useState(false)
  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [listStyle, setListStyle] = useState<ListStyle>('list')
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [isSaving, setIsSaving] = useState(false)
  const [meetingLinkOpen, setMeetingLinkOpen] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [showTagInput, setShowTagInput] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load from localStorage (using lazy initializer to avoid setState-in-effect)
  const [notes, setNotes] = useState<ResearchNote[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true))
  }, [])

  // Persist notes
  const persistNotes = useCallback((updated: ResearchNote[]) => {
    setNotes(updated)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) } catch { /* ignore */ }
  }, [])

  // Create note
  const handleCreateNote = useCallback((category?: NoteCategory) => {
    const note: ResearchNote = {
      id: crypto.randomUUID(),
      title: 'Untitled Note',
      content: '',
      category: category || 'hypothesis',
      tags: [],
      pinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      linkedMeetingId: null,
      linkedAgentIds: [],
      wordCount: 0,
      charCount: 0,
    }
    persistNotes([...notes, note])
    setSelectedNoteId(note.id)
    toast.success('Note created')
    onNoteCreated?.(note)
  }, [notes, persistNotes, onNoteCreated])

  // Update note
  const handleUpdateNote = useCallback((id: string, updates: Partial<ResearchNote>) => {
    const updated = notes.map(n =>
      n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n
    )
    persistNotes(updated)
  }, [notes, persistNotes])

  // Delete note
  const handleDeleteNote = useCallback((id: string) => {
    persistNotes(notes.filter(n => n.id !== id))
    if (selectedNoteId === id) setSelectedNoteId(null)
    setDeleteDialogOpen(false)
    setDeleteNoteId(null)
    toast.success('Note deleted')
  }, [notes, selectedNoteId, persistNotes])

  // Toggle pin
  const handleTogglePin = useCallback((id: string) => {
    persistNotes(notes.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n))
  }, [notes, persistNotes])

  // Add tag
  const handleAddTag = useCallback((noteId: string, tag: string) => {
    const trimmed = tag.trim()
    if (!trimmed) return
    const updated = notes.map(n => {
      if (n.id !== noteId) return n
      const tags = [...new Set([...n.tags, trimmed])]
      return { ...n, tags }
    })
    persistNotes(updated)
  }, [notes, persistNotes])

  // Remove tag
  const handleRemoveTag = useCallback((noteId: string, tag: string) => {
    const updated = notes.map(n => {
      if (n.id !== noteId) return n
      return { ...n, tags: n.tags.filter(t => t !== tag) }
    })
    persistNotes(updated)
  }, [notes, persistNotes])

  // Export note as markdown
  const handleExportMarkdown = useCallback((note: ResearchNote) => {
    const content = `# ${note.title}\n\n**Category:** ${note.category}\n**Tags:** ${note.tags.join(', ')}\n**Date:** ${formatDate(note.createdAt)}\n\n---\n\n${note.content}`
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${note.title || 'note'}.md`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Exported as Markdown')
  }, [])

  // Export note as JSON
  const handleExportJSON = useCallback((note: ResearchNote) => {
    const blob = new Blob([JSON.stringify(note, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${note.title || 'note'}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Exported as JSON')
  }, [])

  // Export all notes
  const handleExportAll = useCallback(() => {
    const content = notes.map(n => `# ${n.title}\n\n**Category:** ${n.category}\n**Tags:** ${n.tags.join(', ')}\n\n${n.content}\n\n---\n`).join('\n')
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'research-notes.md'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('All notes exported')
  }, [notes])

  // Markdown toolbar - store ref in state-based callback to avoid ref-during-render
  const handleToolbarAction = useCallback((actionType: string) => {
    const textarea = textareaRef.current
    if (!textarea || !selectedNoteId) return

    let before = ''
    let after = ''
    switch (actionType) {
      case 'bold': before = '**'; after = '**'; break
      case 'italic': before = '*'; after = '*'; break
      case 'heading': before = '## '; break
      case 'code': before = '`'; after = '`'; break
      case 'link': before = '['; after = '](url)'; break
      case 'list': before = '- '; break
      case 'quote': before = '> '; break
    }

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = textarea.value.substring(start, end)
    const note = notes.find(n => n.id === selectedNoteId)
    if (!note) return
    const newContent = note.content.substring(0, start) + before + selected + after + note.content.substring(end)
    handleUpdateNote(selectedNoteId, {
      content: newContent,
      charCount: newContent.length,
      wordCount: countWords(newContent),
    })
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length)
    })
  }, [selectedNoteId, notes, handleUpdateNote])

  // All tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    notes.forEach(n => n.tags.forEach(t => tagSet.add(t)))
    return Array.from(tagSet).sort()
  }, [notes])

  // Filtered notes
  const filteredNotes = useMemo(() => {
    let result = [...notes]

    if (filterCategory) {
      result = result.filter(n => n.category === filterCategory)
    }

    if (filterTag) {
      result = result.filter(n => n.tags.includes(filterTag))
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some(t => t.toLowerCase().includes(q))
      )
    }

    if (showPinnedOnly) {
      result = result.filter(n => n.pinned)
    }

    result.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      switch (sortBy) {
        case 'title': return a.title.localeCompare(b.title)
        case 'category': return a.category.localeCompare(b.category)
        case 'date':
        default: return b.updatedAt.localeCompare(a.updatedAt)
      }
    })

    return result
  }, [notes, filterCategory, filterTag, searchQuery, showPinnedOnly, sortBy])

  const selectedNote = notes.find(n => n.id === selectedNoteId) || null

  // Highlight search matches
  const highlightText = useCallback((text: string, query: string) => {
    if (!query.trim()) return text
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    return parts.map((part, i) =>
      regex.test(part)
        ? <mark key={i} className="bg-emerald-500/30 text-emerald-300 rounded px-0.5">{part}</mark>
        : part
    )
  }, [])

  if (!mounted) return null

  // Define toolbar actions only after mounted check to avoid ref-during-render
  const editorToolbarActions = [
    { icon: Bold, label: 'Bold', actionType: 'bold' },
    { icon: Italic, label: 'Italic', actionType: 'italic' },
    { icon: Heading, label: 'Heading', actionType: 'heading' },
    { icon: Code, label: 'Code', actionType: 'code' },
    { icon: LinkIcon, label: 'Link', actionType: 'link' },
    { icon: ListOrdered, label: 'List', actionType: 'list' },
    { icon: Quote, label: 'Quote', actionType: 'quote' },
  ]

  // ============================================================
  // Empty State
  // ============================================================
  if (notes.length === 0 && !selectedNoteId) {
    return (
      <div className="rn-empty-state p-6">
        <div className="rn-empty-state-icon rn-animate-fade-scale">
          <BookOpen />
        </div>
        <h3 className="text-lg font-semibold vl-text-heading mb-2">
          No Research Notes Yet
        </h3>
        <p className="text-sm vl-text-muted mb-6 max-w-md">
          Start capturing your research ideas, hypotheses, observations, and analyses.
          Notes support Markdown, categories, tags, and linking to meetings.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          {CATEGORIES.slice(0, 4).map(cat => (
            <Button
              key={cat.value}
              variant="outline"
              className="rn-quick-capture"
              onClick={() => handleCreateNote(cat.value)}
            >
              <cat.icon className="size-4 mr-2" />
              New {cat.label}
            </Button>
          ))}
        </div>
      </div>
    )
  }

  // ============================================================
  // Main Layout
  // ============================================================
  return (
    <div className="flex flex-col md:flex-row h-full min-h-0 gap-0">
      {/* Sidebar */}
      <div className="w-full md:w-80 shrink-0 border-r border-[var(--vl-border-subtle)] flex flex-col">
        {/* Sidebar header */}
        <div className="p-4 space-y-3">
          {/* Title & Actions */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold vl-text-heading">Research Notes</h2>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                onClick={() => handleCreateNote()}
                className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Plus className="size-3" /> New
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0 vl-inner border-[var(--vl-border-subtle)]">
                    <MoreVertical className="size-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="vl-dialog" align="end">
                  <DropdownMenuItem className="text-xs cursor-pointer" onClick={handleExportAll}>
                    <Download className="size-3 mr-2" /> Export All (MD)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 vl-text-muted" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="pl-9 h-8 text-xs vl-inner"
            />
            {searchQuery && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 vl-text-muted hover:text-white"
                onClick={() => setSearchQuery('')}
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {/* Category & Sort Row */}
          <div className="flex items-center gap-2">
            {/* Category Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs vl-inner border-[var(--vl-border-subtle)] gap-1 flex-1">
                  <Filter className="size-3" />
                  {filterCategory
                    ? CATEGORIES.find(c => c.value === filterCategory)?.label
                    : 'All Categories'}
                  <ChevronDown className="size-3 ml-auto" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="vl-dialog" align="start">
                <DropdownMenuItem
                  className="text-xs cursor-pointer"
                  onClick={() => setFilterCategory(null)}
                >
                  All Categories
                </DropdownMenuItem>
                {CATEGORIES.map(cat => (
                  <DropdownMenuItem
                    key={cat.value}
                    className="text-xs cursor-pointer"
                    onClick={() => setFilterCategory(cat.value)}
                  >
                    <cat.icon className="size-3 mr-2" /> {cat.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sort */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 w-7 p-0 vl-inner border-[var(--vl-border-subtle)]">
                  <ArrowUpDown className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="vl-dialog" align="end">
                {([
                  { value: 'date', label: 'By Date' },
                  { value: 'category', label: 'By Category' },
                  { value: 'title', label: 'By Title' },
                ] as { value: SortBy; label: string }[]).map(opt => (
                  <DropdownMenuItem
                    key={opt.value}
                    className="text-xs cursor-pointer"
                    onClick={() => setSortBy(opt.value)}
                  >
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* View Toggle */}
            <div className="rn-view-toggle">
              <button
                className={`rn-view-toggle-btn ${listStyle === 'list' ? 'rn-view-toggle-btn-active' : ''}`}
                onClick={() => setListStyle('list')}
              >
                <List className="size-3" />
              </button>
              <button
                className={`rn-view-toggle-btn ${listStyle === 'grid' ? 'rn-view-toggle-btn-active' : ''}`}
                onClick={() => setListStyle('grid')}
              >
                <LayoutGrid className="size-3" />
              </button>
            </div>
          </div>

          {/* Tag Filters */}
          {allTags.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Tag className="size-3 vl-text-muted" />
                <span className="text-[10px] vl-text-muted">Tags</span>
                <button className="ml-auto" onClick={() => setShowTagInput(!showTagInput)}>
                  <Plus className="size-3 text-emerald-400 hover:text-emerald-300" />
                </button>
              </div>
              {showTagInput && selectedNoteId && (
                <div className="flex items-center gap-1">
                  <Input
                    value={newTagName}
                    onChange={e => setNewTagName(e.target.value)}
                    placeholder="New tag..."
                    className="h-6 text-[10px] vl-inner px-1.5"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newTagName.trim()) {
                        handleAddTag(selectedNoteId, newTagName.trim())
                        setNewTagName('')
                      }
                    }}
                    autoFocus
                  />
                </div>
              )}
              <div className="flex flex-wrap gap-1">
                <button
                  className={`rn-tag text-[10px] ${!filterTag ? 'rn-tag-emerald ring-1' : 'opacity-60'}`}
                  onClick={() => setFilterTag(null)}
                >
                  All
                </button>
                {allTags.map(tag => (
                  <button
                    key={tag}
                    className={`rn-tag ${getTagColor(tag)} text-[10px] ${filterTag === tag ? 'ring-1' : 'opacity-60'}`}
                    onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pinned filter */}
          <div className="flex items-center gap-2">
            <Switch checked={showPinnedOnly} onCheckedChange={setShowPinnedOnly} className="scale-75" />
            <Pin className={`size-3 ${showPinnedOnly ? 'text-amber-400' : 'vl-text-muted'}`} />
            <span className="text-[10px] vl-text-muted">Pinned only</span>
          </div>
        </div>

        <Separator className="bg-[var(--vl-border-subtle)]" />

        {/* Notes List */}
        <ScrollArea className="flex-1">
          {filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 opacity-50">
              <FileText className="size-8 vl-text-muted" />
              <p className="text-xs vl-text-muted">
                {searchQuery ? 'No notes found' : 'No notes yet'}
              </p>
            </div>
          ) : listStyle === 'list' ? (
            <div className="px-2 py-2 space-y-1">
              <AnimatePresence>
                {filteredNotes.map(note => (
                  <motion.div
                    key={note.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  >
                    <NoteListItem
                      note={note}
                      isSelected={selectedNoteId === note.id}
                      searchQuery={searchQuery}
                      highlightText={highlightText}
                      onClick={() => setSelectedNoteId(note.id)}
                      onTogglePin={() => handleTogglePin(note.id)}
                      onDelete={() => { setDeleteNoteId(note.id); setDeleteDialogOpen(true) }}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="p-2 grid grid-cols-2 gap-2">
              <AnimatePresence>
                {filteredNotes.map(note => (
                  <motion.div
                    key={note.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  >
                    <NoteGridItem
                      note={note}
                      isSelected={selectedNoteId === note.id}
                      searchQuery={searchQuery}
                      highlightText={highlightText}
                      onClick={() => setSelectedNoteId(note.id)}
                      onTogglePin={() => handleTogglePin(note.id)}
                      onDelete={() => { setDeleteNoteId(note.id); setDeleteDialogOpen(true) }}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>

        {/* Footer Stats */}
        <div className="px-3 py-2 border-t border-[var(--vl-border-subtle)] text-[9px] vl-text-muted flex items-center justify-between">
          <span>{filteredNotes.length} of {notes.length} notes</span>
          <span>{notes.reduce((sum, n) => sum + n.wordCount, 0).toLocaleString()} words</span>
        </div>
      </div>

      {/* Editor Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedNote ? (
          <div className="flex flex-col h-full">
            {/* Editor Toolbar */}
            <div className="flex items-center gap-1 px-4 py-2 border-b border-[var(--vl-border-subtle)] shrink-0 flex-wrap">
              {/* Category Badge */}
              <div className={`rn-tag ${CATEGORY_COLORS[selectedNote.category]} text-[10px] mr-2`}>
                {CATEGORIES.find(c => c.value === selectedNote.category)?.label}
              </div>

              {/* Category Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 vl-text-muted">
                    <ChevronDown className="size-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="vl-dialog">
                  {CATEGORIES.map(cat => (
                    <DropdownMenuItem
                      key={cat.value}
                      className="text-xs cursor-pointer"
                      onClick={() => handleUpdateNote(selectedNote.id, { category: cat.value })}
                    >
                      <cat.icon className="size-3 mr-2" /> {cat.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Separator orientation="vertical" className="h-4 mx-1" />

              {/* Markdown Toolbar */}
              {editorToolbarActions.map(act => (
                <TooltipProvider key={act.label}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="p-1.5 rounded-md vl-text-muted hover:text-white hover:bg-[var(--vl-bg-inner)] transition-colors"
                        onClick={() => handleToolbarAction(act.actionType)}
                      >
                        <act.icon className="size-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">{act.label}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}

              <div className="flex-1" />

              {/* View Mode Toggle */}
              <div className="rn-view-toggle">
                <button
                  className={`rn-view-toggle-btn ${viewMode === 'edit' ? 'rn-view-toggle-btn-active' : ''}`}
                  onClick={() => setViewMode('edit')}
                >
                  <Edit3 className="size-3" />
                </button>
                <button
                  className={`rn-view-toggle-btn ${viewMode === 'split' ? 'rn-view-toggle-btn-active' : ''}`}
                  onClick={() => setViewMode('split')}
                >
                  <LayoutGrid className="size-3" />
                </button>
                <button
                  className={`rn-view-toggle-btn ${viewMode === 'preview' ? 'rn-view-toggle-btn-active' : ''}`}
                  onClick={() => setViewMode('preview')}
                >
                  <Eye className="size-3" />
                </button>
              </div>

              <Separator orientation="vertical" className="h-4 mx-1" />

              {/* Pin & Export */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className={`p-1.5 rounded-md transition-colors ${selectedNote.pinned ? 'text-amber-400' : 'vl-text-muted hover:text-white'}`}
                      onClick={() => handleTogglePin(selectedNote.id)}
                    >
                      {selectedNote.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">{selectedNote.pinned ? 'Unpin' : 'Pin'}</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <Download className="size-3.5 vl-text-muted" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="vl-dialog" align="end">
                  <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => handleExportMarkdown(selectedNote)}>
                    <FileText className="size-3 mr-2" /> Export Markdown
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => handleExportJSON(selectedNote)}>
                    <FileJson className="size-3 mr-2" /> Export JSON
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Title */}
            <div className="px-6 pt-4">
              <Input
                value={selectedNote.title}
                onChange={e => handleUpdateNote(selectedNote.id, { title: e.target.value })}
                placeholder="Note title..."
                className="text-lg font-semibold border-0 bg-transparent shadow-none focus-visible:ring-0 vl-text-heading placeholder:vl-text-muted px-0"
              />
            </div>

            {/* Linked Meeting */}
            {selectedNote.linkedMeetingId && (
              <div className="mx-6 mt-2 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-2">
                <MessageSquare className="size-4 text-emerald-400 shrink-0" />
                <span className="text-xs vl-text-heading truncate flex-1">
                  {meetings.find(m => m.id === selectedNote.linkedMeetingId)?.saveName || 'Linked Meeting'}
                </span>
                <button
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 shrink-0"
                  onClick={() => handleUpdateNote(selectedNote.id, { linkedMeetingId: null })}
                >
                  <X className="size-3" />
                </button>
              </div>
            )}

            {/* Editor / Preview */}
            <div className="flex-1 overflow-hidden rn-editor-split" style={{ marginTop: selectedNote.linkedMeetingId ? '0.5rem' : '0.5rem' }}>
              {(viewMode === 'edit' || viewMode === 'split') && (
                <div className={viewMode === 'split' ? 'rn-editor-pane' : 'rn-editor-pane-full'}>
                  <Textarea
                    ref={textareaRef}
                    value={selectedNote.content}
                    onChange={e => {
                      const val = e.target.value
                      handleUpdateNote(selectedNote.id, {
                        content: val,
                        charCount: val.length,
                        wordCount: countWords(val),
                      })
                    }}
                    placeholder="Start writing in Markdown..."
                    className="flex-1 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 vl-text-body text-sm font-mono leading-relaxed placeholder:vl-text-muted p-4"
                  />
                </div>
              )}

              {(viewMode === 'preview' || viewMode === 'split') && (
                <div className={viewMode === 'split' ? 'rn-editor-pane' : 'rn-editor-pane-full'}>
                  <div className="rn-preview-pane vl-text-body custom-scrollbar">
                    {selectedNote.content ? (
                      <div className="vl-prose prose-sm max-w-none">
                        {renderMarkdown(selectedNote.content)}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full opacity-40">
                        <p className="text-sm vl-text-muted italic">Preview will appear here...</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Tags Section */}
            <div className="px-6 py-2 border-t border-[var(--vl-border-subtle)]">
              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="size-3 vl-text-muted" />
                {selectedNote.tags.map(tag => (
                  <span key={tag} className={`rn-tag ${getTagColor(tag)} text-[10px]`}>
                    {tag}
                    <button
                      className="ml-1 hover:text-white/80"
                      onClick={() => handleRemoveTag(selectedNote.id, tag)}
                    >
                      <X className="size-2.5" />
                    </button>
                  </span>
                ))}
                <Input
                  value={newTagName}
                  onChange={e => setNewTagName(e.target.value)}
                  placeholder="Add tag..."
                  className="h-6 text-[10px] vl-inner border-0 bg-transparent shadow-none focus-visible:ring-0 p-0 w-24"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newTagName.trim()) {
                      handleAddTag(selectedNote.id, newTagName.trim())
                      setNewTagName('')
                    }
                  }}
                />
              </div>
            </div>

            {/* Status Bar */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--vl-border-subtle)] text-[10px] vl-text-muted shrink-0">
              <div className="flex items-center gap-3">
                <span>{selectedNote.wordCount} words</span>
                <span>{readingTime(selectedNote.wordCount)}</span>
                <span>{selectedNote.charCount} chars</span>
              </div>
              <div className="flex items-center gap-1.5">
                {isSaving ? (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Loader2 className="size-3 animate-spin" /> Saving...
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Save className="size-3 text-emerald-400" />
                    {timeAgo(selectedNote.updatedAt)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="rn-empty-state-icon rn-animate-fade-scale">
              <BookOpen />
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="vl-dialog max-w-sm">
          <DialogHeader>
            <DialogTitle className="vl-text-heading text-sm">Delete Note?</DialogTitle>
          </DialogHeader>
          <p className="text-xs vl-text-muted">
            This action cannot be undone. The note will be permanently deleted.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" className="vl-inner" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => deleteNoteId && handleDeleteNote(deleteNoteId)}>
              <Trash2 className="size-3 mr-1" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Meeting Link Dialog */}
      <Dialog open={meetingLinkOpen} onOpenChange={setMeetingLinkOpen}>
        <DialogContent className="vl-dialog max-w-md">
          <DialogHeader>
            <DialogTitle className="vl-text-heading text-sm">Link to Meeting</DialogTitle>
          </DialogHeader>
          <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-1">
            {meetings.length === 0 ? (
              <p className="text-xs vl-text-muted text-center py-8">No meetings found</p>
            ) : (
              meetings.map(m => (
                <button
                  key={m.id}
                  className="w-full text-left p-2.5 rounded-lg hover:bg-[var(--vl-bg-inner)] transition-colors"
                  onClick={() => {
                    if (selectedNoteId) {
                      handleUpdateNote(selectedNoteId, { linkedMeetingId: m.id })
                    }
                    setMeetingLinkOpen(false)
                  }}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="size-4 text-emerald-400 shrink-0" />
                    <span className="text-sm vl-text-heading truncate">{m.saveName}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================
// Sub-Components
// ============================================================

function NoteListItem({
  note,
  isSelected,
  searchQuery,
  highlightText,
  onClick,
  onTogglePin,
  onDelete,
}: {
  note: ResearchNote
  isSelected: boolean
  searchQuery: string
  highlightText: (text: string, query: string) => React.ReactNode
  onClick: () => void
  onTogglePin: () => void
  onDelete: () => void
}) {
  return (
    <div
      className={`group flex items-start gap-2 p-2.5 rounded-lg cursor-pointer transition-all ${
        isSelected
          ? 'bg-emerald-500/10 ring-1 ring-emerald-500/20'
          : 'hover:bg-[var(--vl-bg-inner)]'
      }`}
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {note.pinned && <Pin className="size-3 text-amber-400 shrink-0" />}
          <span className={`rn-tag ${CATEGORY_COLORS[note.category]} text-[8px] px-1.5 py-0`}>
            {note.category}
          </span>
          <span className="text-xs font-medium vl-text-heading truncate">
            {highlightText(note.title || 'Untitled', searchQuery)}
          </span>
        </div>
        <p className="text-[10px] vl-text-muted mt-0.5 line-clamp-2">
          {highlightText(note.content.substring(0, 100) || 'Empty note', searchQuery)}
        </p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {note.tags.slice(0, 3).map(tag => (
            <span key={tag} className={`rn-tag ${getTagColor(tag)} text-[8px] px-1.5 py-0`}>
              {tag}
            </span>
          ))}
          {note.linkedMeetingId && (
            <span className="rn-tag rn-tag-emerald text-[8px] px-1.5 py-0">
              <Link2 className="size-2 inline mr-0.5" />Meeting
            </span>
          )}
          <span className="text-[8px] vl-text-muted ml-auto">{note.wordCount}w · {timeAgo(note.updatedAt)}</span>
        </div>
      </div>
      <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button className="p-0.5 rounded hover:bg-[var(--vl-bg-inner)]" onClick={e => { e.stopPropagation(); onTogglePin() }}>
          {note.pinned ? <PinOff className="size-3 text-amber-400" /> : <Pin className="size-3 vl-text-muted" />}
        </button>
        <button className="p-0.5 rounded hover:bg-red-500/10 text-red-400" onClick={e => { e.stopPropagation(); onDelete() }}>
          <Trash2 className="size-3" />
        </button>
      </div>
    </div>
  )
}

function NoteGridItem({
  note,
  isSelected,
  searchQuery,
  highlightText,
  onClick,
  onTogglePin,
  onDelete,
}: {
  note: ResearchNote
  isSelected: boolean
  searchQuery: string
  highlightText: (text: string, query: string) => React.ReactNode
  onClick: () => void
  onTogglePin: () => void
  onDelete: () => void
}) {
  return (
    <div
      className={`rn-note-card p-3 cursor-pointer ${note.pinned ? 'rn-note-card-pinned' : ''} ${
        isSelected ? 'ring-1 ring-emerald-500/30' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className={`rn-tag ${CATEGORY_COLORS[note.category]} text-[8px] px-1.5 py-0`}>
          {note.category}
        </span>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
          <button className="p-0.5 rounded hover:bg-[var(--vl-bg-inner)]" onClick={e => { e.stopPropagation(); onTogglePin() }}>
            {note.pinned ? <PinOff className="size-2.5 text-amber-400" /> : <Pin className="size-2.5 vl-text-muted" />}
          </button>
          <button className="p-0.5 rounded hover:bg-red-500/10 text-red-400" onClick={e => { e.stopPropagation(); onDelete() }}>
            <Trash2 className="size-2.5" />
          </button>
        </div>
      </div>
      <h4 className="text-xs font-medium vl-text-heading truncate mb-1">
        {highlightText(note.title || 'Untitled', searchQuery)}
      </h4>
      <p className="text-[10px] vl-text-muted line-clamp-3 mb-2">
        {highlightText(note.content.substring(0, 120) || 'Empty note', searchQuery)}
      </p>
      <div className="flex items-center gap-1 flex-wrap">
        {note.tags.slice(0, 2).map(tag => (
          <span key={tag} className={`rn-tag ${getTagColor(tag)} text-[7px] px-1.5 py-0`}>{tag}</span>
        ))}
        <span className="text-[7px] vl-text-muted ml-auto">{note.wordCount}w</span>
      </div>
    </div>
  )
}

// ============================================================
// Simple Markdown Renderer (no external deps)
// ============================================================

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let inCodeBlock = false
  let codeContent = ''
  let inList = false
  let listItems: React.ReactNode[] = []

  const closeList = () => {
    if (inList && listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc pl-5 mb-3 space-y-1">
          {listItems}
        </ul>
      )
      listItems = []
      inList = false
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${i}`} className="bg-[var(--vl-bg-inner)] border border-[var(--vl-border-subtle)] rounded-lg p-3 overflow-x-auto mb-3">
            <code className="text-xs font-mono">{codeContent}</code>
          </pre>
        )
        codeContent = ''
        inCodeBlock = false
      } else {
        closeList()
        inCodeBlock = true
      }
      continue
    }

    if (inCodeBlock) {
      codeContent += (codeContent ? '\n' : '') + line
      continue
    }

    // Headings
    if (line.startsWith('### ')) {
      closeList()
      elements.push(<h3 key={`h3-${i}`} className="text-base font-semibold vl-text-heading mt-4 mb-2">{formatInline(line.slice(4))}</h3>)
      continue
    }
    if (line.startsWith('## ')) {
      closeList()
      elements.push(<h2 key={`h2-${i}`} className="text-lg font-semibold vl-text-heading mt-4 mb-2">{formatInline(line.slice(3))}</h2>)
      continue
    }
    if (line.startsWith('# ')) {
      closeList()
      elements.push(<h1 key={`h1-${i}`} className="text-xl font-bold vl-text-heading mt-3 mb-2">{formatInline(line.slice(2))}</h1>)
      continue
    }

    // Horizontal rule
    if (line.match(/^---+$/)) {
      closeList()
      elements.push(<hr key={`hr-${i}`} className="border-t border-[var(--vl-border-subtle)] my-4" />)
      continue
    }

    // Blockquote
    if (line.startsWith('> ')) {
      closeList()
      elements.push(
        <blockquote key={`bq-${i}`} className="border-l-2 border-emerald-500 pl-3 italic vl-text-muted mb-2">
          {formatInline(line.slice(2))}
        </blockquote>
      )
      continue
    }

    // Unordered list
    if (line.match(/^[-*] /)) {
      inList = true
      listItems.push(
        <li key={`li-${i}`} className="text-sm">
          {formatInline(line.slice(2))}
        </li>
      )
      continue
    }

    // Empty line
    if (line.trim() === '') {
      closeList()
      continue
    }

    // Paragraph
    closeList()
    elements.push(<p key={`p-${i}`} className="text-sm mb-2">{formatInline(line)}</p>)
  }

  closeList()

  // If there's trailing code content without closing backticks
  if (inCodeBlock && codeContent) {
    elements.push(
      <pre key="code-trailing" className="bg-[var(--vl-bg-inner)] border border-[var(--vl-border-subtle)] rounded-lg p-3 overflow-x-auto mb-3">
        <code className="text-xs font-mono">{codeContent}</code>
      </pre>
    )
  }

  return elements
}

function formatInline(text: string): React.ReactNode {
  // Bold **text**
  // Italic *text*
  // Code `text`
  // Link [text](url)

  const parts: React.ReactNode[] = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    // Bold
    const boldMatch = remaining.match(/\*\*(.*?)\*\*/)
    // Italic
    const italicMatch = remaining.match(/\*(.*?)\*/)
    // Code
    const codeMatch = remaining.match(/`(.*?)`/)
    // Link
    const linkMatch = remaining.match(/\[(.*?)\]\((.*?)\)/)

    // Find the earliest match
    const matches = [
      boldMatch ? { type: 'bold', index: boldMatch.index!, length: boldMatch[0].length, content: boldMatch[1] } : null,
      italicMatch && !boldMatch ? { type: 'italic', index: italicMatch.index!, length: italicMatch[0].length, content: italicMatch[1] } : null,
      codeMatch ? { type: 'code', index: codeMatch.index!, length: codeMatch[0].length, content: codeMatch[1] } : null,
      linkMatch ? { type: 'link', index: linkMatch.index!, length: linkMatch[0].length, content: linkMatch[1], href: linkMatch[2] } : null,
    ].filter(Boolean) as Array<{ type: string; index: number; length: number; content: string; href?: string }>

    if (matches.length === 0) {
      parts.push(<span key={key++}>{remaining}</span>)
      break
    }

    matches.sort((a, b) => a.index - b.index)
    const match = matches[0]

    if (match.index > 0) {
      parts.push(<span key={key++}>{remaining.substring(0, match.index)}</span>)
    }

    switch (match.type) {
      case 'bold':
        parts.push(<strong key={key++} className="font-semibold">{match.content}</strong>)
        break
      case 'italic':
        parts.push(<em key={key++}>{match.content}</em>)
        break
      case 'code':
        parts.push(
          <code key={key++} className="bg-[var(--vl-bg-inner)] px-1 py-0.5 rounded text-xs font-mono">
            {match.content}
          </code>
        )
        break
      case 'link':
        parts.push(
          <a key={key++} href={match.href} className="text-emerald-400 underline" target="_blank" rel="noopener noreferrer">
            {match.content}
          </a>
        )
        break
    }

    remaining = remaining.substring(match.index + match.length)
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>
}

export default ResearchNotesSystem
