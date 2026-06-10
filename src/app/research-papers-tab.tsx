import { v4 as uuidv4 } from 'uuid';
'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { toast } from 'sonner'
import {
  Plus, Search, Star, Download, Upload, FileJson, FileText, BookOpen,
  X, ExternalLink, FolderOpen, ChevronRight, ChevronDown, ChevronUp,
  Grid3x3, List, Trash2,
  Pencil, Quote, BarChart3 as BarChartIcon, Tag, GraduationCap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import {
  CitationPanel, CombinedBibliography,
  generateBibTeX,
  type Paper, type CitationFormat,
} from './citation-generator'
import { ChartGallery } from './chart-gallery'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

// ============================================================
// Types & Constants
// ============================================================

interface Collection {
  id: string
  name: string
  paperIds: string[]
}

const STORAGE_KEY = 'vl-research-papers'
const COLLECTIONS_KEY = 'vl-research-collections'

type SortOption = 'newest' | 'oldest' | 'rating' | 'year' | 'title'

// ============================================================
// BibTeX Parser (basic)
// ============================================================

function parseBibTeX(text: string): Partial<Paper>[] {
  const entries: Partial<Paper>[] = []
  const regex = new RegExp('@\\w+\\{([^,]+),([^@]*?)(?=\\n@|\\n\\s*$)', 'gs')
  let match

  while ((match = regex.exec(text)) !== null) {
    const entry: Partial<Paper> = { id: uuidv4(), authors: [], tags: [], rating: 0 }
    const content = match[2]

    const titleMatch = content.match(/title\s*=\s*\{([^}]+)\}/i)
    if (titleMatch) entry.title = titleMatch[1].trim()

    const authorMatch = content.match(/author\s*=\s*\{([^}]+)\}/i)
    if (authorMatch) entry.authors = authorMatch[1].split(' and ').map(a => a.trim())

    const yearMatch = content.match(/year\s*=\s*\{?(\d{4})\}?/i)
    if (yearMatch) entry.year = parseInt(yearMatch[1])

    const journalMatch = content.match(/journal\s*=\s*\{([^}]+)\}/i)
    if (journalMatch) entry.journal = journalMatch[1].trim()

    const doiMatch = content.match(/doi\s*=\s*\{([^}]+)\}/i)
    if (doiMatch) entry.doi = doiMatch[1].trim()

    const abstractMatch = content.match(/abstract\s*=\s*\{([^}]+)\}/i)
    if (abstractMatch) entry.abstract = abstractMatch[1].trim()

    if (entry.title) {
      entries.push(entry)
    }
  }

  return entries
}

// ============================================================
// Star Rating Component
// ============================================================

