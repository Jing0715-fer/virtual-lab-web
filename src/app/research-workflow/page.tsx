'use client'

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import {
  Workflow, Plus, Search, X, ChevronDown, ChevronUp, ChevronRight,
  Play, Copy, Share2, Download, Calendar, Clock, Activity,
  Database, BarChart3, Cpu, Eye, FileOutput, GitBranch, Bell,
  Trash2, ArrowUp, ArrowDown, CheckCircle2, AlertCircle,
  Loader2, Timer, Users, Zap, TrendingUp,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────

type StepType = 'Data Input' | 'Analysis' | 'AI Processing' | 'Review' | 'Output' | 'Decision' | 'Notification'
type StepStatus = 'Pending' | 'Running' | 'Complete' | 'Error'
type WorkflowStatus = 'Active' | 'Draft' | 'Archived'
type RunStatus = 'Success' | 'Failed' | 'Running' | 'Cancelled'

interface WorkflowStep {
  id: string
  title: string
  description: string
  type: StepType
  status: StepStatus
  duration: string
  agent: string
  branch?: 'yes' | 'no'
}

interface RunHistoryEntry {
  id: string
  status: RunStatus
  duration: string
  startTime: string
  endTime: string
  stepsCompleted: number
  totalSteps: number
}

interface AgentUtilization {
  agent: string
  workflows: number
  hoursUsed: number
  color: string
}

interface WorkflowItem {
  id: string
  name: string
  description: string
  steps: WorkflowStep[]
  status: WorkflowStatus
  createdDate: string
  lastRunDate: string
  totalRuns: number
  successRate: number
  avgDuration: string
  runHistory: RunHistoryEntry[]
  agentUtilization: AgentUtilization[]
  lastResults: boolean[]
}

// ─── Step Type Config ───────────────────────────────────────────

const STEP_TYPE_CONFIG: Record<StepType, { icon: React.ReactNode; cssClass: string; color: string }> = {
  'Data Input': { icon: <Database size={18} />, cssClass: 'rw-type-input', color: '#3b82f6' },
  'Analysis': { icon: <BarChart3 size={18} />, cssClass: 'rw-type-analysis', color: '#8b5cf6' },
  'AI Processing': { icon: <Cpu size={18} />, cssClass: 'rw-type-ai', color: '#06b6d4' },
  'Review': { icon: <Eye size={18} />, cssClass: 'rw-type-review', color: '#f59e0b' },
  'Output': { icon: <FileOutput size={18} />, cssClass: 'rw-type-output', color: '#10b981' },
  'Decision': { icon: <GitBranch size={18} />, cssClass: 'rw-type-decision', color: '#f97316' },
  'Notification': { icon: <Bell size={18} />, cssClass: 'rw-type-notification', color: '#ec4899' },
}

const STATUS_DOT_CLASS: Record<StepStatus, string> = {
  Pending: 'rw-status-dot--pending',
  Running: 'rw-status-dot--running',
  Complete: 'rw-status-dot--complete',
  Error: 'rw-status-dot--error',
}

const STATUS_COLORS: Record<StepStatus, string> = {
  Pending: '#6b7280',
  Running: '#f59e0b',
  Complete: '#10b981',
  Error: '#ef4444',
}

const WORKFLOW_STATUS_BADGE: Record<WorkflowStatus, { cls: string; color: string }> = {
  Active: { cls: 'rw-card__status-badge--active', color: '#10b981' },
  Draft: { cls: 'rw-card__status-badge--draft', color: '#f59e0b' },
  Archived: { cls: 'rw-card__status-badge--archived', color: '#6b7280' },
}

const RUN_STATUS_COLORS: Record<RunStatus, string> = {
  Success: '#10b981',
  Failed: '#ef4444',
  Running: '#f59e0b',
  Cancelled: '#6b7280',
}

// ─── Mock Data ──────────────────────────────────────────────────

const INITIAL_WORKFLOWS: WorkflowItem[] = [
  {
    id: 'wf1', name: 'Nanobody Design Pipeline',
    description: 'End-to-end computational pipeline for designing novel nanobodies targeting SARS-CoV-2 variants using ESM-2 and Rosetta.',
    status: 'Active', createdDate: '2024-09-15', lastRunDate: '2025-01-19T14:30:00Z',
    totalRuns: 47, successRate: 89, avgDuration: '4h 23m',
    lastResults: [true, true, false, true, true],
    agentUtilization: [
      { agent: 'AlphaFold Agent', workflows: 3, hoursUsed: 142, color: '#10b981' },
      { agent: 'Rosetta Scorer', workflows: 2, hoursUsed: 98, color: '#06b6d4' },
      { agent: 'ESM-2 Predictor', workflows: 4, hoursUsed: 210, color: '#8b5cf6' },
      { agent: 'Data Curator', workflows: 5, hoursUsed: 76, color: '#f59e0b' },
    ],
    steps: [
      { id: 's1', title: 'Load PDB Structures', description: 'Fetch and validate target protein structures from RCSB database', type: 'Data Input', status: 'Complete', duration: '12m', agent: 'Data Curator' },
      { id: 's2', title: 'Sequence Alignment', description: 'Perform MSA on nanobody germline sequences using Clustal Omega', type: 'Analysis', status: 'Complete', duration: '8m', agent: 'ESM-2 Predictor' },
      { id: 's3', title: 'Structure Prediction', description: 'Predict 3D nanobody structures using AlphaFold-Multimer v2.3', type: 'AI Processing', status: 'Running', duration: '45m', agent: 'AlphaFold Agent' },
      { id: 's4', title: 'Quality Check', description: 'Evaluate pLDDT scores and decide whether to proceed or re-predict', type: 'Decision', status: 'Pending', duration: '5m', agent: 'Review Agent' },
      { id: 's5', title: 'Energy Minimization', description: 'Rosetta relaxation protocol for top candidates', type: 'Analysis', status: 'Pending', duration: '30m', agent: 'Rosetta Scorer' },
      { id: 's6', title: 'Binding Affinity', description: 'Calculate binding energy using InterfaceAnalyzer', type: 'Analysis', status: 'Pending', duration: '25m', agent: 'Rosetta Scorer' },
      { id: 's7', title: 'Expert Review', description: 'Send results to team for structural validation', type: 'Review', status: 'Pending', duration: '2h', agent: 'Review Agent' },
      { id: 's8', title: 'Export Results', description: 'Generate report with top 10 candidates and PDB files', type: 'Output', status: 'Pending', duration: '5m', agent: 'Data Curator' },
      { id: 's9', title: 'Notify Team', description: 'Send Slack notification with pipeline summary', type: 'Notification', status: 'Pending', duration: '1m', agent: 'System' },
    ],
    runHistory: [
      { id: 'r1', status: 'Success', duration: '4h 12m', startTime: '2025-01-19T14:30:00Z', endTime: '2025-01-19T18:42:00Z', stepsCompleted: 9, totalSteps: 9 },
      { id: 'r2', status: 'Success', duration: '3h 58m', startTime: '2025-01-17T09:00:00Z', endTime: '2025-01-17T12:58:00Z', stepsCompleted: 9, totalSteps: 9 },
      { id: 'r3', status: 'Failed', duration: '2h 15m', startTime: '2025-01-15T11:00:00Z', endTime: '2025-01-15T13:15:00Z', stepsCompleted: 6, totalSteps: 9 },
      { id: 'r4', status: 'Success', duration: '4h 30m', startTime: '2025-01-13T08:30:00Z', endTime: '2025-01-13T13:00:00Z', stepsCompleted: 9, totalSteps: 9 },
      { id: 'r5', status: 'Success', duration: '4h 05m', startTime: '2025-01-11T14:00:00Z', endTime: '2025-01-11T18:05:00Z', stepsCompleted: 9, totalSteps: 9 },
      { id: 'r6', status: 'Success', duration: '3h 52m', startTime: '2025-01-09T10:15:00Z', endTime: '2025-01-09T14:07:00Z', stepsCompleted: 9, totalSteps: 9 },
      { id: 'r7', status: 'Success', duration: '4h 18m', startTime: '2025-01-07T09:45:00Z', endTime: '2025-01-07T14:03:00Z', stepsCompleted: 9, totalSteps: 9 },
      { id: 'r8', status: 'Success', duration: '3h 47m', startTime: '2025-01-05T13:20:00Z', endTime: '2025-01-05T17:07:00Z', stepsCompleted: 9, totalSteps: 9 },
      { id: 'r9', status: 'Success', duration: '4h 01m', startTime: '2025-01-03T08:00:00Z', endTime: '2025-01-03T12:01:00Z', stepsCompleted: 9, totalSteps: 9 },
      { id: 'r10', status: 'Failed', duration: '1h 55m', startTime: '2025-01-01T11:30:00Z', endTime: '2025-01-01T13:25:00Z', stepsCompleted: 5, totalSteps: 9 },
    ],
  },
  {
    id: 'wf2', name: 'Protein Analysis',
    description: 'Comprehensive protein analysis workflow including secondary structure prediction, domain annotation, and PTM site detection.',
    status: 'Active', createdDate: '2024-08-22', lastRunDate: '2025-01-18T10:00:00Z',
    totalRuns: 35, successRate: 94, avgDuration: '2h 15m',
    lastResults: [true, true, true, true, true],
    agentUtilization: [
      { agent: 'Protein Analyst', workflows: 2, hoursUsed: 120, color: '#10b981' },
      { agent: 'Domain Detector', workflows: 3, hoursUsed: 88, color: '#06b6d4' },
    ],
    steps: [
      { id: 's1', title: 'Import FASTA', description: 'Load protein sequences from input directory', type: 'Data Input', status: 'Complete', duration: '3m', agent: 'Data Curator' },
      { id: 's2', title: 'Secondary Structure', description: 'Predict α-helices, β-sheets, and coils using PSIPRED', type: 'AI Processing', status: 'Complete', duration: '15m', agent: 'Protein Analyst' },
      { id: 's3', title: 'Domain Annotation', description: 'Identify Pfam domains and classify protein families', type: 'Analysis', status: 'Complete', duration: '22m', agent: 'Domain Detector' },
      { id: 's4', title: 'PTM Detection', description: 'Detect phosphorylation and glycosylation sites', type: 'Analysis', status: 'Complete', duration: '18m', agent: 'Protein Analyst' },
      { id: 's5', title: 'Generate Report', description: 'Compile analysis into structured report', type: 'Output', status: 'Complete', duration: '5m', agent: 'Data Curator' },
    ],
    runHistory: [
      { id: 'r1', status: 'Success', duration: '2h 10m', startTime: '2025-01-18T10:00:00Z', endTime: '2025-01-18T12:10:00Z', stepsCompleted: 5, totalSteps: 5 },
      { id: 'r2', status: 'Success', duration: '2h 22m', startTime: '2025-01-16T08:30:00Z', endTime: '2025-01-16T10:52:00Z', stepsCompleted: 5, totalSteps: 5 },
      { id: 'r3', status: 'Success', duration: '2h 08m', startTime: '2025-01-14T13:00:00Z', endTime: '2025-01-14T15:08:00Z', stepsCompleted: 5, totalSteps: 5 },
      { id: 'r4', status: 'Failed', duration: '1h 40m', startTime: '2025-01-12T09:15:00Z', endTime: '2025-01-12T10:55:00Z', stepsCompleted: 3, totalSteps: 5 },
      { id: 'r5', status: 'Success', duration: '2h 19m', startTime: '2025-01-10T14:00:00Z', endTime: '2025-01-10T16:19:00Z', stepsCompleted: 5, totalSteps: 5 },
    ],
  },
  {
    id: 'wf3', name: 'Literature Review',
    description: 'Automated literature search, summarization, and citation network mapping for research topics.',
    status: 'Draft', createdDate: '2024-11-10', lastRunDate: '2025-01-10T16:00:00Z',
    totalRuns: 8, successRate: 75, avgDuration: '1h 45m',
    lastResults: [true, false, true, true, true],
    agentUtilization: [
      { agent: 'Search Agent', workflows: 1, hoursUsed: 45, color: '#10b981' },
      { agent: 'Summary Writer', workflows: 1, hoursUsed: 32, color: '#8b5cf6' },
    ],
    steps: [
      { id: 's1', title: 'Query Formulation', description: 'Construct search queries from research topic keywords', type: 'Data Input', status: 'Complete', duration: '5m', agent: 'Search Agent' },
      { id: 's2', title: 'Database Search', description: 'Query PubMed, Semantic Scholar, and ArXiv APIs', type: 'AI Processing', status: 'Complete', duration: '20m', agent: 'Search Agent' },
      { id: 's3', title: 'Relevance Filter', description: 'Rank and filter papers by relevance score > 0.7', type: 'Decision', status: 'Complete', duration: '10m', agent: 'Search Agent' },
      { id: 's4', title: 'Summarize Papers', description: 'Generate concise summaries using LLM extraction', type: 'AI Processing', status: 'Pending', duration: '35m', agent: 'Summary Writer' },
      { id: 's5', title: 'Citation Network', description: 'Build citation graph and identify key clusters', type: 'Analysis', status: 'Pending', duration: '15m', agent: 'Analysis Agent' },
      { id: 's6', title: 'Review Draft', description: 'Assemble literature review draft with references', type: 'Output', status: 'Pending', duration: '10m', agent: 'Summary Writer' },
    ],
    runHistory: [
      { id: 'r1', status: 'Success', duration: '1h 38m', startTime: '2025-01-10T16:00:00Z', endTime: '2025-01-10T17:38:00Z', stepsCompleted: 6, totalSteps: 6 },
      { id: 'r2', status: 'Success', duration: '1h 52m', startTime: '2025-01-07T09:00:00Z', endTime: '2025-01-07T10:52:00Z', stepsCompleted: 6, totalSteps: 6 },
      { id: 'r3', status: 'Failed', duration: '0h 45m', startTime: '2025-01-04T14:30:00Z', endTime: '2025-01-04T15:15:00Z', stepsCompleted: 3, totalSteps: 6 },
      { id: 'r4', status: 'Success', duration: '1h 41m', startTime: '2025-01-02T11:00:00Z', endTime: '2025-01-02T12:41:00Z', stepsCompleted: 6, totalSteps: 6 },
      { id: 'r5', status: 'Cancelled', duration: '0h 30m', startTime: '2024-12-28T10:00:00Z', endTime: '2024-12-28T10:30:00Z', stepsCompleted: 2, totalSteps: 6 },
    ],
  },
  {
    id: 'wf4', name: 'Experiment Planning',
    description: 'AI-assisted experimental design with resource optimization, timeline scheduling, and protocol generation.',
    status: 'Active', createdDate: '2024-07-05', lastRunDate: '2025-01-20T08:00:00Z',
    totalRuns: 22, successRate: 86, avgDuration: '3h 10m',
    lastResults: [true, true, true, false, true],
    agentUtilization: [
      { agent: 'Planning Agent', workflows: 1, hoursUsed: 95, color: '#f59e0b' },
      { agent: 'Resource Optimizer', workflows: 2, hoursUsed: 67, color: '#06b6d4' },
    ],
    steps: [
      { id: 's1', title: 'Define Objectives', description: 'Parse experimental goals and constraints from brief', type: 'Data Input', status: 'Complete', duration: '10m', agent: 'Planning Agent' },
      { id: 's2', title: 'Literature Check', description: 'Search for existing protocols and similar experiments', type: 'AI Processing', status: 'Complete', duration: '25m', agent: 'Planning Agent' },
      { id: 's3', title: 'Resource Assessment', description: 'Check lab inventory and equipment availability', type: 'Analysis', status: 'Complete', duration: '15m', agent: 'Resource Optimizer' },
      { id: 's4', title: 'Protocol Generation', description: 'Generate step-by-step experimental protocol', type: 'AI Processing', status: 'Complete', duration: '40m', agent: 'Planning Agent' },
      { id: 's5', title: 'Safety Review', description: 'Check for hazardous materials and safety compliance', type: 'Review', status: 'Pending', duration: '20m', agent: 'Review Agent' },
      { id: 's6', title: 'Timeline Schedule', description: 'Create Gantt-style timeline with milestones', type: 'Analysis', status: 'Pending', duration: '15m', agent: 'Resource Optimizer' },
      { id: 's7', title: 'Output Protocol', description: 'Export formatted protocol PDF with all appendices', type: 'Output', status: 'Pending', duration: '8m', agent: 'Data Curator' },
    ],
    runHistory: [
      { id: 'r1', status: 'Success', duration: '3h 05m', startTime: '2025-01-20T08:00:00Z', endTime: '2025-01-20T11:05:00Z', stepsCompleted: 7, totalSteps: 7 },
      { id: 'r2', status: 'Success', duration: '3h 18m', startTime: '2025-01-18T09:30:00Z', endTime: '2025-01-18T12:48:00Z', stepsCompleted: 7, totalSteps: 7 },
      { id: 'r3', status: 'Success', duration: '2h 55m', startTime: '2025-01-15T14:00:00Z', endTime: '2025-01-15T16:55:00Z', stepsCompleted: 7, totalSteps: 7 },
      { id: 'r4', status: 'Failed', duration: '1h 20m', startTime: '2025-01-13T10:00:00Z', endTime: '2025-01-13T11:20:00Z', stepsCompleted: 4, totalSteps: 7 },
      { id: 'r5', status: 'Success', duration: '3h 12m', startTime: '2025-01-10T08:45:00Z', endTime: '2025-01-10T11:57:00Z', stepsCompleted: 7, totalSteps: 7 },
    ],
  },
  {
    id: 'wf5', name: 'Data Processing',
    description: 'High-throughput data processing pipeline for genomics and proteomics datasets with quality control.',
    status: 'Archived', createdDate: '2024-03-20', lastRunDate: '2024-12-15T11:00:00Z',
    totalRuns: 62, successRate: 95, avgDuration: '6h 45m',
    lastResults: [true, true, true, true, true],
    agentUtilization: [
      { agent: 'QC Agent', workflows: 3, hoursUsed: 180, color: '#10b981' },
      { agent: 'Normalization Bot', workflows: 2, hoursUsed: 140, color: '#8b5cf6' },
      { agent: 'Cluster Engine', workflows: 1, hoursUsed: 220, color: '#ef4444' },
    ],
    steps: [
      { id: 's1', title: 'Raw Data Ingest', description: 'Import raw FASTQ and mzML files from sequencer', type: 'Data Input', status: 'Complete', duration: '30m', agent: 'Data Curator' },
      { id: 's2', title: 'Quality Control', description: 'Run FastQC and MultiQC for read quality assessment', type: 'Analysis', status: 'Complete', duration: '45m', agent: 'QC Agent' },
      { id: 's3', title: 'Pass QC?', description: 'Evaluate QC metrics and decide to proceed or flag for review', type: 'Decision', status: 'Complete', duration: '5m', agent: 'QC Agent' },
      { id: 's4', title: 'Normalization', description: 'Apply TPM/RPKM normalization for RNA-seq counts', type: 'AI Processing', status: 'Complete', duration: '2h 15m', agent: 'Normalization Bot' },
      { id: 's5', title: 'Clustering', description: 'Unsupervised clustering of expression profiles', type: 'Analysis', status: 'Complete', duration: '1h 30m', agent: 'Cluster Engine' },
      { id: 's6', title: 'Visualization', description: 'Generate heatmaps, PCA plots, and volcano plots', type: 'Output', status: 'Complete', duration: '20m', agent: 'Data Curator' },
    ],
    runHistory: [
      { id: 'r1', status: 'Success', duration: '6h 32m', startTime: '2024-12-15T11:00:00Z', endTime: '2024-12-15T17:32:00Z', stepsCompleted: 6, totalSteps: 6 },
      { id: 'r2', status: 'Success', duration: '6h 50m', startTime: '2024-12-10T08:00:00Z', endTime: '2024-12-10T14:50:00Z', stepsCompleted: 6, totalSteps: 6 },
      { id: 'r3', status: 'Success', duration: '6h 28m', startTime: '2024-12-05T09:30:00Z', endTime: '2024-12-05T15:58:00Z', stepsCompleted: 6, totalSteps: 6 },
      { id: 'r4', status: 'Success', duration: '7h 05m', startTime: '2024-11-28T10:00:00Z', endTime: '2024-11-28T17:05:00Z', stepsCompleted: 6, totalSteps: 6 },
      { id: 'r5', status: 'Success', duration: '6h 40m', startTime: '2024-11-20T07:45:00Z', endTime: '2024-11-20T14:25:00Z', stepsCompleted: 6, totalSteps: 6 },
    ],
  },
]

// ─── Helper Components ──────────────────────────────────────────

function MiniBarChart({ data, height = 48 }: { data: boolean[]; height?: number }) {
  return (
    <div className="rw-mini-bar" style={{ height }}>
      {data.map((val, idx) => (
        <div
          key={idx}
          className="rw-mini-bar__item"
          style={{
            height: `${val ? 100 : 40}%`,
            background: val
              ? 'linear-gradient(180deg, #10b981, rgba(16, 185, 129, 0.5))'
              : 'linear-gradient(180deg, #ef4444, rgba(239, 68, 68, 0.4))',
          }}
          title={val ? 'Success' : 'Failed'}
        />
      ))}
    </div>
  )
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

// ─── Main Component ──────────────────────────────────────────────

export default function ResearchWorkflowPage() {
  const [workflows, setWorkflows] = useState<WorkflowItem[]>(INITIAL_WORKFLOWS)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | WorkflowStatus>('all')
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview')
  const stepsContainerRef = useRef<HTMLDivElement>(null)

  const selectedWorkflow = useMemo(
    () => workflows.find(w => w.id === selectedId) || null,
    [workflows, selectedId]
  )

  const filteredWorkflows = useMemo(() => {
    let result = workflows
    if (statusFilter !== 'all') result = result.filter(w => w.status === statusFilter)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(w =>
        w.name.toLowerCase().includes(q) || w.description.toLowerCase().includes(q)
      )
    }
    return result
  }, [workflows, statusFilter, searchQuery])

  const moveStep = useCallback((wfId: string, stepIdx: number, direction: 'up' | 'down') => {
    setWorkflows(prev => prev.map(wf => {
      if (wf.id !== wfId) return wf
      const newSteps = [...wf.steps]
      const swapIdx = direction === 'up' ? stepIdx - 1 : stepIdx + 1
      if (swapIdx < 0 || swapIdx >= newSteps.length) return wf
      const temp = newSteps[stepIdx]
      newSteps[stepIdx] = newSteps[swapIdx]
      newSteps[swapIdx] = temp
      return { ...wf, steps: newSteps }
    }))
  }, [])

  const addStep = useCallback((wfId: string) => {
    const newStep: WorkflowStep = {
      id: `s-${Date.now()}`,
      title: 'New Step',
      description: 'Configure this step in the workflow',
      type: 'Analysis',
      status: 'Pending',
      duration: '10m',
      agent: 'System',
    }
    setWorkflows(prev => prev.map(wf =>
      wf.id === wfId ? { ...wf, steps: [...wf.steps, newStep] } : wf
    ))
  }, [])

  const deleteStep = useCallback((wfId: string, stepId: string) => {
    setWorkflows(prev => prev.map(wf =>
      wf.id === wfId ? { ...wf, steps: wf.steps.filter(s => s.id !== stepId) } : wf
    ))
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--vl-bg-primary)', color: 'var(--vl-text-primary)' }}>
      {/* ─── Header ─── */}
      <header style={{
        padding: '28px 24px 20px',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.06) 0%, rgba(6, 182, 212, 0.04) 50%, rgba(139, 92, 246, 0.06) 100%)',
        borderBottom: '1px solid var(--vl-border)',
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, #10b981, #06b6d4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
            }}>
              <Workflow size={22} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{
                fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.5px',
                background: 'linear-gradient(135deg, var(--vl-text-primary), var(--vl-accent))',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>Research Workflow</h1>
              <p style={{ fontSize: 13, color: 'var(--vl-text-muted)', margin: '3px 0 0' }}>
                Build, automate, and monitor research workflows with AI-powered agents
              </p>
            </div>
            <button className="rw-action-btn rw-action-btn--primary" style={{ flexShrink: 0 }}>
              <Plus size={15} /> Create Workflow
            </button>
          </div>
          {/* Search + Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              flex: 1, minWidth: 200, maxWidth: 400,
              padding: '8px 14px', borderRadius: 8,
              background: 'var(--vl-bg-card)', border: '1px solid var(--vl-border)',
            }}>
              <Search size={14} style={{ color: 'var(--vl-text-muted)', flexShrink: 0 }} />
              <input
                placeholder="Search workflows..."
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
            <div style={{ display: 'flex', gap: 6 }}>
              {(['all', 'Active', 'Draft', 'Archived'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  style={{
                    padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 500,
                    background: statusFilter === f ? 'var(--vl-accent)' : 'var(--vl-bg-card)',
                    color: statusFilter === f ? '#fff' : 'var(--vl-text-secondary)',
                    transition: 'all 0.15s ease',
                    border: statusFilter === f ? 'none' : '1px solid var(--vl-border)',
                  }}
                >
                  {f === 'all' ? 'All' : f}
                </button>
              ))}
            </div>
            {/* Quick Stats */}
            <div style={{ display: 'flex', gap: 10, marginLeft: 'auto', flexWrap: 'wrap' }}>
              {[
                { label: `${workflows.filter(w => w.status === 'Active').length} Active`, color: '#10b981', icon: <Activity size={13} /> },
                { label: `${workflows.reduce((s, w) => s + w.totalRuns, 0)} Total Runs`, color: '#06b6d4', icon: <Play size={13} /> },
                { label: `${Math.round(workflows.reduce((s, w) => s + w.successRate, 0) / workflows.length)}% Success`, color: '#8b5cf6', icon: <TrendingUp size={13} /> },
              ].map(stat => (
                <div key={stat.label} style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 20,
                  background: `${stat.color}10`, border: `1px solid ${stat.color}25`,
                  fontSize: 11, fontWeight: 500, color: stat.color,
                }}>
                  {stat.icon} {stat.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: 24 }}>
        {!selectedWorkflow ? (
          /* ─── Workflow Grid ─── */
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
              {filteredWorkflows.map(wf => {
                const badge = WORKFLOW_STATUS_BADGE[wf.status]
                return (
                  <div key={wf.id} className="rw-card" onClick={() => setSelectedId(wf.id)}>
                    <div className="rw-card__color-bar" style={{
                      background: `linear-gradient(90deg, ${badge.color}, ${badge.color}66)`,
                    }} />
                    <div className="rw-card__body">
                      <div className="rw-card__header">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 className="rw-card__title">{wf.name}</h3>
                          <span className={`rw-card__status-badge ${badge.cls}`} style={{ marginTop: 6 }}>
                            <span className={`rw-status-dot ${STATUS_DOT_CLASS[wf.status === 'Active' ? 'Complete' : wf.status === 'Draft' ? 'Running' : 'Pending']}`} style={{ width: 6, height: 6 }} />
                            {wf.status}
                          </span>
                        </div>
                        <ChevronRight size={18} style={{ color: 'var(--vl-text-muted)', marginTop: 4 }} />
                      </div>
                      <p className="rw-card__desc">{wf.description}</p>
                      <div className="rw-card__meta">
                        <span className="rw-card__meta-item"><Activity size={12} /> {wf.steps.length} steps</span>
                        <span className="rw-card__meta-item"><Play size={12} /> {wf.totalRuns} runs</span>
                        <span className="rw-card__meta-item"><TrendingUp size={12} /> {wf.successRate}%</span>
                        <span className="rw-card__meta-item" style={{ marginLeft: 'auto' }}>
                          <Clock size={12} /> {formatRelativeTime(wf.lastRunDate)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {filteredWorkflows.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--vl-text-muted)' }}>
                <Workflow size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
                <p style={{ fontSize: 15, fontWeight: 500, margin: '0 0 6px' }}>No workflows found</p>
                <p style={{ fontSize: 13, margin: 0 }}>Try adjusting your search or filter criteria</p>
              </div>
            )}
          </div>
        ) : (
          /* ─── Workflow Detail View ─── */
          <div>
            {/* Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <button onClick={() => setSelectedId(null)} style={{
                display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
                cursor: 'pointer', color: 'var(--vl-accent)', fontSize: 13, fontWeight: 500, padding: 0,
              }}>
                <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} /> Back to Workflows
              </button>
              <span style={{ color: 'var(--vl-text-muted)', fontSize: 13 }}>/</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--vl-text-heading)' }}>{selectedWorkflow.name}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
              {/* ─── Left: Pipeline + History ─── */}
              <div>
                {/* Workflow Info Bar */}
                <div style={{
                  background: 'var(--vl-bg-card)', borderRadius: 12, padding: '16px 20px',
                  border: '1px solid var(--vl-border)', marginBottom: 16,
                  display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
                }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: 'var(--vl-text-heading)' }}>
                      {selectedWorkflow.name}
                    </h2>
                    <p style={{ fontSize: 12, color: 'var(--vl-text-muted)', margin: 0, lineHeight: 1.5 }}>
                      {selectedWorkflow.description}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                    <button className="rw-action-btn rw-action-btn--primary"><Play size={14} /> Run Workflow</button>
                    <button className="rw-action-btn"><Copy size={14} /> Duplicate</button>
                    <button className="rw-action-btn"><Download size={14} /> Export</button>
                    <button className="rw-action-btn"><Share2 size={14} /> Share</button>
                    <button className="rw-action-btn"><Calendar size={14} /> Schedule</button>
                  </div>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--vl-border)', paddingBottom: 0 }}>
                  {(['overview', 'history'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} style={{
                      padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
                      fontSize: 13, fontWeight: 600, color: activeTab === tab ? 'var(--vl-accent)' : 'var(--vl-text-muted)',
                      borderBottom: activeTab === tab ? '2px solid var(--vl-accent)' : '2px solid transparent',
                      marginBottom: -1, transition: 'all 0.15s ease', textTransform: 'capitalize',
                    }}>
                      {tab === 'overview' ? 'Pipeline Steps' : 'Run History'}
                    </button>
                  ))}
                </div>

                {activeTab === 'overview' ? (
                  /* ─── Pipeline Visualization ─── */
                  <div>
                    <div style={{
                      background: 'var(--vl-bg-card)', borderRadius: 12,
                      border: '1px solid var(--vl-border)', padding: '8px 16px 16px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: 'var(--vl-text-heading)' }}>
                          <GitBranch size={15} style={{ marginRight: 6, verticalAlign: -2, color: 'var(--vl-accent)' }} />
                          Pipeline ({selectedWorkflow.steps.length} steps)
                        </h3>
                        <button className="rw-action-btn" onClick={() => addStep(selectedWorkflow.id)} style={{ fontSize: 12, padding: '5px 12px' }}>
                          <Plus size={13} /> Add Step
                        </button>
                      </div>

                      <div className="rw-pipeline" ref={stepsContainerRef}>
                        {selectedWorkflow.steps.map((step, idx) => {
                          const typeConfig = STEP_TYPE_CONFIG[step.type]
                          const nodeClass = step.status === 'Running' ? 'rw-step-node--running'
                            : step.status === 'Complete' ? 'rw-step-node--complete'
                            : step.status === 'Error' ? 'rw-step-node--error' : ''

                          return (
                            <React.Fragment key={step.id}>
                              {/* Connector */}
                              {idx > 0 && (
                                <div className="rw-pipeline__connector">
                                  <div className={step.status === 'Running' ? 'rw-pipeline__connector-animated' : 'rw-pipeline__connector-line'} />
                                </div>
                              )}

                              {/* Step Node */}
                              <div className={`rw-step-node ${nodeClass} rw-step-animate-in`} style={{ animationDelay: `${idx * 0.05}s` }}>
                                <div className="rw-step-node__glow" />
                                {/* Reorder Handles */}
                                <div className="rw-step-node__actions">
                                  <button onClick={(e) => { e.stopPropagation(); moveStep(selectedWorkflow.id, idx, 'up') }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--vl-text-muted)', padding: 2, opacity: idx === 0 ? 0.3 : 1 }}
                                    disabled={idx === 0}>
                                    <ArrowUp size={14} />
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); moveStep(selectedWorkflow.id, idx, 'down') }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--vl-text-muted)', padding: 2, opacity: idx === selectedWorkflow.steps.length - 1 ? 0.3 : 1 }}
                                    disabled={idx === selectedWorkflow.steps.length - 1}>
                                    <ArrowDown size={14} />
                                  </button>
                                </div>
                                {/* Icon */}
                                <div className={`rw-step-node__icon-wrap ${typeConfig.cssClass}`} style={{ color: typeConfig.color }}>
                                  {typeConfig.icon}
                                </div>
                                {/* Body */}
                                <div className="rw-step-node__body">
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span className={`rw-status-dot ${STATUS_DOT_CLASS[step.status]}`} />
                                    <h4 className="rw-step-node__title">{step.title}</h4>
                                    <span style={{
                                      fontSize: 10, padding: '1px 8px', borderRadius: 10,
                                      background: `${typeConfig.color}15`, color: typeConfig.color,
                                      fontWeight: 500, whiteSpace: 'nowrap',
                                    }}>{step.type}</span>
                                  </div>
                                  <p className="rw-step-node__desc">{step.description}</p>
                                  <div className="rw-step-node__footer">
                                    <span className="rw-step-node__agent-tag">
                                      <Users size={10} style={{ marginRight: 3 }} /> {step.agent}
                                    </span>
                                    <span className="rw-step-node__duration-tag">
                                      <Timer size={10} /> {step.duration}
                                    </span>
                                    <span style={{
                                      fontSize: 10, fontWeight: 600, color: STATUS_COLORS[step.status],
                                      display: 'flex', alignItems: 'center', gap: 3,
                                    }}>
                                      {step.status === 'Running' && <Loader2 size={10} className="rw-step-animate-in" style={{ animation: 'spin 1s linear infinite' }} />}
                                      {step.status === 'Complete' && <CheckCircle2 size={10} />}
                                      {step.status === 'Error' && <AlertCircle size={10} />}
                                      {step.status === 'Pending' && <Clock size={10} />}
                                      {step.status}
                                    </span>
                                  </div>
                                </div>
                                {/* Delete */}
                                <button onClick={(e) => { e.stopPropagation(); deleteStep(selectedWorkflow.id, step.id) }}
                                  style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: 'var(--vl-text-muted)', padding: '8px 4px 8px 8px', opacity: 0.5,
                                    transition: 'opacity 0.15s',
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#ef4444' }}
                                  onMouseLeave={e => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.color = 'var(--vl-text-muted)' }}>
                                  <Trash2 size={14} />
                                </button>
                              </div>

                              {/* Decision Branch */}
                              {step.type === 'Decision' && (
                                <div className="rw-branch" style={{ paddingLeft: 60 }}>
                                  <div className="rw-branch__path">
                                    <span className="rw-branch__label rw-branch__label--yes">
                                      <CheckCircle2 size={10} /> Yes — Continue
                                    </span>
                                    <div style={{ fontSize: 11, color: 'var(--vl-text-muted)', padding: '4px 0' }}>
                                      Proceed to next step in pipeline
                                    </div>
                                  </div>
                                  <div className="rw-branch__path">
                                    <span className="rw-branch__label rw-branch__label--no">
                                      <AlertCircle size={10} /> No — Re-run
                                    </span>
                                    <div style={{ fontSize: 11, color: 'var(--vl-text-muted)', padding: '4px 0' }}>
                                      Loop back to previous step for re-evaluation
                                    </div>
                                  </div>
                                </div>
                              )}
                            </React.Fragment>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ─── Run History Table ─── */
                  <div style={{
                    background: 'var(--vl-bg-card)', borderRadius: 12,
                    border: '1px solid var(--vl-border)', overflow: 'hidden',
                  }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="rw-run-table">
                        <thead>
                          <tr>
                            <th>Status</th>
                            <th>Duration</th>
                            <th>Start Time</th>
                            <th>End Time</th>
                            <th>Progress</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedWorkflow.runHistory.map(run => (
                            <tr key={run.id}>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{
                                    width: 7, height: 7, borderRadius: '50%',
                                    background: RUN_STATUS_COLORS[run.status],
                                  }} />
                                  <span style={{ fontWeight: 500, color: RUN_STATUS_COLORS[run.status] }}>{run.status}</span>
                                </div>
                              </td>
                              <td><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {run.duration}</span></td>
                              <td>
                                <div style={{ fontSize: 12 }}>{formatDate(run.startTime)}</div>
                                <div style={{ fontSize: 11, color: 'var(--vl-text-muted)' }}>{formatTime(run.startTime)}</div>
                              </td>
                              <td>
                                <div style={{ fontSize: 12 }}>{formatDate(run.endTime)}</div>
                                <div style={{ fontSize: 11, color: 'var(--vl-text-muted)' }}>{formatTime(run.endTime)}</div>
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <div style={{
                                    flex: 1, maxWidth: 80, height: 4, borderRadius: 2,
                                    background: 'var(--vl-bg-secondary)', overflow: 'hidden',
                                  }}>
                                    <div style={{
                                      height: '100%', borderRadius: 2,
                                      width: `${(run.stepsCompleted / run.totalSteps) * 100}%`,
                                      background: run.status === 'Success' ? '#10b981' : run.status === 'Failed' ? '#ef4444' : 'var(--vl-accent)',
                                    }} />
                                  </div>
                                  <span style={{ fontSize: 11, color: 'var(--vl-text-muted)', whiteSpace: 'nowrap' }}>
                                    {run.stepsCompleted}/{run.totalSteps}
                                  </span>
                                </div>
                              </td>
                              <td>
                                <ChevronRight size={14} style={{ color: 'var(--vl-text-muted)' }} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* ─── Right: Metrics Panel ─── */}
              <div style={{ position: 'sticky', top: 24 }}>
                {/* Stats */}
                <div className="rw-metrics-panel" style={{ marginBottom: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 14px', color: 'var(--vl-text-heading)' }}>
                    <Zap size={15} style={{ marginRight: 6, verticalAlign: -2, color: 'var(--vl-accent)' }} />
                    Workflow Metrics
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      { value: selectedWorkflow.totalRuns, label: 'Total Runs', color: '#10b981' },
                      { value: `${selectedWorkflow.successRate}%`, label: 'Success Rate', color: selectedWorkflow.successRate >= 85 ? '#10b981' : '#f59e0b' },
                      { value: selectedWorkflow.avgDuration, label: 'Avg Duration', color: '#06b6d4' },
                      { value: selectedWorkflow.steps.length, label: 'Total Steps', color: '#8b5cf6' },
                    ].map(stat => (
                      <div key={stat.label} className="rw-metrics-panel__stat">
                        <div className="rw-metrics-panel__stat-value" style={{ color: stat.color }}>{stat.value}</div>
                        <div className="rw-metrics-panel__stat-label">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Last 5 Runs */}
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--vl-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Last 5 Runs
                    </div>
                    <MiniBarChart data={selectedWorkflow.lastResults} height={52} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--vl-text-muted)', marginTop: 4 }}>
                      <span>Oldest</span><span>Newest</span>
                    </div>
                  </div>
                </div>

                {/* Agent Utilization */}
                <div className="rw-metrics-panel">
                  <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 14px', color: 'var(--vl-text-heading)' }}>
                    <Users size={15} style={{ marginRight: 6, verticalAlign: -2, color: '#06b6d4' }} />
                    Agent Utilization
                  </h3>
                  {selectedWorkflow.agentUtilization.map(ag => (
                    <div key={ag.agent} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 0', borderBottom: '1px solid var(--vl-border-subtle, rgba(229,231,235,0.4))',
                    }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: 2, background: ag.color, flexShrink: 0,
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--vl-text-heading)', marginBottom: 4 }}>{ag.agent}</div>
                        <div style={{ height: 3, borderRadius: 2, background: 'var(--vl-bg-secondary)', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 2,
                            width: `${Math.min((ag.hoursUsed / 250) * 100, 100)}%`,
                            background: ag.color,
                          }} />
                        </div>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--vl-text-muted)', whiteSpace: 'nowrap' }}>{ag.hoursUsed}h</span>
                    </div>
                  ))}
                </div>

                {/* Created / Last Run */}
                <div className="rw-metrics-panel" style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--vl-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Created</div>
                      <div style={{ fontSize: 12, fontWeight: 500, marginTop: 2 }}>{formatDate(selectedWorkflow.createdDate)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 10, color: 'var(--vl-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Last Run</div>
                      <div style={{ fontSize: 12, fontWeight: 500, marginTop: 2 }}>{formatRelativeTime(selectedWorkflow.lastRunDate)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
