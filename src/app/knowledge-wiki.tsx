'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  BookOpen, Plus, Search, LayoutGrid, List, Network, Tag,
  Calendar, FileText, Pencil, Trash2, Download, Upload,
  ChevronLeft, X, Check, Clock, Shuffle, ArrowUpDown,
  ExternalLink, Book, Database, Globe, Link2,
  Brain, FlaskConical, Wrench, BarChart3, Lightbulb, Box,
  Info,
} from 'lucide-react'
import { toast } from 'sonner'

// ============================================================
// Types
// ============================================================

export type WikiConceptType = 'theory' | 'method' | 'tool' | 'result' | 'hypothesis' | 'entity'
export type WikiViewMode = 'list' | 'table' | 'graph'
export type WikiPanelState = 'browse' | 'editor' | 'view'

interface WikiReference {
  id: string
  title: string
  url: string
  type: 'Paper' | 'URL' | 'Book' | 'Database'
}

interface WikiPage {
  id: string
  title: string
  type: WikiConceptType
  description: string
  tags: string[]
  relatedConcepts: string[]
  references: WikiReference[]
  notes: string
  createdAt: string
  updatedAt: string
  author: string
}

interface WikiData {
  pages: WikiPage[]
  lastUpdated: string
}

// ============================================================
// Constants
// ============================================================

const STORAGE_KEY = 'vl-knowledge-wiki'

const CONCEPT_TYPE_CONFIG: { type: WikiConceptType; label: string; color: string; icon: React.ReactNode }[] = [
  { type: 'theory', label: 'Theory', color: '#3b82f6', icon: <Brain className="size-3" /> },
  { type: 'method', label: 'Method', color: '#10b981', icon: <FlaskConical className="size-3" /> },
  { type: 'tool', label: 'Tool', color: '#8b5cf6', icon: <Wrench className="size-3" /> },
  { type: 'result', label: 'Result', color: '#f59e0b', icon: <BarChart3 className="size-3" /> },
  { type: 'hypothesis', label: 'Hypothesis', color: '#ec4899', icon: <Lightbulb className="size-3" /> },
  { type: 'entity', label: 'Entity', color: '#06b6d4', icon: <Box className="size-3" /> },
]

const TYPE_COLORS: Record<WikiConceptType, string> = {
  theory: '#3b82f6', method: '#10b981', tool: '#8b5cf6',
  result: '#f59e0b', hypothesis: '#ec4899', entity: '#06b6d4',
}

const REF_TYPE_ICONS: Record<WikiReference['type'], React.ReactNode> = {
  Paper: <FileText className="size-3.5" />,
  URL: <Globe className="size-3.5" />,
  Book: <Book className="size-3.5" />,
  Database: <Database className="size-3.5" />,
}

// ============================================================
// Sample Data Generator
// ============================================================

