'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Bell,
  X,
  CheckCheck,
  Settings,
  MessageSquare,
  Bot,
  AlertCircle,
  Info,
  Trash2,
  Volume2,
  VolumeX,
  Trophy,
  GitBranch,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import { getTimeAgo } from './shared-components'
import type { NotificationData } from './shared-types'
import { useNotificationSound } from './notification-sounds'

// ============================================================
// Types
// ============================================================

type NotificationFilter = 'all' | 'unread' | 'meeting' | 'agent' | 'pipeline' | 'achievement' | 'system'

type NotificationType = 'meeting_started' | 'meeting_completed' | 'agent_created' | 'agent_updated' | 'pipeline_stage_completed' | 'system' | 'achievement'

interface NotificationPreferences {
  meetingEvents: boolean
  agentEvents: boolean
  pipelineEvents: boolean
  systemAlerts: boolean
  achievementAlerts: boolean
  sound: boolean
  badges: boolean
}

interface Achievement {
  id: string
  key: string
  titleKey: string
  descKey: string
  threshold: number
  currentCount: number
  unlocked: boolean
  unlockedAt: string | null
}

interface AchievementStore {
  firstMeeting: Achievement
  researcher: Achievement
  teamBuilder: Achievement
  pipelineMaster: Achievement
  dataExporter: Achievement
}

interface NotificationGroup {
  label: string
  items: NotificationData[]
}

interface NotificationCenterProps {
  isOpen: boolean
  onClose: () => void
  notifications: NotificationData[]
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
  onDelete: (id: string) => void
  lang: Lang
}

interface NotificationBellButtonProps {
  unreadCount: number
  onClick: () => void
  lang: Lang
}

// ============================================================
// localStorage Keys
// ============================================================

const PREFS_KEY = 'vl-notification-prefs'
const SOUNDS_KEY = 'vl-notification-sounds'
const BADGES_KEY = 'vl-notification-badges'
const ACHIEVEMENTS_KEY = 'vl-achievements'
const UNREAD_KEY = 'vl-notification-unread-count'

// ============================================================
// Hydration-safe localStorage helpers
// ============================================================

function useHydratedState<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue
    try {
      const stored = localStorage.getItem(key)
      if (stored !== null) return JSON.parse(stored)
    } catch { /* ignore */ }
    return defaultValue
  })

  const stabilizedSetValue = useCallback((action: T | ((prev: T) => T)) => {
    setValue(prev => {
      const nextValue = typeof action === 'function' ? (action as (prev: T) => T)(prev) : action
      try {
        localStorage.setItem(key, JSON.stringify(nextValue))
      } catch { /* ignore */ }
      return nextValue
    })
  }, [key])

  return [value, stabilizedSetValue]
}

// ============================================================
// Default values
// ============================================================

const DEFAULT_PREFS: NotificationPreferences = {
  meetingEvents: true,
  agentEvents: true,
  pipelineEvents: true,
  systemAlerts: true,
  achievementAlerts: true,
  sound: true,
  badges: true,
}

const DEFAULT_ACHIEVEMENTS: AchievementStore = {
  firstMeeting: { id: 'ach-first-meeting', key: 'firstMeeting', titleKey: 'notifications.achievement.firstMeeting', descKey: 'notifications.achievement.firstMeetingDesc', threshold: 1, currentCount: 0, unlocked: false, unlockedAt: null },
  researcher: { id: 'ach-researcher', key: 'researcher', titleKey: 'notifications.achievement.researcher', descKey: 'notifications.achievement.researcherDesc', threshold: 5, currentCount: 0, unlocked: false, unlockedAt: null },
  teamBuilder: { id: 'ach-team-builder', key: 'teamBuilder', titleKey: 'notifications.achievement.teamBuilder', descKey: 'notifications.achievement.teamBuilderDesc', threshold: 3, currentCount: 0, unlocked: false, unlockedAt: null },
  pipelineMaster: { id: 'ach-pipeline-master', key: 'pipelineMaster', titleKey: 'notifications.achievement.pipelineMaster', descKey: 'notifications.achievement.pipelineMasterDesc', threshold: 5, currentCount: 0, unlocked: false, unlockedAt: null },
  dataExporter: { id: 'ach-data-exporter', key: 'dataExporter', titleKey: 'notifications.achievement.dataExporter', descKey: 'notifications.achievement.dataExporterDesc', threshold: 3, currentCount: 0, unlocked: false, unlockedAt: null },
}

