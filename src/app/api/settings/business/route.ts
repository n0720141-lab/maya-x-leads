import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.success) return auth.response;
    const { tenantId } = auth;

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        slug: true,
        logo: true,
        plan: true,
        status: true,
        createdAt: true,
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ tenant });
  } catch (error) {
    console.error("Business info get error:", error);
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
    const { name, email, phone, address } = body as {
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
    };

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update." },
        { status: 400 },
      );
    }

    const tenant = await db.tenant.update({
      where: { id: tenantId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        slug: true,
        logo: true,
        plan: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ tenant });
  } catch (error) {
    console.error("Business info update error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}