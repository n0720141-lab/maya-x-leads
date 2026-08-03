import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";

interface ConversationMessage {
  direction: string;
  text: string;
  timestamp: string;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.success) return auth.response;
    const { tenantId } = auth;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const conversations = await db.conversation.findMany({
      where: { tenantId },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        lead: {
          select: { id: true, name: true, phone: true, status: true },
        },
      },
    });

    const total = await db.conversation.count({
      where: { tenantId },
    });

    const threads: Record<string, Array<{ id: string | number; sender: 'lead' | 'ai'; text: string; time: string }>> = {};

    const result = conversations.map((conv) => {
      let lastMsgText = '';
      let rawMessages: Array<{ direction?: string; text?: string; timestamp?: string }> = [];
      try {
        rawMessages = JSON.parse(conv.messages || '[]');
        if (rawMessages.length > 0) {
          lastMsgText = rawMessages[rawMessages.length - 1].text || '';
        }
      } catch {}

      const name = conv.lead?.name || conv.lead?.phone || 'Lead #' + conv.id.slice(-4);
      const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'L';
      const channel = (conv.channel || 'whatsapp').toUpperCase() as 'SMS' | 'WhatsApp' | 'Email';

      threads[conv.id] = rawMessages.map((m, idx) => ({
        id: idx + 1,
        sender: m.direction === 'inbound' ? 'lead' : 'ai',
        text: m.text || '',
        time: m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
        channel: ((m as Record<string, string>).channel || conv.channel || 'whatsapp').toLowerCase(),
      }));

      return {
        id: conv.id,
        name,
        initials,
        lastMessage: lastMsgText || 'Conversation started',
        time: 'Active',
        channel: channel === 'WHATSAPP' ? 'WhatsApp' : channel === 'EMAIL' ? 'Email' : 'SMS',
        status: conv.state === 'QUALIFIED' ? 'active' : 'active',
        unread: 0,
        leadId: conv.leadId,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      };
    });

    return NextResponse.json({
      conversations: result,
      threads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Conversations list error:", error);
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
    const convId = searchParams.get("id");
    const clearAll = searchParams.get("all") === "true";

    if (clearAll) {
      await db.message.deleteMany({
        where: { conversation: { tenantId } },
      }).catch(() => {});

      await db.conversation.deleteMany({
        where: { tenantId },
      }).catch(() => {});

      return NextResponse.json({ success: true, message: "All conversations cleared successfully." });
    }

    if (convId) {
      await db.message.deleteMany({
        where: { conversationId: convId },
      }).catch(() => {});

      await db.conversation.delete({
        where: { id: convId },
      }).catch(() => {});

      return NextResponse.json({ success: true, message: "Conversation deleted successfully." });
    }

    return NextResponse.json({ error: "Missing conversation ID or all=true parameter." }, { status: 400 });
  } catch (error) {
    console.error("Conversations delete error:", error);
    return NextResponse.json({ error: "Failed to delete conversations." }, { status: 500 });
  }
}