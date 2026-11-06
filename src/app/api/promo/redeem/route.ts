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
    const { data: promo } = await supabaseAdmin
      .from("promo_codes")
      .select("*")
      .eq("code", cleanCode)
      .eq("is_active", true)
      .maybeSingle();

    if (!promo) return NextResponse.json({ error: "Invalid promo code" }, { status: 404 });

    // 2. Check max uses
    if (promo.max_uses !== null && promo.current_uses >= promo.max_uses) {
      return NextResponse.json({ error: "This code has reached its usage limit" }, { status: 400 });
    }

    // 3. Check if the user already redeemed ANY code
    const { data: existing } = await supabaseAdmin
      .from("promo_redemptions")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "You've already redeemed a promo code" }, { status: 400 });
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
    await supabaseAdmin.from("promo_redemptions").insert({
      user_id: userId,
      code: cleanCode,
      granted_tier: promo.grants_tier,
    });

    await supabaseAdmin
      .from("promo_codes")
      .update({ current_uses: promo.current_uses + 1 })
      .eq("id", promo.id);

    return NextResponse.json({ success: true, tier: promo.grants_tier });
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
