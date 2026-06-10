import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { safeParseJsonArray } from "@/lib/parse-utils";

// ============================================================
// Types
// ============================================================

interface MeetingWithTimeline {
  id: string;
  type: "team" | "individual";
  status: string;
  agenda: string;
  agendaQuestions: string[];
  agendaRules: string[];
  saveName: string;
  createdAt: string;
  updatedAt: string;
  summary: string | null;
  // Timeline-specific computed fields
  timelinePosition: number;
  duration: number; // minutes
  participantCount: number;
  // Relations
  teamLeadId?: string;
  teamLead?: { id: string; title: string; color: string; icon: string };
  teamMembers?: { id: string; title: string; color: string; icon: string }[];
  teamMemberId?: string;
  teamMember?: { id: string; title: string; color: string; icon: string };
  messages: { id: string; agentName: string; message: string; roundIndex: number; createdAt: string }[];
  numRounds?: number;
  temperature?: number;
}

interface TimelineSummary {
  total: number;
  byType: { team: number; individual: number };
  byStatus: { draft: number; running: number; completed: number };
}

interface TimelineRange {
  start: string;
  end: string;
}

// ============================================================
// GET /api/meetings/timeline
// ============================================================

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const view = (searchParams.get("view") || "week") as "day" | "week" | "month" | "year";
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    const type = (searchParams.get("type") || "all") as "team" | "individual" | "all";

    // Determine time range based on view
    const now = new Date();
    let rangeStart: Date;
    let rangeEnd: Date;

    if (startDateStr && endDateStr) {
      rangeStart = new Date(startDateStr);
      rangeEnd = new Date(endDateStr);
    } else {
      switch (view) {
        case "day":
          rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
          rangeEnd = new Date(rangeStart.getTime() + 24 * 60 * 60 * 1000);
          break;
        case "week":
          const dayOfWeek = now.getDay();
          rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0);
          rangeEnd = new Date(rangeStart.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          rangeStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
          rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
          break;
        case "year":
          rangeStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
          rangeEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
          break;
        default:
          rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0);
          rangeEnd = new Date(now);
      }
    }

    // Fetch team meetings
    const teamMeetings = await db.teamMeeting.findMany({
      where: {
        ...(type !== "all" ? {} : {}),
        createdAt: { gte: rangeStart, lte: rangeEnd },
      },
      include: {
        teamLead: { select: { id: true, title: true, color: true, icon: true } },
        teamMembers: { select: { id: true, title: true, color: true, icon: true } },
        messages: { orderBy: { createdAt: "asc" }, select: { id: true, agentName: true, message: true, roundIndex: true, createdAt: true } },
      },
    });

    // Fetch individual meetings
    const individualMeetings = await db.individualMeeting.findMany({
      where: {
        createdAt: { gte: rangeStart, lte: rangeEnd },
      },
      include: {
        teamMember: { select: { id: true, title: true, color: true, icon: true } },
        messages: { orderBy: { createdAt: "asc" }, select: { id: true, agentName: true, message: true, roundIndex: true, createdAt: true } },
      },
    });

    // Normalize into unified format with timeline metadata
    const allMeetings: MeetingWithTimeline[] = [];

    if (type === "all" || type === "team") {
      teamMeetings.forEach((m) => {
        // Compute duration from message timestamps
        let duration = 0;
        if (m.messages.length >= 2) {
          const first = m.messages[0].createdAt.getTime();
          const last = m.messages[m.messages.length - 1].createdAt.getTime();
          duration = Math.round((last - first) / 60000);
        }
        duration = Math.max(duration, 1); // Minimum 1 minute

        // Timeline position (percentage within range)
        const position = rangeEnd.getTime() - rangeStart.getTime() > 0
          ? ((m.createdAt.getTime() - rangeStart.getTime()) / (rangeEnd.getTime() - rangeStart.getTime())) * 100
          : 50;

        // Participant count
        const participantCount = (m.teamMembers?.length || 0) + 1; // +1 for lead

        allMeetings.push({
          id: m.id,
          type: "team",
          status: m.status,
          agenda: m.agenda,
          agendaQuestions: safeParseJsonArray(m.agendaQuestions),
          agendaRules: safeParseJsonArray(m.agendaRules),
          saveName: m.saveName,
          createdAt: m.createdAt.toISOString(),
          updatedAt: m.updatedAt.toISOString(),
          summary: m.summary,
          numRounds: m.numRounds,
          temperature: m.temperature,
          teamLeadId: m.teamLeadId,
          teamLead: m.teamLead ? { id: m.teamLead.id, title: m.teamLead.title, color: m.teamLead.color, icon: m.teamLead.icon } : undefined,
          teamMembers: m.teamMembers,
          messages: m.messages.map((msg) => ({
            id: msg.id,
            agentName: msg.agentName,
            message: msg.message,
            roundIndex: msg.roundIndex,
            createdAt: msg.createdAt.toISOString(),
          })),
          timelinePosition: Math.max(0, Math.min(100, position)),
          duration,
          participantCount,
        });
      });
    }

    if (type === "all" || type === "individual") {
      individualMeetings.forEach((m) => {
        let duration = 0;
        if (m.messages.length >= 2) {
          const first = m.messages[0].createdAt.getTime();
          const last = m.messages[m.messages.length - 1].createdAt.getTime();
          duration = Math.round((last - first) / 60000);
        }
        duration = Math.max(duration, 1);

        const position = rangeEnd.getTime() - rangeStart.getTime() > 0
          ? ((m.createdAt.getTime() - rangeStart.getTime()) / (rangeEnd.getTime() - rangeStart.getTime())) * 100
          : 50;

        allMeetings.push({
          id: m.id,
          type: "individual",
          status: m.status,
          agenda: m.agenda,
          agendaQuestions: safeParseJsonArray(m.agendaQuestions),
          agendaRules: safeParseJsonArray(m.agendaRules),
          saveName: m.saveName,
          createdAt: m.createdAt.toISOString(),
          updatedAt: m.updatedAt.toISOString(),
          summary: m.summary,
          temperature: m.temperature,
          teamMemberId: m.teamMemberId,
          teamMember: m.teamMember ? { id: m.teamMember.id, title: m.teamMember.title, color: m.teamMember.color, icon: m.teamMember.icon } : undefined,
          messages: m.messages.map((msg) => ({
            id: msg.id,
            agentName: msg.agentName,
            message: msg.message,
            roundIndex: msg.roundIndex,
            createdAt: msg.createdAt.toISOString(),
          })),
          timelinePosition: Math.max(0, Math.min(100, position)),
          duration,
          participantCount: 1,
        });
      });
    }

    // Sort by createdAt descending
    allMeetings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Compute summary
    const summary: TimelineSummary = {
      total: allMeetings.length,
      byType: {
        team: allMeetings.filter((m) => m.type === "team").length,
        individual: allMeetings.filter((m) => m.type === "individual").length,
      },
      byStatus: {
        draft: allMeetings.filter((m) => m.status === "draft").length,
        running: allMeetings.filter((m) => m.status === "running").length,
        completed: allMeetings.filter((m) => m.status === "completed").length,
      },
    };

    const range: TimelineRange = {
      start: rangeStart.toISOString(),
      end: rangeEnd.toISOString(),
    };

    return NextResponse.json({
      meetings: allMeetings,
      range,
      summary,
    });
  } catch (error) {
    console.error("Failed to fetch timeline data:", error);
    return NextResponse.json(
      { error: "Failed to fetch timeline data" },
      { status: 500 }
    );
  }
}

