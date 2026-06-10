'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Bell, BellOff, X, CheckCheck, Trash2, Search, Settings,
  MessageSquare, Bot, AlertCircle, Download, GitBranch, AtSign,
  Heart, Trophy, Clock, Volume2, VolumeX, Archive, ChevronRight,
  ChevronDown, Reply, ExternalLink, Filter, Moon, Mail, Globe,
  Shield, Info, Sparkles, Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

// ============================================================
// Types
// ============================================================

interface EnhancedNotification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  link: string | null
  createdAt: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  metadata?: Record<string, unknown>
}

interface NotificationPreferences {
  meeting: boolean
  agent: boolean
  system: boolean
  export: boolean
  pipeline: boolean
  mention: boolean
  reaction: boolean
  milestone: boolean
  delivery: 'in-app' | 'push' | 'email'
  quietHoursEnabled: boolean
  quietStart: string
  quietEnd: string
  priorityFilter: 'all' | 'high' | 'none'
  sound: Record<string, boolean>
}

interface NotificationGroup {
  label: string
  items: EnhancedNotification[]
}

type FilterTab = 'all' | 'unread' | 'mentions' | 'meetings' | 'system'

interface NotificationCenterEnhancedProps {
  lang?: Lang
}

// ============================================================
// Constants & Defaults
// ============================================================

const PREFS_KEY = 'vl-notification-enhanced-prefs'
const NOTIF_STORE_KEY = 'vl-notification-enhanced-store'

const FILTER_TABS: { key: FilterTab; label: string; labelZh: string }[] = [
  { key: 'all', label: 'All', labelZh: '全部' },
  { key: 'unread', label: 'Unread', labelZh: '未读' },
  { key: 'mentions', label: 'Mentions', labelZh: '提及' },
  { key: 'meetings', label: 'Meetings', labelZh: '会议' },
  { key: 'system', label: 'System', labelZh: '系统' },
]

const DEFAULT_PREFS: NotificationPreferences = {
  meeting: true, agent: true, system: true, export: true,
  pipeline: true, mention: true, reaction: true, milestone: true,
  delivery: 'in-app', quietHoursEnabled: false, quietStart: '22:00', quietEnd: '08:00',
  priorityFilter: 'all',
  sound: {
    meeting_completed: true, meeting_started: true, agent_message: true,
    system: true, export_ready: true, pipeline_update: true,
    mention: true, reaction: true, milestone: true,
  },
}

