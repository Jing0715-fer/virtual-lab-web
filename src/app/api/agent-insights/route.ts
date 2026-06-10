import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { hermesChatCompletion } from "@/lib/hermes";

// ============================================================
// Types
// ============================================================

interface AgentInsight {
  category: string;
  title: string;
  description: string;
  icon: string;
  confidence: number;
}

interface AgentInsightsResponse {
  agentId: string;
  agentName: string;
  insights: AgentInsight[];
  generatedAt: string;
  source: "ai" | "rule-based";
}

// ============================================================
// Rule-based insights generation (fallback)
// ============================================================

function generateRuleBasedInsights(data: {
  agentName: string;
  expertise: string;
  goal: string;
  role: string;
  totalMessages: number;
  avgMessageLength: number;
  meetingsJoined: number;
  uniqueWords: number;
  questionCount: number;
  collaborationCount: number;
  longestMessage: number;
  roundsActive: number;
}): AgentInsight[] {
  const insights: AgentInsight[] = [];

  // Communication style analysis
  if (data.avgMessageLength > 300) {
    insights.push({
      category: "communication",
      title: "Detailed Communicator",
      description: `${data.agentName} tends to write comprehensive, detailed responses (avg ${data.avgMessageLength} chars). This suggests a thorough approach to analysis and explanation.`,
      icon: "message-square",
      confidence: 0.85,
    });
  } else if (data.avgMessageLength > 150) {
    insights.push({
      category: "communication",
      title: "Balanced Communicator",
      description: `${data.agentName} maintains a balanced communication style with moderate-length responses (${data.avgMessageLength} chars avg), providing enough detail without being verbose.`,
      icon: "message-square",
      confidence: 0.8,
    });
  } else if (data.totalMessages > 0) {
    insights.push({
      category: "communication",
      title: "Concise Communicator",
      description: `${data.agentName} prefers brief, focused responses (${data.avgMessageLength} chars avg). This can be efficient but may sometimes lack necessary detail.`,
      icon: "message-square",
      confidence: 0.75,
    });
  }

  // Key contributions
  if (data.longestMessage > 1000) {
    insights.push({
      category: "contributions",
      title: "In-Depth Analyst",
      description: `Has produced very detailed analyses (longest: ${data.longestMessage} chars), contributing significant depth to discussions.`,
      icon: "lightbulb",
      confidence: 0.9,
    });
  }

  if (data.roundsActive > 5) {
    insights.push({
      category: "contributions",
      title: "Consistent Contributor",
      description: `Active across ${data.roundsActive} discussion rounds, demonstrating sustained engagement and reliability.`,
      icon: "check-circle",
      confidence: 0.85,
    });
  }

  // Collaboration patterns
  if (data.collaborationCount > 3) {
    insights.push({
      category: "collaboration",
      title: "Strong Collaborator",
      description: `Has collaborated with ${data.collaborationCount}+ other agents across meetings, showing effective teamwork abilities.`,
      icon: "users",
      confidence: 0.85,
    });
  }

  if (data.questionCount > data.totalMessages * 0.2) {
    insights.push({
      category: "collaboration",
      title: "Inquisitive Partner",
      description: `Frequently asks questions (${Math.round((data.questionCount / Math.max(data.totalMessages, 1)) * 100)}% of messages), fostering deeper discussions.`,
      icon: "help-circle",
      confidence: 0.8,
    });
  }

  // Suggested improvements
  if (data.meetingsJoined < 3) {
    insights.push({
      category: "improvements",
      title: "Increase Participation",
      description: `Has only joined ${data.meetingsJoined} meetings. More participation could enhance team dynamics and knowledge sharing.`,
      icon: "trending-up",
      confidence: 0.7,
    });
  }

  if (data.avgMessageLength < 80 && data.totalMessages > 5) {
    insights.push({
      category: "improvements",
      title: "Elaborate More",
      description: "Responses tend to be very brief. Adding more context and reasoning could improve the quality of contributions.",
      icon: "edit",
      confidence: 0.65,
    });
  }

  if (data.questionCount < data.totalMessages * 0.05 && data.totalMessages > 10) {
    insights.push({
      category: "improvements",
      title: "Ask More Questions",
      description: "Low question rate suggests a more directive style. Asking more questions could improve collaborative exploration.",
      icon: "help-circle",
      confidence: 0.6,
    });
  }

  // Expertise validation
  const expertiseKeywords = data.expertise.toLowerCase().split(/[\s,;.]+/);
  const relevantMessages = data.totalMessages;
  if (expertiseKeywords.length > 3 && relevantMessages > 0) {
    insights.push({
      category: "expertise",
      title: "Domain Expert",
      description: `Specializes in "${data.expertise.split(",")[0].trim()}". Contributions align well with stated expertise across ${data.meetingsJoined} meetings.`,
      icon: "award",
      confidence: 0.75,
    });
  }

  if (data.uniqueWords > 200) {
    insights.push({
      category: "expertise",
      title: "Rich Vocabulary",
      description: `Uses a diverse vocabulary (${data.uniqueWords} unique terms), indicating broad knowledge and varied expertise.`,
      icon: "book",
      confidence: 0.8,
    });
  }

  // Ensure at least 3 insights
  if (insights.length < 3) {
    insights.push({
      category: "general",
      title: "Active Team Member",
      description: `${data.agentName} has sent ${data.totalMessages} messages across ${data.meetingsJoined} meetings, contributing to team discussions.`,
      icon: "activity",
      confidence: 0.5,
    });
  }

  return insights.slice(0, 8);
}

