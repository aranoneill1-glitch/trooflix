import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";
import { kv } from "@vercel/kv";

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

    let { data, error } = await supabaseAdmin
      .from("profiles")
      .select("user_id, avatar_url, backdrop_url, display_name, username, bio, is_verified, verification_tick, tier, has_pass, pass_expires_at, stripe_subscription_id, subscription_status, updated_at, instagram_handle, x_handle, is_hidden")
      .eq("user_id", userId)
      .maybeSingle();

    if (error && String(error.message || "").includes("is_hidden")) {
      const retry = await supabaseAdmin
        .from("profiles")
        .select("user_id, avatar_url, backdrop_url, display_name, username, bio, is_verified, verification_tick, tier, has_pass, pass_expires_at, stripe_subscription_id, subscription_status, updated_at, instagram_handle, x_handle")
        .eq("user_id", userId)
        .maybeSingle();
      data = retry.data as any;
      error = retry.error as any;
    }

    if (error) throw error;
    const hasRedTick = !!data && (data.verification_tick === "plus_red" || data.verification_tick === "creator_gold" || data.is_verified === true);
    let creatorToolsUnlocked = data ? ((await kv.get<string>(`trooflix:creator-tools-unlocked:${userId}`)) === "1" || hasRedTick) : false;
    if (data && !creatorToolsUnlocked) {
      const { data: topup } = await supabaseAdmin
        .from("transactions")
        .select("id")
        .eq("receiver_id", userId)
        .eq("type", "topup")
        .limit(1)
        .maybeSingle();
      if (topup) {
        creatorToolsUnlocked = true;
        try { await kv.set(`trooflix:creator-tools-unlocked:${userId}`, "1"); } catch {}
      }
    }
    if (data && hasRedTick && !creatorToolsUnlocked) creatorToolsUnlocked = true;
    return NextResponse.json({ profile: data ? { ...data, creator_tools_unlocked: creatorToolsUnlocked } : null });
  } catch (e: any) {
    console.error("GET profile error:", e);
    return NextResponse.json({ profile: null });
  }
}

// POST /api/profile — { userId, avatarUrl?, displayName? }
export async function POST(req: Request) {
  try {
    const { userId, avatarUrl, backdropUrl, displayName, bio, instagramHandle, xHandle, isHidden } = await req.json();
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
    if (backdropUrl !== undefined) payload.backdrop_url = backdropUrl;
    if (displayName !== undefined) payload.display_name = displayName;
    if (bio !== undefined) payload.bio = typeof bio === "string" ? bio.slice(0, 300) : null;
    if (instagramHandle !== undefined) payload.instagram_handle = instagramHandle;
    if (xHandle !== undefined) payload.x_handle = xHandle;
    if (isHidden !== undefined) payload.is_hidden = !!isHidden;

    const writeProfile = async (body: any) => {
      if (existing) {
        return await supabaseAdmin.from("profiles").update(body).eq("user_id", userId).select().single();
      }
      return await supabaseAdmin.from("profiles").insert(body).select().single();
    };

    let { data, error } = await writeProfile(payload);
    if (error && "is_hidden" in payload && String(error.message || "").includes("is_hidden")) {
      const { is_hidden, ...rest } = payload;
      ({ data, error } = await writeProfile(rest));
    }
    if (error) throw error;
    return NextResponse.json({ ok: true, profile: data });
  } catch (e: any) {
    console.error("POST profile error:", e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
