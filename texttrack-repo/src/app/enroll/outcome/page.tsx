"use client";

import { useSearchParams } from "next/navigation";

export default function OutcomePage() {
  const path = useSearchParams().get("path");
  const isSms = path === "sms";

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="card w-full max-w-sm overflow-hidden">
        <div className="bg-navy text-white px-5 py-4">
          <div className="font-bold text-sm">TextTrack</div>
          <div className="text-xs text-blue-100 mt-0.5">You&apos;re set</div>
          <div className="flex gap-1.5 mt-2.5">
            <div className="h-[3px] w-6 rounded bg-rust" />
            <div className="h-[3px] w-6 rounded bg-rust" />
          </div>
        </div>

        <div className="px-5 py-10 text-center">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${
              isSms ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
            }`}
          >
            {isSms ? (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="4" width="16" height="16" stroke="currentColor" strokeWidth={2} />
                <path d="M4 9h16" stroke="currentColor" strokeWidth={2} />
              </svg>
            )}
          </div>

          {isSms ? (
            <>
              <h1 className="text-base font-bold mb-2">Almost done</h1>
              <p className="text-sm text-gray-500 leading-relaxed px-2 mb-5">
                One last step — reply YES to the text we just sent to confirm.
              </p>
              <div className="bg-gray-100 rounded-2xl p-3.5 text-left">
                <div className="text-[9.5px] uppercase tracking-wide text-gray-400 font-mono mb-1.5">
                  Text message preview
                </div>
                <p className="text-[12.5px] leading-relaxed">
                  Reply YES to start receiving TextTrack training texts. Msg &amp; data rates may
                  apply. Reply STOP to cancel.
                </p>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-base font-bold mb-2">You&apos;re all set</h1>
              <p className="text-sm text-gray-500 leading-relaxed px-2">
                Your training is ready in the Courses tab anytime. You can turn on text reminders
                later from your Profile page if you change your mind.
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