function generateSampleWikiData(): WikiData {
  const now = new Date().toISOString()
  const pages: WikiPage[] = [
    {
      id: 'wp-1', title: 'Nanobody Engineering', type: 'method',
      description: 'Systematic approach to designing and optimizing single-domain antibodies (nanobodies) for therapeutic and diagnostic applications. Covers scaffold selection, CDR design, and affinity optimization strategies.',
      tags: ['nanobody', 'antibody', 'engineering', 'therapeutics'],
      relatedConcepts: ['wp-2', 'wp-3', 'wp-5'],
      references: [
        { id: 'ref-1', title: 'Nanobodies as Enzyme Inhibitors', url: 'https://doi.org/10.1038/s41598-021-83695-4', type: 'Paper' },
        { id: 'ref-2', title: 'Muyldermans, Annual Review of Biochemistry 2013', url: '', type: 'Paper' },
      ],
      notes: 'Key focus areas: CDR3 loop engineering, framework stability optimization, and developability assessment.',
      createdAt: now, updatedAt: now, author: 'Lab PI',
    },
    {
      id: 'wp-2', title: 'CDR Loop Analysis', type: 'method',
      description: 'Computational analysis of complementarity-determining region loops in antibodies. Includes loop length distribution, conformational classification ( canonical structures), and sequence diversity assessment.',
      tags: ['CDR', 'loop-analysis', 'antibody-structure'],
      relatedConcepts: ['wp-1', 'wp-8'],
      references: [
        { id: 'ref-3', title: 'North et al., JMB 2011 - Canonical Structures', url: 'https://doi.org/10.1016/j.jmb.2010.12.010', type: 'Paper' },
      ],
      notes: 'North CDR classification is essential for nanobody design.',
      createdAt: now, updatedAt: now, author: 'Lab PI',
    },
    {
      id: 'wp-3', title: 'AlphaFold Structure Prediction', type: 'tool',
      description: 'DeepMind AlphaFold protein structure prediction system. Used for predicting nanobody-antigen complex structures with high accuracy. Key metrics: pLDDT (per-residue confidence) and pTM (interface confidence).',
      tags: ['alphafold', 'structure-prediction', 'deep-learning', 'computational'],
      relatedConcepts: ['wp-1', 'wp-4', 'wp-7'],
      references: [
        { id: 'ref-4', title: 'Jumper et al., Nature 2021', url: 'https://doi.org/10.1038/s41586-021-03819-2', type: 'Paper' },
        { id: 'ref-5', title: 'AlphaFold Protein Structure Database', url: 'https://alphafold.ebi.ac.uk/', type: 'Database' },
      ],
      notes: 'AlphaFold-Multimer is preferred for complex prediction. Consider RoseTTAFold as complementary method.',
      createdAt: now, updatedAt: now, author: 'Lab PI',
    },
    {
      id: 'wp-4', title: 'ESM Protein Language Model', type: 'tool',
      description: 'Meta ESM-2 protein language model trained on 250M sequences. Used for sequence space exploration, mutation effect prediction, and guided nanobody sequence optimization. Available in multiple sizes (150M to 15B parameters).',
      tags: ['ESM', 'language-model', 'protein', 'sequence', 'meta'],
      relatedConcepts: ['wp-3', 'wp-9', 'wp-10'],
      references: [
        { id: 'ref-6', title: 'Lin et al., Science 2023', url: 'https://doi.org/10.1126/science.ade2574', type: 'Paper' },
        { id: 'ref-7', title: 'ESM Github Repository', url: 'https://github.com/facebookresearch/esm', type: 'URL' },
      ],
      notes: 'ESM-2 embeddings capture structural and evolutionary information. Can be used for zero-shot mutation prediction.',
      createdAt: now, updatedAt: now, author: 'Lab PI',
    },
    {
      id: 'wp-5', title: 'Rosetta Energy Scoring', type: 'tool',
      description: 'Rosetta molecular modeling suite for protein structure prediction and design. InterfaceAnalyzer protocol used for scoring nanobody-antigen binding interfaces. Reports ΔΔG, packing statistics, and hydrogen bond counts.',
      tags: ['rosetta', 'energy', 'scoring', 'molecular-modeling'],
      relatedConcepts: ['wp-1', 'wp-7', 'wp-8'],
      references: [
        { id: 'ref-8', title: 'Alford et al., JCTC 2017', url: 'https://doi.org/10.1021/acs.jctc.6b01153', type: 'Paper' },
      ],
      notes: 'Use RosettaScripts for custom scoring protocols. REF2015 is the standard energy function.',
      createdAt: now, updatedAt: now, author: 'Lab PI',
    },
    {
      id: 'wp-6', title: 'Binding Affinity Prediction', type: 'result',
      description: 'Computational prediction of antibody-antigen binding affinity (KD). Combines molecular docking scores, energy calculations (ΔΔG), and machine learning models to predict binding strength.',
      tags: ['affinity', 'binding', 'prediction', 'KD'],
      relatedConcepts: ['wp-1', 'wp-5', 'wp-7'],
      references: [
        { id: 'ref-9', title: 'SIEVE Protocol Paper', url: 'https://doi.org/10.1371/journal.pcbi.1009721', type: 'Paper' },
      ],
      notes: 'No single method reliably predicts absolute KD. Use consensus of multiple approaches.',
      createdAt: now, updatedAt: now, author: 'Lab PI',
    },
    {
      id: 'wp-7', title: 'Protein-Protein Interface Analysis', type: 'method',
      description: 'Computational analysis of protein-protein interaction interfaces. Identifies hot-spot residues, analyzes packing density, hydrogen bonds, salt bridges, and hydrophobic contacts at the binding interface.',
      tags: ['interface', 'analysis', 'protein-protein', 'computational'],
      relatedConcepts: ['wp-3', 'wp-5', 'wp-6'],
      references: [
        { id: 'ref-10', title: 'PDBePISA Database', url: 'https://www.ebi.ac.uk/pdbe/pisa/', type: 'Database' },
      ],
      notes: 'Hot-spot analysis is critical for understanding nanobody binding mechanism.',
      createdAt: now, updatedAt: now, author: 'Lab PI',
    },
    {
      id: 'wp-8', title: 'Affinity Maturation Strategies', type: 'method',
      description: 'Methods for improving antibody binding affinity. In silico approaches include computational saturation mutagenesis, directed evolution simulations, and machine learning-guided sequence optimization.',
      tags: ['affinity-maturation', 'optimization', 'mutation', 'directed-evolution'],
      relatedConcepts: ['wp-2', 'wp-4', 'wp-6'],
      references: [
        { id: 'ref-11', title: 'Fellouse et al., PNAS 2007', url: 'https://doi.org/10.1073/pnas.0701307104', type: 'Paper' },
      ],
      notes: 'Focus CDR3 saturation first — it contributes most to affinity gains.',
      createdAt: now, updatedAt: now, author: 'Lab PI',
    },
    {
      id: 'wp-9', title: 'Sequence Embeddings', type: 'theory',
      description: 'Vector representations of protein sequences derived from language models. ESM-2 and similar models produce per-residue embeddings that encode structural, functional, and evolutionary information.',
      tags: ['embeddings', 'language-model', 'representation', 'deep-learning'],
      relatedConcepts: ['wp-4', 'wp-10'],
      references: [
        { id: 'ref-12', title: 'Vig et al., Bioinformatics 2021', url: 'https://doi.org/10.1093/bioinformatics/btab074', type: 'Paper' },
      ],
      notes: 'Embeddings are useful for: similarity search, motif detection, and mutation effect prediction.',
      createdAt: now, updatedAt: now, author: 'Lab PI',
    },
    {
      id: 'wp-10', title: 'Zero-Shot Mutation Prediction', type: 'hypothesis',
      description: 'Hypothesis: Protein language model embeddings can predict mutation effects (ΔΔG, stability, binding) without explicit structural modeling. ESM-2 zero-shot predictions may correlate with experimental measurements.',
      tags: ['zero-shot', 'mutation', 'prediction', 'hypothesis'],
      relatedConcepts: ['wp-4', 'wp-6', 'wp-9'],
      references: [
        { id: 'ref-13', title: 'Meier et al., Nature Biotechnology 2021', url: 'https://doi.org/10.1038/s41587-021-00938-0', type: 'Paper' },
      ],
      notes: 'Validated on DeepMutational Benchmark. Accuracy varies by protein family.',
      createdAt: now, updatedAt: now, author: 'Lab PI',
    },
    {
      id: 'wp-11', title: 'Nanobody Developability', type: 'result',
      description: 'Assessment of nanobody suitability for therapeutic development. Includes solubility, aggregation propensity, immunogenicity, stability, expression yield, and pharmacokinetic properties.',
      tags: ['developability', 'therapeutic', 'assessment'],
      relatedConcepts: ['wp-1', 'wp-6'],
      references: [
        { id: 'ref-14', title: 'Structural developability assessment of nanobodies', url: 'https://doi.org/10.1002/anie.202212345', type: 'Paper' },
      ],
      notes: 'Thermostability (Tm) and aggregation propensity are key early indicators.',
      createdAt: now, updatedAt: now, author: 'Lab PI',
    },
    {
      id: 'wp-12', title: 'Phage Display Library', type: 'method',
      description: 'In vitro display technology for screening nanobody candidates. Uses M13 bacteriophage to display VHH libraries (10⁹ variants). Selection via biopanning against immobilized antigen.',
      tags: ['phage-display', 'screening', 'library', 'in-vitro'],
      relatedConcepts: ['wp-1', 'wp-8', 'wp-13'],
      references: [
        { id: 'ref-15', title: 'Saerens et al., Curr Opin Biotechnol 2005', url: '', type: 'Paper' },
      ],
      notes: 'Synthetic libraries reduce animal immunization requirements.',
      createdAt: now, updatedAt: now, author: 'Lab PI',
    },
    {
      id: 'wp-13', title: 'Yeast Surface Display', type: 'method',
      description: 'Eukaryotic protein display technology using Saccharomyces cerevisiae. Enables quantitative screening via flow cytometry. Better folding environment than phage display for complex proteins.',
      tags: ['yeast-display', 'screening', 'flow-cytometry'],
      relatedConcepts: ['wp-8', 'wp-12'],
      references: [
        { id: 'ref-16', title: 'Boder & Wittrup, Nat Biotechnol 1997', url: '', type: 'Paper' },
      ],
      notes: 'Combination with FACS enables affinity-based sorting.',
      createdAt: now, updatedAt: now, author: 'Lab PI',
    },
    {
      id: 'wp-14', title: 'SARS-CoV-2 Spike Protein', type: 'entity',
      description: 'Surface glycoprotein of SARS-CoV-2 responsible for host cell entry via ACE2 receptor. Contains RBD (receptor binding domain) and NTD (N-terminal domain). Primary target for therapeutic nanobodies.',
      tags: ['viral', 'spike', 'COVID-19', 'target', 'ACE2'],
      relatedConcepts: ['wp-1', 'wp-6', 'wp-15'],
      references: [
        { id: 'ref-17', title: 'Wrapp et al., Science 2020', url: 'https://doi.org/10.1126/science.abb2507', type: 'Paper' },
        { id: 'ref-18', title: 'PDB Spike Structures', url: 'https://www.rcsb.org/', type: 'Database' },
      ],
      notes: 'RBD-up conformation is the accessible target for nanobody binding.',
      createdAt: now, updatedAt: now, author: 'Lab PI',
    },
    {
      id: 'wp-15', title: 'V(D)J Recombination', type: 'theory',
      description: 'Biological mechanism generating antibody diversity through combinatorial recombination of V, D, and J gene segments. Produces ~10¹³ unique antibodies. Understanding V(D)J is key to nanobody library design.',
      tags: ['biology', 'immune-system', 'diversity', 'genetics'],
      relatedConcepts: ['wp-1', 'wp-14'],
      references: [
        { id: 'ref-19', title: 'Schatz & Swanson, Annu Rev Genet 2011', url: '', type: 'Paper' },
      ],
      notes: 'Camelids lack light chains — VHH is the mature heavy-chain-only domain.',
      createdAt: now, updatedAt: now, author: 'Lab PI',
    },
  ]

  return { pages, lastUpdated: now }
}

