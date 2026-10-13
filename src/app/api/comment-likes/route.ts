import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET /api/comment-likes?user_id=X&video_id=Y
// Returns liked comment IDs for this user on this video
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");
    const videoId = searchParams.get("video_id");

    if (!userId || !videoId) {
      return NextResponse.json({ ids: [] });
    }

    // Get all comments for this video
    const { data: comments } = await supabaseAdmin
      .from("comments")
      .select("id")
      .eq("video_id", Number(videoId));

    const commentIds = (comments || []).map((c: any) => c.id);
    if (commentIds.length === 0) {
      return NextResponse.json({ ids: [] });
    }

    // Get likes by this user on those comments
    const { data: likes, error } = await supabaseAdmin
      .from("comment_likes")
      .select("comment_id")
      .eq("user_id", userId)
      .in("comment_id", commentIds);

    if (error) throw error;
    return NextResponse.json({ ids: (likes || []).map((l: any) => l.comment_id) });
  } catch (e: any) {
    console.error("GET comment-likes error:", e);
    return NextResponse.json({ ids: [] });
  }
}

// POST /api/comment-likes — { commentId, userId } — toggles like
export async function POST(req: Request) {
  try {
    const { commentId, userId } = await req.json();
    if (!commentId || !userId) {
      return NextResponse.json({ error: "commentId and userId required" }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin
      .from("comment_likes")
      .select("id")
      .eq("comment_id", Number(commentId))
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabaseAdmin
        .from("comment_likes")
        .delete()
        .eq("id", existing.id);
      if (error) throw error;
      return NextResponse.json({ ok: true, liked: false });
    } else {
      const { error } = await supabaseAdmin
        .from("comment_likes")
        .insert({ comment_id: Number(commentId), user_id: userId });
      if (error) throw error;
      return NextResponse.json({ ok: true, liked: true });
    }
  } catch (e: any) {
    console.error("POST comment-likes error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
