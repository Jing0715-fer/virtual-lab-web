'use client'

/**
 * Performance Optimization: Lazy-loaded heavy components using next/dynamic
 *
 * This module provides code-split versions of heavy components that are only
 * loaded when needed, reducing the initial JavaScript bundle size significantly.
 *
 * Components are split into two categories:
 * 1. SSR-compatible (default): Loaded via dynamic() - works with SSR
 * 2. Client-only (ssr: false): Components requiring browser APIs (Canvas, Web APIs)
 *
 * Each lazy component includes a loading skeleton for Suspense fallbacks.
 */

import dynamic from 'next/dynamic'
import React from 'react'

// ============================================================
// Skeleton / Loading Fallback Components
// ============================================================

/** Generic chart skeleton for recharts-dependent visualizations */
export function ChartSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`space-y-3 p-4 ${className}`}>
      <div className="skeleton-gradient h-6 w-40 rounded-lg" />
      <div className="skeleton-gradient h-48 rounded-xl" />
    </div>
  )
}

/** Skeleton for insight/analysis panels */
export function InsightPanelSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`space-y-4 p-6 ${className}`}>
      <div className="skeleton-gradient h-7 w-56 rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton-gradient h-24 rounded-xl" />
        ))}
      </div>
      <div className="skeleton-gradient h-64 rounded-xl" />
    </div>
  )
}

/** Skeleton for the meeting insights panel */
export function MeetingInsightsSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="skeleton-gradient h-6 w-48 rounded-lg" />
      <div className="skeleton-gradient h-40 rounded-xl" />
      <div className="skeleton-gradient h-40 rounded-xl" />
    </div>
  )
}

/** Skeleton for comparison dashboards */
export function ComparisonSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="skeleton-gradient h-8 w-64 rounded-lg" />
      <div className="grid grid-cols-2 gap-4">
        <div className="skeleton-gradient h-80 rounded-xl" />
        <div className="skeleton-gradient h-80 rounded-xl" />
      </div>
      <div className="skeleton-gradient h-64 rounded-xl" />
    </div>
  )
}

/** Skeleton for the activity feed */
export function ActivityFeedSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="skeleton-gradient h-8 w-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-1">
            <div className="skeleton-gradient h-4 w-3/4 rounded" />
            <div className="skeleton-gradient h-3 w-1/2 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Skeleton for notification center */
export function NotificationCenterSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-3">
          <div className="skeleton-gradient h-8 w-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-1">
            <div className="skeleton-gradient h-4 w-2/3 rounded" />
            <div className="skeleton-gradient h-3 w-full rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Skeleton for the onboarding tour */
export function OnboardingSkeleton() {
  return <div className="fixed inset-0 z-[100] bg-black/20" />
}

/** Skeleton for the bio tools tab */
export function BioToolsSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="skeleton-gradient h-10 w-64 rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton-gradient h-48 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

// ============================================================
// Recharts-dependent Visualization Components (Dashboard)
// ============================================================
// These components import recharts (~150KB+), which significantly
// increases bundle size. They are loaded lazily with ssr: false
// because recharts requires DOM APIs.

// Note: Dashboard-tab internal visualizations (AgentPerformanceGauges,
// AgentMessageTreemap, etc.) are already loaded via the lazy DashboardTab import.
// Individual sub-component extraction from dashboard-tab would require
// exporting them separately, which is a larger refactor. The DashboardTab
// itself is already lazy-loaded via React.lazy() in page.tsx.

// ============================================================
// Meeting Insights Panel (637 lines, uses recharts)
// ============================================================

export const LazyMeetingInsightsPanel = dynamic(
  () => import('./meeting-insights-panel').then(m => ({ default: m.MeetingInsightsPanel })),
  {
    ssr: false,
    loading: () => <MeetingInsightsSkeleton />,
  }
)

// ============================================================
// Meeting Insights Analytics Tab (new, uses recharts + framer-motion)
// ============================================================

export const LazyMeetingInsightsTab = dynamic(
  () => import('./meeting-insights-tab').then(m => ({ default: m.MeetingInsightsPanel })),
  {
    ssr: false,
    loading: () => <InsightPanelSkeleton />,
  }
)

