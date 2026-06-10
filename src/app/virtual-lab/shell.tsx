'use client'

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import dynamic from 'next/dynamic'
import {
  FlaskConical, BookOpen, Microscope, FileText, NotebookPen,
  Users, Bot, History, GitCompare, Star, Calendar, LayoutTemplate,
  BarChart3, Activity, TrendingUp, Clock, Workflow,
  UserCircle, Brain, Lightbulb, Grid3x3, Quote, GanttChart as GanttChartIcon, Focus as FocusIcon,
  Settings, FileCode, ChevronDown, ChevronRight,
  Search, Moon, Sun, Languages, Command, PanelLeftClose, PanelLeftOpen,
  Menu, X, Zap, Beaker, Sparkles,
  Briefcase, PlayCircle, Library, GitBranch, Code, MessageSquare, Bell, Rocket, Palette, Store,
  ExternalLink,
} from 'lucide-react'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

// ─── Dynamic imports with SSR disabled ──────────────────────────

const DashboardTab = dynamic(() => import('../dashboard-tab').then(m => ({ default: m.DashboardTab })), {
  ssr: false,
  loading: () => <TabSkeleton />,
})
const KnowledgeBaseTab = dynamic(() => import('../knowledge-base-tab'), { ssr: false, loading: () => <TabSkeleton /> })
const ExperimentTracker = dynamic(() => import('../experiment-tracker').then(m => ({ default: m.ExperimentTracker })), { ssr: false, loading: () => <TabSkeleton /> })
const ResearchPapersTab = dynamic(() => import('../research-papers-tab').then(m => ({ default: m.ResearchPapersTab })), { ssr: false, loading: () => <TabSkeleton /> })
const LabJournal = dynamic(() => import('../lab-journal').then(m => ({ default: m.LabJournal })), { ssr: false, loading: () => <TabSkeleton /> })
const TeamMeetingTab = dynamic(() => import('../team-meeting-tab').then(m => ({ default: m.TeamMeetingTab })), { ssr: false, loading: () => <TabSkeleton /> })
const IndividualMeetingTab = dynamic(() => import('../individual-meeting-tab').then(m => ({ default: m.IndividualMeetingTab })), { ssr: false, loading: () => <TabSkeleton /> })
const HistoryTab = dynamic(() => import('../history-tab').then(m => ({ default: m.HistoryTab })), { ssr: false, loading: () => <TabSkeleton /> })
const MeetingComparisonDashboard = dynamic(() => import('../meeting-comparison-dashboard').then(m => ({ default: m.MeetingComparisonDashboard })), { ssr: false, loading: () => <TabSkeleton /> })
const MeetingReviewSystem = dynamic(() => import('../meeting-review-system').then(m => ({ default: m.MeetingReviewSystem })), { ssr: false, loading: () => <TabSkeleton /> })
const MeetingScheduler = dynamic(() => import('../meeting-scheduler'), { ssr: false, loading: () => <TabSkeleton /> })
const TemplateBuilder = dynamic(() => import('../meeting-template-builder').then(m => ({ default: m.TemplateBuilder })), { ssr: false, loading: () => <TabSkeleton /> })
const VisualizationGalleryTab = dynamic(() => import('../viz-gallery-tab').then(m => ({ default: m.VisualizationGalleryTab })), { ssr: false, loading: () => <TabSkeleton /> })
const LiveDashboard = dynamic(() => import('../live-dashboard').then(m => ({ default: m.LiveDashboard })), { ssr: false, loading: () => <TabSkeleton /> })
const ProductivityDashboard = dynamic(() => import('../productivity-dashboard'), { ssr: false, loading: () => <TabSkeleton /> })
const MeetingTimelineView = dynamic(() => import('../timeline-view').then(m => ({ default: m.MeetingTimelineView })), { ssr: false, loading: () => <TabSkeleton /> })
const PipelineTab = dynamic(() => import('../pipeline-tab').then(m => ({ default: m.PipelineTab })), { ssr: false, loading: () => <TabSkeleton /> })
const AgentsTab = dynamic(() => import('../agents-tab').then(m => ({ default: m.AgentsTab })), { ssr: false, loading: () => <TabSkeleton /> })
const AgentPersonaDashboard = dynamic(() => import('../agent-persona-dashboard').then(m => ({ default: m.AgentPersonaDashboard })), { ssr: false, loading: () => <TabSkeleton /> })
const BrainstormBoard = dynamic(() => import('../brainstorm-board').then(m => ({ default: m.BrainstormBoard })), { ssr: false, loading: () => <TabSkeleton /> })
const DecisionMatrix = dynamic(() => import('../decision-matrix').then(m => ({ default: m.DecisionMatrix })), { ssr: false, loading: () => <TabSkeleton /> })
const CitationPanel = dynamic(() => import('../citation-generator').then(m => ({ default: m.CitationPanel })), { ssr: false, loading: () => <TabSkeleton /> })
const GanttChartTab = dynamic(() => import('../gantt-chart'), { ssr: false, loading: () => <TabSkeleton /> })
const FocusModeTab = dynamic(() => import('../focus-mode'), { ssr: false, loading: () => <TabSkeleton /> })
const SettingsTab = dynamic(() => import('../settings-tab').then(m => ({ default: m.SettingsTab })), { ssr: false, loading: () => <TabSkeleton /> })
const ChangelogSystem = dynamic(() => import('../changelog-system').then(m => ({ default: m.ChangelogSystem })), { ssr: false, loading: () => <TabSkeleton /> })

