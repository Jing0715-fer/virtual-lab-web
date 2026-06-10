'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  GitBranch, Tag, Clock, User, Search, Filter, ChevronDown, ChevronUp,
  Download, FileText, Sparkles, Wrench, RefreshCw, BookOpen, Zap, Shield,
  AlertTriangle, GitCommit, Eye, Code, Hash, ArrowRight, ArrowLeft,
  Plus, X, CalendarDays, BarChart3, PieChart as PieChartIcon,
  MessageSquare, Layers, Link2
} from 'lucide-react'
import type { Lang } from '@/lib/i18n'

// ─── Types ────────────────────────────────────────────────────
export type ChangelogCategory =
  | 'feature'
  | 'fix'
  | 'enhancement'
  | 'refactor'
  | 'documentation'
  | 'performance'
  | 'security'
  | 'breaking_change'

export interface ChangelogEntry {
  id: string
  version: string
  date: string
  author: string
  category: ChangelogCategory
  title: string
  description: string
  relatedItems: string[]
  isExpanded?: boolean
}

interface ChangelogSystemProps {
  lang?: Lang
}

// ─── Constants ────────────────────────────────────────────────
const STORAGE_KEY = 'vl-changelog'

const CATEGORY_CONFIG: Record<ChangelogCategory, {
  label: string
  color: string
  icon: React.ReactNode
  gradient: string
}> = {
  feature: {
    label: 'Feature',
    color: '#10b981',
    icon: <Sparkles className="size-3.5" />,
    gradient: 'from-emerald-500 to-green-600'
  },
  fix: {
    label: 'Fix',
    color: '#ef4444',
    icon: <Wrench className="size-3.5" />,
    gradient: 'from-red-500 to-rose-600'
  },
  enhancement: {
    label: 'Enhancement',
    color: '#3b82f6',
    icon: <RefreshCw className="size-3.5" />,
    gradient: 'from-blue-500 to-indigo-500'
  },
  refactor: {
    label: 'Refactor',
    color: '#8b5cf6',
    icon: <Code className="size-3.5" />,
    gradient: 'from-violet-500 to-purple-600'
  },
  documentation: {
    label: 'Documentation',
    color: '#06b6d4',
    icon: <BookOpen className="size-3.5" />,
    gradient: 'from-cyan-500 to-teal-500'
  },
  performance: {
    label: 'Performance',
    color: '#f59e0b',
    icon: <Zap className="size-3.5" />,
    gradient: 'from-amber-500 to-orange-500'
  },
  security: {
    label: 'Security',
    color: '#dc2626',
    icon: <Shield className="size-3.5" />,
    gradient: 'from-red-600 to-red-700'
  },
  breaking_change: {
    label: 'Breaking Change',
    color: '#f97316',
    icon: <AlertTriangle className="size-3.5" />,
    gradient: 'from-orange-500 to-red-500'
  }
}

const ALL_VERSIONS = ['v1.0', 'v1.1', 'v1.2', 'v1.3', 'v1.4', 'v1.5', 'v1.6', 'v1.7', 'v1.7.1', 'v1.7.2', 'v1.7.3']

const VERSION_DATES: Record<string, string> = {
  'v1.0': '2024-01-15',
  'v1.1': '2024-02-10',
  'v1.2': '2024-03-05',
  'v1.3': '2024-04-02',
  'v1.4': '2024-05-10',
  'v1.5': '2024-06-15',
  'v1.6': '2024-07-20',
  'v1.7': '2024-08-25',
  'v1.7.1': '2024-09-08',
  'v1.7.2': '2024-09-22',
  'v1.7.3': '2024-10-05'
}

const AUTHORS = [
  'Dr. A. Chen', 'Prof. K. Tanaka', 'Dr. M. Smith', 'Dr. L. Kim',
  'Prof. Y. Park', 'Dr. R. Johnson', 'Dr. S. Williams', 'Dr. H. Suzuki'
]

