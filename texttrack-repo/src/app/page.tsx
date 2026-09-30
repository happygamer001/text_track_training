// There's no real employee login screen yet (Milestone 4), so this page
// doesn't try to be one. Employees always arrive via a personal link (their
// enrollment invite or a training text), never by typing this bare
// subdomain — so the main path here just points them to the info page on
// the main site. Admins, who do need a real reason to land here directly,
// get a distinct, deliberately less prominent path to the dashboard.
//
// TODO: once real admin auth (Milestone C) is built, replace the "Admin"
// link below with an actual login screen instead of linking straight to
// /content.
export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="card w-full max-w-sm p-8 text-center">
        <h1 className="text-xl font-bold text-navy mb-2">TextTrack</h1>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          Chipperfield Ag Erectors LLC
        </p>

        <a
          href="https://chipperfield.ag/employee-training"
          className="block w-full bg-navy hover:bg-navy-dark text-white font-semibold text-sm py-3 rounded-lg transition mb-3"
        >
          I&apos;m an employee
        </a>

        <a
          href="/admin"
          className="block w-full text-gray-400 hover:text-gray-600 text-xs font-medium py-2 transition"
        >
          Admin dashboard →
        </a>
      </div>
    </main>
  );
}
