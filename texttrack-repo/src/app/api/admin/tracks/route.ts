import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminApi } from "@/lib/adminSession";
import { createTrackSchema } from "@/lib/curriculumSchemas";

export async function POST(req: NextRequest) {
  const auth = await requireAdminApi(req);
  if ("error" in auth) return auth.error;
  const { admin } = auth;

  const parsed = createTrackSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
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
