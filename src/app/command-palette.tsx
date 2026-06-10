'use client'

/**
 * Command Palette — VS Code / Raycast style overlay
 *
 * A power-user feature that provides quick navigation and actions:
 * - Trigger: Cmd+K / Ctrl+K (handled by provider)
 * - Search input with magnifying glass icon, auto-focus
 * - Command groups: Navigation, Actions, Recent, Agents, Meetings
 * - Fuzzy search with highlighted matching text
 * - Keyboard navigation: Arrow up/down, Enter, Esc, Tab
 * - Context-aware: shows relevant commands based on active tab
 * - Recent commands tracking via localStorage (vl-command-history)
 * - Staggered fade-in animations
 * - Theme support via --vl-* CSS variables
 * - Mobile: full-screen, Desktop: centered dialog
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  Search, X, Clock, LayoutDashboard, Bot, Users, GitBranch,
  History, Settings, BookOpen, Activity, BarChart3, Image,
  Database, Wrench, Plus, FileJson, FileSpreadsheet, FileText,
  Moon, Sun, Maximize2, Zap, ChevronRight, Terminal,
  Beaker, Calendar, MessageSquare, FlaskConical, Layers,
  Sparkles, Command, ArrowUp, ArrowDown,
  RotateCcw, Download, PanelTop,
} from 'lucide-react'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

// ============================================================
// Types
// ============================================================

export type CommandGroupId = 'navigation' | 'actions' | 'recent' | 'agents' | 'meetings'

export interface CommandItem {
  id: string
  groupId: CommandGroupId
  label: string
  description?: string
  icon: React.ElementType
  iconColor?: string
  iconBg?: string
  shortcut?: string
  action: () => void
  /** Agent color dot (for agents group) */
  agentColor?: string
  /** Meeting status (for meetings group) */
  meetingStatus?: 'running' | 'completed' | 'draft'
}

export interface CommandGroup {
  id: CommandGroupId
  label: string
  icon: React.ElementType
  iconColor: string
  iconBg: string
  items: CommandItem[]
}

export interface AgentOption {
  id: string
  name: string
  color: string
  expertise?: string
}

export interface MeetingOption {
  id: string
  name: string
  status: 'running' | 'completed' | 'draft'
  type: 'team' | 'individual'
  updatedAt?: string
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
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
// Constants
// ============================================================

const STORAGE_KEY_HISTORY = 'vl-command-history'
const MAX_RECENT = 5
const MAX_VISIBLE_ITEMS = 40

// ============================================================
// localStorage helpers for recent commands
// ============================================================

interface HistoryEntry {
  id: string
  label: string
  groupId: CommandGroupId
  timestamp: number
}

function loadCommandHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveCommandHistory(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(entries.slice(0, MAX_RECENT)))
  } catch { /* ignore */ }
}

function addToHistory(entry: HistoryEntry) {
  const existing = loadCommandHistory()
  const filtered = existing.filter(e => e.id !== entry.id)
  saveCommandHistory([entry, ...filtered])
}

// ============================================================
// Fuzzy search
// ============================================================

function fuzzyScore(text: string, query: string): number {
  const t = text.toLowerCase()
  const q = query.toLowerCase()
  if (t === q) return 200
  if (t.startsWith(q)) return 100
  if (t.includes(q)) return 80
  // character-by-character fuzzy
  let qi = 0
  let score = 0
  let lastMatchIdx = -1
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      score += (lastMatchIdx === -1 ? 10 : (ti === lastMatchIdx + 1 ? 5 : 1))
      lastMatchIdx = ti
      qi++
    }
  }
  return qi === q.length ? score : -1
}

// ============================================================
// Highlight matched text
// ============================================================

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  const parts: React.ReactNode[] = []
  let lastIdx = 0
  let qi = 0

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      if (ti > lastIdx) {
        parts.push(<span key={`t-${lastIdx}`}>{text.slice(lastIdx, ti)}</span>)
      }
      parts.push(
        <mark key={`h-${ti}`} className="cmd-palette-highlight">
          {text.slice(ti, ti + 1)}
        </mark>
      )
      lastIdx = ti + 1
      qi++
    }
  }
  if (lastIdx < text.length) {
    parts.push(<span key={`t-${lastIdx}`}>{text.slice(lastIdx)}</span>)
  }

  return <>{parts.length > 0 ? parts : text}</>
}

