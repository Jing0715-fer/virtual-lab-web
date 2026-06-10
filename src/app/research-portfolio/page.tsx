'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  TrendingUp, Award, Globe, Users, BookOpen, Calendar,
  ChevronRight, ChevronLeft, ExternalLink, Filter,
  Activity, Target, Zap, ArrowUpRight, ArrowDownRight,
  FlaskConical, Dna, Atom, Beaker, Brain, Microscope,
  BarChart3, PieChart as PieChartIcon, Star, Clock,
  GitBranch, DollarSign, Sparkles, Search, X, Layers,
  FileText, Download, RefreshCw,
} from 'lucide-react'
import type { Lang } from '@/lib/i18n'

// ─── Types ──────────────────────────────────────────────────────

interface ResearchProject {
  id: string
  title: string
  description: string
  progress: number
  status: 'active' | 'paused' | 'completed' | 'archived'
  team: TeamMember[]
  lastUpdated: string
  milestones: number
  milestonesCompleted: number
  department: string
  budget: number
  publications: number
  color: string
}

interface TeamMember {
  id: string
  name: string
  role: string
  avatar: string
}

interface ImpactMetric {
  label: string
  value: number
  change: number
  sparkline: number[]
  icon: React.ReactNode
  prefix?: string
  suffix?: string
}

interface VelocityDataPoint {
  month: string
  papers: number
  experiments: number
  meetings: number
}

interface Milestone {
  id: string
  projectId: string
  projectColor: string
  projectShortName: string
  title: string
  date: string
  status: 'completed' | 'in-progress' | 'upcoming'
}

interface CollabNode {
  id: string
  name: string
  department: string
  contributions: number
  x: number
  y: number
}

interface CollabEdge {
  source: string
  target: string
  weight: number
}

interface FundingAllocation {
  project: string
  amount: number
  color: string
}

type StatusFilter = 'all' | 'active' | 'paused' | 'completed'

// ─── Mock Data ──────────────────────────────────────────────────

const PROJECTS: ResearchProject[] = [
  {
    id: 'p1', title: 'Nanobody Design Optimization',
    description: 'Computational design of novel nanobodies targeting SARS-CoV-2 spike protein variants using ESM, AlphaFold-Multimer, and Rosetta scoring.',
    progress: 78, status: 'active',
    team: [
      { id: 't1', name: 'Dr. Sarah Chen', role: 'PI', avatar: 'SC' },
      { id: 't2', name: 'Dr. James Park', role: 'Computational Biologist', avatar: 'JP' },
      { id: 't3', name: 'Dr. Maria Garcia', role: 'ML Engineer', avatar: 'MG' },
    ],
    lastUpdated: '2025-01-15', milestones: 12, milestonesCompleted: 9,
    department: 'Structural Biology', budget: 450000, publications: 3, color: '#10b981',
  },
  {
    id: 'p2', title: 'Protein Structure Prediction',
    description: 'Deep learning approach to predict protein 3D structures from amino acid sequences using transformer architectures.',
    progress: 92, status: 'active',
    team: [
      { id: 't4', name: 'Dr. Wei Zhang', role: 'PI', avatar: 'WZ' },
      { id: 't5', name: 'Dr. Alex Turner', role: 'Bioinformatician', avatar: 'AT' },
    ],
    lastUpdated: '2025-01-18', milestones: 8, milestonesCompleted: 7,
    department: 'Computational Biology', budget: 380000, publications: 5, color: '#06b6d4',
  },
  {
    id: 'p3', title: 'Drug Discovery Pipeline',
    description: 'Virtual screening and molecular docking pipeline for identifying novel drug candidates against tropical diseases.',
    progress: 45, status: 'active',
    team: [
      { id: 't6', name: 'Dr. Lisa Wang', role: 'PI', avatar: 'LW' },
      { id: 't7', name: 'Dr. David Kim', role: 'Medicinal Chemist', avatar: 'DK' },
      { id: 't8', name: 'Dr. Ana Silva', role: 'Pharmacologist', avatar: 'AS' },
      { id: 't9', name: 'Dr. Tom Brown', role: 'Data Scientist', avatar: 'TB' },
    ],
    lastUpdated: '2025-01-12', milestones: 15, milestonesCompleted: 7,
    department: 'Drug Discovery', budget: 620000, publications: 1, color: '#8b5cf6',
  },
  {
    id: 'p4', title: 'Gene Expression Atlas',
    description: 'Building a comprehensive single-cell RNA-seq atlas of human tissue development across developmental stages.',
    progress: 100, status: 'completed',
    team: [
      { id: 't10', name: 'Dr. Emma Davis', role: 'PI', avatar: 'ED' },
      { id: 't11', name: 'Dr. Ryan Lee', role: 'Bioinformatician', avatar: 'RL' },
    ],
    lastUpdated: '2024-12-20', milestones: 10, milestonesCompleted: 10,
    department: 'Genomics', budget: 290000, publications: 4, color: '#f59e0b',
  },
  {
    id: 'p5', title: 'CRISPR-Cas9 Optimization',
    description: 'Machine learning-guided optimization of guide RNA design for improved CRISPR-Cas9 editing efficiency and specificity.',
    progress: 63, status: 'active',
    team: [
      { id: 't12', name: 'Dr. Michael Ross', role: 'PI', avatar: 'MR' },
      { id: 't13', name: 'Dr. Yuki Tanaka', role: 'Molecular Biologist', avatar: 'YT' },
      { id: 't14', name: 'Dr. Priya Patel', role: 'ML Engineer', avatar: 'PP' },
    ],
    lastUpdated: '2025-01-14', milestones: 9, milestonesCompleted: 6,
    department: 'Gene Editing', budget: 340000, publications: 2, color: '#ef4444',
  },
  {
    id: 'p6', title: 'Metagenomic Analysis Platform',
    description: 'Cloud-based platform for large-scale metagenomic data analysis with real-time visualization capabilities.',
    progress: 20, status: 'paused',
    team: [
      { id: 't15', name: 'Dr. Kenji Nakamura', role: 'PI', avatar: 'KN' },
      { id: 't16', name: 'Dr. Claire Dupont', role: 'Software Engineer', avatar: 'CD' },
    ],
    lastUpdated: '2024-11-30', milestones: 14, milestonesCompleted: 3,
    department: 'Bioinformatics', budget: 280000, publications: 0, color: '#ec4899',
  },
  {
    id: 'p7', title: 'Alzheimer\'s Biomarker Discovery',
    description: 'Proteomics and metabolomics approach to identify early-stage biomarkers for Alzheimer\'s disease progression.',
    progress: 55, status: 'active',
    team: [
      { id: 't17', name: 'Dr. Robert Miller', role: 'PI', avatar: 'RM' },
      { id: 't18', name: 'Dr. Jennifer Liu', role: 'Neuroscientist', avatar: 'JL' },
      { id: 't19', name: 'Dr. Hans Mueller', role: 'Proteomics Expert', avatar: 'HM' },
    ],
    lastUpdated: '2025-01-16', milestones: 11, milestonesCompleted: 6,
    department: 'Neuroscience', budget: 510000, publications: 2, color: '#14b8a6',
  },
  {
    id: 'p8', title: 'Synthetic Biology Framework',
    description: 'Design and validation of genetic circuits for programmable biological systems in industrial biotechnology.',
    progress: 35, status: 'active',
    team: [
      { id: 't20', name: 'Dr. Sophie Martin', role: 'PI', avatar: 'SM' },
      { id: 't21', name: 'Dr. Chris Johnson', role: 'Systems Biologist', avatar: 'CJ' },
      { id: 't22', name: 'Dr. Aisha Okafor', role: 'Lab Lead', avatar: 'AO' },
      { id: 't23', name: 'Dr. Felix Bauer', role: 'Postdoc', avatar: 'FB' },
    ],
    lastUpdated: '2025-01-13', milestones: 16, milestonesCompleted: 6,
    department: 'Synthetic Biology', budget: 420000, publications: 1, color: '#a855f7',
  },
]

