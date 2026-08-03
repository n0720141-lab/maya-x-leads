import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.success) return auth.response;
    const { tenantId } = auth;

    let config = await db.botConfig.findUnique({
      where: { tenantId },
    });

    // Upsert pattern: create with defaults if not exists
    if (!config) {
      config = await db.botConfig.create({
        data: { tenantId },
      });
    }

    return NextResponse.json({ config });
  } catch (error) {
    console.error("Bot config get error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.success) return auth.response;
    const { tenantId } = auth;

    const body = await req.json();
    const {
      botName,
      language,
      role,
      timezone,
      personality,
      tone,
      openingMessage,
      instructions,
      knowledgeBase,
      aiProvider,
      aiApiKey,
      responseDelayMs,
      followUpDelayMs,
      followUpMaxAttempts,
      sessionTimeoutMs,
      maxQuestions,
      status,
    } = body as {
      botName?: string;
      language?: string;
      role?: string;
      timezone?: string;
      personality?: string;
      tone?: string;
      openingMessage?: string;
      instructions?: string;
      knowledgeBase?: string;
      aiProvider?: string;
      aiApiKey?: string;
      responseDelayMs?: number;
      followUpDelayMs?: number;
      followUpMaxAttempts?: number;
      sessionTimeoutMs?: number;
      maxQuestions?: number;
      status?: string;
    };

    // Upsert
    const config = await db.botConfig.upsert({
      where: { tenantId },
      update: {
        ...(botName !== undefined && { botName }),
        ...(language !== undefined && { language }),
        ...(role !== undefined && { role }),
        ...(timezone !== undefined && { timezone }),
        ...(personality !== undefined && { personality }),
        ...(tone !== undefined && { tone }),
        ...(openingMessage !== undefined && { openingMessage }),
        ...(instructions !== undefined && { instructions }),
        ...(knowledgeBase !== undefined && { knowledgeBase }),
        ...(aiProvider !== undefined && { aiProvider }),
        ...(aiApiKey !== undefined && { aiApiKey }),
        ...(responseDelayMs !== undefined && { responseDelayMs }),
        ...(followUpDelayMs !== undefined && { followUpDelayMs }),
        ...(followUpMaxAttempts !== undefined && { followUpMaxAttempts }),
        ...(sessionTimeoutMs !== undefined && { sessionTimeoutMs }),
        ...(maxQuestions !== undefined && { maxQuestions }),
        ...(status !== undefined && { status }),
      },
      create: {
        tenantId,
        ...(botName !== undefined && { botName }),
        ...(language !== undefined && { language }),
        ...(role !== undefined && { role }),
        ...(timezone !== undefined && { timezone }),
        ...(personality !== undefined && { personality }),
        ...(tone !== undefined && { tone }),
        ...(openingMessage !== undefined && { openingMessage }),
        ...(instructions !== undefined && { instructions }),
        ...(knowledgeBase !== undefined && { knowledgeBase }),
        ...(aiProvider !== undefined && { aiProvider }),
        ...(aiApiKey !== undefined && { aiApiKey }),
        ...(responseDelayMs !== undefined && { responseDelayMs }),
        ...(followUpDelayMs !== undefined && { followUpDelayMs }),
        ...(followUpMaxAttempts !== undefined && { followUpMaxAttempts }),
        ...(sessionTimeoutMs !== undefined && { sessionTimeoutMs }),
        ...(maxQuestions !== undefined && { maxQuestions }),
        ...(status !== undefined && { status }),
      },
    });

    return NextResponse.json({ config });
  } catch (error) {
    console.error("Bot config update error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}