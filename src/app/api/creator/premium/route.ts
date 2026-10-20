import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";
import { kv } from "@vercel/kv";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const CREATORS_KEY = "trooflix:creators";

async function getCreatorForUser(userId: string) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("username")
    .eq("user_id", userId)
    .maybeSingle();

  const creators = (await kv.get<any[]>(CREATORS_KEY)) || [];
  
  let creator = creators.find((c: any) => String(c.ownerUserId) === String(userId));
  
  if (!creator && profile?.username) {
    creator = creators.find((c: any) => String(c.slug).toLowerCase() === String(profile.username).toLowerCase());
  }
  
  if (!creator && userId === "ed865789-f0d3-4d20-b9ce-daabb9b74825") {
    creator = creators.find((c: any) => String(c.id) === "261161250058451") || {
      id: 261161250058451,
      name: "SSECA",
      slug: "ssecommodityacadem"
    };
  }

  return creator;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");
    if (!userId) return NextResponse.json({ error: "user_id required" }, { status: 400 });

    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("premium_enabled, premium_price_cents")
      .eq("user_id", userId)
      .maybeSingle();
    if (pErr) throw pErr;

    const creator = await getCreatorForUser(userId);
    if (!creator) {
      return NextResponse.json({ error: "Creator profile not found" }, { status: 404 });
    }

    const { data: subs, error: sErr } = await supabaseAdmin
      .from("creator_subscriptions")
      .select("price_cents, status")
      .eq("creator_id", Number(creator.id))
      .in("status", ["active", "trialing"]);
    if (sErr) throw sErr;

    const activeCount = subs?.length ?? 0;
    const monthlyGrossCents = (subs ?? []).reduce((sum, s) => sum + (s.price_cents || 0), 0);
    const monthlyNetCents = Math.floor(monthlyGrossCents * 0.9);

    return NextResponse.json({
      creator: { id: creator.id, name: creator.name, slug: creator.slug },
      premium: {
        enabled: !!profile?.premium_enabled,
        price_cents: profile?.premium_price_cents ?? null,
      },
      stats: {
        active_subscribers: activeCount,
        monthly_gross_cents: monthlyGrossCents,
        monthly_net_cents: monthlyNetCents,
      },
    });
  } catch (e: any) {
    console.error("GET creator premium error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId, enabled, price_cents } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const priceCents = price_cents === null || price_cents === undefined
      ? null
      : Math.round(Number(price_cents));

    if (enabled) {
      if (!priceCents || !Number.isFinite(priceCents) || priceCents < 499) {
        return NextResponse.json(
          { error: "Price must be at least $4.99 (to cover payment processing)" },
          { status: 400 }
        );
      }
      if (priceCents > 100000) {
        return NextResponse.json(
          { error: "Price too high (max $1,000/mo)" },
          { status: 400 }
        );
      }
    }

    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("premium_price_cents")
      .eq("user_id", userId)
      .maybeSingle();

    const priceChanged = (existing?.premium_price_cents ?? null) !== priceCents;

    const { error: upErr } = await supabaseAdmin
      .from("profiles")
      .update({
        premium_enabled: !!enabled,
        premium_price_cents: enabled ? priceCents : null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
    if (upErr) throw upErr;

    if (priceChanged) {
      const creator = await getCreatorForUser(userId);
      if (creator) {
        const creators = (await kv.get<any[]>(CREATORS_KEY)) || [];
        const idx = creators.findIndex((c: any) => String(c.id) === String(creator.id));
        if (idx !== -1) {
          const updated = { ...creators[idx] };
          delete updated.stripe_premium_price_id;
          creators[idx] = updated;
          await kv.set(CREATORS_KEY, creators);
          console.log(`[creator-premium] cleared stripe_premium_price_id for creator=${creator.id}`);
        }
      }
    }

    return NextResponse.json({ ok: true, price_changed: priceChanged });
  } catch (e: any) {
    console.error("POST creator premium error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
