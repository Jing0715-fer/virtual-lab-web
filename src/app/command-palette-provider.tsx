'use client'

/**
 * Command Palette Provider
 *
 * A React Context provider that wraps the app to supply:
 * - `openCommandPalette()` — opens the palette overlay
 * - `closeCommandPalette()` — closes the palette overlay
 * - `useCommandPalette()` — consumer hook exposing open/close + state
 *
 * Features:
 * - Registers global Cmd+K / Ctrl+K keyboard listener
 * - Prevents default browser search when palette is open
 * - Manages open/close state with smooth animation
 * - Tracks recent commands and visited sections via localStorage
 * - Renders the <CommandPalette> component
 * - Accepts callbacks for navigation, creation, export, etc.
 */

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import CommandPalette, {
  type AgentOption,
  type MeetingOption,
} from './command-palette'
import type { Lang } from '@/lib/i18n'

// ============================================================
// Types
// ============================================================

interface CommandPaletteContextValue {
  isOpen: boolean
  openCommandPalette: () => void
  closeCommandPalette: () => void
  toggleCommandPalette: () => void
}

interface CommandPaletteProviderProps {
  children: ReactNode
  lang?: Lang
  activeTab?: string
  agents?: AgentOption[]
  meetings?: MeetingOption[]
  onNavigate?: (tab: string) => void
  onCreateTeamMeeting?: () => void
  onCreateIndividualMeeting?: () => void
  onCreateAgent?: () => void
  onExportData?: (format: 'json' | 'csv' | 'pdf') => void
  onToggleTheme?: () => void
  onToggleFocusMode?: () => void
  onRunQuickAnalysis?: () => void
  onOpenApiDocs?: () => void
}

// ============================================================
// Context
// ============================================================

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null)

// ============================================================
// Hook
// ============================================================

export function useCommandPalette(): CommandPaletteContextValue {
  const ctx = useContext(CommandPaletteContext)
  if (!ctx) {
    // Return a no-op fallback for components that might be used outside the provider
    return {
      isOpen: false,
      openCommandPalette: () => {},
      closeCommandPalette: () => {},
      toggleCommandPalette: () => {},
    }
  }
  return ctx
}

// ============================================================
// Visited Sections Tracker
// ============================================================

const VISITED_SECTIONS_KEY = 'vl-visited-sections'
const MAX_VISITED = 20

function getVisitedSections(): string[] {
  try {
    const raw = localStorage.getItem(VISITED_SECTIONS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function trackVisitedSection(section: string) {
  try {
    const existing = getVisitedSections()
    const filtered = existing.filter(s => s !== section)
    const updated = [section, ...filtered].slice(0, MAX_VISITED)
    localStorage.setItem(VISITED_SECTIONS_KEY, JSON.stringify(updated))
  } catch { /* ignore */ }
}

// ============================================================
// Provider Component
// ============================================================

export function CommandPaletteProvider({
  children,
  lang = 'en',
  activeTab,
  agents = [],
  meetings = [],
  onNavigate,
  onCreateTeamMeeting,
  onCreateIndividualMeeting,
  onCreateAgent,
  onExportData,
  onToggleTheme,
  onToggleFocusMode,
  onRunQuickAnalysis,
  onOpenApiDocs,
}: CommandPaletteProviderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const isRegisteredRef = useRef(false)

  // ============================================================
  // Open / Close handlers
  // ============================================================

  const openCommandPalette = useCallback(() => {
    setIsOpen(true)
  }, [])

  const closeCommandPalette = useCallback(() => {
    setIsOpen(false)
  }, [])

  const toggleCommandPalette = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  // ============================================================
  // Context value (memoized to avoid unnecessary re-renders)
  // ============================================================

  const contextValue = useMemo<CommandPaletteContextValue>(() => ({
    isOpen,
    openCommandPalette,
    closeCommandPalette,
    toggleCommandPalette,
  }), [isOpen, openCommandPalette, closeCommandPalette, toggleCommandPalette])

  // ============================================================
  // Navigate handler — track visited section
  // ============================================================

  const handleNavigate = useCallback((tab: string) => {
    trackVisitedSection(tab)
    onNavigate?.(tab)
  }, [onNavigate])

  // ============================================================
  // Global keyboard listener for Cmd+K / Ctrl+K
  // ============================================================

  useEffect(() => {
    // Avoid double-registration in StrictMode
    if (isRegisteredRef.current) return
    isRegisteredRef.current = true

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'

      if (isCmdK) {
        // Don't trigger if user is focused on an input/textarea (except Escape)
        const active = document.activeElement
        if (active) {
          const tag = active.tagName
          if (tag === 'INPUT' || tag === 'TEXTAREA' || (active as HTMLElement).isContentEditable) {
            // Allow Cmd+K even in inputs — it's a universal command palette shortcut
            // But only if the input is not a content-editable div
            if ((active as HTMLElement).isContentEditable) return
          }
        }

        e.preventDefault()
        e.stopPropagation()

        // Toggle palette
        setIsOpen(prev => !prev)
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      isRegisteredRef.current = false
    }
  }, [])

  // ============================================================
  // Prevent default browser search (Ctrl+K) while palette is open
  // ============================================================

  useEffect(() => {
    if (!isOpen) return

    const preventSearch = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    document.addEventListener('keydown', preventSearch, true)
    return () => {
      document.removeEventListener('keydown', preventSearch, true)
    }
  }, [isOpen])

  // ============================================================
  // Escape key to close (at document level for reliability)
  // ============================================================

  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape, true)
    return () => {
      document.removeEventListener('keydown', handleEscape, true)
    }
  }, [isOpen])

  // ============================================================
  // Lock body scroll when palette is open
  // ============================================================

  useEffect(() => {
    if (isOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      document.body.style.overflow = 'hidden'
      document.body.style.paddingRight = `${scrollbarWidth}px`
    } else {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }

    return () => {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
  }, [isOpen])

  // ============================================================
  // Render
  // ============================================================

  return (
    <CommandPaletteContext.Provider value={contextValue}>
      {children}
      {isOpen && (
        <CommandPalette
          open={isOpen}
          onClose={closeCommandPalette}
          lang={lang}
          activeTab={activeTab}
          agents={agents}
          meetings={meetings}
          onNavigate={handleNavigate}
          onCreateTeamMeeting={onCreateTeamMeeting}
          onCreateIndividualMeeting={onCreateIndividualMeeting}
          onCreateAgent={onCreateAgent}
          onExportData={onExportData}
          onToggleTheme={onToggleTheme}
          onToggleFocusMode={onToggleFocusMode}
          onRunQuickAnalysis={onRunQuickAnalysis}
          onOpenApiDocs={onOpenApiDocs}
        />
      )}
    </CommandPaletteContext.Provider>
  )
}

export default CommandPaletteProvider
