'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  FlaskConical, Microscope, Dna, Atom, Settings, Play, CheckCircle2,
  Upload, ChevronDown, ChevronUp, FileText, Loader2, X,
  Beaker, Zap, AlertCircle, RefreshCw, Activity, BarChart3, ArrowRight,
  FilePlus2, GripVertical, Eye, Clock, Shield, Scissors, Search, SquareCode,
  BookOpen, Calculator, TestTubes, Copy, Trash2, Plus, Tag, StickyNote,
  ArrowLeft, Download, Filter, ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import { EmptyState } from './shared-components'

// ============================================================
// Types
// ============================================================

export type ToolAvailabilityStatus = 'available' | 'processing' | 'unavailable'

export interface BioTool {
  id: string
  name: string
  description: string
  icon: React.ElementType
  color: string
  status: 'ready' | 'running' | 'completed' | 'error'
  progress: number
  category: string
  availability: ToolAvailabilityStatus
  analysesRun: number
  lastRunAt: string | null
}

export interface BioToolConfig {
  pdbFile: string | null
  sequence: string
  confidenceThreshold: number
  model: string
  numSamples: number
  temperature: number
  advanced: {
    diffusionSteps: number
    guidanceScale: number
    chainBreakPenalty: number
    maxResidues: number
  }
}

interface UploadedFile {
  name: string
  size: number
  type: string
  preview: string | null
  content?: string
}

// ============================================================
// Lab Notebook Types
// ============================================================

