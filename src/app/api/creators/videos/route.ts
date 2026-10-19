import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const VIDEOS_KEY = "trooflix:videos";

// GET /api/creators/videos?creatorId=ID
// Accepts either numeric ID (from /api/creators) or UUID
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const creatorIdParam = searchParams.get("creatorId");
    if (!creatorIdParam) return NextResponse.json({ videos: [] });

    // Look up which UUID this podcaster corresponds to
    let ownerUserId: string | null = null;
    let numericId: number | null = null;

    const { data: profileRows } = await supabaseAdmin
      .from("profiles")
      .select("user_id, username")
      .eq("tier", "podcaster");

    if (profileRows) {
      for (const row of profileRows) {
        const uuidHex = String(row.user_id).replace(/-/g, "").slice(0, 12);
        const num = parseInt(uuidHex, 16) || 0;
        if (String(num) === String(creatorIdParam)) {
          ownerUserId = row.user_id;
          numericId = num;
          break;
        }
        if (String(row.user_id) === String(creatorIdParam)) {
          ownerUserId = row.user_id;
          numericId = num;
          break;
        }
      }
    }

    const all = ((await kv.get<any[]>(VIDEOS_KEY)) || []).filter(
      (v: any) => !v.hidden
    );

    // Match by uploaderUserId (UUID), or creatorId (numeric — for legacy)
    const videos = all.filter((v: any) => {
      if (ownerUserId && String(v.uploaderUserId) === String(ownerUserId)) return true;
      if (numericId && Number(v.creatorId) === numericId) return true;
      if (String(v.creatorId) === String(creatorIdParam)) return true;
      return false;
    });

    // Attach view counts
    const { data: viewRows } = await supabaseAdmin
      .from("views")
      .select("video_id, count");
    const viewMap: Record<number, number> = {};
    (viewRows || []).forEach((row: any) => {
      viewMap[Number(row.video_id)] = row.count;
    });

    const withViews = videos.map((v: any) => ({
      ...v,
      viewCount: viewMap[Number(v.id)] || 0,
    }));

    withViews.sort((a: any, b: any) => {
      const at = a.createdAt ? new Date(a.createdAt).getTime() : a.id;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : b.id;
      return bt - at;
    });

    return NextResponse.json({ videos: withViews });
  } catch (e: any) {
    console.error("creators/videos error:", e);
    return NextResponse.json({ videos: [] });
  }
}
