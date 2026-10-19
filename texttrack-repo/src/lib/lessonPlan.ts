import { db } from "@/lib/db";
import { sendSms } from "@/lib/twilio";
import { startOfCentralMonth, startOfCentralWeek } from "@/lib/centralTime";
import {
  buildGroups,
  capCheck,
  monthlyTextCap,
  validateLessonText,
  type PlanEmployee,
  type PlanTopic,
} from "@/lib/lessonLogic";

// Database + Twilio side of the manual weekly lesson sender. The rules live in
// lessonLogic.ts; this file loads the data and performs the sends.

const COUNTED_STATUSES = ["queued", "sent", "delivered"];

export async function loadSendPlan(now: Date = new Date()) {
  const weekStart = startOfCentralWeek(now);
  const monthStart = startOfCentralMonth(now);

  const rows = await db.employee.findMany({
    where: { status: { not: "SEPARATED" } },
    include: { track: true, consent: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  const employees: PlanEmployee[] = rows.map((e) => ({
    id: e.id,
    firstName: e.firstName,
    lastName: e.lastName,
    phone: e.phone,
    status: e.status,
    trackId: e.trackId,
    trackName: e.track?.name ?? null,
    currentTopic: e.currentTopic,
    smsConsent: !!e.consent?.smsConsent,
    doubleOptInAt: e.consent?.doubleOptInAt ?? null,
  }));

  const pairs = new Map<string, { trackId: string; weekNumber: number }>();
  for (const e of employees) {
    if (e.trackId) pairs.set(`${e.trackId}:${e.currentTopic}`, { trackId: e.trackId, weekNumber: e.currentTopic });
  }

  const [topicRows, maxWeeks, sentThisWeek, usedThisMonth] = await Promise.all([
    pairs.size
      ? db.topic.findMany({ where: { OR: Array.from(pairs.values()) } })
      : Promise.resolve([]),
    db.topic.groupBy({ by: ["trackId"], _max: { weekNumber: true } }),
    db.deliveryLog.findMany({
      where: { sentAt: { gte: weekStart }, topicId: { not: null }, status: { in: COUNTED_STATUSES } },
      select: { employeeId: true },
    }),
    db.deliveryLog.count({ where: { sentAt: { gte: monthStart } } }),
  ]);

  const topics: PlanTopic[] = topicRows.map((t) => ({
    id: t.id,
    trackId: t.trackId,
    weekNumber: t.weekNumber,
    category: t.category,
    title: t.title,
    smsBody: t.smsBody,
    deliveryFormat: t.deliveryFormat,
    videoFormat: t.videoFormat,
  }));
  const lastWeek = new Map<string, number>(maxWeeks.map((m) => [m.trackId, m._max.weekNumber ?? 0]));
  const alreadySent = new Set<string>(sentThisWeek.map((r) => r.employeeId));

  const { groups, skipped } = buildGroups(employees, topics, alreadySent, lastWeek);
  return {
    weekStart,
    monthStart,
    cap: monthlyTextCap(),
    usedThisMonth,
    groups,
    skipped,
  };
}

export type SendRequestGroup = { trackId: string; weekNumber: number; text: string; employeeIds: string[] };
export type SendResult = { employeeId: string; name: string; ok: boolean; note?: string };

export async function executeSend(
  adminId: string,
  requested: SendRequestGroup[],
  now: Date = new Date()
): Promise<{ ok: false; status: number; error: string } | { ok: true; sent: number; failed: number; skipped: number; results: SendResult[] }> {
  const plan = await loadSendPlan(now);
  const weekStart = startOfCentralWeek(now);

  // 1. Resolve every request against the fresh plan and validate before sending anything.
  type Job = { employeeId: string; name: string; phone: string; topicId: string; weekNumber: number; text: string };
  const jobs: Job[] = [];
  const skippedResults: SendResult[] = [];
  const seen = new Set<string>();

  for (const r of requested) {
    const group = plan.groups.find((g) => g.trackId === r.trackId && g.weekNumber === r.weekNumber);
    if (!group) {
      return { ok: false, status: 409, error: "The list changed since you opened it (someone moved on or was already sent). Reload the page and review again." };
    }
    const v = validateLessonText(r.text);
    if (!v.ok) return { ok: false, status: 400, error: `${group.topic.title}: ${v.error}` };
    for (const id of r.employeeIds) {
      const emp = group.employees.find((e) => e.id === id);
      if (!emp) {
        skippedResults.push({ employeeId: id, name: "(unknown)", ok: false, note: "Not eligible for this lesson any more." });
        continue;
      }
      if (seen.has(id)) continue; // never twice in one request
      seen.add(id);
      jobs.push({ employeeId: id, name: emp.name, phone: emp.phone, topicId: group.topic.id, weekNumber: group.weekNumber, text: v.text });
    }
  }
  if (jobs.length === 0) return { ok: false, status: 400, error: "No recipients selected." };

  // 2. Monthly cap: all-or-nothing, so a partial send never surprises anyone.
  const cap = capCheck(plan.usedThisMonth, jobs.length, plan.cap);
  if (!cap.ok) {
    return {
      ok: false,
      status: 409,
      error: `That would be ${jobs.length} texts, but only ${cap.remaining} are left under this month's limit of ${plan.cap} (${plan.usedThisMonth} already used). Deselect ${cap.over} or raise MONTHLY_TEXT_CAP.`,
    };
  }

  // 3. Send one at a time. A queued log row is written first so a double click
  //    can't send the same person twice, then updated to sent or failed.
  const results: SendResult[] = [...skippedResults];
  let sent = 0;
  let failed = 0;
  for (const job of jobs) {
    const dupe = await db.deliveryLog.findFirst({
      where: { employeeId: job.employeeId, sentAt: { gte: weekStart }, topicId: { not: null }, status: { in: COUNTED_STATUSES } },
      select: { id: true },
    });
    if (dupe) {
      results.push({ employeeId: job.employeeId, name: job.name, ok: false, note: "Already got a lesson this week." });
      continue;
    }
    const log = await db.deliveryLog.create({
      data: { employeeId: job.employeeId, topicId: job.topicId, body: job.text, status: "queued" },
    });
    try {
      const msg = await sendSms({ to: job.phone, body: job.text });
      await db.deliveryLog.update({ where: { id: log.id }, data: { status: "sent", twilioSid: msg.sid } });
      // Only advance if they are still on the week we just sent.
      await db.employee.updateMany({
        where: { id: job.employeeId, currentTopic: job.weekNumber },
        data: { currentTopic: { increment: 1 } },
      });
      sent++;
      results.push({ employeeId: job.employeeId, name: job.name, ok: true });
    } catch (err) {
      await db.deliveryLog.update({ where: { id: log.id }, data: { status: "failed" } });
      failed++;
      const note = err instanceof Error ? err.message.slice(0, 160) : "Twilio refused the message.";
      results.push({ employeeId: job.employeeId, name: job.name, ok: false, note });
    }
  }

  await db.auditLog.create({
    data: {
      adminId,
      action: "lessons.send",
      targetId: `week ${weekStart.toISOString().slice(0, 10)}: sent ${sent}, failed ${failed}`,
    },
  });

  return { ok: true, sent, failed, skipped: results.filter((r) => !r.ok).length - failed, results };
}
