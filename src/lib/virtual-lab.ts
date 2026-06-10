// Virtual Lab Utility Functions and Constants
// Prompt templates, pre-defined agents, and helper functions

// ============================================================
// Pre-defined Agent Constants
// ============================================================

export const PRINCIPAL_INVESTIGATOR = {
  title: "Principal Investigator",
  expertise: "running a science research lab",
  goal: "perform research that maximizes scientific impact",
  role: "lead a team of experts to solve an important scientific problem",
  model: "gpt-4o",
  color: "#f59e0b",
  icon: "crown",
} as const;

export const SCIENTIFIC_CRITIC = {
  title: "Scientific Critic",
  expertise: "providing critical feedback for scientific research",
  goal: "ensure that proposed research projects are rigorous, detailed, feasible, and scientifically sound",
  role: "provide critical feedback to identify and correct all errors",
  model: "gpt-4o",
  color: "#ef4444",
  icon: "shield-alert",
} as const;

// ============================================================
// Agent Color Presets
// ============================================================

export const AGENT_COLORS = {
  principalInvestigator: "#f59e0b", // amber
  critic: "#ef4444", // red
  scientist: "#10b981", // emerald
  specialist: "#8b5cf6", // violet
  computational: "#06b6d4", // cyan
  experimental: "#f97316", // orange
} as const;

// ============================================================
// Agent Prompt Generation
// ============================================================

export function generateAgentSystemPrompt(agent: {
  title: string;
  expertise: string;
  goal: string;
  role: string;
}): string {
  return `You are a ${agent.title}. Your expertise is in ${agent.expertise}. Your goal is to ${agent.goal}. Your role is to ${agent.role}.`;
}

// ============================================================
// Team Meeting Prompt Templates
// ============================================================

export function teamLeadInitialPrompt(agenda: string): string {
  return `Please start the meeting by introducing yourself and addressing the agenda.\n\nAgenda: ${agenda}`;
}

export function teamLeadIntermediatePrompt(
  roundNum: number,
  numRounds: number
): string {
  return `This is round ${roundNum} of ${numRounds}. Please synthesize the points raised by each team member, make decisions regarding the agenda based on team member input, and ask follow-up questions.`;
}

export function teamLeadFinalPrompt(): string {
  return `This is the final round. Please summarize the meeting and provide your final recommendation.`;
}

export function teamMemberPrompt(
  roundNum: number,
  numRounds: number
): string {
  return `This is round ${roundNum} of ${numRounds}. Please provide your perspective on the discussion so far.`;
}

// ============================================================
// Individual Meeting Prompt Templates
// ============================================================

export function individualAgentPrompt(agenda: string): string {
  return `Please address the agenda.\n\nAgenda: ${agenda}`;
}

export function individualCriticPrompt(): string {
  return `Please critique the agent's response. Provide critical feedback to identify and correct all errors and demand that scientific answers are maximally complete and detailed but simple.`;
}

// ============================================================
// Summary Generation
// ============================================================

export function summarySystemPrompt(): string {
  return `You are a scientific meeting summarizer. Your job is to synthesize the key points, decisions, and recommendations from a research team meeting into a clear, structured summary. Focus on actionable outcomes and scientific insights.`;
}

export function generateSummaryPrompt(
  meetingType: "team" | "individual",
  agenda: string,
  messages: { agentName: string; message: string }[]
): string {
  const conversation = messages
    .map((m) => `${m.agentName}: ${m.message}`)
    .join("\n\n");

  return `Please summarize the following ${meetingType === "team" ? "team" : "individual"} meeting.

Agenda: ${agenda}

Conversation:
${conversation}

Provide a structured summary with:
1. Key Points Discussed
2. Main Decisions / Recommendations
3. Open Questions / Future Directions`;
}

// ============================================================
// Helper: Build messages array for LLM call
// ============================================================

export function buildConversationMessages(
  systemPrompt: string,
  userPrompt: string,
  previousMessages: { role: "system" | "user" | "assistant"; content: string }[] = []
): { role: "system" | "user" | "assistant"; content: string }[] {
  const messages: { role: "system" | "user" | "assistant"; content: string }[] =
    [];

  // System prompt
  messages.push({ role: "system", content: systemPrompt });

  // Previous conversation context
  for (const msg of previousMessages) {
    messages.push(msg);
  }

  // Current user prompt
  messages.push({ role: "user", content: userPrompt });

  return messages;
}

// ============================================================
// Helper: Convert discussion messages to conversation format
// ============================================================

export function discussionToConversation(
  messages: { agentName: string; message: string }[],
  currentAgentName: string
): { role: "user" | "assistant"; content: string }[] {
  const conversation: { role: "user" | "assistant"; content: string }[] = [];

  for (const msg of messages) {
    const role =
      msg.agentName === currentAgentName ? ("assistant" as const) : ("user" as const);
    conversation.push({
      role,
      content: `${msg.agentName}: ${msg.message}`,
    });
  }

  return conversation;
}

// ============================================================
// Meeting Type Discriminator
// ============================================================

export type MeetingType = "team" | "individual";

export interface TeamMeetingConfig {
  type: "team";
  agenda: string;
  agendaQuestions: string[];
  agendaRules: string[];
  numRounds: number;
  temperature: number;
  teamLeadId: string;
  teamMemberIds: string[];
  saveName: string;
}

export interface IndividualMeetingConfig {
  type: "individual";
  agenda: string;
  agendaQuestions: string[];
  agendaRules: string[];
  temperature: number;
  teamMemberId: string;
  saveName: string;
}

export type MeetingConfig = TeamMeetingConfig | IndividualMeetingConfig;
