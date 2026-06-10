import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { safeParseJsonArray } from "@/lib/parse-utils";

// GET /api/meetings/compare?ids=id1,id2,id3
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids");

    if (!idsParam || idsParam.split(",").length < 2) {
      return NextResponse.json(
        { error: "At least 2 meeting IDs are required (comma-separated)" },
        { status: 400 }
      );
    }

    const ids = idsParam.split(",").filter(Boolean);

    if (ids.length > 5) {
      return NextResponse.json(
        { error: "Maximum 5 meetings can be compared at once" },
        { status: 400 }
      );
    }

    // Fetch both team and individual meetings
    const [teamMeetings, individualMeetings] = await Promise.all([
      db.teamMeeting.findMany({
        where: { id: { in: ids } },
        include: {
          teamLead: true,
          teamMembers: true,
          messages: { orderBy: { createdAt: "asc" } },
        },
      }),
      db.individualMeeting.findMany({
        where: { id: { in: ids } },
        include: {
          teamMember: true,
          messages: { orderBy: { createdAt: "asc" } },
        },
      }),
    ]);

    // Normalize into unified format
    const meetings = [
      ...teamMeetings.map((m) => ({
        ...m,
        type: "team" as const,
        agendaQuestions: safeParseJsonArray(m.agendaQuestions),
        agendaRules: safeParseJsonArray(m.agendaRules),
      })),
      ...individualMeetings.map((m) => ({
        ...m,
        type: "individual" as const,
        agendaQuestions: safeParseJsonArray(m.agendaQuestions),
        agendaRules: safeParseJsonArray(m.agendaRules),
      })),
    ];

    // Validate we found all requested meetings
    const foundIds = new Set(meetings.map((m) => m.id));
    const missingIds = ids.filter((id) => !foundIds.has(id));
    if (missingIds.length > 0) {
      return NextResponse.json(
        { error: `Meetings not found: ${missingIds.join(", ")}` },
        { status: 404 }
      );
    }

    // Compute comparison data
    const comparison = computeComparison(meetings);

    return NextResponse.json({ meetings, comparison });
  } catch (error) {
    console.error("Failed to compare meetings:", error);
    return NextResponse.json(
      { error: "Failed to compare meetings" },
      { status: 500 }
    );
  }
}

// ============================================================
// Comparison Computation Functions
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
  "also", "while", "during", "using", "used", "use", "based", "key",
  "new", "like", "well", "way", "make", "much", "many", "get", "got",
  "however", "therefore", "thus", "hence", "including", "include",
]);

const POSITIVE_WORDS = new Set([
  "good", "great", "excellent", "best", "better", "strong", "effective",
  "success", "successful", "positive", "promising", "innovative", "novel",
  "efficient", "robust", "reliable", "optimal", "ideal", "significant",
  "important", "valuable", "beneficial", "advantageous", "improved",
  "enhanced", "superior", "notable", "remarkable", "impressive", "breakthrough",
  "achieve", "achieved", "achieves", "progress", "advance", "advances",
  "solution", "solutions", "potential", "potential", "insight", "insights",
  "recommend", "recommended", "propose", "proposed", "suggest", "suggested",
]);

const NEGATIVE_WORDS = new Set([
  "bad", "poor", "worst", "weak", "ineffective", "failure", "fail",
  "negative", "problem", "problems", "issue", "issues", "concern",
  "concerns", "risk", "risks", "challenge", "challenges", "difficult",
  "difficulty", "complex", "complicated", "unclear", "uncertain",
  "limited", "limitation", "gap", "gaps", "lack", "missing",
  "insufficient", "inadequate", "flaw", "flaws", "error", "errors",
  "drawback", "drawbacks", "obstacle", "obstacles", "hurdle", "hurdles",
  "warning", "caution", "careful", "pitfall", "pitfalls", "tradeoff",
]);

function extractKeywords(text: string): Map<string, number> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));

  const freq = new Map<string, number>();
  for (const word of words) {
    freq.set(word, (freq.get(word) || 0) + 1);
  }
  return freq;
}

