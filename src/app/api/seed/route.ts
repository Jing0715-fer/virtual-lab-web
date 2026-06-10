import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { PRINCIPAL_INVESTIGATOR, SCIENTIFIC_CRITIC } from "@/lib/virtual-lab";

// POST /api/seed - Seed pre-defined agents
export async function POST() {
  try {
    const results: { agent: string; status: string; id: string }[] = [];

    // Check if PI already exists
    const existingPI = await db.agent.findFirst({
      where: { title: PRINCIPAL_INVESTIGATOR.title },
    });

    if (existingPI) {
      results.push({ agent: "Principal Investigator", status: "already exists", id: existingPI.id });
    } else {
      const pi = await db.agent.create({
        data: {
          title: PRINCIPAL_INVESTIGATOR.title,
          expertise: PRINCIPAL_INVESTIGATOR.expertise,
          goal: PRINCIPAL_INVESTIGATOR.goal,
          role: PRINCIPAL_INVESTIGATOR.role,
          model: PRINCIPAL_INVESTIGATOR.model,
          color: PRINCIPAL_INVESTIGATOR.color,
          icon: PRINCIPAL_INVESTIGATOR.icon,
        },
      });
      results.push({ agent: "Principal Investigator", status: "created", id: pi.id });
    }

    // Check if Scientific Critic already exists
    const existingCritic = await db.agent.findFirst({
      where: { title: SCIENTIFIC_CRITIC.title },
    });

    if (existingCritic) {
      results.push({ agent: "Scientific Critic", status: "already exists", id: existingCritic.id });
    } else {
      const critic = await db.agent.create({
        data: {
          title: SCIENTIFIC_CRITIC.title,
          expertise: SCIENTIFIC_CRITIC.expertise,
          goal: SCIENTIFIC_CRITIC.goal,
          role: SCIENTIFIC_CRITIC.role,
          model: SCIENTIFIC_CRITIC.model,
          color: SCIENTIFIC_CRITIC.color,
          icon: SCIENTIFIC_CRITIC.icon,
        },
      });
      results.push({ agent: "Scientific Critic", status: "created", id: critic.id });
    }

    return NextResponse.json({ seeded: results });
  } catch (error) {
    console.error("Failed to seed agents:", error);
    return NextResponse.json(
      { error: "Failed to seed agents" },
      { status: 500 }
    );
  }
}

// GET /api/seed - Check seed status
export async function GET() {
  try {
    const pi = await db.agent.findFirst({
      where: { title: PRINCIPAL_INVESTIGATOR.title },
    });
    const critic = await db.agent.findFirst({
      where: { title: SCIENTIFIC_CRITIC.title },
    });

    return NextResponse.json({
      principalInvestigator: pi ? { id: pi.id, exists: true } : { exists: false },
      scientificCritic: critic ? { id: critic.id, exists: true } : { exists: false },
    });
  } catch (error) {
    console.error("Failed to check seed status:", error);
    return NextResponse.json(
      { error: "Failed to check seed status" },
      { status: 500 }
    );
  }
}
