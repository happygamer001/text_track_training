"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Track = { id: string; name: string };
const STATUS_LABELS: Record<string, string> = {
  PRE_ENROLLED: "Pre-enrolled",
  ACTIVE: "Active",
  STALLED: "Stalled",
  SEPARATED: "Separated",
};

const selectCls = "border border-gray-200 rounded-md px-2 py-1.5 text-xs bg-white";
const btnCls =
  "text-xs font-semibold px-3 py-1.5 rounded-md border border-navy text-navy hover:bg-gray-50 disabled:opacity-50";

async function call(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

export function EmployeeActions({
  id,
  trackId,
  status,
  tracks,
  canResend,
}: {
  id: string;
  trackId: string | null;
  status: string;
  tracks: Track[];
  canResend: boolean;
}) {
  const router = useRouter();
  const [newTrack, setNewTrack] = useState(trackId ?? "");
  const [newStatus, setNewStatus] = useState(status);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const dirty = newTrack !== (trackId ?? "") || newStatus !== status;

  async function run(fn: () => Promise<string>) {
    setBusy(true);
    setMsg(null);
    try {
      setMsg({ ok: true, text: await fn() });
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  function save() {
    if (newStatus === "SEPARATED" && status !== "SEPARATED") {
      if (!confirm("Mark this person as separated? They will stop receiving training texts.")) return;
    }
    run(async () => {
      await call(`/api/admin/employees/${id}`, "PATCH", {
        ...(newTrack !== (trackId ?? "") ? { trackId: newTrack } : {}),
        ...(newStatus !== status ? { status: newStatus } : {}),
      });
      return "Saved.";
    });
  }

  async function copyLink() {
    const link = `${window.location.origin}/enroll/confirm?id=${id}`;
    try {
      await navigator.clipboard.writeText(link);
      setMsg({ ok: true, text: "Link copied. Send it to them." });
    } catch {
      setMsg({ ok: false, text: link });
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <div className="flex flex-wrap items-center gap-2">
        <select className={selectCls} value={newTrack} onChange={(e) => setNewTrack(e.target.value)}>
          {!trackId && <option value="">No track</option>}
          {tracks.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <select className={selectCls} value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <button className={btnCls} disabled={!dirty || busy || !newTrack} onClick={save}>Save</button>
        <span className="text-gray-200">|</span>
        <button className={btnCls} onClick={copyLink} disabled={busy}>Copy their link</button>
        {canResend && (
          <button
            className={btnCls}
            disabled={busy}
            onClick={() =>
              run(async () => {
                await call(`/api/admin/employees/${id}/resend-optin`, "POST");
                return "YES text re-sent.";
              })
            }
          >
            Resend YES text
          </button>
        )}
      </div>
      {msg && <p className={`text-xs mt-2 break-all ${msg.ok ? "text-green-700" : "text-red-700"}`}>{msg.text}</p>}
    </div>
  );
}

export function AddEmployeeForm({ tracks }: { tracks: Track[] }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [trackId, setTrackId] = useState(tracks[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (tracks.length === 0) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await call("/api/admin/employees", "POST", { firstName, lastName, phone, trackId });
      setFirstName("");
      setLastName("");
      setPhone("");
      setMsg({ ok: true, text: "Added. Use “Copy their link” to send them their sign-up page." });
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const inputCls = "border border-gray-200 rounded-md px-2 py-1.5 text-sm";
  return (
    <form onSubmit={submit} className="card border border-gray-100 p-4 mb-8">
      <h2 className="text-sm font-bold text-navy mb-1">Add someone to the roster</h2>
      <p className="text-xs text-gray-400 mb-3">
        This does not send a text. They still opt in themselves on their sign-up page.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <input className={inputCls} placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        <input className={inputCls} placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        <input className={inputCls} placeholder="Mobile (308) 555-0142" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        <select className={inputCls} value={trackId} onChange={(e) => setTrackId(e.target.value)}>
          {tracks.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>
      <button disabled={busy} className="mt-3 bg-navy hover:bg-navy-dark disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg">
        {busy ? "Adding…" : "Add"}
      </button>
      {msg && <p className={`text-xs mt-2 ${msg.ok ? "text-green-700" : "text-red-700"}`}>{msg.text}</p>}
    </form>
  );
}
