'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import type { Lang } from '@/lib/i18n'

// ============================================================
// Types
// ============================================================

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error'

export interface WSMessage {
  type: string
  payload: Record<string, unknown>
  timestamp: string
  senderId?: string
  senderName?: string
}

interface WebSocketContextValue {
  connectionState: ConnectionState
  lastMessage: WSMessage | null
  send: (type: string, payload?: Record<string, unknown>) => void
  onMessage: ((msg: WSMessage) => void) | null
  setOnMessage: (handler: ((msg: WSMessage) => void) | null) => void
  reconnectAttempt: number
}

// ============================================================
// Context
// ============================================================

const WebSocketContext = createContext<WebSocketContextValue>({
  connectionState: 'disconnected',
  lastMessage: null,
  send: () => {},
  onMessage: null,
  setOnMessage: () => {},
  reconnectAttempt: 0,
})

export function useWebSocket() {
  return useContext(WebSocketContext)
}

// ============================================================
// Provider
// ============================================================

const WS_URL = typeof window !== 'undefined'
  ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/ws`
  : 'ws://localhost:3000/api/ws'

const MAX_RECONNECT_ATTEMPTS = 5
const HEARTBEAT_INTERVAL = 30_000
const BASE_RECONNECT_DELAY = 1_000

export function WebSocketProvider({
  children,
  username = 'Anonymous',
  lang = 'en',
}: {
  children: React.ReactNode
  username?: string
  lang?: Lang
}) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected')
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null)
  const onMessageRef = useRef<((msg: WSMessage) => void) | null>(null)
  const [onMessageHandler, setOnMessageHandler] = useState<((msg: WSMessage) => void) | null>(null)
  const [reconnectAttempt, setReconnectAttempt] = useState(0)
  const wsRef = useRef<WebSocket | null>(null)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(false)
  const usernameRef = useRef(username)

  // Keep username ref up to date
  useEffect(() => {
    usernameRef.current = username
  }, [username])

  // Clear heartbeat
  const clearHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
    }
  }, [])

  // Start heartbeat
  const startHeartbeat = useCallback(() => {
    clearHeartbeat()
    heartbeatRef.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }))
      }
    }, HEARTBEAT_INTERVAL)
  }, [clearHeartbeat])

  // Message dispatcher
  const dispatchMessage = useCallback((msg: WSMessage) => {
    setLastMessage(msg)
    if (onMessageRef.current) {
      onMessageRef.current(msg)
    }
  }, [])

  // Send function
  const send = useCallback((type: string, payload: Record<string, unknown> = {}) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return

    const message: WSMessage = {
      type,
      payload,
      timestamp: new Date().toISOString(),
      senderName: usernameRef.current,
    }
    ws.send(JSON.stringify(message))

    // Typing indicator local echo
    if (type !== 'ping' && type !== 'pong') {
      dispatchMessage(message)
    }
  }, [dispatchMessage])

  // Cleanup function
  const cleanup = useCallback(() => {
    clearHeartbeat()
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close()
      }
      wsRef.current = null
    }
  }, [clearHeartbeat])

  // Connect function
  const connect = useCallback(() => {
    if (!mountedRef.current) return
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return

    cleanup()
    setConnectionState('connecting')

    try {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        if (!mountedRef.current) return
        setConnectionState('connected')
        setReconnectAttempt(0)
        startHeartbeat()
        // Announce self
        ws.send(JSON.stringify({
          type: 'user_joined',
          payload: { username: usernameRef.current },
          timestamp: new Date().toISOString(),
          senderName: usernameRef.current,
        }))
      }

      ws.onmessage = (event: MessageEvent) => {
        if (!mountedRef.current) return
        try {
          const data = JSON.parse(event.data as string) as WSMessage
          if (data.type === 'pong') return // ignore pong responses
          dispatchMessage(data)
        } catch {
          // ignore non-JSON messages
        }
      }

      ws.onclose = () => {
        if (!mountedRef.current) return
        clearHeartbeat()
        setConnectionState('disconnected')
      }

      ws.onerror = () => {
        if (!mountedRef.current) return
        setConnectionState('error')
        ws.close()
      }
    } catch {
      setConnectionState('error')
      // Fallback: SSE polling will be attempted via reconnect logic
    }
  }, [cleanup, startHeartbeat, clearHeartbeat, dispatchMessage])

  // Reconnect with exponential backoff
  useEffect(() => {
    if (connectionState !== 'disconnected' && connectionState !== 'error') return
    if (reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) return

    const delay = BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempt)
    const timeout = setTimeout(() => {
      if (mountedRef.current) {
        setReconnectAttempt(prev => prev + 1)
        connect()
      }
    }, delay)
    reconnectTimeoutRef.current = timeout

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [connectionState, reconnectAttempt, connect])

  // Initial mount: connect
  useEffect(() => {
    mountedRef.current = true
    connect()

    return () => {
      mountedRef.current = false
      cleanup()
    }
  }, [])

  // Context value
  const contextValue: WebSocketContextValue = {
    connectionState,
    lastMessage,
    send,
    onMessage: onMessageHandler,
    setOnMessage: (handler: ((msg: WSMessage) => void) | null) => {
      onMessageRef.current = handler
      setOnMessageHandler(handler)
    },
    reconnectAttempt,
  }

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  )
}
