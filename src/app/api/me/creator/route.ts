import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";
import { kv } from "@vercel/kv";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
const CREATORS_KEY = "trooflix:creators";
const VIDEOS_KEY = "trooflix:videos";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("user_id");
  if (!userId) return NextResponse.json({ creator: null });

  try {
    const creators = (await kv.get<any[]>(CREATORS_KEY)) || [];
    const creator = creators.find((c: any) => String(c.ownerUserId) === String(userId));
    
    if (!creator) {
      // If they don't have a creator record yet, return profile data so the avatar shows
      const { data: profile } = await supabaseAdmin.from("profiles").select("username, display_name, avatar_url").eq("user_id", userId).maybeSingle();
      return NextResponse.json({ creator: profile ? { name: profile.display_name || profile.username, photoUrl: profile.avatar_url, id: null } : null });
    }

    // Get videos for this creator to fix the Studio stats
    const allVideos = (await kv.get<any[]>(VIDEOS_KEY)) || [];
    const myVideos = allVideos.filter((v: any) => String(v.creatorId) === String(creator.id));
    
    // Ensure the creator object has the photoUrl
    if (!creator.photoUrl) {
      const { data: profile } = await supabaseAdmin.from("profiles").select("avatar_url").eq("user_id", userId).maybeSingle();
      if (profile?.avatar_url) creator.photoUrl = profile.avatar_url;
    }

    return NextResponse.json({ creator, stats: { episodes: myVideos.length, plays: 0, followers: 0, likes: 0 } });
  } catch (e) {
    return NextResponse.json({ creator: null });
  }
}
