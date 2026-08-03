import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.success) return auth.response;
    const { tenantId } = auth;

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    // Lead count by status
    const leadsByStatus = await db.lead.groupBy({
      by: ["status"],
      where: { tenantId },
      _count: { id: true },
    });

    // Total conversations
    const totalConversations = await db.conversation.count({
      where: { tenantId },
    });

    // Total campaigns
    const totalCampaigns = await db.campaign.count({
      where: { tenantId },
    });

    // Active channels count
    const activeChannels = await db.channel.count({
      where: { tenantId, status: "connected" },
    });

    // 14-day daily chart: leads created per day
    const allLeads = await db.lead.findMany({
      where: {
        tenantId,
        createdAt: { gte: fourteenDaysAgo },
      },
      select: { createdAt: true },
    });

    const dailyChart: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      dailyChart[key] = 0;
    }
    for (const lead of allLeads) {
      const key = lead.createdAt.toISOString().split("T")[0];
      if (dailyChart[key] !== undefined) {
        dailyChart[key]++;
      }
    }

    // Channel performance: leads grouped by channel
    const channelPerformance = await db.lead.groupBy({
      by: ["channel"],
      where: { tenantId },
      _count: { id: true },
    });

    // Top 5 campaigns by leadsEnrolled
    const topCampaigns = await db.campaign.findMany({
      where: { tenantId },
      orderBy: { leadsEnrolled: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        channel: true,
        status: true,
        leadsEnrolled: true,
        repliesCount: true,
        qualifiedCount: true,
        appointmentsCount: true,
      },
    });

    return NextResponse.json({
      leadsByStatus: leadsByStatus.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
      totalConversations,
      totalCampaigns,
      activeChannels,
      dailyChart,
      channelPerformance: channelPerformance.map((c) => ({
        channel: c.channel,
        count: c._count.id,
      })),
      topCampaigns,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}