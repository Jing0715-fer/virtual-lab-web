import { NextResponse } from 'next/server'

// ─── Types ──────────────────────────────────────────────────────

interface WorkflowStep {
  id: string
  title: string
  description: string
  type: 'Data Input' | 'Analysis' | 'AI Processing' | 'Review' | 'Output' | 'Decision' | 'Notification'
  status: 'Pending' | 'Running' | 'Complete' | 'Error'
  duration: string
  agent: string
  branch?: 'yes' | 'no'
}

interface RunHistoryEntry {
  id: string
  workflowId: string
  status: 'Success' | 'Failed' | 'Running' | 'Cancelled'
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

interface Workflow {
  id: string
  name: string
  description: string
  steps: WorkflowStep[]
  status: 'Active' | 'Draft' | 'Archived'
  createdDate: string
  lastRunDate: string
  totalRuns: number
  successRate: number
  avgDuration: string
  runHistory: RunHistoryEntry[]
  agentUtilization: AgentUtilization[]
  lastResults: boolean[]
}

// ─── Mock Data ──────────────────────────────────────────────────

const workflows: Workflow[] = [
  {
    id: 'wf1',
    name: 'Nanobody Design Pipeline',
    description: 'End-to-end computational pipeline for designing novel nanobodies targeting SARS-CoV-2 variants using ESM-2 and Rosetta.',
    status: 'Active',
    createdDate: '2024-09-15',
    lastRunDate: '2025-01-19T14:30:00Z',
    totalRuns: 47,
    successRate: 89,
    avgDuration: '4h 23m',
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
      { id: 'r1', workflowId: 'wf1', status: 'Success', duration: '4h 12m', startTime: '2025-01-19T14:30:00Z', endTime: '2025-01-19T18:42:00Z', stepsCompleted: 9, totalSteps: 9 },
      { id: 'r2', workflowId: 'wf1', status: 'Success', duration: '3h 58m', startTime: '2025-01-17T09:00:00Z', endTime: '2025-01-17T12:58:00Z', stepsCompleted: 9, totalSteps: 9 },
      { id: 'r3', workflowId: 'wf1', status: 'Failed', duration: '2h 15m', startTime: '2025-01-15T11:00:00Z', endTime: '2025-01-15T13:15:00Z', stepsCompleted: 6, totalSteps: 9 },
      { id: 'r4', workflowId: 'wf1', status: 'Success', duration: '4h 30m', startTime: '2025-01-13T08:30:00Z', endTime: '2025-01-13T13:00:00Z', stepsCompleted: 9, totalSteps: 9 },
      { id: 'r5', workflowId: 'wf1', status: 'Success', duration: '4h 05m', startTime: '2025-01-11T14:00:00Z', endTime: '2025-01-11T18:05:00Z', stepsCompleted: 9, totalSteps: 9 },
      { id: 'r6', workflowId: 'wf1', status: 'Success', duration: '3h 52m', startTime: '2025-01-09T10:15:00Z', endTime: '2025-01-09T14:07:00Z', stepsCompleted: 9, totalSteps: 9 },
      { id: 'r7', workflowId: 'wf1', status: 'Success', duration: '4h 18m', startTime: '2025-01-07T09:45:00Z', endTime: '2025-01-07T14:03:00Z', stepsCompleted: 9, totalSteps: 9 },
      { id: 'r8', workflowId: 'wf1', status: 'Success', duration: '3h 47m', startTime: '2025-01-05T13:20:00Z', endTime: '2025-01-05T17:07:00Z', stepsCompleted: 9, totalSteps: 9 },
      { id: 'r9', workflowId: 'wf1', status: 'Success', duration: '4h 01m', startTime: '2025-01-03T08:00:00Z', endTime: '2025-01-03T12:01:00Z', stepsCompleted: 9, totalSteps: 9 },
      { id: 'r10', workflowId: 'wf1', status: 'Failed', duration: '1h 55m', startTime: '2025-01-01T11:30:00Z', endTime: '2025-01-01T13:25:00Z', stepsCompleted: 5, totalSteps: 9 },
    ],
  },
  {
    id: 'wf2',
    name: 'Protein Analysis',
    description: 'Comprehensive protein analysis workflow including secondary structure prediction, domain annotation, and PTM site detection.',
    status: 'Active',
    createdDate: '2024-08-22',
    lastRunDate: '2025-01-18T10:00:00Z',
    totalRuns: 35,
    successRate: 94,
    avgDuration: '2h 15m',
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
      { id: 'r1', workflowId: 'wf2', status: 'Success', duration: '2h 10m', startTime: '2025-01-18T10:00:00Z', endTime: '2025-01-18T12:10:00Z', stepsCompleted: 5, totalSteps: 5 },
      { id: 'r2', workflowId: 'wf2', status: 'Success', duration: '2h 22m', startTime: '2025-01-16T08:30:00Z', endTime: '2025-01-16T10:52:00Z', stepsCompleted: 5, totalSteps: 5 },
      { id: 'r3', workflowId: 'wf2', status: 'Success', duration: '2h 08m', startTime: '2025-01-14T13:00:00Z', endTime: '2025-01-14T15:08:00Z', stepsCompleted: 5, totalSteps: 5 },
      { id: 'r4', workflowId: 'wf2', status: 'Failed', duration: '1h 40m', startTime: '2025-01-12T09:15:00Z', endTime: '2025-01-12T10:55:00Z', stepsCompleted: 3, totalSteps: 5 },
      { id: 'r5', workflowId: 'wf2', status: 'Success', duration: '2h 19m', startTime: '2025-01-10T14:00:00Z', endTime: '2025-01-10T16:19:00Z', stepsCompleted: 5, totalSteps: 5 },
    ],
  },
  {
    id: 'wf3',
    name: 'Literature Review',
    description: 'Automated literature search, summarization, and citation network mapping for research topics.',
    status: 'Draft',
    createdDate: '2024-11-10',
    lastRunDate: '2025-01-10T16:00:00Z',
    totalRuns: 8,
    successRate: 75,
    avgDuration: '1h 45m',
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
      { id: 'r1', workflowId: 'wf3', status: 'Success', duration: '1h 38m', startTime: '2025-01-10T16:00:00Z', endTime: '2025-01-10T17:38:00Z', stepsCompleted: 6, totalSteps: 6 },
      { id: 'r2', workflowId: 'wf3', status: 'Success', duration: '1h 52m', startTime: '2025-01-07T09:00:00Z', endTime: '2025-01-07T10:52:00Z', stepsCompleted: 6, totalSteps: 6 },
      { id: 'r3', workflowId: 'wf3', status: 'Failed', duration: '0h 45m', startTime: '2025-01-04T14:30:00Z', endTime: '2025-01-04T15:15:00Z', stepsCompleted: 3, totalSteps: 6 },
      { id: 'r4', workflowId: 'wf3', status: 'Success', duration: '1h 41m', startTime: '2025-01-02T11:00:00Z', endTime: '2025-01-02T12:41:00Z', stepsCompleted: 6, totalSteps: 6 },
      { id: 'r5', workflowId: 'wf3', status: 'Cancelled', duration: '0h 30m', startTime: '2024-12-28T10:00:00Z', endTime: '2024-12-28T10:30:00Z', stepsCompleted: 2, totalSteps: 6 },
    ],
  },
  {
    id: 'wf4',
    name: 'Experiment Planning',
    description: 'AI-assisted experimental design with resource optimization, timeline scheduling, and protocol generation.',
    status: 'Active',
    createdDate: '2024-07-05',
    lastRunDate: '2025-01-20T08:00:00Z',
    totalRuns: 22,
    successRate: 86,
    avgDuration: '3h 10m',
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
      { id: 'r1', workflowId: 'wf4', status: 'Success', duration: '3h 05m', startTime: '2025-01-20T08:00:00Z', endTime: '2025-01-20T11:05:00Z', stepsCompleted: 7, totalSteps: 7 },
      { id: 'r2', workflowId: 'wf4', status: 'Success', duration: '3h 18m', startTime: '2025-01-18T09:30:00Z', endTime: '2025-01-18T12:48:00Z', stepsCompleted: 7, totalSteps: 7 },
      { id: 'r3', workflowId: 'wf4', status: 'Success', duration: '2h 55m', startTime: '2025-01-15T14:00:00Z', endTime: '2025-01-15T16:55:00Z', stepsCompleted: 7, totalSteps: 7 },
      { id: 'r4', workflowId: 'wf4', status: 'Failed', duration: '1h 20m', startTime: '2025-01-13T10:00:00Z', endTime: '2025-01-13T11:20:00Z', stepsCompleted: 4, totalSteps: 7 },
      { id: 'r5', workflowId: 'wf4', status: 'Success', duration: '3h 12m', startTime: '2025-01-10T08:45:00Z', endTime: '2025-01-10T11:57:00Z', stepsCompleted: 7, totalSteps: 7 },
    ],
  },
  {
    id: 'wf5',
    name: 'Data Processing',
    description: 'High-throughput data processing pipeline for genomics and proteomics datasets with quality control.',
    status: 'Archived',
    createdDate: '2024-03-20',
    lastRunDate: '2024-12-15T11:00:00Z',
    totalRuns: 62,
    successRate: 95,
    avgDuration: '6h 45m',
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
      { id: 'r1', workflowId: 'wf5', status: 'Success', duration: '6h 32m', startTime: '2024-12-15T11:00:00Z', endTime: '2024-12-15T17:32:00Z', stepsCompleted: 6, totalSteps: 6 },
      { id: 'r2', workflowId: 'wf5', status: 'Success', duration: '6h 50m', startTime: '2024-12-10T08:00:00Z', endTime: '2024-12-10T14:50:00Z', stepsCompleted: 6, totalSteps: 6 },
      { id: 'r3', workflowId: 'wf5', status: 'Success', duration: '6h 28m', startTime: '2024-12-05T09:30:00Z', endTime: '2024-12-05T15:58:00Z', stepsCompleted: 6, totalSteps: 6 },
      { id: 'r4', workflowId: 'wf5', status: 'Success', duration: '7h 05m', startTime: '2024-11-28T10:00:00Z', endTime: '2024-11-28T17:05:00Z', stepsCompleted: 6, totalSteps: 6 },
      { id: 'r5', workflowId: 'wf5', status: 'Success', duration: '6h 40m', startTime: '2024-11-20T07:45:00Z', endTime: '2024-11-20T14:25:00Z', stepsCompleted: 6, totalSteps: 6 },
    ],
  },
]

// ─── GET Handler ────────────────────────────────────────────────

export async function GET() {
  const data = {
    success: true as const,
    timestamp: new Date().toISOString(),
    data: {
      workflows,
      summary: {
        total: workflows.length,
        active: workflows.filter(w => w.status === 'Active').length,
        draft: workflows.filter(w => w.status === 'Draft').length,
        archived: workflows.filter(w => w.status === 'Archived').length,
        totalRuns: workflows.reduce((sum, w) => sum + w.totalRuns, 0),
        avgSuccessRate: Math.round(
          workflows.reduce((sum, w) => sum + w.successRate, 0) / workflows.length
        ),
      },
    },
  }

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  })
}
