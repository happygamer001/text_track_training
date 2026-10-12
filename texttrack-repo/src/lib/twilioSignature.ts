import twilio from "twilio";
import type { NextRequest } from "next/server";

// Confirms an incoming webhook really came from Twilio. Twilio signs every
// request with your Auth Token (X-Twilio-Signature header); anyone else can't
// produce a valid signature, so a forged "YES", "STOP" or "JOIN" is rejected.
//
// TWILIO_SIGNATURE_MODE:
//   "enforce" (default) - invalid or missing signature => request refused (403)
//   "log"               - only log a warning; use briefly if a deploy needs debugging

export type SignatureResult = { ok: boolean; reason?: string };

export function signatureMode(): "enforce" | "log" {
  return process.env.TWILIO_SIGNATURE_MODE === "log" ? "log" : "enforce";
}

// Twilio signs the exact URL it was told to call. Behind Vercel the URL the
// function sees can differ (host, scheme), so we try the configured public
// address first, then the forwarded host. Every candidate still needs the
// correct HMAC, so this doesn't weaken the check.
function candidateUrls(req: NextRequest): string[] {
  const path = req.nextUrl.pathname + req.nextUrl.search;
  const urls: string[] = [];
  const base = process.env.TWILIO_WEBHOOK_BASE_URL || process.env.PUBLIC_APP_URL;
  if (base) urls.push(base.replace(/\/+$/, "") + path);
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  if (host) urls.push(`${proto}://${host}${path}`);
  return Array.from(new Set(urls));
}

export function formParams(form: FormData): Record<string, string> {
  const params: Record<string, string> = {};
  form.forEach((value, key) => {
    if (typeof value === "string") params[key] = value;
  });
  return params;
}

export function checkTwilioSignature(req: NextRequest, params: Record<string, string>): SignatureResult {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) return { ok: false, reason: "TWILIO_AUTH_TOKEN is not set on the server" };
  const signature = req.headers.get("x-twilio-signature");
  if (!signature) return { ok: false, reason: "missing X-Twilio-Signature header" };
  const urls = candidateUrls(req);
  if (urls.length === 0) return { ok: false, reason: "could not work out the webhook URL (set PUBLIC_APP_URL)" };
  for (const url of urls) {
    if (twilio.validateRequest(token, signature, url, params)) return { ok: true };
  }
  return { ok: false, reason: `signature did not match for ${urls.join(" or ")}` };
}
