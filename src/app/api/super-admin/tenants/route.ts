import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth-middleware";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.success) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const plan = searchParams.get("plan") || "";

    const where: Prisma.TenantWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { slug: { contains: search } },
      ];
    }
    if (status) where.status = status;
    if (plan) where.plan = plan;

    const [tenants, total] = await Promise.all([
      db.tenant.findMany({
        where,
        include: {
          _count: {
            select: {
              users: true,
              leads: true,
              conversations: true,
              campaigns: true,
              channels: true,
            },
          },
          subscriptions: { orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.tenant.count({ where }),
    ]);

    return NextResponse.json({
      tenants,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("SA tenants list error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}