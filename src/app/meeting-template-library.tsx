'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Lightbulb, FlaskConical, BarChart3, FileText, Users,
  PenTool, Puzzle, Map, Code2, GraduationCap, Handshake, Search,
  Star, Clock, UsersRound, ChevronDown, ChevronUp, X, Eye,
  Edit3, Zap, Trash2, Plus, GripVertical, ChevronLeft, ChevronRight,
  Sparkles, Heart, CheckCircle2, Save, ArrowRight, Info, Target,
  Lightbulb as TipIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

// ============================================================
// Types
// ============================================================

interface AgendaSection {
  id: string
  title: string
  description: string
  duration: string
}

interface ParticipantRole {
  id: string
  name: string
  responsibility: string
  prompt: string
  color: string
}

interface TemplateData {
  id: string
  title: string
  description: string
  longDescription: string
  icon: string
  iconGradient: string
  category: 'Research' | 'Planning' | 'Review' | 'Brainstorm' | 'Analysis'
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  expectedDuration: string
  participantsRequired: number
  participantRoles: ParticipantRole[]
  agendaSections: AgendaSection[]
  expectedOutcomes: string[]
  tips: string[]
  presetQuestions: string[]
  presetRules: string[]
  presetRounds: number
  presetTemperature: number
  suggestedAgents: string[]
  useCount: number
  isCustom: boolean
  createdAt: string
  updatedAt: string
}

// ============================================================
// Icon Mapping
// ============================================================

const ICON_MAP: Record<string, React.ElementType> = {
  BookOpen, Lightbulb, FlaskConical, BarChart3, FileText, Users,
  PenTool, Puzzle, Map, Code2, GraduationCap, Handshake, Zap,
}

const CATEGORY_COLORS: Record<string, string> = {
  Research: '#8b5cf6',
  Planning: '#06b6d4',
  Review: '#3b82f6',
  Brainstorm: '#f59e0b',
  Analysis: '#10b981',
}

// ============================================================
// Star Rating Component
// ============================================================

function StarRating({ rating, onRate }: { rating: number; onRate?: (r: number) => void }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          className={`star-rating-star ${star <= rating ? 'filled' : ''} ${star <= hovered ? 'hovered' : ''}`}
          onClick={() => onRate?.(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
        >
          <Star className="size-4" />
        </button>
      ))}
    </div>
  )
}

// ============================================================
// Difficulty Badge Component
// ============================================================

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const config = {
    beginner: { label: 'Beginner', class: 'difficulty-beginner' },
    intermediate: { label: 'Intermediate', class: 'difficulty-intermediate' },
    advanced: { label: 'Advanced', class: 'difficulty-advanced' },
  }
  const c = config[difficulty as keyof typeof config] || config.beginner
  return <span className={c.class}>{c.label}</span>
}

// ============================================================
// Category Tag Component
// ============================================================

function CategoryTag({ category }: { category: string }) {
  return <span className={`category-tag category-${category.toLowerCase()}`}>{category}</span>
}

// ============================================================
// Template Card Component
// ============================================================

