"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ConsentPage() {
  const router = useRouter();
  const employeeId = useSearchParams().get("id");

  const [checked, setChecked] = useState(false); // unchecked by default — required, don't change
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleContinue() {
    if (!employeeId) {
      setError("Missing enrollment link. Go back and try again.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, smsConsent: checked }),
      });
      if (!res.ok) throw new Error("submit_failed");

      // Enrollment completes either way — the branch only changes which
      // outcome screen is shown, never whether the account activates.
      router.push(`/enroll/outcome?path=${checked ? "sms" : "portal"}`);
    } catch {
      setError("Something went wrong. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="card w-full max-w-sm overflow-hidden">
        <div className="bg-navy text-white px-5 py-4">
          <div className="font-bold text-sm">TextTrack</div>
          <div className="text-xs text-blue-100 mt-0.5">Step 2 of 2 — Text message training</div>
          <div className="flex gap-1.5 mt-2.5">
            <div className="h-[3px] w-6 rounded bg-rust" />
            <div className="h-[3px] w-6 rounded bg-white" />
          </div>
        </div>

        <div className="px-5 py-5">
          <h1 className="text-lg font-bold mb-1">How should we send your training?</h1>
          <p className="text-sm text-gray-500 mb-5 leading-relaxed">
            Choose whether to receive lessons by text. Either way, you&apos;ll have full access
            through the app.
          </p>

          <button
            type="button"
            onClick={() => setChecked((c) => !c)}
            className="w-full text-left bg-amber-50 border border-amber-400 rounded-lg p-4 mb-4"
          >
            <div className="flex gap-3 items-start">
              <span
                className={`w-[22px] h-[22px] rounded-md border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                  checked ? "bg-rust-dark border-rust-dark" : "bg-white border-rust-dark"
                }`}
              >
                {checked && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13l4 4L19 7" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className="text-sm text-amber-950 leading-snug">
                Yes, send me my training by text message.
              </span>
            </div>
            <p className="text-[11.5px] text-amber-800 leading-relaxed mt-2.5 pt-2.5 border-t border-amber-300">
              Message frequency varies. Message and data rates may apply. No mobile information
              is shared with third parties for marketing purposes. Reply STOP anytime to cancel.
            </p>
          </button>

          <p className="text-sm text-gray-500 leading-relaxed">
            Leaving this unchecked is fine — you&apos;ll still get every lesson through the
            Courses tab.
          </p>

          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={handleContinue}
            disabled={submitting}
            className="w-full bg-navy hover:bg-navy-dark disabled:opacity-60 text-white font-semibold text-sm py-3 rounded-lg transition"
          >
            {submitting ? "Saving..." : "Continue"}
          </button>
        </div>
      </div>
    </main>
  );
}
