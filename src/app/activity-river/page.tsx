'use client'

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  Activity, Search, Pause, Play, ChevronDown, ChevronUp,
  Filter, MessageSquare, Gavel, Upload, Calendar,
  Star, CheckCircle2, Settings, AtSign, ChevronRight,
  BarChart3, Users, Flame, TrendingUp, X, Sparkles,
  Clock, FileText, Code, Beaker, Eye, ThumbsUp,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────

type ActivityType = 'message' | 'decision' | 'upload' | 'meeting' | 'review' | 'completion' | 'system'

interface ActivityItem {
  id: string
  type: ActivityType
  actorId: string
  actorName: string
  actorInitials: string
  actorColor: string
  action: string
  target: string
  targetLink: string
  preview: string
  relativeTime: string
  absoluteTime: string
  channel: string
  project: string | null
  priority: 'high' | 'medium' | 'low' | null
  isMention: boolean
  metadata?: Record<string, unknown>
}

interface AnalyticsBreakdown {
  type: string
  count: number
  color: string
}

interface TopContributor {
  name: string
  initials: string
  color: string
  count: number
}

interface VelocityPoint {
  day: string
  count: number
}

// ─── Mock Data ──────────────────────────────────────────────────

const ACTIVITIES: ActivityItem[] = [
  { id: 'a1', type: 'message', actorId: 'u1', actorName: 'Dr. Sarah Chen', actorInitials: 'SC', actorColor: '#10b981', action: 'posted in', target: 'CRISPR Off-Target Model Discussion', targetLink: '#', preview: 'Has anyone tested the new off-target scoring function on the HEK293 validation set? Seeing improved specificity but reduced sensitivity.', relativeTime: 'just now', absoluteTime: '2:34 PM', channel: '#crispr-team', project: 'CRISPR-Cas9', priority: 'high', isMention: true },
  { id: 'a2', type: 'upload', actorId: 'u2', actorName: 'Dr. Maria Garcia', actorInitials: 'MG', actorColor: '#8b5cf6', action: 'uploaded', target: 'CRISPR Off-Target Validation Dataset v3', targetLink: '#', preview: '128 MB — HEK293 + K562 cell line validation data with ground truth off-target annotations', relativeTime: '2m ago', absoluteTime: '2:32 PM', channel: '#data-sharing', project: 'CRISPR-Cas9', priority: null, isMention: false },
  { id: 'a3', type: 'message', actorId: 'u3', actorName: 'Dr. James Park', actorInitials: 'JP', actorColor: '#06b6d4', action: 'commented on', target: 'AlphaFold3 Multi-Chain Pipeline', targetLink: '#', preview: 'The pLDDT scores for the interface region are above 90, which gives us confidence in the predicted binding mode.', relativeTime: '5m ago', absoluteTime: '2:29 PM', channel: '#structural-bio', project: 'Protein Structure', priority: 'medium', isMention: false },
  { id: 'a4', type: 'decision', actorId: 'u1', actorName: 'Dr. Sarah Chen', actorInitials: 'SC', actorColor: '#10b981', action: 'decided on', target: 'Adopt AlphaFold3 for Multi-Chain', targetLink: '#', preview: 'Vote: 4 for, 1 against. AlphaFold3 will replace AlphaFold2 for all multi-chain protein complex predictions.', relativeTime: '12m ago', absoluteTime: '2:22 PM', channel: '#team-decisions', project: 'Protein Structure', priority: 'high', isMention: true, metadata: { votesFor: 4, votesAgainst: 1, votesAbstain: 0 } },
  { id: 'a5', type: 'upload', actorId: 'u4', actorName: 'Dr. David Kim', actorInitials: 'DK', actorColor: '#ef4444', action: 'uploaded', target: 'Drug Screening Round 2 — Hit Compounds', targetLink: '#', preview: '56 MB — 47 hit compounds from virtual screen with ADMET scores and docking poses', relativeTime: '18m ago', absoluteTime: '2:16 PM', channel: '#drug-discovery', project: 'Drug Discovery', priority: 'high', isMention: false },
  { id: 'a6', type: 'meeting', actorId: 'u5', actorName: 'Dr. Lisa Wang', actorInitials: 'LW', actorColor: '#ec4899', action: 'scheduled', target: 'Drug Screening Review Meeting', targetLink: '#', preview: 'Monday Jan 20, 2:00 PM — Review Round 2 hit compounds and prioritize for experimental validation', relativeTime: '25m ago', absoluteTime: '2:09 PM', channel: '#meetings', project: 'Drug Discovery', priority: 'medium', isMention: false, metadata: { participantCount: 5, duration: '60min' } },
  { id: 'a7', type: 'review', actorId: 'u6', actorName: 'Dr. Wei Zhang', actorInitials: 'WZ', actorColor: '#f59e0b', action: 'reviewed', target: 'CSF Proteomics Analysis Notebook', targetLink: '#', preview: 'Excellent analysis. The novel phospho-tau sites (S396, T403, S422) should be highlighted in the manuscript discussion.', relativeTime: '32m ago', absoluteTime: '2:02 PM', channel: '#reviews', project: "Alzheimer's", priority: 'medium', isMention: true, metadata: { rating: 5 } },
  { id: 'a8', type: 'completion', actorId: 'u2', actorName: 'Dr. Maria Garcia', actorInitials: 'MG', actorColor: '#8b5cf6', action: 'completed', target: 'CRISPR Model v2.3 Training Run', targetLink: '#', preview: 'Training complete — 98.2% accuracy on held-out test set. Model artifacts uploaded to shared storage.', relativeTime: '45m ago', absoluteTime: '1:49 PM', channel: '#pipeline', project: 'CRISPR-Cas9', priority: 'high', isMention: false, metadata: { progress: 100 } },
  { id: 'a9', type: 'message', actorId: 'u3', actorName: 'Dr. James Park', actorInitials: 'JP', actorColor: '#06b6d4', action: 'mentioned you in', target: 'Nanobody Design Sync', targetLink: '#', preview: 'Can you check the RMSD values for the top 5 nanobody candidates against the cryo-EM structure?', relativeTime: '1h ago', absoluteTime: '1:34 PM', channel: '#nanobody-team', project: 'Nanobody Design', priority: 'medium', isMention: true },
  { id: 'a10', type: 'system', actorId: 'sys', actorName: 'System', actorInitials: '', actorColor: '#6b7280', action: 'auto-archived', target: 'GPU Cluster Maintenance Thread', targetLink: '', preview: 'Thread auto-archived after 30 days of inactivity. Archived content remains searchable.', relativeTime: '1h ago', absoluteTime: '1:30 PM', channel: '#system', project: null, priority: null, isMention: false },
  { id: 'a11', type: 'upload', actorId: 'u4', actorName: 'Dr. David Kim', actorInitials: 'DK', actorColor: '#ef4444', action: 'uploaded', target: 'ADMET Prediction Model Report', targetLink: '#', preview: '8.7 MB — Comprehensive ADMETlab 3.0 predictions for top 200 drug candidates', relativeTime: '1h ago', absoluteTime: '1:28 PM', channel: '#data-sharing', project: 'Drug Discovery', priority: null, isMention: false },
  { id: 'a12', type: 'decision', actorId: 'u5', actorName: 'Dr. Lisa Wang', actorInitials: 'LW', actorColor: '#ec4899', action: 'decided on', target: 'Cryo-EM Time Allocation Q2 2025', targetLink: '#', preview: 'Vote: 5 for, 0 against. 200 hours of cryo-EM facility time approved for nanobody structural validation.', relativeTime: '2h ago', absoluteTime: '12:45 PM', channel: '#team-decisions', project: 'Nanobody Design', priority: 'high', isMention: false, metadata: { votesFor: 5, votesAgainst: 0, votesAbstain: 0 } },
  { id: 'a13', type: 'message', actorId: 'u6', actorName: 'Dr. Wei Zhang', actorInitials: 'WZ', actorColor: '#f59e0b', action: 'posted in', target: 'Gene Expression Analysis', targetLink: '#', preview: 'The differential expression analysis identified 342 significantly upregulated genes in the treatment group (FDR < 0.05).', relativeTime: '2h ago', absoluteTime: '12:30 PM', channel: '#genomics', project: 'Gene Expression', priority: null, isMention: false },
  { id: 'a14', type: 'meeting', actorId: 'u1', actorName: 'Dr. Sarah Chen', actorInitials: 'SC', actorColor: '#10b981', action: 'scheduled', target: 'Weekly Lab Meeting — Jan 20', targetLink: '#', preview: 'Monday 10:00 AM — Agenda: Nanobody results, CRISPR update, Drug screening progress', relativeTime: '2h ago', absoluteTime: '12:15 PM', channel: '#meetings', project: null, priority: 'medium', isMention: false, metadata: { participantCount: 8, duration: '90min' } },
  { id: 'a15', type: 'completion', actorId: 'u3', actorName: 'Dr. James Park', actorInitials: 'JP', actorColor: '#06b6d4', action: 'completed', target: 'Rosetta Scoring Integration', targetLink: '#', preview: 'Rosetta energy scoring pipeline integrated with AlphaFold3 predictions. Validated on 12 benchmark complexes.', relativeTime: '3h ago', absoluteTime: '11:30 AM', channel: '#pipeline', project: 'Protein Structure', priority: null, isMention: false, metadata: { progress: 100 } },
  { id: 'a16', type: 'review', actorId: 'u1', actorName: 'Dr. Sarah Chen', actorInitials: 'SC', actorColor: '#10b981', action: 'reviewed', target: 'Nanobody Binding Affinity Report', targetLink: '#', preview: 'The KD values for the top 3 nanobodies are in the sub-nanomolar range. Recommend for preprint submission.', relativeTime: '3h ago', absoluteTime: '11:15 AM', channel: '#reviews', project: 'Nanobody Design', priority: 'high', isMention: false, metadata: { rating: 5 } },
  { id: 'a17', type: 'message', actorId: 'u2', actorName: 'Dr. Maria Garcia', actorInitials: 'MG', actorColor: '#8b5cf6', action: 'posted in', target: 'ML Model Performance Tracking', targetLink: '#', preview: 'The transformer-based model shows 15% improvement over the CNN baseline on guide RNA efficacy prediction.', relativeTime: '4h ago', absoluteTime: '10:30 AM', channel: '#ml-team', project: 'CRISPR-Cas9', priority: null, isMention: false },
  { id: 'a18', type: 'upload', actorId: 'u6', actorName: 'Dr. Wei Zhang', actorInitials: 'WZ', actorColor: '#f59e0b', action: 'uploaded', target: 'CSF Proteomics Longitudinal Dataset', targetLink: '#', preview: '89 MB — 18-month longitudinal CSF proteomics data from 120 Alzheimer\'s patients', relativeTime: '4h ago', absoluteTime: '10:20 AM', channel: '#data-sharing', project: "Alzheimer's", priority: null, isMention: false },
  { id: 'a19', type: 'decision', actorId: 'u4', actorName: 'Dr. David Kim', actorInitials: 'DK', actorColor: '#ef4444', action: 'decided on', target: 'Drug Screening Platform Migration', targetLink: '#', preview: 'Vote: 2 for, 3 against. Schrödinger Glide will remain the primary screening tool.', relativeTime: '5h ago', absoluteTime: '9:30 AM', channel: '#team-decisions', project: 'Drug Discovery', priority: 'medium', isMention: false, metadata: { votesFor: 2, votesAgainst: 3, votesAbstain: 0 } },
  { id: 'a20', type: 'message', actorId: 'u5', actorName: 'Dr. Lisa Wang', actorInitials: 'LW', actorColor: '#ec4899', action: 'posted in', target: 'Virtual Screening Results', targetLink: '#', preview: 'The virtual screen identified 47 compounds with docking scores below -8.0 kcal/mol. Top 10 show favorable ADMET profiles.', relativeTime: '5h ago', absoluteTime: '9:15 AM', channel: '#drug-discovery', project: 'Drug Discovery', priority: null, isMention: true },
  { id: 'a21', type: 'meeting', actorId: 'u6', actorName: 'Dr. Wei Zhang', actorInitials: 'WZ', actorColor: '#f59e0b', action: 'scheduled', target: 'Genomics Data Review Session', targetLink: '#', preview: 'Tuesday Jan 21, 3:00 PM — Review scRNA-seq atlas progress and plan for remaining tissues', relativeTime: '6h ago', absoluteTime: '8:30 AM', channel: '#meetings', project: 'Gene Expression', priority: null, isMention: false, metadata: { participantCount: 4, duration: '45min' } },
  { id: 'a22', type: 'completion', actorId: 'u4', actorName: 'Dr. David Kim', actorInitials: 'DK', actorColor: '#ef4444', action: 'completed', target: 'ADMET Screening Round 2', targetLink: '#', preview: 'All 200 compounds screened through ADMETlab 3.0. 156 passed preliminary ADMET filters.', relativeTime: '6h ago', absoluteTime: '8:15 AM', channel: '#pipeline', project: 'Drug Discovery', priority: null, isMention: false, metadata: { progress: 100 } },
  { id: 'a23', type: 'system', actorId: 'sys', actorName: 'System', actorInitials: '', actorColor: '#6b7280', action: 'detected', target: 'New Publication Alert', targetLink: '', preview: 'Nature Methods published "Improved multi-chain protein structure prediction with AlphaFold3" — relevant to your work.', relativeTime: '7h ago', absoluteTime: '7:30 AM', channel: '#system', project: null, priority: 'low', isMention: false },
  { id: 'a24', type: 'review', actorId: 'u5', actorName: 'Dr. Lisa Wang', actorInitials: 'LW', actorColor: '#ec4899', action: 'reviewed', target: 'ADMETlab 3.0 Validation Report', targetLink: '#', preview: 'Cross-validation results show strong concordance with experimental ADMET data (R² = 0.87).', relativeTime: '8h ago', absoluteTime: '6:45 AM', channel: '#reviews', project: 'Drug Discovery', priority: null, isMention: false, metadata: { rating: 4 } },
  { id: 'a25', type: 'message', actorId: 'u1', actorName: 'Dr. Sarah Chen', actorInitials: 'SC', actorColor: '#10b981', action: 'posted in', target: 'Lab Safety Protocols Update', targetLink: '#', preview: 'Updated BSL-2 protocols for handling viral vectors. All team members must review by Jan 24.', relativeTime: '9h ago', absoluteTime: '5:30 AM', channel: '#general', project: null, priority: 'high', isMention: false },
  { id: 'a26', type: 'upload', actorId: 'u3', actorName: 'Dr. James Park', actorInitials: 'JP', actorColor: '#06b6d4', action: 'uploaded', target: 'Rosetta Pipeline Integration Scripts', targetLink: '#', preview: '2.1 MB — Python scripts for Rosetta energy scoring with AlphaFold3 outputs', relativeTime: '10h ago', absoluteTime: '4:30 AM', channel: '#code-sharing', project: 'Protein Structure', priority: null, isMention: false },
  { id: 'a27', type: 'decision', actorId: 'u6', actorName: 'Dr. Wei Zhang', actorInitials: 'WZ', actorColor: '#f59e0b', action: 'decided on', target: 'Extend Alzheimer\'s CSF Study', targetLink: '#', preview: 'Vote: 3 for, 1 against, 1 abstain. IRB extension request deferred pending additional funding.', relativeTime: '12h ago', absoluteTime: '2:30 AM', channel: '#team-decisions', project: "Alzheimer's", priority: 'medium', isMention: false, metadata: { votesFor: 3, votesAgainst: 1, votesAbstain: 1 } },
  { id: 'a28', type: 'meeting', actorId: 'u2', actorName: 'Dr. Maria Garcia', actorInitials: 'MG', actorColor: '#8b5cf6', action: 'joined', target: 'ML Pipeline Architecture Review', targetLink: '#', preview: 'Joined cross-team ML architecture review for model serving infrastructure optimization.', relativeTime: '14h ago', absoluteTime: '12:30 AM', channel: '#meetings', project: null, priority: null, isMention: false, metadata: { participantCount: 12, duration: '120min' } },
  { id: 'a29', type: 'message', actorId: 'u4', actorName: 'Dr. David Kim', actorInitials: 'DK', actorColor: '#ef4444', action: 'posted in', target: 'Compound Library Update', targetLink: '#', preview: 'Added 500 new natural product derivatives to the screening library. Library now contains 12,000+ compounds.', relativeTime: '16h ago', absoluteTime: '10:30 PM', channel: '#drug-discovery', project: 'Drug Discovery', priority: null, isMention: false },
  { id: 'a30', type: 'system', actorId: 'sys', actorName: 'System', actorInitials: '', actorColor: '#6b7280', action: 'backed up', target: 'Weekly Data Snapshot', targetLink: '', preview: 'Automated weekly backup completed. 2.4 TB of research data securely archived to cold storage.', relativeTime: '18h ago', absoluteTime: '8:30 PM', channel: '#system', project: null, priority: null, isMention: false },
  { id: 'a31', type: 'completion', actorId: 'u6', actorName: 'Dr. Wei Zhang', actorInitials: 'WZ', actorColor: '#f59e0b', action: 'completed', target: 'Tissue Atlas Processing Batch 5', targetLink: '#', preview: 'Batch 5 complete. 8 new tissue types processed and QC-passed for the single-cell RNA-seq atlas.', relativeTime: '20h ago', absoluteTime: '6:30 PM', channel: '#pipeline', project: 'Gene Expression', priority: null, isMention: false, metadata: { progress: 100 } },
  { id: 'a32', type: 'message', actorId: 'u3', actorName: 'Dr. James Park', actorInitials: 'JP', actorColor: '#06b6d4', action: 'posted in', target: 'Structural Validation Results', targetLink: '#', preview: 'Cryo-EM density maps for the nanobody-antigen complex show excellent fit (CCmask = 0.89).', relativeTime: '22h ago', absoluteTime: '4:30 PM', channel: '#structural-bio', project: 'Nanobody Design', priority: null, isMention: false },
  { id: 'a33', type: 'review', actorId: 'u2', actorName: 'Dr. Maria Garcia', actorInitials: 'MG', actorColor: '#8b5cf6', action: 'reviewed', target: 'CRISPR Guide RNA Training Notebook', targetLink: '#', preview: 'Well-structured. Suggest adding hyperparameter sensitivity analysis and cross-cell-line validation.', relativeTime: '1d ago', absoluteTime: 'Yesterday 3:15 PM', channel: '#reviews', project: 'CRISPR-Cas9', priority: null, isMention: false, metadata: { rating: 4 } },
]

