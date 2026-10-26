import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const VIDEOS_KEY = "trooflix:videos";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const creatorId = searchParams.get("creatorId");
  const isDashboard = searchParams.get("dashboard") === "true"; // <-- Allow dashboard to see everything
  
  if (!creatorId) return NextResponse.json({ videos: [] });

  try {
    const allVideos = (await kv.get<any[]>(VIDEOS_KEY)) || [];
    let myVideos = allVideos.filter((v: any) => String(v.creatorId) === String(creatorId));
    
    // If not in dashboard, filter out drafts and future scheduled videos
    if (!isDashboard) {
      const now = new Date();
      myVideos = myVideos.filter((v: any) => {
        if (v.status === "draft") return false;
        if (v.status === "scheduled" && v.scheduledAt) {
          return new Date(v.scheduledAt) <= now;
        }
        return true;
      });
    }

    return NextResponse.json({ videos: myVideos });
  } catch (e) {
    return NextResponse.json({ videos: [] });
  }
}

export async function PATCH(req: Request) {
  try {
    const { videoId, access_type, category, status } = await req.json();
    const allVideos = (await kv.get<any[]>(VIDEOS_KEY)) || [];
    const idx = allVideos.findIndex((v: any) => v.id === videoId);
    
    if (idx !== -1) {
      allVideos[idx] = { 
        ...allVideos[idx], 
        ...(access_type !== undefined ? { access_type, is_premium: access_type !== "free" } : {}),
        ...(category !== undefined ? { category } : {}),
        ...(status !== undefined ? { status } : {})
      };
      await kv.set(VIDEOS_KEY, allVideos);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
