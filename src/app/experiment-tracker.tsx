'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Plus, Search, X, Download, ChevronDown, ChevronRight, Trash2,
  Filter, Archive, RotateCcw, Beaker, Clock, Tag, Target,
  AlertTriangle, CheckCircle2, XCircle, Layers, Play, FlaskConical,
  FileText, Edit3, ExternalLink, Calendar, Users, Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

// ============================================================
// Types
// ============================================================

type ExperimentStatus = 'planned' | 'running' | 'completed' | 'failed' | 'archived'
type ExperimentPriority = 'low' | 'medium' | 'high' | 'critical'

interface ExperimentVariable {
  name: string
  type: 'independent' | 'dependent'
  unit: string
  description?: string
}

interface ExperimentResult {
  trial: number
  value: number
  notes: string
  timestamp: string
}

interface StatusChange {
  status: ExperimentStatus
  timestamp: string
  note?: string
}

interface ExperimentStats {
  mean: number
  median: number
  stdDev: number
  min: number
  max: number
  sampleSize: number
}

interface Experiment {
  id: string
  title: string
  hypothesis: string
  description: string
  methodology: string
  status: ExperimentStatus
  priority: ExperimentPriority
  variables: ExperimentVariable[]
  results: ExperimentResult[]
  statusHistory: StatusChange[]
  tags: string[]
  expectedDuration: string
  associatedMeetingIds: string[]
  associatedAgentIds: string[]
  createdAt: string
  updatedAt: string
  completedAt?: string
  stats: ExperimentStats | null
}

export interface ExperimentTrackerProps {
  lang?: Lang
}

// ============================================================
// Constants
// ============================================================

const STORAGE_KEY = 'vl-experiments'

const STATUS_CONFIG: Record<ExperimentStatus, { label: string; color: string; icon: React.ReactNode }> = {
  planned: { label: 'Planned', color: 'exp-status-badge-planned', icon: <Layers className="size-3" /> },
  running: { label: 'Running', color: 'exp-status-badge-running', icon: <Play className="size-3" /> },
  completed: { label: 'Completed', color: 'exp-status-badge-completed', icon: <CheckCircle2 className="size-3" /> },
  failed: { label: 'Failed', color: 'exp-status-badge-failed', icon: <XCircle className="size-3" /> },
  archived: { label: 'Archived', color: 'exp-status-badge-archived', icon: <Archive className="size-3" /> },
}

const PRIORITY_CONFIG: Record<ExperimentPriority, { label: string; color: string }> = {
  low: { label: 'Low', color: 'exp-priority-indicator-low' },
  medium: { label: 'Medium', color: 'exp-priority-indicator-medium' },
  high: { label: 'High', color: 'exp-priority-indicator-high' },
  critical: { label: 'Critical', color: 'exp-priority-indicator-critical' },
}

const ALL_STATUSES: ExperimentStatus[] = ['planned', 'running', 'completed', 'failed', 'archived']
const ALL_PRIORITIES: ExperimentPriority[] = ['low', 'medium', 'high', 'critical']

// ============================================================
// Helpers
// ============================================================

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function computeStats(results: ExperimentResult[]): ExperimentStats | null {
  if (results.length === 0) return null
  const values = results.map(r => r.value)
  const sorted = [...values].sort((a, b) => a - b)
  const sum = values.reduce((a, b) => a + b, 0)
  const mean = sum / values.length
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)]
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length
  const stdDev = Math.sqrt(variance)
  return {
    mean: Math.round(mean * 100) / 100,
    median: Math.round(median * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100,
    min: Math.round(sorted[0] * 100) / 100,
    max: Math.round(sorted[sorted.length - 1] * 100) / 100,
    sampleSize: values.length,
  }
}

