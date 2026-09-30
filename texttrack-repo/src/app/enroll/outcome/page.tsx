"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

export default function OutcomePage() {
  return (
    <Suspense fallback={<CenteredMessage text="Loading..." />}>
      <OutcomePageInner />
    </Suspense>
  );
}

function OutcomePageInner() {
  const path = useSearchParams().get("path");
  const isSms = path === "sms";

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="card w-full max-w-sm overflow-hidden">
        <div className="bg-navy text-white px-6 py-5">
          <div className="font-bold text-lg">TextTrack</div>
          <div className="text-xs text-blue-100 mt-0.5">You&apos;re set</div>
        </div>

        <div className="px-6 py-10 text-center">
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
            </>
          ) : (
            <>
              <h1 className="text-base font-bold mb-2">You&apos;re all set</h1>
              <p className="text-sm text-gray-500 leading-relaxed px-2">
                Your training is ready in the Courses tab anytime. You can turn on text
                reminders later from your Profile page if you change your mind.
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function CenteredMessage({ text }: { text: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <p className="text-sm text-gray-500 text-center max-w-xs">{text}</p>
    </main>
  );
}
