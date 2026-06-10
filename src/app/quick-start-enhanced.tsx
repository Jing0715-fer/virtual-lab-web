'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Lightbulb, FlaskConical, BarChart3, FileText, Users,
  Code2, GraduationCap, Search, Zap, ChevronRight, ChevronLeft,
  Clock, UsersRound, Settings2, Rocket, Save, Sparkles, ArrowRight,
  Star, CheckCircle2, PenTool, Puzzle, Map, Handshake, X,
  Plus, Thermometer, Hash, MessageSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Slider } from '@/components/ui/slider'
import { toast } from 'sonner'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

// ============================================================
// Types
// ============================================================

interface TemplateSummary {
  id: string
  title: string
  description: string
  icon: string
  iconGradient: string
  category: string
  difficulty: string
  expectedDuration: string
  participantsRequired: number
  presetRounds: number
  presetTemperature: number
  suggestedAgents: string[]
  useCount: number
}

interface WizardConfig {
  rounds: number
  temperature: number
  customQuestions: string[]
  selectedAgents: string[]
}

// ============================================================
// Icon Map
// ============================================================

const ICON_MAP: Record<string, React.ElementType> = {
  BookOpen, Lightbulb, FlaskConical, BarChart3, FileText, Users,
  Code2, GraduationCap, PenTool, Puzzle, Map, Handshake,
}

// ============================================================
// Featured Templates (One-Click)
// ============================================================

const FEATURED_TEMPLATES = [
  {
    id: 'literature-review',
    title: 'Literature Review',
    description: 'Systematically review recent publications with your team',
    icon: 'BookOpen',
    gradient: 'featured-gradient-1',
    stat: '342 uses',
  },
  {
    id: 'weekly-lab-meeting',
    title: 'Weekly Lab Meeting',
    description: 'Progress updates and team alignment session',
    icon: 'Users',
    gradient: 'featured-gradient-2',
    stat: '521 uses',
  },
  {
    id: 'hypothesis-generation',
    title: 'Hypothesis Generation',
    description: 'Brainstorm and validate novel research hypotheses',
    icon: 'Lightbulb',
    gradient: 'featured-gradient-3',
    stat: '256 uses',
  },
]

// ============================================================
// Smart Suggestions
// ============================================================

const SUGGESTIONS = [
  { id: 's1', title: 'Data Analysis Review', reason: 'Based on your recent completed meetings', icon: 'BarChart3', color: '#8b5cf6' },
  { id: 's2', title: 'Experimental Design', reason: 'Trending in your research area', icon: 'FlaskConical', color: '#10b981' },
  { id: 's3', title: 'Problem Solving', reason: 'Similar to your last 3 sessions', icon: 'Puzzle', color: '#ef4444' },
]

// ============================================================
// Wizard Step Indicator Component
// ============================================================

