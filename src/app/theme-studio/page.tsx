'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  Palette, Save, RotateCcw, Download, Upload, ChevronDown, ChevronUp,
  Copy, FileJson, Eye, Layout, Type, Space, Sparkles, LayoutDashboard,
  MessageSquare, BarChart3, Bot, User, Bell, Home, Settings, FlaskConical,
  Sun, Moon, Zap, Monitor, Code2, Briefcase, Check, X, Search,
} from 'lucide-react'
import { toast } from 'sonner'

/* ─── Types ─── */
interface ThemeConfig {
  name: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  bgPrimary: string
  bgSecondary: string
  bgCard: string
  bgInput: string
  fontFamily: string
  fontSize: number
  headingWeight: number
  lineHeight: number
  letterSpacing: number
  cardRadius: number
  cardPadding: number
  sectionGap: number
  inputHeight: number
  sidebarWidth: number
  glassmorphism: boolean
  gradientBorders: boolean
  animatedTransitions: number
  hoverShadows: boolean
  coloredIcons: boolean
  compactMode: boolean
  darkMode: boolean
}

/* ─── Preset definitions ─── */
const PRESETS: Record<string, ThemeConfig> = {
  emerald: {
    name: 'Emerald Lab',
    primaryColor: '#10b981',
    secondaryColor: '#06b6d4',
    accentColor: '#8b5cf6',
    bgPrimary: '#fafbfc',
    bgSecondary: '#f1f3f5',
    bgCard: '#ffffff',
    bgInput: '#ffffff',
    fontFamily: 'System Default',
    fontSize: 14,
    headingWeight: 600,
    lineHeight: 1.6,
    letterSpacing: 0,
    cardRadius: 12,
    cardPadding: 16,
    sectionGap: 24,
    inputHeight: 40,
    sidebarWidth: 260,
    glassmorphism: false,
    gradientBorders: false,
    animatedTransitions: 200,
    hoverShadows: true,
    coloredIcons: true,
    compactMode: false,
    darkMode: false,
  },
  ocean: {
    name: 'Ocean Deep',
    primaryColor: '#3b82f6',
    secondaryColor: '#0ea5e9',
    accentColor: '#6366f1',
    bgPrimary: '#0f172a',
    bgSecondary: '#1e293b',
    bgCard: '#1e293b',
    bgInput: '#0f172a',
    fontFamily: 'Inter',
    fontSize: 14,
    headingWeight: 600,
    lineHeight: 1.6,
    letterSpacing: 0,
    cardRadius: 12,
    cardPadding: 16,
    sectionGap: 24,
    inputHeight: 40,
    sidebarWidth: 260,
    glassmorphism: true,
    gradientBorders: false,
    animatedTransitions: 200,
    hoverShadows: true,
    coloredIcons: true,
    compactMode: false,
    darkMode: true,
  },
  sunset: {
    name: 'Sunset Research',
    primaryColor: '#f59e0b',
    secondaryColor: '#f97316',
    accentColor: '#ef4444',
    bgPrimary: '#fffbeb',
    bgSecondary: '#fef3c7',
    bgCard: '#ffffff',
    bgInput: '#ffffff',
    fontFamily: 'Georgia',
    fontSize: 15,
    headingWeight: 700,
    lineHeight: 1.7,
    letterSpacing: 0,
    cardRadius: 16,
    cardPadding: 20,
    sectionGap: 28,
    inputHeight: 42,
    sidebarWidth: 280,
    glassmorphism: false,
    gradientBorders: true,
    animatedTransitions: 300,
    hoverShadows: true,
    coloredIcons: true,
    compactMode: false,
    darkMode: false,
  },
  midnight: {
    name: 'Midnight',
    primaryColor: '#a855f7',
    secondaryColor: '#6366f1',
    accentColor: '#ec4899',
    bgPrimary: '#0a0a0f',
    bgSecondary: '#13131a',
    bgCard: '#1a1a25',
    bgInput: '#13131a',
    fontFamily: 'JetBrains Mono',
    fontSize: 13,
    headingWeight: 500,
    lineHeight: 1.5,
    letterSpacing: 0.2,
    cardRadius: 8,
    cardPadding: 14,
    sectionGap: 20,
    inputHeight: 38,
    sidebarWidth: 240,
    glassmorphism: true,
    gradientBorders: false,
    animatedTransitions: 200,
    hoverShadows: true,
    coloredIcons: true,
    compactMode: true,
    darkMode: true,
  },
  minimal: {
    name: 'Minimal',
    primaryColor: '#6b7280',
    secondaryColor: '#9ca3af',
    accentColor: '#6b7280',
    bgPrimary: '#ffffff',
    bgSecondary: '#f9fafb',
    bgCard: '#ffffff',
    bgInput: '#f3f4f6',
    fontFamily: 'System Default',
    fontSize: 14,
    headingWeight: 400,
    lineHeight: 1.6,
    letterSpacing: 0,
    cardRadius: 4,
    cardPadding: 16,
    sectionGap: 32,
    inputHeight: 40,
    sidebarWidth: 220,
    glassmorphism: false,
    gradientBorders: false,
    animatedTransitions: 100,
    hoverShadows: false,
    coloredIcons: false,
    compactMode: false,
    darkMode: false,
  },
}

