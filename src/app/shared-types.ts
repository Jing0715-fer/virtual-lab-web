import React from 'react'
import {
  CheckCircle2, Play, MessageCircle, UserPlus, Clock,
  Bot as BotIcon, Crown, ShieldAlert, Microscope, Beaker, Atom, FlaskRound, Brain, Eye,
  Dna, Cpu, FlaskConical, GitBranch, BookOpen, ThermometerSun,
} from 'lucide-react'

// ============================================================
// Types
// ============================================================

export interface Agent {
  id: string
  title: string
  expertise: string
  goal: string
  role: string
  model: string
  color: string
  icon: string
  createdAt: string
  updatedAt: string
}

export interface DiscussionMessage {
  id: string
  agentName: string
  message: string
  roundIndex: number
  createdAt: string
  teamMeetingId?: string | null
  individualMeetingId?: string | null
}

export interface Meeting {
  id: string
  type: 'team' | 'individual'
  agenda: string
  agendaQuestions: string[]
  agendaRules: string[]
  status: 'draft' | 'running' | 'completed'
  summary: string | null
  saveName: string
  createdAt: string
  updatedAt: string
  teamLeadId?: string
  teamLead?: Agent
  teamMembers?: Agent[]
  numRounds?: number
  temperature: number
  teamMemberId?: string
  teamMember?: Agent
  messages: DiscussionMessage[]
}

export type TabValue = 'dashboard' | 'agents' | 'team-meeting' | 'individual-meeting' | 'history' | 'pipeline' | 'knowledge-base' | 'research-papers' | 'bio-tools' | 'settings'

export interface CollaborationNode { id: string; name: string; meetings: number; color: string }
export interface CollaborationEdge { source: string; target: string; weight: number; sharedMeetingIds: string[] }
export interface AnalyticsData {
  meetingsByDay: { date: string; team: number; individual: number }[]
  agentParticipation: { agentName: string; count: number }[]
  meetingTypeRatio: { team: number; individual: number }
  totalMessages: number
  avgMessagesPerMeeting: number
  collaborationNetwork: { nodes: CollaborationNode[]; edges: CollaborationEdge[] }
  messageTimeline: { hour: number; agentName: string; count: number }[]
  workflowProgress: Record<string, number>
}

export interface PipelineStageData {
  id: string
  title: string
  order: number
  color: string
  pipelineId: string
  tasks: PipelineTaskData[]
  createdAt: string
  updatedAt: string
}

export interface PipelineTaskData {
  id: string
  title: string
  description: string
  status: string
  priority: string
  order: number
  stageId: string
  assigneeId: string | null
  assignee: Agent | null
  meetingId: string | null
  dueDate: string | null
  tags: string
  createdAt: string
  updatedAt: string
}

export interface PipelineData {
  id: string
  name: string
  description: string
  stages: PipelineStageData[]
  createdAt: string
  updatedAt: string
}

export interface NotificationData {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  link: string | null
  createdAt: string
}

// ============================================================
// Constants
// ============================================================

export const PIPELINE_TEMPLATES = [
  { value: 'research', label: 'Research Pipeline', description: 'Hypothesis → Experiment → Data → Analysis → Publication', stages: [
    { title: 'Hypothesis', order: 0, color: '#8b5cf6' },
    { title: 'Experiment Design', order: 1, color: '#3b82f6' },
    { title: 'Data Collection', order: 2, color: '#10b981' },
    { title: 'Analysis', order: 3, color: '#f59e0b' },
    { title: 'Publication', order: 4, color: '#ef4444' },
  ]},
  { value: 'development', label: 'Development Pipeline', description: 'Backlog → To Do → In Progress → Review → Done', stages: [
    { title: 'Backlog', order: 0, color: '#6b7280' },
    { title: 'To Do', order: 1, color: '#3b82f6' },
    { title: 'In Progress', order: 2, color: '#f59e0b' },
    { title: 'Review', order: 3, color: '#8b5cf6' },
    { title: 'Done', order: 4, color: '#10b981' },
  ]},
  { value: 'blank', label: 'Blank Board', description: 'Simple To Do → In Progress → Done', stages: [
    { title: 'To Do', order: 0, color: '#3b82f6' },
    { title: 'In Progress', order: 1, color: '#f59e0b' },
    { title: 'Done', order: 2, color: '#10b981' },
  ]},
]

