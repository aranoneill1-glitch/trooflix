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
    const creators = (await kv.get<any[]>(CREATORS_KEY)) || [];
    const creator = creators.find((c: any) => String(c.ownerUserId) === String(userId)) || null;
    
    if (creator && !creator.photoUrl) {
      // Fetch avatar directly from Supabase
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("avatar_url")
        .eq("user_id", userId)
        .maybeSingle();
        
      if (profile?.avatar_url) {
        creator.photoUrl = profile.avatar_url;
      }
    }

    return NextResponse.json({ creator });
  } catch (e) {
    return NextResponse.json({ creator: null });
  }
}
