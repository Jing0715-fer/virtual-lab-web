'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RotateCcw, Download, ZoomIn, Info } from 'lucide-react'
import { t } from '@/lib/i18n'

// ============================================================
// Types
// ============================================================

export interface NetworkNode {
  id: string
  label: string
  color: string
  participationCount: number
  messages: number
}

export interface NetworkEdge {
  source: string
  target: string
  sharedMeetings: number
}

export interface NetworkGraphProps {
  nodes: NetworkNode[]
  edges: NetworkEdge[]
  width?: number
  height?: number
}

interface SimNode {
  id: string
  label: string
  color: string
  participationCount: number
  messages: number
  x: number
  y: number
  vx: number
  vy: number
  radius: number
}

interface ForceParams {
  repulsion: number
  attraction: number
  centering: number
  damping: number
}

// ============================================================
// Default Force Parameters
// ============================================================

const DEFAULT_FORCE: ForceParams = {
  repulsion: 1500,
  attraction: 0.005,
  centering: 0.0005,
  damping: 0.82,
}

// ============================================================
// Demo Data
// ============================================================

export function generateNetworkGraphDemoData() {
  const nodes: NetworkNode[] = [
    { id: 'pi', label: 'PI Lead', color: '#8b5cf6', participationCount: 14, messages: 92 },
    { id: 'critic', label: 'Critic', color: '#ec4899', participationCount: 11, messages: 78 },
    { id: 'analyst', label: 'Analyst', color: '#14b8a6', participationCount: 9, messages: 58 },
    { id: 'reporter', label: 'Reporter', color: '#f97316', participationCount: 7, messages: 42 },
    { id: 'dev', label: 'Developer', color: '#06b6d4', participationCount: 10, messages: 65 },
    { id: 'reviewer', label: 'Reviewer', color: '#10b981', participationCount: 6, messages: 35 },
    { id: 'student', label: 'Student', color: '#f59e0b', participationCount: 4, messages: 22 },
    { id: 'pm', label: 'PM', color: '#ef4444', participationCount: 8, messages: 48 },
    { id: 'ml', label: 'ML Eng', color: '#a78bfa', participationCount: 5, messages: 30 },
    { id: 'bio', label: 'Biochemist', color: '#34d399', participationCount: 7, messages: 40 },
  ]
  const edges: NetworkEdge[] = [
    { source: 'pi', target: 'critic', sharedMeetings: 8 },
    { source: 'pi', target: 'analyst', sharedMeetings: 6 },
    { source: 'pi', target: 'reporter', sharedMeetings: 4 },
    { source: 'pi', target: 'dev', sharedMeetings: 5 },
    { source: 'pi', target: 'pm', sharedMeetings: 3 },
    { source: 'pi', target: 'ml', sharedMeetings: 3 },
    { source: 'critic', target: 'analyst', sharedMeetings: 5 },
    { source: 'critic', target: 'reviewer', sharedMeetings: 4 },
    { source: 'critic', target: 'bio', sharedMeetings: 3 },
    { source: 'analyst', target: 'dev', sharedMeetings: 6 },
    { source: 'analyst', target: 'reporter', sharedMeetings: 3 },
    { source: 'dev', target: 'reviewer', sharedMeetings: 2 },
    { source: 'dev', target: 'student', sharedMeetings: 4 },
    { source: 'dev', target: 'ml', sharedMeetings: 3 },
    { source: 'reviewer', target: 'student', sharedMeetings: 2 },
    { source: 'pm', target: 'reporter', sharedMeetings: 5 },
    { source: 'pm', target: 'dev', sharedMeetings: 4 },
    { source: 'bio', target: 'analyst', sharedMeetings: 3 },
    { source: 'bio', target: 'critic', sharedMeetings: 4 },
    { source: 'ml', target: 'dev', sharedMeetings: 3 },
  ]
  return { nodes, edges }
}

// ============================================================
// Network Graph Component
// ============================================================

