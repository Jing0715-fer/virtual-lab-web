import { NextResponse } from 'next/server'

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

const activities: ActivityItem[] = [
  { id: 'a1', type: 'message', actorId: 'u1', actorName: 'Dr. Sarah Chen', actorInitials: 'SC', actorColor: '#10b981', action: 'posted in', target: 'CRISPR Off-Target Model Discussion', targetLink: '#thread-cr', preview: 'Has anyone tested the new off-target scoring function on the HEK293 validation set? Seeing improved specificity but reduced sensitivity.', relativeTime: 'just now', absoluteTime: '2:34 PM', channel: '#crispr-team', project: 'CRISPR-Cas9', priority: 'high', isMention: true },
  { id: 'a2', type: 'upload', actorId: 'u2', actorName: 'Dr. Maria Garcia', actorInitials: 'MG', actorColor: '#8b5cf6', action: 'uploaded', target: 'CRISPR Off-Target Validation Dataset v3', targetLink: '#file-cr', preview: '128 MB — HEK293 + K562 cell line validation data with ground truth off-target annotations', relativeTime: '2m ago', absoluteTime: '2:32 PM', channel: '#data-sharing', project: 'CRISPR-Cas9', priority: null, isMention: false },
  { id: 'a3', type: 'message', actorId: 'u3', actorName: 'Dr. James Park', actorInitials: 'JP', actorColor: '#06b6d4', action: 'commented on', target: 'AlphaFold3 Multi-Chain Pipeline', targetLink: '#thread-af', preview: 'The pLDDT scores for the interface region are above 90, which gives us confidence in the predicted binding mode.', relativeTime: '5m ago', absoluteTime: '2:29 PM', channel: '#structural-bio', project: 'Protein Structure', priority: 'medium', isMention: false },
  { id: 'a4', type: 'decision', actorId: 'u1', actorName: 'Dr. Sarah Chen', actorInitials: 'SC', actorColor: '#10b981', action: 'decided on', target: 'Adopt AlphaFold3 for Multi-Chain', targetLink: '#dec-af3', preview: 'Vote: 4 for, 1 against. AlphaFold3 will replace AlphaFold2 for all multi-chain protein complex predictions.', relativeTime: '12m ago', absoluteTime: '2:22 PM', channel: '#team-decisions', project: 'Protein Structure', priority: 'high', isMention: true, metadata: { votesFor: 4, votesAgainst: 1, votesAbstain: 0 } },
  { id: 'a5', type: 'upload', actorId: 'u4', actorName: 'Dr. David Kim', actorInitials: 'DK', actorColor: '#ef4444', action: 'uploaded', target: 'Drug Screening Round 2 — Hit Compounds', targetLink: '#file-ds', preview: '56 MB — 47 hit compounds from virtual screen with ADMET scores and docking poses', relativeTime: '18m ago', absoluteTime: '2:16 PM', channel: '#drug-discovery', project: 'Drug Discovery', priority: 'high', isMention: false },
  { id: 'a6', type: 'meeting', actorId: 'u5', actorName: 'Dr. Lisa Wang', actorInitials: 'LW', actorColor: '#ec4899', action: 'scheduled', target: 'Drug Screening Review Meeting', targetLink: '#meeting-ds', preview: 'Monday Jan 20, 2:00 PM — Review Round 2 hit compounds and prioritize for experimental validation', relativeTime: '25m ago', absoluteTime: '2:09 PM', channel: '#meetings', project: 'Drug Discovery', priority: 'medium', isMention: false, metadata: { participantCount: 5, duration: '60min' } },
  { id: 'a7', type: 'review', actorId: 'u6', actorName: 'Dr. Wei Zhang', actorInitials: 'WZ', actorColor: '#f59e0b', action: 'reviewed', target: 'CSF Proteomics Analysis Notebook', targetLink: '#review-csf', preview: 'Excellent analysis. The novel phospho-tau sites (S396, T403, S422) should be highlighted in the manuscript discussion.', relativeTime: '32m ago', absoluteTime: '2:02 PM', channel: '#reviews', project: "Alzheimer's", priority: 'medium', isMention: true, metadata: { rating: 5 } },
  { id: 'a8', type: 'completion', actorId: 'u2', actorName: 'Dr. Maria Garcia', actorInitials: 'MG', actorColor: '#8b5cf6', action: 'completed', target: 'CRISPR Model v2.3 Training Run', targetLink: '#task-cr', preview: 'Training complete — 98.2% accuracy on held-out test set. Model artifacts uploaded to shared storage.', relativeTime: '45m ago', absoluteTime: '1:49 PM', channel: '#pipeline', project: 'CRISPR-Cas9', priority: 'high', isMention: false, metadata: { progress: 100 } },
  { id: 'a9', type: 'message', actorId: 'u3', actorName: 'Dr. James Park', actorInitials: 'JP', actorColor: '#06b6d4', action: 'mentioned you in', target: 'Nanobody Design Sync', targetLink: '#thread-nb', preview: '@you Can you check the RMSD values for the top 5 nanobody candidates against the cryo-EM structure?', relativeTime: '1h ago', absoluteTime: '1:34 PM', channel: '#nanobody-team', project: 'Nanobody Design', priority: 'medium', isMention: true },
  { id: 'a10', type: 'system', actorId: 'sys', actorName: 'System', actorInitials: '', actorColor: '#6b7280', action: 'auto-archived', target: 'GPU Cluster Maintenance Thread', targetLink: '', preview: 'Thread auto-archived after 30 days of inactivity. Archived content remains searchable.', relativeTime: '1h ago', absoluteTime: '1:30 PM', channel: '#system', project: null, priority: null, isMention: false },
  { id: 'a11', type: 'upload', actorId: 'u4', actorName: 'Dr. David Kim', actorInitials: 'DK', actorColor: '#ef4444', action: 'uploaded', target: 'ADMET Prediction Model Report', targetLink: '#file-adm', preview: '8.7 MB — Comprehensive ADMETlab 3.0 predictions for top 200 drug candidates', relativeTime: '1h ago', absoluteTime: '1:28 PM', channel: '#data-sharing', project: 'Drug Discovery', priority: null, isMention: false },
  { id: 'a12', type: 'decision', actorId: 'u5', actorName: 'Dr. Lisa Wang', actorInitials: 'LW', actorColor: '#ec4899', action: 'decided on', target: 'Cryo-EM Time Allocation Q2 2025', targetLink: '#dec-cryo', preview: 'Vote: 5 for, 0 against. 200 hours of cryo-EM facility time approved for nanobody structural validation.', relativeTime: '2h ago', absoluteTime: '12:45 PM', channel: '#team-decisions', project: 'Nanobody Design', priority: 'high', isMention: false, metadata: { votesFor: 5, votesAgainst: 0, votesAbstain: 0 } },
  { id: 'a13', type: 'message', actorId: 'u6', actorName: 'Dr. Wei Zhang', actorInitials: 'WZ', actorColor: '#f59e0b', action: 'posted in', target: 'Gene Expression Analysis', targetLink: '#thread-ge', preview: 'The differential expression analysis identified 342 significantly upregulated genes in the treatment group (FDR < 0.05).', relativeTime: '2h ago', absoluteTime: '12:30 PM', channel: '#genomics', project: 'Gene Expression', priority: null, isMention: false },
  { id: 'a14', type: 'meeting', actorId: 'u1', actorName: 'Dr. Sarah Chen', actorInitials: 'SC', actorColor: '#10b981', action: 'scheduled', target: 'Weekly Lab Meeting — Jan 20', targetLink: '#meeting-weekly', preview: 'Monday 10:00 AM — Agenda: Nanobody results, CRISPR update, Drug screening progress', relativeTime: '2h ago', absoluteTime: '12:15 PM', channel: '#meetings', project: null, priority: 'medium', isMention: false, metadata: { participantCount: 8, duration: '90min' } },
  { id: 'a15', type: 'completion', actorId: 'u3', actorName: 'Dr. James Park', actorInitials: 'JP', actorColor: '#06b6d4', action: 'completed', target: 'Rosetta Scoring Integration', targetLink: '#task-rost', preview: 'Rosetta energy scoring pipeline integrated with AlphaFold3 predictions. Validated on 12 benchmark complexes.', relativeTime: '3h ago', absoluteTime: '11:30 AM', channel: '#pipeline', project: 'Protein Structure', priority: null, isMention: false, metadata: { progress: 100 } },
  { id: 'a16', type: 'review', actorId: 'u1', actorName: 'Dr. Sarah Chen', actorInitials: 'SC', actorColor: '#10b981', action: 'reviewed', target: 'Nanobody Binding Affinity Report', targetLink: '#review-nb', preview: 'The KD values for the top 3 nanobodies are in the sub-nanomolar range. Excellent work — recommend for preprint submission.', relativeTime: '3h ago', absoluteTime: '11:15 AM', channel: '#reviews', project: 'Nanobody Design', priority: 'high', isMention: false, metadata: { rating: 5 } },
  { id: 'a17', type: 'message', actorId: 'u2', actorName: 'Dr. Maria Garcia', actorInitials: 'MG', actorColor: '#8b5cf6', action: 'posted in', target: 'ML Model Performance Tracking', targetLink: '#thread-ml', preview: 'The transformer-based model shows 15% improvement over the CNN baseline on the guide RNA efficacy prediction task.', relativeTime: '4h ago', absoluteTime: '10:30 AM', channel: '#ml-team', project: 'CRISPR-Cas9', priority: null, isMention: false },
  { id: 'a18', type: 'upload', actorId: 'u6', actorName: 'Dr. Wei Zhang', actorInitials: 'WZ', actorColor: '#f59e0b', action: 'uploaded', target: 'CSF Proteomics Longitudinal Dataset', targetLink: '#file-csf', preview: '89 MB — 18-month longitudinal CSF proteomics data from 120 Alzheimer\'s patients', relativeTime: '4h ago', absoluteTime: '10:20 AM', channel: '#data-sharing', project: "Alzheimer's", priority: null, isMention: false },
  { id: 'a19', type: 'decision', actorId: 'u4', actorName: 'Dr. David Kim', actorInitials: 'DK', actorColor: '#ef4444', action: 'decided on', target: 'Drug Screening Platform Migration', targetLink: '#dec-mig', preview: 'Vote: 2 for, 3 against. Schrödinger Glide will remain the primary screening tool. Migration deferred to Q3.', relativeTime: '5h ago', absoluteTime: '9:30 AM', channel: '#team-decisions', project: 'Drug Discovery', priority: 'medium', isMention: false, metadata: { votesFor: 2, votesAgainst: 3, votesAbstain: 0 } },
  { id: 'a20', type: 'message', actorId: 'u5', actorName: 'Dr. Lisa Wang', actorInitials: 'LW', actorColor: '#ec4899', action: 'posted in', target: 'Virtual Screening Results', targetLink: '#thread-vs', preview: 'The virtual screen identified 47 compounds with docking scores below -8.0 kcal/mol. Top 10 show favorable ADMET profiles.', relativeTime: '5h ago', absoluteTime: '9:15 AM', channel: '#drug-discovery', project: 'Drug Discovery', priority: null, isMention: true },
  { id: 'a21', type: 'meeting', actorId: 'u6', actorName: 'Dr. Wei Zhang', actorInitials: 'WZ', actorColor: '#f59e0b', action: 'scheduled', target: 'Genomics Data Review Session', targetLink: '#meeting-gen', preview: 'Tuesday Jan 21, 3:00 PM — Review scRNA-seq atlas progress and plan for remaining tissues', relativeTime: '6h ago', absoluteTime: '8:30 AM', channel: '#meetings', project: 'Gene Expression', priority: null, isMention: false, metadata: { participantCount: 4, duration: '45min' } },
  { id: 'a22', type: 'completion', actorId: 'u4', actorName: 'Dr. David Kim', actorInitials: 'DK', actorColor: '#ef4444', action: 'completed', target: 'ADMET Screening Round 2', targetLink: '#task-adm', preview: 'All 200 compounds screened through ADMETlab 3.0. 156 passed preliminary ADMET filters.', relativeTime: '6h ago', absoluteTime: '8:15 AM', channel: '#pipeline', project: 'Drug Discovery', priority: null, isMention: false, metadata: { progress: 100 } },
  { id: 'a23', type: 'system', actorId: 'sys', actorName: 'System', actorInitials: '', actorColor: '#6b7280', action: 'detected', target: 'New Publication Alert', targetLink: '', preview: 'Nature Methods published "Improved multi-chain protein structure prediction with AlphaFold3" — relevant to your protein structure project.', relativeTime: '7h ago', absoluteTime: '7:30 AM', channel: '#system', project: null, priority: 'low', isMention: false },
  { id: 'a24', type: 'review', actorId: 'u5', actorName: 'Dr. Lisa Wang', actorInitials: 'LW', actorColor: '#ec4899', action: 'reviewed', target: 'ADMETlab 3.0 Validation Report', targetLink: '#review-adm', preview: 'The cross-validation results show strong concordance with experimental ADMET data (R² = 0.87). Solid methodology.', relativeTime: '8h ago', absoluteTime: '6:45 AM', channel: '#reviews', project: 'Drug Discovery', priority: null, isMention: false, metadata: { rating: 4 } },
  { id: 'a25', type: 'message', actorId: 'u1', actorName: 'Dr. Sarah Chen', actorInitials: 'SC', actorColor: '#10b981', action: 'posted in', target: 'Lab Safety Protocols Update', targetLink: '#thread-safe', preview: 'Updated BSL-2 protocols for handling viral vectors. All team members must review and acknowledge by Jan 24.', relativeTime: '9h ago', absoluteTime: '5:30 AM', channel: '#general', project: null, priority: 'high', isMention: false },
  { id: 'a26', type: 'upload', actorId: 'u3', actorName: 'Dr. James Park', actorInitials: 'JP', actorColor: '#06b6d4', action: 'uploaded', target: 'Rosetta Pipeline Integration Scripts', targetLink: '#file-rost', preview: '2.1 MB — Python scripts for Rosetta energy scoring integration with AlphaFold3 outputs', relativeTime: '10h ago', absoluteTime: '4:30 AM', channel: '#code-sharing', project: 'Protein Structure', priority: null, isMention: false },
  { id: 'a27', type: 'decision', actorId: 'u6', actorName: 'Dr. Wei Zhang', actorInitials: 'WZ', actorColor: '#f59e0b', action: 'decided on', target: 'Extend Alzheimer\'s CSF Study', targetLink: '#dec-ad', preview: 'Vote: 3 for, 1 against, 1 abstain. IRB extension request deferred pending additional funding confirmation.', relativeTime: '12h ago', absoluteTime: '2:30 AM', channel: '#team-decisions', project: "Alzheimer's", priority: 'medium', isMention: false, metadata: { votesFor: 3, votesAgainst: 1, votesAbstain: 1 } },
  { id: 'a28', type: 'meeting', actorId: 'u2', actorName: 'Dr. Maria Garcia', actorInitials: 'MG', actorColor: '#8b5cf6', action: 'joined', target: 'ML Pipeline Architecture Review', targetLink: '#meeting-ml', preview: 'Joined the cross-team ML architecture review for model serving infrastructure optimization.', relativeTime: '14h ago', absoluteTime: '12:30 AM', channel: '#meetings', project: null, priority: null, isMention: false, metadata: { participantCount: 12, duration: '120min' } },
  { id: 'a29', type: 'message', actorId: 'u4', actorName: 'Dr. David Kim', actorInitials: 'DK', actorColor: '#ef4444', action: 'posted in', target: 'Compound Library Update', targetLink: '#thread-lib', preview: 'Added 500 new natural product derivatives to the screening library. Library now contains 12,000+ compounds.', relativeTime: '16h ago', absoluteTime: '10:30 PM', channel: '#drug-discovery', project: 'Drug Discovery', priority: null, isMention: false },
  { id: 'a30', type: 'system', actorId: 'sys', actorName: 'System', actorInitials: '', actorColor: '#6b7280', action: 'backed up', target: 'Weekly Data Snapshot', targetLink: '', preview: 'Automated weekly backup completed. 2.4 TB of research data securely archived to cold storage.', relativeTime: '18h ago', absoluteTime: '8:30 PM', channel: '#system', project: null, priority: null, isMention: false },
  { id: 'a31', type: 'completion', actorId: 'u6', actorName: 'Dr. Wei Zhang', actorInitials: 'WZ', actorColor: '#f59e0b', action: 'completed', target: 'Tissue Atlas Processing Batch 5', targetLink: '#task-atlas', preview: 'Batch 5 of the single-cell RNA-seq atlas complete. 8 new tissue types processed and QC-passed.', relativeTime: '20h ago', absoluteTime: '6:30 PM', channel: '#pipeline', project: 'Gene Expression', priority: null, isMention: false, metadata: { progress: 100 } },
  { id: 'a32', type: 'message', actorId: 'u3', actorName: 'Dr. James Park', actorInitials: 'JP', actorColor: '#06b6d4', action: 'posted in', target: 'Structural Validation Results', targetLink: '#thread-struct', preview: 'Cryo-EM density maps for the nanobody-antigen complex show excellent fit (CCmask = 0.89).', relativeTime: '22h ago', absoluteTime: '4:30 PM', channel: '#structural-bio', project: 'Nanobody Design', priority: null, isMention: false },
  { id: 'a33', type: 'review', actorId: 'u2', actorName: 'Dr. Maria Garcia', actorInitials: 'MG', actorColor: '#8b5cf6', action: 'reviewed', target: 'CRISPR Guide RNA Training Notebook', targetLink: '#review-grna', preview: 'Well-structured notebook. Suggest adding hyperparameter sensitivity analysis and cross-cell-line validation.', relativeTime: '1d ago', absoluteTime: 'Yesterday 3:15 PM', channel: '#reviews', project: 'CRISPR-Cas9', priority: null, isMention: false, metadata: { rating: 4 } },
]

