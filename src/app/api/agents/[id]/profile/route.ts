import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const PROFILES_DIR = path.join(process.cwd(), "data", "profiles");

// ============================================================
// Types
// ============================================================

interface AgentProfile {
  agentId: string;
  agentName: string;
  // Computed persona fields
  personalityRadar: {
    analytical: number;
    creative: number;
    critical: number;
    collaborative: number;
    detailOriented: number;
  };
  collaborationScore: number;
  collaborationScoreBreakdown: {
    participationRate: number;
    contributionQuality: number;
    responseTimeScore: number;
    consistencyScore: number;
  };
  strengths: string[];
  weaknesses: string[];
  researchDomains: string[];
  responseStyle: {
    avgResponseLength: number;
    avgResponseLengthCategory: string;
    mostUsedWords: { word: string; count: number }[];
    roundParticipation: number;
    preferredTimeOfDay: string;
  };
  collaborationStats: {
    meetingsJoined: number;
    messagesSent: number;
    sharedMeetingsWith: { agentId: string; agentName: string; count: number }[];
    totalCollaborators: number;
  };
  collaborationHistory: {
    meetingId: string;
    meetingName: string;
    meetingType: "team" | "individual";
    status: string;
    messageCount: number;
    participatedAt: string;
    collaborators: string[];
  }[];
  // Custom profile fields (user-editable)
  customNotes: string;
  collaborationPreferences: string[];
}

// ============================================================
// Helpers
// ============================================================

function deriveResearchDomains(expertise: string, goal: string): string[] {
  const combined = `${expertise} ${goal}`.toLowerCase();
  const domainMap: Record<string, string[]> = {
    "protein": ["Protein Engineering", "Structural Biology"],
    "computational": ["Computational Biology", "Bioinformatics"],
    "machine learning": ["Machine Learning", "AI/ML"],
    "deep learning": ["Deep Learning", "Neural Networks"],
    "immuno": ["Immunology", "Immune Engineering"],
    "antibody": ["Antibody Design", "Immunotherapy"],
    "nanobody": ["Nanobody Engineering", "Protein Design"],
    "sequence": ["Sequence Analysis", "Genomics"],
    "genomic": ["Genomics", "Sequence Analysis"],
    "model": ["Computational Modeling", "Simulation"],
    "design": ["Protein Design", "Structural Biology"],
    "analysis": ["Data Analysis", "Bioinformatics"],
    "evaluate": ["Evaluation", "Quality Assessment"],
    "predict": ["Prediction", "Computational Biology"],
    "optimize": ["Optimization", "Process Engineering"],
    "synthesis": ["Chemical Synthesis", "Drug Discovery"],
    "drug": ["Drug Discovery", "Pharmacology"],
    "crystallography": ["Structural Biology", "Crystallography"],
    "biochemistry": ["Biochemistry", "Molecular Biology"],
    "cell": ["Cell Biology", "Molecular Biology"],
    "molecular": ["Molecular Biology", "Biochemistry"],
    "express": ["Gene Expression", "Molecular Biology"],
    "regulation": ["Gene Regulation", "Systems Biology"],
    "chemistry": ["Chemistry", "Molecular Design"],
    "physics": ["Biophysics", "Computational Physics"],
    "engineering": ["Bioengineering", "Process Design"],
    "data": ["Data Science", "Bioinformatics"],
    "algorithm": ["Algorithms", "Computational Methods"],
    "software": ["Software Engineering", "Bioinformatics"],
    "statistics": ["Statistics", "Data Analysis"],
  };

  const domains = new Set<string>();
  for (const [keyword, tags] of Object.entries(domainMap)) {
    if (combined.includes(keyword)) {
      tags.forEach((t) => domains.add(t));
    }
  }

  if (domains.size === 0) {
    domains.add("Research");
    domains.add("Analysis");
  }

  return Array.from(domains).slice(0, 6);
}

