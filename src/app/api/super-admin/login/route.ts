import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, hashPassword, signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json() as { email: string; password: string };
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const admin = await db.superAdmin.findUnique({ where: { email: email.toLowerCase() } });
    if (!admin) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const isValid = await verifyPassword(password, admin.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    await db.superAdmin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });

    const token = await signToken({
      userId: admin.id,
      tenantId: "system",
      role: "super_admin",
    });

    return NextResponse.json({
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        lastLoginAt: admin.lastLoginAt,
      },
    });
  } catch (error) {
    console.error("SA login error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const existing = await db.superAdmin.findFirst();
    if (existing) {
      return NextResponse.json({ error: "Super admin already exists." }, { status: 409 });
    }

    const { email, password, name } = await req.json() as {
      email: string;
      password: string;
      name: string;
    };

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Email, password, and name are required." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const admin = await db.superAdmin.create({
      data: { email: email.toLowerCase(), passwordHash, name, role: "super_admin" },
    });

    const token = await signToken({
      userId: admin.id,
      tenantId: "system",
      role: "super_admin",
    });

    return NextResponse.json({
      token,
      admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
    });
  } catch (error) {
    console.error("SA seed error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}