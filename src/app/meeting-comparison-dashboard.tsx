'use client'

import React, { useMemo, useState } from 'react'
import {
  GitCompareArrows, BarChart3, TrendingUp, Clock, MessageSquare,
  Hash, Users, FileText, ArrowUp, ArrowDown, Minus,
  Sparkles, Cloud,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { Meeting, Agent } from './shared-types'
import { extractKeywords, extractWordFrequency, computeSentiment } from './meeting-diff-view'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from 'recharts'

// ============================================================
// MeetingComparisonDashboard — Overview stats, charts, word cloud,
// sentiment comparison for two selected meetings
// ============================================================

interface MeetingComparisonDashboardProps {
  meetings: Meeting[]
  agents: Agent[]
  lang: Lang
  onSelectMeetings: (meetingA: Meeting | null, meetingB: Meeting | null) => void
}

/** Duration helper */
function formatDuration(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (ms < 0 || isNaN(ms)) return '—'
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  if (minutes === 0) return `${seconds}s`
  return `${minutes}m ${seconds % 60}s`
}

/** Sentiment gauge SVG */
function SentimentGauge({ score, label, lang }: { score: number; label: string; lang: Lang }) {
  const circumference = 2 * Math.PI * 40
  const strokeDashoffset = circumference * (1 - score / 100)
  const color = score > 60 ? '#10b981' : score < 40 ? '#ef4444' : '#f59e0b'

  return (
    <div className="comparison-sentiment-gauge">
      <svg width="100" height="100" viewBox="0 0 100 100">
        {/* Background arc */}
        <circle
          cx="50" cy="50" r="40"
          fill="none"
          stroke="var(--vl-border-subtle)"
          strokeWidth="8"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeLinecap="round"
          transform="rotate(135 50 50)"
        />
        {/* Score arc */}
        <circle
          cx="50" cy="50" r="40"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={`${(circumference * 0.75) * (score / 100)} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(135 50 50)"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
        {/* Score text */}
        <text x="50" y="48" textAnchor="middle" className="text-lg font-bold" fill={color} style={{ fontSize: '18px', fontWeight: 700 }}>
          {score}
        </text>
        <text x="50" y="62" textAnchor="middle" fill="var(--vl-text-muted)" style={{ fontSize: '9px' }}>
          {label}
        </text>
      </svg>
    </div>
  )
}

/** Delta badge */
function DeltaBadge({ delta, lang }: { delta: number; lang: Lang }) {
  if (delta === 0) return <span className="comparison-stat-delta neutral"><Minus className="size-2.5" /> 0</span>
  if (delta > 0) return <span className="comparison-stat-delta up"><ArrowUp className="size-2.5" /> +{delta}</span>
  return <span className="comparison-stat-delta down"><ArrowDown className="size-2.5" /> {delta}</span>
}

/** Word cloud item */
function WordCloudItem({ word, count, variant }: { word: string; count: number; variant: 'a' | 'b' | 'common' }) {
  const colorClass = variant === 'a' ? 'text-emerald-400' : variant === 'b' ? 'text-blue-400' : 'text-amber-400'
  const sizeClass = count >= 5 ? 'text-lg font-bold' : count >= 3 ? 'text-base font-semibold' : count >= 2 ? 'text-sm font-medium' : 'text-xs'

  return (
    <span
      className={`${colorClass} ${sizeClass} cursor-default transition-transform hover:scale-110`}
      style={{ animation: `word-cloud-float ${3 + Math.random() * 2}s ease-in-out infinite`, animationDelay: `${Math.random() * 2}s` }}
      title={`${word}: ${count}`}
    >
      {word}
    </span>
  )
}

export function MeetingComparisonDashboard({
  meetings,
  agents,
  lang,
  onSelectMeetings,
}: MeetingComparisonDashboardProps) {
  const [selectedAId, setSelectedAId] = useState<string>('')
  const [selectedBId, setSelectedBId] = useState<string>('')

  const meetingA = meetings.find(m => m.id === selectedAId) || null
  const meetingB = meetings.find(m => m.id === selectedBId) || null

  // Notify parent when both meetings are selected
  React.useEffect(() => {
    onSelectMeetings(meetingA, meetingB)
  }, [meetingA, meetingB, onSelectMeetings])

  const messagesA = meetingA?.messages || []
  const messagesB = meetingB?.messages || []

  const roundsA = useMemo(() => [...new Set(messagesA.map(m => m.roundIndex))].length, [messagesA])
  const roundsB = useMemo(() => [...new Set(messagesB.map(m => m.roundIndex))].length, [messagesB])

  const avgWordsA = useMemo(() => {
    if (messagesA.length === 0) return 0
    const total = messagesA.reduce((s, m) => s + m.message.split(/\s+/).filter(Boolean).length, 0)
    return Math.round(total / messagesA.length)
  }, [messagesA])

  const avgWordsB = useMemo(() => {
    if (messagesB.length === 0) return 0
    const total = messagesB.reduce((s, m) => s + m.message.split(/\s+/).filter(Boolean).length, 0)
    return Math.round(total / messagesB.length)
  }, [messagesB])

  const participantsA = useMemo(() => [...new Set(messagesA.map(m => m.agentName).filter(n => n !== 'User'))], [messagesA])
  const participantsB = useMemo(() => [...new Set(messagesB.map(m => m.agentName).filter(n => n !== 'User'))], [messagesB])

  const durationA = meetingA ? formatDuration(meetingA.createdAt, meetingA.updatedAt) : '—'
  const durationB = meetingB ? formatDuration(meetingB.createdAt, meetingB.updatedAt) : '—'

  const summaryLenA = (meetingA?.summary || '').length
  const summaryLenB = (meetingB?.summary || '').length

  // Agent participation data for grouped bar chart
  const agentBarData = useMemo(() => {
    const allAgents = [...new Set([...participantsA, ...participantsB])]
    return allAgents.map(name => ({
      name: name.length > 12 ? name.slice(0, 10) + '...' : name,
      [meetingA?.saveName || 'A']: messagesA.filter(m => m.agentName === name).length,
      [meetingB?.saveName || 'B']: messagesB.filter(m => m.agentName === name).length,
    }))
  }, [messagesA, messagesB, participantsA, participantsB, meetingA, meetingB])

  // Round-by-round progress data for line chart
  const roundProgressData = useMemo(() => {
    const maxRounds = Math.max(roundsA, roundsB)
    return Array.from({ length: maxRounds }, (_, i) => ({
      round: `${i + 1}`,
      [meetingA?.saveName || 'A']: messagesA.filter(m => m.roundIndex === i).length,
      [meetingB?.saveName || 'B']: messagesB.filter(m => m.roundIndex === i).length,
    }))
  }, [messagesA, messagesB, roundsA, roundsB, meetingA, meetingB])

  // Word cloud data
  const wordCloudData = useMemo(() => {
    const allTextA = messagesA.map(m => m.message).join(' ') + ' ' + (meetingA?.summary || '')
    const allTextB = messagesB.map(m => m.message).join(' ') + ' ' + (meetingB?.summary || '')
    const freqA = extractWordFrequency(allTextA, 20)
    const freqB = extractWordFrequency(allTextB, 20)
    const setA = new Set(freqA.map(f => f.word))
    const setB = new Set(freqB.map(f => f.word))
    const common = freqA.filter(f => setB.has(f.word))
    const uniqueA = freqA.filter(f => !setB.has(f.word))
    const uniqueB = freqB.filter(f => !setA.has(f.word))
    return { common, uniqueA, uniqueB }
  }, [messagesA, messagesB, meetingA, meetingB])

  // Sentiment data
  const sentimentA = useMemo(() => {
    const allText = messagesA.map(m => m.message).join(' ') + ' ' + (meetingA?.summary || '')
    return computeSentiment(allText)
  }, [messagesA, meetingA])

  const sentimentB = useMemo(() => {
    const allText = messagesB.map(m => m.message).join(' ') + ' ' + (meetingB?.summary || '')
    return computeSentiment(allText)
  }, [messagesB, meetingB])

  const nameA = meetingA?.saveName || 'A'
  const nameB = meetingB?.saveName || 'B'

  const hasData = meetingA && meetingB

  return (
    <div className="space-y-6">
      {/* Meeting Selector */}
      <Card className="vl-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm vl-text-heading flex items-center gap-2">
            <GitCompareArrows className="size-4 text-emerald-400" />
            {t(lang, 'comparison.compareMeetings')}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] vl-text-muted mb-1 block">{t(lang, 'comparison.meetingAPlaceholder')}</label>
            <Select value={selectedAId} onValueChange={(v) => setSelectedAId(v === '__none__' ? '' : v)}>
              <SelectTrigger className="vl-input h-8 text-xs">
                <SelectValue placeholder={t(lang, 'comparison.selectMeeting')} />
              </SelectTrigger>
              <SelectContent className="vl-dialog">
                <SelectItem value="__none__" className="text-xs vl-text-heading">{t(lang, 'common.none')}</SelectItem>
                {meetings.map(m => (
                  <SelectItem key={m.id} value={m.id} disabled={m.id === selectedBId} className="text-xs vl-text-heading">
                    {m.saveName} ({m.messages?.length || 0} msgs)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[10px] vl-text-muted mb-1 block">{t(lang, 'comparison.meetingBPlaceholder')}</label>
            <Select value={selectedBId} onValueChange={(v) => setSelectedBId(v === '__none__' ? '' : v)}>
              <SelectTrigger className="vl-input h-8 text-xs">
                <SelectValue placeholder={t(lang, 'comparison.selectMeeting')} />
              </SelectTrigger>
              <SelectContent className="vl-dialog">
                <SelectItem value="__none__" className="text-xs vl-text-heading">{t(lang, 'common.none')}</SelectItem>
                {meetings.map(m => (
                  <SelectItem key={m.id} value={m.id} disabled={m.id === selectedAId} className="text-xs vl-text-heading">
                    {m.saveName} ({m.messages?.length || 0} msgs)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {!hasData ? (
        <div className="vl-card rounded-xl p-8 text-center">
          <GitCompareArrows className="size-8 vl-text-muted mx-auto mb-3" />
          <p className="text-sm vl-text-muted">{t(lang, 'comparison.selectTwoMeetings')}</p>
        </div>
      ) : (
        <>
          {/* Overview Stats Grid 2x3 */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              {
                label: t(lang, 'comparison.totalMessages'),
                icon: <MessageSquare className="size-3.5" />,
                valueA: messagesA.length,
                valueB: messagesB.length,
                delta: messagesA.length - messagesB.length,
              },
              {
                label: t(lang, 'comparison.totalRounds'),
                icon: <Hash className="size-3.5" />,
                valueA: roundsA,
                valueB: roundsB,
                delta: roundsA - roundsB,
              },
              {
                label: t(lang, 'comparison.avgWords'),
                icon: <FileText className="size-3.5" />,
                valueA: avgWordsA,
                valueB: avgWordsB,
                delta: avgWordsA - avgWordsB,
              },
              {
                label: t(lang, 'comparison.participantsCount'),
                icon: <Users className="size-3.5" />,
                valueA: participantsA.length,
                valueB: participantsB.length,
                delta: participantsA.length - participantsB.length,
              },
              {
                label: t(lang, 'comparison.duration'),
                icon: <Clock className="size-3.5" />,
                valueA: durationA,
                valueB: durationB,
                delta: 0,
                isText: true,
              },
              {
                label: t(lang, 'comparison.summaryLength'),
                icon: <FileText className="size-3.5" />,
                valueA: summaryLenA,
                valueB: summaryLenB,
                delta: summaryLenA - summaryLenB,
                suffix: ` ${t(lang, 'comparison.chars')}`,
              },
            ].map((stat, idx) => (
              <div
                key={stat.label}
                className="comparison-stat-card"
                style={{ animation: `comparison-stat-enter 0.4s ease forwards ${idx * 0.06}s`, opacity: 0 }}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="vl-text-muted">{stat.icon}</span>
                  <span className="text-[10px] vl-text-muted font-medium">{stat.label}</span>
                </div>
                <div className="flex items-baseline justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-emerald-400 font-medium">A</span>
                    <span className="text-sm font-bold vl-text-heading">
                      {stat.isText ? stat.valueA : stat.valueA}{stat.suffix || ''}
                    </span>
                  </div>
                  <span className="text-[9px] vl-text-muted">vs</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-blue-400 font-medium">B</span>
                    <span className="text-sm font-bold vl-text-heading">
                      {stat.isText ? stat.valueB : stat.valueB}{stat.suffix || ''}
                    </span>
                  </div>
                </div>
                {!stat.isText && (
                  <div className="mt-1.5 flex justify-center">
                    <DeltaBadge delta={stat.delta as number} lang={lang} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Agent Participation Bar Chart */}
            <Card className="vl-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs vl-text-heading flex items-center gap-1.5">
                  <BarChart3 className="size-3.5 text-emerald-400" />
                  {t(lang, 'comparison.agentBarChart')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {agentBarData.length > 0 ? (
                  <div className="comparison-chart-overlay">
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={agentBarData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--vl-border-subtle)" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--vl-text-muted)' }} />
                        <YAxis tick={{ fontSize: 10, fill: 'var(--vl-text-muted)' }} />
                        <Tooltip
                          contentStyle={{
                            background: 'var(--vl-bg-secondary)',
                            border: '1px solid var(--vl-border)',
                            borderRadius: '8px',
                            fontSize: '11px',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                        <Bar dataKey={nameA} fill="#10b981" radius={[2, 2, 0, 0]} />
                        <Bar dataKey={nameB} fill="#3b82f6" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-[11px] vl-text-muted text-center py-6">{t(lang, 'comparison.noData')}</p>
                )}
              </CardContent>
            </Card>

            {/* Round-by-Round Progress Line Chart */}
            <Card className="vl-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs vl-text-heading flex items-center gap-1.5">
                  <TrendingUp className="size-3.5 text-blue-400" />
                  {t(lang, 'comparison.roundProgress')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {roundProgressData.length > 0 ? (
                  <div className="comparison-chart-overlay">
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={roundProgressData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--vl-border-subtle)" />
                        <XAxis dataKey="round" tick={{ fontSize: 10, fill: 'var(--vl-text-muted)' }} />
                        <YAxis tick={{ fontSize: 10, fill: 'var(--vl-text-muted)' }} />
                        <Tooltip
                          contentStyle={{
                            background: 'var(--vl-bg-secondary)',
                            border: '1px solid var(--vl-border)',
                            borderRadius: '8px',
                            fontSize: '11px',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                        <Line type="monotone" dataKey={nameA} stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey={nameB} stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-[11px] vl-text-muted text-center py-6">{t(lang, 'comparison.noData')}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Word Cloud Comparison */}
          <Card className="vl-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs vl-text-heading flex items-center gap-1.5">
                <Cloud className="size-3.5 text-violet-400" />
                {t(lang, 'comparison.wordCloud')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Meeting A unique words */}
                <div className="comparison-chart-overlay">
                  <div className="text-[10px] font-medium text-emerald-400 mb-2">{t(lang, 'comparison.meetingAWords')}</div>
                  <div className="comparison-word-cloud">
                    {wordCloudData.uniqueA.length > 0
                      ? wordCloudData.uniqueA.map(w => (
                          <WordCloudItem key={w.word} word={w.word} count={w.count} variant="a" />
                        ))
                      : <span className="text-[10px] vl-text-muted">—</span>
                    }
                  </div>
                </div>
                {/* Common words */}
                <div className="comparison-chart-overlay border-amber-500/30">
                  <div className="text-[10px] font-medium text-amber-400 mb-2">{t(lang, 'comparison.commonWords')}</div>
                  <div className="comparison-word-cloud">
                    {wordCloudData.common.length > 0
                      ? wordCloudData.common.map(w => (
                          <WordCloudItem key={w.word} word={w.word} count={w.count} variant="common" />
                        ))
                      : <span className="text-[10px] vl-text-muted">{t(lang, 'common.noOverlap')}</span>
                    }
                  </div>
                </div>
                {/* Meeting B unique words */}
                <div className="comparison-chart-overlay">
                  <div className="text-[10px] font-medium text-blue-400 mb-2">{t(lang, 'comparison.meetingBWords')}</div>
                  <div className="comparison-word-cloud">
                    {wordCloudData.uniqueB.length > 0
                      ? wordCloudData.uniqueB.map(w => (
                          <WordCloudItem key={w.word} word={w.word} count={w.count} variant="b" />
                        ))
                      : <span className="text-[10px] vl-text-muted">—</span>
                    }
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sentiment Comparison */}
          <Card className="vl-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs vl-text-heading flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-amber-400" />
                {t(lang, 'comparison.sentiment')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col items-center">
                  <div className="text-[10px] font-medium text-emerald-400 mb-2">{nameA}</div>
                  <SentimentGauge
                    score={sentimentA.score}
                    label={t(lang, `comparison.${sentimentA.label}`)}
                    lang={lang}
                  />
                </div>
                <div className="flex flex-col items-center">
                  <div className="text-[10px] font-medium text-blue-400 mb-2">{nameB}</div>
                  <SentimentGauge
                    score={sentimentB.score}
                    label={t(lang, `comparison.${sentimentB.label}`)}
                    lang={lang}
                  />
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 mt-3">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                  {t(lang, 'comparison.positive')}: {sentimentA.score > sentimentB.score ? nameA : nameB}
                </Badge>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px]">
                  {t(lang, 'comparison.negative')}: {sentimentA.score < sentimentB.score ? nameA : nameB}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Topic Extraction Keywords */}
          {(meetingA?.summary || meetingB?.summary) && (
            <Card className="vl-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs vl-text-heading flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-amber-400" />
                  {t(lang, 'comparison.topKeywords')}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] font-medium text-emerald-400 mb-2">{nameA}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {extractKeywords(meetingA?.summary || '').map(k => (
                      <span key={k} className="diff-keyword-pill unique-a">{k}</span>
                    ))}
                    {extractKeywords(meetingA?.summary || '').length === 0 && (
                      <span className="text-[10px] vl-text-muted">—</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-medium text-blue-400 mb-2">{nameB}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {extractKeywords(meetingB?.summary || '').map(k => (
                      <span key={k} className="diff-keyword-pill unique-b">{k}</span>
                    ))}
                    {extractKeywords(meetingB?.summary || '').length === 0 && (
                      <span className="text-[10px] vl-text-muted">—</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
