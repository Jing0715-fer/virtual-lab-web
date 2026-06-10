import { NextResponse } from 'next/server'

// ─── Types ──────────────────────────────────────────────────────

interface TeamMember {
  id: string
  name: string
  role: string
  avatar: string
}

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

interface ImpactMetric {
  label: string
  value: number
  change: number
  sparkline: number[]
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

// ─── Mock Data ──────────────────────────────────────────────────

const projects: ResearchProject[] = [
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
    id: 'p7', title: "Alzheimer's Biomarker Discovery",
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

const impactMetrics: ImpactMetric[] = [
  { label: 'Publications', value: 18, change: 12.5, sparkline: [2, 3, 2, 4, 3, 5, 4, 6, 5, 7, 6, 8] },
  { label: 'Citations', value: 342, change: 28.3, sparkline: [15, 22, 28, 35, 42, 38, 50, 55, 62, 70, 78, 90] },
  { label: 'Impact Factor', value: 24.7, change: 5.8, sparkline: [18, 19, 19.5, 20, 21, 21.5, 22, 22.5, 23, 23.5, 24, 24.7] },
  { label: 'Active Collaborations', value: 12, change: -3.2, sparkline: [8, 9, 10, 11, 12, 13, 12, 14, 13, 12, 11, 12] },
]

const velocityData: VelocityDataPoint[] = [
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

const milestones: Milestone[] = [
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

const collabNodes: CollabNode[] = [
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

const collabEdges: CollabEdge[] = [
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

const fundingData: FundingAllocation[] = [
  { project: 'Drug Discovery', amount: 620000, color: '#8b5cf6' },
  { project: 'Nanobody Design', amount: 450000, color: '#10b981' },
  { project: "Alzheimer's", amount: 510000, color: '#14b8a6' },
  { project: 'Structural Bio', amount: 380000, color: '#06b6d4' },
  { project: 'Synthetic Bio', amount: 420000, color: '#a855f7' },
  { project: 'Gene Editing', amount: 340000, color: '#ef4444' },
  { project: 'Genomics', amount: 290000, color: '#f59e0b' },
  { project: 'Metagenomics', amount: 280000, color: '#ec4899' },
]

// ─── GET Handler ────────────────────────────────────────────────

export async function GET() {
  const data = {
    success: true as const,
    timestamp: new Date().toISOString(),
    data: {
      projects,
      impactMetrics,
      velocityData,
      milestones,
      collaboration: {
        nodes: collabNodes,
        edges: collabEdges,
        departments: {
          'Structural Biology': '#10b981',
          'Computational Biology': '#06b6d4',
          'Drug Discovery': '#8b5cf6',
          'Genomics': '#f59e0b',
          'Gene Editing': '#ef4444',
          'Bioinformatics': '#ec4899',
          'Neuroscience': '#14b8a6',
          'Synthetic Biology': '#a855f7',
        },
      },
      funding: fundingData,
      quickStats: {
        activeProjects: projects.filter(p => p.status === 'active').length,
        milestonesThisMonth: milestones.filter(m => m.date.startsWith('2025-01')).length,
        onTimeRate: Math.round(
          (milestones.filter(m => m.status === 'completed').length / milestones.length) * 100
        ),
        totalProjects: projects.length,
        totalBudget: projects.reduce((sum, p) => sum + p.budget, 0),
        totalPublications: projects.reduce((sum, p) => sum + p.publications, 0),
      },
    },
  }

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  })
}