// ============================================================
// POST /api/meetings/timeline — Create a scheduled meeting
// ============================================================

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      type,
      agenda,
      scheduledStart,
      duration,
      recurring,
      agendaQuestions = [],
      agendaRules = [],
      temperature = 0.2,
      teamLeadId,
      teamMemberIds = [],
      teamMemberId,
      saveName = "discussion",
    } = body;

    // Validate required fields
    if (!type || !["team", "individual"].includes(type)) {
      return NextResponse.json(
        { error: "type must be 'team' or 'individual'" },
        { status: 400 }
      );
    }

    if (!agenda) {
      return NextResponse.json(
        { error: "agenda is required" },
        { status: 400 }
      );
    }

    if (!scheduledStart) {
      return NextResponse.json(
        { error: "scheduledStart is required" },
        { status: 400 }
      );
    }

    const startDateTime = new Date(scheduledStart);
    if (isNaN(startDateTime.getTime())) {
      return NextResponse.json(
        { error: "scheduledStart must be a valid ISO date string" },
        { status: 400 }
      );
    }

    if (!duration || duration < 15) {
      return NextResponse.json(
        { error: "duration must be at least 15 minutes" },
        { status: 400 }
      );
    }

    // Create meeting based on type
    if (type === "team") {
      if (!teamLeadId) {
        return NextResponse.json(
          { error: "teamLeadId is required for team meetings" },
          { status: 400 }
        );
      }

      // Verify team lead exists
      const teamLead = await db.agent.findUnique({
        where: { id: teamLeadId },
      });
      if (!teamLead) {
        return NextResponse.json(
          { error: "Team lead agent not found" },
          { status: 404 }
        );
      }

      // Verify all team members exist
      if (teamMemberIds.length > 0) {
        const members = await db.agent.findMany({
          where: { id: { in: teamMemberIds } },
        });
        if (members.length !== teamMemberIds.length) {
          return NextResponse.json(
            { error: "One or more team member agents not found" },
            { status: 404 }
          );
        }
      }

      // Check for scheduling conflicts with existing meetings
      const endDateTime = new Date(startDateTime.getTime() + duration * 60000);
      const conflictingMeetings = await db.teamMeeting.findMany({
        where: {
          OR: [
            { teamLeadId: teamLeadId },
            { teamMembers: { some: { id: { in: [teamLeadId, ...teamMemberIds] } } } },
          ],
          createdAt: {
            gte: new Date(startDateTime.getTime() - duration * 60000),
            lte: endDateTime,
          },
          status: { in: ["draft", "running"] },
        },
      });

      const meeting = await db.teamMeeting.create({
        data: {
          agenda,
          agendaQuestions: JSON.stringify(agendaQuestions),
          agendaRules: JSON.stringify(agendaRules),
          numRounds: 3,
          temperature,
          teamLeadId,
          saveName,
          teamMembers: {
            connect: teamMemberIds.map((id: string) => ({ id })),
          },
        },
        include: {
          teamLead: { select: { id: true, title: true, color: true, icon: true } },
          teamMembers: { select: { id: true, title: true, color: true, icon: true } },
          messages: true,
        },
      });

      return NextResponse.json(
        {
          ...meeting,
          type: "team",
          scheduledStart: scheduledStart,
          duration,
          recurring: recurring || null,
          conflicts: conflictingMeetings.map((m) => ({
            id: m.id,
            saveName: m.saveName,
            type: "team",
          })),
        },
        { status: 201 }
      );
    }

    if (type === "individual") {
      if (!teamMemberId) {
        return NextResponse.json(
          { error: "teamMemberId is required for individual meetings" },
          { status: 400 }
        );
      }

      // Verify agent exists
      const member = await db.agent.findUnique({
        where: { id: teamMemberId },
      });
      if (!member) {
        return NextResponse.json(
          { error: "Team member agent not found" },
          { status: 404 }
        );
      }

      // Check for conflicts
      const endDateTime = new Date(startDateTime.getTime() + duration * 60000);
      const conflictingMeetings = await db.individualMeeting.findMany({
        where: {
          teamMemberId: teamMemberId,
          createdAt: {
            gte: new Date(startDateTime.getTime() - duration * 60000),
            lte: endDateTime,
          },
          status: { in: ["draft", "running"] },
        },
      });

      const meeting = await db.individualMeeting.create({
        data: {
          agenda,
          agendaQuestions: JSON.stringify(agendaQuestions),
          agendaRules: JSON.stringify(agendaRules),
          temperature,
          teamMemberId,
          saveName,
        },
        include: {
          teamMember: { select: { id: true, title: true, color: true, icon: true } },
          messages: true,
        },
      });

      return NextResponse.json(
        {
          ...meeting,
          type: "individual",
          scheduledStart: scheduledStart,
          duration,
          recurring: recurring || null,
          conflicts: conflictingMeetings.map((m) => ({
            id: m.id,
            saveName: m.saveName,
            type: "individual",
          })),
        },
        { status: 201 }
      );
    }

    return NextResponse.json({ error: "Invalid meeting type" }, { status: 400 });
  } catch (error) {
    console.error("Failed to create scheduled meeting:", error);
    return NextResponse.json(
      { error: "Failed to create scheduled meeting" },
      { status: 500 }
    );
  }
}
