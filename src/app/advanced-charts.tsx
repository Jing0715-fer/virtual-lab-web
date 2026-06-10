'use client'

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

// ============================================================
// Types
// ============================================================

export interface SankeyNode {
  id: string
  label: string
  color: string
}

export interface SankeyLink {
  source: string
  target: string
  value: number
}

export interface SankeyDiagramProps {
  nodes: SankeyNode[]
  links: SankeyLink[]
  width?: number
  height?: number
  lang?: Lang
}

export interface ForceNode {
  id: string
  label: string
  color: string
  weight?: number
}

export interface ForceEdge {
  source: string
  target: string
  strength?: number
}

export interface ForceDirectedGraphProps {
  nodes: ForceNode[]
  edges: ForceEdge[]
  width?: number
  height?: number
  lang?: Lang
}

export interface GaugeChartProps {
  min?: number
  max?: number
  value?: number
  label?: string
  width?: number
  height?: number
  lang?: Lang
}

export interface RadarAxis {
  label: string
  max?: number
}

export interface RadarDataset {
  label: string
  values: number[]
  color: string
}

export interface RadarChartProps {
  axes: RadarAxis[]
  datasets: RadarDataset[]
  width?: number
  height?: number
  lang?: Lang
}

// ============================================================
// 1. SankeyDiagram — Pure SVG with drag, gradient, animation
// ============================================================

