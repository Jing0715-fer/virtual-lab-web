'use client'

import React, { useState, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download, FileJson, FileSpreadsheet, FileText, FileCode,
  Calendar, ChevronRight, CheckCircle2, Loader2, X,
  BarChart3, Users, MessageSquare, GitBranch,
  Eye, Settings2, Archive, Image,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { Agent, Meeting } from './shared-types'

// ============================================================
// Types
// ============================================================
type ExportFormat = 'json' | 'csv' | 'markdown' | 'html'
type ExportTab = 'meetings' | 'agents' | 'analytics' | 'pipeline'
type ReportTemplate = 'executive' | 'detailed' | 'agent-report' | 'custom'

interface DateRange {
  from: string
  to: string
}

// ============================================================
// Format selection helpers
// ============================================================
const FORMAT_OPTIONS: { value: ExportFormat; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'json', label: 'JSON', icon: FileJson, color: '#06b6d4' },
  { value: 'csv', label: 'CSV', icon: FileSpreadsheet, color: '#10b981' },
  { value: 'markdown', label: 'Markdown', icon: FileText, color: '#8b5cf6' },
  { value: 'html', label: 'HTML Report', icon: FileCode, color: '#f59e0b' },
]

const TEMPLATE_OPTIONS: { value: ReportTemplate; labelKey: string; descriptionKey: string; icon: React.ElementType; color: string }[] = [
  { value: 'executive', labelKey: 'export.template.executive', descriptionKey: 'export.template.executive.desc', icon: BarChart3, color: '#10b981' },
  { value: 'detailed', labelKey: 'export.template.detailed', descriptionKey: 'export.template.detailed.desc', icon: MessageSquare, color: '#06b6d4' },
  { value: 'agent-report', labelKey: 'export.template.agentReport', descriptionKey: 'export.template.agentReport.desc', icon: Users, color: '#f59e0b' },
  { value: 'custom', labelKey: 'export.template.custom', descriptionKey: 'export.template.custom.desc', icon: Settings2, color: '#8b5cf6' },
]

// ============================================================
// Data conversion utilities
// ============================================================
function meetingsToJson(meetings: Meeting[]): string {
  return JSON.stringify(meetings.map(m => ({
    id: m.id,
    type: m.type,
    agenda: m.agenda,
    saveName: m.saveName,
    status: m.status,
    temperature: m.temperature,
    numRounds: m.numRounds,
    summary: m.summary,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
    messages: (m.messages || []).map(msg => ({
      agentName: msg.agentName,
      message: msg.message.substring(0, 200),
      roundIndex: msg.roundIndex,
    })),
  })), null, 2)
}

function meetingsToCsv(meetings: Meeting[]): string {
  const headers = ['ID', 'Type', 'Name', 'Status', 'Temperature', 'Rounds', 'Messages', 'Created', 'Updated']
  const rows = meetings.map(m => [
    m.id,
    m.type,
    `"${(m.saveName || '').replace(/"/g, '""')}"`,
    m.status,
    String(m.temperature),
    String(m.numRounds || ''),
    String((m.messages || []).length),
    m.createdAt,
    m.updatedAt,
  ].join(','))
  return [headers.join(','), ...rows].join('\n')
}

function meetingsToMarkdown(meetings: Meeting[]): string {
  let md = '# Meeting Export\n\n'
  meetings.forEach(m => {
    md += `## ${m.saveName || 'Untitled'}\n\n`
    md += `- **Type**: ${m.type}\n`
    md += `- **Status**: ${m.status}\n`
    md += `- **Temperature**: ${m.temperature}\n`
    md += `- **Rounds**: ${m.numRounds || 'N/A'}\n`
    md += `- **Created**: ${m.createdAt}\n\n`
    if (m.agenda) md += `### Agenda\n\n${m.agenda}\n\n`
    if (m.summary) md += `### Summary\n\n${m.summary}\n\n`
    const msgs = m.messages || []
    if (msgs.length > 0) {
      md += `### Discussion (${msgs.length} messages)\n\n`
      msgs.forEach(msg => {
        md += `**${msg.agentName}** (Round ${msg.roundIndex + 1}):\n\n> ${msg.message.substring(0, 300)}\n\n`
      })
    }
    md += '---\n\n'
  })
  return md
}

