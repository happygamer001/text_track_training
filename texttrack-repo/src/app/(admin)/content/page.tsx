import Link from "next/link";
import { db } from "@/lib/db";
import ContentUploadForm from "@/components/admin/ContentUploadForm";

// Renders per-request rather than at build time — this page shows live
// content state (what's currently uploaded) and stops the build from
// needing a live database connection.
export const dynamic = "force-dynamic";

// Protected by src/middleware.ts (signed-in admins only).
export default async function ContentManagerPage() {
  const tracks = await db.track.findMany({
    include: {
      topics: {
        orderBy: { weekNumber: "asc" },
        include: {
          assets: { where: { isCurrent: true } },
        },
      },
    },
  });

  return (
    <main className="min-h-screen px-6 py-10 max-w-3xl mx-auto">
      <Link href="/admin" className="text-xs text-gray-400 hover:text-navy">← Admin</Link>
      <h1 className="text-xl font-bold text-navy mt-2 mb-1">Track & Content Manager</h1>
      <p className="text-sm text-gray-500 mb-8">
        Upload or replace the learning material attached to each topic. Employees only ever see
        the current version — earlier versions stay on record instead of being deleted.
      </p>


      {tracks.length === 0 && (
        <p className="text-sm text-gray-400">No tracks yet — seed or create one to get started.</p>
      )}

      {tracks.map((track) => (
        <div key={track.id} className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-wide text-rust mb-3">{track.name}</h2>

          <div className="space-y-3">
            {track.topics.map((topic) => (
              <div key={topic.id} className="card border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-gray-400 mb-0.5">Week {topic.weekNumber} — {topic.category}</div>
                    <div className="text-sm font-semibold">{topic.title}</div>
                  </div>
                </div>

                {topic.assets.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {topic.assets.map((asset) => (
                      <li key={asset.id} className="text-xs text-gray-500">
                        <span className="uppercase font-semibold text-gray-400 mr-1">{asset.type}</span>
                        <a href={asset.url} target="_blank" rel="noreferrer" className="text-navy underline">
                          {asset.fileName}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-400 mt-2">No material uploaded yet.</p>
                )}

                <ContentUploadForm
                  topicId={topic.id}
                  hasExisting={topic.assets.length > 0}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </main>
  );
}