const COLOR_SWATCHES = [
  { color: '#10b981', label: 'Emerald' },
  { color: '#06b6d4', label: 'Cyan' },
  { color: '#8b5cf6', label: 'Violet' },
  { color: '#f59e0b', label: 'Amber' },
  { color: '#f43f5e', label: 'Rose' },
  { color: '#6366f1', label: 'Indigo' },
]

const FONT_OPTIONS = ['System Default', 'Inter', 'JetBrains Mono', 'Georgia', 'Noto Sans']
const WEIGHT_OPTIONS = [
  { label: 'Normal', value: 400 },
  { label: 'Medium', value: 500 },
  { label: 'Semi-Bold', value: 600 },
  { label: 'Bold', value: 700 },
]
const SPEED_OPTIONS = [
  { label: '200ms', value: 200 },
  { label: '400ms', value: 400 },
  { label: '600ms', value: 600 },
]

/* ─── Component ─── */
export default function ThemeStudioPage() {
  const [theme, setTheme] = useState<ThemeConfig>(PRESETS.emerald)
  const [activePreset, setActivePreset] = useState('emerald')
  const [varsOpen, setVarsOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const importRef = useRef<HTMLInputElement>(null)

  // Load saved theme from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('vl-custom-theme')
      if (saved) {
        const parsed = JSON.parse(saved) as ThemeConfig
        setTheme(parsed)
        // Determine which preset it matches (if any)
        for (const [key, preset] of Object.entries(PRESETS)) {
          if (parsed.name === preset.name && parsed.primaryColor === preset.primaryColor) {
            setActivePreset(key)
            break
          }
        }
      }
    } catch {
      // ignore parse errors
    }
  }, [])

  // Apply CSS variables whenever theme changes
  useEffect(() => {
    const el = document.documentElement
    const vars: Record<string, string> = {
      '--vl-accent': theme.primaryColor,
      '--vl-accent-bg': theme.primaryColor + '1a',
      '--vl-bg-primary': theme.bgPrimary,
      '--vl-bg-secondary': theme.bgSecondary,
      '--vl-bg-card': theme.bgCard,
      '--vl-bg-input': theme.bgInput,
      '--vl-text-primary': theme.darkMode ? '#ffffff' : '#0f172a',
      '--vl-text-secondary': theme.darkMode ? '#cbd5e1' : '#374151',
      '--vl-text-muted': theme.darkMode ? '#64748b' : '#6b7280',
      '--vl-text-heading': theme.darkMode ? '#ffffff' : '#1a202c',
      '--vl-border': theme.darkMode
        ? 'rgba(51, 65, 85, 0.5)'
        : '#e5e7eb',
      '--vl-border-subtle': theme.darkMode
        ? 'rgba(51, 65, 85, 0.3)'
        : 'rgba(229, 231, 235, 0.6)',
      '--vl-bg-card-hover': theme.darkMode ? 'rgba(30, 41, 59, 0.8)' : '#f1f3f5',
      '--vl-bg-inner': theme.darkMode ? 'rgba(15, 23, 42, 0.3)' : 'rgba(241, 243, 245, 0.8)',
      '--vl-shadow': theme.darkMode
        ? '0 1px 3px rgba(0, 0, 0, 0.3)'
        : '0 1px 3px rgba(0, 0, 0, 0.08)',
      '--vl-shadow-glow': theme.primaryColor + '26',
    }
    Object.entries(vars).forEach(([k, v]) => {
      el.style.setProperty(k, v)
    })

    // Toggle dark class
    if (theme.darkMode) {
      el.classList.add('dark')
    } else {
      el.classList.remove('dark')
    }
  }, [theme])

  // Show temporary toast
  const showToast = useCallback((msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 2000)
  }, [])

  // Update a single theme field
  const updateTheme = useCallback((field: keyof ThemeConfig, value: unknown) => {
    setTheme(prev => ({ ...prev, [field]: value }))
  }, [])

  // Apply preset
  const applyPreset = useCallback((key: string) => {
    const preset = PRESETS[key]
    if (preset) {
      setTheme(preset)
      setActivePreset(key)
      showToast(`Applied "${preset.name}" preset`)
    }
  }, [showToast])

  // Reset to default
  const resetToDefault = useCallback(() => {
    setTheme(PRESETS.emerald)
    setActivePreset('emerald')
    showToast('Reset to default theme')
  }, [showToast])

  // Save theme to localStorage
  const saveTheme = useCallback(() => {
    localStorage.setItem('vl-custom-theme', JSON.stringify(theme))
    showToast('Theme saved!')
    toast.success('Theme saved to local storage')
  }, [theme, showToast])

  // Export theme as JSON
  const exportTheme = useCallback(() => {
    const blob = new Blob([JSON.stringify(theme, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vl-theme-${theme.name.toLowerCase().replace(/\s+/g, '-')}.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast('Theme exported as JSON')
  }, [theme, showToast])

  // Import theme from file
  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        const merged: ThemeConfig = { ...PRESETS.emerald, ...data }
        setTheme(merged)
        showToast(`Theme "${merged.name}" imported`)
        toast.success('Theme imported successfully')
      } catch {
        toast.error('Failed to parse theme file')
      }
    }
    reader.readAsText(file)
    if (importRef.current) importRef.current.value = ''
  }, [showToast])

  // Copy CSS variables
  const copyCSSVars = useCallback(() => {
    const el = document.documentElement
    const style = el.style
    const vars: string[] = []
    for (let i = 0; i < style.length; i++) {
      const prop = style[i]
      if (prop.startsWith('--vl-') || prop.startsWith('--dt-')) {
        vars.push(`  ${prop}: ${style.getPropertyValue(prop).trim()};`)
      }
    }
    const css = `:root {\n${vars.join('\n')}\n}`
    navigator.clipboard.writeText(css).then(() => {
      showToast('CSS variables copied!')
    })
  }, [showToast])

  // Export CSS variables as JSON
  const exportVarsJSON = useCallback(() => {
    const el = document.documentElement
    const style = el.style
    const obj: Record<string, string> = {}
    for (let i = 0; i < style.length; i++) {
      const prop = style[i]
      if (prop.startsWith('--vl-') || prop.startsWith('--dt-')) {
        obj[prop] = style.getPropertyValue(prop).trim()
      }
    }
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'vl-css-variables.json'
    a.click()
    URL.revokeObjectURL(url)
    showToast('CSS variables exported as JSON')
  }, [showToast])

  // Generate CSS var list for summary (client-only)
  const [cssVarList, setCssVarList] = useState<{ name: string; value: string }[]>([])

  useEffect(() => {
    const el = document.documentElement
    const style = el.style
    const list: { name: string; value: string }[] = []
    for (let i = 0; i < style.length; i++) {
      const prop = style[i]
      if (prop.startsWith('--vl-') || prop.startsWith('--dt-')) {
        list.push({ name: prop, value: style.getPropertyValue(prop).trim() })
      }
    }
    setCssVarList(list)
  }, [theme])

  // Helper: color picker row
  const renderColorPicker = (
    label: string,
    field: keyof ThemeConfig,
    currentVal: string,
  ) => (
    <div className="ts-control-row">
      <span className="ts-control-label">{label}</span>
      <div className="ts-color-picker-wrap">
        <input
          type="color"
          className="ts-color-picker"
          value={currentVal}
          onChange={(e) => updateTheme(field, e.target.value)}
        />
        <input
          type="text"
          className="ts-color-hex-input"
          value={currentVal}
          onChange={(e) => {
            const v = e.target.value
            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) updateTheme(field, v)
          }}
          maxLength={7}
        />
        <div className="ts-swatches">
          {COLOR_SWATCHES.map((sw) => (
            <button
              key={sw.label}
              className={`ts-swatch ${currentVal === sw.color ? 'ts-swatch-active' : ''}`}
              style={{ background: sw.color }}
              title={sw.label}
              onClick={() => updateTheme(field, sw.color)}
            />
          ))}
        </div>
      </div>
    </div>
  )

  // Helper: slider row
  const renderSlider = (
    label: string,
    field: keyof ThemeConfig,
    val: number,
    min: number,
    max: number,
    step: number,
    unit: string,
  ) => (
    <div className="ts-control-row">
      <span className="ts-control-label">{label}</span>
      <div className="ts-slider-wrap">
        <input
          type="range"
          className="ts-slider"
          value={val}
          min={min}
          max={max}
          step={step}
          onChange={(e) => updateTheme(field, Number(e.target.value))}
        />
        <span className="ts-control-value">{val}{unit}</span>
      </div>
    </div>
  )

  // Helper: toggle
  const renderToggle = (
    label: string,
    field: keyof ThemeConfig,
    val: boolean,
  ) => (
    <div className="ts-toggle-wrap">
      <span className="ts-control-label" style={{ minWidth: 'auto' }}>{label}</span>
      <button
        className={`ts-toggle ${val ? 'ts-toggle-active' : ''}`}
        onClick={() => updateTheme(field, !val)}
        aria-label={`Toggle ${label}`}
      >
        <span className="ts-toggle-knob" />
      </button>
    </div>
  )

  return (
    <div className="ts-layout" style={{
      background: theme.bgPrimary,
      color: theme.darkMode ? '#ffffff' : '#0f172a',
      fontFamily: theme.fontFamily === 'System Default'
        ? 'system-ui, -apple-system, sans-serif'
        : theme.fontFamily,
      fontSize: `${theme.fontSize}px`,
      lineHeight: String(theme.lineHeight),
      letterSpacing: `${theme.letterSpacing}px`,
    }}>
      {/* ─── Toast ─── */}
      {toastMsg && <div className="ts-toast">{toastMsg}</div>}

      {/* ─── Hidden import input ─── */}
      <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />

      {/* ─── Top Toolbar ─── */}
      <div className="ts-toolbar">
        <div className="ts-toolbar-title">
          <Palette style={{ width: 20, height: 20, color: theme.primaryColor }} />
          <span>Theme Studio</span>
        </div>

        <input
          type="text"
          className="ts-name-input"
          value={theme.name}
          onChange={(e) => updateTheme('name', e.target.value)}
          placeholder="Theme name"
        />

        <div className="ts-toolbar-actions">
          {Object.entries(PRESETS).map(([key, preset]) => (
            <button
              key={key}
              className={`ts-preset-btn ${activePreset === key ? 'ts-preset-btn-active' : ''}`}
              onClick={() => applyPreset(key)}
            >
              <span className="ts-preset-dot" style={{ background: preset.primaryColor }} />
              {preset.name}
            </button>
          ))}

          <button className="ts-btn ts-btn-outline ts-btn-sm" onClick={exportTheme}>
            <Download style={{ width: 14, height: 14 }} /> Export
          </button>
          <button className="ts-btn ts-btn-outline ts-btn-sm" onClick={() => importRef.current?.click()}>
            <Upload style={{ width: 14, height: 14 }} /> Import
          </button>
          <button className="ts-btn ts-btn-outline ts-btn-sm" onClick={resetToDefault}>
            <RotateCcw style={{ width: 14, height: 14 }} /> Reset
          </button>
          <button className="ts-btn ts-btn-primary" onClick={saveTheme}>
            <Save style={{ width: 14, height: 14 }} /> Save Theme
          </button>
        </div>
      </div>

      {/* ─── Main Content ─── */}
      <div className="ts-main">
        {/* ─── Left Panel: Controls ─── */}
        <div className="ts-controls">
          {/* 1. Color Palette Section */}
          <div className="ts-section">
            <div className="ts-section-title">
              <Eye style={{ width: 16, height: 16 }} /> Color Palette
            </div>

            {renderColorPicker('Primary Color', 'primaryColor', theme.primaryColor)}
            {renderColorPicker('Secondary Color', 'secondaryColor', theme.secondaryColor)}
            {renderColorPicker('Accent Color', 'accentColor', theme.accentColor)}

            <div className="ts-control-row">
              <span className="ts-control-label">Primary Background</span>
              <div className="ts-color-picker-wrap">
                <input type="color" className="ts-color-picker" value={theme.bgPrimary}
                  onChange={(e) => updateTheme('bgPrimary', e.target.value)} />
                <input type="text" className="ts-color-hex-input" value={theme.bgPrimary}
                  onChange={(e) => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) updateTheme('bgPrimary', e.target.value) }}
                  maxLength={7} />
              </div>
            </div>
            <div className="ts-control-row">
              <span className="ts-control-label">Secondary Background</span>
              <div className="ts-color-picker-wrap">
                <input type="color" className="ts-color-picker" value={theme.bgSecondary}
                  onChange={(e) => updateTheme('bgSecondary', e.target.value)} />
                <input type="text" className="ts-color-hex-input" value={theme.bgSecondary}
                  onChange={(e) => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) updateTheme('bgSecondary', e.target.value) }}
                  maxLength={7} />
              </div>
            </div>
            <div className="ts-control-row">
              <span className="ts-control-label">Card Background</span>
              <div className="ts-color-picker-wrap">
                <input type="color" className="ts-color-picker" value={theme.bgCard}
                  onChange={(e) => updateTheme('bgCard', e.target.value)} />
                <input type="text" className="ts-color-hex-input" value={theme.bgCard}
                  onChange={(e) => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) updateTheme('bgCard', e.target.value) }}
                  maxLength={7} />
              </div>
            </div>
            <div className="ts-control-row">
              <span className="ts-control-label">Input Background</span>
              <div className="ts-color-picker-wrap">
                <input type="color" className="ts-color-picker" value={theme.bgInput}
                  onChange={(e) => updateTheme('bgInput', e.target.value)} />
                <input type="text" className="ts-color-hex-input" value={theme.bgInput}
                  onChange={(e) => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) updateTheme('bgInput', e.target.value) }}
                  maxLength={7} />
              </div>
            </div>
          </div>

          {/* 2. Typography Section */}
          <div className="ts-section">
            <div className="ts-section-title">
              <Type style={{ width: 16, height: 16 }} /> Typography
            </div>

            <div className="ts-control-row">
              <span className="ts-control-label">Font Family</span>
              <select
                className="ts-select"
                value={theme.fontFamily}
                onChange={(e) => updateTheme('fontFamily', e.target.value)}
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            {renderSlider('Base Font Size', 'fontSize', theme.fontSize, 12, 18, 1, 'px')}
            {renderSlider('Line Height', 'lineHeight', theme.lineHeight, 1.4, 2.0, 0.1, '')}
            {renderSlider('Letter Spacing', 'letterSpacing', theme.letterSpacing, -0.5, 0.5, 0.1, 'px')}

            <div className="ts-control-row">
              <span className="ts-control-label">Heading Weight</span>
              <div className="ts-control-right">
                {WEIGHT_OPTIONS.map((w) => (
                  <button
                    key={w.value}
                    className={`ts-preset-btn ts-btn-sm ${theme.headingWeight === w.value ? 'ts-preset-btn-active' : ''}`}
                    onClick={() => updateTheme('headingWeight', w.value)}
                    style={{ fontSize: '0.65rem', padding: '0.25rem 0.5rem' }}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Spacing Section */}
          <div className="ts-section">
            <div className="ts-section-title">
              <Space style={{ width: 16, height: 16 }} /> Spacing
            </div>

            {renderSlider('Card Border Radius', 'cardRadius', theme.cardRadius, 0, 20, 1, 'px')}
            {renderSlider('Card Padding', 'cardPadding', theme.cardPadding, 8, 32, 2, 'px')}
            {renderSlider('Section Gap', 'sectionGap', theme.sectionGap, 16, 64, 4, 'px')}
            {renderSlider('Input Height', 'inputHeight', theme.inputHeight, 32, 48, 2, 'px')}
            {renderSlider('Sidebar Width', 'sidebarWidth', theme.sidebarWidth, 200, 320, 10, 'px')}
          </div>

          {/* 4. Effects Section */}
          <div className="ts-section">
            <div className="ts-section-title">
              <Sparkles style={{ width: 16, height: 16 }} /> Effects
            </div>

            {renderToggle('Glassmorphism', 'glassmorphism', theme.glassmorphism)}
            {renderToggle('Gradient Borders', 'gradientBorders', theme.gradientBorders)}
            {renderToggle('Hover Shadows', 'hoverShadows', theme.hoverShadows)}
            {renderToggle('Colored Icons', 'coloredIcons', theme.coloredIcons)}
            {renderToggle('Compact Mode', 'compactMode', theme.compactMode)}
            {renderToggle('Dark Mode', 'darkMode', theme.darkMode)}

            <div className="ts-control-row">
              <span className="ts-control-label">Transition Speed</span>
              <div className="ts-control-right">
                {SPEED_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    className={`ts-preset-btn ts-btn-sm ${theme.animatedTransitions === s.value ? 'ts-preset-btn-active' : ''}`}
                    onClick={() => updateTheme('animatedTransitions', s.value)}
                    style={{ fontSize: '0.65rem', padding: '0.25rem 0.5rem' }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 5. Component Preview */}
          <div className="ts-section">
            <div className="ts-section-title">
              <Layout style={{ width: 16, height: 16 }} /> Component Preview
            </div>

            <div className="ts-component-preview">
              {/* Sample card */}
              <div className="ts-preview-card" style={{ borderRadius: `${theme.cardRadius}px`, padding: `${theme.cardPadding}px` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: theme.headingWeight, color: theme.darkMode ? '#ffffff' : '#1a202c' }}>
                    Research Pipeline
                  </span>
                  <span className="ts-preview-badge" style={{ background: theme.primaryColor + '1a', color: theme.primaryColor }}>
                    Active
                  </span>
                </div>
                <p style={{ fontSize: '0.7rem', color: theme.darkMode ? '#cbd5e1' : '#374151', marginBottom: 12 }}>
                  Analyzing protein structure predictions using multi-agent collaboration framework.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span className="ts-preview-btn-primary" style={{ background: theme.primaryColor, borderRadius: `${Math.max(4, theme.cardRadius / 3)}px` }}>
                    Run Analysis
                  </span>
                  <span className="ts-preview-btn-secondary" style={{
                    borderColor: theme.darkMode ? 'rgba(51,65,85,0.5)' : '#e5e7eb',
                    color: theme.darkMode ? '#cbd5e1' : '#374151',
                    borderRadius: `${Math.max(4, theme.cardRadius / 3)}px`,
                  }}>
                    View Details
                  </span>
                </div>
              </div>

              {/* Sample input */}
              <div className="ts-preview-input" style={{
                height: `${theme.inputHeight}px`,
                borderRadius: `${Math.max(4, theme.cardRadius / 3)}px`,
                background: theme.bgInput,
                borderColor: theme.darkMode ? 'rgba(51,65,85,0.5)' : '#e5e7eb',
                color: theme.darkMode ? '#ffffff' : '#0f172a',
              }}>
                Search agents, meetings...
              </div>

              {/* Notification badge */}
              <div style={{ position: 'relative', display: 'inline-block', marginTop: 12 }}>
                <Bell style={{ width: 20, height: 20, color: theme.coloredIcons ? theme.primaryColor : (theme.darkMode ? '#94a3b8' : '#6b7280') }} />
                <span className="ts-notif-badge" style={{ borderColor: theme.bgCard }}>3</span>
              </div>

              {/* Mini SVG chart */}
              <svg className="ts-chart-svg" viewBox="0 0 200 60" style={{ marginTop: 12, borderRadius: `${Math.max(4, theme.cardRadius / 3)}px`, background: theme.bgCard, border: `1px solid ${theme.darkMode ? 'rgba(51,65,85,0.5)' : '#e5e7eb'}` }}>
                {[40, 65, 30, 55, 80, 45, 70, 35, 60, 50].map((h, i) => (
                  <rect
                    key={i}
                    x={4 + i * 19.5}
                    y={60 - h}
                    width={14}
                    height={h}
                    rx={2}
                    fill={i % 2 === 0 ? theme.primaryColor : theme.secondaryColor}
                    opacity={0.8}
                  />
                ))}
              </svg>
            </div>
          </div>

          {/* 6. CSS Variables Summary */}
          <div className="ts-vars-summary">
            <div
              className={`ts-vars-header ${varsOpen ? 'ts-vars-header-open' : ''}`}
              onClick={() => setVarsOpen(!varsOpen)}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Code2 style={{ width: 16, height: 16, color: theme.primaryColor }} />
                CSS Variables ({cssVarList.length})
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button className="ts-btn ts-btn-outline ts-btn-sm" onClick={(e) => { e.stopPropagation(); copyCSSVars(); }}>
                  <Copy style={{ width: 12, height: 12 }} /> Copy
                </button>
                <button className="ts-btn ts-btn-outline ts-btn-sm" onClick={(e) => { e.stopPropagation(); exportVarsJSON(); }}>
                  <FileJson style={{ width: 12, height: 12 }} /> JSON
                </button>
                {varsOpen
                  ? <ChevronUp style={{ width: 16, height: 16 }} />
                  : <ChevronDown style={{ width: 16, height: 16 }} />}
              </div>
            </div>
            <div className={`ts-vars-body ${varsOpen ? 'ts-vars-body-open' : ''}`}>
              {cssVarList.map((v) => (
                <div key={v.name} className="ts-var-row">
                  <span className="ts-var-name">{v.name}</span>
                  <span className="ts-var-value">{v.value}</span>
                </div>
              ))}
              {cssVarList.length === 0 && (
                <p style={{ fontSize: '0.7rem', color: theme.darkMode ? '#64748b' : '#6b7280', textAlign: 'center', padding: '0.5rem' }}>
                  Modify theme settings to see CSS variables here.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ─── Right Panel: Full Preview ─── */}
        <div className="ts-preview" style={{ position: 'relative' }}>
          <p style={{ fontSize: '0.7rem', color: theme.darkMode ? '#64748b' : '#6b7280', marginBottom: 12, fontWeight: 500 }}>
            Full Preview
          </p>

          <div className="ts-mini-app" style={{
            background: theme.bgPrimary,
            borderRadius: `${theme.cardRadius}px`,
            overflow: 'hidden',
            border: theme.gradientBorders
              ? `2px solid transparent`
              : `1px solid ${theme.darkMode ? 'rgba(51,65,85,0.5)' : '#e5e7eb'}`,
            ...(theme.gradientBorders
              ? { backgroundImage: `linear-gradient(${theme.bgCard}, ${theme.bgCard}), linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})`, backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }
              : {}),
            ...(theme.glassmorphism && theme.darkMode
              ? { backdropFilter: 'blur(12px)', background: `${theme.bgPrimary}cc` }
              : {}),
          }}>
            <div style={{ display: 'flex', minHeight: 400 }}>
              {/* Mini sidebar */}
              <div className="ts-mini-sidebar" style={{
                width: `${Math.round(theme.sidebarWidth * 0.55)}px`,
                background: theme.bgSecondary,
                borderRight: `1px solid ${theme.darkMode ? 'rgba(51,65,85,0.5)' : '#e5e7eb'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem 0.375rem', marginBottom: 8 }}>
                  <FlaskConical style={{ width: 14, height: 14, color: theme.primaryColor }} />
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, color: theme.darkMode ? '#ffffff' : '#1a202c' }}>Virtual Lab</span>
                </div>
                {[
                  { icon: Home, label: 'Dashboard', active: true },
                  { icon: MessageSquare, label: 'Meetings', active: false },
                  { icon: Bot, label: 'Agents', active: false },
                  { icon: BarChart3, label: 'Analytics', active: false },
                  { icon: Settings, label: 'Settings', active: false },
                ].map((item) => (
                  <div key={item.label} className={`ts-mini-nav-item ${item.active ? 'ts-mini-nav-item-active' : ''}`}
                    style={item.active ? { background: theme.primaryColor + '1a', color: theme.primaryColor } : { color: theme.darkMode ? '#64748b' : '#6b7280' }}
                  >
                    <item.icon style={{ width: 12, height: 12 }} />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>

              {/* Main content area */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Mini top bar */}
                <div className="ts-mini-topbar" style={{
                  background: theme.bgCard,
                  borderBottom: `1px solid ${theme.darkMode ? 'rgba(51,65,85,0.5)' : '#e5e7eb'}`,
                }}>
                  <div className="ts-mini-topbar-dot" style={{ background: '#ef4444' }} />
                  <div className="ts-mini-topbar-dot" style={{ background: '#f59e0b' }} />
                  <div className="ts-mini-topbar-dot" style={{ background: '#10b981' }} />
                  <span style={{ fontSize: '0.55rem', color: theme.darkMode ? '#94a3b8' : '#6b7280', marginLeft: 8 }}>Dashboard</span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    <Search style={{ width: 10, height: 10, color: theme.darkMode ? '#64748b' : '#9ca3af' }} />
                    <Bell style={{ width: 10, height: 10, color: theme.darkMode ? '#64748b' : '#9ca3af' }} />
                    <User style={{ width: 10, height: 10, color: theme.darkMode ? '#64748b' : '#9ca3af' }} />
                  </div>
                </div>

                {/* Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: 8 }}>
                  {/* Card 1 */}
                  <div className="ts-mini-card" style={{
                    background: theme.bgCard,
                    borderRadius: `${theme.cardRadius / 2}px`,
                    padding: `${theme.cardPadding / 2}px`,
                    border: `1px solid ${theme.darkMode ? 'rgba(51,65,85,0.5)' : '#e5e7eb'}`,
                    ...(theme.glassmorphism ? { backdropFilter: 'blur(8px)', background: `${theme.bgCard}cc` } : {}),
                  }}>
                    <div className="ts-mini-card-title" style={{ color: theme.darkMode ? '#ffffff' : '#1a202c' }}>Active Meetings</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: theme.primaryColor, marginBottom: 2 }}>5</div>
                    <div className="ts-mini-card-text" style={{ color: theme.darkMode ? '#64748b' : '#6b7280' }}>2 running, 3 completed today</div>
                  </div>

                  {/* Card 2 */}
                  <div className="ts-mini-card" style={{
                    background: theme.bgCard,
                    borderRadius: `${theme.cardRadius / 2}px`,
                    padding: `${theme.cardPadding / 2}px`,
                    border: `1px solid ${theme.darkMode ? 'rgba(51,65,85,0.5)' : '#e5e7eb'}`,
                    ...(theme.glassmorphism ? { backdropFilter: 'blur(8px)', background: `${theme.bgCard}cc` } : {}),
                  }}>
                    <div className="ts-mini-card-title" style={{ color: theme.darkMode ? '#ffffff' : '#1a202c' }}>Agents Online</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: theme.secondaryColor, marginBottom: 2 }}>12</div>
                    <div className="ts-mini-card-text" style={{ color: theme.darkMode ? '#64748b' : '#6b7280' }}>4 bio, 3 cs, 5 general</div>
                  </div>

                  {/* Chart card */}
                  <div style={{
                    background: theme.bgCard,
                    borderRadius: `${theme.cardRadius / 2}px`,
                    padding: `${theme.cardPadding / 2}px`,
                    border: `1px solid ${theme.darkMode ? 'rgba(51,65,85,0.5)' : '#e5e7eb'}`,
                  }}>
                    <div className="ts-mini-card-title" style={{ color: theme.darkMode ? '#ffffff' : '#1a202c', marginBottom: 6 }}>Weekly Activity</div>
                    <div className="ts-mini-chart" style={{
                      background: theme.bgSecondary,
                      borderColor: theme.darkMode ? 'rgba(51,65,85,0.5)' : '#e5e7eb',
                      borderRadius: `${theme.cardRadius / 3}px`,
                    }}>
                      {[35, 55, 25, 70, 45, 60, 40].map((h, i) => (
                        <div key={i} className="ts-mini-chart-bar" style={{
                          height: `${h}%`,
                          background: i === 3 ? theme.primaryColor : (i % 2 === 0 ? theme.secondaryColor : `${theme.darkMode ? 'rgba(51,65,85,0.5)' : '#cbd5e1'}`),
                          borderRadius: '2px 2px 0 0',
                        }} />
                      ))}
                    </div>
                  </div>

                  {/* Chat thread card */}
                  <div style={{
                    background: theme.bgCard,
                    borderRadius: `${theme.cardRadius / 2}px`,
                    padding: `${theme.cardPadding / 2}px`,
                    border: `1px solid ${theme.darkMode ? 'rgba(51,65,85,0.5)' : '#e5e7eb'}`,
                  }}>
                    <div className="ts-mini-card-title" style={{ color: theme.darkMode ? '#ffffff' : '#1a202c', marginBottom: 6 }}>Recent Thread</div>
                    <div className="ts-mini-chat-msg">
                      <div className="ts-mini-avatar" style={{ background: theme.primaryColor }}>A</div>
                      <div className="ts-mini-bubble ts-mini-bubble-agent">Analyzing results...</div>
                    </div>
                    <div className="ts-mini-chat-msg">
                      <div className="ts-mini-avatar" style={{ background: theme.secondaryColor }}>U</div>
                      <div className="ts-mini-bubble ts-mini-bubble-user">Looks good, continue.</div>
                    </div>
                    <div className="ts-mini-chat-msg">
                      <div className="ts-mini-avatar" style={{ background: theme.accentColor }}>B</div>
                      <div className="ts-mini-bubble ts-mini-bubble-agent">Processing...</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Watermark */}
          <div className="ts-watermark">
            This is a preview of how your theme will look
          </div>
        </div>
      </div>
    </div>
  )
}
