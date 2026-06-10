'use client'

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, MousePointer2, Link2, ZoomIn, ZoomOut, Maximize2,
  Download, Trash2, Minus, GripHorizontal, Eye
} from 'lucide-react'
import { toast } from 'sonner'

/* ---------- Types ---------- */
interface StickyNote {
  id: string
  x: number
  y: number
  width: number
  height: number
  text: string
  color: NoteColor
}

type NoteColor = 'emerald' | 'cyan' | 'violet' | 'amber' | 'rose'

interface Connection {
  id: string
  fromId: string
  toId: string
  color: string
}

type ToolMode = 'select' | 'connect'

interface CanvasState {
  notes: StickyNote[]
  connections: Connection[]
  pan: { x: number; y: number }
  zoom: number
}

const STORAGE_KEY = 'vl-collab-workspace'

const NOTE_COLORS: NoteColor[] = ['emerald', 'cyan', 'violet', 'amber', 'rose']
const COLOR_HEX: Record<NoteColor, string> = {
  emerald: '#10b981',
  cyan: '#06b6d4',
  violet: '#8b5cf6',
  amber: '#f59e0b',
  rose: '#f43f5e',
}

const CONNECTION_COLORS = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#f43f5e', '#64748b']

let idCounter = 0
const genId = () => `ws-${Date.now()}-${++idCounter}`

/* ---------- Helpers ---------- */
const snapToGrid = (v: number, grid: number) => Math.round(v / grid) * grid

