import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// GET /api/meeting-analytics?meetingId=xxx
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get("meetingId");

    if (meetingId) {
      return handleSingleMeeting(meetingId);
    }
    return handleAllMeetings();
  } catch (error) {
    console.error("Failed to fetch meeting analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch meeting analytics" },
      { status: 500 }
    );
  }
}

// ============================================================
// All Meetings Analytics
// ============================================================
async function handleAllMeetings() {
  const [teamMeetings, individualMeetings, agents] = await Promise.all([
    db.teamMeeting.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        teamLead: true,
        teamMembers: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
    }),
    db.individualMeeting.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        teamMember: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
    }),
    db.agent.findMany(),
  ]);

  const allMeetings = [
    ...teamMeetings.map((m) => ({
      id: m.id,
      type: "team" as const,
      agenda: m.agenda,
      status: m.status,
      summary: m.summary,
      saveName: m.saveName,
      numRounds: m.numRounds,
      temperature: m.temperature,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
      messages: m.messages.map((msg) => ({
        id: msg.id,
        agentName: msg.agentName,
        message: msg.message,
        roundIndex: msg.roundIndex,
        createdAt: msg.createdAt.toISOString(),
      })),
    })),
    ...individualMeetings.map((m) => ({
      id: m.id,
      type: "individual" as const,
      agenda: m.agenda,
      status: m.status,
      summary: m.summary,
      saveName: m.saveName,
      numRounds: null,
      temperature: m.temperature,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
      messages: m.messages.map((msg) => ({
        id: msg.id,
        agentName: msg.agentName,
        message: msg.message,
        roundIndex: msg.roundIndex,
        createdAt: msg.createdAt.toISOString(),
      })),
    })),
  ];

  const allMessages = allMeetings.flatMap((m) => m.messages);
  const totalMeetings = allMeetings.length;
  const completedMeetings = allMeetings.filter((m) => m.status === "completed");
  const totalMessages = allMessages.length;
  const avgMessagesPerMeeting = totalMeetings > 0 ? Math.round((totalMessages / totalMeetings) * 10) / 10 : 0;

  // Average duration (calculated from createdAt to updatedAt in minutes)
  const avgDurationMin = totalMeetings > 0
    ? Math.round(
        allMeetings.reduce((sum, m) => {
          const created = new Date(m.createdAt).getTime();
          const updated = new Date(m.updatedAt).getTime();
          return sum + Math.max(1, (updated - created) / 60000);
        }, 0) / totalMeetings
      )
    : 0;

  // Agent participation
  const agentMessageCount = new Map<string, number>();
  const agentMeetingCount = new Map<string, Set<string>>();
  const agentResponseLengths = new Map<string, number[]>();

  for (const msg of allMessages) {
    if (msg.agentName === "User") continue;
    agentMessageCount.set(msg.agentName, (agentMessageCount.get(msg.agentName) || 0) + 1);
    const wordCount = msg.message.split(/\s+/).filter(Boolean).length;
    if (!agentResponseLengths.has(msg.agentName)) agentResponseLengths.set(msg.agentName, []);
    agentResponseLengths.get(msg.agentName)!.push(wordCount);
  }

  for (const m of allMeetings) {
    const agentNames = new Set(m.messages.map((msg) => msg.agentName).filter((n) => n !== "User"));
    for (const name of agentNames) {
      if (!agentMeetingCount.has(name)) agentMeetingCount.set(name, new Set());
      agentMeetingCount.get(name)!.add(m.id);
    }
  }

  const agentContributions = Array.from(agentMessageCount.keys()).map((name) => ({
    agentName: name,
    totalMessages: agentMessageCount.get(name) || 0,
    meetingsParticipated: agentMeetingCount.get(name)?.size || 0,
    avgResponseLength:
      agentResponseLengths.has(name) && agentResponseLengths.get(name)!.length > 0
        ? Math.round(
            agentResponseLengths.get(name)!.reduce((a, b) => a + b, 0) /
              agentResponseLengths.get(name)!.length
          )
        : 0,
  })).sort((a, b) => b.totalMessages - a.totalMessages);

  // Agent participation rate: unique agents / total agents
  const uniqueAgentsInMeetings = new Set(agentMessageCount.keys());
  const participationRate = agents.length > 0
    ? Math.round((uniqueAgentsInMeetings.size / agents.length) * 100)
    : 0;

  // Meeting completion rate
  const completionRate = totalMeetings > 0
    ? Math.round((completedMeetings.length / totalMeetings) * 100)
    : 0;

  // Active research topics
  const topicKeywords = extractTopicsFromMessages(allMessages);
  const activeTopicsCount = topicKeywords.length;

  // Meeting activity heatmap data (past 5 weeks × 7 days)
  const heatmapData = generateHeatmapData(allMeetings);

  // Meeting type distribution
  const teamCount = teamMeetings.length;
  const individualCount = individualMeetings.length;

  // Response time analysis (messages per round)
  const responseTimeData = generateResponseTimeData(allMeetings);

  // Meeting efficiency score (0-100)
  const efficiencyScore = calculateEfficiency(allMeetings, allMessages);

  // Weekly trend (last 8 weeks)
  const weeklyTrend = generateWeeklyTrend(allMeetings);

  // Sentiment analysis
  const sentimentData = computeSentiment(allMessages);

  // Topic frequency data
  const topicFrequency = topicKeywords.slice(0, 20).map(([word, count]) => ({
    word,
    count,
  }));

  // Per-message sentiment timeline
  const sentimentTimeline = computeSentimentTimeline(allMessages);

  // Per-agent sentiment
  const perAgentSentiment = computePerAgentSentiment(allMessages);

  // Message length distribution
  const messageLengthDistribution = computeMessageLengthDistribution(allMessages);

  // Vocabulary diversity
  const vocabularyDiversity = computeVocabularyDiversity(allMessages);

  return NextResponse.json({
    overview: {
      totalMeetings,
      totalMessages,
      avgDurationMin,
      avgMessagesPerMeeting,
      participationRate,
      completionRate,
      activeTopicsCount,
      teamCount,
      individualCount,
    },
    heatmap: heatmapData,
    agentContributions,
    meetingType: { team: teamCount, individual: individualCount },
    responseTime: responseTimeData,
    efficiencyScore,
    weeklyTrend,
    sentiment: sentimentData,
    topicFrequency,
    sentimentTimeline,
    perAgentSentiment,
    messageLengthDistribution,
    vocabularyDiversity,
  });
}

