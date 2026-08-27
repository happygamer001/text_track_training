import { db } from "@/lib/db";

// Renders per-request rather than at build time — this page is personalized
// per employee via the query string, so there's nothing meaningful to
// pre-render statically anyway, and it stops the build from needing a live
// database connection.
export const dynamic = "force-dynamic";

// TODO: id comes from the query string for now, same as the enrollment flow —
// replace with the logged-in employee's session once auth.ts (Milestone 4) is
// built. This page is intentionally read-only: no edit/delete controls exist
// anywhere here, only viewing and (for video) re-watching.
export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  if (!id) {
    return <CenteredMessage text="Missing employee link." />;
  }

  const employee = await db.employee.findUnique({
    where: { id },
    include: {
      track: {
        include: {
          topics: {
            orderBy: { weekNumber: "asc" },
            include: { assets: { where: { isCurrent: true } } },
          },
        },
      },
      progress: true,
    },
  });

  if (!employee || !employee.track) {
    return <CenteredMessage text="We couldn't find your courses. Ask your admin for help." />;
  }

  const progressByTopic = new Map(employee.progress.map((p) => [p.topicId, p]));

  return (
    <main className="min-h-screen px-5 py-8 max-w-lg mx-auto">
      <h1 className="text-lg font-bold text-navy mb-1">Your courses</h1>
      <p className="text-sm text-gray-500 mb-6">
        {employee.track.name} — revisit anything below anytime, as many times as you want.
      </p>

      <div className="space-y-3">
        {employee.track.topics.map((topic) => {
          const progress = progressByTopic.get(topic.id);
          const asset = topic.assets[0];

          return (
            <div key={topic.id} className="card border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">Week {topic.weekNumber}</div>
                  <div className="text-sm font-semibold">{topic.title}</div>
                </div>
                {progress?.completedAt && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-green-700 bg-green-100 px-2 py-0.5 rounded-full flex-shrink-0">
                    Done
                  </span>
                )}
              </div>

              {asset ? (
                asset.type === "video" ? (
                  <a
                    href={asset.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block mt-3 text-xs font-semibold text-white bg-navy hover:bg-navy-dark px-3 py-1.5 rounded-md"
                  >
                    {progress?.clickedAt ? "Watch again" : "Watch"}
                  </a>
                ) : (
                  <a
                    href={asset.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block mt-3 text-xs font-semibold text-navy underline"
                  >
                    {progress?.clickedAt ? "Reopen" : "Open"} {asset.type}
                  </a>
                )
              ) : (
                <p className="text-xs text-gray-400 mt-3">Material coming soon.</p>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}

function CenteredMessage({ text }: { text: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <p className="text-sm text-gray-500 text-center max-w-xs">{text}</p>
    </main>
  );
}
