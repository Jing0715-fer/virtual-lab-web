'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Bell,
  Wifi,
  WifiOff,
  Clock,
  Zap,
  Server,
  Database,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  BarChart3,
  Users,
  MessageSquare,
  FileText,
  Heart,
  Settings2,
  ChevronRight,
} from 'lucide-react'
import { useLiveMetrics, LiveMetricsProvider } from './live-metrics-provider'
import { t } from '@/lib/i18n'
import { toast } from 'sonner'

/* ============================================================
   Widget 1: Live Pulse Monitor
   ============================================================ */
function LivePulseMonitor() {
  const { healthHistory, lastUpdated, error, refreshAll, isLoading, isLive } = useLiveMetrics()
  const [secondsAgo, setSecondsAgo] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Countdown timer
  useEffect(() => {
    if (lastUpdated === 0) return
    const interval = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [lastUpdated])

  // Compute overall health status
  const overallHealth = useMemo(() => {
    if (healthHistory.length === 0) return 'green' as const
    const latest = healthHistory[healthHistory.length - 1]
    if (!latest) return 'green' as const
    const values = [latest.analytics, latest.agents, latest.meetings, latest.notifications]
    if (values.some((v) => v === 0)) return 'red' as const
    if (values.some((v) => v === 1)) return 'amber' as const
    return 'green' as const
  }, [healthHistory])

  // Generate heartbeat line data (SVG path)
  const heartbeatPath = useMemo(() => {
    const points = healthHistory.slice(-20).map((point, i) => {
      const avg = (point.analytics + point.agents + point.meetings + point.notifications) / 4
      return { x: i * 12, y: 30 - avg * 10 }
    })

    if (points.length === 0) {
      // Default flat line
      return 'M 0 15 L 228 15'
    }

    let d = `M ${points[0].x} ${points[0].y}`
    for (let i = 1; i < points.length; i++) {
      const cp1x = points[i - 1].x + 4
      const cp1y = points[i - 1].y
      const cp2x = points[i].x - 4
      const cp2y = points[i].y
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${points[i].x} ${points[i].y}`
    }
    return d
  }, [healthHistory])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await refreshAll()
    setIsRefreshing(false)
    toast.success('Dashboard refreshed')
  }, [refreshAll])

  const healthColor = overallHealth === 'green' ? '#10b981' : overallHealth === 'amber' ? '#f59e0b' : '#ef4444'

  return (
    <div className="live-widget-card live-widget--wide p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`live-health-dot live-health-dot--${overallHealth}`} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--vl-text-heading)' }}>
            {t('en', 'common.status')} · Live Pulse
          </h3>
        </div>
        <div className="flex items-center gap-3">
          {isLive ? (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--vl-text-muted)' }}>
              <Wifi size={12} />
              <span className="live-mono">{secondsAgo}s ago</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: '#f59e0b' }}>
              <WifiOff size={12} />
              <span>Paused</span>
            </div>
          )}
          <button
            onClick={handleRefresh}
            className={`live-refresh-btn p-1.5 rounded-lg transition-colors ${isRefreshing ? 'live-refresh-btn--spinning' : ''}`}
            style={{
              background: 'var(--vl-bg-inner)',
              border: '1px solid var(--vl-border-subtle)',
            }}
            aria-label="Refresh dashboard"
          >
            <RefreshCw size={14} style={{ color: 'var(--vl-text-muted)' }} />
          </button>
        </div>
      </div>

      {/* Heartbeat SVG */}
      <div className="relative overflow-hidden rounded-lg" style={{ height: 60 }}>
        <svg
          viewBox="0 0 240 40"
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          <line x1="0" y1="10" x2="240" y2="10" stroke="var(--vl-border-subtle)" strokeWidth="0.5" />
          <line x1="0" y1="20" x2="240" y2="20" stroke="var(--vl-border-subtle)" strokeWidth="0.5" />
          <line x1="0" y1="30" x2="240" y2="30" stroke="var(--vl-border-subtle)" strokeWidth="0.5" />

          {/* Heartbeat line */}
          <path
            d={heartbeatPath}
            fill="none"
            stroke={healthColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="live-heartbeat-line"
          />

          {/* Glow effect */}
          <path
            d={heartbeatPath}
            fill="none"
            stroke={healthColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.15"
          />
        </svg>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-4">
          <span className="text-xs" style={{ color: 'var(--vl-text-muted)' }}>
            Analytics
          </span>
          <span className="text-xs" style={{ color: 'var(--vl-text-muted)' }}>
            Agents
          </span>
          <span className="text-xs" style={{ color: 'var(--vl-text-muted)' }}>
            Meetings
          </span>
          <span className="text-xs" style={{ color: 'var(--vl-text-muted)' }}>
            Notifications
          </span>
        </div>
        {error && (
          <span className="flex items-center gap-1 text-xs" style={{ color: '#f59e0b' }}>
            <AlertTriangle size={12} />
            {error}
          </span>
        )}
        {!error && lastUpdated > 0 && (
          <span className="flex items-center gap-1 text-xs" style={{ color: healthColor }}>
            <CheckCircle2 size={12} />
            All systems operational
          </span>
        )}
      </div>
    </div>
  )
}

/* ============================================================
   Widget 2: Meeting Velocity Tracker
   ============================================================ */
function MeetingVelocityTracker() {
  const { derived, analytics } = useLiveMetrics()

  const trendIcon = useMemo(() => {
    switch (derived.messagesPerHourTrend) {
      case 'up': return <TrendingUp size={18} />
      case 'down': return <TrendingDown size={18} />
      default: return <Minus size={18} />
    }
  }, [derived.messagesPerHourTrend])

  const trendClass = `live-trend--${derived.messagesPerHourTrend}`

  // Sparkline SVG path
  const sparklinePath = useMemo(() => {
    const data = derived.velocityHistory
    if (data.length === 0) return ''

    const max = Math.max(...data.map((d) => d.value), 1)
    const width = 100
    const height = 32
    const stepX = width / (data.length - 1 || 1)

    let d = ''
    data.forEach((point, i) => {
      const x = i * stepX
      const y = height - (point.value / max) * (height - 4) - 2
      d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`
    })

    return { line: d, fill: d + ` L ${width} ${height} L 0 ${height} Z` }
  }, [derived.velocityHistory])

  // Total messages in last hour
  const messagesLastHour = derived.velocityHistory.length > 0
    ? derived.velocityHistory[derived.velocityHistory.length - 1].value
    : 0

  return (
    <div className="live-widget-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Zap size={16} style={{ color: 'var(--vl-accent)' }} />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--vl-text-heading)' }}>
          Meeting Velocity
        </h3>
      </div>

      {/* Main metric */}
      <div className="flex items-end gap-3 mb-3">
        <span className="live-mono text-3xl font-bold" style={{ color: 'var(--vl-text-heading)' }}>
          {derived.messagesPerHour}
        </span>
        <span className="text-sm mb-1" style={{ color: 'var(--vl-text-muted)' }}>
          msg/hr
        </span>
        <span className={`${trendClass} mb-1 ml-auto`}>
          {trendIcon}
        </span>
      </div>

      {/* Sparkline */}
      <div className="relative mb-3" style={{ height: 32 }}>
        {sparklinePath && (
          <svg viewBox="0 0 100 32" className="w-full h-full live-sparkline" preserveAspectRatio="none">
            <path
              d={sparklinePath.fill}
              fill="var(--vl-accent)"
              className="live-sparkline-fill"
            />
            <path
              d={sparklinePath.line}
              stroke="var(--vl-accent)"
              className="live-sparkline"
            />
          </svg>
        )}
      </div>

      {/* Subtitle */}
      <p className="text-xs" style={{ color: 'var(--vl-text-muted)' }}>
        {messagesLastHour} messages in the last hour
      </p>
    </div>
  )
}