const IMPACT_METRICS: ImpactMetric[] = [
  {
    label: 'Publications', value: 18, change: 12.5,
    sparkline: [2, 3, 2, 4, 3, 5, 4, 6, 5, 7, 6, 8],
    icon: <BookOpen size={18} />, suffix: '',
  },
  {
    label: 'Citations', value: 342, change: 28.3,
    sparkline: [15, 22, 28, 35, 42, 38, 50, 55, 62, 70, 78, 90],
    icon: <Award size={18} />, suffix: '',
  },
  {
    label: 'Impact Factor', value: 24.7, change: 5.8,
    sparkline: [18, 19, 19.5, 20, 21, 21.5, 22, 22.5, 23, 23.5, 24, 24.7],
    icon: <TrendingUp size={18} />, suffix: '',
  },
  {
    label: 'Active Collaborations', value: 12, change: -3.2,
    sparkline: [8, 9, 10, 11, 12, 13, 12, 14, 13, 12, 11, 12],
    icon: <Globe size={18} />, suffix: '',
  },
]

const VELOCITY_DATA: VelocityDataPoint[] = [
  { month: 'Feb', papers: 2, experiments: 8, meetings: 15 },
  { month: 'Mar', papers: 3, experiments: 12, meetings: 18 },
  { month: 'Apr', papers: 1, experiments: 10, meetings: 22 },
  { month: 'May', papers: 4, experiments: 15, meetings: 20 },
  { month: 'Jun', papers: 2, experiments: 11, meetings: 25 },
  { month: 'Jul', papers: 3, experiments: 14, meetings: 28 },
  { month: 'Aug', papers: 2, experiments: 9, meetings: 16 },
  { month: 'Sep', papers: 5, experiments: 18, meetings: 30 },
  { month: 'Oct', papers: 3, experiments: 16, meetings: 24 },
  { month: 'Nov', papers: 4, experiments: 20, meetings: 32 },
  { month: 'Dec', papers: 2, experiments: 12, meetings: 18 },
  { month: 'Jan', papers: 3, experiments: 17, meetings: 27 },
]

