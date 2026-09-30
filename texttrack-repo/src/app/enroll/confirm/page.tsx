"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// This page intentionally does everything in ONE view — nothing is hidden
// behind a click. Profile fields, the OPTIONAL SMS consent checkbox, and a
// SEPARATE required Terms/Privacy acknowledgment are all visible on load.
// This mirrors the exact pattern already approved by Twilio on the static
// enroll-preview.html demo — see /areas/texttrack.md for the compliance
// history behind why this specific structure matters:
//   - SMS consent is optional and never gates continuing
//   - Terms/Privacy agreement is required, but is a SEPARATE action from
//     SMS consent — checking it does not opt anyone into text messages
//   - Every disclosure (frequency, rates, HELP, STOP, non-sharing) is
//     visible on load, not gated behind interaction
//
// TODO: this reads a raw employee id from the URL. Swap for a signed,
// expiring invite token before this goes live for real employees.
export default function ConfirmProfilePage() {
  return (
    <Suspense fallback={<CenteredMessage text="Loading your info..." />}>
      <ConfirmProfileInner />
    </Suspense>
  );
}

function ConfirmProfileInner() {
  const router = useRouter();
  const employeeId = useSearchParams().get("id");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [trackName, setTrackName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [smsConsent, setSmsConsent] = useState(false); // unchecked by default — required, do not change
  const [legalAgreed, setLegalAgreed] = useState(false);

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

    if (!legalAgreed) {
      setError("Please check the box confirming you've read the Privacy Policy and Terms of Service.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      // Save profile corrections
      const profileRes = await fetch(`/api/enrollment/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, phone }),
      });
      if (!profileRes.ok) throw new Error("save_failed");

      // Record SMS consent (or lack thereof) as its own, separate action
      const consentRes = await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, smsConsent }),
      });
      if (!consentRes.ok) throw new Error("consent_failed");

      router.push(`/enroll/outcome?path=${smsConsent ? "sms" : "portal"}`);
    } catch {
      setError("Something went wrong. Try again.");
      setSaving(false);
    }
  }

  if (loading) return <CenteredMessage text="Loading your info..." />;
  if (error && !employeeId) return <CenteredMessage text={error} />;

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="card w-full max-w-md overflow-hidden">
        <div className="bg-navy text-white px-6 py-5">
          <div className="font-bold text-lg">TextTrack</div>
          <div className="text-xs text-blue-100 mt-0.5">Chipperfield Ag Erectors LLC</div>
        </div>

        <div className="px-6 py-6">
          <h1 className="text-lg font-bold mb-1">Welcome to TextTrack</h1>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            Your foreman set up your account. Confirm your info below, then choose how you&apos;d
            like to receive your training.
          </p>

          <Field label="First name" value={firstName} onChange={setFirstName} />
          <Field label="Last name" value={lastName} onChange={setLastName} />
          <Field label="Mobile number" value={phone} onChange={setPhone} />

          <div className="mb-6">
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
              Training track
            </label>
            <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-400 text-amber-900 text-xs font-semibold px-3 py-1.5 rounded-full">
              {trackName}
            </span>
          </div>

          <hr className="border-gray-200 mb-5" />

          <div className="text-xs font-bold uppercase tracking-wide text-navy mb-1">
            Text message training
          </div>
          <p className="text-xs text-gray-500 mb-3 leading-relaxed">
            Optional. Every employee gets full training through the web portal either way —
            this only controls whether you also get texts.
          </p>

          {/* SMS consent — optional, unchecked by default, never gates continuing */}
          <button
            type="button"
            onClick={() => setSmsConsent((c) => !c)}
            className="w-full text-left bg-amber-50 border border-amber-400 rounded-lg p-4 mb-4"
          >
            <span className="inline-block bg-white border border-amber-400 text-amber-800 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full mb-2">
              Optional — not required to continue
            </span>
            <div className="flex gap-3 items-start">
              <span
                className={`w-[22px] h-[22px] rounded-md border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                  smsConsent ? "bg-rust-dark border-rust-dark" : "bg-white border-rust-dark"
                }`}
              >
                {smsConsent && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13l4 4L19 7" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className="text-sm text-amber-950 leading-snug">
                <strong>By checking this box, I consent to receive recurring automated text
                messages containing job training lessons, coursework reminders, and related
                program notices from Chipperfield Ag Erectors LLC (TextTrack) at the phone
                number provided.</strong> Consent is not a condition of employment or enrollment.
              </span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed mt-2.5 pt-2.5 border-t border-amber-300">
              Message frequency varies. Message and data rates may apply. No mobile information
              is shared with third parties for marketing purposes. Reply HELP for help, STOP to
              cancel.
            </p>
          </button>

          <div className="flex gap-3 text-xs font-semibold mb-3">
            <a href="https://training.chipperfield.ag/privacy-policy.html" target="_blank" rel="noopener" className="text-navy underline">
              Privacy Policy
            </a>
            <span className="text-gray-300">|</span>
            <a href="https://training.chipperfield.ag/terms-of-service.html" target="_blank" rel="noopener" className="text-navy underline">
              Terms of Service
            </a>
          </div>

          {/* Terms/Privacy agreement — required, but deliberately a SEPARATE
              action from SMS consent above. Checking this does not opt
              anyone into text messages. */}
          <button
            type="button"
            onClick={() => setLegalAgreed((a) => !a)}
            className="w-full flex gap-2.5 items-start text-left mb-1"
          >
            <span
              className={`w-[18px] h-[18px] rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                legalAgreed ? "bg-navy border-navy" : "bg-white border-navy"
              }`}
            >
              {legalAgreed && (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span className="text-xs text-gray-500 leading-snug">
              I have read and agree to the Privacy Policy and Terms of Service.
              <span className="block text-gray-400 mt-0.5">
                This is separate from text messaging above — it does not opt you into SMS.
              </span>
            </span>
          </button>

          {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={handleContinue}
            disabled={saving}
            className="w-full bg-navy hover:bg-navy-dark disabled:opacity-60 text-white font-semibold text-sm py-3 rounded-lg transition"
          >
            {saving ? "Saving..." : "Continue"}
          </button>
          <p className="text-xs text-gray-400 text-center mt-3 leading-relaxed">
            Leaving the SMS box unchecked is fine — you&apos;ll still get every lesson through
            the Courses tab instead of by text.
          </p>
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
