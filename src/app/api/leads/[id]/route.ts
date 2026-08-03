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

    const lead = await db.lead.findFirst({
      where: { id, tenantId },
      include: {
        conversation: {
          select: {
            id: true,
            channel: true,
            state: true,
            messages: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!lead) {
      return NextResponse.json(
        { error: "Lead not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ lead });
  } catch (error) {
    console.error("Lead get error:", error);
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

    const body = await req.json();
    const { name, email, phone, status, notes, appointmentDate } = body as {
      name?: string;
      email?: string;
      phone?: string;
      status?: string;
      notes?: unknown;
      appointmentDate?: string | null;
    };

    const lead = await db.lead.findFirst({
      where: { id, tenantId },
    });

    if (!lead) {
      return NextResponse.json(
        { error: "Lead not found." },
        { status: 404 },
      );
    }

    const updated = await db.lead.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes: JSON.stringify(notes) }),
        ...(appointmentDate !== undefined && {
          appointmentDate: appointmentDate ? new Date(appointmentDate) : null,
        }),
      },
    });

    return NextResponse.json({ lead: updated });
  } catch (error) {
    console.error("Lead update error:", error);
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

    const lead = await db.lead.findFirst({
      where: { id, tenantId },
    });

    if (!lead) {
      return NextResponse.json(
        { error: "Lead not found." },
        { status: 404 },
      );
    }

    await db.lead.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Lead delete error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}