import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export interface AuthResult {
  success: true;
  tenantId: string;
  userId: string;
  role: string;
}
export interface AuthError {
  success: false;
  response: NextResponse;
}
export type AuthResultOrError = AuthResult | AuthError;

export async function requireAuth(req: NextRequest): Promise<AuthResultOrError> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { success: false, response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }
  const token = authHeader.replace("Bearer ", "");
  const payload = await verifyToken(token);
  if (!payload) {
    return { success: false, response: NextResponse.json({ error: "Invalid or expired token." }, { status: 401 }) };
  }
  const user = await db.user.findUnique({ where: { id: payload.userId }, include: { tenant: true } });
  if (!user) return { success: false, response: NextResponse.json({ error: "User not found." }, { status: 401 }) };
  if (user.tenant.status !== "active") return { success: false, response: NextResponse.json({ error: "Tenant suspended." }, { status: 403 }) };
  return { success: true, tenantId: payload.tenantId, userId: payload.userId, role: payload.role };
}

export async function requireRole(req: NextRequest, roles: string[]): Promise<AuthResultOrError> {
  const auth = await requireAuth(req);
  if (!auth.success) return auth;
  if (!roles.includes(auth.role)) return { success: false, response: NextResponse.json({ error: "Insufficient permissions." }, { status: 403 }) };
  return auth;
}

export interface SAAuthResult { success: true; adminId: string; adminRole: string; }
export interface SAAuthError { success: false; response: NextResponse; }
export type SAAuthResultOrError = SAAuthResult | SAAuthError;

export async function requireSuperAdmin(req: NextRequest): Promise<SAAuthResultOrError> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return { success: false, response: NextResponse.json({ error: "Auth required." }, { status: 401 }) };
  const token = authHeader.replace("Bearer ", "");
  const payload = await verifyToken(token);
  if (!payload) return { success: false, response: NextResponse.json({ error: "Invalid token." }, { status: 401 }) };
  if (payload.role !== "super_admin" || payload.tenantId !== "system") return { success: false, response: NextResponse.json({ error: "Super admin required." }, { status: 403 }) };
  const admin = await db.superAdmin.findUnique({ where: { id: payload.userId } });
  if (!admin) return { success: false, response: NextResponse.json({ error: "Admin not found." }, { status: 401 }) };
  return { success: true, adminId: admin.id, adminRole: admin.role };
}
