import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const VIDEOS_KEY = "trooflix:videos";
const CREATORS_KEY = "trooflix:creators";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, title, description, videoUrl, posterUrl, backdropUrl, type, category, status, scheduledAt, chapters } = body;

    if (!userId || !title || !videoUrl) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

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
      chapters: chapters || [], // <-- Added Chapters
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
