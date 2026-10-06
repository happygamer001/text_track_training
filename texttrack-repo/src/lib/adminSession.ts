import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { AdminRole } from "@prisma/client";
import { db } from "@/lib/db";
import { SESSION_COOKIE, verifyToken } from "@/lib/session";

async function adminFromToken(token: string | undefined) {
  const payload = await verifyToken(token);
  if (!payload || payload.purpose !== "session") return null;
  // Look the admin up every time so removing an admin takes effect immediately.
  const admin = await db.admin.findUnique({
    where: { id: payload.sub },
    select: { id: true, name: true, email: true, role: true },
  });
  return admin;
}

// For server components / pages.
export async function getSessionAdmin() {
  const store = await cookies();
  return adminFromToken(store.get(SESSION_COOKIE)?.value);
}

// For API routes. Usage:
//   const auth = await requireAdminApi(req);
//   if ("error" in auth) return auth.error;
//   const { admin } = auth;
export async function requireAdminApi(
  req: NextRequest,
  opts: { role?: AdminRole } = {}
): Promise<{ admin: NonNullable<Awaited<ReturnType<typeof adminFromToken>>> } | { error: NextResponse }> {
  // Basic CSRF defence on top of SameSite cookies: a browser-sent Origin must
  // match this site for any state-changing request.
  if (req.method !== "GET" && req.method !== "HEAD") {
    const origin = req.headers.get("origin");
    if (origin) {
      let originHost = "";
      try {
        originHost = new URL(origin).host;
      } catch {}
      if (originHost !== req.headers.get("host")) {
        return { error: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
      }
    }
  }

  const admin = await adminFromToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!admin) {
    return { error: NextResponse.json({ error: "Not authorized." }, { status: 401 }) };
  }
  if (opts.role && admin.role !== opts.role && admin.role !== "SUPER_ADMIN") {
    return { error: NextResponse.json({ error: "You don't have permission to do that." }, { status: 403 }) };
  }
  return { admin };
}
