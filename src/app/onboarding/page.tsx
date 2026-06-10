'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Rocket, User, Folder, Bot, Play, ChevronLeft, ChevronRight,
  Check, Users, BookOpen, Sparkles, Zap, GraduationCap, Building2,
  Wrench, UserCircle, Shield, Cpu, HeartPulse, BrainCircuit, Dna,
  X, Clock, MessageSquare, ArrowRight
} from 'lucide-react'

// ============================================================
// Types & Constants
// ============================================================

interface StepDef {
  id: number
  label: string
  icon: React.ReactNode
}

const STEPS: StepDef[] = [
  { id: 1, label: 'Welcome', icon: React.createElement(Rocket) },
  { id: 2, label: 'Profile', icon: React.createElement(User) },
  { id: 3, label: 'Workspace', icon: React.createElement(Folder) },
  { id: 4, label: 'Agents', icon: React.createElement(Bot) },
  { id: 5, label: 'First Meeting', icon: React.createElement(Play) },
]

interface AgentDef {
  id: string
  name: string
  role: string
  color: string
  iconEl: React.ReactNode
  gradient: string
  description: string
}

const AGENTS: AgentDef[] = [
  {
    id: 'pi', name: 'Principal Investigator', role: 'Lab Leader & Strategist',
    color: '#10b981', iconEl: React.createElement(UserCircle),
    gradient: 'linear-gradient(135deg, #10b981, #059669)',
    description: 'Guides research direction, provides strategic oversight, and mentors team members.',
  },
  {
    id: 'critic', name: 'Scientific Critic', role: 'Quality Assurance',
    color: '#f59e0b', iconEl: React.createElement(Shield),
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    description: 'Challenges assumptions, identifies weaknesses, and ensures scientific rigor.',
  },
  {
    id: 'compbio', name: 'Computational Biologist', role: 'Data & Modeling Expert',
    color: '#06b6d4', iconEl: React.createElement(Cpu),
    gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)',
    description: 'Specializes in computational analysis, molecular modeling, and data processing.',
  },
  {
    id: 'immuno', name: 'Immunologist', role: 'Immune System Expert',
    color: '#8b5cf6', iconEl: React.createElement(HeartPulse),
    gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    description: 'Deep expertise in immunology, antibody engineering, and immune response analysis.',
  },
  {
    id: 'mleng', name: 'ML Engineer', role: 'Machine Learning Specialist',
    color: '#ec4899', iconEl: React.createElement(BrainCircuit),
    gradient: 'linear-gradient(135deg, #ec4899, #db2777)',
    description: 'Designs ML models for protein structure prediction, drug discovery, and genomics.',
  },
  {
    id: 'bioinfo', name: 'Bioinformatician', role: 'Sequence & Data Analysis',
    color: '#3b82f6', iconEl: React.createElement(Dna),
    gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    description: 'Expert in sequence analysis, phylogenetics, pathway analysis, and genomics.',
  },
]

interface WorkspaceTpl {
  id: string
  name: string
  description: string
  iconEl: React.ReactNode
  features: string[]
}

const WORKSPACE_TEMPLATES: WorkspaceTpl[] = [
  {
    id: 'quickstart', name: 'Quick Start',
    description: 'Pre-configured with sample agents, meetings, and experiments.',
    iconEl: React.createElement(Zap),
    features: ['3 pre-configured agents', 'Sample meeting templates', 'Example experiments', 'Knowledge base starter'],
  },
  {
    id: 'academic', name: 'Academic Lab',
    description: 'Focused on paper review and research discussions.',
    iconEl: React.createElement(GraduationCap),
    features: ['Literature review tools', 'Paper annotation', 'Research discussions', 'Publication tracking'],
  },
  {
    id: 'industry', name: 'Industry R&D',
    description: 'Project management and product development.',
    iconEl: React.createElement(Building2),
    features: ['Project pipeline', 'Milestone management', 'Deliverable planning', 'Team workload view'],
  },
  {
    id: 'custom', name: 'Custom',
    description: 'Start from scratch and build your workspace.',
    iconEl: React.createElement(Wrench),
    features: ['Full customization', 'Flexible structure', 'Import existing data', 'Advanced config'],
  },
]

