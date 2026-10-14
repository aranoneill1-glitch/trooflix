import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const CREATORS_KEY = "trooflix:creators";
const VIDEOS_KEY = "trooflix:videos";

// GET /api/search?q=aran  → { videos, podcasters, users }
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const raw = (searchParams.get("q") || "").trim().toLowerCase();
    if (raw.length < 2) {
      return NextResponse.json({ videos: [], podcasters: [], users: [] });
    }

    // ---- Videos ----
    let videos: any[] = [];
    try {
      const all = (await kv.get<any[]>(VIDEOS_KEY)) || [];
      videos = all
        .filter((v: any) => {
          const t = (v.title || "").toLowerCase();
          const d = (v.description || "").toLowerCase();
          const c = (v.category || "").toLowerCase();
          return t.includes(raw) || d.includes(raw) || c.includes(raw);
        })
        .slice(0, 20);
    } catch (e) {
      console.error("search videos error:", e);
    }

    // ---- Podcasters ----
    let podcasters: any[] = [];
    try {
      const all = (await kv.get<any[]>(CREATORS_KEY)) || [];
      podcasters = all
        .filter((c: any) => {
          const n = (c.name || "").toLowerCase();
          const d = (c.description || "").toLowerCase();
          return n.includes(raw) || d.includes(raw);
        })
        .slice(0, 20);
    } catch (e) {
      console.error("search podcasters error:", e);
    }

    // ---- Users ----
    let users: any[] = [];
    try {
      const clean = raw.replace(/^@+/, "");
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("user_id, username, display_name, avatar_url, bio")
        .or(`username.ilike.%${clean}%,display_name.ilike.%${clean}%`)
        .not("username", "is", null)
        .limit(20);
      if (error) throw error;
      users = data || [];
    } catch (e) {
      console.error("search users error:", e);
    }

    return NextResponse.json({ videos, podcasters, users });
  } catch (e: any) {
    console.error("search error:", e);
    return NextResponse.json({ videos: [], podcasters: [], users: [] });
  }
}