function getSharedTopics(meetings: NormalizedMeeting[]): string[] {
  if (meetings.length < 2) return [];

  const allKeywords = meetings.map((m) => {
    const agendaFreq = extractKeywords(m.agenda || "");
    const questionsFreq = (m.agendaQuestions || [])
      .join(" ")
      .split(/\s+/)
      .reduce(
        (acc, word) => {
          const clean = word.toLowerCase().replace(/[^a-z0-9]/g, "");
          if (clean.length > 3 && !STOP_WORDS.has(clean)) {
            acc.set(clean, (acc.get(clean) || 0) + 1);
          }
          return acc;
        },
        new Map<string, number>()
      );
    // Merge frequencies
    for (const [word, count] of questionsFreq) {
      agendaFreq.set(word, (agendaFreq.get(word) || 0) + count);
    }
    return agendaFreq;
  });

  // Find keywords that appear in ALL meetings
  const firstMap = allKeywords[0];
  if (!firstMap) return [];

  const shared: string[] = [];
  for (const [word, count] of firstMap) {
    const appearsInAll = allKeywords.every((km) => km.has(word));
    if (appearsInAll) {
      shared.push(word);
    }
  }

  // Sort by frequency across all meetings
  shared.sort((a, b) => {
    const totalA = allKeywords.reduce((sum, km) => sum + (km.get(a) || 0), 0);
    const totalB = allKeywords.reduce((sum, km) => sum + (km.get(b) || 0), 0);
    return totalB - totalA;
  });

  return shared.slice(0, 20);
}

function getSharedAgents(meetings: NormalizedMeeting[]): string[] {
  const agentSets = meetings.map((m) => {
    const msgs = m.messages || [];
    return new Set(msgs.map((msg) => msg.agentName).filter((n) => n !== "User"));
  });

  if (agentSets.length < 2) return [];

  // Agents appearing in 2+ meetings
  const allAgents = new Set<string>();
  for (const s of agentSets) {
    for (const a of s) allAgents.add(a);
  }

  const shared: string[] = [];
  for (const agent of allAgents) {
    const count = agentSets.filter((s) => s.has(agent)).length;
    if (count >= 2) {
      shared.push(agent);
    }
  }

  return shared.sort();
}

function getLengthComparison(meetings: NormalizedMeeting[]) {
  return meetings.map((m) => {
    const msgs = m.messages || [];
    const messageCount = msgs.length;
    const wordCount = msgs.reduce(
      (sum, msg) => sum + msg.message.split(/\s+/).filter(Boolean).length,
      0
    );
    const created = new Date(m.createdAt).getTime();
    const updated = new Date(m.updatedAt).getTime();
    const durationMin = Math.max(1, Math.round((updated - created) / 60000));

    let duration = "";
    if (durationMin < 60) {
      duration = `${durationMin}m`;
    } else {
      duration = `${Math.floor(durationMin / 60)}h ${durationMin % 60}m`;
    }

    return {
      id: m.id,
      messageCount,
      wordCount,
      duration,
    };
  });
}

function getParticipationMatrix(meetings: NormalizedMeeting[]) {
  // Collect all unique agent names across all meetings
  const allAgents = new Set<string>();
  for (const m of meetings) {
    for (const msg of m.messages || []) {
      if (msg.agentName !== "User") {
        allAgents.add(msg.agentName);
      }
    }
  }

  const matrix: { agentName: string; [meetingId: string]: number }[] = [];

  for (const agentName of allAgents) {
    const row: { agentName: string; [meetingId: string]: number } = {
      agentName,
    };
    for (const m of meetings) {
      const count = (m.messages || []).filter(
        (msg) => msg.agentName === agentName
      ).length;
      row[m.id] = count;
    }
    matrix.push(row);
  }

  // Sort by total messages
  matrix.sort((a, b) => {
    const totalA = meetings.reduce(
      (sum, m) => sum + (a[m.id] || 0),
      0
    );
    const totalB = meetings.reduce(
      (sum, m) => sum + (b[m.id] || 0),
      0
    );
    return totalB - totalA;
  });

  return matrix;
}

