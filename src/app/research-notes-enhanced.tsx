'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import {
  Plus, Search, X, FolderPlus, FolderOpen, ChevronRight, ChevronDown,
  Tag, Pin, PinOff, Trash2, Download, FileText, Link2, ExternalLink,
  Edit3, Eye, LayoutGrid, List, Clock, MoreVertical, GripVertical,
  BookOpen, MessageSquare, ArrowRight, Bold, Italic, Heading, Code,
  Link as LinkIcon, ListOrdered, Quote, Table as TableIcon, AlignLeft,
  Save, Loader2, Star, Filter, Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

interface ResearchNote {
  id: string
  title: string
  content: string
  tags: string[]
  folderId: string | null
  pinned: boolean
  createdAt: string
  updatedAt: string
  linkedMeetingId: string | null
  linkedMeetingName: string | null
  linkedMeetingSummary: string | null
  wordCount: number
  charCount: number
}

interface NoteFolder {
  id: string
  name: string
  parentId: string | null
  color: string
  noteIds: string[]
  createdAt: string
}

const TAG_COLORS = [
  'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  'bg-amber-500/15 text-amber-400 border-amber-500/20',
  'bg-violet-500/15 text-violet-400 border-violet-500/20',
  'bg-rose-500/15 text-rose-400 border-rose-500/20',
  'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  'bg-pink-500/15 text-pink-400 border-pink-500/20',
  'bg-lime-500/15 text-lime-400 border-lime-500/20',
  'bg-orange-500/15 text-orange-400 border-orange-500/20',
]

const FOLDER_COLORS = ['#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#84cc16']

const STORAGE_KEY_NOTES = 'vl-research-notes'
const STORAGE_KEY_FOLDERS = 'vl-research-notes-folders'

// ============================================================
// Helper Functions
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

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
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

// ============================================================
// Markdown Toolbar Button
// ============================================================

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  active,
}: {
  icon: React.ElementType
  label: string
  onClick: () => void
  active?: boolean
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`p-1.5 rounded-md transition-colors ${
              active
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'vl-text-muted hover:text-white hover:bg-[var(--vl-bg-inner)]'
            }`}
            onClick={onClick}
          >
            <Icon className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="text-xs">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ============================================================
// Note Editor Component
// ============================================================

