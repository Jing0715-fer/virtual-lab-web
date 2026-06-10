import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string; stageId: string }>
}

// POST /api/pipelines/[id]/stages/[stageId]/tasks - Add a task to a stage
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { stageId } = await params
    const body = await request.json()
    const { title, description, priority, assigneeId, meetingId, dueDate, tags } = body

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Get the current max order
    const tasks = await db.pipelineTask.findMany({
      where: { stageId },
      orderBy: { order: 'desc' },
      take: 1,
    })
    const maxOrder = tasks.length > 0 ? tasks[0].order + 1 : 0

    const task = await db.pipelineTask.create({
      data: {
        title,
        description: description || '',
        priority: priority || 'medium',
        order: maxOrder,
        stageId,
        assigneeId: assigneeId || null,
        meetingId: meetingId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        tags: tags ? JSON.stringify(tags) : '[]',
      },
      include: { assignee: true }
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}
