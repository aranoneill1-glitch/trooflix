import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const VIDEOS_KEY = "trooflix:videos";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, title, description, videoUrl, posterUrl, backdropUrl, type, category, status, scheduledAt } = body;

    if (!userId || !title || !videoUrl) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

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
      creatorId: null,
      uploaderUserId: userId,
      createdAt: new Date().toISOString(),
      status: status || "published", // <-- NEW
      scheduledAt: scheduledAt || null, // <-- NEW
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
