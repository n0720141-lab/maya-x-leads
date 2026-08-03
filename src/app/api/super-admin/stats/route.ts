import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth-middleware";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.success) return auth.response;

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalTenants,
      activeTenants,
      totalUsers,
      totalLeads,
      totalConversations,
      totalCampaigns,
      recentUsage,
      tenantsByPlan,
      messageQueueStats,
      recentSignups,
    ] = await Promise.all([
      db.tenant.count(),
      db.tenant.count({ where: { status: "active" } }),
      db.user.count(),
      db.lead.count(),
      db.conversation.count(),
      db.campaign.count(),
      db.usageLog.groupBy({
        by: ["type"],
        where: { date: { gte: thirtyDaysAgo } },
        _sum: { count: true },
      }),
      db.tenant.groupBy({
        by: ["plan"],
        _count: { plan: true },
      }),
      db.messageQueue.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
      db.tenant.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, name: true, email: true, plan: true, status: true, createdAt: true },
      }),
    ]);

    const queueStatsObj: Record<string, number> = {};
    for (const item of messageQueueStats) {
      queueStatsObj[item.status] = item._count.status;
    }

    return NextResponse.json({
      totalTenants,
      activeTenants,
      totalUsers,
      totalLeads,
      totalConversations,
      totalCampaigns,
      recentUsage,
      tenantsByPlan: tenantsByPlan.map((p) => ({ plan: p.plan, count: p._count.plan })),
      messageQueue: { total: Object.values(queueStatsObj).reduce((a, b) => a + b, 0), byStatus: queueStatsObj },
      recentSignups,
    });
  } catch (error) {
    console.error("SA stats error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}