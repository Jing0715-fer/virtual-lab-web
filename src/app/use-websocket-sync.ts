'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Eye, Plus, MessageSquare, Loader2, Settings, Zap } from 'lucide-react'

// ============================================================
// Types
// ============================================================

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting'

export interface Participant {
  id: string
  name: string
  color: string
  status: string
  lastSeen: number
  cursor?: { x: number; y: number }
}

export interface ActivityEvent {
  id: string
  userId: string
  userName: string
  userColor: string
  action: 'viewing' | 'started' | 'added' | 'updated' | 'typing'
  target: string
  timestamp: number
  icon?: LucideIcon
}

interface WSMessage {
  type: string
  payload: Record<string, unknown>
  timestamp: string
  senderId?: string
  senderName?: string
}

const ACTION_ICONS: Record<string, LucideIcon> = {
  viewing: Eye,
  started: Plus,
  added: MessageSquare,
  updated: Settings,
  typing: Loader2,
}

// Mock participants for demo mode
const MOCK_PARTICIPANTS: Participant[] = [
  { id: 'u1', name: 'Alice Chen', color: '#10b981', status: 'available', lastSeen: Date.now() },
  { id: 'u2', name: 'Bob Martinez', color: '#06b6d4', status: 'in-meeting', lastSeen: Date.now() - 60000 },
  { id: 'u3', name: 'Charlie Kim', color: '#8b5cf6', status: 'busy', lastSeen: Date.now() - 120000 },
  { id: 'u4', name: 'Diana Patel', color: '#f59e0b', status: 'away', lastSeen: Date.now() - 300000 },
]

// Mock activities for demo mode
const MOCK_ACTIVITIES: ActivityEvent[] = [
  { id: 'm1', userId: 'u1', userName: 'Alice Chen', userColor: '#10b981', action: 'viewing', target: 'Dashboard', timestamp: Date.now() - 120_000, icon: Eye },
  { id: 'm2', userId: 'u2', userName: 'Bob Martinez', userColor: '#06b6d4', action: 'started', target: 'a team meeting', timestamp: Date.now() - 300_000, icon: Plus },
  { id: 'm3', userId: 'u5', userName: 'Ethan Johnson', userColor: '#ef4444', action: 'added', target: 'a pipeline task', timestamp: Date.now() - 600_000, icon: MessageSquare },
]

// ============================================================
// Hook: useWebSocketSync
// ============================================================

