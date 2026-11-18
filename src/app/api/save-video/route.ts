import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const KV_URL = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL)!;
const KV_TOKEN = (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN)!;
const KEY = "trooflix:videos";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ---- SERVER-SIDE TIER ENFORCEMENT ----
    const userId = body.uploaderUserId;
    if (!userId) return NextResponse.json({ error: "Missing uploaderUserId" }, { status: 400 });

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("tier, plus_expires_at")
      .eq("user_id", userId)
      .maybeSingle();

    let userTier = profile?.tier || "free";
    const _rawTier = String(userTier).toLowerCase();
    if (_rawTier === "podcaster" || _rawTier === "pro") userTier = "creator";
    else if (_rawTier === "pass" || _rawTier === "troopass") userTier = "plus";
    if (userTier === "podcaster" || userTier === "pro") userTier = "creator";
    if ((userTier === "plus" || userTier === "creator") && profile?.plus_expires_at) {
      if (new Date(profile.plus_expires_at) < new Date()) userTier = "free";
    }

    // Accept a single video (body) or a batch (body.videos) so imports only
    // touch the DB once instead of once per file.
    const items: any[] = Array.isArray(body.videos) ? body.videos : [body];
    if (items.length === 0) return NextResponse.json({ error: "No videos provided" }, { status: 400 });

    for (const item of items) {
      const rawType = String(item.type || "long-video");
      const uploadType = rawType.toLowerCase().trim();
      const isTweet = uploadType === "tweet";
      const isShort = ["short", "reel", "shorts", "reels"].includes(uploadType);
      const isLongForm = !isTweet && !isShort;

      if (isTweet && userTier !== "creator") {
        return NextResponse.json({ error: "Only Creator tier can post Tweets. Upgrade required." }, { status: 403 });
      }
      if (isLongForm && userTier !== "creator") {
        return NextResponse.json({ error: "Free accounts can only upload Shorts. Upgrade to Creator to upload videos, podcasts, films and documentaries." }, { status: 403 });
      }
      if (isShort) {
        const durStr = String(item.duration || "0:00");
        const parts = durStr.split(":");
        const totalSeconds = (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
        if (userTier === "free" && totalSeconds > 180) {
          return NextResponse.json({ error: "Free accounts can only upload Shorts up to 3 minutes. Upgrade to Creator for unlimited length." }, { status: 403 });
        }
        if (userTier === "plus" && totalSeconds > 1200) {
          return NextResponse.json({ error: "Plus accounts can only upload Shorts up to 20 minutes. Upgrade to Creator for unlimited." }, { status: 403 });
        }
      }
    }
    // ---- END TIER ENFORCEMENT ----

    const getRes = await fetch(`${KV_URL}/get/${KEY}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` }
    });
    const getData = await getRes.json();

    let videos = [];
    if (getData.result) {
      let parsed = JSON.parse(getData.result);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && parsed.value) {
        parsed = typeof parsed.value === "string" ? JSON.parse(parsed.value) : parsed.value;
      }
      if (Array.isArray(parsed)) videos = parsed;
    }

    const baseId = Date.now();
    const newVideos = items.map((item: any, i: number) => ({
      id: baseId + i,
      title: item.title || "Untitled",
      description: item.description || "",
      category: item.category || "Uncategorized",
      visibility: item.visibility || "public",
      feed_visible: item.feed_visible !== undefined ? item.feed_visible : true,
      type: item.type || "long-video",
      featured: !!item.featured,
      creatorId: item.creatorId || null,
      uploaderUserId: item.uploaderUserId || null,
      videoUrl: item.videoUrl ?? item.bitchuteUrl ?? "",
      posterUrl: item.posterUrl || `/api/poster?title=${encodeURIComponent(item.title || "Untitled")}&category=${encodeURIComponent(item.category || "Uncategorized")}`,
      backdropUrl: item.backdropUrl || `/api/poster?size=wide&title=${encodeURIComponent(item.title || "Untitled")}&category=${encodeURIComponent(item.category || "Uncategorized")}`,
      year: item.year || new Date().getFullYear(),
      rating: item.rating || "TV-MA",
      match: item.match || 95,
      duration: item.duration || "",
      createdAt: new Date().toISOString(),
    }));

    videos.push(...newVideos);

    await fetch(`${KV_URL}/set/${KEY}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KV_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ value: JSON.stringify(videos) })
    });

    return NextResponse.json(
      Array.isArray(body.videos) ? { success: true, videos: newVideos } : newVideos[0]
    );
  } catch (e: any) {
    console.error("POST /api/save-video error:", e.message || e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
