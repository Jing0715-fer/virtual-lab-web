'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain, ChevronDown, ChevronUp, Clock, HelpCircle,
  CheckSquare, MessageSquare, Sparkles, Tag, ThumbsUp, ThumbsDown,
  Minus, Timer, Layers, BarChart3, PanelRightClose, PanelRightOpen,
} from 'lucide-react'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { DiscussionMessage } from './shared-types'

// ============================================================
// Types
// ============================================================

interface AIMeetingAssistantProps {
  messages: DiscussionMessage[]
  lang: Lang
  isOpen?: boolean
  onToggle?: () => void
  className?: string
}

type Sentiment = 'positive' | 'neutral' | 'negative'

interface ActionItem {
  text: string
  agentName: string
  messageId: string
}

interface TopicCluster {
  name: string
  keywords: string[]
  messages: DiscussionMessage[]
  startTime: string
  endTime: string
}

interface MessageSentiment {
  messageId: string
  sentiment: Sentiment
  score: number
}

// ============================================================
// NLP Utility Functions (Local Regex-Based)
// ============================================================

const ACTION_KEYWORDS = /\b(should|need to|needs to|will|must|TODO|todo|action item|follow up|make sure|ensure|please |required|responsibility)\b/gi

const QUESTION_PATTERN = /\?(?:\s|$)|\b(how|what|when|where|why|who|which|is it|are there|can we|could we|would it|do we|does it)\b/gi

const NEGATIVE_WORDS = new Set([
  'problem', 'issue', 'fail', 'error', 'wrong', 'bad', 'difficult', 'challenge',
  'concern', 'risk', 'worst', 'cannot', 'impossible', 'unfortunately', 'however',
  'but', 'limitation', 'drawback', 'complicated', 'complex', 'expensive', 'slow',
  'weak', 'poor', 'lack', 'missing', 'gap', 'unclear', 'confusing',
])

const POSITIVE_WORDS = new Set([
  'great', 'good', 'excellent', 'success', 'effective', 'promising', 'innovative',
  'exciting', 'impressive', 'significant', 'important', 'strong', 'powerful',
  'efficient', 'optimize', 'improve', 'better', 'best', 'amazing', 'wonderful',
  'breakthrough', 'discover', 'achieve', 'advance', 'progress', 'advantage',
  'benefit', 'potential', 'reliable', 'robust', 'elegant', 'novel',
])

function extractActionItems(messages: DiscussionMessage[]): ActionItem[] {
  const items: ActionItem[] = []
  for (const msg of messages) {
    const matches = msg.message.matchAll(ACTION_KEYWORDS)
    for (const match of matches) {
      const start = Math.max(0, match.index! - 60)
      const end = Math.min(msg.message.length, match.index! + 80)
      const context = msg.message.slice(start, end).trim()
      items.push({
        text: context,
        agentName: msg.agentName,
        messageId: msg.id,
      })
    }
  }
  return items
}

function extractQuestions(messages: DiscussionMessage[]): { text: string; agentName: string; messageId: string }[] {
  const questions: { text: string; agentName: string; messageId: string }[] = []
  for (const msg of messages) {
    if (QUESTION_PATTERN.test(msg.message)) {
      const sentences = msg.message.split(/(?<=[.!?])\s+/)
      for (const sentence of sentences) {
        if (QUESTION_PATTERN.test(sentence)) {
          questions.push({
            text: sentence.trim(),
            agentName: msg.agentName,
            messageId: msg.id,
          })
        }
      }
    }
    QUESTION_PATTERN.lastIndex = 0
  }
  return questions
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'to', 'of', 'in',
    'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through',
    'during', 'before', 'after', 'above', 'below', 'between', 'and', 'but',
    'or', 'not', 'this', 'that', 'these', 'those', 'it', 'its', 'we',
    'our', 'us', 'they', 'them', 'their', 'what', 'which', 'who', 'how',
    'when', 'where', 'why', 'i', 'think', 'also', 'very', 'more', 'so',
  ])
  const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || []
  const freq = new Map<string, number>()
  for (const w of words) {
    if (!stopWords.has(w)) {
      freq.set(w, (freq.get(w) || 0) + 1)
    }
  }
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word)
}

