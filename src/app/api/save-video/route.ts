import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const KEY = "trooflix:videos";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const videos = (await kv.get<any[]>(KEY)) || [];

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
      posterUrl: body.posterUrl || `/api/poster?title=${encodeURIComponent(body.title || "Untitled")}&category=${encodeURIComponent(body.category || "Uncensored")}`,
      backdropUrl: body.backdropUrl || `/api/poster?size=wide&title=${encodeURIComponent(body.title || "Untitled")}&category=${encodeURIComponent(body.category || "Uncensored")}`,
      year: body.year || new Date().getFullYear(),
      rating: body.rating || "TV-MA",
      match: body.match || 95,
      duration: body.duration || "",
      createdAt: new Date().toISOString(),
    };

    videos.push(newVideo);
    await kv.set(KEY, videos);
    return NextResponse.json(newVideo);
  } catch (e: any) {
    console.error("POST error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