function NoteEditor({
  note,
  onUpdate,
  onSave,
  isSaving,
  lang,
  viewMode,
  setViewMode,
}: {
  note: ResearchNote | null
  onUpdate: (updates: Partial<ResearchNote>) => void
  onSave: () => void
  isSaving: boolean
  lang: Lang
  viewMode: 'edit' | 'preview' | 'split'
  setViewMode: (v: 'edit' | 'preview' | 'split') => void
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)

  // Track save time
  useEffect(() => {
    if (!isSaving && note) {
      setLastSavedAt(new Date().toISOString())
    }
  }, [isSaving, note?.id])

  // Save timer
  useEffect(() => {
    if (!note) return
    const timer = setTimeout(() => {
      onSave()
    }, 3000)
    return () => clearTimeout(timer)
  }, [note?.content, note?.title, onSave])

  if (!note) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
        <BookOpen className="size-12 vl-text-muted" />
        <p className="text-sm vl-text-muted">Select a note to edit</p>
      </div>
    )
  }

  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = textarea.value.substring(start, end)
    const newContent = note.content.substring(0, start) + before + selected + after + note.content.substring(end)
    onUpdate({ content: newContent, charCount: newContent.length, wordCount: countWords(newContent) })
    // Restore cursor position
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length)
    })
  }

  const toolbarActions = [
    { icon: Bold, label: 'Bold', action: () => insertMarkdown('**', '**') },
    { icon: Italic, label: 'Italic', action: () => insertMarkdown('*', '*') },
    { icon: Heading, label: 'Heading', action: () => insertMarkdown('## ') },
    { icon: Code, label: 'Code', action: () => insertMarkdown('`', '`') },
    { icon: LinkIcon, label: 'Link', action: () => insertMarkdown('[', '](url)') },
    { icon: ListOrdered, label: 'List', action: () => insertMarkdown('- ') },
    { icon: Quote, label: 'Quote', action: () => insertMarkdown('> ') },
    { icon: TableIcon, label: 'Table', action: () => insertMarkdown('\n| Column 1 | Column 2 |\n| --- | --- |\n| ') },
    { icon: AlignLeft, label: 'Horizontal Rule', action: () => insertMarkdown('\n---\n') },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Title */}
      <div className="px-4 pt-4 pb-2">
        <Input
          value={note.title}
          onChange={e => onUpdate({ title: e.target.value, updatedAt: new Date().toISOString() })}
          placeholder="Note title..."
          className="text-lg font-semibold border-0 bg-transparent shadow-none focus-visible:ring-0 vl-text-heading placeholder:vl-text-muted px-0"
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-4 pb-2 border-b border-[var(--vl-border-subtle)] flex-wrap">
        {toolbarActions.map(act => (
          <ToolbarButton key={act.label} icon={act.icon} label={act.label} onClick={act.action} />
        ))}
        <div className="flex-1" />
        {/* View mode toggle */}
        <div className="flex items-center gap-0.5 border border-[var(--vl-border-subtle)] rounded-md p-0.5">
          <button
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
              viewMode === 'edit' ? 'bg-emerald-500/20 text-emerald-400' : 'vl-text-muted hover:text-white'
            }`}
            onClick={() => setViewMode('edit')}
          >
            <Edit3 className="size-3" />
          </button>
          <button
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
              viewMode === 'split' ? 'bg-emerald-500/20 text-emerald-400' : 'vl-text-muted hover:text-white'
            }`}
            onClick={() => setViewMode('split')}
          >
            <LayoutGrid className="size-3" />
          </button>
          <button
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
              viewMode === 'preview' ? 'bg-emerald-500/20 text-emerald-400' : 'vl-text-muted hover:text-white'
            }`}
            onClick={() => setViewMode('preview')}
          >
            <Eye className="size-3" />
          </button>
        </div>
      </div>

      {/* Meeting Link Display */}
      {note.linkedMeetingId && (
        <div className="mx-4 mt-2 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-2">
          <MessageSquare className="size-4 text-emerald-400 shrink-0" />
          <span className="text-xs vl-text-heading truncate flex-1">{note.linkedMeetingName}</span>
          {note.linkedMeetingSummary && (
            <Badge className="text-[8px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
              Linked
            </Badge>
          )}
          <button
            className="text-[10px] text-emerald-400 hover:text-emerald-300 shrink-0"
            onClick={() => onUpdate({ linkedMeetingId: null, linkedMeetingName: null, linkedMeetingSummary: null })}
          >
            <X className="size-3" />
          </button>
        </div>
      )}

      {/* Editor Area */}
      <div className="flex-1 overflow-hidden flex">
        {/* Markdown Editor */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div className={`${viewMode === 'split' ? 'w-1/2 border-r border-[var(--vl-border-subtle)]' : 'flex-1'} flex flex-col`}>
            <Textarea
              ref={textareaRef}
              value={note.content}
              onChange={e => {
                const val = e.target.value
                onUpdate({ content: val, charCount: val.length, wordCount: countWords(val), updatedAt: new Date().toISOString() })
              }}
              placeholder="Start writing in Markdown..."
              className="flex-1 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 vl-text-body text-sm font-mono leading-relaxed placeholder:vl-text-muted p-4"
            />
          </div>
        )}

        {/* Preview */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className={`${viewMode === 'split' ? 'w-1/2' : 'flex-1'} overflow-y-auto custom-scrollbar p-4`}>
            {note.content ? (
              <div className="vl-prose prose-sm max-w-none vl-text-body">
                <ReactMarkdown>{note.content}</ReactMarkdown>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full opacity-40">
                <p className="text-sm vl-text-muted italic">Preview will appear here...</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--vl-border-subtle)] text-[10px] vl-text-muted shrink-0">
        <div className="flex items-center gap-3">
          <span>{note.wordCount} {t(lang, 'common.words')}</span>
          <span>{note.charCount} {t(lang, 'common.characters')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {isSaving ? (
            <span className="flex items-center gap-1 text-emerald-400">
              <Loader2 className="size-3 animate-spin" />
              {t(lang, 'common.autoSaving')}
            </span>
          ) : lastSavedAt ? (
            <span className="flex items-center gap-1">
              <Save className="size-3 text-emerald-400" />
              Saved {timeAgo(lastSavedAt)}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Note Folder Tree Item
// ============================================================

function FolderTreeItem({
  folder,
  allFolders,
  noteCount,
  selectedFolderId,
  onSelect,
  onRename,
  onDelete,
  depth,
  lang,
}: {
  folder: NoteFolder
  allFolders: NoteFolder[]
  noteCount: number
  selectedFolderId: string | null
  onSelect: () => void
  onRename: (name: string) => void
  onDelete: () => void
  depth: number
  lang: Lang
}) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(folder.name)
  const childFolders = allFolders.filter(f => f.parentId === folder.id)

  return (
    <div style={{ paddingLeft: depth * 12 }}>
      <div
        className={`flex items-center gap-1.5 py-1.5 px-2 rounded-lg cursor-pointer transition-all group ${
          selectedFolderId === folder.id
            ? 'bg-emerald-500/10 text-emerald-400'
            : 'vl-text-muted hover:text-white hover:bg-[var(--vl-bg-inner)]'
        }`}
        onClick={() => onSelect()}
      >
        {childFolders.length > 0 && (
          <button
            className="shrink-0"
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded) }}
          >
            <ChevronRight className={`size-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </button>
        )}
        {childFolders.length === 0 && <span className="w-3" />}
        <FolderOpen className="size-3.5 shrink-0" style={{ color: folder.color }} />
        {isRenaming ? (
          <Input
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onBlur={() => { setIsRenaming(false); onRename(renameValue) }}
            onKeyDown={e => { if (e.key === 'Enter') { setIsRenaming(false); onRename(renameValue) } }}
            className="h-5 text-xs bg-transparent border-0 p-0 focus-visible:ring-0 vl-text-heading"
            autoFocus
          />
        ) : (
          <span className="text-xs font-medium truncate flex-1">{folder.name}</span>
        )}
        <Badge variant="secondary" className="text-[8px] h-4 px-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
          {noteCount}
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
              <MoreVertical className="size-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="vl-dialog" align="end">
            <DropdownMenuItem className="text-xs cursor-pointer" onClick={(e) => { e.stopPropagation(); setIsRenaming(true); setRenameValue(folder.name) }}>
              <Edit3 className="size-3 mr-2" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs cursor-pointer text-red-400" onClick={(e) => { e.stopPropagation(); onDelete() }}>
              <Trash2 className="size-3 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {isExpanded && childFolders.map(cf => {
        const cfNoteCount = 0 // placeholder
        return (
          <FolderTreeItem
            key={cf.id}
            folder={cf}
            allFolders={allFolders}
            noteCount={cfNoteCount}
            selectedFolderId={selectedFolderId}
            onSelect={() => onSelect()}
            onRename={onRename}
            onDelete={onDelete}
            depth={depth + 1}
            lang={lang}
          />
        )
      })}
    </div>
  )
}