const MILESTONES_DATA: Milestone[] = [
  { id: 'm1', projectId: 'p2', projectColor: '#06b6d4', projectShortName: 'PSP', title: 'AlphaFold v3 Integration', date: '2024-03-15', status: 'completed' },
  { id: 'm2', projectId: 'p1', projectColor: '#10b981', projectShortName: 'NDO', title: 'ESM-2 Model Training', date: '2024-04-01', status: 'completed' },
  { id: 'm3', projectId: 'p4', projectColor: '#f59e0b', projectShortName: 'GEA', title: 'Tissue Atlas v1.0', date: '2024-05-20', status: 'completed' },
  { id: 'm4', projectId: 'p1', projectColor: '#10b981', projectShortName: 'NDO', title: 'Binding Affinity Pipeline', date: '2024-06-10', status: 'completed' },
  { id: 'm5', projectId: 'p3', projectColor: '#8b5cf6', projectShortName: 'DDP', title: 'Virtual Screen Setup', date: '2024-07-01', status: 'completed' },
  { id: 'm6', projectId: 'p5', projectColor: '#ef4444', projectShortName: 'CCO', title: 'Guide RNA Database', date: '2024-07-15', status: 'completed' },
  { id: 'm7', projectId: 'p7', projectColor: '#14b8a6', projectShortName: 'ABD', title: 'Biomarker Panel v1', date: '2024-08-01', status: 'completed' },
  { id: 'm8', projectId: 'p2', projectColor: '#06b6d4', projectShortName: 'PSP', title: 'Multi-chain Prediction', date: '2024-09-01', status: 'completed' },
  { id: 'm9', projectId: 'p1', projectColor: '#10b981', projectShortName: 'NDO', title: 'Rosetta Scoring Integration', date: '2024-09-15', status: 'completed' },
  { id: 'm10', projectId: 'p4', projectColor: '#f59e0b', projectShortName: 'GEA', title: 'Atlas Published', date: '2024-10-01', status: 'completed' },
  { id: 'm11', projectId: 'p8', projectColor: '#a855f7', projectShortName: 'SBF', title: 'Circuit Design Framework', date: '2024-10-15', status: 'completed' },
  { id: 'm12', projectId: 'p3', projectColor: '#8b5cf6', projectShortName: 'DDP', title: 'Lead Compound Identification', date: '2024-11-01', status: 'completed' },
  { id: 'm13', projectId: 'p5', projectColor: '#ef4444', projectShortName: 'CCO', title: 'Off-target Prediction Model', date: '2024-11-15', status: 'completed' },
  { id: 'm14', projectId: 'p6', projectColor: '#ec4899', projectShortName: 'MAP', title: 'Cloud Infrastructure Setup', date: '2024-12-01', status: 'completed' },
  { id: 'm15', projectId: 'p7', projectColor: '#14b8a6', projectShortName: 'ABD', title: 'Longitudinal Study Phase 1', date: '2024-12-15', status: 'completed' },
  { id: 'm16', projectId: 'p1', projectColor: '#10b981', projectShortName: 'NDO', title: 'Variant Escape Analysis', date: '2025-01-01', status: 'in-progress' },
  { id: 'm17', projectId: 'p3', projectColor: '#8b5cf6', projectShortName: 'DDP', title: 'ADMET Screening Round 2', date: '2025-01-10', status: 'in-progress' },
  { id: 'm18', projectId: 'p7', projectColor: '#14b8a6', projectShortName: 'ABD', title: 'CSF Biomarker Validation', date: '2025-01-20', status: 'in-progress' },
  { id: 'm19', projectId: 'p2', projectColor: '#06b6d4', projectShortName: 'PSP', title: 'Cryo-EM Validation Suite', date: '2025-02-01', status: 'upcoming' },
  { id: 'm20', projectId: 'p8', projectColor: '#a855f7', projectShortName: 'SBF', title: 'Yeast Strain Construction', date: '2025-02-15', status: 'upcoming' },
  { id: 'm21', projectId: 'p5', projectColor: '#ef4444', projectShortName: 'CCO', title: 'In Vivo Testing Pipeline', date: '2025-03-01', status: 'upcoming' },
  { id: 'm22', projectId: 'p1', projectColor: '#10b981', projectShortName: 'NDO', title: 'Preclinical Candidate Selection', date: '2025-03-15', status: 'upcoming' },
]

const COLLAB_NODES: CollabNode[] = [
  { id: 'n1', name: 'Dr. Sarah Chen', department: 'Structural Biology', contributions: 45, x: 200, y: 150 },
  { id: 'n2', name: 'Dr. Wei Zhang', department: 'Computational Biology', contributions: 52, x: 380, y: 100 },
  { id: 'n3', name: 'Dr. Lisa Wang', department: 'Drug Discovery', contributions: 38, x: 520, y: 200 },
  { id: 'n4', name: 'Dr. Emma Davis', department: 'Genomics', contributions: 30, x: 150, y: 300 },
  { id: 'n5', name: 'Dr. Michael Ross', department: 'Gene Editing', contributions: 35, x: 340, y: 280 },
  { id: 'n6', name: 'Dr. Kenji Nakamura', department: 'Bioinformatics', contributions: 22, x: 480, y: 340 },
  { id: 'n7', name: 'Dr. Robert Miller', department: 'Neuroscience', contributions: 40, x: 620, y: 120 },
  { id: 'n8', name: 'Dr. Sophie Martin', department: 'Synthetic Biology', contributions: 28, x: 100, y: 420 },
  { id: 'n9', name: 'Dr. James Park', department: 'Structural Biology', contributions: 25, x: 280, y: 380 },
  { id: 'n10', name: 'Dr. Priya Patel', department: 'Gene Editing', contributions: 20, x: 450, y: 440 },
  { id: 'n11', name: 'Dr. Alex Turner', department: 'Computational Biology', contributions: 32, x: 560, y: 60 },
  { id: 'n12', name: 'Dr. Jennifer Liu', department: 'Neuroscience', contributions: 26, x: 700, y: 240 },
]