// ============================================================
// Single Meeting Analytics
// ============================================================
async function handleSingleMeeting(meetingId: string) {
  const [teamMeeting, individualMeeting] = await Promise.all([
    db.teamMeeting.findUnique({
      where: { id: meetingId },
      include: {
        teamLead: true,
        teamMembers: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
    }),
    db.individualMeeting.findUnique({
      where: { id: meetingId },
      include: {
        teamMember: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
    }),
  ]);

  const meeting = teamMeeting
    ? {
        id: teamMeeting.id,
        type: "team" as const,
        agenda: teamMeeting.agenda,
        status: teamMeeting.status,
        summary: teamMeeting.summary,
        saveName: teamMeeting.saveName,
        numRounds: teamMeeting.numRounds,
        temperature: teamMeeting.temperature,
        messages: teamMeeting.messages.map((msg) => ({
          id: msg.id,
          agentName: msg.agentName,
          message: msg.message,
          roundIndex: msg.roundIndex,
          createdAt: msg.createdAt.toISOString(),
        })),
      }
    : individualMeeting
    ? {
        id: individualMeeting.id,
        type: "individual" as const,
        agenda: individualMeeting.agenda,
        status: individualMeeting.status,
        summary: individualMeeting.summary,
        saveName: individualMeeting.saveName,
        numRounds: null,
        temperature: individualMeeting.temperature,
        messages: individualMeeting.messages.map((msg) => ({
          id: msg.id,
          agentName: msg.agentName,
          message: msg.message,
          roundIndex: msg.roundIndex,
          createdAt: msg.createdAt.toISOString(),
        })),
      }
    : null;

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  const allMessages = meeting.messages;
  const topicKeywords = extractTopicsFromMessages(allMessages);
  const sentimentData = computeSentiment(allMessages);
  const sentimentTimeline = computeSentimentTimeline(allMessages);
  const perAgentSentiment = computePerAgentSentiment(allMessages);
  const messageLengthDistribution = computeMessageLengthDistribution(allMessages);
  const vocabularyDiversity = computeVocabularyDiversity(allMessages);

  // Agent contributions for this meeting
  const agentContribs = new Map<string, { count: number; lengths: number[] }>();
  for (const msg of allMessages) {
    if (msg.agentName === "User") continue;
    if (!agentContribs.has(msg.agentName)) agentContribs.set(msg.agentName, { count: 0, lengths: [] });
    const entry = agentContribs.get(msg.agentName)!;
    entry.count++;
    entry.lengths.push(msg.message.split(/\s+/).filter(Boolean).length);
  }

  const agentContributions = Array.from(agentContribs.entries()).map(([name, data]) => ({
    agentName: name,
    totalMessages: data.count,
    meetingsParticipated: 1,
    avgResponseLength: data.lengths.length > 0 ? Math.round(data.lengths.reduce((a, b) => a + b, 0) / data.lengths.length) : 0,
  })).sort((a, b) => b.totalMessages - a.totalMessages);

  const totalWords = allMessages.reduce((sum, msg) => sum + msg.message.split(/\s+/).filter(Boolean).length, 0);
  const uniqueRounds = [...new Set(allMessages.map((m) => m.roundIndex))].length;
  const efficiency = calculateEfficiency([meeting], allMessages);

  return NextResponse.json({
    meeting,
    overview: {
      totalMeetings: 1,
      totalMessages: allMessages.length,
      avgDurationMin: 0,
      avgMessagesPerMeeting: allMessages.length,
      participationRate: 100,
      completionRate: meeting.status === "completed" ? 100 : 0,
      activeTopicsCount: topicKeywords.length,
      teamCount: meeting.type === "team" ? 1 : 0,
      individualCount: meeting.type === "individual" ? 1 : 0,
    },
    agentContributions,
    sentiment: sentimentData,
    topicFrequency: topicKeywords.slice(0, 20).map(([word, count]) => ({ word, count })),
    sentimentTimeline,
    perAgentSentiment,
    messageLengthDistribution,
    vocabularyDiversity,
    efficiencyScore: efficiency,
    responseTime: allMessages.length > 0
      ? [{ round: uniqueRounds, messagesPerRound: Math.round(allMessages.length / Math.max(1, uniqueRounds)) }]
      : [],
    weeklyTrend: [],
    heatmap: [],
    meetingType: { team: meeting.type === "team" ? 1 : 0, individual: meeting.type === "individual" ? 1 : 0 },
  });
}

// ============================================================
// Helper Functions
// ============================================================

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "need", "must", "ought",
  "to", "of", "in", "for", "on", "with", "at", "by", "from", "as",
  "into", "through", "during", "before", "after", "above", "below",
  "between", "out", "off", "over", "under", "again", "further", "then",
  "once", "and", "but", "or", "nor", "not", "so", "yet", "both",
  "either", "neither", "each", "every", "all", "any", "few", "more",
  "most", "other", "some", "such", "no", "only", "own", "same", "than",
  "too", "very", "just", "because", "if", "when", "where", "how",
  "what", "which", "who", "whom", "this", "that", "these", "those",
  "i", "me", "my", "we", "our", "you", "your", "he", "him", "his",
  "she", "her", "it", "its", "they", "them", "their", "about", "up",
  "also", "while", "using", "used", "use", "based", "key",
  "new", "like", "well", "way", "make", "much", "many", "get", "got",
  "however", "therefore", "thus", "hence", "including", "include",
  "one", "two", "three", "first", "second", "example",
]);

