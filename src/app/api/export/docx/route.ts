import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  PageBreak,
  TabStopType,
  TabStopPosition,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
  convertInchesToTwip,
} from "docx";

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
// Helpers
// ============================================================

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
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function emeraldColor() {
  return "10b981";
}

function darkColor() {
  return "0f172a";
}

function createTextRun(text: string, options?: Partial<{ bold: boolean; color: string; size: number; italics: boolean }>) {
  return new TextRun({
    text,
    bold: options?.bold ?? false,
    color: options?.color ?? "1e293b",
    size: options?.size ?? 24,
    italics: options?.italics ?? false,
  });
}

function createHeading(text: string, level: HeadingLevel = HeadingLevel.HEADING_2) {
  return new Paragraph({
    text,
    heading: level,
    spacing: { before: 300, after: 150 },
  });
}

function createBullet(text: string, level: number = 0) {
  return new Paragraph({
    text,
    bullet: { level },
    spacing: { before: 60, after: 60 },
  });
}

function createSpacer(size: number = 200) {
  return new Paragraph({ spacing: { before: size, after: 0 }, text: "" });
}

function createTableCell(
  text: string,
  options?: Partial<{ bold: boolean; shading: string; color: string; width: number }>
) {
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          createTextRun(text, {
            bold: options?.bold ?? false,
            color: options?.color ?? "1e293b",
          }),
        ],
        spacing: { before: 40, after: 40 },
      }),
    ],
    shading: options?.shading
      ? { type: ShadingType.CLEAR, fill: options.shading, color: options.shading }
      : undefined,
    width: options?.width ? { size: options.width, type: WidthType.PERCENTAGE } : undefined,
  });
}

// ============================================================
// Meeting Report Generator
// ============================================================

