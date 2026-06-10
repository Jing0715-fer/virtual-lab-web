'use client'

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Keyboard, Search, X, ChevronDown, ChevronRight,
  Navigation, Zap, Users, MessageSquare, GitBranch,
  Settings, HelpCircle, ArrowRightLeft, Volume2,
  Monitor, Eye, BookOpen, GraduationCap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

// ============================================================
// Types
// ============================================================

interface ShortcutDef {
  id: string
  keys: string
  description: string
  category: ShortcutCategory
}

type ShortcutCategory = 'navigation' | 'actions' | 'meeting' | 'pipeline' | 'general'

interface CategoryInfo {
  id: ShortcutCategory
  labelKey: string
  icon: React.ElementType
  color: string
}

// ============================================================
// Shortcut Definitions
// ============================================================

const CATEGORIES: CategoryInfo[] = [
  { id: 'navigation', labelKey: 'kbNav.category.navigation', icon: Navigation, color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' },
  { id: 'actions', labelKey: 'kbNav.category.actions', icon: Zap, color: 'text-amber-400 bg-amber-500/15 border-amber-500/30' },
  { id: 'meeting', labelKey: 'kbNav.category.meeting', icon: Users, color: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30' },
  { id: 'pipeline', labelKey: 'kbNav.category.pipeline', icon: GitBranch, color: 'text-violet-400 bg-violet-500/15 border-violet-500/30' },
  { id: 'general', labelKey: 'kbNav.category.general', icon: Settings, color: 'text-orange-400 bg-orange-500/15 border-orange-500/30' },
]

function buildShortcuts(lang: Lang): ShortcutDef[] {
  return [
    // Navigation
    { id: 'cmd-k', keys: '⌘K / Ctrl+K', description: t(lang, 'shortcuts.openCommandPalette'), category: 'navigation' },
    { id: 'slash', keys: '/', description: t(lang, 'shortcuts.openCommandPalette'), category: 'navigation' },
    { id: 'tab-1', keys: '1', description: t(lang, 'kbNav.switchDashboard'), category: 'navigation' },
    { id: 'tab-2', keys: '2', description: t(lang, 'kbNav.switchAgents'), category: 'navigation' },
    { id: 'tab-3', keys: '3', description: t(lang, 'kbNav.switchTeamMeeting'), category: 'navigation' },
    { id: 'tab-4', keys: '4', description: t(lang, 'kbNav.switchIndividualMeeting'), category: 'navigation' },
    { id: 'tab-5', keys: '5', description: t(lang, 'kbNav.switchHistory'), category: 'navigation' },
    { id: 'tab-6', keys: '6', description: t(lang, 'kbNav.switchPipeline'), category: 'navigation' },
    { id: 'tab-7', keys: '7', description: t(lang, 'kbNav.switchBioTools'), category: 'navigation' },
    { id: 'tab-8', keys: '8', description: t(lang, 'kbNav.switchSettings'), category: 'navigation' },
    { id: 'help', keys: '?', description: t(lang, 'shortcuts.showHelp'), category: 'navigation' },
    { id: 'esc', keys: 'Esc', description: t(lang, 'shortcuts.closeDialogs'), category: 'navigation' },

    // Actions
    { id: 'new-agent', keys: 'N', description: t(lang, 'shortcuts.createNewAgent'), category: 'actions' },
    { id: 'new-meeting', keys: 'T', description: t(lang, 'kbNav.goTeamMeeting'), category: 'actions' },
    { id: 'new-indiv', keys: 'M', description: t(lang, 'kbNav.goIndividualMeeting'), category: 'actions' },
    { id: 'copy', keys: '⌘C / Ctrl+C', description: t(lang, 'common.copy'), category: 'actions' },
    { id: 'paste', keys: '⌘V / Ctrl+V', description: t(lang, 'kbNav.paste'), category: 'actions' },

    // Meeting
    { id: 'enter', keys: 'Enter', description: t(lang, 'shortcuts.executeCommand'), category: 'meeting' },
    { id: 'arrow-up', keys: '↑', description: t(lang, 'shortcuts.navigateItems'), category: 'meeting' },
    { id: 'arrow-down', keys: '↓', description: t(lang, 'shortcuts.navigateItems'), category: 'meeting' },
    { id: 'space', keys: 'Space', description: t(lang, 'kbNav.playPause'), category: 'meeting' },
    { id: 'left-right', keys: '← / →', description: t(lang, 'kbNav.prevNext'), category: 'meeting' },

    // Pipeline
    { id: 'pipeline-nav', keys: 'P', description: t(lang, 'kbNav.switchPipeline'), category: 'pipeline' },
    { id: 'drag', keys: 'Drag', description: t(lang, 'kbNav.dragReorder'), category: 'pipeline' },

    // General
    { id: 'search', keys: '⌘F / Ctrl+F', description: t(lang, 'common.search'), category: 'general' },
    { id: 'theme', keys: 'D', description: t(lang, 'shortcuts.toggleDarkMode'), category: 'general' },
    { id: 'language', keys: 'L', description: t(lang, 'kbNav.switchLanguage'), category: 'general' },
    { id: 'fullscreen', keys: 'F11', description: t(lang, 'kbNav.fullscreen'), category: 'general' },
  ]
}

// ============================================================
// Recently Used Shortcuts
// ============================================================

function getRecentlyUsed(): string[] {
  try {
    const saved = localStorage.getItem('vl-recent-shortcuts')
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

function addRecentlyUsed(id: string) {
  try {
    const prev = getRecentlyUsed()
    const updated = [id, ...prev.filter(x => x !== id)].slice(0, 8)
    localStorage.setItem('vl-recent-shortcuts', JSON.stringify(updated))
  } catch { /* ignore */ }
}

// ============================================================
// Animated Key Display
// ============================================================

function KeyBadge({ label, isHighlighted = false }: { label: string; isHighlighted?: boolean }) {
  return (
    <kbd className={`
      inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-md
      text-[10px] font-mono font-medium border transition-all duration-200
      ${isHighlighted
        ? 'bg-emerald-500/25 text-emerald-400 border-emerald-500/50 keyboard-key-flash'
        : 'bg-[var(--vl-bg-inner)] text-[var(--vl-text-muted)] border-[var(--vl-border-subtle)]'
      }
    `}>
      {label}
    </kbd>
  )
}

// ============================================================
// Shortcut Category Section
// ============================================================

function ShortcutCategorySection({
  category,
  shortcuts,
  searchQuery,
  recentlyUsed,
  lang,
}: {
  category: CategoryInfo
  shortcuts: ShortcutDef[]
  searchQuery: string
  recentlyUsed: string[]
  lang: Lang
}) {
  const [expanded, setExpanded] = useState(true)
  const Icon = category.icon
  const filtered = searchQuery
    ? shortcuts.filter(s => s.description.toLowerCase().includes(searchQuery.toLowerCase()) || s.keys.toLowerCase().includes(searchQuery.toLowerCase()))
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
        <span className="text-xs font-medium vl-text-heading flex-1">
          {t(lang, category.labelKey)}
        </span>
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
                const isRecent = recentlyUsed.includes(s.id)
                return (
                  <div
                    key={s.id}
                    className={`flex items-center justify-between py-1.5 px-2 rounded-md transition-colors ${
                      isRecent ? 'bg-emerald-500/5 border border-emerald-500/10' : 'hover:bg-[var(--vl-bg-inner)]'
                    }`}
                  >
                    <span className="text-xs vl-text-body flex items-center gap-1.5">
                      {isRecent && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      )}
                      {s.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {s.keys.split(' / ').map((key, i) => (
                        <React.Fragment key={i}>
                          {i > 0 && <span className="text-[9px] vl-text-muted mx-0.5">+</span>}
                          <KeyBadge label={key} isHighlighted={isRecent} />
                        </React.Fragment>
                      ))}
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
// Press Any Key Mode
// ============================================================

function PressAnyKeyMode({ shortcuts, onFound, onClose, lang }: {
  shortcuts: ShortcutDef[]
  onFound: (shortcut: ShortcutDef) => void
  onClose: () => void
  lang: Lang
}) {
  const [pressedKey, setPressedKey] = useState<string | null>(null)
  const [found, setFound] = useState<ShortcutDef | null>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      const key = e.key

      // Build display string
      let display = ''
      if (e.metaKey || e.ctrlKey) display += '⌘'
      if (e.shiftKey) display += '⇧'
      if (e.altKey) display += '⌥'
      if (key !== 'Meta' && key !== 'Control' && key !== 'Shift' && key !== 'Alt') {
        display += key
      }
      setPressedKey(display || key)

      // Find matching shortcut
      const matched = shortcuts.find(s =>
        s.keys.toLowerCase().includes(key.toLowerCase()) ||
        s.keys.toLowerCase().includes(display.toLowerCase()) ||
        (key === '/' && s.keys === '/') ||
        (key === '?' && s.keys === '?')
      )
      if (matched) {
        setFound(matched)
        addRecentlyUsed(matched.id)
        onFound(matched)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts, onFound])

  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <motion.div
        animate={{ scale: pressedKey ? 1.1 : 1 }}
        className="w-24 h-24 rounded-2xl bg-[var(--vl-bg-inner)] border-2 border-dashed border-[var(--vl-border)] flex items-center justify-center"
      >
        <span className="text-2xl font-mono vl-text-muted">
          {pressedKey || '?'}
        </span>
      </motion.div>
      <AnimatePresence mode="wait">
        {found ? (
          <motion.div
            key="found"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <p className="text-sm text-emerald-400 font-medium">{found.description}</p>
            <p className="text-xs vl-text-muted mt-1">{found.keys}</p>
          </motion.div>
        ) : (
          <motion.p
            key="prompt"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-xs vl-text-muted"
          >
            {t(lang, 'kbNav.pressAnyKey')}
          </motion.p>
        )}
      </AnimatePresence>
      <Button variant="ghost" size="sm" className="h-7 text-xs vl-text-muted" onClick={onClose}>
        {t(lang, 'common.close')}
      </Button>
    </div>
  )
}

// ============================================================
// KeyboardNavOverlay — Main Component
// ============================================================

interface KeyboardNavOverlayProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lang: Lang
}

export function KeyboardNavOverlay({ open, onOpenChange, lang }: KeyboardNavOverlayProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>([])
  const [pressAnyKeyMode, setPressAnyKeyMode] = useState(false)
  const [practiceMode, setPracticeMode] = useState(false)
  const [practiceShortcut, setPracticeShortcut] = useState<ShortcutDef | null>(null)
  const [practiceResult, setPracticeResult] = useState<'correct' | 'wrong' | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const shortcuts = useMemo(() => buildShortcuts(lang), [lang])

  // Load recently used on mount
  useEffect(() => {
    requestAnimationFrame(() => setRecentlyUsed(getRecentlyUsed()))
  }, [])

  // Focus search on open
  useEffect(() => {
    if (open && !pressAnyKeyMode && !practiceMode) {
      requestAnimationFrame(() => searchRef.current?.focus())
    }
  }, [open, pressAnyKeyMode, practiceMode])

  // Listen for key presses in practice mode
  useEffect(() => {
    if (!practiceMode || !practiceShortcut) return
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      const key = e.key.toLowerCase()
      const expected = practiceShortcut.keys.toLowerCase()
      const isMatch = key === expected || expected.includes(key)
      setPracticeResult(isMatch ? 'correct' : 'wrong')
      if (isMatch) {
        addRecentlyUsed(practiceShortcut.id)
        setRecentlyUsed(prev => [practiceShortcut.id, ...prev.filter(x => x !== practiceShortcut.id)].slice(0, 8))
        const timer = setTimeout(() => {
          const randomShortcut = shortcuts[Math.floor(Math.random() * shortcuts.length)]
          setPracticeShortcut(randomShortcut)
          setPracticeResult(null)
        }, 1200)
        return () => clearTimeout(timer)
      } else {
        const timer = setTimeout(() => setPracticeResult(null), 800)
        return () => clearTimeout(timer)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [practiceMode, practiceShortcut, shortcuts])

  const handleFound = useCallback((shortcut: ShortcutDef) => {
    setRecentlyUsed(prev => [shortcut.id, ...prev.filter(x => x !== shortcut.id)].slice(0, 8))
  }, [])

  const handleStartPractice = useCallback(() => {
    setPracticeMode(true)
    setPressAnyKeyMode(false)
    const randomShortcut = shortcuts[Math.floor(Math.random() * shortcuts.length)]
    setPracticeShortcut(randomShortcut)
    setPracticeResult(null)
  }, [shortcuts])

  const handleClose = useCallback(() => {
    setPressAnyKeyMode(false)
    setPracticeMode(false)
    setPracticeResult(null)
    setSearchQuery('')
    onOpenChange(false)
  }, [onOpenChange])

  const totalShortcuts = shortcuts.length
  const matchedCategories = searchQuery
    ? CATEGORIES.filter(cat => shortcuts.some(s => s.category === cat.id && (
        s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.keys.toLowerCase().includes(searchQuery.toLowerCase())
      )))
    : CATEGORIES

  return (
    <div className={`fixed inset-0 z-[100] transition-all duration-300 ${
      open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
    }`}>
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
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
                <h3 className="text-sm font-semibold vl-text-heading">{t(lang, 'shortcuts.title')}</h3>
                <p className="text-[10px] vl-text-muted">{totalShortcuts} {t(lang, 'kbNav.shortcutsAvailable')}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                className={`h-7 px-2 text-[10px] ${pressAnyKeyMode ? 'text-emerald-400 bg-emerald-500/10' : 'vl-text-muted'}`}
                onClick={() => { setPressAnyKeyMode(!pressAnyKeyMode); setPracticeMode(false) }}
              >
                <Eye className="size-3 mr-1" /> {t(lang, 'kbNav.discoverMode')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`h-7 px-2 text-[10px] ${practiceMode ? 'text-amber-400 bg-amber-500/10' : 'vl-text-muted'}`}
                onClick={handleStartPractice}
              >
                <BookOpen className="size-3 mr-1" /> {t(lang, 'kbNav.practiceMode')}
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 vl-text-muted" onClick={handleClose}>
                <X className="size-3.5" />
              </Button>
            </div>
          </div>
          {!pressAnyKeyMode && !practiceMode && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 vl-text-muted" />
              <Input
                ref={searchRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t(lang, 'shortcuts.searchPlaceholder')}
                className="h-8 pl-9 text-xs vl-input"
              />
            </div>
          )}
        </div>

        {/* Body */}
        <div className="px-5 py-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {/* Press Any Key Mode */}
          <AnimatePresence mode="wait">
            {pressAnyKeyMode ? (
              <PressAnyKeyMode
                shortcuts={shortcuts}
                onFound={handleFound}
                onClose={() => setPressAnyKeyMode(false)}
                lang={lang}
              />
            ) : practiceMode && practiceShortcut ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <p className="text-xs text-amber-400 font-medium flex items-center gap-1">
                  <GraduationCap className="size-3" />
                  {t(lang, 'kbNav.pressThisKey')}
                </p>
                <motion.div
                  animate={{
                    scale: practiceResult === 'correct' ? 1.05 : practiceResult === 'wrong' ? 0.95 : 1,
                    rotate: practiceResult === 'wrong' ? [0, -3, 3, -3, 0] : 0,
                  }}
                  transition={{ duration: 0.3 }}
                  className={`px-4 py-3 rounded-xl border-2 ${
                    practiceResult === 'correct'
                      ? 'bg-emerald-500/10 border-emerald-500/50'
                      : practiceResult === 'wrong'
                        ? 'bg-red-500/10 border-red-500/50'
                        : 'bg-[var(--vl-bg-inner)] border-[var(--vl-border)]'
                  }`}
                >
                  <p className="text-sm font-medium vl-text-heading">{practiceShortcut.description}</p>
                  <div className="flex items-center gap-1 mt-2 justify-center">
                    <KeyBadge label={practiceShortcut.keys.split(' / ')[0]} isHighlighted />
                  </div>
                </motion.div>
                {practiceResult && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`text-xs font-medium ${practiceResult === 'correct' ? 'text-emerald-400' : 'text-red-400'}`}
                  >
                    {practiceResult === 'correct' ? t(lang, 'kbNav.correct') : t(lang, 'kbNav.tryAgain')}
                  </motion.p>
                )}
                <Button variant="ghost" size="sm" className="h-7 text-xs vl-text-muted" onClick={() => { setPracticeMode(false); setPracticeResult(null) }}>
                  {t(lang, 'common.close')}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Recently Used */}
                {recentlyUsed.length > 0 && !searchQuery && (
                  <div className="mb-3">
                    <p className="text-[10px] vl-text-muted mb-2 flex items-center gap-1">
                      <Monitor className="size-3" />
                      {t(lang, 'kbNav.recentlyUsed')}
                    </p>
                    <div className="space-y-1">
                      {recentlyUsed.slice(0, 4).map(id => {
                        const shortcut = shortcuts.find(s => s.id === id)
                        if (!shortcut) return null
                        return (
                          <div key={id} className="flex items-center justify-between py-1 px-2 rounded-md bg-emerald-500/5 border border-emerald-500/10">
                            <span className="text-xs vl-text-body">{shortcut.description}</span>
                            <KeyBadge label={shortcut.keys.split(' / ')[0]} isHighlighted />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Categories */}
                {matchedCategories.map(cat => (
                  <ShortcutCategorySection
                    key={cat.id}
                    category={cat}
                    shortcuts={shortcuts.filter(s => s.category === cat.id)}
                    searchQuery={searchQuery}
                    recentlyUsed={recentlyUsed}
                    lang={lang}
                  />
                ))}

                {searchQuery && matchedCategories.length === 0 && (
                  <div className="text-center py-8">
                    <Search className="size-8 vl-text-muted mx-auto mb-2 opacity-40" />
                    <p className="text-xs vl-text-muted">{t(lang, 'kbNav.noShortcutsFound')}</p>
                  </div>
                )}
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-5 py-2 border-t border-[var(--vl-border-subtle)] flex items-center justify-between">
          <p className="text-[10px] vl-text-muted">{t(lang, 'kbNav.escToClose')}</p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] vl-text-muted" onClick={() => {
              try { localStorage.removeItem('vl-recent-shortcuts') } catch { /* ignore */ }
              setRecentlyUsed([])
            }}>
              {t(lang, 'kbNav.clearRecent')}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
