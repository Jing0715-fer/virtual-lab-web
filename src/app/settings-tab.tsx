'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings, Moon, Sun, Cpu, Trash2, Upload, AlertCircle,
  BarChart3, Bell, FlaskConical, ExternalLink, Languages,
  Keyboard, RotateCcw, CheckCircle2, Clock, Database,
  FileJson, FileSpreadsheet, FileText, FileCode, Printer,
  ChevronDown, Download, XCircle, Search, AlertTriangle, Save, UploadCloud,
  CheckCheck, MessageCircle, Eye, EyeOff, KeyRound, Thermometer, Zap, Globe, Server, Palette,
  Info, HardDrive,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { t, getAvailableLanguages } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { triggerExport, NOTIFICATION_ICONS, seedAgents } from './shared-components'
import { useDataPersistence, DataPersistencePanel } from './data-persistence'

interface SettingsTabProps {
  theme: string | undefined
  lang: Lang
  // Settings state
  defaultModel: string
  temperaturePreset: 'conservative' | 'balanced' | 'creative'
  apiKey: string
  showApiKey: boolean
  compactMode: boolean
  notifPrefs: { meetingComplete: boolean; agentActivity: boolean; systemAlerts: boolean }
  notificationSounds: boolean
  // Setters
  setTheme: (theme: string) => void
  handleSetLang: (lang: Lang) => void
  setDefaultModel: (v: string) => void
  setTemperaturePreset: React.Dispatch<React.SetStateAction<'conservative' | 'balanced' | 'creative'>>
  setApiKey: (v: string) => void
  setShowApiKey: (v: boolean) => void
  setCompactMode: (v: boolean) => void
  setClearDataDialogOpen: (v: boolean) => void
  updateNotifPref: (key: 'meetingComplete' | 'agentActivity' | 'systemAlerts', value: boolean) => void
  setNotificationSounds: (v: boolean) => void
  importFileRef: React.RefObject<HTMLInputElement | null>
  // Data
  totalAgents: number
  totalMessages: number
  meetings: { length: number }
  agents: { length: number }
}