function extractTopicsFromMessages(messages: { message: string }[]): [string, number][] {
  const freq = new Map<string, number>();
  for (const msg of messages) {
    const words = msg.message
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w));
    for (const word of words) {
      freq.set(word, (freq.get(word) || 0) + 1);
    }
  }
  return Array.from(freq.entries()).sort((a, b) => b[1] - a[1]);
}

const POSITIVE_WORDS = new Set([
  "good", "great", "excellent", "best", "better", "strong", "effective",
  "success", "successful", "positive", "promising", "innovative", "novel",
  "efficient", "robust", "reliable", "optimal", "ideal", "significant",
  "important", "valuable", "beneficial", "advantageous", "improved",
  "enhanced", "superior", "notable", "remarkable", "impressive", "breakthrough",
  "achieve", "achieved", "progress", "advance", "solution", "potential",
  "insight", "recommend", "proposed", "suggest",
]);

const NEGATIVE_WORDS = new Set([
  "bad", "poor", "worst", "weak", "ineffective", "failure", "fail",
  "negative", "problem", "problems", "issue", "issues", "concern",
  "concerns", "risk", "risks", "challenge", "challenges", "difficult",
  "complex", "complicated", "unclear", "uncertain",
  "limited", "limitation", "gap", "gaps", "lack", "missing",
  "insufficient", "inadequate", "flaw", "flaws", "error", "errors",
  "drawback", "obstacle", "warning", "caution", "pitfall",
]);

