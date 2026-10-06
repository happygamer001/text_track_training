import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminApi } from "@/lib/adminSession";
import { sendSms } from "@/lib/twilio";
import { checkLimit } from "@/lib/rateLimit";

// Re-sends the "Reply YES" text — only to someone who has already ticked the
// SMS consent box themselves and hasn't confirmed yet.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApi(req);
  if ("error" in auth) return auth.error;
  const { admin } = auth;
  const { id } = await params;

  const employee = await db.employee.findUnique({ where: { id }, include: { consent: true } });
  if (!employee) {
    return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  }
  if (employee.status === "SEPARATED") {
    return NextResponse.json({ error: "This employee is marked separated." }, { status: 400 });
  }
  if (!employee.consent?.smsConsent) {
    return NextResponse.json(
      { error: "This person hasn't opted in to texts, so nothing can be sent." },
      { status: 400 }
    );
  }
  if (employee.consent.doubleOptInAt) {
    return NextResponse.json({ error: "They already replied YES." }, { status: 400 });
  }
  if (!checkLimit(`resend:${id}`, 1, 10 * 60 * 1000).allowed) {
    return NextResponse.json({ error: "Already re-sent a moment ago. Wait 10 minutes." }, { status: 429 });
  }

  try {
    await sendSms({
      to: employee.phone,
      body: "Reply YES to start receiving TextTrack training texts. Msg frequency varies, msg & data rates may apply. Reply HELP for help, STOP to cancel.",
    });
  } catch {
    return NextResponse.json(
      { error: "Twilio couldn't send it (the number may have replied STOP or be invalid). Check Twilio's message log." },
      { status: 502 }
    );
  }

  await db.auditLog.create({ data: { adminId: admin.id, action: "employee.resend_optin", targetId: id } });
  return NextResponse.json({ ok: true });
}
