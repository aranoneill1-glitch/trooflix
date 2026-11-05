import { NextResponse } from "next/server";

const KV_URL = "https://neat-monster-216395.upstash.io";
const KV_TOKEN = "gQAAAAAAA01LAAIgcDE3ZTRiZTkyZGNmNjI0M2ZmODg0ZDRmMTNmMDhkYzhhMQ";
const KEY = "trooflix:videos";

export const dynamic = force-dynamic;
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = await req.json();

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
    console.error("POST error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
