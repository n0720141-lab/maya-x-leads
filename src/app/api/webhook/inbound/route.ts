import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildSystemPrompt, callDeepSeek, buildChatHistory } from "@/lib/deepseek";

export async function POST(req: NextRequest) {
  try {
    // Auth via X-Webhook-Key header
    const webhookKey = req.headers.get("X-Webhook-Key");
    if (!webhookKey) {
      return NextResponse.json({ error: "Missing webhook key." }, { status: 401 });
    }

    const { phone, content, channel } = await req.json() as {
      phone: string;
      content: string;
      channel?: string;
    };

    if (!phone || !content) {
      return NextResponse.json({ error: "Phone and content are required." }, { status: 400 });
    }

    const resolvedChannel = channel || "sms";

    // Find channel by phone to get tenant
    const ch = await db.channel.findFirst({
      where: {
        OR: [{ phone }, { email: phone }],
        type: resolvedChannel,
      },
      include: { tenant: true },
    });

    if (!ch) {
      return NextResponse.json({ error: "No matching channel found for this phone." }, { status: 404 });
    }

    const tenantId = ch.tenantId;

    // Verify webhook key
    const webhookConfig = await db.webhookConfig.findUnique({ where: { tenantId } });
    if (!webhookConfig || webhookConfig.apiKey !== webhookKey) {
      return NextResponse.json({ error: "Invalid webhook key." }, { status: 403 });
    }

    if (ch.tenant.status !== "active") {
      return NextResponse.json({ error: "Tenant is not active." }, { status: 403 });
    }

    // Find lead by phone
    let lead = await db.lead.findFirst({ where: { phone, tenantId } });

    // Get or create conversation
    let conversation = lead ? await db.conversation.findFirst({
      where: { leadId: lead.id },
      orderBy: { createdAt: 'desc' },
    }) : null;
    if (!lead) {
      return NextResponse.json({ error: "Sender not found in imported leads list." }, { status: 404 });
    }

    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          leadId: lead.id,
          channel: resolvedChannel,
          tenantId,
          messages: JSON.stringify([]),
          state: "IDLE",
        },
      });
    }

    // Save inbound message
    await db.message.create({
      data: {
        conversationId: conversation.id,
        direction: "inbound",
        content,
        senderType: "lead",
        channel: resolvedChannel,
        status: "sent",
      },
    });

    // Update conversation messages JSON
    const existingMessages: Array<{ direction: string; text: string; timestamp: string }> =
      JSON.parse(conversation.messages || "[]");
    existingMessages.push({
      direction: "inbound",
      text: content,
      timestamp: new Date().toISOString(),
    });
    await db.conversation.update({
      where: { id: conversation.id },
      data: { messages: JSON.stringify(existingMessages) },
    });

    // Load bot config and questions
    const botConfig = await db.botConfig.findUnique({ where: { tenantId } });
    if (!botConfig || botConfig.status !== "active") {
      return NextResponse.json({ success: true, autoReplied: false, reason: "Bot not active" });
    }

    const questions = await db.question.findMany({
      where: { tenantId, status: "active" },
      orderBy: { order: "asc" },
    });

    // Get API key
    let apiKey = botConfig.aiApiKey;
    if (!apiKey) {
      const globalKey = await db.globalConfig.findUnique({ where: { key: "deepseek_api_key" } });
      apiKey = globalKey?.value || "";
    }
    if (!apiKey) {
      return NextResponse.json({ success: true, autoReplied: false, reason: "No API key" });
    }

    // Build chat history and call AI
    const systemPrompt = buildSystemPrompt(botConfig, questions);
    const dbMessages = await db.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
    });
    const chatMessages = buildChatHistory(dbMessages, systemPrompt);

    const aiResult = await callDeepSeek(chatMessages, apiKey);
    if (!aiResult.success || !aiResult.reply) {
      return NextResponse.json({ success: true, autoReplied: false, reason: aiResult.error || "AI failed" });
    }

    const reply = aiResult.reply;

    // Save AI reply
    await db.message.create({
      data: {
        conversationId: conversation.id,
        direction: "outbound",
        content: reply,
        senderType: "ai",
        senderName: botConfig.botName || "Maya",
        channel: resolvedChannel,
        status: "sent",
      },
    });

    // Append to conversation messages JSON
    const currentConv = await db.conversation.findUnique({
      where: { id: conversation.id },
      select: { messages: true },
    });
    const updatedMessages: Array<{ direction: string; text: string; timestamp: string }> =
      JSON.parse(currentConv?.messages || "[]");
    updatedMessages.push({
      direction: "outbound",
      text: reply,
      timestamp: new Date().toISOString(),
    });
    await db.conversation.update({
      where: { id: conversation.id },
      data: { messages: JSON.stringify(updatedMessages) },
    });

    // Create MessageQueue entry
    await db.messageQueue.create({
      data: {
        tenantId,
        conversationId: conversation.id,
        leadId: lead.id,
        direction: "outbound",
        channel: resolvedChannel,
        content: reply,
        status: "pending",
      },
    });

    // Log usage
    await db.usageLog.create({
      data: {
        tenantId,
        type: "ai_interaction",
        count: 1,
        date: new Date(),
      },
    });

    // Update lead status
    if (["new", "contacted"].includes(lead.status)) {
      await db.lead.update({
        where: { id: lead.id },
        data: { status: "replied" },
      });
    }

    return NextResponse.json({
      success: true,
      autoReplied: true,
      reply,
      usage: aiResult.usage,
      conversationId: conversation.id,
      leadId: lead.id,
    });
  } catch (error) {
    console.error("Webhook inbound error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}