export function SankeyDiagram({ nodes, links, width = 600, height = 400, lang = 'en' }: SankeyDiagramProps) {
  const [mounted, setMounted] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [hoveredLink, setHoveredLink] = useState<number | null>(null)
  const [nodeOffsets, setNodeOffsets] = useState<Record<string, number>>({})
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => { requestAnimationFrame(() => { setMounted(true) }) }, [])

  // Compute column positions (group by source/target depth)
  const layout = useMemo(() => {
    const nodeMap = new Map(nodes.map(n => [n.id, n]))
    const sourceIds = new Set(links.map(l => l.source))
    const targetIds = new Set(links.map(l => l.target))

    const leftNodes: string[] = []
    const rightNodes: string[] = []

    nodes.forEach(n => {
      if (sourceIds.has(n.id) && !targetIds.has(n.id)) leftNodes.push(n.id)
      else if (targetIds.has(n.id) && !sourceIds.has(n.id)) rightNodes.push(n.id)
      else if (sourceIds.has(n.id)) leftNodes.push(n.id)
      else rightNodes.push(n.id)
    })

    const padY = 20
    const nodeWidth = 16
    const gap = (height - padY * 2) / Math.max(leftNodes.length, rightNodes.length, 1)

    const leftPositions = leftNodes.map((id, i) => {
      const node = nodeMap.get(id)!
      const totalValue = links.filter(l => l.source === id).reduce((s, l) => s + l.value, 0)
      const nodeHeight = Math.max((totalValue / Math.max(links.reduce((s, l) => s + l.value, 0), 1)) * (height - padY * 2), 20)
      return { id, x: 40, y: padY + i * gap, w: nodeWidth, h: nodeHeight }
    })

    const rightPositions = rightNodes.map((id, i) => {
      const node = nodeMap.get(id)!
      const totalValue = links.filter(l => l.target === id).reduce((s, l) => s + l.value, 0)
      const nodeHeight = Math.max((totalValue / Math.max(links.reduce((s, l) => s + l.value, 0), 1)) * (height - padY * 2), 20)
      return { id, x: width - 40 - nodeWidth, y: padY + i * gap, w: nodeWidth, h: nodeHeight }
    })

    const allPositions = [...leftPositions, ...rightPositions]
    const posMap = new Map(allPositions.map(p => [p.id, p]))

    // Compute links paths
    const linkPaths = links.map((link, idx) => {
      const srcPos = posMap.get(link.source)
      const tgtPos = posMap.get(link.target)
      if (!srcPos || !tgtPos) return null
      const srcNode = nodeMap.get(link.source)!
      const tgtNode = nodeMap.get(link.target)!
      const totalSrcValue = links.filter(l => l.source === link.source).reduce((s, l) => s + l.value, 0)
      const totalTgtValue = links.filter(l => l.target === link.target).reduce((s, l) => s + l.value, 0)
      const srcRatio = totalSrcValue > 0 ? link.value / totalSrcValue : 0
      const tgtRatio = totalTgtValue > 0 ? link.value / totalTgtValue : 0
      const x0 = srcPos.x + srcPos.w
      const y0 = srcPos.y + srcPos.h * srcRatio * (1 - srcRatio)
      const y1 = y0 + srcPos.h * srcRatio
      const x3 = tgtPos.x
      const y2 = tgtPos.y + tgtPos.h * tgtRatio * (1 - tgtRatio)
      const y3 = y2 + tgtPos.h * tgtRatio
      const cx = (x0 + x3) / 2
      return {
        idx, source: link.source, target: link.target, value: link.value,
        srcColor: srcNode.color, tgtColor: tgtNode.color,
        path: `M${x0},${y0} C${cx},${y0} ${cx},${y2} ${x3},${y2} L${x3},${y3} C${cx},${y3} ${cx},${y1} ${x0},${y1} Z`,
        midY: (y0 + y3) / 2, midX: cx,
      }
    }).filter(Boolean) as Array<{ idx: number; source: string; target: string; value: number; srcColor: string; tgtColor: string; path: string; midY: number; midX: number }>

    return { positions: allPositions, posMap, linkPaths }
  }, [nodes, links, width, height])

  const handleMouseDown = useCallback((id: string) => {
    setDraggingId(id)
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!draggingId || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const y = ((e.clientY - rect.top) / rect.height) * height
    setNodeOffsets(prev => ({ ...prev, [draggingId]: y }))
  }, [draggingId, height])

  const handleMouseUp = useCallback(() => {
    setDraggingId(null)
  }, [])

  const getNodeY = (id: string) => {
    const pos = layout.posMap.get(id)
    if (!pos) return 0
    return nodeOffsets[id] !== undefined ? nodeOffsets[id] : pos.y
  }

  return (
    <div className="vl-inner rounded-xl p-3 relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto select-none"
        preserveAspectRatio="xMidYMid meet"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
          {layout.linkPaths.map(lp => (
            <linearGradient key={`sk-${lp.idx}`} id={`sk-grad-${lp.idx}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={lp.srcColor} stopOpacity={0.7} />
              <stop offset="100%" stopColor={lp.tgtColor} stopOpacity={0.7} />
            </linearGradient>
          ))}
        </defs>

        {/* Links */}
        {layout.linkPaths.map(lp => (
          <g key={`link-${lp.idx}`}>
            <path
              d={lp.path}
              fill={`url(#sk-grad-${lp.idx})`}
              className="cursor-pointer transition-all duration-200"
              style={{
                opacity: mounted ? (hoveredLink === lp.idx ? 0.95 : 0.6) : 0,
                transition: `opacity 0.8s ease ${lp.idx * 0.05}s`,
              }}
              onMouseEnter={() => setHoveredLink(lp.idx)}
              onMouseLeave={() => setHoveredLink(null)}
            />
            {hoveredLink === lp.idx && (
              <g className="pointer-events-none">
                <rect
                  x={lp.midX - 40} y={lp.midY - 14}
                  width={80} height={24} rx={6}
                  fill="var(--vl-bg-secondary)" stroke="var(--vl-border)"
                />
                <text
                  x={lp.midX} y={lp.midY + 1}
                  textAnchor="middle" fill="var(--vl-text-white)"
                  fontSize={10} fontWeight={600}
                >
                  {`Flow: ${lp.value}`}
                </text>
              </g>
            )}
          </g>
        ))}

        {/* Nodes */}
        {layout.positions.map(pos => {
          const y = getNodeY(pos.id)
          return (
            <g key={pos.id}>
              <rect
                x={pos.x} y={y} width={pos.w} height={pos.h}
                rx={4}
                fill={nodes.find(n => n.id === pos.id)?.color || '#10b981'}
                className="cursor-grab active:cursor-grabbing"
                style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.6s ease' }}
                onMouseDown={() => handleMouseDown(pos.id)}
              />
              <text
                x={pos.x < width / 2 ? pos.x - 6 : pos.x + pos.w + 6}
                y={y + pos.h / 2}
                textAnchor={pos.x < width / 2 ? 'end' : 'start'}
                fill="var(--vl-text-white)"
                fontSize={10} fontWeight={500}
                dominantBaseline="middle"
                style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.6s ease 0.3s' }}
              >
                {nodes.find(n => n.id === pos.id)?.label || pos.id}
              </text>
            </g>
          )
        })}
      </svg>
      <p className="text-[10px] vl-text-muted text-center mt-1">{t(lang, 'viz.sankey.dragHint')}</p>
    </div>
  )
}

// ============================================================
// 2. ForceDirectedGraph — SVG with physics simulation
// ============================================================

interface SimNode extends ForceNode {
  x: number
  y: number
  vx: number
  vy: number
}

export function ForceDirectedGraph({ nodes, edges, width = 600, height = 400, lang = 'en' }: ForceDirectedGraphProps) {
  const [mounted, setMounted] = useState(false)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [draggingNode, setDraggingNode] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const [simNodes, setSimNodes] = useState<SimNode[]>([])
  const simNodesRef = useRef<SimNode[]>([])
  const animRef = useRef<number>(0)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => { requestAnimationFrame(() => { setMounted(true) }) }, [])

  // Initialize simulation nodes
  useEffect(() => {
    const initialized = nodes.map((n, i) => ({
      ...n,
      x: width / 2 + (Math.random() - 0.5) * width * 0.5,
      y: height / 2 + (Math.random() - 0.5) * height * 0.5,
      vx: 0,
      vy: 0,
      weight: n.weight ?? 1,
    }))
    simNodesRef.current = initialized
    requestAnimationFrame(() => { setSimNodes(initialized) })
  }, [nodes, width, height])

  // Physics simulation loop
  useEffect(() => {
    if (simNodesRef.current.length === 0) return

    const tick = () => {
      const simNodes = simNodesRef.current
      const nodeMap = new Map(simNodes.map(n => [n.id, n]))

      // Repulsion (Coulomb's law)
      for (let i = 0; i < simNodes.length; i++) {
        for (let j = i + 1; j < simNodes.length; j++) {
          const a = simNodes[i]
          const b = simNodes[j]
          let dx = a.x - b.x
          let dy = a.y - b.y
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
          const force = 800 / (dist * dist)
          const fx = (dx / dist) * force
          const fy = (dy / dist) * force
          if (a.id !== draggingNode) { a.vx += fx * 0.1; a.vy += fy * 0.1 }
          if (b.id !== draggingNode) { b.vx -= fx * 0.1; b.vy -= fy * 0.1 }
        }
      }

      // Spring force (Hooke's law)
      for (const edge of edges) {
        const src = nodeMap.get(edge.source)
        const tgt = nodeMap.get(edge.target)
        if (!src || !tgt) continue
        const dx = tgt.x - src.x
        const dy = tgt.y - src.y
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
        const idealLen = 120
        const strength = edge.strength ?? 1
        const force = (dist - idealLen) * 0.005 * strength
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        if (src.id !== draggingNode) { src.vx += fx; src.vy += fy }
        if (tgt.id !== draggingNode) { tgt.vx -= fx; tgt.vy -= fy }
      }

      // Center gravity + damping
      for (const node of simNodes) {
        if (node.id === draggingNode) { node.vx = 0; node.vy = 0; continue }
        node.vx += (width / 2 - node.x) * 0.0003
        node.vy += (height / 2 - node.y) * 0.0003
        node.vx *= 0.85
        node.vy *= 0.85
        node.x += node.vx
        node.y += node.vy
        // Clamp to bounds
        node.x = Math.max(20, Math.min(width - 20, node.x))
        node.y = Math.max(20, Math.min(height - 20, node.y))
      }

      animRef.current = requestAnimationFrame(tick)
    }

    animRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animRef.current)
  }, [nodes, edges, width, height, draggingNode])

  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault()
    setZoom(z => Math.max(0.3, Math.min(3, z - e.deltaY * 0.001)))
  }, [])

  const handleMouseDownBg = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if ((e.target as Element).tagName === 'rect') {
      panStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
    }
  }, [pan])

  const handleMouseMoveBg = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!panStartRef.current || draggingNode) return
    const dx = e.clientX - panStartRef.current.x
    const dy = e.clientY - panStartRef.current.y
    setPan({ x: panStartRef.current.panX + dx, y: panStartRef.current.panY + dy })
  }, [draggingNode])

  const handleMouseUpBg = useCallback(() => {
    panStartRef.current = null
  }, [])

  const handleNodeDrag = useCallback((e: React.MouseEvent<SVGSVGElement>, id: string) => {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / zoom - pan.x) / zoom + width / 2
    const y = ((e.clientY - rect.top) / zoom - pan.y) / zoom + height / 2
    const node = simNodesRef.current.find(n => n.id === id)
    if (node) { node.x = x; node.y = y }
  }, [zoom, pan, width, height])

  const connectedNodes = useMemo(() => {
    if (!hoveredNode) return new Set<string>()
    const s = new Set<string>([hoveredNode])
    edges.forEach(e => {
      if (e.source === hoveredNode) s.add(e.target)
      if (e.target === hoveredNode) s.add(e.source)
    })
    return s
  }, [hoveredNode, edges])

  return (
    <div className="vl-inner rounded-xl p-3 relative overflow-hidden">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto select-none cursor-grab active:cursor-grabbing"
        preserveAspectRatio="xMidYMid meet"
        onWheel={handleWheel}
        onMouseDown={handleMouseDownBg}
        onMouseMove={(e) => { handleMouseMoveBg(e); if (draggingNode) handleNodeDrag(e, draggingNode) }}
        onMouseUp={() => { handleMouseUpBg(); setDraggingNode(null) }}
        onMouseLeave={() => { handleMouseUpBg(); setDraggingNode(null) }}
      >
        <g transform={`translate(${width / 2 + pan.x}, ${height / 2 + pan.y}) scale(${zoom}) translate(${-width / 2}, ${-height / 2})`}>
          {/* Edges */}
          {edges.map((edge, i) => {
            const src = simNodes.find(n => n.id === edge.source)
            const tgt = simNodes.find(n => n.id === edge.target)
            if (!src || !tgt) return null
            const isHighlighted = hoveredNode && (edge.source === hoveredNode || edge.target === hoveredNode)
            const isDimmed = hoveredNode && !isHighlighted
            return (
              <line
                key={`edge-${i}`}
                x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                stroke={isHighlighted ? '#10b981' : 'var(--vl-border)'}
                strokeWidth={isHighlighted ? 2.5 : (edge.strength ?? 1) * 1.2}
                strokeOpacity={mounted ? (isDimmed ? 0.15 : 0.5) : 0}
                style={{ transition: 'stroke-opacity 0.3s ease' }}
              />
            )
          })}

          {/* Nodes */}
          {simNodes.map(node => {
            const r = (node.weight ?? 1) * 8 + 6
            const isConnected = !hoveredNode || connectedNodes.has(node.id)
            return (
              <g
                key={node.id}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onMouseDown={(e) => { e.stopPropagation(); setDraggingNode(node.id) }}
                className="cursor-pointer"
              >
                <circle
                  cx={node.x} cy={node.y} r={r}
                  fill={node.color}
                  stroke={hoveredNode === node.id ? '#fff' : 'none'}
                  strokeWidth={2}
                  opacity={mounted ? (isConnected ? 1 : 0.2) : 0}
                  style={{ transition: 'opacity 0.6s ease, stroke 0.2s ease' }}
                />
                <text
                  x={node.x} y={node.y + r + 14}
                  textAnchor="middle" fill="var(--vl-text-muted)"
                  fontSize={9} fontWeight={500}
                  opacity={mounted ? (isConnected ? 1 : 0.2) : 0}
                  style={{ transition: 'opacity 0.3s ease' }}
                >
                  {node.label}
                </text>
              </g>
            )
          })}
        </g>
      </svg>
      <p className="text-[10px] vl-text-muted text-center mt-1">{t(lang, 'viz.force.zoomHint')}</p>
    </div>
  )
}

