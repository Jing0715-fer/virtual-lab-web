import { NextRequest, NextResponse } from 'next/server'

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
}

// ============================================================
// Sample Data Generator
// ============================================================

function generateSampleExperiments(): Experiment[] {
  const now = Date.now()
  const day = 86400000
  const hour = 3600000

  return [
    {
      id: 'exp-001',
      title: 'Nanobody CDR3 Loop Optimization',
      hypothesis: 'Systematic mutagenesis of CDR3 loop residues will increase binding affinity to SARS-CoV-2 RBD by >2-fold while maintaining thermal stability above 65°C.',
      description: 'Comprehensive alanine scanning and saturation mutagenesis of the CDR3 loop region to identify optimal residue combinations for enhanced binding.',
      methodology: 'Site-directed mutagenesis followed by yeast surface display screening. Affinity measured by flow cytometry with fluorescently labeled RBD antigen.',
      status: 'completed',
      priority: 'critical',
      variables: [
        { name: 'CDR3 mutation type', type: 'independent', unit: 'mutation', description: 'Alanine scan vs saturation' },
        { name: 'Expression temperature', type: 'independent', unit: '°C', description: 'Yeast culture temperature' },
        { name: 'Binding affinity (KD)', type: 'dependent', unit: 'nM', description: 'Equilibrium dissociation constant' },
        { name: 'Thermal stability (Tm)', type: 'dependent', unit: '°C', description: 'Melting temperature by DSF' },
      ],
      results: [
        { trial: 1, value: 12.3, notes: 'Wild-type baseline', timestamp: new Date(now - 30 * day).toISOString() },
        { trial: 2, value: 5.1, notes: 'Gly50Ala mutant', timestamp: new Date(now - 29 * day).toISOString() },
        { trial: 3, value: 3.8, notes: 'Gly50Trp mutant', timestamp: new Date(now - 28 * day).toISOString() },
        { trial: 4, value: 2.1, notes: 'Trp52Leu double mutant', timestamp: new Date(now - 27 * day).toISOString() },
        { trial: 5, value: 1.8, notes: 'Triple mutant optimized', timestamp: new Date(now - 26 * day).toISOString() },
        { trial: 6, value: 4.5, notes: 'Saturation mutagenesis hit #1', timestamp: new Date(now - 25 * day).toISOString() },
      ],
      statusHistory: [
        { status: 'planned', timestamp: new Date(now - 35 * day).toISOString() },
        { status: 'running', timestamp: new Date(now - 30 * day).toISOString(), note: 'Mutagenesis started' },
        { status: 'completed', timestamp: new Date(now - 25 * day).toISOString(), note: 'All trials completed' },
      ],
      tags: ['nanobody', 'protein-engineering', 'sars-cov-2', 'cdr3'],
      expectedDuration: '14 days',
      associatedMeetingIds: ['meet-001'],
      associatedAgentIds: ['agent-001', 'agent-003'],
      createdAt: new Date(now - 35 * day).toISOString(),
      updatedAt: new Date(now - 25 * day).toISOString(),
      completedAt: new Date(now - 25 * day).toISOString(),
    },
    {
      id: 'exp-002',
      title: 'AlphaFold-Multimer Structure Prediction Pipeline',
      hypothesis: 'AlphaFold-Multimer v2.3 will achieve >90% accuracy (TM-score > 0.9) for nanobody-antigen complex structures compared to cryo-EM ground truth.',
      description: 'Benchmarking the latest AlphaFold-Multimer model on a curated set of 50 nanobody-antigen complexes with known structures.',
      methodology: 'Run AlphaFold-Multimer predictions on all 50 complexes. Compare predicted structures to experimental cryo-EM and X-ray structures using TM-score, lDDT, and RMSD metrics.',
      status: 'running',
      priority: 'high',
      variables: [
        { name: 'Model version', type: 'independent', unit: 'version', description: 'AF-Multimer v2.2 vs v2.3' },
        { name: 'Number of recycles', type: 'independent', unit: 'cycles', description: '1, 3, 6, 12 recycles' },
        { name: 'TM-score', type: 'dependent', unit: 'score', description: 'Template modeling score' },
        { name: 'pLDDT confidence', type: 'dependent', unit: 'score', description: 'Predicted lDDT' },
      ],
      results: [
        { trial: 1, value: 0.92, notes: 'AF-Multimer v2.3, 6 recycles', timestamp: new Date(now - 5 * day).toISOString() },
        { trial: 2, value: 0.88, notes: 'AF-Multimer v2.2, 6 recycles', timestamp: new Date(now - 4 * day).toISOString() },
        { trial: 3, value: 0.95, notes: 'AF-Multimer v2.3, 12 recycles', timestamp: new Date(now - 3 * day).toISOString() },
      ],
      statusHistory: [
        { status: 'planned', timestamp: new Date(now - 10 * day).toISOString() },
        { status: 'running', timestamp: new Date(now - 5 * day).toISOString(), note: 'GPU cluster allocated' },
      ],
      tags: ['alphafold', 'structure-prediction', 'benchmarking', 'ml'],
      expectedDuration: '21 days',
      associatedMeetingIds: ['meet-003'],
      associatedAgentIds: ['agent-002', 'agent-004'],
      createdAt: new Date(now - 10 * day).toISOString(),
      updatedAt: new Date(now - 3 * day).toISOString(),
    },
    {
      id: 'exp-003',
      title: 'Rosetta Energy Function Calibration',
      hypothesis: 'Recalibrated Rosetta ref2015 energy function will improve nanobody-antigen docking success rate from 35% to >60% for top-5 predictions.',
      description: 'Re-weighting Rosetta energy terms using a training set of 200 experimentally validated nanobody-antigen complexes.',
      methodology: 'Generate nanobody-antigen docking decoys using RosettaDock. Optimize energy function weights via linear regression on the training set. Validate on held-out test set.',
      status: 'completed',
      priority: 'high',
      variables: [
        { name: 'Energy weight set', type: 'independent', unit: 'parameter', description: 'Default vs recalibrated' },
        { name: 'Decoy count per complex', type: 'independent', unit: 'decoys', description: '1000, 5000, 10000' },
        { name: 'Docking success rate', type: 'dependent', unit: '%', description: 'CAPRI acceptable or better' },
        { name: 'Interface RMSD', type: 'dependent', unit: 'Å', description: 'iRMSD of top prediction' },
      ],
      results: [
        { trial: 1, value: 35, notes: 'Default ref2015 baseline', timestamp: new Date(now - 60 * day).toISOString() },
        { trial: 2, value: 42, notes: 'Adjusted fa_elec weight', timestamp: new Date(now - 58 * day).toISOString() },
        { trial: 3, value: 51, notes: 'Adjusted hbond weight', timestamp: new Date(now - 56 * day).toISOString() },
        { trial: 4, value: 58, notes: 'Full recalibration', timestamp: new Date(now - 54 * day).toISOString() },
        { trial: 5, value: 63, notes: 'Full recalibration + extra decoys', timestamp: new Date(now - 52 * day).toISOString() },
      ],
      statusHistory: [
        { status: 'planned', timestamp: new Date(now - 65 * day).toISOString() },
        { status: 'running', timestamp: new Date(now - 60 * day).toISOString() },
        { status: 'completed', timestamp: new Date(now - 52 * day).toISOString(), note: 'Target exceeded' },
      ],
      tags: ['rosetta', 'docking', 'energy-calibration', 'computational'],
      expectedDuration: '21 days',
      associatedMeetingIds: [],
      associatedAgentIds: ['agent-001'],
      createdAt: new Date(now - 65 * day).toISOString(),
      updatedAt: new Date(now - 52 * day).toISOString(),
      completedAt: new Date(now - 52 * day).toISOString(),
    },
    {
      id: 'exp-004',
      title: 'Binding Affinity Correlation Analysis',
      hypothesis: 'Computational binding energy scores (Rosetta ΔΔG) will show a strong correlation (R² > 0.7) with experimentally measured SPR binding affinities.',
      description: 'Statistical analysis of the relationship between in silico predicted binding energies and experimental surface plasmon resonance measurements.',
      methodology: 'Calculate Rosetta interface scores for 100 nanobody variants with known SPR data. Perform linear regression, Spearman correlation, and bootstrap confidence intervals.',
      status: 'failed',
      priority: 'medium',
      variables: [
        { name: 'Rosetta ΔΔG', type: 'independent', unit: 'kcal/mol', description: 'Predicted binding energy' },
        { name: 'SPR KD', type: 'dependent', unit: 'nM', description: 'Measured equilibrium dissociation constant' },
        { name: 'R² correlation', type: 'dependent', unit: 'score', description: 'Coefficient of determination' },
      ],
      results: [
        { trial: 1, value: 0.45, notes: 'R² with all variants', timestamp: new Date(now - 40 * day).toISOString() },
        { trial: 2, value: 0.52, notes: 'R² after removing outliers', timestamp: new Date(now - 39 * day).toISOString() },
        { trial: 3, value: 0.41, notes: 'R² with sub-category filtering', timestamp: new Date(now - 38 * day).toISOString() },
      ],
      statusHistory: [
        { status: 'planned', timestamp: new Date(now - 45 * day).toISOString() },
        { status: 'running', timestamp: new Date(now - 40 * day).toISOString() },
        { status: 'failed', timestamp: new Date(now - 38 * day).toISOString(), note: 'R² target not met (0.52 vs 0.70)' },
      ],
      tags: ['binding-affinity', 'spr', 'correlation', 'validation'],
      expectedDuration: '10 days',
      associatedMeetingIds: ['meet-002'],
      associatedAgentIds: ['agent-003', 'agent-005'],
      createdAt: new Date(now - 45 * day).toISOString(),
      updatedAt: new Date(now - 38 * day).toISOString(),
    },
    {
      id: 'exp-005',
      title: 'ESM-2 Sequence Generation for CDR1',
      hypothesis: 'ESM-2 protein language model can generate novel CDR1 loop sequences that maintain structural compatibility (RMSD < 2Å) with parent nanobody scaffold.',
      description: 'Using masked language modeling with ESM-2 to propose novel CDR1 sequences. Filtering candidates by structural compatibility with the nanobody framework.',
      methodology: 'Mask CDR1 positions in parent sequences. Generate 500 candidate sequences via ESM-2. Filter by pLDDT > 80, then validate top 20 by AlphaFold structure prediction.',
      status: 'planned',
      priority: 'medium',
      variables: [
        { name: 'ESM-2 model size', type: 'independent', unit: 'parameters', description: '650M vs 3B parameters' },
        { name: 'Masking strategy', type: 'independent', unit: 'type', description: 'Full vs partial CDR1 mask' },
        { name: 'Structure RMSD', type: 'dependent', unit: 'Å', description: 'vs parent nanobody' },
        { name: 'Valid sequence rate', type: 'dependent', unit: '%', description: 'Passing pLDDT threshold' },
      ],
      results: [],
      statusHistory: [
        { status: 'planned', timestamp: new Date(now - 2 * day).toISOString() },
      ],
      tags: ['esm', 'language-model', 'sequence-generation', 'cdr1'],
      expectedDuration: '10 days',
      associatedMeetingIds: [],
      associatedAgentIds: ['agent-002'],
      createdAt: new Date(now - 2 * day).toISOString(),
      updatedAt: new Date(now - 2 * day).toISOString(),
    },
    {
      id: 'exp-006',
      title: 'Protein Folding Kinetics Simulation',
      hypothesis: 'Molecular dynamics simulations with enhanced sampling (metadynamics) can reproduce nanobody folding pathways within 500ns aggregate simulation time.',
      description: 'Running all-atom MD simulations of 5 nanobody variants with different CDR3 lengths to compare folding mechanisms and identify kinetic traps.',
      methodology: 'GROMACS MD with CHARMM36m force field. Well-Tempered Metadynamics on RMSD and radius of gyration as collective variables. Analyze free energy surfaces.',
      status: 'running',
      priority: 'low',
      variables: [
        { name: 'CDR3 length', type: 'independent', unit: 'residues', description: '8, 12, 16, 20 residues' },
        { name: 'Temperature', type: 'independent', unit: 'K', description: '310K, 340K, 370K' },
        { name: 'Folding time', type: 'dependent', unit: 'ns', description: 'First passage time' },
        { name: 'Free energy barrier', type: 'dependent', unit: 'kcal/mol', description: 'ΔG of transition state' },
      ],
      results: [
        { trial: 1, value: 245, notes: 'CDR3=8, 310K', timestamp: new Date(now - 14 * day).toISOString() },
        { trial: 2, value: 312, notes: 'CDR3=12, 310K', timestamp: new Date(now - 12 * day).toISOString() },
        { trial: 3, value: 489, notes: 'CDR3=16, 310K', timestamp: new Date(now - 10 * day).toISOString() },
        { trial: 4, value: 180, notes: 'CDR3=8, 370K', timestamp: new Date(now - 8 * day).toISOString() },
      ],
      statusHistory: [
        { status: 'planned', timestamp: new Date(now - 16 * day).toISOString() },
        { status: 'running', timestamp: new Date(now - 14 * day).toISOString(), note: 'HPC job submitted' },
      ],
      tags: ['molecular-dynamics', 'folding', 'kinetics', 'simulation'],
      expectedDuration: '28 days',
      associatedMeetingIds: ['meet-004'],
      associatedAgentIds: ['agent-004', 'agent-005'],
      createdAt: new Date(now - 16 * day).toISOString(),
      updatedAt: new Date(now - 8 * day).toISOString(),
    },
    {
      id: 'exp-007',
      title: 'Immunogenicity Prediction Pipeline',
      hypothesis: 'Combined BepiPred and DiscoTope predictions can identify immunogenic epitopes on nanobody candidates with >80% sensitivity and >75% specificity.',
      description: 'Building a consensus immunogenicity prediction pipeline combining multiple epitope prediction tools for nanobody developability assessment.',
      methodology: 'Run BepiPred-2.0, DiscoTope-2.0, and ElliPro on 75 nanobody variants with known immunogenicity profiles. Build consensus classifier with ROC analysis.',
      status: 'completed',
      priority: 'medium',
      variables: [
        { name: 'Prediction tool', type: 'independent', unit: 'tool', description: 'BepiPred, DiscoTope, ElliPro, Consensus' },
        { name: 'Threshold', type: 'independent', unit: 'score', description: 'Classification threshold' },
        { name: 'Sensitivity', type: 'dependent', unit: '%', description: 'True positive rate' },
        { name: 'Specificity', type: 'dependent', unit: '%', description: 'True negative rate' },
      ],
      results: [
        { trial: 1, value: 72, notes: 'BepiPred sensitivity', timestamp: new Date(now - 50 * day).toISOString() },
        { trial: 2, value: 68, notes: 'DiscoTope sensitivity', timestamp: new Date(now - 49 * day).toISOString() },
        { trial: 3, value: 65, notes: 'ElliPro sensitivity', timestamp: new Date(now - 48 * day).toISOString() },
        { trial: 4, value: 84, notes: 'Consensus sensitivity', timestamp: new Date(now - 47 * day).toISOString() },
        { trial: 5, value: 78, notes: 'Consensus specificity', timestamp: new Date(now - 46 * day).toISOString() },
      ],
      statusHistory: [
        { status: 'planned', timestamp: new Date(now - 55 * day).toISOString() },
        { status: 'running', timestamp: new Date(now - 50 * day).toISOString() },
        { status: 'completed', timestamp: new Date(now - 46 * day).toISOString(), note: 'Pipeline validated' },
      ],
      tags: ['immunogenicity', 'developability', 'bepipred', 'discotope'],
      expectedDuration: '14 days',
      associatedMeetingIds: [],
      associatedAgentIds: ['agent-003'],
      createdAt: new Date(now - 55 * day).toISOString(),
      updatedAt: new Date(now - 46 * day).toISOString(),
      completedAt: new Date(now - 46 * day).toISOString(),
    },
    {
      id: 'exp-008',
      title: 'Multi-Objective Optimization Dashboard',
      hypothesis: 'Pareto-optimal nanobody candidates can be reliably identified by jointly optimizing binding affinity, stability, and expressibility using NSGA-II.',
      description: 'Implementing NSGA-II genetic algorithm for multi-objective optimization of nanobody sequences across three competing objectives.',
      methodology: 'Encode nanobody sequences as genotype vectors. Define fitness functions for affinity (Rosetta), stability (FoldX), and expressibility (Solubis). Run NSGA-II with population 200 for 500 generations.',
      status: 'planned',
      priority: 'high',
      variables: [
        { name: 'NSGA-II population size', type: 'independent', unit: 'individuals', description: '100, 200, 500' },
        { name: 'Generation count', type: 'independent', unit: 'generations', description: '200, 500, 1000' },
        { name: 'Hypervolume indicator', type: 'dependent', unit: 'score', description: 'Pareto front quality' },
        { name: 'Pareto front size', type: 'dependent', unit: 'count', description: 'Non-dominated solutions' },
      ],
      results: [],
      statusHistory: [
        { status: 'planned', timestamp: new Date(now - 1 * day).toISOString() },
      ],
      tags: ['optimization', 'nsga-ii', 'multi-objective', 'genetic-algorithm'],
      expectedDuration: '28 days',
      associatedMeetingIds: ['meet-005'],
      associatedAgentIds: ['agent-001', 'agent-002', 'agent-004'],
      createdAt: new Date(now - 1 * day).toISOString(),
      updatedAt: new Date(now - 1 * day).toISOString(),
    },
  ]
}

