import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET /api/notifications?user_id=X
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");
    if (!userId) return NextResponse.json({ notifications: [], unread: 0 });

    const { data, error } = await supabaseAdmin
      .from("notifications")
      .select("id, actor_id, type, post_id, read, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    const unread = (data || []).filter((n: any) => !n.read).length;
    return NextResponse.json({ notifications: data || [], unread });
  } catch (e: any) {
    console.error("GET notifications error:", e);
    return NextResponse.json({ notifications: [], unread: 0 });
  }
}

// PATCH /api/notifications — { user_id } mark all as read
export async function PATCH(req: Request) {
  try {
    const { user_id } = await req.json();
    if (!user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 });

    const { error } = await supabaseAdmin
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user_id)
      .eq("read", false);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("PATCH notifications error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
