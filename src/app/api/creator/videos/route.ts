import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";
import { kv } from "@vercel/kv";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const CREATORS_KEY = "trooflix:creators";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ videos: [] });

  try {
    // Get creator record from KV
    const creators = (await kv.get<any[]>(CREATORS_KEY)) || [];
    const creator = creators.find((c: any) => String(c.ownerUserId) === String(userId));
    if (!creator) return NextResponse.json({ videos: [] });

    // Get videos from KV (assuming your videos are stored under trooflix:videos)
    const allVideos = (await kv.get<any[]>("trooflix:videos")) || [];
    const myVideos = allVideos.filter((v: any) => String(v.creatorId) === String(creator.id));

    return NextResponse.json({ videos: myVideos });
  } catch (e) {
    return NextResponse.json({ videos: [] });
  }
}

export async function PATCH(req: Request) {
  try {
    const { videoId, is_premium } = await req.json();
    
    // Update video in KV
    const allVideos = (await kv.get<any[]>("trooflix:videos")) || [];
    const idx = allVideos.findIndex((v: any) => v.id === videoId);
    
    if (idx !== -1) {
      allVideos[idx] = { ...allVideos[idx], is_premium };
      await kv.set("trooflix:videos", allVideos);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
