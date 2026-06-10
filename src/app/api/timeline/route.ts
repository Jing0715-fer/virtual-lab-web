import { NextRequest, NextResponse } from 'next/server'

// ============================================================
// Types
// ============================================================

export interface TimelineEvent {
  id: string
  type: TimelineEventType
  title: string
  description: string
  timestamp: string
  agentIds: string[]
  agentNames: string[]
  meetingId?: string
  meetingName?: string
  priority: EventPriority
  tags: string[]
}

export interface MilestoneEvent extends TimelineEvent {
  targetDate: string
  actualDate?: string
  milestoneStatus: MilestoneStatus
  progress: number
  dependencies: string[]
}

export interface ChangelogEntry {
  id: string
  version: string
  date: string
  author: string
  category: ChangelogCategory
  title: string
  description: string
  relatedItems: string[]
}

type TimelineEventType =
  | 'meeting_created'
  | 'meeting_completed'
  | 'agent_added'
  | 'experiment_started'
  | 'experiment_completed'
  | 'note_created'
  | 'key_decision'
  | 'milestone'
  | 'publication'
  | 'review_submitted'

type EventPriority = 'normal' | 'important' | 'critical'

type MilestoneStatus = 'on_track' | 'at_risk' | 'delayed' | 'completed'

type ChangelogCategory =
  | 'feature'
  | 'fix'
  | 'enhancement'
  | 'refactor'
  | 'documentation'
  | 'performance'
  | 'security'
  | 'breaking_change'

// ============================================================
// In-memory store (auto-seeded)
// ============================================================

let timelineEvents: (TimelineEvent | MilestoneEvent)[] = []
let changelogEntries: ChangelogEntry[] = []
let seeded = false

// ─── Seed Helpers ───────────────────────────────────────────
const AGENT_NAMES = [
  'Alpha-Research', 'Beta-Analysis', 'Gamma-Synthesis', 'Delta-Review', 'Epsilon-Data',
  'Zeta-Validation', 'Eta-Design', 'Theta-Integration'
]

function daysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0, 0)
  return d.toISOString()
}

