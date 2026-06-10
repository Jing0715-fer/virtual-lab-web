import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string; stageId: string; taskId: string }>
}

// PUT /api/pipelines/[id]/stages/[stageId]/tasks/[taskId] - Update a task
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { taskId } = await params
    const body = await request.json()
    const { title, description, status, priority, order, assigneeId, meetingId, dueDate, tags, stageId: newStageId } = body

    const task = await db.pipelineTask.update({
      where: { id: taskId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
        ...(order !== undefined && { order }),
        ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
        ...(meetingId !== undefined && { meetingId: meetingId || null }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(tags !== undefined && { tags: JSON.stringify(tags) }),
        // Support moving task to different stage
        ...(newStageId !== undefined && { stageId: newStageId }),
      },
      include: { assignee: true }
    })

    return NextResponse.json(task)
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}

// DELETE /api/pipelines/[id]/stages/[stageId]/tasks/[taskId] - Delete a task
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { taskId } = await params
    await db.pipelineTask.delete({ where: { id: taskId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
  }
}
