// Minimal in-memory rate limiter for local development.
//
// TODO before production: swap this for a durable store (Vercel KV / Upstash Redis) —
// an in-memory Map resets on every deploy and doesn't work across multiple server
// instances, so it only protects a single running process.

const attempts = new Map<string, { count: number; windowStart: number }>();

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_PER_WINDOW = 5; // matches the OTP request limit noted in the security PDF

export function checkRateLimit(key: string): { allowed: boolean } {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    attempts.set(key, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (entry.count >= MAX_PER_WINDOW) {
    return { allowed: false };
  }

  entry.count += 1;
  return { allowed: true };
}
