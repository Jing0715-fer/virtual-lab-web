'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Lightbulb, BookOpen, FlaskConical, BarChart3, Code2,
  CalendarDays, Bug, Dna, ChevronRight, X, Eye, Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

// ============================================================
// Types
// ============================================================

export interface MeetingTemplate {
  id: string
  name: string
  nameKey: string
  description: string
  descriptionKey: string
  icon: React.ElementType
  type: 'team' | 'individual'
  category: string
  presetAgenda: string
  presetQuestions: string[]
  presetRules: string[]
  presetRounds: number
  presetTemperature: number
  suggestedAgents: string[]
  color: string
}

export type TemplateCategory = 'all' | 'research' | 'review' | 'brainstorm' | 'planning' | 'experiment'

interface TemplateCategoryOption {
  key: TemplateCategory
  nameKey: string
}

// ============================================================
// Template Categories
// ============================================================

export const TEMPLATE_CATEGORIES: TemplateCategoryOption[] = [
  { key: 'all', nameKey: 'templates.category.all' },
  { key: 'research', nameKey: 'templates.category.research' },
  { key: 'review', nameKey: 'templates.category.review' },
  { key: 'brainstorm', nameKey: 'templates.category.brainstorm' },
  { key: 'planning', nameKey: 'templates.category.planning' },
  { key: 'experiment', nameKey: 'templates.category.experiment' },
]

// ============================================================
// Predefined Templates
// ============================================================

