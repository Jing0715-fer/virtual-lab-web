'use client'

import React, { useMemo, useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain, FileText, Users, Clock, MessageSquare, BookOpen,
  CheckCircle2, Circle, Plus, X, Sparkles, Link2, ChevronRight,
  Target, Zap, Hash, AlertTriangle, Lightbulb, ClipboardList,
  ArrowRight, ExternalLink, Calendar, UserPlus, TrendingUp,
  LayoutGrid, Eye,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import type { Agent, Meeting, DiscussionMessage } from './shared-components'

// ============================================================
// Types
// ============================================================

interface Props {
  agents: Agent[]
  meetings: Meeting[]
  targetMeeting?: Meeting | null
}

interface ParticipantBrief {
  agent: Agent
  lastMeetingDate: string | null
  keyTopics: string[]
  avgResponseLength: number
  suggestedRole: string
}

interface RelatedMeeting {
  meeting: Meeting
  relevanceScore: number
  sharedAgents: string[]
  sharedKeywords: string[]
}

interface PrepChecklistItem {
  id: string
  text: string
  checked: boolean
  isCustom: boolean
}

// ============================================================
// Constants
// ============================================================

const STOP_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her',
  'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there',
  'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get',
  'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no',
  'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your',
  'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then',
  'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
  'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first',
  'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these',
  'give', 'day', 'most', 'us', 'is', 'are', 'was', 'were', 'been',
  'has', 'had', 'did', 'does', 'should', 'may', 'might', 'must',
  'shall', 'need', 'very', 'still', 'much', 'more', 'here', 'where',
  'while', 'both', 'between', 'each', 'own', 'too', 'same', 'such',
  'through', 'during', 'before', 'being', 'those', 'however', 'based',
  'suggest', 'suggests', 'important', 'approach', 'study', 'data',
  'result', 'results', 'potential', 'focus', 'including', 'consider',
  'using', 'used', 'model', 'models', 'analysis', 'key', 'specific',
  'example', 'several', 'note', 'therefore', 'thus',
  'since', 'although', 'furthermore', 'addition', 'fact', 'often',
  'within', 'different', 'various', 'related', 'provide',
  'able', 'high', 'found', 'show', 'shown', 'given', 'current',
  'overall', 'particularly', 'significant', 'number',
])

// ============================================================
// Helpers
// ============================================================

function getMeetingParticipants(m: Meeting): string[] {
  const names: string[] = []
  if (m.teamLead?.title) names.push(m.teamLead.title)
  if (m.teamMembers) m.teamMembers.forEach(a => { if (!names.includes(a.title)) names.push(a.title) })
  if (m.teamMember?.title && !names.includes(m.teamMember.title)) names.push(m.teamMember.title)
  return names
}

