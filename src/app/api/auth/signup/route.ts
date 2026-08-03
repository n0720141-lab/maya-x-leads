import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, companyName } = body as {
      name: string;
      email: string;
      password: string;
      companyName: string;
    };

    if (!name || !email || !password || !companyName) {
      return NextResponse.json(
        { error: "Name, email, password, and company name are required." },
        { status: 400 },
      );
    }

    // Check for existing user with the same email in any tenant
    const existingUser = await db.user.findFirst({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists." },
        { status: 409 },
      );
    }

    // Create tenant
    const slug = companyName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    // Ensure slug uniqueness
    let uniqueSlug = slug;
    let counter = 1;
    while (await db.tenant.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    const tenant = await db.tenant.create({
      data: {
        name: companyName,
        slug: uniqueSlug,
        email: email.toLowerCase(),
      },
    });

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user (owner)
    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name,
        role: "owner",
        tenantId: tenant.id,
      },
    });

    // Create default BotConfig
    await db.botConfig.create({
      data: {
        tenantId: tenant.id,
      },
    });

    // Create default WebhookConfig
    await db.webhookConfig.create({
      data: {
        tenantId: tenant.id,
        url: "",
      },
    });

    // Create default Subscription
    await db.subscription.create({
      data: {
        tenantId: tenant.id,
      },
    });

    // Sign JWT
    const token = await signToken({
      userId: user.id,
      tenantId: tenant.id,
      role: user.role,
    });

    return NextResponse.json(
      {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
          createdAt: user.createdAt,
        },
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          email: tenant.email,
          plan: tenant.plan,
          status: tenant.status,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error. Please try again." },
      { status: 500 },
    );
  }
}