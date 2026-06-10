'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  FileJson, FileSpreadsheet, FileText, FileDown, FileType,
  Presentation, Loader2, CheckCircle2, AlertCircle, Download,
  ChevronRight, Clock, Trash2,
} from 'lucide-react'
import type { Lang } from '@/lib/i18n'
import { t } from '@/lib/i18n'

// ============================================================
// Types
// ============================================================

type ExportFormat = 'json' | 'csv' | 'markdown' | 'pdf' | 'docx' | 'pptx'
type ExportType = 'meeting' | 'agent' | 'analytics' | 'comparison'

interface ExportOptions {
  includeMessages: boolean
  includeSummary: boolean
  includeAnalytics: boolean
}

interface ExportRecord {
  id: string
  format: ExportFormat
  exportType: ExportType
  filename: string
  timestamp: number
  status: 'success' | 'error'
}

interface ExportDialogEnhancedProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lang: Lang
  // Contextual data
  meetingId?: string
  meetingName?: string
  agentId?: string
  agentName?: string
  comparisonIds?: string[]
  // Default export type
  defaultType?: ExportType
}

// ============================================================
// Format definitions
// ============================================================

const FORMATS: { id: ExportFormat; label: string; icon: React.ElementType; color: string; description: string }[] = [
  { id: 'json', label: 'JSON', icon: FileJson, color: 'text-cyan-400', description: 'Structured data format' },
  { id: 'csv', label: 'CSV', icon: FileSpreadsheet, color: 'text-amber-400', description: 'Spreadsheet compatible' },
  { id: 'markdown', label: 'Markdown', icon: FileText, color: 'text-gray-400', description: 'Plain text markup' },
  { id: 'pdf', label: 'PDF', icon: FileType, color: 'text-red-400', description: 'Print-ready report' },
  { id: 'docx', label: 'DOCX', icon: FileDown, color: 'text-blue-400', description: 'Word document' },
  { id: 'pptx', label: 'PPTX', icon: Presentation, color: 'text-orange-400', description: 'Presentation slides' },
]

// ============================================================
// Export History (localStorage-based)
// ============================================================

const STORAGE_KEY = 'vl-export-history'
const MAX_HISTORY = 20

function loadExportHistory(): ExportRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveExportRecord(record: ExportRecord) {
  try {
    const history = loadExportHistory()
    history.unshift(record)
    if (history.length > MAX_HISTORY) history.pop()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  } catch { /* ignore */ }
}

function clearExportHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch { /* ignore */ }
}

// ============================================================
// Main Component
// ============================================================

