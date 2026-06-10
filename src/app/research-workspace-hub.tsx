'use client'

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Lightbulb, GitBranch, StickyNote, Plus, Search,
  Download, Upload, Clock, FileText, BarChart3, Sparkles,
  ChevronRight, Trash2, Activity
} from 'lucide-react'
import { toast } from 'sonner'
import { CollaborativeWorkspace } from './collab-workspace'
import { BrainstormBoard } from './brainstorm-board'
import { DecisionMatrix } from './decision-matrix'

/* ---------- Types ---------- */
type TabId = 'canvas' | 'brainstorm' | 'matrix'

interface TabDef {
  id: TabId
  title: string
  icon: React.ReactNode
  description: string
  emptyIcon: React.ReactNode
  emptyTitle: string
  emptyDesc: string
}

const TABS: TabDef[] = [
  {
    id: 'canvas', title: 'Canvas', icon: <LayoutDashboard size={16} />,
    description: 'Free-form collaborative canvas',
    emptyIcon: <StickyNote size={32} />, emptyTitle: 'Open Canvas',
    emptyDesc: 'An infinite canvas for brainstorming with sticky notes and connections.',
  },
  {
    id: 'brainstorm', title: 'Brainstorm', icon: <Lightbulb size={16} />,
    description: 'Kanban-style ideation board',
    emptyIcon: <Sparkles size={32} />, emptyTitle: 'Start Brainstorming',
    emptyDesc: 'Organize ideas, vote on priorities, and track decisions.',
  },
  {
    id: 'matrix', title: 'Decision Matrix', icon: <GitBranch size={16} />,
    description: 'Weighted decision analysis',
    emptyIcon: <BarChart3 size={32} />, emptyTitle: 'Build a Matrix',
    emptyDesc: 'Compare options with weighted criteria to make data-driven decisions.',
  },
]

/* ---------- Helpers ---------- */
const loadRecentWork = (): Array<{ id: string; title: string; tab: TabId; timestamp: number }> => {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem('vl-workspace-recent')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const saveRecentWork = (items: Array<{ id: string; title: string; tab: TabId; timestamp: number }>) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem('vl-workspace-recent', JSON.stringify(items.slice(0, 10)))
  } catch { /* quota */ }
}