async function generateMeetingDocx(meetingId: string, options: ExportOptions) {
  // Find the meeting
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

    if (!indivMeeting) {
      return null;
    }

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
  const allParticipants = [...new Set([
    ...(teamLead ? [teamLead.title] : []),
    ...teamMembers.map((tm) => tm.title),
    ...m.messages.map((msg) => msg.agentName),
  ])];
  const agentColorMap = new Map<string, string>();
  [...(teamLead ? [teamLead] : []), ...teamMembers].forEach((a) => agentColorMap.set(a.title, a.color));

  // Build document children
  const children: (Paragraph | Table)[] = [];

  // ---- Title Page ----
  children.push(
    new Paragraph({ spacing: { before: 3000 }, text: "" }),
    new Paragraph({
      children: [
        createTextRun("Virtual Lab", { bold: true, color: emeraldColor(), size: 56 }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        createTextRun("— Meeting Report —", { bold: true, color: darkColor(), size: 40 }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [
        createTextRun(m.saveName || "Meeting Report", { bold: true, color: "475569", size: 32 }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    })
  );

  // Metadata table
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            createTableCell("Type", { bold: true, shading: "F1F5F9", width: 30 }),
            createTableCell(meetingType === "team" ? "Team Meeting" : "Individual Meeting", { width: 70 }),
          ],
        }),
        new TableRow({
          children: [
            createTableCell("Status", { bold: true, shading: "F1F5F9", width: 30 }),
            createTableCell(m.status, { width: 70 }),
          ],
        }),
        new TableRow({
          children: [
            createTableCell("Date", { bold: true, shading: "F1F5F9", width: 30 }),
            createTableCell(formatDate(m.createdAt), { width: 70 }),
          ],
        }),
        new TableRow({
          children: [
            createTableCell("Participants", { bold: true, shading: "F1F5F9", width: 30 }),
            createTableCell(allParticipants.join(", "), { width: 70 }),
          ],
        }),
        ...(numRounds
          ? [
              new TableRow({
                children: [
                  createTableCell("Rounds", { bold: true, shading: "F1F5F9", width: 30 }),
                  createTableCell(String(numRounds), { width: 70 }),
                ],
              }),
            ]
          : []),
        new TableRow({
          children: [
            createTableCell("Temperature", { bold: true, shading: "F1F5F9", width: 30 }),
            createTableCell(String(m.temperature), { width: 70 }),
          ],
        }),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] })
  );

  // ---- Agenda Section ----
  children.push(createHeading("Agenda", HeadingLevel.HEADING_1));
  children.push(
    new Paragraph({
      children: [createTextRun(m.agenda || "No agenda provided", { italics: !m.agenda })],
      spacing: { before: 100, after: 200 },
    })
  );

  // Questions
  if (agendaQuestions.length > 0) {
    children.push(createHeading("Agenda Questions", HeadingLevel.HEADING_2));
    agendaQuestions.forEach((q, i) => {
      children.push(new Paragraph({
        children: [createTextRun(`${i + 1}. ${q}`)],
        spacing: { before: 60, after: 60 },
      }));
    });
  }

  // Rules
  if (agendaRules.length > 0) {
    children.push(createHeading("Agenda Rules", HeadingLevel.HEADING_2));
    agendaRules.forEach((r) => {
      children.push(createBullet(r));
    });
  }

  // ---- Discussion Transcript ----
  if (options.includeMessages !== false && m.messages.length > 0) {
    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(createHeading("Discussion Transcript", HeadingLevel.HEADING_1));

    let lastRound = -1;
    const messagesPerRound: Map<number, typeof m.messages> = new Map();
    for (const msg of m.messages) {
      const msgs = messagesPerRound.get(msg.roundIndex) || [];
      msgs.push(msg);
      messagesPerRound.set(msg.roundIndex, msgs);
    }

    for (const [roundIdx, msgs] of messagesPerRound.entries()) {
      children.push(
        new Paragraph({
          children: [
            createTextRun(`━━━ Round ${roundIdx + 1} ━━━`, { bold: true, color: emeraldColor(), size: 24 }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 300, after: 200 },
        })
      );

      for (const msg of msgs) {
        const agentColor = agentColorMap.get(msg.agentName);
        children.push(
          new Paragraph({
            children: [
              createTextRun(`${msg.agentName}`, { bold: true, color: agentColor || emeraldColor(), size: 24 }),
              createTextRun(`  —  ${formatDate(msg.createdAt)}`, { color: "94A3B8", size: 20 }),
            ],
            spacing: { before: 200, after: 50 },
          }),
          new Paragraph({
            children: [createTextRun(msg.message, { size: 24 })],
            spacing: { before: 50, after: 150 },
            indent: { left: convertInchesToTwip(0.3) },
          })
        );
      }
    }

    children.push(createSpacer());
  }

  // ---- Summary Section ----
  if (options.includeSummary !== false && m.summary) {
    children.push(createHeading("Summary", HeadingLevel.HEADING_1));
    children.push(
      new Paragraph({
        children: [createTextRun(m.summary)],
        spacing: { before: 100, after: 200 },
      })
    );
  }

  // ---- Analytics Section ----
  if (options.includeAnalytics !== false) {
    children.push(createHeading("Analytics", HeadingLevel.HEADING_1));

    // Message counts per agent
    const agentMsgCounts = new Map<string, number>();
    for (const msg of m.messages) {
      agentMsgCounts.set(msg.agentName, (agentMsgCounts.get(msg.agentName) || 0) + 1);
    }
    const sortedAgentCounts = Array.from(agentMsgCounts.entries()).sort((a, b) => b[1] - a[1]);

    children.push(createHeading("Participation Statistics", HeadingLevel.HEADING_2));
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              createTableCell("Agent", { bold: true, shading: "F1F5F9", width: 50 }),
              createTableCell("Messages", { bold: true, shading: "F1F5F9", width: 25 }),
              createTableCell("Share", { bold: true, shading: "F1F5F9", width: 25 }),
            ],
          }),
          ...sortedAgentCounts.map(([name, count]) =>
            new TableRow({
              children: [
                createTableCell(name, { width: 50 }),
                createTableCell(String(count), { width: 25 }),
                createTableCell(
                  `${((count / m.messages.length) * 100).toFixed(1)}%`,
                  { width: 25 }
                ),
              ],
            })
          ),
          new TableRow({
            children: [
              createTableCell("Total", { bold: true, width: 50 }),
              createTableCell(String(m.messages.length), { bold: true, width: 25 }),
              createTableCell("100%", { bold: true, width: 25 }),
            ],
          }),
        ],
      })
    );
  }

  // ---- Build Document ----
  const doc = new Document({
    creator: "Virtual Lab",
    title: `${m.saveName || "Meeting Report"} — Virtual Lab`,
    description: "AI-Powered Research Collaboration Platform",
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1.2),
              right: convertInchesToTwip(1.2),
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  createTextRun("Virtual Lab — Meeting Report", { color: "94A3B8", size: 18, italics: true }),
                ],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  createTextRun("Page ", { color: "94A3B8", size: 18 }),
                  new TextRun({ children: [PageNumber.CURRENT], color: "94A3B8", size: 18 }),
                  createTextRun(" of ", { color: "94A3B8", size: 18 }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], color: "94A3B8", size: 18 }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return {
    doc,
    filename: `${(m.saveName || "meeting-report").replace(/\s+/g, "_")}.docx`,
  };
}

