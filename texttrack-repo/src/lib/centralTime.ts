// Lessons go out on a Central-time calendar: the "week" starts Monday 00:00
// and the "month" starts on the 1st, both in America/Chicago, so a send at
// 7:00 AM Monday is always in the right week no matter where the server runs.

const TZ = "America/Chicago";

const fmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
  weekday: "short",
});

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function parts(date: Date) {
  const o: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) o[p.type] = p.value;
  return {
    y: Number(o.year),
    m: Number(o.month),
    d: Number(o.day),
    h: Number(o.hour),
    min: Number(o.minute),
    s: Number(o.second),
    weekdayIndex: WEEKDAYS.indexOf(o.weekday), // Monday = 0
  };
}

// Minutes to ADD to a UTC instant to get Central wall-clock time (negative).
function offsetMinutes(date: Date): number {
  const p = parts(date);
  return Math.round((Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s) - date.getTime()) / 60000);
}

// The UTC instant of Central midnight at the start of the given calendar day.
// Day values outside 1-31 roll over (Date.UTC handles that).
function centralMidnight(y: number, m: number, d: number): Date {
  const guess = Date.UTC(y, m - 1, d);
  let t = guess - offsetMinutes(new Date(guess)) * 60000;
  t = guess - offsetMinutes(new Date(t)) * 60000; // second pass settles daylight-saving edges
  return new Date(t);
}

export function startOfCentralWeek(now: Date = new Date()): Date {
  const p = parts(now);
  return centralMidnight(p.y, p.m, p.d - p.weekdayIndex);
}

export function startOfCentralMonth(now: Date = new Date()): Date {
  const p = parts(now);
  return centralMidnight(p.y, p.m, 1);
}

export function formatCentralDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    timeZone: TZ,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
