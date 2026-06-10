'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

// ============================================================
// Types
// ============================================================

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
type AgentStatus = 'online' | 'busy' | 'offline'

interface AgentAvatarData {
  id: string
  name: string
  color: string
  status?: AgentStatus
  expertise?: string
  role?: string
}

interface AgentAvatarProps {
  agent: AgentAvatarData
  size?: AvatarSize
  showStatus?: boolean
  showGlow?: boolean
  lang?: string
  className?: string
  onClick?: () => void
}

interface AgentAvatarGroupProps {
  agents: AgentAvatarData[]
  maxVisible?: number
  size?: AvatarSize
  lang?: string
  className?: string
  onAgentClick?: (agent: AgentAvatarData) => void
}

// ============================================================
// Constants
// ============================================================

const SIZE_MAP: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 72,
}

const FONT_SIZE_MAP: Record<AvatarSize, string> = {
  xs: 'text-[9px]',
  sm: 'text-[11px]',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-xl',
}

const STATUS_RING_SIZE: Record<AvatarSize, string> = {
  xs: 'size-2.5',
  sm: 'size-3',
  md: 'size-3.5',
  lg: 'size-4',
  xl: 'size-5',
}

const STATUS_COLORS: Record<AgentStatus, { ring: string; bg: string; dot: string }> = {
  online: {
    ring: 'border-emerald-500',
    bg: 'bg-emerald-500',
    dot: '#10b981',
  },
  busy: {
    ring: 'border-amber-500',
    bg: 'bg-amber-500',
    dot: '#f59e0b',
  },
  offline: {
    ring: 'border-slate-400',
    bg: 'bg-slate-400',
    dot: '#94a3b8',
  },
}

// Default gradients for fallback
const AVATAR_GRADIENTS = [
  'from-emerald-400 to-cyan-500',
  'from-violet-500 to-purple-600',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',
  'from-blue-400 to-indigo-500',
  'from-teal-400 to-emerald-500',
  'from-fuchsia-400 to-purple-500',
  'from-sky-400 to-blue-500',
]

function getGradientForColor(color: string): string {
  // Map common hex colors to gradient classes
  const map: Record<string, string> = {
    '#f59e0b': 'from-amber-400 to-orange-500',
    '#ef4444': 'from-rose-400 to-red-500',
    '#10b981': 'from-emerald-400 to-teal-500',
    '#8b5cf6': 'from-violet-400 to-purple-500',
    '#06b6d4': 'from-cyan-400 to-sky-500',
    '#f97316': 'from-orange-400 to-amber-500',
    '#ec4899': 'from-pink-400 to-rose-500',
    '#14b8a6': 'from-teal-400 to-emerald-500',
    '#a855f7': 'from-purple-400 to-violet-500',
    '#84cc16': 'from-lime-400 to-green-500',
  }
  return map[color] || AVATAR_GRADIENTS[Math.abs(hashCode(color)) % AVATAR_GRADIENTS.length]
}

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return hash
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

// ============================================================
// AgentAvatar — Enhanced SVG avatar with status ring and glow
// ============================================================

