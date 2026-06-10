'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot as BotIcon, Zap, ArrowLeft, ArrowRight, CheckCircle2,
  ThermometerSun, Settings, MessageCircle, MessageSquare, ShieldAlert, Plus,
  Brain, BookOpen, FlaskConical, Lightbulb, Sparkles, Clock, Mic, ChevronUp, ChevronDown, FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { Agent, Meeting } from './shared-components'
import {
  StepIndicator, DiscussionViewer, DynamicList, EmptyState, AutoSaveIndicator,
  renderAgentIcon, QUICK_START_AGENDA,
} from './shared-components'
import { VoiceInputButton } from './voice-input-hook'
import { CollaborationPanel } from './collaboration-panel'
import { LazyAIMeetingAssistant, LazyMeetingNotesPanel } from './lazy-components'

interface IndividualMeetingTabProps {
  agents: Agent[]
  selectedMeeting: Meeting | null
  effectiveIndividualMeeting: Meeting | null
  individualMeetings: Meeting[]
  runningMeetingId: string | null
  autoSaveIndicator: boolean
  lang: Lang
  // Form state
  indivAgenda: string
  indivQuestions: string[]
  indivRules: string[]
  indivMemberId: string
  indivTemperature: number
  indivSaveName: string
  indivFormStep: number
  indivCompletedSteps: Set<number>
  // Setters
  setIndivAgenda: (v: string) => void
  setIndivQuestions: (v: string[]) => void
  setIndivRules: (v: string[]) => void
  setIndivMemberId: (v: string) => void
  setIndivTemperature: (v: number) => void
  setIndivSaveName: (v: string) => void
  setIndivFormStep: (v: number) => void
  setIndivCompletedSteps: (v: Set<number>) => void
  setAutoSaveIndicator: (v: boolean) => void
  // Handlers
  handleCreateIndividualMeeting: () => void
  handleSaveIndivDraft: () => void
  handleRunMeeting: (m: Meeting) => void
  handleRefreshMeeting: () => void
  handleSelectMeeting: (m: Meeting) => void
}

// ============================================================
// Meeting Parameter Presets
// ============================================================
const MEETING_PRESETS = [
  {
    key: 'quickChat' as const,
    icon: Zap,
    color: '#10b981',
    temperature: 0.7,
    labelKey: 'meeting.presets.quickChat',
  },
  {
    key: 'deepAnalysis' as const,
    icon: Brain,
    color: '#06b6d4',
    temperature: 0.3,
    labelKey: 'meeting.presets.deepAnalysis',
  },
  {
    key: 'creative' as const,
    icon: Sparkles,
    color: '#f59e0b',
    temperature: 0.9,
    labelKey: 'meeting.presets.creative',
  },
] as const