function extractKeywords(text: string): string[] {
  return text.toLowerCase()
    .split(/[\s,.!?;:()"'[\]{}<>\/\\|`~@#$%^&*+=_-]+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w))
}

function computeKeywordFrequency(text: string): Record<string, number> {
  const freq: Record<string, number> = {}
  extractKeywords(text).forEach(w => { freq[w] = (freq[w] || 0) + 1 })
  return freq
}

function findRelatedMeetings(
  target: Meeting,
  allMeetings: Meeting[],
  agents: Agent[]
): RelatedMeeting[] {
  if (!target) return []

  const targetParticipants = new Set(getMeetingParticipants(target))
  const targetKeywords = computeKeywordFrequency(target.agenda + ' ' + (target.summary || ''))
  const targetTopKeywords = Object.entries(targetKeywords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([w]) => w)
  const targetKeywordSet = new Set(targetTopKeywords)

  return allMeetings
    .filter(m => m.id !== target.id && m.status === 'completed' && (m.messages || []).length > 0)
    .map(m => {
      const mParticipants = new Set(getMeetingParticipants(m))
      const sharedAgents = [...mParticipants].filter(n => targetParticipants.has(n))

      const mKeywords = computeKeywordFrequency(m.agenda + ' ' + (m.summary || ''))
      const sharedKeywords = Object.keys(mKeywords).filter(w => targetKeywordSet.has(w))

      const agentScore = sharedAgents.length > 0 ? sharedAgents.length * 3 : 0
      const keywordScore = sharedKeywords.length * 1
      const relevanceScore = agentScore + keywordScore

      return {
        meeting: m,
        relevanceScore,
        sharedAgents,
        sharedKeywords: sharedKeywords.slice(0, 5),
      }
    })
    .filter(r => r.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 5)
}

function generateParticipantBriefs(
  target: Meeting,
  allMeetings: Meeting[],
  agents: Agent[]
): ParticipantBrief[] {
  if (!target) return []

  const participants = getMeetingParticipants(target)
  return participants.map(name => {
    const agent = agents.find(a => a.title === name)
    if (!agent) return null

    // Last meeting participation
    const agentMeetings = allMeetings
      .filter(m => {
        const parts = getMeetingParticipants(m)
        return parts.includes(name) && m.id !== target.id
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    const lastMeetingDate = agentMeetings.length > 0 ? agentMeetings[0].createdAt : null

    // Key topics (word frequency)
    const allMsgs = agentMeetings.flatMap(m => (m.messages || []).filter(msg => msg.agentName === name))
    const wordFreq: Record<string, number> = {}
    allMsgs.forEach(msg => {
      extractKeywords(msg.message).forEach(w => { wordFreq[w] = (wordFreq[w] || 0) + 1 })
    })
    const keyTopics = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([w]) => w)

    // Avg response length
    const avgResponseLength = allMsgs.length > 0
      ? Math.round(allMsgs.reduce((s, m) => s + m.message.length, 0) / allMsgs.length)
      : 0

    // Suggested role based on expertise
    let suggestedRole = 'Contributor'
    if (avgResponseLength > 300) suggestedRole = 'Lead Reviewer'
    else if (avgResponseLength > 200) suggestedRole = 'Senior Analyst'
    else if (avgResponseLength > 100) suggestedRole = 'Discussion Partner'
    else if (agent.expertise.toLowerCase().includes('critical') || agent.expertise.toLowerCase().includes('review')) {
      suggestedRole = 'Devil\'s Advocate'
    } else if (agentMeetings.length === 0) {
      suggestedRole = 'Fresh Perspective'
    }

    return {
      agent,
      lastMeetingDate,
      keyTopics,
      avgResponseLength,
      suggestedRole,
    }
  }).filter(Boolean) as ParticipantBrief[]
}

function generatePrepChecklist(
  target: Meeting,
  relatedMeetings: RelatedMeeting[],
  participantBriefs: ParticipantBrief[]
): PrepChecklistItem[] {
  const items: PrepChecklistItem[] = []
  let idCounter = 0

  // Review previous meetings
  if (relatedMeetings.length > 0) {
    items.push({
      id: `check-${idCounter++}`,
      text: `Review summary of "${relatedMeetings[0].meeting.saveName || relatedMeetings[0].meeting.agenda.slice(0, 40)}"`,
      checked: false,
      isCustom: false,
    })
  }

  // Prepare questions about top keywords
  const targetKeywords = extractKeywords(target.agenda).slice(0, 3)
  if (targetKeywords.length > 0) {
    items.push({
      id: `check-${idCounter++}`,
      text: `Prepare questions about "${targetKeywords[0]}"`,
      checked: false,
      isCustom: false,
    })
  }

  // Invite relevant expert
  const freshPerspective = participantBriefs.find(p => p.suggestedRole === 'Fresh Perspective')
  if (freshPerspective) {
    items.push({
      id: `check-${idCounter++}`,
      text: `Consider ${freshPerspective.agent.title}'s fresh perspective on the topic`,
      checked: false,
      isCustom: false,
    })
  }

  // Check outstanding items
  if (relatedMeetings.length > 0) {
    const recentRelated = relatedMeetings[0]
    if (recentRelated.meeting.status === 'completed' && recentRelated.meeting.summary) {
      items.push({
        id: `check-${idCounter++}`,
        text: 'Review outstanding action items from previous meeting',
        checked: false,
        isCustom: false,
      })
    }
  }

  // Set clear objectives
  items.push({
    id: `check-${idCounter++}`,
    text: 'Define clear objectives and expected outcomes for this meeting',
    checked: false,
    isCustom: false,
  })

  // Devil's advocate
  const devil = participantBriefs.find(p => p.suggestedRole === "Devil's Advocate")
  if (devil) {
    items.push({
      id: `check-${idCounter++}`,
      text: `Prepare counterarguments for ${devil.agent.title} to review`,
      checked: false,
      isCustom: false,
    })
  }

  return items
}

// ============================================================
// Context Graph (SVG)
// ============================================================

function ContextGraph({
  target,
  relatedMeetings,
  agents,
}: {
  target: Meeting
  relatedMeetings: RelatedMeeting[]
  agents: Agent[]
}) {
  const width = 480
  const height = 280
  const centerX = width / 2
  const centerY = height / 2

  const nodes = useMemo(() => {
    const items: { id: string; label: string; x: number; y: number; color: string; isTarget: boolean }[] = []

    // Target meeting node in center
    items.push({
      id: target.id,
      label: target.saveName?.slice(0, 18) || target.agenda.slice(0, 18) || 'This Meeting',
      x: centerX,
      y: centerY,
      color: '#10b981',
      isTarget: true,
    })

    // Related meetings arranged in a circle
    const count = relatedMeetings.length
    relatedMeetings.forEach((rel, i) => {
      const angle = (i / Math.max(count, 1)) * 2 * Math.PI - Math.PI / 2
      const r = 100
      const x = centerX + r * Math.cos(angle)
      const y = centerY + r * Math.sin(angle)
      const agent = agents.find(a => a.title === rel.sharedAgents[0])
      items.push({
        id: rel.meeting.id,
        label: rel.meeting.saveName?.slice(0, 16) || rel.meeting.agenda.slice(0, 16) || 'Meeting',
        x,
        y,
        color: agent?.color || '#64748b',
        isTarget: false,
      })
    })

    return items
  }, [target, relatedMeetings, agents, centerX, centerY])

  const edges = useMemo(() => {
    const items: { source: string; target: string; weight: number }[] = []
    relatedMeetings.forEach(rel => {
      items.push({
        source: target.id,
        target: rel.meeting.id,
        weight: rel.relevanceScore,
      })
    })
    return items
  }, [target, relatedMeetings])

  const targetNode = nodes.find(n => n.isTarget)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      <defs>
        <filter id="node-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
          <polygon points="0 0, 6 2, 0 4" fill="var(--vl-text-muted)" opacity="0.5" />
        </marker>
      </defs>

      {/* Edges */}
      {edges.map((edge, i) => {
        const source = nodes.find(n => n.id === edge.source)
        const target_n = nodes.find(n => n.id === edge.target)
        if (!source || !target_n) return null

        const midX = (source.x + target_n.x) / 2
        const midY = (source.y + target_n.y) / 2
        const cpX = midX + (target_n.y - source.y) * 0.15
        const cpY = midY - (target_n.x - source.x) * 0.15

        return (
          <g key={`edge-${i}`}>
            <motion.path
              d={`M ${source.x} ${source.y} Q ${cpX} ${cpY} ${target_n.x} ${target_n.y}`}
              fill="none"
              stroke={target_n.color}
              strokeWidth={Math.min(3, 1 + edge.weight * 0.3)}
              strokeOpacity="0.4"
              markerEnd="url(#arrowhead)"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 0.2 + i * 0.1 }}
            />
          </g>
        )
      })}

      {/* Nodes */}
      {nodes.map((node, i) => {
        const isCenter = node.isTarget
        const r = isCenter ? 32 : 24

        return (
          <motion.g
            key={node.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: isCenter ? 0 : 0.3 + i * 0.08, type: 'spring', stiffness: 200 }}
          >
            {/* Glow for target */}
            {isCenter && (
              <circle
                cx={node.x}
                cy={node.y}
                r={r + 6}
                fill="none"
                stroke={node.color}
                strokeWidth="2"
                opacity="0.2"
                filter="url(#node-glow)"
              />
            )}

            {/* Node circle */}
            <circle
              cx={node.x}
              cy={node.y}
              r={r}
              fill={isCenter ? node.color : `${node.color}33`}
              stroke={node.color}
              strokeWidth={isCenter ? 2.5 : 1.5}
              className="cursor-pointer"
            />

            {/* Node text */}
            <text
              x={node.x}
              y={node.y + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={isCenter ? '#fff' : 'var(--vl-text-body)'}
              fontSize={isCenter ? 9 : 8}
              fontWeight={isCenter ? '600' : '500'}
              style={{ pointerEvents: 'none' }}
            >
              {node.label.length > (isCenter ? 20 : 15) ? node.label.slice(0, isCenter ? 20 : 15) + '…' : node.label}
            </text>

            {/* Shared keywords label on edges */}
            {!isCenter && (
              (() => {
                const rel = relatedMeetings.find(r => r.meeting.id === node.id)
                if (!rel || rel.sharedAgents.length === 0) return null
                return (
                  <text
                    x={node.x}
                    y={node.y + r + 12}
                    textAnchor="middle"
                    fill="var(--vl-text-muted)"
                    fontSize="8"
                    opacity="0.7"
                  >
                    {rel.sharedAgents.slice(0, 2).join(', ')}
                  </text>
                )
              })()
            )}
          </motion.g>
        )
      })}

      {/* Legend */}
      <g transform={`translate(10, ${height - 30})`}>
        <circle cx="6" cy="6" r="5" fill="#10b981" opacity="0.7" />
        <text x="16" y="10" fill="var(--vl-text-muted)" fontSize="9">Current Meeting</text>
        <circle cx="126" cy="6" r="5" fill="var(--vl-bg-inner)" stroke="var(--vl-text-muted)" strokeWidth="1" opacity="0.7" />
        <text x="136" y="10" fill="var(--vl-text-muted)" fontSize="9">Related Meetings</text>
      </g>
    </svg>
  )
}

