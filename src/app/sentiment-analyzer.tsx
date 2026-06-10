'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  SmilePlus, Frown, Meh, TrendingUp, Hash, Type,
  Brain, BarChart3, Loader2, BookOpen,
  ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, LineChart, Line,
  Tooltip as RechartsTooltip,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { t } from '@/lib/i18n'

// ── Types ──
interface SentimentData {
  positive: number
  neutral: number
  negative: number
}

interface TopicFrequency {
  word: string
  count: number
}

interface SentimentTimelinePoint {
  index: number
  round: number
  score: number
  positive: number
  negative: number
}

interface PerAgentSentiment {
  agent: string
  positive: number
  neutral: number
  negative: number
  total: number
}

interface MessageLengthBucket {
  range: string
  min: number
  max: number
  count: number
}

interface VocabularyDiversity {
  totalWords: number
  uniqueWords: number
  diversityRatio: number
  trend: string
}

interface SentimentAnalyticsData {
  sentiment: SentimentData
  topicFrequency: TopicFrequency[]
  sentimentTimeline: SentimentTimelinePoint[]
  perAgentSentiment: PerAgentSentiment[]
  messageLengthDistribution: MessageLengthBucket[]
  vocabularyDiversity: VocabularyDiversity
}

// ── Animated Gauge Meter ──
function SentimentGauge({
  value,
  label,
  type,
}: {
  value: number
  label: string
  type: 'positive' | 'neutral' | 'negative'
}) {
  const colors = {
    positive: { bar: '#10b981', glow: 'rgba(16,185,129,0.3)' },
    neutral: { bar: '#64748b', glow: 'rgba(100,116,139,0.2)' },
    negative: { bar: '#ef4444', glow: 'rgba(239,68,68,0.3)' },
  }

  const icons = { positive: SmilePlus, neutral: Meh, negative: Frown }

  const Icon = icons[type]
  const color = colors[type]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center gap-3"
    >
      <div className="relative w-20 h-20 rounded-full border-2 border-[var(--vl-border-subtle)] flex items-center justify-center"
        style={{ boxShadow: `0 0 20px ${color.glow}` }}
      >
        <div className="absolute inset-1 rounded-full overflow-hidden" style={{ background: 'var(--vl-bg-inner)' }}>
          <motion.div
            initial={{ height: '0%' }}
            animate={{ height: `${Math.min(100, value)}%` }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
            className="absolute bottom-0 left-0 right-0"
            style={{ background: color.bar }}
          />
        </div>
        <div className="relative z-10 flex flex-col items-center">
          <Icon className="size-4" style={{ color: color.bar }} />
          <span className="text-sm font-bold vl-text-heading mt-0.5">{value}%</span>
        </div>
      </div>
      <span className="text-xs font-medium capitalize vl-text-heading">{label}</span>
    </motion.div>
  )
}

