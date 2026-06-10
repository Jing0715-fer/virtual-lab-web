'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Download, FileText, FileJson, BookOpen, Users, Bot,
  Copy, Check, Eye, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { Meeting } from './shared-components'

// ============================================================
// Export Format Types
// ============================================================

type ExportFormat = 'meeting-report' | 'meeting-summary' | 'json' | 'bibliography' | 'agent-report'

interface ExportOption {
  id: ExportFormat
  icon: React.ElementType
  title: string
  description: string
}

const EXPORT_OPTIONS: Record<Lang, ExportOption[]> = {
  en: [
    { id: 'meeting-report', icon: FileText, title: 'export.enhanced.meetingReport', description: 'export.enhanced.meetingReportDesc' },
    { id: 'meeting-summary', icon: BookOpen, title: 'export.enhanced.meetingSummary', description: 'export.enhanced.meetingSummaryDesc' },
    { id: 'json', icon: FileJson, title: 'export.enhanced.jsonExport', description: 'export.enhanced.jsonExportDesc' },
    { id: 'bibliography', icon: BookOpen, title: 'export.enhanced.bibliography', description: 'export.enhanced.bibliographyDesc' },
    { id: 'agent-report', icon: Users, title: 'export.enhanced.agentReport', description: 'export.enhanced.agentReportDesc' },
  ],
  zh: [
    { id: 'meeting-report', icon: FileText, title: 'export.enhanced.meetingReport', description: 'export.enhanced.meetingReportDesc' },
    { id: 'meeting-summary', icon: BookOpen, title: 'export.enhanced.meetingSummary', description: 'export.enhanced.meetingSummaryDesc' },
    { id: 'json', icon: FileJson, title: 'export.enhanced.jsonExport', description: 'export.enhanced.jsonExportDesc' },
    { id: 'bibliography', icon: BookOpen, title: 'export.enhanced.bibliography', description: 'export.enhanced.bibliographyDesc' },
    { id: 'agent-report', icon: Users, title: 'export.enhanced.agentReport', description: 'export.enhanced.agentReportDesc' },
  ],
}

// ============================================================
// Export Content Generators
// ============================================================

function generateMeetingReport(meeting: Meeting, lang: Lang): string {
  const participants = meeting.type === 'team'
    ? [meeting.teamLead, ...(meeting.teamMembers || [])].filter(Boolean).map(a => a?.title || 'Unknown')
    : [meeting.teamMember?.title || 'Unknown']

  const lines: string[] = []
  lines.push(`# ${t(lang, 'export.enhanced.report.title')}: ${meeting.saveName}`)
  lines.push('')
  lines.push(`**${t(lang, 'export.enhanced.report.date')}**: ${new Date(meeting.createdAt).toLocaleDateString()}`)
  lines.push(`**${t(lang, 'export.enhanced.report.participants')}**: ${participants.join(', ')}`)
  lines.push(`**${t(lang, 'meeting.type.team')}**: ${meeting.type === 'team' ? 'Team' : 'Individual'}`)
  lines.push(`**${t(lang, 'common.status')}**: ${meeting.status}`)
  lines.push('')

  // Agenda
  lines.push('## Agenda')
  lines.push('')
  lines.push(meeting.agenda)
  if (meeting.agendaQuestions.length > 0) {
    lines.push('')
    lines.push('### Questions')
    meeting.agendaQuestions.forEach((q, i) => {
      lines.push(`${i + 1}. ${q}`)
    })
  }
  if (meeting.agendaRules.length > 0) {
    lines.push('')
    lines.push('### Rules')
    meeting.agendaRules.forEach((r, i) => {
      lines.push(`${i + 1}. ${r}`)
    })
  }
  lines.push('')

  // Discussion
  if (meeting.messages.length > 0) {
    lines.push(`## ${t(lang, 'export.enhanced.report.discussion')}`)
    lines.push('')

    const maxRound = Math.max(...meeting.messages.map(m => m.roundIndex))
    for (let r = 0; r <= maxRound; r++) {
      const roundMessages = meeting.messages.filter(m => m.roundIndex === r)
      if (roundMessages.length === 0) continue
      lines.push(`### ${t(lang, 'meeting.roundDivider').replace('{round}', String(r + 1))}`)
      lines.push('')
      roundMessages.forEach(msg => {
        lines.push(`**${msg.agentName}**:`)
        lines.push('')
        lines.push(msg.message)
        lines.push('')
      })
    }
    lines.push('')
  }

  // Summary
  if (meeting.summary) {
    lines.push(`## ${t(lang, 'export.enhanced.report.summary')}`)
    lines.push('')
    lines.push(meeting.summary)
    lines.push('')
  }

  // Statistics
  lines.push(`## ${t(lang, 'export.enhanced.report.statistics')}`)
  lines.push('')
  lines.push(`- ${t(lang, 'export.enhanced.report.messagesPerAgent')}:`)
  const agentMsgCounts: Record<string, number> = {}
  meeting.messages.forEach(m => {
    agentMsgCounts[m.agentName] = (agentMsgCounts[m.agentName] || 0) + 1
  })
  Object.entries(agentMsgCounts).sort((a, b) => b[1] - a[1]).forEach(([name, count]) => {
    lines.push(`  - ${name}: ${count}`)
  })
  lines.push(`- ${t(lang, 'export.enhanced.report.totalRounds')}: ${meeting.messages.length > 0 ? Math.max(...meeting.messages.map(m => m.roundIndex)) + 1 : 0}`)
  lines.push(`- ${t(lang, 'common.messages')}: ${meeting.messages.length}`)
  lines.push('')

  return lines.join('\n')
}

