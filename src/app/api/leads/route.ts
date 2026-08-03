import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.success) return auth.response;
    const { tenantId } = auth;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const channel = searchParams.get("channel") || "";
    const source = searchParams.get("source") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const where: Record<string, unknown> = { tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ];
    }
    if (status) where.status = status;
    if (channel) where.channel = channel;
    if (source) where.source = source;

    const [leads, total] = await Promise.all([
      db.lead.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          conversation: {
            select: { id: true, state: true, channel: true, updatedAt: true },
          },
        },
      }),
      db.lead.count({ where }),
    ]);

    const formattedLeads = leads.map((l) => {
      let hasSimBox = true
      let hasWhatsApp = false

      try {
        if (l.notes && l.notes.startsWith('{')) {
          const parsed = JSON.parse(l.notes)
          if (typeof parsed.hasSimBox === 'boolean') hasSimBox = parsed.hasSimBox
          if (typeof parsed.hasWhatsApp === 'boolean') hasWhatsApp = parsed.hasWhatsApp
        } else {
          const ch = (l.channel || 'sms').toLowerCase()
          if (ch === 'whatsapp') {
            hasWhatsApp = true
            hasSimBox = false
          }
        }
      } catch {}

      const ch = (l.channel || 'sms').toLowerCase()
      const channel = ch === 'whatsapp' ? 'WhatsApp' : 'SMS'
      const rawStatus = (l.status || 'new').toLowerCase()
      const status = rawStatus === 'qualified' ? 'Qualified' : rawStatus === 'contacted' ? 'Contacted' : rawStatus === 'replied' ? 'Contacted' : 'New'

      return {
        id: l.id,
        name: l.name || l.phone || 'Lead #' + l.id.slice(-4),
        phone: l.phone,
        email: l.email,
        channel,
        hasSimBox,
        hasWhatsApp,
        activityType: 'Inbound Inquiry',
        status,
        time: l.createdAt ? new Date(l.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
      }
    })

    return NextResponse.json({
      leads: formattedLeads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Leads list error:", error);
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
    const { phone, name, email, source, channel, campaignId, answers } = body as {
      phone: string;
      name?: string;
      email?: string;
      source?: string;
      channel?: string;
      campaignId?: string;
      answers?: Record<string, unknown>;
    };

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number is required." },
        { status: 400 },
      );
    }

    // Check DNC list
    const dncEntry = await db.dncList.findUnique({
      where: { tenantId_phone: { tenantId, phone } },
    });
    if (dncEntry) {
      return NextResponse.json(
        { error: "This phone number is on the Do Not Contact list." },
        { status: 400 },
      );
    }

    // Check duplicate
    const existing = await db.lead.findFirst({
      where: { phone, tenantId },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A lead with this phone number already exists." },
        { status: 409 },
      );
    }

    // Create lead
    const lead = await db.lead.create({
      data: {
        phone,
        name: name || null,
        email: email || null,
        source: source || "manual",
        channel: channel || "sms",
        campaignId: campaignId || null,
        answers: answers ? JSON.stringify(answers) : null,
        tenantId,
      },
    });

    // Auto-create Conversation if not exists
    const existingConv = await db.conversation.findUnique({
      where: { leadId: lead.id },
    });
    if (!existingConv) {
      await db.conversation.create({
        data: {
          leadId: lead.id,
          channel: lead.channel,
          messages: JSON.stringify([]),
          state: "IDLE",
          tenantId,
        },
      });
    }

    // Log usage
    await db.usageLog.create({
      data: {
        tenantId,
        type: "lead_imported",
        count: 1,
        date: new Date(),
      },
    });

    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    console.error("Lead create error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.success) return auth.response;
    const { tenantId } = auth;

    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get("id");
    const clearAll = searchParams.get("all") === "true";

    if (clearAll) {
      await db.messageQueue.deleteMany({ where: { tenantId } }).catch(() => {});
      await db.conversation.deleteMany({ where: { tenantId } }).catch(() => {});
      await db.lead.deleteMany({ where: { tenantId } });

      return NextResponse.json({
        success: true,
        message: "Successfully cleared all leads and conversation records.",
      });
    }

    if (leadId) {
      await db.messageQueue.deleteMany({ where: { tenantId, leadId } }).catch(() => {});
      const conv = await db.conversation.findFirst({ where: { tenantId, leadId } });
      if (conv) {
        await db.message.deleteMany({ where: { conversationId: conv.id } }).catch(() => {});
        await db.conversation.delete({ where: { id: conv.id } }).catch(() => {});
      }
      await db.lead.delete({ where: { id: leadId } });
      return NextResponse.json({ success: true, message: "Lead deleted." });
    }

    return NextResponse.json({ error: "Lead ID or all=true query parameter is required." }, { status: 400 });
  } catch (error) {
    console.error("Lead delete error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}