// ============================================================
// Agent Performance Card (lightweight, no recharts)
// ============================================================

export const LazyAgentPerformanceCard = dynamic(
  () => import('./agent-performance-card').then(m => ({ default: m.AgentPerformanceCard })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-2 p-4">
        <div className="skeleton-shimmer h-4 w-48 rounded-lg" />
        <div className="skeleton-shimmer h-40 rounded-xl" />
      </div>
    ),
  }
)

// ============================================================
// Meeting Comparison Dashboard (uses recharts)
// ============================================================

export const LazyMeetingComparisonDashboard = dynamic(
  () => import('./meeting-comparison-dashboard').then(m => ({ default: m.MeetingComparisonDashboard })),
  {
    ssr: false,
    loading: () => <ComparisonSkeleton />,
  }
)

// ============================================================
// Agent Comparison (uses recharts)
// ============================================================

export const LazyAgentComparisonView = dynamic(
  () => import('./agent-comparison').then(m => ({ default: m.AgentComparisonView })),
  {
    ssr: false,
    loading: () => <ComparisonSkeleton />,
  }
)

// ============================================================
// Activity Feed Panel (503 lines)
// ============================================================

export const LazyActivityFeedPanel = dynamic(
  () => import('./activity-feed-panel').then(m => ({ default: m.ActivityFeedPanel })),
  {
    ssr: false,
    loading: () => <ActivityFeedSkeleton />,
  }
)

// ============================================================
// Onboarding Tour (should only load on first visit)
// ============================================================

export const LazyOnboardingOverlay = dynamic(
  () => import('./onboarding-tour').then(m => ({ default: m.OnboardingOverlay })),
  {
    ssr: false,
    loading: () => <OnboardingSkeleton />,
  }
)

export const LazyWelcomeSplashScreen = dynamic(
  () => import('./onboarding-tour').then(m => ({ default: m.WelcomeSplashScreen })),
  {
    ssr: false,
    loading: () => <OnboardingSkeleton />,
  }
)

// ============================================================
// Notification Center (1064 lines)
// ============================================================

export const LazyNotificationCenter = dynamic(
  () => import('./notification-center').then(m => ({ default: m.NotificationCenter })),
  {
    ssr: false,
    loading: () => <NotificationCenterSkeleton />,
  }
)

export const LazyNotificationBellButton = dynamic(
  () => import('./notification-center').then(m => ({ default: m.NotificationBellButton })),
  {
    ssr: false,
    loading: () => (
      <div className="skeleton-gradient h-9 w-9 rounded-lg" />
    ),
  }
)

// ============================================================
// Knowledge Base Tab (1345 lines)
// ============================================================

export const LazyKnowledgeBaseTab = dynamic(
  () => import('./knowledge-base-tab'),
  {
    ssr: false,
    loading: () => (
      <div className="p-6 space-y-6">
        <div className="skeleton-gradient h-8 w-48 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-gradient h-56 rounded-xl" />
          ))}
        </div>
      </div>
    ),
  }
)

// ============================================================
// Bio Tools Tab (2004 lines)
// ============================================================

export const LazyBioToolsTab = dynamic(
  () => import('./bio-tools-tab').then(m => ({ default: m.BioToolsTab })),
  {
    ssr: false,
    loading: () => <BioToolsSkeleton />,
  }
)

// ============================================================
// Agent Detail View (457 lines)
// ============================================================

export const LazyAgentDetailView = dynamic(
  () => import('./agent-detail-view').then(m => ({ default: m.AgentDetailView })),
  {
    ssr: false,
    loading: () => (
      <div className="skeleton-gradient h-96 rounded-xl" />
    ),
  }
)

// ============================================================
// Agent Chat Panel (1125 lines)
// ============================================================

export const LazyAgentChatPanel = dynamic(
  () => import('./agent-chat-panel').then(m => ({ default: m.AgentChatPanel })),
  {
    ssr: false,
    loading: () => (
      <div className="skeleton-gradient h-96 rounded-xl" />
    ),
  }
)

