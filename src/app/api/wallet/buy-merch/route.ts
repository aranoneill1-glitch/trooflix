import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { kv } from "@vercel/kv";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const CREATORS_KEY = "trooflix:creators";

export async function POST(req: Request) {
  try {
    const { userId, productId, shipping } = await req.json();
    if (!userId || !productId || !shipping) return NextResponse.json({ error: "Missing data" }, { status: 400 });

    const { data: product } = await supabaseAdmin.from("products").select("*").eq("id", productId).single();
    if (!product || product.inventory_count < 1) return NextResponse.json({ error: "Out of stock." }, { status: 400 });

    const priceCents = product.price_cents;
    const priceCoins = priceCents / 100;
    const creatorPayoutCoins = priceCoins * 0.9;

    // Resolve creator's UUID from KV
    const creators = (await kv.get<any[]>(CREATORS_KEY)) || [];
    const creator = creators.find((c: any) => Number(c.id) === Number(product.creator_id));
    const creatorUserId = creator?.ownerUserId || creator?.user_id || null;
    if (!creatorUserId) return NextResponse.json({ error: "Creator profile not found." }, { status: 404 });

    const { data: buyerWallet } = await supabaseAdmin.from("wallets").select("balance").eq("user_id", userId).single();
    if (!buyerWallet || buyerWallet.balance < priceCoins) return NextResponse.json({ error: "Insufficient TrooCoins." }, { status: 400 });

    await supabaseAdmin.from("wallets").update({ balance: buyerWallet.balance - priceCoins }).eq("user_id", userId);

    const orderCode = "TRF-C" + Math.floor(100000 + Math.random() * 900000);

    const { data: orderData } = await supabaseAdmin.from("merch_orders").insert({
      buyer_user_id: userId,
      creator_id: product.creator_id,
      product_id: productId,
      stripe_session_id: "COINS_" + Date.now(),
      amount_cents: priceCents,
      status: "paid",
      order_code: orderCode,
      shipping_name: shipping.name,
      shipping_address: shipping.address,
      shipping_city: shipping.city,
      shipping_postal_code: shipping.postalCode,
      shipping_country: shipping.country,
    }).select("id").single();

    await supabaseAdmin.from("transactions").insert([
      { sender_id: userId, receiver_id: null, amount: priceCoins, type: "merch_buy", status: "completed", description: `Bought ${product.name} with Coins` },
      { sender_id: null, receiver_id: creatorUserId, amount: creatorPayoutCoins, type: "merch_sale", status: "pending", order_id: orderData?.id, description: `Merch sale: ${product.name} (Order ${orderCode})` },
    ]);

    await supabaseAdmin.from("products").update({ inventory_count: product.inventory_count - 1 }).eq("id", productId);

    // Notify creator
    try {
      const { data: buyerProfile } = await supabaseAdmin.from("profiles").select("display_name, username").eq("user_id", userId).maybeSingle();
      const buyerName = buyerProfile?.display_name || buyerProfile?.username || "Someone";
      await supabaseAdmin.from("notifications").insert({
        user_id: creatorUserId,
        actor_id: userId,
        type: "purchase",
        title: "New order received",
        message: `${buyerName} bought ${product.name} — Order ${orderCode}. Add tracking to release funds.`,
      });
    } catch (e) { /* notification is best-effort */ }

    return NextResponse.json({ success: true, orderCode });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
