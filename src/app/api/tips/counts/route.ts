import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const videoIds = (searchParams.get("videoIds") || "").split(",").map(s => s.trim()).filter(Boolean).slice(0, 100);
    const commentIds = (searchParams.get("commentIds") || "").split(",").map(s => s.trim()).filter(Boolean).slice(0, 200);

    const [videoCounts, commentCounts] = await Promise.all([
      Promise.all(videoIds.map(async (id) => {
        const v = await kv.get<number>(`trooflix:tips:video:${id}`);
        return [id, Number(v || 0)] as const;
      })),
      Promise.all(commentIds.map(async (id) => {
        const v = await kv.get<number>(`trooflix:tips:comment:${id}`);
        return [id, Number(v || 0)] as const;
      })),
    ]);

    return NextResponse.json({
      videos: Object.fromEntries(videoCounts),
      comments: Object.fromEntries(commentCounts),
    });
  } catch (e: any) {
    return NextResponse.json({ videos: {}, comments: {}, error: String(e) }, { status: 500 });
  }
}
