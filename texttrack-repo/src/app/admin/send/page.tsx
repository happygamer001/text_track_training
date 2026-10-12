import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionAdmin } from "@/lib/adminSession";
import { loadSendPlan } from "@/lib/lessonPlan";
import { formatCentralDate } from "@/lib/centralTime";
import { COST_PER_SEGMENT } from "@/lib/lessonLogic";
import SendLessonsForm from "@/components/admin/SendLessonsForm";

export const dynamic = "force-dynamic";

// Review and send this week's lesson texts. Sending spends money, so only
// SUPER_ADMINs may send; the API enforces it too.
export default async function SendPage() {
  const admin = await getSessionAdmin();
  if (!admin) redirect("/admin/login");

  if (admin.role !== "SUPER_ADMIN") {
    return (
      <main className="min-h-screen px-6 py-10 max-w-3xl mx-auto">
        <Link href="/admin" className="text-xs text-gray-500">&larr; Admin home</Link>
        <h1 className="text-xl font-bold text-navy mt-2 mb-2">Send lessons</h1>
        <p className="text-sm text-gray-600">Only a super admin can send lesson texts.</p>
      </main>
    );
  }

  const plan = await loadSendPlan();
  const groups = plan.groups.map((g) => ({
    key: g.key,
    trackId: g.trackId,
    trackName: g.trackName,
    weekNumber: g.weekNumber,
    title: g.topic.title,
    category: g.topic.category,
    deliveryFormat: g.topic.deliveryFormat,
    videoFormat: g.topic.videoFormat,
    smsBody: g.topic.smsBody,
    employees: g.employees,
  }));

  return (
    <main className="min-h-screen px-6 py-10 max-w-3xl mx-auto">
      <Link href="/admin" className="text-xs text-gray-500">&larr; Admin home</Link>
      <h1 className="text-xl font-bold text-navy mt-2 mb-1">Send lessons</h1>
      <p className="text-sm text-gray-500 mb-6">
        Week of {formatCentralDate(plan.weekStart)} (Central time). Planned send time: Monday 7:00 AM Central.
        Review each lesson, edit the wording if you like, then send. Edits apply to this send only.
      </p>
      <SendLessonsForm
        groups={groups}
        skipped={plan.skipped}
        cap={plan.cap}
        usedThisMonth={plan.usedThisMonth}
        costPerSegment={COST_PER_SEGMENT}
      />
    </main>
  );
}
