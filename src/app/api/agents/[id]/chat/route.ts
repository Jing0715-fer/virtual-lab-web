import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { hermesChatCompletion } from "@/lib/hermes";

// POST /api/agents/[id]/chat - Chat with a specific agent
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch agent from database
    const agent = await db.agent.findUnique({
      where: { id },
    });

    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { message, history } = body as {
      message: string;
      history?: Array<{ role: "user" | "assistant"; content: string }>;
    };

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Build system prompt based on agent properties
    const systemPrompt = `You are ${agent.title}, an AI research agent. Your expertise is ${agent.expertise}. Your goal is ${agent.goal}. Your role is ${agent.role}. Respond in character as this research agent, providing thoughtful and detailed responses.`;

    // Build messages array
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> =
      [
        { role: "system", content: systemPrompt },
      ];

    // Include conversation history
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }
    }

    // Add the new user message
    messages.push({ role: "user", content: message.trim() });

    // Call Hermes API
    const completion = await hermesChatCompletion({
      messages,
      temperature: 0.7,
      max_tokens: 500,
      thinking: { type: "disabled" },
    });

    const response =
      completion.choices[0]?.message?.content ||
      "I apologize, I could not generate a response.";

    return NextResponse.json({
      response,
      agentName: agent.title,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to generate agent chat response:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate response from agent",
      },
      { status: 500 }
    );
  }
}
