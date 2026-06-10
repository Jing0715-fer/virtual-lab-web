'use client'

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import {
  Users, UserPlus, Search, Filter, Settings as SettingsIcon,
  Mail, Clock, Globe, MessageSquare, Video, Microscope,
  Star, Edit3, X, Check, ChevronRight, ChevronDown,
  Shield, Bell, BellOff, Eye, EyeOff, Lock,
  Calendar, Award, TrendingUp, Zap, Activity,
  BookOpen, FlaskConical, Send, GripVertical,
  UserCheck, UserX, Trash2, Plus, Minus, Save,
} from 'lucide-react'
import type { Lang } from '@/lib/i18n'

// ============================================================
// Types
// ============================================================

type MemberStatus = 'online' | 'busy' | 'offline' | 'away'
type Proficiency = 'beginner' | 'intermediate' | 'expert'
type TeamVisibility = 'public' | 'internal' | 'private'
type TabId = 'members' | 'roles' | 'invite' | 'settings' | 'activity'

interface Skill {
  name: string
  proficiency: Proficiency
}

interface ActivityItem {
  id: string
  action: string
  description: string
  timestamp: string
  type: 'join' | 'role_change' | 'meeting' | 'experiment' | 'review' | 'permission' | 'status_change'
}

interface MemberStats {
  meetingsAttended: number
  messagesSent: number
  reviewsGiven: number
  experimentsRun: number
}

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  status: MemberStatus
  skills: Skill[]
  bio: string
  timezone: string
  availability: string
  joinedAt: string
  avatar: string
  stats: MemberStats
  recentActivity: ActivityItem[]
}

interface Role {
  id: string
  name: string
  color: string
  description: string
  order: number
}

interface TeamSettings {
  teamName: string
  description: string
  visibility: TeamVisibility
  defaultMeetingDuration: number
  notifications: {
    memberJoined: boolean
    roleChanged: boolean
    meetingCreated: boolean
    experimentCompleted: boolean
  }
}

// ============================================================
// Constants
// ============================================================

const STORAGE_KEY = 'vl-team-management'

const ROLE_COLORS: Record<string, string> = {
  Admin: '#ef4444',
  'Lead Researcher': '#8b5cf6',
  Researcher: '#10b981',
  Analyst: '#06b6d4',
  Reviewer: '#f59e0b',
  Viewer: '#6b7280',
}

const STATUS_COLORS: Record<MemberStatus, string> = {
  online: '#10b981',
  busy: '#f59e0b',
  offline: '#6b7280',
  away: '#3b82f6',
}

const DEFAULT_ROLES: Role[] = [
  { id: 'admin', name: 'Admin', color: '#ef4444', description: 'Full access to all team features and settings', order: 0 },
  { id: 'lead', name: 'Lead Researcher', color: '#8b5cf6', description: 'Leads research direction, manages most resources', order: 1 },
  { id: 'researcher', name: 'Researcher', color: '#10b981', description: 'Conducts research, runs experiments, attends meetings', order: 2 },
  { id: 'analyst', name: 'Analyst', color: '#06b6d4', description: 'Analyzes data, creates reports and visualizations', order: 3 },
  { id: 'reviewer', name: 'Reviewer', color: '#f59e0b', description: 'Reviews meetings, experiments, provides quality feedback', order: 4 },
  { id: 'viewer', name: 'Viewer', color: '#6b7280', description: 'Read-only access to view team content', order: 5 },
]

