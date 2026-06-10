'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Bot, Zap, ArrowLeft, ArrowRight, CheckCircle2, MessageSquare,
  ThermometerSun, ClipboardList, UserPlus, Settings, Plus,
  Lightbulb, BookOpen, CalendarDays, FlaskConical, Wand2, Mic, ChevronUp, ChevronDown, Layers, Eye,
  Sparkles, FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { toast } from 'sonner'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { Agent, Meeting } from './shared-components'
import {
  StepIndicator, TeamPreview, DynamicList, DiscussionViewer,
  renderAgentIcon, AutoSaveIndicator, EmptyState, QUICK_START_AGENDA,
} from './shared-components'
import { VoiceInputButton } from './voice-input-hook'
import { MeetingTemplateSelector, MeetingTemplatePreview, applyTemplate, MEETING_TEMPLATES } from './meeting-templates'
import type { MeetingTemplate } from './meeting-templates'
import { CollaborationPanel } from './collaboration-panel'
import { TemplateBuilder, TemplateGallery } from './meeting-template-builder'
import { LazyAIMeetingAssistant, LazyMeetingNotesPanel } from './lazy-components'
import { VoiceMeetingCreator, VoiceCreateButton } from './voice-meeting-creator'

interface TeamMeetingTabProps {
  agents: Agent[]
  meetings: Meeting[]
  selectedMeeting: Meeting | null
  effectiveTeamMeeting: Meeting | null
  teamMeetings: Meeting[]
  runningMeetingId: string | null
  autoSaveIndicator: boolean
  lang: Lang
  // Form state
  teamAgenda: string
  teamQuestions: string[]
  teamRules: string[]
  teamLeadId: string
  teamMemberIds: string[]
  teamNumRounds: number
  teamTemperature: number
  teamSaveName: string
  teamFormStep: number
  teamCompletedSteps: Set<number>
  // Setters
  setTeamAgenda: (v: string) => void
  setTeamQuestions: (v: string[]) => void
  setTeamRules: (v: string[]) => void
  setTeamLeadId: (v: string) => void
  setTeamMemberIds: (v: string[]) => void
  setTeamNumRounds: (v: number) => void
  setTeamTemperature: (v: number) => void
  setTeamSaveName: (v: string) => void
  setTeamFormStep: (v: number) => void
  setTeamCompletedSteps: (v: Set<number>) => void
  setAutoSaveIndicator: (v: boolean) => void
  setSelectedMeeting: (m: Meeting | null) => void
  // Voice recording state
  teamVoiceRecording?: boolean
  setTeamVoiceRecording?: (v: boolean) => void
  // Voice meeting creator
  voiceCreatorOpen?: boolean
  setVoiceCreatorOpen?: (v: boolean) => void
  onCreateVoiceMeeting?: (config: import('./voice-meeting-creator').VoiceMeetingConfig) => void
  // Handlers
  handleCreateTeamMeeting: () => void
  handleSaveTeamDraft: () => void
  handleRunMeeting: (m: Meeting) => void
  handleRefreshMeeting: () => void
  handleSelectMeeting: (m: Meeting) => void
}

