'use client'

/**
 * Bundle Analyzer — Client-side bundle analysis tool
 *
 * Provides a lightweight analysis of:
 * - Route-based code splitting coverage
 * - Component size estimation (line count as proxy)
 * - Lazy loading coverage percentage
 * - Auto-generated optimization recommendations
 *
 * This is a diagnostic tool for development, not a build-time analyzer.
 */

import React, { useState, useMemo } from 'react'
import {
  Package, Layers, Zap, AlertTriangle, CheckCircle2, X,
  ChevronDown, ChevronUp, BarChart3, Code2, SplitSquareHorizontal
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

// ============================================================
// Component Registry — Source of truth for analysis
// ============================================================

interface ComponentEntry {
  name: string
  path: string
  estimatedLines: number
  isLazy: boolean
  category: string
  usesHeavyDeps: string[]
}

const COMPONENT_REGISTRY: ComponentEntry[] = [
  // Tab components (lazy via React.lazy)
  { name: 'DashboardTab', path: './dashboard-tab', estimatedLines: 2100, isLazy: true, category: 'Tab', usesHeavyDeps: ['recharts'] },
  { name: 'AgentsTab', path: './agents-tab', estimatedLines: 1800, isLazy: true, category: 'Tab', usesHeavyDeps: [] },
  { name: 'TeamMeetingTab', path: './team-meeting-tab', estimatedLines: 2200, isLazy: true, category: 'Tab', usesHeavyDeps: [] },
  { name: 'IndividualMeetingTab', path: './individual-meeting-tab', estimatedLines: 1900, isLazy: true, category: 'Tab', usesHeavyDeps: [] },
  { name: 'HistoryTab', path: './history-tab', estimatedLines: 1500, isLazy: true, category: 'Tab', usesHeavyDeps: [] },
  { name: 'PipelineTab', path: './pipeline-tab', estimatedLines: 3351, isLazy: true, category: 'Tab', usesHeavyDeps: ['recharts', '@dnd-kit'] },
  { name: 'SettingsTab', path: './settings-tab', estimatedLines: 800, isLazy: true, category: 'Tab', usesHeavyDeps: [] },
  { name: 'BioToolsTab', path: './bio-tools-tab', estimatedLines: 2004, isLazy: true, category: 'Tab', usesHeavyDeps: [] },
  { name: 'KnowledgeBaseTab', path: './knowledge-base-tab', estimatedLines: 1345, isLazy: true, category: 'Tab', usesHeavyDeps: [] },
  { name: 'ResearchPapersTab', path: './research-papers-tab', estimatedLines: 1200, isLazy: true, category: 'Tab', usesHeavyDeps: [] },

  // Lazy components (via next/dynamic)
  { name: 'MeetingInsightsPanel', path: './meeting-insights-panel', estimatedLines: 637, isLazy: true, category: 'Feature', usesHeavyDeps: ['recharts'] },
  { name: 'MeetingInsightsTab', path: './meeting-insights-tab', estimatedLines: 800, isLazy: true, category: 'Feature', usesHeavyDeps: ['recharts', 'framer-motion'] },
  { name: 'AgentComparisonView', path: './agent-comparison', estimatedLines: 600, isLazy: true, category: 'Feature', usesHeavyDeps: ['recharts'] },
  { name: 'MeetingComparisonDashboard', path: './meeting-comparison-dashboard', estimatedLines: 500, isLazy: true, category: 'Feature', usesHeavyDeps: ['recharts'] },
  { name: 'ActivityFeedPanel', path: './activity-feed-panel', estimatedLines: 503, isLazy: true, category: 'Feature', usesHeavyDeps: [] },
  { name: 'NotificationCenter', path: './notification-center', estimatedLines: 1064, isLazy: true, category: 'Feature', usesHeavyDeps: [] },
  { name: 'EnhancedNotificationPanel', path: './notification-panel-enhanced', estimatedLines: 800, isLazy: true, category: 'Feature', usesHeavyDeps: [] },
  { name: 'GlobalChatWidget', path: './global-chat-widget', estimatedLines: 900, isLazy: true, category: 'Feature', usesHeavyDeps: [] },
  { name: 'CollaborationPanel', path: './collaboration-panel', estimatedLines: 1200, isLazy: true, category: 'Feature', usesHeavyDeps: [] },
  { name: 'DashboardWidgetSystem', path: './dashboard-widget-system', estimatedLines: 1500, isLazy: true, category: 'Feature', usesHeavyDeps: ['framer-motion'] },
  { name: 'ResearchNotesEnhanced', path: './research-notes-enhanced', estimatedLines: 1100, isLazy: true, category: 'Feature', usesHeavyDeps: ['react-markdown'] },
  { name: 'AgentDetailView', path: './agent-detail-view', estimatedLines: 457, isLazy: true, category: 'Feature', usesHeavyDeps: [] },
  { name: 'AgentChatPanel', path: './agent-chat-panel', estimatedLines: 1125, isLazy: true, category: 'Feature', usesHeavyDeps: [] },
  { name: 'MeetingReplayPlayer', path: './meeting-replay-player', estimatedLines: 733, isLazy: true, category: 'Feature', usesHeavyDeps: [] },
  { name: 'MeetingWhiteboardTab', path: './meeting-whiteboard-tab', estimatedLines: 800, isLazy: true, category: 'Feature', usesHeavyDeps: ['canvas'] },
  { name: 'OnboardingOverlay', path: './onboarding-tour', estimatedLines: 900, isLazy: true, category: 'Feature', usesHeavyDeps: [] },
  { name: 'GlobalSearchDialog', path: './global-search-dialog', estimatedLines: 600, isLazy: true, category: 'Feature', usesHeavyDeps: [] },
  { name: 'AIMeetingAssistant', path: './ai-meeting-assistant', estimatedLines: 500, isLazy: true, category: 'Feature', usesHeavyDeps: [] },
  { name: 'ExportDialogEnhanced', path: './export-dialog-enhanced', estimatedLines: 300, isLazy: true, category: 'Feature', usesHeavyDeps: [] },
  { name: 'MeetingAnnotationsPanel', path: './meeting-annotations-panel', estimatedLines: 700, isLazy: true, category: 'Feature', usesHeavyDeps: [] },

  // Direct imports (page.tsx)
  { name: 'shared-components', path: './shared-components', estimatedLines: 4474, isLazy: false, category: 'Core', usesHeavyDeps: [] },
  { name: 'scroll-animations', path: './scroll-animations', estimatedLines: 272, isLazy: false, category: 'Effect', usesHeavyDeps: [] },
  { name: 'background-effects', path: './background-effects', estimatedLines: 202, isLazy: false, category: 'Effect', usesHeavyDeps: [] },
  { name: 'page-transitions', path: './page-transitions', estimatedLines: 219, isLazy: false, category: 'Effect', usesHeavyDeps: [] },
  { name: 'notification-sounds', path: './notification-sounds', estimatedLines: 273, isLazy: false, category: 'Hook', usesHeavyDeps: [] },
  { name: 'accessibility-utils', path: './accessibility-utils', estimatedLines: 362, isLazy: false, category: 'Util', usesHeavyDeps: [] },
  { name: 'keyboard-nav-overlay', path: './keyboard-nav-overlay', estimatedLines: 569, isLazy: false, category: 'UI', usesHeavyDeps: ['framer-motion'] },
  { name: 'mini-map-widget', path: './mini-map-widget', estimatedLines: 324, isLazy: false, category: 'UI', usesHeavyDeps: [] },
  { name: 'glassmorphism-kit', path: './glassmorphism-kit', estimatedLines: 667, isLazy: false, category: 'UI', usesHeavyDeps: [] },

  // Orchestrator
  { name: 'page.tsx (Home)', path: './page.tsx', estimatedLines: 3050, isLazy: false, category: 'Core', usesHeavyDeps: ['framer-motion', 'sonner'] },
]

// ============================================================
// Analysis helpers
// ============================================================

function estimateBundleKB(lines: number): number {
  // Rough estimate: ~40 bytes per TypeScript line after minification
  return Math.round(lines * 40 / 1024)
}

function getSizeCategory(kb: number): { label: string; color: string } {
  if (kb <= 20) return { label: 'Small', color: 'text-emerald-400' }
  if (kb <= 60) return { label: 'Medium', color: 'text-amber-400' }
  if (kb <= 120) return { label: 'Large', color: 'text-orange-400' }
  return { label: 'Very Large', color: 'text-red-400' }
}

// ============================================================
// Bundle Analyzer Component
// ============================================================

export function BundleAnalyzer() {
  const [isOpen, setIsOpen] = useState(false)
  const [sortBy, setSortBy] = useState<'lines' | 'name' | 'category'>('lines')
  const [filterCategory, setFilterCategory] = useState<string>('all')

  // ── Analytics ──
  const analytics = useMemo(() => {
    const total = COMPONENT_REGISTRY.length
    const lazyCount = COMPONENT_REGISTRY.filter(c => c.isLazy).length
    const directCount = total - lazyCount
    const lazyPct = Math.round((lazyCount / total) * 100)
    const totalLines = COMPONENT_REGISTRY.reduce((s, c) => s + c.estimatedLines, 0)
    const lazyLines = COMPONENT_REGISTRY.filter(c => c.isLazy).reduce((s, c) => s + c.estimatedLines, 0)
    const directLines = totalLines - lazyLines
    const estimatedTotalKB = estimateBundleKB(totalLines)
    const lazyKB = estimateBundleKB(lazyLines)
    const directKB = estimatedTotalKB - lazyKB
    const categories = [...new Set(COMPONENT_REGISTRY.map(c => c.category))]

    // Recommendations
    const recommendations: { type: string; message: string; icon: React.ReactNode }[] = []

    const heavyDirect = COMPONENT_REGISTRY.filter(c => !c.isLazy && c.estimatedLines > 400)
    heavyDirect.forEach(c => {
      recommendations.push({
        type: 'warning',
        message: `${c.name} (${c.estimatedLines}L) is directly imported. Consider lazy-loading.`,
        icon: <AlertTriangle className="size-3.5 text-amber-400" />,
      })
    })

    if (lazyPct >= 80) {
      recommendations.push({
        type: 'success',
        message: `Excellent! ${lazyPct}% of components are lazy-loaded.`,
        icon: <CheckCircle2 className="size-3.5 text-emerald-400" />,
      })
    }

    const heavyDeps = COMPONENT_REGISTRY.filter(c => c.usesHeavyDeps.includes('recharts'))
    if (heavyDeps.length > 5) {
      recommendations.push({
        type: 'info',
        message: `${heavyDeps.length} components use recharts. Consider a shared chunk.`,
        icon: <Package className="size-3.5 text-blue-400" />,
      })
    }

    recommendations.push({
      type: 'info',
      message: `Total estimated bundle: ~${estimatedTotalKB}KB (${totalLines.toLocaleString()} lines)`,
      icon: <BarChart3 className="size-3.5 text-blue-400" />,
    })

    if (directKB > 200) {
      recommendations.push({
        type: 'warning',
        message: `Direct imports: ~${directKB}KB loaded upfront. Review for lazy-load candidates.`,
        icon: <AlertTriangle className="size-3.5 text-amber-400" />,
      })
    }

    return {
      total, lazyCount, directCount, lazyPct,
      totalLines, lazyLines, directLines,
      estimatedTotalKB, lazyKB, directKB,
      categories, recommendations,
    }
  }, [])

  // ── Sorted & filtered components ──
  const components = useMemo(() => {
    let list = filterCategory === 'all'
      ? [...COMPONENT_REGISTRY]
      : COMPONENT_REGISTRY.filter(c => c.category === filterCategory)

    switch (sortBy) {
      case 'lines': list.sort((a, b) => b.estimatedLines - a.estimatedLines); break
      case 'name': list.sort((a, b) => a.name.localeCompare(b.name)); break
      case 'category': list.sort((a, b) => a.category.localeCompare(b.category) || b.estimatedLines - a.estimatedLines); break
    }
    return list
  }, [sortBy, filterCategory])

  // ── Toggle button ──
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-[90] w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110"
        style={{ background: 'var(--vl-bg-card)', border: '1px solid var(--vl-border)' }}
        title="Bundle Analyzer"
        aria-label="Open bundle analyzer"
      >
        <Package className="size-4 text-blue-400" />
      </button>
    )
  }

  return (
    <div
      className="fixed bottom-4 left-4 z-[90] w-96 max-h-[80vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
      style={{ background: 'var(--vl-bg-card)', border: '1px solid var(--vl-border)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--vl-border)' }}>
        <div className="flex items-center gap-2">
          <Package className="size-4 text-blue-400" />
          <span className="text-sm font-semibold vl-text-heading">Bundle Analyzer</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--vl-bg-inner)] transition-colors">
          <X className="size-3.5 vl-text-muted" />
        </button>
      </div>

      {/* Summary stats */}
      <div className="px-4 py-3 border-b space-y-2" style={{ borderColor: 'var(--vl-border)' }}>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-lg font-bold text-emerald-400">{analytics.lazyPct}%</div>
            <div className="text-[10px] vl-text-muted">Lazy Loaded</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold vl-text-heading">~{analytics.estimatedTotalKB}KB</div>
            <div className="text-[10px] vl-text-muted">Est. Bundle</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold vl-text-heading">{analytics.total}</div>
            <div className="text-[10px] vl-text-muted">Components</div>
          </div>
        </div>
        {/* Lazy vs Direct bar */}
        <div className="flex h-2 rounded-full overflow-hidden bg-[var(--vl-bg-inner)]">
          <div className="bg-emerald-500/70 transition-all" style={{ width: `${analytics.lazyPct}%` }} />
          <div className="bg-amber-500/70 transition-all" style={{ width: `${100 - analytics.lazyPct}%` }} />
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="size-3" />{analytics.lazyCount} lazy (~{analytics.lazyKB}KB)</span>
          <span className="text-amber-400 flex items-center gap-1"><AlertTriangle className="size-3" />{analytics.directCount} direct (~{analytics.directKB}KB)</span>
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 py-2 border-b flex items-center gap-2" style={{ borderColor: 'var(--vl-border)' }}>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as any)}
          className="text-[10px] bg-[var(--vl-bg-inner)] border border-[var(--vl-border)] rounded-md px-2 py-1 vl-text-body"
        >
          <option value="lines">By Size</option>
          <option value="name">By Name</option>
          <option value="category">By Category</option>
        </select>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="text-[10px] bg-[var(--vl-bg-inner)] border border-[var(--vl-border)] rounded-md px-2 py-1 vl-text-body"
        >
          <option value="all">All Categories</option>
          {analytics.categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Component list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1" style={{ maxHeight: 'calc(80vh - 250px)' }}>
        {components.map(comp => {
          const kb = estimateBundleKB(comp.estimatedLines)
          const size = getSizeCategory(kb)
          return (
            <div key={comp.name} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--vl-bg-inner)] transition-colors group">
              {/* Lazy indicator */}
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${comp.isLazy ? 'bg-emerald-400' : 'bg-amber-400'}`} title={comp.isLazy ? 'Lazy-loaded' : 'Direct import'} />
              {/* Name & path */}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium vl-text-heading truncate">{comp.name}</div>
                <div className="text-[9px] vl-text-muted truncate">{comp.path}</div>
              </div>
              {/* Heavy deps */}
              {comp.usesHeavyDeps.length > 0 && (
                <div className="hidden sm:flex items-center gap-0.5">
                  {comp.usesHeavyDeps.map(dep => (
                    <Badge key={dep} variant="outline" className="border-0 text-[8px] px-1 py-0 text-purple-400 bg-purple-500/10">{dep}</Badge>
                  ))}
                </div>
              )}
              {/* Size */}
              <div className="text-right flex-shrink-0">
                <div className={`text-[10px] font-bold ${size.color}`}>{kb}KB</div>
                <div className="text-[8px] vl-text-muted">{comp.estimatedLines}L</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Recommendations */}
      <div className="border-t p-3 space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar" style={{ borderColor: 'var(--vl-border)' }}>
        <div className="text-[10px] font-medium vl-text-muted uppercase tracking-wider">Recommendations</div>
        {analytics.recommendations.slice(0, 4).map((rec, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <div className="mt-0.5">{rec.icon}</div>
            <p className="text-[10px] vl-text-body leading-relaxed">{rec.message}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
