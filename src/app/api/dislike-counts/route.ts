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
      .from("dislikes")
      .select("video_id");
    if (error) throw error;

    const counts: Record<number, number> = {};
    (data || []).forEach((r: any) => {
      const id = Number(r.video_id);
      counts[id] = (counts[id] || 0) + 1;
    });

    return NextResponse.json({ counts });
  } catch (e: any) {
    console.error("GET dislike-counts error:", e);
    return NextResponse.json({ counts: {} });
  }
}
