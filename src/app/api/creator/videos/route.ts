import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";
import { kv } from "@vercel/kv";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const VIDEOS_KEY = "trooflix:videos";
const CREATORS_KEY = "trooflix:creators";

// Verify caller is an approved creator and return their creator record
async function getCallerCreator(userId: string) {
  if (!userId) return null;

  const { data: app } = await supabaseAdmin
    .from("creator_applications")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();

  if (!app || app.status !== "approved") return null;

  const creators = (await kv.get<any[]>(CREATORS_KEY)) || [];
  return creators.find((c: any) => c.ownerUserId === userId) || null;
}

// POST /api/creator/videos — { userId, title, description, category, type, bitchuteUrl, posterUrl, backdropUrl }
// creatorId is FORCED to the caller's creator record — can't be forged.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId } = body;
    const creator = await getCallerCreator(userId);
    if (!creator) {
      return NextResponse.json({ error: "Not an approved creator" }, { status: 403 });
    }

    const videos = (await kv.get<any[]>(VIDEOS_KEY)) || [];
    const newVideo = {
      id: Date.now(),
      title: body.title || "Untitled",
      description: body.description || "",
      category: body.category || "Uncategorized",
      type: body.type || "Podcast",
      featured: false,
      creatorId: creator.id,          // ← forced, cannot be tampered with
      bitchuteUrl: body.bitchuteUrl || "",
      posterUrl: body.posterUrl || "",
      backdropUrl: body.backdropUrl || "",
      year: new Date().getFullYear(),
      rating: body.rating || "TV-MA",
      match: 95,
      duration: body.duration || "",
      createdAt: new Date().toISOString(),
    };
    videos.push(newVideo);
    await kv.set(VIDEOS_KEY, videos);
    return NextResponse.json({ ok: true, video: newVideo });
  } catch (e: any) {
    console.error("POST creator video error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PATCH /api/creator/videos — { userId, id, ...fields } — only their own videos
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { userId, id } = body;
    const creator = await getCallerCreator(userId);
    if (!creator) {
      return NextResponse.json({ error: "Not an approved creator" }, { status: 403 });
    }

    const videos = (await kv.get<any[]>(VIDEOS_KEY)) || [];
    const idx = videos.findIndex((v: any) => v.id === Number(id));
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (videos[idx].creatorId !== creator.id) {
      return NextResponse.json({ error: "Not your video" }, { status: 403 });
    }

    const allowed = ["title", "description", "category", "type", "bitchuteUrl", "posterUrl", "backdropUrl", "rating", "duration"];
    for (const k of allowed) {
      if (body[k] !== undefined) videos[idx][k] = body[k];
    }
    await kv.set(VIDEOS_KEY, videos);
    return NextResponse.json({ ok: true, video: videos[idx] });
  } catch (e: any) {
    console.error("PATCH creator video error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE /api/creator/videos?id=X&userId=Y — only their own
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    const userId = searchParams.get("userId") || "";
    const creator = await getCallerCreator(userId);
    if (!creator) {
      return NextResponse.json({ error: "Not an approved creator" }, { status: 403 });
    }
    const videos = (await kv.get<any[]>(VIDEOS_KEY)) || [];
    const target = videos.find((v: any) => v.id === id);
    if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (target.creatorId !== creator.id) {
      return NextResponse.json({ error: "Not your video" }, { status: 403 });
    }
    const filtered = videos.filter((v: any) => v.id !== id);
    await kv.set(VIDEOS_KEY, filtered);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("DELETE creator video error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
