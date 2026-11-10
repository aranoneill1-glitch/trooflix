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
    const { userId, type, creatorId, coins } = await req.json();

    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
    if (!["pass", "creator", "creator"].includes(type)) return NextResponse.json({ error: "Invalid type" }, { status: 400 });

    // === PASS or creator ===
    if (type === "pass" || type === "creator") {
      const isPlus = type === "pass";
      const priceCents = isPlus ? 399 : 999;
      const productName = isPlus ? "Trooflix Plus" : "Trooflix Creator";
      const productDescription = isPlus
        ? "Unlimited long-form viewing, live streams, unlimited-length shorts, red glass tick."
        : "Everything in Plus, long-form uploads, live broadcast, full Creator Dashboard, gold tick.";

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
        await supabaseAdmin.from("profiles").update({ stripe_customer_id: customerId }).eq("user_id", userId);
      }

      const coinCount = Number(coins) || 0;

      const sessionParams: any = {
        customer: customerId,
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: priceCents,
              recurring: { interval: "month" },
              product_data: {
                name: productName,
                description: productDescription,
              },
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${process.env.NEXT_PUBLIC_URL || "https://www.trooflixtv.com"}/creator-dashboard?upgraded=1`,
        cancel_url: `${process.env.NEXT_PUBLIC_URL || "https://www.trooflixtv.com"}/upgrade`,
        client_reference_id: userId,
        metadata: {
          userId,
          type: type === "pass" ? "trooflix_pass" : "creator",
          signupCoins: String(coinCount),
        },
        subscription_data: {
          metadata: { userId, type: type === "pass" ? "trooflix_pass" : "creator", signupCoins: String(coinCount) },
        },
      };

      if (coinCount > 0) {
        const coinPrice = await stripe.prices.create({
          currency: "usd",
          unit_amount: coinCount * 100,
          product_data: { name: `${coinCount} TrooCoins` },
        });
        sessionParams.subscription_data.add_invoice_items = [{ price: coinPrice.id }];
      }

      const session = await stripe.checkout.sessions.create(sessionParams);
      return NextResponse.json({ url: session.url });
    }

    // === CREATOR ===
    if (type === "creator") {
      if (!creatorId) {
        return NextResponse.json({ error: "creatorId required for creator type" }, { status: 400 });
      }

      let dbCreatorId = creatorId;
      if (!String(creatorId).includes("-")) {
        const creatorsList = (await kv.get<any[]>(CREATORS_KEY)) || [];
        const c = creatorsList.find((x: any) => String(x.id) === String(creatorId));
        if (c?.ownerUserId) dbCreatorId = c.ownerUserId;
      }

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("premium_enabled, premium_price_cents")
        .eq("user_id", dbCreatorId)
        .maybeSingle();

      if (!profile?.premium_enabled || !profile?.premium_price_cents) {
        return NextResponse.json(
          { error: "This creator has not enabled premium subscriptions" },
          { status: 404 }
        );
      }

      const priceCents = profile.premium_price_cents;

      const creators = (await kv.get<any[]>(CREATORS_KEY)) || [];
      const creator = creators.find((c: any) => String(c.ownerUserId) === String(dbCreatorId));
      if (!creator) {
        return NextResponse.json({ error: "Creator not found" }, { status: 404 });
      }

      let priceId = creator.stripe_premium_price_id as string | undefined;

      if (!priceId) {
        const product = await stripe.products.create({
          name: `${creator.name} — Premium`,
          description: `Subscribe to ${creator.name} on Trooflix`,
          metadata: { creatorId: String(creator.id), trooflix_type: "creator_premium" },
        });

        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: priceCents,
          currency: "usd",
          recurring: { interval: "month" },
          metadata: { creatorId: String(creator.id), trooflix_type: "creator_premium" },
        });

        priceId = price.id;

        const idx = creators.findIndex((c: any) => c.id === creator.id);
        creators[idx] = { ...creators[idx], stripe_premium_price_id: priceId };
        await kv.set(CREATORS_KEY, creators);
      }

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
        await supabaseAdmin.from("profiles").update({ stripe_customer_id: customerId }).eq("user_id", userId);
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${process.env.NEXT_PUBLIC_URL || "https://www.trooflixtv.com"}/profile/${creator.slug}?subscribed=1`,
        cancel_url: `${process.env.NEXT_PUBLIC_URL || "https://www.trooflixtv.com"}/profile/${creator.slug}`,
        client_reference_id: userId,
        subscription_data: {
          metadata: {
            userId,
            type: "creator",
            creatorId: String(creator.id),
            creatorOwnerUserId: String(dbCreatorId),
          },
        },
      });

      return NextResponse.json({ url: session.url, priceId });
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  } catch (e: any) {
    console.error("Stripe checkout error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