// ============================================================
// Pipeline Tab (3351 lines, uses recharts + @dnd-kit)
// ============================================================

export const LazyPipelineTab = dynamic(
  () => import('./pipeline-tab').then(m => ({ default: m.PipelineTab })),
  {
    ssr: false,
    loading: () => (
      <div className="p-6 space-y-4">
        <div className="skeleton-gradient h-10 w-48 rounded-lg" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton-gradient min-w-[280px] h-96 rounded-xl" />
          ))}
        </div>
      </div>
    ),
  }
)

// ============================================================
// Meeting Replay Player (733 lines)
// ============================================================

export const LazyMeetingReplayPlayer = dynamic(
  () => import('./meeting-replay-player').then(m => ({ default: m.MeetingReplayPlayer })),
  {
    ssr: false,
    loading: () => (
      <div className="skeleton-gradient h-48 rounded-xl" />
    ),
  }
)

// ============================================================
// Enhanced Markdown (490 lines)
// ============================================================

export const LazyEnhancedMarkdown = dynamic(
  () => import('./enhanced-markdown').then(m => ({ default: m.EnhancedMarkdown })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-2">
        <div className="skeleton-gradient h-4 w-3/4 rounded" />
        <div className="skeleton-gradient h-4 w-full rounded" />
        <div className="skeleton-gradient h-4 w-2/3 rounded" />
      </div>
    ),
  }
)

// ============================================================
// Meeting Diff View (593 lines)
// ============================================================

export const LazyMeetingDiffView = dynamic(
  () => import('./meeting-diff-view').then(m => ({ default: m.MeetingDiffView })),
  {
    ssr: false,
    loading: () => (
      <div className="skeleton-gradient h-64 rounded-xl" />
    ),
  }
)

// ============================================================
// Meeting Highlighter
// ============================================================

export const LazyMeetingHighlighter = dynamic(
  () => import('./meeting-highlighter').then(m => ({ default: m.MeetingHighlighter })),
  {
    ssr: false,
    loading: () => <div className="skeleton-gradient h-32 rounded-xl" />,
  }
)

// ============================================================
// Meeting Bookmarks (405 lines)
// ============================================================

export const LazyMeetingBookmarks = dynamic(
  () => import('./meeting-bookmarks').then(m => ({ default: m.MeetingBookmarksPanel })),
  {
    ssr: false,
    loading: () => (
      <div className="skeleton-gradient h-24 rounded-xl" />
    ),
  }
)

// ============================================================
// Meeting Comments
// ============================================================

export const LazyMeetingComments = dynamic(
  () => import('./meeting-comments').then(m => ({ default: m.MessageCommentsPanel })),
  {
    ssr: false,
    loading: () => (
      <div className="skeleton-gradient h-24 rounded-xl" />
    ),
  }
)

// ============================================================
// Meeting Annotation System (554 lines)
// ============================================================

export const LazyMeetingAnnotationSystem = dynamic(
  () => import('./meeting-annotation-system').then(m => ({ default: m.default })),
  {
    ssr: false,
    loading: () => (
      <div className="skeleton-gradient h-32 rounded-xl" />
    ),
  }
)

// ============================================================
// Cursor Effects (SSR-disabled — uses window, event listeners)
// ============================================================

export const LazyCustomCursor = dynamic(
  () => import('./cursor-effects').then(m => ({ default: m.CustomCursor })),
  {
    ssr: false,
    loading: () => null,
  }
)

export const LazyCursorTrail = dynamic(
  () => import('./cursor-effects').then(m => ({ default: m.CursorTrail })),
  {
    ssr: false,
    loading: () => null,
  }
)

// ============================================================
// Realtime Indicators (SSR-disabled — uses fetch during SSR check)
// ============================================================

export const LazyLiveDot = dynamic(
  () => import('./realtime-indicators').then(m => ({ default: m.LiveDot })),
  {
    ssr: false,
    loading: () => <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />,
  }
)

export const LazyConnectionStatus = dynamic(
  () => import('./realtime-indicators').then(m => ({ default: m.ConnectionStatus })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-gray-400" />
        <span className="text-[10px] vl-text-muted">...</span>
      </div>
    ),
  }
)

