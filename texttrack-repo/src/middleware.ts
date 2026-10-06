import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifyToken } from "@/lib/session";

// Gatekeeper for every admin page and admin API. Anything without a valid
// signed session cookie is bounced to the login page (pages) or gets a 401
// (APIs). API routes ALSO check the session themselves — this is a first wall,
// not the only one.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/admin/login" || pathname.startsWith("/api/admin/auth/")) {
    return NextResponse.next();
  }

  const payload = await verifyToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (payload?.purpose === "session") return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = "";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/content/:path*", "/api/admin/:path*"],
};
