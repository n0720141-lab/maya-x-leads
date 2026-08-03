import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth(req);
    if (!auth.success) return auth.response;
    const { tenantId } = auth;
    const { id } = await params;

    const conversation = await db.conversation.findFirst({
      where: { id, tenantId },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            status: true,
            channel: true,
            source: true,
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 },
      );
    }

    // Parse messages from JSON
    let messages: unknown[] = [];
    try {
      messages = JSON.parse(conversation.messages || "[]");
    } catch {
      // ignore parse errors
    }

    return NextResponse.json({
      conversation: {
        ...conversation,
        messages,
      },
    });
  } catch (error) {
    console.error("Conversation get error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}