const SAMPLE_NOTIFICATIONS: EnhancedNotification[] = [
  {
    id: 'n-1', type: 'meeting_completed', title: 'Team Meeting Completed',
    message: 'Nanobody Design Review has completed with 24 messages across 6 rounds. Summary is available for review.',
    read: false, link: 'meeting-1', createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    priority: 'medium', metadata: { meetingId: 'meeting-1', participantCount: 4, roundCount: 6 },
  },
  {
    id: 'n-2', type: 'meeting_started', title: 'Individual Meeting Running',
    message: 'Molecular Analysis session with Dr. Chen has started. The discussion is expected to take 15 minutes.',
    read: false, link: 'meeting-2', createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    priority: 'low', metadata: { meetingId: 'meeting-2', agentName: 'Dr. Chen' },
  },
  {
    id: 'n-3', type: 'agent_message', title: 'New message from AlphaFold Agent',
    message: 'Generated 15 candidate structures with pLDDT scores above 90. Top candidates identified for wet-lab validation.',
    read: false, link: null, createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    priority: 'medium', metadata: { agentName: 'AlphaFold Agent', messageCount: 1 },
  },
  {
    id: 'n-4', type: 'mention', title: 'You were mentioned by Dr. Chen',
    message: '@researcher Please review the binding affinity data for candidate #3. The Kd values look promising.',
    read: false, link: null, createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    priority: 'high', metadata: { mentionedBy: 'Dr. Chen', context: 'binding affinity review' },
  },
  {
    id: 'n-5', type: 'export_ready', title: 'Export Ready',
    message: 'Your CSV export of meeting analytics covering the last 30 days is ready for download.',
    read: true, link: null, createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    priority: 'low', metadata: { format: 'csv', dateRange: '30 days' },
  },
  {
    id: 'n-6', type: 'pipeline_update', title: 'Pipeline Stage Completed',
    message: 'The "Analysis" stage of Research Pipeline has been completed. 3 tasks processed successfully.',
    read: false, link: null, createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    priority: 'medium', metadata: { pipelineName: 'Research Pipeline', stageName: 'Analysis', taskCount: 3 },
  },
  {
    id: 'n-7', type: 'reaction', title: 'New reaction on your message',
    message: 'Dr. Chen reacted with 💡 to your message about binding optimization strategies.',
    read: true, link: null, createdAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    priority: 'low', metadata: { emoji: '💡', from: 'Dr. Chen' },
  },
  {
    id: 'n-8', type: 'milestone', title: 'Research Milestone Reached! 🎉',
    message: 'Congratulations! You have completed 10 meetings in your research project. Keep up the great work!',
    read: false, link: null, createdAt: new Date(Date.now() - 1000 * 60 * 600).toISOString(),
    priority: 'high', metadata: { milestoneType: 'meeting_count', value: 10 },
  },
  {
    id: 'n-9', type: 'system', title: 'System Update Available',
    message: 'Virtual Lab has been updated with new visualization features and performance improvements.',
    read: true, link: null, createdAt: new Date(Date.now() - 1000 * 60 * 1200).toISOString(),
    priority: 'low', metadata: { version: '2.5.0' },
  },
  {
    id: 'n-10', type: 'meeting_completed', title: 'Individual Meeting Completed',
    message: 'Protein Stability Assessment with Scientific Critic completed in 4 rounds with 12 messages.',
    read: true, link: 'meeting-3', createdAt: new Date(Date.now() - 1000 * 60 * 2000).toISOString(),
    priority: 'medium', metadata: { meetingId: 'meeting-3', roundCount: 4 },
  },
  {
    id: 'n-11', type: 'agent_message', title: 'ML Engineer Report',
    message: 'Comprehensive analysis report prepared. Model accuracy improved by 12% compared to baseline.',
    read: false, link: null, createdAt: new Date(Date.now() - 1000 * 60 * 2400).toISOString(),
    priority: 'medium', metadata: { agentName: 'ML Engineer', improvement: '12%' },
  },
  {
    id: 'n-12', type: 'pipeline_update', title: 'Pipeline Stage Failed',
    message: 'The "Data Collection" stage encountered a timeout error. Manual review is required to proceed.',
    read: false, link: null, createdAt: new Date(Date.now() - 1000 * 60 * 3600).toISOString(),
    priority: 'urgent', metadata: { pipelineName: 'Research Pipeline', stageName: 'Data Collection', error: 'timeout' },
  },
]

// ============================================================
// Helpers
// ============================================================

function useHydratedState<T>(key: string, defaultValue: T): [T, (v: T | ((p: T) => T)) => void] {
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
      const next = typeof action === 'function' ? (action as (p: T) => T)(prev) : action
      try { localStorage.setItem(key, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }, [key])

  return [value, stabilizedSetValue]
}

function getTypeIcon(type: string) {
  if (type.startsWith('meeting')) return MessageSquare
  if (type === 'agent_message') return Bot
  if (type === 'system') return Settings
  if (type === 'export_ready') return Download
  if (type === 'pipeline_update') return GitBranch
  if (type === 'mention') return AtSign
  if (type === 'reaction') return Heart
  if (type === 'milestone') return Trophy
  return Bell
}

function getTypeColorClass(type: string): string {
  if (type === 'meeting_completed') return 'nc-type-meeting-completed'
  if (type === 'meeting_started') return 'nc-type-meeting-started'
  if (type === 'agent_message') return 'nc-type-agent-message'
  if (type === 'system') return 'nc-type-system'
  if (type === 'export_ready') return 'nc-type-export-ready'
  if (type === 'pipeline_update') return 'nc-type-pipeline-update'
  if (type === 'mention') return 'nc-type-mention'
  if (type === 'reaction') return 'nc-type-reaction'
  if (type === 'milestone') return 'nc-type-milestone'
  return 'nc-type-system'
}

function getIconWrapClass(type: string): string {
  if (type.startsWith('meeting')) return 'nc-icon-meeting'
  if (type === 'agent_message') return 'nc-icon-agent'
  if (type === 'system') return 'nc-icon-system'
  if (type === 'export_ready') return 'nc-icon-export'
  if (type === 'pipeline_update') return 'nc-icon-pipeline'
  if (type === 'mention') return 'nc-icon-mention'
  if (type === 'reaction') return 'nc-icon-reaction'
  if (type === 'milestone') return 'nc-icon-milestone'
  return 'nc-icon-system'
}

function getPriorityClass(priority: string): string {
  if (priority === 'low') return 'nc-priority-low'
  if (priority === 'medium') return 'nc-priority-medium'
  if (priority === 'high') return 'nc-priority-high'
  if (priority === 'urgent') return 'nc-priority-urgent'
  return 'nc-priority-low'
}

