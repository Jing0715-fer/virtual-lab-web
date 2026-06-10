'use client'

/**
 * Agent Persona Enhanced — v3
 *
 * Provides mood-aware agent avatars, mood indicators, and stats cards
 * for the Virtual Lab collaboration system.
 *
 * Components:
 * - usePersonaMood(meetingStatus) — returns mood data based on meeting status
 * - PersonaAvatar — SVG-based avatar with geometric shapes, color, initials, mood ring
 * - PersonaMoodIndicator — small dot + label showing current mood
 * - PersonaStatsCard — stats display with progress bars
 */

import React, { useMemo, useState, useEffect } from 'react'

// ============================================================
// Types
// ============================================================

interface MoodData {
  id: string
  emoji: string
  color: string
  label: string
  animationClass: string
}

interface PersonaAvatarProps {
  name: string
  color: string
  size?: number
  mood?: MoodData | null
  showMoodRing?: boolean
}

interface PersonaMoodIndicatorProps {
  mood: MoodData | null
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

interface PersonaStatsCardProps {
  stats: {
    meetingCount: number
    avgResponseLength: number
    collabScore: number
    expertise: number
  }
  color?: string
}

// ============================================================
// Mood Mapping Constants
// ============================================================

const MOOD_MAP: Record<string, MoodData> = {
  idle: {
    id: 'idle',
    emoji: '\u{1F9D8}',
    color: '#3b82f6',
    label: 'Contemplative',
    animationClass: 'persona-float',
  },
  running: {
    id: 'running',
    emoji: '\u{1F3AF}',
    color: '#f59e0b',
    label: 'Focused',
    animationClass: 'mood-ring-pulse',
  },
  completed: {
    id: 'completed',
    emoji: '\u{1F60A}',
    color: '#10b981',
    label: 'Satisfied',
    animationClass: 'stats-bar-fill',
  },
  error: {
    id: 'error',
    emoji: '\u{26A0}\u{FE0F}',
    color: '#ef4444',
    label: 'Concerned',
    animationClass: 'mood-ring-pulse',
  },
}

const DEFAULT_MOOD: MoodData = {
  id: 'default',
  emoji: '\u{1F4A4}',
  color: '#6b7280',
  label: 'Idle',
  animationClass: '',
}

// ============================================================
// Hook: usePersonaMood
// ============================================================

/**
 * Returns a MoodData object based on the current meeting status.
 * Maps: idle → Contemplative, running → Focused, completed → Satisfied, error → Concerned
 */
export function usePersonaMood(meetingStatus: string): MoodData {
  return useMemo(() => {
    return MOOD_MAP[meetingStatus] ?? DEFAULT_MOOD
  }, [meetingStatus])
}

// ============================================================
// Component: PersonaAvatar
// ============================================================

/**
 * SVG-based agent avatar with:
 * - Geometric background shapes (hexagon base + orbiting circles)
 * - Agent-specific color
 * - Initials text in center
 * - Optional animated mood ring border
 */
export function PersonaAvatar({
  name,
  color,
  size = 64,
  mood,
  showMoodRing = false,
}: PersonaAvatarProps) {
  const initials = useMemo(() => {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }, [name])

  const [moodRingOffset, setMoodRingOffset] = useState(0)

  useEffect(() => {
    if (!showMoodRing || !mood) return
    const interval = setInterval(() => {
      setMoodRingOffset(prev => (prev + 2) % 360)
    }, 16)
    return () => clearInterval(interval)
  }, [showMoodRing, mood])

  const svgSize = size
  const center = svgSize / 2
  const radius = center - 4

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: svgSize, height: svgSize }}
      role="img"
      aria-label={`Avatar for ${name}`}
    >
      {/* Mood ring (animated outer border) */}
      {showMoodRing && mood && (
        <svg
          className="absolute inset-0"
          width={svgSize}
          height={svgSize}
          viewBox={`0 0 ${svgSize} ${svgSize}`}
          style={{ animation: `${mood.animationClass} 3s ease-in-out infinite` }}
        >
          <circle
            cx={center}
            cy={center}
            r={radius + 1}
            fill="none"
            stroke={mood.color}
            strokeWidth={2.5}
            strokeDasharray="8 4"
            strokeDashoffset={moodRingOffset}
            opacity={0.7}
          />
        </svg>
      )}

      <svg
        width={svgSize}
        height={svgSize}
        viewBox={`0 0 ${svgSize} ${svgSize}`}
        className="rounded-full overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${color}22, ${color}44)`,
        }}
      >
        {/* Geometric hexagon shape */}
        <polygon
          points={generateHexPoints(center, radius * 0.92)}
          fill={color}
          opacity={0.15}
        />

        {/* Orbiting circles decoration */}
        <circle
          cx={center + radius * 0.55}
          cy={center - radius * 0.35}
          r={radius * 0.12}
          fill={color}
          opacity={0.25}
        />
        <circle
          cx={center - radius * 0.45}
          cy={center + radius * 0.45}
          r={radius * 0.08}
          fill={color}
          opacity={0.2}
        />
        <circle
          cx={center + radius * 0.3}
          cy={center + radius * 0.55}
          r={radius * 0.1}
          fill={color}
          opacity={0.18}
        />

        {/* Background circle behind initials */}
        <circle
          cx={center}
          cy={center}
          r={radius * 0.42}
          fill={color}
          opacity={0.6}
        />

        {/* Initials */}
        <text
          x={center}
          y={center + 1}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#ffffff"
          fontSize={radius * 0.55}
          fontWeight="700"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {initials}
        </text>
      </svg>

      {/* Mood emoji badge */}
      {mood && mood.id !== 'default' && (
        <span
          className="absolute -bottom-1 -right-1 flex items-center justify-center rounded-full bg-white shadow-md text-sm"
          style={{ width: size * 0.32, height: size * 0.32, fontSize: size * 0.2 }}
          title={mood.label}
        >
          {mood.emoji}
        </span>
      )}
    </div>
  )
}