function getSentimentOverview(meetings: NormalizedMeeting[]) {
  const result: { [meetingId: string]: "positive" | "neutral" | "negative" } = {};

  for (const m of meetings) {
    const allText = (m.messages || [])
      .map((msg) => msg.message)
      .join(" ")
      .toLowerCase();

    const words = allText.split(/\s+/);
    let posCount = 0;
    let negCount = 0;

    for (const word of words) {
      const clean = word.replace(/[^a-z]/g, "");
      if (POSITIVE_WORDS.has(clean)) posCount++;
      if (NEGATIVE_WORDS.has(clean)) negCount++;
    }

    if (posCount > negCount + 2) {
      result[m.id] = "positive";
    } else if (negCount > posCount + 2) {
      result[m.id] = "negative";
    } else {
      result[m.id] = "neutral";
    }
  }

  return result;
}

function getKeyDifferences(meetings: NormalizedMeeting[]): string[] {
  const diffs: string[] = [];

  if (meetings.length < 2) return diffs;

  // Compare types
  const types = [...new Set(meetings.map((m) => m.type))];
  if (types.length > 1) {
    diffs.push(
      `Meeting types differ: ${types.join(" vs ")}`
    );
  }

  // Compare statuses
  const statuses = [...new Set(meetings.map((m) => m.status))];
  if (statuses.length > 1) {
    diffs.push(
      `Meeting statuses differ: ${statuses.join(" vs ")}`
    );
  }

  // Compare participant counts
  const participantCounts = meetings.map((m) => {
    return new Set(
      (m.messages || []).map((msg) => msg.agentName).filter((n) => n !== "User")
    ).size;
  });
  if (Math.max(...participantCounts) - Math.min(...participantCounts) > 1) {
    diffs.push(
      `Participant count varies: ${participantCounts.join(" vs ")} agents`
    );
  }

  // Compare message volume
  const msgCounts = meetings.map((m) => (m.messages || []).length);
  if (Math.max(...msgCounts) - Math.min(...msgCounts) > 5) {
    const maxMeeting = meetings[msgCounts.indexOf(Math.max(...msgCounts))];
    const minMeeting = meetings[msgCounts.indexOf(Math.min(...msgCounts))];
    diffs.push(
      `Message volume difference: "${maxMeeting.saveName || "Unnamed"}" (${Math.max(...msgCounts)} msgs) vs "${minMeeting.saveName || "Unnamed"}" (${Math.min(...msgCounts)} msgs)`
    );
  }

  // Compare round counts
  const roundCounts = meetings.map((m) => {
    return m.numRounds || [...new Set((m.messages || []).map((msg) => msg.roundIndex))].length;
  });
  if (Math.max(...roundCounts) !== Math.min(...roundCounts)) {
    diffs.push(
      `Different number of discussion rounds: ${roundCounts.join(" vs ")}`
    );
  }

  // Compare average message length
  const avgLengths = meetings.map((m) => {
    const msgs = m.messages || [];
    if (msgs.length === 0) return 0;
    const totalWords = msgs.reduce(
      (sum, msg) => sum + msg.message.split(/\s+/).filter(Boolean).length,
      0
    );
    return Math.round(totalWords / msgs.length);
  });
  if (Math.max(...avgLengths) - Math.min(...avgLengths) > 30) {
    diffs.push(
      `Average message length varies: ${avgLengths.join(" vs ")} words`
    );
  }

  // Compare topic focus
  const keywords = meetings.map((m) => extractKeywords(m.agenda || ""));
  const uniqueTopicsPerMeeting = meetings.map((m, i) => {
    const otherKeywords = keywords.filter((_, j) => j !== i);
    const uniqueToThis: string[] = [];
    for (const [word] of keywords[i]) {
      const foundInOthers = otherKeywords.some((ok) => ok.has(word));
      if (!foundInOthers) uniqueToThis.push(word);
    }
    return uniqueToThis;
  });

  for (let i = 0; i < meetings.length; i++) {
    const name = meetings[i].saveName || `Meeting ${i + 1}`;
    const unique = uniqueTopicsPerMeeting[i]
      .sort((a, b) => keywords[i].get(b)! - keywords[i].get(a)!)
      .slice(0, 3);
    if (unique.length > 0) {
      diffs.push(
        `Unique topics in "${name}": ${unique.join(", ")}`
      );
    }
  }

  return diffs;
}

