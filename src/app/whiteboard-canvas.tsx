'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Pen, Eraser, Type, Square, Circle, ArrowRight,
  Undo2, Redo2, Trash2, Download, ZoomIn, ZoomOut, Maximize2,
  Palette, StickyNote, ImagePlus, Grid3x3, Sun, Moon, Save,
  FileJson, Upload, FileCode, Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

// ============================================================
// Types
// ============================================================

type Tool = 'pen' | 'eraser' | 'text' | 'rectangle' | 'circle' | 'arrow' | 'sticky' | 'select' | 'image'

interface Point {
  x: number
  y: number
}

type BackgroundMode = 'white' | 'dark' | 'grid'

interface StickyNoteData {
  id: string
  x: number
  y: number
  width: number
  height: number
  text: string
  color: string
}

interface ImageData {
  id: string
  x: number
  y: number
  width: number
  height: number
  src: string // data URL
}

interface DrawOperation {
  type: Tool
  points: Point[]
  color: string
  fillColor?: string
  strokeWidth: number
  opacity: number
  fontSize?: number
  textContent?: string
  id: string
}

interface CanvasState {
  operations: DrawOperation[]
  stickyNotes: StickyNoteData[]
  images: ImageData[]
}

// ============================================================
// Constants
// ============================================================

const COLORS = ['#000000', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff']
const STROKE_WIDTHS = [2, 4, 6, 8, 12]
const FONT_SIZES = [12, 16, 24, 32]
const STICKY_COLORS = ['#10b981', '#f59e0b', '#8b5cf6', '#06b6d4']
const MAX_HISTORY = 50

const TOOL_CONFIG: { tool: Tool; labelKey: string; Icon: typeof Pen }[] = [
  { tool: 'pen', labelKey: 'whiteboard.pen', Icon: Pen },
  { tool: 'eraser', labelKey: 'whiteboard.eraser', Icon: Eraser },
  { tool: 'text', labelKey: 'whiteboard.text', Icon: Type },
  { tool: 'rectangle', labelKey: 'whiteboard.rectangle', Icon: Square },
  { tool: 'circle', labelKey: 'whiteboard.circle', Icon: Circle },
  { tool: 'arrow', labelKey: 'whiteboard.arrow', Icon: ArrowRight },
  { tool: 'sticky', labelKey: 'whiteboard.sticky', Icon: StickyNote },
  { tool: 'image', labelKey: 'whiteboard.image', Icon: ImagePlus },
]

// ============================================================
// Component
// ============================================================

interface WhiteboardCanvasProps {
  lang?: Lang
  broadcastDraw?: (operation: DrawOperation) => void
  onRemoteDraw?: (operation: DrawOperation) => void
  className?: string
  canvasId?: string
}

export function WhiteboardCanvas({
  lang = 'en',
  broadcastDraw,
  onRemoteDraw,
  className = '',
  canvasId = 'default',
}: WhiteboardCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mounted, setMounted] = useState(false)
  const [activeTool, setActiveTool] = useState<Tool>('pen')
  const [color, setColor] = useState('#000000')
  const [fillColor, setFillColor] = useState('')
  const [strokeWidth, setStrokeWidth] = useState(2)
  const [fontSize, setFontSize] = useState(16)
  const [opacity, setOpacity] = useState(1)
  const [operations, setOperations] = useState<DrawOperation[]>([])
  const [undoneOps, setUndoneOps] = useState<DrawOperation[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPoints, setCurrentPoints] = useState<Point[]>([])
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 })
  const [textInput, setTextInput] = useState<{ x: number; y: number; visible: boolean; opId?: string }>({ x: 0, y: 0, visible: false })
  const [textValue, setTextValue] = useState('')
  const [showGrid, setShowGrid] = useState(true)
  const [snapToGrid, setSnapToGrid] = useState(false)
  const [bgMode, setBgMode] = useState<BackgroundMode>('white')
  const [stickyNotes, setStickyNotes] = useState<StickyNoteData[]>([])
  const [images, setImages] = useState<ImageData[]>([])
  const [editingStickyId, setEditingStickyId] = useState<string | null>(null)
  const [editingStickyText, setEditingStickyText] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)

  const drawingRef = useRef(false)
  const opsRef = useRef<DrawOperation[]>([])
  const stickyRef = useRef<StickyNoteData[]>([])
  const imagesRef = useRef<ImageData[]>([])
  const currentPointsRef = useRef<Point[]>([])
  const zoomRef = useRef(1)
  const panRef = useRef<Point>({ x: 0, y: 0 })
  const toolRef = useRef<Tool>('pen')
  const colorRef = useRef('#000000')
  const fillColorRef = useRef('')
  const strokeRef = useRef(2)
  const fontSizeRef = useRef(16)
  const opacityRef = useRef(1)
  const bgModeRef = useRef<BackgroundMode>('white')
  const showGridRef = useRef(true)
  const containerSizeRef = useRef({ w: 800, h: 600 })
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Keep refs in sync
  useEffect(() => { opsRef.current = operations }, [operations])
  useEffect(() => { stickyRef.current = stickyNotes }, [stickyNotes])
  useEffect(() => { imagesRef.current = images }, [images])
  useEffect(() => { zoomRef.current = zoom }, [zoom])
  useEffect(() => { panRef.current = pan }, [pan])
  useEffect(() => { toolRef.current = activeTool }, [activeTool])
  useEffect(() => { colorRef.current = color }, [color])
  useEffect(() => { fillColorRef.current = fillColor }, [fillColor])
  useEffect(() => { strokeRef.current = strokeWidth }, [strokeWidth])
  useEffect(() => { fontSizeRef.current = fontSize }, [fontSize])
  useEffect(() => { opacityRef.current = opacity }, [opacity])
  useEffect(() => { bgModeRef.current = bgMode }, [bgMode])
  useEffect(() => { showGridRef.current = showGrid }, [showGrid])

  // Hydration-safe mount
  useEffect(() => {
    requestAnimationFrame(() => setMounted(true))
  }, [])

  // Load from localStorage on mount
  useEffect(() => {
    if (!mounted) return
    try {
      const raw = localStorage.getItem(`vl-whiteboard-${canvasId}`)
      if (raw) {
        const state: CanvasState = JSON.parse(raw)
        setOperations(state.operations || [])
        setStickyNotes(state.stickyNotes || [])
        setImages(state.images || [])
      }
    } catch { /* ignore */ }
  }, [mounted, canvasId])

  // Auto-save every 5 seconds
  useEffect(() => {
    if (!mounted) return
    autoSaveRef.current = setInterval(() => {
      try {
        const state: CanvasState = {
          operations: opsRef.current.slice(-MAX_HISTORY),
          stickyNotes: stickyRef.current,
          images: imagesRef.current,
        }
        localStorage.setItem(`vl-whiteboard-${canvasId}`, JSON.stringify(state))
      } catch { /* ignore */ }
    }, 5000)
    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current) }
  }, [mounted, canvasId])

  // Resize canvas to container
  const resizeCanvas = useCallback(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const rect = container.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`
    containerSizeRef.current = { w: rect.width, h: rect.height }

    const ctx = canvas.getContext('2d')
    if (ctx) ctx.scale(dpr, dpr)
  }, [])

  useEffect(() => {
    if (!mounted) return
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [mounted, resizeCanvas])

  // Get background colors
  const getBgColors = useCallback(() => {
    switch (bgModeRef.current) {
      case 'dark': return { bg: '#1e293b', grid: '#334155' }
      case 'grid': return { bg: '#ffffff', grid: '#e5e7eb' }
      default: return { bg: '#f8fafc', grid: '#e2e8f0' }
    }
  }, [])

  // Redraw canvas
  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const { bg, grid } = getBgColors()

    // Clear
    ctx.clearRect(0, 0, containerSizeRef.current.w, containerSizeRef.current.h)

    // Background
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, containerSizeRef.current.w, containerSizeRef.current.h)

    // Apply zoom and pan
    ctx.save()
    ctx.translate(panRef.current.x, panRef.current.y)
    ctx.scale(zoomRef.current, zoomRef.current)

    // Draw grid
    if (showGridRef.current) {
      ctx.strokeStyle = grid
      ctx.lineWidth = 0.5
      const gridSize = 30
      const w = containerSizeRef.current.w / zoomRef.current
      const h = containerSizeRef.current.h / zoomRef.current
      const offsetX = -panRef.current.x / zoomRef.current
      const offsetY = -panRef.current.y / zoomRef.current
      for (let x = Math.floor(offsetX / gridSize) * gridSize; x < offsetX + w; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, offsetY)
        ctx.lineTo(x, offsetY + h)
        ctx.stroke()
      }
      for (let y = Math.floor(offsetY / gridSize) * gridSize; y < offsetY + h; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(offsetX, y)
        ctx.lineTo(offsetX + w, y)
        ctx.stroke()
      }
    }

    // Draw images (behind operations)
    const imgs = imagesRef.current
    for (const img of imgs) {
      const imageEl = new Image()
      imageEl.src = img.src
      try {
        ctx.globalAlpha = opacityRef.current
        ctx.drawImage(imageEl, img.x, img.y, img.width, img.height)
        ctx.globalAlpha = 1
      } catch { /* ignore broken images */ }
    }

    // Draw all operations
    const ops = opsRef.current
    for (const op of ops) {
      drawOperation(ctx, op)
    }

    // Draw current in-progress operation
    const pts = currentPointsRef.current
    if (pts.length > 0) {
      drawOperation(ctx, {
        type: toolRef.current,
        points: pts,
        color: colorRef.current,
        fillColor: fillColorRef.current,
        strokeWidth: strokeRef.current,
        opacity: opacityRef.current,
        fontSize: fontSizeRef.current,
        textContent: textValue || undefined,
        id: 'current',
      })
    }

    ctx.restore()
  }, [getBgColors])

  // Auto-redraw on state changes
  useEffect(() => {
    currentPointsRef.current = currentPoints
    redraw()
  }, [operations, currentPoints, zoom, pan, color, strokeWidth, fontSize, opacity, fillColor, activeTool, stickyNotes, images, bgMode, showGrid, redraw])

  // Draw a single operation
  function drawOperation(ctx: CanvasRenderingContext2D, op: DrawOperation) {
    const bg = getBgColors()
    ctx.globalAlpha = op.opacity || 1
    ctx.strokeStyle = op.type === 'eraser' ? bg.bg : op.color
    ctx.fillStyle = op.type === 'eraser' ? bg.bg : (op.fillColor || op.color)
    ctx.lineWidth = op.strokeWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    switch (op.type) {
      case 'pen':
      case 'eraser': {
        if (op.points.length < 2) return
        ctx.beginPath()
        ctx.moveTo(op.points[0].x, op.points[0].y)
        for (let i = 1; i < op.points.length; i++) {
          const mid = {
            x: (op.points[i - 1].x + op.points[i].x) / 2,
            y: (op.points[i - 1].y + op.points[i].y) / 2,
          }
          ctx.quadraticCurveTo(op.points[i - 1].x, op.points[i - 1].y, mid.x, mid.y)
        }
        ctx.stroke()
        break
      }
      case 'rectangle': {
        if (op.points.length < 2) return
        const x = Math.min(op.points[0].x, op.points[op.points.length - 1].x)
        const y = Math.min(op.points[0].y, op.points[op.points.length - 1].y)
        const w = Math.abs(op.points[op.points.length - 1].x - op.points[0].x)
        const h = Math.abs(op.points[op.points.length - 1].y - op.points[0].y)
        if (op.fillColor) {
          ctx.fillRect(x, y, w, h)
        }
        ctx.strokeRect(x, y, w, h)
        break
      }
      case 'circle': {
        if (op.points.length < 2) return
        const cx = (op.points[0].x + op.points[op.points.length - 1].x) / 2
        const cy = (op.points[0].y + op.points[op.points.length - 1].y) / 2
        const rx = Math.abs(op.points[op.points.length - 1].x - op.points[0].x) / 2
        const ry = Math.abs(op.points[op.points.length - 1].y - op.points[0].y) / 2
        ctx.beginPath()
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
        if (op.fillColor) ctx.fill()
        ctx.stroke()
        break
      }
      case 'arrow': {
        if (op.points.length < 2) return
        const start = op.points[0]
        const end = op.points[op.points.length - 1]
        const angle = Math.atan2(end.y - start.y, end.x - start.x)
        const headLen = Math.max(15, op.strokeWidth * 3)
        ctx.beginPath()
        ctx.moveTo(start.x, start.y)
        ctx.lineTo(end.x, end.y)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(end.x, end.y)
        ctx.lineTo(end.x - headLen * Math.cos(angle - Math.PI / 6), end.y - headLen * Math.sin(angle - Math.PI / 6))
        ctx.moveTo(end.x, end.y)
        ctx.lineTo(end.x - headLen * Math.cos(angle + Math.PI / 6), end.y - headLen * Math.sin(angle + Math.PI / 6))
        ctx.stroke()
        break
      }
      case 'text': {
        if (op.textContent && op.points.length > 0) {
          const fs = op.fontSize || 16
          ctx.font = `${fs}px sans-serif`
          ctx.fillText(op.textContent, op.points[0].x, op.points[0].y)
        }
        break
      }
    }
    ctx.globalAlpha = 1
  }

  // Snap to grid helper
  const snapPoint = useCallback((pt: Point): Point => {
    if (!snapToGrid) return pt
    const gridSize = 30
    return {
      x: Math.round(pt.x / gridSize) * gridSize,
      y: Math.round(pt.y / gridSize) * gridSize,
    }
  }, [snapToGrid])

  // Get canvas-space point from event
  const getCanvasPoint = useCallback((e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent): Point | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    let clientX: number, clientY: number
    if ('touches' in e) {
      if (e.touches.length === 0) return null
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }
    const raw = {
      x: (clientX - rect.left - panRef.current.x) / zoomRef.current,
      y: (clientY - rect.top - panRef.current.y) / zoomRef.current,
    }
    return snapPoint(raw)
  }, [snapPoint])

  // Mouse / touch handlers
  const handlePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const isPan = 'button' in e && (e.button === 1 || e.button === 2)
    if (isPan) {
      setIsPanning(true)
      const pt = { x: 'clientX' in e ? e.clientX : 0, y: 'clientY' in e ? e.clientY : 0 }
      setPanStart(pt)
      return
    }

    if (activeTool === 'sticky') {
      const pt = getCanvasPoint(e)
      if (pt) {
        const newNote: StickyNoteData = {
          id: `sticky-${Date.now()}`,
          x: pt.x - 80,
          y: pt.y - 20,
          width: 160,
          height: 100,
          text: '',
          color: STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)],
        }
        setStickyNotes(prev => [...prev, newNote])
        setEditingStickyId(newNote.id)
        setEditingStickyText('')
      }
      return
    }

    if (activeTool === 'image') {
      fileInputRef.current?.click()
      return
    }

    if (activeTool === 'text' && textInput.visible) return

    if (activeTool === 'text') {
      const pt = getCanvasPoint(e)
      if (pt) {
        setTextInput({ x: pt.x, y: pt.y, visible: true })
        setTextValue('')
      }
      return
    }

    drawingRef.current = true
    setIsDrawing(true)
    const pt = getCanvasPoint(e)
    if (pt) {
      setCurrentPoints([pt])
    }
  }, [activeTool, textInput.visible, getCanvasPoint])

  const handlePointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (isPanning) {
      const clientX = 'clientX' in e ? e.clientX : 0
      const clientY = 'clientY' in e ? e.clientY : 0
      setPan(prev => ({
        x: prev.x + clientX - panStart.x,
        y: prev.y + clientY - panStart.y,
      }))
      setPanStart({ x: clientX, y: clientY })
      return
    }

    if (!drawingRef.current) return
    const pt = getCanvasPoint(e)
    if (pt) {
      setCurrentPoints(prev => [...prev, pt])
    }
  }, [isPanning, panStart, getCanvasPoint])

  const handlePointerUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false)
      return
    }

    if (!drawingRef.current) return
    drawingRef.current = false
    setIsDrawing(false)

    const pts = currentPointsRef.current
    if (pts.length < 2 && activeTool !== 'text') {
      setCurrentPoints([])
      return
    }

    const newOp: DrawOperation = {
      type: activeTool,
      points: pts,
      color,
      fillColor,
      strokeWidth,
      opacity,
      fontSize,
      textContent: textValue || undefined,
      id: `op-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    }

    setOperations(prev => [...prev.slice(-MAX_HISTORY + 1), newOp])
    setUndoneOps([])
    setCurrentPoints([])

    if (broadcastDraw) broadcastDraw(newOp)
  }, [activeTool, color, fillColor, strokeWidth, opacity, fontSize, textValue, broadcastDraw])

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setZoom(prev => Math.max(0.2, Math.min(5, prev + delta)))
  }, [])

  // Text submit
  const handleTextSubmit = useCallback(() => {
    if (!textValue.trim()) {
      setTextInput({ x: 0, y: 0, visible: false })
      return
    }
    const newOp: DrawOperation = {
      type: 'text',
      points: [textInput],
      color,
      strokeWidth,
      opacity,
      fontSize,
      textContent: textValue.trim(),
      id: `op-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    }
    setOperations(prev => [...prev.slice(-MAX_HISTORY + 1), newOp])
    setUndoneOps([])
    setTextInput({ x: 0, y: 0, visible: false })
    setTextValue('')
    if (broadcastDraw) broadcastDraw(newOp)
  }, [textInput, textValue, color, strokeWidth, opacity, fontSize, broadcastDraw])

  // Image upload handler
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const src = ev.target?.result as string
      const img = new Image()
      img.onload = () => {
        const maxDim = 300
        const scale = Math.min(maxDim / img.width, maxDim / img.height, 1)
        const newImage: ImageData = {
          id: `img-${Date.now()}`,
          x: -panRef.current.x / zoomRef.current,
          y: -panRef.current.y / zoomRef.current,
          width: img.width * scale,
          height: img.height * scale,
          src,
        }
        setImages(prev => [...prev, newImage])
      }
      img.src = src
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [])

  // Sticky note handlers
  const updateStickyText = useCallback((id: string, text: string) => {
    setStickyNotes(prev => prev.map(n => n.id === id ? { ...n, text } : n))
  }, [])

  const deleteSticky = useCallback((id: string) => {
    setStickyNotes(prev => prev.filter(n => n.id !== id))
    if (editingStickyId === id) setEditingStickyId(null)
  }, [editingStickyId])

  const resizeSticky = useCallback((id: string, deltaH: number) => {
    setStickyNotes(prev => prev.map(n => n.id === id ? { ...n, height: Math.max(60, n.height + deltaH) } : n))
  }, [])

  // Undo
  const undo = useCallback(() => {
    setOperations(prev => {
      if (prev.length === 0) return prev
      const last = prev[prev.length - 1]
      setUndoneOps(d => [last, ...d])
      return prev.slice(0, -1)
    })
  }, [])

  // Redo
  const redo = useCallback(() => {
    setUndoneOps(prev => {
      if (prev.length === 0) return prev
      const first = prev[0]
      setOperations(o => [...o, first])
      return prev.slice(1)
    })
  }, [])

  // Clear
  const clearCanvas = useCallback(() => {
    setOperations([])
    setUndoneOps([])
    setCurrentPoints([])
    setStickyNotes([])
    setImages([])
    setConfirmClear(false)
  }, [])

  // Export PNG
  const exportPng = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `whiteboard-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }, [])

  // Export JSON
  const exportJSON = useCallback(() => {
    const state: CanvasState = {
      operations: opsRef.current,
      stickyNotes: stickyRef.current,
      images: imagesRef.current,
    }
    const data = JSON.stringify(state)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `whiteboard-${canvasId}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [canvasId])

  // Load JSON
  const loadJSON = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const state: CanvasState = JSON.parse(ev.target?.result as string)
          setOperations(state.operations || [])
          setStickyNotes(state.stickyNotes || [])
          setImages(state.images || [])
          setUndoneOps([])
        } catch { /* ignore */ }
      }
      reader.readAsText(file)
    }
    input.click()
  }, [])

  // Save as template
  const saveTemplate = useCallback(() => {
    const state: CanvasState = {
      operations: opsRef.current,
      stickyNotes: [],
      images: [],
    }
    try {
      const templates = JSON.parse(localStorage.getItem('vl-whiteboard-templates') || '[]')
      templates.push({ name: `Template ${templates.length + 1}`, state, createdAt: new Date().toISOString() })
      localStorage.setItem('vl-whiteboard-templates', JSON.stringify(templates))
    } catch { /* ignore */ }
  }, [])

  // Zoom controls
  const zoomIn = useCallback(() => setZoom(prev => Math.min(5, prev + 0.2)), [])
  const zoomOut = useCallback(() => setZoom(prev => Math.max(0.2, prev - 0.2)), [])
  const resetZoom = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }) }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      }
      // Space for pan mode
      if (e.key === ' ' && !drawingRef.current) {
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  if (!mounted) return null

  const isShapeTool = activeTool === 'rectangle' || activeTool === 'circle'
  const isTextTool = activeTool === 'text'

  return (
    <div className={`vl-card flex flex-col h-full ${className}`}>
      {/* Toolbar Row 1: Tools */}
      <div className="px-3 py-2 border-b border-[var(--vl-border)] flex items-center gap-1 flex-wrap">
        {/* Tool buttons */}
        <TooltipProvider>
          {TOOL_CONFIG.map(({ tool, labelKey, Icon }) => (
            <Tooltip key={tool}>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTool === tool ? 'default' : 'ghost'}
                  size="sm"
                  className={`h-7 w-7 p-0 ${activeTool === tool ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                  onClick={() => setActiveTool(tool)}
                >
                  <Icon className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="vl-dialog text-xs">{t(lang, labelKey)}</TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>

        {/* Divider */}
        <div className="w-px h-5 bg-[var(--vl-border)] mx-1" />

        {/* Color picker */}
        <div className="flex items-center gap-1">
          <Palette className="size-3.5 vl-text-muted" />
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-5 h-5 rounded-full border-2 transition-all ${
                color === c ? 'border-emerald-500 scale-110' : 'border-transparent hover:border-[var(--vl-border)]'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-[var(--vl-border)] mx-1" />

        {/* Stroke width */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] vl-text-muted">Size</span>
          {STROKE_WIDTHS.map(w => (
            <button
              key={w}
              onClick={() => setStrokeWidth(w)}
              className={`flex items-center justify-center w-6 h-6 rounded transition-all ${
                strokeWidth === w
                  ? 'bg-emerald-500/15 border border-emerald-500/30'
                  : 'hover:bg-[var(--vl-bg-inner)] border border-transparent'
              }`}
            >
              <div className="rounded-full" style={{ width: Math.max(4, w), height: Math.max(4, w), backgroundColor: 'currentColor' }} />
            </button>
          ))}
        </div>

        {/* Font size (text tool) */}
        {isTextTool && (
          <>
            <div className="w-px h-5 bg-[var(--vl-border)] mx-1" />
            <div className="flex items-center gap-1">
              <span className="text-[10px] vl-text-muted">Font</span>
              {FONT_SIZES.map(fs => (
                <button
                  key={fs}
                  onClick={() => setFontSize(fs)}
                  className={`px-1.5 h-6 rounded text-[10px] transition-all ${
                    fontSize === fs
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                      : 'hover:bg-[var(--vl-bg-inner)] border border-transparent vl-text-muted'
                  }`}
                >
                  {fs}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Fill color (shapes) */}
        {isShapeTool && (
          <>
            <div className="w-px h-5 bg-[var(--vl-border)] mx-1" />
            <div className="flex items-center gap-1">
              <span className="text-[10px] vl-text-muted">Fill</span>
              <button
                onClick={() => setFillColor('')}
                className={`w-5 h-5 rounded-full border-2 transition-all ${!fillColor ? 'border-emerald-500 scale-110' : 'border-transparent'}`}
                style={{ background: 'repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50%/8px 8px' }}
              />
              {COLORS.filter(c => c !== '#ffffff').map(c => (
                <button
                  key={c}
                  onClick={() => setFillColor(c === fillColor ? '' : c)}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${
                    fillColor === c ? 'border-emerald-500 scale-110' : 'border-transparent hover:border-[var(--vl-border)]'
                  }`}
                  style={{ backgroundColor: c, opacity: 0.7 }}
                />
              ))}
            </div>
          </>
        )}

        {/* Opacity */}
        <div className="w-px h-5 bg-[var(--vl-border)] mx-1" />
        <div className="flex items-center gap-1">
          <span className="text-[10px] vl-text-muted">Opacity</span>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={opacity}
            onChange={e => setOpacity(Number(e.target.value))}
            className="w-16 h-1 accent-emerald-500"
          />
          <span className="text-[10px] vl-text-muted w-7">{Math.round(opacity * 100)}%</span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Zoom controls */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={zoomOut}>
                <ZoomOut className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="vl-dialog text-xs">Zoom Out</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <span className="text-[10px] vl-text-muted w-12 text-center">{Math.round(zoom * 100)}%</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={zoomIn}>
                <ZoomIn className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="vl-dialog text-xs">Zoom In</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={resetZoom}>
                <Maximize2 className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="vl-dialog text-xs">Reset</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Divider */}
        <div className="w-px h-5 bg-[var(--vl-border)] mx-1" />

        {/* Actions */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={undo} disabled={operations.length === 0}>
                <Undo2 className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="vl-dialog text-xs">Undo</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={redo} disabled={undoneOps.length === 0}>
                <Redo2 className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="vl-dialog text-xs">Redo</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Clear with confirmation */}
        {confirmClear ? (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-red-400">Clear?</span>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] bg-red-500/20 text-red-400" onClick={clearCanvas}>
              Yes
            </Button>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => setConfirmClear(false)}>
              No
            </Button>
          </div>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-300" onClick={() => setConfirmClear(true)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="vl-dialog text-xs">Clear</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Export dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <Download className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="vl-dialog" align="end">
            <DropdownMenuItem onClick={exportPng}>
              <Download className="size-3.5 mr-2" /> Export PNG
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportJSON}>
              <FileJson className="size-3.5 mr-2" /> Export JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={loadJSON}>
              <Upload className="size-3.5 mr-2" /> Load JSON
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={saveTemplate}>
              <Save className="size-3.5 mr-2" /> Save as Template
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Toolbar Row 2: Canvas options */}
      <div className="px-3 py-1 border-b border-[var(--vl-border-subtle)] flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`p-1 rounded transition-colors ${showGrid ? 'bg-emerald-500/15 text-emerald-400' : 'vl-text-muted hover:text-white'}`}
              >
                <Grid3x3 className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="vl-dialog text-[10px]">Toggle Grid</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setSnapToGrid(!snapToGrid)}
                className={`p-1 rounded transition-colors ${snapToGrid ? 'bg-emerald-500/15 text-emerald-400' : 'vl-text-muted hover:text-white'}`}
              >
                <Layers className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="vl-dialog text-[10px]">Snap to Grid</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="w-px h-4 bg-[var(--vl-border)]" />

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setBgMode(bgMode === 'white' ? 'dark' : bgMode === 'dark' ? 'grid' : 'white')}
                className={`p-1 rounded transition-colors vl-text-muted hover:text-white`}
              >
                {bgMode === 'dark' ? <Moon className="size-3.5" /> : bgMode === 'grid' ? <Grid3x3 className="size-3.5" /> : <Sun className="size-3.5" />}
              </button>
            </TooltipTrigger>
            <TooltipContent className="vl-dialog text-[10px]">Background: {bgMode}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="flex-1" />
        <span className="text-[9px] vl-text-muted">
          {operations.length} ops · {stickyNotes.length} notes · Auto-saved
        </span>
      </div>

      {/* Hidden file input for images */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* Canvas area */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        onContextMenu={(e) => e.preventDefault()}
        style={{
          cursor: activeTool === 'eraser' ? 'cell' : activeTool === 'text' ? 'text' : activeTool === 'sticky' ? 'copy' : activeTool === 'image' ? 'pointer' : 'crosshair',
        }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0"
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          onWheel={handleWheel}
        />

        {/* Sticky notes overlay */}
        <AnimatePresence>
          {stickyNotes.map(note => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute z-10 group"
              style={{
                left: note.x * zoom + pan.x,
                top: note.y * zoom + pan.y,
                width: note.width * zoom,
                minHeight: note.height * zoom,
              }}
            >
              <div
                className="w-full h-full rounded-lg shadow-lg p-2 flex flex-col relative"
                style={{
                  backgroundColor: note.color,
                  opacity: 0.9,
                }}
              >
                {/* Delete button */}
                <button
                  onClick={() => deleteSticky(note.id)}
                  className="absolute top-1 right-1 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-black/20 transition-opacity"
                  style={{ color: note.color }}
                >
                  <Trash2 className="size-3 text-black/40" />
                </button>

                {/* Editable text */}
                {editingStickyId === note.id ? (
                  <textarea
                    autoFocus
                    value={editingStickyText}
                    onChange={e => setEditingStickyText(e.target.value)}
                    onBlur={() => {
                      updateStickyText(note.id, editingStickyText)
                      setEditingStickyId(null)
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Escape') {
                        updateStickyText(note.id, editingStickyText)
                        setEditingStickyId(null)
                      }
                    }}
                    className="flex-1 bg-transparent text-sm text-black/80 resize-none outline-none placeholder:text-black/30 min-h-[40px]"
                    placeholder="Type here..."
                    style={{ fontSize: `${12 * zoom}px` }}
                  />
                ) : (
                  <div
                    onClick={() => { setEditingStickyId(note.id); setEditingStickyText(note.text) }}
                    className="flex-1 text-sm text-black/80 cursor-text min-h-[40px] whitespace-pre-wrap"
                    style={{ fontSize: `${12 * zoom}px` }}
                  >
                    {note.text || <span className="text-black/30">Click to edit...</span>}
                  </div>
                )}

                {/* Resize handle */}
                <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    const startY = e.clientY
                    const startH = note.height
                    const onMove = (me: MouseEvent) => {
                      const delta = (me.clientY - startY) / zoom
                      resizeSticky(note.id, delta)
                    }
                    const onUp = () => {
                      window.removeEventListener('mousemove', onMove)
                      window.removeEventListener('mouseup', onUp)
                    }
                    window.addEventListener('mousemove', onMove)
                    window.addEventListener('mouseup', onUp)
                  }}
                >
                  <svg viewBox="0 0 16 16" className="w-4 h-4 text-black/20">
                    <path d="M14 2L2 14M14 6L6 14M14 10L10 14" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Text input overlay */}
        <AnimatePresence>
          {textInput.visible && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute z-10"
              style={{
                left: textInput.x * zoom + pan.x,
                top: textInput.y * zoom + pan.y,
              }}
            >
              <input
                type="text"
                autoFocus
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTextSubmit()
                  if (e.key === 'Escape') setTextInput({ x: 0, y: 0, visible: false })
                }}
                onBlur={handleTextSubmit}
                placeholder="Type text..."
                className="bg-white/90 backdrop-blur-sm border border-[var(--vl-border)] rounded px-2 py-1 outline-none ring-1 ring-emerald-500/50 min-w-[120px]"
                style={{ fontSize: `${fontSize * zoom}px`, color }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {operations.length === 0 && !isDrawing && stickyNotes.length === 0 && images.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-2">
            <Pen className="size-8 vl-text-muted opacity-20" />
            <p className="text-xs vl-text-muted opacity-30">Draw, add notes, or upload images</p>
          </div>
        )}
      </div>
    </div>
  )
}
