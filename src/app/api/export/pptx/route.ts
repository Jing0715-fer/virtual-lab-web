import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import PptxGenJS from "pptxgenjs";

// ============================================================
// Types
// ============================================================

interface ExportOptions {
  includeMessages?: boolean;
  includeSummary?: boolean;
  includeAnalytics?: boolean;
}

interface ExportRequestBody {
  type: "meeting" | "agent" | "analytics" | "comparison";
  ids?: string[];
  meetingId?: string;
  options?: ExportOptions;
}

// ============================================================
// Constants
// ============================================================

const EMERALD = "10b981";
const EMERALD_DARK = "059669";
const DARK_BG = "0f172a";
const DARK_CARD = "1e293b";
const DARK_TEXT = "f8fafc";
const MUTED_TEXT = "94a3b8";
const LIGHT_BORDER = "334155";

const AGENT_COLORS = [
  "10b981", "f59e0b", "ef4444", "8b5cf6", "ec4899",
  "06b6d4", "f97316", "6366f1", "14b8a6", "e11d48",
];

function getAgentColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AGENT_COLORS[Math.abs(hash) % AGENT_COLORS.length];
}

function parseJsonField(field: string | null | undefined): string[] {
  if (!field) return [];
  try {
    const parsed = JSON.parse(field);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ============================================================
// Meeting Presentation
// ============================================================

async function generateMeetingPptx(meetingId: string, options: ExportOptions) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
  pptx.author = "Virtual Lab";
  pptx.title = "Meeting Presentation";

  let meeting = await db.teamMeeting.findUnique({
    where: { id: meetingId },
    include: {
      teamLead: true,
      teamMembers: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  let meetingType: "team" | "individual" = "team";
  let teamLead: { title: string; color: string; icon: string } | null = null;
  let teamMembers: { title: string; color: string; icon: string }[] = [];
  let numRounds: number | null = null;

  if (meeting) {
    meetingType = "team";
    teamLead = meeting.teamLead
      ? { title: meeting.teamLead.title, color: meeting.teamLead.color, icon: meeting.teamLead.icon }
      : null;
    teamMembers = meeting.teamMembers.map((m) => ({
      title: m.title,
      color: m.color,
      icon: m.icon,
    }));
    numRounds = meeting.numRounds;
  } else {
    const indivMeeting = await db.individualMeeting.findUnique({
      where: { id: meetingId },
      include: {
        teamMember: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!indivMeeting) return null;
    meeting = indivMeeting as unknown as typeof meeting;
    meetingType = "individual";
    teamMembers = indivMeeting.teamMember
      ? [{ title: indivMeeting.teamMember.title, color: indivMeeting.teamMember.color, icon: indivMeeting.teamMember.icon }]
      : [];
  }

  if (!meeting) return null;

  const m = meeting;
  const agendaQuestions = parseJsonField(m.agendaQuestions as string);
  const agendaRules = parseJsonField(m.agendaRules as string);

  // ---- Slide 1: Title ----
  const titleSlide = pptx.addSlide();
  titleSlide.background = { fill: DARK_BG };
  // Decorative bar
  titleSlide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: "100%", h: 0.08,
    fill: { color: EMERALD },
  });
  titleSlide.addText("VIRTUAL LAB", {
    x: 0.8, y: 1.5, w: 11.5, h: 1,
    fontSize: 18, fontFace: "Arial", color: EMERALD,
    bold: true, letterSpacing: 8,
  });
  titleSlide.addText(m.saveName || "Meeting Report", {
    x: 0.8, y: 2.5, w: 11.5, h: 1.5,
    fontSize: 36, fontFace: "Arial", color: DARK_TEXT,
    bold: true,
  });
  titleSlide.addText(
    `${meetingType === "team" ? "Team Meeting" : "Individual Meeting"}  •  ${formatDate(m.createdAt)}  •  ${m.status}`,
    {
      x: 0.8, y: 4.2, w: 11.5, h: 0.6,
      fontSize: 14, fontFace: "Arial", color: MUTED_TEXT,
    }
  );
  // Footer bar
  titleSlide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 7.2, w: "100%", h: 0.3,
    fill: { color: DARK_CARD },
  });
  titleSlide.addText("AI-Powered Research Collaboration", {
    x: 0.8, y: 7.2, w: 11.5, h: 0.3,
    fontSize: 10, fontFace: "Arial", color: MUTED_TEXT,
    valign: "middle",
  });

  // ---- Slide 2: Agenda ----
  if (m.agenda || agendaQuestions.length > 0) {
    const agendaSlide = pptx.addSlide();
    agendaSlide.background = { fill: DARK_BG };
    agendaSlide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: "100%", h: 0.08,
      fill: { color: EMERALD },
    });

    agendaSlide.addText("Agenda", {
      x: 0.8, y: 0.4, w: 11.5, h: 0.8,
      fontSize: 28, fontFace: "Arial", color: DARK_TEXT,
      bold: true,
    });

    let yPos = 1.5;
    if (m.agenda) {
      agendaSlide.addText(m.agenda, {
        x: 0.8, y: yPos, w: 11.5, h: 1.5,
        fontSize: 16, fontFace: "Arial", color: "cbd5e1",
        valign: "top",
      });
      yPos += 1.8;
    }

    if (agendaQuestions.length > 0) {
      const qTexts: { text: string; options: { fontSize?: number; fontFace?: string; color?: string; bullet?: boolean; breakLine?: boolean } }[] = [];
      qTexts.push({
        text: "Questions",
        options: { fontSize: 18, fontFace: "Arial", color: EMERALD, bold: true, breakLine: true },
      });
      agendaQuestions.forEach((q, i) => {
        qTexts.push({
          text: `${i + 1}. ${q}`,
          options: { fontSize: 14, fontFace: "Arial", color: "cbd5e1", breakLine: true },
        });
      });
      agendaSlide.addText(qTexts, {
        x: 0.8, y: yPos, w: 11.5, h: 4,
        valign: "top",
      });
    }

    if (agendaRules.length > 0) {
      const rTexts: { text: string; options: { fontSize?: number; fontFace?: string; color?: string; breakLine?: boolean } }[] = [];
      rTexts.push({
        text: "Rules",
        options: { fontSize: 18, fontFace: "Arial", color: EMERALD, bold: true, breakLine: true },
      });
      agendaRules.forEach((r) => {
        rTexts.push({
          text: `• ${r}`,
          options: { fontSize: 14, fontFace: "Arial", color: "cbd5e1", breakLine: true },
        });
      });
      agendaSlide.addText(rTexts, {
        x: 0.8, y: yPos + 2, w: 11.5, h: 3,
        valign: "top",
      });
    }
  }

  // ---- Discussion Slides (3-5 messages per slide) ----
  if (options.includeMessages !== false && m.messages.length > 0) {
    const MSGS_PER_SLIDE = 4;
    const slides: typeof m.messages[] = [];
    for (let i = 0; i < m.messages.length; i += MSGS_PER_SLIDE) {
      slides.push(m.messages.slice(i, i + MSGS_PER_SLIDE));
    }

    for (let slideIdx = 0; slideIdx < slides.length; slideIdx++) {
      const msgs = slides[slideIdx];
      const discSlide = pptx.addSlide();
      discSlide.background = { fill: DARK_BG };
      discSlide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: "100%", h: 0.08,
        fill: { color: EMERALD },
      });

      discSlide.addText(`Discussion  (${slideIdx + 1}/${slides.length})`, {
        x: 0.8, y: 0.4, w: 11.5, h: 0.7,
        fontSize: 24, fontFace: "Arial", color: DARK_TEXT,
        bold: true,
      });

      let yPos = 1.5;
      for (const msg of msgs) {
        const agentColor = getAgentColor(msg.agentName);
        // Agent name badge
        discSlide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8, y: yPos, w: 2.5, h: 0.5,
          fill: { color: DARK_CARD },
          rectRadius: 0.1,
        });
        discSlide.addText(msg.agentName, {
          x: 0.9, y: yPos, w: 2.3, h: 0.5,
          fontSize: 13, fontFace: "Arial", color: agentColor,
          bold: true, valign: "middle",
        });
        // Round indicator
        discSlide.addText(`R${msg.roundIndex + 1}`, {
          x: 3.4, y: yPos, w: 0.8, h: 0.5,
          fontSize: 11, fontFace: "Arial", color: MUTED_TEXT,
          valign: "middle",
        });
        // Message content (truncated)
        const messagePreview = msg.message.length > 200 ? msg.message.substring(0, 197) + "..." : msg.message;
        discSlide.addText(messagePreview, {
          x: 0.8, y: yPos + 0.55, w: 11.5, h: 0.9,
          fontSize: 13, fontFace: "Arial", color: "cbd5e1",
          valign: "top",
        });
        yPos += 1.5;
      }
    }
  }

  // ---- Summary Slide ----
  if (options.includeSummary !== false && m.summary) {
    const summarySlide = pptx.addSlide();
    summarySlide.background = { fill: DARK_BG };
    summarySlide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: "100%", h: 0.08,
      fill: { color: EMERALD },
    });

    summarySlide.addText("Key Takeaways", {
      x: 0.8, y: 0.4, w: 11.5, h: 0.8,
      fontSize: 28, fontFace: "Arial", color: DARK_TEXT,
      bold: true,
    });

    // Split summary into bullet-like blocks
    const summaryLines = m.summary.split("\n").filter((l) => l.trim());
    const summaryTexts: { text: string; options: { fontSize?: number; fontFace?: string; color?: string; breakLine?: boolean; bullet?: boolean; paraSpaceAfter?: number } }[] = [];
    summaryLines.forEach((line) => {
      summaryTexts.push({
        text: line.trim().replace(/^[-•]\s*/, ""),
        options: {
          fontSize: 16, fontFace: "Arial", color: "cbd5e1",
          bullet: { type: "bullet" as const },
          breakLine: true,
          paraSpaceAfter: 12,
        },
      });
    });

    summarySlide.addText(summaryTexts, {
      x: 0.8, y: 1.5, w: 11.5, h: 5,
      valign: "top",
    });
  }

  // ---- Participants Slide ----
  {
    const allParticipants = [...new Set([
      ...(teamLead ? [teamLead] : []),
      ...teamMembers,
    ])];
    const partSlide = pptx.addSlide();
    partSlide.background = { fill: DARK_BG };
    partSlide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: "100%", h: 0.08,
      fill: { color: EMERALD },
    });

    partSlide.addText("Participants", {
      x: 0.8, y: 0.4, w: 11.5, h: 0.8,
      fontSize: 28, fontFace: "Arial", color: DARK_TEXT,
      bold: true,
    });

    // Agent cards in a grid
    const cols = Math.min(allParticipants.length, 4);
    const cardW = 2.5;
    const cardH = 1.8;
    const startX = (13.33 - cols * (cardW + 0.3)) / 2;

    allParticipants.forEach((agent, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const cx = startX + col * (cardW + 0.3);
      const cy = 1.8 + row * (cardH + 0.4);

      // Card background
      partSlide.addShape(pptx.ShapeType.roundRect, {
        x: cx, y: cy, w: cardW, h: cardH,
        fill: { color: DARK_CARD },
        rectRadius: 0.15,
        line: { color: agent.color, width: 1.5 },
      });
      // Agent icon circle
      partSlide.addShape(pptx.ShapeType.ellipse, {
        x: cx + cardW / 2 - 0.25, y: cy + 0.3,
        w: 0.5, h: 0.5,
        fill: { color: agent.color },
      });
      // Agent name
      partSlide.addText(agent.title, {
        x: cx, y: cy + 0.95, w: cardW, h: 0.4,
        fontSize: 14, fontFace: "Arial", color: DARK_TEXT,
        bold: true, align: "center",
      });
      // Role label
      partSlide.addText(agent.icon === "bot" ? "AI Agent" : "Human", {
        x: cx, y: cy + 1.3, w: cardW, h: 0.3,
        fontSize: 10, fontFace: "Arial", color: MUTED_TEXT,
        align: "center",
      });
    });
  }

  // ---- Analytics Slide ----
  if (options.includeAnalytics !== false && m.messages.length > 0) {
    const analyticsSlide = pptx.addSlide();
    analyticsSlide.background = { fill: DARK_BG };
    analyticsSlide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: "100%", h: 0.08,
      fill: { color: EMERALD },
    });

    analyticsSlide.addText("Discussion Analytics", {
      x: 0.8, y: 0.4, w: 11.5, h: 0.8,
      fontSize: 28, fontFace: "Arial", color: DARK_TEXT,
      bold: true,
    });

    // Stats cards
    const agentMsgCounts = new Map<string, number>();
    for (const msg of m.messages) {
      agentMsgCounts.set(msg.agentName, (agentMsgCounts.get(msg.agentName) || 0) + 1);
    }
    const totalMsgs = m.messages.length;
    const uniqueAgents = agentMsgCounts.size;

    // Big numbers
    const stats = [
      { label: "Total Messages", value: String(totalMsgs) },
      { label: "Participants", value: String(uniqueAgents) },
      { label: "Rounds", value: String(numRounds || "-") },
      { label: "Avg per Round", value: numRounds ? String(Math.round(totalMsgs / numRounds)) : "-" },
    ];

    stats.forEach((stat, i) => {
      const cx = 0.8 + i * 3;
      analyticsSlide.addShape(pptx.ShapeType.roundRect, {
        x: cx, y: 1.5, w: 2.6, h: 1.5,
        fill: { color: DARK_CARD },
        rectRadius: 0.15,
      });
      analyticsSlide.addText(stat.value, {
        x: cx, y: 1.5, w: 2.6, h: 0.9,
        fontSize: 36, fontFace: "Arial", color: EMERALD,
        bold: true, align: "center",
      });
      analyticsSlide.addText(stat.label, {
        x: cx, y: 2.3, w: 2.6, h: 0.5,
        fontSize: 12, fontFace: "Arial", color: MUTED_TEXT,
        align: "center",
      });
    });

    // Table for per-agent stats
    const sortedCounts = Array.from(agentMsgCounts.entries()).sort((a, b) => b[1] - a[1]);
    const tableRows = [
      [
        { text: "Agent", options: { bold: true, color: DARK_TEXT, fill: { color: DARK_CARD }, fontSize: 12, fontFace: "Arial" } },
        { text: "Messages", options: { bold: true, color: DARK_TEXT, fill: { color: DARK_CARD }, fontSize: 12, fontFace: "Arial", align: "center" } },
        { text: "Share", options: { bold: true, color: DARK_TEXT, fill: { color: DARK_CARD }, fontSize: 12, fontFace: "Arial", align: "center" } },
      ],
      ...sortedCounts.map(([name, count]) => [
        { text: name, options: { color: getAgentColor(name), fontSize: 12, fontFace: "Arial" } },
        { text: String(count), options: { color: "cbd5e1", fontSize: 12, fontFace: "Arial", align: "center" } },
        { text: `${((count / totalMsgs) * 100).toFixed(1)}%`, options: { color: "cbd5e1", fontSize: 12, fontFace: "Arial", align: "center" } },
      ]),
    ];
    analyticsSlide.addTable(tableRows, {
      x: 0.8, y: 3.5, w: 11.5,
      border: { type: "solid", pt: 0.5, color: LIGHT_BORDER },
      colW: [5, 3.5, 3],
      rowH: [0.4, ...sortedCounts.map(() => 0.35)],
    });
  }

  return {
    pptx,
    filename: `${(m.saveName || "meeting-presentation").replace(/\s+/g, "_")}.pptx`,
  };
}

