'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Brain, FlaskConical, Wrench, BarChart3, Lightbulb, Box,
  Search, ZoomIn, ZoomOut, Maximize2, RotateCcw, Download,
  X, Plus, Pencil, Trash2, Link2, Sparkles, Network, Filter,
  Eye, EyeOff,
} from 'lucide-react'
import { toast } from 'sonner'

// ============================================================
// Types
// ============================================================

export type ConceptType = 'theory' | 'method' | 'tool' | 'result' | 'hypothesis' | 'entity'
export type RelationshipType = 'related-to' | 'part-of' | 'depends-on' | 'similar-to' | 'derived-from'

interface GraphNode {
  id: string
  label: string
  type: ConceptType
  description: string
  tags: string[]
  x: number
  y: number
  vx: number
  vy: number
}

interface GraphEdge {
  id: string
  source: string
  target: string
  type: RelationshipType
  strength: number
}

interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

interface ContextMenuState {
  x: number
  y: number
  nodeId: string
}

// ============================================================
// Constants
// ============================================================

const STORAGE_KEY = 'vl-knowledge-graph'

const CONCEPT_TYPES: { type: ConceptType; label: string; color: string; icon: React.ReactNode }[] = [
  { type: 'theory', label: 'Theory', color: '#3b82f6', icon: <Brain className="size-3" /> },
  { type: 'method', label: 'Method', color: '#10b981', icon: <FlaskConical className="size-3" /> },
  { type: 'tool', label: 'Tool', color: '#8b5cf6', icon: <Wrench className="size-3" /> },
  { type: 'result', label: 'Result', color: '#f59e0b', icon: <BarChart3 className="size-3" /> },
  { type: 'hypothesis', label: 'Hypothesis', color: '#ec4899', icon: <Lightbulb className="size-3" /> },
  { type: 'entity', label: 'Entity', color: '#06b6d4', icon: <Box className="size-3" /> },
]

const RELATIONSHIP_TYPES: { type: RelationshipType; label: string; color: string; dash: string }[] = [
  { type: 'related-to', label: 'Related To', color: '#6b7280', dash: '' },
  { type: 'part-of', label: 'Part Of', color: '#3b82f6', dash: '8,4' },
  { type: 'depends-on', label: 'Depends On', color: '#ef4444', dash: '4,4' },
  { type: 'similar-to', label: 'Similar To', color: '#f59e0b', dash: '2,4' },
  { type: 'derived-from', label: 'Derived From', color: '#8b5cf6', dash: '12,4,2,4' },
]

const TYPE_COLORS: Record<ConceptType, string> = {
  theory: '#3b82f6',
  method: '#10b981',
  tool: '#8b5cf6',
  result: '#f59e0b',
  hypothesis: '#ec4899',
  entity: '#06b6d4',
}

const REL_COLORS: Record<RelationshipType, string> = {
  'related-to': '#6b7280',
  'part-of': '#3b82f6',
  'depends-on': '#ef4444',
  'similar-to': '#f59e0b',
  'derived-from': '#8b5cf6',
}

const CLUSTER_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6']

// ============================================================
// Sample Data Generator
// ============================================================