function seedEvents(): (TimelineEvent | MilestoneEvent)[] {
  return [
    {
      id: 'evt-001', type: 'meeting_created', title: 'Research Kickoff Meeting',
      description: 'Initial kickoff meeting to establish research objectives and assign roles to all team agents.',
      timestamp: daysAgo(59), agentIds: ['a1', 'a2', 'a3'], agentNames: ['Alpha-Research', 'Beta-Analysis', 'Gamma-Synthesis'],
      priority: 'critical', tags: ['kickoff', 'planning']
    },
    {
      id: 'evt-002', type: 'agent_added', title: 'Delta-Review Agent Onboarded',
      description: 'Added Delta-Review agent to the research team for critical analysis and literature review.',
      timestamp: daysAgo(58), agentIds: ['a4'], agentNames: ['Delta-Review'],
      priority: 'normal', tags: ['onboarding', 'team']
    },
    {
      id: 'evt-003', type: 'experiment_started', title: 'Protein Folding Experiment Initiated',
      description: 'Started computational protein folding experiment using ensemble simulation approach.',
      timestamp: daysAgo(56), agentIds: ['a1', 'a5'], agentNames: ['Alpha-Research', 'Epsilon-Data'],
      meetingId: 'm-001', meetingName: 'Experiment Planning', priority: 'important', tags: ['protein', 'simulation']
    },
    {
      id: 'evt-004', type: 'note_created', title: 'Methodology Notes: Monte Carlo Sampling',
      description: 'Documented the Monte Carlo sampling methodology for the folding experiment.',
      timestamp: daysAgo(55), agentIds: ['a1'], agentNames: ['Alpha-Research'],
      priority: 'normal', tags: ['methodology', 'notes']
    },
    {
      id: 'evt-005', type: 'key_decision', title: 'Adopted Multi-Scale Modeling Approach',
      description: 'Decided to integrate molecular dynamics with coarse-grained models for improved accuracy.',
      timestamp: daysAgo(53), agentIds: ['a1', 'a2', 'a3'], agentNames: ['Alpha-Research', 'Beta-Analysis', 'Gamma-Synthesis'],
      meetingId: 'm-002', meetingName: 'Technical Review', priority: 'critical', tags: ['decision', 'methodology']
    },
    {
      id: 'evt-006', type: 'milestone', title: 'Phase 1: Data Collection Complete',
      description: 'Completed initial data collection phase with 2.4M structural predictions.',
      timestamp: daysAgo(50), agentIds: ['a1', 'a5'], agentNames: ['Alpha-Research', 'Epsilon-Data'],
      priority: 'important', tags: ['milestone', 'data'],
      targetDate: daysAgo(52), actualDate: daysAgo(50),
      milestoneStatus: 'completed', progress: 100, dependencies: []
    },
    {
      id: 'evt-007', type: 'meeting_completed', title: 'Weekly Progress Review — Week 2',
      description: 'Reviewed progress on Phase 1. Discussed data normalization challenges.',
      timestamp: daysAgo(48), agentIds: ['a1', 'a2', 'a4'], agentNames: ['Alpha-Research', 'Beta-Analysis', 'Delta-Review'],
      meetingId: 'm-003', meetingName: 'Weekly Sync', priority: 'normal', tags: ['weekly', 'review']
    },
    {
      id: 'evt-008', type: 'agent_added', title: 'Zeta-Validation Agent Joined',
      description: 'Onboarded Zeta-Validation for cross-validation and statistical analysis.',
      timestamp: daysAgo(46), agentIds: ['a6'], agentNames: ['Zeta-Validation'],
      priority: 'normal', tags: ['onboarding', 'validation']
    },
    {
      id: 'evt-009', type: 'experiment_completed', title: 'Protein Folding Phase 1 Complete',
      description: 'Successfully completed Phase 1 with 94.2% accuracy on validation set.',
      timestamp: daysAgo(44), agentIds: ['a1', 'a5', 'a6'], agentNames: ['Alpha-Research', 'Epsilon-Data', 'Zeta-Validation'],
      priority: 'critical', tags: ['completed', 'protein']
    },
    {
      id: 'evt-010', type: 'publication', title: 'Pre-print: Multi-Scale Protein Folding',
      description: 'Submitted pre-print to bioRxiv covering the multi-scale approach and Phase 1 results.',
      timestamp: daysAgo(42), agentIds: ['a1', 'a2', 'a3'], agentNames: ['Alpha-Research', 'Beta-Analysis', 'Gamma-Synthesis'],
      priority: 'important', tags: ['publication', 'pre-print']
    },
    {
      id: 'evt-011', type: 'note_created', title: 'Observation: Anomalous Binding Patterns',
      description: 'Discovered anomalous binding patterns in the C-terminal region with possible drug design implications.',
      timestamp: daysAgo(40), agentIds: ['a2'], agentNames: ['Beta-Analysis'],
      priority: 'important', tags: ['observation', 'binding']
    },
    {
      id: 'evt-012', type: 'key_decision', title: 'Pivot to Focus on C-Terminal Region',
      description: 'Decided to pivot Phase 2 focus to C-terminal binding region based on anomalous findings.',
      timestamp: daysAgo(38), agentIds: ['a1', 'a2', 'a3', 'a4'], agentNames: AGENT_NAMES.slice(0, 4),
      priority: 'critical', tags: ['pivot', 'decision']
    },
    {
      id: 'evt-013', type: 'experiment_started', title: 'C-Terminal Binding Assay',
      description: 'Initiated targeted binding assays for the C-terminal region.',
      timestamp: daysAgo(36), agentIds: ['a2', 'a3'], agentNames: ['Beta-Analysis', 'Gamma-Synthesis'],
      priority: 'important', tags: ['binding', 'assay']
    },
    {
      id: 'evt-014', type: 'review_submitted', title: 'Peer Review: Protein Folding Pre-print',
      description: 'Received peer review feedback from 3 reviewers. Overall positive with minor suggestions.',
      timestamp: daysAgo(34), agentIds: ['a4', 'a6'], agentNames: ['Delta-Review', 'Zeta-Validation'],
      priority: 'important', tags: ['review', 'feedback']
    },
    {
      id: 'evt-015', type: 'milestone', title: 'Phase 2: Binding Analysis 50% Complete',
      description: 'Reached 50% completion. Preliminary results show 3 novel binding sites.',
      timestamp: daysAgo(27), agentIds: ['a2', 'a3'], agentNames: ['Beta-Analysis', 'Gamma-Synthesis'],
      priority: 'important', tags: ['milestone', 'binding'],
      targetDate: daysAgo(25), milestoneStatus: 'at_risk', progress: 50, dependencies: ['evt-006']
    },
    {
      id: 'evt-016', type: 'experiment_completed', title: 'Neural Network Training Complete',
      description: 'Training complete. Model achieves 97.1% accuracy on held-out test set.',
      timestamp: daysAgo(16), agentIds: ['a1', 'a5'], agentNames: ['Alpha-Research', 'Epsilon-Data'],
      priority: 'important', tags: ['ml', 'complete']
    },
    {
      id: 'evt-017', type: 'milestone', title: 'Phase 2: Binding Analysis Complete',
      description: 'All binding analysis complete. Identified 3 novel sites with high-confidence scores.',
      timestamp: daysAgo(14), agentIds: ['a2', 'a3', 'a6'], agentNames: ['Beta-Analysis', 'Gamma-Synthesis', 'Zeta-Validation'],
      priority: 'critical', tags: ['milestone', 'phase2'],
      targetDate: daysAgo(15), actualDate: daysAgo(14),
      milestoneStatus: 'completed', progress: 100, dependencies: ['evt-015']
    },
    {
      id: 'evt-018', type: 'agent_added', title: 'Theta-Integration Agent Onboarded',
      description: 'Added Theta-Integration for pipeline integration and automation workflows.',
      timestamp: daysAgo(11), agentIds: ['a8'], agentNames: ['Theta-Integration'],
      priority: 'normal', tags: ['onboarding', 'integration']
    },
    {
      id: 'evt-019', type: 'experiment_started', title: 'Phase 3: Drug Candidate Screening',
      description: 'Initiated screening of 10K drug candidates against 3 novel binding sites.',
      timestamp: daysAgo(10), agentIds: ['a1', 'a5', 'a8'], agentNames: ['Alpha-Research', 'Epsilon-Data', 'Theta-Integration'],
      priority: 'critical', tags: ['drug-screening', 'phase3']
    },
    {
      id: 'evt-020', type: 'key_decision', title: 'Selected Top 50 Candidates for Testing',
      description: 'Narrowed from 10K to top 50 candidates based on binding affinity and ADMET properties.',
      timestamp: daysAgo(8), agentIds: ['a1', 'a2', 'a5'], agentNames: ['Alpha-Research', 'Beta-Analysis', 'Epsilon-Data'],
      priority: 'important', tags: ['candidates', 'selection']
    },
    {
      id: 'evt-021', type: 'publication', title: 'Conference Paper: Drug Screening Pipeline',
      description: 'Accepted for presentation at ICML 2025.',
      timestamp: daysAgo(1), agentIds: ['a1', 'a2', 'a5'], agentNames: ['Alpha-Research', 'Beta-Analysis', 'Epsilon-Data'],
      priority: 'important', tags: ['conference', 'icml']
    },
    {
      id: 'evt-022', type: 'experiment_started', title: 'Wet-Lab Validation: Batch 1',
      description: 'Started wet-lab validation for first batch of 7 top candidates.',
      timestamp: daysAgo(0), agentIds: ['a3', 'a6'], agentNames: ['Gamma-Synthesis', 'Zeta-Validation'],
      priority: 'critical', tags: ['wet-lab', 'validation']
    },
    {
      id: 'evt-023', type: 'milestone', title: 'Phase 3: Full Screening Target',
      description: 'Target: Complete full candidate screening by end of current sprint.',
      timestamp: daysAgo(0), agentIds: ['a1', 'a5', 'a8'], agentNames: ['Alpha-Research', 'Epsilon-Data', 'Theta-Integration'],
      priority: 'important', tags: ['milestone', 'target'],
      targetDate: daysAgo(-2), milestoneStatus: 'on_track', progress: 85, dependencies: ['evt-017']
    }
  ]
}