function StarRating({ rating, onChange, readonly }: { rating: number; onChange?: (r: number) => void; readonly?: boolean }) {
  const [hovered, setHovered] = useState(0)

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform star-pop`}
          onClick={() => onChange?.(star === rating ? 0 : star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          aria-label={`${star} star`}
        >
          <Star
            className={`size-4 ${
              star <= (hovered || rating)
                ? 'fill-amber-400 text-amber-400'
                : 'text-slate-500/50'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

// ============================================================
// Paper Form Dialog
// ============================================================

function PaperFormDialog({
  lang,
  open,
  onClose,
  onSubmit,
  initialPaper,
  allTags,
}: {
  lang: Lang
  open: boolean
  onClose: () => void
  onSubmit: (paper: Partial<Paper>) => void
  initialPaper?: Paper
  allTags: string[]
}) {
  const [title, setTitle] = useState('')
  const [authorsStr, setAuthorsStr] = useState('')
  const [year, setYear] = useState('')
  const [journal, setJournal] = useState('')
  const [doi, setDoi] = useState('')
  const [abstract, setAbstract] = useState('')
  const [url, setUrl] = useState('')
  const [tagsStr, setTagsStr] = useState('')
  const [rating, setRating] = useState(0)
  const [tagSuggestionsOpen, setTagSuggestionsOpen] = useState(false)

  useEffect(() => {
    if (initialPaper) {
      requestAnimationFrame(() => {
        setTitle(initialPaper.title)
        setAuthorsStr(initialPaper.authors.join(', '))
        setYear(initialPaper.year?.toString() || '')
        setJournal(initialPaper.journal)
        setDoi(initialPaper.doi)
        setAbstract(initialPaper.abstract)
        setUrl(initialPaper.url)
        setTagsStr(initialPaper.tags.join(', '))
        setRating(initialPaper.rating)
      })
    } else {
      requestAnimationFrame(() => {
        setTitle(''); setAuthorsStr(''); setYear(''); setJournal('')
        setDoi(''); setAbstract(''); setUrl(''); setTagsStr(''); setRating(0)
      })
    }
  }, [initialPaper, open])

  const filteredSuggestions = useMemo(() => {
    if (!tagsStr) return []
    const current = tagsStr.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
    return allTags.filter(tag => !current.includes(tag.toLowerCase()) && tag.toLowerCase().includes(current[current.length - 1] || ''))
  }, [tagsStr, allTags])

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error(t(lang, 'papers.form.validation'))
      return
    }
    onSubmit({
      title: title.trim(),
      authors: authorsStr.split(',').map(a => a.trim()).filter(Boolean),
      year: year ? parseInt(year) : null,
      journal: journal.trim(),
      doi: doi.trim(),
      abstract: abstract.trim(),
      url: url.trim(),
      tags: tagsStr.split(',').map(t => t.trim()).filter(Boolean),
      rating,
    })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="vl-inner max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="vl-text-heading">
            {initialPaper ? t(lang, 'papers.editPaper') : t(lang, 'papers.addPaper')}
          </DialogTitle>
          <DialogDescription className="vl-text-muted">
            {initialPaper ? t(lang, 'papers.editPaper') : t(lang, 'papers.addPaper')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="vl-text-heading">{t(lang, 'papers.form.title')}</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={t(lang, 'papers.form.titlePlaceholder')} className="mt-1.5 vl-inner" />
          </div>
          <div>
            <Label className="vl-text-heading">{t(lang, 'papers.form.authors')}</Label>
            <Input value={authorsStr} onChange={e => setAuthorsStr(e.target.value)} placeholder={t(lang, 'papers.form.authorsPlaceholder')} className="mt-1.5 vl-inner" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="vl-text-heading">{t(lang, 'papers.form.year')}</Label>
              <Input value={year} onChange={e => setYear(e.target.value)} placeholder={t(lang, 'papers.form.yearPlaceholder')} className="mt-1.5 vl-inner" />
            </div>
            <div>
              <Label className="vl-text-heading">{t(lang, 'papers.form.journal')}</Label>
              <Input value={journal} onChange={e => setJournal(e.target.value)} placeholder={t(lang, 'papers.form.journalPlaceholder')} className="mt-1.5 vl-inner" />
            </div>
          </div>
          <div>
            <Label className="vl-text-heading">{t(lang, 'papers.form.doi')}</Label>
            <Input value={doi} onChange={e => setDoi(e.target.value)} placeholder={t(lang, 'papers.form.doiPlaceholder')} className="mt-1.5 vl-inner" />
          </div>
          <div>
            <Label className="vl-text-heading">{t(lang, 'papers.form.abstract')}</Label>
            <Textarea value={abstract} onChange={e => setAbstract(e.target.value)} placeholder={t(lang, 'papers.form.abstractPlaceholder')} rows={3} className="mt-1.5 vl-inner resize-none" />
          </div>
          <div>
            <Label className="vl-text-heading">{t(lang, 'papers.form.url')}</Label>
            <Input value={url} onChange={e => setUrl(e.target.value)} placeholder={t(lang, 'papers.form.urlPlaceholder')} className="mt-1.5 vl-inner" />
          </div>
          <div className="relative">
            <Label className="vl-text-heading">{t(lang, 'papers.form.tags')}</Label>
            <Input
              value={tagsStr}
              onChange={e => { setTagsStr(e.target.value); setTagSuggestionsOpen(true) }}
              onBlur={() => setTimeout(() => setTagSuggestionsOpen(false), 200)}
              onFocus={() => setTagSuggestionsOpen(true)}
              placeholder={t(lang, 'papers.form.tagsPlaceholder')}
              className="mt-1.5 vl-inner"
            />
            {tagSuggestionsOpen && filteredSuggestions.length > 0 && (
              <div className="absolute z-10 top-full mt-1 w-full rounded-lg border p-1 shadow-lg vl-inner">
                {filteredSuggestions.slice(0, 5).map(tag => (
                  <button
                    key={tag}
                    type="button"
                    className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-emerald-500/10 vl-text-muted transition-colors"
                    onMouseDown={() => {
                      const current = tagsStr.split(',').map(t => t.trim())
                      if (current[current.length - 1]) current[current.length - 1] = tag
                      else current.push(tag)
                      setTagsStr(current.join(', ') + ', ')
                      setTagSuggestionsOpen(false)
                    }}
                  >
                    <Tag className="size-3 inline mr-1.5" />{tag}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <Label className="vl-text-heading">{t(lang, 'papers.form.rating')}</Label>
            <div className="mt-1.5">
              <StarRating rating={rating} onChange={setRating} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{t(lang, 'common.cancel')}</Button>
          <Button onClick={handleSubmit} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {initialPaper ? t(lang, 'common.update') : t(lang, 'common.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Main Research Papers Tab
// ============================================================

export function ResearchPapersTab({ lang }: { lang: Lang }) {
  const [papers, setPapers] = useState<Paper[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [filterTag, setFilterTag] = useState('all')
  const [filterCollection, setFilterCollection] = useState('all')
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null)
  const [editingPaper, setEditingPaper] = useState<Paper | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [citeDialogOpen, setCiteDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [newCollectionName, setNewCollectionName] = useState('')
  const [expandedCollection, setExpandedCollection] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load from localStorage
  useEffect(() => {
    try {
      const savedPapers = localStorage.getItem(STORAGE_KEY)
      if (savedPapers) requestAnimationFrame(() => { setPapers(JSON.parse(savedPapers)) })
    } catch { /* ignore */ }
    try {
      const savedCollections = localStorage.getItem(COLLECTIONS_KEY)
      if (savedCollections) requestAnimationFrame(() => { setCollections(JSON.parse(savedCollections)) })
    } catch { /* ignore */ }
    requestAnimationFrame(() => { setMounted(true) })
  }, [])

  // Persist to localStorage
  const savePapers = useCallback((updated: Paper[]) => {
    setPapers(updated)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) } catch { /* ignore */ }
  }, [])

  const saveCollections = useCallback((updated: Collection[]) => {
    setCollections(updated)
    try { localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(updated)) } catch { /* ignore */ }
  }, [])

  // All tags
  const allTags = useMemo(() => {
    const tags = new Set<string>()
    papers.forEach(p => p.tags.forEach(t => tags.add(t)))
    return Array.from(tags).sort()
  }, [papers])

  // Filtered & sorted papers
  const filteredPapers = useMemo(() => {
    let result = [...papers]

    // Collection filter
    if (filterCollection !== 'all') {
      const collection = collections.find(c => c.id === filterCollection)
      if (collection) {
        result = result.filter(p => collection.paperIds.includes(p.id))
      }
    }

    // Tag filter
    if (filterTag !== 'all') {
      result = result.filter(p => p.tags.some(t => t.toLowerCase() === filterTag.toLowerCase()))
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.authors.some(a => a.toLowerCase().includes(q)) ||
        p.tags.some(t => t.toLowerCase().includes(q)) ||
        p.journal.toLowerCase().includes(q)
      )
    }

    // Sort
    switch (sortBy) {
      case 'newest': result.sort((a, b) => b.addedAt.localeCompare(a.addedAt)); break
      case 'oldest': result.sort((a, b) => a.addedAt.localeCompare(b.addedAt)); break
      case 'rating': result.sort((a, b) => b.rating - a.rating); break
      case 'year': result.sort((a, b) => (b.year || 0) - (a.year || 0)); break
      case 'title': result.sort((a, b) => a.title.localeCompare(b.title)); break
    }

    return result
  }, [papers, searchQuery, sortBy, filterTag, filterCollection, collections])

  // Year distribution
  const yearDistribution = useMemo(() => {
    const dist: Record<number, number> = {}
    papers.forEach(p => {
      if (p.year) dist[p.year] = (dist[p.year] || 0) + 1
    })
    return Object.entries(dist)
      .map(([year, count]) => ({ year: parseInt(year), count }))
      .sort((a, b) => b.year - a.year)
  }, [papers])

  // Tag cloud data
  const tagCloud = useMemo(() => {
    const tagCounts: Record<string, number> = {}
    papers.forEach(p => p.tags.forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1 }))
    return Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
  }, [papers])

  // CRUD
  const handleAddPaper = (data: Partial<Paper>) => {
    const paper: Paper = {
      id: uuidv4(),
      title: data.title || '',
      authors: data.authors || [],
      year: data.year || null,
      journal: data.journal || '',
      doi: data.doi || '',
      abstract: data.abstract || '',
      url: data.url || '',
      tags: data.tags || [],
      rating: data.rating || 0,
      addedAt: new Date().toISOString(),
    }
    savePapers([...papers, paper])
    toast.success(t(lang, 'papers.toast.added'))
  }

  const handleEditPaper = (data: Partial<Paper>) => {
    if (!editingPaper) return
    const updated = papers.map(p => p.id === editingPaper.id ? { ...p, ...data, id: p.id, addedAt: p.addedAt } : p)
    savePapers(updated as Paper[])
    setEditingPaper(null)
    toast.success(t(lang, 'papers.toast.updated'))
  }

  const handleDeletePaper = (id: string) => {
    savePapers(papers.filter(p => p.id !== id))
    if (selectedPaper?.id === id) setSelectedPaper(null)
    toast.success(t(lang, 'papers.toast.deleted'))
  }

  const handleImportBibTeX = () => {
    const entries = parseBibTeX(importText)
    if (entries.length === 0) {
      toast.error(t(lang, 'papers.import.noEntries'))
      return
    }
    const newPapers: Paper[] = entries.map(e => ({
      id: uuidv4(),
      title: e.title || '',
      authors: e.authors || [],
      year: e.year || null,
      journal: e.journal || '',
      doi: e.doi || '',
      abstract: e.abstract || '',
      url: e.url || '',
      tags: e.tags || [],
      rating: 0,
      addedAt: new Date().toISOString(),
    }))
    savePapers([...papers, ...newPapers])
    setImportText('')
    setImportDialogOpen(false)
    toast.success(t(lang, 'papers.toast.imported'))
  }

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(papers, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'research-papers.json'; a.click()
    URL.revokeObjectURL(url)
    toast.success(t(lang, 'papers.toast.exported'))
  }

  const handleExportBibTeX = () => {
    const bib = papers.map(p => generateBibTeX(p)).join('\n\n')
    const blob = new Blob([bib], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'references.bib'; a.click()
    URL.revokeObjectURL(url)
    toast.success(t(lang, 'papers.toast.exported'))
  }

  const handleExportCSV = () => {
    const headers = ['Title', 'Authors', 'Year', 'Journal', 'DOI', 'Tags', 'Rating']
    const rows = papers.map(p => [
      `"${p.title}"`,
      `"${p.authors.join('; ')}"`,
      p.year || '',
      `"${p.journal}"`,
      p.doi,
      `"${p.tags.join(', ')}"`,
      p.rating,
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'research-papers.csv'; a.click()
    URL.revokeObjectURL(url)
    toast.success(t(lang, 'papers.toast.exported'))
  }

  const handleCreateCollection = () => {
    if (!newCollectionName.trim()) return
    const collection: Collection = {
      id: uuidv4(),
      name: newCollectionName.trim(),
      paperIds: [],
    }
    saveCollections([...collections, collection])
    setNewCollectionName('')
  }

  const handleAddToCollection = (collectionId: string, paperId: string) => {
    const updated = collections.map(c => {
      if (c.id === collectionId && !c.paperIds.includes(paperId)) {
        return { ...c, paperIds: [...c.paperIds, paperId] }
      }
      return c
    })
    saveCollections(updated)
  }

  const formatAuthors = (authors: string[]) => {
    if (authors.length === 0) return ''
    if (authors.length <= 3) return authors.join(', ')
    return `${authors.slice(0, 3).join(', ')} ${t(lang, 'papers.authors.etAl')}`
  }

  if (!mounted) return null

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold vl-text-heading flex items-center gap-2">
            <GraduationCap className="size-6 text-emerald-500" />
            {t(lang, 'papers.title')}
          </h2>
          <p className="text-sm mt-1 vl-text-muted">{t(lang, 'papers.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" onClick={() => setImportDialogOpen(true)} variant="outline" className="gap-1.5">
            <Upload className="size-3.5" /> {t(lang, 'papers.importBibtex')}
          </Button>
          <Button size="sm" onClick={handleExportJSON} variant="outline" className="gap-1.5">
            <FileJson className="size-3.5" /> {t(lang, 'papers.exportJson')}
          </Button>
          <Button size="sm" onClick={handleExportBibTeX} variant="outline" className="gap-1.5">
            <FileText className="size-3.5" /> {t(lang, 'papers.exportBibtex')}
          </Button>
          <Button size="sm" onClick={handleExportCSV} variant="outline" className="gap-1.5">
            <Download className="size-3.5" /> {t(lang, 'papers.exportCsv')}
          </Button>
          <Button size="sm" onClick={() => { setEditingPaper(null); setAddDialogOpen(true) }} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="size-3.5" /> {t(lang, 'papers.addPaper')}
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 vl-text-muted" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t(lang, 'papers.searchPlaceholder')}
            className="pl-9 vl-inner"
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-40 vl-inner">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="vl-inner">
            <SelectItem value="newest">{t(lang, 'papers.sort.newest')}</SelectItem>
            <SelectItem value="oldest">{t(lang, 'papers.sort.oldest')}</SelectItem>
            <SelectItem value="rating">{t(lang, 'papers.sort.rating')}</SelectItem>
            <SelectItem value="year">{t(lang, 'papers.sort.year')}</SelectItem>
            <SelectItem value="title">{t(lang, 'papers.sort.title')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterTag} onValueChange={setFilterTag}>
          <SelectTrigger className="w-36 vl-inner">
            <SelectValue placeholder={t(lang, 'papers.filter.allTags')} />
          </SelectTrigger>
          <SelectContent className="vl-inner">
            <SelectItem value="all">{t(lang, 'papers.filter.allTags')}</SelectItem>
            {allTags.map(tag => (
              <SelectItem key={tag} value={tag}>{tag}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCollection} onValueChange={setFilterCollection}>
          <SelectTrigger className="w-40 vl-inner">
            <SelectValue placeholder={t(lang, 'papers.filter.allCollections')} />
          </SelectTrigger>
          <SelectContent className="vl-inner">
            <SelectItem value="all">{t(lang, 'papers.filter.allCollections')}</SelectItem>
            {collections.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name} ({c.paperIds.length})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left sidebar: Stats + Collections */}
        <div className="lg:col-span-1 space-y-4">
          {/* Stats */}
          <Card className="vl-card border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium vl-text-heading flex items-center gap-2">
                <BarChartIcon className="size-4 text-emerald-500" />
                {t(lang, 'papers.stats.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-2xl font-bold vl-text-heading">{papers.length}</div>
              <p className="text-xs vl-text-muted">{t(lang, 'papers.stats.totalPapers')}</p>
              {yearDistribution.length > 0 && (
                <>
                  <Separator className="vl-border" />
                  <p className="text-xs font-medium vl-text-muted">{t(lang, 'papers.stats.byYear')}</p>
                  <div className="space-y-1.5">
                    {yearDistribution.slice(0, 8).map(({ year, count }) => {
                      const maxCount = Math.max(...yearDistribution.map(d => d.count), 1)
                      return (
                        <div key={year} className="flex items-center gap-2">
                          <span className="text-xs w-8 text-right vl-text-muted">{year}</span>
                          <div className="flex-1 h-3 rounded-full overflow-hidden vl-bg-secondary">
                            <div
                              className="h-full bg-emerald-500/70 rounded-full transition-all"
                              style={{ width: `${(count / maxCount) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs w-4 vl-text-muted">{count}</span>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
              {tagCloud.length > 0 && (
                <>
                  <Separator className="vl-border" />
                  <p className="text-xs font-medium vl-text-muted">{t(lang, 'papers.stats.byTag')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tagCloud.slice(0, 12).map(({ tag, count }) => (
                      <button
                        key={tag}
                        onClick={() => setFilterTag(tag === filterTag ? 'all' : tag)}
                        className={`tag-pill text-xs px-2 py-0.5 rounded-full transition-colors ${
                          filterTag === tag
                            ? 'bg-emerald-600/80 text-white'
                            : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                        }`}
                      >
                        {tag} <span className="opacity-60">{count}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Collections */}
          <Card className="vl-card border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium vl-text-heading flex items-center gap-2">
                <FolderOpen className="size-4 text-amber-500" />
                {t(lang, 'papers.collection.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-1.5">
                <Input
                  value={newCollectionName}
                  onChange={e => setNewCollectionName(e.target.value)}
                  placeholder={t(lang, 'papers.collection.namePlaceholder')}
                  className="h-8 text-xs vl-inner"
                  onKeyDown={e => e.key === 'Enter' && handleCreateCollection()}
                />
                <Button size="sm" onClick={handleCreateCollection} className="h-8 px-2 bg-amber-600 hover:bg-amber-700 text-white shrink-0">
                  <Plus className="size-3" />
                </Button>
              </div>
              {collections.length === 0 && (
                <p className="text-xs vl-text-muted py-2">{t(lang, 'papers.collection.empty')}</p>
              )}
              {collections.map(c => (
                <div key={c.id}>
                  <button
                    onClick={() => setExpandedCollection(expandedCollection === c.id ? null : c.id)}
                    className="w-full flex items-center gap-1.5 text-sm py-1 hover:text-emerald-400 transition-colors vl-text-heading"
                  >
                    <ChevronRight className={`size-3.5 transition-transform ${expandedCollection === c.id ? 'rotate-90 collection-chevron-open' : ''}`} />
                    <span className="truncate flex-1 text-left">{c.name}</span>
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{c.paperIds.length}</Badge>
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Main content: Paper Grid */}
        <div className="lg:col-span-3">
          {filteredPapers.length === 0 ? (
            <Card className="vl-card border">
              <CardContent className="py-16 text-center">
                <BookOpen className="size-12 mx-auto text-slate-500/40 mb-4" />
                <h3 className="text-lg font-medium vl-text-heading">{t(lang, 'papers.noPapers')}</h3>
                <p className="text-sm mt-1 vl-text-muted">{t(lang, 'papers.noPapersDesc')}</p>
                <Button
                  onClick={() => { setEditingPaper(null); setAddDialogOpen(true) }}
                  className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Plus className="size-4 mr-1.5" /> {t(lang, 'papers.addFirst')}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="paper-grid-masonry">
              {filteredPapers.map(paper => (
                <Card key={paper.id} className="paper-card vl-card border cursor-pointer overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    <div onClick={() => setSelectedPaper(paper)}>
                      {/* Title */}
                      <h3 className="font-semibold text-sm vl-text-heading line-clamp-2 leading-snug">{paper.title}</h3>

                      {/* Authors & Year */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs vl-text-muted truncate max-w-[200px]">{formatAuthors(paper.authors)}</span>
                        {paper.year && (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-emerald-500/15 text-emerald-400 border-emerald-500/20">
                            {paper.year}
                          </Badge>
                        )}
                      </div>

                      {/* Journal */}
                      {paper.journal && (
                        <p className="text-xs italic vl-text-muted truncate">{paper.journal}</p>
                      )}

                      {/* Tags */}
                      {paper.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {paper.tags.slice(0, 4).map(tag => (
                            <span key={tag} className="tag-pill text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400">
                              {tag}
                            </span>
                          ))}
                          {paper.tags.length > 4 && (
                            <span className="text-[10px] px-1.5 py-0.5 vl-text-muted">+{paper.tags.length - 4}</span>
                          )}
                        </div>
                      )}

                      {/* Abstract preview */}
                      {paper.abstract && (
                        <p className="text-xs vl-text-muted line-clamp-2 leading-relaxed">{paper.abstract}</p>
                      )}

                      {/* Rating */}
                      <StarRating rating={paper.rating} readonly />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 pt-1 border-t vl-border">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => setSelectedPaper(paper)}>
                              <BookOpen className="size-3" /> {t(lang, 'papers.card.viewDetail')}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t(lang, 'papers.card.viewDetail')}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => { setSelectedPaper(paper); setCiteDialogOpen(true) }}>
                              <Quote className="size-3" /> {t(lang, 'papers.card.cite')}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t(lang, 'papers.card.cite')}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {collections.length > 0 && (
                        <DropdownAddToCollection
                          lang={lang}
                          collections={collections}
                          onAdd={(cid) => handleAddToCollection(cid, paper.id)}
                        />
                      )}
                      <div className="flex-1" />
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setEditingPaper(paper); setAddDialogOpen(true) }}>
                              <Pencil className="size-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t(lang, 'papers.card.edit')}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-red-400 hover:text-red-300" onClick={() => handleDeletePaper(paper.id)}>
                              <Trash2 className="size-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t(lang, 'papers.card.delete')}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Paper Detail Dialog */}
      <Dialog open={!!selectedPaper} onOpenChange={() => setSelectedPaper(null)}>
        <DialogContent className="vl-inner max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedPaper && (
            <>
              <DialogHeader>
                <DialogTitle className="vl-text-heading text-lg">{selectedPaper.title}</DialogTitle>
                <DialogDescription className="vl-text-muted">
                  {formatAuthors(selectedPaper.authors)} {selectedPaper.year && `(${selectedPaper.year})`}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedPaper.journal && <Badge variant="secondary">{selectedPaper.journal}</Badge>}
                  {selectedPaper.year && <Badge variant="outline">{selectedPaper.year}</Badge>}
                  {selectedPaper.doi && <Badge variant="outline" className="text-xs">{selectedPaper.doi}</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  <StarRating rating={selectedPaper.rating} readonly />
                </div>
                {selectedPaper.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPaper.tags.map(tag => (
                      <span key={tag} className="tag-pill text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400">{tag}</span>
                    ))}
                  </div>
                )}
                {selectedPaper.abstract && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 vl-text-heading">{t(lang, 'papers.detail.fullAbstract')}</h4>
                    <p className="text-sm vl-text-muted leading-relaxed">{selectedPaper.abstract}</p>
                  </div>
                )}
                <Separator className="vl-border" />
                <h4 className="text-sm font-medium vl-text-heading">{t(lang, 'papers.citation.title')}</h4>
                <CitationPanel paper={selectedPaper} lang={lang} />
                {selectedPaper.url && (
                  <a href={selectedPaper.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-emerald-500 hover:text-emerald-400 transition-colors">
                    <ExternalLink className="size-3.5" /> {selectedPaper.url}
                  </a>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Citation Dialog (for multiple papers) */}
      <Dialog open={citeDialogOpen && !!selectedPaper} onOpenChange={() => setCiteDialogOpen(false)}>
        <DialogContent className="vl-inner max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="vl-text-heading">{t(lang, 'papers.citation.title')}</DialogTitle>
          </DialogHeader>
          {selectedPaper && <CitationPanel paper={selectedPaper} lang={lang} />}
          <Separator className="vl-border" />
          <CombinedBibliography papers={filteredPapers} lang={lang} />
        </DialogContent>
      </Dialog>

      {/* Import BibTeX Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="vl-inner max-w-lg">
          <DialogHeader>
            <DialogTitle className="vl-text-heading">{t(lang, 'papers.importBibtex')}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={importText}
            onChange={e => setImportText(e.target.value)}
            placeholder={t(lang, 'papers.import.dropzone')}
            rows={10}
            className="vl-inner font-mono text-xs resize-none"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".bib"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                const reader = new FileReader()
                reader.onload = () => setImportText(reader.result as string)
                reader.readAsText(file)
              }
            }}
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-1.5">
              <Upload className="size-3.5" /> .bib
            </Button>
            <Button onClick={handleImportBibTeX} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
              <Plus className="size-3.5" /> {t(lang, 'common.import')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Paper Form Dialog */}
      <PaperFormDialog
        lang={lang}
        open={addDialogOpen}
        onClose={() => { setAddDialogOpen(false); setEditingPaper(null) }}
        onSubmit={editingPaper ? handleEditPaper : handleAddPaper}
        initialPaper={editingPaper || undefined}
        allTags={allTags}
      />
    </div>
  )
}

// ============================================================
// Dropdown for adding paper to collection (inline)
// ============================================================

function DropdownAddToCollection({
  lang,
  collections,
  onAdd,
}: {
  lang: Lang
  collections: Collection[]
  onAdd: (collectionId: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => setOpen(!open)}>
        <FolderOpen className="size-3" /> {t(lang, 'papers.collection.addTo')}
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 w-48 rounded-lg border p-1 shadow-lg vl-inner">
            {collections.map(c => (
              <button
                key={c.id}
                className="w-full text-left px-2 py-1.5 text-xs rounded-md hover:bg-emerald-500/10 vl-text-muted transition-colors"
                onClick={() => { onAdd(c.id); setOpen(false) }}
              >
                <FolderOpen className="size-3 inline mr-1.5" />{c.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