const COLLAB_EDGES: CollabEdge[] = [
  { source: 'n1', target: 'n2', weight: 8 },
  { source: 'n1', target: 'n9', weight: 12 },
  { source: 'n2', target: 'n11', weight: 10 },
  { source: 'n2', target: 'n3', weight: 5 },
  { source: 'n3', target: 'n7', weight: 4 },
  { source: 'n4', target: 'n5', weight: 6 },
  { source: 'n5', target: 'n10', weight: 9 },
  { source: 'n5', target: 'n6', weight: 3 },
  { source: 'n6', target: 'n8', weight: 5 },
  { source: 'n7', target: 'n12', weight: 7 },
  { source: 'n8', target: 'n9', weight: 4 },
  { source: 'n1', target: 'n5', weight: 6 },
  { source: 'n3', target: 'n12', weight: 3 },
  { source: 'n4', target: 'n6', weight: 4 },
  { source: 'n7', target: 'n3', weight: 5 },
  { source: 'n10', target: 'n8', weight: 2 },
  { source: 'n11', target: 'n7', weight: 3 },
]

const FUNDING_DATA: FundingAllocation[] = [
  { project: 'Drug Discovery', amount: 620000, color: '#8b5cf6' },
  { project: 'Nanobody Design', amount: 450000, color: '#10b981' },
  { project: "Alzheimer's", amount: 510000, color: '#14b8a6' },
  { project: 'Structural Bio', amount: 380000, color: '#06b6d4' },
  { project: 'Synthetic Bio', amount: 420000, color: '#a855f7' },
  { project: 'Gene Editing', amount: 340000, color: '#ef4444' },
  { project: 'Genomics', amount: 290000, color: '#f59e0b' },
  { project: 'Metagenomics', amount: 280000, color: '#ec4899' },
]

const DEPT_COLORS: Record<string, string> = {
  'Structural Biology': '#10b981',
  'Computational Biology': '#06b6d4',
  'Drug Discovery': '#8b5cf6',
  'Genomics': '#f59e0b',
  'Gene Editing': '#ef4444',
  'Bioinformatics': '#ec4899',
  'Neuroscience': '#14b8a6',
  'Synthetic Biology': '#a855f7',
}

const MONTHS_SHORT = ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan']

// ─── Helper Components ──────────────────────────────────────────

function SparklineSVG({ data, color = '#10b981', width = 80, height = 28 }: {
  data: number[], color?: string, width?: number, height?: number
}) {
  if (!data || data.length < 2) return null
  const maxVal = Math.max(...data)
  const minVal = Math.min(...data)
  const range = maxVal - minVal || 1
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((val - minVal) / range) * (height - 4) - 2
    return `${x},${y}`
  }).join(' ')

  const areaPoints = `0,${height} ${points} ${width},${height}`

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
      <defs>
        <linearGradient id={`spark-grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#spark-grad-${color.replace('#', '')})`} />
      <polyline points={points} stroke={color} strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={(data.length - 1) / (data.length - 1) * width} cy={height - ((data[data.length - 1] - minVal) / range) * (height - 4) - 2} r={2.5} fill={color} />
    </svg>
  )
}

function AnimatedCounter({ target, duration = 1200 }: { target: number, duration?: number }) {
  const [count, setCount] = useState(0)
  const countRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const start = performance.now()
    const animate = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(target * eased))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [target, duration])

  return <span ref={countRef}>{count.toLocaleString()}</span>
}

// ─── Main Component ─────────────────────────────────────────────

