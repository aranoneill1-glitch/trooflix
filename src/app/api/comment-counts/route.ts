import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET /api/comment-counts  → { counts: { videoId: number, ... } }
export async function GET() {
  try {
    // Fetch only the video_id column, then tally
    const { data, error } = await supabaseAdmin
      .from("comments")
      .select("video_id")
      .limit(10000);

    if (error) throw error;

    const counts: Record<number, number> = {};
    for (const row of data || []) {
      const id = row.video_id;
      counts[id] = (counts[id] || 0) + 1;
    }

    return NextResponse.json({ counts });
  } catch (e: any) {
    console.error("GET comment-counts error:", e);
    return NextResponse.json({ counts: {} });
  }
}
