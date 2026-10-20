import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const { userId, videoId, creatorId, seconds } = await req.json();
    if (!userId || !videoId || !creatorId || !seconds || seconds <= 0) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    // Insert the watch time session
    await supabaseAdmin.from("video_watch_sessions").insert({
      user_id: userId,
      video_id: Number(videoId),
      creator_id: Number(creatorId),
      seconds_watched: Math.min(seconds, 300), // Cap at 5 minutes per ping to prevent abuse
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
