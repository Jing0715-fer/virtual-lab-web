import { NextResponse } from 'next/server'

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

const teamMembers: TeamMember[] = [
  {
    id: 'tm1', name: 'Dr. Sarah Chen', initials: 'SC', role: 'Principal Investigator',
    department: 'Structural Biology', status: 'online', activityText: 'Active now',
    avatarColor: '#10b981', email: 's.chen@lab.org',
    bio: 'Leading computational nanobody design with 15+ years of structural biology experience.',
    recentContributions: 24,
  },
  {
    id: 'tm2', name: 'Dr. James Park', initials: 'JP', role: 'Computational Biologist',
    department: 'Structural Biology', status: 'online', activityText: 'Active now',
    avatarColor: '#06b6d4', email: 'j.park@lab.org',
    bio: 'Specializes in molecular dynamics simulations and protein-ligand binding analysis.',
    recentContributions: 18,
  },
  {
    id: 'tm3', name: 'Dr. Maria Garcia', initials: 'MG', role: 'ML Engineer',
    department: 'Computational Biology', status: 'away', activityText: 'In a meeting',
    avatarColor: '#8b5cf6', email: 'm.garcia@lab.org',
    bio: 'Developing deep learning models for protein structure prediction and drug design.',
    recentContributions: 31,
  },
  {
    id: 'tm4', name: 'Dr. Wei Zhang', initials: 'WZ', role: 'Bioinformatician',
    department: 'Computational Biology', status: 'online', activityText: 'Active now',
    avatarColor: '#f59e0b', email: 'w.zhang@lab.org',
    bio: 'Expert in next-gen sequencing analysis, variant calling, and genome annotation pipelines.',
    recentContributions: 22,
  },
  {
    id: 'tm5', name: 'Dr. Lisa Wang', initials: 'LW', role: 'Lab Director',
    department: 'Drug Discovery', status: 'offline', activityText: 'Last seen 2h ago',
    avatarColor: '#ec4899', email: 'l.wang@lab.org',
    bio: 'Overseeing virtual screening pipelines and ADMET prediction models for novel therapeutics.',
    recentContributions: 15,
  },
  {
    id: 'tm6', name: 'Dr. David Kim', initials: 'DK', role: 'Medicinal Chemist',
    department: 'Drug Discovery', status: 'online', activityText: 'Active now',
    avatarColor: '#ef4444', email: 'd.kim@lab.org',
    bio: 'Designing and optimizing lead compounds using structure-activity relationship analysis.',
    recentContributions: 19,
  },
]