// ============================================================
// Agent Profile Generator
// ============================================================

async function generateAgentDocx(agentId: string) {
  const agent = await db.agent.findUnique({
    where: { id: agentId },
    include: {
      teamLeadMeetings: {
        include: { messages: true },
        orderBy: { createdAt: "desc" },
      },
      teamMemberMeetings: {
        include: { messages: true },
        orderBy: { createdAt: "desc" },
      },
      individualMeetings: {
        include: { messages: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!agent) return null;

  const allMeetings = [
    ...agent.teamLeadMeetings.map((m) => ({
      id: m.id,
      name: m.saveName,
      type: "team" as const,
      role: "Lead",
      status: m.status,
      date: m.createdAt,
      messageCount: m.messages.length,
    })),
    ...agent.teamMemberMeetings.map((m) => ({
      id: m.id,
      name: m.saveName,
      type: "team" as const,
      role: "Member",
      status: m.status,
      date: m.createdAt,
      messageCount: m.messages.length,
    })),
    ...agent.individualMeetings.map((m) => ({
      id: m.id,
      name: m.saveName,
      type: "individual" as const,
      role: "Participant",
      status: m.status,
      date: m.createdAt,
      messageCount: m.messages.length,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const totalMessages = allMeetings.reduce((acc, m) => acc + m.messageCount, 0);

  const children: (Paragraph | Table)[] = [];

  // Title
  children.push(
    new Paragraph({ spacing: { before: 2000 }, text: "" }),
    new Paragraph({
      children: [createTextRun("Virtual Lab", { bold: true, color: emeraldColor(), size: 48 })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [createTextRun("— Agent Profile —", { bold: true, color: darkColor(), size: 36 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [createTextRun(agent.title, { bold: true, color: agent.color, size: 32 })],
      alignment: AlignmentType.CENTER,
    })
  );

  // Agent details table
  children.push(
    createSpacer(300),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            createTableCell("Title", { bold: true, shading: "F1F5F9", width: 30 }),
            createTableCell(agent.title, { width: 70 }),
          ],
        }),
        new TableRow({
          children: [
            createTableCell("Expertise", { bold: true, shading: "F1F5F9", width: 30 }),
            createTableCell(agent.expertise, { width: 70 }),
          ],
        }),
        new TableRow({
          children: [
            createTableCell("Goal", { bold: true, shading: "F1F5F9", width: 30 }),
            createTableCell(agent.goal, { width: 70 }),
          ],
        }),
        new TableRow({
          children: [
            createTableCell("Role", { bold: true, shading: "F1F5F9", width: 30 }),
            createTableCell(agent.role, { width: 70 }),
          ],
        }),
        new TableRow({
          children: [
            createTableCell("Model", { bold: true, shading: "F1F5F9", width: 30 }),
            createTableCell(agent.model, { width: 70 }),
          ],
        }),
        new TableRow({
          children: [
            createTableCell("Created", { bold: true, shading: "F1F5F9", width: 30 }),
            createTableCell(formatDate(agent.createdAt), { width: 70 }),
          ],
        }),
      ],
    })
  );

  // Performance metrics
  children.push(
    new Paragraph({ children: [new PageBreak()] }),
    createHeading("Performance Overview", HeadingLevel.HEADING_1),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            createTableCell("Total Meetings", { bold: true, shading: "F1F5F9", width: 50 }),
            createTableCell(String(allMeetings.length), { width: 50 }),
          ],
        }),
        new TableRow({
          children: [
            createTableCell("Team Meetings (Lead)", { bold: true, shading: "F1F5F9", width: 50 }),
            createTableCell(String(agent.teamLeadMeetings.length), { width: 50 }),
          ],
        }),
        new TableRow({
          children: [
            createTableCell("Team Meetings (Member)", { bold: true, shading: "F1F5F9", width: 50 }),
            createTableCell(String(agent.teamMemberMeetings.length), { width: 50 }),
          ],
        }),
        new TableRow({
          children: [
            createTableCell("Individual Meetings", { bold: true, shading: "F1F5F9", width: 50 }),
            createTableCell(String(agent.individualMeetings.length), { width: 50 }),
          ],
        }),
        new TableRow({
          children: [
            createTableCell("Total Messages", { bold: true, shading: "F1F5F9", width: 50 }),
            createTableCell(String(totalMessages), { width: 50 }),
          ],
        }),
      ],
    })
  );

  // Meeting history
  if (allMeetings.length > 0) {
    children.push(
      createHeading("Meeting Participation History", HeadingLevel.HEADING_1),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              createTableCell("Meeting", { bold: true, shading: "F1F5F9", width: 35 }),
              createTableCell("Type", { bold: true, shading: "F1F5F9", width: 20 }),
              createTableCell("Role", { bold: true, shading: "F1F5F9", width: 15 }),
              createTableCell("Status", { bold: true, shading: "F1F5F9", width: 15 }),
              createTableCell("Messages", { bold: true, shading: "F1F5F9", width: 15 }),
            ],
          }),
          ...allMeetings.map((m) =>
            new TableRow({
              children: [
                createTableCell(m.name, { width: 35 }),
                createTableCell(m.type === "team" ? "Team" : "Individual", { width: 20 }),
                createTableCell(m.role, { width: 15 }),
                createTableCell(m.status, { width: 15 }),
                createTableCell(String(m.messageCount), { width: 15 }),
              ],
            })
          ),
        ],
      })
    );
  }

  const doc = new Document({
    creator: "Virtual Lab",
    title: `Agent Profile — ${agent.title}`,
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1.2),
              right: convertInchesToTwip(1.2),
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  createTextRun("Virtual Lab — Agent Profile", { color: "94A3B8", size: 18, italics: true }),
                ],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  createTextRun("Page ", { color: "94A3B8", size: 18 }),
                  new TextRun({ children: [PageNumber.CURRENT], color: "94A3B8", size: 18 }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return { doc, filename: `${agent.title.replace(/\s+/g, "_")}_profile.docx` };
}

