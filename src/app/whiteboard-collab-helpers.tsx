'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Wifi, WifiOff, RefreshCw, MessageCircle, Send, X,
  MapPin, Star, Check, XCircle, ArrowUp, Lightbulb,
  Ruler, Clock, ChevronDown, ChevronUp, Trash2, Edit3,
} from 'lucide-react'
import type { WBPoint, WBLayer, WBVersion } from './interactive-whiteboard'

// ============================================================
// Types
// ============================================================

export interface CollabCursor {
  id: string
  name: string
  color: string
  x: number
  y: number
  lastActive: number
}

export interface ChatMessage {
  id: string
  author: string
  authorColor: string
  text: string
  timestamp: number
}

export interface AnnotationMarker {
  id: string
  number: number
  x: number
  y: number
  comment: string
  color: string
  createdBy: string
  createdAt: number
}

export type SyncStatus = 'connected' | 'syncing' | 'offline'

export interface QuickStamp {
  id: string
  emoji: string
  label: string
  svgContent: string
}

// ============================================================
// Constants
// ============================================================

const CURSOR_COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']
const ANNOTATION_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899']
const MARKER_NAMES = ['You', 'Alice', 'Bob', 'Carol', 'Dave', 'Eve']

const QUICK_STAMPS: QuickStamp[] = [
  {
    id: 'star',
    emoji: '⭐',
    label: 'Star',
    svgContent: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="#f59e0b" stroke="#d97706" stroke-width="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
  },
  {
    id: 'check',
    emoji: '✅',
    label: 'Check',
    svgContent: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  },
  {
    id: 'x-mark',
    emoji: '❌',
    label: 'X Mark',
    svgContent: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
  },
  {
    id: 'arrow-up',
    emoji: '⬆️',
    label: 'Arrow Up',
    svgContent: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>',
  },
  {
    id: 'thought',
    emoji: '💭',
    label: 'Idea',
    svgContent: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  },
  {
    id: 'lightbulb',
    emoji: '💡',
    label: 'Lightbulb',
    svgContent: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>',
  },
  {
    id: 'question',
    emoji: '❓',
    label: 'Question',
    svgContent: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  },
  {
    id: 'fire',
    emoji: '🔥',
    label: 'Hot',
    svgContent: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>',
  },
]

// ============================================================
// 1. Cursor Presence Component
// ============================================================

interface CursorPresenceProps {
  cursors: CollabCursor[]
  zoom: number
  panX: number
  panY: number
  currentUser?: string
}

export function CursorPresence({ cursors, zoom, panX, panY, currentUser }: CursorPresenceProps) {
  const filtered = cursors.filter(c => c.id !== currentUser)

  if (filtered.length === 0) return null

  return (
    <>
      {filtered.map(cursor => (
        <div
          key={cursor.id}
          className="wb-cursor-presence"
          style={{
            left: cursor.x * zoom + panX,
            top: cursor.y * zoom + panY,
            color: cursor.color,
            animation: 'wb-cursor-appear 0.3s ease',
          }}
        >
          <div className="wb-cursor-arrow" />
          <div className="wb-cursor-name" style={{ backgroundColor: cursor.color }}>
            {cursor.name}
          </div>
        </div>
      ))}
    </>
  )
}

// ============================================================
// 2. Sync Status Indicator
// ============================================================

interface SyncIndicatorProps {
  status: SyncStatus
  label?: string
}

export function SyncIndicator({ status, label }: SyncIndicatorProps) {
  const statusConfig = useMemo(() => {
    switch (status) {
      case 'connected':
        return { dotClass: 'wb-sync-connected', text: label || 'Connected', icon: Wifi }
      case 'syncing':
        return { dotClass: 'wb-sync-syncing', text: label || 'Syncing...', icon: RefreshCw }
      case 'offline':
        return { dotClass: 'wb-sync-offline', text: label || 'Offline', icon: WifiOff }
    }
  }, [status, label])

  const StatusIcon = statusConfig.icon

  return (
    <div className="wb-sync-indicator">
      <div className={`wb-sync-dot ${statusConfig.dotClass}`} />
      <StatusIcon size={10} />
      <span>{statusConfig.text}</span>
    </div>
  )
}