export function IndividualMeetingTab(props: IndividualMeetingTabProps) {
  const {
    agents = [], selectedMeeting = null, effectiveIndividualMeeting = null, individualMeetings = [],
    runningMeetingId = null, autoSaveIndicator = false, lang = 'en',
    indivAgenda = '', indivQuestions = [], indivRules = [], indivMemberId = '',
    indivTemperature = 0.2, indivSaveName = 'discussion', indivFormStep = 0, indivCompletedSteps = new Set<number>(),
    setIndivAgenda = () => {}, setIndivQuestions = () => {}, setIndivRules = () => {}, setIndivMemberId = () => {},
    setIndivTemperature = () => {}, setIndivSaveName = () => {}, setIndivFormStep = () => {}, setIndivCompletedSteps = () => {},
    setAutoSaveIndicator = () => {},
    handleCreateIndividualMeeting = () => {}, handleSaveIndivDraft = () => {},
    handleRunMeeting = () => {}, handleRefreshMeeting = () => {}, handleSelectMeeting = () => {},
  } = props

  // Safety: ensure completedSteps is always a Set
  const safeIndivCompletedSteps = indivCompletedSteps instanceof Set ? indivCompletedSteps : new Set<number>()

  const [showCollabPanel, setShowCollabPanel] = useState(false)
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [showNotesPanel, setShowNotesPanel] = useState(false)

  const indivMember = agents.find(a => a.id === indivMemberId)

  // Derive recently used agents from meeting history
  const recentAgentIds = useMemo(() => {
    const agentCountMap = new Map<string, number>()
    for (const meeting of individualMeetings) {
      const memberId = meeting.teamMemberId
      if (memberId && agents.some(a => a.id === memberId)) {
        agentCountMap.set(memberId, (agentCountMap.get(memberId) || 0) + 1)
      }
    }
    // Sort by count descending, take unique IDs (max 5)
    return Array.from(agentCountMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id)
  }, [individualMeetings, agents])

  const recentAgents = useMemo(() => {
    return recentAgentIds
      .map(id => agents.find(a => a.id === id))
      .filter((a): a is Agent => a !== undefined)
  }, [recentAgentIds, agents])

  // Character count color
  const charCountColor = indivAgenda.length < 500
    ? 'text-emerald-400'
    : indivAgenda.length < 1500
    ? 'text-amber-400'
    : 'text-rose-400'

  // Quick Templates
  const INDIV_TEMPLATES = [
    { key: 'self-critique', icon: Brain, color: '#8b5cf6', agenda: 'Critically evaluate my current research approach and identify potential flaws, methodological weaknesses, and alternative interpretations of the data.' },
    { key: 'literature', icon: BookOpen, color: '#06b6d4', agenda: 'Review and summarize the key findings from recent literature on this topic, highlighting consensus, controversies, and gaps in the field.' },
    { key: 'experiment', icon: FlaskConical, color: '#f59e0b', agenda: 'Design a controlled experiment to test the current hypothesis, including controls, sample size estimation, and statistical analysis plan.' },
  ]

  return (
            <AnimatePresence mode="wait">
              <motion.div key="individual-meeting" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold vl-text-heading vl-text-balance">Individual Meeting</h2>
                    <p className="text-sm vl-text-muted">Agent + Scientific Critic one-on-one discussion</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="vl-text-muted hover:text-amber-400 hover:bg-amber-500/10"
                    onClick={() => {
                      setIndivAgenda(QUICK_START_AGENDA)
                      setIndivSaveName('nanobody-review')
                      setIndivCompletedSteps(new Set([0]))
                      setIndivFormStep(1)
                      toast.success('Quick Start template applied!')
                    }}
                  >
                    <Zap className="size-3.5 mr-1.5" /> Quick Start
                  </Button>
                </div>

                {/* Quick Templates Row */}
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                  {INDIV_TEMPLATES.map((tmpl) => (
                    <motion.button
                      key={tmpl.key}
                      type="button"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setIndivAgenda(tmpl.agenda)
                        setIndivSaveName(`${tmpl.key}-discussion`)
                        toast.success(`${tmpl.key === 'self-critique' ? 'Self-Critique' : tmpl.key === 'literature' ? 'Literature Review' : 'Experiment Design'} template applied!`)
                      }}
                      className="flex-shrink-0 vl-inner rounded-xl p-3 border border-[var(--vl-border-subtle)] text-left neon-border-card hover:shadow-md transition-all duration-200 min-w-[180px]"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${tmpl.color}20` }}>
                          <tmpl.icon className="size-4" style={{ color: tmpl.color }} />
                        </div>
                        <span className="text-xs font-semibold vl-text-heading capitalize">{tmpl.key.replace('-', ' ')}</span>
                      </div>
                      <p className="text-[10px] vl-text-muted line-clamp-2">{tmpl.agenda.slice(0, 80)}...</p>
                    </motion.button>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Stepped Form */}
                  <Card className="vl-card backdrop-blur-sm transition-all duration-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-white text-base flex items-center gap-2">
                        <BotIcon className="size-4 text-cyan-400" /> Meeting Configuration
                      </CardTitle>
                      <div className="pt-2">
                        <StepIndicator
                          steps={[
                            { label: 'Agent', icon: BotIcon },
                            { label: 'Settings', icon: Settings },
                          ]}
                          currentStep={indivFormStep}
                          completedSteps={safeIndivCompletedSteps}
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <AnimatePresence mode="wait">
                        {/* Step 1: Agent Selection with larger cards */}
                        {indivFormStep === 0 && (
                          <motion.div key="indiv-step-agent" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="vl-text-label text-sm flex items-center gap-1.5">
                                  Agenda *
                                  {indivAgenda.trim() && <CheckCircle2 className="size-3 text-emerald-400" />}
                                </Label>
                                <VoiceInputButton
                                  lang={lang}
                                  onResult={(text) => {
                                    setIndivAgenda(indivAgenda ? indivAgenda + ' ' + text : text)
                                    setAutoSaveIndicator(true)
                                  }}
                                  compact
                                />
                              </div>
                              <div className="relative">
                              <Textarea
                                value={indivAgenda}
                                onChange={(e) => { setIndivAgenda(e.target.value); setAutoSaveIndicator(true) }}
                                placeholder="e.g., Propose a novel approach for..."
                                className="vl-input min-h-[80px] input-focus-expand pr-24"
                                maxLength={2000}
                              />
                              <div className="absolute top-2 right-2">
                                <VoiceInputButton
                                  lang={lang}
                                  onResult={(text) => {
                                    setIndivAgenda(indivAgenda ? indivAgenda + ' ' + text : text)
                                    setAutoSaveIndicator(true)
                                  }}
                                  compact
                                />
                              </div>
                              </div>
                              <div className="flex items-center justify-between">
                                {/* Character Count Indicator */}
                                <p className={`text-xs ${charCountColor} vl-text-muted`}>
                                  {t(lang, 'meeting.presets.charCount').replace('{count}', String(indivAgenda.length))}
                                </p>
                                {autoSaveIndicator && <AutoSaveIndicator onDone={() => setAutoSaveIndicator(false)} />}
                              </div>
                            </div>

                            <DynamicList items={indivQuestions} onChange={setIndivQuestions} placeholder="Enter a question..." label="Agenda Questions" />
                            <DynamicList items={indivRules} onChange={setIndivRules} placeholder="Enter a rule..." label="Agenda Rules" />

                            <div className="space-y-2">
                              <Label className="vl-text-label text-sm flex items-center gap-1.5">
                                Select Agent *
                                {indivMemberId && <CheckCircle2 className="size-3 text-emerald-400" />}
                              </Label>

                              {/* Recent Agents Quick Select */}
                              {recentAgents.length > 0 && (
                                <div className="flex items-center gap-2 pb-1">
                                  <span className="text-[10px] font-medium vl-text-muted flex items-center gap-1">
                                    <Clock className="size-3" />
                                    {t(lang, 'meeting.presets.recentAgents')}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    {recentAgents.map(a => {
                                      const isSelected = indivMemberId === a.id
                                      return (
                                        <Tooltip key={a.id}>
                                          <TooltipTrigger asChild>
                                            <motion.button
                                              type="button"
                                              whileHover={{ scale: 1.15 }}
                                              whileTap={{ scale: 0.9 }}
                                              onClick={() => setIndivMemberId(a.id)}
                                              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white transition-all duration-200 ${
                                                isSelected
                                                  ? 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-[var(--vl-bg-card)]'
                                                  : 'hover:ring-2 hover:ring-white/30 hover:ring-offset-1 hover:ring-offset-[var(--vl-bg-card)]'
                                              }`}
                                              style={{ backgroundColor: a.color }}
                                            >
                                              {renderAgentIcon(a.icon, 'size-3.5 text-white')}
                                            </motion.button>
                                          </TooltipTrigger>
                                          <TooltipContent side="bottom" className="vl-dialog text-xs">
                                            {a.title}
                                          </TooltipContent>
                                        </Tooltip>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}

                              {agents.length === 0 ? (
                                <p className="text-xs vl-text-muted italic">No agents available. Create one first!</p>
                              ) : (
                                <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto">
                                  {agents.map(a => {
                                    const isSelected = indivMemberId === a.id
                                    return (
                                      <motion.button
                                        key={a.id}
                                        type="button"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setIndivMemberId(a.id)}
                                        className={`text-left p-3 rounded-xl border transition-all duration-200 ${
                                          isSelected
                                            ? 'bg-cyan-500/10 border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                                            : 'bg-[var(--vl-bg-inner)] border-[var(--vl-border)] hover:border-[var(--vl-border)] hover:bg-[var(--vl-bg-card)]'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2 mb-1.5">
                                          <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: a.color }}>
                                            {renderAgentIcon(a.icon, 'size-3.5 text-white')}
                                          </div>
                                          <span className="text-xs font-medium text-white truncate">{a.title}</span>
                                        </div>
                                        <p className="text-[10px] vl-text-muted line-clamp-2">{a.expertise}</p>
                                      </motion.button>
                                    )
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Agent + Critic Preview */}
                            {indivMember && (
                              <div className="vl-inner rounded-xl p-3">
                                <p className="text-xs vl-text-muted mb-2 flex items-center gap-1">
                                  <MessageCircle className="size-3" /> Discussion Preview
                                </p>
                                <div className="flex items-center gap-3">
                                  <div className="flex flex-col items-center gap-1">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: indivMember.color }}>
                                      {renderAgentIcon(indivMember.icon, 'size-5 text-white')}
                                    </div>
                                    <span className="text-[10px] vl-text-body max-w-[60px] truncate">{indivMember.title}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <div className="w-6 h-px bg-[var(--vl-border)]" />
                                    <MessageSquare className="size-3 vl-text-muted" />
                                    <div className="w-6 h-px bg-[var(--vl-border)]" />
                                  </div>
                                  <div className="flex flex-col items-center gap-1">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-500/20">
                                      <ShieldAlert className="size-5 text-amber-400" />
                                    </div>
                                    <span className="text-[10px] vl-text-body">Critic</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}

                        {/* Step 2: Settings */}
                        {indivFormStep === 1 && (
                          <motion.div key="indiv-step-settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                            <div className="space-y-2">
                              <Label className="vl-text-label text-sm flex items-center justify-between">
                                <span className="flex items-center gap-1.5"><ThermometerSun className="size-3.5" /> Temperature</span>
                                <span className="text-emerald-400 font-mono">{indivTemperature.toFixed(2)}</span>
                              </Label>
                              <Slider
                                value={[indivTemperature]}
                                onValueChange={([v]) => setIndivTemperature(v)}
                                min={0}
                                max={1}
                                step={0.05}
                                className="[&_[data-slot=slider-range]]:bg-cyan-500 [&_[data-slot=slider-thumb]]:border-cyan-500"
                              />
                            </div>

                            {/* Meeting Parameter Presets */}
                            <div className="space-y-2">
                              <p className="text-[10px] font-medium vl-text-muted">{t(lang, 'meeting.presets.title')}</p>
                              <div className="flex items-center gap-2">
                                {MEETING_PRESETS.map((preset) => {
                                  const Icon = preset.icon
                                  return (
                                    <motion.button
                                      key={preset.key}
                                      type="button"
                                      whileHover={{ scale: 1.03 }}
                                      whileTap={{ scale: 0.97 }}
                                      onClick={() => {
                                        setIndivTemperature(preset.temperature)
                                        toast.success(t(lang, 'meeting.presets.presetApplied'))
                                      }}
                                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--vl-border-subtle)] hover:bg-[var(--vl-bg-card-hover)] transition-all duration-200 text-left cursor-pointer"
                                      style={{
                                        borderColor: indivTemperature === preset.temperature ? `${preset.color}60` : undefined,
                                        backgroundColor: indivTemperature === preset.temperature ? `${preset.color}10` : undefined,
                                      }}
                                    >
                                      <Icon className="size-3.5" style={{ color: preset.color }} />
                                      <span className="text-[10px] font-medium vl-text-body">{t(lang, preset.labelKey)}</span>
                                    </motion.button>
                                  )
                                })}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label className="vl-text-label text-sm">Save Name</Label>
                              <Input
                                value={indivSaveName}
                                onChange={(e) => setIndivSaveName(e.target.value)}
                                placeholder="discussion"
                                className="vl-input input-focus-expand"
                              />
                            </div>

                            {/* Meeting Preview */}
                            <div className="vl-inner rounded-xl p-3">
                              <p className="text-xs vl-text-muted mb-2 flex items-center gap-1">
                                <CheckCircle2 className="size-3 text-cyan-400" /> Meeting Preview
                              </p>
                              <div className="space-y-1.5">
                                <p className="vl-text-body text-xs"><span className="vl-text-muted">Name:</span> {indivSaveName || 'discussion'}</p>
                                <p className="vl-text-body text-xs"><span className="vl-text-muted">Temperature:</span> {indivTemperature.toFixed(2)}</p>
                                <p className="vl-text-body text-xs"><span className="vl-text-muted">Agent:</span> {indivMember?.title || 'Not selected'}</p>
                                <p className="vl-text-body text-xs"><span className="vl-text-muted">Critic:</span> Scientific Critic</p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Navigation Buttons */}
                      <div className="flex gap-3 pt-2">
                        {indivFormStep > 0 && (
                          <Button
                            variant="outline"
                            onClick={() => setIndivFormStep(indivFormStep - 1)}
                            className="border-[var(--vl-border)] vl-text-body hover:bg-[var(--vl-bg-card-hover)]"
                          >
                            <ArrowLeft className="size-4 mr-1.5" /> Back
                          </Button>
                        )}
                        {indivFormStep < 1 && (
                          <Button
                            onClick={() => {
                              if (!indivAgenda.trim()) {
                                toast.error('Please enter an agenda')
                                return
                              }
                              if (!indivMemberId) {
                                toast.error('Please select an agent')
                                return
                              }
                              setIndivCompletedSteps(new Set([...safeIndivCompletedSteps, indivFormStep]))
                              setIndivFormStep(indivFormStep + 1)
                            }}
                            className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white"
                          >
                            Next <ArrowRight className="size-4 ml-1.5" />
                          </Button>
                        )}
                        {indivFormStep === 1 && (
                          <>
                            <Button
                              onClick={handleCreateIndividualMeeting}
                              className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white"
                              disabled={agents.length === 0}
                            >
                              <Plus className="size-4 mr-1.5" /> Create Meeting
                            </Button>
                            <Button
                              onClick={handleSaveIndivDraft}
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
                      {effectiveIndividualMeeting ? (
                        <DiscussionViewer
                          meeting={effectiveIndividualMeeting}
                          agents={agents}
                          meetings={individualMeetings}
                          onRefresh={handleRefreshMeeting}
                          onSelectMeeting={handleSelectMeeting}
                          onRunMeeting={handleRunMeeting}
                          runningMeetingId={runningMeetingId}
                        />
                      ) : (
                        <div className="flex-1 flex items-center justify-center">
                          <EmptyState
                            icon={BotIcon}
                            title="No individual meetings yet"
                            description="Create an individual meeting using the form to see the discussion"
                          />
                        </div>
                      )}
                    </Card>

                    {/* AI Insights + Collaboration Panel toggle */}
                    {effectiveIndividualMeeting && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className={`flex-1 text-xs border-[var(--vl-border)] transition-all ${showAIAssistant ? 'text-violet-400 border-violet-500/30 bg-violet-500/5' : 'vl-text-muted'}`}
                            onClick={() => setShowAIAssistant(!showAIAssistant)}
                          >
                            <Sparkles className="size-3.5 mr-1.5" />
                            {showAIAssistant ? 'Hide AI Insights' : 'AI Insights'}
                            {showAIAssistant ? <ChevronUp className="size-3.5 ml-1.5" /> : <ChevronDown className="size-3.5 ml-1.5" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className={`flex-1 text-xs border-[var(--vl-border)] transition-all ${showCollabPanel ? 'text-cyan-400 border-cyan-500/30 bg-cyan-500/5' : 'vl-text-muted'}`}
                            onClick={() => setShowCollabPanel(!showCollabPanel)}
                          >
                            <MessageSquare className="size-3.5 mr-1.5" />
                            {showCollabPanel ? 'Hide Collab' : 'Collaboration'}
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
                                messages={(effectiveIndividualMeeting.messages || [])}
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
                                meetingId={effectiveIndividualMeeting.id}
                                messages={(effectiveIndividualMeeting.messages || []).map(m => ({
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
                    {effectiveIndividualMeeting && (
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
                                meetingId={effectiveIndividualMeeting.id}
                                meetingName={effectiveIndividualMeeting.saveName || 'Individual Meeting'}
                                isMeetingRunning={effectiveIndividualMeeting.status === 'running'}
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
  )

}
