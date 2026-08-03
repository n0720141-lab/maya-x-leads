import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.success) return auth.response;
    const { tenantId } = auth;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Daily breakdown: groupBy date, sum count
    const dailyLogs = await db.usageLog.findMany({
      where: {
        tenantId,
        date: { gte: thirtyDaysAgo },
      },
      select: {
        type: true,
        count: true,
        date: true,
      },
      orderBy: { date: "asc" },
    });

    // Aggregate by date
    const dailyBreakdown: Record<string, number> = {};
    for (const log of dailyLogs) {
      const key = log.date.toISOString().split("T")[0];
      dailyBreakdown[key] = (dailyBreakdown[key] || 0) + log.count;
    }

    // Totals by type
    const typeAggregation = await db.usageLog.groupBy({
      by: ["type"],
      where: {
        tenantId,
        date: { gte: thirtyDaysAgo },
      },
      _sum: { count: true },
    });

    const totalsByType = typeAggregation.map((t) => ({
      type: t.type,
      total: t._sum.count || 0,
    }));

    // Overall total
    const overallTotal = totalsByType.reduce((sum, t) => sum + t.total, 0);

    return NextResponse.json({
      dailyBreakdown,
      totalsByType,
      overallTotal,
      period: {
        start: thirtyDaysAgo.toISOString().split("T")[0],
        end: new Date().toISOString().split("T")[0],
      },
    });
  } catch (error) {
    console.error("Usage error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}