export const MEETING_TEMPLATES: MeetingTemplate[] = [
  {
    id: 'research-brainstorm',
    name: 'Research Brainstorm',
    nameKey: 'templates.researchBrainstorm.name',
    description: 'Open-ended research exploration with creative ideation',
    descriptionKey: 'templates.researchBrainstorm.desc',
    icon: Lightbulb,
    type: 'team',
    category: 'brainstorm',
    presetAgenda: 'Explore new research directions at the intersection of current expertise. Generate innovative hypotheses and identify high-impact opportunities for investigation.',
    presetQuestions: [
      'What are the most promising unexplored directions in our field?',
      'Which emerging techniques could we apply to our current challenges?',
      'What novel hypotheses can we generate from recent findings?',
    ],
    presetRules: [
      'Encourage wild ideas before evaluating feasibility',
      'Build on each other\'s suggestions',
      'Quantify potential impact for each idea',
    ],
    presetRounds: 3,
    presetTemperature: 0.8,
    suggestedAgents: ['Principal Investigator', 'Computational Biologist', 'ML Engineer'],
    color: '#f59e0b',
  },
  {
    id: 'literature-review',
    name: 'Literature Review',
    nameKey: 'templates.literatureReview.name',
    description: 'Systematic review and synthesis of recent publications',
    descriptionKey: 'templates.literatureReview.desc',
    icon: BookOpen,
    type: 'team',
    category: 'review',
    presetAgenda: 'Critically review and synthesize recent publications on the target topic. Identify consensus, controversies, methodological strengths/weaknesses, and gaps in the current literature.',
    presetQuestions: [
      'What are the key findings from recent high-impact papers?',
      'Where do authors disagree, and what evidence supports each side?',
      'What methodological limitations are common across studies?',
    ],
    presetRules: [
      'Cite specific findings with reasoning',
      'Distinguish between strong and weak evidence',
      'Identify at least 3 specific gaps in the literature',
    ],
    presetRounds: 2,
    presetTemperature: 0.3,
    suggestedAgents: ['Principal Investigator', 'Bioinformatician', 'Scientific Critic'],
    color: '#06b6d4',
  },
  {
    id: 'experimental-design',
    name: 'Experimental Design',
    nameKey: 'templates.experimentalDesign.name',
    description: 'Plan and design controlled experiments with rigor',
    descriptionKey: 'templates.experimentalDesign.desc',
    icon: FlaskConical,
    type: 'team',
    category: 'experiment',
    presetAgenda: 'Design a rigorous experiment to test the current hypothesis. Define controls, sample sizes, statistical analysis plans, and success criteria.',
    presetQuestions: [
      'What are the key variables and controls needed?',
      'What sample size provides adequate statistical power?',
      'How will we measure and validate the primary outcome?',
    ],
    presetRules: [
      'Include appropriate positive and negative controls',
      'Define clear success/failure criteria before starting',
      'Consider potential confounding variables',
    ],
    presetRounds: 3,
    presetTemperature: 0.4,
    suggestedAgents: ['Principal Investigator', 'Immunologist', 'Computational Biologist'],
    color: '#10b981',
  },
  {
    id: 'data-analysis-review',
    name: 'Data Analysis Review',
    nameKey: 'templates.dataAnalysisReview.name',
    description: 'Analyze experimental results and draw conclusions',
    descriptionKey: 'templates.dataAnalysisReview.desc',
    icon: BarChart3,
    type: 'team',
    category: 'review',
    presetAgenda: 'Review and analyze the latest experimental results. Evaluate statistical significance, identify patterns, and formulate conclusions with supporting evidence.',
    presetQuestions: [
      'Are the results statistically significant and biologically meaningful?',
      'What patterns or trends emerge from the data?',
      'How do these results compare to our initial hypotheses?',
    ],
    presetRules: [
      'Support all claims with specific data points',
      'Distinguish correlation from causation',
      'Acknowledge limitations and alternative interpretations',
    ],
    presetRounds: 2,
    presetTemperature: 0.3,
    suggestedAgents: ['Computational Biologist', 'ML Engineer', 'Scientific Critic'],
    color: '#8b5cf6',
  },
  {
    id: 'code-review',
    name: 'Code Review',
    nameKey: 'templates.codeReview.name',
    description: 'Review code quality, correctness, and best practices',
    descriptionKey: 'templates.codeReview.desc',
    icon: Code2,
    type: 'individual',
    category: 'review',
    presetAgenda: 'Review the current code implementation for correctness, efficiency, and adherence to best practices. Identify bugs, performance bottlenecks, and opportunities for improvement.',
    presetQuestions: [
      'Are there any bugs or edge cases not handled properly?',
      'Can the algorithm be optimized for better performance?',
      'Does the code follow established patterns and conventions?',
    ],
    presetRules: [
      'Focus on concrete, actionable feedback',
      'Prioritize correctness over style',
      'Suggest specific alternatives for any issues found',
    ],
    presetRounds: 2,
    presetTemperature: 0.2,
    suggestedAgents: ['ML Engineer'],
    color: '#f97316',
  },
  {
    id: 'project-planning',
    name: 'Project Planning',
    nameKey: 'templates.projectPlanning.name',
    description: 'Sprint planning and roadmap prioritization',
    descriptionKey: 'templates.projectPlanning.desc',
    icon: CalendarDays,
    type: 'team',
    category: 'planning',
    presetAgenda: 'Plan the next phase of the project. Prioritize tasks, assign responsibilities, define milestones, and establish a realistic timeline.',
    presetQuestions: [
      'What are the top 3 priorities for the upcoming sprint?',
      'What dependencies exist between tasks?',
      'What risks could delay our timeline and how can we mitigate them?',
    ],
    presetRules: [
      'Estimate effort for each task realistically',
      'Identify blocking dependencies early',
      'Define clear deliverables for each milestone',
    ],
    presetRounds: 3,
    presetTemperature: 0.5,
    suggestedAgents: ['Principal Investigator', 'Computational Biologist', 'Bioinformatician'],
    color: '#ec4899',
  },
  {
    id: 'problem-solving',
    name: 'Problem Solving',
    nameKey: 'templates.problemSolving.name',
    description: 'Debug issues and troubleshoot technical challenges',
    descriptionKey: 'templates.problemSolving.desc',
    icon: Bug,
    type: 'individual',
    category: 'experiment',
    presetAgenda: 'Systematically debug and troubleshoot the current issue. Identify the root cause, evaluate potential solutions, and implement the most effective fix.',
    presetQuestions: [
      'What are the symptoms and when did they first appear?',
      'What recent changes could have caused this issue?',
      'What are the most likely root causes ranked by probability?',
    ],
    presetRules: [
      'Start with the simplest explanation',
      'Test one variable at a time',
      'Document the debugging process for future reference',
    ],
    presetRounds: 2,
    presetTemperature: 0.4,
    suggestedAgents: ['ML Engineer', 'Computational Biologist'],
    color: '#ef4444',
  },
  {
    id: 'nanobody-design',
    name: 'Nanobody Design',
    nameKey: 'templates.nanobodyDesign.name',
    description: 'SARS-CoV-2 nanobody computational design workflow',
    descriptionKey: 'templates.nanobodyDesign.desc',
    icon: Dna,
    type: 'team',
    category: 'research',
    presetAgenda: 'Design novel nanobodies targeting SARS-CoV-2 spike protein RBD. Generate candidate sequences with ESM, predict structures with AlphaFold-Multimer, score with Rosetta, and select top candidates for experimental validation.',
    presetQuestions: [
      'What nanobody sequences have the highest predicted binding affinity?',
      'Which structural features contribute most to stability?',
      'How do the top candidates compare in developability metrics?',
    ],
    presetRules: [
      'Base recommendations on computational evidence',
      'Consider both binding affinity and developability',
      'Prioritize candidates with favorable safety profiles',
    ],
    presetRounds: 3,
    presetTemperature: 0.6,
    suggestedAgents: ['Principal Investigator', 'Computational Biologist', 'Immunologist', 'ML Engineer'],
    color: '#10b981',
  },
]