function generateSampleData(): Experiment[] {
  const now = Date.now()
  const day = 86400000
  return [
    {
      id: 'exp-001', title: 'Nanobody CDR3 Loop Optimization',
      hypothesis: 'Systematic mutagenesis of CDR3 loop residues will increase binding affinity by >2-fold while maintaining stability above 65°C.',
      description: 'Alanine scanning and saturation mutagenesis of the CDR3 loop region.', methodology: 'Site-directed mutagenesis + yeast surface display screening.',
      status: 'completed', priority: 'critical',
      variables: [
        { name: 'CDR3 mutation type', type: 'independent', unit: 'mutation' },
        { name: 'Binding affinity (KD)', type: 'dependent', unit: 'nM' },
      ],
      results: [
        { trial: 1, value: 12.3, notes: 'Wild-type baseline', timestamp: new Date(now - 30 * day).toISOString() },
        { trial: 2, value: 5.1, notes: 'Gly50Ala', timestamp: new Date(now - 29 * day).toISOString() },
        { trial: 3, value: 3.8, notes: 'Gly50Trp', timestamp: new Date(now - 28 * day).toISOString() },
        { trial: 4, value: 2.1, notes: 'Trp52Leu double', timestamp: new Date(now - 27 * day).toISOString() },
        { trial: 5, value: 1.8, notes: 'Triple mutant optimized', timestamp: new Date(now - 26 * day).toISOString() },
      ],
      statusHistory: [
        { status: 'planned', timestamp: new Date(now - 35 * day).toISOString() },
        { status: 'running', timestamp: new Date(now - 30 * day).toISOString(), note: 'Mutagenesis started' },
        { status: 'completed', timestamp: new Date(now - 26 * day).toISOString(), note: 'All trials done' },
      ],
      tags: ['nanobody', 'protein-engineering', 'sars-cov-2'],
      expectedDuration: '14 days', associatedMeetingIds: [], associatedAgentIds: [],
      createdAt: new Date(now - 35 * day).toISOString(), updatedAt: new Date(now - 26 * day).toISOString(),
      completedAt: new Date(now - 26 * day).toISOString(), stats: null,
    },
    {
      id: 'exp-002', title: 'AlphaFold-Multimer Structure Benchmark',
      hypothesis: 'AlphaFold-Multimer v2.3 will achieve >90% accuracy (TM-score > 0.9) for nanobody-antigen complex structures.',
      description: 'Benchmarking on 50 nanobody-antigen complexes with known structures.', methodology: 'Compare predictions to cryo-EM using TM-score and lDDT.',
      status: 'running', priority: 'high',
      variables: [
        { name: 'Model version', type: 'independent', unit: 'version' },
        { name: 'TM-score', type: 'dependent', unit: 'score' },
      ],
      results: [
        { trial: 1, value: 0.92, notes: 'AF v2.3, 6 recycles', timestamp: new Date(now - 5 * day).toISOString() },
        { trial: 2, value: 0.88, notes: 'AF v2.2, 6 recycles', timestamp: new Date(now - 4 * day).toISOString() },
        { trial: 3, value: 0.95, notes: 'AF v2.3, 12 recycles', timestamp: new Date(now - 3 * day).toISOString() },
      ],
      statusHistory: [
        { status: 'planned', timestamp: new Date(now - 10 * day).toISOString() },
        { status: 'running', timestamp: new Date(now - 5 * day).toISOString() },
      ],
      tags: ['alphafold', 'structure-prediction', 'benchmarking'],
      expectedDuration: '21 days', associatedMeetingIds: [], associatedAgentIds: [],
      createdAt: new Date(now - 10 * day).toISOString(), updatedAt: new Date(now - 3 * day).toISOString(), stats: null,
    },
    {
      id: 'exp-003', title: 'Rosetta Energy Function Calibration',
      hypothesis: 'Recalibrated Rosetta ref2015 will improve docking success from 35% to >60% for top-5 predictions.',
      description: 'Re-weighting Rosetta energy terms using 200 validated complexes.', methodology: 'RosettaDock decoy generation + weight optimization.',
      status: 'completed', priority: 'high',
      variables: [
        { name: 'Energy weight set', type: 'independent', unit: 'parameter' },
        { name: 'Success rate', type: 'dependent', unit: '%' },
      ],
      results: [
        { trial: 1, value: 35, notes: 'Default baseline', timestamp: new Date(now - 60 * day).toISOString() },
        { trial: 2, value: 42, notes: 'Adjusted fa_elec', timestamp: new Date(now - 58 * day).toISOString() },
        { trial: 3, value: 51, notes: 'Adjusted hbond', timestamp: new Date(now - 56 * day).toISOString() },
        { trial: 4, value: 63, notes: 'Full recalibration', timestamp: new Date(now - 52 * day).toISOString() },
      ],
      statusHistory: [
        { status: 'planned', timestamp: new Date(now - 65 * day).toISOString() },
        { status: 'running', timestamp: new Date(now - 60 * day).toISOString() },
        { status: 'completed', timestamp: new Date(now - 52 * day).toISOString(), note: 'Target exceeded' },
      ],
      tags: ['rosetta', 'docking', 'energy-calibration'],
      expectedDuration: '21 days', associatedMeetingIds: [], associatedAgentIds: [],
      createdAt: new Date(now - 65 * day).toISOString(), updatedAt: new Date(now - 52 * day).toISOString(),
      completedAt: new Date(now - 52 * day).toISOString(), stats: null,
    },
    {
      id: 'exp-004', title: 'Binding Affinity Correlation Study',
      hypothesis: 'Rosetta ΔΔG will show strong correlation (R² > 0.7) with SPR measured binding affinities.',
      description: 'Statistical analysis of predicted vs experimental binding energies.', methodology: 'Linear regression on 100 nanobody variants.',
      status: 'failed', priority: 'medium',
      variables: [
        { name: 'Rosetta ΔΔG', type: 'independent', unit: 'kcal/mol' },
        { name: 'SPR KD', type: 'dependent', unit: 'nM' },
      ],
      results: [
        { trial: 1, value: 0.45, notes: 'R² all variants', timestamp: new Date(now - 40 * day).toISOString() },
        { trial: 2, value: 0.52, notes: 'R² no outliers', timestamp: new Date(now - 39 * day).toISOString() },
      ],
      statusHistory: [
        { status: 'planned', timestamp: new Date(now - 45 * day).toISOString() },
        { status: 'running', timestamp: new Date(now - 40 * day).toISOString() },
        { status: 'failed', timestamp: new Date(now - 38 * day).toISOString(), note: 'R² target not met' },
      ],
      tags: ['binding-affinity', 'spr', 'correlation'],
      expectedDuration: '10 days', associatedMeetingIds: [], associatedAgentIds: [],
      createdAt: new Date(now - 45 * day).toISOString(), updatedAt: new Date(now - 38 * day).toISOString(), stats: null,
    },
    {
      id: 'exp-005', title: 'ESM-2 CDR1 Sequence Generation',
      hypothesis: 'ESM-2 can generate novel CDR1 sequences maintaining structural compatibility (RMSD < 2Å).',
      description: 'Masked language modeling for CDR1 loop design.', methodology: 'ESM-2 generation + AlphaFold validation.',
      status: 'planned', priority: 'medium',
      variables: [
        { name: 'ESM-2 model size', type: 'independent', unit: 'params' },
        { name: 'Structure RMSD', type: 'dependent', unit: 'Å' },
      ],
      results: [], statusHistory: [{ status: 'planned', timestamp: new Date(now - 2 * day).toISOString() }],
      tags: ['esm', 'language-model', 'sequence-generation'],
      expectedDuration: '10 days', associatedMeetingIds: [], associatedAgentIds: [],
      createdAt: new Date(now - 2 * day).toISOString(), updatedAt: new Date(now - 2 * day).toISOString(), stats: null,
    },
    {
      id: 'exp-006', title: 'Protein Folding Kinetics MD Simulation',
      hypothesis: 'Metadynamics MD can reproduce nanobody folding pathways within 500ns simulation time.',
      description: 'All-atom MD of 5 nanobody variants with different CDR3 lengths.', methodology: 'GROMACS + CHARMM36m + Well-Tempered Metadynamics.',
      status: 'running', priority: 'low',
      variables: [
        { name: 'CDR3 length', type: 'independent', unit: 'residues' },
        { name: 'Folding time', type: 'dependent', unit: 'ns' },
      ],
      results: [
        { trial: 1, value: 245, notes: 'CDR3=8', timestamp: new Date(now - 14 * day).toISOString() },
        { trial: 2, value: 312, notes: 'CDR3=12', timestamp: new Date(now - 12 * day).toISOString() },
        { trial: 3, value: 489, notes: 'CDR3=16', timestamp: new Date(now - 10 * day).toISOString() },
      ],
      statusHistory: [
        { status: 'planned', timestamp: new Date(now - 16 * day).toISOString() },
        { status: 'running', timestamp: new Date(now - 14 * day).toISOString() },
      ],
      tags: ['molecular-dynamics', 'folding', 'simulation'],
      expectedDuration: '28 days', associatedMeetingIds: [], associatedAgentIds: [],
      createdAt: new Date(now - 16 * day).toISOString(), updatedAt: new Date(now - 8 * day).toISOString(), stats: null,
    },
    {
      id: 'exp-007', title: 'Immunogenicity Prediction Pipeline',
      hypothesis: 'Combined BepiPred + DiscoTope can identify immunogenic epitopes with >80% sensitivity.',
      description: 'Consensus immunogenicity pipeline for nanobody developability.', methodology: 'Multi-tool prediction + consensus classifier.',
      status: 'completed', priority: 'medium',
      variables: [
        { name: 'Prediction tool', type: 'independent', unit: 'tool' },
        { name: 'Sensitivity', type: 'dependent', unit: '%' },
      ],
      results: [
        { trial: 1, value: 72, notes: 'BepiPred', timestamp: new Date(now - 50 * day).toISOString() },
        { trial: 2, value: 68, notes: 'DiscoTope', timestamp: new Date(now - 49 * day).toISOString() },
        { trial: 3, value: 84, notes: 'Consensus', timestamp: new Date(now - 47 * day).toISOString() },
      ],
      statusHistory: [
        { status: 'planned', timestamp: new Date(now - 55 * day).toISOString() },
        { status: 'running', timestamp: new Date(now - 50 * day).toISOString() },
        { status: 'completed', timestamp: new Date(now - 46 * day).toISOString() },
      ],
      tags: ['immunogenicity', 'developability', 'bepipred'],
      expectedDuration: '14 days', associatedMeetingIds: [], associatedAgentIds: [],
      createdAt: new Date(now - 55 * day).toISOString(), updatedAt: new Date(now - 46 * day).toISOString(),
      completedAt: new Date(now - 46 * day).toISOString(), stats: null,
    },
    {
      id: 'exp-008', title: 'Multi-Objective Optimization (NSGA-II)',
      hypothesis: 'Pareto-optimal nanobodies can be identified by jointly optimizing affinity, stability, and expressibility.',
      description: 'NSGA-II genetic algorithm for multi-objective nanobody optimization.', methodology: 'NSGA-II with Rosetta, FoldX, Solubis fitness functions.',
      status: 'planned', priority: 'high',
      variables: [
        { name: 'Population size', type: 'independent', unit: 'individuals' },
        { name: 'Hypervolume', type: 'dependent', unit: 'score' },
      ],
      results: [], statusHistory: [{ status: 'planned', timestamp: new Date(now - 1 * day).toISOString() }],
      tags: ['optimization', 'nsga-ii', 'multi-objective'],
      expectedDuration: '28 days', associatedMeetingIds: [], associatedAgentIds: [],
      createdAt: new Date(now - 1 * day).toISOString(), updatedAt: new Date(now - 1 * day).toISOString(), stats: null,
    },
  ].map(exp => ({ ...exp, stats: computeStats(exp.results) }))
}

