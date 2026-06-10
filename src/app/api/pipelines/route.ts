import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/pipelines - List all pipelines
export async function GET() {
  try {
    const pipelines = await db.pipeline.findMany({
      include: {
        stages: {
          orderBy: { order: 'asc' },
          include: {
            tasks: {
              orderBy: { order: 'asc' },
              include: { assignee: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(pipelines)
  } catch (error) {
    console.error('Error fetching pipelines:', error)
    return NextResponse.json({ error: 'Failed to fetch pipelines' }, { status: 500 })
  }
}

// POST /api/pipelines - Create a new pipeline
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, template } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const pipeline = await db.pipeline.create({
      data: {
        name,
        description: description || '',
      }
    })

    // If template is specified, create default stages
    if (template === 'research') {
      const stages = [
        { title: 'Hypothesis', order: 0, color: '#8b5cf6' },
        { title: 'Experiment Design', order: 1, color: '#3b82f6' },
        { title: 'Data Collection', order: 2, color: '#10b981' },
        { title: 'Analysis', order: 3, color: '#f59e0b' },
        { title: 'Publication', order: 4, color: '#ef4444' },
      ]
      for (const stage of stages) {
        await db.pipelineStage.create({
          data: { ...stage, pipelineId: pipeline.id }
        })
      }
    } else if (template === 'development') {
      const stages = [
        { title: 'Backlog', order: 0, color: '#6b7280' },
        { title: 'To Do', order: 1, color: '#3b82f6' },
        { title: 'In Progress', order: 2, color: '#f59e0b' },
        { title: 'Review', order: 3, color: '#8b5cf6' },
        { title: 'Done', order: 4, color: '#10b981' },
      ]
      for (const stage of stages) {
        await db.pipelineStage.create({
          data: { ...stage, pipelineId: pipeline.id }
        })
      }
    } else if (template === 'blank') {
      // Create minimal stages
      const stages = [
        { title: 'To Do', order: 0, color: '#3b82f6' },
        { title: 'In Progress', order: 1, color: '#f59e0b' },
        { title: 'Done', order: 2, color: '#10b981' },
      ]
      for (const stage of stages) {
        await db.pipelineStage.create({
          data: { ...stage, pipelineId: pipeline.id }
        })
      }
    }

    // Return pipeline with stages
    const result = await db.pipeline.findUnique({
      where: { id: pipeline.id },
      include: {
        stages: {
          orderBy: { order: 'asc' },
          include: {
            tasks: {
              orderBy: { order: 'asc' },
              include: { assignee: true }
            }
          }
        }
      }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error creating pipeline:', error)
    return NextResponse.json({ error: 'Failed to create pipeline' }, { status: 500 })
  }
}
