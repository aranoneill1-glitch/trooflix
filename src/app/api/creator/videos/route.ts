import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const VIDEOS_KEY = "trooflix:videos";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const creatorId = searchParams.get("creatorId");
  
  if (!creatorId) return NextResponse.json({ videos: [] });

  try {
    const allVideos = (await kv.get<any[]>(VIDEOS_KEY)) || [];
    const myVideos = allVideos.filter((v: any) => String(v.creatorId) === String(creatorId));
    return NextResponse.json({ videos: myVideos });
  } catch (e) {
    return NextResponse.json({ videos: [] });
  }
}

export async function PATCH(req: Request) {
  try {
    const { videoId, access_type, category } = await req.json();
    const allVideos = (await kv.get<any[]>(VIDEOS_KEY)) || [];
    const idx = allVideos.findIndex((v: any) => v.id === videoId);
    
    if (idx !== -1) {
      // Update the new access_type, and keep is_premium for backwards compatibility
      allVideos[idx] = { 
        ...allVideos[idx], 
        access_type,
        is_premium: access_type !== "free",
        ...(category !== undefined ? { category } : {})
      };
      await kv.set(VIDEOS_KEY, allVideos);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
