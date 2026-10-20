import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function GET() {
  try {
    const keysToTry = ["trooflix:videos", "videos", "trooflix:feed"];
    let videos: any = null;
    let foundKey = "";

    for (const key of keysToTry) {
      const data = await kv.get(key);
      if (data) {
        videos = data;
        foundKey = key;
        break;
      }
    }

    if (!videos) return NextResponse.json({ error: "No videos found in KV" });

    const videoOwners = videos.map((v: any) => ({
      videoTitle: v.title,
      creatorId: v.creatorId || null,
      ownerUserId: v.ownerUserId || null,
      uploaderUserId: v.userId || null,
    }));

    return NextResponse.json({ foundKey, count: videos.length, videoOwners });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) });
  }
}