// ============================================================
// PWA Wrapper (SSR-disabled — uses localStorage)
// ============================================================

export const LazyPWAWrapper = dynamic(
  () => import('./pwa-wrapper').then(m => ({ default: m.PWAWrapper })),
  {
    ssr: false,
    loading: () => null,
  }
)

// ============================================================
// Global Chat Widget (SSR-disabled — uses WebSocket + localStorage)
// ============================================================

export const LazyGlobalChatWidget = dynamic(
  () => import('./global-chat-widget').then(m => ({ default: m.GlobalChatWidget })),
  {
    ssr: false,
    loading: () => null,
  }
)

// ============================================================
// AI Meeting Assistant (SSR-disabled — NLP analysis component)
// ============================================================

export const LazyAIMeetingAssistant = dynamic(
  () => import('./ai-meeting-assistant').then(m => ({ default: m.AIMeetingAssistant })),
  {
    ssr: false,
    loading: () => (
      <div className="skeleton-gradient h-32 rounded-xl" />
    ),
  }
)

// ============================================================
// Meeting Notes Panel (SSR-disabled — uses localStorage)
// ============================================================

export const LazyMeetingNotesPanel = dynamic(
  () => import('./meeting-notes-panel').then(m => ({ default: m.MeetingNotesPanel })),
  {
    ssr: false,
    loading: () => (
      <div className="skeleton-gradient h-40 rounded-xl" />
    ),
  }
)

// ============================================================
// Collaboration Panel (SSR-disabled — uses WebSocket + localStorage)
// ============================================================

export const LazyCollaborationPanel = dynamic(
  () => import('./collaboration-panel').then(m => ({ default: m.CollaborationPanel })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-3 p-3">
        <div className="skeleton-gradient h-12 rounded-xl" />
        <div className="skeleton-gradient h-12 rounded-xl" />
        <div className="skeleton-gradient h-64 rounded-xl" />
        <div className="skeleton-gradient h-40 rounded-xl" />
      </div>
    ),
  }
)

export const LazyOnlinePresenceBar = dynamic(
  () => import('./collaboration-panel').then(m => ({ default: m.OnlinePresenceBar })),
  {
    ssr: false,
    loading: () => (
      <div className="skeleton-gradient h-12 rounded-xl" />
    ),
  }
)

// ============================================================
// Dashboard Widget System (SSR-disabled — uses localStorage, framer-motion layout)
// ============================================================

export const LazyDashboardWidgetSystem = dynamic(
  () => import('./dashboard-widget-system').then(m => ({ default: m.DashboardWidgetSystem })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-2">
          <div className="skeleton-gradient w-8 h-8 rounded-lg" />
          <div className="skeleton-gradient h-5 w-32 rounded" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-gradient h-48 rounded-xl" />
          ))}
        </div>
      </div>
    ),
  }
)

// ============================================================
// Spring Physics & Scroll-Driven Animations (SSR-disabled — uses rAF, window)
// ============================================================

export const LazyScrollProgressBar = dynamic(
  () => import('./scroll-driven-effects').then(m => ({ default: m.ScrollProgressBar })),
  { ssr: false }
)

export const LazyMagneticButton = dynamic(
  () => import('./spring-physics').then(m => ({ default: m.MagneticButton })),
  { ssr: false }
)

// ============================================================
// Agent Persona Enhanced v3 (SSR-disabled — uses useState, useMemo)
// ============================================================

export const LazyPersonaMoodIndicator = dynamic(
  () => import('./agent-persona-enhanced').then(m => ({ default: m.PersonaMoodIndicator })),
  {
    ssr: false,
    loading: () => (
      <div className="inline-flex items-center gap-1.5">
        <div className="skeleton-gradient w-2 h-2 rounded-full" />
        <div className="skeleton-gradient h-3 w-16 rounded" />
      </div>
    ),
  }
)

