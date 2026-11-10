import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient as createServerClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const { userId, type, coins } = await req.json();

    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
    if (!["pass", "podcaster"].includes(type)) return NextResponse.json({ error: "Invalid type" }, { status: 400 });

    const isPlus = type === "pass";
    const priceCents = isPlus ? 399 : 999;
    const productName = isPlus ? "Trooflix Plus" : "Trooflix Creator";
    const productDescription = isPlus
      ? "Unlimited long-form viewing, live streams, unlimited-length reels, red glass tick."
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
            product_data: { name: productName, description: productDescription },
          },
          quantity: 1,
        },
        ...(coinCount > 0 ? [{
          price_data: {
            currency: "usd",
            unit_amount: coinCount * 100,
            product_data: {
              name: `${coinCount} TrooCoins`,
              description: "Pre-load your TrooBank for tipping and merch",
            },
          },
          quantity: 1,
        }] : []),
      ],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_URL || "https://www.trooflixtv.com"}/creator-dashboard?upgraded=${type}`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL || "https://www.trooflixtv.com"}/upgrade`,
      client_reference_id: userId,
      metadata: {
        userId,
        type: type === "pass" ? "trooflix_pass" : "podcaster",
        signupCoins: String(coinCount),
      },
      subscription_data: {
        metadata: { userId, type: type === "pass" ? "trooflix_pass" : "podcaster" },
      },
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error("Stripe checkout error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