// ── Sentiment Timeline ──
function SentimentTimelineChart({ data }: { data: SentimentTimelinePoint[] }) {
  if (!data?.length) {
    return <p className="text-sm vl-text-muted text-center py-8">No messages to analyze</p>
  }

  const chartData = data.map((d) => ({
    index: d.index,
    round: d.round,
    score: d.score,
    pos: d.positive,
    neg: d.negative,
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="posGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="negGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--vl-chart-grid)" />
        <XAxis dataKey="index" tick={{ fill: 'var(--vl-chart-axis)', fontSize: 11 }} label={{ value: 'Message #', position: 'insideBottom', offset: -5, fill: 'var(--vl-text-muted)', fontSize: 11 }} />
        <YAxis tick={{ fill: 'var(--vl-chart-axis)', fontSize: 11 }} domain={[-1, 1]} tickFormatter={(v: number) => v === 1 ? '+' : v === -1 ? '-' : '0'} />
        <RechartsTooltip
          contentStyle={{ background: 'var(--vl-bg-card)', border: '1px solid var(--vl-border)', borderRadius: 8, fontSize: 12 }}
          formatter={(value: number, name: string) => {
            if (name === 'score') return [value === 1 ? 'Positive' : value === -1 ? 'Negative' : 'Neutral', 'Sentiment']
            return [value, name === 'pos' ? 'Positive words' : 'Negative words']
          }}
        />
        <Line type="stepAfter" dataKey="score" stroke="#10b981" strokeWidth={2} dot={false} name="score" />
        <Line type="monotone" dataKey="pos" stroke="#10b981" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="pos" />
        <Line type="monotone" dataKey="neg" stroke="#ef4444" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="neg" />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ── Per-Agent Radar Chart ──
function AgentRadarChart({ data }: { data: PerAgentSentiment[] }) {
  if (!data?.length) {
    return <p className="text-sm vl-text-muted text-center py-8">No agent data available</p>
  }

  const radarData = [
    { dimension: 'Positive', ...Object.fromEntries(data.map((a) => [a.agent, a.positive])) },
    { dimension: 'Neutral', ...Object.fromEntries(data.map((a) => [a.agent, a.neutral])) },
    { dimension: 'Negative', ...Object.fromEntries(data.map((a) => [a.agent, a.negative])) },
  ]

  const COLORS = ['#10b981', '#06b6d4', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899']

  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
        <PolarGrid stroke="var(--vl-chart-grid)" />
        <PolarAngleAxis dataKey="dimension" tick={{ fill: 'var(--vl-chart-axis)', fontSize: 12 }} />
        <PolarRadiusAxis tick={{ fill: 'var(--vl-chart-axis)', fontSize: 10 }} domain={[0, 100]} />
        <RechartsTooltip
          contentStyle={{ background: 'var(--vl-bg-card)', border: '1px solid var(--vl-border)', borderRadius: 8, fontSize: 12 }}
        />
        {data.slice(0, 5).map((agent, idx) => (
          <Radar
            key={agent.agent}
            name={agent.agent}
            dataKey={agent.agent}
            stroke={COLORS[idx % COLORS.length]}
            fill={COLORS[idx % COLORS.length]}
            fillOpacity={0.15}
            strokeWidth={2}
          />
        ))}
      </RadarChart>
    </ResponsiveContainer>
  )
}

// ── Keyword Table with Frequency Bars ──
function KeywordTable({ data }: { data: TopicFrequency[] }) {
  if (!data?.length) {
    return <p className="text-sm vl-text-muted text-center py-8">No topics extracted</p>
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1)

  return (
    <div className="analytics-scrollable space-y-1.5" style={{ maxHeight: 320 }}>
      {data.slice(0, 15).map((item, idx) => (
        <motion.div
          key={item.word}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.03 }}
          className="flex items-center gap-2"
        >
          <span className="text-[10px] vl-text-muted w-5 text-right">{idx + 1}</span>
          <span className="text-xs font-medium vl-text-heading w-24 truncate">{item.word}</span>
          <div className="flex-1 h-4 rounded-sm overflow-hidden vl-inner">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(item.count / maxCount) * 100}%` }}
              transition={{ duration: 0.6, ease: 'easeOut', delay: idx * 0.03 }}
              className="h-full rounded-sm bg-gradient-to-r from-emerald-500 to-emerald-400"
            />
          </div>
          <span className="text-[10px] vl-text-muted w-8 text-right">{item.count}</span>
        </motion.div>
      ))}
    </div>
  )
}

// ── Word Cloud ──
function WordCloud({ data }: { data: TopicFrequency[] }) {
  if (!data?.length) {
    return <p className="text-sm vl-text-muted text-center py-8">No words to display</p>
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1)
  const getSizeClass = (count: number): string => {
    const ratio = count / maxCount
    if (ratio >= 0.7) return 'size-xl'
    if (ratio >= 0.5) return 'size-lg'
    if (ratio >= 0.3) return 'size-md'
    if (ratio >= 0.15) return 'size-sm'
    return 'size-xs'
  }

  const getSentiment = (_word: string): 'positive' | 'neutral' | 'negative' => {
    // Simple heuristic: common positive/negative words
    const positiveSet = new Set(['good', 'great', 'excellent', 'best', 'strong', 'effective', 'success', 'innovative', 'promising', 'novel', 'efficient', 'robust', 'improved', 'enhanced', 'significant', 'breakthrough', 'progress', 'potential', 'insight', 'recommend', 'proposed', 'optimal', 'superior'])
    const negativeSet = new Set(['bad', 'poor', 'weak', 'failure', 'problem', 'issue', 'concern', 'risk', 'challenge', 'difficult', 'complex', 'limited', 'lack', 'insufficient', 'gap', 'error', 'drawback', 'obstacle', 'warning', 'pitfall', 'caution'])
    const w = _word.toLowerCase()
    if (positiveSet.has(w)) return 'positive'
    if (negativeSet.has(w)) return 'negative'
    return 'neutral'
  }

  return (
    <div className="word-cloud-container">
      {data.slice(0, 25).map((item) => (
        <TooltipProvider key={item.word}>
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.span
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className={`word-cloud-item ${getSizeClass(item.count)} sentiment-${getSentiment(item.word)}`}
              >
                {item.word}
              </motion.span>
            </TooltipTrigger>
            <TooltipContent className="analytics-tooltip">
              <p className="text-xs font-medium">{item.word}</p>
              <p className="text-[10px] vl-text-muted">{item.count} occurrences</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  )
}

// ── Topic Clusters ──
function TopicClusters({ data }: { data: TopicFrequency[] }) {
  if (!data?.length) return null

  // Group by rough categories
  const categories: Record<string, TopicFrequency[]> = {
    'Research Methods': [],
    'Biological Terms': [],
    'Analysis & Results': [],
    'General Science': [],
  }

  const bioWords = new Set(['protein', 'protein', 'nanobody', 'antibody', 'binding', 'sequence', 'structure', 'domain', 'epitope', 'antigen', 'receptor', 'spike', 'virus', 'immune', 'cell', 'gene', 'genomic', 'molecular', 'amino', 'residue', 'sars', 'covid', 'affinity', 'stability', 'structural'])
  const methodWords = new Set(['computational', 'model', 'prediction', 'design', 'analysis', 'experimental', 'simulation', 'algorithm', 'approach', 'method', 'framework', 'technique', 'evaluation', 'validation', 'benchmark', 'dataset', 'training'])
  const analysisWords = new Set(['results', 'performance', 'accuracy', 'score', 'ranking', 'comparison', 'metric', 'output', 'finding', 'observation', 'correlation', 'distribution', 'trend', 'pattern', 'significant', 'statistical'])

  data.forEach((item) => {
    const w = item.word.toLowerCase()
    if (bioWords.has(w)) categories['Biological Terms'].push(item)
    else if (methodWords.has(w)) categories['Research Methods'].push(item)
    else if (analysisWords.has(w)) categories['Analysis & Results'].push(item)
    else categories['General Science'].push(item)
  })

  return (
    <div className="space-y-3">
      {Object.entries(categories)
        .filter(([, items]) => items.length > 0)
        .map(([category, items]) => (
          <div key={category}>
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 mb-1.5">{category}</h4>
            <div className="topic-cluster">
              {items.slice(0, 8).map((item) => (
                <span key={item.word} className="topic-tag">
                  {item.word}
                  <span className="text-[9px] opacity-60">({item.count})</span>
                </span>
              ))}
            </div>
          </div>
        ))}
    </div>
  )
}

// ── Message Length Distribution ──
function MessageLengthChart({ data }: { data: MessageLengthBucket[] }) {
  if (!data?.length) {
    return <p className="text-sm vl-text-muted text-center py-8">No message data</p>
  }

  const chartData = data.map((b) => ({
    range: b.range,
    count: b.count,
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="lengthGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.2} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--vl-chart-grid)" />
        <XAxis dataKey="range" tick={{ fill: 'var(--vl-chart-axis)', fontSize: 10 }} />
        <YAxis tick={{ fill: 'var(--vl-chart-axis)', fontSize: 11 }} allowDecimals={false} />
        <RechartsTooltip
          contentStyle={{ background: 'var(--vl-bg-card)', border: '1px solid var(--vl-border)', borderRadius: 8, fontSize: 12 }}
          formatter={(value: number) => [value, 'Messages']}
          labelFormatter={(label) => `${label} words`}
        />
        <Bar dataKey="count" fill="url(#lengthGradient)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Vocabulary Diversity ──
function VocabularyDiversityCard({ data }: { data: VocabularyDiversity }) {
  const trendIcon = data.trend === 'high' ? ArrowUpRight : data.trend === 'low' ? ArrowDownRight : Minus
  const TrendIcon = trendIcon
  const trendColor = data.trend === 'high' ? 'text-emerald-400' : data.trend === 'low' ? 'text-red-400' : 'text-slate-400'
  const trendLabel = data.trend === 'high' ? 'High diversity' : data.trend === 'low' ? 'Low diversity' : 'Medium'

  return (
    <div className="flex items-center gap-4">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs vl-text-muted">Unique / Total Words</span>
          <span className="text-sm font-bold vl-text-heading">{data.diversityRatio}%</span>
        </div>
        <div className="vocabulary-bar">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${data.diversityRatio}%` }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
            className="vocabulary-bar-fill"
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] vl-text-muted">
            {data.uniqueWords} unique / {data.totalWords} total words
          </span>
          <span className={`text-[10px] font-medium flex items-center gap-0.5 ${trendColor}`}>
            <TrendIcon className="size-3" />
            {trendLabel}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Section Wrapper ──
function Section({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className={`analytics-chart-container vl-card ${className || ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <Icon className="size-4 text-emerald-400" />
            </div>
            <CardTitle className="text-sm font-semibold vl-text-heading">{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">{children}</CardContent>
      </Card>
    </motion.div>
  )
}

// ════════════════════════════════════════════════════════════════
// Main Export: SentimentAnalyzer
// ════════════════════════════════════════════════════════════════
export function SentimentAnalyzer({ meetingId }: { meetingId?: string }) {
  const [data, setData] = useState<SentimentAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const fetchData = async () => {
      try {
        const url = meetingId ? `/api/meeting-analytics?meetingId=${meetingId}` : '/api/meeting-analytics'
        const res = await fetch(url)
        if (res.ok && !cancelled) {
          const json = await res.json()
          setData(json)
        }
      } catch (err) {
        if (!cancelled) toast.error('Failed to load sentiment data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [meetingId])

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl vl-card animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 rounded-xl vl-card animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Brain className="size-12 text-emerald-400/40" />
        <p className="vl-text-muted text-sm">No sentiment data available</p>
      </div>
    )
  }

  const sentiment = data?.sentiment

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* ── Sentiment Overview Gauges ── */}
      <Section title="Sentiment Overview" icon={SmilePlus}>
        <div className="flex items-center justify-around py-4">
          <SentimentGauge value={sentiment?.positive ?? 0} label="Positive" type="positive" />
          <SentimentGauge value={sentiment?.neutral ?? 0} label="Neutral" type="neutral" />
          <SentimentGauge value={sentiment?.negative ?? 0} label="Negative" type="negative" />
        </div>
        <div className="flex justify-center mt-2">
          <Badge variant="outline" className="text-[10px]">
            {data && data.sentiment.positive > data.sentiment.negative * 2
              ? 'Overall: Positive tone detected'
              : data && data.sentiment.negative > data.sentiment.positive * 2
                ? 'Overall: Negative tone detected'
                : 'Overall: Balanced tone'}
          </Badge>
        </div>
      </Section>

      {/* ── Charts Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 analytics-charts-grid">
        {/* Sentiment Timeline */}
        <Section title="Sentiment Timeline" icon={TrendingUp} className="lg:col-span-2">
          <SentimentTimelineChart data={data?.sentimentTimeline ?? []} />
        </Section>

        {/* Per-Agent Radar */}
        <Section title="Per-Agent Sentiment" icon={Brain}>
          <AgentRadarChart data={data?.perAgentSentiment ?? []} />
          <div className="flex flex-wrap justify-center gap-3 mt-3">
            {data?.perAgentSentiment.slice(0, 5).map((agent, idx) => {
              const colors = ['#10b981', '#06b6d4', '#f59e0b', '#8b5cf6', '#ef4444']
              return (
                <div key={agent.agent} className="flex items-center gap-1 text-[10px]">
                  <div className="w-2 h-2 rounded-full" style={{ background: colors[idx % colors.length] }} />
                  <span className="vl-text-muted">{agent.agent.length > 12 ? agent.agent.slice(0, 10) + '..' : agent.agent}</span>
                </div>
              )
            })}
          </div>
        </Section>

        {/* Keyword Table */}
        <Section title="Top Keywords" icon={Hash}>
          <KeywordTable data={data?.topicFrequency ?? []} />
        </Section>

        {/* Word Cloud */}
        <Section title="Word Cloud" icon={BookOpen} className="lg:col-span-2">
          <WordCloud data={data?.topicFrequency ?? []} />
        </Section>

        {/* Topic Clusters */}
        <Section title="Topic Clusters" icon={Type} className="lg:col-span-2">
          <TopicClusters data={data?.topicFrequency ?? []} />
        </Section>

        {/* Message Length Distribution */}
        <Section title="Message Length Distribution" icon={BarChart3}>
          <MessageLengthChart data={data?.messageLengthDistribution ?? []} />
        </Section>

        {/* Vocabulary Diversity */}
        <Section title="Vocabulary Diversity" icon={Type}>
          {data?.vocabularyDiversity && (
            <div className="py-4">
              <VocabularyDiversityCard data={data.vocabularyDiversity} />
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}

export default SentimentAnalyzer
