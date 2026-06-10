import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/pipelines/[id]/stages - Add a stage to a pipeline
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title, color } = body

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Get the current max order
    const stages = await db.pipelineStage.findMany({
      where: { pipelineId: id },
      orderBy: { order: 'desc' },
      take: 1,
    })
    const maxOrder = stages.length > 0 ? stages[0].order + 1 : 0

    const stage = await db.pipelineStage.create({
      data: {
        title,
        color: color || '#10b981',
        order: maxOrder,
        pipelineId: id,
      }
    })

    return NextResponse.json(stage, { status: 201 })
  } catch (error) {
    console.error('Error creating stage:', error)
    return NextResponse.json({ error: 'Failed to create stage' }, { status: 500 })
  }
}
