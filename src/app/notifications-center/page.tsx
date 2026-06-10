'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import {
  Bell, BellOff, Search, X, Settings, Check, CheckCheck,
  Bookmark, BookmarkCheck, Eye, Trash2, ChevronRight,
  Clock, Users, Bot, FlaskConical, Monitor, AtSign, AlertTriangle,
  Volume2, VolumeX, Mail, Smartphone, MessageSquare,
  Sun, Moon, CheckCircle2, Star, Zap,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────

type NotificationType = 'meeting' | 'agent' | 'research' | 'system' | 'mention' | 'alert'

interface NotificationItem {
  id: string
  type: NotificationType
  title: string
  description: string
  timestamp: string
  isRead: boolean
  isBookmarked: boolean
  link?: string
  fullContent?: string
}

interface NotificationPreferences {
  typesEnabled: Record<NotificationType, boolean>
  quietHoursStart: number
  quietHoursEnd: number
  deliveryMethods: { inApp: boolean; email: boolean; sms: boolean }
  frequency: 'instant' | 'hourly' | 'daily'
  soundEnabled: boolean
  soundName: string
}

type FilterTab = 'all' | 'unread' | 'mentions' | 'system' | 'updates'

// ─── Type Config ────────────────────────────────────────────────

const TYPE_CONFIG: Record<NotificationType, { icon: React.ReactNode; avatarClass: string; accentClass: string; color: string; label: string }> = {
  meeting: { icon: <Users size={18} />, avatarClass: 'ne2-avatar--meeting', accentClass: 'ne2-accent--meeting', color: '#10b981', label: 'Meeting' },
  agent: { icon: <Bot size={18} />, avatarClass: 'ne2-avatar--agent', accentClass: 'ne2-accent--agent', color: '#06b6d4', label: 'Agent' },
  research: { icon: <FlaskConical size={18} />, avatarClass: 'ne2-avatar--research', accentClass: 'ne2-accent--research', color: '#8b5cf6', label: 'Research' },
  system: { icon: <Monitor size={18} />, avatarClass: 'ne2-avatar--system', accentClass: 'ne2-accent--system', color: '#6b7280', label: 'System' },
  mention: { icon: <AtSign size={18} />, avatarClass: 'ne2-avatar--mention', accentClass: 'ne2-accent--mention', color: '#f59e0b', label: 'Mention' },
  alert: { icon: <AlertTriangle size={18} />, avatarClass: 'ne2-avatar--alert', accentClass: 'ne2-accent--alert', color: '#ef4444', label: 'Alert' },
}

const SOUNDS = ['Gentle Chime', 'Soft Ping', 'Digital Beep', 'None']

