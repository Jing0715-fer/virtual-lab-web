'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { Download, Upload, Trash2, Database, Clock, HardDrive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

// ============================================================
// Constants
// ============================================================

const PERSISTENCE_KEY = 'vl-data-persistence'
const AUTO_BACKUP_INTERVAL = 30_000 // 30 seconds

interface PersistedState {
  agents: unknown[]
  meetings: unknown[]
  pipelines: unknown[]
  preferences: {
    theme?: string
    language?: string
    shortcuts?: unknown
  }
  lastBackupAt: string
}

// ============================================================
// useDataPersistence Hook
// ============================================================

export function useDataPersistence(options: {
  agents: unknown[]
  meetings: unknown[]
  pipelines: unknown[]
  lang: Lang
  preferences?: { theme?: string; language?: string; shortcuts?: unknown }
}) {
  const { agents, meetings, pipelines, lang, preferences } = options
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null)
  const [autoBackup, setAutoBackup] = useState(true)
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastSaveRef = useRef<string>('')

  // Load last backup time from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PERSISTENCE_KEY)
      if (stored) {
        const data: PersistedState = JSON.parse(stored)
        requestAnimationFrame(() => { setLastBackupAt(data.lastBackupAt || null) })
      }
    } catch { /* ignore */ }
  }, [])

  // Check for saved state on mount — offer restore
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PERSISTENCE_KEY)
      if (stored) {
        const data: PersistedState = JSON.parse(stored)
        if (data.agents?.length || data.meetings?.length || data.pipelines?.length) {
          // Offer restore via toast
          toast(t(lang, 'dataPersistence.restoreAvailable'), {
            action: {
              label: t(lang, 'dataPersistence.restore'),
              onClick: () => {
                try {
                  if (data.agents?.length) {
                    localStorage.setItem('vl-agents', JSON.stringify(data.agents))
                  }
                  if (data.meetings?.length) {
                    localStorage.setItem('vl-meetings', JSON.stringify(data.meetings))
                  }
                  if (data.pipelines?.length) {
                    localStorage.setItem('vl-pipelines', JSON.stringify(data.pipelines))
                  }
                  if (data.preferences) {
                    localStorage.setItem('vl-preferences', JSON.stringify(data.preferences))
                  }
                  toast.success('Data restored! Refreshing...')
                  setTimeout(() => window.location.reload(), 1000)
                } catch {
                  toast.error('Failed to restore data')
                }
              },
            },
            duration: 10_000,
          })
        }
      }
    } catch { /* ignore */ }
  }, [])

  // Auto-save debounced
  const performSave = useCallback(() => {
    try {
      const state: PersistedState = {
        agents,
        meetings,
        pipelines,
        preferences: preferences || {},
        lastBackupAt: new Date().toISOString(),
      }
      const serialized = JSON.stringify(state)
      // Don't save if nothing changed
      if (serialized === lastSaveRef.current) return
      lastSaveRef.current = serialized
      localStorage.setItem(PERSISTENCE_KEY, serialized)
      setLastBackupAt(state.lastBackupAt)
    } catch { /* storage full or other error */ }
  }, [agents, meetings, pipelines, preferences])

  useEffect(() => {
    if (!autoBackup) {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current)
        autoSaveTimerRef.current = null
      }
      return
    }

    autoSaveTimerRef.current = setInterval(performSave, AUTO_BACKUP_INTERVAL)
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current)
      }
    }
  }, [autoBackup, performSave])

  // Export data as JSON file download
  const exportData = useCallback(() => {
    try {
      const state: PersistedState = {
        agents,
        meetings,
        pipelines,
        preferences: preferences || {},
        lastBackupAt: new Date().toISOString(),
      }
      const json = JSON.stringify(state, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const date = new Date().toISOString().split('T')[0]
      a.download = `virtual-lab-backup-${date}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(t(lang, 'dataPersistence.export') + ' ✓')
    } catch {
      toast.error('Export failed')
    }
  }, [agents, meetings, pipelines, preferences, lang])

  // Import data from a JSON file
  const importData = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const content = ev.target?.result as string
        const data = JSON.parse(content) as PersistedState

        if (data.agents) localStorage.setItem('vl-agents', JSON.stringify(data.agents))
        if (data.meetings) localStorage.setItem('vl-meetings', JSON.stringify(data.meetings))
        if (data.pipelines) localStorage.setItem('vl-pipelines', JSON.stringify(data.pipelines))
        if (data.preferences) localStorage.setItem('vl-preferences', JSON.stringify(data.preferences))

        // Update our backup state
        const state: PersistedState = {
          agents: data.agents || [],
          meetings: data.meetings || [],
          pipelines: data.pipelines || [],
          preferences: data.preferences || {},
          lastBackupAt: new Date().toISOString(),
        }
        localStorage.setItem(PERSISTENCE_KEY, JSON.stringify(state))
        setLastBackupAt(state.lastBackupAt)

        toast.success(t(lang, 'dataPersistence.import') + ' ✓')
        setTimeout(() => window.location.reload(), 1000)
      } catch {
        toast.error('Failed to import data')
      }
    }
    reader.readAsText(file)
  }, [lang])

  // Clear all persisted data
  const clearData = useCallback(() => {
    try {
      localStorage.removeItem(PERSISTENCE_KEY)
      // Also clear vl-* keys
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('vl-')) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k))
      setLastBackupAt(null)
      lastSaveRef.current = ''
      toast.success('All data cleared')
    } catch {
      toast.error('Failed to clear data')
    }
  }, [])

  return {
    lastBackupAt,
    autoBackup,
    setAutoBackup,
    exportData,
    importData,
    clearData,
  }
}

// ============================================================
// Helper: estimate localStorage usage
// ============================================================

function getStorageUsage(): string {
  let total = 0
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key) {
      total += key.length + (localStorage.getItem(key)?.length || 0)
    }
  }
  // Convert to human-readable
  const bytes = total * 2 // UTF-16 encoding (2 bytes per char)
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

// ============================================================
// DataPersistencePanel Component
// ============================================================

export function DataPersistencePanel({
  lang,
  lastBackupAt,
  autoBackup,
  setAutoBackup,
  onExport,
  onImport,
  onClear,
}: {
  lang: Lang
  lastBackupAt: string | null
  autoBackup: boolean
  setAutoBackup: (v: boolean) => void
  onExport: () => void
  onImport: (file: File) => void
  onClear: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <div className="space-y-4">
      {/* Storage usage */}
      <div className="vl-inner rounded-xl p-4 border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <HardDrive className="size-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-medium vl-text-heading">{t(lang, 'dataPersistence.storageUsed')}</p>
            <p className="text-[10px] vl-text-muted">{getStorageUsage()}</p>
          </div>
        </div>
        {lastBackupAt && (
          <div className="flex items-center gap-1.5 text-[10px] vl-text-muted">
            <Clock className="size-3" />
            {new Date(lastBackupAt).toLocaleString()}
          </div>
        )}
      </div>

      {/* Auto-backup toggle */}
      <div className="vl-inner rounded-xl p-4 border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/20 flex items-center justify-center">
            <Database className="size-4 text-cyan-400" />
          </div>
          <div>
            <p className="text-sm font-medium vl-text-heading">{t(lang, 'dataPersistence.autoBackup')}</p>
            <p className="text-[10px] vl-text-muted">
              {autoBackup ? 'Every 30s' : 'Disabled'}
            </p>
          </div>
        </div>
        <button
          role="switch"
          aria-checked={autoBackup}
          aria-label={t(lang, 'dataPersistence.autoBackup')}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${autoBackup ? 'bg-emerald-500' : 'bg-[var(--vl-chart-axis-line)]'}`}
          onClick={() => setAutoBackup(!autoBackup)}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white transition-transform duration-200 shadow-sm ${autoBackup ? 'translate-x-6' : 'translate-x-1'}`}
          />
        </button>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="vl-input text-xs h-auto py-2.5 flex flex-col items-center gap-1.5"
          onClick={onExport}
        >
          <Download className="size-3.5 text-emerald-400" />
          <span>{t(lang, 'dataPersistence.export')}</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="vl-input text-xs h-auto py-2.5 flex flex-col items-center gap-1.5"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="size-3.5 text-cyan-400" />
          <span>{t(lang, 'dataPersistence.import')}</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="vl-input text-xs h-auto py-2.5 flex flex-col items-center gap-1.5 text-red-400 border-red-500/30 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-300"
          onClick={() => {
            if (showConfirm) {
              onClear()
              setShowConfirm(false)
            } else {
              setShowConfirm(true)
              setTimeout(() => setShowConfirm(false), 3000)
            }
          }}
        >
          <Trash2 className="size-3.5 text-red-400" />
          <span>{showConfirm ? t(lang, 'dataPersistence.confirmClear') : t(lang, 'dataPersistence.clear')}</span>
        </Button>
      </div>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onImport(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
