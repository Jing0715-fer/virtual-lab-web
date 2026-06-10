'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RotateCcw, Download } from 'lucide-react'
import { t } from '@/lib/i18n'

// ============================================================
// Types
// ============================================================

export interface SankeyNode {
  id: string
  label: string
  category: 'topic' | 'method' | 'meeting' | 'outcome'
  color?: string
}

export interface SankeyLink {
  source: string
  target: string
  value: number
}

export interface SankeyProps {
  nodes: SankeyNode[]
  links: SankeyLink[]
  width?: number
  height?: number
}

interface LayoutNode {
  id: string
  label: string
  category: string
  color: string
  x: number
  y: number
  height: number
  column: number
}

interface LayoutLink {
  source: string
  target: string
  value: number
  sourceY0: number
  sourceY1: number
  targetY0: number
  targetY1: number
  sourceX: number
  targetX: number
  pathColor: string
}

// ============================================================
// Category Colors
// ============================================================

const CATEGORY_COLORS: Record<string, { main: string; light: string }> = {
  topic: { main: '#10b981', light: '#34d399' },
  method: { main: '#06b6d4', light: '#22d3ee' },
  meeting: { main: '#8b5cf6', light: '#a78bfa' },
  outcome: { main: '#f59e0b', light: '#fbbf24' },
}

const CATEGORY_LABELS: Record<string, string> = {
  topic: 'Research Topics',
  method: 'Methods',
  meeting: 'Meetings',
  outcome: 'Outcomes',
}

// ============================================================
// Demo Data
// ============================================================

export function generateSankeyDemoData() {
  const nodes: SankeyNode[] = [
    { id: 't1', label: 'Nanobody Design', category: 'topic' },
    { id: 't2', label: 'Protein Folding', category: 'topic' },
    { id: 't3', label: 'Drug Discovery', category: 'topic' },
    { id: 't4', label: 'Genomics', category: 'topic' },
    { id: 'm1', label: 'ESM Model', category: 'method' },
    { id: 'm2', label: 'AlphaFold', category: 'method' },
    { id: 'm3', label: 'Rosetta', category: 'method' },
    { id: 'm4', label: 'GNN', category: 'method' },
    { id: 'mt1', label: 'Team Meeting A', category: 'meeting' },
    { id: 'mt2', label: 'Team Meeting B', category: 'meeting' },
    { id: 'mt3', label: 'Individual 1', category: 'meeting' },
    { id: 'mt4', label: 'Individual 2', category: 'meeting' },
    { id: 'o1', label: 'Paper Published', category: 'outcome' },
    { id: 'o2', label: 'Patent Filed', category: 'outcome' },
    { id: 'o3', label: 'Dataset Created', category: 'outcome' },
    { id: 'o4', label: 'Code Released', category: 'outcome' },
  ]
  const links: SankeyLink[] = [
    { source: 't1', target: 'm1', value: 30 },
    { source: 't1', target: 'm2', value: 20 },
    { source: 't2', target: 'm2', value: 25 },
    { source: 't2', target: 'm3', value: 15 },
    { source: 't3', target: 'm3', value: 20 },
    { source: 't3', target: 'm4', value: 10 },
    { source: 't4', target: 'm4', value: 15 },
    { source: 'm1', target: 'mt1', value: 25 },
    { source: 'm2', target: 'mt1', value: 15 },
    { source: 'm2', target: 'mt2', value: 20 },
    { source: 'm3', target: 'mt2', value: 15 },
    { source: 'm3', target: 'mt3', value: 10 },
    { source: 'm4', target: 'mt3', value: 12 },
    { source: 'm4', target: 'mt4', value: 13 },
    { source: 'mt1', target: 'o1', value: 20 },
    { source: 'mt1', target: 'o3', value: 12 },
    { source: 'mt2', target: 'o1', value: 10 },
    { source: 'mt2', target: 'o2', value: 15 },
    { source: 'mt3', target: 'o2', value: 8 },
    { source: 'mt3', target: 'o4', value: 10 },
    { source: 'mt4', target: 'o3', value: 8 },
    { source: 'mt4', target: 'o4', value: 8 },
  ]
  return { nodes, links }
}

