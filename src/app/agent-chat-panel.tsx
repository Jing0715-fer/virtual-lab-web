'use client'

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, MessageSquare, X, Trash2, Sparkles, Bot,
  ChevronUp, ChevronDown, ThumbsUp, ThumbsDown, HelpCircle, ClipboardCopy, Check,
  Pin, Search, ChevronRight, ChevronLeft, BarChart3, Lightbulb, Target,
  MessageCircleQuestion,
} from 'lucide-react'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { Agent } from './shared-components'

// ============================================================
// Types
// ============================================================

export interface AgentChatMessage {
  id: string
  role: 'user' | 'agent'
  content: string
  agentName?: string
  agentColor?: string
  timestamp: Date
  isFromApi?: boolean
}

export interface AgentChatPanelProps {
  agents: Agent[]
  lang: Lang
  isOpen: boolean
  onClose: () => void
}

// ============================================================
// Reaction types
// ============================================================

type ReactionType = 'thumbsUp' | 'thumbsDown' | 'thinking' | 'insight' | 'keyPoint'

interface ReactionData {
  thumbsUp: number
  thumbsDown: number
  thinking: number
  insight: number
  keyPoint: number
  userReaction: ReactionType | null
}

interface MessageReaction {
  helpful: boolean
  helpfulCount: number
  unclearCount: number
  copied: boolean
}

const REACTION_CONFIG: { type: ReactionType; emoji: string; labelKey: string }[] = [
  { type: 'thumbsUp', emoji: '👍', labelKey: 'chatEnhanced.reaction.thumbsUp' },
  { type: 'thumbsDown', emoji: '👎', labelKey: 'chatEnhanced.reaction.thumbsDown' },
  { type: 'thinking', emoji: '🤔', labelKey: 'chatEnhanced.reaction.thinking' },
  { type: 'insight', emoji: '💡', labelKey: 'chatEnhanced.reaction.insight' },
  { type: 'keyPoint', emoji: '🎯', labelKey: 'chatEnhanced.reaction.keyPoint' },
]

// ============================================================
// Simulated AI response templates based on agent role/expertise
// ============================================================

function generateAgentResponse(agent: Agent, userMessage: string): string {
  const expertise = agent.expertise.toLowerCase()
  const role = agent.role.toLowerCase()
  const goal = agent.goal.toLowerCase()
  const msg = userMessage.toLowerCase()

  if (msg.includes('research') || msg.includes('focus') || msg.includes('expertise')) {
    return `Based on my expertise in ${agent.expertise}, my research focuses on ${goal}. I approach this by combining computational methods with evidence-based analysis. I believe the most promising avenue is to leverage interdisciplinary insights while maintaining scientific rigor.`
  }

  if (msg.includes('experiment') || msg.includes('suggest') || msg.includes('proposal')) {
    if (role.includes('lead') || role.includes('principal') || role.includes('pi') || role.includes('investigator')) {
      return `That's an excellent direction. As the team lead, I'd suggest we structure this experiment with clear controls and measurable outcomes. Let me outline a phased approach: first establish baseline measurements, then systematically vary the key parameters while tracking our primary endpoints. We should also consider potential confounders and plan for replication. What specific aspect would you like to explore first?`
    }
    if (role.includes('critic') || role.includes('review')) {
      return `Before we proceed, let me raise a few critical points about this experimental design. First, we need to ensure our sample size provides adequate statistical power. Second, I'd recommend including appropriate negative controls. Third, consider whether the proposed methodology has been validated in similar contexts. These considerations will strengthen the reliability of our findings.`
    }
    return `I'd recommend designing this experiment with our specific computational tools in mind. Based on my ${agent.expertise}, we could start with in silico predictions to narrow down candidate targets, followed by targeted validation. Key parameters to optimize include temperature, concentration ranges, and time points. Shall I detail a specific protocol?`
  }

  if (msg.includes('hypothesis') || msg.includes('theory') || msg.includes('idea')) {
    return `This hypothesis is well-grounded in existing literature. The mechanism you're describing aligns with what we know from ${agent.expertise}. To test this rigorously, I'd propose the following approach: (1) identify testable predictions, (2) design experiments that can falsify the hypothesis, (3) establish quantitative metrics for evaluation. The strength of this hypothesis lies in its specificity and falsifiability.`
  }

  if (msg.includes('data') || msg.includes('result') || msg.includes('analysis')) {
    return `Looking at the data from my perspective in ${agent.expertise}, I notice several interesting patterns. The key finding appears to be statistically significant (p < 0.05), but we should also consider the effect size and practical significance. I'd recommend a more granular analysis breaking down by subgroups to identify any interaction effects. Would you like me to suggest specific visualization approaches?`
  }

  if (msg.includes('help') || msg.includes('what can you') || msg.includes('tell me about')) {
    return `I'm ${agent.title}, specializing in ${agent.expertise}. My role is to ${agent.role}, with the goal of ${agent.goal}. I can help with research design, data analysis, literature interpretation, and experimental planning. Feel free to ask me anything related to our research agenda — I'll provide evidence-based, actionable insights.`
  }

  if (msg.includes('thank') || msg.includes('great') || msg.includes('good job')) {
    return `Thank you! I'm glad I could help. If you have follow-up questions or want to explore other aspects of our research, I'm here. Collaboration is key to making progress in ${agent.expertise}, and your questions help sharpen our thinking.`
  }

  const defaultResponses = [
    `That's an interesting question from the perspective of ${agent.expertise}. Let me think about this carefully.\n\nBased on my experience and the available evidence, I'd approach this by first considering the fundamental principles at play. The key factors to consider include the theoretical framework, available computational tools, and the specific constraints of our experimental system.\n\nWould you like me to elaborate on any particular aspect?`,
    `As someone focused on ${goal}, I find this question quite relevant to our current research direction.\n\nThe most important consideration here is balancing innovation with rigor. I'd suggest we review the existing literature first, identify gaps, and then design a targeted approach. My expertise in ${agent.expertise} gives me confidence that we can make meaningful progress on this front.`,
    `This connects well with ${agent.role}. In my analysis, there are three key dimensions to consider:\n\n1. **Theoretical foundation** — Does this align with established principles?\n2. **Practical feasibility** — Can we implement this with our current resources?\n3. **Impact potential** — What would success look like?\n\nLet me know which dimension you'd like to explore further.`,
  ]

  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)]
}

// ============================================================
// Quick Prompt Suggestions
// ============================================================

function getSuggestionChips(lang: Lang): { key: string; label: string }[] {
  return [
    { key: 'summarize', label: t(lang, 'chat.suggestions.summarize') },
    { key: 'experiment', label: t(lang, 'chat.suggestions.experiment') },
    { key: 'compare', label: t(lang, 'chat.suggestions.compare') },
    { key: 'report', label: t(lang, 'chat.suggestions.report') },
  ]
}

// ============================================================
// Quick Reply Generator
// ============================================================

function getQuickReplies(lastAgentMessage: string, lang: Lang): string[] {
  const msg = lastAgentMessage.toLowerCase()
  const replies: string[] = []

  if (msg.includes('?') || msg.includes('would you like') || msg.includes('shall i')) {
    replies.push(t(lang, 'chatEnhanced.quickReply.yes'))
    replies.push(t(lang, 'chatEnhanced.quickReply.no'))
    replies.push(t(lang, 'chatEnhanced.quickReply.moreDetails'))
  } else if (msg.includes('suggest') || msg.includes('recommend') || msg.includes('propose')) {
    replies.push(t(lang, 'chatEnhanced.quickReply.example'))
    replies.push(t(lang, 'chatEnhanced.quickReply.howTo'))
    replies.push(t(lang, 'chatEnhanced.quickReply.explain'))
  } else {
    replies.push(t(lang, 'chatEnhanced.quickReply.moreDetails'))
    replies.push(t(lang, 'chatEnhanced.quickReply.example'))
    replies.push(t(lang, 'chatEnhanced.quickReply.explain'))
  }

  return replies.slice(0, 3)
}

// ============================================================
// Helper: highlight text
// ============================================================

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>

  const parts: React.ReactNode[] = []
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  let lastIndex = 0
  let matchIndex = lowerText.indexOf(lowerQuery)

  while (matchIndex !== -1) {
    if (matchIndex > lastIndex) {
      parts.push(text.slice(lastIndex, matchIndex))
    }
    parts.push(
      <span key={matchIndex} className="chat-search-highlight">
        {text.slice(matchIndex, matchIndex + query.length)}
      </span>
    )
    lastIndex = matchIndex + query.length
    matchIndex = lowerText.indexOf(lowerQuery, lastIndex)
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return <>{parts}</>
}

// ============================================================
// Main Component
// ============================================================