export const LazyPersonaAvatar = dynamic(
  () => import('./agent-persona-enhanced').then(m => ({ default: m.PersonaAvatar })),
  {
    ssr: false,
    loading: () => <div className="skeleton-gradient w-10 h-10 rounded-full" />,
  }
)

// ============================================================
// Visual Effects Pack (SSR-disabled — uses framer-motion, window, rAF)
// ============================================================

export const LazyParallaxHero = dynamic(
  () => import('./parallax-hero').then(m => ({ default: m.ParallaxHero })),
  { ssr: false }
)

export const LazyThreeDCard = dynamic(
  () => import('./3d-card-effect').then(m => ({ default: m.ThreeDCard })),
  { ssr: false }
)

export const LazyMagneticButtonV2 = dynamic(
  () => import('./micro-interactions').then(m => ({ default: m.MagneticButton })),
  { ssr: false }
)

export const LazyRippleEffect = dynamic(
  () => import('./micro-interactions').then(m => ({ default: m.RippleEffect })),
  { ssr: false }
)

export const LazyMorphingIcon = dynamic(
  () => import('./micro-interactions').then(m => ({ default: m.MorphingIcon })),
  { ssr: false }
)

export const LazyCountUpNumber = dynamic(
  () => import('./micro-interactions').then(m => ({ default: m.CountUpNumber })),
  { ssr: false }
)

export const LazyTypewriterText = dynamic(
  () => import('./micro-interactions').then(m => ({ default: m.TypewriterText })),
  { ssr: false }
)

export const LazyShimmerButton = dynamic(
  () => import('./micro-interactions').then(m => ({ default: m.ShimmerButton })),
  { ssr: false }
)

export const LazyEnhancedScrollProgress = dynamic(
  () => import('./scroll-progress-enhanced').then(m => ({ default: m.EnhancedScrollProgress })),
  { ssr: false }
)

export const LazyGlassCardEnhanced = dynamic(
  () => import('./glassmorphism-enhanced').then(m => ({ default: m.GlassCard })),
  { ssr: false }
)

export const LazyGlassToolbar = dynamic(
  () => import('./glassmorphism-enhanced').then(m => ({ default: m.GlassToolbar })),
  { ssr: false }
)

export const LazyGlassBadge = dynamic(
  () => import('./glassmorphism-enhanced').then(m => ({ default: m.GlassBadge })),
  { ssr: false }
)

// ============================================================
// Research Notes Enhanced (uses localStorage, ReactMarkdown)
// ============================================================

export const LazyResearchNotesEnhanced = dynamic(
  () => import('./research-notes-enhanced').then(m => ({ default: m.ResearchNotesEnhanced })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full">
        <div className="w-72 border-r border-[var(--vl-border-subtle)] p-4 space-y-3">
          <div className="skeleton-gradient h-8 w-full rounded-lg" />
          <div className="skeleton-gradient h-6 w-32 rounded" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton-gradient h-16 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="skeleton-gradient h-48 w-64 rounded-xl" />
        </div>
      </div>
    ),
  }
)

// ============================================================
// Meeting Comparison View (side-by-side analysis with recharts)
// ============================================================

export const LazyMeetingComparisonView = dynamic(
  () => import('./meeting-comparison-view').then(m => ({ default: m.MeetingComparisonView })),
  {
    ssr: false,
    loading: () => <ComparisonSkeleton />,
  }
)

// ============================================================
// Global Search Dialog (full-text search overlay)
// ============================================================

export const LazyGlobalSearchDialog = dynamic(
  () => import('./global-search-dialog').then(m => ({ default: m.GlobalSearchDialog })),
  {
    ssr: false,
    loading: () => null,
  }
)

// ============================================================
// Enhanced Notification Panel (~800 lines, Sheet-based)
// ============================================================

export const LazyEnhancedNotificationPanel = dynamic(
  () => import('./notification-panel-enhanced').then(m => ({ default: m.EnhancedNotificationPanel })),
  {
    ssr: false,
    loading: () => <NotificationCenterSkeleton />,
  }
)