function WizardStepIndicator({
  currentStep,
  totalSteps,
  labels,
}: {
  currentStep: number
  totalSteps: number
  labels: string[]
}) {
  return (
    <div className="wizard-steps">
      {labels.map((label, idx) => {
        const stepNum = idx + 1
        const isCompleted = idx < currentStep
        const isActive = idx === currentStep
        return (
          <React.Fragment key={idx}>
            {idx > 0 && (
              <div className={`wizard-line ${isCompleted ? 'completed' : ''}`}>
                <div className="wizard-line-fill" />
              </div>
            )}
            <div className={`wizard-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
              <div className="wizard-step-circle">
                {isCompleted ? <CheckCircle2 className="size-5" /> : stepNum}
              </div>
              <span className="wizard-step-label">{label}</span>
            </div>
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ============================================================
// Step 1: Choose Template
// ============================================================

function StepChooseTemplate({
  templates,
  search,
  categoryFilter,
  difficultyFilter,
  selectedId,
  onSearchChange,
  onCategoryChange,
  onDifficultyChange,
  onSelect,
}: {
  templates: TemplateSummary[]
  search: string
  categoryFilter: string
  difficultyFilter: string
  selectedId: string | null
  onSearchChange: (v: string) => void
  onCategoryChange: (v: string) => void
  onDifficultyChange: (v: string) => void
  onSelect: (id: string) => void
}) {
  const filtered = useMemo(() => {
    let result = templates
    if (categoryFilter !== 'all') {
      result = result.filter(t => t.category.toLowerCase() === categoryFilter.toLowerCase())
    }
    if (difficultyFilter !== 'all') {
      result = result.filter(t => t.difficulty.toLowerCase() === difficultyFilter.toLowerCase())
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      )
    }
    return result
  }, [templates, categoryFilter, difficultyFilter, search])

  const categories = ['all', 'Research', 'Planning', 'Review', 'Brainstorm', 'Analysis']
  const difficulties = ['all', 'beginner', 'intermediate', 'advanced']

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="template-search-bar max-w-md">
        <Search className="size-4 template-search-icon" />
        <input
          type="text"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search templates..."
          aria-label="Search templates"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="filter-pills">
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => onCategoryChange(cat)}
              className={`filter-pill capitalize ${categoryFilter === cat ? 'active' : ''}`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="filter-pills">
          {difficulties.map(diff => (
            <button
              key={diff}
              type="button"
              onClick={() => onDifficultyChange(diff)}
              className={`filter-pill capitalize ${difficultyFilter === diff ? 'active' : ''}`}
            >
              {diff}
            </button>
          ))}
        </div>
      </div>

      {/* Template Grid */}
      <div className="template-grid max-h-[400px] overflow-y-auto pr-2">
        {filtered.map((template, idx) => {
          const Icon = ICON_MAP[template.icon] || FileText
          const isSelected = selectedId === template.id
          return (
            <motion.button
              key={template.id}
              type="button"
              className={`template-card text-left w-full ${isSelected ? '!border-emerald-500/40 !shadow-emerald-500/10' : ''}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              onClick={() => onSelect(template.id)}
            >
              <div className="flex items-start gap-3">
                <div
                  className="template-icon-box w-10 h-10 !rounded-xl"
                  style={{ background: template.iconGradient || 'linear-gradient(135deg, #10b981, #059669)' }}
                >
                  <Icon className="size-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold vl-text-heading">{template.title}</h4>
                  <p className="text-xs vl-text-muted mt-0.5 line-clamp-2">{template.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs vl-text-muted">
                <span className={`difficulty-badge difficulty-${template.difficulty} text-[10px] py-0.5 px-2`}>{template.difficulty}</span>
                <span className="flex items-center gap-1"><Clock className="size-3" />{template.expectedDuration}</span>
                <span className="flex items-center gap-1"><UsersRound className="size-3" />{template.participantsRequired}</span>
              </div>
              {isSelected && (
                <motion.div
                  className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                >
                  <CheckCircle2 className="size-3 text-white" />
                </motion.div>
              )}
            </motion.button>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm vl-text-muted">No templates match your filters</p>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Step 2: Configure
// ============================================================

function StepConfigure({
  template,
  config,
  onConfigChange,
}: {
  template: TemplateSummary | null
  config: WizardConfig
  onConfigChange: (config: WizardConfig) => void
}) {
  const [newQuestion, setNewQuestion] = useState('')

  if (!template) {
    return (
      <div className="text-center py-12">
        <p className="text-sm vl-text-muted">Please select a template in Step 1</p>
      </div>
    )
  }

  const Icon = ICON_MAP[template.icon] || FileText

  const addQuestion = () => {
    if (!newQuestion.trim()) return
    onConfigChange({
      ...config,
      customQuestions: [...config.customQuestions, newQuestion.trim()],
    })
    setNewQuestion('')
  }

  const removeQuestion = (idx: number) => {
    onConfigChange({
      ...config,
      customQuestions: config.customQuestions.filter((_, i) => i !== idx),
    })
  }

  return (
    <div className="space-y-6">
      {/* Selected Template Summary */}
      <div className="vl-inner rounded-xl p-4 flex items-center gap-4">
        <div
          className="template-icon-box w-12 h-12"
          style={{ background: template.iconGradient || 'linear-gradient(135deg, #10b981, #059669)' }}
        >
          <Icon className="size-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-base font-bold vl-text-heading">{template.title}</h4>
          <p className="text-xs vl-text-muted">{template.expectedDuration} · {template.participantsRequired} participants</p>
        </div>
        <Badge variant="outline" className="text-xs">
          {template.category}
        </Badge>
      </div>

      {/* Rounds */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="vl-text-heading font-semibold flex items-center gap-2">
            <Hash className="size-4 text-emerald-500" /> Discussion Rounds
          </Label>
          <span className="text-lg font-bold vl-text-heading">{config.rounds}</span>
        </div>
        <Slider
          value={[config.rounds]}
          min={1}
          max={10}
          step={1}
          onValueChange={([v]) => onConfigChange({ ...config, rounds: v })}
          className="w-full"
        />
        <div className="flex justify-between text-xs vl-text-muted">
          <span>1 (Quick)</span>
          <span>5 (Normal)</span>
          <span>10 (Deep)</span>
        </div>
      </div>

      {/* Temperature */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="vl-text-heading font-semibold flex items-center gap-2">
            <Thermometer className="size-4 text-emerald-500" /> Temperature
          </Label>
          <span className="text-lg font-bold vl-text-heading">{config.temperature.toFixed(1)}</span>
        </div>
        <Slider
          value={[config.temperature]}
          min={0}
          max={1}
          step={0.1}
          onValueChange={([v]) => onConfigChange({ ...config, temperature: v })}
          className="w-full"
        />
        <div className="flex justify-between text-xs vl-text-muted">
          <span>0.0 (Focused)</span>
          <span>0.5 (Balanced)</span>
          <span>1.0 (Creative)</span>
        </div>
      </div>

      {/* Custom Questions */}
      <div className="space-y-3">
        <Label className="vl-text-heading font-semibold flex items-center gap-2">
          <MessageSquare className="size-4 text-emerald-500" /> Custom Questions
        </Label>
        <div className="flex gap-2">
          <Input
            value={newQuestion}
            onChange={e => setNewQuestion(e.target.value)}
            placeholder="Add a custom question..."
            className="template-editor-input flex-1"
            onKeyDown={e => { if (e.key === 'Enter') addQuestion() }}
          />
          <Button size="sm" onClick={addQuestion} disabled={!newQuestion.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
            <Plus className="size-4" />
          </Button>
        </div>
        {config.customQuestions.length > 0 && (
          <div className="space-y-2">
            {config.customQuestions.map((q, idx) => (
              <motion.div
                key={idx}
                className="flex items-center gap-2 p-3 rounded-lg bg-[var(--vl-bg-inner)] border border-[var(--vl-border-subtle)]"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <span className="text-xs font-bold text-emerald-500">{idx + 1}.</span>
                <span className="text-sm vl-text-body flex-1">{q}</span>
                <button type="button" onClick={() => removeQuestion(idx)} className="p-1 rounded hover:bg-red-500/10 text-red-400">
                  <X className="size-3.5" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Suggested Agents */}
      {template.suggestedAgents?.length > 0 && (
        <div className="space-y-3">
          <Label className="vl-text-heading font-semibold flex items-center gap-2">
            <Users className="size-4 text-emerald-500" /> Suggested Agents
          </Label>
          <div className="flex flex-wrap gap-2">
            {template.suggestedAgents.map((agent, idx) => {
              const isSelected = config.selectedAgents.includes(agent)
              return (
                <button
                  key={agent}
                  type="button"
                  onClick={() => {
                    const next = isSelected
                      ? config.selectedAgents.filter(a => a !== agent)
                      : [...config.selectedAgents, agent]
                    onConfigChange({ ...config, selectedAgents: next })
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    isSelected
                      ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
                      : 'vl-text-muted border border-[var(--vl-border-subtle)] hover:bg-[var(--vl-bg-inner)]'
                  }`}
                >
                  {isSelected && <CheckCircle2 className="size-3.5" />}
                  {agent}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Step 3: Review & Launch
// ============================================================

function StepReviewLaunch({
  template,
  config,
  onLaunch,
  onSaveDraft,
}: {
  template: TemplateSummary | null
  config: WizardConfig
  onLaunch: () => void
  onSaveDraft: () => void
}) {
  if (!template) {
    return (
      <div className="text-center py-12">
        <p className="text-sm vl-text-muted">Please complete Steps 1 and 2 first</p>
      </div>
    )
  }

  const Icon = ICON_MAP[template.icon] || FileText

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="review-summary-card">
        <div className="flex items-center gap-4 mb-6">
          <div
            className="template-icon-box w-14 h-14"
            style={{ background: template.iconGradient || 'linear-gradient(135deg, #10b981, #059669)' }}
          >
            <Icon className="size-7 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold vl-text-heading">{template.title}</h3>
            <p className="text-sm vl-text-muted">{template.category} · {template.difficulty}</p>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-0">
          <div className="review-summary-item">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Hash className="size-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs vl-text-muted">Rounds</p>
              <p className="text-sm font-semibold vl-text-heading">{config.rounds} discussion rounds</p>
            </div>
          </div>

          <div className="review-summary-item">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Thermometer className="size-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs vl-text-muted">Temperature</p>
              <p className="text-sm font-semibold vl-text-heading">{config.temperature.toFixed(1)} ({config.temperature < 0.4 ? 'Focused' : config.temperature < 0.7 ? 'Balanced' : 'Creative'})</p>
            </div>
          </div>

          <div className="review-summary-item">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Clock className="size-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs vl-text-muted">Expected Duration</p>
              <p className="text-sm font-semibold vl-text-heading">{template.expectedDuration}</p>
            </div>
          </div>

          <div className="review-summary-item">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Users className="size-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs vl-text-muted">Participants</p>
              <p className="text-sm font-semibold vl-text-heading">{template.participantsRequired} required{config.selectedAgents.length > 0 ? ` · ${config.selectedAgents.length} selected` : ''}</p>
            </div>
          </div>

          {config.customQuestions.length > 0 && (
            <div className="review-summary-item">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <MessageSquare className="size-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs vl-text-muted">Custom Questions</p>
                <p className="text-sm font-semibold vl-text-heading">{config.customQuestions.length} added</p>
              </div>
            </div>
          )}
        </div>

        {config.selectedAgents.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[var(--vl-border-subtle)]">
            <p className="text-xs font-semibold vl-text-muted mb-2">Selected Agents</p>
            <div className="flex flex-wrap gap-2">
              {config.selectedAgents.map(agent => (
                <Badge key={agent} variant="outline" className="text-xs border-emerald-500/20 text-emerald-600 bg-emerald-500/5">
                  {agent}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button className="flex-1 template-cta-button justify-center !py-4 !text-base" onClick={onLaunch}>
          <Rocket className="size-5" /> Create & Run
        </Button>
        <Button variant="outline" className="h-12 px-6" onClick={onSaveDraft}>
          <Save className="size-4 mr-2" /> Save Draft
        </Button>
      </div>
    </div>
  )
}

// ============================================================
// Main QuickStartEnhanced Component
// ============================================================

export function QuickStartEnhanced({ lang = 'en' }: { lang?: Lang }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [templates, setTemplates] = useState<TemplateSummary[]>([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [difficultyFilter, setDifficultyFilter] = useState('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [config, setConfig] = useState<WizardConfig>({
    rounds: 3,
    temperature: 0.5,
    customQuestions: [],
    selectedAgents: [],
  })
  const [mounted, setMounted] = useState(false)
  const [animDirection, setAnimDirection] = useState<'right' | 'left'>('right')

  useEffect(() => {
    requestAnimationFrame(async () => {
      setMounted(true)
      try {
        const res = await fetch('/api/templates')
        if (res.ok) {
          const data = await res.json()
          const summaries: TemplateSummary[] = (data.data || []).map((t: Record<string, unknown>) => ({
            id: t.id as string,
            title: t.title as string,
            description: t.description as string,
            icon: t.icon as string,
            iconGradient: t.iconGradient as string,
            category: t.category as string,
            difficulty: t.difficulty as string,
            expectedDuration: t.expectedDuration as string,
            participantsRequired: t.participantsRequired as number,
            presetRounds: t.presetRounds as number,
            presetTemperature: t.presetTemperature as number,
            suggestedAgents: (t.suggestedAgents as string[]) || [],
            useCount: t.useCount as number,
          }))
          setTemplates(summaries)
        }
      } catch { /* ignore */ }
    })
  }, [])

  const selectedTemplate = useMemo(() => {
    return templates.find(t => t.id === selectedId) || null
  }, [templates, selectedId])

  const goToStep = useCallback((step: number) => {
    setAnimDirection(step > currentStep ? 'right' : 'left')
    setCurrentStep(step)
  }, [currentStep])

  const handleSelectTemplate = useCallback((id: string) => {
    setSelectedId(id)
    const tmpl = templates.find(t => t.id === id)
    if (tmpl) {
      setConfig(prev => ({
        ...prev,
        rounds: tmpl.presetRounds,
        temperature: tmpl.presetTemperature,
        selectedAgents: [...tmpl.suggestedAgents],
      }))
    }
  }, [templates])

  const handleLaunch = useCallback(() => {
    toast.success(`Meeting created from "${selectedTemplate?.title}" template!`, {
      description: `${config.rounds} rounds · Temperature ${config.temperature}`,
    })
    // Reset wizard
    setCurrentStep(0)
    setSelectedId(null)
    setConfig({ rounds: 3, temperature: 0.5, customQuestions: [], selectedAgents: [] })
  }, [selectedTemplate, config])

  const handleSaveDraft = useCallback(() => {
    toast.info('Draft saved!', {
      description: `Template: ${selectedTemplate?.title}`,
    })
  }, [selectedTemplate])

  const stepLabels = ['Choose Template', 'Configure', 'Review & Launch']

  if (!mounted) return null

  return (
    <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8" aria-label="Quick Start">
      {/* Header */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="text-2xl font-bold vl-text-heading flex items-center gap-3">
          <Rocket className="size-6 text-emerald-500" />
          Quick Start
        </h2>
        <p className="text-sm vl-text-muted mt-1">Create a meeting in 3 easy steps</p>
      </motion.div>

      {/* Featured Templates - One Click */}
      <motion.div
        className="mb-10"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <h3 className="text-sm font-semibold vl-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
          <Zap className="size-4 text-amber-400" /> One-Click Start
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FEATURED_TEMPLATES.map((ft, idx) => {
            const Icon = ICON_MAP[ft.icon] || FileText
            return (
              <motion.button
                key={ft.id}
                type="button"
                className={`featured-template-card ${ft.gradient} text-white text-left`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + idx * 0.08 }}
                onClick={() => {
                  handleSelectTemplate(ft.id)
                  setCurrentStep(1)
                }}
              >
                <div className="relative z-10">
                  <Icon className="size-8 mb-3 opacity-80" />
                  <h4 className="text-lg font-bold mb-1">{ft.title}</h4>
                  <p className="text-sm opacity-80">{ft.description}</p>
                </div>
                <div className="relative z-10 flex items-center justify-between mt-4">
                  <span className="text-xs opacity-60">{ft.stat}</span>
                  <ArrowRight className="size-4 opacity-60" />
                </div>
              </motion.button>
            )
          })}
        </div>
      </motion.div>

      {/* Smart Suggestions */}
      <motion.div
        className="mb-10"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
      >
        <h3 className="text-sm font-semibold vl-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
          <Sparkles className="size-4 text-emerald-400" /> Smart Suggestions
        </h3>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {SUGGESTIONS.map(suggestion => {
            const Icon = ICON_MAP[suggestion.icon] || FileText
            return (
              <button
                key={suggestion.id}
                type="button"
                className="smart-suggestion-card shrink-0"
                onClick={() => {
                  toast.info(`Suggested: ${suggestion.title}`, { description: suggestion.reason })
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${suggestion.color}15` }}
                >
                  <Icon className="size-5" style={{ color: suggestion.color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold vl-text-heading">{suggestion.title}</p>
                  <p className="text-xs vl-text-muted">{suggestion.reason}</p>
                </div>
              </button>
            )
          })}
        </div>
      </motion.div>

      {/* Wizard Card */}
      <motion.div
        className="vl-card rounded-2xl border p-6 sm:p-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        {/* Step Indicator */}
        <WizardStepIndicator currentStep={currentStep} totalSteps={3} labels={stepLabels} />

        {/* Step Content */}
        <div className="mt-6 min-h-[350px]">
          <AnimatePresence mode="wait">
            {currentStep === 0 && (
              <motion.div
                key="step-1"
                className={animDirection === 'right' ? 'wizard-step-enter-right' : 'wizard-step-enter-left'}
              >
                <StepChooseTemplate
                  templates={templates}
                  search={search}
                  categoryFilter={categoryFilter}
                  difficultyFilter={difficultyFilter}
                  selectedId={selectedId}
                  onSearchChange={setSearch}
                  onCategoryChange={setCategoryFilter}
                  onDifficultyChange={setDifficultyFilter}
                  onSelect={handleSelectTemplate}
                />
              </motion.div>
            )}

            {currentStep === 1 && (
              <motion.div
                key="step-2"
                className={animDirection === 'right' ? 'wizard-step-enter-right' : 'wizard-step-enter-left'}
              >
                <StepConfigure
                  template={selectedTemplate}
                  config={config}
                  onConfigChange={setConfig}
                />
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step-3"
                className={animDirection === 'right' ? 'wizard-step-enter-right' : 'wizard-step-enter-left'}
              >
                <StepReviewLaunch
                  template={selectedTemplate}
                  config={config}
                  onLaunch={handleLaunch}
                  onSaveDraft={handleSaveDraft}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-[var(--vl-border-subtle)]">
          <Button
            variant="outline"
            onClick={() => goToStep(currentStep - 1)}
            disabled={currentStep === 0}
            className="vl-text-body"
          >
            <ChevronLeft className="size-4 mr-1" /> Back
          </Button>

          {currentStep < 2 ? (
            <Button
              onClick={() => goToStep(currentStep + 1)}
              disabled={currentStep === 0 && !selectedId}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Next <ChevronRight className="size-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleLaunch}
              disabled={!selectedTemplate}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Rocket className="size-4 mr-2" /> Create & Run
            </Button>
          )}
        </div>
      </motion.div>
    </section>
  )
}