function generateSampleData(): GraphData {
  const now = new Date().toISOString()
  const cx = 500
  const cy = 350
  const spread = 250

  const randPos = (i: number) => ({
    x: cx + Math.cos((i / 28) * Math.PI * 2) * spread * (0.5 + Math.random() * 0.5),
    y: cy + Math.sin((i / 28) * Math.PI * 2) * spread * (0.5 + Math.random() * 0.5),
  })

  const nodes: GraphNode[] = [
    { id: 'nanobody', label: 'Nanobody', type: 'entity', description: 'Single-domain antibody fragment derived from camelid heavy-chain-only antibodies. ~15 kDa.', tags: ['antibody', 'protein', 'therapeutics'], vx: 0, vy: 0, ...randPos(0) },
    { id: 'cdr3', label: 'CDR3 Loop', type: 'entity', description: 'Third complementarity-determining region; most diverse loop critical for antigen binding.', tags: ['antibody', 'binding', 'loop'], vx: 0, vy: 0, ...randPos(1) },
    { id: 'affinity', label: 'Binding Affinity', type: 'result', description: 'Strength of interaction between nanobody and target, measured as KD.', tags: ['biophysics', 'measurement', 'binding'], vx: 0, vy: 0, ...randPos(2) },
    { id: 'alphafold', label: 'AlphaFold', type: 'tool', description: 'Deep learning system for protein structure prediction by DeepMind.', tags: ['AI', 'structure', 'prediction'], vx: 0, vy: 0, ...randPos(3) },
    { id: 'esm', label: 'ESM-2', type: 'tool', description: 'Meta protein language model trained on 250M sequences for sequence analysis.', tags: ['language-model', 'protein', 'sequence'], vx: 0, vy: 0, ...randPos(4) },
    { id: 'rosetta', label: 'Rosetta', type: 'tool', description: 'Protein structure prediction and design suite using energy-based scoring.', tags: ['energy', 'scoring', 'design'], vx: 0, vy: 0, ...randPos(5) },
    { id: 'epitope', label: 'Epitope', type: 'entity', description: 'Specific region on antigen recognized by antibody binding site.', tags: ['antigen', 'target', 'recognition'], vx: 0, vy: 0, ...randPos(6) },
    { id: 'paratope', label: 'Paratope', type: 'entity', description: 'Antigen-binding surface of antibody formed by CDR loops.', tags: ['antibody', 'binding-site', 'CDR'], vx: 0, vy: 0, ...randPos(7) },
    { id: 'spike-protein', label: 'Spike Protein', type: 'entity', description: 'SARS-CoV-2 surface glycoprotein mediating host cell entry.', tags: ['viral', 'COVID-19', 'target'], vx: 0, vy: 0, ...randPos(8) },
    { id: 'rbd', label: 'RBD', type: 'entity', description: 'Receptor Binding Domain of SARS-CoV-2 spike protein.', tags: ['viral', 'binding', 'ACE2'], vx: 0, vy: 0, ...randPos(9) },
    { id: 'plddt', label: 'pLDDT Score', type: 'result', description: 'Per-residue confidence metric from AlphaFold (0-100).', tags: ['confidence', 'metric', 'AlphaFold'], vx: 0, vy: 0, ...randPos(10) },
    { id: 'ptm', label: 'pTM Score', type: 'result', description: 'Predicted TM-score for interface confidence in AlphaFold-Multimer.', tags: ['confidence', 'interface', 'AlphaFold'], vx: 0, vy: 0, ...randPos(11) },
    { id: 'msa', label: 'MSA', type: 'method', description: 'Multiple Sequence Alignment used as input for structure prediction.', tags: ['bioinformatics', 'alignment', 'input'], vx: 0, vy: 0, ...randPos(12) },
    { id: 'immunogenicity', label: 'Immunogenicity', type: 'result', description: 'Ability of therapeutic to provoke immune response in patient.', tags: ['safety', 'immune-response', 'therapeutic'], vx: 0, vy: 0, ...randPos(13) },
    { id: 'developability', label: 'Developability', type: 'result', description: 'Assessment of antibody suitability for drug development.', tags: ['drug-development', 'assessment', 'properties'], vx: 0, vy: 0, ...randPos(14) },
    { id: 'solubility', label: 'Solubility', type: 'result', description: 'Measure of protein ability to dissolve in aqueous solutions.', tags: ['biophysics', 'physicochemical', 'property'], vx: 0, vy: 0, ...randPos(15) },
    { id: 'affinity-maturation', label: 'Affinity Maturation', type: 'method', description: 'Process of improving antibody binding affinity through mutation and selection.', tags: ['optimization', 'mutation', 'evolution'], vx: 0, vy: 0, ...randPos(16) },
    { id: 'phage-display', label: 'Phage Display', type: 'method', description: 'Technology for screening peptide/protein libraries using bacteriophage.', tags: ['screening', 'library', 'selection'], vx: 0, vy: 0, ...randPos(17) },
    { id: 'yeast-display', label: 'Yeast Display', type: 'method', description: 'Eukaryotic expression system for surface display of protein variants.', tags: ['screening', 'library', 'eukaryotic'], vx: 0, vy: 0, ...randPos(18) },
    { id: 'language-model', label: 'Protein LM', type: 'theory', description: 'Language models trained on protein sequences capturing evolutionary constraints.', tags: ['AI', 'theory', 'deep-learning'], vx: 0, vy: 0, ...randPos(19) },
    { id: 'structure-pred', label: 'Structure Prediction', type: 'theory', description: 'Computational approaches to predict 3D protein structure from sequence.', tags: ['theory', 'computational', 'structure'], vx: 0, vy: 0, ...randPos(20) },
    { id: 'energy-function', label: 'Energy Function', type: 'theory', description: 'Mathematical functions modeling molecular interactions for scoring.', tags: ['theory', 'physics', 'scoring'], vx: 0, vy: 0, ...randPos(21) },
    { id: 'delta-dg', label: 'ΔΔG', type: 'result', description: 'Change in binding free energy upon mutation; used to predict affinity change.', tags: ['energy', 'mutation', 'binding'], vx: 0, vy: 0, ...randPos(22) },
    { id: 'cnn', label: 'CNN Features', type: 'method', description: 'Convolutional neural network features extracted from protein structure.', tags: ['deep-learning', 'features', 'structure'], vx: 0, vy: 0, ...randPos(23) },
    { id: 'vdj', label: 'V(D)J Recombination', type: 'theory', description: 'Biological mechanism generating antibody diversity.', tags: ['biology', 'immune-system', 'diversity'], vx: 0, vy: 0, ...randPos(24) },
    { id: 'scaffold', label: 'Nanobody Scaffold', type: 'entity', description: 'Framework region of nanobody providing structural stability.', tags: ['framework', 'structure', 'stability'], vx: 0, vy: 0, ...randPos(25) },
    { id: 'interface-analysis', label: 'Interface Analysis', type: 'method', description: 'Computational analysis of protein-protein interaction interfaces.', tags: ['analysis', 'interaction', 'computational'], vx: 0, vy: 0, ...randPos(26) },
    { id: 'hydrophobicity', label: 'Hydrophobicity', type: 'result', description: 'Tendency of molecules to repel water; affects protein folding.', tags: ['physicochemical', 'property', 'folding'], vx: 0, vy: 0, ...randPos(27) },
  ]

  const edges: GraphEdge[] = [
    { id: 'e1', source: 'nanobody', target: 'cdr3', type: 'part-of', strength: 3 },
    { id: 'e2', source: 'nanobody', target: 'paratope', type: 'part-of', strength: 3 },
    { id: 'e3', source: 'nanobody', target: 'scaffold', type: 'part-of', strength: 2 },
    { id: 'e4', source: 'nanobody', target: 'affinity', type: 'related-to', strength: 3 },
    { id: 'e5', source: 'nanobody', target: 'developability', type: 'related-to', strength: 2 },
    { id: 'e6', source: 'nanobody', target: 'immunogenicity', type: 'depends-on', strength: 2 },
    { id: 'e7', source: 'cdr3', target: 'paratope', type: 'part-of', strength: 3 },
    { id: 'e8', source: 'cdr3', target: 'affinity', type: 'related-to', strength: 3 },
    { id: 'e9', source: 'cdr3', target: 'affinity-maturation', type: 'depends-on', strength: 2 },
    { id: 'e10', source: 'affinity', target: 'delta-dg', type: 'derived-from', strength: 3 },
    { id: 'e11', source: 'affinity', target: 'rosetta', type: 'depends-on', strength: 2 },
    { id: 'e12', source: 'alphafold', target: 'plddt', type: 'derived-from', strength: 3 },
    { id: 'e13', source: 'alphafold', target: 'ptm', type: 'derived-from', strength: 3 },
    { id: 'e14', source: 'alphafold', target: 'structure-pred', type: 'part-of', strength: 3 },
    { id: 'e15', source: 'alphafold', target: 'msa', type: 'depends-on', strength: 2 },
    { id: 'e16', source: 'esm', target: 'language-model', type: 'part-of', strength: 3 },
    { id: 'e17', source: 'esm', target: 'cnn', type: 'similar-to', strength: 1 },
    { id: 'e18', source: 'esm', target: 'affinity-maturation', type: 'depends-on', strength: 2 },
    { id: 'e19', source: 'rosetta', target: 'energy-function', type: 'depends-on', strength: 3 },
    { id: 'e20', source: 'rosetta', target: 'delta-dg', type: 'derived-from', strength: 2 },
    { id: 'e21', source: 'rosetta', target: 'interface-analysis', type: 'part-of', strength: 2 },
    { id: 'e22', source: 'epitope', target: 'paratope', type: 'related-to', strength: 3 },
    { id: 'e23', source: 'epitope', target: 'rbd', type: 'part-of', strength: 2 },
    { id: 'e24', source: 'spike-protein', target: 'rbd', type: 'part-of', strength: 3 },
    { id: 'e25', source: 'spike-protein', target: 'epitope', type: 'related-to', strength: 2 },
    { id: 'e26', source: 'developability', target: 'solubility', type: 'depends-on', strength: 2 },
    { id: 'e27', source: 'developability', target: 'hydrophobicity', type: 'depends-on', strength: 2 },
    { id: 'e28', source: 'affinity-maturation', target: 'phage-display', type: 'similar-to', strength: 2 },
    { id: 'e29', source: 'affinity-maturation', target: 'yeast-display', type: 'similar-to', strength: 2 },
    { id: 'e30', source: 'phage-display', target: 'yeast-display', type: 'similar-to', strength: 2 },
    { id: 'e31', source: 'vdj', target: 'nanobody', type: 'related-to', strength: 2 },
    { id: 'e32', source: 'language-model', target: 'structure-pred', type: 'related-to', strength: 2 },
    { id: 'e33', source: 'structure-pred', target: 'energy-function', type: 'similar-to', strength: 1 },
    { id: 'e34', source: 'interface-analysis', target: 'alphafold', type: 'related-to', strength: 2 },
    { id: 'e35', source: 'solubility', target: 'hydrophobicity', type: 'related-to', strength: 2 },
  ]

  return { nodes, edges }
}

