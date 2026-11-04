import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const KV_URL = (process.env.KV_REST_API_URL || "").replace(/"/g, "").replace(/\\n/g, "").trim().replace(/\/$/, "");
    const KV_TOKEN = (process.env.KV_REST_API_TOKEN || "").replace(/"/g, "").replace(/\\n/g, "").trim();

    if (!KV_URL || !KV_TOKEN) return NextResponse.json([]);

    const res = await fetch(`${KV_URL}/get/trooflix:videos`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
      cache: 'no-store'
    });
    
    if (!res.ok) return NextResponse.json([]);
    
    const data = await res.json();
    if (!data.result) return NextResponse.json([]);

    // ROBUST PARSER: Handles raw arrays, double-stringified objects, and JSON strings
    let videos = [];
    try {
      let parsed = JSON.parse(data.result);
      
      // Unwrap if it's { value: "..." }
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.value) {
        parsed = typeof parsed.value === 'string' ? JSON.parse(parsed.value) : parsed.value;
      }
      
      // Final check
      if (Array.isArray(parsed)) {
        videos = parsed;
      }
    } catch (e) {
      console.error("Failed to parse KV data:", e);
      return NextResponse.json([]);
    }

    const sorted = [...videos].sort((a, b) => b.id - a.id);
    return NextResponse.json(sorted);
    
  } catch (e: any) {
    console.error("API GET Error:", e.message);
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  try {
    const KV_URL = (process.env.KV_REST_API_URL || "").replace(/"/g, "").replace(/\\n/g, "").trim().replace(/\/$/, "");
    const KV_TOKEN = (process.env.KV_REST_API_TOKEN || "").replace(/"/g, "").replace(/\\n/g, "").trim();
    
    const body = await req.json();
    
    // Get current videos
    const getRes = await fetch(`${KV_URL}/get/trooflix:videos`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` }
    });
    const getData = await getRes.json();
    
    let videos = [];
    if (getData.result) {
      let parsed = JSON.parse(getData.result);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.value) {
        parsed = typeof parsed.value === 'string' ? JSON.parse(parsed.value) : parsed.value;
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
      backdropUrl: body.backdropUrl || body.posterUrl || "",
    };

    const updated = [newVideo, ...videos];
    
    await fetch(`${KV_URL}/set/trooflix:videos`, {
      method: "POST",
      headers: { 
        Authorization: `Bearer ${KV_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ value: JSON.stringify(updated) })
    });

    return NextResponse.json({ success: true, video: newVideo });
  } catch (e: any) {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
