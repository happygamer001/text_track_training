import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";

// POST /api/enrollment/start
// Body: { firstName, lastName, phone, trackId }
//
// This is the public entry point — anyone with the link can submit this form,
// no admin pre-fill required. It only creates the account; SMS consent is
// still captured as its own separate step on /enroll/consent right after,
// exactly like the admin-initiated flow. This route never sends a text.
export async function POST(req: NextRequest) {
  const { firstName, lastName, phone, trackId } = await req.json();

  if (!firstName || !lastName || !phone || !trackId) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  const normalizedPhone = normalizePhone(phone);

  const existing = await db.employee.findUnique({ where: { phone: normalizedPhone } });
  if (existing) {
    // Already have a record for this number (e.g. an admin pre-filled it, or
    // they started this form once before) — update it rather than erroring.
    const updated = await db.employee.update({
      where: { id: existing.id },
      data: { firstName, lastName, trackId },
    });
    return NextResponse.json({ employeeId: updated.id });
  }

  const employee = await db.employee.create({
    data: { firstName, lastName, phone: normalizedPhone, trackId, status: "PRE_ENROLLED" },
  });

  return NextResponse.json({ employeeId: employee.id });
}
