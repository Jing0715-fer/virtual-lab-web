'use client'

/**
 * Global Full-Text Search Dialog
 *
 * A beautiful full-screen search dialog with:
 * - Real-time debounced search (300ms)
 * - Results grouped by type (meetings, agents, pipelines, notes)
 * - Type filter chips
 * - Keyboard navigation (Up/Down, Enter, Esc)
 * - Recent searches from localStorage
 * - Fuzzy matching with highlighted excerpts
 * - Theme-aware with .vl-* CSS classes
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, X, Clock, FileText, Bot, GitBranch, Users,
  FlaskConical, SlidersHorizontal, ChevronRight, Loader2,
  Sparkles, BookOpen, ArrowUp, ArrowDown, Command,
} from 'lucide-react'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

// ============================================================
// Types
// ============================================================

export interface SearchResult {
  type: 'meeting' | 'agent' | 'pipeline' | 'note'
  id: string
  title: string
  excerpt: string
  score: number
  metadata: Record<string, any>
}

interface SearchResponse {
  results: SearchResult[]
  total: number
  query: string
  hasNotes: boolean // indicates if client should also search notes locally
}

type SearchType = 'meetings' | 'agents' | 'pipelines' | 'notes'

interface GlobalSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lang: Lang
  onSelectResult?: (result: SearchResult) => void
}

// ============================================================
// Constants
// ============================================================

const TYPE_CONFIG: Record<SearchType, {
  icon: React.ElementType
  labelKey: string
  color: string
  bgColor: string
  chipActive: string
  chipInactive: string
}> = {
  meetings: {
    icon: Users,
    labelKey: 'search.meetings',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/15',
    chipActive: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    chipInactive: 'vl-text-muted border-[var(--vl-border)]',
  },
  agents: {
    icon: Bot,
    labelKey: 'search.agents',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/15',
    chipActive: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
    chipInactive: 'vl-text-muted border-[var(--vl-border)]',
  },
  pipelines: {
    icon: GitBranch,
    labelKey: 'search.pipelines',
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/15',
    chipActive: 'bg-violet-500/20 text-violet-400 border-violet-500/40',
    chipInactive: 'vl-text-muted border-[var(--vl-border)]',
  },
  notes: {
    icon: FileText,
    labelKey: 'search.notes',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/15',
    chipActive: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    chipInactive: 'vl-text-muted border-[var(--vl-border)]',
  },
}

const MAX_RECENT_SEARCHES = 8
const DEBOUNCE_MS = 300

// ============================================================
// Recent Searches Helpers
// ============================================================

function getRecentSearches(): string[] {
  try {
    const saved = localStorage.getItem('vl-recent-searches')
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

function addRecentSearch(query: string) {
  if (!query.trim()) return
  try {
    const prev = getRecentSearches()
    const updated = [query, ...prev.filter(s => s !== query)].slice(0, MAX_RECENT_SEARCHES)
    localStorage.setItem('vl-recent-searches', JSON.stringify(updated))
  } catch { /* ignore */ }
}

function clearRecentSearches() {
  try {
    localStorage.removeItem('vl-recent-searches')
  } catch { /* ignore */ }
}

// ============================================================
// Highlight Matches
// ============================================================

function HighlightedExcerpt({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  const parts: React.ReactNode[] = []
  let lastIdx = 0
  let qi = 0

  // Fuzzy character-by-character match
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      if (ti > lastIdx) {
        parts.push(<span key={`pre-${ti}`}>{text.slice(lastIdx, ti)}</span>)
      }
      parts.push(
        <mark key={`hi-${ti}`} className="bg-emerald-500/30 text-inherit rounded-sm px-0.5">
          {text.slice(ti, ti + 1)}
        </mark>
      )
      lastIdx = ti + 1
      qi++
    }
  }
  if (lastIdx < text.length) {
    parts.push(<span key={`post-${lastIdx}`}>{text.slice(lastIdx)}</span>)
  }
  return <>{parts.length > 0 ? parts : text}</>
}

// ============================================================
// Result Group Component
// ============================================================

