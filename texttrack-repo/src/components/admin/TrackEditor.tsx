"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { smsInfo } from "@/lib/sms";

export type EditorTopic = {
  id: string;
  weekNumber: number;
  category: string;
  title: string;
  smsBody: string;
  deliveryFormat: string;
  videoFormat: string | null;
};
export type EditorTrack = { id: string; name: string; topics: EditorTopic[] };

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-navy";
const labelCls = "block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1";
const btnCls = "text-xs font-semibold px-3 py-1.5 rounded-md border border-navy text-navy hover:bg-gray-50 disabled:opacity-50";
const dangerCls = "text-xs font-semibold px-3 py-1.5 rounded-md border border-red-600 text-red-700 hover:bg-red-50 disabled:opacity-50";
const FORMATS = ["Text", "Handout", "Portal Video"];

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

export default function TrackEditor({ track, canDelete }: { track: EditorTrack; canDelete: boolean }) {
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(track.name);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmTrack, setConfirmTrack] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function run(fn: () => Promise<unknown>, okText?: string) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      if (okText) setMsg({ ok: true, text: okText });
      router.refresh();
      return true;
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card border border-gray-100 p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        {renaming ? (
          <form
            className="flex gap-2 flex-1"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await run(() => call(`/api/admin/tracks/${track.id}`, "PATCH", { name }), "Renamed.")) setRenaming(false);
            }}
          >
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required />
            <button className={btnCls} disabled={busy}>Save</button>
            <button type="button" className={btnCls} onClick={() => { setRenaming(false); setName(track.name); }}>Cancel</button>
          </form>
        ) : (
          <div className="text-sm font-semibold">
            {track.name} <span className="text-xs font-normal text-gray-400">· {track.topics.length} topics</span>
          </div>
        )}
        {!renaming && (
          <div className="flex gap-2">
            <button className={btnCls} onClick={() => setRenaming(true)}>Rename</button>
            {canDelete && <button className={dangerCls} onClick={() => setConfirmTrack(true)}>Delete track</button>}
          </div>
        )}
      </div>

      {confirmTrack && (
        <div className="border border-red-200 bg-red-50 rounded-md p-3 mb-3">
          <p className="text-xs text-red-800 mb-2">
            Delete &quot;{track.name}&quot; and all {track.topics.length} of its topics? This cannot be undone. It is refused if anyone
            is on this track or a video/handout is attached.
          </p>
          <div className="flex gap-2">
            <button className={dangerCls} disabled={busy} onClick={() => run(() => call(`/api/admin/tracks/${track.id}`, "DELETE"))}>
              Yes, delete
            </button>
            <button className={btnCls} onClick={() => setConfirmTrack(false)}>Cancel</button>
          </div>
        </div>
      )}

      <ul className="space-y-2">
        {track.topics.map((tp) =>
          editingId === tp.id ? (
            <TopicForm
              key={tp.id}
              topic={tp}
              canDelete={canDelete}
              busy={busy}
              onCancel={() => setEditingId(null)}
              onSave={async (payload) => {
                if (await run(() => call(`/api/admin/topics/${tp.id}`, "PATCH", payload), `Saved week ${payload.weekNumber}.`)) setEditingId(null);
              }}
              onDelete={async () => {
                if (await run(() => call(`/api/admin/topics/${tp.id}`, "DELETE"), "Topic deleted.")) setEditingId(null);
              }}
            />
          ) : (
            <li key={tp.id} className="text-xs text-gray-600 flex items-start justify-between gap-3">
              <span>
                <span className="text-gray-400 mr-1">Wk {tp.weekNumber}</span>
                {tp.title} <span className="text-gray-400">({tp.deliveryFormat})</span>
              </span>
              <button className="text-xs text-navy underline whitespace-nowrap" onClick={() => setEditingId(tp.id)}>Edit</button>
            </li>
          )
        )}
        {track.topics.length === 0 && <li className="text-xs text-gray-400">No topics yet.</li>}
      </ul>
      {msg && <p className={`text-xs mt-2 ${msg.ok ? "text-green-700" : "text-red-700"}`}>{msg.text}</p>}
    </div>
  );
}

function TopicForm({
  topic,
  canDelete,
  busy,
  onSave,
  onDelete,
  onCancel,
}: {
  topic: EditorTopic;
  canDelete: boolean;
  busy: boolean;
  onSave: (p: { weekNumber: string; category: string; title: string; smsBody: string; deliveryFormat: string; videoFormat: string }) => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const [weekNumber, setWeekNumber] = useState(String(topic.weekNumber));
  const [category, setCategory] = useState(topic.category);
  const [title, setTitle] = useState(topic.title);
  const [smsBody, setSmsBody] = useState(topic.smsBody);
  const [deliveryFormat, setDeliveryFormat] = useState(topic.deliveryFormat);
  const [videoFormat, setVideoFormat] = useState(topic.videoFormat ?? "");
  const [confirmDel, setConfirmDel] = useState(false);
  const info = smsInfo(smsBody);
  const weekChanged = Number(weekNumber) !== topic.weekNumber;

  return (
    <li className="border border-navy rounded-md p-3 space-y-3 bg-white">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Week</label>
          <input className={inputCls} type="number" min={1} value={weekNumber} onChange={(e) => setWeekNumber(e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Category</label>
          <input className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)} />
        </div>
      </div>
      {weekChanged && (
        <p className="text-[11px] text-amber-700">
          Changing the week changes which lesson people on week {topic.weekNumber} and week {weekNumber || "?"} receive next.
        </p>
      )}
      <div>
        <label className={labelCls}>Title</label>
        <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <label className={labelCls}>Text message</label>
        <textarea className={inputCls} rows={4} value={smsBody} onChange={(e) => setSmsBody(e.target.value)} />
        <p className={`text-[11px] mt-1 ${info.segments > 3 ? "text-red-700" : "text-gray-400"}`}>
          {info.length} characters · {info.segments} segment{info.segments === 1 ? "" : "s"} ({info.encoding})
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Delivery format</label>
          <select className={inputCls} value={deliveryFormat} onChange={(e) => setDeliveryFormat(e.target.value)}>
            {Array.from(new Set([...FORMATS, deliveryFormat])).map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Video format (optional)</label>
          <input className={inputCls} value={videoFormat} onChange={(e) => setVideoFormat(e.target.value)} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className={btnCls} disabled={busy} onClick={() => onSave({ weekNumber, category, title, smsBody, deliveryFormat, videoFormat })}>
          Save
        </button>
        <button className={btnCls} onClick={onCancel}>Cancel</button>
        {canDelete && !confirmDel && (
          <button className={dangerCls + " ml-auto"} onClick={() => setConfirmDel(true)}>Delete topic</button>
        )}
      </div>
      {confirmDel && (
        <div className="border border-red-200 bg-red-50 rounded-md p-2">
          <p className="text-xs text-red-800 mb-2">Delete week {topic.weekNumber} &quot;{topic.title}&quot;? This cannot be undone.</p>
          <div className="flex gap-2">
            <button className={dangerCls} disabled={busy} onClick={onDelete}>Yes, delete</button>
            <button className={btnCls} onClick={() => setConfirmDel(false)}>Cancel</button>
          </div>
        </div>
      )}
    </li>
  );
}
