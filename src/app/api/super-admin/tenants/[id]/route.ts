import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth-middleware";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin(req);
  if (!auth.success) return auth.response;

  try {
    const { id } = await params;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const tenant = await db.tenant.findUnique({
      where: { id },
      include: {
        users: { select: { id: true, email: true, name: true, role: true, createdAt: true } },
        _count: {
          select: {
            leads: true,
            conversations: true,
            campaigns: true,
            channels: true,
          },
        },
        subscriptions: { orderBy: { createdAt: "desc" }, take: 1 },
        botConfig: true,
        webhookConfig: true,
        usageLogs: { where: { date: { gte: thirtyDaysAgo } }, orderBy: { date: "asc" } },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
    }

    return NextResponse.json({ tenant });
  } catch (error) {
    console.error("SA tenant detail error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin(req);
  if (!auth.success) return auth.response;

  try {
    const { id } = await params;
    const body = await req.json() as {
      status?: string;
      plan?: string;
      name?: string;
      email?: string;
    };

    const tenant = await db.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
    }

    const validStatuses = ["active", "suspended", "cancelled"];
    if (body.status && !validStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }

    const validPlans = ["starter", "growth", "enterprise"];
    if (body.plan && !validPlans.includes(body.plan)) {
      return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
    }

    const updateData: Record<string, string> = {};
    if (body.status) updateData.status = body.status;
    if (body.name) updateData.name = body.name;
    if (body.email) updateData.email = body.email;
    if (body.plan) updateData.plan = body.plan;

    const updated = await db.tenant.update({
      where: { id },
      data: updateData,
    });

    // If plan changed, also update the latest subscription
    if (body.plan && body.plan !== tenant.plan) {
      const sub = await db.subscription.findFirst({
        where: { tenantId: id },
        orderBy: { createdAt: "desc" },
      });
      if (sub) {
        await db.subscription.update({
          where: { id: sub.id },
          data: { plan: body.plan },
        });
      }
    }

    return NextResponse.json({ tenant: updated });
  } catch (error) {
    console.error("SA tenant update error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin(req);
  if (!auth.success) return auth.response;

  try {
    const { id } = await params;
    const tenant = await db.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
    }

    await db.tenant.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("SA tenant delete error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}