// ============================================================
// Experiment Card Component
// ============================================================

function ExperimentCard({
  experiment,
  onSelect,
  onStatusChange,
}: {
  experiment: Experiment
  onSelect: (exp: Experiment) => void
  onStatusChange: (id: string, status: ExperimentStatus) => void
}) {
  const statusCfg = STATUS_CONFIG[experiment.status]
  const priorityCfg = PRIORITY_CONFIG[experiment.priority]

  return (
    <div
      className="exp-card exp-card-animate"
      data-status={experiment.status}
      onClick={() => onSelect(experiment)}
    >
      <div className={`exp-priority-stripe exp-priority-stripe-${experiment.priority}`} />

      {/* Header */}
      <div className="exp-card-header">
        <h3 className="exp-card-title pr-2">{experiment.title}</h3>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`exp-priority-indicator ${priorityCfg.color}`}>
            {priorityCfg.label}
          </span>
        </div>
      </div>

      {/* Hypothesis */}
      <p className="exp-card-hypothesis">{experiment.hypothesis}</p>

      {/* Status Badge + Date */}
      <div className="exp-card-meta mb-3">
        <span className={`exp-status-badge ${statusCfg.color}`}>
          <span className={`exp-status-dot exp-status-dot-${experiment.status}`} />
          {statusCfg.label}
        </span>
        <span className="exp-card-date flex items-center gap-1">
          <Clock className="size-3" />
          {formatDate(experiment.updatedAt)}
        </span>
      </div>

      {/* Results preview */}
      {experiment.stats && (
        <div className="exp-results-grid mb-3">
          <div className="exp-results-grid-item">
            <div className="exp-results-grid-label">Mean</div>
            <div className="exp-results-grid-value">{experiment.stats.mean}</div>
          </div>
          <div className="exp-results-grid-item">
            <div className="exp-results-grid-label">Trials</div>
            <div className="exp-results-grid-value">{experiment.stats.sampleSize}</div>
          </div>
        </div>
      )}

      {/* Tags */}
      {experiment.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {experiment.tags.slice(0, 3).map(tag => (
            <span key={tag} className="exp-tag">
              <Tag className="size-2.5" />
              {tag}
            </span>
          ))}
          {experiment.tags.length > 3 && (
            <span className="exp-tag">+{experiment.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-[var(--vl-border-subtle)]">
        {experiment.status === 'planned' && (
          <button
            className="text-xs flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-colors"
            onClick={(e) => { e.stopPropagation(); onStatusChange(experiment.id, 'running') }}
          >
            <Play className="size-3" /> Start
          </button>
        )}
        {experiment.status === 'running' && (
          <button
            className="text-xs flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
            onClick={(e) => { e.stopPropagation(); onStatusChange(experiment.id, 'completed') }}
          >
            <CheckCircle2 className="size-3" /> Complete
          </button>
        )}
        <span className="text-xs vl-text-muted ml-auto">
          {experiment.expectedDuration && (
            <span className="flex items-center gap-1"><Target className="size-3" />{experiment.expectedDuration}</span>
          )}
        </span>
      </div>
    </div>
  )
}

// ============================================================
// Create / Edit Experiment Modal
// ============================================================

function ExperimentForm({
  experiment,
  onSave,
  onCancel,
}: {
  experiment: Experiment | null
  onSave: (data: Partial<Experiment>) => void
  onCancel: () => void
}) {
  const isEdit = experiment !== null

  const [formTitle, setFormTitle] = useState(experiment?.title || '')
  const [formHypothesis, setFormHypothesis] = useState(experiment?.hypothesis || '')
  const [formDescription, setFormDescription] = useState(experiment?.description || '')
  const [formMethodology, setFormMethodology] = useState(experiment?.methodology || '')
  const [formPriority, setFormPriority] = useState<ExperimentPriority>(experiment?.priority || 'medium')
  const [formDuration, setFormDuration] = useState(experiment?.expectedDuration || '')
  const [formTags, setFormTags] = useState(experiment?.tags.join(', ') || '')
  const [formVariables, setFormVariables] = useState<ExperimentVariable[]>(
    experiment?.variables || [{ name: '', type: 'independent' as const, unit: '', description: '' }]
  )
  const [formMeetingIds, setFormMeetingIds] = useState(experiment?.associatedMeetingIds.join(', ') || '')
  const [formAgentIds, setFormAgentIds] = useState(experiment?.associatedAgentIds.join(', ') || '')
  const [tagInput, setTagInput] = useState('')

  const handleAddVariable = useCallback(() => {
    setFormVariables(prev => [...prev, { name: '', type: 'independent', unit: '', description: '' }])
  }, [])

  const handleRemoveVariable = useCallback((idx: number) => {
    setFormVariables(prev => prev.filter((_, i) => i !== idx))
  }, [])

  const handleVariableChange = useCallback((idx: number, field: keyof ExperimentVariable, value: string) => {
    setFormVariables(prev => prev.map((v, i) => i === idx ? { ...v, [field]: value } : v))
  }, [])

  const handleSubmit = useCallback(() => {
    if (!formTitle.trim()) {
      toast.error('Title is required')
      return
    }
    const tags = formTags.split(',').map(t => t.trim()).filter(Boolean)
    const meetingIds = formMeetingIds.split(',').map(t => t.trim()).filter(Boolean)
    const agentIds = formAgentIds.split(',').map(t => t.trim()).filter(Boolean)
    onSave({
      title: formTitle.trim(),
      hypothesis: formHypothesis.trim(),
      description: formDescription.trim(),
      methodology: formMethodology.trim(),
      priority: formPriority,
      expectedDuration: formDuration.trim(),
      tags,
      variables: formVariables.filter(v => v.name.trim()),
      associatedMeetingIds: meetingIds,
      associatedAgentIds: agentIds,
    })
  }, [formTitle, formHypothesis, formDescription, formMethodology, formPriority, formDuration, formTags, formVariables, formMeetingIds, formAgentIds, onSave])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 exp-detail-overlay-visible" onClick={onCancel} />
      <div className="relative bg-[var(--vl-bg-primary)] border border-[var(--vl-border)] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 exp-detail-panel-open" style={{ transform: 'none', position: 'relative' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold vl-text-heading">
            {isEdit ? 'Edit Experiment' : 'New Experiment'}
          </h2>
          <button onClick={onCancel} className="p-1.5 rounded-md hover:bg-[var(--vl-bg-inner)] transition-colors">
            <X className="size-5 vl-text-muted" />
          </button>
        </div>

        <div className="exp-form">
          {/* Title */}
          <div className="exp-form-group">
            <label className="exp-form-label">Title *</label>
            <input
              className="exp-form-input"
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              placeholder="e.g., Nanobody CDR3 Loop Optimization"
            />
          </div>

          {/* Hypothesis */}
          <div className="exp-form-group">
            <label className="exp-form-label">Hypothesis</label>
            <textarea
              className="exp-form-textarea"
              value={formHypothesis}
              onChange={e => setFormHypothesis(e.target.value)}
              placeholder="State your hypothesis..."
              rows={3}
            />
          </div>

          {/* Description */}
          <div className="exp-form-group">
            <label className="exp-form-label">Description</label>
            <textarea
              className="exp-form-textarea"
              value={formDescription}
              onChange={e => setFormDescription(e.target.value)}
              placeholder="Describe the experiment..."
              rows={2}
            />
          </div>

          {/* Methodology */}
          <div className="exp-form-group">
            <label className="exp-form-label">Methodology</label>
            <textarea
              className="exp-form-textarea"
              value={formMethodology}
              onChange={e => setFormMethodology(e.target.value)}
              placeholder="Describe the methods..."
              rows={2}
            />
          </div>

          {/* Priority + Duration */}
          <div className="exp-form-row">
            <div className="exp-form-group">
              <label className="exp-form-label">Priority</label>
              <select className="exp-form-select" value={formPriority} onChange={e => setFormPriority(e.target.value as ExperimentPriority)}>
                {ALL_PRIORITIES.map(p => (
                  <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
                ))}
              </select>
            </div>
            <div className="exp-form-group">
              <label className="exp-form-label">Expected Duration</label>
              <input className="exp-form-input" value={formDuration} onChange={e => setFormDuration(e.target.value)} placeholder="e.g., 14 days" />
            </div>
          </div>

          {/* Tags */}
          <div className="exp-form-group">
            <label className="exp-form-label">Tags (comma-separated)</label>
            <input className="exp-form-input" value={formTags} onChange={e => setFormTags(e.target.value)} placeholder="e.g., nanobody, protein-engineering" />
          </div>

          {/* Variables */}
          <div className="exp-form-group">
            <label className="exp-form-label flex items-center justify-between">
              <span className="flex items-center gap-1"><FlaskConical className="size-3" /> Variables</span>
              <button type="button" onClick={handleAddVariable} className="text-xs text-[var(--vl-accent)] hover:underline font-normal normal-case tracking-normal">
                + Add Variable
              </button>
            </label>
            <div className="exp-form-variables">
              {formVariables.map((v, idx) => (
                <div key={idx} className="exp-form-variable-row">
                  <input className="exp-form-variable-input" placeholder="Variable name" value={v.name} onChange={e => handleVariableChange(idx, 'name', e.target.value)} />
                  <select className="exp-form-variable-input" value={v.type} onChange={e => handleVariableChange(idx, 'type', e.target.value)}>
                    <option value="independent">Independent</option>
                    <option value="dependent">Dependent</option>
                  </select>
                  <input className="exp-form-variable-input" placeholder="Unit" value={v.unit} onChange={e => handleVariableChange(idx, 'unit', e.target.value)} />
                  <button type="button" onClick={() => handleRemoveVariable(idx)} className="p-1 text-red-400 hover:text-red-600 transition-colors">
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Associations */}
          <div className="exp-form-row">
            <div className="exp-form-group">
              <label className="exp-form-label">Meeting IDs</label>
              <input className="exp-form-input" value={formMeetingIds} onChange={e => setFormMeetingIds(e.target.value)} placeholder="Comma-separated IDs" />
            </div>
            <div className="exp-form-group">
              <label className="exp-form-label">Agent IDs</label>
              <input className="exp-form-input" value={formAgentIds} onChange={e => setFormAgentIds(e.target.value)} placeholder="Comma-separated IDs" />
            </div>
          </div>

          {/* Actions */}
          <div className="exp-form-actions">
            <Button variant="outline" size="sm" onClick={onCancel} className="vl-inner">Cancel</Button>
            <Button size="sm" className="bg-[var(--vl-accent)] hover:opacity-90 text-white gap-1" onClick={handleSubmit}>
              <Plus className="size-3" /> {isEdit ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Detail Panel Component
// ============================================================

function DetailPanel({
  experiment,
  onClose,
  onAddResult,
  onStatusChange,
}: {
  experiment: Experiment
  onClose: () => void
  onAddResult: (id: string, value: number, notes: string) => void
  onStatusChange: (id: string, status: ExperimentStatus) => void
}) {
  const [newResultValue, setNewResultValue] = useState('')
  const [newResultNotes, setNewResultNotes] = useState('')

  const statusCfg = STATUS_CONFIG[experiment.status]
  const priorityCfg = PRIORITY_CONFIG[experiment.priority]

  const handleAddResult = useCallback(() => {
    const val = parseFloat(newResultValue)
    if (isNaN(val)) {
      toast.error('Enter a valid number')
      return
    }
    onAddResult(experiment.id, val, newResultNotes.trim())
    setNewResultValue('')
    setNewResultNotes('')
  }, [experiment.id, newResultValue, newResultNotes, onAddResult])

  return (
    <>
      <div className="exp-detail-overlay exp-detail-overlay-visible" onClick={onClose} />
      <div className="exp-detail-panel exp-detail-panel-open">
        {/* Header */}
        <div className="exp-detail-header">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`exp-status-badge ${statusCfg.color}`}>
                <span className={`exp-status-dot exp-status-dot-${experiment.status}`} />
                {statusCfg.label}
              </span>
              <span className={`exp-priority-indicator ${priorityCfg.color}`}>
                {priorityCfg.label}
              </span>
            </div>
            <h2 className="text-lg font-bold vl-text-heading">{experiment.title}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--vl-bg-inner)] transition-colors flex-shrink-0">
            <X className="size-5 vl-text-muted" />
          </button>
        </div>

        <div className="exp-detail-body">
          {/* Status Timeline */}
          <div className="exp-detail-section">
            <h3 className="exp-detail-section-title">
              <Clock className="size-4" /> Status Timeline
            </h3>
            <div className="exp-timeline">
              {experiment.statusHistory.map((sh, idx) => (
                <div key={idx} className="exp-timeline-item">
                  <div className={`exp-timeline-dot exp-timeline-dot-${sh.status}`} />
                  <div className="exp-timeline-content">
                    <div className="exp-timeline-label">{STATUS_CONFIG[sh.status].label}</div>
                    <div className="exp-timeline-date">{formatDateTime(sh.timestamp)}</div>
                    {sh.note && <div className="text-xs vl-text-muted mt-1">{sh.note}</div>}
                  </div>
                </div>
              ))}
            </div>

            {/* Status change buttons */}
            <div className="flex gap-2 mt-4">
              {experiment.status !== 'completed' && experiment.status !== 'archived' && (
                <button
                  className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                  onClick={() => onStatusChange(experiment.id, 'completed')}
                >
                  <CheckCircle2 className="size-3" /> Mark Complete
                </button>
              )}
              {experiment.status === 'planned' && (
                <button
                  className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-md bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-colors"
                  onClick={() => onStatusChange(experiment.id, 'running')}
                >
                  <Play className="size-3" /> Start
                </button>
              )}
              {experiment.status !== 'archived' && (
                <button
                  className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-md bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                  onClick={() => onStatusChange(experiment.id, experiment.status === 'failed' ? 'planned' : 'failed')}
                >
                  <AlertTriangle className="size-3" /> {experiment.status === 'failed' ? 'Reset' : 'Mark Failed'}
                </button>
              )}
            </div>
          </div>

          {/* Hypothesis */}
          <div className="exp-detail-section">
            <h3 className="exp-detail-section-title">
              <Target className="size-4" /> Hypothesis
            </h3>
            <p className="text-sm vl-text-body leading-relaxed">{experiment.hypothesis}</p>
          </div>

          {/* Methodology */}
          {experiment.methodology && (
            <div className="exp-detail-section">
              <h3 className="exp-detail-section-title">
                <Beaker className="size-4" /> Methodology
              </h3>
              <p className="text-sm vl-text-body leading-relaxed">{experiment.methodology}</p>
            </div>
          )}

          {/* Variables Table */}
          {experiment.variables.length > 0 && (
            <div className="exp-detail-section">
              <h3 className="exp-detail-section-title">
                <FlaskConical className="size-4" /> Variables
              </h3>
              <table className="exp-variables-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {experiment.variables.map((v, idx) => (
                    <tr key={idx}>
                      <td className="font-medium">{v.name}</td>
                      <td>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${v.type === 'independent' ? 'bg-blue-500/10 text-blue-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
                          {v.type}
                        </span>
                      </td>
                      <td className="vl-text-muted">{v.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Results */}
          <div className="exp-detail-section">
            <h3 className="exp-detail-section-title">
              <FileText className="size-4" /> Results
              <span className="text-xs font-normal normal-case tracking-normal vl-text-muted ml-auto">
                {experiment.results.length} trial{experiment.results.length !== 1 ? 's' : ''}
              </span>
            </h3>

            {/* Statistical Summary */}
            {experiment.stats && (
              <div className="exp-stats-summary mb-4">
                <div className="exp-stats-item">
                  <div className="exp-stats-item-label">Mean</div>
                  <div className="exp-stats-item-value">{experiment.stats.mean}</div>
                </div>
                <div className="exp-stats-item">
                  <div className="exp-stats-item-label">Median</div>
                  <div className="exp-stats-item-value">{experiment.stats.median}</div>
                </div>
                <div className="exp-stats-item">
                  <div className="exp-stats-item-label">Std Dev</div>
                  <div className="exp-stats-item-value">{experiment.stats.stdDev}</div>
                </div>
                <div className="exp-stats-item">
                  <div className="exp-stats-item-label">Min</div>
                  <div className="exp-stats-item-value">{experiment.stats.min}</div>
                </div>
                <div className="exp-stats-item">
                  <div className="exp-stats-item-label">Max</div>
                  <div className="exp-stats-item-value">{experiment.stats.max}</div>
                </div>
                <div className="exp-stats-item">
                  <div className="exp-stats-item-label">N</div>
                  <div className="exp-stats-item-value">{experiment.stats.sampleSize}</div>
                </div>
              </div>
            )}

            {/* Results list */}
            {experiment.results.length > 0 && (
              <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                {experiment.results.map((r) => (
                  <div key={r.trial} className="flex items-center gap-3 p-2 rounded-md bg-[var(--vl-bg-secondary)]">
                    <span className="exp-trial-number w-8">{'#' + r.trial}</span>
                    <span className="text-sm font-bold vl-text-heading flex-1">{r.value}</span>
                    {r.notes && <span className="text-xs vl-text-muted">{r.notes}</span>}
                    <span className="text-[10px] vl-text-muted">{formatDate(r.timestamp)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Add result form */}
            {experiment.status === 'running' && (
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="exp-form-label">Value</label>
                  <input
                    className="exp-form-input"
                    type="number"
                    step="any"
                    value={newResultValue}
                    onChange={e => setNewResultValue(e.target.value)}
                    placeholder="Enter numeric result"
                  />
                </div>
                <div className="flex-1">
                  <label className="exp-form-label">Notes</label>
                  <input
                    className="exp-form-input"
                    value={newResultNotes}
                    onChange={e => setNewResultNotes(e.target.value)}
                    placeholder="Optional notes"
                  />
                </div>
                <Button size="sm" className="bg-[var(--vl-accent)] hover:opacity-90 text-white" onClick={handleAddResult}>
                  <Plus className="size-3" />
                </Button>
              </div>
            )}
          </div>

          {/* Tags */}
          {experiment.tags.length > 0 && (
            <div className="exp-detail-section">
              <h3 className="exp-detail-section-title">
                <Tag className="size-4" /> Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {experiment.tags.map(tag => (
                  <span key={tag} className="exp-tag">{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* Associations */}
          {(experiment.associatedMeetingIds.length > 0 || experiment.associatedAgentIds.length > 0) && (
            <div className="exp-detail-section">
              <h3 className="exp-detail-section-title">
                <ExternalLink className="size-4" /> Associations
              </h3>
              <div className="flex flex-wrap gap-2">
                {experiment.associatedMeetingIds.map(mId => (
                  <span key={mId} className="exp-assoc-chip">
                    <Users className="size-3" /> Meeting: {mId}
                  </span>
                ))}
                {experiment.associatedAgentIds.map(aId => (
                  <span key={aId} className="exp-assoc-chip" style={{ background: 'rgba(139,92,246,0.1)', color: '#7c3aed', borderColor: 'rgba(139,92,246,0.2)' }}>
                    <Zap className="size-3" /> Agent: {aId}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="exp-detail-section">
            <h3 className="exp-detail-section-title">
              <Calendar className="size-4" /> Dates
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-2 rounded-md bg-[var(--vl-bg-secondary)]">
                <div className="text-[10px] font-semibold text-[var(--vl-text-muted)] uppercase mb-1">Created</div>
                <div className="vl-text-secondary">{formatDateTime(experiment.createdAt)}</div>
              </div>
              <div className="p-2 rounded-md bg-[var(--vl-bg-secondary)]">
                <div className="text-[10px] font-semibold text-[var(--vl-text-muted)] uppercase mb-1">Updated</div>
                <div className="vl-text-secondary">{formatDateTime(experiment.updatedAt)}</div>
              </div>
              {experiment.completedAt && (
                <div className="p-2 rounded-md bg-emerald-500/5">
                  <div className="text-[10px] font-semibold text-emerald-600 uppercase mb-1">Completed</div>
                  <div className="vl-text-secondary">{formatDateTime(experiment.completedAt)}</div>
                </div>
              )}
              {experiment.expectedDuration && (
                <div className="p-2 rounded-md bg-[var(--vl-bg-secondary)]">
                  <div className="text-[10px] font-semibold text-[var(--vl-text-muted)] uppercase mb-1">Duration</div>
                  <div className="vl-text-secondary">{experiment.expectedDuration}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ============================================================
// Main Experiment Tracker Component
// ============================================================

export function ExperimentTracker({ lang = 'en' }: ExperimentTrackerProps) {
  const [mounted, setMounted] = useState(false)
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [selectedExp, setSelectedExp] = useState<Experiment | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingExp, setEditingExp] = useState<Experiment | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<ExperimentStatus | 'all'>('all')
  const [filterPriority, setFilterPriority] = useState<ExperimentPriority | 'all'>('all')
  const [filterTag, setFilterTag] = useState('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)

  // Load from localStorage
  useEffect(() => {
    requestAnimationFrame(() => {
      setMounted(true)
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved) as Experiment[]
          setExperiments(parsed.map(exp => ({ ...exp, stats: computeStats(exp.results) })))
        } else {
          const sample = generateSampleData()
          setExperiments(sample)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(sample))
        }
      } catch {
        const sample = generateSampleData()
        setExperiments(sample)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sample))
      }
    })
  }, [])

  // Persist
  const persistExperiments = useCallback((updated: Experiment[]) => {
    const withStats = updated.map(exp => ({ ...exp, stats: computeStats(exp.results) }))
    setExperiments(withStats)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(withStats)) } catch { /* ignore */ }
  }, [])

  // All unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    experiments.forEach(e => e.tags.forEach(t => tagSet.add(t)))
    return Array.from(tagSet).sort()
  }, [experiments])

  // Filtered experiments
  const filteredExperiments = useMemo(() => {
    let result = [...experiments]

    if (filterStatus !== 'all') {
      result = result.filter(e => e.status === filterStatus)
    }
    if (filterPriority !== 'all') {
      result = result.filter(e => e.priority === filterPriority)
    }
    if (filterTag !== 'all') {
      result = result.filter(e => e.tags.includes(filterTag))
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.hypothesis.toLowerCase().includes(q) ||
        e.tags.some(t => t.toLowerCase().includes(q))
      )
    }

    result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    return result
  }, [experiments, filterStatus, filterPriority, filterTag, searchQuery])

  // Status change handler
  const handleStatusChange = useCallback((id: string, newStatus: ExperimentStatus) => {
    persistExperiments(experiments.map(exp => {
      if (exp.id !== id) return exp
      const now = new Date().toISOString()
      return {
        ...exp,
        status: newStatus,
        statusHistory: [...exp.statusHistory, { status: newStatus, timestamp: now, note: `Changed to ${newStatus}` }],
        updatedAt: now,
        completedAt: newStatus === 'completed' ? now : exp.completedAt,
        stats: computeStats(exp.results),
      }
    }))
    if (selectedExp?.id === id) {
      const updated = experiments.find(e => e.id === id)
      if (updated) {
        setSelectedExp({
          ...updated,
          status: newStatus,
          statusHistory: [...updated.statusHistory, { status: newStatus, timestamp: new Date().toISOString() }],
          stats: computeStats(updated.results),
        })
      }
    }
    toast.success(`Status changed to ${newStatus}`)
  }, [experiments, selectedExp, persistExperiments])

  // Add result handler
  const handleAddResult = useCallback((id: string, value: number, notes: string) => {
    persistExperiments(experiments.map(exp => {
      if (exp.id !== id) return exp
      const newResults = [...exp.results, { trial: exp.results.length + 1, value, notes, timestamp: new Date().toISOString() }]
      return { ...exp, results: newResults, updatedAt: new Date().toISOString(), stats: computeStats(newResults) }
    }))
    // Update detail panel
    if (selectedExp?.id === id) {
      const exp = experiments.find(e => e.id === id)
      if (exp) {
        const newResults = [...exp.results, { trial: exp.results.length + 1, value, notes, timestamp: new Date().toISOString() }]
        setSelectedExp({ ...exp, results: newResults, stats: computeStats(newResults) })
      }
    }
    toast.success('Result added')
  }, [experiments, selectedExp, persistExperiments])

  // Save experiment (create/edit)
  const handleSaveExperiment = useCallback((data: Partial<Experiment>) => {
    if (editingExp) {
      persistExperiments(experiments.map(exp => {
        if (exp.id !== editingExp.id) return exp
        return { ...exp, ...data, updatedAt: new Date().toISOString(), stats: computeStats(exp.results) }
      }))
      toast.success('Experiment updated')
    } else {
      const now = new Date().toISOString()
      const newExp: Experiment = {
        id: `exp-${Date.now()}`,
        title: data.title || '',
        hypothesis: data.hypothesis || '',
        description: data.description || '',
        methodology: data.methodology || '',
        status: 'planned',
        priority: data.priority || 'medium',
        variables: data.variables || [],
        results: [],
        statusHistory: [{ status: 'planned', timestamp: now }],
        tags: data.tags || [],
        expectedDuration: data.expectedDuration || '',
        associatedMeetingIds: data.associatedMeetingIds || [],
        associatedAgentIds: data.associatedAgentIds || [],
        createdAt: now,
        updatedAt: now,
        stats: null,
      }
      persistExperiments([newExp, ...experiments])
      toast.success('Experiment created')
    }
    setShowForm(false)
    setEditingExp(null)
  }, [editingExp, experiments, persistExperiments])

  // Delete experiment
  const handleDeleteExperiment = useCallback((id: string) => {
    persistExperiments(experiments.filter(exp => exp.id !== id))
    if (selectedExp?.id === id) setSelectedExp(null)
    toast.success('Experiment deleted')
  }, [experiments, selectedExp, persistExperiments])

  // Toggle selection
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // Bulk actions
  const handleBulkArchive = useCallback(() => {
    persistExperiments(experiments.map(exp =>
      selectedIds.has(exp.id) && exp.status === 'completed'
        ? { ...exp, status: 'archived' as ExperimentStatus, updatedAt: new Date().toISOString() }
        : exp
    ))
    setSelectedIds(new Set())
    toast.success('Completed experiments archived')
  }, [experiments, selectedIds, persistExperiments])

  const handleBulkDeleteFailed = useCallback(() => {
    persistExperiments(experiments.filter(exp => !(selectedIds.has(exp.id) && exp.status === 'failed')))
    setSelectedIds(new Set())
    toast.success('Failed experiments deleted')
  }, [experiments, selectedIds, persistExperiments])

  const handleExportAll = useCallback(() => {
    const content = JSON.stringify(experiments, null, 2)
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'experiments.json'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Experiments exported')
  }, [experiments])

  if (!mounted) return null

  // ============================================================
  // Render
  // ============================================================
  return (
    <div className="p-6 min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold vl-text-heading flex items-center gap-2">
            <Beaker className="size-6" />
            Experiment Tracker
          </h1>
          <p className="text-sm vl-text-muted mt-1">
            Track, manage, and analyze your scientific experiments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportAll} className="vl-inner gap-1">
            <Download className="size-3.5" /> Export
          </Button>
          <Button size="sm" className="bg-[var(--vl-accent)] hover:opacity-90 text-white gap-1" onClick={() => { setEditingExp(null); setShowForm(true) }}>
            <Plus className="size-3.5" /> New Experiment
          </Button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="exp-filter-bar mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 vl-text-muted" />
          <input
            className="exp-form-input pl-9"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search experiments..."
          />
          {searchQuery && (
            <button className="absolute right-3 top-1/2 -translate-y-1/2 vl-text-muted hover:text-[var(--vl-text-primary)]" onClick={() => setSearchQuery('')}>
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <button
          className={`exp-filter-chip ${showFilters ? 'exp-filter-chip-active' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="size-3" /> Filters
          {(filterStatus !== 'all' || filterPriority !== 'all' || filterTag !== 'all') && (
            <span className="ml-1 size-4 rounded-full bg-[var(--vl-accent)] text-white text-[10px] flex items-center justify-center">!</span>
          )}
        </button>

        <span className="text-xs vl-text-muted">
          {filteredExperiments.length} of {experiments.length} experiments
        </span>
      </div>

      {/* Extended Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 mb-6 p-4 bg-[var(--vl-bg-card)] border border-[var(--vl-border-subtle)] rounded-lg">
          <div>
            <label className="text-[10px] font-semibold vl-text-muted uppercase tracking-wide mb-1 block">Status</label>
            <div className="flex flex-wrap gap-1">
              <button className={`exp-filter-chip ${filterStatus === 'all' ? 'exp-filter-chip-active' : ''}`} onClick={() => setFilterStatus('all')}>All</button>
              {ALL_STATUSES.map(s => (
                <button key={s} className={`exp-filter-chip ${filterStatus === s ? 'exp-filter-chip-active' : ''}`} onClick={() => setFilterStatus(s)}>
                  {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold vl-text-muted uppercase tracking-wide mb-1 block">Priority</label>
            <div className="flex flex-wrap gap-1">
              <button className={`exp-filter-chip ${filterPriority === 'all' ? 'exp-filter-chip-active' : ''}`} onClick={() => setFilterPriority('all')}>All</button>
              {ALL_PRIORITIES.map(p => (
                <button key={p} className={`exp-filter-chip ${filterPriority === p ? 'exp-filter-chip-active' : ''}`} onClick={() => setFilterPriority(p)}>
                  {PRIORITY_CONFIG[p].label}
                </button>
              ))}
            </div>
          </div>
          {allTags.length > 0 && (
            <div>
              <label className="text-[10px] font-semibold vl-text-muted uppercase tracking-wide mb-1 block">Tag</label>
              <div className="flex flex-wrap gap-1">
                <button className={`exp-filter-chip ${filterTag === 'all' ? 'exp-filter-chip-active' : ''}`} onClick={() => setFilterTag('all')}>All</button>
                {allTags.map(tag => (
                  <button key={tag} className={`exp-filter-chip ${filterTag === tag ? 'exp-filter-chip-active' : ''}`} onClick={() => setFilterTag(tag)}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="exp-bulk-bar mb-4">
          <span className="text-sm font-medium vl-text-heading">{selectedIds.size} selected</span>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="sm" className="vl-inner gap-1" onClick={handleBulkArchive}>
              <Archive className="size-3" /> Archive Completed
            </Button>
            <Button variant="outline" size="sm" className="vl-inner gap-1 text-red-500 hover:text-red-600" onClick={handleBulkDeleteFailed}>
              <Trash2 className="size-3" /> Delete Failed
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              <X className="size-3" /> Clear
            </Button>
          </div>
        </div>
      )}

      {/* Experiment Cards Grid */}
      {filteredExperiments.length === 0 ? (
        <div className="exp-empty-state">
          <div className="exp-empty-state-icon"><Beaker className="size-6" /></div>
          <h3 className="exp-empty-state-title">No experiments found</h3>
          <p className="exp-empty-state-desc">
            {searchQuery || filterStatus !== 'all' || filterPriority !== 'all' || filterTag !== 'all'
              ? 'Try adjusting your filters or search query'
              : 'Create your first experiment to get started'}
          </p>
          {!searchQuery && filterStatus === 'all' && filterPriority === 'all' && filterTag === 'all' && (
            <Button className="mt-4 bg-[var(--vl-accent)] hover:opacity-90 text-white gap-1" onClick={() => { setEditingExp(null); setShowForm(true) }}>
              <Plus className="size-4" /> Create Experiment
            </Button>
          )}
        </div>
      ) : (
        <div className="exp-card-grid">
          {filteredExperiments.map(exp => (
            <div key={exp.id} className="relative">
              <input
                type="checkbox"
                checked={selectedIds.has(exp.id)}
                onChange={() => toggleSelect(exp.id)}
                className="absolute top-3 right-3 z-10 size-4 rounded accent-[var(--vl-accent)] cursor-pointer"
                onClick={e => e.stopPropagation()}
              />
              <ExperimentCard
                experiment={exp}
                onSelect={setSelectedExp}
                onStatusChange={handleStatusChange}
              />
            </div>
          ))}
        </div>
      )}

      {/* Detail Panel */}
      {selectedExp && (
        <DetailPanel
          experiment={selectedExp}
          onClose={() => setSelectedExp(null)}
          onAddResult={handleAddResult}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Create/Edit Form Modal */}
      {showForm && (
        <ExperimentForm
          experiment={editingExp}
          onSave={handleSaveExperiment}
          onCancel={() => { setShowForm(false); setEditingExp(null) }}
        />
      )}
    </div>
  )
}

export default ExperimentTracker
