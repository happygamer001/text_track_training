"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Consent is now collected as part of /enroll/confirm in one combined view
// (see that page for why — it mirrors the pattern Twilio approved on the
// static demo). This page only exists so any old links or bookmarks still
// land somewhere useful instead of 404ing.
export default function ConsentRedirectPage() {
  return (
    <Suspense fallback={null}>
      <RedirectInner />
    </Suspense>
  );
}

function RedirectInner() {
  const router = useRouter();
  const employeeId = useSearchParams().get("id");

  useEffect(() => {
    router.replace(employeeId ? `/enroll/confirm?id=${employeeId}` : "/enroll/confirm");
  }, [employeeId, router]);

  return null;
}
