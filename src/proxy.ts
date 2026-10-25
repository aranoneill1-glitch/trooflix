import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const password = process.env.ADMIN_PASSWORD;
  const cookie = req.cookies.get("trooflix_admin")?.value;

  // --- Admin protection (unchanged) ---
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    if (!password || cookie !== password) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  // Videos / creators: keep hard admin gate (creators use /api/creator/videos)
  if (
    (pathname.startsWith("/api/videos") || pathname.startsWith("/api/creators")) &&
    (req.method === "POST" || req.method === "DELETE" || req.method === "PUT")
  ) {
    if (!password || cookie !== password) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Admin API routes: gated — but NOT the login/logout endpoints themselves
  if (
    pathname.startsWith("/api/admin") &&
    !pathname.startsWith("/api/admin-login") &&
    !pathname.startsWith("/api/admin-logout")
  ) {
    if (!password || cookie !== password) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // --- Supabase session refresh (new) ---
  return await updateSession(req);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - api/stripe/webhook (CRITICAL: Stripe needs the raw body and no auth redirect)
     * - public files (jpg, png, svg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
