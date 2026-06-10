import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { safeParseJsonArray } from "@/lib/parse-utils";

// Helper to find a meeting by ID (checks both team and individual)
async function findMeeting(id: string) {
  const teamMeeting = await db.teamMeeting.findUnique({
    where: { id },
    include: {
      teamLead: true,
      teamMembers: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (teamMeeting) {
    return {
      ...teamMeeting,
      type: "team" as const,
      agendaQuestions: safeParseJsonArray(teamMeeting.agendaQuestions),
      agendaRules: safeParseJsonArray(teamMeeting.agendaRules),
    };
  }

  const individualMeeting = await db.individualMeeting.findUnique({
    where: { id },
    include: {
      teamMember: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (individualMeeting) {
    return {
      ...individualMeeting,
      type: "individual" as const,
      agendaQuestions: safeParseJsonArray(individualMeeting.agendaQuestions),
      agendaRules: safeParseJsonArray(individualMeeting.agendaRules),
    };
  }

  return null;
}

// GET /api/meetings/[id] - Get a meeting with all its messages
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const meeting = await findMeeting(id);

    if (!meeting) {
      return NextResponse.json(
        { error: "Meeting not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(meeting);
  } catch (error) {
    console.error("Failed to fetch meeting:", error);
    return NextResponse.json(
      { error: "Failed to fetch meeting" },
      { status: 500 }
    );
  }
}

// PUT /api/meetings/[id] - Update meeting status/summary
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, summary, type } = body;

    if (!type || !["team", "individual"].includes(type)) {
      return NextResponse.json(
        { error: "type must be 'team' or 'individual'" },
        { status: 400 }
      );
    }

    if (type === "team") {
      const existing = await db.teamMeeting.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json(
          { error: "Meeting not found" },
          { status: 404 }
        );
      }

      const meeting = await db.teamMeeting.update({
        where: { id },
        data: {
          ...(status !== undefined && { status }),
          ...(summary !== undefined && { summary }),
        },
        include: {
          teamLead: true,
          teamMembers: true,
          messages: { orderBy: { createdAt: "asc" } },
        },
      });

      return NextResponse.json({ ...meeting, type: "team" });
    }

    if (type === "individual") {
      const existing = await db.individualMeeting.findUnique({
        where: { id },
      });
      if (!existing) {
        return NextResponse.json(
          { error: "Meeting not found" },
          { status: 404 }
        );
      }

      const meeting = await db.individualMeeting.update({
        where: { id },
        data: {
          ...(status !== undefined && { status }),
          ...(summary !== undefined && { summary }),
        },
        include: {
          teamMember: true,
          messages: { orderBy: { createdAt: "asc" } },
        },
      });

      return NextResponse.json({ ...meeting, type: "individual" });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("Failed to update meeting:", error);
    return NextResponse.json(
      { error: "Failed to update meeting" },
      { status: 500 }
    );
  }
}

// DELETE /api/meetings/[id] - Delete a meeting
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { type } = body;

    if (!type || !["team", "individual"].includes(type)) {
      // Try to find the meeting to determine its type
      const meeting = await findMeeting(id);
      if (!meeting) {
        return NextResponse.json(
          { error: "Meeting not found" },
          { status: 404 }
        );
      }

      if (meeting.type === "team") {
        await db.teamMeeting.delete({ where: { id } });
      } else {
        await db.individualMeeting.delete({ where: { id } });
      }

      return NextResponse.json({ success: true });
    }

    if (type === "team") {
      const existing = await db.teamMeeting.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json(
          { error: "Meeting not found" },
          { status: 404 }
        );
      }
      await db.teamMeeting.delete({ where: { id } });
    } else {
      const existing = await db.individualMeeting.findUnique({
        where: { id },
      });
      if (!existing) {
        return NextResponse.json(
          { error: "Meeting not found" },
          { status: 404 }
        );
      }
      await db.individualMeeting.delete({ where: { id } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete meeting:", error);
    return NextResponse.json(
      { error: "Failed to delete meeting" },
      { status: 500 }
    );
  }
}
