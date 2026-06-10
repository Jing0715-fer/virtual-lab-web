import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// ============================================================
// Helper functions for text analysis
// ============================================================

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
  'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'may', 'might', 'can', 'shall', 'that', 'this', 'these', 'those', 'from',
  'into', 'about', 'it', 'its', 'we', 'our', 'they', 'them', 'their',
  'not', 'no', 'if', 'as', 'so', 'than', 'then', 'also', 'just', 'more',
  'some', 'any', 'all', 'each', 'every', 'both', 'few', 'most', 'other',
  'very', 'much', 'many', 'such', 'only', 'own', 'same', 'how', 'which',
  'what', 'when', 'where', 'who', 'whom', 'your', 'you', 'i', 'me', 'my',
  'can', 'like', 'use', 'used', 'using', 'based', 'well', 'one', 'two',
  'new', 'make', 'way', 'however', 'therefore', 'thus', 'since', 'while',
  'although', 'because', 'through', 'during', 'before', 'after', 'between',
  'under', 'over', 'without', 'within', 'example', 'including', 'specific',
  'general', 'different', 'important', 'possible', 'results', 'found',
  'show', 'shows', 'showed', 'suggest', 'suggests', 'provide', 'provides',
  'given', 'using', 'may', 'also', 'known', 'case', 'need', 'approach',
]);

const POSITIVE_WORDS = new Set([
  'good', 'great', 'excellent', 'success', 'achieve', 'improve', 'positive',
  'best', 'well', 'effective', 'promising', 'strong', 'advantage', 'benefit',
  'helpful', 'innovative', 'novel', 'robust', 'significant', 'important',
  'efficient', 'reliable', 'optimal', 'high', 'better', 'leading',
  'breakthrough', 'remarkable', 'favorable', 'outstanding', 'superior',
]);

const NEGATIVE_WORDS = new Set([
  'bad', 'fail', 'poor', 'problem', 'issue', 'difficult', 'challenge',
  'negative', 'worst', 'lack', 'weak', 'limit', 'risk', 'concern', 'error',
  'wrong', 'decline', 'low', 'unclear', 'uncertain', 'limited', 'complex',
  'expensive', 'slow', 'complicated', 'trouble', 'deficiency', 'unstable',
  'inadequate', 'suboptimal',
]);

function extractKeywords(text: string, topN: number = 30): { word: string; count: number }[] {
  const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));
  const freq: Record<string, number> = {};
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1 });
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word, count]) => ({ word, count }));
}

function analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
  const lower = text.toLowerCase();
  const words = lower.split(/\W+/);
  let posCount = 0;
  let negCount = 0;
  words.forEach(w => {
    if (POSITIVE_WORDS.has(w)) posCount++;
    if (NEGATIVE_WORDS.has(w)) negCount++;
  });
  const total = posCount + negCount;
  if (total === 0) return 'neutral';
  if (posCount > negCount * 1.5) return 'positive';
  if (negCount > posCount * 1.5) return 'negative';
  return 'neutral';
}

// ============================================================
// GET /api/meeting-insights?meetingId=xxx  (or aggregate)
// ============================================================
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get('meetingId');

    // ── Specific meeting insights ──────────────────────────────────
    if (meetingId) {
      return handleSpecificMeeting(meetingId);
    }

    // ── Aggregate insights across all meetings ────────────────────
    return handleAggregateInsights();
  } catch (error) {
    console.error("Failed to fetch meeting insights:", error);
    return NextResponse.json(
      { error: "Failed to fetch meeting insights" },
      { status: 500 }
    );
  }
}