// ============================================================
// 3. Chat Overlay Component
// ============================================================

interface ChatOverlayProps {
  messages: ChatMessage[]
  onSendMessage: (text: string) => void
  currentUserName?: string
  currentUserColor?: string
  isOpen: boolean
  onToggle: () => void
  mentionChannel?: string
}

export function ChatOverlay({
  messages,
  onSendMessage,
  currentUserName = 'You',
  currentUserColor = '#10b981',
  isOpen,
  onToggle,
}: ChatOverlayProps) {
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback(() => {
    if (!inputValue.trim()) return
    onSendMessage(inputValue.trim())
    setInputValue('')
  }, [inputValue, onSendMessage])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  if (!isOpen) {
    return (
      <button
        className="wb-chat-send-btn"
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          zIndex: 45,
          width: 36,
          height: 36,
          borderRadius: '50%',
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        }}
        onClick={onToggle}
        title="Open chat"
        type="button"
      >
        <MessageCircle size={18} />
      </button>
    )
  }

  return (
    <div className="wb-chat-overlay">
      <div className="wb-chat-header">
        <span>Whiteboard Chat</span>
        <button className="wb-chat-close-btn" onClick={onToggle} type="button">
          <X size={14} />
        </button>
      </div>
      <div className="wb-chat-messages">
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '12px 0', fontSize: 11, color: 'var(--vl-text-muted)' }}>
            No messages yet. Start a discussion!
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className="wb-chat-msg">
            <span className="wb-chat-msg-author" style={{ color: msg.authorColor }}>
              {msg.author}:
            </span>
            {msg.text}
            <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--vl-text-muted)', opacity: 0.6 }}>
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="wb-chat-input-row">
        <input
          className="wb-chat-input"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          maxLength={500}
        />
        <button
          className="wb-chat-send-btn"
          onClick={handleSend}
          disabled={!inputValue.trim()}
          type="button"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  )
}

// ============================================================
// 4. Annotation Markers Component
// ============================================================

interface AnnotationMarkersProps {
  markers: AnnotationMarker[]
  onAddMarker: (marker: Omit<AnnotationMarker, 'id' | 'number' | 'createdAt'>) => void
  onRemoveMarker: (id: string) => void
  onUpdateMarker: (id: string, comment: string) => void
  zoom: number
  panX: number
  panY: number
  activeMode?: 'annotate' | null
  onModeChange: (mode: 'annotate' | null) => void
}

