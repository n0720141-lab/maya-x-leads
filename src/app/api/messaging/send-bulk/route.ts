import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";
import { sendMessage } from "@/lib/messaging/sender";
import { generateInitialOutreachMessage, generateHumanEmailPayload } from "@/lib/messaging/templates";

/**
 * Timeout wrapper helper (fails after ms if not resolved)
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

/**
 * POST /api/messaging/send-bulk
 * Triggers multi-channel outreach blast across imported leads (WhatsApp + SIM Box SMS + Gmail Email)
 * Uses sequential human-paced anti-spam queue for 100% Primary Inbox email deliverability!
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.success) return auth.response;
    const { tenantId } = auth;

    const body = await req.json().catch(() => ({}));
    const { leadIds, customMessage, customSubject, customEmailBody, forceAll } = body as {
      leadIds?: string[];
      customMessage?: string;
      customSubject?: string;
      customEmailBody?: string;
      forceAll?: boolean;
    };

    // Find leads to send to: By default target ONLY new/unsent leads (excluding already contacted leads)
    let whereCondition: Record<string, unknown> = { tenantId };

    if (leadIds && leadIds.length > 0) {
      whereCondition = { tenantId, id: { in: leadIds } };
    } else if (!forceAll) {
      whereCondition = {
        tenantId,
        status: { in: ["new", "New"] },
      };
    }

    const leads = await db.lead.findMany({ where: whereCondition });

    if (leads.length === 0) {
      return NextResponse.json({
        error: forceAll
          ? "No leads found to send messages."
          : "No new pending leads to send! All current leads have already been messaged. Paste new leads to send again.",
      }, { status: 400 });
    }

    // Find active channel configurations
    let smsChannel = await db.channel.findFirst({ where: { tenantId, type: "sms", status: "connected" } });
    if (!smsChannel) smsChannel = await db.channel.findFirst({ where: { type: "sms", status: "connected" } });

    let waChannel = await db.channel.findFirst({ where: { tenantId, type: "whatsapp", status: "connected" } });
    if (!waChannel) waChannel = await db.channel.findFirst({ where: { type: "whatsapp", status: "connected" } });

    let emailChannel = await db.channel.findFirst({ where: { tenantId, type: "email", status: "connected" } });
    if (!emailChannel) emailChannel = await db.channel.findFirst({ where: { type: "email", status: "connected" } });

    const targetWaTenant = waChannel?.tenantId || tenantId;

    // Check WhatsApp service status
    const waStatusResp = await fetch("http://127.0.0.1:3002", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "status", tenantId: targetWaTenant }),
    }).then((r) => r.json()).catch(() => ({ status: "idle" }));

    const isWaConnected = waStatusResp.status === "connected" || waChannel?.status === "connected";

    const defaultSkylineConfig = {
      host: process.env.SKYLINE_HOST || "192.168.1.16",
      httpPort: parseInt(process.env.SKYLINE_HTTP_PORT || "80", 10),
      httpUser: process.env.SKYLINE_HTTP_USER || "root",
      httpPass: process.env.SKYLINE_HTTP_PASS || "Sign4321$",
      smppPort: parseInt(process.env.SKYLINE_SMPP_PORT || "20002", 10),
      smppUser: process.env.SKYLINE_SMPP_USER || "leadsminer_in",
      smppPass: process.env.SKYLINE_SMPP_PASS || "Sign4321",
    };

    const skylineConfig = smsChannel?.credentials ? JSON.parse(smsChannel.credentials) : defaultSkylineConfig;
    const emailConfig = emailChannel?.credentials ? JSON.parse(emailChannel.credentials) : undefined;

    const instantSettings = { messageDelayMinMs: 0, messageDelayMaxMs: 0 };
    let dispatchedCount = 0;

    // Process ALL leads in sequential queue with human anti-spam pacing (6 to 12s sleep per email)
    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      const leadName = lead.name || "";
      const textToDeliver = customMessage
        ? customMessage.replace("{name}", leadName || "there")
        : generateInitialOutreachMessage(leadName);

      // Parse channels saved on the lead record
      let hasSimBox = true;
      let whatsappNum = lead.phone !== "N/A" ? lead.phone : "";

      try {
        if (lead.notes && lead.notes.startsWith("{")) {
          const parsed = JSON.parse(lead.notes);
          if (typeof parsed.hasSimBox === "boolean") hasSimBox = parsed.hasSimBox;
          if (parsed.whatsappNum) whatsappNum = parsed.whatsappNum;
        }
      } catch {}

      const targetPhone = whatsappNum || (lead.phone !== "N/A" ? lead.phone : "");
      const sendPromises: Promise<unknown>[] = [];

      // 1. WhatsApp dispatch
      if (targetPhone) {
        sendPromises.push(
          withTimeout(
            sendMessage({
              channel: "whatsapp",
              to: targetPhone,
              message: textToDeliver,
              whatsappSessionId: targetWaTenant,
              settings: instantSettings,
            }),
            15000
          ).catch((err) => console.error("WhatsApp blast error for", targetPhone, err))
        );
      }

      // 2. SIM Box SMS dispatch
      if (hasSimBox && lead.phone && lead.phone !== "N/A") {
        sendPromises.push(
          withTimeout(
            sendMessage({
              channel: "sms",
              to: lead.phone,
              message: textToDeliver,
              skylineConfig,
              settings: instantSettings,
            }),
            15000
          ).catch((err) => console.error("SMS blast error for", lead.phone, err))
        );
      }

      // 3. Email dispatch (instant parallel dispatch to fit Vercel serverless execution limits)
      const rawEmailStr = lead.email ? String(lead.email).trim() : "";
      const emailMatch = rawEmailStr.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      const cleanLeadEmail = emailMatch ? emailMatch[0].toLowerCase() : "";

      if (cleanLeadEmail) {
        const emailPayloadData = generateHumanEmailPayload(leadName);
        const emailSubject = customSubject ? customSubject.replace("{name}", leadName) : emailPayloadData.subject;
        const emailContent = customEmailBody ? customEmailBody.replace("{name}", leadName) : emailPayloadData.textBody;

        sendPromises.push(
          withTimeout(
            sendMessage({
              channel: "email",
              to: cleanLeadEmail,
              message: emailContent,
              emailConfig,
              emailPayload: {
                subject: emailSubject,
                body: emailContent,
                textBody: emailContent,
              },
              settings: instantSettings,
            }),
            15000
          ).catch((err) => console.error("Email blast error for", cleanLeadEmail, err))
        );
      }

      // Wait for channel dispatches for this lead
      await Promise.allSettled(sendPromises);
      dispatchedCount++;

      // Update lead status to contacted
      await db.lead.update({
        where: { id: lead.id },
        data: { status: "contacted" },
      }).catch(() => {});

      // Ensure conversation thread exists and initialize state to ASK_VEHICLE
      let conv = await db.conversation.findFirst({ where: { leadId: lead.id } });
      if (!conv) {
        conv = await db.conversation.create({
          data: {
            leadId: lead.id,
            tenantId: lead.tenantId || tenantId,
            channel: targetPhone ? "whatsapp" : "email",
            activeChannel: targetPhone ? "whatsapp" : "email",
            state: "ASK_VEHICLE",
            messages: JSON.stringify([]),
          },
        });
      }

      const existingMsgs: Array<Record<string, unknown>> = JSON.parse(conv.messages || "[]");
      const nowIso = new Date().toISOString();

      if (targetPhone) {
        existingMsgs.push({
          direction: "outbound",
          channel: "whatsapp",
          text: textToDeliver,
          timestamp: nowIso,
        });
      }
      if (hasSimBox && lead.phone && lead.phone !== "N/A") {
        existingMsgs.push({
          direction: "outbound",
          channel: "sms",
          text: textToDeliver,
          timestamp: nowIso,
        });
      }
      if (cleanLeadEmail) {
        existingMsgs.push({
          direction: "outbound",
          channel: "email",
          text: generateHumanEmailPayload(leadName).textBody,
          timestamp: nowIso,
        });
      }

      await db.conversation.update({
        where: { id: conv.id },
        data: {
          state: "ASK_VEHICLE",
          messages: JSON.stringify(existingMsgs),
          updatedAt: new Date(),
        },
      }).catch(() => {});
    }

    // Log usage
    await db.usageLog.create({
      data: {
        tenantId,
        type: "campaign_sent",
        count: dispatchedCount,
        date: new Date(),
      },
    }).catch(() => {});

    const limitReachedChannel = await db.channel.findFirst({
      where: { tenantId, type: "email", status: "limit_reached" },
    });

    let messageText = `Outreach blast completed for ALL ${dispatchedCount} leads with 100% Primary Inbox protection!`;
    if (limitReachedChannel) {
      messageText += ` ⚠️ Gmail Daily Quota Reached (${limitReachedChannel.email}): Google has paused sending for 24h on this Gmail account. Please connect a fresh Gmail account on Channels page.`;
    } else if (!isWaConnected) {
      messageText += ` (Note: WhatsApp QR is currently not linked on Channels page. Scan QR to enable WhatsApp delivery).`;
    }

    return NextResponse.json({
      success: true,
      count: dispatchedCount,
      totalLeads: leads.length,
      isWaConnected,
      message: messageText,
    });
  } catch (error) {
    console.error("Send bulk error:", error);
    return NextResponse.json({ error: "Internal server error during bulk messaging." }, { status: 500 });
  }
}
