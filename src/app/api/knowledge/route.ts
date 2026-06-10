import { NextRequest, NextResponse } from 'next/server'

// ============================================================
// Types
// ============================================================

type ConceptType = 'theory' | 'method' | 'tool' | 'result' | 'hypothesis' | 'entity'
type RelationshipType = 'related-to' | 'part-of' | 'depends-on' | 'similar-to' | 'derived-from'

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

type ReferenceType = 'Paper' | 'URL' | 'Book' | 'Database'

interface WikiReference {
  id: string
  title: string
  url: string
  type: ReferenceType
}

interface WikiPage {
  id: string
  title: string
  type: ConceptType
  description: string
  tags: string[]
  relatedConcepts: string[]
  references: WikiReference[]
  notes: string
  createdAt: string
  updatedAt: string
  author: string
}

// ============================================================
// In-Memory Store (seeded on first access)
// ============================================================

let graphData: GraphData | null = null
let wikiPages: WikiPage[] | null = null
let seeded = false

// ============================================================
// Seed Sample Data
// ============================================================

function seedGraphData(): GraphData {
  const cx = 500
  const cy = 350
  const spread = 220

  const randPos = (i: number) => ({
    x: cx + Math.cos((i / 20) * Math.PI * 2) * spread * (0.6 + Math.random() * 0.4),
    y: cy + Math.sin((i / 20) * Math.PI * 2) * spread * (0.6 + Math.random() * 0.4),
  })

  const nodes: GraphNode[] = [
    { id: 'nanobody', label: 'Nanobody', type: 'entity', description: 'Single-domain antibody fragment derived from camelid heavy-chain-only antibodies. ~15 kDa.', tags: ['antibody', 'protein'], vx: 0, vy: 0, ...randPos(0) },
    { id: 'cdr3', label: 'CDR3 Loop', type: 'entity', description: 'Third complementarity-determining region; most diverse loop for antigen binding.', tags: ['antibody', 'binding'], vx: 0, vy: 0, ...randPos(1) },
    { id: 'affinity', label: 'Binding Affinity', type: 'result', description: 'Strength of interaction between nanobody and target, measured as KD.', tags: ['biophysics', 'binding'], vx: 0, vy: 0, ...randPos(2) },
    { id: 'alphafold', label: 'AlphaFold', type: 'tool', description: 'Deep learning system for protein structure prediction by DeepMind.', tags: ['AI', 'structure'], vx: 0, vy: 0, ...randPos(3) },
    { id: 'esm', label: 'ESM-2', type: 'tool', description: 'Meta protein language model trained on 250M sequences.', tags: ['language-model', 'protein'], vx: 0, vy: 0, ...randPos(4) },
    { id: 'rosetta', label: 'Rosetta', type: 'tool', description: 'Protein structure prediction and design suite using energy-based scoring.', tags: ['energy', 'scoring'], vx: 0, vy: 0, ...randPos(5) },
    { id: 'epitope', label: 'Epitope', type: 'entity', description: 'Specific region on antigen recognized by antibody binding site.', tags: ['antigen', 'target'], vx: 0, vy: 0, ...randPos(6) },
    { id: 'paratope', label: 'Paratope', type: 'entity', description: 'Antigen-binding surface of antibody formed by CDR loops.', tags: ['antibody', 'binding-site'], vx: 0, vy: 0, ...randPos(7) },
    { id: 'spike', label: 'Spike Protein', type: 'entity', description: 'SARS-CoV-2 surface glycoprotein mediating host cell entry.', tags: ['viral', 'COVID-19'], vx: 0, vy: 0, ...randPos(8) },
    { id: 'rbd', label: 'RBD', type: 'entity', description: 'Receptor Binding Domain of SARS-CoV-2 spike protein.', tags: ['viral', 'binding'], vx: 0, vy: 0, ...randPos(9) },
    { id: 'plddt', label: 'pLDDT Score', type: 'result', description: 'Per-residue confidence metric from AlphaFold (0-100).', tags: ['confidence', 'metric'], vx: 0, vy: 0, ...randPos(10) },
    { id: 'ptm', label: 'pTM Score', type: 'result', description: 'Predicted TM-score for interface confidence in AlphaFold-Multimer.', tags: ['confidence', 'interface'], vx: 0, vy: 0, ...randPos(11) },
    { id: 'msa', label: 'MSA', type: 'method', description: 'Multiple Sequence Alignment used as input for structure prediction.', tags: ['bioinformatics', 'alignment'], vx: 0, vy: 0, ...randPos(12) },
    { id: 'affinity-mat', label: 'Affinity Maturation', type: 'method', description: 'Process of improving antibody binding affinity through mutation.', tags: ['optimization', 'mutation'], vx: 0, vy: 0, ...randPos(13) },
    { id: 'phage-display', label: 'Phage Display', type: 'method', description: 'Technology for screening peptide/protein libraries using bacteriophage.', tags: ['screening', 'library'], vx: 0, vy: 0, ...randPos(14) },
    { id: 'prot-lm', label: 'Protein LM', type: 'theory', description: 'Language models trained on protein sequences capturing evolutionary constraints.', tags: ['AI', 'theory'], vx: 0, vy: 0, ...randPos(15) },
    { id: 'struct-pred', label: 'Structure Prediction', type: 'theory', description: 'Computational approaches to predict 3D protein structure from sequence.', tags: ['theory', 'computational'], vx: 0, vy: 0, ...randPos(16) },
    { id: 'energy-fn', label: 'Energy Function', type: 'theory', description: 'Mathematical functions modeling molecular interactions for scoring.', tags: ['theory', 'physics'], vx: 0, vy: 0, ...randPos(17) },
    { id: 'delta-dg', label: 'ΔΔG', type: 'result', description: 'Change in binding free energy upon mutation.', tags: ['energy', 'mutation'], vx: 0, vy: 0, ...randPos(18) },
    { id: 'interface-analysis', label: 'Interface Analysis', type: 'method', description: 'Computational analysis of protein-protein interaction interfaces.', tags: ['analysis', 'interaction'], vx: 0, vy: 0, ...randPos(19) },
  ]

  const edges: GraphEdge[] = [
    { id: 'e1', source: 'nanobody', target: 'cdr3', type: 'part-of', strength: 3 },
    { id: 'e2', source: 'nanobody', target: 'paratope', type: 'part-of', strength: 3 },
    { id: 'e3', source: 'nanobody', target: 'affinity', type: 'related-to', strength: 3 },
    { id: 'e4', source: 'cdr3', target: 'paratope', type: 'part-of', strength: 3 },
    { id: 'e5', source: 'cdr3', target: 'affinity', type: 'related-to', strength: 3 },
    { id: 'e6', source: 'cdr3', target: 'affinity-mat', type: 'depends-on', strength: 2 },
    { id: 'e7', source: 'affinity', target: 'delta-dg', type: 'derived-from', strength: 3 },
    { id: 'e8', source: 'affinity', target: 'rosetta', type: 'depends-on', strength: 2 },
    { id: 'e9', source: 'alphafold', target: 'plddt', type: 'derived-from', strength: 3 },
    { id: 'e10', source: 'alphafold', target: 'ptm', type: 'derived-from', strength: 3 },
    { id: 'e11', source: 'alphafold', target: 'struct-pred', type: 'part-of', strength: 3 },
    { id: 'e12', source: 'alphafold', target: 'msa', type: 'depends-on', strength: 2 },
    { id: 'e13', source: 'esm', target: 'prot-lm', type: 'part-of', strength: 3 },
    { id: 'e14', source: 'esm', target: 'affinity-mat', type: 'depends-on', strength: 2 },
    { id: 'e15', source: 'rosetta', target: 'energy-fn', type: 'depends-on', strength: 3 },
    { id: 'e16', source: 'rosetta', target: 'delta-dg', type: 'derived-from', strength: 2 },
    { id: 'e17', source: 'rosetta', target: 'interface-analysis', type: 'part-of', strength: 2 },
    { id: 'e18', source: 'epitope', target: 'paratope', type: 'related-to', strength: 3 },
    { id: 'e19', source: 'epitope', target: 'rbd', type: 'part-of', strength: 2 },
    { id: 'e20', source: 'spike', target: 'rbd', type: 'part-of', strength: 3 },
    { id: 'e21', source: 'affinity-mat', target: 'phage-display', type: 'similar-to', strength: 2 },
    { id: 'e22', source: 'prot-lm', target: 'struct-pred', type: 'related-to', strength: 2 },
    { id: 'e23', source: 'struct-pred', target: 'energy-fn', type: 'similar-to', strength: 1 },
    { id: 'e24', source: 'interface-analysis', target: 'alphafold', type: 'related-to', strength: 2 },
  ]

  return { nodes, edges }
}

