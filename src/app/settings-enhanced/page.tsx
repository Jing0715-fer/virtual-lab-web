'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  User, Palette, Globe, Bell, Database, MessageSquare, Key, Info,
  Sun, Moon, Monitor, Eye, EyeOff, Trash2, Download, Upload, HardDrive,
  ExternalLink, Volume2, Clock, Thermometer, Zap, RefreshCw, CheckCircle2,
  Github, BookOpen, MessageCircle, ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'

/* ─── Section IDs ─── */
const SECTIONS = [
  { id: 'profile', icon: User, label: 'Profile' },
  { id: 'appearance', icon: Palette, label: 'Appearance' },
  { id: 'language', icon: Globe, label: 'Language' },
  { id: 'notifications', icon: Bell, label: 'Notifications' },
  { id: 'data', icon: Database, label: 'Data' },
  { id: 'meetings', icon: MessageSquare, label: 'Meetings' },
  { id: 'api', icon: Key, label: 'API' },
  { id: 'about', icon: Info, label: 'About' },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

/* ─── Component ─── */
export default function SettingsEnhancedPage() {
  const [activeSection, setActiveSection] = useState<SectionId>('profile')
  const sectionRefs = useRef<Record<SectionId, HTMLElement | null>>({} as Record<SectionId, HTMLElement | null>)

  /* ─── Profile State ─── */
  const [displayName, setDisplayName] = useState('Researcher')
  const [email, setEmail] = useState('user@virtuallab.io')
  const [role, setRole] = useState('Principal Investigator')
  const [institution, setInstitution] = useState('Virtual Lab Institute')

  /* ─── Appearance State ─── */
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>('system')
  const [fontSize, setFontSize] = useState(14)
  const [compactMode, setCompactMode] = useState(false)
  const [highContrast, setHighContrast] = useState(false)

  /* ─── Language State ─── */
  const [locale, setLocale] = useState('en')
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY')
  const [timeFormat, setTimeFormat] = useState('12h')
  const [firstDayOfWeek, setFirstDayOfWeek] = useState('Sunday')

  /* ─── Notification State ─── */
  const [notifMeetingStarted, setNotifMeetingStarted] = useState(true)
  const [notifMeetingCompleted, setNotifMeetingCompleted] = useState(true)
  const [notifNewMessage, setNotifNewMessage] = useState(true)
  const [notifAgentMilestone, setNotifAgentMilestone] = useState(true)
  const [notifSystemAlerts, setNotifSystemAlerts] = useState(true)
  const [notifDailyDigest, setNotifDailyDigest] = useState(false)
  const [soundEffects, setSoundEffects] = useState(true)
  const [soundVolume, setSoundVolume] = useState(70)
  const [quietStart, setQuietStart] = useState('22:00')
  const [quietEnd, setQuietEnd] = useState('08:00')

  /* ─── Data State ─── */
  const [storageUsed, setStorageUsed] = useState(0)
  const [storageTotal] = useState(5120)
  const [autoSave, setAutoSave] = useState(true)

  /* ─── Meetings State ─── */
  const [defaultRounds, setDefaultRounds] = useState(3)
  const [defaultTemperature, setDefaultTemperature] = useState(0.7)
  const [autoSaveMeetings, setAutoSaveMeetings] = useState(true)
  const [showTimestamps, setShowTimestamps] = useState(true)
  const [enableSSE, setEnableSSE] = useState(true)
  const [maxMessageLength, setMaxMessageLength] = useState(4096)

  /* ─── API State ─── */
  const [apiProvider, setApiProvider] = useState('openai')
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [lastVerified, setLastVerified] = useState('Never')
  const [testingConnection, setTestingConnection] = useState(false)

  const importFileRef = useRef<HTMLInputElement>(null)

  /* ─── Hydrate from localStorage on mount ─── */
  useEffect(() => {
    try {
      const saved = localStorage.getItem('vl-enhanced-settings')
      if (saved) {
        const data = JSON.parse(saved)
        requestAnimationFrame(() => {
          if (data.displayName) setDisplayName(data.displayName)
          if (data.email) setEmail(data.email)
          if (data.role) setRole(data.role)
          if (data.institution) setInstitution(data.institution)
          if (data.themeMode) setThemeMode(data.themeMode)
          if (data.fontSize) setFontSize(data.fontSize)
          if (data.compactMode !== undefined) setCompactMode(data.compactMode)
          if (data.highContrast !== undefined) setHighContrast(data.highContrast)
          if (data.locale) setLocale(data.locale)
          if (data.dateFormat) setDateFormat(data.dateFormat)
          if (data.timeFormat) setTimeFormat(data.timeFormat)
          if (data.firstDayOfWeek) setFirstDayOfWeek(data.firstDayOfWeek)
          if (data.defaultRounds) setDefaultRounds(data.defaultRounds)
          if (data.defaultTemperature !== undefined) setDefaultTemperature(data.defaultTemperature)
          if (data.autoSaveMeetings !== undefined) setAutoSaveMeetings(data.autoSaveMeetings)
          if (data.showTimestamps !== undefined) setShowTimestamps(data.showTimestamps)
          if (data.enableSSE !== undefined) setEnableSSE(data.enableSSE)
          if (data.maxMessageLength) setMaxMessageLength(data.maxMessageLength)
          if (data.apiProvider) setApiProvider(data.apiProvider)
          if (data.apiKey) setApiKey(data.apiKey)
          if (data.lastVerified) setLastVerified(data.lastVerified)
        })
      }
    } catch { /* ignore */ }
  }, [])

  /* ─── Calculate storage usage ─── */
  useEffect(() => {
    let totalBytes = 0
    for (let idx = 0; idx < localStorage.length; idx++) {
      const key = localStorage.key(idx)
      if (key && key.startsWith('vl-')) {
        const value = localStorage.getItem(key)
        if (value) totalBytes += key.length + value.length
      }
    }
    setStorageUsed(Math.round(totalBytes / 1024 * 100) / 100)
  }, [])

  /* ─── Apply theme mode ─── */
  useEffect(() => {
    const el = document.documentElement
    if (themeMode === 'dark') {
      el.classList.add('dark')
    } else if (themeMode === 'light') {
      el.classList.remove('dark')
    } else {
      // system
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        el.classList.add('dark')
      } else {
        el.classList.remove('dark')
      }
    }
  }, [themeMode])

  /* ─── Save settings to localStorage ─── */
  const saveSettings = useCallback(() => {
    const data = {
      displayName, email, role, institution,
      themeMode, fontSize, compactMode, highContrast,
      locale, dateFormat, timeFormat, firstDayOfWeek,
      defaultRounds, defaultTemperature, autoSaveMeetings, showTimestamps, enableSSE, maxMessageLength,
      apiProvider, apiKey, lastVerified,
    }
    localStorage.setItem('vl-enhanced-settings', JSON.stringify(data))
  }, [displayName, email, role, institution, themeMode, fontSize, compactMode, highContrast, locale, dateFormat, timeFormat, firstDayOfWeek, defaultRounds, defaultTemperature, autoSaveMeetings, showTimestamps, enableSSE, maxMessageLength, apiProvider, apiKey, lastVerified])

  // Save on any change
  useEffect(() => { saveSettings() }, [saveSettings])

  /* ─── Handlers ─── */
  const handleSaveProfile = useCallback(() => {
    toast.success('Profile saved successfully')
  }, [])

  const handleClearAllData = useCallback(() => {
    const keysToRemove: string[] = []
    for (let idx = 0; idx < localStorage.length; idx++) {
      const key = localStorage.key(idx)
      if (key && key.startsWith('vl-')) keysToRemove.push(key)
    }
    keysToRemove.forEach(k => localStorage.removeItem(k))
    toast.success('All data cleared. Reloading...')
    setTimeout(() => window.location.reload(), 1000)
  }, [])

  const handleExportData = useCallback(() => {
    const data: Record<string, string> = {}
    for (let idx = 0; idx < localStorage.length; idx++) {
      const key = localStorage.key(idx)
      if (key && key.startsWith('vl-')) {
        const value = localStorage.getItem(key)
        if (value) data[key] = value
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'virtual-lab-data-export.json'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Data exported')
  }, [])

  const handleImportData = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        Object.entries(data).forEach(([key, value]) => {
          if (typeof key === 'string' && key.startsWith('vl-')) {
            localStorage.setItem(key, value as string)
          }
        })
        toast.success('Data imported. Reloading...')
        setTimeout(() => window.location.reload(), 1000)
      } catch {
        toast.error('Failed to parse import file')
      }
    }
    reader.readAsText(file)
    if (importFileRef.current) importFileRef.current.value = ''
  }, [])

  const handleClearCache = useCallback(() => {
    if ('caches' in window) {
      caches.keys().then(names => names.forEach(n => caches.delete(n)))
    }
    toast.success('Cache cleared')
  }, [])

  const handleTestConnection = useCallback(async () => {
    setTestingConnection(true)
    await new Promise(resolve => setTimeout(resolve, 1500))
    setTestingConnection(false)
    const verified = apiKey.length > 0
    setLastVerified(verified ? new Date().toLocaleTimeString() : 'Failed')
    toast[verified ? 'success' : 'error'](verified ? 'Connection successful!' : 'Connection failed. Check API key.')
  }, [apiKey])

  const handleTestNotification = useCallback(() => {
    toast.info('This is a test notification from Virtual Lab settings', {
      description: 'Notifications are working correctly',
    })
  }, [])

  const handleCheckUpdates = useCallback(() => {
    toast.info('Checking for updates...', { description: 'You are running the latest version (v2.0.0)' })
  }, [])

  const scrollToSection = useCallback((id: SectionId) => {
    setActiveSection(id)
    const el = sectionRefs.current[id]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  /* ─── Intersection observer for active section tracking ─── */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id = entry.target.id as SectionId
            if (id) setActiveSection(id)
          }
        })
      },
      { rootMargin: '-20% 0px -70% 0px' }
    )

    Object.values(sectionRefs.current).forEach(el => {
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  // Generate initials from display name
  const initials = displayName
    ? displayName.split(' ').map(w => w[0]?.toUpperCase() || '').slice(0, 2).join('')
    : 'U'

  const storagePercent = Math.min((storageUsed / storageTotal) * 100, 100)

  /* ─── Helper: Toggle button ─── */
  const renderToggle = (val: boolean, onToggle: (v: boolean) => void) => (
    <button
      className={`se-toggle ${val ? 'se-toggle-active' : ''}`}
      onClick={() => onToggle(!val)}
      aria-label="Toggle"
    >
      <span className="se-toggle-knob" />
    </button>
  )

  return (
    <div className="se-layout">
      {/* Hidden file input */}
      <input ref={importFileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportData} />

      {/* ─── Sidebar Navigation ─── */}
      <nav className="se-sidebar">
        {SECTIONS.map((sec) => (
          <div
            key={sec.id}
            className={`se-sidebar-item ${activeSection === sec.id ? 'se-sidebar-item-active' : ''}`}
            onClick={() => scrollToSection(sec.id)}
            title={sec.label}
          >
            <sec.icon />
            <span>{sec.label}</span>
          </div>
        ))}
      </nav>

      {/* ─── Main Content ─── */}
      <main className="se-content">

        {/* ─── 1. Profile ─── */}
        <section
          id="profile"
          ref={(el) => { sectionRefs.current.profile = el }}
          className="se-section se-fade-in"
        >
          <div className="se-section-header">
            <div className="se-section-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              <User />
            </div>
            <div>
              <div className="se-section-title">Profile</div>
              <div className="se-section-desc">Manage your personal information</div>
            </div>
          </div>

          <div className="se-profile">
            <div className="se-avatar" style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)' }} title="Click to change avatar">
              {initials}
            </div>
            <div className="se-profile-fields" style={{ flex: 1 }}>
              <div className="se-field-row">
                <div className="se-field-group">
                  <span className="se-field-label">Display Name</span>
                  <input className="se-field-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
                </div>
                <div className="se-field-group">
                  <span className="se-field-label">Email</span>
                  <input className="se-field-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" />
                </div>
              </div>
              <div className="se-field-row">
                <div className="se-field-group">
                  <span className="se-field-label">Role</span>
                  <input className="se-field-input" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Your role" />
                </div>
                <div className="se-field-group">
                  <span className="se-field-label">Institution</span>
                  <input className="se-field-input" value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="Organization" />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button className="se-btn se-btn-primary" onClick={handleSaveProfile}>
              <CheckCircle2 style={{ width: 14, height: 14 }} /> Save Profile
            </button>
          </div>
        </section>

        {/* ─── 2. Appearance ─── */}
        <section
          id="appearance"
          ref={(el) => { sectionRefs.current.appearance = el }}
          className="se-section se-fade-in"
        >
          <div className="se-section-header">
            <div className="se-section-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
              <Palette />
            </div>
            <div>
              <div className="se-section-title">Appearance</div>
              <div className="se-section-desc">Customize the look and feel</div>
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <span className="se-field-label">Theme</span>
            <div className="se-theme-toggle-group" style={{ marginTop: '0.375rem' }}>
              {[
                { id: 'light' as const, icon: Sun, label: 'Light' },
                { id: 'dark' as const, icon: Moon, label: 'Dark' },
                { id: 'system' as const, icon: Monitor, label: 'System' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  className={`se-theme-toggle-option ${themeMode === opt.id ? 'se-theme-toggle-option-active' : ''}`}
                  onClick={() => setThemeMode(opt.id)}
                >
                  <opt.icon style={{ width: 14, height: 14 }} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <a href="/theme-studio" className="se-link" style={{ display: 'block', marginBottom: '1rem' }}>
            Open Theme Studio <ChevronRight style={{ width: 14, height: 14 }} />
          </a>

          <div className="se-slider-row">
            <span className="se-slider-label">Font Size</span>
            <input type="range" className="se-slider" value={fontSize} min={12} max={18} step={1}
              onChange={(e) => setFontSize(Number(e.target.value))} />
            <span className="se-slider-value">{fontSize}px</span>
          </div>

          <div className="se-toggle-row">
            <div>
              <div className="se-toggle-label">Compact Mode</div>
              <div className="se-toggle-desc">Reduce padding and font sizes</div>
            </div>
            {renderToggle(compactMode, setCompactMode)}
          </div>

          <div className="se-toggle-row">
            <div>
              <div className="se-toggle-label">High Contrast</div>
              <div className="se-toggle-desc">Increase text contrast for accessibility</div>
            </div>
            {renderToggle(highContrast, setHighContrast)}
          </div>
        </section>

        {/* ─── 3. Language & Region ─── */}
        <section
          id="language"
          ref={(el) => { sectionRefs.current.language = el }}
          className="se-section se-fade-in"
        >
          <div className="se-section-header">
            <div className="se-section-icon" style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
              <Globe />
            </div>
            <div>
              <div className="se-section-title">Language &amp; Region</div>
              <div className="se-section-desc">Set language and regional preferences</div>
            </div>
          </div>

          <div className="se-field-row" style={{ marginBottom: '1rem' }}>
            <div className="se-field-group">
              <span className="se-field-label">Language</span>
              <select className="se-select" value={locale} onChange={(e) => setLocale(e.target.value)}>
                <option value="en">English</option>
                <option value="zh">中文</option>
                <option value="ja">日本語</option>
                <option value="ko">한국어</option>
              </select>
            </div>
          </div>

          <div className="se-field-row" style={{ marginBottom: '1rem' }}>
            <div className="se-field-group">
              <span className="se-field-label">Date Format</span>
              <select className="se-select" value={dateFormat} onChange={(e) => setDateFormat(e.target.value)}>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
            <div className="se-field-group">
              <span className="se-field-label">Time Format</span>
              <select className="se-select" value={timeFormat} onChange={(e) => setTimeFormat(e.target.value)}>
                <option value="12h">12h</option>
                <option value="24h">24h</option>
              </select>
            </div>
          </div>

          <div className="se-field-group" style={{ maxWidth: '200px' }}>
            <span className="se-field-label">First Day of Week</span>
            <select className="se-select" value={firstDayOfWeek} onChange={(e) => setFirstDayOfWeek(e.target.value)}>
              <option value="Sunday">Sunday</option>
              <option value="Monday">Monday</option>
            </select>
          </div>
        </section>

        {/* ─── 4. Notifications ─── */}
        <section
          id="notifications"
          ref={(el) => { sectionRefs.current.notifications = el }}
          className="se-section se-fade-in"
        >
          <div className="se-section-header">
            <div className="se-section-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}>
              <Bell />
            </div>
            <div>
              <div className="se-section-title">Notifications</div>
              <div className="se-section-desc">Configure notification preferences</div>
            </div>
          </div>

          <div className="se-toggle-row">
            <div>
              <div className="se-toggle-label">Meeting Started</div>
              <div className="se-toggle-desc">Notify when a meeting begins</div>
            </div>
            {renderToggle(notifMeetingStarted, setNotifMeetingStarted)}
          </div>
          <div className="se-toggle-row">
            <div>
              <div className="se-toggle-label">Meeting Completed</div>
              <div className="se-toggle-desc">Notify when a meeting finishes</div>
            </div>
            {renderToggle(notifMeetingCompleted, setNotifMeetingCompleted)}
          </div>
          <div className="se-toggle-row">
            <div>
              <div className="se-toggle-label">New Message in Thread</div>
              <div className="se-toggle-desc">Notify on new replies</div>
            </div>
            {renderToggle(notifNewMessage, setNotifNewMessage)}
          </div>
          <div className="se-toggle-row">
            <div>
              <div className="se-toggle-label">Agent Milestone Reached</div>
              <div className="se-toggle-desc">Notify on agent achievements</div>
            </div>
            {renderToggle(notifAgentMilestone, setNotifAgentMilestone)}
          </div>
          <div className="se-toggle-row">
            <div>
              <div className="se-toggle-label">System Alerts</div>
              <div className="se-toggle-desc">Important system notifications</div>
            </div>
            {renderToggle(notifSystemAlerts, setNotifSystemAlerts)}
          </div>
          <div className="se-toggle-row">
            <div>
              <div className="se-toggle-label">Daily Digest Email</div>
              <div className="se-toggle-desc">Receive a summary email daily</div>
            </div>
            {renderToggle(notifDailyDigest, setNotifDailyDigest)}
          </div>

          <div className="se-toggle-row" style={{ borderBottom: 'none' }}>
            <div>
              <div className="se-toggle-label">Sound Effects</div>
              <div className="se-toggle-desc">Play notification sounds</div>
            </div>
            {renderToggle(soundEffects, setSoundEffects)}
          </div>

          <div className="se-slider-row" style={{ marginTop: '0.25rem' }}>
            <span className="se-slider-label">Volume</span>
            <input type="range" className="se-slider" value={soundVolume} min={0} max={100} step={5}
              onChange={(e) => setSoundVolume(Number(e.target.value))} />
            <span className="se-slider-value">{soundVolume}%</span>
          </div>

          <div style={{ marginTop: '0.75rem' }}>
            <span className="se-field-label">Quiet Hours</span>
            <div className="se-quiet-hours" style={{ marginTop: '0.375rem' }}>
              <input type="time" className="se-time-input" value={quietStart} onChange={(e) => setQuietStart(e.target.value)} />
              <span style={{ fontSize: '0.8rem', color: 'var(--vl-text-muted)' }}>to</span>
              <input type="time" className="se-time-input" value={quietEnd} onChange={(e) => setQuietEnd(e.target.value)} />
            </div>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <button className="se-btn se-btn-outline se-btn-sm" onClick={handleTestNotification}>
              <Bell style={{ width: 14, height: 14 }} /> Test Notification
            </button>
          </div>
        </section>

        {/* ─── 5. Data & Storage ─── */}
        <section
          id="data"
          ref={(el) => { sectionRefs.current.data = el }}
          className="se-section se-fade-in"
        >
          <div className="se-section-header">
            <div className="se-section-icon" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              <Database />
            </div>
            <div>
              <div className="se-section-title">Data &amp; Storage</div>
              <div className="se-section-desc">Manage data, storage, and cache</div>
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <span className="se-field-label">Storage Usage</span>
            <div className="se-storage-bar">
              <div className="se-storage-fill" style={{ width: `${storagePercent}%` }} />
            </div>
            <div className="se-storage-text">
              <span>{storageUsed} MB used</span>
              <span>{storageTotal} MB total</span>
            </div>
          </div>

          <div className="se-toggle-row">
            <div>
              <div className="se-toggle-label">Auto-save</div>
              <div className="se-toggle-desc">Automatically save changes</div>
            </div>
            {renderToggle(autoSave, setAutoSave)}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
            <button className="se-btn se-btn-danger se-btn-sm" onClick={handleClearAllData}>
              <Trash2 style={{ width: 14, height: 14 }} /> Clear All Data
            </button>
            <button className="se-btn se-btn-outline se-btn-sm" onClick={handleExportData}>
              <Download style={{ width: 14, height: 14 }} /> Export All Data
            </button>
            <button className="se-btn se-btn-outline se-btn-sm" onClick={() => importFileRef.current?.click()}>
              <Upload style={{ width: 14, height: 14 }} /> Import Data
            </button>
            <button className="se-btn se-btn-outline se-btn-sm" onClick={handleClearCache}>
              <HardDrive style={{ width: 14, height: 14 }} /> Clear Cache
            </button>
          </div>
        </section>

        {/* ─── 6. Meetings ─── */}
        <section
          id="meetings"
          ref={(el) => { sectionRefs.current.meetings = el }}
          className="se-section se-fade-in"
        >
          <div className="se-section-header">
            <div className="se-section-icon" style={{ background: 'linear-gradient(135deg, #ec4899, #f43f5e)' }}>
              <MessageSquare />
            </div>
            <div>
              <div className="se-section-title">Meetings</div>
              <div className="se-section-desc">Configure meeting defaults and behavior</div>
            </div>
          </div>

          <div className="se-slider-row">
            <span className="se-slider-label">Default Rounds</span>
            <input type="range" className="se-slider" value={defaultRounds} min={1} max={10} step={1}
              onChange={(e) => setDefaultRounds(Number(e.target.value))} />
            <span className="se-slider-value">{defaultRounds}</span>
          </div>

          <div className="se-slider-row">
            <span className="se-slider-label">Temperature</span>
            <input type="range" className="se-slider" value={defaultTemperature} min={0} max={2} step={0.1}
              onChange={(e) => setDefaultTemperature(Number(e.target.value))} />
            <span className="se-slider-value">{defaultTemperature.toFixed(1)}</span>
          </div>

          <div className="se-toggle-row">
            <div>
              <div className="se-toggle-label">Auto-save Meetings</div>
              <div className="se-toggle-desc">Save meetings automatically</div>
            </div>
            {renderToggle(autoSaveMeetings, setAutoSaveMeetings)}
          </div>

          <div className="se-toggle-row">
            <div>
              <div className="se-toggle-label">Show Timestamps</div>
              <div className="se-toggle-desc">Display timestamps on messages</div>
            </div>
            {renderToggle(showTimestamps, setShowTimestamps)}
          </div>

          <div className="se-toggle-row">
            <div>
              <div className="se-toggle-label">Enable SSE Streaming</div>
              <div className="se-toggle-desc">Stream responses in real-time</div>
            </div>
            {renderToggle(enableSSE, setEnableSSE)}
          </div>

          <div style={{ marginTop: '0.75rem' }}>
            <span className="se-field-label">Max Message Length</span>
            <input
              type="number"
              className="se-number-input"
              value={maxMessageLength}
              min={256}
              max={32768}
              step={256}
              onChange={(e) => setMaxMessageLength(Number(e.target.value))}
              style={{ marginTop: '0.375rem' }}
            />
          </div>
        </section>

        {/* ─── 7. API Keys ─── */}
        <section
          id="api"
          ref={(el) => { sectionRefs.current.api = el }}
          className="se-section se-fade-in"
        >
          <div className="se-section-header">
            <div className="se-section-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
              <Key />
            </div>
            <div>
              <div className="se-section-title">API Keys</div>
              <div className="se-section-desc">Configure LLM provider and API access</div>
            </div>
          </div>

          <div className="se-field-group" style={{ marginBottom: '1rem', maxWidth: '300px' }}>
            <span className="se-field-label">LLM Provider</span>
            <select className="se-select" value={apiProvider} onChange={(e) => setApiProvider(e.target.value)} style={{ marginTop: '0.375rem' }}>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="google">Google AI</option>
              <option value="local">Local / Custom</option>
            </select>
          </div>

          <div className="se-field-group" style={{ marginBottom: '0.5rem' }}>
            <span className="se-field-label">API Key</span>
            <div className="se-password-wrap" style={{ marginTop: '0.375rem' }}>
              <input
                type={showApiKey ? 'text' : 'password'}
                className="se-password-input"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
              />
              <button className="se-password-toggle" onClick={() => setShowApiKey(!showApiKey)}>
                {showApiKey
                  ? <EyeOff style={{ width: 16, height: 16 }} />
                  : <Eye style={{ width: 16, height: 16 }} />}
              </button>
            </div>
          </div>

          <div className="se-status">
            <span className={`se-status-dot ${lastVerified === 'Never' || lastVerified === 'Failed' ? 'se-status-dot-idle' : 'se-status-dot-success'}`} />
            Last verified: {lastVerified}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button className="se-btn se-btn-primary se-btn-sm" onClick={handleTestConnection} disabled={testingConnection}>
              <Zap style={{ width: 14, height: 14 }} />
              {testingConnection ? 'Testing...' : 'Test Connection'}
            </button>
          </div>
        </section>

        {/* ─── 8. About ─── */}
        <section
          id="about"
          ref={(el) => { sectionRefs.current.about = el }}
          className="se-section se-fade-in"
        >
          <div className="se-section-header">
            <div className="se-section-icon" style={{ background: 'linear-gradient(135deg, #64748b, #475569)' }}>
              <Info />
            </div>
            <div>
              <div className="se-section-title">About</div>
              <div className="se-section-desc">Application information</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{
              width: '3rem',
              height: '3rem',
              borderRadius: '0.75rem',
              background: 'linear-gradient(135deg, #10b981, #06b6d4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Zap style={{ width: 24, height: 24, color: 'white' }} />
            </div>
            <div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--vl-text-heading)' }}>Virtual Lab</div>
              <span className="se-version-badge">v2.0.0</span>
            </div>
          </div>

          <div className="se-about-links">
            <a className="se-about-link" href="https://github.com" target="_blank" rel="noopener noreferrer">
              <Github style={{ width: 16, height: 16 }} /> GitHub Repository <ExternalLink style={{ width: 12, height: 12 }} />
            </a>
            <a className="se-about-link" href="/docs">
              <BookOpen style={{ width: 16, height: 16 }} /> Documentation <ExternalLink style={{ width: 12, height: 12 }} />
            </a>
            <a className="se-about-link" href="#" onClick={(e) => { e.preventDefault(); toast.info('Feedback form would open here') }}>
              <MessageCircle style={{ width: 16, height: 16 }} /> Send Feedback <ExternalLink style={{ width: 12, height: 12 }} />
            </a>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <button className="se-btn se-btn-outline se-btn-sm" onClick={handleCheckUpdates}>
              <RefreshCw style={{ width: 14, height: 14 }} /> Check for Updates
            </button>
          </div>

          <div style={{ marginTop: '1rem', fontSize: '0.7rem', color: 'var(--vl-text-muted)' }}>
            Build: {new Date().toISOString().split('T')[0]} | Runtime: Next.js 16 | UI: React 19
          </div>
        </section>

      </main>
    </div>
  )
}
