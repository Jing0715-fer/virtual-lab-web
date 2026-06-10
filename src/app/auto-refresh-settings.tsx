'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings2,
  ToggleLeft,
  ToggleRight,
  Clock,
  Pause,
  Play,
  Gauge,
  Wifi,
  WifiOff,
  Bell,
  BarChart3,
  Users,
  Database,
  Zap,
  Radio,
} from 'lucide-react'
import { useLiveMetrics } from './live-metrics-provider'
import { t } from '@/lib/i18n'
import { toast } from 'sonner'

/* ============================================================
   Slider with live value display
   ============================================================ */
function IntervalSlider({
  label,
  icon,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  icon: React.ReactNode
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--vl-text-secondary)' }}>
          {icon}
          <span>{label}</span>
        </div>
        <span className="live-mono text-xs font-medium" style={{ color: 'var(--vl-text-heading)' }}>
          {value >= 1000 ? `${(value / 1000).toFixed(0)}s` : `${value}ms`}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1000}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="live-interval-slider w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, var(--vl-accent) 0%, var(--vl-accent) ${((value - min) / (max - min)) * 100}%, var(--vl-border-subtle) ${((value - min) / (max - min)) * 100}%, var(--vl-border-subtle) 100%)`,
        }}
      />
      <div className="flex justify-between text-xs" style={{ color: 'var(--vl-text-muted)' }}>
        <span>5s</span>
        <span>120s</span>
      </div>
    </div>
  )
}

/* ============================================================
   Widget toggle item
   ============================================================ */
function WidgetToggle({
  icon,
  label,
  enabled,
  onToggle,
}: {
  icon: React.ReactNode
  label: string
  enabled: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-3 w-full p-3 rounded-lg transition-colors"
      style={{
        background: enabled ? 'var(--vl-accent-bg)' : 'transparent',
        border: `1px solid ${enabled ? 'var(--vl-border-accent)' : 'var(--vl-border-subtle)'}`,
      }}
    >
      <div style={{ color: enabled ? 'var(--vl-accent)' : 'var(--vl-text-muted)' }}>
        {icon}
      </div>
      <span
        className="text-sm flex-1 text-left"
        style={{ color: enabled ? 'var(--vl-text-heading)' : 'var(--vl-text-muted)' }}
      >
        {label}
      </span>
      {enabled ? (
        <ToggleRight size={20} style={{ color: 'var(--vl-accent)' }} />
      ) : (
        <ToggleLeft size={20} style={{ color: 'var(--vl-text-muted)' }} />
      )}
    </button>
  )
}

/* ============================================================
   Refresh schedule visual preview
   ============================================================ */
