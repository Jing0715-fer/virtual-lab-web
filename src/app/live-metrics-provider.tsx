'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

/* ============================================================
   Types
   ============================================================ */
interface LiveMetricsConfig {
  analyticsInterval: number  // ms (default 10000)
  agentsInterval: number     // ms (default 30000)
  meetingsInterval: number   // ms (default 15000)
  notificationsInterval: number // ms (default 20000)
  enabled: boolean
}

interface HealthDataPoint {
  timestamp: number
  analytics: number  // 0=error, 1=slow, 2=ok
  agents: number
  meetings: number
  notifications: number
}

interface NotificationItem {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  link: string
  createdAt: string
}

interface AgentItem {
  id: string
  title: string
  expertise: string
  goal: string
  role: string
  model: string
  color: string
  icon: string
  createdAt: string
  updatedAt: string
}

interface MeetingItem {
  id: string
  type: 'team' | 'individual'
  agenda: string
  status: string
  createdAt: string
  updatedAt: string
  messages?: { id: string; agentName: string; message: string; roundIndex: number; createdAt: string }[]
  [key: string]: unknown
}

interface AnalyticsData {
  meetingsByDay: { date: string; team: number; individual: number }[]
  agentParticipation: { agentName: string; count: number }[]
  meetingTypeRatio: { team: number; individual: number }
  totalMessages: number
  avgMessagesPerMeeting: number
  collaborationNetwork: { nodes: unknown[]; edges: unknown[] }
  messageTimeline: { hour: number; agentName: string; count: number }[]
  workflowProgress: Record<string, number>
}

interface DerivedMetrics {
  messagesPerHour: number
  messagesPerHourTrend: 'up' | 'stable' | 'down'
  activeAgentsCount: number
  meetingCompletionRate: number
  completionRateTrend: 'up' | 'stable' | 'down'
  velocityHistory: { hour: number; value: number }[]
}

interface LiveMetricsContextValue {
  agents: AgentItem[]
  meetings: MeetingItem[]
  analytics: AnalyticsData | null
  notifications: NotificationItem[]
  isLoading: boolean
  lastUpdated: number
  error: string | null
  refreshAll: () => Promise<void>
  isLive: boolean
  config: LiveMetricsConfig
  setConfig: (config: Partial<LiveMetricsConfig>) => void
  healthHistory: HealthDataPoint[]
  derived: DerivedMetrics
}

const defaultConfig: LiveMetricsConfig = {
  analyticsInterval: 10000,
  agentsInterval: 30000,
  meetingsInterval: 15000,
  notificationsInterval: 20000,
  enabled: true,
}

const LiveMetricsContext = createContext<LiveMetricsContextValue | null>(null)

/* ============================================================
   Helper: Deep compare two values to detect changes
   ============================================================ */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a == null || b == null) return false
  if (typeof a !== typeof b) return false
  if (typeof a === 'string' || typeof a === 'number' || typeof a === 'boolean') return a === b
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((v, i) => deepEqual(v, b[i]))
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const aObj = a as Record<string, unknown>
    const bObj = b as Record<string, unknown>
    const aKeys = Object.keys(aObj)
    const bKeys = Object.keys(bObj)
    if (aKeys.length !== bKeys.length) return false
    return aKeys.every((k) => deepEqual(aObj[k], bObj[k]))
  }
  return false
}

/* ============================================================
   useLiveMetrics hook
   ============================================================ */
export function useLiveMetrics(): LiveMetricsContextValue {
  const ctx = useContext(LiveMetricsContext)
  if (!ctx) {
    throw new Error('useLiveMetrics must be used within <LiveMetricsProvider>')
  }
  return ctx
}

/* ============================================================
   LiveMetricsProvider component
   ============================================================ */
