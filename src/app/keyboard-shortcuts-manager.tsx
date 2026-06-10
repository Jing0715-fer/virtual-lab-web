'use client'

/**
 * Advanced Keyboard Shortcuts Manager
 *
 * Comprehensive keyboard shortcuts system with:
 * - 20+ registered shortcuts for common actions
 * - Visual shortcut hint badges (ShortcutBadge)
 * - Conflict detection when shortcuts overlap
 * - ShortcutsHelpOverlay dialog
 * - useKeyboardShortcuts() hook for integration
 * - Onboarding tooltip for first-time shortcut use
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Keyboard, Search, X, ChevronDown, ChevronRight,
  Navigation, Zap, Users, GitBranch, Settings, HelpCircle,
  LayoutDashboard, Bot, MessageSquare, History, Eye, Maximize2,
  Moon, Sun, Timer, BookOpen, Download, Plus, ArrowLeft, ArrowRight,
  ShieldAlert, Command, Sparkles, Volume2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

// ============================================================
// Types
// ============================================================

export type ShortcutCategory = 'navigation' | 'actions' | 'meeting' | 'general' | 'focus'

export interface ShortcutDef {
  id: string
  keys: string              // Display string, e.g. "Ctrl+K"
  combo: string             // Internal combo key, e.g. "ctrl+k"
  description: string
  category: ShortcutCategory
  action?: () => void
  conflicts?: string[]      // IDs of conflicting shortcuts
}

interface CategoryInfo {
  id: ShortcutCategory
  label: string
  icon: React.ElementType
  color: string
}

interface ShortcutsHelpOverlayProps {
  open: boolean
  onClose: () => void
  shortcuts?: ShortcutDef[]
}

// ============================================================
// Category Configuration
// ============================================================

const CATEGORIES: CategoryInfo[] = [
  { id: 'navigation', label: 'Navigation', icon: Navigation, color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' },
  { id: 'actions', label: 'Actions', icon: Zap, color: 'text-amber-400 bg-amber-500/15 border-amber-500/30' },
  { id: 'meeting', label: 'Meetings', icon: Users, color: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30' },
  { id: 'focus', label: 'Focus & View', icon: Eye, color: 'text-violet-400 bg-violet-500/15 border-violet-500/30' },
  { id: 'general', label: 'General', icon: Settings, color: 'text-orange-400 bg-orange-500/15 border-orange-500/30' },
]

// ============================================================
// Default Shortcuts Definitions (20+ shortcuts)
// ============================================================

export const DEFAULT_SHORTCUTS: ShortcutDef[] = [
  // Navigation
  { id: 'global-search', keys: 'Ctrl+K / ⌘K', combo: 'ctrl+k', description: 'Open Global Search', category: 'navigation' },
  { id: 'slash-search', keys: '/', combo: '/', description: 'Open Global Search', category: 'navigation', conflicts: ['global-search'] },
  { id: 'tab-dashboard', keys: 'Ctrl+1', combo: 'ctrl+1', description: 'Switch to Dashboard', category: 'navigation' },
  { id: 'tab-agents', keys: 'Ctrl+2', combo: 'ctrl+2', description: 'Switch to Agents', category: 'navigation' },
  { id: 'tab-team', keys: 'Ctrl+3', combo: 'ctrl+3', description: 'Switch to Team Meeting', category: 'navigation' },
  { id: 'tab-individual', keys: 'Ctrl+4', combo: 'ctrl+4', description: 'Switch to Individual Meeting', category: 'navigation' },
  { id: 'tab-history', keys: 'Ctrl+5', combo: 'ctrl+5', description: 'Switch to History', category: 'navigation' },
  { id: 'tab-pipeline', keys: 'Ctrl+6', combo: 'ctrl+6', description: 'Switch to Pipeline', category: 'navigation' },
  { id: 'tab-knowledge', keys: 'Ctrl+7', combo: 'ctrl+7', description: 'Switch to Knowledge Base', category: 'navigation' },
  { id: 'tab-settings', keys: 'Ctrl+8', combo: 'ctrl+8', description: 'Switch to Settings', category: 'navigation' },
  { id: 'nav-left', keys: 'Alt+←', combo: 'alt+arrowleft', description: 'Navigate to Previous Tab', category: 'navigation' },
  { id: 'nav-right', keys: 'Alt+→', combo: 'alt+arrowright', description: 'Navigate to Next Tab', category: 'navigation' },
  { id: 'go-history', keys: 'Ctrl+H', combo: 'ctrl+h', description: 'Go to History', category: 'navigation' },
  { id: 'go-knowledge', keys: 'Ctrl+L', combo: 'ctrl+l', description: 'Go to Knowledge Base', category: 'navigation' },

  // Actions
  { id: 'new-meeting', keys: 'Ctrl+N', combo: 'ctrl+n', description: 'New Meeting', category: 'actions' },
  { id: 'new-agent', keys: 'Ctrl+Shift+N', combo: 'ctrl+shift+n', description: 'New Agent', category: 'actions' },
  { id: 'export-data', keys: 'Ctrl+Shift+E', combo: 'ctrl+shift+e', description: 'Export Data', category: 'actions' },
  { id: 'go-meeting', keys: 'Ctrl+G', combo: 'ctrl+g', description: 'Quick Meeting Switcher', category: 'actions' },
  { id: 'rerun-meeting', keys: 'Ctrl+Shift+R', combo: 'ctrl+shift+r', description: 'Quick Re-run Last Meeting', category: 'actions' },

  // Focus & View
  { id: 'toggle-focus', keys: 'Ctrl+.', combo: 'ctrl+.', description: 'Toggle Focus Mode', category: 'focus' },
  { id: 'toggle-fullscreen', keys: 'Ctrl+Shift+F', combo: 'ctrl+shift+f', description: 'Toggle Full Screen', category: 'focus' },
  { id: 'toggle-sidebar', keys: 'Ctrl+B', combo: 'ctrl+b', description: 'Toggle Sidebar / Collaboration Panel', category: 'focus' },

  // Meetings
  { id: 'scroll-latest', keys: 'Space', combo: 'space', description: 'Scroll to Latest Message', category: 'meeting' },

  // General
  { id: 'toggle-theme', keys: 'Ctrl+D', combo: 'ctrl+d', description: 'Toggle Dark/Light Theme', category: 'general' },
  { id: 'show-help', keys: 'Ctrl+/', combo: 'ctrl+/', description: 'Show Shortcuts Help', category: 'general' },
  { id: 'close-dialog', keys: 'Escape', combo: 'escape', description: 'Close Dialogs / Modals / Overlays', category: 'general' },
]

// ============================================================
// Conflict Detection Utility
// ============================================================

export function detectConflicts(shortcuts: ShortcutDef[]): Map<string, string[]> {
  const conflicts = new Map<string, string[]>()
  const comboMap = new Map<string, ShortcutDef[]>()

  for (const s of shortcuts) {
    const combo = s.combo.toLowerCase()
    const existing = comboMap.get(combo)
    if (existing) {
      existing.push(s)
    } else {
      comboMap.set(combo, [s])
    }
  }

  for (const [, group] of comboMap) {
    if (group.length > 1) {
      for (const s of group) {
        const others = group.filter(o => o.id !== s.id).map(o => o.id)
        conflicts.set(s.id, others)
      }
    }
  }

  // Also check explicitly declared conflicts
  for (const s of shortcuts) {
    if (s.conflicts) {
      const current = conflicts.get(s.id) || []
      for (const c of s.conflicts) {
        if (!current.includes(c)) current.push(c)
      }
      conflicts.set(s.id, current)
    }
  }

  return conflicts
}

// ============================================================
// ShortcutBadge Component
// ============================================================

export function ShortcutBadge({ shortcut, size = 'sm', className = '' }: {
  shortcut: string
  size?: 'xs' | 'sm' | 'md'
  className?: string
}) {
  const sizeClasses = {
    xs: 'min-w-[16px] h-4 px-1 text-[8px]',
    sm: 'min-w-[20px] h-5 px-1.5 text-[9px]',
    md: 'min-w-[24px] h-6 px-2 text-[10px]',
  }

  const keys = shortcut.split('+').map(k => k.trim())

  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      {keys.map((key, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="text-[8px] vl-text-muted opacity-50">+</span>}
          <kbd className={`
            inline-flex items-center justify-center rounded
            font-mono font-medium
            bg-[var(--vl-bg-inner)] text-[var(--vl-text-muted)]
            border border-[var(--vl-border-subtle)]
            ${sizeClasses[size]}
          `}>
            {key === 'ArrowLeft' ? '←' : key === 'ArrowRight' ? '→' : key === 'Shift' ? '⇧' : key === 'Ctrl' ? '⌃' : key === 'Escape' ? 'Esc' : key}
          </kbd>
        </React.Fragment>
      ))}
    </span>
  )
}

// ============================================================
// Onboarding Tooltip
// ============================================================

export function ShortcutOnboardingTooltip({ visible, shortcut, description, position = 'bottom' }: {
  visible: boolean
  shortcut: string
  description: string
  position?: 'top' | 'bottom'
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: position === 'bottom' ? -4 : 4, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: position === 'bottom' ? -4 : 4, scale: 0.95 }}
          className={`absolute ${position === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2'} left-1/2 -translate-x-1/2 z-50 pointer-events-none`}
        >
          <div className="bg-[var(--vl-bg-card)] border border-[var(--vl-border)] rounded-xl shadow-xl px-3 py-2 whitespace-nowrap flex items-center gap-2">
            <Sparkles className="size-3 text-emerald-400" />
            <span className="text-[10px] vl-text-body">{description}</span>
            <ShortcutBadge shortcut={shortcut} size="xs" />
          </div>
          <div className={`absolute ${position === 'bottom' ? '-top-1' : '-bottom-1'} left-1/2 -translate-x-1/2 w-2 h-2 bg-[var(--vl-bg-card)] border-l border-t border-[var(--vl-border)] rotate-45`} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ============================================================
// useKeyboardShortcuts Hook
// ============================================================

export function useKeyboardShortcuts(options: {
  shortcuts?: ShortcutDef[]
  enabled?: boolean
  onToggleTheme?: () => void
  onToggleFocus?: () => void
  onToggleFullscreen?: () => void
  onToggleSidebar?: () => void
  onOpenSearch?: () => void
  onOpenMeetingSwitcher?: () => void
  onShowHelp?: () => void
  onSwitchTab?: (index: number) => void
  onNewMeeting?: () => void
  onNewAgent?: () => void
  onExportData?: () => void
  onRerunMeeting?: () => void
  onScrollToLatest?: () => void
  onNavigateTab?: (direction: 'left' | 'right') => void
}) {
  const {
    shortcuts = DEFAULT_SHORTCUTS,
    enabled = true,
    onToggleTheme,
    onToggleFocus,
    onToggleFullscreen,
    onToggleSidebar,
    onOpenSearch,
    onOpenMeetingSwitcher,
    onShowHelp,
    onSwitchTab,
    onNewMeeting,
    onNewAgent,
    onExportData,
    onRerunMeeting,
    onScrollToLatest,
    onNavigateTab,
  } = options

  const isInputFocused = useCallback(() => {
    const active = document.activeElement
    if (!active) return false
    const tag = active.tagName
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (active as HTMLElement).isContentEditable
  }, [])

  // Track shortcut usage for onboarding
  const [usedShortcuts, setUsedShortcuts] = useState<Set<string>>(new Set())
  const [firstTimeUse, setFirstTimeUse] = useState(true)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('vl-shortcuts-used')
      if (saved) {
        setUsedShortcuts(new Set(JSON.parse(saved)))
        setFirstTimeUse(false)
      }
    } catch { /* ignore */ }
  }, [])

  const markUsed = useCallback((id: string) => {
    setUsedShortcuts(prev => {
      const next = new Set(prev)
      next.add(id)
      try {
        localStorage.setItem('vl-shortcuts-used', JSON.stringify([...next]))
      } catch { /* ignore */ }
      return next
    })
    setFirstTimeUse(false)
  }, [])

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const parts: string[] = []
      if (e.ctrlKey || e.metaKey) parts.push(e.ctrlKey ? 'ctrl' : 'meta')
      if (e.shiftKey) parts.push('shift')
      if (e.altKey) parts.push('alt')

      let key = e.key
      if (key === ' ') key = 'space'
      else if (key === 'ArrowLeft') key = 'arrowleft'
      else if (key === 'ArrowRight') key = 'arrowright'
      else if (key === 'Escape') key = 'escape'
      else key = key.toLowerCase()

      const combo = [...parts, key].join('+')

      // Build shortcut lookup map
      const shortcutMap = new Map<string, ShortcutDef>()
      for (const s of shortcuts) {
        shortcutMap.set(s.combo.toLowerCase(), s)
      }

      const matched = shortcutMap.get(combo)
      if (!matched) return

      // Don't trigger shortcuts when typing in input fields (except Escape and Ctrl combos)
      if (isInputFocused() && !e.ctrlKey && !e.metaKey && combo !== 'escape') return

      e.preventDefault()
      markUsed(matched.id)

      // Execute actions
      switch (matched.id) {
        case 'global-search':
        case 'slash-search':
          onOpenSearch?.()
          break
        case 'tab-dashboard':
          onSwitchTab?.(0)
          break
        case 'tab-agents':
          onSwitchTab?.(1)
          break
        case 'tab-team':
          onSwitchTab?.(2)
          break
        case 'tab-individual':
          onSwitchTab?.(3)
          break
        case 'tab-history':
        case 'go-history':
          onSwitchTab?.(4)
          break
        case 'tab-pipeline':
          onSwitchTab?.(5)
          break
        case 'tab-knowledge':
        case 'go-knowledge':
          onSwitchTab?.(6)
          break
        case 'tab-settings':
          onSwitchTab?.(9)
          break
        case 'nav-left':
          onNavigateTab?.('left')
          break
        case 'nav-right':
          onNavigateTab?.('right')
          break
        case 'new-meeting':
          onNewMeeting?.()
          break
        case 'new-agent':
          onNewAgent?.()
          break
        case 'export-data':
          onExportData?.()
          break
        case 'go-meeting':
          onOpenMeetingSwitcher?.()
          break
        case 'rerun-meeting':
          onRerunMeeting?.()
          break
        case 'toggle-focus':
          onToggleFocus?.()
          break
        case 'toggle-fullscreen':
          onToggleFullscreen?.()
          break
        case 'toggle-sidebar':
          onToggleSidebar?.()
          break
        case 'scroll-latest':
          onScrollToLatest?.()
          break
        case 'toggle-theme':
          onToggleTheme?.()
          break
        case 'show-help':
          onShowHelp?.()
          break
        case 'close-dialog':
          // Handled by individual dialog components
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled, shortcuts, isInputFocused, markUsed, onToggleTheme, onToggleFocus, onToggleFullscreen, onToggleSidebar, onOpenSearch, onOpenMeetingSwitcher, onShowHelp, onSwitchTab, onNewMeeting, onNewAgent, onExportData, onRerunMeeting, onScrollToLatest, onNavigateTab])

  return {
    usedShortcuts,
    firstTimeUse,
    conflicts: detectConflicts(shortcuts),
    shortcuts,
  }
}