function analyzeSentiment(text: string): { sentiment: Sentiment; score: number } {
  const words = text.toLowerCase().split(/\b/)
  let posCount = 0
  let negCount = 0
  for (const w of words) {
    if (POSITIVE_WORDS.has(w)) posCount++
    if (NEGATIVE_WORDS.has(w)) negCount++
  }
  const total = posCount + negCount
  if (total === 0) return { sentiment: 'neutral', score: 0 }
  const score = (posCount - negCount) / total
  return {
    sentiment: score > 0.2 ? 'positive' : score < -0.2 ? 'negative' : 'neutral',
    score,
  }
}

function clusterByTopic(messages: DiscussionMessage[]): TopicCluster[] {
  if (messages.length === 0) return []

  const clusters: TopicCluster[] = []
  const used = new Set<string>()

  for (const msg of messages) {
    if (used.has(msg.id)) continue

    const msgKeywords = extractKeywords(msg.message)
    if (msgKeywords.length === 0) continue

    const clusterMessages: DiscussionMessage[] = [msg]
    used.add(msg.id)

    for (const other of messages) {
      if (used.has(other.id)) continue
      const otherKeywords = extractKeywords(other.message)
      const overlap = msgKeywords.filter(k => otherKeywords.includes(k)).length
      if (overlap >= 1) {
        clusterMessages.push(other)
        used.add(other.id)
      }
    }

    const allKeywords = extractKeywords(
      clusterMessages.map(m => m.message).join(' ')
    )

    clusters.push({
      name: allKeywords[0] || 'General',
      keywords: allKeywords.slice(0, 3),
      messages: clusterMessages,
      startTime: clusterMessages[0]?.createdAt || '',
      endTime: clusterMessages[clusterMessages.length - 1]?.createdAt || '',
    })
  }

  return clusters.sort((a, b) => b.messages.length - a.messages.length)
}

function getTimeDistribution(clusters: TopicCluster[]): { topic: string; percentage: number; count: number }[] {
  if (clusters.length === 0) return []
  const total = clusters.reduce((sum, c) => sum + c.messages.length, 0)
  return clusters.map(c => ({
    topic: c.name,
    percentage: Math.round((c.messages.length / total) * 100),
    count: c.messages.length,
  }))
}

// ============================================================
// Sub-components
// ============================================================

function SmartSummarizer({ messages, lang }: { messages: DiscussionMessage[]; lang: Lang }) {
  const summary = useMemo(() => {
    if (messages.length === 0) return t(lang, 'aiMeeting.summary.noMessages')
    const keywords = extractKeywords(messages.map(m => m.message).join(' '))
    const participants = [...new Set(messages.map(m => m.agentName))]
    const actionCount = extractActionItems(messages).length
    const questionCount = extractQuestions(messages).length

    const raw = t(lang, 'aiMeeting.summary.text')
    return raw
      .replace('{count}', messages.length.toString())
      .replace('{participants}', participants.join(', '))
      .replace('{topTopic}', keywords[0] || 'N/A')
      .replace('{actions}', actionCount.toString())
      .replace('{questions}', questionCount.toString())
  }, [messages, lang])

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium vl-text-heading">
        <Sparkles className="size-4 text-amber-400" />
        <span>{t(lang, 'aiMeeting.summary.title')}</span>
      </div>
      <p className="text-sm vl-text-body leading-relaxed">{summary}</p>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {extractKeywords(messages.map(m => m.message).join(' ')).slice(0, 6).map(kw => (
          <span key={kw} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Tag className="size-3" />
            {kw}
          </span>
        ))}
      </div>
    </div>
  )
}

