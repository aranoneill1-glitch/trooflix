import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// POST /api/resolve-login — { identifier }
// Accepts an email OR an @handle and returns the real email.
export async function POST(req: Request) {
  try {
    const { identifier } = await req.json();
    if (!identifier || typeof identifier !== "string") {
      return NextResponse.json({ error: "Identifier required" }, { status: 400 });
    }

    const raw = identifier.trim();

    // Looks like an email → return as-is
    if (raw.includes("@") && raw.includes(".") && !raw.startsWith("@")) {
      return NextResponse.json({ email: raw.toLowerCase() });
    }

    // Otherwise treat as @handle
    const handle = raw.toLowerCase().replace(/^@+/, "");
    if (!/^[a-z0-9_]{3,20}$/.test(handle)) {
      return NextResponse.json({ error: "Invalid handle" }, { status: 400 });
    }

    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .ilike("username", handle)
      .maybeSingle();

    if (error) throw error;
    if (!profile) {
      return NextResponse.json({ error: "No account with that handle" }, { status: 404 });
    }

    // Fetch email from auth.users via admin API
    const { data: userData, error: userErr } = await supabaseAdmin.auth.admin.getUserById(
      profile.user_id
    );
    if (userErr || !userData?.user?.email) {
      return NextResponse.json({ error: "Account has no email" }, { status: 404 });
    }

    return NextResponse.json({ email: userData.user.email });
  } catch (e: any) {
    console.error("resolve-login error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
