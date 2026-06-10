'use client'

import React, { useMemo, useState } from 'react'
import {
  GitCompareArrows, Users, Hash, MessageSquare, AlertTriangle, CheckCircle2,
  ChevronDown, ChevronRight, Tag, Sparkles,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { Meeting, Agent, DiscussionMessage } from './shared-types'

// ============================================================
// MeetingDiffView Component — Enhanced Round-aligned message diff viewer
// with side-by-side comparison, Jaccard similarity, summary diff,
// topic extraction, and keyword highlighting
// ============================================================

interface MeetingDiffViewProps {
  meetingA: Meeting
  meetingB: Meeting
  agents: Agent[]
  lang: Lang
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Truncation limit for messages */
const MSG_TRUNCATE = 150

/** Jaccard similarity between two strings (word-level) */
function jaccardSimilarity(a: string, b: string): number {
  const tokenize = (s: string) => new Set(s.toLowerCase().split(/\W+/).filter(w => w.length > 2))
  const setA = tokenize(a)
  const setB = tokenize(b)
  if (setA.size === 0 && setB.size === 0) return 1
  if (setA.size === 0 || setB.size === 0) return 0
  const intersection = new Set([...setA].filter(x => setB.has(x)))
  const union = new Set([...setA, ...setB])
  return intersection.size / union.size
}

/** Extract top N keywords from text using word frequency */
function extractKeywords(text: string, topN: number = 3): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
    'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'may', 'might', 'can', 'shall', 'that', 'this', 'these', 'those', 'from',
    'into', 'about', 'it', 'its', 'we', 'our', 'they', 'them', 'their',
    'not', 'no', 'if', 'as', 'so', 'than', 'then', 'also', 'just', 'more',
    'some', 'any', 'all', 'each', 'every', 'both', 'few', 'most', 'other',
  ])
  const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 2 && !stopWords.has(w))
  const freq: Record<string, number> = {}
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1 })
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word]) => word)
}

/** Extract top N word-frequency pairs for word cloud */
function extractWordFrequency(text: string, topN: number = 20): { word: string; count: number }[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
    'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'may', 'might', 'can', 'shall', 'that', 'this', 'these', 'those', 'from',
    'into', 'about', 'it', 'its', 'we', 'our', 'they', 'them', 'their',
    'not', 'no', 'if', 'as', 'so', 'than', 'then', 'also', 'just', 'more',
    'some', 'any', 'all', 'each', 'every', 'both', 'few', 'most', 'other',
  ])
  const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 2 && !stopWords.has(w))
  const freq: Record<string, number> = {}
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1 })
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word, count]) => ({ word, count }))
}

/** Simple sentiment scorer (keyword-based) */
function computeSentiment(text: string): { score: number; label: 'positive' | 'neutral' | 'negative' } {
  const positiveWords = ['good', 'great', 'excellent', 'success', 'achieve', 'improve', 'positive', 'best', 'well', 'effective', 'promising', 'strong', 'advantage', 'benefit', 'helpful', 'innovative']
  const negativeWords = ['bad', 'fail', 'poor', 'problem', 'issue', 'difficult', 'challenge', 'negative', 'worst', 'lack', 'weak', 'limit', 'risk', 'concern', 'error', 'wrong', 'decline']
  const lower = text.toLowerCase()
  const words = lower.split(/\W+/)
  let posCount = 0
  let negCount = 0
  words.forEach(w => {
    if (positiveWords.includes(w)) posCount++
    if (negativeWords.includes(w)) negCount++
  })
  const total = posCount + negCount
  if (total === 0) return { score: 50, label: 'neutral' }
  const rawScore = (posCount / total) * 100
  const label: 'positive' | 'neutral' | 'negative' = rawScore > 60 ? 'positive' : rawScore < 40 ? 'negative' : 'neutral'
  return { score: Math.round(rawScore), label }
}

/** Render highlighted words for summary diff */
function HighlightedText({ words, otherSet, side }: { words: string[]; otherSet: Set<string>; side: 'added' | 'removed' }) {
  return (
    <span>
      {words.map((word, i) => {
        const cleaned = word.toLowerCase().replace(/[^a-z0-9]/g, '')
        const isDifferent = cleaned.length > 2 && !otherSet.has(cleaned)
        if (isDifferent) {
          return (
            <span key={i} className={`diff-summary-highlight ${side}`}>
              {word}
            </span>
          )
        }
        return <span key={i}>{word}</span>
      })}
    </span>
  )
}

