import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { hermesChatCompletion } from "@/lib/hermes";
import { safeParseJsonArray } from "@/lib/parse-utils";
import {
  generateAgentSystemPrompt,
  teamLeadInitialPrompt,
  teamLeadIntermediatePrompt,
  teamLeadFinalPrompt,
  teamMemberPrompt,
  individualAgentPrompt,
  individualCriticPrompt,
  summarySystemPrompt,
  generateSummaryPrompt,
  discussionToConversation,
  SCIENTIFIC_CRITIC,
} from "@/lib/virtual-lab";

// POST /api/meetings/[id]/run - Run a meeting (async, returns 202 immediately)
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if this is a team or individual meeting
    const teamMeeting = await db.teamMeeting.findUnique({
      where: { id },
      include: {
        teamLead: true,
        teamMembers: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    if (teamMeeting) {
      // Check if meeting is already running or completed
      if (teamMeeting.status === "running") {
        return NextResponse.json(
          { error: "Meeting is already running" },
          { status: 409 }
        );
      }
      if (teamMeeting.status === "completed") {
        return NextResponse.json(
          { error: "Meeting is already completed. Create a new meeting to run again." },
          { status: 409 }
        );
      }
      if (teamMeeting.messages && teamMeeting.messages.length > 0) {
        return NextResponse.json(
          { error: "Meeting already has discussion messages. Create a new meeting to run again." },
          { status: 409 }
        );
      }

      // Set status to running
      await db.teamMeeting.update({
        where: { id },
        data: { status: "running" },
      });

      // Create notification: meeting started
      await db.notification.create({
        data: {
          type: "meeting_started",
          title: "Team Meeting Started",
          message: `Team meeting "${teamMeeting.saveName || teamMeeting.agenda.slice(0, 50)}" is now running`,
          link: "#history",
        }
      }).catch(() => {});

      // Fire and forget - start background execution
      executeTeamMeetingInBackground(id).catch(console.error);

      // Return immediately
      return NextResponse.json(
        { status: "running", meetingId: id },
        { status: 202 }
      );
    }

    const individualMeeting = await db.individualMeeting.findUnique({
      where: { id },
      include: {
        teamMember: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    if (individualMeeting) {
      // Check if meeting is already running or completed
      if (individualMeeting.status === "running") {
        return NextResponse.json(
          { error: "Meeting is already running" },
          { status: 409 }
        );
      }
      if (individualMeeting.status === "completed") {
        return NextResponse.json(
          { error: "Meeting is already completed. Create a new meeting to run again." },
          { status: 409 }
        );
      }
      if (individualMeeting.messages && individualMeeting.messages.length > 0) {
        return NextResponse.json(
          { error: "Meeting already has discussion messages. Create a new meeting to run again." },
          { status: 409 }
        );
      }

      // Set status to running
      await db.individualMeeting.update({
        where: { id },
        data: { status: "running" },
      });

      // Create notification: meeting started
      await db.notification.create({
        data: {
          type: "meeting_started",
          title: "Individual Meeting Started",
          message: `Individual meeting "${individualMeeting.saveName || individualMeeting.agenda.slice(0, 50)}" is now running`,
          link: "#history",
        }
      }).catch(() => {});

      // Fire and forget - start background execution
      executeIndividualMeetingInBackground(id).catch(console.error);

      // Return immediately
      return NextResponse.json(
        { status: "running", meetingId: id },
        { status: 202 }
      );
    }

    return NextResponse.json(
      { error: "Meeting not found" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Failed to start meeting:", error);
    return NextResponse.json(
      { error: "Failed to start meeting" },
      { status: 500 }
    );
  }
}

// ============================================================
// Background Team Meeting Execution
// ============================================================

async function executeTeamMeetingInBackground(meetingId: string) {
  try {
    // Re-fetch meeting with all relations
    const meeting = await db.teamMeeting.findUnique({
      where: { id: meetingId },
      include: {
        teamLead: true,
        teamMembers: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!meeting || !meeting.teamLead) {
      console.error("Meeting not found or missing team lead");
      await db.teamMeeting.update({
        where: { id: meetingId },
        data: { status: "draft" },
      });
      return;
    }

    const numRounds = meeting.numRounds;
    const allMessages: { id: string; agentName: string; message: string; roundIndex: number }[] = [];

    for (let round = 0; round < numRounds; round++) {
      // --- Team Lead speaks ---
      const leadSystemPrompt = generateAgentSystemPrompt(meeting.teamLead);
      let leadUserPrompt: string;

      if (round === 0) {
        leadUserPrompt = teamLeadInitialPrompt(meeting.agenda);
      } else if (round === numRounds - 1) {
        leadUserPrompt = teamLeadFinalPrompt();
      } else {
        leadUserPrompt = teamLeadIntermediatePrompt(round + 1, numRounds);
      }

      // Add agenda questions and rules context
      const questions = safeParseJsonArray(meeting.agendaQuestions) as string[];
      const rules = safeParseJsonArray(meeting.agendaRules) as string[];
      if (questions.length > 0) {
        leadUserPrompt += `\n\nKey Questions:\n${questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`;
      }
      if (rules.length > 0) {
        leadUserPrompt += `\n\nRules:\n${rules.map((r, i) => `${i + 1}. ${r}`).join("\n")}`;
      }

      // Build conversation context from previous messages
      const prevConversation = discussionToConversation(
        allMessages.map((m) => ({ agentName: m.agentName, message: m.message })),
        meeting.teamLead.title
      );

      const leadMessages = [
        { role: "system" as const, content: leadSystemPrompt },
        ...prevConversation,
        { role: "user" as const, content: leadUserPrompt },
      ];

      const leadCompletion = await hermesChatCompletion({
        messages: leadMessages,
        thinking: { type: "disabled" },
      });

      const leadResponse = leadCompletion.choices[0]?.message?.content || "";

      // Save lead message to DB
      const leadMsg = await db.discussionMessage.create({
        data: {
          agentName: meeting.teamLead.title,
          message: leadResponse,
          roundIndex: round,
          teamMeetingId: meeting.id,
        },
      });
      allMessages.push({
        id: leadMsg.id,
        agentName: meeting.teamLead.title,
        message: leadResponse,
        roundIndex: round,
      });

      // --- Each team member responds ---
      for (const member of meeting.teamMembers) {
        const memberSystemPrompt = generateAgentSystemPrompt(member);
        const memberUserPrompt = teamMemberPrompt(round + 1, numRounds);

        const memberPrevConversation = discussionToConversation(
          allMessages.map((m) => ({ agentName: m.agentName, message: m.message })),
          member.title
        );

        const memberMessages = [
          { role: "system" as const, content: memberSystemPrompt },
          ...memberPrevConversation,
          { role: "user" as const, content: memberUserPrompt },
        ];

        const memberCompletion = await hermesChatCompletion({
          messages: memberMessages,
          thinking: { type: "disabled" },
        });

        const memberResponse =
          memberCompletion.choices[0]?.message?.content || "";

        const memberMsg = await db.discussionMessage.create({
          data: {
            agentName: member.title,
            message: memberResponse,
            roundIndex: round,
            teamMeetingId: meeting.id,
          },
        });
        allMessages.push({
          id: memberMsg.id,
          agentName: member.title,
          message: memberResponse,
          roundIndex: round,
        });
      }
    }

    // Generate summary using the team lead
    const summaryPrompt = generateSummaryPrompt(
      "team",
      meeting.agenda,
      allMessages
    );

    const summaryCompletion = await hermesChatCompletion({
      messages: [
        { role: "system", content: summarySystemPrompt() },
        { role: "user", content: summaryPrompt },
      ],
      thinking: { type: "disabled" },
    });

    const summary =
      summaryCompletion.choices[0]?.message?.content || "";

    // Update meeting with summary and completed status
    await db.teamMeeting.update({
      where: { id: meeting.id },
      data: { status: "completed", summary },
    });

    // Create notification: meeting completed
    await db.notification.create({
      data: {
        type: "meeting_completed",
        title: "Team Meeting Completed",
        message: `Team meeting "${meeting.saveName || meeting.agenda.slice(0, 50)}" has finished with a summary`,
        link: "#history",
      }
    }).catch(() => {});
  } catch (error) {
    console.error("Error during team meeting execution:", error);
    // Reset status to draft on error
    try {
      await db.teamMeeting.update({
        where: { id: meetingId },
        data: { status: "draft" },
      });
    } catch (updateError) {
      console.error("Failed to reset meeting status:", updateError);
    }
  }
}

// ============================================================
// Background Individual Meeting Execution
// ============================================================

async function executeIndividualMeetingInBackground(meetingId: string) {
  try {
    // Re-fetch meeting with all relations
    const meeting = await db.individualMeeting.findUnique({
      where: { id: meetingId },
      include: {
        teamMember: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!meeting || !meeting.teamMember) {
      console.error("Meeting not found or missing team member");
      await db.individualMeeting.update({
        where: { id: meetingId },
        data: { status: "draft" },
      });
      return;
    }

    const numRounds = 3; // Default rounds for individual meetings
    const allMessages: { id: string; agentName: string; message: string; roundIndex: number }[] = [];

    const agentSystemPrompt = generateAgentSystemPrompt(meeting.teamMember);
    const criticSystemPrompt = generateAgentSystemPrompt(SCIENTIFIC_CRITIC);

    for (let round = 0; round < numRounds; round++) {
      // Agent presents
      let agentUserPrompt =
        round === 0
          ? individualAgentPrompt(meeting.agenda)
          : `Please respond to the critic's feedback. Refine your position and address any errors identified.`;

      // Add agenda questions and rules context on first round
      if (round === 0) {
        const questions = safeParseJsonArray(meeting.agendaQuestions) as string[];
        const rules = safeParseJsonArray(meeting.agendaRules) as string[];
        if (questions.length > 0) {
          agentUserPrompt += `\n\nKey Questions:\n${questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`;
        }
        if (rules.length > 0) {
          agentUserPrompt += `\n\nRules:\n${rules.map((r, i) => `${i + 1}. ${r}`).join("\n")}`;
        }
      }

      const agentPrevConversation = discussionToConversation(
        allMessages.map((m) => ({ agentName: m.agentName, message: m.message })),
        meeting.teamMember.title
      );

      const agentMessages = [
        { role: "system" as const, content: agentSystemPrompt },
        ...agentPrevConversation,
        { role: "user" as const, content: agentUserPrompt },
      ];

      const agentCompletion = await hermesChatCompletion({
        messages: agentMessages,
        thinking: { type: "disabled" },
      });

      const agentResponse =
        agentCompletion.choices[0]?.message?.content || "";

      const agentMsg = await db.discussionMessage.create({
        data: {
          agentName: meeting.teamMember.title,
          message: agentResponse,
          roundIndex: round * 2,
          individualMeetingId: meeting.id,
        },
      });
      allMessages.push({
        id: agentMsg.id,
        agentName: meeting.teamMember.title,
        message: agentResponse,
        roundIndex: round * 2,
      });

      // Critic responds
      const criticUserPrompt = individualCriticPrompt();
      const criticPrevConversation = discussionToConversation(
        allMessages.map((m) => ({ agentName: m.agentName, message: m.message })),
        SCIENTIFIC_CRITIC.title
      );

      const criticMessages = [
        { role: "system" as const, content: criticSystemPrompt },
        ...criticPrevConversation,
        { role: "user" as const, content: criticUserPrompt },
      ];

      const criticCompletion = await hermesChatCompletion({
        messages: criticMessages,
        thinking: { type: "disabled" },
      });

      const criticResponse =
        criticCompletion.choices[0]?.message?.content || "";

      const criticMsg = await db.discussionMessage.create({
        data: {
          agentName: SCIENTIFIC_CRITIC.title,
          message: criticResponse,
          roundIndex: round * 2 + 1,
          individualMeetingId: meeting.id,
        },
      });
      allMessages.push({
        id: criticMsg.id,
        agentName: SCIENTIFIC_CRITIC.title,
        message: criticResponse,
        roundIndex: round * 2 + 1,
      });
    }

    // Generate summary
    const summaryPrompt = generateSummaryPrompt(
      "individual",
      meeting.agenda,
      allMessages
    );

    const summaryCompletion = await hermesChatCompletion({
      messages: [
        { role: "system", content: summarySystemPrompt() },
        { role: "user", content: summaryPrompt },
      ],
      thinking: { type: "disabled" },
    });

    const summary =
      summaryCompletion.choices[0]?.message?.content || "";

    // Update meeting with summary and completed status
    await db.individualMeeting.update({
      where: { id: meeting.id },
      data: { status: "completed", summary },
    });

    // Create notification: meeting completed
    await db.notification.create({
      data: {
        type: "meeting_completed",
        title: "Individual Meeting Completed",
        message: `Individual meeting "${meeting.saveName || meeting.agenda.slice(0, 50)}" has finished with a summary`,
        link: "#history",
      }
    }).catch(() => {});
  } catch (error) {
    console.error("Error during individual meeting execution:", error);
    // Reset status to draft on error
    try {
      await db.individualMeeting.update({
        where: { id: meetingId },
        data: { status: "draft" },
      });
    } catch (updateError) {
      console.error("Failed to reset meeting status:", updateError);
    }
  }
}