// ============================================================
// Cluster Detection (Connected Components)
// ============================================================

function detectClusters(data: GraphData): Map<string, number> {
  const { nodes, edges } = data
  const clusterMap = new Map<string, number>()
  const visited = new Set<string>()
  let clusterId = 0

  const adj = new Map<string, Set<string>>()
  nodes.forEach(n => adj.set(n.id, new Set()))
  edges.forEach(e => {
    adj.get(e.source)?.add(e.target)
    adj.get(e.target)?.add(e.source)
  })

  for (const node of nodes) {
    if (visited.has(node.id)) continue
    const queue = [node.id]
    visited.add(node.id)
    while (queue.length > 0) {
      const current = queue.shift()!
      clusterMap.set(current, clusterId)
      const neighbors = adj.get(current)
      if (!neighbors) continue
      for (const nb of neighbors) {
        if (!visited.has(nb)) {
          visited.add(nb)
          queue.push(nb)
        }
      }
    }
    clusterId++
  }

  return clusterMap
}

// ============================================================
// Helpers
// ============================================================

function getNodeRadius(node: GraphNode, connectionCount: number): number {
  return Math.max(16, 12 + connectionCount * 2.5)
}

function getConnectedNodeIds(nodeId: string, edges: GraphEdge[]): Set<string> {
  const connected = new Set<string>()
  connected.add(nodeId)
  edges.forEach(e => {
    if (e.source === nodeId) connected.add(e.target)
    if (e.target === nodeId) connected.add(e.source)
  })
  return connected
}

function getConnectionCount(nodeId: string, edges: GraphEdge[]): number {
  return edges.filter(e => e.source === nodeId || e.target === nodeId).length
}

// ============================================================
// Main Component
// ============================================================

