'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { t } from '@/lib/i18n'

// ============================================================
// Types
// ============================================================

export interface HeatmapData {
  date: string // YYYY-MM-DD
  count: number
}

export interface CalendarHeatmapProps {
  data: HeatmapData[]
  year?: number
  cellSize?: number
  onDateClick?: (date: string) => void
}

// ============================================================
// Constants
// ============================================================

const INTENSITY_LEVELS = [
  'rgba(16, 185, 129, 0)',       // 0 - empty
  'rgba(16, 185, 129, 0.15)',    // 1 - light
  'rgba(16, 185, 129, 0.35)',    // 2 - medium
  'rgba(16, 185, 129, 0.55)',    // 3 - dark
  'rgba(16, 185, 129, 0.8)',     // 4 - intense
]

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_NAMES = ['Mon', 'Wed', 'Fri']

// ============================================================
// Demo Data Generator
// ============================================================

export function generateHeatmapDemoData(year: number): HeatmapData[] {
  const data: HeatmapData[] = []
  const startDate = new Date(year, 0, 1)
  const endDate = new Date(year, 11, 31)

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    const dayOfWeek = d.getDay()
    // More activity on weekdays, less on weekends
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const baseChance = isWeekend ? 0.3 : 0.7

    if (Math.random() < baseChance) {
      const count = isWeekend
        ? Math.floor(Math.random() * 3)
        : Math.floor(Math.random() * 8) + 1
      if (count > 0) {
        data.push({ date: dateStr, count })
      }
    }
  }
  return data
}

// ============================================================
// Compute streaks
// ============================================================

function computeStreaks(data: Map<string, number>, year: number) {
  const activeDays = data.size
  const dates = Array.from(data.keys()).sort()

  // Longest streak
  let longestStreak = 0
  let currentStreak = 0

  for (let i = 0; i < dates.length; i++) {
    if (i === 0) {
      currentStreak = 1
    } else {
      const prev = new Date(dates[i - 1])
      const curr = new Date(dates[i])
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays === 1) {
        currentStreak++
      } else {
        longestStreak = Math.max(longestStreak, currentStreak)
        currentStreak = 1
      }
    }
    longestStreak = Math.max(longestStreak, currentStreak)
  }

  // Current streak (from today backwards)
  const today = new Date()
  let curStreak = 0
  if (today.getFullYear() === year) {
    const checkDate = new Date(today)
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0]
      if (data.has(dateStr)) {
        curStreak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }
  } else {
    curStreak = 0
  }

  return { activeDays, longestStreak, currentStreak: curStreak }
}

// ============================================================
// Calendar Heatmap Component
// ============================================================

