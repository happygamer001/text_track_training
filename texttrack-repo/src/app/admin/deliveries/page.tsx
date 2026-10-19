import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionAdmin } from "@/lib/adminSession";
import { formatPhone } from "@/lib/format";
import { startOfCentralMonth, startOfCentralWeek } from "@/lib/centralTime";
import { monthlyTextCap } from "@/lib/lessonLogic";
import { smsInfo } from "@/lib/sms";
import {
  DELIVERY_STATUSES,
  describeAudit,
  parseRange,
  parseStatus,
  statusTone,
} from "@/lib/deliveryView";

export const dynamic = "force-dynamic";

const TONES = {
  green: "bg-green-100 text-green-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-800",
  gray: "bg-gray-100 text-gray-600",
};
const CT = "America/Chicago";
const when = (d: Date) =>
  d.toLocaleString("en-US", { timeZone: CT, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

// Protected by src/middleware.ts (signed-in admins only).
export default async function DeliveriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; range?: string }>;
}) {
  const admin = await getSessionAdmin();
  if (!admin) redirect("/admin/login");

  const { q, status: statusParam, range: rangeParam } = await searchParams;
  const status = parseStatus(statusParam);
  const range = parseRange(rangeParam);
  const now = new Date();
  const monthStart = startOfCentralMonth(now);
  const weekStart = startOfCentralWeek(now);

  const where: Prisma.DeliveryLogWhereInput = {};
  if (status) where.status = status;
  if (range === "week") where.sentAt = { gte: weekStart };
  if (range === "month") where.sentAt = { gte: monthStart };
  if (q?.trim()) {
    const term = q.trim();
    const digits = term.replace(/\D/g, "");
    where.employee = {
      OR: [
        { firstName: { contains: term, mode: "insensitive" } },
        { lastName: { contains: term, mode: "insensitive" } },
        ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : []),
      ],
    };
  }

  const [logs, usedThisMonth, failedThisMonth, audits] = await Promise.all([
    db.deliveryLog.findMany({
      where,
      orderBy: { sentAt: "desc" },
      take: 200,
      include: { employee: { select: { firstName: true, lastName: true, phone: true } } },
    }),
    db.deliveryLog.count({ where: { sentAt: { gte: monthStart } } }),
    db.deliveryLog.count({ where: { sentAt: { gte: monthStart }, status: "failed" } }),
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      include: { admin: { select: { name: true } } },
    }),
  ]);

  const topicIds = Array.from(new Set(logs.map((l) => l.topicId).filter((t): t is string => !!t)));
  const topics = topicIds.length
    ? await db.topic.findMany({ where: { id: { in: topicIds } }, select: { id: true, title: true, weekNumber: true } })
    : [];
  const topicById = new Map(topics.map((t) => [t.id, t]));

  const cap = monthlyTextCap();
  const pct = Math.min(100, Math.round((usedThisMonth / cap) * 100));

  return (
    <main className="min-h-screen px-6 py-10 max-w-3xl mx-auto">
      <Link href="/admin" className="text-xs text-gray-400 hover:text-navy">← Admin</Link>
      <h1 className="text-xl font-bold text-navy mt-2 mb-1">Delivery history</h1>
      <p className="text-sm text-gray-500 mb-5">Every lesson text sent, with its Twilio status. Times are Central.</p>

      <div className="card border border-gray-100 p-4 mb-5">
        <div className="text-sm font-semibold text-navy">
          This month: {usedThisMonth} of {cap} texts used
          {failedThisMonth > 0 && <span className="text-red-700 font-normal"> · {failedThisMonth} failed</span>}
        </div>
        <div className="h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
          <div className={`h-2 ${pct >= 90 ? "bg-red-500" : "bg-navy"}`} style={{ width: `${pct}%` }} />
        </div>
        {failedThisMonth > 0 && (
          <p className="text-xs text-gray-500 mt-2">
            A failed text does not advance the person, so they will show up again on{" "}
            <Link href="/admin/send" className="underline">Send lessons</Link>. Failed texts still count toward the monthly limit.
          </p>
        )}
      </div>

      <form method="GET" className="flex flex-wrap gap-2 mb-5">
        <input name="q" defaultValue={q ?? ""} placeholder="Search name or phone"
          className="border border-gray-200 rounded-md px-3 py-1.5 text-sm flex-1 min-w-[160px]" />
        <select name="range" defaultValue={range} className="border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white">
          <option value="week">This week</option>
          <option value="month">This month</option>
          <option value="all">All time</option>
        </select>
        <select name="status" defaultValue={status ?? ""} className="border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white">
          <option value="">Any status</option>
          {DELIVERY_STATUSES.map((s) => (
            <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <button className="bg-navy text-white text-sm font-semibold px-4 rounded-md">Filter</button>
        {(q || status || rangeParam) && (
          <Link href="/admin/deliveries" className="text-xs text-gray-400 self-center underline">Clear</Link>
        )}
      </form>

      {logs.length === 0 && <p className="text-sm text-gray-400">No texts match those filters.</p>}

      <div className="space-y-3">
        {logs.map((l) => {
          const topic = l.topicId ? topicById.get(l.topicId) : undefined;
          const name = `${l.employee.firstName} ${l.employee.lastName}`.trim() || "(name not entered)";
          const info = smsInfo(l.body);
          return (
            <div key={l.id} className="card border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{name}</div>
                  <div className="text-xs text-gray-500">
                    {formatPhone(l.employee.phone)} · {when(l.sentAt)}
                    {topic ? ` · Week ${topic.weekNumber}: ${topic.title}` : ""}
                  </div>
                </div>
                <span className={`text-[11px] font-semibold px-2 py-1 rounded-full whitespace-nowrap ${TONES[statusTone(l.status)]}`}>
                  {l.status[0].toUpperCase() + l.status.slice(1)}
                </span>
              </div>
              <p className="text-xs text-gray-700 mt-2 whitespace-pre-wrap">{l.body}</p>
              <div className="text-[11px] text-gray-400 mt-1">
                {info.segments} segment{info.segments === 1 ? "" : "s"}
                {l.twilioSid ? ` · ${l.twilioSid}` : ""}
              </div>
            </div>
          );
        })}
      </div>
      {logs.length === 200 && <p className="text-xs text-gray-400 mt-3">Showing the newest 200. Narrow the filters to see older ones.</p>}

      <h2 className="text-sm font-bold text-navy mt-10 mb-2">Recent admin activity</h2>
      {audits.length === 0 ? (
        <p className="text-sm text-gray-400">Nothing yet.</p>
      ) : (
        <ul className="text-xs text-gray-600 space-y-1">
          {audits.map((a) => (
            <li key={a.id}>
              <span className="text-gray-400">{when(a.createdAt)}</span> · {a.admin.name} · {describeAudit(a.action, a.targetId)}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
