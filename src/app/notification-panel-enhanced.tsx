'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'
import {
  Bell, X, CheckCheck, Settings, MessageSquare, Bot, AlertCircle, Info,
  Trash2, Volume2, VolumeX, Trophy, GitBranch, ChevronDown, ChevronRight,
  Sparkles, Clock, ExternalLink, Filter, Search, Moon, BellOff, MoonIcon,
  Sun, Zap, SlidersHorizontal, Inbox, CheckCircle2, Eye, EyeOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetPortal, SheetOverlay, SheetClose } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import { getTimeAgo } from './shared-components'
import type { NotificationData } from './shared-types'
import { useNotificationSound } from './notification-sounds'

// ============================================================
// Types
// ============================================================

type NotificationFilter = 'all' | 'unread' | 'meeting' | 'agent' | 'system'
type NotifCategory = 'meeting' | 'agent' | 'system' | 'achievement' | 'pipeline'

interface NotificationPreferences {
  meetingEvents: boolean
  agentEvents: boolean
  systemAlerts: boolean
  achievementAlerts: boolean
  pipelineEvents: boolean
  sound: boolean
  badges: boolean
  quietHoursEnabled: boolean
  quietHoursStart: string
  quietHoursEnd: string
}

interface NotificationGroup {
  label: string
  labelKey: string
  items: NotificationData[]
}

interface EnhancedNotificationPanelProps {
  isOpen: boolean
  onClose: () => void
  notifications: NotificationData[]
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
  onDelete: (id: string) => void
  onClearAll?: () => void
  lang: Lang
}

interface EnhancedNotificationBellProps {
  unreadCount: number
  onClick: () => void
  lang: Lang
}

// ============================================================
// localStorage helpers
// ============================================================

const PREFS_KEY = 'vl-enhanced-notif-prefs'

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
      try { localStorage.setItem(key, JSON.stringify(nextValue)) } catch { /* ignore */ }
      return nextValue
    })
  }, [key])

  return [value, stabilizedSetValue]
}

// ============================================================
// Defaults
// ============================================================

const DEFAULT_PREFS: NotificationPreferences = {
  meetingEvents: true,
  agentEvents: true,
  systemAlerts: true,
  achievementAlerts: true,
  pipelineEvents: true,
  sound: true,
  badges: true,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
}

const FILTER_OPTIONS: { key: NotificationFilter; labelKey: string }[] = [
  { key: 'all', labelKey: 'notification.filter.all' },
  { key: 'unread', labelKey: 'notification.filter.unread' },
  { key: 'meeting', labelKey: 'notification.filter.meeting' },
  { key: 'agent', labelKey: 'notification.filter.agent' },
  { key: 'system', labelKey: 'notification.filter.system' },
]

// ============================================================
// Notification classification helpers
// ============================================================

function classifyNotification(type: string): NotifCategory {
  if (type === 'meeting_started' || type === 'meeting_completed' || type.startsWith('meeting')) return 'meeting'
  if (type === 'agent_created' || type === 'agent_updated' || type.startsWith('agent')) return 'agent'
  if (type === 'pipeline_stage_completed' || type.startsWith('pipeline')) return 'pipeline'
  if (type === 'achievement') return 'achievement'
  return 'system'
}

