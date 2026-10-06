import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { findAdmin } from "@/lib/adminAuth";
import { createTopicSchema } from "@/lib/curriculumSchemas";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createTopicSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { adminId, ...data } = parsed.data;

  const admin = await findAdmin(adminId);
  if (!admin) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const track = await db.track.findUnique({ where: { id: data.trackId } });
  if (!track) {
    return NextResponse.json({ error: "That track no longer exists." }, { status: 404 });
  }

  const duplicate = await db.topic.findFirst({
    where: { trackId: data.trackId, weekNumber: data.weekNumber },
  });
  if (duplicate) {
    return NextResponse.json(
      { error: `Week ${data.weekNumber} already has a topic in this track ("${duplicate.title}").` },
      { status: 409 }
    );
  }

  const topic = await db.topic.create({ data });
  await db.auditLog.create({
    data: { adminId: admin.id, action: "topic.create", targetId: topic.id },
  });
  return NextResponse.json({ topic });
}
