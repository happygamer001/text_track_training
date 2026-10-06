import { SignJWT, jwtVerify } from "jose";

// Edge-safe (used by middleware): only `jose`, no Node-only imports here.

export const SESSION_COOKIE = "tt_admin_session";
export const PENDING_COOKIE = "tt_admin_pending";
export const SESSION_HOURS = 8;
export const PENDING_MINUTES = 5;

export type TokenPayload = {
  sub: string; // admin id
  purpose: "session" | "mfa";
  setupSecret?: string; // only on "mfa" tokens while enrolling a new authenticator
};

function key(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET is missing or shorter than 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

export async function signToken(payload: TokenPayload, expiresIn: string): Promise<string> {
  return new SignJWT({ purpose: payload.purpose, setupSecret: payload.setupSecret })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key());
}

// Returns null for anything missing, expired, tampered with, or if the
// server secret isn't configured — callers treat null as "not signed in".
export async function verifyToken(token: string | undefined): Promise<TokenPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    if (!payload.sub) return null;
    if (payload.purpose !== "session" && payload.purpose !== "mfa") return null;
    return {
      sub: payload.sub,
      purpose: payload.purpose,
      setupSecret: typeof payload.setupSecret === "string" ? payload.setupSecret : undefined,
    };
  } catch {
    return null;
  }
}

export const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};
