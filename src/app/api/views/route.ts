import { NextResponse } from "next/server";

const KV_URL = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL)!;
const KV_TOKEN = (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN)!;
const KEY = "trooflix:videos";

export async function POST(req: Request) {
  try {
    const { videoId } = await req.json();
    if (!videoId) return NextResponse.json({ error: "Missing videoId" }, { status: 400 });

    // 1. Get current videos from KV
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

    // 2. Find the video and increment the views
    const idx = videos.findIndex((v: any) => String(v.id) === String(videoId));
    if (idx !== -1) {
      videos[idx].views = (videos[idx].views || 0) + 1;

      // 3. Save back to KV
      await fetch(`${KV_URL}/set/${KEY}`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${KV_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ value: JSON.stringify(videos) })
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("View tracking error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}


export async function GET() {
  return NextResponse.json({ ok: true });
}