export function CalendarHeatmap({ data: inputData, year: inputYear, cellSize = 13, onDateClick }: CalendarHeatmapProps) {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(inputYear || currentYear)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; date: string; count: number } | null>(null)

  // Generate or use input data
  const data = useMemo(() => {
    if (inputData && inputData.length > 0) {
      const filtered = inputData.filter(d => d.date.startsWith(String(year)))
      if (filtered.length > 0) return filtered
    }
    return generateHeatmapDemoData(year)
  }, [inputData, year])

  const dataMap = useMemo(() => {
    const map = new Map<string, number>()
    data.forEach(d => map.set(d.date, d.count))
    return map
  }, [data])

  const maxCount = useMemo(() => Math.max(...data.map(d => d.count), 1), [data])

  // Stats
  const stats = useMemo(() => computeStreaks(dataMap, year), [dataMap, year])

  // Layout: 53 weeks x 7 days
  const weeks = 53
  const days = 7
  const padding = { top: 25, left: 32, right: 10, bottom: 10 }
  const svgWidth = padding.left + weeks * (cellSize + 2) + padding.right
  const svgHeight = padding.top + days * (cellSize + 2) + padding.bottom

  // Today's date string
  const todayStr = new Date().toISOString().split('T')[0]

  // Build cells
  const cells = useMemo(() => {
    const result: Array<{ x: number; y: number; date: string; count: number; level: number; isToday: boolean }> = []
    const startDate = new Date(year, 0, 1)
    // Adjust to Monday
    const startDay = startDate.getDay()
    const adjustedStart = new Date(startDate)
    adjustedStart.setDate(adjustedStart.getDate() - ((startDay + 6) % 7))

    for (let w = 0; w < weeks; w++) {
      for (let d = 0; d < days; d++) {
        const cellDate = new Date(adjustedStart)
        cellDate.setDate(cellDate.getDate() + w * 7 + d)

        if (cellDate.getFullYear() !== year) continue

        const dateStr = cellDate.toISOString().split('T')[0]
        const count = dataMap.get(dateStr) || 0
        const level = count === 0 ? 0 : count >= maxCount * 0.75 ? 4 : count >= maxCount * 0.5 ? 3 : count >= maxCount * 0.25 ? 2 : 1

        result.push({
          x: padding.left + w * (cellSize + 2),
          y: padding.top + d * (cellSize + 2),
          date: dateStr,
          count,
          level,
          isToday: dateStr === todayStr,
        })
      }
    }
    return result
  }, [year, dataMap, maxCount, cellSize, todayStr])

  // Month labels x positions
  const monthXPositions = useMemo(() => {
    const positions: Array<{ label: string; x: number }> = []
    for (let m = 0; m < 12; m++) {
      const firstOfMonth = new Date(year, m, 1)
      const dayOfWeek = firstOfMonth.getDay()
      const adjustedDay = (dayOfWeek + 6) % 7 // Monday = 0
      const weekNum = Math.floor((firstOfMonth.getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))
      const approxWeek = Math.max(0, Math.floor((new Date(year, m, 1).getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)))
      positions.push({
        label: MONTH_NAMES[m],
        x: padding.left + approxWeek * (cellSize + 2),
      })
    }
    return positions
  }, [year, cellSize])

  const handleCellEnter = useCallback((cell: typeof cells[0], e: React.MouseEvent) => {
    const svgEl = e.currentTarget.closest('svg')
    if (svgEl) {
      const svgRect = svgEl.getBoundingClientRect()
      const scaleX = svgRect.width / svgWidth
      const scaleY = svgRect.height / svgHeight
      setTooltip({
        x: (cell.x + cellSize) * scaleX,
        y: cell.y * scaleY - 10,
        date: cell.date,
        count: cell.count,
      })
    }
  }, [cellSize, svgWidth, svgHeight])

  const handleCellLeave = useCallback(() => {
    setTooltip(null)
  }, [])

  const handleCellClick = useCallback((cell: typeof cells[0]) => {
    if (onDateClick) {
      onDateClick(cell.date)
    }
  }, [onDateClick])

  return (
    <div className="viz-heatmap-container vl-inner rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-xs font-semibold vl-text-heading flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          {t('en', 'viz.heatmap.title') || 'Activity Calendar'}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setYear(y => y - 1)}
            className="p-1 rounded-md bg-gray-500/10 text-gray-400 border border-gray-500/20 hover:bg-gray-500/20 transition-colors"
          >
            <ChevronLeft className="size-3" />
          </button>
          <span className="text-xs font-medium vl-text-heading min-w-[48px] text-center">{year}</span>
          <button
            onClick={() => setYear(y => y + 1)}
            className="p-1 rounded-md bg-gray-500/10 text-gray-400 border border-gray-500/20 hover:bg-gray-500/20 transition-colors"
          >
            <ChevronRight className="size-3" />
          </button>
          <button
            onClick={() => setYear(currentYear)}
            className="text-[10px] px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      {/* Heatmap SVG */}
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full" style={{ minWidth: svgWidth, height: 'auto' }}>
        {/* Month labels */}
        {monthXPositions.map((mp, i) => (
          <text key={i} x={mp.x} y={14} className="viz-heatmap-month-label">
            {mp.label}
          </text>
        ))}

        {/* Day labels */}
        {DAY_NAMES.map((name, i) => {
          const dayIdx = i === 0 ? 1 : i === 1 ? 3 : 5
          return (
            <text key={name} x={padding.left - 4} y={padding.top + dayIdx * (cellSize + 2) + cellSize / 2} className="viz-heatmap-day-label">
              {name}
            </text>
          )
        })}

        {/* Cells */}
        {cells.map((cell) => (
          <rect
            key={cell.date}
            x={cell.x} y={cell.y}
            width={cellSize} height={cellSize}
            rx={2} ry={2}
            fill={INTENSITY_LEVELS[cell.level]}
            className={`viz-heatmap-cell ${cell.isToday ? 'viz-heatmap-cell-today' : ''}`}
            onMouseEnter={(e) => handleCellEnter(cell, e)}
            onMouseLeave={handleCellLeave}
            onClick={() => handleCellClick(cell)}
          />
        ))}
      </svg>

      {/* Tooltip */}
      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="viz-heatmap-tooltip"
            style={{
              left: Math.min(tooltip.x - 50, svgWidth - 160),
              top: Math.max(tooltip.y - 40, 4),
            }}
          >
            <p className="font-semibold text-[11px]">{tooltip.date}</p>
            <p className="text-[10px] vl-text-muted">
              {tooltip.count} activit{tooltip.count === 1 ? 'y' : 'ies'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
        <div className="viz-heatmap-legend">
          <span>Less</span>
          {INTENSITY_LEVELS.map((color, i) => (
            <rect key={i} width={cellSize - 2} height={cellSize - 2} rx={2} ry={2} fill={color} className="viz-heatmap-legend-cell" />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* Stats */}
      <div className="viz-heatmap-stats mt-2">
        <div className="viz-heatmap-stat-card">
          <div className="viz-heatmap-stat-value">{stats.activeDays}</div>
          <div className="viz-heatmap-stat-label">Active days</div>
        </div>
        <div className="viz-heatmap-stat-card">
          <div className="viz-heatmap-stat-value">{stats.longestStreak}</div>
          <div className="viz-heatmap-stat-label">Longest streak</div>
        </div>
        <div className="viz-heatmap-stat-card">
          <div className="viz-heatmap-stat-value">{stats.currentStreak}</div>
          <div className="viz-heatmap-stat-label">Current streak</div>
        </div>
      </div>
    </div>
  )
}
