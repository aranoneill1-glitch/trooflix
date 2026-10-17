import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

let cachedCounts: Record<number, number> | null = null;
let lastFetch = 0;
const CACHE_TTL = 5000; // 5 seconds

export async function GET() {
  try {
    const now = Date.now();
    if (cachedCounts && now - lastFetch < CACHE_TTL) {
      return NextResponse.json({ counts: cachedCounts });
    }

    const { data, error } = await supabaseAdmin
      .from("views")
      .select("video_id, count");

    if (error) throw error;

    const counts: Record<number, number> = {};
    (data || []).forEach((row: any) => {
      counts[row.video_id] = row.count;
    });

    cachedCounts = counts;
    lastFetch = now;

    return NextResponse.json({ counts });
  } catch (e: any) {
    console.error("GET views error:", e);
    return NextResponse.json({ counts: {} });
  }
}

export async function POST(req: Request) {
  try {
    const { videoId } = await req.json();
    if (!videoId) return NextResponse.json({ error: "videoId required" }, { status: 400 });

    const id = Number(videoId);
    const { data: existing } = await supabaseAdmin
      .from("views")
      .select("count")
      .eq("video_id", id)
      .maybeSingle();

    if (existing) {
      await supabaseAdmin
        .from("views")
        .update({ count: (existing.count || 0) + 1, updated_at: new Date().toISOString() })
        .eq("video_id", id);
    } else {
      await supabaseAdmin
        .from("views")
        .insert({ video_id: id, count: 1 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("POST views error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
