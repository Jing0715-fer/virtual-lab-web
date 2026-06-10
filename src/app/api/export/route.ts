import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Helper: Escape CSV fields
function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// Helper: Convert array of objects to CSV string
function objectsToCSV(objects: Record<string, unknown>[]): string {
  if (objects.length === 0) return "";
  const headers = Object.keys(objects[0]);
  const headerLine = headers.map(escapeCSV).join(",");
  const rows = objects.map((obj) =>
    headers.map((h) => escapeCSV(String(obj[h] ?? ""))).join(",")
  );
  return [headerLine, ...rows].join("\n");
}

// GET /api/export?type=meetings|agents|analytics|discussion&format=json|csv&meetingId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "meetings";
    const format = searchParams.get("format") || "json";
    const meetingId = searchParams.get("meetingId");

    let data: unknown;
    let filename: string;

    switch (type) {
      case "meetings": {
        const [teamMeetings, individualMeetings] = await Promise.all([
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
        ]);

        const allMeetings = [
          ...teamMeetings.map((m) => ({
            id: m.id,
            type: "team" as const,
            agenda: m.agenda,
            agendaQuestions: m.agendaQuestions,
            agendaRules: m.agendaRules,
            status: m.status,
            summary: m.summary,
            saveName: m.saveName,
            numRounds: m.numRounds,
            temperature: m.temperature,
            createdAt: m.createdAt.toISOString(),
            updatedAt: m.updatedAt.toISOString(),
            teamLead: m.teamLead?.title || null,
            teamMembers: m.teamMembers?.map((a) => a.title) || [],
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
            agendaQuestions: m.agendaQuestions,
            agendaRules: m.agendaRules,
            status: m.status,
            summary: m.summary,
            saveName: m.saveName,
            numRounds: null as number | null,
            temperature: m.temperature,
            createdAt: m.createdAt.toISOString(),
            updatedAt: m.updatedAt.toISOString(),
            teamLead: null as string | null,
            teamMembers: [m.teamMember?.title].filter(Boolean) as string[],
            messages: m.messages.map((msg) => ({
              id: msg.id,
              agentName: msg.agentName,
              message: msg.message,
              roundIndex: msg.roundIndex,
              createdAt: msg.createdAt.toISOString(),
            })),
          })),
        ];

        data = allMeetings;
        filename = "virtual-lab-meetings";
        break;
      }

      case "agents": {
        const agents = await db.agent.findMany({
          orderBy: { createdAt: "desc" },
        });

        data = agents.map((a) => ({
          id: a.id,
          title: a.title,
          expertise: a.expertise,
          goal: a.goal,
          role: a.role,
          model: a.model,
          color: a.color,
          icon: a.icon,
          createdAt: a.createdAt.toISOString(),
          updatedAt: a.updatedAt.toISOString(),
        }));
        filename = "virtual-lab-agents";
        break;
      }

      case "analytics": {
        const [teamMeetings, individualMeetings, agents] = await Promise.all([
          db.teamMeeting.findMany({
            orderBy: { createdAt: "desc" },
            include: { messages: true },
          }),
          db.individualMeeting.findMany({
            orderBy: { createdAt: "desc" },
            include: { messages: true },
          }),
          db.agent.findMany(),
        ]);

        const allMessages = [
          ...teamMeetings.flatMap((m) => m.messages),
          ...individualMeetings.flatMap((m) => m.messages),
        ];

        const totalMessages = allMessages.length;
        const totalMeetings = teamMeetings.length + individualMeetings.length;
        const avgMessagesPerMeeting =
          totalMeetings > 0
            ? Math.round((totalMessages / totalMeetings) * 10) / 10
            : 0;

        // Meetings by day (last 30 days)
        const now = new Date();
        const meetingsByDay: { date: string; team: number; individual: number }[] = [];
        for (let i = 29; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split("T")[0];
          const dayStart = new Date(dateStr + "T00:00:00.000Z");
          const dayEnd = new Date(dateStr + "T23:59:59.999Z");

          const teamCount = teamMeetings.filter(
            (m) => m.createdAt >= dayStart && m.createdAt <= dayEnd
          ).length;
          const individualCount = individualMeetings.filter(
            (m) => m.createdAt >= dayStart && m.createdAt <= dayEnd
          ).length;

          meetingsByDay.push({ date: dateStr, team: teamCount, individual: individualCount });
        }

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

        data = {
          totalMeetings,
          totalMessages,
          avgMessagesPerMeeting,
          meetingTypeRatio: {
            team: teamMeetings.length,
            individual: individualMeetings.length,
          },
          meetingsByDay,
          agentParticipation,
          generatedAt: new Date().toISOString(),
        };
        filename = "virtual-lab-analytics";
        break;
      }

      case "discussion": {
        if (!meetingId) {
          return NextResponse.json(
            { error: "meetingId is required for discussion export" },
            { status: 400 }
          );
        }

        // Try team meeting first
        let meeting = await db.teamMeeting.findUnique({
          where: { id: meetingId },
          include: {
            teamLead: true,
            teamMembers: true,
            messages: { orderBy: { createdAt: "asc" } },
          },
        });

        let meetingType: "team" | "individual" = "team";

        if (!meeting) {
          const indivMeeting = await db.individualMeeting.findUnique({
            where: { id: meetingId },
            include: {
              teamMember: true,
              messages: { orderBy: { createdAt: "asc" } },
            },
          });

          if (indivMeeting) {
            meeting = {
              ...indivMeeting,
              teamLead: null,
              teamMembers: indivMeeting.teamMember ? [indivMeeting.teamMember] : [],
              numRounds: null,
            } as unknown as typeof meeting;
            meetingType = "individual";
          }
        }

        if (!meeting) {
          return NextResponse.json(
            { error: "Meeting not found" },
            { status: 404 }
          );
        }

        const isTeam = meetingType === "team";
        const m = meeting;

        data = {
          id: m.id,
          type: meetingType,
          agenda: m.agenda,
          agendaQuestions: m.agendaQuestions,
          agendaRules: m.agendaRules,
          status: m.status,
          summary: m.summary,
          saveName: m.saveName,
          numRounds: m.numRounds ?? null,
          temperature: m.temperature,
          createdAt: m.createdAt.toISOString(),
          updatedAt: m.updatedAt.toISOString(),
          teamLead: isTeam ? (m as typeof meeting & { teamLead: { title: string } | null }).teamLead?.title : null,
          teamMembers: isTeam
            ? ((m as typeof meeting & { teamMembers: { title: string }[] }).teamMembers?.map((a) => a.title) || [])
            : [((m as typeof meeting & { teamMember: { title: string } | null }).teamMember)?.title].filter(Boolean),
          messages: m.messages.map((msg) => ({
            id: msg.id,
            agentName: msg.agentName,
            message: msg.message,
            roundIndex: msg.roundIndex,
            createdAt: msg.createdAt.toISOString(),
          })),
        };
        filename = `discussion-${m.saveName || m.id}`;
        break;
      }

      default:
        return NextResponse.json(
          { error: "Invalid type. Use: meetings, agents, analytics, discussion" },
          { status: 400 }
        );
    }

    if (format === "csv") {
      // For nested data, flatten to CSV
      let csvData: Record<string, unknown>[];

      if (type === "meetings") {
        // Flatten meetings - one row per meeting (messages count only)
        csvData = ((data as unknown[]) as Record<string, unknown>[]).map((m) => ({
          id: m.id,
          type: m.type,
          saveName: m.saveName,
          status: m.status,
          agenda: String(m.agenda || "").substring(0, 200),
          numRounds: m.numRounds || "",
          temperature: m.temperature,
          teamLead: m.teamLead || "",
          teamMembers: Array.isArray(m.teamMembers) ? (m.teamMembers as string[]).join("; ") : "",
          messageCount: Array.isArray(m.messages) ? (m.messages as unknown[]).length : 0,
          summary: String(m.summary || "").substring(0, 200),
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
        }));
      } else if (type === "agents") {
        csvData = data as Record<string, unknown>[];
      } else if (type === "analytics") {
        // For analytics, export meetingsByDay as CSV rows
        const analyticsData = data as { meetingsByDay: Record<string, unknown>[] };
        csvData = analyticsData.meetingsByDay;
      } else if (type === "discussion") {
        // One row per message
        const discData = data as { messages: Record<string, unknown>[]; id: string; type: string; saveName: string };
        csvData = discData.messages.map((msg) => ({
          ...msg,
          meetingId: discData.id,
          meetingType: discData.type,
          saveName: discData.saveName,
        }));
      } else {
        csvData = Array.isArray(data) ? (data as Record<string, unknown>[]) : [data as Record<string, unknown>];
      }

      const csv = objectsToCSV(csvData);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
        },
      });
    }

    // JSON format
    const json = JSON.stringify(data, null, 2);
    return new NextResponse(json, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.json"`,
      },
    });
  } catch (error) {
    console.error("Export failed:", error);
    return NextResponse.json(
      { error: "Export failed" },
      { status: 500 }
    );
  }
}