function seedWikiPages(): WikiPage[] {
  const now = new Date().toISOString()
  return [
    {
      id: 'wp-1', title: 'Nanobody Engineering', type: 'method',
      description: 'Systematic approach to designing and optimizing single-domain antibodies for therapeutic applications.',
      tags: ['nanobody', 'antibody', 'engineering'], relatedConcepts: ['wp-2', 'wp-3'],
      references: [{ id: 'r1', title: 'Nanobodies as Enzyme Inhibitors', url: 'https://doi.org/10.1038', type: 'Paper' }],
      notes: 'Key focus: CDR3 loop engineering and framework stability.', createdAt: now, updatedAt: now, author: 'Lab PI',
    },
    {
      id: 'wp-2', title: 'CDR Loop Analysis', type: 'method',
      description: 'Computational analysis of complementarity-determining region loops in antibodies.',
      tags: ['CDR', 'loop-analysis'], relatedConcepts: ['wp-1'],
      references: [{ id: 'r2', title: 'North et al., JMB 2011', url: '', type: 'Paper' }],
      notes: 'North CDR classification is essential.', createdAt: now, updatedAt: now, author: 'Lab PI',
    },
    {
      id: 'wp-3', title: 'AlphaFold Structure Prediction', type: 'tool',
      description: 'DeepMind AlphaFold protein structure prediction system for nanobody-antigen complexes.',
      tags: ['alphafold', 'structure-prediction'], relatedConcepts: ['wp-1', 'wp-4'],
      references: [{ id: 'r3', title: 'Jumper et al., Nature 2021', url: 'https://doi.org/10.1038', type: 'Paper' }],
      notes: 'Use AlphaFold-Multimer for complex prediction.', createdAt: now, updatedAt: now, author: 'Lab PI',
    },
    {
      id: 'wp-4', title: 'ESM Protein Language Model', type: 'tool',
      description: 'Meta ESM-2 protein language model for sequence space exploration and mutation prediction.',
      tags: ['ESM', 'language-model'], relatedConcepts: ['wp-3', 'wp-5'],
      references: [{ id: 'r4', title: 'Lin et al., Science 2023', url: '', type: 'Paper' }],
      notes: 'ESM-2 embeddings capture structural information.', createdAt: now, updatedAt: now, author: 'Lab PI',
    },
    {
      id: 'wp-5', title: 'Rosetta Energy Scoring', type: 'tool',
      description: 'Rosetta molecular modeling suite for protein interface scoring.',
      tags: ['rosetta', 'energy', 'scoring'], relatedConcepts: ['wp-1', 'wp-4'],
      references: [{ id: 'r5', title: 'Alford et al., JCTC 2017', url: '', type: 'Paper' }],
      notes: 'REF2015 is the standard energy function.', createdAt: now, updatedAt: now, author: 'Lab PI',
    },
    {
      id: 'wp-6', title: 'Binding Affinity Prediction', type: 'result',
      description: 'Computational prediction of antibody-antigen binding affinity using docking and energy scores.',
      tags: ['affinity', 'prediction'], relatedConcepts: ['wp-1', 'wp-5'],
      references: [], notes: 'Use consensus of multiple approaches.', createdAt: now, updatedAt: now, author: 'Lab PI',
    },
    {
      id: 'wp-7', title: 'Affinity Maturation Strategies', type: 'method',
      description: 'Methods for improving antibody binding affinity using in silico and experimental approaches.',
      tags: ['affinity-maturation', 'optimization'], relatedConcepts: ['wp-6', 'wp-4'],
      references: [{ id: 'r6', title: 'Fellouse et al., PNAS 2007', url: '', type: 'Paper' }],
      notes: 'Focus CDR3 saturation first.', createdAt: now, updatedAt: now, author: 'Lab PI',
    },
    {
      id: 'wp-8', title: 'Protein Language Models Theory', type: 'theory',
      description: 'Theoretical framework for protein language models encoding evolutionary constraints.',
      tags: ['language-model', 'theory'], relatedConcepts: ['wp-4'],
      references: [], notes: 'Embeddings useful for similarity search.', createdAt: now, updatedAt: now, author: 'Lab PI',
    },
    {
      id: 'wp-9', title: 'SARS-CoV-2 Spike Protein', type: 'entity',
      description: 'Surface glycoprotein of SARS-CoV-2, primary target for therapeutic nanobodies.',
      tags: ['viral', 'spike', 'COVID-19'], relatedConcepts: ['wp-6'],
      references: [{ id: 'r7', title: 'Wrapp et al., Science 2020', url: '', type: 'Paper' }],
      notes: 'RBD-up conformation is accessible target.', createdAt: now, updatedAt: now, author: 'Lab PI',
    },
    {
      id: 'wp-10', title: 'Zero-Shot Mutation Prediction', type: 'hypothesis',
      description: 'Hypothesis: LM embeddings can predict mutation effects without structural modeling.',
      tags: ['zero-shot', 'prediction', 'hypothesis'], relatedConcepts: ['wp-4', 'wp-6', 'wp-8'],
      references: [{ id: 'r8', title: 'Meier et al., Nat Biotechnol 2021', url: '', type: 'Paper' }],
      notes: 'Validated on DeepMutational Benchmark.', createdAt: now, updatedAt: now, author: 'Lab PI',
    },
  ]
}

