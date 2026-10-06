import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword, dummyVerify } from "@/lib/password";
import { generateTotpSecret, otpauthUri } from "@/lib/totp";
import { PENDING_COOKIE, PENDING_MINUTES, cookieBase, signToken } from "@/lib/session";
import { checkLimit } from "@/lib/rateLimit";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
});

// Step 1 of 2: email + password. On success we do NOT sign the admin in yet —
// we hand back a short-lived "pending" cookie and ask for the authenticator code.
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  }
  const { email, password } = parsed.data;

  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    return NextResponse.json(
      { error: "Login isn't configured yet (SESSION_SECRET is missing on the server)." },
      { status: 500 }
    );
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const tenMin = 10 * 60 * 1000;
  if (!checkLimit(`login-email:${email}`, 8, tenMin).allowed || !checkLimit(`login-ip:${ip}`, 20, tenMin).allowed) {
    return NextResponse.json({ error: "Too many attempts. Wait a few minutes and try again." }, { status: 429 });
  }

  const admin = await db.admin.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  const ok = admin ? await verifyPassword(password, admin.passwordHash) : (await dummyVerify(password), false);
  if (!admin || !ok) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  const enrolling = !admin.mfaSecret;
  const setupSecret = enrolling ? generateTotpSecret() : undefined;
  const token = await signToken({ sub: admin.id, purpose: "mfa", setupSecret }, `${PENDING_MINUTES}m`);

  const res = NextResponse.json(
    enrolling
      ? { step: "setup", secret: setupSecret, otpauthUri: otpauthUri(setupSecret!, admin.email) }
      : { step: "mfa" }
  );
  res.cookies.set(PENDING_COOKIE, token, { ...cookieBase, maxAge: PENDING_MINUTES * 60 });
  return res;
}
