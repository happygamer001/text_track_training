import { db } from "@/lib/db";
import StartEnrollForm from "@/components/employee/StartEnrollForm";

export const dynamic = "force-dynamic";

export default async function StartEnrollPage() {
  const tracks = await db.track.findMany({ select: { id: true, name: true } });

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="card w-full max-w-sm overflow-hidden">
        <div className="bg-navy text-white px-5 py-4">
          <div className="font-bold text-sm">TextTrack</div>
          <div className="text-xs text-blue-100 mt-0.5">Sign up</div>
        </div>

        <div className="px-5 py-5">
          <h1 className="text-lg font-bold mb-1">Join TextTrack</h1>
          <p className="text-sm text-gray-500 mb-5 leading-relaxed">
            Enter your info to get started. You&apos;ll choose how you want to receive your
            training on the next screen.
          </p>

          {tracks.length === 0 ? (
            <p className="text-sm text-gray-400">
              No training tracks are set up yet — check back soon.
            </p>
          ) : (
            <StartEnrollForm tracks={tracks} />
          )}
        </div>
      </div>
    </main>
  );
}