function ensureSeeded() {
  if (!seeded) {
    graphData = seedGraphData()
    wikiPages = seedWikiPages()
    seeded = true
  }
}

// ============================================================
// Route Handlers
// ============================================================

export async function GET(request: NextRequest) {
  ensureSeeded()

  const { searchParams } = new URL(request.url)
  const reqPath = searchParams.get('path')
  const q = searchParams.get('q')

  // Full-text search across concepts and wiki pages
  if (reqPath === '/search' && q) {
    const query = q.toLowerCase()
    const matchingNodes = (graphData || { nodes: [] }).nodes.filter(
      n => n.label.toLowerCase().includes(query) || n.description.toLowerCase().includes(query) || n.tags.some(t => t.toLowerCase().includes(query))
    )
    const matchingPages = (wikiPages || []).filter(
      p => p.title.toLowerCase().includes(query) || p.description.toLowerCase().includes(query) || p.tags.some(t => t.toLowerCase().includes(query))
    )
    return NextResponse.json({ nodes: matchingNodes, pages: matchingPages, query: q })
  }

  // Get graph data
  if (reqPath === '/graph') {
    return NextResponse.json({ nodes: graphData?.nodes || [], edges: graphData?.edges || [] })
  }

  // Get all wiki pages with optional type filter
  if (reqPath === '/wiki') {
    const typeFilter = searchParams.get('type')
    let result = wikiPages || []
    if (typeFilter) {
      result = result.filter(p => p.type === typeFilter)
    }
    return NextResponse.json({ pages: result, total: result.length })
  }

  // Get single wiki page
  if (reqPath?.startsWith('/wiki/')) {
    const pageId = reqPath.replace('/wiki/', '')
    const page = (wikiPages || []).find(p => p.id === pageId)
    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }
    return NextResponse.json({ page })
  }

  // Default: return both graph and wiki summary
  return NextResponse.json({
    graph: { nodes: graphData?.nodes?.length || 0, edges: graphData?.edges?.length || 0 },
    wiki: { pages: wikiPages?.length || 0 },
  })
}

