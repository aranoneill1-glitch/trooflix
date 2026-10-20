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
    const { userId, tier } = await req.json();

    if (!userId || !["pro", "podcaster"].includes(tier)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const priceId =
      tier === "pro"
        ? process.env.STRIPE_PRO_PRICE_ID
        : process.env.STRIPE_PODCASTER_PRICE_ID;

    if (!priceId) {
      return NextResponse.json({ error: "Price ID missing" }, { status: 500 });
    }

    // Look up or create Stripe customer
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
      success_url: `${process.env.NEXT_PUBLIC_URL}/profile?upgraded=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/upgrade`,
      client_reference_id: userId,
      subscription_data: { metadata: { userId, tier } },
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error("Stripe checkout error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
