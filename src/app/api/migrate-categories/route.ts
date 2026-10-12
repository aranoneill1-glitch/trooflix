import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const KEY = "trooflix:videos";

const RENAMES: Record<string, string> = {
  "History Revisionism": "History",
  "Politics and Power": "Politics",
  "Health and Science": "Science & Health",
  "Technology and Control": "Technology",
  "Religion and Belief": "Religion & Belief",
  "Ancient Civilisations": "Ancient History",
  "UFO Phenomena": "The Unknown",
};

export async function GET() {
  try {
    const videos = (await kv.get<any[]>(KEY)) || [];
    let changed = 0;
    const summary: string[] = [];

    const updated = videos.map((v) => {
      if (v.category && RENAMES[v.category]) {
        const oldCat = v.category;
        const newCat = RENAMES[oldCat];
        changed++;
        summary.push(`${v.title}: "${oldCat}" → "${newCat}"`);
        return { ...v, category: newCat };
      }
      return v;
    });

    await kv.set(KEY, updated);

    return NextResponse.json({
      ok: true,
      totalVideos: videos.length,
      changed,
      summary,
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
