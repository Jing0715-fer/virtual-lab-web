import { NextRequest, NextResponse } from 'next/server'

// ============================================================
// In-memory alert rules store (simulates DB)
// ============================================================

interface AlertRule {
  id: string
  name: string
  enabled: boolean
  trigger: {
    type: 'meeting_completed' | 'meeting_duration' | 'agent_messages' | 'meeting_created' | 'pipeline_stage' | 'custom'
    condition?: string
    value?: number | string
  }
  action: {
    type: 'notification' | 'email' | 'follow_up_task' | 'meeting_notes' | 'webhook' | 'automated_analysis'
    priority?: 'low' | 'medium' | 'high' | 'urgent'
    params?: Record<string, unknown>
  }
  createdAt: string
  updatedAt: string
}

interface EnhancedNotification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  link: string | null
  createdAt: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  metadata?: Record<string, unknown>
}

// In-memory store for alert rules
const alertRules: AlertRule[] = [
  {
    id: 'rule-1',
    name: 'Notify when any meeting completes',
    enabled: true,
    trigger: { type: 'meeting_completed' },
    action: { type: 'notification', priority: 'medium' },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'rule-2',
    name: 'Alert if meeting exceeds 30 minutes',
    enabled: true,
    trigger: { type: 'meeting_duration', condition: '>', value: 30 },
    action: { type: 'notification', priority: 'high' },
    createdAt: '2024-01-02T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
  },
  {
    id: 'rule-3',
    name: 'Summary when agent sends 10+ messages',
    enabled: false,
    trigger: { type: 'agent_messages', condition: '>', value: 10 },
    action: { type: 'notification', priority: 'low' },
    createdAt: '2024-01-03T00:00:00.000Z',
    updatedAt: '2024-01-03T00:00:00.000Z',
  },
  {
    id: 'rule-4',
    name: 'Weekly digest every Monday',
    enabled: true,
    trigger: { type: 'custom', condition: 'schedule', value: 'weekly-monday' },
    action: { type: 'email', priority: 'low' },
    createdAt: '2024-01-04T00:00:00.000Z',
    updatedAt: '2024-01-04T00:00:00.000Z',
  },
  {
    id: 'rule-5',
    name: 'Urgent alert for pipeline failures',
    enabled: true,
    trigger: { type: 'pipeline_stage', condition: 'failed' },
    action: { type: 'notification', priority: 'urgent' },
    createdAt: '2024-01-05T00:00:00.000Z',
    updatedAt: '2024-01-05T00:00:00.000Z',
  },
]