// ============================================================
// 3. GaugeChart — SVG semicircle gauge with animation
// ============================================================

export function GaugeChart({ min = 0, max = 100, value = 72, label = 'Score', width = 300, height = 180, lang = 'en' }: GaugeChartProps) {
  const [animatedValue, setAnimatedValue] = useState(min)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { requestAnimationFrame(() => { setMounted(true) }) }, [])

  useEffect(() => {
    requestAnimationFrame(() => { setAnimatedValue(min) })
    const timer = setTimeout(() => setAnimatedValue(value), 300)
    return () => clearTimeout(timer)
  }, [value, min])

  const range = max - min
  const pct = Math.min(Math.max((animatedValue - min) / range, 0), 1)

  const cx = width / 2
  const cy = height - 20
  const radius = Math.min(width, height) - 40
  const startAngle = Math.PI
  const endAngle = 0
  const needleAngle = startAngle + (endAngle - startAngle) * pct

  const getColor = (p: number) => {
    if (p >= 0.7) return '#10b981'
    if (p >= 0.4) return '#f59e0b'
    return '#ef4444'
  }

  const describeArcPath = (cxP: number, cyP: number, r: number, startDeg: number, endDeg: number) => {
    const startRad = (startDeg - 90) * Math.PI / 180
    const endRad = (endDeg - 90) * Math.PI / 180
    const x1 = cxP + r * Math.cos(startRad)
    const y1 = cyP + r * Math.sin(startRad)
    const x2 = cxP + r * Math.cos(endRad)
    const y2 = cyP + r * Math.sin(endRad)
    const largeArc = endDeg - startDeg > 180 ? 1 : 0
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`
  }

  // Tick marks
  const ticks = useMemo(() => {
    const arr: Array<{ angle: number; label: string }> = []
    for (let i = 0; i <= 10; i++) {
      const p = i / 10
      const angle = Math.PI - p * Math.PI
      arr.push({ angle, label: String(Math.round(min + p * range)) })
    }
    return arr
  }, [min, range])

  return (
    <div className="vl-inner rounded-xl p-3 flex flex-col items-center">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[320px] h-auto">
        <defs>
          <linearGradient id="gauge-zone-red" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.7} />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.7} />
          </linearGradient>
          <linearGradient id="gauge-zone-amber" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.7} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0.7} />
          </linearGradient>
          <linearGradient id="gauge-zone-green" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.7} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0.9} />
          </linearGradient>
        </defs>

        {/* Background arc */}
        <path
          d={describeArcPath(cx, cy, radius, 180, 360)}
          fill="none" stroke="var(--vl-bg-inner)" strokeWidth={18} strokeLinecap="round"
        />
        {/* Red zone 0-40% */}
        <path
          d={describeArcPath(cx, cy, radius, 180, 252)}
          fill="none" stroke="url(#gauge-zone-red)" strokeWidth={18} strokeLinecap="round"
        />
        {/* Amber zone 40-70% */}
        <path
          d={describeArcPath(cx, cy, radius, 252, 306)}
          fill="none" stroke="url(#gauge-zone-amber)" strokeWidth={18} strokeLinecap="butt"
        />
        {/* Green zone 70-100% */}
        <path
          d={describeArcPath(cx, cy, radius, 306, 360)}
          fill="none" stroke="url(#gauge-zone-green)" strokeWidth={18} strokeLinecap="round"
        />

        {/* Tick marks */}
        {ticks.map((tick, i) => {
          const innerR = radius - 26
          const outerR = radius - 16
          const x1 = cx + innerR * Math.cos(tick.angle)
          const y1 = cy + innerR * Math.sin(tick.angle)
          const x2 = cx + outerR * Math.cos(tick.angle)
          const y2 = cy + outerR * Math.sin(tick.angle)
          return (
            <g key={i}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--vl-text-muted)" strokeWidth={1} opacity={0.5} />
              {i % 2 === 0 && (
                <text
                  x={cx + (innerR - 14) * Math.cos(tick.angle)}
                  y={cy + (innerR - 14) * Math.sin(tick.angle)}
                  textAnchor="middle" fill="var(--vl-text-muted)" fontSize={9}
                  dominantBaseline="middle"
                >
                  {tick.label}
                </text>
              )}
            </g>
          )
        })}

        {/* Needle */}
        <line
          x1={cx} y1={cy}
          x2={cx + radius * 0.65 * Math.cos(needleAngle)}
          y2={cy + radius * 0.65 * Math.sin(needleAngle)}
          stroke={getColor(pct)}
          strokeWidth={3}
          strokeLinecap="round"
          className="gauge-needle"
          style={{ transition: mounted ? 'all 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none' }}
        />
        <circle cx={cx} cy={cy} r={5} fill={getColor(pct)} />

        {/* Value text */}
        <text x={cx} y={cy + 28} textAnchor="middle" fill="var(--vl-text-white)" fontSize={24} fontWeight={700}>
          {Math.round(animatedValue)}
        </text>
        <text x={cx} y={cy + 44} textAnchor="middle" fill="var(--vl-text-muted)" fontSize={10}>
          {label} {mounted ? `(${min}–${max})` : ''}
        </text>
      </svg>
    </div>
  )
}

// ============================================================
// 4. RadarChart — SVG multi-axis radar
// ============================================================

export function RadarChart({ axes, datasets, width = 400, height = 400, lang = 'en' }: RadarChartProps) {
  const [mounted, setMounted] = useState(false)
  const [hoveredPoint, setHoveredPoint] = useState<{ dataset: number; axis: number } | null>(null)

  useEffect(() => { requestAnimationFrame(() => { setMounted(true) }) }, [])

  const cx = width / 2
  const cy = height / 2
  const maxRadius = Math.min(width, height) / 2 - 50
  const numAxes = Math.min(Math.max(axes.length, 3), 8)
  const angleStep = (2 * Math.PI) / numAxes
  const startAngle = -Math.PI / 2

  const getAxisMax = (axis: RadarAxis) => axis.max ?? 100

  const axisCoords = useMemo(() => {
    return axes.slice(0, numAxes).map((_, i) => ({
      x: cx + maxRadius * Math.cos(startAngle + i * angleStep),
      y: cy + maxRadius * Math.sin(startAngle + i * angleStep),
    }))
  }, [axes, numAxes, cx, cy, maxRadius, angleStep])

  if (axes.length === 0) {
    return (
      <div className="vl-inner rounded-xl flex flex-col items-center justify-center py-10">
        <p className="text-sm vl-text-muted">{t(lang, 'viz.radar.noData')}</p>
      </div>
    )
  }

  return (
    <div className="vl-inner rounded-xl p-3 flex flex-col items-center">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[400px] h-auto">
        {/* Grid rings */}
        {[0.2, 0.4, 0.6, 0.8, 1.0].map((scale, ri) => {
          const points = axes.slice(0, numAxes).map((_, i) => {
            const r = maxRadius * scale
            return `${cx + r * Math.cos(startAngle + i * angleStep)},${cy + r * Math.sin(startAngle + i * angleStep)}`
          }).join(' ')
          return (
            <polygon
              key={`grid-${ri}`}
              points={points}
              fill="none"
              stroke="var(--vl-border-subtle)"
              strokeWidth={1}
              opacity={mounted ? 0.6 : 0}
              style={{ transition: 'opacity 0.5s ease' }}
            />
          )
        })}

        {/* Axis lines + labels */}
        {axisCoords.map((coord, i) => (
          <g key={`axis-${i}`}>
            <line
              x1={cx} y1={cy} x2={coord.x} y2={coord.y}
              stroke="var(--vl-border-subtle)" strokeWidth={1}
              opacity={mounted ? 0.5 : 0}
              style={{ transition: 'opacity 0.5s ease' }}
            />
            <text
              x={cx + (maxRadius + 18) * Math.cos(startAngle + i * angleStep)}
              y={cy + (maxRadius + 18) * Math.sin(startAngle + i * angleStep)}
              textAnchor="middle" fill="var(--vl-text-muted)"
              fontSize={10} fontWeight={500}
              dominantBaseline="middle"
            >
              {axes[i]?.label || `Axis ${i + 1}`}
            </text>
          </g>
        ))}

        {/* Dataset polygons */}
        {datasets.map((ds, di) => {
          const points = ds.values.slice(0, numAxes).map((val, i) => {
            const axisMax = getAxisMax(axes[i] || { label: '', max: 100 })
            const r = Math.max((val / Math.max(axisMax, 1)) * maxRadius, 0)
            return `${cx + r * Math.cos(startAngle + i * angleStep)},${cy + r * Math.sin(startAngle + i * angleStep)}`
          }).join(' ')

          // Data points
          const dataPoints = ds.values.slice(0, numAxes).map((val, i) => {
            const axisMax = getAxisMax(axes[i] || { label: '', max: 100 })
            const r = Math.max((val / Math.max(axisMax, 1)) * maxRadius, 0)
            return {
              x: cx + r * Math.cos(startAngle + i * angleStep),
              y: cy + r * Math.sin(startAngle + i * angleStep),
              value: val,
              axisLabel: axes[i]?.label || '',
            }
          })

          return (
            <g key={`ds-${di}`}>
              <polygon
                points={points}
                fill={ds.color}
                fillOpacity={mounted ? 0.15 : 0}
                stroke={ds.color}
                strokeWidth={2}
                strokeOpacity={mounted ? 0.8 : 0}
                style={{ transition: `fill-opacity 0.8s ease ${di * 0.15}s, stroke-opacity 0.8s ease ${di * 0.15}s` }}
              />
              {dataPoints.map((pt, pi) => {
                const isHovered = hoveredPoint?.dataset === di && hoveredPoint?.axis === pi
                return (
                  <g key={`pt-${di}-${pi}`}>
                    <circle
                      cx={pt.x} cy={pt.y} r={isHovered ? 5 : 3}
                      fill={ds.color}
                      stroke="#fff"
                      strokeWidth={1.5}
                      className="cursor-pointer"
                      opacity={mounted ? 1 : 0}
                      style={{ transition: 'opacity 0.6s ease, r 0.2s ease' }}
                      onMouseEnter={() => setHoveredPoint({ dataset: di, axis: pi })}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                    {isHovered && (
                      <g className="pointer-events-none">
                        <rect
                          x={pt.x - 35} y={pt.y - 22}
                          width={70} height={20} rx={5}
                          fill="var(--vl-bg-secondary)" stroke="var(--vl-border)"
                        />
                        <text
                          x={pt.x} y={pt.y - 8}
                          textAnchor="middle" fill="var(--vl-text-white)"
                          fontSize={9} fontWeight={600}
                        >
                          {pt.axisLabel}: {pt.value}
                        </text>
                      </g>
                    )}
                  </g>
                )
              })}
            </g>
          )
        })}

        {/* Legend */}
        <g transform={`translate(${width - 100}, 16)`}>
          {datasets.map((ds, di) => (
            <g key={`legend-${di}`} transform={`translate(0, ${di * 18})`}>
              <rect x={0} y={0} width={10} height={10} rx={2} fill={ds.color} />
              <text x={14} y={9} fill="var(--vl-text-muted)" fontSize={9}>{ds.label}</text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  )
}

// ============================================================
// Demo Data Generators
// ============================================================

export function generateSankeyDemoData(): { nodes: SankeyNode[]; links: SankeyLink[] } {
  const nodes: SankeyNode[] = [
    { id: 'input', label: 'Input Data', color: '#10b981' },
    { id: 'process', label: 'Processing', color: '#06b6d4' },
    { id: 'analysis', label: 'Analysis', color: '#8b5cf6' },
    { id: 'report', label: 'Report', color: '#f59e0b' },
    { id: 'archive', label: 'Archive', color: '#ef4444' },
  ]
  const links: SankeyLink[] = [
    { source: 'input', target: 'process', value: 100 },
    { source: 'process', target: 'analysis', value: 60 },
    { source: 'process', target: 'report', value: 40 },
    { source: 'analysis', target: 'report', value: 30 },
    { source: 'analysis', target: 'archive', value: 30 },
    { source: 'report', target: 'archive', value: 20 },
  ]
  return { nodes, links }
}

export function generateForceDemoData(): { nodes: ForceNode[]; edges: ForceEdge[] } {
  const nodes: ForceNode[] = [
    { id: 'core', label: 'Core', color: '#10b981', weight: 3 },
    { id: 'ml', label: 'ML Engine', color: '#8b5cf6', weight: 2 },
    { id: 'data', label: 'Data Layer', color: '#06b6d4', weight: 2 },
    { id: 'api', label: 'API Gateway', color: '#f59e0b', weight: 1.5 },
    { id: 'ui', label: 'UI Layer', color: '#ec4899', weight: 1 },
    { id: 'auth', label: 'Auth', color: '#ef4444', weight: 1 },
    { id: 'cache', label: 'Cache', color: '#14b8a6', weight: 1 },
    { id: 'db', label: 'Database', color: '#f97316', weight: 2 },
  ]
  const edges: ForceEdge[] = [
    { source: 'core', target: 'ml', strength: 3 },
    { source: 'core', target: 'data', strength: 3 },
    { source: 'api', target: 'core', strength: 2 },
    { source: 'ui', target: 'api', strength: 2 },
    { source: 'auth', target: 'api', strength: 2 },
    { source: 'data', target: 'db', strength: 3 },
    { source: 'data', target: 'cache', strength: 2 },
    { source: 'ml', target: 'data', strength: 2 },
    { source: 'api', target: 'cache', strength: 1 },
  ]
  return { nodes, edges }
}

export function generateRadarDemoData(): { axes: RadarAxis[]; datasets: RadarDataset[] } {
  const axes: RadarAxis[] = [
    { label: 'Accuracy', max: 100 },
    { label: 'Speed', max: 100 },
    { label: 'Memory', max: 100 },
    { label: 'Scalability', max: 100 },
    { label: 'Reliability', max: 100 },
    { label: 'Security', max: 100 },
  ]
  const datasets: RadarDataset[] = [
    { label: 'Model A', values: [85, 70, 60, 90, 75, 80], color: '#10b981' },
    { label: 'Model B', values: [65, 90, 80, 55, 85, 70], color: '#8b5cf6' },
  ]
  return { axes, datasets }
}

// ============================================================
// Demo Section — All 4 charts with random data buttons
// ============================================================

export function AdvancedChartsDemo({ lang = 'en' }: { lang?: Lang }) {
  const [sankeyData, setSankeyData] = useState(generateSankeyDemoData)
  const [forceData, setForceData] = useState(generateForceDemoData)
  const [gaugeValue, setGaugeValue] = useState(72)
  const [radarData, setRadarData] = useState(generateRadarDemoData)

  const randomizeSankey = () => {
    const { nodes } = sankeyData
    const links: SankeyLink[] = sankeyData.links.map(l => ({
      ...l,
      value: Math.round(Math.random() * 80 + 20),
    }))
    setSankeyData({ nodes, links })
  }

  const randomizeForce = () => {
    const { nodes } = forceData
    const edges: ForceEdge[] = forceData.edges.map(e => ({
      ...e,
      strength: +(Math.random() * 3 + 0.5).toFixed(1),
    }))
    setForceData({ nodes, edges })
  }

  const randomizeGauge = () => {
    setGaugeValue(Math.round(Math.random() * 100))
  }

  const randomizeRadar = () => {
    const axes = radarData.axes
    const datasets: RadarDataset[] = radarData.datasets.map(ds => ({
      ...ds,
      values: ds.values.map(() => Math.round(Math.random() * 100)),
    }))
    setRadarData({ axes, datasets })
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Sankey */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold vl-text-heading">{t(lang, 'viz.sankey.title')}</h3>
          <button
            onClick={randomizeSankey}
            className="text-[10px] px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
          >
            {t(lang, 'chartGallery.randomData')}
          </button>
        </div>
        <SankeyDiagram {...sankeyData} lang={lang} />
      </motion.div>

      {/* Force Directed */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold vl-text-heading">{t(lang, 'viz.force.title')}</h3>
          <button
            onClick={randomizeForce}
            className="text-[10px] px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
          >
            {t(lang, 'chartGallery.randomData')}
          </button>
        </div>
        <ForceDirectedGraph {...forceData} lang={lang} />
      </motion.div>

      {/* Gauge */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold vl-text-heading">{t(lang, 'viz.gaugeAdvanced.title')}</h3>
          <button
            onClick={randomizeGauge}
            className="text-[10px] px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
          >
            {t(lang, 'chartGallery.randomData')}
          </button>
        </div>
        <GaugeChart value={gaugeValue} lang={lang} />
      </motion.div>

      {/* Radar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold vl-text-heading">{t(lang, 'viz.radar.title')}</h3>
          <button
            onClick={randomizeRadar}
            className="text-[10px] px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
          >
            {t(lang, 'chartGallery.randomData')}
          </button>
        </div>
        <RadarChart {...radarData} lang={lang} />
      </motion.div>
    </div>
  )
}

// ============================================================
// Legacy Backward-Compatible Exports (for visualization-panel.tsx)
// These match the original API: { agents, meetings, lang }
// ============================================================

interface LegacyAgent { id?: string; title: string; color: string; expertise: string; goal: string }
interface LegacyMeeting { status: string; messages?: Array<{ agentName: string; message?: string }> }

/** Legacy TreemapChart — simple SVG bar fallback matching old Agent[]/Meeting[] API */
export function TreemapChart({ agents, meetings, lang: _lang }: { agents: LegacyAgent[]; meetings: LegacyMeeting[]; lang: Lang }) {
  const data = agents.slice(0, 6).map(a => {
    const count = meetings.filter(m => m.status === 'completed').flatMap(m => m.messages || []).filter(msg => msg.agentName === a.title).length
    return { label: a.title, value: Math.max(count, 1), color: a.color }
  }).filter(d => d.value > 0)
  const maxVal = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="vl-inner rounded-xl p-3">
      <svg viewBox="0 0 300 200" className="w-full h-auto">
        {data.map((d, i) => {
          const h = (d.value / maxVal) * 140
          return (
            <g key={i}>
              <rect x={30 + i * 45} y={160 - h} width={30} height={h} rx={4} fill={d.color} opacity={0.8} />
              <text x={45 + i * 45} y={175} textAnchor="middle" fill="var(--vl-text-muted)" fontSize={8}>{d.label.slice(0, 4)}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/** Legacy FunnelChart — SVG semicircle fallback */
export function FunnelChart({ meetings, lang }: { meetings: LegacyMeeting[]; lang: Lang }) {
  const stages = [
    { label: lang === 'zh' ? '草稿' : 'Draft', count: meetings.filter(m => m.status === 'draft').length, color: '#10b981' },
    { label: lang === 'zh' ? '运行' : 'Running', count: meetings.filter(m => m.status === 'running').length, color: '#06b6d4' },
    { label: lang === 'zh' ? '完成' : 'Done', count: meetings.filter(m => m.status === 'completed').length, color: '#8b5cf6' },
  ]
  const maxCount = Math.max(...stages.map(s => s.count), 1)
  return (
    <div className="vl-inner rounded-xl p-3">
      <svg viewBox="0 0 300 180" className="w-full h-auto">
        {stages.map((s, i) => {
          const w = Math.max((s.count / maxCount) * 240, 40)
          const x = (300 - w) / 2
          const y = 20 + i * 50
          return (
            <g key={i}>
              <rect x={x} y={y} width={w} height={40} rx={8} fill={s.color} opacity={0.7} />
              <text x={150} y={y + 25} textAnchor="middle" fill="#fff" fontSize={11}>{s.label}: {s.count}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/** Legacy RadialBarChartComponent — SVG radial fallback */
export function RadialBarChartComponent({ agents, meetings, lang: _lang }: { agents: LegacyAgent[]; meetings: LegacyMeeting[]; lang: Lang }) {
  const data = agents.slice(0, 5).map(a => {
    const count = meetings.flatMap(m => m.messages || []).filter(msg => msg.agentName === a.title).length
    return { label: a.title, value: Math.min(count * 15, 100), color: a.color }
  })
  const cx = 150
  const cy = 120
  return (
    <div className="vl-inner rounded-xl p-3">
      <svg viewBox="0 0 300 200" className="w-full h-auto">
        {data.map((d, i) => {
          const r = 30 + i * 14
          const circumference = 2 * Math.PI * r
          const strokeDasharray = `${(d.value / 100) * circumference} ${circumference}`
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--vl-border-subtle)" strokeWidth={8} />
              <circle cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth={8} strokeDasharray={strokeDasharray} strokeLinecap="round"
                transform={`rotate(-90 ${cx} ${cy})`} />
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/** Legacy ScatterPlot — SVG dots fallback */
export function ScatterPlot({ agents, meetings, lang: _lang }: { agents: LegacyAgent[]; meetings: LegacyMeeting[]; lang: Lang }) {
  const points = meetings.flatMap(m => (m.messages || []).map((msg, i) => ({
    x: i, y: msg.message?.length ?? 0, color: agents.find(a => a.title === msg.agentName)?.color ?? '#10b981',
  }))).slice(0, 40)
  const maxLen = Math.max(...points.map(p => p.y), 1)
  return (
    <div className="vl-inner rounded-xl p-3">
      <svg viewBox="0 0 300 200" className="w-full h-auto">
        {points.map((p, i) => (
          <circle key={i} cx={40 + (p.x / Math.max(points.length, 1)) * 240} cy={180 - (p.y / maxLen) * 150} r={3} fill={p.color} opacity={0.7} />
        ))}
      </svg>
    </div>
  )
}

/** Legacy GaugeChart alias — wraps new GaugeChart with old API */
export function LegacyGaugeChart({ agents, meetings, lang }: { agents: LegacyAgent[]; meetings: LegacyMeeting[]; lang: Lang }) {
  const completed = meetings.filter(m => m.status === 'completed').length
  const score = Math.min(completed * 15 + agents.length * 10, 100)
  return <GaugeChart value={score} label={lang === 'zh' ? '系统健康' : 'System Health'} lang={lang} />
}
