import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const KV_URL = "https://neat-monster-216395.upstash.io";
const KV_TOKEN = "gQAAAAAAA01LAAIgcDE3ZTRiZTkyZGNmNjI0M2ZmODg0ZDRmMTNmMDhkYzhhMQ";

export async function POST(req: Request) {
  try {
    const { id, title, description, category, visibility } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing video ID" }, { status: 400 });

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

    const idx = videos.findIndex((v: any) => String(v.id) === String(id));
    if (idx === -1) return NextResponse.json({ error: "Video not found" }, { status: 404 });

    videos[idx] = {
      ...videos[idx],
      title: title || videos[idx].title,
      description: description || videos[idx].description,
      category: category || videos[idx].category,
      visibility: visibility || videos[idx].visibility,
    };

    await fetch(`${KV_URL}/set/trooflix:videos`, {
      method: "POST",
      headers: { 
        Authorization: `Bearer ${KV_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ value: JSON.stringify(videos) })
    });

    return NextResponse.json({ success: true, video: videos[idx] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