export const LazyEnhancedNotificationBellButton = dynamic(
  () => import('./notification-panel-enhanced').then(m => ({ default: m.EnhancedNotificationBellButton })),
  {
    ssr: false,
    loading: () => (
      <div className="skeleton-gradient h-9 w-9 rounded-lg" />
    ),
  }
)

// ============================================================
// Advanced Loading & Progress Animations (~600 lines)
// ============================================================

export const LazyAdvancedLoadingOverlay = dynamic(
  () => import('./advanced-loading-animations').then(m => ({ default: m.AdvancedLoadingOverlay })),
  { ssr: false }
)

export const LazyCircularProgress = dynamic(
  () => import('./advanced-loading-animations').then(m => ({ default: m.CircularProgress })),
  { ssr: false }
)

export const LazyLinearProgress = dynamic(
  () => import('./advanced-loading-animations').then(m => ({ default: m.LinearProgress })),
  { ssr: false }
)

export const LazyStepsProgress = dynamic(
  () => import('./advanced-loading-animations').then(m => ({ default: m.StepsProgress })),
  { ssr: false }
)

export const LazyStatusBadge = dynamic(
  () => import('./advanced-loading-animations').then(m => ({ default: m.StatusBadge })),
  { ssr: false }
)

export const LazyLiveIndicator = dynamic(
  () => import('./advanced-loading-animations').then(m => ({ default: m.LiveIndicator })),
  { ssr: false }
)

export const LazySyncIndicator = dynamic(
  () => import('./advanced-loading-animations').then(m => ({ default: m.SyncIndicator })),
  { ssr: false }
)

export const LazyLoadingDots = dynamic(
  () => import('./advanced-loading-animations').then(m => ({ default: m.LoadingDots })),
  { ssr: false }
)

export const LazyLoadingSpinner = dynamic(
  () => import('./advanced-loading-animations').then(m => ({ default: m.LoadingSpinner })),
  { ssr: false }
)

export const LazyPageTransition = dynamic(
  () => import('./advanced-loading-animations').then(m => ({ default: m.PageTransition })),
  { ssr: false }
)

// ============================================================
// Enhanced Toast System (~400 lines)
// ============================================================

export const LazyEnhancedToastContainer = dynamic(
  () => import('./enhanced-toast-system').then(m => ({ default: m.EnhancedToastContainer })),
  {
    ssr: false,
    loading: () => null,
  }
)

export const LazyAdvancedToastContainer = dynamic(
  () => import('./enhanced-toast-system').then(m => ({ default: m.EnhancedToastContainer })),
  {
    ssr: false,
    loading: () => null,
  }
)

// ============================================================
// Dashboard Widget Pack — Activity Feed, Calendar, Agent Grid, Stats Trend
// ============================================================

export const LazyWidgetActivityFeed = dynamic(
  () => import('./widget-activity-feed').then(m => ({ default: m.WidgetActivityFeed })),
  {
    ssr: false,
    loading: () => <ActivityFeedSkeleton />,
  }
)

export const LazyWidgetMiniCalendar = dynamic(
  () => import('./widget-mini-calendar').then(m => ({ default: m.WidgetMiniCalendar })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-3 p-4">
        <div className="skeleton-gradient h-5 w-32 rounded-lg" />
        <div className="skeleton-gradient h-36 rounded-xl" />
      </div>
    ),
  }
)

export const LazyWidgetAgentStatusGrid = dynamic(
  () => import('./widget-agent-status-grid').then(m => ({ default: m.WidgetAgentStatusGrid })),
  {
    ssr: false,
    loading: () => (
      <div className="p-4 space-y-3">
        <div className="skeleton-gradient h-4 w-48 rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton-gradient h-24 rounded-lg" />
          ))}
        </div>
      </div>
    ),
  }
)

export const LazyWidgetStatsTrend = dynamic(
  () => import('./widget-stats-trend').then(m => ({ default: m.WidgetStatsTrend })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-3 p-4">
        <div className="skeleton-gradient h-6 w-48 rounded-lg" />
        <div className="skeleton-gradient h-48 rounded-xl" />
        <div className="skeleton-gradient h-6 w-full rounded-lg" />
      </div>
    ),
  }
)