// ============================================================
// Notification Type → Icon, Color & Classification
// ============================================================

function NotificationTypeIcon({ type, className }: { type: string; className?: string }) {
  if (type === 'meeting_started' || type === 'meeting_completed' || type.startsWith('meeting')) {
    return <MessageSquare className={className} />
  }
  if (type === 'agent_created' || type === 'agent_updated' || type.startsWith('agent')) {
    return <Bot className={className} />
  }
  if (type === 'pipeline_stage_completed' || type.startsWith('pipeline')) {
    return <GitBranch className={className} />
  }
  if (type === 'achievement') {
    return <Trophy className={className} />
  }
  if (type === 'warning' || type === 'error') return <AlertCircle className={className} />
  if (type === 'info' || type === 'success') return <Info className={className} />
  if (type === 'system') return <Settings className={className} />
  return <Bell className={className} />
}

function getNotificationTypeInfo(type: string): {
  bg: string
  text: string
  typeClass: string
  filterCategory: NotificationFilter
} {
  if (type === 'meeting_started' || type === 'meeting_completed' || type.startsWith('meeting')) {
    return { bg: 'bg-emerald-500/20', text: 'text-emerald-400', typeClass: 'notification-type-meeting', filterCategory: 'meeting' }
  }
  if (type === 'agent_created' || type === 'agent_updated' || type.startsWith('agent')) {
    return { bg: 'bg-cyan-500/20', text: 'text-cyan-400', typeClass: 'notification-type-agent', filterCategory: 'agent' }
  }
  if (type === 'pipeline_stage_completed' || type.startsWith('pipeline')) {
    return { bg: 'bg-amber-500/20', text: 'text-amber-400', typeClass: 'notification-type-pipeline', filterCategory: 'pipeline' }
  }
  if (type === 'achievement') {
    return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', typeClass: 'notification-type-achievement', filterCategory: 'achievement' }
  }
  if (type === 'warning' || type === 'error') {
    return { bg: 'bg-amber-500/20', text: 'text-amber-400', typeClass: 'notification-type-system', filterCategory: 'system' }
  }
  return { bg: 'bg-slate-500/20', text: 'text-slate-400', typeClass: 'notification-type-system', filterCategory: 'system' }
}

function classifyNotificationFilter(type: string): NotificationFilter {
  return getNotificationTypeInfo(type).filterCategory
}

// ============================================================
// Inline i18n Helper
// ============================================================

function nt(lang: Lang, key: string): string {
  // Try t() first for known keys
  const result = t(lang, key)
  if (result !== key) return result

  // Inline fallback translations
  const inline: Record<string, Record<Lang, string>> = {
    'notification.filter.all': { en: 'All', zh: '全部' },
    'notification.filter.unread': { en: 'Unread', zh: '未读' },
    'notification.filter.meeting': { en: 'Meeting', zh: '会议' },
    'notification.filter.agent': { en: 'Agent', zh: '智能体' },
    'notification.filter.pipeline': { en: 'Pipeline', zh: '流水线' },
    'notification.filter.achievement': { en: 'Achievement', zh: '成就' },
    'notification.filter.system': { en: 'System', zh: '系统' },
    'notification.grouping.today': { en: 'Today', zh: '今天' },
    'notification.grouping.yesterday': { en: 'Yesterday', zh: '昨天' },
    'notification.grouping.earlierThisWeek': { en: 'Earlier this week', zh: '本周早些' },
    'notification.grouping.older': { en: 'Older', zh: '更早' },
    'notification.dismiss': { en: 'Dismiss', zh: '关闭' },
  }
  return inline[key]?.[lang] || key
}

// ============================================================
// Time Grouping Helper
// ============================================================

