import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient as createServerClient } from "@supabase/supabase-js";
import { kv } from "@vercel/kv";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const CREATORS_KEY = "trooflix:creators";

async function isAdmin() {
  const cookieStore = await cookies();
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminCookie = cookieStore.get("trooflix_admin")?.value;
  return adminPassword && adminCookie === adminPassword;
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const creators = (await kv.get<any[]>(CREATORS_KEY)) || [];
    const creatorMap = new Map(creators.map((c) => [Number(c.id), c]));

    // 1. Fetch active Pass subscriptions to calculate the Pool automatically
    const { data: passSubs } = await supabaseAdmin
      .from("subscriptions")
      .select("id")
      .eq("subscription_type", "pass")
      .in("status", ["active", "trialing"]);

    const passCount = passSubs?.length || 0;
    const passGrossCents = passCount * 999; // $9.99 per pass
    // Estimate Stripe fees: 3.6% + 30c per transaction
    const estimatedStripeFees = Math.floor((passGrossCents * 0.036) + (passCount * 30));
    const passNetCents = Math.max(0, passGrossCents - estimatedStripeFees);
    
    // 50% of Net Pass Revenue goes into the Watch Time Pool
    const autoPoolCents = Math.floor(passNetCents * 0.5);

    // 2. Fetch Creator Subs
    const { data: subs } = await supabaseAdmin
      .from("creator_subscriptions")
      .select("creator_id, price_cents")
      .in("status", ["active", "trialing"]);

    // 3. Fetch Merch Orders
    const { data: merch } = await supabaseAdmin
      .from("merch_orders")
      .select("creator_id, amount_cents")
      .in("status", ["paid", "shipped"]);

    // 4. Fetch Watch Time (Current Month)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: watchSessions } = await supabaseAdmin
      .from("video_watch_sessions")
      .select("creator_id, seconds_watched")
      .gte("created_at", startOfMonth.toISOString());

    // Aggregate Data
    const aggregated = new Map<number, { subCount: number; subGross: number; merchGross: number; watchSeconds: number }>();
    let totalPlatformWatchSeconds = 0;

    for (const s of subs || []) {
      const curr = aggregated.get(s.creator_id) || { subCount: 0, subGross: 0, merchGross: 0, watchSeconds: 0 };
      aggregated.set(s.creator_id, { ...curr, subCount: curr.subCount + 1, subGross: curr.subGross + (s.price_cents || 0) });
    }

    for (const m of merch || []) {
      const curr = aggregated.get(m.creator_id) || { subCount: 0, subGross: 0, merchGross: 0, watchSeconds: 0 };
      aggregated.set(m.creator_id, { ...curr, merchGross: curr.merchGross + (m.amount_cents || 0) });
    }

    for (const w of watchSessions || []) {
      const curr = aggregated.get(w.creator_id) || { subCount: 0, subGross: 0, merchGross: 0, watchSeconds: 0 };
      aggregated.set(w.creator_id, { ...curr, watchSeconds: curr.watchSeconds + w.seconds_watched });
      totalPlatformWatchSeconds += w.seconds_watched;
    }

    // Check who has already been paid
    const { data: recentPayouts } = await supabaseAdmin
      .from("podcaster_payouts")
      .select("creator_id")
      .gte("created_at", startOfMonth.toISOString());
    const paidThisMonth = new Set((recentPayouts || []).map((p) => p.creator_id));

    // Build Response
    const rows = Array.from(aggregated.entries()).map(([creatorId, data]) => {
      const creator = creatorMap.get(creatorId) || { name: "Unknown Creator", slug: "unknown" };
      
      const watchSharePct = totalPlatformWatchSeconds > 0 ? (data.watchSeconds / totalPlatformWatchSeconds) : 0;
      const watchEarningsCents = Math.floor(autoPoolCents * watchSharePct);

      // 90% split on subs and merch
      const subNet = Math.floor(data.subGross * 0.9);
      const merchNet = Math.floor(data.merchGross * 0.9);
      
      const totalNetCents = subNet + merchNet + watchEarningsCents;

      return {
        creator_id: creatorId,
        name: creator.name,
        slug: creator.slug,
        subscriber_count: data.subCount,
        sub_gross_cents: data.subGross,
        merch_gross_cents: data.merchGross,
        watch_share_pct: (watchSharePct * 100).toFixed(2),
        watch_earnings_cents: watchEarningsCents,
        net_cents: totalNetCents,
        paid_this_month: paidThisMonth.has(creatorId),
      };
    }).sort((a, b) => b.net_cents - a.net_cents);

    return NextResponse.json({ 
      rows,
      auto_pool_cents: autoPoolCents,
      pass_count: passCount
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { creator_id, subscriber_count, net_cents } = await req.json();
    if (!creator_id) return NextResponse.json({ error: "creator_id required" }, { status: 400 });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const { error: pErr } = await supabaseAdmin.from("podcaster_payouts").insert({
      creator_id,
      period_start: startOfMonth.toISOString(),
      period_end: endOfMonth.toISOString(),
      subscriber_count,
      gross_cents: net_cents, 
      platform_fee_cents: 0,
      net_payout_cents: net_cents,
      paid_at: now.toISOString(),
      payment_method: "manual",
      notes: `Payout for ${startOfMonth.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`,
    });
    if (pErr) throw pErr;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
