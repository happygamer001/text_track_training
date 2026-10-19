import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminApi } from "@/lib/adminSession";
import { updateTopicSchema } from "@/lib/curriculumSchemas";
import { topicDeleteBlockers } from "@/lib/curriculumRules";

// PATCH /api/admin/topics/:id — edit a topic's wording, category, format or week.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(req);
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const parsed = updateTopicSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const data = parsed.data;

  const topic = await db.topic.findUnique({ where: { id } });
  if (!topic) return NextResponse.json({ error: "That topic no longer exists." }, { status: 404 });

  if (data.weekNumber !== topic.weekNumber) {
    const clash = await db.topic.findFirst({
      where: { trackId: topic.trackId, weekNumber: data.weekNumber, id: { not: id } },
    });
    if (clash) {
      return NextResponse.json(
        { error: `Week ${data.weekNumber} already has a topic in this track ("${clash.title}").` },
        { status: 409 }
      );
    }
  }

  const updated = await db.topic.update({
    where: { id },
    data: { ...data, videoFormat: data.videoFormat ?? null },
  });
  await db.auditLog.create({ data: { adminId: auth.admin.id, action: "topic.edit", targetId: id } });
  return NextResponse.json({ topic: updated });
}

// DELETE /api/admin/topics/:id — super admins only; refused if anyone is on that
// week, or progress/handouts/videos are attached.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(req, { role: "SUPER_ADMIN" });
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const topic = await db.topic.findUnique({ where: { id } });
  if (!topic) return NextResponse.json({ error: "That topic no longer exists." }, { status: 404 });

  const [onThisWeek, progress, assets] = await Promise.all([
    db.employee.count({
      where: { trackId: topic.trackId, currentTopic: topic.weekNumber, status: { not: "SEPARATED" } },
    }),
    db.topicProgress.count({ where: { topicId: id } }),
    db.contentAsset.count({ where: { topicId: id } }),
  ]);
  const blockers = topicDeleteBlockers(topic.weekNumber, { onThisWeek, progress, assets });
  if (blockers.length) {
    return NextResponse.json({ error: `Can't delete "${topic.title}". ${blockers.join(" ")}` }, { status: 409 });
  }

  await db.topic.delete({ where: { id } });
  await db.auditLog.create({
    data: { adminId: auth.admin.id, action: `topic.delete:week ${topic.weekNumber} ${topic.title}`.slice(0, 120), targetId: id },
  });
  return NextResponse.json({ ok: true });
}