/** Helper: Generate SVG hexagon points string */
function generateHexPoints(cx: number, r: number): string {
  const points: string[] = []
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6
    const x = cx + r * Math.cos(angle)
    const y = cx + r * Math.sin(angle)
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  }
  return points.join(' ')
}

// ============================================================
// Component: PersonaMoodIndicator
// ============================================================

/**
 * Compact mood indicator showing a colored dot + optional text label.
 * Used in agent lists, sidebars, and status bars.
 */
export function PersonaMoodIndicator({
  mood,
  size = 'sm',
  showLabel = true,
}: PersonaMoodIndicatorProps) {
  if (!mood) return null

  const dotSize = size === 'sm' ? 8 : size === 'md' ? 12 : 16
  const textSize = size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'

  return (
    <div className="inline-flex items-center gap-1.5">
      <span
        className="rounded-full mood-transition"
        style={{
          width: dotSize,
          height: dotSize,
          backgroundColor: mood.color,
          boxShadow: `0 0 ${dotSize}px ${mood.color}66`,
          animation: mood.animationClass ? `${mood.animationClass} 2s ease-in-out infinite` : undefined,
        }}
        aria-label={`Status: ${mood.label}`}
        role="status"
      />
      {showLabel && (
        <span className={`${textSize} vl-text-muted`} style={{ color: mood.color }}>
          {mood.label}
        </span>
      )}
    </div>
  )
}

// ============================================================
// Component: PersonaStatsCard
// ============================================================

/**
 * Card showing agent statistics with animated progress bars.
 * Displays: meetingCount, avgResponseLength, collabScore, expertise
 */
export function PersonaStatsCard({
  stats,
  color = '#10b981',
}: PersonaStatsCardProps) {
  const items: { label: string; value: number; max: number; display: string }[] = [
    {
      label: 'Meetings',
      value: Math.min(stats.meetingCount, 50),
      max: 50,
      display: String(stats.meetingCount),
    },
    {
      label: 'Avg Response',
      value: Math.min(stats.avgResponseLength, 500),
      max: 500,
      display: `${stats.avgResponseLength} chars`,
    },
    {
      label: 'Collaboration',
      value: stats.collabScore,
      max: 100,
      display: `${stats.collabScore}%`,
    },
    {
      label: 'Expertise',
      value: stats.expertise,
      max: 100,
      display: `${stats.expertise}%`,
    },
  ]

  return (
    <div className="vl-card rounded-xl p-4 space-y-3">
      <h4 className="text-sm font-semibold vl-text-heading">Agent Statistics</h4>

      <div className="space-y-2.5">
        {items.map((item) => {
          const pct = Math.round((item.value / item.max) * 100)
          return (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs vl-text-muted">{item.label}</span>
                <span
                  className="text-xs font-medium"
                  style={{ color }}
                >
                  {item.display}
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${color}18` }}>
                <div
                  className="h-full rounded-full stats-bar-fill"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: color,
                    transition: 'width 0.6s cubic-bezier(0.23, 1, 0.32, 1)',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary footer */}
      <div className="pt-2 border-t" style={{ borderColor: `${color}22` }}>
        <div className="flex justify-between items-center">
          <span className="text-[10px] vl-text-muted uppercase tracking-wider">
            Overall Rating
          </span>
          <span
            className="text-sm font-bold"
            style={{ color }}
          >
            {Math.round(
              (stats.collabScore * 0.4 + stats.expertise * 0.35 +
                Math.min(stats.meetingCount / 50, 1) * 100 * 0.15 +
                Math.min(stats.avgResponseLength / 500, 1) * 100 * 0.1)
            )}%
          </span>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Utility: getMoodFromStatus
// ============================================================

/** Standalone utility (not a hook) to resolve mood from status */
export function getMoodFromStatus(status: string): MoodData {
  return MOOD_MAP[status] ?? DEFAULT_MOOD
}

// ============================================================
// Utility: getMoodColor
// ============================================================

/** Quick color accessor */
export function getMoodColor(status: string): string {
  return (MOOD_MAP[status] ?? DEFAULT_MOOD).color
}
