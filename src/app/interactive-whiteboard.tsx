'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Pen, Highlighter, Minus, ArrowRight, Square, Circle,
  Type, Eraser, MousePointer2, Undo2, Redo2, Trash2,
  Download, ZoomIn, ZoomOut, Maximize2, Grid3x3, Copy,
  Image, Layers, ChevronDown, Move, RotateCcw,
} from 'lucide-react'

// ============================================================
// Types
// ============================================================

export type WBTool =
  | 'pen'
  | 'highlighter'
  | 'line'
  | 'arrow'
  | 'rectangle'
  | 'ellipse'
  | 'text'
  | 'eraser'
  | 'select'
  | 'measure'

export type BackgroundType = 'blank' | 'dot-grid' | 'line-grid' | 'graph-paper'

interface WBPoint {
  x: number
  y: number
  pressure?: number
  timestamp?: number
}

interface WBDrawOp {
  id: string
  layerId: string
  tool: WBTool
  points: WBPoint[]
  color: string
  fillColor?: string
  strokeWidth: number
  opacity: number
  fontSize?: number
  fontWeight?: string
  fontFamily?: string
  textAlign?: CanvasTextAlign
  textContent?: string
  smoothing?: boolean
  arrowStyle?: 'filled' | 'hollow'
}

interface WBLayer {
  id: string
  name: string
  visible: boolean
  locked: boolean
  order: number
  operations: WBDrawOp[]
}

interface WBSelection {
  opId: string
  layerId: string
  bounds: { x: number; y: number; w: number; h: number }
}

interface WBVersion {
  timestamp: number
  layers: WBLayer[]
  label: string
}

interface WBTransform {
  zoom: number
  panX: number
  panY: number
}

interface WBTextPlacement {
  x: number
  y: number
  visible: boolean
  opId?: string
}

interface WBMeasurement {
  p1: WBPoint | null
  p2: WBPoint | null
  distance: number
}

interface WBCollabCursor {
  id: string
  name: string
  color: string
  x: number
  y: number
}

// ============================================================
// Constants
// ============================================================

const STORAGE_KEY = 'vl-whiteboard-state'
const MAX_HISTORY = 50
const MIN_ZOOM = 0.25
const MAX_ZOOM = 4
const ZOOM_STEP = 0.15
const GRID_DOT_SIZE = 20
const GRID_LINE_SIZE = 30
const GRID_GRAPH_MAJOR = 100
const GRID_GRAPH_MINOR = 20
const LAYER_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6',
  '#ef4444', '#ec4899', '#06b6d4', '#84cc16',
]

const PRESET_COLORS = [
  '#000000', '#374151', '#6b7280', '#ef4444',
  '#f59e0b', '#eab308', '#22c55e', '#10b981',
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899',
]

const STROKE_WIDTHS = [1, 2, 4, 8, 16]
const FONT_SIZES = [12, 16, 20, 28, 36]
const VERSION_INTERVAL = 30_000 // 30s

const DEFAULT_LAYERS: WBLayer[] = [
  { id: 'layer-bg', name: 'Background', visible: true, locked: false, order: 0, operations: [] },
  { id: 'layer-draw', name: 'Drawing', visible: true, locked: false, order: 1, operations: [] },
  { id: 'layer-annotate', name: 'Annotations', visible: true, locked: false, order: 2, operations: [] },
  { id: 'layer-ui', name: 'UI Overlay', visible: true, locked: false, order: 3, operations: [] },
]

// ============================================================
// Helpers
// ============================================================

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function dist(a: WBPoint, b: WBPoint): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

function speed(a: WBPoint, b: WBPoint, dt: number): number {
  if (dt === 0) return 0
  return dist(a, b) / dt
}

/** Catmull-Rom spline interpolation for smoothing freehand paths */
function catmullRomSmooth(points: WBPoint[], segments: number = 4): WBPoint[] {
  if (points.length < 3) return points
  const result: WBPoint[] = []
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[Math.min(points.length - 1, i + 1)]
    const p3 = points[Math.min(points.length - 1, i + 2)]
    for (let s = 0; s < segments; s++) {
      const t = s / segments
      const t2 = t * t
      const t3 = t2 * t
      result.push({
        x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
        timestamp: p1.timestamp,
        pressure: p1.pressure,
      })
    }
  }
  result.push(points[points.length - 1])
  return result
}

function computeBounds(pts: WBPoint[]): { x: number; y: number; w: number; h: number } {
  if (pts.length === 0) return { x: 0, y: 0, w: 0, h: 0 }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of pts) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

/** Simulated pressure based on speed — slower = thicker */
function simulatePressure(pts: WBPoint[]): WBPoint[] {
  if (pts.length < 2) return pts
  const result: WBPoint[] = [pts[0]]
  let cumulativeSpeed = 0
  let count = 0
  for (let i = 1; i < pts.length; i++) {
    const dt = (pts[i].timestamp ?? 0) - (pts[i - 1].timestamp ?? 0)
    const spd = speed(pts[i - 1], pts[i], dt || 16)
    cumulativeSpeed += spd
    count++
    // Map speed to pressure: slow = high pressure (thick), fast = low (thin)
    const avgSpeed = cumulativeSpeed / count
    const pressure = Math.max(0.2, Math.min(1.0, 1.0 - avgSpeed / 8))
    result.push({ ...pts[i], pressure })
  }
  return result
}

// ============================================================
// Canvas Drawing Functions
// ============================================================