const analyticsBreakdown: AnalyticsBreakdown[] = [
  { type: 'Messages', count: 142, color: '#3b82f6' },
  { type: 'Decisions', count: 18, color: '#f59e0b' },
  { type: 'Uploads', count: 67, color: '#8b5cf6' },
  { type: 'Meetings', count: 24, color: '#10b981' },
  { type: 'Reviews', count: 31, color: '#06b6d4' },
  { type: 'Completions', count: 45, color: '#22c55e' },
]

const topContributors: TopContributor[] = [
  { name: 'Dr. Sarah Chen', initials: 'SC', color: '#10b981', count: 89 },
  { name: 'Dr. Maria Garcia', initials: 'MG', color: '#8b5cf6', count: 76 },
  { name: 'Dr. Wei Zhang', initials: 'WZ', color: '#f59e0b', count: 64 },
  { name: 'Dr. James Park', initials: 'JP', color: '#06b6d4', count: 58 },
  { name: 'Dr. David Kim', initials: 'DK', color: '#ef4444', count: 47 },
]

// Generate 7x24 heatmap data
function generateHeatmap(): number[][] {
  const heatmap: number[][] = []
  for (let d = 0; d < 7; d++) {
    const row: number[] = []
    for (let h = 0; h < 24; h++) {
      // Simulate realistic activity patterns
      let base = 0
      if (h >= 9 && h <= 17) base = 5 + Math.floor(Math.random() * 8) // Work hours
      else if (h >= 7 && h < 9 || h > 17 && h <= 20) base = 1 + Math.floor(Math.random() * 4) // Early/late
      else base = Math.floor(Math.random() * 2) // Off hours
      if (d >= 1 && d <= 5) base = Math.round(base * 1.5) // Weekday boost
      row.push(base)
    }
    heatmap.push(row)
  }
  return heatmap
}

const peakHoursHeatmap: number[][] = generateHeatmap()

const velocityData: VelocityPoint[] = [
  { day: 'Mon', count: 42 },
  { day: 'Tue', count: 58 },
  { day: 'Wed', count: 51 },
  { day: 'Thu', count: 67 },
  { day: 'Fri', count: 62 },
  { day: 'Sat', count: 18 },
  { day: 'Sun', count: 12 },
]

// ─── GET Handler ────────────────────────────────────────────────

export async function GET() {
  return NextResponse.json({
    success: true as const,
    timestamp: new Date().toISOString(),
    data: {
      activities,
      analyticsBreakdown,
      topContributors,
      peakHoursHeatmap,
      velocityData,
      mentionCount: activities.filter(a => a.isMention).length,
    },
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  })
}