function generateMeetingSummary(meeting: Meeting, lang: Lang): string {
  const participants = meeting.type === 'team'
    ? [meeting.teamLead, ...(meeting.teamMembers || [])].filter(Boolean).map(a => a?.title || 'Unknown')
    : [meeting.teamMember?.title || 'Unknown']

  const lines: string[] = []
  lines.push(`${t(lang, 'export.enhanced.report.title')}: ${meeting.saveName}`)
  lines.push(`${t(lang, 'export.enhanced.report.date')}: ${new Date(meeting.createdAt).toLocaleDateString()}`)
  lines.push(`${t(lang, 'export.enhanced.report.participants')}: ${participants.join(', ')}`)
  lines.push('')
  if (meeting.summary) {
    lines.push(meeting.summary)
  } else {
    lines.push(t(lang, 'common.noSummary'))
  }
  return lines.join('\n')
}

function generateJSONExport(meeting: Meeting): string {
  const data = {
    id: meeting.id,
    type: meeting.type,
    saveName: meeting.saveName,
    agenda: meeting.agenda,
    agendaQuestions: meeting.agendaQuestions,
    agendaRules: meeting.agendaRules,
    status: meeting.status,
    summary: meeting.summary,
    createdAt: meeting.createdAt,
    updatedAt: meeting.updatedAt,
    numRounds: meeting.numRounds,
    temperature: meeting.temperature,
    participants: meeting.type === 'team'
      ? [meeting.teamLead, ...(meeting.teamMembers || [])].filter(Boolean).map(a => ({ id: a?.id, title: a?.title, role: a?.role }))
      : meeting.teamMember ? [{ id: meeting.teamMember.id, title: meeting.teamMember.title, role: meeting.teamMember.role }] : [],
    messages: meeting.messages.map(m => ({
      agentName: m.agentName,
      roundIndex: m.roundIndex,
      message: m.message,
      createdAt: m.createdAt,
    })),
    statistics: {
      totalMessages: meeting.messages.length,
      totalRounds: meeting.messages.length > 0 ? Math.max(...meeting.messages.map(m => m.roundIndex)) + 1 : 0,
      messagesPerAgent: (() => {
        const counts: Record<string, number> = {}
        meeting.messages.forEach(m => { counts[m.agentName] = (counts[m.agentName] || 0) + 1 })
        return counts
      })(),
    },
  }
  return JSON.stringify(data, null, 2)
}

