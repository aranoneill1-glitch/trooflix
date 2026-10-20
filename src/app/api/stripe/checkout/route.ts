import { NextResponse } from "next/server";
import Stripe from "stripe";
import { kv } from "@vercel/kv";
import { createClient as createServerClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const CREATORS_KEY = "trooflix:creators";

export async function POST(req: Request) {
  try {
    const { userId, type, creatorId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    if (!["pass", "podcaster", "creator"].includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    // === PASS or PODCASTER: fixed Stripe prices ===
    if (type === "pass" || type === "podcaster") {
      const priceId =
        type === "pass"
          ? process.env.STRIPE_PRO_PRICE_ID
          : process.env.STRIPE_PODCASTER_PRICE_ID;

      if (!priceId) {
        return NextResponse.json({ error: `Price ID missing for ${type}` }, { status: 500 });
      }

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("stripe_customer_id, display_name, username")
        .eq("user_id", userId)
        .maybeSingle();

      let customerId = profile?.stripe_customer_id;
      if (!customerId) {
        const customer = await stripe.customers.create({
          metadata: { userId },
          name: profile?.display_name || profile?.username || undefined,
        });
        customerId = customer.id;
        await supabaseAdmin
          .from("profiles")
          .update({ stripe_customer_id: customerId })
          .eq("user_id", userId);
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${process.env.NEXT_PUBLIC_URL || "https://www.trooflixtv.com"}/profile?upgraded=${type}`,
        cancel_url: `${process.env.NEXT_PUBLIC_URL || "https://www.trooflixtv.com"}/upgrade`,
        client_reference_id: userId,
        subscription_data: {
          metadata: { userId, type: type === "pass" ? "trooflix_pass" : "podcaster" },
        },
        allow_promotion_codes: true,
      });

      return NextResponse.json({ url: session.url });
    }

    // === CREATOR: dynamic price (created on-demand) ===
    if (type === "creator") {
      if (!creatorId) {
        return NextResponse.json({ error: "creatorId required for creator type" }, { status: 400 });
      }

      // 1. Look up the creator's premium settings
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("premium_enabled, premium_price_cents")
        .eq("user_id", creatorId)
        .maybeSingle();

      if (!profile?.premium_enabled || !profile?.premium_price_cents) {
        return NextResponse.json(
          { error: "This podcaster has not enabled premium subscriptions" },
          { status: 404 }
        );
      }

      const priceCents = profile.premium_price_cents;

      // 2. Find the creator record in KV (for the name)
      const creators = (await kv.get<any[]>(CREATORS_KEY)) || [];
      const creator = creators.find((c: any) => String(c.ownerUserId) === String(creatorId));
      if (!creator) {
        return NextResponse.json({ error: "Creator not found" }, { status: 404 });
      }

      // 3. Create or reuse a Stripe product+price for this creator
      // Cache on the creator record to avoid duplication
      let priceId = creator.stripe_premium_price_id as string | undefined;

      if (!priceId) {
        // Create a new Stripe product for this podcaster's premium tier
        const product = await stripe.products.create({
          name: `${creator.name} — Premium`,
          description: `Subscribe to ${creator.name} on Trooflix`,
          metadata: {
            creatorId: String(creator.id),
            trooflix_type: "creator_premium",
          },
        });

        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: priceCents,
          currency: "usd",
          recurring: { interval: "month" },
          metadata: {
            creatorId: String(creator.id),
            trooflix_type: "creator_premium",
          },
        });

        priceId = price.id;

        // Cache on creator record so we don't recreate every checkout
        const idx = creators.findIndex((c: any) => c.id === creator.id);
        creators[idx] = { ...creators[idx], stripe_premium_price_id: priceId };
        await kv.set(CREATORS_KEY, creators);
      }

      // 4. Look up or create customer
      const { data: userProfile } = await supabaseAdmin
        .from("profiles")
        .select("stripe_customer_id, display_name, username")
        .eq("user_id", userId)
        .maybeSingle();

      let customerId = userProfile?.stripe_customer_id;
      if (!customerId) {
        const customer = await stripe.customers.create({
          metadata: { userId },
          name: userProfile?.display_name || userProfile?.username || undefined,
        });
        customerId = customer.id;
        await supabaseAdmin
          .from("profiles")
          .update({ stripe_customer_id: customerId })
          .eq("user_id", userId);
      }

      // 5. Create the checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${process.env.NEXT_PUBLIC_URL || "https://www.trooflixtv.com"}/podcaster/${creator.slug}?subscribed=1`,
        cancel_url: `${process.env.NEXT_PUBLIC_URL || "https://www.trooflixtv.com"}/podcaster/${creator.slug}`,
        client_reference_id: userId,
        subscription_data: {
          metadata: {
            userId,
            type: "creator",
            creatorId: String(creator.id),
            creatorOwnerUserId: String(creatorId),
          },
        },
        allow_promotion_codes: true,
      });

      return NextResponse.json({ url: session.url, priceId });
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  } catch (e: any) {
    console.error("Stripe checkout error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
