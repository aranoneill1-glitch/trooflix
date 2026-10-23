import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET() {
  try {
    // 1. Get all active Pass subscriptions
    const { data: passes } = await supabaseAdmin
      .from("subscriptions")
      .select("id")
      .eq("subscription_type", "pass")
      .in("status", ["active", "trialing"]);

    const passCount = passes?.length || 0;
    
    // 2. Calculate Gross Revenue ($9.99 per pass)
    const grossCents = passCount * 999;
    
    // 3. Estimate Stripe fees (~3.6% + 30c per transaction)
    const estimatedFees = Math.floor((grossCents * 0.036) + (passCount * 30));
    const netCents = Math.max(0, grossCents - estimatedFees);
    
    // 4. Calculate the Creator Pool (50% Main + 5% Reels = 55% of net)
    const poolCents = Math.floor(netCents * 0.55);

    return NextResponse.json({
      active_passes: passCount,
      pool_cents: poolCents,
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