function deriveStrengthsAndWeaknesses(
  expertise: string,
  goal: string,
  role: string
): { strengths: string[]; weaknesses: string[] } {
  const combined = `${expertise} ${goal} ${role}`.toLowerCase();
  const allStrengths: { keywords: string[]; strength: string }[] = [
    { keywords: ["protein", "structure"], strength: "Deep expertise in protein structure analysis" },
    { keywords: ["machine learning", "ml", "deep learning"], strength: "Proficient in ML/AI techniques" },
    { keywords: ["computational", "model", "simulate"], strength: "Strong computational modeling skills" },
    { keywords: ["immune", "immuno"], strength: "Immunology domain knowledge" },
    { keywords: ["sequence", "genomic"], strength: "Sequence analysis proficiency" },
    { keywords: ["design", "engineer"], strength: "Design-oriented problem solving" },
    { keywords: ["evaluate", "critic", "review"], strength: "Critical analysis capabilities" },
    { keywords: ["collaborate", "team", "lead"], strength: "Effective team collaboration" },
    { keywords: ["optim", "improve"], strength: "Optimization expertise" },
    { keywords: ["data", "analysis", "analytical"], strength: "Strong analytical mindset" },
    { keywords: ["novel", "innovat", "creat"], strength: "Creative thinking ability" },
    { keywords: ["predict", "forecast"], strength: "Predictive modeling skills" },
    { keywords: ["bioinformatic", "pipeline"], strength: "Bioinformatics pipeline experience" },
    { keywords: ["communicate", "write", "report"], strength: "Clear scientific communication" },
    { keywords: ["strategy", "plan", "roadmap"], strength: "Strategic planning capabilities" },
  ];

  const allWeaknesses: { keywords: string[]; weakness: string }[] = [
    { keywords: ["protein", "structure"], weakness: "May overlook non-structural factors" },
    { keywords: ["machine learning", "ml"], weakness: "Over-reliance on model predictions" },
    { keywords: ["computational", "model"], weakness: "Less hands-on experimental experience" },
    { keywords: ["immune", "immuno"], weakness: "Narrow focus on immune-specific aspects" },
    { keywords: ["sequence", "genomic"], weakness: "Limited structural perspective" },
    { keywords: ["design", "engineer"], weakness: "May underestimate practical constraints" },
    { keywords: ["evaluate", "critic", "review"], weakness: "Tendency to be overly critical" },
    { keywords: ["collaborate", "team", "lead"], weakness: "Decision-making may be slow" },
    { keywords: ["optim", "improve"], weakness: "Local optimization over global view" },
    { keywords: ["data", "analysis"], weakness: "May miss big-picture insights" },
  ];

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  for (const item of allStrengths) {
    if (item.keywords.some((k) => combined.includes(k))) {
      strengths.push(item.strength);
    }
  }
  for (const item of allWeaknesses) {
    if (item.keywords.some((k) => combined.includes(k))) {
      weaknesses.push(item.weakness);
    }
  }

  // Ensure at least 2 each
  if (strengths.length < 2) {
    strengths.push("Reliable contributor");
    if (strengths.length < 2) strengths.push("Evidence-based reasoning");
  }
  if (weaknesses.length < 2) {
    weaknesses.push("Limited cross-domain perspective");
    if (weaknesses.length < 2) weaknesses.push("May need more diverse input");
  }

  return {
    strengths: strengths.slice(0, 5),
    weaknesses: weaknesses.slice(0, 3),
  };
}

