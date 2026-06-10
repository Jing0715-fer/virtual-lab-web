'use client'

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Map, MapPin, Minimize2, Maximize2, ChevronUp,
  LayoutDashboard, Users, Bot, MessageSquare, History,
  GitBranch, FlaskConical, BookOpen, Settings,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { TabValue } from './shared-components'

// ============================================================
// Types
// ============================================================

interface MiniMapSection {
  id: string
  label: string
  color: string
  icon?: React.ElementType
}

interface MiniMapWidgetProps {
  activeTab: TabValue
  lang: Lang
}

// ============================================================
// Tab Section Definitions
// ============================================================

const TAB_SECTIONS: Record<string, MiniMapSection[]> = {
  'dashboard': [
    { id: 'stats', label: 'Stats', color: 'bg-emerald-500/30' },
    { id: 'charts', label: 'Charts', color: 'bg-cyan-500/30' },
    { id: 'how-it-works', label: 'How It Works', color: 'bg-amber-500/30' },
    { id: 'quick-actions', label: 'Quick Actions', color: 'bg-violet-500/30' },
    { id: 'activity', label: 'Activity', color: 'bg-orange-500/30' },
  ],
  'agents': [
    { id: 'agent-list', label: 'Agent List', color: 'bg-emerald-500/30' },
    { id: 'agent-detail', label: 'Detail', color: 'bg-cyan-500/30' },
  ],
  'team-meeting': [
    { id: 'form', label: 'Form', color: 'bg-emerald-500/30' },
    { id: 'preview', label: 'Preview', color: 'bg-cyan-500/30' },
    { id: 'discussion', label: 'Discussion', color: 'bg-amber-500/30' },
  ],
  'individual-meeting': [
    { id: 'form', label: 'Form', color: 'bg-emerald-500/30' },
    { id: 'discussion', label: 'Discussion', color: 'bg-cyan-500/30' },
  ],
  'history': [
    { id: 'filters', label: 'Filters', color: 'bg-emerald-500/30' },
    { id: 'meetings-list', label: 'Meetings', color: 'bg-cyan-500/30' },
    { id: 'comparison', label: 'Comparison', color: 'bg-amber-500/30' },
  ],
  'pipeline': [
    { id: 'board', label: 'Board', color: 'bg-emerald-500/30' },
    { id: 'stages', label: 'Stages', color: 'bg-cyan-500/30' },
  ],
  'knowledge-base': [
    { id: 'articles', label: 'Articles', color: 'bg-emerald-500/30' },
  ],
  'research-papers': [
    { id: 'papers', label: 'Papers', color: 'bg-emerald-500/30' },
  ],
  'bio-tools': [
    { id: 'tools', label: 'Tools', color: 'bg-emerald-500/30' },
    { id: 'results', label: 'Results', color: 'bg-cyan-500/30' },
  ],
  'settings': [
    { id: 'general', label: 'General', color: 'bg-emerald-500/30' },
    { id: 'shortcuts', label: 'Shortcuts', color: 'bg-cyan-500/30' },
    { id: 'data', label: 'Data', color: 'bg-amber-500/30' },
  ],
}

const TAB_ICONS: Record<string, React.ElementType> = {
  'dashboard': LayoutDashboard,
  'agents': Bot,
  'team-meeting': Users,
  'individual-meeting': MessageSquare,
  'history': History,
  'pipeline': GitBranch,
  'knowledge-base': BookOpen,
  'research-papers': BookOpen,
  'bio-tools': FlaskConical,
  'settings': Settings,
}

// ============================================================
// MiniMapWidget — Main Component
// ============================================================