const SAMPLE_MEMBERS: TeamMember[] = [
  {
    id: 'mem-001', name: 'Dr. Sarah Chen', email: 'sarah.chen@virtuallab.io',
    role: 'Admin', status: 'online',
    skills: [
      { name: 'Machine Learning', proficiency: 'expert' },
      { name: 'Data Analysis', proficiency: 'expert' },
      { name: 'Project Management', proficiency: 'expert' },
      { name: 'Python', proficiency: 'expert' },
    ],
    bio: 'Lead researcher specializing in computational biology and machine learning applications in drug discovery. 15+ years of experience leading cross-functional research teams across multiple institutions.',
    timezone: 'UTC-8 (Pacific)', availability: 'Full-time',
    joinedAt: new Date(Date.now() - 365 * 86400000).toISOString(),
    avatar: '#ef4444',
    stats: { meetingsAttended: 142, messagesSent: 1834, reviewsGiven: 67, experimentsRun: 23 },
    recentActivity: [
      { id: 'a1', action: 'Updated team settings', description: 'Changed visibility to Internal', timestamp: new Date(Date.now() - 3600000).toISOString(), type: 'permission' },
      { id: 'a2', action: 'Created experiment', description: 'Launched protein folding experiment #E-042', timestamp: new Date(Date.now() - 7200000).toISOString(), type: 'experiment' },
      { id: 'a3', action: 'Reviewed meeting', description: 'Reviewed sprint planning session', timestamp: new Date(Date.now() - 86400000).toISOString(), type: 'review' },
      { id: 'a4', action: 'Promoted member', description: 'Promoted Marcus to Lead Researcher', timestamp: new Date(Date.now() - 172800000).toISOString(), type: 'role_change' },
      { id: 'a5', action: 'Status change', description: 'Changed status to online', timestamp: new Date(Date.now() - 259200000).toISOString(), type: 'status_change' },
    ],
  },
  {
    id: 'mem-002', name: 'Marcus Williams', email: 'marcus.w@virtuallab.io',
    role: 'Lead Researcher', status: 'online',
    skills: [
      { name: 'NLP', proficiency: 'expert' },
      { name: 'Deep Learning', proficiency: 'expert' },
      { name: 'Research Methods', proficiency: 'intermediate' },
      { name: 'R', proficiency: 'intermediate' },
    ],
    bio: 'Computational linguist focused on transformer architectures and their applications in scientific literature analysis. Passionate about reproducible research practices.',
    timezone: 'UTC-5 (Eastern)', availability: 'Full-time',
    joinedAt: new Date(Date.now() - 300 * 86400000).toISOString(),
    avatar: '#8b5cf6',
    stats: { meetingsAttended: 98, messagesSent: 1245, reviewsGiven: 42, experimentsRun: 18 },
    recentActivity: [
      { id: 'a6', action: 'Created meeting', description: 'Scheduled NLP model review session', timestamp: new Date(Date.now() - 1800000).toISOString(), type: 'meeting' },
      { id: 'a7', action: 'Ran experiment', description: 'Completed BERT fine-tuning experiment', timestamp: new Date(Date.now() - 5400000).toISOString(), type: 'experiment' },
      { id: 'a8', action: 'Edited wiki', description: 'Updated transformer architecture guide', timestamp: new Date(Date.now() - 43200000).toISOString(), type: 'review' },
    ],
  },
  {
    id: 'mem-003', name: 'Dr. Yuki Tanaka', email: 'yuki.t@virtuallab.io',
    role: 'Researcher', status: 'busy',
    skills: [
      { name: 'Bioinformatics', proficiency: 'expert' },
      { name: 'Genomics', proficiency: 'expert' },
      { name: 'Python', proficiency: 'intermediate' },
      { name: 'Statistical Analysis', proficiency: 'expert' },
    ],
    bio: 'Bioinformatics researcher with expertise in genome-wide association studies and variant calling pipelines. Currently leading the pharmacogenomics project.',
    timezone: 'UTC+9 (Japan)', availability: 'Full-time',
    joinedAt: new Date(Date.now() - 240 * 86400000).toISOString(),
    avatar: '#10b981',
    stats: { meetingsAttended: 76, messagesSent: 897, reviewsGiven: 31, experimentsRun: 15 },
    recentActivity: [
      { id: 'a9', action: 'Status change', description: 'Changed status to busy', timestamp: new Date(Date.now() - 900000).toISOString(), type: 'status_change' },
      { id: 'a10', action: 'Ran experiment', description: 'Started GWAS analysis on cohort dataset', timestamp: new Date(Date.now() - 3600000).toISOString(), type: 'experiment' },
    ],
  },
  {
    id: 'mem-004', name: 'Elena Rodriguez', email: 'elena.r@virtuallab.io',
    role: 'Analyst', status: 'away',
    skills: [
      { name: 'Data Visualization', proficiency: 'expert' },
      { name: 'SQL', proficiency: 'expert' },
      { name: 'Statistics', proficiency: 'intermediate' },
      { name: 'Tableau', proficiency: 'expert' },
    ],
    bio: 'Data analyst specializing in scientific data visualization and dashboard creation. Translates complex datasets into actionable insights for research teams.',
    timezone: 'UTC+1 (CET)', availability: 'Part-time',
    joinedAt: new Date(Date.now() - 180 * 86400000).toISOString(),
    avatar: '#06b6d4',
    stats: { meetingsAttended: 54, messagesSent: 623, reviewsGiven: 18, experimentsRun: 4 },
    recentActivity: [
      { id: 'a11', action: 'Exported report', description: 'Generated Q3 analytics report', timestamp: new Date(Date.now() - 7200000).toISOString(), type: 'review' },
      { id: 'a12', action: 'Viewed analytics', description: 'Reviewed pipeline performance dashboard', timestamp: new Date(Date.now() - 14400000).toISOString(), type: 'review' },
    ],
  },
  {
    id: 'mem-005', name: 'James Park', email: 'james.p@virtuallab.io',
    role: 'Reviewer', status: 'offline',
    skills: [
      { name: 'Peer Review', proficiency: 'expert' },
      { name: 'Scientific Writing', proficiency: 'expert' },
      { name: 'Molecular Biology', proficiency: 'intermediate' },
      { name: 'LaTeX', proficiency: 'intermediate' },
    ],
    bio: 'Senior reviewer with background in molecular biology and 20+ years of experience in peer reviewing for top-tier scientific journals. Ensures quality across all team outputs.',
    timezone: 'UTC-5 (Eastern)', availability: 'Contract',
    joinedAt: new Date(Date.now() - 120 * 86400000).toISOString(),
    avatar: '#f59e0b',
    stats: { meetingsAttended: 32, messagesSent: 412, reviewsGiven: 89, experimentsRun: 0 },
    recentActivity: [
      { id: 'a13', action: 'Reviewed meeting', description: 'Provided feedback on experimental design', timestamp: new Date(Date.now() - 86400000).toISOString(), type: 'review' },
      { id: 'a14', action: 'Reviewed results', description: 'Reviewed drug screening results', timestamp: new Date(Date.now() - 172800000).toISOString(), type: 'review' },
    ],
  },
  {
    id: 'mem-006', name: 'Aisha Patel', email: 'aisha.p@virtuallab.io',
    role: 'Viewer', status: 'online',
    skills: [
      { name: 'Literature Search', proficiency: 'beginner' },
      { name: 'Reference Management', proficiency: 'intermediate' },
      { name: 'Academic Writing', proficiency: 'beginner' },
    ],
    bio: 'Graduate student and research intern. Observing team workflows and contributing to literature reviews as part of academic training.',
    timezone: 'UTC+5:30 (IST)', availability: 'Intern',
    joinedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    avatar: '#6b7280',
    stats: { meetingsAttended: 8, messagesSent: 34, reviewsGiven: 0, experimentsRun: 0 },
    recentActivity: [
      { id: 'a15', action: 'Joined team', description: 'Aisha Patel joined as Viewer', timestamp: new Date(Date.now() - 30 * 86400000).toISOString(), type: 'join' },
    ],
  },
]

const DEFAULT_SETTINGS: TeamSettings = {
  teamName: 'Virtual Lab Research Team',
  description: 'Multidisciplinary team focused on computational biology, NLP, and data analytics for scientific research collaboration.',
  visibility: 'internal',
  defaultMeetingDuration: 60,
  notifications: {
    memberJoined: true,
    roleChanged: true,
    meetingCreated: true,
    experimentCompleted: true,
  },
}