function generateBibliography(meeting: Meeting): string {
  const lines: string[] = []
  lines.push('# Meeting References')
  lines.push('')
  lines.push(`Extracted from: ${meeting.saveName}`)
  lines.push(`Date: ${new Date(meeting.createdAt).toLocaleDateString()}`)
  lines.push('')

  // Extract potential references from messages (lines that look like citations)
  const referencePatterns = [
    /\((\d{4})\)/g,
    /(?:see|ref|cite|according to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:et\s+al\.))/gi,
    /doi:\s*([\d./a-zA-Z]+)/gi,
  ]

  const refs = new Set<string>()
  meeting.messages.forEach(msg => {
    referencePatterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(msg.message)) !== null) {
        refs.add(match[0])
      }
    })
  })

  if (refs.size === 0) {
    lines.push('_No references automatically detected in discussion._')
    lines.push('')
    lines.push('Note: References are extracted from patterns like "(2023)", author names with "et al.", and DOI links.')
  } else {
    lines.push('## Detected References')
    lines.push('')
    Array.from(refs).forEach((ref, i) => {
      lines.push(`${i + 1}. ${ref}`)
    })
  }

  lines.push('')
  lines.push('---')
  lines.push(`_Generated from Virtual Lab meeting: ${meeting.saveName}_`)

  return lines.join('\n')
}

function generateAgentReport(meeting: Meeting, lang: Lang): string {
  const lines: string[] = []
  lines.push(`# ${t(lang, 'export.enhanced.agentReport')}: ${meeting.saveName}`)
  lines.push('')
  lines.push(`**${t(lang, 'export.enhanced.report.date')}**: ${new Date(meeting.createdAt).toLocaleDateString()}`)
  lines.push('')

  // Per-agent stats
  const agentMsgs: Record<string, typeof meeting.messages> = {}
  meeting.messages.forEach(m => {
    if (!agentMsgs[m.agentName]) agentMsgs[m.agentName] = []
    agentMsgs[m.agentName].push(m)
  })

  Object.entries(agentMsgs).sort((a, b) => b[1].length - a[1].length).forEach(([name, msgs]) => {
    lines.push(`## ${name}`)
    lines.push('')
    lines.push(`- Messages: ${msgs.length}`)
    const avgLen = Math.round(msgs.reduce((s, m) => s + m.message.length, 0) / msgs.length)
    lines.push(`- Avg. message length: ${avgLen} chars`)
    const rounds = new Set(msgs.map(m => m.roundIndex))
    lines.push(`- Rounds participated: ${rounds.size}`)
    lines.push('')

    // Key contributions (first and last message snippet)
    if (msgs.length > 0) {
      const firstSnippet = msgs[0].message.slice(0, 150) + (msgs[0].message.length > 150 ? '...' : '')
      lines.push(`**Opening contribution:**`)
      lines.push(`> ${firstSnippet}`)
      lines.push('')

      if (msgs.length > 1) {
        const lastSnippet = msgs[msgs.length - 1].message.slice(0, 150) + (msgs[msgs.length - 1].message.length > 150 ? '...' : '')
        lines.push(`**Closing contribution:**`)
        lines.push(`> ${lastSnippet}`)
        lines.push('')
      }
    }
    lines.push('---')
    lines.push('')
  })

  return lines.join('\n')
}

const GENERATORS: Record<ExportFormat, (meeting: Meeting, lang: Lang) => string> = {
  'meeting-report': generateMeetingReport,
  'meeting-summary': generateMeetingSummary,
  'json': (m) => generateJSONExport(m),
  'bibliography': (m) => generateBibliography(m),
  'agent-report': generateAgentReport,
}

const FILE_EXTENSIONS: Record<ExportFormat, string> = {
  'meeting-report': 'md',
  'meeting-summary': 'txt',
  'json': 'json',
  'bibliography': 'md',
  'agent-report': 'md',
}

