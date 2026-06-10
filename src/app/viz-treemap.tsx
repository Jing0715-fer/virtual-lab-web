'use client'

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, Download, RotateCcw, Home } from 'lucide-react'
import type { Lang } from '@/lib/i18n'

// ============================================================
// Types
// ============================================================

export interface TreemapData {
  name: string
  value: number
  color?: string
  children?: TreemapData[]
}

export interface TreemapProps {
  data: TreemapData
  width?: number
  height?: number
  lang?: Lang
}

interface TreemapCell {
  x: number
  y: number
  w: number
  h: number
  data: TreemapData
  depth: number
  path: string[]
  index: number
}

// ============================================================
// Proper Squarified Treemap Algorithm
// Based on Bruls, Huizing, van Wijk "Squarified Treemaps" (1999)
// ============================================================

interface SquarifyItem {
  data: TreemapData
  value: number
}

function worstAspect(areas: number[], side: number): number {
  if (areas.length === 0 || side === 0) return Infinity
  const s = areas.reduce((a, b) => a + b, 0)
  const s2 = s * s
  const w2 = side * side
  let worst = 0
  for (const area of areas) {
    const ratio = Math.max(
      (w2 * area) / s2,
      s2 / (w2 * area)
    )
    if (ratio > worst) worst = ratio
  }
  return worst
}

function squarify(
  items: SquarifyItem[],
  rect: { x: number; y: number; w: number; h: number }
): Array<{ item: SquarifyItem; x: number; y: number; w: number; h: number }> {
  const results: Array<{ item: SquarifyItem; x: number; y: number; w: number; h: number }> = []
  if (items.length === 0 || rect.w < 1 || rect.h < 1) return results

  const totalValue = items.reduce((s, i) => s + i.value, 0)
  if (totalValue === 0) return results

  // Sort descending by value
  const sorted = [...items].sort((a, b) => b.value - a.value)
  const totalArea = rect.w * rect.h

  // Scale values to areas
  const scaled = sorted.map(item => ({
    item,
    area: (item.value / totalValue) * totalArea,
  }))

  let remaining = [...scaled]
  let currentRect = { ...rect }

  while (remaining.length > 0 && currentRect.w > 0 && currentRect.h > 0) {
    const shorterSide = Math.min(currentRect.w, currentRect.h)

    // Lay out along the shorter side
    const row: typeof scaled = []
    const rowAreas: number[] = []

    for (const item of remaining) {
      row.push(item)
      rowAreas.push(item.area)

      if (remaining.length === row.length) {
        // Last item, must add
        break
      }

      const currentWorst = worstAspect(rowAreas, shorterSide)

      // Test adding the next item
      const nextItem = remaining[row.length]
      const testAreas = [...rowAreas, nextItem.area]
      const nextWorst = worstAspect(testAreas, shorterSide)

      if (nextWorst > currentWorst) {
        // Adding the next item worsens the aspect ratio — stop here
        break
      }
    }

    // Calculate the total area of this row
    const rowTotal = row.reduce((s, i) => s + i.area, 0)
    if (rowTotal <= 0) break

    const isHorizontal = currentRect.w >= currentRect.h

    // Position items in this row
    let offset = 0
    for (const item of row) {
      const itemSize = (item.area / rowTotal) * shorterSide

      if (isHorizontal) {
        results.push({
          item: item.item,
          x: currentRect.x,
          y: currentRect.y + offset,
          w: rowTotal / Math.max(currentRect.h, 1),
          h: itemSize,
        })
        offset += itemSize
      } else {
        results.push({
          item: item.item,
          x: currentRect.x + offset,
          y: currentRect.y,
          w: itemSize,
          h: rowTotal / Math.max(currentRect.w, 1),
        })
        offset += itemSize
      }
    }

    // Shrink the remaining rect
    if (isHorizontal) {
      const usedWidth = rowTotal / Math.max(currentRect.h, 1)
      currentRect.x += usedWidth
      currentRect.w -= usedWidth
    } else {
      const usedHeight = rowTotal / Math.max(currentRect.w, 1)
      currentRect.y += usedHeight
      currentRect.h -= usedHeight
    }

    // Remove processed items
    remaining = remaining.slice(row.length)
  }

  return results
}

