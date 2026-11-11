import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export function withAuth(handler: (req: Request, user: any) => Promise<Response>) {
  return async (req: Request, context: any) => {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized: Missing token" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized: Invalid token" }, { status: 401 });
    }
    
    return handler(req, user);
  };
}

import { createClient as createServerClient } from "@/utils/supabase/server";

/**
 * Reads the Supabase auth session from cookies. Returns the authenticated user
 * on success, or a 401 response that the caller should return as-is.
 *
 * Usage:
 *   const auth = await requireUser();
 *   if (auth instanceof NextResponse) return auth;
 *   // auth is now { user }
 */
export async function requireUser(): Promise<{ user: any } | Response> {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized: not signed in" }, { status: 401 });
  }
  return { user };
}

/**
 * Helper: verifies the caller is the given userId. Returns a 403 response on mismatch.
 */
export function assertSelf(user: any, claimedUserId: string | null | undefined): Response | null {
  if (!claimedUserId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  if (String(user.id) !== String(claimedUserId)) {
    return NextResponse.json({ error: "Forbidden: cannot act on behalf of another user" }, { status: 403 });
  }
  return null;
}