const threads: Thread[] = [
  {
    id: 'th1', title: 'CRISPR Off-Target Prediction Model v2.3', type: 'Discussion',
    preview: 'Has anyone tested the new off-target scoring function on the HEK293 validation set? I\'m seeing improved specificity but reduced sensitivity at the 3\' end.',
    participantIds: ['tm1', 'tm3', 'tm4'], unreadCount: 3, lastMessageAt: '2m ago',
    createdAt: '2025-01-10T09:00:00Z', isPinned: true, isMuted: false,
    messages: [
      { id: 'msg1', senderId: 'tm3', senderName: 'Dr. Maria Garcia', content: 'Has anyone tested the new off-target scoring function on the HEK293 validation set? I\'m seeing **improved specificity** but reduced sensitivity at the 3\' end.', timestamp: '2m ago', reactions: { '🤔': ['tm1'], '👍': ['tm4'] }, isBookmarked: false },
      { id: 'msg2', senderId: 'tm1', senderName: 'Dr. Sarah Chen', content: 'Yes, I ran it last night. The specificity gain is real — we\'re down from 14% to 8% off-targets on the held-out test set. But the 3\' sensitivity drop is concerning for therapeutic applications.\n\n```\nPrecision: 0.92 (+0.06)\nRecall: 0.84 (-0.08)\nF1: 0.88 (+0.02)\n```', timestamp: '15m ago', reactions: { '🎉': ['tm3', 'tm4'], '💡': ['tm6'] }, isBookmarked: true },
      { id: 'msg3', senderId: 'tm4', senderName: 'Dr. Wei Zhang', content: 'Could we try a weighted ensemble with the old model for the 3\' end predictions? That might preserve sensitivity while keeping the specificity gains in the seed region.', timestamp: '1h ago', reactions: { '👍': ['tm1', 'tm3'] }, isBookmarked: false },
      { id: 'msg4', senderId: 'tm6', senderName: 'Dr. David Kim', content: 'From the drug design perspective, off-target specificity is critical. I\'d prioritize the v2.3 model and flag the 3\' edge cases for manual review in the clinical pipeline.', timestamp: '2h ago', reactions: { '💡': ['tm1'] }, isBookmarked: false },
    ],
  },
  {
    id: 'th2', title: 'Weekly Lab Meeting Agenda — Jan 20', type: 'Update',
    preview: 'Agenda items: 1) Nanobody binding affinity results 2) CRISPR model v2.3 update 3) Drug screening Round 2 progress. Please add your items by EOD Friday.',
    participantIds: ['tm1', 'tm2', 'tm3', 'tm5', 'tm6'], unreadCount: 1, lastMessageAt: '45m ago',
    createdAt: '2025-01-15T14:00:00Z', isPinned: true, isMuted: false,
    messages: [
      { id: 'msg5', senderId: 'tm1', senderName: 'Dr. Sarah Chen', content: '**Weekly Lab Meeting — Monday Jan 20, 10:00 AM**\n\n1. Nanobody binding affinity results (Dr. Park)\n2. CRISPR model v2.3 update (Dr. Garcia)\n3. Drug screening Round 2 progress (Dr. Kim)\n4. Open discussion\n\nPlease add your items by EOD Friday.', timestamp: '45m ago', reactions: { '👍': ['tm2', 'tm3', 'tm5', 'tm6'] }, isBookmarked: false },
    ],
  },
  {
    id: 'th3', title: 'AlphaFold3 Integration for Multi-Chain Complexes', type: 'Question',
    preview: 'We need to decide on the validation strategy for multi-chain predictions. Should we use Cryo-EM density maps or crosslinking mass spec data as ground truth?',
    participantIds: ['tm1', 'tm2', 'tm4'], unreadCount: 0, lastMessageAt: '3h ago',
    createdAt: '2025-01-08T11:30:00Z', isPinned: false, isMuted: false,
    messages: [
      { id: 'msg6', senderId: 'tm2', senderName: 'Dr. James Park', content: 'Question for the team: should we use **Cryo-EM density maps** or **crosslinking mass spec** as ground truth for multi-chain validation?', timestamp: '3h ago', reactions: {}, isBookmarked: false },
      { id: 'msg7', senderId: 'tm4', senderName: 'Dr. Wei Zhang', content: 'Both if possible. Cryo-EM gives better structural resolution for the overall fold, but XL-MS is essential for validating inter-chain contact points.', timestamp: '2h ago', reactions: { '👍': ['tm1', 'tm2'] }, isBookmarked: true },
    ],
  },
  {
    id: 'th4', title: 'Budget Allocation Q2 2025 — Equipment Requests', type: 'Decision',
    preview: 'The committee approved the cryo-EM time allocation. Final vote: 4 for, 1 against, 0 abstain. Dr. Wang will coordinate scheduling with the facility.',
    participantIds: ['tm1', 'tm3', 'tm5', 'tm6'], unreadCount: 0, lastMessageAt: '1d ago',
    createdAt: '2025-01-05T16:00:00Z', isPinned: false, isMuted: false,
    messages: [
      { id: 'msg8', senderId: 'tm5', senderName: 'Dr. Lisa Wang', content: '**Decision finalized**: Cryo-EM time allocation for Q2 2025 is approved.\n\nVote: 4 for, 1 against, 0 abstain\n\nI\'ll coordinate scheduling with the facility by next Wednesday.', timestamp: '1d ago', reactions: { '🎉': ['tm1', 'tm3', 'tm6'] }, isBookmarked: false },
    ],
  },
  {
    id: 'th5', title: 'Novel Pathway Analysis in Alzheimer\'s Model', type: 'Review',
    preview: 'I\'ve uploaded the proteomics data from the longitudinal CSF study. The phospho-tau analysis reveals 3 novel phosphorylation sites not previously reported in literature.',
    participantIds: ['tm4', 'tm5', 'tm6'], unreadCount: 5, lastMessageAt: '5m ago',
    createdAt: '2025-01-12T08:00:00Z', isPinned: false, isMuted: false,
    messages: [
      { id: 'msg9', senderId: 'tm4', senderName: 'Dr. Wei Zhang', content: 'I\'ve uploaded the proteomics data from the longitudinal CSF study. The phospho-tau analysis reveals **3 novel phosphorylation sites** not previously reported in literature. Need review before manuscript submission.', timestamp: '5m ago', reactions: { '❤️': ['tm5'], '💡': ['tm6'] }, isBookmarked: true },
      { id: 'msg10', senderId: 'tm6', senderName: 'Dr. David Kim', content: 'Interesting findings! The S396 and T403 sites are particularly noteworthy given their proximity to the microtubule binding domain. How does this correlate with the cognitive decline trajectory?', timestamp: '20m ago', reactions: {}, isBookmarked: false },
    ],
  },
  {
    id: 'th6', title: 'GPU Cluster Maintenance — Jan 25-26', type: 'Update',
    preview: 'The HPC team will perform scheduled maintenance on the GPU cluster this weekend. All training jobs should be checkpointed by Friday 5pm.',
    participantIds: ['tm1', 'tm2', 'tm3'], unreadCount: 0, lastMessageAt: '4h ago',
    createdAt: '2025-01-16T10:00:00Z', isPinned: false, isMuted: true,
    messages: [
      { id: 'msg11', senderId: 'tm3', senderName: 'Dr. Maria Garcia', content: '**System maintenance notice**: GPU cluster maintenance this weekend (Jan 25-26).\n\nAll training jobs should be **checkpointed by Friday 5 PM**. Estimated downtime: 12 hours.', timestamp: '4h ago', reactions: { '👍': ['tm1', 'tm2'] }, isBookmarked: false },
    ],
  },
]

