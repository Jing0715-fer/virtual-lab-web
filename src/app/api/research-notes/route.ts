import { NextRequest, NextResponse } from 'next/server'

// ============================================================
// In-memory store for research notes (backed by localStorage on client)
// This API provides server-side CRUD operations
// ============================================================

interface ResearchNote {
  id: string
  title: string
  content: string
  category: 'hypothesis' | 'observation' | 'protocol' | 'analysis' | 'conclusion' | 'reference'
  tags: string[]
  pinned: boolean
  createdAt: string
  updatedAt: string
  linkedMeetingId: string | null
  linkedAgentIds: string[]
  wordCount: number
}

// In-memory store (persists for the lifetime of the server process)
let notes: ResearchNote[] = []

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const tag = searchParams.get('tag')
    const search = searchParams.get('search')

    let result = [...notes]

    if (category) {
      result = result.filter(n => n.category === category)
    }

    if (tag) {
      result = result.filter(n => n.tags.includes(tag))
    }

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        n =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.tags.some(t => t.toLowerCase().includes(q))
      )
    }

    // Sort: pinned first, then by updatedAt descending
    result.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return b.updatedAt.localeCompare(a.updatedAt)
    })

    return NextResponse.json({
      notes: result,
      total: result.length,
      categories: countCategories(notes),
      tags: getAllTags(notes),
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, content, category, tags, linkedMeetingId, linkedAgentIds } = body

    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()
    const note: ResearchNote = {
      id: crypto.randomUUID(),
      title: title.trim(),
      content: content || '',
      category: category || 'hypothesis',
      tags: tags || [],
      pinned: false,
      createdAt: now,
      updatedAt: now,
      linkedMeetingId: linkedMeetingId || null,
      linkedAgentIds: linkedAgentIds || [],
      wordCount: (content || '').trim().split(/\s+/).filter(Boolean).length,
    }

    notes.push(note)

    return NextResponse.json({ note }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Note ID is required' },
        { status: 400 }
      )
    }

    const index = notes.findIndex(n => n.id === id)
    if (index === -1) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      )
    }

    const updated = {
      ...notes[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    // Recalculate word count if content changed
    if (updates.content !== undefined) {
      updated.wordCount = (updated.content || '').trim().split(/\s+/).filter(Boolean).length
    }

    notes[index] = updated

    return NextResponse.json({ note: updated })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update note' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Note ID is required' },
        { status: 400 }
      )
    }

    const index = notes.findIndex(n => n.id === id)
    if (index === -1) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      )
    }

    const deleted = notes.splice(index, 1)[0]

    return NextResponse.json({ note: deleted, total: notes.length })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete note' },
      { status: 500 }
    )
  }
}

// ============================================================
// Helper Functions
// ============================================================

function countCategories(noteList: ResearchNote[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const note of noteList) {
    counts[note.category] = (counts[note.category] || 0) + 1
  }
  return counts
}

function getAllTags(noteList: ResearchNote[]): string[] {
  const tags = new Set<string>()
  for (const note of noteList) {
    for (const tag of note.tags) {
      tags.add(tag)
    }
  }
  return Array.from(tags).sort()
}
