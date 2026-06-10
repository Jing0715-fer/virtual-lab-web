'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  GitCompareArrows, BarChart3, Users, MessageSquare, Download,
  ChevronDown, ChevronUp, AlertTriangle, Lightbulb,
  Hash, Clock, CheckCircle2, X, FileJson, TrendingUp, Loader2,
  Layers,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip as RechartsTooltip, Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { t } from '@/lib/i18n'

// ── Types ──
interface MeetingBasic {
  id: string
  type: string
  agenda: string
  status: string
  summary: string | null
  saveName: string
  createdAt: string
  updatedAt: string
  numRounds: number | null
  temperature: number
  messages: { id: string; agentName: string; message: string; roundIndex: number; createdAt: string }[]
}

interface ComparisonData {
  sharedAgents: string[]
  sharedTopics: string[]
  lengthComparison: { id: string; messageCount: number; wordCount: number; duration: string }[]
  participationMatrix: { agentName: string; [meetingId: string]: number }[]
  sentimentOverview: Record<string, 'positive' | 'neutral' | 'negative'>
  keyDifferences: string[]
  recommendations: string[]
}

interface ComparisonResult {
  meetings: MeetingBasic[]
  comparison: ComparisonData
}

const MEETING_COLORS = ['#10b981', '#06b6d4', '#f59e0b', '#8b5cf6', '#ef4444']

// ── Meeting Selector Chip ──
function MeetingChip({
  meeting,
  selected,
  index,
  onToggle,
}: {
  meeting: MeetingBasic
  selected: boolean
  index: number
  onToggle: () => void
}) {
  const color = MEETING_COLORS[index % MEETING_COLORS.length]
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onToggle}
      className={`meeting-select-chip ${selected ? 'selected' : ''}`}
      style={selected ? { borderColor: color, background: `${color}15`, color } : undefined}
    >
      <div className="w-2 h-2 rounded-full" style={{ background: selected ? color : 'var(--vl-text-muted)' }} />
      <span className="text-xs truncate max-w-[120px]">
        {meeting.saveName || `Meeting ${meeting.id.slice(0, 6)}`}
      </span>
      <Badge
        variant="outline"
        className="text-[9px] px-1 py-0"
        style={selected ? { borderColor: `${color}40`, color } : undefined}
      >
        {meeting.messages?.length || 0} msgs
      </Badge>
      {selected && <X className="size-3" />}
    </motion.button>
  )
}

