import crypto from "crypto";
import { db } from "./db";

// Security parameters — see the Security & Content Architecture PDF for the reasoning
// behind each of these numbers.
const CODE_LENGTH = 6; // 1,000,000 possible codes — 4-digit (10,000) is too easy to brute force
const EXPIRY_MINUTES = 10; // NIST SP 800-63B-4 hard ceiling for SMS/voice out-of-band codes
const MAX_ATTEMPTS = 5; // failed guesses allowed before the code is invalidated

function generateCode(): string {
  // Cryptographically random, not Math.random() — this is a security boundary.
  const n = crypto.randomInt(0, 10 ** CODE_LENGTH);
  return n.toString().padStart(CODE_LENGTH, "0");
}

function hashCode(code: string): string {
  // Never store the raw code. A hash means a database leak alone doesn't hand out
  // valid login codes.
  return crypto.createHash("sha256").update(code).digest("hex");
}

export async function issueOtp(employeeId: string): Promise<string> {
  // TODO: enforce rate limiting here via lib/rateLimit.ts before issuing a new code —
  // e.g. max 5 requests per phone number per hour, per Twilio/NIST guidance.

  const code = generateCode();
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000);

  // Issuing a new code invalidates any prior unconsumed code for this employee —
  // only the most recently issued code should ever be valid.
  await db.otpCode.updateMany({
    where: { employeeId, consumedAt: null },
    data: { consumedAt: new Date() }, // mark stale codes as consumed/dead
  });

  await db.otpCode.create({
    data: { employeeId, codeHash, expiresAt },
  });

  return code; // caller is responsible for sending this via SMS — never log it
}

export async function verifyOtp(
  employeeId: string,
  submittedCode: string
): Promise<{ ok: boolean; reason?: string }> {
  const record = await db.otpCode.findFirst({
    where: { employeeId, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!record) return { ok: false, reason: "no_active_code" };
  if (record.expiresAt < new Date()) return { ok: false, reason: "expired" };
  if (record.attempts >= MAX_ATTEMPTS) return { ok: false, reason: "too_many_attempts" };

  const match = hashCode(submittedCode) === record.codeHash;

  if (!match) {
    await db.otpCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, reason: "incorrect_code" };
  }

  await db.otpCode.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });

  // TODO: issue a signed session token here (see lib/auth.ts) and return it to the caller.
  return { ok: true };
}
