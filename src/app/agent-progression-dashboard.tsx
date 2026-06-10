'use client'

/**
 * Agent Progression Dashboard — Overview of all agent levels, achievements, charts
 *
 * Sections:
 * 1. Agent Level Cards — Level number, XP bar, rank title, stats
 * 2. Leaderboard — Ranked list by XP with rank changes
 * 3. Achievement Badges — Grid of earnable achievements
 * 4. XP History Chart — SVG area chart (last 30 days)
 * 5. Skill Radar Chart — SVG radar/spider chart (6 axes)
 * 6. Activity Heatmap — Per-agent contribution graph
 * 7. Milestone Timeline — Vertical level-up timeline
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  Award, TrendingUp, Trophy, Users, Star, Lock, Check,
  Calendar, ChevronUp, ChevronDown, Minus, BarChart3,
  Zap, Brain, Crown, BookOpen, Cpu, MessageSquare, Microscope,
  Flame, Clock, Target, GraduationCap, PenTool, Handshake, Moon,
  Sparkles, RefreshCw, Loader2,
} from 'lucide-react'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { Agent } from './shared-types'

// ============================================================
// Types
// ============================================================

interface SkillCategory {
  id: string
  name: string
  icon: string
  color: string
  skills: { id: string; name: string; description: string; unlockRequirement: number }[]
}

interface AgentSkillXP {
  skillId: string
  xp: number
  level: number
  unlocked: boolean
}

interface AgentSkillData {
  agentId: string
  totalXP: number
  agentLevel: number
  rankTitle: string
  skills: Record<string, AgentSkillXP>
  achievements: Record<string, { earned: boolean; earnedAt: string | null }>
  xpHistory: { date: string; xp: number }[]
  milestones: { level: number; date: string; label: string }[]
  previousRank: number
}

interface AchievementDef {
  id: string
  name: string
  description: string
  icon: string
  earned?: boolean
  earnedAt?: string | null
}

interface LeaderboardEntry {
  agentId: string
  totalXP: number
  agentLevel: number
  rankTitle: string
  previousRank: number
}

interface AgentProgressionDashboardProps {
  agents: Agent[]
  lang: Lang
}

// ============================================================
// Constants
// ============================================================

const RANK_CSS_CLASSES: Record<string, string> = {
  Novice: 'rank-novice',
  Apprentice: 'rank-apprentice',
  Journeyman: 'rank-journeyman',
  Expert: 'rank-expert',
  Master: 'rank-master',
  Grandmaster: 'rank-grandmaster',
}

const ACHIEVEMENT_ICONS: Record<string, React.ElementType> = {
  Users, PenTool, BarChart3, Handshake, Moon, Zap, GraduationCap, Award, Brain, Star,
}

const CATEGORY_AXIS_COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899']

// ============================================================
// Helpers
// ============================================================

function xpForCurrentLevel(totalXP: number, agentLevel: number): number {
  let total = 0
  for (let l = 1; l < agentLevel; l++) {
    total += Math.floor(100 * l + 50 * Math.pow(l - 1, 1.3))
  }
  return total
}

function xpForNextLevel(agentLevel: number): number {
  let total = 0
  for (let l = 1; l <= agentLevel; l++) {
    total += Math.floor(100 * l + 50 * Math.pow(l - 1, 1.3))
  }
  return total
}

// ============================================================
// Section: Agent Level Card
// ============================================================

function AgentLevelCard({
  agent,
  skillData,
  index,
  lang,
}: {
  agent: Agent
  skillData: AgentSkillData
  index: number
  lang: Lang
}) {
  const [isLevelingUp, setIsLevelingUp] = useState(false)
  const prevLevel = useRef(skillData.agentLevel)

  useEffect(() => {
    if (skillData.agentLevel > prevLevel.current) {
      setIsLevelingUp(true)
      const timer = setTimeout(() => setIsLevelingUp(false), 1200)
      prevLevel.current = skillData.agentLevel
      return () => clearTimeout(timer)
    }
  }, [skillData.agentLevel])

  const baseXP = xpForCurrentLevel(skillData.totalXP, skillData.agentLevel)
  const nextXP = xpForNextLevel(skillData.agentLevel)
  const xpRange = nextXP - baseXP
  const currentInLevel = skillData.totalXP - baseXP
  const progressPct = xpRange > 0 ? Math.min((currentInLevel / xpRange) * 100, 100) : 100

  const totalSkills = Object.keys(skillData.skills).length
  const unlockedSkills = Object.values(skillData.skills).filter(s => s.unlocked).length
  const rankCss = RANK_CSS_CLASSES[skillData.rankTitle] || 'rank-novice'

  const initials = agent.title.split(' ').map(w => w.charAt(0)).slice(0, 2).join('').toUpperCase()

  return (
    <div
      className={`agent-level-card agent-skill-enter ${isLevelingUp ? 'leveling-up' : ''}`}
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Avatar */}
        <div
          style={{
            width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
            background: `linear-gradient(135deg, ${agent.color}, ${agent.color}cc)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 800, color: 'white',
            boxShadow: `0 0 16px ${agent.color}33`,
          }}
        >
          {initials}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Name + Rank */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--vl-text-heading)' }}>
              {agent.title}
            </span>
            <span className={`rank-title-badge ${rankCss}`} style={{ fontSize: 10 }}>
              {skillData.rankTitle}
            </span>
          </div>

          {/* Level + XP */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
            <span className="agent-level-number" style={{ fontSize: '2.5rem' }}>
              {skillData.agentLevel}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 11, color: 'var(--vl-text-muted)' }}>
                {lang === 'zh' ? '级' : 'Level'}
              </span>
              <span style={{ fontSize: 10, color: 'var(--vl-text-muted)' }}>
                {skillData.totalXP.toLocaleString()} XP
              </span>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div style={{ marginBottom: 8 }}>
            <div className="xp-progress-bar">
              <div className="xp-progress-bar-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 9, color: 'var(--vl-text-muted)' }}>
                {lang === 'zh' ? '下一级' : 'Next level'}
              </span>
              <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--vl-text-heading)' }}>
                {Math.round(progressPct)}%
              </span>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Zap style={{ width: 11, height: 11, color: '#f59e0b' }} />
              <span style={{ fontSize: 10, color: 'var(--vl-text-muted)' }}>
                {unlockedSkills}/{totalSkills} {lang === 'zh' ? '技能' : 'skills'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Trophy style={{ width: 11, height: 11, color: '#8b5cf6' }} />
              <span style={{ fontSize: 10, color: 'var(--vl-text-muted)' }}>
                {Object.values(skillData.achievements || {}).filter(a => a.earned).length} {lang === 'zh' ? '成就' : 'achievements'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Section: Leaderboard
// ============================================================

function Leaderboard({
  leaderboard,
  agents,
  maxXP,
  lang,
}: {
  leaderboard: LeaderboardEntry[]
  agents: Agent[]
  maxXP: number
  lang: Lang
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {leaderboard.map((entry, idx) => {
        const agent = agents.find(a => a.id === entry.agentId)
        if (!agent) return null
        const rank = idx + 1
        const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : ''
        const xpPct = maxXP > 0 ? (entry.totalXP / maxXP) * 100 : 0
        const rankChange = entry.previousRank === 0 ? 0 : entry.previousRank - rank
        const initials = agent.title.split(' ').map(w => w.charAt(0)).slice(0, 2).join('').toUpperCase()

        return (
          <div key={entry.agentId} className="leaderboard-row" style={{ animationDelay: `${idx * 0.05}s` }}>
            {/* Rank */}
            <div className={`leaderboard-rank ${rankClass}`}>
              {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank}
            </div>

            {/* Avatar */}
            <div
              style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: agent.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: 'white',
              }}
            >
              {initials}
            </div>

            {/* Name + Level */}
            <div style={{ minWidth: 100, flexShrink: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--vl-text-heading)', lineHeight: 1.2 }}>
                {agent.title.length > 16 ? agent.title.slice(0, 16) + '…' : agent.title}
              </div>
              <div style={{ fontSize: 9, color: 'var(--vl-text-muted)' }}>
                Lv.{entry.agentLevel} · {entry.rankTitle}
              </div>
            </div>

            {/* XP Bar */}
            <div className="leaderboard-xp-bar">
              <div className="leaderboard-xp-fill" style={{ width: `${xpPct}%` }} />
            </div>

            {/* XP value */}
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--vl-text-heading)', minWidth: 60, textAlign: 'right', flexShrink: 0 }}>
              {entry.totalXP.toLocaleString()}
            </span>

            {/* Rank change */}
            <div className={`leaderboard-rank-change ${rankChange > 0 ? 'up' : rankChange < 0 ? 'down' : 'same'}`}>
              {rankChange > 0 ? <ChevronUp style={{ width: 14, height: 14 }} /> :
               rankChange < 0 ? <ChevronDown style={{ width: 14, height: 14 }} /> :
               <Minus style={{ width: 14, height: 14 }} />}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================
// Section: Achievement Badges Grid
// ============================================================

function AchievementBadgesGrid({
  achievements,
  lang,
}: {
  achievements: AchievementDef[]
  lang: Lang
}) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
      gap: 10,
    }}>
      {achievements.map(ach => {
        const Icon = ACHIEVEMENT_ICONS[ach.icon] || Award
        const isEarned = ach.earned || false

        return (
          <div
            key={ach.id}
            className={`achievement-badge ${isEarned ? 'achievement-badge-earned' : 'achievement-badge-locked'}`}
            title={`${ach.name}: ${ach.description}${isEarned && ach.earnedAt ? `\nEarned: ${new Date(ach.earnedAt).toLocaleDateString()}` : ''}`}
          >
            {isEarned ? (
              <div className="achievement-badge-check">✓</div>
            ) : (
              <div className="achievement-badge-lock">
                <Lock style={{ width: 9, height: 9 }} />
              </div>
            )}
            <div className="achievement-badge-icon" style={{ color: isEarned ? 'var(--vl-accent)' : 'var(--vl-text-muted)' }}>
              {isEarned ? <Icon style={{ width: 24, height: 24 }} /> : '?'}
            </div>
            <div className="achievement-badge-label">{ach.name}</div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================
// Section: XP History Chart (SVG Area Chart)
// ============================================================

function XPHistoryChart({
  xpHistory,
  lang,
}: {
  xpHistory: { date: string; xp: number }[]
  lang: Lang
}) {
  if (xpHistory.length < 2) {
    return (
      <div style={{
        height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--vl-text-muted)', fontSize: 12,
      }}>
        {lang === 'zh' ? '暂无数据' : 'No data yet'}
      </div>
    )
  }

  const svgW = 600
  const svgH = 200
  const padL = 45
  const padR = 15
  const padT = 15
  const padB = 30
  const chartW = svgW - padL - padR
  const chartH = svgH - padT - padB

  const maxXP = Math.max(...xpHistory.map(h => h.xp), 1)
  const minXP = Math.min(...xpHistory.map(h => h.xp))
  const xpRange = maxXP - minXP || 1

  const points: { x: number; y: number; date: string; xp: number }[] = xpHistory.map((entry, i) => ({
    x: padL + (i / Math.max(xpHistory.length - 1, 1)) * chartW,
    y: padT + chartH - ((entry.xp - minXP) / xpRange) * chartH,
    date: entry.date,
    xp: entry.xp,
  }))

  const areaPath = `M ${points[0].x},${points[0].y} ` +
    points.slice(1).map(p => `L ${p.x},${p.y}`).join(' ') +
    ` L ${points[points.length - 1].x},${padT + chartH} L ${points[0].x},${padT + chartH} Z`

  const linePath = `M ${points[0].x},${points[0].y} ` +
    points.slice(1).map(p => `L ${p.x},${p.y}`).join(' ')

  // Y-axis labels
  const yTicks = 4
  const yLabels = Array.from({ length: yTicks + 1 }, (_, i) => {
    const val = minXP + (xpRange * (yTicks - i)) / yTicks
    return Math.round(val).toLocaleString()
  })

  // X-axis labels (every 5 days)
  const xLabels = points.filter((_, i) => i % 5 === 0 || i === points.length - 1)

  return (
    <div className="xp-history-chart">
      <svg viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {Array.from({ length: yTicks + 1 }, (_, i) => {
          const y = padT + (i / yTicks) * chartH
          return (
            <line key={i} x1={padL} y1={y} x2={svgW - padR} y2={y}
              stroke="var(--vl-border-subtle)" strokeWidth={0.5} />
          )
        })}

        {/* Y-axis labels */}
        {yLabels.map((label, i) => {
          const y = padT + (i / yTicks) * chartH
          return (
            <text key={i} x={padL - 5} y={y + 3} textAnchor="end"
              fill="var(--vl-text-muted)" fontSize={8}>
              {label}
            </text>
          )
        })}

        {/* X-axis labels */}
        {xLabels.map((p, i) => (
          <text key={i} x={p.x} y={svgH - 5} textAnchor="middle"
            fill="var(--vl-text-muted)" fontSize={7}>
            {p.date.slice(5)} {/* MM-DD */}
          </text>
        ))}

        {/* Area fill */}
        <path d={areaPath} fill="var(--vl-accent)" fillOpacity={0.12} />

        {/* Line */}
        <path d={linePath} fill="none" stroke="var(--vl-accent)" strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round" />

        {/* Data points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3}
            fill="var(--vl-accent)" stroke="var(--vl-bg-card)" strokeWidth={1.5}>
            <title>{p.date}: {p.xp.toLocaleString()} XP</title>
          </circle>
        ))}
      </svg>
    </div>
  )
}

// ============================================================
// Section: Skill Radar Chart (SVG Spider)
// ============================================================

function SkillRadarChart({
  categories,
  skillData,
  lang,
}: {
  categories: SkillCategory[]
  skillData: AgentSkillData
  lang: Lang
}) {
  const axes = useMemo(() => {
    return categories.map((cat, idx) => {
      const catSkills = cat.skills
      const avgLevel = catSkills.length > 0
        ? catSkills.reduce((sum, s) => sum + (skillData.skills[s.id]?.level || 0), 0) / catSkills.length
        : 0
      return { label: cat.name, value: avgLevel, color: CATEGORY_AXIS_COLORS[idx] || '#6b7280' }
    })
  }, [categories, skillData])

  const n = axes.length
  const cx = 150
  const cy = 150
  const maxR = 110
  const angleStep = (2 * Math.PI) / n

  const getPoint = (index: number, value: number) => {
    const angle = index * angleStep - Math.PI / 2
    const r = (value / 5) * maxR // max level = 5
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  }

  const dataPoints = axes.map((a, i) => getPoint(i, a.value))

  return (
    <div className="radar-chart">
      <svg viewBox="0 0 300 300" preserveAspectRatio="xMidYMid meet">
        {/* Background rings */}
        {[1, 2, 3, 4, 5].map(level => {
          const ringPoints = Array.from({ length: n }, (_, i) => {
            const p = getPoint(i, level)
            return `${p.x},${p.y}`
          }).join(' ')
          return (
            <polygon key={level} points={ringPoints}
              fill="none" stroke="var(--vl-border-subtle)" strokeWidth={0.5} opacity={0.5} />
          )
        })}

        {/* Axis lines + labels */}
        {axes.map((axis, i) => {
          const endpoint = getPoint(i, 5)
          const labelPoint = getPoint(i, 6)
          return (
            <g key={axis.label}>
              <line x1={cx} y1={cy} x2={endpoint.x} y2={endpoint.y}
                stroke="var(--vl-border-subtle)" strokeWidth={0.5} opacity={0.3} />
              <text x={labelPoint.x} y={labelPoint.y + 3} textAnchor="middle"
                fill="var(--vl-text-muted)" fontSize={8} fontWeight={500}>
                {axis.label.length > 12 ? axis.label.slice(0, 12) + '…' : axis.label}
              </text>
            </g>
          )
        })}

        {/* Data polygon fill */}
        <polygon
          points={dataPoints.map(p => `${p.x},${p.y}`).join(' ')}
          fill="var(--vl-accent)" fillOpacity={0.15}
          stroke="var(--vl-accent)" strokeWidth={2}
        />

        {/* Data points */}
        {dataPoints.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={4}
              fill={axes[i].color} stroke="var(--vl-bg-card)" strokeWidth={2} />
            <text x={p.x} y={p.y - 8} textAnchor="middle"
              fill="var(--vl-text-heading)" fontSize={8} fontWeight={700}>
              {axes[i].value.toFixed(1)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

// ============================================================
// Section: Activity Heatmap (GitHub-style)
// ============================================================

function ActivityHeatmap({ skillData, lang }: { skillData: AgentSkillData; lang: Lang }) {
  const heatmap = useMemo(() => {
    const now = new Date()
    const grid: { date: string; count: number; dayIdx: number }[] = []
    for (let w = 11; w >= 0; w--) {
      for (let d = 0; d < 7; d++) {
        const date = new Date(now)
        date.setDate(date.getDate() - (w * 7 + (6 - d)))
        const dayStr = date.toISOString().slice(0, 10)
        // Find XP history entry for this date (approximate from skill data)
        const xpEntry = skillData.xpHistory.find(h => h.date === dayStr)
        const count = xpEntry ? Math.floor(xpEntry.xp / 10) : 0
        grid.push({ date: dayStr, count, dayIdx: d })
      }
    }
    return grid
  }, [skillData])

  const maxCount = Math.max(...heatmap.map(h => h.count), 1)
  const getColor = (count: number) => {
    if (count === 0) return 'var(--vl-bg-inner)'
    const intensity = count / maxCount
    return `rgba(16, 185, 129, ${0.15 + intensity * 0.75})`
  }

  const months = useMemo(() => {
    const now = new Date()
    const result: { label: string; colIdx: number }[] = []
    for (let w = 11; w >= 0; w--) {
      const date = new Date(now)
      date.setDate(date.getDate() - w * 7)
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short' })
      const colIdx = 11 - w
      if (result.length === 0 || result[result.length - 1].label !== monthLabel) {
        result.push({ label: monthLabel, colIdx })
      }
    }
    return result
  }, [])

  return (
    <div style={{ padding: 16, borderRadius: 'var(--vl-radius-xl)', background: 'var(--vl-bg-card)', border: '1px solid var(--vl-border)' }}>
      <h4 style={{ fontSize: 12, fontWeight: 600, color: 'var(--vl-text-heading)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Calendar style={{ width: 14, height: 14, color: 'var(--vl-accent)' }} />
        {lang === 'zh' ? '活跃度热图 (12周)' : 'Activity Heatmap (12 weeks)'}
      </h4>
      <div style={{ display: 'flex', gap: 2, marginLeft: 26, marginBottom: 4 }}>
        {months.map((m, i) => (
          <span key={i} style={{ fontSize: 8, color: 'var(--vl-text-muted)', width: `${100 / 12}%` }}>
            {m.label}
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 2 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginRight: 4 }}>
          {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((label, i) => (
            <span key={i} style={{ fontSize: 8, color: 'var(--vl-text-muted)', height: 12, lineHeight: '12px' }}>{label}</span>
          ))}
        </div>
        <div className="skill-heatmap-grid" style={{ gridTemplateColumns: 'repeat(12, 12px)' }}>
          {heatmap.map(cell => (
            <div
              key={cell.date}
              className="skill-heatmap-cell"
              style={{ backgroundColor: getColor(cell.count) }}
              title={`${cell.date}: ${cell.count} activities`}
            />
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 8, color: 'var(--vl-text-muted)' }}>Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map((level, i) => (
          <div key={i} style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: level === 0 ? 'var(--vl-bg-inner)' : `rgba(16, 185, 129, ${0.15 + level * 0.75})` }} />
        ))}
        <span style={{ fontSize: 8, color: 'var(--vl-text-muted)' }}>More</span>
      </div>
    </div>
  )
}

// ============================================================
// Section: Milestone Timeline
// ============================================================

function MilestoneTimeline({
  milestones,
  agentLevel,
  lang,
}: {
  milestones: { level: number; date: string; label: string }[]
  agentLevel: number
  lang: Lang
}) {
  // Generate future milestones if not enough
  const allMilestones = useMemo(() => {
    const result = [...milestones]
    const milestoneLevels = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50]
    for (const ml of milestoneLevels) {
      if (!result.some(m => m.level === ml)) {
        const isReached = agentLevel >= ml
        result.push({
          level: ml,
          date: isReached ? '—' : '',
          label: isReached ? `Reached Level ${ml}` : `Level ${ml}`,
        })
      }
    }
    return result.sort((a, b) => a.level - b.level)
  }, [milestones, agentLevel])

  return (
    <div style={{ padding: 16, borderRadius: 'var(--vl-radius-xl)', background: 'var(--vl-bg-card)', border: '1px solid var(--vl-border)' }}>
      <h4 style={{ fontSize: 12, fontWeight: 600, color: 'var(--vl-text-heading)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <TrendingUp style={{ width: 14, height: 14, color: 'var(--vl-accent)' }} />
        {lang === 'zh' ? '升级里程碑' : 'Level-up Milestones'}
      </h4>
      <div className="milestone-timeline" style={{ maxHeight: 320, overflowY: 'auto' }} className="skill-panel-scroll">
        {allMilestones.map((ms, i) => {
          const isReached = ms.date !== ''
          return (
            <div key={i} className="milestone-item">
              <div className={`milestone-dot ${isReached ? '' : 'locked'}`} />
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
                <span style={{
                  fontSize: 13, fontWeight: 700,
                  color: isReached ? 'var(--vl-accent)' : 'var(--vl-text-muted)',
                }}>
                  Lv.{ms.level}
                </span>
                {ms.date && ms.date !== '—' && (
                  <span style={{ fontSize: 9, color: 'var(--vl-text-muted)' }}>
                    {ms.date}
                  </span>
                )}
              </div>
              <p style={{ fontSize: 11, color: isReached ? 'var(--vl-text-body)' : 'var(--vl-text-muted)', margin: 0, lineHeight: 1.4 }}>
                {ms.label}
                {!isReached && (
                  <Lock style={{ width: 10, height: 10, display: 'inline', verticalAlign: 'middle', marginLeft: 4 }} />
                )}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================
// Main: AgentProgressionDashboard
// ============================================================

export function AgentProgressionDashboard({ agents, lang }: AgentProgressionDashboardProps) {
  const [allAgentData, setAllAgentData] = useState<Record<string, AgentSkillData>>({})
  const [categories, setCategories] = useState<SkillCategory[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Initialize
  useEffect(() => {
    setMounted(true)
    if (agents.length > 0 && !selectedAgentId) {
      setSelectedAgentId(agents[0].id)
    }
  }, [agents, selectedAgentId])

  // Fetch all data
  useEffect(() => {
    if (agents.length === 0) return
    setLoading(true)
    const fetchAll = async () => {
      try {
        // Fetch agent skill data
        const skillPromises = agents.map(async agent => {
          try {
            const cached = typeof window !== 'undefined'
              ? localStorage.getItem(`vl-agent-skills-${agent.id}`)
              : null
            if (cached) {
              const parsed = JSON.parse(cached)
              return { id: agent.id, data: parsed.agentSkills, cats: parsed.skillCategories }
            }
            const res = await fetch(`/api/agent-skills?agentId=${agent.id}`)
            if (res.ok) {
              const parsed = await res.json()
              if (typeof window !== 'undefined') {
                localStorage.setItem(`vl-agent-skills-${agent.id}`, JSON.stringify(parsed))
              }
              return { id: agent.id, data: parsed.agentSkills, cats: parsed.skillCategories }
            }
          } catch {
            // Skip
          }
          return null
        })

        const results = await Promise.all(skillPromises)
        const dataMap: Record<string, AgentSkillData> = {}
        let cats: SkillCategory[] = []

        for (const result of results) {
          if (result) {
            dataMap[result.id] = result.data
            if (result.cats?.length > 0) cats = result.cats
          }
        }

        setAllAgentData(dataMap)
        setCategories(cats)

        // Fetch leaderboard
        try {
          const lbRes = await fetch('/api/agent-skills?path=leaderboard')
          if (lbRes.ok) {
            const lbData = await lbRes.json()
            setLeaderboard(lbData.leaderboard || [])
          }
        } catch {
          // Generate from local data
          const entries: LeaderboardEntry[] = Object.entries(dataMap).map(([id, data]) => ({
            agentId: id,
            totalXP: data.totalXP,
            agentLevel: data.agentLevel,
            rankTitle: data.rankTitle,
            previousRank: 0,
          }))
          entries.sort((a, b) => b.totalXP - a.totalXP)
          setLeaderboard(entries)
        }
      } catch {
        // Silent
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [agents])

  // Selected agent data
  const selectedData = selectedAgentId ? allAgentData[selectedAgentId] : null
  const selectedAgent = agents.find(a => a.id === selectedAgentId)

  // Max XP for leaderboard bars
  const maxLeaderboardXP = Math.max(...leaderboard.map(l => l.totalXP), 1)

  // Achievement data for selected agent
  const [agentAchievements, setAgentAchievements] = useState<AchievementDef[]>([])
  useEffect(() => {
    if (!selectedAgentId) return
    const fetchAchievements = async () => {
      try {
        const res = await fetch(`/api/agent-skills?path=achievements&agentId=${selectedAgentId}`)
        if (res.ok) {
          const parsed = await res.json()
          setAgentAchievements(parsed.achievements || [])
        }
      } catch {
        // Default achievements
        setAgentAchievements([
          { id: 'first-meeting', name: 'First Meeting', description: 'Participated in first meeting', icon: 'Users', earned: true, earnedAt: new Date().toISOString() },
          { id: 'wordsmith', name: 'Wordsmith', description: 'Sent 100+ messages', icon: 'PenTool' },
          { id: 'data-driven', name: 'Data-driven', description: 'Created 10+ data analyses', icon: 'BarChart3' },
          { id: 'team-player', name: 'Team Player', description: 'Collaborated with 5+ agents', icon: 'Handshake' },
          { id: 'night-owl', name: 'Night Owl', description: 'Active past midnight', icon: 'Moon' },
          { id: 'speed-runner', name: 'Speed Runner', description: 'Completed meeting in record time', icon: 'Zap' },
          { id: 'mentor', name: 'Mentor', description: 'Mentored 3+ agents', icon: 'GraduationCap' },
          { id: 'centurion', name: 'Centurion', description: 'Reached Level 10', icon: 'Award' },
          { id: 'polymath', name: 'Polymath', description: 'Unlocked skills in all categories', icon: 'Brain' },
          { id: 'master-researcher', name: 'Master Researcher', description: 'Maxed out a skill category', icon: 'Star' },
        ])
      }
    }
    fetchAchievements()
  }, [selectedAgentId])

  // Check achievements
  const checkAchievements = useCallback(async () => {
    if (!selectedAgentId) return
    try {
      const res = await fetch('/api/agent-skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: 'achievements/check', agentId: selectedAgentId }),
      })
      if (res.ok) {
        const parsed = await res.json()
        if (parsed.newlyEarned?.length > 0) {
          // Re-fetch achievements
          const achRes = await fetch(`/api/agent-skills?path=achievements&agentId=${selectedAgentId}`)
          if (achRes.ok) {
            const achData = await achRes.json()
            setAgentAchievements(achData.achievements || [])
          }
        }
      }
    } catch {
      // Silent
    }
  }, [selectedAgentId])

  if (!mounted) return null

  // --- Render ---
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--vl-text-heading)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Trophy style={{ width: 18, height: 18, color: '#f59e0b' }} />
          {lang === 'zh' ? '成长面板' : 'Progression Dashboard'}
        </h3>
        <div className="agent-skill-selector">
          {agents.map(agent => (
            <button
              key={agent.id}
              className={`agent-skill-tab ${selectedAgentId === agent.id ? 'active' : ''}`}
              onClick={() => setSelectedAgentId(agent.id)}
            >
              <span style={{
                display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                backgroundColor: agent.color, marginRight: 4, verticalAlign: 'middle',
              }} />
              {agent.title.length > 14 ? agent.title.slice(0, 14) + '…' : agent.title}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, color: 'var(--vl-text-muted)' }}>
          <Loader2 style={{ width: 20, height: 20, className: 'animate-spin', marginRight: 8 }} />
          {lang === 'zh' ? '加载中...' : 'Loading...'}
        </div>
      )}

      {!loading && agents.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--vl-text-muted)' }}>
          {lang === 'zh' ? '暂无智能体数据' : 'No agent data available'}
        </div>
      )}

      {!loading && (
        <>
          {/* Row 1: Agent Level Cards (grid of all agents) */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16,
          }}>
            {agents.map((agent, idx) => {
              const data = allAgentData[agent.id]
              if (!data) return null
              return (
                <AgentLevelCard
                  key={agent.id}
                  agent={agent}
                  skillData={data}
                  index={idx}
                  lang={lang}
                />
              )
            })}
          </div>

          {/* Row 2: Leaderboard + Radar Chart */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
            {/* Leaderboard */}
            <div style={{ padding: 16, borderRadius: 'var(--vl-radius-xl)', background: 'var(--vl-bg-card)', border: '1px solid var(--vl-border)' }}>
              <h4 style={{ fontSize: 12, fontWeight: 600, color: 'var(--vl-text-heading)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Trophy style={{ width: 14, height: 14, color: '#f59e0b' }} />
                {lang === 'zh' ? '排行榜' : 'Leaderboard'}
              </h4>
              {leaderboard.length > 0 ? (
                <Leaderboard
                  leaderboard={leaderboard}
                  agents={agents}
                  maxXP={maxLeaderboardXP}
                  lang={lang}
                />
              ) : (
                <p style={{ fontSize: 11, color: 'var(--vl-text-muted)', textAlign: 'center', padding: 20 }}>
                  {lang === 'zh' ? '暂无排行数据' : 'No leaderboard data'}
                </p>
              )}
            </div>

            {/* Radar Chart */}
            {selectedData && categories.length > 0 && (
              <div style={{ padding: 16, borderRadius: 'var(--vl-radius-xl)', background: 'var(--vl-bg-card)', border: '1px solid var(--vl-border)' }}>
                <h4 style={{ fontSize: 12, fontWeight: 600, color: 'var(--vl-text-heading)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Target style={{ width: 14, height: 14, color: '#06b6d4' }} />
                  {selectedAgent?.title || ''} — {lang === 'zh' ? '技能雷达' : 'Skill Radar'}
                </h4>
                <SkillRadarChart
                  categories={categories}
                  skillData={selectedData}
                  lang={lang}
                />
              </div>
            )}
          </div>

          {/* Row 3: Achievements */}
          <div style={{ padding: 16, borderRadius: 'var(--vl-radius-xl)', background: 'var(--vl-bg-card)', border: '1px solid var(--vl-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h4 style={{ fontSize: 12, fontWeight: 600, color: 'var(--vl-text-heading)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Award style={{ width: 14, height: 14, color: '#8b5cf6' }} />
                {lang === 'zh' ? '成就徽章' : 'Achievement Badges'}
                {selectedAgent && (
                  <span style={{ fontSize: 10, color: 'var(--vl-text-muted)', fontWeight: 400 }}>
                    — {selectedAgent.title}
                  </span>
                )}
              </h4>
              <button
                onClick={checkAchievements}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, fontSize: 10,
                  padding: '4px 10px', borderRadius: 'var(--vl-radius-full)',
                  background: 'var(--vl-bg-inner)', border: '1px solid var(--vl-border-subtle)',
                  color: 'var(--vl-text-muted)', cursor: 'pointer', fontWeight: 500,
                }}
              >
                <RefreshCw style={{ width: 10, height: 10 }} />
                {lang === 'zh' ? '检查' : 'Check'}
              </button>
            </div>
            <AchievementBadgesGrid achievements={agentAchievements} lang={lang} />
          </div>

          {/* Row 4: XP History + Heatmap + Milestones */}
          {selectedData && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
              {/* XP History Chart */}
              <div style={{ padding: 16, borderRadius: 'var(--vl-radius-xl)', background: 'var(--vl-bg-card)', border: '1px solid var(--vl-border)' }}>
                <h4 style={{ fontSize: 12, fontWeight: 600, color: 'var(--vl-text-heading)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BarChart3 style={{ width: 14, height: 14, color: 'var(--vl-accent)' }} />
                  {selectedAgent?.title || ''} — {lang === 'zh' ? 'XP 历史趋势 (30天)' : 'XP History (30 days)'}
                </h4>
                <XPHistoryChart xpHistory={selectedData.xpHistory || []} lang={lang} />
              </div>

              {/* Activity Heatmap */}
              <ActivityHeatmap skillData={selectedData} lang={lang} />
            </div>
          )}

          {/* Row 5: Milestone Timeline */}
          {selectedData && (
            <MilestoneTimeline
              milestones={selectedData.milestones || []}
              agentLevel={selectedData.agentLevel}
              lang={lang}
            />
          )}
        </>
      )}
    </div>
  )
}
