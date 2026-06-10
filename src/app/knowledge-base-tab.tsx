import { v4 as uuidv4 } from 'uuid';
'use client'

import React, { useState, useEffect, useCallback, useMemo, useId, useRef } from 'react'
import { toast } from 'sonner'
import {
  BookOpen, Plus, Search, LayoutGrid, List, Tag, Calendar,
  FileText, MessageSquare, Link2, Eye, Pencil, Trash2, Download,
  ChevronLeft, X, Check, Clock, BookmarkPlus,
  AlertTriangle, Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

// ============================================================
// Types
// ============================================================

interface KnowledgePage {
  id: string
  title: string
  content: string // Markdown
  category: 'general' | 'methods' | 'results' | 'hypotheses' | 'literature' | 'protocols'
  tags: string[]
  linkedMeetings: string[] // meeting IDs
  createdAt: string
  updatedAt: string
  wordCount: number
}

interface KnowledgeBaseData {
  pages: KnowledgePage[]
  lastUpdated: string
}

type ViewMode = 'grid' | 'list'
type CategoryFilter = 'all' | KnowledgePage['category']
type PanelState = 'list' | 'detail' | 'editor'
type SaveStatus = 'saved' | 'saving' | 'unsaved'

const STORAGE_KEY = 'virtual-lab-knowledge-base'
const CATEGORIES: KnowledgePage['category'][] = ['general', 'methods', 'results', 'hypotheses', 'literature', 'protocols']

// ============================================================
// Seed Data
// ============================================================

function createSeedPages(): KnowledgePage[] {
  const now = new Date().toISOString()
  return [
    {
      id: uuidv4(),
      title: 'Nanobody Design Principles',
      content: `# Nanobody Design Principles

## Overview

Nanobodies (single-domain antibodies) are small (~15 kDa) antigen-binding fragments derived from camelid heavy-chain-only antibodies. Their small size, high solubility, and robust stability make them ideal therapeutic and diagnostic candidates.

## Key Design Considerations

### 1. Complementarity-Determining Regions (CDRs)
- **CDR3** is the most diverse and critical for antigen binding
- Loop length variation contributes to paratope diversity
- Target CDR3 length between 12-18 residues for optimal binding

### 2. Framework Stability
- Maintain conserved disulfide bonds (Cys23-Cys94)
- The non-canonical Cys in CDR1 may form additional disulfides
- Surface charge distribution affects solubility

### 3. Affinity Maturation Strategies
- **In silico**: Use ESM-2 for sequence space exploration
- **Rosetta**: Energy-based scoring of docked complexes
- **AlphaFold-Multimer**: Predict nanobody-antigen complex structures

## Current Pipeline

Our computational pipeline generates nanobody candidates targeting the SARS-CoV-2 spike protein RBD:

\`\`\`
ESM → AlphaFold-Multimer → Rosetta → Rank & Select
\`\`\`

## References
- Swanson et al., Nature (2025)
- Muyldermans, Annu Rev Biochem (2013)`,
      category: 'methods',
      tags: ['nanobody', 'antibody', 'design', 'protein-engineering', 'CDR'],
      linkedMeetings: [],
      createdAt: now,
      updatedAt: now,
      wordCount: 156,
    },
    {
      id: uuidv4(),
      title: 'AlphaFold Prediction Pipeline',
      content: `# AlphaFold Prediction Pipeline

## Purpose
Standardized protocol for predicting nanobody-antigen complex structures using AlphaFold-Multimer.

## Step-by-Step Protocol

### Step 1: Sequence Preparation
- Obtain nanobody VHH sequence (FASTA format)
- Retrieve target antigen sequence
- Ensure sequences are trimmed to mature domains only

### Step 2: MSA Generation
- Use MMseqs2 for multiple sequence alignment
- Minimum 30 homologous sequences for reliable prediction
- For nanobodies, include camelid VHH sequences specifically

### Step 3: Run AlphaFold-Multimer
\`\`\`bash
# Basic command
alphafold --model_preset=multimer \\
  --fasta_paths=nanobody.fasta,antigen.fasta \\
  --output_dir=predictions/
\`\`\`

### Step 4: Result Analysis
- **pLDDT**: Per-residue confidence (>90 = high confidence)
- **pTM**: Interface confidence score
- **PAE**: Predicted aligned error matrix

### Step 5: Quality Metrics
| Metric | Good | Acceptable | Poor |
|--------|------|-----------|------|
| pLDDT  | >90  | 70-90      | <70  |
| pTM    | >0.7 | 0.5-0.7    | <0.5 |

## Common Issues
- Nanobody CDR3 loops may be poorly predicted due to low sequence homology
- Consider using RoseTTAFold as complementary approach
- Re-run with different random seeds for consensus`,
      category: 'protocols',
      tags: ['alphafold', 'structure-prediction', 'multimer', 'pipeline', 'bioinformatics'],
      linkedMeetings: [],
      createdAt: now,
      updatedAt: now,
      wordCount: 203,
    },
    {
      id: uuidv4(),
      title: 'Research Hypothesis: ESM-Guided Antibody Optimization',
      content: `# Research Hypothesis: ESM-Guided Antibody Optimization

## Hypothesis

*Large-scale protein language models (ESM-2) can generate novel nanobody sequences with improved binding affinity to SARS-CoV-2 spike protein RBD, as validated by AlphaFold-Multimer structure prediction and Rosetta energy scoring.*

## Rationale

### Background
ESM-2 (6B parameters) has been trained on 250M protein sequences and captures evolutionary constraints. When fine-tuned or prompted with nanobody scaffolds, it can explore sequence space beyond natural diversity.

### Key Assumptions
1. ESM-2 latent space encodes structural and functional information relevant to antibody-antigen binding
2. Generated sequences fold into stable nanobody structures
3. AlphaFold-Multimer can accurately predict binding modes for novel sequences
4. Rosetta energy scores correlate with experimental binding affinity

## Proposed Experiment

### Phase 1: Generation
- Generate 10,000 candidate sequences using ESM-2 with constrained mutations in CDR3
- Filter by predicted stability (pLDDT > 85)
- Cluster sequences to ensure diversity

### Phase 2: Computational Validation
- Predict nanobody-RBD complexes with AlphaFold-Multimer
- Score interfaces using Rosetta InterfaceAnalyzer
- Rank by combined pTM and Rosetta ΔΔG

### Phase 3: Selection
- Select top 50 candidates
- Assess developability (solubility, immunogenicity)
- Recommend 10 candidates for experimental validation

## Success Criteria
- Top 10 candidates achieve predicted ΔΔG < -10 REU
- pTM > 0.7 for all selected complexes
- Structural analysis confirms proper CDR orientation

## Timeline
- Week 1-2: Sequence generation and filtering
- Week 3: Structure prediction
- Week 4: Energy scoring and selection`,
      category: 'hypotheses',
      tags: ['hypothesis', 'ESM', 'antibody-optimization', 'language-model', 'protein-design'],
      linkedMeetings: [],
      createdAt: now,
      updatedAt: now,
      wordCount: 278,
    },
  ]
}

// ============================================================
// Helper Functions
// ============================================================

function countWords(text: string): number {
  return text.trim().split(/[ \t\n]+/).filter(Boolean).length
}

function getExcerpt(content: string, maxChars: number = 150): string {
  // Strip markdown syntax for excerpt
  const plain = content
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*|__/g, '')
    .replace(/\*|_/g, '')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n{2,}/g, ' ')
    .replace(/\n/g, ' ')
    .trim()
  return plain.length > maxChars ? plain.slice(0, maxChars) + '...' : plain
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function highlightSearchText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const parts: React.ReactNode[] = []
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    parts.push(
      <mark key={key++} className="kb-search-highlight">
        {match[0]}
      </mark>
    )
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }
  return parts.length > 0 ? parts : text
}

