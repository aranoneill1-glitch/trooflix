import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";
import { kv } from "@vercel/kv";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const CREATORS_KEY = "trooflix:creators";
const VIDEOS_KEY = "trooflix:videos";

/**
 * GET /api/user/posts?userId=X
 *
 * Returns the "posts" for a profile:
 *  - If the user is an approved creator → their uploaded videos
 *  - Otherwise → videos they've saved to My List
 *
 * Each post has: id, title, posterUrl, backdropUrl, videoUrl,
 * type, viewCount, creatorId, createdAt
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) return NextResponse.json({ posts: [], kind: "none" });

    const allVideos = ((await kv.get<any[]>(VIDEOS_KEY)) || []).filter(
      (v: any) => !v.hidden
    );

    // Try creator first
    const { data: app } = await supabaseAdmin
      .from("creator_applications")
      .select("status")
      .eq("user_id", userId)
      .maybeSingle();

    if (app?.status === "approved") {
      const creators = (await kv.get<any[]>(CREATORS_KEY)) || [];
      const creator = creators.find((c: any) => c.ownerUserId === userId);
      if (creator) {
        const mine = allVideos
          .filter((v: any) => v.creatorId === creator.id)
          .sort((a: any, b: any) => {
            const at = a.createdAt ? new Date(a.createdAt).getTime() : a.id;
            const bt = b.createdAt ? new Date(b.createdAt).getTime() : b.id;
            return bt - at;
          });
        return NextResponse.json({ posts: mine, kind: "creator" });
      }
    }

    // Fall back to My List
    const { data: rows } = await supabaseAdmin
      .from("my_list")
      .select("video_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const ids = new Set((rows || []).map((r: any) => Number(r.video_id)));
    const saved = allVideos.filter((v: any) => ids.has(Number(v.id)));

    return NextResponse.json({ posts: saved, kind: "user" });
  } catch (e: any) {
    console.error("user posts error:", e);
    return NextResponse.json({ posts: [], kind: "none" });
  }
}
