import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET /api/follows?user_id=X  → creator IDs this user follows
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");

    if (!userId) return NextResponse.json({ ids: [] });

    const { data, error } = await supabaseAdmin
      .from("follows")
      .select("creator_id")
      .eq("follower_id", userId);

    if (error) throw error;
    return NextResponse.json({ ids: (data || []).map((r: any) => r.creator_id) });
  } catch (e: any) {
    console.error("GET follows error:", e);
    return NextResponse.json({ ids: [] });
  }
}

// POST /api/follows — { userId, creatorId } → toggles follow
export async function POST(req: Request) {
  try {
    const { userId, creatorId } = await req.json();
    if (!userId || !creatorId) {
      return NextResponse.json({ error: "userId and creatorId required" }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin
      .from("follows")
      .select("id")
      .eq("follower_id", userId)
      .eq("creator_id", Number(creatorId))
      .maybeSingle();

    if (existing) {
      const { error } = await supabaseAdmin
        .from("follows")
        .delete()
        .eq("id", existing.id);
      if (error) throw error;
      return NextResponse.json({ ok: true, following: false });
    } else {
      const { error } = await supabaseAdmin
        .from("follows")
        .insert({ follower_id: userId, creator_id: Number(creatorId) });
      if (error) throw error;
      return NextResponse.json({ ok: true, following: true });
    }
  } catch (e: any) {
    console.error("POST follows error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