export function ExportDialogEnhanced({
  open,
  onOpenChange,
  lang,
  meetingId,
  meetingName,
  agentId,
  agentName,
  comparisonIds,
  defaultType = 'meeting',
}: ExportDialogEnhancedProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('docx')
  const [exportType, setExportType] = useState<ExportType>(defaultType)
  const [options, setOptions] = useState<ExportOptions>({
    includeMessages: true,
    includeSummary: true,
    includeAnalytics: true,
  })
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [history, setHistory] = useState<ExportRecord[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const abortRef = useRef(false)

  // Load history on mount
  useEffect(() => {
    if (open) {
      setHistory(loadExportHistory())
      setShowHistory(false)
    }
  }, [open])

  // Update export type based on context
  useEffect(() => {
    if (meetingId) setExportType('meeting')
    else if (agentId) setExportType('agent')
    else if (comparisonIds && comparisonIds.length > 0) setExportType('comparison')
    else setExportType(defaultType)
  }, [meetingId, agentId, comparisonIds, defaultType])

  const toggleOption = useCallback((key: keyof ExportOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const getContextLabel = useCallback(() => {
    switch (exportType) {
      case 'meeting': return meetingName || 'Meeting'
      case 'agent': return agentName || 'Agent'
      case 'analytics': return 'Analytics'
      case 'comparison': return 'Comparison'
    }
  }, [exportType, meetingName, agentName])

  // Determine available formats based on type
  const getAvailableFormats = useCallback(() => {
    if (exportType === 'meeting') return FORMATS
    if (exportType === 'agent') return FORMATS.filter((f) => ['json', 'csv', 'docx', 'pptx'].includes(f.id))
    if (exportType === 'analytics') return FORMATS.filter((f) => ['json', 'csv', 'docx', 'pptx'].includes(f.id))
    if (exportType === 'comparison') return FORMATS.filter((f) => ['json', 'csv', 'docx'].includes(f.id))
    return FORMATS
  }, [exportType])

  const handleExport = useCallback(async () => {
    setExporting(true)
    setProgress(0)
    abortRef.current = false

    let filename = `${getContextLabel().replace(/\s+/g, '_')}_${selectedFormat}`

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 15, 90))
      }, 300)

      if (selectedFormat === 'docx') {
        const body: Record<string, unknown> = { type: exportType, options }
        if (meetingId) body.meetingId = meetingId
        if (agentId) body.ids = [agentId]
        if (comparisonIds) body.ids = comparisonIds

        const res = await fetch('/api/export/docx', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error('DOCX export failed')
        const disposition = res.headers.get('Content-Disposition')
        if (disposition) {
          const match = disposition.match(/filename="?(.+?)"?$/)
          if (match) filename = match[1]
        }
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
      } else if (selectedFormat === 'pptx') {
        const body: Record<string, unknown> = { type: exportType, options }
        if (meetingId) body.meetingId = meetingId
        if (agentId) body.ids = [agentId]
        if (comparisonIds) body.ids = comparisonIds

        const res = await fetch('/api/export/pptx', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error('PPTX export failed')
        const disposition = res.headers.get('Content-Disposition')
        if (disposition) {
          const match = disposition.match(/filename="?(.+?)"?$/)
          if (match) filename = match[1]
        }
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
      } else if (selectedFormat === 'pdf') {
        if (!meetingId) throw new Error('PDF export requires a meeting')
        window.open(`/api/export/pdf?meetingId=${meetingId}`, '_blank')
      } else if (selectedFormat === 'markdown') {
        const mdContent = `# Virtual Lab Export\n\nGenerated: ${new Date().toISOString()}\nExport: ${getContextLabel()}\nFormat: Markdown\n`
        const blob = new Blob([mdContent], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${getContextLabel().replace(/\s+/g, '_')}.md`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        // JSON or CSV via existing GET endpoint
        const params = new URLSearchParams({ type: exportType, format: selectedFormat })
        if (meetingId) params.set('meetingId', meetingId)
        const res = await fetch(`/api/export?${params.toString()}`)
        if (!res.ok) throw new Error(`${selectedFormat.toUpperCase()} export failed`)
        const disposition = res.headers.get('Content-Disposition')
        if (disposition) {
          const match = disposition.match(/filename="?(.+?)"?$/)
          if (match) filename = match[1]
        }
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
      }

      clearInterval(progressInterval)
      setProgress(100)

      // Save to history
      const record: ExportRecord = {
        id: Date.now().toString(),
        format: selectedFormat,
        exportType,
        filename,
        timestamp: Date.now(),
        status: 'success',
      }
      saveExportRecord(record)
      setHistory(loadExportHistory())

      toast.success(`Download complete — ${filename}`)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Export failed'
      toast.error(errorMsg)

      const record: ExportRecord = {
        id: Date.now().toString(),
        format: selectedFormat,
        exportType,
        filename,
        timestamp: Date.now(),
        status: 'error',
      }
      saveExportRecord(record)
    } finally {
      setTimeout(() => {
        setExporting(false)
        setProgress(0)
      }, 800)
    }
  }, [selectedFormat, exportType, options, meetingId, agentId, comparisonIds, getContextLabel])

  const handleClearHistory = useCallback(() => {
    clearExportHistory()
    setHistory([])
    toast.success('Export history cleared')
  }, [])

  const availableFormats = getAvailableFormats()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg vl-dialog border-l border-[var(--vl-border)] bg-[var(--vl-bg-primary)]"
      >
        <SheetHeader className="p-5 pb-0">
          <SheetTitle className="vl-text-heading text-lg flex items-center gap-2">
            <Download className="size-5 text-emerald-400" />
            Enhanced Export
          </SheetTitle>
          <SheetDescription className="vl-text-muted text-sm">
            Export {getContextLabel()} in your preferred format
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-5 py-4">
          <div className="space-y-6">
            {/* Format Selection */}
            <div className="space-y-3">
              <h3 className="vl-text-body text-sm font-semibold flex items-center gap-2">
                <FileDown className="size-4 text-emerald-400" />
                Format
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {availableFormats.map((fmt) => {
                  const isSelected = selectedFormat === fmt.id
                  return (
                    <button
                      key={fmt.id}
                      onClick={() => setSelectedFormat(fmt.id)}
                      className={`
                        relative flex items-center gap-3 rounded-lg p-3 text-left transition-all
                        border ${
                          isSelected
                            ? 'border-emerald-500/50 bg-emerald-500/10 shadow-lg shadow-emerald-500/5'
                            : 'border-[var(--vl-border-subtle)] bg-[var(--vl-bg-card)] hover:border-[var(--vl-border)] hover:bg-[var(--vl-bg-card-hover)]'
                        }
                      `}
                    >
                      <fmt.icon className={`size-5 shrink-0 ${isSelected ? 'text-emerald-400' : fmt.color}`} />
                      <div className="min-w-0">
                        <div className={`text-xs font-semibold ${isSelected ? 'text-emerald-300' : 'vl-text-body'}`}>
                          {fmt.label}
                        </div>
                        <div className="text-[10px] vl-text-muted truncate">{fmt.description}</div>
                      </div>
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5">
                          <CheckCircle2 className="size-3.5 text-emerald-400" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <Separator className="bg-[var(--vl-border-subtle)]" />

            {/* Export Type */}
            <div className="space-y-3">
              <h3 className="vl-text-body text-sm font-semibold flex items-center gap-2">
                <ChevronRight className="size-4 text-emerald-400" />
                Export Type
              </h3>
              <div className="flex gap-2 flex-wrap">
                {(['meeting', 'agent', 'analytics', 'comparison'] as ExportType[]).map((type) => {
                  const disabled = type === 'meeting' && !meetingId
                    || type === 'agent' && !agentId
                    || type === 'comparison' && (!comparisonIds || comparisonIds.length < 2)
                  return (
                    <Badge
                      key={type}
                      variant={exportType === type ? 'default' : 'outline'}
                      className={`
                        cursor-pointer text-xs px-3 py-1.5 capitalize transition-all
                        ${exportType === type
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                          : disabled
                            ? 'opacity-30 cursor-not-allowed'
                            : 'hover:bg-[var(--vl-bg-card-hover)] border-[var(--vl-border-subtle)]'
                        }
                      `}
                      onClick={() => !disabled && setExportType(type)}
                    >
                      {type}
                    </Badge>
                  )
                })}
              </div>
            </div>

            <Separator className="bg-[var(--vl-border-subtle)]" />

            {/* Content Options */}
            {(exportType === 'meeting') && (
              <div className="space-y-3">
                <h3 className="vl-text-body text-sm font-semibold flex items-center gap-2">
                  <FileText className="size-4 text-emerald-400" />
                  Include Content
                </h3>
                <div className="space-y-2.5">
                  {([
                    { key: 'includeMessages' as const, label: 'Discussion Messages', desc: 'Full transcript with rounds' },
                    { key: 'includeSummary' as const, label: 'Meeting Summary', desc: 'AI-generated summary' },
                    { key: 'includeAnalytics' as const, label: 'Analytics', desc: 'Participation statistics' },
                  ]).map((opt) => (
                    <label
                      key={opt.key}
                      className="flex items-start gap-3 cursor-pointer group p-2 rounded-lg hover:bg-[var(--vl-bg-card-hover)] transition-colors"
                    >
                      <Checkbox
                        checked={options[opt.key]}
                        onCheckedChange={() => toggleOption(opt.key)}
                        className="mt-0.5 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                      />
                      <div>
                        <div className="vl-text-body text-xs font-medium group-hover:text-emerald-300 transition-colors">
                          {opt.label}
                        </div>
                        <div className="text-[10px] vl-text-muted">{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Preview */}
            <div className="space-y-3">
              <h3 className="vl-text-body text-sm font-semibold flex items-center gap-2">
                <Eye className="size-4 text-emerald-400" />
                Preview
              </h3>
              <div className="rounded-lg border border-[var(--vl-border-subtle)] bg-[var(--vl-bg-card)] p-3">
                <div className="text-[10px] vl-text-muted mb-2">Export summary</div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="vl-text-muted">Type</span>
                    <span className="vl-text-body capitalize">{exportType}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="vl-text-muted">Format</span>
                    <span className="vl-text-body font-medium">{selectedFormat.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="vl-text-muted">Target</span>
                    <span className="vl-text-body truncate ml-4">{getContextLabel()}</span>
                  </div>
                  {exportType === 'meeting' && (
                    <>
                      <div className="flex justify-between text-xs">
                        <span className="vl-text-muted">Messages</span>
                        <span className="vl-text-body">{options.includeMessages ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="vl-text-muted">Summary</span>
                        <span className="vl-text-body">{options.includeSummary ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="vl-text-muted">Analytics</span>
                        <span className="vl-text-body">{options.includeAnalytics ? 'Yes' : 'No'}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <Separator className="bg-[var(--vl-border-subtle)]" />

            {/* Export History */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="vl-text-body text-sm font-semibold flex items-center gap-2 hover:text-emerald-300 transition-colors"
                >
                  <Clock className="size-4 text-emerald-400" />
                  Export History
                  <ChevronRight className={`size-3.5 vl-text-muted transition-transform ${showHistory ? 'rotate-90' : ''}`} />
                </button>
                {history.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="text-[10px] vl-text-muted hover:text-red-400 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="size-3" />
                    Clear
                  </button>
                )}
              </div>

              {showHistory && (
                <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                  {history.length === 0 ? (
                    <div className="text-xs vl-text-muted text-center py-4">No export history yet</div>
                  ) : (
                    history.map((record) => {
                      const formatDef = FORMATS.find((f) => f.id === record.format)
                      const Icon = formatDef?.icon || FileJson
                      return (
                        <div
                          key={record.id}
                          className="flex items-center gap-2.5 rounded-lg p-2 bg-[var(--vl-bg-card)] border border-[var(--vl-border-subtle)]"
                        >
                          <Icon className="size-3.5 text-emerald-400 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-[10px] vl-text-body font-medium truncate">{record.filename}</div>
                            <div className="text-[9px] vl-text-muted capitalize">
                              {record.exportType} • {record.format.toUpperCase()} • {new Date(record.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                          {record.status === 'success' ? (
                            <CheckCircle2 className="size-3 text-emerald-400 shrink-0" />
                          ) : (
                            <AlertCircle className="size-3 text-red-400 shrink-0" />
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <SheetFooter className="p-5 pt-0 border-t border-[var(--vl-border-subtle)]">
          {exporting && (
            <div className="w-full mb-3">
              <Progress value={progress} className="h-1.5 bg-[var(--vl-bg-card)] [&>div]:bg-emerald-500" />
              <div className="text-[10px] vl-text-muted mt-1 text-center">
                {progress < 100 ? 'Generating...' : 'Complete!'}
              </div>
            </div>
          )}
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={exporting}
              className="flex-1 border-[var(--vl-border-subtle)] text-vl-text-muted hover:bg-[var(--vl-bg-card-hover)] hover:text-[var(--vl-text-white)]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={exporting}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              {exporting ? (
                <>
                  <Loader2 className="size-4 mr-1.5 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="size-4 mr-1.5" />
                  Export {selectedFormat.toUpperCase()}
                </>
              )}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ============================================================
// Quick Export Dropdown Button
// ============================================================

export function QuickExportDropdown({
  lang,
  meetingId,
  meetingName,
  onOpenDialog,
}: {
  lang: Lang
  meetingId?: string
  meetingName?: string
  onOpenDialog?: () => void
}) {
  return (
    <div className="flex items-center gap-1">
      {/* Quick action buttons */}
      <Button
        size="sm"
        variant="ghost"
        className="text-xs vl-text-muted hover:text-emerald-300 hover:bg-emerald-500/10"
        onClick={async () => {
          if (!meetingId) {
            toast.error('No meeting selected')
            return
          }
          try {
            const res = await fetch('/api/export/docx', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'meeting',
                meetingId,
                options: { includeMessages: true, includeSummary: true, includeAnalytics: true },
              }),
            })
            if (!res.ok) throw new Error('Export failed')
            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${(meetingName || 'meeting-report').replace(/\s+/g, '_')}.docx`
            a.click()
            URL.revokeObjectURL(url)
            toast.success('DOCX report exported')
          } catch {
            toast.error('Failed to export DOCX')
          }
        }}
      >
        <FileDown className="size-3.5 mr-1 text-blue-400" />
        Report
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="text-xs vl-text-muted hover:text-emerald-300 hover:bg-emerald-500/10"
        onClick={async () => {
          if (!meetingId) {
            toast.error('No meeting selected')
            return
          }
          try {
            const res = await fetch('/api/export/pptx', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'meeting',
                meetingId,
                options: { includeMessages: true, includeSummary: true, includeAnalytics: true },
              }),
            })
            if (!res.ok) throw new Error('Export failed')
            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${(meetingName || 'meeting-presentation').replace(/\s+/g, '_')}.pptx`
            a.click()
            URL.revokeObjectURL(url)
            toast.success('PPTX presentation exported')
          } catch {
            toast.error('Failed to export PPTX')
          }
        }}
      >
        <Presentation className="size-3.5 mr-1 text-orange-400" />
        Slides
      </Button>
      {onOpenDialog && (
        <Button
          size="sm"
          variant="ghost"
          className="text-xs vl-text-muted hover:text-emerald-300 hover:bg-emerald-500/10"
          onClick={onOpenDialog}
        >
          <Download className="size-3.5 mr-1 text-emerald-400" />
          More
        </Button>
      )}
    </div>
  )
}

// Eye icon for preview section
function Eye({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
