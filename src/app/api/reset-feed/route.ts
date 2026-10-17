import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const VIDEOS_KEY = "trooflix:videos";

export async function POST() {
  try {
    const videos = (await kv.get<any[]>(VIDEOS_KEY)) || [];

    // Find Loose Change. (Checking both title and ID just to be safe)
    const looseChange = videos.find(
      (v: any) => 
        (v.title && v.title.toLowerCase().includes("loose change")) || 
        v.id === 1791745100023
    );

    if (!looseChange) {
      return NextResponse.json({ error: "Loose Change not found in KV. Aborting to be safe." }, { status: 404 });
    }

    // Ensure it's featured so it remains the hero
    looseChange.featured = true;

    // Overwrite KV with only Loose Change
    await kv.set(VIDEOS_KEY, [looseChange]);

    // Wipe all user data from Supabase
    // (Using .neq("id", 0) to delete all rows)
    await Promise.all([
      supabaseAdmin.from("likes").delete().neq("id", 0),
      supabaseAdmin.from("dislikes").delete().neq("id", 0),
      supabaseAdmin.from("comments").delete().neq("id", 0),
      supabaseAdmin.from("views").delete().neq("id", 0),
      supabaseAdmin.from("my_list").delete().neq("id", 0)
    ]);

    return NextResponse.json({ 
      ok: true, 
      kept: looseChange.title,
      deletedCount: videos.length - 1 
    });
  } catch (e: any) {
    console.error("Reset error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
