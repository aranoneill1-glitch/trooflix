import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const { blockerId, blockedId } = await req.json();
    if (!blockerId || !blockedId) return NextResponse.json({ error: "Missing data" }, { status: 400 });

    const { error } = await supabaseAdmin.from("blocked_users").insert({
      blocker_id: blockerId,
      blocked_id: blockedId
    });

    if (error && error.code !== "23505") throw error; // Ignore duplicate blocks
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const blockerId = searchParams.get("blockerId");
    const blockedId = searchParams.get("blockedId");

    if (!blockerId || !blockedId) return NextResponse.json({ error: "Missing data" }, { status: 400 });

    await supabaseAdmin.from("blocked_users")
      .delete()
      .eq("blocker_id", blockerId)
      .eq("blocked_id", blockedId);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const blockerId = searchParams.get("blockerId");
    if (!blockerId) return NextResponse.json({ users: [] });

    const { data, error } = await supabaseAdmin
      .from("blocked_users")
      .select("blocked_id, created_at")
      .eq("blocker_id", blockerId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    const ids = (data || []).map((r: any) => r.blocked_id);
    if (ids.length === 0) return NextResponse.json({ users: [] });

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("user_id, username, display_name, avatar_url")
      .in("user_id", ids);

    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    const users = ids.map((id: string) => {
      const p = profileMap.get(id);
      return {
        userId: id,
        username: p?.username || "user",
        displayName: p?.display_name || p?.username || "User",
        avatarUrl: p?.avatar_url || null,
      };
    });

    return NextResponse.json({ users });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
