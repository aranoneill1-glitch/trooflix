import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET /api/profile?user_id=X
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");
    if (!userId) return NextResponse.json({ profile: null });

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("user_id, avatar_url, display_name, username, bio, is_verified, updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ profile: data || null });
  } catch (e: any) {
    console.error("GET profile error:", e);
    return NextResponse.json({ profile: null });
  }
}

// POST /api/profile — { userId, avatarUrl?, displayName? }
export async function POST(req: Request) {
  try {
    const { userId, avatarUrl, displayName, bio } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    const payload: any = {
      user_id: userId,
      updated_at: new Date().toISOString(),
    };
    if (avatarUrl !== undefined) payload.avatar_url = avatarUrl;
    if (displayName !== undefined) payload.display_name = displayName;
    if (bio !== undefined) payload.bio = typeof bio === "string" ? bio.slice(0, 300) : null;

    if (existing) {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .update(payload)
        .eq("user_id", userId)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ ok: true, profile: data });
    } else {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ ok: true, profile: data });
    }
  } catch (e: any) {
    console.error("POST profile error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
