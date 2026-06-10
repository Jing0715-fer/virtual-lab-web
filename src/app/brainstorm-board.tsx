'use client'

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, ThumbsUp, ThumbsDown, Search, Filter, X,
  Lightbulb, Loader2, Archive, CheckCircle2, ChevronDown, ChevronUp, Trash2, GripVertical
} from 'lucide-react'
import { toast } from 'sonner'

/* ---------- Types ---------- */
type Priority = 'high' | 'medium' | 'low'
type ColumnId = 'ideas' | 'inProgress' | 'decided' | 'archived'

interface KanbanCard {
  id: string
  columnId: ColumnId
  title: string
  description: string
  priority: Priority
  votes: { up: number; down: number }
  userVote: 'up' | 'down' | null
  assignedAgent: string
  agentColor: string
  createdAt: number
  descriptionExpanded: boolean
}

const COLUMNS: { id: ColumnId; title: string; icon: React.ReactNode; color: string }[] = [
  { id: 'ideas', title: 'Ideas', icon: <Lightbulb size={16} />, color: '#f59e0b' },
  { id: 'inProgress', title: 'In Progress', icon: <Loader2 size={16} />, color: '#3b82f6' },
  { id: 'decided', title: 'Decided', icon: <CheckCircle2 size={16} />, color: '#22c55e' },
  { id: 'archived', title: 'Archived', icon: <Archive size={16} />, color: '#64748b' },
]

const AGENT_NAMES = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve']
const AGENT_COLORS = ['#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4']

const STORAGE_KEY = 'vl-brainstorm-board'

let cardIdCounter = 0
const genId = () => `bs-${Date.now()}-${++cardIdCounter}`

const loadCards = (): KanbanCard[] => {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const saveCards = (cards: KanbanCard[]) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards))
  } catch { /* quota */ }
}

