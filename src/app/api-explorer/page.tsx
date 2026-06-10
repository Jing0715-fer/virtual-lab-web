'use client'

import React, { useState, useCallback, useMemo } from 'react'
import {
  Code2,
  Search,
  ChevronRight,
  ChevronDown,
  Send,
  Copy,
  X,
  Clock,
  Zap,
  Globe,
  Filter,
  GitBranch,
  CheckCircle2,
  Activity,
} from 'lucide-react'

/* ─── Types ─── */
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

interface ParamDef {
  name: string
  type: string
  required: boolean
  description: string
}

interface EndpointDef {
  id: string
  method: HttpMethod
  path: string
  description: string
  tags: string[]
  fullDescription: string
  params: ParamDef[]
  responseExample: string
  version: string
}

/* ─── Endpoint Data ─── */
const ENDPOINTS: EndpointDef[] = [
  {
    id: 'e1', method: 'GET', path: '/api/agents', description: 'List all AI research agents',
    tags: ['Agents', 'Core'], version: 'v1.0',
    fullDescription: 'Retrieves a paginated list of all configured AI research agents. Supports filtering by status, capability, and specialization. Returns agent metadata including persona configurations, skill trees, and current task assignments.',
    params: [
      { name: 'status', type: 'string', required: false, description: 'Filter by agent status (active/idle/error)' },
      { name: 'limit', type: 'number', required: false, description: 'Max results per page (default: 25)' },
      { name: 'offset', type: 'number', required: false, description: 'Pagination offset' },
      { name: 'capability', type: 'string', required: false, description: 'Filter by capability area' },
    ],
    responseExample: JSON.stringify({ agents: [{ id: 'agent-001', name: 'Alpha', status: 'active', role: 'Structural Biologist', capabilities: ['protein-folding', 'molecular-dynamics'], skillLevel: 92 }], total: 15, page: 1 }, null, 2),
  },
  {
    id: 'e2', method: 'GET', path: '/api/agents/[id]', description: 'Get single agent details',
    tags: ['Agents'], version: 'v1.0',
    fullDescription: 'Returns complete details for a specific agent including persona configuration, current task queue, collaboration history, mood state, and skill progression data.',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Unique agent identifier' },
    ],
    responseExample: JSON.stringify({ agent: { id: 'agent-001', name: 'Alpha', persona: { personality: 'Analytical', communicationStyle: 'Concise', expertise: ['Structural Biology'] }, mood: 'focused', currentTask: 'protein-folding-sim' } }, null, 2),
  },
  {
    id: 'e3', method: 'GET', path: '/api/agents/[id]/profile', description: 'Agent profile & stats',
    tags: ['Agents'], version: 'v2.0',
    fullDescription: 'Returns the detailed profile, performance metrics, and collaboration statistics for a specific agent.',
    params: [{ name: 'id', type: 'string', required: true, description: 'Agent ID' }],
    responseExample: JSON.stringify({ profile: { agentId: 'agent-001', meetingsAttended: 142, tasksCompleted: 89, avgResponseTime: '2.3s', collaborationScore: 0.94 } }, null, 2),
  },
  {
    id: 'e4', method: 'GET', path: '/api/agents/[id]/persona', description: 'Agent persona configuration',
    tags: ['Agents'], version: 'v2.0',
    fullDescription: 'Retrieves the persona configuration for an agent, including personality traits, communication preferences, and expertise areas.',
    params: [{ name: 'id', type: 'string', required: true, description: 'Agent ID' }],
    responseExample: JSON.stringify({ persona: { name: 'Dr. Alpha', personality: 'Methodical & Thorough', communicationStyle: 'Detailed', avatar: '🔬', expertise: ['Protein Design', 'Molecular Simulation'] } }, null, 2),
  },
  {
    id: 'e5', method: 'POST', path: '/api/agents/[id]/chat', description: 'Send message to agent',
    tags: ['Agents', 'Chat'], version: 'v2.0',
    fullDescription: 'Sends a chat message to a specific agent and returns the AI-generated response. Supports context threading for multi-turn conversations.',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Agent ID' },
      { name: 'message', type: 'string', required: true, description: 'Message content (body JSON)' },
      { name: 'contextId', type: 'string', required: false, description: 'Thread context for multi-turn' },
    ],
    responseExample: JSON.stringify({ response: { content: 'Based on the simulation data, the binding affinity increased by 23% when we modified the CDR3 loop.', confidence: 0.87, sources: ['sim-001'] } }, null, 2),
  },
  {
    id: 'e6', method: 'GET', path: '/api/meetings', description: 'List all research meetings',
    tags: ['Meetings', 'Core'], version: 'v1.0',
    fullDescription: 'Returns a list of all scheduled and completed research meetings. Supports filtering by status (scheduled/in-progress/completed), date range, and participant agent IDs.',
    params: [
      { name: 'status', type: 'string', required: false, description: 'Filter by meeting status' },
      { name: 'from', type: 'string', required: false, description: 'ISO date string for start range' },
      { name: 'to', type: 'string', required: false, description: 'ISO date string for end range' },
    ],
    responseExample: JSON.stringify({ meetings: [{ id: 'mtg-042', title: 'Nanobody Design Review', status: 'in-progress', participants: ['agent-001', 'agent-003'], startTime: '2024-12-15T09:00:00Z' }], total: 28 }, null, 2),
  },
  {
    id: 'e7', method: 'GET', path: '/api/meetings/[id]', description: 'Get meeting details',
    tags: ['Meetings'], version: 'v1.0',
    fullDescription: 'Returns complete details for a specific meeting including agenda, participants, messages, decisions, action items, and linked research artifacts.',
    params: [{ name: 'id', type: 'string', required: true, description: 'Meeting ID' }],
    responseExample: JSON.stringify({ meeting: { id: 'mtg-042', title: 'Nanobody Design Review', agenda: ['Phase 1 results', 'Candidate selection'], messages: 34, decisions: 3 } }, null, 2),
  },
  {
    id: 'e8', method: 'POST', path: '/api/meetings/[id]/run', description: 'Execute a meeting simulation',
    tags: ['Meetings', 'Simulation'], version: 'v1.0',
    fullDescription: 'Triggers a simulated meeting run with AI agents as participants. The agents will discuss the specified topic following the meeting agenda, generating messages, decisions, and action items.',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Meeting ID' },
      { name: 'maxTurns', type: 'number', required: false, description: 'Max conversation turns (default: 30)' },
    ],
    responseExample: JSON.stringify({ run: { meetingId: 'mtg-042', status: 'completed', turns: 28, duration: '4m 32s', messagesGenerated: 67, decisions: 4 } }, null, 2),
  },
  {
    id: 'e9', method: 'GET', path: '/api/meetings/[id]/stream', description: 'Stream live meeting events',
    tags: ['Meetings', 'Realtime'], version: 'v2.0',
    fullDescription: 'Opens a Server-Sent Events (SSE) stream for real-time meeting updates. Each event contains message updates, decision markers, and participant mood changes.',
    params: [{ name: 'id', type: 'string', required: true, description: 'Meeting ID' }],
    responseExample: JSON.stringify({ event: 'message', data: { sender: 'agent-001', content: 'The binding data looks promising...', type: 'observation', timestamp: '2024-12-15T09:02:34Z' } }, null, 2),
  },
  {
    id: 'e10', method: 'GET', path: '/api/meetings/[id]/messages', description: 'Get meeting messages',
    tags: ['Meetings'], version: 'v1.0',
    fullDescription: 'Retrieves all messages from a specific meeting, ordered chronologically. Supports filtering by sender, message type, and sentiment.',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Meeting ID' },
      { name: 'sender', type: 'string', required: false, description: 'Filter by sender agent ID' },
    ],
    responseExample: JSON.stringify({ messages: [{ id: 'msg-201', sender: 'agent-001', content: 'Starting the analysis...', type: 'observation', reactions: { '👍': 3 } }], total: 67 }, null, 2),
  },
  {
    id: 'e11', method: 'POST', path: '/api/meetings/[id]/messages/[msgId]/react', description: 'React to a message',
    tags: ['Meetings'], version: 'v3.0',
    fullDescription: 'Adds or removes an emoji reaction on a specific meeting message.',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Meeting ID' },
      { name: 'msgId', type: 'string', required: true, description: 'Message ID' },
      { name: 'emoji', type: 'string', required: true, description: 'Emoji reaction (body JSON)' },
    ],
    responseExample: JSON.stringify({ reaction: { messageId: 'msg-201', emoji: '🔬', count: 4, userReacted: true } }, null, 2),
  },
  {
    id: 'e12', method: 'GET', path: '/api/meetings/timeline', description: 'Meeting timeline view data',
    tags: ['Meetings', 'Timeline'], version: 'v2.0',
    fullDescription: 'Returns chronological timeline data for meetings, including milestones, decisions, and linked artifacts.',
    params: [
      { name: 'from', type: 'string', required: false, description: 'Start date' },
      { name: 'to', type: 'string', required: false, description: 'End date' },
    ],
    responseExample: JSON.stringify({ timeline: [{ date: '2024-12-15', events: [{ type: 'meeting', title: 'Design Review', time: '09:00' }] }] }, null, 2),
  },
  {
    id: 'e13', method: 'GET', path: '/api/meetings/compare', description: 'Compare two meetings',
    tags: ['Meetings', 'Analytics'], version: 'v2.0',
    fullDescription: 'Compares two meetings side by side, analyzing differences in decisions, participant engagement, topic coverage, and outcomes.',
    params: [
      { name: 'idA', type: 'string', required: true, description: 'First meeting ID' },
      { name: 'idB', type: 'string', required: true, description: 'Second meeting ID' },
    ],
    responseExample: JSON.stringify({ comparison: { sharedDecisions: 2, divergentTopics: ['folding-approach'], engagementDiff: '+12%' } }, null, 2),
  },
  {
    id: 'e14', method: 'GET', path: '/api/analytics', description: 'Research analytics dashboard data',
    tags: ['Analytics', 'Core'], version: 'v1.0',
    fullDescription: 'Aggregated analytics for the research workspace including experiment counts, pipeline throughput, agent productivity, and knowledge graph growth metrics.',
    params: [
      { name: 'period', type: 'string', required: false, description: 'Time period (7d/30d/90d)' },
    ],
    responseExample: JSON.stringify({ analytics: { experimentsRun: 156, pipelinesCompleted: 42, avgAgentProductivity: 0.87, knowledgeNodes: 12450 } }, null, 2),
  },
  {
    id: 'e15', method: 'POST', path: '/api/export', description: 'Export research data',
    tags: ['Export'], version: 'v1.0',
    fullDescription: 'Exports research workspace data in the specified format. Supports PDF, DOCX, PPTX, CSV, and JSON formats.',
    params: [
      { name: 'format', type: 'string', required: true, description: 'Export format (body JSON)' },
      { name: 'scope', type: 'string', required: false, description: 'Data scope to export' },
    ],
    responseExample: JSON.stringify({ export: { id: 'exp-089', format: 'pdf', status: 'completed', downloadUrl: '/exports/exp-089.pdf', size: '2.4MB' } }, null, 2),
  },
  {
    id: 'e16', method: 'GET', path: '/api/export/pdf', description: 'Export as PDF',
    tags: ['Export'], version: 'v1.0',
    fullDescription: 'Generates and returns a PDF export of the specified research content.',
    params: [{ name: 'contentId', type: 'string', required: true, description: 'Content to export' }],
    responseExample: JSON.stringify({ url: '/exports/report-042.pdf', size: '3.1MB', generatedAt: '2024-12-15T10:00:00Z' }, null, 2),
  },
  {
    id: 'e17', method: 'GET', path: '/api/export/docx', description: 'Export as DOCX',
    tags: ['Export'], version: 'v1.0',
    fullDescription: 'Generates a DOCX export suitable for manuscript drafting.',
    params: [{ name: 'contentId', type: 'string', required: true, description: 'Content to export' }],
    responseExample: JSON.stringify({ url: '/exports/manuscript-042.docx', size: '1.8MB' }, null, 2),
  },
  {
    id: 'e18', method: 'GET', path: '/api/export/pptx', description: 'Export as PPTX',
    tags: ['Export'], version: 'v2.0',
    fullDescription: 'Generates a PowerPoint presentation from research data with auto-generated charts and figures.',
    params: [{ name: 'contentId', type: 'string', required: true, description: 'Content to export' }],
    responseExample: JSON.stringify({ url: '/exports/presentation-042.pptx', slideCount: 24, size: '5.2MB' }, null, 2),
  },
  {
    id: 'e19', method: 'GET', path: '/api/notifications', description: 'Get notifications list',
    tags: ['Notifications'], version: 'v1.0',
    fullDescription: 'Retrieves paginated list of user notifications including meeting reminders, task completions, and system alerts.',
    params: [
      { name: 'unread', type: 'boolean', required: false, description: 'Filter unread only' },
      { name: 'limit', type: 'number', required: false, description: 'Page size' },
    ],
    responseExample: JSON.stringify({ notifications: [{ id: 'n-042', type: 'meeting-reminder', title: 'Meeting in 30 minutes', read: false }] }, null, 2),
  },
  {
    id: 'e20', method: 'PUT', path: '/api/notifications/[id]', description: 'Mark notification read',
    tags: ['Notifications'], version: 'v1.0',
    fullDescription: 'Marks a specific notification as read or unread.',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Notification ID' },
      { name: 'read', type: 'boolean', required: true, description: 'Read status (body JSON)' },
    ],
    responseExample: JSON.stringify({ notification: { id: 'n-042', read: true } }, null, 2),
  },
  {
    id: 'e21', method: 'GET', path: '/api/pipelines', description: 'List research pipelines',
    tags: ['Pipelines', 'Core'], version: 'v1.0',
    fullDescription: 'Returns a list of all research pipelines with their current status, stage progress, and stage-level task information.',
    params: [
      { name: 'status', type: 'string', required: false, description: 'Filter by pipeline status' },
    ],
    responseExample: JSON.stringify({ pipelines: [{ id: 'pipe-012', name: 'Drug Discovery Pipeline', status: 'running', stages: 6, currentStage: 3 }] }, null, 2),
  },
  {
    id: 'e22', method: 'GET', path: '/api/pipelines/[id]', description: 'Get pipeline details',
    tags: ['Pipelines'], version: 'v1.0',
    fullDescription: 'Returns detailed information about a specific pipeline including all stages, task assignments, and completion metrics.',
    params: [{ name: 'id', type: 'string', required: true, description: 'Pipeline ID' }],
    responseExample: JSON.stringify({ pipeline: { id: 'pipe-012', name: 'Drug Discovery', stages: [{ id: 's1', name: 'Target Identification', status: 'completed', tasks: 8 }] } }, null, 2),
  },
  {
    id: 'e23', method: 'GET', path: '/api/pipelines/templates', description: 'Pipeline template library',
    tags: ['Pipelines', 'Templates'], version: 'v2.0',
    fullDescription: 'Returns available pipeline templates for quick pipeline creation.',
    params: [],
    responseExample: JSON.stringify({ templates: [{ id: 'tpl-001', name: 'Standard Drug Discovery', stages: 6, category: 'pharma' }] }, null, 2),
  },
  {
    id: 'e24', method: 'POST', path: '/api/seed', description: 'Seed demo data',
    tags: ['System'], version: 'v1.0',
    fullDescription: 'Seeds the database with demo/fixture data for development and testing purposes. Clears existing data and populates with realistic research workspace data.',
    params: [{ name: 'clearExisting', type: 'boolean', required: false, description: 'Clear existing data before seeding (body JSON)' }],
    responseExample: JSON.stringify({ seeded: true, agents: 8, meetings: 12, pipelines: 4, experiments: 24, duration: '1.2s' }, null, 2),
  },
  {
    id: 'e25', method: 'GET', path: '/api/search', description: 'Global search',
    tags: ['Search', 'Core'], version: 'v1.0',
    fullDescription: 'Performs a full-text search across the entire research workspace including meetings, agents, experiments, knowledge base, and notes.',
    params: [
      { name: 'q', type: 'string', required: true, description: 'Search query' },
      { name: 'type', type: 'string', required: false, description: 'Content type filter' },
    ],
    responseExample: JSON.stringify({ results: [{ type: 'meeting', id: 'mtg-042', title: 'Nanobody Design Review', snippet: '...binding affinity of 2.3 nM...', score: 0.94 }] }, null, 2),
  },
  {
    id: 'e26', method: 'GET', path: '/api/templates', description: 'Meeting templates',
    tags: ['Templates', 'Meetings'], version: 'v1.0',
    fullDescription: 'Returns available meeting templates for quick meeting creation with pre-configured agendas and participant roles.',
    params: [],
    responseExample: JSON.stringify({ templates: [{ id: 'mt-001', name: 'Weekly Lab Review', agenda: ['Progress updates', 'Blockers', 'Next steps'], defaultParticipants: 4 }] }, null, 2),
  },
  {
    id: 'e27', method: 'GET', path: '/api/team', description: 'Team management data',
    tags: ['Team'], version: 'v1.0',
    fullDescription: 'Returns team composition, roles, permissions matrix, and collaboration metrics.',
    params: [],
    responseExample: JSON.stringify({ team: { members: 12, roles: ['PI', 'Postdoc', 'PhD Student', 'Technician'], collaborationIndex: 0.89 } }, null, 2),
  },
  {
    id: 'e28', method: 'GET', path: '/api/timeline', description: 'Research timeline data',
    tags: ['Timeline'], version: 'v1.0',
    fullDescription: 'Returns chronological research timeline including experiments, meetings, milestones, and publications.',
    params: [
      { name: 'from', type: 'string', required: false, description: 'Start date' },
      { name: 'to', type: 'string', required: false, description: 'End date' },
    ],
    responseExample: JSON.stringify({ timeline: [{ date: '2024-12-15', events: [{ type: 'experiment', title: 'Binding Assay', status: 'completed' }] }] }, null, 2),
  },
  {
    id: 'e29', method: 'GET', path: '/api/reviews', description: 'Meeting reviews & feedback',
    tags: ['Reviews'], version: 'v2.0',
    fullDescription: 'Returns reviews and feedback from completed meetings, including quality scores, action item tracking, and sentiment analysis.',
    params: [{ name: 'meetingId', type: 'string', required: false, description: 'Filter by meeting' }],
    responseExample: JSON.stringify({ reviews: [{ id: 'rev-012', meetingId: 'mtg-042', qualityScore: 4.5, sentiment: 'positive', actionItems: 6 }] }, null, 2),
  },
  {
    id: 'e30', method: 'GET', path: '/api/experiments', description: 'List experiments',
    tags: ['Experiments'], version: 'v1.0',
    fullDescription: 'Returns all experiments with their status, parameters, results, and linked data artifacts.',
    params: [
      { name: 'status', type: 'string', required: false, description: 'Filter by status' },
    ],
    responseExample: JSON.stringify({ experiments: [{ id: 'exp-089', title: 'Protein Binding Assay', status: 'completed', parameters: { temperature: '37°C', duration: '2h' } }] }, null, 2),
  },
  {
    id: 'e31', method: 'GET', path: '/api/agent-skills', description: 'Agent skill tree data',
    tags: ['Agents', 'Skills'], version: 'v2.0',
    fullDescription: 'Returns the skill tree configuration and progression data for all agents, including unlocked skills, experience points, and learning paths.',
    params: [{ name: 'agentId', type: 'string', required: false, description: 'Filter by agent' }],
    responseExample: JSON.stringify({ skills: [{ id: 'sk-001', name: 'Molecular Dynamics', level: 4, maxLevel: 5, xp: 420, agents: ['agent-001', 'agent-003'] }] }, null, 2),
  },
  {
    id: 'e32', method: 'GET', path: '/api/research-portfolio', description: 'Research portfolio overview',
    tags: ['Portfolio'], version: 'v2.0',
    fullDescription: 'Returns an overview of all research projects including progress, milestones, risk assessments, and resource allocation.',
    params: [],
    responseExample: JSON.stringify({ portfolio: { projects: 8, activeProjects: 5, totalBudget: '$2.4M', riskLevel: 'moderate' } }, null, 2),
  },
  {
    id: 'e33', method: 'GET', path: '/api/ai-insights', description: 'AI-generated research insights',
    tags: ['AI', 'Analytics'], version: 'v2.0',
    fullDescription: 'Returns AI-generated insights derived from the research workspace data, including trend analysis, anomaly detection, and recommendations.',
    params: [
      { name: 'category', type: 'string', required: false, description: 'Insight category filter' },
    ],
    responseExample: JSON.stringify({ insights: [{ id: 'ins-042', type: 'trend', title: 'Binding affinity improvement', confidence: 0.92, description: 'Binding affinities improved 23% over the last 30 days.' }] }, null, 2),
  },
  {
    id: 'e34', method: 'GET', path: '/api/meeting-replay', description: 'Meeting replay session data',
    tags: ['Meetings', 'Replay'], version: 'v2.0',
    fullDescription: 'Returns replay data for a completed meeting, enabling interactive playback of the conversation with synchronized visualizations.',
    params: [{ name: 'meetingId', type: 'string', required: true, description: 'Meeting ID' }],
    responseExample: JSON.stringify({ replay: { meetingId: 'mtg-042', duration: '4m 32s', segments: 12, hasAnnotations: true } }, null, 2),
  },
  {
    id: 'e35', method: 'GET', path: '/api/collaboration-hub', description: 'Collaboration hub data',
    tags: ['Collaboration'], version: 'v2.0',
    fullDescription: 'Returns collaboration hub data including active sessions, shared whiteboards, and real-time participant status.',
    params: [],
    responseExample: JSON.stringify({ hub: { activeSessions: 3, sharedArtifacts: 12, participantsOnline: 8 } }, null, 2),
  },
  {
    id: 'e36', method: 'GET', path: '/api/activity-river', description: 'Activity feed stream',
    tags: ['Activity'], version: 'v2.0',
    fullDescription: 'Returns the activity river feed with real-time updates from all workspace activities including commits, meeting events, and experiment results.',
    params: [
      { name: 'limit', type: 'number', required: false, description: 'Number of activities' },
    ],
    responseExample: JSON.stringify({ activities: [{ id: 'act-201', type: 'experiment-completed', title: 'Binding Assay Complete', timestamp: '2024-12-15T10:30:00Z' }] }, null, 2),
  },
  {
    id: 'e37', method: 'GET', path: '/api/productivity', description: 'Productivity metrics dashboard',
    tags: ['Analytics', 'Productivity'], version: 'v2.0',
    fullDescription: 'Returns productivity metrics including focus time, meeting efficiency scores, task completion rates, and agent utilization data.',
    params: [
      { name: 'period', type: 'string', required: false, description: 'Time period' },
    ],
    responseExample: JSON.stringify({ productivity: { focusScore: 0.82, meetingEfficiency: 0.91, tasksCompleted: 34, agentUtilization: 0.78 } }, null, 2),
  },
  {
    id: 'e38', method: 'GET', path: '/api/workspace', description: 'Workspace configuration',
    tags: ['Workspace'], version: 'v1.0',
    fullDescription: 'Returns workspace configuration including layout preferences, theme settings, feature flags, and notification preferences.',
    params: [],
    responseExample: JSON.stringify({ workspace: { theme: 'dark', layout: 'sidebar', features: { whiteboard: true, replays: true, analytics: true } } }, null, 2),
  },
  {
    id: 'e39', method: 'GET', path: '/api/knowledge', description: 'Knowledge graph data',
    tags: ['Knowledge', 'Core'], version: 'v1.0',
    fullDescription: 'Returns knowledge graph data including nodes (concepts, papers, experiments) and edges (relationships, citations, dependencies) for visualization.',
    params: [
      { name: 'rootId', type: 'string', required: false, description: 'Root node for subgraph' },
    ],
    responseExample: JSON.stringify({ graph: { nodes: [{ id: 'n1', label: 'Protein Folding', type: 'concept' }], edges: [{ source: 'n1', target: 'n2', relation: 'depends_on' }] } }, null, 2),
  },
  {
    id: 'e40', method: 'GET', path: '/api/research-notes', description: 'Research notes collection',
    tags: ['Notes'], version: 'v1.0',
    fullDescription: 'Returns research notes with full-text search support. Notes can be linked to meetings, experiments, and knowledge graph nodes.',
    params: [
      { name: 'search', type: 'string', required: false, description: 'Full-text search query' },
    ],
    responseExample: JSON.stringify({ notes: [{ id: 'note-042', title: 'Binding affinity observations', content: 'The modified CDR3 loop shows...', tags: ['nanobody', 'binding'], linkedMeeting: 'mtg-042' }] }, null, 2),
  },
  {
    id: 'e41', method: 'GET', path: '/api/visualization-data', description: 'Visualization datasets',
    tags: ['Visualization'], version: 'v2.0',
    fullDescription: 'Returns pre-computed datasets for various visualizations including charts, network graphs, heatmaps, and treemaps.',
    params: [
      { name: 'vizType', type: 'string', required: true, description: 'Visualization type' },
    ],
    responseExample: JSON.stringify({ data: { type: 'network', nodes: 120, edges: 340, layout: 'force-directed' } }, null, 2),
  },
  {
    id: 'e42', method: 'GET', path: '/api/ws', description: 'WebSocket connection endpoint',
    tags: ['Realtime', 'WebSocket'], version: 'v2.0',
    fullDescription: 'WebSocket endpoint for real-time bidirectional communication. Supports channels for meetings, activities, and agent status updates.',
    params: [
      { name: 'channel', type: 'string', required: false, description: 'Subscription channel' },
    ],
    responseExample: JSON.stringify({ ws: { url: 'wss://api.virtuallab.dev/ws', channels: ['meetings', 'activities', 'agents'], protocol: 'json' } }, null, 2),
  },
]

