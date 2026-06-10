'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Calendar, Clock, Users, Bot, FlaskConical, FileText,
  Flag, Trophy, BookOpen, MessageSquareText, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight, Plus, X, Download, Search, Filter,
  Target, Zap, Link2, Tag, AlertTriangle, CheckCircle2,
  CircleDot, ArrowUpDown, CalendarDays, TrendingUp, BarChart3,
  Hash, Star
} from 'lucide-react'
import type { Lang } from '@/lib/i18n'

// ─── Types ────────────────────────────────────────────────────
export type TimelineEventType =
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

export type EventPriority = 'normal' | 'important' | 'critical'

export type MilestoneStatus = 'on_track' | 'at_risk' | 'delayed' | 'completed'

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
  isExpanded?: boolean
}

export interface MilestoneEvent extends TimelineEvent {
  targetDate: string
  actualDate?: string
  milestoneStatus: MilestoneStatus
  progress: number
  dependencies: string[]
}

export type DateRange = 'today' | 'this_week' | 'this_month' | 'this_quarter' | 'all_time' | 'custom'

// ─── Constants ────────────────────────────────────────────────
const STORAGE_KEY = 'vl-research-timeline'

const EVENT_TYPE_CONFIG: Record<TimelineEventType, {
  label: string
  color: string
  icon: React.ReactNode
  gradient: string
}> = {
  meeting_created: {
    label: 'Meeting Created',
    color: '#3b82f6',
    icon: <Calendar className="size-3.5" />,
    gradient: 'from-blue-500 to-blue-600'
  },
  meeting_completed: {
    label: 'Meeting Completed',
    color: '#10b981',
    icon: <CheckCircle2 className="size-3.5" />,
    gradient: 'from-emerald-500 to-emerald-600'
  },
  agent_added: {
    label: 'Agent Added',
    color: '#3b82f6',
    icon: <Bot className="size-3.5" />,
    gradient: 'from-blue-500 to-indigo-500'
  },
  experiment_started: {
    label: 'Experiment Started',
    color: '#f59e0b',
    icon: <FlaskConical className="size-3.5" />,
    gradient: 'from-amber-500 to-orange-500'
  },
  experiment_completed: {
    label: 'Experiment Completed',
    color: '#10b981',
    icon: <CheckCircle2 className="size-3.5" />,
    gradient: 'from-emerald-400 to-green-600'
  },
  note_created: {
    label: 'Note Created',
    color: '#8b5cf6',
    icon: <FileText className="size-3.5" />,
    gradient: 'from-violet-500 to-purple-600'
  },
  key_decision: {
    label: 'Key Decision',
    color: '#f97316',
    icon: <Flag className="size-3.5" />,
    gradient: 'from-orange-500 to-red-500'
  },
  milestone: {
    label: 'Milestone',
    color: '#8b5cf6',
    icon: <Trophy className="size-3.5" />,
    gradient: 'from-violet-500 to-indigo-600'
  },
  publication: {
    label: 'Publication',
    color: '#06b6d4',
    icon: <BookOpen className="size-3.5" />,
    gradient: 'from-cyan-500 to-teal-500'
  },
  review_submitted: {
    label: 'Review Submitted',
    color: '#ec4899',
    icon: <MessageSquareText className="size-3.5" />,
    gradient: 'from-pink-500 to-rose-500'
  }
}

const AGENT_NAMES = [
  'Alpha-Research', 'Beta-Analysis', 'Gamma-Synthesis', 'Delta-Review', 'Epsilon-Data',
  'Zeta-Validation', 'Eta-Design', 'Theta-Integration'
]

const AGENT_COLORS: Record<string, string> = {
  'Alpha-Research': '#3b82f6',
  'Beta-Analysis': '#10b981',
  'Gamma-Synthesis': '#8b5cf6',
  'Delta-Review': '#f59e0b',
  'Epsilon-Data': '#06b6d4',
  'Zeta-Validation': '#ec4899',
  'Eta-Design': '#f97316',
  'Theta-Integration': '#6366f1'
}

// ─── Helpers ────────────────────────────────────────────────
function daysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0, 0)
  return d.toISOString()
}

