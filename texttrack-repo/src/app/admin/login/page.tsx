"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const inputCls =
  "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-navy";
const labelCls = "block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const rawNext = params.get("next") ?? "/admin";
  // Only ever send people back to an admin page — never an arbitrary URL.
  const next = /^\/(admin|content)(\/|$)/.test(rawNext) ? rawNext : "/admin";

  const [step, setStep] = useState<"password" | "setup" | "mfa">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function post(url: string, body: unknown) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Something went wrong.");
    return data;
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await post("/api/admin/auth/login", { email, password });
      setPassword("");
      if (data.step === "setup") setSecret(data.secret);
      setStep(data.step);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await post("/api/admin/auth/mfa", { code });
      router.push(next);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="card w-full max-w-sm p-8">
        <h1 className="text-lg font-bold text-navy mb-1">Admin sign in</h1>

        {step === "password" && (
          <form onSubmit={submitPassword}>
            <p className="text-sm text-gray-500 mb-5">TextTrack admin access only.</p>
            <label className={labelCls}>Email</label>
            <input className={`${inputCls} mb-4`} type="email" autoComplete="username" value={email}
              onChange={(e) => setEmail(e.target.value)} required />
            <label className={labelCls}>Password</label>
            <input className={`${inputCls} mb-5`} type="password" autoComplete="current-password" value={password}
              onChange={(e) => setPassword(e.target.value)} required />
            <Submit busy={busy} label="Continue" />
          </form>
        )}

        {(step === "mfa" || step === "setup") && (
          <form onSubmit={submitCode}>
            {step === "setup" ? (
              <div className="text-sm text-gray-600 mb-4 leading-relaxed">
                <p className="mb-3">
                  First sign-in: set up your authenticator app (Google Authenticator, Microsoft
                  Authenticator, 1Password, etc.).
                </p>
                <ol className="list-decimal ml-5 space-y-1 mb-3">
                  <li>In the app, add an account and choose <b>Enter a setup key</b>.</li>
                  <li>Type this key (account: your email, type: time-based):</li>
                </ol>
                <div className="bg-gray-100 rounded-lg px-3 py-2 font-mono text-sm tracking-wider break-all select-all mb-3">
                  {secret}
                </div>
                <p>Then enter the 6-digit code the app shows.</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-5">
                Enter the 6-digit code from your authenticator app.
              </p>
            )}
            <label className={labelCls}>6-digit code</label>
            <input className={`${inputCls} mb-5 tracking-widest`} inputMode="numeric" autoComplete="one-time-code"
              maxLength={7} value={code} onChange={(e) => setCode(e.target.value)} autoFocus required />
            <Submit busy={busy} label={step === "setup" ? "Finish setup & sign in" : "Sign in"} />
            <button type="button" className="w-full text-xs text-gray-400 mt-3 hover:text-navy"
              onClick={() => { setStep("password"); setCode(""); setError(""); }}>
              ← Start over
            </button>
          </form>
        )}

        {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
      </div>
    </main>
  );
}

function Submit({ busy, label }: { busy: boolean; label: string }) {
  return (
    <button type="submit" disabled={busy}
      className="w-full bg-navy hover:bg-navy-dark disabled:opacity-60 text-white font-semibold text-sm py-3 rounded-lg transition">
      {busy ? "One moment…" : label}
    </button>
  );
}