// ─── Types ──────────────────────────────────────────────────────

type TabId = string

interface NavItem {
  id: TabId
  label: string
  icon: React.ReactNode
  badge?: number
  href?: string
}

interface NavSection {
  id: string
  label: string
  items: NavItem[]
}

// ─── Skeleton Loading ───────────────────────────────────────────

function TabSkeleton() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 16, padding: 24,
      animation: 'rp-pulse 1.5s ease-in-out infinite',
    }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          height: 80, borderRadius: 12,
          background: 'var(--vl-bg-secondary)',
          opacity: 0.6,
        }} />
      ))}
    </div>
  )
}

// ─── Error Boundary for tab content ────────────────────────────

import { Component, type ReactNode, type ErrorInfo } from 'react'

interface EBState { hasError: boolean; error: Error | null }
class TabErrorBoundary extends Component<{ children: ReactNode; tabId: string }, EBState> {
  constructor(props: { children: ReactNode; tabId: string }) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, error }
  }
  componentDidUpdate(prevProps: { children: ReactNode; tabId: string }) {
    // Reset error state when switching to a different tab
    if (prevProps.tabId !== this.props.tabId && this.state.hasError) {
      this.setState({ hasError: false, error: null })
    }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn(`[VirtualLab] Tab "${this.props.tabId}" render error:`, error.message, info.componentStack)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: 400, padding: 40, gap: 16, textAlign: 'center',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 12,
            background: 'var(--vl-bg-secondary)', border: '1px solid var(--vl-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24,
          }}>⚠️</div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--vl-text-primary)', margin: 0 }}>
            Component Error
          </h3>
          <p style={{ fontSize: 13, color: 'var(--vl-text-muted)', margin: 0, maxWidth: 400 }}>
            The &quot;{this.props.tabId}&quot; tab encountered a rendering error.
            This is likely due to a SWC compilation issue in the underlying component.
          </p>
          <code style={{
            fontSize: 11, padding: '8px 12px', borderRadius: 8,
            background: 'var(--vl-bg-secondary)', border: '1px solid var(--vl-border)',
            color: 'var(--vl-text-muted)', maxWidth: 600, wordBreak: 'break-all',
          }}>
            {this.state.error?.message}
          </code>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              marginTop: 8, padding: '8px 16px', borderRadius: 8,
              background: 'var(--vl-accent-bg)', border: '1px solid var(--vl-accent)',
              color: 'var(--vl-accent)', cursor: 'pointer', fontSize: 13, fontWeight: 500,
            }}
          >
            Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── No-op helpers for complex-prop components ──────────────────

const noop = () => {}
const noopSet = (_v: any) => {}
const noopRef = { current: null } as React.MutableRefObject<HTMLInputElement | null>
const emptyAgents: any[] = []
const emptyMeetings: any[] = []
const emptyPipelines: any[] = []

// ─── Main Component ─────────────────────────────────────────────