export function AgentChatPanel({ agents, lang, isOpen, onClose }: AgentChatPanelProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')
  const [chatHistories, setChatHistories] = useState<Map<string, AgentChatMessage[]>>(new Map())
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [reactions, setReactions] = useState<Map<string, MessageReaction>>(new Map())
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null)

  // --- Feature 1: Enhanced Reactions ---
  const [emojiReactions, setEmojiReactions] = useState<Map<string, ReactionData>>(new Map())
  const [showReactionsFor, setShowReactionsFor] = useState<string | null>(null)

  // --- Feature 2: Pinned Messages ---
  const [pinnedMessageIds, setPinnedMessageIds] = useState<string[]>([])
  const [pinnedExpanded, setPinnedExpanded] = useState(true)

  // --- Feature 3: Search ---
  const [searchQuery, setSearchQuery] = useState('')
  const [searchMatchIndex, setSearchMatchIndex] = useState(0)

  // --- Feature 4: Stats bar ---
  const [statsExpanded, setStatsExpanded] = useState(false)
  const [sessionStart] = useState<Date>(new Date())

  // --- Feature 6: Typing estimate ---
  const [typingStartTime, setTypingStartTime] = useState<number>(0)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedAgent = useMemo(
    () => agents.find(a => a.id === selectedAgentId) || null,
    [agents, selectedAgentId]
  )

  const currentMessages = useMemo(
    () => chatHistories.get(selectedAgentId) || [],
    [chatHistories, selectedAgentId]
  )

  const totalMessageCount = useMemo(() => {
    let count = 0
    chatHistories.forEach(msgs => { count += msgs.length })
    return count
  }, [chatHistories])

  const suggestionChips = useMemo(() => getSuggestionChips(lang), [lang])

  // --- Search filtering ---
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return currentMessages
    const q = searchQuery.toLowerCase()
    return currentMessages.filter(m => m.content.toLowerCase().includes(q))
  }, [currentMessages, searchQuery])

  const searchMatchCount = useMemo(() => {
    if (!searchQuery.trim()) return 0
    return filteredMessages.length
  }, [filteredMessages, searchQuery])

  // --- Pinned messages data ---
  const pinnedMessages = useMemo(() => {
    return pinnedMessageIds
      .map(id => currentMessages.find(m => m.id === id))
      .filter((m): m is AgentChatMessage => !!m)
  }, [pinnedMessageIds, currentMessages])

  // --- Chat statistics ---
  const chatStats = useMemo(() => {
    const msgs = currentMessages
    if (msgs.length === 0) return { total: 0, agentPct: 0, avgLen: 0, duration: 0 }
    const agentCount = msgs.filter(m => m.role === 'agent').length
    const totalChars = msgs.reduce((s, m) => s + m.content.length, 0)
    const durationSecs = Math.floor((Date.now() - sessionStart.getTime()) / 1000)
    const mins = Math.floor(durationSecs / 60)
    const secs = durationSecs % 60
    return {
      total: msgs.length,
      agentPct: msgs.length > 0 ? Math.round((agentCount / msgs.length) * 100) : 0,
      avgLen: msgs.length > 0 ? Math.round(totalChars / msgs.length) : 0,
      duration: mins > 0 ? `${mins}m ${secs}s` : `${secs}s`,
    }
  }, [currentMessages, sessionStart])

  // --- Typing estimated time ---
  const typingEstimate = useMemo(() => {
    if (!isTyping || !typingStartTime) return null
    const elapsed = Math.floor((Date.now() - typingStartTime) / 1000)
    const agentMsgs = currentMessages.filter(m => m.role === 'agent')
    if (agentMsgs.length === 0) return '~2s'
    const avgLen = agentMsgs.reduce((s, m) => s + m.content.length, 0) / agentMsgs.length
    const estimated = Math.max(1, Math.min(10, Math.round(avgLen / 80)))
    const remaining = Math.max(0, estimated - elapsed)
    return remaining
  }, [isTyping, typingStartTime, currentMessages])

  // --- Quick replies ---
  const quickReplies = useMemo(() => {
    if (currentMessages.length === 0 || isTyping) return []
    const lastMsg = currentMessages[currentMessages.length - 1]
    if (lastMsg.role !== 'agent') return []
    return getQuickReplies(lastMsg.content, lang)
  }, [currentMessages, isTyping, lang])

  // Auto-scroll to bottom when new messages appear
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentMessages, isTyping])

  // Auto-select first agent when agents change and none is selected
  useEffect(() => {
    if (agents.length > 0 && !selectedAgentId) {
      setSelectedAgentId(agents[0].id)
    }
    if (selectedAgentId && !agents.find(a => a.id === selectedAgentId)) {
      setSelectedAgentId(agents[0]?.id || '')
    }
  }, [agents, selectedAgentId])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && !isCollapsed) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen, isCollapsed])

  // Typing estimate timer
  useEffect(() => {
    if (!isTyping) return
    const timer = setInterval(() => {
      setTypingStartTime(prev => {
        if (prev === 0) return Date.now()
        return prev
      })
    }, 500)
    return () => clearInterval(timer)
  }, [isTyping])

  // Close reactions popup when clicking outside
  useEffect(() => {
    if (!showReactionsFor) return
    const handler = () => setShowReactionsFor(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [showReactionsFor])

  const generateId = useCallback(() => {
    return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }, [])

  // --- Feature 1: Toggle emoji reaction ---
  const handleToggleEmojiReaction = useCallback((messageId: string, type: ReactionType) => {
    setEmojiReactions(prev => {
      const next = new Map(prev)
      const current = next.get(messageId) || { thumbsUp: 0, thumbsDown: 0, thinking: 0, insight: 0, keyPoint: 0, userReaction: null }
      if (current.userReaction === type) {
        // Remove own reaction
        next.set(messageId, { ...current, [type]: Math.max(0, current[type] - 1), userReaction: null })
      } else {
        // Add reaction, remove old if any
        const updated = { ...current, userReaction: type }
        if (current.userReaction) {
          updated[current.userReaction] = Math.max(0, updated[current.userReaction] - 1)
        }
        updated[type] = updated[type] + 1
        next.set(messageId, updated)
      }
      return next
    })
    setShowReactionsFor(null)
  }, [])

  // --- Feature 2: Toggle pin ---
  const handleTogglePin = useCallback((messageId: string) => {
    setPinnedMessageIds(prev => {
      if (prev.includes(messageId)) {
        return prev.filter(id => id !== messageId)
      }
      if (prev.length >= 5) {
        return prev.slice(1).concat([messageId]) // Replace oldest
      }
      return [...prev, messageId]
    })
  }, [])

  // --- Feature 3: Search navigation ---
  const handleSearchNavigate = useCallback((dir: 'prev' | 'next') => {
    setSearchMatchIndex(prev => {
      if (dir === 'next') return prev < searchMatchCount - 1 ? prev + 1 : 0
      return prev > 0 ? prev - 1 : searchMatchCount - 1
    })
  }, [searchMatchCount])

  const handleSendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !selectedAgentId || !selectedAgent) return

    const userMessage: AgentChatMessage = {
      id: generateId(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    }

    setChatHistories(prev => {
      const next = new Map(prev)
      const existing = next.get(selectedAgentId) || []
      next.set(selectedAgentId, [...existing, userMessage])
      return next
    })

    setInputValue('')
    setSearchQuery('')
    setIsTyping(true)
    setTypingStartTime(Date.now())

    const currentHistory = chatHistories.get(selectedAgentId) || []
    const recentHistory = currentHistory
      .slice(-10)
      .map(m => ({
        role: m.role === 'user' ? 'user' as const : 'assistant' as const,
        content: m.content,
      }))

    try {
      const res = await fetch(`/api/agents/${selectedAgentId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content.trim(),
          history: recentHistory,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const agentResponse: AgentChatMessage = {
          id: generateId(),
          role: 'agent',
          content: data.response,
          agentName: data.agentName || selectedAgent.title,
          agentColor: selectedAgent.color,
          timestamp: new Date(),
          isFromApi: true,
        }

        setChatHistories(prev => {
          const next = new Map(prev)
          const existing = next.get(selectedAgentId) || []
          next.set(selectedAgentId, [...existing, agentResponse])
          return next
        })

        setIsTyping(false)
        return
      }
    } catch {
      // fall through to simulated
    }

    const delay = 800 + Math.random() * 400
    setTimeout(() => {
      const agentResponse: AgentChatMessage = {
        id: generateId(),
        role: 'agent',
        content: generateAgentResponse(selectedAgent, content.trim()),
        agentName: selectedAgent.title,
        agentColor: selectedAgent.color,
        timestamp: new Date(),
        isFromApi: false,
      }

      setChatHistories(prev => {
        const next = new Map(prev)
        const existing = next.get(selectedAgentId) || []
        next.set(selectedAgentId, [...existing, agentResponse])
        return next
      })

      setIsTyping(false)
    }, delay)
  }, [selectedAgentId, selectedAgent, generateId, chatHistories])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    handleSendMessage(inputValue)
  }, [inputValue, handleSendMessage])

  const handleClearChat = useCallback(() => {
    setChatHistories(prev => {
      const next = new Map(prev)
      next.set(selectedAgentId, [])
      return next
    })
    setReactions(prev => {
      const next = new Map(prev)
      const msgs = chatHistories.get(selectedAgentId) || []
      msgs.forEach(msg => next.delete(msg.id))
      return next
    })
    setEmojiReactions(prev => {
      const next = new Map(prev)
      const msgs = chatHistories.get(selectedAgentId) || []
      msgs.forEach(msg => next.delete(msg.id))
      return next
    })
    setPinnedMessageIds([])
  }, [selectedAgentId, chatHistories])

  const handleToggleHelpful = useCallback((messageId: string) => {
    setReactions(prev => {
      const next = new Map(prev)
      const current = next.get(messageId) || { helpful: false, helpfulCount: 0, unclearCount: 0, copied: false }
      if (current.helpful) {
        next.set(messageId, { ...current, helpful: false, helpfulCount: Math.max(0, current.helpfulCount - 1) })
      } else {
        next.set(messageId, { ...current, helpful: true, helpfulCount: current.helpfulCount + 1 })
      }
      return next
    })
  }, [])

  const handleMarkUnclear = useCallback((messageId: string) => {
    setReactions(prev => {
      const next = new Map(prev)
      const current = next.get(messageId) || { helpful: false, helpfulCount: 0, unclearCount: 0, copied: false }
      next.set(messageId, { ...current, unclearCount: current.unclearCount + 1 })
      return next
    })
  }, [])

  const handleCopyMessage = useCallback((messageId: string, content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setReactions(prev => {
        const next = new Map(prev)
        const current = next.get(messageId) || { helpful: false, helpfulCount: 0, unclearCount: 0, copied: false }
        next.set(messageId, { ...current, copied: true })
        return next
      })
      setTimeout(() => {
        setReactions(prev => {
          const next = new Map(prev)
          const current = next.get(messageId)
          if (current) next.set(messageId, { ...current, copied: false })
          return next
        })
      }, 2000)
    }).catch(() => {/* clipboard write failed */})
  }, [])

  const handleSuggestionClick = useCallback((label: string) => {
    setInputValue(label)
    inputRef.current?.focus()
  }, [])

  const formatTime = useCallback((date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }, [])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] sm:w-[420px] agent-chat-panel rounded-xl border border-[var(--vl-border)] shadow-2xl overflow-hidden"
        style={{ background: 'var(--vl-bg-secondary)' }}
        role="dialog"
        aria-label="Agent Chat Panel"
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 py-3 border-b border-[var(--vl-border-subtle)] cursor-pointer select-none"
          onClick={() => setIsCollapsed(prev => !prev)}
          role="button"
          aria-expanded={!isCollapsed}
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsCollapsed(prev => !prev) }}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
              <MessageSquare className="size-4 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold vl-text-heading truncate">
                {lang === 'zh' ? 'AI 智能体对话' : 'Agent Chat'}
              </h3>
              <div className="flex items-center gap-1.5">
                {totalMessageCount > 0 && (
                  <span className="text-[10px] vl-text-muted">
                    {totalMessageCount} {lang === 'zh' ? '条消息' : 'messages'}
                  </span>
                )}
                {currentMessages.length > 0 && (
                  <span className="inline-flex items-center min-w-[16px] h-4 px-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-bold">
                    {currentMessages.length}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <motion.div
              animate={{ rotate: isCollapsed ? 0 : 180 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="size-4 vl-text-muted" />
            </motion.div>
            <button
              onClick={(e) => { e.stopPropagation(); onClose() }}
              className="p-1.5 rounded-lg hover:bg-[var(--vl-bg-card-hover)] transition-colors vl-text-muted hover:text-red-400"
              aria-label="Close chat panel"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="flex flex-col" style={{ height: '520px' }}>

                {/* Agent Selector */}
                <div className="px-4 pt-3 pb-2">
                  <div className="relative">
                    <Bot className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 vl-text-muted pointer-events-none" />
                    <select
                      value={selectedAgentId}
                      onChange={(e) => { setSelectedAgentId(e.target.value); setPinnedMessageIds([]) }}
                      className="w-full pl-9 pr-8 py-2 text-sm rounded-lg vl-input border border-[var(--vl-border)] appearance-none cursor-pointer vl-text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all"
                      aria-label="Select agent to chat with"
                    >
                      {agents.map(agent => (
                        <option key={agent.id} value={agent.id}>
                          {agent.title} — {agent.expertise.slice(0, 40)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 vl-text-muted pointer-events-none" />
                  </div>
                </div>

                {/* Feature 4: Chat Statistics Bar (collapsible) */}
                {currentMessages.length > 0 && (
                  <div className="px-4 pb-1">
                    <button
                      onClick={() => setStatsExpanded(prev => !prev)}
                      className="w-full flex items-center gap-1 text-[10px] vl-text-muted hover:text-emerald-400 transition-colors"
                    >
                      <motion.div animate={{ rotate: statsExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronRight className="size-3" />
                      </motion.div>
                      <BarChart3 className="size-3" />
                      <span className="font-medium">{t(lang, 'chatEnhanced.stats.title')}</span>
                    </button>
                    <AnimatePresence>
                      {statsExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="chat-stat-bar flex items-center gap-3 pt-1 pb-1.5 px-1">
                            <span className="flex items-center gap-1">
                              <MessageSquare className="size-2.5" />
                              {chatStats.total} {t(lang, 'chatEnhanced.stats.messages')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Bot className="size-2.5" />
                              {t(lang, 'chatEnhanced.stats.agentRatio')} {chatStats.agentPct}%
                              <span className="inline-block w-12 h-1.5 rounded-full bg-[var(--vl-border)] overflow-hidden ml-0.5">
                                <span
                                  className="block h-full rounded-full bg-emerald-500"
                                  style={{ width: `${chatStats.agentPct}%` }}
                                />
                              </span>
                            </span>
                            <span className="flex items-center gap-1">
                              <Lightbulb className="size-2.5" />
                              {t(lang, 'chatEnhanced.stats.avgLength')} {chatStats.avgLen} {t(lang, 'chatEnhanced.stats.words')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Target className="size-2.5" />
                              {chatStats.duration}
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Feature 3: Search Input */}
                {currentMessages.length > 0 && (
                  <div className="px-4 pb-2">
                    <div className="relative flex items-center gap-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 vl-text-muted pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setSearchMatchIndex(0) }}
                        placeholder={t(lang, 'chatEnhanced.search.placeholder')}
                        className="w-full pl-8 pr-2 py-1.5 text-[11px] rounded-md vl-input border border-[var(--vl-border)] vl-text-heading placeholder:text-[var(--vl-text-muted)] focus:outline-none focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all"
                      />
                      {searchQuery.trim() && searchMatchCount > 0 && (
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            onClick={() => handleSearchNavigate('prev')}
                            className="p-0.5 rounded hover:bg-[var(--vl-bg-card-hover)] transition-colors vl-text-muted hover:text-emerald-400"
                            aria-label={t(lang, 'chatEnhanced.search.prev')}
                          >
                            <ChevronLeft className="size-3" />
                          </button>
                          <span className="text-[9px] vl-text-muted whitespace-nowrap px-0.5">
                            {searchMatchIndex + 1}/{searchMatchCount}
                          </span>
                          <button
                            onClick={() => handleSearchNavigate('next')}
                            className="p-0.5 rounded hover:bg-[var(--vl-bg-card-hover)] transition-colors vl-text-muted hover:text-emerald-400"
                            aria-label={t(lang, 'chatEnhanced.search.next')}
                          >
                            <ChevronRight className="size-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">

                  {/* Feature 2: Pinned Messages (collapsible) */}
                  <AnimatePresence>
                    {pinnedMessages.length > 0 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <button
                          onClick={() => setPinnedExpanded(prev => !prev)}
                          className="w-full flex items-center gap-1.5 py-2 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                          <Pin className="size-3" />
                          <span>{t(lang, 'chatEnhanced.pin.pinnedMessages')}</span>
                          <span className="text-[9px] text-emerald-500/60">({pinnedMessages.length}/5)</span>
                          <motion.div animate={{ rotate: pinnedExpanded ? 180 : 0 }} transition={{ duration: 0.2 }} className="ml-auto">
                            <ChevronDown className="size-3" />
                          </motion.div>
                        </button>
                        <AnimatePresence>
                          {pinnedExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="space-y-1.5 pb-2 max-h-48 overflow-y-auto custom-scrollbar">
                                {pinnedMessages.map(msg => (
                                  <div
                                    key={`pinned-${msg.id}`}
                                    className="chat-pinned-msg rounded-md px-2.5 py-1.5 text-left"
                                    onClick={() => {
                                      const el = document.querySelector(`[data-msg-id="${msg.id}"]`)
                                      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                    }}
                                  >
                                    <div className="flex items-center gap-1 mb-0.5">
                                      <Pin className="size-2.5 text-emerald-500 shrink-0" />
                                      <span className="text-[10px] font-semibold" style={{ color: msg.agentColor || '#10b981' }}>
                                        {msg.agentName || 'You'}
                                      </span>
                                      <span className="text-[9px] vl-text-muted ml-auto">
                                        {formatTime(msg.timestamp)}
                                      </span>
                                    </div>
                                    <p className="text-[10px] vl-text-body line-clamp-2">{msg.content.slice(0, 120)}{msg.content.length > 120 ? '...' : ''}</p>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Message list */}
                  {filteredMessages.length === 0 && !isTyping ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-8">
                      <motion.div
                        animate={{ y: [0, -6, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <Sparkles className="size-10 text-emerald-400/60 mb-3" />
                      </motion.div>
                      <p className="text-sm font-medium vl-text-heading mb-1">
                        {lang === 'zh' ? '开始与智能体对话' : 'Start chatting with an agent'}
                      </p>
                      <p className="text-xs vl-text-muted max-w-[240px]">
                        {lang === 'zh'
                          ? '选择一个智能体，输入消息或使用下方的快捷提示开始对话'
                          : 'Select an agent and type a message or use a quick prompt below to begin'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 py-3">
                      {filteredMessages.map((msg) => {
                        const isPinned = pinnedMessageIds.includes(msg.id)
                        const emojiReaction = emojiReactions.get(msg.id)

                        return (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`chat-msg-enter flex ${msg.role === 'user' ? 'justify-end' : 'justify-start gap-2.5'}`}
                          >
                            {msg.role === 'agent' && (
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-semibold text-white text-xs mt-0.5"
                                style={{ backgroundColor: msg.agentColor || '#10b981' }}
                              >
                                {(msg.agentName || 'A').charAt(0).toUpperCase()}
                              </div>
                            )}

                            <div
                              className={`group max-w-[75%] rounded-2xl px-3.5 py-2.5 ${
                                msg.role === 'user'
                                  ? 'bg-emerald-500/15 border border-emerald-500/20 rounded-br-sm'
                                  : `vl-card border ${isPinned ? 'border-emerald-500/40' : 'border-[var(--vl-border-subtle)]'} rounded-bl-sm chat-bubble-glow`
                              }`}
                              data-msg-id={msg.id}
                              onMouseEnter={() => msg.role === 'agent' ? setHoveredMessageId(msg.id) : undefined}
                              onMouseLeave={() => setHoveredMessageId(null)}
                            >
                              {msg.role === 'agent' && (
                                <div className="flex items-center gap-2 mb-1">
                                  <span
                                    className="text-[11px] font-semibold"
                                    style={{ color: msg.agentColor || '#10b981' }}
                                  >
                                    {msg.agentName}
                                  </span>
                                  {msg.isFromApi && (
                                    <span className="inline-flex items-center px-1.5 py-0 rounded-full bg-emerald-500/20 text-emerald-400 text-[8px] font-bold leading-tight">
                                      AI
                                    </span>
                                  )}
                                  {isPinned && (
                                    <span className="inline-flex items-center px-1.5 py-0 rounded-full bg-emerald-500/20 text-emerald-400 text-[8px] font-bold leading-tight gap-0.5">
                                      <Pin className="size-2.5" />
                                      {t(lang, 'chatEnhanced.pin.pinned')}
                                    </span>
                                  )}
                                  <span className="text-[9px] vl-text-muted">{formatTime(msg.timestamp)}</span>
                                </div>
                              )}
                              {msg.role === 'user' && (
                                <span className="block text-[9px] vl-text-muted mb-1 text-right">
                                  {formatTime(msg.timestamp)}
                                </span>
                              )}
                              <p className="text-[13px] leading-relaxed vl-text-body whitespace-pre-wrap">
                                {searchQuery.trim() ? (
                                  <HighlightedText text={msg.content} query={searchQuery} />
                                ) : msg.content}
                              </p>

                              {/* Feature 1: Emoji Reactions (agent messages) */}
                              {msg.role === 'agent' && (
                                <>
                                  <div className={`flex items-center gap-1 mt-2 pt-1.5 border-t border-[var(--vl-border-subtle)]/50 transition-opacity duration-200 ${
                                    hoveredMessageId === msg.id ? 'opacity-100' : 'opacity-0'
                                  }`}>
                                    {/* Copy button */}
                                    <button
                                      onClick={() => handleCopyMessage(msg.id, msg.content)}
                                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] transition-colors ${
                                        reactions.get(msg.id)?.copied
                                          ? 'bg-emerald-500/20 text-emerald-400'
                                          : 'hover:bg-[var(--vl-bg-card-hover)] vl-text-muted hover:text-emerald-400'
                                      }`}
                                      aria-label={t(lang, 'chat.reactions.copy')}
                                    >
                                      {reactions.get(msg.id)?.copied ? <Check className="size-3" /> : <ClipboardCopy className="size-3" />}
                                      {reactions.get(msg.id)?.copied && (
                                        <span className="text-[9px] font-medium">{t(lang, 'chat.reactions.copied')}</span>
                                      )}
                                    </button>

                                    {/* Pin button */}
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleTogglePin(msg.id) }}
                                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] transition-colors ${
                                        isPinned
                                          ? 'bg-emerald-500/20 text-emerald-400'
                                          : 'hover:bg-[var(--vl-bg-card-hover)] vl-text-muted hover:text-emerald-400'
                                      }`}
                                      aria-label={isPinned ? t(lang, 'chatEnhanced.pin.unpinMessage') : t(lang, 'chatEnhanced.pin.pinMessage')}
                                    >
                                      <Pin className={`size-3 ${isPinned ? 'fill-current' : ''}`} />
                                    </button>

                                    {/* Emoji reaction trigger */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setShowReactionsFor(showReactionsFor === msg.id ? null : msg.id)
                                      }}
                                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] hover:bg-[var(--vl-bg-card-hover)] vl-text-muted hover:text-emerald-400 transition-colors"
                                      aria-label="Add reaction"
                                    >
                                      <ThumbsUp className="size-3" />
                                      {emojiReaction && emojiReaction.userReaction && (
                                        <span className="text-[9px]">{REACTION_CONFIG.find(r => r.type === emojiReaction.userReaction)?.emoji}</span>
                                      )}
                                    </button>
                                  </div>

                                  {/* Emoji reaction popup */}
                                  <AnimatePresence>
                                    {showReactionsFor === msg.id && (
                                      <motion.div
                                        initial={{ opacity: 0, scale: 0.8, y: 4 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.8, y: 4 }}
                                        transition={{ duration: 0.15 }}
                                        className="absolute right-0 bottom-full mb-1 z-10 flex items-center gap-0.5 px-1.5 py-1 rounded-lg vl-card border border-[var(--vl-border)] shadow-lg"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {REACTION_CONFIG.map(({ type, emoji, labelKey }) => {
                                          const isActive = emojiReaction?.userReaction === type
                                          const count = emojiReaction?.[type] ?? 0
                                          return (
                                            <button
                                              key={type}
                                              onClick={() => handleToggleEmojiReaction(msg.id, type)}
                                              className={`chat-reaction-btn flex items-center gap-0.5 px-1.5 py-1 rounded-md text-[12px] ${
                                                isActive ? 'chat-reaction-active' : 'hover:bg-[var(--vl-bg-card-hover)]'
                                              }`}
                                              title={t(lang, labelKey)}
                                            >
                                              <span>{emoji}</span>
                                              {count > 0 && <span className="text-[8px] vl-text-muted">{count}</span>}
                                            </button>
                                          )
                                        })}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>

                                  {/* Reaction counts display */}
                                  {emojiReaction && (emojiReaction.thumbsUp > 0 || emojiReaction.thumbsDown > 0 || emojiReaction.thinking > 0 || emojiReaction.insight > 0 || emojiReaction.keyPoint > 0) && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {REACTION_CONFIG.map(({ type, emoji }) => {
                                        const count = emojiReaction?.[type] ?? 0
                                        if (count === 0) return null
                                        return (
                                          <span key={type} className="inline-flex items-center gap-0.5 text-[9px] vl-text-muted">
                                            {emoji}{count}
                                          </span>
                                        )
                                      })}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </motion.div>
                        )
                      })}

                      {/* Feature 6: Enhanced Typing Indicator */}
                      {isTyping && selectedAgent && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="flex gap-2.5"
                        >
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-semibold text-white text-xs"
                            style={{ backgroundColor: selectedAgent.color }}
                          >
                            {selectedAgent.title.charAt(0).toUpperCase()}
                          </div>
                          <div className="vl-card border border-[var(--vl-border-subtle)] rounded-2xl rounded-bl-sm px-4 py-3 glow-border-emerald">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-semibold" style={{ color: selectedAgent.color }}>
                                {selectedAgent.title}
                              </span>
                              <span className="text-[10px] vl-text-muted mr-1 chat-typing-pulse">
                                {t(lang, 'chat.typing.thinking')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <div className="chat-typing-indicator">
                                <span className="dot" style={{ animationDelay: '0ms' }} />
                                <span className="dot" style={{ animationDelay: '200ms' }} />
                                <span className="dot" style={{ animationDelay: '400ms' }} />
                              </div>
                              {typingEstimate !== null && (
                                <span className="text-[9px] vl-text-muted">
                                  {t(lang, 'chatEnhanced.typing.estimated').replace('{sec}', String(typingEstimate))}
                                </span>
                              )}
                            </div>
                            {/* Progress indicator bar */}
                            <div className="mt-2 h-1 rounded-full bg-[var(--vl-border)] overflow-hidden">
                              <motion.div
                                className="h-full rounded-full bg-emerald-500/60"
                                initial={{ width: '0%' }}
                                animate={{ width: '100%' }}
                                transition={{ duration: 2, ease: 'easeInOut' }}
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}

                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Feature 5: Quick Reply Suggestions + Clear & Quick Prompts */}
                <div className="px-4 pb-2">
                  {currentMessages.length > 0 && (
                    <div className="flex justify-end mb-2">
                      <button
                        onClick={handleClearChat}
                        className="flex items-center gap-1 text-[10px] vl-text-muted hover:text-red-400 transition-colors px-2 py-1 rounded-md hover:bg-red-500/10"
                        aria-label="Clear chat history"
                      >
                        <Trash2 className="size-3" />
                        {lang === 'zh' ? '清除对话' : 'Clear chat'}
                      </button>
                    </div>
                  )}

                  {/* Quick Reply Pills */}
                  <AnimatePresence>
                    {quickReplies.length > 0 && !isTyping && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.25 }}
                        className="flex flex-wrap gap-1.5 mb-2"
                      >
                        {quickReplies.map((reply, i) => (
                          <button
                            key={reply}
                            onClick={() => handleSendMessage(reply)}
                            className="chat-quick-reply text-[11px] px-3 py-1.5 rounded-full border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/15 hover:border-emerald-500/50 bg-emerald-500/5"
                            style={{ animation: `quick-reply-appear 0.3s ${0.15 * i}s cubic-bezier(0.23, 1, 0.32, 1) both` }}
                          >
                            {reply}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Suggestion Chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {suggestionChips.map((chip) => (
                      <button
                        key={chip.key}
                        onClick={() => handleSuggestionClick(chip.label)}
                        className="text-[11px] px-3 py-1.5 rounded-full border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/15 hover:border-emerald-500/50 transition-colors"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input Area */}
                <form
                  onSubmit={handleSubmit}
                  className="flex items-center gap-2 px-4 py-3 border-t border-[var(--vl-border-subtle)]"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={
                      lang === 'zh'
                        ? '输入消息...'
                        : 'Type a message...'
                    }
                    disabled={isTyping}
                    className="flex-1 px-3.5 py-2 text-sm rounded-lg vl-input border border-[var(--vl-border)] vl-text-heading placeholder:text-[var(--vl-text-muted)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all disabled:opacity-50"
                    aria-label="Chat message input"
                  />
                  <motion.button
                    type="submit"
                    disabled={!inputValue.trim() || isTyping}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                    aria-label="Send message"
                  >
                    <Send className="size-4" />
                  </motion.button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  )
}
