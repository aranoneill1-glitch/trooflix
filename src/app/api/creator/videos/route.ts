import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const VIDEOS_KEY = "trooflix:videos";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const creatorId = searchParams.get("creatorId");
  
  if (!creatorId) return NextResponse.json({ videos: [] });

  try {
    const allVideos = (await kv.get<any[]>(VIDEOS_KEY)) || [];
    // Just match the exact ID that the video object uses
    const myVideos = allVideos.filter((v: any) => String(v.creatorId) === String(creatorId));

    return NextResponse.json({ videos: myVideos });
  } catch (e) {
    return NextResponse.json({ videos: [] });
  }
}

export async function PATCH(req: Request) {
  try {
    const { videoId, is_premium } = await req.json();
    const allVideos = (await kv.get<any[]>(VIDEOS_KEY)) || [];
    const idx = allVideos.findIndex((v: any) => v.id === videoId);
    
    if (idx !== -1) {
      allVideos[idx] = { ...allVideos[idx], is_premium };
      await kv.set(VIDEOS_KEY, allVideos);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
