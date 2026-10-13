import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json({ ids: [] });
    }

    const { data, error } = await supabaseAdmin
      .from("likes")
      .select("video_id")
      .eq("user_id", userId);

    if (error) throw error;
    return NextResponse.json({ ids: (data || []).map((r: any) => r.video_id) });
  } catch (e: any) {
    console.error("GET likes error:", e);
    return NextResponse.json({ ids: [] });
  }
}

export async function POST(req: Request) {
  try {
    const { userId, videoId } = await req.json();
    if (!userId || !videoId) {
      return NextResponse.json({ error: "userId and videoId required" }, { status: 400 });
    }

    // Check if already liked
    const { data: existing } = await supabaseAdmin
      .from("likes")
      .select("id")
      .eq("user_id", userId)
      .eq("video_id", Number(videoId))
      .maybeSingle();

    if (existing) {
      // Unlike — remove it
      const { error } = await supabaseAdmin
        .from("likes")
        .delete()
        .eq("user_id", userId)
        .eq("video_id", Number(videoId));
      if (error) throw error;
      return NextResponse.json({ ok: true, liked: false });
    } else {
      // Like — add it
      const { error } = await supabaseAdmin
        .from("likes")
        .insert({ user_id: userId, video_id: Number(videoId) });
      if (error) throw error;
      return NextResponse.json({ ok: true, liked: true });
    }
  } catch (e: any) {
    console.error("POST likes error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