// ============================================================
// Enhanced Step Indicator with animated connecting line
// ============================================================
function EnhancedStepIndicator({ steps, currentStep, completedSteps }: {
  steps: { label: string; icon: React.ElementType }[]
  currentStep: number
  completedSteps: Set<number>
}) {
  const safeSteps = completedSteps instanceof Set ? completedSteps : new Set<number>()
  return (
    <div className="flex items-center gap-0 w-full py-1">
      {steps.map((step, i) => {
        const isCompleted = safeSteps.has(i)
        const isCurrent = i === currentStep
        const Icon = step.icon
        return (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <motion.div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                  isCompleted
                    ? 'text-white shadow-lg'
                    : isCurrent
                    ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/50'
                    : 'bg-[var(--vl-bg-inner)] vl-text-muted border border-[var(--vl-border-subtle)]'
                }`}
                style={isCompleted ? {
                  background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                  boxShadow: '0 0 20px rgba(16, 185, 129, 0.35)',
                } : {}}
                animate={
                  isCurrent
                    ? { scale: [1, 1.08, 1] }
                    : isCompleted
                    ? { scale: [1, 1.15, 1] }
                    : {}
                }
                transition={{
                  duration: isCurrent ? 2 : 0.4,
                  repeat: isCurrent ? Infinity : 0,
                  ease: 'easeInOut',
                }}
              >
                {isCompleted ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                  >
                    <CheckCircle2 className="size-5" />
                  </motion.div>
                ) : (
                  <Icon className="size-4" />
                )}
              </motion.div>
              <span className={`text-[10px] font-medium transition-colors duration-300 ${
                isCurrent ? 'text-emerald-400' : isCompleted ? 'vl-text-body' : 'vl-text-muted'
              }`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 h-[3px] mx-3 mt-[-16px] rounded-full overflow-hidden" style={{ background: 'var(--vl-border-subtle)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: isCompleted && (safeSteps.has(i + 1) || i + 1 === currentStep)
                      ? 'linear-gradient(to right, #10b981, #06b6d4)'
                      : isCompleted
                      ? 'linear-gradient(to right, #10b981, #064e3b)'
                      : 'var(--vl-border-subtle)',
                  }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1, originX: 0 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ============================================================
// Quick Template Cards
// ============================================================
const QUICK_TEMPLATES = [
  {
    key: 'brainstorm',
    icon: Lightbulb,
    color: '#f59e0b',
    agenda: 'Brainstorm new research directions',
  },
  {
    key: 'review',
    icon: BookOpen,
    color: '#06b6d4',
    agenda: 'Review and critique the latest findings',
  },
  {
    key: 'plan',
    icon: CalendarDays,
    color: '#8b5cf6',
    agenda: 'Plan the next phase of experiments',
  },
] as const

// ============================================================
// Agenda Templates for the Templates popover
// ============================================================
const AGENDA_TEMPLATES = [
  {
    key: 'nanobody' as const,
    icon: FlaskConical,
    color: '#10b981',
    labelKey: 'meeting.templates.nanobody',
    descKey: 'meeting.templates.nanobody.desc',
  },
  {
    key: 'literature' as const,
    icon: BookOpen,
    color: '#06b6d4',
    labelKey: 'meeting.templates.literature',
    descKey: 'meeting.templates.literature.desc',
  },
  {
    key: 'brainstorm' as const,
    icon: Lightbulb,
    color: '#f59e0b',
    labelKey: 'meeting.templates.brainstorm',
    descKey: 'meeting.templates.brainstorm.desc',
  },
] as const

// ============================================================
// Form Progress Bar
// ============================================================
function FormProgressBar({ completedSteps, totalSteps, lang }: { completedSteps: Set<number>; totalSteps: number; lang: Lang }) {
  const safeSteps = completedSteps instanceof Set ? completedSteps : new Set<number>()
  const percentage = Math.round((safeSteps.size / totalSteps) * 100)

  return (
    <div className="w-full h-1 rounded-full bg-[var(--vl-border-subtle)] overflow-hidden" role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100} aria-label={t(lang, 'meeting.team.progress')}>
      <motion.div
        className="h-full rounded-full"
        style={{
          background: 'linear-gradient(to right, #10b981, #34d399, #06b6d4)',
        }}
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
      />
    </div>
  )
}

export function TeamMeetingTab(props: TeamMeetingTabProps) {
  // Safety: ensure all props have valid defaults
  const safeProps = {
    agents: props.agents || [],
    selectedMeeting: props.selectedMeeting ?? null,
    effectiveTeamMeeting: props.effectiveTeamMeeting ?? null,
    teamMeetings: props.teamMeetings || [],
    runningMeetingId: props.runningMeetingId ?? null,
    autoSaveIndicator: props.autoSaveIndicator ?? false,
    lang: props.lang || 'en',
    teamAgenda: props.teamAgenda || '',
    teamQuestions: props.teamQuestions || [],
    teamRules: props.teamRules || [],
    teamLeadId: props.teamLeadId || '',
    teamMemberIds: props.teamMemberIds || [],
    teamNumRounds: props.teamNumRounds ?? 3,
    teamTemperature: props.teamTemperature ?? 0.2,
    teamSaveName: props.teamSaveName || 'discussion',
    teamFormStep: props.teamFormStep ?? 0,
    teamCompletedSteps: props.teamCompletedSteps instanceof Set ? props.teamCompletedSteps : new Set<number>(),
    setTeamAgenda: props.setTeamAgenda || (() => {}),
    setTeamQuestions: props.setTeamQuestions || (() => {}),
    setTeamRules: props.setTeamRules || (() => {}),
    setTeamLeadId: props.setTeamLeadId || (() => {}),
    setTeamMemberIds: props.setTeamMemberIds || (() => {}),
    setTeamNumRounds: props.setTeamNumRounds || (() => {}),
    setTeamTemperature: props.setTeamTemperature || (() => {}),
    setTeamSaveName: props.setTeamSaveName || (() => {}),
    setTeamFormStep: props.setTeamFormStep || (() => {}),
    setTeamCompletedSteps: props.setTeamCompletedSteps || (() => {}),
    setAutoSaveIndicator: props.setAutoSaveIndicator || (() => {}),
    setSelectedMeeting: props.setSelectedMeeting || (() => {}),
    handleCreateTeamMeeting: props.handleCreateTeamMeeting || (() => {}),
    handleSaveTeamDraft: props.handleSaveTeamDraft || (() => {}),
    handleRunMeeting: props.handleRunMeeting || (() => {}),
    handleRefreshMeeting: props.handleRefreshMeeting || (() => {}),
    handleSelectMeeting: props.handleSelectMeeting || (() => {}),
    teamVoiceRecording: props.teamVoiceRecording,
  }
  const {
    agents, selectedMeeting, effectiveTeamMeeting, teamMeetings, runningMeetingId, autoSaveIndicator, lang,
    teamAgenda, teamQuestions, teamRules, teamLeadId, teamMemberIds,
    teamNumRounds, teamTemperature, teamSaveName, teamFormStep, teamCompletedSteps,
    setTeamAgenda, setTeamQuestions, setTeamRules, setTeamLeadId, setTeamMemberIds,
    setTeamNumRounds, setTeamTemperature, setTeamSaveName, setTeamFormStep, setTeamCompletedSteps,
    setAutoSaveIndicator, setSelectedMeeting,
    handleCreateTeamMeeting, handleSaveTeamDraft, handleRunMeeting, handleRefreshMeeting, handleSelectMeeting,
    teamVoiceRecording,
  } = safeProps

  // Internal fallback state for completed steps if not provided via props
  const [_internalCompletedSteps, _setInternalCompletedSteps] = useState<Set<number>>(new Set())
  const actualCompletedSteps = teamCompletedSteps instanceof Set ? teamCompletedSteps : _internalCompletedSteps
  const actualSetCompletedSteps = typeof setTeamCompletedSteps === 'function' ? setTeamCompletedSteps : _setInternalCompletedSteps

  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [appliedTemplateId, setAppliedTemplateId] = useState<string | null>(null)
  const [showTemplatePreview, setShowTemplatePreview] = useState(false)
  const [showCollabPanel, setShowCollabPanel] = useState(false)
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false)
  const [showTemplateGallery, setShowTemplateGallery] = useState(false)
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [showNotesPanel, setShowNotesPanel] = useState(false)
  const [voiceCreatorOpen, setVoiceCreatorOpen] = useState(false)

  // Voice meeting creator callback
  const handleVoiceMeetingCreate = (config: import('./voice-meeting-creator').VoiceMeetingConfig) => {
    if (config.agenda) setTeamAgenda(config.agenda)
    if (config.leadId) setTeamLeadId(config.leadId)
    if (config.memberIds.length > 0) setTeamMemberIds(config.memberIds)
    if (config.rounds) setTeamNumRounds(config.rounds)
    if (config.temperature !== undefined) setTeamTemperature(config.temperature)
    setTeamFormStep(0)
    setTeamCompletedSteps(new Set())
    handleCreateTeamMeeting()
  }

  const teamLead = agents.find(a => a.id === teamLeadId)
  const teamMembers = agents.filter(a => teamMemberIds.includes(a.id))

  // Available members for selection (exclude lead)
  const availableMembers = agents.filter(a => a.id !== teamLeadId)
  const allMembersSelected = availableMembers.length > 0 && availableMembers.every(a => teamMemberIds.includes(a.id))

  return (
          <>
            <AnimatePresence mode="wait">
              <motion.div key="team-meeting" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold vl-text-heading vl-text-balance">Team Meeting</h2>
                    {teamVoiceRecording && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-[10px] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 recording-indicator-dot" />
                        {t(lang, 'voice.listening')}
                      </span>
                    )}
                    <p className="text-sm vl-text-muted">Multi-agent discussion led by a team lead</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <VoiceCreateButton lang={lang} onClick={() => setVoiceCreatorOpen(true)} />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="vl-text-muted hover:text-amber-400 hover:bg-amber-500/10"
                      onClick={() => {
                        setTeamAgenda(QUICK_START_AGENDA)
                        setTeamQuestions([
                          'What nanobody sequences have the highest predicted binding affinity?',
                          'Which structural features contribute most to stability?',
                        ])
                        setTeamRules([
                          'Base recommendations on computational evidence',
                          'Consider both binding affinity and developability',
                        ])
                        setTeamSaveName('nanobody-design')
                        setTeamCompletedSteps(new Set([0, 1]))
                        setTeamFormStep(2)
                        toast.success('Quick Start template applied!')
                      }}
                    >
                      <Zap className="size-3.5 mr-1.5" /> Quick Start
                    </Button>
                  </div>
                </div>

                {/* Meeting Template Selector */}
                <MeetingTemplateSelector
                  lang={lang}
                  type="team"
                  selectedTemplateId={appliedTemplateId}
                  onSelect={(template: MeetingTemplate) => {
                    const applied = applyTemplate(template, {})
                    setTeamAgenda(applied.agenda)
                    setTeamQuestions(applied.questions)
                    setTeamRules(applied.rules)
                    setTeamNumRounds(applied.rounds)
                    setTeamTemperature(applied.temperature)
                    setTeamSaveName(applied.saveName)
                    setAppliedTemplateId(template.id)
                    setShowTemplatePreview(true)
                    setAutoSaveIndicator(true)
                    setTeamCompletedSteps(new Set([0]))
                    setTeamFormStep(0)
                    toast.success(t(lang, 'templates.applied'))
                  }}
                  onClearTemplate={() => {
                    setAppliedTemplateId(null)
                    setShowTemplatePreview(false)
                    setTeamAgenda('')
                    setTeamQuestions([])
                    setTeamRules([])
                    setTeamNumRounds(3)
                    setTeamTemperature(0.7)
                    setTeamSaveName('')
                  }}
                />

                {/* Template Preview */}
                {showTemplatePreview && (
                  <MeetingTemplatePreview
                    lang={lang}
                    template={MEETING_TEMPLATES.find(tmpl => tmpl.id === appliedTemplateId) || null}
                    onClose={() => setShowTemplatePreview(false)}
                  />
                )}

                {/* Template Builder & Gallery buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[10px] border-[var(--vl-border)] vl-text-muted hover:text-emerald-400 hover:border-emerald-500/30"
                    onClick={() => setShowTemplateBuilder(!showTemplateBuilder)}
                  >
                    <Layers className="size-3 mr-1" />
                    {showTemplateBuilder ? 'Hide Builder' : 'Template Builder'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[10px] border-[var(--vl-border)] vl-text-muted hover:text-cyan-400 hover:border-cyan-500/30"
                    onClick={() => setShowTemplateGallery(!showTemplateGallery)}
                  >
                    <Eye className="size-3 mr-1" />
                    {showTemplateGallery ? 'Hide Gallery' : 'Template Gallery'}
                  </Button>
                </div>

                <AnimatePresence>
                  {showTemplateBuilder && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <TemplateBuilder lang={lang} onSave={() => { setShowTemplateBuilder(false); toast.success('Template saved!') }} onCancel={() => setShowTemplateBuilder(false)} />
                    </motion.div>
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {showTemplateGallery && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <TemplateGallery lang={lang} onUseTemplate={() => { setShowTemplateGallery(false) }} onCloneTemplate={() => { setShowTemplateGallery(false); setShowTemplateBuilder(true) }} />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center gap-3 overflow-x-auto pb-1">
                  {QUICK_TEMPLATES.map((tmpl) => {
                    const Icon = tmpl.icon
                    return (
                      <motion.button
                        key={tmpl.key}
                        onClick={() => {
                          setTeamAgenda(t(lang, `meetingTemplates.${tmpl.key}.desc`))
                          setAutoSaveIndicator(true)
                          toast.success(`${t(lang, `meetingTemplates.${tmpl.key}`)} template applied!`)
                        }}
                        whileHover={{ scale: 1.03, y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        className="neon-border-card flex items-center gap-2.5 px-4 py-2.5 rounded-xl flex-shrink-0 transition-all duration-300 cursor-pointer"
                        style={{
                          background: `${tmpl.color}10`,
                          borderColor: `${tmpl.color}40`,
                        }}
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ background: `${tmpl.color}20` }}
                        >
                          <Icon className="size-3.5" style={{ color: tmpl.color }} />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-semibold" style={{ color: tmpl.color }}>
                            {t(lang, `meetingTemplates.${tmpl.key}`)}
                          </p>
                          <p className="text-[10px] vl-text-muted max-w-[140px] truncate">
                            {t(lang, `meetingTemplates.${tmpl.key}.desc`)}
                          </p>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Stepped Form */}
                  <Card className="vl-card backdrop-blur-sm transition-all duration-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-white text-base flex items-center gap-2">
                        <Users className="size-4 text-emerald-400" /> Meeting Configuration
                      </CardTitle>
                      {/* Form Progress Bar */}
                      <FormProgressBar completedSteps={teamCompletedSteps} totalSteps={3} lang={lang} />
                      <div className="pt-2">
                        <EnhancedStepIndicator
                          steps={[
                            { label: 'Agenda', icon: ClipboardList },
                            { label: 'Team', icon: UserPlus },
                            { label: 'Settings', icon: Settings },
                          ]}
                          currentStep={teamFormStep}
                          completedSteps={teamCompletedSteps}
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <AnimatePresence mode="wait">
                        {/* Step 1: Agenda */}
                        {teamFormStep === 0 && (
                          <motion.div key="step-agenda" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="vl-text-label text-sm flex items-center gap-1.5">
                                  Agenda *
                                  {teamAgenda.trim() && <CheckCircle2 className="size-3 text-emerald-400" />}
                                </Label>
                                {/* Voice Input + Templates Popover */}
                                <div className="flex items-center gap-1.5">
                                  <VoiceInputButton
                                    lang={lang}
                                    onResult={(text) => {
                                      setTeamAgenda(teamAgenda ? teamAgenda + ' ' + text : text)
                                      setAutoSaveIndicator(true)
                                    }}
                                    compact
                                  />
                                  <Popover open={templatesOpen} onOpenChange={setTemplatesOpen}>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-xs px-2.5 border-[var(--vl-border)] vl-text-muted hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/40"
                                    >
                                      <Lightbulb className="size-3 mr-1.5" />
                                      {t(lang, 'meeting.templates.title')}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="vl-dialog w-72 p-2" align="end" sideOffset={4}>
                                    <div className="space-y-1.5">
                                      <p className="text-xs font-semibold vl-text-heading px-2 pb-1">
                                        {t(lang, 'meeting.templates.title')}
                                      </p>
                                      {AGENDA_TEMPLATES.map((tmpl) => {
                                        const Icon = tmpl.icon
                                        return (
                                          <button
                                            key={tmpl.key}
                                            type="button"
                                            onClick={() => {
                                              setTeamAgenda(t(lang, tmpl.descKey))
                                              setAutoSaveIndicator(true)
                                              setTemplatesOpen(false)
                                              toast.success(t(lang, 'meeting.templates.templateApplied'))
                                            }}
                                            className="w-full flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-[var(--vl-bg-card-hover)] transition-colors duration-200 text-left cursor-pointer"
                                          >
                                            <div
                                              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                                              style={{ background: `${tmpl.color}20` }}
                                            >
                                              <Icon className="size-4" style={{ color: tmpl.color }} />
                                            </div>
                                            <div className="min-w-0">
                                              <p className="text-xs font-semibold vl-text-body">{t(lang, tmpl.labelKey)}</p>
                                              <p className="text-[10px] vl-text-muted line-clamp-2 mt-0.5">{t(lang, tmpl.descKey).slice(0, 80)}...</p>
                                            </div>
                                          </button>
                                        )
                                      })}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                                </div>
                              </div>
                              <div className="relative">
                              <Textarea
                                value={teamAgenda}
                                onChange={(e) => { setTeamAgenda(e.target.value); setAutoSaveIndicator(true) }}
                                placeholder="e.g., Design nanobodies for SARS-CoV-2..."
                                className="vl-input min-h-[100px] input-focus-expand pr-24"
                                maxLength={2000}
                              />
                                <div className="absolute top-2 right-2">
                                  <VoiceInputButton
                                    lang={lang}
                                    onResult={(text) => {
                                      setTeamAgenda(teamAgenda ? teamAgenda + ' ' + text : text)
                                      setAutoSaveIndicator(true)
                                    }}
                                    compact
                                  />
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <p className="text-[10px] vl-text-muted">{teamAgenda.length} / 2000 characters</p>
                                {autoSaveIndicator && <AutoSaveIndicator onDone={() => setAutoSaveIndicator(false)} />}
                              </div>
                            </div>
                            <DynamicList items={teamQuestions} onChange={setTeamQuestions} placeholder="Enter a question..." label="Agenda Questions" />
                            <DynamicList items={teamRules} onChange={setTeamRules} placeholder="Enter a rule..." label="Agenda Rules" />
                          </motion.div>
                        )}

                        {/* Step 2: Team */}
                        {teamFormStep === 1 && (
                          <motion.div key="step-team" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                            <div className="space-y-2">
                              <Label className="vl-text-label text-sm flex items-center gap-1.5">
                                Team Lead *
                                {teamLeadId && <CheckCircle2 className="size-3 text-emerald-400" />}
                              </Label>
                              <Select value={teamLeadId} onValueChange={setTeamLeadId}>
                                <SelectTrigger className="vl-input w-full input-focus-expand">
                                  <SelectValue placeholder="Select team lead..." />
                                </SelectTrigger>
                                <SelectContent className="vl-dialog">
                                  {agents.map(a => (
                                    <SelectItem key={a.id} value={a.id} className="vl-text-heading focus:bg-[var(--vl-bg-card-hover)]">
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: a.color }} />
                                        {a.title}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="vl-text-label text-sm">Team Members</Label>
                                <div className="flex items-center gap-1.5">
                                  {/* Auto-Complete Team Button */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[10px] px-2 vl-text-muted hover:text-cyan-400 hover:bg-cyan-500/10"
                                    onClick={() => {
                                      if (agents.length === 0) return
                                      const firstAgent = agents[0]
                                      if (!teamLeadId) {
                                        setTeamLeadId(firstAgent.id)
                                      }
                                      const allAgentIds = agents.filter(a => a.id !== (teamLeadId || firstAgent.id)).map(a => a.id)
                                      setTeamMemberIds(allAgentIds)
                                      const totalMembers = 1 + allAgentIds.length
                                      toast.success(
                                        t(lang, 'meeting.team.teamCompleted').replace('{count}', String(totalMembers))
                                      )
                                    }}
                                    disabled={agents.length === 0}
                                  >
                                    <Wand2 className="size-3 mr-1" />
                                    {t(lang, 'meeting.team.autoComplete')}
                                  </Button>
                                  {availableMembers.length > 0 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 text-[10px] px-2 vl-text-muted hover:text-emerald-400 hover:bg-emerald-500/10"
                                      onClick={() => {
                                        if (allMembersSelected) {
                                          setTeamMemberIds([])
                                        } else {
                                          setTeamMemberIds(availableMembers.map(a => a.id))
                                        }
                                      }}
                                    >
                                      {allMembersSelected ? t(lang, 'meetingTeam.deselectAll') : t(lang, 'meetingTeam.selectAll')}
                                    </Button>
                                  )}
                                </div>
                              </div>
                              {agents.length === 0 ? (
                                <p className="text-xs vl-text-muted italic">No agents available</p>
                              ) : (
                                <div className="space-y-2 max-h-64 overflow-y-auto vl-inner rounded-xl p-3">
                                  {availableMembers.map(a => {
                                    const isSelected = teamMemberIds.includes(a.id)
                                    return (
                                      <motion.label
                                        key={a.id}
                                        htmlFor={`member-${a.id}`}
                                        className={`relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-300 ${
                                          isSelected
                                            ? 'border-2'
                                            : 'border border-[var(--vl-border-subtle)] hover:bg-[var(--vl-bg-card)] hover:border-[var(--vl-border)]'
                                        }`}
                                        style={
                                          isSelected
                                            ? {
                                                borderColor: a.color,
                                                boxShadow: `0 0 16px ${a.color}33, 0 0 4px ${a.color}22`,
                                                backgroundColor: `${a.color}0d`,
                                              }
                                            : {}
                                        }
                                        whileTap={{ scale: 0.98 }}
                                      >
                                        {/* Avatar circle with initial */}
                                        <div
                                          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                                          style={{ backgroundColor: a.color }}
                                        >
                                          {a.title.charAt(0).toUpperCase()}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm vl-text-body font-medium leading-tight">{a.title}</p>
                                          <p className="text-[10px] vl-text-muted truncate leading-tight mt-0.5">{a.expertise}</p>
                                        </div>

                                        {/* Checkbox */}
                                        <Checkbox
                                          id={`member-${a.id}`}
                                          checked={isSelected}
                                          onCheckedChange={(checked) => {
                                            if (checked) {
                                              setTeamMemberIds([...teamMemberIds, a.id])
                                            } else {
                                              setTeamMemberIds(teamMemberIds.filter(id => id !== a.id))
                                            }
                                          }}
                                          className="border-[var(--vl-border)] data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 flex-shrink-0"
                                        />
                                      </motion.label>
                                    )
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Team Preview */}
                            <TeamPreview lead={teamLead} members={teamMembers} numRounds={teamNumRounds} />
                          </motion.div>
                        )}

                        {/* Step 3: Settings */}
                        {teamFormStep === 2 && (
                          <motion.div key="step-settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                            <div className="space-y-2">
                              <Label className="vl-text-label text-sm flex items-center justify-between">
                                <span>Number of Rounds</span>
                                <span className="text-emerald-400 font-mono">{teamNumRounds}</span>
                              </Label>
                              <Slider
                                value={[teamNumRounds]}
                                onValueChange={([v]) => setTeamNumRounds(v)}
                                min={1}
                                max={10}
                                step={1}
                                className="[&_[data-slot=slider-range]]:bg-emerald-500 [&_[data-slot=slider-thumb]]:border-emerald-500"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="vl-text-label text-sm flex items-center justify-between">
                                <span className="flex items-center gap-1.5"><ThermometerSun className="size-3.5" /> Temperature</span>
                                <span className="text-emerald-400 font-mono">{teamTemperature.toFixed(2)}</span>
                              </Label>
                              <Slider
                                value={[teamTemperature]}
                                onValueChange={([v]) => setTeamTemperature(v)}
                                min={0}
                                max={1}
                                step={0.05}
                                className="[&_[data-slot=slider-range]]:bg-emerald-500 [&_[data-slot=slider-thumb]]:border-emerald-500"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="vl-text-label text-sm flex items-center gap-1.5">
                                Save Name
                                {teamSaveName.trim() && teamSaveName !== 'discussion' && <CheckCircle2 className="size-3 text-emerald-400" />}
                              </Label>
                              <Input
                                value={teamSaveName}
                                onChange={(e) => setTeamSaveName(e.target.value)}
                                placeholder="discussion"
                                className="vl-input input-focus-expand"
                              />
                            </div>

                            {/* Meeting Summary Preview */}
                            <div className="vl-inner rounded-xl p-3">
                              <p className="text-xs vl-text-muted mb-2 flex items-center gap-1">
                                <CheckCircle2 className="size-3 text-emerald-400" /> Meeting Preview
                              </p>
                              <div className="space-y-1.5">
                                <p className="vl-text-body text-xs"><span className="vl-text-muted">Name:</span> {teamSaveName || 'discussion'}</p>
                                <p className="vl-text-body text-xs"><span className="vl-text-muted">Rounds:</span> {teamNumRounds}</p>
                                <p className="vl-text-body text-xs"><span className="vl-text-muted">Temperature:</span> {teamTemperature.toFixed(2)}</p>
                                <p className="vl-text-body text-xs"><span className="vl-text-muted">Participants:</span> {(teamLead ? 1 : 0) + teamMembers.length}</p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Navigation Buttons */}
                      <div className="flex gap-3 pt-2">
                        {teamFormStep > 0 && (
                          <Button
                            variant="outline"
                            onClick={() => setTeamFormStep(teamFormStep - 1)}
                            className="border-[var(--vl-border)] vl-text-body hover:bg-[var(--vl-bg-card-hover)]"
                          >
                            <ArrowLeft className="size-4 mr-1.5" /> Back
                          </Button>
                        )}
                        {teamFormStep < 2 && (
                          <Button
                            onClick={() => {
                              // Validate current step before proceeding
                              if (teamFormStep === 0 && !teamAgenda.trim()) {
                                toast.error('Please enter an agenda')
                                return
                              }
                              if (teamFormStep === 1 && !teamLeadId) {
                                toast.error('Please select a team lead')
                                return
                              }
                              setTeamCompletedSteps(new Set([...teamCompletedSteps, teamFormStep]))
                              setTeamFormStep(teamFormStep + 1)
                            }}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            Next <ArrowRight className="size-4 ml-1.5" />
                          </Button>
                        )}
                        {teamFormStep === 2 && (
                          <>
                            <Button
                              onClick={handleCreateTeamMeeting}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                              disabled={agents.length === 0}
                            >
                              <Plus className="size-4 mr-1.5" /> Create Meeting
                            </Button>
                            <Button
                              onClick={handleSaveTeamDraft}
                              variant="outline"
                              className="border-[var(--vl-border)] vl-text-body hover:bg-[var(--vl-bg-card-hover)] hover:text-white"
                            >
                              Save as Draft
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Discussion Viewer + Collaboration Panel */}
                  <div className="flex flex-col gap-4">
                    <Card className="vl-card backdrop-blur-sm flex flex-col" style={{ height: showCollabPanel ? '400px' : '600px' }}>
                      {effectiveTeamMeeting ? (
                        <DiscussionViewer
                          meeting={effectiveTeamMeeting}
                          agents={agents}
                          meetings={teamMeetings}
                          onRefresh={handleRefreshMeeting}
                          onSelectMeeting={handleSelectMeeting}
                          onRunMeeting={handleRunMeeting}
                          runningMeetingId={runningMeetingId}
                        />
                      ) : (
                        <div className="flex-1 flex items-center justify-center">
                          <EmptyState
                            icon={Users}
                            title="No team meetings yet"
                            description="Create a team meeting using the form to see the discussion here"
                          />
                        </div>
                      )}
                    </Card>

                    {/* AI Insights + Collaboration Panel toggle */}
                    {effectiveTeamMeeting && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className={`flex-1 text-xs border-[var(--vl-border)] transition-all ${showAIAssistant ? 'text-violet-400 border-violet-500/30 bg-violet-500/5' : 'vl-text-muted'}`}
                            onClick={() => setShowAIAssistant(!showAIAssistant)}
                          >
                            <Sparkles className="size-3.5 mr-1.5" />
                            {showAIAssistant ? 'Hide AI Insights' : 'Show AI Insights'}
                            {showAIAssistant ? <ChevronUp className="size-3.5 ml-1.5" /> : <ChevronDown className="size-3.5 ml-1.5" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className={`flex-1 text-xs border-[var(--vl-border)] transition-all ${showCollabPanel ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5' : 'vl-text-muted'}`}
                            onClick={() => setShowCollabPanel(!showCollabPanel)}
                          >
                            <MessageSquare className="size-3.5 mr-1.5" />
                            {showCollabPanel ? 'Hide Collaboration' : 'Collaboration'}
                            {showCollabPanel ? <ChevronUp className="size-3.5 ml-1.5" /> : <ChevronDown className="size-3.5 ml-1.5" />}
                          </Button>
                        </div>
                        <AnimatePresence>
                          {showAIAssistant && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <LazyAIMeetingAssistant
                                messages={(effectiveTeamMeeting.messages || [])}
                                lang={lang}
                                isOpen={true}
                                onToggle={() => setShowAIAssistant(false)}
                                className="w-full border border-[var(--vl-border)] rounded-xl"
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <AnimatePresence>
                          {showCollabPanel && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <CollaborationPanel
                                meetingId={effectiveTeamMeeting.id}
                                messages={(effectiveTeamMeeting.messages || []).map(m => ({
                                  id: m.id,
                                  agentName: m.agentName,
                                  message: m.message,
                                }))}
                                lang={lang}
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                    {/* Meeting Notes Panel */}
                    {effectiveTeamMeeting && (
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className={`w-full text-xs border-[var(--vl-border)] transition-all ${showNotesPanel ? 'text-amber-400 border-amber-500/30 bg-amber-500/5' : 'vl-text-muted'}`}
                          onClick={() => setShowNotesPanel(!showNotesPanel)}
                        >
                          <FileText className="size-3.5 mr-1.5" />
                          {showNotesPanel ? 'Hide Notes' : 'Meeting Notes'}
                          {showNotesPanel ? <ChevronUp className="size-3.5 ml-1.5" /> : <ChevronDown className="size-3.5 ml-1.5" />}
                        </Button>
                        <AnimatePresence>
                          {showNotesPanel && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <LazyMeetingNotesPanel
                                meetingId={effectiveTeamMeeting.id}
                                meetingName={effectiveTeamMeeting.saveName || 'Team Meeting'}
                                isMeetingRunning={effectiveTeamMeeting.status === 'running'}
                                lang={lang}
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Voice Meeting Creator Dialog */}
            <VoiceMeetingCreator
              agents={agents}
              lang={lang}
              isOpen={voiceCreatorOpen}
              onOpenChange={setVoiceCreatorOpen}
              onSubmit={handleVoiceMeetingCreate}
            />
          </>
        )
}