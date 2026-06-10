import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// GET /api/agents - List all agents
export async function GET() {
  try {
    const agents = await db.agent.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(agents);
  } catch (error) {
    console.error("Failed to fetch agents:", error);
    return NextResponse.json(
      { error: "Failed to fetch agents" },
      { status: 500 }
    );
  }
}

// POST /api/agents - Create a new agent
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, expertise, goal, role, model, color, icon } = body;

    if (!title || !expertise || !goal || !role) {
      return NextResponse.json(
        { error: "title, expertise, goal, and role are required" },
        { status: 400 }
      );
    }

    const agent = await db.agent.create({
      data: {
        title,
        expertise,
        goal,
        role,
        model: model || "gpt-4o",
        color: color || "#6366f1",
        icon: icon || "bot",
      },
    });

    return NextResponse.json(agent, { status: 201 });
  } catch (error) {
    console.error("Failed to create agent:", error);
    return NextResponse.json(
      { error: "Failed to create agent" },
      { status: 500 }
    );
  }
}
