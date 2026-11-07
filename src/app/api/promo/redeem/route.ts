import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const { userId, code } = await req.json();
    if (!userId || !code) return NextResponse.json({ error: "userId and code required" }, { status: 400 });

    const cleanCode = String(code).trim().toUpperCase();

    // 1. Look up the code
    const { data: promo, error: lookupError } = await supabaseAdmin
      .from("promo_codes")
      .select("*")
      .eq("code", cleanCode)
      .eq("is_active", true)
      .maybeSingle();

    if (lookupError) {
      console.error("promo_codes lookup error:", lookupError);
      return NextResponse.json({ error: "Promo lookup failed: " + lookupError.message }, { status: 500 });
    }
    if (!promo) return NextResponse.json({ error: "Invalid promo code" }, { status: 404 });

    // 2. Check max uses
    if (promo.max_uses !== null && promo.current_uses >= promo.max_uses) {
      return NextResponse.json({ error: "This code has reached its usage limit" }, { status: 400 });
    }

    // 3. Check for existing redemptions + current tier
    const { data: existing } = await supabaseAdmin
      .from("promo_redemptions")
      .select("granted_tier")
      .eq("user_id", userId);

    // Get current tier
    const { data: currentProfile } = await supabaseAdmin
      .from("profiles")
      .select("tier")
      .eq("user_id", userId)
      .maybeSingle();

    const tierRank: Record<string, number> = { free: 0, plus: 1, creator: 2 };
    const currentRank = tierRank[String(currentProfile?.tier || "free").toLowerCase()] ?? 0;
    const newRank = tierRank[promo.grants_tier] ?? 0;

    // If they've already redeemed codes:
    if (existing && existing.length > 0) {
      // Allow only if it's a legitimate UPGRADE (new code grants a higher tier than current)
      if (newRank <= currentRank) {
        return NextResponse.json({ 
          error: newRank === currentRank 
            ? `You already have ${promo.grants_tier} access` 
            : "You can only redeem upgrade codes" 
        }, { status: 400 });
      }
      // Upgrade path — allow
    }

    // 4. Apply the tier to the user's profile
    const tick = promo.grants_tier === "creator" ? "creator_gold" : "plus_red";

    const { error: updateErr } = await supabaseAdmin
      .from("profiles")
      .update({
        tier: promo.grants_tier,
        verification_tick: tick,
        is_verified: true,
        has_pass: true,
        plus_expires_at: null,
      })
      .eq("user_id", userId);

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    // 5. Log the redemption + increment uses
    const { error: redeemErr } = await supabaseAdmin.from("promo_redemptions").insert({
      user_id: userId,
      code: cleanCode,
      granted_tier: promo.grants_tier,
    });
    if (redeemErr) {
      console.error("promo_redemptions insert error:", redeemErr);
      return NextResponse.json({ error: "Redemption log failed: " + redeemErr.message }, { status: 500 });
    }

    await supabaseAdmin
      .from("promo_codes")
      .update({ current_uses: promo.current_uses + 1 })
      .eq("id", promo.id);

    return NextResponse.json({ success: true, tier: promo.grants_tier });
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
