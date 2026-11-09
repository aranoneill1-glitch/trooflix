import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: Request) {
  try {
    const { userId, productId, shipping } = await req.json();
    if (!userId || !productId || !shipping) return NextResponse.json({ error: "Missing data" }, { status: 400 });

    // 1. Fetch product and check stock
    const { data: product } = await supabaseAdmin.from("products").select("*").eq("id", productId).single();
    if (!product || product.inventory_count < 1) return NextResponse.json({ error: "Out of stock." }, { status: 400 });

    const priceCents = product.price_cents;
    const priceCoins = priceCents / 100;
    const creatorPayoutCoins = priceCoins * 0.9; // Creator gets 90%

    // 2. Check buyer wallet
    const { data: buyerWallet } = await supabaseAdmin.from("wallets").select("balance").eq("user_id", userId).single();
    if (!buyerWallet || buyerWallet.balance < priceCoins) return NextResponse.json({ error: "Insufficient TrooCoins." }, { status: 400 });

    // 3. Deduct from buyer
    await supabaseAdmin.from("wallets").update({ balance: buyerWallet.balance - priceCoins }).eq("user_id", userId);

    // 4. Pay creator
    const { data: creatorWallet } = await supabaseAdmin.from("wallets").select("balance").eq("user_id", product.creator_id).maybeSingle();
    if (creatorWallet) {
      await supabaseAdmin.from("wallets").update({ balance: Number(creatorWallet.balance) + creatorPayoutCoins }).eq("user_id", product.creator_id);
    } else {
      await supabaseAdmin.from("wallets").insert({ user_id: product.creator_id, balance: creatorPayoutCoins });
    }

    // 5. Log transactions
    const orderCode = "TRF-C" + Math.floor(100000 + Math.random() * 900000);
    await supabaseAdmin.from("transactions").insert([
      { sender_id: userId, receiver_id: null, amount: priceCoins, type: "merch_buy", description: `Bought ${product.name} with Coins` },
      { sender_id: null, receiver_id: product.creator_id, amount: creatorPayoutCoins, type: "merch_sale", description: `Merch sale: ${product.name} (Order ${orderCode})` }
    ]);

    // 6. Reduce inventory & create order
    await supabaseAdmin.from("products").update({ inventory_count: product.inventory_count - 1 }).eq("id", productId);
    await supabaseAdmin.from("merch_orders").insert({
      buyer_user_id: userId, creator_id: product.creator_id, product_id: productId,
      stripe_session_id: "COINS_" + Date.now(), amount_cents: priceCents, status: "paid", order_code: orderCode,
      shipping_name: shipping.name, shipping_address: shipping.address, shipping_city: shipping.city,
      shipping_postal_code: shipping.postalCode, shipping_country: shipping.country,
    });

    return NextResponse.json({ success: true, orderCode });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}