function RefreshSchedulePreview({ config }: { config: { analyticsInterval: number; agentsInterval: number; meetingsInterval: number; notificationsInterval: number } }) {
  const intervals = [
    { label: 'Analytics', ms: config.analyticsInterval, color: '#10b981' },
    { label: 'Agents', ms: config.agentsInterval, color: '#06b6d4' },
    { label: 'Meetings', ms: config.meetingsInterval, color: '#f59e0b' },
    { label: 'Notifs', ms: config.notificationsInterval, color: '#8b5cf6' },
  ]

  // Normalize to 0-100% based on 120s max interval
  const maxInterval = 120000

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-medium" style={{ color: 'var(--vl-text-heading)' }}>
        Refresh Schedule Preview
      </h4>
      <div className="space-y-2">
        {intervals.map((item) => {
          const widthPercent = Math.max(10, (1 - item.ms / maxInterval) * 100)
          return (
            <div key={item.label} className="flex items-center gap-3">
              <span className="text-xs w-16" style={{ color: 'var(--vl-text-muted)' }}>
                {item.label}
              </span>
              <div className="flex-1 live-schedule-bar">
                <div
                  className="live-schedule-bar-fill"
                  style={{
                    width: `${widthPercent}%`,
                    background: item.color,
                  }}
                />
              </div>
              <span className="live-mono text-xs" style={{ color: 'var(--vl-text-muted)' }}>
                {item.ms / 1000}s
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ============================================================
   AutoRefreshSettings component
   ============================================================ */
export function AutoRefreshSettings() {
  const { config, setConfig, refreshAll, isLive } = useLiveMetrics()
  const [showSettings, setShowSettings] = useState(false)

  // Widget visibility toggles
  const [widgets, setWidgets] = useState({
    pulse: true,
    velocity: true,
    rings: true,
    ticker: true,
    health: true,
  })

  // Calculate requests per minute
  const requestsPerMinute = useMemo(() => {
    const analytics = 60 / (config.analyticsInterval / 1000)
    const agents = 60 / (config.agentsInterval / 1000)
    const meetings = 60 / (config.meetingsInterval / 1000)
    const notifications = 60 / (config.notificationsInterval / 1000)
    return Math.round((analytics + agents + meetings + notifications) * 10) / 10
  }, [config])

  const handleToggleGlobal = useCallback(() => {
    setConfig({ enabled: !config.enabled })
    toast.success(config.enabled ? 'Live updates paused' : 'Live updates resumed')
  }, [config.enabled, setConfig])

  const handlePauseAll = useCallback(() => {
    setConfig({
      analyticsInterval: 120000,
      agentsInterval: 120000,
      meetingsInterval: 120000,
      notificationsInterval: 120000,
    })
    toast.success('All intervals set to maximum (bandwidth conservation)')
  }, [setConfig])

  const handleWidgetToggle = useCallback((key: keyof typeof widgets) => {
    setWidgets((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-xs"
        style={{
          background: showSettings ? 'var(--vl-accent-bg)' : 'var(--vl-bg-inner)',
          border: `1px solid ${showSettings ? 'var(--vl-border-accent)' : 'var(--vl-border-subtle)'}`,
          color: showSettings ? 'var(--vl-accent)' : 'var(--vl-text-secondary)',
        }}
        aria-label="Live update settings"
      >
        <Settings2 size={14} />
        <span>{t('en', 'nav.settings')}</span>
      </button>

      {/* Settings panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="live-widget-card p-6 w-full max-w-md mt-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Settings2 size={16} style={{ color: 'var(--vl-accent)' }} />
                <h3 className="text-sm font-semibold" style={{ color: 'var(--vl-text-heading)' }}>
                  Live Update Settings
                </h3>
              </div>
              <div
                className="flex items-center gap-2 px-2 py-1 rounded-full text-xs"
                style={{
                  background: requestsPerMinute > 20 ? 'rgba(239, 68, 68, 0.1)' : requestsPerMinute > 10 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                  color: requestsPerMinute > 20 ? '#ef4444' : requestsPerMinute > 10 ? '#f59e0b' : '#10b981',
                }}
              >
                <Gauge size={12} />
                <span className="live-mono">{requestsPerMinute} req/min</span>
              </div>
            </div>

            {/* Global toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg mb-4" style={{ background: 'var(--vl-bg-inner)' }}>
              <div className="flex items-center gap-2">
                {isLive ? <Radio size={14} style={{ color: 'var(--vl-accent)' }} /> : <WifiOff size={14} style={{ color: 'var(--vl-text-muted)' }} />}
                <span className="text-sm" style={{ color: 'var(--vl-text-heading)' }}>
                  {t('en', 'common.status')}: {isLive ? 'Live' : 'Paused'}
                </span>
              </div>
              <button
                onClick={handleToggleGlobal}
                className="p-2 rounded-lg transition-colors"
                style={{
                  background: isLive ? 'rgba(239, 68, 68, 0.1)' : 'var(--vl-accent-bg)',
                  color: isLive ? '#ef4444' : 'var(--vl-accent)',
                }}
                aria-label={isLive ? 'Pause live updates' : 'Resume live updates'}
              >
                {isLive ? <Pause size={16} /> : <Play size={16} />}
              </button>
            </div>

            {/* Refresh intervals */}
            <div className="space-y-4 mb-5">
              <h4 className="text-xs font-medium flex items-center gap-2" style={{ color: 'var(--vl-text-heading)' }}>
                <Clock size={12} />
                Refresh Intervals
              </h4>
              <IntervalSlider
                label="Analytics"
                icon={<BarChart3 size={12} />}
                value={config.analyticsInterval}
                min={5000}
                max={120000}
                onChange={(v) => setConfig({ analyticsInterval: v })}
              />
              <IntervalSlider
                label="Agents"
                icon={<Users size={12} />}
                value={config.agentsInterval}
                min={5000}
                max={120000}
                onChange={(v) => setConfig({ agentsInterval: v })}
              />
              <IntervalSlider
                label="Meetings"
                icon={<Zap size={12} />}
                value={config.meetingsInterval}
                min={5000}
                max={120000}
                onChange={(v) => setConfig({ meetingsInterval: v })}
              />
              <IntervalSlider
                label="Notifications"
                icon={<Bell size={12} />}
                value={config.notificationsInterval}
                min={5000}
                max={120000}
                onChange={(v) => setConfig({ notificationsInterval: v })}
              />
            </div>

            {/* Widget toggles */}
            <div className="space-y-2 mb-5">
              <h4 className="text-xs font-medium flex items-center gap-2" style={{ color: 'var(--vl-text-heading)' }}>
                <Database size={12} />
                Widget Visibility
              </h4>
              <WidgetToggle
                icon={<Zap size={14} />}
                label="Live Pulse Monitor"
                enabled={widgets.pulse}
                onToggle={() => handleWidgetToggle('pulse')}
              />
              <WidgetToggle
                icon={<BarChart3 size={14} />}
                label="Meeting Velocity"
                enabled={widgets.velocity}
                onToggle={() => handleWidgetToggle('velocity')}
              />
              <WidgetToggle
                icon={<Zap size={14} />}
                label="Activity Rings"
                enabled={widgets.rings}
                onToggle={() => handleWidgetToggle('rings')}
              />
              <WidgetToggle
                icon={<Bell size={14} />}
                label="Notification Ticker"
                enabled={widgets.ticker}
                onToggle={() => handleWidgetToggle('ticker')}
              />
              <WidgetToggle
                icon={<Wifi size={14} />}
                label="System Health"
                enabled={widgets.health}
                onToggle={() => handleWidgetToggle('health')}
              />
            </div>

            {/* Bandwidth conservation */}
            <button
              onClick={handlePauseAll}
              className="w-full p-3 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2"
              style={{
                background: 'rgba(245, 158, 11, 0.1)',
                color: '#f59e0b',
                border: '1px solid rgba(245, 158, 11, 0.3)',
              }}
            >
              <Pause size={14} />
              Pause All (Bandwidth Conservation)
            </button>

            {/* Schedule preview */}
            <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--vl-border-subtle)' }}>
              <RefreshSchedulePreview config={config} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}