const ROLES = ['PI', 'Postdoc', 'PhD Student', 'Researcher', 'Lab Manager', 'Industry Scientist', 'Other']
const RESEARCH_AREAS = ['Nanobody Engineering', 'Protein Structure', 'Drug Discovery', 'Computational Biology', 'Immunology', 'Genomics', 'Neuroscience']
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #8b5cf6, #7c3aed)',
  'linear-gradient(135deg, #06b6d4, #0891b2)',
  'linear-gradient(135deg, #f59e0b, #d97706)',
  'linear-gradient(135deg, #ec4899, #db2777)',
  'linear-gradient(135deg, #3b82f6, #2563eb)',
]
const DURATIONS = [15, 30, 45, 60]

const STORAGE_STEP_KEY = 'vl-onboarding-step'
const STORAGE_DATA_KEY = 'vl-onboarding-data'

// ============================================================
// Helpers
// ============================================================

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return (parts[0] || '?').slice(0, 2).toUpperCase()
}

function loadPersistedStep(): number {
  if (typeof window === 'undefined') return 1
  try {
    const raw = localStorage.getItem(STORAGE_STEP_KEY)
    if (raw) {
      const parsed = parseInt(raw, 10)
      if (parsed >= 1 && parsed <= 5) return parsed
    }
  } catch { /* noop */ }
  return 1
}

function saveStep(step: number): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(STORAGE_STEP_KEY, String(step)) } catch { /* noop */ }
}

function loadPersistedData(): Record<string, unknown> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_DATA_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* noop */ }
  return {}
}

function saveData(data: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(STORAGE_DATA_KEY, JSON.stringify(data)) } catch { /* noop */ }
}

function markCompleted(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_STEP_KEY, 'completed')
    localStorage.setItem(STORAGE_DATA_KEY, JSON.stringify({ completed: true }))
  } catch { /* noop */ }
}

function isOnboardingComplete(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(STORAGE_STEP_KEY) === 'completed'
  } catch { /* noop */ }
  return false
}

// ============================================================
// DNA Helix SVG (decorative, spinning)
// ============================================================

function DnaHelixSvg() {
  return (
    <div className="ob-dna-helix">
      <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 5 C20 20, 40 20, 40 30 C40 40, 20 40, 20 55" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.6" />
        <path d="M40 5 C40 20, 20 20, 20 30 C20 40, 40 40, 40 55" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.5" />
        <line x1="24" y1="12" x2="36" y2="12" stroke="#10b981" strokeWidth="1.5" opacity="0.4" />
        <line x1="22" y1="20" x2="38" y2="20" stroke="#8b5cf6" strokeWidth="1.5" opacity="0.35" />
        <line x1="22" y1="30" x2="38" y2="30" stroke="#10b981" strokeWidth="1.5" opacity="0.5" />
        <line x1="22" y1="40" x2="38" y2="40" stroke="#8b5cf6" strokeWidth="1.5" opacity="0.35" />
        <line x1="24" y1="48" x2="36" y2="48" stroke="#10b981" strokeWidth="1.5" opacity="0.4" />
      </svg>
    </div>
  )
}

// ============================================================
// Completion Checkmark SVG
// ============================================================

function CompletionCheckmark() {
  return (
    <div className="ob-completion-check">
      <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle className="ob-check-circle" cx="40" cy="40" r="36" />
        <path className="ob-check-mark" d="M24 40 L35 51 L56 30" />
      </svg>
    </div>
  )
}