// ============================================================
// Enhanced Export Dialog (~300 lines, Sheet-based)
// ============================================================

export const LazyExportDialogEnhanced = dynamic(
  () => import('./export-dialog-enhanced').then(m => ({ default: m.ExportDialogEnhanced })),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-y-0 right-0 w-full sm:max-w-lg z-50 border-l border-[var(--vl-border)] bg-[var(--vl-bg-primary)] animate-in slide-in-from-right">
        <div className="p-6 space-y-4">
          <div className="skeleton-gradient h-6 w-48 rounded-lg" />
          <div className="skeleton-gradient h-4 w-64 rounded" />
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton-gradient h-16 rounded-lg" />
            ))}
          </div>
          <div className="skeleton-gradient h-32 rounded-lg" />
        </div>
      </div>
    ),
  }
)

export const LazyQuickExportDropdown = dynamic(
  () => import('./export-dialog-enhanced').then(m => ({ default: m.QuickExportDropdown })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center gap-1">
        <div className="skeleton-gradient h-7 w-16 rounded-md" />
        <div className="skeleton-gradient h-7 w-16 rounded-md" />
      </div>
    ),
  }
)

// ============================================================
// Meeting Annotations Panel (~700 lines, uses localStorage)
// ============================================================

export const LazyMeetingAnnotationsPanel = dynamic(
  () => import('./meeting-annotations-panel').then(m => ({ default: m.MeetingAnnotationsPanel })),
  {
    ssr: false,
    loading: () => (
      <div className="w-80 vl-card rounded-xl overflow-hidden flex flex-col">
        <div className="skeleton-gradient h-10 rounded-none" />
        <div className="skeleton-gradient h-8 rounded-none" />
        <div className="flex-1 p-3 space-y-2">
          <div className="skeleton-gradient h-16 rounded-lg" />
          <div className="skeleton-gradient h-16 rounded-lg" />
          <div className="skeleton-gradient h-16 rounded-lg" />
        </div>
      </div>
    ),
  }
)

// ============================================================
// Meeting Whiteboard Tab (~200 lines, uses Canvas)
// ============================================================

export const LazyMeetingWhiteboardTab = dynamic(
  () => import('./meeting-whiteboard-tab').then(m => ({ default: m.MeetingWhiteboardTab })),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col h-full vl-card rounded-xl overflow-hidden">
        <div className="skeleton-gradient h-10 rounded-none" />
        <div className="flex-1 flex">
          <div className="flex-1 skeleton-gradient" />
          <div className="w-80 skeleton-gradient" />
        </div>
      </div>
    ),
  }
)

// ============================================================
// Agent Persona Dashboard (~700 lines, recharts + framer-motion)
// ============================================================

export const LazyAgentPersonaDashboard = dynamic(
  () => import('./agent-persona-dashboard').then(m => ({ default: m.AgentPersonaDashboard })),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] z-50 border-l border-[var(--vl-border)] bg-[var(--vl-bg-primary)] animate-in slide-in-from-right">
        <div className="p-6 space-y-4">
          <div className="skeleton-gradient h-8 w-48 rounded-lg" />
          <div className="flex flex-col items-center py-6">
            <div className="skeleton-gradient w-24 h-24 rounded-full mb-4" />
            <div className="skeleton-gradient h-5 w-32 rounded" />
            <div className="skeleton-gradient h-4 w-48 rounded mt-2" />
          </div>
          <div className="space-y-3">
            <div className="skeleton-gradient h-48 rounded-xl" />
            <div className="skeleton-gradient h-48 rounded-xl" />
          </div>
        </div>
      </div>
    ),
  }
)

// ============================================================
// Keyboard Navigation Overlay (569 lines, uses framer-motion)
// ============================================================

export const LazyKeyboardNavOverlay = dynamic(
  () => import('./keyboard-nav-overlay').then(m => ({ default: m.KeyboardNavOverlay })),
  {
    ssr: false,
    loading: () => null,
  }
)

// ============================================================
// Mini Map Widget (324 lines, uses window APIs)
// ============================================================

