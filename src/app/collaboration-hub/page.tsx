'use client'

import React, { useState, useMemo, useCallback } from 'react'
import {
  Users, Search, Plus, MessageSquare, Pin, Archive, Bell, BellOff,
  Share2, CheckCircle2, Clock, FileText, BarChart3, Upload,
  Calendar, BookOpen, Send, Bold, Italic, Code, Link, List,
  Bookmark, Reply, Hash, ChevronDown, ChevronUp, Sparkles,
  ThumbsUp, Heart, PartyPopper, Brain, Lightbulb,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────

interface TeamMember {
  id: string
  name: string
  initials: string
  role: string
  department: string
  status: 'online' | 'away' | 'offline'
  activityText: string
  avatarColor: string
  email: string
  bio: string
  recentContributions: number
}

interface ThreadMessage {
  id: string
  senderId: string
  senderName: string
  content: string
  timestamp: string
  reactions: Record<string, string[]>
  isBookmarked: boolean
}

interface Thread {
  id: string
  title: string
  type: 'Discussion' | 'Decision' | 'Question' | 'Update' | 'Review'
  preview: string
  participantIds: string[]
  unreadCount: number
  lastMessageAt: string
  createdAt: string
  messages: ThreadMessage[]
  isPinned: boolean
  isMuted: boolean
}

interface SharedResource {
  id: string
  title: string
  type: 'PDF' | 'Dataset' | 'Code' | 'Result' | 'Notebook'
  icon: string
  uploadedAt: string
  size: string
  uploaderId: string
  uploaderName: string
  project: string
}

interface TeamDecision {
  id: string
  title: string
  description: string
  date: string
  outcome: 'Approved' | 'Rejected' | 'Deferred'
  votesFor: number
  votesAgainst: number
  votesAbstain: number
  voters: string[]
  status: 'Implemented' | 'Pending' | 'Overridden'
}

interface WeeklySummary {
  messages: number
  decisions: number
  filesShared: number
  meetingsScheduled: number
  dailyActivity: { day: string; count: number }[]
}

// ─── Mock Data ──────────────────────────────────────────────────

const TEAM_MEMBERS: TeamMember[] = [
  { id: 'tm1', name: 'Dr. Sarah Chen', initials: 'SC', role: 'Principal Investigator', department: 'Structural Biology', status: 'online', activityText: 'Active now', avatarColor: '#10b981', email: 's.chen@lab.org', bio: 'Leading computational nanobody design with 15+ years of structural biology experience.', recentContributions: 24 },
  { id: 'tm2', name: 'Dr. James Park', initials: 'JP', role: 'Computational Biologist', department: 'Structural Biology', status: 'online', activityText: 'Active now', avatarColor: '#06b6d4', email: 'j.park@lab.org', bio: 'Specializes in molecular dynamics simulations and protein-ligand binding analysis.', recentContributions: 18 },
  { id: 'tm3', name: 'Dr. Maria Garcia', initials: 'MG', role: 'ML Engineer', department: 'Computational Biology', status: 'away', activityText: 'In a meeting', avatarColor: '#8b5cf6', email: 'm.garcia@lab.org', bio: 'Developing deep learning models for protein structure prediction and drug design.', recentContributions: 31 },
  { id: 'tm4', name: 'Dr. Wei Zhang', initials: 'WZ', role: 'Bioinformatician', department: 'Computational Biology', status: 'online', activityText: 'Active now', avatarColor: '#f59e0b', email: 'w.zhang@lab.org', bio: 'Expert in next-gen sequencing analysis, variant calling, and genome annotation pipelines.', recentContributions: 22 },
  { id: 'tm5', name: 'Dr. Lisa Wang', initials: 'LW', role: 'Lab Director', department: 'Drug Discovery', status: 'offline', activityText: 'Last seen 2h ago', avatarColor: '#ec4899', email: 'l.wang@lab.org', bio: 'Overseeing virtual screening pipelines and ADMET prediction models for novel therapeutics.', recentContributions: 15 },
  { id: 'tm6', name: 'Dr. David Kim', initials: 'DK', role: 'Medicinal Chemist', department: 'Drug Discovery', status: 'online', activityText: 'Active now', avatarColor: '#ef4444', email: 'd.kim@lab.org', bio: 'Designing and optimizing lead compounds using structure-activity relationship analysis.', recentContributions: 19 },
]

const THREADS: Thread[] = [
  { id: 'th1', title: 'CRISPR Off-Target Prediction Model v2.3', type: 'Discussion', preview: 'Has anyone tested the new off-target scoring function on the HEK293 validation set? Seeing improved specificity but reduced sensitivity.', participantIds: ['tm1', 'tm3', 'tm4'], unreadCount: 3, lastMessageAt: '2m ago', createdAt: '2025-01-10', isPinned: true, isMuted: false,
    messages: [
      { id: 'msg1', senderId: 'tm3', senderName: 'Dr. Maria Garcia', content: 'Has anyone tested the new off-target scoring function on the HEK293 validation set? I\'m seeing **improved specificity** but reduced sensitivity at the 3\' end.', timestamp: '2m ago', reactions: { '🤔': ['tm1'], '👍': ['tm4'] }, isBookmarked: false },
      { id: 'msg2', senderId: 'tm1', senderName: 'Dr. Sarah Chen', content: 'Yes, I ran it last night. The specificity gain is real — down from 14% to 8% off-targets on the held-out test set. But the 3\' sensitivity drop is concerning for therapeutic applications.\n\n```\nPrecision: 0.92 (+0.06)\nRecall: 0.84 (-0.08)\nF1: 0.88 (+0.02)\n```', timestamp: '15m ago', reactions: { '🎉': ['tm3', 'tm4'], '💡': ['tm6'] }, isBookmarked: true },
      { id: 'msg3', senderId: 'tm4', senderName: 'Dr. Wei Zhang', content: 'Could we try a weighted ensemble with the old model for the 3\' end predictions? That might preserve sensitivity while keeping the specificity gains in the seed region.', timestamp: '1h ago', reactions: { '👍': ['tm1', 'tm3'] }, isBookmarked: false },
      { id: 'msg4', senderId: 'tm6', senderName: 'Dr. David Kim', content: 'From the drug design perspective, off-target specificity is critical. I\'d prioritize the v2.3 model and flag the 3\' edge cases for manual review in the clinical pipeline.', timestamp: '2h ago', reactions: { '💡': ['tm1'] }, isBookmarked: false },
    ],
  },
  { id: 'th2', title: 'Weekly Lab Meeting Agenda — Jan 20', type: 'Update', preview: 'Agenda items: 1) Nanobody binding affinity results 2) CRISPR model v2.3 update 3) Drug screening Round 2 progress.', participantIds: ['tm1', 'tm2', 'tm3', 'tm5', 'tm6'], unreadCount: 1, lastMessageAt: '45m ago', createdAt: '2025-01-15', isPinned: true, isMuted: false,
    messages: [
      { id: 'msg5', senderId: 'tm1', senderName: 'Dr. Sarah Chen', content: '**Weekly Lab Meeting — Monday Jan 20, 10:00 AM**\n\n1. Nanobody binding affinity results (Dr. Park)\n2. CRISPR model v2.3 update (Dr. Garcia)\n3. Drug screening Round 2 progress (Dr. Kim)\n4. Open discussion', timestamp: '45m ago', reactions: { '👍': ['tm2', 'tm3', 'tm5', 'tm6'] }, isBookmarked: false },
    ],
  },
  { id: 'th3', title: 'AlphaFold3 Multi-Chain Validation Strategy', type: 'Question', preview: 'We need to decide on the validation strategy for multi-chain predictions. Cryo-EM density maps or crosslinking mass spec?', participantIds: ['tm1', 'tm2', 'tm4'], unreadCount: 0, lastMessageAt: '3h ago', createdAt: '2025-01-08', isPinned: false, isMuted: false,
    messages: [
      { id: 'msg6', senderId: 'tm2', senderName: 'Dr. James Park', content: 'Should we use **Cryo-EM density maps** or **crosslinking mass spec** as ground truth for multi-chain validation?', timestamp: '3h ago', reactions: {}, isBookmarked: false },
      { id: 'msg7', senderId: 'tm4', senderName: 'Dr. Wei Zhang', content: 'Both if possible. Cryo-EM gives better structural resolution for the overall fold, but XL-MS is essential for validating inter-chain contacts.', timestamp: '2h ago', reactions: { '👍': ['tm1', 'tm2'] }, isBookmarked: true },
    ],
  },
  { id: 'th4', title: 'Budget Allocation Q2 2025 — Equipment', type: 'Decision', preview: 'The committee approved the cryo-EM time allocation. Final vote: 4 for, 1 against, 0 abstain.', participantIds: ['tm1', 'tm3', 'tm5', 'tm6'], unreadCount: 0, lastMessageAt: '1d ago', createdAt: '2025-01-05', isPinned: false, isMuted: false,
    messages: [
      { id: 'msg8', senderId: 'tm5', senderName: 'Dr. Lisa Wang', content: '**Decision finalized**: Cryo-EM time allocation for Q2 2025 is approved.\n\nVote: 4 for, 1 against, 0 abstain.', timestamp: '1d ago', reactions: { '🎉': ['tm1', 'tm3', 'tm6'] }, isBookmarked: false },
    ],
  },
  { id: 'th5', title: 'Novel Pathway Analysis in Alzheimer\'s Model', type: 'Review', preview: 'The proteomics data from the longitudinal CSF study reveals 3 novel phospho-tau phosphorylation sites.', participantIds: ['tm4', 'tm5', 'tm6'], unreadCount: 5, lastMessageAt: '5m ago', createdAt: '2025-01-12', isPinned: false, isMuted: false,
    messages: [
      { id: 'msg9', senderId: 'tm4', senderName: 'Dr. Wei Zhang', content: 'I\'ve uploaded the proteomics data from the longitudinal CSF study. The phospho-tau analysis reveals **3 novel phosphorylation sites** not previously reported in literature.', timestamp: '5m ago', reactions: { '❤️': ['tm5'], '💡': ['tm6'] }, isBookmarked: true },
      { id: 'msg10', senderId: 'tm6', senderName: 'Dr. David Kim', content: 'The S396 and T403 sites are particularly noteworthy given their proximity to the microtubule binding domain.', timestamp: '20m ago', reactions: {}, isBookmarked: false },
    ],
  },
  { id: 'th6', title: 'GPU Cluster Maintenance — Jan 25-26', type: 'Update', preview: 'HPC team will perform scheduled maintenance. All training jobs should be checkpointed by Friday 5pm.', participantIds: ['tm1', 'tm2', 'tm3'], unreadCount: 0, lastMessageAt: '4h ago', createdAt: '2025-01-16', isPinned: false, isMuted: true,
    messages: [
      { id: 'msg11', senderId: 'tm3', senderName: 'Dr. Maria Garcia', content: '**System maintenance**: GPU cluster maintenance this weekend (Jan 25-26). All training jobs should be **checkpointed by Friday 5 PM**.', timestamp: '4h ago', reactions: { '👍': ['tm1', 'tm2'] }, isBookmarked: false },
    ],
  },
]

const SHARED_RESOURCES: SharedResource[] = [
  { id: 'sr1', title: 'Nanobody Binding Affinity Report Q4 2024', type: 'PDF', icon: '📄', uploadedAt: '2 days ago', size: '4.2 MB', uploaderId: 'tm1', uploaderName: 'Dr. Sarah Chen', project: 'Nanobody Design' },
  { id: 'sr2', title: 'CRISPR Off-Target Validation Dataset v3', type: 'Dataset', icon: '📊', uploadedAt: '1 day ago', size: '128 MB', uploaderId: 'tm3', uploaderName: 'Dr. Maria Garcia', project: 'CRISPR-Cas9' },
  { id: 'sr3', title: 'AlphaFold3 Multi-Chain Prediction Pipeline', type: 'Code', icon: '💻', uploadedAt: '3 days ago', size: '2.1 MB', uploaderId: 'tm2', uploaderName: 'Dr. James Park', project: 'Protein Structure' },
  { id: 'sr4', title: 'Drug Screening Round 2 — Hit Compounds', type: 'Result', icon: '🧪', uploadedAt: '5h ago', size: '56 MB', uploaderId: 'tm6', uploaderName: 'Dr. David Kim', project: 'Drug Discovery' },
  { id: 'sr5', title: 'CSF Proteomics Longitudinal Analysis', type: 'Dataset', icon: '📊', uploadedAt: '1 day ago', size: '89 MB', uploaderId: 'tm4', uploaderName: 'Dr. Wei Zhang', project: "Alzheimer's" },
  { id: 'sr6', title: 'CRISPR Guide RNA Training Notebook', type: 'Notebook', icon: '📓', uploadedAt: '4 days ago', size: '15 MB', uploaderId: 'tm3', uploaderName: 'Dr. Maria Garcia', project: 'CRISPR-Cas9' },
  { id: 'sr7', title: 'ADMET Prediction Model — ADMETlab 3.0', type: 'PDF', icon: '📄', uploadedAt: '6h ago', size: '8.7 MB', uploaderId: 'tm5', uploaderName: 'Dr. Lisa Wang', project: 'Drug Discovery' },
  { id: 'sr8', title: 'Single-Cell RNA-Seq Atlas Processing Scripts', type: 'Code', icon: '💻', uploadedAt: '1 week ago', size: '3.4 MB', uploaderId: 'tm4', uploaderName: 'Dr. Wei Zhang', project: 'Gene Expression' },
]

const DECISIONS: TeamDecision[] = [
  { id: 'dec1', title: 'Adopt AlphaFold3 for Multi-Chain Predictions', description: 'Replace AlphaFold2 with AlphaFold3 for all multi-chain protein complex predictions.', date: '2025-01-15', outcome: 'Approved', votesFor: 4, votesAgainst: 1, votesAbstain: 0, voters: ['Dr. Sarah Chen', 'Dr. James Park', 'Dr. Wei Zhang', 'Dr. Maria Garcia', 'Dr. David Kim'], status: 'Pending' },
  { id: 'dec2', title: 'Cryo-EM Time Allocation Q2 2025', description: 'Allocate 200 hours of cryo-EM facility time for nanobody structural validation.', date: '2025-01-14', outcome: 'Approved', votesFor: 5, votesAgainst: 0, votesAbstain: 0, voters: ['Dr. Sarah Chen', 'Dr. Lisa Wang', 'Dr. James Park', 'Dr. David Kim', 'Dr. Wei Zhang'], status: 'Implemented' },
  { id: 'dec3', title: 'Drug Screening Platform Migration', description: 'Migrate from Schrödinger Glide to OpenEye FRED for virtual screening.', date: '2025-01-12', outcome: 'Rejected', votesFor: 2, votesAgainst: 3, votesAbstain: 0, voters: ['Dr. Lisa Wang', 'Dr. David Kim', 'Dr. Sarah Chen', 'Dr. Wei Zhang', 'Dr. Maria Garcia'], status: 'Overridden' },
  { id: 'dec4', title: 'Publish Preprint on CRISPR Off-Target Model', description: 'Submit the CRISPR off-target prediction model as a preprint on bioRxiv.', date: '2025-01-10', outcome: 'Approved', votesFor: 4, votesAgainst: 0, votesAbstain: 1, voters: ['Dr. Sarah Chen', 'Dr. Maria Garcia', 'Dr. James Park', 'Dr. Wei Zhang', 'Dr. David Kim'], status: 'Pending' },
  { id: 'dec5', title: 'Extend Alzheimer\'s CSF Study by 6 Months', description: 'Request IRB extension for longitudinal CSF biomarker collection.', date: '2025-01-08', outcome: 'Deferred', votesFor: 3, votesAgainst: 1, votesAbstain: 1, voters: ['Dr. Wei Zhang', 'Dr. David Kim', 'Dr. Lisa Wang', 'Dr. Sarah Chen', 'Dr. James Park'], status: 'Pending' },
]

const WEEKLY_SUMMARY: WeeklySummary = {
  messages: 47,
  decisions: 3,
  filesShared: 12,
  meetingsScheduled: 5,
  dailyActivity: [
    { day: 'Mon', count: 14 }, { day: 'Tue', count: 22 }, { day: 'Wed', count: 18 },
    { day: 'Thu', count: 31 }, { day: 'Fri', count: 26 }, { day: 'Sat', count: 8 }, { day: 'Sun', count: 5 },
  ],
}

// ─── Helpers ────────────────────────────────────────────────────

const THREAD_TYPE_COLORS: Record<string, string> = {
  Discussion: '#3b82f6',
  Decision: '#f59e0b',
  Question: '#8b5cf6',
  Update: '#10b981',
  Review: '#06b6d4',
}

const THREAD_TYPE_BG: Record<string, string> = {
  Discussion: 'rgba(59,130,246,0.1)',
  Decision: 'rgba(245,158,11,0.1)',
  Question: 'rgba(139,92,246,0.1)',
  Update: 'rgba(16,185,129,0.1)',
  Review: 'rgba(6,182,212,0.1)',
}

const OUTCOME_STYLES: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
  Approved: { bg: 'rgba(16,185,129,0.12)', color: '#10b981', icon: <CheckCircle2 size={12} /> },
  Rejected: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', icon: <XIcon /> },
  Deferred: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', icon: <Clock size={12} /> },
}