function getRecommendations(meetings: NormalizedMeeting[]): string[] {
  const recs: string[] = [];

  if (meetings.length < 2) return recs;

  // Check if agents are shared
  const shared = getSharedAgents(meetings);
  if (shared.length === 0) {
    recs.push(
      "No shared participants detected. Consider involving common agents to build continuity across meetings."
    );
  } else {
    recs.push(
      `${shared.length} shared participant(s) found: ${shared.join(", ")}. Leverage their cross-meeting perspective for deeper insights.`
    );
  }

  // Check if there are very short meetings
  const shortMeetings = meetings.filter((m) => (m.messages || []).length < 5);
  if (shortMeetings.length > 0) {
    recs.push(
      `${shortMeetings.length} meeting(s) have fewer than 5 messages. Consider running additional rounds for richer discussion.`
    );
  }

  // Check topic overlap
  const sharedTopics = getSharedTopics(meetings);
  if (sharedTopics.length > 3) {
    recs.push(
      `High topic overlap detected (${sharedTopics.length} shared keywords). These meetings may benefit from a unified agenda.`
    );
  } else if (sharedTopics.length === 0 && meetings.length >= 2) {
    recs.push(
      "No shared topics detected between meetings. Consider aligning agendas for comparative analysis."
    );
  }

  // Check for meetings without summaries
  const noSummary = meetings.filter((m) => !m.summary);
  if (noSummary.length > 0) {
    recs.push(
      `${noSummary.length} meeting(s) lack summaries. Generating summaries enables better comparison and archival.`
    );
  }

  // Suggest combining complementary meetings
  const types = [...new Set(meetings.map((m) => m.type))];
  if (types.includes("team") && types.includes("individual")) {
    recs.push(
      "Mix of team and individual meetings detected. Consider how individual deep-dives complement team discussions."
    );
  }

  // Check for sentiment balance
  const sentiments = Object.values(getSentimentOverview(meetings));
  const sentimentTypes = [...new Set(sentiments)];
  if (sentimentTypes.length > 1) {
    recs.push(
      "Sentiment varies across meetings. Review negative-toned discussions for actionable improvements."
    );
  }

  return recs;
}

// ============================================================
// Main Comparison Function
// ============================================================

type NormalizedMeeting = {
  id: string;
  type: "team" | "individual";
  agenda: string;
  agendaQuestions: string[];
  agendaRules: string[];
  status: "draft" | "running" | "completed";
  summary: string | null;
  saveName: string;
  createdAt: string;
  updatedAt: string;
  numRounds?: number;
  temperature: number;
  messages: { id: string; agentName: string; message: string; roundIndex: number; createdAt: string }[];
};

function computeComparison(meetings: NormalizedMeeting[]) {
  const sharedAgents = getSharedAgents(meetings);
  const sharedTopics = getSharedTopics(meetings);
  const lengthComparison = getLengthComparison(meetings);
  const participationMatrix = getParticipationMatrix(meetings);
  const sentimentOverview = getSentimentOverview(meetings);
  const keyDifferences = getKeyDifferences(meetings);
  const recommendations = getRecommendations(meetings);

  return {
    sharedAgents,
    sharedTopics,
    lengthComparison,
    participationMatrix,
    sentimentOverview,
    keyDifferences,
    recommendations,
  };
}