// ─── Mock Data ──────────────────────────────────────────────────

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  // Just Now
  { id: 'n1', type: 'agent', title: 'Agent reached milestone', description: 'AlphaFold Agent completed 500 structure predictions this month.', timestamp: new Date(Date.now() - 60000).toISOString(), isRead: false, isBookmarked: false, link: '/agents', fullContent: 'The AlphaFold Agent has reached a significant milestone of 500 structure predictions in January 2025, surpassing the previous monthly record by 23%. Accuracy metrics remain above 92% pLDDT threshold.' },
  { id: 'n2', type: 'alert', title: 'Error in pipeline execution', description: 'Nanobody Design Pipeline failed at step "Quality Check" — Rosetta scoring timeout.', timestamp: new Date(Date.now() - 120000).toISOString(), isRead: false, isBookmarked: false, link: '/research-workflow', fullContent: 'The pipeline encountered a timeout error during the Rosetta InterfaceAnalyzer step. The scoring job exceeded the 45-minute limit. Consider increasing the timeout or optimizing the input structures.' },
  { id: 'n3', type: 'meeting', title: 'New meeting scheduled', description: 'Team standup scheduled for tomorrow at 10:00 AM with 5 participants.', timestamp: new Date(Date.now() - 180000).toISOString(), isRead: false, isBookmarked: false, link: '/collaboration-hub', fullContent: 'A new team standup meeting has been scheduled for January 21, 2025 at 10:00 AM. Participants: Dr. Sarah Chen, Dr. Wei Zhang, Dr. Lisa Wang, Dr. Michael Ross, Dr. Sophie Martin.' },

  // 5 minutes ago
  { id: 'n4', type: 'research', title: 'Paper cited', description: 'Your paper "Nanobody Design Optimization" was cited by a new publication on bioRxiv.', timestamp: new Date(Date.now() - 300000).toISOString(), isRead: false, isBookmarked: true, link: '/research-portfolio', fullContent: 'Your paper "Computational Design of Novel Nanobodies Targeting SARS-CoV-2 Spike Protein Variants" (Chen et al., 2024) has been cited by a new preprint on bioRxiv titled "Multi-epitope nanobody cocktails for broad coronavirus neutralization."' },
  { id: 'n5', type: 'system', title: 'Server maintenance', description: 'Scheduled maintenance window tonight from 2:00 AM to 4:00 AM UTC.', timestamp: new Date(Date.now() - 360000).toISOString(), isRead: false, isBookmarked: false, fullContent: 'Routine server maintenance is scheduled for tonight, January 20, from 2:00 AM to 4:00 AM UTC. All active workflows will be paused and resumed automatically. No data loss is expected.' },
  { id: 'n6', type: 'mention', title: 'You were mentioned in discussion', description: 'Dr. Wei Zhang mentioned you in the Protein Structure channel: "Great work on the AlphaFold integration!"', timestamp: new Date(Date.now() - 420000).toISOString(), isRead: false, isBookmarked: false, link: '/collaboration-hub', fullContent: 'Dr. Wei Zhang mentioned you in the #protein-structure channel: "Great work on the AlphaFold integration! The prediction accuracy has improved significantly since the last update."' },

  // 1 hour ago
  { id: 'n7', type: 'agent', title: 'New agent added', description: 'Review Agent v2.1 has been deployed with improved decision accuracy.', timestamp: new Date(Date.now() - 3600000).toISOString(), isRead: false, isBookmarked: false, link: '/agents', fullContent: 'Review Agent v2.1 has been successfully deployed to the production environment. Key improvements: 15% better decision accuracy on quality checks, support for multi-modal input review, and reduced false-positive rate by 40%.' },
  { id: 'n8', type: 'research', title: 'Experiment result available', description: 'CRISPR guide RNA optimization experiment #287 completed with 94% efficiency.', timestamp: new Date(Date.now() - 3900000).toISOString(), isRead: false, isBookmarked: true, link: '/virtual-lab', fullContent: 'Experiment #287 has completed. Results: 94% editing efficiency at the target locus, with a 2.1% off-target rate. The optimized guide RNA sequence outperformed the control by 31 percentage points.' },
  { id: 'n9', type: 'meeting', title: 'Team meeting completed', description: 'Weekly research sync ended. 3 action items assigned, 2 decisions made.', timestamp: new Date(Date.now() - 4200000).toISOString(), isRead: true, isBookmarked: false, link: '/collaboration-hub', fullContent: 'Weekly research sync meeting completed at 11:30 AM. Action items: (1) Dr. Chen to finalize nanobody candidates by Friday, (2) Dr. Zhang to submit AlphaFold benchmark results, (3) Dr. Wang to prepare ADMET screening proposal.' },

  // Today
  { id: 'n10', type: 'system', title: 'New version available', description: 'Virtual Lab v3.2.0 is available with performance improvements and new features.', timestamp: new Date(Date.now() - 14400000).toISOString(), isRead: true, isBookmarked: false, fullContent: 'Virtual Lab v3.2.0 is now available. Release highlights: 40% faster pipeline execution, new workflow visualization canvas, enhanced collaboration tools, and 12 bug fixes.' },
  { id: 'n11', type: 'research', title: 'Experiment result available', description: 'Gene expression atlas batch processing completed for 8 tissue types.', timestamp: new Date(Date.now() - 18000000).toISOString(), isRead: true, isBookmarked: false, link: '/virtual-lab', fullContent: 'Batch processing of gene expression data for 8 tissue types has completed successfully. All samples passed QC thresholds.' },
  { id: 'n12', type: 'agent', title: 'Agent reached milestone', description: 'Data Curator processed 10,000 dataset entries this quarter.', timestamp: new Date(Date.now() - 21600000).toISOString(), isRead: true, isBookmarked: false, link: '/agents', fullContent: 'The Data Curator agent has processed 10,000 dataset entries in Q4 2024, maintaining a 99.2% accuracy rate.' },
  { id: 'n13', type: 'alert', title: 'Error in pipeline execution', description: 'Literature Review workflow was cancelled due to API rate limits on Semantic Scholar.', timestamp: new Date(Date.now() - 25200000).toISOString(), isRead: true, isBookmarked: false, link: '/research-workflow', fullContent: 'The Literature Review pipeline was automatically cancelled after exceeding the Semantic Scholar API rate limit.' },
  { id: 'n14', type: 'meeting', title: 'New meeting scheduled', description: 'Project review with external collaborators on January 25 at 2:00 PM.', timestamp: new Date(Date.now() - 28800000).toISOString(), isRead: true, isBookmarked: false, link: '/collaboration-hub', fullContent: 'External project review meeting scheduled for January 25, 2025 at 2:00 PM UTC. External collaborators from Stanford and MIT will join.' },
  { id: 'n15', type: 'mention', title: 'You were mentioned in discussion', description: 'Dr. Sarah Chen mentioned you in the Nanobody channel: "Please review the binding affinity data."', timestamp: new Date(Date.now() - 32400000).toISOString(), isRead: true, isBookmarked: true, link: '/collaboration-hub', fullContent: 'Dr. Sarah Chen mentioned you in the #nanobody-design channel: "Please review the binding affinity data for candidates NB-042 through NB-050 when you get a chance."' },

  // Earlier
  { id: 'n16', type: 'system', title: 'Backup completed', description: 'Daily backup of all project data completed successfully. 2.4 GB backed up.', timestamp: new Date(Date.now() - 86400000).toISOString(), isRead: true, isBookmarked: false, fullContent: 'Daily backup completed at 3:00 AM UTC. 2.4 GB of project data backed up to encrypted cloud storage.' },
  { id: 'n17', type: 'research', title: 'Paper cited', description: 'Your CRISPR optimization paper received its 50th citation on Google Scholar.', timestamp: new Date(Date.now() - 90000000).toISOString(), isRead: true, isBookmarked: true, link: '/research-portfolio', fullContent: 'Your publication "Machine Learning-Guided Optimization of Guide RNA Design" has received its 50th citation on Google Scholar.' },
  { id: 'n18', type: 'agent', title: 'Agent performance update', description: 'Rosetta Scorer average job time reduced by 18% after latest optimization.', timestamp: new Date(Date.now() - 172800000).toISOString(), isRead: true, isBookmarked: false, link: '/agents', fullContent: 'Following the v2.4 update, the Rosetta Scorer agent has achieved an 18% reduction in average job time.' },
  { id: 'n19', type: 'meeting', title: 'Team meeting completed', description: 'Monthly department review ended. Budget approved for Q2 equipment purchases.', timestamp: new Date(Date.now() - 180000000).toISOString(), isRead: true, isBookmarked: false, link: '/collaboration-hub', fullContent: 'Monthly department review completed. Key outcomes: Q2 equipment budget of $180,000 approved.' },
  { id: 'n20', type: 'alert', title: 'High memory usage detected', description: 'Cluster Engine exceeded 90% memory threshold during batch processing job.', timestamp: new Date(Date.now() - 259200000).toISOString(), isRead: true, isBookmarked: false, fullContent: 'The Cluster Engine agent exceeded the 90% memory threshold during a large-scale clustering job.' },
  { id: 'n21', type: 'research', title: 'Experiment result available', description: 'Protein crystallization trial #15 yielded promising diffraction at 2.1Å resolution.', timestamp: new Date(Date.now() - 345600000).toISOString(), isRead: true, isBookmarked: false, link: '/virtual-lab', fullContent: 'Protein crystallization trial #15 yielded promising results. Initial diffraction data shows resolution of 2.1Å.' },
  { id: 'n22', type: 'system', title: 'Security update applied', description: 'SSL certificates renewed and security patches applied to all services.', timestamp: new Date(Date.now() - 432000000).toISOString(), isRead: true, isBookmarked: false, fullContent: 'Automated security maintenance completed: SSL certificates renewed, 3 critical patches applied.' },
  { id: 'n23', type: 'mention', title: 'You were mentioned in discussion', description: 'Dr. Lisa Wang mentioned you: "Can you check the ADMET predictions for lead compound LC-12?"', timestamp: new Date(Date.now() - 518400000).toISOString(), isRead: true, isBookmarked: false, link: '/collaboration-hub', fullContent: 'Dr. Lisa Wang mentioned you in the #drug-discovery channel regarding ADMET predictions for lead compound LC-12.' },
  { id: 'n24', type: 'meeting', title: 'New meeting scheduled', description: 'Grant writing workshop on February 3 at 1:00 PM in Conference Room B.', timestamp: new Date(Date.now() - 604800000).toISOString(), isRead: true, isBookmarked: true, link: '/collaboration-hub', fullContent: 'Grant writing workshop scheduled for February 3, 2025 at 1:00 PM in Conference Room B.' },
  { id: 'n25', type: 'system', title: 'Storage quota warning', description: 'Project storage usage at 85% (425 GB / 500 GB). Consider archiving old datasets.', timestamp: new Date(Date.now() - 691200000).toISOString(), isRead: true, isBookmarked: false, fullContent: 'Your project storage usage has reached 85% (425 GB of 500 GB). Consider archiving completed datasets.' },
  { id: 'n26', type: 'research', title: 'New dataset available', description: 'Updated PDB structural database with 15,000 new entries is ready for use.', timestamp: new Date(Date.now() - 777600000).toISOString(), isRead: true, isBookmarked: false, link: '/virtual-lab', fullContent: 'The PDB structural database has been updated with 15,000 new entries from the January 2025 release.' },
]

