'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Maximize2, Download, Info } from 'lucide-react'
import { t } from '@/lib/i18n'
import { NetworkGraph, generateNetworkGraphDemoData } from './viz-network-graph'
import { EnhancedSankey, generateSankeyDemoData } from './viz-sankey-enhanced'
import { EnhancedTreemap } from './viz-treemap-enhanced'
import { ScatterPlot, generateScatterDemoData } from './viz-scatter-plot'
import { CalendarHeatmap } from './viz-calendar-heatmap'

// ============================================================
// Types
// ============================================================

interface VizItem {
  id: string
  title: string
  description: string
  badge: string
  category: string
}

// ============================================================
// Viz Definitions
// ============================================================

const VIZ_ITEMS: VizItem[] = [
  {
    id: 'network',
    title: 'Network Graph',
    description: 'Interactive force-directed graph showing agent collaboration networks with physics simulation, zoom, pan, and drag.',
    badge: 'Interactive',
    category: 'network',
  },
  {
    id: 'sankey',
    title: 'Sankey Flow',
    description: 'Alluvial diagram visualizing research flow from topics through methods, meetings, to outcomes.',
    badge: 'Flow',
    category: 'flow',
  },
  {
    id: 'treemap',
    title: 'Treemap',
    description: 'Hierarchical nested rectangles showing data proportions by agent, topic, or meeting type with sentiment coloring.',
    badge: 'Hierarchical',
    category: 'hierarchy',
  },
  {
    id: 'scatter',
    title: 'Scatter Plot',
    description: 'Agent analysis scatter plot with bubble sizes, trend lines, and quadrant classification.',
    badge: 'Statistical',
    category: 'statistical',
  },
  {
    id: 'heatmap',
    title: 'Calendar Heatmap',
    description: 'GitHub-style contribution calendar showing activity intensity across the year with streak tracking.',
    badge: 'Temporal',
    category: 'temporal',
  },
]

// ============================================================
// Preview SVGs for cards
// ============================================================

function NetworkPreview() {
  return (
    <svg viewBox="0 0 300 180" className="w-full h-full">
      <defs>
        <radialGradient id="p-glow-1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Edges */}
      <line x1="100" y1="80" x2="200" y2="60" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
      <line x1="150" y1="120" x2="80" y2="50" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      <line x1="200" y1="60" x2="250" y2="110" stroke="rgba(255,255,255,0.08)" strokeWidth="1.2" />
      <line x1="150" y1="120" x2="230" y2="130" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      <line x1="80" y1="50" x2="50" y2="120" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" />
      <line x1="100" y1="80" x2="150" y2="120" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />
      {/* Nodes */}
      <circle cx="100" cy="80" r="14" fill="#8b5cf6" opacity="0.8" />
      <circle cx="200" cy="60" r="12" fill="#ec4899" opacity="0.8" />
      <circle cx="80" cy="50" r="10" fill="#14b8a6" opacity="0.8" />
      <circle cx="150" cy="120" r="11" fill="#06b6d4" opacity="0.8" />
      <circle cx="250" cy="110" r="9" fill="#f97316" opacity="0.8" />
      <circle cx="230" cy="130" r="8" fill="#10b981" opacity="0.8" />
      <circle cx="50" cy="120" r="7" fill="#f59e0b" opacity="0.8" />
      {/* Labels */}
      <text x="100" y="83" textAnchor="middle" fill="#fff" fontSize="6">PI</text>
      <text x="200" y="63" textAnchor="middle" fill="#fff" fontSize="5">Critic</text>
      <text x="150" y="123" textAnchor="middle" fill="#fff" fontSize="5">Dev</text>
      {/* Glow effect */}
      <circle cx="100" cy="80" r="22" fill="url(#p-glow-1)" />
    </svg>
  )
}

