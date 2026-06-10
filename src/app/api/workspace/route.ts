import { NextRequest, NextResponse } from 'next/server'

// In-memory store for workspace data (simulates persistence)
const store = new Map<string, Record<string, unknown>>()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'

    if (type === 'all') {
      return NextResponse.json({
        success: true,
        data: Object.fromEntries(store),
      })
    }

    const data = store.get(type) || null
    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to read workspace data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, data } = body as { type: string; data: Record<string, unknown> }

    if (!type || !data) {
      return NextResponse.json(
        { success: false, error: 'Missing type or data' },
        { status: 400 }
      )
    }

    store.set(type, { ...data, updatedAt: Date.now() })
    return NextResponse.json({
      success: true,
      message: `Workspace data saved for type: ${type}`,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to save workspace data' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    if (type) {
      store.delete(type)
      return NextResponse.json({
        success: true,
        message: `Workspace data cleared for type: ${type}`,
      })
    }

    store.clear()
    return NextResponse.json({
      success: true,
      message: 'All workspace data cleared',
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to clear workspace data' },
      { status: 500 }
    )
  }
}