// In-memory notification store with enhanced data
const notifications: EnhancedNotification[] = [
  {
    id: 'n-1', type: 'meeting_completed', title: 'Team Meeting Completed',
    message: 'Nanobody Design Review has completed with 24 messages across 6 rounds.',
    read: false, link: 'meeting-1', createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    priority: 'medium', metadata: { meetingId: 'meeting-1', participantCount: 4 },
  },
  {
    id: 'n-2', type: 'meeting_started', title: 'Individual Meeting Running',
    message: 'Molecular Analysis session with Dr. Chen has started.',
    read: false, link: 'meeting-2', createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    priority: 'low', metadata: { meetingId: 'meeting-2' },
  },
  {
    id: 'n-3', type: 'agent_message', title: 'New message from AlphaFold Agent',
    message: 'Generated 15 candidate structures with pLDDT scores above 90.',
    read: false, link: null, createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    priority: 'medium', metadata: { agentName: 'AlphaFold Agent' },
  },
  {
    id: 'n-4', type: 'mention', title: 'You were mentioned',
    message: '@researcher Please review the binding affinity data for candidate #3.',
    read: false, link: null, createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    priority: 'high', metadata: { mentionedBy: 'Dr. Chen' },
  },
  {
    id: 'n-5', type: 'export_ready', title: 'Export Ready',
    message: 'Your CSV export of meeting analytics is ready for download.',
    read: true, link: null, createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    priority: 'low', metadata: { format: 'csv' },
  },
  {
    id: 'n-6', type: 'pipeline_update', title: 'Pipeline Stage Completed',
    message: 'The "Analysis" stage of Research Pipeline has been completed.',
    read: false, link: null, createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    priority: 'medium', metadata: { pipelineName: 'Research Pipeline', stageName: 'Analysis' },
  },
  {
    id: 'n-7', type: 'reaction', title: 'New reaction on your message',
    message: 'Dr. Chen reacted with 💡 to your message about binding optimization.',
    read: true, link: null, createdAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    priority: 'low', metadata: { emoji: '💡', from: 'Dr. Chen' },
  },
  {
    id: 'n-8', type: 'milestone', title: 'Research Milestone Reached',
    message: 'Congratulations! 10 meetings completed in your research project.',
    read: false, link: null, createdAt: new Date(Date.now() - 1000 * 60 * 600).toISOString(),
    priority: 'high', metadata: { milestoneType: 'meeting_count', value: 10 },
  },
  {
    id: 'n-9', type: 'system', title: 'System Update',
    message: 'Virtual Lab has been updated with new visualization features.',
    read: true, link: null, createdAt: new Date(Date.now() - 1000 * 60 * 1200).toISOString(),
    priority: 'low', metadata: { version: '2.5.0' },
  },
  {
    id: 'n-10', type: 'meeting_completed', title: 'Individual Meeting Completed',
    message: 'Protein Stability Assessment with Scientific Critic completed in 4 rounds.',
    read: true, link: 'meeting-3', createdAt: new Date(Date.now() - 1000 * 60 * 2000).toISOString(),
    priority: 'medium', metadata: { meetingId: 'meeting-3' },
  },
  {
    id: 'n-11', type: 'agent_message', title: 'Agent Report Available',
    message: 'ML Engineer has prepared a comprehensive analysis report.',
    read: false, link: null, createdAt: new Date(Date.now() - 1000 * 60 * 2400).toISOString(),
    priority: 'medium', metadata: { agentName: 'ML Engineer' },
  },
  {
    id: 'n-12', type: 'pipeline_update', title: 'Pipeline Stage Failed',
    message: 'The "Data Collection" stage encountered an error. Review required.',
    read: false, link: null, createdAt: new Date(Date.now() - 1000 * 60 * 3600).toISOString(),
    priority: 'urgent', metadata: { pipelineName: 'Research Pipeline', stageName: 'Data Collection', error: 'timeout' },
  },
]

// GET: Fetch notifications with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const read = searchParams.get('read')
    const since = searchParams.get('since')
    const priority = searchParams.get('priority')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    let filtered = [...notifications]

    // Filter by type
    if (type) {
      filtered = filtered.filter((n) => n.type === type)
    }

    // Filter by read state
    if (read === 'true') {
      filtered = filtered.filter((n) => n.read)
    } else if (read === 'false') {
      filtered = filtered.filter((n) => !n.read)
    }

    // Filter by time since
    if (since) {
      const sinceDate = new Date(since)
      if (!isNaN(sinceDate.getTime())) {
        filtered = filtered.filter((n) => new Date(n.createdAt) >= sinceDate)
      }
    }

    // Filter by priority
    if (priority) {
      const priorities = priority.split(',')
      filtered = filtered.filter((n) => priorities.includes(n.priority))
    }

    // Sort by newest first
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Count unread before pagination
    const unreadCount = notifications.filter((n) => !n.read).length

    // Paginate
    const paginated = filtered.slice(offset, offset + limit)

    return NextResponse.json({
      notifications: paginated,
      total: filtered.length,
      unreadCount,
    }, {
      headers: {
        'X-Unread-Count': String(unreadCount),
      },
    })
  } catch (error) {
    console.error('Failed to fetch notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

// POST: Create a new alert rule or trigger a rule test
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action: actionType } = body

    // Handle rule trigger (test)
    if (actionType === 'trigger') {
      const { ruleId, testData } = body

      const rule = alertRules.find((r) => r.id === ruleId)
      if (!rule && !testData) {
        return NextResponse.json(
          { error: 'Rule not found' },
          { status: 404 }
        )
      }

      // Simulate rule evaluation
      const sampleEvent = testData || {
        type: 'meeting_completed',
        data: { duration: 35, messageCount: 24 },
      }

      const passesEvaluation = evaluateRule(rule || alertRules[0], sampleEvent)

      return NextResponse.json({
        success: true,
        triggered: passesEvaluation,
        ruleId: ruleId || alertRules[0]?.id,
        event: sampleEvent,
        evaluation: {
          matched: passesEvaluation,
          reason: passesEvaluation
            ? 'Condition matched — action would be triggered'
            : 'Condition did not match — no action triggered',
          timestamp: new Date().toISOString(),
        },
      })
    }

    // Handle rule creation
    const { name, trigger, action: ruleAction, enabled = true } = body

    if (!name || !trigger || !ruleAction) {
      return NextResponse.json(
        { error: 'Missing required fields: name, trigger, action' },
        { status: 400 }
      )
    }

    const newRule: AlertRule = {
      id: `rule-${Date.now()}`,
      name,
      enabled,
      trigger,
      action: ruleAction,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    alertRules.push(newRule)

    return NextResponse.json({ success: true, rule: newRule }, { status: 201 })
  } catch (error) {
    console.error('Failed to create rule:', error)
    return NextResponse.json(
      { error: 'Failed to create rule' },
      { status: 500 }
    )
  }
}