function drawGrid(ctx: CanvasRenderingContext2D, bg: BackgroundType, w: number, h: number, zoom: number, panX: number, panY: number, themeIsDark: boolean) {
  const gridColor = themeIsDark ? 'rgba(51,65,85,0.4)' : 'rgba(0,0,0,0.08)'
  const gridColorMinor = themeIsDark ? 'rgba(51,65,85,0.2)' : 'rgba(0,0,0,0.04)'
  const offX = -panX / zoom
  const offY = -panY / zoom
  const viewW = w / zoom
  const viewH = h / zoom

  if (bg === 'dot-grid') {
    ctx.fillStyle = gridColor
    const size = GRID_DOT_SIZE
    const startX = Math.floor(offX / size) * size
    const startY = Math.floor(offY / size) * size
    for (let x = startX; x < offX + viewW; x += size) {
      for (let y = startY; y < offY + viewH; y += size) {
        ctx.beginPath()
        ctx.arc(x, y, 1.2, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  } else if (bg === 'line-grid') {
    const size = GRID_LINE_SIZE
    ctx.strokeStyle = gridColor
    ctx.lineWidth = 0.5 / zoom
    const startX = Math.floor(offX / size) * size
    const startY = Math.floor(offY / size) * size
    for (let x = startX; x < offX + viewW + size; x += size) {
      ctx.beginPath()
      ctx.moveTo(x, offY)
      ctx.lineTo(x, offY + viewH)
      ctx.stroke()
    }
    for (let y = startY; y < offY + viewH + size; y += size) {
      ctx.beginPath()
      ctx.moveTo(offX, y)
      ctx.lineTo(offX + viewW, y)
      ctx.stroke()
    }
  } else if (bg === 'graph-paper') {
    // Minor grid
    const minorSize = GRID_GRAPH_MINOR
    ctx.strokeStyle = gridColorMinor
    ctx.lineWidth = 0.3 / zoom
    const startMinorX = Math.floor(offX / minorSize) * minorSize
    const startMinorY = Math.floor(offY / minorSize) * minorSize
    for (let x = startMinorX; x < offX + viewW + minorSize; x += minorSize) {
      ctx.beginPath()
      ctx.moveTo(x, offY)
      ctx.lineTo(x, offY + viewH)
      ctx.stroke()
    }
    for (let y = startMinorY; y < offY + viewH + minorSize; y += minorSize) {
      ctx.beginPath()
      ctx.moveTo(offX, y)
      ctx.lineTo(offX + viewW, y)
      ctx.stroke()
    }
    // Major grid
    const majorSize = GRID_GRAPH_MAJOR
    ctx.strokeStyle = gridColor
    ctx.lineWidth = 0.8 / zoom
    const startMajorX = Math.floor(offX / majorSize) * majorSize
    const startMajorY = Math.floor(offY / majorSize) * majorSize
    for (let x = startMajorX; x < offX + viewW + majorSize; x += majorSize) {
      ctx.beginPath()
      ctx.moveTo(x, offY)
      ctx.lineTo(x, offY + viewH)
      ctx.stroke()
    }
    for (let y = startMajorY; y < offY + viewH + majorSize; y += majorSize) {
      ctx.beginPath()
      ctx.moveTo(offX, y)
      ctx.lineTo(offX + viewW, y)
      ctx.stroke()
    }
  }
}

function drawOpOnCtx(ctx: CanvasRenderingContext2D, op: WBDrawOp, isDark: boolean) {
  ctx.save()
  ctx.globalAlpha = op.opacity

  const bgColor = isDark ? '#020617' : '#ffffff'

  if (op.tool === 'eraser') {
    ctx.strokeStyle = bgColor
    ctx.globalCompositeOperation = 'destination-out'
  } else {
    ctx.strokeStyle = op.color
  }

  ctx.fillStyle = op.fillColor || op.color
  ctx.lineWidth = op.strokeWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  const pts = op.points
  if (pts.length === 0) { ctx.restore(); return }

  switch (op.tool) {
    case 'pen':
    case 'highlighter':
    case 'eraser': {
      if (pts.length < 2) { ctx.restore(); return }

      if (op.tool === 'highlighter') {
        ctx.globalAlpha = Math.min(op.opacity, 0.35)
        ctx.lineWidth = op.strokeWidth * 3
        ctx.lineCap = 'square'
      }

      // Use pressure for variable width if available
      const hasPressure = pts.some(p => p.pressure != null && p.pressure !== 1)
      if (hasPressure && pts.length >= 2) {
        for (let i = 1; i < pts.length; i++) {
          const p = pts[i].pressure ?? 0.5
          ctx.lineWidth = Math.max(0.5, op.strokeWidth * p * 2)
          ctx.beginPath()
          ctx.moveTo(pts[i - 1].x, pts[i - 1].y)
          ctx.lineTo(pts[i].x, pts[i].y)
          ctx.stroke()
        }
      } else {
        // Smooth quadratic bezier
        ctx.beginPath()
        ctx.moveTo(pts[0].x, pts[0].y)
        for (let i = 1; i < pts.length - 1; i++) {
          const mid = { x: (pts[i].x + pts[i + 1].x) / 2, y: (pts[i].y + pts[i + 1].y) / 2 }
          ctx.quadraticCurveTo(pts[i].x, pts[i].y, mid.x, mid.y)
        }
        if (pts.length > 1) {
          ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
        }
        ctx.stroke()
      }
      break
    }
    case 'line': {
      if (pts.length < 2) { ctx.restore(); return }
      ctx.beginPath()
      ctx.moveTo(pts[0].x, pts[0].y)
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
      ctx.stroke()
      break
    }
    case 'arrow': {
      if (pts.length < 2) { ctx.restore(); return }
      const start = pts[0]
      const end = pts[pts.length - 1]
      const angle = Math.atan2(end.y - start.y, end.x - start.x)
      const headLen = Math.max(14, op.strokeWidth * 4)
      const headAngle = Math.PI / 7

      ctx.beginPath()
      ctx.moveTo(start.x, start.y)
      ctx.lineTo(end.x, end.y)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(end.x, end.y)
      ctx.lineTo(end.x - headLen * Math.cos(angle - headAngle), end.y - headLen * Math.sin(angle - headAngle))
      ctx.lineTo(end.x - headLen * Math.cos(angle + headAngle), end.y - headLen * Math.sin(angle + headAngle))
      ctx.closePath()

      if (op.arrowStyle === 'filled') {
        ctx.fill()
      } else {
        ctx.stroke()
      }
      break
    }
    case 'rectangle': {
      if (pts.length < 2) { ctx.restore(); return }
      const b = computeBounds(pts)
      if (op.fillColor && op.fillColor !== 'transparent') {
        ctx.fillRect(b.x, b.y, b.w, b.h)
      }
      ctx.strokeRect(b.x, b.y, b.w, b.h)
      break
    }
    case 'ellipse': {
      if (pts.length < 2) { ctx.restore(); return }
      const cx = (pts[0].x + pts[pts.length - 1].x) / 2
      const cy = (pts[0].y + pts[pts.length - 1].y) / 2
      const rx = Math.max(1, Math.abs(pts[pts.length - 1].x - pts[0].x) / 2)
      const ry = Math.max(1, Math.abs(pts[pts.length - 1].y - pts[0].y) / 2)
      ctx.beginPath()
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
      if (op.fillColor && op.fillColor !== 'transparent') ctx.fill()
      ctx.stroke()
      break
    }
    case 'text': {
      if (!op.textContent || pts.length === 0) { ctx.restore(); return }
      const fs = op.fontSize || 16
      ctx.font = `${op.fontWeight || 'normal'} ${fs}px ${op.fontFamily || 'system-ui, sans-serif'}`
      ctx.textAlign = op.textAlign || 'left'
      ctx.textBaseline = 'top'
      ctx.fillText(op.textContent, pts[0].x, pts[0].y)
      break
    }
    case 'measure': {
      // Measurement lines are drawn by the measurement helper
      break
    }
    default:
      break
  }

  ctx.restore()
}

// ============================================================
// Component Props
// ============================================================

export interface InteractiveWhiteboardProps {
  /** Whiteboard ID for localStorage key */
  canvasId?: string
  /** Language code */
  lang?: string
  /** Initial layers (overrides localStorage) */
  initialLayers?: WBLayer[]
  /** Additional class */
  className?: string
  /** Whether to show collab overlay */
  showCollabCursors?: boolean
  /** Callback for state change */
  onStateChange?: (layers: WBLayer[]) => void
  /** Read-only mode */
  readOnly?: boolean
  /** Dark theme override */
  isDark?: boolean
}

// ============================================================
// Component
// ============================================================

export function InteractiveWhiteboard({
  canvasId = 'interactive',
  lang = 'en',
  initialLayers,
  className = '',
  showCollabCursors = false,
  onStateChange,
  readOnly = false,
  isDark = false,
}: InteractiveWhiteboardProps) {
  // ── Refs ──────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null)
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null)
  const uiCanvasRef = useRef<HTMLCanvasElement>(null)
  const bgCanvasRef = useRef<HTMLCanvasElement>(null)
  const minimapCanvasRef = useRef<HTMLCanvasElement>(null)
  const textInputRef = useRef<HTMLTextAreaElement>(null)
  const colorInputRef = useRef<HTMLInputElement>(null)

  const layersRef = useRef<WBLayer[]>(DEFAULT_LAYERS)
  const activeLayerIdRef = useRef('layer-draw')
  const zoomRef = useRef(1)
  const panXRef = useRef(0)
  const panYRef = useRef(0)
  const toolRef = useRef<WBTool>('pen')
  const colorRef = useRef('#000000')
  const fillColorRef = useRef('')
  const strokeWidthRef = useRef(2)
  const opacityRef = useRef(1)
  const fontSizeRef = useRef(16)
  const fontWeightRef = useRef('normal')
  const fontFamilyRef = useRef('system-ui, sans-serif')
  const textAlignRef = useRef<CanvasTextAlign>('left')
  const smoothingRef = useRef(true)
  const arrowStyleRef = useRef<'filled' | 'hollow'>('filled')
  const fillEnabledRef = useRef(false)
  const bgRef = useRef<BackgroundType>('line-grid')
  const isDarkRef = useRef(isDark)
  const drawingRef = useRef(false)
  const panningRef = useRef(false)
  const panStartRef = useRef({ x: 0, y: 0 })
  const panOffsetRef = useRef({ x: 0, y: 0 })
  const currentPointsRef = useRef<WBPoint[]>([])
  const undoStackRef = useRef<WBLayer[][]>([])
  const redoStackRef = useRef<WBLayer[][]>([])
  const selectionRef = useRef<WBSelection | null>(null)
  const draggingSelectionRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const originalOpRef = useRef<WBDrawOp | null>(null)
  const spaceHeldRef = useRef(false)
  const pinchRef = useRef({ active: false, dist: 0, zoom: 1 })
  const containerSizeRef = useRef({ w: 800, h: 600 })
  const measureRef = useRef<WBMeasurement>({ p1: null, p2: null, distance: 0 })
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const versionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── State ─────────────────────────────────────────────
  const [mounted, setMounted] = useState(false)
  const [layers, setLayers] = useState<WBLayer[]>(DEFAULT_LAYERS)
  const [activeLayerId, setActiveLayerId] = useState('layer-draw')
  const [activeTool, setActiveTool] = useState<WBTool>('pen')
  const [color, setColor] = useState('#000000')
  const [fillColor, setFillColor] = useState('')
  const [strokeWidth, setStrokeWidth] = useState(2)
  const [opacity, setOpacity] = useState(1)
  const [fontSize, setFontSize] = useState(16)
  const [fontWeight, setFontWeight] = useState('normal')
  const [textAlign, setTextAlign] = useState<CanvasTextAlign>('left')
  const [smoothing, setSmoothing] = useState(true)
  const [arrowStyle, setArrowStyle] = useState<'filled' | 'hollow'>('filled')
  const [fillEnabled, setFillEnabled] = useState(false)
  const [bgType, setBgType] = useState<BackgroundType>('line-grid')
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [isPanning, setIsPanning] = useState(false)
  const [textPlacement, setTextPlacement] = useState<WBTextPlacement>({ x: 0, y: 0, visible: false })
  const [textValue, setTextValue] = useState('')
  const [selection, setSelection] = useState<WBSelection | null>(null)
  const [showMinimap, setShowMinimap] = useState(true)
  const [showLayerPanel, setShowLayerPanel] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [measurement, setMeasurement] = useState<WBMeasurement>({ p1: null, p2: null, distance: 0 })
  const [undoCount, setUndoCount] = useState(0)
  const [redoCount, setRedoCount] = useState(0)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [optionsPanelTool, setOptionsPanelTool] = useState<WBTool | null>(null)
  const [collabCursors, setCollabCursors] = useState<WBCollabCursor[]>([])
  const [versionHistory, setVersionHistory] = useState<WBVersion[]>([])
  const [versionIndex, setVersionIndex] = useState(-1)
  const [showVersionSlider, setShowVersionSlider] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // ── Sync refs ─────────────────────────────────────────
  useEffect(() => { layersRef.current = layers }, [layers])
  useEffect(() => { activeLayerIdRef.current = activeLayerId }, [activeLayerId])
  useEffect(() => { zoomRef.current = zoom }, [zoom])
  useEffect(() => { panXRef.current = panX }, [panX])
  useEffect(() => { panYRef.current = panY }, [panY])
  useEffect(() => { toolRef.current = activeTool }, [activeTool])
  useEffect(() => { colorRef.current = color }, [color])
  useEffect(() => { fillColorRef.current = fillColor }, [fillColor])
  useEffect(() => { strokeWidthRef.current = strokeWidth }, [strokeWidth])
  useEffect(() => { opacityRef.current = opacity }, [opacity])
  useEffect(() => { fontSizeRef.current = fontSize }, [fontSize])
  useEffect(() => { fontWeightRef.current = fontWeight }, [fontWeight])
  useEffect(() => { textAlignRef.current = textAlign }, [textAlign])
  useEffect(() => { smoothingRef.current = smoothing }, [smoothing])
  useEffect(() => { arrowStyleRef.current = arrowStyle }, [arrowStyle])
  useEffect(() => { fillEnabledRef.current = fillEnabled }, [fillEnabled])
  useEffect(() => { bgRef.current = bgType }, [bgType])
  useEffect(() => { isDarkRef.current = isDark }, [isDark])
  useEffect(() => { undoCount }, [undoCount])
  useEffect(() => { redoCount }, [redoCount])

  // ── Mount / Hydration ─────────────────────────────────
  useEffect(() => {
    requestAnimationFrame(() => setMounted(true))
  }, [])

  useEffect(() => {
    if (!mounted) return

    // Detect mobile
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)

    // Load from localStorage
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY}-${canvasId}`)
      if (raw && !initialLayers) {
        const saved = JSON.parse(raw)
        if (saved?.layers && Array.isArray(saved.layers)) {
          setLayers(saved.layers)
          layersRef.current = saved.layers
        }
      }
    } catch { /* ignore corrupt state */ }

    if (initialLayers) {
      setLayers(initialLayers)
      layersRef.current = initialLayers
    }

    // Auto-save every 5s
    autoSaveTimerRef.current = setInterval(() => {
      try {
        localStorage.setItem(`${STORAGE_KEY}-${canvasId}`, JSON.stringify({
          layers: layersRef.current.slice(-MAX_HISTORY),
          savedAt: Date.now(),
        }))
      } catch { /* quota exceeded */ }
    }, 5000)

    // Version history every 30s
    versionTimerRef.current = setInterval(() => {
      setVersionHistory(prev => {
        const snapshot: WBVersion = {
          timestamp: Date.now(),
          layers: JSON.parse(JSON.stringify(layersRef.current)),
          label: new Date().toLocaleTimeString(),
        }
        const next = [...prev, snapshot].slice(-20)
        return next
      })
    }, VERSION_INTERVAL)

    // Simulated collab cursors
    if (showCollabCursors) {
      const names = ['Alice', 'Bob', 'Carol']
      const colors = ['#3b82f6', '#ef4444', '#f59e0b']
      const interval = setInterval(() => {
        setCollabCursors(prev => names.map((name, i) => ({
          id: name.toLowerCase(),
          name,
          color: colors[i],
          x: 100 + Math.sin(Date.now() / 3000 + i * 2) * 200 + i * 100,
          y: 100 + Math.cos(Date.now() / 4000 + i * 3) * 150 + i * 50,
        })))
      }, 500)
      return () => {
        clearInterval(interval)
        window.removeEventListener('resize', checkMobile)
        if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current)
        if (versionTimerRef.current) clearInterval(versionTimerRef.current)
      }
    }

    return () => {
      window.removeEventListener('resize', checkMobile)
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current)
      if (versionTimerRef.current) clearInterval(versionTimerRef.current)
    }
  }, [mounted, canvasId, initialLayers, showCollabCursors])

  // ── Resize ────────────────────────────────────────────
  const resizeCanvases = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    containerSizeRef.current = { w: rect.width, h: rect.height }
    const canvases = [drawingCanvasRef.current, uiCanvasRef.current, bgCanvasRef.current]
    for (const canvas of canvases) {
      if (!canvas) continue
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
    }
  }, [])

  useEffect(() => {
    if (!mounted) return
    resizeCanvases()
    window.addEventListener('resize', resizeCanvases)
    return () => window.removeEventListener('resize', resizeCanvases)
  }, [mounted, resizeCanvases])

  // ── Redraw ────────────────────────────────────────────
  const redraw = useCallback(() => {
    const bgCanvas = bgCanvasRef.current
    const drawCanvas = drawingCanvasRef.current
    const uiCanvas = uiCanvasRef.current
    if (!bgCanvas || !drawCanvas || !uiCanvas) return
    const dpr = window.devicePixelRatio || 1
    const w = containerSizeRef.current.w
    const h = containerSizeRef.current.h

    // Background canvas
    const bgCtx = bgCanvas.getContext('2d')
    if (bgCtx) {
      bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
      bgCtx.fillStyle = isDarkRef.current ? '#0f172a' : '#ffffff'
      bgCtx.fillRect(0, 0, w, h)
      if (bgRef.current !== 'blank') {
        bgCtx.save()
        bgCtx.translate(panXRef.current, panYRef.current)
        bgCtx.scale(zoomRef.current, zoomRef.current)
        drawGrid(bgCtx, bgRef.current, w, h, zoomRef.current, panXRef.current, panYRef.current, isDarkRef.current)
        bgCtx.restore()
      }
    }

    // Drawing canvas
    const drawCtx = drawCanvas.getContext('2d')
    if (drawCtx) {
      drawCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
      drawCtx.clearRect(0, 0, w, h)
      drawCtx.save()
      drawCtx.translate(panXRef.current, panYRef.current)
      drawCtx.scale(zoomRef.current, zoomRef.current)

      for (const layer of layersRef.current) {
        if (!layer.visible) continue
        for (const op of layer.operations) {
          drawOpOnCtx(drawCtx, op, isDarkRef.current)
        }
      }

      // Current in-progress operation
      const pts = currentPointsRef.current
      if (pts.length > 0) {
        const currentOp: WBDrawOp = {
          id: 'current',
          layerId: activeLayerIdRef.current,
          tool: toolRef.current,
          points: pts,
          color: colorRef.current,
          fillColor: fillEnabledRef.current ? fillColorRef.current : undefined,
          strokeWidth: strokeWidthRef.current,
          opacity: opacityRef.current,
          fontSize: fontSizeRef.current,
          fontWeight: fontWeightRef.current,
          fontFamily: fontFamilyRef.current,
          textAlign: textAlignRef.current,
          smoothing: smoothingRef.current,
          arrowStyle: arrowStyleRef.current,
        }
        drawOpOnCtx(drawCtx, currentOp, isDarkRef.current)
      }

      // Measurement visualization
      const m = measureRef.current
      if (m.p1 && m.p2) {
        drawCtx.save()
        drawCtx.strokeStyle = '#f59e0b'
        drawCtx.lineWidth = 2
        drawCtx.setLineDash([6, 4])
        drawCtx.beginPath()
        drawCtx.moveTo(m.p1.x, m.p1.y)
        drawCtx.lineTo(m.p2.x, m.p2.y)
        drawCtx.stroke()
        drawCtx.setLineDash([])
        // End dots
        for (const pt of [m.p1, m.p2]) {
          drawCtx.beginPath()
          drawCtx.arc(pt.x, pt.y, 4, 0, Math.PI * 2)
          drawCtx.fillStyle = '#f59e0b'
          drawCtx.fill()
        }
        drawCtx.restore()
      }

      drawCtx.restore()
    }

    // UI canvas (selection handles)
    const uiCtx = uiCanvas.getContext('2d')
    if (uiCtx) {
      uiCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
      uiCtx.clearRect(0, 0, w, h)
      const sel = selectionRef.current
      if (sel) {
        uiCtx.save()
        uiCtx.translate(panXRef.current, panYRef.current)
        uiCtx.scale(zoomRef.current, zoomRef.current)
        uiCtx.strokeStyle = '#10b981'
        uiCtx.lineWidth = 1.5 / zoomRef.current
        uiCtx.setLineDash([4 / zoomRef.current, 4 / zoomRef.current])
        uiCtx.strokeRect(sel.bounds.x, sel.bounds.y, sel.bounds.w, sel.bounds.h)
        uiCtx.setLineDash([])
        // Corner handles
        const hs = 5 / zoomRef.current
        const corners = [
          [sel.bounds.x, sel.bounds.y],
          [sel.bounds.x + sel.bounds.w, sel.bounds.y],
          [sel.bounds.x, sel.bounds.y + sel.bounds.h],
          [sel.bounds.x + sel.bounds.w, sel.bounds.y + sel.bounds.h],
        ]
        uiCtx.fillStyle = '#ffffff'
        uiCtx.strokeStyle = '#10b981'
        uiCtx.lineWidth = 1.5 / zoomRef.current
        for (const [cx, cy] of corners) {
          uiCtx.fillRect(cx - hs, cy - hs, hs * 2, hs * 2)
          uiCtx.strokeRect(cx - hs, cy - hs, hs * 2, hs * 2)
        }
        uiCtx.restore()
      }
    }

    // Minimap
    const mmCanvas = minimapCanvasRef.current
    if (mmCanvas) {
      const mmW = mmCanvas.clientWidth
      const mmH = mmCanvas.clientHeight
      mmCanvas.width = mmW * dpr
      mmCanvas.height = mmH * dpr
      const mmCtx = mmCanvas.getContext('2d')
      if (mmCtx) {
        mmCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
        mmCtx.fillStyle = isDarkRef.current ? '#1e293b' : '#f8fafc'
        mmCtx.fillRect(0, 0, mmW, mmH)
        // Simplified drawing
        const scale = Math.min(mmW / (w / zoomRef.current), mmH / (h / zoomRef.current)) * 0.8
        const offsetX = (mmW - (w / zoomRef.current) * scale) / 2
        const offsetY = (mmH - (h / zoomRef.current) * scale) / 2
        mmCtx.save()
        mmCtx.translate(offsetX, offsetY)
        mmCtx.scale(scale * zoomRef.current, scale * zoomRef.current)
        for (const layer of layersRef.current) {
          if (!layer.visible) continue
          for (const op of layer.operations) {
            drawOpOnCtx(mmCtx, op, isDarkRef.current)
          }
        }
        mmCtx.restore()
        // Viewport rect
        const vpX = offsetX + (-panXRef.current / zoomRef.current) * scale
        const vpY = offsetY + (-panYRef.current / zoomRef.current) * scale
        const vpW = (w / zoomRef.current) * scale
        const vpH = (h / zoomRef.current) * scale
        mmCtx.strokeStyle = '#10b981'
        mmCtx.lineWidth = 1.5
        mmCtx.strokeRect(vpX, vpY, vpW, vpH)
        mmCtx.fillStyle = 'rgba(16, 185, 129, 0.06)'
        mmCtx.fillRect(vpX, vpY, vpW, vpH)
      }
    }
  }, [])

  // Trigger redraw on state changes
  useEffect(() => {
    if (!mounted) return
    redraw()
  }, [
    mounted, layers, activeTool, color, fillColor, strokeWidth, opacity,
    fontSize, fontWeight, textAlign, smoothing, arrowStyle, fillEnabled,
    bgType, zoom, panX, panY, isPanning, selection, measurement,
    textPlacement, showCollabCursors, collabCursors, redraw,
  ])

  // ── Coordinate Helpers ────────────────────────────────
  const getCanvasPoint = useCallback((e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent): WBPoint | null => {
    const canvas = drawingCanvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    let clientX: number
    let clientY: number
    if ('touches' in e) {
      if (e.touches.length === 0) return null
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }
    return {
      x: (clientX - rect.left - panXRef.current) / zoomRef.current,
      y: (clientY - rect.top - panYRef.current) / zoomRef.current,
      timestamp: Date.now(),
    }
  }, [])

  // ── Layer Helpers ─────────────────────────────────────
  const addLayer = useCallback(() => {
    setLayers(prev => {
      const newLayer: WBLayer = {
        id: `layer-${uid()}`,
        name: `Layer ${prev.length + 1}`,
        visible: true,
        locked: false,
        order: prev.length,
        operations: [],
      }
      return [...prev, newLayer]
    })
  }, [])

  const removeLayer = useCallback((id: string) => {
    setLayers(prev => prev.filter(l => l.id !== id))
    if (activeLayerId === id) {
      setActiveLayerId('layer-draw')
      activeLayerIdRef.current = 'layer-draw'
    }
  }, [activeLayerId])

  const toggleLayerVisibility = useCallback((id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l))
  }, [])

  const renameLayer = useCallback((id: string, name: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, name } : l))
  }, [])

  const reorderLayer = useCallback((fromIdx: number, toIdx: number) => {
    setLayers(prev => {
      const arr = [...prev]
      const [moved] = arr.splice(fromIdx, 1)
      arr.splice(toIdx, 0, moved)
      return arr.map((l, i) => ({ ...l, order: i }))
    })
  }, [])

  const pushUndo = useCallback(() => {
    undoStackRef.current = [...undoStackRef.current, JSON.parse(JSON.stringify(layersRef.current))].slice(-MAX_HISTORY)
    setUndoCount(undoStackRef.current.length)
  }, [])

  const undo = useCallback(() => {
    if (undoStackRef.current.length === 0) return
    redoStackRef.current = [...redoStackRef.current, JSON.parse(JSON.stringify(layersRef.current))]
    setRedoCount(redoStackRef.current.length)
    const prev = undoStackRef.current.pop()!
    setLayers(prev)
    layersRef.current = prev
    setUndoCount(undoStackRef.current.length)
    if (onStateChange) onStateChange(prev)
  }, [onStateChange])

  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) return
    undoStackRef.current = [...undoStackRef.current, JSON.parse(JSON.stringify(layersRef.current))]
    setUndoCount(undoStackRef.current.length)
    const next = redoStackRef.current.pop()!
    setLayers(next)
    layersRef.current = next
    setRedoCount(redoStackRef.current.length)
    if (onStateChange) onStateChange(next)
  }, [onStateChange])

  const clearLayer = useCallback((layerId: string) => {
    pushUndo()
    setLayers(prev => prev.map(l => l.id === layerId ? { ...l, operations: [] } : l))
  }, [pushUndo])

  const clearAll = useCallback(() => {
    pushUndo()
    setLayers(prev => prev.map(l => ({ ...l, operations: [] })))
    setConfirmClear(false)
    selectionRef.current = null
    setSelection(null)
  }, [pushUndo])

  // ── Pointer Events ────────────────────────────────────
  const handlePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (readOnly) return
    // Middle click or space+click → pan
    const isMiddleClick = 'button' in e && e.button === 1
    if (isMiddleClick || spaceHeldRef.current) {
      panningRef.current = true
      setIsPanning(true)
      const cx = 'clientX' in e ? e.clientX : (e.touches?.[0]?.clientX ?? 0)
      const cy = 'clientY' in e ? e.clientY : (e.touches?.[0]?.clientY ?? 0)
      panStartRef.current = { x: cx, y: cy }
      panOffsetRef.current = { x: panXRef.current, y: panYRef.current }
      return
    }

    // Pinch zoom (two fingers)
    if ('touches' in e && e.touches.length === 2) {
      const dx = e.touches[1].clientX - e.touches[0].clientX
      const dy = e.touches[1].clientY - e.touches[0].clientY
      pinchRef.current = {
        active: true,
        dist: Math.sqrt(dx * dx + dy * dy),
        zoom: zoomRef.current,
      }
      return
    }

    const pt = getCanvasPoint(e)
    if (!pt) return

    const currentTool = toolRef.current

    // Measure tool
    if (currentTool === 'measure') {
      const m = measureRef.current
      if (!m.p1) {
        measureRef.current = { p1: pt, p2: null, distance: 0 }
        setMeasurement({ p1: pt, p2: null, distance: 0 })
      } else {
        const newDist = dist(m.p1, pt)
        measureRef.current = { p1: m.p1, p2: pt, distance: newDist }
        setMeasurement({ p1: m.p1, p2: pt, distance: newDist })
      }
      return
    }

    // Select tool
    if (currentTool === 'select') {
      // Check if we're on a selection handle first
      // Otherwise deselect
      pushUndo()
      const activeLayer = layersRef.current.find(l => l.id === activeLayerIdRef.current)
      if (activeLayer) {
        const found = activeLayer.operations.find(op => {
          if (op.points.length < 2) return false
          const b = computeBounds(op.points)
          const margin = 8 / zoomRef.current
          return pt.x >= b.x - margin && pt.x <= b.x + b.w + margin &&
                 pt.y >= b.y - margin && pt.y <= b.y + b.h + margin
        })
        if (found) {
          const bounds = computeBounds(found.points)
          const sel: WBSelection = {
            opId: found.id,
            layerId: activeLayerIdRef.current,
            bounds,
          }
          selectionRef.current = sel
          setSelection(sel)
          originalOpRef.current = found
          draggingSelectionRef.current = true
          dragStartRef.current = { x: pt.x, y: pt.y }
          return
        }
      }
      selectionRef.current = null
      setSelection(null)
      return
    }

    // Text tool
    if (currentTool === 'text') {
      if (textPlacement.visible) return
      setTextPlacement({ x: pt.x, y: pt.y, visible: true })
      setTextValue('')
      setTimeout(() => textInputRef.current?.focus(), 50)
      return
    }

    // Drawing tools
    drawingRef.current = true
    currentPointsRef.current = [pt]
    redraw()
  }, [readOnly, getCanvasPoint, textPlacement, pushUndo, redraw])

  const handlePointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    // Panning
    if (panningRef.current) {
      const cx = 'clientX' in e ? e.clientX : (e.touches?.[0]?.clientX ?? 0)
      const cy = 'clientY' in e ? e.clientY : (e.touches?.[0]?.clientY ?? 0)
      const dx = cx - panStartRef.current.x
      const dy = cy - panStartRef.current.y
      const newPanX = panOffsetRef.current.x + dx
      const newPanY = panOffsetRef.current.y + dy
      setPanX(newPanX)
      setPanY(newPanY)
      panXRef.current = newPanX
      panYRef.current = newPanY
      return
    }

    // Pinch zoom
    if (pinchRef.current.active && 'touches' in e && e.touches.length === 2) {
      const dx = e.touches[1].clientX - e.touches[0].clientX
      const dy = e.touches[1].clientY - e.touches[0].clientY
      const newDist = Math.sqrt(dx * dx + dy * dy)
      const scale = newDist / pinchRef.current.dist
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pinchRef.current.zoom * scale))
      setZoom(newZoom)
      zoomRef.current = newZoom
      pinchRef.current.dist = newDist
      redraw()
      return
    }

    if (!drawingRef.current) return

    const pt = getCanvasPoint(e)
    if (!pt) return

    // Dragging selection
    if (draggingSelectionRef.current && selectionRef.current && originalOpRef.current) {
      const dx = pt.x - dragStartRef.current.x
      const dy = pt.y - dragStartRef.current.y
      const layerId = selectionRef.current.layerId
      const opId = selectionRef.current.opId
      setLayers(prev => prev.map(l => {
        if (l.id !== layerId) return l
        return {
          ...l,
          operations: l.operations.map(op => {
            if (op.id !== opId) return op
            const moved = { ...op, points: op.points.map(p => ({ ...p, x: p.x + dx, y: p.y + dy })) }
            originalOpRef.current = moved
            return moved
          }),
        }
      }))
      dragStartRef.current = { x: pt.x, y: pt.y }
      const bounds = computeBounds(originalOpRef.current.points)
      selectionRef.current = { ...selectionRef.current, bounds }
      setSelection(selectionRef.current)
      return
    }

    currentPointsRef.current = [...currentPointsRef.current, pt]
    redraw()
  }, [getCanvasPoint, redraw])

  const handlePointerUp = useCallback(() => {
    if (panningRef.current) {
      panningRef.current = false
      setIsPanning(false)
      return
    }

    if (pinchRef.current.active) {
      pinchRef.current.active = false
      return
    }

    if (draggingSelectionRef.current) {
      draggingSelectionRef.current = false
      originalOpRef.current = null
      return
    }

    if (!drawingRef.current) return
    drawingRef.current = false

    const pts = currentPointsRef.current
    if (pts.length < 2) {
      currentPointsRef.current = []
      return
    }

    let finalPts = pts
    // Apply speed-based pressure simulation
    finalPts = simulatePressure(finalPts)
    // Apply Catmull-Rom smoothing for pen/highlighter
    if (smoothingRef.current && (toolRef.current === 'pen' || toolRef.current === 'highlighter')) {
      finalPts = catmullRomSmooth(finalPts)
    }

    const newOp: WBDrawOp = {
      id: `op-${uid()}`,
      layerId: activeLayerIdRef.current,
      tool: toolRef.current,
      points: finalPts,
      color: colorRef.current,
      fillColor: fillEnabledRef.current ? fillColorRef.current : undefined,
      strokeWidth: strokeWidthRef.current,
      opacity: toolRef.current === 'highlighter' ? Math.min(opacityRef.current, 0.35) : opacityRef.current,
      fontSize: fontSizeRef.current,
      fontWeight: fontWeightRef.current,
      fontFamily: fontFamilyRef.current,
      textAlign: textAlignRef.current,
      smoothing: smoothingRef.current,
      arrowStyle: arrowStyleRef.current,
    }

    pushUndo()
    redoStackRef.current = []
    setRedoCount(0)

    setLayers(prev => prev.map(l => {
      if (l.id !== activeLayerIdRef.current) return l
      return { ...l, operations: [...l.operations, newOp] }
    }))

    currentPointsRef.current = []
  }, [pushUndo])

  // ── Text Submit ────────────────────────────────────────
  const submitText = useCallback(() => {
    if (!textValue.trim()) {
      setTextPlacement(prev => ({ ...prev, visible: false }))
      return
    }
    const newOp: WBDrawOp = {
      id: `op-${uid()}`,
      layerId: activeLayerIdRef.current,
      tool: 'text',
      points: [{ x: textPlacement.x, y: textPlacement.y, timestamp: Date.now() }],
      color: colorRef.current,
      strokeWidth: strokeWidthRef.current,
      opacity: opacityRef.current,
      fontSize: fontSizeRef.current,
      fontWeight: fontWeightRef.current,
      fontFamily: fontFamilyRef.current,
      textAlign: textAlignRef.current,
      textContent: textValue.trim(),
    }
    pushUndo()
    setLayers(prev => prev.map(l => {
      if (l.id !== activeLayerIdRef.current) return l
      return { ...l, operations: [...l.operations, newOp] }
    }))
    setTextPlacement({ x: 0, y: 0, visible: false })
    setTextValue('')
  }, [textValue, textPlacement, fontSize, fontWeight, textAlign, color, strokeWidth, opacity, pushUndo])

  // ── Zoom ──────────────────────────────────────────────
  const zoomTo = useCallback((newZoom: number) => {
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom))
    setZoom(clamped)
    zoomRef.current = clamped
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
    zoomTo(zoomRef.current + delta * zoomRef.current)
  }, [zoomTo])

  const resetView = useCallback(() => {
    setZoom(1)
    setPanX(0)
    setPanY(0)
    zoomRef.current = 1
    panXRef.current = 0
    panYRef.current = 0
  }, [])

  // ── Export ────────────────────────────────────────────
  const exportPng = useCallback(() => {
    const drawCanvas = drawingCanvasRef.current
    const bgCanvas = bgCanvasRef.current
    if (!drawCanvas || !bgCanvas) return
    const merged = document.createElement('canvas')
    merged.width = drawCanvas.width
    merged.height = drawCanvas.height
    const ctx = merged.getContext('2d')
    if (ctx) {
      ctx.drawImage(bgCanvas, 0, 0)
      ctx.drawImage(drawCanvas, 0, 0)
    }
    const link = document.createElement('a')
    link.download = `whiteboard-${canvasId}-${Date.now()}.png`
    link.href = merged.toDataURL('image/png')
    link.click()
    setExportMenuOpen(false)
  }, [canvasId])

  const exportSvg = useCallback(() => {
    // Build SVG from operations
    const w = containerSizeRef.current.w
    const h = containerSizeRef.current.h
    let svgParts = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`
    svgParts += `<rect width="${w}" height="${h}" fill="${isDarkRef.current ? '#0f172a' : '#ffffff'}"/>`
    svgParts += `<g transform="translate(${panXRef.current},${panYRef.current}) scale(${zoomRef.current})">`
    for (const layer of layersRef.current) {
      if (!layer.visible) continue
      for (const op of layer.operations) {
        if (op.tool === 'pen' || op.tool === 'highlighter' || op.tool === 'eraser') {
          if (op.points.length < 2) continue
          let d = `M ${op.points[0].x} ${op.points[0].y}`
          for (let i = 1; i < op.points.length; i++) {
            d += ` L ${op.points[i].x} ${op.points[i].y}`
          }
          svgParts += `<path d="${d}" stroke="${op.color}" stroke-width="${op.strokeWidth}" fill="none" opacity="${op.opacity}" stroke-linecap="round" stroke-linejoin="round"/>`
        } else if (op.tool === 'line') {
          if (op.points.length < 2) continue
          svgParts += `<line x1="${op.points[0].x}" y1="${op.points[0].y}" x2="${op.points[1].x}" y2="${op.points[1].y}" stroke="${op.color}" stroke-width="${op.strokeWidth}" opacity="${op.opacity}"/>`
        } else if (op.tool === 'arrow') {
          if (op.points.length < 2) continue
          const s = op.points[0]; const en = op.points[op.points.length - 1]
          const angle = Math.atan2(en.y - s.y, en.x - s.x)
          const hl = Math.max(14, op.strokeWidth * 4)
          const ha = Math.PI / 7
          svgParts += `<line x1="${s.x}" y1="${s.y}" x2="${en.x}" y2="${en.y}" stroke="${op.color}" stroke-width="${op.strokeWidth}" opacity="${op.opacity}"/>`
          svgParts += `<polygon points="${en.x},${en.y} ${en.x - hl * Math.cos(angle - ha)},${en.y - hl * Math.sin(angle - ha)} ${en.x - hl * Math.cos(angle + ha)},${en.y - hl * Math.sin(angle + ha)}" fill="${op.arrowStyle === 'filled' ? op.color : 'none'}" stroke="${op.color}" stroke-width="${op.strokeWidth * 0.5}" opacity="${op.opacity}"/>`
        } else if (op.tool === 'rectangle') {
          if (op.points.length < 2) continue
          const b = computeBounds(op.points)
          svgParts += `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" stroke="${op.color}" fill="${op.fillColor || 'none'}" stroke-width="${op.strokeWidth}" opacity="${op.opacity}"/>`
        } else if (op.tool === 'ellipse') {
          if (op.points.length < 2) continue
          const cx = (op.points[0].x + op.points[op.points.length - 1].x) / 2
          const cy = (op.points[0].y + op.points[op.points.length - 1].y) / 2
          const rx = Math.abs(op.points[op.points.length - 1].x - op.points[0].x) / 2
          const ry = Math.abs(op.points[op.points.length - 1].y - op.points[0].y) / 2
          svgParts += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" stroke="${op.color}" fill="${op.fillColor || 'none'}" stroke-width="${op.strokeWidth}" opacity="${op.opacity}"/>`
        } else if (op.tool === 'text' && op.textContent) {
          svgParts += `<text x="${op.points[0].x}" y="${op.points[0].y}" fill="${op.color}" font-size="${op.fontSize || 16}" font-weight="${op.fontWeight || 'normal'}" opacity="${op.opacity}">${op.textContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>`
        }
      }
    }
    svgParts += `</g></svg>`
    const blob = new Blob([svgParts], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = `whiteboard-${canvasId}-${Date.now()}.svg`
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
    setExportMenuOpen(false)
  }, [canvasId])

  const copyToClipboard = useCallback(async () => {
    const drawCanvas = drawingCanvasRef.current
    const bgCanvas = bgCanvasRef.current
    if (!drawCanvas || !bgCanvas) return
    const merged = document.createElement('canvas')
    merged.width = drawCanvas.width
    merged.height = drawCanvas.height
    const ctx = merged.getContext('2d')
    if (ctx) {
      ctx.drawImage(bgCanvas, 0, 0)
      ctx.drawImage(drawCanvas, 0, 0)
    }
    try {
      merged.toBlob(async (blob) => {
        if (blob && navigator.clipboard?.write) {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        }
      })
    } catch { /* clipboard not supported */ }
    setExportMenuOpen(false)
  }, [])

  // ── Minimap Click ─────────────────────────────────────
  const handleMinimapClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const mmCanvas = minimapCanvasRef.current
    const container = containerRef.current
    if (!mmCanvas || !container) return
    const mmRect = mmCanvas.getBoundingClientRect()
    const cRect = container.getBoundingClientRect()
    const clickX = e.clientX - mmRect.left
    const clickY = e.clientY - mmRect.top
    const mmW = mmRect.width
    const mmH = mmRect.height
    const viewW = cRect.width / zoomRef.current
    const viewH = cRect.height / zoomRef.current
    const scale = Math.min(mmW / (cRect.width / zoomRef.current), mmH / (cRect.height / zoomRef.current)) * 0.8
    const offsetX = (mmW - (cRect.width / zoomRef.current) * scale) / 2
    const offsetY = (mmH - (cRect.height / zoomRef.current) * scale) / 2
    const canvasX = (clickX - offsetX) / scale
    const canvasY = (clickY - offsetY) / scale
    setPanX(-(canvasX - cRect.width / (2 * zoomRef.current)) * zoomRef.current)
    setPanY(-(canvasY - cRect.height / (2 * zoomRef.current)) * zoomRef.current)
    panXRef.current = -(canvasX - cRect.width / (2 * zoomRef.current)) * zoomRef.current
    panYRef.current = -(canvasY - cRect.height / (2 * zoomRef.current)) * zoomRef.current
  }, [])

  // ── Keyboard Shortcuts ────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === ' ') {
        e.preventDefault()
        spaceHeldRef.current = true
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        e.shiftKey ? redo() : undo()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault()
        redo()
      }
      if (e.key === 'Delete' && selectionRef.current) {
        const sel = selectionRef.current
        pushUndo()
        setLayers(prev => prev.map(l => l.id === sel.layerId ? { ...l, operations: l.operations.filter(op => op.id !== sel.opId) } : l))
        selectionRef.current = null
        setSelection(null)
      }
      if (e.key === 'p') setActiveTool('pen')
      if (e.key === 'h') setActiveTool('highlighter')
      if (e.key === 'l') setActiveTool('line')
      if (e.key === 'a') setActiveTool('arrow')
      if (e.key === 'r') setActiveTool('rectangle')
      if (e.key === 'o') setActiveTool('ellipse')
      if (e.key === 't') setActiveTool('text')
      if (e.key === 'e') setActiveTool('eraser')
      if (e.key === 'v') setActiveTool('select')
      if (e.key === 'm') setActiveTool('measure')
      if (e.key === '+' || e.key === '=') zoomTo(zoomRef.current + ZOOM_STEP)
      if (e.key === '-') zoomTo(zoomRef.current - ZOOM_STEP)
      if (e.key === '0') resetView()
      if (e.key === 'Escape') {
        setTextPlacement(prev => ({ ...prev, visible: false }))
        setSelection(null)
        selectionRef.current = null
        setExportMenuOpen(false)
        setShowShortcuts(false)
        setShowLayerPanel(false)
        setOptionsPanelTool(null)
      }
      if (e.key === '?') setShowShortcuts(prev => !prev)
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') spaceHeldRef.current = false
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [undo, redo, pushUndo, zoomTo, resetView])

  // ── Cursor class ──────────────────────────────────────
  const cursorClass = useMemo(() => {
    if (spaceHeldRef.current || isPanning) return 'wb-cursor-grabbing'
    switch (activeTool) {
      case 'eraser': return 'wb-cursor-eraser'
      case 'text': return 'wb-cursor-text'
      case 'select': return 'wb-cursor-move'
      case 'measure': return 'wb-cursor-pointer'
      default: return 'wb-layer-interactive'
    }
  }, [activeTool, isPanning])

  // ── Render ────────────────────────────────────────────
  if (!mounted) return null

  return (
    <div
      ref={containerRef}
      className={`wb-container ${bgType === 'blank' ? 'wb-bg-blank' : bgType === 'dot-grid' ? 'wb-bg-dot-grid' : bgType === 'line-grid' ? 'wb-bg-line-grid' : 'wb-bg-graph-paper'} ${isFullscreen ? 'wb-fullscreen' : ''} ${className}`}
      onContextMenu={e => e.preventDefault()}
    >
      {/* Background Canvas */}
      <canvas ref={bgCanvasRef} className="wb-canvas-layer" />

      {/* Drawing Canvas */}
      <canvas
        ref={drawingCanvasRef}
        className={`wb-canvas-layer wb-layer-interactive ${cursorClass}`}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        onWheel={handleWheel}
      />

      {/* UI Canvas */}
      <canvas ref={uiCanvasRef} className="wb-canvas-layer" />

      {/* Collab Cursors */}
      {showCollabCursors && collabCursors.map(cursor => (
        <div
          key={cursor.id}
          className="wb-cursor-presence"
          style={{
            left: cursor.x * zoom + panX,
            top: cursor.y * zoom + panY,
            color: cursor.color,
          }}
        >
          <div className="wb-cursor-arrow" />
          <div className="wb-cursor-name" style={{ backgroundColor: cursor.color }}>{cursor.name}</div>
        </div>
      ))}

      {/* Measurement Label */}
      {measurement.p1 && measurement.p2 && (
        <div
          className="wb-measurement-label"
          style={{
            left: ((measurement.p1.x + measurement.p2.x) / 2) * zoom + panX,
            top: ((measurement.p1.y + measurement.p2.y) / 2) * zoom + panY - 20,
          }}
        >
          {Math.round(measurement.distance)}px / {(measurement.distance / 37.8).toFixed(1)}cm
        </div>
      )}

      {/* Text Input Overlay */}
      {textPlacement.visible && (
        <div
          className="wb-text-input-overlay"
          style={{
            left: textPlacement.x * zoom + panX,
            top: textPlacement.y * zoom + panY,
          }}
        >
          <textarea
            ref={textInputRef}
            className="wb-text-input"
            value={textValue}
            onChange={e => setTextValue(e.target.value)}
            onBlur={submitText}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submitText()
              }
              if (e.key === 'Escape') {
                setTextPlacement(prev => ({ ...prev, visible: false }))
                setTextValue('')
              }
            }}
            placeholder="Type text..."
            style={{
              fontSize: `${fontSize * zoom}px`,
              fontWeight: fontWeight as number | undefined,
              fontFamily: fontFamilyRef.current,
              opacity,
            }}
            rows={1}
          />
        </div>
      )}

      {/* Minimap */}
      {showMinimap && !isMobile && (
        <div className="wb-minimap" onClick={handleMinimapClick}>
          <canvas ref={minimapCanvasRef} style={{ width: '100%', height: '100%' }} />
        </div>
      )}

      {/* Zoom Indicator */}
      <div className="wb-zoom-indicator">
        <button className="wb-zoom-btn" onClick={() => zoomTo(zoomRef.current - ZOOM_STEP)}>
          <ZoomOut size={12} />
        </button>
        <span className="wb-zoom-label">{Math.round(zoom * 100)}%</span>
        <button className="wb-zoom-btn" onClick={() => zoomTo(zoomRef.current + ZOOM_STEP)}>
          <ZoomIn size={12} />
        </button>
        <button className="wb-zoom-btn" onClick={resetView} title="Reset view">
          <Maximize2 size={12} />
        </button>
      </div>

      {/* Version Slider */}
      {showVersionSlider && versionHistory.length > 1 && (
        <div className={`wb-version-slider ${showVersionSlider ? 'wb-version-visible' : ''}`}>
          <button
            className="wb-version-play-btn"
            onClick={() => {
              // Play through versions
              let idx = 0
              const playInterval = setInterval(() => {
                if (idx >= versionHistory.length) {
                  clearInterval(playInterval)
                  return
                }
                const snap = versionHistory[idx]
                if (snap) {
                  setLayers(JSON.parse(JSON.stringify(snap.layers)))
                  layersRef.current = JSON.parse(JSON.stringify(snap.layers))
                  setVersionIndex(idx)
                }
                idx++
              }, 800)
            }}
          >
            <RotateCcw size={12} />
          </button>
          <div
            className="wb-version-track"
            onClick={e => {
              const rect = e.currentTarget.getBoundingClientRect()
              const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
              const idx = Math.round(ratio * (versionHistory.length - 1))
              const snap = versionHistory[idx]
              if (snap) {
                setLayers(JSON.parse(JSON.stringify(snap.layers)))
                layersRef.current = JSON.parse(JSON.stringify(snap.layers))
                setVersionIndex(idx)
              }
            }}
          >
            <div
              className="wb-version-progress"
              style={{ width: versionIndex >= 0 ? `${((versionIndex + 1) / versionHistory.length) * 100}%` : '0%' }}
            />
            <div
              className="wb-version-scrubber"
              style={{ left: versionIndex >= 0 ? `${((versionIndex + 1) / versionHistory.length) * 100}%` : '0%' }}
            />
          </div>
          <span className="wb-version-label">
            {versionIndex >= 0 && versionHistory[versionIndex] ? versionHistory[versionIndex].label : '—'}
          </span>
        </div>
      )}

      {/* Selection bounds overlay (CSS handles) */}
      {selection && (
        <div
          className="wb-select-bounds"
          style={{
            left: selection.bounds.x * zoom + panX,
            top: selection.bounds.y * zoom + panY,
            width: selection.bounds.w * zoom,
            height: selection.bounds.h * zoom,
          }}
        >
          <div className="wb-select-handle wb-select-handle-nw" />
          <div className="wb-select-handle wb-select-handle-ne" />
          <div className="wb-select-handle wb-select-handle-sw" />
          <div className="wb-select-handle wb-select-handle-se" />
        </div>
      )}

      {/* Export Menu */}
      {exportMenuOpen && (
        <div className="wb-export-menu">
          <button className="wb-export-item" onClick={exportPng}>
            <Download size={14} /> Export PNG
          </button>
          <button className="wb-export-item" onClick={exportSvg}>
            <Image size={14} /> Export SVG
          </button>
          <button className="wb-export-item" onClick={copyToClipboard}>
            <Copy size={14} /> Copy to Clipboard
          </button>
        </div>
      )}

      {/* Confirm Clear Overlay */}
      {confirmClear && (
        <div className="wb-export-menu" style={{ transform: 'translateX(-50%) translateY(50px)' }}>
          <div style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--vl-text-muted)' }}>
            Clear all layers?
          </div>
          <div style={{ display: 'flex', gap: '4px', padding: '4px' }}>
            <button className="wb-export-item" onClick={clearAll} style={{ color: '#ef4444', flex: 1 }}>
              Clear All
            </button>
            <button className="wb-export-item" onClick={() => setConfirmClear(false)} style={{ flex: 1 }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Shortcuts Panel */}
      {showShortcuts && (
        <div className="wb-shortcuts-panel">
          <div className="wb-shortcuts-title">Keyboard Shortcuts</div>
          {[
            ['Pen', 'P'], ['Highlighter', 'H'], ['Line', 'L'], ['Arrow', 'A'],
            ['Rectangle', 'R'], ['Ellipse', 'O'], ['Text', 'T'], ['Eraser', 'E'],
            ['Select', 'V'], ['Measure', 'M'], ['Undo', '⌘ Z'], ['Redo', '⌘⇧ Z'],
            ['Zoom In', '+'], ['Zoom Out', '-'], ['Reset View', '0'],
            ['Pan', 'Space+Drag'], ['Delete Selected', 'Del'],
          ].map(([label, keys]) => (
            <div key={label} className="wb-shortcut-row">
              <span>{label}</span>
              <div className="wb-shortcut-keys">
                {keys.split('+').map((k, i) => (
                  <span key={i} className="wb-shortcut-key">{k.trim()}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fullscreen toggle (invisible button) */}
      <button
        className="wb-zoom-btn"
        style={{ position: 'absolute', top: 8, right: 8, zIndex: 41 }}
        onClick={() => setIsFullscreen(p => !p)}
        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      >
        {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
      </button>
    </div>
  )
}

// Need Minimize2 import (using a re-export alias since Minimize2 is not in the import)
function Minimize2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
    </svg>
  )
}
