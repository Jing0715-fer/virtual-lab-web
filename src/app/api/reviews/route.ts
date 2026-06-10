import { NextRequest, NextResponse } from 'next/server'

// ============================================================
// Types
// ============================================================

export interface ReviewTakeaway {
  id: string
  text: string
  priority: 'High' | 'Medium' | 'Low'
}

export interface ReviewActionItem {
  id: string
  text: string
  assignee: string
  dueDate: string
  status: 'Todo' | 'In Progress' | 'Done'
}

export interface ReviewHighlight {
  id: string
  text: string
  timestamp: string
}

export interface MeetingReview {
  id: string
  meetingId: string
  meetingTitle: string
  meetingType: 'team' | 'individual'
  meetingDate: string
  participants: string[]
  overallRating: number
  categoryRatings: {
    discussionQuality: number
    relevanceToGoal: number
    actionableOutcomes: number
    agentPerformance: number
    timeEfficiency: number
  }
  feedback: string
  takeaways: ReviewTakeaway[]
  actionItems: ReviewActionItem[]
  highlights: ReviewHighlight[]
  suggestions: string
  anonymous: boolean
  reviewerName: string
  reviewedAt: string
  createdAt: string
  updatedAt: string
}

// ============================================================
// In-memory store (auto-seeded)
// ============================================================

let reviews: MeetingReview[] = []
let seeded = false

