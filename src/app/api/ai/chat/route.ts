import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";
import { buildSystemPrompt, callDeepSeek, buildChatHistory } from "@/lib/deepseek";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.success) return auth.response;

  try {
    const { conversationId, inboundMessage } = await req.json() as {
      conversationId: string;
      inboundMessage?: string;
    };

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId is required." }, { status: 400 });
    }

    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      include: { lead: true, tenant: true },
    });

    if (!conversation || conversation.tenantId !== auth.tenantId) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }

    const botConfig = await db.botConfig.findUnique({ where: { tenantId: auth.tenantId } });
    if (!botConfig || botConfig.status !== "active") {
      return NextResponse.json({ error: "Bot is not active." }, { status: 400 });
    }

    const questions = await db.question.findMany({
      where: { tenantId: auth.tenantId, status: "active" },
      orderBy: { order: "asc" },
    });

    // Get API key from bot config or global config
    let apiKey = botConfig.aiApiKey;
    if (!apiKey) {
      const globalKey = await db.globalConfig.findUnique({ where: { key: "deepseek_api_key" } });
      apiKey = globalKey?.value || "";
    }
    if (!apiKey) {
      return NextResponse.json({ error: "AI API key not configured." }, { status: 400 });
    }

    // Save inbound message if provided
    if (inboundMessage) {
      await db.message.create({
        data: {
          conversationId,
          direction: "inbound",
          content: inboundMessage,
          senderType: "lead",
          channel: conversation.channel,
          status: "sent",
        },
      });

      // Update conversation messages JSON
      const existingMessages: Array<{ direction: string; text: string; timestamp: string }> =
        JSON.parse(conversation.messages || "[]");
      existingMessages.push({
        direction: "inbound",
        text: inboundMessage,
        timestamp: new Date().toISOString(),
      });
      await db.conversation.update({
        where: { id: conversationId },
        data: { messages: JSON.stringify(existingMessages) },
      });
    }

    // Import extractAndReply from deepseek
    const { extractAndReply, callDeepSeek, buildChatHistory, buildSystemPrompt } = await import("@/lib/deepseek");

    const dbMessages = await db.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });
    const history = dbMessages.map((m) => ({
      role: m.direction === "inbound" ? "user" : "assistant",
      content: m.content,
    }));

    const leadFirstName = conversation.lead?.name?.split(/\s+/)[0] || "";
    const extractRes = await extractAndReply({
      leadFirstName,
      state: conversation.state || "IDLE",
      history,
      msg: inboundMessage || "",
      apiKey,
      knowledgeBase: botConfig.knowledgeBase || undefined,
    });

    let reply = extractRes?.reply;

    // Fallback script if extractRes.reply is null
    if (!reply) {
      const currentState = conversation.state || "IDLE";
      const vehicle = extractRes?.answers?.vehicle || "";

      if (currentState === "IDLE" || currentState === "ASK_VEHICLE") {
        reply = leadFirstName
          ? `Perfect ${leadFirstName} — what vehicle are you interested in financing?`
          : "Great — what vehicle are you interested in financing?";
        await db.conversation.update({ where: { id: conversationId }, data: { state: "ASK_INCOME" } });
      } else if (currentState === "ASK_INCOME") {
        reply = leadFirstName
          ? `Nice choice ${leadFirstName} — for the best financing option${vehicle ? ` on the ${vehicle}` : ''}, what is your monthly income?`
          : `Nice choice — for the best financing option${vehicle ? ` on the ${vehicle}` : ''}, what is your monthly income?`;
        await db.conversation.update({ where: { id: conversationId }, data: { state: "DONE" } });
      } else {
        reply = leadFirstName
          ? `Thank you ${leadFirstName} — You are Pre-Approved for up to $50,000!\n\nOur finance coordinator Ayesha will contact you shortly to go over your vehicle options and complete the approval.\n\nKindly save her contact and expect her call from: 437-535-3576`
          : `You are Pre-Approved for up to $50,000!\n\nOur finance coordinator Ayesha will contact you shortly to go over your vehicle options and complete the approval.\n\nKindly save her contact and expect her call from: 437-535-3576`;
        await db.conversation.update({ where: { id: conversationId }, data: { state: "DONE" } });
      }
    } else if (extractRes?.next_state) {
      await db.conversation.update({ where: { id: conversationId }, data: { state: extractRes.next_state } });
    }

    if (extractRes?.answers?.vehicle || extractRes?.answers?.income || (extractRes?.notes && extractRes.notes.length > 0)) {
      const currentNotes = conversation.lead?.notes ? [conversation.lead.notes] : [];
      const combinedNotes = [...currentNotes, ...(extractRes.notes || [])];
      await db.lead.update({
        where: { id: conversation.leadId },
        data: {
          answers: JSON.stringify(extractRes.answers),
          notes: combinedNotes.join("; "),
        },
      }).catch(() => {});
    }

    // Save AI reply as Message
    await db.message.create({
      data: {
        conversationId,
        direction: "outbound",
        content: reply,
        senderType: "ai",
        senderName: botConfig.botName || "Maya",
        channel: conversation.channel,
        status: "sent",
      },
    });

    // Append to Conversation messages JSON
    const currentConv = await db.conversation.findUnique({
      where: { id: conversationId },
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
      where: { id: conversationId },
      data: { messages: JSON.stringify(updatedMessages) },
    });

    // Create MessageQueue entry for actual delivery
    await db.messageQueue.create({
      data: {
        tenantId: auth.tenantId,
        conversationId,
        leadId: conversation.leadId,
        direction: "outbound",
        channel: conversation.channel,
        content: reply,
        status: "pending",
      },
    });

    // Log usage
    await db.usageLog.create({
      data: {
        tenantId: auth.tenantId,
        type: "ai_interaction",
        count: 1,
        date: new Date(),
      },
    });

    // Update lead status to replied if it was new or contacted
    if (conversation.lead && ["new", "contacted"].includes(conversation.lead.status)) {
      await db.lead.update({
        where: { id: conversation.leadId },
        data: { status: "replied" },
      });
    }

    return NextResponse.json({
      reply,
      usage: aiResult.usage,
      conversationId,
    });
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.success) return auth.response;

  try {
    const botConfig = await db.botConfig.findUnique({ where: { tenantId: auth.tenantId } });
    const questionsCount = await db.question.count({ where: { tenantId: auth.tenantId, status: "active" } });
    const globalKey = await db.globalConfig.findUnique({ where: { key: "deepseek_api_key" } });

    const hasApiKey = !!(botConfig?.aiApiKey || globalKey?.value);
    const botActive = botConfig?.status === "active";
    const botName = botConfig?.botName || "Maya";

    let promptPreview: string | null = null;
    if (botConfig) {
      const questions = await db.question.findMany({
        where: { tenantId: auth.tenantId, status: "active" },
        orderBy: { order: "asc" },
      });
      const prompt = buildSystemPrompt(botConfig, questions);
      promptPreview = prompt.length > 300 ? prompt.slice(0, 300) + "..." : prompt;
    }

    return NextResponse.json({
      configured: hasApiKey,
      botActive,
      botName,
      questionsCount,
      promptPreview,
    });
  } catch (error) {
    console.error("AI config status error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}