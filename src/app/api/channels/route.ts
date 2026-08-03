import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.success) return auth.response;
    const { tenantId } = auth;

    const channels = await db.channel.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ channels });
  } catch (error) {
    console.error("Channels list error:", error);
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
    const { type, name, credentials, phone, email } = body as {
      type: string;
      name: string;
      credentials: string;
      phone?: string;
      email?: string;
    };

    if (!type || !name) {
      return NextResponse.json(
        { error: "Type and name are required." },
        { status: 400 },
      );
    }

    const channel = await db.channel.create({
      data: {
        type,
        name,
        credentials: credentials ? (typeof credentials === "string" ? credentials : JSON.stringify(credentials)) : JSON.stringify({}),
        phone: phone || null,
        email: email || null,
        status: "disconnected",
        tenantId,
      },
    });

    return NextResponse.json({ channel }, { status: 201 });
  } catch (error) {
    console.error("Channel create error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}