// ============================================================
// Helpers
// ============================================================

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getExcerpt(text: string, maxLen: number = 160): string {
  const plain = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, '')
  return plain.length > maxLen ? plain.slice(0, maxLen) + '...' : plain
}

function simpleMarkdown(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*<\/li>)/g, '<ul>$1</ul>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br/>')
}

// ============================================================
// Sub-Components
// ============================================================

function TypeBadge({ type }: { type: WikiConceptType }) {
  const config = CONCEPT_TYPE_CONFIG.find(c => c.type === type)
  if (!config) return null
  return (
    <span className={`kw-type-badge kw-type-badge-${type}`}>
      {config.icon}
      {config.label}
    </span>
  )
}

function TagPill({ tag, onRemove }: { tag: string; onRemove?: () => void }) {
  return (
    <span className="kw-tag-pill">
      {tag}
      {onRemove && (
        <span className="kw-tag-remove" onClick={(e) => { e.stopPropagation(); onRemove() }}>×</span>
      )}
    </span>
  )
}

function ReferenceItem({ ref }: { ref: WikiReference }) {
  return (
    <div className="kw-reference-item">
      <span className="kw-ref-icon">{REF_TYPE_ICONS[ref.type]}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="kw-ref-title">{ref.title}</p>
        {ref.url && (
          <a href={ref.url} target="_blank" rel="noopener noreferrer" className="kw-ref-url" style={{ fontSize: 11 }}>
            <ExternalLink className="size-3" style={{ display: 'inline', marginRight: 4 }} />
            {ref.url.length > 50 ? ref.url.slice(0, 50) + '...' : ref.url}
          </a>
        )}
      </div>
      <span className="kw-ref-type">{ref.type}</span>
    </div>
  )
}

