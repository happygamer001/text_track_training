import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PENDING_COOKIE, SESSION_COOKIE, cookieBase, verifyToken } from "@/lib/session";

export async function POST(req: NextRequest) {
  const payload = await verifyToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (payload?.purpose === "session") {
    await db.auditLog
      .create({ data: { adminId: payload.sub, action: "auth.logout" } })
      .catch(() => {});
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { ...cookieBase, maxAge: 0 });
  res.cookies.set(PENDING_COOKIE, "", { ...cookieBase, maxAge: 0 });
  return res;
}
