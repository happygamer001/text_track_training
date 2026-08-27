"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// TODO (see api/enrollment/[id]/route.ts): this reads a raw employee id from
// the URL. Swap for a signed invite token before this goes live.
export default function ConfirmProfilePage() {
  const router = useRouter();
  const employeeId = useSearchParams().get("id");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [trackName, setTrackName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!employeeId) {
      setError("Missing enrollment link. Ask your admin to resend your invite.");
      setLoading(false);
      return;
    }
    fetch(`/api/enrollment/${employeeId}`)
      .then((res) => {
        if (!res.ok) throw new Error("not_found");
        return res.json();
      })
      .then((data) => {
        setFirstName(data.firstName);
        setLastName(data.lastName);
        setPhone(data.phone);
        setTrackName(data.trackName ?? "Not yet assigned");
        setLoading(false);
      })
      .catch(() => {
        setError("We couldn't find your enrollment. Ask your admin to resend your invite.");
        setLoading(false);
      });
  }, [employeeId]);

  async function handleContinue() {
    if (!employeeId) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/enrollment/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, phone }),
      });
      if (!res.ok) throw new Error("save_failed");
      router.push(`/enroll/consent?id=${employeeId}`);
    } catch {
      setError("Something went wrong saving your info. Try again.");
      setSaving(false);
    }
  }

  if (loading) {
    return <CenteredMessage text="Loading your info..." />;
  }
  if (error && !employeeId) {
    return <CenteredMessage text={error} />;
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="card w-full max-w-sm overflow-hidden">
        <div className="bg-navy text-white px-5 py-4">
          <div className="font-bold text-sm">TextTrack</div>
          <div className="text-xs text-blue-100 mt-0.5">Step 1 of 2 — Confirm your info</div>
          <div className="flex gap-1.5 mt-2.5">
            <div className="h-[3px] w-6 rounded bg-white" />
            <div className="h-[3px] w-6 rounded bg-white/25" />
          </div>
        </div>

        <div className="px-5 py-5">
          <h1 className="text-lg font-bold mb-1">Welcome to TextTrack</h1>
          <p className="text-sm text-gray-500 mb-5 leading-relaxed">
            Your foreman set up your account. Double-check everything below before you continue.
          </p>

          <Field label="First name" value={firstName} onChange={setFirstName} />
          <Field label="Last name" value={lastName} onChange={setLastName} />
          <Field label="Mobile number" value={phone} onChange={setPhone} />

          <div className="mb-2">
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
              Training track
            </label>
            <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-400 text-amber-900 text-xs font-semibold px-3 py-1.5 rounded-full">
              {trackName}
            </span>
          </div>

          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={handleContinue}
            disabled={saving}
            className="w-full bg-navy hover:bg-navy-dark disabled:opacity-60 text-white font-semibold text-sm py-3 rounded-lg transition"
          >
            {saving ? "Saving..." : "Looks good, continue"}
          </button>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mb-4">
      <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-navy"
      />
    </div>
  );
}

function CenteredMessage({ text }: { text: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <p className="text-sm text-gray-500 text-center max-w-xs">{text}</p>
    </main>
  );
}