function seedChangelog(): ChangelogEntry[] {
  const changes: Array<{ ver: string; date: string; cat: ChangelogCategory; title: string; desc: string; author: string }> = [
    { ver: 'v1.0', date: '2024-01-15', cat: 'feature', title: 'Initial Release: Core Research Platform', desc: 'First release with multi-agent collaboration, meeting system, experiment tracking, and i18n support.', author: 'Dr. A. Chen' },
    { ver: 'v1.0', date: '2024-01-15', cat: 'documentation', title: 'Setup Guide & API Reference', desc: 'Comprehensive documentation for installation, API, agent configuration, and meetings.', author: 'Dr. M. Smith' },
    { ver: 'v1.1', date: '2024-02-10', cat: 'feature', title: 'Knowledge Graph Integration', desc: 'Interactive knowledge graph with force-directed layout, search, and filtering.', author: 'Dr. L. Kim' },
    { ver: 'v1.1', date: '2024-02-10', cat: 'fix', title: 'Fix Meeting Timestamp Synchronization', desc: 'Resolved timezone offset issue. All times stored in UTC, converted on display.', author: 'Dr. R. Johnson' },
    { ver: 'v1.2', date: '2024-03-05', cat: 'feature', title: 'Experiment Tracker & Pipeline System', desc: 'Pipeline editor, lifecycle management, and result versioning.', author: 'Dr. A. Chen' },
    { ver: 'v1.2', date: '2024-03-05', cat: 'performance', title: 'Optimize Message Rendering by 40%', desc: 'Virtual scrolling, chunking, markdown caching, 60% DOM reduction.', author: 'Dr. S. Williams' },
    { ver: 'v1.2', date: '2024-03-05', cat: 'enhancement', title: 'Enhanced Agent Skill System', desc: 'Skill trees, XP/leveling, badges, achievements, dependency management.', author: 'Prof. Y. Park' },
    { ver: 'v1.3', date: '2024-04-02', cat: 'feature', title: 'Meeting Analytics Dashboard', desc: 'Participation stats, topic distribution, sentiment analysis, efficiency scores.', author: 'Dr. H. Suzuki' },
    { ver: 'v1.3', date: '2024-04-02', cat: 'fix', title: 'Fix Data Persistence Race Condition', desc: 'Queue-based write system for concurrent agent saves.', author: 'Dr. L. Kim' },
    { ver: 'v1.3', date: '2024-04-02', cat: 'refactor', title: 'Refactor Agent Communication Layer', desc: 'RPC to message queue migration with priority routing and retry.', author: 'Prof. K. Tanaka' },
    { ver: 'v1.4', date: '2024-05-10', cat: 'feature', title: 'Research Notes Enhancement Suite', desc: 'Rich markdown, note linking, tag org, templates, collaborative editing.', author: 'Dr. M. Smith' },
    { ver: 'v1.4', date: '2024-05-10', cat: 'security', title: 'Authentication & Access Control', desc: 'API key auth, RBAC, session management, rate limiting, input sanitization.', author: 'Dr. R. Johnson' },
    { ver: 'v1.4', date: '2024-05-10', cat: 'performance', title: 'Reduce Bundle Size by 35%', desc: 'Code splitting, lazy loading, tree-shaking. Load time 3.2s → 2.1s.', author: 'Dr. A. Chen' },
    { ver: 'v1.5', date: '2024-06-15', cat: 'feature', title: 'Visualization Gallery', desc: 'Treemap, network, Sankey, scatter, force graph — all pure SVG.', author: 'Prof. Y. Park' },
    { ver: 'v1.5', date: '2024-06-15', cat: 'breaking_change', title: 'BREAKING: Meeting API v2', desc: 'Renamed fields, new endpoints. v1 deprecated Aug 1.', author: 'Dr. S. Williams' },
    { ver: 'v1.6', date: '2024-07-20', cat: 'feature', title: 'Citation Generator & References', desc: 'APA/MLA/Chicago/IEEE citations, reference library, BibTeX, DOI linking.', author: 'Dr. H. Suzuki' },
    { ver: 'v1.6', date: '2024-07-20', cat: 'enhancement', title: 'Enhanced Export System', desc: 'PDF templates, DOCX, PPTX, batch export, cloud storage.', author: 'Dr. L. Kim' },
    { ver: 'v1.6', date: '2024-07-20', cat: 'documentation', title: 'Updated API Documentation', desc: 'Examples, playground, WebSocket docs, error codes, rate limits.', author: 'Prof. K. Tanaka' },
    { ver: 'v1.7', date: '2024-08-25', cat: 'feature', title: 'Research Timeline & Changelog', desc: 'Chronological timeline, milestone tracking, version history, SVG charts.', author: 'Dr. A. Chen' },
    { ver: 'v1.7.1', date: '2024-09-08', cat: 'fix', title: 'Fix Memory Leak in Chat Panel', desc: 'WebSocket cleanup on unmount. useEffect return handlers added.', author: 'Dr. M. Smith' },
    { ver: 'v1.7.2', date: '2024-09-22', cat: 'performance', title: 'Optimize Scroll Performance', desc: 'Intersection observer, will-change, memoization, less layout thrashing.', author: 'Dr. S. Williams' },
    { ver: 'v1.7.2', date: '2024-09-22', cat: 'refactor', title: 'CSS Custom Properties Migration', desc: 'All styles to --vl-* custom properties. Unified color system.', author: 'Dr. H. Suzuki' },
    { ver: 'v1.7.3', date: '2024-10-05', cat: 'feature', title: 'Version Comparison & Diff View', desc: 'Side-by-side version comparison with categorized diff view.', author: 'Dr. A. Chen' },
    { ver: 'v1.7.3', date: '2024-10-05', cat: 'security', title: 'Sanitize Markdown Input', desc: 'Server-side XSS prevention. Blocks scripts and unwanted HTML.', author: 'Dr. L. Kim' }
  ]

  return changes.map((c, idx) => ({
    id: `cl-${String(idx + 1).padStart(3, '0')}`,
    version: c.ver,
    date: c.date,
    author: c.author,
    category: c.cat,
    title: c.title,
    description: c.desc,
    relatedItems: [`#${idx + 1}`]
  }))
}

