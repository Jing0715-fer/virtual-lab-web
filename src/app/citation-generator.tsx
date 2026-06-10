'use client'

import React, { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Copy, Check, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

// ============================================================
// Paper Type
// ============================================================

export interface Paper {
  id: string
  title: string
  authors: string[]
  year: number | null
  journal: string
  doi: string
  abstract: string
  url: string
  tags: string[]
  rating: number
  addedAt: string
}

// ============================================================
// Citation Format Generators
// ============================================================

export function generateAPA(paper: Paper): string {
  const authors = paper.authors.length > 0
    ? paper.authors.length <= 7
      ? paper.authors.map((a, i) => {
          const parts = a.trim().split(' ')
          if (parts.length === 1) return parts[0]
          const last = parts.pop()
          const initials = parts.map(p => `${p.charAt(0).toUpperCase()}.`).join(' ')
          return `${last}, ${initials}`
        }).join(', ')
      : paper.authors.slice(0, 6).map((a) => {
          const parts = a.trim().split(' ')
          if (parts.length === 1) return parts[0]
          const last = parts.pop()
          const initials = parts.map(p => `${p.charAt(0).toUpperCase()}.`).join(' ')
          return `${last}, ${initials}`
        }).join(', ') + ', ... ' + paper.authors[paper.authors.length - 1].trim().split(' ').pop()
    : 'Unknown Author'

  const year = paper.year || 'n.d.'
  const title = paper.title
  const journalPart = paper.journal ? `, <i>${paper.journal}</i>` : ''
  const doiPart = paper.doi ? ` https://doi.org/${paper.doi}` : ''

  return `${authors} (${year}). ${title}.${journalPart}.${doiPart}`
}

export function generateMLA(paper: Paper): string {
  const authors = paper.authors.length > 0
    ? paper.authors.length <= 3
      ? paper.authors.map(a => {
          const parts = a.trim().split(' ')
          if (parts.length === 1) return parts[0]
          const last = parts.pop()
          return `${last}, ${parts.join(' ')}`
        }).join(', et al. ')
      : `${paper.authors[0].trim().split(' ').pop()}, ${paper.authors[0].trim().split(' ').slice(0, -1).join(' ')}, et al.`
    : 'Unknown Author'

  const title = paper.title
  const journalPart = paper.journal ? ` <i>${paper.journal}</i>` : ''
  const yearPart = paper.year ? `, ${paper.year}` : ''
  const doiPart = paper.doi ? `, https://doi.org/${paper.doi}` : ''

  return `${authors}. "${title}."${journalPart}.${yearPart}.${doiPart}`
}

export function generateChicago(paper: Paper): string {
  const authors = paper.authors.length > 0
    ? paper.authors.length === 1
      ? (() => {
          const parts = paper.authors[0].trim().split(' ')
          if (parts.length === 1) return parts[0]
          const last = parts.pop()
          return `${last}, ${parts.join(' ')}`
        })()
      : (() => {
          const parts = paper.authors[0].trim().split(' ')
          if (parts.length === 1) return parts[0]
          const last = parts.pop()
          return `${last}, ${parts.join(' ')}, et al.`
        })()
    : 'Unknown Author'

  const title = paper.title
  const journalPart = paper.journal ? ` <i>${paper.journal}</i>` : ''
  const yearPart = paper.year ? ` (${paper.year})` : ''
  const doiPart = paper.doi ? `, https://doi.org/${paper.doi}` : ''

  return `${authors}. ${yearPart}. "${title}."${journalPart}.${doiPart}`
}

export function generateIEEE(paper: Paper): string {
  const authors = paper.authors.length > 0
    ? paper.authors.map(a => {
        const parts = a.trim().split(' ')
        return parts[parts.length - 1] || parts[0]
      }).join(', ')
    : 'Unknown Author'

  const year = paper.year || 'n.d.'
  const title = `"${paper.title}"`
  const journalPart = paper.journal ? `, <i>${paper.journal}</i>` : ''
  const doiPart = paper.doi ? `, doi: ${paper.doi}` : ''

  return `${authors}, ${title}${journalPart}, ${year}.${doiPart}`
}

export function generateBibTeX(paper: Paper): string {
  const key = paper.authors.length > 0
    ? (paper.authors[0].trim().split(' ').pop() || 'unknown').toLowerCase() + (paper.year || '')
    : 'unknown'

  const fields: string[] = [`  title = {${paper.title}}`]
  if (paper.authors.length > 0) {
    fields.push(`  author = {${paper.authors.join(' and ')}}`)
  }
  if (paper.year) {
    fields.push(`  year = {${paper.year}}`)
  }
  if (paper.journal) {
    fields.push(`  journal = {${paper.journal}}`)
  }
  if (paper.doi) {
    fields.push(`  doi = {${paper.doi}}`)
  }

  return `@article{${key},\n${fields.join(',\n')}\n}`
}

// ============================================================
// Citation Panel Component
// ============================================================

export type CitationFormat = 'apa' | 'mla' | 'chicago' | 'ieee' | 'bibtex'

const FORMAT_OPTIONS: { value: CitationFormat; label: string }[] = [
  { value: 'apa', label: 'APA (7th ed.)' },
  { value: 'mla', label: 'MLA (9th ed.)' },
  { value: 'chicago', label: 'Chicago' },
  { value: 'ieee', label: 'IEEE' },
  { value: 'bibtex', label: 'BibTeX' },
]

const GENERATORS: Record<CitationFormat, (p: Paper) => string> = {
  apa: generateAPA,
  mla: generateMLA,
  chicago: generateChicago,
  ieee: generateIEEE,
  bibtex: generateBibTeX,
}

interface CitationPanelProps {
  paper: Paper
  lang: Lang
}

export function CitationPanel({ paper, lang }: CitationPanelProps) {
  const [format, setFormat] = useState<CitationFormat>('apa')
  const [copied, setCopied] = useState(false)

  const citation = useMemo(() => {
    return GENERATORS[format](paper)
  }, [format, paper])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(citation)
      setCopied(true)
      toast.success(t(lang, 'papers.toast.copied'))
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Select value={format} onValueChange={(v) => setFormat(v as CitationFormat)}>
          <SelectTrigger className="w-48 vl-inner">
            <SelectValue placeholder={t(lang, 'papers.citation.selectFormat')} />
          </SelectTrigger>
          <SelectContent className="vl-inner">
            {FORMAT_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-1.5"
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied ? t(lang, 'common.copied') : t(lang, 'papers.citation.copy')}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t(lang, 'papers.citation.copy')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <Card className="vl-card border overflow-hidden">
        <CardContent className="p-4">
          <div
            className="citation-fade text-sm leading-relaxed vl-text-muted"
            dangerouslySetInnerHTML={{ __html: citation }}
          />
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// Combined Bibliography Component
// ============================================================

interface CombinedBibliographyProps {
  papers: Paper[]
  lang: Lang
}

export function CombinedBibliography({ papers, lang }: CombinedBibliographyProps) {
  const [format, setFormat] = useState<CitationFormat>('apa')
  const [copied, setCopied] = useState(false)

  const bibliography = useMemo(() => {
    if (papers.length === 0) return ''
    return papers
      .sort((a, b) => {
        const aLast = a.authors[0]?.trim().split(' ').pop() || ''
        const bLast = b.authors[0]?.trim().split(' ').pop() || ''
        return aLast.localeCompare(bLast)
      })
      .map(p => GENERATORS[format](p))
      .join('\n\n')
  }, [format, papers])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(bibliography)
      setCopied(true)
      toast.success(t(lang, 'papers.toast.copied'))
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }

  if (papers.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium vl-text-heading">
          {t(lang, 'papers.citation.bibliography')} ({t(lang, 'papers.citation.papers').replace('{count}', String(papers.length))})
        </h4>
        <div className="flex items-center gap-2">
          <Select value={format} onValueChange={(v) => setFormat(v as CitationFormat)}>
            <SelectTrigger className="w-40 vl-inner h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="vl-inner">
              {FORMAT_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8 gap-1 text-xs">
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
            {copied ? t(lang, 'common.copied') : t(lang, 'common.copy')}
          </Button>
        </div>
      </div>
      <Card className="vl-card border max-h-64 overflow-y-auto">
        <CardContent className="p-4">
          <div className="space-y-3 text-sm leading-relaxed vl-text-muted">
            {papers.sort((a, b) => {
              const aLast = a.authors[0]?.trim().split(' ').pop() || ''
              const bLast = b.authors[0]?.trim().split(' ').pop() || ''
              return aLast.localeCompare(bLast)
            }).map((p, i) => (
              <div key={p.id} className="pl-6 -indent-6 citation-fade" style={{ animationDelay: `${i * 0.05}s` }}>
                <span dangerouslySetInnerHTML={{ __html: GENERATORS[format](p) }} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