// ============================================================
// Analytics Report Generator
// ============================================================

async function generateAnalyticsDocx() {
  const [teamMeetings, individualMeetings, agents] = await Promise.all([
    db.teamMeeting.findMany({ orderBy: { createdAt: "desc" }, include: { messages: true } }),
    db.individualMeeting.findMany({ orderBy: { createdAt: "desc" }, include: { messages: true } }),
    db.agent.findMany(),
  ]);

  const totalMeetings = teamMeetings.length + individualMeetings.length;
  const allMessages = [
    ...teamMeetings.flatMap((m) => m.messages),
    ...individualMeetings.flatMap((m) => m.messages),
  ];
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

  const children: (Paragraph | Table)[] = [];

  // Title
  children.push(
    new Paragraph({ spacing: { before: 2000 }, text: "" }),
    new Paragraph({
      children: [createTextRun("Virtual Lab", { bold: true, color: emeraldColor(), size: 56 })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [createTextRun("— Research Analytics Report —", { bold: true, color: darkColor(), size: 40 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    }),
    new Paragraph({
      children: [createTextRun(`Generated: ${formatDate(new Date())}`, { color: "64748B", size: 24 })],
      alignment: AlignmentType.CENTER,
    })
  );

  // Overview Stats
  children.push(
    new Paragraph({ children: [new PageBreak()] }),
    createHeading("Overview", HeadingLevel.HEADING_1),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            createTableCell("Total Meetings", { bold: true, shading: "ECFDF5", color: "065F46", width: 33 }),
            createTableCell("Total Agents", { bold: true, shading: "ECFDF5", color: "065F46", width: 33 }),
            createTableCell("Total Messages", { bold: true, shading: "ECFDF5", color: "065F46", width: 34 }),
          ],
        }),
        new TableRow({
          children: [
            createTableCell(String(totalMeetings), { bold: true, width: 33 }),
            createTableCell(String(agents.length), { bold: true, width: 33 }),
            createTableCell(String(totalMessages), { bold: true, width: 34 }),
          ],
        }),
        new TableRow({
          children: [
            createTableCell("Team Meetings", { bold: true, shading: "F1F5F9", width: 33 }),
            createTableCell("Individual Meetings", { bold: true, shading: "F1F5F9", width: 33 }),
            createTableCell("Avg Msg/Meeting", { bold: true, shading: "F1F5F9", width: 34 }),
          ],
        }),
        new TableRow({
          children: [
            createTableCell(String(teamMeetings.length), { width: 33 }),
            createTableCell(String(individualMeetings.length), { width: 33 }),
            createTableCell(String(avgMsgPerMeeting), { width: 34 }),
          ],
        }),
      ],
    })
  );

  // Meeting Activity
  children.push(
    createHeading("Meeting Activity", HeadingLevel.HEADING_1),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            createTableCell("Meeting", { bold: true, shading: "F1F5F9", width: 30 }),
            createTableCell("Type", { bold: true, shading: "F1F5F9", width: 15 }),
            createTableCell("Status", { bold: true, shading: "F1F5F9", width: 15 }),
            createTableCell("Messages", { bold: true, shading: "F1F5F9", width: 15 }),
            createTableCell("Date", { bold: true, shading: "F1F5F9", width: 25 }),
          ],
        }),
        ...[...teamMeetings.map((m) => ({ ...m, mtype: "Team" as const })),
          ...individualMeetings.map((m) => ({ ...m, mtype: "Individual" as const }))
        ].slice(0, 50).map((m) =>
          new TableRow({
            children: [
              createTableCell(m.saveName, { width: 30 }),
              createTableCell(m.mtype, { width: 15 }),
              createTableCell(m.status, { width: 15 }),
              createTableCell(String(m.messages.length), { width: 15 }),
              createTableCell(formatDate(m.createdAt), { width: 25 }),
            ],
          })
        ),
      ],
    })
  );

  // Agent Participation
  if (agentParticipation.length > 0) {
    children.push(
      createHeading("Agent Participation", HeadingLevel.HEADING_1),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              createTableCell("Agent", { bold: true, shading: "F1F5F9", width: 50 }),
              createTableCell("Messages", { bold: true, shading: "F1F5F9", width: 25 }),
              createTableCell("Share", { bold: true, shading: "F1F5F9", width: 25 }),
            ],
          }),
          ...agentParticipation.map(({ agentName, count }) =>
            new TableRow({
              children: [
                createTableCell(agentName, { width: 50 }),
                createTableCell(String(count), { width: 25 }),
                createTableCell(
                  `${((count / totalMessages) * 100).toFixed(1)}%`,
                  { width: 25 }
                ),
              ],
            })
          ),
        ],
      })
    );
  }

  const doc = new Document({
    creator: "Virtual Lab",
    title: "Research Analytics Report",
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1.2),
              right: convertInchesToTwip(1.2),
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  createTextRun("Virtual Lab — Analytics Report", { color: "94A3B8", size: 18, italics: true }),
                ],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  createTextRun("Page ", { color: "94A3B8", size: 18 }),
                  new TextRun({ children: [PageNumber.CURRENT], color: "94A3B8", size: 18 }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return { doc, filename: "virtual_lab_analytics_report.docx" };
}