/* ---------- Component ---------- */
export function BrainstormBoard() {
  const [cards, setCards] = useState<KanbanCard[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all')
  const [filterAgent, setFilterAgent] = useState<string>('all')
  const [editingTitle, setEditingTitle] = useState<Record<string, boolean>>({})
  const [dragCardId, setDragCardId] = useState<string | null>(null)
  const [overColumnId, setOverColumnId] = useState<ColumnId | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const touchStartRef = useRef<{ cardId: string; columnId: ColumnId; startY: number } | null>(null)
  const [touchDragClone, setTouchDragClone] = useState<{ id: string; x: number; y: number; title: string } | null>(null)

  /* Init */
  useEffect(() => {
    const saved = loadCards()
    if (saved.length > 0) {
      setCards(saved)
    } else {
      const sampleCards: KanbanCard[] = [
        {
          id: genId(), columnId: 'ideas', title: 'Explore CRISPR applications',
          description: 'Research potential applications of CRISPR-Cas9 in therapeutic contexts.',
          priority: 'high', votes: { up: 5, down: 1 }, userVote: null,
          assignedAgent: AGENT_NAMES[0], agentColor: AGENT_COLORS[0],
          createdAt: Date.now() - 86400000, descriptionExpanded: false,
        },
        {
          id: genId(), columnId: 'ideas', title: 'Protein folding simulation',
          description: 'Set up molecular dynamics simulations for target proteins.',
          priority: 'medium', votes: { up: 3, down: 0 }, userVote: null,
          assignedAgent: AGENT_NAMES[1], agentColor: AGENT_COLORS[1],
          createdAt: Date.now() - 172800000, descriptionExpanded: false,
        },
        {
          id: genId(), columnId: 'inProgress', title: 'Literature review on nanobodies',
          description: 'Review recent papers on nanobody engineering and design.',
          priority: 'high', votes: { up: 7, down: 2 }, userVote: null,
          assignedAgent: AGENT_NAMES[2], agentColor: AGENT_COLORS[2],
          createdAt: Date.now() - 43200000, descriptionExpanded: false,
        },
        {
          id: genId(), columnId: 'decided', title: 'Use AlphaFold for predictions',
          description: 'Decided to use AlphaFold-Multimer for structural predictions.',
          priority: 'low', votes: { up: 4, down: 0 }, userVote: null,
          assignedAgent: AGENT_NAMES[3], agentColor: AGENT_COLORS[3],
          createdAt: Date.now() - 259200000, descriptionExpanded: false,
        },
      ]
      setCards(sampleCards)
      saveCards(sampleCards)
    }
  }, [])

  /* Persist */
  useEffect(() => {
    if (cards.length > 0) saveCards(cards)
  }, [cards])

  /* Filtered cards */
  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      if (filterPriority !== 'all' && card.priority !== filterPriority) return false
      if (filterAgent !== 'all' && card.assignedAgent !== filterAgent) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return card.title.toLowerCase().includes(q) || card.description.toLowerCase().includes(q)
      }
      return true
    })
  }, [cards, filterPriority, filterAgent, searchQuery])

  /* Column stats */
  const columnStats = useMemo(() => {
    const stats: Record<ColumnId, number> = { ideas: 0, inProgress: 0, decided: 0, archived: 0 }
    filteredCards.forEach((c) => { stats[c.columnId]++ })
    return stats
  }, [filteredCards])

  /* Add card */
  const addCard = useCallback((columnId: ColumnId) => {
    const agentIdx = Math.floor(Math.random() * AGENT_NAMES.length)
    const newCard: KanbanCard = {
      id: genId(), columnId, title: 'New idea...', description: '',
      priority: 'medium', votes: { up: 0, down: 0 }, userVote: null,
      assignedAgent: AGENT_NAMES[agentIdx], agentColor: AGENT_COLORS[agentIdx],
      createdAt: Date.now(), descriptionExpanded: false,
    }
    setCards((prev) => [...prev, newCard])
    toast('Card added')
  }, [])

  /* Delete card */
  const deleteCard = useCallback((id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id))
    toast('Card removed')
  }, [])

  /* Vote */
  const handleVote = useCallback((cardId: string, type: 'up' | 'down') => {
    setCards((prev) =>
      prev.map((c) => {
        if (c.id !== cardId) return c
        if (c.userVote === type) {
          return { ...c, votes: { ...c.votes, [type]: c.votes[type] - 1 }, userVote: null }
        }
        const undoType = type === 'up' ? 'down' : 'up'
        const newVotes = { ...c.votes, [type]: c.votes[type] + 1 }
        if (c.userVote) newVotes[undoType] = Math.max(0, c.votes[undoType] - 1)
        return { ...c, votes: newVotes, userVote: type }
      })
    )
  }, [])

  /* Update card title */
  const updateCardTitle = useCallback((cardId: string, title: string) => {
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, title } : c)))
  }, [])

  /* Toggle description */
  const toggleDescription = useCallback((cardId: string) => {
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, descriptionExpanded: !c.descriptionExpanded } : c)))
  }, [])

  /* Drag and Drop (mouse) */
  const handleDragStart = useCallback((cardId: string, columnId: ColumnId, e: React.DragEvent) => {
    setDragCardId(cardId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', JSON.stringify({ cardId, columnId }))
  }, [])

  const handleDragOver = useCallback((columnId: ColumnId, e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setOverColumnId(columnId)
  }, [])

  const handleDragLeave = useCallback(() => {
    setOverColumnId(null)
  }, [])

  const handleDrop = useCallback(
    (toColumn: ColumnId, e: React.DragEvent) => {
      e.preventDefault()
      if (!dragCardId) return
      setCards((prev) =>
        prev.map((c) => (c.id === dragCardId ? { ...c, columnId: toColumn } : c))
      )
      setDragCardId(null)
      setOverColumnId(null)
      toast('Card moved')
    },
    [dragCardId]
  )

  const handleDragEnd = useCallback(() => {
    setDragCardId(null)
    setOverColumnId(null)
  }, [])

  /* Touch DnD */
  const handleTouchStartCard = useCallback((cardId: string, columnId: ColumnId, e: React.TouchEvent) => {
    const card = cards.find((c) => c.id === cardId)
    if (!card) return
    touchStartRef.current = { cardId, columnId, startY: e.touches[0].clientY }
    const el = (e.target as HTMLElement).closest('.kanban-card') as HTMLElement
    const rect = el?.getBoundingClientRect()
    if (rect) {
      setTouchDragClone({ id: cardId, x: rect.left, y: rect.top, title: card.title })
    }
  }, [cards])

  const handleTouchMoveCard = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const dy = Math.abs(e.touches[0].clientY - touchStartRef.current.startY)
    if (dy > 20) {
      setTouchDragClone((prev) => prev ? { ...prev, y: e.touches[0].clientY - 30 } : null)
    }
  }, [])

  const handleTouchEndCard = useCallback(() => {
    if (!touchStartRef.current || !touchDragClone) return
    const colElements = boardRef.current?.querySelectorAll('.kanban-column')
    if (colElements) {
      colElements.forEach((el) => {
        const rect = el.getBoundingClientRect()
        const cx = touchDragClone.x + 150
        if (cx >= rect.left && cx <= rect.right) {
          const colId = el.getAttribute('data-column') as ColumnId
          if (colId) {
            setCards((prev) =>
              prev.map((c) =>
                c.id === touchStartRef.current?.cardId ? { ...c, columnId: colId } : c
              )
            )
            toast('Card moved')
          }
        }
      })
    }
    touchStartRef.current = null
    setTouchDragClone(null)
  }, [touchDragClone])

  /* Format relative time */
  const formatTime = (ts: number) => {
    const diff = Date.now() - ts
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return `${Math.floor(diff / 86400000)}d ago`
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--vl-text-muted)] pointer-events-none" />
          <input
            type="text"
            placeholder="Search ideas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-[var(--vl-border)] bg-[var(--vl-bg-card)] text-[var(--vl-text-primary)] outline-none focus:border-[var(--vl-accent)] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--vl-text-muted)] hover:text-[var(--vl-text-primary)] transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-[var(--vl-text-muted)]" />
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as Priority | 'all')}
            className="px-3 py-2 text-xs rounded-lg border border-[var(--vl-border)] bg-[var(--vl-bg-card)] text-[var(--vl-text-primary)] outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={filterAgent}
            onChange={(e) => setFilterAgent(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-[var(--vl-border)] bg-[var(--vl-bg-card)] text-[var(--vl-text-primary)] outline-none"
          >
            <option value="all">All Agents</option>
            {AGENT_NAMES.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Board */}
      <div className="brainstorm-board" ref={boardRef}>
        {COLUMNS.map((column) => {
          const columnCards = filteredCards.filter((c) => c.columnId === column.id)
          return (
            <div
              key={column.id}
              className={`kanban-column ${overColumnId === column.id ? 'is-over' : ''}`}
              data-column={column.id}
              onDragOver={(e) => handleDragOver(column.id, e)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(column.id, e)}
            >
              <div className="kanban-column-header">
                <h3>
                  <span style={{ color: column.color }}>{column.icon}</span>
                  {column.title}
                  <span className="column-count">{columnStats[column.id]}</span>
                </h3>
              </div>

              <div className="kanban-column-body">
                {columnCards.length === 0 && (
                  <div className="flex items-center justify-center h-16 text-xs text-[var(--vl-text-muted)] opacity-60">
                    Drop cards here
                  </div>
                )}

                <AnimatePresence>
                  {columnCards.map((card) => (
                    <motion.div
                      key={card.id}
                      className={`kanban-card ${dragCardId === card.id ? 'is-dragging' : ''}`}
                      draggable={!editingTitle[card.id]}
                      onDragStart={(e) => handleDragStart(card.id, column.id, e)}
                      onDragEnd={handleDragEnd}
                      onTouchStart={(e) => handleTouchStartCard(card.id, column.id, e)}
                      onTouchMove={handleTouchMoveCard}
                      onTouchEnd={handleTouchEndCard}
                      layout
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      style={{ position: 'relative' }}
                    >
                      {/* Delete button */}
                      <button
                        onClick={() => deleteCard(card.id)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[var(--vl-bg-card)] border border-[var(--vl-border)] flex items-center justify-center text-[var(--vl-text-muted)] hover:text-red-500 hover:border-red-300 opacity-0 hover:opacity-100 transition-opacity z-10"
                        aria-label="Delete card"
                      >
                        <Trash2 size={10} />
                      </button>

                      {/* Priority indicator */}
                      <div className={`card-priority priority-${card.priority}`} />

                      {/* Title */}
                      <div
                        className="card-title"
                        contentEditable={editingTitle[card.id]}
                        suppressContentEditableWarning
                        onBlur={(e) => {
                          const newTitle = e.currentTarget.textContent || 'Untitled'
                          updateCardTitle(card.id, newTitle)
                          setEditingTitle((prev) => ({ ...prev, [card.id]: false }))
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            ;(e.target as HTMLElement).blur()
                          }
                        }}
                        onDoubleClick={() =>
                          setEditingTitle((prev) => ({ ...prev, [card.id]: true }))
                        }
                      >
                        {card.title}
                      </div>

                      {/* Description */}
                      {card.description && (
                        <>
                          <div className={`card-description ${card.descriptionExpanded ? 'expanded' : 'collapsed'}`}>
                            {card.description}
                          </div>
                          <button
                            onClick={() => toggleDescription(card.id)}
                            className="flex items-center gap-1 mt-1 text-[10px] text-[var(--vl-text-muted)] hover:text-[var(--vl-text-secondary)] transition-colors"
                          >
                            {card.descriptionExpanded ? (
                              <><ChevronUp size={10} /> Less</>
                            ) : (
                              <><ChevronDown size={10} /> More</>
                            )}
                          </button>
                        </>
                      )}

                      {/* Meta row */}
                      <div className="card-meta">
                        <div className="card-votes">
                          <button
                            className={`vote-btn ${card.userVote === 'up' ? 'voted-up' : ''}`}
                            onClick={() => handleVote(card.id, 'up')}
                            aria-label="Vote up"
                          >
                            <ThumbsUp size={12} />
                          </button>
                          <span className="vote-count">{card.votes.up - card.votes.down}</span>
                          <button
                            className={`vote-btn ${card.userVote === 'down' ? 'voted-down' : ''}`}
                            onClick={() => handleVote(card.id, 'down')}
                            aria-label="Vote down"
                          >
                            <ThumbsDown size={12} />
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="card-time">{formatTime(card.createdAt)}</span>
                          <div
                            className="card-agent-avatar"
                            style={{ background: card.agentColor }}
                            title={card.assignedAgent}
                          >
                            {card.assignedAgent[0]}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Drop placeholder */}
                <AnimatePresence>
                  {overColumnId === column.id && dragCardId && (
                    <motion.div
                      className="drag-placeholder"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 60 }}
                      exit={{ opacity: 0, height: 0 }}
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* Add card */}
              <div className="kanban-column-footer">
                <button
                  onClick={() => addCard(column.id)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs text-[var(--vl-text-muted)] hover:text-[var(--vl-accent)] hover:bg-[var(--vl-accent-bg)] transition-colors"
                >
                  <Plus size={14} /> Add card
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Touch drag clone */}
      <AnimatePresence>
        {touchDragClone && (
          <motion.div
            className="fixed pointer-events-none z-50 px-3 py-2 rounded-lg bg-[var(--vl-bg-card)] border border-[var(--vl-accent)] shadow-lg text-sm text-[var(--vl-text-heading)] font-medium"
            initial={{ opacity: 0.8, scale: 0.95 }}
            animate={{ opacity: 0.95, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{ left: touchDragClone.x, top: touchDragClone.y }}
          >
            <div className="flex items-center gap-2">
              <GripVertical size={12} className="text-[var(--vl-text-muted)]" />
              {touchDragClone.title}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