function meetingsToHtml(meetings: Meeting[], template: ReportTemplate): string {
  const now = new Date().toISOString()
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Virtual Lab - Export Report</title>
<style>
  body { font-family: 'Georgia', serif; max-width: 900px; margin: 0 auto; padding: 40px 20px; color: #1a202c; background: #fff; }
  h1 { color: #10b981; border-bottom: 2px solid #10b981; padding-bottom: 8px; }
  h2 { color: #1e293b; margin-top: 2em; }
  h3 { color: #475569; }
  .meta { color: #64748b; font-size: 0.9em; margin-bottom: 1em; }
  .summary { background: #f0fdf4; border-left: 4px solid #10b981; padding: 12px 16px; margin: 16px 0; border-radius: 4px; }
  .message { background: #f8fafc; padding: 10px 14px; margin: 8px 0; border-radius: 6px; border: 1px solid #e2e8f0; }
  .agent-name { font-weight: 600; color: #06b6d4; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 0.75em; font-weight: 600; }
  .badge-draft { background: #f1f5f9; color: #64748b; }
  .badge-running { background: #fffbeb; color: #d97706; }
  .badge-completed { background: #f0fdf4; color: #16a34a; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
  th { background: #f8fafc; font-weight: 600; }
  .toc a { color: #10b981; text-decoration: none; }
  .toc a:hover { text-decoration: underline; }
  @media print { body { max-width: 100%; } }
</style>
</head>
<body>
<h1>🔬 Virtual Lab Report</h1>
<p class="meta">Generated: ${now} | Template: ${template} | Total meetings: ${meetings.length}</p>
`

  if (template === 'executive') {
    html += `<h2>Executive Summary</h2>
<p>This report covers ${meetings.length} meetings with ${meetings.reduce((s, m) => s + (m.messages || []).length, 0)} total messages.</p>
<table>
<tr><th>Name</th><th>Type</th><th>Status</th><th>Messages</th></tr>
${meetings.map(m => `<tr><td>${m.saveName || 'Untitled'}</td><td>${m.type}</td><td><span class="badge badge-${m.status}">${m.status}</span></td><td>${(m.messages || []).length}</td></tr>`).join('\n')}
</table>
`
  }

  meetings.forEach(m => {
    html += `<h2>${m.saveName || 'Untitled'}</h2>
<div class="meta">
  Type: <strong>${m.type}</strong> | Status: <span class="badge badge-${m.status}">${m.status}</span> | Temperature: ${m.temperature} | Rounds: ${m.numRounds || 'N/A'}
</div>
`
    if (m.summary) {
      html += `<div class="summary"><strong>Summary:</strong> ${m.summary}</div>\n`
    }
    const msgs = m.messages || []
    if (msgs.length > 0 && template !== 'executive') {
      html += `<h3>Discussion (${msgs.length} messages)</h3>\n`
      msgs.forEach(msg => {
        html += `<div class="message"><span class="agent-name">${msg.agentName}</span> <span style="font-size:0.8em;color:#94a3b8">(Round ${msg.roundIndex + 1})</span><p>${msg.message.substring(0, 500)}</p></div>\n`
      })
    }
  })

  html += `</body></html>`
  return html
}

function agentsToJson(agents: Agent[]): string {
  return JSON.stringify(agents.map(a => ({
    id: a.id,
    title: a.title,
    expertise: a.expertise,
    goal: a.goal,
    role: a.role,
    model: a.model,
    color: a.color,
    icon: a.icon,
  })), null, 2)
}

function agentsToCsv(agents: Agent[]): string {
  const headers = ['ID', 'Title', 'Expertise', 'Goal', 'Role', 'Model', 'Color', 'Icon']
  const rows = agents.map(a => [
    a.id,
    `"${a.title.replace(/"/g, '""')}"`,
    `"${a.expertise.replace(/"/g, '""')}"`,
    `"${a.goal.replace(/"/g, '""')}"`,
    `"${a.role.replace(/"/g, '""')}"`,
    a.model,
    a.color,
    a.icon,
  ].join(','))
  return [headers.join(','), ...rows].join('\n')
}

// ============================================================
// Preview Table
// ============================================================
function PreviewTable({ data, columns, maxRows = 10 }: { data: Record<string, string>[]; columns: string[]; maxRows?: number }) {
  const displayData = data.slice(0, maxRows)
  return (
    <div className="overflow-x-auto custom-scrollbar max-h-48 overflow-y-auto">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-[var(--vl-border)]">
            {columns.map(col => (
              <th key={col} className="text-left py-1.5 px-2 vl-text-muted font-medium whitespace-nowrap">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayData.map((row, i) => (
            <tr key={i} className="border-b border-[var(--vl-border-subtle)] hover:bg-[var(--vl-bg-inner)]">
              {columns.map(col => (
                <td key={col} className="py-1 px-2 vl-text-body max-w-[200px] truncate">{row[col] || ''}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > maxRows && (
        <div className="text-[10px] vl-text-muted text-center py-1">
          Showing {maxRows} of {data.length} rows
        </div>
      )}
    </div>
  )
}

// ============================================================
// Custom Template Builder
// ============================================================
function CustomTemplateBuilder({ sections, onToggleSection, lang }: {
  sections: { id: string; labelKey: string; checked: boolean }[]
  onToggleSection: (id: string) => void
  lang: Lang
}) {
  return (
    <div className="space-y-2">
      {sections.map(section => (
        <div key={section.id} className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-[var(--vl-bg-inner)] transition-colors">
          <Checkbox
            checked={section.checked}
            onCheckedChange={() => onToggleSection(section.id)}
            className="border-[var(--vl-border)]"
          />
          <Label className="text-xs vl-text-body cursor-pointer">{t(lang, section.labelKey)}</Label>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// Chart Export Section
// ============================================================
function ChartExportSection({ lang }: { lang: Lang }) {
  const chartExportRef = useRef<HTMLDivElement>(null)

  const handleExportSvg = useCallback(() => {
    // Find any SVG element on the page and export it
    const svgElement = document.querySelector('.recharts-surface') as SVGElement | null
    if (!svgElement) {
      return
    }
    const svgData = new XMLSerializer().serializeToString(svgElement)
    const blob = new Blob([svgData], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'chart.svg'
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const handleExportPng = useCallback(() => {
    const svgElement = document.querySelector('.recharts-surface') as SVGElement | null
    if (!svgElement) return

    const svgData = new XMLSerializer().serializeToString(svgElement)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = document.createElement('img')
    img.onload = () => {
      canvas.width = img.width * 2
      canvas.height = img.height * 2
      ctx.scale(2, 2)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, img.width, img.height)
      ctx.drawImage(img, 0, 0)
      canvas.toBlob(blob => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'chart.png'
        a.click()
        URL.revokeObjectURL(url)
      }, 'image/png')
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }, [])

  return (
    <div className="space-y-3">
      <p className="text-xs vl-text-muted">{t(lang, 'export.chart.description')}</p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="border-[var(--vl-border)] vl-text-body hover:bg-[var(--vl-bg-inner)] text-xs h-7 gap-1.5"
          onClick={handleExportSvg}
        >
          <Image className="size-3" />
          SVG
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-[var(--vl-border)] vl-text-body hover:bg-[var(--vl-bg-inner)] text-xs h-7 gap-1.5"
          onClick={handleExportPng}
        >
          <Image className="size-3" />
          PNG
        </Button>
      </div>
    </div>
  )
}

// ============================================================
// Main ExportDialog
// ============================================================
interface ExportDialogProps {
  agents: Agent[]
  meetings: Meeting[]
  lang: Lang
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExportDialog({ agents, meetings, lang, open, onOpenChange }: ExportDialogProps) {
  const [activeTab, setActiveTab] = useState<ExportTab>('meetings')
  const [format, setFormat] = useState<ExportFormat>('json')
  const [template, setTemplate] = useState<ReportTemplate>('executive')
  const [dateRange, setDateRange] = useState<DateRange>({ from: '', to: '' })
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [exportComplete, setExportComplete] = useState(false)

  // Custom template sections
  const [customSections, setCustomSections] = useState([
    { id: 'summary', labelKey: 'export.section.summary', checked: true },
    { id: 'agenda', labelKey: 'export.section.agenda', checked: true },
    { id: 'messages', labelKey: 'export.section.messages', checked: true },
    { id: 'participants', labelKey: 'export.section.participants', checked: true },
    { id: 'metrics', labelKey: 'export.section.metrics', checked: false },
  ])

  const toggleCustomSection = useCallback((id: string) => {
    setCustomSections(prev => prev.map(s => s.id === id ? { ...s, checked: !s.checked } : s))
  }, [])

  // Filter meetings by date range
  const filteredMeetings = useMemo(() => {
    let result = [...meetings]
    if (dateRange.from) {
      const from = new Date(dateRange.from).getTime()
      result = result.filter(m => new Date(m.createdAt).getTime() >= from)
    }
    if (dateRange.to) {
      const to = new Date(dateRange.to).getTime()
      result = result.filter(m => new Date(m.createdAt).getTime() <= to)
    }
    return result
  }, [meetings, dateRange])

  // Preview data based on active tab
  const previewData = useMemo(() => {
    switch (activeTab) {
      case 'meetings':
        return filteredMeetings.map(m => ({
          Name: m.saveName || 'Untitled',
          Type: m.type,
          Status: m.status,
          Messages: String((m.messages || []).length),
          Created: new Date(m.createdAt).toLocaleDateString(),
        }))
      case 'agents':
        return agents.map(a => ({
          Title: a.title,
          Expertise: a.expertise.substring(0, 30),
          Model: a.model,
          Color: a.color,
        }))
      case 'analytics':
        return filteredMeetings.map(m => ({
          Meeting: m.saveName || 'Untitled',
          Type: m.type,
          Messages: String((m.messages || []).length),
          Rounds: String(m.numRounds || ''),
        }))
      case 'pipeline':
        return filteredMeetings.slice(0, 5).map(m => ({
          Name: m.saveName || 'Untitled',
          Status: m.status,
          Progress: m.status === 'completed' ? '100%' : m.status === 'running' ? '50%' : '0%',
        }))
      default:
        return []
    }
  }, [activeTab, filteredMeetings, agents])

  const previewColumns = previewData.length > 0 ? Object.keys(previewData[0]) : []

  // Execute export
  const handleExport = useCallback(async () => {
    setExporting(true)
    setProgress(0)
    setExportComplete(false)

    // Simulate progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval)
          return 95
        }
        return prev + Math.random() * 15
      })
    }, 200)

    // Small delay to simulate processing
    await new Promise(resolve => setTimeout(resolve, 800))

    let content = ''
    let filename = ''
    let mimeType = ''

    try {
      switch (activeTab) {
        case 'meetings': {
          switch (format) {
            case 'json':
              content = meetingsToJson(filteredMeetings)
              filename = 'meetings-export.json'
              mimeType = 'application/json'
              break
            case 'csv':
              content = meetingsToCsv(filteredMeetings)
              filename = 'meetings-export.csv'
              mimeType = 'text/csv'
              break
            case 'markdown':
              content = meetingsToMarkdown(filteredMeetings)
              filename = 'meetings-export.md'
              mimeType = 'text/markdown'
              break
            case 'html':
              content = meetingsToHtml(filteredMeetings, template)
              filename = 'meetings-report.html'
              mimeType = 'text/html'
              break
          }
          break
        }
        case 'agents': {
          switch (format) {
            case 'json':
              content = agentsToJson(agents)
              filename = 'agents-export.json'
              mimeType = 'application/json'
              break
            case 'csv':
              content = agentsToCsv(agents)
              filename = 'agents-export.csv'
              mimeType = 'text/csv'
              break
            case 'markdown':
              content = `# Agents Export\n\n${agents.map(a => `## ${a.title}\n\n- **Expertise**: ${a.expertise}\n- **Goal**: ${a.goal}\n- **Role**: ${a.role}\n- **Model**: ${a.model}\n`).join('\n---\n\n')}`
              filename = 'agents-export.md'
              mimeType = 'text/markdown'
              break
            case 'html':
              content = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Agent Report</title><style>body{font-family:Georgia,serif;max-width:900px;margin:0 auto;padding:40px;color:#1a202c}h1{color:#10b981;border-bottom:2px solid #10b981}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:8px 12px;border-bottom:1px solid #e2e8f0}th{background:#f8fafc}</style></head><body><h1>Agent Report</h1><table><tr><th>Name</th><th>Expertise</th><th>Model</th></tr>${agents.map(a => `<tr><td>${a.title}</td><td>${a.expertise}</td><td>${a.model}</td></tr>`).join('')}</table></body></html>`
              filename = 'agents-report.html'
              mimeType = 'text/html'
              break
          }
          break
        }
        case 'analytics': {
          const analyticsData = {
            totalMeetings: filteredMeetings.length,
            totalMessages: filteredMeetings.reduce((s, m) => s + (m.messages || []).length, 0),
            teamMeetings: filteredMeetings.filter(m => m.type === 'team').length,
            individualMeetings: filteredMeetings.filter(m => m.type === 'individual').length,
            agents: agents.length,
          }
          content = JSON.stringify(analyticsData, null, 2)
          filename = 'analytics-export.json'
          mimeType = 'application/json'
          break
        }
        case 'pipeline': {
          const pipelineData = filteredMeetings.map(m => ({
            name: m.saveName || 'Untitled',
            type: m.type,
            status: m.status,
            progress: m.status === 'completed' ? 100 : m.status === 'running' ? 50 : 0,
          }))
          content = JSON.stringify(pipelineData, null, 2)
          filename = 'pipeline-export.json'
          mimeType = 'application/json'
          break
        }
      }

      // Download file
      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setProgress(100)
      clearInterval(interval)
      setExportComplete(true)
    } catch {
      clearInterval(interval)
      setProgress(0)
    } finally {
      setExporting(false)
    }
  }, [activeTab, format, template, filteredMeetings, agents])

  // Batch export all tabs
  const handleBatchExport = useCallback(async () => {
    setExporting(true)
    setProgress(0)
    setExportComplete(false)

    const steps = [
      { name: 'Meetings', fn: () => meetingsToJson(filteredMeetings), filename: 'meetings.json' },
      { name: 'Agents', fn: () => agentsToJson(agents), filename: 'agents.json' },
      { name: 'Analytics', fn: () => JSON.stringify({ totalMeetings: filteredMeetings.length, totalMessages: filteredMeetings.reduce((s, m) => s + (m.messages || []).length, 0) }, null, 2), filename: 'analytics.json' },
    ]

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      const content = step.fn()
      const blob = new Blob([content], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = step.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setProgress(((i + 1) / steps.length) * 100)
      await new Promise(r => setTimeout(r, 500))
    }

    setExportComplete(true)
    setExporting(false)
  }, [filteredMeetings, agents])

  const resetState = useCallback(() => {
    setProgress(0)
    setExportComplete(false)
    setExporting(false)
  }, [])

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetState(); onOpenChange(v) }}>
      <DialogContent className="vl-dialog border max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="vl-text-heading text-lg font-semibold flex items-center gap-2">
            <Download className="size-5 text-emerald-400" />
            {t(lang, 'export.title')}
          </DialogTitle>
          <DialogDescription className="vl-text-muted text-sm">
            {t(lang, 'export.description')}
          </DialogDescription>
        </DialogHeader>

        {/* Tab-based data selection */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ExportTab)} className="w-full">
          <TabsList className="vl-inner w-full grid grid-cols-4 h-9">
            <TabsTrigger value="meetings" className="text-xs vl-text-body data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <MessageSquare className="size-3 mr-1" />
              {t(lang, 'export.tab.meetings')}
            </TabsTrigger>
            <TabsTrigger value="agents" className="text-xs vl-text-body data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Users className="size-3 mr-1" />
              {t(lang, 'export.tab.agents')}
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs vl-text-body data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <BarChart3 className="size-3 mr-1" />
              {t(lang, 'export.tab.analytics')}
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="text-xs vl-text-body data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <GitBranch className="size-3 mr-1" />
              {t(lang, 'export.tab.pipeline')}
            </TabsTrigger>
          </TabsList>

          {/* Content for each tab */}
          <div className="mt-4 space-y-4">
            {/* Format Selection */}
            <div className="space-y-2">
              <Label className="text-xs vl-text-label font-medium">{t(lang, 'export.format')}</Label>
              <div className="grid grid-cols-4 gap-2">
                {FORMAT_OPTIONS.map(opt => {
                  const Icon = opt.icon
                  return (
                    <button
                      key={opt.value}
                      className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border transition-all duration-200 ${
                        format === opt.value
                          ? 'border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_12px_rgba(16,185,129,0.1)]'
                          : 'border-[var(--vl-border)] vl-inner hover:border-[var(--vl-border-accent)]'
                      }`}
                      onClick={() => setFormat(opt.value)}
                    >
                      <Icon className="size-4" style={{ color: opt.color }} />
                      <span className="text-[10px] font-medium vl-text-heading">{opt.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Report Template (only for HTML format) */}
            {format === 'html' && (
              <div className="space-y-2">
                <Label className="text-xs vl-text-label font-medium">{t(lang, 'export.template')}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {TEMPLATE_OPTIONS.map(opt => {
                    const Icon = opt.icon
                    return (
                      <button
                        key={opt.value}
                        className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all duration-200 ${
                          template === opt.value
                            ? 'border-emerald-500/50 bg-emerald-500/10'
                            : 'border-[var(--vl-border)] vl-inner hover:border-[var(--vl-border-accent)]'
                        }`}
                        onClick={() => setTemplate(opt.value)}
                      >
                        <div
                          className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                          style={{ background: `${opt.color}20` }}
                        >
                          <Icon className="size-3.5" style={{ color: opt.color }} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[11px] font-medium vl-text-heading">{t(lang, opt.labelKey)}</div>
                          <div className="text-[9px] vl-text-muted truncate">{t(lang, opt.descriptionKey)}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Custom Template Builder (only for custom template) */}
            {format === 'html' && template === 'custom' && (
              <div className="vl-inner rounded-lg p-3 space-y-1">
                <Label className="text-xs vl-text-label font-medium">{t(lang, 'export.template.custom.sections')}</Label>
                <CustomTemplateBuilder sections={customSections} onToggleSection={toggleCustomSection} lang={lang} />
              </div>
            )}

            {/* Date Range Filter */}
            {(activeTab === 'meetings' || activeTab === 'analytics') && (
              <div className="space-y-2">
                <Label className="text-xs vl-text-label font-medium">{t(lang, 'export.dateRange')}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                    className="vl-input text-xs h-8 rounded-lg"
                  />
                  <span className="text-xs vl-text-muted">→</span>
                  <Input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                    className="vl-input text-xs h-8 rounded-lg"
                  />
                  {(dateRange.from || dateRange.to) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs vl-text-muted hover:text-[var(--vl-text-white)]"
                      onClick={() => setDateRange({ from: '', to: '' })}
                    >
                      <X className="size-3" />
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Preview */}
            <div className="space-y-2">
              <Label className="text-xs vl-text-label font-medium flex items-center gap-1.5">
                <Eye className="size-3" />
                {t(lang, 'export.preview')}
              </Label>
              <div className="vl-inner rounded-lg p-3">
                {previewData.length > 0 ? (
                  <PreviewTable data={previewData} columns={previewColumns} />
                ) : (
                  <div className="text-center py-6">
                    <p className="text-xs vl-text-muted">{t(lang, 'common.noData')}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Chart Export */}
            <div className="space-y-2">
              <Label className="text-xs vl-text-label font-medium flex items-center gap-1.5">
                <BarChart3 className="size-3" />
                {t(lang, 'export.chart.title')}
              </Label>
              <div className="vl-inner rounded-lg p-3">
                <ChartExportSection lang={lang} />
              </div>
            </div>
          </div>
        </Tabs>

        {/* Progress bar */}
        <AnimatePresence>
          {exporting && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs vl-text-body">{t(lang, 'export.exporting')}</span>
                <span className="text-xs vl-text-muted">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success message */}
        <AnimatePresence>
          {exportComplete && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30"
            >
              <CheckCircle2 className="size-4 text-emerald-400" />
              <span className="text-xs text-emerald-400 font-medium">{t(lang, 'export.success')}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <DialogFooter className="flex-row gap-2 sm:justify-between">
          <Button
            variant="outline"
            size="sm"
            className="border-[var(--vl-border)] vl-text-body hover:bg-[var(--vl-bg-inner)] text-xs gap-1.5"
            onClick={handleBatchExport}
            disabled={exporting}
          >
            <Archive className="size-3.5" />
            {t(lang, 'export.batchExport')}
          </Button>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 min-w-[120px]"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                {t(lang, 'export.exporting')}
              </>
            ) : (
              <>
                <Download className="size-3.5" />
                {t(lang, 'export.download')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
