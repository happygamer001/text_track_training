import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendSms } from "@/lib/twilio";

// POST /api/consent
// Body: { employeeId: string, smsConsent: boolean }
//
// This is the endpoint behind the "SMS consent screen" step in the enrollment flow.
// Whether smsConsent is true or false, enrollment completes either way — see the
// Security & Content Architecture PDF for why that matters for Twilio's campaign review.
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
    // Double opt-in: the employee's reply here is the carrier-visible proof of consent.
    await sendSms({
      to: employee.phone,
      body: "Reply YES to start receiving TextTrack training texts. Msg & data rates may apply. Reply STOP to cancel.",
    });
  }

  return NextResponse.json({ ok: true });
}
