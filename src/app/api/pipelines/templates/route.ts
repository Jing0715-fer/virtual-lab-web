import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ============================================================
// Pipeline Template Definitions
// ============================================================

const PIPELINE_TEMPLATES = [
  {
    id: 'drug-discovery',
    name: 'Drug Discovery Pipeline',
    description: 'End-to-end drug discovery workflow from literature review through preclinical testing',
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
    stages: [
      { name: 'Research', color: '#ec4899' },
      { name: 'Draft', color: '#8b5cf6' },
      { name: 'Review', color: '#f59e0b' },
      { name: 'Revision', color: '#06b6d4' },
      { name: 'Submit', color: '#10b981' },
    ],
  },
]

// GET /api/pipelines/templates - Returns all available pipeline templates
export async function GET() {
  try {
    return NextResponse.json({
      templates: PIPELINE_TEMPLATES.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        stageCount: t.stages.length,
        stages: t.stages.map(s => ({ name: s.name, color: s.color })),
      })),
    })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
  }
}

// POST /api/pipelines/templates - Creates a new pipeline from a template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { templateId, pipelineName } = body

    if (!templateId) {
      return NextResponse.json({ error: 'templateId is required' }, { status: 400 })
    }

    const template = PIPELINE_TEMPLATES.find(t => t.id === templateId)
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const name = pipelineName || template.name

    // Create the pipeline
    const pipeline = await db.pipeline.create({
      data: {
        name,
        description: template.description,
      },
    })

    // Create stages from template
    for (let i = 0; i < template.stages.length; i++) {
      const stage = template.stages[i]
      await db.pipelineStage.create({
        data: {
          title: stage.name,
          color: stage.color,
          order: i,
          pipelineId: pipeline.id,
        },
      })
    }

    // Fetch the created pipeline with stages
    const result = await db.pipeline.findUnique({
      where: { id: pipeline.id },
      include: {
        stages: {
          orderBy: { order: 'asc' },
          include: {
            tasks: {
              orderBy: { order: 'asc' },
              include: { assignee: true },
            },
          },
        },
      },
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error creating pipeline from template:', error)
    return NextResponse.json({ error: 'Failed to create pipeline from template' }, { status: 500 })
  }
}
