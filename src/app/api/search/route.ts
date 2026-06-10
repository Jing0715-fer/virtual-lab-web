import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ============================================================
// Types
// ============================================================

interface SearchResult {
  type: 'meeting' | 'agent' | 'pipeline' | 'note'
  id: string
  title: string
  excerpt: string
  score: number
  metadata: Record<string, any>
}

interface SearchResponse {
  results: SearchResult[]
  total: number
  query: string
  hasNotes: boolean
}

// ============================================================
// Fuzzy Matching Helpers
// ============================================================

/**
 * Calculate a fuzzy match score between a query and target string.
 * Higher score = better match.
 * - Exact match: 100
 * - Starts with query: 80
 * - Contains query as substring: 60
 * - All query chars appear in order (fuzzy): 40
 * - Word boundary match: bonus +10
 */
function fuzzyScore(query: string, target: string): number {
  if (!query || !target) return 0

  const q = query.toLowerCase()
  const t = target.toLowerCase()

  // Exact match
  if (t === q) return 100

  // Starts with query
  if (t.startsWith(q)) return 80

  // Contains as substring
  const substringIdx = t.indexOf(q)
  if (substringIdx >= 0) {
    // Bonus for word boundary
    const bonus = (substringIdx === 0 || t[substringIdx - 1] === ' ') ? 10 : 0
    return 60 + bonus
  }

  // Fuzzy: check if all query chars appear in order
  let qi = 0
  let consecutiveMatches = 0
  let maxConsecutive = 0
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      qi++
      consecutiveMatches++
      maxConsecutive = Math.max(maxConsecutive, consecutiveMatches)
    } else {
      consecutiveMatches = 0
    }
  }
  if (qi === q.length) {
    // All chars matched - score based on how spread out they are
    const spread = t.length / q.length
    const spreadBonus = Math.max(0, 10 - spread)
    return 30 + maxConsecutive * 2 + spreadBonus
  }

  // Partial: some chars matched
  if (qi > 0) return 10 + qi * 2

  return 0
}

/**
 * Highlight matched text with <mark> tags.
 * Returns a plain text excerpt with <mark> around matched portions.
 */
function highlightMatch(text: string, query: string, maxLen: number = 150): string {
  if (!query || !text) return text

  const q = query.toLowerCase()
  const t = text.toLowerCase()
  const matchIdx = t.indexOf(q)

  if (matchIdx < 0) {
    // Fuzzy match - just return a truncated excerpt
    return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
  }

  // Create excerpt around the match
  const contextBefore = 40
  const contextAfter = 60
  const start = Math.max(0, matchIdx - contextBefore)
  const end = Math.min(text.length, matchIdx + q.length + contextAfter)

  let excerpt = ''
  if (start > 0) excerpt += '...'
  excerpt += text.slice(start, matchIdx)
  excerpt += '<mark>' + text.slice(matchIdx, matchIdx + q.length) + '</mark>'
  excerpt += text.slice(matchIdx + q.length, end)
  if (end < text.length) excerpt += '...'

  return excerpt.slice(0, maxLen + 20) // Allow some extra for tags
}

/**
 * Combined score: takes the best score across multiple fields.
 */
function bestScore(query: string, ...fields: string[]): number {
  let best = 0
  for (const field of fields) {
    best = Math.max(best, fuzzyScore(query, field))
  }
  return best
}

// ============================================================
// Search Functions
// ============================================================

