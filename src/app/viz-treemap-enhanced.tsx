'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RotateCcw, ChevronRight } from 'lucide-react'
import { t } from '@/lib/i18n'

// ============================================================
// Types
// ============================================================

export interface TreemapCell {
  id: string
  label: string
  value: number
  sentiment: 'positive' | 'neutral' | 'negative'
  color?: string
  children?: TreemapCell[]
  category?: string
  parentId?: string
}

export type TreemapView = 'agent' | 'topic' | 'type'

export interface TreemapProps {
  data: TreemapCell[]
  view?: TreemapView
  width?: number
  height?: number
}

interface Rect {
  id: string
  label: string
  x: number
  y: number
  w: number
  h: number
  color: string
  value: number
  sentiment: string
  depth: number
  parentId?: string
  category?: string
}

// ============================================================
// Sentiment Colors
// ============================================================

const SENTIMENT_COLORS: Record<string, string> = {
  positive: '#10b981',
  neutral: '#64748b',
  negative: '#ef4444',
}

const VIEW_COLORS: Record<string, string[]> = {
  agent: ['#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#a78bfa', '#34d399'],
  topic: ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#14b8a6'],
  type: ['#8b5cf6', '#f97316'],
}

const VIEW_LABELS: Record<string, string> = {
  agent: 'By Agent',
  topic: 'By Topic',
  type: 'By Type',
}

// ============================================================
// Demo Data
// ============================================================

export function generateTreemapDemoData(): Record<TreemapView, TreemapCell[]> {
  return {
    agent: [
      { id: 'a1', label: 'PI Lead', value: 92, sentiment: 'positive', category: 'agent' },
      { id: 'a2', label: 'Critic', value: 78, sentiment: 'neutral', category: 'agent' },
      { id: 'a3', label: 'Analyst', value: 58, sentiment: 'positive', category: 'agent' },
      { id: 'a4', label: 'Reporter', value: 42, sentiment: 'neutral', category: 'agent' },
      { id: 'a5', label: 'Developer', value: 65, sentiment: 'positive', category: 'agent' },
      { id: 'a6', label: 'Reviewer', value: 35, sentiment: 'negative', category: 'agent' },
      { id: 'a7', label: 'Student', value: 22, sentiment: 'positive', category: 'agent' },
      { id: 'a8', label: 'PM', value: 48, sentiment: 'neutral', category: 'agent' },
    ],
    topic: [
      { id: 'tp1', label: 'Nanobody', value: 85, sentiment: 'positive', category: 'topic' },
      { id: 'tp2', label: 'Protein Folding', value: 60, sentiment: 'neutral', category: 'topic' },
      { id: 'tp3', label: 'Drug Design', value: 45, sentiment: 'positive', category: 'topic' },
      { id: 'tp4', label: 'Genomics', value: 35, sentiment: 'negative', category: 'topic' },
      { id: 'tp5', label: 'Molecular Sim', value: 28, sentiment: 'neutral', category: 'topic' },
      { id: 'tp6', label: 'Immune Resp', value: 20, sentiment: 'positive', category: 'topic' },
    ],
    type: [
      { id: 'ty1', label: 'Team Meeting', value: 180, sentiment: 'positive', category: 'type' },
      { id: 'ty2', label: 'Individual', value: 85, sentiment: 'neutral', category: 'type' },
    ],
  }
}

// ============================================================
// Squarified Treemap Layout
// ============================================================