export default function VirtualLabShell() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [lang, setLang] = useState<Lang>('en')
  const [theme, setTheme] = useState<string>('light')
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})

  // ── Theme management ──
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  useEffect(() => {
    const stored = localStorage.getItem('vl-theme')
    if (stored === 'dark' || stored === 'light') {
      setTheme(stored)
    }
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem('vl-lang')
    if (stored && ['en', 'zh', 'ja', 'ko'].includes(stored)) {
      setLang(stored as Lang)
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem('vl-theme', next)
      return next
    })
  }, [])

  const cycleLang = useCallback(() => {
    setLang(prev => {
      const order: Lang[] = ['en', 'zh', 'ja', 'ko']
      const idx = order.indexOf(prev)
      const next = order[(idx + 1) % order.length]
      localStorage.setItem('vl-lang', next)
      return next
    })
  }, [])

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(prev => !prev)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        setSidebarCollapsed(prev => !prev)
      }
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [mobileMenuOpen])

  // ── Navigation ──
  const toggleSection = useCallback((sectionId: string) => {
    setCollapsedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }))
  }, [])

  const handleNavClick = useCallback((item: NavItem) => {
    if (item.href) {
      window.location.href = item.href
    } else {
      setActiveTab(item.id)
    }
    setMobileMenuOpen(false)
  }, [])

  const navSections: NavSection[] = useMemo(() => [
    {
      id: 'research',
      label: 'Research',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: <FlaskConical size={16} /> },
        { id: 'knowledge-base', label: 'Knowledge Base', icon: <BookOpen size={16} /> },
        { id: 'experiments', label: 'Experiments', icon: <Microscope size={16} /> },
        { id: 'research-papers', label: 'Research Papers', icon: <FileText size={16} /> },
        { id: 'lab-journal', label: 'Lab Journal', icon: <NotebookPen size={16} /> },
      ],
    },
    {
      id: 'meetings',
      label: 'Meetings',
      items: [
        { id: 'team-meetings', label: 'Team Meetings', icon: <Users size={16} /> },
        { id: 'individual-meetings', label: 'Individual Meetings', icon: <Bot size={16} /> },
        { id: 'history', label: 'History', icon: <History size={16} /> },
        { id: 'meeting-comparison', label: 'Meeting Comparison', icon: <GitCompare size={16} /> },
        { id: 'meeting-reviews', label: 'Meeting Reviews', icon: <Star size={16} /> },
        { id: 'meeting-scheduler', label: 'Meeting Scheduler', icon: <Calendar size={16} /> },
        { id: 'templates', label: 'Templates', icon: <LayoutTemplate size={16} /> },
      ],
    },
    {
      id: 'analysis',
      label: 'Analysis',
      items: [
        { id: 'viz-gallery', label: 'Visualization Gallery', icon: <BarChart3 size={16} /> },
        { id: 'live-dashboard', label: 'Live Dashboard', icon: <Activity size={16} /> },
        { id: 'productivity', label: 'Productivity', icon: <TrendingUp size={16} /> },
        { id: 'timeline', label: 'Timeline', icon: <Clock size={16} /> },
        { id: 'pipeline', label: 'Pipeline', icon: <Workflow size={16} /> },
      ],
    },
    {
      id: 'tools',
      label: 'Tools',
      items: [
        { id: 'agents', label: 'Agents', icon: <UserCircle size={16} /> },
        { id: 'agent-personas', label: 'Agent Personas', icon: <Brain size={16} /> },
        { id: 'brainstorm', label: 'Brainstorm Board', icon: <Lightbulb size={16} /> },
        { id: 'decision-matrix', label: 'Decision Matrix', icon: <Grid3x3 size={16} /> },
        { id: 'citation-generator', label: 'Citation Generator', icon: <Quote size={16} /> },
        { id: 'gantt-chart', label: 'Gantt Chart', icon: <GanttChartIcon size={16} /> },
        { id: 'focus-mode', label: 'Focus Mode', icon: <FocusIcon size={16} /> },
      ],
    },
    {
      id: 'apps',
      label: 'Apps',
      items: [
        { id: 'app-analytics-hub', label: 'Analytics Hub', icon: <BarChart3 size={16} />, href: '/analytics-hub' },
        { id: 'app-research-portfolio', label: 'Research Portfolio', icon: <Briefcase size={16} />, href: '/research-portfolio' },
        { id: 'app-ai-insights', label: 'AI Insights', icon: <Sparkles size={16} />, href: '/ai-insights' },
        { id: 'app-meeting-replay', label: 'Meeting Replay', icon: <PlayCircle size={16} />, href: '/meeting-replay' },
        { id: 'app-collaboration-hub', label: 'Collaboration Hub', icon: <Users size={16} />, href: '/collaboration-hub' },
        { id: 'app-activity-river', label: 'Activity River', icon: <Activity size={16} />, href: '/activity-river' },
        { id: 'app-resource-library', label: 'Resource Library', icon: <Library size={16} />, href: '/resource-library' },
        { id: 'app-research-workflow', label: 'Research Workflow', icon: <GitBranch size={16} />, href: '/research-workflow' },
        { id: 'app-pipeline-editor', label: 'Pipeline Editor', icon: <Workflow size={16} />, href: '/pipeline-editor' },
        { id: 'app-api-explorer', label: 'API Explorer', icon: <Code size={16} />, href: '/api-explorer' },
        { id: 'app-chat-history', label: 'Chat History', icon: <MessageSquare size={16} />, href: '/chat-history' },
        { id: 'app-notifications', label: 'Notifications', icon: <Bell size={16} />, href: '/notifications-center' },
        { id: 'app-onboarding', label: 'Onboarding', icon: <Rocket size={16} />, href: '/onboarding' },
        { id: 'app-theme-studio', label: 'Theme Studio', icon: <Palette size={16} />, href: '/theme-studio' },
        { id: 'app-settings', label: 'Settings', icon: <Settings size={16} />, href: '/settings-enhanced' },
        { id: 'app-knowledge-base', label: 'Knowledge Base', icon: <BookOpen size={16} />, href: '/knowledge-base' },
        { id: 'app-experiment-dash', label: 'Experiment Dashboard', icon: <Microscope size={16} />, href: '/experiment-dashboard' },
        { id: 'app-agent-market', label: 'Agent Marketplace', icon: <Store size={16} />, href: '/agent-marketplace' },
        { id: 'app-enhanced-search', label: 'Global Search', icon: <Search size={16} />, href: '/enhanced-search' },
      ],
    },
    {
      id: 'settings-section',
      label: 'Settings',
      items: [
        { id: 'settings', label: 'Settings', icon: <Settings size={16} /> },
        { id: 'changelog', label: 'Changelog', icon: <FileCode size={16} /> },
      ],
    },
  ], [])

  // ── Render active tab content ──
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardTab
            agents={emptyAgents}
            meetings={emptyMeetings}
            analytics={null}
            loading={false}
            totalAgents={0}
            activeMeetings={0}
            completedMeetings={0}
            totalMessages={0}
            recentMeetings={emptyMeetings}
            lang={lang}
            selectedMeeting={null}
            setActiveTab={noopSet}
            setEditingAgent={noopSet}
            setAgentDialogOpen={noopSet}
            setSelectedMeeting={noopSet}
            setDetailAgent={noopSet}
            setDetailDialogOpen={noopSet}
            setShowAnalytics={noopSet}
            setAutoSaveIndicator={noopSet}
          />
        )
      case 'knowledge-base':
        return <KnowledgeBaseTab lang={lang} />
      case 'experiments':
        return <ExperimentTracker lang={lang} />
      case 'research-papers':
        return <ResearchPapersTab lang={lang} />
      case 'lab-journal':
        return <LabJournal lang={lang} />
      case 'team-meetings':
        return (
          <TeamMeetingTab
            agents={emptyAgents}
            meetings={emptyMeetings}
            lang={lang}
            setActiveTab={noopSet}
            setEditingMeeting={noopSet}
            setMeetingDialogOpen={noopSet}
            setSelectedMeeting={noopSet}
            setDetailDialogOpen={noopSet}
            handleDeleteMeeting={noop}
            handleRunMeeting={noop}
            runningMeetingId={null}
            loading={false}
          />
        )
      case 'individual-meetings':
        return (
          <IndividualMeetingTab
            agents={emptyAgents}
            meetings={emptyMeetings}
            lang={lang}
            setActiveTab={noopSet}
            setEditingMeeting={noopSet}
            setMeetingDialogOpen={noopSet}
            setSelectedMeeting={noopSet}
            handleDeleteMeeting={noop}
            handleRunMeeting={noop}
            runningMeetingId={null}
            loading={false}
          />
        )
      case 'history':
        return (
          <HistoryTab
            meetings={emptyMeetings}
            agents={emptyAgents}
            selectedMeeting={null}
            runningMeetingId={null}
            filteredMeetings={emptyMeetings}
            hasActiveFilters={false}
            allParticipantNames={[]}
            sessionIds={new Map()}
            historyTypeFilter="all"
            historyStatusFilter="all"
            historySortBy="newest"
            historySearch=""
            historyDateRange="all"
            historyParticipantFilter=""
            historyViewMode="list"
            expandedHistoryId={null}
            loading={false}
            compareMode={false}
            compareSelection={[]}
            setActiveTab={noopSet}
            setHistoryTypeFilter={noopSet}
            setHistoryStatusFilter={noopSet}
            setHistorySortBy={noopSet}
            setHistorySearch={noopSet}
            setHistoryDateRange={noopSet}
            setHistoryParticipantFilter={noopSet}
            setHistoryViewMode={noopSet}
            setCompareMode={noopSet}
            setCompareSelection={noopSet}
            setComparisonDialogOpen={noopSet}
            setSelectedMeeting={noopSet}
            setExpandedHistoryId={noopSet}
            handleDeleteMeeting={noop}
            handleSelectMeeting={noop}
            handleRefreshMeeting={noop}
            handleRunMeeting={noop}
            lang={lang}
          />
        )
      case 'meeting-comparison':
        return <MeetingComparisonDashboard meetings={emptyMeetings} agents={emptyAgents} lang={lang} />
      case 'meeting-reviews':
        return <MeetingReviewSystem />
      case 'meeting-scheduler':
        return <MeetingScheduler agents={emptyAgents} existingMeetings={emptyMeetings} onSchedule={noop} />
      case 'templates':
        return <TemplateBuilder />
      case 'viz-gallery':
        return <VisualizationGalleryTab lang={lang} meetings={emptyMeetings} />
      case 'live-dashboard':
        return <LiveDashboard />
      case 'productivity':
        return <ProductivityDashboard />
      case 'timeline':
        return <MeetingTimelineView meetings={emptyMeetings} agents={emptyAgents} selectedMeetingId={null} onSelectMeeting={noop} lang={lang} />
      case 'pipeline':
        return (
          <PipelineTab
            agents={emptyAgents}
            pipelines={emptyPipelines}
            selectedPipelineId={null}
            selectedPipeline={null}
            loading={false}
            lang={lang}
            setSelectedPipelineId={noopSet}
            setNewPipelineDialogOpen={noopSet}
            setAddStageDialogOpen={noopSet}
            setAddTaskDialogOpen={noopSet}
            setAddTaskStageId={noopSet}
            setEditingTaskId={noopSet}
            setEditTaskDialogOpen={noopSet}
            handleDeletePipeline={noop}
            handleDeleteStage={noop}
            handleDeleteTask={noop}
            handleUpdateTask={noop}
          />
        )
      case 'agents':
        return (
          <AgentsTab
            agents={emptyAgents}
            meetings={emptyMeetings}
            loading={false}
            lang={lang}
            setEditingAgent={noopSet}
            setAgentDialogOpen={noopSet}
            setTemplateDialogOpen={noopSet}
            setDetailAgent={noopSet}
            setDetailDialogOpen={noopSet}
            handleDeleteAgent={noop}
            handleSeedAgents={noop}
          />
        )
      case 'agent-personas':
        return <AgentPersonaDashboard agents={emptyAgents} lang={lang} />
      case 'brainstorm':
        return <BrainstormBoard />
      case 'decision-matrix':
        return <DecisionMatrix />
      case 'citation-generator':
        return <CitationPanel paper={null} lang={lang} />
      case 'gantt-chart':
        return <GanttChartTab pipeline={null} onTaskUpdate={noop} />
      case 'focus-mode':
        return <FocusModeTab isActive={false} onToggle={noop} />
      case 'settings':
        return (
          <SettingsTab
            theme={theme}
            lang={lang}
            defaultModel="gpt-4"
            temperaturePreset="balanced"
            apiKey=""
            showApiKey={false}
            compactMode={false}
            notifPrefs={{ meetingComplete: true, agentActivity: true, systemAlerts: true }}
            notificationSounds={true}
            setTheme={setTheme}
            handleSetLang={(l: Lang) => { setLang(l); localStorage.setItem('vl-lang', l) }}
            setDefaultModel={noopSet}
            setTemperaturePreset={noopSet}
            setApiKey={noopSet}
            setShowApiKey={noopSet}
            setCompactMode={noopSet}
            setClearDataDialogOpen={noopSet}
            updateNotifPref={noop}
            setNotificationSounds={noopSet}
            importFileRef={noopRef}
            totalAgents={0}
            totalMessages={0}
            meetings={{ length: 0 }}
            agents={{ length: 0 }}
          />
        )
      case 'changelog':
        return <ChangelogSystem lang={lang} />
      default:
        return <DashboardPlaceholder />
    }
  }

  // ── Get active tab label for title ──
  const activeTabLabel = useMemo(() => {
    for (const section of navSections) {
      const found = section.items.find(item => item.id === activeTab)
      if (found) return found.label
    }
    return 'Dashboard'
  }, [activeTab, navSections])

  // ── Command Palette Overlay ──
  const commandPaletteOverlay = commandPaletteOpen ? (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      paddingTop: '15vh',
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
    }} onClick={() => setCommandPaletteOpen(false)}>
      <div style={{
        width: '100%', maxWidth: 560, margin: '0 16px',
        background: 'var(--vl-bg-card)', borderRadius: 12,
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        border: '1px solid var(--vl-border)', overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 16px', borderBottom: '1px solid var(--vl-border)',
        }}>
          <Search size={16} style={{ color: 'var(--vl-text-muted)' }} />
          <input
            autoFocus
            placeholder="Search commands..."
            style={{
              flex: 1, border: 'none', outline: 'none',
              background: 'transparent', color: 'var(--vl-text-primary)',
              fontSize: 14,
            }}
          />
          <kbd style={{
            padding: '2px 6px', borderRadius: 4, fontSize: 11,
            background: 'var(--vl-bg-secondary)', color: 'var(--vl-text-muted)',
            border: '1px solid var(--vl-border)',
          }}>ESC</kbd>
        </div>
        <div style={{ maxHeight: 320, overflowY: 'auto', padding: 8 }}>
          {navSections.map(section => (
            <div key={section.id}>
              <div style={{
                padding: '6px 10px', fontSize: 11, fontWeight: 600,
                color: 'var(--vl-text-muted)', textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                {section.label}
              </div>
              {section.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => { handleNavClick(item); setCommandPaletteOpen(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '8px 12px', border: 'none',
                    borderRadius: 6, background: activeTab === item.id ? 'var(--vl-accent-bg)' : 'transparent',
                    color: activeTab === item.id ? 'var(--vl-accent)' : 'var(--vl-text-primary)',
                    cursor: 'pointer', transition: 'all 0.15s ease',
                    fontSize: 13, textAlign: 'left',
                  }}
                >
                  {item.icon}
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.href && (
                    <ExternalLink size={11} style={{ opacity: 0.5, color: 'var(--vl-text-muted)' }} />
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  ) : null

  // ── Mobile overlay ──
  const mobileOverlay = mobileMenuOpen ? (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 45,
        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)',
      }}
      onClick={() => setMobileMenuOpen(false)}
    />
  ) : null

  // ── Sidebar component ──
  const sidebarContent = (
    <div style={{
      height: '100%',
      display: 'flex', flexDirection: 'column',
      background: 'var(--vl-bg-card)',
      borderRight: '1px solid var(--vl-border)',
    }}>
      {/* Logo + Branding */}
      <div style={{
        padding: sidebarCollapsed ? '16px 12px' : '16px 18px',
        display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '1px solid var(--vl-border)',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: 'linear-gradient(135deg, #10b981, #06b6d4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
        }}>
          <FlaskConical size={18} color="#fff" />
        </div>
        {!sidebarCollapsed && (
          <div style={{ overflow: 'hidden' }}>
            <div style={{
              fontWeight: 700, fontSize: 15, color: 'var(--vl-text-primary)',
              letterSpacing: '-0.3px', whiteSpace: 'nowrap',
            }}>
              Virtual Lab
            </div>
            <div style={{
              fontSize: 11, color: 'var(--vl-text-muted)',
              whiteSpace: 'nowrap',
            }}>
              Research Platform
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {!sidebarCollapsed && (
        <div style={{ padding: '10px 12px 6px' }}>
          <button
            onClick={() => setCommandPaletteOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '7px 10px', borderRadius: 6,
              background: 'var(--vl-bg-secondary)', border: '1px solid var(--vl-border)',
              color: 'var(--vl-text-muted)', cursor: 'pointer',
              transition: 'all 0.15s ease', fontSize: 12,
            }}
          >
            <Search size={13} />
            <span style={{ flex: 1 }}>Search...</span>
            <kbd style={{
              padding: '1px 5px', borderRadius: 3, fontSize: 10,
              background: 'var(--vl-bg-card)', border: '1px solid var(--vl-border)',
            }}>Ctrl+K</kbd>
          </button>
        </div>
      )}

      {/* Navigation Sections */}
      <nav style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        padding: sidebarCollapsed ? '8px 6px' : '8px 10px',
      }}>
        {navSections.map(section => {
          const isCollapsed = collapsedSections[section.id]
          return (
            <div key={section.id} style={{ marginBottom: 2 }}>
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  width: '100%', padding: sidebarCollapsed ? '6px' : '6px 8px',
                  border: 'none', borderRadius: 5,
                  background: 'transparent', cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  fontSize: 11, fontWeight: 600,
                  color: 'var(--vl-text-muted)', textTransform: 'uppercase',
                  letterSpacing: '0.05em', justifyContent: sidebarCollapsed ? 'center' : 'space-between',
                }}
                title={section.label}
              >
                {!sidebarCollapsed && <span>{section.label}</span>}
                {!sidebarCollapsed && (
                  isCollapsed
                    ? <ChevronRight size={12} />
                    : <ChevronDown size={12} />
                )}
              </button>

              {/* Section Items */}
              {(!sidebarCollapsed && !isCollapsed) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginBottom: 4 }}>
                  {section.items.map(item => {
                    const isActive = activeTab === item.id
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          width: '100%', padding: '7px 10px',
                          border: 'none', borderRadius: 6,
                          background: isActive ? 'var(--vl-accent-bg)' : 'transparent',
                          color: isActive ? 'var(--vl-accent)' : item.href ? 'var(--vl-accent)' : 'var(--vl-text-secondary)',
                          cursor: 'pointer', transition: 'all 0.15s ease',
                          fontSize: 13, fontWeight: isActive ? 600 : 400,
                          textAlign: 'left',
                          position: 'relative',
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.background = 'var(--vl-bg-secondary)'
                            e.currentTarget.style.color = 'var(--vl-text-primary)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.background = 'transparent'
                            e.currentTarget.style.color = 'var(--vl-text-secondary)'
                          }
                        }}
                      >
                        {/* Active indicator bar */}
                        {isActive && (
                          <div style={{
                            position: 'absolute', left: -10, top: '50%',
                            transform: 'translateY(-50%)',
                            width: 3, height: 18, borderRadius: '0 3px 3px 0',
                            background: 'var(--vl-accent)',
                          }} />
                        )}
                        <span style={{
                          display: 'flex', alignItems: 'center',
                          color: isActive ? 'var(--vl-accent)' : 'var(--vl-text-muted)',
                        }}>
                          {item.icon}
                        </span>
                        <span style={{ flex: 1 }}>{item.label}</span>
                        {item.href && (
                          <ExternalLink size={11} style={{ opacity: 0.5, color: 'var(--vl-text-muted)' }} />
                        )}
                        {item.badge != null && item.badge > 0 && (
                          <span style={{
                            padding: '1px 6px', borderRadius: 10,
                            background: 'var(--vl-accent-bg)', color: 'var(--vl-accent)',
                            fontSize: 10, fontWeight: 600,
                          }}>
                            {item.badge}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Collapsed sidebar: just icons */}
              {sidebarCollapsed && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 4 }}>
                  {section.items.map(item => {
                    const isActive = activeTab === item.id
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item)}
                        title={item.href ? `${item.label} (opens in new page)` : item.label}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: '100%', padding: '7px 6px',
                          border: 'none', borderRadius: 6,
                          background: isActive ? 'var(--vl-accent-bg)' : 'transparent',
                          color: isActive ? 'var(--vl-accent)' : 'var(--vl-text-muted)',
                          cursor: 'pointer', transition: 'all 0.15s ease',
                          position: 'relative',
                        }}
                      >
                        {isActive && (
                          <div style={{
                            position: 'absolute', left: -6, top: '50%',
                            transform: 'translateY(-50%)',
                            width: 3, height: 16, borderRadius: '0 3px 3px 0',
                            background: 'var(--vl-accent)',
                          }} />
                        )}
                        {item.icon}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Bottom actions */}
      <div style={{
        borderTop: '1px solid var(--vl-border)',
        padding: sidebarCollapsed ? '10px 6px' : '10px 12px',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: 4,
      }}>
        <button
          onClick={cycleLang}
          title={`Language: ${lang.toUpperCase()}`}
          style={{
            display: 'flex', alignItems: 'center',
            gap: sidebarCollapsed ? 0 : 8,
            padding: '7px 8px', border: 'none', borderRadius: 6,
            background: 'transparent', cursor: 'pointer',
            transition: 'all 0.15s ease',
            color: 'var(--vl-text-muted)', justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--vl-bg-secondary)'
            e.currentTarget.style.color = 'var(--vl-text-primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--vl-text-muted)'
          }}
        >
          <Languages size={16} />
          {!sidebarCollapsed && (
            <span style={{ fontSize: 12 }}>{lang.toUpperCase()}</span>
          )}
        </button>
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          style={{
            display: 'flex', alignItems: 'center',
            gap: sidebarCollapsed ? 0 : 8,
            padding: '7px 8px', border: 'none', borderRadius: 6,
            background: 'transparent', cursor: 'pointer',
            transition: 'all 0.15s ease',
            color: 'var(--vl-text-muted)', justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--vl-bg-secondary)'
            e.currentTarget.style.color = 'var(--vl-text-primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--vl-text-muted)'
          }}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          {!sidebarCollapsed && (
            <span style={{ fontSize: 12 }}>
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </span>
          )}
        </button>
        <button
          onClick={() => setSidebarCollapsed(prev => !prev)}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            display: 'flex', alignItems: 'center',
            gap: sidebarCollapsed ? 0 : 8,
            padding: '7px 8px', border: 'none', borderRadius: 6,
            background: 'transparent', cursor: 'pointer',
            transition: 'all 0.15s ease',
            color: 'var(--vl-text-muted)', justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--vl-bg-secondary)'
            e.currentTarget.style.color = 'var(--vl-text-primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--vl-text-muted)'
          }}
        >
          {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          {!sidebarCollapsed && (
            <span style={{ fontSize: 12 }}>Collapse</span>
          )}
        </button>
      </div>
    </div>
  )

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      height: '100vh',
      background: 'var(--vl-bg-primary)',
      color: 'var(--vl-text-primary)',
      overflow: 'hidden',
    }}>
      {/* Desktop Sidebar */}
      <aside style={{
        width: sidebarCollapsed ? 56 : 260,
        flexShrink: 0,
        transition: 'width 0.2s ease',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        // Hidden on mobile
        ...mobileMenuOpen ? {} : {},
      }}
        className="vl-sidebar-desktop"
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      {mobileOverlay}
      <aside style={{
        position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 50,
        width: 280,
        transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.2s ease',
        display: 'none',
      }}
        className="vl-sidebar-mobile"
      >
        {sidebarContent}
      </aside>

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        minWidth: 0,
      }}>
        {/* Top Bar */}
        <header style={{
          height: 48, flexShrink: 0,
          display: 'flex', alignItems: 'center',
          padding: '0 16px',
          borderBottom: '1px solid var(--vl-border)',
          background: 'var(--vl-bg-card)',
          gap: 12,
        }}>
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(prev => !prev)}
            className="vl-mobile-menu-btn"
            style={{
              display: 'none', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, border: 'none', borderRadius: 6,
              background: 'transparent', cursor: 'pointer',
              color: 'var(--vl-text-muted)',
            }}
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          {/* Breadcrumb / Title */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            flex: 1, minWidth: 0,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {(() => {
                for (const section of navSections) {
                  const found = section.items.find(item => item.id === activeTab)
                  if (found) {
                    return (
                      <React.Fragment key={section.id}>
                        <span style={{
                          fontSize: 12, color: 'var(--vl-text-muted)',
                          fontWeight: 500,
                        }}>
                          {section.label}
                        </span>
                        <span style={{ color: 'var(--vl-text-muted)', fontSize: 12 }}>/</span>
                        <span style={{
                          fontSize: 13, color: 'var(--vl-text-primary)',
                          fontWeight: 600,
                        }}>
                          {found.label}
                        </span>
                      </React.Fragment>
                    )
                  }
                }
                return null
              })()}
            </div>
          </div>

          {/* Top bar actions */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="vl-cmd-btn"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 10px', borderRadius: 6,
                background: 'var(--vl-bg-secondary)', border: '1px solid var(--vl-border)',
                color: 'var(--vl-text-muted)', cursor: 'pointer',
                transition: 'all 0.15s ease', fontSize: 12,
              }}
            >
              <Command size={13} />
              <span className="vl-cmd-label">Search</span>
              <kbd style={{
                padding: '1px 5px', borderRadius: 3, fontSize: 10,
                background: 'var(--vl-bg-card)', border: '1px solid var(--vl-border)',
                color: 'var(--vl-text-muted)',
              }}>Ctrl+K</kbd>
            </button>

            <button
              onClick={toggleTheme}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, border: 'none', borderRadius: 6,
                background: 'transparent', cursor: 'pointer',
                color: 'var(--vl-text-muted)', transition: 'all 0.15s ease',
              }}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <button
              onClick={cycleLang}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, border: 'none', borderRadius: 6,
                background: 'transparent', cursor: 'pointer',
                color: 'var(--vl-text-muted)', transition: 'all 0.15s ease',
                fontSize: 11, fontWeight: 600,
              }}
              title={`Language: ${lang.toUpperCase()}`}
            >
              <Languages size={15} />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div style={{
          flex: 1, overflow: 'auto',
          background: 'var(--vl-bg-primary)',
        }}>
          <TabErrorBoundary tabId={activeTab}>
            <Suspense fallback={<TabSkeleton />}>
              {renderTabContent()}
            </Suspense>
          </TabErrorBoundary>
        </div>
      </main>

      {/* Command Palette */}
      {commandPaletteOverlay}

      {/* Responsive styles */}
      <style jsx global>{`
        @media (max-width: 768px) {
          .vl-sidebar-desktop {
            display: none !important;
          }
          .vl-sidebar-mobile {
            display: flex !important;
          }
          .vl-mobile-menu-btn {
            display: flex !important;
          }
          .vl-cmd-label {
            display: none;
          }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .vl-sidebar-mobile {
            display: none !important;
          }
          .vl-mobile-menu-btn {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}

// ─── Dashboard Placeholder ─────────────────────────────────────

function DashboardPlaceholder() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '60vh', padding: 32,
      textAlign: 'center', gap: 16,
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 16,
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.15))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <FlaskConical size={28} style={{ color: 'var(--vl-accent)' }} />
      </div>
      <h2 style={{
        fontSize: 22, fontWeight: 700, color: 'var(--vl-text-primary)',
        margin: 0,
      }}>
        Virtual Lab
      </h2>
      <p style={{
        fontSize: 14, color: 'var(--vl-text-muted)',
        maxWidth: 400, lineHeight: 1.6, margin: 0,
      }}>
        AI-Powered Scientific Research Platform. Navigate using the sidebar
        to access all research tools, meetings, and analytics.
      </p>
      <div style={{
        display: 'flex', gap: 12, marginTop: 8,
      }}>
        {[
          { icon: <Zap size={14} />, label: 'Start Research', color: '#10b981' },
          { icon: <Users size={14} />, label: 'Team Meeting', color: '#06b6d4' },
          { icon: <Sparkles size={14} />, label: 'Explore Tools', color: '#8b5cf6' },
        ].map(action => (
          <button
            key={action.label}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8,
              background: `${action.color}15`, border: `1px solid ${action.color}30`,
              color: action.color, cursor: 'pointer',
              fontSize: 13, fontWeight: 500,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${action.color}25`
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = `${action.color}15`
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>
    </div>
  )
}
