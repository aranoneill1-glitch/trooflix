import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";
import { kv } from "@vercel/kv";

export const dynamic = "force-dynamic";

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
    // 1. Get profile safely
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("username, display_name, avatar_url")
      .eq("user_id", userId)
      .maybeSingle();

    const creators = (await kv.get<any[]>(CREATORS_KEY)) || [];
    
    // 2. Try to find in KV by ownerUserId or username
    let creator = creators.find((c: any) => String(c.ownerUserId) === String(userId));
    
    if (!creator && profile?.username) {
      creator = creators.find((c: any) => String(c.slug).toLowerCase() === String(profile.username).toLowerCase());
    }

    // 3. Update creator details with latest profile info if found
    if (creator) {
      if (profile?.avatar_url) creator.photoUrl = profile.avatar_url;
      if (profile?.display_name) creator.name = profile.display_name;
    }

    // 4. Return null if no creator found (frontend will handle gracefully)
    return NextResponse.json({ creator: creator || null });
  } catch (e) {
    console.error("API Error:", e);
    return NextResponse.json({ creator: null });
  }
}