// ============================================================
// Layout Algorithm — recursive treemap with squarify
// ============================================================

const PADDING = 2
const HEADER_H = 18
const MIN_CELL_SIZE = 20

function layoutTreemap(
  data: TreemapData,
  rect: { x: number; y: number; w: number; h: number },
  depth: number,
  parentPath: string[],
  parentColor?: string,
  indexOffset = 0,
): TreemapCell[] {
  const cells: TreemapCell[] = []

  if (!data.children || data.children.length === 0) {
    // Leaf node
    cells.push({
      x: rect.x + PADDING / 2,
      y: rect.y + PADDING / 2 + (depth > 0 ? HEADER_H : 0),
      w: rect.w - PADDING,
      h: rect.h - PADDING - (depth > 0 ? HEADER_H : 0),
      data,
      depth,
      path: [...parentPath, data.name],
      index: indexOffset,
    })
    return cells
  }

  // Parent node — allocate children using squarify
  const children = data.children
    .filter(c => c.value > 0)
    .sort((a, b) => b.value - a.value)

  if (children.length === 0) return cells

  const innerRect = {
    x: rect.x + PADDING / 2,
    y: rect.y + PADDING / 2 + (depth > 0 ? HEADER_H : 0),
    w: rect.w - PADDING,
    h: rect.h - PADDING - (depth > 0 ? HEADER_H : 0),
  }

  // Squarify children
  const squarifyItems: SquarifyItem[] = children.map(c => ({
    data: c,
    value: c.value,
  }))
  const rects = squarify(squarifyItems, innerRect)

  rects.forEach((r, i) => {
    const child = children.find(c => c.data === r.item.data) || children[i]
    if (!child) return

    // Skip tiny cells
    if (r.w < MIN_CELL_SIZE || r.h < MIN_CELL_SIZE) return

    // If child has children and is large enough, recurse
    if (child.children && child.children.length > 0 && r.w > MIN_CELL_SIZE * 2 && r.h > MIN_CELL_SIZE * 2) {
      cells.push(...layoutTreemap(
        child,
        { x: r.x, y: r.y, w: r.w, h: r.h },
        depth + 1,
        [...parentPath, data.name],
        child.color || parentColor,
        indexOffset + cells.length,
      ))
    } else {
      cells.push({
        x: r.x + PADDING / 2,
        y: r.y + PADDING / 2 + (depth > 0 ? HEADER_H : 0),
        w: r.w - PADDING,
        h: r.h - PADDING - (depth > 0 ? HEADER_H : 0),
        data: child,
        depth,
        path: [...parentPath, data.name, child.name],
        index: indexOffset + cells.length,
      })
    }
  })

  return cells
}

// ============================================================
// Treemap Component
// ============================================================

