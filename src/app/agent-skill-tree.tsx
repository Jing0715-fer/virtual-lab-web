'use client'

/**
 * Agent Skill Tree — Interactive SVG-based skill tree visualization
 *
 * Features:
 * 1. SVG tree/graph with root → category → skill nodes
 * 2. Skill nodes with level indicators (0-5), color intensity by level
 * 3. Locked/unlocked/active states with animations
 * 4. 6 Skill Categories × 4-6 skills = 32 total skills
 * 5. Agent selector tabs
 * 6. Zoom/pan with mouse wheel and drag
 * 7. Tooltip on hover with skill details
 * 8. localStorage persistence (key: vl-agent-skills)
 * 9. XP awarding via API
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  BookOpen, BarChart3, MessageSquare, Crown, Cpu, Microscope,
  Lock, Star, ZoomIn, ZoomOut, Maximize, Info, Award, Sparkles,
  ChevronRight, RotateCcw, Plus,
} from 'lucide-react'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { Agent } from './shared-types'

// ============================================================
// Types
// ============================================================

interface SkillDef {
  id: string
  name: string
  description: string
  unlockRequirement: number
}

interface SkillCategory {
  id: string
  name: string
  icon: string
  color: string
  skills: SkillDef[]
}

interface AgentSkillXP {
  skillId: string
  xp: number
  level: number
  unlocked: boolean
}

interface AgentSkillData {
  agentId: string
  totalXP: number
  agentLevel: number
  rankTitle: string
  skills: Record<string, AgentSkillXP>
  achievements: Record<string, { earned: boolean; earnedAt: string | null }>
  xpHistory: { date: string; xp: number }[]
  milestones: { level: number; date: string; label: string }[]
  previousRank: number
}

interface TreeNodePosition {
  x: number
  y: number
  categoryId?: string
  skillId?: string
  label: string
  type: 'root' | 'category' | 'skill'
  color: string
  level: number
  xp: number
  unlocked: boolean
  description: string
  parentIndex?: number
  unlockReq?: number
}

interface AgentSkillTreeProps {
  agents: Agent[]
  lang: Lang
}

// ============================================================
// Constants
// ============================================================

const LEVEL_COLORS = [
  '#4b5563', // 0: gray
  '#b45309', // 1: bronze
  '#6b7280', // 2: silver
  '#eab308', // 3: gold
  '#10b981', // 4: emerald
  '#8b5cf6', // 5: diamond
]

const LEVEL_LABELS = ['None', 'Novice', 'Adept', 'Expert', 'Master', 'Legend']

const STORAGE_KEY = 'vl-agent-skills'

const ICON_MAP: Record<string, React.ElementType> = {
  BookOpen, BarChart3, MessageSquare, Crown, Cpu, Microscope,
}

const CATEGORY_ANGLES = [-90, -30, 30, 90, 150, 210] // degrees for 6 categories

// ============================================================
// Helpers
// ============================================================

function computeSkillLevel(xp: number): number {
  if (xp >= 800) return 5
  if (xp >= 550) return 4
  if (xp >= 350) return 3
  if (xp >= 150) return 2
  if (xp >= 30) return 1
  return 0
}

function xpForCurrentLevel(totalXP: number, agentLevel: number): number {
  let total = 0
  for (let l = 1; l < agentLevel; l++) {
    total += Math.floor(100 * l + 50 * Math.pow(l - 1, 1.3))
  }
  return total
}

function xpForNextLevel(agentLevel: number): number {
  let total = 0
  for (let l = 1; l <= agentLevel; l++) {
    total += Math.floor(100 * l + 50 * Math.pow(l - 1, 1.3))
  }
  return total
}

// ============================================================
// Section: Level Stars (SVG dots around a node)
// ============================================================

function LevelStars({ cx, cy, level, maxLevel = 5 }: { cx: number; cy: number; level: number; maxLevel?: number }) {
  const starRadius = 22
  const dotSize = 2.5
  const points: { x: number; y: number; active: boolean }[] = []

  for (let i = 0; i < maxLevel; i++) {
    const angle = (i / maxLevel) * 2 * Math.PI - Math.PI / 2
    const px = cx + starRadius * Math.cos(angle)
    const py = cy + starRadius * Math.sin(angle)
    points.push({ x: px, y: py, active: i < level })
  }

  return (
    <>
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={dotSize}
          fill={p.active ? LEVEL_COLORS[level] : 'var(--vl-border)'}
          opacity={p.active ? 1 : 0.4}
        />
      ))}
    </>
  )
}

// ============================================================
// Section: Skill Tooltip
// ============================================================

function SkillTooltip({
  node,
  visible,
  mouseX,
  mouseY,
  lang,
}: {
  node: TreeNodePosition | null
  visible: boolean
  mouseX: number
  mouseY: number
  lang: Lang
}) {
  if (!node || !visible) return null

  const levelColor = LEVEL_COLORS[node.level] || '#6b7280'

  return (
    <div
      className="skill-tooltip visible"
      style={{
        left: Math.min(mouseX + 12, (typeof window !== 'undefined' ? window.innerWidth : 800) - 300),
        top: mouseY - 10,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: node.color }}
        />
        <span style={{ color: 'var(--vl-text-heading)', fontWeight: 700, fontSize: 13 }}>
          {node.label}
        </span>
      </div>
      <p style={{ color: 'var(--vl-text-muted)', fontSize: 11, marginBottom: 8, lineHeight: 1.4 }}>
        {node.description}
      </p>
      <div className="flex items-center gap-2 mb-1">
        <span style={{ fontSize: 10, color: 'var(--vl-text-muted)' }}>
          {lang === 'zh' ? '等级' : 'Level'}
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: levelColor }}>
          {LEVEL_LABELS[node.level]} ({node.level}/5)
        </span>
      </div>
      {node.type === 'skill' && (
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 10, color: 'var(--vl-text-muted)' }}>XP</span>
          <div className="xp-progress-bar" style={{ height: 6, width: 80 }}>
            <div
              className="xp-progress-bar-fill"
              style={{ width: `${node.xp / 10}%`, background: levelColor }}
            />
          </div>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--vl-text-heading)' }}>
            {node.xp}/1000
          </span>
        </div>
      )}
      {!node.unlocked && node.type === 'skill' && (
        <p style={{ fontSize: 9, color: '#ef4444', marginTop: 6, fontStyle: 'italic' }}>
          <Lock style={{ width: 10, height: 10, display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
          Requires {node.unlockReq || 0}+ category level
        </p>
      )}
    </div>
  )
}

// ============================================================
// Section: Award XP Dialog
// ============================================================

function AwardXPDialog({
  nodeId,
  nodeName,
  lang,
  onAward,
  onClose,
}: {
  nodeId: string | null
  nodeName: string
  lang: Lang
  onAward: (skillId: string, amount: number) => void
  onClose: () => void
}) {
  const [xpAmount, setXpAmount] = useState(10)

  if (!nodeId) return null

  const presetAmounts = [10, 25, 50, 100, 250]

  return (
    <div
      style={{
        position: 'absolute', bottom: 16, left: 16, zIndex: 50,
        background: 'var(--vl-bg-card)',
        border: '1px solid var(--vl-border)',
        borderRadius: 'var(--vl-radius-xl)',
        padding: 16,
        minWidth: 220,
        boxShadow: 'var(--vl-shadow)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--vl-text-heading)' }}>
          <Plus style={{ width: 12, height: 12, display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
          Award XP: {nodeName}
        </span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--vl-text-muted)', fontSize: 14 }}
        >
          ×
        </button>
      </div>
      <div className="flex gap-2 mb-3">
        {presetAmounts.map(amt => (
          <button
            key={amt}
            onClick={() => setXpAmount(amt)}
            style={{
              padding: '4px 10px', borderRadius: 'var(--vl-radius-md)',
              fontSize: 11, fontWeight: 600, cursor: 'pointer', border: '1px solid',
              borderColor: xpAmount === amt ? 'var(--vl-accent)' : 'var(--vl-border-subtle)',
              background: xpAmount === amt ? 'var(--vl-accent-bg)' : 'var(--vl-bg-inner)',
              color: xpAmount === amt ? 'var(--vl-accent)' : 'var(--vl-text-muted)',
              transition: 'all 0.15s ease',
            }}
          >
            +{amt}
          </button>
        ))}
      </div>
      <button
        onClick={() => { onAward(nodeId, xpAmount); onClose() }}
        style={{
          width: '100%', padding: '6px 0', borderRadius: 'var(--vl-radius-md)',
          background: 'var(--vl-accent)', color: 'white', fontSize: 12,
          fontWeight: 600, border: 'none', cursor: 'pointer',
        }}
      >
        {lang === 'zh' ? '授予' : 'Award'} +{xpAmount} XP
      </button>
    </div>
  )
}

// ============================================================
// Section: Agent Level Badge (compact)
// ============================================================

function AgentLevelBadge({ agentLevel, totalXP }: { agentLevel: number; totalXP: number }) {
  const currentLevelBaseXP = xpForCurrentLevel(totalXP, agentLevel)
  const nextLevelXP = xpForNextLevel(agentLevel)
  const progressPct = Math.min(((totalXP - currentLevelBaseXP) / (nextLevelXP - currentLevelBaseXP)) * 100, 100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <div className="agent-level-number" style={{ fontSize: '1.5rem' }}>
        {agentLevel}
      </div>
      <span style={{ fontSize: 9, color: 'var(--vl-text-muted)', fontWeight: 600 }}>
        {totalXP.toLocaleString()} XP
      </span>
      <div className="xp-progress-bar" style={{ width: 60, height: 4 }}>
        <div className="xp-progress-bar-fill" style={{ width: `${progressPct}%` }} />
      </div>
    </div>
  )
}

// ============================================================
// Main: AgentSkillTree
// ============================================================

export function AgentSkillTree({ agents, lang }: AgentSkillTreeProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')
  const [skillData, setSkillData] = useState<AgentSkillData | null>(null)
  const [categories, setCategories] = useState<SkillCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Zoom & Pan
  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Tooltip
  const [hoveredNode, setHoveredNode] = useState<TreeNodePosition | null>(null)
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  // Award dialog
  const [awardTarget, setAwardTarget] = useState<{ id: string; name: string } | null>(null)

  // Layout constants
  const TREE_WIDTH = 900
  const TREE_HEIGHT = 700
  const ROOT_X = TREE_WIDTH / 2
  const ROOT_Y = 80
  const CATEGORY_RADIUS = 220
  const SKILL_RADIUS = 120

  // Initialize
  useEffect(() => {
    setMounted(true)
    if (agents.length > 0 && !selectedAgentId) {
      setSelectedAgentId(agents[0].id)
    }
  }, [agents, selectedAgentId])

  // Fetch skill data
  useEffect(() => {
    if (!selectedAgentId) return
    setLoading(true)
    const fetchData = async () => {
      try {
        // Try localStorage first
        const cached = typeof window !== 'undefined'
          ? localStorage.getItem(`${STORAGE_KEY}-${selectedAgentId}`)
          : null
        if (cached) {
          const parsed = JSON.parse(cached)
          setSkillData(parsed.agentSkills)
          setCategories(parsed.skillCategories)
          setLoading(false)
          return
        }
        const res = await fetch(`/api/agent-skills?agentId=${selectedAgentId}`)
        if (res.ok) {
          const parsed = await res.json()
          setSkillData(parsed.agentSkills)
          setCategories(parsed.skillCategories || [])
          // Cache
          if (typeof window !== 'undefined') {
            localStorage.setItem(`${STORAGE_KEY}-${selectedAgentId}`, JSON.stringify(parsed))
          }
        }
      } catch {
        // Generate fallback data
        const fallback = generateFallbackData(selectedAgentId)
        setSkillData(fallback.agentSkills)
        setCategories(fallback.skillCategories)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [selectedAgentId])

  // Fallback data generator
  const generateFallbackData = useCallback((agentId: string) => {
    const cats: SkillCategory[] = [
      { id: 'research-methods', name: 'Research Methods', icon: 'BookOpen', color: '#8b5cf6', skills: [
        { id: 'literature-review', name: 'Literature Review', description: 'Systematic review of existing scientific literature', unlockRequirement: 0 },
        { id: 'experimental-design', name: 'Experimental Design', description: 'Plan and design controlled experiments', unlockRequirement: 0 },
        { id: 'hypothesis-generation', name: 'Hypothesis Generation', description: 'Formulate testable research hypotheses', unlockRequirement: 1 },
        { id: 'data-collection', name: 'Data Collection', description: 'Gather and organize research data', unlockRequirement: 1 },
        { id: 'statistical-analysis', name: 'Statistical Analysis', description: 'Apply statistical methods to research data', unlockRequirement: 2 },
        { id: 'peer-review', name: 'Peer Review', description: 'Critically evaluate research submissions', unlockRequirement: 3 },
      ]},
      { id: 'data-analysis', name: 'Data Analysis', icon: 'BarChart3', color: '#06b6d4', skills: [
        { id: 'visualization', name: 'Visualization', description: 'Create clear data visualizations', unlockRequirement: 0 },
        { id: 'statistical-modeling', name: 'Statistical Modeling', description: 'Build predictive statistical models', unlockRequirement: 0 },
        { id: 'machine-learning', name: 'Machine Learning', description: 'Apply ML algorithms to datasets', unlockRequirement: 3 },
        { id: 'data-wrangling', name: 'Data Wrangling', description: 'Clean, transform, and prepare data', unlockRequirement: 1 },
        { id: 'pattern-recognition', name: 'Pattern Recognition', description: 'Identify trends and patterns in data', unlockRequirement: 2 },
        { id: 'signal-processing', name: 'Signal Processing', description: 'Extract signals from noisy data', unlockRequirement: 3 },
      ]},
      { id: 'communication', name: 'Communication', icon: 'MessageSquare', color: '#10b981', skills: [
        { id: 'presentation', name: 'Presentation', description: 'Deliver clear presentations', unlockRequirement: 0 },
        { id: 'writing', name: 'Writing', description: 'Write clear scientific documentation', unlockRequirement: 0 },
        { id: 'mentoring', name: 'Mentoring', description: 'Guide other team members', unlockRequirement: 2 },
        { id: 'collaboration', name: 'Collaboration', description: 'Work across disciplines', unlockRequirement: 1 },
        { id: 'debate', name: 'Debate', description: 'Argue scientific viewpoints', unlockRequirement: 2 },
        { id: 'knowledge-transfer', name: 'Knowledge Transfer', description: 'Share expertise with others', unlockRequirement: 3 },
      ]},
      { id: 'leadership', name: 'Leadership', icon: 'Crown', color: '#f59e0b', skills: [
        { id: 'project-management', name: 'Project Management', description: 'Plan and coordinate projects', unlockRequirement: 0 },
        { id: 'team-building', name: 'Team Building', description: 'Build effective research teams', unlockRequirement: 0 },
        { id: 'decision-making', name: 'Decision Making', description: 'Make informed decisions', unlockRequirement: 1 },
        { id: 'strategic-planning', name: 'Strategic Planning', description: 'Develop long-term strategies', unlockRequirement: 2 },
        { id: 'resource-allocation', name: 'Resource Allocation', description: 'Optimize resource distribution', unlockRequirement: 3 },
        { id: 'risk-assessment', name: 'Risk Assessment', description: 'Identify and mitigate risks', unlockRequirement: 2 },
      ]},
      { id: 'technical', name: 'Technical', icon: 'Cpu', color: '#ef4444', skills: [
        { id: 'programming', name: 'Programming', description: 'Write clean and efficient code', unlockRequirement: 0 },
        { id: 'algorithm-design', name: 'Algorithm Design', description: 'Design efficient algorithms', unlockRequirement: 0 },
        { id: 'system-architecture', name: 'System Architecture', description: 'Design scalable systems', unlockRequirement: 2 },
        { id: 'debugging', name: 'Debugging', description: 'Identify and fix issues', unlockRequirement: 1 },
        { id: 'performance-optimization', name: 'Performance Optimization', description: 'Optimize performance', unlockRequirement: 3 },
        { id: 'code-review', name: 'Code Review', description: 'Review code for quality', unlockRequirement: 2 },
      ]},
      { id: 'domain-knowledge', name: 'Domain Knowledge', icon: 'Microscope', color: '#ec4899', skills: [
        { id: 'molecular-biology', name: 'Molecular Biology', description: 'Molecular biology principles', unlockRequirement: 0 },
        { id: 'protein-engineering', name: 'Protein Engineering', description: 'Design and modify proteins', unlockRequirement: 0 },
        { id: 'immunology', name: 'Immunology', description: 'Immune system mechanisms', unlockRequirement: 1 },
        { id: 'computational-chemistry', name: 'Computational Chemistry', description: 'Computational methods for chemistry', unlockRequirement: 2 },
        { id: 'bioinformatics', name: 'Bioinformatics', description: 'Analyze biological data', unlockRequirement: 2 },
        { id: 'structural-biology', name: 'Structural Biology', description: 'Analyze biological structures', unlockRequirement: 3 },
      ]},
    ]

    const skills: Record<string, AgentSkillXP> = {}
    for (const cat of cats) {
      for (const s of cat.skills) {
        const initXP = Math.floor(Math.random() * 80)
        skills[s.id] = { skillId: s.id, xp: initXP, level: computeSkillLevel(initXP), unlocked: true }
      }
    }
    const totalXP = Object.values(skills).reduce((sum, s) => sum + s.xp, 0)

    const agentSkills: AgentSkillData = {
      agentId,
      totalXP,
      agentLevel: 1,
      rankTitle: 'Novice',
      skills,
      achievements: {},
      xpHistory: [],
      milestones: [],
      previousRank: 0,
    }
    return { agentSkills, skillCategories: cats }
  }, [])

  // Compute tree node positions
  const treeNodes = useMemo(() => {
    if (!categories.length || !skillData) return []
    const nodes: TreeNodePosition[] = []

    // Root node
    const agent = agents.find(a => a.id === selectedAgentId)
    nodes.push({
      x: ROOT_X, y: ROOT_Y,
      label: agent?.title || 'Agent',
      type: 'root',
      color: agent?.color || '#10b981',
      level: skillData.agentLevel,
      xp: skillData.totalXP,
      unlocked: true,
      description: agent?.expertise || 'AI Research Agent',
    })

    // Category nodes
    const catCount = categories.length
    for (let ci = 0; ci < catCount; ci++) {
      const cat = categories[ci]
      const angleDeg = CATEGORY_ANGLES[ci] || (-90 + (360 / catCount) * ci)
      const angleRad = (angleDeg * Math.PI) / 180
      const catX = ROOT_X + CATEGORY_RADIUS * Math.cos(angleRad)
      const catY = ROOT_Y + CATEGORY_RADIUS * Math.sin(angleRad)

      // Compute category average level
      const catSkills = cat.skills
      const avgLevel = catSkills.length > 0
        ? Math.round(catSkills.reduce((sum, s) => sum + (skillData.skills[s.id]?.level || 0), 0) / catSkills.length)
        : 0

      const catNodeIdx = nodes.length
      nodes.push({
        x: catX, y: catY,
        categoryId: cat.id,
        label: cat.name,
        type: 'category',
        color: cat.color,
        level: avgLevel,
        xp: catSkills.reduce((sum, s) => sum + (skillData.skills[s.id]?.xp || 0), 0),
        unlocked: true,
        description: `${catSkills.length} ${lang === 'zh' ? '项技能' : 'skills'} · Avg Lv.${avgLevel}`,
        parentIndex: 0,
      })

      // Skill nodes
      const skillCount = cat.skills.length
      for (let si = 0; si < skillCount; si++) {
        const sk = cat.skills[si]
        const skillAngleDeg = angleDeg - 40 + (80 / Math.max(skillCount - 1, 1)) * si
        const skillAngleRad = (skillAngleDeg * Math.PI) / 180
        const skillX = catX + SKILL_RADIUS * Math.cos(skillAngleRad)
        const skillY = catY + SKILL_RADIUS * Math.sin(skillAngleRad)

        const skillXP = skillData.skills[sk.id]
        nodes.push({
          x: skillX, y: skillY,
          categoryId: cat.id,
          skillId: sk.id,
          label: sk.name,
          type: 'skill',
          color: cat.color,
          level: skillXP?.level || 0,
          xp: skillXP?.xp || 0,
          unlocked: skillXP?.unlocked || false,
          description: sk.description,
          parentIndex: catNodeIdx,
          unlockReq: sk.unlockRequirement,
        })
      }
    }

    return nodes
  }, [categories, skillData, selectedAgentId, agents, lang])

  // Mouse handlers for pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    setIsDragging(true)
    dragStart.current = { x: e.clientX - translate.x, y: e.clientY - translate.y }
  }, [translate])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setTranslate({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      })
    }
  }, [isDragging])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setScale(prev => Math.min(Math.max(prev + delta, 0.3), 3))
  }, [])

  // Zoom buttons
  const zoomIn = useCallback(() => setScale(prev => Math.min(prev + 0.2, 3)), [])
  const zoomOut = useCallback(() => setScale(prev => Math.max(prev - 0.2, 0.3)), [])
  const zoomReset = useCallback(() => { setScale(1); setTranslate({ x: 0, y: 0 }) }, [])

  // Node hover handlers
  const handleNodeEnter = useCallback((node: TreeNodePosition, e: React.MouseEvent) => {
    setHoveredNode(node)
    setTooltipVisible(true)
    setMousePos({ x: e.clientX, y: e.clientY })
  }, [])

  const handleNodeMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY })
  }, [])

  const handleNodeLeave = useCallback(() => {
    setTooltipVisible(false)
    setTimeout(() => setHoveredNode(null), 150)
  }, [])

  // Node click
  const handleNodeClick = useCallback((node: TreeNodePosition) => {
    if (node.type === 'skill' && node.skillId && node.unlocked) {
      setAwardTarget({ id: node.skillId, name: node.label })
    }
  }, [])

  // Award XP handler
  const handleAwardXP = useCallback(async (skillId: string, amount: number) => {
    if (!selectedAgentId) return
    try {
      const res = await fetch('/api/agent-skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgentId,
          skillId,
          amount,
          reason: 'manual-award',
        }),
      })
      if (res.ok) {
        // Re-fetch data
        const dataRes = await fetch(`/api/agent-skills?agentId=${selectedAgentId}`)
        if (dataRes.ok) {
          const parsed = await dataRes.json()
          setSkillData(parsed.agentSkills)
          setCategories(parsed.skillCategories || [])
          if (typeof window !== 'undefined') {
            localStorage.setItem(`${STORAGE_KEY}-${selectedAgentId}`, JSON.stringify(parsed))
          }
        }
      }
    } catch {
      // Silent fail
    }
  }, [selectedAgentId])

  // Node radius by type
  const getNodeRadius = (type: string) => {
    switch (type) {
      case 'root': return 32
      case 'category': return 24
      default: return 16
    }
  }

  // --- Render ---
  if (!mounted) return null

  const selectedAgent = agents.find(a => a.id === selectedAgentId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header with agent selector and level */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--vl-text-heading)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles style={{ width: 18, height: 18, color: 'var(--vl-accent)' }} />
            {lang === 'zh' ? '技能树' : 'Skill Tree'}
          </h3>
          {skillData && (
            <span className="rank-title-badge rank-novice" style={{ fontSize: 10 }}>
              <Award style={{ width: 12, height: 12 }} />
              {skillData.rankTitle} · Lv.{skillData.agentLevel}
            </span>
          )}
        </div>

        {/* Agent selector tabs */}
        <div className="agent-skill-selector">
          {agents.map(agent => (
            <button
              key={agent.id}
              className={`agent-skill-tab ${selectedAgentId === agent.id ? 'active' : ''}`}
              onClick={() => setSelectedAgentId(agent.id)}
            >
              <span
                style={{
                  display: 'inline-block', width: 8, height: 8,
                  borderRadius: '50%', backgroundColor: agent.color,
                  marginRight: 4, verticalAlign: 'middle',
                }}
              />
              {agent.title.length > 14 ? agent.title.slice(0, 14) + '…' : agent.title}
            </button>
          ))}
        </div>
      </div>

      {/* Skill Tree Visualization */}
      <div
        className="skill-tree-container"
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ height: 600 }}
      >
        {/* Transform layer */}
        <div
          className="skill-tree-viewport"
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            width: TREE_WIDTH,
            height: TREE_HEIGHT,
          }}
        >
          {/* SVG Canvas */}
          <svg width={TREE_WIDTH} height={TREE_HEIGHT} viewBox={`0 0 ${TREE_WIDTH} ${TREE_HEIGHT}`}>
            <defs>
              {/* Gradients for connecting lines */}
              {categories.map(cat => (
                <linearGradient key={`grad-${cat.id}`} id={`line-grad-${cat.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={selectedAgent?.color || '#10b981'} stopOpacity={0.6} />
                  <stop offset="100%" stopColor={cat.color} stopOpacity={0.6} />
                </linearGradient>
              ))}
              {/* Glow filter for nodes */}
              <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Lock icon */}
              <symbol id="lock-icon" viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2" fill="currentColor" />
                <path d="M7 11V7a5 5 0 0110 0v4" fill="none" stroke="currentColor" strokeWidth="2" />
              </symbol>
            </defs>

            {/* Connecting lines: root → category */}
            {treeNodes.filter(n => n.type === 'category').map(node => (
              <line
                key={`line-root-${node.categoryId}`}
                x1={ROOT_X}
                y1={ROOT_Y}
                x2={node.x}
                y2={node.y}
                stroke={`url(#line-grad-${node.categoryId})`}
                strokeWidth={2}
                className="skill-node-line active"
              />
            ))}

            {/* Connecting lines: category → skill */}
            {treeNodes.filter(n => n.type === 'skill').map(node => (
              <line
                key={`line-${node.categoryId}-${node.skillId}`}
                x1={treeNodes[node.parentIndex || 0]?.x || 0}
                y1={treeNodes[node.parentIndex || 0]?.y || 0}
                x2={node.x}
                y2={node.y}
                stroke={node.unlocked ? node.color : 'var(--vl-border)'}
                strokeWidth={node.unlocked ? 1.5 : 1}
                strokeDasharray={node.unlocked ? 'none' : '4 3'}
                opacity={node.unlocked ? 0.5 : 0.3}
                className={`skill-node-line ${node.unlocked ? 'active' : ''}`}
              />
            ))}

            {/* Render all nodes */}
            {treeNodes.map((node, idx) => {
              const radius = getNodeRadius(node.type)
              const isHovered = hoveredNode?.label === node.label && hoveredNode?.type === node.type
              const levelColor = LEVEL_COLORS[node.level] || '#6b7280'
              const isRoot = node.type === 'root'
              const isCategory = node.type === 'category'
              const isSkill = node.type === 'skill'

              return (
                <g
                  key={`node-${idx}`}
                  className={`skill-node ${node.unlocked ? (node.xp > 0 && node.xp < 1000 ? 'skill-node-active' : 'skill-node-unlocked') : 'skill-node-locked'}`}
                  style={{ transform: isHovered ? 'scale(1.15)' : undefined, transformOrigin: `${node.x}px ${node.y}px` }}
                  onMouseEnter={(e) => handleNodeEnter(node, e)}
                  onMouseMove={handleNodeMove}
                  onMouseLeave={handleNodeLeave}
                  onClick={() => handleNodeClick(node)}
                  role="button"
                  tabIndex={0}
                >
                  {/* Glow effect for high-level nodes */}
                  {node.level >= 3 && node.unlocked && (
                    <circle
                      cx={node.x} cy={node.y} r={radius + 4}
                      fill="none"
                      stroke={levelColor}
                      strokeWidth={1}
                      opacity={0.2}
                      filter="url(#node-glow)"
                    />
                  )}

                  {/* Dashed ring for locked skills */}
                  {!node.unlocked && isSkill && (
                    <circle
                      cx={node.x} cy={node.y} r={radius}
                      fill="var(--vl-bg-inner)"
                      stroke="var(--vl-border)"
                      strokeWidth={2}
                      strokeDasharray="4 3"
                    />
                  )}

                  {/* Main node circle */}
                  {(node.unlocked || isRoot || isCategory) && (
                    <circle
                      cx={node.x} cy={node.y} r={radius}
                      fill={isRoot
                        ? (selectedAgent?.color || '#10b981')
                        : isCategory
                          ? node.color
                          : `${levelColor}22`
                      }
                      stroke={isRoot ? 'white' : levelColor}
                      strokeWidth={isRoot ? 3 : isCategory ? 2.5 : 2}
                      className="skill-node-ring"
                      style={{ transition: 'stroke-width 0.2s ease' }}
                    />
                  )}

                  {/* Level stars around skill nodes */}
                  {isSkill && node.unlocked && (
                    <LevelStars cx={node.x} cy={node.y} level={node.level} />
                  )}

                  {/* Lock icon for locked skills */}
                  {!node.unlocked && isSkill && (
                    <use
                      href="#lock-icon"
                      x={node.x - 7} y={node.y - 7}
                      width={14} height={14}
                      color="var(--vl-text-muted)"
                      opacity={0.6}
                    />
                  )}

                  {/* Node label */}
                  <text
                    x={node.x}
                    y={node.y + (isRoot ? radius + 16 : isCategory ? radius + 14 : radius + 12)}
                    textAnchor="middle"
                    fill={node.unlocked ? 'var(--vl-text-heading)' : 'var(--vl-text-muted)'}
                    fontSize={isRoot ? 13 : isCategory ? 11 : 9}
                    fontWeight={isRoot || isCategory ? 700 : 500}
                    style={{ pointerEvents: 'none' }}
                  >
                    {node.label.length > (isRoot ? 20 : isCategory ? 16 : 12)
                      ? node.label.slice(0, isRoot ? 20 : isCategory ? 16 : 12) + '…'
                      : node.label}
                  </text>

                  {/* Level text inside category nodes */}
                  {isCategory && (
                    <text
                      x={node.x} y={node.y + 4}
                      textAnchor="middle"
                      fill="white"
                      fontSize={14}
                      fontWeight={800}
                      style={{ pointerEvents: 'none' }}
                    >
                      {node.level}
                    </text>
                  )}

                  {/* Agent initials for root node */}
                  {isRoot && selectedAgent && (
                    <text
                      x={node.x} y={node.y + 5}
                      textAnchor="middle"
                      fill="white"
                      fontSize={16}
                      fontWeight={800}
                      style={{ pointerEvents: 'none' }}
                    >
                      {selectedAgent.title.split(' ').map(w => w.charAt(0)).slice(0, 2).join('').toUpperCase()}
                    </text>
                  )}

                  {/* Level number inside skill node */}
                  {isSkill && node.unlocked && node.level > 0 && (
                    <text
                      x={node.x} y={node.y + 4}
                      textAnchor="middle"
                      fill={levelColor}
                      fontSize={10}
                      fontWeight={800}
                      style={{ pointerEvents: 'none' }}
                    >
                      {node.level}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
        </div>

        {/* Zoom controls */}
        <div className="skill-tree-zoom-controls">
          <button className="skill-tree-zoom-btn" onClick={zoomIn}>+</button>
          <button className="skill-tree-zoom-btn" onClick={zoomOut}>−</button>
          <button className="skill-tree-zoom-btn" onClick={zoomReset}>
            <Maximize style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* Scale indicator */}
        <div style={{
          position: 'absolute', bottom: 16, left: 16,
          fontSize: 10, color: 'var(--vl-text-muted)', fontWeight: 500,
          background: 'var(--vl-bg-card)', padding: '2px 8px', borderRadius: 'var(--vl-radius-md)',
          border: '1px solid var(--vl-border-subtle)',
        }}>
          {Math.round(scale * 100)}%
        </div>

        {/* Tooltip */}
        <SkillTooltip
          node={hoveredNode}
          visible={tooltipVisible}
          mouseX={mousePos.x}
          mouseY={mousePos.y}
          lang={lang}
        />

        {/* Award XP dialog */}
        {awardTarget && (
          <AwardXPDialog
            nodeId={awardTarget.id}
            nodeName={awardTarget.name}
            lang={lang}
            onAward={handleAwardXP}
            onClose={() => setAwardTarget(null)}
          />
        )}
      </div>

      {/* Stats summary bar */}
      {skillData && categories.length > 0 && (
        <div className="skill-stat-grid agent-skill-enter" style={{ animationDelay: '0.2s' }}>
          {[
            { label: lang === 'zh' ? '总 XP' : 'Total XP', value: skillData.totalXP.toLocaleString(), accent: false },
            { label: lang === 'zh' ? '等级' : 'Level', value: skillData.agentLevel, accent: true },
            { label: lang === 'zh' ? '已解锁' : 'Unlocked', value: `${Object.values(skillData.skills).filter(s => s.unlocked).length}/${Object.keys(skillData.skills).length}`, accent: false },
            { label: lang === 'zh' ? '最高等级' : 'Max Skill', value: Math.max(...Object.values(skillData.skills).map(s => s.level)), accent: false },
            { label: lang === 'zh' ? '总技能' : 'Total Skills', value: Object.keys(skillData.skills).length, accent: false },
            { label: lang === 'zh' ? '已获成就' : 'Achievements', value: Object.values(skillData.achievements || {}).filter(a => a.earned).length, accent: false },
          ].map((stat) => (
            <div key={stat.label} className="skill-stat-card">
              <div className="skill-stat-value" style={stat.accent ? { color: 'var(--vl-accent)' } : undefined}>
                {stat.value}
              </div>
              <div className="skill-stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Category legend */}
      {categories.length > 0 && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          {categories.map(cat => {
            const catSkills = cat.skills
            const avgLvl = catSkills.length > 0
              ? Math.round(catSkills.reduce((s, sk) => s + (skillData?.skills[sk.id]?.level || 0), 0) / catSkills.length)
              : 0
            const Icon = ICON_MAP[cat.icon] || BookOpen
            return (
              <div
                key={cat.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px', borderRadius: 'var(--vl-radius-full)',
                  background: `${cat.color}10`, border: `1px solid ${cat.color}25`,
                  fontSize: 11, fontWeight: 500, color: 'var(--vl-text-muted)',
                }}
              >
                <Icon style={{ width: 12, height: 12, color: cat.color }} />
                {cat.name}
                <span style={{ fontWeight: 700, color: cat.color }}>Lv.{avgLvl}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
