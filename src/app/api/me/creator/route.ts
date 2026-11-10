import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("user_id");
  if (!userId) return NextResponse.json({ creator: null });

  try {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("user_id, display_name, username, avatar_url, bio, tier, is_verified, verification_tick, updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (!profile || profile.tier !== "creator") {
      return NextResponse.json({ creator: null });
    }

    const uuidHex = String(profile.user_id).replace(/-/g, "").slice(0, 12);
    const numericId = parseInt(uuidHex, 16) || 0;

    return NextResponse.json({
      creator: {
        id: numericId,
        user_id: profile.user_id,
        name: profile.display_name || profile.username || "Creator",
        slug: profile.username || String(profile.user_id).slice(0, 8),
        photoUrl: profile.avatar_url || "",
        heroBackdropUrl: "",
        description: profile.bio || "",
        isVerified: profile.is_verified ?? true,
        verification_tick: profile.verification_tick || "creator_gold",
        ownerUserId: profile.user_id,
        createdAt: profile.updated_at,
      },
    });
  } catch (e) {
    console.error("API Error:", e);
    return NextResponse.json({ creator: null });
  }
}
