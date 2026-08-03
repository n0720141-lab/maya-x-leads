import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth(req);
    if (!auth.success) return auth.response;
    const { tenantId } = auth;
    const { id } = await params;

    const conversation = await db.conversation.findFirst({
      where: { id, tenantId },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 },
      );
    }

    let messages: unknown[] = [];
    try {
      messages = JSON.parse(conversation.messages || "[]");
    } catch {
      // ignore parse errors
    }

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Messages list error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth(req);
    if (!auth.success) return auth.response;
    const { tenantId, userId } = auth;
    const { id } = await params;

    const conversation = await db.conversation.findFirst({
      where: { id, tenantId },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 },
      );
    }

    const body = await req.json();
    const { text } = body as { text: string };

    if (!text) {
      return NextResponse.json(
        { error: "Message text is required." },
        { status: 400 },
      );
    }

    const newMessage = {
      direction: "outbound" as const,
      text,
      timestamp: new Date().toISOString(),
      senderType: "agent" as const,
      senderId: userId,
    };

    // Append to Conversation.messages JSON
    let messages: unknown[] = [];
    try {
      messages = JSON.parse(conversation.messages || "[]");
    } catch {
      // ignore parse errors, start with empty array
    }
    messages.push(newMessage);

    await db.conversation.update({
      where: { id },
      data: {
        messages: JSON.stringify(messages),
        updatedAt: new Date(),
      },
    });

    // Dispatch message live over selected channel (WhatsApp / Email / SMS SIM Box)
    try {
      const { sendMessage } = await import('@/lib/messaging/sender')
      const channelType = (conversation.channel || 'sms').toLowerCase() as 'sms' | 'whatsapp' | 'email'
      
      const lead = await db.lead.findUnique({ where: { id: conversation.leadId } })
      const recipient = lead?.phone || lead?.email || ''

      if (recipient) {
        // Find tenant active configs
        const smsChannel = await db.channel.findFirst({ where: { tenantId, type: 'sms', status: 'connected' } })
        const waChannel = await db.channel.findFirst({ where: { tenantId, type: 'whatsapp', status: 'connected' } })
        const emailChannel = await db.channel.findFirst({ where: { tenantId, type: 'email', status: 'connected' } })

        const skylineConfig = smsChannel?.credentials ? JSON.parse(smsChannel.credentials) : undefined
        const emailConfig = emailChannel?.credentials ? JSON.parse(emailChannel.credentials) : undefined

        await sendMessage({
          channel: channelType,
          to: recipient,
          message: text,
          skylineConfig,
          whatsappSessionId: waChannel?.id || tenantId,
          emailConfig,
        }).catch((err) => console.error('Channel send error:', err))
      }
    } catch (e) {
      console.error('Dispatch error:', e)
    }

    // Log usage
    await db.usageLog.create({
      data: {
        tenantId,
        type: "message_sent",
        count: 1,
        date: new Date(),
      },
    });

    return NextResponse.json({ message: newMessage }, { status: 201 });
  } catch (error) {
    console.error("Message create error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}