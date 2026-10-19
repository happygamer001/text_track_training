import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminApi } from "@/lib/adminSession";
import { updateTrackSchema } from "@/lib/curriculumSchemas";
import { trackDeleteBlockers } from "@/lib/curriculumRules";

// PATCH /api/admin/tracks/:id — rename a track.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(req);
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const parsed = updateTrackSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  if (!(await db.track.findUnique({ where: { id } }))) {
    return NextResponse.json({ error: "That track no longer exists." }, { status: 404 });
  }
  const duplicate = await db.track.findFirst({
    where: { id: { not: id }, name: { equals: parsed.data.name, mode: "insensitive" } },
  });
  if (duplicate) {
    return NextResponse.json({ error: "A track with that name already exists." }, { status: 409 });
  }

  const track = await db.track.update({ where: { id }, data: { name: parsed.data.name } });
  await db.auditLog.create({ data: { adminId: auth.admin.id, action: "track.rename", targetId: id } });
  return NextResponse.json({ track });
}

// DELETE /api/admin/tracks/:id — super admins only. Deletes the track and its
// topics, but only if nobody is on it and nothing is attached to its topics.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(req, { role: "SUPER_ADMIN" });
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const track = await db.track.findUnique({ where: { id }, include: { topics: { select: { id: true } } } });
  if (!track) return NextResponse.json({ error: "That track no longer exists." }, { status: 404 });

  const topicIds = track.topics.map((t) => t.id);
  const [employees, progress, assets] = await Promise.all([
    db.employee.count({ where: { trackId: id } }),
    topicIds.length ? db.topicProgress.count({ where: { topicId: { in: topicIds } } }) : Promise.resolve(0),
    topicIds.length ? db.contentAsset.count({ where: { topicId: { in: topicIds } } }) : Promise.resolve(0),
  ]);
  const blockers = trackDeleteBlockers({ employees, progress, assets });
  if (blockers.length) {
    return NextResponse.json({ error: `Can't delete "${track.name}". ${blockers.join(" ")}` }, { status: 409 });
  }

  await db.$transaction([
    db.topic.deleteMany({ where: { trackId: id } }),
    db.track.delete({ where: { id } }),
  ]);
  await db.auditLog.create({
    data: { adminId: auth.admin.id, action: `track.delete:${track.name} (${topicIds.length} topics)`, targetId: id },
  });
  return NextResponse.json({ ok: true });
}
