'use client'

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Highlighter, Trash2, Download, Sparkles, CheckCircle,
  HelpCircle, ListChecks, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

// ============================================================
// Types
// ============================================================

export type HighlightType = 'keyFinding' | 'decision' | 'actionItem' | 'openQuestion'

export interface MeetingHighlight {
  id: string
  type: HighlightType
  text: string
  offset: number
  length: number
  createdAt: string
}

interface MeetingHighlighterProps {
  meetingId: string
  summary: string
  lang: Lang
}

// ============================================================
// Highlight type config
// ============================================================

const HIGHLIGHT_TYPES: { value: HighlightType; icon: React.ElementType; color: string; bgClass: string }[] = [
  { value: 'keyFinding', icon: Sparkles, color: 'text-emerald-400', bgClass: 'meeting-highlight-key-finding' },
  { value: 'decision', icon: CheckCircle, color: 'text-blue-400', bgClass: 'meeting-highlight-decision' },
  { value: 'actionItem', icon: ListChecks, color: 'text-amber-400', bgClass: 'meeting-highlight-action-item' },
  { value: 'openQuestion', icon: HelpCircle, color: 'text-violet-400', bgClass: 'meeting-highlight-open-question' },
]

const STORAGE_PREFIX = 'vl-meeting-highlights'