// ============================================================
// Comparison Report Generator
// ============================================================

async function generateComparisonDocx(ids: string[]) {
  const meetings: Array<{
    id: string;
    saveName: string;
    type: string;
    status: string;
    agenda: string;
    summary: string | null;
    createdAt: Date;
    messages: { agentName: string; message: string }[];
    participants: string[];
  }> = [];

  for (const id of ids) {
    let meeting = await db.teamMeeting.findUnique({
      where: { id },
      include: { teamLead: true, teamMembers: true, messages: true },
    });

    if (meeting) {
      meetings.push({
        id: meeting.id,
        saveName: meeting.saveName,
        type: "Team",
        status: meeting.status,
        agenda: meeting.agenda,
        summary: meeting.summary,
        createdAt: meeting.createdAt,
        messages: meeting.messages.map((m) => ({ agentName: m.agentName, message: m.message })),
        participants: [
          ...(meeting.teamLead ? [meeting.teamLead.title] : []),
          ...meeting.teamMembers.map((m) => m.title),
        ],
      });
    } else {
      const indiv = await db.individualMeeting.findUnique({
        where: { id },
        include: { teamMember: true, messages: true },
      });
      if (indiv) {
        meetings.push({
          id: indiv.id,
          saveName: indiv.saveName,
          type: "Individual",
          status: indiv.status,
          agenda: indiv.agenda,
          summary: indiv.summary,
          createdAt: indiv.createdAt,
          messages: indiv.messages.map((m) => ({ agentName: m.agentName, message: m.message })),
          participants: indiv.teamMember ? [indiv.teamMember.title] : [],
        });
      }
    }
  }

  if (meetings.length === 0) return null;

  // Find shared agents and topics
  const allAgents = meetings.map((m) => new Set(m.participants));
  const sharedAgents = meetings.length > 1
    ? Array.from(allAgents[0]).filter((a) => allAgents.slice(1).every((s) => s.has(a)))
    : [];
  const uniqueAgents = Array.from(new Set(meetings.flatMap((m) => m.participants))).filter(
    (a) => !sharedAgents.includes(a)
  );

  const children: (Paragraph | Table)[] = [];

  // Title
  children.push(
    new Paragraph({ spacing: { before: 2000 }, text: "" }),
    new Paragraph({
      children: [createTextRun("Virtual Lab", { bold: true, color: emeraldColor(), size: 56 })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [createTextRun("— Comparison Report —", { bold: true, color: darkColor(), size: 40 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    })
  );

  // Side-by-side comparison table
  children.push(
    createHeading("Meeting Comparison", HeadingLevel.HEADING_1),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            createTableCell("Attribute", { bold: true, shading: "ECFDF5", color: "065F46", width: 20 }),
            ...meetings.map((m) =>
              createTableCell(m.saveName, { bold: true, shading: "ECFDF5", color: "065F46", width: Math.floor(80 / meetings.length) })
            ),
          ],
        }),
        ...([
          ["Type", meetings.map((m) => m.type)],
          ["Status", meetings.map((m) => m.status)],
          ["Date", meetings.map((m) => formatDate(m.createdAt))],
          ["Messages", meetings.map((m) => String(m.messages.length))],
          ["Participants", meetings.map((m) => m.participants.join(", "))],
        ] as [string, string[]][]).map(([label, values]) =>
          new TableRow({
            children: [
              createTableCell(label, { bold: true, shading: "F1F5F9", width: 20 }),
              ...values.map((v) => createTableCell(v, { width: Math.floor(80 / meetings.length) })),
            ],
          })
        ),
      ],
    })
  );

  // Agenda comparison
  children.push(
    createHeading("Agenda Comparison", HeadingLevel.HEADING_1)
  );
  meetings.forEach((m) => {
    children.push(
      new Paragraph({
        children: [createTextRun(m.saveName, { bold: true, color: emeraldColor() })],
        spacing: { before: 200, after: 50 },
      }),
      new Paragraph({
        children: [createTextRun(m.agenda || "No agenda")],
        spacing: { before: 50, after: 100 },
        indent: { left: convertInchesToTwip(0.3) },
      })
    );
  });

  // Shared agents
  if (sharedAgents.length > 0) {
    children.push(
      createHeading("Shared Agents", HeadingLevel.HEADING_2),
      new Paragraph({
        children: [createTextRun(sharedAgents.join(", "))],
        spacing: { before: 100, after: 200 },
      })
    );
  }

  // Unique agents
  if (uniqueAgents.length > 0) {
    children.push(
      createHeading("Unique Agents (per meeting)", HeadingLevel.HEADING_2),
      new Paragraph({
        children: [createTextRun(uniqueAgents.join(", "))],
        spacing: { before: 100, after: 200 },
      })
    );
  }

  // Key differences
  children.push(
    createHeading("Key Differences & Recommendations", HeadingLevel.HEADING_1)
  );
  meetings.forEach((m) => {
    children.push(
      createBullet(`${m.saveName}: ${m.messages.length} messages, ${m.participants.length} participants — ${m.status}`)
    );
  });

  const doc = new Document({
    creator: "Virtual Lab",
    title: "Meeting Comparison Report",
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1.2),
              right: convertInchesToTwip(1.2),
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  createTextRun("Virtual Lab — Comparison Report", { color: "94A3B8", size: 18, italics: true }),
                ],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  createTextRun("Page ", { color: "94A3B8", size: 18 }),
                  new TextRun({ children: [PageNumber.CURRENT], color: "94A3B8", size: 18 }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return { doc, filename: "virtual_lab_comparison_report.docx" };
}

