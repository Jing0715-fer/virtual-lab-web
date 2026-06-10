import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// In-memory uptime tracker (resets on server restart)
const serverStartTime = Date.now();

// GET /api/live-metrics - Aggregated live metrics endpoint
export async function GET() {
  const startTime = performance.now();

  try {
    // Health check: measure internal endpoint response times
    const [teamMeetings, individualMeetings, agents, notifications] = await Promise.all([
      db.teamMeeting.findMany({
        orderBy: { updatedAt: "desc" },
        take: 20,
        include: { messages: { orderBy: { createdAt: "asc" } } },
      }),
      db.individualMeeting.findMany({
        orderBy: { updatedAt: "desc" },
        take: 20,
        include: { messages: { orderBy: { createdAt: "asc" } } },
      }),
      db.agent.findMany({ orderBy: { createdAt: "desc" } }),
      db.notification.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    const endTime = performance.now();
    const responseTime = Math.round((endTime - startTime) * 100) / 100;

    // Active sessions estimate (running meetings)
    const runningTeam = teamMeetings.filter((m) => m.status === "running").length;
    const runningIndiv = individualMeetings.filter((m) => m.status === "running").length;
    const activeSessions = runningTeam + runningIndiv;

    // All meetings and messages for recent activity
    const allMeetings = [
      ...teamMeetings.map((m) => ({ ...m, type: "team" as const })),
      ...individualMeetings.map((m) => ({ ...m, type: "individual" as const })),
    ];

    const allMessages = allMeetings.flatMap((m) => m.messages || []);

    // Recent activity summary (last 5 minutes)
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentMessages = allMessages.filter(
      (msg) => new Date(msg.createdAt) >= fiveMinAgo
    );
    const recentMeetingsCreated = allMeetings.filter(
      (m) => new Date(m.createdAt) >= fiveMinAgo
    );

    // Activity counts by type
    const messagesLast5min = recentMessages.length;
    const meetingsLast5min = recentMeetingsCreated.length;

    // Agent activity: unique agents with messages in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const activeAgentNames = new Set(
      allMessages
        .filter((msg) => new Date(msg.createdAt) >= oneHourAgo && msg.agentName !== "User")
        .map((msg) => msg.agentName)
    );
    const activeAgentsInLastHour = activeAgentNames.size;

    // Completion stats
    const totalMeetings = allMeetings.length;
    const completedMeetings = allMeetings.filter((m) => m.status === "completed").length;
    const draftMeetings = allMeetings.filter((m) => m.status === "draft").length;
    const runningMeetings = allMeetings.filter((m) => m.status === "running").length;

    // Pipeline stats
    let pipelineCount = 0;
    let pipelineTaskCount = 0;
    try {
      const pipelines = await db.pipeline.findMany();
      pipelineCount = pipelines.length;
      for (const p of pipelines) {
        const stages = await db.pipelineStage.findMany({ where: { pipelineId: p.id } });
        for (const s of stages) {
          const tasks = await db.pipelineTask.findMany({ where: { stageId: s.id } });
          pipelineTaskCount += tasks.length;
        }
      }
    } catch {
      // Pipeline tables may not exist
    }

    // Research notes count
    let researchNotesCount = 0;
    try {
      researchNotesCount = await db.meetingSummary.count();
    } catch {
      // Ignore if table doesn't exist
    }

    // Data freshness timestamps
    const now = new Date();
    const dataFreshness = {
      agents: agents.length > 0 ? agents[0]?.updatedAt?.toISOString() : null,
      meetings: allMeetings.length > 0 ? allMeetings[0]?.updatedAt?.toISOString() : null,
      notifications: notifications.length > 0 ? notifications[0]?.createdAt?.toISOString() : null,
    };

    // System uptime
    const uptimeMs = Date.now() - serverStartTime;
    const uptimeSeconds = Math.floor(uptimeMs / 1000);
    const uptimeFormatted = formatUptime(uptimeSeconds);

    // API health breakdown
    const dbQueryTime = responseTime;
    const healthStatus: "good" | "fair" | "poor" =
      dbQueryTime < 200 ? "good" : dbQueryTime < 500 ? "fair" : "poor";

    return NextResponse.json({
      // API health
      health: {
        status: healthStatus,
        responseTime: dbQueryTime,
        timestamp: now.toISOString(),
      },

      // Active sessions
      activeSessions,
      activeAgentsInLastHour,

      // Activity summary (last 5 minutes)
      recentActivity: {
        messagesLast5min,
        meetingsLast5min,
        activeAgentsInLastHour,
      },

      // Meeting stats
      meetingStats: {
        total: totalMeetings,
        completed: completedMeetings,
        running: runningMeetings,
        draft: draftMeetings,
        completionRate: totalMeetings > 0 ? Math.round((completedMeetings / totalMeetings) * 100) : 0,
      },

      // Message stats
      messageStats: {
        total: allMessages.length,
        avgPerMeeting: totalMeetings > 0 ? Math.round((allMessages.length / totalMeetings) * 10) / 10 : 0,
        recentCount: messagesLast5min,
      },

      // Counts
      counts: {
        agents: agents.length,
        meetings: totalMeetings,
        notifications: notifications.length,
        pipelines: pipelineCount,
        pipelineTasks: pipelineTaskCount,
        researchNotes: researchNotesCount,
      },

      // System uptime
      uptime: {
        seconds: uptimeSeconds,
        formatted: uptimeFormatted,
      },

      // Data freshness
      dataFreshness,
    });
  } catch (error) {
    const endTime = performance.now();
    const responseTime = Math.round((endTime - startTime) * 100) / 100;

    console.error("Live metrics error:", error);
    return NextResponse.json(
      {
        health: {
          status: "poor",
          responseTime,
          timestamp: new Date().toISOString(),
          error: "Failed to compute live metrics",
        },
        activeSessions: 0,
        activeAgentsInLastHour: 0,
        recentActivity: { messagesLast5min: 0, meetingsLast5min: 0, activeAgentsInLastHour: 0 },
        meetingStats: { total: 0, completed: 0, running: 0, draft: 0, completionRate: 0 },
        messageStats: { total: 0, avgPerMeeting: 0, recentCount: 0 },
        counts: { agents: 0, meetings: 0, notifications: 0, pipelines: 0, pipelineTasks: 0, researchNotes: 0 },
        uptime: { seconds: 0, formatted: "0s" },
        dataFreshness: { agents: null, meetings: null, notifications: null },
      },
      { status: 500 }
    );
  }
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}