function getTypeBadgeClass(type: string): string {
  if (type.startsWith('meeting')) return 'nc-badge-meeting'
  if (type === 'agent_message') return 'nc-badge-agent'
  if (type === 'system') return 'nc-badge-system'
  if (type === 'export_ready') return 'nc-badge-export'
  if (type === 'pipeline_update') return 'nc-badge-pipeline'
  if (type === 'mention') return 'nc-badge-mention'
  if (type === 'reaction') return 'nc-badge-reaction'
  if (type === 'milestone') return 'nc-badge-milestone'
  return 'nc-badge-system'
}

function groupByTime(notifications: EnhancedNotification[], lang: Lang): NotificationGroup[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const startOfWeek = new Date(today.getTime() - today.getDay() * 86400000)

  const groups: NotificationGroup[] = []
  const todayItems = notifications.filter(n => new Date(n.createdAt) >= today)
  const yesterdayItems = notifications.filter(n => { const d = new Date(n.createdAt); return d >= yesterday && d < today })
  const weekItems = notifications.filter(n => { const d = new Date(n.createdAt); return d >= startOfWeek && d < yesterday })
  const older = notifications.filter(n => new Date(n.createdAt) < startOfWeek)

  const lbl = (en: string, zh: string) => lang === 'zh' ? zh : en
  if (todayItems.length) groups.push({ label: lbl('Today', '今天'), items: todayItems })
  if (yesterdayItems.length) groups.push({ label: lbl('Yesterday', '昨天'), items: yesterdayItems })
  if (weekItems.length) groups.push({ label: lbl('This Week', '本周'), items: weekItems })
  if (older.length) groups.push({ label: lbl('Older', '更早'), items: older })
  return groups
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

// ============================================================
// Notification Card with Swipe-to-Dismiss
// ============================================================

function NotificationCardEnhanced({
  notification,
  onMarkRead,
  onDelete,
  onClick,
  lang,
  index,
}: {
  notification: EnhancedNotification
  onMarkRead: (id: string) => void
  onDelete: (id: string) => void
  onClick: (n: EnhancedNotification) => void
  lang: Lang
  index: number
}) {
  const [isExiting, setIsExiting] = useState(false)
  const [swipeX, setSwipeX] = useState(0)
  const startX = useRef(0)
  const cardRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const diff = e.touches[0].clientX - startX.current
    if (diff < 0) {
      setSwipeX(Math.max(diff, -120))
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (swipeX < -80) {
      setIsExiting(true)
      setTimeout(() => onDelete(notification.id), 300)
    }
    setSwipeX(0)
  }, [swipeX, notification.id, onDelete])

  const handleClick = useCallback(() => {
    if (!notification.read) onMarkRead(notification.id)
    onClick(notification)
  }, [notification, onMarkRead, onClick])

  const handleDismiss = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExiting(true)
    setTimeout(() => onDelete(notification.id), 300)
  }, [notification.id, onDelete])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25, delay: index * 0.03 }}
      className={`nc-swipe-container ${isExiting ? 'nc-dismissed' : ''} ${swipeX < -10 ? 'nc-swiping' : ''}`}
    >
      <div className="nc-swipe-bg">
        <Trash2 className="nc-swipe-indicator" />
      </div>
      <div
        ref={cardRef}
        className={`nc-swipe-content nc-notification-card nc-card-animated ${getTypeColorClass(notification.type)} ${!notification.read ? 'nc-unread' : ''}`}
        style={{ transform: swipeX !== 0 ? `translateX(${swipeX}px)` : undefined }}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        role="listitem"
        aria-label={`${notification.title}: ${notification.message}`}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`nc-icon-wrap ${getIconWrapClass(notification.type)}`}>
            {React.createElement(getTypeIcon(notification.type), { className: 'size-4' })}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <p className={`text-xs font-semibold truncate ${!notification.read ? 'text-[var(--vl-text-white,#e2e8f0)]' : 'text-[var(--vl-text-body,#cbd5e1)]'}`}>
                  {notification.title}
                </p>
                <span className={`nc-type-badge ${getTypeBadgeClass(notification.type)}`}>
                  {notification.type.replace(/_/g, ' ')}
                </span>
              </div>
              <button
                onClick={handleDismiss}
                className="shrink-0 w-5 h-5 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-all text-[var(--vl-text-muted,#64748b)]"
                aria-label="Dismiss"
              >
                <X className="size-3" />
              </button>
            </div>
            <p className="text-xs text-[var(--vl-text-muted,#64748b)] mt-0.5 line-clamp-2">
              {notification.message}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[10px] text-[var(--vl-text-muted,#64748b)]">
                {formatTimeAgo(notification.createdAt)}
              </span>
              <span className={`nc-type-badge text-[9px] px-1.5 py-0.5 ${getPriorityClass(notification.priority)}`}>
                {notification.priority}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================
// Notification Detail Panel
// ============================================================

function NotificationDetailPanel({
  notification,
  onClose,
  onReply,
  lang,
}: {
  notification: EnhancedNotification | null
  onClose: () => void
  onReply: (id: string, text: string) => void
  lang: Lang
}) {
  const [replyText, setReplyText] = useState('')
  const canReply = notification.type === 'mention'

  const handleReplySend = useCallback(() => {
    if (replyText.trim()) {
      onReply(notification.id, replyText.trim())
      setReplyText('')
      toast.success('Reply sent')
    }
  }, [replyText, notification.id, onReply])

  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (notification) {
      document.body.style.overflow = 'hidden'
    }
    return () => { document.body.style.overflow = '' }
  }, [notification])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!notification) return null

  return (
    <div className="nc-detail-overlay" onClick={onClose}>
      <div
        ref={panelRef}
        className="nc-detail-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Notification detail"
      >
        {/* Header */}
        <div className="nc-detail-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`nc-icon-wrap ${getIconWrapClass(notification.type)}`}>
                {React.createElement(getTypeIcon(notification.type), { className: 'size-4' })}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--vl-text-white,#e2e8f0)]">{notification.title}</h3>
                <span className="text-[10px] text-[var(--vl-text-muted,#64748b)]">
                  {new Date(notification.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-[var(--vl-text-muted,#64748b)] hover:text-white" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className={`nc-type-badge ${getTypeBadgeClass(notification.type)}`}>
              {notification.type.replace(/_/g, ' ')}
            </span>
            <span className={`nc-type-badge ${getPriorityClass(notification.priority)}`}>
              {notification.priority}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="nc-detail-body">
          {/* Full message */}
          <div className="mb-6">
            <p className="text-sm text-[var(--vl-text-body,#cbd5e1)] leading-relaxed">{notification.message}</p>
          </div>

          {/* Related entity preview */}
          {notification.metadata && Object.keys(notification.metadata).length > 0 && (
            <div className="mb-6">
              <h4 className="text-xs font-semibold text-[var(--vl-text-muted,#64748b)] uppercase tracking-wider mb-3">
                {lang === 'zh' ? '相关信息' : 'Related Info'}
              </h4>
              <div className="nc-related-card">
                {Object.entries(notification.metadata).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between py-1.5">
                    <span className="text-xs text-[var(--vl-text-muted,#64748b)] capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                    <span className="text-xs text-[var(--vl-text-white,#e2e8f0)] font-medium">
                      {String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related action buttons */}
          <div className="mb-6">
            <h4 className="text-xs font-semibold text-[var(--vl-text-muted,#64748b)] uppercase tracking-wider mb-3">
              {lang === 'zh' ? '相关操作' : 'Actions'}
            </h4>
            <div className="flex flex-wrap gap-2">
              {notification.link && (
                <Button size="sm" className="h-8 text-xs gap-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25">
                  <ExternalLink className="size-3" />
                  {lang === 'zh' ? '查看会议' : 'View Meeting'}
                </Button>
              )}
              <Button size="sm" variant="ghost" className="h-8 text-xs gap-1.5 text-[var(--vl-text-muted,#64748b)] hover:text-white hover:bg-[var(--vl-bg-inner,rgba(255,255,255,0.04))]">
                <Archive className="size-3" />
                {lang === 'zh' ? '归档' : 'Archive'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs gap-1.5 text-red-400 hover:bg-red-500/10"
                onClick={() => { onClose(); toast.success('Notification dismissed') }}
              >
                <Trash2 className="size-3" />
                {lang === 'zh' ? '删除' : 'Delete'}
              </Button>
            </div>
          </div>

          {/* Quick reply for mentions */}
          {canReply && (
            <div>
              <h4 className="text-xs font-semibold text-[var(--vl-text-muted,#64748b)] uppercase tracking-wider mb-3">
                {lang === 'zh' ? '快速回复' : 'Quick Reply'}
              </h4>
              <div className="nc-quick-reply">
                <Reply className="size-4 text-[var(--vl-text-muted,#64748b)] shrink-0" />
                <input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={lang === 'zh' ? '输入回复...' : 'Type a reply...'}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleReplySend() }}
                  className="text-sm"
                />
                <Button
                  size="sm"
                  className="h-7 px-3 text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 shrink-0"
                  onClick={handleReplySend}
                  disabled={!replyText.trim()}
                >
                  {lang === 'zh' ? '发送' : 'Send'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Preferences Panel
// ============================================================

function NotificationPreferencesPanel({
  prefs,
  onPrefChange,
  unreadCount,
  onMarkAllRead,
  lang,
}: {
  prefs: NotificationPreferences
  onPrefChange: (key: keyof NotificationPreferences, value: unknown) => void
  unreadCount: number
  onMarkAllRead: () => void
  lang: Lang
}) {
  const [prefTab, setPrefTab] = useState<'types' | 'delivery' | 'advanced'>('types')

  const typeToggles = [
    { key: 'meeting' as const, label: lang === 'zh' ? '会议事件' : 'Meeting Events', icon: <MessageSquare className="size-3.5 text-emerald-400" /> },
    { key: 'agent' as const, label: lang === 'zh' ? '智能体消息' : 'Agent Messages', icon: <Bot className="size-3.5 text-cyan-400" /> },
    { key: 'system' as const, label: lang === 'zh' ? '系统通知' : 'System Alerts', icon: <AlertCircle className="size-3.5 text-slate-400" /> },
    { key: 'export' as const, label: lang === 'zh' ? '导出就绪' : 'Export Ready', icon: <Download className="size-3.5 text-amber-400" /> },
    { key: 'pipeline' as const, label: lang === 'zh' ? '流水线更新' : 'Pipeline Updates', icon: <GitBranch className="size-3.5 text-pink-400" /> },
    { key: 'mention' as const, label: lang === 'zh' ? '提及通知' : 'Mentions', icon: <AtSign className="size-3.5 text-blue-400" /> },
    { key: 'reaction' as const, label: lang === 'zh' ? '回应' : 'Reactions', icon: <Heart className="size-3.5 text-purple-400" /> },
    { key: 'milestone' as const, label: lang === 'zh' ? '里程碑' : 'Milestones', icon: <Trophy className="size-3.5 text-orange-400" /> },
  ]

  return (
    <div className="nc-prefs-section">
      {/* Mark All Read */}
      {unreadCount > 0 && (
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-emerald-400 hover:text-emerald-300 h-8 hover:bg-emerald-500/10"
            onClick={onMarkAllRead}
          >
            <CheckCheck className="size-3.5 mr-1.5" />
            {lang === 'zh' ? `全部标为已读 (${unreadCount})` : `Mark All Read (${unreadCount})`}
          </Button>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        <Settings className="size-4 text-[var(--vl-text-muted,#64748b)]" />
        <span className="text-xs font-semibold text-[var(--vl-text-white,#e2e8f0)]">
          {lang === 'zh' ? '通知设置' : 'Notification Preferences'}
        </span>
      </div>

      {/* Preference Tabs */}
      <div className="nc-pref-tabs">
        {[
          { key: 'types' as const, label: lang === 'zh' ? '类型' : 'Types' },
          { key: 'delivery' as const, label: lang === 'zh' ? '送达' : 'Delivery' },
          { key: 'advanced' as const, label: lang === 'zh' ? '高级' : 'Advanced' },
        ].map(tab => (
          <button
            key={tab.key}
            className={`nc-pref-tab ${prefTab === tab.key ? 'nc-active' : ''}`}
            onClick={() => setPrefTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Types Tab */}
      {prefTab === 'types' && (
        <div className="space-y-1">
          {typeToggles.map(item => (
            <div key={item.key} className="nc-pref-row">
              <div className="nc-pref-label">
                {item.icon}
                <span className="nc-pref-title text-xs">{item.label}</span>
              </div>
              <Switch
                checked={prefs[item.key] as boolean}
                onCheckedChange={(checked) => onPrefChange(item.key, checked)}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>
          ))}
        </div>
      )}

      {/* Delivery Tab */}
      {prefTab === 'delivery' && (
        <div className="space-y-3">
          <div className="nc-pref-row">
            <div className="nc-pref-label">
              <Globe className="size-3.5 text-emerald-400" />
              <div className="nc-pref-info">
                <span className="nc-pref-title text-xs">{lang === 'zh' ? '应用内通知' : 'In-App'}</span>
                <span className="nc-pref-desc text-[10px]">{lang === 'zh' ? '显示在通知面板中' : 'Show in notification panel'}</span>
              </div>
            </div>
            <Switch checked={prefs.delivery === 'in-app'} onCheckedChange={() => onPrefChange('delivery', 'in-app')} className="data-[state=checked]:bg-emerald-500" />
          </div>
          <div className="nc-pref-row">
            <div className="nc-pref-label">
              <Bell className="size-3.5 text-cyan-400" />
              <div className="nc-pref-info">
                <span className="nc-pref-title text-xs">{lang === 'zh' ? '浏览器推送 (模拟)' : 'Browser Push (simulated)'}</span>
                <span className="nc-pref-desc text-[10px]">{lang === 'zh' ? '模拟推送通知' : 'Simulated push notifications'}</span>
              </div>
            </div>
            <Switch checked={prefs.delivery === 'push'} onCheckedChange={() => onPrefChange('delivery', 'push')} className="data-[state=checked]:bg-emerald-500" />
          </div>
          <div className="nc-pref-row">
            <div className="nc-pref-label">
              <Mail className="size-3.5 text-amber-400" />
              <div className="nc-pref-info">
                <span className="nc-pref-title text-xs">{lang === 'zh' ? '邮件通知 (模拟)' : 'Email (simulated)'}</span>
                <span className="nc-pref-desc text-[10px]">{lang === 'zh' ? '模拟邮件通知' : 'Simulated email notifications'}</span>
              </div>
            </div>
            <Switch checked={prefs.delivery === 'email'} onCheckedChange={() => onPrefChange('delivery', 'email')} className="data-[state=checked]:bg-emerald-500" />
          </div>
        </div>
      )}

      {/* Advanced Tab */}
      {prefTab === 'advanced' && (
        <div className="space-y-4">
          {/* Quiet Hours */}
          <div>
            <div className="nc-pref-row">
              <div className="nc-pref-label">
                <Moon className="size-3.5 text-indigo-400" />
                <div className="nc-pref-info">
                  <span className="nc-pref-title text-xs">{lang === 'zh' ? '静音时段' : 'Quiet Hours'}</span>
                  <span className="nc-pref-desc text-[10px]">{lang === 'zh' ? '在指定时间内静音通知' : 'Silence notifications during set hours'}</span>
                </div>
              </div>
              <Switch
                checked={prefs.quietHoursEnabled}
                onCheckedChange={(checked) => onPrefChange('quietHoursEnabled', checked)}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>
            {prefs.quietHoursEnabled && (
              <div className="nc-quiet-hours mt-2">
                <Clock className="size-3.5 text-[var(--vl-text-muted,#64748b)] shrink-0" />
                <input
                  type="time"
                  value={prefs.quietStart}
                  onChange={(e) => onPrefChange('quietStart', e.target.value)}
                  className="nc-time-input"
                />
                <span className="text-xs text-[var(--vl-text-muted,#64748b)]">—</span>
                <input
                  type="time"
                  value={prefs.quietEnd}
                  onChange={(e) => onPrefChange('quietEnd', e.target.value)}
                  className="nc-time-input"
                />
              </div>
            )}
          </div>

          {/* Priority Filter */}
          <div>
            <p className="text-[10px] font-semibold text-[var(--vl-text-muted,#64748b)] uppercase tracking-wider mb-2">
              {lang === 'zh' ? '优先级过滤' : 'Priority Filter'}
            </p>
            <div className="nc-priority-filter">
              {[
                { key: 'all' as const, label: lang === 'zh' ? '全部' : 'All' },
                { key: 'high' as const, label: lang === 'zh' ? '仅高优先' : 'High+' },
                { key: 'none' as const, label: lang === 'zh' ? '关闭' : 'Off' },
              ].map(opt => (
                <button
                  key={opt.key}
                  className={`nc-priority-option ${prefs.priorityFilter === opt.key ? 'nc-active' : ''}`}
                  onClick={() => onPrefChange('priorityFilter', opt.key)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sound toggles per type */}
          <div>
            <p className="text-[10px] font-semibold text-[var(--vl-text-muted,#64748b)] uppercase tracking-wider mb-2">
              {lang === 'zh' ? '声音设置' : 'Sound Settings'}
            </p>
            <div className="space-y-1">
              {typeToggles.slice(0, 5).map(item => {
                const soundKey = item.key === 'meeting' ? 'meeting_completed' : `${item.key === 'agent' ? 'agent_message' : item.key}_update`
                return (
                  <div key={item.key} className="nc-pref-row">
                    <span className="text-xs text-[var(--vl-text-body,#cbd5e1)]">{item.label}</span>
                    <div className="nc-sound-indicator">
                      <Switch
                        checked={prefs.sound[soundKey] ?? true}
                        onCheckedChange={(checked) => {
                          const newSound = { ...prefs.sound, [soundKey]: checked }
                          onPrefChange('sound', newSound)
                        }}
                        className="data-[state=checked]:bg-emerald-500 scale-90"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Empty State
// ============================================================

function EmptyStateIllustration({ lang }: { lang: Lang }) {
  return (
    <div className="nc-empty-state">
      <div className="nc-empty-icon">
        <Bell className="size-7 text-emerald-400" />
      </div>
      <h3 className="text-sm font-semibold text-[var(--vl-text-white,#e2e8f0)] mb-1">
        {lang === 'zh' ? '没有通知' : 'No notifications'}
      </h3>
      <p className="text-xs text-[var(--vl-text-muted,#64748b)] max-w-[220px]">
        {lang === 'zh'
          ? '会议完成、智能体消息和系统更新将在这里显示'
          : 'Meeting completions, agent messages, and system updates will appear here'}
      </p>
    </div>
  )
}

// ============================================================
// Collapsible Group
// ============================================================

function NotificationGroup({
  group,
  onMarkRead,
  onDelete,
  onClick,
  lang,
}: {
  group: NotificationGroup
  onMarkRead: (id: string) => void
  onDelete: (id: string) => void
  onClick: (n: EnhancedNotification) => void
  lang: Lang
}) {
  const [collapsed, setCollapsed] = useState(false)
  const unreadCount = group.items.filter(n => !n.read).length

  return (
    <div className="mb-2">
      <button
        className="nc-group-header w-full"
        onClick={() => setCollapsed(p => !p)}
        aria-expanded={!collapsed}
      >
        <div className="flex items-center gap-2">
          {collapsed ? <ChevronRight className="size-3" /> : <ChevronDown className="size-3" />}
          <span>{group.label}</span>
          <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-semibold bg-[var(--vl-bg-inner,rgba(255,255,255,0.04))] text-[var(--vl-text-muted,#64748b)]">
            {group.items.length}
          </Badge>
          {unreadCount > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          )}
        </div>
        <div className="flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
          {unreadCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                group.items.filter(n => !n.read).forEach(n => onMarkRead(n.id))
              }}
              className="text-[9px] px-1.5 py-0.5 rounded hover:bg-emerald-500/10 hover:text-emerald-400 text-[var(--vl-text-muted,#64748b)] transition-colors"
            >
              <CheckCheck className="size-2.5 inline mr-0.5" />
              {lang === 'zh' ? '全部已读' : 'Mark read'}
            </button>
          )}
        </div>
      </button>
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
              <NotificationCardEnhanced
                key={notif.id}
                notification={notif}
                onMarkRead={onMarkRead}
                onDelete={onDelete}
                onClick={onClick}
                lang={lang}
                index={idx}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================
// Main Component: NotificationCenterEnhanced
// ============================================================

export function NotificationCenterEnhanced({ lang = 'en' }: NotificationCenterEnhancedProps) {
  const [notifications, setNotifications] = useHydratedState<EnhancedNotification[]>(NOTIF_STORE_KEY, SAMPLE_NOTIFICATIONS)
  const [prefs, setPrefs] = useHydratedState<NotificationPreferences>(PREFS_KEY, DEFAULT_PREFS)
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedNotif, setSelectedNotif] = useState<EnhancedNotification | null>(null)
  const [showPrefs, setShowPrefs] = useState(false)
  const [activeGroup, setActiveGroup] = useState<'inbox' | 'prefs'>('inbox')

  const handleMarkRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }, [setNotifications])

  const handleMarkAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    toast.success(lang === 'zh' ? '所有通知已标为已读' : 'All notifications marked as read')
  }, [setNotifications, lang])

  const handleDelete = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [setNotifications])

  const handleDeleteAll = useCallback(() => {
    setNotifications([])
    toast.success(lang === 'zh' ? '所有通知已删除' : 'All notifications deleted')
  }, [setNotifications, lang])

  const handleArchiveAll = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    toast.success(lang === 'zh' ? '所有通知已归档' : 'All notifications archived')
  }, [setNotifications, lang])

  const handleReply = useCallback((id: string, text: string) => {
    toast.success(lang === 'zh' ? '回复已发送' : `Reply sent: ${text}`)
  }, [lang])

  const handlePrefChange = useCallback((key: keyof NotificationPreferences, value: unknown) => {
    setPrefs(prev => ({ ...prev, [key]: value }))
  }, [setPrefs])

  // Filtering
  const filteredNotifications = useMemo(() => {
    let result = notifications

    // Priority filter
    if (prefs.priorityFilter === 'high') {
      result = result.filter(n => n.priority === 'high' || n.priority === 'urgent')
    } else if (prefs.priorityFilter === 'none') {
      return []
    }

    // Filter tab
    switch (activeFilter) {
      case 'unread':
        result = result.filter(n => !n.read)
        break
      case 'mentions':
        result = result.filter(n => n.type === 'mention')
        break
      case 'meetings':
        result = result.filter(n => n.type.startsWith('meeting'))
        break
      case 'system':
        result = result.filter(n => n.type === 'system' || n.type === 'export_ready' || n.type === 'pipeline_update')
        break
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        n.type.toLowerCase().includes(q)
      )
    }

    // Type preference filter
    result = result.filter(n => {
      if (n.type.startsWith('meeting')) return prefs.meeting
      if (n.type === 'agent_message') return prefs.agent
      if (n.type === 'system') return prefs.system
      if (n.type === 'export_ready') return prefs.export
      if (n.type === 'pipeline_update') return prefs.pipeline
      if (n.type === 'mention') return prefs.mention
      if (n.type === 'reaction') return prefs.reaction
      if (n.type === 'milestone') return prefs.milestone
      return true
    })

    return result
  }, [notifications, activeFilter, searchQuery, prefs])

  const groupedNotifications = useMemo(
    () => groupByTime(filteredNotifications, lang),
    [filteredNotifications, lang]
  )

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications])

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="nc-center">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--vl-border,rgba(255,255,255,0.08))]">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Bell className="size-5 text-emerald-400" />
              {unreadCount > 0 && (
                <span className="nc-count-badge absolute -top-2 -right-2">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <h2 className="text-base font-bold text-[var(--vl-text-white,#e2e8f0)]">
              {lang === 'zh' ? '通知中心' : 'Notification Center'}
            </h2>
            {unreadCount > 0 && (
              <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] h-5 px-1.5">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 w-7 p-0 ${showPrefs ? 'text-emerald-400' : 'text-[var(--vl-text-muted,#64748b)]'} hover:text-emerald-400`}
              onClick={() => setShowPrefs(p => !p)}
              aria-label="Settings"
            >
              <Settings className="size-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="nc-search">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[var(--vl-text-muted,#64748b)]" />
            <input
              type="text"
              className="nc-search-input"
              placeholder={lang === 'zh' ? '搜索通知...' : 'Search notifications...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search notifications"
            />
            {searchQuery && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--vl-text-muted,#64748b)] hover:text-white"
                onClick={() => setSearchQuery('')}
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        </div>

        {/* Bulk Actions */}
        <div className="nc-bulk-actions">
          <button className="nc-bulk-btn" onClick={handleMarkAllRead}>
            <CheckCheck className="size-3" />
            {lang === 'zh' ? '全部已读' : 'Mark All Read'}
          </button>
          <button className="nc-bulk-btn" onClick={handleArchiveAll}>
            <Archive className="size-3" />
            {lang === 'zh' ? '归档全部' : 'Archive'}
          </button>
          <button className="nc-bulk-btn nc-danger" onClick={handleDeleteAll}>
            <Trash2 className="size-3" />
            {lang === 'zh' ? '删除全部' : 'Delete All'}
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="nc-filter-tabs" role="tablist" aria-label="Notification filters">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeFilter === tab.key}
              className={`nc-filter-tab ${activeFilter === tab.key ? 'nc-active' : ''}`}
              onClick={() => setActiveFilter(tab.key)}
            >
              {lang === 'zh' ? tab.labelZh : tab.label}
            </button>
          ))}
        </div>

        {/* Content area: list or preferences */}
        <div className="flex-1 flex flex-col min-h-0">
          <AnimatePresence mode="wait">
            {!showPrefs ? (
              <motion.div
                key="inbox"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1"
              >
                <ScrollArea className="nc-scroll-list" style={{ maxHeight: '55vh' }}>
                  {filteredNotifications.length === 0 ? (
                    <EmptyStateIllustration lang={lang} />
                  ) : (
                    <AnimatePresence>
                      {groupedNotifications.map(group => (
                        <NotificationGroup
                          key={group.label}
                          group={group}
                          onMarkRead={handleMarkRead}
                          onDelete={handleDelete}
                          onClick={(n) => setSelectedNotif(n)}
                          lang={lang}
                        />
                      ))}
                    </AnimatePresence>
                  )}
                </ScrollArea>
              </motion.div>
            ) : (
              <motion.div
                key="prefs"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <ScrollArea className="nc-scroll-list" style={{ maxHeight: '55vh' }}>
                  <NotificationPreferencesPanel
                    prefs={prefs}
                    onPrefChange={handlePrefChange}
                    unreadCount={unreadCount}
                    onMarkAllRead={handleMarkAllRead}
                    lang={lang}
                  />
                </ScrollArea>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Detail Panel */}
      <AnimatePresence>
        {selectedNotif && (
          <NotificationDetailPanel
            notification={selectedNotif}
            onClose={() => setSelectedNotif(null)}
            onReply={handleReply}
            lang={lang}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