function StatsBar({ pages }: { pages: WikiPage[] }) {
  const totalCount = pages.length
  const pagesByType = useMemo(() => {
    const counts: Record<string, number> = {}
    pages.forEach(p => { counts[p.type] = (counts[p.type] || 0) + 1 })
    return counts
  }, [pages])

  const avgConnections = totalCount > 0
    ? (pages.reduce((sum, p) => sum + p.relatedConcepts.length, 0) / totalCount).toFixed(1)
    : '0'

  const mostConnected = useMemo(() => {
    if (pages.length === 0) return null
    return pages.reduce((best, p) => p.relatedConcepts.length > (best?.relatedConcepts.length || 0) ? p : best, pages[0])
  }, [pages])

  return (
    <div className="kw-stats">
      <div className="kw-stat-card">
        <p className="kw-stat-value">{totalCount}</p>
        <p className="kw-stat-label">Total Pages</p>
      </div>
      {CONCEPT_TYPE_CONFIG.map(ct => (
        pagesByType[ct.type] ? (
          <div key={ct.type} className="kw-stat-card">
            <p className="kw-stat-value" style={{ color: ct.color }}>{pagesByType[ct.type]}</p>
            <p className="kw-stat-label">{ct.label}s</p>
          </div>
        ) : null
      ))}
      <div className="kw-stat-card">
        <p className="kw-stat-value">{avgConnections}</p>
        <p className="kw-stat-label">Avg Connections</p>
      </div>
      {mostConnected && (
        <div className="kw-stat-card">
          <p className="kw-stat-value" style={{ fontSize: 'var(--vl-text-base)' }}>{mostConnected.title}</p>
          <p className="kw-stat-label">Most Connected</p>
        </div>
      )}
    </div>
  )
}

// Page card for list/grid view
function WikiPageCard({
  page, index, onClick,
}: {
  page: WikiPage
  index: number
  onClick: () => void
}) {
  const excerpt = getExcerpt(page.description, 160)
  return (
    <div
      className="kw-page-card"
      onClick={onClick}
      style={{ animation: `kw-card-appear 0.4s cubic-bezier(0.23, 1, 0.32, 1) ${index * 0.05}s forwards`, opacity: 0 }}
    >
      <div className="kw-card-header">
        <h3 className="kw-card-title">{page.title}</h3>
        <TypeBadge type={page.type} />
      </div>
      <p className="kw-card-preview">{excerpt}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
        {page.tags.slice(0, 5).map(tag => (
          <TagPill key={tag} tag={tag} />
        ))}
      </div>
      <div className="kw-card-footer">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Link2 className="size-3" /> {page.relatedConcepts.length} related
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Calendar className="size-3" /> {formatDate(page.updatedAt)}
        </span>
      </div>
    </div>
  )
}

// Table row
function WikiTableRow({
  page, onClick,
}: {
  page: WikiPage
  onClick: () => void
}) {
  return (
    <tr onClick={onClick}>
      <td style={{ fontWeight: 600, color: 'var(--vl-text-heading)' }}>{page.title}</td>
      <td><TypeBadge type={page.type} /></td>
      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {getExcerpt(page.description, 80)}
      </td>
      <td>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {page.tags.slice(0, 3).map(tag => <TagPill key={tag} tag={tag} />)}
        </div>
      </td>
      <td>{page.relatedConcepts.length}</td>
      <td>{formatDate(page.updatedAt)}</td>
    </tr>
  )
}

// Alphabetical sidebar index
function AlphaIndexSidebar({
  pages, activeLetter, onLetterClick,
}: {
  pages: WikiPage[]
  activeLetter: string | null
  onLetterClick: (letter: string) => void
}) {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
  const lettersWithEntries = useMemo(() => {
    const set = new Set<string>()
    pages.forEach(p => set.add(p.title.charAt(0).toUpperCase()))
    return set
  }, [pages])

  return (
    <div className="kw-alpha-grid">
      {letters.map(letter => (
        <button
          key={letter}
          className={`kw-alpha-letter ${lettersWithEntries.has(letter) ? 'has-entries' : ''} ${activeLetter === letter ? 'active' : ''}`}
          onClick={() => onLetterClick(letter)}
          title={lettersWithEntries.has(letter) ? undefined : 'No entries'}
        >
          {letter}
        </button>
      ))}
    </div>
  )
}