// ============================================================
// Specific Meeting Handler
// ============================================================
async function handleSpecificMeeting(meetingId: string) {
  // Try team meeting first
  let meeting = await db.teamMeeting.findUnique({
    where: { id: meetingId },
    include: { teamLead: true, teamMembers: true, messages: true },
  });

  let meetingType = 'team' as const;

  if (!meeting) {
    meeting = await db.individualMeeting.findUnique({
      where: { id: meetingId },
      include: { teamMember: true, messages: true },
    }) as any;
    meetingType = 'individual';
  }

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  const messages = 'messages' in meeting ? (meeting as any).messages : [];
  const totalMessages = messages.length;

  if (totalMessages === 0) {
    return NextResponse.json({
      meetingId,
      meetingType,
      totalMessages: 0,
      agentStats: [],
      speakingTime: [],
      topicFrequency: [],
      sentimentIndicators: { positive: 0, negative: 0, neutral: 0 },
      roundAnalysis: [],
    });
  }

  // Message length statistics per agent
  const agentMessageMap = new Map<string, { lengths: number[]; count: number }>();
  for (const msg of messages) {
    const name = (msg as any).agentName || 'Unknown';
    if (!agentMessageMap.has(name)) {
      agentMessageMap.set(name, { lengths: [], count: 0 });
    }
    const entry = agentMessageMap.get(name)!;
    entry.lengths.push((msg as any).message?.length || 0);
    entry.count++;
  }

  const agentStats = Array.from(agentMessageMap.entries()).map(([name, data]) => ({
    agentName: name,
    totalMessages: data.count,
    avgLength: Math.round(data.lengths.reduce((a, b) => a + b, 0) / Math.max(data.lengths.length, 1)),
    minLength: Math.min(...data.lengths),
    maxLength: Math.max(...data.lengths),
  }));

  // Speaking time distribution (message count / total)
  const speakingTime = agentStats.map(a => ({
    agentName: a.agentName,
    percentage: Math.round((a.totalMessages / totalMessages) * 1000) / 10,
    messageCount: a.totalMessages,
  }));

  // Topic frequency
  const allText = messages.map((m: any) => (m as any).message || '').join(' ');
  const topicFrequency = extractKeywords(allText, 25);

  // Sentiment indicators
  let positive = 0, negative = 0, neutral = 0;
  for (const msg of messages) {
    const sentiment = analyzeSentiment((msg as any).message || '');
    if (sentiment === 'positive') positive++;
    else if (sentiment === 'negative') negative++;
    else neutral++;
  }

  // Round-by-round analysis
  const roundMap = new Map<number, { messages: any[]; participants: Set<string> }>();
  for (const msg of messages) {
    const round = (msg as any).roundIndex ?? 0;
    if (!roundMap.has(round)) {
      roundMap.set(round, { messages: [], participants: new Set() });
    }
    roundMap.get(round)!.messages.push(msg);
    roundMap.get(round)!.participants.add((msg as any).agentName || 'Unknown');
  }

  const roundAnalysis = Array.from(roundMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([round, data]) => ({
      roundIndex: round,
      messageCount: data.messages.length,
      participants: data.participants.size,
      participantNames: Array.from(data.participants),
    }));

  // First round messages for proactivity
  const firstRoundMessages = roundMap.get(0)?.messages || [];
  const firstRoundSpeakers = new Set(firstRoundMessages.map((m: any) => (m as any).agentName || 'Unknown'));

  // Add proactivity to agent stats
  const enrichedStats = agentStats.map(a => ({
    ...a,
    proactivity: firstRoundSpeakers.has(a.agentName) ? 1 : 0,
    conciseness: Math.round(Math.max(0, 100 - (a.avgLength / 5))),
    participationRate: Math.round((a.totalMessages / totalMessages) * 1000) / 10,
  }));

  return NextResponse.json({
    meetingId,
    meetingType,
    totalMessages,
    agentStats: enrichedStats,
    speakingTime,
    topicFrequency,
    sentimentIndicators: { positive, negative, neutral },
    roundAnalysis,
  });
}

