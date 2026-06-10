'use client'

/**
 * Agent Persona Card — Rich visual card with collaboration metrics
 *
 * Features:
 * - Avatar with animated ring showing collaboration score (0-100)
 * - 5-axis SVG radar chart for personality dimensions
 * - Tags for research domains and strengths
 * - Collaboration stats: meetings, messages, avg response length
 * - Animated gradient border using agent's color
 * - Glassmorphism card design with theme-aware CSS variables
 */

import React, { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, Calendar, FileText, Sparkles, Users, TrendingUp } from 'lucide-react'
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import type { Agent } from './shared-components'

// ============================================================
// Types
// ============================================================

export interface AgentProfile {
  agentId: string
  agentName: string
  personalityRadar: {
    analytical: number
    creative: number
    critical: number
    collaborative: number
    detailOriented: number
  }
  collaborationScore: number
  collaborationScoreBreakdown: {
    participationRate: number
    contributionQuality: number
    responseTimeScore: number
    consistencyScore: number
  }
  strengths: string[]
  weaknesses: string[]
  researchDomains: string[]
  responseStyle: {
    avgResponseLength: number
    avgResponseLengthCategory: string
    mostUsedWords: { word: string; count: number }[]
    roundParticipation: number
    preferredTimeOfDay: string
  }
  collaborationStats: {
    meetingsJoined: number
    messagesSent: number
    sharedMeetingsWith: { agentId: string; agentName: string; count: number }[]
    totalCollaborators: number
  }
  collaborationHistory: Array<{
    meetingId: string
    meetingName: string
    meetingType: 'team' | 'individual'
    status: string
    messageCount: number
    participatedAt: string
    collaborators: string[]
  }>
  customNotes: string
  collaborationPreferences: string[]
}

interface AgentPersonaCardProps {
  agent: Agent
  profile: AgentProfile
  onSelect: () => void
}

// ============================================================
// SVG Radar Chart Component
// ============================================================

