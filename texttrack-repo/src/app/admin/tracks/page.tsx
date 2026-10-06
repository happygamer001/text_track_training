import Link from "next/link";
import { db } from "@/lib/db";
import { NewTrackForm, AddTopicForm } from "@/components/admin/CurriculumForms";

export const dynamic = "force-dynamic";

// Protected by src/middleware.ts (signed-in admins only).
export default async function TracksPage() {
  const tracks = await db.track.findMany({
    orderBy: { name: "asc" },
    include: { topics: { orderBy: { weekNumber: "asc" } } },
  });

  const options = tracks.map((t) => ({
    id: t.id,
    name: t.name,
    nextWeek: (t.topics.at(-1)?.weekNumber ?? 0) + 1,
  }));

  return (
    <main className="min-h-screen px-6 py-10 max-w-3xl mx-auto">
      <Link href="/admin" className="text-xs text-gray-400 hover:text-navy">← Admin</Link>
      <h1 className="text-xl font-bold text-navy mt-2 mb-1">Tracks & Topics</h1>
      <p className="text-sm text-gray-500 mb-6">
        Create tracks and add the weekly topics employees receive. Attach videos and handouts to a
        topic afterwards in the{" "}
        <Link className="underline text-navy" href="/content">Content Manager</Link>.
      </p>

      <NewTrackForm />

      <h2 className="text-sm font-bold uppercase tracking-wide text-rust mb-3">Existing</h2>
      {tracks.length === 0 && <p className="text-sm text-gray-400 mb-8">No tracks yet.</p>}
      <div className="space-y-4 mb-8">
        {tracks.map((t) => (
          <div key={t.id} className="card border border-gray-100 p-4">
            <div className="text-sm font-semibold mb-2">
              {t.name} <span className="text-xs font-normal text-gray-400">· {t.topics.length} topics</span>
            </div>
            <ul className="space-y-1">
              {t.topics.map((tp) => (
                <li key={tp.id} className="text-xs text-gray-600">
                  <span className="text-gray-400 mr-1">Wk {tp.weekNumber}</span>
                  {tp.title} <span className="text-gray-400">({tp.deliveryFormat})</span>
                </li>
              ))}
              {t.topics.length === 0 && <li className="text-xs text-gray-400">No topics yet.</li>}
            </ul>
          </div>
        ))}
      </div>

      <AddTopicForm tracks={options} />
    </main>
  );
}
