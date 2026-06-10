'use client'

import React, { useMemo } from 'react'
import {
  MessageSquare, Hash, Users, Clock, FileText, BarChart3,
  Brain, BookOpen, Type, Sparkles, TrendingUp, Cloud,
  Quote,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from 'recharts'

// ============================================================
// MeetingInsightsPanel — Deep per-meeting analytics
// ============================================================

interface MeetingInsightsPanelProps {
  meeting: {
    id: string
    type: string
    status: string
    agenda: string
    summary?: string
    createdAt: string
    updatedAt: string
  }
  messages: {
    id: string
    agentName: string
    agentColor?: string
    message: string
    roundIndex: number
    createdAt: string
  }[]
  lang?: string
}

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
  'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'may', 'might', 'can', 'shall', 'that', 'this', 'these', 'those', 'from',
  'into', 'about', 'it', 'its', 'we', 'our', 'they', 'them', 'their',
  'not', 'no', 'if', 'as', 'so', 'than', 'then', 'also', 'just', 'more',
  'some', 'any', 'all', 'each', 'every', 'both', 'few', 'most', 'other',
  'very', 'much', 'many', 'such', 'only', 'own', 'same', 'how', 'which',
  'what', 'when', 'where', 'who', 'whom', 'your', 'you', 'i', 'me', 'my',
])

const POSITIVE_WORDS = new Set([
  'good', 'great', 'excellent', 'success', 'achieve', 'improve', 'positive',
  'best', 'well', 'effective', 'promising', 'strong', 'advantage', 'benefit',
  'helpful', 'innovative', 'novel', 'robust', 'significant', 'important',
  'efficient', 'reliable', 'optimal', 'high', 'better', 'leading',
])

const NEGATIVE_WORDS = new Set([
  'bad', 'fail', 'poor', 'problem', 'issue', 'difficult', 'challenge',
  'negative', 'worst', 'lack', 'weak', 'limit', 'risk', 'concern', 'error',
  'wrong', 'decline', 'low', 'unclear', 'uncertain', 'limited', 'complex',
  'expensive', 'slow', 'complicated', 'trouble',
])

const CHART_COLORS = [
  '#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
]

/** Extract word frequency, excluding stop words */
function extractWordFrequency(text: string, topN: number = 20): { word: string; count: number }[] {
  const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 2 && !STOP_WORDS.has(w))
  const freq: Record<string, number> = {}
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1 })
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word, count]) => ({ word, count }))
}

/** Extract bigrams (two-word phrases) */
function extractBigrams(text: string, topN: number = 10): { phrase: string; count: number }[] {
  const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 2 && !STOP_WORDS.has(w))
  const bigrams: Record<string, number> = {}
  for (let i = 0; i < words.length - 1; i++) {
    const bigram = `${words[i]} ${words[i + 1]}`
    bigrams[bigram] = (bigrams[bigram] || 0) + 1
  }
  return Object.entries(bigrams)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([phrase, count]) => ({ phrase, count }))
}

/** Simple per-message sentiment score */
function computeMessageSentiment(message: string): number {
  const lower = message.toLowerCase()
  const words = lower.split(/\W+/)
  let posCount = 0
  let negCount = 0
  words.forEach(w => {
    if (POSITIVE_WORDS.has(w)) posCount++
    if (NEGATIVE_WORDS.has(w)) negCount++
  })
  const total = posCount + negCount
  if (total === 0) return 50
  return Math.round((posCount / total) * 100)
}

/** Format duration between two ISO strings */
function formatDuration(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (ms < 0 || isNaN(ms)) return '—'
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  if (minutes === 0) return `${seconds}s`
  return `${minutes}m ${seconds % 60}s`
}

/** Simple seeded random for consistent word cloud layout */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Empty state when there are no messages */
function EmptyState({ lang }: { lang: Lang }) {
  return (
    <div className="insights-card flex flex-col items-center justify-center py-12 px-4 text-center">
      <BarChart3 className="size-10 vl-text-muted mb-3 vl-float-animation" />
      <p className="text-sm font-medium vl-text-heading">{t(lang, 'meetingInsights.noMessages')}</p>
      <p className="text-xs vl-text-muted mt-1 max-w-[240px]">{t(lang, 'meetingInsights.noMessagesDesc')}</p>
    </div>
  )
}

