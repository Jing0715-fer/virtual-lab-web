'use client'

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { Agent, Meeting } from './shared-components'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Download, Users, MessageSquare, Hash, Clock, BarChart3 } from 'lucide-react'
import { toast } from 'sonner'

interface MeetingMetrics {
  agentCount: number
  messageCount: number
  wordCount: number
  duration: string
  rounds: number
  summaryLength: number
  participantNames: string[]
  avgWordsPerMsg: number
}

function computeMetrics(meeting: Meeting): MeetingMetrics {
  const msgs = meeting.messages || []
  const uniqueAgents = [...new Set(msgs.map(m => m.agentName).filter(n => n !== 'User'))]
  const totalWords = msgs.reduce((sum, m) => sum + m.message.split(/\s+/).filter(Boolean).length, 0)
  const created = new Date(meeting.createdAt).getTime()
  const updated = new Date(meeting.updatedAt).getTime()
  const durationMs = updated - created
  const durationMin = Math.max(1, Math.round(durationMs / 60000))
  const rounds = meeting.numRounds || [...new Set(msgs.map(m => m.roundIndex))].length
  const summaryLength = (meeting.summary || '').split(/\s+/).filter(Boolean).length

  let durationStr = ''
  if (durationMin < 60) {
    durationStr = `${durationMin}m`
  } else {
    durationStr = `${Math.floor(durationMin / 60)}h ${durationMin % 60}m`
  }

  return {
    agentCount: uniqueAgents.length,
    messageCount: msgs.length,
    wordCount: totalWords,
    duration: durationStr,
    rounds,
    summaryLength,
    participantNames: uniqueAgents,
    avgWordsPerMsg: msgs.length > 0 ? Math.round(totalWords / msgs.length) : 0,
  }
}

interface ComparisonBarProps {
  label: string
  valueA: number
  valueB: number
  labelA?: string
  labelB?: string
  unit?: string
  lang: Lang
}

function ComparisonBar({ label, valueA, valueB, labelA, labelB, unit, lang }: ComparisonBarProps) {
  const maxVal = Math.max(valueA, valueB, 1)
  const pctA = (valueA / maxVal) * 100
  const pctB = (valueB / maxVal) * 100
  const diff = valueA - valueB
  const isAHigher = diff > 0
  const isSame = diff === 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium vl-text-heading">{label}</span>
        <span className={`text-[10px] font-semibold ${
          isSame ? 'vl-text-muted' : isAHigher ? 'text-emerald-400' : 'text-amber-400'
        }`}>
          {isSame
            ? t(lang, 'meetingComparison.equal')
            : isAHigher
              ? `${t(lang, 'meetingComparison.meetingA')} +${Math.abs(diff)}`
              : `${t(lang, 'meetingComparison.meetingB')} +${Math.abs(diff)}`
          }
        </span>
      </div>

      {/* Meeting A bar (left-aligned) */}
      <div className="space-y-1">
        {labelA && <span className="text-[9px] vl-text-muted">{labelA}</span>}
        <div className="flex items-center gap-1.5">
          <div className="flex-1 h-5 rounded-full bg-[var(--vl-bg-inner)] overflow-hidden">
            <motion.div
              className={`h-full rounded-full transition-all ${
                isSame ? 'bg-gray-500' : isAHigher ? 'bg-emerald-500' : 'bg-emerald-500/60'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(pctA, 3)}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
          <span className="text-xs font-mono vl-text-body w-16 text-right shrink-0">
            {valueA.toLocaleString()}{unit || ''}
          </span>
        </div>
      </div>

      {/* Meeting B bar (left-aligned) */}
      <div className="space-y-1">
        {labelB && <span className="text-[9px] vl-text-muted">{labelB}</span>}
        <div className="flex items-center gap-1.5">
          <div className="flex-1 h-5 rounded-full bg-[var(--vl-bg-inner)] overflow-hidden">
            <motion.div
              className={`h-full rounded-full transition-all ${
                isSame ? 'bg-gray-500' : !isAHigher ? 'bg-amber-500' : 'bg-amber-500/60'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(pctB, 3)}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
          <span className="text-xs font-mono vl-text-body w-16 text-right shrink-0">
            {valueB.toLocaleString()}{unit || ''}
          </span>
        </div>
      </div>
    </div>
  )
}