function generateSampleEvents(): (TimelineEvent | MilestoneEvent)[] {
  const events: (TimelineEvent | MilestoneEvent)[] = []

  // Day 0: meeting_created
  events.push({
    id: 'evt-001', type: 'meeting_created', title: 'Research Kickoff Meeting',
    description: 'Initial kickoff meeting to establish research objectives and assign roles to all team agents. Discussed timeline, resource allocation, and key deliverables for the Q1 research cycle.',
    timestamp: daysAgo(59), agentIds: ['a1', 'a2', 'a3'], agentNames: ['Alpha-Research', 'Beta-Analysis', 'Gamma-Synthesis'],
    priority: 'critical', tags: ['kickoff', 'planning']
  })
  // Day 1: agent_added
  events.push({
    id: 'evt-002', type: 'agent_added', title: 'Delta-Review Agent Onboarded',
    description: 'Added Delta-Review agent to the research team. Specializes in critical analysis and literature review with deep expertise in molecular biology.',
    timestamp: daysAgo(58), agentIds: ['a4'], agentNames: ['Delta-Review'],
    priority: 'normal', tags: ['onboarding', 'team']
  })
  // Day 2: experiment_started
  events.push({
    id: 'evt-003', type: 'experiment_started', title: 'Protein Folding Experiment Initiated',
    description: 'Started computational protein folding experiment using ensemble simulation approach. Alpha-Research leading with support from Epsilon-Data.',
    timestamp: daysAgo(56), agentIds: ['a1', 'a5'], agentNames: ['Alpha-Research', 'Epsilon-Data'],
    meetingId: 'm-001', meetingName: 'Experiment Planning', priority: 'important', tags: ['protein', 'simulation']
  })
  // Day 3: note_created
  events.push({
    id: 'evt-004', type: 'note_created', title: 'Methodology Notes: Monte Carlo Sampling',
    description: 'Documented the Monte Carlo sampling methodology to be used in the folding experiment. Includes parameter ranges and convergence criteria.',
    timestamp: daysAgo(55), agentIds: ['a1'], agentNames: ['Alpha-Research'],
    priority: 'normal', tags: ['methodology', 'notes']
  })
  // Day 4: key_decision
  events.push({
    id: 'evt-005', type: 'key_decision', title: 'Adopted Multi-Scale Modeling Approach',
    description: 'Decided to integrate molecular dynamics with coarse-grained models for improved accuracy. Team vote: 6-0 in favor.',
    timestamp: daysAgo(53), agentIds: ['a1', 'a2', 'a3'], agentNames: ['Alpha-Research', 'Beta-Analysis', 'Gamma-Synthesis'],
    meetingId: 'm-002', meetingName: 'Technical Review', priority: 'critical', tags: ['decision', 'methodology']
  })
  // Day 5: milestone
  events.push({
    id: 'evt-006', type: 'milestone', title: 'Phase 1: Data Collection Complete',
    description: 'Completed initial data collection phase with 2.4M structural predictions. All data validated and stored.',
    timestamp: daysAgo(50), agentIds: ['a1', 'a5'], agentNames: ['Alpha-Research', 'Epsilon-Data'],
    priority: 'important', tags: ['milestone', 'data'],
    targetDate: daysAgo(52), actualDate: daysAgo(50), milestoneStatus: 'completed', progress: 100, dependencies: []
  })
  // Day 6: meeting_completed
  events.push({
    id: 'evt-007', type: 'meeting_completed', title: 'Weekly Progress Review — Week 2',
    description: 'Reviewed progress on Phase 1. Discussed challenges with data normalization and agreed on revised protocols.',
    timestamp: daysAgo(48), agentIds: ['a1', 'a2', 'a4'], agentNames: ['Alpha-Research', 'Beta-Analysis', 'Delta-Review'],
    meetingId: 'm-003', meetingName: 'Weekly Sync', priority: 'normal', tags: ['weekly', 'review']
  })
  // Day 7: agent_added
  events.push({
    id: 'evt-008', type: 'agent_added', title: 'Zeta-Validation Agent Joined',
    description: 'Onboarded Zeta-Validation for cross-validation and statistical analysis of experimental results.',
    timestamp: daysAgo(46), agentIds: ['a6'], agentNames: ['Zeta-Validation'],
    priority: 'normal', tags: ['onboarding', 'validation']
  })
  // Day 8: experiment_completed
  events.push({
    id: 'evt-009', type: 'experiment_completed', title: 'Protein Folding Phase 1 Complete',
    description: 'Successfully completed Phase 1 with 94.2% accuracy on validation set. Results exceeded initial expectations by 12%.',
    timestamp: daysAgo(44), agentIds: ['a1', 'a5', 'a6'], agentNames: ['Alpha-Research', 'Epsilon-Data', 'Zeta-Validation'],
    priority: 'critical', tags: ['completed', 'protein', 'results']
  })
  // Day 9: publication
  events.push({
    id: 'evt-010', type: 'publication', title: 'Pre-print: Multi-Scale Protein Folding',
    description: 'Submitted pre-print to bioRxiv covering the multi-scale approach and Phase 1 results. Paper ID: 2024.xxxx.',
    timestamp: daysAgo(42), agentIds: ['a1', 'a2', 'a3'], agentNames: ['Alpha-Research', 'Beta-Analysis', 'Gamma-Synthesis'],
    priority: 'important', tags: ['publication', 'pre-print']
  })
  // Day 10: note_created
  events.push({
    id: 'evt-011', type: 'note_created', title: 'Observation: Anomalous Binding Patterns',
    description: 'Beta-Analysis discovered anomalous binding patterns in the C-terminal region. Possible implications for drug design.',
    timestamp: daysAgo(40), agentIds: ['a2'], agentNames: ['Beta-Analysis'],
    priority: 'important', tags: ['observation', 'binding']
  })
  // Day 11: meeting_created
  events.push({
    id: 'evt-012', type: 'meeting_created', title: 'Emergency Review: Binding Anomalies',
    description: 'Scheduled emergency review meeting to discuss the anomalous binding patterns and their implications.',
    timestamp: daysAgo(39), agentIds: ['a1', 'a2', 'a4'], agentNames: ['Alpha-Research', 'Beta-Analysis', 'Delta-Review'],
    meetingId: 'm-004', meetingName: 'Emergency Review', priority: 'critical', tags: ['urgent', 'binding']
  })
  // Day 12: key_decision
  events.push({
    id: 'evt-013', type: 'key_decision', title: 'Pivot to Focus on C-Terminal Region',
    description: 'Decided to pivot Phase 2 focus to the C-terminal binding region based on anomalous findings. Reprioritized resource allocation.',
    timestamp: daysAgo(38), agentIds: ['a1', 'a2', 'a3', 'a4'], agentNames: ['Alpha-Research', 'Beta-Analysis', 'Gamma-Synthesis', 'Delta-Review'],
    priority: 'critical', tags: ['pivot', 'decision']
  })
  // Day 13: experiment_started
  events.push({
    id: 'evt-014', type: 'experiment_started', title: 'C-Terminal Binding Assay',
    description: 'Initiated targeted binding assays for the C-terminal region using both in-silico and in-vitro methods.',
    timestamp: daysAgo(36), agentIds: ['a2', 'a3'], agentNames: ['Beta-Analysis', 'Gamma-Synthesis'],
    priority: 'important', tags: ['binding', 'assay']
  })
  // Day 14: review_submitted
  events.push({
    id: 'evt-015', type: 'review_submitted', title: 'Peer Review: Protein Folding Pre-print',
    description: 'Received peer review feedback from 3 reviewers. Overall positive with suggestions for additional controls.',
    timestamp: daysAgo(34), agentIds: ['a4', 'a6'], agentNames: ['Delta-Review', 'Zeta-Validation'],
    priority: 'important', tags: ['review', 'feedback']
  })
  // Day 15: note_created
  events.push({
    id: 'evt-016', type: 'note_created', title: 'Protocol Update: Hybrid Simulation Parameters',
    description: 'Updated hybrid simulation parameters based on reviewer feedback. Adjusted time step and temperature control settings.',
    timestamp: daysAgo(33), agentIds: ['a1'], agentNames: ['Alpha-Research'],
    priority: 'normal', tags: ['protocol', 'update']
  })
  // Day 16: meeting_completed
  events.push({
    id: 'evt-017', type: 'meeting_completed', title: 'Monthly Review — Month 1 Summary',
    description: 'Comprehensive monthly review. Phase 1 complete, Phase 2 underway. Budget on track. Team morale high.',
    timestamp: daysAgo(31), agentIds: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'], agentNames: AGENT_NAMES.slice(0, 6),
    meetingId: 'm-005', meetingName: 'Monthly Review', priority: 'important', tags: ['monthly', 'summary']
  })
  // Day 17: agent_added
  events.push({
    id: 'evt-018', type: 'agent_added', title: 'Eta-Design Agent Added',
    description: 'Added Eta-Design agent for visualization and UI design support for the research dashboard.',
    timestamp: daysAgo(29), agentIds: ['a7'], agentNames: ['Eta-Design'],
    priority: 'normal', tags: ['onboarding', 'design']
  })
  // Day 18: milestone
  events.push({
    id: 'evt-019', type: 'milestone', title: 'Phase 2: Binding Analysis 50% Complete',
    description: 'Reached 50% completion of C-terminal binding analysis. Preliminary results show 3 novel binding sites.',
    timestamp: daysAgo(27), agentIds: ['a2', 'a3'], agentNames: ['Beta-Analysis', 'Gamma-Synthesis'],
    priority: 'important', tags: ['milestone', 'binding'],
    targetDate: daysAgo(25), milestoneStatus: 'at_risk', progress: 50, dependencies: ['evt-006']
  })
  // Day 19: key_decision
  events.push({
    id: 'evt-020', type: 'key_decision', title: 'Adopt Neural Network Scoring',
    description: 'Switched binding affinity scoring from empirical to neural network approach. Expected 15% accuracy improvement.',
    timestamp: daysAgo(25), agentIds: ['a1', 'a2', 'a5'], agentNames: ['Alpha-Research', 'Beta-Analysis', 'Epsilon-Data'],
    priority: 'important', tags: ['scoring', 'neural-network']
  })
  // Day 20: experiment_started
  events.push({
    id: 'evt-021', type: 'experiment_started', title: 'Neural Network Training Pipeline',
    description: 'Started training neural network for binding affinity prediction. Using 800K labeled samples from Phase 1.',
    timestamp: daysAgo(23), agentIds: ['a1', 'a5'], agentNames: ['Alpha-Research', 'Epsilon-Data'],
    priority: 'important', tags: ['ml', 'training']
  })
  // Day 21: meeting_created
  events.push({
    id: 'evt-022', type: 'meeting_created', title: 'Collaboration Meeting: Partner Lab',
    description: 'Scheduled collaboration meeting with external partner lab for data sharing and joint publication planning.',
    timestamp: daysAgo(22), agentIds: ['a1', 'a3', 'a4'], agentNames: ['Alpha-Research', 'Gamma-Synthesis', 'Delta-Review'],
    meetingId: 'm-006', meetingName: 'Partner Collaboration', priority: 'normal', tags: ['collaboration', 'external']
  })
  // Day 22: note_created
  events.push({
    id: 'evt-023', type: 'note_created', title: 'Findings: Novel Binding Site Confirmed',
    description: 'Confirmed 3 novel binding sites in C-terminal region through both computational and experimental validation.',
    timestamp: daysAgo(20), agentIds: ['a2', 'a3', 'a6'], agentNames: ['Beta-Analysis', 'Gamma-Synthesis', 'Zeta-Validation'],
    priority: 'critical', tags: ['findings', 'binding-site']
  })
  // Day 23: publication
  events.push({
    id: 'evt-024', type: 'publication', title: 'Paper Submitted: Nature Methods',
    description: 'Submitted full paper to Nature Methods covering multi-scale approach and novel binding site discovery.',
    timestamp: daysAgo(18), agentIds: ['a1', 'a2', 'a3', 'a4'], agentNames: ['Alpha-Research', 'Beta-Analysis', 'Gamma-Synthesis', 'Delta-Review'],
    priority: 'critical', tags: ['publication', 'nature']
  })
  // Day 24: experiment_completed
  events.push({
    id: 'evt-025', type: 'experiment_completed', title: 'Neural Network Training Complete',
    description: 'Training complete. Model achieves 97.1% accuracy on held-out test set. F1-score: 0.968.',
    timestamp: daysAgo(16), agentIds: ['a1', 'a5'], agentNames: ['Alpha-Research', 'Epsilon-Data'],
    priority: 'important', tags: ['ml', 'complete']
  })
  // Day 25: milestone
  events.push({
    id: 'evt-026', type: 'milestone', title: 'Phase 2: Binding Analysis Complete',
    description: 'All binding analysis complete. Identified 3 novel sites with high-confidence scores (>0.95).',
    timestamp: daysAgo(14), agentIds: ['a2', 'a3', 'a6'], agentNames: ['Beta-Analysis', 'Gamma-Synthesis', 'Zeta-Validation'],
    priority: 'critical', tags: ['milestone', 'phase2'],
    targetDate: daysAgo(15), actualDate: daysAgo(14), milestoneStatus: 'completed', progress: 100, dependencies: ['evt-019']
  })
  // Day 26: meeting_completed
  events.push({
    id: 'evt-027', type: 'meeting_completed', title: 'Sprint Review: Phase 2 Wrap-up',
    description: 'Sprint review covering Phase 2 completion. Discussed Phase 3 planning and resource needs.',
    timestamp: daysAgo(13), agentIds: ['a1', 'a2', 'a3', 'a4', 'a5'], agentNames: AGENT_NAMES.slice(0, 5),
    meetingId: 'm-007', meetingName: 'Sprint Review', priority: 'important', tags: ['sprint', 'review']
  })
  // Day 27: agent_added
  events.push({
    id: 'evt-028', type: 'agent_added', title: 'Theta-Integration Agent Onboarded',
    description: 'Added Theta-Integration for pipeline integration and automation of downstream analysis workflows.',
    timestamp: daysAgo(11), agentIds: ['a8'], agentNames: ['Theta-Integration'],
    priority: 'normal', tags: ['onboarding', 'integration']
  })
  // Day 28: experiment_started
  events.push({
    id: 'evt-029', type: 'experiment_started', title: 'Phase 3: Drug Candidate Screening',
    description: 'Initiated Phase 3 screening of 10K drug candidates against the 3 novel binding sites using the trained NN model.',
    timestamp: daysAgo(10), agentIds: ['a1', 'a5', 'a8'], agentNames: ['Alpha-Research', 'Epsilon-Data', 'Theta-Integration'],
    priority: 'critical', tags: ['drug-screening', 'phase3']
  })
  // Day 29: key_decision
  events.push({
    id: 'evt-030', type: 'key_decision', title: 'Selected Top 50 Candidates for Testing',
    description: 'Narrowed down from 10K to top 50 candidates based on binding affinity, ADMET properties, and synthesizability.',
    timestamp: daysAgo(8), agentIds: ['a1', 'a2', 'a5'], agentNames: ['Alpha-Research', 'Beta-Analysis', 'Epsilon-Data'],
    priority: 'important', tags: ['candidates', 'selection']
  })
  // Day 30: note_created
  events.push({
    id: 'evt-031', type: 'note_created', title: 'Pipeline Documentation: Screening Workflow',
    description: 'Documented the complete screening workflow including data flow, model inference, and result aggregation.',
    timestamp: daysAgo(7), agentIds: ['a8'], agentNames: ['Theta-Integration'],
    priority: 'normal', tags: ['docs', 'pipeline']
  })
  // Day 31: review_submitted
  events.push({
    id: 'evt-032', type: 'review_submitted', title: 'Internal Review: Phase 3 Progress',
    description: 'Delta-Review completed internal review of Phase 3 progress. Rating: 4.5/5. Recommended for continued funding.',
    timestamp: daysAgo(6), agentIds: ['a4', 'a6'], agentNames: ['Delta-Review', 'Zeta-Validation'],
    priority: 'important', tags: ['review', 'internal']
  })
  // Day 32: meeting_created
  events.push({
    id: 'evt-033', type: 'meeting_created', title: 'Phase 3 Checkpoint Meeting',
    description: 'Checkpoint meeting to review screening results and plan next steps for top candidate validation.',
    timestamp: daysAgo(5), agentIds: ['a1', 'a2', 'a3', 'a4'], agentNames: AGENT_NAMES.slice(0, 4),
    meetingId: 'm-008', meetingName: 'Phase 3 Checkpoint', priority: 'normal', tags: ['checkpoint', 'phase3']
  })
  // Day 33: milestone
  events.push({
    id: 'evt-034', type: 'milestone', title: 'Phase 3: Initial Screening 75% Complete',
    description: '75% of candidate screening complete. 12 high-potential candidates identified so far.',
    timestamp: daysAgo(4), agentIds: ['a1', 'a5', 'a8'], agentNames: ['Alpha-Research', 'Epsilon-Data', 'Theta-Integration'],
    priority: 'important', tags: ['milestone', 'screening'],
    targetDate: daysAgo(3), milestoneStatus: 'on_track', progress: 75, dependencies: ['evt-026']
  })
  // Day 34: experiment_completed
  events.push({
    id: 'evt-035', type: 'experiment_completed', title: 'Candidate Screening Batch 3 Complete',
    description: 'Batch 3 screening complete. 8 additional candidates passed all filters. Total: 20 high-potential candidates.',
    timestamp: daysAgo(3), agentIds: ['a5', 'a8'], agentNames: ['Epsilon-Data', 'Theta-Integration'],
    priority: 'normal', tags: ['screening', 'batch']
  })
  // Day 35: note_created
  events.push({
    id: 'evt-036', type: 'note_created', title: 'Design Review: Research Dashboard v2',
    description: 'Eta-Design completed design review for the updated research dashboard with new visualization components.',
    timestamp: daysAgo(2), agentIds: ['a7'], agentNames: ['Eta-Design'],
    priority: 'normal', tags: ['design', 'dashboard']
  })
  // Day 36: meeting_completed
  events.push({
    id: 'evt-037', type: 'meeting_completed', title: 'Weekly Sync: Phase 3 Status Update',
    description: 'Weekly sync covering Phase 3 status. All on track. Final batch of screening starts tomorrow.',
    timestamp: daysAgo(2), agentIds: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8'], agentNames: AGENT_NAMES,
    meetingId: 'm-009', meetingName: 'Weekly Sync', priority: 'normal', tags: ['weekly', 'sync']
  })
  // Day 37: key_decision
  events.push({
    id: 'evt-038', type: 'key_decision', title: 'Approved Top 20 for Wet-Lab Validation',
    description: 'Approved the top 20 drug candidates for wet-lab validation. Timeline: 3 weeks for initial results.',
    timestamp: daysAgo(1), agentIds: ['a1', 'a2', 'a3', 'a4'], agentNames: AGENT_NAMES.slice(0, 4),
    priority: 'critical', tags: ['decision', 'wet-lab']
  })
  // Day 38: publication
  events.push({
    id: 'evt-039', type: 'publication', title: 'Conference Paper: Drug Screening Pipeline',
    description: 'Accepted for presentation at ICML 2025. Title: "Automated Drug Screening via Multi-Scale Protein Analysis".',
    timestamp: daysAgo(1), agentIds: ['a1', 'a2', 'a5'], agentNames: ['Alpha-Research', 'Beta-Analysis', 'Epsilon-Data'],
    priority: 'important', tags: ['conference', 'icml']
  })
  // Day 39: review_submitted
  events.push({
    id: 'evt-040', type: 'review_submitted', title: 'External Review: Nature Methods Paper',
    description: 'Received first round of external reviews from Nature Methods. 2 major revisions, 1 minor. Overall positive.',
    timestamp: daysAgo(0), agentIds: ['a4'], agentNames: ['Delta-Review'],
    priority: 'critical', tags: ['review', 'nature', 'revision']
  })
  // Day 39: experiment_started
  events.push({
    id: 'evt-041', type: 'experiment_started', title: 'Wet-Lab Validation: Batch 1',
    description: 'Started wet-lab validation for the first batch of 7 top candidates. Expected completion in 5 days.',
    timestamp: daysAgo(0), agentIds: ['a3', 'a6'], agentNames: ['Gamma-Synthesis', 'Zeta-Validation'],
    priority: 'critical', tags: ['wet-lab', 'validation']
  })
  // Day 39: milestone
  events.push({
    id: 'evt-042', type: 'milestone', title: 'Phase 3: Full Screening Target',
    description: 'Target: Complete full candidate screening with all validation checks by end of current sprint.',
    timestamp: daysAgo(0), agentIds: ['a1', 'a5', 'a8'], agentNames: ['Alpha-Research', 'Epsilon-Data', 'Theta-Integration'],
    priority: 'important', tags: ['milestone', 'target'],
    targetDate: daysAgo(-2), milestoneStatus: 'on_track', progress: 85, dependencies: ['evt-034']
  })

  return events
}