export function NetworkGraph({ nodes, edges, width = 800, height = 500 }: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animRef = useRef<number>(0)
  const simNodesRef = useRef<SimNode[]>([])
  const dragRef = useRef<string | null>(null)
  const panRef = useRef({ x: 0, y: 0 })
  const zoomRef = useRef(1)
  const panStartRef = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: SimNode } | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [forceParams, setForceParams] = useState<ForceParams>(DEFAULT_FORCE)
  const [animated, setAnimated] = useState(false)
  const [edgeProgress, setEdgeProgress] = useState(0)

  // Initialize simulation nodes
  useEffect(() => {
    const maxParticipation = Math.max(...nodes.map(n => n.participationCount), 1)
    const initialized: SimNode[] = nodes.map((n) => ({
      id: n.id,
      label: n.label,
      color: n.color,
      participationCount: n.participationCount,
      messages: n.messages,
      x: n.participationCount > 0 ? width / 2 + (Math.random() - 0.5) * width * 0.5 : width / 2,
      y: height / 2 + (Math.random() - 0.5) * height * 0.5,
      vx: 0,
      vy: 0,
      radius: 10 + (n.participationCount / maxParticipation) * 20,
    }))
    simNodesRef.current = initialized
    setAnimated(true)
  }, [nodes, width, height])

  // Animated edge drawing
  useEffect(() => {
    if (!animated) return
    let frame = 0
    const totalFrames = 60
    const step = () => {
      frame++
      setEdgeProgress(Math.min(frame / totalFrames, 1))
      if (frame < totalFrames) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [animated])

  // Physics simulation
  useEffect(() => {
    const simNodes = simNodesRef.current
    if (simNodes.length === 0) return
    let alpha = 1

    const tick = () => {
      const nodeMap = new Map(simNodes.map(n => [n.id, n]))
      if (alpha > 0.001) {
        alpha *= 0.995

        // Repulsion
        for (let i = 0; i < simNodes.length; i++) {
          for (let j = i + 1; j < simNodes.length; j++) {
            const a = simNodes[i]
            const b = simNodes[j]
            const dx = a.x - b.x
            const dy = a.y - b.y
            const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
            const repForce = (forceParams.repulsion * alpha) / (dist * dist)
            const fx = (dx / dist) * repForce
            const fy = (dy / dist) * repForce
            if (a.id !== dragRef.current) { a.vx += fx * 0.08; a.vy += fy * 0.08 }
            if (b.id !== dragRef.current) { b.vx -= fx * 0.08; b.vy -= fy * 0.08 }
          }
        }

        // Spring force along edges
        for (const edge of edges) {
          const src = nodeMap.get(edge.source)
          const tgt = nodeMap.get(edge.target)
          if (!src || !tgt) continue
          const dx = tgt.x - src.x
          const dy = tgt.y - src.y
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
          const idealLen = 160
          const force = (dist - idealLen) * forceParams.attraction * edge.sharedMeetings * alpha
          const fx = (dx / dist) * force
          const fy = (dy / dist) * force
          if (src.id !== dragRef.current) { src.vx += fx; src.vy += fy }
          if (tgt.id !== dragRef.current) { tgt.vx -= fx; tgt.vy -= fy }
        }

        // Center gravity + damping
        for (const node of simNodes) {
          if (node.id === dragRef.current) { node.vx = 0; node.vy = 0; continue }
          node.vx += (width / 2 - node.x) * forceParams.centering * alpha
          node.vy += (height / 2 - node.y) * forceParams.centering * alpha
          node.vx *= forceParams.damping
          node.vy *= forceParams.damping
          node.x += node.vx
          node.y += node.vy
          node.x = Math.max(node.radius, Math.min(width - node.radius, node.x))
          node.y = Math.max(node.radius, Math.min(height - node.radius, node.y))
        }
      }

      animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animRef.current)
  }, [edges, width, height, forceParams])

  // Coordinate transforms
  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    const zoom = zoomRef.current
    const pan = panRef.current
    const scaleX = width / rect.width
    const scaleY = height / rect.height
    const cx = width / 2
    const cy = height / 2
    const dx = ((screenX - rect.left) * scaleX - pan.x - cx) / zoom + cx
    const dy = ((screenY - rect.top) * scaleY - pan.y - cy) / zoom + cy
    return { x: dx, y: dy }
  }, [width, height])

  const findNodeAt = useCallback((wx: number, wy: number) => {
    for (let i = simNodesRef.current.length - 1; i >= 0; i--) {
      const n = simNodesRef.current[i]
      const dx = wx - n.x
      const dy = wy - n.y
      if (dx * dx + dy * dy <= (n.radius + 4) * (n.radius + 4)) return n
    }
    return null
  }, [])

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const { x, y } = screenToWorld(e.clientX, e.clientY)
    const node = findNodeAt(x, y)
    if (node) {
      dragRef.current = node.id
    } else {
      panStartRef.current = { sx: e.clientX, sy: e.clientY, px: panRef.current.x, py: panRef.current.y }
    }
  }, [screenToWorld, findNodeAt])

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (dragRef.current) {
      const { x, y } = screenToWorld(e.clientX, e.clientY)
      const node = simNodesRef.current.find(n => n.id === dragRef.current)
      if (node) {
        node.x = x
        node.y = y
        node.vx = 0
        node.vy = 0
      }
      const rect = svgRef.current?.getBoundingClientRect()
      if (rect) {
        const px = e.clientX - rect.left
        const py = e.clientY - rect.top
        const found = simNodesRef.current.find(n => n.id === dragRef.current)
        if (found) setTooltip({ x: px + 15, y: py - 10, node: found })
      }
    } else if (panStartRef.current) {
      panRef.current = {
        x: panStartRef.current.px + (e.clientX - panStartRef.current.sx),
        y: panStartRef.current.py + (e.clientY - panStartRef.current.sy),
      }
    } else {
      const { x, y } = screenToWorld(e.clientX, e.clientY)
      const node = findNodeAt(x, y)
      setHoveredNode(node?.id ?? null)
      if (node) {
        const rect = svgRef.current?.getBoundingClientRect()
        if (rect) {
          setTooltip({ x: e.clientX - rect.left + 15, y: e.clientY - rect.top - 10, node })
        }
      } else {
        setTooltip(null)
      }
    }
  }, [screenToWorld, findNodeAt])

  const handleMouseUp = useCallback(() => {
    dragRef.current = null
    panStartRef.current = null
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault()
    const delta = e.deltaY * 0.001
    const newZoom = Math.max(0.3, Math.min(4, zoomRef.current - delta))
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const mx = (e.clientX - rect.left) * (width / rect.width)
    const my = (e.clientY - rect.top) * (height / rect.height)
    const ratio = newZoom / zoomRef.current
    panRef.current.x = mx - ratio * (mx - panRef.current.x)
    panRef.current.y = my - ratio * (my - panRef.current.y)
    zoomRef.current = newZoom
  }, [width, height])

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNode(prev => prev === nodeId ? null : nodeId)
  }, [])

  const handleReset = useCallback(() => {
    const maxParticipation = Math.max(...nodes.map(n => n.participationCount), 1)
    simNodesRef.current = nodes.map((n) => ({
      id: n.id,
      label: n.label,
      color: n.color,
      participationCount: n.participationCount,
      messages: n.messages,
      x: width / 2 + (Math.random() - 0.5) * width * 0.5,
      y: height / 2 + (Math.random() - 0.5) * height * 0.5,
      vx: 0,
      vy: 0,
      radius: 10 + (n.participationCount / maxParticipation) * 20,
    }))
    zoomRef.current = 1
    panRef.current = { x: 0, y: 0 }
    setHoveredNode(null)
    setTooltip(null)
    setSelectedNode(null)
    setEdgeProgress(0)
    setTimeout(() => setAnimated(true), 50)
  }, [nodes, width, height])

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    const touch = e.touches[0]
    if (!touch) return
    const { x, y } = screenToWorld(touch.clientX, touch.clientY)
    const node = findNodeAt(x, y)
    if (node) {
      dragRef.current = node.id
      e.preventDefault()
    } else {
      panStartRef.current = { sx: touch.clientX, sy: touch.clientY, px: panRef.current.x, py: panRef.current.y }
    }
  }, [screenToWorld, findNodeAt])

  const handleTouchMove = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    const touch = e.touches[0]
    if (!touch) return
    if (dragRef.current) {
      e.preventDefault()
      const { x, y } = screenToWorld(touch.clientX, touch.clientY)
      const node = simNodesRef.current.find(n => n.id === dragRef.current)
      if (node) { node.x = x; node.y = y; node.vx = 0; node.vy = 0 }
    } else if (panStartRef.current) {
      e.preventDefault()
      panRef.current = {
        x: panStartRef.current.px + (touch.clientX - panStartRef.current.sx),
        y: panStartRef.current.py + (touch.clientY - panStartRef.current.sy),
      }
    }
  }, [screenToWorld])

  const handleTouchEnd = useCallback(() => {
    dragRef.current = null
    panStartRef.current = null
  }, [])

  // Connected edges/nodes for selected node sidebar
  const selectedConnections = useMemo(() => {
    if (!selectedNode) return null
    const connectedNodes = new Set<string>()
    const connectionEdges: NetworkEdge[] = []
    edges.forEach(e => {
      if (e.source === selectedNode) { connectedNodes.add(e.target); connectionEdges.push(e) }
      if (e.target === selectedNode) { connectedNodes.add(e.source); connectionEdges.push(e) }
    })
    const node = simNodesRef.current.find(n => n.id === selectedNode)
    return { node, connectedNodes: Array.from(connectedNodes), connectionEdges }
  }, [selectedNode, edges])

  // Minimap data
  const minimapNodes = useMemo(() => simNodesRef.current, [hoveredNode, selectedNode])
  const minimapWidth = 120
  const minimapHeight = 90

  return (
    <div ref={containerRef} className="viz-network-container vl-inner rounded-xl p-4">
      {/* Controls */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-xs font-semibold vl-text-heading flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          {t('en', 'viz.network.title') || 'Agent Collaboration Network'}
        </h3>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setForceParams(prev => ({ ...prev, repulsion: prev.repulsion * 1.2 }))}
            className="text-[10px] px-2 py-1 rounded-md bg-gray-500/10 text-gray-400 border border-gray-500/20 hover:bg-gray-500/20 transition-colors"
            title="Increase repulsion"
          >
            <ZoomIn className="size-3" />
          </button>
          <button
            onClick={handleReset}
            className="text-[10px] px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors flex items-center gap-1"
          >
            <RotateCcw className="size-3" /> Reset
          </button>
        </div>
      </div>

      <div className="flex gap-3 relative" style={{ minHeight: height }}>
        {/* Main SVG */}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="flex-1 rounded-lg cursor-grab active:cursor-grabbing select-none"
          style={{ width: '100%', height: 'auto' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { handleMouseUp(); setTooltip(null); setHoveredNode(null) }}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <defs>
            {simNodesRef.current.map(node => (
              <radialGradient key={`glow-${node.id}`} id={`glow-${node.id}`}>
                <stop offset="0%" stopColor={node.color} stopOpacity="0.3" />
                <stop offset="100%" stopColor={node.color} stopOpacity="0" />
              </radialGradient>
            ))}
          </defs>

          <g transform={`translate(${panRef.current.x + width / 2}, ${panRef.current.y + height / 2}) scale(${zoomRef.current}) translate(${-width / 2}, ${-height / 2})`}>
            {/* Edges */}
            {edges.map((edge, idx) => {
              const src = simNodesRef.current.find(n => n.id === edge.source)
              const tgt = simNodesRef.current.find(n => n.id === edge.target)
              if (!src || !tgt) return null
              const isHighlighted = (hoveredNode === edge.source || hoveredNode === edge.target) || (selectedNode === edge.source || selectedNode === edge.target)
              const isDimmed = (hoveredNode && !isHighlighted) || (selectedNode && selectedNode !== edge.source && selectedNode !== edge.target)

              // Animated dash for initial draw
              const dashLen = Math.sqrt((src.x - tgt.x) ** 2 + (src.y - tgt.y) ** 2) * 2
              const animOffset = dashLen * (1 - edgeProgress)

              return (
                <line
                  key={`edge-${idx}`}
                  x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                  stroke={isHighlighted ? '#10b981' : 'rgba(255,255,255,0.12)'}
                  strokeWidth={Math.max(1, Math.min(edge.sharedMeetings * 0.8, 4))}
                  opacity={isDimmed ? 0.05 : isHighlighted ? 0.7 : 0.3}
                  strokeDasharray={animOffset}
                  strokeDashoffset={0}
                  className="transition-all duration-300"
                />
              )
            })}

            {/* Nodes */}
            {simNodesRef.current.map(node => {
              const isHovered = hoveredNode === node.id
              const isSelected = selectedNode === node.id
              const isConnectedToSelected = selectedNode && (
                edges.some(e => (e.source === selectedNode && e.target === node.id) || (e.target === selectedNode && e.source === node.id))
              )
              const isDimmed = (hoveredNode && hoveredNode !== node.id && !edges.some(e => (e.source === hoveredNode && e.target === node.id) || (e.target === hoveredNode && e.source === node.id)))
                || (selectedNode && !isSelected && !isConnectedToSelected && selectedNode !== node.id)

              return (
                <g key={node.id} className="viz-network-node" opacity={isDimmed ? 0.1 : 1}>
                  {/* Glow */}
                  {isHovered && (
                    <circle cx={node.x} cy={node.y} r={node.radius + 12} fill={`url(#glow-${node.id})`} className="viz-network-node-glow" />
                  )}
                  {/* Shadow */}
                  <circle cx={node.x} cy={node.y + 2} r={node.radius} fill="rgba(0,0,0,0.25)" />
                  {/* Main circle */}
                  <circle
                    cx={node.x} cy={node.y} r={node.radius}
                    fill={node.color}
                    stroke={isHovered || isSelected ? '#ffffff' : `${node.color}88`}
                    strokeWidth={isHovered || isSelected ? 2.5 : 1.5}
                    onClick={() => handleNodeClick(node.id)}
                  />
                  {/* Label inside circle */}
                  {node.radius > 16 && (
                    <text
                      x={node.x} y={node.y}
                      textAnchor="middle" dominantBaseline="middle"
                      fill="#ffffff"
                      fontSize={Math.min(node.radius * 0.4, 11)}
                      fontWeight={isHovered ? 'bold' : 'normal'}
                      style={{ pointerEvents: 'none' }}
                    >
                      {node.label.length > Math.floor(node.radius / 4) ? node.label.slice(0, Math.floor(node.radius / 4) - 1) + '…' : node.label}
                    </text>
                  )}
                  {/* Label below circle */}
                  <text
                    x={node.x} y={node.y + node.radius + 14}
                    textAnchor="middle" dominantBaseline="hanging"
                    fill="#94a3b8" fontSize="10"
                    style={{ pointerEvents: 'none' }}
                  >
                    {node.label}
                  </text>
                </g>
              )
            })}
          </g>
        </svg>

        {/* Tooltip */}
        <AnimatePresence>
          {tooltip && tooltip.node && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="viz-network-tooltip"
              style={{
                left: Math.min(tooltip.x, (containerRef.current?.clientWidth || width) - 180),
                top: Math.max(tooltip.y, 4),
              }}
            >
              <p className="font-semibold" style={{ color: tooltip.node.color }}>{tooltip.node.label}</p>
              <p className="text-[10px] mt-1">Meetings: {tooltip.node.participationCount}</p>
              <p className="text-[10px]">Messages: {tooltip.node.messages}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Minimap */}
        <div className="viz-network-minimap">
          <svg viewBox={`0 0 ${width} ${height}`} width={minimapWidth} height={minimapHeight}>
            {edges.map((edge, idx) => {
              const src = minimapNodes.find(n => n.id === edge.source)
              const tgt = minimapNodes.find(n => n.id === edge.target)
              if (!src || !tgt) return null
              return <line key={idx} x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y} stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />
            })}
            {minimapNodes.map(node => (
              <circle key={node.id} cx={node.x} cy={node.y} r={3} fill={node.color} />
            ))}
            {/* Viewport rectangle */}
            <rect
              className="viz-network-minimap-viewport"
              x={(width / 2 - panRef.current.x / zoomRef.current - width / (2 * zoomRef.current))}
              y={(height / 2 - panRef.current.y / zoomRef.current - height / (2 * zoomRef.current))}
              width={width / zoomRef.current}
              height={height / zoomRef.current}
            />
          </svg>
        </div>

        {/* Legend */}
        <div className="viz-network-legend">
          <div className="flex items-center gap-2 mb-1">
            <Info className="size-3" />
            <span className="font-medium text-[10px]" style={{ color: 'var(--vl-text-heading, #fff)' }}>Legend</span>
          </div>
          <div className="flex items-center gap-2 mb-0.5">
            <circle cx="6" cy="6" r="4" fill="#8b5cf6" />
            <span>Node size = Participation</span>
          </div>
          <div className="flex items-center gap-2 mb-0.5">
            <line x1="2" y1="6" x2="10" y2="6" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
            <span>Edge width = Shared meetings</span>
          </div>
          <div className="text-[9px] mt-1" style={{ color: 'var(--vl-text-muted, #64748b)' }}>
            Drag: nodes | Scroll: zoom
          </div>
        </div>
      </div>

      {/* Selected node sidebar */}
      <AnimatePresence>
        {selectedConnections && selectedConnections.node && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 overflow-hidden"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ background: selectedConnections.node.color }} />
              <span className="text-xs font-semibold vl-text-heading">{selectedConnections.node.label}</span>
              <span className="text-[10px] vl-text-muted">{selectedConnections.node.participationCount} meetings · {selectedConnections.node.messages} messages</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {selectedConnections.connectedNodes.map(cid => {
                const cn = simNodesRef.current.find(n => n.id === cid)
                if (!cn) return null
                return (
                  <span key={cid} className="text-[10px] px-2 py-0.5 rounded-full border" style={{ borderColor: cn.color + '44', color: cn.color }}>
                    {cn.label}
                  </span>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-[10px] vl-text-muted text-center mt-2">
        Drag nodes to reposition · Scroll to zoom · Click node for details
      </p>
    </div>
  )
}
