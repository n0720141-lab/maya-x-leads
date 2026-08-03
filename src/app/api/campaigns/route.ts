import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.success) return auth.response;
    const { tenantId } = auth;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const [campaigns, total] = await Promise.all([
      db.campaign.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.campaign.count({ where: { tenantId } }),
    ]);

    return NextResponse.json({
      campaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Campaigns list error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.success) return auth.response;
    const { tenantId } = auth;

    const body = await req.json();
    const { name, channel, messageTemplate, leadSource } = body as {
      name: string;
      channel?: string;
      messageTemplate?: string;
      leadSource?: string;
    };

    if (!name) {
      return NextResponse.json(
        { error: "Campaign name is required." },
        { status: 400 },
      );
    }

    const campaign = await db.campaign.create({
      data: {
        name,
        channel: channel || "sms",
        messageTemplate: messageTemplate || null,
        leadSource: leadSource || null,
        tenantId,
      },
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error("Campaign create error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}