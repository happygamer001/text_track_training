import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendSms } from "@/lib/twilio";

// POST /api/consent
// Body: { employeeId: string, smsConsent: boolean }
//
// Whether smsConsent is true or false, enrollment completes either way.
// SMS consent and agreeing to the Terms/Privacy Policy are two entirely
// separate actions — this route only ever handles the SMS side. Agreeing
// to the Terms is a client-side acknowledgment only, and is never itself
// treated as SMS consent, consistent with Error 30923's requirement that
// messaging consent not be bundled with required service terms.
export async function POST(req: NextRequest) {
  const { employeeId, smsConsent } = await req.json();
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";

  await db.consentRecord.upsert({
    where: { employeeId },
    create: {
      employeeId,
      smsConsent,
      consentedAt: smsConsent ? new Date() : null,
      ipAddress: ip,
      method: "web_form",
    },
    update: {
      smsConsent,
      consentedAt: smsConsent ? new Date() : null,
      ipAddress: ip,
    },
  });

  await db.employee.update({
    where: { id: employeeId },
    data: { status: "ACTIVE" },
  });

  if (smsConsent) {
    const employee = await db.employee.findUniqueOrThrow({ where: { id: employeeId } });
    await sendSms({
      to: employee.phone,
      body: "Reply YES to start receiving TextTrack training texts. Msg frequency varies, msg & data rates may apply. Reply HELP for help, STOP to cancel.",
    });
  }

  return NextResponse.json({ ok: true });
}
