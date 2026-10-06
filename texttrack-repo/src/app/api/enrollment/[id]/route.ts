import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const employee = await db.employee.findUnique({
    where: { id },
    include: { track: true },
  });

  if (!employee) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: employee.id,
    firstName: employee.firstName,
    lastName: employee.lastName,
    phone: employee.phone,
    trackName: employee.track?.name ?? null,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { firstName, lastName, phone } = await req.json();

  const existing = await db.employee.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.employee.update({
    where: { id },
    data: {
      firstName,
      lastName,
      ...(phone ? { phone: normalizePhone(phone) } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