function ResultGroup({
  type,
  results,
  query,
  lang,
  activeIndex,
  startIndex,
  onActivate,
  onSelect,
}: {
  type: SearchType
  results: SearchResult[]
  query: string
  lang: Lang
  activeIndex: number
  startIndex: number
  onActivate: (index: number) => void
  onSelect: (result: SearchResult) => void
}) {
  const config = TYPE_CONFIG[type]
  const Icon = config.icon
  const label = t(lang, config.labelKey)

  if (results.length === 0) return null

  return (
    <div className="mb-4">
      {/* Group header */}
      <div className="flex items-center gap-2 px-1 mb-1.5">
        <div className={`w-5 h-5 rounded flex items-center justify-center ${config.bgColor}`}>
          <Icon className={`size-3 ${config.color}`} />
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wider vl-text-muted">
          {label}
        </span>
        <Badge variant="outline" className="h-4 px-1.5 text-[9px] border-[var(--vl-border-subtle)]">
          {results.length}
        </Badge>
      </div>

      {/* Results */}
      <div className="space-y-0.5">
        {results.map((result, i) => {
          const globalIndex = startIndex + i
          const isActive = globalIndex === activeIndex
          return (
            <motion.button
              key={result.id}
              type="button"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03, duration: 0.15 }}
              onClick={() => onSelect(result)}
              onMouseEnter={() => onActivate(globalIndex)}
              className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 cursor-pointer group ${
                isActive
                  ? 'bg-[var(--vl-accent,#10b981)]/10 border border-[var(--vl-accent,#10b981)]/20'
                  : 'hover:bg-[var(--vl-bg-inner)] border border-transparent'
              }`}
              aria-selected={isActive}
            >
              {/* Result icon */}
              <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${config.bgColor}`}>
                <Icon className={`size-3.5 ${config.color}`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium vl-text-heading truncate">{result.title}</span>
                  {/* Type-specific badges */}
                  {result.type === 'meeting' && result.metadata.status && (
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1.5 h-4 shrink-0 border-[var(--vl-border-subtle)] ${
                        result.metadata.status === 'completed' ? 'text-emerald-400' :
                        result.metadata.status === 'running' ? 'text-amber-400' : 'vl-text-muted'
                      }`}
                    >
                      {result.metadata.status}
                    </Badge>
                  )}
                  {result.type === 'agent' && result.metadata.color && (
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 border border-[var(--vl-border-subtle)]"
                      style={{ backgroundColor: result.metadata.color }}
                    />
                  )}
                  {result.type === 'pipeline' && result.metadata.taskCount !== undefined && (
                    <span className="text-[9px] vl-text-muted shrink-0">
                      {result.metadata.taskCount} tasks
                    </span>
                  )}
                </div>
                {/* Excerpt */}
                <p className="text-xs vl-text-muted leading-relaxed line-clamp-2">
                  <HighlightedExcerpt text={result.excerpt} query={query} />
                </p>
              </div>

              {/* Arrow */}
              <ChevronRight className={`size-3.5 shrink-0 mt-2 transition-opacity ${
                isActive ? 'opacity-100 text-[var(--vl-accent,#10b981)]' : 'opacity-0 group-hover:opacity-50'
              }`} />
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================
// Empty State
// ============================================================

function EmptyState({ query, hasSearched, lang }: { query: string; hasSearched: boolean; lang: Lang }) {
  if (!hasSearched) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 px-4"
      >
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
          <Sparkles className="size-7 text-emerald-400/60" />
        </div>
        <p className="text-sm font-medium vl-text-heading mb-1">
          {t(lang, 'search.startTyping')}
        </p>
        <p className="text-xs vl-text-muted text-center max-w-[280px]">
          {t(lang, 'search.startTypingDesc')}
        </p>
        <div className="flex items-center gap-1.5 mt-4">
          <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded bg-[var(--vl-bg-inner)] text-[10px] font-mono vl-text-muted border border-[var(--vl-border-subtle)]">
            <ArrowUp className="size-2.5" />
          </kbd>
          <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded bg-[var(--vl-bg-inner)] text-[10px] font-mono vl-text-muted border border-[var(--vl-border-subtle)]">
            <ArrowDown className="size-2.5" />
          </kbd>
          <span className="text-[10px] vl-text-muted">navigate</span>
          <span className="text-[10px] vl-text-muted mx-1">·</span>
          <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded bg-[var(--vl-bg-inner)] text-[10px] font-mono vl-text-muted border border-[var(--vl-border-subtle)]">
            ↵
          </kbd>
          <span className="text-[10px] vl-text-muted">select</span>
          <span className="text-[10px] vl-text-muted mx-1">·</span>
          <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded bg-[var(--vl-bg-inner)] text-[10px] font-mono vl-text-muted border border-[var(--vl-border-subtle)]">
            esc
          </kbd>
          <span className="text-[10px] vl-text-muted">close</span>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
        <Search className="size-7 text-amber-400/60" />
      </div>
      <p className="text-sm font-medium vl-text-heading mb-1">
        {t(lang, 'search.noResults')}
      </p>
      <p className="text-xs vl-text-muted text-center max-w-[280px]">
        {t(lang, 'search.noResultsFor').replace('{query}', query)}
      </p>
    </motion.div>
  )
}

// ============================================================
// Local Notes Search (for localStorage/IndexedDB notes)
// ============================================================

function searchLocalNotes(query: string): SearchResult[] {
  if (!query.trim()) return []
  const q = query.toLowerCase()
  const results: SearchResult[] = []

  try {
    // Search research notes in localStorage
    const notesData = localStorage.getItem('vl-research-notes')
    if (notesData) {
      const notes = JSON.parse(notesData) as Array<{ id: string; title: string; content: string; tags?: string[]; updatedAt?: string }>
      for (const note of notes) {
        const searchableText = `${note.title} ${note.content} ${(note.tags || []).join(' ')}`.toLowerCase()
        const matchIdx = searchableText.indexOf(q)
        if (matchIdx >= 0) {
          const excerptStart = Math.max(0, matchIdx - 40)
          const excerptEnd = Math.min(note.content.length, matchIdx + q.length + 60)
          const excerpt = (excerptStart > 0 ? '...' : '') + note.content.slice(excerptStart, excerptEnd) + (excerptEnd < note.content.length ? '...' : '')
          results.push({
            type: 'note',
            id: note.id,
            title: note.title,
            excerpt: excerpt.slice(0, 150),
            score: searchableText === q ? 100 : searchableText.startsWith(q) ? 80 : 60,
            metadata: {
              tags: note.tags || [],
              updatedAt: note.updatedAt,
            },
          })
        }
      }
    }
  } catch { /* ignore */ }

  return results.sort((a, b) => b.score - a.score)
}

// ============================================================
// Main Component
// ============================================================

export function GlobalSearchDialog({
  open,
  onOpenChange,
  lang,
  onSelectResult,
}: GlobalSearchDialogProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [activeTypes, setActiveTypes] = useState<Set<SearchType>>(
    new Set(['meetings', 'agents', 'pipelines', 'notes'])
  )
  const [showFilters, setShowFilters] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const resultsListRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load recent searches on mount
  useEffect(() => {
    if (open) {
      setRecentSearches(getRecentSearches())
    }
  }, [open])

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus())
    } else {
      setQuery('')
      setResults([])
      setHasSearched(false)
      setActiveIndex(-1)
      setLoading(false)
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [open])

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(-1)
  }, [results])

  // Perform search
  const performSearch = useCallback(async (searchQuery: string, types: Set<SearchType>) => {
    if (!searchQuery.trim()) {
      setResults([])
      setHasSearched(false)
      setLoading(false)
      return
    }

    setLoading(true)
    setHasSearched(true)

    // Cancel previous request
    if (abortRef.current) {
      abortRef.current.abort()
    }
    const controller = new AbortController()
    abortRef.current = controller

    try {
      // Build types param
      const serverTypes = Array.from(types).filter(t => t !== 'notes')
      const hasNotes = types.has('notes')
      const params = new URLSearchParams({
        q: searchQuery,
        types: serverTypes.join(','),
        limit: '20',
        offset: '0',
      })

      // Fetch server results
      const res = await fetch(`/api/search?${params}`, {
        signal: controller.signal,
      })

      if (!res.ok) {
        throw new Error('Search failed')
      }

      const data: SearchResponse = await res.json()
      let allResults = data.results || []

      // Also search local notes if notes type is active
      if (hasNotes) {
        const localNotes = searchLocalNotes(searchQuery)
        allResults = [...allResults, ...localNotes]
      }

      // Sort by score descending
      allResults.sort((a, b) => b.score - a.score)

      setResults(allResults)
      addRecentSearch(searchQuery)
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        // On error, still search local data as fallback
        if (types.has('notes')) {
          const localNotes = searchLocalNotes(searchQuery)
          setResults(localNotes)
        } else {
          setResults([])
        }
      }
    } finally {
      if (abortRef.current === controller) {
        setLoading(false)
      }
    }
  }, [])

  // Debounced search on query change
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    if (!query.trim()) {
      setResults([])
      setHasSearched(false)
      return
    }

    debounceTimerRef.current = setTimeout(() => {
      performSearch(query, activeTypes)
    }, DEBOUNCE_MS)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [query, activeTypes, performSearch])

  // Keyboard navigation
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex(prev => {
          const next = prev + 1
          return next >= results.length ? 0 : next
        })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex(prev => {
          const next = prev - 1
          return next < 0 ? Math.max(0, results.length - 1) : next
        })
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < results.length) {
          const result = results[activeIndex]
          onSelectResult?.(result)
          onOpenChange(false)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, results, activeIndex, onSelectResult, onOpenChange])

  // Scroll active result into view
  useEffect(() => {
    if (activeIndex >= 0 && resultsListRef.current) {
      const buttons = resultsListRef.current.querySelectorAll('[data-result-button]')
      const activeButton = buttons[activeIndex] as HTMLElement | undefined
      activeButton?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [activeIndex])

  // Toggle type filter
  const toggleType = useCallback((type: SearchType) => {
    setActiveTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) {
        // Don't allow deselecting all
        if (next.size > 1) {
          next.delete(type)
        }
      } else {
        next.add(type)
      }
      return next
    })
  }, [])

  // Select a recent search
  const handleRecentSearch = useCallback((q: string) => {
    setQuery(q)
  }, [])

  // Clear recent searches
  const handleClearRecent = useCallback(() => {
    clearRecentSearches()
    setRecentSearches([])
  }, [])

  // Group results by type
  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {
      meetings: [],
      agents: [],
      pipelines: [],
      notes: [],
    }
    for (const r of results) {
      if (groups[r.type]) {
        groups[r.type].push(r)
      }
    }
    // Sort each group by score
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => b.score - a.score)
    }
    return groups
  }, [results])

  // Compute cumulative indices for keyboard nav
  const typeOrder: SearchType[] = ['meetings', 'agents', 'pipelines', 'notes']
  const cumulativeIndices = useMemo(() => {
    let total = 0
    const map: Record<string, number> = {}
    for (const type of typeOrder) {
      map[type] = total
      total += groupedResults[type]?.length || 0
    }
    return map
  }, [groupedResults])

  // Close handler
  const handleClose = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  if (!open) return null

  const totalResults = results.length
  const showRecent = !query && recentSearches.length > 0

  return (
    <div className="fixed inset-0 z-[110]">
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      />

      {/* Dialog */}
      <motion.div
        className="absolute top-[8%] sm:top-[12%] left-1/2 -translate-x-1/2 w-[95vw] max-w-2xl vl-dialog rounded-2xl border border-[var(--vl-border)] shadow-2xl overflow-hidden"
        initial={{ opacity: 0, scale: 0.96, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -10 }}
        transition={{ type: 'spring', damping: 30, stiffness: 350 }}
      >
        {/* Search Header */}
        <div className="px-4 sm:px-5 pt-4 pb-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-emerald-400/70" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t(lang, 'search.placeholder')}
              className="w-full h-11 pl-10 pr-20 rounded-xl bg-[var(--vl-bg-inner)] border border-[var(--vl-border)] text-sm vl-text-heading placeholder:text-[var(--vl-text-muted)] focus:outline-none focus:border-[var(--vl-accent,#10b981)]/40 focus:ring-1 focus:ring-[var(--vl-accent,#10b981)]/20 transition-all"
              aria-label="Search"
            />
            {/* Right side controls */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {loading && (
                <Loader2 className="size-4 text-emerald-400 animate-spin" />
              )}
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                  showFilters
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'text-[var(--vl-text-muted)] hover:bg-[var(--vl-bg-inner)]'
                }`}
                aria-label="Toggle filters"
              >
                <SlidersHorizontal className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--vl-text-muted)] hover:bg-[var(--vl-bg-inner)] transition-colors"
                aria-label="Close"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Type Filter Chips */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {typeOrder.map(type => {
                    const config = TYPE_CONFIG[type]
                    const Icon = config.icon
                    const isActive = activeTypes.has(type)
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => toggleType(type)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium border transition-all cursor-pointer ${
                          isActive ? config.chipActive : config.chipInactive
                        }`}
                      >
                        <Icon className="size-3" />
                        {t(lang, config.labelKey)}
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Results Area */}
        <div
          ref={resultsListRef}
          className="px-4 sm:px-5 pb-4 max-h-[50vh] overflow-y-auto custom-scrollbar"
        >
          {/* Recent Searches */}
          <AnimatePresence mode="wait">
            {showRecent && !hasSearched && (
              <motion.div
                key="recent"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-medium uppercase tracking-wider vl-text-muted flex items-center gap-1.5">
                    <Clock className="size-3" />
                    {t(lang, 'search.recentSearches')}
                  </p>
                  <button
                    type="button"
                    onClick={handleClearRecent}
                    className="text-[10px] vl-text-muted hover:text-[var(--vl-accent,#10b981)] transition-colors"
                  >
                    {t(lang, 'search.clearRecent')}
                  </button>
                </div>
                <div className="space-y-0.5">
                  {recentSearches.map((term, i) => (
                    <motion.button
                      key={term}
                      type="button"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => handleRecentSearch(term)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-[var(--vl-bg-inner)] transition-colors cursor-pointer group"
                    >
                      <Clock className="size-3.5 text-[var(--vl-text-muted)] group-hover:text-[var(--vl-accent,#10b981)]/60" />
                      <span className="text-sm vl-text-body">{term}</span>
                      <ArrowUp className="size-3 ml-auto opacity-0 group-hover:opacity-50 rotate-90 text-[var(--vl-text-muted)]" />
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Search Results */}
            {(hasSearched || loading) && (
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Results count */}
                {hasSearched && totalResults > 0 && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-medium vl-text-muted">
                      {totalResults} {t(lang, 'search.resultCount').replace('{count}', String(totalResults))}
                    </span>
                  </div>
                )}

                {/* Grouped results */}
                {typeOrder.map(type => {
                  const groupResults = groupedResults[type] || []
                  if (groupResults.length === 0) return null
                  return (
                    <ResultGroup
                      key={type}
                      type={type}
                      results={groupResults}
                      query={query}
                      lang={lang}
                      activeIndex={activeIndex}
                      startIndex={cumulativeIndices[type]}
                      onActivate={setActiveIndex}
                      onSelect={(result) => {
                        onSelectResult?.(result)
                        onOpenChange(false)
                      }}
                    />
                  )
                })}

                {/* Loading state */}
                {loading && results.length === 0 && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="size-5 text-emerald-400 animate-spin" />
                    <span className="text-xs vl-text-muted ml-2">{t(lang, 'search.searching')}</span>
                  </div>
                )}

                {/* Empty state */}
                {!loading && hasSearched && totalResults === 0 && (
                  <EmptyState query={query} hasSearched={hasSearched} lang={lang} />
                )}
              </motion.div>
            )}

            {/* Initial empty state */}
            {!hasSearched && !showRecent && (
              <EmptyState query={query} hasSearched={false} lang={lang} />
            )}
          </AnimatePresence>
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
            <Command className="size-3" />
            <span>K</span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