// ============================================================
// In-Memory Store (simulates database)
// ============================================================

let experiments: Experiment[] | null = null

function getExperiments(): Experiment[] {
  if (!experiments) {
    experiments = generateSampleExperiments()
  }
  return experiments
}

function saveExperiments(data: Experiment[]): void {
  experiments = data
}

// ============================================================
// Helper Functions
// ============================================================

function computeStats(results: ExperimentResult[]) {
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

// ============================================================
// GET Handler
// ============================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const path = searchParams.get('path') || ''

  // GET /stats — aggregate statistics
  if (path === '/stats') {
    const allExp = getExperiments()
    const total = allExp.length
    const completed = allExp.filter(e => e.status === 'completed')
    const failed = allExp.filter(e => e.status === 'failed')
    const running = allExp.filter(e => e.status === 'running')
    const planned = allExp.filter(e => e.status === 'planned')
    const archived = allExp.filter(e => e.status === 'archived')
    const successRate = total > 0 ? Math.round((completed.length / (completed.length + failed.length)) * 100) : 0

    // Average duration for completed experiments
    const durations = completed.map(e => {
      const created = new Date(e.createdAt).getTime()
      const ended = new Date(e.completedAt || e.updatedAt).getTime()
      return (ended - created) / (1000 * 60 * 60 * 24) // days
    })
    const avgDuration = durations.length > 0
      ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10
      : 0

    // Top hypotheses
    const hypothesisGroups = new Map<string, { success: number; total: number; hypothesis: string }>()
    allExp.forEach(exp => {
      const tag = exp.tags[0] || 'general'
      const existing = hypothesisGroups.get(tag)
      if (existing) {
        existing.total++
        if (exp.status === 'completed') existing.success++
      } else {
        hypothesisGroups.set(tag, {
          total: 1,
          success: exp.status === 'completed' ? 1 : 0,
          hypothesis: exp.hypothesis.slice(0, 120),
        })
      }
    })

    const topHypotheses = Array.from(hypothesisGroups.values())
      .map(h => ({ ...h, successRate: h.total > 0 ? Math.round((h.success / h.total) * 100) : 0 }))
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 5)

    // Creation rate over last 12 weeks
    const now = Date.now()
    const weekMs = 7 * 86400000
    const creationRate: number[] = Array(12).fill(0)
    allExp.forEach(exp => {
      const age = now - new Date(exp.createdAt).getTime()
      const weekIndex = Math.floor(age / weekMs)
      if (weekIndex < 12) {
        creationRate[11 - weekIndex]++
      }
    })

    // Heatmap data (4 weeks x 7 days)
    const heatmap: number[][] = Array(4).fill(null).map(() => Array(7).fill(0))
    allExp.forEach(exp => {
      const expDate = new Date(exp.createdAt)
      for (let w = 0; w < 4; w++) {
        for (let d = 0; d < 7; d++) {
          const cellDate = new Date(now - (3 - w) * 7 * 86400000 - (6 - d) * 86400000)
          if (expDate.toDateString() === cellDate.toDateString()) {
            heatmap[w][d]++
          }
          // Also check updates
          const updDate = new Date(exp.updatedAt)
          if (updDate.toDateString() === cellDate.toDateString()) {
            heatmap[w][d]++
          }
        }
      }
    })

    return NextResponse.json({
      total,
      completed: completed.length,
      failed: failed.length,
      running: running.length,
      planned: planned.length,
      archived: archived.length,
      successRate,
      avgDuration,
      activeCount: running.length + planned.length,
      topHypotheses,
      creationRate,
      heatmap,
      statusDistribution: {
        planned: planned.length,
        running: running.length,
        completed: completed.length,
        failed: failed.length,
        archived: archived.length,
      },
    })
  }

  // GET / — list experiments with filters
  const allExp = getExperiments()
  const status = searchParams.get('status')
  const priority = searchParams.get('priority')
  const tag = searchParams.get('tag')
  const search = searchParams.get('search')
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '50', 10)

  let filtered = [...allExp]

  if (status) {
    filtered = filtered.filter(e => e.status === status)
  }
  if (priority) {
    filtered = filtered.filter(e => e.priority === priority)
  }
  if (tag) {
    filtered = filtered.filter(e => e.tags.some(t => t.toLowerCase().includes(tag.toLowerCase())))
  }
  if (search) {
    const q = search.toLowerCase()
    filtered = filtered.filter(e =>
      e.title.toLowerCase().includes(q) ||
      e.hypothesis.toLowerCase().includes(q) ||
      e.tags.some(t => t.toLowerCase().includes(q))
    )
  }

  // Sort by updatedAt descending
  filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

  const total = filtered.length
  const start = (page - 1) * limit
  const paginated = filtered.slice(start, start + limit)

  // Compute stats for each experiment
  const enriched = paginated.map(exp => ({
    ...exp,
    stats: computeStats(exp.results),
  }))

  return NextResponse.json({
    experiments: enriched,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  })
}