const ANALYTICS_BREAKDOWN: AnalyticsBreakdown[] = [
  { type: 'Messages', count: 142, color: '#3b82f6' },
  { type: 'Decisions', count: 18, color: '#f59e0b' },
  { type: 'Uploads', count: 67, color: '#8b5cf6' },
  { type: 'Meetings', count: 24, color: '#10b981' },
  { type: 'Reviews', count: 31, color: '#06b6d4' },
  { type: 'Completions', count: 45, color: '#22c55e' },
]

const TOP_CONTRIBUTORS: TopContributor[] = [
  { name: 'Dr. Sarah Chen', initials: 'SC', color: '#10b981', count: 89 },
  { name: 'Dr. Maria Garcia', initials: 'MG', color: '#8b5cf6', count: 76 },
  { name: 'Dr. Wei Zhang', initials: 'WZ', color: '#f59e0b', count: 64 },
  { name: 'Dr. James Park', initials: 'JP', color: '#06b6d4', count: 58 },
  { name: 'Dr. David Kim', initials: 'DK', color: '#ef4444', count: 47 },
]

function generateHeatmap(): number[][] {
  const heatmap: number[][] = []
  for (let d = 0; d < 7; d++) {
    const row: number[] = []
    for (let h = 0; h < 24; h++) {
      let base = 0
      if (h >= 9 && h <= 17) base = 5 + Math.floor(Math.random() * 8)
      else if ((h >= 7 && h < 9) || (h > 17 && h <= 20)) base = 1 + Math.floor(Math.random() * 4)
      else base = Math.floor(Math.random() * 2)
      if (d >= 1 && d <= 5) base = Math.round(base * 1.5)
      row.push(base)
    }
    heatmap.push(row)
  }
  return heatmap
}

