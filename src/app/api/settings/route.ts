import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { randomBytes } from "crypto";

/**
 * GET /api/settings
 * Returns ALL settings: profile, business, notifications, api key, webhook
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.success) return auth.response;
    const { userId, tenantId } = auth;

    // Fetch user profile
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    // Fetch business/tenant info
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true, name: true, email: true, phone: true, address: true,
        slug: true, logo: true, plan: true, status: true, createdAt: true,
      },
    });

    // Fetch notification settings from GlobalConfig
    const notifConfig = await db.globalConfig.findUnique({
      where: { key: `tenant:${tenantId}:notifications` },
    });
    const notifications = notifConfig
      ? JSON.parse(notifConfig.value)
      : {
          "new-lead": true,
          "qualified-lead": true,
          "appointment-set": true,
          "campaign-completed": true,
          "message-failed": true,
          "webhook-failed": true,
        };

    // Fetch or generate API key
    let apiKeyConfig = await db.globalConfig.findUnique({
      where: { key: `tenant:${tenantId}:api_key` },
    });
    let apiKey = "";
    let apiKeyMasked = "";
    if (apiKeyConfig) {
      apiKey = apiKeyConfig.value;
      apiKeyMasked = maskApiKey(apiKey);
    } else {
      // Generate a new API key
      apiKey = `mx_live_${randomBytes(24).toString("base64url")}`;
      await db.globalConfig.create({
        data: {
          key: `tenant:${tenantId}:api_key`,
          value: apiKey,
          description: "Tenant API key for external integrations",
        },
      });
      apiKeyMasked = maskApiKey(apiKey);
    }

    // Fetch timezone and language settings
    const tzConfig = await db.globalConfig.findUnique({
      where: { key: `tenant:${tenantId}:timezone` },
    });
    const langConfig = await db.globalConfig.findUnique({
      where: { key: `tenant:${tenantId}:language` },
    });

    // Fetch webhook config
    const webhook = await db.webhookConfig.findUnique({
      where: { tenantId },
    });

    return NextResponse.json({
      profile: user,
      business: tenant,
      notifications,
      apikey: {
        masked: apiKeyMasked,
        full: apiKey,
        created: apiKeyConfig?.createdAt || new Date().toISOString(),
      },
      timezone: tzConfig?.value || "america_new_york",
      language: langConfig?.value || "en",
      webhook: webhook ? {
        url: webhook.url,
        secret: webhook.secret,
        events: webhook.events,
        active: webhook.active,
      } : null,
    });
  } catch (error) {
    console.error("Settings GET error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * PUT /api/settings
 * Body: { section: 'profile'|'business'|'notifications'|'password'|'api_key'|'preferences', ...data }
 */
export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.success) return auth.response;
    const { userId, tenantId } = auth;

    const body = await req.json();
    const { section } = body as { section: string };

    switch (section) {
      // ============ UPDATE PROFILE ============
      case "profile": {
        const { name } = body as { name?: string };
        if (!name?.trim()) {
          return NextResponse.json({ error: "Name is required." }, { status: 400 });
        }

        const user = await db.user.update({
          where: { id: userId },
          data: { name: name.trim() },
          select: { id: true, name: true, email: true, role: true, createdAt: true },
        });

        return NextResponse.json({ success: true, profile: user });
      }

      // ============ UPDATE BUSINESS ============
      case "business": {
        const { name, email, phone, address } = body as {
          name?: string; email?: string; phone?: string; address?: string;
        };

        const updateData: Record<string, string | null> = {};
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone || null;
        if (address !== undefined) updateData.address = address || null;

        if (Object.keys(updateData).length === 0) {
          return NextResponse.json({ error: "No fields to update." }, { status: 400 });
        }

        const tenant = await db.tenant.update({
          where: { id: tenantId },
          data: updateData,
          select: {
            id: true, name: true, email: true, phone: true, address: true,
            slug: true, logo: true, plan: true, status: true, createdAt: true,
          },
        });

        return NextResponse.json({ success: true, business: tenant });
      }

      // ============ UPDATE NOTIFICATIONS ============
      case "notifications": {
        const { notifications } = body as { notifications: Record<string, boolean> };

        await db.globalConfig.upsert({
          where: { key: `tenant:${tenantId}:notifications` },
          update: { value: JSON.stringify(notifications) },
          create: {
            key: `tenant:${tenantId}:notifications`,
            value: JSON.stringify(notifications),
            description: "Notification preferences",
          },
        });

        return NextResponse.json({ success: true, notifications });
      }

      // ============ CHANGE PASSWORD ============
      case "password": {
        const { currentPassword, newPassword } = body as {
          currentPassword?: string; newPassword?: string;
        };

        if (!currentPassword || !newPassword) {
          return NextResponse.json(
            { error: "Current password and new password are required." },
            { status: 400 },
          );
        }
        if (newPassword.length < 6) {
          return NextResponse.json(
            { error: "New password must be at least 6 characters." },
            { status: 400 },
          );
        }

        const user = await db.user.findUnique({ where: { id: userId } });
        if (!user) {
          return NextResponse.json({ error: "User not found." }, { status: 404 });
        }

        // Verify current password
        const valid = await verifyPassword(currentPassword, user.passwordHash);
        if (!valid) {
          return NextResponse.json(
            { error: "Current password is incorrect." },
            { status: 400 },
          );
        }

        // Update to new password
        await db.user.update({
          where: { id: userId },
          data: { passwordHash: await hashPassword(newPassword) },
        });

        return NextResponse.json({ success: true, message: "Password updated successfully." });
      }

      // ============ REGENERATE API KEY ============
      case "api_key": {
        const newKey = `mx_live_${randomBytes(24).toString("base64url")}`;

        await db.globalConfig.upsert({
          where: { key: `tenant:${tenantId}:api_key` },
          update: { value: newKey },
          create: {
            key: `tenant:${tenantId}:api_key`,
            value: newKey,
            description: "Tenant API key for external integrations",
          },
        });

        return NextResponse.json({
          success: true,
          apikey: {
            masked: maskApiKey(newKey),
            full: newKey,
          },
        });
      }

      // ============ UPDATE PREFERENCES (timezone, language) ============
      case "preferences": {
        const { timezone, language } = body as { timezone?: string; language?: string };

        if (timezone) {
          await db.globalConfig.upsert({
            where: { key: `tenant:${tenantId}:timezone` },
            update: { value: timezone },
            create: { key: `tenant:${tenantId}:timezone`, value: timezone, description: "User timezone" },
          });
        }
        if (language) {
          await db.globalConfig.upsert({
            where: { key: `tenant:${tenantId}:language` },
            update: { value: language },
            create: { key: `tenant:${tenantId}:language`, value: language, description: "User language" },
          });
        }

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: "Unknown section. Use: profile, business, notifications, password, api_key, preferences" },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Settings PUT error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

function maskApiKey(key: string): string {
  if (key.length <= 12) return "••••••••";
  return key.slice(0, 8) + "••••••••••••••" + key.slice(-4);
}