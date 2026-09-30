"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Temporary stand-in for real admin login (Milestone C). Right now every
// admin page reads its adminId from the URL rather than a session — this
// page just gives that pattern an actual entry point to click into, instead
// of requiring someone to hand-type a URL with their ID already in it.
//
// TODO: replace this whole page with real email + password + MFA login
// once Milestone C is built, and have it set a session instead of passing
// an id around in the URL.
export default function AdminEntryPage() {
  const router = useRouter();
  const [adminId, setAdminId] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!adminId.trim()) return;
    router.push(`/content?adminId=${adminId.trim()}`);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="card w-full max-w-sm p-8">
        <h1 className="text-lg font-bold text-navy mb-1">Admin Access</h1>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          Real admin login isn&apos;t built yet — enter your Admin ID to continue to the
          dashboard for now.
        </p>

        <form onSubmit={handleSubmit}>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
            Admin ID
          </label>
          <input
            type="text"
            value={adminId}
            onChange={(e) => setAdminId(e.target.value)}
            placeholder="e.g. cmg3k9f2a0001..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm mb-4 focus:outline-none focus:border-navy"
          />
          <button
            type="submit"
            className="w-full bg-navy hover:bg-navy-dark text-white font-semibold text-sm py-3 rounded-lg transition"
          >
            Continue to Dashboard
          </button>
        </form>

        <p className="text-xs text-gray-400 mt-5 text-center leading-relaxed">
          Don&apos;t have your Admin ID? Check your seed script output, or ask whoever set up
          your account.
        </p>
      </div>
    </main>
  );
}
