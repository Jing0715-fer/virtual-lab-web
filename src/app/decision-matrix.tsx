'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Trash2, Crown, Copy, Download, Star, FileText, LayoutTemplate,
  Weight, BarChart3, ChevronRight
} from 'lucide-react'
import { toast } from 'sonner'

/* ---------- Types ---------- */
interface Criterion {
  id: string
  name: string
  weight: number // 0-100
}

interface Option {
  id: string
  name: string
  scores: Record<string, number> // criterion id -> score 1-10
}

interface MatrixData {
  options: Option[]
  criteria: Criterion[]
  lastModified: number
}

type MatrixTemplate = 'research' | 'agent' | 'tool' | 'blank'

const STORAGE_KEY = 'vl-decision-matrix'

let idCounter = 0
const genId = () => `dm-${Date.now()}-${++idCounter}`

/* ---------- Templates ---------- */
const TEMPLATES: Record<string, { name: string; options: string[]; criteria: string[]; weights: number[] }> = {
  research: {
    name: 'Research Method Selection',
    options: ['Literature Review', 'Computational Modeling', 'Wet Lab Experiments', 'Clinical Trial', 'Meta-Analysis'],
    criteria: ['Cost', 'Time', 'Accuracy', 'Reproducibility', 'Scalability', 'Innovation'],
    weights: [20, 15, 25, 15, 15, 10],
  },
  agent: {
    name: 'Agent Assignment',
    options: ['Alice', 'Bob', 'Carol', 'Dave', 'Eve'],
    criteria: ['Expertise Match', 'Availability', 'Communication', 'Task Complexity', 'Prior Success', 'Team Fit'],
    weights: [25, 10, 15, 20, 15, 15],
  },
  tool: {
    name: 'Tool Evaluation',
    options: ['AlphaFold', 'Rosetta', 'ESM-2', 'UniFold', 'OpenFold'],
    criteria: ['Accuracy', 'Speed', 'Memory Usage', 'Documentation', 'Community', 'License'],
    weights: [30, 20, 10, 10, 15, 15],
  },
}

/* ---------- Helpers ---------- */
const loadMatrix = (): MatrixData | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const saveMatrix = (data: MatrixData) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch { /* quota */ }
}

const getScoreClass = (score: number): string => {
  if (score >= 7) return 'score-high'
  if (score >= 4) return 'score-mid'
  return 'score-low'
}

const getWeightedScore = (option: Option, criteria: Criterion[]): number => {
  let total = 0
  let weightSum = 0
  criteria.forEach((c) => {
    const s = option.scores[c.id] || 5
    total += s * c.weight
    weightSum += c.weight
  })
  return weightSum > 0 ? total / weightSum : 0
}