function ensureSeeded(): void {
  if (!seeded) {
    timelineEvents = seedEvents()
    changelogEntries = seedChangelog()
    seeded = true
  }
}

function isMilestone(ev: TimelineEvent | MilestoneEvent): ev is MilestoneEvent {
  return ev.type === 'milestone' && 'milestoneStatus' in ev
}

// ============================================================
// GET /api/timeline
// ============================================================

export async function GET(request: NextRequest) {
  try {
    ensureSeeded()

    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('mode')

    if (mode === 'milestones') return handleMilestones(request)
    if (mode === 'changelog') return handleChangelog(request)
    if (mode === 'stats') return handleStats()

    // Default: list events with filters
    const type = searchParams.get('type')
    const agent = searchParams.get('agent')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const search = searchParams.get('search')
    const priority = searchParams.get('priority')

    let filtered = [...timelineEvents]

    if (type) {
      filtered = filtered.filter(e => e.type === type)
    }
    if (agent) {
      const q = agent.toLowerCase()
      filtered = filtered.filter(e => e.agentNames.some(n => n.toLowerCase().includes(q)))
    }
    if (dateFrom) {
      filtered = filtered.filter(e => e.timestamp >= dateFrom)
    }
    if (dateTo) {
      filtered = filtered.filter(e => e.timestamp <= dateTo)
    }
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.tags.some(t => t.toLowerCase().includes(q))
      )
    }
    if (priority) {
      filtered = filtered.filter(e => e.priority === priority)
    }

    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json({
      events: filtered,
      total: filtered.length,
      milestones: filtered.filter(isMilestone).length
    })
  } catch (error) {
    console.error('Failed to fetch timeline:', error)
    return NextResponse.json({ error: 'Failed to fetch timeline' }, { status: 500 })
  }
}

