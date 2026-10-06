import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { findAdmin } from "@/lib/adminAuth";
import { createTrackSchema } from "@/lib/curriculumSchemas";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createTrackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const admin = await findAdmin(parsed.data.adminId);
  if (!admin) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const duplicate = await db.track.findFirst({
    where: { name: { equals: parsed.data.name, mode: "insensitive" } },
  });
  if (duplicate) {
    return NextResponse.json({ error: "A track with that name already exists." }, { status: 409 });
  }

  const track = await db.track.create({ data: { name: parsed.data.name } });
  await db.auditLog.create({
    data: { adminId: admin.id, action: "track.create", targetId: track.id },
  });
  return NextResponse.json({ track });
}