export async function POST(request: NextRequest) {
  ensureSeeded()

  const body = await request.json()
  const reqPath = body.path as string

  // Create new graph node
  if (reqPath === '/graph/node') {
    const { label, type, description, tags, x, y } = body
    if (!label || !type) {
      return NextResponse.json({ error: 'Label and type are required' }, { status: 400 })
    }
    const newNode: GraphNode = {
      id: label.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
      label,
      type: type as ConceptType,
      description: description || '',
      tags: tags || [],
      x: x ?? 500 + (Math.random() - 0.5) * 200,
      y: y ?? 350 + (Math.random() - 0.5) * 200,
      vx: 0,
      vy: 0,
    }
    if (graphData) graphData.nodes.push(newNode)
    return NextResponse.json({ node: newNode }, { status: 201 })
  }

  // Create new graph edge
  if (reqPath === '/graph/edge') {
    const { source, target, type, strength } = body
    if (!source || !target || !type) {
      return NextResponse.json({ error: 'Source, target, and type are required' }, { status: 400 })
    }
    const newEdge: GraphEdge = {
      id: 'e-' + Date.now(),
      source,
      target,
      type: type as RelationshipType,
      strength: strength || 1,
    }
    if (graphData) graphData.edges.push(newEdge)
    return NextResponse.json({ edge: newEdge }, { status: 201 })
  }

  // Create new wiki page
  if (reqPath === '/wiki') {
    const { title, type, description, tags, references, notes } = body
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }
    const now = new Date().toISOString()
    const newPage: WikiPage = {
      id: 'wp-' + Date.now(),
      title,
      type: type || ('theory' as ConceptType),
      description: description || '',
      tags: tags || [],
      relatedConcepts: [],
      references: references || [],
      notes: notes || '',
      createdAt: now,
      updatedAt: now,
      author: body.author || 'API User',
    }
    if (wikiPages) wikiPages.push(newPage)
    return NextResponse.json({ page: newPage }, { status: 201 })
  }

  return NextResponse.json({ error: 'Unknown path. Use body.path to specify: /graph/node, /graph/edge, /wiki' }, { status: 400 })
}

