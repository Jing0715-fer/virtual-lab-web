'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GripVertical, Plus, X, Eye, Star, Download, Upload,
  FlaskConical, BookOpen, Lightbulb, Beaker, BarChart3,
  ShieldAlert, Search, Copy, ChevronRight, Sparkles,
  Layers, FileText, Zap, Users, Bot, Settings,
  GripVertical as DragHandle, ChevronDown, ChevronUp,
  ArrowRight, CheckCircle2, Trash2, Edit3, Save,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

// ============================================================
// Types
// ============================================================

export interface TemplateSection {
  id: string
  type: 'agenda' | 'questions' | 'rules' | 'team-config' | 'custom'
  name: string
  description: string
  fields: TemplateField[]
  icon: React.ElementType
  color: string
  order: number
}

export interface TemplateField {
  id: string
  name: string
  type: 'text' | 'textarea' | 'select' | 'number'
  placeholder?: string
  defaultValue?: string
  options?: string[]
  required?: boolean
}

export interface CustomMeetingTemplate {
  id: string
  name: string
  icon: React.ElementType
  iconColor: string
  description: string
  category: 'research' | 'teaching' | 'industry' | 'custom'
  sections: TemplateSection[]
  rating: number
  ratingCount: number
  usageCount: number
  createdAt: string
  updatedAt: string
  isCustom?: boolean
}

// ============================================================
// Pre-defined Section Blocks
// ============================================================

export const SECTION_BLOCKS: TemplateSection[] = [
  {
    id: 'research-question',
    type: 'custom',
    name: 'Research Question',
    description: 'Define the core research question and hypothesis',
    fields: [
      { id: 'rq-question', name: 'Primary Question', type: 'textarea', placeholder: 'What is the central research question?', required: true },
      { id: 'rq-hypothesis', name: 'Hypothesis', type: 'textarea', placeholder: 'State your hypothesis...' },
      { id: 'rq-significance', name: 'Significance', type: 'textarea', placeholder: 'Why is this question important?' },
    ],
    icon: Lightbulb,
    color: '#f59e0b',
    order: 0,
  },
  {
    id: 'hypothesis-testing',
    type: 'custom',
    name: 'Hypothesis Testing',
    description: 'Design experiments to test your hypotheses',
    fields: [
      { id: 'ht-null', name: 'Null Hypothesis', type: 'textarea', placeholder: 'State the null hypothesis...' },
      { id: 'ht-alternative', name: 'Alternative Hypothesis', type: 'textarea', placeholder: 'State the alternative hypothesis...' },
      { id: 'ht-method', name: 'Testing Method', type: 'select', options: ['Statistical', 'Computational', 'Experimental', 'Observational'] },
      { id: 'ht-alpha', name: 'Significance Level (α)', type: 'number', defaultValue: '0.05' },
    ],
    icon: Beaker,
    color: '#10b981',
    order: 1,
  },
  {
    id: 'literature-review',
    type: 'custom',
    name: 'Literature Review',
    description: 'Review and synthesize existing research',
    fields: [
      { id: 'lr-scope', name: 'Review Scope', type: 'textarea', placeholder: 'What literature should be reviewed?' },
      { id: 'lr-databases', name: 'Databases', type: 'text', placeholder: 'PubMed, arXiv, etc.' },
      { id: 'lr-keywords', name: 'Keywords', type: 'text', placeholder: 'Comma-separated keywords' },
      { id: 'lr-inclusion', name: 'Inclusion Criteria', type: 'textarea', placeholder: 'What criteria for including papers?' },
    ],
    icon: BookOpen,
    color: '#06b6d4',
    order: 2,
  },
  {
    id: 'experimental-design',
    type: 'custom',
    name: 'Experimental Design',
    description: 'Plan experiments with proper controls and variables',
    fields: [
      { id: 'ed-variables', name: 'Key Variables', type: 'textarea', placeholder: 'Independent, dependent, and control variables...' },
      { id: 'ed-controls', name: 'Controls', type: 'textarea', placeholder: 'What controls are needed?' },
      { id: 'ed-sample', name: 'Sample Size', type: 'number', placeholder: 'N = ?' },
      { id: 'ed-method', name: 'Methodology', type: 'select', options: ['In vitro', 'In vivo', 'In silico', 'Mixed'] },
    ],
    icon: FlaskConical,
    color: '#8b5cf6',
    order: 3,
  },
  {
    id: 'data-analysis',
    type: 'custom',
    name: 'Data Analysis Plan',
    description: 'Plan statistical and computational analysis',
    fields: [
      { id: 'da-type', name: 'Analysis Type', type: 'select', options: ['Descriptive', 'Inferential', 'Predictive', 'Exploratory'] },
      { id: 'da-tools', name: 'Tools/Software', type: 'text', placeholder: 'R, Python, etc.' },
      { id: 'da-pipeline', name: 'Analysis Pipeline', type: 'textarea', placeholder: 'Step-by-step analysis plan...' },
    ],
    icon: BarChart3,
    color: '#ec4899',
    order: 4,
  },
  {
    id: 'risk-assessment',
    type: 'custom',
    name: 'Risk Assessment',
    description: 'Identify and mitigate potential risks',
    fields: [
      { id: 'ra-risks', name: 'Potential Risks', type: 'textarea', placeholder: 'What could go wrong?' },
      { id: 'ra-mitigation', name: 'Mitigation Strategies', type: 'textarea', placeholder: 'How will you address each risk?' },
      { id: 'ra-severity', name: 'Risk Severity', type: 'select', options: ['Low', 'Medium', 'High', 'Critical'] },
      { id: 'ra-contingency', name: 'Contingency Plan', type: 'textarea', placeholder: 'Plan B if things go wrong...' },
    ],
    icon: ShieldAlert,
    color: '#ef4444',
    order: 5,
  },
]

