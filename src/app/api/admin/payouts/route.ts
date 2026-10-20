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

// GET /api/admin/payouts — list all creators and what they are owed
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const creators = (await kv.get<any[]>(CREATORS_KEY)) || [];
    const creatorMap = new Map(creators.map((c) => [Number(c.id), c]));

    // 1. Get all active subscriptions
    const { data: subs, error: sErr } = await supabaseAdmin
      .from("creator_subscriptions")
      .select("creator_id, price_cents")
      .in("status", ["active", "trialing"]);
    if (sErr) throw sErr;

    // 2. Group by creator
    const owed = new Map<number, { count: number; gross_cents: number }>();
    for (const s of subs || []) {
      const current = owed.get(s.creator_id) || { count: 0, gross_cents: 0 };
      owed.set(s.creator_id, {
        count: current.count + 1,
        gross_cents: current.gross_cents + (s.price_cents || 0),
      });
    }

    // 3. Check who has already been paid this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: recentPayouts } = await supabaseAdmin
      .from("podcaster_payouts")
      .select("creator_id")
      .gte("created_at", startOfMonth.toISOString());

    const paidThisMonth = new Set((recentPayouts || []).map((p) => p.creator_id));

    // 4. Build response
    const rows = Array.from(owed.entries()).map(([creatorId, data]) => {
      const creator = creatorMap.get(creatorId) || { name: "Unknown Creator", slug: "unknown" };
      const net = Math.floor(data.gross_cents * 0.9);
      const fee = data.gross_cents - net;
      return {
        creator_id: creatorId,
        name: creator.name,
        slug: creator.slug,
        subscriber_count: data.count,
        gross_cents: data.gross_cents,
        fee_cents: fee,
        net_cents: net,
        paid_this_month: paidThisMonth.has(creatorId),
      };
    }).sort((a, b) => b.gross_cents - a.gross_cents);

    return NextResponse.json({ rows });
  } catch (e: any) {
    console.error("GET admin payouts error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/admin/payouts — mark a creator as paid
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { creator_id, subscriber_count, gross_cents, fee_cents, net_cents } = await req.json();
    if (!creator_id) return NextResponse.json({ error: "creator_id required" }, { status: 400 });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Insert payout record
    const { error: pErr } = await supabaseAdmin.from("podcaster_payouts").insert({
      creator_id,
      period_start: startOfMonth.toISOString(),
      period_end: endOfMonth.toISOString(),
      subscriber_count,
      gross_cents,
      platform_fee_cents: fee_cents,
      net_payout_cents: net_cents,
      paid_at: now.toISOString(),
      payment_method: "manual",
      notes: `Payout for ${startOfMonth.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`,
    });
    if (pErr) throw pErr;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("POST admin payouts error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
