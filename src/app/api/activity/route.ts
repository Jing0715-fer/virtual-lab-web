import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export type ActivityType =
  | "meeting_created"
  | "meeting_completed"
  | "agent_created"
  | "message_sent"
  | "note_added"
  | "pipeline_stage_completed"
  | "export_generated"
  | "agent_updated";

interface ActivityItem {
  id: string;
  type: ActivityType;
  description: string;
  timestamp: string;
  actorName: string;
  actorColor?: string;
  actorIcon?: string;
  metadata?: Record<string, string>;
}

// Generate simulated activities from existing data
async function generateActivities(): Promise<ActivityItem[]> {
  const items: ActivityItem[] = [];

  const agents = await db.agent.findMany({ orderBy: { createdAt: "desc" } });
  agents.forEach((a) => {
    items.push({
      id: `agent-created-${a.id}`,
      type: "agent_created",
      description: `Agent "${a.title}" was created`,
      timestamp: a.createdAt.toISOString(),
      actorName: "System",
      actorColor: "#8b5cf6",
      actorIcon: "bot",
      metadata: { agentId: a.id, agentTitle: a.title },
    });
    if (a.updatedAt.getTime() - a.createdAt.getTime() > 2000) {
      items.push({
        id: `agent-updated-${a.id}`,
        type: "agent_updated",
        description: `Agent "${a.title}" was updated`,
        timestamp: a.updatedAt.toISOString(),
        actorName: "System",
        actorColor: "#f97316",
        actorIcon: "pencil",
        metadata: { agentId: a.id, agentTitle: a.title },
      });
    }
  });

  const teamMeetings = await db.teamMeeting.findMany({
    orderBy: { createdAt: "desc" },
    include: { teamLead: true, teamMembers: true, messages: true },
  });
  teamMeetings.forEach((m) => {
    const name = m.saveName || m.agenda.substring(0, 50);
    items.push({
      id: `tm-created-${m.id}`,
      type: "meeting_created",
      description: `Team meeting "${name}" was created`,
      timestamp: m.createdAt.toISOString(),
      actorName: m.teamLead.title,
      actorColor: m.teamLead.color,
      actorIcon: "users",
      metadata: { meetingId: m.id, meetingType: "team" },
    });
    if (m.status === "completed") {
      items.push({
        id: `tm-completed-${m.id}`,
        type: "meeting_completed",
        description: `Team meeting "${name}" completed with ${m.messages.length} messages`,
        timestamp: m.updatedAt.toISOString(),
        actorName: m.teamLead.title,
        actorColor: "#10b981",
        actorIcon: "check-circle",
        metadata: { meetingId: m.id, messageCount: String(m.messages.length) },
      });
    }
    m.messages.slice(0, 5).forEach((msg, idx) => {
      items.push({
        id: `tm-msg-${m.id}-${idx}`,
        type: "message_sent",
        description: `${msg.agentName} sent a message in "${name}"`,
        timestamp: msg.createdAt.toISOString(),
        actorName: msg.agentName,
        actorColor: "#06b6d4",
        actorIcon: "message-square",
        metadata: { meetingId: m.id, messageId: msg.id, round: String(msg.roundIndex) },
      });
    });
  });

  const indivMeetings = await db.individualMeeting.findMany({
    orderBy: { createdAt: "desc" },
    include: { teamMember: true, messages: true },
  });
  indivMeetings.forEach((m) => {
    const name = m.saveName || m.agenda.substring(0, 50);
    items.push({
      id: `im-created-${m.id}`,
      type: "meeting_created",
      description: `Individual meeting "${name}" was created`,
      timestamp: m.createdAt.toISOString(),
      actorName: m.teamMember.title,
      actorColor: m.teamMember.color,
      actorIcon: "bot",
      metadata: { meetingId: m.id, meetingType: "individual" },
    });
    if (m.status === "completed") {
      items.push({
        id: `im-completed-${m.id}`,
        type: "meeting_completed",
        description: `Individual meeting "${name}" completed with ${m.messages.length} messages`,
        timestamp: m.updatedAt.toISOString(),
        actorName: m.teamMember.title,
        actorColor: "#10b981",
        actorIcon: "check-circle",
        metadata: { meetingId: m.id, messageCount: String(m.messages.length) },
      });
    }
    m.messages.slice(0, 5).forEach((msg, idx) => {
      items.push({
        id: `im-msg-${m.id}-${idx}`,
        type: "message_sent",
        description: `${msg.agentName} sent a message in "${name}"`,
        timestamp: msg.createdAt.toISOString(),
        actorName: msg.agentName,
        actorColor: "#06b6d4",
        actorIcon: "message-square",
        metadata: { meetingId: m.id, messageId: msg.id, round: String(msg.roundIndex) },
      });
    });
  });

  const pipelines = await db.pipeline.findMany({
    include: { stages: { include: { tasks: true } } },
  });
  pipelines.forEach((p) => {
    p.stages.forEach((stage) => {
      const doneTasks = stage.tasks.filter((t) => t.status === "done");
      if (doneTasks.length > 0) {
        items.push({
          id: `pipe-done-${stage.id}`,
          type: "pipeline_stage_completed",
          description: `${doneTasks.length} tasks completed in "${stage.title}" of pipeline "${p.name}"`,
          timestamp: doneTasks[doneTasks.length - 1].updatedAt.toISOString(),
          actorName: "Pipeline",
          actorColor: "#10b981",
          actorIcon: "git-branch",
          metadata: { pipelineId: p.id, stageId: stage.id, taskCount: String(doneTasks.length) },
        });
      }
    });
  });

  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return items;
}

