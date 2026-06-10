import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// ============================================================
// Types
// ============================================================

interface AgentMood {
  agentId: string;
  agentName: string;
  mood: string;
  moodScore: number;
  confidence: number;
  trend: "rising" | "stable" | "declining";
  triggers: string[];
  moodEmoji: string;
  color: string;
  lastUpdated: string;
}

// ============================================================
// Mood categories configuration
// ============================================================

const MOOD_CATEGORIES = {
  enthusiastic: {
    emoji: "\u{1F31F}",
    color: "#10b981",
    label: "Enthusiastic",
  },
  focused: {
    emoji: "\u{1F3AF}",
    color: "#8b5cf6",
    label: "Focused",
  },
  analytical: {
    emoji: "\u{1F52C}",
    color: "#06b6d4",
    label: "Analytical",
  },
  creative: {
    emoji: "\u{1F3A8}",
    color: "#f59e0b",
    label: "Creative",
  },
  cautious: {
    emoji: "\u{1F6E1}\u{FE0F}",
    color: "#f97316",
    label: "Cautious",
  },
  collaborative: {
    emoji: "\u{1F91D}",
    color: "#ec4899",
    label: "Collaborative",
  },
} as const;

type MoodKey = keyof typeof MOOD_CATEGORIES;

// ============================================================
// Mood calculation engine
// ============================================================

function calculateMoodFromData(data: {
  meetingFrequency: number;
  avgMessageLength: number;
  participationRate: number;
  recentActivityHours: number;
  questionRatio: number;
  longMessageRatio: number;
  uniqueTopics: number;
  meetingsCount: number;
}): { mood: MoodKey; score: number; triggers: string[] } {
  const scores: Record<MoodKey, number> = {
    enthusiastic: 0,
    focused: 0,
    analytical: 0,
    creative: 0,
    cautious: 0,
    collaborative: 0,
  };

  const triggers: string[] = [];

  // Meeting frequency influence (meetings in last 7 days)
  if (data.meetingFrequency >= 5) {
    scores.enthusiastic += 30;
    triggers.push("High meeting frequency (5+/week)");
  } else if (data.meetingFrequency >= 3) {
    scores.focused += 25;
    triggers.push("Moderate meeting frequency (3-4/week)");
  } else if (data.meetingFrequency >= 1) {
    scores.cautious += 15;
    triggers.push("Low meeting frequency (1-2/week)");
  }

  // Average message length patterns
  if (data.avgMessageLength > 300) {
    scores.analytical += 25;
    triggers.push("Detailed responses (300+ chars avg)");
  } else if (data.avgMessageLength > 150) {
    scores.focused += 20;
    triggers.push("Medium-length responses (150-300 chars)");
  } else if (data.avgMessageLength > 0) {
    scores.enthusiastic += 15;
    triggers.push("Brief responses (<150 chars)");
  }

  // Participation rate (messages / total possible messages)
  if (data.participationRate > 0.7) {
    scores.collaborative += 30;
    triggers.push("High participation rate (>70%)");
  } else if (data.participationRate > 0.4) {
    scores.focused += 20;
    triggers.push("Moderate participation (40-70%)");
  } else if (data.participationRate > 0) {
    scores.cautious += 15;
    triggers.push("Low participation (<40%)");
  }

  // Recent activity (hours since last message)
  if (data.recentActivityHours < 1) {
    scores.enthusiastic += 25;
    triggers.push("Very recent activity (<1 hour ago)");
  } else if (data.recentActivityHours < 24) {
    scores.focused += 20;
    triggers.push("Recent activity (<24 hours ago)");
  } else if (data.recentActivityHours < 168) {
    scores.cautious += 10;
    triggers.push("Moderate activity (1-7 days ago)");
  }

  // Question ratio (questions / total messages) — collaborative and analytical
  if (data.questionRatio > 0.3) {
    scores.collaborative += 20;
    triggers.push("Asks many questions (>30%)");
    scores.analytical += 10;
  } else if (data.questionRatio > 0.1) {
    scores.analytical += 15;
    triggers.push("Moderate question asking (10-30%)");
  }

  // Long message ratio — analytical
  if (data.longMessageRatio > 0.5) {
    scores.analytical += 20;
    triggers.push("Mostly long messages (>500 chars)");
  } else if (data.longMessageRatio > 0.2) {
    scores.creative += 10;
    triggers.push("Mix of message lengths");
  }

  // Unique topics
  if (data.uniqueTopics > 10) {
    scores.creative += 25;
    triggers.push("Explores many topics (10+)");
  } else if (data.uniqueTopics > 5) {
    scores.focused += 15;
    triggers.push("Focused topics (5-10)");
  }

  // Total meetings influence
  if (data.meetingsCount >= 10) {
    scores.collaborative += 15;
    triggers.push("Experienced (10+ meetings)");
  }

  // Determine dominant mood
  const sorted = Object.entries(scores).sort(
    ([, a], [, b]) => b - a
  ) as [MoodKey, number][];

  const dominant = sorted[0][0];
  const maxScore = Math.max(sorted[0][1], 1);
  const totalScore = sorted.reduce((sum, [, s]) => sum + s, 0);
  const confidence =
    totalScore > 0
      ? Math.min(maxScore / totalScore + 0.3, 1)
      : 0.3;

  const moodScore = Math.min(Math.round(maxScore * 1.1), 100);

  return { mood: dominant, score: moodScore, triggers, confidence };
}

