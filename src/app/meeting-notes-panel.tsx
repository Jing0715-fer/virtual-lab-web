'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Plus, X, Search, Pin, PinOff, Download, Clock,
  Bold, Italic, List, Heading2, Type, Trash2, ChevronRight,
  StickyNote, Copy, Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import { toast } from 'sonner'

// ============================================================
// Types
// ============================================================

interface NoteTab {
  id: string
  title: string
  content: string
  pinned: boolean
  createdAt: string
  updatedAt: string
  timestamps: { text: string; time: string }[]
}

interface MeetingNotesPanelProps {
  meetingId: string
  meetingName: string
  isMeetingRunning?: boolean
  lang: Lang
  className?: string
}

// ============================================================
// Toolbar Button Component
// ============================================================

function ToolbarButton({
  onClick,
  icon: Icon,
  label,
  active = false,
}: {
  onClick: () => void
  icon: React.ElementType
  label: string
  active?: boolean
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            className={`p-1.5 rounded-md transition-all duration-200 note-toolbar-btn ${
              active
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'vl-text-muted hover:bg-[var(--vl-bg-card-hover)] hover:text-[var(--vl-text-heading)]'
            }`}
            aria-label={label}
          >
            <Icon className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="vl-dialog text-xs" side="bottom">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ============================================================
// Note Card Component
// ============================================================

function NoteCard({
  note,
  isActive,
  onSelect,
  onPin,
  onDelete,
  lang,
}: {
  note: NoteTab
  isActive: boolean
  onSelect: () => void
  onPin: () => void
  onDelete: () => void
  lang: Lang
}) {
  return (
    <motion.div
      layout
      onClick={onSelect}
      className={`group flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all duration-200 ${
        isActive
          ? 'bg-emerald-500/10 border border-emerald-500/30'
          : 'hover:bg-[var(--vl-bg-card-hover)] border border-transparent'
      }`}
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.98 }}
    >
      {note.pinned ? (
        <StickyNote className="size-3.5 text-amber-400 shrink-0 note-pin-icon" />
      ) : (
        <FileText className="size-3.5 vl-text-muted shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium truncate ${isActive ? 'text-emerald-400' : 'vl-text-body'}`}>
          {note.title || t(lang, 'meetingNotes.untitled')}
        </p>
        <p className="text-[10px] vl-text-muted truncate">
          {note.content.slice(0, 40) || t(lang, 'meetingNotes.emptyNote')}
        </p>
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onPin() }}
          className="p-1 rounded hover:bg-[var(--vl-bg-inner)] transition-colors"
          aria-label={note.pinned ? t(lang, 'meetingNotes.unpin') : t(lang, 'meetingNotes.pin')}
        >
          {note.pinned ? <PinOff className="size-3 text-amber-400" /> : <Pin className="size-3 vl-text-muted" />}
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="p-1 rounded hover:bg-red-500/10 hover:text-red-400 transition-colors"
          aria-label={t(lang, 'common.delete')}
        >
          <Trash2 className="size-3" />
        </button>
      </div>
    </motion.div>
  )
}

// ============================================================
// Meeting Notes Panel — Main Component
// ============================================================

