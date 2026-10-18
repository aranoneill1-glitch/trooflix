import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET /api/user-follows?user_id=X&target_id=Y  → { following: boolean }
// GET /api/user-follows?user_id=X&list=following → { users: [...] }
// GET /api/user-follows?user_id=X&list=followers → { users: [...] }
// GET /api/user-follows?user_id=X&counts=1 → { following, followers }
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");
    const targetId = searchParams.get("target_id");
    const list = searchParams.get("list");
    const counts = searchParams.get("counts");

    if (!userId) return NextResponse.json({ error: "user_id required" }, { status: 400 });

    // Check whether userId follows targetId
    if (targetId) {
      const { data, error } = await supabaseAdmin
        .from("user_follows")
        .select("id")
        .eq("follower_id", userId)
        .eq("following_id", targetId)
        .maybeSingle();
      if (error) throw error;
      return NextResponse.json({ following: !!data });
    }

    // Counts
    if (counts === "1") {
      const [fingRes, fersRes] = await Promise.all([
        supabaseAdmin
          .from("user_follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", userId),
        supabaseAdmin
          .from("user_follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", userId),
      ]);
      return NextResponse.json({
        following: fingRes.count || 0,
        followers: fersRes.count || 0,
      });
    }

    // Lists — return user_ids, hydrate separately
    if (list === "following") {
      const { data, error } = await supabaseAdmin
        .from("user_follows")
        .select("following_id, created_at")
        .eq("follower_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return NextResponse.json({
        user_ids: (data || []).map((r: any) => r.following_id),
      });
    }

    if (list === "followers") {
      const { data, error } = await supabaseAdmin
        .from("user_follows")
        .select("follower_id, created_at")
        .eq("following_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return NextResponse.json({
        user_ids: (data || []).map((r: any) => r.follower_id),
      });
    }

    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  } catch (e: any) {
    console.error("GET user-follows error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/user-follows — { followerId, followingId } → toggle
export async function POST(req: Request) {
  try {
    const { followerId, followingId } = await req.json();
    if (!followerId || !followingId) {
      return NextResponse.json(
        { error: "followerId and followingId required" },
        { status: 400 }
      );
    }
    if (followerId === followingId) {
      return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin
      .from("user_follows")
      .select("id")
      .eq("follower_id", followerId)
      .eq("following_id", followingId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabaseAdmin
        .from("user_follows")
        .delete()
        .eq("id", existing.id);
      if (error) throw error;
      return NextResponse.json({ ok: true, following: false });
    } else {
      const { error } = await supabaseAdmin
        .from("user_follows")
        .insert({ follower_id: followerId, following_id: followingId });
      if (error) throw error;

      // Fire a follow notification (skip if somehow self, though we already guarded)
      try {
        await supabaseAdmin.from("notifications").insert({
          user_id: followingId,
          actor_id: followerId,
          type: "follow",
          post_id: null,
        });
      } catch (err) {
        console.warn("follow notification insert failed:", err);
      }

      return NextResponse.json({ ok: true, following: true });
    }
  } catch (e: any) {
    console.error("POST user-follows error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
