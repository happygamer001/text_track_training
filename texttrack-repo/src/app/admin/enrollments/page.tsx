import Link from "next/link";
import type { Prisma, EmployeeStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { formatPhone, consentView } from "@/lib/format";
import { STATUSES } from "@/lib/employeeSchemas";
import { EmployeeActions, AddEmployeeForm } from "@/components/admin/EnrollmentActions";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  PRE_ENROLLED: "Pre-enrolled",
  ACTIVE: "Active",
  STALLED: "Stalled",
  SEPARATED: "Separated",
};
const TONES = {
  green: "bg-green-100 text-green-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-800",
  gray: "bg-gray-100 text-gray-600",
};

// Protected by src/middleware.ts (signed-in admins only).
export default async function EnrollmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; track?: string }>;
}) {
  const { q, status, track } = await searchParams;

  const where: Prisma.EmployeeWhereInput = {};
  if (status && (STATUSES as readonly string[]).includes(status)) where.status = status as EmployeeStatus;
  if (track) where.trackId = track;
  if (q?.trim()) {
    const term = q.trim();
    const digits = term.replace(/\D/g, "");
    where.OR = [
      { firstName: { contains: term, mode: "insensitive" } },
      { lastName: { contains: term, mode: "insensitive" } },
      ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : []),
    ];
  }

  const [employees, tracks, counts, total] = await Promise.all([
    db.employee.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 300,
      include: { track: true, consent: true },
    }),
    db.track.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.employee.groupBy({ by: ["status"], _count: { _all: true } }),
    db.employee.count(),
  ]);
  const countFor = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;

  return (
    <main className="min-h-screen px-6 py-10 max-w-3xl mx-auto">
      <Link href="/admin" className="text-xs text-gray-400 hover:text-navy">← Admin</Link>
      <h1 className="text-xl font-bold text-navy mt-2 mb-1">Enrollments</h1>
      <p className="text-sm text-gray-500 mb-5">
        Employee sign-up link:{" "}
        <span className="font-mono text-xs select-all">https://training.chipperfield.ag/enroll/start</span>
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-6">
        <Stat label="Total" value={total} />
        {STATUSES.map((s) => (
          <Stat key={s} label={STATUS_LABELS[s]} value={countFor(s)} />
        ))}
      </div>

      <AddEmployeeForm tracks={tracks} />

      <form method="GET" className="flex flex-wrap gap-2 mb-5">
        <input name="q" defaultValue={q ?? ""} placeholder="Search name or phone"
          className="border border-gray-200 rounded-md px-3 py-1.5 text-sm flex-1 min-w-[160px]" />
        <select name="status" defaultValue={status ?? ""} className="border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white">
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select name="track" defaultValue={track ?? ""} className="border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white">
          <option value="">All tracks</option>
          {tracks.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <button className="bg-navy text-white text-sm font-semibold px-4 rounded-md">Filter</button>
        {(q || status || track) && (
          <Link href="/admin/enrollments" className="text-xs text-gray-400 self-center underline">Clear</Link>
        )}
      </form>

      {employees.length === 0 && (
        <p className="text-sm text-gray-400">
          {total === 0 ? "Nobody has signed up yet." : "No one matches those filters."}
        </p>
      )}

      <div className="space-y-3">
        {employees.map((e) => {
          const cv = consentView(e.consent);
          const name = `${e.firstName} ${e.lastName}`.trim() || "(name not entered yet)";
          return (
            <div key={e.id} className="card border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{name}</div>
                  <div className="text-xs text-gray-500">
                    {formatPhone(e.phone)} · {e.track?.name ?? "No track"} · week {e.currentTopic}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    Signed up {e.createdAt.toLocaleDateString("en-US", { timeZone: "America/Chicago" })}
                  </div>
                </div>
                <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-700 whitespace-nowrap">
                  {STATUS_LABELS[e.status]}
                </span>
              </div>
              <div className="mt-2">
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${TONES[cv.tone]}`}>{cv.label}</span>
              </div>
              <EmployeeActions
                id={e.id}
                trackId={e.trackId}
                status={e.status}
                tracks={tracks}
                canResend={!!e.consent?.smsConsent && !e.consent.doubleOptInAt && e.status !== "SEPARATED"}
              />
            </div>
          );
        })}
      </div>
      {employees.length === 300 && (
        <p className="text-xs text-gray-400 mt-4">Showing the 300 most recent. Use search to narrow down.</p>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card border border-gray-100 px-3 py-2">
      <div className="text-lg font-bold text-navy">{value}</div>
      <div className="text-[11px] text-gray-500">{label}</div>
    </div>
  );
}
