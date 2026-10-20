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
    const { userId, productId, creatorSlug } = await req.json();
    if (!userId || !productId) return NextResponse.json({ error: "Missing data" }, { status: 400 });

    const { data: product } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("id", productId)
      .maybeSingle();

    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: product.name,
              description: product.description || undefined,
              images: product.image_url ? [product.image_url] : undefined,
            },
            unit_amount: product.price_cents,
          },
          quantity: 1,
        },
      ],
      shipping_address_collection: {
        allowed_countries: ["US", "CA", "GB", "AU", "IE", "NZ"],
      },
      success_url: `${process.env.NEXT_PUBLIC_URL || "https://www.trooflixtv.com"}/podcaster/${creatorSlug}?purchased=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL || "https://www.trooflixtv.com"}/podcaster/${creatorSlug}`,
      client_reference_id: userId,
      metadata: {
        type: "merch",
        userId,
        creatorId: String(product.creator_id),
        productId: String(product.id),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error("Stripe merch error:", e);
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