export function Treemap({ data, width = 700, height = 420, lang = 'en' }: TreemapProps) {
  const [mounted, setMounted] = useState(false)
  const [hoveredCell, setHoveredCell] = useState<TreemapCell | null>(null)
  const [zoomedPath, setZoomedPath] = useState<string[]>([])
  const [breadcrumb, setBreadcrumb] = useState<Array<{ name: string; color: string }>>([])
  const [animationKey, setAnimationKey] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotionRef = useRef(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      prefersReducedMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }
  }, [])

  useEffect(() => {
    if (prefersReducedMotionRef.current) {
      setMounted(true)
    } else {
      const raf = requestAnimationFrame(() => setMounted(true))
      return () => cancelAnimationFrame(raf)
    }
  }, [])

  // Get the data to display based on zoom level
  const displayData = useMemo(() => {
    if (zoomedPath.length === 0) return data
    let current = data
    for (const name of zoomedPath) {
      const child = current.children?.find(c => c.name === name)
      if (child) {
        current = child
      } else {
        break
      }
    }
    return current
  }, [data, zoomedPath])

  const cells = useMemo(() => {
    return layoutTreemap(displayData, { x: 0, y: 0, w: width, h: height }, 0, [], displayData.color)
  }, [displayData, width, height, animationKey])

  // Update breadcrumb when zoom changes
  useEffect(() => {
    const crumbs: Array<{ name: string; color: string }> = [{ name: data.name, color: data.color || '#10b981' }]
    let current = data
    for (const name of zoomedPath) {
      const child = current.children?.find(c => c.name === name)
      if (child) {
        crumbs.push({ name: child.name, color: child.color || '#10b981' })
        current = child
      }
    }
    setBreadcrumb(crumbs)
  }, [data, zoomedPath])

  const handleCellClick = useCallback((cell: TreemapCell) => {
    if (cell.data.children && cell.data.children.length > 0) {
      const newPath = [...zoomedPath, cell.data.name]
      setZoomedPath(newPath)
      setHoveredCell(null)
      setAnimationKey(k => k + 1)
    }
  }, [zoomedPath])

  const handleBreadcrumbClick = useCallback((index: number) => {
    setZoomedPath(zoomedPath.slice(0, index))
    setHoveredCell(null)
    setAnimationKey(k => k + 1)
  }, [zoomedPath])

  const handleReset = useCallback(() => {
    setZoomedPath([])
    setHoveredCell(null)
    setAnimationKey(k => k + 1)
  }, [])

  const handleExportPng = useCallback(() => {
    const svgEl = containerRef.current?.querySelector('svg')
    if (!svgEl) return
    const svgData = new XMLSerializer().serializeToString(svgEl)
    const canvas = document.createElement('canvas')
    const scale = 2
    canvas.width = width * scale
    canvas.height = height * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(scale, scale)
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = '#0a0a0f'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)
      const a = document.createElement('a')
      a.download = 'treemap.png'
      a.href = canvas.toDataURL('image/png')
      a.click()
    }
    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`
  }, [width, height])

  // Build color legend from top-level children
  const legendItems = useMemo(() => {
    if (!data.children) return []
    return data.children
      .filter(c => c.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
      .map(c => ({
        name: c.name,
        color: c.color || '#10b981',
        value: c.value,
      }))
  }, [data])

  const reducedMotion = prefersReducedMotionRef.current

  return (
    <div className="vl-inner rounded-xl p-4 relative">
      {/* Header & Controls */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold vl-text-heading flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          Topic Treemap
        </h3>
        <div className="flex items-center gap-1.5">
          {zoomedPath.length > 0 && (
            <button
              onClick={handleReset}
              className="text-[10px] px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors flex items-center gap-1"
            >
              <Home className="size-3" /> Root
            </button>
          )}
          <button
            onClick={handleExportPng}
            className="text-[10px] px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors flex items-center gap-1"
          >
            <Download className="size-3" />
          </button>
        </div>
      </div>

      {/* Breadcrumb */}
      <AnimatePresence mode="wait">
        {breadcrumb.length > 1 && (
          <motion.nav
            key={breadcrumb.map(b => b.name).join('/')}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center gap-1 mb-2 text-[10px] flex-wrap"
            aria-label="Breadcrumb"
          >
            {breadcrumb.map((crumb, i) => (
              <React.Fragment key={`${crumb.name}-${i}`}>
                {i > 0 && <ChevronRight className="size-3 vl-text-muted" />}
                <button
                  onClick={() => handleBreadcrumbClick(i)}
                  className={`px-1.5 py-0.5 rounded transition-colors hover:bg-white/5 ${
                    i === breadcrumb.length - 1
                      ? 'text-white font-medium'
                      : 'vl-text-muted hover:text-white'
                  }`}
                  style={i === breadcrumb.length - 1 ? { color: crumb.color } : {}}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Treemap SVG */}
      <div ref={containerRef} className="relative overflow-hidden rounded-lg" style={{ height }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full select-none"
          preserveAspectRatio="xMidYMid meet"
        >
          {cells.map((cell, idx) => {
            const isHovered = hoveredCell === cell
            const color = cell.data.color || (cell.depth % 2 === 0 ? '#10b981' : '#06b6d4')
            const isTooSmall = cell.w < MIN_CELL_SIZE * 1.5 || cell.h < MIN_CELL_SIZE * 1.5
            const hasChildren = cell.data.children && cell.data.children.length > 0

            return (
              <g
                key={`${cell.path.join('/')}-${idx}-${animationKey}`}
                style={{
                  opacity: mounted ? 1 : 0,
                  transition: reducedMotion ? 'none' : `opacity 0.5s ease ${idx * 0.02}s`,
                }}
              >
                {/* Cell background */}
                <rect
                  x={cell.x}
                  y={cell.y}
                  width={Math.max(cell.w, 0)}
                  height={Math.max(cell.h, 0)}
                  rx={4}
                  fill={color}
                  className="cursor-pointer"
                  style={{
                    opacity: isHovered ? 1 : 0.65,
                    transition: reducedMotion ? 'none' : 'opacity 0.15s ease, filter 0.15s ease',
                    filter: isHovered ? `brightness(1.25) drop-shadow(0 0 6px ${color}55)` : 'none',
                  }}
                  onMouseEnter={() => setHoveredCell(cell)}
                  onMouseLeave={() => setHoveredCell(null)}
                  onClick={() => handleCellClick(cell)}
                  role="button"
                  aria-label={`${cell.data.name}: ${cell.data.value}`}
                />

                {/* Cell label */}
                {!isTooSmall && cell.h > 20 && cell.w > 30 && (
                  <text
                    x={cell.x + cell.w / 2}
                    y={cell.y + cell.h / 2 - (cell.h > 35 ? 4 : 0)}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#ffffff"
                    fontSize={Math.min(Math.max(cell.w / 8, 9), 14)}
                    fontWeight={600}
                    className="pointer-events-none select-none"
                    style={{
                      opacity: cell.w > 50 && cell.h > 30 ? 1 : 0.7,
                    }}
                  >
                    {cell.data.name.length > Math.floor(cell.w / 7)
                      ? cell.data.name.slice(0, Math.floor(cell.w / 7)) + '…'
                      : cell.data.name}
                  </text>
                )}

                {/* Cell value */}
                {!isTooSmall && cell.h > 35 && cell.w > 30 && (
                  <text
                    x={cell.x + cell.w / 2}
                    y={cell.y + cell.h / 2 + 10}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#ffffffbb"
                    fontSize={Math.min(Math.max(cell.w / 10, 8), 11)}
                    className="pointer-events-none select-none"
                  >
                    {cell.data.value}
                  </text>
                )}

                {/* Zoom hint for branch nodes */}
                {!isTooSmall && hasChildren && cell.w > 50 && cell.h > 40 && (
                  <text
                    x={cell.x + cell.w - 10}
                    y={cell.y + 12}
                    textAnchor="end"
                    fill="#ffffff66"
                    fontSize={8}
                    className="pointer-events-none select-none"
                  >
                    ▸
                  </text>
                )}
              </g>
            )
          })}

          {/* Hover tooltip (SVG-based) */}
          {hoveredCell && (
            <g className="pointer-events-none">
              <rect
                x={Math.min(hoveredCell.x + 5, width - 140)}
                y={Math.max(hoveredCell.y - 42, 5)}
                width={135}
                height={hoveredCell.path.length > 1 ? 48 : 32}
                rx={6}
                fill="var(--vl-bg-secondary, #1e293b)"
                stroke="var(--vl-border, rgba(255,255,255,0.08))"
                strokeWidth={1}
                opacity={0.95}
              />
              <text
                x={Math.min(hoveredCell.x + 12, width - 128)}
                y={Math.max(hoveredCell.y - 22, 20)}
                fill="var(--vl-text-heading, #f1f5f9)"
                fontSize={10}
                fontWeight={600}
              >
                {hoveredCell.data.name}
              </text>
              <text
                x={Math.min(hoveredCell.x + 12, width - 128)}
                y={Math.max(hoveredCell.y - 10, 32)}
                fill="var(--vl-text-muted, #94a3b8)"
                fontSize={9}
              >
                Value: {hoveredCell.data.value}
              </text>
              {hoveredCell.path.length > 1 && (
                <text
                  x={Math.min(hoveredCell.x + 12, width - 128)}
                  y={Math.max(hoveredCell.y + 2, 44)}
                  fill="var(--vl-text-muted, #94a3b8)"
                  fontSize={8}
                >
                  {hoveredCell.path.join(' › ')}
                </text>
              )}
            </g>
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 flex-wrap">
        {legendItems.map((item) => (
          <div key={item.name} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
            <span className="text-[9px] vl-text-muted">{item.name}</span>
          </div>
        ))}
      </div>

      <p className="text-[10px] vl-text-muted text-center mt-1">
        Click cells with children to zoom in · Breadcrumb to navigate back
      </p>
    </div>
  )
}

// ============================================================
// Demo Data Generator
// ============================================================

export function generateTreemapDemoData(): TreemapData {
  return {
    name: 'Research Topics',
    value: 312,
    color: '#10b981',
    children: [
      {
        name: 'Team Meetings',
        value: 185,
        color: '#8b5cf6',
        children: [
          {
            name: 'PI Lead',
            value: 62,
            color: '#8b5cf6',
            children: [
              { name: 'Methodology', value: 22, color: '#8b5cf6' },
              { name: 'Experimental Design', value: 18, color: '#a78bfa' },
              { name: 'Data Analysis', value: 12, color: '#c4b5fd' },
              { name: 'Publication', value: 10, color: '#ddd6fe' },
            ],
          },
          {
            name: 'Scientist',
            value: 48,
            color: '#ec4899',
            children: [
              { name: 'Peer Review', value: 18, color: '#ec4899' },
              { name: 'Validation', value: 15, color: '#f472b6' },
              { name: 'Critique', value: 15, color: '#f9a8d4' },
            ],
          },
          {
            name: 'Analyst',
            value: 42,
            color: '#14b8a6',
            children: [
              { name: 'Statistics', value: 20, color: '#14b8a6' },
              { name: 'Modeling', value: 12, color: '#2dd4bf' },
              { name: 'Visualization', value: 10, color: '#5eead4' },
            ],
          },
          {
            name: 'Reporter',
            value: 33,
            color: '#f97316',
            children: [
              { name: 'Documentation', value: 18, color: '#f97316' },
              { name: 'Summary', value: 15, color: '#fb923c' },
            ],
          },
        ],
      },
      {
        name: 'Individual Meetings',
        value: 127,
        color: '#06b6d4',
        children: [
          {
            name: 'PI Lead',
            value: 45,
            color: '#8b5cf6',
            children: [
              { name: 'Strategy', value: 25, color: '#8b5cf6' },
              { name: 'Planning', value: 20, color: '#a78bfa' },
            ],
          },
          {
            name: 'Developer',
            value: 42,
            color: '#06b6d4',
            children: [
              { name: 'Implementation', value: 22, color: '#06b6d4' },
              { name: 'Debugging', value: 12, color: '#22d3ee' },
              { name: 'Testing', value: 8, color: '#67e8f9' },
            ],
          },
          {
            name: 'Reviewer',
            value: 40,
            color: '#10b981',
            children: [
              { name: 'Quality Check', value: 22, color: '#10b981' },
              { name: 'Compliance', value: 18, color: '#34d399' },
            ],
          },
        ],
      },
    ],
  }
}
