import { NextRequest, NextResponse } from 'next/server'

// ============================================================
// Types
// ============================================================

interface AgentTemplate {
  id: string
  name: string
  role: string
  color: string
  icon: string
  gradient: string
  description: string
}

interface WorkspaceTemplate {
  id: string
  name: string
  description: string
  icon: string
  features: string[]
}

interface SampleMeetingConfig {
  topic: string
  meetingTypes: string[]
  durations: number[]
}

interface OnboardingDefaults {
  agentTemplates: AgentTemplate[]
  workspaceTemplates: WorkspaceTemplate[]
  sampleMeetingConfig: SampleMeetingConfig
  researchAreas: string[]
  roles: string[]
  avatarGradients: string[]
}

interface OnboardingData {
  profile: {
    name: string
    role: string
    researchArea: string
    institution: string
    avatarGradient: string
  }
  workspace: {
    name: string
    description: string
    templateId: string
  }
  selectedAgentIds: string[]
  meeting: {
    type: string
    topic: string
    duration: number
  }
  completed: boolean
}

// ============================================================
// Default Data
// ============================================================

const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: 'pi',
    name: 'Principal Investigator',
    role: 'Lab Leader & Strategist',
    color: '#10b981',
    icon: 'UserCircle',
    gradient: 'linear-gradient(135deg, #10b981, #059669)',
    description: 'Guides research direction, provides strategic oversight, and mentors team members with decades of experience.',
  },
  {
    id: 'critic',
    name: 'Scientific Critic',
    role: 'Quality Assurance',
    color: '#f59e0b',
    icon: 'Shield',
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    description: 'Challenges assumptions, identifies methodological weaknesses, and ensures scientific rigor.',
  },
  {
    id: 'compbio',
    name: 'Computational Biologist',
    role: 'Data & Modeling Expert',
    color: '#06b6d4',
    icon: 'Cpu',
    gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)',
    description: 'Specializes in computational analysis, molecular modeling, and large-scale biological data processing.',
  },
  {
    id: 'immuno',
    name: 'Immunologist',
    role: 'Immune System Expert',
    color: '#8b5cf6',
    icon: 'HeartPulse',
    gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    description: 'Deep expertise in immunology, antibody engineering, and immune response analysis.',
  },
  {
    id: 'mleng',
    name: 'ML Engineer',
    role: 'Machine Learning Specialist',
    color: '#ec4899',
    icon: 'BrainCircuit',
    gradient: 'linear-gradient(135deg, #ec4899, #db2777)',
    description: 'Designs and optimizes ML models for protein structure prediction, drug discovery, and genomics.',
  },
  {
    id: 'bioinfo',
    name: 'Bioinformatician',
    role: 'Sequence & Data Analysis',
    color: '#3b82f6',
    icon: 'Dna',
    gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    description: 'Expert in sequence analysis, phylogenetics, pathway analysis, and genomic data interpretation.',
  },
]

const WORKSPACE_TEMPLATES: WorkspaceTemplate[] = [
  {
    id: 'quickstart',
    name: 'Quick Start',
    description: 'Pre-configured with sample agents, meetings, and experiments to get you going fast.',
    icon: 'Zap',
    features: ['3 pre-configured agents', 'Sample meeting templates', 'Example experiments', 'Knowledge base starter'],
  },
  {
    id: 'academic',
    name: 'Academic Lab',
    description: 'Focused on paper review, research discussions, and academic collaboration workflows.',
    icon: 'GraduationCap',
    features: ['Literature review tools', 'Paper annotation system', 'Research discussion boards', 'Publication tracking'],
  },
  {
    id: 'industry',
    name: 'Industry R&D',
    description: 'Project management and product development with milestones and deliverables tracking.',
    icon: 'Building2',
    features: ['Project pipeline tracking', 'Milestone management', 'Deliverable planning', 'Team workload view'],
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Start from scratch and build your workspace exactly how you want it.',
    icon: 'Wrench',
    features: ['Full customization', 'Flexible structure', 'Import existing data', 'Advanced configuration'],
  },
]

const SAMPLE_MEETING_CONFIG: SampleMeetingConfig = {
  topic: 'Overview of nanobody design optimization strategies',
  meetingTypes: ['Team Meeting', 'Individual Review'],
  durations: [15, 30, 45, 60],
}

const RESEARCH_AREAS = [
  'Nanobody Engineering',
  'Protein Structure',
  'Drug Discovery',
  'Computational Biology',
  'Immunology',
  'Genomics',
  'Neuroscience',
]

const ROLES = [
  'PI',
  'Postdoc',
  'PhD Student',
  'Researcher',
  'Lab Manager',
  'Industry Scientist',
  'Other',
]

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #8b5cf6, #7c3aed)',
  'linear-gradient(135deg, #06b6d4, #0891b2)',
  'linear-gradient(135deg, #f59e0b, #d97706)',
  'linear-gradient(135deg, #ec4899, #db2777)',
  'linear-gradient(135deg, #3b82f6, #2563eb)',
]

// ============================================================
// In-memory store (simulates persistent storage)
// ============================================================

let onboardingStore: Record<string, OnboardingData> = {}

// ============================================================
// GET /api/onboarding — Return default onboarding data
// ============================================================

export async function GET() {
  try {
    const defaults: OnboardingDefaults = {
      agentTemplates: AGENT_TEMPLATES,
      workspaceTemplates: WORKSPACE_TEMPLATES,
      sampleMeetingConfig: SAMPLE_MEETING_CONFIG,
      researchAreas: RESEARCH_AREAS,
      roles: ROLES,
      avatarGradients: AVATAR_GRADIENTS,
    }

    return NextResponse.json({
      success: true,
      data: defaults,
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch onboarding defaults' },
      { status: 500 }
    )
  }
}

// ============================================================
// POST /api/onboarding — Save completed onboarding data
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { profile, workspace, selectedAgentIds, meeting } = body

    if (!profile || !profile.name) {
      return NextResponse.json(
        { success: false, error: 'Profile name is required' },
        { status: 400 }
      )
    }

    const recordId = `ob-${Date.now()}`
    const record: OnboardingData = {
      profile: {
        name: (profile.name || '').trim(),
        role: profile.role || 'Researcher',
        researchArea: profile.researchArea || '',
        institution: profile.institution || '',
        avatarGradient: profile.avatarGradient || AVATAR_GRADIENTS[0],
      },
      workspace: {
        name: (workspace?.name || '').trim() || 'My Research Lab',
        description: workspace?.description || '',
        templateId: workspace?.templateId || 'quickstart',
      },
      selectedAgentIds: selectedAgentIds || [],
      meeting: {
        type: meeting?.type || 'Team Meeting',
        topic: (meeting?.topic || '').trim() || SAMPLE_MEETING_CONFIG.topic,
        duration: meeting?.duration || 30,
      },
      completed: true,
    }

    onboardingStore[recordId] = record

    return NextResponse.json(
      {
        success: true,
        data: record,
        id: recordId,
      },
      { status: 201 }
    )
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to save onboarding data' },
      { status: 500 }
    )
  }
}