export const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-500',
  medium: 'bg-blue-500',
  high: 'bg-amber-500',
  critical: 'bg-red-500',
}

export const PRIORITY_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}

export const NOTIFICATION_ICONS: Record<string, React.ElementType> = {
  meeting_completed: CheckCircle2,
  meeting_started: Play,
  agent_message: MessageCircle,
  task_assigned: UserPlus,
  task_due: Clock,
}

export const AGENT_ICON_OPTIONS = [
  { value: 'bot', label: 'Bot', Icon: BotIcon },
  { value: 'crown', label: 'Crown', Icon: Crown },
  { value: 'shield-alert', label: 'Critic', Icon: ShieldAlert },
  { value: 'microscope', label: 'Microscope', Icon: Microscope },
  { value: 'beaker', label: 'Beaker', Icon: Beaker },
  { value: 'atom', label: 'Atom', Icon: Atom },
  { value: 'flask-round', label: 'Flask', Icon: FlaskRound },
  { value: 'brain', label: 'Brain', Icon: Brain },
  { value: 'eye', label: 'Eye', Icon: Eye },
]

export const AGENT_COLOR_OPTIONS = [
  '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#06b6d4',
  '#f97316', '#ec4899', '#14b8a6', '#a855f7', '#84cc16',
]

export const MODEL_OPTIONS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo']

export const AGENT_TEMPLATES = [
  { title: 'Computational Biologist', expertise: 'Computational protein design and molecular modeling', goal: 'Design novel protein structures using computational methods', role: 'Lead computational design and analysis of protein candidates', icon: 'atom', color: '#06b6d4' },
  { title: 'Immunologist', expertise: 'Immune system and antibody responses', goal: 'Optimize nanobody candidates for immune system compatibility', role: 'Evaluate immunogenicity and immune response of designed proteins', icon: 'shield-alert', color: '#f59e0b' },
  { title: 'Machine Learning Engineer', expertise: 'Deep learning for protein structure prediction', goal: 'Apply ML models to predict and optimize protein structures', role: 'Run and interpret ML-based structure predictions', icon: 'brain', color: '#8b5cf6' },
  { title: 'Bioinformatician', expertise: 'Sequence analysis and genomic data', goal: 'Analyze sequence data to guide protein design decisions', role: 'Perform sequence-based analysis and identify design targets', icon: 'database', color: '#14b8a6' },
]

export const NANOBODY_WORKFLOW_STEPS = [
  { name: 'ESM', description: 'Sequence generation', icon: Dna, color: '#10b981' },
  { name: 'AlphaFold-Multimer', description: 'Structure prediction', icon: Cpu, color: '#8b5cf6' },
  { name: 'Rosetta', description: 'Energy scoring', icon: FlaskConical, color: '#f59e0b' },
  { name: 'Combine Scores', description: 'Rank candidates', icon: GitBranch, color: '#06b6d4' },
  { name: 'Select Nanobodies', description: 'Final selection', icon: CheckCircle2, color: '#ef4444' },
]

export const QUICK_START_AGENDA = `Design SARS-CoV-2 nanobodies with enhanced binding affinity and stability.

Key objectives:
1. Generate candidate nanobody sequences using ESM
2. Predict structures with AlphaFold-Multimer
3. Score candidates using Rosetta energy calculations
4. Select top candidates for experimental validation

Focus on nanobodies targeting the receptor-binding domain (RBD) of the spike protein.`
