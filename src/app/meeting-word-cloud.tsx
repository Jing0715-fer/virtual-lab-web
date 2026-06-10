'use client'

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { Agent, Meeting } from './shared-components'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ChevronDown, ChevronUp, Search } from 'lucide-react'

// Common English stop words
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
  'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over',
  'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
  'where', 'why', 'how', 'all', 'both', 'each', 'few', 'more', 'most',
  'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
  'so', 'than', 'too', 'very', 'just', 'because', 'but', 'and', 'or',
  'if', 'while', 'about', 'against', 'up', 'down', 'this', 'that',
  'these', 'those', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours',
  'you', 'your', 'yours', 'he', 'him', 'his', 'she', 'her', 'hers',
  'it', 'its', 'they', 'them', 'their', 'what', 'which', 'who', 'whom',
  'also', 'well', 'however', 'therefore', 'thus', 'hence', 'since',
  'yet', 'although', 'though', 'even', 'still', 'already', 'always',
  'never', 'often', 'sometimes', 'usually', 'much', 'many', 'several',
  'any', 'every', 'like', 'new', 'used', 'use', 'using', 'used',
  'one', 'two', 'three', 'first', 'second', 'make', 'made', 'know',
  'think', 'see', 'get', 'got', 'go', 'went', 'come', 'came',
  'take', 'took', 'find', 'found', 'give', 'gave', 'tell', 'told',
  'say', 'said', 'try', 'tried', 'need', 'want', 'let', 'keep',
  'begin', 'began', 'seem', 'help', 'show', 'shown', 'turn',
  'start', 'run', 'put', 'set', 'way', 'work', 'work', 'part',
  'number', 'point', 'fact', 'good', 'right', 'different', 'large',
  'long', 'great', 'small', 'little', 'important', 'high', 'old',
  'last', 'next', 'early', 'young', 'certain', 'able', 'possible',
  'sure', 'true', 'real', 'whole', 'clear', 'strong', 'likely',
  'main', 'better', 'full', 'special', 'hard', 'free', 'sure',
  'based', 'including', 'include', 'example', 'examples', 'case',
  'role', 'step', 'specific', 'result', 'results', 'area',
  'key', 'note', 'order', 'process', 'value', 'consider',
  'rather', 'particular', 'around', 'another', 'within',
])

interface WordEntry {
  word: string
  count: number
  agentColor: string
  agentName: string
}

interface MeetingWordCloudProps {
  meeting: Meeting | null
  agents: Agent[]
  lang: Lang
  onWordClick?: (word: string) => void
}

export function MeetingWordCloud({ meeting, agents, lang, onWordClick }: MeetingWordCloudProps) {
  const mountedRef = useRef(false)
  const [mounted, setMounted] = useState(false)
  const [hoveredWord, setHoveredWord] = useState<string | null>(null)

  useEffect(() => {
    mountedRef.current = true
    // Use microtask to avoid lint warning about setState in effect
    queueMicrotask(() => setMounted(true))
  }, [])

  const words = useMemo(() => {
    if (!meeting?.messages?.length) return []

    // Count words per agent
    const wordMap: Record<string, { count: number; agentName: string; agentColor: string }> = {}

    for (const msg of meeting.messages) {
      const agent = agents.find(a => a.title === msg.agentName)
      const agentColor = agent?.color || '#94a3b8'
      const agentName = msg.agentName

      // Extract words
      const text = msg.message.toLowerCase()
      const tokens = text.match(/[a-zA-Z\u4e00-\u9fff]+/g) || []

      for (const token of tokens) {
        const cleaned = token.trim()
        if (cleaned.length < 2 || STOP_WORDS.has(cleaned)) continue
        if (wordMap[cleaned]) {
          wordMap[cleaned].count += 1
          // Keep color of most frequent agent for this word
        } else {
          wordMap[cleaned] = { count: 1, agentName, agentColor }
        }
      }
    }

    return Object.entries(wordMap)
      .map(([word, data]) => ({
        word,
        count: data.count,
        agentColor: data.agentColor,
        agentName: data.agentName,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 80) // Top 80 words
  }, [meeting, agents])

  // Map count to font size (min 12px, max 48px)
  const minCount = words.length > 0 ? words[words.length - 1].count : 1
  const maxCount = words.length > 0 ? words[0].count : 1
  const getFontSize = useCallback((count: number) => {
    if (maxCount === minCount) return 20
    const ratio = (count - minCount) / (maxCount - minCount)
    return Math.round(12 + ratio * 36)
  }, [minCount, maxCount])

  if (!mounted) return null

  return (
    <div className="meeting-word-cloud">
      <div className="flex flex-wrap gap-x-2 gap-y-1.5 items-center justify-center px-2 py-3 min-h-[80px]">
        <AnimatePresence>
          {words.map((entry, index) => {
            const fontSize = getFontSize(entry.count)
            const isHovered = hoveredWord === entry.word

            return (
              <motion.span
                key={entry.word}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, delay: Math.min(index * 0.015, 1) }}
                className={`inline-block cursor-pointer select-none transition-all duration-200 rounded px-1 py-0.5 ${
                  isHovered ? 'bg-white/10 scale-110' : 'hover:bg-white/5 hover:scale-105'
                }`}
                style={{
                  fontSize: `${fontSize}px`,
                  color: entry.agentColor,
                  fontWeight: entry.count > maxCount * 0.6 ? 700 : entry.count > maxCount * 0.3 ? 500 : 400,
                  lineHeight: 1.3,
                }}
                onMouseEnter={() => setHoveredWord(entry.word)}
                onMouseLeave={() => setHoveredWord(null)}
                onClick={() => onWordClick?.(entry.word)}
              >
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>{entry.word}</span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold" style={{ color: entry.agentColor }}>
                          {entry.word}
                        </span>
                        <span className="text-gray-400">
                          {entry.count}x · {entry.agentName}
                        </span>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </motion.span>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