// ============================================================
// Shortcut Category Section
// ============================================================

function ShortcutCategorySection({
  category,
  shortcuts,
  searchQuery,
  conflicts,
  usedShortcuts,
}: {
  category: CategoryInfo
  shortcuts: ShortcutDef[]
  searchQuery: string
  conflicts: Map<string, string[]>
  usedShortcuts: Set<string>
}) {
  const [expanded, setExpanded] = useState(true)
  const Icon = category.icon

  const filtered = searchQuery
    ? shortcuts.filter(s =>
        s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.keys.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : shortcuts

  if (filtered.length === 0) return null

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left cursor-pointer"
      >
        <div className={`w-6 h-6 rounded-md flex items-center justify-center border ${category.color}`}>
          <Icon className="size-3" />
        </div>
        <span className="text-xs font-medium vl-text-heading flex-1">{category.label}</span>
        <Badge variant="outline" className="h-5 px-1.5 text-[10px]">{filtered.length}</Badge>
        <ChevronDown className={`size-3 vl-text-muted transition-transform ${expanded ? '' : '-rotate-90'}`} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="ml-8 space-y-1">
              {filtered.map(s => {
                const hasConflict = conflicts.has(s.id)
                const isUsed = usedShortcuts.has(s.id)
                return (
                  <div
                    key={s.id}
                    className={`flex items-center justify-between py-1.5 px-2 rounded-md transition-colors ${
                      hasConflict
                        ? 'bg-red-500/5 border border-red-500/10'
                        : isUsed
                          ? 'bg-emerald-500/5 border border-emerald-500/10'
                          : 'hover:bg-[var(--vl-bg-inner)]'
                    }`}
                  >
                    <span className="text-xs vl-text-body flex items-center gap-1.5">
                      {isUsed && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      )}
                      {hasConflict && (
                        <ShieldAlert className="size-3 text-red-400" />
                      )}
                      {s.description}
                    </span>
                    <div className="flex items-center gap-1">
                      <ShortcutBadge shortcut={s.keys} size="xs" />
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================
// ShortcutsHelpOverlay — Main Component
// ============================================================

export default function ShortcutsHelpOverlay({ open, onClose, shortcuts }: ShortcutsHelpOverlayProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [usedShortcuts, setUsedShortcuts] = useState<Set<string>>(new Set())
  const searchRef = useRef<HTMLInputElement>(null)
  const activeShortcuts = shortcuts || DEFAULT_SHORTCUTS
  const conflicts = useMemo(() => detectConflicts(activeShortcuts), [activeShortcuts])

  // Load used shortcuts
  useEffect(() => {
    try {
      const saved = localStorage.getItem('vl-shortcuts-used')
      if (saved) setUsedShortcuts(new Set(JSON.parse(saved)))
    } catch { /* ignore */ }
  }, [])

  // Focus search on open
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => searchRef.current?.focus())
    } else {
      setSearchQuery('')
    }
  }, [open])

  // Escape to close
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  const filteredCategories = searchQuery
    ? CATEGORIES.filter(cat => activeShortcuts.some(s => s.category === cat.id && (
        s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.keys.toLowerCase().includes(searchQuery.toLowerCase())
      )))
    : CATEGORIES

  const conflictCount = [...conflicts.keys()].filter(k => conflicts.get(k)?.length).length
  const usedCount = usedShortcuts.size

  return (
    <div className={`fixed inset-0 z-[100] transition-all duration-300 ${
      open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
    }`}>
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: open ? 1 : 0 }}
      />

      {/* Panel */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg max-h-[80vh] vl-dialog rounded-xl border border-[var(--vl-border)] shadow-2xl overflow-hidden"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: open ? 1 : 0, scale: open ? 1 : 0.95, y: open ? 0 : 10 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-[var(--vl-border-subtle)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <Keyboard className="size-4 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold vl-text-heading">Keyboard Shortcuts</h3>
                <p className="text-[10px] vl-text-muted">{activeShortcuts.length} shortcuts available</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {usedCount > 0 && (
                <Badge variant="outline" className="h-5 px-1.5 text-[9px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                  {usedCount} used
                </Badge>
              )}
              {conflictCount > 0 && (
                <Badge variant="outline" className="h-5 px-1.5 text-[9px] bg-red-500/10 text-red-400 border-red-500/30">
                  {conflictCount} conflicts
                </Badge>
              )}
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 vl-text-muted" onClick={onClose}>
                <X className="size-3.5" />
              </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 vl-text-muted" />
            <Input
              ref={searchRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shortcuts..."
              className="h-8 pl-9 text-xs"
            />
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
          <div className="space-y-3">
            {filteredCategories.map(cat => (
              <ShortcutCategorySection
                key={cat.id}
                category={cat}
                shortcuts={activeShortcuts.filter(s => s.category === cat.id)}
                searchQuery={searchQuery}
                conflicts={conflicts}
                usedShortcuts={usedShortcuts}
              />
            ))}

            {searchQuery && filteredCategories.length === 0 && (
              <div className="text-center py-8">
                <Search className="size-8 vl-text-muted mx-auto mb-2 opacity-40" />
                <p className="text-xs vl-text-muted">No shortcuts found</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-2 border-t border-[var(--vl-border-subtle)] flex items-center justify-between">
          <p className="text-[10px] vl-text-muted">Press Esc to close</p>
          <div className="flex items-center gap-1">
            <kbd className="inline-flex items-center justify-center min-w-[18px] h-5 px-1 rounded bg-[var(--vl-bg-inner)] text-[9px] font-mono vl-text-muted border border-[var(--vl-border-subtle)]">
              <Command className="size-2.5" />
            </kbd>
            <span className="text-[9px] vl-text-muted">/</span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
