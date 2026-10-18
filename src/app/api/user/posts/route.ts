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
    const requestedKind = searchParams.get("kind") || "uploads";
    if (!userId) return NextResponse.json({ posts: [], kind: "none" });

    const allVideos = ((await kv.get<any[]>(VIDEOS_KEY)) || []).filter(
      (v: any) => !v.hidden
    );

    // ---- Reposts branch ----
    if (requestedKind === "reposts") {
      const { data: reposts } = await supabaseAdmin
        .from("reposts")
        .select("post_id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      const repostedIds = new Set<number>(
        (reposts || []).map((r: any) => Number(r.post_id))
      );
      const reposts_posts = allVideos.filter((v: any) =>
        repostedIds.has(Number(v.id))
      );

      // Attach view counts
      const { data: viewRows } = await supabaseAdmin
        .from("views")
        .select("video_id, count");
      const viewMap: Record<number, number> = {};
      (viewRows || []).forEach((row: any) => {
        viewMap[Number(row.video_id)] = row.count;
      });

      const withViews = reposts_posts.map((v: any) => ({
        ...v,
        viewCount: viewMap[Number(v.id)] || 0,
      }));

      return NextResponse.json({ posts: withViews, kind: "reposts" });
    }

    // ---- Uploads branch (existing) ----

    // Find user's creator record if they have one
    const { data: app } = await supabaseAdmin
      .from("creator_applications")
      .select("status")
      .eq("user_id", userId)
      .maybeSingle();

    let creatorId: number | null = null;
    if (app?.status === "approved") {
      const creators = (await kv.get<any[]>(CREATORS_KEY)) || [];
      const creator = creators.find((c: any) => c.ownerUserId === userId);
      if (creator) creatorId = creator.id;
    }

    // Uploads only — matches either creatorId (podcaster videos) or uploaderUserId (regular user reels)
    // Exclude Troos — they appear in feed, not on profiles
    const uploads = allVideos
      .filter(
        (v: any) =>
          v.type !== "Troo" &&
          ((creatorId !== null && v.creatorId === creatorId) ||
            v.uploaderUserId === userId)
      )
      .sort((a: any, b: any) => {
        const at = a.createdAt ? new Date(a.createdAt).getTime() : a.id;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : b.id;
        return bt - at;
      });

    // Merge view counts from Supabase views table
    const { data: viewRows } = await supabaseAdmin
      .from("views")
      .select("video_id, count");
    const viewMap: Record<number, number> = {};
    (viewRows || []).forEach((row: any) => {
      viewMap[Number(row.video_id)] = row.count;
    });

    const uploadsWithViews = uploads.map((v: any) => ({
      ...v,
      viewCount: viewMap[Number(v.id)] || 0,
    }));

    const kind = creatorId !== null ? "creator" : "user";
    return NextResponse.json({ posts: uploadsWithViews, kind });
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
    const postType = body.type || "Reel";

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    // Look up the user's tier to enforce upload limits
    let userTier: "user" | "pro" | "podcaster" = "user";
    try {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("tier")
        .eq("user_id", userId)
        .maybeSingle();
      if (profile?.tier && ["user", "pro", "podcaster"].includes(profile.tier)) {
        userTier = profile.tier;
      }
    } catch {}

    if (!["Reel", "Image", "Troo", "Podcast"].includes(postType)) {
      return NextResponse.json({ error: "Invalid post type" }, { status: 400 });
    }

    // Tier-specific type restrictions
    if (postType === "Podcast" && userTier !== "podcaster") {
      return NextResponse.json(
        { error: "Only Podcaster accounts can post podcasts. Upgrade to unlock." },
        { status: 403 }
      );
    }

    // Duration limits based on tier
    const DURATION_LIMIT =
      userTier === "user" ? 90 :
      userTier === "pro" ? null :
      null; // podcaster = no limit

    if (postType === "Reel") {
      if (!videoUrl) {
        return NextResponse.json({ error: "videoUrl required for reels" }, { status: 400 });
      }
      if (DURATION_LIMIT !== null && typeof duration === "number" && duration > DURATION_LIMIT) {
        return NextResponse.json(
          { error: `Reels are limited to ${DURATION_LIMIT}s on your account. Upgrade to Pro for unlimited length.` },
          { status: 403 }
        );
      }
    } else if (postType === "Image") {
      if (!posterUrl) {
        return NextResponse.json({ error: "posterUrl required for images" }, { status: 400 });
      }
    } else if (postType === "Troo") {
      const text = (description || "").trim();
      if (!text) {
        return NextResponse.json({ error: "Text is required for a Troo" }, { status: 400 });
      }
      if (text.length > 280) {
        return NextResponse.json({ error: "Troos are limited to 280 characters" }, { status: 400 });
      }
    } else if (postType === "Podcast") {
      if (!videoUrl) {
        return NextResponse.json({ error: "videoUrl required for podcasts" }, { status: 400 });
      }
    }

    const videos = (await kv.get<any[]>(VIDEOS_KEY)) || [];

    const newVideo = {
      id: Date.now(),
      title: (title || "").slice(0, 120),
      description: (description || "").slice(0, postType === "Troo" ? 280 : 800),
      category: "Uncategorized",
      type: postType,
      featured: false,
      videoUrl: (postType === "Reel" || postType === "Podcast") ? videoUrl : "",
      textOverlays: postType === "Reel" && Array.isArray(body.textOverlays) ? body.textOverlays : [],
      uploaderUserId: userId,
      posterUrl:
        postType === "Reel"
          ? (posterUrl || `/api/poster?title=${encodeURIComponent(title || "Untitled")}&category=Reel`)
          : postType === "Image"
          ? posterUrl
          : "",
      backdropUrl: posterUrl || "",
      year: new Date().getFullYear(),
      rating: "TV-MA",
      match: 95,
      duration: (postType === "Reel" || postType === "Podcast") && typeof duration === "number" ? `${Math.round(duration)}s` : "",
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

// PUT /api/user/posts — { userId, postId, title?, description? } — edit own post
export async function PUT(req: Request) {
  try {
    const { userId, postId, title, description } = await req.json();
    if (!userId || !postId) {
      return NextResponse.json({ error: "userId and postId required" }, { status: 400 });
    }

    const videos = (await kv.get<any[]>(VIDEOS_KEY)) || [];
    const idx = videos.findIndex((v: any) => Number(v.id) === Number(postId));
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (videos[idx].uploaderUserId !== userId) {
      return NextResponse.json({ error: "Not your post" }, { status: 403 });
    }

    if (title !== undefined) videos[idx].title = String(title).slice(0, 120);
    if (description !== undefined) videos[idx].description = String(description).slice(0, 800);

    await kv.set(VIDEOS_KEY, videos);
    return NextResponse.json({ ok: true, video: videos[idx] });
  } catch (e: any) {
    console.error("PUT user/posts error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE /api/user/posts?id=X&userId=Y — delete own post
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = Number(searchParams.get("id"));
    const userId = searchParams.get("userId");

    if (!postId || !userId) {
      return NextResponse.json({ error: "id and userId required" }, { status: 400 });
    }

    const videos = (await kv.get<any[]>(VIDEOS_KEY)) || [];
    const post = videos.find((v: any) => Number(v.id) === postId);
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (post.uploaderUserId !== userId) {
      return NextResponse.json({ error: "Not your post" }, { status: 403 });
    }

    const filtered = videos.filter((v: any) => Number(v.id) !== postId);
    await kv.set(VIDEOS_KEY, filtered);

    // Clean up related data (best effort)
    try {
      await Promise.all([
        supabaseAdmin.from("likes").delete().eq("video_id", postId),
        supabaseAdmin.from("comments").delete().eq("video_id", postId),
        supabaseAdmin.from("views").delete().eq("video_id", postId),
        supabaseAdmin.from("reposts").delete().eq("post_id", postId),
        supabaseAdmin.from("notifications").delete().eq("post_id", postId),
      ]);
    } catch (err) {
      console.warn("cleanup after delete failed:", err);
    }

    return NextResponse.json({ ok: true, deleted: postId });
  } catch (e: any) {
    console.error("DELETE user/posts error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

