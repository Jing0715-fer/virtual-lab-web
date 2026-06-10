'use client'

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RotateCcw, Download, ZoomIn, Info } from 'lucide-react'
import type { Lang } from '@/lib/i18n'

// ============================================================
// Types
// ============================================================

export interface SankeyNodeData {
  id: string
  label: string
  color: string
}

export interface SankeyLinkData {
  source: string
  target: string
  value: number
}

export interface SankeyDiagramProps {
  data: {
    nodes: SankeyNodeData[]
    links: SankeyLinkData[]
  }
  width?: number
  height?: number
  lang?: Lang
}

interface LayoutNode {
  id: string
  label: string
  color: string
  x: number
  y: number
  width: number
  height: number
  column: 'left' | 'right'
  sourceValue: number
  targetValue: number
}

interface LayoutLink {
  idx: number
  source: string
  target: string
  value: number
  srcColor: string
  tgtColor: string
  path: string
  midX: number
  midY: number
  linkHeight: number
}

// ============================================================
// Sankey Diagram — SVG-based with interactive features
// ============================================================

export function SankeyDiagram({ data, width = 700, height = 400, lang = 'en' }: SankeyDiagramProps) {
  const [mounted, setMounted] = useState(false)
  const [animProgress, setAnimProgress] = useState(0)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [hoveredLink, setHoveredLink] = useState<number | null>(null)
  const [filterNode, setFilterNode] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
      setPrefersReducedMotion(mql.matches)
      const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
      mql.addEventListener('change', handler)
      return () => mql.removeEventListener('change', handler)
    }
  }, [])

  // Animate mount
  useEffect(() => {
    if (prefersReducedMotion) {
      setMounted(true)
      setAnimProgress(1)
      return
    }
    const raf = requestAnimationFrame(() => setMounted(true))
    const start = Date.now()
    const duration = 1200
    const tick = () => {
      const elapsed = Date.now() - start
      const t = Math.min(elapsed / duration, 1)
      // Ease-out cubic
      setAnimProgress(1 - Math.pow(1 - t, 3))
      if (t < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [prefersReducedMotion])

  // ============================================================
  // Layout computation
  // ============================================================
  const { nodes: layoutNodes, links: layoutLinks } = useMemo(() => {
    const { nodes, links } = data
    if (nodes.length === 0 || links.length === 0) {
      return { nodes: [], links: [] }
    }

    const nodeMap = new Map(nodes.map(n => [n.id, n]))

    // Separate source-only and target-only nodes
    const sourceIds = new Set(links.map(l => l.source))
    const targetIds = new Set(links.map(l => l.target))

    const leftIds: string[] = []
    const rightIds: string[] = []

    nodes.forEach(n => {
      if (sourceIds.has(n.id) && !targetIds.has(n.id)) leftIds.push(n.id)
      else if (targetIds.has(n.id) && !sourceIds.has(n.id)) rightIds.push(n.id)
      else if (sourceIds.has(n.id)) leftIds.push(n.id)
      else rightIds.push(n.id)
    })

    const nodeWidth = 14
    const padX = 60
    const padY = 30
    const usableHeight = height - padY * 2

    // Compute node heights proportional to flow
    const computeNodes = (ids: string[], x: number) => {
      const colLinks = x < width / 2
        ? links.filter(l => ids.includes(l.source))
        : links.filter(l => ids.includes(l.target))

      const totalVal = colLinks.reduce((s, l) => s + l.value, 0) || 1
      const totalGap = (ids.length - 1) * 6
      const availableHeight = usableHeight - totalGap

      const nodeHeights: Record<string, number> = {}
      colLinks.forEach(l => {
        const nid = x < width / 2 ? l.source : l.target
        if (!nodeHeights[nid]) nodeHeights[nid] = 0
        nodeHeights[nid] += l.value
      })

      let currentY = padY
      return ids.map(id => {
        const h = Math.max((nodeHeights[id] || 1) / totalVal * availableHeight, 18)
        const node = nodeMap.get(id)!
        const result: LayoutNode = {
          id,
          label: node.label,
          color: node.color,
          x,
          y: currentY,
          width: nodeWidth,
          height: h,
          column: x < width / 2 ? 'left' as const : 'right' as const,
          sourceValue: links.filter(l => l.source === id).reduce((s, l) => s + l.value, 0),
          targetValue: links.filter(l => l.target === id).reduce((s, l) => s + l.value, 0),
        }
        currentY += h + 6
        return result
      })
    }

    const leftNodes = computeNodes(leftIds, padX)
    const rightNodes = computeNodes(rightIds, width - padX - nodeWidth)
    const allNodes = [...leftNodes, ...rightNodes]
    const posMap = new Map(allNodes.map(n => [n.id, n]))

    // Track vertical offsets for link stacking
    const srcOffsetMap = new Map<string, number>()
    const tgtOffsetMap = new Map<string, number>()

    // Compute link paths
    const computedLinks: LayoutLink[] = links.map((link, idx) => {
      const srcPos = posMap.get(link.source)
      const tgtPos = posMap.get(link.target)
      if (!srcPos || !tgtPos) return null

      const srcNode = nodeMap.get(link.source)!
      const tgtNode = nodeMap.get(link.target)!
      const srcRatio = srcPos.sourceValue > 0 ? link.value / srcPos.sourceValue : 0
      const tgtRatio = tgtPos.targetValue > 0 ? link.value / tgtPos.targetValue : 0

      const linkHeightSrc = srcRatio * srcPos.height
      const linkHeightTgt = tgtRatio * tgtPos.height
      const linkHeight = Math.max(linkHeightSrc, linkHeightTgt)

      const srcOffset = srcOffsetMap.get(link.source) || 0
      const tgtOffset = tgtOffsetMap.get(link.target) || 0

      srcOffsetMap.set(link.source, srcOffset + linkHeightSrc)
      tgtOffsetMap.set(link.target, tgtOffset + linkHeightTgt)

      const x0 = srcPos.x + srcPos.width
      const y0 = srcPos.y + srcOffset
      const y1 = y0 + linkHeightSrc
      const x3 = tgtPos.x
      const y2 = tgtPos.y + tgtOffset
      const y3 = y2 + linkHeightTgt

      const cx1 = x0 + (x3 - x0) * 0.4
      const cx2 = x0 + (x3 - x0) * 0.6

      // Build closed path for the link band
      const path = `M${x0},${y0} C${cx1},${y0} ${cx2},${y2} ${x3},${y2} L${x3},${y3} C${cx2},${y3} ${cx1},${y1} ${x0},${y1} Z`

      return {
        idx,
        source: link.source,
        target: link.target,
        value: link.value,
        srcColor: srcNode.color,
        tgtColor: tgtNode.color,
        path,
        midX: (x0 + x3) / 2,
        midY: (y0 + y3) / 2,
        linkHeight,
      }
    }).filter(Boolean) as LayoutLink[]

    return { nodes: allNodes, links: computedLinks }
  }, [data, width, height])

  // Connected nodes for highlighting
  const connectedNodes = useMemo(() => {
    if (!hoveredNode) return new Set<string>()
    const s = new Set<string>([hoveredNode])
    layoutLinks.forEach(l => {
      if (l.source === hoveredNode) s.add(l.target)
      if (l.target === hoveredNode) s.add(l.source)
    })
    return s
  }, [hoveredNode, layoutLinks])

  // Filtered links
  const visibleLinks = useMemo(() => {
    if (!filterNode) return layoutLinks
    return layoutLinks.filter(l => l.source === filterNode || l.target === filterNode)
  }, [filterNode, layoutLinks])

  const visibleNodes = useMemo(() => {
    if (!filterNode) return layoutNodes
    const activeIds = new Set(visibleLinks.flatMap(l => [l.source, l.target]))
    return layoutNodes.filter(n => activeIds.has(n.id))
  }, [filterNode, visibleLinks, layoutNodes])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (hoveredLink === null) { setTooltip(null); return }
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const link = layoutLinks.find(l => l.idx === hoveredLink)
    if (!link) return
    const srcLabel = data.nodes.find(n => n.id === link.source)?.label || link.source
    const tgtLabel = data.nodes.find(n => n.id === link.target)?.label || link.target
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      text: `${srcLabel} → ${tgtLabel}: ${link.value}`,
    })
  }, [hoveredLink, layoutLinks, data.nodes])

  const handleNodeMouseMove = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const node = data.nodes.find(n => n.id === nodeId)
    if (!node) return
    const totalFlow = layoutLinks
      .filter(l => l.source === nodeId || l.target === nodeId)
      .reduce((s, l) => s + l.value, 0)
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      text: `${node.label}: ${totalFlow} messages`,
    })
  }, [data.nodes, layoutLinks])

  const handleReset = useCallback(() => {
    setFilterNode(null)
    setHoveredNode(null)
    setHoveredLink(null)
    setTooltip(null)
  }, [])

  const handleExportPng = useCallback(() => {
    if (!svgRef.current) return
    const svgData = new XMLSerializer().serializeToString(svgRef.current)
    const canvas = document.createElement('canvas')
    const scale = 2
    canvas.width = width * scale
    canvas.height = height * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(scale, scale)
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--vl-bg-primary').trim() || '#0a0a0f'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)
      const a = document.createElement('a')
      a.download = 'sankey-diagram.png'
      a.href = canvas.toDataURL('image/png')
      a.click()
    }
    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`
  }, [width, height])

  return (
    <div ref={containerRef} className="vl-inner rounded-xl p-4 relative" onMouseMove={handleMouseMove}>
      {/* Controls */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold vl-text-heading flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          Sankey Flow Diagram
        </h3>
        <div className="flex items-center gap-1.5">
          {filterNode && (
            <button
              onClick={handleReset}
              className="text-[10px] px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors flex items-center gap-1"
            >
              <RotateCcw className="size-3" /> Reset View
            </button>
          )}
          <button
            onClick={handleExportPng}
            className="text-[10px] px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors flex items-center gap-1"
            title="Export as PNG"
          >
            <Download className="size-3" />
          </button>
        </div>
      </div>

      {/* Filter indicator */}
      <AnimatePresence>
        {filterNode && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-[10px] vl-text-muted mb-2 flex items-center gap-1"
          >
            <Info className="size-3 text-amber-400" />
            Filtering: <span className="text-emerald-400 font-medium">{data.nodes.find(n => n.id === filterNode)?.label || filterNode}</span>
            <span className="vl-text-muted">({visibleLinks.length} flows)</span>
          </motion.div>
        )}
      </AnimatePresence>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto select-none"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {visibleLinks.map(lp => (
            <linearGradient key={`sk-${lp.idx}`} id={`sk-grad-${lp.idx}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={lp.srcColor} stopOpacity={0.7} />
              <stop offset="100%" stopColor={lp.tgtColor} stopOpacity={0.7} />
            </linearGradient>
          ))}
          {/* Glow filter for highlighted links */}
          <filter id="sankey-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Links — animated width via opacity + transform */}
        {visibleLinks.map((lp, i) => {
          const isHighlighted = hoveredNode && (lp.source === hoveredNode || lp.target === hoveredNode)
          const isDimmed = hoveredNode && !isHighlighted
          const isLinkHovered = hoveredLink === lp.idx
          // Animate each link with staggered delay
          const linkOpacity = mounted
            ? isDimmed ? 0.08 : isHighlighted || isLinkHovered ? 0.9 : 0.45
            : 0
          const scale = prefersReducedMotion ? 1 : animProgress

          return (
            <g key={`link-${lp.idx}`}>
              <path
                d={lp.path}
                fill={`url(#sk-grad-${lp.idx})`}
                className="cursor-pointer"
                style={{
                  opacity: linkOpacity,
                  transition: prefersReducedMotion ? 'none' : `opacity 0.3s ease`,
                  transform: `scaleX(${scale})`,
                  transformOrigin: '0 50%',
                }}
                onMouseEnter={(e) => {
                  e.stopPropagation()
                  setHoveredLink(lp.idx)
                  setHoveredNode(null)
                }}
                onMouseLeave={() => {
                  setHoveredLink(null)
                  setTooltip(null)
                }}
              />
              {/* Highlighted link glow */}
              {isLinkHovered && mounted && (
                <path
                  d={lp.path}
                  fill="none"
                  stroke="var(--vl-accent, #10b981)"
                  strokeWidth={1}
                  opacity={0.5}
                  filter="url(#sankey-glow)"
                  className="pointer-events-none"
                />
              )}
            </g>
          )
        })}

        {/* Nodes */}
        {visibleNodes.map(pos => {
          const isHovered = hoveredNode === pos.id
          const isConnected = !hoveredNode || connectedNodes.has(pos.id)
          const isDimmed = hoveredNode && !isConnected
          const isFiltered = filterNode === pos.id

          return (
            <g
              key={pos.id}
              className="cursor-pointer"
              style={{
                opacity: mounted ? (isDimmed ? 0.15 : 1) : 0,
                transition: prefersReducedMotion ? 'none' : 'opacity 0.4s ease',
              }}
              onMouseEnter={(e) => {
                setHoveredNode(pos.id)
                handleNodeMouseMove(e, pos.id)
              }}
              onMouseLeave={() => {
                setHoveredNode(null)
                setTooltip(null)
              }}
              onClick={() => setFilterNode(prev => prev === pos.id ? null : pos.id)}
            >
              {/* Glow effect on hover */}
              {isHovered && (
                <rect
                  x={pos.x - 3} y={pos.y - 3}
                  width={pos.width + 6} height={pos.height + 6}
                  rx={6}
                  fill="none"
                  stroke={pos.color}
                  strokeWidth={2}
                  opacity={0.5}
                  style={{ filter: `drop-shadow(0 0 8px ${pos.color}88)` }}
                />
              )}
              {/* Filter indicator */}
              {isFiltered && (
                <rect
                  x={pos.x - 2} y={pos.y - 2}
                  width={pos.width + 4} height={pos.height + 4}
                  rx={5}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  opacity={0.8}
                />
              )}
              <rect
                x={pos.x} y={pos.y}
                width={pos.width} height={pos.height}
                rx={4}
                fill={pos.color}
                style={{
                  transition: prefersReducedMotion ? 'none' : 'filter 0.2s ease',
                  filter: isHovered ? `drop-shadow(0 0 10px ${pos.color}88)` : 'none',
                }}
              />
              <text
                x={pos.column === 'left' ? pos.x - 8 : pos.x + pos.width + 8}
                y={pos.y + pos.height / 2}
                textAnchor={pos.column === 'left' ? 'end' : 'start'}
                fill="var(--vl-text-heading, #f1f5f9)"
                fontSize={10}
                fontWeight={isHovered ? 700 : 500}
                dominantBaseline="middle"
                className="pointer-events-none"
                style={{
                  transition: prefersReducedMotion ? 'none' : 'font-weight 0.2s ease',
                }}
              >
                {pos.label}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Floating tooltip */}
      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute pointer-events-none z-10 px-3 py-1.5 rounded-lg text-[10px] border"
            style={{
              left: Math.min(tooltip.x + 12, width - 140),
              top: Math.max(tooltip.y - 36, 4),
              background: 'var(--vl-bg-secondary, #1e293b)',
              borderColor: 'var(--vl-border, rgba(255,255,255,0.08))',
              color: 'var(--vl-text-heading, #f1f5f9)',
            }}
          >
            {tooltip.text}
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-[10px] vl-text-muted text-center mt-2">
        Hover to highlight flows · Click node to filter · {data.links.length} links, {data.nodes.length} nodes
      </p>
    </div>
  )
}

// ============================================================
// Demo Data Generator
// ============================================================

export function generateMeetingSankeyDemoData() {
  const nodes: SankeyNodeData[] = [
    { id: 'agenda', label: 'Agenda Topics', color: '#10b981' },
    { id: 'questions', label: 'Questions', color: '#06b6d4' },
    { id: 'results', label: 'Results', color: '#f59e0b' },
    { id: 'issues', label: 'Issues Raised', color: '#ef4444' },
    { id: 'pi', label: 'PI Lead', color: '#8b5cf6' },
    { id: 'critic', label: 'Scientist', color: '#ec4899' },
    { id: 'analyst', label: 'Analyst', color: '#14b8a6' },
    { id: 'reporter', label: 'Reporter', color: '#f97316' },
  ]
  const links: SankeyLinkData[] = [
    { source: 'agenda', target: 'pi', value: 45 },
    { source: 'agenda', target: 'critic', value: 32 },
    { source: 'agenda', target: 'analyst', value: 28 },
    { source: 'questions', target: 'pi', value: 18 },
    { source: 'questions', target: 'critic', value: 22 },
    { source: 'questions', target: 'analyst', value: 15 },
    { source: 'results', target: 'reporter', value: 38 },
    { source: 'results', target: 'pi', value: 20 },
    { source: 'issues', target: 'critic', value: 25 },
    { source: 'issues', target: 'pi', value: 15 },
    { source: 'issues', target: 'analyst', value: 12 },
  ]
  return { nodes, links }
}