// ─── Sample Data ────────────────────────────────────────────────
function generateSampleChangelog(): ChangelogEntry[] {
  return [
    {
      id: 'cl-001', version: 'v1.0', date: '2024-01-15', author: 'Dr. A. Chen',
      category: 'feature', title: 'Initial Release: Core Research Platform',
      description: '**VirtualLab v1.0** is now available!\n\nThis initial release includes:\n- Multi-agent research collaboration framework\n- Real-time meeting system with AI agents\n- Basic experiment tracking and data persistence\n- Research notes with markdown support\n- Initial i18n support (English, Chinese, Japanese, Korean)\n\nThe platform supports up to 8 concurrent AI agents working on research tasks.',
      relatedItems: ['#1', '#2', '#3']
    },
    {
      id: 'cl-002', version: 'v1.0', date: '2024-01-15', author: 'Dr. M. Smith',
      category: 'documentation', title: 'Setup Guide & API Reference',
      description: 'Published comprehensive documentation covering:\n- Installation and configuration guide\n- API reference for all endpoints\n- Agent persona configuration\n- Meeting system usage guide\n\nDocumentation is available in all 4 supported languages.',
      relatedItems: ['#4', '#5']
    },
    {
      id: 'cl-003', version: 'v1.0', date: '2024-01-15', author: 'Prof. K. Tanaka',
      category: 'feature', title: 'Agent Persona System',
      description: 'Introduced the agent persona system allowing customization of:\n- Agent name, role, and expertise areas\n- Communication style and tone\n- Available tools and capabilities\n- Visual appearance with color coding\n\nEach agent maintains a consistent persona across all interactions.',
      relatedItems: ['#6']
    },
    {
      id: 'cl-004', version: 'v1.1', date: '2024-02-10', author: 'Dr. L. Kim',
      category: 'feature', title: 'Knowledge Graph Integration',
      description: 'Added knowledge graph visualization for research data relationships.\n\nFeatures:\n- Interactive node-link diagram\n- Force-directed layout with collision detection\n- Click to expand related entities\n- Search and filter capabilities\n- Export as PNG or SVG\n\nThe knowledge graph now serves as the central navigation hub for all research data.',
      relatedItems: ['#10', '#11', '#12']
    },
    {
      id: 'cl-005', version: 'v1.1', date: '2024-02-10', author: 'Dr. R. Johnson',
      category: 'fix', title: 'Fix Meeting Timestamp Synchronization',
      description: 'Resolved an issue where meeting timestamps were incorrectly synchronized across different time zones.\n\n**Root cause:** Client-side timezone offset was not properly accounted for during message serialization.\n\n**Fix:** Server now stores all timestamps in UTC and converts to local timezone on display.',
      relatedItems: ['#13']
    },
    {
      id: 'cl-006', version: 'v1.2', date: '2024-03-05', author: 'Dr. A. Chen',
      category: 'feature', title: 'Experiment Tracker & Pipeline System',
      description: 'Introduced comprehensive experiment tracking:\n\n- Pipeline editor with drag-and-drop stage management\n- Experiment lifecycle tracking (draft → running → completed)\n- Result storage with version control\n- Comparison view for multiple experiment results\n- Pipeline templates for common research workflows\n\nThis enables systematic tracking of all research experiments with reproducible configurations.',
      relatedItems: ['#20', '#21', '#22', '#23']
    },
    {
      id: 'cl-007', version: 'v1.2', date: '2024-03-05', author: 'Dr. S. Williams',
      category: 'performance', title: 'Optimize Message Rendering Performance',
      description: 'Improved message rendering performance by 40% for meetings with 500+ messages.\n\n**Changes:**\n- Implemented virtual scrolling for message lists\n- Added message chunking and lazy loading\n- Optimized markdown parsing with caching\n- Reduced DOM node count by 60%',
      relatedItems: ['#24']
    },
    {
      id: 'cl-008', version: 'v1.2', date: '2024-03-05', author: 'Prof. Y. Park',
      category: 'enhancement', title: 'Enhanced Agent Skill System',
      description: 'Upgraded the agent skill system with:\n- Skill trees with unlock progression\n- XP and leveling system\n- Skill badges and achievements\n- Skill dependency management\n\nAgents can now develop specialized skills based on their research contributions.',
      relatedItems: ['#25', '#26']
    },
    {
      id: 'cl-009', version: 'v1.3', date: '2024-04-02', author: 'Dr. H. Suzuki',
      category: 'feature', title: 'Meeting Analytics Dashboard',
      description: 'Added a comprehensive analytics dashboard for meetings:\n\n- Participation statistics per agent\n- Topic distribution analysis\n- Decision tracking and action items\n- Sentiment analysis over time\n- Meeting efficiency scores\n- Export analytics as PDF reports\n\nAll analytics are computed in real-time and support historical comparison.',
      relatedItems: ['#30', '#31', '#32']
    },
    {
      id: 'cl-010', version: 'v1.3', date: '2024-04-02', author: 'Dr. L. Kim',
      category: 'fix', title: 'Fix Data Persistence Race Condition',
      description: 'Resolved a race condition in the data persistence layer that could cause data loss when multiple agents saved simultaneously.\n\n**Impact:** Affected meetings with 4+ concurrent agents.\n**Fix:** Implemented a queue-based write system with conflict resolution.',
      relatedItems: ['#33']
    },
    {
      id: 'cl-011', version: 'v1.3', date: '2024-04-02', author: 'Prof. K. Tanaka',
      category: 'refactor', title: 'Refactor Agent Communication Layer',
      description: 'Major refactor of the agent-to-agent communication layer:\n\n- Moved from direct RPC to message queue architecture\n- Added priority-based message routing\n- Implemented retry logic with exponential backoff\n- Decoupled communication from core agent logic\n\nThis refactor improves reliability and enables future distributed agent support.',
      relatedItems: ['#34', '#35']
    },
    {
      id: 'cl-012', version: 'v1.4', date: '2024-05-10', author: 'Dr. M. Smith',
      category: 'feature', title: 'Research Notes Enhancement Suite',
      description: 'Major upgrade to the research notes system:\n\n- Rich markdown editor with live preview\n- Note linking and cross-referencing\n- Tag-based organization with auto-suggestions\n- Note templates for common research formats\n- Collaborative editing with conflict resolution\n- Full-text search across all notes\n- Export to PDF, DOCX, and LaTeX',
      relatedItems: ['#40', '#41', '#42', '#43']
    },
    {
      id: 'cl-013', version: 'v1.4', date: '2024-05-10', author: 'Dr. R. Johnson',
      category: 'security', title: 'Security: Authentication & Access Control',
      description: 'Implemented comprehensive security measures:\n\n- API key authentication for all endpoints\n- Role-based access control (Admin, Researcher, Viewer)\n- Session management with automatic expiry\n- Rate limiting on all API endpoints\n- Input sanitization against XSS and injection attacks\n\nAll API endpoints now require valid authentication tokens.',
      relatedItems: ['#44', '#45']
    },
    {
      id: 'cl-014', version: 'v1.4', date: '2024-05-10', author: 'Dr. A. Chen',
      category: 'performance', title: 'Reduce Initial Bundle Size by 35%',
      description: 'Optimized the initial JavaScript bundle:\n\n- Implemented route-based code splitting\n- Lazy loaded non-critical components\n- Tree-shook unused utility functions\n- Moved large dependencies to dynamic imports\n\nInitial load time reduced from 3.2s to 2.1s on 3G connections.',
      relatedItems: ['#46']
    },
    {
      id: 'cl-015', version: 'v1.5', date: '2024-06-15', author: 'Prof. Y. Park',
      category: 'feature', title: 'Visualization Gallery',
      description: 'Added a comprehensive visualization gallery with:\n\n- Treemap chart for hierarchical data\n- Network graph with force-directed layout\n- Sankey diagram for flow analysis\n- Scatter plot with regression lines\n- Force graph for relationship mapping\n- All charts use pure SVG (no external chart libraries)\n\nEach visualization supports interactive tooltips, zoom, and export.',
      relatedItems: ['#50', '#51', '#52', '#53', '#54']
    },
    {
      id: 'cl-016', version: 'v1.5', date: '2024-06-15', author: 'Dr. S. Williams',
      category: 'breaking_change', title: 'BREAKING: Meeting API v2 Migration',
      description: '**BREAKING CHANGE:** Migrated meeting API to v2.\n\nKey changes:\n- `meeting.agenda` renamed to `meeting.title`\n- `meeting.messages` moved to separate endpoint\n- `meeting.participants` replaced with agent ID array\n- All date fields now use ISO 8601 format exclusively\n\n**Migration guide:** See `/api/docs/migration-v2` for detailed upgrade instructions.\n\nAll v1 endpoints will be deprecated on August 1, 2024.',
      relatedItems: ['#55', '#56']
    },
    {
      id: 'cl-017', version: 'v1.6', date: '2024-07-20', author: 'Dr. H. Suzuki',
      category: 'feature', title: 'Citation Generator & Reference Manager',
      description: 'Added citation generation and reference management:\n\n- Auto-generate citations in APA, MLA, Chicago, IEEE formats\n- Reference library with search and categorization\n- BibTeX import/export\n- DOI auto-linking for published references\n- In-text citation shortcuts\n\nIntegrates seamlessly with research notes and publications.',
      relatedItems: ['#60', '#61']
    },
    {
      id: 'cl-018', version: 'v1.6', date: '2024-07-20', author: 'Dr. L. Kim',
      category: 'enhancement', title: 'Enhanced Export System',
      description: 'Upgraded the export system with:\n\n- PDF export with custom templates\n- DOCX export with styled formatting\n- PPTX presentation generation\n- Batch export for multiple meetings\n- Export scheduling and automation\n- Cloud storage integration (S3, GCS)\n\nAll exports maintain the visual design language of the platform.',
      relatedItems: ['#62', '#63', '#64']
    },
    {
      id: 'cl-019', version: 'v1.6', date: '2024-07-20', author: 'Prof. K. Tanaka',
      category: 'documentation', title: 'Updated API Documentation with Examples',
      description: 'Comprehensive update to API documentation:\n\n- Added request/response examples for all endpoints\n- Interactive API playground\n- WebSocket event documentation\n- Error code reference\n- Rate limiting guide\n- Authentication setup guide',
      relatedItems: ['#65']
    },
    {
      id: 'cl-020', version: 'v1.7', date: '2024-08-25', author: 'Dr. A. Chen',
      category: 'feature', title: 'Research Timeline & Changelog System',
      description: '**NEW:** Introduced comprehensive research timeline and project changelog features.\n\n**Research Timeline:**\n- Vertical chronological timeline with 10 event types\n- Date range navigation and filtering\n- Milestone tracking with progress indicators\n- Mini calendar showing event density\n- Event creation with tags and agent assignment\n- Export as JSON or iCal\n\n**Changelog System:**\n- Version history with 8 change categories\n- Horizontal version timeline visualization\n- Category statistics with SVG donut chart\n- Side-by-side version comparison\n- Markdown description support\n\nBoth systems include localStorage persistence and sample data generation.',
      relatedItems: ['#70', '#71', '#72', '#73', '#74']
    },
    {
      id: 'cl-021', version: 'v1.7', date: '2024-08-25', author: 'Dr. M. Smith',
      category: 'fix', title: 'Fix Memory Leak in Agent Chat Panel',
      description: 'Resolved a memory leak in the agent chat panel that occurred when rapidly switching between agents.\n\n**Root cause:** WebSocket connections were not properly cleaned up on component unmount.\n**Fix:** Added proper cleanup in useEffect return handlers and connection pooling.',
      relatedItems: ['#75']
    },
    {
      id: 'cl-022', version: 'v1.7.1', date: '2024-09-08', author: 'Dr. R. Johnson',
      category: 'fix', title: 'Fix: Calendar Heatmap Off-by-One Error',
      description: 'Fixed an off-by-one error in the calendar heatmap where the last day of each month was not displayed.\n\nThe issue affected the activity heatmap widget, timeline mini calendar, and export reports.',
      relatedItems: ['#76']
    },
    {
      id: 'cl-023', version: 'v1.7.1', date: '2024-09-08', author: 'Prof. Y. Park',
      category: 'performance', title: 'Optimize Scroll Performance in Timeline',
      description: 'Improved scroll performance in timeline views:\n\n- Implemented intersection observer for lazy rendering\n- Added will-change hints for animated elements\n- Optimized re-render frequency with memoization\n- Reduced layout thrashing during scroll events',
      relatedItems: ['#77']
    },
    {
      id: 'cl-024', version: 'v1.7.2', date: '2024-09-22', author: 'Dr. S. Williams',
      category: 'enhancement', title: 'Add Dark Mode to Changelog Components',
      description: 'Applied dark mode styles to all changelog and timeline components.\n\n- Proper contrast ratios for all text\n- Adjusted card backgrounds and borders\n- Smooth transition between themes\n- Calendar and chart dark variants',
      relatedItems: ['#78']
    },
    {
      id: 'cl-025', version: 'v1.7.2', date: '2024-09-22', author: 'Dr. H. Suzuki',
      category: 'refactor', title: 'Refactor CSS to Use Custom Properties',
      description: 'Migrated all component styles to use CSS custom properties (--vl-*):\n\n- Consistent color system across components\n- Theme-aware spacing and border radius\n- Reduced CSS specificity conflicts\n- Simplified dark mode implementation\n\nThis completes the CSS architecture unification project.',
      relatedItems: ['#79', '#80']
    },
    {
      id: 'cl-026', version: 'v1.7.3', date: '2024-10-05', author: 'Dr. A. Chen',
      category: 'feature', title: 'Version Comparison & Diff View',
      description: 'Added side-by-side version comparison for the changelog:\n\n- Select any two versions to compare\n- Categorized diff view (added/removed/changed)\n- Category breakdown comparison\n- Release date and author comparison\n- Direct navigation to specific entries',
      relatedItems: ['#81', '#82']
    },
    {
      id: 'cl-027', version: 'v1.7.3', date: '2024-10-05', author: 'Dr. L. Kim',
      category: 'security', title: 'Security: Sanitize Markdown Input',
      description: 'Added server-side markdown sanitization to prevent XSS attacks through changelog descriptions.\n\nAll markdown content is now sanitized before rendering, blocking:\n- Script injection\n- Event handler attributes\n- Unwanted HTML tags\n- Data URIs',
      relatedItems: ['#83']
    },
    {
      id: 'cl-028', version: 'v1.7.3', date: '2024-10-05', author: 'Prof. K. Tanaka',
      category: 'documentation', title: 'Changelog System User Guide',
      description: 'Published user guide for the changelog system covering:\n\n- How to create changelog entries\n- Markdown formatting reference\n- Version comparison usage\n- Export and sharing options\n- Integration with project management workflows',
      relatedItems: ['#84']
    }
  ]
}