function computePersonalityRadar(
  messages: { message: string; roundIndex: number; createdAt: string }[],
  totalMessages: number,
  meetingsJoined: number,
  isTeamLead: boolean
): AgentProfile["personalityRadar"] {
  if (totalMessages === 0) {
    return {
      analytical: 30,
      creative: 30,
      critical: 30,
      collaborative: 30,
      detailOriented: 30,
    };
  }

  // Analytical: technical terms, data references
  const analyticalTerms = ["analysis", "data", "method", "result", "hypothesis", "experiment", "evidence", "correlation", "statistic", "quantitative", "measure", "compare", "benchmark"];
  const analyticalCount = messages.filter((m) =>
    analyticalTerms.some((t) => m.message.toLowerCase().includes(t))
  ).length;
  const analytical = Math.min(20 + (analyticalCount / totalMessages) * 120, 95);

  // Creative: novel idea terms, exploratory language
  const creativeTerms = ["novel", "innovative", "alternative", "explore", "creative", "new approach", "breakthrough", "unique", "original", "imagine", "brainstorm", "what if", "perhaps", "interesting"];
  const creativeCount = messages.filter((m) =>
    creativeTerms.some((t) => m.message.toLowerCase().includes(t))
  ).length;
  const creative = Math.min(15 + (creativeCount / totalMessages) * 140, 95);

  // Critical: questioning, challenge, evaluate
  const criticalTerms = ["however", "concern", "risk", "limitation", "challenge", "problem", "issue", "weakness", "flaw", "critique", "question", "caution", "consider", "careful", "potential problem"];
  const criticalCount = messages.filter((m) =>
    criticalTerms.some((t) => m.message.toLowerCase().includes(t))
  ).length;
  const critical = Math.min(15 + (criticalCount / totalMessages) * 130, 95);

  // Collaborative: referencing others, agreement, team language
  const collabTerms = ["agree", "build on", "as mentioned", "great point", "team", "together", "collaborate", "shared", "combined", "synergy", "integrate", "complement", "support"];
  const collabCount = messages.filter((m) =>
    collabTerms.some((t) => m.message.toLowerCase().includes(t))
  ).length;
  const collaborative = Math.min(
    10 + (collabCount / totalMessages) * 120 + meetingsJoined * 3,
    95
  );

  // Detail-oriented: specifics, numbers, precise language
  const detailTerms = ["specifically", "exactly", "precise", "detail", "particular", "define", "parameter", "threshold", "value", "number", "percent", "ratio", "concentration", "sequence", "residue", "position"];
  const detailCount = messages.filter((m) =>
    detailTerms.some((t) => m.message.toLowerCase().includes(t))
  ).length;
  const detailOriented = Math.min(15 + (detailCount / totalMessages) * 130, 95);

  return {
    analytical: Math.round(analytical),
    creative: Math.round(creative),
    critical: Math.round(critical),
    collaborative: Math.round(collaborative),
    detailOriented: Math.round(detailOriented),
  };
}

function computeCollaborationScore(
  totalPossibleMeetings: number,
  meetingsJoined: number,
  totalMessages: number,
  avgMessagesPerMeeting: number,
  meetingsAsLead: number
): { collaborationScore: number; collaborationScoreBreakdown: AgentProfile["collaborationScoreBreakdown"] } {
  if (totalPossibleMeetings === 0) {
    return {
      collaborationScore: 0,
      collaborationScoreBreakdown: {
        participationRate: 0,
        contributionQuality: 0,
        responseTimeScore: 70,
        consistencyScore: 0,
      },
    };
  }

  const participationRate = Math.min(
    (meetingsJoined / totalPossibleMeetings) * 100,
    100
  );

  // Contribution quality: based on message volume and meeting leadership
  const contributionQuality = Math.min(
    30 + (totalMessages / Math.max(totalPossibleMeetings, 1)) * 5 + meetingsAsLead * 10,
    100
  );

  // Response time score: based on round participation consistency
  const responseTimeScore = Math.min(50 + participationRate * 0.4 + meetingsAsLead * 3, 100);

  // Consistency: how consistently the agent contributes across meetings
  const consistencyScore = meetingsJoined > 0
    ? Math.min(
        40 + (avgMessagesPerMeeting / Math.max(totalMessages / Math.max(meetingsJoined, 1), 1)) * 60,
        100
      )
    : 0;

  const collaborationScore = Math.round(
    participationRate * 0.3 +
    contributionQuality * 0.25 +
    responseTimeScore * 0.2 +
    consistencyScore * 0.25
  );

  return {
    collaborationScore: Math.min(collaborationScore, 100),
    collaborationScoreBreakdown: {
      participationRate: Math.round(participationRate),
      contributionQuality: Math.round(Math.min(contributionQuality, 100)),
      responseTimeScore: Math.round(Math.min(responseTimeScore, 100)),
      consistencyScore: Math.round(Math.min(consistencyScore, 100)),
    },
  };
}