const WS_URL = typeof window !== 'undefined'
  ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/ws`
  : 'ws://localhost:3000/api/ws'

const MAX_RECONNECT_DELAY = 8_000  // 8 seconds max
const BASE_RECONNECT_DELAY = 1_000  // 1 second base
const MAX_ACTIVITY_EVENTS = 50
const HEARTBEAT_INTERVAL = 30_000

export function useWebSocketSync(roomId: string) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected')
  const [reconnecting, setReconnecting] = useState(false)
  const [connected, setConnected] = useState(false)
  const [activities, setActivities] = useState<ActivityEvent[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [useMock, setUseMock] = useState(true) // Start in mock/demo mode

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptRef = useRef(0)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(false)
  const activityIdRef = useRef(0)

  // ---- Send message ----
  const sendMessage = useCallback((type: string, payload: Record<string, unknown> = {}) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return

    const message: WSMessage = {
      type,
      payload: { ...payload, roomId },
      timestamp: new Date().toISOString(),
    }
    ws.send(JSON.stringify(message))
  }, [roomId])

  // ---- Handle incoming message ----
  const handleMessage = useCallback((data: WSMessage) => {
    switch (data.type) {
      case 'cursor_move': {
        const { userId, x, y } = data.payload as { userId: string; x: number; y: number }
        setParticipants(prev => prev.map(p =>
          p.id === userId ? { ...p, cursor: { x, y }, lastSeen: Date.now() } : p
        ))
        break
      }
      case 'presence_update': {
        const { userId, name, color, status } = data.payload as { userId: string; name: string; color: string; status: string }
        setParticipants(prev => {
          const existing = prev.find(p => p.id === userId)
          if (existing) {
            return prev.map(p => p.id === userId ? { ...p, status, lastSeen: Date.now() } : p)
          }
          return [...prev, { id: userId, name, color, status, lastSeen: Date.now() }]
        })
        break
      }
      case 'activity_event': {
        const { userId, userName, userColor, action, target } = data.payload as {
          userId: string; userName: string; userColor: string; action: string; target: string
        }
        const newEvent: ActivityEvent = {
          id: `ws-${Date.now()}-${activityIdRef.current++}`,
          userId,
          userName,
          userColor,
          action: action as ActivityEvent['action'],
          target,
          timestamp: Date.now(),
          icon: ACTION_ICONS[action] || Zap,
        }
        setActivities(prev => [...prev.slice(-(MAX_ACTIVITY_EVENTS - 1)), newEvent])
        break
      }
      case 'note_edit': {
        // Note edits are handled by the SharedNotesWidget via localStorage
        break
      }
      case 'user_joined': {
        const { userId, name, color } = data.payload as { userId: string; name: string; color: string }
        setParticipants(prev => {
          if (prev.find(p => p.id === userId)) return prev
          return [...prev, { id: userId, name, color, status: 'available', lastSeen: Date.now() }]
        })
        // Add join activity
        const joinEvent: ActivityEvent = {
          id: `join-${Date.now()}`,
          userId,
          userName: name || 'Unknown',
          userColor: color || '#10b981',
          action: 'started',
          target: 'session',
          timestamp: Date.now(),
          icon: Plus,
        }
        setActivities(prev => [...prev.slice(-(MAX_ACTIVITY_EVENTS - 1)), joinEvent])
        break
      }
      default:
        break
    }
  }, [])

  // ---- Cleanup WebSocket ----
  const cleanup = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    if (wsRef.current) {
      const ws = wsRef.current
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close()
      }
      wsRef.current = null
    }
  }, [])

  // ---- Connect to WebSocket ----
  const connect = useCallback(() => {
    if (!mountedRef.current) return
    cleanup()
    setConnectionState('connecting')
    setReconnecting(reconnectAttemptRef.current > 0)

    try {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        if (!mountedRef.current) return
        setConnectionState('connected')
        setConnected(true)
        setReconnecting(false)
        reconnectAttemptRef.current = 0
        setUseMock(false)

        // Start heartbeat
        heartbeatRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() }))
          }
        }, HEARTBEAT_INTERVAL)

        // Announce presence to room
        ws.send(JSON.stringify({
          type: 'presence_update',
          payload: { roomId, status: 'available' },
          timestamp: new Date().toISOString(),
        }))
      }

      ws.onmessage = (event: MessageEvent) => {
        if (!mountedRef.current) return
        try {
          const data = JSON.parse(event.data as string) as WSMessage
          if (data.type === 'pong') return
          handleMessage(data)
        } catch {
          // ignore non-JSON
        }
      }

      ws.onclose = () => {
        if (!mountedRef.current) return
        setConnected(false)
        cleanup()
        setConnectionState('reconnecting')
        setReconnecting(true)
      }

      ws.onerror = () => {
        if (!mountedRef.current) return
        cleanup()
        // Connection failed — fall back to mock mode
        setUseMock(true)
        setConnectionState('disconnected')
        setReconnecting(false)
        ws.close()
      }
    } catch {
      // Connection failed — use mock mode
      setUseMock(true)
      setConnectionState('disconnected')
    }
  }, [cleanup, handleMessage, roomId])

  // ---- Reconnect with exponential backoff ----
  useEffect(() => {
    if (connectionState !== 'reconnecting') return
    if (reconnectAttemptRef.current >= 5) {
      setUseMock(true)
      setConnectionState('disconnected')
      setReconnecting(false)
      return
    }

    const delay = Math.min(BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttemptRef.current), MAX_RECONNECT_DELAY)
    reconnectTimerRef.current = setTimeout(() => {
      if (mountedRef.current) {
        reconnectAttemptRef.current++
        connect()
      }
    }, delay)

    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
    }
  }, [connectionState, connect])

  // ---- Initial connection attempt ----
  useEffect(() => {
    mountedRef.current = true
    // Attempt real connection first; if it fails, use mock
    connect()

    return () => {
      mountedRef.current = false
      cleanup()
    }
  }, [connect, cleanup])

  // ---- Mock mode: periodic simulated activities ----
  useEffect(() => {
    if (!useMock) return

    const mockNames = ['Alice Chen', 'Bob Martinez', 'Charlie Kim', 'Diana Patel', 'Ethan Johnson']
    const mockColors = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444']
    const mockTargets = ['Dashboard', 'Agents', 'Pipeline', 'Team Meeting', 'Settings', 'History']
    const mockActions: Array<{ action: ActivityEvent['action']; verb: string }> = [
      { action: 'viewing', verb: 'is viewing' },
      { action: 'started', verb: 'started' },
      { action: 'added', verb: 'added' },
      { action: 'updated', verb: 'updated' },
    ]

    // Load mock participants immediately
    setParticipants(MOCK_PARTICIPANTS)
    setActivities(MOCK_ACTIVITIES)

    const interval = setInterval(() => {
      const idx = Math.floor(Math.random() * mockNames.length)
      const actionIdx = Math.floor(Math.random() * mockActions.length)
      const targetIdx = Math.floor(Math.random() * mockTargets.length)

      const newEvent: ActivityEvent = {
        id: `mock-${Date.now()}-${activityIdRef.current++}`,
        userId: `u${idx + 1}`,
        userName: mockNames[idx],
        userColor: mockColors[idx],
        action: mockActions[actionIdx].action,
        target: mockTargets[targetIdx],
        timestamp: Date.now(),
        icon: ACTION_ICONS[mockActions[actionIdx].action] || Zap,
      }

      setActivities(prev => [...prev.slice(-(MAX_ACTIVITY_EVENTS - 1)), newEvent])
    }, 12000)

    return () => clearInterval(interval)
  }, [useMock])

  return {
    connected,
    reconnecting,
    connectionState,
    activities: useMemo(() => activities, [activities]),
    participants: useMemo(() => participants, [participants]),
    sendMessage,
    useMock,
  }
}