const formatTime = (ts: number) => {
  const diff = Date.now() - ts
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

/* ---------- Component ---------- */
export function ResearchWorkspaceHub() {
  const [activeTab, setActiveTab] = useState<TabId>('canvas')
  const [recentWork, setRecentWork] = useState<Array<{ id: string; title: string; tab: TabId; timestamp: number }>>(() => {
    if (typeof window === 'undefined') return []
    return loadRecentWork()
  })
  const [searchQuery, setSearchQuery] = useState('')
  const canvasReady = true
  const brainstormReady = true
  const matrixReady = true
  const [stats, setStats] = useState({ totalNotes: 0, totalCards: 0, totalOptions: 0, lastActivity: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)

  /* Track tab visits */
  const trackVisit = useCallback((tabId: TabId) => {
    setActiveTab(tabId)
    setRecentWork((prev) => {
      const existing = prev.find((r) => r.tab === tabId)
      const entry = {
        id: existing?.id || `recent-${Date.now()}`,
        title: `${tabId.charAt(0).toUpperCase() + tabId.slice(1)} Session`,
        tab: tabId,
        timestamp: Date.now(),
      }
      const filtered = prev.filter((r) => r.tab !== tabId)
      return [entry, ...filtered].slice(0, 10)
    })
  }, [])

  /* Update stats from localStorage */
  useEffect(() => {
    const updateStats = () => {
      let totalNotes = 0, totalCards = 0, totalOptions = 0, lastActivity = 0

      try {
        const canvasRaw = localStorage.getItem('vl-collab-workspace')
        if (canvasRaw) {
          const canvasData = JSON.parse(canvasRaw)
          totalNotes = (canvasData.notes || []).length
          lastActivity = Math.max(lastActivity, Date.now())
        }
      } catch { /* ignore */ }

      try {
        const boardRaw = localStorage.getItem('vl-brainstorm-board')
        if (boardRaw) {
          const boardData = JSON.parse(boardRaw)
          totalCards = boardData.length || 0
          if (boardData.length > 0) {
            lastActivity = Math.max(lastActivity, Math.max(...boardData.map((c: { createdAt: number }) => c.createdAt)))
          }
        }
      } catch { /* ignore */ }

      try {
        const matrixRaw = localStorage.getItem('vl-decision-matrix')
        if (matrixRaw) {
          const matrixData = JSON.parse(matrixRaw)
          totalOptions = (matrixData.options || []).length
          lastActivity = Math.max(lastActivity, matrixData.lastModified || 0)
        }
      } catch { /* ignore */ }

      setStats({ totalNotes, totalCards, totalOptions, lastActivity })
    }

    updateStats()
    const interval = setInterval(updateStats, 5000)
    return () => clearInterval(interval)
  }, [activeTab])

  /* Persist recent work */
  useEffect(() => {
    saveRecentWork(recentWork)
  }, [recentWork])

  /* Export all data */
  const exportAll = useCallback(() => {
    const data: Record<string, unknown> = {}
    try {
      const canvas = localStorage.getItem('vl-collab-workspace')
      if (canvas) data.canvas = JSON.parse(canvas)
    } catch { /* ignore */ }
    try {
      const board = localStorage.getItem('vl-brainstorm-board')
      if (board) data.brainstorm = JSON.parse(board)
    } catch { /* ignore */ }
    try {
      const matrix = localStorage.getItem('vl-decision-matrix')
      if (matrix) data.matrix = JSON.parse(matrix)
    } catch { /* ignore */ }

    data.exportedAt = new Date().toISOString()

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `workspace-export-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast('All workspace data exported!')
  }, [])

  /* Import data */
  const importData = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (data.canvas) localStorage.setItem('vl-collab-workspace', JSON.stringify(data.canvas))
        if (data.brainstorm) localStorage.setItem('vl-brainstorm-board', JSON.stringify(data.brainstorm))
        if (data.matrix) localStorage.setItem('vl-decision-matrix', JSON.stringify(data.matrix))
        toast('Workspace data imported! Refresh to see changes.')
        window.location.reload()
      } catch {
        toast.error('Invalid file format')
      }
    }
    reader.readAsText(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  /* Quick actions */
  const handleNewCanvas = () => {
    localStorage.removeItem('vl-collab-workspace')
    setActiveTab('canvas')
    toast('New canvas created')
  }

  const handleNewBrainstorm = () => {
    localStorage.removeItem('vl-brainstorm-board')
    setActiveTab('brainstorm')
    toast('New brainstorm board created')
  }

  /* Search across items */
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null
    const q = searchQuery.toLowerCase()
    const results: Array<{ type: string; title: string; tab: TabId }> = []

    try {
      const canvas = JSON.parse(localStorage.getItem('vl-collab-workspace') || '{}')
      ;(canvas.notes || []).forEach((n: { text: string }) => {
        if (n.text.toLowerCase().includes(q)) {
          results.push({ type: 'Note', title: n.text.slice(0, 50), tab: 'canvas' })
        }
      })
    } catch { /* ignore */ }

    try {
      const board = JSON.parse(localStorage.getItem('vl-brainstorm-board') || '[]') as Array<{ title: string; description: string }>
      board.forEach((c) => {
        if (c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)) {
          results.push({ type: 'Card', title: c.title, tab: 'brainstorm' })
        }
      })
    } catch { /* ignore */ }

    try {
      const matrix = JSON.parse(localStorage.getItem('vl-decision-matrix') || '{}')
      ;(matrix.options || []).forEach((o: { name: string }) => {
        if (o.name.toLowerCase().includes(q)) {
          results.push({ type: 'Option', title: o.name, tab: 'matrix' })
        }
      })
    } catch { /* ignore */ }

    return results.slice(0, 10)
  }, [searchQuery])

  /* Current tab def */
  const currentTab = TABS.find((t) => t.id === activeTab)



  return (
    <div className="flex flex-col gap-4 w-full" style={{ minHeight: 'calc(100vh - 200px)' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--vl-text-heading)] flex items-center gap-2">
            <Activity size={22} className="text-[var(--vl-accent)]" />
            Research Workspace
          </h1>
          <p className="text-sm text-[var(--vl-text-muted)] mt-0.5">
            Collaborative tools for research ideation, analysis, and decision-making.
          </p>
        </div>

        {/* Import/Export */}
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={importData}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-[var(--vl-border)] bg-[var(--vl-bg-card)] text-[var(--vl-text-secondary)] hover:border-[var(--vl-accent)] hover:text-[var(--vl-accent)] transition-colors"
          >
            <Upload size={13} /> Import
          </button>
          <button
            onClick={exportAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-[var(--vl-border)] bg-[var(--vl-bg-card)] text-[var(--vl-text-secondary)] hover:border-[var(--vl-accent)] hover:text-[var(--vl-accent)] transition-colors"
          >
            <Download size={13} /> Export All
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="workspace-hub-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`workspace-hub-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => trackVisit(tab.id)}
            >
              {tab.icon}
              <span>{tab.title}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-[240px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--vl-text-muted)] pointer-events-none" />
          <input
            type="text"
            placeholder="Search workspace..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[var(--vl-border)] bg-[var(--vl-bg-card)] text-[var(--vl-text-primary)] outline-none focus:border-[var(--vl-accent)] transition-colors"
          />
        </div>
      </div>

      {/* Search Results */}
      <AnimatePresence>
        {searchResults && searchQuery && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 rounded-xl border border-[var(--vl-border)] bg-[var(--vl-bg-secondary)]">
              <div className="text-xs font-medium text-[var(--vl-text-muted)] mb-2">
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
              </div>
              {searchResults.length === 0 ? (
                <div className="text-sm text-[var(--vl-text-muted)]">No items found.</div>
              ) : (
                <div className="flex flex-col gap-1">
                  {searchResults.map((r, idx) => (
                    <button
                      key={idx}
                      onClick={() => { trackVisit(r.tab); setSearchQuery('') }}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--vl-bg-card)] transition-colors text-left"
                    >
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--vl-accent-bg)] text-[var(--vl-accent)]">
                        {r.type}
                      </span>
                      <span className="text-sm text-[var(--vl-text-heading)] truncate">{r.title}</span>
                      <ChevronRight size={12} className="text-[var(--vl-text-muted)] ml-auto" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Actions + Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="quick-actions-bar border border-[var(--vl-border)] rounded-xl bg-[var(--vl-bg-card)]">
          <button
            onClick={handleNewCanvas}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg text-[var(--vl-text-secondary)] hover:bg-[var(--vl-accent-bg)] hover:text-[var(--vl-accent)] transition-colors"
          >
            <Plus size={13} /> New Canvas
          </button>
          <button
            onClick={handleNewBrainstorm}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg text-[var(--vl-text-secondary)] hover:bg-[var(--vl-accent-bg)] hover:text-[var(--vl-accent)] transition-colors"
          >
            <Plus size={13} /> New Brainstorm
          </button>
        </div>

        {/* Stats */}
        <div className="stats-bar">
          <div className="stat-item">
            <StickyNote size={12} />
            <span className="stat-value">{stats.totalNotes}</span> notes
          </div>
          <div className="stat-item">
            <FileText size={12} />
            <span className="stat-value">{stats.totalCards}</span> cards
          </div>
          <div className="stat-item">
            <BarChart3 size={12} />
            <span className="stat-value">{stats.totalOptions}</span> options
          </div>
          {stats.lastActivity > 0 && (
            <div className="stat-item">
              <Clock size={12} />
              <span>Last activity: {formatTime(stats.lastActivity)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Recent Work */}
      <AnimatePresence>
        {recentWork.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="text-xs font-medium text-[var(--vl-text-muted)] mb-2">Recent Work</div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {recentWork.slice(0, 3).map((item) => (
                <button
                  key={item.id}
                  onClick={() => trackVisit(item.tab)}
                  className="recent-work-card shrink-0"
                >
                  <div className="recent-title flex items-center gap-2">
                    {TABS.find((t) => t.id === item.tab)?.icon}
                    {item.title}
                  </div>
                  <div className="recent-time">{formatTime(item.timestamp)}</div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'canvas' && canvasReady && (
          <motion.div
            key="canvas"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full rounded-xl border border-[var(--vl-border)] bg-[var(--vl-bg-card)] overflow-hidden"
            style={{ height: 'calc(100vh - 380px)', minHeight: 500 }}
          >
            <CollaborativeWorkspace />
          </motion.div>
        )}

        {activeTab === 'brainstorm' && brainstormReady && (
          <motion.div
            key="brainstorm"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full"
          >
            <BrainstormBoard />
          </motion.div>
        )}

        {activeTab === 'matrix' && matrixReady && (
          <motion.div
            key="matrix"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full"
          >
            <DecisionMatrix />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State (shown when no data in current tab) */}
      {!searchQuery && stats.totalNotes === 0 && stats.totalCards === 0 && stats.totalOptions === 0 && (
        <div className="workspace-empty-state" style={{ position: 'relative', zIndex: 5 }}>
          <div className="empty-icon">{currentTab?.emptyIcon}</div>
          <h3>{currentTab?.emptyTitle}</h3>
          <p>{currentTab?.emptyDesc}</p>
        </div>
      )}
    </div>
  )
}

