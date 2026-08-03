import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication token is required." },
        { status: 401 },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { error: "Invalid or expired token." },
        { status: 401 },
      );
    }

    // Fetch user with tenant
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      include: { tenant: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 401 },
      );
    }

    // Ensure the token's tenantId still matches the user's tenant
    if (user.tenantId !== payload.tenantId) {
      return NextResponse.json(
        { error: "Token is no longer valid." },
        { status: 401 },
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
        email: user.tenant.email,
        phone: user.tenant.phone,
        address: user.tenant.address,
        logo: user.tenant.logo,
        plan: user.tenant.plan,
        status: user.tenant.status,
        createdAt: user.tenant.createdAt,
      },
    });
  } catch (error) {
    console.error("Auth me error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}