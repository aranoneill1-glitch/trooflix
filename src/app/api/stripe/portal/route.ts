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
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No subscription found on this account" },
        { status: 404 }
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_URL || "https://www.trooflixtv.com"}/profile`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error("Stripe portal error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