export function LiveMetricsProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<LiveMetricsConfig>(defaultConfig)
  const [agents, setAgents] = useState<AgentItem[]>([])
  const [meetings, setMeetings] = useState<MeetingItem[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [healthHistory, setHealthHistory] = useState<HealthDataPoint[]>([])
  const [derived, setDerived] = useState<DerivedMetrics>({
    messagesPerHour: 0,
    messagesPerHourTrend: 'stable',
    activeAgentsCount: 0,
    meetingCompletionRate: 0,
    completionRateTrend: 'stable',
    velocityHistory: [],
  })

  const backoffRef = useRef(1000) // exponential backoff starting at 1s
  const isVisibleRef = useRef(true)
  const timersRef = useRef<NodeJS.Timeout[]>([])
  const prevDataRef = useRef({ agents: null as unknown, meetings: null as unknown, analytics: null as unknown, notifications: null as unknown })
  const velocityHistoryRef = useRef<{ hour: number; value: number }[]>([])

  // Pause/resume on visibility change
  useEffect(() => {
    const handler = () => {
      isVisibleRef.current = !document.hidden
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])

  // Compute derived metrics
  const computeDerived = useCallback((ag: AnalyticsData | null, mt: MeetingItem[]) => {
    if (!ag || !mt) return

    // Messages per hour: from analytics totalMessages, assume 24h window
    const messagesPerHour = ag.totalMessages / 24

    // Velocity history (last 6 hours)
    const now = new Date()
    const history: { hour: number; value: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const hour = new Date(now)
      hour.setHours(hour.getHours() - i)
      // Count messages in this hour window
      const hourStart = new Date(hour)
      hourStart.setMinutes(0, 0, 0)
      const hourEnd = new Date(hourStart)
      hourEnd.setHours(hourStart.getHours() + 1)
      let msgCount = 0
      for (const m of mt) {
        if (m?.messages) {
          msgCount += m.messages.filter((msg) => {
            const t = new Date(msg.createdAt)
            return t >= hourStart && t < hourEnd
          }).length
        }
      }
      history.push({ hour: hour.getHours(), value: msgCount })
    }

    // Trend: compare last hour vs previous
    let trend: 'up' | 'stable' | 'down' = 'stable'
    if (history.length >= 2) {
      const last = history[history.length - 1].value
      const prev = history[history.length - 2].value
      if (last > prev * 1.1) trend = 'up'
      else if (last < prev * 0.9) trend = 'down'
    }

    // Active agents count
    const activeAgents = mt.length > 0
      ? new Set(
          mt.flatMap((m) => {
            if (!m?.messages) return []
            return m.messages.map((msg) => msg.agentName).filter((n) => n !== 'User')
          })
        ).size
      : 0

    // Meeting completion rate
    const completedCount = mt.filter((m) => m?.status === 'completed').length
    const total = mt.length
    const completionRate = total > 0 ? completedCount / total : 0

    setDerived({
      messagesPerHour: Math.round(messagesPerHour * 10) / 10,
      messagesPerHourTrend: trend,
      activeAgentsCount: activeAgents,
      meetingCompletionRate: Math.round(completionRate * 100),
      completionRateTrend: completionRate > 0.5 ? 'up' : 'stable',
      velocityHistory: history,
    })

    velocityHistoryRef.current = history
  }, [])

  // Fetch helper with deduplication and error handling
  const fetchWithDedup = useCallback(async (
    url: string,
    key: string,
    setData: (data: unknown) => void
  ): Promise<number> => {
    try {
      const start = performance.now()
      const res = await fetch(url)
      const latency = performance.now() - start
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      // Smart dedup: only update if data changed
      if (!deepEqual(data, prevDataRef.current[key])) {
        prevDataRef.current = { ...prevDataRef.current, [key]: data }
        setData(data)
      }

      return latency < 200 ? 2 : latency < 500 ? 1 : 0
    } catch {
      return 0
    }
  }, [])

  // Fetch all data sources
  const fetchAll = useCallback(async () => {
    if (!isVisibleRef.current || !config.enabled) return

    // Reset error on retry
    setError(null)

    const results = await Promise.all([
      fetchWithDedup('/api/analytics', 'analytics', setAnalytics),
      fetchWithDedup('/api/agents', 'agents', setAgents),
      fetchWithDedup('/api/meetings', 'meetings', setMeetings),
      fetchWithDedup('/api/notifications', 'notifications', setNotifications),
    ])

    // Record health data point
    const now = Date.now()
    const healthPoint: HealthDataPoint = {
      timestamp: now,
      analytics: results[0],
      agents: results[1],
      meetings: results[2],
      notifications: results[3],
    }
    setHealthHistory((prev) => {
      const updated = [...prev, healthPoint].slice(-20)
      return updated
    })

    const allOk = results.every((r) => r >= 2)
    if (!allOk) {
      setError('Some API endpoints are slow or unavailable')
    } else {
      setError(null)
    }

    // Reset backoff on success
    backoffRef.current = 1000
    setLastUpdated(now)
    setIsLoading(false)
  }, [config.enabled, fetchWithDedup])

  // Refresh all (manual)
  const refreshAll = useCallback(async () => {
    setIsLoading(true)
    await fetchAll()
  }, [fetchAll])

  // Setup polling intervals
  useEffect(() => {
    // Clear existing timers
    timersRef.current.forEach((t) => clearTimeout(t))
    timersRef.current = []

    if (!config.enabled) return

    // Initial fetch
    setIsLoading(true)
    fetchAll()

    const schedulePoll = (fn: () => Promise<void>, interval: number) => {
      const poll = async () => {
        if (!isVisibleRef.current || !config.enabled) {
          // Re-schedule even when hidden
          setTimeout(poll, interval)
          return
        }
        try {
          await fn()
          backoffRef.current = 1000
        } catch {
          // Exponential backoff
          backoffRef.current = Math.min(backoffRef.current * 2, 60000)
          setTimeout(poll, backoffRef.current)
          return
        }
        setTimeout(poll, interval)
      }
      const timer = setTimeout(poll, interval)
      timersRef.current.push(timer)
      return timer
    }

    schedulePoll(fetchAll, Math.max(config.analyticsInterval, 5000))

    return () => {
      timersRef.current.forEach((t) => clearTimeout(t))
      timersRef.current = []
    }
  }, [config, fetchAll])

  // Recompute derived metrics when data changes
  useEffect(() => {
    computeDerived(analytics, meetings)
  }, [analytics, meetings, computeDerived])

  const value: LiveMetricsContextValue = {
    agents,
    meetings,
    analytics,
    notifications,
    isLoading,
    lastUpdated,
    error,
    refreshAll,
    isLive: config.enabled,
    config,
    setConfig: (partial: Partial<LiveMetricsConfig>) => {
      setConfig((prev) => ({ ...prev, ...partial }))
    },
    healthHistory,
    derived,
  }

  return (
    <LiveMetricsContext.Provider value={value}>
      {children}
    </LiveMetricsContext.Provider>
  )
}
