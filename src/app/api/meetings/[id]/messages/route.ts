import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// GET /api/meetings/[id]/messages - Get all messages for a meeting
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check team meeting first
    const teamMeeting = await db.teamMeeting.findUnique({
      where: { id },
    });

    if (teamMeeting) {
      const messages = await db.discussionMessage.findMany({
        where: { teamMeetingId: id },
        orderBy: { createdAt: "asc" },
      });
      return NextResponse.json({ messages, type: "team" });
    }

    // Check individual meeting
    const individualMeeting = await db.individualMeeting.findUnique({
      where: { id },
    });

    if (individualMeeting) {
      const messages = await db.discussionMessage.findMany({
        where: { individualMeetingId: id },
        orderBy: { createdAt: "asc" },
      });
      return NextResponse.json({ messages, type: "individual" });
    }

    return NextResponse.json(
      { error: "Meeting not found" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

// POST /api/meetings/[id]/messages - Add a user message to a meeting
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { message, agentName = "User", roundIndex = 0, type } = body;

    if (!message) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    if (!type || !["team", "individual"].includes(type)) {
      return NextResponse.json(
        { error: "type must be 'team' or 'individual'" },
        { status: 400 }
      );
    }

    if (type === "team") {
      const meeting = await db.teamMeeting.findUnique({ where: { id } });
      if (!meeting) {
        return NextResponse.json(
          { error: "Meeting not found" },
          { status: 404 }
        );
      }

      const msg = await db.discussionMessage.create({
        data: {
          agentName,
          message,
          roundIndex,
          teamMeetingId: id,
        },
      });

      return NextResponse.json(msg, { status: 201 });
    }

    if (type === "individual") {
      const meeting = await db.individualMeeting.findUnique({
        where: { id },
      });
      if (!meeting) {
        return NextResponse.json(
          { error: "Meeting not found" },
          { status: 404 }
        );
      }

      const msg = await db.discussionMessage.create({
        data: {
          agentName,
          message,
          roundIndex,
          individualMeetingId: id,
        },
      });

      return NextResponse.json(msg, { status: 201 });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("Failed to add message:", error);
    return NextResponse.json(
      { error: "Failed to add message" },
      { status: 500 }
    );
  }
}