const SAMPLE_ACTIVITY: ActivityItem[] = [
  { id: 'ga1', action: 'Member joined', description: 'Aisha Patel joined as Viewer', timestamp: new Date(Date.now() - 86400000).toISOString(), type: 'join' },
  { id: 'ga2', action: 'Role changed', description: 'Marcus Williams promoted to Lead Researcher', timestamp: new Date(Date.now() - 172800000).toISOString(), type: 'role_change' },
  { id: 'ga3', action: 'Meeting created', description: 'Sprint planning meeting created by Sarah Chen', timestamp: new Date(Date.now() - 259200000).toISOString(), type: 'meeting' },
  { id: 'ga4', action: 'Permission updated', description: 'Analyst role granted export_data permission', timestamp: new Date(Date.now() - 345600000).toISOString(), type: 'permission' },
  { id: 'ga5', action: 'Experiment completed', description: 'Drug screening #E-038 completed by Yuki Tanaka', timestamp: new Date(Date.now() - 432000000).toISOString(), type: 'experiment' },
  { id: 'ga6', action: 'Member joined', description: 'Elena Rodriguez joined as Analyst', timestamp: new Date(Date.now() - 15552000000).toISOString(), type: 'join' },
  { id: 'ga7', action: 'Review submitted', description: 'James Park submitted review for meeting M-045', timestamp: new Date(Date.now() - 604800000).toISOString(), type: 'review' },
  { id: 'ga8', action: 'Settings updated', description: 'Team visibility changed to Internal', timestamp: new Date(Date.now() - 691200000).toISOString(), type: 'permission' },
]

// ============================================================
// Helpers
// ============================================================