function SankeyPreview() {
  return (
    <svg viewBox="0 0 300 180" className="w-full h-full">
      <defs>
        <linearGradient id="p-sankey-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      {/* Flows */}
      <path d="M 60 30 C 140 30 140 20 220 20 L 220 60 C 140 60 140 50 60 50 Z" fill="url(#p-sankey-grad)" opacity="0.6" />
      <path d="M 60 60 C 140 60 140 70 220 70 L 220 110 C 140 110 140 90 60 90 Z" fill="url(#p-sankey-grad)" opacity="0.4" />
      <path d="M 60 100 C 140 100 140 120 220 120 L 220 160 C 140 160 140 130 60 130 Z" fill="url(#p-sankey-grad)" opacity="0.3" />
      {/* Source nodes */}
      <rect x="50" y="25" width="10" height="30" rx="3" fill="#10b981" opacity="0.8" />
      <rect x="50" y="60" width="10" height="35" rx="3" fill="#06b6d4" opacity="0.8" />
      <rect x="50" y="100" width="10" height="35" rx="3" fill="#8b5cf6" opacity="0.8" />
      {/* Target nodes */}
      <rect x="220" y="15" width="10" height="50" rx="3" fill="#f59e0b" opacity="0.8" />
      <rect x="220" y="70" width="10" height="45" rx="3" fill="#ec4899" opacity="0.8" />
      <rect x="220" y="120" width="10" height="45" rx="3" fill="#ef4444" opacity="0.8" />
      {/* Labels */}
      <text x="46" y="44" textAnchor="end" fill="#94a3b8" fontSize="8">Topics</text>
      <text x="240" y="44" fill="#94a3b8" fontSize="8">Methods</text>
    </svg>
  )
}

function TreemapPreview() {
  return (
    <svg viewBox="0 0 300 180" className="w-full h-full">
      <rect x="10" y="10" width="140" height="80" rx="4" fill="#8b5cf6" opacity="0.7" />
      <rect x="150" y="10" width="140" height="50" rx="4" fill="#ec4899" opacity="0.7" />
      <rect x="150" y="60" width="80" height="50" rx="4" fill="#14b8a6" opacity="0.7" />
      <rect x="230" y="60" width="60" height="50" rx="4" fill="#f97316" opacity="0.7" />
      <rect x="10" y="90" width="90" height="80" rx="4" fill="#06b6d4" opacity="0.7" />
      <rect x="100" y="90" width="100" height="40" rx="4" fill="#10b981" opacity="0.7" />
      <rect x="100" y="130" width="100" height="40" rx="4" fill="#f59e0b" opacity="0.7" />
      <rect x="200" y="110" width="90" height="60" rx="4" fill="#ef4444" opacity="0.7" />
      {/* Labels */}
      <text x="80" y="54" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="600">PI Lead</text>
      <text x="80" y="66" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="7">92 msgs</text>
      <text x="220" y="38" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="600">Critic</text>
      <text x="55" y="134" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="600">Dev</text>
      <text x="150" y="114" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="600">Reviewer</text>
      <text x="245" y="144" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="600">PM</text>
    </svg>
  )
}

function ScatterPreview() {
  return (
    <svg viewBox="0 0 300 180" className="w-full h-full">
      {/* Grid */}
      <line x1="40" y1="140" x2="280" y2="140" stroke="#334155" strokeWidth="0.5" opacity="0.3" />
      <line x1="40" y1="30" x2="40" y2="140" stroke="#334155" strokeWidth="0.5" opacity="0.3" />
      <line x1="160" y1="30" x2="160" y2="140" stroke="#334155" strokeWidth="0.5" opacity="0.3" strokeDasharray="4,4" />
      <line x1="40" y1="85" x2="280" y2="85" stroke="#334155" strokeWidth="0.5" opacity="0.3" strokeDasharray="4,4" />
      {/* Trend line */}
      <line x1="50" y1="120" x2="270" y2="40" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.5" />
      {/* Bubbles */}
      <circle cx="230" cy="42" r="16" fill="#8b5cf6" opacity="0.6" />
      <circle cx="190" cy="55" r="14" fill="#ec4899" opacity="0.6" />
      <circle cx="130" cy="75" r="12" fill="#14b8a6" opacity="0.6" />
      <circle cx="100" cy="90" r="10" fill="#06b6d4" opacity="0.6" />
      <circle cx="170" cy="65" r="13" fill="#f97316" opacity="0.6" />
      <circle cx="80" cy="105" r="9" fill="#10b981" opacity="0.6" />
      <circle cx="60" cy="120" r="7" fill="#f59e0b" opacity="0.6" />
      <circle cx="110" cy="85" r="11" fill="#ef4444" opacity="0.6" />
      {/* Labels */}
      <text x="150" y="168" textAnchor="middle" fill="#94a3b8" fontSize="8">Messages per Meeting</text>
      <text x="18" y="88" textAnchor="middle" fill="#94a3b8" fontSize="7" transform="rotate(-90, 18, 88)">Rate</text>
    </svg>
  )
}