function AgentAvatarComponent({
  agent,
  size = 'md',
  showStatus = true,
  showGlow = false,
  lang,
  className = '',
  onClick,
}: AgentAvatarProps) {
  const [mounted, setMounted] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => { requestAnimationFrame(() => { setMounted(true) }) }, [])

  const px = SIZE_MAP[size]
  const initials = getInitials(agent.name)
  const gradient = getGradientForColor(agent.color)
  const status = agent.status || 'online'
  const statusConfig = STATUS_COLORS[status]

  if (!mounted) {
    return <div style={{ width: px, height: px }} className={cn('rounded-full bg-gray-200', className)} />
  }

  return (
    <div className={cn('relative inline-flex flex-shrink-0', className)} style={{ width: px, height: px }}>
      {/* Glow effect */}
      {showGlow && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            boxShadow: `0 0 ${px * 0.4}px ${agent.color}40, 0 0 ${px * 0.8}px ${agent.color}20`,
          }}
          animate={{
            boxShadow: [
              `0 0 ${px * 0.3}px ${agent.color}30, 0 0 ${px * 0.6}px ${agent.color}15`,
              `0 0 ${px * 0.5}px ${agent.color}50, 0 0 ${px}px ${agent.color}25`,
              `0 0 ${px * 0.3}px ${agent.color}30, 0 0 ${px * 0.6}px ${agent.color}15`,
            ],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Main avatar */}
      <motion.button
        type="button"
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={cn(
          'relative rounded-full overflow-hidden cursor-pointer',
          'focus-ring transition-transform duration-200',
        )}
        style={{ width: px, height: px }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        aria-label={agent.name}
      >
        {/* SVG Avatar */}
        <svg width={px} height={px} viewBox={`0 0 ${px} ${px}`} className="block">
          <defs>
            <linearGradient id={`grad-${agent.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={agent.color} stopOpacity="1" />
              <stop offset="100%" stopColor={adjustColor(agent.color, -30)} stopOpacity="1" />
            </linearGradient>
          </defs>
          <circle cx={px / 2} cy={px / 2} r={px / 2} fill={`url(#grad-${agent.id})`} />
          <text
            x={px / 2}
            y={px / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fill="white"
            fontWeight="600"
            style={{
              fontSize: px * (size === 'xs' ? 0.38 : size === 'sm' ? 0.38 : size === 'md' ? 0.38 : size === 'lg' ? 0.35 : 0.32),
            }}
          >
            {initials}
          </text>
        </svg>
      </motion.button>

      {/* Status ring */}
      {showStatus && (
        <div
          className={cn(
            'absolute -bottom-0.5 -right-0.5 rounded-full',
            'border-2 border-[var(--vl-bg-card)]',
            statusConfig.ring,
          )}
        >
          <div
            className={cn(
              STATUS_RING_SIZE[size],
              'rounded-full',
              statusConfig.bg,
              status === 'online' && 'animate-pulse',
            )}
          />
        </div>
      )}

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (agent.expertise || agent.role) && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2',
              'px-3 py-2 rounded-lg min-w-[180px]',
              'bg-[var(--vl-bg-card)] border border-[var(--vl-border)]',
              'shadow-xl backdrop-blur-sm',
              'pointer-events-none',
            )}
          >
            {/* Tooltip arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[var(--vl-border)]" />

            <p className="text-xs font-semibold vl-text-heading">{agent.name}</p>
            {agent.role && (
              <p className="text-[10px] vl-text-muted mt-0.5">{agent.role}</p>
            )}
            {agent.expertise && (
              <p className="text-[10px] vl-text-body mt-1 line-clamp-2">{agent.expertise}</p>
            )}
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className={cn('w-1.5 h-1.5 rounded-full', statusConfig.bg)} />
              <span className="text-[10px] vl-text-muted capitalize">{status}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================
// AgentAvatarGroup — Overlapping avatar group with "+N"
// ============================================================

function AgentAvatarGroup({
  agents,
  maxVisible = 5,
  size = 'md',
  lang,
  className = '',
  onAgentClick,
}: AgentAvatarGroupProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { requestAnimationFrame(() => { setMounted(true) }) }, [])

  const visible = useMemo(() => agents.slice(0, maxVisible), [agents, maxVisible])
  const overflow = Math.max(0, agents.length - maxVisible)
  const px = SIZE_MAP[size]
  const overlapPx = size === 'xs' ? 8 : size === 'sm' ? 10 : size === 'md' ? 12 : size === 'lg' ? 16 : 20

  if (!mounted) {
    return (
      <div className={cn('flex', className)} style={{ gap: overlapPx - 2 }}>
        {agents.slice(0, maxVisible + 1).map((_, i) => (
          <div key={i} className="rounded-full bg-gray-200" style={{ width: px, height: px }} />
        ))}
      </div>
    )
  }

  return (
    <div className={cn('flex items-center', className)} style={{ gap: -overlapPx }}>
      {visible.map((agent, index) => (
        <motion.div
          key={agent.id}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05, type: 'spring', damping: 20 }}
          style={{ marginLeft: index === 0 ? 0 : -overlapPx + 2, zIndex: visible.length - index }}
          className="relative"
        >
          <AgentAvatarComponent
            agent={agent}
            size={size}
            showStatus={size !== 'xs'}
            showGlow={false}
            lang={lang}
            onClick={onAgentClick ? () => onAgentClick(agent) : undefined}
          />
        </motion.div>
      ))}

      {overflow > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: visible.length * 0.05, type: 'spring', damping: 20 }}
          style={{ marginLeft: -overlapPx + 2, width: px, height: px }}
          className="relative flex-shrink-0"
        >
          <div
            className={cn(
              'rounded-full flex items-center justify-center cursor-default',
              'bg-[var(--vl-bg-secondary)] border-2 border-[var(--vl-border)]',
              FONT_SIZE_MAP[size],
            )}
            style={{ width: px, height: px }}
          >
            <span className="vl-text-muted font-semibold">+{overflow}</span>
          </div>
        </motion.div>
      )}
    </div>
  )
}

// ============================================================
// Utility: Adjust hex color brightness
// ============================================================

function adjustColor(hex: string, amount: number): string {
  const color = hex.replace('#', '')
  const num = parseInt(color, 16)
  const r = Math.min(255, Math.max(0, (num >> 16) + amount))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount))
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount))
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`
}

// ============================================================
// Exports
// ============================================================

export { AgentAvatarComponent as AgentAvatar, AgentAvatarGroup }
export type { AgentAvatarData, AgentAvatarProps, AgentAvatarGroupProps, AvatarSize, AgentStatus }

export default AgentAvatarComponent