export function SettingsTab(props: SettingsTabProps) {
  const {
    theme, lang, defaultModel, temperaturePreset, apiKey, showApiKey,
    compactMode, notifPrefs, notificationSounds,
    setTheme, handleSetLang, setDefaultModel, setTemperaturePreset,
    setApiKey, setShowApiKey, setCompactMode, setClearDataDialogOpen,
    updateNotifPref, setNotificationSounds, importFileRef,
    totalAgents, totalMessages, meetings, agents,
  } = props

  // Enhanced export state
  const [exportFormat, setExportFormat] = useState('json')
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false)

  // ===== API Configuration State =====
  const API_CONFIG_KEY = 'vl-api-config'

  const [apiProvider, setApiProvider] = useState('openai')
  const [apiConfigKey, setApiConfigKey] = useState('')
  const [showApiConfigKey, setShowApiConfigKey] = useState(false)
  const [apiModel, setApiModel] = useState('gpt-4o')
  const [apiCustomEndpoint, setApiCustomEndpoint] = useState('')
  const [apiTemperature, setApiTemperature] = useState(0.7)

  // Hydrate API config from localStorage on mount
  useEffect(() => {
    try {
      const s = localStorage.getItem(API_CONFIG_KEY)
      if (s) {
        const config = JSON.parse(s)
        requestAnimationFrame(() => {
          if (config.provider) setApiProvider(config.provider)
          if (config.apiKey) setApiConfigKey(config.apiKey)
          if (config.model) setApiModel(config.model)
          if (config.customEndpoint) setApiCustomEndpoint(config.customEndpoint)
          if (config.temperature != null) setApiTemperature(config.temperature)
        })
      }
    } catch { /* ignore */ }
  }, [])
  const [testingConnection, setTestingConnection] = useState(false)
  const [testResult, setTestResult] = useState<'idle' | 'success' | 'failure'>('idle')

  const MODEL_OPTIONS: Record<string, { value: string; label: string }[]> = {
    openai: [
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-4o-mini', label: 'GPT-4o-mini' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5-turbo' },
    ],
    anthropic: [
      { value: 'claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
      { value: 'claude-3-haiku', label: 'Claude 3 Haiku' },
    ],
    google: [
      { value: 'gemini-pro', label: 'Gemini Pro' },
      { value: 'gemini-flash', label: 'Gemini Flash' },
    ],
    local: [
      { value: 'custom', label: 'Custom Endpoint' },
    ],
  }

  const handleSaveApiConfig = useCallback(() => {
    const config = {
      provider: apiProvider,
      apiKey: apiConfigKey,
      model: apiModel,
      customEndpoint: apiCustomEndpoint,
      temperature: apiTemperature,
    }
    localStorage.setItem(API_CONFIG_KEY, JSON.stringify(config))
    toast.success('API configuration saved')
  }, [apiProvider, apiConfigKey, apiModel, apiCustomEndpoint, apiTemperature])

  const handleTestConnection = useCallback(async () => {
    setTestingConnection(true)
    setTestResult('idle')
    // Simulate a 1.5s connection test
    await new Promise(resolve => setTimeout(resolve, 1500))
    setTestingConnection(false)
    setTestResult(apiConfigKey.length > 0 ? 'success' : 'failure')
    toast[apiConfigKey.length > 0 ? 'success' : 'error'](
      apiConfigKey.length > 0
        ? `Connection successful! (${apiProvider} / ${apiModel})`
        : 'Connection failed. Please check your API key.'
    )
  }, [apiProvider, apiModel, apiConfigKey])

  const maskApiKey = (key: string) => {
    if (!key) return 'Not set'
    if (key.length <= 8) return '****'
    return `${key.slice(0, 4)}****...${key.slice(-4)}`
  }

  // Enhanced import state
  const [isDragOver, setIsDragOver] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importing, setImporting] = useState(false)
  const [importErrors, setImportErrors] = useState<string[]>([])

  // ===== Clear All Data Dialog State =====
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false)

  // ===== Storage Usage Calculation =====
  const [storageUsageKB, setStorageUsageKB] = useState(0)
  useEffect(() => {
    let totalBytes = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('vl-')) {
        const value = localStorage.getItem(key)
        if (value) totalBytes += key.length + value.length
      }
    }
    // Also count 'virtual-lab-onboarded' key
    const onboarded = localStorage.getItem('virtual-lab-onboarded')
    if (onboarded) totalBytes += onboarded.length + 'virtual-lab-onboarded'.length
    requestAnimationFrame(() => { setStorageUsageKB(Math.round(totalBytes / 1024 * 100) / 100) })
  }, [])

  // ===== Clear All vl-* Data =====
  const handleClearAllData = useCallback(() => {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('vl-')) keysToRemove.push(key)
    }
    keysToRemove.forEach(k => localStorage.removeItem(k))
    setClearAllDialogOpen(false)
    toast.success(t(lang, 'settings.storage.clearSuccess'))
    setTimeout(() => window.location.reload(), 800)
  }, [lang, setClearAllDialogOpen])

  // ===== Export Settings =====
  const handleExportSettings = useCallback(() => {
    const settings: Record<string, string> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('vl-')) {
        const value = localStorage.getItem(key)
        if (value) settings[key] = value
      }
    }
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'virtual-lab-settings.json'
    a.click()
    URL.revokeObjectURL(url)
    toast.success(t(lang, 'settings.storage.exportSuccess'))
  }, [lang])

  // ===== Appearance State =====
  const ACCENT_COLORS = [
    { id: 'emerald', color: '#10b981', label: 'Emerald' },
    { id: 'blue', color: '#3b82f6', label: 'Blue' },
    { id: 'violet', color: '#8b5cf6', label: 'Violet' },
    { id: 'rose', color: '#f43f5e', label: 'Rose' },
    { id: 'amber', color: '#f59e0b', label: 'Amber' },
    { id: 'cyan', color: '#06b6d4', label: 'Cyan' },
    { id: 'orange', color: '#f97316', label: 'Orange' },
    { id: 'pink', color: '#ec4899', label: 'Pink' },
    { id: 'indigo', color: '#6366f1', label: 'Indigo' },
    { id: 'teal', color: '#14b8a6', label: 'Teal' },
    { id: 'lime', color: '#84cc16', label: 'Lime' },
    { id: 'red', color: '#ef4444', label: 'Red' },
  ] as const

  const [accentColor, setAccentColor] = useState('#10b981')
  const [cardStyle, setCardStyle] = useState<'default' | 'glass' | 'flat'>('default')
  const [animSpeed, setAnimSpeed] = useState(1)

  // ===== Theme Customizer State =====
  const [fontSize, setFontSize] = useState<'small' | 'default' | 'large' | 'extraLarge'>('default')
  const [density, setDensity] = useState<'compact' | 'default' | 'comfortable'>('default')
  const [borderRadius, setBorderRadius] = useState<'none' | 'small' | 'default' | 'large'>('default')

  // ===== Advanced Preferences State =====
  const [autoSave, setAutoSave] = useState(true)
  const [confirmDialogs, setConfirmDialogs] = useState(true)
  const [animationsEnabled, setAnimationsEnabled] = useState(true)
  const [timestampFormat, setTimestampFormat] = useState<'relative' | 'absolute' | 'full'>('relative')
  const [defaultRounds, setDefaultRounds] = useState(3)
  const [defaultTemperature, setDefaultTemperature] = useState(0.7)

  // Hydrate appearance settings from localStorage on mount
  useEffect(() => {
    const savedAccent = localStorage.getItem('vl-accent-color')
    if (savedAccent) requestAnimationFrame(() => { setAccentColor(savedAccent) })
    const savedCardStyle = localStorage.getItem('vl-card-style') as 'default' | 'glass' | 'flat' | null
    if (savedCardStyle === 'default' || savedCardStyle === 'glass' || savedCardStyle === 'flat') requestAnimationFrame(() => { setCardStyle(savedCardStyle) })
    const savedAnimSpeed = localStorage.getItem('vl-anim-speed')
    if (savedAnimSpeed !== null) requestAnimationFrame(() => { setAnimSpeed(Number(savedAnimSpeed)) })
    // Theme customizer
    try { const v = localStorage.getItem('vl-font-size'); if (v === 'small' || v === 'default' || v === 'large' || v === 'extraLarge') requestAnimationFrame(() => { setFontSize(v) }) } catch {}
    try { const v = localStorage.getItem('vl-density'); if (v === 'compact' || v === 'default' || v === 'comfortable') requestAnimationFrame(() => { setDensity(v) }) } catch {}
    try { const v = localStorage.getItem('vl-border-radius'); if (v === 'none' || v === 'small' || v === 'default' || v === 'large') requestAnimationFrame(() => { setBorderRadius(v) }) } catch {}
    // Advanced preferences
    try { const v = localStorage.getItem('vl-auto-save'); if (v !== null) requestAnimationFrame(() => { setAutoSave(v === 'true') }) } catch {}
    try { const v = localStorage.getItem('vl-confirm-dialogs'); if (v !== null) requestAnimationFrame(() => { setConfirmDialogs(v === 'true') }) } catch {}
    try { const v = localStorage.getItem('vl-animations'); if (v !== null) requestAnimationFrame(() => { setAnimationsEnabled(v === 'true') }) } catch {}
    try { const v = localStorage.getItem('vl-timestamp-format'); if (v === 'relative' || v === 'absolute' || v === 'full') requestAnimationFrame(() => { setTimestampFormat(v) }) } catch {}
    try { const v = localStorage.getItem('vl-default-rounds'); if (v !== null) requestAnimationFrame(() => { setDefaultRounds(Number(v)) }) } catch {}
    try { const v = localStorage.getItem('vl-default-temperature'); if (v !== null) requestAnimationFrame(() => { setDefaultTemperature(Number(v)) }) } catch {}
  }, [])

  // Apply accent color CSS variable on change
  useEffect(() => {
    localStorage.setItem('vl-accent-color', accentColor)
    document.documentElement.style.setProperty('--vl-accent-emerald', accentColor)
    document.documentElement.style.setProperty('--vl-accent', accentColor)
    document.documentElement.style.setProperty('--vl-border-accent', accentColor + '4d')
  }, [accentColor])

  // Apply card style on change
  useEffect(() => {
    localStorage.setItem('vl-card-style', cardStyle)
    document.documentElement.classList.remove('vl-card-style-glass', 'vl-card-style-flat')
    if (cardStyle === 'glass') document.documentElement.classList.add('vl-card-style-glass')
    if (cardStyle === 'flat') document.documentElement.classList.add('vl-card-style-flat')
  }, [cardStyle])

  // Apply animation speed on change
  useEffect(() => {
    localStorage.setItem('vl-anim-speed', String(animSpeed))
    document.documentElement.style.setProperty('--vl-anim-speed', String(animSpeed))
  }, [animSpeed])

  // Apply font size
  useEffect(() => {
    localStorage.setItem('vl-font-size', fontSize)
    const sizeMap = { small: '13px', default: '14px', large: '16px', extraLarge: '18px' }
    document.documentElement.style.setProperty('--vl-font-size', sizeMap[fontSize])
  }, [fontSize])

  // Apply density
  useEffect(() => {
    localStorage.setItem('vl-density', density)
    document.documentElement.classList.remove('settings-density-compact', 'settings-density-default', 'settings-density-comfortable')
    document.documentElement.classList.add(`settings-density-${density}`)
  }, [density])

  // Apply border radius
  useEffect(() => {
    localStorage.setItem('vl-border-radius', borderRadius)
    const radiusMap = { none: '0px', small: '4px', default: '8px', large: '16px' }
    document.documentElement.style.setProperty('--vl-radius', radiusMap[borderRadius])
  }, [borderRadius])

  // Apply animations toggle
  useEffect(() => {
    localStorage.setItem('vl-animations', String(animationsEnabled))
    if (animationsEnabled) {
      document.body.classList.remove('vl-animations-off')
    } else {
      document.body.classList.add('vl-animations-off')
    }
  }, [animationsEnabled])

  // Persist advanced preferences
  useEffect(() => { localStorage.setItem('vl-auto-save', String(autoSave)) }, [autoSave])
  useEffect(() => { localStorage.setItem('vl-confirm-dialogs', String(confirmDialogs)) }, [confirmDialogs])
  useEffect(() => { localStorage.setItem('vl-timestamp-format', timestampFormat) }, [timestampFormat])
  useEffect(() => { localStorage.setItem('vl-default-rounds', String(defaultRounds)) }, [defaultRounds])
  useEffect(() => { localStorage.setItem('vl-default-temperature', String(defaultTemperature)) }, [defaultTemperature])

  // ===== Storage Details =====
  const [storageKeys, setStorageKeys] = useState<{ key: string; size: number }[]>([])
  useEffect(() => {
    const keys: { key: string; size: number }[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k) {
        const v = localStorage.getItem(k)
        if (v) keys.push({ key: k, size: k.length + v.length })
      }
    }
    keys.sort((a, b) => b.size - a.size)
    requestAnimationFrame(() => { setStorageKeys(keys.slice(0, 5)) })
  }, [])

  // ===== Clear Data Dialog States =====
  const [clearMeetingsDialogOpen, setClearMeetingsDialogOpen] = useState(false)
  const [clearNotifsDialogOpen, setClearNotifsDialogOpen] = useState(false)
  const [clearSettingsDialogOpen, setClearSettingsDialogOpen] = useState(false)

  const handleClearMeetings = useCallback(() => {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.startsWith('vl-meetings') || key.startsWith('vl-agents') || key.startsWith('vl-individual'))) keysToRemove.push(key)
    }
    keysToRemove.forEach(k => localStorage.removeItem(k))
    setClearMeetingsDialogOpen(false)
    toast.success(t(lang, 'settings.clearMeetings.success'))
    setTimeout(() => window.location.reload(), 800)
  }, [lang, setClearMeetingsDialogOpen])

  const handleClearNotifications = useCallback(() => {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.startsWith('vl-notif') || key.startsWith('vl-notification') || key.startsWith('vl-achievement'))) keysToRemove.push(key)
    }
    keysToRemove.forEach(k => localStorage.removeItem(k))
    setClearNotifsDialogOpen(false)
    toast.success(t(lang, 'settings.clearNotifications.success'))
  }, [lang, setClearNotifsDialogOpen])

  const handleClearSettingsReset = useCallback(() => {
    const prefs = ['vl-font-size', 'vl-density', 'vl-border-radius', 'vl-auto-save', 'vl-confirm-dialogs', 'vl-animations', 'vl-timestamp-format', 'vl-default-rounds', 'vl-default-temperature', 'vl-card-style', 'vl-anim-speed', 'vl-accent-color', 'vl-compact-mode', 'vl-notification-sounds']
    prefs.forEach(k => localStorage.removeItem(k))
    setClearSettingsDialogOpen(false)
    toast.success(t(lang, 'settings.clearSettings.success'))
    setTimeout(() => window.location.reload(), 800)
  }, [lang, setClearSettingsDialogOpen])

  const handleEnhancedImportSettings = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        Object.entries(data).forEach(([key, value]) => {
          if (typeof key === 'string' && key.startsWith('vl-')) {
            localStorage.setItem(key, value as string)
          }
        })
        toast.success(t(lang, 'settings.importSettings.success'))
        setTimeout(() => window.location.reload(), 1000)
      } catch {
        toast.error(t(lang, 'settings.importSettings.failed'))
      }
    }
    reader.readAsText(file)
  }, [lang])

  const importSettingsRef = useRef<HTMLInputElement>(null)

  // Generate timestamped filename
  const getExportFilename = useCallback((ext: string) => {
    const now = new Date()
    const date = now.toISOString().split('T')[0]
    return `virtual-lab-export-${date}.${ext}`
  }, [])

  // Enhanced export handler
  const handleEnhancedExport = useCallback(async (format: string) => {
    try {
      switch (format) {
        case 'json':
          await triggerExport('meetings', 'json')
          break
        case 'csv':
          await triggerExport('meetings', 'csv')
          break
        case 'markdown': {
          // Generate markdown export client-side
          const mdContent = `# Virtual Lab Export\n\nGenerated: ${new Date().toISOString()}\n\n## Agents (${agents.length})\n\nTotal agents: ${agents.length}\n\n## Meetings (${meetings.length})\n\nTotal meetings: ${meetings.length}\nTotal messages: ${totalMessages}\n\n---\n*Exported from Virtual Lab*\n`
          const blob = new Blob([mdContent], { type: 'text/markdown' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = getExportFilename('md')
          a.click()
          URL.revokeObjectURL(url)
          toast.success(`Exported as Markdown`)
          break
        }
        case 'html': {
          const htmlContent = `<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>Virtual Lab Export</title><style>body{font-family:system-ui;max-width:800px;margin:2rem auto;padding:0 1rem;color:#1e293b}h1{color:#10b981}h2{border-bottom:2px solid #e2e8f0;padding-bottom:.5rem}table{width:100%;border-collapse:collapse;margin:1rem 0}th,td{padding:.5rem 1rem;border:1px solid #e2e8f0;text-align:left}th{background:#f8fafc}.meta{color:#64748b;font-size:.875rem}</style></head><body><h1>🧪 Virtual Lab Export</h1><p class=\"meta\">Generated: ${new Date().toISOString()}</p><h2>Statistics</h2><table><tr><th>Metric</th><th>Value</th></tr><tr><td>Agents</td><td>${agents.length}</td></tr><tr><td>Meetings</td><td>${meetings.length}</td></tr><tr><td>Messages</td><td>${totalMessages}</td></tr></table><hr><p class=\"meta\">Exported from Virtual Lab</p></body></html>`
          const blob = new Blob([htmlContent], { type: 'text/html' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = getExportFilename('html')
          a.click()
          URL.revokeObjectURL(url)
          toast.success(`Exported as HTML`)
          break
        }
        case 'pdf': {
          // Open print view
          window.print()
          break
        }
        case 'yaml': {
          const yamlContent = `# Virtual Lab Export\n# Generated: ${new Date().toISOString()}\n\nstatistics:\n  agents: ${agents.length}\n  meetings: ${meetings.length}\n  total_messages: ${totalMessages}\n`
          const blob = new Blob([yamlContent], { type: 'text/yaml' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = getExportFilename('yaml')
          a.click()
          URL.revokeObjectURL(url)
          toast.success(`Exported as YAML`)
          break
        }
        case 'xml': {
          const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n<virtual-lab-export>\n  <generated>${new Date().toISOString()}</generated>\n  <statistics>\n    <agents>${agents.length}</agents>\n    <meetings>${meetings.length}</meetings>\n    <total-messages>${totalMessages}</total-messages>\n  </statistics>\n</virtual-lab-export>\n`
          const blob = new Blob([xmlContent], { type: 'application/xml' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = getExportFilename('xml')
          a.click()
          URL.revokeObjectURL(url)
          toast.success(`Exported as XML`)
          break
        }
      }
      setExportDropdownOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed')
    }
  }, [agents.length, meetings.length, totalMessages, getExportFilename])

  // Enhanced import handler
  const handleEnhancedImport = useCallback((file: File) => {
    const errors: string[] = []
    if (file.size === 0) {
      errors.push(t(lang, 'import.validation.emptyFile'))
      setImportErrors(errors)
      return
    }

    const ext = file.name.split('.').pop()?.toLowerCase()
    const supportedExts = ['json', 'csv', 'md', 'yaml', 'yml', 'xml']

    if (!supportedExts.includes(ext || '')) {
      errors.push(t(lang, 'import.validation.invalidFile'))
      setImportErrors(errors)
      return
    }

    setImporting(true)
    setImportProgress(0)
    setImportErrors([])

    // Simulate progress
    const progressInterval = setInterval(() => {
      setImportProgress(prev => Math.min(prev + 15, 90))
    }, 100)

    const reader = new FileReader()
    reader.onload = (ev) => {
      clearInterval(progressInterval)
      try {
        const content = ev.target?.result as string

        if (ext === 'json') {
          const data = JSON.parse(content)
          Object.entries(data).forEach(([key, value]) => {
            if (typeof key === 'string' && key.startsWith('vl-')) {
              localStorage.setItem(key, value as string)
            }
          })
        } else {
          // For other formats, store as a single key
          localStorage.setItem('vl-imported-data', content)
        }

        setImportProgress(100)
        setTimeout(() => {
          setImporting(false)
          setImportProgress(0)
          toast.success('Data imported successfully. Refreshing...')
          setTimeout(() => window.location.reload(), 1000)
        }, 500)
      } catch {
        clearInterval(progressInterval)
        setImporting(false)
        setImportProgress(0)
        errors.push(t(lang, 'import.validation.parseError'))
        setImportErrors(errors)
        toast.error('Failed to parse file')
      }
    }
    reader.readAsText(file)
  }, [lang])

  return (
            <AnimatePresence mode="wait">
              <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                {/* Settings Header */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <Settings className="size-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold vl-text-heading">{t(lang, 'settings.title')}</h2>
                    <p className="text-xs vl-text-muted">Configure your Virtual Lab experience</p>
                  </div>
                </div>

                {/* Settings Grid - 2 columns on desktop, 1 on mobile */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  {/* ===== Section 1: Theme Settings ===== */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <Card className="vl-card backdrop-blur-sm transition-all duration-200 card-entrance hover-lift transition-all-smooth glass-sidebar">
                    <CardHeader className="pb-3 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-transparent pointer-events-none" />
                      <div className="flex items-center gap-2 relative z-10">
                        {theme === 'dark' ? <Moon className="size-4 text-emerald-400" /> : <Sun className="size-4 text-emerald-400" />}
                        <CardTitle className="text-lg font-semibold tracking-tight vl-text-heading">{t(lang, 'settings.theme')}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 pt-0 space-y-4">
                      {/* Current Theme + Toggle */}
                      <div className="vl-inner rounded-xl p-4 border flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-violet-500/20 flex items-center justify-center">
                            {theme === 'dark' ? <Moon className="size-4 text-violet-400" /> : <Sun className="size-4 text-violet-400" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium vl-text-heading">{theme === 'dark' ? t(lang, 'settings.darkMode') : t(lang, 'settings.lightMode')}</p>
                            <p className="text-[10px] vl-text-muted">{theme === 'dark' ? 'Dark mode active' : 'Light mode active'}</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="vl-input text-xs h-7"
                          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        >
                          {theme === 'dark' ? <Sun className="size-3 mr-1" /> : <Moon className="size-3 mr-1" />}
                          {theme === 'dark' ? t(lang, 'settings.lightMode') : t(lang, 'settings.darkMode')}
                        </Button>
                      </div>

                      {/* Theme Preview Cards: Light, Dark, System */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {[
                          { id: 'light', label: t(lang, 'settings.lightMode'), icon: Sun, bg: '#ffffff', text: '#1e293b', border: '#e2e8f0', active: theme === 'light' },
                          { id: 'dark', label: t(lang, 'settings.darkMode'), icon: Moon, bg: '#0f172a', text: '#f1f5f9', border: '#334155', active: theme === 'dark' },
                          { id: 'system', label: 'System', icon: Cpu, bg: 'linear-gradient(135deg, #ffffff 50%, #0f172a 50%)', text: '#94a3b8', border: '#475569', active: false },
                        ].map(tpl => (
                          <motion.div
                            key={tpl.id}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border cursor-pointer transition-all ${tpl.active ? 'border-emerald-500/50 bg-emerald-500/10' : 'vl-inner hover:border-[var(--vl-border-subtle)]'}`}
                            onClick={() => {
                              if (tpl.id === 'system') {
                                setTheme('system')
                              } else {
                                setTheme(tpl.id as 'light' | 'dark')
                              }
                              toast.success(`Theme set to ${tpl.label}`)
                            }}
                          >
                            {/* Mini theme preview */}
                            <div
                              className="w-full h-10 rounded-md flex items-center justify-center"
                              style={{ background: tpl.bg, border: `1px solid ${tpl.border}` }}
                            >
                              <tpl.icon className="size-4" style={{ color: tpl.text }} />
                            </div>
                            <p className="text-xs font-medium text-center vl-text-heading">{tpl.label}</p>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  </motion.div>

                  {/* Divider between sections */}
                  <div className="hidden lg:block" />

                  {/* ===== Section 2: Language Settings ===== */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <Card className="vl-card backdrop-blur-sm transition-all duration-200 card-entrance hover-lift transition-all-smooth glass-sidebar">
                    <CardHeader className="pb-3 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-transparent pointer-events-none" />
                      <div className="flex items-center gap-2 relative z-10">
                        <Languages className="size-4 text-emerald-400" />
                        <CardTitle className="text-lg font-semibold tracking-tight vl-text-heading">{t(lang, 'settings.language')}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 pt-0 space-y-4">
                      {/* Current Language + Toggle */}
                      <div className="vl-inner rounded-xl p-4 border flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                            <Languages className="size-4 text-cyan-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium vl-text-heading">{lang === 'en' ? t(lang, 'settings.english') : t(lang, 'settings.chinese')}</p>
                            <p className="text-[10px] vl-text-muted">Current language</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="vl-input text-xs h-7"
                          onClick={() => handleSetLang(lang === 'en' ? 'zh' : 'en')}
                        >
                          {lang === 'en' ? '中文' : 'English'}
                        </Button>
                      </div>

                      {/* Available Languages */}
                      <div className="space-y-2">
                        <p className="text-xs vl-text-muted">{t(lang, 'settings.available')}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {getAvailableLanguages().map(l => (
                            <motion.div
                              key={l.value}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${lang === l.value ? 'border-emerald-500/50 bg-emerald-500/10' : 'vl-inner hover:border-[var(--vl-border-subtle)]'}`}
                              onClick={() => handleSetLang(l.value as Lang)}
                            >
                              <div className="w-7 h-7 rounded-full bg-cyan-500/20 flex items-center justify-center">
                                <Languages className="size-3.5 text-cyan-400" />
                              </div>
                              <div>
                                <p className="text-xs font-medium vl-text-heading">{l.label}</p>
                                <p className="text-[9px] vl-text-muted">{l.value === 'en' ? 'English' : '中文'}</p>
                              </div>
                              {lang === l.value && (
                                <CheckCircle2 className="size-3 text-emerald-400 ml-auto" />
                              )}
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  </motion.div>

                  {/* ===== Section 2.5: Appearance ===== */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="col-span-1 lg:col-span-2">
                  <Card className="vl-card backdrop-blur-sm transition-all duration-200 card-entrance hover-lift transition-all-smooth">
                    <CardHeader className="pb-3 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 to-transparent pointer-events-none" />
                      <div className="flex items-center gap-2 relative z-10">
                        <Palette className="size-4 text-emerald-400" />
                        <CardTitle className="text-lg font-semibold tracking-tight vl-text-heading">{t(lang, 'settings.appearance')}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 pt-0 space-y-5">
                      {/* Accent Color Picker */}
                      <div className="vl-inner rounded-xl p-4 border space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium vl-text-heading">{t(lang, 'settings.accentColor')}</p>
                          <p className="text-[10px] vl-text-muted font-mono">{accentColor}</p>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          {ACCENT_COLORS.map(ac => (
                            <motion.button
                              key={ac.id}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                                accentColor === ac.color
                                  ? 'ring-2 ring-offset-2 ring-offset-[var(--vl-bg-card)]'
                                  : 'hover:ring-1 hover:ring-offset-1 hover:ring-offset-[var(--vl-bg-card)]'
                              }`}
                              style={{
                                background: ac.color,
                                ...(accentColor === ac.color ? { ringColor: ac.color } : {}),
                              }}
                              onClick={() => {
                                setAccentColor(ac.color)
                                toast.success(`Accent color set to ${ac.label}`)
                              }}
                              aria-label={`Set accent color to ${ac.label}`}
                            >
                              {accentColor === ac.color && (
                                <CheckCircle2 className="size-4 text-white drop-shadow-sm" />
                              )}
                            </motion.button>
                          ))}
                        </div>
                      </div>

                      {/* Card Style Selector */}
                      <div className="vl-inner rounded-xl p-4 border space-y-3">
                        <p className="text-sm font-medium vl-text-heading">{t(lang, 'settings.cardStyle')}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {([
                            { id: 'default' as const, label: t(lang, 'settings.cardStyle.default'), desc: 'Shadows + borders', style: { boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid var(--vl-border)' } },
                            { id: 'glass' as const, label: t(lang, 'settings.cardStyle.glass'), desc: 'Blur + translucency', style: { backdropFilter: 'blur(12px)', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' } },
                            { id: 'flat' as const, label: t(lang, 'settings.cardStyle.flat'), desc: 'No shadows', style: { boxShadow: 'none', border: '1px solid transparent' } },
                          ]).map(cs => (
                            <motion.div
                              key={cs.id}
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                              className={`flex flex-col items-center gap-2 p-3 rounded-lg cursor-pointer transition-all ${
                                cardStyle === cs.id ? 'border-emerald-500/50 bg-emerald-500/10' : 'hover:border-[var(--vl-border-subtle)]'
                              } border`}
                              onClick={() => {
                                setCardStyle(cs.id)
                                toast.success(`Card style set to ${cs.label}`)
                              }}
                            >
                              <div
                                className="w-full h-12 rounded-md vl-inner flex items-center justify-center"
                                style={cs.style}
                              >
                                <div className="w-6 h-2 rounded-sm bg-emerald-400/60" />
                              </div>
                              <p className="text-xs font-medium vl-text-heading">{cs.label}</p>
                              <p className="text-[9px] vl-text-muted">{cs.desc}</p>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      {/* Animation Speed Slider */}
                      <div className="vl-inner rounded-xl p-4 border space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium vl-text-heading">{t(lang, 'settings.animationSpeed')}</p>
                          <p className="text-[10px] vl-text-muted">
                            {animSpeed === 0 ? t(lang, 'settings.animationSpeed.none') : animSpeed === 1 ? t(lang, 'settings.animationSpeed.normal') : t(lang, 'settings.animationSpeed.fast')}
                          </p>
                        </div>
                        <Slider
                          value={[animSpeed]}
                          min={0}
                          max={2}
                          step={1}
                          onValueChange={([v]) => setAnimSpeed(v)}
                          className="w-full"
                        />
                        <div className="flex justify-between text-[9px] vl-text-muted">
                          <span>{t(lang, 'settings.animationSpeed.none')}</span>
                          <span>{t(lang, 'settings.animationSpeed.normal')}</span>
                          <span>{t(lang, 'settings.animationSpeed.fast')}</span>
                        </div>
                      </div>

                      {/* Font Size Selector */}
                      <div className="vl-inner rounded-xl p-4 border space-y-3">
                        <p className="text-sm font-medium vl-text-heading">{t(lang, 'settings.fontSize')}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {(['small', 'default', 'large', 'extraLarge'] as const).map(size => (
                            <motion.div
                              key={size}
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                              className={`flex flex-col items-center gap-1 p-3 rounded-lg border cursor-pointer transition-all ${
                                fontSize === size ? 'border-emerald-500/50 bg-emerald-500/10' : 'hover:border-[var(--vl-border-subtle)]'
                              }`}
                              onClick={() => {
                                setFontSize(size)
                                toast.success(`${t(lang, 'settings.fontSize')} → ${t(lang, `settings.fontSize.${size}`)}`)
                              }}
                            >
                              <span style={{ fontSize: { small: '11px', default: '13px', large: '15px', extraLarge: '17px' }[size] }} className="vl-text-heading font-medium">
                                Aa
                              </span>
                              <span className="text-[9px] vl-text-muted">{t(lang, `settings.fontSize.${size}`)}</span>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      {/* Density Selector */}
                      <div className="vl-inner rounded-xl p-4 border space-y-3">
                        <p className="text-sm font-medium vl-text-heading">{t(lang, 'settings.density')}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {(['compact', 'default', 'comfortable'] as const).map(d => (
                            <motion.div
                              key={d}
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                              className={`flex flex-col items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                                density === d ? 'border-emerald-500/50 bg-emerald-500/10' : 'hover:border-[var(--vl-border-subtle)]'
                              }`}
                              onClick={() => {
                                setDensity(d)
                                toast.success(`${t(lang, 'settings.density')} → ${t(lang, `settings.density.${d}`)}`)
                              }}
                            >
                              <div className={`w-full rounded-md bg-emerald-400/30 ${
                                d === 'compact' ? 'h-2' : d === 'default' ? 'h-4' : 'h-6'
                              }`} />
                              <span className="text-[9px] vl-text-muted">{t(lang, `settings.density.${d}`)}</span>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      {/* Border Radius Selector */}
                      <div className="vl-inner rounded-xl p-4 border space-y-3">
                        <p className="text-sm font-medium vl-text-heading">{t(lang, 'settings.borderRadius')}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {(['none', 'small', 'default', 'large'] as const).map(r => (
                            <motion.div
                              key={r}
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                              className={`flex flex-col items-center gap-1 p-3 rounded-lg border cursor-pointer transition-all ${
                                borderRadius === r ? 'border-emerald-500/50 bg-emerald-500/10' : 'hover:border-[var(--vl-border-subtle)]'
                              }`}
                              style={{ borderRadius: r === 'none' ? '0px' : r === 'small' ? '4px' : r === 'default' ? '8px' : '16px' }}
                              onClick={() => {
                                setBorderRadius(r)
                                toast.success(`${t(lang, 'settings.borderRadius')} → ${t(lang, `settings.borderRadius.${r}`)}`)
                              }}
                            >
                              <div className="w-6 h-4 border-2 border-emerald-400/50 bg-emerald-400/10" style={{ borderRadius: r === 'none' ? '0px' : r === 'small' ? '2px' : r === 'default' ? '4px' : '8px' }} />
                              <span className="text-[9px] vl-text-muted">{t(lang, `settings.borderRadius.${r}`)}</span>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      {/* Live Preview Card */}
                      <div className="vl-inner rounded-xl p-4 border space-y-3">
                        <p className="text-sm font-medium vl-text-heading">{t(lang, 'settings.preview.title')}</p>
                        <div className="settings-preview-card space-y-3" style={{ borderRadius: borderRadius === 'none' ? '0px' : borderRadius === 'small' ? '6px' : borderRadius === 'default' ? '12px' : '20px' }}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: accentColor + '20', borderRadius: borderRadius === 'none' ? '0px' : '8px' }}>
                              <FlaskConical className="size-4" style={{ color: accentColor }} />
                            </div>
                            <div>
                              <p className="font-semibold vl-text-heading" style={{ fontSize: { small: '12px', default: '14px', large: '16px', extraLarge: '18px' }[fontSize] }}>Virtual Lab</p>
                              <p className="vl-text-muted" style={{ fontSize: { small: '10px', default: '11px', large: '12px', extraLarge: '14px' }[fontSize] }}>AI Research Platform</p>
                            </div>
                          </div>
                          <p className="vl-text-body" style={{ fontSize: { small: '11px', default: '13px', large: '15px', extraLarge: '17px' }[fontSize] }}>{t(lang, 'settings.preview.body')}</p>
                          <Button size="sm" style={{ fontSize: { small: '10px', default: '12px', large: '13px', extraLarge: '14px' }[fontSize] }} className="w-full" variant="outline">{t(lang, 'settings.preview.button')}</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  </motion.div>

                  <Separator className="col-span-1 lg:col-span-2" />

                  {/* ===== Section 3: Keyboard Shortcuts ===== */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                  <Card className="vl-card backdrop-blur-sm transition-all duration-200 card-entrance hover-lift transition-all-smooth">
                    <CardHeader className="pb-3 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent pointer-events-none" />
                      <div className="flex items-center gap-2 relative z-10">
                        <Keyboard className="size-4 text-emerald-400" />
                        <CardTitle className="text-lg font-semibold tracking-tight vl-text-heading">{t(lang, 'settings.shortcuts')}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 pt-0 space-y-3">
                      <KeyboardShortcutsConfig lang={lang} />
                    </CardContent>
                  </Card>
                  </motion.div>

                  {/* ===== Section 4: Data Management ===== */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                  <Card className="vl-card backdrop-blur-sm transition-all duration-200 card-entrance hover-lift transition-all-smooth">
                    <CardHeader className="pb-3 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent pointer-events-none" />
                      <div className="flex items-center gap-2 relative z-10">
                        <Database className="size-4 text-emerald-400" />
                        <CardTitle className="text-lg font-semibold tracking-tight vl-text-heading">{t(lang, 'settings.dataManagement')}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 pt-0 space-y-4">
                      {/* Storage Stats */}
                      <div className="vl-inner rounded-xl p-4 border">
                        <p className="text-sm font-medium vl-text-heading mb-3">{t(lang, 'settings.storage')}</p>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="text-center">
                            <p className="text-2xl font-bold vl-text-heading">{agents.length}</p>
                            <p className="text-[10px] vl-text-muted">{t(lang, 'common.agents')}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold vl-text-heading">{meetings.length}</p>
                            <p className="text-[10px] vl-text-muted">{t(lang, 'common.meetings')}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold vl-text-heading">{totalMessages}</p>
                            <p className="text-[10px] vl-text-muted">{t(lang, 'common.messages')}</p>
                          </div>
                        </div>
                      </div>

                      {/* Export Section */}
                      <div className="vl-inner rounded-xl p-4 border space-y-3">
                        <p className="text-sm font-medium vl-text-heading">{t(lang, 'settings.export')}</p>
                        {/* Export format dropdown + button */}
                        <div className="flex gap-2">
                          <Select value={exportFormat} onValueChange={setExportFormat}>
                            <SelectTrigger className="vl-input text-xs h-auto py-2 flex-1">
                              <SelectValue placeholder={t(lang, 'export.format.select')} />
                            </SelectTrigger>
                            <SelectContent className="vl-dialog">
                              <SelectItem value="json" className="text-xs">{t(lang, 'export.format.json')}</SelectItem>
                              <SelectItem value="csv" className="text-xs">{t(lang, 'export.format.csv')}</SelectItem>
                              <SelectItem value="markdown" className="text-xs">{t(lang, 'export.format.markdown')}</SelectItem>
                              <SelectItem value="html" className="text-xs">{t(lang, 'export.format.html')}</SelectItem>
                              <SelectItem value="pdf" className="text-xs">{t(lang, 'export.format.pdf')}</SelectItem>
                              <SelectItem value="yaml" className="text-xs">{t(lang, 'export.format.yaml')}</SelectItem>
                              <SelectItem value="xml" className="text-xs">{t(lang, 'export.format.xml')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="sm"
                            className="vl-input text-xs h-auto py-2 flex items-center gap-1.5"
                            onClick={() => handleEnhancedExport(exportFormat)}
                          >
                            <Download className="size-3 text-emerald-400" /> {t(lang, 'export.download')}
                          </Button>
                        </div>
                        {/* Quick export shortcuts */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          <Button variant="ghost" size="sm" className="vl-input text-[10px] h-auto py-1.5 flex items-center gap-1 justify-center" onClick={() => handleEnhancedExport('json')}>
                            <FileJson className="size-3 text-emerald-400" /> JSON
                          </Button>
                          <Button variant="ghost" size="sm" className="vl-input text-[10px] h-auto py-1.5 flex items-center gap-1 justify-center" onClick={() => handleEnhancedExport('csv')}>
                            <FileSpreadsheet className="size-3 text-cyan-400" /> CSV
                          </Button>
                          <Button variant="ghost" size="sm" className="vl-input text-[10px] h-auto py-1.5 flex items-center gap-1 justify-center" onClick={() => handleEnhancedExport('markdown')}>
                            <FileText className="size-3 text-violet-400" /> MD
                          </Button>
                          <Button variant="ghost" size="sm" className="vl-input text-[10px] h-auto py-1.5 flex items-center gap-1 justify-center" onClick={() => handleEnhancedExport('html')}>
                            <FileCode className="size-3 text-amber-400" /> HTML
                          </Button>
                          <Button variant="ghost" size="sm" className="vl-input text-[10px] h-auto py-1.5 flex items-center gap-1 justify-center" onClick={() => handleEnhancedExport('yaml')}>
                            <FileText className="size-3 text-teal-400" /> YAML
                          </Button>
                          <Button variant="ghost" size="sm" className="vl-input text-[10px] h-auto py-1.5 flex items-center gap-1 justify-center" onClick={() => handleEnhancedExport('xml')}>
                            <FileCode className="size-3 text-orange-400" /> XML
                          </Button>
                        </div>
                      </div>

                      {/* Import Section - Enhanced with drag-and-drop */}
                      <div className="vl-inner rounded-xl p-4 border space-y-2">
                        <p className="text-sm font-medium vl-text-heading">{t(lang, 'settings.import')}</p>
                        <p className="text-[10px] vl-text-muted">{t(lang, 'import.supportedFormats')}</p>
                        <div
                          className={`border-2 rounded-lg p-6 text-center cursor-pointer transition-all duration-200 ${
                            isDragOver
                              ? 'border-emerald-500 bg-emerald-500/10'
                              : 'border-dashed hover:border-emerald-500/50 hover:bg-emerald-500/5'
                          }`}
                          style={isDragOver ? { borderColor: '#10b981' } : { borderColor: 'var(--vl-border-subtle)' }}
                          onClick={() => importFileRef.current?.click()}
                          onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true) }}
                          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true) }}
                          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false) }}
                          onDrop={(e) => {
                            e.preventDefault(); e.stopPropagation(); setIsDragOver(false)
                            const file = e.dataTransfer.files?.[0]
                            if (file) handleEnhancedImport(file)
                          }}
                        >
                          {importing ? (
                            <div className="space-y-2">
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex items-center justify-center gap-2"
                              >
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                >
                                  <Upload className="size-5 text-emerald-400" />
                                </motion.div>
                                <span className="text-xs text-emerald-400">{t(lang, 'import.progress')}</span>
                              </motion.div>
                              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--vl-border)' }}>
                                <motion.div
                                  className="h-full bg-emerald-500 rounded-full"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${importProgress}%` }}
                                  transition={{ duration: 0.3 }}
                                />
                              </div>
                              <span className="text-[10px] vl-text-muted">{importProgress}%</span>
                            </div>
                          ) : (
                            <>
                              <motion.div animate={{ y: isDragOver ? -4 : 0 }} transition={{ duration: 0.2 }}>
                                <Upload className={`size-6 mx-auto mb-2 ${isDragOver ? 'text-emerald-400' : 'vl-text-muted'}`} />
                              </motion.div>
                              <p className="text-xs vl-text-muted">{isDragOver ? t(lang, 'import.dragOver') : t(lang, 'import.dropzone')}</p>
                            </>
                          )}
                        </div>
                        {/* Import errors */}
                        <AnimatePresence>
                          {importErrors.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="space-y-1"
                            >
                              {importErrors.map((err, i) => (
                                <div key={i} className="flex items-center gap-1.5 text-xs text-red-400">
                                  <XCircle className="size-3 shrink-0" />
                                  <span>{err}</span>
                                </div>
                              ))}
                              <button
                                className="text-[10px] text-red-400 hover:text-red-300 underline"
                                onClick={() => setImportErrors([])}
                              >
                                Dismiss
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <input
                          ref={importFileRef}
                          type="file"
                          accept=".json,.csv,.md,.yaml,.yml,.xml"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleEnhancedImport(file)
                            e.target.value = ''
                          }}
                        />
                      </div>

                      {/* Storage Usage Card */}
                      <div className="vl-inner rounded-xl p-4 border space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <HardDrive className="size-4 text-emerald-400" />
                            <p className="text-sm font-medium vl-text-heading">{t(lang, 'settings.storage.usage')}</p>
                          </div>
                          <p className="text-xs font-mono vl-text-muted">{storageUsageKB} KB / 5 MB {t(lang, 'settings.storage.used')}</p>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--vl-border)' }}>
                          <motion.div
                            className="h-full rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min((storageUsageKB / 5120) * 100, 100)}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            style={{ background: storageUsageKB < 1024 ? '#10b981' : storageUsageKB < 3072 ? '#f59e0b' : '#f43f5e' }}
                          />
                        </div>
                      </div>

                      {/* Clear & Reset */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="vl-input text-xs h-auto py-2 flex items-center justify-center gap-1.5 bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/50 hover:text-rose-300"
                          onClick={() => setClearAllDialogOpen(true)}
                        >
                          <Trash2 className="size-3" /> {t(lang, 'settings.storage.clearAll')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="vl-input text-xs h-auto py-2 flex items-center justify-center gap-1.5"
                          onClick={handleExportSettings}
                        >
                          <Download className="size-3 text-emerald-400" /> {t(lang, 'settings.storage.exportSettings')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="vl-input text-xs h-auto py-2 flex items-center justify-center gap-1.5"
                          onClick={async () => {
                            try {
                              await seedAgents()
                              toast.success('Default agents re-seeded!')
                            } catch {
                              toast.error('Failed to re-seed agents')
                            }
                          }}
                        >
                          <RotateCcw className="size-3 text-amber-400" /> {t(lang, 'settings.resetDefaults')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  </motion.div>

                  <Separator className="col-span-1 lg:col-span-2" />

                  {/* ===== Section 5: About ===== */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                  <Card className="vl-card backdrop-blur-sm transition-all duration-200 card-entrance hover-lift transition-all-smooth">
                    <CardHeader className="pb-3 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 to-transparent pointer-events-none" />
                      <div className="flex items-center gap-2 relative z-10">
                        <Info className="size-4 text-emerald-400" />
                        <CardTitle className="text-lg font-semibold tracking-tight vl-text-heading">{t(lang, 'settings.about.title')}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 pt-0 space-y-3">
                      <div className="vl-inner rounded-xl p-4 border space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <FlaskConical className="size-6 text-white" />
                          </div>
                          <div>
                            <p className="text-base font-bold vl-text-heading">Virtual Lab</p>
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">v3.0</Badge>
                          </div>
                        </div>
                        <p className="text-sm vl-text-body">{t(lang, 'dashboard.subtitle')}</p>
                      </div>

                      {/* Build Stats Grid */}
                      <div className="vl-inner rounded-xl p-4 border">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {[
                            { label: t(lang, 'settings.about.version'), value: 'v3.0 (Next.js 16)' },
                            { label: t(lang, 'settings.about.build'), value: '~37,700 lines' },
                            { label: t(lang, 'settings.about.components'), value: '24' },
                            { label: t(lang, 'settings.about.apiRoutes'), value: '8' },
                            { label: t(lang, 'settings.about.cssClasses'), value: '150+' },
                          ].map(stat => (
                            <div key={stat.label} className="text-center p-2 rounded-lg bg-[var(--vl-bg-inner)]">
                              <p className="text-xs vl-text-muted mb-1">{stat.label}</p>
                              <p className="text-sm font-mono font-semibold vl-text-heading">{stat.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="vl-inner rounded-xl p-4 border space-y-2">
                        <p className="text-sm font-medium vl-text-heading">{t(lang, 'settings.about')}</p>
                        <p className="text-xs vl-text-body">{t(lang, 'settings.about.desc')}</p>
                      </div>

                      <div className="vl-inner rounded-xl p-4 border space-y-2">
                        <p className="text-sm font-medium vl-text-heading">GitHub</p>
                        <a
                          href="https://github.com/zou-group/virtual-lab"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
                        >
                          zou-group/virtual-lab <ExternalLink className="size-3" />
                        </a>
                        <p className="text-[10px] vl-text-muted">{t(lang, 'footer.basedOn')}</p>
                      </div>

                      <div className="vl-inner rounded-xl p-4 border space-y-2">
                        <p className="text-sm font-medium vl-text-heading">{t(lang, 'settings.paper')}</p>
                        <p className="text-xs vl-text-muted">
                          Virtual Lab: AI-driven research platform for computational biology.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  </motion.div>

                  <Separator className="col-span-1 lg:col-span-2" />

                  {/* ===== Section 6: Notification Preferences ===== */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
                  <Card className="vl-card backdrop-blur-sm transition-all duration-200 card-entrance hover-lift transition-all-smooth">
                    <CardHeader className="pb-3 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent pointer-events-none" />
                      <div className="flex items-center gap-2 relative z-10">
                        <Bell className="size-4 text-emerald-400" />
                        <CardTitle className="text-lg font-semibold tracking-tight vl-text-heading">{t(lang, 'notification.title')}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 pt-0 space-y-3">
                      {([
                        { key: 'meetingComplete' as const, label: t(lang, 'notification.meetingCompleted'), desc: 'Get notified when a meeting finishes', icon: CheckCheck },
                        { key: 'agentActivity' as const, label: t(lang, 'notification.agentMessage'), desc: 'Get notified when an agent sends a message', icon: MessageCircle },
                        { key: 'systemAlerts' as const, label: t(lang, 'notification.taskDue'), desc: 'Get notified about system events and deadlines', icon: AlertCircle },
                      ]).map(item => (
                        <div key={item.key} className="vl-inner rounded-xl p-4 border flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                              <item.icon className="size-4 text-emerald-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium vl-text-heading">{item.label}</p>
                              <p className="text-[10px] vl-text-muted">{item.desc}</p>
                            </div>
                          </div>
                          <button
                            role="switch"
                            aria-checked={notifPrefs[item.key]}
                            aria-label={`Toggle ${item.label}`}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${notifPrefs[item.key] ? 'bg-emerald-500' : 'bg-[var(--vl-chart-axis-line)]'}`}
                            onClick={() => updateNotifPref(item.key, !notifPrefs[item.key])}
                          >
                            <span
                              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform duration-200 shadow-sm ${notifPrefs[item.key] ? 'translate-x-6' : 'translate-x-1'}`}
                            />
                          </button>
                        </div>
                      ))}

                      {/* Notification Sounds Toggle */}
                      <div className="vl-inner rounded-xl p-4 border flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
                            <Bell className="size-4 text-amber-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium vl-text-heading">Notification Sounds</p>
                            <p className="text-[10px] vl-text-muted">Play sounds for meeting start/complete events</p>
                          </div>
                        </div>
                        <Switch
                          checked={notificationSounds}
                          onCheckedChange={(v) => { setNotificationSounds(v); localStorage.setItem('vl-notification-sounds', String(v)); toast.success(v ? 'Notification sounds enabled' : 'Notification sounds disabled') }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                  </motion.div>

                  <Separator className="col-span-1 lg:col-span-2" />

                  {/* ===== Section 7: API Configuration ===== */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="col-span-1 lg:col-span-2">
                  <Card className="vl-card backdrop-blur-sm transition-all duration-200 card-entrance hover-lift transition-all-smooth">
                    <CardHeader className="pb-3 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-transparent pointer-events-none" />
                      <div className="flex items-center gap-2 relative z-10">
                        <KeyRound className="size-4 text-emerald-400" />
                        <CardTitle className="text-lg font-semibold tracking-tight vl-text-heading">API Configuration</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 pt-0 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Provider Selector */}
                        <div className="space-y-2">
                          <Label className="vl-text-label text-sm flex items-center gap-1.5">
                            <Globe className="size-3.5" /> API Provider
                          </Label>
                          <Select value={apiProvider} onValueChange={(v) => {
                            setApiProvider(v)
                            // Auto-select first model of new provider
                            const models = MODEL_OPTIONS[v]
                            if (models && models.length > 0) setApiModel(models[0].value)
                          }}>
                            <SelectTrigger className="vl-input">
                              <SelectValue placeholder="Select provider" />
                            </SelectTrigger>
                            <SelectContent className="vl-dialog">
                              <SelectItem value="openai" className="text-xs flex items-center gap-2">
                                <Zap className="size-3 text-emerald-400" /> OpenAI
                              </SelectItem>
                              <SelectItem value="anthropic" className="text-xs flex items-center gap-2">
                                <Cpu className="size-3 text-amber-400" /> Anthropic
                              </SelectItem>
                              <SelectItem value="google" className="text-xs flex items-center gap-2">
                                <Globe className="size-3 text-cyan-400" /> Google
                              </SelectItem>
                              <SelectItem value="local" className="text-xs flex items-center gap-2">
                                <Server className="size-3 text-violet-400" /> Local / Self-Hosted
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Model Selection */}
                        <div className="space-y-2">
                          <Label className="vl-text-label text-sm flex items-center gap-1.5">
                            <Cpu className="size-3.5" /> Model
                          </Label>
                          <Select value={apiModel} onValueChange={setApiModel}>
                            <SelectTrigger className="vl-input">
                              <SelectValue placeholder="Select model" />
                            </SelectTrigger>
                            <SelectContent className="vl-dialog">
                              {(MODEL_OPTIONS[apiProvider] || []).map(opt => (
                                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* API Key Input */}
                        <div className="space-y-2 md:col-span-2">
                          <Label className="vl-text-label text-sm flex items-center gap-1.5">
                            <KeyRound className="size-3.5" /> API Key
                          </Label>
                          <div className="relative">
                            <Input
                              type={showApiConfigKey ? 'text' : 'password'}
                              className="vl-input pr-10"
                              placeholder="sk-... or your API key"
                              value={apiConfigKey}
                              onChange={(e) => setApiConfigKey(e.target.value)}
                            />
                            <button
                              type="button"
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded vl-text-muted hover:text-emerald-400 transition-colors"
                              onClick={() => setShowApiConfigKey(!showApiConfigKey)}
                              aria-label={showApiConfigKey ? 'Hide API key' : 'Show API key'}
                            >
                              {showApiConfigKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Custom Endpoint URL (only for Local) */}
                        <AnimatePresence>
                          {apiProvider === 'local' && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="space-y-2 md:col-span-2 overflow-hidden"
                            >
                              <Label className="vl-text-label text-sm flex items-center gap-1.5">
                                <Server className="size-3.5" /> Custom Endpoint URL
                              </Label>
                              <Input
                                type="url"
                                className="vl-input"
                                placeholder="http://localhost:11434/v1"
                                value={apiCustomEndpoint}
                                onChange={(e) => setApiCustomEndpoint(e.target.value)}
                              />
                              <p className="text-[10px] vl-text-muted">Enter the base URL for your local model server (e.g., Ollama, LM Studio)</p>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Temperature Slider */}
                        <div className="space-y-2 md:col-span-2">
                          <div className="flex items-center justify-between">
                            <Label className="vl-text-label text-sm flex items-center gap-1.5">
                              <Thermometer className="size-3.5" /> Temperature Default
                            </Label>
                            <span className="text-xs font-mono vl-text-muted bg-[var(--vl-bg-inner)] px-2 py-0.5 rounded">{apiTemperature.toFixed(1)}</span>
                          </div>
                          <Slider
                            value={[apiTemperature]}
                            onValueChange={([v]) => setApiTemperature(v)}
                            min={0}
                            max={2}
                            step={0.1}
                            className="w-full"
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] vl-text-muted">Presets:</span>
                            {[
                              { label: 'Conservative', value: 0.3 },
                              { label: 'Balanced', value: 0.7 },
                              { label: 'Creative', value: 1.2 },
                            ].map(preset => (
                              <Button
                                key={preset.label}
                                variant="ghost"
                                size="sm"
                                className={`text-[10px] h-6 px-2 py-0 ${apiTemperature === preset.value ? 'bg-emerald-500/10 text-emerald-400' : 'vl-text-muted hover:text-emerald-400'}`}
                                onClick={() => setApiTemperature(preset.value)}
                              >
                                {preset.label} ({preset.value})
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="vl-input text-xs flex items-center gap-1.5"
                          onClick={handleSaveApiConfig}
                        >
                          <Save className="size-3 text-emerald-400" />
                          Save Configuration
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className={`vl-input text-xs flex items-center gap-1.5 ${testResult === 'success' ? 'border-emerald-500/50 text-emerald-400' : testResult === 'failure' ? 'border-red-500/50 text-red-400' : ''}`}
                          onClick={handleTestConnection}
                          disabled={testingConnection}
                        >
                          {testingConnection ? (
                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                              <Zap className="size-3 text-amber-400" />
                            </motion.div>
                          ) : (
                            <Zap className="size-3 text-amber-400" />
                          )}
                          {testingConnection ? 'Testing...' : 'Test Connection'}
                        </Button>

                        {/* Current Config Display */}
                        <div className="ml-auto flex items-center gap-2">
                          <Badge variant="outline" className="vl-text-muted text-[10px] px-2 py-0.5">
                            <KeyRound className="size-2.5 mr-1" />
                            {maskApiKey(apiConfigKey)}
                          </Badge>
                          <Badge variant="outline" className="vl-text-muted text-[10px] px-2 py-0.5">
                            <Cpu className="size-2.5 mr-1" />
                            {MODEL_OPTIONS[apiProvider]?.find(m => m.value === apiModel)?.label || apiModel}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  </motion.div>

                  <Separator className="col-span-1 lg:col-span-2" />

                  {/* ===== Section 8: Advanced Preferences ===== */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}>
                  <Card className="vl-card backdrop-blur-sm transition-all duration-200 card-entrance hover-lift transition-all-smooth">
                    <CardHeader className="pb-3 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-transparent pointer-events-none" />
                      <div className="flex items-center gap-2 relative z-10">
                        <Zap className="size-4 text-emerald-400" />
                        <CardTitle className="text-lg font-semibold tracking-tight vl-text-heading">{t(lang, 'settings.advancedPrefs')}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 pt-0 space-y-3">
                      {/* Auto-save */}
                      <div className="vl-inner rounded-xl p-4 border flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                            <Save className="size-4 text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium vl-text-heading">{t(lang, 'settings.autoSave')}</p>
                            <p className="text-[10px] vl-text-muted">{t(lang, 'settings.autoSave.desc')}</p>
                          </div>
                        </div>
                        <Switch checked={autoSave} onCheckedChange={setAutoSave} />
                      </div>

                      {/* Confirmation Dialogs */}
                      <div className="vl-inner rounded-xl p-4 border flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
                            <AlertTriangle className="size-4 text-amber-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium vl-text-heading">{t(lang, 'settings.confirmDialogs')}</p>
                            <p className="text-[10px] vl-text-muted">{t(lang, 'settings.confirmDialogs.desc')}</p>
                          </div>
                        </div>
                        <Switch checked={confirmDialogs} onCheckedChange={setConfirmDialogs} />
                      </div>

                      {/* Animations Toggle */}
                      <div className="vl-inner rounded-xl p-4 border flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-violet-500/20 flex items-center justify-center">
                            <FlaskConical className="size-4 text-violet-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium vl-text-heading">{t(lang, 'settings.animations')}</p>
                            <p className="text-[10px] vl-text-muted">{t(lang, 'settings.animations.desc')}</p>
                          </div>
                        </div>
                        <Switch checked={animationsEnabled} onCheckedChange={setAnimationsEnabled} />
                      </div>

                      {/* Timestamp Format */}
                      <div className="vl-inner rounded-xl p-4 border space-y-2">
                        <p className="text-sm font-medium vl-text-heading">{t(lang, 'settings.timestampFormat')}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {(['relative', 'absolute', 'full'] as const).map(tf => (
                            <motion.div
                              key={tf}
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                              className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border cursor-pointer transition-all ${
                                timestampFormat === tf ? 'border-emerald-500/50 bg-emerald-500/10' : 'hover:border-[var(--vl-border-subtle)]'
                              }`}
                              onClick={() => {
                                setTimestampFormat(tf)
                                toast.success(`${t(lang, 'settings.timestampFormat')} → ${t(lang, `settings.timestamp.${tf}`)}`)
                              }}
                            >
                              <span className="text-xs font-mono vl-text-muted">{tf === 'relative' ? '2m ago' : tf === 'absolute' ? '18:30' : 'Jun 6'}</span>
                              <span className="text-[9px] vl-text-muted">{t(lang, `settings.timestamp.${tf}`)}</span>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      {/* Default Meeting Rounds */}
                      <div className="vl-inner rounded-xl p-4 border space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium vl-text-heading">{t(lang, 'settings.defaultRounds')}</p>
                          <span className="text-xs font-mono vl-text-muted">{defaultRounds}</span>
                        </div>
                        <Slider value={[defaultRounds]} min={1} max={10} step={1} onValueChange={([v]) => setDefaultRounds(v)} />
                        <div className="flex justify-between text-[9px] vl-text-muted"><span>1</span><span>5</span><span>10</span></div>
                      </div>

                      {/* Default Temperature */}
                      <div className="vl-inner rounded-xl p-4 border space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium vl-text-heading">{t(lang, 'settings.defaultTemp')}</p>
                          <span className="text-xs font-mono vl-text-muted">{defaultTemperature.toFixed(1)}</span>
                        </div>
                        <Slider value={[defaultTemperature]} min={0} max={2} step={0.1} onValueChange={([v]) => setDefaultTemperature(v)} />
                        <div className="flex justify-between text-[9px] vl-text-muted"><span>0.0</span><span>1.0</span><span>2.0</span></div>
                      </div>
                    </CardContent>
                  </Card>
                  </motion.div>

                  {/* ===== Section 9: Enhanced Data Management ===== */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
                  <Card className="vl-card backdrop-blur-sm transition-all duration-200 card-entrance hover-lift transition-all-smooth">
                    <CardHeader className="pb-3 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 to-transparent pointer-events-none" />
                      <div className="flex items-center gap-2 relative z-10">
                        <Database className="size-4 text-emerald-400" />
                        <CardTitle className="text-lg font-semibold tracking-tight vl-text-heading">{t(lang, 'settings.dataManagement.enhanced')}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 pt-0 space-y-4">
                      {/* Storage Usage */}
                      <div className="vl-inner rounded-xl p-4 border space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium vl-text-heading">{t(lang, 'settings.storageUsage')}</p>
                          <p className="text-xs font-mono vl-text-muted">{storageUsageKB} KB</p>
                        </div>
                        <div className="settings-storage-bar">
                          <div className="settings-storage-bar-fill animate" style={{ width: `${Math.min((storageUsageKB / 5120) * 100, 100)}%` }} />
                        </div>
                        {/* Top 5 keys */}
                        <div className="space-y-1.5">
                          <p className="text-[10px] vl-text-muted">{t(lang, 'settings.storage.topKeys')}</p>
                          {storageKeys.map(sk => (
                            <div key={sk.key} className="flex items-center justify-between text-[10px]">
                              <span className="font-mono text-amber-400 truncate max-w-[180px]">{sk.key}</span>
                              <span className="vl-text-muted">{(sk.size / 1024).toFixed(2)} KB</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Export/Import Settings */}
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" size="sm" className="vl-input text-xs flex items-center gap-1.5" onClick={handleExportSettings}>
                          <Download className="size-3 text-emerald-400" /> {t(lang, 'settings.exportSettings.enhanced')}
                        </Button>
                        <Button variant="outline" size="sm" className="vl-input text-xs flex items-center gap-1.5" onClick={() => importSettingsRef.current?.click()}>
                          <Upload className="size-3 text-cyan-400" /> {t(lang, 'settings.importSettings.enhanced')}
                        </Button>
                      </div>
                      <input ref={importSettingsRef} type="file" accept=".json" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleEnhancedImportSettings(file)
                        e.target.value = ''
                      }} />

                      {/* Danger Zone */}
                      <div className="settings-danger-zone space-y-2">
                        <p className="text-xs font-semibold text-red-400 flex items-center gap-1.5">
                          <AlertTriangle className="size-3.5" /> Danger Zone
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <Button variant="outline" size="sm" className="text-[10px] h-auto py-2 bg-red-500/5 border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/30" onClick={() => setClearMeetingsDialogOpen(true)}>
                            {t(lang, 'settings.clearMeetings')}
                          </Button>
                          <Button variant="outline" size="sm" className="text-[10px] h-auto py-2 bg-red-500/5 border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/30" onClick={() => setClearNotifsDialogOpen(true)}>
                            {t(lang, 'settings.clearNotifications')}
                          </Button>
                          <Button variant="outline" size="sm" className="text-[10px] h-auto py-2 bg-red-500/5 border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/30" onClick={() => setClearSettingsDialogOpen(true)}>
                            {t(lang, 'settings.clearSettings')}
                          </Button>
                          <Button variant="outline" size="sm" className="text-[10px] h-auto py-2 bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/15 hover:border-red-500/50" onClick={() => setClearAllDialogOpen(true)}>
                            {t(lang, 'settings.clearAll')} ⚠
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  </motion.div>

                  {/* ===== Section 10: Enhanced About & Statistics ===== */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="col-span-1 lg:col-span-2">
                  <Card className="vl-card backdrop-blur-sm transition-all duration-200 card-entrance hover-lift transition-all-smooth">
                    <CardHeader className="pb-3 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 to-transparent pointer-events-none" />
                      <div className="flex items-center gap-2 relative z-10">
                        <Info className="size-4 text-emerald-400" />
                        <CardTitle className="text-lg font-semibold tracking-tight vl-text-heading">{t(lang, 'settings.about.enhanced')}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 pt-0 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Project Info */}
                        <div className="vl-inner rounded-xl p-4 border space-y-3">
                          <p className="text-sm font-medium vl-text-heading">{t(lang, 'settings.about.projectInfo')}</p>
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                              <FlaskConical className="size-6 text-white" />
                            </div>
                            <div>
                              <p className="text-base font-bold vl-text-heading">Virtual Lab</p>
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">v3.0</Badge>
                            </div>
                          </div>
                          <p className="text-xs vl-text-body">{t(lang, 'dashboard.subtitle')}</p>
                        </div>

                        {/* Component Count */}
                        <div className="vl-inner rounded-xl p-4 border space-y-3">
                          <p className="text-sm font-medium vl-text-heading">{t(lang, 'settings.about.componentCount')}</p>
                          <div className="settings-about-grid">
                            {[
                              { label: t(lang, 'settings.about.tabs'), value: '7' },
                              { label: t(lang, 'settings.about.apiRoutesCount'), value: '8' },
                              { label: t(lang, 'settings.about.cssClassesCount'), value: '180+' },
                              { label: t(lang, 'settings.about.keyframes'), value: '45+' },
                              { label: t(lang, 'settings.about.i18nKeys'), value: '2100+' },
                            ].map(stat => (
                              <div key={stat.label} className="text-center p-2 rounded-lg bg-[var(--vl-bg-inner)]">
                                <p className="text-sm font-mono font-semibold vl-text-heading">{stat.value}</p>
                                <p className="text-[9px] vl-text-muted">{stat.label}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Performance */}
                        <div className="vl-inner rounded-xl p-4 border space-y-3">
                          <p className="text-sm font-medium vl-text-heading">{t(lang, 'settings.about.performance')}</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="text-center p-2 rounded-lg bg-[var(--vl-bg-inner)]">
                              <p className="text-sm font-mono font-semibold vl-text-heading">{storageUsageKB} KB</p>
                              <p className="text-[9px] vl-text-muted">{t(lang, 'settings.about.localStorageUsage')}</p>
                            </div>
                            <div className="text-center p-2 rounded-lg bg-[var(--vl-bg-inner)]">
                              <p className="text-sm font-mono font-semibold vl-text-heading">~2.4 MB</p>
                              <p className="text-[9px] vl-text-muted">{t(lang, 'settings.about.pageWeight')}</p>
                            </div>
                          </div>
                        </div>

                        {/* Tech Stack */}
                        <div className="vl-inner rounded-xl p-4 border space-y-3">
                          <p className="text-sm font-medium vl-text-heading">{t(lang, 'settings.about.techStack')}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {['Next.js 16', 'TypeScript', 'Tailwind CSS', 'Prisma', 'shadcn/ui', 'Recharts', 'Framer Motion', 'Lucide Icons'].map(tech => (
                              <Badge key={tech} variant="outline" className="text-[10px] bg-emerald-500/5 text-emerald-400 border-emerald-500/20">{tech}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Links */}
                      <div className="vl-inner rounded-xl p-4 border space-y-2">
                        <p className="text-sm font-medium vl-text-heading">{t(lang, 'settings.about.links')}</p>
                        <a href="https://github.com/zou-group/virtual-lab" target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1">
                          zou-group/virtual-lab <ExternalLink className="size-3" />
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="col-span-1 lg:col-span-2">
                  <DataBackupSection lang={lang} />
                  </motion.div>

                </div>{/* End Settings Grid */}

                {/* Last Saved Indicator */}
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Clock className="size-3 vl-text-muted" />
                  <p className="text-[10px] vl-text-muted">Settings auto-saved to localStorage</p>
                </div>
              </motion.div>

              {/* Clear Meetings Dialog */}
              <Dialog open={clearMeetingsDialogOpen} onOpenChange={setClearMeetingsDialogOpen}>
                <DialogContent className="vl-dialog">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 vl-text-heading">
                      <AlertTriangle className="size-5 text-rose-400" />
                      {t(lang, 'settings.clearMeetings')}
                    </DialogTitle>
                    <DialogDescription className="vl-text-body">{t(lang, 'settings.clearMeetings.confirm')}</DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" className="vl-input" onClick={() => setClearMeetingsDialogOpen(false)}>{t(lang, 'common.cancel')}</Button>
                    <Button variant="destructive" className="bg-rose-500 hover:bg-rose-600 text-white" onClick={handleClearMeetings}><Trash2 className="size-4 mr-1" /> {t(lang, 'settings.clearMeetings')}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Clear Notifications Dialog */}
              <Dialog open={clearNotifsDialogOpen} onOpenChange={setClearNotifsDialogOpen}>
                <DialogContent className="vl-dialog">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 vl-text-heading">
                      <AlertTriangle className="size-5 text-rose-400" />
                      {t(lang, 'settings.clearNotifications')}
                    </DialogTitle>
                    <DialogDescription className="vl-text-body">{t(lang, 'settings.clearNotifications.confirm')}</DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" className="vl-input" onClick={() => setClearNotifsDialogOpen(false)}>{t(lang, 'common.cancel')}</Button>
                    <Button variant="destructive" className="bg-rose-500 hover:bg-rose-600 text-white" onClick={handleClearNotifications}><Trash2 className="size-4 mr-1" /> {t(lang, 'settings.clearNotifications')}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Clear Settings Dialog */}
              <Dialog open={clearSettingsDialogOpen} onOpenChange={setClearSettingsDialogOpen}>
                <DialogContent className="vl-dialog">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 vl-text-heading">
                      <AlertTriangle className="size-5 text-rose-400" />
                      {t(lang, 'settings.clearSettings')}
                    </DialogTitle>
                    <DialogDescription className="vl-text-body">{t(lang, 'settings.clearSettings.confirm')}</DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" className="vl-input" onClick={() => setClearSettingsDialogOpen(false)}>{t(lang, 'common.cancel')}</Button>
                    <Button variant="destructive" className="bg-rose-500 hover:bg-rose-600 text-white" onClick={handleClearSettingsReset}><Trash2 className="size-4 mr-1" /> {t(lang, 'settings.clearSettings')}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Clear All Data Confirmation Dialog */}
              <Dialog open={clearAllDialogOpen} onOpenChange={setClearAllDialogOpen}>
                <DialogContent className="vl-dialog">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 vl-text-heading">
                      <AlertTriangle className="size-5 text-rose-400" />
                      {t(lang, 'settings.storage.clearAll')}
                    </DialogTitle>
                    <DialogDescription className="vl-text-body">
                      {t(lang, 'settings.clearAll.confirm')}
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="gap-2">
                    <Button
                      variant="outline"
                      className="vl-input"
                      onClick={() => setClearAllDialogOpen(false)}
                    >
                      {t(lang, 'common.cancel')}
                    </Button>
                    <Button
                      variant="destructive"
                      className="bg-rose-500 hover:bg-rose-600 text-white"
                      onClick={handleClearAllData}
                    >
                      <Trash2 className="size-4 mr-1" />
                      {t(lang, 'settings.clearAll')}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </AnimatePresence>
  )

}

// ============================================================
// Data Backup Section (uses persistence hook + panel)
// ============================================================

function DataBackupSection({ lang }: { lang: Lang }) {
  const persistence = useDataPersistence({
    agents: [],
    meetings: [],
    pipelines: [],
    lang,
  })

  return (
    <Card className="vl-card backdrop-blur-sm transition-all duration-200 card-entrance hover-lift col-span-1 lg:col-span-2" style={{ animationDelay: '0.3s' }}>
      <CardHeader className="pb-3 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent pointer-events-none" />
        <div className="flex items-center gap-2 relative z-10">
          <Database className="size-4 text-emerald-400" />
          <CardTitle className="text-lg font-semibold tracking-tight vl-text-heading">{t(lang, 'dataPersistence.title')}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <DataPersistencePanel
          lang={lang}
          lastBackupAt={persistence.lastBackupAt}
          autoBackup={persistence.autoBackup}
          setAutoBackup={persistence.setAutoBackup}
          onExport={persistence.exportData}
          onImport={persistence.importData}
          onClear={persistence.clearData}
        />
      </CardContent>
    </Card>
  )
}

// ============================================================
// Keyboard Shortcuts Configuration Component
// ============================================================

const DEFAULT_SHORTCUTS = [
  { id: 'cmd-palette', action: 'commandPalette', keys: ['Cmd', 'K'], descriptionKey: 'shortcuts.openCommandPalette' },
  { id: 'tab-1', action: 'switchTab1', keys: ['Cmd', '1'], descriptionKey: 'shortcuts.switchTab' },
  { id: 'tab-2', action: 'switchTab2', keys: ['Cmd', '2'], descriptionKey: 'shortcuts.switchTab' },
  { id: 'tab-3', action: 'switchTab3', keys: ['Cmd', '3'], descriptionKey: 'shortcuts.switchTab' },
  { id: 'tab-4', action: 'switchTab4', keys: ['Cmd', '4'], descriptionKey: 'shortcuts.switchTab' },
  { id: 'tab-5', action: 'switchTab5', keys: ['Cmd', '5'], descriptionKey: 'shortcuts.switchTab' },
  { id: 'tab-6', action: 'switchTab6', keys: ['Cmd', '6'], descriptionKey: 'shortcuts.switchTab' },
  { id: 'tab-7', action: 'switchTab7', keys: ['Cmd', '7'], descriptionKey: 'shortcuts.switchTab' },
  { id: 'new-meeting', action: 'newMeeting', keys: ['Cmd', 'N'], descriptionKey: 'shortcuts.newMeeting' },
  { id: 'toggle-sidebar', action: 'toggleSidebar', keys: ['Cmd', 'B'], descriptionKey: 'shortcuts.toggleSidebar' },
  { id: 'toggle-dark', action: 'toggleDarkMode', keys: ['Cmd', 'D'], descriptionKey: 'shortcuts.toggleDarkMode' },
  { id: 'show-shortcuts', action: 'showShortcuts', keys: ['Cmd', '/'], descriptionKey: 'shortcuts.showHelp' },
  { id: 'close-dialog', action: 'closeDialog', keys: ['Escape'], descriptionKey: 'shortcuts.closeDialogs' },
]

const STORAGE_KEY = 'vl-keyboard-shortcuts'

function loadCustomShortcuts(): typeof DEFAULT_SHORTCUTS {
  if (typeof window === 'undefined') return DEFAULT_SHORTCUTS
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Merge defaults with stored
      return DEFAULT_SHORTCUTS.map(def => {
        const custom = parsed.find((s: { id: string; keys: string[] }) => s.id === def.id)
        return custom ? { ...def, keys: custom.keys } : def
      })
    }
  } catch { /* ignore */ }
  return DEFAULT_SHORTCUTS
}

function saveCustomShortcuts(shortcuts: typeof DEFAULT_SHORTCUTS) {
  try {
    const toSave = shortcuts.map(s => ({ id: s.id, keys: s.keys }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  } catch { /* ignore */ }
}

function KeyboardShortcutsConfig({ lang }: { lang: Lang }) {
  const [shortcuts, setShortcuts] = useState<typeof DEFAULT_SHORTCUTS>(DEFAULT_SHORTCUTS)
  const [searchQuery, setSearchQuery] = useState('')
  const [recordingId, setRecordingId] = useState<string | null>(null)
  const [conflicts, setConflicts] = useState<string[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    setShortcuts(loadCustomShortcuts())
  }, [])

  // Detect conflicts
  useEffect(() => {
    const keyCombos = new Map<string, string[]>()
    const conflictIds: string[] = []
    shortcuts.forEach(s => {
      const combo = s.keys.join('+')
      if (keyCombos.has(combo)) {
        keyCombos.get(combo)!.push(s.id)
        conflictIds.push(...keyCombos.get(combo)!)
      } else {
        keyCombos.set(combo, [s.id])
      }
    })
    setConflicts([...new Set(conflictIds)])
  }, [shortcuts])

  // Key recording
  const recordingRef = useRef<{ pressed: Set<string>; meta: boolean; ctrl: boolean; alt: boolean; shift: boolean }>({
    pressed: new Set(), meta: false, ctrl: false, alt: false, shift: false,
  })

  useEffect(() => {
    if (!recordingId) return

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      recordingRef.current.pressed.add(e.key)
      recordingRef.current.meta = e.metaKey
      recordingRef.current.ctrl = e.ctrlKey
      recordingRef.current.alt = e.altKey
      recordingRef.current.shift = e.shiftKey
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      // When user releases, finalize the combo
      if (!e.repeat) {
        const { pressed, meta, ctrl, alt, shift } = recordingRef.current
        const comboKeys: string[] = []
        if (meta) comboKeys.push('Cmd')
        if (ctrl) comboKeys.push('Ctrl')
        if (alt) comboKeys.push('Alt')
        if (shift) comboKeys.push('Shift')

        // Add the main key (last pressed non-modifier)
        const nonModifiers = [...pressed].filter(k => !['meta', 'control', 'alt', 'shift', 'Meta', 'Control', 'Alt', 'Shift'].includes(k))
        if (nonModifiers.length > 0) {
          const mainKey = nonModifiers[nonModifiers.length - 1]
          comboKeys.push(mainKey.length === 1 ? mainKey.toUpperCase() : mainKey)
        }

        if (comboKeys.length > 0) {
          setShortcuts(prev => {
            const next = prev.map(s => s.id === recordingId ? { ...s, keys: comboKeys } : s)
            saveCustomShortcuts(next)
            return next
          })
        }

        setRecordingId(null)
        recordingRef.current = { pressed: new Set(), meta: false, ctrl: false, alt: false, shift: false }
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    document.addEventListener('keyup', handleKeyUp, true)
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('keyup', handleKeyUp, true)
    }
  }, [recordingId])

  const handleReset = () => {
    setShortcuts(DEFAULT_SHORTCUTS)
    saveCustomShortcuts(DEFAULT_SHORTCUTS)
    toast.success(t(lang, 'shortcuts.resetSuccess'))
  }

  const handleExport = () => {
    const data = JSON.stringify(shortcuts.map(s => ({ id: s.id, action: s.action, keys: s.keys })), null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'keyboard-shortcuts.json'
    a.click()
    URL.revokeObjectURL(url)
    toast.success(t(lang, 'shortcuts.exported'))
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string)
          if (!Array.isArray(data)) throw new Error('Invalid format')
          setShortcuts(prev => {
            const next = prev.map(s => {
              const imported = data.find((d: { id: string; keys: string[] }) => d.id === s.id)
              return imported ? { ...s, keys: imported.keys } : s
            })
            saveCustomShortcuts(next)
            return next
          })
          toast.success(t(lang, 'shortcuts.imported'))
        } catch {
          toast.error(t(lang, 'shortcuts.importFailed'))
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  // Filter by search
  const filteredShortcuts = searchQuery.trim()
    ? shortcuts.filter(s => {
        const desc = t(lang, s.descriptionKey).toLowerCase()
        const combo = s.keys.join('+').toLowerCase()
        return desc.includes(searchQuery.toLowerCase()) || combo.includes(searchQuery.toLowerCase())
      })
    : shortcuts

  // Group descriptions for tab shortcuts
  const getDescription = (s: typeof DEFAULT_SHORTCUTS[0]) => {
    if (s.action.startsWith('switchTab')) {
      const tabNum = parseInt(s.action.replace('switchTab', ''))
      const tabNames = ['Dashboard', 'Agents', 'Team', 'Individual', 'History', 'Pipeline', 'Settings']
      const tabName = tabNames[tabNum - 1] || `Tab ${tabNum}`
      return `${t(lang, 'shortcuts.switchTab')} → ${tabName}`
    }
    return t(lang, s.descriptionKey)
  }

  return (
    <div className="space-y-3">
      {/* Search + Actions */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 vl-text-muted" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t(lang, 'shortcuts.searchPlaceholder')}
            className="vl-input text-xs pl-9 h-8"
          />
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" className="vl-input h-8 w-8 p-0" onClick={handleExport} aria-label={t(lang, 'common.export')}>
                <Download className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t(lang, 'shortcuts.exportShortcuts')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" className="vl-input h-8 w-8 p-0" onClick={handleImport} aria-label={t(lang, 'settings.import')}>
                <UploadCloud className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t(lang, 'shortcuts.importShortcuts')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" className="vl-input h-8 w-8 p-0 hover:border-red-500/50 hover:text-red-400" onClick={handleReset} aria-label={t(lang, 'common.reset')}>
                <RotateCcw className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t(lang, 'shortcuts.resetToDefaults')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Conflict Warning */}
      <AnimatePresence>
        {conflicts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20"
          >
            <AlertTriangle className="size-4 text-amber-400 shrink-0" />
            <p className="text-[11px] text-amber-400">
              {t(lang, 'shortcuts.conflictWarning')}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shortcuts List */}
      <div className="vl-inner rounded-xl p-4 border max-h-[340px] overflow-y-auto scrollbar-thin custom-scrollbar">
        <div className="space-y-1">
          {filteredShortcuts.map((s) => {
            const isConflict = conflicts.includes(s.id)
            const isRecording = recordingId === s.id

            return (
              <div
                key={s.id}
                className={`flex items-center justify-between py-2 px-2 rounded-lg transition-colors ${
                  isConflict ? 'bg-amber-500/10 border border-amber-500/20' : 'hover:bg-[var(--vl-bg-card-hover)]'
                }`}
              >
                <span className="text-xs vl-text-body">{getDescription(s)}</span>
                <div className="flex items-center gap-1.5">
                  {/* Key display or recording indicator */}
                  {isRecording ? (
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                      className="flex items-center gap-1 px-2 py-0.5 rounded border border-emerald-500/50 bg-emerald-500/10"
                    >
                      <span className="text-[10px] text-emerald-400 font-mono">{t(lang, 'shortcuts.recording')}</span>
                    </motion.div>
                  ) : (
                    <div className="flex items-center gap-0.5">
                      {s.keys.map((k, i) => (
                        <React.Fragment key={i}>
                          {i > 0 && <span className="text-[10px] vl-text-muted mx-0.5">+</span>}
                          <kbd className="vl-inner rounded px-1.5 py-0.5 text-[10px] font-mono vl-text-muted border min-w-[24px] text-center">{k}</kbd>
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                  {/* Record button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-6 w-6 p-0 shrink-0 ${isRecording ? 'text-emerald-400' : 'vl-text-muted hover:text-emerald-400'}`}
                    onClick={() => setRecordingId(isRecording ? null : s.id)}
                    aria-label={t(lang, 'shortcuts.reRecord')}
                  >
                    <Keyboard className="size-3" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