export default function KnowledgeGraph() {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const animRef = useRef<number>(0)
  const dataRef = useRef<GraphData>({ nodes: [], edges: [] })
  const dragRef = useRef<{ nodeId: string | null; offsetX: number; offsetY: number }>({ nodeId: null, offsetX: 0, offsetY: 0 })
  const panRef = useRef({ x: 0, y: 0 })
  const zoomRef = useRef(1)
  const panStartRef = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null)
  const alphaRef = useRef(1)

  const [mounted, setMounted] = useState(false)
  const [data, setData] = useState<GraphData>({ nodes: [], edges: [] })
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [activeTypes, setActiveTypes] = useState<Set<ConceptType>>(new Set(CONCEPT_TYPES.map(c => c.type)))
  const [showLabels, setShowLabels] = useState(true)
  const [showClusters, setShowClusters] = useState(false)
  const [editingNode, setEditingNode] = useState<GraphNode | null>(null)
  const [newNodePos, setNewNodePos] = useState<{ x: number; y: number } | null>(null)

  // Cluster map
  const clusterMap = useMemo(() => {
    if (!showClusters || data.nodes.length === 0) return new Map<string, number>()
    return detectClusters(data)
  }, [data, showClusters])

  // Filtered data
  const filteredData = useMemo(() => {
    let filteredNodes = data.nodes
    if (activeTypes.size < 6) {
      filteredNodes = filteredNodes.filter(n => activeTypes.has(n.type))
    }
    const filteredNodeIds = new Set(filteredNodes.map(n => n.id))
    const filteredEdges = data.edges.filter(e => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target))
    return { nodes: filteredNodes, edges: filteredEdges }
  }, [data, activeTypes])

  // Search matched nodes
  const searchMatched = useMemo(() => {
    if (!searchQuery.trim()) return null
    const q = searchQuery.toLowerCase()
    const matched = new Set<string>()
    data.nodes.forEach(n => {
      if (n.label.toLowerCase().includes(q) || n.description.toLowerCase().includes(q) || n.tags.some(t => t.toLowerCase().includes(q))) {
        matched.add(n.id)
      }
    })
    return matched
  }, [data, searchQuery])

  // Dimmed nodes
  const dimmedOrHighlighted = useMemo(() => {
    const dimmed = new Set<string>()
    const highlighted = new Set<string>()

    if (hoveredNode) {
      const connected = getConnectedNodeIds(hoveredNode, filteredData.edges)
      filteredData.nodes.forEach(n => {
        if (!connected.has(n.id)) dimmed.add(n.id)
        else highlighted.add(n.id)
      })
    }

    if (searchMatched) {
      filteredData.nodes.forEach(n => {
        if (!searchMatched.has(n.id)) dimmed.add(n.id)
        else highlighted.add(n.id)
      })
    }

    return { dimmed, highlighted }
  }, [hoveredNode, filteredData, searchMatched])

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as GraphData
        if (parsed.nodes && parsed.nodes.length > 0) {
          requestAnimationFrame(() => {
            dataRef.current = parsed
            setData(parsed)
            setMounted(true)
          })
          return
        }
      }
    } catch { /* ignore */ }
    const sample = generateSampleData()
    dataRef.current = sample
    requestAnimationFrame(() => {
      setData(sample)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sample)) } catch { /* ignore */ }
      setMounted(true)
    })
  }, [])

  // Persist data
  const persistData = useCallback((newData: GraphData) => {
    dataRef.current = newData
    setData(newData)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(newData)) } catch { /* ignore */ }
  }, [])

  // ── Physics Simulation ──
  useEffect(() => {
    if (!mounted || filteredData.nodes.length === 0) return

    const WIDTH = 1000
    const HEIGHT = 700
    const alphaDecay = 0.998

    const tick = () => {
      const d = dataRef.current
      const fNodes = d.nodes.filter(n => filteredData.nodes.some(fn => fn.id === n.id))
      const fEdges = d.edges.filter(e => filteredData.edges.some(fe => fe.id === e.id))
      const nodeMap = new Map(fNodes.map(n => [n.id, n]))
      const alpha = alphaRef.current

      if (alpha > 0.001) {
        alphaRef.current *= alphaDecay

        // Repulsion O(n²)
        for (let i = 0; i < fNodes.length; i++) {
          for (let j = i + 1; j < fNodes.length; j++) {
            const a = fNodes[i]
            const b = fNodes[j]
            const dx = a.x - b.x
            const dy = a.y - b.y
            const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
            const force = (1500 * alpha) / (dist * dist)
            const fx = (dx / dist) * force
            const fy = (dy / dist) * force
            if (a.id !== dragRef.current.nodeId) { a.vx += fx * 0.06; a.vy += fy * 0.06 }
            if (b.id !== dragRef.current.nodeId) { b.vx -= fx * 0.06; b.vy -= fy * 0.06 }
          }
        }

        // Spring force
        for (const edge of fEdges) {
          const src = nodeMap.get(edge.source)
          const tgt = nodeMap.get(edge.target)
          if (!src || !tgt) continue
          const dx = tgt.x - src.x
          const dy = tgt.y - src.y
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
          const idealLen = 160
          const force = (dist - idealLen) * 0.003 * edge.strength * alpha
          const fx = (dx / dist) * force
          const fy = (dy / dist) * force
          if (src.id !== dragRef.current.nodeId) { src.vx += fx; src.vy += fy }
          if (tgt.id !== dragRef.current.nodeId) { tgt.vx -= fx; tgt.vy -= fy }
        }

        // Center gravity + damping
        for (const node of fNodes) {
          if (node.id === dragRef.current.nodeId) { node.vx = 0; node.vy = 0; continue }
          node.vx += (WIDTH / 2 - node.x) * 0.0003 * alpha
          node.vy += (HEIGHT / 2 - node.y) * 0.0003 * alpha
          node.vx *= 0.85
          node.vy *= 0.85
          node.x += node.vx
          node.y += node.vy
          node.x = Math.max(40, Math.min(WIDTH - 40, node.x))
          node.y = Math.max(40, Math.min(HEIGHT - 40, node.y))
        }
      }

      setData({ nodes: [...d.nodes], edges: [...d.edges] })
      animRef.current = requestAnimationFrame(tick)
    }

    alphaRef.current = 1
    animRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animRef.current)
  }, [mounted, filteredData])

  // ── SVG coordinate helpers ──
  const screenToWorld = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    const zoom = zoomRef.current
    const pan = panRef.current
    const scaleX = 1000 / rect.width
    const scaleY = 700 / rect.height
    const cx = 500
    const cy = 350
    const wx = ((clientX - rect.left) * scaleX - pan.x - cx) / zoom + cx
    const wy = ((clientY - rect.top) * scaleY - pan.y - cy) / zoom + cy
    return { x: wx, y: wy }
  }, [])

  const findNodeAt = useCallback((wx: number, wy: number) => {
    for (let i = filteredData.nodes.length - 1; i >= 0; i--) {
      const n = filteredData.nodes[i]
      const connCount = getConnectionCount(n.id, filteredData.edges)
      const r = getNodeRadius(n, connCount)
      const dx = wx - n.x
      const dy = wy - n.y
      if (dx * dx + dy * dy <= (r + 6) * (r + 6)) return n
    }
    return null
  }, [filteredData])

  // ── Mouse Handlers ──
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button === 2) return // right-click handled by onContextMenu
    const { x, y } = screenToWorld(e.clientX, e.clientY)
    const node = findNodeAt(x, y)
    if (node) {
      dragRef.current = { nodeId: node.id, offsetX: x - node.x, offsetY: y - node.y }
      alphaRef.current = Math.max(alphaRef.current, 0.3) // reheat
    } else {
      panStartRef.current = { sx: e.clientX, sy: e.clientY, px: panRef.current.x, py: panRef.current.y }
    }
  }, [screenToWorld, findNodeAt])

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (dragRef.current.nodeId) {
      const { x, y } = screenToWorld(e.clientX, e.clientY)
      const node = dataRef.current.nodes.find(n => n.id === dragRef.current.nodeId)
      if (node) {
        node.x = x - dragRef.current.offsetX
        node.y = y - dragRef.current.offsetY
        node.vx = 0
        node.vy = 0
      }
    } else if (panStartRef.current) {
      panRef.current = {
        x: panStartRef.current.px + (e.clientX - panStartRef.current.sx),
        y: panStartRef.current.py + (e.clientY - panStartRef.current.sy),
      }
    } else {
      const { x, y } = screenToWorld(e.clientX, e.clientY)
      const node = findNodeAt(x, y)
      setHoveredNode(node?.id ?? null)
    }
  }, [screenToWorld, findNodeAt])

  const handleMouseUp = useCallback(() => {
    if (dragRef.current.nodeId) {
      persistData(dataRef.current)
    }
    dragRef.current = { nodeId: null, offsetX: 0, offsetY: 0 }
    panStartRef.current = null
  }, [persistData])

  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault()
    const delta = e.deltaY * 0.001
    const newZoom = Math.max(0.3, Math.min(4, zoomRef.current - delta))
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const mx = (e.clientX - rect.left) * (1000 / rect.width)
    const my = (e.clientY - rect.top) * (700 / rect.height)
    const oldZoom = zoomRef.current
    const ratio = newZoom / oldZoom
    panRef.current.x = mx - ratio * (mx - panRef.current.x)
    panRef.current.y = my - ratio * (my - panRef.current.y)
    zoomRef.current = newZoom
  }, [])

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node)
    setContextMenu(null)
  }, [])

  const handleContextMenu = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    e.preventDefault()
    const { x, y } = screenToWorld(e.clientX, e.clientY)
    const node = findNodeAt(x, y)
    if (node) {
      setContextMenu({ x: e.clientX - (containerRef.current?.getBoundingClientRect().left || 0), y: e.clientY - (containerRef.current?.getBoundingClientRect().top || 0), nodeId: node.id })
    }
  }, [screenToWorld, findNodeAt])

  const handleDoubleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const { x, y } = screenToWorld(e.clientX, e.clientY)
    const node = findNodeAt(x, y)
    if (!node) {
      setNewNodePos({ x, y })
    }
  }, [screenToWorld, findNodeAt])

  // ── Actions ──
  const handleDeleteNode = useCallback((nodeId: string) => {
    const newData: GraphData = {
      nodes: dataRef.current.nodes.filter(n => n.id !== nodeId),
      edges: dataRef.current.edges.filter(e => e.source !== nodeId && e.target !== nodeId),
    }
    persistData(newData)
    setContextMenu(null)
    setSelectedNode(null)
    toast.success('Concept deleted')
  }, [persistData])

  const handleAddNode = useCallback((label: string, type: ConceptType) => {
    const pos = newNodePos || { x: 500 + (Math.random() - 0.5) * 100, y: 350 + (Math.random() - 0.5) * 100 }
    const newNode: GraphNode = {
      id: label.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
      label,
      type,
      description: '',
      tags: [],
      x: pos.x,
      y: pos.y,
      vx: 0,
      vy: 0,
    }
    const newData: GraphData = { nodes: [...dataRef.current.nodes, newNode], edges: [...dataRef.current.edges] }
    persistData(newData)
    setNewNodePos(null)
    setEditingNode(null)
    alphaRef.current = 0.8
    toast.success(`Concept "${label}" created`)
  }, [newNodePos, persistData])

  const handleEditNode = useCallback((updatedNode: GraphNode) => {
    const newData: GraphData = {
      nodes: dataRef.current.nodes.map(n => n.id === updatedNode.id ? updatedNode : n),
      edges: [...dataRef.current.edges],
    }
    persistData(newData)
    setSelectedNode(updatedNode)
    setEditingNode(null)
    toast.success('Concept updated')
  }, [persistData])

  const handleToggleType = useCallback((type: ConceptType) => {
    setActiveTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }, [])

  const handleReset = useCallback(() => {
    const sample = generateSampleData()
    persistData(sample)
    zoomRef.current = 1
    panRef.current = { x: 0, y: 0 }
    alphaRef.current = 1
    setSelectedNode(null)
    setContextMenu(null)
    setSearchQuery('')
    toast.success('Graph reset')
  }, [persistData])

  const handleExportJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(dataRef.current, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'knowledge-graph.json'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Exported as JSON')
  }, [])

  const handleZoomIn = useCallback(() => {
    zoomRef.current = Math.min(4, zoomRef.current * 1.25)
  }, [])

  const handleZoomOut = useCallback(() => {
    zoomRef.current = Math.max(0.3, zoomRef.current / 1.25)
  }, [])

  const handleFitAll = useCallback(() => {
    zoomRef.current = 1
    panRef.current = { x: 0, y: 0 }
  }, [])

  // ── Mini-map viewport bounds ──
  const minimapViewport = useMemo(() => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0, w: 100, h: 100 }
    const zoom = zoomRef.current
    const pan = panRef.current
    const rect = svg.getBoundingClientRect()
    const scaleX = rect.width / 1000
    const scaleY = rect.height / 700
    const vx = (-pan.x / zoom) * scaleX
    const vy = (-pan.y / zoom) * scaleY
    const vw = (rect.width / zoom) * scaleX * (rect.width / 180)
    const vh = (rect.height / zoom) * scaleY * (rect.height / 120)
    return { x: Math.max(0, vx), y: Math.max(0, vy), w: Math.min(180, vw), h: Math.min(120, vh) }
  }, [hoveredNode]) // recalculate on hover as proxy for render

  // ── Loading ──
  if (!mounted) {
    return (
      <div className="kg-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="skeleton-shimmer" style={{ width: '80%', height: 300, borderRadius: 'var(--vl-radius-xl)' }} />
      </div>
    )
  }

  // ── SVG render ──
  const zoom = zoomRef.current
  const pan = panRef.current

  return (
    <div ref={containerRef} className="kg-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 600 }}>
      {/* Toolbar */}
      <div className="kg-toolbar">
        <div className="kg-toolbar-group">
          <Network className="size-4" style={{ color: 'var(--vl-accent)' }} />
          <span style={{ fontSize: 'var(--vl-text-sm)', fontWeight: 700, color: 'var(--vl-text-heading)' }}>Knowledge Graph</span>
        </div>

        <div className="kg-toolbar-group" style={{ marginLeft: 'auto' }}>
          <input
            className="kg-search-input"
            placeholder="Search concepts..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="kg-toolbar-group">
          {CONCEPT_TYPES.map(ct => (
            <button
              key={ct.type}
              className={`kg-type-filter ${activeTypes.has(ct.type) ? 'active' : ''}`}
              data-type={ct.type}
              onClick={() => handleToggleType(ct.type)}
              title={ct.label}
            >
              {ct.icon}
              <span style={{ display: 'inline' }}>{ct.label}</span>
            </button>
          ))}
        </div>

        <div className="kg-toolbar-group">
          <button className={`kg-toolbar-btn ${showLabels ? 'active' : ''}`} onClick={() => setShowLabels(v => !v)}>
            {showLabels ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
            Labels
          </button>
          <button className={`kg-toolbar-btn ${showClusters ? 'active' : ''}`} onClick={() => setShowClusters(v => !v)}>
            <Sparkles className="size-3" />
            Clusters
          </button>
        </div>

        <div className="kg-toolbar-group">
          <button className="kg-toolbar-btn" onClick={handleZoomOut}><ZoomOut className="size-3" /></button>
          <button className="kg-toolbar-btn" onClick={handleZoomIn}><ZoomIn className="size-3" /></button>
          <button className="kg-toolbar-btn" onClick={handleFitAll}><Maximize2 className="size-3" /></button>
          <button className="kg-toolbar-btn" onClick={handleReset}><RotateCcw className="size-3" />Reset</button>
          <button className="kg-toolbar-btn" onClick={handleExportJSON}><Download className="size-3" />Export</button>
        </div>
      </div>

      {/* Graph Area */}
      <div className="kg-canvas-wrap" style={{ flex: 1, position: 'relative' }}>
        <svg
          ref={svgRef}
          viewBox="0 0 1000 700"
          preserveAspectRatio="xMidYMid meet"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onContextMenu={handleContextMenu}
          onDoubleClick={handleDoubleClick}
        >
          <defs>
            {CONCEPT_TYPES.map(ct => (
              <radialGradient key={ct.type} id={`kg-grad-${ct.type}`}>
                <stop offset="0%" stopColor={ct.color} stopOpacity="1" />
                <stop offset="100%" stopColor={ct.color} stopOpacity="0.7" />
              </radialGradient>
            ))}
            <filter id="kg-glow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          <g transform={`translate(${pan.x + 500 * (1 - zoom)}, ${pan.y + 350 * (1 - zoom)}) scale(${zoom}) translate(${-500}, ${-350})`}>
            {/* Edges */}
            {filteredData.edges.map(edge => {
              const src = dataRef.current.nodes.find(n => n.id === edge.source)
              const tgt = dataRef.current.nodes.find(n => n.id === edge.target)
              if (!src || !tgt) return null
              const isHighlighted = dimmedOrHighlighted.highlighted.has(edge.source) || dimmedOrHighlighted.highlighted.has(edge.target)
              const isDimmed = dimmedOrHighlighted.dimmed.has(edge.source) || dimmedOrHighlighted.dimmed.has(edge.target)
              const relColor = REL_COLORS[edge.type]
              return (
                <g key={edge.id}>
                  <line
                    x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                    stroke={relColor}
                    strokeWidth={isHighlighted ? edge.strength * 1.2 : edge.strength * 0.7}
                    strokeDasharray={RELATIONSHIP_TYPES.find(r => r.type === edge.type)?.dash}
                    strokeOpacity={isDimmed ? 0.06 : isHighlighted ? 0.85 : 0.35}
                    className={`kg-edge ${isDimmed ? 'dimmed' : ''} ${isHighlighted ? 'highlighted' : ''}`}
                  />
                  {/* Arrow */}
                  {isHighlighted && (
                    <circle cx={tgt.x} cy={tgt.y} r={3} fill={relColor} opacity={0.8} />
                  )}
                </g>
              )
            })}

            {/* Nodes */}
            {filteredData.nodes.map(node => {
              const connCount = getConnectionCount(node.id, filteredData.edges)
              const r = getNodeRadius(node, connCount)
              const isDimmed = dimmedOrHighlighted.dimmed.has(node.id)
              const isHighlighted = dimmedOrHighlighted.highlighted.has(node.id)
              const isSelected = selectedNode?.id === node.id
              const isHovered = hoveredNode === node.id
              const clusterIdx = clusterMap.get(node.id)
              const fillColor = showClusters && clusterIdx !== undefined ? CLUSTER_COLORS[clusterIdx % CLUSTER_COLORS.length] : TYPE_COLORS[node.type]

              return (
                <g
                  key={node.id}
                  className={`kg-node kg-node-type-${node.type} ${isDimmed ? '' : ''} ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleNodeClick(node)}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  style={{ opacity: isDimmed ? 0.12 : 1, cursor: 'pointer' }}
                >
                  {/* Glow */}
                  {(isHovered || isHighlighted) && (
                    <circle cx={node.x} cy={node.y} r={r + 8} fill={fillColor} opacity={0.15} filter="url(#kg-glow)" />
                  )}
                  {/* Shadow */}
                  <circle cx={node.x} cy={node.y + 2} r={r} fill="rgba(0,0,0,0.15)" />
                  {/* Circle */}
                  <circle
                    cx={node.x} cy={node.y} r={r}
                    fill={`url(#kg-grad-${node.type})`}
                    stroke={fillColor}
                    strokeWidth={isHovered || isSelected ? 3 : 1.5}
                    strokeOpacity={isHovered || isSelected ? 1 : 0.6}
                    className="kg-node-circle"
                  />
                  {/* Icon (simplified text) */}
                  <text
                    x={node.x} y={node.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="white"
                    fontSize={Math.min(r * 0.5, 11)}
                    fontWeight={600}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {node.label.slice(0, r > 22 ? 4 : 3)}
                  </text>
                  {/* Label */}
                  {showLabels && (
                    <text
                      x={node.x} y={node.y + r + 14}
                      className="kg-node-label"
                      style={{ opacity: isDimmed ? 0.06 : 0.7, fontWeight: isHovered || isSelected ? 600 : 400 }}
                    >
                      {node.label}
                    </text>
                  )}
                </g>
              )
            })}
          </g>
        </svg>

        {/* Detail Panel */}
        {selectedNode && (
          <div className="kg-detail-panel">
            <div className="kg-panel-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: TYPE_COLORS[selectedNode.type] }} />
                <span className="kg-panel-title">{selectedNode.label}</span>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--vl-text-muted)' }}
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="kg-panel-section">
              <span className="kw-type-badge kw-type-badge-{selectedNode.type}" style={{
                background: TYPE_COLORS[selectedNode.type] + '1f',
                color: TYPE_COLORS[selectedNode.type],
              }}>
                {CONCEPT_TYPES.find(c => c.type === selectedNode.type)?.label}
              </span>
            </div>

            {selectedNode.description && (
              <div className="kg-panel-section">
                <p className="kg-panel-desc">{selectedNode.description}</p>
              </div>
            )}

            <div className="kg-panel-section">
              <p className="kg-panel-section-title">Connections ({getConnectionCount(selectedNode.id, filteredData.edges)})</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {filteredData.edges
                  .filter(e => e.source === selectedNode.id || e.target === selectedNode.id)
                  .map(edge => {
                    const relatedId = edge.source === selectedNode.id ? edge.target : edge.source
                    const relatedNode = dataRef.current.nodes.find(n => n.id === relatedId)
                    if (!relatedNode) return null
                    const rel = RELATIONSHIP_TYPES.find(r => r.type === edge.type)
                    return (
                      <button
                        key={edge.id}
                        className="kw-related-concept"
                        onClick={() => setSelectedNode(relatedNode)}
                      >
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: TYPE_COLORS[relatedNode.type] }} />
                        {relatedNode.label}
                        <span style={{ color: REL_COLORS[edge.type], fontSize: 9 }}>({rel?.label})</span>
                      </button>
                    )
                  })}
              </div>
            </div>

            <div className="kg-panel-section">
              <p className="kg-panel-section-title">Tags</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {selectedNode.tags.map(tag => (
                  <span key={tag} className="kw-tag-pill">{tag}</span>
                ))}
              </div>
            </div>

            <div className="kg-panel-section" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--vl-border)' }}>
              <button className="kg-context-menu-item" onClick={() => { setEditingNode(selectedNode) }}>
                <Pencil className="size-3.5" /> Edit Concept
              </button>
              <button className="kg-context-menu-item danger" onClick={() => handleDeleteNode(selectedNode.id)}>
                <Trash2 className="size-3.5" /> Delete Concept
              </button>
            </div>
          </div>
        )}

        {/* Context Menu */}
        {contextMenu && (
          <div className="kg-context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
            <button className="kg-context-menu-item" onClick={() => {
              const node = dataRef.current.nodes.find(n => n.id === contextMenu.nodeId)
              if (node) setSelectedNode(node)
              setContextMenu(null)
            }}>
              <Eye className="size-3.5" /> View Details
            </button>
            <button className="kg-context-menu-item" onClick={() => {
              const node = dataRef.current.nodes.find(n => n.id === contextMenu.nodeId)
              if (node) setEditingNode(node)
              setContextMenu(null)
            }}>
              <Pencil className="size-3.5" /> Edit
            </button>
            <button className="kg-context-menu-item" onClick={() => {
              setContextMenu(null)
              toast.info('Click another node to connect')
            }}>
              <Link2 className="size-3.5" /> Connect
            </button>
            <div className="kg-context-menu-divider" />
            <button className="kg-context-menu-item danger" onClick={() => handleDeleteNode(contextMenu.nodeId)}>
              <Trash2 className="size-3.5" /> Delete
            </button>
          </div>
        )}

        {/* New Node Dialog */}
        {newNodePos && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.4)', zIndex: 40,
          }} onClick={() => setNewNodePos(null)}>
            <div style={{
              background: 'var(--vl-bg-card)', borderRadius: 'var(--vl-radius-xl)', padding: 24,
              width: 360, maxWidth: '90%', border: '1px solid var(--vl-border)', boxShadow: 'var(--vl-shadow)',
            }} onClick={e => e.stopPropagation()}>
              <h3 style={{ fontSize: 'var(--vl-text-lg)', fontWeight: 700, color: 'var(--vl-text-heading)', marginBottom: 16 }}>
                <Plus className="size-4" style={{ display: 'inline', marginRight: 8 }} />
                New Concept
              </h3>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 'var(--vl-text-xs)', fontWeight: 600, color: 'var(--vl-text-muted)', display: 'block', marginBottom: 4 }}>Label</label>
                <input
                  className="kg-search-input"
                  style={{ width: '100%' }}
                  placeholder="Concept name..."
                  id="new-node-label"
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const input = document.getElementById('new-node-label') as HTMLInputElement
                      if (input?.value.trim()) {
                        handleAddNode(input.value.trim(), 'theory')
                      }
                    }
                  }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 'var(--vl-text-xs)', fontWeight: 600, color: 'var(--vl-text-muted)', display: 'block', marginBottom: 4 }}>Type</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {CONCEPT_TYPES.map(ct => (
                    <button
                      key={ct.type}
                      className={`kg-type-filter ${editingNode?.type === ct.type ? 'active' : ''}`}
                      data-type={ct.type}
                      onClick={() => {
                        const input = document.getElementById('new-node-label') as HTMLInputElement
                        if (input?.value.trim()) {
                          handleAddNode(input.value.trim(), ct.type)
                        }
                      }}
                    >
                      {ct.icon} {ct.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button className="kg-toolbar-btn" onClick={() => setNewNodePos(null)}>Cancel</button>
                <button
                  className="kg-toolbar-btn active"
                  onClick={() => {
                    const input = document.getElementById('new-node-label') as HTMLInputElement
                    if (input?.value.trim()) {
                      handleAddNode(input.value.trim(), 'theory')
                    }
                  }}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Node Dialog */}
        {editingNode && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.4)', zIndex: 40,
          }} onClick={() => setEditingNode(null)}>
            <div style={{
              background: 'var(--vl-bg-card)', borderRadius: 'var(--vl-radius-xl)', padding: 24,
              width: 420, maxWidth: '90%', border: '1px solid var(--vl-border)', boxShadow: 'var(--vl-shadow)',
            }} onClick={e => e.stopPropagation()}>
              <h3 style={{ fontSize: 'var(--vl-text-lg)', fontWeight: 700, color: 'var(--vl-text-heading)', marginBottom: 16 }}>
                <Pencil className="size-4" style={{ display: 'inline', marginRight: 8 }} />
                Edit Concept
              </h3>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 'var(--vl-text-xs)', fontWeight: 600, color: 'var(--vl-text-muted)', display: 'block', marginBottom: 4 }}>Label</label>
                <input
                  className="kg-search-input"
                  style={{ width: '100%' }}
                  defaultValue={editingNode.label}
                  id="edit-node-label"
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 'var(--vl-text-xs)', fontWeight: 600, color: 'var(--vl-text-muted)', display: 'block', marginBottom: 4 }}>Type</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {CONCEPT_TYPES.map(ct => (
                    <button
                      key={ct.type}
                      className={`kg-type-filter ${editingNode.type === ct.type ? 'active' : ''}`}
                      data-type={ct.type}
                      onClick={() => {
                        const updated = { ...editingNode, type: ct.type }
                        setEditingNode(updated)
                      }}
                    >
                      {ct.icon} {ct.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 'var(--vl-text-xs)', fontWeight: 600, color: 'var(--vl-text-muted)', display: 'block', marginBottom: 4 }}>Description</label>
                <textarea
                  className="kg-editor .kw-editor-textarea"
                  style={{ width: '100%', minHeight: 80 }}
                  defaultValue={editingNode.description}
                  id="edit-node-desc"
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 'var(--vl-text-xs)', fontWeight: 600, color: 'var(--vl-text-muted)', display: 'block', marginBottom: 4 }}>Tags (comma-separated)</label>
                <input
                  className="kg-search-input"
                  style={{ width: '100%' }}
                  defaultValue={editingNode.tags.join(', ')}
                  id="edit-node-tags"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button className="kg-toolbar-btn" onClick={() => setEditingNode(null)}>Cancel</button>
                <button
                  className="kg-toolbar-btn active"
                  onClick={() => {
                    const labelInput = document.getElementById('edit-node-label') as HTMLInputElement
                    const descInput = document.getElementById('edit-node-desc') as HTMLTextAreaElement
                    const tagsInput = document.getElementById('edit-node-tags') as HTMLInputElement
                    if (labelInput?.value.trim()) {
                      handleEditNode({
                        ...editingNode,
                        label: labelInput.value.trim(),
                        description: descInput?.value || '',
                        tags: tagsInput?.value.split(',').map(t => t.trim()).filter(Boolean) || [],
                      })
                    }
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mini Map */}
        <div className="kg-minimap">
          <svg viewBox="0 0 180 120" preserveAspectRatio="xMidYMid meet">
            {filteredData.edges.map(edge => {
              const src = dataRef.current.nodes.find(n => n.id === edge.source)
              const tgt = dataRef.current.nodes.find(n => n.id === edge.target)
              if (!src || !tgt) return null
              const sx = (src.x / 1000) * 180
              const sy = (src.y / 700) * 120
              const tx = (tgt.x / 1000) * 180
              const ty = (tgt.y / 700) * 120
              return (
                <line key={edge.id} x1={sx} y1={sy} x2={tx} y2={ty} stroke="var(--vl-border)" strokeWidth={0.5} opacity={0.4} />
              )
            })}
            {filteredData.nodes.map(node => {
              const nx = (node.x / 1000) * 180
              const ny = (node.y / 700) * 120
              return (
                <circle key={node.id} cx={nx} cy={ny} r={2} className="kg-minimap-node" fill={TYPE_COLORS[node.type]} />
              )
            })}
            <rect
              x={minimapViewport.x} y={minimapViewport.y}
              width={minimapViewport.w} height={minimapViewport.h}
              className="kg-minimap-viewport"
            />
          </svg>
        </div>
      </div>

      {/* Click outside context menu to close */}
      {contextMenu && <div style={{ position: 'fixed', inset: 0, zIndex: 25 }} onClick={() => setContextMenu(null)} />}
    </div>
  )
}