/** Render highlighted summary diff */
function SummaryDiff({ textA, textB }: { textA: string; textB: string }) {
  const wordsA = textA.split(/\s+/)
  const wordsB = textB.split(/\s+/)
  const setA = new Set(wordsA.map(w => w.toLowerCase().replace(/[^a-z0-9]/g, '')))
  const setB = new Set(wordsB.map(w => w.toLowerCase().replace(/[^a-z0-9]/g, '')))

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
        <div className="text-[10px] font-medium text-emerald-400 mb-1.5">Meeting A Summary</div>
        <p className="text-[11px] vl-text-body leading-relaxed">
          <HighlightedText words={wordsA} otherSet={setB} side="added" />
        </p>
      </div>
      <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5">
        <div className="text-[10px] font-medium text-blue-400 mb-1.5">Meeting B Summary</div>
        <p className="text-[11px] vl-text-body leading-relaxed">
          <HighlightedText words={wordsB} otherSet={setA} side="removed" />
        </p>
      </div>
    </div>
  )
}

/** Keyword pills component */
function KeywordPills({
  keywordsA,
  keywordsB,
  lang,
}: {
  keywordsA: string[]
  keywordsB: string[]
  lang: Lang
}) {
  const setA = new Set(keywordsA)
  const setB = new Set(keywordsB)
  const common = keywordsA.filter(k => setB.has(k))
  const uniqueA = keywordsA.filter(k => !setB.has(k))
  const uniqueB = keywordsB.filter(k => !setA.has(k))

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold vl-text-heading flex items-center gap-1.5">
        <Tag className="size-3 text-amber-400" />
        {t(lang, 'comparison.topicExtraction')}
      </h4>
      <div className="flex flex-wrap gap-1.5">
        {common.map(k => (
          <span key={k} className="diff-keyword-pill common">{k}</span>
        ))}
        {uniqueA.map(k => (
          <span key={`a-${k}`} className="diff-keyword-pill unique-a">{k}</span>
        ))}
        {uniqueB.map(k => (
          <span key={`b-${k}`} className="diff-keyword-pill unique-b">{k}</span>
        ))}
      </div>
      {common.length > 0 && (
        <p className="text-[10px] vl-text-muted">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-500/40 mr-1 align-middle" />
          {t(lang, 'comparison.commonTopics')}: {common.join(', ')}
        </p>
      )}
    </div>
  )
}

