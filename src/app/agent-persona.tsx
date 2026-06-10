'use client'

/**
 * Agent Persona System
 * Visual enhancements for agent cards: mood indicators, activity rings, 3D tilt cards.
 * All visual indicators use CSS/SVG — NO emoji in code.
 */

import React, { useMemo, useCallback, useRef, useState, useEffect } from 'react'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { Agent, Meeting } from './shared-components'
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

// ============================================================
// AgentMoodIndicator — Shows agent state based on meeting activity
// ============================================================

type AgentMood = 'active' | 'idle' | 'thinking' | 'reviewing'

interface AgentMoodIndicatorProps {
  agent: Agent
  meetings: Meeting[]
  lang: Lang
  size?: 'sm' | 'md'
}

function determineAgentMood(agent: Agent, meetings: Meeting[]): { mood: AgentMood; lastActivity: string | null } {
  const now = Date.now()
  const agentMeetings = meetings.filter(m =>
    m.messages?.some(msg => msg.agentName === agent.title)
  )

  // Check for running meeting participation
  const runningMeeting = agentMeetings.find(m => m.status === 'running')
  if (runningMeeting) {
    return { mood: 'thinking', lastActivity: runningMeeting.updatedAt }
  }

  // Check for completed meetings pending review (no summary)
  const pendingReview = agentMeetings.find(m => m.status === 'completed' && !m.summary)
  if (pendingReview) {
    return { mood: 'reviewing', lastActivity: pendingReview.updatedAt }
  }

  // Check for recent activity (last 24 hours)
  const recentMeeting = agentMeetings
    .filter(m => m.messages?.some(msg => msg.agentName === agent.title))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]

  if (recentMeeting) {
    const lastMsg = recentMeeting.messages
      ?.filter(msg => msg.agentName === agent.title)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]

    const lastTime = lastMsg ? new Date(lastMsg.createdAt).getTime() : new Date(recentMeeting.updatedAt).getTime()
    const diff = now - lastTime
    const twentyFourHours = 24 * 60 * 60 * 1000

    if (diff < twentyFourHours) {
      return { mood: 'active', lastActivity: lastMsg?.createdAt || recentMeeting.updatedAt }
    }
  }

  if (agentMeetings.length > 0) {
    return { mood: 'idle', lastActivity: agentMeetings[0].updatedAt }
  }

  return { mood: 'idle', lastActivity: null }
}

const MOOD_CONFIG: Record<AgentMood, { color: string; labelKey: string; pulseClass: string }> = {
  active: { color: '#10b981', labelKey: 'agentPersona.mood.active', pulseClass: 'mood-pulse-active' },
  idle: { color: '#eab308', labelKey: 'agentPersona.mood.idle', pulseClass: 'mood-pulse-idle' },
  thinking: { color: '#3b82f6', labelKey: 'agentPersona.mood.thinking', pulseClass: 'mood-pulse-thinking' },
  reviewing: { color: '#8b5cf6', labelKey: 'agentPersona.mood.reviewing', pulseClass: 'mood-pulse-reviewing' },
}

