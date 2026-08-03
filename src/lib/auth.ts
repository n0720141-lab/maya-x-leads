import crypto from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = "mayax-leads-secret-key-2024";

const encoder = new TextEncoder();
const secretKey = encoder.encode(JWT_SECRET);

// ---------- password hashing (scrypt) ----------

const SCRYPT_KEYLEN = 64;
const SCRYPT_COST = 16384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELISM = 1;

export function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(
      password,
      salt,
      SCRYPT_KEYLEN,
      { N: SCRYPT_COST, r: SCRYPT_BLOCK_SIZE, p: SCRYPT_PARALLELISM },
      (err, derivedKey) => {
        if (err) return reject(err);
        resolve(`${salt}:${derivedKey.toString("hex")}`);
      },
    );
  });
}

export function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(":");
    if (!salt || !key) return resolve(false);

    crypto.scrypt(
      password,
      salt,
      SCRYPT_KEYLEN,
      { N: SCRYPT_COST, r: SCRYPT_BLOCK_SIZE, p: SCRYPT_PARALLELISM },
      (err, derivedKey) => {
        if (err) return reject(err);
        resolve(derivedKey.toString("hex") === key);
      },
    );
  });
}

// ---------- JWT (jose) ----------

export interface TokenPayload {
  userId: string;
  tenantId: string;
  role: string;
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

export async function verifyToken(
  token: string,
): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return {
      userId: payload.userId as string,
      tenantId: payload.tenantId as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}