/* ---------- Component ---------- */
export function DecisionMatrix() {
  const [options, setOptions] = useState<Option[]>([])
  const [criteria, setCriteria] = useState<Criterion[]>([])
  const [lastModified, setLastModified] = useState(0)
  const [showTemplates, setShowTemplates] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<MatrixTemplate>('blank')
  const [scoringMode, setScoringMode] = useState<'number' | 'star'>('number')

  /* Init */
  useEffect(() => {
    const saved = loadMatrix()
    if (saved && saved.options.length > 0 && saved.criteria.length > 0) {
      setOptions(saved.options)
      setCriteria(saved.criteria)
      setLastModified(saved.lastModified)
    } else {
      /* Load research template by default */
      loadTemplate('research')
    }
  }, [])

  /* Persist */
  useEffect(() => {
    if (options.length > 0 && criteria.length > 0) {
      saveMatrix({ options, criteria, lastModified: Date.now() })
      setLastModified(Date.now())
    }
  }, [options, criteria])

  /* Load template */
  const loadTemplate = useCallback((templateId: MatrixTemplate) => {
    if (templateId === 'blank') {
      setOptions([{ id: genId(), name: 'Option A', scores: {} }])
      setCriteria([{ id: genId(), name: 'Criterion 1', weight: 50 }])
      toast('Blank matrix created')
      return
    }
    const tpl = TEMPLATES[templateId]
    if (!tpl) return

    const newCriteria: Criterion[] = tpl.criteria.map((name, i) => ({
      id: genId(), name, weight: tpl.weights[i] || 10,
    }))
    const newOptions: Option[] = tpl.options.map((name) => ({
      id: genId(), name,
      scores: Object.fromEntries(newCriteria.map((c) => [c.id, 5])),
    }))

    setCriteria(newCriteria)
    setOptions(newOptions)
    setShowTemplates(false)
    toast(`Loaded "${tpl.name}" template`)
  }, [])

  /* Add option */
  const addOption = useCallback(() => {
    const scores: Record<string, number> = {}
    criteria.forEach((c) => { scores[c.id] = 5 })
    setOptions((prev) => [...prev, { id: genId(), name: `Option ${prev.length + 1}`, scores }])
    toast('Option added')
  }, [criteria])

  /* Delete option */
  const deleteOption = useCallback((id: string) => {
    setOptions((prev) => prev.filter((o) => o.id !== id))
    toast('Option removed')
  }, [])

  /* Update option name */
  const updateOptionName = useCallback((id: string, name: string) => {
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, name } : o)))
  }, [])

  /* Add criterion */
  const addCriterion = useCallback(() => {
    setCriteria((prev) => [...prev, { id: genId(), name: `Criterion ${prev.length + 1}`, weight: 10 }])
    setOptions((prev) =>
      prev.map((o) => ({ ...o, scores: { ...o.scores, [genId()]: 5 } }))
    )
    toast('Criterion added')
  }, [])

  /* Delete criterion */
  const deleteCriterion = useCallback((id: string) => {
    setCriteria((prev) => prev.filter((c) => c.id !== id))
    setOptions((prev) => {
      const newOpts = prev.map((o) => {
        const { [id]: _, ...rest } = o.scores
        return { ...o, scores: rest }
      })
      return newOpts
    })
    toast('Criterion removed')
  }, [])

  /* Update criterion */
  const updateCriterion = useCallback((id: string, updates: Partial<Criterion>) => {
    setCriteria((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)))
  }, [])

  /* Update score */
  const updateScore = useCallback((optionId: string, criterionId: string, score: number) => {
    setOptions((prev) =>
      prev.map((o) =>
        o.id === optionId
          ? { ...o, scores: { ...o.scores, [criterionId]: Math.max(1, Math.min(10, score)) } }
          : o
      )
    )
  }, [])

  /* Calculated results */
  const results = useMemo(() => {
    return options
      .map((opt) => ({
        ...opt,
        weightedScore: getWeightedScore(opt, criteria),
        detailed: criteria.map((c) => ({
          criterionId: c.id,
          criterionName: c.name,
          weight: c.weight,
          rawScore: opt.scores[c.id] || 5,
          weighted: ((opt.scores[c.id] || 5) * c.weight) / (criteria.reduce((s, cr) => s + cr.weight, 0) || 1),
        })),
      }))
      .sort((a, b) => b.weightedScore - a.weightedScore)
  }, [options, criteria])

  const maxScore = results.length > 0 ? results[0]?.weightedScore || 0 : 0
  const winnerId = results.length > 0 ? results[0]?.id : null

  /* Export as Markdown */
  const exportMarkdown = useCallback(() => {
    const totalWeight = criteria.reduce((s, c) => s + c.weight, 0)
    let md = `# Decision Matrix\n\n`
    md += `| Option | ${criteria.map((c) => `${c.name} (${Math.round(c.weight / totalWeight * 100)}%)`).join(' | ')} | **Total** |\n`
    md += `|--------| ${criteria.map(() => '---').join(' | ')} |------|\n`
    results.forEach((r) => {
      const scores = criteria.map((c) => String(r.scores[c.id] || 5)).join(' | ')
      md += `| ${r.name} | ${scores} | **${r.weightedScore.toFixed(1)}** |\n`
    })

    navigator.clipboard.writeText(md).then(() => {
      toast('Markdown copied to clipboard!')
    }).catch(() => {
      toast.error('Failed to copy')
    })
  }, [results, criteria])

  /* Export as JSON */
  const exportJSON = useCallback(() => {
    const data = JSON.stringify({ options, criteria, results }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'decision-matrix.json'
    a.click()
    URL.revokeObjectURL(url)
    toast('JSON exported')
  }, [options, criteria, results])

  /* Star rendering */
  const renderStars = (optionId: string, criterionId: string, currentScore: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const fillScore = (star - 1) * 2 + 2
          return (
            <button
              key={star}
              onClick={() => updateScore(optionId, criterionId, fillScore)}
              className="transition-colors"
              aria-label={`Rate ${star} stars`}
            >
              <Star
                size={14}
                className={`transition-colors ${
                  currentScore >= fillScore - 1
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-[var(--vl-border)]'
                }`}
              />
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setShowTemplates((s) => !s)}
          className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg border border-[var(--vl-border)] bg-[var(--vl-bg-card)] text-[var(--vl-text-secondary)] hover:border-[var(--vl-accent)] hover:text-[var(--vl-accent)] transition-colors"
        >
          <LayoutTemplate size={14} /> Templates
        </button>

        <button
          onClick={addOption}
          className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg border border-[var(--vl-border)] bg-[var(--vl-bg-card)] text-[var(--vl-text-secondary)] hover:border-[var(--vl-accent)] hover:text-[var(--vl-accent)] transition-colors"
        >
          <Plus size={14} /> Add Option
        </button>

        <button
          onClick={addCriterion}
          className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg border border-[var(--vl-border)] bg-[var(--vl-bg-card)] text-[var(--vl-text-secondary)] hover:border-[var(--vl-accent)] hover:text-[var(--vl-accent)] transition-colors"
        >
          <Plus size={14} /> Add Criterion
        </button>

        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--vl-border)] bg-[var(--vl-bg-card)]">
          <span className="text-xs text-[var(--vl-text-muted)]">Score:</span>
          <button
            onClick={() => setScoringMode('number')}
            className={`px-2 py-0.5 rounded text-xs transition-colors ${scoringMode === 'number' ? 'bg-[var(--vl-accent-bg)] text-[var(--vl-accent)]' : 'text-[var(--vl-text-muted)]'}`}
          >
            1-10
          </button>
          <button
            onClick={() => setScoringMode('star')}
            className={`px-2 py-0.5 rounded text-xs transition-colors ${scoringMode === 'star' ? 'bg-[var(--vl-accent-bg)] text-[var(--vl-accent)]' : 'text-[var(--vl-text-muted)]'}`}
          >
            Stars
          </button>
        </div>

        <div className="ml-auto flex gap-2">
          <button
            onClick={exportMarkdown}
            className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg border border-[var(--vl-border)] bg-[var(--vl-bg-card)] text-[var(--vl-text-secondary)] hover:border-[var(--vl-accent)] hover:text-[var(--vl-accent)] transition-colors"
          >
            <Copy size={14} /> Copy MD
          </button>
          <button
            onClick={exportJSON}
            className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg border border-[var(--vl-border)] bg-[var(--vl-bg-card)] text-[var(--vl-text-secondary)] hover:border-[var(--vl-accent)] hover:text-[var(--vl-accent)] transition-colors"
          >
            <Download size={14} /> JSON
          </button>
        </div>
      </div>

      {/* Template Picker */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-xl border border-[var(--vl-border)] bg-[var(--vl-bg-secondary)]">
              <button
                onClick={() => loadTemplate('blank')}
                className="p-4 rounded-lg border border-[var(--vl-border)] bg-[var(--vl-bg-card)] hover:border-[var(--vl-accent)] transition-colors text-left"
              >
                <FileText size={20} className="text-[var(--vl-text-muted)] mb-2" />
                <div className="text-sm font-medium text-[var(--vl-text-heading)]">Blank Matrix</div>
                <div className="text-xs text-[var(--vl-text-muted)] mt-1">Start from scratch</div>
              </button>
              {Object.entries(TEMPLATES).map(([key, tpl]) => (
                <button
                  key={key}
                  onClick={() => loadTemplate(key as MatrixTemplate)}
                  className="p-4 rounded-lg border border-[var(--vl-border)] bg-[var(--vl-bg-card)] hover:border-[var(--vl-accent)] transition-colors text-left"
                >
                  <LayoutTemplate size={20} className="text-[var(--vl-text-muted)] mb-2" />
                  <div className="text-sm font-medium text-[var(--vl-text-heading)]">{tpl.name}</div>
                  <div className="text-xs text-[var(--vl-text-muted)] mt-1">
                    {tpl.options.length} options × {tpl.criteria.length} criteria
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Matrix Table */}
      <div className="decision-matrix-wrapper">
        <table className="decision-matrix-table">
          <thead>
            <tr>
              <th style={{ minWidth: 140 }}>Option</th>
              {criteria.map((c) => (
                <th key={c.id} style={{ minWidth: 100 }}>
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1">
                      <span className="truncate max-w-[80px]">{c.name}</span>
                      <button
                        onClick={() => deleteCriterion(c.id)}
                        className="text-[var(--vl-text-muted)] hover:text-red-500 transition-colors"
                        aria-label={`Delete ${c.name}`}
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                    <div className="w-full">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={c.weight}
                        onChange={(e) => updateCriterion(c.id, { weight: Number(e.target.value) })}
                        className="w-16"
                        aria-label={`Weight for ${c.name}`}
                        style={{ accentColor: 'var(--vl-accent)' }}
                      />
                    </div>
                    <span className="weight-badge">
                      <Weight size={9} className="inline" /> {c.weight}
                    </span>
                    <input
                      type="text"
                      value={c.name}
                      onChange={(e) => updateCriterion(c.id, { name: e.target.value })}
                      className="w-full text-center text-[10px] bg-transparent border-b border-[var(--vl-border-subtle)] outline-none focus:border-[var(--vl-accent)] text-[var(--vl-text-primary)]"
                    />
                  </div>
                </th>
              ))}
              <th style={{ minWidth: 100 }}>
                <BarChart3 size={14} className="inline mb-1" />
                <br />
                <span className="text-[10px] font-normal text-[var(--vl-text-muted)]">Weighted Score</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {results.map((row) => {
              const isWinner = row.id === winnerId
              return (
                <motion.tr
                  key={row.id}
                  className={isWinner ? 'winner-row' : ''}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <td>
                    <div className="flex items-center gap-2">
                      {isWinner && <Crown size={16} className="text-amber-500" />}
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => updateOptionName(row.id, e.target.value)}
                        className={`font-semibold bg-transparent outline-none border-b border-transparent focus:border-[var(--vl-accent)] transition-colors ${
                          isWinner ? 'text-[var(--vl-accent)]' : 'text-[var(--vl-text-heading)]'
                        }`}
                      />
                      <button
                        onClick={() => deleteOption(row.id)}
                        className="text-[var(--vl-text-muted)] hover:text-red-500 transition-colors ml-auto"
                        aria-label={`Delete ${row.name}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                  {criteria.map((c) => {
                    const score = row.scores[c.id] || 5
                    return (
                      <td key={c.id}>
                        {scoringMode === 'star' ? (
                          <div className="flex justify-center">
                            {renderStars(row.id, c.id, score)}
                          </div>
                        ) : (
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={score}
                            onChange={(e) => updateScore(row.id, c.id, Number(e.target.value))}
                            className={`score-cell ${getScoreClass(score)} w-12 text-center text-sm font-semibold bg-transparent outline-none border-none cursor-pointer`}
                          />
                        )}
                      </td>
                    )
                  })}
                  <td>
                    <div className={`font-bold text-sm ${isWinner ? 'text-[var(--vl-accent)]' : 'text-[var(--vl-text-heading)]'}`}>
                      {row.weightedScore.toFixed(1)}
                    </div>
                    <div className="score-bar-wrapper">
                      <div
                        className="score-bar-fill"
                        style={{
                          width: maxScore > 0 ? `${(row.weightedScore / maxScore) * 100}%` : '0%',
                        }}
                      />
                    </div>
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Rankings Summary */}
      <div className="flex flex-wrap gap-3 mt-2">
        {results.map((row, idx) => (
          <motion.div
            key={row.id}
            className="flex items-center gap-3 px-4 py-2 rounded-lg border border-[var(--vl-border)] bg-[var(--vl-bg-card)]"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <span className={`text-lg font-bold ${idx === 0 ? 'text-amber-500' : 'text-[var(--vl-text-muted)]'}`}>
              #{idx + 1}
            </span>
            <span className="text-sm font-medium text-[var(--vl-text-heading)]">{row.name}</span>
            <ChevronRight size={14} className="text-[var(--vl-text-muted)]" />
            <span className="text-sm font-bold text-[var(--vl-accent)]">{row.weightedScore.toFixed(1)}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
