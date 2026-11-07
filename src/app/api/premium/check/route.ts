import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { canWatchPremium, getUserTier } from "@/lib/subscriptions";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const { userId, creatorId } = await req.json();
    if (!creatorId) return NextResponse.json({ error: "creatorId required" }, { status: 400 });

    // Get creator info (name, premium price)
    const { data: creatorProfile } = await supabaseAdmin
      .from("profiles")
      .select("premium_enabled, premium_price_cents, display_name, username")
      .eq("creator_id", Number(creatorId))
      .maybeSingle();

    const creatorHasPremium = !!creatorProfile?.premium_enabled;
    const priceCents = creatorProfile?.premium_price_cents || null;
    const creatorName = creatorProfile?.display_name || creatorProfile?.username || "this creator";

    // Logged-out users can never watch premium
    if (!userId) {
      return NextResponse.json({ allowed: false, creatorHasPremium, priceCents, creatorName, reason: "login" });
    }

    // Check if they can watch
    const allowed = await canWatchPremium(userId, Number(creatorId));

    return NextResponse.json({ allowed, creatorHasPremium, priceCents, creatorName });
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
