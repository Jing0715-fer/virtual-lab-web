import { NextResponse } from "next/server";

// GET /api/meetings/[id]/messages/[msgId]/react - Get reactions for a message
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; msgId: string }> }
) {
  try {
    const { msgId } = await params;
    return NextResponse.json({
      message: msgId,
      reactions: {},
    });
  } catch (error) {
    console.error("Failed to fetch reactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch reactions" },
      { status: 500 }
    );
  }
}

// POST /api/meetings/[id]/messages/[msgId]/react - Add/update reaction
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; msgId: string }> }
) {
  try {
    const { id, msgId } = await params;
    const body = await request.json();
    const { emoji } = body as { emoji: string };

    if (!emoji) {
      return NextResponse.json(
        { error: "emoji is required" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      meetingId: id,
      messageId: msgId,
      emoji,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to add reaction:", error);
    return NextResponse.json(
      { error: "Failed to add reaction" },
      { status: 500 }
    );
  }
}