function seedReviews(): MeetingReview[] {
  const agents = ['Dr. Chen', 'Prof. Park', 'Dr. Yamamoto', 'Dr. Kim', 'Dr. Singh']
  const teamMeetings = [
    { title: 'CRISPR Gene Therapy Protocol Review', type: 'team' as const },
    { title: 'Machine Learning Drug Discovery Sprint', type: 'team' as const },
    { title: 'Climate Model Validation Workshop', type: 'team' as const },
    { title: 'Neural Network Architecture Discussion', type: 'team' as const },
    { title: 'Protein Folding Analysis Session', type: 'team' as const },
    { title: 'Genomics Data Pipeline Review', type: 'team' as const },
    { title: 'Clinical Trial Design Meeting', type: 'team' as const },
    { title: 'Bioinformatics Tools Evaluation', type: 'team' as const },
  ]
  const individualMeetings = [
    { title: 'Literature Review: mRNA Vaccines', type: 'individual' as const },
    { title: 'Data Analysis: EEG Signal Processing', type: 'individual' as const },
    { title: 'Hypothesis Generation: Alzheimer Biomarkers', type: 'individual' as const },
    { title: 'Grant Proposal Draft Review', type: 'individual' as const },
  ]

  const allMeetings = [...teamMeetings, ...individualMeetings]
  const feedbacks = [
    'Excellent discussion with great depth. The team covered all critical aspects of the protocol and identified key areas for improvement. Very productive session.',
    'Good session overall. Some areas could have been explored more deeply. The team collaboration was effective and we reached good consensus on next steps.',
    'Average meeting. Time management could be better. Discussion quality was acceptable but lacked focus on the main objectives at times.',
    'Below average. The meeting drifted off topic several times. Action items were unclear and need better definition before next session.',
    'Outstanding work from the team. Clear objectives, excellent discussion, and actionable outcomes. One of the best meetings we have had this quarter.',
    'Very productive. The agent performance was impressive and contributed valuable insights throughout the discussion.',
    'Decent meeting but could have been more efficient. Some participants dominated the conversation while others had limited input.',
    'Great collaborative effort. The discussion was well-structured and all participants contributed meaningfully to the outcomes.',
    'Solid session with good outcomes. Would benefit from more focused agenda items and stricter time management.',
    'Impressive depth of analysis. The team showed strong domain expertise and the conclusions were well-supported by evidence.',
    'Moderate effectiveness. The meeting achieved some goals but several action items remain unresolved. Follow-up needed.',
    'Highly effective meeting. Excellent discussion quality, well-organized timeline, and all participants were engaged throughout.',
  ]

  const suggestions = [
    'Consider shorter, more focused meetings with clear pre-read materials',
    'Implement a rotating facilitator role to ensure balanced participation',
    'Use visual aids and shared documents for complex topics',
    'Schedule follow-up check-ins for unresolved action items',
    'Include domain-specific experts in future discussions',
    'Provide meeting agenda at least 24 hours in advance',
    'Use a structured decision-making framework for complex topics',
    'Allocate specific time slots for each agenda item',
    'Create a shared knowledge base for meeting outcomes',
    'Incorporate brief progress reviews at the start of each meeting',
    'Encourage pre-meeting asynchronous input via collaborative documents',
    'Use real-time polling for key decision points',
  ]

  return allMeetings.map((meeting, idx) => {
    const daysAgo = Math.floor(Math.random() * 45) + 1
    const meetingDate = new Date(Date.now() - daysAgo * 86400000)
    const numParticipants = meeting.type === 'team'
      ? Math.floor(Math.random() * 3) + 2
      : 1
    const shuffled = [...agents].sort(() => Math.random() - 0.5)
    const participants = shuffled.slice(0, numParticipants)
    const overallRating = Math.floor(Math.random() * 3) + 3
    const catRatings = {
      discussionQuality: Math.min(5, Math.max(1, overallRating + Math.floor(Math.random() * 3) - 1)),
      relevanceToGoal: Math.min(5, Math.max(1, overallRating + Math.floor(Math.random() * 3) - 1)),
      actionableOutcomes: Math.min(5, Math.max(1, overallRating + Math.floor(Math.random() * 3) - 1)),
      agentPerformance: Math.min(5, Math.max(1, overallRating + Math.floor(Math.random() * 3) - 1)),
      timeEfficiency: Math.min(5, Math.max(1, overallRating + Math.floor(Math.random() * 3) - 1)),
    }

    const numTakeaways = Math.floor(Math.random() * 4) + 1
    const takeawayPriorities: Array<'High' | 'Medium' | 'Low'> = ['High', 'Medium', 'Low']
    const takeaways = Array.from({ length: numTakeaways }, (_, ti) => ({
      id: `tk-${idx}-${ti}`,
      text: ['Key finding requires validation', 'New approach shows promise', 'Data quality needs improvement', 'Cross-team collaboration essential', 'Timeline adjustment recommended', 'Resource allocation needs review'][ti % 6],
      priority: takeawayPriorities[Math.floor(Math.random() * 3)],
    }))

    const numActions = Math.floor(Math.random() * 3) + 1
    const actionStatuses: Array<'Todo' | 'In Progress' | 'Done'> = ['Todo', 'In Progress', 'Done']
    const actionItems = Array.from({ length: numActions }, (_, ai) => ({
      id: `act-${idx}-${ai}`,
      text: ['Prepare detailed report', 'Schedule follow-up session', 'Review additional datasets', 'Update methodology document', 'Contact external collaborator'][ai % 5],
      assignee: participants[ai % participants.length],
      dueDate: new Date(Date.now() + (Math.floor(Math.random() * 14) + 1) * 86400000).toISOString().split('T')[0],
      status: actionStatuses[Math.floor(Math.random() * 3)],
    }))

    const numHighlights = Math.floor(Math.random() * 3) + 1
    const highlights = Array.from({ length: numHighlights }, (_, hi) => ({
      id: `hl-${idx}-${hi}`,
      text: ['Breakthrough insight on methodology', 'Excellent collaborative moment', 'Key decision reached', 'Creative solution proposed', 'Critical data point identified'][hi % 5],
      timestamp: `${Math.floor(Math.random() * 30) + 5}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
    }))

    return {
      id: `rev-${String(idx + 1).padStart(3, '0')}`,
      meetingId: `mtg-${String(idx + 1).padStart(3, '0')}`,
      meetingTitle: meeting.title,
      meetingType: meeting.type,
      meetingDate: meetingDate.toISOString(),
      participants,
      overallRating,
      categoryRatings: catRatings,
      feedback: feedbacks[idx % feedbacks.length],
      takeaways,
      actionItems,
      highlights,
      suggestions: suggestions[idx % suggestions.length],
      anonymous: Math.random() > 0.7,
      reviewerName: Math.random() > 0.7 ? 'Anonymous' : participants[0],
      reviewedAt: new Date(meetingDate.getTime() + 3600000).toISOString(),
      createdAt: meetingDate.toISOString(),
      updatedAt: new Date().toISOString(),
    }
  })
}

// ============================================================
// GET /api/reviews
// ============================================================

export async function GET(request: NextRequest) {
  try {
    if (!seeded) {
      reviews = seedReviews()
      seeded = true
    }

    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('mode')

    if (mode === 'stats') return handleStats()
    if (mode === 'analytics') return handleAnalytics()

    const meetingId = searchParams.get('meetingId')
    const type = searchParams.get('type')
    const minRating = searchParams.get('minRating')
    const search = searchParams.get('search')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    let filtered = [...reviews]

    if (meetingId) {
      filtered = filtered.filter(r => r.meetingId === meetingId)
    }
    if (type && type !== 'all') {
      filtered = filtered.filter(r => r.meetingType === type)
    }
    if (minRating) {
      const min = parseInt(minRating, 10)
      if (!isNaN(min)) filtered = filtered.filter(r => r.overallRating >= min)
    }
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(r =>
        r.feedback.toLowerCase().includes(q) ||
        r.meetingTitle.toLowerCase().includes(q) ||
        r.suggestions.toLowerCase().includes(q)
      )
    }
    if (dateFrom) {
      filtered = filtered.filter(r => r.meetingDate >= dateFrom)
    }
    if (dateTo) {
      filtered = filtered.filter(r => r.meetingDate <= dateTo)
    }

    filtered.sort((a, b) => new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime())

    return NextResponse.json({ reviews: filtered, total: filtered.length })
  } catch (error) {
    console.error('Failed to fetch reviews:', error)
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
  }
}

// ============================================================
// POST /api/reviews
// ============================================================

export async function POST(request: NextRequest) {
  try {
    if (!seeded) {
      reviews = seedReviews()
      seeded = true
    }

    const body = await request.json()

    const newReview: MeetingReview = {
      id: `rev-${String(reviews.length + 1).padStart(3, '0')}`,
      meetingId: body.meetingId || `mtg-${String(reviews.length + 1).padStart(3, '0')}`,
      meetingTitle: body.meetingTitle || 'Untitled Meeting',
      meetingType: body.meetingType || 'team',
      meetingDate: body.meetingDate || new Date().toISOString(),
      participants: body.participants || [],
      overallRating: body.overallRating || 3,
      categoryRatings: body.categoryRatings || {
        discussionQuality: 3,
        relevanceToGoal: 3,
        actionableOutcomes: 3,
        agentPerformance: 3,
        timeEfficiency: 3,
      },
      feedback: body.feedback || '',
      takeaways: body.takeaways || [],
      actionItems: body.actionItems || [],
      highlights: body.highlights || [],
      suggestions: body.suggestions || '',
      anonymous: body.anonymous || false,
      reviewerName: body.anonymous ? 'Anonymous' : (body.reviewerName || 'Unknown'),
      reviewedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    reviews.unshift(newReview)
    return NextResponse.json({ review: newReview }, { status: 201 })
  } catch (error) {
    console.error('Failed to create review:', error)
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 })
  }
}

// ============================================================
// PUT /api/reviews/:id
// ============================================================

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Missing review id' }, { status: 400 })
    }

    const body = await request.json()
    const index = reviews.findIndex(r => r.id === id)
    if (index === -1) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    reviews[index] = {
      ...reviews[index],
      ...body,
      id: reviews[index].id,
      updatedAt: new Date().toISOString(),
    }

    return NextResponse.json({ review: reviews[index] })
  } catch (error) {
    console.error('Failed to update review:', error)
    return NextResponse.json({ error: 'Failed to update review' }, { status: 500 })
  }
}

// ============================================================
// DELETE /api/reviews/:id
// ============================================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Missing review id' }, { status: 400 })
    }

    const index = reviews.findIndex(r => r.id === id)
    if (index === -1) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    reviews.splice(index, 1)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete review:', error)
    return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 })
  }
}

// ============================================================
// GET /api/reviews?mode=stats
// ============================================================

function handleStats() {
  if (reviews.length === 0) {
    return NextResponse.json({
      totalReviews: 0,
      avgRating: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      categoryAverages: {
        discussionQuality: 0,
        relevanceToGoal: 0,
        actionableOutcomes: 0,
        agentPerformance: 0,
        timeEfficiency: 0,
      },
      topRated: [],
      lowestRated: [],
    })
  }

  const avgRating = Math.round((reviews.reduce((s, r) => s + r.overallRating, 0) / reviews.length) * 10) / 10

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  reviews.forEach(r => { distribution[r.overallRating] = (distribution[r.overallRating] || 0) + 1 })

  const catKeys = ['discussionQuality', 'relevanceToGoal', 'actionableOutcomes', 'agentPerformance', 'timeEfficiency'] as const
  const categoryAverages: Record<string, number> = {}
  catKeys.forEach(key => {
    const sum = reviews.reduce((s, r) => s + r.categoryRatings[key], 0)
    categoryAverages[key] = Math.round((sum / reviews.length) * 10) / 10
  })

  const sorted = [...reviews].sort((a, b) => b.overallRating - a.overallRating)
  const topRated = sorted.slice(0, 5).map(r => ({
    id: r.id,
    meetingTitle: r.meetingTitle,
    rating: r.overallRating,
    type: r.meetingType,
  }))

  const lowestRated = sorted.slice(-3).reverse().map(r => ({
    id: r.id,
    meetingTitle: r.meetingTitle,
    rating: r.overallRating,
    type: r.meetingType,
  }))

  const trendData = [...reviews]
    .sort((a, b) => new Date(a.reviewedAt).getTime() - new Date(b.reviewedAt).getTime())
    .slice(-10)
    .map(r => ({
      date: r.reviewedAt.split('T')[0],
      rating: r.overallRating,
    }))

  return NextResponse.json({
    totalReviews: reviews.length,
    avgRating,
    distribution,
    categoryAverages,
    topRated,
    lowestRated,
    trendData,
  })
}

// ============================================================
// GET /api/reviews?mode=analytics
// ============================================================

function handleAnalytics() {
  if (reviews.length === 0) {
    return NextResponse.json({
      completionRate: 0,
      sentiment: { positive: 0, neutral: 0, negative: 0 },
      wordFrequencies: [],
      agentScores: [],
      typeComparison: { team: { count: 0, avgRating: 0 }, individual: { count: 0, avgRating: 0 } },
      reviewActivity: [],
      heatmap: [],
    })
  }

  const positiveWords = new Set([
    'good', 'great', 'excellent', 'success', 'achieve', 'improve', 'positive',
    'best', 'well', 'effective', 'promising', 'strong', 'benefit', 'helpful',
    'innovative', 'robust', 'significant', 'important', 'efficient', 'impressive',
    'outstanding', 'productive', 'valuable', 'impressive', 'breakthrough',
  ])
  const negativeWords = new Set([
    'bad', 'fail', 'poor', 'problem', 'issue', 'difficult', 'challenge',
    'negative', 'worst', 'lack', 'weak', 'limit', 'risk', 'concern', 'error',
    'unclear', 'uncertain', 'limited', 'complex', 'slow', 'complicated',
  ])

  let posCount = 0
  let negCount = 0
  let totalWords = 0
  const wordFreq: Record<string, number> = {}
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
    'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'that', 'this', 'from', 'into', 'about', 'it', 'its', 'we', 'our',
    'not', 'no', 'if', 'as', 'so', 'than', 'also', 'just', 'more', 'all',
    'very', 'much', 'many', 'some', 'any', 'each', 'other', 'how', 'which',
    'what', 'when', 'where', 'who', 'you', 'your', 'me', 'my',
  ])

  reviews.forEach(r => {
    const allText = `${r.feedback} ${r.suggestions} ${r.takeaways.map(t => t.text).join(' ')}`
    const words = allText.toLowerCase().split(/\W+/).filter(w => w.length > 2)
    words.forEach(w => {
      totalWords++
      if (positiveWords.has(w)) posCount++
      if (negativeWords.has(w)) negCount++
      if (!stopWords.has(w)) {
        wordFreq[w] = (wordFreq[w] || 0) + 1
      }
    })
  })

  const sentiment = {
    positive: totalWords > 0 ? Math.round((posCount / totalWords) * 100) : 0,
    neutral: totalWords > 0 ? Math.round(((totalWords - posCount - negCount) / totalWords) * 100) : 100,
    negative: totalWords > 0 ? Math.round((negCount / totalWords) * 100) : 0,
  }

  const wordFrequencies = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([word, count]) => ({ word, count }))

  const agentScoreMap: Record<string, { total: number; count: number }> = {}
  reviews.forEach(r => {
    r.participants.forEach(agent => {
      if (!agentScoreMap[agent]) agentScoreMap[agent] = { total: 0, count: 0 }
      agentScoreMap[agent].total += r.overallRating
      agentScoreMap[agent].count++
    })
  })

  const agentScores = Object.entries(agentScoreMap)
    .map(([name, data]) => ({
      name,
      avgRating: Math.round((data.total / data.count) * 10) / 10,
      meetingCount: data.count,
    }))
    .sort((a, b) => b.avgRating - a.avgRating)

  const teamReviews = reviews.filter(r => r.meetingType === 'team')
  const individualReviews = reviews.filter(r => r.meetingType === 'individual')

  const typeComparison = {
    team: {
      count: teamReviews.length,
      avgRating: teamReviews.length > 0
        ? Math.round((teamReviews.reduce((s, r) => s + r.overallRating, 0) / teamReviews.length) * 10) / 10
        : 0,
    },
    individual: {
      count: individualReviews.length,
      avgRating: individualReviews.length > 0
        ? Math.round((individualReviews.reduce((s, r) => s + r.overallRating, 0) / individualReviews.length) * 10) / 10
        : 0,
    },
  }

  const reviewActivity = reviews
    .sort((a, b) => new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime())
    .slice(0, 15)
    .map(r => ({
      date: r.reviewedAt,
      meetingTitle: r.meetingTitle,
      rating: r.overallRating,
      reviewer: r.reviewerName,
    }))

  const categories = ['discussionQuality', 'relevanceToGoal', 'actionableOutcomes', 'agentPerformance', 'timeEfficiency'] as const
  const periods = ['Last 7d', 'Last 14d', 'Last 30d', 'Older']
  const now = Date.now()

  const heatmap = categories.map(cat => {
    return periods.map(period => {
      let filteredReviews: MeetingReview[]
      if (period === 'Last 7d') filteredReviews = reviews.filter(r => now - new Date(r.reviewedAt).getTime() < 7 * 86400000)
      else if (period === 'Last 14d') filteredReviews = reviews.filter(r => { const age = now - new Date(r.reviewedAt).getTime(); return age >= 7 * 86400000 && age < 14 * 86400000 })
      else if (period === 'Last 30d') filteredReviews = reviews.filter(r => { const age = now - new Date(r.reviewedAt).getTime(); return age >= 14 * 86400000 && age < 30 * 86400000 })
      else filteredReviews = reviews.filter(r => now - new Date(r.reviewedAt).getTime() >= 30 * 86400000)

      const avg = filteredReviews.length > 0
        ? Math.round(filteredReviews.reduce((s, r) => s + r.categoryRatings[cat], 0) / filteredReviews.length)
        : 0
      return { category: cat, period, avg }
    })
  }).flat()

  return NextResponse.json({
    completionRate: 100,
    sentiment,
    wordFrequencies,
    agentScores,
    typeComparison,
    reviewActivity,
    heatmap,
  })
}
