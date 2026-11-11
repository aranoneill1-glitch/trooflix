import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { createClient } from "@/utils/supabase/server";

const VIDEOS_KEY = "trooflix:videos";
const featureKey = (userId: string) => `trooflix:profile-feature:${userId}`;

export async function GET(req: Request) {
  const userId = new URL(req.url).searchParams.get("user_id");
  if (!userId || userId.length > 128) return NextResponse.json({ feature: null });

  try {
    const feature = await kv.get<Record<string, unknown>>(featureKey(userId));
    return NextResponse.json({ feature: feature || null });
  } catch {
    return NextResponse.json({ error: "Could not load profile feature" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

    const body = await req.json();
    if (body.mode === "clear") {
      await kv.del(featureKey(user.id));
      return NextResponse.json({ success: true, feature: null });
    }
    if (body.mode === "video") {
      const videos = (await kv.get<any[]>(VIDEOS_KEY)) || [];
      const video = videos.find((item) => String(item.id) === String(body.videoId));
      if (!video || String(video.uploaderUserId) !== String(user.id)) {
        return NextResponse.json({ error: "That video is not in your content library" }, { status: 404 });
      }
      if (video.visibility === "premium" || video.is_premium === true) {
        return NextResponse.json({ error: "Premium videos cannot be used as a public profile feature" }, { status: 400 });
      }
      const type = String(video.type || "").toLowerCase();
      if (type === "short" || type === "reel" || type === "tweet" || !(video.videoUrl || video.bitchuteUrl)) {
        return NextResponse.json({ error: "Choose a full video or podcast for your profile feature" }, { status: 400 });
      }
      const feature = { mode: "video", videoId: String(video.id) };
      await kv.set(featureKey(user.id), feature);
      return NextResponse.json({ success: true, feature });
    }

    if (body.mode === "custom" && (body.mediaType === "image" || body.mediaType === "video")) {
      const mediaUrl = String(body.mediaUrl || "");
      const publicBase = (process.env.R2_PUBLIC_URL || process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`).replace(/\/$/, "");
      if (!mediaUrl.startsWith(`${publicBase}/profile-features/${user.id}/`)) {
        return NextResponse.json({ error: "Upload the image or video from this profile first" }, { status: 400 });
      }
      const feature = { mode: "custom", mediaType: body.mediaType, mediaUrl };
      await kv.set(featureKey(user.id), feature);
      return NextResponse.json({ success: true, feature });
    }

    return NextResponse.json({ error: "Invalid profile feature" }, { status: 400 });
  } catch (error) {
    console.error("Profile feature update failed:", error);
    return NextResponse.json({ error: "Could not save profile feature" }, { status: 500 });
  }
}
