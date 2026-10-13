import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET /api/users?id=UUID                 → single profile
// GET /api/users?ids=UUID,UUID,...       → bulk (for inbox hydration)
// GET /api/users?q=aran                  → search by username / display_name
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const ids = searchParams.get("ids");
    const q = searchParams.get("q");

    if (id) {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .eq("user_id", id)
        .maybeSingle();
      if (error) throw error;
      return NextResponse.json({ user: data || null });
    }

    if (ids) {
      const list = ids
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 100);
      if (list.length === 0) return NextResponse.json({ users: [] });

      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", list);
      if (error) throw error;
      return NextResponse.json({ users: data || [] });
    }

    if (q) {
      const raw = q.trim().toLowerCase().replace(/^@+/, "");
      if (raw.length < 2) return NextResponse.json({ users: [] });

      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .or(`username.ilike.%${raw}%,display_name.ilike.%${raw}%`)
        .not("username", "is", null)
        .limit(20);
      if (error) throw error;
      return NextResponse.json({ users: data || [] });
    }

    return NextResponse.json({ users: [] });
  } catch (e: any) {
    console.error("GET users error:", e);
    return NextResponse.json({ users: [] });
  }
}
