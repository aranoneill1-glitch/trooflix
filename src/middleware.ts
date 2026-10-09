import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const password = process.env.ADMIN_PASSWORD;
  const cookie = req.cookies.get("trooflix_admin")?.value;

  // Only protect /admin (but NOT /admin/login)
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    if (!password || cookie !== password) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  // Only block write operations on the videos API
  if (
    pathname.startsWith("/api/videos") &&
    (req.method === "POST" || req.method === "DELETE")
  ) {
    if (!password || cookie !== password) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

// This matcher controls WHAT the middleware runs on
export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/videos"],
};