function PersonalityRadarChart({
  data,
  color,
  size = 140,
}: {
  data: AgentProfile['personalityRadar']
  color: string
  size?: number
}) {
  const axes = useMemo(() => [
    { key: 'analytical', label: 'Analytical', value: data.analytical },
    { key: 'creative', label: 'Creative', value: data.creative },
    { key: 'critical', label: 'Critical', value: data.critical },
    { key: 'collaborative', label: 'Collab.', value: data.collaborative },
    { key: 'detailOriented', label: 'Detail', value: data.detailOriented },
  ], [data])

  const n = axes.length
  const cx = size / 2
  const cy = size / 2
  const maxR = size * 0.34
  const angleStep = (2 * Math.PI) / n

  const getPoint = (index: number, value: number) => {
    const angle = index * angleStep - Math.PI / 2
    const r = (value / 100) * maxR
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  }

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto" style={{ maxWidth: size }}>
      {/* Background grid rings */}
      {[20, 40, 60, 80, 100].map((level) => (
        <polygon
          key={level}
          points={Array.from({ length: n }, (_, i) => {
            const p = getPoint(i, level)
            return `${p.x},${p.y}`
          }).join(' ')}
          fill="none"
          stroke="var(--vl-border-subtle)"
          strokeWidth={0.5}
          opacity={0.4}
        />
      ))}

      {/* Axis lines */}
      {axes.map((axis, i) => {
        const p = getPoint(i, 100)
        return (
          <line
            key={axis.key}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke="var(--vl-border-subtle)"
            strokeWidth={0.5}
            opacity={0.3}
          />
        )
      })}

      {/* Data polygon with gradient fill */}
      <defs>
        <linearGradient id={`radar-grad-${color.replace('#', '')}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0.08} />
        </linearGradient>
      </defs>
      <motion.polygon
        points={axes
          .map((axis, i) => {
            const p = getPoint(i, axis.value)
            return `${p.x},${p.y}`
          })
          .join(' ')}
        fill={`url(#radar-grad-${color.replace('#', '')})`}
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        initial={{ opacity: 0, scale: 0.3 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      />

      {/* Data points */}
      {axes.map((axis, i) => {
        const p = getPoint(i, axis.value)
        return (
          <motion.circle
            key={`point-${axis.key}`}
            cx={p.x}
            cy={p.y}
            r={3}
            fill={color}
            stroke="var(--vl-bg-card)"
            strokeWidth={1.5}
            initial={{ opacity: 0, r: 0 }}
            animate={{ opacity: 1, r: 3 }}
            transition={{ duration: 0.5, delay: 0.4 + i * 0.08 }}
          />
        )
      })}

      {/* Labels */}
      {axes.map((axis, i) => {
        const labelP = getPoint(i, 120)
        return (
          <text
            key={`label-${axis.key}`}
            x={labelP.x}
            y={labelP.y + 3}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--vl-text-muted, #888)"
            fontSize={8}
            fontWeight="500"
          >
            {axis.label}
          </text>
        )
      })}
    </svg>
  )
}

// ============================================================
// Animated Score Ring
// ============================================================

function CollaborationScoreRing({
  score,
  color,
  size = 64,
}: {
  score: number
  color: string
  size?: number
}) {
  const [animatedScore, setAnimatedScore] = useState(0)
  const strokeWidth = 3
  const radius = (size - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * radius
  const center = size / 2

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 100)
    return () => clearTimeout(timer)
  }, [score])

  const offset = circumference - (animatedScore / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Background ring */}
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--vl-border-subtle)"
          strokeWidth={strokeWidth}
          opacity={0.4}
        />
        {/* Animated score ring */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
          style={{
            filter: `drop-shadow(0 0 4px ${color}66)`,
          }}
        />
      </svg>
      {/* Score text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.span
          className="text-sm font-bold"
          style={{ color }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {animatedScore}
        </motion.span>
      </div>
    </div>
  )
}

// ============================================================
// Main Component: AgentPersonaCard
// ============================================================

export default function AgentPersonaCard({ agent, profile, onSelect }: AgentPersonaCardProps) {
  const initials = useMemo(
    () =>
      agent.title
        .split(' ')
        .map((w) => w.charAt(0))
        .slice(0, 2)
        .join('')
        .toUpperCase(),
    [agent.title]
  )

  const scoreColor = useMemo(() => {
    const s = profile.collaborationScore
    if (s >= 80) return '#10b981'
    if (s >= 60) return '#f59e0b'
    if (s >= 40) return '#f97316'
    return '#ef4444'
  }, [profile.collaborationScore])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={onSelect}
      className="cursor-pointer group"
    >
      <div
        className="relative rounded-xl overflow-hidden transition-all duration-300"
        style={{
          background: 'var(--vl-bg-card)',
          border: '1px solid var(--vl-border)',
          backdropFilter: 'blur(12px)',
          boxShadow: 'var(--vl-shadow)',
        }}
      >
        {/* Animated gradient border overlay */}
        <div
          className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: `linear-gradient(135deg, ${agent.color}18, transparent 40%, transparent 60%, ${agent.color}12)`,
            border: `1px solid ${agent.color}25`,
            borderRadius: 'inherit',
          }}
        />

        {/* Top gradient accent line */}
        <div
          className="h-[2px] w-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${agent.color}, transparent)`,
            opacity: 0.6,
          }}
        />

        <div className="p-4 space-y-4 relative z-10">
          {/* Header: Avatar + Score Ring + Name */}
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white"
                style={{
                  background: `linear-gradient(135deg, ${agent.color}, ${agent.color}bb)`,
                  boxShadow: `0 0 20px ${agent.color}30`,
                }}
              >
                {initials}
              </div>
              {/* Online indicator */}
              <div
                className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2"
                style={{
                  borderColor: 'var(--vl-bg-card)',
                  backgroundColor: '#10b981',
                }}
              />
            </div>

            {/* Name + Score */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--vl-text-heading)' }}>
                {agent.title}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge
                  variant="outline"
                  className="text-[9px] px-1.5 py-0 font-medium"
                  style={{
                    borderColor: `${agent.color}44`,
                    color: agent.color,
                    backgroundColor: `${agent.color}10`,
                  }}
                >
                  {agent.role}
                </Badge>
                <Badge
                  variant="outline"
                  className="text-[9px] px-1.5 py-0 font-medium"
                  style={{
                    borderColor: 'var(--vl-border-subtle)',
                    color: 'var(--vl-text-muted)',
                  }}
                >
                  {agent.model}
                </Badge>
              </div>
            </div>

            {/* Score Ring */}
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <CollaborationScoreRing
                      score={profile.collaborationScore}
                      color={scoreColor}
                      size={52}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="tooltip-glass text-[10px]">
                  <div className="text-center space-y-0.5">
                    <div className="font-semibold" style={{ color: scoreColor }}>
                      Collaboration Score
                    </div>
                    <div className="text-[9px]" style={{ color: 'var(--vl-text-muted)' }}>
                      Participation: {profile.collaborationScoreBreakdown.participationRate}%
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Radar Chart + Stats Row */}
          <div className="flex items-center gap-4">
            {/* Radar Chart */}
            <div className="shrink-0">
              <PersonalityRadarChart
                data={profile.personalityRadar}
                color={agent.color}
                size={120}
              />
            </div>

            {/* Stats Column */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center"
                  style={{ backgroundColor: `${agent.color}15` }}
                >
                  <Calendar className="size-3" style={{ color: agent.color }} />
                </div>
                <div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--vl-text-heading)' }}>
                    {profile.collaborationStats.meetingsJoined}
                  </p>
                  <p className="text-[9px]" style={{ color: 'var(--vl-text-muted)' }}>
                    Meetings
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center"
                  style={{ backgroundColor: `${agent.color}15` }}
                >
                  <MessageSquare className="size-3" style={{ color: agent.color }} />
                </div>
                <div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--vl-text-heading)' }}>
                    {profile.collaborationStats.messagesSent}
                  </p>
                  <p className="text-[9px]" style={{ color: 'var(--vl-text-muted)' }}>
                    Messages
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center"
                  style={{ backgroundColor: `${agent.color}15` }}
                >
                  <FileText className="size-3" style={{ color: agent.color }} />
                </div>
                <div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--vl-text-heading)' }}>
                    {profile.responseStyle.avgResponseLength}
                  </p>
                  <p className="text-[9px]" style={{ color: 'var(--vl-text-muted)' }}>
                    Avg Length ({profile.responseStyle.avgResponseLengthCategory})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center"
                  style={{ backgroundColor: `${agent.color}15` }}
                >
                  <Users className="size-3" style={{ color: agent.color }} />
                </div>
                <div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--vl-text-heading)' }}>
                    {profile.collaborationStats.totalCollaborators}
                  </p>
                  <p className="text-[9px]" style={{ color: 'var(--vl-text-muted)' }}>
                    Collaborators
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Research Domain Tags */}
          {profile.researchDomains.length > 0 && (
            <div>
              <p className="text-[9px] font-medium uppercase tracking-wider mb-1.5" style={{ color: 'var(--vl-text-muted)' }}>
                Research Domains
              </p>
              <div className="flex flex-wrap gap-1">
                {profile.researchDomains.slice(0, 4).map((domain) => (
                  <span
                    key={domain}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
                    style={{
                      backgroundColor: `${agent.color}12`,
                      color: agent.color,
                      border: `1px solid ${agent.color}20`,
                    }}
                  >
                    {domain}
                  </span>
                ))}
                {profile.researchDomains.length > 4 && (
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px]"
                    style={{
                      color: 'var(--vl-text-muted)',
                      backgroundColor: 'var(--vl-bg-inner)',
                    }}
                  >
                    +{profile.researchDomains.length - 4}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Strengths Tags */}
          {profile.strengths.length > 0 && (
            <div>
              <p className="text-[9px] font-medium uppercase tracking-wider mb-1.5" style={{ color: 'var(--vl-text-muted)' }}>
                Strengths
              </p>
              <div className="flex flex-wrap gap-1">
                {profile.strengths.slice(0, 3).map((strength) => (
                  <span
                    key={strength}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                    style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.08)',
                      color: '#10b981',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                    }}
                  >
                    <Sparkles className="size-2.5" />
                    {strength.length > 30 ? strength.slice(0, 30) + '...' : strength}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom gradient line */}
        <div
          className="h-[1px] w-full"
          style={{
            background: `linear-gradient(90deg, ${agent.color}30, transparent)`,
          }}
        />
      </div>
    </motion.div>
  )
}
