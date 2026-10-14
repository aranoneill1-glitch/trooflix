import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const password = process.env.ADMIN_PASSWORD;
  const cookie = req.cookies.get("trooflix_admin")?.value;

  // --- Admin protection (unchanged) ---
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    if (!password || cookie !== password) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  // Uploads: allow either admin cookie OR a signed-in user (avatar + creator uploads)
  if (
    pathname.startsWith("/api/upload") &&
    (req.method === "POST" || req.method === "DELETE" || req.method === "PUT")
  ) {
    const hasAdminCookie = password && cookie === password;
    if (!hasAdminCookie) {
      // Check for a Supabase session cookie — if present, allow
      const hasSession = Object.keys(req.cookies).some((k) =>
        k.startsWith("sb-") && k.endsWith("-auth-token")
      );
      if (!hasSession) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
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
     * - public files (jpg, png, svg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