function computeResponseStyle(
  messages: { message: string; createdAt: string; roundIndex: number }[]
): AgentProfile["responseStyle"] {
  if (messages.length === 0) {
    return {
      avgResponseLength: 0,
      avgResponseLengthCategory: "No data",
      mostUsedWords: [],
      roundParticipation: 0,
      preferredTimeOfDay: "N/A",
    };
  }

  const lengths = messages.map((m) => m.message.length);
  const avgLength = Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);

  let avgResponseLengthCategory: string;
  if (avgLength < 100) avgResponseLengthCategory = "Concise";
  else if (avgLength < 300) avgResponseLengthCategory = "Balanced";
  else if (avgLength < 600) avgResponseLengthCategory = "Detailed";
  else avgResponseLengthCategory = "Comprehensive";

  // Word frequency
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "need", "dare", "ought",
    "used", "to", "of", "in", "for", "on", "with", "at", "by", "from",
    "as", "into", "through", "during", "before", "after", "above", "below",
    "between", "out", "off", "over", "under", "again", "further", "then",
    "once", "here", "there", "when", "where", "why", "how", "all", "each",
    "every", "both", "few", "more", "most", "other", "some", "such", "no",
    "not", "only", "own", "same", "so", "than", "too", "very", "just",
    "because", "but", "and", "or", "if", "while", "this", "that", "these",
    "those", "it", "its", "i", "me", "my", "we", "our", "you", "your",
    "he", "she", "they", "them", "their", "what", "which", "who",
  ]);

  const wordCount: Record<string, number> = {};
  messages.forEach((m) => {
    m.message
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3 && !stopWords.has(w))
      .forEach((w) => {
        wordCount[w] = (wordCount[w] || 0) + 1;
      });
  });

  const mostUsedWords = Object.entries(wordCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15)
    .map(([word, count]) => ({ word, count }));

  // Round participation
  const uniqueRounds = new Set(messages.map((m) => m.roundIndex));
  const maxRound = Math.max(...messages.map((m) => m.roundIndex), 0) + 1;
  const roundParticipation = maxRound > 0
    ? Math.round((uniqueRounds.size / maxRound) * 100)
    : 0;

  // Preferred time of day
  const hours = messages.map((m) => new Date(m.createdAt).getHours());
  const avgHour = hours.reduce((a, b) => a + b, 0) / hours.length;
  let preferredTimeOfDay: string;
  if (avgHour < 6) preferredTimeOfDay = "Late Night";
  else if (avgHour < 12) preferredTimeOfDay = "Morning";
  else if (avgHour < 17) preferredTimeOfDay = "Afternoon";
  else if (avgHour < 21) preferredTimeOfDay = "Evening";
  else preferredTimeOfDay = "Night";

  return {
    avgResponseLength: avgLength,
    avgResponseLengthCategory,
    mostUsedWords,
    roundParticipation,
    preferredTimeOfDay,
  };
}

