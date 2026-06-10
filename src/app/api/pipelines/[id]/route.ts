import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/pipelines/[id] - Get a single pipeline
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const pipeline = await db.pipeline.findUnique({
      where: { id },
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

    if (!pipeline) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 })
    }

    return NextResponse.json(pipeline)
  } catch (error) {
    console.error('Error fetching pipeline:', error)
    return NextResponse.json({ error: 'Failed to fetch pipeline' }, { status: 500 })
  }
}

// PUT /api/pipelines/[id] - Update a pipeline
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description } = body

    const pipeline = await db.pipeline.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
      },
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

    return NextResponse.json(pipeline)
  } catch (error) {
    console.error('Error updating pipeline:', error)
    return NextResponse.json({ error: 'Failed to update pipeline' }, { status: 500 })
  }
}

// DELETE /api/pipelines/[id] - Delete a pipeline
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    await db.pipeline.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting pipeline:', error)
    return NextResponse.json({ error: 'Failed to delete pipeline' }, { status: 500 })
  }
}