// ============================================================
// POST /api/export/docx
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body: ExportRequestBody = await request.json();
    const { type, ids, meetingId, options = {} } = body;

    let result: { doc: Document; filename: string } | null = null;

    switch (type) {
      case "meeting": {
        if (!meetingId) {
          return NextResponse.json({ error: "meetingId is required for meeting export" }, { status: 400 });
        }
        result = await generateMeetingDocx(meetingId, options);
        break;
      }
      case "agent": {
        if (!ids || ids.length === 0) {
          return NextResponse.json({ error: "ids is required for agent export" }, { status: 400 });
        }
        result = await generateAgentDocx(ids[0]);
        break;
      }
      case "analytics": {
        result = await generateAnalyticsDocx();
        break;
      }
      case "comparison": {
        if (!ids || ids.length < 2) {
          return NextResponse.json({ error: "At least 2 ids required for comparison" }, { status: 400 });
        }
        result = await generateComparisonDocx(ids);
        break;
      }
      default:
        return NextResponse.json({ error: "Invalid type. Use: meeting, agent, analytics, comparison" }, { status: 400 });
    }

    if (!result) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    const buffer = await Packer.toBuffer(result.doc);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
    console.error("DOCX export failed:", error);
    return NextResponse.json({ error: "DOCX export failed" }, { status: 500 });
  }
}