// ============================================================
// Main Onboarding Page
// ============================================================

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('left')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Profile state
  const [displayName, setDisplayName] = useState('')
  const [displayNameError, setDisplayNameError] = useState('')
  const [userRole, setUserRole] = useState('Researcher')
  const [researchArea, setResearchArea] = useState('')
  const [institution, setInstitution] = useState('')
  const [avatarGradient, setAvatarGradient] = useState(AVATAR_GRADIENTS[0])

  // Workspace state
  const [workspaceName, setWorkspaceName] = useState('My Research Lab')
  const [workspaceDesc, setWorkspaceDesc] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('')

  // Agent state
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])

  // Meeting state
  const [meetingType, setMeetingType] = useState('Team Meeting')
  const [meetingTopic, setMeetingTopic] = useState('Overview of nanobody design optimization strategies')
  const [meetingDuration, setMeetingDuration] = useState(30)

  // Typing animation
  const [typingText, setTypingText] = useState('')
  const typingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const typingTarget = "Let's build something amazing together."

  // Load persisted state on mount
  useEffect(() => {
    setMounted(true)
    if (isOnboardingComplete()) {
      setIsComplete(true)
      return
    }
    const step = loadPersistedStep()
    setCurrentStep(step)
    const saved = loadPersistedData()
    if (saved.name) setDisplayName(String(saved.name))
    if (saved.role) setUserRole(String(saved.role))
    if (saved.researchArea) setResearchArea(String(saved.researchArea))
    if (saved.institution) setInstitution(String(saved.institution))
    if (saved.avatarGradient) setAvatarGradient(String(saved.avatarGradient))
    if (saved.workspaceName) setWorkspaceName(String(saved.workspaceName))
    if (saved.workspaceDesc) setWorkspaceDesc(String(saved.workspaceDesc))
    if (saved.selectedTemplate) setSelectedTemplate(String(saved.selectedTemplate))
    if (Array.isArray(saved.selectedAgents)) setSelectedAgents(saved.selectedAgents as string[])
    if (saved.meetingType) setMeetingType(String(saved.meetingType))
    if (saved.meetingTopic) setMeetingTopic(String(saved.meetingTopic))
    if (saved.meetingDuration) setMeetingDuration(Number(saved.meetingDuration))
  }, [])

  // Typing animation
  useEffect(() => {
    if (currentStep !== 1 || !mounted) return
    let idx = 0
    setTypingText('')
    typingRef.current = setInterval(() => {
      idx++
      setTypingText(typingTarget.slice(0, idx))
      if (idx >= typingTarget.length && typingRef.current) {
        clearInterval(typingRef.current)
      }
    }, 60)
    return () => {
      if (typingRef.current) clearInterval(typingRef.current)
    }
  }, [currentStep, mounted])

  // Persist data on changes
  const persistState = useCallback(() => {
    saveData({
      name: displayName,
      role: userRole,
      researchArea,
      institution,
      avatarGradient,
      workspaceName,
      workspaceDesc,
      selectedTemplate,
      selectedAgents,
      meetingType,
      meetingTopic,
      meetingDuration,
    })
  }, [displayName, userRole, researchArea, institution, avatarGradient, workspaceName, workspaceDesc, selectedTemplate, selectedAgents, meetingType, meetingTopic, meetingDuration])

  useEffect(() => {
    if (mounted) persistState()
  }, [persistState, mounted])

  // ---- Navigation ----
  const goToStep = useCallback((step: number, dir: 'left' | 'right') => {
    if (isTransitioning) return
    setSlideDir(dir)
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentStep(step)
      saveStep(step)
      setTimeout(() => setIsTransitioning(false), 50)
    }, 200)
  }, [isTransitioning])

  const goNext = useCallback(() => {
    if (currentStep < 5) goToStep(currentStep + 1, 'left')
  }, [currentStep, goToStep])

  const goBack = useCallback(() => {
    if (currentStep > 1) goToStep(currentStep - 1, 'right')
  }, [currentStep, goToStep])

  const skipOnboarding = useCallback(() => {
    markCompleted()
    setIsComplete(true)
  }, [])

  const handleComplete = useCallback(() => {
    markCompleted()
    setIsComplete(true)
    // POST to API
    try {
      fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: { name: displayName, role: userRole, researchArea, institution, avatarGradient },
          workspace: { name: workspaceName, description: workspaceDesc, templateId: selectedTemplate },
          selectedAgentIds: selectedAgents,
          meeting: { type: meetingType, topic: meetingTopic, duration: meetingDuration },
        }),
      }).catch(() => { /* best-effort */ })
    } catch { /* noop */ }
  }, [displayName, userRole, researchArea, institution, avatarGradient, workspaceName, workspaceDesc, selectedTemplate, selectedAgents, meetingType, meetingTopic, meetingDuration])

  // ---- Step 2 validation ----
  const validateStep2 = useCallback((): boolean => {
    if (!displayName.trim()) {
      setDisplayNameError('Display name is required')
      return false
    }
    setDisplayNameError('')
    return true
  }, [displayName])

  const handleContinue = useCallback(() => {
    if (currentStep === 2 && !validateStep2()) return
    if (currentStep === 5) {
      handleComplete()
      return
    }
    goNext()
  }, [currentStep, validateStep2, handleComplete, goNext])

  // ---- Agent toggle ----
  const toggleAgent = useCallback((id: string) => {
    setSelectedAgents(prev => {
      if (prev.includes(id)) return prev.filter(a => a !== id)
      return [...prev, id]
    })
  }, [])

  const selectAllAgents = useCallback(() => {
    setSelectedAgents(AGENTS.map(a => a.id))
  }, [])

  const deselectAllAgents = useCallback(() => {
    setSelectedAgents([])
  }, [])

  // ---- Slide class ----
  const slideClass = isTransitioning
    ? (slideDir === 'left' ? 'ob-content-slide-enter-left' : 'ob-content-slide-enter-right')
    : 'ob-content-slide-active'

  // ---- Don't render until hydrated ----
  if (!mounted) {
    return (
      <div className="ob-wizard" style={{ minHeight: '100vh' }}>
        <div className="ob-card" style={{ opacity: 0.5, padding: 40, textAlign: 'center' }}>
          <p style={{ color: 'var(--vl-text-muted)' }}>Loading...</p>
        </div>
      </div>
    )
  }

  // ============================================================
  // Completion Screen
  // ============================================================
  if (isComplete) {
    return (
      <div className="ob-wizard">
        <div className="ob-card">
          <div className="ob-completion">
            <CompletionCheckmark />
            <h1 className="ob-completion-title">You're All Set! 🎉</h1>
            <p className="ob-completion-subtitle">Your workspace is ready. Let's dive into your research.</p>

            <div className="ob-summary-card">
              <div className="ob-summary-section">
                <div className="ob-summary-label">Profile</div>
                <div className="ob-summary-value">
                  {displayName && <span><strong>{displayName}</strong>{userRole !== 'Researcher' ? ` — ${userRole}` : ''}</span>}
                  {researchArea && <span> | {researchArea}</span>}
                </div>
              </div>

              {selectedAgents.length > 0 && (
                <div className="ob-summary-section">
                  <div className="ob-summary-label">Selected Agents ({selectedAgents.length})</div>
                  <div className="ob-summary-agents">
                    {selectedAgents.map(agentId => {
                      const found = AGENTS.find(a => a.id === agentId)
                      return found && (
                        <span key={agentId} className="ob-summary-agent-chip">
                          <span className="ob-summary-agent-dot" style={{ background: found.color }} />
                          {found.name}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}

              {meetingTopic && (
                <div className="ob-summary-section">
                  <div className="ob-summary-label">First Meeting</div>
                  <div className="ob-summary-value">
                    {meetingType} — {meetingDuration} min<br />
                    <span style={{ color: 'var(--vl-text-muted)', fontSize: 'var(--vl-text-xs)' }}>{meetingTopic}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="ob-completion-cta">
              <a href="/virtual-lab" className="ob-dashboard-btn">
                Go to Dashboard
                <ArrowRight size={18} />
              </a>
              <span className="ob-explore-link">Explore the onboarding tour</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ============================================================
  // Step Progress Bar
  // ============================================================
  const stepProgressBar = (
    <div className="ob-progress-bar">
      {STEPS.map((step, idx) => {
        const isCompleted = currentStep > step.id
        const isActive = currentStep === step.id
        return (
          <React.Fragment key={step.id}>
            {idx > 0 && (
              <div
                className={`ob-step-line ${idx < currentStep ? 'completed' : ''}`}
                style={{
                  position: 'absolute',
                  left: `${(idx - 0.5) * 20 + 5}%`,
                  width: `${20}%`,
                  top: 20,
                }}
              />
            )}
            <div className="ob-step" style={{ position: 'relative', zIndex: 2 }}>
              <div className={`ob-step-circle ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}>
                {isCompleted ? <Check size={16} /> : step.icon}
              </div>
              <span className={`ob-step-label ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}>
                {step.label}
              </span>
            </div>
          </React.Fragment>
        )
      })}
    </div>
  )

  // ============================================================
  // Step 1: Welcome
  // ============================================================
  const stepWelcome = (
    <div className={`ob-content-slide ${slideClass}`}>
      <div style={{ textAlign: 'center' }}>
        <h1 className="ob-welcome-title">Welcome to Virtual Lab! 🧬</h1>
        <DnaHelixSvg />

        <div className="ob-feature-grid">
          <div className="ob-feature-card ob-stagger">
            <div className="ob-feature-icon emerald">
              <Bot size={24} />
            </div>
            <div className="ob-feature-title">AI-Powered Meetings</div>
            <div className="ob-feature-desc">Collaborate with AI agents to explore research ideas</div>
          </div>
          <div className="ob-feature-card ob-stagger">
            <div className="ob-feature-icon violet">
              <BookOpen size={24} />
            </div>
            <div className="ob-feature-title">Knowledge Management</div>
            <div className="ob-feature-desc">Organize papers, experiments, and insights</div>
          </div>
          <div className="ob-feature-card ob-stagger">
            <div className="ob-feature-icon cyan">
              <Users size={24} />
            </div>
            <div className="ob-feature-title">Team Collaboration</div>
            <div className="ob-feature-desc">Work together across disciplines and institutions</div>
          </div>
        </div>

        <div className="ob-typing">
          <Sparkles size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6, color: 'var(--vl-accent)' }} />
          {typingText}
          <span className="ob-typing-cursor" />
        </div>
      </div>
    </div>
  )

  // ============================================================
  // Step 2: Profile Setup
  // ============================================================
  const stepProfile = (
    <div className={`ob-content-slide ${slideClass}`}>
      <div className="ob-step-header">
        <h2 className="ob-step-title">Tell us about yourself</h2>
        <p className="ob-step-subtitle">This helps us personalize your Virtual Lab experience.</p>
      </div>

      <div className="ob-form-group">
        <label className="ob-form-label">Display Name <span style={{ color: '#ef4444' }}>*</span></label>
        <input
          className={`ob-form-input ${displayNameError ? 'error' : ''}`}
          placeholder="Dr. Jane Smith"
          value={displayName}
          onChange={e => { setDisplayName(e.target.value); if (displayNameError) setDisplayNameError('') }}
        />
        {displayNameError && <div className="ob-form-error">{displayNameError}</div>}
      </div>

      <div className="ob-form-group">
        <label className="ob-form-label">Role / Title</label>
        <select className="ob-form-select" value={userRole} onChange={e => setUserRole(e.target.value)}>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div className="ob-form-group">
        <label className="ob-form-label">Research Area</label>
        <input
          className="ob-form-input"
          placeholder="e.g., Nanobody Engineering"
          value={researchArea}
          onChange={e => setResearchArea(e.target.value)}
        />
        <div className="ob-suggestions">
          {RESEARCH_AREAS.map(area => (
            <button
              key={area}
              className="ob-suggestion-tag"
              onClick={() => setResearchArea(area)}
              type="button"
            >
              {area}
            </button>
          ))}
        </div>
      </div>

      <div className="ob-form-group">
        <label className="ob-form-label">Institution</label>
        <input
          className="ob-form-input"
          placeholder="e.g., MIT, Stanford, Genentech"
          value={institution}
          onChange={e => setInstitution(e.target.value)}
        />
      </div>

      <div className="ob-form-group">
        <label className="ob-form-label">Avatar Color</label>
        <div className="ob-avatar-picker">
          {AVATAR_GRADIENTS.map(g => (
            <div
              key={g}
              className={`ob-avatar-circle ${avatarGradient === g ? 'selected' : ''}`}
              style={{ background: g }}
              onClick={() => setAvatarGradient(g)}
            />
          ))}
          <div className="ob-avatar-preview">
            <div
              className="ob-avatar-preview-circle"
              style={{ background: avatarGradient }}
            >
              {displayName ? getInitials(displayName) : 'JS'}
            </div>
            <span style={{ fontSize: 'var(--vl-text-xs)', color: 'var(--vl-text-muted)' }}>Preview</span>
          </div>
        </div>
      </div>
    </div>
  )

  // ============================================================
  // Step 3: Workspace Configuration
  // ============================================================
  const stepWorkspace = (
    <div className={`ob-content-slide ${slideClass}`}>
      <div className="ob-step-header">
        <h2 className="ob-step-title">Create Your Workspace</h2>
        <p className="ob-step-subtitle">Choose a template to get started quickly, or start from scratch.</p>
      </div>

      <div className="ob-form-group">
        <label className="ob-form-label">Workspace Name</label>
        <input
          className="ob-form-input"
          placeholder="My Research Lab"
          value={workspaceName}
          onChange={e => setWorkspaceName(e.target.value)}
        />
      </div>

      <div className="ob-form-group">
        <label className="ob-form-label">Description <span style={{ color: 'var(--vl-text-muted)', fontWeight: 400 }}>(optional)</span></label>
        <textarea
          className="ob-form-textarea"
          placeholder="Describe your lab's focus..."
          value={workspaceDesc}
          onChange={e => setWorkspaceDesc(e.target.value)}
        />
      </div>

      <label className="ob-form-label">Choose a Template</label>
      <div className="ob-template-grid">
        {WORKSPACE_TEMPLATES.map(tpl => (
          <div
            key={tpl.id}
            className={`ob-template-card ob-stagger ${selectedTemplate === tpl.id ? 'selected' : ''}`}
            onClick={() => setSelectedTemplate(tpl.id)}
          >
            {selectedTemplate === tpl.id && (
              <div className="ob-template-badge">✓ Configured!</div>
            )}
            <div className="ob-template-icon">{tpl.iconEl}</div>
            <div className="ob-template-title">{tpl.name}</div>
            <div className="ob-template-desc">{tpl.description}</div>
            <ul className="ob-template-features">
              {tpl.features.map(f => <li key={f}>{f}</li>)}
            </ul>
            <button className="ob-template-choose-btn" type="button" onClick={() => setSelectedTemplate(tpl.id)}>
              {selectedTemplate === tpl.id ? 'Selected' : 'Choose'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )

  // ============================================================
  // Step 4: Agent Selection
  // ============================================================
  const stepAgents = (
    <div className={`ob-content-slide ${slideClass}`}>
      <div className="ob-step-header">
        <h2 className="ob-step-title">Choose Your AI Agents</h2>
        <p className="ob-step-subtitle">We'll set up these agents to help you get started. You can add more later.</p>
      </div>

      <div className="ob-agent-header-actions">
        <button className="ob-agent-action-btn" type="button" onClick={selectAllAgents}>
          Select All
        </button>
        <button className="ob-agent-action-btn" type="button" onClick={deselectAllAgents}>
          Deselect All
        </button>
        {selectedAgents.length > 0 && (
          <span className="ob-agent-count">{selectedAgents.length} selected</span>
        )}
      </div>

      <div className="ob-agent-grid">
        {AGENTS.map(agent => {
          const isSelected = selectedAgents.includes(agent.id)
          return (
            <div
              key={agent.id}
              className={`ob-agent-card ob-stagger ${isSelected ? 'selected' : ''}`}
              onClick={() => toggleAgent(agent.id)}
            >
              <div className="ob-agent-avatar" style={{ background: agent.gradient }}>
                {agent.iconEl && React.cloneElement(agent.iconEl as React.ReactElement<{ size?: number; style?: React.CSSProperties }>, { size: 22, style: { color: '#ffffff' } })}
                {isSelected && (
                  <div className="ob-agent-check">
                    <Check size={10} className="ob-agent-check-icon" style={{ color: '#ffffff' }} />
                  </div>
                )}
              </div>
              <div className="ob-agent-info">
                <div className="ob-agent-name">{agent.name}</div>
                <div className="ob-agent-role">{agent.role}</div>
                <div className="ob-agent-desc">{agent.description}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  // ============================================================
  // Step 5: First Meeting
  // ============================================================
  const stepMeeting = (
    <div className={`ob-content-slide ${slideClass}`}>
      <div className="ob-step-header">
        <h2 className="ob-step-title">Schedule Your First Meeting</h2>
        <p className="ob-step-subtitle">Let's get started with a quick demo meeting!</p>
      </div>

      <label className="ob-form-label">Meeting Type</label>
      <div className="ob-meeting-type-toggle">
        <div
          className={`ob-meeting-type-card ${meetingType === 'Team Meeting' ? 'selected' : ''}`}
          onClick={() => setMeetingType('Team Meeting')}
        >
          <div className="ob-meeting-type-icon"><Users size={24} /></div>
          <div className="ob-meeting-type-label">Team Meeting</div>
        </div>
        <div
          className={`ob-meeting-type-card ${meetingType === 'Individual Review' ? 'selected' : ''}`}
          onClick={() => setMeetingType('Individual Review')}
        >
          <div className="ob-meeting-type-icon"><MessageSquare size={24} /></div>
          <div className="ob-meeting-type-label">Individual Review</div>
        </div>
      </div>

      <div className="ob-form-group">
        <label className="ob-form-label">Topic</label>
        <textarea
          className="ob-form-textarea"
          value={meetingTopic}
          onChange={e => setMeetingTopic(e.target.value)}
          style={{ minHeight: 60 }}
        />
      </div>

      <div className="ob-form-group">
        <label className="ob-form-label">Duration</label>
        <div className="ob-duration-group">
          {DURATIONS.map(d => (
            <button
              key={d}
              className={`ob-duration-btn ${meetingDuration === d ? 'selected' : ''}`}
              onClick={() => setMeetingDuration(d)}
              type="button"
            >
              <Clock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
              {d} min
            </button>
          ))}
        </div>
      </div>

      <button className="ob-start-btn" type="button" onClick={handleComplete}>
        <Play size={18} />
        Start Now!
      </button>

      <div style={{ textAlign: 'center', marginTop: 'var(--vl-space-3)' }}>
        <button className="ob-nav-btn-skip" type="button" onClick={handleComplete}>
          Skip this step
        </button>
      </div>
    </div>
  )

  // ============================================================
  // Render Current Step Content
  // ============================================================
  const stepContent = currentStep === 1 ? stepWelcome
    : currentStep === 2 ? stepProfile
    : currentStep === 3 ? stepWorkspace
    : currentStep === 4 ? stepAgents
    : stepMeeting

  // ============================================================
  // Main Render
  // ============================================================
  return (
    <div className="ob-wizard">
      <div className="ob-card" style={{ position: 'relative' }}>
        {/* Skip onboarding */}
        <button
          className="ob-skip-top"
          onClick={skipOnboarding}
          type="button"
          title="Skip onboarding"
        >
          <X size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
          Skip onboarding
        </button>

        {/* Step Progress */}
        {stepProgressBar}

        {/* Content */}
        <div className="ob-content">
          {stepContent}
        </div>

        {/* Navigation */}
        <div className="ob-nav">
          <div>
            {currentStep > 1 && (
              <button className="ob-nav-btn ob-nav-btn-secondary" type="button" onClick={goBack}>
                <ChevronLeft size={16} />
                Back
              </button>
            )}
            {currentStep === 1 && (
              <button className="ob-nav-btn-skip" type="button" onClick={skipOnboarding}>
                Skip for now
              </button>
            )}
          </div>
          <div>
            <button className="ob-nav-btn ob-nav-btn-primary" type="button" onClick={handleContinue}>
              {currentStep === 5 ? 'Finish' : 'Continue'}
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