const bezierPath = (
  x1: number, y1: number, x2: number, y2: number
): string => {
  const dx = Math.abs(x2 - x1) * 0.5
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`
}

const loadState = (): CanvasState | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const saveState = (state: CanvasState) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch { /* quota */ }
}

/* ---------- Component ---------- */
export function CollaborativeWorkspace() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 })

  /* Track container size */
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height })
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const [notes, setNotes] = useState<StickyNote[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [mode, setMode] = useState<ToolMode>('select')
  const [selectedColor, setSelectedColor] = useState<NoteColor>('emerald')
  const [snapEnabled, setSnapEnabled] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [dragNote, setDragNote] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null)
  const [connectTarget, setConnectTarget] = useState<{ x: number; y: number } | null>(null)
  const [resizingNote, setResizingNote] = useState<string | null>(null)
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, w: 0, h: 0 })
  const [showMinimap, setShowMinimap] = useState(true)
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const [connColorIdx, setConnColorIdx] = useState(0)
  const [hoveredNote, setHoveredNote] = useState<string | null>(null)

  /* Init from localStorage */
  useEffect(() => {
    const saved = loadState()
    if (saved) {
      const timer = setTimeout(() => {
        setNotes(saved.notes || [])
        setConnections(saved.connections || [])
        setPan(saved.pan || { x: 0, y: 0 })
        setZoom(saved.zoom || 1)
      }, 0)
      return () => clearTimeout(timer)
    }
    return () => {}
  }, [])

  /* Persist on change */
  useEffect(() => {
    saveState({ notes, connections, pan, zoom })
  }, [notes, connections, pan, zoom])

  /* Screen to canvas coord */
  const toCanvas = useCallback(
    (screenX: number, screenY: number) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return { x: 0, y: 0 }
      return {
        x: (screenX - rect.left - pan.x) / zoom,
        y: (screenY - rect.top - pan.y) / zoom,
      }
    },
    [pan, zoom]
  )

  /* Zoom via wheel */
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.08 : 0.08
      setZoom((z) => Math.max(0.15, Math.min(3, z + delta)))
    },
    []
  )

  /* Pan handlers */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        setIsPanning(true)
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
        e.preventDefault()
      } else if (e.button === 0 && mode === 'select' && !(e.target as HTMLElement).closest('.sticky-note') && !(e.target as HTMLElement).closest('.tool-palette') && !(e.target as HTMLElement).closest('.zoom-controls') && !(e.target as HTMLElement).closest('.workspace-minimap')) {
        setIsPanning(true)
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
      }
    },
    [pan, mode]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y })
      }
      if (dragNote) {
        const pos = toCanvas(e.clientX, e.clientY)
        setNotes((prev) =>
          prev.map((n) => {
            if (n.id !== dragNote) return n
            const nx = snapEnabled ? snapToGrid(pos.x - dragOffset.x, 20) : pos.x - dragOffset.x
            const ny = snapEnabled ? snapToGrid(pos.y - dragOffset.y, 20) : pos.y - dragOffset.y
            return { ...n, x: nx, y: ny }
          })
        )
      }
      if (connectingFrom) {
        const pos = toCanvas(e.clientX, e.clientY)
        setConnectTarget(pos)
      }
      if (resizingNote) {
        const pos = toCanvas(e.clientX, e.clientY)
        setNotes((prev) =>
          prev.map((n) => {
            if (n.id !== resizingNote) return n
            const nw = Math.max(140, snapEnabled ? snapToGrid(pos.x - n.x, 20) : pos.x - n.x)
            const nh = Math.max(100, snapEnabled ? snapToGrid(pos.y - n.y, 20) : pos.y - n.y)
            return { ...n, width: nw, height: nh }
          })
        )
      }
    },
    [isPanning, panStart, dragNote, dragOffset, toCanvas, snapEnabled, connectingFrom, resizingNote]
  )

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
    setDragNote(null)
    setResizingNote(null)
  }, [])

  /* Touch handlers for panning */
  const touchRef = useRef<{ lastX: number; lastY: number; isTwoFinger: boolean }>({ lastX: 0, lastY: 0, isTwoFinger: false })
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      touchRef.current.isTwoFinger = true
      touchRef.current.lastX = (e.touches[0].clientX + e.touches[1].clientX) / 2
      touchRef.current.lastY = (e.touches[0].clientY + e.touches[1].clientY) / 2
    } else if (e.touches.length === 1 && !touchRef.current.isTwoFinger) {
      if (!(e.target as HTMLElement).closest('.sticky-note') && !(e.target as HTMLElement).closest('.tool-palette')) {
        setIsPanning(true)
        touchRef.current.lastX = e.touches[0].clientX
        touchRef.current.lastY = e.touches[0].clientY
      }
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchRef.current.isTwoFinger) {
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2
      setPan((p) => ({ x: p.x + cx - touchRef.current.lastX, y: p.y + cy - touchRef.current.lastY }))
      touchRef.current.lastX = cx
      touchRef.current.lastY = cy
    } else if (isPanning && e.touches.length === 1) {
      const tx = e.touches[0].clientX
      const ty = e.touches[0].clientY
      setPan((p) => ({ x: p.x + tx - touchRef.current.lastX, y: p.y + ty - touchRef.current.lastY }))
      touchRef.current.lastX = tx
      touchRef.current.lastY = ty
    }
  }, [isPanning])

  const handleTouchEnd = useCallback(() => {
    touchRef.current.isTwoFinger = false
    setIsPanning(false)
  }, [])

  /* Note actions */
  const addNote = useCallback(
    (color?: NoteColor) => {
      const cx = (-pan.x + (containerRef.current?.clientWidth || 800) / 2) / zoom
      const cy = (-pan.y + (containerRef.current?.clientHeight || 600) / 2) / zoom
      const newNote: StickyNote = {
        id: genId(),
        x: cx - 80,
        y: cy - 60,
        width: 200,
        height: 160,
        text: 'New idea...',
        color: color || selectedColor,
      }
      setNotes((prev) => [...prev, newNote])
      toast('Note added')
    },
    [pan, zoom, selectedColor]
  )

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id))
    setConnections((prev) => prev.filter((c) => c.fromId !== id && c.toId !== id))
    toast('Note deleted')
  }, [])

  const startDragNote = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const note = notes.find((n) => n.id === id)
    if (!note) return
    const pos = toCanvas(e.clientX, e.clientY)
    setDragNote(id)
    setDragOffset({ x: pos.x - note.x, y: pos.y - note.y })
  }, [notes, toCanvas])

  const startResizeNote = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const note = notes.find((n) => n.id === id)
    if (!note) return
    setResizingNote(id)
    setResizeStart({ x: note.width, y: note.height, w: 0, h: 0 })
  }, [notes])

  /* Connector actions */
  const handleConnectorClick = useCallback(
    (noteId: string) => {
      if (mode !== 'connect') return
      if (!connectingFrom) {
        setConnectingFrom(noteId)
      } else if (connectingFrom !== noteId) {
        const exists = connections.some(
          (c) =>
            (c.fromId === connectingFrom && c.toId === noteId) ||
            (c.fromId === noteId && c.toId === connectingFrom)
        )
        if (exists) {
          toast('Connection already exists')
        } else {
          setConnections((prev) => [
            ...prev,
            { id: genId(), fromId: connectingFrom, toId: noteId, color: CONNECTION_COLORS[connColorIdx] },
          ])
          toast('Connection created')
        }
        setConnectingFrom(null)
        setConnectTarget(null)
      }
    },
    [mode, connectingFrom, connections, connColorIdx]
  )

  const deleteConnection = useCallback((id: string) => {
    setConnections((prev) => prev.filter((c) => c.id !== id))
    toast('Connection removed')
  }, [])

  /* Zoom actions */
  const zoomIn = () => setZoom((z) => Math.min(3, z + 0.15))
  const zoomOut = () => setZoom((z) => Math.max(0.15, z - 0.15))
  const resetZoom = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  /* Export as PNG (simplified: export the canvas area data) */
  const exportPNG = useCallback(() => {
    const data = JSON.stringify({ notes, connections }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'workspace-export.json'
    a.click()
    URL.revokeObjectURL(url)
    toast('Workspace exported')
  }, [notes, connections])

  /* Minimap bounds */
  const minimapBounds = useMemo(() => {
    if (!notes.length) return { minX: 0, minY: 0, maxX: 1000, maxY: 700 }
    let minX = 0, minY = 0, maxX = 1000, maxY = 700
    notes.forEach((n) => {
      if (n.x < minX) minX = n.x
      if (n.y < minY) minY = n.y
      if (n.x + n.width > maxX) maxX = n.x + n.width
      if (n.y + n.height > maxY) maxY = n.y + n.height
    })
    const pad = 100
    return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad }
  }, [notes])

  const minimapScale = useMemo(() => {
    const mw = 180, mh = 120
    const bw = minimapBounds.maxX - minimapBounds.minX
    const bh = minimapBounds.maxY - minimapBounds.minY
    return Math.min(mw / bw, mh / bh)
  }, [minimapBounds])

  /* Connection paths */
  const connectionPaths = useMemo(() => {
    return connections.map((conn) => {
      const fromNote = notes.find((n) => n.id === conn.fromId)
      const toNote = notes.find((n) => n.id === conn.toId)
      if (!fromNote || !toNote) return null
      const x1 = fromNote.x + fromNote.width / 2
      const y1 = fromNote.y + fromNote.height
      const x2 = toNote.x + toNote.width / 2
      const y2 = toNote.y + toNote.height
      return { ...conn, x1, y1, x2, y2, path: bezierPath(x1, y1, x2, y2) }
    }).filter(Boolean)
  }, [connections, notes])

  /* Temp connection while connecting */
  const tempConnectionPath = useMemo(() => {
    if (!connectingFrom || !connectTarget) return null
    const fromNote = notes.find((n) => n.id === connectingFrom)
    if (!fromNote) return null
    const x1 = fromNote.x + fromNote.width / 2
    const y1 = fromNote.y + fromNote.height
    return bezierPath(x1, y1, connectTarget.x, connectTarget.y)
  }, [connectingFrom, connectTarget, notes])

  return (
    <div
      className="workspace-canvas"
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Grid */}
      <div className={`workspace-grid ${snapEnabled ? 'snap-enabled' : ''}`} />

      {/* Canvas Transform */}
      <div
        className="canvas-transform"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
      >
        {/* Connection Lines */}
        <svg
          className="connection-line"
          style={{ position: 'absolute', top: 0, left: 0, width: 1, height: 1, overflow: 'visible' }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="var(--vl-text-muted)" />
            </marker>
          </defs>
          {connectionPaths?.map((conn) =>
            conn && (
              <g key={conn.id} onClick={() => deleteConnection(conn.id)} style={{ cursor: 'pointer' }}>
                <path
                  d={conn.path}
                  fill="none"
                  stroke={conn.color}
                  strokeWidth={2}
                  strokeDasharray="1000"
                  style={{
                    animation: 'line-draw 0.5s ease forwards',
                    pointerEvents: 'stroke',
                  }}
                  markerEnd="url(#arrowhead)"
                />
                <path
                  d={conn.path}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={12}
                  className="line-delete-zone"
                />
              </g>
            )
          )}
          {tempConnectionPath && (
            <path
              d={tempConnectionPath}
              fill="none"
              stroke={CONNECTION_COLORS[connColorIdx]}
              strokeWidth={2}
              strokeDasharray="8 4"
              opacity={0.6}
            />
          )}
        </svg>

        {/* Sticky Notes */}
        <AnimatePresence>
          {notes.map((note) => (
            <motion.div
              key={note.id}
              className={`sticky-note note-${note.color}`}
              style={{
                left: note.x,
                top: note.y,
                width: note.width,
                height: note.height,
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              onMouseEnter={() => setHoveredNote(note.id)}
              onMouseLeave={() => setHoveredNote(null)}
            >
              {/* Delete */}
              <button
                className="note-delete-btn"
                onClick={() => deleteNote(note.id)}
                aria-label="Delete note"
              >
                <Trash2 size={12} />
              </button>

              {/* Connector dot */}
              <div
                className={`note-connector ${connectingFrom === note.id ? 'active' : ''}`}
                style={{ borderColor: connectingFrom === note.id ? CONNECTION_COLORS[connColorIdx] : undefined }}
                onClick={(e) => {
                  e.stopPropagation()
                  handleConnectorClick(note.id)
                }}
              />

              {/* Editable Text */}
              <div
                className="note-text"
                contentEditable={editingNote === note.id}
                suppressContentEditableWarning
                onClick={(e) => {
                  if (mode === 'connect') return
                  e.stopPropagation()
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  setEditingNote(note.id)
                }}
                onBlur={() => setEditingNote(null)}
                onMouseDown={(e) => {
                  if (editingNote !== note.id) {
                    startDragNote(note.id, e)
                  }
                }}
              >
                {note.text}
              </div>

              {/* Resize handle */}
              <div
                className="note-resize"
                onMouseDown={(e) => startResizeNote(note.id, e)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Tool Palette */}
      <div className="tool-palette" role="toolbar" aria-label="Workspace tools">
        {/* Select tool */}
        <button
          className={mode === 'select' ? 'active' : ''}
          onClick={() => { setMode('select'); setConnectingFrom(null); setConnectTarget(null) }}
          title="Select / Move"
          aria-label="Select and move mode"
        >
          <MousePointer2 size={18} />
        </button>

        {/* Connect tool */}
        <button
          className={mode === 'connect' ? 'active' : ''}
          onClick={() => setMode('connect')}
          title="Draw Connection"
          aria-label="Draw connection mode"
        >
          <Link2 size={18} />
        </button>

        <div className="tool-divider" />

        {/* Add note */}
        <button onClick={() => addNote()} title="Add Note" aria-label="Add sticky note">
          <Plus size={18} />
        </button>

        {/* Color picker */}
        <button onClick={() => setColorPickerOpen((p) => !p)} title="Note Color" aria-label="Pick note color">
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: COLOR_HEX[selectedColor],
            }}
          />
        </button>

        <AnimatePresence>
          {colorPickerOpen && (
            <motion.div
              className="color-picker-row"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {NOTE_COLORS.map((c) => (
                <div
                  key={c}
                  className={`color-dot ${selectedColor === c ? 'active' : ''}`}
                  style={{ background: COLOR_HEX[c] }}
                  onClick={() => { setSelectedColor(c); setColorPickerOpen(false) }}
                  title={c}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="tool-divider" />

        {/* Snap toggle */}
        <button
          className={snapEnabled ? 'active' : ''}
          onClick={() => setSnapEnabled((s) => !s)}
          title="Snap to Grid"
          aria-label="Toggle snap to grid"
        >
          <GripHorizontal size={18} />
        </button>

        {/* Minimap toggle */}
        <button
          className={showMinimap ? 'active' : ''}
          onClick={() => setShowMinimap((s) => !s)}
          title="Minimap"
          aria-label="Toggle minimap"
        >
          <Eye size={18} />
        </button>

        <div className="tool-divider" />

        {/* Export */}
        <button onClick={exportPNG} title="Export as JSON" aria-label="Export workspace">
          <Download size={18} />
        </button>
      </div>

      {/* Zoom Controls */}
      <div className="zoom-controls" role="group" aria-label="Zoom controls">
        <button onClick={zoomIn} aria-label="Zoom in">
          <ZoomIn size={16} />
        </button>
        <span className="zoom-label">{Math.round(zoom * 100)}%</span>
        <button onClick={zoomOut} aria-label="Zoom out">
          <ZoomOut size={16} />
        </button>
        <button onClick={resetZoom} aria-label="Reset zoom">
          <Maximize2 size={16} />
        </button>
      </div>

      {/* Minimap */}
      <AnimatePresence>
        {showMinimap && (
          <motion.div
            className="workspace-minimap"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            {/* Notes in minimap */}
            {notes.map((note) => (
              <div
                key={note.id}
                className="minimap-note"
                style={{
                  left: (note.x - minimapBounds.minX) * minimapScale,
                  top: (note.y - minimapBounds.minY) * minimapScale,
                  width: Math.max(6, note.width * minimapScale),
                  height: Math.max(4, note.height * minimapScale),
                  background: COLOR_HEX[note.color],
                }}
              />
            ))}
            {/* Viewport indicator */}
            <div
              className="minimap-viewport"
              style={{
                left: (-pan.x / zoom - minimapBounds.minX) * minimapScale,
                top: (-pan.y / zoom - minimapBounds.minY) * minimapScale,
                width: (containerSize.width / zoom) * minimapScale,
                height: (containerSize.height / zoom) * minimapScale,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {notes.length === 0 && (
        <div className="workspace-empty-state" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
          <div className="empty-icon">
            <Plus size={32} />
          </div>
          <h3>Empty Canvas</h3>
          <p>Click the + button or press the palette to add your first sticky note.</p>
        </div>
      )}
    </div>
  )
}
