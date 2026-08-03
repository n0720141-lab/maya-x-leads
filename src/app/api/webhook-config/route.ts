import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.success) return auth.response;
    const { tenantId } = auth;

    let config = await db.webhookConfig.findUnique({
      where: { tenantId },
    });

    // Upsert pattern: create with defaults if not exists
    if (!config) {
      config = await db.webhookConfig.create({
        data: {
          tenantId,
          url: "",
          events: "[]",
        },
      });
    }

    return NextResponse.json({ config });
  } catch (error) {
    console.error("Webhook config get error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.success) return auth.response;
    const { tenantId } = auth;

    const body = await req.json();
    const { url, apiKey, format, timeout, retryAttempts, events, status } = body as {
      url?: string;
      apiKey?: string;
      format?: string;
      timeout?: number;
      retryAttempts?: number;
      events?: string[];
      status?: string;
    };

    // Upsert
    const config = await db.webhookConfig.upsert({
      where: { tenantId },
      update: {
        ...(url !== undefined && { url }),
        ...(apiKey !== undefined && { apiKey }),
        ...(format !== undefined && { format }),
        ...(timeout !== undefined && { timeout }),
        ...(retryAttempts !== undefined && { retryAttempts }),
        ...(events !== undefined && { events: JSON.stringify(events) }),
        ...(status !== undefined && { status }),
      },
      create: {
        tenantId,
        url: url || "",
        apiKey: apiKey || null,
        format: format || "json",
        timeout: timeout || 30,
        retryAttempts: retryAttempts || 3,
        events: events ? JSON.stringify(events) : "[]",
        status: status || "active",
      },
    });

    return NextResponse.json({ config });
  } catch (error) {
    console.error("Webhook config update error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}