const INITIAL_PREFERENCES: NotificationPreferences = {
  typesEnabled: { meeting: true, agent: true, research: true, system: true, mention: true, alert: true },
  quietHoursStart: 22,
  quietHoursEnd: 7,
  deliveryMethods: { inApp: true, email: false, sms: false },
  frequency: 'instant',
  soundEnabled: true,
  soundName: 'Gentle Chime',
}

// ─── Helpers ─────────────────────────────────────────────────────

function getRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

function getTimeGroup(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return 'Just Now'
  if (mins < 60) return '5 minutes ago'
  if (mins < 120) return '1 hour ago'
  if (mins < 24 * 60) return 'Today'
  return 'Earlier'
}

function formatHour(h: number): string {
  const hr = h % 12 || 12
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${hr}:00 ${ampm}`
}

// ─── Main Component ──────────────────────────────────────────────

export default function NotificationsCenterPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS)
  const [preferences, setPreferences] = useState<NotificationPreferences>(INITIAL_PREFERENCES)
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [dismissAnimId, setDismissAnimId] = useState<string | null>(null)
  const [prefsOpen, setPrefsOpen] = useState(false)

  const stats = useMemo(() => ({
    unread: notifications.filter(n => !n.isRead).length,
    mentions: notifications.filter(n => n.type === 'mention' && !n.isRead).length,
    alerts: notifications.filter(n => n.type === 'alert' && !n.isRead).length,
  }), [notifications])

  const filteredNotifications = useMemo(() => {
    let result = notifications
    if (activeFilter === 'unread') result = result.filter(n => !n.isRead)
    else if (activeFilter === 'mentions') result = result.filter(n => n.type === 'mention')
    else if (activeFilter === 'system') result = result.filter(n => n.type === 'system' || n.type === 'alert')
    else if (activeFilter === 'updates') result = result.filter(n => n.type === 'agent' || n.type === 'research')
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(n =>
        n.title.toLowerCase().includes(q) || n.description.toLowerCase().includes(q)
      )
    }
    return result
  }, [notifications, activeFilter, searchQuery])

  const groupedNotifications = useMemo(() => {
    const groups: Record<string, NotificationItem[]> = {}
    filteredNotifications.forEach(n => {
      const group = getTimeGroup(n.timestamp)
      if (!groups[group]) groups[group] = []
      groups[group].push(n)
    })
    const order = ['Just Now', '5 minutes ago', '1 hour ago', 'Today', 'Earlier']
    return order.filter(g => groups[g]).map(g => ({ label: g, items: groups[g] }))
  }, [filteredNotifications])

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
  }, [])

  const toggleRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: !n.isRead } : n))
  }, [])

  const toggleBookmark = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isBookmarked: !n.isBookmarked } : n))
  }, [])

  const dismissNotification = useCallback((id: string) => {
    setDismissAnimId(id)
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
      setDismissAnimId(null)
      setExpandedId(prev => prev === id ? null : prev)
    }, 400)
  }, [])

  const togglePrefsType = useCallback((type: NotificationType) => {
    setPreferences(prev => ({
      ...prev,
      typesEnabled: { ...prev.typesEnabled, [type]: !prev.typesEnabled[type] },
    }))
  }, [])

  const toggleDelivery = useCallback((method: 'inApp' | 'email' | 'sms') => {
    setPreferences(prev => ({
      ...prev,
      deliveryMethods: { ...prev.deliveryMethods, [method]: !prev.deliveryMethods[method] },
    }))
  }, [])

  const isAllDismissed = filteredNotifications.length === 0 && notifications.length > 0

  return (
    <div style={{ minHeight: '100vh', background: 'var(--vl-bg-primary)', color: 'var(--vl-text-primary)' }}>
      {/* ─── Header ─── */}
      <header style={{
        padding: '28px 24px 20px',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(139, 92, 246, 0.04) 50%, rgba(245, 158, 11, 0.04) 100%)',
        borderBottom: '1px solid var(--vl-border)',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, #10b981, #f59e0b)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(16, 185, 129, 0.25)',
              position: 'relative',
            }}>
              <Bell size={22} color="#fff" />
              {stats.unread > 0 && (
                <div className="ne2-badge-pulse" style={{
                  position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, fontSize: 10,
                }}>
                  {stats.unread}
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{
                fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.5px',
                background: 'linear-gradient(135deg, var(--vl-text-primary), var(--vl-accent))',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>Notifications</h1>
              <p style={{ fontSize: 13, color: 'var(--vl-text-muted)', margin: '3px 0 0' }}>
                Stay updated with your research team and agents
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {stats.unread > 0 && (
                <button className="ne2-action-btn" onClick={markAllRead} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <CheckCheck size={14} /> Mark All Read
                </button>
              )}
              <button className="ne2-action-btn" onClick={() => setPrefsOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Settings size={14} /> Settings
              </button>
            </div>
          </div>

          {/* Stats + Search + Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div className="ne2-stats-row">
              {stats.unread > 0 && (
                <div className="ne2-stat-badge ne2-stat-badge--unread">
                  <Bell size={12} /> {stats.unread} unread
                </div>
              )}
              {stats.mentions > 0 && (
                <div className="ne2-stat-badge ne2-stat-badge--mentions">
                  <AtSign size={12} /> {stats.mentions} mentions
                </div>
              )}
              {stats.alerts > 0 && (
                <div className="ne2-stat-badge ne2-stat-badge--alerts">
                  <AlertTriangle size={12} /> {stats.alerts} alerts
                </div>
              )}
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              flex: 1, minWidth: 200, maxWidth: 360,
              padding: '7px 14px', borderRadius: 8,
              background: 'var(--vl-bg-card)', border: '1px solid var(--vl-border)',
            }}>
              <Search size={14} style={{ color: 'var(--vl-text-muted)', flexShrink: 0 }} />
              <input
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--vl-text-primary)' }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--vl-text-muted)', padding: 2 }}>
                  <X size={12} />
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {([
                { key: 'all' as FilterTab, label: 'All' },
                { key: 'unread' as FilterTab, label: 'Unread' },
                { key: 'mentions' as FilterTab, label: 'Mentions' },
                { key: 'system' as FilterTab, label: 'System' },
                { key: 'updates' as FilterTab, label: 'Updates' },
              ]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  className={`ne2-filter-tab ${activeFilter === tab.key ? 'ne2-filter-tab--active' : ''}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ─── Notification List ─── */}
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '20px 24px 80px' }}>
        {groupedNotifications.length > 0 ? (
          groupedNotifications.map(group => (
            <div key={group.label}>
              <div className="ne2-group-header">{group.label}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {group.items.map(notification => {
                  const cfg = TYPE_CONFIG[notification.type]
                  const isExpanded = expandedId === notification.id
                  const isDismissing = dismissAnimId === notification.id

                  return (
                    <div
                      key={notification.id}
                      className={`ne2-card ne2-animate-slide-in ${!notification.isRead ? 'ne2-card--unread' : ''} ${isExpanded ? 'ne2-card--expanded' : ''} ${isDismissing ? 'ne2-animate-dismiss' : ''}`}
                      onClick={() => {
                        if (!notification.isRead) toggleRead(notification.id)
                        setExpandedId(prev => prev === notification.id ? null : notification.id)
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                        {/* Unread dot */}
                        <div style={{ paddingTop: 12, flexShrink: 0 }}>
                          {!notification.isRead && <div className="ne2-unread-dot" />}
                        </div>
                        {/* Avatar */}
                        <div className={`ne2-avatar ${cfg.avatarClass}`}>
                          {cfg.icon}
                        </div>
                        {/* Body */}
                        <div className="ne2-body">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <h3 className="ne2-title" style={{ color: notification.isRead ? 'var(--vl-text-secondary)' : 'var(--vl-text-heading)' }}>
                              {notification.title}
                            </h3>
                            {notification.isBookmarked && (
                              <BookmarkCheck size={13} style={{ color: '#f59e0b', flexShrink: 0 }} />
                            )}
                          </div>
                          <p className={`ne2-desc ${isExpanded ? 'ne2-desc--expanded' : ''}`}>
                            {isExpanded && notification.fullContent ? notification.fullContent : notification.description}
                          </p>
                          <div className="ne2-timestamp">
                            <Clock size={11} />
                            {getRelativeTime(notification.timestamp)}
                            <span style={{ margin: '0 6px', opacity: 0.3 }}>·</span>
                            <span className={`ne2-accent--${notification.type}`} style={{ fontSize: 11, fontWeight: 500 }}>
                              {cfg.label}
                            </span>
                          </div>
                          {/* Expanded Actions */}
                          {isExpanded && (
                            <div className="ne2-actions" onClick={e => e.stopPropagation()}>
                              {notification.link && (
                                <button className="ne2-action-btn">
                                  <Eye size={12} /> View
                                </button>
                              )}
                              <button className="ne2-action-btn" onClick={() => toggleBookmark(notification.id)}>
                                {notification.isBookmarked ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}
                                {notification.isBookmarked ? 'Bookmarked' : 'Bookmark'}
                              </button>
                              <button className="ne2-action-btn" onClick={() => toggleRead(notification.id)}>
                                {notification.isRead ? <Bell size={12} /> : <Check size={12} />}
                                {notification.isRead ? 'Mark Unread' : 'Mark Read'}
                              </button>
                              <button className="ne2-action-btn ne2-action-btn--dismiss" onClick={() => dismissNotification(notification.id)}>
                                <Trash2 size={12} /> Dismiss
                              </button>
                            </div>
                          )}
                        </div>
                        {/* Quick actions on hover */}
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0, paddingTop: 4 }} onClick={e => e.stopPropagation()}>
                          {!isExpanded && (
                            <button onClick={() => dismissNotification(notification.id)} style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: 'var(--vl-text-muted)', padding: 4, opacity: 0.4,
                              transition: 'opacity 0.15s',
                            }} onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#ef4444' }}
                              onMouseLeave={e => { e.currentTarget.style.opacity = '0.4'; e.currentTarget.style.color = 'var(--vl-text-muted)' }}>
                              <Trash2 size={14} />
                            </button>
                          )}
                          <ChevronRight size={16} style={{
                            color: 'var(--vl-text-muted)', opacity: 0.4,
                            transform: isExpanded ? 'rotate(90deg)' : 'none',
                            transition: 'transform 0.2s ease',
                          }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        ) : notifications.length === 0 ? (
          /* ─── Empty State ─── */
          <div className="ne2-empty-state">
            <div className="ne2-empty-state__icon">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="ne2-empty-state__title">All caught up!</h2>
            <p className="ne2-empty-state__desc">
              You have no notifications. New notifications will appear here as they arrive.
            </p>
          </div>
        ) : (
          /* ─── Filter Empty State ─── */
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <BellOff size={48} style={{ marginBottom: 16, opacity: 0.2, color: 'var(--vl-text-muted)' }} />
            <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--vl-text-heading)', margin: '0 0 6px' }}>
              No matching notifications
            </p>
            <p style={{ fontSize: 13, color: 'var(--vl-text-muted)', margin: 0 }}>
              Try a different filter or search term
            </p>
          </div>
        )}
      </main>

      {/* ─── Preferences Overlay ─── */}
      {prefsOpen && (
        <div
          className={`ne2-overlay ${prefsOpen ? 'ne2-overlay--visible' : ''}`}
          onClick={() => setPrefsOpen(false)}
        />
      )}

      {/* ─── Preferences Panel ─── */}
      <div className={`ne2-prefs-panel ${prefsOpen ? 'ne2-prefs-panel--open' : ''}`}>
        <div className="ne2-prefs-panel__header">
          <h2 className="ne2-prefs-panel__title">
            <Settings size={18} style={{ marginRight: 8, verticalAlign: -3, color: 'var(--vl-accent)' }} />
            Notification Settings
          </h2>
          <button onClick={() => setPrefsOpen(false)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--vl-text-muted)', padding: 4,
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Notification Types */}
        <div className="ne2-prefs-section">
          <h3 className="ne2-prefs-section__title">Notification Types</h3>
          {(Object.keys(TYPE_CONFIG) as NotificationType[]).map(type => {
            const cfg = TYPE_CONFIG[type]
            return (
              <div key={type} className="ne2-prefs-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className={`ne2-avatar ${cfg.avatarClass}`} style={{ width: 30, height: 30, borderRadius: 8 }}>
                    {React.cloneElement(cfg.icon as React.ReactElement, { size: 14 })}
                  </div>
                  <span className="ne2-prefs-item__label">{cfg.label}</span>
                </div>
                <button
                  className={`ne2-prefs-toggle ${preferences.typesEnabled[type] ? 'ne2-prefs-toggle--on' : ''}`}
                  onClick={() => togglePrefsType(type)}
                >
                  <div className="ne2-prefs-toggle__knob" />
                </button>
              </div>
            )
          })}
        </div>

        {/* Quiet Hours */}
        <div className="ne2-prefs-section">
          <h3 className="ne2-prefs-section__title">Quiet Hours</h3>
          <div className="ne2-prefs-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="ne2-prefs-item__label" style={{ fontSize: 12 }}>Start</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--vl-text-heading)' }}>{formatHour(preferences.quietHoursStart)}</span>
            </div>
            <div style={{ position: 'relative', height: 6, borderRadius: 3, background: 'var(--vl-bg-secondary)', overflow: 'hidden' }}>
              <input
                type="range" min={0} max={24} value={preferences.quietHoursStart}
                onChange={e => setPreferences(prev => ({ ...prev, quietHoursStart: parseInt(e.target.value) }))}
                style={{
                  position: 'absolute', top: -6, left: 0, width: '100%', height: 18,
                  WebkitAppearance: 'none', appearance: 'none',
                  background: 'transparent', cursor: 'pointer', margin: 0,
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="ne2-prefs-item__label" style={{ fontSize: 12 }}>End</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--vl-text-heading)' }}>{formatHour(preferences.quietHoursEnd)}</span>
            </div>
            <div style={{ position: 'relative', height: 6, borderRadius: 3, background: 'var(--vl-bg-secondary)', overflow: 'hidden' }}>
              <input
                type="range" min={0} max={24} value={preferences.quietHoursEnd}
                onChange={e => setPreferences(prev => ({ ...prev, quietHoursEnd: parseInt(e.target.value) }))}
                style={{
                  position: 'absolute', top: -6, left: 0, width: '100%', height: 18,
                  WebkitAppearance: 'none', appearance: 'none',
                  background: 'transparent', cursor: 'pointer', margin: 0,
                }}
              />
            </div>
          </div>
        </div>

        {/* Delivery Methods */}
        <div className="ne2-prefs-section">
          <h3 className="ne2-prefs-section__title">Delivery Methods</h3>
          {([
            { key: 'inApp' as const, icon: <Monitor size={14} />, label: 'In-App Notifications' },
            { key: 'email' as const, icon: <Mail size={14} />, label: 'Email Digests' },
            { key: 'sms' as const, icon: <Smartphone size={14} />, label: 'SMS Alerts' },
          ]).map(item => (
            <div key={item.key} className="ne2-prefs-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: 'var(--vl-text-muted)' }}>{item.icon}</span>
                <span className="ne2-prefs-item__label">{item.label}</span>
              </div>
              <button
                className={`ne2-prefs-toggle ${preferences.deliveryMethods[item.key] ? 'ne2-prefs-toggle--on' : ''}`}
                onClick={() => toggleDelivery(item.key)}
              >
                <div className="ne2-prefs-toggle__knob" />
              </button>
            </div>
          ))}
        </div>

        {/* Sound */}
        <div className="ne2-prefs-section">
          <h3 className="ne2-prefs-section__title">Sound</h3>
          <div className="ne2-prefs-item">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: 'var(--vl-text-muted)' }}>{preferences.soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}</span>
              <span className="ne2-prefs-item__label">Sound Enabled</span>
            </div>
            <button
              className={`ne2-prefs-toggle ${preferences.soundEnabled ? 'ne2-prefs-toggle--on' : ''}`}
              onClick={() => setPreferences(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
            >
              <div className="ne2-prefs-toggle__knob" />
            </button>
          </div>
          {preferences.soundEnabled && (
            <div className="ne2-prefs-item" style={{ borderBottom: 'none' }}>
              <span className="ne2-prefs-item__label" style={{ fontSize: 12 }}>Sound</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {SOUNDS.map(snd => (
                  <button
                    key={snd}
                    onClick={() => setPreferences(prev => ({ ...prev, soundName: snd }))}
                    style={{
                      padding: '3px 10px', borderRadius: 6, border: '1px solid',
                      fontSize: 11, fontWeight: 500, cursor: 'pointer',
                      background: preferences.soundName === snd ? 'var(--vl-accent-bg)' : 'transparent',
                      borderColor: preferences.soundName === snd ? 'var(--vl-accent)' : 'var(--vl-border)',
                      color: preferences.soundName === snd ? 'var(--vl-accent)' : 'var(--vl-text-muted)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {snd}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Frequency */}
        <div className="ne2-prefs-section">
          <h3 className="ne2-prefs-section__title">Frequency</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            {([
              { key: 'instant' as const, icon: <Zap size={13} />, label: 'Instant' },
              { key: 'hourly' as const, icon: <Clock size={13} />, label: 'Hourly' },
              { key: 'daily' as const, icon: <Sun size={13} />, label: 'Daily' },
            ]).map(item => (
              <button
                key={item.key}
                onClick={() => setPreferences(prev => ({ ...prev, frequency: item.key }))}
                style={{
                  flex: 1, padding: '10px 8px', borderRadius: 8,
                  border: '1px solid', background: 'transparent', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  fontSize: 11, fontWeight: 500,
                  borderColor: preferences.frequency === item.key ? 'var(--vl-accent)' : 'var(--vl-border)',
                  color: preferences.frequency === item.key ? 'var(--vl-accent)' : 'var(--vl-text-muted)',
                  transition: 'all 0.15s ease',
                }}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
