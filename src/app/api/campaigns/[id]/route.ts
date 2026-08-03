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

    const campaign = await db.campaign.findFirst({
      where: { id, tenantId },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error("Campaign get error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth(req);
    if (!auth.success) return auth.response;
    const { tenantId } = auth;
    const { id } = await params;

    const campaign = await db.campaign.findFirst({
      where: { id, tenantId },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found." },
        { status: 404 },
      );
    }

    const body = await req.json();
    const { name, channel, status, messageTemplate, leadSource } = body as {
      name?: string;
      channel?: string;
      status?: string;
      messageTemplate?: string;
      leadSource?: string;
    };

    const updated = await db.campaign.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(channel !== undefined && { channel }),
        ...(status !== undefined && { status }),
        ...(messageTemplate !== undefined && { messageTemplate }),
        ...(leadSource !== undefined && { leadSource }),
      },
    });

    return NextResponse.json({ campaign: updated });
  } catch (error) {
    console.error("Campaign update error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth(req);
    if (!auth.success) return auth.response;
    const { tenantId } = auth;
    const { id } = await params;

    const campaign = await db.campaign.findFirst({
      where: { id, tenantId },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found." },
        { status: 404 },
      );
    }

    await db.campaign.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Campaign delete error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}