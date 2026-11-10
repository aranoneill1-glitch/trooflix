import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function getCreatorForUser(userId: string) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("user_id, display_name, username, avatar_url, bio, tier, is_verified, verification_tick, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (!profile || profile.tier !== "creator") return null;

  const uuidHex = String(profile.user_id).replace(/-/g, "").slice(0, 12);
  const numericId = parseInt(uuidHex, 16) || 0;

  return {
    id: numericId,
    user_id: profile.user_id,
    name: profile.display_name || profile.username || "Creator",
    slug: profile.username || String(profile.user_id).slice(0, 8),
    photoUrl: profile.avatar_url || "",
    description: profile.bio || "",
    isVerified: profile.is_verified ?? true,
    verification_tick: profile.verification_tick || "creator_gold",
    ownerUserId: profile.user_id,
    createdAt: profile.updated_at,
  };
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

    const { error: upErr } = await supabaseAdmin
      .from("profiles")
      .update({
        premium_enabled: !!enabled,
        premium_price_cents: enabled ? priceCents : null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
    if (upErr) throw upErr;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("POST creator premium error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