const CHANGELOG = [
  {
    version: 'v3.0',
    date: 'Dec 2024',
    description: 'Real-time collaboration features',
    newEndpoints: ['/api/meetings/[id]/stream', '/api/ws', '/api/meetings/[id]/messages/[msgId]/react', '/api/collaboration-hub', '/api/activity-river', '/api/productivity', '/api/visualization-data'],
  },
  {
    version: 'v2.0',
    date: 'Oct 2024',
    description: 'Advanced analytics & agent capabilities',
    newEndpoints: ['/api/agents/[id]/profile', '/api/agents/[id]/persona', '/api/agents/[id]/chat', '/api/meetings/timeline', '/api/meetings/compare', '/api/pipelines/templates', '/api/reviews', '/api/agent-skills', '/api/research-portfolio', '/api/ai-insights', '/api/meeting-replay', '/api/collaboration-hub', '/api/export/pptx', '/api/meeting-analytics'],
  },
  {
    version: 'v1.0',
    date: 'Jul 2024',
    description: 'Initial release — core research platform',
    newEndpoints: ['/api/agents', '/api/agents/[id]', '/api/meetings', '/api/meetings/[id]', '/api/meetings/[id]/run', '/api/meetings/[id]/messages', '/api/analytics', '/api/export', '/api/notifications', '/api/notifications/[id]', '/api/pipelines', '/api/pipelines/[id]', '/api/seed', '/api/search', '/api/templates', '/api/team', '/api/timeline', '/api/experiments', '/api/export/pdf', '/api/export/docx', '/api/knowledge', '/api/research-notes', '/api/workspace'],
  },
]

