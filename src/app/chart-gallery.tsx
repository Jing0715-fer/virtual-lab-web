'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart3, TrendingUp, PieChart, ScatterChart as ScatterIcon,
  AreaChart, Radar, Gauge, GitBranch, Network,
  RefreshCw, Download, Image,
} from 'lucide-react'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import {
  SankeyDiagram, ForceDirectedGraph, GaugeChart, RadarChart,
  generateSankeyDemoData, generateForceDemoData, generateRadarDemoData,
  type SankeyNode, type SankeyLink, type ForceNode, type ForceEdge, type RadarAxis, type RadarDataset,
} from './advanced-charts'

// ============================================================
// Chart Types
// ============================================================

type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'radar' | 'gauge' | 'sankey' | 'force'

interface ChartTypeItem {
  id: ChartType
  icon: React.ElementType
  labelKey: string
}

const CHART_TYPES: ChartTypeItem[] = [
  { id: 'bar', icon: BarChart3, labelKey: 'chartGallery.type.bar' },
  { id: 'line', icon: TrendingUp, labelKey: 'chartGallery.type.line' },
  { id: 'pie', icon: PieChart, labelKey: 'chartGallery.type.pie' },
  { id: 'scatter', icon: ScatterIcon, labelKey: 'chartGallery.type.scatter' },
  { id: 'area', icon: AreaChart, labelKey: 'chartGallery.type.area' },
  { id: 'radar', icon: Radar, labelKey: 'chartGallery.type.radar' },
  { id: 'gauge', icon: Gauge, labelKey: 'chartGallery.type.gauge' },
  { id: 'sankey', icon: GitBranch, labelKey: 'chartGallery.type.sankey' },
  { id: 'force', icon: Network, labelKey: 'chartGallery.type.force' },
]

// ============================================================
// Random Data Generators for Simple Charts
// ============================================================

interface BarDataPoint { label: string; value: number; color: string }
interface PieDataPoint { name: string; value: number; color: string }
interface ScatterDataPoint { x: number; y: number; color: string }

const COLORS = ['#10b981', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316']

function generateBarData(): BarDataPoint[] {
  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug']
  return labels.map((label, i) => ({
    label,
    value: Math.round(Math.random() * 80 + 20),
    color: COLORS[i % COLORS.length],
  }))
}

function generateLineData(): BarDataPoint[] {
  const labels = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8']
  return labels.map((label, i) => ({
    label,
    value: Math.round(Math.random() * 60 + 30),
    color: '#10b981',
  }))
}

function generatePieData(): PieDataPoint[] {
  const names = ['Research', 'Analysis', 'Development', 'Testing', 'Review']
  return names.map((name, i) => ({
    name,
    value: Math.round(Math.random() * 100 + 10),
    color: COLORS[i % COLORS.length],
  }))
}

function generateScatterData(): ScatterDataPoint[] {
  return Array.from({ length: 30 }, (_, i) => ({
    x: Math.round(Math.random() * 100),
    y: Math.round(Math.random() * 100),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  }))
}

function generateAreaData(): BarDataPoint[] {
  const labels = ['Q1', 'Q2', 'Q3', 'Q4']
  return labels.map((label) => ({
    label,
    value: Math.round(Math.random() * 80 + 20),
    color: '#10b981',
  }))
}

// ============================================================
// Simple SVG Chart Components for Gallery
// ============================================================

function SimpleBarChart({ data }: { data: BarDataPoint[] }) {
  const maxVal = Math.max(...data.map(d => d.value), 1)
  const w = 400
  const h = 250
  const barW = (w - 60) / data.length * 0.6
  const gap = (w - 60) / data.length

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" id="gallery-chart-svg">
      <line x1={40} y1={10} x2={40} y2={h - 30} stroke="var(--vl-border-subtle)" strokeWidth={1} />
      <line x1={40} y1={h - 30} x2={w - 10} y2={h - 30} stroke="var(--vl-border-subtle)" strokeWidth={1} />
      {[0, 25, 50, 75, 100].map(tick => {
        const y = h - 30 - (tick / maxVal) * (h - 50)
        return (
          <g key={tick}>
            <line x1={35} y1={y} x2={40} y2={y} stroke="var(--vl-border-subtle)" strokeWidth={1} />
            <text x={30} y={y + 3} textAnchor="end" fill="var(--vl-text-muted)" fontSize={8}>{tick}</text>
          </g>
        )
      })}
      {data.map((d, i) => {
        const barH = (d.value / maxVal) * (h - 50)
        const x = 50 + i * gap
        const y = h - 30 - barH
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx={4} fill={d.color} opacity={0.85}>
              <animate attributeName="height" from="0" to={barH} dur="0.6s" fill="freeze" />
              <animate attributeName="y" from={h - 30} to={y} dur="0.6s" fill="freeze" />
            </rect>
            <text x={x + barW / 2} y={h - 18} textAnchor="middle" fill="var(--vl-text-muted)" fontSize={8}>{d.label}</text>
            <text x={x + barW / 2} y={y - 4} textAnchor="middle" fill="var(--vl-text-white)" fontSize={8} fontWeight={600}>{d.value}</text>
          </g>
        )
      })}
    </svg>
  )
}

