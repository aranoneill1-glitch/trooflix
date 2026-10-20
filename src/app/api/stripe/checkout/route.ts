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
    const { userId, type } = await req.json();

    if (!userId || !["pass", "podcaster"].includes(type)) {
      return NextResponse.json(
        { error: "userId and type ('pass' or 'podcaster') required" },
        { status: 400 }
      );
    }

    const priceId =
      type === "pass"
        ? process.env.STRIPE_PRO_PRICE_ID
        : process.env.STRIPE_PODCASTER_PRICE_ID;

    if (!priceId) {
      return NextResponse.json(
        { error: `Price ID missing for ${type}` },
        { status: 500 }
      );
    }

    // Look up profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id, display_name, username, has_pass, podcaster_subscription_status")
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

    // If upgrading Pass → Podcaster, we'll cancel the Pass sub after successful checkout
    // (via webhook: customer.subscription.deleted for the old Pass sub)

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
  } catch (e: any) {
    console.error("Stripe checkout error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