// ============================================================
// POST /api/timeline
// ============================================================

export async function POST(request: NextRequest) {
  try {
    ensureSeeded()

    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('mode')

    if (mode === 'changelog') return handleCreateChangelog(request)

    const body = await request.json()

    const baseEvent: TimelineEvent = {
      id: `evt-${Date.now()}`,
      type: body.type || 'note_created',
      title: body.title || 'Untitled Event',
      description: body.description || '',
      timestamp: body.timestamp || new Date().toISOString(),
      agentIds: body.agentIds || [],
      agentNames: body.agentNames || [],
      meetingId: body.meetingId,
      meetingName: body.meetingName,
      priority: body.priority || 'normal',
      tags: body.tags || []
    }

    let newEvent: TimelineEvent | MilestoneEvent = baseEvent

    if (body.type === 'milestone') {
      const msEvent: MilestoneEvent = {
        ...baseEvent,
        targetDate: body.targetDate || baseEvent.timestamp,
        actualDate: body.actualDate,
        milestoneStatus: body.milestoneStatus || 'on_track',
        progress: body.progress || 0,
        dependencies: body.dependencies || []
      }
      newEvent = msEvent
    }

    timelineEvents.unshift(newEvent)
    return NextResponse.json({ event: newEvent }, { status: 201 })
  } catch (error) {
    console.error('Failed to create event:', error)
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
  }
}

// ============================================================
// PUT /api/timeline?id=<id>
// ============================================================

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Missing event id' }, { status: 400 })
    }

    const body = await request.json()
    const index = timelineEvents.findIndex(e => e.id === id)
    if (index === -1) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    timelineEvents[index] = {
      ...timelineEvents[index],
      ...body,
      id: timelineEvents[index].id
    }

    return NextResponse.json({ event: timelineEvents[index] })
  } catch (error) {
    console.error('Failed to update event:', error)
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 })
  }
}

