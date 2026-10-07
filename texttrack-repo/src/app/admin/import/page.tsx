"use client";

import { useState } from "react";
import Link from "next/link";
import { parseCsv } from "@/lib/csv";

type Summary = {
  dryRun: boolean;
  imported?: number;
  tracks: { name: string; exists: boolean; toAdd: number; toSkip: number }[];
  topicsToAdd: number;
  topicsSkipped: number;
  errors: { row: number; message: string }[];
  dashRows: number;
  segments: { byCount: Record<string, number>; unicode: number; totalSegments: number };
  sample: { track: string; week: number; title: string; text: string }[];
};

export default function ImportCurriculumPage() {
  const [records, setRecords] = useState<Record<string, string>[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [convertDashes, setConvertDashes] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function run(recs: Record<string, string>[], convert: boolean, dryRun: boolean) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/import/curriculum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records: recs, convertDashes: convert, dryRun }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setSummary(data);
      if (!dryRun) setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSummary(null);
    setDone(false);
    setError("");
    setFileName(file.name);
    const recs = parseCsv(await file.text());
    if (recs.length === 0) {
      setError("That file looks empty.");
      return;
    }
    setRecords(recs);
    run(recs, convertDashes, true);
  }

  function toggleDashes(v: boolean) {
    setConvertDashes(v);
    if (records) run(records, v, true);
  }

  const canImport = !!summary && !done && summary.errors.length === 0 && summary.topicsToAdd > 0;

  return (
    <main className="min-h-screen px-6 py-10 max-w-3xl mx-auto">
      <Link href="/admin" className="text-xs text-gray-400 hover:text-navy">← Admin</Link>
      <h1 className="text-xl font-bold text-navy mt-2 mb-1">Import curriculum</h1>
      <p className="text-sm text-gray-500 mb-6">
        Upload the curriculum spreadsheet saved as a <b>CSV</b>. You&apos;ll see a preview first;
        nothing is saved until you press Import. Topics that already exist (same track and week)
        are skipped, never overwritten.
      </p>

      <div className="card border border-gray-100 p-4 mb-5">
        <input type="file" accept=".csv,text/csv" onChange={onFile} className="text-sm" disabled={busy || done} />
        {fileName && <p className="text-xs text-gray-400 mt-2">{fileName}</p>}
        <label className="flex items-start gap-2 mt-4 text-sm">
          <input type="checkbox" className="mt-1" checked={convertDashes} disabled={busy || done}
            onChange={(e) => toggleDashes(e.target.checked)} />
          <span>
            Swap em dashes (—) and curly quotes for plain ones.
            <span className="block text-xs text-gray-400">
              A single em dash makes the whole text a different encoding, which splits it into more
              (billed) segments. Recommended.
            </span>
          </span>
        </label>
      </div>

      {error && <p className="text-sm text-red-700 mb-4">{error}</p>}
      {busy && <p className="text-sm text-gray-400 mb-4">Working…</p>}

      {summary && (
        <div className="card border border-gray-100 p-4">
          <h2 className="text-sm font-bold text-navy mb-3">{done ? "Imported" : "Preview"}</h2>

          <ul className="text-sm space-y-1 mb-4">
            {summary.tracks.map((t) => (
              <li key={t.name}>
                <b>{t.name}</b>{" "}
                <span className="text-gray-500">
                  {t.exists ? "(existing track)" : "(new track)"} — {t.toAdd} to add
                  {t.toSkip ? `, ${t.toSkip} already there (skipped)` : ""}
                </span>
              </li>
            ))}
          </ul>

          <p className="text-xs text-gray-500 mb-3">
            Texts: {Object.entries(summary.segments.byCount).sort().map(([n, c]) => `${c} at ${n} segment${n === "1" ? "" : "s"}`).join(", ") || "none"}
            {summary.segments.unicode > 0 && ` · ${summary.segments.unicode} still use special characters (costlier)`}
            {summary.dashRows > 0 && convertDashes && ` · ${summary.dashRows} had dashes/quotes swapped`}
          </p>

          {summary.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-xs text-red-800">
              <p className="font-semibold mb-1">Fix these in the spreadsheet, then upload again:</p>
              <ul className="list-disc ml-4 space-y-0.5">
                {summary.errors.slice(0, 20).map((e) => (
                  <li key={e.row}>Row {e.row}: {e.message}</li>
                ))}
              </ul>
            </div>
          )}

          {summary.sample.length > 0 && !done && (
            <div className="mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">First few topics</p>
              {summary.sample.map((s) => (
                <div key={`${s.track}${s.week}`} className="text-xs border-t border-gray-100 py-2">
                  <div className="font-semibold">{s.track} · week {s.week} · {s.title}</div>
                  <div className="text-gray-500 mt-0.5">{s.text}</div>
                </div>
              ))}
            </div>
          )}

          {done ? (
            <p className="text-sm text-green-700">
              Added {summary.imported} topics.{" "}
              <Link href="/admin/tracks" className="underline">See Tracks &amp; Topics</Link>
            </p>
          ) : (
            <button
              disabled={!canImport || busy}
              onClick={() => records && confirm(`Import ${summary.topicsToAdd} topics?`) && run(records, convertDashes, false)}
              className="bg-navy hover:bg-navy-dark disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-lg"
            >
              {summary.topicsToAdd === 0 ? "Nothing new to import" : `Import ${summary.topicsToAdd} topics`}
            </button>
          )}
        </div>
      )}
    </main>
  );
}
