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
          .filter((v: any) => v.creatorId === creator.id || v.uploaderUserId === userId)
          .sort((a: any, b: any) => {
            const at = a.createdAt ? new Date(a.createdAt).getTime() : a.id;
            const bt = b.createdAt ? new Date(b.createdAt).getTime() : b.id;
            return bt - at;
          });
        return NextResponse.json({ posts: mine, kind: "creator" });
      }
    }

    // Combine: user-uploaded reels + My List
    const uploads = allVideos
      .filter((v: any) => v.uploaderUserId === userId)
      .sort((a: any, b: any) => {
        const at = a.createdAt ? new Date(a.createdAt).getTime() : a.id;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : b.id;
        return bt - at;
      });

    const { data: rows } = await supabaseAdmin
      .from("my_list")
      .select("video_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const savedIds = new Set((rows || []).map((r: any) => Number(r.video_id)));
    const saved = allVideos.filter((v: any) => savedIds.has(Number(v.id)));

    // Merge, de-dupe by id (in case a user saved their own upload)
    const seen = new Set<number>();
    const combined: any[] = [];
    for (const v of [...uploads, ...saved]) {
      if (!seen.has(v.id)) {
        seen.add(v.id);
        combined.push(v);
      }
    }

    return NextResponse.json({ posts: combined, kind: "user" });
  } catch (e: any) {
    console.error("user posts error:", e);
    return NextResponse.json({ posts: [], kind: "none" });
  }
}

/**
 * POST /api/user/posts — create a user-uploaded reel
 * Body: { userId, title, description, videoUrl, posterUrl, duration }
 * Enforces: max 90s duration, type = "Reel", uploaderUserId = userId
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, title, description, videoUrl, posterUrl, duration } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }
    if (!videoUrl) {
      return NextResponse.json({ error: "videoUrl required" }, { status: 400 });
    }
    if (typeof duration === "number" && duration > 90) {
      return NextResponse.json(
        { error: "Reels are limited to 90 seconds. Upgrade to a Podcaster account for longer videos." },
        { status: 400 }
      );
    }

    const videos = (await kv.get<any[]>(VIDEOS_KEY)) || [];

    const newVideo = {
      id: Date.now(),
      title: (title || "Untitled").slice(0, 120),
      description: (description || "").slice(0, 800),
      category: "Uncategorized",
      type: "Reel",
      featured: false,
      videoUrl,
      uploaderUserId: userId,
      posterUrl:
        posterUrl ||
        `/api/poster?title=${encodeURIComponent(title || "Untitled")}&category=Reel`,
      backdropUrl:
        posterUrl ||
        `/api/poster?size=wide&title=${encodeURIComponent(title || "Untitled")}&category=Reel`,
      year: new Date().getFullYear(),
      rating: "TV-MA",
      match: 95,
      duration: typeof duration === "number" ? `${Math.round(duration)}s` : "",
      createdAt: new Date().toISOString(),
    };

    videos.push(newVideo);
    await kv.set(VIDEOS_KEY, videos);

    return NextResponse.json({ ok: true, video: newVideo });
  } catch (e: any) {
    console.error("user post create error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