// ============================================================
// Enhanced Export Panel Component
// ============================================================

interface EnhancedExportPanelProps {
  meeting: Meeting
  lang: Lang
  onClose: () => void
}

export function EnhancedExportPanel({ meeting, lang, onClose }: EnhancedExportPanelProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat | null>(null)
  const [previewContent, setPreviewContent] = useState('')
  const [copied, setCopied] = useState(false)

  const options = EXPORT_OPTIONS[lang]

  const handleSelectFormat = (format: ExportFormat) => {
    setSelectedFormat(format)
    setPreviewContent(GENERATORS[format](meeting, lang))
  }

  const handleCopy = useCallback(async () => {
    if (!previewContent) return
    try {
      await navigator.clipboard.writeText(previewContent)
      setCopied(true)
      toast.success(t(lang, 'export.enhanced.toast.copied'))
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }, [previewContent, lang])

  const handleDownload = useCallback(() => {
    if (!selectedFormat || !previewContent) return
    const ext = FILE_EXTENSIONS[selectedFormat]
    const blob = new Blob([previewContent], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${meeting.saveName}-export.${ext}`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(t(lang, 'export.enhanced.toast.success'))
  }, [selectedFormat, previewContent, meeting.saveName, lang])

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="vl-inner max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="vl-text-heading flex items-center gap-2">
            <Download className="size-5 text-emerald-500" />
            {t(lang, 'export.enhanced.title')}
          </DialogTitle>
          <DialogDescription className="vl-text-muted">
            {meeting.saveName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Format selector cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {options.map(opt => {
              const Icon = opt.icon
              const isSelected = selectedFormat === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectFormat(opt.id)}
                  className={`text-left p-3 rounded-lg border transition-all duration-200 ${
                    isSelected
                      ? 'border-emerald-500/50 bg-emerald-500/10 shadow-sm'
                      : 'vl-card border vl-border hover:border-emerald-500/30 hover:bg-emerald-500/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isSelected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/10 text-slate-400'
                    }`}>
                      <Icon className="size-4" />
                    </div>
                    <span className={`text-sm font-medium ${isSelected ? 'text-emerald-400' : 'vl-text-heading'}`}>
                      {t(lang, opt.title)}
                    </span>
                  </div>
                  <p className="text-xs vl-text-muted leading-relaxed pl-[2.5rem]">{t(lang, opt.description)}</p>
                </button>
              )
            })}
          </div>

          {/* Preview */}
          {selectedFormat && previewContent && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium vl-text-heading flex items-center gap-1.5">
                  <Eye className="size-4 text-emerald-500" />
                  {t(lang, 'export.enhanced.preview')}
                </h3>
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="outline" onClick={handleCopy} className="h-7 gap-1.5 text-xs">
                          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                          {copied ? t(lang, 'common.copied') : t(lang, 'common.copy')}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t(lang, 'common.copy')}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Button size="sm" onClick={handleDownload} className="h-7 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white export-ready-pulse">
                    <Download className="size-3" />
                    {t(lang, 'export.enhanced.download')}
                  </Button>
                </div>
              </div>
              <Card className="vl-card border overflow-hidden">
                <ScrollArea className="max-h-64">
                  <CardContent className="p-4">
                    <pre className="text-xs vl-text-muted font-mono whitespace-pre-wrap leading-relaxed">
                      {previewContent}
                    </pre>
                  </CardContent>
                </ScrollArea>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Export trigger button for history tab
// ============================================================

interface ExportButtonProps {
  meeting: Meeting
  lang: Lang
}

export function EnhancedExportButton({ meeting, lang }: ExportButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-8 text-xs"
              onClick={() => setOpen(true)}
            >
              <Download className="size-3.5 text-emerald-500" />
              {t(lang, 'export.enhanced.title')}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t(lang, 'export.enhanced.title')}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {open && (
        <EnhancedExportPanel meeting={meeting} lang={lang} onClose={() => setOpen(false)} />
      )}
    </>
  )
}