/** A single message rendered in chat style */
function MessageBubble({
  msg,
  agentColor,
  lang,
  similarityBadge,
  wordDelta,
  isUnmatched,
}: {
  msg: DiscussionMessage
  agentColor: string
  lang: Lang
  similarityBadge?: { type: 'similar' | 'different'; score: number }
  wordDelta?: number
  isUnmatched?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const needsTruncation = msg.message.length > MSG_TRUNCATE
  const displayText = expanded ? msg.message : msg.message.slice(0, MSG_TRUNCATE)
  const wordCount = msg.message.split(/\s+/).filter(Boolean).length

  return (
    <div className={`p-2 rounded-lg ${isUnmatched ? 'diff-message-unmatched' : ''} ${similarityBadge?.type === 'similar' ? 'diff-message-similar' : similarityBadge?.type === 'different' ? 'diff-message-different' : ''}`}>
      <div className="flex gap-2 items-start">
        {/* Agent avatar */}
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-white"
          style={{ backgroundColor: agentColor }}
        >
          <span className="text-[9px] font-bold leading-none">{msg.agentName.charAt(0).toUpperCase()}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5 mb-0.5">
            <span className="text-[11px] font-semibold" style={{ color: agentColor }}>
              {msg.agentName}
            </span>
            {similarityBadge && (
              <Badge
                variant="outline"
                className={`text-[9px] px-1 py-0 ${
                  similarityBadge.type === 'similar'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-red-500/15 text-red-400 border-red-500/30'
                }`}
              >
                {similarityBadge.type === 'similar' ? t(lang, 'comparison.similar') : t(lang, 'comparison.different')}
                {' '}({Math.round(similarityBadge.score * 100)}%)
              </Badge>
            )}
            {wordDelta !== undefined && wordDelta !== 0 && (
              <span className={`text-[9px] font-semibold ${wordDelta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {wordDelta > 0 ? '+' : ''}{wordDelta} {t(lang, 'comparison.words').toLowerCase()}
              </span>
            )}
          </div>
          <p className="text-[11px] vl-text-body leading-relaxed whitespace-pre-wrap break-words">
            {displayText}
            {needsTruncation && !expanded && (
              <button
                className="text-emerald-400 hover:text-emerald-300 ml-1 text-[10px] font-medium"
                onClick={() => setExpanded(true)}
              >
                ...{t(lang, 'history.compare.readMore')}
              </button>
            )}
            {needsTruncation && expanded && (
              <button
                className="text-emerald-400 hover:text-emerald-300 ml-1 text-[10px] font-medium"
                onClick={() => setExpanded(false)}
              >
                ▲
              </button>
            )}
          </p>
          <span className="text-[9px] vl-text-muted">{wordCount} {t(lang, 'comparison.words').toLowerCase()}</span>
        </div>
      </div>
    </div>
  )
}

export function MeetingDiffView({
  meetingA,
  meetingB,
  agents,
  lang,
  open,
  onOpenChange,
}: MeetingDiffViewProps) {
  const messagesA = meetingA.messages || []
  const messagesB = meetingB.messages || []

  // Compute structural differences
  const differences = useMemo(() => {
    const uniqueRoundsA = [...new Set(messagesA.map(m => m.roundIndex))].sort((a, b) => a - b)
    const uniqueRoundsB = [...new Set(messagesB.map(m => m.roundIndex))].sort((a, b) => a - b)
    const participantsA = [...new Set(messagesA.map(m => m.agentName).filter(n => n !== 'User'))]
    const participantsB = [...new Set(messagesB.map(m => m.agentName).filter(n => n !== 'User'))]

    const diffs: { key: string; label: string; valueA: string; valueB: string }[] = []

    if (uniqueRoundsA.length !== uniqueRoundsB.length) {
      diffs.push({
        key: 'rounds',
        label: t(lang, 'history.compare.diffRounds'),
        valueA: t(lang, 'history.compare.roundsA').replace('{count}', String(uniqueRoundsA.length)),
        valueB: t(lang, 'history.compare.roundsB').replace('{count}', String(uniqueRoundsB.length)),
      })
    }

    if (messagesA.length !== messagesB.length) {
      diffs.push({
        key: 'messages',
        label: t(lang, 'history.compare.diffMessages'),
        valueA: t(lang, 'history.compare.messagesA').replace('{count}', String(messagesA.length)),
        valueB: t(lang, 'history.compare.messagesB').replace('{count}', String(messagesB.length)),
      })
    }

    if (participantsA.length !== participantsB.length) {
      diffs.push({
        key: 'participants',
        label: t(lang, 'history.compare.diffParticipants'),
        valueA: t(lang, 'history.compare.participantsA').replace('{count}', String(participantsA.length)),
        valueB: t(lang, 'history.compare.participantsB').replace('{count}', String(participantsB.length)),
      })
    }

    return diffs
  }, [messagesA, messagesB, lang])

  // Build round-aligned rows with similarity analysis
  const roundRows = useMemo(() => {
    const roundsA = [...new Set(messagesA.map(m => m.roundIndex))].sort((a, b) => a - b)
    const roundsB = [...new Set(messagesB.map(m => m.roundIndex))].sort((a, b) => a - b)
    const allRounds = [...new Set([...roundsA, ...roundsB])].sort((a, b) => a - b)

    return allRounds.map(roundIdx => {
      const msgsA = messagesA.filter(m => m.roundIndex === roundIdx)
      const msgsB = messagesB.filter(m => m.roundIndex === roundIdx)
      const hasA = roundsA.includes(roundIdx)
      const hasB = roundsB.includes(roundIdx)

      // Compare messages within the round for similarity
      const comparisons: { msgA?: DiscussionMessage; msgB?: DiscussionMessage; similarity: number }[] = []
      const maxLen = Math.max(msgsA.length, msgsB.length)
      for (let i = 0; i < maxLen; i++) {
        const mA = msgsA[i]
        const mB = msgsB[i]
        if (mA && mB) {
          const sim = jaccardSimilarity(mA.message, mB.message)
          comparisons.push({ msgA: mA, msgB: mB, similarity: sim })
        } else {
          comparisons.push({ msgA: mA, msgB: mB, similarity: 0 })
        }
      }

      return { roundIdx, msgsA, msgsB, hasA, hasB, comparisons }
    })
  }, [messagesA, messagesB])

  // Summary comparison
  const summaryA = meetingA.summary || ''
  const summaryB = meetingB.summary || ''

  // Topic extraction
  const keywordsA = useMemo(() => extractKeywords(summaryA), [summaryA])
  const keywordsB = useMemo(() => extractKeywords(summaryB), [summaryB])

  const getAgentColor = (agentName: string) => {
    const agent = agents.find(a => a.title === agentName)
    return agent?.color || '#6366f1'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="vl-dialog max-w-7xl max-h-[92vh] overflow-hidden flex flex-col p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 vl-text-heading text-lg">
            <GitCompareArrows className="size-5 text-emerald-400" />
            {t(lang, 'history.compare.title')}
          </DialogTitle>
          <DialogDescription className="vl-text-muted">
            {meetingA.saveName} vs {meetingB.saveName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-4 space-y-5 pr-1 custom-scrollbar">
          {/* Column Headers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2 px-1">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-sm font-medium vl-text-heading">{meetingA.saveName}</span>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                {t(lang, 'history.compare.meetingA')}
              </Badge>
            </div>
            <div className="flex items-center gap-2 px-1">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-sm font-medium vl-text-heading">{meetingB.saveName}</span>
              <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px]">
                {t(lang, 'history.compare.meetingB')}
              </Badge>
            </div>
          </div>

          {/* Summary Comparison */}
          {(summaryA || summaryB) && (
            <div className="vl-card rounded-xl p-4">
              <h3 className="font-semibold text-sm vl-text-heading mb-3 flex items-center gap-2">
                <Sparkles className="size-4 text-amber-400" />
                {t(lang, 'comparison.summaryComparison')}
              </h3>
              <SummaryDiff textA={summaryA} textB={summaryB} />
            </div>
          )}

          {/* Topic Extraction / Keyword Pills */}
          {(keywordsA.length > 0 || keywordsB.length > 0) && (
            <div className="vl-card rounded-xl p-4">
              <KeywordPills keywordsA={keywordsA} keywordsB={keywordsB} lang={lang} />
            </div>
          )}

          {/* Round-aligned two-column messages with diff highlighting */}
          <div className="diff-container">
            {/* Meeting A column */}
            <div className="diff-column">
              <div className="px-3 py-2 border-b border-[var(--vl-border-subtle)] bg-emerald-500/5">
                <div className="flex items-center gap-2 text-[11px] font-medium text-emerald-400">
                  <MessageSquare className="size-3" />
                  {t(lang, 'history.compare.messagesA').replace('{count}', String(messagesA.length))}
                  <span className="vl-text-muted ml-auto">·</span>
                  <span className="vl-text-muted">{t(lang, 'history.compare.roundsA').replace('{count}', String([...new Set(messagesA.map(m => m.roundIndex))].length))}</span>
                </div>
              </div>
              <ScrollArea className="max-h-[500px]">
                <div className="p-3 space-y-4">
                  {roundRows.map(row => (
                    <div key={`a-${row.roundIdx}`}>
                      {/* Round header */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <span className="text-[8px] font-bold text-emerald-400">{row.roundIdx + 1}</span>
                        </div>
                        <span className="text-[10px] font-medium text-emerald-400/80">
                          {t(lang, 'history.compare.roundLabel').replace('{round}', String(row.roundIdx + 1))}
                        </span>
                        <div className="flex-1 h-px bg-[var(--vl-border-subtle)]" />
                      </div>
                      {row.hasA && row.msgsA.length > 0 ? (
                        <div className="space-y-2.5 ml-1">
                          {row.comparisons.map((comp, idx) => {
                            const msg = comp.msgA
                            if (!msg) return null
                            const wordCount = msg.message.split(/\s+/).filter(Boolean).length
                            const otherWordCount = comp.msgB ? comp.msgB.message.split(/\s+/).filter(Boolean).length : 0
                            const wordDelta = comp.msgB ? wordCount - otherWordCount : 0
                            const simBadge = comp.msgB
                              ? comp.similarity > 0.5
                                ? { type: 'similar' as const, score: comp.similarity }
                                : { type: 'different' as const, score: comp.similarity }
                              : undefined
                            return (
                              <MessageBubble
                                key={msg.id}
                                msg={msg}
                                agentColor={getAgentColor(msg.agentName)}
                                lang={lang}
                                similarityBadge={simBadge}
                                wordDelta={wordDelta}
                                isUnmatched={!row.hasB}
                              />
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-[10px] vl-text-muted italic ml-1">—</p>
                      )}
                    </div>
                  ))}
                  {roundRows.length === 0 && (
                    <p className="text-xs vl-text-muted text-center py-6">{t(lang, 'common.noData')}</p>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Meeting B column */}
            <div className="diff-column">
              <div className="px-3 py-2 border-b border-[var(--vl-border-subtle)] bg-blue-500/5">
                <div className="flex items-center gap-2 text-[11px] font-medium text-blue-400">
                  <MessageSquare className="size-3" />
                  {t(lang, 'history.compare.messagesB').replace('{count}', String(messagesB.length))}
                  <span className="vl-text-muted ml-auto">·</span>
                  <span className="vl-text-muted">{t(lang, 'history.compare.roundsB').replace('{count}', String([...new Set(messagesB.map(m => m.roundIndex))].length))}</span>
                </div>
              </div>
              <ScrollArea className="max-h-[500px]">
                <div className="p-3 space-y-4">
                  {roundRows.map(row => (
                    <div key={`b-${row.roundIdx}`}>
                      {/* Round header */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <span className="text-[8px] font-bold text-blue-400">{row.roundIdx + 1}</span>
                        </div>
                        <span className="text-[10px] font-medium text-blue-400/80">
                          {t(lang, 'history.compare.roundLabel').replace('{round}', String(row.roundIdx + 1))}
                        </span>
                        <div className="flex-1 h-px bg-[var(--vl-border-subtle)]" />
                      </div>
                      {row.hasB && row.msgsB.length > 0 ? (
                        <div className="space-y-2.5 ml-1">
                          {row.comparisons.map((comp, idx) => {
                            const msg = comp.msgB
                            if (!msg) return null
                            const wordCount = msg.message.split(/\s+/).filter(Boolean).length
                            const otherWordCount = comp.msgA ? comp.msgA.message.split(/\s+/).filter(Boolean).length : 0
                            const wordDelta = comp.msgA ? wordCount - otherWordCount : 0
                            const simBadge = comp.msgA
                              ? comp.similarity > 0.5
                                ? { type: 'similar' as const, score: comp.similarity }
                                : { type: 'different' as const, score: comp.similarity }
                              : undefined
                            return (
                              <MessageBubble
                                key={msg.id}
                                msg={msg}
                                agentColor={getAgentColor(msg.agentName)}
                                lang={lang}
                                similarityBadge={simBadge}
                                wordDelta={wordDelta}
                                isUnmatched={!row.hasA}
                              />
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-[10px] vl-text-muted italic ml-1">—</p>
                      )}
                    </div>
                  ))}
                  {roundRows.length === 0 && (
                    <p className="text-xs vl-text-muted text-center py-6">{t(lang, 'common.noData')}</p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Differences Section */}
          <div className="vl-card rounded-xl p-5 border border-amber-500/20">
            <h3 className="font-semibold text-sm vl-text-heading mb-3 flex items-center gap-2">
              {differences.length > 0 ? (
                <AlertTriangle className="size-4 text-amber-400" />
              ) : (
                <CheckCircle2 className="size-4 text-emerald-400" />
              )}
              {t(lang, 'history.compare.differences')}
            </h3>

            {differences.length > 0 ? (
              <div className="space-y-2">
                {differences.map(diff => (
                  <div
                    key={diff.key}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/10"
                  >
                    <span className="text-[11px] font-medium text-amber-400 w-40 shrink-0">{diff.label}</span>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-1 justify-end">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        <span className="text-[11px] text-emerald-400 font-medium">{diff.valueA}</span>
                      </div>
                      <span className="text-[10px] vl-text-muted">vs</span>
                      <div className="flex items-center gap-1.5 flex-1">
                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                        <span className="text-[11px] text-blue-400 font-medium">{diff.valueB}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-emerald-400 text-sm">
                <CheckCircle2 className="size-3.5" />
                {t(lang, 'history.compare.noDiff')}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Exported utility functions for use in the Comparison Dashboard
// ============================================================

export { jaccardSimilarity, extractKeywords, extractWordFrequency, computeSentiment }
