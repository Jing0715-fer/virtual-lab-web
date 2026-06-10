'use client'

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import {
  Play, Pause, SkipForward, SkipBack, ChevronRight, ChevronDown,
  Users, User, Calendar, Clock, FileJson, Download,
  GitCompare, ChevronUp, BarChart3, MessageSquare, Hash,
  ScrollText, X, Eye, Filter, Zap, Award,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────

interface Participant {
  id: string; name: string; initials: string; role: string; expertise: string; color: string
}

interface Message {
  id: string; agentId: string; agentName: string; agentInitials: string; agentColor: string
  content: string; round: number; timestamp: string; isDecision?: boolean
}

interface Meeting {
  id: string; type: 'team' | 'individual'; title: string; agenda: string
  date: string; duration: string; participants: Participant[]; messages: Message[]
  pairedWith?: string
}

interface DiffResult {
  round: number; status: 'identical' | 'modified' | 'added' | 'removed'
  runA: string; runB: string
}

// ─── Inline Sample Data ──────────────────────────────────────

const AGENTS: Participant[] = [
  { id: 'a1', name: 'Dr. Sarah Chen', initials: 'SC', role: 'Principal Investigator', expertise: 'Structural Biology', color: '#10b981' },
  { id: 'a2', name: 'Dr. Wei Zhang', initials: 'WZ', role: 'Computational Biologist', expertise: 'AlphaFold, MD', color: '#06b6d4' },
  { id: 'a3', name: 'Dr. Lisa Wang', initials: 'LW', role: 'Medicinal Chemist', expertise: 'Virtual Screening', color: '#8b5cf6' },
  { id: 'a4', name: 'Dr. Emma Davis', initials: 'ED', role: 'Genomics Lead', expertise: 'RNA-seq', color: '#f59e0b' },
  { id: 'a5', name: 'Dr. Michael Ross', initials: 'MR', role: 'Gene Editing Specialist', expertise: 'CRISPR-Cas9', color: '#ef4444' },
  { id: 'a6', name: 'Dr. James Park', initials: 'JP', role: 'Research Associate', expertise: 'Biophysics', color: '#ec4899' },
  { id: 'a7', name: 'Dr. Priya Patel', initials: 'PP', role: 'ML Engineer', expertise: 'Deep Learning', color: '#14b8a6' },
  { id: 'a8', name: 'Dr. Alex Turner', initials: 'AT', role: 'Bioinformatician', expertise: 'Pipeline Dev', color: '#a855f7' },
]

const MEETINGS: Meeting[] = [
  {
    id: 'm1', type: 'team', title: 'Nanobody Design Sprint — Run A',
    agenda: 'Review AlphaFold predictions for SARS-CoV-2 variant binding',
    date: '2025-01-20', duration: '45 min',
    participants: [AGENTS[0], AGENTS[1], AGENTS[5], AGENTS[6]],
    pairedWith: 'm2',
    messages: [
      { id: 'm1-1', agentId: 'a1', agentName: 'Dr. Sarah Chen', agentInitials: 'SC', agentColor: '#10b981', round: 1, timestamp: '00:00', content: '## Opening Remarks\n\nWelcome everyone. Today we need to evaluate the latest AlphaFold-Multimer predictions for our nanobody candidates targeting the XBB.1.5 variant. We have **12 candidates** from the previous screening round.' },
      { id: 'm1-2', agentId: 'a2', agentName: 'Dr. Wei Zhang', agentInitials: 'WZ', agentColor: '#06b6d4', round: 1, timestamp: '00:45', content: 'I\'ve completed the structure predictions using AlphaFold-Multimer v2.3. The **top 3 candidates** show confident predictions (pLDDT > 90):\n\n1. **NB-C12**: pLDDT 94.2, predicted ΔG = -42.3 kcal/mol\n2. **NB-A07**: pLDDT 91.8, predicted ΔG = -38.7 kcal/mol\n3. **NB-D05**: pLDDT 90.5, predicted ΔG = -36.1 kcal/mol' },
      { id: 'm1-3', agentId: 'a6', agentName: 'Dr. James Park', agentInitials: 'JP', agentColor: '#ec4899', round: 2, timestamp: '02:30', content: 'Surface plasmon resonance results confirm Wei\'s predictions:\n\n- NB-C12: KD = 0.8 nM (excellent)\n- NB-A07: KD = 2.1 nM (very good)\n- NB-D05: KD = 5.4 nM (moderate)\n\nNB-C12 shows fast on-rate (kon = 3.2 × 10⁶ M⁻¹s⁻¹).' },
      { id: 'm1-4', agentId: 'a6', agentName: 'Dr. James Park', agentInitials: 'JP', agentColor: '#ec4899', round: 2, timestamp: '04:00', content: 'Concern: NB-C12 shows moderate aggregation at concentrations above 50 μM.' },
      { id: 'm1-5', agentId: 'a7', agentName: 'Dr. Priya Patel', agentInitials: 'PP', agentColor: '#14b8a6', round: 3, timestamp: '05:30', content: 'Regression model predicts aggregation propensity. Running on NB-C12:\n\n```\nAggregation Score: 0.42 (moderate)\nKey residues: Y34, F52, W78\n```\n\nRecommend mutating W78 to a polar residue — predicted to reduce aggregation to 0.18 while maintaining 90% binding affinity.' },
      { id: 'm1-6', agentId: 'a1', agentName: 'Dr. Sarah Chen', agentInitials: 'SC', agentColor: '#10b981', round: 4, timestamp: '08:00', content: '## Action Items\n\n1. James: W78 mutation stability engineering\n2. Wei: MD simulation on W78 mutant\n3. Priya: 5 additional mutation candidates\n4. Team: Prepare manuscript figures', isDecision: true },
      { id: 'm1-7', agentId: 'a2', agentName: 'Dr. Wei Zhang', agentInitials: 'WZ', agentColor: '#06b6d4', round: 5, timestamp: '10:00', content: 'I\'ll set up the MD simulation using AMBER force field with explicit TIP3P water — 100ns trajectory by Wednesday.' },
      { id: 'm1-8', agentId: 'a7', agentName: 'Dr. Priya Patel', agentInitials: 'PP', agentColor: '#14b8a6', round: 5, timestamp: '11:30', content: 'Mutation generator pipeline running. Candidates ready by tomorrow. Targeting positions 34, 52, 78 with focus on CDR3 loop conformation.' },
    ],
  },
  {
    id: 'm2', type: 'team', title: 'Nanobody Design Sprint — Run B',
    agenda: 'Review AlphaFold predictions for SARS-CoV-2 variant binding',
    date: '2025-01-22', duration: '52 min',
    participants: [AGENTS[0], AGENTS[1], AGENTS[5], AGENTS[6]],
    pairedWith: 'm1',
    messages: [
      { id: 'm2-1', agentId: 'a1', agentName: 'Dr. Sarah Chen', agentInitials: 'SC', agentColor: '#10b981', round: 1, timestamp: '00:00', content: '## Follow-up Meeting\n\nContinuing the nanobody optimization work. Starting with W78 mutant results from James.' },
      { id: 'm2-2', agentId: 'a6', agentName: 'Dr. James Park', agentInitials: 'JP', agentColor: '#ec4899', round: 1, timestamp: '01:00', content: '**W78S mutant** results:\n\n- KD = 1.1 nM (slight decrease, still excellent)\n- **Aggregation threshold improved** from 50 μM to >200 μM\n- Thermal stability: Tm = 72°C (vs 68°C for WT)\n\nW78S is a clear win for developability.' },
      { id: 'm2-3', agentId: 'a2', agentName: 'Dr. Wei Zhang', agentInitials: 'WZ', agentColor: '#06b6d4', round: 2, timestamp: '03:00', content: 'MD simulations confirm experimental results:\n\n- **Reduced hydrophobic surface exposure**\n- RMSD stabilized at 1.8 Å (vs 2.4 Å for WT)\n- Rosetta ΔΔG = +0.8 kcal/mol (consistent with affinity loss)' },
      { id: 'm2-4', agentId: 'a7', agentName: 'Dr. Priya Patel', agentInitials: 'PP', agentColor: '#14b8a6', round: 3, timestamp: '05:30', content: '**5 new mutation candidates**:\n\n1. Y34S / F52A: 40% solubility improvement\n2. N56D: Surface charge optimization\n3. S88R: pH stability enhancement\n4. W78S + N56D: Double mutant\n5. T102E: C-terminal charge addition\n\nModel R² improved from 0.78 to **0.85** on validation set.' },
      { id: 'm2-5', agentId: 'a7', agentName: 'Dr. Priya Patel', agentInitials: 'PP', agentColor: '#14b8a6', round: 3, timestamp: '07:00', content: 'Expanded training set with 200 new nanobody sequences from SAbDab database.' },
      { id: 'm2-6', agentId: 'a1', agentName: 'Dr. Sarah Chen', agentInitials: 'SC', agentColor: '#10b981', round: 4, timestamp: '09:00', content: '## Decision: Advance to Preclinical\n\n- **NB-C12-W78S** is our lead candidate\n- James: express double mutant (W78S + N56D)\n- Wei: cryo-EM grid preparation plan\n- Priya: pan-sarbecovirus nanobody model\n\n**Milestone**: IND-enabling study proposal by Feb 15.', isDecision: true },
      { id: 'm2-7', agentId: 'a2', agentName: 'Dr. Wei Zhang', agentInitials: 'WZ', agentColor: '#06b6d4', round: 5, timestamp: '11:00', content: 'Coordinating with cryo-EM core facility for 3.5 Å complex structure. Starting pan-sarbecovirus MSA for Priya\'s model.' },
      { id: 'm2-8', agentId: 'a6', agentName: 'Dr. James Park', agentInitials: 'JP', agentColor: '#ec4899', round: 5, timestamp: '12:30', content: 'Double mutant expression in progress — purified protein by Friday. Full biophysical characterization (SPR, DSC, SEC-MALS) over the weekend.' },
      { id: 'm2-9', agentId: 'a7', agentName: 'Dr. Priya Patel', agentInitials: 'PP', agentColor: '#14b8a6', round: 5, timestamp: '14:00', content: 'Pan-sarbecovirus model starting this week. Fine-tune ESM-2 on our dataset, then zero-shot across ~500 viral spike sequences. Target completion: February 1st.' },
    ],
  },
  {
    id: 'm3', type: 'individual', title: 'CRISPR Guide RNA Optimization — 1:1',
    agenda: 'Review off-target prediction model performance',
    date: '2025-01-18', duration: '30 min',
    participants: [AGENTS[4]],
    messages: [
      { id: 'm3-1', agentId: 'a5', agentName: 'Dr. Michael Ross', agentInitials: 'MR', agentColor: '#ef4444', round: 1, timestamp: '00:00', content: '## Self-Review: CRISPR-OT v2.1\n\n| Metric | Score |\n|--------|-------|\n| AUC-ROC | 0.94 |\n| Precision | 0.87 |\n| Recall | 0.82 |\n| F1 | 0.84 |\n\nPrecision improved after adding epigenomic features.' },
      { id: 'm3-2', agentId: 'a5', agentName: 'Dr. Michael Ross', agentInitials: 'MR', agentColor: '#ef4444', round: 2, timestamp: '04:00', content: 'Key findings:\n\n1. Chromatin accessibility improved predictions in heterochromatin by 15%\n2. Model struggles with single-mismatch off-targets near PAM-distal end\n3. DNA methylation data improved CpG-rich promoter predictions\n\nNext: transformer attention layer for positional dependencies.' },
      { id: 'm3-3', agentId: 'a5', agentName: 'Dr. Michael Ross', agentInitials: 'MR', agentColor: '#ef4444', round: 3, timestamp: '08:00', content: '## Experimental Plan\n\n- **Cell lines**: HEK293T + iPSC-derived neurons\n- **Guide RNAs**: 20 top + 10 edge cases\n- **Readout**: GUIDE-seq + CIRCLE-seq\n- **Timeline**: 3 weeks (HEK293T), 5 weeks (iPSC)\n- **Budget**: ~$12,000', isDecision: true },
      { id: 'm3-4', agentId: 'a5', agentName: 'Dr. Michael Ross', agentInitials: 'MR', agentColor: '#ef4444', round: 3, timestamp: '12:00', content: 'Action: Draft committee proposal by Friday with improved AUC-ROC data. Emphasize iPSC-neuron validation as key differentiator.' },
    ],
  },
  {
    id: 'm4', type: 'team', title: 'Drug Discovery Pipeline Review',
    agenda: 'Virtual screening results, ADMET predictions',
    date: '2025-01-16', duration: '55 min',
    participants: [AGENTS[2], AGENTS[4], AGENTS[7]],
    messages: [
      { id: 'm4-1', agentId: 'a3', agentName: 'Dr. Lisa Wang', agentInitials: 'LW', agentColor: '#8b5cf6', round: 1, timestamp: '00:00', content: '## Virtual Screening Update\n\nScreened **2.3M compounds** against *L. donovani* topoisomerase II:\n\n- **Top 50**: IC50 < 1 μM\n- **Lead-like**: 12 pass Lipinski Rule of 5\n- **Novel chemotypes**: 5 unexplored scaffolds\n\nDocking: Glide XP with cryo-EM structure (PDB: 8XYZ, 2.8 Å).' },
      { id: 'm4-2', agentId: 'a3', agentName: 'Dr. Lisa Wang', agentInitials: 'LW', agentColor: '#8b5cf6', round: 2, timestamp: '03:00', content: 'ADMET for top 12:\n\n```\nLDS-001: LogP 2.8, Good solubility, Low hERG risk\nLDS-007: LogP 3.1, Moderate solubility, Low hERG\nLDS-018: LogP 2.4, Good solubility, Low hERG\n```' },
      { id: 'm4-3', agentId: 'a8', agentName: 'Dr. Alex Turner', agentInitials: 'AT', agentColor: '#a855f7', round: 3, timestamp: '06:00', content: 'Hit validation pipeline:\n\n1. 50ns MD simulations for top 12\n2. MM/GBSA binding free energy\n3. Pharmacophore alignment\n\nHPC pipeline running — completion in 48 hours.' },
      { id: 'm4-4', agentId: 'a4', agentName: 'Dr. Emma Davis', agentInitials: 'ED', agentColor: '#f59e0b', round: 4, timestamp: '09:00', content: 'RNA-seq of *L. donovani* + pentamidine:\n\n- 342 DEGs (FDR < 0.05)\n- Topo II confirmed essential\n- **5 synthetic lethal** targets identified\n\nOpens combination therapy angle.', isDecision: true },
      { id: 'm4-5', agentId: 'a3', agentName: 'Dr. Lisa Wang', agentInitials: 'LW', agentColor: '#8b5cf6', round: 5, timestamp: '12:00', content: 'Actions:\n1. Alex: Complete MD, prioritize LDS-001 & LDS-018\n2. Emma: CRISPR validation of synthetic lethal targets\n3. Lisa: Order compounds for in vitro testing\n\nBudget: $8,500 for procurement and assays.' },
    ],
  },
  {
    id: 'm5', type: 'individual', title: 'Gene Expression Atlas — Data Integration',
    agenda: 'Integrate new single-cell datasets',
    date: '2025-01-14', duration: '25 min',
    participants: [AGENTS[3]],
    messages: [
      { id: 'm5-1', agentId: 'a4', agentName: 'Dr. Emma Davis', agentInitials: 'ED', agentColor: '#f59e0b', round: 1, timestamp: '00:00', content: '## Atlas Update\n\n- **1.2M cells** across 23 tissues\n- **8 developmental stages**\n- New: brain organoid + heart development data\n\nChallenges: batch effects, cell type annotation retraining needed.' },
      { id: 'm5-2', agentId: 'a4', agentName: 'Dr. Emma Davis', agentInitials: 'ED', agentColor: '#f59e0b', round: 2, timestamp: '05:00', content: 'Batch correction: **scVI** preferred over Harmony\n\n```python\nn_layers: 2\nn_latent: 30\ngene_likelihood: "zinb"\n```\n\nExtra compute time worth the improved cell type resolution.' },
      { id: 'm5-3', agentId: 'a4', agentName: 'Dr. Emma Davis', agentInitials: 'ED', agentColor: '#f59e0b', round: 3, timestamp: '10:00', content: 'Updated Shiny app features: trajectory inference, differential expression, gene program scoring.\n\nTarget: **Nature Communications**, February deadline.' },
    ],
  },
  {
    id: 'm6', type: 'team', title: 'Synthetic Biology — Circuit Design',
    agenda: 'Genetic circuits for bioproduction pathway',
    date: '2025-01-12', duration: '40 min',
    participants: [AGENTS[4], AGENTS[5], AGENTS[7]],
    messages: [
      { id: 'm6-1', agentId: 'a5', agentName: 'Dr. Michael Ross', agentInitials: 'MR', agentColor: '#ef4444', round: 1, timestamp: '00:00', content: '## Circuit Designs\n\n1. **Circuit A**: Constitutive (control) — 2.1 g/L\n2. **Circuit B**: Optogenetic — 3.8 g/L\n3. **Circuit C**: Metabolite feedback — 5.2 g/L\n\nEach integrates 5 heterologous genes from artemisinin pathway.' },
      { id: 'm6-2', agentId: 'a5', agentName: 'Dr. Michael Ross', agentInitials: 'MR', agentColor: '#ef4444', round: 2, timestamp: '04:00', content: 'Circuit C uses FPP-responsive TF to dynamically regulate MEP pathway flux. Predicted 5.2 g/L titer.' },
      { id: 'm6-3', agentId: 'a8', agentName: 'Dr. Alex Turner', agentInitials: 'AT', agentColor: '#a855f7', round: 3, timestamp: '07:00', content: 'Golden Gate assembly: all 5 genes cloned. Promoter library (8 variants/gene). Circuit C at 60% — need FPP sensor module. Colony PCR automation reduces screening time by 70%.' },
      { id: 'm6-4', agentId: 'a6', agentName: 'Dr. James Park', agentInitials: 'JP', agentColor: '#ec4899', round: 4, timestamp: '10:00', content: 'LC-MS validated for artemisinic acid: LOD 0.05 mg/L, linear 0.1-100 mg/L. 96 samples/batch. DoE matrix for fermentation optimization planned.' },
      { id: 'm6-5', agentId: 'a5', agentName: 'Dr. Michael Ross', agentInitials: 'MR', agentColor: '#ef4444', round: 5, timestamp: '13:00', content: '## Timeline\n\n- Wk 1-2: Circuit C assembly\n- Wk 3: Transform, shake-flask\n- Wk 4-5: Fermentation DoE\n- Wk 6: Analysis, optimization\n\nPreliminary titers by mid-February.', isDecision: true },
    ],
  },
]

// ─── Helper: Simple Markdown Renderer ────────────────────────

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let inCodeBlock = false
  let codeLines: string[] = []
  let inList = false

  const flushList = () => {
    if (inList) {
      elements.push(<ul key={`list-${elements.length}`} style={{ paddingLeft: 20, margin: '4px 0' }}>{[]}</ul>)
      inList = false
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${i}`} style={{
            background: 'rgba(13, 13, 26, 0.6)', border: '1px solid var(--dt-border, rgba(51,65,85,0.3))',
            borderRadius: 8, padding: 12, margin: '8px 0', fontSize: 12, lineHeight: 1.6,
            overflowX: 'auto', fontFamily: 'var(--font-mono, monospace)',
          }}>
            {codeLines.join('\n')}
          </pre>
        )
        codeLines = []
        inCodeBlock = false
      } else {
        flushList()
        inCodeBlock = true
      }
      continue
    }

    if (inCodeBlock) {
      codeLines.push(line)
      continue
    }

    if (line.startsWith('### ')) {
      flushList()
      elements.push(<h3 key={i} style={{ fontSize: 15, fontWeight: 600, color: 'var(--vl-text-primary)', margin: '12px 0 4px' }}>{renderInline(line.slice(4))}</h3>)
    } else if (line.startsWith('## ')) {
      flushList()
      elements.push(<h2 key={i} style={{ fontSize: 17, fontWeight: 600, color: 'var(--vl-text-primary)', margin: '14px 0 6px' }}>{renderInline(line.slice(3))}</h2>)
    } else if (line.startsWith('# ')) {
      flushList()
      elements.push(<h1 key={i} style={{ fontSize: 20, fontWeight: 700, color: 'var(--vl-text-primary)', margin: '14px 0 6px' }}>{renderInline(line.slice(2))}</h1>)
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!inList) {
        elements.push(<ul key={`ul-${i}`} style={{ paddingLeft: 20, margin: '4px 0', listStyle: 'disc' }} />)
        inList = true
      }
      elements.push(<li key={`li-${i}`} style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--vl-text-secondary)' }}>{renderInline(line.slice(2))}</li>)
    } else if (line.match(/^\d+\.\s/)) {
      flushList()
      elements.push(
        <div key={`ol-${i}`} style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--vl-text-secondary)', paddingLeft: 20 }}>
          {renderInline(line)}
        </div>
      )
    } else if (line.startsWith('| ')) {
      flushList()
      // Simple table rendering
      if (line.includes('---')) continue
      const cells = line.split('|').filter(c => c.trim())
      elements.push(
        <div key={`tr-${i}`} style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--vl-text-secondary)', padding: '2px 0' }}>
          {cells.map((cell, ci) => (
            <span key={ci} style={{ flex: 1 }}>{renderInline(cell.trim())}</span>
          ))}
        </div>
      )
    } else if (line.trim() === '') {
      flushList()
      elements.push(<div key={`br-${i}`} style={{ height: 6 }} />)
    } else {
      flushList()
      elements.push(<p key={`p-${i}`} style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--vl-text-secondary)', margin: '2px 0' }}>{renderInline(line)}</p>)
    }
  }
  return elements
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  let remaining = text
  let keyIdx = 0
  // Bold **text**
  const boldRe = /\*\*(.+?)\*\*/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = boldRe.exec(remaining)) !== null) {
    if (match.index > lastIndex) parts.push(remaining.slice(lastIndex, match.index))
    parts.push(<strong key={`b-${keyIdx++}`}>{match[1]}</strong>)
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < remaining.length) parts.push(remaining.slice(lastIndex))
  return parts
}

// ─── Simple Diff Algorithm ───────────────────────────────────

function computeDiff(meetingA: Meeting, meetingB: Meeting): DiffResult[] {
  const maxRounds = Math.max(
    ...meetingA.messages.map(m => m.round),
    ...meetingB.messages.map(m => m.round),
  )
  const results: DiffResult[] = []

  for (let r = 1; r <= maxRounds; r++) {
    const msgsA = meetingA.messages.filter(m => m.round === r)
    const msgsB = meetingB.messages.filter(m => m.round === r)
    const textA = msgsA.map(m => m.content).join('\n')
    const textB = msgsB.map(m => m.content).join('\n')

    if (msgsA.length === 0 && msgsB.length > 0) {
      results.push({ round: r, status: 'added', runA: '', runB: textB })
    } else if (msgsA.length > 0 && msgsB.length === 0) {
      results.push({ round: r, status: 'removed', runA: textA, runB: '' })
    } else if (textA === textB) {
      results.push({ round: r, status: 'identical', runA: textA, runB: textB })
    } else {
      results.push({ round: r, status: 'modified', runA: textA, runB: textB })
    }
  }
  return results
}

// ─── Main Component ──────────────────────────────────────────

export default function MeetingReplayPage() {
  const [selectedMeetingId, setSelectedMeetingId] = useState(MEETINGS[0].id)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [activeMsgIdx, setActiveMsgIdx] = useState(-1)
  const [compareMode, setCompareMode] = useState(false)
  const [compareMeetingId, setCompareMeetingId] = useState(MEETINGS[1].id)
  const [autoScroll, setAutoScroll] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedMsg, setSelectedMsg] = useState<Message | null>(null)
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timelineRef = useRef<HTMLDivElement>(null)

  const selectedMeeting = useMemo(() => MEETINGS.find(m => m.id === selectedMeetingId) || MEETINGS[0], [selectedMeetingId])
  const compareMeeting = useMemo(() => MEETINGS.find(m => m.id === compareMeetingId) || MEETINGS[1], [compareMeetingId])

  const diffResults = useMemo(() => {
    if (!compareMode) return []
    return computeDiff(selectedMeeting, compareMeeting)
  }, [compareMode, selectedMeeting, compareMeeting])

  const diffStats = useMemo(() => {
    const identical = diffResults.filter(d => d.status === 'identical').length
    const modified = diffResults.filter(d => d.status === 'modified').length
    const added = diffResults.filter(d => d.status === 'added').length
    const removed = diffResults.filter(d => d.status === 'removed').length
    return { identical, modified, added, removed }
  }, [diffResults])

  // Playback logic
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setActiveMsgIdx(prev => {
          const next = prev + 1
          if (next >= selectedMeeting.messages.length) {
            setIsPlaying(false)
            return prev
          }
          return next
        })
      }, 2000 / playbackSpeed)
    } else {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current)
    }
    return () => { if (playIntervalRef.current) clearInterval(playIntervalRef.current) }
  }, [isPlaying, playbackSpeed, selectedMeeting.messages.length])

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && activeMsgIdx >= 0 && timelineRef.current) {
      const nodes = timelineRef.current.querySelectorAll('[data-msg-idx]')
      const target = nodes[activeMsgIdx] as HTMLElement | undefined
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [activeMsgIdx, autoScroll])

  // Select message when active changes
  useEffect(() => {
    if (activeMsgIdx >= 0) {
      setSelectedMsg(selectedMeeting.messages[activeMsgIdx] || null)
    }
  }, [activeMsgIdx, selectedMeeting.messages])

  const stepForward = useCallback(() => {
    setActiveMsgIdx(prev => Math.min(prev + 1, selectedMeeting.messages.length - 1))
  }, [selectedMeeting.messages.length])

  const stepBack = useCallback(() => {
    setActiveMsgIdx(prev => Math.max(prev - 1, -1))
  }, [])

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    const idx = Math.round(ratio * (selectedMeeting.messages.length - 1))
    setActiveMsgIdx(Math.max(0, Math.min(idx, selectedMeeting.messages.length - 1)))
  }, [selectedMeeting.messages.length])

  const togglePlay = useCallback(() => {
    if (!isPlaying && activeMsgIdx < 0) setActiveMsgIdx(0)
    setIsPlaying(p => !p)
  }, [isPlaying, activeMsgIdx])

  // Analytics data
  const analytics = useMemo(() => {
    const msgs = selectedMeeting.messages
    const roundCounts: Record<number, number> = {}
    msgs.forEach(m => { roundCounts[m.round] = (roundCounts[m.round] || 0) + 1 })
    const maxRoundCount = Math.max(...Object.values(roundCounts), 1)

    const agentMsgCounts: Record<string, number> = {}
    msgs.forEach(m => { agentMsgCounts[m.agentName] = (agentMsgCounts[m.agentName] || 0) + 1 })
    const maxAgentCount = Math.max(...Object.values(agentMsgCounts), 1)

    const agentAvgLen: Record<string, number> = {}
    const agentLenCounts: Record<string, number> = {}
    msgs.forEach(m => {
      agentAvgLen[m.agentName] = (agentAvgLen[m.agentName] || 0) + m.content.length
      agentLenCounts[m.agentName] = (agentLenCounts[m.agentName] || 0) + 1
    })
    const avgLens: Record<string, number> = {}
    Object.keys(agentAvgLen).forEach(k => { avgLens[k] = Math.round(agentAvgLen[k] / agentLenCounts[k]) })

    const topics = ['AlphaFold', 'CRISPR', 'Drug Screening', 'Binding Affinity', 'MD Simulation',
      'Pipeline', 'Validation', 'RNA-seq', 'Nanobody', 'CRISPR-OT'].filter(t =>
        msgs.some(m => m.content.toLowerCase().includes(t.toLowerCase()))
      )

    return { roundCounts, maxRoundCount, agentMsgCounts, maxAgentCount, avgLens, topics }
  }, [selectedMeeting.messages])

  const progressPct = selectedMeeting.messages.length > 0
    ? ((activeMsgIdx + 1) / selectedMeeting.messages.length) * 100
    : 0

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--vl-bg-primary)',
      color: 'var(--vl-text-primary)',
    }}>
      {/* ── Header ── */}
      <header style={{
        padding: '28px 24px 20px',
        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.06) 0%, rgba(139, 92, 246, 0.04) 50%, rgba(16, 185, 129, 0.05) 100%)',
        borderBottom: '1px solid var(--vl-border)',
      }}>
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(6, 182, 212, 0.3)',
              }}>
                <ScrollText size={24} color="#fff" />
              </div>
              <div>
                <h1 style={{
                  fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.5px',
                  background: 'linear-gradient(135deg, var(--vl-text-primary), #06b6d4)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                  Meeting Replay
                </h1>
                <p style={{ fontSize: 13, color: 'var(--vl-text-muted)', margin: '2px 0 0' }}>
                  Interactive timeline with diff comparison across meeting runs
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className={`mr-compare-toggle ${compareMode ? 'mr-compare-active' : ''}`}
                onClick={() => setCompareMode(c => !c)}
              >
                <GitCompare size={14} />
                {compareMode ? 'Comparing...' : 'Compare Mode'}
              </button>
              <button className="mr-export-btn" onClick={() => {
                const blob = new Blob([JSON.stringify(selectedMeeting, null, 2)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url; a.download = `${selectedMeeting.title.replace(/\s+/g, '_')}.json`; a.click()
                URL.revokeObjectURL(url)
              }}>
                <FileJson size={14} /> Download JSON
              </button>
              {compareMode && (
                <button className="mr-export-btn" onClick={() => {
                  const blob = new Blob([JSON.stringify(diffResults, null, 2)], { type: 'application/json' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url; a.download = 'diff_report.json'; a.click()
                  URL.revokeObjectURL(url)
                }}>
                  <Download size={14} /> Export Diff
                </button>
              )}
            </div>
          </div>

          {/* Meeting Selector Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 12, color: 'var(--vl-text-muted)', fontWeight: 600 }}>Meeting:</label>
              <select className="mr-selector" value={selectedMeetingId} onChange={e => {
                setSelectedMeetingId(e.target.value)
                setActiveMsgIdx(-1)
                setIsPlaying(false)
              }}>
                {MEETINGS.map(m => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
            </div>
            <span className={`mr-type-badge mr-type-badge-${selectedMeeting.type}`}>
              {selectedMeeting.type === 'team' ? <Users size={10} /> : <User size={10} />}
              {selectedMeeting.type}
            </span>
            <span style={{ fontSize: 11, color: 'var(--vl-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={11} /> {selectedMeeting.date}
            </span>
            <span style={{ fontSize: 11, color: 'var(--vl-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Users size={11} /> {selectedMeeting.participants.length} participants
            </span>
            <span style={{ fontSize: 11, color: 'var(--vl-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={11} /> {selectedMeeting.duration}
            </span>
            <span style={{ fontSize: 11, color: 'var(--vl-text-muted)' }}>
              {selectedMeeting.messages.length} messages
            </span>
          </div>

          {/* Compare Meeting Selector */}
          {compareMode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
              <GitCompare size={12} style={{ color: '#8b5cf6' }} />
              <label style={{ fontSize: 12, color: '#8b5cf6', fontWeight: 600 }}>Compare with:</label>
              <select className="mr-selector" style={{ maxWidth: 320 }} value={compareMeetingId}
                onChange={e => setCompareMeetingId(e.target.value)}>
                {MEETINGS.filter(m => m.id !== selectedMeetingId).map(m => (
                  <option key={m.id} value={m.id}>{m.title} ({m.date})</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </header>

      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '24px' }}>

        {compareMode ? (
          /* ═══════════════════════════════════════════════════════
             DIFF VIEW
             ═══════════════════════════════════════════════════════ */
          <div>
            {/* Diff Stats Bar */}
            <div className="mr-diff-stats" style={{ marginBottom: 16 }}>
              <span style={{ fontWeight: 600, color: 'var(--vl-text-primary)', fontSize: 13 }}>Diff Summary</span>
              <div className="mr-diff-stat-item mr-diff-stat-identical">
                <span className="mr-diff-stat-value">{diffStats.identical}</span> identical rounds
              </div>
              <div className="mr-diff-stat-item mr-diff-stat-modified">
                <span className="mr-diff-stat-value">{diffStats.modified}</span> modified
              </div>
              <div className="mr-diff-stat-item mr-diff-stat-added">
                <span className="mr-diff-stat-value">{diffStats.added}</span> new in Run B
              </div>
              <div className="mr-diff-stat-item mr-diff-stat-removed">
                <span className="mr-diff-stat-value">{diffStats.removed}</span> only in Run A
              </div>
            </div>

            {/* Side-by-Side Diff */}
            <div className="mr-diff-container">
              <div className="mr-diff-panel">
                <div className="mr-diff-panel-header">
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: '#06b6d4' }} />
                  Run A: {selectedMeeting.title}
                  <span style={{ fontSize: 10, color: 'var(--vl-text-muted)', marginLeft: 'auto' }}>{selectedMeeting.date}</span>
                </div>
                {diffResults.map((d, i) => (
                  <div key={i} style={{
                    padding: '10px 14px', fontSize: 13, lineHeight: 1.6,
                    borderBottom: '1px solid var(--dt-border, rgba(51,65,85,0.1))',
                    background: d.status === 'removed' ? 'rgba(239,68,68,0.08)' : d.status === 'identical' ? 'transparent' : 'transparent',
                    borderLeft: d.status === 'modified' ? '3px solid #f59e0b' : d.status === 'removed' ? '3px solid #ef4444' : '3px solid transparent',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span className="mr-round-badge">R{d.round}</span>
                      {d.status === 'identical' && <span style={{ fontSize: 10, color: '#64748b' }}>● Identical</span>}
                      {d.status === 'modified' && <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600 }}>● Modified</span>}
                      {d.status === 'removed' && <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 600 }}>● Removed</span>}
                    </div>
                    {d.runA ? (
                      <div style={{ color: d.status === 'removed' ? '#f87171' : 'var(--vl-text-secondary)', textDecoration: d.status === 'removed' ? 'line-through' : 'none', opacity: d.status === 'removed' ? 0.6 : 1 }}>
                        {d.runA.slice(0, 200)}{d.runA.length > 200 ? '...' : ''}
                      </div>
                    ) : (
                      <div style={{ color: 'var(--vl-text-muted)', fontStyle: 'italic' }}>No messages in this round</div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mr-diff-panel">
                <div className="mr-diff-panel-header">
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: '#8b5cf6' }} />
                  Run B: {compareMeeting.title}
                  <span style={{ fontSize: 10, color: 'var(--vl-text-muted)', marginLeft: 'auto' }}>{compareMeeting.date}</span>
                </div>
                {diffResults.map((d, i) => (
                  <div key={i} style={{
                    padding: '10px 14px', fontSize: 13, lineHeight: 1.6,
                    borderBottom: '1px solid var(--dt-border, rgba(51,65,85,0.1))',
                    background: d.status === 'added' ? 'rgba(16,185,129,0.08)' : d.status === 'identical' ? 'transparent' : 'transparent',
                    borderLeft: d.status === 'modified' ? '3px solid #f59e0b' : d.status === 'added' ? '3px solid #10b981' : '3px solid transparent',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span className="mr-round-badge">R{d.round}</span>
                      {d.status === 'identical' && <span style={{ fontSize: 10, color: '#64748b' }}>● Identical</span>}
                      {d.status === 'modified' && <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600 }}>● Modified</span>}
                      {d.status === 'added' && <span style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>● New</span>}
                    </div>
                    {d.runB ? (
                      <div style={{ color: d.status === 'added' ? '#34d399' : 'var(--vl-text-secondary)' }}>
                        {d.runB.slice(0, 200)}{d.runB.length > 200 ? '...' : ''}
                      </div>
                    ) : (
                      <div style={{ color: 'var(--vl-text-muted)', fontStyle: 'italic' }}>No messages in this round</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ═══════════════════════════════════════════════════════
             NORMAL REPLAY VIEW
             ═══════════════════════════════════════════════════════ */
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            {/* Main content area */}
            <div style={{ flex: 1, minWidth: 0 }}>

              {/* Playback Controls */}
              <div className="mr-controls-bar" style={{ marginBottom: 20 }}>
                <button className="mr-ctrl-btn" onClick={stepBack} title="Step back">
                  <SkipBack size={16} />
                </button>
                <button className={`mr-ctrl-btn mr-ctrl-btn-play ${isPlaying ? 'mr-playing' : ''}`}
                  onClick={togglePlay} title={isPlaying ? 'Pause' : 'Play'}>
                  {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: 2 }} />}
                </button>
                <button className="mr-ctrl-btn" onClick={stepForward} title="Step forward">
                  <SkipForward size={16} />
                </button>
                <select className="mr-speed-selector" value={playbackSpeed} onChange={e => setPlaybackSpeed(Number(e.target.value))}>
                  <option value={0.5}>0.5x</option>
                  <option value={1}>1x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2}>2x</option>
                </select>
                <div className="mr-progress-bar" onClick={handleProgressClick}>
                  <div className="mr-progress-fill" style={{ width: `${progressPct}%` }} />
                </div>
                <span className="mr-time-display">
                  {activeMsgIdx >= 0 ? selectedMeeting.messages[activeMsgIdx]?.timestamp || '00:00' : '--:--'}
                  {' / '}
                  {selectedMeeting.messages.length > 0 ? selectedMeeting.messages[selectedMeeting.messages.length - 1].timestamp : '00:00'}
                </span>
                <button
                  className={`mr-toggle-auto-scroll ${autoScroll ? 'mr-scroll-active' : ''}`}
                  onClick={() => setAutoScroll(v => !v)}
                  title="Auto-scroll"
                >
                  <ChevronDown size={12} style={{ transform: autoScroll ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  Auto-scroll
                </button>
              </div>

              {/* Agenda */}
              <div className="mr-card" style={{ marginBottom: 16, padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Zap size={14} style={{ color: '#f59e0b' }} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Agenda:</span>
                  <span style={{ fontSize: 13, color: 'var(--vl-text-secondary)' }}>{selectedMeeting.agenda}</span>
                </div>
              </div>

              {/* Message Timeline */}
              <div ref={timelineRef} className="mr-timeline" style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: 8 }}>
                {selectedMeeting.messages.map((msg, idx) => {
                  const isActive = idx === activeMsgIdx
                  const isPlayed = idx < activeMsgIdx
                  const isFuture = idx > activeMsgIdx

                  return (
                    <div
                      key={msg.id}
                      data-msg-idx={idx}
                      className={`mr-timeline-node ${isActive ? 'mr-active' : ''} ${isPlayed ? 'mr-played' : ''}`}
                      style={{ animationDelay: `${idx * 0.05}s` }}
                      onClick={() => { setActiveMsgIdx(idx); setSelectedMsg(msg) }}
                    >
                      <div className="mr-timeline-dot" />
                      <div className={`mr-message-card ${isActive ? 'mr-active' : ''} ${isFuture ? 'mr-future' : ''} ${msg.isDecision ? 'mr-decision-point' : ''}`}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <div className="mr-avatar" style={{ background: msg.agentColor }}>
                            {msg.agentInitials}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--vl-text-primary)' }}>{msg.agentName}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 10, color: 'var(--vl-text-muted)' }}>{msg.timestamp}</span>
                              <span className="mr-round-badge">R{msg.round}</span>
                              {msg.isDecision && (
                                <span style={{
                                  fontSize: 10, fontWeight: 600, color: '#f59e0b',
                                  display: 'flex', alignItems: 'center', gap: 2,
                                }}>
                                  <Award size={10} /> Decision
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div style={{
                          fontSize: 12, color: isFuture ? 'var(--vl-text-muted)' : 'var(--vl-text-secondary)',
                          lineHeight: 1.5,
                          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {msg.content.replace(/[#*`|]/g, '').slice(0, 150)}...
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Sidebar ── */}
            <div style={{ width: 340, flexShrink: 0 }}>
              {/* Sidebar toggle */}
              <button onClick={() => setSidebarOpen(v => !v)} style={{
                display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12,
                padding: '6px 12px', borderRadius: 8, border: 'none', background: 'var(--vl-bg-secondary)',
                color: 'var(--vl-text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                width: '100%', justifyContent: 'center',
              }}>
                <BarChart3 size={14} />
                {sidebarOpen ? 'Collapse Analytics' : 'Show Analytics'}
                {sidebarOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>

              {sidebarOpen && (
                <div className="mr-analytics-sidebar">
                  {/* Messages per Round */}
                  <div className="mr-analytics-section">
                    <div className="mr-analytics-label">Messages per Round</div>
                    {Object.entries(analytics.roundCounts).map(([round, count]) => (
                      <div key={round} className="mr-bar-mini">
                        <span className="mr-bar-mini-label">Round {round}</span>
                        <div className="mr-bar-mini-track">
                          <div className="mr-bar-mini-fill" style={{
                            width: `${(count / analytics.maxRoundCount) * 100}%`,
                            background: 'linear-gradient(90deg, #06b6d4, #10b981)',
                          }} />
                        </div>
                        <span className="mr-bar-mini-value">{count}</span>
                      </div>
                    ))}
                  </div>

                  {/* Participation */}
                  <div className="mr-analytics-section">
                    <div className="mr-analytics-label">Participation</div>
                    {Object.entries(analytics.agentMsgCounts).map(([name, count]) => {
                      const agent = selectedMeeting.participants.find(p => p.name === name)
                      return (
                        <div key={name} className="mr-bar-mini">
                          <span className="mr-bar-mini-label">{name.split(' ').pop()}</span>
                          <div className="mr-bar-mini-track">
                            <div className="mr-bar-mini-fill" style={{
                              width: `${(count / analytics.maxAgentCount) * 100}%`,
                              background: agent?.color || '#10b981',
                            }} />
                          </div>
                          <span className="mr-bar-mini-value">{count}</span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Avg Message Length */}
                  <div className="mr-analytics-section">
                    <div className="mr-analytics-label">Avg Message Length</div>
                    {Object.entries(analytics.avgLens).map(([name, len]) => {
                      const agent = selectedMeeting.participants.find(p => p.name === name)
                      return (
                        <div key={name} className="mr-bar-mini">
                          <span className="mr-bar-mini-label">{name.split(' ').pop()}</span>
                          <div className="mr-bar-mini-track">
                            <div className="mr-bar-mini-fill" style={{
                              width: `${Math.min((len / 800) * 100, 100)}%`,
                              background: agent?.color || '#f59e0b',
                            }} />
                          </div>
                          <span className="mr-bar-mini-value">{len}</span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Topics */}
                  <div className="mr-analytics-section">
                    <div className="mr-analytics-label">Key Topics</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {analytics.topics.map(t => (
                        <span key={t} className="mr-tag">{t}</span>
                      ))}
                    </div>
                  </div>

                  {/* Message Detail Panel */}
                  {selectedMsg && (
                    <div className="mr-analytics-section" style={{ borderBottom: 'none' }}>
                      <div className="mr-analytics-label">Message Detail</div>
                      <div className="mr-agent-info-card" style={{ marginBottom: 10 }}>
                        <div className="mr-avatar" style={{ background: selectedMsg.agentColor }}>
                          {selectedMsg.agentInitials}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{selectedMsg.agentName}</div>
                          <div style={{ fontSize: 11, color: 'var(--vl-text-muted)' }}>
                            {selectedMeeting.participants.find(p => p.id === selectedMsg.agentId)?.role || ''}
                          </div>
                        </div>
                      </div>
                      <div className="mr-detail-content" style={{ maxHeight: 300, overflowY: 'auto' }}>
                        {renderMarkdown(selectedMsg.content)}
                      </div>
                      <div style={{ marginTop: 8, display: 'flex', gap: 12, fontSize: 11, color: 'var(--vl-text-muted)' }}>
                        <span>{selectedMsg.content.split(/\s+/).length} words</span>
                        <span>~{Math.max(1, Math.round(selectedMsg.content.split(/\s+/).length / 200))} min read</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
