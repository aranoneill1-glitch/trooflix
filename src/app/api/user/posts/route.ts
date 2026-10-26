import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";
import { kv } from "@vercel/kv";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const VIDEOS_KEY = "trooflix:videos";
const CREATORS_KEY = "trooflix:creators";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) return NextResponse.json({ posts: [], kind: "none" });

    const allVideos = ((await kv.get<any[]>(VIDEOS_KEY)) || []).filter((v: any) => !v.hidden);
    const creators = (await kv.get<any[]>(CREATORS_KEY)) || [];
    const creator = creators.find((c: any) => String(c.ownerUserId) === String(userId));
    const creatorId = creator ? creator.id : null;

    const uploads = allVideos
      .filter((v: any) => v.type !== "Troo" && ((creatorId !== null && v.creatorId === creatorId) || v.uploaderUserId === userId))
      .sort((a: any, b: any) => {
        const at = a.createdAt ? new Date(a.createdAt).getTime() : a.id;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : b.id;
        return bt - at;
      });

    const { data: viewRows } = await supabaseAdmin.from("views").select("video_id, count");
    const viewMap: Record<number, number> = {};
    (viewRows || []).forEach((row: any) => { viewMap[Number(row.video_id)] = row.count; });

    const uploadsWithViews = uploads.map((v: any) => ({ ...v, viewCount: viewMap[Number(v.id)] || 0 }));
    const kind = creatorId !== null ? "creator" : "user";

    return NextResponse.json({ posts: uploadsWithViews, kind });
  } catch (e: any) {
    return NextResponse.json({ posts: [], kind: "none" });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, title, description, videoUrl, posterUrl, backdropUrl, type, category, status, scheduledAt, chapters } = body;

    if (!userId || !title || !videoUrl) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    const creators = (await kv.get<any[]>(CREATORS_KEY)) || [];
    const creator = creators.find((c: any) => String(c.ownerUserId) === String(userId));
    const creatorId = creator ? creator.id : null;

    const videos = (await kv.get<any[]>(VIDEOS_KEY)) || [];

    const newVideo = {
      id: Date.now(),
      title,
      description,
      videoUrl,
      posterUrl: posterUrl || "",
      backdropUrl: backdropUrl || "",
      type: type || "Reel",
      category: category || "Uncategorized",
      creatorId: creatorId,
      uploaderUserId: userId,
      createdAt: new Date().toISOString(),
      status: status || "published",
      scheduledAt: scheduledAt || null,
      chapters: chapters || [],
      viewCount: 0,
      access_type: "free",
    };

    videos.push(newVideo);
    await kv.set(VIDEOS_KEY, videos);

    return NextResponse.json({ ok: true, video: newVideo });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { userId, postId, title, description, posterUrl } = await req.json();
    if (!userId || !postId) return NextResponse.json({ error: "userId and postId required" }, { status: 400 });

    const videos = (await kv.get<any[]>(VIDEOS_KEY)) || [];
    const idx = videos.findIndex((v: any) => Number(v.id) === Number(postId));
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (videos[idx].uploaderUserId !== userId) return NextResponse.json({ error: "Not your post" }, { status: 403 });

    if (title !== undefined) videos[idx].title = String(title).slice(0, 120);
    if (description !== undefined) videos[idx].description = String(description).slice(0, 800);
    if (posterUrl !== undefined) videos[idx].posterUrl = String(posterUrl);

    await kv.set(VIDEOS_KEY, videos);
    return NextResponse.json({ ok: true, video: videos[idx] });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = Number(searchParams.get("id"));
    const userId = searchParams.get("userId");

    if (!postId || !userId) return NextResponse.json({ error: "id and userId required" }, { status: 400 });

    const videos = (await kv.get<any[]>(VIDEOS_KEY)) || [];
    const post = videos.find((v: any) => Number(v.id) === postId);
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (post.uploaderUserId !== userId) return NextResponse.json({ error: "Not your post" }, { status: 403 });

    const filtered = videos.filter((v: any) => Number(v.id) !== postId);
    await kv.set(VIDEOS_KEY, filtered);

    // Clean up related data
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
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