export default function ResearchPortfolioPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [expandedProject, setExpandedProject] = useState<string | null>(null)
  const [hoveredMilestone, setHoveredMilestone] = useState<string | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const milestoneScrollRef = useRef<HTMLDivElement>(null)

  // ── Filtered projects ──
  const filteredProjects = useMemo(() => {
    let projects = PROJECTS
    if (statusFilter !== 'all') {
      projects = projects.filter(p => p.status === statusFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      projects = projects.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.department.toLowerCase().includes(q)
      )
    }
    return projects
  }, [statusFilter, searchQuery])

  // ── Quick stats ──
  const quickStats = useMemo(() => {
    const active = PROJECTS.filter(p => p.status === 'active').length
    const milestonesThisMonth = MILESTONES_DATA.filter(m => m.date.startsWith('2025-01')).length
    const completedOnTime = MILESTONES_DATA.filter(m => m.status === 'completed').length
    const total = MILESTONES_DATA.length
    const onTimeRate = Math.round((completedOnTime / total) * 100)
    return { active, milestonesThisMonth, onTimeRate, totalProjects: PROJECTS.length }
  }, [])

  // ── Status colors ──
  const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
    active: { bg: 'rgba(16, 185, 129, 0.12)', text: '#10b981', label: 'Active' },
    paused: { bg: 'rgba(245, 158, 11, 0.12)', text: '#f59e0b', label: 'Paused' },
    completed: { bg: 'rgba(6, 182, 212, 0.12)', text: '#06b6d4', label: 'Completed' },
    archived: { bg: 'rgba(107, 114, 128, 0.12)', text: '#6b7280', label: 'Archived' },
  }

  // ── Donut chart paths ──
  const donutData = useMemo(() => {
    const total = FUNDING_DATA.reduce((s, f) => s + f.amount, 0)
    let cumulative = 0
    return FUNDING_DATA.map(item => {
      const pct = item.amount / total
      const startAngle = cumulative * 2 * Math.PI - Math.PI / 2
      const endAngle = (cumulative + pct) * 2 * Math.PI - Math.PI / 2
      cumulative += pct
      return {
        ...item,
        pct: Math.round(pct * 100),
        path: describeArc(80, 80, 55, startAngle, endAngle),
      }
    })
  }, [])

  // ── Velocity chart dimensions ──
  const velocityChart = useMemo(() => {
    const chartW = 600
    const chartH = 200
    const pad = { top: 20, right: 20, bottom: 30, left: 40 }
    const innerW = chartW - pad.left - pad.right
    const innerH = chartH - pad.top - pad.bottom
    const maxVal = Math.max(...VELOCITY_DATA.map(d => d.experiments))

    const makePoints = (key: keyof VelocityDataPoint) =>
      VELOCITY_DATA.map((d, i) => ({
        x: pad.left + (i / (VELOCITY_DATA.length - 1)) * innerW,
        y: pad.top + innerH - ((d[key] as number) / maxVal) * innerH,
      }))

    const papersPoints = makePoints('papers')
    const experimentsPoints = makePoints('experiments')
    const meetingsPoints = makePoints('meetings')

    return { chartW, chartH, pad, innerW, innerH, maxVal, papersPoints, experimentsPoints, meetingsPoints }
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--vl-bg-primary)',
      color: 'var(--vl-text-primary)',
    }}>
      {/* Header */}
      <header style={{
        padding: '32px 24px 24px',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.06) 0%, rgba(6, 182, 212, 0.04) 50%, rgba(139, 92, 246, 0.06) 100%)',
        borderBottom: '1px solid var(--vl-border)',
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'linear-gradient(135deg, #10b981, #06b6d4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            }}>
              <Layers size={20} color="#fff" />
            </div>
            <div>
              <h1 style={{
                fontSize: 24, fontWeight: 700, margin: 0,
                letterSpacing: '-0.5px',
                background: 'linear-gradient(135deg, var(--vl-text-primary), var(--vl-accent))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                Research Portfolio
              </h1>
              <p style={{ fontSize: 13, color: 'var(--vl-text-muted)', margin: '2px 0 0' }}>
                Comprehensive overview of all research projects, milestones, and impact metrics
              </p>
            </div>
          </div>

          {/* Quick Stats Bar */}
          <div style={{
            display: 'flex', gap: 16, marginTop: 20,
            flexWrap: 'wrap',
          }}>
            {[
              { label: `${quickStats.active} Active Projects`, color: '#10b981', icon: <Activity size={14} /> },
              { label: `${quickStats.milestonesThisMonth} Milestones This Month`, color: '#06b6d4', icon: <Target size={14} /> },
              { label: `${quickStats.onTimeRate}% On-Time Rate`, color: '#8b5cf6', icon: <Zap size={14} /> },
              { label: `${quickStats.totalProjects} Total Projects`, color: '#f59e0b', icon: <Layers size={14} /> },
            ].map(stat => (
              <div key={stat.label} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 20,
                background: `${stat.color}10`, border: `1px solid ${stat.color}25`,
                fontSize: 12, fontWeight: 500, color: stat.color,
              }}>
                {stat.icon}
                {stat.label}
              </div>
            ))}
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px' }}>
        {/* Filter Bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          marginBottom: 24, flexWrap: 'wrap',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            flex: 1, minWidth: 200, maxWidth: 400,
            padding: '6px 12px', borderRadius: 8,
            background: 'var(--vl-bg-card)', border: '1px solid var(--vl-border)',
          }}>
            <Search size={14} style={{ color: 'var(--vl-text-muted)', flexShrink: 0 }} />
            <input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                flex: 1, border: 'none', outline: 'none',
                background: 'transparent', fontSize: 13,
                color: 'var(--vl-text-primary)',
              }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--vl-text-muted)', padding: 2,
              }}>
                <X size={12} />
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'active', 'paused', 'completed'] as StatusFilter[]).map(filter => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                style={{
                  padding: '6px 14px', borderRadius: 6,
                  border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 500,
                  background: statusFilter === filter ? 'var(--vl-accent)' : 'var(--vl-bg-card)',
                  color: statusFilter === filter ? '#fff' : 'var(--vl-text-secondary)',
                  transition: 'all 0.15s ease',
                  border: statusFilter === filter ? 'none' : '1px solid var(--vl-border)',
                }}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Impact Metrics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16, marginBottom: 24,
        }}>
          {IMPACT_METRICS.map((metric, idx) => {
            const metricColor = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b'][idx] || '#10b981'
            return (
              <div key={metric.label} className="rp-metric-card" style={{
                background: 'var(--vl-bg-card)',
                borderRadius: 12, padding: '18px 20px',
                border: '1px solid var(--vl-border)',
                transition: 'all 0.2s ease',
                cursor: 'default',
              }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      marginBottom: 8,
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: `${metricColor}12`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: metricColor,
                      }}>
                        {metric.icon}
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--vl-text-muted)', fontWeight: 500 }}>
                        {metric.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-1px' }}>
                      <AnimatedCounter target={metric.value} />
                      {metric.suffix}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 3,
                      fontSize: 12, fontWeight: 600,
                      color: metric.change >= 0 ? '#10b981' : '#ef4444',
                    }}>
                      {metric.change >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                      {Math.abs(metric.change)}%
                    </div>
                    <SparklineSVG data={metric.sparkline} color={metricColor} width={70} height={24} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Research Velocity Chart */}
        <div style={{
          background: 'var(--vl-bg-card)', borderRadius: 12,
          border: '1px solid var(--vl-border)', padding: 20,
          marginBottom: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Research Velocity</h2>
              <p style={{ fontSize: 12, color: 'var(--vl-text-muted)', margin: '4px 0 0' }}>
                Monthly research output across papers, experiments, and meetings
              </p>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              {[
                { label: 'Papers', color: '#10b981' },
                { label: 'Experiments', color: '#06b6d4' },
                { label: 'Meetings', color: '#8b5cf6' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: item.color }} />
                  <span style={{ fontSize: 11, color: 'var(--vl-text-muted)' }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <svg viewBox={`0 0 ${velocityChart.chartW} ${velocityChart.chartH}`} style={{ width: '100%', maxWidth: 700, height: 'auto' }}>
              {/* Grid lines */}
              {[0, 5, 10, 15, 20].map(val => {
                const y = velocityChart.pad.top + velocityChart.innerH - (val / velocityChart.maxVal) * velocityChart.innerH
                return (
                  <React.Fragment key={`grid-${val}`}>
                    <line x1={velocityChart.pad.left} y1={y} x2={velocityChart.chartW - velocityChart.pad.right} y2={y}
                      stroke="var(--vl-border)" strokeWidth="0.5" strokeDasharray="4,4" />
                    <text x={velocityChart.pad.left - 8} y={y + 4} textAnchor="end"
                      fill="var(--vl-text-muted)" fontSize="10">{val}</text>
                  </React.Fragment>
                )
              })}
              {/* X axis labels */}
              {MONTHS_SHORT.map((month, i) => {
                const x = velocityChart.pad.left + (i / (VELOCITY_DATA.length - 1)) * velocityChart.innerW
                return (
                  <text key={month} x={x} y={velocityChart.chartH - 5} textAnchor="middle"
                    fill="var(--vl-text-muted)" fontSize="10">{month}</text>
                )
              })}
              {/* Papers line */}
              <polyline
                points={velocityChart.papersPoints.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              />
              {velocityChart.papersPoints.map((p, i) => (
                <circle key={`p-${i}`} cx={p.x} cy={p.y} r={3} fill="#10b981" stroke="var(--vl-bg-card)" strokeWidth="1.5" />
              ))}
              {/* Experiments line */}
              <polyline
                points={velocityChart.experimentsPoints.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              />
              {velocityChart.experimentsPoints.map((p, i) => (
                <circle key={`e-${i}`} cx={p.x} cy={p.y} r={3} fill="#06b6d4" stroke="var(--vl-bg-card)" strokeWidth="1.5" />
              ))}
              {/* Meetings line */}
              <polyline
                points={velocityChart.meetingsPoints.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              />
              {velocityChart.meetingsPoints.map((p, i) => (
                <circle key={`m-${i}`} cx={p.x} cy={p.y} r={3} fill="#8b5cf6" stroke="var(--vl-bg-card)" strokeWidth="1.5" />
              ))}
            </svg>
          </div>
        </div>

        {/* Project Portfolio Grid */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Project Portfolio</h2>
              <p style={{ fontSize: 12, color: 'var(--vl-text-muted)', margin: '4px 0 0' }}>
                {filteredProjects.length} of {PROJECTS.length} projects
              </p>
            </div>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 16,
          }}>
            {filteredProjects.map(project => {
              const status = statusStyles[project.status]
              const isExpanded = expandedProject === project.id
              return (
                <div key={project.id} className="rp-project-card" style={{
                  background: 'var(--vl-bg-card)',
                  borderRadius: 12, overflow: 'hidden',
                  border: '1px solid var(--vl-border)',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                }}
                  onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.06)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {/* Color bar */}
                  <div style={{ height: 3, background: `linear-gradient(90deg, ${project.color}, ${project.color}66)` }} />
                  <div style={{ padding: '16px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{
                          fontSize: 14, fontWeight: 600, margin: 0,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {project.title}
                        </h3>
                        <span style={{
                          display: 'inline-block', marginTop: 4,
                          padding: '1px 8px', borderRadius: 10,
                          fontSize: 11, fontWeight: 500,
                          background: status.bg, color: status.text,
                        }}>
                          {status.label}
                        </span>
                      </div>
                      <span style={{
                        fontSize: 11, color: 'var(--vl-text-muted)',
                        whiteSpace: 'nowrap', marginLeft: 8,
                      }}>
                        {new Date(project.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p style={{
                      fontSize: 12, color: 'var(--vl-text-muted)', margin: '0 0 12px',
                      lineHeight: 1.5,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {project.description}
                    </p>
                    {/* Progress bar */}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{
                        display: 'flex', justifyContent: 'space-between', marginBottom: 4,
                      }}>
                        <span style={{ fontSize: 11, color: 'var(--vl-text-muted)' }}>Progress</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: project.color }}>{project.progress}%</span>
                      </div>
                      <div style={{
                        height: 4, borderRadius: 2,
                        background: 'var(--vl-bg-secondary)',
                        overflow: 'hidden',
                      }}>
                        <div className="rp-progress-bar" style={{
                          height: '100%', borderRadius: 2,
                          background: `linear-gradient(90deg, ${project.color}, ${project.color}cc)`,
                          width: `${project.progress}%`,
                          transition: 'width 0.6s ease',
                        }} />
                      </div>
                    </div>
                    {/* Bottom row */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      {/* Team avatars */}
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {project.team.slice(0, 3).map((member, i) => (
                          <div key={member.id} style={{
                            width: 24, height: 24, borderRadius: '50%',
                            background: `hsl(${(i * 120 + project.id.charCodeAt(1) * 40) % 360}, 60%, 55%)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 9, fontWeight: 600, color: '#fff',
                            marginLeft: i > 0 ? -6 : 0,
                            border: '2px solid var(--vl-bg-card)',
                            position: 'relative', zIndex: project.team.length - i,
                          }} title={member.name}>
                            {member.avatar}
                          </div>
                        ))}
                        {project.team.length > 3 && (
                          <div style={{
                            width: 24, height: 24, borderRadius: '50%',
                            background: 'var(--vl-bg-secondary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 9, fontWeight: 600, color: 'var(--vl-text-muted)',
                            marginLeft: -6,
                            border: '2px solid var(--vl-bg-card)',
                          }}>
                            +{project.team.length - 3}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--vl-text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Target size={11} /> {project.milestonesCompleted}/{project.milestones}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <BookOpen size={11} /> {project.publications}
                        </span>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div style={{
                        marginTop: 14, paddingTop: 14,
                        borderTop: '1px solid var(--vl-border)',
                      }}>
                        <div style={{
                          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
                          fontSize: 12,
                        }}>
                          <div>
                            <span style={{ color: 'var(--vl-text-muted)' }}>Department</span>
                            <div style={{ fontWeight: 500, marginTop: 2 }}>{project.department}</div>
                          </div>
                          <div>
                            <span style={{ color: 'var(--vl-text-muted)' }}>Budget</span>
                            <div style={{ fontWeight: 500, marginTop: 2 }}>
                              ${(project.budget / 1000).toFixed(0)}k
                            </div>
                          </div>
                        </div>
                        <div style={{ marginTop: 10 }}>
                          <span style={{ fontSize: 12, color: 'var(--vl-text-muted)' }}>Team</span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                            {project.team.map(member => (
                              <div key={member.id} style={{
                                padding: '3px 8px', borderRadius: 4,
                                background: 'var(--vl-bg-secondary)', fontSize: 11,
                                display: 'flex', alignItems: 'center', gap: 4,
                              }}>
                                <span style={{
                                  width: 16, height: 16, borderRadius: '50%',
                                  background: 'var(--vl-accent)', display: 'inline-flex',
                                  alignItems: 'center', justifyContent: 'center',
                                  fontSize: 8, fontWeight: 600, color: '#fff',
                                }}>
                                  {member.avatar}
                                </span>
                                {member.name}
                                <span style={{ color: 'var(--vl-text-muted)', fontSize: 10 }}>
                                  {member.role}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Milestone Timeline */}
        <div style={{
          background: 'var(--vl-bg-card)', borderRadius: 12,
          border: '1px solid var(--vl-border)', padding: 20,
          marginBottom: 24,
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 4px' }}>Milestone Timeline</h2>
          <p style={{ fontSize: 12, color: 'var(--vl-text-muted)', margin: '0 0 16px' }}>
            Key milestones across all projects — scroll horizontally to explore
          </p>
          <div ref={milestoneScrollRef} style={{
            overflowX: 'auto', overflowY: 'hidden',
            paddingBottom: 8,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center',
              minWidth: 1200, position: 'relative',
              height: 100, gap: 0,
            }}>
              {/* Timeline line */}
              <div style={{
                position: 'absolute', top: 50, left: 0, right: 0,
                height: 2, background: 'var(--vl-border)',
              }} />
              {MILESTONES_DATA.map((milestone, idx) => {
                const xPos = (idx / (MILESTONES_DATA.length - 1)) * 100
                const isHovered = hoveredMilestone === milestone.id
                return (
                  <div key={milestone.id} style={{
                    position: 'absolute', left: `${xPos}%`,
                    top: 50, transform: 'translate(-50%, -50%)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    zIndex: isHovered ? 10 : 1,
                  }}
                    onMouseEnter={() => setHoveredMilestone(milestone.id)}
                    onMouseLeave={() => setHoveredMilestone(null)}
                  >
                    {/* Dot */}
                    <div style={{
                      width: isHovered ? 14 : 10,
                      height: isHovered ? 14 : 10,
                      borderRadius: '50%',
                      background: milestone.projectColor,
                      border: '2px solid var(--vl-bg-card)',
                      boxShadow: isHovered ? `0 0 12px ${milestone.projectColor}50` : 'none',
                      transition: 'all 0.2s ease',
                      opacity: milestone.status === 'upcoming' ? 0.5 : 1,
                    }} />
                    {/* Label */}
                    <div style={{
                      marginTop: 8, fontSize: 10, fontWeight: 600,
                      color: milestone.projectColor, whiteSpace: 'nowrap',
                    }}>
                      {milestone.projectShortName}
                    </div>
                    {/* Date */}
                    <div style={{
                      fontSize: 9, color: 'var(--vl-text-muted)',
                      whiteSpace: 'nowrap', marginTop: 2,
                    }}>
                      {new Date(milestone.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    {/* Tooltip on hover */}
                    {isHovered && (
                      <div style={{
                        position: 'absolute', bottom: '100%', marginBottom: 12,
                        padding: '8px 12px', borderRadius: 8,
                        background: 'var(--vl-bg-card)',
                        border: '1px solid var(--vl-border)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        whiteSpace: 'nowrap', zIndex: 20,
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                          {milestone.title}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--vl-text-muted)' }}>
                          <span style={{
                            padding: '1px 6px', borderRadius: 4,
                            background: `${milestone.projectColor}15`, color: milestone.projectColor,
                            fontSize: 10, fontWeight: 500,
                          }}>
                            {milestone.status === 'completed' ? 'Completed' : milestone.status === 'in-progress' ? 'In Progress' : 'Upcoming'}
                          </span>
                          {new Date(milestone.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
            {['completed', 'in-progress', 'upcoming'].map(status => (
              <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--vl-text-muted)' }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: status === 'completed' ? '#10b981' : status === 'in-progress' ? '#06b6d4' : '#6b7280',
                  opacity: status === 'upcoming' ? 0.5 : 1,
                }} />
                {status === 'completed' ? 'Completed' : status === 'in-progress' ? 'In Progress' : 'Upcoming'}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Grid: Collaboration Network + Funding */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: 16, marginBottom: 24,
        }}>
          {/* Collaboration Network */}
          <div style={{
            background: 'var(--vl-bg-card)', borderRadius: 12,
            border: '1px solid var(--vl-border)', padding: 20,
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 4px' }}>Collaboration Network</h2>
            <p style={{ fontSize: 12, color: 'var(--vl-text-muted)', margin: '0 0 16px' }}>
              Researcher collaboration patterns — node size = contributions
            </p>
            <svg viewBox="0 0 800 520" style={{ width: '100%', height: 'auto' }}>
              {/* Edges */}
              {COLLAB_EDGES.map((edge, i) => {
                const source = COLLAB_NODES.find(n => n.id === edge.source)
                const target = COLLAB_NODES.find(n => n.id === edge.target)
                if (!source || !target) return null
                const isHighlighted = hoveredNode === edge.source || hoveredNode === edge.target
                return (
                  <line
                    key={`edge-${i}`}
                    x1={source.x} y1={source.y}
                    x2={target.x} y2={target.y}
                    stroke={isHighlighted ? 'var(--vl-accent)' : 'var(--vl-border)'}
                    strokeWidth={Math.max(1, edge.weight / 3)}
                    opacity={isHighlighted ? 0.8 : 0.4}
                    strokeLinecap="round"
                  />
                )
              })}
              {/* Nodes */}
              {COLLAB_NODES.map(node => {
                const deptColor = DEPT_COLORS[node.department] || '#6b7280'
                const isHov = hoveredNode === node.id
                const radius = Math.max(8, Math.min(22, node.contributions / 2.5))
                return (
                  <g
                    key={node.id}
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle
                      cx={node.x} cy={node.y}
                      r={radius}
                      fill={deptColor}
                      opacity={isHov ? 1 : 0.8}
                      stroke="var(--vl-bg-card)"
                      strokeWidth={2}
                      style={{ transition: 'all 0.2s ease' }}
                    />
                    {isHov && (
                      <rect x={node.x - 75} y={node.y - radius - 38} width={150} height={30} rx={6}
                        fill="var(--vl-bg-card)" stroke="var(--vl-border)" strokeWidth={1} />
                    )}
                    {isHov && (
                      <text x={node.x} y={node.y - radius - 18} textAnchor="middle"
                        fill="var(--vl-text-primary)" fontSize="11" fontWeight="600">
                        {node.name}
                      </text>
                    )}
                    <text x={node.x} y={node.y + radius + 14} textAnchor="middle"
                      fill="var(--vl-text-muted)" fontSize="8" fontWeight="500">
                      {node.name.split(' ').slice(-1)[0]}
                    </text>
                  </g>
                )
              })}
            </svg>
            {/* Department Legend */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
              {Object.entries(DEPT_COLORS).map(([dept, color]) => (
                <div key={dept} style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 10, color: 'var(--vl-text-muted)',
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                  {dept}
                </div>
              ))}
            </div>
          </div>

          {/* Funding Allocation */}
          <div style={{
            background: 'var(--vl-bg-card)', borderRadius: 12,
            border: '1px solid var(--vl-border)', padding: 20,
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 4px' }}>Funding Allocation</h2>
            <p style={{ fontSize: 12, color: 'var(--vl-text-muted)', margin: '0 0 16px' }}>
              Budget distribution across research projects
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              {/* Donut Chart */}
              <svg viewBox="0 0 160 160" width={160} height={160}>
                {donutData.map((slice, i) => (
                  <path
                    key={i}
                    d={slice.path}
                    fill={slice.color}
                    opacity={0.85}
                    stroke="var(--vl-bg-card)"
                    strokeWidth={2}
                  />
                ))}
                {/* Center text */}
                <text x={80} y={74} textAnchor="middle" fill="var(--vl-text-primary)" fontSize="18" fontWeight="700">
                  ${(FUNDING_DATA.reduce((s, f) => s + f.amount, 0) / 1e6).toFixed(1)}M
                </text>
                <text x={80} y={92} textAnchor="middle" fill="var(--vl-text-muted)" fontSize="10">
                  Total Budget
                </text>
              </svg>
              {/* Legend */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {FUNDING_DATA.map(item => (
                  <div key={item.project} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    fontSize: 12,
                  }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: item.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, color: 'var(--vl-text-secondary)' }}>{item.project}</span>
                    <span style={{ fontWeight: 600, color: 'var(--vl-text-primary)', whiteSpace: 'nowrap' }}>
                      ${(item.amount / 1000).toFixed(0)}k
                    </span>
                    <span style={{
                      fontSize: 10, color: 'var(--vl-text-muted)',
                      padding: '1px 5px', borderRadius: 4,
                      background: 'var(--vl-bg-secondary)',
                    }}>
                      {item.amount / FUNDING_DATA.reduce((s, f) => s + f.amount, 0) * 100 | 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        padding: '20px 24px', borderTop: '1px solid var(--vl-border)',
        textAlign: 'center',
        fontSize: 12, color: 'var(--vl-text-muted)',
      }}>
        Research Portfolio Dashboard — Virtual Lab &middot; Data updated January 2025
      </footer>
    </div>
  )
}

// ─── Arc Path Helper ────────────────────────────────────────────

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle)
  const end = polarToCartesian(cx, cy, r, startAngle)
  const largeArc = endAngle - startAngle <= Math.PI ? 0 : 1
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`
}

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  }
}
