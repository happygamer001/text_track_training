import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import twilio from "twilio";

const { MessagingResponse } = twilio.twiml;

// POST /api/sms/inbound
// Set this as the Messaging Service's inbound webhook URL in the Twilio
// Console. Twilio sends application/x-www-form-urlencoded with "From" and
// "Body" fields; this must respond with TwiML (XML), not JSON.
//
// TODO: verify the request actually came from Twilio (X-Twilio-Signature
// header) before trusting it, using twilio.validateRequest — omitted here to
// keep the skeleton readable, but required before this goes live.
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const from = (formData.get("From") as string) ?? "";
  const body = ((formData.get("Body") as string) ?? "").trim().toUpperCase();

  const twiml = new MessagingResponse();

  if (body === "JOIN") {
    let employee = await db.employee.findUnique({ where: { phone: from } });

    if (!employee) {
      // A genuinely new, public opt-in — texting JOIN with no prior record at
      // all. Create a bare shell now; they fill in name/track on the web
      // right after, same as the admin-prefilled flow does.
      employee = await db.employee.create({
        data: { firstName: "", lastName: "", phone: from, status: "PRE_ENROLLED" },
      });
    }

    // The JOIN text itself is the opt-in action — record it as such rather
    // than waiting for a separate web confirmation.
    await db.consentRecord.upsert({
      where: { employeeId: employee.id },
      create: {
        employeeId: employee.id,
        smsConsent: true,
        consentedAt: new Date(),
        doubleOptInAt: new Date(),
        method: "sms_keyword",
      },
      update: {
        smsConsent: true,
        consentedAt: new Date(),
        doubleOptInAt: new Date(),
      },
    });

    await db.employee.update({ where: { id: employee.id }, data: { status: "ACTIVE" } });

    const finishUrl = `${process.env.PUBLIC_APP_URL}/enroll/confirm?id=${employee.id}`;
    twiml.message(
      `You're enrolled in TextTrack! Finish setting up your profile: ${finishUrl} Msg & data rates may apply. Reply STOP to cancel.`
    );
  } else if (body === "STOP") {
    // Twilio's own carrier-level opt-out (if Advanced Opt-Out is on for the
    // Messaging Service) may intercept this before it even reaches here —
    // this is a defensive fallback so our own DB stays in sync either way.
    const employee = await db.employee.findUnique({ where: { phone: from } });
    if (employee) {
      await db.consentRecord.updateMany({
        where: { employeeId: employee.id },
        data: { smsConsent: false },
      });
    }
    // No twiml.message() here — avoid a duplicate reply if Twilio already sent one.
  } else if (body === "START") {
    const employee = await db.employee.findUnique({ where: { phone: from } });
    if (employee) {
      await db.consentRecord.updateMany({
        where: { employeeId: employee.id },
        data: { smsConsent: true, consentedAt: new Date() },
      });
    }
    twiml.message("You're back in! You'll start receiving TextTrack messages again.");
  }
  // Any other inbound text: no auto-reply. A real question from an employee
  // needs a person, not a bot — see the admin Comments feature for routing
  // that to a human once it's built.

  return new NextResponse(twiml.toString(), {
    headers: { "Content-Type": "text/xml" },
  });
}
