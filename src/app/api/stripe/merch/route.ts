import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient as createServerClient } from "@supabase/supabase-js";
import { assertSelf, requireUser } from "@/lib/api-auth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const { userId: claimedUserId, items } = await req.json();
    const auth = await requireUser();
    if (auth instanceof Response) return auth;
    const mismatch = assertSelf(auth.user, claimedUserId);
    if (mismatch) return mismatch;

    if (!Array.isArray(items) || items.length === 0 || items.length > 10) {
      return NextResponse.json({ error: "Missing data or empty cart" }, { status: 400 });
    }

    const quantities = new Map<number, number>();
    for (const item of items) {
      const id = Number(item?.id);
      const quantity = Number(item?.quantity);
      if (!Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(quantity) || quantity <= 0 || quantity > 20) {
        return NextResponse.json({ error: "Invalid merchandise quantity or product" }, { status: 400 });
      }
      const total = (quantities.get(id) || 0) + quantity;
      if (total > 20) return NextResponse.json({ error: "Maximum quantity per product is 20" }, { status: 400 });
      quantities.set(id, total);
    }

    const normalizedItems = Array.from(quantities, ([id, quantity]) => ({ id, quantity }));
    const productIds = normalizedItems.map((item) => item.id);
    const { data: products, error: productsError } = await supabaseAdmin.from("products").select("*").in("id", productIds);

    if (productsError) throw productsError;
    if (!products || products.length === 0) return NextResponse.json({ error: "Products not found" }, { status: 404 });
    if (products.length !== productIds.length) return NextResponse.json({ error: "One or more products were not found" }, { status: 404 });

    for (const product of products) {
      const quantity = quantities.get(Number(product.id)) || 0;
      if (!Number.isSafeInteger(product.price_cents) || product.price_cents <= 0) {
        return NextResponse.json({ error: "Invalid product price" }, { status: 400 });
      }
      if (product.inventory_count != null && quantity > Number(product.inventory_count)) {
        return NextResponse.json({ error: `Insufficient inventory for ${product.name}` }, { status: 400 });
      }
    }

    let userEmail = auth.user.email;
    
    // Only pass the email to Stripe if it looks valid (contains @ and .)
    if (userEmail && (!userEmail.includes("@") || !userEmail.includes("."))) {
      userEmail = undefined;
    }

    const baseUrl = process.env.NEXT_PUBLIC_URL || "https://trooflixtv.com";

    const lineItems = normalizedItems.map((cartItem) => {
      const dbProduct = products.find((p: any) => p.id === cartItem.id);
      if (!dbProduct) throw new Error("Product not found");
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
    }) as Stripe.Checkout.SessionCreateParams.LineItem[];

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
      client_reference_id: auth.user.id,
      metadata: {
        type: "merch_cart",
        userId: auth.user.id,
        items: JSON.stringify(normalizedItems),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error("Stripe merch error:", e);
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