function getHighlights(meetingId: string): MeetingHighlight[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}-${meetingId}`)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveHighlights(meetingId: string, highlights: MeetingHighlight[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(`${STORAGE_PREFIX}-${meetingId}`, JSON.stringify(highlights))
}

// ============================================================
// Meeting Highlighter Component
// ============================================================

export function MeetingHighlighter({
  meetingId,
  summary,
  lang,
}: MeetingHighlighterProps) {
  const [highlights, setHighlights] = useState<MeetingHighlight[]>([])
  const [activeType, setActiveType] = useState<HighlightType | null>(null)
  const [selectionInfo, setSelectionInfo] = useState<{ offset: number; length: number; text: string } | null>(null)
  const summaryRef = useRef<HTMLDivElement>(null)

  // Load highlights
  useEffect(() => {
    setHighlights(getHighlights(meetingId))
  }, [meetingId])

  // Detect text selection in summary
  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || !summaryRef.current) {
        setSelectionInfo(null)
        return
      }
      // Check if selection is within summary
      const range = sel.getRangeAt(0)
      if (!summaryRef.current.contains(range.commonAncestorContainer)) {
        setSelectionInfo(null)
        return
      }
      const text = sel.toString().trim()
      if (text.length === 0) {
        setSelectionInfo(null)
        return
      }
      // Get offset within summary text
      const preRange = document.createRange()
      preRange.setStart(summaryRef.current, 0)
      preRange.setEnd(range.startContainer, range.startOffset)
      const offset = preRange.toString().length
      setSelectionInfo({ offset, length: text.length, text })
    }

    document.addEventListener('selectionchange', handleSelectionChange)
    return () => document.removeEventListener('selectionchange', handleSelectionChange)
  }, [])

  const addHighlight = useCallback((type: HighlightType) => {
    if (!selectionInfo) return
    const highlight: MeetingHighlight = {
      id: `hl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      text: selectionInfo.text,
      offset: selectionInfo.offset,
      length: selectionInfo.length,
      createdAt: new Date().toISOString(),
    }
    setHighlights(prev => {
      const next = [...prev, highlight]
      saveHighlights(meetingId, next)
      return next
    })
    // Clear selection
    window.getSelection()?.removeAllRanges()
    setSelectionInfo(null)
    setActiveType(null)
  }, [meetingId, selectionInfo])

  const removeHighlight = useCallback((id: string) => {
    setHighlights(prev => {
      const next = prev.filter(h => h.id !== id)
      saveHighlights(meetingId, next)
      return next
    })
  }, [meetingId])

  const clearAllHighlights = useCallback(() => {
    setHighlights([])
    saveHighlights(meetingId, [])
  }, [meetingId])

  const exportHighlights = useCallback(() => {
    if (highlights.length === 0) return
    const lines = highlights.map(h => {
      const typeLabel = t(lang, `meetingHighlighter.type.${h.type}`)
      return `[${typeLabel}] ${h.text}`
    })
    const text = lines.join('\n')
    navigator.clipboard.writeText(text)
    toast.success(t(lang, 'meetingHighlighter.exported'))
  }, [highlights, lang])

  // Stats per type
  const stats = useMemo(() => {
    const s: Record<string, number> = {}
    highlights.forEach(h => { s[h.type] = (s[h.type] || 0) + 1 })
    return s
  }, [highlights])

  // Render highlighted text
  const renderHighlightedText = () => {
    if (highlights.length === 0) {
      return <span className="text-xs vl-text-body whitespace-pre-wrap">{summary}</span>
    }

    // Sort highlights by offset
    const sorted = [...highlights].sort((a, b) => a.offset - b.offset)
    const parts: { text: string; highlight?: MeetingHighlight }[] = []
    let lastEnd = 0

    sorted.forEach(h => {
      if (h.offset > lastEnd) {
        parts.push({ text: summary.slice(lastEnd, h.offset) })
      }
      parts.push({ text: summary.slice(h.offset, h.offset + h.length), highlight: h })
      lastEnd = h.offset + h.length
    })
    if (lastEnd < summary.length) {
      parts.push({ text: summary.slice(lastEnd) })
    }

    return (
      <span className="text-xs vl-text-body whitespace-pre-wrap">
        {parts.map((part, i) => {
          if (part.highlight) {
            const ht = HIGHLIGHT_TYPES.find(x => x.value === part.highlight!.type)
            return (
              <span
                key={`hl-${i}`}
                className={`inline-flex items-center gap-0.5 px-0.5 rounded-sm cursor-pointer group ${ht?.bgClass || ''}`}
                onClick={() => removeHighlight(part.highlight!.id)}
                title={t(lang, 'meetingHighlighter.removeHighlight')}
              >
                {part.text}
                <X className="size-2 opacity-0 group-hover:opacity-100 transition-opacity" />
              </span>
            )
          }
          return <span key={`text-${i}`}>{part.text}</span>
        })}
      </span>
    )
  }

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="vl-inner rounded-lg border border-[var(--vl-border-subtle)] p-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Highlighter className="size-3.5 text-emerald-400" />
            <span className="text-[10px] font-medium vl-text-heading">{t(lang, 'meetingHighlighter.toolbar')}</span>
            <div className="flex items-center gap-1">
              {HIGHLIGHT_TYPES.map(ht => (
                <TooltipProvider key={ht.value}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setActiveType(activeType === ht.value ? null : ht.value)}
                        className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-md border transition-all ${
                          activeType === ht.value
                            ? `${ht.bgClass} ${ht.color} border-current/30`
                            : 'border-[var(--vl-border-subtle)] vl-text-muted hover:border-emerald-500/30'
                        }`}
                      >
                        <ht.icon className="size-3" />
                        <span className="hidden sm:inline">{t(lang, `meetingHighlighter.type.${ht.value}`)}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{t(lang, `meetingHighlighter.type.${ht.value}`)}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Apply button when text is selected */}
            {selectionInfo && activeType && (
              <Button
                size="sm"
                className="h-6 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] gap-1"
                onClick={() => addHighlight(activeType)}
              >
                <Highlighter className="size-3" /> Apply
              </Button>
            )}
            {highlights.length > 0 && (
              <>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 vl-text-muted hover:text-emerald-400" onClick={exportHighlights}>
                  <Download className="size-3" />
                </Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 vl-text-muted hover:text-rose-400" onClick={clearAllHighlights}>
                  <Trash2 className="size-3" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Selection hint */}
        {selectionInfo && !activeType && (
          <p className="text-[9px] vl-text-muted mt-1.5 italic">
            {t(lang, 'meetingHighlighter.selectText')}
          </p>
        )}
      </div>

      {/* Highlighted summary content */}
      <div ref={summaryRef} className="vl-card rounded-lg p-3 border border-[var(--vl-border-subtle)]">
        {renderHighlightedText()}
      </div>

      {/* Stats */}
      {highlights.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] vl-text-muted font-medium">{t(lang, 'meetingHighlighter.stats')}:</span>
          {HIGHLIGHT_TYPES.filter(ht => stats[ht.value]).map(ht => (
            <span key={ht.value} className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-md ${ht.bgClass}`}>
              <ht.icon className="size-2.5" />
              <span className={ht.color}>
                {t(lang, 'meetingHighlighter.stats.count').replace('{type}', t(lang, `meetingHighlighter.type.${ht.value}`)).replace('{count}', String(stats[ht.value]))}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export { HIGHLIGHT_TYPES }
