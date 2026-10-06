import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireAdminApi } from "@/lib/adminSession";

// POST /api/admin/content/upload
// Accepts multipart/form-data with a single "file" field.
// Only for handouts/documents — video should never be routed through this
// endpoint. Serverless functions have a request body size ceiling, which is
// exactly why video stays on Bunny Stream as a pasted link instead (see
// src/app/api/admin/content/route.ts and the Security & Content Architecture PDF).
export async function POST(req: NextRequest) {
  // Previously unauthenticated — anyone could upload to the blob store.
  const auth = await requireAdminApi(req);
  if ("error" in auth) return auth.error;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const blob = await put(`content/${Date.now()}-${file.name}`, file, {
    access: "public",
  });

  return NextResponse.json({ url: blob.url, fileName: file.name });
}
