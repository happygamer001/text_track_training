"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// TODO: adminId is passed in as a prop from the query string for now (see
// (admin)/content/page.tsx) — replace with the logged-in admin's id from the
// session once auth.ts (Milestone 4) is built.
export default function ContentUploadForm({
  topicId,
  adminId,
  hasExisting,
}: {
  topicId: string;
  adminId: string | null;
  hasExisting: boolean;
}) {
  const router = useRouter();
  const [type, setType] = useState<"handout" | "document" | "video">("handout");
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!adminId) {
      setError("Missing admin session — this link needs ?adminId=... until real login is built.");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      let url = videoUrl;
      let fileName = "linked-video";

      if (type !== "video") {
        if (!file) {
          setError("Choose a file to upload.");
          setSubmitting(false);
          return;
        }
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await fetch("/api/admin/content/upload", {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) throw new Error("upload_failed");
        const uploaded = await uploadRes.json();
        url = uploaded.url;
        fileName = uploaded.fileName;
      } else if (!videoUrl) {
        setError("Paste the Bunny Stream link for this video.");
        setSubmitting(false);
        return;
      }

      const res = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId, type, url, fileName, uploadedById: adminId }),
      });
      if (!res.ok) throw new Error("save_failed");

      setFile(null);
      setVideoUrl("");
      router.refresh(); // reload the server component's data so the new asset shows up
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 mt-2">
      <select
        value={type}
        onChange={(e) => setType(e.target.value as typeof type)}
        className="border border-gray-200 rounded-md px-2 py-1.5 text-xs"
      >
        <option value="handout">Handout</option>
        <option value="document">Document</option>
        <option value="video">Video (Bunny Stream link)</option>
      </select>

      {type === "video" ? (
        <input
          type="url"
          placeholder="https://iframe.mediadelivery.net/..."
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          className="border border-gray-200 rounded-md px-2 py-1.5 text-xs flex-1 min-w-[180px]"
        />
      ) : (
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-xs flex-1 min-w-[180px]"
        />
      )}

      <button
        type="submit"
        disabled={submitting}
        className="bg-navy hover:bg-navy-dark disabled:opacity-60 text-white text-xs font-semibold px-3 py-1.5 rounded-md"
      >
        {submitting ? "Saving..." : hasExisting ? "Replace" : "Upload"}
      </button>

      {error && <p className="text-xs text-red-600 w-full">{error}</p>}
    </form>
  );
}