function TemplateCard({
  template,
  index,
  userRating,
  onRate,
  onUse,
  onPreview,
  onCustomize,
}: {
  template: TemplateData
  index: number
  userRating: number
  onRate: (id: string, rating: number) => void
  onUse: (template: TemplateData) => void
  onPreview: (template: TemplateData) => void
  onCustomize: (template: TemplateData) => void
}) {
  const Icon = ICON_MAP[template.icon] || FileText
  const catColor = CATEGORY_COLORS[template.category] || '#10b981'

  return (
    <motion.div
      className="template-card template-card-animate"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Header: Icon + Title */}
      <div className="flex items-start gap-4 mb-4">
        <div
          className="template-icon-box"
          style={{ background: template.iconGradient || `linear-gradient(135deg, ${catColor}, ${catColor}88)` }}
        >
          <Icon className="size-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold vl-text-heading leading-tight">{template.title}</h3>
          <p className="text-sm vl-text-muted mt-1 line-clamp-2">{template.description}</p>
        </div>
      </div>

      {/* Badges Row */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <DifficultyBadge difficulty={template.difficulty} />
        <CategoryTag category={template.category} />
        {template.isCustom && (
          <Badge className="text-[10px] px-1.5 py-0 h-5 bg-emerald-500/10 text-emerald-500 border-emerald-500/20 border">
            Custom
          </Badge>
        )}
      </div>

      {/* Meta Info */}
      <div className="flex items-center gap-4 mb-3 text-sm vl-text-muted">
        <div className="flex items-center gap-1.5">
          <Clock className="size-3.5" />
          <span>{template.expectedDuration}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <UsersRound className="size-3.5" />
          <span>{template.participantsRequired} participants</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Zap className="size-3.5" />
          <span>{template.useCount} uses</span>
        </div>
      </div>

      {/* Star Rating */}
      <div className="flex items-center gap-2 mb-4">
        <StarRating rating={userRating} onRate={(r) => onRate(template.id, r)} />
        {userRating > 0 && <span className="text-xs vl-text-muted">{userRating}/5</span>}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-3 border-t border-[var(--vl-border-subtle)]">
        <Button className="template-btn-use text-xs" onClick={() => onUse(template)}>
          <Zap className="size-3.5" /> Use Template
        </Button>
        <Button variant="ghost" className="template-btn-preview text-xs" onClick={() => onPreview(template)}>
          <Eye className="size-3.5" /> Preview
        </Button>
        <Button variant="ghost" className="template-btn-customize text-xs" onClick={() => onCustomize(template)}>
          <Edit3 className="size-3.5" />
        </Button>
      </div>
    </motion.div>
  )
}

// ============================================================
// Template Detail Modal Component
// ============================================================

