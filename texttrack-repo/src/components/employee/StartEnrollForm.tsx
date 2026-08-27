"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StartEnrollForm({
  tracks,
}: {
  tracks: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [trackId, setTrackId] = useState(tracks[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/enrollment/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, phone, trackId }),
      });
      if (!res.ok) throw new Error("failed");
      const { employeeId } = await res.json();
      router.push(`/enroll/consent?id=${employeeId}`);
    } catch {
      setError("Something went wrong. Check your info and try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Field label="First name" value={firstName} onChange={setFirstName} />
      <Field label="Last name" value={lastName} onChange={setLastName} />
      <Field label="Mobile number" value={phone} onChange={setPhone} placeholder="(308) 555-0142" />

      <div className="mb-5">
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
          Which crew are you on?
        </label>
        <select
          value={trackId}
          onChange={(e) => setTrackId(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-navy"
        >
          {tracks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-navy hover:bg-navy-dark disabled:opacity-60 text-white font-semibold text-sm py-3 rounded-lg transition"
      >
        {submitting ? "Creating your account..." : "Continue"}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="mb-4">
      <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
        {label}
      </label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-navy"
      />
    </div>
  );
}