// ============================================================
// Sankey Layout Algorithm
// ============================================================

function computeLayout(nodes: SankeyNode[], links: SankeyLink[], width: number, height: number): { layoutNodes: LayoutNode[]; layoutLinks: LayoutLink[] } {
  const categories = ['topic', 'method', 'meeting', 'outcome']
  const columnX: Record<string, number> = {}
  categories.forEach((cat, i) => { columnX[cat] = 60 + (i / (categories.length - 1)) * (width - 120) })

  // Assign columns
  const colMap: Record<string, number> = {}
  nodes.forEach(n => {
    const idx = categories.indexOf(n.category)
    colMap[n.id] = idx >= 0 ? idx : 0
  })

  // Calculate input/output values per node
  const inputValue: Record<string, number> = {}
  const outputValue: Record<string, number> = {}
  nodes.forEach(n => { inputValue[n.id] = 0; outputValue[n.id] = 0 })
  links.forEach(l => {
    inputValue[l.target] = (inputValue[l.target] || 0) + l.value
    outputValue[l.source] = (outputValue[l.source] || 0) + l.value
  })
  const nodeValue: Record<string, number> = {}
  nodes.forEach(n => {
    nodeValue[n.id] = Math.max(inputValue[n.id] || 0, outputValue[n.id] || 0)
  })

  // Scale factor
  const totalValue = Math.max(...Object.values(nodeValue), 1)
  const nodePadding = 12
  const usableHeight = height - 60
  const scale = usableHeight / totalValue

  // Position nodes per column
  const colNodes: Record<number, SankeyNode[]> = {}
  nodes.forEach(n => {
    const col = colMap[n.id]
    if (!colNodes[col]) colNodes[col] = []
    colNodes[col].push(n)
  })

  const layoutNodes: LayoutNode[] = []
  const yPositions: Record<string, number> = {}

  categories.forEach((cat, colIdx) => {
    const colNodeList = colNodes[colIdx] || []
    const colTotal = colNodeList.reduce((sum, n) => sum + nodeValue[n.id], 0)
    let yOffset = (usableHeight - colTotal * scale) / 2 + 30
    colNodeList.forEach(n => {
      const h = nodeValue[n.id] * scale
      const colors = CATEGORY_COLORS[n.category] || CATEGORY_COLORS.topic
      layoutNodes.push({
        id: n.id,
        label: n.label,
        category: n.category,
        color: n.color || colors.main,
        x: columnX[cat],
        y: yOffset,
        height: Math.max(h, 8),
        column: colIdx,
      })
      yPositions[n.id] = yOffset
      yOffset += h + nodePadding
    })
  })

  // Position links
  const sourceOutputs: Record<string, number> = {}
  const targetInputs: Record<string, number> = {}

  const layoutLinks: LayoutLink[] = links.map(l => {
    const srcNode = layoutNodes.find(n => n.id === l.source)
    const tgtNode = layoutNodes.find(n => n.id === l.target)
    if (!srcNode || !tgtNode) return null

    if (!sourceOutputs[l.source]) sourceOutputs[l.source] = 0
    if (!targetInputs[l.target]) targetInputs[l.target] = 0

    const srcY0 = srcNode.y + sourceOutputs[l.source] * scale
    const srcY1 = srcY0 + l.value * scale
    const tgtY0 = tgtNode.y + targetInputs[l.target] * scale
    const tgtY1 = tgtY0 + l.value * scale

    sourceOutputs[l.source] += l.value
    targetInputs[l.target] += l.value

    const srcColors = CATEGORY_COLORS[srcNode.category] || CATEGORY_COLORS.topic
    const tgtColors = CATEGORY_COLORS[tgtNode.category] || CATEGORY_COLORS.topic

    return {
      source: l.source,
      target: l.target,
      value: l.value,
      sourceY0: srcY0,
      sourceY1: srcY1,
      targetY0: tgtY0,
      targetY1: tgtY1,
      sourceX: srcNode.x,
      targetX: tgtNode.x,
      pathColor: srcColors.main,
    }
  }).filter(Boolean) as LayoutLink[]

  return { layoutNodes, layoutLinks }
}

