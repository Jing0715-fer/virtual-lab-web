import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string; stageId: string }>
}

// PUT /api/pipelines/[id]/stages/[stageId] - Update a stage
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { stageId } = await params
    const body = await request.json()
    const { title, color, order } = body

    const stage = await db.pipelineStage.update({
      where: { id: stageId },
      data: {
        ...(title !== undefined && { title }),
        ...(color !== undefined && { color }),
        ...(order !== undefined && { order }),
      }
    })

    return NextResponse.json(stage)
  } catch (error) {
    console.error('Error updating stage:', error)
    return NextResponse.json({ error: 'Failed to update stage' }, { status: 500 })
  }
}

// DELETE /api/pipelines/[id]/stages/[stageId] - Delete a stage
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { stageId } = await params
    await db.pipelineStage.delete({ where: { id: stageId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting stage:', error)
    return NextResponse.json({ error: 'Failed to delete stage' }, { status: 500 })
  }
}
