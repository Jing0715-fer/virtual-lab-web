'use client'

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GitBranch, Network, TreePine, BarChart3, RefreshCw,
  Maximize2, Download, Loader2, Activity, Hash, Users, Calendar,
  ChevronDown, Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { Meeting } from './shared-components'

// Lazy imports for heavy visualization components
import { SankeyDiagram, generateMeetingSankeyDemoData } from './viz-sankey-diagram'
import { ForceGraph, generateForceGraphDemoData } from './viz-force-graph'
import { Treemap, generateTreemapDemoData } from './viz-treemap'

// ============================================================
// Types
// ============================================================

interface VisualizationGalleryTabProps {
  lang?: Lang
  meetings?: Meeting[]
}

type VizCardId = 'sankey' | 'force-graph' | 'treemap' | 'radar' | 'wordcloud' | 'heatmap'

interface VizCardConfig {
  id: VizCardId
  title: string
  description: string
  icon: React.ElementType
  color: string
  size: 'full' | 'half'
}

// ============================================================
// Skeleton fallback
// ============================================================

function VizCardSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div className="space-y-3">
      <div className="skeleton-gradient h-5 w-40 rounded-lg" />
      <div className="skeleton-gradient rounded-xl" style={{ height }} />
    </div>
  )
}

// ============================================================
// Mini Radar Chart (inline SVG for the gallery)
// ============================================================

