import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/notifications - Fetch notifications
export async function GET() {
  try {
    // Return notifications from localStorage-based in-memory store
    // Since we don't have a Notification model in Prisma, generate from meeting data
    const [teamMeetings, individualMeetings] = await Promise.all([
      db.teamMeeting.findMany({
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
      db.individualMeeting.findMany({
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
    ]);

    const notifications = [
      ...teamMeetings.map((m) => ({
        id: `team-${m.id}`,
        type: m.status === "completed" ? "meeting_completed" : m.status === "running" ? "meeting_started" : "task_assigned",
        title: m.status === "completed" ? "Team Meeting Completed" : m.status === "running" ? "Team Meeting Running" : "Team Meeting Created",
        message: m.saveName || m.agenda.substring(0, 80) + "...",
        read: false,
        link: m.id,
        createdAt: m.updatedAt.toISOString(),
      })),
      ...individualMeetings.map((m) => ({
        id: `indiv-${m.id}`,
        type: m.status === "completed" ? "meeting_completed" : m.status === "running" ? "meeting_started" : "task_assigned",
        title: m.status === "completed" ? "Individual Meeting Completed" : m.status === "running" ? "Individual Meeting Running" : "Individual Meeting Created",
        message: m.saveName || m.agenda.substring(0, 80) + "...",
        read: false,
        link: m.id,
        createdAt: m.updatedAt.toISOString(),
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

// POST /api/notifications - Mark notification as read
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationId } = body;
    // In a real app, update the notification in DB
    return NextResponse.json({ success: true, notificationId });
  } catch (error) {
    console.error("Failed to update notification:", error);
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 }
    );
  }
}