// GET /api/activity
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const agent = searchParams.get("agent");
    const since = searchParams.get("since");
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    let activities = await generateActivities();

    if (type) {
      const types = type.split(",");
      activities = activities.filter((a) => types.includes(a.type));
    }
    if (agent) {
      activities = activities.filter(
        (a) => a.actorName === agent || a.metadata?.agentTitle === agent
      );
    }
    if (since) {
      const sinceDate = new Date(since);
      activities = activities.filter(
        (a) => new Date(a.timestamp).getTime() >= sinceDate.getTime()
      );
    }

    const total = activities.length;
    const paginated = activities.slice(offset, offset + limit);

    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
    const hourlyBuckets: number[] = new Array(24).fill(0);
    const allActivities = await generateActivities();
    allActivities.forEach((a) => {
      const ts = new Date(a.timestamp).getTime();
      if (ts >= twentyFourHoursAgo && ts <= now) {
        const hourIdx = Math.floor((now - ts) / (60 * 60 * 1000));
        if (hourIdx >= 0 && hourIdx < 24) {
          hourlyBuckets[23 - hourIdx]++;
        }
      }
    });

    return NextResponse.json({
      activities: paginated,
      total,
      limit,
      offset,
      density: hourlyBuckets,
    });
  } catch (error) {
    console.error("Failed to fetch activities:", error);
    return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 });
  }
}

// POST /api/activity
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, description, actorName, actorColor, actorIcon, metadata } = body;

    if (!type || !description) {
      return NextResponse.json({ error: "type and description are required" }, { status: 400 });
    }

    const validTypes: ActivityType[] = [
      "meeting_created", "meeting_completed", "agent_created", "message_sent",
      "note_added", "pipeline_stage_completed", "export_generated", "agent_updated",
    ];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: `Invalid type. Must be one of: ${validTypes.join(", ")}` }, { status: 400 });
    }

    const activity: ActivityItem = {
      id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      description,
      timestamp: new Date().toISOString(),
      actorName: actorName || "System",
      actorColor: actorColor || "#10b981",
      actorIcon: actorIcon || "activity",
      metadata: metadata || {},
    };

    return NextResponse.json(activity, { status: 201 });
  } catch (error) {
    console.error("Failed to create activity:", error);
    return NextResponse.json({ error: "Failed to create activity" }, { status: 500 });
  }
}
