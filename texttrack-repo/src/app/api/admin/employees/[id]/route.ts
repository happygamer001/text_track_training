import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminApi } from "@/lib/adminSession";
import { updateEmployeeSchema } from "@/lib/employeeSchemas";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApi(req);
  if ("error" in auth) return auth.error;
  const { admin } = auth;
  const { id } = await params;

  const parsed = updateEmployeeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { trackId, status } = parsed.data;

  const employee = await db.employee.findUnique({ where: { id } });
  if (!employee) {
    return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  }

  if (trackId && !(await db.track.findUnique({ where: { id: trackId } }))) {
    return NextResponse.json({ error: "That track no longer exists." }, { status: 404 });
  }

  await db.employee.update({
    where: { id },
    data: {
      ...(trackId ? { trackId, currentTopic: 1 } : {}), // new track starts at week 1
      ...(status ? { status } : {}),
    },
  });

  if (trackId && trackId !== employee.trackId) {
    await db.auditLog.create({ data: { adminId: admin.id, action: `employee.track_change:${trackId}`, targetId: id } });
  }
  if (status && status !== employee.status) {
    await db.auditLog.create({ data: { adminId: admin.id, action: `employee.status_change:${status}`, targetId: id } });
  }

  return NextResponse.json({ ok: true });
}