// ============================================================
// Default Built-in Templates
// ============================================================

const BUILTIN_TEMPLATES: CustomMeetingTemplate[] = [
  {
    id: 'full-research',
    name: 'Full Research Meeting',
    icon: FlaskConical,
    iconColor: '#10b981',
    description: 'Complete research meeting with all standard sections',
    category: 'research',
    sections: SECTION_BLOCKS,
    rating: 4.8,
    ratingCount: 42,
    usageCount: 256,
    createdAt: '2024-01-01',
    updatedAt: '2024-06-01',
  },
  {
    id: 'quick-review',
    name: 'Quick Literature Review',
    icon: BookOpen,
    iconColor: '#06b6d4',
    description: 'Focused literature review and gap analysis',
    category: 'research',
    sections: [SECTION_BLOCKS[2]], // literature-review
    rating: 4.5,
    ratingCount: 18,
    usageCount: 134,
    createdAt: '2024-02-15',
    updatedAt: '2024-05-20',
  },
  {
    id: 'hypothesis-workshop',
    name: 'Hypothesis Workshop',
    icon: Lightbulb,
    iconColor: '#f59e0b',
    description: 'Structured workshop for hypothesis generation and testing',
    category: 'teaching',
    sections: [SECTION_BLOCKS[0], SECTION_BLOCKS[1]],
    rating: 4.2,
    ratingCount: 9,
    usageCount: 67,
    createdAt: '2024-03-10',
    updatedAt: '2024-06-01',
  },
  {
    id: 'industry-review',
    name: 'Industry Risk Assessment',
    icon: ShieldAlert,
    iconColor: '#ef4444',
    description: 'Industry-focused risk assessment and mitigation planning',
    category: 'industry',
    sections: [SECTION_BLOCKS[5]],
    rating: 4.6,
    ratingCount: 23,
    usageCount: 189,
    createdAt: '2024-01-20',
    updatedAt: '2024-05-15',
  },
  {
    id: 'experiment-design',
    name: 'Experiment Design Sprint',
    icon: Beaker,
    iconColor: '#8b5cf6',
    description: 'Rapid experimental design with data analysis planning',
    category: 'research',
    sections: [SECTION_BLOCKS[3], SECTION_BLOCKS[4]],
    rating: 4.4,
    ratingCount: 15,
    usageCount: 98,
    createdAt: '2024-04-01',
    updatedAt: '2024-06-01',
  },
]

// ============================================================
// Storage
// ============================================================

const STORAGE_KEY = 'vl-custom-templates'