// ============================================================
// applyTemplate Helper
// ============================================================

export interface TemplateFormState {
  agenda: string
  questions: string[]
  rules: string[]
  rounds: number
  temperature: number
  saveName: string
}

export function applyTemplate(template: MeetingTemplate, formState: Partial<TemplateFormState>): TemplateFormState {
  return {
    agenda: template.presetAgenda,
    questions: [...template.presetQuestions],
    rules: [...template.presetRules],
    rounds: template.presetRounds,
    temperature: template.presetTemperature,
    saveName: template.id.replace(/-/g, '-'),
    ...formState,
  }
}

// ============================================================
// MeetingTemplateCard Component
// ============================================================

export function MeetingTemplateCard({
  template,
  lang,
  onUse,
}: {
  template: MeetingTemplate
  lang: Lang
  onUse: (template: MeetingTemplate) => void
}) {
  const Icon = template.icon

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="template-card-hover vl-card rounded-xl p-4 cursor-pointer flex flex-col gap-3"
      onClick={() => onUse(template)}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${template.color}20` }}
        >
          <Icon className="size-5" style={{ color: template.color }} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold vl-text-heading">{t(lang, template.nameKey)}</h3>
          <p className="text-[11px] vl-text-muted mt-0.5 line-clamp-2">{t(lang, template.descriptionKey)}</p>
        </div>
      </div>

      {/* Agent suggestions */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {template.suggestedAgents.slice(0, 3).map(agent => (
          <Badge
            key={agent}
            variant="outline"
            className="text-[9px] px-1.5 py-0 h-4 border-[var(--vl-border-subtle)] vl-text-muted"
            style={{ borderColor: `${template.color}30` }}
          >
            {agent}
          </Badge>
        ))}
        {template.suggestedAgents.length > 3 && (
          <span className="text-[9px] vl-text-muted">+{template.suggestedAgents.length - 3}</span>
        )}
      </div>

      {/* Footer: type + rounds */}
      <div className="flex items-center justify-between mt-auto pt-1">
        <div className="flex items-center gap-2 text-[10px] vl-text-muted">
          <span>{template.presetRounds} {t(lang, 'common.rounds')}</span>
          <span>·</span>
          <span>T {template.presetTemperature}</span>
        </div>
        <div
          className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md"
          style={{ color: template.color, backgroundColor: `${template.color}15` }}
        >
          <ChevronRight className="size-3" />
          {t(lang, 'templates.useTemplate')}
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================
// MeetingTemplatePreview Component
// ============================================================

export function MeetingTemplatePreview({
  template,
  lang,
  onClose,
}: {
  template: MeetingTemplate | null
  lang: Lang
  onClose: () => void
}) {
  if (!template) return null

  const Icon = template.icon

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="overflow-hidden"
      >
        <Card className="vl-card border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${template.color}20` }}
                >
                  <Icon className="size-3.5" style={{ color: template.color }} />
                </div>
                <div>
                  <span className="text-xs font-semibold vl-text-heading">{t(lang, template.nameKey)}</span>
                  <span className="text-[10px] vl-text-muted ml-2">
                    {template.presetRounds} {t(lang, 'common.rounds')} · T {template.presetTemperature}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-md hover:bg-[var(--vl-bg-card-hover)] transition-colors cursor-pointer"
              >
                <X className="size-3.5 vl-text-muted" />
              </button>
            </div>

            {/* Preview agenda */}
            <div className="space-y-2">
              <p className="text-[10px] font-medium text-emerald-400 uppercase tracking-wider">{t(lang, 'templates.preview.agenda')}</p>
              <p className="text-xs vl-text-body line-clamp-2">{template.presetAgenda}</p>

              {/* Preview questions */}
              <p className="text-[10px] font-medium text-emerald-400 uppercase tracking-wider mt-2">{t(lang, 'meeting.questions')}</p>
              <ul className="space-y-1">
                {template.presetQuestions.slice(0, 2).map((q, i) => (
                  <li key={i} className="text-[11px] vl-text-muted flex items-start gap-1.5">
                    <span className="text-emerald-400 mt-0.5">•</span>
                    <span className="line-clamp-1">{q}</span>
                  </li>
                ))}
                {template.presetQuestions.length > 2 && (
                  <li className="text-[10px] text-emerald-400/60">
                    +{template.presetQuestions.length - 2} {t(lang, 'templates.preview.more')}
                  </li>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}

// ============================================================
// MeetingTemplateSelector Component
// ============================================================

export function MeetingTemplateSelector({
  lang,
  type,
  onSelect,
  selectedTemplateId,
  onClearTemplate,
}: {
  lang: Lang
  type?: 'team' | 'individual'
  onSelect: (template: MeetingTemplate) => void
  selectedTemplateId?: string | null
  onClearTemplate?: () => void
}) {
  const [activeCategory, setActiveCategory] = useState<TemplateCategory>('all')
  const [isOpen, setIsOpen] = useState(false)

  const filteredTemplates = useMemo(() => {
    let templates = MEETING_TEMPLATES
    if (type) templates = templates.filter(t => t.type === type)
    if (activeCategory !== 'all') templates = templates.filter(t => t.category === activeCategory)
    return templates
  }, [type, activeCategory])

  const selectedTemplate = MEETING_TEMPLATES.find(t => t.id === selectedTemplateId) || null

  return (
    <div className="space-y-3">
      {/* Toggle button + selected badge */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer hover:bg-[var(--vl-bg-card-hover)]"
          style={{ color: isOpen ? '#10b981' : undefined }}
        >
          <Sparkles className="size-3.5" />
          <span className="vl-text-body">{t(lang, 'templates.title')}</span>
          <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
            <ChevronRight className="size-3 vl-text-muted" />
          </motion.div>
        </button>

        {/* Active template badge */}
        {selectedTemplate && (
          <div className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              className="text-[10px] px-2 py-0 h-5"
              style={{
                borderColor: `${selectedTemplate.color}40`,
                color: selectedTemplate.color,
                backgroundColor: `${selectedTemplate.color}10`,
              }}
            >
              {t(lang, selectedTemplate.nameKey)}
            </Badge>
            {onClearTemplate && (
              <button
                type="button"
                onClick={onClearTemplate}
                className="p-0.5 rounded hover:bg-[var(--vl-bg-card-hover)] transition-colors cursor-pointer"
              >
                <X className="size-3 vl-text-muted hover:text-red-400" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Collapsible content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {/* Category filter tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none">
              {TEMPLATE_CATEGORIES.map(cat => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setActiveCategory(cat.key)}
                  className={`
                    flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-medium transition-all duration-200 cursor-pointer
                    ${activeCategory === cat.key
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 template-tab-active'
                      : 'vl-text-muted border border-transparent hover:text-[var(--vl-text-white)] hover:bg-[var(--vl-bg-inner)]'
                    }
                  `}
                >
                  {t(lang, cat.nameKey)}
                </button>
              ))}
            </div>

            {/* Template grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
              {filteredTemplates.map(template => (
                <MeetingTemplateCard
                  key={template.id}
                  template={template}
                  lang={lang}
                  onUse={(tmpl) => {
                    onSelect(tmpl)
                    setIsOpen(false)
                  }}
                />
              ))}
            </div>

            {filteredTemplates.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm vl-text-muted">{t(lang, 'templates.noTemplates')}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