const PEAK_HOURS_HEATMAP: number[][] = generateHeatmap()

const VELOCITY_DATA: VelocityPoint[] = [
  { day: 'Mon', count: 42 }, { day: 'Tue', count: 58 }, { day: 'Wed', count: 51 },
  { day: 'Thu', count: 67 }, { day: 'Fri', count: 62 }, { day: 'Sat', count: 18 }, { day: 'Sun', count: 12 },
]

// ─── Constants ───────────────────────────────────────────────────

const TYPE_ICONS: Record<ActivityType, React.ReactNode> = {
  message: <MessageSquare size={13} />,
  decision: <Gavel size={13} />,
  upload: <Upload size={13} />,
  meeting: <Calendar size={13} />,
  review: <Star size={13} />,
  completion: <CheckCircle2 size={13} />,
  system: <Settings size={13} />,
}

const TYPE_COLORS: Record<ActivityType, string> = {
  message: '#3b82f6',
  decision: '#f59e0b',
  upload: '#8b5cf6',
  meeting: '#10b981',
  review: '#06b6d4',
  completion: '#22c55e',
  system: '#6b7280',
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const ACTIVITY_TYPE_FILTERS: { type: ActivityType | 'all'; label: string }[] = [
  { type: 'all', label: 'All' },
  { type: 'message', label: 'Messages' },
  { type: 'decision', label: 'Decisions' },
  { type: 'upload', label: 'Uploads' },
  { type: 'meeting', label: 'Meetings' },
  { type: 'review', label: 'Reviews' },
  { type: 'completion', label: 'Completions' },
  { type: 'system', label: 'System' },
]

// ─── Helper: Donut Chart Paths ───────────────────────────────────

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle)
  const end = polarToCartesian(cx, cy, r, startAngle)
  const largeArcFlag = endAngle - startAngle <= Math.PI ? '0' : '1'
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} L ${cx} ${cy} Z`
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = (angleDeg - 90) * Math.PI / 180
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) }
}

// ─── Main Component ────────────────────────────────────────────

export default function ActivityRiverPage() {
  const [isPaused, setIsPaused] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<ActivityType | 'all'>('all')
  const [showMentionsOnly, setShowMentionsOnly] = useState(false)
  const [expandedCluster, setExpandedCluster] = useState<number | null>(null)
  const [analyticsOpen, setAnalyticsOpen] = useState(true)
  const feedRef = useRef<HTMLDivElement>(null)

  const filteredActivities = useMemo(() => {
    let items = ACTIVITIES
    if (typeFilter !== 'all') items = items.filter(a => a.type === typeFilter)
    if (showMentionsOnly) items = items.filter(a => a.isMention)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      items = items.filter(a =>
        a.actorName.toLowerCase().includes(q) ||
        a.target.toLowerCase().includes(q) ||
        a.preview.toLowerCase().includes(q) ||
        a.channel.toLowerCase().includes(q) ||
        (a.project && a.project.toLowerCase().includes(q))
      )
    }
    return items
  }, [typeFilter, showMentionsOnly, searchQuery])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (typeFilter !== 'all') count++
    if (showMentionsOnly) count++
    if (searchQuery.trim()) count++
    return count
  }, [typeFilter, showMentionsOnly, searchQuery])

  const mentionCount = useMemo(() => ACTIVITIES.filter(a => a.isMention).length, [])

  // Cluster activities into groups of ~3 for compact view
  const clusteredActivities = useMemo(() => {
    const clusters: { id: number; items: ActivityItem[] }[] = []
    let idx = 0
    while (idx < filteredActivities.length) {
      const clusterSize = Math.min(3 + Math.floor(Math.random() * 2), filteredActivities.length - idx)
      clusters.push({ id: clusters.length, items: filteredActivities.slice(idx, idx + clusterSize) })
      idx += clusterSize
    }
    return clusters
  }, [filteredActivities])

  // Donut chart data
  const donutData = useMemo(() => {
    const total = ANALYTICS_BREAKDOWN.reduce((s, b) => s + b.count, 0)
    let cumulative = 0
    return ANALYTICS_BREAKDOWN.map(item => {
      const pct = item.count / total
      const startAngle = cumulative * 360
      const endAngle = (cumulative + pct) * 360
      cumulative += pct
      return {
        ...item,
        pct: Math.round(pct * 100),
        path: describeArc(60, 60, 40, startAngle, endAngle),
      }
    })
  }, [])

  const maxVelocity = useMemo(() => Math.max(...VELOCITY_DATA.map(d => d.count), 1), [])

  const maxContributor = useMemo(() => Math.max(...TOP_CONTRIBUTORS.map(c => c.count), 1), [])

  // Heatmap max
  const maxHeatVal = useMemo(() => {
    let max = 0
    for (const row of PEAK_HOURS_HEATMAP) for (const v of row) if (v > max) max = v
    return max || 1
  }, [])

  const heatmapColor = useCallback((val: number) => {
    if (val === 0) return 'var(--vl-bg-secondary, #f1f3f5)'
    const intensity = val / maxHeatVal
    const alpha = 0.2 + intensity * 0.7
    return `rgba(16, 185, 129, ${alpha})`
  }, [maxHeatVal])

  const renderActivityItem = (activity: ActivityItem, index: number) => {
    const isSystem = activity.type === 'system'
    return (
      <div
        key={activity.id}
        className={`ar-activity-item ar-activity-${activity.type} ${activity.isMention ? 'ar-mention-highlight' : ''}`}
        style={{ animationDelay: `${Math.min(index * 0.05, 1)}s` }}
      >
        <div className="ar-activity-row">
          {!isSystem && (
            <div className="ar-activity-avatar" style={{ background: activity.actorColor }}>
              {activity.actorInitials}
            </div>
          )}
          <div className="ar-activity-body">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'baseline' }}>
              <span className="ar-activity-actor">{activity.actorName}</span>
              <span className="ar-activity-action">{activity.action}</span>
              <span className="ar-activity-target">{activity.target}</span>
            </div>
            <div className="ar-activity-time">
              {activity.relativeTime}
              <span className="ar-activity-absolute-time">{activity.absoluteTime}</span>
            </div>
            {activity.preview && (
              <div className="ar-activity-preview">
                {activity.type === 'decision' && activity.metadata && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>
                      <ThumbsUp size={10} style={{ display: 'inline', verticalAlign: -1 }} /> {Number(activity.metadata.votesFor) || 0} for
                    </span>
                    <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>
                      {Number(activity.metadata.votesAgainst) || 0} against
                    </span>
                  </div>
                )}
                {activity.type === 'review' && activity.metadata && (
                  <div style={{ display: 'flex', gap: 2, marginBottom: 4 }}>
                    {Array.from({ length: Number(activity.metadata.rating) }).map((_, i) => (
                      <Star key={i} size={12} fill="#f59e0b" color="#f59e0b" />
                    ))}
                  </div>
                )}
                {activity.type === 'meeting' && activity.metadata && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 4, fontSize: 11, color: 'var(--vl-text-muted)' }}>
                    <span><Users size={10} style={{ display: 'inline', verticalAlign: -1 }} /> {String(activity.metadata.participantCount)} participants</span>
                    <span><Clock size={10} style={{ display: 'inline', verticalAlign: -1 }} /> {String(activity.metadata.duration)}</span>
                  </div>
                )}
                {activity.type === 'completion' && activity.metadata && (
                  <div style={{ marginBottom: 4 }}>
                    <div style={{ height: 4, borderRadius: 2, background: 'var(--vl-bg-secondary)', overflow: 'hidden', maxWidth: 120 }}>
                      <div style={{ height: '100%', width: `${Number(activity.metadata.progress)}%`, background: '#22c55e', borderRadius: 2 }} />
                    </div>
                  </div>
                )}
                {activity.preview}
              </div>
            )}
            <div className="ar-activity-meta">
              <span className="ar-meta-badge">
                <span style={{ color: TYPE_COLORS[activity.type] }}>{TYPE_ICONS[activity.type]}</span>
                {activity.channel}
              </span>
              {activity.project && (
                <span className="ar-meta-badge">{activity.project}</span>
              )}
              {activity.priority && (
                <span className="ar-meta-badge" style={{
                  background: activity.priority === 'high' ? 'rgba(239,68,68,0.1)' : activity.priority === 'medium' ? 'rgba(245,158,11,0.1)' : 'rgba(107,114,128,0.1)',
                  color: activity.priority === 'high' ? '#ef4444' : activity.priority === 'medium' ? '#f59e0b' : '#6b7280',
                  borderColor: 'transparent',
                }}>
                  {activity.priority}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--vl-bg-primary)', color: 'var(--vl-text-primary)' }}>
      {/* ── Header ── */}
      <header className="ar-header">
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(6,182,212,0.3)',
            }}>
              <Activity size={20} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h1 style={{
                  fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: '-0.5px',
                  background: 'linear-gradient(135deg, var(--vl-text-primary), var(--vl-accent))',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>Activity River</h1>
                <div className={`ar-live-dot ${isPaused ? 'ar-paused' : ''}`} title={isPaused ? 'Paused' : 'Live'} />
                {!isPaused && <span style={{ fontSize: 12, fontWeight: 600, color: '#10b981' }}>Live</span>}
              </div>
              <p style={{ fontSize: 13, color: 'var(--vl-text-muted)', margin: '2px 0 0' }}>
                Real-time team activity feed — {ACTIVITIES.length} events tracked
              </p>
            </div>
            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setIsPaused(!isPaused)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 8,
                border: '1px solid var(--vl-border)',
                background: isPaused ? 'rgba(239,68,68,0.1)' : 'var(--vl-bg-card)',
                color: isPaused ? '#ef4444' : 'var(--vl-text-secondary)',
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}>
                {isPaused ? <Play size={14} /> : <Pause size={14} />}
                {isPaused ? 'Resume' : 'Pause'}
              </button>
              <select value={speed} onChange={e => setSpeed(Number(e.target.value))} style={{
                padding: '6px 10px', borderRadius: 8,
                border: '1px solid var(--vl-border)',
                background: 'var(--vl-bg-card)',
                color: 'var(--vl-text-secondary)',
                fontSize: 12, cursor: 'pointer',
              }}>
                <option value={0.5}>0.5x</option>
                <option value={1}>1x</option>
                <option value={2}>2x</option>
                <option value={5}>5x</option>
              </select>
              <button onClick={() => setAnalyticsOpen(!analyticsOpen)} style={{
                width: 34, height: 34, borderRadius: 8,
                border: '1px solid var(--vl-border)',
                background: analyticsOpen ? 'var(--vl-accent-bg)' : 'var(--vl-bg-card)',
                color: analyticsOpen ? 'var(--vl-accent)' : 'var(--vl-text-muted)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s ease',
              }} title="Toggle Analytics">
                <BarChart3 size={16} />
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="ar-filter-bar" style={{ marginTop: 16 }}>
            <div className="ar-search-bar" style={{ minWidth: 200, maxWidth: 320, flex: 1 }}>
              <Search size={14} style={{ color: 'var(--vl-text-muted)', flexShrink: 0 }} />
              <input placeholder="Search activities..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--vl-text-muted)' }}>
                  <X size={12} />
                </button>
              )}
            </div>
            {ACTIVITY_TYPE_FILTERS.map(f => (
              <button
                key={f.type}
                className={`ar-filter-chip ${typeFilter === f.type ? 'ar-filter-chip-active' : ''}`}
                onClick={() => setTypeFilter(f.type)}
              >
                {f.type !== 'all' && <span style={{ color: TYPE_COLORS[f.type as ActivityType] }}>{TYPE_ICONS[f.type as ActivityType]}</span>}
                {f.label}
              </button>
            ))}
            <button
              className={`ar-filter-chip ${showMentionsOnly ? 'ar-filter-chip-active' : ''}`}
              onClick={() => setShowMentionsOnly(!showMentionsOnly)}
              style={showMentionsOnly ? { borderColor: '#8b5cf6', color: '#8b5cf6', background: 'rgba(139,92,246,0.1)' } : {}}
            >
              <AtSign size={13} /> Mentions
            </button>
            {activeFilterCount > 0 && (
              <span className="ar-filter-count-badge">{activeFilterCount}</span>
            )}
          </div>
        </div>
      </header>

      {/* ── Mentions Banner ── */}
      {mentionCount > 0 && (
        <div className="ar-mentions-banner">
          <AtSign size={16} style={{ color: '#8b5cf6', flexShrink: 0 }} />
          <span><strong>{mentionCount} mentions</strong> since your last visit</span>
          <button onClick={() => setShowMentionsOnly(true)} style={{
            marginLeft: 'auto', padding: '4px 12px', borderRadius: 6,
            border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.08)',
            color: '#8b5cf6', fontSize: 12, fontWeight: 500, cursor: 'pointer',
          }}>
            View all
          </button>
        </div>
      )}

      {/* ── Main Content ── */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px' }}>
        <div style={{ display: 'flex', gap: 20 }}>
          {/* River Feed */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="ar-river-container" ref={feedRef}>
              {/* Timeline */}
              <div className="ar-timeline-line" />
              <div className="ar-timeline-glow" />

              {/* Timeline Nodes */}
              {filteredActivities.map((activity, i) => {
                const topPos = 0 // Approximate
                return (
                  <React.Fragment key={`node-${activity.id}`}>
                    <div className="ar-timeline-node" style={{ top: 20 + i * 10, background: TYPE_COLORS[activity.type] }}>
                      {TYPE_ICONS[activity.type]}
                    </div>
                    <div className="ar-timeline-connector" style={{ top: 20 + i * 10 + 8, background: TYPE_COLORS[activity.type] }} />
                  </React.Fragment>
                )
              })}

              {/* Feed */}
              <div className="ar-feed-area">
                {/* Clustered or flat view */}
                {clusteredActivities.map(cluster => {
                  const isExpanded = expandedCluster === cluster.id
                  const firstItem = cluster.items[0]

                  if (cluster.items.length > 1 && !isExpanded) {
                    return (
                      <div key={`cluster-${cluster.id}`} className="ar-cluster">
                        <div className="ar-cluster-header" onClick={() => setExpandedCluster(cluster.id)}>
                          <div className="ar-cluster-count">{cluster.items.length}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                              <span style={{ fontWeight: 600 }}>{firstItem.actorName}</span>
                              <span style={{ color: 'var(--vl-text-muted)' }}>and others</span>
                            </div>
                            <span style={{ fontSize: 11, color: 'var(--vl-text-muted)' }}>{cluster.items.map(a => a.type.charAt(0).toUpperCase() + a.type.slice(1)).join(', ')}</span>
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--vl-text-muted)', whiteSpace: 'nowrap' }}>{firstItem.relativeTime}</span>
                          <ChevronDown size={14} style={{ color: 'var(--vl-text-muted)' }} />
                        </div>
                        <div className={`ar-cluster-items ${isExpanded ? 'ar-cluster-expanded' : 'ar-cluster-collapsed'}`} />
                      </div>
                    )
                  }

                  return (
                    <div key={`cluster-${cluster.id}`} className="ar-cluster ar-cluster-expanded">
                      {cluster.items.length > 1 && (
                        <div className="ar-cluster-header" onClick={() => setExpandedCluster(null)} style={{ marginBottom: 2 }}>
                          <ChevronUp size={14} style={{ color: 'var(--vl-text-muted)' }} />
                          <span style={{ fontSize: 11, color: 'var(--vl-text-muted)' }}>Collapse</span>
                        </div>
                      )}
                      {cluster.items.map((item, itemIdx) => renderActivityItem(item, itemIdx))}
                    </div>
                  )
                })}

                {/* Load More */}
                <button className="ar-load-more">
                  <ChevronDown size={16} /> Load more activities
                </button>
              </div>
            </div>
          </div>

          {/* Analytics Sidebar */}
          {analyticsOpen && (
            <div className="ar-analytics-panel ar-animated-in">
              {/* Donut Chart - Activity Breakdown */}
              <div className="ar-analytics-card">
                <h3 className="ar-analytics-title"><Flame size={14} color="#f59e0b" /> Activity Breakdown</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <svg width="120" height="120" viewBox="0 0 120 120">
                    {donutData.map(seg => (
                      <path key={seg.type} className="ar-donut-segment" d={seg.path} fill={seg.color} opacity={0.85} />
                    ))}
                    <text x="60" y="56" textAnchor="middle" fill="var(--vl-text-primary)" fontSize="18" fontWeight="700">{ANALYTICS_BREAKDOWN.reduce((s, b) => s + b.count, 0)}</text>
                    <text x="60" y="70" textAnchor="middle" fill="var(--vl-text-muted)" fontSize="10">total</text>
                  </svg>
                  <div style={{ flex: 1 }}>
                    {ANALYTICS_BREAKDOWN.map(breakdown => (
                      <div key={breakdown.type} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', fontSize: 12 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: breakdown.color, flexShrink: 0 }} />
                        <span style={{ flex: 1, color: 'var(--vl-text-secondary)' }}>{breakdown.type}</span>
                        <span style={{ fontWeight: 600, color: 'var(--vl-text-primary)' }}>{breakdown.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top Contributors */}
              <div className="ar-analytics-card">
                <h3 className="ar-analytics-title"><Users size={14} color="#06b6d4" /> Top Contributors</h3>
                {TOP_CONTRIBUTORS.map((contributor, idx) => (
                  <div key={contributor.name} className="ar-contributor-row">
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--vl-text-muted)', width: 16 }}>#{idx + 1}</span>
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%',
                      background: contributor.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 600, color: '#fff', flexShrink: 0,
                    }}>{contributor.initials}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contributor.name}</p>
                      <div style={{ height: 4, borderRadius: 2, background: 'var(--vl-bg-secondary)', overflow: 'hidden', marginTop: 3 }}>
                        <div className="ar-contributor-bar" style={{ width: `${(contributor.count / maxContributor) * 100}%`, background: contributor.color }} />
                      </div>
                    </div>
                    <span className="ar-contributor-count">{contributor.count}</span>
                  </div>
                ))}
              </div>

              {/* Peak Activity Hours Heatmap */}
              <div className="ar-analytics-card">
                <h3 className="ar-analytics-title"><TrendingUp size={14} color="#10b981" /> Peak Activity Hours</h3>
                <div style={{ overflowX: 'auto' }}>
                  <div className="ar-heatmap-grid">
                    {/* Hour labels (top) */}
                    {Array.from({ length: 24 }).map((_, h) => (
                      <div key={`hl-${h}`} className="ar-heatmap-hour-label">{h % 4 === 0 ? `${h}:00` : ''}</div>
                    ))}
                    {/* Rows */}
                    {PEAK_HOURS_HEATMAP.map((row, dIdx) => (
                      <React.Fragment key={`day-${dIdx}`}>
                        <div className="ar-heatmap-label">{DAY_LABELS[dIdx]}</div>
                        {row.map((val, hIdx) => (
                          <div
                            key={`cell-${dIdx}-${hIdx}`}
                            className="ar-heatmap-cell"
                            style={{ background: heatmapColor(val) }}
                            title={`${DAY_LABELS[dIdx]} ${hIdx}:00 — ${val} activities`}
                          />
                        ))}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>

              {/* Activity Velocity (7-day Sparkline) */}
              <div className="ar-analytics-card">
                <h3 className="ar-analytics-title"><Sparkles size={14} color="#8b5cf6" /> Activity Velocity</h3>
                <div className="ar-sparkline-container">
                  {VELOCITY_DATA.map(point => (
                    <div key={point.day} className="ar-sparkline-bar" style={{
                      height: `${(point.count / maxVelocity) * 100}%`,
                      background: 'linear-gradient(180deg, #8b5cf6, #06b6d4)',
                      opacity: 0.5 + (point.count / maxVelocity) * 0.5,
                    }} title={`${point.day}: ${point.count} activities`} />
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  {VELOCITY_DATA.map(point => (
                    <span key={point.day} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: 'var(--vl-text-muted)' }}>{point.day.charAt(0)}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