// Simple markdown-to-HTML converter (basic)
function renderMarkdown(md: string): string {
  let html = md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*<\/li>)/g, '<ul>$1</ul>')
    .replace(/^\| (.+)$/gm, (match, p1: string) => {
      const cells = p1.split('|').map(c => c.trim())
      return `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`
    })
    .replace(/(<tr>[\s\S]*<\/tr>)/g, '<table>$1</table>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br/>')
  return `<p>${html}</p>`
}

// ============================================================
// Sub-Components
// ============================================================

function CategoryBadge({ category, lang }: { category: KnowledgePage['category']; lang: Lang }) {
  const categoryClass = `kb-category-${category}`
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryClass}`}>
      {t(lang, `kb.category.${category}`)}
    </span>
  )
}

function TagsDisplay({
  tags,
  maxShow = 3,
  lang,
  onTagClick,
}: {
  tags: string[]
  maxShow?: number
  lang: Lang
  onTagClick?: (tag: string) => void
}) {
  const visible = tags.slice(0, maxShow)
  const remaining = tags.length - maxShow
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {visible.map((tag) => (
        <button
          key={tag}
          type="button"
          className="kb-tag"
          onClick={() => onTagClick?.(tag)}
        >
          <Tag className="size-3 mr-1" />
          {tag}
        </button>
      ))}
      {remaining > 0 && (
        <span className="text-xs vl-text-muted">
          {t(lang, 'kb.card.moreTags').replace('{count}', String(remaining))}
        </span>
      )}
    </div>
  )
}

function EmptyState({ lang, onCreate }: { lang: Lang; onCreate: () => void }) {
  return (
    <div className="kb-empty-state">
      <div className="empty-float-enhanced mb-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center">
          <BookOpen className="size-10 text-emerald-500" />
        </div>
      </div>
      <h3 className="text-xl font-semibold vl-text-heading mb-2">
        {t(lang, 'kb.empty.title')}
      </h3>
      <p className="text-sm vl-text-muted max-w-md mb-6">
        {t(lang, 'kb.empty.description')}
      </p>
      <Button onClick={onCreate} className="btn-magnetic">
        <Plus className="size-4 mr-2" />
        {t(lang, 'kb.empty.createFirst')}
      </Button>
    </div>
  )
}

// Grid card for a knowledge page
function KnowledgePageGridCard({
  page,
  lang,
  searchQuery,
  onClick,
  index,
}: {
  page: KnowledgePage
  lang: Lang
  searchQuery: string
  onClick: () => void
  index: number
}) {
  const excerpt = getExcerpt(page.content, 150)
  const titleHtml = highlightSearchText(page.title, searchQuery)
  return (
    <div
      className="kb-card p-4 cursor-pointer group"
      onClick={onClick}
      style={{ animation: `kb-card-appear 0.5s cubic-bezier(0.23, 1, 0.32, 1) ${index * 0.06}s forwards`, opacity: 0 }}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-lg font-semibold vl-text-heading leading-snug group-hover:text-emerald-600 transition-colors line-clamp-2">
          {titleHtml}
        </h3>
        <div className="ml-2 flex-shrink-0">
          <CategoryBadge category={page.category} lang={lang} />
        </div>
      </div>
      <p className="text-sm vl-text-muted mb-3 line-clamp-3 leading-relaxed">
        {excerpt}
      </p>
      <TagsDisplay tags={page.tags} maxShow={3} lang={lang} />
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[var(--vl-border-subtle)]">
        <span className="flex items-center gap-1 text-xs vl-text-muted">
          <Calendar className="size-3" />
          {formatDate(page.updatedAt)}
        </span>
        <span className="flex items-center gap-1 text-xs vl-text-muted">
          <FileText className="size-3" />
          {t(lang, 'kb.card.words').replace('{count}', String(page.wordCount))}
        </span>
        {page.linkedMeetings.length > 0 && (
          <span className="flex items-center gap-1 text-xs vl-text-muted">
            <MessageSquare className="size-3" />
            {t(lang, 'kb.card.linkedMeetings').replace('{count}', String(page.linkedMeetings.length))}
          </span>
        )}
      </div>
    </div>
  )
}

// List row for a knowledge page
function KnowledgePageListRow({
  page,
  lang,
  searchQuery,
  onClick,
  index,
}: {
  page: KnowledgePage
  lang: Lang
  searchQuery: string
  onClick: () => void
  index: number
}) {
  const excerpt = getExcerpt(page.content, 120)
  const titleHtml = highlightSearchText(page.title, searchQuery)
  return (
    <div
      className="kb-card p-4 cursor-pointer group flex items-center gap-4"
      onClick={onClick}
      style={{ animation: `kb-card-appear 0.4s cubic-bezier(0.23, 1, 0.32, 1) ${index * 0.04}s forwards`, opacity: 0 }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-base font-semibold vl-text-heading truncate group-hover:text-emerald-600 transition-colors">
            {titleHtml}
          </h3>
          <CategoryBadge category={page.category} lang={lang} />
        </div>
        <p className="text-sm vl-text-muted truncate">{excerpt}</p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <TagsDisplay tags={page.tags} maxShow={2} lang={lang} />
        <span className="text-xs vl-text-muted whitespace-nowrap">
          {formatDate(page.updatedAt)}
        </span>
      </div>
    </div>
  )
}

// ============================================================
// Page Editor Panel
// ============================================================

function PageEditorPanel({
  page,
  lang,
  meetings,
  onSave,
  onCancel,
}: {
  page: KnowledgePage | null
  lang: Lang
  meetings: { id: string; saveName: string; type: string }[]
  onSave: (data: Omit<KnowledgePage, 'id' | 'createdAt' | 'updatedAt' | 'wordCount'>) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(page?.title ?? '')
  const [category, setCategory] = useState<KnowledgePage['category']>(page?.category ?? 'general')
  const [tagsInput, setTagsInput] = useState(page?.tags.join(', ') ?? '')
  const [content, setContent] = useState(page?.content ?? '')
  const [linkedMeetings, setLinkedMeetings] = useState<string[]>(page?.linkedMeetings ?? [])
  const [showPreview, setShowPreview] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('unsaved')
  const titleId = useId()
  const categoryId = useId()
  const tagsId = useId()
  const contentId = useId()
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const wordCount = countWords(content)
  const tags = tagsInput
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)

  const handleSave = useCallback(() => {
    if (!title.trim()) {
      toast.error(t(lang, 'kb.editor.title'))
      return
    }
    setSaveStatus('saving')
    // Simulate brief save delay
    setTimeout(() => {
      onSave({
        title: title.trim(),
        content,
        category,
        tags,
        linkedMeetings,
      })
      setSaveStatus('saved')
    }, 300)
  }, [title, content, category, tags, linkedMeetings, onSave, lang])

  // Track unsaved changes
  useEffect(() => {
    if (page) {
      const hasChanges =
        title !== page.title ||
        content !== page.content ||
        category !== page.category ||
        tags.join(',') !== page.tags.join(',') ||
        JSON.stringify(linkedMeetings) !== JSON.stringify(page.linkedMeetings)
      requestAnimationFrame(() => { setSaveStatus(hasChanges ? 'unsaved' : 'saved') })
    }
  }, [title, content, category, tags, linkedMeetings, page])

  const toggleMeetingLink = (meetingId: string) => {
    setLinkedMeetings(prev =>
      prev.includes(meetingId)
        ? prev.filter(id => id !== meetingId)
        : [...prev, meetingId]
    )
    setSaveStatus('unsaved')
  }

  // Preview content rendered
  const previewHtml = useMemo(() => renderMarkdown(content), [content])

  return (
    <div
      className="p-6 space-y-5"
      style={{ animation: 'kb-editor-slide-in 0.4s cubic-bezier(0.23, 1, 0.32, 1) forwards' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onCancel} className="p-1.5 rounded-lg hover:bg-[var(--vl-bg-inner)] transition-colors">
            <ChevronLeft className="size-5 vl-text-muted" />
          </button>
          <h2 className="text-xl font-semibold vl-text-heading">
            {page ? t(lang, 'kb.detail.edit') : t(lang, 'kb.newPage')}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <SaveStatusIndicator status={saveStatus} lang={lang} />
          <Button variant="outline" onClick={onCancel}>
            {t(lang, 'common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!title.trim()}>
            <Check className="size-4 mr-1.5" />
            {t(lang, 'common.save')}
          </Button>
        </div>
      </div>

      {/* Title */}
      <div>
        <Label htmlFor={titleId} className="mb-1.5 block text-sm font-medium vl-text-label">
          {t(lang, 'kb.editor.title')}
        </Label>
        <input
          id={titleId}
          type="text"
          className="kb-editor-area text-2xl font-bold !min-h-auto !p-3"
          placeholder={t(lang, 'kb.editor.titlePlaceholder')}
          value={title}
          onChange={e => { setTitle(e.target.value); setSaveStatus('unsaved') }}
          autoFocus
        />
      </div>

      {/* Category & Tags row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={categoryId} className="mb-1.5 block text-sm font-medium vl-text-label">
            {t(lang, 'kb.editor.category')}
          </Label>
          <Select value={category} onValueChange={v => { setCategory(v as KnowledgePage['category']); setSaveStatus('unsaved') }}>
            <SelectTrigger id={categoryId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat}>
                  {t(lang, `kb.category.${cat}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor={tagsId} className="mb-1.5 block text-sm font-medium vl-text-label">
            {t(lang, 'kb.editor.tags')}
          </Label>
          <input
            id={tagsId}
            type="text"
            className="vl-input w-full h-10 rounded-lg px-3 text-sm"
            placeholder={t(lang, 'kb.editor.tagsPlaceholder')}
            value={tagsInput}
            onChange={e => { setTagsInput(e.target.value); setSaveStatus('unsaved') }}
          />
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {tags.map((tag, i) => (
                <span
                  key={tag}
                  className="kb-tag"
                  style={{ animation: `kb-tag-pop 0.3s ease ${i * 0.05}s forwards`, opacity: 0 }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content editor with preview toggle */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label htmlFor={contentId} className="text-sm font-medium vl-text-label">
            {t(lang, 'kb.editor.content')}
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-xs vl-text-muted">
              {t(lang, 'kb.editor.wordCount').replace('{count}', String(wordCount))}
            </span>
            <div className="flex border border-[var(--vl-border)] rounded-lg overflow-hidden">
              <button
                type="button"
                className={`px-3 py-1 text-xs font-medium transition-colors ${!showPreview ? 'bg-[var(--vl-accent)] text-white' : 'hover:bg-[var(--vl-bg-inner)]'}`}
                onClick={() => setShowPreview(false)}
              >
                {t(lang, 'kb.editor.write')}
              </button>
              <button
                type="button"
                className={`px-3 py-1 text-xs font-medium transition-colors ${showPreview ? 'bg-[var(--vl-accent)] text-white' : 'hover:bg-[var(--vl-bg-inner)]'}`}
                onClick={() => setShowPreview(true)}
              >
                {t(lang, 'kb.editor.preview')}
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {!showPreview && (
            <textarea
              id={contentId}
              className="kb-editor-area lg:col-span-2"
              placeholder={t(lang, 'kb.editor.contentPlaceholder')}
              value={content}
              onChange={e => { setContent(e.target.value); setSaveStatus('unsaved') }}
            />
          )}
          {showPreview && (
            <>
              <textarea
                className="kb-editor-area"
                placeholder={t(lang, 'kb.editor.contentPlaceholder')}
                value={content}
                onChange={e => { setContent(e.target.value); setSaveStatus('unsaved') }}
              />
              <div className="kb-preview vl-prose custom-scrollbar" dangerouslySetInnerHTML={{ __html: previewHtml || '<p class="vl-text-muted italic">No content to preview</p>' }} />
            </>
          )}
        </div>
      </div>

      {/* Link to Meeting */}
      <div>
        <Label className="mb-1.5 block text-sm font-medium vl-text-label">
          {t(lang, 'kb.editor.linkMeeting')}
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Link2 className="size-4 mr-1.5" />
              {t(lang, 'kb.editor.linkMeeting')}
              {linkedMeetings.length > 0 && (
                <Badge variant="secondary" className="ml-2">{linkedMeetings.length}</Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            <div className="p-2">
              <p className="text-xs font-medium vl-text-label px-2 pb-2">
                {t(lang, 'kb.editor.selectMeeting')}
              </p>
              <ScrollArea className="max-h-48">
                {meetings.length === 0 ? (
                  <p className="text-xs vl-text-muted px-2 py-3">{t(lang, 'kb.editor.noMeetings')}</p>
                ) : (
                  meetings.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      className="w-full text-left px-2 py-1.5 rounded-md text-sm hover:bg-[var(--vl-bg-inner)] transition-colors flex items-center gap-2"
                      onClick={() => toggleMeetingLink(m.id)}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${linkedMeetings.includes(m.id) ? 'bg-emerald-500 border-emerald-500' : 'border-[var(--vl-border)]'}`}>
                        {linkedMeetings.includes(m.id) && <Check className="size-3 text-white" />}
                      </div>
                      <span className="truncate">{m.saveName}</span>
                      <span className="text-xs vl-text-muted ml-auto">{m.type}</span>
                    </button>
                  ))
                )}
              </ScrollArea>
            </div>
          </PopoverContent>
        </Popover>
        {linkedMeetings.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {linkedMeetings.map(mid => {
              const m = meetings.find(x => x.id === mid)
              return m ? (
                <Badge key={mid} variant="secondary" className="cursor-pointer" onClick={() => toggleMeetingLink(mid)}>
                  {m.saveName}
                  <X className="size-3 ml-1" />
                </Badge>
              ) : null
            })}
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--vl-border-subtle)]">
        <Button variant="outline" onClick={onCancel}>
          {t(lang, 'common.cancel')}
        </Button>
        <Button onClick={handleSave} disabled={!title.trim()}>
          <Check className="size-4 mr-1.5" />
          {t(lang, 'common.save')}
        </Button>
      </div>
    </div>
  )
}

function SaveStatusIndicator({ status, lang }: { status: SaveStatus; lang: Lang }) {
  const config = {
    saved: { color: 'text-emerald-500', icon: Check, label: t(lang, 'kb.editor.saved'), pulse: false },
    saving: { color: 'text-amber-500', icon: Clock, label: t(lang, 'kb.editor.saving'), pulse: true },
    unsaved: { color: 'text-orange-400', icon: AlertTriangle, label: t(lang, 'kb.editor.unsaved'), pulse: false },
  }[status]
  const Icon = config.icon
  return (
    <span className={`flex items-center gap-1.5 text-xs font-medium ${config.color}`}>
      <Icon className="size-3.5" style={config.pulse ? { animation: 'kb-save-pulse 1s ease-in-out infinite' } : undefined} />
      {config.label}
    </span>
  )
}

// ============================================================
// Page Detail View
// ============================================================

function PageDetailView({
  page,
  lang,
  meetings,
  onEdit,
  onDelete,
  onBack,
}: {
  page: KnowledgePage
  lang: Lang
  meetings: { id: string; saveName: string; type: string }[]
  onEdit: () => void
  onDelete: () => void
  onBack: () => void
}) {
  const contentHtml = useMemo(() => renderMarkdown(page.content), [page.content])

  const handleExport = useCallback(() => {
    try {
      const md = `# ${page.title}\n\n${page.content}\n\n---\nCategory: ${page.category}\nTags: ${page.tags.join(', ')}\nCreated: ${page.createdAt}\nUpdated: ${page.updatedAt}`
      const blob = new Blob([md], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${page.title.toLowerCase().replace(/\s+/g, '-')}.md`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(t(lang, 'kb.toast.exportSuccess'))
    } catch {
      toast.error(t(lang, 'kb.toast.exportFailed'))
    }
  }, [page, lang])

  return (
    <div className="flex flex-col lg:flex-row gap-6" style={{ animation: 'kb-detail-fade-in 0.4s ease forwards' }}>
      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-4">
          <button type="button" onClick={onBack} className="p-1.5 rounded-lg hover:bg-[var(--vl-bg-inner)] transition-colors">
            <ChevronLeft className="size-5 vl-text-muted" />
          </button>
          <h1 className="text-2xl font-bold vl-text-heading">{page.title}</h1>
          <CategoryBadge category={page.category} lang={lang} />
        </div>
        <div
          className="kb-preview vl-prose custom-scrollbar"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      </div>

      {/* Sidebar */}
      <div className="lg:w-72 flex-shrink-0 space-y-5">
        {/* Metadata */}
        <Card className="vl-card p-4 space-y-3">
          <h3 className="text-sm font-semibold vl-text-heading">{t(lang, 'kb.detail.category')}</h3>
          <CategoryBadge category={page.category} lang={lang} />

          <Separator className="!my-2" />

          <h3 className="text-sm font-semibold vl-text-heading">{t(lang, 'kb.detail.tags')}</h3>
          <TagsDisplay tags={page.tags} maxShow={10} lang={lang} />

          <Separator className="!my-2" />

          <div className="space-y-1.5">
            <p className="text-xs vl-text-muted">
              {t(lang, 'kb.detail.createdAt')}: {formatDate(page.createdAt)}
            </p>
            <p className="text-xs vl-text-muted">
              {t(lang, 'kb.detail.updatedAt')}: {formatDate(page.updatedAt)}
            </p>
            <p className="text-xs vl-text-muted">
              {t(lang, 'kb.card.words').replace('{count}', String(page.wordCount))}
            </p>
          </div>
        </Card>

        {/* Linked meetings */}
        <Card className="vl-card p-4 space-y-2">
          <h3 className="text-sm font-semibold vl-text-heading">
            {t(lang, 'kb.detail.linkedMeetings')}
          </h3>
          {page.linkedMeetings.length === 0 ? (
            <p className="text-xs vl-text-muted">{t(lang, 'kb.detail.noLinkedMeetings')}</p>
          ) : (
            <ScrollArea className="max-h-32">
              <div className="space-y-1">
                {page.linkedMeetings.map(mid => {
                  const m = meetings.find(x => x.id === mid)
                  return m ? (
                    <div key={mid} className="flex items-center gap-2 text-xs py-1">
                      <MessageSquare className="size-3 text-emerald-500" />
                      <span className="vl-text-body">{m.saveName}</span>
                    </div>
                  ) : null
                })}
              </div>
            </ScrollArea>
          )}
        </Card>

        {/* Actions */}
        <div className="space-y-2">
          <Button variant="outline" className="w-full justify-start" onClick={onEdit}>
            <Pencil className="size-4 mr-2" />
            {t(lang, 'kb.detail.edit')}
          </Button>
          <Button variant="outline" className="w-full justify-start" onClick={handleExport}>
            <Download className="size-4 mr-2" />
            {t(lang, 'kb.detail.exportMarkdown')}
          </Button>
          <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="size-4 mr-2" />
            {t(lang, 'kb.detail.delete')}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Main Component
// ============================================================

export default function KnowledgeBaseTab({ lang = 'en' }: { lang?: Lang }) {
  // State
  const [pages, setPages] = useState<KnowledgePage[]>([])
  const [mounted, setMounted] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [panelState, setPanelState] = useState<PanelState>('list')
  const [selectedPage, setSelectedPage] = useState<KnowledgePage | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [meetings, setMeetings] = useState<{ id: string; saveName: string; type: string }[]>([])

  // Hydration-safe localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const data: KnowledgeBaseData = JSON.parse(raw)
        if (data.pages && data.pages.length > 0) {
          requestAnimationFrame(() => {
            setPages(data.pages)
            setMounted(true)
          })
          return
        }
      }
    } catch { /* ignore parse errors */ }
    // First load: seed example pages
    const seedPages = createSeedPages()
    requestAnimationFrame(() => {
      setPages(seedPages)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ pages: seedPages, lastUpdated: new Date().toISOString() }))
      } catch { /* ignore */ }
      setMounted(true)
    })
  }, [])

  // Load meetings for linking
  useEffect(() => {
    const loadMeetings = async () => {
      try {
        const res = await fetch('/api/meetings')
        if (res.ok) {
          const data = await res.json()
          setMeetings((data || []).map((m: { id: string; saveName: string; type: string }) => ({
            id: m.id,
            saveName: m.saveName || `Meeting ${m.id.slice(0, 6)}`,
            type: m.type,
          })))
        }
      } catch { /* ignore */ }
    }
    loadMeetings()
  }, [])

  // Save to localStorage
  const persistPages = useCallback((updatedPages: KnowledgePage[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ pages: updatedPages, lastUpdated: new Date().toISOString() }))
    } catch { /* ignore */ }
  }, [])

  // Filtering
  const filteredPages = useMemo(() => {
    let result = pages
    // Full-text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        p => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q) || p.tags.some(tag => tag.toLowerCase().includes(q))
      )
    }
    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter(p => p.category === categoryFilter)
    }
    // Tag filter
    if (tagFilter) {
      result = result.filter(p => p.tags.includes(tagFilter))
    }
    // Sort by updatedAt desc
    return result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }, [pages, searchQuery, categoryFilter, tagFilter])

  const hasActiveFilters = searchQuery.trim() !== '' || categoryFilter !== 'all' || tagFilter !== null

  // Collect all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    pages.forEach(p => p.tags.forEach(tag => tagSet.add(tag)))
    return Array.from(tagSet).sort()
  }, [pages])

  // Handlers
  const handleNewPage = useCallback(() => {
    setSelectedPage(null)
    setPanelState('editor')
  }, [])

  const handlePageClick = useCallback((page: KnowledgePage) => {
    setSelectedPage(page)
    setPanelState('detail')
  }, [])

  const handleEditPage = useCallback(() => {
    setPanelState('editor')
  }, [])

  const handleSavePage = useCallback(
    (data: Omit<KnowledgePage, 'id' | 'createdAt' | 'updatedAt' | 'wordCount'>) => {
      const now = new Date().toISOString()
      if (selectedPage) {
        // Update existing
        const updated: KnowledgePage = {
          ...selectedPage,
          ...data,
          wordCount: countWords(data.content),
          updatedAt: now,
        }
        setPages(prev => {
          const next = prev.map(p => (p.id === updated.id ? updated : p))
          persistPages(next)
          return next
        })
        setSelectedPage(updated)
        toast.success(t(lang, 'kb.toast.pageUpdated'))
        setPanelState('detail')
      } else {
        // Create new
        const newPage: KnowledgePage = {
          id: uuidv4(),
          ...data,
          wordCount: countWords(data.content),
          createdAt: now,
          updatedAt: now,
        }
        setPages(prev => {
          const next = [newPage, ...prev]
          persistPages(next)
          return next
        })
        setSelectedPage(newPage)
        toast.success(t(lang, 'kb.toast.pageCreated'))
        setPanelState('detail')
      }
    },
    [selectedPage, persistPages, lang]
  )

  const handleDeletePage = useCallback(() => {
    if (!selectedPage) return
    setPages(prev => {
      const next = prev.filter(p => p.id !== selectedPage.id)
      persistPages(next)
      return next
    })
    toast.success(t(lang, 'kb.toast.delete.success'))
    setDeleteDialogOpen(false)
    setSelectedPage(null)
    setPanelState('list')
  }, [selectedPage, persistPages, lang])

  const handleCancelEditor = useCallback(() => {
    if (selectedPage && panelState === 'editor') {
      setPanelState('detail')
    } else {
      setSelectedPage(null)
      setPanelState('list')
    }
  }, [selectedPage, panelState])

  const handleBackToList = useCallback(() => {
    setSelectedPage(null)
    setPanelState('list')
  }, [])

  const handleTagClick = useCallback((tag: string) => {
    setTagFilter(prev => (prev === tag ? null : tag))
  }, [])

  const clearFilters = useCallback(() => {
    setSearchQuery('')
    setCategoryFilter('all')
    setTagFilter(null)
  }, [])

  // Loading state
  if (!mounted) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="skeleton-shimmer h-8 w-48 rounded-lg" />
          <div className="skeleton-shimmer h-10 w-32 rounded-lg ml-auto" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer h-56 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  // Panel: Editor
  if (panelState === 'editor') {
    return (
      <div className="p-4 max-w-5xl mx-auto">
        <PageEditorPanel
          page={selectedPage}
          lang={lang as Lang}
          meetings={meetings}
          onSave={handleSavePage}
          onCancel={handleCancelEditor}
        />
      </div>
    )
  }

  // Panel: Detail
  if (panelState === 'detail' && selectedPage) {
    return (
      <div className="p-4 max-w-5xl mx-auto">
        <PageDetailView
          page={selectedPage}
          lang={lang as Lang}
          meetings={meetings}
          onEdit={handleEditPage}
          onDelete={() => setDeleteDialogOpen(true)}
          onBack={handleBackToList}
        />
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t(lang, 'kb.delete.confirmTitle')}</DialogTitle>
              <DialogDescription>
                {t(lang, 'kb.delete.confirmMessage').replace('{title}', selectedPage.title)}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                {t(lang, 'kb.delete.cancel')}
              </Button>
              <Button variant="destructive" onClick={handleDeletePage}>
                {t(lang, 'kb.delete.confirm')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // Panel: List view (default)
  return (
    <TooltipProvider>
      <div className="p-4 md:p-6 space-y-5 max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center">
              <BookOpen className="size-5 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold vl-text-heading">{t(lang, 'kb.title')}</h1>
              <p className="text-xs vl-text-muted">{t(lang, 'kb.subtitle')}</p>
            </div>
          </div>
          <div className="sm:ml-auto flex items-center gap-2 flex-wrap">
            <Button size="sm" className="btn-magnetic" onClick={handleNewPage}>
              <Plus className="size-4 mr-1.5" />
              {t(lang, 'kb.newPage')}
            </Button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 vl-text-muted" />
            <input
              type="text"
              className="vl-input w-full h-10 pl-9 pr-3 rounded-lg text-sm"
              placeholder={t(lang, 'kb.searchPlaceholder')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Category filter */}
          <Select value={categoryFilter} onValueChange={v => setCategoryFilter(v as CategoryFilter)}>
            <SelectTrigger className="w-full sm:w-40 h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t(lang, 'kb.categoryFilter')}</SelectItem>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat}>
                  {t(lang, `kb.category.${cat}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View toggle */}
          <div className="flex border border-[var(--vl-border)] rounded-lg overflow-hidden">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-[var(--vl-accent)] text-white' : 'hover:bg-[var(--vl-bg-inner)]'}`}
                  onClick={() => setViewMode('grid')}
                  aria-label={t(lang, 'kb.gridView')}
                >
                  <LayoutGrid className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{t(lang, 'kb.gridView')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-[var(--vl-accent)] text-white' : 'hover:bg-[var(--vl-bg-inner)]'}`}
                  onClick={() => setViewMode('list')}
                  aria-label={t(lang, 'kb.listView')}
                >
                  <List className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{t(lang, 'kb.listView')}</TooltipContent>
            </Tooltip>
          </div>

          {/* Clear filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="whitespace-nowrap">
              <X className="size-3.5 mr-1" />
              {t(lang, 'kb.clearFilters')}
            </Button>
          )}
        </div>

        {/* Tag filter indicator */}
        {tagFilter && (
          <div className="flex items-center gap-2">
            <span className="text-xs vl-text-muted">Filtering by tag:</span>
            <button
              type="button"
              className="kb-tag flex items-center gap-1"
              onClick={() => setTagFilter(null)}
            >
              <Tag className="size-3" />
              {tagFilter}
              <X className="size-3" />
            </button>
          </div>
        )}

        {/* Showing count */}
        <div className="text-xs vl-text-muted">
          {t(lang, 'kb.showingCount')
            .replace('{filtered}', String(filteredPages.length))
            .replace('{total}', String(pages.length))}
        </div>

        {/* Content */}
        {filteredPages.length === 0 ? (
          <EmptyState lang={lang as Lang} onCreate={handleNewPage} />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 card-entrance-cascade">
            {filteredPages.map((page, idx) => (
              <KnowledgePageGridCard
                key={page.id}
                page={page}
                lang={lang as Lang}
                searchQuery={searchQuery}
                onClick={() => handlePageClick(page)}
                index={idx}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3 card-entrance-cascade">
            {filteredPages.map((page, idx) => (
              <KnowledgePageListRow
                key={page.id}
                page={page}
                lang={lang as Lang}
                searchQuery={searchQuery}
                onClick={() => handlePageClick(page)}
                index={idx}
              />
            ))}
          </div>
        )}

        {/* Quick tag cloud */}
        {allTags.length > 0 && !tagFilter && (
          <div className="pt-4 border-t border-[var(--vl-border-subtle)]">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="size-4 vl-text-muted" />
              <span className="text-xs font-medium vl-text-muted">Popular tags</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {allTags.slice(0, 12).map((tag, i) => (
                <button
                  key={tag}
                  type="button"
                  className="kb-tag"
                  onClick={() => handleTagClick(tag)}
                  style={{ animation: `kb-tag-pop 0.3s ease ${i * 0.05}s forwards`, opacity: 0 }}
                >
                  {tag}
                </button>
              ))}
              {allTags.length > 12 && (
                <span className="text-xs vl-text-muted self-center">
                  +{allTags.length - 12} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Delete Dialog (list-level, not detail-level) */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t(lang, 'kb.delete.confirmTitle')}</DialogTitle>
              <DialogDescription>
                {selectedPage
                  ? t(lang, 'kb.delete.confirmMessage').replace('{title}', selectedPage.title)
                  : ''}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                {t(lang, 'kb.delete.cancel')}
              </Button>
              <Button variant="destructive" onClick={handleDeletePage}>
                {t(lang, 'kb.delete.confirm')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