// ============================================================
// AI-powered insights generation using Hermes API
// ============================================================

async function generateAIInsights(data: {
  agentName: string;
  expertise: string;
  goal: string;
  role: string;
  totalMessages: number;
  avgMessageLength: number;
  meetingsJoined: number;
  uniqueWords: number;
  questionCount: number;
  collaborationCount: number;
  longestMessage: number;
  recentMessages: string[];
  collaborators: string[];
}): Promise<AgentInsight[]> {
  const prompt = `You are an AI assistant analyzing agent behavior in a research collaboration platform. Based on the following agent data, generate 5-8 concise insights about this agent's behavior, communication style, and collaboration patterns.

Agent Name: ${data.agentName}
Expertise: ${data.expertise}
Goal: ${data.goal}
Role: ${data.role}

Activity Data:
- Total Messages: ${data.totalMessages}
- Average Message Length: ${data.avgMessageLength} chars
- Meetings Joined: ${data.meetingsJoined}
- Unique Words Used: ${data.uniqueWords}
- Questions Asked: ${data.questionCount}
- Collaborators: ${data.collaborators.join(", ") || "None"}
- Longest Message: ${data.longestMessage} chars

Recent Messages (last 5):
${data.recentMessages.slice(0, 5).map((m, i) => `${i + 1}. ${m.slice(0, 200)}`).join("\n")}

Respond ONLY with a JSON array of insight objects. Each insight must have:
- "category": one of "communication", "contributions", "collaboration", "improvements", "expertise"
- "title": a short, descriptive title (max 5 words)
- "description": a 1-2 sentence analysis (max 150 chars)
- "icon": one of "message-square", "lightbulb", "users", "trending-up", "edit", "help-circle", "check-circle", "award", "book", "activity"
- "confidence": a number between 0.5 and 1.0

Example:
[
  {"category": "communication", "title": "Detailed Analyst", "description": "Writes comprehensive responses averaging 350+ chars.", "icon": "message-square", "confidence": 0.85}
]

Generate the JSON array now:`;

    try {
      const completion = await hermesChatCompletion({
        messages: [{ role: "user" as const, content: prompt }],
        temperature: 0.6,
        max_tokens: 1500,
        thinking: { type: "disabled" },
      });

    const content =
      completion.choices[0]?.message?.content || "";

    // Extract JSON from response
    const jsonMatch =
      content.match(/\[[\s\S]*\]/) || content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        parsed = [];
      }
      const insights: AgentInsight[] = Array.isArray(parsed) ? parsed : [parsed];

      // Validate and sanitize insights
      return insights
        .filter(
          (i) =>
            i.category &&
            i.title &&
            i.description &&
            i.icon &&
            typeof i.confidence === "number"
        )
        .map((i) => ({
          category: String(i.category),
          title: String(i.title).slice(0, 50),
          description: String(i.description).slice(0, 200),
          icon: String(i.icon),
          confidence: Math.min(
            Math.max(Number(i.confidence) || 0.5, 0.5),
            1.0
          ),
        }))
        .slice(0, 8);
    }
  } catch (error) {
    console.error("AI insight generation failed:", error);
  }

  return [];
}