function isMilestoneEvent(ev: TimelineEvent | MilestoneEvent): ev is MilestoneEvent {
  return ev.type === 'milestone' && 'milestoneStatus' in ev
}

// ─── Main Component ─────────────────────────────────────────
interface ResearchTimelineProps {
  lang?: Lang
}

export function ResearchTimeline({ lang = 'en' }: ResearchTimelineProps) {
  const [events, setEvents] = useState<(TimelineEvent | MilestoneEvent)[]>([])
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [selectedTypes, setSelectedTypes] = useState<Set<TimelineEventType>>(new Set())
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set())
  const [dateRange, setDateRange] = useState<DateRange>('all_time')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [selectedCalDay, setSelectedCalDay] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formType, setFormType] = useState<TimelineEventType>('note_created')
  const [formPriority, setFormPriority] = useState<EventPriority>('normal')
  const [formTags, setFormTags] = useState<string[]>([])
  const [formTagInput, setFormTagInput] = useState('')
  const [formAgentIds, setFormAgentIds] = useState<string[]>([])
  const [formDate, setFormDate] = useState('')
  const [formTime, setFormTime] = useState('')

  // Load from localStorage
  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed && parsed.events && parsed.events.length > 0) {
          setEvents(parsed.events)
          return
        }
      }
    } catch { /* ignore parse errors */ }
    setEvents(generateSampleEvents())
  }, [])

  // Save to localStorage
  useEffect(() => {
    if (!mounted || events.length === 0) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ events }))
    } catch { /* quota exceeded */ }
  }, [events, mounted])

  // ─── Computed Values ──────────────────────────────────────
  const now = useMemo(() => new Date(), [])

  const getDateRangeBounds = useCallback((): { start: Date; end: Date } => {
    const start = new Date()
    const end = new Date()
    switch (dateRange) {
      case 'today':
        start.setHours(0, 0, 0, 0)
        end.setHours(23, 59, 59, 999)
        break
      case 'this_week': {
        const dayOfWeek = start.getDay()
        start.setDate(start.getDate() - dayOfWeek)
        start.setHours(0, 0, 0, 0)
        end.setDate(end.getDate() + (7 - dayOfWeek))
        end.setHours(23, 59, 59, 999)
        break
      }
      case 'this_month':
        start.setDate(1)
        start.setHours(0, 0, 0, 0)
        end.setMonth(end.getMonth() + 1, 0)
        end.setHours(23, 59, 59, 999)
        break
      case 'this_quarter': {
        const qMonth = Math.floor(start.getMonth() / 3) * 3
        start.setMonth(qMonth, 1)
        start.setHours(0, 0, 0, 0)
        end.setMonth(qMonth + 3, 0)
        end.setHours(23, 59, 59, 999)
        break
      }
      case 'custom':
        if (customStart) start.setTime(new Date(customStart).getTime())
        if (customEnd) end.setTime(new Date(customEnd).getTime())
        break
      default:
        start.setTime(0)
        end.setHours(23, 59, 59, 9999)
    }
    return { start, end }
  }, [dateRange, customStart, customEnd])

  const filteredEvents = useMemo(() => {
    const { start, end } = getDateRangeBounds()
    return events
      .filter(ev => {
        const evDate = new Date(ev.timestamp)
        if (evDate < start || evDate > end) return false
        if (selectedTypes.size > 0 && !selectedTypes.has(ev.type)) return false
        if (selectedAgents.size > 0 && !ev.agentNames.some(n => selectedAgents.has(n))) return false
        if (searchQuery) {
          const q = searchQuery.toLowerCase()
          if (!ev.title.toLowerCase().includes(q) && !ev.description.toLowerCase().includes(q)) return false
        }
        if (selectedCalDay !== null) {
          const calDate = new Date(calYear, calMonth, selectedCalDay)
          if (evDate.toDateString() !== calDate.toDateString()) return false
        }
        return true
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [events, selectedTypes, selectedAgents, getDateRangeBounds, searchQuery, selectedCalDay, calMonth, calYear])

  // Stats
  const stats = useMemo(() => {
    const typeCounts: Record<string, number> = {}
    const milestones = events.filter(isMilestoneEvent)
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const thisWeek = events.filter(e => new Date(e.timestamp) >= weekStart)
    events.forEach(ev => {
      typeCounts[ev.type] = (typeCounts[ev.type] || 0) + 1
    })
    return {
      total: events.length,
      thisWeek: thisWeek.length,
      milestonesCompleted: milestones.filter(m => m.milestoneStatus === 'completed').length,
      milestonesPending: milestones.filter(m => m.milestoneStatus !== 'completed').length,
      typeCounts
    }
  }, [events])

  // Calendar day event counts
  const calDayCounts = useMemo(() => {
    const counts: Record<number, number> = {}
    events.forEach(ev => {
      const d = new Date(ev.timestamp)
      if (d.getMonth() === calMonth && d.getFullYear() === calYear) {
        counts[d.getDate()] = (counts[d.getDate()] || 0) + 1
      }
    })
    return counts
  }, [events, calMonth, calYear])

  // ─── Handlers ──────────────────────────────────────────────
  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleTypeFilter = useCallback((type: TimelineEventType) => {
    setSelectedTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }, [])

  const toggleAgentFilter = useCallback((name: string) => {
    setSelectedAgents(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }, [])

  const addTag = useCallback(() => {
    const tag = formTagInput.trim()
    if (tag && !formTags.includes(tag)) {
      setFormTags(prev => [...prev, tag])
      setFormTagInput('')
    }
  }, [formTagInput, formTags])

  const removeTag = useCallback((tag: string) => {
    setFormTags(prev => prev.filter(t => t !== tag))
  }, [])

  const toggleFormAgent = useCallback((name: string) => {
    setFormAgentIds(prev => {
      if (prev.includes(name)) return prev.filter(n => n !== name)
      return [...prev, name]
    })
  }, [])

  const createEvent = useCallback(() => {
    if (!formTitle.trim()) return
    const dtStr = formDate ? (formTime ? `${formDate}T${formTime}:00` : `${formDate}T12:00:00`) : new Date().toISOString()
    const newEvent: TimelineEvent = {
      id: `evt-${Date.now()}`,
      type: formType,
      title: formTitle.trim(),
      description: formDesc.trim(),
      timestamp: dtStr,
      agentIds: formAgentIds.map(a => a.toLowerCase().replace(/[^a-z]/g, '').substring(0, 4)),
      agentNames: [...formAgentIds],
      priority: formPriority,
      tags: [...formTags]
    }
    setEvents(prev => [newEvent, ...prev])
    setFormTitle('')
    setFormDesc('')
    setFormType('note_created')
    setFormPriority('normal')
    setFormTags([])
    setFormAgentIds([])
    setFormDate('')
    setFormTime('')
    setShowCreateForm(false)
  }, [formTitle, formDesc, formType, formPriority, formTags, formAgentIds, formDate, formTime])

  const exportJSON = useCallback(() => {
    const data = JSON.stringify({ events, exportedAt: new Date().toISOString() }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `timeline-export-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [events])

  const exportICal = useCallback(() => {
    const icalLines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//VirtualLab//Research Timeline//EN'
    ]
    events.forEach(ev => {
      const dt = new Date(ev.timestamp).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      icalLines.push(
        'BEGIN:VEVENT',
        `DTSTART:${dt}`,
        `SUMMARY:[${ev.type}] ${ev.title}`,
        `DESCRIPTION:${ev.description.replace(/\n/g, '\\n')}`,
        `END:VEVENT`
      )
    })
    icalLines.push('END:VCALENDAR')
    const blob = new Blob([icalLines.join('\r\n')], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `timeline-export-${Date.now()}.ics`
    a.click()
    URL.revokeObjectURL(url)
  }, [events])

  // ─── Calendar Helpers ──────────────────────────────────────
  const calendarDays = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1).getDay()
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
    const daysInPrevMonth = new Date(calYear, calMonth, 0).getDate()
    const dayHeaders = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
    const cells: { day: number; current: boolean }[] = []
    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push({ day: daysInPrevMonth - i, current: false })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, current: true })
    }
    while (cells.length < 42) {
      cells.push({ day: cells.length - firstDay - daysInMonth + 1, current: false })
    }
    return { dayHeaders, cells }
  }, [calYear, calMonth])

  const today = now.getDate()
  const isCurrentMonth = calMonth === now.getMonth() && calYear === now.getFullYear()

  // ─── Type stats sorted for mini bar chart ──────────────────
  const sortedTypeStats = useMemo(() => {
    return Object.entries(stats.typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
  }, [stats.typeCounts])

  const maxTypeCount = useMemo(() => Math.max(...sortedTypeStats.map(([, c]) => c), 1), [sortedTypeStats])

  // ─── Render ───────────────────────────────────────────────
  if (!mounted) return null

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)' }}>
            <Clock className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--vl-text-heading)' }}>Research Timeline</h2>
            <p className="text-xs" style={{ color: 'var(--vl-text-muted)' }}>{events.length} events across {stats.milestonesCompleted + stats.milestonesPending} milestones</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCreateForm(!showCreateForm)} className="tl-create-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: 'none', borderRadius: 10, fontSize: 11, fontWeight: 600, color: '#fff', background: 'linear-gradient(135deg, #10b981, #06b6d4)', cursor: 'pointer' }}>
            <Plus className="size-3.5" /> {showCreateForm ? 'Cancel' : 'Add Event'}
          </button>
          <div className="tl-export-btns">
            <button onClick={exportJSON} className="tl-export-btn"><Download className="size-3" /> JSON</button>
            <button onClick={exportICal} className="tl-export-btn"><CalendarDays className="size-3" /> iCal</button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="tl-stat-grid">
        <div className="tl-stat-card" style={{ animationDelay: '0s' }}>
          <div className="tl-stat-value">{stats.total}</div>
          <div className="tl-stat-label">Total Events</div>
        </div>
        <div className="tl-stat-card" style={{ animationDelay: '0.1s' }}>
          <div className="tl-stat-value">{stats.thisWeek}</div>
          <div className="tl-stat-label">This Week</div>
        </div>
        <div className="tl-stat-card" style={{ animationDelay: '0.2s' }}>
          <div className="tl-stat-value">{stats.milestonesCompleted}</div>
          <div className="tl-stat-label">Milestones Done</div>
        </div>
        <div className="tl-stat-card" style={{ animationDelay: '0.3s' }}>
          <div className="tl-stat-value">{stats.milestonesPending}</div>
          <div className="tl-stat-label">Milestones Pending</div>
        </div>
      </div>

      {/* Mini Bar Chart: Events by Type */}
      {sortedTypeStats.length > 0 && (
        <div className="tl-stat-card" style={{ animationDelay: '0.15s' }}>
          <div className="tl-stat-card-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--vl-text-heading)', marginBottom: 8 }}>
            <BarChart3 className="size-4" style={{ color: '#10b981' }} /> Events by Type
          </div>
          <div className="tl-mini-bar-chart">
            {sortedTypeStats.map(([type, count]) => {
              const cfg = EVENT_TYPE_CONFIG[type as TimelineEventType]
              return (
                <div key={type} style={{ flex: 1, maxWidth: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div className="tl-mini-bar" style={{ height: `${Math.max((count / maxTypeCount) * 60, 4)}px`, background: cfg?.color || '#6b7280', width: '100%' }} />
                  <div className="tl-mini-bar-label">{count}</div>
                  <div className="tl-mini-bar-label" style={{ fontSize: 7 }}>{cfg?.label?.split(' ')[0] || type}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Create Event Form */}
      {showCreateForm && (
        <div className="tl-create-form">
          <div className="tl-create-form-title"><Plus className="size-4" style={{ color: '#10b981' }} /> Create New Event</div>
          <div className="tl-create-form-row">
            <div className="tl-create-form-field">
              <label className="tl-create-form-label">Title</label>
              <input className="tl-create-form-input" value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Event title..." />
            </div>
            <div className="tl-create-form-field">
              <label className="tl-create-form-label">Type</label>
              <select className="tl-create-form-select" style={{ width: '100%' }} value={formType} onChange={e => setFormType(e.target.value as TimelineEventType)}>
                {Object.entries(EVENT_TYPE_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="tl-create-form-row">
            <div className="tl-create-form-field" style={{ flex: 2 }}>
              <label className="tl-create-form-label">Description</label>
              <textarea className="tl-create-form-textarea" value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Event description..." />
            </div>
          </div>
          <div className="tl-create-form-row">
            <div className="tl-create-form-field">
              <label className="tl-create-form-label">Date</label>
              <input type="date" className="tl-create-form-input" value={formDate} onChange={e => setFormDate(e.target.value)} />
            </div>
            <div className="tl-create-form-field">
              <label className="tl-create-form-label">Time</label>
              <input type="time" className="tl-create-form-input" value={formTime} onChange={e => setFormTime(e.target.value)} />
            </div>
            <div className="tl-create-form-field">
              <label className="tl-create-form-label">Priority</label>
              <select className="tl-create-form-select" style={{ width: '100%' }} value={formPriority} onChange={e => setFormPriority(e.target.value as EventPriority)}>
                <option value="normal">Normal</option>
                <option value="important">Important</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div className="tl-create-form-row">
            <div className="tl-create-form-field">
              <label className="tl-create-form-label">Tags</label>
              <div className="tl-create-form-tags">
                {formTags.map(tag => (
                  <span key={tag} className="tl-create-form-tag">
                    <Tag className="size-2.5" /> {tag}
                    <button className="tl-create-form-tag-remove" onClick={() => removeTag(tag)}><X className="size-3" /></button>
                  </span>
                ))}
                <input className="tl-create-form-input" style={{ flex: 1, minWidth: 120 }} value={formTagInput} onChange={e => setFormTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder="Add tag..." />
                <button onClick={addTag} className="tl-date-btn" style={{ padding: '4px 10px' }}>Add</button>
              </div>
            </div>
          </div>
          <div className="tl-create-form-row">
            <div className="tl-create-form-field">
              <label className="tl-create-form-label">Agents</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {AGENT_NAMES.map(name => (
                  <button key={name} onClick={() => toggleFormAgent(name)} className="tl-filter-chip" style={formAgentIds.includes(name) ? { background: 'rgba(16,185,129,0.12)', color: '#10b981', borderColor: 'rgba(16,185,129,0.25)' } : {}}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: AGENT_COLORS[name] || '#6b7280', display: 'inline-block', flexShrink: 0 }} />
                    {name.split('-')[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="tl-create-form-actions">
            <button onClick={() => setShowCreateForm(false)} className="tl-create-btn tl-create-btn--cancel">Cancel</button>
            <button onClick={createEvent} className="tl-create-btn" disabled={!formTitle.trim()}>Create Event</button>
          </div>
        </div>
      )}

      {/* Filters & Date Navigation */}
      <div className="tl-filters">
        <div className="tl-filters-label"><Filter className="size-3" /> Type</div>
        {Object.entries(EVENT_TYPE_CONFIG).map(([type, cfg]) => (
          <button key={type} onClick={() => toggleTypeFilter(type as TimelineEventType)} className={`tl-filter-chip ${selectedTypes.has(type as TimelineEventType) ? 'tl-filter-chip--active' : ''}`}>
            <span className="tl-filter-chip-dot" style={{ background: cfg.color }} />
            {cfg.label.split(' ')[0]}
          </button>
        ))}
        {selectedTypes.size > 0 && (
          <button onClick={() => setSelectedTypes(new Set())} className="tl-date-btn" style={{ padding: '3px 8px', fontSize: 10 }}>Clear</button>
        )}
      </div>

      <div className="tl-filters">
        <div className="tl-filters-label"><Users className="size-3" /> Agents</div>
        {AGENT_NAMES.map(name => (
          <button key={name} onClick={() => toggleAgentFilter(name)} className={`tl-filter-chip ${selectedAgents.has(name) ? 'tl-filter-chip--active' : ''}`}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: AGENT_COLORS[name] || '#6b7280', display: 'inline-block' }} />
            {name.split('-')[0]}
          </button>
        ))}
      </div>

      <div className="tl-filters">
        <div className="tl-filters-label"><Calendar className="size-3" /> Range</div>
        <div className="tl-date-nav">
          {(['today', 'this_week', 'this_month', 'this_quarter', 'all_time'] as DateRange[]).map(r => (
            <button key={r} onClick={() => setDateRange(r)} className={`tl-date-btn ${dateRange === r ? 'tl-date-btn--active' : ''}`}>
              {r === 'today' ? 'Today' : r === 'this_week' ? 'This Week' : r === 'this_month' ? 'This Month' : r === 'this_quarter' ? 'This Quarter' : 'All Time'}
            </button>
          ))}
          {dateRange === 'custom' && (
            <>
              <input type="date" className="tl-date-input" value={customStart} onChange={e => setCustomStart(e.target.value)} />
              <span style={{ fontSize: 10, color: 'var(--vl-text-muted)' }}>to</span>
              <input type="date" className="tl-date-input" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
            </>
          )}
          {dateRange !== 'custom' && (
            <button onClick={() => setDateRange('custom')} className="tl-date-btn">Custom</button>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 150 }}>
          <input className="cl-search-input" style={{ width: '100%' }} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search events..." />
        </div>
      </div>

      {/* Layout: Main + Sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }} className="tl-timeline-layout">
        {/* Main Timeline Column */}
        <div className="tl-container">
          {/* Today Indicator */}
          {dateRange !== 'today' && filteredEvents.some(ev => {
            const d = new Date(ev.timestamp)
            return d.toDateString() === now.toDateString()
          }) && (
            <div className="tl-today-indicator">
              <span className="tl-today-label">Today</span>
            </div>
          )}

          {/* Events */}
          {filteredEvents.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <Clock className="size-10" style={{ color: 'var(--vl-text-muted)', margin: '0 auto 12px', display: 'block' }} />
              <p style={{ fontSize: 13, color: 'var(--vl-text-muted)' }}>No events found matching filters</p>
            </div>
          )}

          {filteredEvents.map((ev, idx) => {
            const isMS = isMilestoneEvent(ev)
            const cfg = EVENT_TYPE_CONFIG[ev.type]
            const isExp = expandedIds.has(ev.id)
            const isLeft = idx % 2 === 0

            if (isMS) {
              const ms = ev as MilestoneEvent
              return (
                <div key={ev.id} className="tl-milestone-card" style={{ animationDelay: `${idx * 0.05}s`, '--tl-type-color': cfg.color } as React.CSSProperties}>
                  <div className="tl-milestone-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                      <div className="tl-type-icon tl-type-icon--milestone">{cfg.icon}</div>
                      <span className="tl-type-badge tl-type-badge--milestone">{cfg.label}</span>
                      <span className={`tl-milestone-status tl-milestone-status--${ms.milestoneStatus.replace(' ', '_')}`}>
                        {ms.milestoneStatus === 'on_track' ? <CheckCircle2 className="size-3" /> : ms.milestoneStatus === 'at_risk' ? <AlertTriangle className="size-3" /> : ms.milestoneStatus === 'delayed' ? <AlertTriangle className="size-3" /> : <CheckCircle2 className="size-3" />}
                        {ms.milestoneStatus.replace('_', ' ')}
                      </span>
                    </div>
                    {/* Progress Ring */}
                    <div className="tl-milestone-progress-ring">
                      <svg width="48" height="48" viewBox="0 0 48 48">
                        <circle cx="24" cy="24" r="20" fill="none" stroke="var(--vl-border)" strokeWidth="3" />
                        <circle cx="24" cy="24" r="20" fill="none" stroke={cfg.color} strokeWidth="3"
                          strokeDasharray={`${2 * Math.PI * 20}`}
                          strokeDashoffset={`${2 * Math.PI * 20 * (1 - ms.progress / 100)}`}
                          strokeLinecap="round" transform="rotate(-90 24 24)"
                          style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
                      </svg>
                      <span className="tl-milestone-progress-ring-text">{ms.progress}%</span>
                    </div>
                  </div>
                  <h4 className="tl-milestone-title">{ev.title}</h4>
                  <p className="tl-event-card-desc" style={{ fontSize: 11, color: 'var(--vl-text-muted)', lineHeight: 1.6 }}>{ev.description}</p>
                  <div className="tl-milestone-dates">
                    <span><Target className="size-3" /> Target: {new Date(ms.targetDate).toLocaleDateString()}</span>
                    {ms.actualDate && <span><CheckCircle2 className="size-3" style={{ color: '#10b981' }} /> Completed: {new Date(ms.actualDate).toLocaleDateString()}</span>}
                  </div>
                  {ms.dependencies.length > 0 && (
                    <div className="tl-milestone-dependencies">
                      <Link2 className="size-3" style={{ color: '#8b5cf6' }} />
                      {ms.dependencies.map(depId => {
                        const depEv = events.find(e => e.id === depId)
                        return depEv ? (
                          <span key={depId} className="tl-milestone-dep-link">
                            <ArrowUpDown className="size-3" /> {depEv.title}
                          </span>
                        ) : null
                      })}
                    </div>
                  )}
                  <div className="tl-event-card-meta">
                    <span className="tl-event-card-time"><Clock className="size-3" /> {new Date(ev.timestamp).toLocaleDateString()} · {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="tl-event-card-tag tl-event-card-priority tl-event-card-priority--{ev.priority}"><Star className="size-2.5" /> {ev.priority}</span>
                  </div>
                </div>
              )
            }

            return (
              <div key={ev.id} style={{ position: 'relative' }}>
                {/* Dot */}
                <div className="tl-event-dot" style={{ background: cfg.color, boxShadow: `0 0 8px ${cfg.color}40` } as React.CSSProperties} />
                {/* Card */}
                <div
                  className="tl-event-card"
                  style={{ animationDelay: `${idx * 0.05}s`, '--tl-type-color': cfg.color } as React.CSSProperties}
                  onClick={() => toggleExpand(ev.id)}
                >
                  <div className="tl-event-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                      <div className={`tl-type-icon tl-type-icon--${ev.type.replace('_', '-')}`}>{cfg.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="tl-event-card-title">{ev.title}</div>
                      </div>
                    </div>
                    <span className={`tl-type-badge tl-type-badge--${ev.type.replace('_', '-')}`}>{cfg.label}</span>
                  </div>
                  <div className="tl-event-card-meta">
                    <span className="tl-event-card-time"><Clock className="size-3" /> {new Date(ev.timestamp).toLocaleDateString()} · {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className={`tl-event-card-tag tl-event-card-priority tl-event-card-priority--${ev.priority}`}>{ev.priority}</span>
                  </div>
                  {/* Tags */}
                  {ev.tags.length > 0 && (
                    <div className="tl-event-card-tags">
                      {ev.tags.map(tag => (
                        <span key={tag} className="tl-event-card-tag"><Hash className="size-2.5" />{tag}</span>
                      ))}
                    </div>
                  )}
                  {/* Agent Chips */}
                  {ev.agentNames.length > 0 && (
                    <div className="tl-event-card-agents">
                      {ev.agentNames.map(name => (
                        <span key={name} className="tl-event-card-agent-chip" style={{ background: AGENT_COLORS[name] || '#6b7280' }}>
                          <Bot className="size-3" /> {name.split('-')[0]}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Meeting Link */}
                  {ev.meetingName && (
                    <div style={{ marginTop: 6 }}>
                      <span className="tl-event-card-tag" style={{ cursor: 'pointer' }}>
                        <MessageSquareText className="size-2.5" /> {ev.meetingName}
                      </span>
                    </div>
                  )}
                  {/* Expand/Collapse */}
                  <div style={{ marginTop: 6 }}>
                    <button className="tl-expand-btn" onClick={e => { e.stopPropagation(); toggleExpand(ev.id) }}>
                      {isExp ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                      {isExp ? 'Show less' : 'Show details'}
                    </button>
                  </div>
                  <div className={`tl-event-card-desc ${isExp ? 'tl-event-card-desc--expanded' : ''}`}>
                    <p>{ev.description}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Sidebar: Calendar + Event Density */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Mini Calendar */}
          <div className="tl-mini-calendar">
            <div className="tl-mini-cal-header">
              <span className="tl-mini-cal-title">
                {new Date(calYear, calMonth).toLocaleString('default', { month: 'long' })} {calYear}
              </span>
              <div className="tl-mini-cal-nav">
                <button className="tl-mini-cal-nav-btn" onClick={() => { setCalMonth(prev => prev === 0 ? 11 : prev - 1); if (calMonth === 0) setCalYear(prev => prev - 1) }}><ChevronLeft className="size-3" /></button>
                <button className="tl-mini-cal-nav-btn" onClick={() => { setCalMonth(prev => prev === 11 ? 0 : prev + 1); if (calMonth === 11) setCalYear(prev => prev + 1) }}><ChevronRight className="size-3" /></button>
              </div>
            </div>
            <div className="tl-mini-cal-grid">
              {calendarDays.dayHeaders.map(h => (
                <div key={h} className="tl-mini-cal-day-header">{h}</div>
              ))}
              {calendarDays.cells.map((cell, i) => {
                const hasEvents = cell.current && (calDayCounts[cell.day] || 0) > 0
                const isTodayCell = cell.current && isCurrentMonth && cell.day === today
                const isSelectedDay = cell.current && selectedCalDay === cell.day
                return (
                  <div
                    key={i}
                    className={`tl-mini-cal-day ${!cell.current ? 'tl-mini-cal-day--outside' : ''} ${hasEvents ? 'tl-mini-cal-day--has-events' : ''} ${isTodayCell ? 'tl-mini-cal-day--today' : ''} ${isSelectedDay ? 'tl-mini-cal-day--selected' : ''}`}
                    onClick={() => { if (cell.current) setSelectedCalDay(prev => prev === cell.day ? null : cell.day) }}
                  >
                    {cell.day}
                  </div>
                )
              })}
            </div>
            {selectedCalDay && (
              <div style={{ marginTop: 8, textAlign: 'center' }}>
                <button onClick={() => setSelectedCalDay(null)} className="tl-date-btn" style={{ fontSize: 10, padding: '3px 10px' }}>Clear day filter</button>
              </div>
            )}
          </div>

          {/* Event Density Legend */}
          <div className="tl-stat-card" style={{ animationDelay: '0.2s' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--vl-text-heading)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <TrendingUp className="size-3.5" style={{ color: '#10b981' }} /> Quick Stats
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Object.entries(stats.typeCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
                const cfg = EVENT_TYPE_CONFIG[type as TimelineEventType]
                return (
                  <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg?.color || '#6b7280', flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 10, color: 'var(--vl-text-muted)' }}>{cfg?.label || type}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--vl-text-heading)' }}>{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResearchTimeline
