export function formatPhone(e164: string): string {
  const m = e164.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164;
}

export type ConsentView = { label: string; tone: "green" | "amber" | "gray" | "red" };

export function consentView(
  consent: { smsConsent: boolean; consentedAt: Date | null; doubleOptInAt: Date | null } | null
): ConsentView {
  if (!consent) return { label: "Hasn't reached consent step", tone: "gray" };
  if (consent.smsConsent && consent.doubleOptInAt) return { label: "Texts confirmed (replied YES)", tone: "green" };
  if (consent.smsConsent) return { label: "Opted in — waiting for YES reply", tone: "amber" };
  if (consent.consentedAt) return { label: "Opted out of texts (STOP)", tone: "red" };
  return { label: "Portal only (no texts)", tone: "gray" };
}