// ============================================================
// Agent Presentation
// ============================================================

async function generateAgentPptx(agentId: string) {
  const agent = await db.agent.findUnique({
    where: { id: agentId },
    include: {
      teamLeadMeetings: { orderBy: { createdAt: "desc" } },
      teamMemberMeetings: { orderBy: { createdAt: "desc" } },
      individualMeetings: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!agent) return null;

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Virtual Lab";

  const allMeetings = [
    ...agent.teamLeadMeetings.map((m) => ({ name: m.saveName, type: "Team (Lead)", status: m.status, date: formatDate(m.createdAt) })),
    ...agent.teamMemberMeetings.map((m) => ({ name: m.saveName, type: "Team (Member)", status: m.status, date: formatDate(m.createdAt) })),
    ...agent.individualMeetings.map((m) => ({ name: m.saveName, type: "Individual", status: m.status, date: formatDate(m.createdAt) })),
  ];

  // Slide 1: Title
  const titleSlide = pptx.addSlide();
  titleSlide.background = { fill: DARK_BG };
  titleSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.08, fill: { color: EMERALD } });
  titleSlide.addText("VIRTUAL LAB", {
    x: 0.8, y: 1.5, w: 11.5, h: 0.8,
    fontSize: 18, fontFace: "Arial", color: EMERALD, bold: true, letterSpacing: 8,
  });
  titleSlide.addText("Agent Profile", {
    x: 0.8, y: 2.5, w: 11.5, h: 0.8,
    fontSize: 28, fontFace: "Arial", color: MUTED_TEXT,
  });
  titleSlide.addText(agent.title, {
    x: 0.8, y: 3.5, w: 11.5, h: 1.5,
    fontSize: 44, fontFace: "Arial", color: agent.color, bold: true,
  });
  titleSlide.addText(agent.expertise, {
    x: 0.8, y: 5.2, w: 11.5, h: 0.6,
    fontSize: 16, fontFace: "Arial", color: "cbd5e1",
  });
  titleSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 7.2, w: "100%", h: 0.3, fill: { color: DARK_CARD } });

  // Slide 2: Profile Details
  const profileSlide = pptx.addSlide();
  profileSlide.background = { fill: DARK_BG };
  profileSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.08, fill: { color: EMERALD } });
  profileSlide.addText("Profile Details", {
    x: 0.8, y: 0.4, w: 11.5, h: 0.8,
    fontSize: 28, fontFace: "Arial", color: DARK_TEXT, bold: true,
  });

  const details = [
    { label: "Title", value: agent.title },
    { label: "Expertise", value: agent.expertise },
    { label: "Goal", value: agent.goal },
    { label: "Role", value: agent.role },
    { label: "Model", value: agent.model },
    { label: "Created", value: formatDate(agent.createdAt) },
  ];

  details.forEach((d, i) => {
    const cy = 1.5 + i * 0.9;
    profileSlide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: cy, w: 11.5, h: 0.75,
      fill: { color: DARK_CARD },
      rectRadius: 0.1,
    });
    profileSlide.addText(d.label, {
      x: 1.0, y: cy, w: 2.5, h: 0.75,
      fontSize: 13, fontFace: "Arial", color: EMERALD, bold: true, valign: "middle",
    });
    profileSlide.addText(d.value, {
      x: 3.5, y: cy, w: 8.5, h: 0.75,
      fontSize: 14, fontFace: "Arial", color: "cbd5e1", valign: "middle",
    });
  });

  // Slide 3: Meeting History
  if (allMeetings.length > 0) {
    const histSlide = pptx.addSlide();
    histSlide.background = { fill: DARK_BG };
    histSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.08, fill: { color: EMERALD } });
    histSlide.addText("Meeting History", {
      x: 0.8, y: 0.4, w: 11.5, h: 0.8,
      fontSize: 28, fontFace: "Arial", color: DARK_TEXT, bold: true,
    });

    const tableRows = [
      [
        { text: "Meeting", options: { bold: true, color: DARK_TEXT, fill: { color: DARK_CARD }, fontSize: 12, fontFace: "Arial" } },
        { text: "Type", options: { bold: true, color: DARK_TEXT, fill: { color: DARK_CARD }, fontSize: 12, fontFace: "Arial" } },
        { text: "Status", options: { bold: true, color: DARK_TEXT, fill: { color: DARK_CARD }, fontSize: 12, fontFace: "Arial", align: "center" } },
        { text: "Date", options: { bold: true, color: DARK_TEXT, fill: { color: DARK_CARD }, fontSize: 12, fontFace: "Arial", align: "center" } },
      ],
      ...allMeetings.slice(0, 15).map((m) => [
        { text: m.name, options: { color: "cbd5e1", fontSize: 12, fontFace: "Arial" } },
        { text: m.type, options: { color: MUTED_TEXT, fontSize: 12, fontFace: "Arial" } },
        { text: m.status, options: { color: m.status === "completed" ? EMERALD : "cbd5e1", fontSize: 12, fontFace: "Arial", align: "center" } },
        { text: m.date, options: { color: MUTED_TEXT, fontSize: 12, fontFace: "Arial", align: "center" } },
      ]),
    ];
    histSlide.addTable(tableRows, {
      x: 0.8, y: 1.5, w: 11.5,
      border: { type: "solid", pt: 0.5, color: LIGHT_BORDER },
      colW: [4, 3, 2.2, 2.3],
    });
  }

  return { pptx, filename: `${agent.title.replace(/\s+/g, "_")}_profile.pptx` };
}

