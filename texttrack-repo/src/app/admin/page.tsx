"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Temporary stand-in for real admin login (Milestone C). Every admin page
// reads its adminId from the URL rather than a session; this page just gives
// that pattern an entry point.
//
// TODO: replace with real email + password + MFA login in Milestone C.
// NOTE: must live at src/app/admin (no parentheses) — inside the (admin)
// route group it would collide with the homepage.
export default function AdminEntryPage() {
  const router = useRouter();
  const [adminId, setAdminId] = useState("");

  function go(path: string) {
    const id = adminId.trim();
    if (!id) return;
    router.push(`${path}?adminId=${encodeURIComponent(id)}`);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="card w-full max-w-sm p-8">
        <h1 className="text-lg font-bold text-navy mb-1">Admin Access</h1>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          Real admin login isn&apos;t built yet — enter your Admin ID, then choose where to go.
        </p>

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

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => go("/admin/tracks")}
            disabled={!adminId.trim()}
            className="w-full bg-navy hover:bg-navy-dark disabled:opacity-50 text-white font-semibold text-sm py-3 rounded-lg transition"
          >
            Tracks &amp; Topics
          </button>
          <button
            type="button"
            onClick={() => go("/content")}
            disabled={!adminId.trim()}
            className="w-full border border-navy text-navy hover:bg-gray-50 disabled:opacity-50 font-semibold text-sm py-3 rounded-lg transition"
          >
            Content Manager
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-5 text-center leading-relaxed">
          Don&apos;t have your Admin ID? Check your seed script output, or ask whoever set up your
          account.
        </p>
      </div>
    </main>
  );
}
