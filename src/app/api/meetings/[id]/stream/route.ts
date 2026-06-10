import { db } from "@/lib/db";

// GET /api/meetings/[id]/stream - SSE endpoint for real-time meeting updates
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Track last known state to detect changes
      let lastMessageCount = 0;
      let lastStatus = "";
      let lastSummary: string | null = null;
      let meetingType: "team" | "individual" | null = null;
      let closed = false;

      const sendEvent = (data: Record<string, unknown>) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // Stream already closed
          closed = true;
        }
      };

      // Determine meeting type and send initial state
      try {
        const teamMeeting = await db.teamMeeting.findUnique({
          where: { id },
          include: {
            messages: { orderBy: { createdAt: "asc" } },
          },
        });

        if (teamMeeting) {
          meetingType = "team";
          lastStatus = teamMeeting.status;
          lastMessageCount = teamMeeting.messages.length;
          lastSummary = teamMeeting.summary;

          // Send initial state
          sendEvent({
            type: "status",
            status: teamMeeting.status,
            meetingType: "team",
          });

          // Send existing messages
          for (const msg of teamMeeting.messages) {
            sendEvent({
              type: "message",
              id: msg.id,
              agentName: msg.agentName,
              message: msg.message,
              roundIndex: msg.roundIndex,
              createdAt: msg.createdAt,
            });
          }

          // If already completed, send summary and close
          if (teamMeeting.status === "completed" && teamMeeting.summary) {
            sendEvent({
              type: "summary",
              summary: teamMeeting.summary,
            });
            sendEvent({ type: "done" });
            controller.close();
            closed = true;
            return;
          }
        } else {
          const individualMeeting = await db.individualMeeting.findUnique({
            where: { id },
            include: {
              messages: { orderBy: { createdAt: "asc" } },
            },
          });

          if (individualMeeting) {
            meetingType = "individual";
            lastStatus = individualMeeting.status;
            lastMessageCount = individualMeeting.messages.length;
            lastSummary = individualMeeting.summary;

            sendEvent({
              type: "status",
              status: individualMeeting.status,
              meetingType: "individual",
            });

            for (const msg of individualMeeting.messages) {
              sendEvent({
                type: "message",
                id: msg.id,
                agentName: msg.agentName,
                message: msg.message,
                roundIndex: msg.roundIndex,
                createdAt: msg.createdAt,
              });
            }

            if (individualMeeting.status === "completed" && individualMeeting.summary) {
              sendEvent({
                type: "summary",
                summary: individualMeeting.summary,
              });
              sendEvent({ type: "done" });
              controller.close();
              closed = true;
              return;
            }
          } else {
            sendEvent({ type: "error", error: "Meeting not found" });
            controller.close();
            closed = true;
            return;
          }
        }
      } catch (error) {
        sendEvent({ type: "error", error: String(error) });
        controller.close();
        closed = true;
        return;
      }

      // Poll for changes every 2 seconds
      const pollInterval = setInterval(async () => {
        if (closed) {
          clearInterval(pollInterval);
          return;
        }

        try {
          let currentStatus: string;
          let currentMessages: { id: string; agentName: string; message: string; roundIndex: number; createdAt: Date }[];
          let currentSummary: string | null;

          if (meetingType === "team") {
            const meeting = await db.teamMeeting.findUnique({
              where: { id },
              include: {
                messages: { orderBy: { createdAt: "asc" } },
              },
            });
            if (!meeting) {
              sendEvent({ type: "error", error: "Meeting not found" });
              clearInterval(pollInterval);
              controller.close();
              closed = true;
              return;
            }
            currentStatus = meeting.status;
            currentMessages = meeting.messages;
            currentSummary = meeting.summary;
          } else {
            const meeting = await db.individualMeeting.findUnique({
              where: { id },
              include: {
                messages: { orderBy: { createdAt: "asc" } },
              },
            });
            if (!meeting) {
              sendEvent({ type: "error", error: "Meeting not found" });
              clearInterval(pollInterval);
              controller.close();
              closed = true;
              return;
            }
            currentStatus = meeting.status;
            currentMessages = meeting.messages;
            currentSummary = meeting.summary;
          }

          // Check for status change
          if (currentStatus !== lastStatus) {
            sendEvent({ type: "status", status: currentStatus, meetingType: meetingType! });
            lastStatus = currentStatus;
          }

          // Check for new messages
          if (currentMessages.length > lastMessageCount) {
            const newMessages = currentMessages.slice(lastMessageCount);
            for (const msg of newMessages) {
              // Detect round change
              if (lastMessageCount > 0) {
                const prevMaxRound = currentMessages.slice(0, lastMessageCount).reduce((max, m) => Math.max(max, m.roundIndex), 0);
                if (msg.roundIndex > prevMaxRound) {
                  sendEvent({ type: "round_start", roundIndex: msg.roundIndex });
                }
              }

              sendEvent({
                type: "message",
                id: msg.id,
                agentName: msg.agentName,
                message: msg.message,
                roundIndex: msg.roundIndex,
                createdAt: msg.createdAt,
              });
            }
            lastMessageCount = currentMessages.length;
          }

          // Check for summary (completed)
          if (currentSummary && currentSummary !== lastSummary) {
            sendEvent({ type: "summary", summary: currentSummary });
            lastSummary = currentSummary;
          }

          // If meeting completed or back to draft (error case), close stream
          if (currentStatus === "completed" || (currentStatus === "draft" && lastStatus === "running")) {
            if (currentStatus === "draft" && lastStatus === "running") {
              sendEvent({ type: "error", error: "Meeting execution failed. Status was reset to draft." });
            }
            sendEvent({ type: "done" });
            clearInterval(pollInterval);
            controller.close();
            closed = true;
          }
        } catch (error) {
          console.error("SSE poll error:", error);
          // Don't close on poll error, keep trying
        }
      }, 2000);

      // Cleanup on abort signal
      _request.signal.addEventListener("abort", () => {
        if (!closed) {
          closed = true;
          clearInterval(pollInterval);
          try {
            controller.close();
          } catch {
            // Already closed
          }
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