// ============================================================
// Analytics Presentation
// ============================================================

async function generateAnalyticsPptx() {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Virtual Lab";

  const [teamMeetings, individualMeetings, agents] = await Promise.all([
    db.teamMeeting.findMany({ orderBy: { createdAt: "desc" }, include: { messages: true } }),
    db.individualMeeting.findMany({ orderBy: { createdAt: "desc" }, include: { messages: true } }),
    db.agent.findMany(),
  ]);

  const totalMeetings = teamMeetings.length + individualMeetings.length;
  const allMessages = [...teamMeetings.flatMap((m) => m.messages), ...individualMeetings.flatMap((m) => m.messages)];
  const totalMessages = allMessages.length;
  const avgMsgPerMeeting = totalMeetings > 0 ? Math.round((totalMessages / totalMeetings) * 10) / 10 : 0;

  // Agent participation
  const agentParticipationMap = new Map<string, number>();
  for (const agent of agents) {
    const count = allMessages.filter((m) => m.agentName === agent.title).length;
    if (count > 0) agentParticipationMap.set(agent.title, count);
  }
  for (const msg of allMessages) {
    if (msg.agentName !== "User" && !agentParticipationMap.has(msg.agentName)) {
      const count = allMessages.filter((m) => m.agentName === msg.agentName).length;
      agentParticipationMap.set(msg.agentName, count);
    }
  }
  const agentParticipation = Array.from(agentParticipationMap.entries())
    .map(([agentName, count]) => ({ agentName, count }))
    .sort((a, b) => b.count - a.count);

  // Slide 1: Title
  const titleSlide = pptx.addSlide();
  titleSlide.background = { fill: DARK_BG };
  titleSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.08, fill: { color: EMERALD } });
  titleSlide.addText("VIRTUAL LAB", {
    x: 0.8, y: 1.5, w: 11.5, h: 0.8,
    fontSize: 18, fontFace: "Arial", color: EMERALD, bold: true, letterSpacing: 8,
  });
  titleSlide.addText("Research Analytics Report", {
    x: 0.8, y: 2.8, w: 11.5, h: 1.5,
    fontSize: 40, fontFace: "Arial", color: DARK_TEXT, bold: true,
  });
  titleSlide.addText(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), {
    x: 0.8, y: 4.5, w: 11.5, h: 0.6,
    fontSize: 16, fontFace: "Arial", color: MUTED_TEXT,
  });
  titleSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 7.2, w: "100%", h: 0.3, fill: { color: DARK_CARD } });

  // Slide 2: Stats Overview
  const statsSlide = pptx.addSlide();
  statsSlide.background = { fill: DARK_BG };
  statsSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.08, fill: { color: EMERALD } });
  statsSlide.addText("Overview", {
    x: 0.8, y: 0.4, w: 11.5, h: 0.8,
    fontSize: 28, fontFace: "Arial", color: DARK_TEXT, bold: true,
  });

  const stats = [
    { label: "Total Meetings", value: String(totalMeetings) },
    { label: "Team Meetings", value: String(teamMeetings.length) },
    { label: "Individual Meetings", value: String(individualMeetings.length) },
    { label: "Total Agents", value: String(agents.length) },
    { label: "Total Messages", value: String(totalMessages) },
    { label: "Avg Msg/Meeting", value: String(avgMsgPerMeeting) },
  ];

  stats.forEach((stat, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const cx = 0.8 + col * 4.2;
    const cy = 1.8 + row * 2.6;

    statsSlide.addShape(pptx.ShapeType.roundRect, {
      x: cx, y: cy, w: 3.6, h: 2,
      fill: { color: DARK_CARD },
      rectRadius: 0.15,
    });
    statsSlide.addText(stat.value, {
      x: cx, y: cy + 0.3, w: 3.6, h: 1,
      fontSize: 42, fontFace: "Arial", color: EMERALD, bold: true, align: "center",
    });
    statsSlide.addText(stat.label, {
      x: cx, y: cy + 1.3, w: 3.6, h: 0.5,
      fontSize: 13, fontFace: "Arial", color: MUTED_TEXT, align: "center",
    });
  });

  // Slide 3: Meeting Activity Table
  const meetingSlide = pptx.addSlide();
  meetingSlide.background = { fill: DARK_BG };
  meetingSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.08, fill: { color: EMERALD } });
  meetingSlide.addText("Meeting Activity", {
    x: 0.8, y: 0.4, w: 11.5, h: 0.8,
    fontSize: 28, fontFace: "Arial", color: DARK_TEXT, bold: true,
  });

  const meetingRows = [
    [
      { text: "Meeting", options: { bold: true, color: DARK_TEXT, fill: { color: DARK_CARD }, fontSize: 11, fontFace: "Arial" } },
      { text: "Type", options: { bold: true, color: DARK_TEXT, fill: { color: DARK_CARD }, fontSize: 11, fontFace: "Arial", align: "center" } },
      { text: "Status", options: { bold: true, color: DARK_TEXT, fill: { color: DARK_CARD }, fontSize: 11, fontFace: "Arial", align: "center" } },
      { text: "Messages", options: { bold: true, color: DARK_TEXT, fill: { color: DARK_CARD }, fontSize: 11, fontFace: "Arial", align: "center" } },
      { text: "Date", options: { bold: true, color: DARK_TEXT, fill: { color: DARK_CARD }, fontSize: 11, fontFace: "Arial", align: "center" } },
    ],
    ...[...teamMeetings.map((m) => ({ ...m, mtype: "Team" })),
      ...individualMeetings.map((m) => ({ ...m, mtype: "Individual" }))
    ].slice(0, 15).map((m) => [
      { text: m.saveName, options: { color: "cbd5e1", fontSize: 11, fontFace: "Arial" } },
      { text: m.mtype, options: { color: MUTED_TEXT, fontSize: 11, fontFace: "Arial", align: "center" } },
      { text: m.status, options: { color: m.status === "completed" ? EMERALD : "cbd5e1", fontSize: 11, fontFace: "Arial", align: "center" } },
      { text: String(m.messages.length), options: { color: "cbd5e1", fontSize: 11, fontFace: "Arial", align: "center" } },
      { text: formatDate(m.createdAt), options: { color: MUTED_TEXT, fontSize: 11, fontFace: "Arial", align: "center" } },
    ]),
  ];
  meetingSlide.addTable(meetingRows, {
    x: 0.8, y: 1.5, w: 11.5,
    border: { type: "solid", pt: 0.5, color: LIGHT_BORDER },
    colW: [4, 2, 2, 1.5, 2],
  });

  // Slide 4: Agent Participation
  if (agentParticipation.length > 0) {
    const agentSlide = pptx.addSlide();
    agentSlide.background = { fill: DARK_BG };
    agentSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.08, fill: { color: EMERALD } });
    agentSlide.addText("Agent Participation", {
      x: 0.8, y: 0.4, w: 11.5, h: 0.8,
      fontSize: 28, fontFace: "Arial", color: DARK_TEXT, bold: true,
    });

    const agentRows = [
      [
        { text: "Agent", options: { bold: true, color: DARK_TEXT, fill: { color: DARK_CARD }, fontSize: 12, fontFace: "Arial" } },
        { text: "Messages", options: { bold: true, color: DARK_TEXT, fill: { color: DARK_CARD }, fontSize: 12, fontFace: "Arial", align: "center" } },
        { text: "Share", options: { bold: true, color: DARK_TEXT, fill: { color: DARK_CARD }, fontSize: 12, fontFace: "Arial", align: "center" } },
      ],
      ...agentParticipation.slice(0, 15).map(({ agentName, count }) => [
        { text: agentName, options: { color: getAgentColor(agentName), fontSize: 12, fontFace: "Arial" } },
        { text: String(count), options: { color: "cbd5e1", fontSize: 12, fontFace: "Arial", align: "center" } },
        { text: `${((count / totalMessages) * 100).toFixed(1)}%`, options: { color: "cbd5e1", fontSize: 12, fontFace: "Arial", align: "center" } },
      ]),
    ];
    agentSlide.addTable(agentRows, {
      x: 0.8, y: 1.5, w: 11.5,
      border: { type: "solid", pt: 0.5, color: LIGHT_BORDER },
      colW: [6, 2.75, 2.75],
    });
  }

  return { pptx, filename: "virtual_lab_analytics_report.pptx" };
}

