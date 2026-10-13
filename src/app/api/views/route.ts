import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("views")
      .select("video_id, count");

    if (error) throw error;

    const counts: Record<number, number> = {};
    (data || []).forEach((row: any) => {
      counts[row.video_id] = row.count;
    });

    return NextResponse.json({ counts });
  } catch (e: any) {
    console.error("GET views error:", e);
    return NextResponse.json({ counts: {} });
  }
}

export async function POST(req: Request) {
  try {
    const { videoId } = await req.json();
    if (!videoId) {
      return NextResponse.json({ error: "videoId required" }, { status: 400 });
    }

    const id = Number(videoId);

    // Check if a row exists
    const { data: existing } = await supabaseAdmin
      .from("views")
      .select("count")
      .eq("video_id", id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabaseAdmin
        .from("views")
        .update({ count: (existing.count || 0) + 1, updated_at: new Date().toISOString() })
        .eq("video_id", id);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin
        .from("views")
        .insert({ video_id: id, count: 1 });
      if (error) throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("POST views error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
