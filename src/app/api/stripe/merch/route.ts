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
    const { userId, items } = await req.json();
    if (!userId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Missing data or empty cart" }, { status: 400 });
    }

    const productIds = items.map((i: any) => i.id);
    const { data: products } = await supabaseAdmin.from("products").select("*").in("id", productIds);

    if (!products || products.length === 0) return NextResponse.json({ error: "Products not found" }, { status: 404 });

    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
    let userEmail = userData?.user?.email;
    
    // Only pass the email to Stripe if it looks valid (contains @ and .)
    if (userEmail && (!userEmail.includes("@") || !userEmail.includes("."))) {
      userEmail = undefined;
    }

    const baseUrl = process.env.NEXT_PUBLIC_URL || "https://trooflixtv.com";

    const lineItems = items.map((cartItem: any) => {
      const dbProduct = products.find((p: any) => p.id === cartItem.id);
      if (!dbProduct) return null;
      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: dbProduct.name,
            description: dbProduct.description || undefined,
            images: dbProduct.image_url ? [dbProduct.image_url] : undefined,
          },
          unit_amount: dbProduct.price_cents,
        },
        quantity: cartItem.quantity,
      };
    }).filter(Boolean) as Stripe.Checkout.SessionCreateParams.LineItem[];

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: userEmail,
      line_items: lineItems,
      payment_intent_data: {
        description: `Trooflix Merch Order`,
      },
      shipping_address_collection: {
        allowed_countries: ["US", "CA", "GB", "AU", "IE", "NZ"],
      },
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/merchandise`,
      client_reference_id: userId,
      metadata: {
        type: "merch_cart",
        userId: userId,
        items: JSON.stringify(items),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error("Stripe merch error:", e);
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
