import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { issueOtp } from "@/lib/otp";
import { checkRateLimit } from "@/lib/rateLimit";
import { sendSms } from "@/lib/twilio";

// POST /api/auth/request-code
// Body: { phone: string }
export async function POST(req: NextRequest) {
  const { phone } = await req.json();

  const rate = checkRateLimit(`otp:${phone}`);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429 }
    );
  }

  const employee = await db.employee.findUnique({ where: { phone } });

  // Deliberately vague response either way — don't reveal whether a phone number
  // is enrolled, to avoid leaking who's in the system.
  if (!employee) {
    return NextResponse.json({ ok: true });
  }

  const code = await issueOtp(employee.id);

  await sendSms({
    to: phone,
    body: `Your TextTrack login code is ${code}. It expires in 10 minutes. Never share this code.`,
  });

  return NextResponse.json({ ok: true });
}
