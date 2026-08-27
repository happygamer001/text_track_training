import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/enrollment/[id] — fetch the pre-filled profile for the Confirm screen
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

// PATCH /api/enrollment/[id] — save corrections made on the Confirm screen
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { firstName, lastName, phone } = await req.json();

  await db.employee.update({
    where: { id },
    data: { firstName, lastName, phone },
  });

  return NextResponse.json({ ok: true });
}

// TODO: this endpoint currently trusts a raw employee id passed in the URL.
// Before production, the invite link should carry a signed, single-use,
// expiring token instead — the server resolves the token to an employee id,
// so a guessed/shared URL can't be used to view or edit someone else's
// pre-enrollment profile.
