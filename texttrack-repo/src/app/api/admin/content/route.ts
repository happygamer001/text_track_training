import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminApi } from "@/lib/adminSession";

// POST /api/admin/content
// Body: { topicId, type, url, fileName }   (uploader = the signed-in admin)
//
// Called after either:
//  - a file has already been uploaded via /api/admin/content/upload (handout/document), or
//  - an admin pasted a Bunny Stream link directly (video)
//
// Marks any existing current asset of the same type on this topic as no longer
// current, rather than deleting it — that history is what "updated material"
// means: the old version stays queryable, it just isn't shown to employees anymore.
export async function POST(req: NextRequest) {
  const auth = await requireAdminApi(req);
  if ("error" in auth) return auth.error;
  const { admin } = auth;

  const { topicId, type, url, fileName } = (await req.json().catch(() => ({}))) as Record<string, string>;

  if (!topicId || !type || !url) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  await db.contentAsset.updateMany({
    where: { topicId, type, isCurrent: true },
    data: { isCurrent: false },
  });

  const asset = await db.contentAsset.create({
    data: { topicId, type, url, fileName: fileName ?? "linked-video", uploadedById: admin.id, isCurrent: true },
  });

  await db.auditLog.create({
    data: { adminId: admin.id, action: `content.upload:${type}`, targetId: topicId },
  });

  return NextResponse.json({ ok: true, asset });
}

// GET /api/admin/content?topicId=...
// Returns the full version history for a topic — current asset first, then
// everything it replaced, most recent first.
export async function GET(req: NextRequest) {
  const auth = await requireAdminApi(req);
  if ("error" in auth) return auth.error;

  const topicId = req.nextUrl.searchParams.get("topicId");
  if (!topicId) {
    return NextResponse.json({ error: "topicId is required" }, { status: 400 });
  }

  const assets = await db.contentAsset.findMany({
    where: { topicId },
    orderBy: [{ isCurrent: "desc" }, { createdAt: "desc" }],
    include: { uploadedBy: { select: { name: true } } },
  });

  return NextResponse.json({ assets });
}
