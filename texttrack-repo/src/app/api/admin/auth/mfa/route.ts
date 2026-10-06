import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyTotp } from "@/lib/totp";
import {
  PENDING_COOKIE,
  SESSION_COOKIE,
  SESSION_HOURS,
  cookieBase,
  signToken,
  verifyToken,
} from "@/lib/session";
import { checkLimit } from "@/lib/rateLimit";

const schema = z.object({ code: z.string().trim().min(6).max(8) });

// Step 2 of 2: the 6-digit authenticator code. First-ever login for an admin
// also enrolls the authenticator (the secret from step 1 is saved only once
// the admin proves they can generate a valid code from it).
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
  }

  const pending = await verifyToken(req.cookies.get(PENDING_COOKIE)?.value);
  if (!pending || pending.purpose !== "mfa") {
    return NextResponse.json({ error: "That sign-in expired. Start again." }, { status: 401 });
  }

  if (!checkLimit(`mfa:${pending.sub}`, 6, 15 * 60 * 1000).allowed) {
    return NextResponse.json({ error: "Too many attempts. Wait a few minutes and start again." }, { status: 429 });
  }

  const admin = await db.admin.findUnique({ where: { id: pending.sub } });
  if (!admin) {
    return NextResponse.json({ error: "That sign-in expired. Start again." }, { status: 401 });
  }

  const enrolling = !admin.mfaSecret;
  const secret = admin.mfaSecret ?? pending.setupSecret;
  if (!secret || !verifyTotp(secret, parsed.data.code)) {
    return NextResponse.json({ error: "That code didn't match. Try the newest code." }, { status: 401 });
  }

  if (enrolling) {
    // Only claim the slot if nobody enrolled in the meantime.
    const claimed = await db.admin.updateMany({
      where: { id: admin.id, mfaSecret: null },
      data: { mfaSecret: secret },
    });
    if (claimed.count === 0) {
      return NextResponse.json({ error: "Authenticator was already set up. Start again." }, { status: 409 });
    }
    await db.auditLog.create({ data: { adminId: admin.id, action: "auth.mfa_enrolled" } });
  }

  await db.auditLog.create({ data: { adminId: admin.id, action: "auth.login" } });

  const session = await signToken({ sub: admin.id, purpose: "session" }, `${SESSION_HOURS}h`);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, session, { ...cookieBase, maxAge: SESSION_HOURS * 3600 });
  res.cookies.set(PENDING_COOKIE, "", { ...cookieBase, maxAge: 0 });
  return res;
}
