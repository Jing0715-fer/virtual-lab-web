import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const PERSONAS_DIR = path.join(process.cwd(), "data", "personas");

interface PersonaConfig {
  tone: string;
  responseStyle: string;
  customInstructions: string;
  temperatureOverride: number | null;
}

const DEFAULT_PERSONA: PersonaConfig = {
  tone: "professional",
  responseStyle: "balanced",
  customInstructions: "",
  temperatureOverride: null,
};

// GET /api/agents/[id]/persona — Get persona config for an agent
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify agent exists
    const agent = await db.agent.findUnique({ where: { id } });
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Try to read persona file
    const filePath = path.join(PERSONAS_DIR, `${id}.json`);
    try {
      const raw = await fs.readFile(filePath, "utf-8");
      const persona: PersonaConfig = JSON.parse(raw);
      return NextResponse.json(persona);
    } catch {
      // File doesn't exist yet — return default persona
      return NextResponse.json(DEFAULT_PERSONA);
    }
  } catch (error) {
    console.error("Failed to fetch persona:", error);
    return NextResponse.json(
      { error: "Failed to fetch persona" },
      { status: 500 }
    );
  }
}

// POST /api/agents/[id]/persona — Save persona config for an agent
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify agent exists
    const agent = await db.agent.findUnique({ where: { id } });
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Parse body
    const body = await request.json();
    const { tone, responseStyle, customInstructions, temperatureOverride } = body;

    // Validate required fields
    if (!tone || typeof tone !== "string") {
      return NextResponse.json(
        { error: "Invalid data: 'tone' is required and must be a string" },
        { status: 400 }
      );
    }
    if (!responseStyle || typeof responseStyle !== "string") {
      return NextResponse.json(
        { error: "Invalid data: 'responseStyle' is required and must be a string" },
        { status: 400 }
      );
    }
    if (typeof customInstructions !== "string") {
      return NextResponse.json(
        { error: "Invalid data: 'customInstructions' must be a string" },
        { status: 400 }
      );
    }
    if (temperatureOverride !== undefined && temperatureOverride !== null) {
      if (typeof temperatureOverride !== "number" || temperatureOverride < 0 || temperatureOverride > 2) {
        return NextResponse.json(
          { error: "Invalid data: 'temperatureOverride' must be a number between 0 and 2" },
          { status: 400 }
        );
      }
    }

    // Ensure personas directory exists
    await fs.mkdir(PERSONAS_DIR, { recursive: true });

    // Build persona config
    const persona: PersonaConfig = {
      tone: tone.trim(),
      responseStyle: responseStyle.trim(),
      customInstructions: (customInstructions || "").trim(),
      temperatureOverride: temperatureOverride ?? null,
    };

    // Write persona file
    const filePath = path.join(PERSONAS_DIR, `${id}.json`);
    await fs.writeFile(filePath, JSON.stringify(persona, null, 2), "utf-8");

    return NextResponse.json(persona);
  } catch (error) {
    console.error("Failed to save persona:", error);
    return NextResponse.json(
      { error: "Failed to save persona" },
      { status: 500 }
    );
  }
}