/* ─── Method Color Map ─── */
const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'var(--ae-get)',
  POST: 'var(--ae-post)',
  PUT: 'var(--ae-put)',
  DELETE: 'var(--ae-delete)',
}

/* ─── Simple JSON Syntax Highlighter ─── */
function highlightJSON(raw: string): React.ReactNode {
  const lines = raw.split('\n')
  return lines.map((line, li) => {
    const highlighted = line
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"([^"]+)":/g, '<span class="ae-tk-property">"$1"</span>:')
      .replace(/: "([^"]*)"/g, ': <span class="ae-tk-string">"$1"</span>')
      .replace(/: (\d+\.?\d*)/g, ': <span class="ae-tk-number">$1</span>')
      .replace(/: (true|false)/g, ': <span class="ae-tk-boolean">$1</span>')
      .replace(/: (null)/g, ': <span class="ae-tk-null">$1</span>')
      .replace(/[\[\]{}]/g, '<span class="ae-tk-bracket">$&</span>')
    return (
      <div key={li} style={{ minHeight: '1.7em' }}>
        {/* eslint-disable-next-line react/no-danger */}
        <span dangerouslySetInnerHTML={{ __html: highlighted || '&nbsp;' }} />
      </div>
    )
  })
}

/* ─── Endpoint Card Component ─── */
function EndpointCard({ ep, onTryIt }: { ep: EndpointDef; onTryIt: (ep: EndpointDef) => void }) {
  const [expanded, setExpanded] = useState(false)

  const toggle = useCallback(() => setExpanded(prev => !prev), [])

  return (
    <div className={`ae-endpoint-card ${expanded ? 'expanded' : ''}`}>
      <div className="ae-card-header" onClick={toggle} role="button" tabIndex={0} aria-expanded={expanded}>
        <span className={`ae-method-badge ${ep.method.toLowerCase()}`}>{ep.method}</span>
        <span className="ae-card-path">
          {ep.path.split(/(\[.*?\])/).map((seg, si) =>
            /\[/.test(seg) ? <span key={si} className="ae-card-path-param">{seg}</span> : <span key={si}>{seg}</span>
          )}
        </span>
        <span className="ae-card-desc">{ep.description}</span>
        <div className="ae-card-tags">
          {ep.tags.map(tag => <span key={tag} className="ae-tag">{tag}</span>)}
        </div>
        {expanded ? <ChevronDown size={16} className="ae-card-expand-icon open" /> : <ChevronRight size={16} className="ae-card-expand-icon" />}
      </div>
      <div className={`ae-card-body ${expanded ? 'open' : ''}`}>
        <div className="ae-card-content">
          <div className="ae-section-label">Description</div>
          <div className="ae-description-block">{ep.fullDescription}</div>

          {ep.params.length > 0 && (
            <>
              <div className="ae-section-label">Parameters</div>
              <table className="ae-params-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Required</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {ep.params.map(p => (
                    <tr key={p.name}>
                      <td><span className="ae-param-name">{p.name}</span></td>
                      <td><span className="ae-param-type">{p.type}</span></td>
                      <td><span className={p.required ? 'ae-param-required' : 'ae-param-optional'}>{p.required ? 'Required' : 'Optional'}</span></td>
                      <td>{p.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <div className="ae-section-label">Response Example</div>
          <div className="ae-code-block">
            <div className="ae-code-header">
              <span className="ae-code-lang">JSON</span>
              <button className="ae-code-copy" onClick={() => navigator?.clipboard?.writeText(ep.responseExample)}>
                <Copy size={12} /> Copy
              </button>
            </div>
            <div className="ae-code-body">{highlightJSON(ep.responseExample)}</div>
          </div>

          <button className="ae-try-btn" onClick={() => onTryIt(ep)}>
            <Send size={14} /> Try It
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Try-It Panel Component ─── */
function TryItPanel({ endpoint, onClose }: { endpoint: EndpointDef | null; onClose: () => void }) {
  const [method, setMethod] = useState<HttpMethod>('GET')
  const [url, setUrl] = useState('')
  const [headers, setHeaders] = useState('{\n  "Content-Type": "application/json"\n}')
  const [body, setBody] = useState('{\n  \n}')
  const [loading, setLoading] = useState(false)
  const [responseStatus, setResponseStatus] = useState<number | null>(null)
  const [responseTime, setResponseTime] = useState<number | null>(null)
  const [responseBody, setResponseBody] = useState('')

  React.useEffect(() => {
    if (endpoint) {
      setMethod(endpoint.method)
      setUrl(endpoint.path)
      setResponseBody(endpoint.responseExample)
      setResponseStatus(null)
      setResponseTime(null)
      setResponseBody('')
    }
  }, [endpoint])

  const sendRequest = useCallback(async () => {
    if (!url) return
    setLoading(true)
    setResponseStatus(null)
    setResponseTime(null)
    setResponseBody('')
    const start = performance.now()
    try {
      const opts: RequestInit = { method }
      const parsedHeaders: Record<string, string> = {}
      try { Object.assign(parsedHeaders, JSON.parse(headers)) } catch { /* ignore */ }
      opts.headers = parsedHeaders
      if (method !== 'GET') {
        opts.body = body
      }
      const res = await fetch(url, opts)
      const elapsed = Math.round(performance.now() - start)
      setResponseStatus(res.status)
      setResponseTime(elapsed)
      const text = await res.text()
      try {
        setResponseBody(JSON.stringify(JSON.parse(text), null, 2))
      } catch {
        setResponseBody(text)
      }
    } catch (err) {
      const elapsed = Math.round(performance.now() - start)
      setResponseStatus(0)
      setResponseTime(elapsed)
      setResponseBody(String(err?.toString?.() ?? 'Network error'))
    }
    setLoading(false)
  }, [method, url, headers, body])

  if (!endpoint) return null

  const showBody = method === 'POST' || method === 'PUT'

  return (
    <div className="ae-try-panel">
      <div className="ae-try-header">
        <div className="ae-try-title">
          <Send size={14} />
          Try It — {endpoint?.path}
        </div>
        <button className="ae-try-close" onClick={onClose}>
          <X size={16} />
        </button>
      </div>
      <div className="ae-try-body">
        <div className="ae-try-url-row">
          <select className="ae-try-method-sel" value={method} onChange={e => setMethod(e.target.value as HttpMethod)}>
            {(['GET', 'POST', 'PUT', 'DELETE'] as HttpMethod[]).map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <input className="ae-try-url-input" value={url} onChange={e => setUrl(e.target.value)} placeholder="/api/..." />
        </div>

        <div className="ae-try-section">
          <div className="ae-try-section-title">Headers (JSON)</div>
          <textarea className="ae-try-textarea" value={headers} onChange={e => setHeaders(e.target.value)} rows={3} />
        </div>

        {showBody && (
          <div className="ae-try-section">
            <div className="ae-try-section-title">Body (JSON)</div>
            <textarea className="ae-try-textarea" value={body} onChange={e => setBody(e.target.value)} rows={6} />
          </div>
        )}

        <button className={`ae-try-send-btn ${loading ? 'loading' : ''}`} onClick={sendRequest} disabled={loading}>
          <Send size={14} />
          {loading ? 'Sending...' : 'Send Request'}
        </button>

        {responseStatus !== null && (
          <div className="ae-response-panel">
            <div className="ae-response-header">
              <div className="ae-response-meta">
                <span className={`ae-response-status ${responseStatus >= 200 && responseStatus < 300 ? 'success' : 'error'}`}>
                  {responseStatus === 0 ? 'ERR' : responseStatus}
                </span>
                {responseTime !== null && <span className="ae-response-time">{responseTime}ms</span>}
              </div>
              <span className="ae-response-size">{new Blob([responseBody]).size} bytes</span>
            </div>
            <div className="ae-code-block" style={{ borderRadius: 0, border: 'none' }}>
              <div className="ae-code-body">{highlightJSON(responseBody)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Main Page ─── */
export default function ApiExplorerPage() {
  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState<HttpMethod | 'ALL'>('ALL')
  const [tryItEndpoint, setTryItEndpoint] = useState<EndpointDef | null>(null)
  const [changelogOpen, setChangelogOpen] = useState(true)

  const handleTryIt = useCallback((ep: EndpointDef) => {
    setTryItEndpoint(ep)
  }, [])

  const filtered = useMemo(() => {
    return ENDPOINTS.filter(ep => {
      if (methodFilter !== 'ALL' && ep.method !== methodFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          ep.path.toLowerCase().includes(q) ||
          ep.description.toLowerCase().includes(q) ||
          ep.tags.some(t => t.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [methodFilter, search])

  const stats = useMemo(() => ({
    total: ENDPOINTS.length,
    get: ENDPOINTS.filter(e => e.method === 'GET').length,
    post: ENDPOINTS.filter(e => e.method === 'POST').length,
    put: ENDPOINTS.filter(e => e.method === 'PUT').length,
    delete: ENDPOINTS.filter(e => e.method === 'DELETE').length,
  }), [])

  return (
    <div className="ae-container">
      {/* Top Bar */}
      <div className="ae-top-bar">
        <div className="ae-logo-area">
          <div className="ae-logo-icon"><Code2 size={18} /></div>
          <span className="ae-logo-text">API Explorer</span>
        </div>
        <div className="ae-search-bar">
          <Search size={14} className="ae-search-icon" />
          <input
            className="ae-search-input"
            placeholder="Search endpoints by path, description, or tag..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="ae-method-filters">
          <button className={`ae-filter-btn ${methodFilter === 'ALL' ? 'active' : ''}`} data-method="ALL" onClick={() => setMethodFilter('ALL')}>
            All ({stats.total})
          </button>
          <button className={`ae-filter-btn ${methodFilter === 'GET' ? 'active' : ''}`} data-method="GET" onClick={() => setMethodFilter('GET')}>
            GET ({stats.get})
          </button>
          <button className={`ae-filter-btn ${methodFilter === 'POST' ? 'active' : ''}`} data-method="POST" onClick={() => setMethodFilter('POST')}>
            POST ({stats.post})
          </button>
          <button className={`ae-filter-btn ${methodFilter === 'PUT' ? 'active' : ''}`} data-method="PUT" onClick={() => setMethodFilter('PUT')}>
            PUT ({stats.put})
          </button>
          <button className={`ae-filter-btn ${methodFilter === 'DELETE' ? 'active' : ''}`} data-method="DELETE" onClick={() => setMethodFilter('DELETE')}>
            DELETE ({stats.delete})
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="ae-main-content">
        {/* Endpoint Catalog */}
        <div className="ae-catalog">
          {/* Statistics Bar */}
          <div className="ae-stats-bar">
            <div className="ae-stat-chip total">
              <Globe size={14} />
              Total <span className="ae-stat-num">{stats.total}</span>
            </div>
            <div className="ae-stat-chip get">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ae-get)' }} />
              GET <span className="ae-stat-num">{stats.get}</span>
            </div>
            <div className="ae-stat-chip post">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ae-post)' }} />
              POST <span className="ae-stat-num">{stats.post}</span>
            </div>
            <div className="ae-stat-chip put">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ae-put)' }} />
              PUT <span className="ae-stat-num">{stats.put}</span>
            </div>
            <div className="ae-stat-chip delete">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ae-delete)' }} />
              DELETE <span className="ae-stat-num">{stats.delete}</span>
            </div>
          </div>

          {/* Changelog */}
          <div className="ae-changelog">
            <div className="ae-changelog-header" onClick={() => setChangelogOpen(prev => !prev)}>
              <GitBranch size={14} />
              API Changelog
              {changelogOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>
            {changelogOpen && (
              <div className="ae-changelog-body">
                {CHANGELOG.map(entry => (
                  <div key={entry.version} className="ae-changelog-entry">
                    <span className="ae-changelog-version">{entry.version}</span>
                    <div className="ae-changelog-desc">
                      <strong>{entry.date}</strong> — {entry.description}
                      <div style={{ marginTop: 4 }}>
                        {entry.newEndpoints.slice(0, 4).map(ep => (
                          <span key={ep} className="ae-changelog-new">{ep}</span>
                        ))}
                        {entry.newEndpoints.length > 4 && (
                          <span style={{ fontSize: 11, color: 'var(--ae-text-muted)' }}> +{entry.newEndpoints.length - 4} more</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Endpoint Cards */}
          {filtered.length === 0 ? (
            <div className="ae-empty-state">
              <div className="ae-empty-state-icon"><Filter size={40} /></div>
              <div className="ae-empty-state-text">No endpoints match your filters</div>
              <div className="ae-empty-state-sub">Try adjusting your search or method filter</div>
            </div>
          ) : (
            filtered.map(ep => (
              <div key={ep.id} className="ae-animate-in" style={{ animationDelay: `${Math.min(filtered.indexOf(ep) * 30, 300)}ms` }}>
                <EndpointCard ep={ep} onTryIt={handleTryIt} />
              </div>
            ))
          )}
        </div>

        {/* Try-It Panel */}
        {tryItEndpoint && (
          <TryItPanel
            endpoint={tryItEndpoint}
            onClose={() => setTryItEndpoint(null)}
          />
        )}
      </div>
    </div>
  )
}