const sharedResources: SharedResource[] = [
  { id: 'sr1', title: 'Nanobody Binding Affinity Report Q4 2024', type: 'PDF', icon: '📄', uploadedAt: '2 days ago', size: '4.2 MB', uploaderId: 'tm1', uploaderName: 'Dr. Sarah Chen', project: 'Nanobody Design' },
  { id: 'sr2', title: 'CRISPR Off-Target Validation Dataset v3', type: 'Dataset', icon: '📊', uploadedAt: '1 day ago', size: '128 MB', uploaderId: 'tm3', uploaderName: 'Dr. Maria Garcia', project: 'CRISPR-Cas9' },
  { id: 'sr3', title: 'AlphaFold3 Multi-Chain Prediction Pipeline', type: 'Code', icon: '💻', uploadedAt: '3 days ago', size: '2.1 MB', uploaderId: 'tm2', uploaderName: 'Dr. James Park', project: 'Protein Structure' },
  { id: 'sr4', title: 'Drug Screening Round 2 — Hit Compounds', type: 'Result', icon: '🧪', uploadedAt: '5h ago', size: '56 MB', uploaderId: 'tm6', uploaderName: 'Dr. David Kim', project: 'Drug Discovery' },
  { id: 'sr5', title: 'CSF Proteomics Longitudinal Analysis', type: 'Dataset', icon: '📊', uploadedAt: '1 day ago', size: '89 MB', uploaderId: 'tm4', uploaderName: 'Dr. Wei Zhang', project: 'Alzheimer\'s' },
  { id: 'sr6', title: 'CRISPR Guide RNA Training Notebook', type: 'Notebook', icon: '📓', uploadedAt: '4 days ago', size: '15 MB', uploaderId: 'tm3', uploaderName: 'Dr. Maria Garcia', project: 'CRISPR-Cas9' },
  { id: 'sr7', title: 'ADMET Prediction Model — ADMETlab 3.0', type: 'PDF', icon: '📄', uploadedAt: '6h ago', size: '8.7 MB', uploaderId: 'tm5', uploaderName: 'Dr. Lisa Wang', project: 'Drug Discovery' },
  { id: 'sr8', title: 'Single-Cell RNA-Seq Atlas Processing Scripts', type: 'Code', icon: '💻', uploadedAt: '1 week ago', size: '3.4 MB', uploaderId: 'tm4', uploaderName: 'Dr. Wei Zhang', project: 'Gene Expression' },
]

