import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionAdmin } from "@/lib/adminSession";
import LogoutButton from "@/components/admin/LogoutButton";

export const dynamic = "force-dynamic";

// NOTE: must live at src/app/admin (no parentheses) — inside the (admin)
// route group it would collide with the homepage.
export default async function AdminHome() {
  const admin = await getSessionAdmin();
  if (!admin) redirect("/admin/login");

  const tiles = [
    { href: "/admin/enrollments", title: "Enrollments", body: "Who has signed up, their status, track, and text consent." },
    { href: "/admin/tracks", title: "Tracks & Topics", body: "Create tracks and add the weekly topics." },
    { href: "/content", title: "Content Manager", body: "Upload videos and handouts for each topic." },
  ];

  return (
    <main className="min-h-screen px-6 py-10 max-w-3xl mx-auto">
      <div className="flex items-baseline justify-between mb-1">
        <h1 className="text-xl font-bold text-navy">TextTrack Admin</h1>
        <LogoutButton />
      </div>
      <p className="text-sm text-gray-500 mb-8">
        Signed in as {admin.name} ({admin.email}).
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className="card border border-gray-100 p-5 hover:border-navy transition">
            <div className="text-sm font-bold text-navy mb-1">{t.title}</div>
            <div className="text-xs text-gray-500 leading-relaxed">{t.body}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
