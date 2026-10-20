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
  const userId = searchParams.get("user_id");
  if (!userId) return NextResponse.json({ creator: null });

  try {
    // 1. Get profile from Supabase (which now has creator_id)
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("username, display_name, avatar_url, creator_id")
      .eq("user_id", userId)
      .maybeSingle();

    const creators = (await kv.get<any[]>(CREATORS_KEY)) || [];
    
    let creator = null;

    // 2. If we have a creator_id in the database, use it directly!
    if (profile?.creator_id) {
      creator = creators.find((c: any) => String(c.id) === String(profile.creator_id));
    }

    // 3. Fallback: If not in DB, try to find in KV by ownerUserId or username (for older accounts)
    if (!creator) {
      creator = creators.find((c: any) => String(c.ownerUserId) === String(userId));
      
      if (!creator && profile?.username) {
        creator = creators.find((c: any) => String(c.slug).toLowerCase() === String(profile.username).toLowerCase());
      }

      // If we found them via fallback, SAVE the creator_id to their profile so it's permanent!
      if (creator) {
        await supabaseAdmin
          .from("profiles")
          .update({ creator_id: creator.id })
          .eq("user_id", userId);
      }
    }

    // 4. Attach the avatar and name from Supabase so it's always accurate
    if (creator && profile) {
      if (profile.avatar_url) creator.photoUrl = profile.avatar_url;
      if (profile.display_name) creator.name = profile.display_name;
    }

    return NextResponse.json({ creator });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ creator: null });
  }
}
