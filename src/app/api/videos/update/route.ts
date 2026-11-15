import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const KV_URL = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL)!;
const KV_TOKEN = (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN)!;

export async function POST(req: Request) {
  try {
    const { id, title, description, category, visibility, type, posterUrl } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing video ID" }, { status: 400 });

    const getRes = await fetch(`${KV_URL}/get/trooflix:videos`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
    });
    const getData = await getRes.json();

    let videos: any[] = [];
    if (getData.result) {
      let parsed = JSON.parse(getData.result);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && parsed.value) {
        parsed = typeof parsed.value === "string" ? JSON.parse(parsed.value) : parsed.value;
      }
      if (Array.isArray(parsed)) videos = parsed;
    }

    const idx = videos.findIndex((v: any) => String(v.id) === String(id));
    if (idx === -1) return NextResponse.json({ error: "Video not found" }, { status: 404 });

    // Auth: allow admin cookie OR the video owner
    const cookieStore = await cookies();
    const adminCookie = cookieStore.get("trooflix_admin")?.value;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const isAdmin = !!adminPassword && adminCookie === adminPassword;

    if (!isAdmin) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const ownerId = videos[idx]?.uploaderUserId;
      if (!user || !ownerId || String(user.id) !== String(ownerId)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    videos[idx] = {
      ...videos[idx],
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(category !== undefined ? { category } : {}),
      ...(visibility !== undefined ? { visibility } : {}),
      ...(posterUrl !== undefined ? { posterUrl } : {}),
      ...(type !== undefined ? { type } : {}),
    };

    await fetch(`${KV_URL}/set/trooflix:videos`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KV_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ value: JSON.stringify(videos) }),
    });

    return NextResponse.json({ success: true, video: videos[idx] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
