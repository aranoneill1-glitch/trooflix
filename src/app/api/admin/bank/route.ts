import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function isAdmin() {
  const cookieStore = await cookies();
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminCookie = cookieStore.get("trooflix_admin")?.value;
  return adminPassword && adminCookie === adminPassword;
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // 1. Trooflix Passes (You keep 100% of this)
    const { data: passes } = await supabaseAdmin
      .from("subscriptions")
      .select("id")
      .eq("subscription_type", "pass")
      .in("status", ["active", "trialing"]);
    const passCount = passes?.length || 0;
    const passGrossCents = passCount * 999; // $9.99

    // 2. Creator Subs (You keep 10%)
    const { data: creatorSubs } = await supabaseAdmin
      .from("creator_subscriptions")
      .select("price_cents")
      .in("status", ["active", "trialing"]);
    const creatorSubCount = creatorSubs?.length || 0;
    const creatorSubTotalCents = (creatorSubs || []).reduce((sum, s) => sum + (s.price_cents || 0), 0);
    const creatorSubYourCutCents = Math.floor(creatorSubTotalCents * 0.10);

    // 3. Merch (You keep 10%)
    const { data: merch } = await supabaseAdmin
      .from("merch_orders")
      .select("amount_cents")
      .in("status", ["paid", "shipped"]);
    const merchCount = merch?.length || 0;
    const merchTotalCents = (merch || []).reduce((sum, m) => sum + (m.amount_cents || 0), 0);
    const merchYourCutCents = Math.floor(merchTotalCents * 0.10);

    // 4. Calculate Stripe Fees (Approx 3.6% + 30c per transaction across all total volume)
    const totalVolumeCents = passGrossCents + creatorSubTotalCents + merchTotalCents;
    const totalTransactions = passCount + creatorSubCount + merchCount;
    const stripeFeesCents = Math.floor((totalVolumeCents * 0.036) + (totalTransactions * 30));

    // 5. Your Net Bank Balance
    // (Passes 100%) + (Creator Subs 10%) + (Merch 10%) - Stripe Fees
    const grossPlatformRevenue = passGrossCents + creatorSubYourCutCents + merchYourCutCents;
    const netBankBalanceCents = Math.max(0, grossPlatformRevenue - stripeFeesCents);

    return NextResponse.json({
      pass_count: passCount,
      pass_gross_cents: passGrossCents,
      creator_sub_count: creatorSubCount,
      creator_sub_your_cut_cents: creatorSubYourCutCents,
      merch_count: merchCount,
      merch_your_cut_cents: merchYourCutCents,
      stripe_fees_cents: stripeFeesCents,
      net_bank_cents: netBankBalanceCents,
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