function TemplateDetailModal({
  template,
  open,
  onClose,
  onUse,
}: {
  template: TemplateData | null
  open: boolean
  onClose: () => void
  onUse: (template: TemplateData) => void
}) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  if (!template) return null

  const Icon = ICON_MAP[template.icon] || FileText
  const catColor = CATEGORY_COLORS[template.category] || '#10b981'

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="template-detail-modal max-w-2xl max-h-[85vh] overflow-hidden p-0">
        <ScrollArea className="max-h-[85vh] p-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <div
              className="template-icon-box"
              style={{ background: template.iconGradient || `linear-gradient(135deg, ${catColor}, ${catColor}88)` }}
            >
              <Icon className="size-7 text-white" />
            </div>
            <div className="flex-1">
              <DialogHeader>
                <DialogTitle className="text-xl vl-text-heading">{template.title}</DialogTitle>
                <DialogDescription className="vl-text-muted">{template.description}</DialogDescription>
              </DialogHeader>
            </div>
          </div>

          {/* Meta Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <DifficultyBadge difficulty={template.difficulty} />
            <CategoryTag category={template.category} />
            <span className="duration-badge">
              <Clock className="size-3" /> {template.expectedDuration}
            </span>
            <span className="use-count-badge">
              <UsersRound className="size-3" /> {template.participantsRequired} participants
            </span>
            <span className="use-count-badge">
              <Zap className="size-3" /> {template.useCount} uses
            </span>
          </div>

          {/* Description */}
          <div className="template-detail-section">
            <h4 className="template-detail-section-title">Overview</h4>
            <p className="text-sm vl-text-body leading-relaxed">{template.longDescription}</p>
          </div>

          {/* Participant Roles */}
          {template.participantRoles?.length > 0 && (
            <div className="template-detail-section">
              <h4 className="template-detail-section-title">Participant Roles</h4>
              <div className="space-y-3">
                {template.participantRoles.map(role => (
                  <div key={role.id} className="flex items-start gap-3 p-3 rounded-lg bg-[var(--vl-bg-inner)]">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5"
                      style={{ background: role.color }}
                    >
                      {role.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold vl-text-heading">{role.name}</p>
                      <p className="text-xs vl-text-muted mt-0.5">{role.responsibility}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Agenda Outline */}
          {template.agendaSections?.length > 0 && (
            <div className="template-detail-section">
              <h4 className="template-detail-section-title">Agenda Outline</h4>
              <div className="space-y-2">
                {template.agendaSections.map((section, idx) => (
                  <div
                    key={section.id}
                    className={`template-agenda-item ${expandedSections.has(section.id) ? 'expanded' : ''}`}
                    onClick={() => toggleSection(section.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-xs font-bold shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium vl-text-heading">{section.title}</p>
                      </div>
                      <span className="text-xs vl-text-muted shrink-0">{section.duration}</span>
                      {expandedSections.has(section.id) ? (
                        <ChevronUp className="size-4 vl-text-muted shrink-0" />
                      ) : (
                        <ChevronDown className="size-4 vl-text-muted shrink-0" />
                      )}
                    </div>
                    <div className="template-agenda-item-body">
                      <p className="text-sm vl-text-muted mt-2 pl-9">{section.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expected Outcomes */}
          {template.expectedOutcomes?.length > 0 && (
            <div className="template-detail-section">
              <h4 className="template-detail-section-title flex items-center gap-2">
                <Target className="size-4" /> Expected Outcomes
              </h4>
              <ul className="space-y-2">
                {template.expectedOutcomes.map((outcome, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm vl-text-body">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{outcome}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tips */}
          {template.tips?.length > 0 && (
            <div className="template-detail-section">
              <h4 className="template-detail-section-title">Tips for Best Results</h4>
              <div className="floating-tips">
                <ul className="space-y-2">
                  {template.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm vl-text-body">
                      <TipIcon className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Footer with CTA */}
        <div className="p-6 border-t border-[var(--vl-border-subtle)] flex items-center justify-between">
          <Button variant="outline" onClick={onClose} className="vl-text-body">
            Close
          </Button>
          <button className="template-cta-button" onClick={() => { onUse(template); onClose() }}>
            <Zap className="size-5" /> Use This Template
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Template Editor Modal Component
// ============================================================

function TemplateEditorModal({
  template,
  open,
  onClose,
  onSave,
}: {
  template: TemplateData | null
  open: boolean
  onClose: () => void
  onSave: (template: TemplateData) => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [longDescription, setLongDescription] = useState('')
  const [category, setCategory] = useState<TemplateData['category']>('Research')
  const [difficulty, setDifficulty] = useState<TemplateData['difficulty']>('beginner')
  const [expectedDuration, setExpectedDuration] = useState('30-45 min')
  const [participantRoles, setParticipantRoles] = useState<ParticipantRole[]>([])
  const [agendaSections, setAgendaSections] = useState<AgendaSection[]>([])

  useEffect(() => {
    if (template && open) {
      requestAnimationFrame(() => {
        setTitle(template.title)
        setDescription(template.description)
        setLongDescription(template.longDescription)
        setCategory(template.category)
        setDifficulty(template.difficulty)
        setExpectedDuration(template.expectedDuration)
        setParticipantRoles([...template.participantRoles])
        setAgendaSections([...template.agendaSections])
      })
    }
  }, [template, open])

  const addAgendaSection = () => {
    setAgendaSections(prev => [
      ...prev,
      {
        id: `sec-${Date.now()}`,
        title: '',
        description: '',
        duration: '10 min',
      },
    ])
  }

  const removeAgendaSection = (id: string) => {
    setAgendaSections(prev => prev.filter(s => s.id !== id))
  }

  const updateAgendaSection = (id: string, updates: Partial<AgendaSection>) => {
    setAgendaSections(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
  }

  const moveAgendaSection = (index: number, dir: 'up' | 'down') => {
    setAgendaSections(prev => {
      const next = [...prev]
      const target = dir === 'up' ? index - 1 : index + 1
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const addRole = () => {
    const colors = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899']
    setParticipantRoles(prev => [
      ...prev,
      {
        id: `role-${Date.now()}`,
        name: '',
        responsibility: '',
        prompt: '',
        color: colors[prev.length % colors.length],
      },
    ])
  }

  const removeRole = (id: string) => {
    setParticipantRoles(prev => prev.filter(r => r.id !== id))
  }

  const updateRole = (id: string, updates: Partial<ParticipantRole>) => {
    setParticipantRoles(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r))
  }

  const handleSave = () => {
    if (!title.trim()) {
      toast.error('Please enter a template title')
      return
    }
    const saved: TemplateData = {
      id: template?.id || `custom-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      longDescription: longDescription.trim() || description.trim(),
      icon: template?.icon || 'FileText',
      iconGradient: template?.iconGradient || 'linear-gradient(135deg, #10b981, #059669)',
      category,
      difficulty,
      expectedDuration,
      participantsRequired: participantRoles.length || 2,
      participantRoles: participantRoles.filter(r => r.name.trim()),
      agendaSections: agendaSections.filter(s => s.title.trim()),
      expectedOutcomes: template?.expectedOutcomes || [],
      tips: template?.tips || [],
      presetQuestions: template?.presetQuestions || [],
      presetRules: template?.presetRules || [],
      presetRounds: template?.presetRounds || 2,
      presetTemperature: template?.presetTemperature || 0.5,
      suggestedAgents: template?.suggestedAgents || [],
      useCount: template?.useCount || 0,
      isCustom: true,
      createdAt: template?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    onSave(saved)
    onClose()
    toast.success('Template saved successfully!')
  }

  if (!template && !open) return null

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="template-detail-modal max-w-2xl max-h-[85vh] overflow-hidden p-0">
        <ScrollArea className="max-h-[85vh] p-6">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-xl vl-text-heading">
              {template?.isCustom ? 'Edit Template' : 'Customize Template'}
            </DialogTitle>
            <DialogDescription className="vl-text-muted">
              {template?.isCustom ? 'Update your custom template' : 'Create your own version of this template'}
            </DialogDescription>
          </DialogHeader>

          {/* Title */}
          <div className="template-editor-section">
            <Label className="template-editor-label">Title *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} className="template-editor-input" placeholder="Enter template title..." />
          </div>

          {/* Description */}
          <div className="template-editor-section">
            <Label className="template-editor-label">Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} className="template-editor-input template-editor-textarea" placeholder="Brief description..." />
          </div>

          {/* Long Description */}
          <div className="template-editor-section">
            <Label className="template-editor-label">Detailed Description</Label>
            <Textarea value={longDescription} onChange={e => setLongDescription(e.target.value)} className="template-editor-input template-editor-textarea" placeholder="Full description of what this template is for..." />
          </div>

          {/* Category & Difficulty */}
          <div className="template-editor-section grid grid-cols-2 gap-4">
            <div>
              <Label className="template-editor-label">Category</Label>
              <div className="flex flex-col gap-1.5">
                {(['Research', 'Planning', 'Review', 'Brainstorm', 'Analysis'] as const).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`text-left text-sm px-3 py-2 rounded-lg transition-all ${
                      category === cat
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 font-medium'
                        : 'vl-text-muted border border-[var(--vl-border-subtle)] hover:bg-[var(--vl-bg-inner)]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="template-editor-label">Difficulty</Label>
              <div className="flex flex-col gap-1.5">
                {(['beginner', 'intermediate', 'advanced'] as const).map(diff => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setDifficulty(diff)}
                    className={`text-left text-sm px-3 py-2 rounded-lg transition-all capitalize ${
                      difficulty === diff
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 font-medium'
                        : 'vl-text-muted border border-[var(--vl-border-subtle)] hover:bg-[var(--vl-bg-inner)]'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Duration */}
          <div className="template-editor-section">
            <Label className="template-editor-label">Expected Duration</Label>
            <Input value={expectedDuration} onChange={e => setExpectedDuration(e.target.value)} className="template-editor-input" placeholder="e.g. 30-45 min" />
          </div>

          {/* Agenda Sections */}
          <div className="template-editor-section">
            <div className="flex items-center justify-between mb-3">
              <Label className="template-editor-label mb-0">Agenda Sections</Label>
              <Button size="sm" variant="outline" className="text-xs" onClick={addAgendaSection}>
                <Plus className="size-3 mr-1" /> Add Section
              </Button>
            </div>
            <div className="space-y-2">
              {agendaSections.map((section, idx) => (
                <div key={section.id} className="template-editor-agenda-section flex-col !items-start !gap-2">
                  <div className="flex items-center gap-2 w-full">
                    <GripVertical className="size-4 vl-text-muted shrink-0 cursor-grab" />
                    <Input value={section.title} onChange={e => updateAgendaSection(section.id, { title: e.target.value })} className="template-editor-input flex-1 h-9" placeholder="Section title..." />
                    <Input value={section.duration} onChange={e => updateAgendaSection(section.id, { duration: e.target.value })} className="template-editor-input w-20 h-9" placeholder="10 min" />
                    <button type="button" onClick={() => moveAgendaSection(idx, 'up')} disabled={idx === 0} className="p-1 rounded hover:bg-[var(--vl-bg-inner)] vl-text-muted disabled:opacity-30"><ChevronUp className="size-3.5" /></button>
                    <button type="button" onClick={() => moveAgendaSection(idx, 'down')} disabled={idx === agendaSections.length - 1} className="p-1 rounded hover:bg-[var(--vl-bg-inner)] vl-text-muted disabled:opacity-30"><ChevronDown className="size-3.5" /></button>
                    <button type="button" onClick={() => removeAgendaSection(section.id)} className="p-1 rounded hover:bg-red-500/10 text-red-400 vl-text-muted"><Trash2 className="size-3.5" /></button>
                  </div>
                  <Input value={section.description} onChange={e => updateAgendaSection(section.id, { description: e.target.value })} className="template-editor-input h-8 text-xs ml-6" placeholder="Section description..." />
                </div>
              ))}
              {agendaSections.length === 0 && (
                <p className="text-sm vl-text-muted text-center py-4">No agenda sections yet. Click "Add Section" to create one.</p>
              )}
            </div>
          </div>

          {/* Participant Roles */}
          <div className="template-editor-section">
            <div className="flex items-center justify-between mb-3">
              <Label className="template-editor-label mb-0">Participant Roles</Label>
              <Button size="sm" variant="outline" className="text-xs" onClick={addRole}>
                <Plus className="size-3 mr-1" /> Add Role
              </Button>
            </div>
            <div className="space-y-2">
              {participantRoles.map(role => (
                <div key={role.id} className="template-editor-role-row flex-col !items-start !gap-2">
                  <div className="flex items-center gap-2 w-full">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: role.color }}>
                      {role.name ? role.name.charAt(0) : '?'}
                    </div>
                    <Input value={role.name} onChange={e => updateRole(role.id, { name: e.target.value })} className="template-editor-input flex-1 h-9" placeholder="Role name..." />
                    <button type="button" onClick={() => removeRole(role.id)} className="p-1 rounded hover:bg-red-500/10 text-red-400 vl-text-muted"><Trash2 className="size-3.5" /></button>
                  </div>
                  <Input value={role.responsibility} onChange={e => updateRole(role.id, { responsibility: e.target.value })} className="template-editor-input h-8 text-xs ml-10" placeholder="Responsibility..." />
                  <Input value={role.prompt} onChange={e => updateRole(role.id, { prompt: e.target.value })} className="template-editor-input h-8 text-xs ml-10" placeholder="Custom prompt..." />
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-6 border-t border-[var(--vl-border-subtle)] flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSave}>
            <Save className="size-4 mr-2" /> Save Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Main MeetingTemplateLibrary Component
// ============================================================

export function MeetingTemplateLibrary({ lang = 'en' }: { lang?: Lang }) {
  const [templates, setTemplates] = useState<TemplateData[]>([])
  const [customTemplates, setCustomTemplates] = useState<TemplateData[]>([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all')
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [previewTemplate, setPreviewTemplate] = useState<TemplateData | null>(null)
  const [editTemplate, setEditTemplate] = useState<TemplateData | null>(null)
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)

  // Load templates
  useEffect(() => {
    requestAnimationFrame(async () => {
      setMounted(true)
      try {
        const res = await fetch('/api/templates')
        if (res.ok) {
          const data = await res.json()
          setTemplates(data.data || [])
        }
      } catch {
        // Fallback: empty
      }
      // Load custom templates from localStorage
      try {
        const raw = localStorage.getItem('vl-custom-templates')
        if (raw) {
          const saved = JSON.parse(raw) as TemplateData[]
          setCustomTemplates(saved)
        }
      } catch { /* ignore */ }
      // Load ratings
      try {
        const raw = localStorage.getItem('vl-template-ratings')
        if (raw) setRatings(JSON.parse(raw))
      } catch { /* ignore */ }
      setLoading(false)
    })
  }, [])

  const allTemplates = useMemo(() => {
    return [...templates, ...customTemplates]
  }, [templates, customTemplates])

  const filteredTemplates = useMemo(() => {
    let result = allTemplates
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
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      )
    }
    return result
  }, [allTemplates, categoryFilter, difficultyFilter, search])

  const handleRate = useCallback((id: string, rating: number) => {
    setRatings(prev => {
      const next = { ...prev, [id]: rating }
      try { localStorage.setItem('vl-template-ratings', JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }, [])

  const handleUseTemplate = useCallback((template: TemplateData) => {
    toast.success(`Using "${template.title}" template!`, {
      description: `${template.presetRounds} rounds · Temperature ${template.presetTemperature}`,
    })
  }, [])

  const handleSaveCustom = useCallback((template: TemplateData) => {
    setCustomTemplates(prev => {
      const existing = prev.findIndex(t => t.id === template.id)
      let next: TemplateData[]
      if (existing >= 0) {
        next = [...prev]
        next[existing] = template
      } else {
        next = [...prev, template]
      }
      try { localStorage.setItem('vl-custom-templates', JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }, [])

  const categories = ['all', 'Research', 'Planning', 'Review', 'Brainstorm', 'Analysis']
  const difficulties = ['all', 'beginner', 'intermediate', 'advanced']

  if (!mounted) return null

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" aria-label="Meeting Template Library">
      {/* Section Header */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="text-2xl font-bold vl-text-heading flex items-center gap-3">
          <Sparkles className="size-6 text-emerald-500" />
          Meeting Template Library
        </h2>
        <p className="text-sm vl-text-muted mt-1">
          {allTemplates.length} templates available · {customTemplates.length} custom templates
        </p>
      </motion.div>

      {/* Search & Filters */}
      <motion.div
        className="mb-6 space-y-4"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="template-search-bar">
          <Search className="size-4 template-search-icon" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search templates by name, description, or category..."
            aria-label="Search templates"
          />
        </div>

        <div className="flex flex-wrap gap-6">
          {/* Category Filter */}
          <div>
            <p className="text-xs font-semibold vl-text-muted uppercase tracking-wider mb-2">Category</p>
            <div className="filter-pills">
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`filter-pill capitalize ${categoryFilter === cat ? 'active' : ''}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty Filter */}
          <div>
            <p className="text-xs font-semibold vl-text-muted uppercase tracking-wider mb-2">Difficulty</p>
            <div className="filter-pills">
              {difficulties.map(diff => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setDifficultyFilter(diff)}
                  className={`filter-pill capitalize ${difficultyFilter === diff ? 'active' : ''}`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Template Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin size-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full" />
        </div>
      ) : filteredTemplates.length > 0 ? (
        <div className="template-grid">
          {filteredTemplates.map((template, index) => (
            <TemplateCard
              key={template.id}
              template={template}
              index={index}
              userRating={ratings[template.id] || 0}
              onRate={handleRate}
              onUse={handleUseTemplate}
              onPreview={setPreviewTemplate}
              onCustomize={setEditTemplate}
            />
          ))}
        </div>
      ) : (
        <div className="template-empty-state">
          <Search className="size-12 vl-text-muted mb-4 opacity-30" />
          <h3 className="text-lg font-semibold vl-text-heading mb-2">No templates found</h3>
          <p className="text-sm vl-text-muted">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Detail Modal */}
      {previewTemplate && (
        <TemplateDetailModal
          template={previewTemplate}
          open={!!previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onUse={handleUseTemplate}
        />
      )}

      {/* Editor Modal */}
      {editTemplate && (
        <TemplateEditorModal
          template={editTemplate}
          open={!!editTemplate}
          onClose={() => setEditTemplate(null)}
          onSave={handleSaveCustom}
        />
      )}
    </section>
  )
}