export async function PUT(request: NextRequest) {
  ensureSeeded()

  const body = await request.json()
  const reqPath = body.path as string

  // Update graph node
  if (reqPath?.startsWith('/graph/node/')) {
    const nodeId = reqPath.replace('/graph/node/', '')
    if (!graphData) {
      return NextResponse.json({ error: 'Graph data not initialized' }, { status: 404 })
    }
    const nodeIdx = graphData.nodes.findIndex(n => n.id === nodeId)
    if (nodeIdx === -1) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 })
    }
    graphData.nodes[nodeIdx] = { ...graphData.nodes[nodeIdx], ...body.data, id: nodeId }
    return NextResponse.json({ node: graphData.nodes[nodeIdx] })
  }

  // Update wiki page
  if (reqPath?.startsWith('/wiki/')) {
    const pageId = reqPath.replace('/wiki/', '')
    if (!wikiPages) {
      return NextResponse.json({ error: 'Wiki data not initialized' }, { status: 404 })
    }
    const pageIdx = wikiPages.findIndex(p => p.id === pageId)
    if (pageIdx === -1) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }
    const updates = { ...body.data, updatedAt: new Date().toISOString() }
    wikiPages[pageIdx] = { ...wikiPages[pageIdx], ...updates, id: pageId }
    return NextResponse.json({ page: wikiPages[pageIdx] })
  }

  return NextResponse.json({ error: 'Unknown path for PUT' }, { status: 400 })
}

export async function DELETE(request: NextRequest) {
  ensureSeeded()

  const body = await request.json()
  const reqPath = body.path as string

  // Delete graph node
  if (reqPath?.startsWith('/graph/node/')) {
    const nodeId = reqPath.replace('/graph/node/', '')
    if (!graphData) {
      return NextResponse.json({ error: 'Graph data not initialized' }, { status: 404 })
    }
    graphData.nodes = graphData.nodes.filter(n => n.id !== nodeId)
    graphData.edges = graphData.edges.filter(e => e.source !== nodeId && e.target !== nodeId)
    return NextResponse.json({ success: true, deleted: nodeId })
  }

  // Delete wiki page
  if (reqPath?.startsWith('/wiki/')) {
    const pageId = reqPath.replace('/wiki/', '')
    if (!wikiPages) {
      return NextResponse.json({ error: 'Wiki data not initialized' }, { status: 404 })
    }
    wikiPages = wikiPages.filter(p => p.id !== pageId)
    return NextResponse.json({ success: true, deleted: pageId })
  }

  return NextResponse.json({ error: 'Unknown path for DELETE' }, { status: 400 })
}