// ============================================================
// DELETE /api/timeline?id=<id>
// ============================================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Missing event id' }, { status: 400 })
    }

    const index = timelineEvents.findIndex(e => e.id === id)
    if (index === -1) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    timelineEvents.splice(index, 1)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete event:', error)
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 })
  }
}

// ============================================================
// GET /api/timeline?mode=milestones
// ============================================================

function handleMilestones(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  const milestones = timelineEvents.filter(isMilestone)

  let filtered = milestones
  if (status) {
    filtered = milestones.filter(m => m.milestoneStatus === status)
  }

  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return NextResponse.json({
    milestones: filtered,
    total: filtered.length,
    completed: filtered.filter(m => m.milestoneStatus === 'completed').length,
    pending: filtered.filter(m => m.milestoneStatus !== 'completed').length
  })
}

// ============================================================
// GET /api/timeline?mode=changelog
// ============================================================

function handleChangelog(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const version = searchParams.get('version')
  const search = searchParams.get('search')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')

  let filtered = [...changelogEntries]

  if (category) {
    filtered = filtered.filter(e => e.category === category)
  }
  if (version) {
    filtered = filtered.filter(e => e.version === version)
  }
  if (search) {
    const q = search.toLowerCase()
    filtered = filtered.filter(e =>
      e.title.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q)
    )
  }
  if (dateFrom) {
    filtered = filtered.filter(e => e.date >= dateFrom)
  }
  if (dateTo) {
    filtered = filtered.filter(e => e.date <= dateTo)
  }

  filtered.sort((a, b) => {
    const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime()
    if (dateDiff !== 0) return dateDiff
    return b.version.localeCompare(a.version)
  })

  return NextResponse.json({
    entries: filtered,
    total: filtered.length
  })
}

// ============================================================
// POST /api/timeline?mode=changelog
// ============================================================

async function handleCreateChangelog(request: NextRequest) {
  const body = await request.json()

  const newEntry: ChangelogEntry = {
    id: `cl-${Date.now()}`,
    version: body.version || 'v1.0',
    date: body.date || new Date().toISOString().split('T')[0],
    author: body.author || 'Unknown',
    category: body.category || 'feature',
    title: body.title || 'Untitled Change',
    description: body.description || '',
    relatedItems: body.relatedItems || []
  }

  changelogEntries.unshift(newEntry)
  return NextResponse.json({ entry: newEntry }, { status: 201 })
}

// ============================================================
// GET /api/timeline?mode=stats
// ============================================================

function handleStats() {
  const totalEvents = timelineEvents.length
  const milestones = timelineEvents.filter(isMilestone)
  const completedMilestones = milestones.filter(m => m.milestoneStatus === 'completed').length
  const pendingMilestones = milestones.length - completedMilestones

  const typeCounts: Record<string, number> = {}
  timelineEvents.forEach(e => {
    typeCounts[e.type] = (typeCounts[e.type] || 0) + 1
  })

  const priorityCounts: Record<string, number> = { normal: 0, important: 0, critical: 0 }
  timelineEvents.forEach(e => {
    priorityCounts[e.priority] = (priorityCounts[e.priority] || 0) + 1
  })

  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const thisWeek = timelineEvents.filter(e => new Date(e.timestamp) >= weekStart)

  const activeAgents = new Set<string>()
  timelineEvents.forEach(e => e.agentNames.forEach(n => activeAgents.add(n)))

  const milestoneProgress = milestones.length > 0
    ? Math.round(milestones.reduce((s, m) => s + m.progress, 0) / milestones.length)
    : 0

  // Changelog stats
  const changelogCategoryCounts: Record<string, number> = {}
  changelogEntries.forEach(e => {
    changelogCategoryCounts[e.category] = (changelogCategoryCounts[e.category] || 0) + 1
  })

  const uniqueVersions = new Set(changelogEntries.map(e => e.version))

  return NextResponse.json({
    timeline: {
      totalEvents,
      thisWeek: thisWeek.length,
      milestones: {
        total: milestones.length,
        completed: completedMilestones,
        pending: pendingMilestones,
        avgProgress: milestoneProgress
      },
      typeCounts,
      priorityCounts,
      activeAgents: activeAgents.size
    },
    changelog: {
      totalEntries: changelogEntries.length,
      uniqueVersions: uniqueVersions.size,
      categoryCounts: changelogCategoryCounts
    }
  })
}