export function AnnotationMarkers({
  markers,
  onAddMarker,
  onRemoveMarker,
  onUpdateMarker,
  zoom,
  panX,
  panY,
  activeMode,
  onModeChange,
}: AnnotationMarkersProps) {
  const [editingMarkerId, setEditingMarkerId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (activeMode !== 'annotate') return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left - panX) / zoom
    const y = (e.clientY - rect.top - panY) / zoom
    onAddMarker({
      x,
      y,
      comment: '',
      color: ANNOTATION_COLORS[markers.length % ANNOTATION_COLORS.length],
      createdBy: 'You',
    })
  }, [activeMode, markers.length, onAddMarker, panX, panY, zoom])

  const startEdit = useCallback((marker: AnnotationMarker) => {
    setEditingMarkerId(marker.id)
    setEditText(marker.comment)
  }, [])

  const commitEdit = useCallback(() => {
    if (editingMarkerId) {
      onUpdateMarker(editingMarkerId, editText)
      setEditingMarkerId(null)
    }
  }, [editingMarkerId, editText, onUpdateMarker])

  return (
    <>
      {/* Annotation click layer */}
      {activeMode === 'annotate' && (
        <div
          style={{ position: 'absolute', inset: 0, zIndex: 26, cursor: 'crosshair' }}
          onClick={handleCanvasClick}
        />
      )}

      {/* Mode toggle button */}
      <button
        className={`wb-tool-btn ${activeMode === 'annotate' ? 'wb-tool-active' : ''}`}
        data-wb-tooltip="Toggle annotations"
        onClick={() => onModeChange(activeMode === 'annotate' ? null : 'annotate')}
        type="button"
        style={{ position: 'absolute', top: 44, left: 12, zIndex: 42 }}
      >
        <MapPin size={16} />
      </button>

      {/* Markers */}
      {markers.map((marker) => (
        <div
          key={marker.id}
          className="wb-annotation-marker"
          style={{
            left: marker.x * zoom + panX - 12,
            top: marker.y * zoom + panY - 12,
            color: marker.color,
          }}
        >
          <div className="wb-annotation-pin" style={{ backgroundColor: marker.color }}>
            {marker.number}
          </div>
          <div className="wb-annotation-comment">
            {editingMarkerId === marker.id ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <textarea
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit() }
                    if (e.key === 'Escape') setEditingMarkerId(null)
                  }}
                  placeholder="Add comment..."
                  style={{
                    width: '100%', minHeight: 36, fontSize: 12, padding: 4,
                    border: '1px solid var(--vl-border)', borderRadius: 4,
                    background: 'var(--vl-bg-input)', color: 'var(--vl-text-primary)',
                    resize: 'vertical', outline: 'none',
                  }}
                  autoFocus
                  rows={2}
                />
                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setEditingMarkerId(null)}
                    style={{ fontSize: 10, padding: '2px 6px', border: 'none', borderRadius: 3, cursor: 'pointer', background: 'var(--vl-bg-secondary)' }}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={commitEdit}
                    style={{ fontSize: 10, padding: '2px 6px', border: 'none', borderRadius: 3, cursor: 'pointer', background: 'var(--vl-accent)', color: '#fff' }}
                    type="button"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: 4 }}>
                  {marker.comment || <span style={{ fontStyle: 'italic', color: 'var(--vl-text-muted)' }}>Click to add comment</span>}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => startEdit(marker)}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: 'var(--vl-text-muted)' }}
                    type="button"
                  >
                    <Edit3 size={10} />
                  </button>
                  <button
                    onClick={() => onRemoveMarker(marker.id)}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: 'var(--vl-text-muted)' }}
                    type="button"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </>
  )
}

// ============================================================
// 5. Version History Slider Component
// ============================================================

interface VersionHistoryProps {
  versions: WBVersion[]
  currentIndex: number
  onVersionSelect: (index: number) => void
  onRestoreVersion: (index: number) => void
  isVisible: boolean
  onToggle: () => void
}