function computeSentiment(messages: { message: string }[]) {
  let posCount = 0;
  let negCount = 0;
  let totalWords = 0;

  for (const msg of messages) {
    const words = msg.message.toLowerCase().split(/\s+/);
    totalWords += words.length;
    for (const word of words) {
      const clean = word.replace(/[^a-z]/g, "");
      if (POSITIVE_WORDS.has(clean)) posCount++;
      if (NEGATIVE_WORDS.has(clean)) negCount++;
    }
  }

  const positive = totalWords > 0 ? Math.round((posCount / totalWords) * 100) : 0;
  const negative = totalWords > 0 ? Math.round((negCount / totalWords) * 100) : 0;
  const neutral = Math.max(0, 100 - positive - negative);

  return { positive, neutral, negative };
}

function computeSentimentTimeline(messages: { message: string; roundIndex: number; createdAt: string }[]) {
  return messages.slice(0, 100).map((msg, index) => {
    const words = msg.message.toLowerCase().split(/\s+/);
    let pos = 0;
    let neg = 0;
    for (const word of words) {
      const clean = word.replace(/[^a-z]/g, "");
      if (POSITIVE_WORDS.has(clean)) pos++;
      if (NEGATIVE_WORDS.has(clean)) neg++;
    }
    return {
      index,
      round: msg.roundIndex,
      score: pos > neg ? 1 : neg > pos ? -1 : 0,
      positive: pos,
      negative: neg,
    };
  });
}

function computePerAgentSentiment(messages: { message: string; agentName: string }[]) {
  const agentMap = new Map<string, { pos: number; neg: number; total: number }>();

  for (const msg of messages) {
    if (msg.agentName === "User") continue;
    if (!agentMap.has(msg.agentName)) agentMap.set(msg.agentName, { pos: 0, neg: 0, total: 0 });
    const entry = agentMap.get(msg.agentName)!;
    entry.total++;
    const words = msg.message.toLowerCase().split(/\s+/);
    for (const word of words) {
      const clean = word.replace(/[^a-z]/g, "");
      if (POSITIVE_WORDS.has(clean)) entry.pos++;
      if (NEGATIVE_WORDS.has(clean)) entry.neg++;
    }
  }

  return Array.from(agentMap.entries()).map(([agent, data]) => ({
    agent,
    positive: data.total > 0 ? Math.round((data.pos / Math.max(1, data.pos + data.neg + data.total * 0.8)) * 100) : 0,
    neutral: data.total > 0 ? Math.round((data.total * 0.8 / Math.max(1, data.pos + data.neg + data.total * 0.8)) * 100) : 0,
    negative: data.total > 0 ? Math.round((data.neg / Math.max(1, data.pos + data.neg + data.total * 0.8)) * 100) : 0,
    total: data.total,
  }));
}

