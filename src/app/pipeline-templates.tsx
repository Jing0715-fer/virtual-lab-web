'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, FlaskConical, BrainCircuit, Dna, Atom, FileText, Stethoscope,
  BookOpen, ArrowRight, Clock, Layers, ChevronRight, Zap, Star, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

// ============================================================
// Types
// ============================================================

interface PipelineTemplate {
  id: string
  name: string
  description: string
  icon: React.ElementType
  category: string
  accentColor: string
  stages: {
    name: string
    color: string
  }[]
  estimatedDuration: string
  stageCount: number
}

interface PipelineTemplatesProps {
  onSelectTemplate: (template: PipelineTemplate) => void
}

// ============================================================
// Template Definitions
// ============================================================

const TEMPLATES: PipelineTemplate[] = [
  {
    id: 'drug-discovery',
    name: 'Drug Discovery Pipeline',
    description: 'End-to-end drug discovery workflow from literature review through preclinical testing',
    icon: FlaskConical,
    category: 'pharma',
    accentColor: '#8b5cf6',
    estimatedDuration: '6-12 months',
    stageCount: 5,
    stages: [
      { name: 'Literature Review', color: '#8b5cf6' },
      { name: 'Target Identification', color: '#06b6d4' },
      { name: 'Compound Screening', color: '#10b981' },
      { name: 'Lead Optimization', color: '#f59e0b' },
      { name: 'Preclinical Testing', color: '#ef4444' },
    ],
  },
  {
    id: 'ml-research',
    name: 'Machine Learning Research',
    description: 'Complete ML research workflow from data collection to model deployment',
    icon: BrainCircuit,
    category: 'ml',
    accentColor: '#06b6d4',
    estimatedDuration: '2-6 months',
    stageCount: 5,
    stages: [
      { name: 'Data Collection', color: '#06b6d4' },
      { name: 'Preprocessing', color: '#3b82f6' },
      { name: 'Model Training', color: '#f59e0b' },
      { name: 'Evaluation', color: '#10b981' },
      { name: 'Deployment', color: '#ef4444' },
    ],
  },
  {
    id: 'genomics',
    name: 'Genomics Workflow',
    description: 'Genomic analysis pipeline from sample preparation to computational analysis',
    icon: Dna,
    category: 'genomics',
    accentColor: '#10b981',
    estimatedDuration: '3-8 weeks',
    stageCount: 5,
    stages: [
      { name: 'Sample Prep', color: '#10b981' },
      { name: 'Sequencing', color: '#06b6d4' },
      { name: 'Assembly', color: '#3b82f6' },
      { name: 'Annotation', color: '#8b5cf6' },
      { name: 'Analysis', color: '#f59e0b' },
    ],
  },
  {
    id: 'protein-engineering',
    name: 'Protein Engineering',
    description: 'Design-to-optimization pipeline for novel protein and nanobody development',
    icon: Atom,
    category: 'bioengineering',
    accentColor: '#f59e0b',
    estimatedDuration: '3-6 months',
    stageCount: 5,
    stages: [
      { name: 'Design', color: '#f59e0b' },
      { name: 'Modeling', color: '#06b6d4' },
      { name: 'Simulation', color: '#8b5cf6' },
      { name: 'Testing', color: '#ef4444' },
      { name: 'Optimization', color: '#10b981' },
    ],
  },
  {
    id: 'clinical-trial',
    name: 'Clinical Trial',
    description: 'Full clinical trial management from protocol design to data analysis',
    icon: Stethoscope,
    category: 'clinical',
    accentColor: '#ef4444',
    estimatedDuration: '12-36 months',
    stageCount: 5,
    stages: [
      { name: 'Protocol Design', color: '#ef4444' },
      { name: 'Patient Recruitment', color: '#f59e0b' },
      { name: 'Treatment', color: '#06b6d4' },
      { name: 'Data Collection', color: '#10b981' },
      { name: 'Analysis', color: '#8b5cf6' },
    ],
  },
  {
    id: 'publication',
    name: 'Publication Workflow',
    description: 'Academic research paper workflow from initial research to submission',
    icon: FileText,
    category: 'research',
    accentColor: '#ec4899',
    estimatedDuration: '2-8 weeks',
    stageCount: 5,
    stages: [
      { name: 'Research', color: '#ec4899' },
      { name: 'Draft', color: '#8b5cf6' },
      { name: 'Review', color: '#f59e0b' },
      { name: 'Revision', color: '#06b6d4' },
      { name: 'Submit', color: '#10b981' },
    ],
  },
]