function loadCustomTemplates(): CustomMeetingTemplate[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveCustomTemplates(templates: CustomMeetingTemplate[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
  } catch { /* ignore */ }
}

// ============================================================
// TemplateBuilder Component
// ============================================================

export function TemplateBuilder({
  lang = 'en',
  onSave,
  onCancel,
}: {
  lang?: Lang
  onSave?: (template: CustomMeetingTemplate) => void
  onCancel?: () => void
}) {
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [templateCategory, setTemplateCategory] = useState<CustomMeetingTemplate['category']>('research')
  const [templateIcon, setTemplateIcon] = useState<React.ElementType>(FlaskConical)
  const [templateIconColor, setTemplateIconColor] = useState('#10b981')
  const [selectedSections, setSelectedSections] = useState<TemplateSection[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [customSectionName, setCustomSectionName] = useState('')
  const [customSectionDesc, setCustomSectionDesc] = useState('')
  const [customFields, setCustomFields] = useState<TemplateField[]>([
    { id: `cf-${Date.now()}`, name: '', type: 'text', placeholder: '' },
  ])

  const iconOptions = [
    { icon: FlaskConical, color: '#10b981' },
    { icon: BookOpen, color: '#06b6d4' },
    { icon: Lightbulb, color: '#f59e0b' },
    { icon: Beaker, color: '#8b5cf6' },
    { icon: BarChart3, color: '#ec4899' },
    { icon: ShieldAlert, color: '#ef4444' },
    { icon: Users, color: '#10b981' },
    { icon: Bot, color: '#06b6d4' },
  ]

  const addSection = useCallback((section: TemplateSection) => {
    if (selectedSections.some(s => s.id === section.id)) return
    setSelectedSections(prev => [...prev, { ...section, order: prev.length }])
  }, [selectedSections])

  const removeSection = useCallback((sectionId: string) => {
    setSelectedSections(prev => prev.filter(s => s.id !== sectionId).map((s, i) => ({ ...s, order: i })))
  }, [])

  const moveSection = useCallback((index: number, direction: 'up' | 'down') => {
    setSelectedSections(prev => {
      const next = [...prev]
      const target = direction === 'up' ? index - 1 : index + 1
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next.map((s, i) => ({ ...s, order: i }))
    })
  }, [])

  const addCustomField = useCallback(() => {
    setCustomFields(prev => [...prev, { id: `cf-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, name: '', type: 'text', placeholder: '' }])
  }, [])

  const updateCustomField = useCallback((fieldId: string, updates: Partial<TemplateField>) => {
    setCustomFields(prev => prev.map(f => f.id === fieldId ? { ...f, ...updates } : f))
  }, [])

  const removeCustomField = useCallback((fieldId: string) => {
    setCustomFields(prev => prev.length > 1 ? prev.filter(f => f.id !== fieldId) : prev)
  }, [])

  const addCustomSection = useCallback(() => {
    if (!customSectionName.trim()) return
    const section: TemplateSection = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      type: 'custom',
      name: customSectionName.trim(),
      description: customSectionDesc.trim(),
      fields: customFields.filter(f => f.name.trim()),
      icon: templateIcon,
      color: templateIconColor,
      order: selectedSections.length,
    }
    setSelectedSections(prev => [...prev, section])
    setCustomSectionName('')
    setCustomSectionDesc('')
    setCustomFields([{ id: `cf-${Date.now()}`, name: '', type: 'text', placeholder: '' }])
  }, [customSectionName, customSectionDesc, customFields, templateIcon, templateIconColor, selectedSections.length])

  const handleSave = useCallback(() => {
    if (!templateName.trim() || selectedSections.length === 0) return
    const template: CustomMeetingTemplate = {
      id: `tmpl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: templateName.trim(),
      icon: templateIcon,
      iconColor: templateIconColor,
      description: templateDescription.trim(),
      category: templateCategory,
      sections: selectedSections,
      rating: 0,
      ratingCount: 0,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isCustom: true,
    }

    // Save to localStorage
    const existing = loadCustomTemplates()
    saveCustomTemplates([...existing, template])

    onSave?.(template)
  }, [templateName, templateDescription, templateCategory, templateIcon, templateIconColor, selectedSections, onSave])

  return (
    <div className="template-builder vl-card rounded-xl border overflow-hidden">
      <div className="p-4 border-b border-[var(--vl-border)]">
        <h3 className="text-sm font-semibold vl-text-heading flex items-center gap-2">
          <Layers className="size-4 text-emerald-400" />
          {t(lang, 'templates.builder.title')}
        </h3>
        <p className="text-[10px] vl-text-muted mt-1">{t(lang, 'templates.builder.description')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
        {/* Left: Builder */}
        <div className="p-4 space-y-4 border-r border-[var(--vl-border)]">
          {/* Template info */}
          <div className="space-y-2">
            <Label className="vl-text-label text-xs">{t(lang, 'templates.builder.name')} *</Label>
            <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} className="vl-input h-8 text-xs" placeholder={t(lang, 'templates.builder.namePlaceholder')} />
          </div>
          <div className="space-y-2">
            <Label className="vl-text-label text-xs">{t(lang, 'templates.builder.description')}</Label>
            <Textarea value={templateDescription} onChange={(e) => setTemplateDescription(e.target.value)} className="vl-input min-h-[60px] text-xs" placeholder={t(lang, 'templates.builder.descPlaceholder')} />
          </div>

          {/* Icon + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="vl-text-label text-xs">{t(lang, 'templates.builder.icon')}</Label>
              <div className="flex gap-1.5 flex-wrap">
                {iconOptions.map(opt => (
                  <button
                    key={String(opt.icon)}
                    onClick={() => { setTemplateIcon(opt.icon); setTemplateIconColor(opt.color) }}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                      templateIcon === opt.icon
                        ? 'ring-2 ring-offset-1 ring-offset-[var(--vl-bg-card)]'
                        : 'hover:bg-[var(--vl-bg-inner)]'
                    }`}
                    style={templateIcon === opt.icon ? { backgroundColor: `${opt.color}15`, ['--tw-ring-color' as string]: opt.color } : {}}
                  >
                    <opt.icon className="size-4" style={{ color: opt.color }} />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="vl-text-label text-xs">{t(lang, 'templates.builder.category')}</Label>
              <div className="flex flex-col gap-1">
                {(['research', 'teaching', 'industry', 'custom'] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setTemplateCategory(cat)}
                    className={`text-left text-[10px] px-2 py-1 rounded transition-colors ${
                      templateCategory === cat
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'vl-text-muted hover:bg-[var(--vl-bg-inner)]'
                    }`}
                  >
                    {t(lang, `templates.category.${cat}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section blocks to add */}
          <div className="space-y-2">
            <Label className="vl-text-label text-xs">{t(lang, 'templates.builder.addSections')}</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {SECTION_BLOCKS.map(block => {
                const Icon = block.icon
                const isAdded = selectedSections.some(s => s.id === block.id)
                return (
                  <motion.button
                    key={block.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => isAdded ? removeSection(block.id) : addSection(block)}
                    className={`flex items-center gap-1.5 p-2 rounded-lg text-left transition-all border ${
                      isAdded
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : 'border-[var(--vl-border-subtle)] hover:border-[var(--vl-border)] hover:bg-[var(--vl-bg-inner)]'
                    }`}
                  >
                    <Icon className="size-3.5 shrink-0" style={{ color: isAdded ? '#10b981' : block.color }} />
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium vl-text-body truncate">{block.name}</p>
                    </div>
                    {isAdded ? <CheckCircle2 className="size-3 text-emerald-400 ml-auto shrink-0" /> : <Plus className="size-3 vl-text-muted ml-auto shrink-0" />}
                  </motion.button>
                )
              })}
            </div>
          </div>

          {/* Custom section builder */}
          <div className="space-y-2 vl-inner rounded-lg p-3">
            <Label className="vl-text-label text-xs flex items-center gap-1">
              <Plus className="size-3 text-cyan-400" />
              {t(lang, 'templates.builder.customSection')}
            </Label>
            <Input value={customSectionName} onChange={(e) => setCustomSectionName(e.target.value)} className="vl-input h-7 text-[10px]" placeholder={t(lang, 'templates.builder.sectionName')} />
            <Input value={customSectionDesc} onChange={(e) => setCustomSectionDesc(e.target.value)} className="vl-input h-7 text-[10px]" placeholder={t(lang, 'templates.builder.sectionDesc')} />
            {customFields.map((field, i) => (
              <div key={field.id} className="flex items-center gap-1.5">
                <Input value={field.name} onChange={(e) => updateCustomField(field.id, { name: e.target.value })} className="vl-input h-6 text-[9px] flex-1" placeholder={t(lang, 'templates.builder.fieldName')} />
                <select value={field.type} onChange={(e) => updateCustomField(field.id, { type: e.target.value as TemplateField['type'] })} className="vl-input h-6 text-[9px] px-1 rounded">
                  <option value="text">Text</option>
                  <option value="textarea">Long text</option>
                  <option value="number">Number</option>
                </select>
                <Input value={field.placeholder || ''} onChange={(e) => updateCustomField(field.id, { placeholder: e.target.value })} className="vl-input h-6 text-[9px] flex-1" placeholder={t(lang, 'templates.builder.fieldPlaceholder')} />
                <button onClick={() => removeCustomField(field.id)} className="p-0.5 rounded hover:bg-red-500/10 vl-text-muted hover:text-red-400 shrink-0">
                  <Trash2 className="size-2.5" />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="h-6 text-[9px] px-2 vl-text-muted" onClick={addCustomField}>
                <Plus className="size-2.5 mr-1" /> {t(lang, 'templates.builder.addField')}
              </Button>
              <Button size="sm" className="h-6 text-[9px] px-2 bg-cyan-600 hover:bg-cyan-700 text-white" onClick={addCustomSection} disabled={!customSectionName.trim()}>
                <Plus className="size-2.5 mr-1" /> {t(lang, 'templates.builder.addCustomSection')}
              </Button>
            </div>
          </div>
        </div>

        {/* Right: Selected sections + preview */}
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="vl-text-label text-xs">{t(lang, 'templates.builder.selectedSections')} ({selectedSections.length})</Label>
            <Button variant="ghost" size="sm" className="h-6 text-[9px] vl-text-muted hover:text-emerald-400" onClick={() => setShowPreview(!showPreview)}>
              <Eye className="size-3 mr-1" />
              {showPreview ? t(lang, 'templates.builder.edit') : t(lang, 'templates.builder.preview')}
            </Button>
          </div>

          {showPreview ? (
            /* Preview mode */
            <div className="space-y-3">
              <div className="vl-card rounded-xl p-4 glassmorphism-template-card">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${templateIconColor}20` }}>
                    {React.createElement(templateIcon, { className: 'size-5', style: { color: templateIconColor } })}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold vl-text-heading">{templateName || t(lang, 'templates.builder.untitled')}</h4>
                    <p className="text-[10px] vl-text-muted">{templateDescription || t(lang, 'templates.builder.noDesc')}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[9px] px-1.5 border-[var(--vl-border-subtle)] vl-text-muted">
                  {t(lang, `templates.category.${templateCategory}`)}
                </Badge>
              </div>
              {selectedSections.map(section => {
                const Icon = section.icon
                return (
                  <div key={section.id} className="vl-inner rounded-lg p-3 border-l-2" style={{ borderLeftColor: section.color }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="size-3.5" style={{ color: section.color }} />
                      <span className="text-xs font-medium vl-text-heading">{section.name}</span>
                    </div>
                    <p className="text-[10px] vl-text-muted mb-2">{section.description}</p>
                    {section.fields.map(field => (
                      <div key={field.id} className="mb-1.5">
                        <Label className="text-[9px] vl-text-label">{field.name}</Label>
                        {field.type === 'textarea' ? (
                          <Textarea className="vl-input h-6 text-[9px] min-h-[40px] mt-0.5" placeholder={field.placeholder} disabled />
                        ) : (
                          <Input className="vl-input h-5 text-[9px] mt-0.5" placeholder={field.placeholder} disabled />
                        )}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          ) : (
            /* Edit mode - reorder/remove sections */
            <div className="space-y-2">
              {selectedSections.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Layers className="size-8 vl-text-muted mb-2 opacity-30" />
                  <p className="text-xs vl-text-muted">{t(lang, 'templates.builder.noSections')}</p>
                  <p className="text-[10px] vl-text-muted mt-1">{t(lang, 'templates.builder.addSectionsHint')}</p>
                </div>
              ) : (
                selectedSections.map((section, index) => {
                  const Icon = section.icon
                  return (
                    <motion.div
                      key={section.id}
                      layout
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="vl-inner rounded-lg p-2.5 flex items-center gap-2 group border-l-2"
                      style={{ borderLeftColor: section.color }}
                    >
                      <GripVertical className="size-3 vl-text-muted cursor-grab shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Icon className="size-3.5 shrink-0" style={{ color: section.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-medium vl-text-body">{section.name}</p>
                        <p className="text-[9px] vl-text-muted line-clamp-1">{section.description}</p>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button onClick={() => moveSection(index, 'up')} disabled={index === 0} className="p-0.5 rounded hover:bg-[var(--vl-bg-inner)] vl-text-muted hover:text-emerald-400 disabled:opacity-30">
                          <ChevronUp className="size-2.5" />
                        </button>
                        <button onClick={() => moveSection(index, 'down')} disabled={index === selectedSections.length - 1} className="p-0.5 rounded hover:bg-[var(--vl-bg-inner)] vl-text-muted hover:text-emerald-400 disabled:opacity-30">
                          <ChevronDown className="size-2.5" />
                        </button>
                        <button onClick={() => removeSection(section.id)} className="p-0.5 rounded hover:bg-red-500/10 vl-text-muted hover:text-red-400">
                          <X className="size-2.5" />
                        </button>
                      </div>
                    </motion.div>
                  )
                })
              )}
            </div>
          )}

          {/* Save / Cancel */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSave}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"
              disabled={!templateName.trim() || selectedSections.length === 0}
            >
              <Save className="size-3.5 mr-1.5" /> {t(lang, 'templates.builder.save')}
            </Button>
            {onCancel && (
              <Button variant="outline" onClick={onCancel} className="h-8 text-xs border-[var(--vl-border)] vl-text-body">
                {t(lang, 'common.cancel')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// TemplateGallery Component
// ============================================================

export function TemplateGallery({
  lang = 'en',
  onUseTemplate,
  onCloneTemplate,
}: {
  lang?: Lang
  onUseTemplate?: (template: CustomMeetingTemplate) => void
  onCloneTemplate?: (template: CustomMeetingTemplate) => void
}) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<CustomMeetingTemplate['category'] | 'all'>('all')
  const [customTemplates, setCustomTemplates] = useState<CustomMeetingTemplate[]>([])
  const [mounted, setMounted] = useState(false)
  const [ratings, setRatings] = useState<Record<string, number>>({})

  // Load custom templates
  useEffect(() => {
    requestAnimationFrame(() => {
      setCustomTemplates(loadCustomTemplates())
      setMounted(true)
      // Load ratings
      try {
        const raw = localStorage.getItem('vl-template-ratings')
        if (raw) setRatings(JSON.parse(raw))
      } catch { /* ignore */ }
    })
  }, [])

  const allTemplates = useMemo(() => {
    return [...BUILTIN_TEMPLATES, ...customTemplates]
  }, [customTemplates])

  const filteredTemplates = useMemo(() => {
    let templates = allTemplates
    if (category !== 'all') templates = templates.filter(t => t.category === category)
    if (search.trim()) {
      const q = search.toLowerCase()
      templates = templates.filter(t => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
    }
    return templates
  }, [allTemplates, category, search])

  const rateTemplate = useCallback((templateId: string, rating: number) => {
    setRatings(prev => {
      const next = { ...prev, [templateId]: rating }
      try { localStorage.setItem('vl-template-ratings', JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }, [])

  const exportTemplate = useCallback((template: CustomMeetingTemplate) => {
    const exportData = {
      ...template,
      icon: undefined, // Can't serialize React components
      iconDisplayName: String(template.icon) || 'FlaskConical',
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `template-${template.id}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const importTemplate = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string)
          const imported: CustomMeetingTemplate = {
            ...data,
            id: `tmpl-${Date.now()}-imported`,
            icon: FlaskConical, // Default icon for imported
            isCustom: true,
          }
          const existing = loadCustomTemplates()
          saveCustomTemplates([...existing, imported])
          setCustomTemplates([...existing, imported])
        } catch { /* ignore invalid JSON */ }
      }
      reader.readAsText(file)
    }
    input.click()
  }, [])

  if (!mounted) return null

  const categories: { key: typeof category; labelKey: string }[] = [
    { key: 'all', labelKey: 'templates.category.all' },
    { key: 'research', labelKey: 'templates.category.research' },
    { key: 'teaching', labelKey: 'templates.category.teaching' },
    { key: 'industry', labelKey: 'templates.category.industry' },
    { key: 'custom', labelKey: 'templates.category.custom' },
  ]

  const renderStars = (templateId: string) => {
    const userRating = ratings[templateId] || 0
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onClick={(e) => { e.stopPropagation(); rateTemplate(templateId, star) }}
            className="transition-transform hover:scale-125"
          >
            <Star
              className={`size-3 ${star <= userRating ? 'text-amber-400 fill-amber-400' : 'vl-text-muted'}`}
            />
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="template-gallery space-y-4">
      {/* Header with search and actions */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 vl-text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(lang, 'templates.gallery.search')}
            className="vl-input h-8 text-xs pl-9"
          />
        </div>
        <Button variant="outline" size="sm" className="h-8 text-[10px] border-[var(--vl-border)] vl-text-body" onClick={importTemplate}>
          <Upload className="size-3 mr-1.5" /> {t(lang, 'templates.gallery.import')}
        </Button>
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto">
        {categories.map(cat => (
          <button
            key={cat.key}
            onClick={() => setCategory(cat.key)}
            className={`px-3 py-1 rounded-full text-[10px] font-medium transition-all whitespace-nowrap ${
              category === cat.key
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'vl-text-muted border border-transparent hover:text-[var(--vl-text-white)] hover:bg-[var(--vl-bg-inner)]'
            }`}
          >
            {t(lang, cat.labelKey)}
          </button>
        ))}
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredTemplates.map(template => {
          const Icon = template.icon
          return (
            <motion.div
              key={template.id}
              whileHover={{ y: -2 }}
              className="glassmorphism-template-card vl-card rounded-xl p-4 cursor-pointer transition-all duration-300 hover:shadow-lg"
              onClick={() => onUseTemplate?.(template)}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${template.iconColor}20` }}>
                  <Icon className="size-5" style={{ color: template.iconColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-semibold vl-text-heading truncate">{template.name}</h4>
                    {template.isCustom && (
                      <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 border-emerald-500/30 text-emerald-400 bg-emerald-500/5">
                        {t(lang, 'templates.category.custom')}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] vl-text-muted line-clamp-2 mt-0.5">{template.description}</p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-[var(--vl-border-subtle)]">
                <div className="flex items-center gap-2">
                  {renderStars(template.id)}
                  <span className="text-[9px] vl-text-muted">{template.rating.toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 border-[var(--vl-border-subtle)] vl-text-muted">
                    {template.sections.length} {t(lang, 'templates.gallery.sections')}
                  </Badge>
                  <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 border-[var(--vl-border-subtle)] vl-text-muted flex items-center gap-0.5">
                    <Zap className="size-2" /> {template.usageCount}
                  </Badge>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 text-[9px] px-2 vl-text-muted hover:text-emerald-400"
                  onClick={(e) => { e.stopPropagation(); onCloneTemplate?.(template) }}
                >
                  <Copy className="size-2.5 mr-1" /> {t(lang, 'templates.gallery.clone')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 text-[9px] px-2 vl-text-muted hover:text-cyan-400"
                  onClick={(e) => { e.stopPropagation(); exportTemplate(template) }}
                >
                  <Download className="size-2.5 mr-1" /> {t(lang, 'templates.gallery.export')}
                </Button>
              </div>
            </motion.div>
          )
        })}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12">
          <Layers className="size-10 vl-text-muted mb-3 opacity-30" />
          <p className="text-sm vl-text-muted">{t(lang, 'templates.gallery.noResults')}</p>
          <p className="text-[10px] vl-text-muted mt-1">{t(lang, 'templates.gallery.noResultsHint')}</p>
        </div>
      )}
    </div>
  )
}

// ============================================================
// TemplateApplication Component
// ============================================================

export function TemplateApplication({
  template,
  agents,
  lang = 'en',
  onApply,
  onCancel,
}: {
  template: CustomMeetingTemplate
  agents: { id: string; title: string; color: string; icon: string; expertise?: string }[]
  lang?: Lang
  onApply?: (data: { sections: string[]; teamSuggestion?: { leadId?: string; memberIds?: string[] } }) => void
  onCancel?: () => void
}) {
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set(template.sections.map(s => s.id)))
  const [showPreview, setShowPreview] = useState(true)

  // Smart field mapping - suggest team composition based on section analysis
  const teamSuggestion = useMemo(() => {
    const sectionNames = template.sections
      .filter(s => selectedSections.has(s.id))
      .map(s => s.name.toLowerCase())

    let leadId: string | undefined
    const memberIds: string[] = []

    // Find PI for lead
    const pi = agents.find(a => a.title.toLowerCase().includes('principal') || a.title.toLowerCase().includes('investigator'))
    if (pi) leadId = pi.id

    // Suggest members based on sections
    if (sectionNames.some(n => n.includes('computational') || n.includes('data'))) {
      const cb = agents.find(a => a.title.toLowerCase().includes('computational'))
      if (cb) memberIds.push(cb.id)
    }
    if (sectionNames.some(n => n.includes('literature') || n.includes('review'))) {
      const bio = agents.find(a => a.title.toLowerCase().includes('bioinformat'))
      if (bio) memberIds.push(bio.id)
    }
    if (sectionNames.some(n => n.includes('experimental') || n.includes('hypothesis'))) {
      const imm = agents.find(a => a.title.toLowerCase().includes('immunol'))
      if (imm) memberIds.push(imm.id)
    }
    if (sectionNames.some(n => n.includes('risk') || n.includes('critic'))) {
      const sc = agents.find(a => a.title.toLowerCase().includes('critic'))
      if (sc) memberIds.push(sc.id)
    }

    return { leadId, memberIds: [...new Set(memberIds)] }
  }, [template, selectedSections, agents])

  const toggleSection = useCallback((sectionId: string) => {
    setSelectedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) next.delete(sectionId)
      else next.add(sectionId)
      return next
    })
  }, [])

  const handleApply = useCallback(() => {
    if (selectedSections.size === 0) return
    onApply?.({
      sections: Array.from(selectedSections),
      teamSuggestion,
    })
  }, [selectedSections, teamSuggestion, onApply])

  const Icon = template.icon

  return (
    <div className="template-application vl-card rounded-xl border overflow-hidden">
      {/* Template header */}
      <div className="p-4 border-b border-[var(--vl-border)] glassmorphism-template-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${template.iconColor}20` }}>
            <Icon className="size-5" style={{ color: template.iconColor }} />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold vl-text-heading">{template.name}</h3>
            <p className="text-[10px] vl-text-muted">{template.description}</p>
          </div>
          <Badge variant="outline" className="text-[9px] px-1.5 border-[var(--vl-border-subtle)] vl-text-muted">
            {t(lang, `templates.category.${template.category}`)}
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Section selection (partial application) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="vl-text-label text-xs">{t(lang, 'templates.application.selectSections')}</Label>
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="sm" className="h-5 text-[9px] px-2 vl-text-muted hover:text-emerald-400" onClick={() => setSelectedSections(new Set(template.sections.map(s => s.id)))}>
                {t(lang, 'templates.application.selectAll')}
              </Button>
              <Button variant="ghost" size="sm" className="h-5 text-[9px] px-2 vl-text-muted hover:text-red-400" onClick={() => setSelectedSections(new Set())}>
                {t(lang, 'templates.application.deselectAll')}
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            {template.sections.map(section => {
              const SectionIcon = section.icon
              const isSelected = selectedSections.has(section.id)
              return (
                <motion.button
                  key={section.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => toggleSection(section.id)}
                  className={`w-full text-left flex items-center gap-2 p-2.5 rounded-lg transition-all border ${
                    isSelected
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : 'border-[var(--vl-border-subtle)] opacity-50'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-[var(--vl-border)]'
                  }`}>
                    {isSelected && <CheckCircle2 className="size-3 text-white" />}
                  </div>
                  <SectionIcon className="size-3.5 shrink-0" style={{ color: section.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium vl-text-body">{section.name}</p>
                    <p className="text-[9px] vl-text-muted line-clamp-1">{section.description}</p>
                  </div>
                  {section.fields.length > 0 && (
                    <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 border-[var(--vl-border-subtle)] vl-text-muted shrink-0">
                      {section.fields.length} {t(lang, 'templates.application.fields')}
                    </Badge>
                  )}
                </motion.button>
              )
            })}
          </div>
        </div>

        {/* Smart team suggestion */}
        {teamSuggestion.leadId && (
          <div className="vl-inner rounded-lg p-3 border border-cyan-500/20">
            <p className="text-[10px] font-medium text-cyan-400 mb-2 flex items-center gap-1">
              <Users className="size-3" /> {t(lang, 'templates.application.teamSuggestion')}
            </p>
            <div className="space-y-1.5">
              {teamSuggestion.leadId && (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] vl-text-muted w-12">{t(lang, 'templates.application.lead')}:</span>
                  {(() => {
                    const agent = agents.find(a => a.id === teamSuggestion.leadId)
                    return agent ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] text-white font-bold" style={{ backgroundColor: agent.color }}>{agent.title.charAt(0)}</div>
                        <span className="text-[10px] vl-text-body">{agent.title}</span>
                      </div>
                    ) : null
                  })()}
                </div>
              )}
              {teamSuggestion.memberIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] vl-text-muted w-12">{t(lang, 'templates.application.members')}:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {teamSuggestion.memberIds.map(id => {
                      const agent = agents.find(a => a.id === id)
                      return agent ? (
                        <div key={id} className="flex items-center gap-1">
                          <div className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] text-white font-bold" style={{ backgroundColor: agent.color }}>{agent.title.charAt(0)}</div>
                          <span className="text-[10px] vl-text-body">{agent.title}</span>
                        </div>
                      ) : null
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Preview toggle */}
        <Button variant="ghost" size="sm" className="h-6 text-[9px] w-full vl-text-muted hover:text-emerald-400" onClick={() => setShowPreview(!showPreview)}>
          {showPreview ? <ChevronUp className="size-3 mr-1" /> : <ChevronDown className="size-3 mr-1" />}
          {showPreview ? t(lang, 'templates.application.hidePreview') : t(lang, 'templates.application.showPreview')}
        </Button>

        <AnimatePresence>
          {showPreview && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2 overflow-hidden"
            >
              {template.sections.filter(s => selectedSections.has(s.id)).map(section => (
                <div key={section.id} className="vl-inner rounded-lg p-2.5 border-l-2" style={{ borderLeftColor: section.color }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <section.icon className="size-3" style={{ color: section.color }} />
                    <span className="text-[10px] font-medium vl-text-heading">{section.name}</span>
                  </div>
                  {section.fields.map(field => (
                    <div key={field.id} className="ml-5 mb-1">
                      <span className="text-[9px] vl-text-label">{field.name}: </span>
                      <span className="text-[9px] vl-text-muted">{field.defaultValue || field.placeholder || '—'}</span>
                    </div>
                  ))}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Apply / Cancel */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleApply}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"
            disabled={selectedSections.size === 0}
          >
            <Zap className="size-3.5 mr-1.5" /> {t(lang, 'templates.application.apply')} ({selectedSections.size}/{template.sections.length})
          </Button>
          {onCancel && (
            <Button variant="outline" onClick={onCancel} className="h-8 text-xs border-[var(--vl-border)] vl-text-body">
              {t(lang, 'common.cancel')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