function SimpleLineChart({ data }: { data: BarDataPoint[] }) {
  const maxVal = Math.max(...data.map(d => d.value), 1)
  const w = 400
  const h = 250
  const gap = (w - 60) / data.length
  const points = data.map((d, i) => `${50 + i * gap},${h - 30 - (d.value / maxVal) * (h - 50)}`).join(' ')
  const areaPoints = `M50,${h - 30} ${data.map((d, i) => `${50 + i * gap},${h - 30 - (d.value / maxVal) * (h - 50)}`).join(' ')} L${50 + (data.length - 1) * gap},${h - 30} Z`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" id="gallery-chart-svg">
      <line x1={40} y1={10} x2={40} y2={h - 30} stroke="var(--vl-border-subtle)" strokeWidth={1} />
      <line x1={40} y1={h - 30} x2={w - 10} y2={h - 30} stroke="var(--vl-border-subtle)" strokeWidth={1} />
      <polygon points={areaPoints} fill={COLORS[0]} fillOpacity={0.1} />
      <polyline points={points} fill="none" stroke={COLORS[0]} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => {
        const x = 50 + i * gap
        const y = h - 30 - (d.value / maxVal) * (h - 50)
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={4} fill={COLORS[0]} stroke="var(--vl-bg-card)" strokeWidth={2} />
            <text x={x} y={h - 18} textAnchor="middle" fill="var(--vl-text-muted)" fontSize={8}>{d.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

function SimplePieChart({ data }: { data: PieDataPoint[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const cx = 200
  const cy = 130
  const r = 90
  const angles = data.reduce<{start: number; end: number}[]>((acc, d, i) => {
    const start = i === 0 ? -Math.PI / 2 : acc[i - 1].end
    const angle = (d.value / total) * 2 * Math.PI
    acc.push({ start, end: start + angle })
    return acc
  }, [])

  return (
    <svg viewBox="0 0 400 260" className="w-full h-auto" id="gallery-chart-svg">
      {data.map((d, i) => {
        const { start: currentAngle, end: endAngle } = angles[i]
        const angle = (d.value / total) * 2 * Math.PI
        const x1 = cx + r * Math.cos(currentAngle)
        const y1 = cy + r * Math.sin(currentAngle)
        const x2 = cx + r * Math.cos(endAngle)
        const y2 = cy + r * Math.sin(endAngle)
        const largeArc = angle > Math.PI ? 1 : 0
        const path = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc} 1 ${x2},${y2} Z`
        const pct = Math.round((d.value / total) * 100)
        return (
          <g key={i}>
            <path d={path} fill={d.color} opacity={0.85} className="cursor-pointer hover:opacity-100 transition-opacity" />
            {pct > 5 && (
              <text
                x={cx + r * 0.6 * Math.cos(currentAngle - angle / 2)}
                y={cy + r * 0.6 * Math.sin(currentAngle - angle / 2)}
                textAnchor="middle" fill="#fff" fontSize={9} fontWeight={600}
              >
                {pct}%
              </text>
            )}
          </g>
        )
      })}
      {/* Legend */}
      <g transform="translate(310, 30)">
        {data.map((d, i) => (
          <g key={i} transform={`translate(0, ${i * 20})`}>
            <rect width={10} height={10} rx={2} fill={d.color} />
            <text x={14} y={9} fill="var(--vl-text-muted)" fontSize={8}>{d.name}</text>
          </g>
        ))}
      </g>
    </svg>
  )
}

function SimpleScatterChart({ data }: { data: ScatterDataPoint[] }) {
  const w = 400
  const h = 250
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" id="gallery-chart-svg">
      <line x1={40} y1={10} x2={40} y2={h - 30} stroke="var(--vl-border-subtle)" strokeWidth={1} />
      <line x1={40} y1={h - 30} x2={w - 10} y2={h - 30} stroke="var(--vl-border-subtle)" strokeWidth={1} />
      {data.map((d, i) => (
        <circle
          key={i}
          cx={50 + (d.x / 100) * (w - 70)}
          cy={h - 30 - (d.y / 100) * (h - 50)}
          r={4} fill={d.color} opacity={0.7}
          className="cursor-pointer hover:opacity-1 transition-opacity"
        />
      ))}
    </svg>
  )
}

function SimpleAreaChart({ data }: { data: BarDataPoint[] }) {
  const maxVal = Math.max(...data.map(d => d.value), 1)
  const w = 400
  const h = 250
  const gap = (w - 60) / data.length
  const points = data.map((d, i) => `${50 + i * gap},${h - 30 - (d.value / maxVal) * (h - 50)}`).join(' ')
  const areaPoints = `M50,${h - 30} ${points} L${50 + (data.length - 1) * gap},${h - 30} Z`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" id="gallery-chart-svg">
      <defs>
        <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
          <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
        </linearGradient>
      </defs>
      <line x1={40} y1={10} x2={40} y2={h - 30} stroke="var(--vl-border-subtle)" strokeWidth={1} />
      <line x1={40} y1={h - 30} x2={w - 10} y2={h - 30} stroke="var(--vl-border-subtle)" strokeWidth={1} />
      <polygon points={areaPoints} fill="url(#areaGrad)" />
      <polyline points={points} fill="none" stroke="#10b981" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => {
        const x = 50 + i * gap
        const y = h - 30 - (d.value / maxVal) * (h - 50)
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={3} fill="#10b981" stroke="var(--vl-bg-card)" strokeWidth={2} />
            <text x={x} y={h - 18} textAnchor="middle" fill="var(--vl-text-muted)" fontSize={8}>{d.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ============================================================
// Export Helpers
// ============================================================

function exportSvg() {
  const svgEl = document.getElementById('gallery-chart-svg')
  if (!svgEl) return
  const svgData = new XMLSerializer().serializeToString(svgEl)
  const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'chart.svg'
  a.click()
  URL.revokeObjectURL(url)
}

function exportPng() {
  const svgEl = document.getElementById('gallery-chart-svg')
  if (!svgEl) return
  const svgData = new XMLSerializer().serializeToString(svgEl)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const img = document.createElement('img')
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)
  img.onload = () => {
    canvas.width = 800
    canvas.height = 500
    if (ctx) {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, 800, 500)
      ctx.drawImage(img, 0, 0, 800, 500)
    }
    const pngUrl = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = pngUrl
    a.download = 'chart.png'
    a.click()
    URL.revokeObjectURL(url)
  }
  img.src = url
}

// ============================================================
// ChartGallery Component
// ============================================================

export function ChartGallery({ lang = 'en' }: { lang?: Lang }) {
  const [selectedType, setSelectedType] = useState<ChartType | null>(null)
  const [barData, setBarData] = useState<BarDataPoint[]>(generateBarData)
  const [lineData, setLineData] = useState<BarDataPoint[]>(generateLineData)
  const [pieData, setPieData] = useState<PieDataPoint[]>(generatePieData)
  const [scatterData, setScatterData] = useState<ScatterDataPoint[]>(generateScatterData)
  const [areaData, setAreaData] = useState<BarDataPoint[]>(generateAreaData)
  const [sankeyData, setSankeyData] = useState(generateSankeyDemoData)
  const [forceData, setForceData] = useState(generateForceDemoData)
  const [gaugeValue, setGaugeValue] = useState(72)
  const [radarData, setRadarData] = useState(generateRadarDemoData)
  const [toast, setToast] = useState<string | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }

  const randomizeAll = () => {
    setBarData(generateBarData())
    setLineData(generateLineData())
    setPieData(generatePieData())
    setScatterData(generateScatterData())
    setAreaData(generateAreaData())
    setSankeyData(generateSankeyDemoData())
    setForceData(generateForceDemoData())
    setGaugeValue(Math.round(Math.random() * 100))
    setRadarData(generateRadarDemoData())
  }

  const handleExportSvg = () => {
    exportSvg()
    showToast(t(lang, 'chartGallery.exported'))
  }

  const handleExportPng = () => {
    exportPng()
    showToast(t(lang, 'chartGallery.exported'))
  }

  const renderPreview = () => {
    if (!selectedType) return null

    // Advanced chart types render without the "gallery-chart-svg" id wrapper
    // For export, we'll wrap the simple SVGs; advanced ones export differently
    switch (selectedType) {
      case 'bar':
        return <SimpleBarChart data={barData} />
      case 'line':
        return <SimpleLineChart data={lineData} />
      case 'pie':
        return <SimplePieChart data={pieData} />
      case 'scatter':
        return <SimpleScatterChart data={scatterData} />
      case 'area':
        return <SimpleAreaChart data={areaData} />
      case 'radar':
        return (
          <div id="gallery-chart-svg">
            <RadarChart {...radarData} lang={lang} />
          </div>
        )
      case 'gauge':
        return (
          <div id="gallery-chart-svg">
            <GaugeChart value={gaugeValue} lang={lang} />
          </div>
        )
      case 'sankey':
        return (
          <div id="gallery-chart-svg">
            <SankeyDiagram {...sankeyData} lang={lang} />
          </div>
        )
      case 'force':
        return (
          <div id="gallery-chart-svg">
            <ForceDirectedGraph {...forceData} lang={lang} />
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold vl-text-heading">{t(lang, 'chartGallery.title')}</h2>
          <p className="text-xs vl-text-muted">{t(lang, 'chartGallery.description')}</p>
        </div>
        <button
          onClick={randomizeAll}
          className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors flex items-center gap-1.5"
        >
          <RefreshCw className="size-3" />
          {t(lang, 'chartGallery.randomData')}
        </button>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        {/* Left: Chart type selector */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold vl-text-heading">{t(lang, 'chartGallery.selectType')}</h3>
          <div className="grid grid-cols-3 gap-2">
            {CHART_TYPES.map((type, i) => {
              const isSelected = selectedType === type.id
              return (
                <motion.button
                  key={type.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => setSelectedType(type.id)}
                  className={`relative p-3 rounded-xl border transition-all duration-200 flex flex-col items-center gap-1.5 group cursor-pointer ${
                    isSelected
                      ? 'border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                      : 'border-[var(--vl-border-subtle)] bg-[var(--vl-bg-inner)] hover:border-emerald-500/30 hover:bg-emerald-500/5'
                  }`}
                >
                  <type.icon
                    className={`size-5 transition-colors ${
                      isSelected ? 'text-emerald-400' : 'vl-text-muted group-hover:text-emerald-400'
                    }`}
                  />
                  <span className={`text-[10px] font-medium transition-colors ${
                    isSelected ? 'text-emerald-400' : 'vl-text-muted group-hover:text-[var(--vl-text-white)]'
                  }`}>
                    {t(lang, type.labelKey)}
                  </span>
                  {isSelected && (
                    <motion.div
                      layoutId="chart-type-indicator"
                      className="absolute inset-0 rounded-xl border-2 border-emerald-500/40"
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    />
                  )}
                </motion.button>
              )
            })}
          </div>
        </div>

        {/* Right: Live Preview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold vl-text-heading">{t(lang, 'chartGallery.preview')}</h3>
            {selectedType && (
              <div className="flex gap-1.5">
                <button
                  onClick={handleExportSvg}
                  className="text-[10px] px-2 py-1 rounded-md vl-inner border border-[var(--vl-border-subtle)] vl-text-muted hover:text-emerald-400 hover:border-emerald-500/30 transition-colors flex items-center gap-1"
                >
                  <Download className="size-2.5" />
                  {t(lang, 'chartGallery.exportSvg')}
                </button>
                <button
                  onClick={handleExportPng}
                  className="text-[10px] px-2 py-1 rounded-md vl-inner border border-[var(--vl-border-subtle)] vl-text-muted hover:text-emerald-400 hover:border-emerald-500/30 transition-colors flex items-center gap-1"
                >
                  <Image className="size-2.5" />
                  {t(lang, 'chartGallery.exportPng')}
                </button>
              </div>
            )}
          </div>

          <div ref={previewRef} className="vl-card rounded-xl p-4 min-h-[300px] relative">
            <AnimatePresence mode="wait">
              {selectedType ? (
                <motion.div
                  key={selectedType}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  {renderPreview()}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-16"
                >
                  <BarChart3 className="size-12 vl-text-muted mb-3 opacity-30" />
                  <p className="text-sm vl-text-muted">{t(lang, 'chartGallery.noData')}</p>
                  <p className="text-xs vl-text-muted mt-1">{t(lang, 'chartGallery.noDataDesc')}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm border border-emerald-500/30 backdrop-blur-sm shadow-lg"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