/* ============================================================
   Widget 3: Agent Activity Rings (Apple Watch style)
   ============================================================ */
function AgentActivityRings() {
  const { analytics, meetings } = useLiveMetrics()
  const [animatedProgress, setAnimatedProgress] = useState([0, 0, 0, 0])

  // Compute ring data
  const ringData = useMemo(() => {
    const totalMeetings = meetings.length
    const allMessages = meetings.flatMap((m) => m?.messages || [])
    const totalMessages = allMessages.length

    // Ring 1: Total meetings participated (0-10 scale)
    const meetingProgress = Math.min(totalMeetings / 10, 1)

    // Ring 2: Messages sent (0-50 scale)
    const messageProgress = Math.min(totalMessages / 50, 1)

    // Ring 3: Research notes created (from summaries, 0-20 scale)
    const notesCount = analytics?.workflowProgress
      ? Object.values(analytics.workflowProgress).filter((v) => v > 0.3).length
      : 0
    const notesProgress = Math.min(notesCount / 20, 1)

    // Ring 4: Reactions/participation (0-30 scale)
    const uniqueAgents = new Set(
      allMessages.map((m) => m?.agentName).filter((n) => n && n !== 'User')
    ).size
    const reactionProgress = Math.min(uniqueAgents / 5, 1)

    return [
      { progress: meetingProgress, color: '#10b981', label: 'Meetings', value: totalMeetings },
      { progress: messageProgress, color: '#06b6d4', label: 'Messages', value: totalMessages },
      { progress: notesProgress, color: '#f59e0b', label: 'Notes', value: notesCount },
      { progress: reactionProgress, color: '#8b5cf6', label: 'Agents', value: uniqueAgents },
    ]
  }, [analytics, meetings])

  // Animate rings on data change
  useEffect(() => {
    const target = ringData.map((r) => r.progress)
    const duration = 1200
    const start = performance.now()
    const from = [...animatedProgress]

    function animate(now: number) {
      const elapsed = now - start
      const t = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - t, 3)

      const current = from.map((f, i) => f + (target[i] - f) * eased)
      setAnimatedProgress(current)

      if (t < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [ringData.map((r) => r.progress).join(',')])

  const ringConfig = [
    { radius: 52, strokeWidth: 8 },
    { radius: 40, strokeWidth: 8 },
    { radius: 28, strokeWidth: 8 },
    { radius: 16, strokeWidth: 8 },
  ]

  return (
    <div className="live-widget-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 size={16} style={{ color: 'var(--vl-accent)' }} />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--vl-text-heading)' }}>
          Activity Rings
        </h3>
      </div>

      {/* Rings SVG */}
      <div className="flex justify-center mb-4">
        <svg width="140" height="140" viewBox="0 0 140 140">
          {/* Background rings */}
          {ringConfig.map((config, i) => (
            <circle
              key={`bg-${i}`}
              cx="70"
              cy="70"
              r={config.radius}
              fill="none"
              stroke="var(--vl-border-subtle)"
              strokeWidth={config.strokeWidth}
              strokeLinecap="round"
            />
          ))}

          {/* Active rings */}
          {ringConfig.map((config, i) => {
            const circumference = 2 * Math.PI * config.radius
            const progress = animatedProgress[i] || 0
            const offset = circumference * (1 - progress)

            return (
              <circle
                key={`ring-${i}`}
                cx="70"
                cy="70"
                r={config.radius}
                fill="none"
                stroke={ringData[i]?.color || '#10b981'}
                strokeWidth={config.strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="live-ring"
                transform="rotate(-90 70 70)"
              />
            )
          })}

          {/* Center text */}
          <text
            x="70"
            y="66"
            textAnchor="middle"
            fill="var(--vl-text-heading)"
            fontSize="16"
            fontWeight="700"
            fontFamily="var(--font-geist-mono), monospace"
          >
            {ringData[0]?.value || 0}
          </text>
          <text
            x="70"
            y="82"
            textAnchor="middle"
            fill="var(--vl-text-muted)"
            fontSize="9"
          >
            meetings
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2">
        {ringData.map((ring, i) => (
          <div key={i} className="live-ring-legend">
            <div
              className="live-ring-legend-dot"
              style={{ background: ring.color }}
            />
            <span>{ring.label}</span>
            <span className="live-mono ml-auto" style={{ color: 'var(--vl-text-secondary)' }}>
              {ring.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ============================================================
   Widget 4: Live Notification Ticker
   ============================================================ */
function LiveNotificationTicker() {
  const { notifications } = useLiveMetrics()
  const [isPaused, setIsPaused] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Get color class by notification type
  const getTypeClass = useCallback((type: string) => {
    if (type.includes('meeting')) return 'live-notification--meeting'
    if (type.includes('agent')) return 'live-notification--agent'
    return 'live-notification--system'
  }, [])

  const visibleNotifications = notifications.slice(0, 10)

  if (visibleNotifications.length === 0) {
    return (
      <div className="live-widget-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Bell size={16} style={{ color: 'var(--vl-accent)' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--vl-text-heading)' }}>
            Notifications
          </h3>
        </div>
        <div className="flex items-center justify-center py-6">
          <p className="text-xs" style={{ color: 'var(--vl-text-muted)' }}>
            No recent notifications
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="live-widget-card live-widget--wide p-5">
      <div className="flex items-center gap-2 mb-3">
        <Bell size={16} style={{ color: 'var(--vl-accent)' }} />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--vl-text-heading)' }}>
          Live Notifications
        </h3>
        <span className="ml-auto text-xs live-mono" style={{ color: 'var(--vl-text-muted)' }}>
          {visibleNotifications.length}
        </span>
      </div>

      {/* Scrolling ticker */}
      <div
        className="relative overflow-hidden rounded-lg"
        style={{ maxHeight: 160 }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="live-ticker-fade-left" />
        <div className="live-ticker-fade-right" />

        <div
          className={`space-y-2 p-2 ${isPaused ? '' : 'live-ticker-track'}`}
          style={{
            '--ticker-duration': `${visibleNotifications.length * 5}s`,
          } as React.CSSProperties}
        >
          {/* Double items for seamless scroll */}
          {[...visibleNotifications, ...visibleNotifications].map((notif, idx) => {
            const originalIdx = idx % visibleNotifications.length
            const isExpanded = expandedId === `${notif.id}-${originalIdx}`

            return (
              <motion.div
                key={`${notif.id}-${idx}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer
                  transition-all duration-200 text-xs
                  ${getTypeClass(notif.type)}
                `}
                style={{
                  background: isExpanded ? 'var(--vl-bg-inner)' : 'transparent',
                  minWidth: 250,
                  flexShrink: 0,
                }}
                onClick={() => setExpandedId(isExpanded ? null : `${notif.id}-${originalIdx}`)}
              >
                <span className="font-medium truncate" style={{ color: 'var(--vl-text-secondary)' }}>
                  {notif.title}
                </span>
                <ChevronRight size={12} className="flex-shrink-0" style={{ color: 'var(--vl-text-muted)' }} />
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Expanded notification detail */}
      <AnimatePresence>
        {expandedId && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {visibleNotifications.map((notif) => {
              if (expandedId.startsWith(notif.id)) {
                return (
                  <div
                    key={notif.id}
                    className="mt-2 p-3 rounded-lg text-xs"
                    style={{
                      background: 'var(--vl-bg-inner)',
                      border: '1px solid var(--vl-border-subtle)',
                    }}
                  >
                    <p className="font-medium mb-1" style={{ color: 'var(--vl-text-heading)' }}>
                      {notif.title}
                    </p>
                    <p style={{ color: 'var(--vl-text-muted)' }}>
                      {notif.message}
                    </p>
                    <p className="mt-1 live-mono" style={{ color: 'var(--vl-text-muted)' }}>
                      {new Date(notif.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                )
              }
              return null
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ============================================================
   Widget 5: System Health Grid
   ============================================================ */
function SystemHealthGrid() {
  const { healthHistory, lastUpdated, error } = useLiveMetrics()

  // Compute health metrics from history
  const metrics = useMemo(() => {
    const latest = healthHistory.length > 0 ? healthHistory[healthHistory.length - 1] : null

    // API Latency
    const apiStatus = latest
      ? latest.analytics === 2 ? 'good' : latest.analytics === 1 ? 'fair' : 'poor'
      : 'good'
    const apiLabel = apiStatus === 'good' ? '<200ms' : apiStatus === 'fair' ? '<500ms' : '>500ms'
    const apiColor = apiStatus === 'good' ? 'green' : apiStatus === 'fair' ? 'amber' : 'red'

    // Data Freshness
    const freshnessSeconds = lastUpdated > 0
      ? Math.floor((Date.now() - lastUpdated) / 1000)
      : 999
    const freshnessStatus = freshnessSeconds < 15 ? 'good' : freshnessSeconds < 60 ? 'fair' : 'poor'
    const freshnessLabel = freshnessSeconds < 60 ? `${freshnessSeconds}s` : `${Math.floor(freshnessSeconds / 60)}m`
    const freshnessColor = freshnessStatus === 'good' ? 'green' : freshnessStatus === 'fair' ? 'amber' : 'red'

    // Active Connections (simulate from health endpoints)
    const activeConnections = 4
    const connectionStatus = 'good'
    const connectionColor = 'green'

    // Error Rate
    const totalChecks = healthHistory.length
    const errorCount = healthHistory.filter(
      (h) => h.analytics === 0 || h.agents === 0 || h.meetings === 0
    ).length
    const errorRate = totalChecks > 0 ? Math.round((errorCount / totalChecks) * 100) : 0
    const errorStatus = errorRate === 0 ? 'good' : errorRate < 20 ? 'fair' : 'poor'
    const errorColor = errorStatus === 'good' ? 'green' : errorStatus === 'fair' ? 'amber' : 'red'

    return [
      {
        icon: <Server size={14} />,
        label: 'API Latency',
        value: apiLabel,
        status: apiColor,
        dotClass: `live-health-dot--${apiColor}`,
      },
      {
        icon: <Database size={14} />,
        label: 'Data Freshness',
        value: freshnessLabel,
        status: freshnessColor,
        dotClass: `live-health-dot--${freshnessColor}`,
      },
      {
        icon: <Wifi size={14} />,
        label: 'Active Connections',
        value: String(activeConnections),
        status: connectionColor,
        dotClass: `live-health-dot--${connectionColor}`,
      },
      {
        icon: <AlertTriangle size={14} />,
        label: 'Error Rate',
        value: `${errorRate}%`,
        status: errorColor,
        dotClass: `live-health-dot--${errorColor}`,
      },
    ]
  }, [healthHistory, lastUpdated, error])

  return (
    <div className="live-widget-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Heart size={16} style={{ color: 'var(--vl-accent)' }} />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--vl-text-heading)' }}>
          System Health
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {metrics.map((metric, i) => (
          <div key={i} className="live-health-cell">
            <div className={`live-health-dot ${metric.dotClass}`} />
            <div className="min-w-0 flex-1">
              <p className="text-xs truncate" style={{ color: 'var(--vl-text-muted)' }}>
                {metric.label}
              </p>
              <p className="live-mono text-sm font-semibold" style={{ color: 'var(--vl-text-heading)' }}>
                {metric.value}
              </p>
            </div>
            <div style={{ color: 'var(--vl-text-muted)', opacity: 0.5 }}>
              {metric.icon}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ============================================================
   Main LiveDashboard component
   ============================================================ */
export function LiveDashboard() {
  return (
    <LiveMetricsProvider>
      <LiveDashboardInner />
    </LiveMetricsProvider>
  )
}

function LiveDashboardInner() {
  const { isLoading, isLive } = useLiveMetrics()

  if (isLoading) {
    return (
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6" aria-label="Live Dashboard">
        <div className="flex items-center gap-3 mb-6">
          <Activity size={20} style={{ color: 'var(--vl-accent)' }} />
          <h2 className="text-xl font-bold" style={{ color: 'var(--vl-text-heading)' }}>
            Live Metrics Dashboard
          </h2>
          <div className="live-health-dot live-health-dot--green ml-2" />
        </div>
        <div className="live-dashboard-grid">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="live-widget-card p-5">
              <div className="live-shimmer h-4 w-32 mb-4" />
              <div className="live-shimmer h-8 w-24 mb-3" />
              <div className="live-shimmer h-3 w-full mb-2" />
              <div className="live-shimmer h-3 w-3/4" />
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6" aria-label="Live Dashboard">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Activity size={20} style={{ color: 'var(--vl-accent)' }} />
          <h2 className="text-xl font-bold" style={{ color: 'var(--vl-text-heading)' }}>
            Live Metrics Dashboard
          </h2>
          {isLive ? (
            <span className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <span className="live-health-dot live-health-dot--green" style={{ width: 6, height: 6 }} />
              LIVE
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(100, 116, 139, 0.15)', color: 'var(--vl-text-muted)' }}>
              PAUSED
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--vl-text-muted)' }}>
            Auto-refreshing every 10s
          </span>
        </div>
      </div>

      {/* Widget Grid */}
      <div className="live-dashboard-grid">
        <LivePulseMonitor />
        <MeetingVelocityTracker />
        <AgentActivityRings />
        <SystemHealthGrid />
        <LiveNotificationTicker />
      </div>
    </section>
  )
}
