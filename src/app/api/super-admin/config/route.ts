import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.success) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (key) {
      const config = await db.globalConfig.findUnique({ where: { key } });
      if (!config) return NextResponse.json({ error: "Config not found." }, { status: 404 });
      return NextResponse.json({ config });
    }

    const configs = await db.globalConfig.findMany({ orderBy: { key: "asc" } });
    return NextResponse.json({ configs });
  } catch (error) {
    console.error("SA config get error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.success) return auth.response;

  try {
    const { key, value, description } = await req.json() as {
      key: string;
      value: string;
      description?: string;
    };

    if (!key || value === undefined || value === null) {
      return NextResponse.json({ error: "Key and value are required." }, { status: 400 });
    }

    const config = await db.globalConfig.upsert({
      where: { key },
      update: { value: String(value), description: description || undefined },
      create: { key, value: String(value), description: description || null },
    });

    return NextResponse.json({ config });
  } catch (error) {
    console.error("SA config put error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}