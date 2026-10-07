import { z } from "zod";
import { smsInfo, toGsmFriendly } from "@/lib/sms";

export const REQUIRED_HEADERS = ["Track", "Week", "Category", "Topic Title", "Delivery Format", "Text Message"];

const rowSchema = z.object({
  track: z.string().trim().min(2, "Track is missing").max(80),
  week: z.coerce.number().int().min(1, "Week must be 1 or higher").max(104),
  category: z.string().trim().min(2, "Category is missing").max(80),
  title: z.string().trim().min(3, "Topic Title is missing").max(160),
  deliveryFormat: z.string().trim().min(2, "Delivery Format is missing").max(40),
  smsBody: z.string().trim().min(1, "Text Message is empty").max(1000, "Text Message is over 1000 characters"),
  videoFormat: z.string().trim().max(60).optional(),
});

export type ImportRow = z.infer<typeof rowSchema>;
export type RowError = { row: number; message: string };

// `records` come from parseCsv (row 1 = first data row, i.e. spreadsheet row 2).
export function prepareRows(
  records: Record<string, string>[],
  opts: { convertDashes: boolean }
): { rows: ImportRow[]; errors: RowError[]; missingHeaders: string[]; dashRows: number } {
  const headers = records[0] ? Object.keys(records[0]) : [];
  const missingHeaders = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  if (missingHeaders.length) return { rows: [], errors: [], missingHeaders, dashRows: 0 };

  const rows: ImportRow[] = [];
  const errors: RowError[] = [];
  const seen = new Set<string>();
  let dashRows = 0;

  records.forEach((rec, i) => {
    const line = i + 2; // spreadsheet row number
    const original = rec["Text Message"] ?? "";
    const cleaned = toGsmFriendly(original);
    if (cleaned !== original) dashRows++;

    const parsed = rowSchema.safeParse({
      track: rec["Track"],
      week: rec["Week"],
      category: rec["Category"],
      title: rec["Topic Title"],
      deliveryFormat: rec["Delivery Format"],
      smsBody: opts.convertDashes ? cleaned : original,
      videoFormat: rec["Video Format"] || undefined,
    });
    if (!parsed.success) {
      errors.push({ row: line, message: parsed.error.issues[0].message });
      return;
    }
    const key = `${parsed.data.track.toLowerCase()}|${parsed.data.week}`;
    if (seen.has(key)) {
      errors.push({ row: line, message: `Duplicate: ${parsed.data.track} week ${parsed.data.week} appears more than once` });
      return;
    }
    seen.add(key);
    rows.push(parsed.data);
  });

  return { rows, errors, missingHeaders, dashRows };
}

export function segmentStats(rows: ImportRow[]) {
  const byCount: Record<number, number> = {};
  let unicode = 0;
  let total = 0;
  for (const r of rows) {
    const info = smsInfo(r.smsBody);
    byCount[info.segments] = (byCount[info.segments] ?? 0) + 1;
    if (info.encoding === "UCS2") unicode++;
    total += info.segments;
  }
  return { byCount, unicode, totalSegments: total };
}
