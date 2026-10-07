import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdminApi } from "@/lib/adminSession";
import { prepareRows, segmentStats } from "@/lib/curriculumImport";

const bodySchema = z.object({
  records: z.array(z.record(z.string(), z.string())).min(1, "The file has no rows.").max(1000, "Too many rows (max 1000)."),
  convertDashes: z.boolean(),
  dryRun: z.boolean(),
});

// Imports tracks and topics from the curriculum spreadsheet (as CSV).
//  - dryRun: true  -> validate and report what WOULD happen, change nothing.
//  - dryRun: false -> create missing tracks and topics.
// Existing topics (same track + week) are never overwritten, so re-running is safe.
export async function POST(req: NextRequest) {
  const auth = await requireAdminApi(req);
  if ("error" in auth) return auth.error;
  const { admin } = auth;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { records, convertDashes, dryRun } = parsed.data;

  const { rows, errors, missingHeaders, dashRows } = prepareRows(records, { convertDashes });
  if (missingHeaders.length) {
    return NextResponse.json(
      { error: `The file is missing these columns: ${missingHeaders.join(", ")}.` },
      { status: 400 }
    );
  }

  const existingTracks = await db.track.findMany({ include: { topics: { select: { weekNumber: true } } } });
  const trackByName = new Map<string, (typeof existingTracks)[number]>(
    existingTracks.map((t: (typeof existingTracks)[number]) => [t.name.toLowerCase(), t])
  );

  const perTrack = new Map<string, { name: string; exists: boolean; toAdd: number; toSkip: number }>();
  const toCreate: typeof rows = [];
  for (const r of rows) {
    const key = r.track.toLowerCase();
    const existing = trackByName.get(key);
    const entry = perTrack.get(key) ?? { name: existing?.name ?? r.track, exists: !!existing, toAdd: 0, toSkip: 0 };
    const hasWeek = existing?.topics.some((t: { weekNumber: number }) => t.weekNumber === r.week);
    if (hasWeek) entry.toSkip++;
    else {
      entry.toAdd++;
      toCreate.push(r);
    }
    perTrack.set(key, entry);
  }

  const summary = {
    tracks: Array.from(perTrack.values()),
    topicsToAdd: toCreate.length,
    topicsSkipped: rows.length - toCreate.length,
    errors,
    dashRows,
    segments: segmentStats(toCreate),
    sample: toCreate.slice(0, 3).map((r) => ({ track: r.track, week: r.week, title: r.title, text: r.smsBody })),
  };

  if (dryRun || errors.length > 0) {
    return NextResponse.json({ dryRun: true, ...summary });
  }

  // Real import: all or nothing.
  await db.$transaction(async (tx) => {
    const ids = new Map<string, string>();
    for (const [key, t] of trackByName) ids.set(key, t.id);
    for (const r of toCreate) {
      const key = r.track.toLowerCase();
      if (!ids.has(key)) {
        const created = await tx.track.create({ data: { name: r.track } });
        ids.set(key, created.id);
      }
    }
    await tx.topic.createMany({
      data: toCreate.map((r) => ({
        trackId: ids.get(r.track.toLowerCase())!,
        weekNumber: r.week,
        category: r.category,
        title: r.title,
        smsBody: r.smsBody,
        deliveryFormat: r.deliveryFormat,
        videoFormat: r.videoFormat ?? null,
      })),
    });
    await tx.auditLog.create({
      data: { adminId: admin.id, action: `curriculum.import:${toCreate.length}` },
    });
  });

  return NextResponse.json({ dryRun: false, imported: toCreate.length, ...summary });
}
