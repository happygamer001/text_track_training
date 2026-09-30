import { redirect } from "next/navigation";

// There's no real login screen yet (Milestone 4), so the app's own root has
// nothing genuine to show. Employees always arrive via a personal link (from
// their enrollment invite or a training text), never by typing the bare
// subdomain — so anyone who does land here gets sent to the informational
// page on the main site instead of a 404 or a placeholder.
//
// TODO: once auth.ts is built, replace this with the real login screen and
// remove the redirect.
export default function HomePage() {
  redirect("https://chipperfield.ag/employee-training");
}
