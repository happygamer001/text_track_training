"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type TrackOption = { id: string; name: string; nextWeek: number };

const inputCls =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-navy";
const labelCls = "block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1";

async function postJson(url: string, payload: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

export function NewTrackForm({ adminId }: { adminId: string | null }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await postJson("/api/admin/tracks", { adminId, name });
      setName("");
      setMsg({ ok: true, text: "Track created." });
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card border border-gray-100 p-4 mb-8">
      <h2 className="text-sm font-bold text-navy mb-3">New track</h2>
      <label className={labelCls}>Track name</label>
      <div className="flex gap-2">
        <input
          className={inputCls}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Construction"
          required
        />
        <button
          disabled={busy || !adminId}
          className="bg-navy hover:bg-navy-dark disabled:opacity-50 text-white text-sm font-semibold px-4 rounded-lg"
        >
          {busy ? "Saving…" : "Create"}
        </button>
      </div>
      {msg && <p className={`text-xs mt-2 ${msg.ok ? "text-green-700" : "text-red-700"}`}>{msg.text}</p>}
    </form>
  );
}

export function AddTopicForm({
  adminId,
  tracks,
}: {
  adminId: string | null;
  tracks: TrackOption[];
}) {
  const router = useRouter();
  const [trackId, setTrackId] = useState(tracks[0]?.id ?? "");
  const [weekNumber, setWeekNumber] = useState<string>(String(tracks[0]?.nextWeek ?? 1));
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [smsBody, setSmsBody] = useState("");
  const [deliveryFormat, setDeliveryFormat] = useState("Text");
  const [videoFormat, setVideoFormat] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function pickTrack(id: string) {
    setTrackId(id);
    const t = tracks.find((x) => x.id === id);
    if (t) setWeekNumber(String(t.nextWeek));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await postJson("/api/admin/topics", {
        adminId,
        trackId,
        weekNumber,
        category,
        title,
        smsBody,
        deliveryFormat,
        videoFormat,
      });
      setMsg({ ok: true, text: `Added "${title}".` });
      setTitle("");
      setSmsBody("");
      setVideoFormat("");
      setWeekNumber(String(Number(weekNumber) + 1));
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  if (tracks.length === 0) {
    return <p className="text-sm text-gray-400">Create a track first, then you can add topics to it.</p>;
  }

  return (
    <form onSubmit={submit} className="card border border-gray-100 p-4 space-y-3">
      <h2 className="text-sm font-bold text-navy">Add topic</h2>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Track</label>
          <select className={inputCls} value={trackId} onChange={(e) => pickTrack(e.target.value)}>
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Week</label>
          <input className={inputCls} type="number" min={1} value={weekNumber}
            onChange={(e) => setWeekNumber(e.target.value)} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Category</label>
          <input className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Work Ethic & Attitude" required />
        </div>
        <div>
          <label className={labelCls}>Delivery format</label>
          <select className={inputCls} value={deliveryFormat} onChange={(e) => setDeliveryFormat(e.target.value)}>
            <option>Text</option>
            <option>Handout</option>
            <option>Video</option>
          </select>
        </div>
      </div>
      <div>
        <label className={labelCls}>Title</label>
        <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div>
        <label className={labelCls}>Text message</label>
        <textarea className={inputCls} rows={4} value={smsBody} onChange={(e) => setSmsBody(e.target.value)} required />
        <p className="text-[11px] text-gray-400 mt-1">{smsBody.length} characters</p>
      </div>
      <div>
        <label className={labelCls}>Video format (optional)</label>
        <input className={inputCls} value={videoFormat} onChange={(e) => setVideoFormat(e.target.value)}
          placeholder="e.g. From the Boss" />
      </div>
      <button
        disabled={busy || !adminId}
        className="bg-navy hover:bg-navy-dark disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-lg"
      >
        {busy ? "Saving…" : "Add topic"}
      </button>
      {msg && <p className={`text-xs ${msg.ok ? "text-green-700" : "text-red-700"}`}>{msg.text}</p>}
    </form>
  );
}
