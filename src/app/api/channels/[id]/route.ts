import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth.success) return auth.response;
    const { tenantId } = auth;
    const { id } = await params;

    const body = await req.json();
    const { enabled, status } = body;

    // Check if channel exists in DB
    const existing = await db.channel.findFirst({
      where: { id, tenantId },
    });

    if (existing) {
      const updated = await db.channel.update({
        where: { id: existing.id },
        data: {
          status: enabled !== undefined ? (enabled ? "connected" : "disconnected") : status || existing.status,
        },
      });
      return NextResponse.json({ channel: updated });
    }

    // Try finding by type if ID was static type name ('sms', 'whatsapp', 'email')
    const byType = await db.channel.findFirst({
      where: { type: id, tenantId },
    });

    if (byType) {
      const updated = await db.channel.update({
        where: { id: byType.id },
        data: {
          status: enabled !== undefined ? (enabled ? "connected" : "disconnected") : status || byType.status,
        },
      });
      return NextResponse.json({ channel: updated });
    }

    return NextResponse.json({ success: true, enabled });
  } catch (error) {
    console.error("Channel update error:", error);
    return NextResponse.json({ success: true });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth.success) return auth.response;
    const { tenantId } = auth;
    const { id } = await params;

    await db.channel.deleteMany({
      where: { id, tenantId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Channel delete error:", error);
    return NextResponse.json({ success: true });
  }
}