// Graph view (mini connections graph using SVG)
function WikiGraphView({ pages }: { pages: WikiPage[] }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const nodeMap = useMemo(() => {
    const map = new Map<string, WikiPage>()
    pages.forEach(p => map.set(p.id, p))
    return map
  }, [pages])

  const positions = useMemo(() => {
    const pos = new Map<string, { x: number; y: number }>()
    pages.forEach((p, i) => {
      const angle = (i / pages.length) * Math.PI * 2
      const radius = 130
      pos.set(p.id, {
        x: 300 + Math.cos(angle) * radius,
        y: 200 + Math.sin(angle) * radius,
      })
    })
    return pos
  }, [pages])

  return (
    <div className="kw-graph-view">
      <svg ref={svgRef} viewBox="0 0 600 400" preserveAspectRatio="xMidYMid meet">
        {/* Edges */}
        {pages.map(page =>
          page.relatedConcepts.map(relId => {
            const srcPos = positions.get(page.id)
            const tgtPos = positions.get(relId)
            if (!srcPos || !tgtPos) return null
            return (
              <line
                key={`${page.id}-${relId}`}
                x1={srcPos.x} y1={srcPos.y} x2={tgtPos.x} y2={tgtPos.y}
                stroke={TYPE_COLORS[page.type]} strokeWidth={1.5} opacity={0.3}
              />
            )
          })
        )}
        {/* Nodes */}
        {pages.map(page => {
          const pos = positions.get(page.id)
          if (!pos) return null
          return (
            <g key={page.id}>
              <circle cx={pos.x} cy={pos.y} r={14} fill={TYPE_COLORS[page.type]} opacity={0.85} />
              <text
                x={pos.x} y={pos.y + 26}
                textAnchor="middle"
                fill="var(--vl-text-secondary)"
                fontSize={9}
                fontWeight={500}
              >
                {page.title.length > 18 ? page.title.slice(0, 16) + '..' : page.title}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ============================================================
// Main Component
// ============================================================

export default function KnowledgeWiki() {
  const [mounted, setMounted] = useState(false)
  const [pages, setPages] = useState<WikiPage[]>([])
  const [panelState, setPanelState] = useState<WikiPanelState>('browse')
  const [viewMode, setViewMode] = useState<WikiViewMode>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<WikiConceptType | 'all'>('all')
  const [activeLetter, setActiveLetter] = useState<string | null>(null)
  const [selectedPage, setSelectedPage] = useState<WikiPage | null>(null)
  const [showStats, setShowStats] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Editor state
  const [editorTitle, setEditorTitle] = useState('')
  const [editorType, setEditorType] = useState<WikiConceptType>('theory')
  const [editorDescription, setEditorDescription] = useState('')
  const [editorTags, setEditorTags] = useState<string[]>([])
  const [editorTagInput, setEditorTagInput] = useState('')
  const [editorRelated, setEditorRelated] = useState<string[]>([])
  const [editorReferences, setEditorReferences] = useState<WikiReference[]>([])
  const [editorNotes, setEditorNotes] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as WikiData
        if (parsed.pages && parsed.pages.length > 0) {
          requestAnimationFrame(() => { setPages(parsed.pages); setMounted(true) })
          return
        }
      }
    } catch { /* ignore */ }
    const sample = generateSampleWikiData()
    requestAnimationFrame(() => {
      setPages(sample.pages)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sample)) } catch { /* ignore */ }
      setMounted(true)
    })
  }, [])

  // Persist
  const persistPages = useCallback((updated: WikiPage[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ pages: updated, lastUpdated: new Date().toISOString() }))
    } catch { /* ignore */ }
    setPages(updated)
  }, [])

  // Filtered pages
  const filteredPages = useMemo(() => {
    let result = pages
    if (typeFilter !== 'all') result = result.filter(p => p.type === typeFilter)
    if (activeLetter) result = result.filter(p => p.title.charAt(0).toUpperCase() === activeLetter)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q)) ||
        p.notes.toLowerCase().includes(q)
      )
    }
    return result.sort((a, b) => a.title.localeCompare(b.title))
  }, [pages, typeFilter, activeLetter, searchQuery])

  // All tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    pages.forEach(p => p.tags.forEach(t => tagSet.add(t)))
    return Array.from(tagSet).sort()
  }, [pages])

  // Handlers
  const handleNewPage = useCallback(() => {
    setSelectedPage(null)
    setEditorTitle('')
    setEditorType('theory')
    setEditorDescription('')
    setEditorTags([])
    setEditorTagInput('')
    setEditorRelated([])
    setEditorReferences([])
    setEditorNotes('')
    setPanelState('editor')
  }, [])

  const handleEditPage = useCallback((page: WikiPage) => {
    setSelectedPage(page)
    setEditorTitle(page.title)
    setEditorType(page.type)
    setEditorDescription(page.description)
    setEditorTags([...page.tags])
    setEditorTagInput('')
    setEditorRelated([...page.relatedConcepts])
    setEditorReferences([...page.references])
    setEditorNotes(page.notes)
    setPanelState('editor')
  }, [])

  const handleViewPage = useCallback((page: WikiPage) => {
    setSelectedPage(page)
    setPanelState('view')
  }, [])

  const handleSavePage = useCallback(() => {
    if (!editorTitle.trim()) {
      toast.error('Title is required')
      return
    }
    const now = new Date().toISOString()
    if (selectedPage) {
      const updated: WikiPage = {
        ...selectedPage,
        title: editorTitle.trim(),
        type: editorType,
        description: editorDescription,
        tags: editorTags,
        relatedConcepts: editorRelated,
        references: editorReferences,
        notes: editorNotes,
        updatedAt: now,
      }
      const next = pages.map(p => p.id === updated.id ? updated : p)
      persistPages(next)
      setSelectedPage(updated)
      toast.success('Page updated')
    } else {
      const newPage: WikiPage = {
        id: 'wp-' + Date.now(),
        title: editorTitle.trim(),
        type: editorType,
        description: editorDescription,
        tags: editorTags,
        relatedConcepts: editorRelated,
        references: editorReferences,
        notes: editorNotes,
        createdAt: now,
        updatedAt: now,
        author: 'Lab User',
      }
      const next = [...pages, newPage]
      persistPages(next)
      setSelectedPage(newPage)
      toast.success('Page created')
    }
    setPanelState('view')
  }, [selectedPage, editorTitle, editorType, editorDescription, editorTags, editorRelated, editorReferences, editorNotes, pages, persistPages])

  const handleDeletePage = useCallback(() => {
    if (!selectedPage) return
    const next = pages.filter(p => p.id !== selectedPage.id)
    persistPages(next)
    setSelectedPage(null)
    setDeleteConfirm(false)
    setPanelState('browse')
    toast.success('Page deleted')
  }, [selectedPage, pages, persistPages])

  const handleRandomPage = useCallback(() => {
    if (pages.length === 0) return
    const randomIdx = Math.floor(Math.random() * pages.length)
    handleViewPage(pages[randomIdx])
  }, [pages, handleViewPage])

  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify({ pages }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'knowledge-wiki.json'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Wiki exported as JSON')
  }, [pages])

  const handleImport = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const content = evt.target?.result as string
        const imported = JSON.parse(content) as WikiData
        if (imported.pages && imported.pages.length > 0) {
          persistPages(imported.pages)
          toast.success(`Imported ${imported.pages.length} pages`)
        } else {
          toast.error('Invalid wiki data')
        }
      } catch {
        toast.error('Failed to parse JSON file')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [persistPages])

  // Editor helpers
  const addEditorTag = useCallback(() => {
    const tag = editorTagInput.trim().toLowerCase()
    if (tag && !editorTags.includes(tag)) {
      setEditorTags(prev => [...prev, tag])
    }
    setEditorTagInput('')
  }, [editorTagInput, editorTags])

  const removeEditorTag = useCallback((tag: string) => {
    setEditorTags(prev => prev.filter(t => t !== tag))
  }, [])

  const toggleRelatedConcept = useCallback((pageId: string) => {
    setEditorRelated(prev =>
      prev.includes(pageId) ? prev.filter(id => id !== pageId) : [...prev, pageId]
    )
  }, [])

  const addReference = useCallback(() => {
    const newRef: WikiReference = {
      id: 'ref-' + Date.now(),
      title: 'New Reference',
      url: '',
      type: 'URL',
    }
    setEditorReferences(prev => [...prev, newRef])
  }, [])

  const updateReference = useCallback((refId: string, field: keyof WikiReference, value: string) => {
    setEditorReferences(prev => prev.map(r => r.id === refId ? { ...r, [field]: value } : r))
  }, [])

  const removeReference = useCallback((refId: string) => {
    setEditorReferences(prev => prev.filter(r => r.id !== refId))
  }, [])

  // Sort state for table view
  const [sortField, setSortField] = useState<'title' | 'type' | 'relatedConcepts' | 'updatedAt'>('title')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const sortedPages = useMemo(() => {
    const sorted = [...filteredPages]
    sorted.sort((a, b) => {
      let cmp = 0
      if (sortField === 'title') cmp = a.title.localeCompare(b.title)
      else if (sortField === 'type') cmp = a.type.localeCompare(b.type)
      else if (sortField === 'relatedConcepts') cmp = a.relatedConcepts.length - b.relatedConcepts.length
      else if (sortField === 'updatedAt') cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
      return sortDir === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [filteredPages, sortField, sortDir])

  const handleSort = useCallback((field: typeof sortField) => {
    if (sortField === field) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }, [sortField])

  // Loading
  if (!mounted) {
    return (
      <div className="kw-layout" style={{ padding: 24 }}>
        <div className="skeleton-shimmer" style={{ width: '60%', height: 32, borderRadius: 'var(--vl-radius-lg)', marginBottom: 16 }} />
        <div className="skeleton-shimmer" style={{ width: '100%', height: 200, borderRadius: 'var(--vl-radius-xl)' }} />
      </div>
    )
  }

  // ── Editor Panel ──
  if (panelState === 'editor') {
    return (
      <div className="kw-editor">
        <div className="kw-editor-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setPanelState(selectedPage ? 'view' : 'browse')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--vl-text-muted)' }}>
              <ChevronLeft className="size-5" />
            </button>
            <BookOpen className="size-5" style={{ color: 'var(--vl-accent)' }} />
            <span style={{ fontSize: 'var(--vl-text-lg)', fontWeight: 700, color: 'var(--vl-text-heading)' }}>
              {selectedPage ? 'Edit Page' : 'New Page'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="kg-toolbar-btn" onClick={() => setPanelState(selectedPage ? 'view' : 'browse')}>Cancel</button>
            <button className="kg-toolbar-btn active" onClick={handleSavePage}>
              <Check className="size-3" /> Save
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="kw-editor-section">
          <input
            className="kw-editor-title-input"
            placeholder="Page title..."
            value={editorTitle}
            onChange={e => setEditorTitle(e.target.value)}
            autoFocus
          />
        </div>

        {/* Type & Tags row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div className="kw-editor-section">
            <p className="kw-editor-section-title">Type</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {CONCEPT_TYPE_CONFIG.map(ct => (
                <button
                  key={ct.type}
                  className={`kg-type-filter ${editorType === ct.type ? 'active' : ''}`}
                  data-type={ct.type}
                  onClick={() => setEditorType(ct.type)}
                >
                  {ct.icon} {ct.label}
                </button>
              ))}
            </div>
          </div>
          <div className="kw-editor-section">
            <p className="kw-editor-section-title">Tags</p>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <input
                className="kg-search-input"
                style={{ flex: 1 }}
                placeholder="Add tag..."
                value={editorTagInput}
                onChange={e => setEditorTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEditorTag() } }}
              />
              <button className="kg-toolbar-btn" onClick={addEditorTag}><Plus className="size-3" /></button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {editorTags.map(tag => (
                <TagPill key={tag} tag={tag} onRemove={() => removeEditorTag(tag)} />
              ))}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="kw-editor-section">
          <p className="kw-editor-section-title">Description</p>
          <textarea
            className="kw-editor-textarea"
            placeholder="Write a description..."
            value={editorDescription}
            onChange={e => setEditorDescription(e.target.value)}
            rows={6}
          />
          <span style={{ fontSize: 10, color: 'var(--vl-text-muted)', marginTop: 4, display: 'block' }}>
            {editorDescription.length} characters
          </span>
        </div>

        {/* Related Concepts */}
        <div className="kw-editor-section">
          <p className="kw-editor-section-title">Related Concepts</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {pages.filter(p => p.id !== selectedPage?.id).map(p => (
              <button
                key={p.id}
                className={`kw-related-concept ${editorRelated.includes(p.id) ? 'active' : ''}`}
                onClick={() => toggleRelatedConcept(p.id)}
                style={editorRelated.includes(p.id) ? {
                  borderColor: 'var(--vl-accent)', color: 'var(--vl-accent)', background: 'var(--vl-accent-bg)',
                } : undefined}
              >
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: TYPE_COLORS[p.type] }} />
                {p.title}
                {editorRelated.includes(p.id) && <Check className="size-3" />}
              </button>
            ))}
          </div>
        </div>

        {/* References */}
        <div className="kw-editor-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <p className="kw-editor-section-title" style={{ marginBottom: 0 }}>References</p>
            <button className="kg-toolbar-btn" onClick={addReference}><Plus className="size-3" /> Add Reference</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {editorReferences.map(ref => (
              <div key={ref.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: 8, alignItems: 'center' }}>
                <input
                  className="kw-editor-input"
                  placeholder="Reference title"
                  value={ref.title}
                  onChange={e => updateReference(ref.id, 'title', e.target.value)}
                />
                <input
                  className="kw-editor-input"
                  placeholder="URL (optional)"
                  value={ref.url}
                  onChange={e => updateReference(ref.id, 'url', e.target.value)}
                />
                <select
                  className="kw-editor-input"
                  style={{ width: 'auto', minWidth: 90 }}
                  value={ref.type}
                  onChange={e => updateReference(ref.id, 'type', e.target.value)}
                >
                  <option value="Paper">Paper</option>
                  <option value="URL">URL</option>
                  <option value="Book">Book</option>
                  <option value="Database">Database</option>
                </select>
                <button className="kg-toolbar-btn" style={{ color: '#ef4444' }} onClick={() => removeReference(ref.id)}>
                  <Trash2 className="size-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="kw-editor-section">
          <p className="kw-editor-section-title">Notes (Markdown supported)</p>
          <textarea
            className="kw-editor-textarea"
            placeholder="Notes and observations..."
            value={editorNotes}
            onChange={e => setEditorNotes(e.target.value)}
            rows={4}
          />
        </div>

        {/* Bottom actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 16, borderTop: '1px solid var(--vl-border)' }}>
          <button className="kg-toolbar-btn" onClick={() => setPanelState(selectedPage ? 'view' : 'browse')}>Cancel</button>
          <button className="kg-toolbar-btn active" onClick={handleSavePage}><Check className="size-3" /> Save Page</button>
        </div>
      </div>
    )
  }

  // ── View Page ──
  if (panelState === 'view' && selectedPage) {
    const contentHtml = simpleMarkdown(selectedPage.description)
    const notesHtml = simpleMarkdown(selectedPage.notes)
    return (
      <div className="kw-editor" style={{ maxWidth: 960 }}>
        <div className="kw-editor-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setPanelState('browse')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--vl-text-muted)' }}>
              <ChevronLeft className="size-5" />
            </button>
            <BookOpen className="size-5" style={{ color: TYPE_COLORS[selectedPage.type] }} />
            <span style={{ fontSize: 'var(--vl-text-xl)', fontWeight: 700, color: 'var(--vl-text-heading)' }}>{selectedPage.title}</span>
            <TypeBadge type={selectedPage.type} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="kg-toolbar-btn" onClick={() => handleEditPage(selectedPage)}><Pencil className="size-3" /> Edit</button>
            <button className="kg-toolbar-btn" style={{ color: '#ef4444' }} onClick={() => setDeleteConfirm(true)}><Trash2 className="size-3" /> Delete</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24 }}>
          {/* Main content */}
          <div>
            {/* Description */}
            <div className="kw-editor-section">
              <p className="kw-editor-section-title">Description</p>
              <div
                className="kw-preview"
                style={{ lineHeight: 1.7, color: 'var(--vl-text-secondary)', fontSize: 'var(--vl-text-sm)' }}
                dangerouslySetInnerHTML={{ __html: contentHtml || '<p style="color:var(--vl-text-muted);font-style:italic">No description</p>' }}
              />
            </div>

            {/* References */}
            {selectedPage.references.length > 0 && (
              <div className="kw-editor-section">
                <p className="kw-editor-section-title">References ({selectedPage.references.length})</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedPage.references.map(ref => (
                    <ReferenceItem key={ref.id} ref={ref} />
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {selectedPage.notes && (
              <div className="kw-editor-section">
                <p className="kw-editor-section-title">Notes</p>
                <div
                  style={{ lineHeight: 1.7, color: 'var(--vl-text-secondary)', fontSize: 'var(--vl-text-sm)' }}
                  dangerouslySetInnerHTML={{ __html: notesHtml }}
                />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div>
            {/* Metadata card */}
            <div style={{ background: 'var(--vl-bg-card)', border: '1px solid var(--vl-border)', borderRadius: 'var(--vl-radius-lg)', padding: 16, marginBottom: 16 }}>
              <p className="kw-editor-section-title" style={{ marginBottom: 8 }}>Metadata</p>
              <div style={{ fontSize: 'var(--vl-text-xs)', color: 'var(--vl-text-muted)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span><Clock className="size-3" style={{ display: 'inline', marginRight: 4 }} /> Created: {formatDate(selectedPage.createdAt)}</span>
                <span><Clock className="size-3" style={{ display: 'inline', marginRight: 4 }} /> Modified: {formatDate(selectedPage.updatedAt)}</span>
                <span><Info className="size-3" style={{ display: 'inline', marginRight: 4 }} /> Author: {selectedPage.author}</span>
              </div>
            </div>

            {/* Tags card */}
            <div style={{ background: 'var(--vl-bg-card)', border: '1px solid var(--vl-border)', borderRadius: 'var(--vl-radius-lg)', padding: 16, marginBottom: 16 }}>
              <p className="kw-editor-section-title" style={{ marginBottom: 8 }}>Tags</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {selectedPage.tags.map(tag => <TagPill key={tag} tag={tag} />)}
              </div>
            </div>

            {/* Related concepts card */}
            <div style={{ background: 'var(--vl-bg-card)', border: '1px solid var(--vl-border)', borderRadius: 'var(--vl-radius-lg)', padding: 16 }}>
              <p className="kw-editor-section-title" style={{ marginBottom: 8 }}>Related Concepts ({selectedPage.relatedConcepts.length})</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {selectedPage.relatedConcepts.map(relId => {
                  const related = pages.find(p => p.id === relId)
                  if (!related) return null
                  return (
                    <button
                      key={relId}
                      className="kw-related-concept"
                      onClick={() => handleViewPage(related)}
                      style={{ justifyContent: 'flex-start' }}
                    >
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: TYPE_COLORS[related.type] }} />
                      {related.title}
                    </button>
                  )
                })}
                {selectedPage.relatedConcepts.length === 0 && (
                  <span style={{ fontSize: 'var(--vl-text-xs)', color: 'var(--vl-text-muted)' }}>No related concepts</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Delete confirmation */}
        {deleteConfirm && (
          <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', zIndex: 50 }}>
            <div style={{ background: 'var(--vl-bg-card)', borderRadius: 'var(--vl-radius-xl)', padding: 24, width: 360, maxWidth: '90%', border: '1px solid var(--vl-border)', boxShadow: 'var(--vl-shadow)' }}>
              <h3 style={{ fontSize: 'var(--vl-text-lg)', fontWeight: 700, color: 'var(--vl-text-heading)', marginBottom: 12 }}>Delete this page?</h3>
              <p style={{ fontSize: 'var(--vl-text-sm)', color: 'var(--vl-text-muted)', marginBottom: 20 }}>
                This will permanently delete &ldquo;{selectedPage.title}&rdquo;. This action cannot be undone.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button className="kg-toolbar-btn" onClick={() => setDeleteConfirm(false)}>Cancel</button>
                <button className="kg-toolbar-btn" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }} onClick={handleDeletePage}>
                  <Trash2 className="size-3" /> Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Browse View ──
  return (
    <div className="kw-layout">
      {/* Sidebar */}
      <div className="kw-sidebar">
        <AlphaIndexSidebar pages={pages} activeLetter={activeLetter} onLetterClick={l => setActiveLetter(prev => prev === l ? null : l)} />
        <div style={{ padding: 'var(--vl-space-2) 0' }}>
          <p style={{ fontSize: 'var(--vl-text-xs)', fontWeight: 600, color: 'var(--vl-text-muted)', marginBottom: 8 }}>Tags</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {allTags.slice(0, 20).map(tag => (
              <TagPill key={tag} tag={tag} onClick={() => setSearchQuery(tag)} />
            ))}
            {allTags.length > 20 && (
              <span style={{ fontSize: 10, color: 'var(--vl-text-muted)' }}>+{allTags.length - 20} more</span>
            )}
          </div>
        </div>
      </div>

      {/* Main area */}
      <div className="kw-main">
        {/* Toolbar */}
        <div className="kw-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen className="size-4" style={{ color: 'var(--vl-accent)' }} />
            <span style={{ fontSize: 'var(--vl-text-sm)', fontWeight: 700, color: 'var(--vl-text-heading)' }}>Knowledge Wiki</span>
            <span style={{ fontSize: 'var(--vl-text-xs)', color: 'var(--vl-text-muted)', background: 'var(--vl-bg-inner)', padding: '1px 6px', borderRadius: 'var(--vl-radius-full)' }}>
              {filteredPages.length}
            </span>
          </div>

          <input
            className="kg-search-input"
            placeholder="Search pages..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ marginLeft: 16 }}
          />

          <div className="kw-type-tabs">
            <button className={`kw-type-tab ${typeFilter === 'all' ? 'active' : ''}`} onClick={() => setTypeFilter('all')}>All</button>
            {CONCEPT_TYPE_CONFIG.map(ct => (
              <button key={ct.type} className={`kw-type-tab ${typeFilter === ct.type ? 'active' : ''}`} onClick={() => setTypeFilter(ct.type)}>
                {ct.icon} {ct.label}
              </button>
            ))}
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className="kw-view-toggle">
              <button className={`kw-view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}><LayoutGrid className="size-3.5" /></button>
              <button className={`kw-view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')}><List className="size-3.5" /></button>
              <button className={`kw-view-toggle-btn ${viewMode === 'graph' ? 'active' : ''}`} onClick={() => setViewMode('graph')}><Network className="size-3.5" /></button>
            </div>
            <button className="kg-toolbar-btn" onClick={handleRandomPage}><Shuffle className="size-3" /></button>
            <button className="kg-toolbar-btn" onClick={() => setShowStats(v => !v)}><BarChart3 className="size-3" /></button>
            <button className="kg-toolbar-btn" onClick={handleImport}><Upload className="size-3" /></button>
            <button className="kg-toolbar-btn" onClick={handleExport}><Download className="size-3" /></button>
            <button className="kg-toolbar-btn active" onClick={handleNewPage}><Plus className="size-3" /> New Page</button>
          </div>
          <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileImport} />
        </div>

        {/* Stats */}
        {showStats && <StatsBar pages={pages} />}

        {/* Content */}
        <div className="kw-content-area">
          {viewMode === 'graph' ? (
            <WikiGraphView pages={filteredPages} />
          ) : viewMode === 'table' ? (
            <table className="kw-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('title')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>Title <ArrowUpDown className="size-3" /></span>
                  </th>
                  <th onClick={() => handleSort('type')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>Type <ArrowUpDown className="size-3" /></span>
                  </th>
                  <th>Description</th>
                  <th>Tags</th>
                  <th onClick={() => handleSort('relatedConcepts')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>Related <ArrowUpDown className="size-3" /></span>
                  </th>
                  <th onClick={() => handleSort('updatedAt')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>Updated <ArrowUpDown className="size-3" /></span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedPages.map(page => (
                  <WikiTableRow key={page.id} page={page} onClick={() => handleViewPage(page)} />
                ))}
              </tbody>
            </table>
          ) : (
            <div className="kw-cards-grid">
              {sortedPages.map((page, idx) => (
                <WikiPageCard key={page.id} page={page} index={idx} onClick={() => handleViewPage(page)} />
              ))}
            </div>
          )}

          {sortedPages.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--vl-space-12)', color: 'var(--vl-text-muted)' }}>
              <BookOpen className="size-12" style={{ marginBottom: 16, opacity: 0.3 }} />
              <p style={{ fontSize: 'var(--vl-text-lg)', fontWeight: 600, color: 'var(--vl-text-heading)', marginBottom: 8 }}>No pages found</p>
              <p style={{ fontSize: 'var(--vl-text-sm)' }}>Try adjusting filters or create a new page</p>
              <button className="kg-toolbar-btn active" style={{ marginTop: 16 }} onClick={handleNewPage}>
                <Plus className="size-3" /> Create First Page
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
