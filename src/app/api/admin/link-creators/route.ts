import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";
import { kv } from "@vercel/kv";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const CREATORS_KEY = "trooflix:creators";

/**
 * One-off admin endpoint: backfill `ownerUserId` on KV creator records
 * by matching the creator's `name` against profiles.username or display_name.
 *
 * POST /api/admin/link-creators
 */
export async function POST() {
  try {
    const creators = (await kv.get<any[]>(CREATORS_KEY)) || [];
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("user_id, username, display_name");

    const byUsername: Record<string, string> = {};
    const byDisplay: Record<string, string> = {};
    (profiles || []).forEach((p: any) => {
      if (p.username) byUsername[p.username.toLowerCase()] = p.user_id;
      if (p.display_name) byDisplay[p.display_name.toLowerCase()] = p.user_id;
    });

    let linked = 0;
    const updated = creators.map((c: any) => {
      if (c.ownerUserId) return c; // already linked
      const name = (c.name || "").toLowerCase();
      const uid = byUsername[name] || byDisplay[name];
      if (uid) {
        linked++;
        return { ...c, ownerUserId: uid };
      }
      return c;
    });

    await kv.set(CREATORS_KEY, updated);
    return NextResponse.json({ ok: true, linked, total: creators.length });
  } catch (e: any) {
    console.error("link-creators error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