export function MeetingNotesPanel({
  meetingId,
  meetingName,
  isMeetingRunning = false,
  lang,
  className = '',
}: MeetingNotesPanelProps) {
  const STORAGE_KEY = `vl-meeting-notes-${meetingId}`

  // Hydration-safe mount
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    requestAnimationFrame(() => { setMounted(true) })
  }, [])

  const [notes, setNotes] = useState<NoteTab[]>([])
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editorRef = useRef<HTMLTextAreaElement>(null)

  // Load notes from localStorage on mount
  useEffect(() => {
    if (!mounted) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as NoteTab[]
        const notesToLoad = parsed
        if (notesToLoad.length > 0) {
          requestAnimationFrame(() => {
            setNotes(notesToLoad)
            setActiveNoteId(notesToLoad[0].id)
          })
        }
      }
    } catch { /* ignore */ }
  }, [STORAGE_KEY, mounted])

  // Auto-save with debounce
  const saveNotes = useCallback((updatedNotes: NoteTab[]) => {
    setAutoSaveStatus('saving')
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedNotes))
    } catch { /* ignore */ }
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      requestAnimationFrame(() => { setAutoSaveStatus('saved') })
    }, 600)
  }, [STORAGE_KEY])

  // Update note content with debounce
  const handleContentChange = useCallback((content: string) => {
    setNotes(prev => {
      const updated = prev.map(n => {
        if (n.id === activeNoteId) {
          return { ...n, content, updatedAt: new Date().toISOString() }
        }
        return n
      })
      saveNotes(updated)
      return updated
    })
  }, [activeNoteId, saveNotes])

  // Create new note tab
  const createNote = useCallback(() => {
    const newNote: NoteTab = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: '',
      content: '',
      pinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timestamps: [],
    }
    setNotes(prev => {
      const updated = [newNote, ...prev]
      saveNotes(updated)
      return updated
    })
    setActiveNoteId(newNote.id)
    // Focus editor after creating
    setTimeout(() => editorRef.current?.focus(), 100)
  }, [saveNotes])

  // Delete note
  const deleteNote = useCallback((noteId: string) => {
    setNotes(prev => {
      const updated = prev.filter(n => n.id !== noteId)
      saveNotes(updated)
      if (activeNoteId === noteId) {
        setActiveNoteId(updated.length > 0 ? updated[0].id : null)
      }
      return updated
    })
  }, [activeNoteId, saveNotes])

  // Pin/unpin note
  const togglePin = useCallback((noteId: string) => {
    setNotes(prev => {
      const updated = prev.map(n => {
        if (n.id === noteId) return { ...n, pinned: !n.pinned }
        return n
      })
      saveNotes(updated)
      return updated
    })
  }, [saveNotes])

  // Insert toolbar formatting
  const insertFormatting = useCallback((before: string, after: string = '') => {
    const textarea = editorRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = textarea.value.substring(start, end)
    const replacement = `${before}${selected}${after}`
    const currentNote = notes.find(n => n.id === activeNoteId)
    if (!currentNote) return

    const newContent =
      currentNote.content.substring(0, start) +
      replacement +
      currentNote.content.substring(end)

    handleContentChange(newContent)

    // Restore cursor position
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selected.length
      )
    }, 50)
  }, [notes, activeNoteId, handleContentChange])

  // Insert timestamp
  const insertTimestamp = useCallback(() => {
    const now = new Date()
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const timestampText = `\n[${timeStr}] `
    const textarea = editorRef.current
    if (!textarea) return

    const currentNote = notes.find(n => n.id === activeNoteId)
    if (!currentNote) return

    const newContent = currentNote.content + timestampText
    handleContentChange(newContent)

    // Update timestamps array
    setNotes(prev => {
      const updated = prev.map(n => {
        if (n.id === activeNoteId) {
          return {
            ...n,
            timestamps: [...n.timestamps, { text: timeStr, time: now.toISOString() }],
          }
        }
        return n
      })
      return updated
    })

    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(textarea.value.length, textarea.value.length)
    }, 50)
  }, [notes, activeNoteId, handleContentChange])

  // Export as markdown
  const exportMarkdown = useCallback(() => {
    const md = notes.map(note => {
      const pinnedBadge = note.pinned ? '📌 ' : ''
      const title = note.title || 'Untitled'
      let content = `## ${pinnedBadge}${title}\n\n`
      if (note.timestamps.length > 0) {
        content += note.timestamps.map(ts => `- **${ts.text}**`).join('\n') + '\n\n'
      }
      content += note.content + '\n'
      return content
    }).join('\n---\n\n')

    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${meetingName || 'meeting'}-notes.md`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(t(lang, 'meetingNotes.exportSuccess'))
  }, [notes, meetingName, lang])

  // Copy note content
  const copyContent = useCallback(() => {
    const currentNote = notes.find(n => n.id === activeNoteId)
    if (!currentNote) return
    navigator.clipboard.writeText(currentNote.content)
      .then(() => toast.success(t(lang, 'meetingNotes.copied')))
      .catch(() => {})
  }, [notes, activeNoteId, lang])

  // Filtered notes for search
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) {
      // Sort: pinned first, then by updatedAt
      return [...notes].sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      })
    }
    const q = searchQuery.toLowerCase()
    return notes.filter(n =>
      n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
    )
  }, [notes, searchQuery])

  const activeNote = notes.find(n => n.id === activeNoteId)

  // Word count for active note
  const activeNoteContent = activeNote?.content || ''

  const wordCount = useMemo(() => {
    if (!activeNoteContent) return 0
    return activeNoteContent.trim().split(/\s+/).filter(Boolean).length
  }, [activeNoteContent])

  if (!mounted) return null

  return (
    <div className={`flex flex-col rounded-xl border border-[var(--vl-border)] bg-[var(--vl-bg-card)] overflow-hidden animate-panel-expand ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--vl-border)] bg-[var(--vl-bg-card)]">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-emerald-500/10">
            <FileText className="size-3.5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xs font-semibold vl-text-heading">{t(lang, 'meetingNotes.title')}</h3>
            <p className="text-[10px] vl-text-muted">{notes.length} {t(lang, 'meetingNotes.noteCount')}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1 mr-1">
            {autoSaveStatus === 'saving' && (
              <span className="text-[9px] text-amber-400 animate-pulse">{t(lang, 'meetingNotes.saving')}</span>
            )}
            {autoSaveStatus === 'saved' && (
              <Check className="size-3 text-emerald-400" />
            )}
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 vl-text-muted hover:text-emerald-400" onClick={exportMarkdown}>
                  <Download className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="vl-dialog text-xs">{t(lang, 'meetingNotes.exportMd')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Search + Add */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--vl-border-subtle)]">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3 vl-text-muted" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t(lang, 'meetingNotes.searchPlaceholder')}
            className="vl-input h-7 pl-8 text-[11px]"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-[10px] border-[var(--vl-border)] vl-text-muted hover:text-emerald-400 hover:border-emerald-500/30"
          onClick={createNote}
        >
          <Plus className="size-3 mr-1" />
          {t(lang, 'meetingNotes.addNote')}
        </Button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar — Note list */}
        <div className="w-48 border-r border-[var(--vl-border-subtle)] flex flex-col bg-[var(--vl-bg-inner)] shrink-0">
          <ScrollArea className="flex-1 max-h-60">
            <div className="p-1.5 space-y-1">
              {filteredNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 px-2">
                  <FileText className="size-5 vl-text-muted mb-2 opacity-30" />
                  <p className="text-[10px] vl-text-muted text-center">
                    {searchQuery ? t(lang, 'meetingNotes.noMatches') : t(lang, 'meetingNotes.noNotes')}
                  </p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {filteredNotes.map(note => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      isActive={note.id === activeNoteId}
                      onSelect={() => setActiveNoteId(note.id)}
                      onPin={() => togglePin(note.id)}
                      onDelete={() => deleteNote(note.id)}
                      lang={lang}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Editor area */}
        <div className="flex-1 flex flex-col min-w-0">
          {activeNote ? (
            <>
              {/* Toolbar */}
              <div className="flex items-center gap-1 px-2 py-1.5 border-b border-[var(--vl-border-subtle)] flex-wrap">
                <ToolbarButton
                  icon={Bold}
                  label={t(lang, 'meetingNotes.bold')}
                  onClick={() => insertFormatting('**', '**')}
                />
                <ToolbarButton
                  icon={Italic}
                  label={t(lang, 'meetingNotes.italic')}
                  onClick={() => insertFormatting('*', '*')}
                />
                <ToolbarButton
                  icon={List}
                  label={t(lang, 'meetingNotes.list')}
                  onClick={() => insertFormatting('- ', '')}
                />
                <ToolbarButton
                  icon={Heading2}
                  label={t(lang, 'meetingNotes.heading')}
                  onClick={() => insertFormatting('## ', '')}
                />
                <div className="w-px h-4 bg-[var(--vl-border-subtle)] mx-1" />
                {isMeetingRunning && (
                  <ToolbarButton
                    icon={Clock}
                    label={t(lang, 'meetingNotes.insertTimestamp')}
                    onClick={insertTimestamp}
                  />
                )}
                <ToolbarButton
                  icon={Pin}
                  label={activeNote.pinned ? t(lang, 'meetingNotes.unpin') : t(lang, 'meetingNotes.pin')}
                  onClick={() => togglePin(activeNote.id)}
                  active={activeNote.pinned}
                />
                <div className="flex-1" />
                <ToolbarButton
                  icon={Copy}
                  label={t(lang, 'common.copy')}
                  onClick={copyContent}
                />
                <ToolbarButton
                  icon={X}
                  label={t(lang, 'common.delete')}
                  onClick={() => deleteNote(activeNote.id)}
                />
              </div>

              {/* Editor */}
              <textarea
                ref={editorRef}
                value={activeNote.content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder={t(lang, 'meetingNotes.placeholder')}
                className="flex-1 min-h-[160px] resize-none bg-transparent text-xs vl-text-body leading-relaxed p-3 focus:outline-none placeholder:vl-text-muted/60"
                style={{ tabSize: 2 }}
              />

              {/* Footer */}
              <div className="flex items-center justify-between px-3 py-1.5 border-t border-[var(--vl-border-subtle)] text-[10px] vl-text-muted">
                <span>
                  {wordCount} {t(lang, 'meetingNotes.words')}
              {activeNoteContent.length} {t(lang, 'meetingNotes.charCount')}
                  {activeNote.timestamps.length > 0 && (
                    <span className="ml-2 flex items-center gap-0.5">
                      <Clock className="size-2.5" />
                      {activeNote.timestamps.length} {t(lang, 'meetingNotes.timestamps')}
                    </span>
                  )}
                </span>
                <span>{new Date(activeNote.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center p-4">
                <FileText className="size-8 vl-text-muted mb-3 opacity-20 mx-auto" />
                <p className="text-xs vl-text-muted">{t(lang, 'meetingNotes.selectOrCreate')}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 text-[10px] border-[var(--vl-border)] vl-text-muted hover:text-emerald-400 hover:border-emerald-500/30"
                  onClick={createNote}
                >
                  <Plus className="size-3 mr-1" />
                  {t(lang, 'meetingNotes.addFirstNote')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