function ActionItemTracker({ messages, lang }: { messages: DiscussionMessage[]; lang: Lang }) {
  const actions = useMemo(() => extractActionItems(messages), [messages])

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium vl-text-heading">
        <CheckSquare className="size-4 text-emerald-400" />
        <span>{t(lang, 'aiMeeting.actions.title')}</span>
        <span className="ml-auto text-xs vl-text-muted">({actions.length})</span>
      </div>
      <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
        {actions.length === 0 ? (
          <p className="text-xs vl-text-muted italic">{t(lang, 'aiMeeting.actions.noActions')}</p>
        ) : (
          actions.slice(0, 10).map((item, i) => (
            <motion.div
              key={`${item.messageId}-${i}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-start gap-2 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10"
            >
              <div className="mt-0.5 size-4 rounded border-2 border-emerald-400/40 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs vl-text-body leading-relaxed line-clamp-2">{item.text}...</p>
                <p className="text-[10px] vl-text-muted mt-0.5">— {item.agentName}</p>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}

function QuestionDetector({ messages, lang }: { messages: DiscussionMessage[]; lang: Lang }) {
  const questions = useMemo(() => extractQuestions(messages), [messages])

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium vl-text-heading">
        <HelpCircle className="size-4 text-blue-400" />
        <span>{t(lang, 'aiMeeting.questions.title')}</span>
        <span className="ml-auto text-xs vl-text-muted">({questions.length})</span>
      </div>
      <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
        {questions.length === 0 ? (
          <p className="text-xs vl-text-muted italic">{t(lang, 'aiMeeting.questions.noQuestions')}</p>
        ) : (
          questions.slice(0, 8).map((q, i) => (
            <motion.div
              key={`${q.messageId}-${i}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="p-2 rounded-lg bg-blue-500/5 border border-blue-500/10"
            >
              <p className="text-xs vl-text-body leading-relaxed line-clamp-2">"{q.text}"</p>
              <p className="text-[10px] vl-text-muted mt-0.5">— {q.agentName}</p>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}

function TopicClusteringView({ messages, lang }: { messages: DiscussionMessage[]; lang: Lang }) {
  const clusters = useMemo(() => clusterByTopic(messages), [messages])

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium vl-text-heading">
        <Layers className="size-4 text-violet-400" />
        <span>{t(lang, 'aiMeeting.topics.title')}</span>
        <span className="ml-auto text-xs vl-text-muted">({clusters.length})</span>
      </div>
      <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
        {clusters.length === 0 ? (
          <p className="text-xs vl-text-muted italic">{t(lang, 'aiMeeting.topics.noTopics')}</p>
        ) : (
          clusters.slice(0, 6).map((cluster, i) => (
            <motion.div
              key={cluster.name}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-2 rounded-lg bg-violet-500/5 border border-violet-500/10"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-violet-400 capitalize">{cluster.name}</span>
                <span className="text-[10px] vl-text-muted">{cluster.messages.length} {t(lang, 'aiMeeting.topics.messages')}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {cluster.keywords.map(kw => (
                  <span key={kw} className="px-1.5 py-0.5 text-[10px] rounded bg-violet-500/10 text-violet-300">
                    {kw}
                  </span>
                ))}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}

function SentimentPulse({ messages, lang }: { messages: DiscussionMessage[]; lang: Lang }) {
  const sentiments = useMemo(() => {
    return messages.map(msg => ({
      messageId: msg.id,
      ...analyzeSentiment(msg.message),
    }))
  }, [messages])

  const positiveCount = sentiments.filter(s => s.sentiment === 'positive').length
  const negativeCount = sentiments.filter(s => s.sentiment === 'negative').length
  const neutralCount = sentiments.filter(s => s.sentiment === 'neutral').length

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium vl-text-heading">
        <BarChart3 className="size-4 text-rose-400" />
        <span>{t(lang, 'aiMeeting.sentiment.title')}</span>
      </div>

      {/* Overall bar */}
      <div className="flex h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
        {sentiments.length > 0 && (
          <>
            <div
              className="bg-emerald-500 transition-all duration-500"
              style={{ width: `${(positiveCount / sentiments.length) * 100}%` }}
            />
            <div
              className="bg-rose-500 transition-all duration-500"
              style={{ width: `${(negativeCount / sentiments.length) * 100}%` }}
            />
            <div
              className="bg-slate-400 transition-all duration-500"
              style={{ width: `${(neutralCount / sentiments.length) * 100}%` }}
            />
          </>
        )}
      </div>

      <div className="flex items-center justify-between text-[10px] vl-text-muted">
        <span className="flex items-center gap-1"><ThumbsUp className="size-3 text-emerald-400" />{positiveCount}</span>
        <span className="flex items-center gap-1"><Minus className="size-3 text-slate-400" />{neutralCount}</span>
        <span className="flex items-center gap-1"><ThumbsDown className="size-3 text-rose-400" />{negativeCount}</span>
      </div>

      {/* Per-message sentiment indicators */}
      <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto custom-scrollbar">
        {sentiments.map(s => (
          <div
            key={s.messageId}
            title={`${t(lang, `aiMeeting.sentiment.${s.sentiment}` as string)}: ${s.score.toFixed(2)}`}
            className="w-3 h-3 rounded-full transition-all duration-300"
            style={{
              backgroundColor: s.sentiment === 'positive' ? '#10b981' : s.sentiment === 'negative' ? '#ef4444' : '#94a3b8',
              opacity: 0.6 + Math.abs(s.score) * 0.4,
            }}
          />
        ))}
      </div>
    </div>
  )
}

function TimeTracking({ messages, lang }: { messages: DiscussionMessage[]; lang: Lang }) {
  const distribution = useMemo(() => {
    const clusters = clusterByTopic(messages)
    return getTimeDistribution(clusters)
  }, [messages])

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium vl-text-heading">
        <Timer className="size-4 text-cyan-400" />
        <span>{t(lang, 'aiMeeting.time.title')}</span>
      </div>
      <div className="space-y-1.5">
        {distribution.length === 0 ? (
          <p className="text-xs vl-text-muted italic">{t(lang, 'aiMeeting.time.noData')}</p>
        ) : (
          distribution.map((d, i) => (
            <motion.div
              key={d.topic}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className="space-y-1"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="capitalize vl-text-body">{d.topic}</span>
                <span className="vl-text-muted">{d.percentage}% ({d.count})</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${d.percentage}%` }}
                  transition={{ duration: 0.6, delay: i * 0.05 }}
                  className="h-full rounded-full bg-cyan-400"
                />
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}

// ============================================================
// Section Wrapper — Collapsible
// ============================================================

function AssistantSection({
  title,
  icon,
  children,
  lang,
  defaultOpen = true,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  lang: Lang
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-[var(--vl-border-subtle)] last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium vl-text-heading hover:bg-[var(--vl-bg-card-hover)] transition-colors"
      >
        {icon}
        <span className="flex-1 text-left">{title}</span>
        {open ? <ChevronUp className="size-3.5 vl-text-muted" /> : <ChevronDown className="size-3.5 vl-text-muted" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================
// Main Component: AIMeetingAssistant
// ============================================================

export function AIMeetingAssistant({
  messages,
  lang,
  isOpen: externalIsOpen,
  onToggle,
  className = '',
}: AIMeetingAssistantProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalOpen

  const handleToggle = useCallback(() => {
    if (onToggle) {
      onToggle()
    } else {
      setInternalOpen(prev => !prev)
    }
  }, [onToggle])

  // Hydration-safe: default to closed
  const [mounted, setMounted] = useState(false)
  useEffect(() => { requestAnimationFrame(() => { setMounted(true) }) }, [])

  if (!mounted) return null

  return (
    <>
      {/* Toggle button */}
      <motion.button
        type="button"
        onClick={handleToggle}
        className={`
          fixed right-0 top-1/2 -translate-y-1/2 z-50
          flex items-center gap-1.5 px-2 py-3 rounded-l-lg
          bg-[var(--vl-bg-card)] border border-[var(--vl-border)]
          border-r-0 shadow-lg hover:shadow-xl
          transition-all duration-300 group
          ${isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}
        `}
        whileHover={{ x: -4 }}
        whileTap={{ scale: 0.95 }}
        title={t(lang, 'aiMeeting.toggle')}
        aria-label={t(lang, 'aiMeeting.toggle')}
      >
        <PanelRightOpen className="size-4 text-[var(--vl-accent)]" />
        <Brain className="size-4 text-violet-400" />
        <span className="text-xs font-medium vl-text-heading hidden group-hover:inline">
          {t(lang, 'aiMeeting.title')}
        </span>
      </motion.button>

      {/* Side panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`
              fixed right-0 top-0 bottom-0 w-80 z-40
              bg-[var(--vl-bg-card)]/80 backdrop-blur-xl
              border-l border-[var(--vl-border)]
              shadow-2xl flex flex-col
              ${className}
            `}
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--vl-border)]">
              <div className="flex items-center gap-2 flex-1">
                <div className="p-1.5 rounded-lg bg-violet-500/10">
                  <Brain className="size-4 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold vl-text-heading">{t(lang, 'aiMeeting.title')}</h3>
                  <p className="text-[10px] vl-text-muted">{t(lang, 'aiMeeting.subtitle')}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggle}
                className="p-1.5 rounded-lg hover:bg-[var(--vl-bg-card-hover)] transition-colors"
                title={t(lang, 'common.close')}
                aria-label={t(lang, 'common.close')}
              >
                <PanelRightClose className="size-4 vl-text-muted" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <MessageSquare className="size-10 vl-text-muted mb-3 opacity-30" />
                  <p className="text-sm vl-text-muted">{t(lang, 'aiMeeting.noMessages')}</p>
                  <p className="text-xs vl-text-muted mt-1">{t(lang, 'aiMeeting.noMessagesDesc')}</p>
                </div>
              ) : (
                <AssistantSection
                  title={t(lang, 'aiMeeting.summary.title')}
                  icon={<Sparkles className="size-3.5 text-amber-400" />}
                  lang={lang}
                  defaultOpen={true}
                >
                  <SmartSummarizer messages={messages} lang={lang} />
                </AssistantSection>
              )}

              {messages.length > 0 && (
                <>
                  <AssistantSection
                    title={t(lang, 'aiMeeting.actions.title')}
                    icon={<CheckSquare className="size-3.5 text-emerald-400" />}
                    lang={lang}
                    defaultOpen={true}
                  >
                    <ActionItemTracker messages={messages} lang={lang} />
                  </AssistantSection>

                  <AssistantSection
                    title={t(lang, 'aiMeeting.questions.title')}
                    icon={<HelpCircle className="size-3.5 text-blue-400" />}
                    lang={lang}
                    defaultOpen={true}
                  >
                    <QuestionDetector messages={messages} lang={lang} />
                  </AssistantSection>

                  <AssistantSection
                    title={t(lang, 'aiMeeting.topics.title')}
                    icon={<Layers className="size-3.5 text-violet-400" />}
                    lang={lang}
                    defaultOpen={false}
                  >
                    <TopicClusteringView messages={messages} lang={lang} />
                  </AssistantSection>

                  <AssistantSection
                    title={t(lang, 'aiMeeting.sentiment.title')}
                    icon={<BarChart3 className="size-3.5 text-rose-400" />}
                    lang={lang}
                    defaultOpen={false}
                  >
                    <SentimentPulse messages={messages} lang={lang} />
                  </AssistantSection>

                  <AssistantSection
                    title={t(lang, 'aiMeeting.time.title')}
                    icon={<Timer className="size-3.5 text-cyan-400" />}
                    lang={lang}
                    defaultOpen={false}
                  >
                    <TimeTracking messages={messages} lang={lang} />
                  </AssistantSection>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-[var(--vl-border-subtle)]">
              <p className="text-[10px] text-center vl-text-muted">
                {t(lang, 'aiMeeting.footer')} · {messages.length} {t(lang, 'aiMeeting.topics.messages').toLowerCase()}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default AIMeetingAssistant
