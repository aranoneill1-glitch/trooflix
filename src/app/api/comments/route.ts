import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET /api/comments?video_id=X
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get("video_id");

    if (!videoId) {
      return NextResponse.json({ comments: [] });
    }

    const { data, error } = await supabaseAdmin
      .from("comments")
      .select("id, video_id, user_id, user_email, text, created_at")
      .eq("video_id", Number(videoId))
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ comments: data || [] });
  } catch (e: any) {
    console.error("GET comments error:", e);
    return NextResponse.json({ comments: [] });
  }
}

// POST /api/comments
// body: { videoId, userId, userEmail, text }
export async function POST(req: Request) {
  try {
    const { videoId, userId, userEmail, text } = await req.json();

    if (!videoId || !userId || !text) {
      return NextResponse.json(
        { error: "videoId, userId, and text are required" },
        { status: 400 }
      );
    }

    const trimmed = String(text).trim();
    if (trimmed.length === 0) {
      return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 });
    }
    if (trimmed.length > 500) {
      return NextResponse.json({ error: "Comment too long (max 500)" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("comments")
      .insert({
        video_id: Number(videoId),
        user_id: userId,
        user_email: userEmail || "",
        text: trimmed,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, comment: data });
  } catch (e: any) {
    console.error("POST comments error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