export function VersionHistorySlider({
  versions,
  currentIndex,
  onVersionSelect,
  onRestoreVersion,
  isVisible,
  onToggle,
}: VersionHistoryProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (isPlaying && versions.length > 1) {
      let idx = currentIndex
      playIntervalRef.current = setInterval(() => {
        idx = (idx + 1) % versions.length
        onVersionSelect(idx)
      }, 1000)
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current)
    }
  }, [isPlaying, versions.length, currentIndex, onVersionSelect])

  const togglePlay = useCallback(() => {
    setIsPlaying(p => !p)
  }, [])

  if (versions.length < 2) return null

  const progressPercent = currentIndex >= 0 ? ((currentIndex + 1) / versions.length) * 100 : 0

  return (
    <>
      <button
        className="wb-tool-btn"
        data-wb-tooltip="Version history"
        onClick={onToggle}
        type="button"
        style={{ position: 'absolute', top: 44, left: 52, zIndex: 42 }}
      >
        <Clock size={16} />
      </button>
      <div className={`wb-version-slider ${isVisible ? 'wb-version-visible' : ''}`}>
        <button
          className="wb-version-play-btn"
          onClick={togglePlay}
          type="button"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
          )}
        </button>
        <div
          className="wb-version-track"
          onClick={e => {
            const rect = e.currentTarget.getBoundingClientRect()
            const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
            const idx = Math.round(ratio * (versions.length - 1))
            onVersionSelect(idx)
          }}
        >
          <div className="wb-version-progress" style={{ width: `${progressPercent}%` }} />
          <div
            className="wb-version-scrubber"
            style={{ left: `${progressPercent}%` }}
          />
        </div>
        <span className="wb-version-label">
          {currentIndex >= 0 && versions[currentIndex] ? versions[currentIndex].label : '—'}
        </span>
        {isVisible && currentIndex >= 0 && (
          <button
            className="wb-tool-btn"
            onClick={() => onRestoreVersion(currentIndex)}
            title="Restore this version"
            type="button"
            style={{ width: 24, height: 24 }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
          </button>
        )}
      </div>
    </>
  )
}

// ============================================================
// 6. Quick Stamps Component
// ============================================================

interface QuickStampsProps {
  stamps: QuickStamp[]
  activeStamp: string | null
  onSelectStamp: (stamp: QuickStamp | null) => void
  onPlaceStamp: (stamp: QuickStamp, x: number, y: number) => void
  zoom: number
  panX: number
  panY: number
  isVisible: boolean
  onToggle: () => void
}