function getInitials(name: string): string {
  return name.split(' ').map(w => w.charAt(0)).slice(0, 2).join('').toUpperCase()
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatRelativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

function getRoleBadgeClass(roleName: string): string {
  const map: Record<string, string> = {
    Admin: 'tm-role-badge-admin',
    'Lead Researcher': 'tm-role-badge-lead',
    Researcher: 'tm-role-badge-researcher',
    Analyst: 'tm-role-badge-analyst',
    Reviewer: 'tm-role-badge-reviewer',
    Viewer: 'tm-role-badge-viewer',
  }
  return map[roleName] ?? 'tm-role-badge-viewer'
}

function getSkillClass(proficiency: Proficiency): string {
  const map: Record<Proficiency, string> = {
    beginner: 'tm-skill-tag-beginner',
    intermediate: 'tm-skill-tag-intermediate',
    expert: 'tm-skill-tag-expert',
  }
  return map[proficiency]
}

function getActivityIcon(type: string): { icon: React.ReactNode; bg: string; color: string } {
  const configs: Record<string, { icon: React.ReactNode; bg: string; color: string }> = {
    join: { icon: <UserCheck style={{ width: 14, height: 14 }} />, bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
    role_change: { icon: <Shield style={{ width: 14, height: 14 }} />, bg: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' },
    meeting: { icon: <Video style={{ width: 14, height: 14 }} />, bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
    experiment: { icon: <FlaskConical style={{ width: 14, height: 14 }} />, bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
    review: { icon: <Star style={{ width: 14, height: 14 }} />, bg: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' },
    permission: { icon: <Lock style={{ width: 14, height: 14 }} />, bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' },
    status_change: { icon: <Activity style={{ width: 14, height: 14 }} />, bg: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' },
  }
  return configs[type] ?? configs.join
}

// ============================================================
// Persistence Hook
// ============================================================

function usePersistence<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue
    try {
      const stored = localStorage.getItem(key)
      return stored ? (JSON.parse(stored) as T) : defaultValue
    } catch {
      return defaultValue
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state))
    } catch { /* storage full or unavailable */ }
  }, [key, state])

  return [state, setState]
}

// ============================================================
// TeamManagementPanel Component
// ============================================================

export function TeamManagementPanel({ lang }: { lang: Lang }) {
  const [members, setMembers] = usePersistence<TeamMember[]>(STORAGE_KEY + '-members', SAMPLE_MEMBERS)
  const [roles, setRoles] = useState<Role[]>(DEFAULT_ROLES)
  const [settings, setSettings] = usePersistence<TeamSettings>(STORAGE_KEY + '-settings', DEFAULT_SETTINGS)
  const [activity, setActivity] = useState<ActivityItem[]>(SAMPLE_ACTIVITY)
  const [activeTab, setActiveTab] = useState<TabId>('members')
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<TeamMember>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  // Invite form state
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('Viewer')
  const [inviteSkills, setInviteSkills] = useState<Skill[]>([])
  const [inviteSkillInput, setInviteSkillInput] = useState('')
  const [inviteBio, setInviteBio] = useState('')

  // Drag state for role reordering
  const [draggedRole, setDraggedRole] = useState<string | null>(null)

  // Reference to persisted values
  const membersRef = useRef(members)
  membersRef.current = members
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  // Filtered members
  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const matchesSearch = !searchQuery || (
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.skills.some(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      const matchesRole = filterRole === 'all' || m.role === filterRole
      const matchesStatus = filterStatus === 'all' || m.status === filterStatus
      return matchesSearch && matchesRole && matchesStatus
    })
  }, [members, searchQuery, filterRole, filterStatus])

  // Team stats
  const teamStats = useMemo(() => {
    const onlineCount = members.filter(m => m.status === 'online' || m.status === 'busy').length
    const roleCounts: Record<string, number> = {}
    members.forEach(m => {
      roleCounts[m.role] = (roleCounts[m.role] ?? 0) + 1
    })
    return { onlineCount, total: members.length, roleCounts }
  }, [members])

  // Open member detail
  const openMemberDetail = useCallback((member: TeamMember) => {
    setSelectedMember(member)
    setEditForm({})
    setIsEditing(false)
  }, [])

  // Close member detail
  const closeMemberDetail = useCallback(() => {
    setSelectedMember(null)
    setIsEditing(false)
    setEditForm({})
  }, [])

  // Start editing member
  const startEditing = useCallback((member: TeamMember) => {
    setEditForm({
      name: member.name,
      role: member.role,
      bio: member.bio,
      skills: [...member.skills],
    })
    setIsEditing(true)
  }, [])

  // Save member edits
  const saveEdits = useCallback(() => {
    if (!selectedMember) return
    setMembers(prev => prev.map(m => {
      if (m.id !== selectedMember.id) return m
      const updated = {
        ...m,
        ...(editForm.name !== undefined && { name: editForm.name }),
        ...(editForm.role !== undefined && { role: editForm.role }),
        ...(editForm.bio !== undefined && { bio: editForm.bio }),
        ...(editForm.skills !== undefined && { skills: editForm.skills }),
      }
      if (editForm.role !== undefined && editForm.role !== m.role) {
        setActivity(prev => [{
          id: `ga-${Date.now()}`,
          action: 'Role changed',
          description: `${m.name} changed from ${m.role} to ${editForm.role}`,
          timestamp: new Date().toISOString(),
          type: 'role_change',
        }, ...prev])
      }
      return updated
    }))
    setIsEditing(false)
    setEditForm({})
  }, [selectedMember, editForm, setMembers])

  // Invite new member
  const handleInvite = useCallback(() => {
    if (!inviteName.trim() || !inviteEmail.trim()) return

    const newMember: TeamMember = {
      id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: inviteName.trim(),
      email: inviteEmail.trim(),
      role: inviteRole,
      status: 'online',
      skills: inviteSkills,
      bio: inviteBio,
      timezone: 'UTC',
      availability: 'Full-time',
      joinedAt: new Date().toISOString(),
      avatar: ROLE_COLORS[inviteRole] ?? '#6b7280',
      stats: { meetingsAttended: 0, messagesSent: 0, reviewsGiven: 0, experimentsRun: 0 },
      recentActivity: [],
    }

    setMembers(prev => [...prev, newMember])
    setActivity(prev => [{
      id: `ga-${Date.now()}`,
      action: 'Member joined',
      description: `${inviteName.trim()} joined as ${inviteRole}`,
      timestamp: new Date().toISOString(),
      type: 'join',
    }, ...prev])

    setInviteName('')
    setInviteEmail('')
    setInviteRole('Viewer')
    setInviteSkills([])
    setInviteBio('')
    setInviteSkillInput('')
    setActiveTab('members')
  }, [inviteName, inviteEmail, inviteRole, inviteSkills, inviteBio, setMembers])

  // Add skill to invite form
  const addInviteSkill = useCallback(() => {
    const skillName = inviteSkillInput.trim()
    if (!skillName || inviteSkills.some(s => s.name.toLowerCase() === skillName.toLowerCase())) return
    setInviteSkills(prev => [...prev, { name: skillName, proficiency: 'intermediate' as Proficiency }])
    setInviteSkillInput('')
  }, [inviteSkillInput, inviteSkills])

  // Remove skill from invite form
  const removeInviteSkill = useCallback((skillName: string) => {
    setInviteSkills(prev => prev.filter(s => s.name !== skillName))
  }, [])

  // Remove member
  const removeMember = useCallback((memberId: string) => {
    const member = members.find(m => m.id === memberId)
    if (!member) return
    setMembers(prev => prev.filter(m => m.id !== memberId))
    setActivity(prev => [{
      id: `ga-${Date.now()}`,
      action: 'Member removed',
      description: `${member.name} was removed from the team`,
      timestamp: new Date().toISOString(),
      type: 'join',
    }, ...prev])
    if (selectedMember?.id === memberId) closeMemberDetail()
  }, [members, selectedMember, setMembers, closeMemberDetail])

  // Role drag handlers
  const handleRoleDragStart = useCallback((roleId: string) => {
    setDraggedRole(roleId)
  }, [])

  const handleRoleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleRoleDrop = useCallback((targetRoleId: string) => {
    if (!draggedRole || draggedRole === targetRoleId) return
    setRoles(prev => {
      const updated = [...prev]
      const dragIdx = updated.findIndex(r => r.id === draggedRole)
      const targetIdx = updated.findIndex(r => r.id === targetRoleId)
      if (dragIdx === -1 || targetIdx === -1) return prev
      const [moved] = updated.splice(dragIdx, 1)
      updated.splice(targetIdx, 0, moved)
      return updated.map((r, i) => ({ ...r, order: i }))
    })
    setDraggedRole(null)
  }, [draggedRole])

  const handleDragEnd = useCallback(() => {
    setDraggedRole(null)
  }, [])

  // Toggle notification setting
  const toggleNotification = useCallback((key: keyof TeamSettings['notifications']) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key],
      },
    }))
  }, [setSettings])

  return (
    <div className="tm-container">
      {/* ============================================================ */}
      {/* Team Hero Banner */}
      {/* ============================================================ */}
      <div className="tm-team-hero">
        <div className="tm-hero-avatar">
          {getInitials(settings.teamName)}
        </div>
        <div className="tm-hero-info">
          <h1 className="tm-hero-name">{settings.teamName}</h1>
          <p className="tm-hero-description">{settings.description}</p>
          <div className="tm-hero-stats">
            <div className="tm-hero-stat">
              <span className="tm-hero-stat-value">{teamStats.total}</span>
              <Users style={{ width: 14, height: 14 }} /> Members
            </div>
            <div className="tm-hero-stat">
              <span className="tm-hero-stat-value">{teamStats.onlineCount}</span>
              <Activity style={{ width: 14, height: 14, color: '#10b981' }} /> Online
            </div>
            <div className="tm-hero-stat">
              <span className="tm-hero-stat-value">{DEFAULT_ROLES.length}</span>
              <Shield style={{ width: 14, height: 14 }} /> Roles
            </div>
            <div className="tm-hero-stat">
              <span className="tm-hero-stat-value">{formatDate(members.length > 0 ? members[members.length - 1].joinedAt : new Date().toISOString())}</span>
              <Calendar style={{ width: 14, height: 14 }} /> Last joined
            </div>
          </div>
        </div>
        <div className="tm-hero-actions">
          <button className="tm-hero-btn tm-hero-btn-primary" onClick={() => setActiveTab('invite')}>
            <UserPlus style={{ width: 16, height: 16 }} />
            Invite
          </button>
          <button className="tm-hero-btn tm-hero-btn-secondary" onClick={() => setActiveTab('settings')}>
            <SettingsIcon style={{ width: 16, height: 16 }} />
            Settings
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* Tab Navigation */}
      {/* ============================================================ */}
      <div className="tm-tabs">
        <button className={`tm-tab ${activeTab === 'members' ? 'tm-tab-active' : ''}`} onClick={() => setActiveTab('members')}>
          <Users style={{ width: 14, height: 14, marginRight: 4, display: 'inline' }} />
          Members ({members.length})
        </button>
        <button className={`tm-tab ${activeTab === 'roles' ? 'tm-tab-active' : ''}`} onClick={() => setActiveTab('roles')}>
          <Shield style={{ width: 14, height: 14, marginRight: 4, display: 'inline' }} />
          Roles
        </button>
        <button className={`tm-tab ${activeTab === 'invite' ? 'tm-tab-active' : ''}`} onClick={() => setActiveTab('invite')}>
          <UserPlus style={{ width: 14, height: 14, marginRight: 4, display: 'inline' }} />
          Invite
        </button>
        <button className={`tm-tab ${activeTab === 'settings' ? 'tm-tab-active' : ''}`} onClick={() => setActiveTab('settings')}>
          <SettingsIcon style={{ width: 14, height: 14, marginRight: 4, display: 'inline' }} />
          Settings
        </button>
        <button className={`tm-tab ${activeTab === 'activity' ? 'tm-tab-active' : ''}`} onClick={() => setActiveTab('activity')}>
          <Activity style={{ width: 14, height: 14, marginRight: 4, display: 'inline' }} />
          Activity
        </button>
      </div>

      {/* ============================================================ */}
      {/* Members Tab */}
      {/* ============================================================ */}
      {activeTab === 'members' && (
        <div className="tm-section">
          {/* Search & Filter */}
          <div className="tm-search-bar">
            <div className="tm-search-input-wrapper">
              <span className="tm-search-icon"><Search style={{ width: 14, height: 14 }} /></span>
              <input
                className="tm-search-input"
                type="text"
                placeholder="Search members by name, email, or skills..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 'var(--vl-space-2)', flexWrap: 'wrap' }}>
              <button
                className={`tm-filter-chip ${filterStatus === 'all' ? '' : 'tm-filter-chip-active'}`}
                onClick={() => setFilterStatus('all')}
              >
                All
              </button>
              {(['online', 'busy', 'offline', 'away'] as MemberStatus[]).map(status => (
                <button
                  key={status}
                  className={`tm-filter-chip ${filterStatus === status ? 'tm-filter-chip-active' : ''}`}
                  onClick={() => setFilterStatus(status)}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[status], display: 'inline-block' }} />
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Role filter chips */}
          <div style={{ display: 'flex', gap: 'var(--vl-space-2)', marginBottom: 'var(--vl-space-4)', flexWrap: 'wrap' }}>
            <button className={`tm-filter-chip ${filterRole === 'all' ? 'tm-filter-chip-active' : ''}`} onClick={() => setFilterRole('all')}>
              All Roles
            </button>
            {DEFAULT_ROLES.map(role => (
              <button
                key={role.id}
                className={`tm-filter-chip ${filterRole === role.name ? 'tm-filter-chip-active' : ''}`}
                onClick={() => setFilterRole(role.name)}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: role.color, display: 'inline-block' }} />
                {role.name}
              </button>
            ))}
          </div>

          {/* Member Grid */}
          {filteredMembers.length === 0 ? (
            <div className="tm-empty-state">
              <div className="tm-empty-state-icon"><Users style={{ width: 28, height: 28 }} /></div>
              <div className="tm-empty-state-title">No members found</div>
              <div className="tm-empty-state-desc">Try adjusting your search or filter criteria.</div>
            </div>
          ) : (
            <div className="tm-member-grid">
              {filteredMembers.map((member, idx) => (
                <div
                  key={member.id}
                  className="tm-member-card tm-card-animate"
                  data-role={member.role}
                  style={{ animationDelay: `${idx * 50}ms` }}
                  onClick={() => openMemberDetail(member)}
                >
                  <div className="tm-card-header">
                    <div className="tm-status-dot-wrapper">
                      <div
                        className="tm-avatar tm-avatar-md"
                        style={{ background: member.avatar }}
                      >
                        {getInitials(member.name)}
                      </div>
                      <span
                        className={`tm-status-dot tm-status-dot-${member.status}`}
                        style={{ borderColor: 'var(--vl-bg-card)' }}
                      />
                    </div>
                    <div className="tm-card-body">
                      <div className="tm-card-name">{member.name}</div>
                      <div className="tm-card-email">{member.email}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--vl-space-2)', flexWrap: 'wrap' }}>
                        <span className={`tm-role-badge ${getRoleBadgeClass(member.role)}`}>
                          {member.role}
                        </span>
                        <span className="tm-status-label tm-status-label-{member.status}">
                          {member.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Skills preview */}
                  <div className="tm-skills-container" style={{ marginTop: 'var(--vl-space-2)' }}>
                    {member.skills.slice(0, 3).map(skill => (
                      <span key={skill.name} className={`tm-skill-tag ${getSkillClass(skill.proficiency)}`}>
                        {skill.name}
                      </span>
                    ))}
                    {member.skills.length > 3 && (
                      <span className="tm-skill-tag" style={{ background: 'var(--vl-bg-secondary)', color: 'var(--vl-text-muted)', border: '1px solid var(--vl-border-subtle)' }}>
                        +{member.skills.length - 3} more
                      </span>
                    )}
                  </div>

                  {/* Expanded info on hover */}
                  <div className="tm-card-expand">
                    <div className="tm-card-expertise">
                      {member.bio.length > 120 ? member.bio.slice(0, 120) + '...' : member.bio}
                    </div>
                    <div className="tm-card-activity">
                      <Activity style={{ width: 12, height: 12 }} />
                      {member.recentActivity[0]
                        ? `${member.recentActivity[0].action} — ${formatRelativeTime(member.recentActivity[0].timestamp)}`
                        : 'No recent activity'}
                    </div>
                    <div className="tm-card-actions">
                      <button
                        className="tm-card-action-btn"
                        title="Edit"
                        onClick={(e) => { e.stopPropagation(); openMemberDetail(member); setTimeout(() => startEditing(member), 100) }}
                      >
                        <Edit3 style={{ width: 14, height: 14 }} />
                      </button>
                      <button
                        className="tm-card-action-btn"
                        title="Remove"
                        onClick={(e) => { e.stopPropagation(); removeMember(member.id) }}
                        style={{ '--hover-bg': 'rgba(239, 68, 68, 0.1)' } as React.CSSProperties}
                      >
                        <Trash2 style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* Roles Tab */}
      {/* ============================================================ */}
      {activeTab === 'roles' && (
        <div className="tm-section">
          <div className="tm-section-title">
            <Shield style={{ width: 18, height: 18 }} />
            Role Hierarchy
          </div>
          <p style={{ fontSize: 'var(--vl-text-sm)', color: 'var(--vl-text-muted)', marginBottom: 'var(--vl-space-4)' }}>
            Drag and drop to reorder the role hierarchy. Higher roles inherit permissions from lower ones.
          </p>
          <div className="tm-role-list">
            {roles.map((role, idx) => (
              <div
                key={role.id}
                className={`tm-role-item ${draggedRole === role.id ? 'tm-role-item-dragging' : ''}`}
                draggable
                onDragStart={() => handleRoleDragStart(role.id)}
                onDragOver={handleRoleDragOver}
                onDrop={() => handleRoleDrop(role.id)}
                onDragEnd={handleDragEnd}
              >
                <span className="tm-role-grip">
                  <GripVertical style={{ width: 16, height: 16 }} />
                </span>
                <span className="tm-role-color-dot" style={{ background: role.color }} />
                <div className="tm-role-info">
                  <div className="tm-role-name">{role.name}</div>
                  <div className="tm-role-desc">{role.description}</div>
                </div>
                <span className="tm-role-permission-count">
                  {members.filter(m => m.role === role.name).length} member{(members.filter(m => m.role === role.name).length !== 1) ? 's' : ''}
                </span>
                <ChevronRight style={{ width: 16, height: 16, color: 'var(--vl-text-muted)' }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* Invite Tab */}
      {/* ============================================================ */}
      {activeTab === 'invite' && (
        <div className="tm-section">
          <div className="tm-invite-form">
            <div className="tm-invite-form-title">
              <UserPlus style={{ width: 18, height: 18 }} />
              Invite New Member
            </div>
            <div className="tm-form-row">
              <div className="tm-form-group">
                <label className="tm-form-label">Full Name</label>
                <input
                  className="tm-form-input"
                  type="text"
                  placeholder="e.g. Dr. Jane Smith"
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                />
              </div>
              <div className="tm-form-group">
                <label className="tm-form-label">Email</label>
                <input
                  className="tm-form-input"
                  type="email"
                  placeholder="e.g. jane.smith@virtuallab.io"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="tm-form-row">
              <div className="tm-form-group">
                <label className="tm-form-label">Role</label>
                <select className="tm-form-select" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                  {DEFAULT_ROLES.map(r => (
                    <option key={r.id} value={r.name}>{r.name} — {r.description}</option>
                  ))}
                </select>
              </div>
              <div className="tm-form-group">
                <label className="tm-form-label">Skills (press Enter to add)</label>
                <div style={{ display: 'flex', gap: 'var(--vl-space-2)' }}>
                  <input
                    className="tm-form-input"
                    type="text"
                    placeholder="Type a skill name..."
                    value={inviteSkillInput}
                    onChange={e => setInviteSkillInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addInviteSkill() } }}
                  />
                  <button className="tm-card-action-btn" onClick={addInviteSkill} style={{ flexShrink: 0, width: 32, height: 32 }}>
                    <Plus style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              </div>
            </div>
            {inviteSkills.length > 0 && (
              <div className="tm-skills-container" style={{ marginBottom: 'var(--vl-space-4)' }}>
                {inviteSkills.map(skill => (
                  <span key={skill.name} className={`tm-skill-tag ${getSkillClass(skill.proficiency)}`} style={{ cursor: 'pointer' }} onClick={() => removeInviteSkill(skill.name)}>
                    {skill.name}
                    <X style={{ width: 10, height: 10, marginLeft: 2 }} />
                  </span>
                ))}
              </div>
            )}
            <div className="tm-form-group tm-form-group-full">
              <label className="tm-form-label">Bio</label>
              <textarea
                className="tm-form-textarea"
                placeholder="Brief introduction and background..."
                value={inviteBio}
                onChange={e => setInviteBio(e.target.value)}
              />
            </div>
            <div className="tm-form-actions">
              <button className="tm-form-btn tm-form-btn-ghost" onClick={() => { setInviteName(''); setInviteEmail(''); setInviteSkills([]); setInviteBio(''); setInviteSkillInput('') }}>
                <X style={{ width: 14, height: 14 }} />
                Clear
              </button>
              <button
                className="tm-form-btn tm-form-btn-primary"
                onClick={handleInvite}
                disabled={!inviteName.trim() || !inviteEmail.trim()}
                style={{ opacity: (!inviteName.trim() || !inviteEmail.trim()) ? 0.5 : 1 }}
              >
                <UserPlus style={{ width: 14, height: 14 }} />
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* Settings Tab */}
      {/* ============================================================ */}
      {activeTab === 'settings' && (
        <div className="tm-section">
          <div className="tm-settings-grid">
            <div className="tm-setting-group">
              <div className="tm-setting-group-title">Team Information</div>
              <div className="tm-form-group">
                <label className="tm-form-label">Team Name</label>
                <input
                  className="tm-form-input"
                  type="text"
                  value={settings.teamName}
                  onChange={e => setSettings(prev => ({ ...prev, teamName: e.target.value }))}
                />
              </div>
              <div className="tm-form-group">
                <label className="tm-form-label">Description</label>
                <textarea
                  className="tm-form-textarea"
                  value={settings.description}
                  onChange={e => setSettings(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="tm-form-group">
                <label className="tm-form-label">Visibility</label>
                <div className="tm-visibility-options">
                  {(['public', 'internal', 'private'] as TeamVisibility[]).map(vis => (
                    <button
                      key={vis}
                      className={`tm-visibility-option ${settings.visibility === vis ? 'tm-visibility-option-active' : ''}`}
                      onClick={() => setSettings(prev => ({ ...prev, visibility: vis }))}
                    >
                      {vis === 'public' && <Eye style={{ width: 14, height: 14, display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />}
                      {vis === 'internal' && <Users style={{ width: 14, height: 14, display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />}
                      {vis === 'private' && <Lock style={{ width: 14, height: 14, display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />}
                      {vis.charAt(0).toUpperCase() + vis.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="tm-setting-group">
              <div className="tm-setting-group-title">Meeting Defaults</div>
              <div className="tm-form-group">
                <label className="tm-form-label">Default Duration (minutes)</label>
                <input
                  className="tm-form-input"
                  type="number"
                  value={settings.defaultMeetingDuration}
                  onChange={e => setSettings(prev => ({ ...prev, defaultMeetingDuration: parseInt(e.target.value, 10) || 60 }))}
                />
              </div>

              <div className="tm-setting-group-title" style={{ marginTop: 'var(--vl-space-6)' }}>Notification Preferences</div>
              {(['memberJoined', 'roleChanged', 'meetingCreated', 'experimentCompleted'] as const).map(key => {
                const labels: Record<string, string> = {
                  memberJoined: 'New member joined',
                  roleChanged: 'Role changes',
                  meetingCreated: 'Meeting created',
                  experimentCompleted: 'Experiment completed',
                }
                return (
                  <div key={key} className="tm-notification-toggle">
                    <span className="tm-notification-toggle-label">{labels[key]}</span>
                    <button
                      className={`tm-toggle ${settings.notifications[key] ? 'tm-toggle-active' : ''}`}
                      onClick={() => toggleNotification(key)}
                    >
                      <span className="tm-toggle-knob" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* Activity Tab */}
      {/* ============================================================ */}
      {activeTab === 'activity' && (
        <div className="tm-section">
          <div className="tm-section-title">
            <Activity style={{ width: 18, height: 18 }} />
            Team Activity
          </div>
          <div className="tm-activity-feed" style={{ maxHeight: 600 }}>
            {activity.map(entry => {
              const iconConfig = getActivityIcon(entry.type)
              return (
                <div key={entry.id} className="tm-activity-item">
                  <div className="tm-activity-icon" style={{ background: iconConfig.bg, color: iconConfig.color }}>
                    {iconConfig.icon}
                  </div>
                  <div className="tm-activity-content">
                    <div className="tm-activity-text">
                      <strong>{entry.action}</strong> — {entry.description}
                    </div>
                    <div className="tm-activity-time">
                      <Clock style={{ width: 10, height: 10, marginRight: 3, display: 'inline', verticalAlign: 'middle' }} />
                      {formatRelativeTime(entry.timestamp)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* Member Detail Panel (Slide-in) */}
      {/* ============================================================ */}
      {selectedMember && (
        <>
          <div className="tm-detail-overlay tm-detail-overlay-visible" onClick={closeMemberDetail} />
          <div className={`tm-member-detail ${selectedMember ? 'tm-member-detail-open' : ''}`}>
            <div className="tm-detail-header">
              <div className="tm-detail-header-info">
                <div className="tm-status-dot-wrapper">
                  <div className="tm-avatar tm-avatar-lg" style={{ background: selectedMember.avatar }}>
                    {getInitials(selectedMember.name)}
                  </div>
                  <span className={`tm-status-dot tm-status-dot-${selectedMember.status}`} style={{ borderColor: 'var(--vl-bg-primary)' }} />
                </div>
                <div>
                  {isEditing ? (
                    <input
                      className="tm-detail-edit-field"
                      value={editForm.name ?? selectedMember.name}
                      onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      style={{ fontSize: 'var(--vl-text-lg)', fontWeight: 700, marginBottom: 2 }}
                    />
                  ) : (
                    <div className="tm-detail-header-name">{selectedMember.name}</div>
                  )}
                  {isEditing ? (
                    <select
                      className="tm-detail-edit-field"
                      value={editForm.role ?? selectedMember.role}
                      onChange={e => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                      style={{ fontSize: 'var(--vl-text-xs)', marginTop: 2 }}
                    >
                      {DEFAULT_ROLES.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                    </select>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--vl-space-2)', marginTop: 2 }}>
                      <span className={`tm-role-badge ${getRoleBadgeClass(selectedMember.role)}`}>{selectedMember.role}</span>
                      <span className={`tm-status-label tm-status-label-${selectedMember.status}`}>{selectedMember.status}</span>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--vl-space-2)' }}>
                {isEditing ? (
                  <>
                    <button className="tm-card-action-btn" onClick={saveEdits} title="Save" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                      <Save style={{ width: 16, height: 16 }} />
                    </button>
                    <button className="tm-card-action-btn" onClick={() => setIsEditing(false)} title="Cancel">
                      <X style={{ width: 16, height: 16 }} />
                    </button>
                  </>
                ) : (
                  <button className="tm-card-action-btn" onClick={() => startEditing(selectedMember)} title="Edit">
                    <Edit3 style={{ width: 16, height: 16 }} />
                  </button>
                )}
                <button className="tm-detail-close" onClick={closeMemberDetail}>
                  <X style={{ width: 16, height: 16 }} />
                </button>
              </div>
            </div>

            <div className="tm-detail-body">
              {/* Contact Info */}
              <div className="tm-detail-section">
                <div className="tm-detail-section-title">Contact Information</div>
                <div className="tm-detail-info-row">
                  <span className="tm-detail-info-label">Email</span>
                  <span><Mail style={{ width: 14, height: 14, display: 'inline', marginRight: 4, verticalAlign: 'middle', color: 'var(--vl-text-muted)' }} />{selectedMember.email}</span>
                </div>
                <div className="tm-detail-info-row">
                  <span className="tm-detail-info-label">Timezone</span>
                  <span><Globe style={{ width: 14, height: 14, display: 'inline', marginRight: 4, verticalAlign: 'middle', color: 'var(--vl-text-muted)' }} />{selectedMember.timezone}</span>
                </div>
                <div className="tm-detail-info-row">
                  <span className="tm-detail-info-label">Availability</span>
                  <span><Clock style={{ width: 14, height: 14, display: 'inline', marginRight: 4, verticalAlign: 'middle', color: 'var(--vl-text-muted)' }} />{selectedMember.availability}</span>
                </div>
                <div className="tm-detail-info-row">
                  <span className="tm-detail-info-label">Joined</span>
                  <span><Calendar style={{ width: 14, height: 14, display: 'inline', marginRight: 4, verticalAlign: 'middle', color: 'var(--vl-text-muted)' }} />{formatDate(selectedMember.joinedAt)}</span>
                </div>
              </div>

              {/* Skills & Expertise */}
              <div className="tm-detail-section">
                <div className="tm-detail-section-title">Skills & Expertise</div>
                <div className="tm-skills-container">
                  {selectedMember.skills.map(skill => (
                    <span key={skill.name} className={`tm-skill-tag ${getSkillClass(skill.proficiency)}`}>
                      {skill.name}
                      <span style={{ opacity: 0.6, marginLeft: 2, fontSize: 9, textTransform: 'uppercase' }}>({skill.proficiency})</span>
                    </span>
                  ))}
                  {selectedMember.skills.length === 0 && (
                    <span style={{ fontSize: 'var(--vl-text-xs)', color: 'var(--vl-text-muted)' }}>No skills listed</span>
                  )}
                </div>
              </div>

              {/* Bio */}
              <div className="tm-detail-section">
                <div className="tm-detail-section-title">Bio</div>
                {isEditing ? (
                  <textarea
                    className="tm-detail-edit-field"
                    value={editForm.bio ?? selectedMember.bio}
                    onChange={e => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                    style={{ minHeight: 100 }}
                  />
                ) : (
                  <p className="tm-detail-bio">{selectedMember.bio || 'No bio available.'}</p>
                )}
              </div>

              {/* Statistics */}
              <div className="tm-detail-section">
                <div className="tm-detail-section-title">Statistics</div>
                <div className="tm-stats-grid">
                  <div className="tm-stat-item">
                    <span className="tm-stat-icon"><Video style={{ width: 18, height: 18 }} /></span>
                    <span className="tm-stat-value">{selectedMember.stats.meetingsAttended}</span>
                    <span className="tm-stat-label">Meetings</span>
                  </div>
                  <div className="tm-stat-item">
                    <span className="tm-stat-icon"><MessageSquare style={{ width: 18, height: 18 }} /></span>
                    <span className="tm-stat-value">{selectedMember.stats.messagesSent}</span>
                    <span className="tm-stat-label">Messages</span>
                  </div>
                  <div className="tm-stat-item">
                    <span className="tm-stat-icon"><Star style={{ width: 18, height: 18 }} /></span>
                    <span className="tm-stat-value">{selectedMember.stats.reviewsGiven}</span>
                    <span className="tm-stat-label">Reviews</span>
                  </div>
                  <div className="tm-stat-item">
                    <span className="tm-stat-icon"><FlaskConical style={{ width: 18, height: 18 }} /></span>
                    <span className="tm-stat-value">{selectedMember.stats.experimentsRun}</span>
                    <span className="tm-stat-label">Experiments</span>
                  </div>
                </div>
              </div>

              {/* Recent Activity Timeline */}
              <div className="tm-detail-section">
                <div className="tm-detail-section-title">Recent Activity</div>
                {selectedMember.recentActivity.length === 0 ? (
                  <p style={{ fontSize: 'var(--vl-text-xs)', color: 'var(--vl-text-muted)' }}>No recent activity.</p>
                ) : (
                  <div className="tm-detail-timeline">
                    {selectedMember.recentActivity.map(act => {
                      const iconCfg = getActivityIcon(act.type)
                      return (
                        <div key={act.id} className="tm-detail-timeline-item">
                          <div className="tm-detail-timeline-dot" style={{ background: iconCfg.color }} />
                          <div className="tm-detail-timeline-text">{act.action} — {act.description}</div>
                          <div className="tm-detail-timeline-time">{formatRelativeTime(act.timestamp)}</div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
