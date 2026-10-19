"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { smsInfo, toGsmFriendly } from "@/lib/sms";

type Emp = { id: string; name: string; phone: string; status: string };
type Group = {
  key: string;
  trackId: string;
  trackName: string;
  weekNumber: number;
  title: string;
  category: string;
  deliveryFormat: string;
  videoFormat: string | null;
  smsBody: string;
  employees: Emp[];
};
type Result = { employeeId: string; name: string; ok: boolean; note?: string };

const btnCls = "text-xs font-semibold px-3 py-1.5 rounded-md border border-navy text-navy hover:bg-gray-50 disabled:opacity-50";
const primaryCls = "text-sm font-semibold px-4 py-2 rounded-md bg-navy text-white disabled:opacity-50";

export default function SendLessonsForm({
  groups,
  skipped,
  cap,
  usedThisMonth,
  costPerSegment,
}: {
  groups: Group[];
  skipped: { id: string; name: string; reason: string }[];
  cap: number;
  usedThisMonth: number;
  costPerSegment: number;
}) {
  const router = useRouter();
  const [texts, setTexts] = useState<Record<string, string>>(() =>
    Object.fromEntries(groups.map((g) => [g.key, g.smsBody]))
  );
  const [picked, setPicked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.flatMap((g) => g.employees.map((e) => [`${g.key}|${e.id}`, true])))
  );
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);

  const selectedCount = (g: Group) => g.employees.filter((e) => picked[`${g.key}|${e.id}`]).length;
  const totals = useMemo(() => {
    let texts_ = 0;
    let segs = 0;
    for (const g of groups) {
      const n = g.employees.filter((e) => picked[`${g.key}|${e.id}`]).length;
      texts_ += n;
      segs += n * smsInfo(texts[g.key] ?? "").segments;
    }
    return { texts: texts_, segs };
  }, [groups, picked, texts]);

  const remaining = Math.max(0, cap - usedThisMonth);
  const overCap = totals.texts > remaining;
  const tooLong = groups.some((g) => selectedCount(g) > 0 && smsInfo(texts[g.key] ?? "").segments > 3);
  const empty = groups.some((g) => selectedCount(g) > 0 && !(texts[g.key] ?? "").trim());

  async function send() {
    setBusy(true);
    setError("");
    try {
      const body = {
        groups: groups
          .filter((g) => selectedCount(g) > 0)
          .map((g) => ({
            trackId: g.trackId,
            weekNumber: g.weekNumber,
            text: texts[g.key] ?? "",
            employeeIds: g.employees.filter((e) => picked[`${g.key}|${e.id}`]).map((e) => e.id),
          })),
      };
      const res = await fetch("/api/admin/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setResults(data.results);
      setConfirming(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  if (results) {
    const okN = results.filter((r) => r.ok).length;
    return (
      <div className="card border border-gray-100 p-5">
        <div className="text-sm font-bold text-navy mb-2">
          Sent {okN} of {results.length}
        </div>
        <ul className="text-xs space-y-1">
          {results.map((r) => (
            <li key={r.employeeId} className={r.ok ? "text-green-700" : "text-red-700"}>
              {r.ok ? "Sent" : "Not sent"}: {r.name}
              {r.note ? ` (${r.note})` : ""}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="card border border-gray-100 p-4 text-sm">
        <div className="font-semibold text-navy">
          Monthly limit: {usedThisMonth} of {cap} texts used &middot; {remaining} left
        </div>
        <div className="text-xs text-gray-500 mt-1">
          This send: {totals.texts} text{totals.texts === 1 ? "" : "s"}, {totals.segs} segment{totals.segs === 1 ? "" : "s"}, about $
          {(totals.segs * costPerSegment).toFixed(2)}.
        </div>
        {overCap && (
          <div className="text-xs text-red-700 mt-1">
            That is more than the {remaining} texts left this month. Deselect {totals.texts - remaining}.
          </div>
        )}
      </div>

      {groups.length === 0 && (
        <p className="text-sm text-gray-600">Nobody is due a lesson right now.</p>
      )}

      {groups.map((g) => {
        const info = smsInfo(texts[g.key] ?? "");
        return (
          <div key={g.key} className="card border border-gray-100 p-4">
            <div className="text-sm font-bold text-navy">
              {g.trackName} &middot; Week {g.weekNumber}: {g.title}
            </div>
            <div className="text-xs text-gray-500 mb-2">
              {g.category} &middot; {g.deliveryFormat}
              {g.videoFormat ? ` (${g.videoFormat})` : ""}
            </div>
            <textarea
              className="w-full border border-gray-200 rounded-md p-2 text-sm"
              rows={4}
              value={texts[g.key] ?? ""}
              onChange={(e) => setTexts({ ...texts, [g.key]: e.target.value })}
            />
            <div className="flex items-center justify-between text-xs mt-1 mb-3">
              <span className={info.segments > 3 ? "text-red-700" : "text-gray-500"}>
                {info.length} characters &middot; {info.segments} segment{info.segments === 1 ? "" : "s"} ({info.encoding})
                {info.encoding === "UCS2" ? " - fancy characters make texts costlier" : ""}
              </span>
              <span className="flex gap-2">
                <button type="button" className={btnCls} onClick={() => setTexts({ ...texts, [g.key]: toGsmFriendly(texts[g.key] ?? "") })}>
                  Replace fancy dashes/quotes
                </button>
                <button type="button" className={btnCls} onClick={() => setTexts({ ...texts, [g.key]: g.smsBody })}>
                  Reset
                </button>
              </span>
            </div>
            <ul className="text-xs space-y-1">
              {g.employees.map((e) => (
                <li key={e.id}>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!picked[`${g.key}|${e.id}`]}
                      onChange={(ev) => setPicked({ ...picked, [`${g.key}|${e.id}`]: ev.target.checked })}
                    />
                    {e.name} <span className="text-gray-400">{e.phone}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {skipped.length > 0 && (
        <details className="card border border-gray-100 p-4">
          <summary className="text-sm font-semibold text-navy cursor-pointer">Not getting a lesson ({skipped.length})</summary>
          <ul className="text-xs text-gray-600 mt-2 space-y-1">
            {skipped.map((s) => (
              <li key={s.id}>
                {s.name}: {s.reason}
              </li>
            ))}
          </ul>
        </details>
      )}

      {error && <p className="text-sm text-red-700">{error}</p>}

      {groups.length > 0 && !confirming && (
        <button className={primaryCls} disabled={totals.texts === 0 || overCap || tooLong || empty} onClick={() => setConfirming(true)}>
          Review and send {totals.texts} text{totals.texts === 1 ? "" : "s"}
        </button>
      )}
      {tooLong && <p className="text-xs text-red-700">A lesson is longer than 3 segments. Shorten it.</p>}
      {confirming && (
        <div className="card border border-navy p-4">
          <p className="text-sm mb-3">
            Send {totals.texts} text{totals.texts === 1 ? "" : "s"} now (about ${(totals.segs * costPerSegment).toFixed(2)})? This cannot be undone.
          </p>
          <div className="flex gap-2">
            <button className={primaryCls} disabled={busy} onClick={send}>
              {busy ? "Sending..." : "Yes, send"}
            </button>
            <button className={btnCls} disabled={busy} onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