// ============================================================
// GET /api/agent-insights?agentId=xxx
// ============================================================

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId");

    if (!agentId) {
      return NextResponse.json(
        { error: "agentId query parameter is required" },
        { status: 400 }
      );
    }

    // Fetch agent
    const agent = await db.agent.findUnique({ where: { id: agentId } });
    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    // Fetch all meetings with messages
    const meetings = await db.meeting.findMany({
      where: { status: { in: ["completed", "running"] } },
      include: { messages: true },
      orderBy: { createdAt: "desc" },
    });

    // Gather agent messages
    const agentMessages = meetings.flatMap((m) =>
      (m.messages || []).filter((msg) => msg.agentName === agent.title)
    );

    const participatedMeetings = meetings.filter((m) =>
      (m.messages || []).some((msg) => msg.agentName === agent.title)
    );

    // Compute statistics
    const totalMessages = agentMessages.length;
    const avgMessageLength =
      totalMessages > 0
        ? Math.round(
            agentMessages.reduce((sum, msg) => sum + msg.message.length, 0) /
              totalMessages
          )
        : 0;

    const uniqueWords = new Set(
      agentMessages.flatMap((m) =>
        m.message.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2)
      )
    ).size;

    const questionCount = agentMessages.filter((msg) =>
      /\?/.test(msg.message)
    ).length;

    // Collaborators: other agent names seen in same meetings
    const collaboratorNames = new Set<string>();
    participatedMeetings.forEach((m) => {
      (m.messages || []).forEach((msg) => {
        if (msg.agentName !== agent.title) {
          collaboratorNames.add(msg.agentName);
        }
      });
    });

    const longestMessage = agentMessages.reduce(
      (max, msg) => Math.max(max, msg.message.length),
      0
    );

    // Recent messages for AI context
    const recentMessages = agentMessages
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .map((m) => m.message);

    // Count rounds active (unique roundIndex values across all meetings)
    const roundsActive = new Set(
      agentMessages.map((m) => `${m.teamMeetingId || m.individualMeetingId}-${m.roundIndex}`)
    ).size;

    const data = {
      agentName: agent.title,
      expertise: agent.expertise,
      goal: agent.goal,
      role: agent.role,
      totalMessages,
      avgMessageLength,
      meetingsJoined: participatedMeetings.length,
      uniqueWords,
      questionCount,
      collaborationCount: collaboratorNames.size,
      longestMessage,
      recentMessages,
      collaborators: Array.from(collaboratorNames),
    };

    // Try AI-powered insights first
    let insights = await generateAIInsights(data);

    // Fallback to rule-based if AI returned nothing
    let source: "ai" | "rule-based" = "ai";
    if (insights.length < 3) {
      insights = generateRuleBasedInsights({
        ...data,
        roundsActive,
      });
      source = "rule-based";
    }

    return NextResponse.json({
      agentId: agent.id,
      agentName: agent.title,
      insights,
      generatedAt: new Date().toISOString(),
      source,
    } satisfies AgentInsightsResponse);
  } catch (error) {
    console.error("Failed to generate agent insights:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate agent insights",
      },
      { status: 500 }
    );
  }
}
