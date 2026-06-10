'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RotateCcw, Download, Tag, Maximize2 } from 'lucide-react'
import type { Lang } from '@/lib/i18n'

// ============================================================
// Types
// ============================================================

export interface ForceNodeData {
  id: string
  label: string
  color: string
  size: number
  x?: number
  y?: number
  meetings?: number
  messages?: number
}

export interface ForceEdgeData {
  source: string
  target: string
  weight: number
}

export interface ForceGraphProps {
  nodes: ForceNodeData[]
  edges: ForceEdgeData[]
  width?: number
  height?: number
  lang?: Lang
}

interface SimNode {
  id: string
  label: string
  color: string
  size: number
  meetings: number
  messages: number
  x: number
  y: number
  vx: number
  vy: number
}

// ============================================================
// Force-Directed Graph — Canvas-based rendering with physics
// ============================================================

export function ForceGraph({ nodes, edges, width = 700, height = 450, lang = 'en' }: ForceGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animRef = useRef<number>(0)
  const simNodesRef = useRef<SimNode[]>([])
  const dragRef = useRef<string | null>(null)
  const panRef = useRef({ x: 0, y: 0 })
  const zoomRef = useRef(1)
  const panStartRef = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: SimNode } | null>(null)
  const [showLabels, setShowLabels] = useState(true)
  const [physicsEnabled, setPhysicsEnabled] = useState(true)
  const prefersReducedMotionRef = useRef(false)
  // Keep hoveredNode in ref for use inside the animation loop
  const hoveredNodeRef = useRef<string | null>(null)

  // Sync hoveredNode to ref
  useEffect(() => {
    hoveredNodeRef.current = hoveredNode
  }, [hoveredNode])

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window !== 'undefined') {
      prefersReducedMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }
  }, [])

  // Initialize simulation nodes
  useEffect(() => {
    const initialized: SimNode[] = nodes.map((n) => ({
      id: n.id,
      label: n.label,
      color: n.color,
      size: n.size,
      meetings: n.meetings || 0,
      messages: n.messages || 0,
      x: n.x ?? width / 2 + (Math.random() - 0.5) * width * 0.6,
      y: n.y ?? height / 2 + (Math.random() - 0.5) * height * 0.6,
      vx: 0,
      vy: 0,
    }))
    simNodesRef.current = initialized
  }, [nodes, width, height])

  // Physics simulation + rendering loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || simNodesRef.current.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    const alphaDecay = 0.995
    let alpha = 1

    const tick = () => {
      const simNodes = simNodesRef.current
      if (simNodes.length === 0) { animRef.current = requestAnimationFrame(tick); return }
      const nodeMap = new Map(simNodes.map(n => [n.id, n]))
      const physics = physicsEnabled
      const reducedMotion = prefersReducedMotionRef.current

      if (physics && alpha > 0.001) {
        alpha *= alphaDecay

        // Repulsion (Coulomb's law) — O(n²)
        for (let i = 0; i < simNodes.length; i++) {
          for (let j = i + 1; j < simNodes.length; j++) {
            const a = simNodes[i]
            const b = simNodes[j]
            const dx = a.x - b.x
            const dy = a.y - b.y
            const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
            const repulsionForce = (1200 * alpha) / (dist * dist)
            const fx = (dx / dist) * repulsionForce
            const fy = (dy / dist) * repulsionForce
            if (a.id !== dragRef.current) { a.vx += fx * 0.08; a.vy += fy * 0.08 }
            if (b.id !== dragRef.current) { b.vx -= fx * 0.08; b.vy -= fy * 0.08 }
          }
        }

        // Spring force (Hooke's law) along edges
        for (const edge of edges) {
          const src = nodeMap.get(edge.source)
          const tgt = nodeMap.get(edge.target)
          if (!src || !tgt) continue
          const dx = tgt.x - src.x
          const dy = tgt.y - src.y
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
          const idealLen = 140
          const force = (dist - idealLen) * 0.004 * edge.weight * alpha
          const fx = (dx / dist) * force
          const fy = (dy / dist) * force
          if (src.id !== dragRef.current) { src.vx += fx; src.vy += fy }
          if (tgt.id !== dragRef.current) { tgt.vx -= fx; tgt.vy -= fy }
        }

        // Center gravity + damping
        for (const node of simNodes) {
          if (node.id === dragRef.current) { node.vx = 0; node.vy = 0; continue }
          node.vx += (width / 2 - node.x) * 0.0004 * alpha
          node.vy += (height / 2 - node.y) * 0.0004 * alpha
          node.vx *= 0.82
          node.vy *= 0.82
          node.x += node.vx
          node.y += node.vy
          node.x = Math.max(30, Math.min(width - 30, node.x))
          node.y = Math.max(30, Math.min(height - 30, node.y))
        }
      }

      // ── Render ──
      const zoom = zoomRef.current
      const pan = panRef.current

      ctx.save()
      ctx.clearRect(0, 0, width, height)

      // Apply zoom centered on the canvas center
      ctx.translate(pan.x, pan.y)
      ctx.translate(width / 2, height / 2)
      ctx.scale(zoom, zoom)
      ctx.translate(-width / 2, -height / 2)

      const hovered = hoveredNodeRef.current
      const connectedSet = new Set<string>()
      if (hovered) {
        connectedSet.add(hovered)
        edges.forEach(e => {
          if (e.source === hovered) connectedSet.add(e.target)
          if (e.target === hovered) connectedSet.add(e.source)
        })
      }

      // Draw edges
      edges.forEach(edge => {
        const src = nodeMap.get(edge.source)
        const tgt = nodeMap.get(edge.target)
        if (!src || !tgt) return

        const isHighlighted = hovered && (edge.source === hovered || edge.target === hovered)
        const isDimmed = hovered && !isHighlighted

        ctx.beginPath()
        ctx.moveTo(src.x, src.y)
        ctx.lineTo(tgt.x, tgt.y)

        if (isHighlighted) {
          ctx.strokeStyle = '#10b981'
          ctx.lineWidth = Math.min(edge.weight * 1.5, 4)
          ctx.globalAlpha = 0.8
        } else if (isDimmed) {
          ctx.strokeStyle = '#555'
          ctx.lineWidth = 1
          ctx.globalAlpha = 0.12
        } else {
          const gradient = ctx.createLinearGradient(src.x, src.y, tgt.x, tgt.y)
          gradient.addColorStop(0, src.color + '66')
          gradient.addColorStop(1, tgt.color + '66')
          ctx.strokeStyle = gradient
          ctx.lineWidth = Math.min(edge.weight * 1.2, 3)
          ctx.globalAlpha = 0.5
        }

        ctx.stroke()
        ctx.globalAlpha = 1
      })

      // Draw nodes
      simNodes.forEach(node => {
        const r = node.size * 6 + 8
        const isHoveredNode = hovered === node.id
        const isConnected = !hovered || connectedSet.has(node.id)
        const isDimmed = hovered && !isConnected

        ctx.globalAlpha = isDimmed ? 0.12 : 1

        // Glow effect on hover
        if (isHoveredNode) {
          ctx.beginPath()
          ctx.arc(node.x, node.y, r + 10, 0, Math.PI * 2)
          const glowGrad = ctx.createRadialGradient(node.x, node.y, r, node.x, node.y, r + 10)
          glowGrad.addColorStop(0, node.color + '44')
          glowGrad.addColorStop(1, node.color + '00')
          ctx.fillStyle = glowGrad
          ctx.fill()
        }

        // Node shadow
        ctx.beginPath()
        ctx.arc(node.x, node.y + 2, r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(0,0,0,0.2)'
        ctx.fill()

        // Node circle
        ctx.beginPath()
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2)
        const nodeGrad = ctx.createRadialGradient(node.x - r * 0.3, node.y - r * 0.3, r * 0.1, node.x, node.y, r)
        nodeGrad.addColorStop(0, node.color + 'ff')
        nodeGrad.addColorStop(1, node.color + 'cc')
        ctx.fillStyle = nodeGrad
        ctx.fill()

        // Border
        ctx.strokeStyle = isHoveredNode ? '#ffffff' : node.color + '88'
        ctx.lineWidth = isHoveredNode ? 2.5 : 1.5
        ctx.stroke()

        // Label inside the circle
        if (r > 14) {
          ctx.fillStyle = '#ffffff'
          const fontSize = Math.min(r * 0.5, 11)
          ctx.font = `${isHoveredNode ? 'bold ' : ''}${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          const maxChars = Math.floor(r / (fontSize * 0.45))
          const displayName = node.label.length > maxChars
            ? node.label.slice(0, maxChars - 1) + '…'
            : node.label
          ctx.fillText(displayName, node.x, node.y)
        }

        ctx.globalAlpha = 1
      })

      // Draw labels below nodes
      if (showLabels) {
        simNodes.forEach(node => {
          const r = node.size * 6 + 8
          const isConnected = !hovered || connectedSet.has(node.id)
          const isDimmed = hovered && !isConnected

          ctx.globalAlpha = isDimmed ? 0.08 : 0.7
          ctx.fillStyle = '#ccc'
          ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText(node.label, node.x, node.y + r + 14)
          ctx.globalAlpha = 1
        })
      }

      ctx.restore()

      animRef.current = requestAnimationFrame(tick)
    }

    animRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animRef.current)
  }, [edges, width, height, showLabels, physicsEnabled])

  // Mouse interaction — screen to world coordinate transform
  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const zoom = zoomRef.current
    const pan = panRef.current
    const scaleX = width / rect.width
    const scaleY = height / rect.height
    // Invert: canvas center + (screen - canvas center - pan) / zoom
    const cx = width / 2
    const cy = height / 2
    const dx = ((screenX - rect.left) * scaleX - pan.x - cx) / zoom + cx
    const dy = ((screenY - rect.top) * scaleY - pan.y - cy) / zoom + cy
    return { x: dx, y: dy }
  }, [width, height])

  const findNodeAt = useCallback((wx: number, wy: number) => {
    for (let i = simNodesRef.current.length - 1; i >= 0; i--) {
      const n = simNodesRef.current[i]
      const r = n.size * 6 + 8
      const dx = wx - n.x
      const dy = wy - n.y
      if (dx * dx + dy * dy <= (r + 4) * (r + 4)) return n
    }
    return null
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = screenToWorld(e.clientX, e.clientY)
    const node = findNodeAt(x, y)

    if (node) {
      dragRef.current = node.id
    } else {
      panStartRef.current = { sx: e.clientX, sy: e.clientY, px: panRef.current.x, py: panRef.current.y }
    }
  }, [screenToWorld, findNodeAt])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragRef.current) {
      const { x, y } = screenToWorld(e.clientX, e.clientY)
      const node = simNodesRef.current.find(n => n.id === dragRef.current)
      if (node) {
        node.x = x
        node.y = y
        node.vx = 0
        node.vy = 0
      }
      setTooltip({ x: e.nativeEvent.offsetX + 15, y: e.nativeEvent.offsetY - 10, node: simNodesRef.current.find(n => n.id === dragRef.current)! })
    } else if (panStartRef.current) {
      const dx = e.clientX - panStartRef.current.sx
      const dy = e.clientY - panStartRef.current.sy
      panRef.current = {
        x: panStartRef.current.px + dx,
        y: panStartRef.current.py + dy,
      }
    } else {
      // Hover detection
      const { x, y } = screenToWorld(e.clientX, e.clientY)
      const node = findNodeAt(x, y)
      setHoveredNode(node?.id ?? null)
      if (node) {
        setTooltip({ x: e.nativeEvent.offsetX + 15, y: e.nativeEvent.offsetY - 10, node })
      } else {
        setTooltip(null)
      }
    }
  }, [screenToWorld, findNodeAt])

  const handleMouseUp = useCallback(() => {
    if (dragRef.current) {
      setTooltip(null)
    }
    dragRef.current = null
    panStartRef.current = null
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const delta = e.deltaY * 0.001
    const newZoom = Math.max(0.3, Math.min(3, zoomRef.current - delta))
    // Zoom towards mouse position
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = (e.clientX - rect.left) * (width / rect.width)
    const my = (e.clientY - rect.top) * (height / rect.height)
    const oldZoom = zoomRef.current
    const ratio = newZoom / oldZoom
    // Adjust pan to zoom toward mouse
    panRef.current.x = mx - ratio * (mx - panRef.current.x)
    panRef.current.y = my - ratio * (my - panRef.current.y)
    zoomRef.current = newZoom
  }, [width, height])

  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = screenToWorld(e.clientX, e.clientY)
    const node = findNodeAt(x, y)
    if (node) {
      setHoveredNode(prev => prev === node.id ? null : node.id)
    }
  }, [screenToWorld, findNodeAt])

  const handleReset = useCallback(() => {
    simNodesRef.current = nodes.map(n => ({
      id: n.id,
      label: n.label,
      color: n.color,
      size: n.size,
      meetings: n.meetings || 0,
      messages: n.messages || 0,
      x: width / 2 + (Math.random() - 0.5) * width * 0.6,
      y: height / 2 + (Math.random() - 0.5) * height * 0.6,
      vx: 0,
      vy: 0,
    }))
    zoomRef.current = 1
    panRef.current = { x: 0, y: 0 }
    setHoveredNode(null)
    setTooltip(null)
    setPhysicsEnabled(true)
  }, [nodes, width, height])

  const handleExportPng = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const a = document.createElement('a')
    a.download = 'force-graph.png'
    a.href = canvas.toDataURL('image/png')
    a.click()
  }, [])

  return (
    <div ref={containerRef} className="vl-inner rounded-xl p-4 relative">
      {/* Controls */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold vl-text-heading flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400" />
          Collaboration Network
        </h3>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowLabels(v => !v)}
            className={`text-[10px] px-2 py-1 rounded-md border transition-colors flex items-center gap-1 ${
              showLabels
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
            }`}
          >
            <Tag className="size-3" /> Labels
          </button>
          <button
            onClick={() => setPhysicsEnabled(v => !v)}
            className={`text-[10px] px-2 py-1 rounded-md border transition-colors ${
              physicsEnabled
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
            }`}
          >
            {physicsEnabled ? 'Physics On' : 'Physics Off'}
          </button>
          <button
            onClick={handleReset}
            className="text-[10px] px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors flex items-center gap-1"
          >
            <RotateCcw className="size-3" /> Reset
          </button>
          <button
            onClick={handleExportPng}
            className="text-[10px] px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors flex items-center gap-1"
          >
            <Download className="size-3" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: 'auto', aspectRatio: `${width}/${height}` }}
        className="rounded-lg cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
      />

      {/* Tooltip */}
      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute pointer-events-none z-10 px-3 py-2 rounded-lg text-[10px] border"
            style={{
              left: Math.min(tooltip.x, (containerRef.current?.clientWidth || width) - 160),
              top: Math.max(tooltip.y, 4),
              background: 'var(--vl-bg-secondary, #1e293b)',
              borderColor: 'var(--vl-border, rgba(255,255,255,0.08))',
              color: 'var(--vl-text-heading, #f1f5f9)',
            }}
          >
            <p className="font-semibold text-xs" style={{ color: tooltip.node.color }}>{tooltip.node.label}</p>
            {tooltip.node.meetings > 0 && <p className="vl-text-muted">Meetings: {tooltip.node.meetings}</p>}
            {tooltip.node.messages > 0 && <p className="vl-text-muted">Messages: {tooltip.node.messages}</p>}
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-[10px] vl-text-muted text-center mt-2">
        Drag nodes · Scroll to zoom · Double-click to pin · Background drag to pan
      </p>
    </div>
  )
}

// ============================================================
// Demo Data Generator
// ============================================================

export function generateForceGraphDemoData() {
  const nodes: ForceNodeData[] = [
    { id: 'pi', label: 'PI Lead', color: '#8b5cf6', size: 3, meetings: 12, messages: 85 },
    { id: 'critic', label: 'Scientist', color: '#ec4899', size: 2.5, meetings: 10, messages: 72 },
    { id: 'analyst', label: 'Analyst', color: '#14b8a6', size: 2.2, meetings: 8, messages: 56 },
    { id: 'reporter', label: 'Reporter', color: '#f97316', size: 1.8, meetings: 7, messages: 45 },
    { id: 'dev', label: 'Developer', color: '#06b6d4', size: 2, meetings: 9, messages: 63 },
    { id: 'reviewer', label: 'Reviewer', color: '#10b981', size: 1.5, meetings: 5, messages: 34 },
    { id: 'student', label: 'Student', color: '#f59e0b', size: 1.2, meetings: 4, messages: 22 },
    { id: 'pm', label: 'PM', color: '#ef4444', size: 1.6, meetings: 6, messages: 38 },
  ]
  const edges: ForceEdgeData[] = [
    { source: 'pi', target: 'critic', weight: 3 },
    { source: 'pi', target: 'analyst', weight: 2.5 },
    { source: 'pi', target: 'reporter', weight: 2 },
    { source: 'pi', target: 'dev', weight: 2 },
    { source: 'pi', target: 'pm', weight: 1.5 },
    { source: 'critic', target: 'analyst', weight: 2 },
    { source: 'critic', target: 'reviewer', weight: 1.8 },
    { source: 'analyst', target: 'dev', weight: 2.5 },
    { source: 'analyst', target: 'reporter', weight: 1.5 },
    { source: 'dev', target: 'reviewer', weight: 1.2 },
    { source: 'dev', target: 'student', weight: 1.8 },
    { source: 'reviewer', target: 'student', weight: 1 },
    { source: 'pm', target: 'reporter', weight: 2 },
    { source: 'pm', target: 'dev', weight: 1.5 },
  ]
  return { nodes, edges }
}