// ============================================================
// ShortcutBadge
// ============================================================

function ShortcutBadge({ shortcut }: { shortcut: string }) {
  const keys = shortcut.split('+').map(k => k.trim())
  return (
    <span className="cmd-palette-shortcut-group">
      {keys.map((key, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="cmd-palette-shortcut-separator">+</span>}
          <kbd className="cmd-palette-shortcut">
            {key === 'Cmd' ? '\u2318' : key === 'Ctrl' ? '\u2303' : key === 'Shift' ? '\u21E7' : key === 'Escape' ? 'Esc' : key === 'ArrowUp' ? '\u2191' : key === 'ArrowDown' ? '\u2193' : key}
          </kbd>
        </React.Fragment>
      ))}
    </span>
  )
}

// ============================================================
// Command Group Section
// ============================================================

function CommandGroupSection({
  group,
  query,
  activeIndex,
  startIndex,
  onActivate,
  onSelect,
  lang,
}: {
  group: CommandGroup
  query: string
  activeIndex: number
  startIndex: number
  onActivate: (globalIndex: number) => void
  onSelect: (item: CommandItem) => void
  lang: Lang
}) {
  if (group.items.length === 0) return null

  const GroupIcon = group.icon

  return (
    <div className="cmd-palette-group">
      {/* Group header */}
      <div className="cmd-palette-group-header">
        <div className="cmd-palette-group-header-icon" style={{ background: group.iconBg }}>
          <GroupIcon className="w-[10px] h-[10px]" style={{ color: group.iconColor }} />
        </div>
        <span>{group.label}</span>
        <span className="cmd-palette-group-header-count">{group.items.length}</span>
      </div>

      {/* Items */}
      {group.items.map((item, i) => {
        const globalIndex = startIndex + i
        const isActive = globalIndex === activeIndex
        const Icon = item.icon

        return (
          <button
            key={item.id}
            type="button"
            className={`cmd-palette-item${isActive ? ' cmd-palette-item-active' : ''}`}
            onClick={() => onSelect(item)}
            onMouseEnter={() => onActivate(globalIndex)}
            data-cmd-index={globalIndex}
          >
            {/* Left: icon or agent dot */}
            {item.agentColor ? (
              <span className="cmd-palette-item-dot" style={{ backgroundColor: item.agentColor }} />
            ) : (
              <div className="cmd-palette-item-icon-wrap">
                <Icon style={{ color: item.iconColor || group.iconColor }} />
              </div>
            )}

            {/* Center: label + description */}
            <div className="cmd-palette-item-content">
              <span className="cmd-palette-item-label">
                <HighlightedText text={item.label} query={query} />
              </span>
              {item.description && (
                <span className="cmd-palette-item-desc">
                  <HighlightedText text={item.description} query={query} />
                </span>
              )}
            </div>

            {/* Right: badge + shortcut + arrow */}
            <div className="cmd-palette-item-right">
              {item.meetingStatus && (
                <span className={`cmd-palette-item-badge cmd-palette-item-badge-status-${item.meetingStatus}`}>
                  {item.meetingStatus}
                </span>
              )}
              {item.shortcut && (
                <ShortcutBadge shortcut={item.shortcut} />
              )}
              <ChevronRight className="w-3 h-3 cmd-palette-item-arrow" />
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ============================================================
// Empty State
// ============================================================

function EmptyState({ query, lang }: { query: string; lang: Lang }) {
  if (!query) return null
  return (
    <div className="cmd-palette-empty">
      <div className="cmd-palette-empty-icon">
        <Search />
      </div>
      <div className="cmd-palette-empty-title">No commands found</div>
      <div className="cmd-palette-empty-desc">
        No results for &quot;{query}&quot;. Try a different search term.
      </div>
    </div>
  )
}

// ============================================================
// Main CommandPalette Component
// ============================================================

export default function CommandPalette({
  open,
  onClose,
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
}: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [isClosing, setIsClosing] = useState(false)
  const [recentHistory, setRecentHistory] = useState<HistoryEntry[]>([])

  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // ============================================================
  // Build navigation commands
  // ============================================================
  const navigationCommands: CommandItem[] = useMemo(() => {
    const navItems: Array<{
      id: string
      labelKey: string
      fallback: string
      icon: React.ElementType
      tab: string
      iconColor: string
      iconBg: string
    }> = [
      { id: 'nav-dashboard', labelKey: 'nav.dashboard', fallback: 'Dashboard', icon: LayoutDashboard, tab: 'dashboard', iconColor: '#10b981', iconBg: 'rgba(16,185,129,0.12)' },
      { id: 'nav-agents', labelKey: 'nav.agents', fallback: 'Agents', icon: Bot, tab: 'agents', iconColor: '#06b6d4', iconBg: 'rgba(6,182,212,0.12)' },
      { id: 'nav-team', labelKey: 'nav.team', fallback: 'Team Meeting', icon: Users, tab: 'team', iconColor: '#8b5cf6', iconBg: 'rgba(139,92,246,0.12)' },
      { id: 'nav-individual', labelKey: 'nav.individual', fallback: 'Individual Meeting', icon: MessageSquare, tab: 'individual', iconColor: '#f59e0b', iconBg: 'rgba(245,158,11,0.12)' },
      { id: 'nav-history', labelKey: 'nav.history', fallback: 'History', icon: History, tab: 'history', iconColor: '#ef4444', iconBg: 'rgba(239,68,68,0.12)' },
      { id: 'nav-pipeline', labelKey: 'nav.pipeline', fallback: 'Pipeline', icon: GitBranch, tab: 'pipeline', iconColor: '#a855f7', iconBg: 'rgba(168,85,247,0.12)' },
      { id: 'nav-research-notes', fallback: 'Research Notes', icon: FileText, tab: 'research-notes', iconColor: '#f97316', iconBg: 'rgba(249,115,22,0.12)', labelKey: '' },
      { id: 'nav-lab-journal', fallback: 'Lab Journal', icon: BookOpen, tab: 'lab-journal', iconColor: '#14b8a6', iconBg: 'rgba(20,184,166,0.12)', labelKey: '' },
      { id: 'nav-activity', fallback: 'Activity Feed', icon: Activity, tab: 'activity', iconColor: '#3b82f6', iconBg: 'rgba(59,130,246,0.12)', labelKey: '' },
      { id: 'nav-meeting-analytics', fallback: 'Meeting Analytics', icon: BarChart3, tab: 'meeting-analytics', iconColor: '#ec4899', iconBg: 'rgba(236,72,153,0.12)', labelKey: '' },
      { id: 'nav-settings', labelKey: 'nav.settings', fallback: 'Settings', icon: Settings, tab: 'settings', iconColor: '#64748b', iconBg: 'rgba(100,116,139,0.12)' },
      { id: 'nav-viz-gallery', fallback: 'Visualization Gallery', icon: Image, tab: 'viz-gallery', iconColor: '#d946ef', iconBg: 'rgba(217,70,239,0.12)', labelKey: '' },
      { id: 'nav-knowledge-base', labelKey: 'nav.knowledgeBase', fallback: 'Knowledge Base', icon: Database, tab: 'knowledge-base', iconColor: '#0ea5e9', iconBg: 'rgba(14,165,233,0.12)' },
      { id: 'nav-dev-tools', fallback: 'Dev Tools', icon: Wrench, tab: 'dev-tools', iconColor: '#78716c', iconBg: 'rgba(120,113,108,0.12)', labelKey: '' },
    ]

    return navItems.map(item => ({
      id: item.id,
      groupId: 'navigation' as CommandGroupId,
      label: item.labelKey ? t(lang, item.labelKey) : item.fallback,
      description: undefined,
      icon: item.icon,
      iconColor: item.iconColor,
      iconBg: item.iconBg,
      shortcut: undefined,
      action: () => onNavigate?.(item.tab),
    }))
  }, [lang, onNavigate])

  // ============================================================
  // Build action commands
  // ============================================================
  const actionCommands: CommandItem[] = useMemo(() => {
    const actions: CommandItem[] = [
      {
        id: 'action-create-team',
        groupId: 'actions',
        label: t(lang, 'meeting.teamMeeting') || 'Create Team Meeting',
        description: 'Start a multi-agent discussion',
        icon: Users,
        iconColor: '#8b5cf6',
        iconBg: 'rgba(139,92,246,0.12)',
        action: () => onCreateTeamMeeting?.(),
      },
      {
        id: 'action-create-individual',
        groupId: 'actions',
        label: t(lang, 'meeting.individualMeeting') || 'Create Individual Meeting',
        description: 'One-on-one agent + critic session',
        icon: MessageSquare,
        iconColor: '#f59e0b',
        iconBg: 'rgba(245,158,11,0.12)',
        action: () => onCreateIndividualMeeting?.(),
      },
      {
        id: 'action-create-agent',
        groupId: 'actions',
        label: t(lang, 'agents.create') || 'Create New Agent',
        description: 'Add a new AI research agent',
        icon: Plus,
        iconColor: '#06b6d4',
        iconBg: 'rgba(6,182,212,0.12)',
        action: () => onCreateAgent?.(),
      },
      {
        id: 'action-export-json',
        groupId: 'actions',
        label: 'Export Data (JSON)',
        description: 'Download all data as JSON',
        icon: FileJson,
        iconColor: '#10b981',
        iconBg: 'rgba(16,185,129,0.12)',
        shortcut: 'Ctrl+Shift+E',
        action: () => onExportData?.('json'),
      },
      {
        id: 'action-export-csv',
        groupId: 'actions',
        label: 'Export Data (CSV)',
        description: 'Download all data as CSV',
        icon: FileSpreadsheet,
        iconColor: '#10b981',
        iconBg: 'rgba(16,185,129,0.12)',
        action: () => onExportData?.('csv'),
      },
      {
        id: 'action-export-pdf',
        groupId: 'actions',
        label: 'Export Data (PDF)',
        description: 'Generate PDF report',
        icon: Download,
        iconColor: '#10b981',
        iconBg: 'rgba(16,185,129,0.12)',
        action: () => onExportData?.('pdf'),
      },
      {
        id: 'action-toggle-theme',
        groupId: 'actions',
        label: 'Toggle Theme',
        description: 'Switch dark / light mode',
        icon: Sun,
        iconColor: '#f59e0b',
        iconBg: 'rgba(245,158,11,0.12)',
        shortcut: 'Ctrl+D',
        action: () => onToggleTheme?.(),
      },
      {
        id: 'action-toggle-focus',
        groupId: 'actions',
        label: 'Toggle Focus Mode',
        description: 'Distraction-free view',
        icon: Maximize2,
        iconColor: '#8b5cf6',
        iconBg: 'rgba(139,92,246,0.12)',
        shortcut: 'Ctrl+.',
        action: () => onToggleFocusMode?.(),
      },
      {
        id: 'action-quick-analysis',
        groupId: 'actions',
        label: 'Run Quick Analysis',
        description: 'Generate insights from recent data',
        icon: Zap,
        iconColor: '#f97316',
        iconBg: 'rgba(249,115,22,0.12)',
        action: () => onRunQuickAnalysis?.(),
      },
      {
        id: 'action-api-docs',
        groupId: 'actions',
        label: 'Open API Docs',
        description: 'View API documentation',
        icon: Terminal,
        iconColor: '#0ea5e9',
        iconBg: 'rgba(14,165,233,0.12)',
        action: () => onOpenApiDocs?.(),
      },
    ]
    return actions
  }, [lang, onCreateTeamMeeting, onCreateIndividualMeeting, onCreateAgent, onExportData, onToggleTheme, onToggleFocusMode, onRunQuickAnalysis, onOpenApiDocs])

  // ============================================================
  // Build recent commands
  // ============================================================
  const recentCommands: CommandItem[] = useMemo(() => {
    if (recentHistory.length === 0) return []

    // Create a lookup for all possible commands
    const allCommands = new Map<string, CommandItem>()
    for (const cmd of [...navigationCommands, ...actionCommands]) {
      allCommands.set(cmd.id, cmd)
    }

    return recentHistory.map(entry => {
      const existing = allCommands.get(entry.id)
      if (existing) {
        return {
          ...existing,
          groupId: 'recent' as CommandGroupId,
        }
      }
      return {
        id: entry.id,
        groupId: 'recent' as CommandGroupId,
        label: entry.label,
        description: undefined,
        icon: Clock,
        iconColor: '#64748b',
        iconBg: 'rgba(100,116,139,0.12)',
        action: () => {},
      }
    })
  }, [recentHistory, navigationCommands, actionCommands])

  // ============================================================
  // Build agent commands
  // ============================================================
  const agentCommands: CommandItem[] = useMemo(() => {
    return agents.slice(0, 8).map(agent => ({
      id: `agent-${agent.id}`,
      groupId: 'agents' as CommandGroupId,
      label: agent.name,
      description: agent.expertise,
      icon: Bot,
      iconColor: agent.color,
      iconBg: `${agent.color}20`,
      agentColor: agent.color,
      action: () => onNavigate?.('agents'),
    }))
  }, [agents, onNavigate])

  // ============================================================
  // Build meeting commands
  // ============================================================
  const meetingCommands: CommandItem[] = useMemo(() => {
    return meetings.slice(0, 6).map(meeting => ({
      id: `meeting-${meeting.id}`,
      groupId: 'meetings' as CommandGroupId,
      label: meeting.name,
      description: `${meeting.type === 'team' ? 'Team' : 'Individual'} meeting`,
      icon: meeting.type === 'team' ? Users : MessageSquare,
      iconColor: meeting.type === 'team' ? '#8b5cf6' : '#f59e0b',
      iconBg: meeting.type === 'team' ? 'rgba(139,92,246,0.12)' : 'rgba(245,158,11,0.12)',
      meetingStatus: meeting.status,
      action: () => onNavigate?.(meeting.type === 'team' ? 'team' : 'individual'),
    }))
  }, [meetings, onNavigate])

  // ============================================================
  // Assemble groups (context-aware)
  // ============================================================
  const groups: CommandGroup[] = useMemo(() => {
    const result: CommandGroup[] = []

    // Context-aware: prioritize certain actions based on active tab
    const contextActions = [...actionCommands]
    if (activeTab === 'team') {
      // Push "Create Team Meeting" to front if on team tab
      const teamIdx = contextActions.findIndex(a => a.id === 'action-create-team')
      if (teamIdx > 0) {
        const [teamAction] = contextActions.splice(teamIdx, 1)
        contextActions.unshift(teamAction)
      }
    } else if (activeTab === 'individual') {
      const indIdx = contextActions.findIndex(a => a.id === 'action-create-individual')
      if (indIdx > 0) {
        const [indAction] = contextActions.splice(indIdx, 1)
        contextActions.unshift(indAction)
      }
    } else if (activeTab === 'agents') {
      const agentIdx = contextActions.findIndex(a => a.id === 'action-create-agent')
      if (agentIdx > 0) {
        const [agentAction] = contextActions.splice(agentIdx, 1)
        contextActions.unshift(agentAction)
      }
    }

    // Recent group
    if (recentCommands.length > 0 && !query) {
      result.push({
        id: 'recent',
        label: 'Recent',
        icon: Clock,
        iconColor: '#64748b',
        iconBg: 'rgba(100,116,139,0.12)',
        items: recentCommands,
      })
    }

    // Navigation
    result.push({
      id: 'navigation',
      label: t(lang, 'header.commandPalette') ? 'Navigation' : 'Navigation',
      icon: LayoutDashboard,
      iconColor: '#10b981',
      iconBg: 'rgba(16,185,129,0.12)',
      items: navigationCommands,
    })

    // Actions
    result.push({
      id: 'actions',
      label: 'Actions',
      icon: Zap,
      iconColor: '#f59e0b',
      iconBg: 'rgba(245,158,11,0.12)',
      items: contextActions,
    })

    // Agents (show if agents exist or query present)
    if (agentCommands.length > 0) {
      result.push({
        id: 'agents',
        label: 'Agents',
        icon: Bot,
        iconColor: '#06b6d4',
        iconBg: 'rgba(6,182,212,0.12)',
        items: agentCommands,
      })
    }

    // Meetings (show if meetings exist or query present)
    if (meetingCommands.length > 0) {
      result.push({
        id: 'meetings',
        label: 'Meetings',
        icon: Calendar,
        iconColor: '#8b5cf6',
        iconBg: 'rgba(139,92,246,0.12)',
        items: meetingCommands,
      })
    }

    return result
  }, [query, activeTab, recentCommands, navigationCommands, actionCommands, agentCommands, meetingCommands, lang])

  // ============================================================
  // Filter & search groups
  // ============================================================
  const filteredGroups = useMemo(() => {
    if (!query.trim()) return groups

    return groups
      .map(group => {
        const q = query.toLowerCase()
        const scored = group.items
          .map(item => {
            const searchText = `${item.label} ${item.description || ''}`.toLowerCase()
            const score = fuzzyScore(searchText, q)
            return { item, score }
          })
          .filter(s => s.score > 0)
          .sort((a, b) => b.score - a.score)
          .map(s => s.item)
          .slice(0, 8)
        return { ...group, items: scored }
      })
      .filter(group => group.items.length > 0)
  }, [groups, query])

  // ============================================================
  // Compute flat list for keyboard navigation
  // ============================================================
  const flatItems = useMemo(() => {
    return filteredGroups.flatMap(g => g.items)
  }, [filteredGroups])

  const cumulativeStartIndices = useMemo(() => {
    const map: Record<string, number> = {}
    let total = 0
    for (const g of filteredGroups) {
      map[g.id] = total
      total += g.items.length
    }
    return map
  }, [filteredGroups])

  // ============================================================
  // Effects
  // ============================================================

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      setIsClosing(false)
      setRecentHistory(loadCommandHistory())
      // Focus input after a frame
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [open])

  // Reset active index when filtered items change
  useEffect(() => {
    setActiveIndex(0)
  }, [flatItems.length])

  // Keyboard navigation
  useEffect(() => {
    if (!open || isClosing) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault()
          setActiveIndex(prev => {
            const next = prev + 1
            return next >= flatItems.length ? 0 : next
          })
          break
        }
        case 'ArrowUp': {
          e.preventDefault()
          setActiveIndex(prev => {
            const next = prev - 1
            return next < 0 ? Math.max(0, flatItems.length - 1) : next
          })
          break
        }
        case 'Enter': {
          e.preventDefault()
          if (activeIndex >= 0 && activeIndex < flatItems.length) {
            const item = flatItems[activeIndex]
            // Record to history
            addToHistory({
              id: item.id,
              label: item.label,
              groupId: item.groupId,
              timestamp: Date.now(),
            })
            setRecentHistory(loadCommandHistory())
            item.action()
            handleClose()
          }
          break
        }
        case 'Tab': {
          e.preventDefault()
          // Tab cycles through groups (focus first item of next group)
          const currentGroup = filteredGroups.find(g =>
            cumulativeStartIndices[g.id] !== undefined &&
            activeIndex >= cumulativeStartIndices[g.id] &&
            activeIndex < cumulativeStartIndices[g.id] + g.items.length
          )
          if (currentGroup) {
            const groupIdx = filteredGroups.findIndex(g => g.id === currentGroup.id)
            const nextGroupIdx = (groupIdx + 1) % filteredGroups.length
            const nextGroupId = filteredGroups[nextGroupIdx]?.id
            if (nextGroupId && cumulativeStartIndices[nextGroupId] !== undefined) {
              setActiveIndex(cumulativeStartIndices[nextGroupId])
            }
          } else if (filteredGroups.length > 0) {
            setActiveIndex(0)
          }
          break
        }
        case 'Escape': {
          e.preventDefault()
          handleClose()
          break
        }
        default:
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, isClosing, flatItems, activeIndex, filteredGroups, cumulativeStartIndices])

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && resultsRef.current) {
      const buttons = resultsRef.current.querySelectorAll('[data-cmd-index]')
      const activeBtn = buttons[activeIndex] as HTMLElement | undefined
      activeBtn?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [activeIndex])

  // ============================================================
  // Handlers
  // ============================================================

  const handleClose = useCallback(() => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 150)
  }, [onClose])

  const handleSelect = useCallback((item: CommandItem) => {
    addToHistory({
      id: item.id,
      label: item.label,
      groupId: item.groupId,
      timestamp: Date.now(),
    })
    setRecentHistory(loadCommandHistory())
    item.action()
    handleClose()
  }, [handleClose])

  const handleClearQuery = useCallback(() => {
    setQuery('')
    inputRef.current?.focus()
  }, [])

  // ============================================================
  // Render
  // ============================================================

  if (!open) return null

  const hasNoResults = query && flatItems.length === 0

  return (
    <div
      className={`cmd-palette-overlay${isClosing ? ' cmd-palette-overlay-closing' : ''}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          handleClose()
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
    >
      <div className={`cmd-palette-dialog${isClosing ? ' cmd-palette-dialog-closing' : ''}`}>
        {/* Search Input */}
        <div className="cmd-palette-input-wrapper">
          <div className="cmd-palette-input-icon">
            <Search className="w-4 h-4" />
          </div>
          <input
            ref={inputRef}
            type="text"
            className="cmd-palette-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            spellCheck={false}
            autoComplete="off"
            aria-label="Search commands"
            aria-activedescendant={
              activeIndex >= 0 && activeIndex < flatItems.length
                ? `cmd-${flatItems[activeIndex].id}`
                : undefined
            }
          />
          {query && (
            <button
              type="button"
              className="cmd-palette-input-clear"
              onClick={handleClearQuery}
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Results */}
        <div ref={resultsRef} className="cmd-palette-results">
          {hasNoResults ? (
            <EmptyState query={query} lang={lang} />
          ) : (
            filteredGroups.map(group => (
              <CommandGroupSection
                key={group.id}
                group={group}
                query={query}
                activeIndex={activeIndex}
                startIndex={cumulativeStartIndices[group.id] ?? 0}
                onActivate={setActiveIndex}
                onSelect={handleSelect}
                lang={lang}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="cmd-palette-footer">
          <div className="cmd-palette-footer-hints">
            <div className="cmd-palette-footer-hint">
              <kbd className="cmd-palette-shortcut">
                <ArrowUp className="w-2.5 h-2.5" />
                <ArrowDown className="w-2.5 h-2.5" />
              </kbd>
              <span>navigate</span>
            </div>
            <div className="cmd-palette-footer-hint">
              <kbd className="cmd-palette-shortcut">&crarr;</kbd>
              <span>select</span>
            </div>
            <div className="cmd-palette-footer-hint">
              <kbd className="cmd-palette-shortcut">
                <PanelTop className="w-2.5 h-2.5" />
              </kbd>
              <span>groups</span>
            </div>
            <div className="cmd-palette-footer-hint">
              <kbd className="cmd-palette-shortcut">esc</kbd>
              <span>close</span>
            </div>
          </div>
          <div className="cmd-palette-footer-trigger">
            <Command className="w-3 h-3" />
            <span>K</span>
          </div>
        </div>
      </div>
    </div>
  )
}