/** Section card with optional title and description */
function SectionCard({
  title,
  description,
  icon,
  children,
  delay = 0,
  lang,
}: {
  title: string
  description?: string
  icon?: React.ReactNode
  children: React.ReactNode
  delay?: number
  lang: Lang
}) {
  return (
    <div
      className="insights-card"
      style={{ animation: `insights-fade-in 0.4s ease forwards ${delay}s`, opacity: 0 }}
    >
      {(title || icon) && (
        <div className="flex items-center gap-2 mb-3">
          {icon && <span className="text-emerald-400">{icon}</span>}
          {title && <h3 className="text-xs font-semibold vl-text-heading">{title}</h3>}
        </div>
      )}
      {description && <p className="text-[10px] vl-text-muted mb-3">{description}</p>}
      {children}
    </div>
  )
}

/** Reusable chart tooltip style */
const tooltipStyle: React.CSSProperties = {
  background: 'var(--vl-bg-secondary)',
  border: '1px solid var(--vl-border)',
  borderRadius: '8px',
  fontSize: '11px',
  color: 'var(--vl-text-secondary)',
}

const legendStyle: React.CSSProperties = {
  fontSize: '10px',
  color: 'var(--vl-text-muted)',
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function MeetingInsightsPanel({
  meeting,
  messages,
  lang = 'en',
}: MeetingInsightsPanelProps) {
  const L = lang as Lang

  // ── Derived data ────────────────────────────────────────────────────────

  const totalMessages = messages.length

  const totalWords = useMemo(() => {
    return messages.reduce((s, m) => s + m.message.split(/\s+/).filter(Boolean).length, 0)
  }, [messages])

  const avgWordsPerMessage = totalMessages > 0 ? Math.round(totalWords / totalMessages) : 0

  const uniqueParticipants = useMemo(() => {
    return [...new Set(messages.map(m => m.agentName))]
  }, [messages])

  const duration = useMemo(() => formatDuration(meeting.createdAt, meeting.updatedAt), [meeting.createdAt, meeting.updatedAt])

  const summaryLength = (meeting.summary || '').length

  // Speaker participation data for pie chart
  const speakerData = useMemo(() => {
    const counts: Record<string, number> = {}
    messages.forEach(m => {
      counts[m.agentName] = (counts[m.agentName] || 0) + 1
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }))
  }, [messages])

  // Speaker turn data for stacked bar
  const turnData = useMemo(() => {
    return messages.map((m, idx) => ({
      index: idx + 1,
      speaker: m.agentName,
    }))
  }, [messages])

  // Sentiment trend data per message
  const sentimentData = useMemo(() => {
    return messages.map((m, idx) => ({
      index: idx + 1,
      score: computeMessageSentiment(m.message),
      preview: m.message.slice(0, 30),
      speaker: m.agentName,
    }))
  }, [messages])

  // Word cloud data
  const wordCloudData = useMemo(() => {
    const allText = messages.map(m => m.message).join(' ') + ' ' + (meeting.summary || '')
    return extractWordFrequency(allText, 20)
  }, [messages, meeting.summary])

  // Key phrases data
  const keyPhrases = useMemo(() => {
    const allText = messages.map(m => m.message).join(' ') + ' ' + (meeting.summary || '')
    return extractBigrams(allText, 10)
  }, [messages, meeting.summary])

  // Readability metrics
  const readability = useMemo(() => {
    if (messages.length === 0) return { avgSentenceLen: 0, vocabRichness: 0, avgMsgLen: 0 }

    const allText = messages.map(m => m.message).join(' ')
    const sentences = allText.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const avgSentenceLen = sentences.length > 0
      ? Math.round(sentences.reduce((s, sent) => s + sent.split(/\s+/).filter(Boolean).length, 0) / sentences.length)
      : 0

    const allWords = allText.toLowerCase().split(/\W+/).filter(Boolean)
    const uniqueWords = new Set(allWords)
    const vocabRichness = allWords.length > 0
      ? Math.round((uniqueWords.size / allWords.length) * 100)
      : 0

    const avgMsgLen = Math.round(messages.reduce((s, m) => s + m.message.length, 0) / messages.length)

    return { avgSentenceLen, vocabRichness, avgMsgLen }
  }, [messages])

  // ── Empty state ────────────────────────────────────────────────────────

  if (totalMessages === 0) {
    return <EmptyState lang={L} />
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* ─── (a) Overview Stats Grid (2×3) ──────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 card-entrance-cascade">
        {[
          {
            icon: <MessageSquare className="size-4" />,
            value: totalMessages,
            label: t(L, 'meetingInsights.totalMessages'),
          },
          {
            icon: <Type className="size-4" />,
            value: totalWords,
            label: t(L, 'meetingInsights.totalWords'),
          },
          {
            icon: <FileText className="size-4" />,
            value: avgWordsPerMessage,
            label: t(L, 'meetingInsights.avgWordsPerMessage'),
          },
          {
            icon: <Users className="size-4" />,
            value: uniqueParticipants.length,
            label: t(L, 'meetingInsights.uniqueParticipants'),
          },
          {
            icon: <Clock className="size-4" />,
            value: duration,
            label: t(L, 'meetingInsights.discussionDuration'),
            isText: true,
          },
          {
            icon: <BookOpen className="size-4" />,
            value: summaryLength,
            label: t(L, 'meetingInsights.summaryLength'),
          },
        ].map((stat) => (
          <div key={stat.label} className="insights-stat-card">
            <div className="insights-stat-icon">{stat.icon}</div>
            <div
              className="insights-stat-number"
              style={{ animation: 'metric-count-up 0.5s ease forwards' }}
            >
              {stat.value}{stat.label === t(L, 'meetingInsights.summaryLength') && !stat.isText ? '' : ''}
            </div>
            <div className="insights-stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ─── (b) Speaker Participation Pie Chart ──────────────────────── */}
      <SectionCard
        title={t(L, 'meetingInsights.speakerParticipation')}
        description={t(L, 'meetingInsights.speakerParticipationDesc')}
        icon={<PieChart className="size-4" />}
        delay={0.1}
        lang={L}
      >
        {speakerData.length > 0 ? (
          <div style={{ animation: 'chart-grow-in 0.6s ease forwards' }}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={speakerData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: 'var(--vl-border-subtle)', strokeWidth: 1 }}
                >
                  {speakerData.map((_, idx) => (
                    <Cell
                      key={`cell-${idx}`}
                      fill={CHART_COLORS[idx % CHART_COLORS.length]}
                      stroke="var(--vl-bg-card)"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number) => [
                    t(L, 'meetingInsights.messages').replace('{count}', String(value)).replace(' ({pct}%)', ''),
                    t(L, 'meetingInsights.speakerParticipation'),
                  ]}
                />
                <Legend wrapperStyle={legendStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-[11px] vl-text-muted text-center py-6">{t(L, 'common.noData')}</p>
        )}
      </SectionCard>

      {/* ─── (c) Speaker Turn Analysis ──────────────────────────────── */}
      <SectionCard
        title={t(L, 'meetingInsights.speakerTurnAnalysis')}
        description={t(L, 'meetingInsights.speakerTurnDesc')}
        icon={<BarChart3 className="size-4" />}
        delay={0.15}
        lang={L}
      >
        {turnData.length > 0 ? (
          <ScrollArea className="max-h-64">
            <div style={{ animation: 'chart-grow-in 0.6s ease forwards' }}>
              <ResponsiveContainer width="100%" height={Math.max(180, Math.min(300, turnData.length * 22))}>
                <BarChart
                  data={turnData}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--vl-border-subtle)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 9, fill: 'var(--vl-text-muted)' }} />
                  <YAxis
                    type="category"
                    dataKey="index"
                    tick={{ fontSize: 9, fill: 'var(--vl-text-muted)' }}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: any, _name: any, props: any) => [props?.payload?.speaker ?? '', `Msg #${value}`]}
                  />
                  <Bar dataKey="index" name="speaker" radius={[0, 3, 3, 0]}>
                    {turnData.map((entry, idx) => {
                      const speakerIdx = uniqueParticipants.indexOf(entry.speaker)
                      return (
                        <Cell
                          key={`turn-${idx}`}
                          fill={CHART_COLORS[speakerIdx >= 0 ? speakerIdx : 0]}
                        />
                      )
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ScrollArea>
        ) : (
          <p className="text-[11px] vl-text-muted text-center py-6">{t(L, 'common.noData')}</p>
        )}
      </SectionCard>

      {/* ─── (d) Sentiment Trend Line Chart ──────────────────────────────── */}
      <SectionCard
        title={t(L, 'meetingInsights.sentimentTrend')}
        description={t(L, 'meetingInsights.sentimentTrendDesc')}
        icon={<TrendingUp className="size-4" />}
        delay={0.2}
        lang={L}
      >
        {sentimentData.length > 0 ? (
          <ScrollArea className="max-h-64">
            <div style={{ animation: 'chart-grow-in 0.6s ease forwards' }}>
              <ResponsiveContainer width="100%" height={Math.max(180, Math.min(280, sentimentData.length * 25))}>
                <LineChart data={sentimentData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--vl-border-subtle)" />
                  <XAxis dataKey="index" tick={{ fontSize: 9, fill: 'var(--vl-text-muted)' }} label={{ value: 'Msg #', position: 'insideBottomRight', offset: -5, fontSize: 9, fill: 'var(--vl-text-muted)' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: 'var(--vl-text-muted)' }} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(score: any, _name: any) => {
                      const s = typeof score === 'number' ? score : 50
                      const label = s > 60 ? t(L, 'meetingInsights.positive') : s < 40 ? t(L, 'meetingInsights.negative') : t(L, 'meetingInsights.neutral')
                      return [`${label}: ${s}`, 'Sentiment']
                    }}
                    labelFormatter={(label: string) => {
                      const d = sentimentData[parseInt(label) - 1]
                      return d ? `Msg #${label} — ${d.speaker}` : String(label)
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={(props: Record<string, unknown>) => {
                      const { cx, cy, payload } = props as { cx: number; cy: number; payload: { score: number } }
                      const fill = payload.score > 60 ? '#10b981' : payload.score < 40 ? '#ef4444' : '#f59e0b'
                      return (
                        <circle
                          key={`sent-dot-${props.index}`}
                          cx={cx}
                          cy={cy}
                          r={3.5}
                          fill={fill}
                          stroke="var(--vl-bg-card)"
                          strokeWidth={1.5}
                        />
                      )
                    }}
                    activeDot={{ r: 5, stroke: '#10b981', strokeWidth: 2 }}
                  />
                  <Legend
                    wrapperStyle={legendStyle}
                    payload={[{ value: 'Sentiment Score', type: 'line', color: '#10b981' }]}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ScrollArea>
        ) : (
          <p className="text-[11px] vl-text-muted text-center py-6">{t(L, 'meetingInsights.noSentimentData')}</p>
        )}
      </SectionCard>

      {/* ─── (e) Topic Word Cloud (CSS-only) ────────────────────────── */}
      <SectionCard
        title={t(L, 'meetingInsights.topicWordCloud')}
        description={t(L, 'meetingInsights.topicWordCloudDesc')}
        icon={<Cloud className="size-4" />}
        delay={0.25}
        lang={L}
      >
        {wordCloudData.length > 0 ? (
          <div className="word-cloud-container">
            {wordCloudData.map((item, idx) => {
              const maxCount = wordCloudData[0]?.count || 1
              const minCount = wordCloudData[wordCloudData.length - 1]?.count || 1
              const range = maxCount - minCount || 1
              const normalized = (item.count - minCount) / range
              const fontSize = 0.65 + normalized * 1.35 // 0.65rem to 2rem
              const opacity = 0.5 + normalized * 0.5
              const rotation = seededRandom(idx * 7 + 1) > 0.7
                ? (seededRandom(idx * 3 + 2) > 0.5 ? -12 : 12)
                : 0

              // Gradient colors: emerald → cyan
              const hue = 160 + normalized * 30 // 160 (emerald) to 190 (cyan)
              const saturation = 60 + normalized * 20
              const lightness = 40 + (1 - normalized) * 15

              return (
                <span
                  key={item.word}
                  className="word-cloud-word"
                  style={{
                    fontSize: `${fontSize}rem`,
                    opacity,
                    color: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
                    transform: `rotate(${rotation}deg)`,
                    animation: `word-cloud-float ${3 + seededRandom(idx * 13) * 3}s ease-in-out infinite`,
                    animationDelay: `${seededRandom(idx * 17) * 2}s`,
                  }}
                  title={`${item.word}: ${item.count}`}
                >
                  {item.word}
                </span>
              )
            })}
          </div>
        ) : (
          <p className="text-[11px] vl-text-muted text-center py-6">{t(L, 'meetingInsights.noTopics')}</p>
        )}
      </SectionCard>

      {/* ─── (f) Readability Metrics ───────────────────────────────────── */}
      <SectionCard
        title={t(L, 'meetingInsights.readability')}
        description={t(L, 'meetingInsights.readabilityDesc')}
        icon={<Brain className="size-4" />}
        delay={0.3}
        lang={L}
      >
        {messages.length > 0 ? (
          <div>
            {/* Avg sentence length */}
            <div className="insights-metric">
              <div className="insights-metric-icon">
                <FileText className="size-4" />
              </div>
              <div className="insights-metric-content">
                <div className="insights-metric-label">{t(L, 'meetingInsights.avgSentenceLength')}</div>
                <div className="insights-metric-value">{readability.avgSentenceLen} <span className="text-[10px] vl-text-muted font-normal">{t(L, 'meetingInsights.words').replace('{count}', '').replace(' 个词', '').trim()}</span></div>
                <div className="insights-metric-desc">{t(L, 'meetingInsights.avgSentenceLengthDesc')}</div>
              </div>
            </div>

            {/* Vocabulary richness */}
            <div className="insights-metric">
              <div className="insights-metric-icon">
                <BookOpen className="size-4" />
              </div>
              <div className="insights-metric-content">
                <div className="insights-metric-label">{t(L, 'meetingInsights.vocabularyRichness')}</div>
                <div className="insights-metric-value">{readability.vocabRichness}%</div>
                <div className="insights-metric-desc">{t(L, 'meetingInsights.vocabularyRichnessDesc')}</div>
              </div>
            </div>

            {/* Avg message length */}
            <div className="insights-metric">
              <div className="insights-metric-icon">
                <MessageSquare className="size-4" />
              </div>
              <div className="insights-metric-content">
                <div className="insights-metric-label">{t(L, 'meetingInsights.avgMessageLength')}</div>
                <div className="insights-metric-value">{readability.avgMsgLen} <span className="text-[10px] vl-text-muted font-normal">{t(L, 'meetingInsights.characters').replace('{count}', '').replace(' 个字符', '').replace(' characters', '').trim()}</span></div>
                <div className="insights-metric-desc">{t(L, 'meetingInsights.avgMessageLengthDesc')}</div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-[11px] vl-text-muted text-center py-6">{t(L, 'meetingInsights.noReadabilityData')}</p>
        )}
      </SectionCard>

      {/* ─── (g) Key Phrases (Bigrams) ─────────────────────────────────── */}
      <SectionCard
        title={t(L, 'meetingInsights.keyPhrases')}
        description={t(L, 'meetingInsights.keyPhrasesDesc')}
        icon={<Quote className="size-4" />}
        delay={0.35}
        lang={L}
      >
        {keyPhrases.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {keyPhrases.map((item, idx) => (
              <span
                key={item.phrase}
                className="key-phrase-badge"
                style={{ animation: `phrase-highlight 2s ease ${idx * 0.15}s infinite` }}
              >
                {item.phrase}
                <span className="phrase-count">{item.count}</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[11px] vl-text-muted text-center py-6">{t(L, 'meetingInsights.noKeyPhrases')}</p>
        )}
      </SectionCard>
    </div>
  )
}