function computeMessageLengthDistribution(messages: { message: string }[]) {
  const buckets = [
    { range: "0-25", min: 0, max: 25, count: 0 },
    { range: "26-50", min: 26, max: 50, count: 0 },
    { range: "51-100", min: 51, max: 100, count: 0 },
    { range: "101-200", min: 101, max: 200, count: 0 },
    { range: "201-500", min: 201, max: 500, count: 0 },
    { range: "500+", min: 501, max: Infinity, count: 0 },
  ];

  for (const msg of messages) {
    const wordCount = msg.message.split(/\s+/).filter(Boolean).length;
    for (const bucket of buckets) {
      if (wordCount >= bucket.min && wordCount <= bucket.max) {
        bucket.count++;
        break;
      }
    }
  }

  return buckets;
}

function computeVocabularyDiversity(messages: { message: string }[]) {
  const allWords: string[] = [];
  const uniqueWords = new Set<string>();

  for (const msg of messages) {
    const words = msg.message.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    allWords.push(...words);
    for (const word of words) uniqueWords.add(word);
  }

  const totalWords = allWords.length;
  const uniqueCount = uniqueWords.size;
  const ratio = totalWords > 0 ? Math.round((uniqueCount / totalWords) * 100) : 0;

  return {
    totalWords,
    uniqueWords: uniqueCount,
    diversityRatio: ratio,
    trend: ratio > 60 ? "high" : ratio > 40 ? "medium" : "low",
  };
}

function generateHeatmapData(meetings: { createdAt: string }[]) {
  const heatmap: { week: number; day: number; count: number; date: string }[] = [];
  const now = new Date();

  for (let week = 4; week >= 0; week--) {
    for (let day = 0; day < 7; day++) {
      const date = new Date(now);
      date.setDate(date.getDate() - week * 7 - (6 - day));
      const dateStr = date.toISOString().split("T")[0];

      const count = meetings.filter(
        (m) => m.createdAt.split("T")[0] === dateStr
      ).length;

      heatmap.push({ week: 4 - week, day, count, date: dateStr });
    }
  }

  return heatmap;
}

function generateResponseTimeData(meetings: { messages: { roundIndex: number }[] }[]) {
  const roundMap = new Map<number, { rounds: number; messages: number }>();

  for (const meeting of meetings) {
    const rounds = [...new Set(meeting.messages.map((m) => m.roundIndex))];
    const msgCount = meeting.messages.length;

    for (const round of rounds) {
      const existing = roundMap.get(round);
      if (existing) {
        existing.rounds++;
        existing.messages += msgCount;
      } else {
        roundMap.set(round, { rounds: 1, messages: msgCount });
      }
    }
  }

  return Array.from(roundMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([round, data]) => ({
      round,
      messagesPerRound:
        data.rounds > 0
          ? Math.round((data.messages / data.rounds) * 10) / 10
          : 0,
    }));
}

function calculateEfficiency(meetings: { messages: { roundIndex: number }[]; status: string; summary: string | null }[], allMessages: unknown[]) {
  if (meetings.length === 0) return 0;

  const completed = meetings.filter((m) => m.status === "completed").length;
  const completionScore = Math.min(25, Math.round((completed / meetings.length) * 25));

  const avgMessages = meetings.length > 0 ? allMessages.length / meetings.length : 0;
  const messageScore = Math.min(25, avgMessages > 0 ? Math.min(25, Math.round(Math.min(avgMessages / 10, 1) * 25)) : 0);

  const avgRounds =
    meetings.length > 0
      ? meetings.reduce(
          (sum, m) =>
            sum + Math.max(1, [...new Set(m.messages.map((msg) => msg.roundIndex))].length),
          0
        ) / meetings.length
      : 0;
  const roundScore = Math.min(25, Math.round(Math.min(avgRounds / 5, 1) * 25));

  const withSummary = meetings.filter((m) => m.summary && m.summary.length > 10).length;
  const summaryScore = Math.min(25, Math.round((withSummary / meetings.length) * 25));

  return completionScore + messageScore + roundScore + summaryScore;
}

function generateWeeklyTrend(meetings: { createdAt: string }[]) {
  const now = new Date();
  const weeks: { week: string; count: number }[] = [];

  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - i * 7);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const label = `W${8 - i}`;
    const count = meetings.filter((m) => {
      const created = new Date(m.createdAt);
      return created >= weekStart && created < weekEnd;
    }).length;

    weeks.push({ week: label, count });
  }

  return weeks;
}