const decisions: TeamDecision[] = [
  {
    id: 'dec1', title: 'Adopt AlphaFold3 for Multi-Chain Predictions',
    description: 'Replace AlphaFold2 with AlphaFold3 for all multi-chain protein complex predictions.',
    date: '2025-01-15', outcome: 'Approved',
    votesFor: 4, votesAgainst: 1, votesAbstain: 0,
    voters: ['Dr. Sarah Chen', 'Dr. James Park', 'Dr. Wei Zhang', 'Dr. Maria Garcia', 'Dr. David Kim'],
    status: 'Pending',
  },
  {
    id: 'dec2', title: 'Budget Allocation for Cryo-EM Time Q2 2025',
    description: 'Allocate 200 hours of cryo-EM facility time for nanobody structural validation.',
    date: '2025-01-14', outcome: 'Approved',
    votesFor: 5, votesAgainst: 0, votesAbstain: 0,
    voters: ['Dr. Sarah Chen', 'Dr. Lisa Wang', 'Dr. James Park', 'Dr. David Kim', 'Dr. Wei Zhang'],
    status: 'Implemented',
  },
  {
    id: 'dec3', title: 'Drug Screening Platform Migration',
    description: 'Migrate from Schrödinger Glide to OpenEye FRED for virtual screening to reduce licensing costs.',
    date: '2025-01-12', outcome: 'Rejected',
    votesFor: 2, votesAgainst: 3, votesAbstain: 0,
    voters: ['Dr. Lisa Wang', 'Dr. David Kim', 'Dr. Sarah Chen', 'Dr. Wei Zhang', 'Dr. Maria Garcia'],
    status: 'Overridden',
  },
  {
    id: 'dec4', title: 'Publish Preprint on CRISPR Off-Target Model',
    description: 'Submit the CRISPR off-target prediction model as a preprint on bioRxiv before journal submission.',
    date: '2025-01-10', outcome: 'Approved',
    votesFor: 4, votesAgainst: 0, votesAbstain: 1,
    voters: ['Dr. Sarah Chen', 'Dr. Maria Garcia', 'Dr. James Park', 'Dr. Wei Zhang', 'Dr. David Kim'],
    status: 'Pending',
  },
  {
    id: 'dec5', title: 'Extend Alzheimer\'s CSF Study by 6 Months',
    description: 'Request IRB extension for longitudinal CSF biomarker collection to include 50 additional participants.',
    date: '2025-01-08', outcome: 'Deferred',
    votesFor: 3, votesAgainst: 1, votesAbstain: 1,
    voters: ['Dr. Wei Zhang', 'Dr. David Kim', 'Dr. Lisa Wang', 'Dr. Sarah Chen', 'Dr. James Park'],
    status: 'Pending',
  },
]

const weeklySummary: WeeklySummary = {
  messages: 47,
  decisions: 3,
  filesShared: 12,
  meetingsScheduled: 5,
  dailyActivity: [
    { day: 'Mon', count: 14 },
    { day: 'Tue', count: 22 },
    { day: 'Wed', count: 18 },
    { day: 'Thu', count: 31 },
    { day: 'Fri', count: 26 },
    { day: 'Sat', count: 8 },
    { day: 'Sun', count: 5 },
  ],
}

// ─── GET Handler ────────────────────────────────────────────────

export async function GET() {
  return NextResponse.json({
    success: true as const,
    timestamp: new Date().toISOString(),
    data: {
      teamMembers,
      threads,
      sharedResources,
      decisions,
      weeklySummary,
    },
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  })
}