async function searchMeetings(
  query: string,
  limit: number,
  offset: number
): Promise<SearchResult[]> {
  const teamMeetings = await db.teamMeeting.findMany({
    include: {
      messages: {
        select: { message: true, agentName: true },
        take: 50,
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const individualMeetings = await db.individualMeeting.findMany({
    include: {
      messages: {
        select: { message: true, agentName: true },
        take: 50,
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const results: SearchResult[] = []

  // Process team meetings
  for (const m of teamMeetings) {
    const agendaQuestions = (() => { try { return JSON.parse(m.agendaQuestions) } catch { return [] } })() as string[]
    const agendaRules = (() => { try { return JSON.parse(m.agendaRules) } catch { return [] } })() as string[]

    const searchableText = [
      m.agenda,
      m.saveName,
      m.summary || '',
      ...agendaQuestions,
      ...agendaRules,
      ...m.messages.map(msg => msg.message),
    ].join(' ')

    const score = bestScore(query, m.agenda, m.saveName, m.summary || '', searchableText)

    if (score > 10) {
      // Find the best matching field for the excerpt
      const excerptSource =
        fuzzyScore(query, m.agenda) >= fuzzyScore(query, m.saveName) ? m.agenda : m.saveName
      const excerpt = highlightMatch(excerptSource, query)

      results.push({
        type: 'meeting',
        id: m.id,
        title: m.saveName,
        excerpt,
        score,
        metadata: {
          status: m.status,
          meetingType: 'team',
          rounds: m.numRounds,
          messageCount: m.messages.length,
          createdAt: m.createdAt.toISOString(),
        },
      })
    }
  }

  // Process individual meetings
  for (const m of individualMeetings) {
    const agendaQuestions = (() => { try { return JSON.parse(m.agendaQuestions) } catch { return [] } })() as string[]
    const agendaRules = (() => { try { return JSON.parse(m.agendaRules) } catch { return [] } })() as string[]

    const searchableText = [
      m.agenda,
      m.saveName,
      m.summary || '',
      ...agendaQuestions,
      ...agendaRules,
      ...m.messages.map(msg => msg.message),
    ].join(' ')

    const score = bestScore(query, m.agenda, m.saveName, m.summary || '', searchableText)

    if (score > 10) {
      const excerptSource =
        fuzzyScore(query, m.agenda) >= fuzzyScore(query, m.saveName) ? m.agenda : m.saveName
      const excerpt = highlightMatch(excerptSource, query)

      results.push({
        type: 'meeting',
        id: m.id,
        title: m.saveName,
        excerpt,
        score,
        metadata: {
          status: m.status,
          meetingType: 'individual',
          messageCount: m.messages.length,
          createdAt: m.createdAt.toISOString(),
        },
      })
    }
  }

  // Sort by score descending, then by date descending
  results.sort((a, b) => b.score - a.score || (b.metadata.createdAt || '').localeCompare(a.metadata.createdAt || ''))

  return results.slice(offset, offset + limit)
}

async function searchAgents(
  query: string,
  limit: number,
  offset: number
): Promise<SearchResult[]> {
  const agents = await db.agent.findMany({
    orderBy: { updatedAt: 'desc' },
  })

  const results: SearchResult[] = []

  for (const agent of agents) {
    const score = bestScore(query, agent.title, agent.expertise, agent.goal, agent.role)

    if (score > 10) {
      const excerptSource =
        fuzzyScore(query, agent.title) >= fuzzyScore(query, agent.expertise) ? agent.title : agent.expertise
      const excerpt = highlightMatch(excerptSource, query)

      results.push({
        type: 'agent',
        id: agent.id,
        title: agent.title,
        excerpt,
        score,
        metadata: {
          color: agent.color,
          icon: agent.icon,
          expertise: agent.expertise,
          role: agent.role,
          model: agent.model,
          createdAt: agent.createdAt.toISOString(),
        },
      })
    }
  }

  results.sort((a, b) => b.score - a.score)
  return results.slice(offset, offset + limit)
}

async function searchPipelines(
  query: string,
  limit: number,
  offset: number
): Promise<SearchResult[]> {
  const pipelines = await db.pipeline.findMany({
    include: {
      stages: {
        include: {
          tasks: true,
        },
        orderBy: { order: 'asc' },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const results: SearchResult[] = []

  for (const pipeline of pipelines) {
    const stageNames = pipeline.stages.map(s => s.title).join(' ')
    const taskTitles = pipeline.stages.flatMap(s => s.tasks.map(t => t.title + ' ' + t.description)).join(' ')
    const searchableText = pipeline.name + ' ' + pipeline.description + ' ' + stageNames + ' ' + taskTitles

    const score = bestScore(query, pipeline.name, pipeline.description, searchableText)

    if (score > 10) {
      const excerptSource =
        fuzzyScore(query, pipeline.name) >= fuzzyScore(query, pipeline.description) ? pipeline.name : pipeline.description
      const excerpt = highlightMatch(excerptSource, query)

      const totalTasks = pipeline.stages.reduce((sum, s) => sum + s.tasks.length, 0)

      results.push({
        type: 'pipeline',
        id: pipeline.id,
        title: pipeline.name,
        excerpt,
        score,
        metadata: {
          description: pipeline.description,
          stageCount: pipeline.stages.length,
          taskCount: totalTasks,
          createdAt: pipeline.createdAt.toISOString(),
        },
      })
    }
  }

  results.sort((a, b) => b.score - a.score)
  return results.slice(offset, offset + limit)
}

// ============================================================
// Main Route Handler
// ============================================================

export async function GET(request: NextRequest): Promise<NextResponse<SearchResponse>> {
  const { searchParams } = new URL(request.url)

  const query = searchParams.get('q') || ''
  const typesParam = searchParams.get('types') || 'meetings,agents,pipelines'
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10) || 20, 50)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0)

  if (!query.trim()) {
    return NextResponse.json({
      results: [],
      total: 0,
      query,
      hasNotes: typesParam.includes('notes'),
    })
  }

  const types = typesParam.split(',').map(t => t.trim()) as Array<'meetings' | 'agents' | 'pipelines' | 'notes'>

  try {
    const allResults: SearchResult[] = []
    const searchPromises: Promise<SearchResult[]>[] = []

    if (types.includes('meetings')) {
      searchPromises.push(searchMeetings(query, limit, offset))
    }
    if (types.includes('agents')) {
      searchPromises.push(searchAgents(query, limit, offset))
    }
    if (types.includes('pipelines')) {
      searchPromises.push(searchPipelines(query, limit, offset))
    }

    const searchResults = await Promise.all(searchPromises)
    for (const results of searchResults) {
      allResults.push(...results)
    }

    // Sort all results by score descending
    allResults.sort((a, b) => b.score - a.score)

    // Apply global limit/offset
    const paginated = allResults.slice(offset, offset + limit)

    return NextResponse.json({
      results: paginated,
      total: allResults.length,
      query,
      hasNotes: types.includes('notes'),
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      {
        results: [],
        total: 0,
        query,
        hasNotes: types.includes('notes'),
      },
      { status: 500 }
    )
  }
}