// ============================================================
// Sankey Component
// ============================================================

export function EnhancedSankey({ nodes, links, width = 800, height = 500 }: SankeyProps) {
  const [hoveredLink, setHoveredLink] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; source: string; target: string; value: number } | null>(null)
  const [pathProgress, setPathProgress] = useState(0)
  const [nodeOffsets, setNodeOffsets] = useState<Record<string, number>>({})
  const dragRef = useRef<string | null>(null)
  const dragStartRef = useRef<{ y: number; offsetY: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const { layoutNodes, layoutLinks } = useMemo(() => computeLayout(nodes, links, width, height), [nodes, links, width, height])

  // Animated path drawing
  useEffect(() => {
    let frame = 0
    const total = 60
    const step = () => {
      frame++
      setPathProgress(Math.min(frame / total, 1))
      if (frame < total) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [nodes, links])

  // Build SVG path for a link
  const buildPath = useCallback((link: LayoutLink) => {
    const sx = link.sourceX
    const tx = link.targetX
    const midX = (sx + tx) / 2
    const srcOffset = nodeOffsets[link.source] || 0
    const tgtOffset = nodeOffsets[link.target] || 0

    const sy0 = link.sourceY0 + srcOffset
    const sy1 = link.sourceY1 + srcOffset
    const ty0 = link.targetY0 + tgtOffset
    const ty1 = link.targetY1 + tgtOffset

    return `M ${sx},${sy0} C ${midX},${sy0} ${midX},${ty0} ${tx},${ty0}
            L ${tx},${ty1} C ${midX},${ty1} ${midX},${sy1} ${sx},${sy1} Z`
  }, [nodeOffsets])

  // Mouse handlers
  const handleLinkMouseEnter = useCallback((link: LayoutLink, e: React.MouseEvent) => {
    setHoveredLink(`${link.source}-${link.target}`)
    const src = nodes.find(n => n.id === link.source)
    const tgt = nodes.find(n => n.id === link.target)
    const rect = containerRef.current?.getBoundingClientRect()
    if (rect && src && tgt) {
      setTooltip({
        x: e.clientX - rect.left + 10,
        y: e.clientY - rect.top - 10,
        source: src.label,
        target: tgt.label,
        value: link.value,
      })
    }
  }, [nodes])

  const handleLinkMouseLeave = useCallback(() => {
    setHoveredLink(null)
    setTooltip(null)
  }, [])

  // Node drag
  const handleNodeMouseDown = useCallback((nodeId: string, e: React.MouseEvent) => {
    dragRef.current = nodeId
    dragStartRef.current = { y: e.clientY, offsetY: nodeOffsets[nodeId] || 0 }
    e.stopPropagation()
  }, [nodeOffsets])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragRef.current && dragStartRef.current) {
      const dy = e.clientY - dragStartRef.current.y
      setNodeOffsets(prev => ({
        ...prev,
        [dragRef.current!]: dragStartRef.current!.offsetY + dy,
      }))
    }
  }, [])

  const handleMouseUp = useCallback(() => {
    dragRef.current = null
    dragStartRef.current = null
  }, [])

  return (
    <div ref={containerRef} className="viz-sankey-container vl-inner rounded-xl p-4" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold vl-text-heading flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400" />
          {t('en', 'viz.sankey.title') || 'Research Flow Sankey'}
        </h3>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => { setNodeOffsets({}); setPathProgress(0); setTimeout(() => setPathProgress(1), 50) }}
            className="text-[10px] px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors flex items-center gap-1"
          >
            <RotateCcw className="size-3" /> Reset
          </button>
        </div>
      </div>

      {/* SVG */}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full rounded-lg" style={{ height: 'auto' }}>
        <defs>
          {layoutLinks.map((link, i) => {
            const srcNode = layoutNodes.find(n => n.id === link.source)
            const tgtNode = layoutNodes.find(n => n.id === link.target)
            if (!srcNode || !tgtNode) return null
            const srcColors = CATEGORY_COLORS[srcNode.category] || CATEGORY_COLORS.topic
            const tgtColors = CATEGORY_COLORS[tgtNode.category] || CATEGORY_COLORS.topic
            const id = `grad-${link.source}-${link.target}`
            return (
              <linearGradient key={id} id={id} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={srcColors.main} stopOpacity="0.5" />
                <stop offset="50%" stopColor={srcColors.light} stopOpacity="0.4" />
                <stop offset="100%" stopColor={tgtColors.main} stopOpacity="0.5" />
              </linearGradient>
            )
          })}
        </defs>

        {/* Links */}
        {layoutLinks.map((link, idx) => {
          const path = buildPath(link)
          const linkKey = `${link.source}-${link.target}`
          const isHovered = hoveredLink === linkKey
          const isDimmed = hoveredLink && hoveredLink !== linkKey
          const gradId = `grad-${link.source}-${link.target}`
          const dashLen = 2000
          const animOffset = dashLen * (1 - pathProgress)

          return (
            <g key={`link-${idx}`}>
              <path
                d={path}
                fill={`url(#${gradId})`}
                opacity={isDimmed ? 0.05 : isHovered ? 0.8 : 0.35}
                stroke="none"
                style={{
                  strokeDasharray: dashLen,
                  strokeDashoffset: animOffset,
                  transition: 'opacity 0.3s ease',
                }}
                className="viz-sankey-path"
                onMouseEnter={(e) => handleLinkMouseEnter(link, e)}
                onMouseLeave={handleLinkMouseLeave}
              />
              {/* Highlight border on hover */}
              {isHovered && (
                <path
                  d={path}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="1.5"
                  opacity="0.6"
                />
              )}
            </g>
          )
        })}

        {/* Nodes */}
        {layoutNodes.map(node => {
          const yOffset = nodeOffsets[node.id] || 0
          const isHovered = hoveredLink && (
            layoutLinks.some(l => l.source === node.id || l.target === node.id)
          )
          return (
            <g
              key={node.id}
              transform={`translate(0, ${yOffset})`}
              className="viz-sankey-node"
              onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
            >
              <rect
                x={node.x - 8}
                y={node.y}
                width={16}
                height={Math.max(node.height, 8)}
                rx={3}
                fill={node.color}
                opacity={isHovered ? 1 : 0.85}
              />
              <text
                x={node.column === 0 ? node.x - 14 : node.x + 14}
                y={node.y + node.height / 2}
                textAnchor={node.column === 0 ? 'end' : 'start'}
                dominantBaseline="middle"
                className="viz-sankey-node-label"
                fontSize="11"
                opacity={hoveredLink && !isHovered ? 0.2 : 1}
              >
                {node.label}
              </text>
            </g>
          )
        })}

        {/* Column headers */}
        {Object.entries(CATEGORY_LABELS).map(([cat, label], i) => {
          const colors = CATEGORY_COLORS[cat]
          const x = 60 + (i / 3) * (width - 120)
          return (
            <g key={cat}>
              <text x={x} y={18} textAnchor="middle" fontSize="11" fontWeight="600" fill={colors?.main || '#94a3b8'}>
                {label}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Tooltip */}
      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="viz-sankey-tooltip"
            style={{
              left: Math.min(tooltip.x, (containerRef.current?.clientWidth || width) - 200),
              top: Math.max(tooltip.y, 4),
            }}
          >
            <p className="font-semibold text-[11px]">{tooltip.source} → {tooltip.target}</p>
            <p className="text-[10px] vl-text-muted">Flow value: {tooltip.value}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 flex-wrap justify-center">
        {Object.entries(CATEGORY_LABELS).map(([cat, label]) => {
          const colors = CATEGORY_COLORS[cat]
          return (
            <div key={cat} className="viz-sankey-legend-item">
              <div className="w-3 h-3 rounded-sm" style={{ background: colors?.main }} />
              <span>{label}</span>
            </div>
          )
        })}
      </div>

      <p className="text-[10px] vl-text-muted text-center mt-2">
        Hover paths for details · Drag nodes vertically to adjust layout
      </p>
    </div>
  )
}
