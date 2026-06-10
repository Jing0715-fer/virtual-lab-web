import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// ============================================================
// GET /api/visualization-data?meetingId=xxx&type=sankey|force-graph|treemap
// ============================================================

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get("meetingId");
    const type = searchParams.get("type") || "all";

    const [teamMeetings, individualMeetings, agents] = await Promise.all([
      db.teamMeeting.findMany({
        orderBy: { createdAt: "desc" },
        include: { teamLead: true, teamMembers: true, messages: true },
      }),
      db.individualMeeting.findMany({
        orderBy: { createdAt: "desc" },
        include: { teamMember: true, messages: true },
      }),
      db.agent.findMany(),
    ]);

    // Normalize meetings
    const allMeetings = [
      ...teamMeetings.map(m => ({
        id: m.id,
        type: "team" as const,
        status: m.status,
        agenda: m.agenda,
        saveName: m.saveName,
        messages: m.messages,
        participants: [m.teamLead.title, ...m.teamMembers.map(a => a.title)],
      })),
      ...individualMeetings.map(m => ({
        id: m.id,
        type: "individual" as const,
        status: m.status,
        agenda: m.agenda,
        saveName: m.saveName,
        messages: m.messages,
        participants: [m.teamMember.title],
      })),
    ];

    // Filter to specific meeting if requested
    const meetings = meetingId
      ? allMeetings.filter(m => m.id === meetingId)
      : allMeetings;

    const result: Record<string, unknown> = {};

    if (type === "sankey" || type === "all") {
      result.sankey = buildSankeyData(meetings, agents);
    }
    if (type === "force-graph" || type === "all") {
      result.forceGraph = buildForceGraphData(meetings, agents);
    }
    if (type === "treemap" || type === "all") {
      result.treemap = buildTreemapData(meetings, agents);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch visualization data:", error);
    return NextResponse.json(
      { error: "Failed to fetch visualization data" },
      { status: 500 }
    );
  }
}

// ============================================================
// Sankey Data: topics/questions → agents
// ============================================================

function buildSankeyData(meetings: any[], agents: any[]) {
  const agentMap = new Map(agents.map(a => [a.title, a]));

  // Input nodes: extract topics from agendas
  const topicMap = new Map<string, number>();
  const questionMap = new Map<string, number>();

  meetings.forEach(m => {
    // Extract keywords from agenda as topics
    const agendaWords = (m.agenda || "").toLowerCase().split(/\W+/).filter(w => w.length > 3);
    const keywords = agendaWords.filter(w =>
      !["the", "and", "for", "with", "from", "that", "this", "are", "was", "were", "have", "has"].includes(w)
    );
    const seen = new Set<string>();
    keywords.slice(0, 5).forEach(w => {
      if (!seen.has(w)) {
        topicMap.set(w, (topicMap.get(w) || 0) + 1);
        seen.add(w);
      }
    });
  });

  // Build input nodes from top topics
  const inputNodes = Array.from(topicMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word], i) => ({
      id: `topic-${word}`,
      label: word.charAt(0).toUpperCase() + word.slice(1),
      color: ["#10b981", "#06b6d4", "#f59e0b", "#ef4444", "#ec4899"][i],
    }));

  // Agent output nodes
  const agentActivity = new Map<string, number>();
  meetings.forEach(m => {
    (m.messages || []).forEach((msg: any) => {
      const name = msg.agentName;
      if (name && name !== "User") {
        agentActivity.set(name, (agentActivity.get(name) || 0) + 1);
      }
    });
  });

  const outputNodes = Array.from(agentActivity.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name], i) => {
      const agent = agentMap.get(name);
      return {
        id: `agent-${name}`,
        label: name,
        color: agent?.color || "#6366f1",
      };
    });

  // Build links: topic → agent based on co-occurrence
  const links: Array<{ source: string; target: string; value: number }> = [];
  const linkMap = new Map<string, number>();

  meetings.forEach(m => {
    const agendaWords = (m.agenda || "").toLowerCase().split(/\W+/).filter(w => w.length > 3);
    const topicKeywords = agendaWords.filter(w =>
      !["the", "and", "for", "with", "from", "that", "this"].includes(w)
    );

    const uniqueTopics = [...new Set(topicKeywords)].slice(0, 5);
    const topicIds = uniqueTopics.map(w => `topic-${w}`);

    const participatingAgents = new Set<string>();
    (m.messages || []).forEach((msg: any) => {
      if (msg.agentName && msg.agentName !== "User") {
        participatingAgents.add(`agent-${msg.agentName}`);
      }
    });

    topicIds.forEach(tid => {
      participatingAgents.forEach(aid => {
        const key = `${tid}|${aid}`;
        linkMap.set(key, (linkMap.get(key) || 0) + 1);
      });
    });
  });

  const allNodeIds = new Set([...inputNodes.map(n => n.id), ...outputNodes.map(n => n.id)]);
  linkMap.forEach((value, key) => {
    const [source, target] = key.split("|");
    if (allNodeIds.has(source) && allNodeIds.has(target)) {
      links.push({ source, target, value });
    }
  });

  // Fallback demo data if no real data
  if (links.length === 0) {
    const demoLinks = [
      { source: inputNodes[0]?.id || "input", target: outputNodes[0]?.id || "agent1", value: 25 },
      { source: inputNodes[0]?.id || "input", target: outputNodes[1]?.id || "agent2", value: 18 },
      { source: inputNodes[1]?.id || "input2", target: outputNodes[0]?.id || "agent1", value: 15 },
      { source: inputNodes[1]?.id || "input2", target: outputNodes[2]?.id || "agent3", value: 12 },
      { source: inputNodes[2]?.id || "input3", target: outputNodes[1]?.id || "agent2", value: 10 },
    ];
    return { nodes: [...inputNodes, ...outputNodes], links: demoLinks };
  }

  return { nodes: [...inputNodes, ...outputNodes], links };
}

