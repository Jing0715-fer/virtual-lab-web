'use client'

import React, { useState, Component } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, TreePine, ArrowDownNarrowWide, GitCompareArrows, Crosshair, Gauge, AlertTriangle } from 'lucide-react'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { Agent, Meeting } from './shared-components'
import {
  TreemapChart, FunnelChart, RadialBarChartComponent, ScatterPlot, LegacyGaugeChart as GaugeChart,
} from './advanced-charts'

type ChartType = 'treemap' | 'funnel' | 'radialBar' | 'scatter' | 'gauge'

interface VizSlotConfig {
  id: ChartType
  titleKey: string
  descKey: string
  icon: React.ElementType
  color: string
}

const CHART_TYPES: VizSlotConfig[] = [
  { id: 'treemap', titleKey: 'viz.treemap.title', descKey: 'viz.treemap.description', icon: TreePine, color: '#10b981' },
  { id: 'funnel', titleKey: 'viz.funnel.title', descKey: 'viz.funnel.description', icon: ArrowDownNarrowWide, color: '#06b6d4' },
  { id: 'radialBar', titleKey: 'viz.radialBar.title', descKey: 'viz.radialBar.description', icon: GitCompareArrows, color: '#8b5cf6' },
  { id: 'scatter', titleKey: 'viz.scatter.title', descKey: 'viz.scatter.description', icon: Crosshair, color: '#f59e0b' },
  { id: 'gauge', titleKey: 'viz.gauge.title', descKey: 'viz.gauge.description', icon: Gauge, color: '#ef4444' },
]

// Error boundary to isolate chart crashes
class ChartErrorBoundary extends Component<{ children: React.ReactNode; lang: Lang }, { hasError: boolean; error: string }> {
  constructor(props: { children: React.ReactNode; lang: Lang }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <AlertTriangle className="size-5 text-amber-400 mb-2" />
          <p className="text-xs vl-text-muted">{t(this.props.lang, 'viz.error.loadFailed') || 'Chart failed to load'}</p>
          <p className="text-[10px] vl-text-muted mt-1 opacity-50">{this.state.error?.substring(0, 80)}</p>
        </div>
      )
    }
    return this.props.children
  }
}

interface VisualizationPanelProps {
  agents: Agent[]
  meetings: Meeting[]
  lang: Lang
}

export function VisualizationPanel({ agents, meetings, lang }: VisualizationPanelProps) {
  // Each slot can show any chart type; default: treemap, funnel, radialBar, scatter, gauge
  const defaultSlots: ChartType[] = ['treemap', 'funnel', 'radialBar', 'scatter', 'gauge']
  const [slotCharts, setSlotCharts] = useState<ChartType[]>(defaultSlots)
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null)

  const handleSwapChart = (slotIndex: number, chartId: ChartType) => {
    setSlotCharts(prev => {
      const next = [...prev]
      next[slotIndex] = chartId
      return next
    })
  }

  const renderChart = (chartType: ChartType) => {
    try {
      switch (chartType) {
        case 'treemap': return <TreemapChart agents={agents} meetings={meetings} lang={lang} />
        case 'funnel': return <FunnelChart meetings={meetings} lang={lang} />
        case 'radialBar': return <RadialBarChartComponent agents={agents} meetings={meetings} lang={lang} />
        case 'scatter': return <ScatterPlot agents={agents} meetings={meetings} lang={lang} />
        case 'gauge': return <GaugeChart agents={agents} meetings={meetings} lang={lang} />
        default: return null
      }
    } catch {
      return null
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Panel Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 flex items-center justify-center border border-emerald-500/20">
          <BarChart3 className="size-4.5 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold vl-text-heading tracking-tight">{t(lang, 'viz.panel.title')}</h2>
          <p className="text-xs vl-text-muted">{t(lang, 'viz.panel.description')}</p>
        </div>
      </div>

      {/* Chart Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {slotCharts.map((chartId, slotIndex) => {
          const config = CHART_TYPES.find(c => c.id === chartId) || CHART_TYPES[0]
          const Icon = config.icon

          return (
            <motion.div
              key={`slot-${slotIndex}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: slotIndex * 0.08, duration: 0.4 }}
              className="chart-card viz-panel-glass"
              onMouseEnter={() => setHoveredSlot(slotIndex)}
              onMouseLeave={() => setHoveredSlot(null)}
            >
              <div className="chart-card-header">
                <h3 className="flex items-center gap-1.5">
                  <Icon className="size-3.5" style={{ color: config.color }} />
                  {t(lang, config.titleKey)}
                </h3>
                <div className="chart-controls">
                  {hoveredSlot === slotIndex && (
                    <div className="chart-type-toggle">
                      {CHART_TYPES.map(ct => (
                        <button
                          key={ct.id}
                          title={t(lang, ct.titleKey)}
                          className={slotCharts[slotIndex] === ct.id ? 'active' : ''}
                          style={slotCharts[slotIndex] === ct.id ? { backgroundColor: `${ct.color}20`, color: ct.color } : {}}
                          onClick={() => handleSwapChart(slotIndex, ct.id)}
                        >
                          <ct.icon className="size-3.5" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="px-4 pb-4">
                <ChartErrorBoundary lang={lang}>
                  {renderChart(chartId)}
                </ChartErrorBoundary>
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
