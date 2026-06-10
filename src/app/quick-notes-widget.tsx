'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { StickyNote, Plus, Search, Trash2, Pencil, ChevronUp, ChevronDown, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

interface Note {
  id: string
  title: string
  content: string
  color: NoteColor
  createdAt: string
}

type NoteColor = 'emerald' | 'blue' | 'violet' | 'amber' | 'rose' | 'cyan'

const NOTE_COLORS: NoteColor[] = ['emerald', 'blue', 'violet', 'amber', 'rose', 'cyan']
const STORAGE_KEY = 'vl-quick-notes'
const MAX_NOTES = 10

function getNoteColorClass(color: NoteColor): string {
  return `note-color-${color}`
}

function getNoteColorDot(color: NoteColor): string {
  const map: Record<NoteColor, string> = {
    emerald: 'bg-emerald-400',
    blue: 'bg-blue-400',
    violet: 'bg-violet-400',
    amber: 'bg-amber-400',
    rose: 'bg-rose-400',
    cyan: 'bg-cyan-400',
  }
  return map[color]
}

export function QuickNotesWidget({ lang }: { lang: Lang }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editColor, setEditColor] = useState<NoteColor>('emerald')
  const [mounted, setMounted] = useState(false)

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        requestAnimationFrame(() => { setNotes(JSON.parse(stored)) })
      }
    } catch { /* ignore */ }
    requestAnimationFrame(() => { setMounted(true) })
  }, [])

  // Save to localStorage
  useEffect(() => {
    if (mounted) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
      } catch { /* ignore */ }
    }
  }, [notes, mounted])

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes
    const q = searchQuery.toLowerCase()
    return notes.filter(
      n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
    )
  }, [notes, searchQuery])

  const handleAddNote = useCallback(() => {
    if (notes.length >= MAX_NOTES) return
    const newNote: Note = {
      id: `note-${Date.now()}`,
      title: '',
      content: '',
      color: NOTE_COLORS[notes.length % NOTE_COLORS.length],
      createdAt: new Date().toISOString(),
    }
    setNotes(prev => [newNote, ...prev])
    setEditingId(newNote.id)
    setEditTitle('')
    setEditContent('')
    setEditColor(newNote.color)
  }, [notes.length])

  const handleSaveNote = useCallback(() => {
    if (!editingId) return
    setNotes(prev =>
      prev.map(n =>
        n.id === editingId
          ? { ...n, title: editTitle || t(lang, 'dashboard.widgets.quickNotes.noteTitle'), content: editContent, color: editColor }
          : n
      )
    )
    setEditingId(null)
  }, [editingId, editTitle, editContent, editColor, lang])

  const handleDeleteNote = useCallback((id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id))
    if (editingId === id) setEditingId(null)
  }, [editingId])

  const handleStartEdit = useCallback((note: Note) => {
    setEditingId(note.id)
    setEditTitle(note.title)
    setEditContent(note.content)
    setEditColor(note.color)
  }, [])

  const handleMoveNote = useCallback((id: string, direction: 'up' | 'down') => {
    setNotes(prev => {
      const idx = prev.findIndex(n => n.id === id)
      if (idx < 0) return prev
      if (direction === 'up' && idx <= 0) return prev
      if (direction === 'down' && idx >= prev.length - 1) return prev
      const newNotes = [...prev]
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      ;[newNotes[idx], newNotes[swapIdx]] = [newNotes[swapIdx], newNotes[idx]]
      return newNotes
    })
  }, [])

  if (!mounted) return null

  const isEditing = editingId !== null

  return (
    <div className="space-y-3">
      {/* Header with search and add */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 vl-text-muted" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t(lang, 'dashboard.widgets.quickNotes.searchNotes')}
            className="vl-input h-8 text-xs pl-9 rounded-lg"
          />
        </div>
        <Button
          size="sm"
          onClick={handleAddNote}
          disabled={notes.length >= MAX_NOTES}
          className="h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg shrink-0"
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      {notes.length === 0 ? (
        <div className="vl-inner rounded-xl py-8 flex flex-col items-center justify-center">
          <StickyNote className="size-8 vl-text-muted mb-2 vl-float-animation" />
          <p className="text-xs vl-text-muted">{t(lang, 'dashboard.widgets.quickNotes.noNotes')}</p>
          <p className="text-[10px] vl-text-muted mt-1">{t(lang, 'dashboard.widgets.quickNotes.noNotesDesc')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 max-h-[280px] overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="popLayout">
            {filteredNotes.map((note, idx) => (
              <motion.div
                key={note.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.2 }}
                className="relative"
              >
                {editingId === note.id ? (
                  /* Edit mode */
                  <div className={`note-card note-enter rounded-lg p-3 border ${getNoteColorClass(editColor)} space-y-2`}>
                    <Input
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      placeholder={t(lang, 'dashboard.widgets.quickNotes.noteTitle')}
                      className="vl-input h-7 text-xs rounded-md"
                    />
                    <textarea
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      placeholder={t(lang, 'dashboard.widgets.quickNotes.noteContent')}
                      rows={3}
                      className="vl-input w-full text-xs rounded-md resize-none p-2"
                    />
                    {/* Color picker */}
                    <div className="flex gap-1.5">
                      {NOTE_COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => setEditColor(c)}
                          className={`w-4 h-4 rounded-full border-2 transition-all ${getNoteColorDot(c)} ${editColor === c ? 'scale-125 ring-2 ring-offset-1 ring-[var(--vl-bg-card)]' : 'opacity-60 hover:opacity-100'}`}
                        />
                      ))}
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <Button size="sm" onClick={handleSaveNote} className="h-6 px-2 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white rounded">
                        <Check className="size-3" />
                      </Button>
                      <Button size="sm" onClick={() => setEditingId(null)} variant="ghost" className="h-6 px-2 text-[10px] vl-text-muted rounded">
                        <X className="size-3" />
                      </Button>
                      <span className="ml-auto text-[9px] vl-text-muted">
                        {editContent.length} {t(lang, 'dashboard.widgets.quickNotes.characters')}
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Display mode */
                  <div className={`note-card rounded-lg p-3 border ${getNoteColorClass(note.color)} group`}>
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="text-xs font-semibold vl-text-heading truncate flex-1">{note.title || t(lang, 'dashboard.widgets.quickNotes.noteTitle')}</h4>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={() => handleStartEdit(note)} className="p-1 rounded hover:bg-white/20 transition-colors" title={t(lang, 'dashboard.widgets.quickNotes.editNote')}>
                          <Pencil className="size-3 vl-text-muted" />
                        </button>
                        <button onClick={() => handleDeleteNote(note.id)} className="p-1 rounded hover:bg-white/20 transition-colors" title={t(lang, 'dashboard.widgets.quickNotes.deleteNote')}>
                          <Trash2 className="size-3 text-rose-400" />
                        </button>
                      </div>
                    </div>
                    {note.content && (
                      <p className="text-[10px] vl-text-body mt-1 line-clamp-3 leading-relaxed">{note.content}</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[9px] vl-text-muted">{note.content.length} {t(lang, 'dashboard.widgets.quickNotes.characters')}</span>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleMoveNote(note.id, 'up')} disabled={idx === 0} className="p-0.5 rounded hover:bg-white/20 transition-colors disabled:opacity-30" title={t(lang, 'dashboard.widgets.quickNotes.moveUp')}>
                          <ChevronUp className="size-3 vl-text-muted" />
                        </button>
                        <button onClick={() => handleMoveNote(note.id, 'down')} disabled={idx === filteredNotes.length - 1} className="p-0.5 rounded hover:bg-white/20 transition-colors disabled:opacity-30" title={t(lang, 'dashboard.widgets.quickNotes.moveDown')}>
                          <ChevronDown className="size-3 vl-text-muted" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {notes.length >= MAX_NOTES && (
        <p className="text-[10px] text-amber-500 text-center">{t(lang, 'dashboard.widgets.quickNotes.maxNotes')}</p>
      )}
    </div>
  )
}