// ============================================================
// POST /api/export/pptx
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body: ExportRequestBody = await request.json();
    const { type, ids, meetingId, options = {} } = body;

    let result: { pptx: PptxGenJS; filename: string } | null = null;

    switch (type) {
      case "meeting": {
        if (!meetingId) {
          return NextResponse.json({ error: "meetingId is required for meeting export" }, { status: 400 });
        }
        result = await generateMeetingPptx(meetingId, options);
        break;
      }
      case "agent": {
        if (!ids || ids.length === 0) {
          return NextResponse.json({ error: "ids is required for agent export" }, { status: 400 });
        }
        result = await generateAgentPptx(ids[0]);
        break;
      }
      case "analytics": {
        result = await generateAnalyticsPptx();
        break;
      }
      case "comparison": {
        // For comparison, fall back to analytics presentation
        result = await generateAnalyticsPptx();
        result.filename = "virtual_lab_comparison_report.pptx";
        break;
      }
      default:
        return NextResponse.json({ error: "Invalid type. Use: meeting, agent, analytics, comparison" }, { status: 400 });
    }

    if (!result) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    const buffer = await result.pptx.write({ outputType: "nodebuffer" });
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
    console.error("PPTX export failed:", error);
    return NextResponse.json({ error: "PPTX export failed" }, { status: 500 });
  }
}