function calculateTrend(
  recentScores: number[]
): "rising" | "stable" | "declining" {
  if (recentScores.length < 2) return "stable";
  const last3 = recentScores.slice(-3);
  if (last3.length < 2) return "stable";

  const avg =
    last3.reduce((a, b) => a + b, 0) / last3.length;
  const latest = last3[last3.length - 1];

  if (latest > avg * 1.1) return "rising";
  if (latest < avg * 0.9) return "declining";
  return "stable";
}

// ============================================================
// GET /api/agent-moods — Returns mood data for all agents
// GET /api/agent-moods?agentId=xxx — Returns mood for specific agent
// ============================================================

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId");

    // Fetch agents
    const agents = agentId
      ? await db.agent.findMany({ where: { id: agentId } })
      : await db.agent.findMany();

    if (agents.length === 0) {
      return NextResponse.json({ moods: [] });
    }

    // Fetch all meetings with messages for these agents
    const [teamMeetings, individualMeetings] = await Promise.all([
      db.teamMeeting.findMany({
        where: { status: { in: ["completed", "running"] } },
        include: { messages: true },
        orderBy: { createdAt: "desc" },
      }),
      db.individualMeeting.findMany({
        where: { status: { in: ["completed", "running"] } },
        include: { messages: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Normalize to a common shape
    const meetings = [
      ...teamMeetings.map((m) => ({ ...m, messages: m.messages.map((msg) => ({ ...msg, message: msg.message })) })),
      ...individualMeetings.map((m) => ({ ...m, messages: m.messages.map((msg) => ({ ...msg, message: msg.message })) })),
    ] as Array<{
      id: string;
      status: string;
      createdAt: Date;
      messages: Array<{ agentName: string; message: string; createdAt: Date }>;
    }>;

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 168 * 60 * 60 * 1000;

    const moods: AgentMood[] = agents.map((agent) => {
      // Get all messages by this agent
      const agentMessages = meetings.flatMap((m) =>
        (m.messages || []).filter((msg) => msg.agentName === agent.title)
      );

      // Get meetings participated
      const participatedMeetings = meetings.filter((m) =>
        (m.messages || []).some((msg) => msg.agentName === agent.title)
      );

      // Meeting frequency in last 7 days
      const recentMeetings = participatedMeetings.filter(
        (m) => new Date(m.createdAt).getTime() > sevenDaysAgo
      );

      // Average message length
      const avgMessageLength =
        agentMessages.length > 0
          ? Math.round(
              agentMessages.reduce((sum, msg) => sum + msg.message.length, 0) /
                agentMessages.length
            )
          : 0;

      // Participation rate: agent messages / total messages in meetings they participated
      const totalMessagesInParticipated = participatedMeetings.reduce(
        (sum, m) => sum + (m.messages?.length || 0),
        0
      );
      const participationRate =
        totalMessagesInParticipated > 0
          ? agentMessages.length / totalMessagesInParticipated
          : 0;

      // Hours since last message
      const sortedMessages = [...agentMessages].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const lastMessage = sortedMessages[0];
      const recentActivityHours = lastMessage
        ? (now - new Date(lastMessage.createdAt).getTime()) /
          (60 * 60 * 1000)
        : 9999;

      // Question ratio
      const questionCount = agentMessages.filter((msg) =>
        /\?/.test(msg.message)
      ).length;
      const questionRatio =
        agentMessages.length > 0 ? questionCount / agentMessages.length : 0;

      // Long message ratio (>500 chars)
      const longCount = agentMessages.filter(
        (msg) => msg.message.length > 500
      ).length;
      const longMessageRatio =
        agentMessages.length > 0 ? longCount / agentMessages.length : 0;

      // Unique topics (based on meeting count)
      const uniqueTopics = participatedMeetings.length;

      // Calculate mood
      const { mood, score, triggers, confidence } = calculateMoodFromData({
        meetingFrequency: recentMeetings.length,
        avgMessageLength,
        participationRate,
        recentActivityHours,
        questionRatio,
        longMessageRatio,
        uniqueTopics,
        meetingsCount: participatedMeetings.length,
      });

      // Calculate trend from last 3 meetings (by date)
      const last3Meetings = participatedMeetings
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime()
        )
        .slice(0, 3);

      const trendScores = last3Meetings.map((m) => {
        const msgs = (m.messages || []).filter(
          (msg) => msg.agentName === agent.title
        );
        return msgs.length;
      });
      const trend = calculateTrend(trendScores);

      const moodConfig = MOOD_CATEGORIES[mood];

      return {
        agentId: agent.id,
        agentName: agent.title,
        mood: moodConfig.label.toLowerCase(),
        moodScore: score,
        confidence: Math.round(confidence * 100) / 100,
        trend,
        triggers,
        moodEmoji: moodConfig.emoji,
        color: moodConfig.color,
        lastUpdated: new Date().toISOString(),
      } satisfies AgentMood;
    });

    return NextResponse.json({ moods });
  } catch (error) {
    console.error("Failed to compute agent moods:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to compute agent moods",
      },
      { status: 500 }
    );
  }
}
