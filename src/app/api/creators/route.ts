import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET /api/creators — returns all users with tier='podcaster'
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("user_id, display_name, username, avatar_url, bio, tier, is_verified, updated_at")
      .eq("tier", "podcaster")
      .order("updated_at", { ascending: false });

    if (error) throw error;

    // Map to the Creator shape the rest of the app expects
    // Convert UUID user_id → stable numeric id (first 12 hex chars as integer, fits in JS safe int)
    const creators = (data || []).map((p: any) => {
      const uuidHex = String(p.user_id).replace(/-/g, "").slice(0, 12);
      const numericId = parseInt(uuidHex, 16) || 0;
      return {
        id: numericId,
        user_id: p.user_id,
        name: p.display_name || p.username || "Podcaster",
        slug: p.username || p.user_id.slice(0, 8),
        photoUrl: p.avatar_url || "",
        heroBackdropUrl: "",
        description: p.bio || "",
        isVerified: p.is_verified ?? true,
        ownerUserId: p.user_id,
        createdAt: p.updated_at,
      };
    });

    return NextResponse.json(creators);
  } catch (e: any) {
    console.error("GET creators error:", e);
    return NextResponse.json([]);
  }
}