function squarify(items: { id: string; label: string; value: number; sentiment: string; color: string; depth: number; parentId?: string; category?: string }[], x: number, y: number, w: number, h: number): Rect[] {
  if (items.length === 0) return []
  if (w <= 0 || h <= 0) return []

  const totalValue = items.reduce((s, i) => s + i.value, 0)
  if (totalValue === 0) return []

  const sorted = [...items].sort((a, b) => b.value - a.value)
  const rects: Rect[] = []
  const remaining = [...sorted]

  let cx = x, cy = y, cw = w, ch = h

  while (remaining.length > 0) {
    const row: typeof remaining = []
    const rowTotal = remaining.reduce((s, i) => s + i.value, 0)

    if (remaining.length === 1) {
      const item = remaining[0]
      const rw = (item.value / Math.max(totalValue, 1)) * cw
      const rh = (item.value / Math.max(totalValue, 1)) * ch
      const finalW = cw >= ch ? rw : cw
      const finalH = cw >= ch ? ch : rh
      rects.push({
        id: item.id, label: item.label, x: cx, y: cy,
        w: finalW, h: finalH, color: item.color, value: item.value,
        sentiment: item.sentiment, depth: item.depth, parentId: item.parentId, category: item.category,
      })
      break
    }

    // Lay out along the shorter side
    const horizontal = cw >= ch

    // Add items to row
    row.push(remaining.shift()!)
    let rowValue = row[0].value

    while (remaining.length > 0) {
      const candidate = remaining[0]
      const newRowValue = rowValue + candidate.value
      const sideLen = horizontal ? ch : cw
      const totalRowLen = (newRowValue / Math.max(rowTotal, 1)) * (horizontal ? cw : ch)
      const worstRatio = Math.max(
        ...row.map(item => {
          const itemLen = (item.value / Math.max(newRowValue, 1)) * sideLen
          return Math.max(totalRowLen / Math.max(itemLen, 1), itemLen / Math.max(totalRowLen, 1))
        })
      )

      // Check if adding makes it worse
      const testRow = [...row, candidate]
      const testWorst = Math.max(
        ...testRow.map(item => {
          const itemLen = (item.value / Math.max(newRowValue, 1)) * sideLen
          return Math.max(totalRowLen / Math.max(itemLen, 1), itemLen / Math.max(totalRowLen, 1))
        })
      )

      if (testWorst <= worstRatio * 1.2) {
        row.push(remaining.shift()!)
        rowValue = newRowValue
      } else {
        break
      }
    }

    // Position row items
    const rowFrac = rowValue / Math.max(totalValue, 1)
    if (horizontal) {
      const rowWidth = rowFrac * cw
      let offsetY = 0
      row.forEach(item => {
        const itemH = (item.value / Math.max(rowValue, 1)) * ch
        rects.push({
          id: item.id, label: item.label, x: cx, y: cy + offsetY,
          w: rowWidth, h: itemH, color: item.color, value: item.value,
          sentiment: item.sentiment, depth: item.depth, parentId: item.parentId, category: item.category,
        })
        offsetY += itemH
      })
      cx += rowWidth
      cw -= rowWidth
    } else {
      const rowHeight = rowFrac * ch
      let offsetX = 0
      row.forEach(item => {
        const itemW = (item.value / Math.max(rowValue, 1)) * cw
        rects.push({
          id: item.id, label: item.label, x: cx + offsetX, y: cy,
          w: itemW, h: rowHeight, color: item.color, value: item.value,
          sentiment: item.sentiment, depth: item.depth, parentId: item.parentId, category: item.category,
        })
        offsetX += itemW
      })
      cy += rowHeight
      ch -= rowHeight
    }
  }

  return rects
}

// ============================================================
// Treemap Component
// ============================================================