// ============================================================
// POST Handler — Create Experiment
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, hypothesis, description, methodology, status, priority, variables, tags, expectedDuration, associatedMeetingIds, associatedAgentIds } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const newExp: Experiment = {
      id: `exp-${Date.now()}`,
      title: title.trim(),
      hypothesis: hypothesis || '',
      description: description || '',
      methodology: methodology || '',
      status: status || 'planned',
      priority: priority || 'medium',
      variables: variables || [],
      results: [],
      statusHistory: [{ status: status || 'planned', timestamp: now }],
      tags: tags || [],
      expectedDuration: expectedDuration || '',
      associatedMeetingIds: associatedMeetingIds || [],
      associatedAgentIds: associatedAgentIds || [],
      createdAt: now,
      updatedAt: now,
    }

    const allExp = getExperiments()
    allExp.unshift(newExp)
    saveExperiments(allExp)

    return NextResponse.json({ experiment: newExp, stats: null }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

// ============================================================
// PUT Handler — Update Experiment
// ============================================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Experiment ID is required' }, { status: 400 })
    }

    const allExp = getExperiments()
    const idx = allExp.findIndex(e => e.id === id)
    if (idx === -1) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 })
    }

    const exp = allExp[idx]
    const now = new Date().toISOString()

    // Handle status change
    if (updates.status && updates.status !== exp.status) {
      exp.statusHistory.push({
        status: updates.status,
        timestamp: now,
        note: updates.statusNote || `Status changed to ${updates.status}`,
      })
      if (updates.status === 'completed') {
        exp.completedAt = now
      }
    }

    // Handle adding results
    if (updates.newResult) {
      exp.results.push({
        trial: exp.results.length + 1,
        value: updates.newResult.value,
        notes: updates.newResult.notes || '',
        timestamp: now,
      })
    }

    // Merge updates
    const updated: Experiment = {
      ...exp,
      title: updates.title ?? exp.title,
      hypothesis: updates.hypothesis ?? exp.hypothesis,
      description: updates.description ?? exp.description,
      methodology: updates.methodology ?? exp.methodology,
      status: updates.status ?? exp.status,
      priority: updates.priority ?? exp.priority,
      variables: updates.variables ?? exp.variables,
      tags: updates.tags ?? exp.tags,
      expectedDuration: updates.expectedDuration ?? exp.expectedDuration,
      associatedMeetingIds: updates.associatedMeetingIds ?? exp.associatedMeetingIds,
      associatedAgentIds: updates.associatedAgentIds ?? exp.associatedAgentIds,
      updatedAt: now,
      completedAt: exp.completedAt,
    }

    allExp[idx] = updated
    saveExperiments(allExp)

    return NextResponse.json({ experiment: updated, stats: computeStats(updated.results) })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

// ============================================================
// DELETE Handler
// ============================================================

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Experiment ID is required' }, { status: 400 })
  }

  const allExp = getExperiments()
  const idx = allExp.findIndex(e => e.id === id)
  if (idx === -1) {
    return NextResponse.json({ error: 'Experiment not found' }, { status: 404 })
  }

  const deleted = allExp.splice(idx, 1)[0]
  saveExperiments(allExp)

  return NextResponse.json({ deleted: deleted.id })
}
