import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { safeParseJsonArray } from "@/lib/parse-utils";

// GET /api/meetings - List all meetings (team + individual) with agents and messages
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    const [teamMeetings, individualMeetings] = await Promise.all([
      db.teamMeeting.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          teamLead: true,
          teamMembers: true,
          messages: { orderBy: { createdAt: "asc" }, take: 200 },
        },
      }),
      db.individualMeeting.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          teamMember: true,
          messages: { orderBy: { createdAt: "asc" }, take: 200 },
        },
      }),
    ]);

    // Normalize into a unified format
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

    // Sort by createdAt descending
    meetings.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json(meetings);
  } catch (error) {
    console.error("Failed to fetch meetings:", error);
    return NextResponse.json(
      { error: "Failed to fetch meetings" },
      { status: 500 }
    );
  }
}

// POST /api/meetings - Create a new meeting (team or individual)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type } = body;

    if (!type || !["team", "individual"].includes(type)) {
      return NextResponse.json(
        { error: "type must be 'team' or 'individual'" },
        { status: 400 }
      );
    }

    if (type === "team") {
      const {
        agenda,
        agendaQuestions = [],
        agendaRules = [],
        numRounds = 3,
        temperature = 0.2,
        teamLeadId,
        teamMemberIds = [],
        saveName = "discussion",
      } = body;

      if (!agenda || !teamLeadId) {
        return NextResponse.json(
          { error: "agenda and teamLeadId are required for team meetings" },
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

      const meeting = await db.teamMeeting.create({
        data: {
          agenda,
          agendaQuestions: JSON.stringify(agendaQuestions),
          agendaRules: JSON.stringify(agendaRules),
          numRounds,
          temperature,
          teamLeadId,
          saveName,
          teamMembers: {
            connect: teamMemberIds.map((id: string) => ({ id })),
          },
        },
        include: {
          teamLead: true,
          teamMembers: true,
          messages: true,
        },
      });

      return NextResponse.json(
        { ...meeting, type: "team" },
        { status: 201 }
      );
    }

    if (type === "individual") {
      const {
        agenda,
        agendaQuestions = [],
        agendaRules = [],
        temperature = 0.2,
        teamMemberId,
        saveName = "discussion",
      } = body;

      if (!agenda || !teamMemberId) {
        return NextResponse.json(
          { error: "agenda and teamMemberId are required for individual meetings" },
          { status: 400 }
        );
      }

      // Verify team member exists
      const member = await db.agent.findUnique({
        where: { id: teamMemberId },
      });
      if (!member) {
        return NextResponse.json(
          { error: "Team member agent not found" },
          { status: 404 }
        );
      }

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
          teamMember: true,
          messages: true,
        },
      });

      return NextResponse.json(
        { ...meeting, type: "individual" },
        { status: 201 }
      );
    }

    return NextResponse.json({ error: "Invalid meeting type" }, { status: 400 });
  } catch (error) {
    console.error("Failed to create meeting:", error);
    return NextResponse.json(
      { error: "Failed to create meeting" },
      { status: 500 }
    );
  }
}
