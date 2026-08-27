import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/admin/content
// Body: { topicId, type, url, fileName, uploadedById }
//
// Called after either:
//  - a file has already been uploaded via /api/admin/content/upload (handout/document), or
//  - an admin pasted a Bunny Stream link directly (video)
//
// Marks any existing current asset of the same type on this topic as no longer
// current, rather than deleting it — that history is what "updated material"
// means: the old version stays queryable, it just isn't shown to employees anymore.
export async function POST(req: NextRequest) {
  const { topicId, type, url, fileName, uploadedById } = await req.json();

  if (!topicId || !type || !url || !uploadedById) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  await db.contentAsset.updateMany({
    where: { topicId, type, isCurrent: true },
    data: { isCurrent: false },
  });

  const asset = await db.contentAsset.create({
    data: { topicId, type, url, fileName: fileName ?? "linked-video", uploadedById, isCurrent: true },
  });

  return NextResponse.json({ ok: true, asset });
}

// GET /api/admin/content?topicId=...
// Returns the full version history for a topic — current asset first, then
// everything it replaced, most recent first.
export async function GET(req: NextRequest) {
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
