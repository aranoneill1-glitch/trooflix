import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient as createServerClient } from "@supabase/supabase-js";
import { kv } from "@vercel/kv";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const CREATORS_KEY = "trooflix:creators";

export async function POST(req: Request) {
  try {
    const { userId, creatorId } = await req.json();
    if (!userId || !creatorId) return NextResponse.json({ error: "Missing data" }, { status: 400 });

    // 1. Get creator from KV
    const creators = (await kv.get<any[]>(CREATORS_KEY)) || [];
    let creator = creators.find((c: any) => String(c.id) === String(creatorId));

    // AUTO-HEAL: If this is SSECA and the ownerUserId is missing, fix it permanently in KV!
    if (creator && !creator.ownerUserId && String(creator.id) === "261161250058451") {
      creator.ownerUserId = "ed865789-f0d3-4d20-b9ce-daabb9b74825";
      const idx = creators.findIndex((c: any) => String(c.id) === String(creator.id));
      if (idx !== -1) {
        creators[idx] = creator;
        await kv.set(CREATORS_KEY, creators);
        console.log("Auto-healed SSECA ownerUserId in Vercel KV");
      }
    }

    if (!creator) return NextResponse.json({ error: "Creator not found" }, { status: 404 });

    // 2. Find the profile safely
    let profile = null;
    if (creator.ownerUserId) {
       const { data } = await supabaseAdmin.from("profiles").select("*").eq("user_id", creator.ownerUserId).maybeSingle();
       profile = data;
    }
    if (!profile && creator.slug) {
       const { data } = await supabaseAdmin.from("profiles").select("*").eq("username", creator.slug).maybeSingle();
       profile = data;
    }

    if (!profile) return NextResponse.json({ error: "Creator profile missing in Supabase" }, { status: 404 });
    if (!profile.premium_enabled || !profile.premium_price_cents) {
      return NextResponse.json({ error: "Creator has not enabled premium yet" }, { status: 400 });
    }

    // 3. Create/reuse Stripe Price
    let priceId = creator.stripe_premium_price_id;
    if (!priceId) {
      const product = await stripe.products.create({
        name: `${creator.name} — Premium`,
        metadata: { creatorId: String(creator.id) },
      });
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: profile.premium_price_cents,
        currency: "usd",
        recurring: { interval: "month" },
      });
      priceId = price.id;
      
      const idx = creators.findIndex((c: any) => String(c.id) === String(creator.id));
      if (idx !== -1) {
        creators[idx] = { ...creators[idx], stripe_premium_price_id: priceId };
        await kv.set(CREATORS_KEY, creators);
      }
    }

    // 4. Customer
    const { data: userProfile } = await supabaseAdmin.from("profiles").select("stripe_customer_id").eq("user_id", userId).maybeSingle();
    let customerId = userProfile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ metadata: { userId } });
      customerId = customer.id;
      await supabaseAdmin.from("profiles").update({ stripe_customer_id: customerId }).eq("user_id", userId);
    }

    // 5. Checkout
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_URL || "https://www.trooflixtv.com"}/podcaster/${creator.slug}?subscribed=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL || "https://www.trooflixtv.com"}/podcaster/${creator.slug}`,
      subscription_data: {
        metadata: { userId, creatorId: String(creator.id), type: "creator" },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error("Stripe error:", e);
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
