import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.success) return auth.response;
    const { tenantId } = auth;

    const questions = await db.question.findMany({
      where: { tenantId },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Questions list error:", error);
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
    const { text, internalName, type, options, required, conditionQuestionId, conditionValue } = body as {
      text: string;
      internalName?: string;
      type?: string;
      options?: unknown[];
      required?: boolean;
      conditionQuestionId?: string;
      conditionValue?: string;
    };

    if (!text) {
      return NextResponse.json(
        { error: "Question text is required." },
        { status: 400 },
      );
    }

    // Auto-order: count existing + 1
    const count = await db.question.count({
      where: { tenantId },
    });

    const question = await db.question.create({
      data: {
        text,
        internalName: internalName || null,
        type: type || "text",
        options: options ? JSON.stringify(options) : null,
        required: required !== undefined ? required : true,
        order: count + 1,
        conditionQuestionId: conditionQuestionId || null,
        conditionValue: conditionValue || null,
        tenantId,
      },
    });

    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    console.error("Question create error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}