// ── Duration Bars ──
function DurationComparison({ data, meetings }: { data: ComparisonData['lengthComparison']; meetings: MeetingBasic[] }) {
  if (!data?.length) return null
  const chartData = data.map((d, idx) => ({
    name: meetings[idx]?.saveName?.slice(0, 16) || `M${idx + 1}`,
    messages: d.messageCount,
    words: Math.round(d.wordCount / 10),
    color: MEETING_COLORS[idx % MEETING_COLORS.length],
  }))

  return (
    <div>
      <h4 className="text-xs font-semibold vl-text-heading mb-3 flex items-center gap-1.5">
        <MessageSquare className="size-3.5 text-emerald-400" /> Duration & Volume
      </h4>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} margin={{ left: 0, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--vl-chart-grid)" />
          <XAxis dataKey="name" tick={{ fill: 'var(--vl-chart-axis)', fontSize: 11 }} />
          <YAxis tick={{ fill: 'var(--vl-chart-axis)', fontSize: 11 }} />
          <RechartsTooltip
            contentStyle={{ background: 'var(--vl-bg-card)', border: '1px solid var(--vl-border)', borderRadius: 8, fontSize: 12 }}
            formatter={(value: number, name: string) => [value, name === 'messages' ? 'Messages' : 'Words (×10)']}
          />
          <Bar dataKey="messages" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, idx) => (
              <Cell key={idx} fill={entry.color} />
            ))}
          </Bar>
          <Bar dataKey="words" radius={[4, 4, 0, 0]} fillOpacity={0.5}>
            {chartData.map((entry, idx) => (
              <Cell key={idx} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Import Cell from recharts ──
import { Cell } from 'recharts'

// ── Participation Grouped Bar ──
function ParticipationComparison({ matrix, meetings }: { matrix: ComparisonData['participationMatrix']; meetings: MeetingBasic[] }) {
  if (!matrix?.length || !meetings?.length) return null

  const agentNames = matrix.map((m) => m.agentName)
  const chartData = agentNames.map((agent, aIdx) => {
    const row: Record<string, string | number> = { name: agent.length > 14 ? agent.slice(0, 12) + '...' : agent }
    meetings.forEach((m, mIdx) => {
      row[`m${mIdx}`] = matrix[aIdx]?.[m.id] || 0
    })
    return row
  })

  return (
    <div>
      <h4 className="text-xs font-semibold vl-text-heading mb-3 flex items-center gap-1.5">
        <Users className="size-3.5 text-cyan-400" /> Agent Participation
      </h4>
      <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 32)}>
        <BarChart layout="vertical" data={chartData} margin={{ left: 10, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--vl-chart-grid)" />
          <XAxis type="number" tick={{ fill: 'var(--vl-chart-axis)', fontSize: 11 }} />
          <YAxis type="category" dataKey="name" tick={{ fill: 'var(--vl-chart-axis)', fontSize: 11 }} width={110} />
          <RechartsTooltip
            contentStyle={{ background: 'var(--vl-bg-card)', border: '1px solid var(--vl-border)', borderRadius: 8, fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {meetings.map((m, idx) => (
            <Bar
              key={m.id}
              dataKey={`m${idx}`}
              fill={MEETING_COLORS[idx % MEETING_COLORS.length]}
              radius={[0, 4, 4, 0]}
              barSize={12}
              name={m.saveName?.slice(0, 14) || `Meeting ${idx + 1}`}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Sentiment Comparison ──
function SentimentComparison({ overview, meetings }: { overview: ComparisonData['sentimentOverview']; meetings: MeetingBasic[] }) {
  if (!overview || !meetings?.length) return null

  const sentimentColors = { positive: '#10b981', neutral: '#64748b', negative: '#ef4444' }

  return (
    <div>
      <h4 className="text-xs font-semibold vl-text-heading mb-3 flex items-center gap-1.5">
        <Layers className="size-3.5 text-amber-400" /> Sentiment Overview
      </h4>
      <div className="flex gap-4 flex-wrap">
        {meetings.map((m, idx) => {
          const sentiment = overview[m.id]
          if (!sentiment) return null
          const color = sentimentColors[sentiment]
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg vl-inner border border-[var(--vl-border-subtle)]"
            >
              <div className="w-3 h-3 rounded-full" style={{ background: color }} />
              <span className="text-xs font-medium capitalize" style={{ color }}>
                {sentiment}
              </span>
              <span className="text-[10px] vl-text-muted">
                ({m.saveName?.slice(0, 12) || `M${idx + 1}`})
              </span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// ── Topic Bars (Venn concept) ──
function TopicComparison({ topics, meetings }: { topics: string[]; meetings: MeetingBasic[] }) {
  if (!topics?.length || !meetings?.length) return null

  return (
    <div>
      <h4 className="text-xs font-semibold vl-text-heading mb-3 flex items-center gap-1.5">
        <Hash className="size-3.5 text-violet-400" /> Shared Topics
      </h4>
      {topics.length === 0 ? (
        <p className="text-xs vl-text-muted">No shared topics found between selected meetings</p>
      ) : (
        <div className="topic-cluster">
          {topics.slice(0, 15).map((topic, idx) => (
            <span key={idx} className="topic-tag">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {topic}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Efficiency Bars ──
function EfficiencyComparison({ lengthData, meetings }: { lengthData: ComparisonData['lengthComparison']; meetings: MeetingBasic[] }) {
  if (!lengthData?.length) return null

  const maxRounds = Math.max(...meetings.map((m) => {
    const rounds = [...new Set(m.messages.map((msg) => msg.roundIndex))]
    return rounds.length
  }), 1)

  const efficiencyData = meetings.map((m, idx) => {
    const rounds = [...new Set(m.messages.map((msg) => msg.roundIndex))].length
    const msgsPerRound = rounds > 0 ? m.messages.length / rounds : 0
    return {
      name: m.saveName?.slice(0, 16) || `M${idx + 1}`,
      msgsPerRound: Math.round(msgsPerRound * 10) / 10,
      rounds,
      color: MEETING_COLORS[idx % MEETING_COLORS.length],
    }
  })

  return (
    <div>
      <h4 className="text-xs font-semibold vl-text-heading mb-3 flex items-center gap-1.5">
        <Clock className="size-3.5 text-teal-400" /> Messages per Round
      </h4>
      <div className="space-y-3">
        {efficiencyData.map((item) => (
          <div key={item.name} className="flex items-center gap-3">
            <span className="text-xs vl-text-muted w-20 truncate">{item.name}</span>
            <div className="flex-1 h-5 rounded-md overflow-hidden vl-inner">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(item.msgsPerRound / Math.max(1, ...efficiencyData.map(e => e.msgsPerRound))) * 100}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-md"
                style={{ background: item.color }}
              />
            </div>
            <span className="text-xs font-medium vl-text-heading w-16 text-right">
              {item.msgsPerRound} msgs/r
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Difference Highlights ──
function DifferenceHighlights({ differences }: { differences: string[] }) {
  const [expanded, setExpanded] = useState(false)
  if (!differences?.length) return null

  const getDiffType = (text: string): 'positive' | 'negative' | 'neutral' => {
    if (text.toLowerCase().includes('more') || text.toLowerCase().includes('shared') || text.toLowerCase().includes('improved')) return 'positive'
    if (text.toLowerCase().includes('lack') || text.toLowerCase().includes('vary') || text.toLowerCase().includes('differ')) return 'negative'
    return 'neutral'
  }

  const displayed = expanded ? differences : differences.slice(0, 4)

  return (
    <div>
      <h4 className="text-xs font-semibold vl-text-heading mb-3 flex items-center gap-1.5">
        <AlertTriangle className="size-3.5 text-amber-400" /> Key Differences
      </h4>
      <div className="space-y-2">
        {displayed.map((diff, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`diff-highlight-card diff-${getDiffType(diff)} py-2 text-xs vl-text-body`}
          >
            {diff}
          </motion.div>
        ))}
      </div>
      {differences.length > 4 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
        >
          {expanded ? (
            <><ChevronUp className="size-3" /> Show less</>
          ) : (
            <><ChevronDown className="size-3" /> Show {differences.length - 4} more</>
          )}
        </button>
      )}
    </div>
  )
}

// ── Summary Side-by-Side ──
function SummaryComparison({ meetings }: { meetings: MeetingBasic[] }) {
  if (!meetings?.length) return null

  return (
    <div>
      <h4 className="text-xs font-semibold vl-text-heading mb-3 flex items-center gap-1.5">
        <Lightbulb className="size-3.5 text-amber-400" /> Summary Comparison
      </h4>
      <div className={`grid gap-4 ${meetings.length >= 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
        {meetings.map((m, idx) => (
          <div key={m.id} className="summary-panel" data-meeting-name={m.saveName?.slice(0, 20) || `Meeting ${idx + 1}`}>
            {m.summary ? (
              <p className="text-xs vl-text-body leading-relaxed">{m.summary.slice(0, 500)}{m.summary.length > 500 ? '...' : ''}</p>
            ) : (
              <p className="text-xs vl-text-muted italic">No summary available</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Export JSON ──
function ExportButton({ data }: { data: ComparisonResult | null }) {
  const handleExport = () => {
    if (!data) return
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'meeting-comparison.json'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Comparison exported as JSON')
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={!data}
            className="vl-text-muted hover:text-emerald-400 hover:border-emerald-500/30 gap-1.5"
          >
            <FileJson className="size-3.5" />
            <span className="text-xs">Export JSON</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Export comparison data as JSON</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ════════════════════════════════════════════════════════════════
// Main Export: MeetingComparisonView
// ════════════════════════════════════════════════════════════════
export function MeetingComparisonView() {
  const [allMeetings, setAllMeetings] = useState<MeetingBasic[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [comparisonData, setComparisonData] = useState<ComparisonResult | null>(null)
  const [loading, setLoading] = useState(false)

  // Fetch all meetings
  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const res = await fetch('/api/meetings')
        if (res.ok) {
          const data = await res.json()
          setAllMeetings(data)
        }
      } catch {
        toast.error('Failed to load meetings')
      }
    }
    fetchMeetings()
  }, [])

  // Fetch comparison when 2+ selected
  useEffect(() => {
    if (selectedIds.size < 2) {
      setComparisonData(null)
      return
    }
    let cancelled = false
    const fetchComparison = async () => {
      setLoading(true)
      try {
        const ids = Array.from(selectedIds).join(',')
        const res = await fetch(`/api/meetings/compare?ids=${ids}`)
        if (res.ok && !cancelled) {
          const data = await res.json()
          setComparisonData(data)
        }
      } catch {
        if (!cancelled) toast.error('Failed to compare meetings')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchComparison()
    return () => { cancelled = true }
  }, [selectedIds])

  const toggleMeeting = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < 3) {
        next.add(id)
      } else {
        toast.info('Maximum 3 meetings can be compared')
      }
      return next
    })
  }, [])

  const selectedMeetings = useMemo(
    () => allMeetings.filter((m) => selectedIds.has(m.id)),
    [allMeetings, selectedIds]
  )

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
            <GitCompareArrows className="size-4 text-emerald-400" />
          </div>
          <h3 className="text-sm font-semibold vl-text-heading">Meeting Comparison</h3>
        </div>
        <ExportButton data={comparisonData} />
      </motion.div>

      {/* Meeting Selector */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="vl-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs vl-text-muted">Select 2-3 meetings to compare</p>
              <Badge variant="outline" className="text-[10px]">
                {selectedIds.size}/3 selected
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2 analytics-scrollable" style={{ maxHeight: 200 }}>
              {allMeetings.length === 0 ? (
                <p className="text-xs vl-text-muted py-4 w-full text-center">No meetings available</p>
              ) : (
                allMeetings.map((m, idx) => (
                  <MeetingChip
                    key={m.id}
                    meeting={m}
                    selected={selectedIds.has(m.id)}
                    index={allMeetings.indexOf(m)}
                    onToggle={() => toggleMeeting(m.id)}
                  />
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Comparison Content */}
      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center py-16"
          >
            <Loader2 className="size-6 text-emerald-400 animate-spin" />
            <span className="ml-2 text-sm vl-text-muted">Comparing meetings...</span>
          </motion.div>
        )}

        {!loading && comparisonData && (
          <motion.div
            key="comparison"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* ── Recommendations ── */}
            {comparisonData.comparison.recommendations?.length > 0 && (
              <Card className="vl-card border-amber-500/20">
                <CardContent className="p-4">
                  <h4 className="text-xs font-semibold text-amber-400 mb-2 flex items-center gap-1.5">
                    <Lightbulb className="size-3.5" /> Recommendations
                  </h4>
                  <ul className="space-y-1.5">
                    {comparisonData.comparison.recommendations.slice(0, 5).map((rec, idx) => (
                      <li key={idx} className="text-xs vl-text-body flex items-start gap-1.5">
                        <CheckCircle2 className="size-3 mt-0.5 text-emerald-400 shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 comparison-grid">
              {/* Duration & Volume */}
              <Card className="vl-card">
                <CardContent className="p-4">
                  <DurationComparison data={comparisonData.comparison.lengthComparison} meetings={comparisonData.meetings} />
                </CardContent>
              </Card>

              {/* Participation */}
              <Card className="vl-card">
                <CardContent className="p-4">
                  <ParticipationComparison matrix={comparisonData.comparison.participationMatrix} meetings={comparisonData.meetings} />
                </CardContent>
              </Card>

              {/* Sentiment */}
              <Card className="vl-card">
                <CardContent className="p-4">
                  <SentimentComparison overview={comparisonData.comparison.sentimentOverview} meetings={comparisonData.meetings} />
                  <Separator className="my-4" />
                  <EfficiencyComparison lengthData={comparisonData.comparison.lengthComparison} meetings={comparisonData.meetings} />
                </CardContent>
              </Card>

              {/* Topics */}
              <Card className="vl-card">
                <CardContent className="p-4">
                  <TopicComparison topics={comparisonData.comparison.sharedTopics} meetings={comparisonData.meetings} />
                  <Separator className="my-4" />
                  <DifferenceHighlights differences={comparisonData.comparison.keyDifferences} />
                </CardContent>
              </Card>
            </div>

            {/* Summary Comparison */}
            <Card className="vl-card">
              <CardContent className="p-4">
                <SummaryComparison meetings={comparisonData.meetings} />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {!loading && !comparisonData && selectedIds.size < 2 && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-16 space-y-3"
          >
            <GitCompareArrows className="size-10 text-emerald-400/30" />
            <p className="text-sm vl-text-muted">Select at least 2 meetings to compare</p>
            <p className="text-xs vl-text-muted">Choose meetings from the selector above</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default MeetingComparisonView
