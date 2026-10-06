import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminApi } from "@/lib/adminSession";
import { normalizePhone } from "@/lib/phone";
import { addEmployeeSchema } from "@/lib/employeeSchemas";

// Admin adds someone to the roster. No text is sent and no consent is
// recorded — the employee still has to open their link and opt in themselves.
export async function POST(req: NextRequest) {
  const auth = await requireAdminApi(req);
  if ("error" in auth) return auth.error;
  const { admin } = auth;

  const parsed = addEmployeeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { firstName, lastName, phone, trackId } = parsed.data;

  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) {
    return NextResponse.json({ error: "That doesn't look like a valid phone number." }, { status: 400 });
  }
  const normalized = normalizePhone(phone);

  if (!(await db.track.findUnique({ where: { id: trackId } }))) {
    return NextResponse.json({ error: "That track no longer exists." }, { status: 404 });
  }
  if (await db.employee.findUnique({ where: { phone: normalized } })) {
    return NextResponse.json({ error: "Someone with that phone number is already on the roster." }, { status: 409 });
  }

  const employee = await db.employee.create({
    data: { firstName, lastName, phone: normalized, trackId, status: "PRE_ENROLLED" },
  });
  await db.auditLog.create({
    data: { adminId: admin.id, action: "employee.add", targetId: employee.id },
  });
  return NextResponse.json({ employee: { id: employee.id } });
}