function formatTimestamp(timestamp: string | null, lang: Lang): string {
  if (!timestamp) return t(lang, 'agentPersona.mood.noActivity')
  const date = new Date(timestamp)
  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (lang === 'zh') {
    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes} 分钟前`
    if (hours < 24) return `${hours} 小时前`
    return `${days} 天前`
  }
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export function AgentMoodIndicator({ agent, meetings, lang, size = 'md' }: AgentMoodIndicatorProps) {
  const { mood, lastActivity } = useMemo(() => determineAgentMood(agent, meetings), [agent, meetings])
  const config = MOOD_CONFIG[mood]
  const dotSize = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5'

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 cursor-default" role="status" aria-label={t(lang, config.labelKey)}>
            <span className="relative">
              <span
                className={`block ${dotSize} rounded-full ${config.pulseClass}`}
                style={{ backgroundColor: config.color }}
              />
              <span
                className={`absolute inset-0 rounded-full ${config.pulseClass}`}
                style={{ backgroundColor: config.color }}
              />
            </span>
            <span className="text-[10px] font-medium" style={{ color: config.color }}>
              {t(lang, config.labelKey)}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="tooltip-glass text-[10px]">
          {t(lang, 'agentPersona.mood.lastActivity')}: {formatTimestamp(lastActivity, lang)}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ============================================================
// AgentActivityRing — SVG circular progress ring around avatar
// ============================================================

interface AgentActivityRingProps {
  agent: Agent
  meetings: Meeting[]
  lang: Lang
  size?: number
}

export function AgentActivityRing({ agent, meetings, lang, size = 44 }: AgentActivityRingProps) {
  const [animatedOffset, setAnimatedOffset] = useState<number | null>(null)

  const { percentage, meetingsParticipated, totalMeetings } = useMemo(() => {
    const participated = meetings.filter(m =>
      m.messages?.some(msg => msg.agentName === agent.title)
    ).length
    const total = meetings.length
    return {
      percentage: total > 0 ? Math.round((participated / total) * 100) : 0,
      meetingsParticipated: participated,
      totalMeetings: total,
    }
  }, [agent, meetings])

  const radius = (size - 6) / 2
  const circumference = 2 * Math.PI * radius
  const targetOffset = circumference - (percentage / 100) * circumference

  // Animate on mount
  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      setAnimatedOffset(targetOffset)
    })
    return () => cancelAnimationFrame(timer)
  }, [targetOffset])

  const strokeWidth = size < 40 ? 2.5 : 3

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative inline-flex items-center justify-center" role="img" aria-label={`${t(lang, 'agentPersona.ring.participation')}: ${percentage}%`}>
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="absolute inset-0"
              style={{ transform: 'rotate(-90deg)' }}
            >
              {/* Background circle */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="var(--vl-border-subtle)"
                strokeWidth={strokeWidth}
              />
              {/* Progress arc with gradient */}
              <defs>
                <linearGradient id={`ring-gradient-${agent.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={agent.color} stopOpacity={0.6} />
                  <stop offset="50%" stopColor={agent.color} stopOpacity={1} />
                  <stop offset="100%" stopColor={agent.color} stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={`url(#ring-gradient-${agent.id})`}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={animatedOffset ?? circumference}
                className="activity-ring-progress"
                style={{
                  transition: 'stroke-dashoffset 1s cubic-bezier(0.23, 1, 0.32, 1)',
                }}
              />
            </svg>
            {/* Center content rendered by parent */}
            <div className="relative z-10 flex items-center justify-center">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                style={{ backgroundColor: agent.color }}
              >
                {agent.title.charAt(0)}
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="tooltip-glass text-[10px]">
          {t(lang, 'agentPersona.ring.participation')}: {percentage}% ({meetingsParticipated}/{totalMeetings} {t(lang, 'common.meetings').toLowerCase()})
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ============================================================
// AgentCardEnhancement — 3D tilt wrapper with glassmorphism
// ============================================================

interface AgentCardEnhancementProps {
  children: React.ReactNode
  agent?: Agent
  className?: string
}

export function AgentCardEnhancement({ children, agent, className = '' }: AgentCardEnhancementProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [spotlight, setSpotlight] = useState({ x: 50, y: 50 })
  const prefersReducedMotion = usePrefersReducedMotion()

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || !cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    // Tilt: max 8 degrees
    const tiltX = ((y - centerY) / centerY) * -8
    const tiltY = ((x - centerX) / centerX) * 8

    setTilt({ x: tiltX, y: tiltY })
    setSpotlight({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
    })
  }, [prefersReducedMotion])

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
    setTilt({ x: 0, y: 0 })
    setSpotlight({ x: 50, y: 50 })
  }, [])

  const ringGradient = agent
    ? `linear-gradient(135deg, ${agent.color}44, ${agent.color}22, transparent 60%)`
    : 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(6,182,212,0.15), transparent 60%)'

  return (
    <div
      ref={cardRef}
      className={`relative ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        perspective: '1000px',
        transformStyle: 'preserve-3d',
      }}
    >
      <div
        className="relative transition-all duration-300 ease-out"
        style={{
          transform: isHovered && !prefersReducedMotion
            ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(4px)`
            : 'rotateX(0deg) rotateY(0deg) translateZ(0px)',
          '--mouse-x': `${spotlight.x}%`,
          '--mouse-y': `${spotlight.y}%`,
        } as React.CSSProperties}
      >
        {children}

        {/* Glassmorphism overlay on hover */}
        {isHovered && (
          <div
            className="absolute inset-0 rounded-xl pointer-events-none transition-opacity duration-300 opacity-100"
            style={{
              background: ringGradient,
              backdropFilter: 'blur(1px) saturate(1.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              zIndex: 1,
            }}
            aria-hidden="true"
          />
        )}

        {/* Animated gradient border on hover */}
        {isHovered && (
          <div
            className="absolute -inset-[1px] rounded-xl pointer-events-none agent-card-animated-border"
            aria-hidden="true"
            style={{
              background: agent
                ? `conic-gradient(from 0deg, ${agent.color}66, transparent 30%, ${agent.color}44, transparent 60%, ${agent.color}66)`
                : 'conic-gradient(from 0deg, #10b98166, transparent 30%, #06b6d444, transparent 60%, #10b98166)',
              animation: 'agent-card-border-spin 3s linear infinite',
              zIndex: -1,
            }}
          />
        )}
      </div>
    </div>
  )
}

// ============================================================
// Utility: prefers-reduced-motion hook
// ============================================================

function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return prefersReduced
}