// PUT: Update a rule (enable/disable, edit conditions)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { ruleId, name, trigger, action: ruleAction, enabled } = body

    const ruleIndex = alertRules.findIndex((r) => r.id === ruleId)
    if (ruleIndex === -1) {
      return NextResponse.json(
        { error: 'Rule not found' },
        { status: 404 }
      )
    }

    // Update only provided fields
    const updatedRule = { ...alertRules[ruleIndex] }
    if (name !== undefined) updatedRule.name = name
    if (trigger !== undefined) updatedRule.trigger = trigger
    if (ruleAction !== undefined) updatedRule.action = ruleAction
    if (enabled !== undefined) updatedRule.enabled = enabled
    updatedRule.updatedAt = new Date().toISOString()

    alertRules[ruleIndex] = updatedRule

    return NextResponse.json({ success: true, rule: updatedRule })
  } catch (error) {
    console.error('Failed to update rule:', error)
    return NextResponse.json(
      { error: 'Failed to update rule' },
      { status: 500 }
    )
  }
}

// DELETE: Delete a rule
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ruleId = searchParams.get('id')

    if (!ruleId) {
      return NextResponse.json(
        { error: 'Rule ID is required' },
        { status: 400 }
      )
    }

    const ruleIndex = alertRules.findIndex((r) => r.id === ruleId)
    if (ruleIndex === -1) {
      return NextResponse.json(
        { error: 'Rule not found' },
        { status: 404 }
      )
    }

    const deletedRule = alertRules.splice(ruleIndex, 1)[0]

    return NextResponse.json({
      success: true,
      deletedRule,
    })
  } catch (error) {
    console.error('Failed to delete rule:', error)
    return NextResponse.json(
      { error: 'Failed to delete rule' },
      { status: 500 }
    )
  }
}

// ============================================================
// Rule evaluation helper
// ============================================================

function evaluateRule(
  rule: AlertRule,
  event: Record<string, unknown>
): boolean {
  const { trigger } = rule

  switch (trigger.type) {
    case 'meeting_completed':
      return event.type === 'meeting_completed' || event.type === 'completed'

    case 'meeting_duration': {
      const duration = (event.data as Record<string, unknown>)?.duration as number || 0
      const threshold = typeof trigger.value === 'number' ? trigger.value : 30
      if (trigger.condition === '>') return duration > threshold
      if (trigger.condition === '<') return duration < threshold
      if (trigger.condition === '>=') return duration >= threshold
      return duration === threshold
    }

    case 'agent_messages': {
      const messageCount = (event.data as Record<string, unknown>)?.messageCount as number || 0
      const threshold = typeof trigger.value === 'number' ? trigger.value : 10
      if (trigger.condition === '>') return messageCount > threshold
      if (trigger.condition === '>=') return messageCount >= threshold
      return messageCount === threshold
    }

    case 'meeting_created':
      return event.type === 'meeting_created' || event.type === 'created'

    case 'pipeline_stage':
      return event.type === 'pipeline_stage' || event.type === 'pipeline_update'

    case 'custom':
      // Custom events always evaluate to true for testing
      return true

    default:
      return false
  }
}
