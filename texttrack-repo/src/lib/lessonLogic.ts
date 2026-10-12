import { smsInfo } from "./sms";

// Pure rules for the weekly lesson sender (no database, no network), kept
// separate so they can be tested on their own.

// Estimated all-in cost of one outbound segment: Twilio's $0.0083 plus the
// blended carrier surcharge (see the budget workbook, Carriers tab). An
// estimate for the preview screen only; the Twilio invoice is the real number.
export const COST_PER_SEGMENT = 0.0127;

// A lesson text longer than this many segments is refused (cost protection).
export const MAX_SEGMENTS_PER_TEXT = 3;

export const DEFAULT_MONTHLY_TEXT_CAP = 80;

export function monthlyTextCap(env: string | undefined = process.env.MONTHLY_TEXT_CAP): number {
  if (env === undefined || env.trim() === "") return DEFAULT_MONTHLY_TEXT_CAP;
  const n = Number(env);
  return Number.isInteger(n) && n >= 0 ? n : DEFAULT_MONTHLY_TEXT_CAP;
}

export function estimateCost(segments: number): number {
  return Math.round(segments * COST_PER_SEGMENT * 100) / 100;
}

export type CapCheck = { ok: boolean; remaining: number; over: number };
export function capCheck(usedThisMonth: number, adding: number, cap: number): CapCheck {
  const remaining = Math.max(0, cap - usedThisMonth);
  return { ok: usedThisMonth + adding <= cap, remaining, over: Math.max(0, usedThisMonth + adding - cap) };
}

export function validateLessonText(raw: string):
  | { ok: true; text: string; segments: number; encoding: "GSM" | "UCS2"; length: number }
  | { ok: false; error: string } {
  const text = raw.trim();
  if (!text) return { ok: false, error: "The text is empty." };
  const info = smsInfo(text);
  if (info.segments > MAX_SEGMENTS_PER_TEXT) {
    return {
      ok: false,
      error: `That text is ${info.segments} segments (${info.length} characters). The limit is ${MAX_SEGMENTS_PER_TEXT}; shorten it or replace dashes and curly quotes.`,
    };
  }
  return { ok: true, text, ...info };
}

// ---- who gets which lesson ----

export type PlanEmployee = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  status: string; // PRE_ENROLLED | ACTIVE | STALLED | SEPARATED
  trackId: string | null;
  trackName: string | null;
  currentTopic: number;
  smsConsent: boolean;
  doubleOptInAt: Date | null;
};
export type PlanTopic = {
  id: string;
  trackId: string;
  weekNumber: number;
  category: string;
  title: string;
  smsBody: string;
  deliveryFormat: string;
  videoFormat: string | null;
};
export type PlanGroup = {
  key: string;
  trackId: string;
  trackName: string;
  weekNumber: number;
  topic: PlanTopic;
  employees: { id: string; name: string; phone: string; status: string }[];
};
export type Skipped = { id: string; name: string; reason: string };

export function displayName(e: { firstName: string; lastName: string }): string {
  return `${e.firstName} ${e.lastName}`.trim() || "(name not entered)";
}

// alreadySentIds: employees who already have a lesson text logged this week.
export function buildGroups(
  employees: PlanEmployee[],
  topics: PlanTopic[],
  alreadySentIds: Set<string>,
  lastWeek: Map<string, number> // highest week number in each track
): { groups: PlanGroup[]; skipped: Skipped[] } {
  const topicByKey = new Map<string, PlanTopic>();
  for (const t of topics) topicByKey.set(`${t.trackId}:${t.weekNumber}`, t);

  const groups = new Map<string, PlanGroup>();
  const skipped: Skipped[] = [];
  const skip = (e: PlanEmployee, reason: string) => skipped.push({ id: e.id, name: displayName(e), reason });

  for (const e of employees) {
    if (e.status === "SEPARATED") continue; // never listed, never texted
    if (e.status === "PRE_ENROLLED") { skip(e, "Hasn't finished sign-up yet"); continue; }
    if (!e.smsConsent) { skip(e, "Not opted in to texts (or replied STOP)"); continue; }
    if (!e.doubleOptInAt) { skip(e, "Hasn't replied YES yet"); continue; }
    if (!e.trackId) { skip(e, "No track assigned"); continue; }
    if (alreadySentIds.has(e.id)) { skip(e, "Already got a lesson this week"); continue; }
    const topic = topicByKey.get(`${e.trackId}:${e.currentTopic}`);
    if (!topic) {
      const last = lastWeek.get(e.trackId) ?? 0;
      skip(e, e.currentTopic > last ? `Finished the ${e.trackName ?? "track"} (no week ${e.currentTopic})` : `No topic for week ${e.currentTopic}`);
      continue;
    }
    const key = `${e.trackId}:${e.currentTopic}`;
    let g = groups.get(key);
    if (!g) {
      g = { key, trackId: e.trackId, trackName: e.trackName ?? "", weekNumber: e.currentTopic, topic, employees: [] };
      groups.set(key, g);
    }
    g.employees.push({ id: e.id, name: displayName(e), phone: e.phone, status: e.status });
  }

  const sorted = Array.from(groups.values()).sort(
    (a, b) => a.trackName.localeCompare(b.trackName) || a.weekNumber - b.weekNumber
  );
  return { groups: sorted, skipped };
}