interface MeetingComparisonViewProps {
  meetings: Meeting[]
  meetingAId: string
  meetingBId: string
  agents: Agent[]
  lang: Lang
}

export function MeetingComparisonView({
  meetings,
  meetingAId,
  meetingBId,
  agents,
  lang,
}: MeetingComparisonViewProps) {
  const meetingA = useMemo(() => meetings.find(m => m.id === meetingAId) || null, [meetings, meetingAId])
  const meetingB = useMemo(() => meetings.find(m => m.id === meetingBId) || null, [meetings, meetingBId])

  const metricsA = useMemo(() => meetingA ? computeMetrics(meetingA) : null, [meetingA])
  const metricsB = useMemo(() => meetingB ? computeMetrics(meetingB) : null, [meetingB])

  const exportComparison = useCallback(() => {
    if (!metricsA || !metricsB || !meetingA || !meetingB) return

    const data = {
      exportedAt: new Date().toISOString(),
      meetingA: {
        id: meetingA.id,
        name: meetingA.saveName,
        type: meetingA.type,
        status: meetingA.status,
        metrics: metricsA,
      },
      meetingB: {
        id: meetingB.id,
        name: meetingB.saveName,
        type: meetingB.type,
        status: meetingB.status,
        metrics: metricsB,
      },
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `meeting-comparison-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(t(lang, 'meetingComparison.exported'))
  }, [metricsA, metricsB, meetingA, meetingB, lang])

  if (!meetingA || !meetingB || !metricsA || !metricsB) {
    return (
      <div className="vl-card rounded-xl p-6 text-center">
        <p className="text-sm vl-text-muted">{t(lang, 'meetingComparison.selectTwo')}</p>
      </div>
    )
  }

  const sharedAgents = metricsA.participantNames.filter(n =>
    metricsB.participantNames.includes(n)
  )
  const uniqueToA = metricsA.participantNames.filter(n => !metricsB.participantNames.includes(n))
  const uniqueToB = metricsB.participantNames.filter(n => !metricsA.participantNames.includes(n))

  return (
    <div className="space-y-4">
      {/* Header with export */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold vl-text-heading flex items-center gap-2">
          <BarChart3 className="size-4 text-emerald-400" />
          {t(lang, 'meetingComparison.title')}
        </h3>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1.5 border-[var(--vl-border)] vl-text-muted hover:text-white"
          onClick={exportComparison}
        >
          <Download className="size-3" />
          {t(lang, 'common.export')} JSON
        </Button>
      </div>

      {/* Side-by-side panels with VS divider */}
      <div className="grid grid-cols-2 gap-4">
        {/* Meeting A Panel */}
        <div className="vl-card rounded-xl p-4 space-y-2 border-emerald-500/20">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${meetingA.type === 'team' ? 'bg-emerald-500/20' : 'bg-cyan-500/20'}`}>
              <span className="text-emerald-400 text-xs font-bold">A</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold vl-text-heading truncate">{meetingA.saveName}</p>
              <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                {meetingA.type === 'team' ? 'Team' : 'Individual'} · {meetingA.status}
              </Badge>
            </div>
          </div>
          <div className="space-y-1 text-[10px] vl-text-muted">
            <p className="flex items-center gap-1"><Users className="size-2.5" />{metricsA.participantNames.join(', ')}</p>
            <p className="flex items-center gap-1"><Clock className="size-2.5" />{meetingA.createdAt}</p>
          </div>
        </div>

        {/* Animated VS Divider */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden lg:block">
          <motion.div
            className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-amber-500 flex items-center justify-center shadow-lg shadow-emerald-500/20"
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 3, -3, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <span className="text-white font-black text-lg tracking-tighter">VS</span>
          </motion.div>
        </div>

        {/* Meeting B Panel */}
        <div className="vl-card rounded-xl p-4 space-y-2 border-amber-500/20">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${meetingB.type === 'team' ? 'bg-emerald-500/20' : 'bg-cyan-500/20'}`}>
              <span className="text-amber-400 text-xs font-bold">B</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold vl-text-heading truncate">{meetingB.saveName}</p>
              <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-400 border-amber-500/30">
                {meetingB.type === 'team' ? 'Team' : 'Individual'} · {meetingB.status}
              </Badge>
            </div>
          </div>
          <div className="space-y-1 text-[10px] vl-text-muted">
            <p className="flex items-center gap-1"><Users className="size-2.5" />{metricsB.participantNames.join(', ')}</p>
            <p className="flex items-center gap-1"><Clock className="size-2.5" />{meetingB.createdAt}</p>
          </div>
        </div>
      </div>

      {/* Comparison Bars */}
      <div className="vl-card rounded-xl p-4 space-y-4">
        <ComparisonBar
          label={`${t(lang, 'meetingComparison.agentCount')} (${t(lang, 'common.agents')})`}
          valueA={metricsA.agentCount}
          valueB={metricsB.agentCount}
          labelA={meetingA.saveName}
          labelB={meetingB.saveName}
          lang={lang}
        />
        <ComparisonBar
          label={`${t(lang, 'meetingComparison.messageCount')} (${t(lang, 'common.messages')})`}
          valueA={metricsA.messageCount}
          valueB={metricsB.messageCount}
          labelA={meetingA.saveName}
          labelB={meetingB.saveName}
          lang={lang}
        />
        <ComparisonBar
          label={`${t(lang, 'meetingComparison.wordCount')} (${t(lang, 'common.words')})`}
          valueA={metricsA.wordCount}
          valueB={metricsB.wordCount}
          labelA={meetingA.saveName}
          labelB={meetingB.saveName}
          lang={lang}
        />
        <ComparisonBar
          label={`${t(lang, 'meetingComparison.rounds')} (${t(lang, 'common.rounds')})`}
          valueA={metricsA.rounds}
          valueB={metricsB.rounds}
          labelA={meetingA.saveName}
          labelB={meetingB.saveName}
          lang={lang}
        />
        <ComparisonBar
          label={`${t(lang, 'meetingComparison.avgWords')} (${t(lang, 'common.words')}/${t(lang, 'common.message')})`}
          valueA={metricsA.avgWordsPerMsg}
          valueB={metricsB.avgWordsPerMsg}
          labelA={meetingA.saveName}
          labelB={meetingB.saveName}
          lang={lang}
        />
        <ComparisonBar
          label={t(lang, 'meetingComparison.summaryLength')}
          valueA={metricsA.summaryLength}
          valueB={metricsB.summaryLength}
          labelA={meetingA.saveName}
          labelB={meetingB.saveName}
          lang={lang}
        />
      </div>

      {/* Duration comparison (text-based) */}
      <div className="vl-card rounded-xl p-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium vl-text-heading">{t(lang, 'meetingComparison.duration')}</span>
        </div>
        <div className="flex items-center gap-4 mt-2">
          <div className="flex-1 text-center">
            <span className="text-xs vl-text-muted">{meetingA.saveName}</span>
            <p className="text-sm font-bold vl-text-heading">{metricsA.duration}</p>
          </div>
          <div className="w-px h-8 bg-[var(--vl-border)]" />
          <div className="flex-1 text-center">
            <span className="text-xs vl-text-muted">{meetingB.saveName}</span>
            <p className="text-sm font-bold vl-text-heading">{metricsB.duration}</p>
          </div>
        </div>
      </div>

      {/* Agent overlap analysis */}
      <div className="vl-card rounded-xl p-4 space-y-2">
        <p className="text-[11px] font-medium vl-text-heading">{t(lang, 'meetingComparison.agentOverlap')}</p>
        <div className="space-y-1.5">
          {sharedAgents.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span className="text-[10px] vl-text-muted">{t(lang, 'meetingComparison.shared')}:</span>
              <span className="text-[10px] vl-text-body">{sharedAgents.join(', ')}</span>
            </div>
          )}
          {uniqueToA.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-[10px] vl-text-muted">{meetingA.saveName}:</span>
              <span className="text-[10px] text-emerald-400">{uniqueToA.join(', ')}</span>
            </div>
          )}
          {uniqueToB.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <span className="text-[10px] vl-text-muted">{meetingB.saveName}:</span>
              <span className="text-[10px] text-amber-400">{uniqueToB.join(', ')}</span>
            </div>
          )}
          {sharedAgents.length === 0 && uniqueToA.length === 0 && uniqueToB.length === 0 && (
            <p className="text-[10px] vl-text-muted">{t(lang, 'common.noData')}</p>
          )}
        </div>
      </div>
    </div>
  )
}