function HeatmapPreview() {
  const cells = []
  for (let w = 0; w < 20; w++) {
    for (let d = 0; d < 7; d++) {
      const level = Math.floor(Math.random() * 5)
      const colors = [
        'rgba(16,185,129,0)',
        'rgba(16,185,129,0.15)',
        'rgba(16,185,129,0.35)',
        'rgba(16,185,129,0.55)',
        'rgba(16,185,129,0.8)',
      ]
      cells.push(
        <rect
          key={`${w}-${d}`}
          x={30 + w * 13}
          y={20 + d * 13}
          width={11} height={11} rx={2} ry={2}
          fill={colors[level]}
        />
      )
    }
  }
  return (
    <svg viewBox="0 0 300 180" className="w-full h-full">
      {cells}
      <text x="150" y="14" textAnchor="middle" fill="#94a3b8" fontSize="8">Activity Overview</text>
      {/* Legend */}
      <text x="30" y="130" fill="#94a3b8" fontSize="7">Less</text>
      {[0, 0.15, 0.35, 0.55, 0.8].map((op, i) => (
        <rect key={i} x={50 + i * 14} y={123} width={11} height={11} rx={2} ry={2} fill={`rgba(16,185,129,${op})`} />
      ))}
      <text x="128" y="130" fill="#94a3b8" fontSize="7">More</text>
    </svg>
  )
}

const PREVIEW_COMPONENTS: Record<string, () => React.ReactElement> = {
  network: NetworkPreview,
  sankey: SankeyPreview,
  treemap: TreemapPreview,
  scatter: ScatterPreview,
  heatmap: HeatmapPreview,
}

// ============================================================
// Fullscreen Visualization Components
// ============================================================

function FullscreenViz({ vizId }: { vizId: string }) {
  switch (vizId) {
    case 'network': {
      const demoData = generateNetworkGraphDemoData()
      return <NetworkGraph nodes={demoData.nodes} edges={demoData.edges} />
    }
    case 'sankey': {
      const demoData = generateSankeyDemoData()
      return <EnhancedSankey nodes={demoData.nodes} links={demoData.links} />
    }
    case 'treemap':
      return <EnhancedTreemap data={[]} />
    case 'scatter': {
      const demoData = generateScatterDemoData()
      return <ScatterPlot agents={demoData} />
    }
    case 'heatmap':
      return <CalendarHeatmap data={[]} />
    default:
      return <div className="vl-text-muted text-center py-12">Unknown visualization</div>
  }
}

// ============================================================
// Gallery Component
// ============================================================

