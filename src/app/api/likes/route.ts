import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET: returns liked video IDs for a given user OR anon_id
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");
    const anonId = searchParams.get("anon_id");

    if (!userId && !anonId) {
      return NextResponse.json({ ids: [] });
    }

    let query = supabaseAdmin.from("likes").select("video_id");

    if (userId) {
      query = query.eq("user_id", userId);
    } else if (anonId) {
      query = query.eq("anon_id", anonId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      ids: (data || []).map((r: any) => r.video_id),
    });
  } catch (e: any) {
    console.error("GET likes error:", e);
    return NextResponse.json({ ids: [] });
  }
}

// POST: toggle a like. Body can include userId (for logged-in) or anonId (for anonymous).
export async function POST(req: Request) {
  try {
    const { userId, anonId, videoId } = await req.json();
    if (!videoId) {
      return NextResponse.json({ error: "videoId required" }, { status: 400 });
    }
    if (!userId && !anonId) {
      return NextResponse.json({ error: "userId or anonId required" }, { status: 400 });
    }

    const vid = Number(videoId);

    // Look for an existing like by this user OR anon_id on this video
    let findQuery = supabaseAdmin.from("likes").select("id").eq("video_id", vid);
    if (userId) {
      findQuery = findQuery.eq("user_id", userId);
    } else {
      findQuery = findQuery.eq("anon_id", anonId);
    }

    const { data: existing } = await findQuery.maybeSingle();

    if (existing) {
      // Unlike
      const { error } = await supabaseAdmin
        .from("likes")
        .delete()
        .eq("id", existing.id);
      if (error) throw error;
      return NextResponse.json({ ok: true, liked: false });
    } else {
      // Like
      const insertRow: any = { video_id: vid };
      if (userId) insertRow.user_id = userId;
      if (anonId) insertRow.anon_id = anonId;

      const { error } = await supabaseAdmin.from("likes").insert(insertRow);
      if (error) throw error;
      return NextResponse.json({ ok: true, liked: true });
    }
  } catch (e: any) {
    console.error("POST likes error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
