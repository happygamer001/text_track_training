import { db } from "@/lib/db";

// TEMPORARY admin check: confirms the adminId sent with a request is a real
// Admin row. This is NOT real authentication (the id travels in the request).
// Replace with session + MFA checks in Milestone C.
export async function findAdmin(adminId: unknown) {
  if (typeof adminId !== "string" || adminId.trim() === "") return null;
  return db.admin.findUnique({ where: { id: adminId.trim() } });
}