export const LazyMiniMapWidget = dynamic(
  () => import('./mini-map-widget').then(m => ({ default: m.MiniMapWidget })),
  {
    ssr: false,
    loading: () => (
      <div className="fixed bottom-20 right-4 w-48 h-32 rounded-xl shadow-lg border border-[var(--vl-border)] bg-[var(--vl-bg-card)] opacity-50" />
    ),
  }
)

// ============================================================
// Glass Button (from glassmorphism-kit, 667 lines)
// ============================================================

export const LazyGlassButton = dynamic(
  () => import('./glassmorphism-kit').then(m => ({ default: m.GlassButton })),
  {
    ssr: false,
    loading: () => <button className="skeleton-gradient h-9 px-4 rounded-lg" />,
  }
)

// ============================================================
// Performance Monitor (~300 lines, uses PerformanceObserver)
// ============================================================

export const LazyPerformanceMonitor = dynamic(
  () => import('./performance-monitor').then(m => ({ default: m.PerformanceMonitor })),
  {
    ssr: false,
    loading: () => null,
  }
)

// ============================================================
// Bundle Analyzer (~200 lines, lightweight analysis tool)
// ============================================================

export const LazyBundleAnalyzer = dynamic(
  () => import('./bundle-analyzer').then(m => ({ default: m.BundleAnalyzer })),
  {
    ssr: false,
    loading: () => (
      <div className="p-4 space-y-3">
        <div className="skeleton-gradient h-6 w-48 rounded-lg" />
        <div className="skeleton-gradient h-64 rounded-xl" />
      </div>
    ),
  }
)

// ============================================================
// Enhanced Offline Status Bar (uses IndexedDB + network events)
// ============================================================

export const LazyOfflineStatusBar = dynamic(
  () => import('./offline-status-bar').then(m => ({ default: m.OfflineStatusBar })),
  {
    ssr: false,
    loading: () => null,
  }
)

// ============================================================
// Advanced Data Visualization Pack — Sankey, Force Graph, Treemap
// ============================================================

/** Skeleton for visualization gallery */
export function VisualizationGallerySkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="skeleton-gradient h-10 w-10 rounded-xl" />
        <div className="space-y-1">
          <div className="skeleton-gradient h-5 w-48 rounded-lg" />
          <div className="skeleton-gradient h-3 w-32 rounded" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="skeleton-gradient h-8 w-48 rounded-lg" />
        <div className="skeleton-gradient h-8 w-32 rounded-lg" />
        <div className="skeleton-gradient h-8 w-16 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton-gradient h-72 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

// ============================================================
// Sankey Diagram (SVG-based, ~400 lines)
// ============================================================

export const LazySankeyDiagram = dynamic(
  () => import('./viz-sankey-diagram').then(m => ({ default: m.SankeyDiagram })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-3 p-4">
        <div className="skeleton-gradient h-5 w-40 rounded-lg" />
        <div className="skeleton-gradient h-64 rounded-xl" />
      </div>
    ),
  }
)

// ============================================================
// Force-Directed Graph (Canvas-based, ~500 lines)
// ============================================================

export const LazyForceGraph = dynamic(
  () => import('./viz-force-graph').then(m => ({ default: m.ForceGraph })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-3 p-4">
        <div className="skeleton-gradient h-5 w-40 rounded-lg" />
        <div className="skeleton-gradient h-72 rounded-xl" />
      </div>
    ),
  }
)

// ============================================================
// Treemap (SVG/Div-based, ~350 lines)
// ============================================================

export const LazyTreemap = dynamic(
  () => import('./viz-treemap').then(m => ({ default: m.Treemap })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-3 p-4">
        <div className="skeleton-gradient h-5 w-40 rounded-lg" />
        <div className="skeleton-gradient h-64 rounded-xl" />
      </div>
    ),
  }
)

// ============================================================
// Visualization Gallery Tab (~400 lines)
// ============================================================

export const LazyVisualizationGalleryTab = dynamic(
  () => import('./viz-gallery-tab').then(m => ({ default: m.VisualizationGalleryTab })),
  {
    ssr: false,
    loading: () => <VisualizationGallerySkeleton />,
  }
)