function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
  )
}

const STATUS_DECISION_MAP: Record<string, { bg: string; color: string }> = {
  Implemented: { bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
  Pending: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
  Overridden: { bg: 'rgba(107,114,128,0.1)', color: '#6b7280' },
}

const RESOURCE_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  PDF: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
  Dataset: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6' },
  Code: { bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
  Result: { bg: 'rgba(139,92,246,0.1)', color: '#8b5cf6' },
  Notebook: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
}

const REACTION_EMOJIS = ['👍', '❤️', '🎉', '🤔', '💡']

// ─── Main Component ────────────────────────────────────────────

export default function CollaborationHubPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null)
  const [messageInput, setMessageInput] = useState('')
  const [activeSection, setActiveSection] = useState<'threads' | 'resources' | 'decisions' | null>(null)

  const getMemberById = useCallback((id: string) => {
    return TEAM_MEMBERS.find(m => m.id === id)
  }, [])

  const activeThread = useMemo(() => {
    return THREADS.find(t => t.id === activeThreadId) || null
  }, [activeThreadId])

  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) return THREADS
    const q = searchQuery.toLowerCase()
    return THREADS.filter(t =>
      t.title.toLowerCase().includes(q) || t.preview.toLowerCase().includes(q)
    )
  }, [searchQuery])

  const maxDailyCount = useMemo(() => {
    return Math.max(...WEEKLY_SUMMARY.dailyActivity.map(d => d.count), 1)
  }, [])

  const handleThreadClick = useCallback((threadId: string) => {
    setActiveThreadId(prev => prev === threadId ? null : threadId)
  }, [])

  const handleMemberClick = useCallback((memberId: string) => {
    setExpandedMemberId(prev => prev === memberId ? null : memberId)
  }, [])

  const handleReaction = useCallback((msgId: string, emoji: string) => {
    // Toggle reaction (mock)
    void msgId
    void emoji
  }, [])

  const renderMemberAvatar = (member: TeamMember, size: number = 56) => (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto 10px' }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: member.avatarColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.32, fontWeight: 700, color: '#fff',
        boxShadow: `0 4px 12px ${member.avatarColor}40`,
      }}>
        {member.initials}
      </div>
      <div style={{
        position: 'absolute', bottom: 1, right: 1,
        width: size > 40 ? 14 : 10, height: size > 40 ? 14 : 10,
        borderRadius: '50%', border: `3px solid var(--vl-bg-card, #fff)`,
        background: member.status === 'online' ? '#10b981' : member.status === 'away' ? '#f59e0b' : '#6b7280',
        boxShadow: member.status === 'online' ? '0 0 6px rgba(16,185,129,0.6)' : 'none',
      }} />
    </div>
  )

  const renderThreadAvatars = (participantIds: string[]) => {
    return (
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {participantIds.slice(0, 4).map((pid, i) => {
          const member = getMemberById(pid)
          if (!member) return null
          return (
            <div key={pid} style={{
              width: 26, height: 26, borderRadius: '50%',
              background: member.avatarColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 600, color: '#fff',
              marginLeft: i > 0 ? -7 : 0,
              border: '2px solid var(--vl-bg-card, #fff)',
              position: 'relative', zIndex: participantIds.length - i,
            }} title={member.name}>
              {member.initials}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--vl-bg-primary)', color: 'var(--vl-text-primary)' }}>
      {/* ── Header ── */}
      <header className="ch-header">
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: 'linear-gradient(135deg, #10b981, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(16,185,129,0.3)',
            }}>
              <Users size={20} color="#fff" />
            </div>
            <div>
              <h1 style={{
                fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: '-0.5px',
                background: 'linear-gradient(135deg, var(--vl-text-primary), var(--vl-accent))',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>Collaboration Hub</h1>
              <p style={{ fontSize: 13, color: 'var(--vl-text-muted)', margin: '2px 0 0' }}>
                Your team&apos;s command center for research coordination
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
            <div className="ch-search-bar" style={{ flex: 1, minWidth: 200, maxWidth: 400 }}>
              <Search size={15} style={{ color: 'var(--vl-text-muted)', flexShrink: 0 }} />
              <input placeholder="Search threads, members, resources..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <button className="ch-new-thread-btn">
              <Plus size={15} /> New Thread
            </button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px' }}>
        {/* ── Team Pulse Widget ── */}
        <section className="ch-section-card" style={{ marginBottom: 24 }}>
          <div className="ch-section-header">
            <h2 className="ch-section-title"><Sparkles size={16} color="#10b981" /> Team Pulse</h2>
            <span style={{ fontSize: 12, color: 'var(--vl-text-muted)' }}>
              {TEAM_MEMBERS.filter(m => m.status === 'online').length} online · {TEAM_MEMBERS.filter(m => m.status === 'away').length} away
            </span>
          </div>
          <div className="ch-section-body">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 14,
            }}>
              {TEAM_MEMBERS.map(member => (
                <div key={member.id} className="ch-member-card" style={{ '--member-color': member.avatarColor } as React.CSSProperties} onClick={() => handleMemberClick(member.id)}>
                  {renderMemberAvatar(member)}
                  <p className="ch-member-name">{member.name}</p>
                  <span className="ch-role-badge" style={{ background: `${member.avatarColor}15`, color: member.avatarColor }}>{member.role}</span>
                  <p className="ch-activity-text">{member.activityText}</p>
                  {expandedMemberId === member.id && (
                    <div className="ch-mini-profile ch-mini-profile-visible" onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: member.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>{member.initials}</div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{member.name}</p>
                          <p style={{ fontSize: 11, color: 'var(--vl-text-muted)', margin: 0 }}>{member.department}</p>
                        </div>
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--vl-text-secondary)', margin: '0 0 6px', lineHeight: 1.5 }}>{member.bio}</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--vl-text-muted)' }}>
                        <span>{member.email}</span>
                        <span>{member.recentContributions} contributions</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Main Content: Threads + Detail / Side panel ── */}
        <div style={{ display: 'grid', gridTemplateColumns: activeThread ? '1fr 1fr' : '1fr', gap: 20, marginBottom: 24, transition: 'all 0.3s ease' }}>
          {/* Active Threads Panel */}
          <section className="ch-section-card">
            <div className="ch-section-header">
              <h2 className="ch-section-title"><MessageSquare size={16} color="#3b82f6" /> Active Threads</h2>
              <span style={{ fontSize: 12, color: 'var(--vl-text-muted)' }}>{filteredThreads.length} threads</span>
            </div>
            <div className="ch-section-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredThreads.map(thread => {
                const typeColor = THREAD_TYPE_COLORS[thread.type] || '#6b7280'
                return (
                  <div key={thread.id} className="ch-thread-card" style={{ '--thread-color': typeColor } as React.CSSProperties} onClick={() => handleThreadClick(thread.id)}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <span className="ch-thread-type-badge" style={{ background: THREAD_TYPE_BG[thread.type] || '#f3f4f6', color: typeColor }}>{thread.type}</span>
                          {thread.isPinned && <Pin size={11} style={{ color: 'var(--vl-text-muted)' }} />}
                          {thread.isMuted && <BellOff size={11} style={{ color: 'var(--vl-text-muted)' }} />}
                        </div>
                        <p className="ch-thread-title">{thread.title}</p>
                        <p className="ch-thread-preview">{thread.preview}</p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                          {renderThreadAvatars(thread.participantIds)}
                          <span className="ch-thread-timestamp">{thread.lastMessageAt}</span>
                        </div>
                      </div>
                      {thread.unreadCount > 0 && (
                        <div className="ch-thread-unread">{thread.unreadCount}</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Thread Detail View */}
          {activeThread && (
            <section className="ch-thread-detail ch-animated-in">
              <div className="ch-thread-detail-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span className="ch-thread-type-badge" style={{ background: THREAD_TYPE_BG[activeThread.type], color: THREAD_TYPE_COLORS[activeThread.type] }}>{activeThread.type}</span>
                  <span style={{ fontSize: 12, color: 'var(--vl-text-muted)' }}>Created {activeThread.createdAt}</span>
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>{activeThread.title}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {renderThreadAvatars(activeThread.participantIds)}
                  <span style={{ fontSize: 12, color: 'var(--vl-text-muted)' }}>{activeThread.participantIds.length} participants</span>
                </div>
              </div>
              <div className="ch-message-list">
                {activeThread.messages.map(msg => {
                  const sender = getMemberById(msg.senderId)
                  return (
                    <div key={msg.id} className="ch-message-item">
                      <div className="ch-message-avatar" style={{ background: sender?.avatarColor || '#6b7280' }}>
                        {sender?.initials || '??'}
                      </div>
                      <div className="ch-message-content">
                        <div>
                          <span className="ch-message-sender">{msg.senderName}</span>
                          <span className="ch-message-time">{msg.timestamp}</span>
                        </div>
                        <div className="ch-message-text" style={{ whiteSpace: 'pre-wrap' }}>
                          {msg.content.split('\n').map((line, i) => {
                            const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
                            return (
                              <p key={i}>
                                {parts.map((part, j) => {
                                  if (part.startsWith('**') && part.endsWith('**')) return <strong key={j}>{part.slice(2, -2)}</strong>
                                  if (part.startsWith('`') && part.endsWith('`')) return <code key={j}>{part.slice(1, -1)}</code>
                                  return <React.Fragment key={j}>{part}</React.Fragment>
                                })}
                              </p>
                            )
                          })}
                        </div>
                        <div className="ch-reactions-row">
                          {Object.entries(msg.reactions).map(([emoji, users]) => (
                            <span key={emoji} className="ch-reaction-badge ch-reaction-badge-active" onClick={() => handleReaction(msg.id, emoji)}>
                              {emoji} {users.length}
                            </span>
                          ))}
                          {REACTION_EMOJIS.filter(e => !Object.keys(msg.reactions).includes(e)).slice(0, 2).map(emoji => (
                            <span key={emoji} className="ch-reaction-badge" onClick={() => handleReaction(msg.id, emoji)} style={{ opacity: 0.5 }}>
                              {emoji}
                            </span>
                          ))}
                        </div>
                        <div className="ch-message-actions">
                          <button className="ch-message-action-btn"><Reply size={11} /> Reply</button>
                          <button className="ch-message-action-btn"><Bookmark size={11} /> {msg.isBookmarked ? 'Saved' : 'Save'}</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="ch-thread-actions-bar">
                {[
                  { icon: <Pin size={13} />, label: 'Pin' },
                  { icon: <Archive size={13} />, label: 'Archive' },
                  { icon: <BellOff size={13} />, label: 'Mute' },
                  { icon: <Share2 size={13} />, label: 'Share' },
                  { icon: <CheckCircle2 size={13} />, label: 'Mark Resolved' },
                ].map(action => (
                  <button key={action.label} className="ch-thread-action-btn">{action.icon} {action.label}</button>
                ))}
              </div>
              <div className="ch-message-input-area">
                <div className="ch-formatting-toolbar">
                  {[{ icon: <Bold size={14} />, title: 'Bold' }, { icon: <Italic size={14} />, title: 'Italic' }, { icon: <Code size={14} />, title: 'Code' }, { icon: <Link size={14} />, title: 'Link' }, { icon: <List size={14} />, title: 'List' }].map(btn => (
                    <button key={btn.title} className="ch-format-btn" title={btn.title}>{btn.icon}</button>
                  ))}
                </div>
                <textarea className="ch-message-input" placeholder="Write a message..." value={messageInput} onChange={e => setMessageInput(e.target.value)} rows={2} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <button className="ch-send-btn"><Send size={14} /> Send</button>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* ── Bottom Section: Resources + Decisions + Quick Actions ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 24 }}>
          {/* Shared Resources */}
          <section className="ch-section-card">
            <div className="ch-section-header">
              <h2 className="ch-section-title"><FileText size={16} color="#8b5cf6" /> Shared Resources</h2>
              <span style={{ fontSize: 12, color: 'var(--vl-text-muted)' }}>{SHARED_RESOURCES.length} files</span>
            </div>
            <div className="ch-section-body">
              <div className="ch-resource-grid">
                {SHARED_RESOURCES.map(resource => {
                  const typeStyle = RESOURCE_TYPE_COLORS[resource.type] || { bg: '#f3f4f6', color: '#6b7280' }
                  const uploader = getMemberById(resource.uploaderId)
                  return (
                    <div key={resource.id} className="ch-resource-card">
                      <div className="ch-resource-icon" style={{ background: typeStyle.bg, color: typeStyle.color }}>
                        <span style={{ fontSize: 20 }}>{resource.icon}</span>
                      </div>
                      <p className="ch-resource-title">{resource.title}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span className="ch-resource-type-badge" style={{ background: typeStyle.bg, color: typeStyle.color }}>{resource.type}</span>
                        <span className="ch-resource-meta">{resource.size}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {uploader && (
                            <div style={{ width: 18, height: 18, borderRadius: '50%', background: uploader.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 600, color: '#fff' }}>{uploader.initials}</div>
                          )}
                          <span className="ch-resource-meta">{resource.uploaderName}</span>
                        </div>
                        <span className="ch-resource-meta">{resource.uploadedAt}</span>
                      </div>
                    </div>
                  )
                })}
                {/* Upload zone */}
                <div className="ch-upload-zone">
                  <Upload size={28} style={{ color: 'var(--vl-text-muted)', marginBottom: 8 }} />
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--vl-text-secondary)', margin: '0 0 4px' }}>Upload Resource</p>
                  <p style={{ fontSize: 11, color: 'var(--vl-text-muted)', margin: 0 }}>Drag & drop or click to browse</p>
                </div>
              </div>
            </div>
          </section>

          {/* Right Column: Decisions + Quick Actions + Activity Summary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Quick Actions */}
            <div className="ch-section-card">
              <div className="ch-section-header" style={{ padding: '14px 20px' }}>
                <h2 className="ch-section-title" style={{ fontSize: 14 }}><ZapIcon /> Quick Actions</h2>
              </div>
              <div style={{ padding: '0 16px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { icon: <Calendar size={20} />, label: 'Schedule Meeting', gradient: 'linear-gradient(135deg, #10b981, #06b6d4)', color: '#10b981' },
                  { icon: <VoteStar size={20} />, label: 'Create Poll', gradient: 'linear-gradient(135deg, #8b5cf6, #ec4899)', color: '#8b5cf6' },
                  { icon: <Bell size={20} />, label: 'Share Update', gradient: 'linear-gradient(135deg, #3b82f6, #06b6d4)', color: '#3b82f6' },
                  { icon: <BookOpen size={20} />, label: 'Request Review', gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: '#f59e0b' },
                ].map(action => (
                  <button key={action.label} className="ch-quick-action-btn" onMouseEnter={e => { e.currentTarget.style.background = action.gradient; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'transparent' }} onMouseLeave={e => { e.currentTarget.style.background = 'var(--vl-bg-card)'; e.currentTarget.style.color = 'var(--vl-text-primary)'; e.currentTarget.style.borderColor = 'var(--vl-border)' }}>
                    <div className="ch-quick-action-icon" style={{ background: `${action.color}15`, color: action.color }}>{action.icon}</div>
                    <span className="ch-quick-action-label">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Activity Summary Widget */}
            <div className="ch-activity-summary">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BarChart3 size={15} color="#10b981" /> This Week
                </h3>
              </div>
              {[
                { label: 'Messages', value: WEEKLY_SUMMARY.messages, icon: <MessageSquare size={14} />, color: '#3b82f6' },
                { label: 'Decisions', value: WEEKLY_SUMMARY.decisions, icon: <CheckCircle2 size={14} />, color: '#f59e0b' },
                { label: 'Files shared', value: WEEKLY_SUMMARY.filesShared, icon: <Upload size={14} />, color: '#8b5cf6' },
                { label: 'Meetings scheduled', value: WEEKLY_SUMMARY.meetingsScheduled, icon: <Calendar size={14} />, color: '#10b981' },
              ].map(stat => (
                <div key={stat.label} className="ch-summary-stat">
                  <div className="ch-summary-stat-icon" style={{ background: `${stat.color}15`, color: stat.color }}>{stat.icon}</div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 12, color: 'var(--vl-text-muted)' }}>{stat.label}</span>
                  </div>
                  <span style={{ fontSize: 16, fontWeight: 700, color: stat.color }}>{stat.value}</span>
                </div>
              ))}
              {/* Mini bar chart */}
              <div className="ch-mini-bar-chart">
                {WEEKLY_SUMMARY.dailyActivity.map(day => (
                  <div key={day.day} className="ch-mini-bar" style={{
                    height: `${(day.count / maxDailyCount) * 100}%`,
                    background: 'linear-gradient(180deg, #10b981, #06b6d4)',
                    opacity: 0.4 + (day.count / maxDailyCount) * 0.6,
                  }} title={`${day.day}: ${day.count} activities`} />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                {WEEKLY_SUMMARY.dailyActivity.map(day => (
                  <span key={day.day} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: 'var(--vl-text-muted)' }}>{day.day.charAt(0)}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Team Decisions Log ── */}
        <section className="ch-section-card" style={{ marginBottom: 24 }}>
          <div className="ch-section-header">
            <h2 className="ch-section-title"><CheckCircle2 size={16} color="#f59e0b" /> Team Decisions Log</h2>
            <span style={{ fontSize: 12, color: 'var(--vl-text-muted)' }}>{DECISIONS.length} recent decisions</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14, padding: '16px 20px' }}>
            {DECISIONS.map(decision => {
              const totalVotes = decision.votesFor + decision.votesAgainst + decision.votesAbstain
              const outcomeStyle = OUTCOME_STYLES[decision.outcome]
              const statusStyle = STATUS_DECISION_MAP[decision.status]
              return (
                <div key={decision.id} className="ch-decision-card">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                    <p className="ch-decision-title">{decision.title}</p>
                    <span className="ch-outcome-badge" style={{ background: outcomeStyle.bg, color: outcomeStyle.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {outcomeStyle.icon} {decision.outcome}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--vl-text-muted)', margin: '0 0 8px', lineHeight: 1.4 }}>
                    {decision.description}
                  </p>
                  {/* Vote visualization */}
                  <div className="ch-vote-bar">
                    <div className="ch-vote-for" style={{ width: `${(decision.votesFor / totalVotes) * 100}%` }} />
                    <div className="ch-vote-against" style={{ width: `${(decision.votesAgainst / totalVotes) * 100}%` }} />
                    <div className="ch-vote-abstain" style={{ width: `${(decision.votesAbstain / totalVotes) * 100}%` }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                    <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                      <span style={{ color: '#10b981' }}>For: {decision.votesFor}</span>
                      <span style={{ color: '#ef4444' }}>Against: {decision.votesAgainst}</span>
                      <span style={{ color: '#6b7280' }}>Abstain: {decision.votesAbstain}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="ch-decision-status-badge" style={{ background: statusStyle.bg, color: statusStyle.color }}>{decision.status}</span>
                      <span style={{ fontSize: 11, color: 'var(--vl-text-muted)' }}>{decision.date}</span>
                    </div>
                  </div>
                  {/* Voter avatars */}
                  <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                    {decision.voters.map(voter => {
                      const member = TEAM_MEMBERS.find(m => m.name === voter)
                      return (
                        <div key={voter} style={{
                          width: 22, height: 22, borderRadius: '50%',
                          background: member?.avatarColor || '#6b7280',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 8, fontWeight: 600, color: '#fff',
                        }} title={voter}>{member?.initials || voter.split(' ').map(n => n[0]).join('')}</div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}

function ZapIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>
}

function VoteStar({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
}