export function VizGalleryEnhanced() {
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [fullscreenViz, setFullscreenViz] = useState<string | null>(null)

  const tabs = [
    { id: 'all', label: 'All Visualizations' },
    { id: 'network', label: 'Network' },
    { id: 'flow', label: 'Flow' },
    { id: 'hierarchy', label: 'Hierarchy' },
    { id: 'statistical', label: 'Statistical' },
    { id: 'temporal', label: 'Temporal' },
  ]

  const filteredItems = useMemo(() => {
    return VIZ_ITEMS.filter(item => {
      const matchesTab = activeTab === 'all' || item.category === activeTab
      const matchesSearch = searchQuery === '' ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesTab && matchesSearch
    })
  }, [activeTab, searchQuery])

  const handleExport = useCallback(() => {
    const item = VIZ_ITEMS.find(v => v.id === fullscreenViz)
    if (item) {
      const svgEl = document.querySelector('.viz-gallery-fullscreen-viz svg')
      if (svgEl) {
        const svgData = new XMLSerializer().serializeToString(svgEl)
        const blob = new Blob([svgData], { type: 'image/svg+xml' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.download = `viz-${fullscreenViz}.svg`
        a.href = url
        a.click()
        URL.revokeObjectURL(url)
      }
    }
  }, [fullscreenViz])

  const handleExportPng = useCallback(() => {
    const svgEl = document.querySelector('.viz-gallery-fullscreen-viz svg')
    if (!svgEl) return
    const svgData = new XMLSerializer().serializeToString(svgEl)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const img = new Image()
    img.onload = () => {
      canvas.width = img.width * 2
      canvas.height = img.height * 2
      ctx.scale(2, 2)
      ctx.drawImage(img, 0, 0)
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.download = `viz-${fullscreenViz}.png`
          a.href = url
          a.click()
          URL.revokeObjectURL(url)
        }
      })
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }, [fullscreenViz])

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="p-6 pb-0">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold vl-text-heading flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
              </div>
              Enhanced Visualization Gallery
            </h2>
            <p className="text-sm vl-text-muted mt-1">
              Interactive data visualization components for research analytics
            </p>
          </div>
          <div className="text-xs vl-text-muted text-right">
            {filteredItems.length} visualization{filteredItems.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Tab bar */}
        <div className="viz-gallery-tab-bar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`viz-gallery-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="viz-gallery-search">
          <Search className="size-4 vl-text-muted flex-shrink-0" />
          <input
            type="text"
            placeholder="Search visualizations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="viz-gallery-search-input"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="vl-text-muted hover:text-white transition-colors">
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="viz-gallery-grid">
        <AnimatePresence mode="popLayout">
          {filteredItems.map((item, idx) => {
            const PreviewComponent = PREVIEW_COMPONENTS[item.id]
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: idx * 0.05, duration: 0.3 }}
                className="viz-gallery-card"
                onClick={() => setFullscreenViz(item.id)}
              >
                <div className="viz-gallery-card-badge">{item.badge}</div>
                <div className="viz-gallery-card-preview">
                  {PreviewComponent && <PreviewComponent />}
                </div>
                <div className="viz-gallery-card-info">
                  <div className="viz-gallery-card-title">{item.title}</div>
                  <div className="viz-gallery-card-desc">{item.description}</div>
                </div>
                <div className="absolute bottom-16 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Maximize2 className="size-4 vl-text-muted" />
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Fullscreen Modal */}
      <AnimatePresence>
        {fullscreenViz && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="viz-gallery-fullscreen"
            onClick={(e) => {
              if (e.target === e.currentTarget) setFullscreenViz(null)
            }}
          >
            {/* Header */}
            <div className="viz-gallery-fullscreen-header">
              <div className="flex items-center gap-3">
                <h3 className="viz-gallery-fullscreen-title">
                  {VIZ_ITEMS.find(v => v.id === fullscreenViz)?.title || 'Visualization'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportPng}
                  className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors flex items-center gap-1.5"
                >
                  <Download className="size-3" /> Export PNG
                </button>
                <button
                  onClick={() => setFullscreenViz(null)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-gray-500/10 text-gray-400 border border-gray-500/20 hover:bg-gray-500/20 transition-colors flex items-center gap-1.5"
                >
                  <X className="size-3" /> Close
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="viz-gallery-fullscreen-body">
              <div className="viz-gallery-fullscreen-viz">
                <FullscreenViz vizId={fullscreenViz} />
              </div>
              {/* Description Panel */}
              <div className="viz-gallery-fullscreen-panel">
                {VIZ_ITEMS.filter(v => v.id === fullscreenViz).map(item => (
                  <div key={item.id} className="vl-inner rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Info className="size-4 text-emerald-400" />
                      <span className="text-sm font-semibold vl-text-heading">About this visualization</span>
                    </div>
                    <p className="text-xs vl-text-muted leading-relaxed">{item.description}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {item.badge}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-400 border border-gray-500/20">
                        {item.category}
                      </span>
                    </div>

                    {/* Quick tips */}
                    <div className="mt-4 pt-3 border-t border-gray-500/10">
                      <h4 className="text-[11px] font-medium vl-text-heading mb-2">Quick Tips</h4>
                      <ul className="text-[10px] vl-text-muted space-y-1">
                        {item.id === 'network' && (
                          <>
                            <li>• Drag nodes to reposition them</li>
                            <li>• Scroll to zoom in/out</li>
                            <li>• Click nodes to see connections</li>
                            <li>• Drag background to pan</li>
                          </>
                        )}
                        {item.id === 'sankey' && (
                          <>
                            <li>• Hover flows for value details</li>
                            <li>• Drag nodes vertically</li>
                            <li>• Colors indicate categories</li>
                          </>
                        )}
                        {item.id === 'treemap' && (
                          <>
                            <li>• Click cells to drill down</li>
                            <li>• Switch between Agent/Topic/Type views</li>
                            <li>• Color indicates sentiment</li>
                            <li>• Size represents message count</li>
                          </>
                        )}
                        {item.id === 'scatter' && (
                          <>
                            <li>• Hover bubbles for exact values</li>
                            <li>• Toggle trend line and quadrants</li>
                            <li>• Bubble size = total messages</li>
                          </>
                        )}
                        {item.id === 'heatmap' && (
                          <>
                            <li>• Click cells to filter by date</li>
                            <li>• Use arrows to change year</li>
                            <li>• Track streaks in stats below</li>
                          </>
                        )}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