// ============================================================
// Meeting Link Dialog
// ============================================================

function MeetingLinkDialog({
  open,
  onClose,
  onLink,
  meetings,
  lang,
}: {
  open: boolean
  onClose: () => void
  onLink: (meetingId: string, meetingName: string, meetingSummary: string) => void
  meetings: Array<{ id: string; saveName: string; summary: string | null }>
  lang: Lang
}) {
  const [search, setSearch] = useState('')
  const completed = useMemo(
    () => meetings.filter(m => m.status === 'completed' || m.saveName),
    [meetings]
  )
  const filtered = useMemo(() => {
    if (!search.trim()) return completed
    const q = search.toLowerCase()
    return completed.filter(m => m.saveName.toLowerCase().includes(q))
  }, [completed, search])

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="vl-dialog max-w-md">
        <DialogHeader>
          <DialogTitle className="vl-text-heading">Link to Meeting</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 vl-text-muted" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search meetings..."
              className="pl-9 vl-inner text-xs"
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-1">
            {filtered.length === 0 ? (
              <p className="text-xs vl-text-muted text-center py-8">No completed meetings found</p>
            ) : (
              filtered.map(m => (
                <button
                  key={m.id}
                  className="w-full text-left p-2.5 rounded-lg hover:bg-[var(--vl-bg-inner)] transition-colors group"
                  onClick={() => {
                    onLink(m.id, m.saveName, m.summary || '')
                    onClose()
                  }}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="size-4 text-emerald-400 shrink-0" />
                    <span className="text-sm vl-text-heading truncate flex-1">{m.saveName}</span>
                    <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  {m.summary && (
                    <p className="text-[10px] vl-text-muted mt-1 line-clamp-2 ml-6">{m.summary}</p>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Main Research Notes Enhanced Component
// ============================================================

export function ResearchNotesEnhanced({
  lang,
  meetings,
}: {
  lang: Lang
  meetings?: Array<{ id: string; saveName: string; summary: string | null; status: string }>
}) {
  const [notes, setNotes] = useState<ResearchNote[]>([])
  const [folders, setFolders] = useState<NoteFolder[]>([])
  const [mounted, setMounted] = useState(false)
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [showPinnedOnly, setShowPinnedOnly] = useState(false)
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('split')
  const [isSaving, setIsSaving] = useState(false)
  const [meetingLinkOpen, setMeetingLinkOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newTagName, setNewTagName] = useState('')
  const [showTagInput, setShowTagInput] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  // Load from localStorage
  useEffect(() => {
    try {
      const savedNotes = localStorage.getItem(STORAGE_KEY_NOTES)
      if (savedNotes) setNotes(JSON.parse(savedNotes))
    } catch { /* ignore */ }
    try {
      const savedFolders = localStorage.getItem(STORAGE_KEY_FOLDERS)
      if (savedFolders) setFolders(JSON.parse(savedFolders))
    } catch { /* ignore */ }
    requestAnimationFrame(() => setMounted(true))
  }, [])

  // Persist
  const persistNotes = useCallback((updated: ResearchNote[]) => {
    setNotes(updated)
    try { localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(updated)) } catch { /* ignore */ }
  }, [])

  const persistFolders = useCallback((updated: NoteFolder[]) => {
    setFolders(updated)
    try { localStorage.setItem(STORAGE_KEY_FOLDERS, JSON.stringify(updated)) } catch { /* ignore */ }
  }, [])

  // Auto-save current note
  const handleSave = useCallback(() => {
    setIsSaving(true)
    setTimeout(() => setIsSaving(false), 500)
  }, [])

  // Update note
  const handleUpdateNote = useCallback((updates: Partial<ResearchNote>) => {
    setNotes(prev => {
      const updated = prev.map(n => n.id === selectedNoteId ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n)
      try { localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(updated)) } catch { /* ignore */ }
      return updated
    })
  }, [selectedNoteId])

  // Create note
  const handleCreateNote = useCallback((folderId?: string | null) => {
    const note: ResearchNote = {
      id: crypto.randomUUID(),
      title: 'Untitled Note',
      content: '',
      tags: [],
      folderId: folderId || null,
      pinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      linkedMeetingId: null,
      linkedMeetingName: null,
      linkedMeetingSummary: null,
      wordCount: 0,
      charCount: 0,
    }
    persistNotes([...notes, note])
    setSelectedNoteId(note.id)
    toast.success('Note created')
  }, [notes, persistNotes])

  // Delete note
  const handleDeleteNote = useCallback((id: string) => {
    persistNotes(notes.filter(n => n.id !== id))
    if (selectedNoteId === id) setSelectedNoteId(null)
    toast.success('Note deleted')
  }, [notes, selectedNoteId, persistNotes])

  // Toggle pin
  const handleTogglePin = useCallback((id: string) => {
    persistNotes(notes.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n))
  }, [notes, persistNotes])

  // Add tag to note
  const handleAddTag = useCallback((noteId: string, tag: string) => {
    persistNotes(notes.map(n => {
      if (n.id !== noteId) return n
      const tags = [...new Set([...n.tags, tag.trim()])]
      return { ...n, tags }
    }))
  }, [notes, persistNotes])

  // Remove tag from note
  const handleRemoveTag = useCallback((noteId: string, tag: string) => {
    persistNotes(notes.map(n => {
      if (n.id !== noteId) return n
      return { ...n, tags: n.tags.filter(t => t !== tag) }
    }))
  }, [notes, persistNotes])

  // Link meeting
  const handleLinkMeeting = useCallback((meetingId: string, meetingName: string, meetingSummary: string) => {
    if (!selectedNoteId) return
    handleUpdateNote({ linkedMeetingId: meetingId, linkedMeetingName: meetingName, linkedMeetingSummary: meetingSummary })
    toast.success('Meeting linked')
  }, [selectedNoteId, handleUpdateNote])

  // Create folder
  const handleCreateFolder = useCallback(() => {
    if (!newFolderName.trim()) return
    const folder: NoteFolder = {
      id: crypto.randomUUID(),
      name: newFolderName.trim(),
      parentId: null,
      color: FOLDER_COLORS[folders.length % FOLDER_COLORS.length],
      noteIds: [],
      createdAt: new Date().toISOString(),
    }
    persistFolders([...folders, folder])
    setNewFolderName('')
    toast.success('Folder created')
  }, [newFolderName, folders, persistFolders])

  // Delete folder
  const handleDeleteFolder = useCallback((id: string) => {
    persistFolders(folders.filter(f => f.id !== id))
  }, [folders, persistFolders])

  // Export note
  const handleExportNote = useCallback((note: ResearchNote) => {
    const content = `# ${note.title}\n\n${note.content}\n\n---\nTags: ${note.tags.join(', ')}\nCreated: ${note.createdAt}\nUpdated: ${note.updatedAt}`
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${note.title || 'note'}.md`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(t(lang, 'common.download'))
  }, [lang])

  // Export all notes
  const handleExportAll = useCallback(() => {
    const content = notes.map(n => `# ${n.title}\n\n${n.content}\n\n---\nTags: ${n.tags.join(', ')}\n\n`).join('\n\n')
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'research-notes.md'
    a.click()
    URL.revokeObjectURL(url)
    toast.success(t(lang, 'common.download'))
  }, [notes, lang])

  // All tags
  const allTags = useMemo(() => {
    const tags = new Set<string>()
    notes.forEach(n => n.tags.forEach(t => tags.add(t)))
    return Array.from(tags).sort()
  }, [notes])

  // Filtered notes
  const filteredNotes = useMemo(() => {
    let result = [...notes]

    // Folder filter
    if (selectedFolderId) {
      result = result.filter(n => n.folderId === selectedFolderId)
    }

    // Tag filter
    if (filterTag) {
      result = result.filter(n => n.tags.includes(filterTag))
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some(t => t.toLowerCase().includes(q))
      )
    }

    // Pinned filter
    if (showPinnedOnly) {
      result = result.filter(n => n.pinned)
    }

    // Sort: pinned first, then by updatedAt
    result.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return b.updatedAt.localeCompare(a.updatedAt)
    })

    return result
  }, [notes, selectedFolderId, filterTag, searchQuery, showPinnedOnly])

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

  return (
    <div className="flex flex-col md:flex-row h-full min-h-0">
      {/* Sidebar */}
      <div className="w-full md:w-72 shrink-0 border-r border-[var(--vl-border-subtle)] flex flex-col">
        {/* Sidebar header */}
        <div className="p-3 space-y-2">
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

          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              onClick={() => handleCreateNote(selectedFolderId)}
              className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white flex-1"
            >
              <Plus className="size-3" /> New Note
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 w-7 p-0 vl-inner border-[var(--vl-border-subtle)]">
                  <MoreVertical className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="vl-dialog" align="end">
                <DropdownMenuItem className="text-xs cursor-pointer" onClick={handleExportAll}>
                  <Download className="size-3 mr-2" /> Export All
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Tag filter pills */}
          {allTags.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Tag className="size-3 vl-text-muted" />
                <span className="text-[10px] vl-text-muted">Tags</span>
                <button
                  className="ml-auto"
                  onClick={() => setShowTagInput(!showTagInput)}
                >
                  <Plus className="size-3 text-emerald-400 hover:text-emerald-300" />
                </button>
              </div>
              {showTagInput && (
                <div className="flex items-center gap-1">
                  <Input
                    value={newTagName}
                    onChange={e => setNewTagName(e.target.value)}
                    placeholder="New tag..."
                    className="h-6 text-[10px] vl-inner px-1.5"
                    onKeyDown={e => { if (e.key === 'Enter' && newTagName.trim()) { setShowTagInput(false); setNewTagName('') } }}
                    autoFocus
                  />
                </div>
              )}
              <div className="flex flex-wrap gap-1">
                <button
                  className={`text-[10px] px-2 py-0.5 rounded-full transition-all ${
                    !filterTag ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30' : 'vl-text-muted hover:text-white'
                  }`}
                  onClick={() => setFilterTag(null)}
                >
                  All
                </button>
                {allTags.map(tag => (
                  <button
                    key={tag}
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                      filterTag === tag ? getTagColor(tag) + ' ring-1' : 'border-[var(--vl-border-subtle)] vl-text-muted hover:text-white'
                    }`}
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

        {/* Folders */}
        <div className="px-3 py-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium vl-text-muted uppercase tracking-wider">Folders</span>
            <div className="flex items-center gap-1">
              <Input
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                placeholder="New folder..."
                className="h-5 text-[10px] vl-inner border-0 bg-transparent shadow-none focus-visible:ring-0 p-0 hidden"
                id="new-folder-input"
              />
            </div>
          </div>
          {/* All Notes folder */}
          <button
            className={`w-full flex items-center gap-1.5 py-1.5 px-2 rounded-lg transition-all ${
              !selectedFolderId ? 'bg-emerald-500/10 text-emerald-400' : 'vl-text-muted hover:text-white hover:bg-[var(--vl-bg-inner)]'
            }`}
            onClick={() => setSelectedFolderId(null)}
          >
            <FolderOpen className="size-3.5" />
            <span className="text-xs font-medium">All Notes</span>
            <Badge variant="secondary" className="text-[8px] h-4 px-1 ml-auto">{notes.length}</Badge>
          </button>
          {/* Custom folders */}
          {folders.map(f => (
            <FolderTreeItem
              key={f.id}
              folder={f}
              allFolders={folders}
              noteCount={notes.filter(n => n.folderId === f.id).length}
              selectedFolderId={selectedFolderId}
              onSelect={() => setSelectedFolderId(f.id === selectedFolderId ? null : f.id)}
              onRename={name => {
                persistFolders(folders.map(fo => fo.id === f.id ? { ...fo, name } : fo))
              }}
              onDelete={() => handleDeleteFolder(f.id)}
              depth={0}
              lang={lang}
            />
          ))}
          {/* New folder input */}
          <div className="flex items-center gap-1 mt-1">
            <FolderPlus className="size-3.5 vl-text-muted" />
            <Input
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              placeholder="New folder..."
              className="h-5 text-[10px] vl-inner border-0 bg-transparent shadow-none focus-visible:ring-0 p-0 flex-1"
              onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder() }}
            />
            {newFolderName.trim() && (
              <button onClick={handleCreateFolder} className="text-emerald-400 hover:text-emerald-300">
                <Plus className="size-3" />
              </button>
            )}
          </div>
        </div>

        <Separator className="bg-[var(--vl-border-subtle)]" />

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar" ref={listRef}>
          {filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 opacity-50">
              <FileText className="size-8 vl-text-muted" />
              <p className="text-xs vl-text-muted">{searchQuery ? 'No notes found' : 'No notes yet'}</p>
            </div>
          ) : (
            <div className="px-2 py-2 space-y-1">
              {filteredNotes.map(note => (
                <motion.div
                  key={note.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  <div
                    className={`group flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                      selectedNoteId === note.id
                        ? 'bg-emerald-500/10 ring-1 ring-emerald-500/20'
                        : 'hover:bg-[var(--vl-bg-inner)]'
                    }`}
                    onClick={() => setSelectedNoteId(note.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {note.pinned && <Pin className="size-3 text-amber-400 shrink-0" />}
                        <span className="text-xs font-medium vl-text-heading truncate">
                          {highlightText(note.title || 'Untitled', searchQuery)}
                        </span>
                      </div>
                      <p className="text-[10px] vl-text-muted mt-0.5 line-clamp-2">
                        {highlightText(note.content.substring(0, 80) || 'Empty note', searchQuery)}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {note.tags.slice(0, 3).map(tag => (
                          <span key={tag} className={`text-[8px] px-1.5 py-0 rounded-full border ${getTagColor(tag)}`}>
                            {tag}
                          </span>
                        ))}
                        {note.linkedMeetingId && (
                          <span className="text-[8px] px-1.5 py-0 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Link2 className="size-2 inline mr-0.5" />Meeting
                          </span>
                        )}
                        <span className="text-[8px] vl-text-muted ml-auto">{timeAgo(note.updatedAt)}</span>
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className="p-0.5 rounded hover:bg-[var(--vl-bg-inner)]"
                              onClick={e => { e.stopPropagation(); handleTogglePin(note.id) }}
                            >
                              {note.pinned ? <PinOff className="size-3 text-amber-400" /> : <Pin className="size-3 vl-text-muted" />}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>{note.pinned ? 'Unpin' : 'Pin'}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className="p-0.5 rounded hover:bg-red-500/10 text-red-400"
                              onClick={e => { e.stopPropagation(); handleDeleteNote(note.id) }}
                            >
                              <Trash2 className="size-3" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar footer stats */}
        <div className="px-3 py-2 border-t border-[var(--vl-border-subtle)] text-[9px] vl-text-muted flex items-center justify-between">
          <span>{filteredNotes.length} of {notes.length} notes</span>
          <span>{notes.reduce((sum, n) => sum + n.wordCount, 0)} total words</span>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--vl-bg)]">
        {selectedNote ? (
          <div className="flex flex-col h-full">
            {/* Editor toolbar */}
            <div className="flex items-center gap-1 px-3 py-2 border-b border-[var(--vl-border-subtle)] shrink-0">
              {/* Add tag */}
              {selectedNote && (
                <div className="flex items-center gap-1 flex-wrap">
                  {selectedNote.tags.map(tag => (
                    <span key={tag} className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 ${getTagColor(tag)}`}>
                      {tag}
                      <button onClick={() => handleRemoveTag(selectedNote.id, tag)}>
                        <X className="size-2.5" />
                      </button>
                    </span>
                  ))}
                  {allTags.filter(t => !selectedNote.tags.includes(t)).length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="text-[10px] px-2 py-0.5 rounded-full border border-dashed border-[var(--vl-border-subtle)] vl-text-muted hover:text-white transition-colors">
                          <Plus className="size-3" /> Tag
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="vl-dialog" align="start">
                        {allTags.filter(t => !selectedNote.tags.includes(t)).slice(0, 8).map(tag => (
                          <DropdownMenuItem key={tag} className="text-xs cursor-pointer" onClick={() => handleAddTag(selectedNote.id, tag)}>
                            <Tag className="size-3 mr-2" /> {tag}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              )}
              <div className="flex-1" />
              {/* Link meeting */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-7 px-2 text-[10px] gap-1 ${
                        selectedNote.linkedMeetingId ? 'text-emerald-400' : 'vl-text-muted'
                      }`}
                      onClick={() => setMeetingLinkOpen(true)}
                    >
                      <Link2 className="size-3" />
                      <span className="hidden sm:inline">{selectedNote.linkedMeetingId ? 'Change Meeting' : 'Link Meeting'}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Link to Meeting</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {/* Export */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[10px] gap-1 vl-text-muted"
                      onClick={() => handleExportNote(selectedNote)}
                    >
                      <Download className="size-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Export as Markdown</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Editor */}
            <div className="flex-1 overflow-hidden">
              <NoteEditor
                note={selectedNote}
                onUpdate={handleUpdateNote}
                onSave={handleSave}
                isSaving={isSaving}
                lang={lang}
                viewMode={viewMode}
                setViewMode={setViewMode}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 opacity-40">
            <div className="w-20 h-20 rounded-2xl bg-[var(--vl-bg-inner)] flex items-center justify-center">
              <BookOpen className="size-8 vl-text-muted" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm vl-text-muted">No note selected</p>
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
                onClick={() => handleCreateNote()}
              >
                <Plus className="size-3" /> Create your first note
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Meeting Link Dialog */}
      <MeetingLinkDialog
        open={meetingLinkOpen}
        onClose={() => setMeetingLinkOpen(false)}
        onLink={handleLinkMeeting}
        meetings={(meetings || []).map(m => ({ id: m.id, saveName: m.saveName, summary: m.summary, status: m.status }))}
        lang={lang}
      />
    </div>
  )
}
