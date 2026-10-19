// Pure helpers for the Delivery history page.

export const DELIVERY_STATUSES = ["queued", "sent", "delivered", "failed"] as const;
export const RANGES = ["week", "month", "all"] as const;
export type DeliveryRange = (typeof RANGES)[number];

export function parseStatus(v: string | undefined): (typeof DELIVERY_STATUSES)[number] | null {
  return (DELIVERY_STATUSES as readonly string[]).includes(v ?? "") ? (v as (typeof DELIVERY_STATUSES)[number]) : null;
}

export function parseRange(v: string | undefined): DeliveryRange {
  return (RANGES as readonly string[]).includes(v ?? "") ? (v as DeliveryRange) : "month";
}

// Human labels for audit actions written by the app.
export function describeAudit(action: string, targetId: string | null): string {
  switch (action) {
    case "lessons.send":
      return `Sent lessons${targetId ? ` (${targetId})` : ""}`;
    default:
      return targetId ? `${action} (${targetId})` : action;
  }
}

export function statusTone(status: string): "green" | "amber" | "red" | "gray" {
  if (status === "delivered") return "green";
  if (status === "sent") return "green";
  if (status === "queued") return "amber";
  if (status === "failed") return "red";
  return "gray";
}