function groupNotificationsByTime(notifications: NotificationData[], lang: Lang): NotificationGroup[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const startOfWeek = new Date(today.getTime() - today.getDay() * 86400000)

  const groups: NotificationGroup[] = []

  const todayItems = notifications.filter(n => new Date(n.createdAt) >= today)
  const yesterdayItems = notifications.filter(n => {
    const d = new Date(n.createdAt)
    return d >= yesterday && d < today
  })
  const weekItems = notifications.filter(n => {
    const d = new Date(n.createdAt)
    return d >= startOfWeek && d < yesterday
  })
  const olderItems = notifications.filter(n => new Date(n.createdAt) < startOfWeek)

  if (todayItems.length > 0) groups.push({ label: nt(lang, 'notification.grouping.today'), items: todayItems })
  if (yesterdayItems.length > 0) groups.push({ label: nt(lang, 'notification.grouping.yesterday'), items: yesterdayItems })
  if (weekItems.length > 0) groups.push({ label: nt(lang, 'notification.grouping.earlierThisWeek'), items: weekItems })
  if (olderItems.length > 0) groups.push({ label: nt(lang, 'notification.grouping.older'), items: olderItems })

  return groups
}

// ============================================================
// Format exact time for tooltip
// ============================================================

function formatExactTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

// ============================================================
// Filter Tabs Component
// ============================================================

const FILTER_OPTIONS: NotificationFilter[] = ['all', 'unread', 'meeting', 'agent', 'pipeline', 'achievement', 'system']

