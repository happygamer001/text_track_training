import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/adminSession";
import { executeSend } from "@/lib/lessonPlan";

export const maxDuration = 60;

const schema = z.object({
  groups: z
    .array(
      z.object({
        trackId: z.string().min(1),
        weekNumber: z.number().int().min(1).max(104),
        text: z.string().max(1000),
        employeeIds: z.array(z.string().min(1)).min(1).max(200),
      })
    )
    .min(1)
    .max(50),
});

// POST /api/admin/send
// Sends the weekly lesson texts an admin has reviewed (and possibly edited).
// Spends money, so only SUPER_ADMINs; the monthly text limit is enforced here
// on the server, not just in the page.
export async function POST(req: NextRequest) {
  const auth = await requireAdminApi(req, { role: "SUPER_ADMIN" });
  if ("error" in auth) return auth.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "That request didn't look right. Reload the page and try again." }, { status: 400 });
  }

  const result = await executeSend(auth.admin.id, parsed.data.groups);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}