// ─── Helpers ────────────────────────────────────────────────
function simpleMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n')
  const result: React.ReactNode[] = []
  let keyIdx = 0

  for (const line of lines) {
    if (!line.trim()) {
      result.push(<br key={`br-${keyIdx++}`} />)
      continue
    }

    if (line.startsWith('### ')) {
      result.push(<h3 key={`h3-${keyIdx++}`} style={{ fontSize: 13, fontWeight: 700, margin: '8px 0 4px', color: 'var(--vl-text-heading)' }}>{line.slice(4)}</h3>)
    } else if (line.startsWith('## ')) {
      result.push(<h2 key={`h2-${keyIdx++}`} style={{ fontSize: 14, fontWeight: 700, margin: '10px 0 4px', color: 'var(--vl-text-heading)' }}>{line.slice(3)}</h2>)
    } else if (line.startsWith('# ')) {
      result.push(<h1 key={`h1-${keyIdx++}`} style={{ fontSize: 15, fontWeight: 700, margin: '10px 0 4px', color: 'var(--vl-text-heading)' }}>{line.slice(2)}</h1>)
    } else if (line.startsWith('- ')) {
      result.push(
        <div key={`li-${keyIdx++}`} style={{ paddingLeft: 16, position: 'relative', fontSize: 11, lineHeight: 1.6, color: 'var(--vl-text-secondary)', marginBottom: 2 }}>
          <span style={{ position: 'absolute', left: 0, color: 'var(--vl-accent)', fontSize: 10 }}>•</span>
          {renderInlineMarkdown(line.slice(2))}
        </div>
      )
    } else if (line.startsWith('**BREAKING')) {
      result.push(
        <div key={`alert-${keyIdx++}`} style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', fontSize: 11, fontWeight: 600, color: '#f97316', marginBottom: 6 }}>
          <AlertTriangle className="size-3" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
          {renderInlineMarkdown(line)}
        </div>
      )
    } else {
      result.push(<p key={`p-${keyIdx++}`} style={{ fontSize: 11, lineHeight: 1.7, color: 'var(--vl-text-secondary)', marginBottom: 4 }}>{renderInlineMarkdown(line)}</p>)
    }
  }

  return result
}

function renderInlineMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  let remaining = text
  let partKey = 0

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
    const codeMatch = remaining.match(/`([^`]+)`/)
    const nextMatch = boldMatch && codeMatch
      ? (boldMatch.index! < codeMatch.index! ? boldMatch : codeMatch)
      : boldMatch || codeMatch

    if (!nextMatch) {
      parts.push(<span key={`t-${partKey++}`}>{remaining}</span>)
      break
    }

    if (nextMatch.index! > 0) {
      parts.push(<span key={`t-${partKey++}`}>{remaining.slice(0, nextMatch.index!)}</span>)
    }

    if (nextMatch === boldMatch) {
      parts.push(<strong key={`b-${partKey++}`} style={{ fontWeight: 600, color: 'var(--vl-text-heading)' }}>{boldMatch[1]}</strong>)
    } else {
      parts.push(<code key={`c-${partKey++}`} style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: 'var(--vl-bg-tertiary)', color: '#06b6d4' }}>{codeMatch[1]}</code>)
    }

    remaining = remaining.slice((nextMatch.index || 0) + nextMatch[0].length)
  }

  return parts
}

// ─── Main Component ─────────────────────────────────────────
export function ChangelogSystem({ lang = 'en' }: ChangelogSystemProps) {
  const [entries, setEntries] = useState<ChangelogEntry[]>([])
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [selectedCategories, setSelectedCategories] = useState<Set<ChangelogCategory>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [versionRangeStart, setVersionRangeStart] = useState('')
  const [versionRangeEnd, setVersionRangeEnd] = useState('')
  const [compareA, setCompareA] = useState('')
  const [compareB, setCompareB] = useState('')
  const [showComparison, setShowComparison] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Form state
  const [formVersion, setFormVersion] = useState('')
  const [formAuthor, setFormAuthor] = useState('')
  const [formCategory, setFormCategory] = useState<ChangelogCategory>('feature')
  const [formTitle, setFormTitle] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formRelated, setFormRelated] = useState<string[]>([])
  const [formRelatedInput, setFormRelatedInput] = useState('')
  const [formDate, setFormDate] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  // Load from localStorage
  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed && parsed.entries && parsed.entries.length > 0) {
          setEntries(parsed.entries)
          return
        }
      }
    } catch { /* ignore */ }
    setEntries(generateSampleChangelog())
  }, [])

  // Save
  useEffect(() => {
    if (!mounted || entries.length === 0) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries }))
    } catch { /* quota */ }
  }, [entries, mounted])

  // ─── Computed ──────────────────────────────────────────
  const filteredEntries = useMemo(() => {
    return entries
      .filter(entry => {
        if (selectedCategories.size > 0 && !selectedCategories.has(entry.category)) return false
        if (searchQuery) {
          const q = searchQuery.toLowerCase()
          if (!entry.title.toLowerCase().includes(q) && !entry.description.toLowerCase().includes(q)) return false
        }
        if (versionRangeStart) {
          const entryIdx = ALL_VERSIONS.indexOf(entry.version)
          const startIdx = ALL_VERSIONS.indexOf(versionRangeStart)
          if (entryIdx >= 0 && startIdx >= 0 && entryIdx < startIdx) return false
        }
        if (versionRangeEnd) {
          const entryIdx = ALL_VERSIONS.indexOf(entry.version)
          const endIdx = ALL_VERSIONS.indexOf(versionRangeEnd)
          if (entryIdx >= 0 && endIdx >= 0 && entryIdx > endIdx) return false
        }
        return true
      })
      .sort((a, b) => {
        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime()
        if (dateDiff !== 0) return dateDiff
        return b.version.localeCompare(a.version)
      })
  }, [entries, selectedCategories, searchQuery, versionRangeStart, versionRangeEnd])

  // Version timeline data
  const versionTimelineData = useMemo(() => {
    const versionMap: Record<string, { date: string; categories: Record<string, number>; entries: ChangelogEntry[] }> = {}
    entries.forEach(entry => {
      if (!versionMap[entry.version]) {
        versionMap[entry.version] = { date: entry.date, categories: {}, entries: [] }
      }
      versionMap[entry.version].categories[entry.category] = (versionMap[entry.version].categories[entry.category] || 0) + 1
      versionMap[entry.version].entries.push(entry)
    })
    return ALL_VERSIONS.filter(v => versionMap[v]).map(v => ({
      version: v,
      date: VERSION_DATES[v] || versionMap[v]?.date || '',
      ...versionMap[v]
    }))
  }, [entries])

  // Stats
  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {}
    entries.forEach(e => {
      stats[e.category] = (stats[e.category] || 0) + 1
    })
    return stats
  }, [entries])

  const totalEntries = entries.length
  const maxCategoryCount = Math.max(...Object.values(categoryStats), 1)

  // Monthly release frequency
  const monthlyReleases = useMemo(() => {
    const months: Record<string, number> = {}
    entries.forEach(e => {
      const monthKey = e.date.substring(0, 7) // YYYY-MM
      months[monthKey] = (months[monthKey] || 0) + 1
    })
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, count]) => ({
        month: new Date(month + '-01').toLocaleString('default', { month: 'short', year: '2-digit' }),
        count
      }))
  }, [entries])

  const maxMonthlyReleases = Math.max(...monthlyReleases.map(m => m.count), 1)

  // Comparison data
  const comparisonData = useMemo(() => {
    if (!compareA || !compareB) return null
    const entriesA = entries.filter(e => e.version === compareA)
    const entriesB = entries.filter(e => e.version === compareB)
    const titlesA = new Set(entriesA.map(e => e.title))
    const titlesB = new Set(entriesB.map(e => e.title))
    const added = entriesB.filter(e => !titlesA.has(e.title))
    const removed = entriesA.filter(e => !titlesB.has(e.title))
    return { versionA: compareA, versionB: compareB, entriesA, entriesB, added, removed }
  }, [entries, compareA, compareB])

  // ─── Handlers ──────────────────────────────────────────
  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleCategory = useCallback((cat: ChangelogCategory) => {
    setSelectedCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }, [])

  const addRelated = useCallback(() => {
    const item = formRelatedInput.trim()
    if (item && !formRelated.includes(item)) {
      setFormRelated(prev => [...prev, item])
      setFormRelatedInput('')
    }
  }, [formRelatedInput, formRelated])

  const removeRelated = useCallback((item: string) => {
    setFormRelated(prev => prev.filter(r => r !== item))
  }, [])

  const createEntry = useCallback(() => {
    if (!formTitle.trim() || !formVersion) return
    const newEntry: ChangelogEntry = {
      id: `cl-${Date.now()}`,
      version: formVersion,
      date: formDate || new Date().toISOString().split('T')[0],
      author: formAuthor || 'Unknown',
      category: formCategory,
      title: formTitle.trim(),
      description: formDesc.trim(),
      relatedItems: [...formRelated]
    }
    setEntries(prev => [newEntry, ...prev])
    setFormVersion('')
    setFormAuthor('')
    setFormCategory('feature')
    setFormTitle('')
    setFormDesc('')
    setFormRelated([])
    setFormDate('')
    setShowCreateForm(false)
    setShowPreview(false)
  }, [formTitle, formVersion, formAuthor, formCategory, formDesc, formRelated, formDate])

  const exportJSON = useCallback(() => {
    const data = JSON.stringify({ entries, exportedAt: new Date().toISOString() }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `changelog-export-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [entries])

  // ─── Donut Chart (SVG) ───────────────────────────────
  const donutSegments = useMemo(() => {
    const total = Object.values(categoryStats).reduce((s, v) => s + v, 0)
    if (total === 0) return []
    let cumulative = 0
    return Object.entries(categoryStats)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => {
        const pct = count / total
        const startAngle = cumulative * 360
        cumulative += pct
        return {
          category: cat,
          count,
          pct,
          startAngle,
          endAngle: cumulative * 360,
          color: CATEGORY_CONFIG[cat as ChangelogCategory]?.color || '#6b7280'
        }
      })
  }, [categoryStats])

  // ─── Render ───────────────────────────────────────────
  if (!mounted) return null

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 p-4">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
            <GitBranch className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--vl-text-heading)' }}>Project Changelog</h2>
            <p className="text-xs" style={{ color: 'var(--vl-text-muted)' }}>{entries.length} changes across {versionTimelineData.length} versions</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setShowCreateForm(!showCreateForm)} className="tl-create-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: 'none', borderRadius: 10, fontSize: 11, fontWeight: 600, color: '#fff', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', cursor: 'pointer' }}>
            <Plus className="size-3.5" /> {showCreateForm ? 'Cancel' : 'Add Entry'}
          </button>
          <button onClick={exportJSON} className="tl-export-btn"><Download className="size-3" /> Export</button>
        </div>
      </div>

      {/* Version Timeline (Horizontal) */}
      {versionTimelineData.length > 0 && (
        <div className="cl-version-timeline">
          {versionTimelineData.map((vData, idx) => (
            <React.Fragment key={vData.version}>
              {idx > 0 && <div className="cl-version-line" />}
              <div className="cl-version-node" onClick={() => {
                setVersionRangeStart(vData.version)
                if (!versionRangeEnd) setVersionRangeEnd(vData.version)
              }}>
                <div className="cl-version-dot" />
                <span className="cl-version-label">{vData.version}</span>
                <span className="cl-version-date">{vData.date}</span>
                <span style={{ fontSize: 9, color: 'var(--vl-text-muted)' }}>{vData.entries.length} changes</span>
              </div>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Statistics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Donut Chart */}
        <div className="cl-stat-card" style={{ animationDelay: '0.1s' }}>
          <div className="cl-stat-card-title"><PieChartIcon className="size-4" style={{ color: '#8b5cf6' }} /> Changes by Category</div>
          <div className="cl-donut-chart">
            <svg width="120" height="120" viewBox="0 0 120 120">
              {donutSegments.map(seg => {
                const startRad = (seg.startAngle - 90) * Math.PI / 180
                const endRad = (seg.endAngle - 90) * Math.PI / 180
                const r = 40
                const cx = 60, cy = 60
                const x1 = cx + r * Math.cos(startRad)
                const y1 = cy + r * Math.sin(startRad)
                const x2 = cx + r * Math.cos(endRad)
                const y2 = cy + r * Math.sin(endRad)
                const largeArc = seg.pct > 0.5 ? 1 : 0
                const ir = 25
                const ix1 = cx + ir * Math.cos(startRad)
                const iy1 = cy + ir * Math.sin(startRad)
                const ix2 = cx + ir * Math.cos(endRad)
                const iy2 = cy + ir * Math.sin(endRad)
                return (
                  <path
                    key={seg.category}
                    d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${ir} ${ir} 0 ${largeArc} 0 ${ix1} ${iy1} Z`}
                    fill={seg.color}
                    opacity={0.85}
                    style={{ transition: 'opacity 0.2s' }}
                  />
                )
              })}
              <text x="60" y="58" textAnchor="middle" fontSize="16" fontWeight="800" fill="var(--vl-text-heading)">{totalEntries}</text>
              <text x="60" y="72" textAnchor="middle" fontSize="8" fill="var(--vl-text-muted)">total</text>
            </svg>
            <div className="cl-donut-legend">
              {Object.entries(categoryStats).sort((a, b) => b[1] - a[1]).map(([cat, count]) => {
                const cfg = CATEGORY_CONFIG[cat as ChangelogCategory]
                return (
                  <div key={cat} className="cl-donut-legend-item">
                    <span className="cl-donut-legend-dot" style={{ background: cfg?.color }} />
                    <span>{cfg?.label} ({count})</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Monthly Release Frequency */}
        <div className="cl-stat-card" style={{ animationDelay: '0.2s' }}>
          <div className="cl-stat-card-title"><BarChart3 className="size-4" style={{ color: '#06b6d4' }} /> Release Frequency</div>
          <div className="cl-bar-chart">
            {monthlyReleases.map(m => (
              <div key={m.month} className="cl-bar-col">
                <span className="cl-bar-count">{m.count}</span>
                <div className="cl-bar" style={{ height: `${Math.max((m.count / maxMonthlyReleases) * 70, 4)}px`, background: 'linear-gradient(to top, #06b6d4, #10b981)' }} />
                <span className="cl-bar-label">{m.month}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Version Comparison */}
      <div className="cl-comparison-select">
        <Layers className="size-4" style={{ color: '#8b5cf6' }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--vl-text-heading)' }}>Compare Versions</span>
        <select value={compareA} onChange={e => { setCompareA(e.target.value); setShowComparison(!!(e.target.value && compareB)) }}>
          <option value="">Select version A</option>
          {ALL_VERSIONS.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <ArrowRight className="size-4" style={{ color: 'var(--vl-text-muted)' }} />
        <select value={compareB} onChange={e => { setCompareB(e.target.value); setShowComparison(!!(e.target.value && compareA)) }}>
          <option value="">Select version B</option>
          {ALL_VERSIONS.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>

      {showComparison && comparisonData && (
        <div className="cl-diff-view">
          {/* Version A */}
          <div className="cl-diff-col">
            <div className="cl-diff-col-title">
              <GitCommit className="size-3.5" style={{ color: '#8b5cf6' }} /> {comparisonData.versionA} ({comparisonData.entriesA.length} changes)
            </div>
            {comparisonData.entriesA.map(e => {
              const cfg = CATEGORY_CONFIG[e.category]
              return (
                <div key={e.id} className="cl-diff-item">
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: cfg?.color, marginRight: 6 }} />
                  <span className={`cl-category-badge cl-category-badge--${e.category}`} style={{ fontSize: 8, padding: '1px 6px', marginRight: 6 }}>{cfg?.label}</span>
                  {e.title}
                </div>
              )
            })}
          </div>

          {/* Version B */}
          <div className="cl-diff-col">
            <div className="cl-diff-col-title">
              <GitCommit className="size-3.5" style={{ color: '#10b981' }} /> {comparisonData.versionB} ({comparisonData.entriesB.length} changes)
            </div>
            {comparisonData.added.map(e => (
              <div key={e.id} className="cl-diff-item cl-diff-item--added">
                + {e.title}
              </div>
            ))}
            {comparisonData.entriesB.map(e => {
              if (comparisonData.added.find(a => a.id === e.id)) return null
              return (
                <div key={e.id} className="cl-diff-item">
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: CATEGORY_CONFIG[e.category]?.color, marginRight: 6 }} />
                  {e.title}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Create Entry Form */}
      {showCreateForm && (
        <div className="tl-create-form">
          <div className="tl-create-form-title" style={{ color: '#8b5cf6' }}><Plus className="size-4" /> Create Changelog Entry</div>
          <div className="tl-create-form-row">
            <div className="tl-create-form-field">
              <label className="tl-create-form-label">Version</label>
              <select className="tl-create-form-select" style={{ width: '100%' }} value={formVersion} onChange={e => setFormVersion(e.target.value)}>
                <option value="">Select version...</option>
                {ALL_VERSIONS.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="tl-create-form-field">
              <label className="tl-create-form-label">Category</label>
              <select className="tl-create-form-select" style={{ width: '100%' }} value={formCategory} onChange={e => setFormCategory(e.target.value as ChangelogCategory)}>
                {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="tl-create-form-row">
            <div className="tl-create-form-field">
              <label className="tl-create-form-label">Title</label>
              <input className="tl-create-form-input" value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Change title..." />
            </div>
            <div className="tl-create-form-field">
              <label className="tl-create-form-label">Author</label>
              <select className="tl-create-form-select" style={{ width: '100%' }} value={formAuthor} onChange={e => setFormAuthor(e.target.value)}>
                <option value="">Select author...</option>
                {AUTHORS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <div className="tl-create-form-row">
            <div className="tl-create-form-field">
              <label className="tl-create-form-label">Date</label>
              <input type="date" className="tl-create-form-input" value={formDate} onChange={e => setFormDate(e.target.value)} />
            </div>
          </div>
          <div className="tl-create-form-row">
            <div className="tl-create-form-field" style={{ flex: 1 }}>
              <label className="tl-create-form-label">Description (Markdown)</label>
              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <button onClick={() => setShowPreview(!showPreview)} className="tl-date-btn" style={{ fontSize: 10, padding: '3px 8px' }}>
                  <Eye className="size-3" /> {showPreview ? 'Edit' : 'Preview'}
                </button>
              </div>
              {showPreview ? (
                <div className="cl-markdown-preview">
                  {simpleMarkdown(formDesc || '*No content yet*')}
                </div>
              ) : (
                <textarea className="tl-create-form-textarea" value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Write description with **markdown** support..." style={{ minHeight: 100 }} />
              )}
            </div>
          </div>
          <div className="tl-create-form-row">
            <div className="tl-create-form-field">
              <label className="tl-create-form-label">Related Items</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {formRelated.map(item => (
                  <span key={item} className="tl-create-form-tag" style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>
                    <Link2 className="size-2.5" /> {item}
                    <button className="tl-create-form-tag-remove" onClick={() => removeRelated(item)}><X className="size-3" /></button>
                  </span>
                ))}
                <input className="tl-create-form-input" style={{ flex: 1, minWidth: 120 }} value={formRelatedInput} onChange={e => setFormRelatedInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addRelated())} placeholder="e.g. #123" />
                <button onClick={addRelated} className="tl-date-btn" style={{ padding: '4px 10px' }}>Add</button>
              </div>
            </div>
          </div>
          <div className="tl-create-form-actions">
            <button onClick={() => setShowCreateForm(false)} className="tl-create-btn tl-create-btn--cancel" style={{ background: 'var(--vl-bg-tertiary)', color: 'var(--vl-text-secondary)' }}>Cancel</button>
            <button onClick={createEntry} className="tl-create-btn" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }} disabled={!formTitle.trim() || !formVersion}>Create Entry</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="cl-filters">
        <div className="tl-filters-label"><Filter className="size-3" /> Category</div>
        {Object.entries(CATEGORY_CONFIG).map(([cat, cfg]) => (
          <button key={cat} onClick={() => toggleCategory(cat as ChangelogCategory)} className={`cl-filter-chip ${selectedCategories.has(cat as ChangelogCategory) ? 'cl-filter-chip--active' : ''}`}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color, display: 'inline-block' }} />
            {cfg.label}
          </button>
        ))}
        {selectedCategories.size > 0 && (
          <button onClick={() => setSelectedCategories(new Set())} className="tl-date-btn" style={{ padding: '3px 8px', fontSize: 10 }}>Clear</button>
        )}
      </div>

      <div className="cl-filters">
        <div style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="tl-filters-label"><Search className="size-3" /> Search</div>
          <input className="cl-search-input" style={{ flex: 1, minWidth: 150 }} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search changelog..." />
          <div className="tl-filters-label" style={{ whiteSpace: 'nowrap' }}><Tag className="size-3" /> Version</div>
          <select className="tl-create-form-select" value={versionRangeStart} onChange={e => setVersionRangeStart(e.target.value)} style={{ fontSize: 11, padding: '5px 8px' }}>
            <option value="">From...</option>
            {ALL_VERSIONS.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select className="tl-create-form-select" value={versionRangeEnd} onChange={e => setVersionRangeEnd(e.target.value)} style={{ fontSize: 11, padding: '5px 8px' }}>
            <option value="">To...</option>
            {ALL_VERSIONS.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </div>

      {/* Changelog Entries */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {filteredEntries.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <GitBranch className="size-10" style={{ color: 'var(--vl-text-muted)', margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontSize: 13, color: 'var(--vl-text-muted)' }}>No changelog entries found</p>
          </div>
        )}

        {filteredEntries.map((entry, idx) => {
          const cfg = CATEGORY_CONFIG[entry.category]
          const isExp = expandedIds.has(entry.id)
          return (
            <div
              key={entry.id}
              className="cl-entry"
              style={{
                animationDelay: `${idx * 0.05}s`,
                '--cl-category-color': cfg.color
              } as React.CSSProperties}
            >
              <div className="cl-entry-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                  <span className={`cl-category-badge cl-category-badge--${entry.category}`}>
                    {cfg.icon} {cfg.label}
                  </span>
                  <span className="cl-entry-version">
                    <Tag className="size-3" /> {entry.version}
                  </span>
                </div>
              </div>

              <h4 className="cl-entry-title" style={{ marginTop: 6 }}>{entry.title}</h4>

              <div className="cl-entry-meta">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <User className="size-3" /> {entry.author}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <CalendarDays className="size-3" /> {new Date(entry.date).toLocaleDateString()}
                </span>
                {entry.relatedItems.length > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <Link2 className="size-3" /> {entry.relatedItems.length} related
                  </span>
                )}
              </div>

              {/* Related Items */}
              {entry.relatedItems.length > 0 && (
                <div className="cl-entry-related">
                  {entry.relatedItems.map(item => (
                    <span key={item} className="cl-entry-related-item">
                      <Hash className="size-2.5" /> {item}
                    </span>
                  ))}
                </div>
              )}

              {/* Expand Button */}
              <div className="cl-entry-footer">
                <button
                  className="tl-expand-btn"
                  onClick={() => toggleExpand(entry.id)}
                  style={{ color: cfg.color }}
                >
                  {isExp ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                  {isExp ? 'Show less' : 'Read more'}
                </button>
                <span style={{ fontSize: 9, color: 'var(--vl-text-muted)' }}>
                  ID: {entry.id}
                </span>
              </div>

              {/* Expanded Description */}
              <div className={`cl-entry-desc ${isExp ? 'cl-entry-desc--expanded' : ''}`}>
                {simpleMarkdown(entry.description)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ChangelogSystem