// ============================================================
// Force Graph Data: agent collaboration network
// ============================================================

function buildForceGraphData(meetings: any[], agents: any[]) {
  const agentMap = new Map(agents.map(a => [a.title, a]));

  // Compute agent participation
  const agentMeetings = new Map<string, Set<string>>();
  const agentMessages = new Map<string, number>();

  meetings.forEach(m => {
    const participants = new Set<string>();
    (m.messages || []).forEach((msg: any) => {
      const name = msg.agentName;
      if (name && name !== "User") {
        participants.add(name);
        agentMessages.set(name, (agentMessages.get(name) || 0) + 1);
      }
    });
    participants.forEach(name => {
      if (!agentMeetings.has(name)) agentMeetings.set(name, new Set());
      agentMeetings.get(name)!.add(m.id);
    });
  });

  // Build nodes
  const nodeEntries = Array.from(agentMeetings.entries()).sort((a, b) => b[1].size - a[1].size);
  const nodes = nodeEntries.map(([name, meetingSet]) => {
    const agent = agentMap.get(name);
    return {
      id: `agent-${name}`,
      label: name,
      color: agent?.color || "#6366f1",
      size: Math.max(1, Math.min(3, meetingSet.size / 3)),
      meetings: meetingSet.size,
      messages: agentMessages.get(name) || 0,
    };
  });

  // Build edges (shared meetings)
  const edges: Array<{ source: string; target: string; weight: number }> = [];
  for (let i = 0; i < nodeEntries.length; i++) {
    for (let j = i + 1; j < nodeEntries.length; j++) {
      const setA = nodeEntries[i][1];
      const setB = nodeEntries[j][1];
      const shared = [...setA].filter(id => setB.has(id)).length;
      if (shared > 0) {
        edges.push({
          source: `agent-${nodeEntries[i][0]}`,
          target: `agent-${nodeEntries[j][0]}`,
          weight: Math.min(shared, 5),
        });
      }
    }
  }

  return { nodes, edges };
}

// ============================================================
// Treemap Data: topic distribution by meeting type → agent
// ============================================================

function buildTreemapData(meetings: any[], agents: any[]) {
  const agentMap = new Map(agents.map(a => [a.title, a]));

  // Group by meeting type
  const teamMeetings = meetings.filter(m => m.type === "team");
  const indivMeetings = meetings.filter(m => m.type === "individual");

  function buildLevel(meetings: any[]) {
    const agentData = new Map<string, { messages: number; topics: Map<string, number> }>();

    meetings.forEach(m => {
      (m.messages || []).forEach((msg: any) => {
        const name = msg.agentName;
        if (!name || name === "User") return;

        if (!agentData.has(name)) agentData.set(name, { messages: 0, topics: new Map() });
        const entry = agentData.get(name)!;
        entry.messages++;

        // Extract topic keywords from message
        const words = (msg.message || "").toLowerCase().split(/\W+/).filter(w => w.length > 4);
        const topWords = words.slice(0, 3);
        topWords.forEach(w => {
          entry.topics.set(w, (entry.topics.get(w) || 0) + 1);
        });
      });
    });

    return Array.from(agentData.entries())
      .sort((a, b) => b[1].messages - a[1].messages)
      .slice(0, 6)
      .map(([name, data]) => {
        const agent = agentMap.get(name);
        const topTopics = Array.from(data.topics.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4);

        return {
          name,
          value: data.messages,
          color: agent?.color || "#6366f1",
          children: topTopics.length > 0
            ? topTopics.map(([word, count]) => ({
                name: word.charAt(0).toUpperCase() + word.slice(1),
                value: count,
                color: agent?.color || "#6366f1",
              }))
            : undefined,
        };
      });
  }

  const children = [
    {
      name: "Team Meetings",
      value: teamMeetings.reduce((s, m) => s + m.messages.length, 0),
      color: "#8b5cf6",
      children: buildLevel(teamMeetings),
    },
    {
      name: "Individual Meetings",
      value: indivMeetings.reduce((s, m) => s + m.messages.length, 0),
      color: "#06b6d4",
      children: buildLevel(indivMeetings),
    },
  ].filter(c => c.value > 0);

  const totalValue = children.reduce((s, c) => s + c.value, 0);

  return {
    name: "Research Topics",
    value: totalValue,
    color: "#10b981",
    children: children.length > 0 ? children : undefined,
  };
}
