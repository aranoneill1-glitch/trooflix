import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET /api/dislikes?anon_id=X or ?user_id=X → { ids: [...] }
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");
    const anonId = searchParams.get("anon_id");
    if (!userId && !anonId) return NextResponse.json({ ids: [] });

    let q = supabaseAdmin.from("dislikes").select("video_id");
    if (userId) q = q.eq("user_id", userId);
    else if (anonId) q = q.eq("anon_id", anonId);

    const { data, error } = await q;
    if (error) throw error;
    return NextResponse.json({ ids: (data || []).map((r: any) => Number(r.video_id)) });
  } catch (e: any) {
    console.error("GET dislikes error:", e);
    return NextResponse.json({ ids: [] });
  }
}

// POST /api/dislikes — { anonId, userId, videoId } — toggle dislike
export async function POST(req: Request) {
  try {
    const { anonId, userId, videoId } = await req.json();
    if (!videoId) return NextResponse.json({ error: "videoId required" }, { status: 400 });
    if (!userId && !anonId) return NextResponse.json({ error: "user required" }, { status: 400 });

    let existingQuery = supabaseAdmin
      .from("dislikes")
      .select("id")
      .eq("video_id", Number(videoId));
    if (userId) existingQuery = existingQuery.eq("user_id", userId);
    else if (anonId) existingQuery = existingQuery.eq("anon_id", anonId);

    const { data: existing } = await existingQuery.maybeSingle();

    if (existing) {
      await supabaseAdmin.from("dislikes").delete().eq("id", existing.id);
      return NextResponse.json({ ok: true, disliked: false });
    }

    const insert: any = { video_id: Number(videoId) };
    if (userId) insert.user_id = userId;
    else insert.anon_id = anonId;

    const { error } = await supabaseAdmin.from("dislikes").insert(insert);
    if (error) throw error;

    // Mutual exclusivity: remove any like for the same video
    let likeQ = supabaseAdmin.from("likes").delete().eq("video_id", Number(videoId));
    if (userId) likeQ = likeQ.eq("user_id", userId);
    else if (anonId) likeQ = likeQ.eq("anon_id", anonId);
    await likeQ;

    return NextResponse.json({ ok: true, disliked: true });
  } catch (e: any) {
    console.error("POST dislikes error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