interface LabNote {
  id: string
  title: string
  content: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

// ============================================================
// Quick Tool Definitions
// ============================================================

interface QuickToolDef {
  id: string
  nameKey: string
  descKey: string
  icon: React.ElementType
  color: string
  subtitleKey: string
}

const QUICK_TOOL_DEFS: QuickToolDef[] = [
  {
    id: 'sequence-analyzer',
    nameKey: 'bioTools.sequenceAnalyzer',
    descKey: 'bioTools.sequenceAnalyzer.desc',
    icon: Dna,
    color: '#10b981',
    subtitleKey: 'bioTools.quickTools.desc',
  },
  {
    id: 'lab-notebook',
    nameKey: 'bioTools.labNotebook',
    descKey: 'bioTools.labNotebook.desc',
    icon: BookOpen,
    color: '#f59e0b',
    subtitleKey: 'bioTools.quickTools.desc',
  },
  {
    id: 'reaction-calculator',
    nameKey: 'bioTools.reactionCalculator',
    descKey: 'bioTools.reactionCalculator.desc',
    icon: Calculator,
    color: '#06b6d4',
    subtitleKey: 'bioTools.quickTools.desc',
  },
  {
    id: 'dilution-calculator',
    nameKey: 'bioTools.dilutionCalculator',
    descKey: 'bioTools.dilutionCalculator.desc',
    icon: TestTubes,
    color: '#8b5cf6',
    subtitleKey: 'bioTools.quickTools.desc',
  },
]

// ============================================================
// Sequence Analysis Helpers
// ============================================================

type SeqType = 'DNA' | 'RNA' | 'Protein' | 'Unknown'

function detectSequenceType(seq: string): SeqType {
  const clean = seq.replace(/\s/g, '').toUpperCase()
  if (!clean) return 'Unknown'
  const hasU = clean.includes('U')
  const hasT = clean.includes('T')
  const bases = new Set(clean.split(''))
  const dnaBases = new Set(['A', 'T', 'G', 'C'])
  const rnaBases = new Set(['A', 'U', 'G', 'C'])
  const proteinBases = new Set([
    'A','R','N','D','C','E','Q','G','H','I','L','K','M','F','P','S','T','W','Y','V'
  ])

  if (hasU && !hasT) {
    // Check if all chars are AUGC
    const allRna = [...clean].every(c => rnaBases.has(c))
    if (allRna) return 'RNA'
  }
  if (hasT && !hasU) {
    const allDna = [...clean].every(c => dnaBases.has(c))
    if (allDna) return 'DNA'
  }
  if (!hasU && !hasT) {
    // Could be DNA or protein
    const allDna = [...clean].every(c => dnaBases.has(c))
    if (allDna) return 'DNA'
  }
  // Check protein
  const proteinChars = [...clean].filter(c => proteinBases.has(c))
  if (proteinChars.length / clean.length > 0.7) return 'Protein'
  return 'Unknown'
}

function calcGCContent(seq: string): number {
  const clean = seq.replace(/\s/g, '').toUpperCase()
  if (!clean) return 0
  const g = (clean.match(/G/g) || []).length
  const c = (clean.match(/C/g) || []).length
  return ((g + c) / clean.length) * 100
}

function calcMolecularWeight(seq: string, type: SeqType): number {
  const clean = seq.replace(/\s/g, '').toUpperCase()
  if (!clean) return 0
  if (type === 'DNA') {
    const weights: Record<string, number> = { A: 313.21, T: 304.19, G: 329.21, C: 289.18 }
    return clean.split('').reduce((sum, n) => sum + (weights[n] || 0), 0) - (clean.length - 1) * 61.96
  }
  if (type === 'RNA') {
    const weights: Record<string, number> = { A: 329.21, U: 306.17, G: 345.21, C: 305.18 }
    return clean.split('').reduce((sum, n) => sum + (weights[n] || 0), 0) - (clean.length - 1) * 61.96
  }
  // Protein average residue weight ~110 Da
  return clean.length * 110
}

function getBaseComposition(seq: string): Record<string, number> {
  const clean = seq.replace(/\s/g, '').toUpperCase()
  const comp: Record<string, number> = {}
  for (const c of clean) {
    comp[c] = (comp[c] || 0) + 1
  }
  return comp
}

function getAminoAcidFrequency(seq: string): { aa: string; count: number; pct: number }[] {
  const clean = seq.replace(/\s/g, '').toUpperCase()
  const freq: Record<string, number> = {}
  for (const c of clean) {
    freq[c] = (freq[c] || 0) + 1
  }
  return Object.entries(freq)
    .map(([aa, count]) => ({ aa, count, pct: (count / clean.length) * 100 }))
    .sort((a, b) => b.count - a.count)
}

function getCodonUsage(seq: string): { codon: string; count: number; pct: number }[] {
  const clean = seq.replace(/\s/g, '').toUpperCase()
  if (clean.length < 3) return []
  const codons: Record<string, number> = {}
  for (let i = 0; i <= clean.length - 3; i += 3) {
    const codon = clean.slice(i, i + 3)
    codons[codon] = (codons[codon] || 0) + 1
  }
  const total = Object.values(codons).reduce((a, b) => a + b, 0)
  return Object.entries(codons)
    .map(([codon, count]) => ({ codon, count, pct: (count / total) * 100 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

// ============================================================
// Constants
// ============================================================

const ACCEPTED_EXTENSIONS = ['.pdb', '.fasta', '.txt']
const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function formatScientific(num: number): string {
  if (num === 0) return '0'
  if (Math.abs(num) >= 0.01 && Math.abs(num) < 10000) return num.toPrecision(6)
  return num.toExponential(4)
}

export interface BioToolsTabProps {
  lang: Lang
}

const INITIAL_TOOL_CONFIG: BioToolConfig = {
  pdbFile: null,
  sequence: '',
  confidenceThreshold: 0.7,
  model: 'default',
  numSamples: 5,
  temperature: 0.2,
  advanced: {
    diffusionSteps: 50,
    guidanceScale: 1.5,
    chainBreakPenalty: 10.0,
    maxResidues: 500,
  }
}

const TOOL_STATS_KEY = 'vl-bio-tool-stats'
const NOTES_KEY = 'vl-lab-notes'

const TOOL_DEFINITIONS: BioTool[] = [
  {
    id: 'rfdiffusion',
    name: 'RF Diffusion',
    description: 'Protein structure generation using diffusion models. Design novel proteins with specified functional sites and structural constraints.',
    icon: Dna,
    color: '#8b5cf6',
    status: 'ready',
    progress: 0,
    category: 'Design',
    availability: 'available',
    analysesRun: 0,
    lastRunAt: null,
  },
  {
    id: 'alphafold',
    name: 'AlphaFold-Multimer',
    description: 'Protein complex structure prediction using deep learning. Predict 3D structures of protein complexes with high accuracy.',
    icon: Microscope,
    color: '#3b82f6',
    status: 'ready',
    progress: 0,
    category: 'Prediction',
    availability: 'available',
    analysesRun: 0,
    lastRunAt: null,
  },
  {
    id: 'rosetta',
    name: 'Rosetta',
    description: 'Energy scoring and protein design suite. Refine protein structures, predict mutations, and design binding interfaces.',
    icon: FlaskConical,
    color: '#f59e0b',
    status: 'ready',
    progress: 0,
    category: 'Refinement',
    availability: 'available',
    analysesRun: 0,
    lastRunAt: null,
  },
  {
    id: 'esm2',
    name: 'ESM-2',
    description: 'Protein sequence modeling and embedding. Generate protein representations from sequences for downstream tasks.',
    icon: Atom,
    color: '#10b981',
    status: 'ready',
    progress: 0,
    category: 'Representation',
    availability: 'available',
    analysesRun: 0,
    lastRunAt: null,
  },
]

function availabilityBadgeClass(avail: ToolAvailabilityStatus): string {
  switch (avail) {
    case 'available': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    case 'processing': return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    case 'unavailable': return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
  }
}

function availabilityLabel(avail: ToolAvailabilityStatus, _lang: Lang): string {
  switch (avail) {
    case 'available': return 'Available'
    case 'processing': return 'Processing'
    case 'unavailable': return 'Unavailable'
  }
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const QUICK_TEMPLATES = [
  {
    id: 'antibody-design',
    title: 'Antibody Design',
    description: 'Design novel antibody scaffolds targeting specific epitopes using RF Diffusion with CDR loop constraints.',
    icon: Shield,
    color: '#8b5cf6',
    descriptionFill: 'Design a novel antibody targeting the SARS-CoV-2 spike protein RBD. Use CDR-H3 length constraint of 12-16 residues and focus on developing high-affinity binders with favorable developability properties.',
    toolId: 'rfdiffusion',
  },
  {
    id: 'protein-folding',
    title: 'Protein Folding',
    description: 'Predict the 3D structure of a protein sequence using AlphaFold-Multimer for complex formation analysis.',
    icon: Microscope,
    color: '#3b82f6',
    descriptionFill: 'Predict the tertiary structure of a de novo designed enzyme (sequence: MKSLLVAAVLLGTAGLAGAGKSALTIQEAQKR...). Analyze the confidence scores per residue and identify potential binding pockets.',
    toolId: 'alphafold',
  },
  {
    id: 'sequence-analysis',
    title: 'Sequence Analysis',
    description: 'Analyze protein sequences with ESM-2 embeddings to identify functional motifs and evolutionary patterns.',
    icon: Search,
    color: '#10b981',
    descriptionFill: 'Analyze the family of G-protein coupled receptor (GPCR) sequences. Identify conserved transmembrane helices, functional motifs, and generate embeddings for downstream clustering analysis.',
    toolId: 'esm2',
  },
]

const ANALYSIS_STEPS = [
  { label: 'Preparing input data...', duration: 2000 },
  { label: 'Running model inference...', duration: 3000 },
  { label: 'Post-processing results...', duration: 2000 },
  { label: 'Complete!', duration: 0 },
]

const MODEL_OPTIONS = {
  rfdiffusion: [
    { value: 'rf_diffusion_default', label: 'RF Diffusion Default' },
    { value: 'rf_diffusion_active_site', label: 'Active Site Design' },
    { value: 'rf_diffusion_binder', label: 'Binder Design' },
    { value: 'rf_diffusion_symmetry', label: 'Symmetric Design' },
  ],
  alphafold: [
    { value: 'alphafold_multimer_v3', label: 'AlphaFold-Multimer v3' },
    { value: 'alphafold_single_v2', label: 'AlphaFold Single v2' },
    { value: 'alphafold_multimer_v2', label: 'AlphaFold-Multimer v2' },
  ],
  rosetta: [
    { value: 'rosetta_flex', label: 'Rosetta Flex' },
    { value: 'rosetta_relax', label: 'Rosetta Relax' },
    { value: 'rosetta_design', label: 'Rosetta Design' },
  ],
  esm2: [
    { value: 'esm2_650m', label: 'ESM-2 (650M params)' },
    { value: 'esm2_3b', label: 'ESM-2 (3B params)' },
    { value: 'esm2_15b', label: 'ESM-2 (15B params)' },
  ],
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'ready': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 dark:bg-emerald-600/20 dark:text-emerald-300'
    case 'running': return 'bg-amber-500/20 text-amber-400 border-amber-500/30 dark:bg-amber-600/20 dark:text-amber-300'
    case 'completed': return 'bg-blue-500/20 text-blue-400 border-blue-500/30 dark:bg-blue-600/20 dark:text-blue-300'
    case 'error': return 'bg-rose-500/20 text-rose-400 border-rose-500/30 dark:bg-rose-600/20 dark:text-rose-300'
    default: return 'bg-[var(--vl-status-draft-bg)]/20 text-[var(--vl-text-muted)] border-[var(--vl-status-draft-border)]'
  }
}

function statusLabel(status: string, lang: Lang): string {
  switch (status) {
    case 'ready': return t(lang, 'bioTools.status.ready')
    case 'running': return t(lang, 'bioTools.status.running')
    case 'completed': return t(lang, 'bioTools.status.completed')
    case 'error': return t(lang, 'bioTools.status.error')
    default: return status
  }
}

function statusIcon(status: string) {
  switch (status) {
    case 'running': return <Loader2 className="size-3 animate-spin" />
    case 'completed': return <CheckCircle2 className="size-3" />
    case 'error': return <AlertCircle className="size-3" />
    default: return null
  }
}

// ============================================================
// BioToolsTab Component
// ============================================================

export function BioToolsTab({ lang }: BioToolsTabProps) {
  const [tools, setTools] = useState<BioTool[]>(() => {
    try {
      const stored = localStorage.getItem(TOOL_STATS_KEY)
      if (stored) {
        const stats = JSON.parse(stored) as Record<string, { analysesRun: number; lastRunAt: string | null }>
        return TOOL_DEFINITIONS.map(tool => ({
          ...tool,
          analysesRun: stats[tool.id]?.analysesRun ?? 0,
          lastRunAt: stats[tool.id]?.lastRunAt ?? null,
        }))
      }
    } catch { /* ignore */ }
    return TOOL_DEFINITIONS
  })
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null)
  const [config, setConfig] = useState<BioToolConfig>({ ...INITIAL_TOOL_CONFIG, advanced: { ...INITIAL_TOOL_CONFIG.advanced } })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [runProgress, setRunProgress] = useState(0)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [results, setResults] = useState<{ toolId: string; output: string; timestamp: string }[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [expandedPreview, setExpandedPreview] = useState<string | null>(null)

  // ---- Quick tools expanded state ----
  const [expandedQuickTool, setExpandedQuickTool] = useState<string | null>(null)

  // ---- Sequence Analyzer state ----
  const [seqInput, setSeqInput] = useState('')

  // ---- Lab Notebook state (hydration-safe) ----
  const [notes, setNotes] = useState<LabNote[]>([])
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [noteTags, setNoteTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [noteSearch, setNoteSearch] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)

  // Load notes from localStorage (hydration-safe)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(NOTES_KEY)
      if (stored) {
        setNotes(JSON.parse(stored) as LabNote[])
      }
    } catch { /* ignore */ }
  }, [])

  // Persist notes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(NOTES_KEY, JSON.stringify(notes))
    } catch { /* ignore */ }
  }, [notes])

  // ---- Reaction Calculator state ----
  const [conc, setConc] = useState('')
  const [vol, setVol] = useState('')
  const [mw, setMw] = useState('')

  // ---- Dilution Calculator state ----
  const [stockConc, setStockConc] = useState('')
  const [desiredConc, setDesiredConc] = useState('')
  const [desiredVol, setDesiredVol] = useState('')

  const selectedTool = tools.find(t => t.id === selectedToolId)

  // Persist tool stats to localStorage
  useEffect(() => {
    try {
      const stats: Record<string, { analysesRun: number; lastRunAt: string | null }> = {}
      tools.forEach(t => { stats[t.id] = { analysesRun: t.analysesRun, lastRunAt: t.lastRunAt } })
      localStorage.setItem(TOOL_STATS_KEY, JSON.stringify(stats))
    } catch { /* ignore */ }
  }, [tools])

  const handleConfigure = (toolId: string) => {
    setSelectedToolId(toolId)
    setConfig({ ...INITIAL_TOOL_CONFIG, advanced: { ...INITIAL_TOOL_CONFIG.advanced } })
    setShowAdvanced(false)
    setConfigDialogOpen(true)
  }

  const handleTemplateClick = (template: typeof QUICK_TEMPLATES[0]) => {
    setSelectedToolId(template.toolId)
    setConfig({ ...INITIAL_TOOL_CONFIG, advanced: { ...INITIAL_TOOL_CONFIG.advanced }, sequence: '' })
    setShowAdvanced(false)
    setConfigDialogOpen(true)
    setTimeout(() => {
      setConfig(prev => ({ ...prev, sequence: template.descriptionFill }))
    }, 100)
  }

  const handleRunTool = () => {
    if (!selectedToolId) return

    setIsRunning(true)
    setRunProgress(0)
    setCurrentStepIndex(0)
    setConfigDialogOpen(false)

    setTools(prev => prev.map(t => t.id === selectedToolId ? { ...t, status: 'running' as const, progress: 0, availability: 'processing' as const } : t))

    let stepIdx = 0
    const runSteps = async () => {
      for (let i = 0; i < ANALYSIS_STEPS.length - 1; i++) {
        setCurrentStepIndex(i)
        const step = ANALYSIS_STEPS[i]
        const stepDuration = step.duration
        const startTime = Date.now()

        const progressInterval = setInterval(() => {
          const elapsed = Date.now() - startTime
          const totalElapsed = elapsed + ANALYSIS_STEPS.slice(0, i).reduce((s, st) => s + st.duration, 0)
          const totalDuration = ANALYSIS_STEPS.slice(0, -1).reduce((s, st) => s + st.duration, 0)
          const pct = Math.min((totalElapsed / totalDuration) * 100, 99)
          setRunProgress(pct)
          setTools(ts => ts.map(t => t.id === selectedToolId ? { ...t, progress: pct } : t))
        }, 100)

        await new Promise(resolve => setTimeout(resolve, stepDuration))
        clearInterval(progressInterval)
      }

      setCurrentStepIndex(ANALYSIS_STEPS.length - 1)
      setRunProgress(100)
      setIsRunning(false)

      setTools(prev => prev.map(t => t.id === selectedToolId ? {
        ...t,
        status: 'completed' as const,
        progress: 100,
        availability: 'available' as const,
        analysesRun: t.analysesRun + 1,
        lastRunAt: new Date().toISOString(),
      } : t))

      const simulatedOutput = `=== Analysis Results: ${selectedTool?.name || selectedToolId} ===
Model: ${config.model}
Samples: ${config.numSamples}
Confidence Threshold: ${(config.confidenceThreshold * 100).toFixed(0)}%
Temperature: ${config.temperature.toFixed(2)}

--- Top Candidate ---
pLDDT Score: ${(85 + Math.random() * 12).toFixed(1)}
PAE (Å): ${(1.5 + Math.random() * 4).toFixed(2)}
TM-Score: ${(0.75 + Math.random() * 0.2).toFixed(3)}
RMSD (Å): ${(0.8 + Math.random() * 2).toFixed(2)}

--- Metrics Summary ---
Sequences analyzed: ${config.numSamples}
Average confidence: ${(70 + Math.random() * 25).toFixed(1)}%
Passing threshold: ${Math.floor(config.numSamples * (0.5 + Math.random() * 0.4))}/${config.numSamples}
Estimated runtime: ${(2 + Math.random() * 8).toFixed(1)}s

Status: SUCCESS`

      const newResult = {
        toolId: selectedToolId,
        output: simulatedOutput,
        timestamp: new Date().toISOString(),
      }
      setResults(prev => [newResult, ...prev])

      toast.success(`${selectedTool?.name || 'Tool'} analysis completed!`)
    }
    runSteps()
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    processFiles(Array.from(e.dataTransfer.files))
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      processFiles(Array.from(files))
    }
    e.target.value = ''
  }

  const processFiles = (files: File[]) => {
    for (const file of files) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase()
      if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        toast.error(`${t(lang, 'bioTools.dropzone.accepted')}: ${file.name}`)
        continue
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds ${t(lang, 'bioTools.dropzone.maxSize')}`)
        continue
      }
      const isTextFile = ext === '.txt' || ext === '.fasta'
      if (isTextFile) {
        const reader = new FileReader()
        reader.onload = () => {
          const text = reader.result as string
          const preview = text.split('\n').slice(0, 5).join('\n')
          const newFile: UploadedFile = {
            name: file.name,
            size: file.size,
            type: ext,
            preview,
            content: text,
          }
          setUploadedFiles(prev => [...prev, newFile])
          setConfig(prev => ({ ...prev, pdbFile: file.name }))
          toast.success(`${t(lang, 'bioTools.dropzone.dragHere')}: ${file.name}`)
        }
        reader.readAsText(file)
      } else {
        const newFile: UploadedFile = {
          name: file.name,
          size: file.size,
          type: ext,
          preview: null,
        }
        setUploadedFiles(prev => [...prev, newFile])
        setConfig(prev => ({ ...prev, pdbFile: file.name }))
        toast.success(`${t(lang, 'bioTools.dropzone.dragHere')}: ${file.name}`)
      }
    }
  }

  const removeFile = (index: number) => {
    setUploadedFiles(prev => {
      const next = prev.filter((_, i) => i !== index)
      if (next.length === 0) {
        setConfig(prev => ({ ...prev, pdbFile: null }))
      }
      return next
    })
  }

  // ---- Notebook helpers ----
  const saveNote = useCallback(() => {
    if (!noteTitle.trim() && !noteContent.trim()) return
    if (editingNoteId) {
      setNotes(prev => prev.map(n => n.id === editingNoteId ? {
        ...n, title: noteTitle, content: noteContent, tags: noteTags, updatedAt: new Date().toISOString(),
      } : n))
      setEditingNoteId(null)
      toast.success(t(lang, 'bioTools.labNotebook.saved'))
    } else {
      const newNote: LabNote = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        title: noteTitle,
        content: noteContent,
        tags: [...noteTags],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      setNotes(prev => [newNote, ...prev])
      toast.success(t(lang, 'bioTools.labNotebook.saved'))
    }
    setNoteTitle('')
    setNoteContent('')
    setNoteTags([])
    setTagInput('')
  }, [noteTitle, noteContent, noteTags, editingNoteId, lang])

  const deleteNote = useCallback((id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id))
    toast.success(t(lang, 'bioTools.labNotebook.deleted'))
  }, [lang])

  const duplicateNote = useCallback((note: LabNote) => {
    const dup: LabNote = {
      ...note,
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title: `${note.title} (copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setNotes(prev => [dup, ...prev])
    toast.success(t(lang, 'bioTools.labNotebook.duplicated'))
  }, [lang])

  const editNote = useCallback((note: LabNote) => {
    setEditingNoteId(note.id)
    setNoteTitle(note.title)
    setNoteContent(note.content)
    setNoteTags([...note.tags])
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingNoteId(null)
    setNoteTitle('')
    setNoteContent('')
    setNoteTags([])
    setTagInput('')
  }, [])

  const addTag = useCallback(() => {
    const trimmed = tagInput.trim()
    if (!trimmed || noteTags.length >= 5 || noteTags.includes(trimmed)) return
    setNoteTags(prev => [...prev, trimmed])
    setTagInput('')
  }, [tagInput, noteTags])

  const removeTag = useCallback((tag: string) => {
    setNoteTags(prev => prev.filter(t => t !== tag))
  }, [])

  const exportNotes = useCallback(() => {
    const blob = new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'lab-notes.json'
    a.click()
    URL.revokeObjectURL(url)
    toast.success(t(lang, 'bioTools.labNotebook.exported'))
  }, [notes, lang])

  // ---- Sequence Analyzer computed values ----
  const cleanSeq = seqInput.replace(/\s/g, '')
  const seqType = detectSequenceType(cleanSeq)
  const gcContent = (seqType === 'DNA' || seqType === 'RNA') ? calcGCContent(cleanSeq) : null
  const molWeight = calcMolecularWeight(cleanSeq, seqType)
  const baseComposition = getBaseComposition(cleanSeq)
  const aaFrequency = seqType === 'Protein' ? getAminoAcidFrequency(cleanSeq) : null
  const codonUsage = seqType === 'DNA' ? getCodonUsage(cleanSeq) : null

  // ---- Reaction Calculator computed values ----
  const concNum = parseFloat(conc) || 0
  const volNum = parseFloat(vol) || 0
  const mwNum = parseFloat(mw) || 0
  const moles = concNum > 0 && volNum > 0 ? (concNum / 1000) * (volNum / 1e6) : 0
  const mass = moles * mwNum
  const molarity = volNum > 0 ? (concNum / 1000) / (volNum / 1e6) : 0

  // ---- Dilution Calculator computed values ----
  const c1 = parseFloat(stockConc) || 0
  const c2 = parseFloat(desiredConc) || 0
  const v2 = parseFloat(desiredVol) || 0
  const v1 = c2 > 0 && v2 > 0 ? (c2 * v2) / c1 : 0
  const diluentVol = v2 > 0 ? v2 - v1 : 0

  // ---- Filtered notes ----
  const filteredNotes = noteSearch.trim()
    ? notes.filter(n =>
        n.title.toLowerCase().includes(noteSearch.toLowerCase()) ||
        n.content.toLowerCase().includes(noteSearch.toLowerCase()) ||
        n.tags.some(tag => tag.toLowerCase().includes(noteSearch.toLowerCase()))
      )
    : notes

  // ============================================================
  // Render: Quick Tool Expanded Views
  // ============================================================

  const renderSequenceAnalyzer = () => (
    <div className="bio-tool-expanded space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#10b98120' }}>
          <Dna className="size-5" style={{ color: '#10b981' }} />
        </div>
        <div>
          <h3 className="text-base font-semibold vl-text-heading">{t(lang, 'bioTools.sequenceAnalyzer')}</h3>
          <p className="text-xs vl-text-muted">{t(lang, 'bioTools.sequenceAnalyzer.desc')}</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="vl-text-label text-sm">{t(lang, 'bioTools.sequenceAnalyzer.input')}</Label>
        <Textarea
          className="vl-input min-h-[80px] text-xs font-mono custom-scrollbar"
          placeholder={t(lang, 'bioTools.sequenceAnalyzer.placeholder')}
          value={seqInput}
          onChange={(e) => setSeqInput(e.target.value)}
          maxLength={10000}
        />
        <div className="flex items-center justify-between">
          <p className="text-[10px] vl-text-muted">{cleanSeq.length} bp/residues</p>
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => {
              const text = [
                `Sequence Type: ${seqType}`,
                `Length: ${cleanSeq.length}`,
                gcContent !== null ? `GC Content: ${gcContent.toFixed(1)}%` : '',
                `Molecular Weight: ${formatScientific(molWeight)} Da`,
              ].filter(Boolean).join('\n')
              if (text) { navigator.clipboard.writeText(text); toast.success(t(lang, 'bioTools.sequenceAnalyzer.copied')) }
            }} disabled={!cleanSeq}>
              <Copy className="size-3 mr-1" /> {t(lang, 'common.copy')}
            </Button>
            <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => { setSeqInput('') }}>
              <X className="size-3 mr-1" /> {t(lang, 'bioTools.sequenceAnalyzer.clear')}
            </Button>
          </div>
        </div>
      </div>

      {cleanSeq.length > 0 && (
        <div className="space-y-3 bio-dna-visual rounded-xl p-4 border border-[var(--vl-border-subtle)]">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="vl-inner rounded-lg p-3 border border-[var(--vl-border-subtle)]">
              <p className="text-[10px] vl-text-muted">{t(lang, 'bioTools.sequenceAnalyzer.type')}</p>
              <p className="text-sm font-semibold vl-text-heading mt-0.5">
                <Badge variant="outline" className={seqType === 'DNA' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : seqType === 'RNA' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : seqType === 'Protein' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-slate-500/20 text-slate-400 border-slate-500/30'}>
                  {seqType === 'Unknown' ? t(lang, 'bioTools.sequenceAnalyzer.detecting') : seqType}
                </Badge>
              </p>
            </div>
            <div className="vl-inner rounded-lg p-3 border border-[var(--vl-border-subtle)]">
              <p className="text-[10px] vl-text-muted">{t(lang, 'bioTools.sequenceAnalyzer.length')}</p>
              <p className="text-sm font-semibold vl-text-heading mt-0.5">{cleanSeq.length}</p>
            </div>
            <div className="vl-inner rounded-lg p-3 border border-[var(--vl-border-subtle)]">
              <p className="text-[10px] vl-text-muted">{t(lang, 'bioTools.sequenceAnalyzer.gcContent')}</p>
              <p className="text-sm font-semibold vl-text-heading mt-0.5">{gcContent !== null ? `${gcContent.toFixed(1)}%` : '—'}</p>
            </div>
            <div className="vl-inner rounded-lg p-3 border border-[var(--vl-border-subtle)]">
              <p className="text-[10px] vl-text-muted">{t(lang, 'bioTools.sequenceAnalyzer.molWeight')}</p>
              <p className="text-sm font-semibold vl-text-heading mt-0.5">{formatScientific(molWeight)} Da</p>
            </div>
          </div>

          {/* GC Content Bar */}
          {gcContent !== null && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs vl-text-muted">
                <span>GC Content</span>
                <span>{gcContent.toFixed(1)}%</span>
              </div>
              <div className="bio-result-bar">
                <div style={{ width: `${gcContent}%`, background: 'linear-gradient(90deg, #10b981, #06b6d4)' }} />
              </div>
            </div>
          )}

          {/* Base Composition */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium vl-text-heading">{t(lang, 'bioTools.sequenceAnalyzer.composition')}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(baseComposition).sort((a, b) => b[1] - a[1]).map(([base, count]) => {
                const pct = (count / cleanSeq.length) * 100
                return (
                  <div key={base} className="flex items-center gap-2 text-xs">
                    <span className="font-mono font-bold vl-text-heading w-4">{base}</span>
                    <div className="bio-result-bar flex-1">
                      <div style={{ width: `${pct}%`, background: 'rgba(16,185,129,0.5)' }} />
                    </div>
                    <span className="vl-text-muted w-10 text-right">{count} ({pct.toFixed(0)}%)</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Amino Acid Frequency (Protein) */}
          {aaFrequency && (
            <div className="space-y-2">
              <p className="text-xs font-medium vl-text-heading">{t(lang, 'bioTools.sequenceAnalyzer.aaFreq')}</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                {aaFrequency.map(({ aa, count, pct }) => (
                  <div key={aa} className="flex items-center gap-2 text-xs">
                    <span className="font-mono font-bold vl-text-heading w-6">{aa}</span>
                    <div className="bio-result-bar flex-1">
                      <div style={{ width: `${pct}%`, background: 'rgba(245,158,11,0.5)' }} />
                    </div>
                    <span className="vl-text-muted w-16 text-right">{count} ({pct.toFixed(1)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Codon Usage (DNA) */}
          {codonUsage && codonUsage.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium vl-text-heading">{t(lang, 'bioTools.sequenceAnalyzer.codonUsage')}</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                {codonUsage.map(({ codon, count, pct }) => (
                  <div key={codon} className="flex items-center gap-2 text-xs">
                    <span className="font-mono font-bold vl-text-heading w-8">{codon}</span>
                    <div className="bio-result-bar flex-1">
                      <div style={{ width: `${pct * 5}%`, background: 'rgba(6,182,212,0.5)' }} />
                    </div>
                    <span className="vl-text-muted w-16 text-right">{count} ({pct.toFixed(1)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {cleanSeq.length === 0 && (
        <div className="text-center py-8">
          <StickyNote className="size-10 vl-text-muted mx-auto mb-2 vl-float-animation" />
          <p className="text-sm vl-text-muted">{t(lang, 'bioTools.sequenceAnalyzer.noSequence')}</p>
        </div>
      )}
    </div>
  )

  const renderLabNotebook = () => (
    <div className="bio-tool-expanded space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#f59e0b20' }}>
          <BookOpen className="size-5" style={{ color: '#f59e0b' }} />
        </div>
        <div>
          <h3 className="text-base font-semibold vl-text-heading">{t(lang, 'bioTools.labNotebook')}</h3>
          <p className="text-xs vl-text-muted">{t(lang, 'bioTools.labNotebook.desc')}</p>
        </div>
      </div>

      {/* Note Form */}
      <Card className="vl-card border">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="vl-text-label text-sm">{editingNoteId ? t(lang, 'common.edit') : t(lang, 'bioTools.labNotebook.title')}</Label>
            {editingNoteId && (
              <Button size="sm" variant="ghost" className="text-[10px] h-6" onClick={cancelEdit}>
                <X className="size-3 mr-1" /> {t(lang, 'common.cancel')}
              </Button>
            )}
          </div>
          <Input
            className="vl-input text-sm"
            placeholder={t(lang, 'bioTools.labNotebook.titlePlaceholder')}
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
          />
          <div className="space-y-1">
            <Label className="vl-text-label text-sm">{t(lang, 'bioTools.labNotebook.content')}</Label>
            <Textarea
              className="vl-input min-h-[100px] text-sm custom-scrollbar"
              placeholder={t(lang, 'bioTools.labNotebook.contentPlaceholder')}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              maxLength={5000}
            />
            <p className="text-[10px] vl-text-muted text-right">{noteContent.length}/5000 {t(lang, 'common.characters')}</p>
          </div>
          {/* Tags */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="vl-text-label text-xs">{t(lang, 'bioTools.labNotebook.tags')}</Label>
              <span className="text-[10px] vl-text-muted">{noteTags.length}/5</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {noteTags.map(tag => (
                <span key={tag} className="bio-note-tag">
                  {tag}
                  <button onClick={() => removeTag(tag)} aria-label="Remove tag">✕</button>
                </span>
              ))}
              {noteTags.length < 5 && (
                <Input
                  className="h-7 text-xs w-24 vl-input"
                  placeholder={t(lang, 'bioTools.labNotebook.addTag')}
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                />
              )}
              {tagInput.trim() && noteTags.length < 5 && (
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={addTag}>
                  <Plus className="size-3" />
                </Button>
              )}
            </div>
            {noteTags.length >= 5 && (
              <p className="text-[10px] vl-text-muted">{t(lang, 'bioTools.labNotebook.maxTags')}</p>
            )}
          </div>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={saveNote} disabled={!noteTitle.trim() && !noteContent.trim()}>
            <Plus className="size-3.5 mr-1.5" />
            {editingNoteId ? t(lang, 'common.update') : t(lang, 'common.save')}
          </Button>
        </CardContent>
      </Card>

      {/* Notes List */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Input
            className="vl-input text-xs h-8 flex-1"
            placeholder={t(lang, 'bioTools.labNotebook.search')}
            value={noteSearch}
            onChange={(e) => setNoteSearch(e.target.value)}
          />
          <Button size="sm" variant="outline" className="h-8 text-[10px]" onClick={exportNotes} disabled={notes.length === 0}>
            <Download className="size-3 mr-1" /> {t(lang, 'bioTools.labNotebook.export')}
          </Button>
        </div>

        {filteredNotes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto custom-scrollbar pr-1">
            {filteredNotes.map(note => (
              <Card key={note.id} className="bio-note-card vl-card border p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-medium vl-text-heading line-clamp-1">{note.title || t(lang, 'bioTools.labNotebook.empty')}</h4>
                  <span className="text-[9px] vl-text-muted whitespace-nowrap">{new Date(note.updatedAt).toLocaleDateString()}</span>
                </div>
                <p className="text-xs vl-text-muted line-clamp-2 leading-relaxed">{note.content}</p>
                {note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {note.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="bio-note-tag text-[9px] px-1.5 py-0">{tag}</Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-1 pt-1 border-t border-[var(--vl-border-subtle)]">
                  <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => editNote(note)}>
                    <FileText className="size-3 mr-0.5" /> {t(lang, 'bioTools.labNotebook.edit')}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => duplicateNote(note)}>
                    <Copy className="size-3 mr-0.5" /> {t(lang, 'bioTools.labNotebook.duplicate')}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 text-rose-400 hover:text-rose-500" onClick={() => deleteNote(note.id)}>
                    <Trash2 className="size-3 mr-0.5" /> {t(lang, 'common.delete')}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <StickyNote className="size-10 vl-text-muted mx-auto mb-2 vl-float-animation" />
            <p className="text-sm vl-text-muted">{t(lang, 'bioTools.labNotebook.noNotes')}</p>
            <p className="text-xs vl-text-muted mt-0.5">{t(lang, 'bioTools.labNotebook.noNotesDesc')}</p>
          </div>
        )}
      </div>
    </div>
  )

  const renderReactionCalculator = () => (
    <div className="bio-tool-expanded space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#06b6d420' }}>
          <Calculator className="size-5" style={{ color: '#06b6d4' }} />
        </div>
        <div>
          <h3 className="text-base font-semibold vl-text-heading">{t(lang, 'bioTools.reactionCalculator')}</h3>
          <p className="text-xs vl-text-muted">{t(lang, 'bioTools.reactionCalculator.desc')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="vl-text-label text-xs">{t(lang, 'bioTools.reactionCalculator.concentration')} (mM)</Label>
          <Input type="number" className="vl-input text-sm" placeholder="e.g. 10" value={conc} onChange={(e) => setConc(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="vl-text-label text-xs">{t(lang, 'bioTools.reactionCalculator.volume')} (µL)</Label>
          <Input type="number" className="vl-input text-sm" placeholder="e.g. 50" value={vol} onChange={(e) => setVol(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="vl-text-label text-xs">{t(lang, 'bioTools.reactionCalculator.molWeight')} (g/mol)</Label>
          <Input type="number" className="vl-input text-sm" placeholder="e.g. 180.16" value={mw} onChange={(e) => setMw(e.target.value)} />
        </div>
      </div>

      <div className="bio-formula">
        n = C × V = {concNum > 0 ? concNum : '?'} mM × {volNum > 0 ? volNum : '?'} µL = {moles > 0 ? `${formatScientific(moles)} mol` : '—'}
      </div>

      {concNum > 0 && volNum > 0 && mwNum > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="vl-inner rounded-xl p-4 border border-[var(--vl-border-subtle)] space-y-1">
            <p className="text-[10px] vl-text-muted">{t(lang, 'bioTools.reactionCalculator.moles')}</p>
            <p className="text-lg font-semibold vl-text-heading font-mono">{formatScientific(moles)} <span className="text-xs font-normal">mol</span></p>
          </div>
          <div className="vl-inner rounded-xl p-4 border border-[var(--vl-border-subtle)] space-y-1">
            <p className="text-[10px] vl-text-muted">{t(lang, 'bioTools.reactionCalculator.mass')}</p>
            <p className="text-lg font-semibold vl-text-heading font-mono">
              {mass >= 1 ? `${mass.toFixed(4)} g` : mass >= 0.001 ? `${(mass * 1000).toFixed(4)} mg` : `${(mass * 1e6).toFixed(4)} µg`}
            </p>
          </div>
          <div className="vl-inner rounded-xl p-4 border border-[var(--vl-border-subtle)] space-y-1">
            <p className="text-[10px] vl-text-muted">{t(lang, 'bioTools.reactionCalculator.molarity')}</p>
            <p className="text-lg font-semibold vl-text-heading font-mono">{molarity.toFixed(4)} <span className="text-xs font-normal">M</span></p>
          </div>
          <div className="sm:col-span-3">
            <Button size="sm" variant="outline" className="text-[10px]" onClick={() => {
              navigator.clipboard.writeText([
                `Moles: ${formatScientific(moles)} mol`,
                `Mass: ${mass >= 1 ? `${mass.toFixed(4)} g` : mass >= 0.001 ? `${(mass * 1000).toFixed(4)} mg` : `${(mass * 1e6).toFixed(4)} µg`}`,
                `Molarity: ${molarity.toFixed(4)} M`,
              ].join('\n'))
              toast.success(t(lang, 'bioTools.reactionCalculator.copied'))
            }}>
              <Copy className="size-3 mr-1" /> {t(lang, 'common.copy')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-6">
          <Calculator className="size-8 vl-text-muted mx-auto mb-2 opacity-50" />
          <p className="text-sm vl-text-muted">{t(lang, 'bioTools.reactionCalculator.noCalc')}</p>
        </div>
      )}
    </div>
  )

  const renderDilutionCalculator = () => {
    const DILUTION_PRESETS = [
      { label: '1:2', factor: 2 },
      { label: '1:5', factor: 5 },
      { label: '1:10', factor: 10 },
      { label: '1:100', factor: 100 },
      { label: '1:1000', factor: 1000 },
    ]

    const applyPreset = (factor: number) => {
      if (!c1) return
      const newC2 = c1 / factor
      setDesiredConc(newC2.toString())
    }

    const stockPct = v2 > 0 ? (v1 / v2) * 100 : 0

    return (
      <div className="bio-tool-expanded space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#8b5cf620' }}>
            <TestTubes className="size-5" style={{ color: '#8b5cf6' }} />
          </div>
          <div>
            <h3 className="text-base font-semibold vl-text-heading">{t(lang, 'bioTools.dilutionCalculator')}</h3>
            <p className="text-xs vl-text-muted">{t(lang, 'bioTools.dilutionCalculator.desc')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="vl-text-label text-xs">{t(lang, 'bioTools.dilutionCalculator.stockConc')} (mM)</Label>
            <Input type="number" className="vl-input text-sm" placeholder="e.g. 100" value={stockConc} onChange={(e) => setStockConc(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="vl-text-label text-xs">{t(lang, 'bioTools.dilutionCalculator.desiredConc')} (mM)</Label>
            <Input type="number" className="vl-input text-sm" placeholder="e.g. 10" value={desiredConc} onChange={(e) => setDesiredConc(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="vl-text-label text-xs">{t(lang, 'bioTools.dilutionCalculator.desiredVol')} (µL)</Label>
            <Input type="number" className="vl-input text-sm" placeholder="e.g. 500" value={desiredVol} onChange={(e) => setDesiredVol(e.target.value)} />
          </div>
        </div>

        {/* Presets */}
        <div className="space-y-1.5">
          <Label className="vl-text-label text-xs">{t(lang, 'bioTools.dilutionCalculator.presets')}</Label>
          <div className="flex flex-wrap gap-2">
            {DILUTION_PRESETS.map(p => (
              <Button key={p.label} size="sm" variant="outline" className="text-[10px] h-7" style={{ borderColor: '#8b5cf640', color: '#8b5cf6' }} onClick={() => applyPreset(p.factor)}>
                {p.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="bio-formula">
          V1 = (C2 × V2) / C1 = {c2 > 0 ? c2 : '?'} × {v2 > 0 ? v2 : '?'} / {c1 > 0 ? c1 : '?'}
        </div>

        {c1 > 0 && c2 > 0 && v2 > 0 ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="vl-inner rounded-xl p-4 border border-[var(--vl-border-subtle)] space-y-1">
                <p className="text-[10px] vl-text-muted">{t(lang, 'bioTools.dilutionCalculator.stockVol')} (V1)</p>
                <p className="text-lg font-semibold vl-text-heading font-mono">{v1.toFixed(2)} <span className="text-xs font-normal">µL</span></p>
              </div>
              <div className="vl-inner rounded-xl p-4 border border-[var(--vl-border-subtle)] space-y-1">
                <p className="text-[10px] vl-text-muted">{t(lang, 'bioTools.dilutionCalculator.diluentVol')}</p>
                <p className="text-lg font-semibold vl-text-heading font-mono">{diluentVol.toFixed(2)} <span className="text-xs font-normal">µL</span></p>
              </div>
            </div>

            {/* Proportion Bar */}
            <div className="space-y-1.5">
              <p className="text-[10px] vl-text-muted">{t(lang, 'bioTools.dilutionCalculator.proportion')}</p>
              <div className="bio-dilution-bar">
                <div className="stock-portion" style={{ width: `${Math.max(stockPct, 8)}%` }}>
                  {v1.toFixed(1)} µL
                </div>
                <div className="diluent-portion">
                  {diluentVol.toFixed(1)} µL
                </div>
              </div>
            </div>

            <Button size="sm" variant="outline" className="text-[10px]" onClick={() => {
              navigator.clipboard.writeText([
                `Stock Volume (V1): ${v1.toFixed(2)} µL`,
                `Diluent Volume: ${diluentVol.toFixed(2)} µL`,
                `Total Volume: ${v2.toFixed(2)} µL`,
              ].join('\n'))
              toast.success(t(lang, 'bioTools.dilutionCalculator.copied'))
            }}>
              <Copy className="size-3 mr-1" /> {t(lang, 'common.copy')}
            </Button>
          </div>
        ) : (
          <div className="text-center py-6">
            <TestTubes className="size-8 vl-text-muted mx-auto mb-2 opacity-50" />
            <p className="text-sm vl-text-muted">{t(lang, 'bioTools.dilutionCalculator.noCalc')}</p>
          </div>
        )}
      </div>
    )
  }

  const renderExpandedTool = () => {
    switch (expandedQuickTool) {
      case 'sequence-analyzer': return renderSequenceAnalyzer()
      case 'lab-notebook': return renderLabNotebook()
      case 'reaction-calculator': return renderReactionCalculator()
      case 'dilution-calculator': return renderDilutionCalculator()
      default: return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold vl-text-heading tracking-tight">{t(lang, 'bioTools.title')}</h2>
          <p className="text-sm vl-text-muted mt-1">{t(lang, 'bioTools.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="vl-text-muted">
            {tools.filter(t => t.status === 'ready').length} {t(lang, 'bioTools.available')}
          </Badge>
        </div>
      </div>

      {/* Tool Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 card-entrance-cascade">
        {tools.map((tool) => {
          const Icon = tool.icon
          return (
            <motion.div
              key={tool.id}
              className={`bio-tool-card hover-lift-sm transition-all-smooth ${tool.id === 'rfdiffusion' ? 'breathing-glow-violet' : tool.id === 'alphafold' ? 'breathing-glow-cyan' : tool.id === 'rosetta' ? 'breathing-glow-amber' : 'breathing-glow'}`}
              whileHover={{ scale: 1.01, y: -2 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <Card className="vl-card border overflow-hidden h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center"
                        style={{ background: `${tool.color}20` }}
                      >
                        <Icon className="size-5" style={{ color: tool.color }} />
                      </div>
                      <div>
                        <CardTitle className="text-base vl-text-heading">{t(lang, `bioTools.${tool.id}.name`)}</CardTitle>
                        <p className="text-xs vl-text-muted mt-0.5">{tool.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={`${availabilityBadgeClass(tool.availability)} text-[10px] px-2 py-0.5 ${tool.availability === 'processing' ? 'animate-pulse' : ''}`}
                      >
                        {availabilityLabel(tool.availability, lang)}
                      </Badge>
                      <Badge variant="outline" className={`${statusBadgeClass(tool.status)} text-[10px] px-2 py-0.5`}>
                        {statusIcon(tool.status)}
                        {statusLabel(tool.status, lang)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <p className="text-sm vl-text-body leading-relaxed line-clamp-2">
                    {t(lang, `bioTools.${tool.id}.desc`)}
                  </p>

                  {(tool.status === 'running' || tool.status === 'completed') && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs vl-text-muted">
                        <span>{tool.status === 'running' ? t(lang, 'bioTools.analyzing') : t(lang, 'bioTools.complete')}</span>
                        <span>{Math.round(tool.progress)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[var(--vl-bg-inner)] overflow-hidden">
                        <motion.div
                          className="h-full rounded-full progress-glow"
                          style={{
                            background: `linear-gradient(90deg, ${tool.color}, ${tool.color}cc)`,
                            width: `${tool.progress}%`,
                          }}
                          initial={{ width: 0 }}
                          animate={{ width: `${tool.progress}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      style={{ borderColor: `${tool.color}40`, color: tool.color }}
                      onClick={() => handleConfigure(tool.id)}
                      disabled={tool.status === 'running'}
                    >
                      <Settings className="size-3 mr-1.5" />
                      {t(lang, 'bioTools.configure')}
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 text-xs"
                      style={{ background: tool.color }}
                      onClick={handleRunTool}
                      disabled={tool.status === 'running'}
                    >
                      {tool.status === 'running' ? (
                        <Loader2 className="size-3 mr-1.5 animate-spin" />
                      ) : (
                        <Play className="size-3 mr-1.5" />
                      )}
                      {t(lang, 'bioTools.runAnalysis')}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between text-[10px] vl-text-muted pt-1 border-t border-[var(--vl-border-subtle)]">
                    <span className="flex items-center gap-1">
                      <Activity className="size-3" />
                      {tool.analysesRun} {tool.analysesRun === 1 ? 'analysis' : 'analyses'} run
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      Last run: {timeAgo(tool.lastRunAt)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Enhanced Running Progress Panel */}
      <AnimatePresence>
        {isRunning && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="vl-card border overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Loader2 className="size-4 text-amber-400" />
                  </motion.div>
                  <CardTitle className="text-sm font-semibold vl-text-heading">
                    Running {selectedTool?.name || 'Analysis'}...
                  </CardTitle>
                  <span className="text-xs font-mono vl-text-muted ml-auto">{Math.round(runProgress)}%</span>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="h-2 rounded-full bg-[var(--vl-bg-inner)] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${runProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <div className="space-y-2">
                  {ANALYSIS_STEPS.map((step, idx) => {
                    const isDone = idx < currentStepIndex
                    const isActive = idx === currentStepIndex && step.duration > 0
                    const isComplete = idx === currentStepIndex && step.duration === 0
                    return (
                      <motion.div
                        key={step.label}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className={`flex items-center gap-2.5 text-xs transition-colors duration-300 ${
                          isDone || isComplete ? 'text-emerald-400' : isActive ? 'text-amber-400' : 'vl-text-muted'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all duration-300 ${
                          isDone || isComplete
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                            : isActive
                              ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                              : 'border-[var(--vl-border-subtle)]'
                        }`}>
                          {isDone || isComplete ? (
                            <CheckCircle2 className="size-3" />
                          ) : isActive ? (
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            >
                              <Loader2 className="size-3" />
                            </motion.div>
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-current opacity-40" />
                          )}
                        </div>
                        <span className={isActive ? 'font-medium' : ''}>{step.label}</span>
                        {isActive && (
                          <motion.div
                            className="ml-auto flex items-center gap-1"
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1.2, repeat: Infinity }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          </motion.div>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Section */}
      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            <Separator className="vl-section-separator" />
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold vl-text-heading vl-text-balance">{t(lang, 'bioTools.results')}</h3>
              <Badge variant="outline" className="vl-text-muted text-[10px]">
                {results.length} {t(lang, 'bioTools.resultCount')}
              </Badge>
            </div>
            <div className="space-y-2">
              {results.map((result, i) => {
                const tool = TOOL_DEFINITIONS.find(td => td.id === result.toolId)
                const Icon = tool?.icon || Beaker
                const color = tool?.color || '#10b981'
                return (
                  <motion.div
                    key={`${result.toolId}-${i}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="vl-inner rounded-lg border overflow-hidden"
                  >
                    <div className="flex items-center gap-3 p-4 pb-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}20` }}>
                        <Icon className="size-4" style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium vl-text-heading">{tool?.name || result.toolId}</span>
                          <span className="text-[10px] vl-text-muted">
                            {new Date(result.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="px-4 pb-3">
                      <pre className="p-3 rounded-lg bg-[var(--vl-bg-inner)] border border-[var(--vl-border-subtle)] text-[11px] font-mono vl-text-body overflow-x-auto max-h-[200px] overflow-y-auto scrollbar-thin custom-scrollbar leading-relaxed whitespace-pre-wrap">
                        {result.output}
                      </pre>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Templates */}
      <div className="space-y-3">
        <Separator className="vl-section-separator" />
        <div className="flex items-center gap-2">
          <SquareCode className="size-4 text-emerald-400" />
          <h3 className="text-lg font-semibold vl-text-heading vl-text-balance">Quick Templates</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {QUICK_TEMPLATES.map((tpl) => {
            const TplIcon = tpl.icon
            return (
              <motion.div
                key={tpl.id}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="vl-card border rounded-xl p-4 cursor-pointer hover:border-emerald-500/30 transition-all duration-200 group"
                onClick={() => handleTemplateClick(tpl)}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110"
                    style={{ background: `${tpl.color}20` }}
                  >
                    <TplIcon className="size-5" style={{ color: tpl.color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium vl-text-heading group-hover:text-emerald-400 transition-colors">{tpl.title}</p>
                    <p className="text-xs vl-text-muted mt-0.5 line-clamp-2">{tpl.description}</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1 text-[10px] vl-text-muted group-hover:text-emerald-400 transition-colors">
                  <ArrowRight className="size-3" />
                  Use template
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Empty State */}
      {results.length === 0 && tools.every(t => t.status === 'ready') && (
        <EmptyState
          icon={Microscope}
          title={t(lang, 'bioTools.noResults')}
          description={t(lang, 'bioTools.noResultsDesc')}
          accentColor="#10b981"
          action={
            <Button
              size="sm"
              className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white"
              onClick={() => handleConfigure(tools[0].id)}
            >
              <Play className="size-3.5 mr-1.5" />
              {t(lang, 'bioTools.getStarted')}
            </Button>
          }
        />
      )}

      {/* ============================================================ */}
      {/* Quick Analysis Tools Section */}
      {/* ============================================================ */}
      <div className="space-y-3">
        <Separator className="vl-section-separator" />
        <div className="flex items-center gap-2">
          <Zap className="size-4 text-emerald-400" />
          <h3 className="text-lg font-semibold vl-text-heading vl-text-balance">{t(lang, 'bioTools.quickTools')}</h3>
          <p className="text-xs vl-text-muted ml-1">{t(lang, 'bioTools.quickTools.desc')}</p>
        </div>

        <AnimatePresence mode="wait">
          {expandedQuickTool ? (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <Card className="vl-card border">
                <CardContent className="p-4 sm:p-6">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mb-4 text-xs vl-text-muted"
                    onClick={() => setExpandedQuickTool(null)}
                  >
                    <ArrowLeft className="size-3 mr-1" />
                    {t(lang, 'bioTools.toolCard.back')}
                  </Button>
                  {renderExpandedTool()}
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 card-entrance-cascade"
            >
              {QUICK_TOOL_DEFS.map(qt => {
                const QtIcon = qt.icon
                return (
                  <motion.div
                    key={qt.id}
                    className="bio-tool-card cursor-pointer hover-lift-sm transition-all-smooth"
                    whileHover={{ scale: 1.02, y: -3 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setExpandedQuickTool(qt.id)}
                  >
                    <Card className="vl-card border h-full">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: `${qt.color}20` }}
                          >
                            <QtIcon className="size-5" style={{ color: qt.color }} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-semibold vl-text-heading">{t(lang, qt.nameKey)}</h4>
                            <p className="text-[10px] vl-text-muted mt-0.5">{t(lang, qt.subtitleKey)}</p>
                          </div>
                        </div>
                        <p className="text-xs vl-text-muted leading-relaxed line-clamp-2">
                          {t(lang, qt.descKey)}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs"
                          style={{ borderColor: `${qt.color}40`, color: qt.color }}
                        >
                          <ChevronRight className="size-3 mr-1" />
                          {t(lang, 'bioTools.toolCard.tryIt')}
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Configure Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="vl-dialog sm:max-w-lg max-h-[85vh] overflow-y-auto scrollbar-thin custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="vl-text-heading flex items-center gap-2">
              {selectedTool && (
                <>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${selectedTool.color}20` }}>
                    {React.createElement(selectedTool.icon, { className: 'size-4', style: { color: selectedTool.color } })}
                  </div>
                  {t(lang, `bioTools.${selectedTool.id}.name`)} — {t(lang, 'bioTools.configure')}
                </>
              )}
            </DialogTitle>
            <DialogDescription className="vl-text-muted">
              {t(lang, 'bioTools.configureDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* PDB File Upload */}
            <div className="space-y-2">
              <Label className="vl-text-label text-sm">{t(lang, 'bioTools.pdbFile')}</Label>
              <div
                className={`vl-inner rounded-lg border-2 border-dashed p-4 text-center transition-all duration-200 cursor-pointer ${
                  dragOver
                    ? 'border-emerald-500 bg-emerald-500/10 scale-[1.01]'
                    : 'border-[var(--vl-border-subtle)] hover:border-emerald-500/50 hover:bg-emerald-500/5'
                }`}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true) }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false) }}
                onDrop={handleFileDrop}
                onClick={() => document.getElementById('pdb-file-input')?.click()}
              >
                <input
                  id="pdb-file-input"
                  type="file"
                  accept=".pdb,.fasta,.txt"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <AnimatePresence mode="wait">
                  {dragOver ? (
                    <motion.div
                      key="dragging"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="flex flex-col items-center gap-1"
                    >
                      <motion.div
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <Upload className="size-7 text-emerald-400" />
                      </motion.div>
                      <p className="text-xs text-emerald-400 font-medium">{t(lang, 'bioTools.dropzone.dragHere')}</p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center gap-1"
                    >
                      <Upload className="size-6 vl-text-muted" />
                      <p className="text-xs vl-text-muted">{t(lang, 'bioTools.dropzone.dragHere')}</p>
                      <p className="text-[10px] vl-text-muted">{t(lang, 'bioTools.dropzone.or')}</p>
                      <button
                        type="button"
                        className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline"
                        onClick={(e) => { e.stopPropagation(); document.getElementById('pdb-file-input')?.click() }}
                      >
                        {t(lang, 'bioTools.dropzone.browse')}
                      </button>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] vl-text-muted">{t(lang, 'bioTools.dropzone.accepted')}</span>
                        <span className="text-[9px] vl-text-muted">·</span>
                        <span className="text-[9px] vl-text-muted">{t(lang, 'bioTools.dropzone.maxSize')}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Uploaded Files List */}
              <AnimatePresence>
                {uploadedFiles.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1.5"
                  >
                    {uploadedFiles.map((file, idx) => (
                      <motion.div
                        key={file.name}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="vl-inner rounded-lg p-2.5 border border-[var(--vl-border-subtle)] group/file"
                      >
                        <div className="flex items-center gap-2">
                          <FilePlus2 className="size-4 vl-text-muted shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium vl-text-heading truncate">{file.name}</p>
                            <p className="text-[10px] vl-text-muted">{formatFileSize(file.size)}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            {file.preview && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      className="p-1 rounded vl-text-muted hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setExpandedPreview(expandedPreview === file.name ? null : file.name)
                                      }}
                                    >
                                      <Eye className="size-3" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>Preview</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            <button
                              className="p-1 rounded vl-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover/file:opacity-100"
                              onClick={(e) => { e.stopPropagation(); removeFile(idx) }}
                            >
                              <X className="size-3" />
                            </button>
                          </div>
                        </div>
                        <AnimatePresence>
                          {expandedPreview === file.name && file.preview && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <pre className="mt-2 p-2 rounded-md bg-[var(--vl-bg-inner)] border border-[var(--vl-border-subtle)] text-[10px] font-mono vl-text-body overflow-x-auto max-h-[120px] overflow-y-auto">
                                {file.preview}
                              </pre>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Sequence Input */}
            <div className="space-y-2">
              <Label className="vl-text-label text-sm">{t(lang, 'bioTools.sequence')}</Label>
              <Textarea
                className="vl-input min-h-[60px] text-xs font-mono custom-scrollbar"
                placeholder={t(lang, 'bioTools.sequencePlaceholder')}
                value={config.sequence}
                onChange={(e) => setConfig(prev => ({ ...prev, sequence: e.target.value }))}
                maxLength={5000}
              />
              <p className="text-[10px] vl-text-muted">{config.sequence.length}/5000 residues</p>
            </div>

            {/* Model Selection */}
            <div className="space-y-2">
              <Label className="vl-text-label text-sm">{t(lang, 'bioTools.model')}</Label>
              <Select value={config.model} onValueChange={(v) => setConfig(prev => ({ ...prev, model: v }))}>
                <SelectTrigger className="vl-input">
                  <SelectValue placeholder={t(lang, 'bioTools.selectModel')} />
                </SelectTrigger>
                <SelectContent className="vl-dialog border">
                  {(MODEL_OPTIONS[selectedToolId as keyof typeof MODEL_OPTIONS] || []).map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Confidence Threshold */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="vl-text-label text-sm">{t(lang, 'bioTools.confidence')}</Label>
                <span className="text-xs vl-text-muted">{(config.confidenceThreshold * 100).toFixed(0)}%</span>
              </div>
              <Slider
                value={[config.confidenceThreshold]}
                onValueChange={([v]) => setConfig(prev => ({ ...prev, confidenceThreshold: v }))}
                min={0}
                max={1}
                step={0.05}
              />
            </div>

            {/* Number of Samples */}
            <div className="space-y-2">
              <Label className="vl-text-label text-sm">{t(lang, 'bioTools.numSamples')}</Label>
              <Input
                type="number"
                className="vl-input"
                value={config.numSamples}
                onChange={(e) => setConfig(prev => ({ ...prev, numSamples: Math.max(1, parseInt(e.target.value) || 1) }))}
                min={1}
                max={100}
              />
            </div>

            {/* Temperature */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="vl-text-label text-sm">{t(lang, 'bioTools.temperature')}</Label>
                <span className="text-xs vl-text-muted">{config.temperature.toFixed(2)}</span>
              </div>
              <Slider
                value={[config.temperature]}
                onValueChange={([v]) => setConfig(prev => ({ ...prev, temperature: v }))}
                min={0}
                max={2}
                step={0.05}
              />
            </div>

            {/* Advanced Settings */}
            <Separator />
            <button
              className="flex items-center gap-2 text-sm vl-text-muted hover:text-[var(--vl-accent)] transition-colors w-full text-left"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              {t(lang, 'bioTools.advanced')}
            </button>
            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-3 overflow-hidden"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="vl-text-label text-xs">{t(lang, 'bioTools.diffusionSteps')}</Label>
                      <span className="text-[10px] vl-text-muted">{config.advanced.diffusionSteps}</span>
                    </div>
                    <Slider
                      value={[config.advanced.diffusionSteps]}
                      onValueChange={([v]) => setConfig(prev => ({ ...prev, advanced: { ...prev.advanced, diffusionSteps: v } }))}
                      min={10}
                      max={500}
                      step={10}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="vl-text-label text-xs">{t(lang, 'bioTools.guidanceScale')}</Label>
                      <span className="text-[10px] vl-text-muted">{config.advanced.guidanceScale.toFixed(1)}</span>
                    </div>
                    <Slider
                      value={[config.advanced.guidanceScale]}
                      onValueChange={([v]) => setConfig(prev => ({ ...prev, advanced: { ...prev.advanced, guidanceScale: v } }))}
                      min={0.5}
                      max={5}
                      step={0.1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="vl-text-label text-xs">{t(lang, 'bioTools.maxResidues')}</Label>
                    <Input
                      type="number"
                      className="vl-input"
                      value={config.advanced.maxResidues}
                      onChange={(e) => setConfig(prev => ({ ...prev, advanced: { ...prev.advanced, maxResidues: parseInt(e.target.value) || 500 } }))}
                      min={50}
                      max={5000}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
              {t(lang, 'common.cancel')}
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleRunTool}
              disabled={isRunning}
            >
              {isRunning ? (
                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
              ) : (
                <Play className="size-3.5 mr-1.5" />
              )}
              {t(lang, 'bioTools.runAnalysis')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
