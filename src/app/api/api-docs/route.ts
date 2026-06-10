import { NextResponse } from 'next/server';

// ============================================================
// Types
// ============================================================

interface ApiParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

interface ApiBodyField {
  name: string;
  type: string;
  required: boolean;
  description: string;
  default?: string;
}

interface ApiResponseExample {
  status: number;
  description: string;
  body: Record<string, unknown>;
}

interface ApiEndpoint {
  id: string;
  method: string;
  path: string;
  summary: string;
  description: string;
  category: string;
  parameters: ApiParameter[];
  bodyFields: ApiBodyField[];
  responses: ApiResponseExample[];
}

interface ApiCategory {
  name: string;
  icon: string;
  color: string;
  endpoints: ApiEndpoint[];
}

// ============================================================
// API Documentation Registry — All 40+ endpoints
// ============================================================

function generateApiDocs(): ApiCategory[] {
  const categories: ApiCategory[] = [
    // --------------------------------------------------------
    // Core
    // --------------------------------------------------------
    {
      name: 'Core',
      icon: ' zap',
      color: '#10b981',
      endpoints: [
        {
          id: 'root',
          method: 'GET',
          path: '/api',
          summary: 'Health Check',
          description: 'Returns a simple health check message confirming the API is running.',
          category: 'Core',
          parameters: [],
          bodyFields: [],
          responses: [
            { status: 200, description: 'API is healthy', body: { message: 'Hello, world!' } },
          ],
        },
      ],
    },
    // --------------------------------------------------------
    // Agents
    // --------------------------------------------------------
    {
      name: 'Agents',
      icon: ' bot',
      color: '#6366f1',
      endpoints: [
        {
          id: 'agents-list',
          method: 'GET',
          path: '/api/agents',
          summary: 'List All Agents',
          description: 'Retrieves a list of all research agents in the system, ordered by creation date descending.',
          category: 'Agents',
          parameters: [],
          bodyFields: [],
          responses: [
            { status: 200, description: 'Array of agent objects', body: { id: 'uuid', title: 'Principal Investigator', expertise: '...', goal: '...', role: '...', model: 'gpt-4o', color: '#6366f1', icon: 'crown', createdAt: '2025-01-01T00:00:00.000Z' } },
          ],
        },
        {
          id: 'agents-create',
          method: 'POST',
          path: '/api/agents',
          summary: 'Create Agent',
          description: 'Creates a new AI research agent with the specified attributes. All fields except model, color, and icon are required.',
          category: 'Agents',
          parameters: [],
          bodyFields: [
            { name: 'title', type: 'string', required: true, description: 'Agent display name', default: '—' },
            { name: 'expertise', type: 'string', required: true, description: 'Agent area of expertise', default: '—' },
            { name: 'goal', type: 'string', required: true, description: 'Agent goal or objective', default: '—' },
            { name: 'role', type: 'string', required: true, description: 'Agent role in discussions', default: '—' },
            { name: 'model', type: 'string', required: false, description: 'LLM model to use', default: 'gpt-4o' },
            { name: 'color', type: 'string', required: false, description: 'Display color hex', default: '#6366f1' },
            { name: 'icon', type: 'string', required: false, description: 'Icon identifier', default: 'bot' },
          ],
          responses: [
            { status: 201, description: 'Agent created successfully', body: { id: 'uuid', title: 'New Agent', expertise: '...', goal: '...', role: '...' } },
            { status: 400, description: 'Missing required fields', body: { error: 'title, expertise, goal, and role are required' } },
          ],
        },
        {
          id: 'agents-get',
          method: 'GET',
          path: '/api/agents/[id]',
          summary: 'Get Agent by ID',
          description: 'Retrieves a single agent by its unique identifier, including related meetings.',
          category: 'Agents',
          parameters: [
            { name: 'id', type: 'string (path)', required: true, description: 'Agent UUID' },
          ],
          bodyFields: [],
          responses: [
            { status: 200, description: 'Agent with meetings', body: { id: 'uuid', title: 'PI', teamLeadMeetings: [], teamMemberMeetings: [], individualMeetings: [] } },
            { status: 404, description: 'Agent not found', body: { error: 'Agent not found' } },
          ],
        },
        {
          id: 'agents-update',
          method: 'PUT',
          path: '/api/agents/[id]',
          summary: 'Update Agent',
          description: 'Updates an existing agent. Only provided fields will be modified.',
          category: 'Agents',
          parameters: [
            { name: 'id', type: 'string (path)', required: true, description: 'Agent UUID' },
          ],
          bodyFields: [
            { name: 'title', type: 'string', required: false, description: 'New agent title' },
            { name: 'expertise', type: 'string', required: false, description: 'New expertise' },
            { name: 'goal', type: 'string', required: false, description: 'New goal' },
            { name: 'role', type: 'string', required: false, description: 'New role' },
            { name: 'model', type: 'string', required: false, description: 'New LLM model' },
            { name: 'color', type: 'string', required: false, description: 'New display color' },
            { name: 'icon', type: 'string', required: false, description: 'New icon' },
          ],
          responses: [
            { status: 200, description: 'Agent updated', body: { id: 'uuid', title: 'Updated Agent', ...{} } },
            { status: 404, description: 'Agent not found', body: { error: 'Agent not found' } },
          ],
        },
        {
          id: 'agents-delete',
          method: 'DELETE',
          path: '/api/agents/[id]',
          summary: 'Delete Agent',
          description: 'Permanently deletes an agent from the system.',
          category: 'Agents',
          parameters: [
            { name: 'id', type: 'string (path)', required: true, description: 'Agent UUID' },
          ],
          bodyFields: [],
          responses: [
            { status: 200, description: 'Agent deleted', body: { success: true } },
            { status: 404, description: 'Agent not found', body: { error: 'Agent not found' } },
          ],
        },
        {
          id: 'agents-profile',
          method: 'GET',
          path: '/api/agents/[id]/profile',
          summary: 'Get Agent Profile',
          description: 'Retrieves detailed profile information for an agent, including performance metrics and collaboration data.',
          category: 'Agents',
          parameters: [
            { name: 'id', type: 'string (path)', required: true, description: 'Agent UUID' },
          ],
          bodyFields: [],
          responses: [
            { status: 200, description: 'Agent profile data', body: { id: 'uuid', title: 'PI', meetingCount: 12, messageCount: 84, avgResponseLength: 245 } },
            { status: 404, description: 'Agent not found', body: { error: 'Agent not found' } },
          ],
        },
        {
          id: 'agents-profile-update',
          method: 'PUT',
          path: '/api/agents/[id]/profile',
          summary: 'Update Agent Profile',
          description: 'Updates additional profile fields for an agent beyond the base agent fields.',
          category: 'Agents',
          parameters: [
            { name: 'id', type: 'string (path)', required: true, description: 'Agent UUID' },
          ],
          bodyFields: [
            { name: 'bio', type: 'string', required: false, description: 'Agent biography' },
            { name: 'specialization', type: 'string', required: false, description: 'Research specialization' },
          ],
          responses: [
            { status: 200, description: 'Profile updated', body: { success: true, id: 'uuid' } },
          ],
        },
        {
          id: 'agents-persona',
          method: 'GET',
          path: '/api/agents/[id]/persona',
          summary: 'Get Agent Persona',
          description: 'Retrieves the personality configuration and behavioral traits for an agent.',
          category: 'Agents',
          parameters: [
            { name: 'id', type: 'string (path)', required: true, description: 'Agent UUID' },
          ],
          bodyFields: [],
          responses: [
            { status: 200, description: 'Agent persona config', body: { id: 'uuid', personalityTraits: { openness: 0.8, conscientiousness: 0.7 }, communicationStyle: 'formal' } },
          ],
        },
        {
          id: 'agents-persona-update',
          method: 'PUT',
          path: '/api/agents/[id]/persona',
          summary: 'Update Agent Persona',
          description: 'Updates the personality traits and communication style of an agent.',
          category: 'Agents',
          parameters: [
            { name: 'id', type: 'string (path)', required: true, description: 'Agent UUID' },
          ],
          bodyFields: [
            { name: 'personalityTraits', type: 'object', required: false, description: 'Big Five personality scores' },
            { name: 'communicationStyle', type: 'string', required: false, description: 'formal | casual | technical' },
          ],
          responses: [
            { status: 200, description: 'Persona updated', body: { success: true } },
          ],
        },
        {
          id: 'agents-chat',
          method: 'POST',
          path: '/api/agents/[id]/chat',
          summary: 'Chat with Agent',
          description: 'Sends a message to an agent and receives an AI-generated response. Used for one-on-one conversations.',
          category: 'Agents',
          parameters: [
            { name: 'id', type: 'string (path)', required: true, description: 'Agent UUID' },
          ],
          bodyFields: [
            { name: 'message', type: 'string', required: true, description: 'User message to send' },
            { name: 'context', type: 'string', required: false, description: 'Optional conversation context' },
            { name: 'temperature', type: 'number', required: false, description: 'Response creativity', default: '0.7' },
          ],
          responses: [
            { status: 200, description: 'Agent response', body: { response: 'Based on my analysis...', agentName: 'PI', timestamp: '2025-01-01T00:00:00.000Z' } },
          ],
        },
      ],
    },
    // --------------------------------------------------------
    // Meetings
    // --------------------------------------------------------
    {
      name: 'Meetings',
      icon: ' users',
      color: '#06b6d4',
      endpoints: [
        {
          id: 'meetings-list',
          method: 'GET',
          path: '/api/meetings',
          summary: 'List All Meetings',
          description: 'Returns all team and individual meetings with associated agents and messages, sorted by creation date.',
          category: 'Meetings',
          parameters: [],
          bodyFields: [],
          responses: [
            { status: 200, description: 'Array of meetings', body: { id: 'uuid', type: 'team', agenda: '...', status: 'completed', teamLead: {}, teamMembers: [], messages: [] } },
          ],
        },
        {
          id: 'meetings-create',
          method: 'POST',
          path: '/api/meetings',
          summary: 'Create Meeting',
          description: 'Creates a new team or individual meeting with specified configuration.',
          category: 'Meetings',
          parameters: [],
          bodyFields: [
            { name: 'type', type: 'string', required: true, description: '"team" or "individual"' },
            { name: 'agenda', type: 'string', required: true, description: 'Meeting agenda text' },
            { name: 'agendaQuestions', type: 'string[]', required: false, description: 'Agenda questions array', default: '[]' },
            { name: 'agendaRules', type: 'string[]', required: false, description: 'Agenda rules array', default: '[]' },
            { name: 'numRounds', type: 'number', required: false, description: 'Number of discussion rounds', default: '3' },
            { name: 'temperature', type: 'number', required: false, description: 'LLM temperature', default: '0.2' },
            { name: 'teamLeadId', type: 'string', required: true, description: 'Team lead agent ID (team only)' },
            { name: 'teamMemberIds', type: 'string[]', required: false, description: 'Team member agent IDs', default: '[]' },
            { name: 'teamMemberId', type: 'string', required: true, description: 'Member agent ID (individual only)' },
            { name: 'saveName', type: 'string', required: false, description: 'Meeting save name', default: '"discussion"' },
          ],
          responses: [
            { status: 201, description: 'Meeting created', body: { id: 'uuid', type: 'team', agenda: '...' } },
            { status: 400, description: 'Invalid input', body: { error: 'type must be "team" or "individual"' } },
          ],
        },
        {
          id: 'meetings-get',
          method: 'GET',
          path: '/api/meetings/[id]',
          summary: 'Get Meeting',
          description: 'Retrieves a single meeting by ID with all messages and participant data.',
          category: 'Meetings',
          parameters: [
            { name: 'id', type: 'string (path)', required: true, description: 'Meeting UUID' },
          ],
          bodyFields: [],
          responses: [
            { status: 200, description: 'Meeting details', body: { id: 'uuid', agenda: '...', messages: [], status: 'completed' } },
            { status: 404, description: 'Meeting not found', body: { error: 'Meeting not found' } },
          ],
        },
        {
          id: 'meetings-delete',
          method: 'DELETE',
          path: '/api/meetings/[id]',
          summary: 'Delete Meeting',
          description: 'Deletes a meeting and all associated messages.',
          category: 'Meetings',
          parameters: [
            { name: 'id', type: 'string (path)', required: true, description: 'Meeting UUID' },
          ],
          bodyFields: [],
          responses: [
            { status: 200, description: 'Meeting deleted', body: { success: true } },
            { status: 404, description: 'Meeting not found', body: { error: 'Meeting not found' } },
          ],
        },
        {
          id: 'meetings-run',
          method: 'POST',
          path: '/api/meetings/[id]/run',
          summary: 'Run Meeting',
          description: 'Starts executing a meeting discussion, generating AI agent messages for each round.',
          category: 'Meetings',
          parameters: [
            { name: 'id', type: 'string (path)', required: true, description: 'Meeting UUID' },
          ],
          bodyFields: [
            { name: 'maxRounds', type: 'number', required: false, description: 'Override max rounds', default: '3' },
          ],
          responses: [
            { status: 200, description: 'Meeting execution started', body: { meetingId: 'uuid', status: 'running', rounds: 3 } },
          ],
        },
        {
          id: 'meetings-stream',
          method: 'GET',
          path: '/api/meetings/[id]/stream',
          summary: 'Stream Meeting',
          description: 'Streams real-time meeting messages using Server-Sent Events as the meeting runs.',
          category: 'Meetings',
          parameters: [
            { name: 'id', type: 'string (path)', required: true, description: 'Meeting UUID' },
          ],
          bodyFields: [],
          responses: [
            { status: 200, description: 'SSE stream of messages', body: { event: 'message', data: { agentName: 'PI', message: '...', roundIndex: 0 } } },
          ],
        },
        {
          id: 'meetings-messages',
          method: 'GET',
          path: '/api/meetings/[id]/messages',
          summary: 'Get Meeting Messages',
          description: 'Retrieves all messages for a specific meeting, ordered chronologically.',
          category: 'Meetings',
          parameters: [
            { name: 'id', type: 'string (path)', required: true, description: 'Meeting UUID' },
          ],
          bodyFields: [],
          responses: [
            { status: 200, description: 'Array of messages', body: { id: 'uuid', agentName: 'PI', message: '...', roundIndex: 0 } },
          ],
        },
        {
          id: 'meetings-messages-create',
          method: 'POST',
          path: '/api/meetings/[id]/messages',
          summary: 'Add Message to Meeting',
          description: 'Adds a user message to an existing meeting. The message appears as "User" in the discussion.',
          category: 'Meetings',
          parameters: [
            { name: 'id', type: 'string (path)', required: true, description: 'Meeting UUID' },
          ],
          bodyFields: [
            { name: 'message', type: 'string', required: true, description: 'Message content' },
          ],
          responses: [
            { status: 201, description: 'Message added', body: { id: 'uuid', agentName: 'User', message: '...' } },
          ],
        },
        {
          id: 'meetings-message-react',
          method: 'POST',
          path: '/api/meetings/[id]/messages/[msgId]/react',
          summary: 'React to Message',
          description: 'Adds a reaction emoji to a specific message in a meeting.',
          category: 'Meetings',
          parameters: [
            { name: 'id', type: 'string (path)', required: true, description: 'Meeting UUID' },
            { name: 'msgId', type: 'string (path)', required: true, description: 'Message UUID' },
          ],
          bodyFields: [
            { name: 'emoji', type: 'string', required: true, description: 'Reaction emoji' },
          ],
          responses: [
            { status: 200, description: 'Reaction added', body: { success: true, emoji: '👍' } },
          ],
        },
        {
          id: 'meetings-compare',
          method: 'POST',
          path: '/api/meetings/compare',
          summary: 'Compare Meetings',
          description: 'Compares two meetings side by side, analyzing differences in discussion, sentiment, and outcomes.',
          category: 'Meetings',
          parameters: [],
          bodyFields: [
            { name: 'meetingA', type: 'string', required: true, description: 'First meeting ID' },
            { name: 'meetingB', type: 'string', required: true, description: 'Second meeting ID' },
          ],
          responses: [
            { status: 200, description: 'Comparison results', body: { meetingA: { messageCount: 12 }, meetingB: { messageCount: 8 }, differences: ['...'] } },
          ],
        },
        {
          id: 'meetings-timeline',
          method: 'GET',
          path: '/api/meetings/timeline',
          summary: 'Meeting Timeline',
          description: 'Returns a chronological timeline of all meetings with key events and milestones.',
          category: 'Meetings',
          parameters: [
            { name: 'days', type: 'number', required: false, description: 'Number of days to look back', default: '30' },
            { name: 'type', type: 'string', required: false, description: 'Filter by meeting type', default: 'all' },
          ],
          bodyFields: [],
          responses: [
            { status: 200, description: 'Timeline events', body: { events: [{ date: '2025-01-01', type: 'meeting_created', meetingId: 'uuid', title: '...' }] } },
          ],
        },
      ],
    },
    // --------------------------------------------------------
    // Analytics
    // --------------------------------------------------------
    {
      name: 'Analytics',
      icon: ' bar-chart-3',
      color: '#f59e0b',
      endpoints: [
        {
          id: 'analytics',
          method: 'GET',
          path: '/api/analytics',
          summary: 'Get Analytics',
          description: 'Returns comprehensive analytics data including meeting activity by day, agent participation, collaboration network, message timeline, and workflow progress.',
          category: 'Analytics',
          parameters: [],
          bodyFields: [],
          responses: [
            { status: 200, description: 'Full analytics payload', body: { meetingsByDay: [], agentParticipation: [], collaborationNetwork: { nodes: [], edges: [] }, workflowProgress: {} } },
          ],
        },
        {
          id: 'meeting-analytics',
          method: 'GET',
          path: '/api/meeting-analytics',
          summary: 'Meeting Analytics',
          description: 'Returns detailed analytics for meetings including duration distributions, completion rates, and activity patterns.',
          category: 'Analytics',
          parameters: [
            { name: 'period', type: 'string', required: false, description: 'Time period (7d, 30d, 90d)', default: '7d' },
          ],
          bodyFields: [],
          responses: [
            { status: 200, description: 'Meeting analytics', body: { avgDuration: 240, completionRate: 0.85, totalRounds: 48 } },
          ],
        },
        {
          id: 'meeting-insights',
          method: 'GET',
          path: '/api/meeting-insights',
          summary: 'Meeting Insights',
          description: 'Generates AI-powered insights and summaries across all meetings, identifying key findings and collaboration patterns.',
          category: 'Analytics',
          parameters: [
            { name: 'meetingId', type: 'string', required: false, description: 'Optional specific meeting ID' },
          ],
          bodyFields: [],
          responses: [
            { status: 200, description: 'Insights data', body: { keyFindings: ['Collaboration score improved by 12%'], suggestions: ['Schedule weekly review sessions'] } },
          ],
        },
        {
          id: 'agent-insights',
          method: 'GET',
          path: '/api/agent-insights',
          summary: 'Agent Insights',
          description: 'Returns performance insights for all agents including response quality, participation rates, and collaboration metrics.',
          category: 'Analytics',
          parameters: [],
          bodyFields: [],
          responses: [
            { status: 200, description: 'Agent insights', body: { agents: [{ id: 'uuid', name: 'PI', responseQuality: 0.92, participationRate: 0.85 }] } },
          ],
        },
        {
          id: 'live-metrics',
          method: 'GET',
          path: '/api/live-metrics',
          summary: 'Live Metrics',
          description: 'Returns real-time platform metrics including active meetings, message throughput, and system health.',
          category: 'Analytics',
          parameters: [],
          bodyFields: [],
          responses: [
            { status: 200, description: 'Live metrics', body: { activeMeetings: 2, messagesPerMinute: 5, activeAgents: 4, systemHealth: 'healthy' } },
          ],
        },
        {
          id: 'visualization-data',
          method: 'GET',
          path: '/api/visualization-data',
          summary: 'Visualization Data',
          description: 'Returns pre-computed data for various visualization components like network graphs, heatmaps, and charts.',
          category: 'Analytics',
          parameters: [
            { name: 'type', type: 'string', required: false, description: 'Visualization type', default: 'all' },
          ],
          bodyFields: [],
          responses: [
            { status: 200, description: 'Visualization datasets', body: { networkGraph: { nodes: [], edges: [] }, heatmap: { data: [] } } },
          ],
        },
      ],
    },
    // --------------------------------------------------------
    // Pipelines
    // --------------------------------------------------------
    {
      name: 'Pipelines',
      icon: ' git-branch',
      color: '#8b5cf6',
      endpoints: [
        {
          id: 'pipelines-list',
          method: 'GET',
          path: '/api/pipelines',
          summary: 'List Pipelines',
          description: 'Returns all pipelines with their stages and tasks, ordered by creation date.',
          category: 'Pipelines',
          parameters: [],
          bodyFields: [],
          responses: [
            { status: 200, description: 'Array of pipelines', body: { id: 'uuid', name: 'Research Pipeline', stages: [{ title: 'Hypothesis', tasks: [] }] } },
          ],
        },
        {
          id: 'pipelines-create',
          method: 'POST',
          path: '/api/pipelines',
          summary: 'Create Pipeline',
          description: 'Creates a new pipeline with optional template stages (research, development, or blank).',
          category: 'Pipelines',
          parameters: [],
          bodyFields: [
            { name: 'name', type: 'string', required: true, description: 'Pipeline name' },
            { name: 'description', type: 'string', required: false, description: 'Pipeline description' },
            { name: 'template', type: 'string', required: false, description: '"research" | "development" | "blank"', default: '"blank"' },
          ],
          responses: [
            { status: 201, description: 'Pipeline created', body: { id: 'uuid', name: 'Research', stages: [] } },
            { status: 400, description: 'Name required', body: { error: 'Name is required' } },
          ],
        },
        {
          id: 'pipelines-get',
          method: 'GET',
          path: '/api/pipelines/[id]',
          summary: 'Get Pipeline',
          description: 'Retrieves a single pipeline with all its stages and tasks.',
          category: 'Pipelines',
          parameters: [
            { name: 'id', type: 'string (path)', required: true, description: 'Pipeline UUID' },
          ],
          bodyFields: [],
          responses: [
            { status: 200, description: 'Pipeline with stages', body: { id: 'uuid', name: '...', stages: [] } },
            { status: 404, description: 'Not found', body: { error: 'Pipeline not found' } },
          ],
        },
        {
          id: 'pipelines-update',
          method: 'PUT',
          path: '/api/pipelines/[id]',
          summary: 'Update Pipeline',
          description: 'Updates pipeline name and description.',
          category: 'Pipelines',
          parameters: [
            { name: 'id', type: 'string (path)', required: true, description: 'Pipeline UUID' },
          ],
          bodyFields: [
            { name: 'name', type: 'string', required: false, description: 'New name' },
            { name: 'description', type: 'string', required: false, description: 'New description' },
          ],
          responses: [
            { status: 200, description: 'Pipeline updated', body: { id: 'uuid', name: 'Updated' } },
          ],
        },
        {
          id: 'pipelines-delete',
          method: 'DELETE',
          path: '/api/pipelines/[id]',
          summary: 'Delete Pipeline',
          description: 'Deletes a pipeline and all associated stages and tasks.',
          category: 'Pipelines',
          parameters: [
            { name: 'id', type: 'string (path)', required: true, description: 'Pipeline UUID' },
          ],
          bodyFields: [],
          responses: [
            { status: 200, description: 'Pipeline deleted', body: { success: true } },
          ],
        },
        {
          id: 'pipelines-templates',
          method: 'GET',
          path: '/api/pipelines/templates',
          summary: 'Get Pipeline Templates',
          description: 'Returns available pipeline templates with their default stage configurations.',
          category: 'Pipelines',
          parameters: [],
          bodyFields: [],
          responses: [
            { status: 200, description: 'Template list', body: { templates: [{ id: 'research', name: 'Research', stages: ['Hypothesis', 'Experiment'] }] } },
          ],
        },
        {
          id: 'pipelines-stages-list',
          method: 'GET',
          path: '/api/pipelines/[id]/stages',
          summary: 'List Pipeline Stages',
          description: 'Returns all stages for a pipeline with their tasks.',
          category: 'Pipelines',
          parameters: [
            { name: 'id', type: 'string (path)', required: true, description: 'Pipeline UUID' },
          ],
          bodyFields: [],
          responses: [
            { status: 200, description: 'Array of stages', body: { id: 'uuid', title: 'Hypothesis', order: 0, tasks: [] } },
          ],
        },
        {
          id: 'pipelines-stages-create',
          method: 'POST',
          path: '/api/pipelines/[id]/stages',
          summary: 'Create Pipeline Stage',
          description: 'Adds a new stage to a pipeline.',
          category: 'Pipelines',
          parameters: [
            { name: 'id', type: 'string (path)', required: true, description: 'Pipeline UUID' },
          ],
          bodyFields: [
            { name: 'title', type: 'string', required: true, description: 'Stage title' },
            { name: 'color', type: 'string', required: false, description: 'Stage color', default: '#3b82f6' },
            { name: 'order', type: 'number', required: false, description: 'Stage order index' },
          ],
          responses: [
            { status: 201, description: 'Stage created', body: { id: 'uuid', title: 'New Stage' } },
          ],
        },
        {
          id: 'pipelines-stages-update',
          method: 'PUT',
          path: '/api/pipelines/[id]/stages/[stageId]',
          summary: 'Update Stage',
          description: 'Updates a pipeline stage configuration.',
          category: 'Pipelines',
          parameters: [
            { name: 'id', type: 'string (path)', required: true, description: 'Pipeline UUID' },
            { name: 'stageId', type: 'string (path)', required: true, description: 'Stage UUID' },
          ],
          bodyFields: [
            { name: 'title', type: 'string', required: false, description: 'New title' },
            { name: 'color', type: 'string', required: false, description: 'New color' },
            { name: 'order', type: 'number', required: false, description: 'New order' },
          ],
          responses: [
            { status: 200, description: 'Stage updated', body: { success: true } },
          ],
        },
        {
          id: 'pipelines-stages-delete',
          method: 'DELETE',
          path: '/api/pipelines/[id]/stages/[stageId]',
          summary: 'Delete Stage',
          description: 'Deletes a stage and all its tasks from a pipeline.',
          category: 'Pipelines',
          parameters: [
            { name: 'id', type: 'string (path)', required: true, description: 'Pipeline UUID' },
            { name: 'stageId', type: 'string (path)', required: true, description: 'Stage UUID' },
          ],
          bodyFields: [],
          responses: [
            { status: 200, description: 'Stage deleted', body: { success: true } },
          ],
        },
        {
          id: 'pipelines-tasks-list',
          method: 'GET',
          path: '/api/pipelines/[id]/stages/[stageId]/tasks',
          summary: 'List Stage Tasks',
          description: 'Returns all tasks within a specific stage.',
          category: 'Pipelines',
          parameters: [
            { name: 'id', type: 'string (path)', required: true, description: 'Pipeline UUID' },
            { name: 'stageId', type: 'string (path)', required: true, description: 'Stage UUID' },
          ],
          bodyFields: [],
          responses: [
            { status: 200, description: 'Array of tasks', body: { id: 'uuid', title: 'Task', status: 'todo' } },
          ],
        },
        {
          id: 'pipelines-tasks-create',
          method: 'POST',
          path: '/api/pipelines/[id]/stages/[stageId]/tasks',
          summary: 'Create Task',
          description: 'Creates a new task within a pipeline stage.',
          category: 'Pipelines',
          parameters: [
            { name: 'id', type: 'string (path)', required: true, description: 'Pipeline UUID' },
            { name: 'stageId', type: 'string (path)', required: true, description: 'Stage UUID' },
          ],
          bodyFields: [
            { name: 'title', type: 'string', required: true, description: 'Task title' },
            { name: 'description', type: 'string', required: false, description: 'Task description' },
            { name: 'assigneeId', type: 'string', required: false, description: 'Assigned agent UUID' },
          ],
          responses: [
            { status: 201, description: 'Task created', body: { id: 'uuid', title: 'New Task' } },
          ],
        },
        {
          id: 'pipelines-tasks-update',
          method: 'PUT',
          path: '/api/pipelines/[id]/stages/[stageId]/tasks/[taskId]',
          summary: 'Update Task',
          description: 'Updates task properties like title, description, status, and assignee.',
          category: 'Pipelines',
          parameters: [
            { name: 'id', type: 'string (path)', required: true, description: 'Pipeline UUID' },
            { name: 'stageId', type: 'string (path)', required: true, description: 'Stage UUID' },
            { name: 'taskId', type: 'string (path)', required: true, description: 'Task UUID' },
          ],
          bodyFields: [
            { name: 'title', type: 'string', required: false, description: 'New title' },
            { name: 'description', type: 'string', required: false, description: 'New description' },
            { name: 'status', type: 'string', required: false, description: 'todo | in_progress | done' },
            { name: 'assigneeId', type: 'string', required: false, description: 'New assignee agent UUID' },
          ],
          responses: [
            { status: 200, description: 'Task updated', body: { success: true } },
          ],
        },
        {
          id: 'pipelines-tasks-delete',
          method: 'DELETE',
          path: '/api/pipelines/[id]/stages/[stageId]/tasks/[taskId]',
          summary: 'Delete Task',
          description: 'Deletes a task from a pipeline stage.',
          category: 'Pipelines',
          parameters: [
            { name: 'id', type: 'string (path)', required: true, description: 'Pipeline UUID' },
            { name: 'stageId', type: 'string (path)', required: true, description: 'Stage UUID' },
            { name: 'taskId', type: 'string (path)', required: true, description: 'Task UUID' },
          ],
          bodyFields: [],
          responses: [
            { status: 200, description: 'Task deleted', body: { success: true } },
          ],
        },
      ],
    },
    // --------------------------------------------------------
    // Export
    // --------------------------------------------------------
    {
      name: 'Export',
      icon: ' download',
      color: '#ec4899',
      endpoints: [
        {
          id: 'export-root',
          method: 'GET',
          path: '/api/export',
          summary: 'Export Options',
          description: 'Returns available export formats and configuration for meeting data.',
          category: 'Export',
          parameters: [
            { name: 'meetingId', type: 'string', required: true, description: 'Meeting UUID to export' },
          ],
          bodyFields: [],
          responses: [
            { status: 200, description: 'Export options', body: { formats: ['pdf', 'docx', 'pptx', 'json'], meetingId: 'uuid' } },
          ],
        },
        {
          id: 'export-pdf',
          method: 'GET',
          path: '/api/export/pdf',
          summary: 'Export PDF',
          description: 'Generates a printable HTML report for a meeting that can be saved as PDF.',
          category: 'Export',
          parameters: [
            { name: 'meetingId', type: 'string', required: true, description: 'Meeting UUID' },
          ],
          bodyFields: [],
          responses: [
            { status: 200, description: 'HTML report (Content-Type: text/html)', body: { html: '<!DOCTYPE html>...' } },
            { status: 400, description: 'Missing meetingId', body: { error: 'meetingId is required' } },
          ],
        },
        {
          id: 'export-docx',
          method: 'GET',
          path: '/api/export/docx',
          summary: 'Export DOCX',
          description: 'Generates and downloads a Word document (.docx) containing the meeting report.',
          category: 'Export',
          parameters: [
            { name: 'meetingId', type: 'string', required: true, description: 'Meeting UUID' },
          ],
          bodyFields: [],
          responses: [
            { status: 200, description: 'DOCX binary download', body: { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' } },
          ],
        },
        {
          id: 'export-pptx',
          method: 'GET',
          path: '/api/export/pptx',
          summary: 'Export PPTX',
          description: 'Generates and downloads a PowerPoint presentation (.pptx) for the meeting.',
          category: 'Export',
          parameters: [
            { name: 'meetingId', type: 'string', required: true, description: 'Meeting UUID' },
          ],
          bodyFields: [],
          responses: [
            { status: 200, description: 'PPTX binary download', body: { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' } },
          ],
        },
      ],
    },
    // --------------------------------------------------------
    // Notifications
    // --------------------------------------------------------
    {
      name: 'Notifications',
      icon: ' bell',
      color: '#f97316',
      endpoints: [
        {
          id: 'notifications-list',
          method: 'GET',
          path: '/api/notifications',
          summary: 'List Notifications',
          description: 'Returns recent notifications generated from meeting activity.',
          category: 'Notifications',
          parameters: [],
          bodyFields: [],
          responses: [
            { status: 200, description: 'Notification list', body: { id: 'team-uuid', type: 'meeting_completed', title: 'Team Meeting Completed', message: '...', read: false } },
          ],
        },
        {
          id: 'notifications-update',
          method: 'POST',
          path: '/api/notifications',
          summary: 'Mark Notification Read',
          description: 'Marks a specific notification as read.',
          category: 'Notifications',
          parameters: [],
          bodyFields: [
            { name: 'notificationId', type: 'string', required: true, description: 'Notification ID' },
          ],
          responses: [
            { status: 200, description: 'Marked as read', body: { success: true, notificationId: '...' } },
          ],
        },
        {
          id: 'notifications-get',
          method: 'GET',
          path: '/api/notifications/[id]',
          summary: 'Get Notification',
          description: 'Retrieves a single notification by ID.',
          category: 'Notifications',
          parameters: [
            { name: 'id', type: 'string (path)', required: true, description: 'Notification ID' },
          ],
          bodyFields: [],
          responses: [
            { status: 200, description: 'Notification details', body: { id: '...', type: '...', title: '...', message: '...' } },
          ],
        },
      ],
    },
    // --------------------------------------------------------
    // Search
    // --------------------------------------------------------
    {
      name: 'Search',
      icon: ' search',
      color: '#14b8a6',
      endpoints: [
        {
          id: 'search',
          method: 'GET',
          path: '/api/search',
          summary: 'Global Search',
          description: 'Performs fuzzy search across meetings, agents, and pipelines. Returns ranked results with highlighted excerpts.',
          category: 'Search',
          parameters: [
            { name: 'q', type: 'string', required: true, description: 'Search query' },
            { name: 'types', type: 'string', required: false, description: 'Comma-separated types (meetings,agents,pipelines,notes)', default: 'meetings,agents,pipelines' },
            { name: 'limit', type: 'number', required: false, description: 'Max results (1-50)', default: '20' },
            { name: 'offset', type: 'number', required: false, description: 'Pagination offset', default: '0' },
          ],
          bodyFields: [],
          responses: [
            { status: 200, description: 'Search results', body: { results: [{ type: 'agent', id: 'uuid', title: 'PI', excerpt: '...', score: 95 }], total: 3, query: 'PI' } },
          ],
        },
      ],
    },
    // --------------------------------------------------------
    // Research Notes
    // --------------------------------------------------------
    {
      name: 'Research',
      icon: ' file-text',
      color: '#a855f7',
      endpoints: [
        {
          id: 'research-notes',
          method: 'GET',
          path: '/api/research-notes',
          summary: 'Get Research Notes',
          description: 'Returns all research notes stored in the system.',
          category: 'Research',
          parameters: [],
          bodyFields: [],
          responses: [
            { status: 200, description: 'Research notes list', body: { id: 'uuid', title: 'Note', content: '...', tags: ['protein'], createdAt: '...' } },
          ],
        },
        {
          id: 'workspace',
          method: 'GET',
          path: '/api/workspace',
          summary: 'Get Workspace',
          description: 'Returns workspace configuration and settings.',
          category: 'Research',
          parameters: [],
          bodyFields: [],
          responses: [
            { status: 200, description: 'Workspace data', body: { name: 'My Lab', settings: { theme: 'dark' } } },
          ],
        },
      ],
    },
    // --------------------------------------------------------
    // Utilities
    // --------------------------------------------------------
    {
      name: 'Utilities',
      icon: ' settings',
      color: '#64748b',
      endpoints: [
        {
          id: 'seed',
          method: 'POST',
          path: '/api/seed',
          summary: 'Seed Database',
          description: 'Populates the database with default sample data including agents and meetings for demonstration purposes.',
          category: 'Utilities',
          parameters: [],
          bodyFields: [],
          responses: [
            { status: 200, description: 'Database seeded', body: { success: true, agents: 4, meetings: 2 } },
          ],
        },
        {
          id: 'activity',
          method: 'GET',
          path: '/api/activity',
          summary: 'Get Activity Feed',
          description: 'Returns a chronological activity feed of recent events across the platform.',
          category: 'Utilities',
          parameters: [
            { name: 'limit', type: 'number', required: false, description: 'Number of events', default: '20' },
          ],
          bodyFields: [],
          responses: [
            { status: 200, description: 'Activity events', body: { events: [{ type: 'meeting_created', timestamp: '...', data: {} }] } },
          ],
        },
        {
          id: 'agent-moods',
          method: 'GET',
          path: '/api/agent-moods',
          summary: 'Get Agent Moods',
          description: 'Returns the current mood indicators for all agents based on recent activity.',
          category: 'Utilities',
          parameters: [],
          bodyFields: [],
          responses: [
            { status: 200, description: 'Agent mood data', body: { agents: [{ id: 'uuid', name: 'PI', mood: 'productive', sentiment: 0.85 }] } },
          ],
        },
        {
          id: 'ws',
          method: 'GET',
          path: '/api/ws',
          summary: 'WebSocket Endpoint',
          description: 'WebSocket endpoint for real-time communication. Used for live updates and collaborative features.',
          category: 'Utilities',
          parameters: [],
          bodyFields: [],
          responses: [
            { status: 101, description: 'WebSocket upgrade', body: { type: 'websocket', protocol: 'wss' } },
          ],
        },
      ],
    },
  ];

  return categories;
}

// ============================================================
// GET /api/api-docs — Return all API documentation
// ============================================================

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'all';
    const method = searchParams.get('method') || 'all';

    const docs = generateApiDocs();

    let filteredDocs = docs;

    // Filter by category
    if (category !== 'all') {
      filteredDocs = filteredDocs.filter(c =>
        c.name.toLowerCase() === category.toLowerCase()
      );
    }

    // Filter by method within categories
    if (method !== 'all') {
      filteredDocs = filteredDocs.map(cat => ({
        ...cat,
        endpoints: cat.endpoints.filter(e =>
          e.method.toUpperCase() === method.toUpperCase()
        ),
      })).filter(cat => cat.endpoints.length > 0);
    }

    // Compute stats
    const totalEndpoints = docs.reduce((sum, cat) => sum + cat.endpoints.length, 0);
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    const methodCounts: Record<string, number> = {};
    for (const m of methods) {
      methodCounts[m] = 0;
    }
    for (const cat of docs) {
      for (const ep of cat.endpoints) {
        const upper = ep.method.toUpperCase();
        if (upper in methodCounts) {
          methodCounts[upper]++;
        }
      }
    }

    return NextResponse.json({
      categories: filteredDocs,
      stats: {
        totalEndpoints,
        totalCategories: docs.length,
        methodCounts,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to generate API docs:', error);
    return NextResponse.json(
      { error: 'Failed to generate API documentation' },
      { status: 500 }
    );
  }
}