// ============================================================
// GET /api/agents/[id]/profile
// ============================================================

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch agent with all related meetings
    const agent = await db.agent.findUnique({
      where: { id },
      include: {
        teamLeadMeetings: {
          include: {
            messages: true,
            teamLead: true,
            teamMembers: true,
          },
          orderBy: { createdAt: "desc" },
        },
        teamMemberMeetings: {
          include: {
            messages: true,
            teamLead: true,
            teamMembers: true,
          },
          orderBy: { createdAt: "desc" },
        },
        individualMeetings: {
          include: {
            messages: true,
            teamMember: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Collect all unique meetings the agent participated in
    const allMeetingSet = new Map<string, {
      id: string;
      saveName: string;
      type: "team" | "individual";
      status: string;
      messages: { message: string; roundIndex: number; createdAt: string; agentName: string }[];
      createdAt: string;
      collaborators: string[];
    }>();

    // Team meetings as lead
    for (const m of agent.teamLeadMeetings) {
      if (!allMeetingSet.has(m.id)) {
        allMeetingSet.set(m.id, {
          id: m.id,
          saveName: m.saveName,
          type: "team",
          status: m.status,
          messages: m.messages.map((msg) => ({
            message: msg.message,
            roundIndex: msg.roundIndex,
            createdAt: msg.createdAt.toISOString(),
            agentName: msg.agentName,
          })),
          createdAt: m.createdAt.toISOString(),
          collaborators: m.teamMembers.map((a) => a.title),
        });
      }
    }

    // Team meetings as member
    for (const m of agent.teamMemberMeetings) {
      if (!allMeetingSet.has(m.id)) {
        allMeetingSet.set(m.id, {
          id: m.id,
          saveName: m.saveName,
          type: "team",
          status: m.status,
          messages: m.messages.map((msg) => ({
            message: msg.message,
            roundIndex: msg.roundIndex,
            createdAt: msg.createdAt.toISOString(),
            agentName: msg.agentName,
          })),
          createdAt: m.createdAt.toISOString(),
          collaborators: [
            m.teamLead?.title || "Unknown",
            ...m.teamMembers
              .filter((a) => a.id !== agent.id)
              .map((a) => a.title),
          ],
        });
      }
    }

    // Individual meetings
    for (const m of agent.individualMeetings) {
      if (!allMeetingSet.has(m.id)) {
        allMeetingSet.set(m.id, {
          id: m.id,
          saveName: m.saveName,
          type: "individual",
          status: m.status,
          messages: m.messages.map((msg) => ({
            message: msg.message,
            roundIndex: msg.roundIndex,
            createdAt: msg.createdAt.toISOString(),
            agentName: msg.agentName,
          })),
          createdAt: m.createdAt.toISOString(),
          collaborators: ["User"],
        });
      }
    }

    const allMeetings = Array.from(allMeetingSet.values());

    // Get agent's own messages
    const agentMessages = allMeetings.flatMap((m) =>
      m.messages
        .filter((msg) => msg.agentName === agent.title)
        .map((msg) => ({
          message: msg.message,
          roundIndex: msg.roundIndex,
          createdAt: msg.createdAt,
        }))
    );

    const totalMessages = agentMessages.length;
    const meetingsJoined = allMeetings.length;
    const meetingsAsLead = agent.teamLeadMeetings.length;
    const avgMessagesPerMeeting =
      meetingsJoined > 0 ? totalMessages / meetingsJoined : 0;

    // Count total meetings in system for participation rate
    const totalSystemTeamMeetings = await db.teamMeeting.count();
    const totalSystemIndividualMeetings = await db.individualMeeting.count();
    const totalPossibleMeetings = totalSystemTeamMeetings + totalSystemIndividualMeetings;

    // Compute derived data
    const { strengths, weaknesses } = deriveStrengthsAndWeaknesses(
      agent.expertise,
      agent.goal,
      agent.role
    );
    const researchDomains = deriveResearchDomains(agent.expertise, agent.goal);
    const personalityRadar = computePersonalityRadar(
      agentMessages,
      totalMessages,
      meetingsJoined,
      meetingsAsLead > 0
    );
    const collabScore = computeCollaborationScore(
      totalPossibleMeetings,
      meetingsJoined,
      totalMessages,
      avgMessagesPerMeeting,
      meetingsAsLead
    );
    const responseStyle = computeResponseStyle(agentMessages);

    // Shared meetings with other agents
    const sharedMeetingsMap = new Map<string, { agentId: string; agentName: string; count: number }>();
    for (const meeting of allMeetings) {
      for (const collaborator of meeting.collaborators) {
        if (collaborator === agent.title || collaborator === "User" || collaborator === "Unknown")
          continue;
        const key = collaborator;
        const existing = sharedMeetingsMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          sharedMeetingsMap.set(key, {
            agentId: collaborator.toLowerCase().replace(/\s+/g, "-"),
            agentName: collaborator,
            count: 1,
          });
        }
      }
    }

    // Collaboration history
    const collaborationHistory = allMeetings
      .slice(0, 20)
      .map((m) => ({
        meetingId: m.id,
        meetingName: m.saveName,
        meetingType: m.type,
        status: m.status,
        messageCount: m.messages.filter(
          (msg) => msg.agentName === agent.title
        ).length,
        participatedAt: m.createdAt,
        collaborators: m.collaborators,
      }));

    // Load custom profile from file if exists
    let customNotes = "";
    let collaborationPreferences: string[] = [];

    try {
      const filePath = path.join(PROFILES_DIR, `${id}.json`);
      const raw = await fs.readFile(filePath, "utf-8");
      const customProfile = JSON.parse(raw);
      customNotes = customProfile.customNotes || "";
      collaborationPreferences = customProfile.collaborationPreferences || [];
    } catch {
      // No custom profile yet
    }

    const profile: AgentProfile = {
      agentId: agent.id,
      agentName: agent.title,
      personalityRadar,
      collaborationScore: collabScore.collaborationScore,
      collaborationScoreBreakdown: collabScore.collaborationScoreBreakdown,
      strengths,
      weaknesses,
      researchDomains,
      responseStyle,
      collaborationStats: {
        meetingsJoined,
        messagesSent: totalMessages,
        sharedMeetingsWith: Array.from(sharedMeetingsMap.values()).sort(
          (a, b) => b.count - a.count
        ),
        totalCollaborators: sharedMeetingsMap.size,
      },
      collaborationHistory,
      customNotes,
      collaborationPreferences,
    };

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Failed to fetch agent profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch agent profile" },
      { status: 500 }
    );
  }
}

// ============================================================
// PUT /api/agents/[id]/profile — Update custom profile fields
// ============================================================

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify agent exists
    const agent = await db.agent.findUnique({ where: { id } });
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const body = await request.json();
    const { customNotes, collaborationPreferences } = body;

    // Validate inputs
    if (customNotes !== undefined && typeof customNotes !== "string") {
      return NextResponse.json(
        { error: "customNotes must be a string" },
        { status: 400 }
      );
    }
    if (
      collaborationPreferences !== undefined &&
      !Array.isArray(collaborationPreferences)
    ) {
      return NextResponse.json(
        { error: "collaborationPreferences must be an array of strings" },
        { status: 400 }
      );
    }

    // Ensure profiles directory exists
    await fs.mkdir(PROFILES_DIR, { recursive: true });

    // Build profile data
    const profileData = {
      customNotes: (customNotes || "").trim(),
      collaborationPreferences: (collaborationPreferences || []).map((p: string) =>
        String(p).trim()
      ),
      updatedAt: new Date().toISOString(),
    };

    // Write profile file
    const filePath = path.join(PROFILES_DIR, `${id}.json`);
    await fs.writeFile(
      filePath,
      JSON.stringify(profileData, null, 2),
      "utf-8"
    );

    return NextResponse.json({ success: true, profile: profileData });
  } catch (error) {
    console.error("Failed to update agent profile:", error);
    return NextResponse.json(
      { error: "Failed to update agent profile" },
      { status: 500 }
    );
  }
}
