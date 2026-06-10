import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { safeParseJsonArray } from "@/lib/parse-utils";

// GET /api/export/pdf?meetingId=xxx - Return a printable HTML page for a meeting report
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get("meetingId");

    if (!meetingId) {
      return NextResponse.json(
        { error: "meetingId is required" },
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
    let teamLead: { title: string; color: string; icon: string } | null = null;
    let teamMembers: { title: string; color: string; icon: string }[] = [];
    let numRounds: number | null = null;

    if (meeting) {
      meetingType = "team";
      teamLead = meeting.teamLead
        ? { title: meeting.teamLead.title, color: meeting.teamLead.color, icon: meeting.teamLead.icon }
        : null;
      teamMembers = meeting.teamMembers.map((m) => ({
        title: m.title,
        color: m.color,
        icon: m.icon,
      }));
      numRounds = meeting.numRounds;
    } else {
      const indivMeeting = await db.individualMeeting.findUnique({
        where: { id: meetingId },
        include: {
          teamMember: true,
          messages: { orderBy: { createdAt: "asc" } },
        },
      });

      if (indivMeeting) {
        meeting = indivMeeting as unknown as typeof meeting;
        meetingType = "individual";
        teamMembers = indivMeeting.teamMember
          ? [{ title: indivMeeting.teamMember.title, color: indivMeeting.teamMember.color, icon: indivMeeting.teamMember.icon }]
          : [];
      }
    }

    if (!meeting) {
      return NextResponse.json(
        { error: "Meeting not found" },
        { status: 404 }
      );
    }

    const m = meeting;
    const agendaQuestions: string[] = safeParseJsonArray(m.agendaQuestions as string) as string[];
    const agendaRules: string[] = safeParseJsonArray(m.agendaRules as string) as string[];

    // Build participants list
    const participantNames = [...new Set(m.messages.map((msg) => msg.agentName))];
    const allParticipants = [...new Set([
      ...(teamLead ? [teamLead.title] : []),
      ...teamMembers.map((tm) => tm.title),
      ...participantNames,
    ])];

    // Build HTML
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${m.saveName || "Meeting Report"} — Virtual Lab</title>
  <style>
    @page {
      size: A4;
      margin: 2cm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #1a1a1a;
      background: #fff;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    h1, h2, h3, h4 {
      font-family: 'Helvetica Neue', 'Arial', sans-serif;
      color: #0f172a;
      page-break-after: avoid;
    }
    h1 { font-size: 24pt; margin-bottom: 8px; border-bottom: 3px solid #10b981; padding-bottom: 8px; }
    h2 { font-size: 16pt; margin-top: 28px; margin-bottom: 10px; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    h3 { font-size: 13pt; margin-top: 20px; margin-bottom: 8px; color: #334155; }
    p { margin-bottom: 10px; }
    .meta { font-size: 10pt; color: #64748b; margin-bottom: 20px; }
    .meta span { margin-right: 16px; }
    .badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 9pt;
      font-weight: 600;
      font-family: 'Helvetica Neue', 'Arial', sans-serif;
    }
    .badge-team { background: #d1fae5; color: #065f46; }
    .badge-individual { background: #cffafe; color: #155e75; }
    .badge-status { background: #f1f5f9; color: #475569; }
    .toc { margin: 20px 0 30px; padding: 16px 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
    .toc h2 { border: none; margin-top: 0; font-size: 14pt; }
    .toc ol { padding-left: 24px; }
    .toc li { margin-bottom: 4px; font-size: 11pt; }
    .toc a { color: #10b981; text-decoration: none; }
    .toc a:hover { text-decoration: underline; }
    .section { page-break-inside: avoid; margin-bottom: 20px; }
    .agenda-box { background: #f8fafc; border-left: 4px solid #10b981; padding: 12px 16px; margin: 12px 0; border-radius: 0 8px 8px 0; }
    .question-list, .rule-list { padding-left: 24px; margin: 8px 0; }
    .question-list li, .rule-list li { margin-bottom: 6px; font-size: 11pt; }
    .message-block {
      margin: 12px 0;
      padding: 10px 14px;
      border-radius: 8px;
      page-break-inside: avoid;
    }
    .message-agent { background: #f1f5f9; border-left: 3px solid #94a3b8; }
    .message-user { background: #ecfdf5; border-left: 3px solid #10b981; }
    .message-header { font-family: 'Helvetica Neue', 'Arial', sans-serif; font-size: 10pt; font-weight: 600; color: #475569; margin-bottom: 4px; }
    .message-time { font-size: 8pt; color: #94a3b8; margin-left: 8px; }
    .message-body { font-size: 11pt; white-space: pre-wrap; word-wrap: break-word; }
    .round-divider { text-align: center; margin: 24px 0 16px; font-family: 'Helvetica Neue', 'Arial', sans-serif; }
    .round-divider span {
      display: inline-block;
      background: #f1f5f9;
      padding: 4px 16px;
      border-radius: 16px;
      font-size: 10pt;
      font-weight: 600;
      color: #475569;
      letter-spacing: 0.5px;
    }
    .summary-box {
      background: linear-gradient(135deg, #ecfdf5, #f0fdfa);
      border: 1px solid #a7f3d0;
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
    }
    .summary-box h3 { color: #065f46; margin-top: 0; }
    .participants-list { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0; }
    .participant-chip {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 4px 12px; border-radius: 16px;
      font-size: 10pt; font-family: 'Helvetica Neue', 'Arial', sans-serif;
      background: #f1f5f9; color: #334155;
    }
    .participant-dot { width: 8px; height: 8px; border-radius: 50%; }
    .page-header {
      position: running(header);
      font-size: 8pt;
      color: #94a3b8;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      margin-bottom: 20px;
    }
    .page-footer {
      font-size: 8pt;
      color: #94a3b8;
      text-align: center;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
      margin-top: 40px;
    }
    @media print {
      body { padding: 0; max-width: none; }
      .no-print { display: none; }
      .section { page-break-inside: avoid; }
      h2 { page-break-after: avoid; }
    }
    .print-btn {
      position: fixed; bottom: 24px; right: 24px;
      background: #10b981; color: white;
      border: none; border-radius: 8px;
      padding: 12px 24px; font-size: 14px; font-weight: 600;
      cursor: pointer; font-family: 'Helvetica Neue', 'Arial', sans-serif;
      box-shadow: 0 4px 12px rgba(16,185,129,0.3);
      z-index: 999;
    }
    .print-btn:hover { background: #059669; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">🖨 Print Report</button>

  <!-- Title Page -->
  <div class="section" style="margin-bottom: 40px;">
    <h1>${m.saveName || "Meeting Report"}</h1>
    <div class="meta">
      <span class="badge badge-${meetingType}">${meetingType === "team" ? "Team Meeting" : "Individual Meeting"}</span>
      <span class="badge badge-status">${m.status}</span>
      <span>📅 ${new Date(m.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
      ${numRounds ? `<span>🔄 ${numRounds} round${numRounds > 1 ? "s" : ""}</span>` : ""}
      <span>🌡 Temperature: ${m.temperature}</span>
    </div>
    <p style="color:#64748b; font-size: 10pt;">Generated by Virtual Lab — AI-Powered Research Collaboration Platform</p>
  </div>

  <!-- Table of Contents -->
  <div class="toc">
    <h2>Table of Contents</h2>
    <ol>
      <li><a href="#agenda">Agenda</a></li>
      ${agendaQuestions.length > 0 ? "<li><a href=\"#questions\">Agenda Questions</a></li>" : ""}
      ${agendaRules.length > 0 ? "<li><a href=\"#rules\">Agenda Rules</a></li>" : ""}
      <li><a href="#discussion">Discussion Transcript</a></li>
      ${m.summary ? "<li><a href=\"#summary\">Summary</a></li>" : ""}
      <li><a href="#participants">Participants</a></li>
    </ol>
  </div>

  <!-- Agenda -->
  <div class="section" id="agenda">
    <h2>1. Agenda</h2>
    <div class="agenda-box">
      <p>${(m.agenda || "").replace(/\n/g, "<br/>")}</p>
    </div>
  </div>

  ${agendaQuestions.length > 0 ? `
  <!-- Questions -->
  <div class="section" id="questions">
    <h2>2. Agenda Questions</h2>
    <ol class="question-list">
      ${agendaQuestions.map((q: string) => `<li>${q}</li>`).join("\n      ")}
    </ol>
  </div>
  ` : ""}

  ${agendaRules.length > 0 ? `
  <!-- Rules -->
  <div class="section" id="rules">
    <h2>${agendaQuestions.length > 0 ? "3" : "2"}. Agenda Rules</h2>
    <ol class="rule-list">
      ${agendaRules.map((r: string) => `<li>${r}</li>`).join("\n      ")}
    </ol>
  </div>
  ` : ""}

  <!-- Discussion -->
  <div class="section" id="discussion">
    <h2>${[1, agendaQuestions.length > 0 ? 2 : null, agendaRules.length > 0 ? 3 : null].filter(Boolean).length + 1}. Discussion Transcript</h2>
    ${(() => {
      let lastRound = -1;
      let html = "";
      for (const msg of m.messages) {
        if (msg.roundIndex !== lastRound) {
          lastRound = msg.roundIndex;
          html += `<div class="round-divider"><span>Round ${msg.roundIndex + 1}</span></div>`;
        }
        const isUser = msg.agentName === "User";
        html += `
      <div class="message-block ${isUser ? "message-user" : "message-agent"}">
        <div class="message-header">${msg.agentName}<span class="message-time">${new Date(msg.createdAt).toLocaleTimeString()}</span></div>
        <div class="message-body">${msg.message.replace(/\n/g, "<br/>")}</div>
      </div>`;
      }
      return html;
    })()}
    ${m.messages.length === 0 ? '<p style="color:#94a3b8; font-style:italic;">No discussion messages yet.</p>' : ""}
  </div>

  ${m.summary ? `
  <!-- Summary -->
  <div class="section" id="summary">
    <h2>Summary</h2>
    <div class="summary-box">
      <h3>Meeting Summary</h3>
      <p>${(m.summary || "").replace(/\n/g, "<br/>")}</p>
    </div>
  </div>
  ` : ""}

  <!-- Participants -->
  <div class="section" id="participants">
    <h2>Participants</h2>
    <div class="participants-list">
      ${allParticipants.map((name: string) => {
        const agent = teamMembers.find((tm) => tm.title === name) ||
          (teamLead && teamLead.title === name ? teamLead : null);
        const color = agent ? agent.color : "#64748b";
        return `<div class="participant-chip"><div class="participant-dot" style="background:${color}"></div>${name}</div>`;
      }).join("\n      ")}
    </div>
    ${teamLead ? `<p style="margin-top:12px; font-size:10pt; color:#475569;"><strong>Team Lead:</strong> ${teamLead.title}</p>` : ""}
  </div>

  <!-- Footer -->
  <div class="page-footer">
    Virtual Lab Report — ${m.saveName || "Meeting"} — Generated ${new Date().toLocaleDateString()}
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("PDF export failed:", error);
    return NextResponse.json(
      { error: "PDF export failed" },
      { status: 500 }
    );
  }
}