function MiniRadarChart({ lang = 'en' }: { lang?: Lang }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { requestAnimationFrame(() => setMounted(true)) }, [])

  const width = 300
  const height = 280
  const cx = width / 2
  const cy = height / 2
  const maxR = Math.min(width, height) / 2 - 45
  const axes = ['Participation', 'Detail', 'Proactivity', 'Response', 'Conciseness']
  const numAxes = axes.length
  const step = (2 * Math.PI) / numAxes
  const start = -Math.PI / 2

  const datasets = [
    { label: 'PI Lead', color: '#8b5cf6', values: [85, 72, 90, 78, 65] },
    { label: 'Scientist', color: '#ec4899', values: [70, 88, 65, 82, 78] },
    { label: 'Analyst', color: '#14b8a6', values: [78, 80, 72, 90, 85] },
  ]

  return (
    <div className="vl-inner rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="size-4 text-violet-400" />
        <h3 className="text-xs font-semibold vl-text-heading">Agent Performance Radar</h3>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[300px] h-auto mx-auto">
        {/* Grid */}
        {[0.2, 0.4, 0.6, 0.8, 1.0].map((scale, ri) => {
          const points = axes.map((_, i) => {
            const r = maxR * scale
            return `${cx + r * Math.cos(start + i * step)},${cy + r * Math.sin(start + i * step)}`
          }).join(' ')
          return (
            <polygon
              key={ri}
              points={points}
              fill="none"
              stroke="var(--vl-border-subtle)"
              strokeWidth={1}
              opacity={mounted ? 0.4 : 0}
              style={{ transition: 'opacity 0.5s ease' }}
            />
          )
        })}
        {/* Axis lines + labels */}
        {axes.map((axis, i) => (
          <g key={i}>
            <line
              x1={cx} y1={cy}
              x2={cx + maxR * Math.cos(start + i * step)}
              y2={cy + maxR * Math.sin(start + i * step)}
              stroke="var(--vl-border-subtle)" strokeWidth={1}
              opacity={mounted ? 0.3 : 0}
              style={{ transition: 'opacity 0.5s ease' }}
            />
            <text
              x={cx + (maxR + 18) * Math.cos(start + i * step)}
              y={cy + (maxR + 18) * Math.sin(start + i * step)}
              textAnchor="middle" fill="var(--vl-text-muted)"
              fontSize={8} dominantBaseline="middle"
            >
              {axis}
            </text>
          </g>
        ))}
        {/* Dataset polygons */}
        {datasets.map((ds, di) => {
          const points = ds.values.map((val, i) => {
            const r = (val / 100) * maxR
            return `${cx + r * Math.cos(start + i * step)},${cy + r * Math.sin(start + i * step)}`
          }).join(' ')
          return (
            <g key={di}>
              <polygon
                points={points}
                fill={ds.color}
                fillOpacity={mounted ? 0.1 : 0}
                stroke={ds.color}
                strokeWidth={1.5}
                strokeOpacity={mounted ? 0.7 : 0}
                style={{
                  transition: `fill-opacity 0.8s ease ${di * 0.15}s, stroke-opacity 0.8s ease ${di * 0.15}s`,
                }}
              />
              {ds.values.map((val, i) => {
                const r = (val / 100) * maxR
                return (
                  <circle
                    key={i}
                    cx={cx + r * Math.cos(start + i * step)}
                    cy={cy + r * Math.sin(start + i * step)}
                    r={2.5}
                    fill={ds.color}
                    opacity={mounted ? 1 : 0}
                    style={{ transition: 'opacity 0.6s ease' }}
                  />
                )
              })}
            </g>
          )
        })}
        {/* Legend */}
        <g transform={`translate(${width - 80}, 10)`}>
          {datasets.map((ds, i) => (
            <g key={i} transform={`translate(0, ${i * 14})`}>
              <rect x={0} y={0} width={8} height={8} rx={2} fill={ds.color} />
              <text x={12} y={7} fill="var(--vl-text-muted)" fontSize={8}>{ds.label}</text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  )
}

// ============================================================
// Mini Word Cloud (CSS-based)
// ============================================================

function MiniWordCloud({ lang = 'en' }: { lang?: Lang }) {
  const words = [
    { word: 'methodology', count: 28 },
    { word: 'analysis', count: 24 },
    { word: 'nanobody', count: 22 },
    { word: 'binding', count: 20 },
    { word: 'expression', count: 18 },
    { word: 'affinity', count: 16 },
    { word: 'sequence', count: 15 },
    { word: 'crystallography', count: 14 },
    { word: 'validation', count: 12 },
    { word: 'specificity', count: 11 },
    { word: 'engineering', count: 10 },
    { word: 'structural', count: 9 },
    { word: 'purification', count: 8 },
    { word: 'characterization', count: 7 },
    { word: 'computational', count: 6 },
    { word: 'optimization', count: 5 },
  ]

  const maxCount = words[0]?.count || 1
  const minCount = words[words.length - 1]?.count || 1

  return (
    <div className="vl-inner rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Hash className="size-4 text-cyan-400" />
        <h3 className="text-xs font-semibold vl-text-heading">Topic Word Cloud</h3>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5 py-3">
        {words.map((item, idx) => {
          const range = maxCount - minCount || 1
          const normalized = (item.count - minCount) / range
          const fontSize = 0.65 + normalized * 1.1
          const opacity = 0.4 + normalized * 0.6
          const hue = 160 + normalized * 50
          const rotation = idx % 7 === 0 ? ((idx * 3) % 2 === 0 ? -6 : 6) : 0
          return (
            <motion.span
              key={item.word}
              className="inline-block cursor-default select-none"
              style={{
                fontSize: `${fontSize}rem`,
                opacity,
                color: `hsl(${hue}, 65%, ${40 + (1 - normalized) * 20}%)`,
                transform: `rotate(${rotation}deg)`,
                fontWeight: normalized > 0.6 ? 700 : normalized > 0.3 ? 500 : 400,
              }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity }}
              transition={{ delay: idx * 0.025, duration: 0.25 }}
              whileHover={{ scale: 1.15, opacity: 1 }}
              title={`${item.word}: ${item.count} occurrences`}
            >
              {item.word}
            </motion.span>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================
// Mini Collaboration Heatmap
// ============================================================

function MiniHeatmap({ lang = 'en' }: { lang?: Lang }) {
  const agents = ['PI Lead', 'Scientist', 'Analyst', 'Reporter', 'Developer']
  const matrix = [
    [5, 4, 3, 2, 3],
    [4, 5, 2, 1, 3],
    [3, 2, 4, 2, 4],
    [2, 1, 2, 3, 2],
    [3, 3, 4, 2, 4],
  ]
  const maxVal = 5

  return (
    <div className="vl-inner rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="size-4 text-emerald-400" />
        <h3 className="text-xs font-semibold vl-text-heading">Collaboration Heatmap</h3>
      </div>
      <div className="overflow-x-auto">
        <div
          className="inline-grid gap-1 mx-auto"
          style={{ gridTemplateColumns: `auto repeat(${agents.length}, 1fr)` }}
        >
          <div />
          {agents.map(name => (
            <div key={`h-${name}`} className="text-[8px] vl-text-muted text-center truncate px-1" title={name}>
              {name.length > 5 ? name.slice(0, 5) + '…' : name}
            </div>
          ))}
          {agents.map((rowName, ri) => (
            <React.Fragment key={`row-${ri}`}>
              <div className="text-[8px] vl-text-muted text-right pr-1 truncate flex items-center" title={rowName}>
                {rowName.length > 5 ? rowName.slice(0, 5) + '…' : rowName}
              </div>
              {agents.map((_, ci) => {
                const val = matrix[ri]?.[ci] || 0
                const intensity = val / maxVal
                return (
                  <motion.div
                    key={`cell-${ri}-${ci}`}
                    className="flex items-center justify-center rounded-md text-[9px] font-medium min-h-[28px] min-w-[30px]"
                    style={{
                      backgroundColor: val > 0 ? `rgba(16, 185, 129, ${0.12 + intensity * 0.6})` : 'var(--vl-bg-inner)',
                      color: val > maxVal * 0.5 ? 'var(--vl-text-white)' : 'var(--vl-text-muted)',
                    }}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: (ri + ci) * 0.03, duration: 0.25 }}
                    title={`${rowName} × ${agents[ci]}: ${val} shared meetings`}
                  >
                    {val > 0 ? val : '—'}
                  </motion.div>
                )
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Visualization Card wrapper
// ============================================================

function VizCard({
  config,
  expanded,
  onExpand,
  children,
  delay = 0,
}: {
  config: VizCardConfig
  expanded: boolean
  onExpand: () => void
  children: React.ReactNode
  delay?: number
}) {
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={config.size === 'full' ? 'col-span-1 md:col-span-2' : 'col-span-1'}
    >
      <Card className="vl-card backdrop-blur-sm overflow-hidden group hover:shadow-lg transition-all duration-300 hover:border-[var(--vl-border)]">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${config.color}20` }}>
                <Icon className="size-4" style={{ color: config.color }} />
              </div>
              <div>
                <CardTitle className="text-sm" style={{ color: 'var(--vl-text-white)' }}>{config.title}</CardTitle>
                <CardDescription className="text-[10px] vl-text-muted">{config.description}</CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity vl-text-muted hover:text-emerald-400"
              onClick={onExpand}
              title="Expand to full view"
            >
              <Maximize2 className="size-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {children}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ============================================================
// Full Screen Dialog
// ============================================================

function FullScreenDialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6 vl-dialog">
        <DialogHeader>
          <DialogTitle style={{ color: 'var(--vl-text-white)' }}>{title}</DialogTitle>
          <DialogDescription className="vl-text-muted">Full-screen visualization view</DialogDescription>
        </DialogHeader>
        <div className="mt-4">{children}</div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Export PNG helper
// ============================================================

function exportElementAsPng(elementId: string, filename: string) {
  const el = document.getElementById(elementId)
  if (!el) return

  // If it contains a canvas, export directly
  const canvas = el.querySelector('canvas')
  if (canvas) {
    const a = document.createElement('a')
    a.download = filename
    a.href = canvas.toDataURL('image/png')
    a.click()
    return
  }

  // If it contains an SVG, convert to canvas
  const svg = el.querySelector('svg')
  if (svg) {
    const svgData = new XMLSerializer().serializeToString(svg)
    const cvs = document.createElement('canvas')
    const bbox = svg.getBoundingClientRect()
    const scale = 2
    cvs.width = bbox.width * scale
    cvs.height = bbox.height * scale
    const ctx = cvs.getContext('2d')
    if (!ctx) return
    ctx.scale(scale, scale)
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = '#0a0a0f'
      ctx.fillRect(0, 0, bbox.width, bbox.height)
      ctx.drawImage(img, 0, 0, bbox.width, bbox.height)
      const a = document.createElement('a')
      a.download = filename
      a.href = cvs.toDataURL('image/png')
      a.click()
    }
    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`
  }
}

// ============================================================
// Main Export: VisualizationGalleryTab
// ============================================================

export function VisualizationGalleryTab({ lang = 'en', meetings }: VisualizationGalleryTabProps) {
  const [selectedMeeting, setSelectedMeeting] = useState<string>('all')
  const [sankeyData, setSankeyData] = useState(() => generateMeetingSankeyDemoData())
  const [forceData, setForceData] = useState(() => generateForceGraphDemoData())
  const [treemapData, setTreemapData] = useState(() => generateTreemapDemoData())
  const [loading, setLoading] = useState(false)
  const [expandedCard, setExpandedCard] = useState<VizCardId | null>(null)
  const [activeCards, setActiveCards] = useState<VizCardId[]>([
    'sankey', 'force-graph', 'treemap', 'radar', 'wordcloud', 'heatmap',
  ])
  const initializedRef = useRef(false)

  const VIZ_CARDS: VizCardConfig[] = [
    { id: 'sankey', title: 'Sankey Flow Diagram', description: 'Topic → Agent message flow', icon: GitBranch, color: '#10b981', size: 'full' },
    { id: 'force-graph', title: 'Collaboration Network', description: 'Agent interaction graph', icon: Network, color: '#06b6d4', size: 'full' },
    { id: 'treemap', title: 'Topic Distribution', description: 'Hierarchical topic breakdown', icon: TreePine, color: '#f59e0b', size: 'full' },
    { id: 'radar', title: 'Performance Radar', description: 'Agent metric comparison', icon: BarChart3, color: '#8b5cf6', size: 'half' },
    { id: 'wordcloud', title: 'Word Cloud', description: 'Research topic frequency', icon: Sparkles, color: '#ec4899', size: 'half' },
    { id: 'heatmap', title: 'Collaboration Heatmap', description: 'Shared meeting matrix', icon: Calendar, color: '#14b8a6', size: 'half' },
  ]

  const fetchVisualizationData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedMeeting !== 'all') params.set('meetingId', selectedMeeting)
      params.set('type', 'all')

      const res = await fetch(`/api/visualization-data?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch visualization data')
      const json = await res.json()

      if (json.sankey) setSankeyData(json.sankey)
      if (json.forceGraph) setForceData(json.forceGraph)
      if (json.treemap) setTreemapData(json.treemap)
    } catch {
      // Fallback to demo data on error
      setSankeyData(generateMeetingSankeyDemoData())
      setForceData(generateForceGraphDemoData())
      setTreemapData(generateTreemapDemoData())
    } finally {
      setLoading(false)
    }
  }, [selectedMeeting])

  // Load data on mount and when meeting changes
  useEffect(() => {
    fetchVisualizationData()
  }, [fetchVisualizationData])

  const handleExport = useCallback((cardId: VizCardId) => {
    const filename = `viz-${cardId}.png`
    const elementId = `viz-${cardId}`
    exportElementAsPng(elementId, filename)
  }, [])

  const toggleCard = useCallback((id: VizCardId) => {
    setActiveCards(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }, [])

  const visibleCards = VIZ_CARDS.filter(c => activeCards.includes(c.id))

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 flex items-center justify-center border border-emerald-500/20">
            <BarChart3 className="size-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold vl-text-heading tracking-tight">Data Visualization Gallery</h2>
            <p className="text-xs vl-text-muted">Advanced visualizations for meeting analytics</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Meeting selector */}
          <Select value={selectedMeeting} onValueChange={setSelectedMeeting}>
            <SelectTrigger className="h-8 w-48 text-xs">
              <SelectValue placeholder="Select meeting" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Meetings (Aggregate)</SelectItem>
              {meetings?.map(m => (
                <SelectItem key={m.id} value={m.id}>
                  {m.saveName || m.agenda?.substring(0, 30) || m.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-[10px] gap-1"
            onClick={fetchVisualizationData}
            disabled={loading}
          >
            <RefreshCw className={`size-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* Card type toggles */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] vl-text-muted mr-1">Show:</span>
        {VIZ_CARDS.map(config => (
          <button
            key={config.id}
            onClick={() => toggleCard(config.id)}
            className={`text-[10px] px-2 py-1 rounded-md border transition-colors flex items-center gap-1 ${
              activeCards.includes(config.id)
                ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                : 'border-[var(--vl-border-subtle)] vl-text-muted hover:text-white'
            }`}
          >
            <config.icon className="size-3" />
            {config.title.split(' ')[0]}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleCards.map((config, i) => {
          const isExpanded = expandedCard === config.id
          const cardId = `viz-${config.id}`

          const renderContent = () => {
            if (loading) return <VizCardSkeleton height={config.size === 'full' ? 320 : 280} />

            switch (config.id) {
              case 'sankey':
                return (
                  <div id={cardId}>
                    <SankeyDiagram data={sankeyData} lang={lang} />
                  </div>
                )
              case 'force-graph':
                return (
                  <div id={cardId}>
                    <ForceGraph
                      nodes={forceData.nodes}
                      edges={forceData.edges}
                      lang={lang}
                    />
                  </div>
                )
              case 'treemap':
                return (
                  <div id={cardId}>
                    <Treemap data={treemapData} lang={lang} />
                  </div>
                )
              case 'radar':
                return (
                  <div id={cardId}>
                    <MiniRadarChart lang={lang} />
                  </div>
                )
              case 'wordcloud':
                return (
                  <div id={cardId}>
                    <MiniWordCloud lang={lang} />
                  </div>
                )
              case 'heatmap':
                return (
                  <div id={cardId}>
                    <MiniHeatmap lang={lang} />
                  </div>
                )
              default:
                return null
            }
          }

          return (
            <VizCard
              key={config.id}
              config={config}
              expanded={isExpanded}
              onExpand={() => setExpandedCard(config.id)}
              delay={i * 0.06}
            >
              <div className="relative">
                {renderContent()}

                {/* Export button overlay */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute bottom-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity vl-text-muted hover:text-emerald-400 bg-[var(--vl-bg-secondary)]/80 backdrop-blur-sm"
                  onClick={() => handleExport(config.id)}
                  title="Export as PNG"
                >
                  <Download className="size-3" />
                </Button>
              </div>
            </VizCard>
          )
        })}
      </div>

      {/* Full Screen Dialog */}
      <AnimatePresence>
        {expandedCard && (
          <FullScreenDialog
            open={!!expandedCard}
            onClose={() => setExpandedCard(null)}
            title={VIZ_CARDS.find(c => c.id === expandedCard)?.title || 'Visualization'}
          >
            <div id={`viz-full-${expandedCard}`}>
              {expandedCard === 'sankey' && <SankeyDiagram data={sankeyData} width={900} height={500} lang={lang} />}
              {expandedCard === 'force-graph' && <ForceGraph nodes={forceData.nodes} edges={forceData.edges} width={900} height={550} lang={lang} />}
              {expandedCard === 'treemap' && <Treemap data={treemapData} width={900} height={550} lang={lang} />}
              {expandedCard === 'radar' && <MiniRadarChart lang={lang} />}
              {expandedCard === 'wordcloud' && <MiniWordCloud lang={lang} />}
              {expandedCard === 'heatmap' && <MiniHeatmap lang={lang} />}
            </div>
          </FullScreenDialog>
        )}
      </AnimatePresence>
    </div>
  )
}