function getCategoryStyle(category: NotifCategory): {
  bg: string; text: string; border: string; icon: React.ElementType
} {
  switch (category) {
    case 'meeting':
      return { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', icon: MessageSquare }
    case 'agent':
      return { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30', icon: Bot }
    case 'system':
      return { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', icon: AlertCircle }
    case 'achievement':
      return { bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/30', icon: Trophy }
    case 'pipeline':
      return { bg: 'bg-violet-500/15', text: 'text-violet-400', border: 'border-violet-500/30', icon: GitBranch }
    default:
      return { bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/30', icon: Bell }
  }
}

function getFilterFromCategory(category: NotifCategory): NotificationFilter {
  switch (category) {
    case 'meeting': return 'meeting'
    case 'agent': return 'agent'
    case 'pipeline': return 'system'
    case 'achievement': return 'system'
    default: return 'system'
  }
}

// ============================================================
// Time grouping
// ============================================================

function groupNotificationsByTime(notifications: NotificationData[], lang: Lang): NotificationGroup[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const startOfWeek = new Date(today.getTime() - today.getDay() * 86400000)

  const groups: NotificationGroup[] = []

  const todayItems = notifications.filter(n => new Date(n.createdAt) >= today)
  const yesterdayItems = notifications.filter(n => { const d = new Date(n.createdAt); return d >= yesterday && d < today })
  const weekItems = notifications.filter(n => { const d = new Date(n.createdAt); return d >= startOfWeek && d < yesterday })
  const olderItems = notifications.filter(n => new Date(n.createdAt) < startOfWeek)

  if (todayItems.length > 0) groups.push({ label: 'Today', labelKey: 'notification.grouping.today', items: todayItems })
  if (yesterdayItems.length > 0) groups.push({ label: 'Yesterday', labelKey: 'notification.grouping.yesterday', items: yesterdayItems })
  if (weekItems.length > 0) groups.push({ label: 'This Week', labelKey: 'notification.grouping.earlierThisWeek', items: weekItems })
  if (olderItems.length > 0) groups.push({ label: 'Earlier', labelKey: 'notification.grouping.older', items: olderItems })

  return groups
}

// ============================================================
// Filter Tabs Component
// ============================================================

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
    const meeting = notifications.filter(n => classifyNotification(n.type) === 'meeting').length
    const agent = notifications.filter(n => classifyNotification(n.type) === 'agent').length
    const system = notifications.filter(n => {
      const cat = classifyNotification(n.type)
      return cat === 'system' || cat === 'achievement' || cat === 'pipeline'
    }).length
    return { all, unread, meeting, agent, system }
  }, [notifications])

  return (
    <div className="flex gap-1 px-4 py-2 overflow-x-auto" role="tablist" aria-label="Notification filters">
      {FILTER_OPTIONS.map(filter => {
        const count = counts[filter.key as keyof typeof counts] ?? 0
        const isActive = activeFilter === filter.key
        return (
          <button
            key={filter.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onFilterChange(filter.key)}
            className={`
              relative px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200
              focus:outline-none whitespace-nowrap
              ${isActive
                ? 'bg-emerald-500/20 text-emerald-400 shadow-sm'
                : 'vl-text-muted hover:text-[var(--vl-text-white)] hover:bg-[var(--vl-bg-inner)]'
              }
            `}
          >
            {t(lang, filter.labelKey)}
            {count > 0 && (
              <span className={`ml-1.5 text-[10px] ${isActive ? 'text-emerald-300' : 'vl-text-muted'}`}>
                {count}
              </span>
            )}
            {isActive && (
              <motion.div
                layoutId="enhanced-notif-filter-indicator"
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
// Search bar in notification panel
// ============================================================

function NotificationSearch({
  query,
  onQueryChange,
  lang,
}: {
  query: string
  onQueryChange: (q: string) => void
  lang: Lang
}) {
  return (
    <div className="px-4 py-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 vl-text-muted" />
        <Input
          placeholder={lang === 'zh' ? '搜索通知...' : 'Search notifications...'}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="h-8 pl-9 pr-8 text-xs vl-inner border-[var(--vl-border-subtle)] bg-[var(--vl-bg-inner)] focus:border-emerald-500/40 focus:ring-emerald-500/20 rounded-lg"
        />
        {query && (
          <button
            onClick={() => onQueryChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded vl-text-muted hover:text-[var(--vl-text-white)] transition-colors"
            aria-label="Clear search"
          >
            <X className="size-3" />
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Rich Notification Card
// ============================================================

function EnhancedNotificationCard({
  notification,
  onMarkRead,
  onDelete,
  lang,
  index,
}: {
  notification: NotificationData
  onMarkRead: (id: string) => void
  onDelete: (id: string) => void
  lang: Lang
  index: number
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const [swipeX, setSwipeX] = useState(0)
  const touchStartX = useRef(0)
  const category = classifyNotification(notification.type)
  const style = getCategoryStyle(category)
  const IconComp = style.icon
  const isLongDescription = notification.message.length > 120
  const timeAgoStr = getTimeAgo(notification.createdAt)

  const handleClick = useCallback(() => {
    if (!notification.read) {
      onMarkRead(notification.id)
    }
  }, [notification, onMarkRead])

  const handleDismiss = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExiting(true)
    setTimeout(() => onDelete(notification.id), 300)
  }, [notification.id, onDelete])

  // Swipe to dismiss on mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const diff = e.touches[0].clientX - touchStartX.current
    if (diff < 0) {
      setSwipeX(Math.max(diff, -100))
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (swipeX < -60) {
      setIsExiting(true)
      setTimeout(() => onDelete(notification.id), 300)
    }
    setSwipeX(0)
  }, [swipeX, notification.id, onDelete])

  // Action button based on notification type
  const actionButton = useMemo(() => {
    if (notification.link) {
      return (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => { e.stopPropagation(); window.open(notification.link, '_blank') }}
          className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors flex items-center gap-0.5"
        >
          <ExternalLink className="size-2.5" />
          {category === 'meeting' ? (lang === 'zh' ? '查看会议' : 'View Meeting') :
           category === 'agent' ? (lang === 'zh' ? '打开智能体' : 'Open Agent') :
           (lang === 'zh' ? '查看详情' : 'View Details')}
        </motion.button>
      )
    }
    return null
  }, [notification.link, category, lang])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1, x: swipeX }}
      exit={{ opacity: 0, x: 100, scale: 0.95, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 25,
        delay: index * 0.03,
      }}
      className={`
        group relative overflow-hidden cursor-pointer transition-all duration-200 rounded-xl
        ${isExiting ? 'pointer-events-none' : ''}
        ${!notification.read
          ? `bg-[var(--vl-bg-card)] border-l-[3px] ${style.border}`
          : 'bg-[var(--vl-bg-inner)] border-l-[3px] border-transparent hover:bg-[var(--vl-bg-card)]/60'
        }
      `}
      onClick={handleClick}
      role="listitem"
      aria-label={`${notification.title}: ${notification.message}`}
      aria-unread={!notification.read}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'pan-y' }}
    >
      <div className="flex items-start gap-3 p-3">
        {/* Type icon */}
        <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${style.bg}`}>
          <IconComp className={`size-4 ${style.text}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-xs font-semibold truncate ${!notification.read ? 'vl-text-heading' : 'vl-text-body'}`}>
              {notification.title}
            </p>
            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              className="shrink-0 w-5 h-5 rounded-md flex items-center justify-center
                opacity-0 group-hover:opacity-100 transition-all duration-200
                vl-text-muted hover:text-red-400 hover:bg-red-500/10"
              aria-label={lang === 'zh' ? '关闭' : 'Dismiss'}
            >
              <X className="size-3" />
            </button>
          </div>

          {/* Description with expand/collapse */}
          <p className={`text-xs vl-text-muted mt-0.5 transition-all duration-300 ${isLongDescription && !isExpanded ? 'line-clamp-2' : ''}`}>
            {notification.message}
          </p>

          {isLongDescription && (
            <button
              onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded) }}
              className="text-[10px] text-emerald-400/70 hover:text-emerald-400 mt-0.5 flex items-center gap-0.5 transition-colors"
            >
              {isExpanded ? (
                <><ChevronRight className="size-2.5" />{lang === 'zh' ? '收起' : 'Less'}</>
              ) : (
                <><ChevronDown className="size-2.5" />{lang === 'zh' ? '展开' : 'More'}</>
              )}
            </button>
          )}

          {/* Metadata row */}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] vl-text-muted flex items-center gap-0.5">
              <Clock className="size-2.5" />
              {timeAgoStr}
            </span>
            {actionButton}
          </div>
        </div>

        {/* Unread indicator */}
        {!notification.read && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"
          >
            <motion.span
              className="absolute inset-0 rounded-full bg-emerald-500"
              animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </motion.span>
        )}
      </div>

      {/* Swipe-to-dismiss background indicator */}
      {swipeX < -20 && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
          <Trash2 className="size-3.5 text-red-400" />
        </div>
      )}
    </motion.div>
  )
}

// ============================================================
// Collapsible Notification Group
// ============================================================

function CollapsibleNotificationGroup({
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
    <div className="mb-2">
      {/* Group header */}
      <div
        className="flex items-center justify-between px-3 py-1.5 cursor-pointer group/header hover:bg-[var(--vl-bg-inner)]/50 rounded-lg transition-colors"
        onClick={() => setCollapsed(prev => !prev)}
        role="button"
        aria-expanded={!collapsed}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setCollapsed(prev => !prev) }}
      >
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: collapsed ? 0 : 90 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="size-3 vl-text-muted" />
          </motion.div>
          <span className="text-xs font-semibold vl-text-heading">{group.label}</span>
          <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-semibold bg-[var(--vl-bg-card)] text-[var(--vl-text-muted)] border-0">
            {group.items.length}
          </Badge>
          {unreadCount > 0 && (
            <span className="flex items-center gap-1">
              <motion.span
                className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                animate={{ scale: [1, 1.4], opacity: [0.8, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <span className="text-[9px] text-emerald-400">{unreadCount} new</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover/header:opacity-100 transition-opacity">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkGroupRead}
              className="text-[9px] px-1.5 py-0.5 rounded hover:bg-emerald-500/10 hover:text-emerald-400 vl-text-muted transition-colors flex items-center gap-0.5"
              aria-label="Mark group as read"
            >
              <CheckCheck className="size-2.5" />
              {lang === 'zh' ? '全部已读' : 'Read all'}
            </button>
          )}
          <button
            onClick={handleDismissGroup}
            className="text-[9px] px-1.5 py-0.5 rounded hover:bg-red-500/10 hover:text-red-400 vl-text-muted transition-colors"
            aria-label="Dismiss group"
          >
            <Trash2 className="size-2.5" />
          </button>
        </div>
      </div>

      {/* Group items */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="space-y-1 mt-1 ml-1 overflow-hidden"
          >
            <AnimatePresence mode="popLayout">
              {group.items.map((notif, idx) => (
                <EnhancedNotificationCard
                  key={notif.id}
                  notification={notif}
                  onMarkRead={onMarkRead}
                  onDelete={onDelete}
                  lang={lang}
                  index={idx}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================
// Empty State — Different for each filter
// ============================================================

function EnhancedEmptyState({ filter, lang }: { filter: NotificationFilter; lang: Lang }) {
  const config = useMemo(() => {
    switch (filter) {
      case 'unread':
        return {
          icon: CheckCircle2,
          title: lang === 'zh' ? '全部已读!' : 'All caught up!',
          desc: lang === 'zh' ? '你没有未读通知' : 'You have no unread notifications',
          color: '#10b981',
        }
      case 'meeting':
        return {
          icon: MessageSquare,
          title: lang === 'zh' ? '暂无会议通知' : 'No meeting notifications',
          desc: lang === 'zh' ? '会议更新将在这里显示' : 'Meeting updates will appear here',
          color: '#10b981',
        }
      case 'agent':
        return {
          icon: Bot,
          title: lang === 'zh' ? '暂无智能体通知' : 'No agent notifications',
          desc: lang === 'zh' ? '智能体活动将在这里显示' : 'Agent activity will appear here',
          color: '#06b6d4',
        }
      case 'system':
        return {
          icon: AlertCircle,
          title: lang === 'zh' ? '暂无系统通知' : 'No system notifications',
          desc: lang === 'zh' ? '系统更新将在这里显示' : 'System updates will appear here',
          color: '#f59e0b',
        }
      default:
        return {
          icon: Bell,
          title: lang === 'zh' ? '暂无通知' : 'No notifications yet',
          desc: lang === 'zh' ? '你的通知将在这里显示' : 'Your notifications will appear here',
          color: '#10b981',
        }
    }
  }, [filter, lang])

  const IconComp = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="flex flex-col items-center justify-center py-16 px-6"
    >
      {/* Floating animated illustration */}
      <div className="relative mb-5">
        <motion.div
          className="w-16 h-16 rounded-2xl flex items-center justify-center relative"
          style={{ background: `linear-gradient(135deg, ${config.color}15, ${config.color}05)` }}
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="absolute inset-0 rounded-2xl blur-xl opacity-20" style={{ background: config.color }} />
          <IconComp className="size-7 relative z-10" style={{ color: config.color }} />
        </motion.div>
        {/* Orbiting dot */}
        <motion.div
          className="absolute w-2 h-2 rounded-full -top-1 -right-1"
          style={{ background: config.color, opacity: 0.5 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        />
      </div>
      <p className="vl-text-heading text-sm font-semibold mb-1">{config.title}</p>
      <p className="text-xs vl-text-muted text-center max-w-[200px]">{config.desc}</p>
    </motion.div>
  )
}

// ============================================================
// Quick Preferences Toggle Row
// ============================================================

function QuickPreferenceRow({
  label,
  icon,
  checked,
  onToggle,
}: {
  label: string
  icon: React.ReactNode
  checked: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs vl-text-body">{label}</span>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onToggle}
        className="data-[state=checked]:bg-emerald-500"
      />
    </div>
  )
}

// ============================================================
// Quiet Hours Setting
// ============================================================

function QuietHoursSetting({
  prefs,
  onPrefChange,
  lang,
}: {
  prefs: NotificationPreferences
  onPrefChange: (key: keyof NotificationPreferences, value: string | boolean) => void
  lang: Lang
}) {
  return (
    <div className="space-y-2 mt-3 pt-3 border-t border-[var(--vl-border-subtle)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MoonIcon className="size-3.5 text-indigo-400" />
          <span className="text-xs vl-text-heading">{lang === 'zh' ? '免打扰时段' : 'Quiet Hours'}</span>
        </div>
        <Switch
          checked={prefs.quietHoursEnabled}
          onCheckedChange={(v) => onPrefChange('quietHoursEnabled', v)}
          className="data-[state=checked]:bg-indigo-500"
        />
      </div>
      {prefs.quietHoursEnabled && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="flex items-center gap-2 pl-6"
        >
          <Input
            type="time"
            value={prefs.quietHoursStart}
            onChange={(e) => onPrefChange('quietHoursStart', e.target.value)}
            className="h-7 w-24 text-[10px] vl-inner border-[var(--vl-border-subtle)] rounded"
          />
          <span className="text-[10px] vl-text-muted">to</span>
          <Input
            type="time"
            value={prefs.quietHoursEnd}
            onChange={(e) => onPrefChange('quietHoursEnd', e.target.value)}
            className="h-7 w-24 text-[10px] vl-inner border-[var(--vl-border-subtle)] rounded"
          />
        </motion.div>
      )}
    </div>
  )
}

// ============================================================
// New Notification Pulse Animation (top of panel)
// ============================================================

function NewNotificationBanner({ count, lang }: { count: number; lang: Lang }) {
  if (count === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="mx-4 mb-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2"
    >
      <motion.div
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 0.6 }}
      >
        <Zap className="size-3.5 text-emerald-400" />
      </motion.div>
      <span className="text-xs text-emerald-400 font-medium">
        {count === 1
          ? (lang === 'zh' ? '1 条新通知' : '1 new notification')
          : (lang === 'zh' ? `${count} 条新通知` : `${count} new notifications`)
        }
      </span>
    </motion.div>
  )
}

// ============================================================
// Main Enhanced Notification Panel Component
// ============================================================

export function EnhancedNotificationPanel({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onMarkAllRead,
  onDelete,
  onClearAll,
  lang,
}: EnhancedNotificationPanelProps) {
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showConfirmClear, setShowConfirmClear] = useState(false)
  const [showConfirmMarkAll, setShowConfirmMarkAll] = useState(false)
  const [newNotificationCount, setNewNotificationCount] = useState(0)
  const [prefs, setPrefs] = useHydratedState<NotificationPreferences>(PREFS_KEY, DEFAULT_PREFS)
  const { play: playSound } = useNotificationSound()
  const prevCountRef = useRef(notifications.length)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Track new notification count
  useEffect(() => {
    if (notifications.length > prevCountRef.current) {
      const diff = notifications.length - prevCountRef.current
      setNewNotificationCount(diff)
      if (prefs.sound) playSound('info')
      // Clear new notification banner after 4s
      const timer = setTimeout(() => setNewNotificationCount(0), 4000)
      return () => clearTimeout(timer)
    }
    prevCountRef.current = notifications.length
  }, [notifications.length, prefs.sound, playSound])

  // Real-time polling
  useEffect(() => {
    if (isOpen) {
      pollIntervalRef.current = setInterval(() => {
        fetch('/api/notifications')
          .then(res => res.ok ? res.json() : null)
          .catch(() => null)
          // Results are used only to trigger re-check
      }, 30000)
      return () => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      }
    }
  }, [isOpen])

  // Keyboard escape
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Preference update helper
  const updatePref = useCallback((key: keyof NotificationPreferences, value: string | boolean) => {
    setPrefs(prev => ({ ...prev, [key]: value }))
  }, [setPrefs])

  const unreadCount = useMemo(
    () => notifications.filter(n => !n.read).length,
    [notifications]
  )

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    let result = notifications

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(n =>
        n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q)
      )
    }

    // Type filter
    switch (activeFilter) {
      case 'unread':
        result = result.filter(n => !n.read)
        break
      case 'meeting':
        result = result.filter(n => classifyNotification(n.type) === 'meeting')
        break
      case 'agent':
        result = result.filter(n => classifyNotification(n.type) === 'agent')
        break
      case 'system':
        result = result.filter(n => {
          const cat = classifyNotification(n.type)
          return cat === 'system' || cat === 'achievement' || cat === 'pipeline'
        })
        break
    }

    // Apply preference filters
    if (activeFilter === 'all' || activeFilter === 'unread') {
      result = result.filter(n => {
        const cat = classifyNotification(n.type)
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
  }, [notifications, activeFilter, searchQuery, prefs])

  // Group by time
  const groupedNotifications = useMemo(
    () => groupNotificationsByTime(filteredNotifications, lang),
    [filteredNotifications, lang]
  )

  // Handlers
  const handleMarkGroupRead = useCallback((ids: string[]) => {
    ids.forEach(id => onMarkRead(id))
  }, [onMarkRead])

  const handleDismissGroup = useCallback((ids: string[]) => {
    ids.forEach(id => onDelete(id))
  }, [onDelete])

  const handleClearAll = useCallback(() => {
    onClearAll?.()
    setShowConfirmClear(false)
  }, [onClearAll])

  const handleMarkAllRead = useCallback(() => {
    onMarkAllRead()
    setShowConfirmMarkAll(false)
  }, [onMarkAllRead])

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetPortal>
        <SheetOverlay className="bg-black/40 backdrop-blur-sm" />
        <SheetContent
          side="right"
          className="w-full sm:w-[420px] p-0 vl-card border-l border-[var(--vl-border)] bg-[var(--vl-bg-primary)] flex flex-col gap-0 overflow-hidden"
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--vl-border)]">
            <div className="flex items-center gap-3">
              <div className="relative">
                <motion.div
                  animate={newNotificationCount > 0 ? { rotate: [0, 15, -15, 0] } : {}}
                  transition={{ duration: 0.4 }}
                >
                  <Bell className="size-5 text-emerald-400" />
                </motion.div>
                {unreadCount > 0 && prefs.badges && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-[10px] font-bold flex items-center justify-center px-1 shadow-lg shadow-emerald-500/30"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </motion.span>
                )}
              </div>
              <div>
                <SheetTitle className="text-base font-bold vl-text-heading">
                  {t(lang, 'notification.title')}
                </SheetTitle>
                {unreadCount > 0 && (
                  <SheetDescription className="text-[10px] vl-text-muted">
                    {unreadCount} {lang === 'zh' ? '未读通知' : 'unread'}
                  </SheetDescription>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Mark all read */}
              {unreadCount > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[10px] text-emerald-400 hover:bg-emerald-500/10"
                        onClick={() => setShowConfirmMarkAll(true)}
                      >
                        <CheckCheck className="size-3.5 mr-1" />
                        {lang === 'zh' ? '全部已读' : 'Read All'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{lang === 'zh' ? '标记所有通知为已读' : 'Mark all as read'}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {/* Clear all */}
              {notifications.length > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[10px] vl-text-muted hover:text-red-400 hover:bg-red-500/10"
                        onClick={() => setShowConfirmClear(true)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{lang === 'zh' ? '清空所有通知' : 'Clear all'}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <SheetClose className="h-7 w-7 rounded-md flex items-center justify-center vl-text-muted hover:text-[var(--vl-text-white)] hover:bg-[var(--vl-bg-inner)] transition-colors" />
            </div>
          </div>

          {/* ── Confirmation dialogs (inline) ── */}
          <AnimatePresence>
            {showConfirmClear && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 flex items-center justify-between">
                  <span className="text-xs text-red-400">
                    {lang === 'zh' ? '确定清空所有通知吗？此操作不可撤销。' : 'Clear all notifications? This cannot be undone.'}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-[10px] text-red-400 hover:bg-red-500/20"
                      onClick={handleClearAll}
                    >
                      {lang === 'zh' ? '确定' : 'Confirm'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-[10px] vl-text-muted hover:bg-[var(--vl-bg-inner)]"
                      onClick={() => setShowConfirmClear(false)}
                    >
                      {lang === 'zh' ? '取消' : 'Cancel'}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
            {showConfirmMarkAll && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between">
                  <span className="text-xs text-emerald-400">
                    {lang === 'zh' ? '标记所有通知为已读？' : 'Mark all as read?'}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-[10px] text-emerald-400 hover:bg-emerald-500/20"
                      onClick={handleMarkAllRead}
                    >
                      {lang === 'zh' ? '确定' : 'Confirm'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-[10px] vl-text-muted hover:bg-[var(--vl-bg-inner)]"
                      onClick={() => setShowConfirmMarkAll(false)}
                    >
                      {lang === 'zh' ? '取消' : 'Cancel'}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Search ── */}
          <NotificationSearch query={searchQuery} onQueryChange={setSearchQuery} lang={lang} />

          {/* ── Filter Tabs ── */}
          <div className="border-b border-[var(--vl-border)]">
            <FilterTabs
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              notifications={notifications}
              lang={lang}
            />
          </div>

          {/* ── New notification banner ── */}
          <AnimatePresence>
            {newNotificationCount > 0 && (
              <NewNotificationBanner count={newNotificationCount} lang={lang} />
            )}
          </AnimatePresence>

          {/* ── Notification List ── */}
          <ScrollArea className="flex-1 max-h-[calc(100vh-380px)]">
            {filteredNotifications.length === 0 ? (
              <EnhancedEmptyState filter={activeFilter} lang={lang} />
            ) : (
              <div className="p-3 space-y-1" role="list" aria-label="Notification list">
                <AnimatePresence mode="popLayout">
                  {groupedNotifications.map(group => (
                    <CollapsibleNotificationGroup
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

          {/* ── Quick Preferences Footer ── */}
          <Separator className="bg-[var(--vl-border)]" />
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="size-3.5 vl-text-muted" />
                <span className="text-xs font-semibold vl-text-heading">
                  {lang === 'zh' ? '快捷设置' : 'Quick Settings'}
                </span>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="text-[10px] text-emerald-400/70 hover:text-emerald-400 flex items-center gap-0.5 transition-colors"
                      onClick={() => {/* Could navigate to settings tab */}}
                    >
                      <Settings className="size-2.5" />
                      {lang === 'zh' ? '更多设置' : 'More Settings'}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{lang === 'zh' ? '前往设置页面' : 'Open notification settings'}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="grid grid-cols-1 gap-1">
              <QuickPreferenceRow
                label={lang === 'zh' ? '会议通知' : 'Meeting Events'}
                icon={<MessageSquare className="size-3.5 text-emerald-400" />}
                checked={prefs.meetingEvents}
                onToggle={() => updatePref('meetingEvents', !prefs.meetingEvents)}
              />
              <QuickPreferenceRow
                label={lang === 'zh' ? '智能体通知' : 'Agent Events'}
                icon={<Bot className="size-3.5 text-cyan-400" />}
                checked={prefs.agentEvents}
                onToggle={() => updatePref('agentEvents', !prefs.agentEvents)}
              />
              <QuickPreferenceRow
                label={lang === 'zh' ? '系统通知' : 'System Alerts'}
                icon={<AlertCircle className="size-3.5 text-amber-400" />}
                checked={prefs.systemAlerts}
                onToggle={() => updatePref('systemAlerts', !prefs.systemAlerts)}
              />
              <div className="flex items-center gap-3">
                <QuickPreferenceRow
                  label={lang === 'zh' ? '声音' : 'Sound'}
                  icon={prefs.sound ? <Volume2 className="size-3.5 text-emerald-400" /> : <VolumeX className="size-3.5 vl-text-muted" />}
                  checked={prefs.sound}
                  onToggle={() => updatePref('sound', !prefs.sound)}
                />
              </div>
            </div>

            <QuietHoursSetting prefs={prefs} onPrefChange={updatePref} lang={lang} />
          </div>
        </SheetContent>
      </SheetPortal>
    </Sheet>
  )
}

// ============================================================
// Enhanced Notification Bell Button
// ============================================================

export function EnhancedNotificationBellButton({
  unreadCount,
  onClick,
  lang,
}: EnhancedNotificationBellProps) {
  const [dingTrigger, setDingTrigger] = useState(0)

  useEffect(() => {
    if (dingTrigger > 0) {
      const timer = setTimeout(() => setDingTrigger(0), 700)
      return () => clearTimeout(timer)
    }
  }, [dingTrigger])

  // Trigger ding when unread count increases
  const prevCountRef = useRef(unreadCount)
  useEffect(() => {
    if (unreadCount > prevCountRef.current) {
      setDingTrigger(prev => prev + 1)
    }
    prevCountRef.current = unreadCount
  }, [unreadCount])

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 vl-text-muted hover:text-white hover:bg-[var(--vl-bg-card-hover)] relative magnetic-hover btn-hover-lift"
            aria-label={t(lang, 'a11y.notifPanel')}
            onClick={onClick}
          >
            <motion.div
              animate={dingTrigger > 0 ? { rotate: [0, 15, -15, 0] } : {}}
              transition={{ duration: 0.4 }}
            >
              <Bell className="size-4" aria-hidden="true" />
            </motion.div>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                key={unreadCount}
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-[10px] font-bold flex items-center justify-center px-1 shadow-lg shadow-emerald-500/30"
                role="status"
                aria-live="polite"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
                <motion.span
                  className="absolute inset-0 rounded-full border border-emerald-400/50"
                  animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              </motion.span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t(lang, 'notification.title')}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