export function QuickStamps({
  stamps = QUICK_STAMPS,
  activeStamp,
  onSelectStamp,
  onPlaceStamp,
  zoom,
  panX,
  panY,
  isVisible,
  onToggle,
}: QuickStampsProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeStamp) return
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const x = (e.clientX - rect.left - panX) / zoom
    const y = (e.clientY - rect.top - panY) / zoom
    onPlaceStamp(activeStamp, x, y)
    onSelectStamp(null)
  }, [activeStamp, onPlaceStamp, onSelectStamp, panX, panY, zoom])

  return (
    <>
      {/* Toggle button */}
      <button
        className={`wb-tool-btn ${activeStamp ? 'wb-tool-active' : ''}`}
        data-wb-tooltip="Quick stamps"
        onClick={() => {
          if (isVisible) onToggle()
          else onToggle()
        }}
        type="button"
        style={{ position: 'absolute', top: 44, left: 88, zIndex: 42 }}
      >
        <Star size={16} />
      </button>

      {/* Stamp palette */}
      {isVisible && (
        <div className="wb-options-panel" style={{ top: 80, left: 12, minWidth: 200 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--vl-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Quick Stamps
          </div>
          <div className="wb-stamps-panel">
            {stamps.map(stamp => (
              <button
                key={stamp.id}
                className={`wb-stamp-btn ${activeStamp?.id === stamp.id ? 'wb-stamp-active' : ''}`}
                onClick={() => onSelectStamp(activeStamp?.id === stamp.id ? null : stamp)}
                title={stamp.label}
                type="button"
                dangerouslySetInnerHTML={{ __html: stamp.svgContent }}
              />
            ))}
          </div>
          {activeStamp && (
            <div style={{ fontSize: 11, color: 'var(--vl-text-muted)', marginTop: 8, textAlign: 'center' }}>
              Click on the canvas to place {activeStamp.label}
            </div>
          )}
        </div>
      )}

      {/* Placement layer */}
      {activeStamp && (
        <div
          ref={containerRef}
          style={{ position: 'absolute', inset: 0, zIndex: 27, cursor: 'copy' }}
          onClick={handleCanvasClick}
        />
      )}
    </>
  )
}

// ============================================================
// 7. Measurement Tool Component
// ============================================================

interface MeasurementToolProps {
  p1: WBPoint | null
  p2: WBPoint | null
  distance: number
  zoom: number
  panX: number
  panY: number
  onMeasureClick: (pt: WBPoint) => void
  onClear: () => void
  isDark?: boolean
}

export function MeasurementTool({
  p1, p2, distance, zoom, panX, panY,
  onMeasureClick, onClear, isDark = false,
}: MeasurementToolProps) {
  const labelMidX = p1 && p2 ? ((p1.x + p2.x) / 2) * zoom + panX : 0
  const labelMidY = p1 && p2 ? ((p1.y + p2.y) / 2) * zoom + panY - 16 : 0

  // Approximate: 1 cm ≈ 37.8 px at 96 DPI
  const cmDistance = distance / 37.8
  const inchDistance = distance / 96

  return (
    <>
      {/* Measurement label */}
      {p1 && p2 && (
        <div
          className="wb-measurement-label"
          style={{ left: labelMidX, top: labelMidY }}
        >
          {Math.round(distance)}px · {cmDistance.toFixed(1)}cm · {inchDistance.toFixed(1)}in
        </div>
      )}

      {/* Clear button */}
      {p1 && (
        <button
          className="wb-tool-btn"
          onClick={onClear}
          data-wb-tooltip="Clear measurement"
          type="button"
          style={{ position: 'absolute', top: 44, left: 124, zIndex: 42 }}
        >
          <Ruler size={16} />
        </button>
      )}
    </>
  )
}

// ============================================================
// 8. Simulated Collab Hook (for demo)
// ============================================================

export function useSimulatedCursors(count: number = 3, enabled: boolean = true) {
  const [cursors, setCursors] = useState<CollabCursor[]>([])

  useEffect(() => {
    if (!enabled) {
      setCursors([])
      return
    }

    const names = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve'].slice(0, count)
    const initial: CollabCursor[] = names.map((name, i) => ({
      id: name.toLowerCase(),
      name,
      color: CURSOR_COLORS[i % CURSOR_COLORS.length],
      x: 150 + i * 120,
      y: 150 + i * 80,
      lastActive: Date.now(),
    }))
    setCursors(initial)

    const interval = setInterval(() => {
      setCursors(prev => prev.map((cursor, i) => ({
        ...cursor,
        x: cursor.x + (Math.sin(Date.now() / (2000 + i * 500)) * 1.5),
        y: cursor.y + (Math.cos(Date.now() / (2500 + i * 400)) * 1.2),
        lastActive: Date.now(),
      })))
    }, 200)

    return () => clearInterval(interval)
  }, [count, enabled])

  return cursors
}

// ============================================================
// 9. Simulated Chat Hook (for demo)
// ============================================================

export function useSimulatedChat(enabled: boolean = false) {
  const [messages, setMessages] = useState<ChatMessage[]>([])

  useEffect(() => {
    if (!enabled) return

    const demoMessages: ChatMessage[] = [
      { id: 'demo-1', author: 'Alice', authorColor: '#3b82f6', text: 'I added the reaction pathway diagram.', timestamp: Date.now() - 120000 },
      { id: 'demo-2', author: 'Bob', authorColor: '#ef4444', text: 'Looks great! Can we add the enzyme names?', timestamp: Date.now() - 60000 },
      { id: 'demo-3', author: 'Carol', authorColor: '#f59e0b', text: 'I think the arrow between step 2 and 3 needs adjusting.', timestamp: Date.now() - 30000 },
    ]
    setMessages(demoMessages)
  }, [enabled])

  const sendMessage = useCallback((text: string) => {
    const msg: ChatMessage = {
      id: `chat-${Date.now()}`,
      author: 'You',
      authorColor: '#10b981',
      text,
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, msg])
  }, [])

  return { messages, sendMessage }
}

// ============================================================
// 10. Export all stamps
// ============================================================

export { QUICK_STAMPS, CURSOR_COLORS, ANNOTATION_COLORS }
