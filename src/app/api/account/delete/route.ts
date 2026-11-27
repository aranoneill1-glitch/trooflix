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

    // Best-effort cleanup of app data
    await supabaseAdmin.from("profiles").delete().eq("user_id", userId);
    await supabaseAdmin.from("blocked_users").delete().eq("blocker_id", userId);
    await supabaseAdmin.from("blocked_users").delete().eq("blocked_id", userId);
    await supabaseAdmin.from("follows").delete().eq("follower_id", userId);
    await supabaseAdmin.from("follows").delete().eq("following_id", userId);

    // Delete auth user (requires service role)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("DELETE account error:", e);
    return NextResponse.json({ error: e?.message || "Failed to delete account" }, { status: 500 });
  }
}
