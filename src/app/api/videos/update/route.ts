import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const KV_URL = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL)!;
const KV_TOKEN = (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN)!;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Accept a single video patch or a batch of patches so bulk operations
    // only read/write the videos list once.
    const updates: any[] = Array.isArray(body.updates) ? body.updates : [body];
    if (updates.length === 0) return NextResponse.json({ error: "No updates provided" }, { status: 400 });

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

    // Auth: allow admin cookie OR the owner of each video.
    const cookieStore = await cookies();
    const adminCookie = cookieStore.get("trooflix_admin")?.value;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const isAdmin = !!adminPassword && adminCookie === adminPassword;

    let user: any = null;
    if (!isAdmin) {
      const supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      user = data.user;
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const changed: any[] = [];

    for (const patch of updates) {
      const idx = videos.findIndex((v: any) => String(v.id) === String(patch.id));
      if (idx === -1) {
        if (!Array.isArray(body.updates)) return NextResponse.json({ error: "Video not found" }, { status: 404 });
        continue;
      }

      if (!isAdmin) {
        const ownerId = videos[idx]?.uploaderUserId;
        if (!ownerId || String(user.id) !== String(ownerId)) {
          if (!Array.isArray(body.updates)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
          continue;
        }
      }

      videos[idx] = {
        ...videos[idx],
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(patch.category !== undefined ? { category: patch.category } : {}),
        ...(patch.visibility !== undefined ? { visibility: patch.visibility } : {}),
        ...(patch.posterUrl !== undefined ? { posterUrl: patch.posterUrl } : {}),
        ...(patch.backdropUrl !== undefined ? { backdropUrl: patch.backdropUrl } : {}),
        ...(patch.type !== undefined ? { type: patch.type } : {}),
      };
      changed.push(videos[idx]);
    }

    await fetch(`${KV_URL}/set/trooflix:videos`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KV_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ value: JSON.stringify(videos) }),
    });

    return NextResponse.json(
      Array.isArray(body.updates)
        ? { success: true, videos: changed }
        : { success: true, video: changed[0] || null }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
