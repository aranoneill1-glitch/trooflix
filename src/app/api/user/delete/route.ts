import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    // 1. Delete user data from public tables
    await supabaseAdmin.from("profiles").delete().eq("user_id", userId);
    await supabaseAdmin.from("blocked_users").delete().eq("blocker_id", userId);
    await supabaseAdmin.from("blocked_users").delete().eq("blocked_id", userId);
    // Note: You may want to add more tables here (e.g., likes, comments) depending on your DB schema

    // 2. Delete the actual Auth account
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
