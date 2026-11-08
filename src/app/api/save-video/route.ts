import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const KV_URL = process.env.UPSTASH_REDIS_REST_URL!;
const KV_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;
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
    if (userTier === "podcaster" || userTier === "pro") userTier = "creator";
    if ((userTier === "plus" || userTier === "creator") && profile?.plus_expires_at) {
      if (new Date(profile.plus_expires_at) < new Date()) userTier = "free";
    }

    const uploadType = body.type || "Documentary";
    const isTweet = uploadType === "Tweet";
    const isShort = uploadType === "Short";
    const isLongForm = !isTweet && !isShort;

    if (isTweet && userTier !== "creator") {
      return NextResponse.json({ error: "Only Creator tier can post Tweets. Upgrade required." }, { status: 403 });
    }
    if (isLongForm && userTier !== "creator") {
      return NextResponse.json({ error: "Only Creator tier can upload long-form videos. Upgrade required." }, { status: 403 });
    }
    if (isShort && userTier === "free") {
      const durStr = body.duration || "0:00";
      const parts = durStr.split(":");
      const totalSeconds = (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
      if (totalSeconds > 180) {
        return NextResponse.json({ error: "Free accounts can only upload Shorts up to 3 minutes. Upgrade to Plus." }, { status: 403 });
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

    const newVideo = {
      id: Date.now(),
      title: body.title || "Untitled",
      description: body.description || "",
      category: body.category || "Uncategorized",
      visibility: body.visibility || "public",
      feed_visible: body.feed_visible !== undefined ? body.feed_visible : true,
      type: body.type || "Documentary",
      featured: !!body.featured,
      creatorId: body.creatorId || null,
      uploaderUserId: body.uploaderUserId || null,
      videoUrl: body.videoUrl ?? body.bitchuteUrl ?? "",
      posterUrl: body.posterUrl || `/api/poster?title=${encodeURIComponent(body.title || "Untitled")}&category=${encodeURIComponent(body.category || "Uncategorized")}`,
      backdropUrl: body.backdropUrl || `/api/poster?size=wide&title=${encodeURIComponent(body.title || "Untitled")}&category=${encodeURIComponent(body.category || "Uncategorized")}`,
      year: body.year || new Date().getFullYear(),
      rating: body.rating || "TV-MA",
      match: body.match || 95,
      duration: body.duration || "",
      createdAt: new Date().toISOString(),
    };

    videos.push(newVideo);

    await fetch(`${KV_URL}/set/${KEY}`, {
      method: "POST",
      headers: { 
        Authorization: `Bearer ${KV_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ value: JSON.stringify(videos) })
    });

    return NextResponse.json(newVideo);
  } catch (e: any) {
    console.error("POST /api/save-video error:", e.message || e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
