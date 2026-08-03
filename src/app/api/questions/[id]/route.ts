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

    const question = await db.question.findFirst({
      where: { id, tenantId },
    });

    if (!question) {
      return NextResponse.json(
        { error: "Question not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ question });
  } catch (error) {
    console.error("Question get error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth(req);
    if (!auth.success) return auth.response;
    const { tenantId } = auth;
    const { id } = await params;

    const question = await db.question.findFirst({
      where: { id, tenantId },
    });

    if (!question) {
      return NextResponse.json(
        { error: "Question not found." },
        { status: 404 },
      );
    }

    const body = await req.json();
    const { text, internalName, type, options, required, order, conditionQuestionId, conditionValue, status } = body as {
      text?: string;
      internalName?: string;
      type?: string;
      options?: unknown[];
      required?: boolean;
      order?: number;
      conditionQuestionId?: string;
      conditionValue?: string;
      status?: string;
    };

    const updated = await db.question.update({
      where: { id },
      data: {
        ...(text !== undefined && { text }),
        ...(internalName !== undefined && { internalName }),
        ...(type !== undefined && { type }),
        ...(options !== undefined && { options: JSON.stringify(options) }),
        ...(required !== undefined && { required }),
        ...(order !== undefined && { order }),
        ...(conditionQuestionId !== undefined && { conditionQuestionId }),
        ...(conditionValue !== undefined && { conditionValue }),
        ...(status !== undefined && { status }),
      },
    });

    return NextResponse.json({ question: updated });
  } catch (error) {
    console.error("Question update error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth(req);
    if (!auth.success) return auth.response;
    const { tenantId } = auth;
    const { id } = await params;

    const question = await db.question.findFirst({
      where: { id, tenantId },
    });

    if (!question) {
      return NextResponse.json(
        { error: "Question not found." },
        { status: 404 },
      );
    }

    await db.question.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Question delete error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}