export function EnhancedTreemap({ data, view = 'agent', width = 800, height = 450 }: TreemapProps) {
  const [currentView, setCurrentView] = useState<TreemapView>(view)
  const [zoomedCell, setZoomedCell] = useState<string | null>(null)
  const [hoveredCell, setHoveredCell] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; cell: Rect } | null>(null)
  const [breadcrumb, setBreadcrumb] = useState<Array<{ id: string; label: string }>>([])

  const allData = useMemo(() => generateTreemapDemoData(), [])
  const currentData = allData[currentView] || data || []

  // Layout calculation
  const rects = useMemo(() => {
    const colors = VIEW_COLORS[currentView] || VIEW_COLORS.agent
    const items = currentData.map((cell, idx) => ({
      id: cell.id,
      label: cell.label,
      value: cell.value,
      sentiment: cell.sentiment,
      color: cell.color || colors[idx % colors.length],
      depth: 0,
      parentId: cell.parentId,
      category: cell.category,
    }))

    // If a cell is zoomed, expand it
    if (zoomedCell) {
      const zoomed = currentData.find(c => c.id === zoomedCell)
      if (zoomed && zoomed.children && zoomed.children.length > 0) {
        const childColors = VIEW_COLORS[currentView] || VIEW_COLORS.agent
        const childItems = zoomed.children.map((child, idx) => ({
          id: child.id,
          label: child.label,
          value: child.value,
          sentiment: child.sentiment,
          color: child.color || childColors[(idx + 2) % childColors.length],
          depth: 1,
          parentId: zoomed.id,
          category: child.category,
        }))
        return squarify(childItems, 8, 8, width - 16, height - 16)
      }
    }

    return squarify(items, 8, 8, width - 16, height - 16)
  }, [currentData, currentView, width, height, zoomedCell])

  const handleCellClick = useCallback((cell: Rect) => {
    const cellData = currentData.find(c => c.id === cell.id)
    if (cellData?.children && cellData.children.length > 0) {
      setZoomedCell(cell.id)
      setBreadcrumb(prev => [...prev, { id: cell.id, label: cell.label }])
    } else {
      setZoomedCell(null)
      setBreadcrumb(prev => [...prev, { id: cell.id, label: cell.label }])
    }
  }, [currentData])

  const handleBreadcrumbClick = useCallback((index: number) => {
    setBreadcrumb(prev => prev.slice(0, index + 1))
    if (index === 0) {
      setZoomedCell(null)
    } else {
      setZoomedCell(null)
    }
  }, [])

  const handleReset = useCallback(() => {
    setZoomedCell(null)
    setBreadcrumb([])
    setHoveredCell(null)
  }, [])

  return (
    <div className="viz-treemap-container vl-inner rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-xs font-semibold vl-text-heading flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          {t('en', 'viz.treemap.title') || 'Research Data Treemap'}
        </h3>
        <div className="flex items-center gap-2">
          {(Object.keys(VIEW_LABELS) as TreemapView[]).map(v => (
            <button
              key={v}
              onClick={() => { setCurrentView(v); setZoomedCell(null); setBreadcrumb([]) }}
              className={`viz-treemap-view-btn ${currentView === v ? 'active' : ''}`}
            >
              {VIEW_LABELS[v]}
            </button>
          ))}
          <button
            onClick={handleReset}
            className="text-[10px] px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors flex items-center gap-1"
          >
            <RotateCcw className="size-3" /> Reset
          </button>
        </div>
      </div>

      {/* Breadcrumb */}
      {breadcrumb.length > 0 && (
        <div className="viz-treemap-breadcrumb mb-2">
          <span className="viz-treemap-breadcrumb-item" onClick={() => handleBreadcrumbClick(-1)}>
            Root
          </span>
          {breadcrumb.map((crumb, idx) => (
            <React.Fragment key={crumb.id}>
              <ChevronRight className="size-3 viz-treemap-breadcrumb-separator" />
              <span
                className={`viz-treemap-breadcrumb-item ${idx === breadcrumb.length - 1 ? 'font-semibold' : ''}`}
                style={{ color: idx === breadcrumb.length - 1 ? 'var(--vl-accent, #10b981)' : undefined }}
                onClick={() => handleBreadcrumbClick(idx)}
              >
                {crumb.label}
              </span>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Treemap SVG */}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full rounded-lg" style={{ height: 'auto' }}>
        {rects.map((rect, idx) => {
          const isHovered = hoveredCell === rect.id
          const isZoomed = zoomedCell === rect.id
          const showLabel = rect.w > 40 && rect.h > 20

          return (
            <motion.g
              key={rect.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.03, duration: 0.3 }}
            >
              <rect
                x={rect.x} y={rect.y}
                width={Math.max(rect.w - 2, 0)} height={Math.max(rect.h - 2, 0)}
                rx={4}
                fill={rect.color}
                opacity={hoveredCell && hoveredCell !== rect.id ? 0.5 : 0.85}
                className="viz-treemap-cell"
                onMouseEnter={(e) => {
                  setHoveredCell(rect.id)
                  const svgEl = e.currentTarget.closest('svg')
                  if (svgEl) {
                    const svgRect = svgEl.getBoundingClientRect()
                    const scale = svgRect.width / width
                    setTooltip({
                      x: (rect.x + rect.w / 2) * scale,
                      y: rect.y * scale - 10,
                      cell: rect,
                    })
                  }
                }}
                onMouseLeave={() => { setHoveredCell(null); setTooltip(null) }}
                onClick={() => handleCellClick(rect)}
              />
              {/* Border highlight on zoom */}
              {isZoomed && (
                <rect
                  x={rect.x - 1} y={rect.y - 1}
                  width={rect.w + 2} height={rect.h + 2}
                  rx={5}
                  fill="none" stroke="#10b981" strokeWidth="2"
                  className="viz-treemap-cell-zoomed"
                />
              )}
              {/* Label */}
              {showLabel && (
                <g className="pointer-events-none">
                  <text
                    x={rect.x + 6} y={rect.y + 16}
                    className="viz-treemap-label"
                    fontSize="11"
                    fontWeight="600"
                  >
                    {rect.label.length > Math.floor(rect.w / 7) ? rect.label.slice(0, Math.floor(rect.w / 7) - 1) + '…' : rect.label}
                  </text>
                  <text
                    x={rect.x + 6} y={rect.y + 28}
                    className="viz-treemap-value"
                    fontSize="10"
                  >
                    {rect.value} msgs
                  </text>
                </g>
              )}
            </motion.g>
          )
        })}
      </svg>

      {/* Tooltip */}
      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="viz-network-tooltip"
            style={{
              left: Math.min(tooltip.x - 60, width - 160),
              top: Math.max(tooltip.y - 50, 4),
            }}
          >
            <p className="font-semibold" style={{ color: tooltip.cell.color }}>{tooltip.cell.label}</p>
            <p className="text-[10px] mt-1">Messages: {tooltip.cell.value}</p>
            <div className="flex items-center gap-1 mt-1">
              <div className="w-2 h-2 rounded-full" style={{ background: SENTIMENT_COLORS[tooltip.cell.sentiment] }} />
              <span className="text-[10px]">{tooltip.cell.sentiment}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          {Object.entries(SENTIMENT_COLORS).map(([sentiment, color]) => (
            <div key={sentiment} className="flex items-center gap-1.5 text-[10px] vl-text-muted">
              <div className="w-3 h-3 rounded-sm" style={{ background: color }} />
              <span className="capitalize">{sentiment}</span>
            </div>
          ))}
        </div>
        <div className="text-[10px] vl-text-muted">
          Size = message count
        </div>
      </div>
    </div>
  )
}