export function MiniMapWidget({ activeTab, lang }: MiniMapWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [viewportPosition, setViewportPosition] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(20)
  const [hoveredSection, setHoveredSection] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<string | null>(null)

  const sections = TAB_SECTIONS[activeTab] || []
  const TabIcon = TAB_ICONS[activeTab] || LayoutDashboard
  const mainContentRef = useRef<HTMLDivElement | null>(null)
  const animFrameRef = useRef<number>(0)

  // Track scroll position of the main content area
  useEffect(() => {
    const updateViewport = () => {
      const el = mainContentRef.current || document.querySelector('[role="tabpanel"]') ||
        document.querySelector('.tab-content-transition') ||
        document.querySelector('[data-radix-scroll-area-viewport]') ||
        document.querySelector('main')

      if (!el) return

      const scrollTop = el.scrollTop || window.scrollY
      const scrollHeight = el.scrollHeight || document.documentElement.scrollHeight
      const clientHeight = el.clientHeight || window.innerHeight

      if (scrollHeight <= clientHeight) {
        requestAnimationFrame(() => {
          setViewportPosition(0)
          setViewportHeight(100)
        })
        return
      }

      const pos = (scrollTop / (scrollHeight - clientHeight)) * 80 // 80% of minimap height
      const height = Math.max(15, (clientHeight / scrollHeight) * 80) // min 15%

      requestAnimationFrame(() => {
        setViewportPosition(pos)
        setViewportHeight(height)
      })
    }

    updateViewport()

    // Observe scroll
    const target = document.querySelector('[role="tabpanel"]') ||
      document.querySelector('main') ||
      document.documentElement

    target?.addEventListener('scroll', updateViewport, { passive: true })
    window.addEventListener('scroll', updateViewport, { passive: true })
    window.addEventListener('resize', updateViewport, { passive: true })

    return () => {
      target?.removeEventListener('scroll', updateViewport)
      window.removeEventListener('scroll', updateViewport)
      window.removeEventListener('resize', updateViewport)
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [activeTab])

  // IntersectionObserver for active section tracking
  useEffect(() => {
    const sectionElements = sections.map(s => document.querySelector(`[data-minimap-section="${s.id}"]`)).filter(Boolean)
    if (sectionElements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
            const id = entry.target.getAttribute('data-minimap-section')
            if (id) requestAnimationFrame(() => setActiveSection(id))
          }
        }
      },
      { threshold: 0.3 }
    )

    sectionElements.forEach(el => { if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [activeTab, sections])

  const handleSectionClick = useCallback((sectionId: string) => {
    const el = document.querySelector(`[data-minimap-section="${sectionId}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveSection(sectionId)
    }
  }, [])

  return (
    <>
      {/* Mini Map Widget - Desktop Only */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-4 right-4 z-40 hidden lg:block"
          >
            <div className={`
              rounded-xl border border-[var(--vl-border)] shadow-lg
              bg-[var(--vl-bg-card)] backdrop-blur-md
              ${isExpanded ? 'w-48' : 'w-10'}
              transition-all duration-300 overflow-hidden
            `}>
              {/* Header */}
              <div className="flex items-center justify-between px-2 py-1.5 border-b border-[var(--vl-border-subtle)]">
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-1.5 min-w-0"
                    >
                      <TabIcon className="size-3 text-emerald-400 flex-shrink-0" />
                      <span className="text-[10px] font-medium vl-text-heading truncate">
                        {t(lang, 'minimap.title')}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="flex items-center gap-0.5 ml-auto">
                  {isExpanded && (
                    <button
                      type="button"
                      onClick={() => setIsExpanded(false)}
                      className="w-5 h-5 rounded flex items-center justify-center vl-text-muted hover:text-[var(--vl-text-white)] transition-colors cursor-pointer"
                      aria-label={t(lang, 'minimap.collapse')}
                    >
                      <Minimize2 className="size-2.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsCollapsed(true)}
                    className="w-5 h-5 rounded flex items-center justify-center vl-text-muted hover:text-[var(--vl-text-white)] transition-colors cursor-pointer"
                    aria-label={t(lang, 'a11y.close')}
                  >
                    <ChevronUp className="size-2.5" />
                  </button>
                </div>
              </div>

              {/* Section list */}
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="relative px-2 py-2"
                  style={{ minHeight: 120 }}
                >
                  {/* Mini map sections */}
                  <div className="space-y-1.5 relative">
                    {sections.map((section, i) => {
                      const isActive = activeSection === section.id
                      const isHovered = hoveredSection === section.id
                      return (
                        <button
                          key={section.id}
                          type="button"
                          onClick={() => handleSectionClick(section.id)}
                          onMouseEnter={() => setHoveredSection(section.id)}
                          onMouseLeave={() => setHoveredSection(null)}
                          className={`
                            w-full flex items-center gap-1.5 px-1.5 py-1 rounded-md transition-all duration-150 cursor-pointer
                            ${isActive
                              ? 'bg-emerald-500/10 border border-emerald-500/30'
                              : isHovered
                                ? 'bg-[var(--vl-bg-inner)] border border-[var(--vl-border-subtle)]'
                                : 'border border-transparent hover:bg-[var(--vl-bg-inner)]'
                            }
                          `}
                          aria-label={section.label}
                        >
                          <div className={`w-2 h-2 rounded-sm ${section.color} ${isActive ? 'ring-1 ring-emerald-400/50' : ''}`} />
                          <span className={`text-[9px] truncate ${
                            isActive ? 'text-emerald-400 font-medium' : 'vl-text-muted'
                          }`}>
                            {section.label}
                          </span>
                        </button>
                      )
                    })}

                    {/* Viewport indicator overlay */}
                    <div
                      className="absolute right-2 pointer-events-none rounded-md border border-emerald-500/30 bg-emerald-500/5 minimap-viewport-indicator"
                      style={{
                        top: `${viewportPosition}%`,
                        height: `${viewportHeight}%`,
                        width: 'calc(100% - 1rem)',
                      }}
                    />
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed: just a small button */}
      {isCollapsed && (
        <motion.button
          type="button"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => { setIsCollapsed(false); setIsExpanded(true) }}
          className="fixed bottom-4 right-4 z-40 hidden lg:flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--vl-bg-card)] border border-[var(--vl-border)] shadow-lg backdrop-blur-md vl-text-muted hover:text-emerald-400 hover:border-emerald-500/40 transition-all cursor-pointer"
          aria-label={t(lang, 'minimap.openMap')}
        >
          <Map className="size-4" />
        </motion.button>
      )}
    </>
  )
}
