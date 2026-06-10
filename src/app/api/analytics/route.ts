import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// GET /api/analytics - Return aggregated analytics data
export async function GET() {
  try {
    const [teamMeetings, individualMeetings, agents] = await Promise.all([
      db.teamMeeting.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          teamLead: true,
          teamMembers: true,
          messages: true,
        },
      }),
      db.individualMeeting.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          teamMember: true,
          messages: true,
        },
      }),
      db.agent.findMany(),
    ]);

    // All messages
    const allMessages = [
      ...teamMeetings.flatMap((m) => m.messages),
      ...individualMeetings.flatMap((m) => m.messages),
    ];

    // Total messages
    const totalMessages = allMessages.length;

    // Avg messages per meeting
    const totalMeetings = teamMeetings.length + individualMeetings.length;
    const avgMessagesPerMeeting =
      totalMeetings > 0 ? Math.round((totalMessages / totalMeetings) * 10) / 10 : 0;

    // Meetings by day (last 7 days)
    const now = new Date();
    const meetingsByDay: { date: string; team: number; individual: number }[] = [];
    for (let i = 6; i >= 0; i--) {
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

      meetingsByDay.push({
        date: dateStr,
        team: teamCount,
        individual: individualCount,
      });
    }

    // Agent participation count
    const agentParticipationMap = new Map<string, number>();
    for (const agent of agents) {
      const count = allMessages.filter((m) => m.agentName === agent.title).length;
      if (count > 0) {
        agentParticipationMap.set(agent.title, count);
      }
    }
    // Also include any agents in messages that might not be in the agents table
    for (const msg of allMessages) {
      if (msg.agentName !== "User" && !agentParticipationMap.has(msg.agentName)) {
        const count = allMessages.filter((m) => m.agentName === msg.agentName).length;
        agentParticipationMap.set(msg.agentName, count);
      }
    }
    const agentParticipation = Array.from(agentParticipationMap.entries())
      .map(([agentName, count]) => ({ agentName, count }))
      .sort((a, b) => b.count - a.count);

    // Meeting type ratio
    const meetingTypeRatio = {
      team: teamMeetings.length,
      individual: individualMeetings.length,
    };

    // ============================================================
    // Collaboration Network: nodes (agents) and edges (shared meetings)
    // ============================================================
    const agentMeetingMap = new Map<string, Set<string>>();
    for (const agent of agents) {
      const meetingIds = new Set<string>();
      // Team meetings where agent is lead or member
      for (const tm of teamMeetings) {
        if (tm.teamLeadId === agent.id || tm.teamMembers.some((m) => m.id === agent.id)) {
          meetingIds.add(tm.id);
        }
      }
      // Individual meetings where agent is the team member
      for (const im of individualMeetings) {
        if (im.teamMemberId === agent.id) {
          meetingIds.add(im.id);
        }
      }
      // Also check by agent name in messages
      for (const tm of teamMeetings) {
        if (tm.messages.some((msg) => msg.agentName === agent.title)) {
          meetingIds.add(tm.id);
        }
      }
      for (const im of individualMeetings) {
        if (im.messages.some((msg) => msg.agentName === agent.title)) {
          meetingIds.add(im.id);
        }
      }
      agentMeetingMap.set(agent.id, meetingIds);
    }

    const collaborationNodes = agents.map((agent) => ({
      id: agent.id,
      name: agent.title,
      meetings: agentMeetingMap.get(agent.id)?.size || 0,
      color: agent.color,
    }));

    // Edges: pairs of agents that share meetings, weight = number of shared meetings
    const edgeMap = new Map<string, { source: string; target: string; weight: number; sharedMeetingIds: string[] }>();
    for (let i = 0; i < agents.length; i++) {
      for (let j = i + 1; j < agents.length; j++) {
        const a = agents[i];
        const b = agents[j];
        const aMeetings = agentMeetingMap.get(a.id) || new Set<string>();
        const bMeetings = agentMeetingMap.get(b.id) || new Set<string>();
        const shared = [...aMeetings].filter((id) => bMeetings.has(id));
        if (shared.length > 0) {
          const key = `${a.id}-${b.id}`;
          edgeMap.set(key, {
            source: a.title,
            target: b.title,
            weight: shared.length,
            sharedMeetingIds: shared,
          });
        }
      }
    }
    const collaborationEdges = Array.from(edgeMap.values());

    const collaborationNetwork = {
      nodes: collaborationNodes,
      edges: collaborationEdges,
    };

    // ============================================================
    // Message Timeline: hour × agent → count
    // ============================================================
    const timelineMap = new Map<string, number>();
    for (const msg of allMessages) {
      if (msg.agentName === "User") continue;
      const hour = new Date(msg.createdAt).getHours();
      const key = `${hour}-${msg.agentName}`;
      timelineMap.set(key, (timelineMap.get(key) || 0) + 1);
    }
    const messageTimeline = Array.from(timelineMap.entries()).map(([key, count]) => {
      const [hourStr, ...nameParts] = key.split("-");
      return {
        hour: parseInt(hourStr, 10),
        agentName: nameParts.join("-"),
        count,
      };
    });

    // ============================================================
    // Workflow Progress: how many meetings addressed each step
    // ============================================================
    const workflowSteps = ["ESM", "AlphaFold", "Rosetta", "Combine", "Select"];
    const workflowKeywords: Record<string, string[]> = {
      ESM: ["esm", "sequence generation", "language model", "evolutionary scale modeling", "protein sequence"],
      AlphaFold: ["alphafold", "structure prediction", "multimer", "folding", "3d structure"],
      Rosetta: ["rosetta", "energy scoring", "ddg", "energy function", "minimization"],
      Combine: ["combine", "rank", "score", "aggregate", "merge", "integrate"],
      Select: ["select", "final selection", "candidate", "choose", "pick", "best nanobody"],
    };

    const workflowProgress: Record<string, number> = {};
    const completedMeetingMessages = [
      ...teamMeetings.filter((m) => m.status === "completed").flatMap((m) => m.messages),
      ...individualMeetings.filter((m) => m.status === "completed").flatMap((m) => m.messages),
    ];
    const completedCount = teamMeetings.filter((m) => m.status === "completed").length +
      individualMeetings.filter((m) => m.status === "completed").length;

    for (const step of workflowSteps) {
      const keywords = workflowKeywords[step];
      let mentions = 0;
      for (const msg of completedMeetingMessages) {
        const lower = msg.message.toLowerCase();
        if (keywords.some((kw) => lower.includes(kw))) {
          mentions++;
        }
      }
      // Progress is based on proportion of meetings that mention this step
      // Cap at 1.0
      workflowProgress[step] = completedCount > 0
        ? Math.min(1, Math.round((mentions / (completedCount * 3)) * 10) / 10)
        : 0;
    }

    return NextResponse.json({
      meetingsByDay,
      agentParticipation,
      meetingTypeRatio,
      totalMessages,
      avgMessagesPerMeeting,
      collaborationNetwork,
      messageTimeline,
      workflowProgress,
    });
  } catch (error) {
    console.error("Failed to fetch analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