// ============================================================
// Main Component
// ============================================================

export default function MeetingPrepAssistant({ agents, meetings, targetMeeting }: Props) {
  const [customCheckItem, setCustomCheckItem] = useState('')
  const [checklist, setChecklist] = useState<PrepChecklistItem[]>([])
  const [showFullSummary, setShowFullSummary] = useState<string | null>(null)

  // Compute related data
  const relatedMeetings = useMemo(
    () => targetMeeting ? findRelatedMeetings(targetMeeting, meetings, agents) : [],
    [targetMeeting, meetings, agents]
  )

  const participantBriefs = useMemo(
    () => targetMeeting ? generateParticipantBriefs(targetMeeting, meetings, agents) : [],
    [targetMeeting, meetings, agents]
  )

  // Initialize checklist when targetMeeting changes (useEffect with ref guard)
  const prevTargetRef = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (targetMeeting && targetMeeting.id !== prevTargetRef.current) {
      prevTargetRef.current = targetMeeting.id
      const items = generatePrepChecklist(targetMeeting, relatedMeetings, participantBriefs)
      // Use microtask to avoid setState-in-effect lint issue
      queueMicrotask(() => {
        if (items.length > 0) setChecklist(items)
      })
    }
  }, [targetMeeting, relatedMeetings, participantBriefs])

  const toggleCheckItem = useCallback((id: string) => {
    setChecklist(prev =>
      prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item)
    )
  }, [])

  const addCustomItem = useCallback(() => {
    if (!customCheckItem.trim()) return
    setChecklist(prev => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        text: customCheckItem.trim(),
        checked: false,
        isCustom: true,
      },
    ])
    setCustomCheckItem('')
  }, [customCheckItem])

  const removeCheckItem = useCallback((id: string) => {
    setChecklist(prev => prev.filter(item => item.id !== id))
  }, [])

  const completedCount = checklist.filter(item => item.checked).length
  const progressPercent = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0

  // Extract top decisions from related meetings
  const keyDecisions = useMemo(() => {
    const decisions: string[] = []
    relatedMeetings.forEach(rel => {
      if (rel.meeting.summary) {
        // Extract sentences that look like decisions
        const sentences = rel.meeting.summary.split(/[.!?]+/).filter(s => s.trim().length > 20)
        const decisionPatterns = /^(the team|we|participants|it was|agreed|decided|concluded|determined)/i
        sentences.forEach(s => {
          if (decisionPatterns.test(s.trim()) && decisions.length < 5) {
            decisions.push(s.trim())
          }
        })
      }
    })
    return decisions
  }, [relatedMeetings])

  // Suggested agenda items
  const suggestedAgenda = useMemo(() => {
    const items: string[] = []
    if (!targetMeeting) return items

    const targetKw = extractKeywords(targetMeeting.agenda)
    const recentKw = new Set<string>()
    relatedMeetings.slice(0, 3).forEach(rel => {
      if (rel.meeting.summary) {
        extractKeywords(rel.meeting.summary).forEach(w => recentKw.add(w))
      }
    })

    // Find keywords that appear in recent meetings but not in current agenda
    const newTopics = [...recentKw].filter(w => !targetKw.includes(w)).slice(0, 3)
    newTopics.forEach(w => {
      items.push(`Explore recent developments on "${w}"`)
    })

    // Find gaps in previous discussions
    if (relatedMeetings.length > 0 && relatedMeetings[0].meeting.summary) {
      items.push('Review follow-up items from last discussion')
    }

    if (items.length === 0) {
      items.push('Kick off discussion with current research status update')
    }

    return items
  }, [targetMeeting, relatedMeetings])

  if (!targetMeeting) {
    return (
      <Card className="vl-card backdrop-blur-sm">
        <CardContent className="py-12 flex flex-col items-center">
          <Brain className="size-12 vl-text-muted mb-3" />
          <p className="text-sm vl-text-muted font-medium">No Meeting Selected</p>
          <p className="text-xs vl-text-muted mt-1">Select a meeting to see preparation insights</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Brain className="size-4 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--vl-text-white)' }}>
                Meeting Prep Assistant
              </h2>
              <p className="text-xs vl-text-muted">
                AI-generated preparation brief for: {targetMeeting.saveName || 'Untitled Meeting'}
              </p>
            </div>
          </div>
        </div>
        <Badge variant="outline" className="text-xs border-cyan-500/30 text-cyan-400 bg-cyan-500/5">
          <Sparkles className="size-3 mr-1" />
          {participantBriefs.length} participants
        </Badge>
      </div>

      {/* Pre-Meeting Brief */}
      <Card className="vl-card backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-cyan-400" />
            <CardTitle className="text-base font-semibold" style={{ color: 'var(--vl-text-white)' }}>
              Pre-Meeting Brief
            </CardTitle>
          </div>
          <CardDescription className="text-xs vl-text-muted">
            Context from {relatedMeetings.length} related meeting{relatedMeetings.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-4">
          {/* Summary of related meetings */}
          {relatedMeetings.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--vl-text-white)' }}>
                <BookOpen className="size-3" />
                Related Meeting Summaries
              </h4>
              {relatedMeetings.map((rel, i) => (
                <motion.div
                  key={rel.meeting.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="vl-inner rounded-lg p-3"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: rel.sharedAgents.length > 0 ? '#10b981' : '#64748b' }}
                      />
                      <span className="text-xs font-medium" style={{ color: 'var(--vl-text-white)' }}>
                        {rel.meeting.saveName || rel.meeting.agenda.slice(0, 40)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-[9px] px-1.5">
                        <Zap className="size-2 mr-0.5" />
                        {rel.relevanceScore}
                      </Badge>
                      <span className="text-[10px] vl-text-muted">
                        {new Date(rel.meeting.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {rel.meeting.summary && (
                    <div>
                      <p className="text-xs vl-text-muted leading-relaxed">
                        {showFullSummary === rel.meeting.id
                          ? rel.meeting.summary
                          : rel.meeting.summary.slice(0, 150) + (rel.meeting.summary.length > 150 ? '…' : '')
                        }
                      </p>
                      {rel.meeting.summary.length > 150 && (
                        <button
                          onClick={() => setShowFullSummary(showFullSummary === rel.meeting.id ? null : rel.meeting.id)}
                          className="text-[10px] text-cyan-400 hover:text-cyan-300 mt-1 flex items-center gap-0.5"
                        >
                          {showFullSummary === rel.meeting.id ? 'Show less' : 'Read full summary'}
                        </button>
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {rel.sharedAgents.map(a => (
                      <Badge key={a} variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-500/20 text-emerald-400">
                        <Users className="size-2 mr-0.5" />
                        {a}
                      </Badge>
                    ))}
                    {rel.sharedKeywords.map(kw => (
                      <Badge key={kw} variant="outline" className="text-[9px] px-1.5 py-0 border-violet-500/20 text-violet-400">
                        <Hash className="size-2 mr-0.5" />
                        {kw}
                      </Badge>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="vl-inner rounded-lg p-4 text-center">
              <p className="text-xs vl-text-muted">No related meetings found. This appears to be a new discussion topic.</p>
            </div>
          )}

          {/* Key Decisions */}
          {keyDecisions.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold flex items-center gap-1.5 mb-2" style={{ color: 'var(--vl-text-white)' }}>
                <CheckCircle2 className="size-3 text-emerald-400" />
                Key Decisions from Past Meetings
              </h4>
              <div className="space-y-1.5">
                {keyDecisions.map((decision, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    className="flex items-start gap-2 pl-4 border-l-2 border-emerald-500/30"
                  >
                    <p className="text-xs vl-text-muted leading-relaxed">{decision}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Agenda Items */}
          {suggestedAgenda.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold flex items-center gap-1.5 mb-2" style={{ color: 'var(--vl-text-white)' }}>
                <Lightbulb className="size-3 text-amber-400" />
                Suggested Agenda Items
              </h4>
              <div className="space-y-1.5">
                {suggestedAgenda.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.06 }}
                    className="flex items-center gap-2 text-xs"
                  >
                    <ArrowRight className="size-3 text-amber-400 shrink-0" />
                    <span className="vl-text-body">{item}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two-column: Agent Briefings + Context Graph */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent Briefing Cards */}
        <Card className="vl-card backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-emerald-400" />
              <CardTitle className="text-base font-semibold" style={{ color: 'var(--vl-text-white)' }}>
                Participant Briefings
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ScrollArea className="max-h-[400px] overflow-y-auto">
              <div className="space-y-3">
                {participantBriefs.map((brief, i) => (
                  <motion.div
                    key={brief.agent.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="vl-inner rounded-lg p-3"
                  >
                    <div className="flex items-start gap-3">
                      {/* Agent avatar */}
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white"
                        style={{ backgroundColor: brief.agent.color }}
                      >
                        <span className="text-xs font-bold">{brief.agent.title[0]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-semibold truncate" style={{ color: 'var(--vl-text-white)' }}>
                            {brief.agent.title}
                          </h4>
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 border-violet-500/20 text-violet-400 shrink-0"
                          >
                            {brief.suggestedRole}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                          <div className="flex items-center gap-1 vl-text-muted">
                            <Clock className="size-2.5" />
                            {brief.lastMeetingDate
                              ? `Last: ${new Date(brief.lastMeetingDate).toLocaleDateString()}`
                              : 'First participation'}
                          </div>
                          <div className="flex items-center gap-1 vl-text-muted">
                            <MessageSquare className="size-2.5" />
                            Avg {brief.avgResponseLength} chars
                          </div>
                        </div>

                        {/* Key topics */}
                        {brief.keyTopics.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {brief.keyTopics.map(kw => (
                              <Badge key={kw} variant="secondary" className="text-[9px] px-1.5 py-0">
                                {kw}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Context Graph */}
        <Card className="vl-card backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Link2 className="size-4 text-violet-400" />
              <CardTitle className="text-base font-semibold" style={{ color: 'var(--vl-text-white)' }}>
                Context Graph
              </CardTitle>
            </div>
            <CardDescription className="text-xs vl-text-muted">
              How this meeting connects to others
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {relatedMeetings.length > 0 ? (
              <ContextGraph
                target={targetMeeting}
                relatedMeetings={relatedMeetings}
                agents={agents}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <Link2 className="size-10 vl-text-muted mb-2" />
                <p className="text-xs vl-text-muted">No connections found yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Prep Checklist */}
      <Card className="vl-card backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="size-4 text-amber-400" />
              <CardTitle className="text-base font-semibold" style={{ color: 'var(--vl-text-white)' }}>
                Quick Prep Checklist
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-amber-400">{progressPercent}%</span>
              <div className="w-16 h-1.5 rounded-full bg-[var(--vl-bg-inner)] overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-amber-400"
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="space-y-2">
            <AnimatePresence>
              {checklist.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.03 }}
                  className={`flex items-center gap-2.5 group px-2 py-1.5 rounded-lg transition-colors ${
                    item.checked ? 'bg-emerald-500/5' : 'hover:bg-[var(--vl-bg-inner)]'
                  }`}
                >
                  <Checkbox
                    checked={item.checked}
                    onCheckedChange={() => toggleCheckItem(item.id)}
                    className="shrink-0"
                  />
                  <span className={`text-xs flex-1 transition-all duration-200 ${
                    item.checked
                      ? 'line-through vl-text-muted'
                      : 'vl-text-body'
                  }`}>
                    {item.text}
                  </span>
                  {item.isCustom && (
                    <button
                      onClick={() => removeCheckItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-red-500/10 rounded"
                    >
                      <X className="size-3 text-red-400" />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Add custom item */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--vl-border-subtle)]">
            <Plus className="size-3.5 vl-text-muted shrink-0" />
            <Input
              value={customCheckItem}
              onChange={e => setCustomCheckItem(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addCustomItem() }}
              placeholder="Add custom prep item…"
              className="h-8 text-xs border-[var(--vl-border-subtle)]"
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 shrink-0"
              onClick={addCustomItem}
              disabled={!customCheckItem.trim()}
            >
              Add
            </Button>
          </div>

          {completedCount === checklist.length && checklist.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center"
            >
              <p className="text-xs text-emerald-400 font-medium flex items-center justify-center gap-1.5">
                <CheckCircle2 className="size-3.5" />
                You&apos;re fully prepared! Ready to start the meeting.
              </p>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