const CATEGORY_FILTERS = [
  { key: 'all', label: 'All Templates', icon: Layers },
  { key: 'pharma', label: 'Pharma', icon: FlaskConical },
  { key: 'ml', label: 'ML / AI', icon: BrainCircuit },
  { key: 'genomics', label: 'Genomics', icon: Dna },
  { key: 'bioengineering', label: 'Bio Eng.', icon: Atom },
  { key: 'clinical', label: 'Clinical', icon: Stethoscope },
  { key: 'research', label: 'Research', icon: BookOpen },
]

// ============================================================
// Template Preview Dots (Mini pipeline)
// ============================================================

function MiniPipelinePreview({ stages }: { stages: { name: string; color: string }[] }) {
  return (
    <div className="flex items-center gap-1.5">
      {stages.map((stage, idx) => (
        <React.Fragment key={idx}>
          <div className="flex flex-col items-center gap-0.5">
            <motion.div
              className="w-4 h-4 rounded-full border-2"
              style={{
                backgroundColor: `${stage.color}30`,
                borderColor: stage.color,
                boxShadow: `0 0 6px ${stage.color}30`,
              }}
              whileHover={{ scale: 1.2 }}
            />
            <span className="text-[7px] vl-text-muted max-w-[32px] truncate text-center hidden sm:block">
              {stage.name.length > 6 ? stage.name.slice(0, 6) + '…' : stage.name}
            </span>
          </div>
          {idx < stages.length - 1 && (
            <div className="w-3 h-0.5 rounded-full bg-[var(--vl-border)] shrink-0" />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

// ============================================================
// Template Card
// ============================================================

function TemplateCard({
  template,
  index,
  onSelect,
}: {
  template: PipelineTemplate
  index: number
  onSelect: (template: PipelineTemplate) => void
}) {
  const IconComp = template.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.4,
        delay: index * 0.08,
        ease: [0.23, 1, 0.32, 1],
      }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="vl-card border rounded-xl overflow-hidden backdrop-blur-sm transition-shadow duration-300 hover:shadow-lg group cursor-pointer relative"
      style={{
        borderColor: 'var(--vl-border-subtle)',
      }}
      onClick={() => onSelect(template)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(template) }}
      aria-label={`Use template: ${template.name}`}
    >
      {/* Gradient accent on top */}
      <div
        className="h-1 w-full"
        style={{
          background: `linear-gradient(90deg, ${template.accentColor}, ${template.accentColor}60)`,
        }}
      />

      {/* Hover glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(ellipse at top, ${template.accentColor}08, transparent 70%)`,
        }}
      />

      <div className="p-4 relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{
                backgroundColor: `${template.accentColor}15`,
                boxShadow: `0 0 12px ${template.accentColor}15`,
              }}
            >
              <IconComp className="size-4.5" style={{ color: template.accentColor }} />
            </div>
            <div>
              <h3 className="text-sm font-semibold vl-text-heading group-hover:text-emerald-400 transition-colors">
                {template.name}
              </h3>
              <Badge
                className="text-[9px] h-4 px-1.5 mt-0.5"
                variant="outline"
                style={{
                  borderColor: `${template.accentColor}30`,
                  color: template.accentColor,
                  backgroundColor: `${template.accentColor}10`,
                }}
              >
                {template.category}
              </Badge>
            </div>
          </div>
          <ChevronRight className="size-4 vl-text-muted group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
        </div>

        {/* Description */}
        <p className="text-[11px] vl-text-muted leading-relaxed mb-3 line-clamp-2">
          {template.description}
        </p>

        {/* Mini Pipeline Preview */}
        <div className="p-2.5 rounded-lg mb-3" style={{ background: 'var(--vl-bg-inner)' }}>
          <MiniPipelinePreview stages={template.stages} />
        </div>

        {/* Footer stats */}
        <div className="flex items-center justify-between text-[10px] vl-text-muted">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Layers className="size-3" style={{ color: template.accentColor }} />
              <span>{template.stageCount} stages</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="size-3" style={{ color: template.accentColor }} />
              <span>{template.estimatedDuration}</span>
            </div>
          </div>

          <div className="flex items-center gap-0.5 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[10px] font-medium">Use Template</span>
            <ArrowRight className="size-3" />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================
// Pipeline Templates Main Component
// ============================================================

export default function PipelineTemplates({ onSelectTemplate }: PipelineTemplatesProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')

  const filteredTemplates = useMemo(() => {
    return TEMPLATES.filter(t => {
      const matchesCategory = activeCategory === 'all' || t.category === activeCategory
      const matchesSearch = searchQuery === '' ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [searchQuery, activeCategory])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold vl-text-heading flex items-center gap-2">
          <Zap className="size-4 text-emerald-400" />
          Pipeline Templates
        </h2>
        <p className="text-[11px] vl-text-muted mt-1">
          Start with a pre-built workflow template for common research scenarios
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 vl-text-muted" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search templates..."
          className="pl-9 vl-card border border-[var(--vl-border-subtle)] bg-transparent vl-text-heading placeholder:text-[var(--vl-text-muted)] h-9 text-sm rounded-lg focus:border-emerald-500/50"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-[var(--vl-bg-inner)] transition-colors"
          >
            <X className="size-3 vl-text-muted" />
          </button>
        )}
      </div>

      {/* Category Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin custom-scrollbar">
        {CATEGORY_FILTERS.map((cat) => {
          const isActive = activeCategory === cat.key
          return (
            <motion.button
              key={cat.key}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveCategory(cat.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border whitespace-nowrap transition-all ${
                isActive
                  ? 'vl-text-heading'
                  : 'vl-text-muted border-transparent hover:border-[var(--vl-border)]'
              }`}
              style={isActive ? {
                backgroundColor: `${cat.key === 'all' ? 'rgba(16, 185, 129, 0.12)' : 'var(--vl-bg-inner)'}`,
                borderColor: `${cat.key === 'all' ? 'rgba(16, 185, 129, 0.3)' : 'var(--vl-border)'}`,
                color: cat.key === 'all' ? '#10b981' : undefined,
              } : undefined}
            >
              <cat.icon className="size-3" style={isActive && cat.key !== 'all' ? { color: '#10b981' } : undefined} />
              {cat.label}
            </motion.button>
          )
        })}
      </div>

      {/* Templates Grid */}
      <AnimatePresence mode="wait">
        {filteredTemplates.length > 0 ? (
          <motion.div
            key={`${activeCategory}-${searchQuery}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredTemplates.map((template, idx) => (
              <TemplateCard
                key={template.id}
                template={template}
                index={idx}
                onSelect={onSelectTemplate}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12 vl-card border rounded-xl"
          >
            <Search className="size-8 vl-text-muted mb-3 opacity-30" />
            <p className="text-sm vl-text-muted">No templates match your search</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-xs text-emerald-400 hover:text-emerald-300"
              onClick={() => { setSearchQuery(''); setActiveCategory('all') }}
            >
              Clear filters
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Template count */}
      <p className="text-[10px] vl-text-muted text-center">
        Showing {filteredTemplates.length} of {TEMPLATES.length} templates
      </p>
    </div>
  )
}