function FilterTabs({
  activeFilter,
  onFilterChange,
  notifications,
  lang,
}: {
  activeFilter: NotificationFilter
  onFilterChange: (filter: NotificationFilter) => void
  notifications: NotificationData[]
  lang: Lang
}) {
  const counts = useMemo(() => {
    const all = notifications.length
    const unread = notifications.filter(n => !n.read).length
    const meeting = notifications.filter(n => classifyNotificationFilter(n.type) === 'meeting').length
    const agent = notifications.filter(n => classifyNotificationFilter(n.type) === 'agent').length
    const pipeline = notifications.filter(n => classifyNotificationFilter(n.type) === 'pipeline').length
    const achievement = notifications.filter(n => classifyNotificationFilter(n.type) === 'achievement').length
    const system = notifications.filter(n => classifyNotificationFilter(n.type) === 'system').length
    return { all, unread, meeting, agent, pipeline, achievement, system }
  }, [notifications])

  return (
    <div className="flex gap-1 px-4 py-2 overflow-x-auto" role="tablist" aria-label="Notification filters">
      {FILTER_OPTIONS.map(filter => {
        const count = counts[filter as keyof typeof counts]
        const isActive = activeFilter === filter
        return (
          <button
            key={filter}
            role="tab"
            aria-selected={isActive}
            onClick={() => onFilterChange(filter)}
            className={`
              relative px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200
              focus-ring-animated outline-none whitespace-nowrap
              ${isActive
                ? 'bg-emerald-500/20 text-emerald-400 shadow-sm'
                : 'vl-text-muted hover:text-[var(--vl-text-white)] hover:bg-[var(--vl-bg-inner)]'
              }
            `}
          >
            {nt(lang, `notification.filter.${filter}`)}
            {count > 0 && (
              <span className={`ml-1.5 text-[10px] ${isActive ? 'text-emerald-300' : 'vl-text-muted'}`}>
                {count}
              </span>
            )}
            {isActive && (
              <motion.div
                layoutId="notif-filter-indicator"
                className="absolute inset-0 rounded-full border border-emerald-500/30"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}

// ============================================================
// Single Notification Card
// ============================================================

function NotificationCard({
  notification,
  onMarkRead,
  onDelete,
  lang,
}: {
  notification: NotificationData
  onMarkRead: (id: string) => void
  onDelete: (id: string) => void
  lang: Lang
}) {
  const [isExiting, setIsExiting] = useState(false)
  const typeInfo = getNotificationTypeInfo(notification.type)
  const isAchievement = notification.type === 'achievement'

  const handleClick = useCallback(() => {
    if (!notification.read) {
      onMarkRead(notification.id)
    }
    if (notification.link) {
      toast.info(nt(lang, 'notification.title'))
    }
  }, [notification, onMarkRead, lang])

  const handleDismiss = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExiting(true)
    setTimeout(() => onDelete(notification.id), 300)
  }, [notification.id, onDelete])

  const timeAgoStr = getTimeAgo(notification.createdAt)
  const exactTimeStr = formatExactTime(notification.createdAt)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`
        group relative flex items-start gap-3 p-3 cursor-pointer transition-all duration-200
        card-hover-glow rounded-xl notif-card ${isExiting ? 'notif-card-exit' : ''}
        ${!notification.read && !isAchievement
          ? 'bg-emerald-500/5 border-l-[3px] border-emerald-500'
          : ''
        }
        ${!notification.read && isAchievement ? '' : ''}
        ${notification.read && !isAchievement ? 'hover:bg-[var(--vl-bg-inner)]' : ''}
        ${isAchievement && !notification.read ? 'notification-type-achievement notification-glow' : ''}
        ${!isAchievement && !notification.read ? typeInfo.typeClass : ''}
      `}
      onClick={handleClick}
      role="listitem"
      aria-label={`${notification.title}: ${notification.message}`}
    >
      {/* Achievement shimmer overlay */}
      {isAchievement && !notification.read && (
        <div className="absolute inset-0 rounded-xl achievement-badge-shimmer pointer-events-none" />
      )}

      {/* Type icon */}
      <div className={`notification-icon-wrap shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${typeInfo.bg}`}>
        <NotificationTypeIcon type={notification.type} className={`size-4 ${typeInfo.text}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <p className={`text-xs font-semibold truncate ${!notification.read ? 'vl-text-heading' : 'vl-text-body'}`}>
            {notification.title}
          </p>
          {/* Dismiss button (visible on hover) */}
          <button
            onClick={handleDismiss}
            className="shrink-0 w-5 h-5 rounded-md flex items-center justify-center
              opacity-0 group-hover:opacity-100 transition-all duration-200
              vl-text-muted hover:text-red-400 hover:bg-red-500/10"
            aria-label={nt(lang, 'notification.dismiss')}
          >
            <X className="size-3" />
          </button>
        </div>
        <p className="text-xs vl-text-muted mt-0.5 line-clamp-2">{notification.message}</p>
        <span
          className="notification-time-tooltip text-[10px] vl-text-muted mt-1 block"
          data-tooltip={exactTimeStr}
        >
          {timeAgoStr}
        </span>
      </div>

      {/* Unread dot indicator */}
      {!notification.read && !isAchievement && (
        <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-500 notif-dot-pulse" />
      )}
    </motion.div>
  )
}

// ============================================================
// Empty State
// ============================================================

function EmptyState({ lang }: { lang: Lang }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 px-6 content-fade-scale"
    >
      <div className="relative w-16 h-16 mb-4 float-gentle">
        <div
          className="absolute inset-0 rounded-2xl blur-xl opacity-20"
          style={{ background: 'linear-gradient(135deg, var(--vl-accent, #10b981), rgba(6,182,212,0.3))' }}
        />
        <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center bg-[var(--vl-bg-inner)] border border-[var(--vl-border-subtle)]">
          <Bell className="size-7 text-emerald-400" />
        </div>
      </div>
      <p className="vl-text-heading text-sm font-semibold mb-1">
        {t(lang, 'notification.noNotificationsYet')}
      </p>
      <p className="text-xs vl-text-muted text-center max-w-[200px]">
        {lang === 'zh' ? '会议更新将在这里显示' : 'Meeting updates will appear here'}
      </p>
    </motion.div>
  )
}

// ============================================================
// Collapsible Notification Group
// ============================================================

function CollapsibleGroup({
  group,
  lang,
  onMarkRead,
  onDelete,
  onMarkGroupRead,
  onDismissGroup,
}: {
  group: NotificationGroup
  lang: Lang
  onMarkRead: (id: string) => void
  onDelete: (id: string) => void
  onMarkGroupRead: (ids: string[]) => void
  onDismissGroup: (ids: string[]) => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const unreadCount = group.items.filter(n => !n.read).length

  const handleMarkGroupRead = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const unreadIds = group.items.filter(n => !n.read).map(n => n.id)
    if (unreadIds.length > 0) onMarkGroupRead(unreadIds)
  }, [group.items, onMarkGroupRead])

  const handleDismissGroup = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onDismissGroup(group.items.map(n => n.id))
  }, [group.items, onDismissGroup])

  return (
    <div key={group.label} className="mb-1">
      {/* Group header */}
      <div
        className="notification-group-header"
        onClick={() => setCollapsed(prev => !prev)}
        role="button"
        aria-expanded={!collapsed}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setCollapsed(prev => !prev) }}
      >
        <div className="flex items-center gap-2">
          {collapsed ? <ChevronRight className="size-3" /> : <ChevronDown className="size-3" />}
          <span>{group.label}</span>
          <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-semibold bg-[var(--vl-bg-card)] text-[var(--vl-text-muted)]">
            {group.items.length}
          </Badge>
          {unreadCount > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 live-pulse-dot" />
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkGroupRead}
              className="text-[9px] px-1.5 py-0.5 rounded hover:bg-emerald-500/10 hover:text-emerald-400 vl-text-muted transition-colors"
              aria-label={t(lang, 'notifications.markGroupRead')}
            >
              <CheckCheck className="size-2.5 inline mr-0.5" />
              {t(lang, 'notifications.markGroupRead')}
            </button>
          )}
          <button
            onClick={handleDismissGroup}
            className="text-[9px] px-1.5 py-0.5 rounded hover:bg-red-500/10 hover:text-red-400 vl-text-muted transition-colors"
            aria-label={t(lang, 'notifications.dismissGroup')}
          >
            <Trash2 className="size-2.5 inline mr-0.5" />
          </button>
        </div>
      </div>

      {/* Group items */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-1 mt-1 overflow-hidden"
          >
            {group.items.map((notif, idx) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 25,
                  delay: idx * 0.03,
                }}
              >
                <NotificationCard
                  notification={notif}
                  onMarkRead={onMarkRead}
                  onDelete={onDelete}
                  lang={lang}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================
// Live Activity Feed
// ============================================================

function LiveActivityFeed({ notifications, lang }: { notifications: NotificationData[]; lang: Lang }) {
  const recentNotifications = useMemo(() => {
    return notifications.slice(0, 5)
  }, [notifications])

  if (recentNotifications.length === 0) {
    return (
      <div className="px-4 py-3 border-b border-[var(--vl-border)]">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 live-pulse-dot" />
          <h3 className="text-xs font-semibold vl-text-heading">
            {t(lang, 'notifications.liveFeed')}
          </h3>
        </div>
        <div className="flex items-center gap-2 py-2 text-xs vl-text-muted">
          <Sparkles className="size-3" />
          <span>{t(lang, 'notifications.noNewEvents')}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-3 border-b border-[var(--vl-border)]">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full bg-emerald-500 live-pulse-dot" />
        <h3 className="text-xs font-semibold vl-text-heading">
          {t(lang, 'notifications.liveFeed')}
        </h3>
        <span className="text-[9px] vl-text-muted ml-auto">{t(lang, 'notifications.liveFeedDesc')}</span>
      </div>
      <div className="space-y-1.5 max-h-28 overflow-y-auto">
        {recentNotifications.map((notif) => {
          const typeInfo = getNotificationTypeInfo(notif.type)
          return (
            <div key={notif.id} className="flex items-center gap-2 py-1 px-1 rounded-md hover:bg-[var(--vl-bg-inner)] transition-colors">
              <div className={`shrink-0 w-5 h-5 rounded flex items-center justify-center ${typeInfo.bg}`}>
                <NotificationTypeIcon type={notif.type} className={`size-2.5 ${typeInfo.text}`} />
              </div>
              <span className={`text-[11px] truncate flex-1 ${notif.read ? 'vl-text-muted' : 'vl-text-body font-medium'}`}>
                {notif.title}
              </span>
              <span className="text-[9px] vl-text-muted shrink-0">
                {getTimeAgo(notif.createdAt)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================
// Achievement Progress Section
// ============================================================

function AchievementProgress({ achievements, lang }: { achievements: AchievementStore; lang: Lang }) {
  const unlockedCount = useMemo(() => {
    return Object.values(achievements).filter(a => a.unlocked).length
  }, [achievements])

  return (
    <div className="px-4 py-3 border-t border-[var(--vl-border)]">
      <div className="flex items-center gap-2 mb-2">
        <Trophy className="size-3.5 text-yellow-500" />
        <span className="text-xs font-semibold vl-text-heading">{t(lang, 'notifications.achievements.progress')}</span>
        <span className="text-[10px] vl-text-muted ml-auto">
          {t(lang, 'notifications.achievements.unlocked').replace('{count}', String(unlockedCount))}
        </span>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {Object.values(achievements).map((ach) => (
          <div
            key={ach.id}
            className={`
              relative flex flex-col items-center gap-0.5 py-1.5 px-0.5 rounded-lg text-center
              transition-all duration-200
              ${ach.unlocked
                ? 'bg-yellow-500/10 border border-yellow-500/20'
                : 'bg-[var(--vl-bg-inner)] border border-[var(--vl-border-subtle)] opacity-40'
              }
            `}
            title={t(lang, ach.titleKey)}
          >
            {ach.unlocked && (
              <div className="absolute inset-0 rounded-lg achievement-badge-shimmer pointer-events-none" />
            )}
            <Trophy className={`size-3.5 ${ach.unlocked ? 'text-yellow-500' : 'vl-text-muted'}`} />
            <span className="text-[8px] vl-text-muted leading-tight line-clamp-1">
              {t(lang, ach.titleKey)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// Preferences Section (Enhanced)
// ============================================================

function PreferencesSection({
  lang,
  prefs,
  onPrefChange,
  onMarkAllReadWithConfirm,
  unreadCount,
  achievements,
}: {
  lang: Lang
  prefs: NotificationPreferences
  onPrefChange: (key: keyof NotificationPreferences, value: boolean) => void
  onMarkAllReadWithConfirm: () => void
  unreadCount: number
  achievements: AchievementStore
}) {
  const [showConfirm, setShowConfirm] = useState(false)

  const prefItems: { key: keyof NotificationPreferences; label: string; desc: string; icon: React.ReactNode }[] = [
    { key: 'meetingEvents', label: t(lang, 'notifications.type.meeting'), desc: '', icon: <MessageSquare className="size-3.5 text-emerald-400" /> },
    { key: 'agentEvents', label: t(lang, 'notifications.type.agent'), desc: '', icon: <Bot className="size-3.5 text-cyan-400" /> },
    { key: 'pipelineEvents', label: t(lang, 'notifications.type.pipeline'), desc: '', icon: <GitBranch className="size-3.5 text-amber-400" /> },
    { key: 'systemAlerts', label: t(lang, 'notifications.type.system'), desc: '', icon: <AlertCircle className="size-3.5 text-slate-400" /> },
    { key: 'achievementAlerts', label: t(lang, 'notifications.type.achievement'), desc: '', icon: <Trophy className="size-3.5 text-yellow-400" /> },
    { key: 'sound', label: t(lang, 'notifications.sound'), desc: t(lang, 'notifications.soundDesc'), icon: prefs.sound ? <Volume2 className="size-3.5 text-emerald-400" /> : <VolumeX className="size-3.5 vl-text-muted" /> },
    { key: 'badges', label: t(lang, 'notifications.badges'), desc: t(lang, 'notifications.badgesDesc'), icon: <Badge className="h-3.5 w-3.5 p-0 bg-emerald-500 text-[6px]" /> },
  ]

  return (
    <div className="border-t border-[var(--vl-border)]">
      {/* Mark all read with confirmation */}
      {unreadCount > 0 && (
        <div className="px-4 py-2.5 flex items-center justify-between">
          {showConfirm ? (
            <div className="flex items-center gap-2 w-full">
              <span className="text-[11px] vl-text-body flex-1">{t(lang, 'notifications.markAllReadConfirm')}</span>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-emerald-400 hover:bg-emerald-500/10" onClick={() => { onMarkAllReadWithConfirm(); setShowConfirm(false) }}>
                {t(lang, 'notifications.confirmMarkAll')}
              </Button>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] vl-text-muted hover:bg-[var(--vl-bg-inner)]" onClick={() => setShowConfirm(false)}>
                {t(lang, 'notifications.cancel')}
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-emerald-400 hover:text-emerald-300 h-7 hover:bg-emerald-500/10 transition-colors justify-center"
              onClick={() => setShowConfirm(true)}
            >
              <CheckCheck className="size-3.5 mr-1" />
              {t(lang, 'notifications.markAllRead')}
            </Button>
          )}
        </div>
      )}

      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          <Settings className="size-3.5 vl-text-muted" />
          <span className="text-xs font-semibold vl-text-heading">{t(lang, 'notifications.preferences')}</span>
        </div>
        <div className="space-y-2.5">
          {prefItems.map(item => (
            <div key={item.key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {item.icon}
                <div>
                  <span className="text-xs vl-text-body">{item.label}</span>
                  {item.desc && (
                    <p className="text-[10px] vl-text-muted">{item.desc}</p>
                  )}
                </div>
              </div>
              <Switch
                checked={prefs[item.key]}
                onCheckedChange={(checked) => onPrefChange(item.key, checked)}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Achievement progress */}
      <AchievementProgress achievements={achievements} lang={lang} />
    </div>
  )
}

// ============================================================
// Main NotificationCenter Component
// ============================================================

export function NotificationCenter({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onMarkAllRead,
  onDelete,
  lang,
}: NotificationCenterProps) {
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all')
  const [prefs, setPrefs] = useHydratedState<NotificationPreferences>(PREFS_KEY, DEFAULT_PREFS)
  const [achievements, setAchievements] = useHydratedState<AchievementStore>(ACHIEVEMENTS_KEY, DEFAULT_ACHIEVEMENTS)
  const [dingTrigger, setDingTrigger] = useState(0)
  const bellRef = useRef<HTMLDivElement>(null)
  const { play: playSound } = useNotificationSound()

  const handleFilterChange = useCallback((f: NotificationFilter) => setActiveFilter(f), [])

  const updatePref = useCallback((key: keyof NotificationPreferences, value: boolean) => {
    setPrefs(prev => ({ ...prev, [key]: value }))
  }, [setPrefs])

  // Trigger ding animation on new notification (ref-based to avoid cascading renders)
  const prevCountRef = useRef(notifications.length)
  useEffect(() => {
    if (notifications.length > prevCountRef.current && prefs.sound) {
      playSound('info')
      // Using requestAnimationFrame to avoid synchronous setState-in-effect lint
      requestAnimationFrame(() => {
        setDingTrigger(prev => prev + 1)
      })
    }
    prevCountRef.current = notifications.length
  }, [notifications.length, prefs.sound])

  // Reset ding animation after playing
  useEffect(() => {
    if (dingTrigger > 0) {
      const timer = setTimeout(() => setDingTrigger(0), 700)
      return () => clearTimeout(timer)
    }
  }, [dingTrigger])

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Keyboard escape handler
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const unreadCount = useMemo(
    () => notifications.filter(n => !n.read).length,
    [notifications]
  )

  const filteredNotifications = useMemo(() => {
    let result = notifications
    switch (activeFilter) {
      case 'unread':
        result = result.filter(n => !n.read)
        break
      case 'meeting':
        result = result.filter(n => classifyNotificationFilter(n.type) === 'meeting')
        break
      case 'agent':
        result = result.filter(n => classifyNotificationFilter(n.type) === 'agent')
        break
      case 'pipeline':
        result = result.filter(n => classifyNotificationFilter(n.type) === 'pipeline')
        break
      case 'achievement':
        result = result.filter(n => classifyNotificationFilter(n.type) === 'achievement')
        break
      case 'system':
        result = result.filter(n => classifyNotificationFilter(n.type) === 'system')
        break
      default:
        break
    }
    // Apply preference filters
    if (activeFilter === 'all' || activeFilter === 'unread') {
      result = result.filter(n => {
        const cat = classifyNotificationFilter(n.type)
        switch (cat) {
          case 'meeting': return prefs.meetingEvents
          case 'agent': return prefs.agentEvents
          case 'pipeline': return prefs.pipelineEvents
          case 'achievement': return prefs.achievementAlerts
          case 'system': return prefs.systemAlerts
          default: return true
        }
      })
    }
    return result
  }, [notifications, activeFilter, prefs])

  const groupedNotifications = useMemo(
    () => groupNotificationsByTime(filteredNotifications, lang),
    [filteredNotifications, lang]
  )

  const handleMarkAllReadWithConfirm = useCallback(() => {
    onMarkAllRead()
  }, [onMarkAllRead])

  const handleMarkGroupRead = useCallback((ids: string[]) => {
    ids.forEach(id => onMarkRead(id))
  }, [onMarkRead])

  const handleDismissGroup = useCallback((ids: string[]) => {
    ids.forEach(id => onDelete(id))
  }, [onDelete])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Slide-in panel */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            className="fixed right-0 top-0 bottom-0 z-[61] w-full sm:w-96 glass-panel flex flex-col glass-notification-panel"
            role="dialog"
            aria-modal="true"
            aria-label={t(lang, 'notification.title')}
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--vl-border)]">
              <div className="flex items-center gap-2.5">
                {/* Bell icon with ding animation */}
                <div ref={bellRef} className="relative">
                  <div className={dingTrigger > 0 ? 'notification-ding' : ''}>
                    <Bell className="size-5 text-emerald-400" />
                  </div>
                  {unreadCount > 0 && prefs.badges && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-[10px] font-bold flex items-center justify-center px-1 shadow-lg shadow-emerald-500/30 notification-badge-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                <h2 className="text-base font-bold vl-text-heading">
                  {t(lang, 'notification.title')}
                </h2>
                {/* Unread count badge */}
                {unreadCount > 0 && (
                  <Badge className="badge-pop-in bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-emerald-500/30 text-[10px] h-5 px-1.5 font-semibold shadow-sm shadow-emerald-500/20">
                    {unreadCount}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                {/* Close button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 vl-text-muted hover:text-[var(--vl-text-white)] hover:bg-[var(--vl-bg-inner)]"
                  onClick={onClose}
                  aria-label={t(lang, 'common.close')}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>

            {/* ── Live Activity Feed ── */}
            <LiveActivityFeed notifications={notifications} lang={lang} />

            {/* ── Filter Tabs ── */}
            <div className="border-b border-[var(--vl-border)]">
              <FilterTabs
                activeFilter={activeFilter}
                onFilterChange={handleFilterChange}
                notifications={notifications}
                lang={lang}
              />
            </div>

            {/* ── Notification List ── */}
            <ScrollArea className="flex-1">
              {filteredNotifications.length === 0 ? (
                <EmptyState lang={lang} />
              ) : (
                <div className="p-2" role="list" aria-label="Notification list">
                  <AnimatePresence mode="popLayout">
                    {groupedNotifications.map(group => (
                      <CollapsibleGroup
                        key={group.label}
                        group={group}
                        lang={lang}
                        onMarkRead={onMarkRead}
                        onDelete={onDelete}
                        onMarkGroupRead={handleMarkGroupRead}
                        onDismissGroup={handleDismissGroup}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </ScrollArea>

            {/* ── Preferences Section ── */}
            <Separator className="bg-[var(--vl-border)]" />
            <PreferencesSection
              lang={lang}
              prefs={prefs}
              onPrefChange={updatePref}
              onMarkAllReadWithConfirm={handleMarkAllReadWithConfirm}
              unreadCount={unreadCount}
              achievements={achievements}
            />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

// ============================================================
// NotificationBellButton — compact bell for use in headers
// ============================================================

export function NotificationBellButton({
  unreadCount,
  onClick,
  lang,
}: NotificationBellButtonProps) {
  const [showBadges, setShowBadges] = useState(() => {
    if (typeof window === 'undefined') return true
    try {
      const stored = localStorage.getItem(PREFS_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return parsed.badges !== false
      }
    } catch { /* ignore */ }
    return true
  })

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-9 w-9 p-0 vl-text-muted hover:text-white hover:bg-[var(--vl-bg-card-hover)] relative magnetic-hover focus-ring-animated outline-none"
      onClick={onClick}
      aria-label={`${t(lang, 'a11y.notifications')}${unreadCount > 0 ? ` (${unreadCount} ${t(lang, 'notification.unreadCount').replace('{count}', '').trim()})` : ''}`}
    >
      <Bell className="size-4" />
      {unreadCount > 0 && showBadges && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-[10px] font-bold flex items-center justify-center px-1 shadow-lg shadow-emerald-500/30 badge-pop-in glass-badge notification-badge-pulse">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Button>
  )
}