// ============================================================
// Aggregate Insights Handler
// ============================================================
async function handleAggregateInsights() {
  const [teamMeetings, individualMeetings, agents] = await Promise.all([
    db.teamMeeting.findMany({
      orderBy: { createdAt: 'desc' },
      include: { teamLead: true, teamMembers: true, messages: true },
    }),
    db.individualMeeting.findMany({
      orderBy: { createdAt: 'desc' },
      include: { teamMember: true, messages: true },
    }),
    db.agent.findMany(),
  ]);

  // Combine all meetings into a normalized format
  const allMeetings = [
    ...teamMeetings.map(m => ({
      id: m.id,
      type: 'team' as const,
      status: m.status,
      agenda: m.agenda,
      saveName: m.saveName,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      messages: m.messages,
      participants: [
        m.teamLead.title,
        ...m.teamMembers.map(a => a.title),
      ],
    })),
    ...individualMeetings.map(m => ({
      id: m.id,
      type: 'individual' as const,
      status: m.status,
      agenda: m.agenda,
      saveName: m.saveName,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      messages: m.messages,
      participants: [m.teamMember.title],
    })),
  ];

  const completedMeetings = allMeetings.filter(m => m.status === 'completed');
  const totalMeetings = allMeetings.length;
  const completedCount = completedMeetings.length;

  // ── Most Active Agents ─────────────────────────────────────────
  const agentActivityMap = new Map<string, number>();
  for (const m of allMeetings) {
    for (const msg of m.messages) {
      const name = (msg as any).agentName;
      if (name && name !== 'User') {
        agentActivityMap.set(name, (agentActivityMap.get(name) || 0) + 1);
      }
    }
  }
  const mostActiveAgents = Array.from(agentActivityMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => {
      const agent = agents.find(a => a.title === name);
      return {
        agentName: name,
        totalMessages: count,
        color: agent?.color || '#6366f1',
        icon: agent?.icon || 'bot',
      };
    });

  // ── Average Meeting Duration (proxy from message count × ~30s) ──
  const totalAllMessages = allMeetings.reduce((s, m) => s + m.messages.length, 0);
  const avgMeetingDuration = totalMeetings > 0
    ? Math.round((totalAllMessages / totalMeetings) * 30)
    : 0;

  // ── Meeting Completion Rate ───────────────────────────────────
  const completionRate = totalMeetings > 0
    ? Math.round((completedCount / totalMeetings) * 100)
    : 0;

  // ── Agent Collaboration Frequency (co-participation matrix) ────
  const agentMeetingSets = new Map<string, Set<string>>();
  for (const m of allMeetings) {
    for (const msg of m.messages) {
      const name = (msg as any).agentName;
      if (name && name !== 'User') {
        if (!agentMeetingSets.has(name)) agentMeetingSets.set(name, new Set());
        agentMeetingSets.get(name)!.add(m.id);
      }
    }
  }

  const agentNames = Array.from(agentMeetingSets.keys()).sort();
  const collaborationMatrix: { agent1: string; agent2: string; sharedMeetings: number }[] = [];

  for (let i = 0; i < agentNames.length; i++) {
    for (let j = i; j < agentNames.length; j++) {
      const setA = agentMeetingSets.get(agentNames[i]) || new Set();
      const setB = agentMeetingSets.get(agentNames[j]) || new Set();
      const shared = [...setA].filter(id => setB.has(id)).length;
      if (shared > 0 || i === j) {
        collaborationMatrix.push({
          agent1: agentNames[i],
          agent2: agentNames[j],
          sharedMeetings: shared,
        });
      }
    }
  }

  // ── Topic frequency across all meetings ────────────────────────
  const allText = completedMeetings
    .flatMap(m => m.messages)
    .map(msg => (msg as any).message || '')
    .join(' ');
  const globalTopicFrequency = extractKeywords(allText, 40);

  // ── Meeting Timeline Data ───────────────────────────────────────
  const meetingTimeline = allMeetings
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map(m => ({
      id: m.id,
      name: m.saveName || m.agenda?.substring(0, 30) || 'Untitled',
      type: m.type,
      status: m.status,
      date: m.createdAt,
      messageCount: m.messages.length,
    }));

  // ── Team vs Individual message comparison ──────────────────────
  const teamMessages = teamMeetings.reduce((s, m) => s + m.messages.length, 0);
  const indMessages = individualMeetings.reduce((s, m) => s + m.messages.length, 0);
  const teamAvg = teamMeetings.length > 0 ? Math.round(teamMessages / teamMeetings.length) : 0;
  const indAvg = individualMeetings.length > 0 ? Math.round(indMessages / individualMeetings.length) : 0;
  const messageDifference = teamAvg > 0 && indAvg > 0
    ? Math.round(((teamAvg - indAvg) / indAvg) * 100)
    : 0;

  // ── Agent per-meeting message data for radar charts ────────────
  const agentPerMeetingData = mostActiveAgents.map(aa => {
    const meetingsWithAgent = allMeetings.filter(m =>
      m.messages.some((msg: any) => (msg as any).agentName === aa.agentName)
    );
    const messagesPerMeeting = meetingsWithAgent.map(m =>
      m.messages.filter((msg: any) => (msg as any).agentName === aa.agentName).length
    );
    const last5 = messagesPerMeeting.slice(-5);
    return {
      agentName: aa.agentName,
      color: aa.color,
      icon: aa.icon,
      totalMessages: aa.totalMessages,
      meetingsParticipated: meetingsWithAgent.length,
      avgMessagesPerMeeting: messagesPerMeeting.length > 0
        ? Math.round(messagesPerMeeting.reduce((a, b) => a + b, 0) / messagesPerMeeting.length)
        : 0,
      messagesPerMeeting: messagesPerMeeting,
      last5Messages: last5,
    };
  });

  // ── Auto-generated insights ────────────────────────────────────
  const insights: string[] = [];

  if (mostActiveAgents.length > 0) {
    const top = mostActiveAgents[0];
    insights.push(
      `${top.agentName} was the most active participant with ${top.totalMessages} messages`
    );
  }

  if (completedMeetings.length > 0) {
    const avgMsgs = Math.round(totalAllMessages / Math.max(completedCount, 1));
    const avgRounds = Math.round(
      completedMeetings.reduce((s, m) => s + Math.max(...m.messages.map((msg: any) => (msg as any).roundIndex || 0) + 1), 0) / completedCount
    );
    insights.push(
      `Average meeting produced ${avgMsgs} messages across ${avgRounds} rounds`
    );
  }

  if (messageDifference !== 0) {
    const direction = messageDifference > 0 ? 'more' : 'fewer';
    insights.push(
      `Team meetings had ${Math.abs(messageDifference)}% ${direction} messages than individual meetings`
    );
  }

  if (globalTopicFrequency.length > 0) {
    insights.push(
      `Most discussed topic: "${globalTopicFrequency[0].word}" (${globalTopicFrequency[0].count} mentions)`
    );
  }

  if (agentNames.length > 1) {
    insights.push(
      `${agentNames.length} unique agents participated across ${totalMeetings} meetings`
    );
  }

  // ── Agent radar metrics ────────────────────────────────────────
  const totalAllAgentMessages = agentActivityMap
    ? Array.from(agentActivityMap.values()).reduce((a, b) => a + b, 0)
    : 0;

  const agentRadarData = agentPerMeetingData.map(ad => {
    const participationRate = totalAllAgentMessages > 0
      ? Math.round((ad.totalMessages / totalAllAgentMessages) * 100)
      : 0;

    // Average message length normalized (0-100, shorter is more concise)
    const avgLen = completedMeetings
      .flatMap(m => m.messages)
      .filter((msg: any) => (msg as any).agentName === ad.agentName);
    const avgMessageLen = avgLen.length > 0
      ? Math.round(avgLen.reduce((s: number, m: any) => s + ((m as any).message?.length || 0), 0) / avgLen.length)
      : 0;
    const conciseness = Math.max(0, Math.min(100, 100 - avgMessageLen / 10));

    // Proactivity: messages in round 0 as percentage of agent's messages
    const round0Msgs = completedMeetings
      .flatMap(m => m.messages)
      .filter((msg: any) => (msg as any).agentName === ad.agentName && ((msg as any).roundIndex || 0) === 0);
    const proactivity = ad.totalMessages > 0
      ? Math.round((round0Msgs.length / ad.totalMessages) * 100)
      : 0;

    // Responsiveness: average round index (lower = more responsive)
    const roundIndices = completedMeetings
      .flatMap(m => m.messages)
      .filter((msg: any) => (msg as any).agentName === ad.agentName)
      .map((msg: any) => (msg as any).roundIndex || 0);
    const avgRound = roundIndices.length > 0
      ? roundIndices.reduce((a, b) => a + b, 0) / roundIndices.length
      : 0;
    const responsiveness = Math.max(0, Math.min(100, 100 - avgRound * 20));

    return {
      agentName: ad.agentName,
      color: ad.color,
      icon: ad.icon,
      metrics: {
        participationRate,
        avgMessageLength: Math.min(100, avgMessageLen / 5),
        proactivity,
        responsiveness,
        conciseness,
      },
    };
  });

  return NextResponse.json({
    totalMeetings,
    completedMeetings: completedCount,
    completionRate,
    avgMeetingDuration,
    totalMessages: totalAllMessages,
    avgMessagesPerMeeting: totalMeetings > 0 ? Math.round(totalAllMessages / totalMeetings) : 0,
    mostActiveAgents,
    collaborationMatrix,
    agentNames,
    globalTopicFrequency,
    meetingTimeline,
    teamAvgMessages: teamAvg,
    individualAvgMessages: indAvg,
    messageDifference,
    agentPerMeetingData,
    agentRadarData,
    insights,
  });
}
