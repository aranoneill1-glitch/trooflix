import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";
import { kv } from "@vercel/kv";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET() {
  try {
    // 1. Fetch all orders
    const { data: orders, error } = await supabaseAdmin
      .from("merch_orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!orders || orders.length === 0) return NextResponse.json({ orders: [] });

    // 2. Fetch products
    const productIds = [...new Set(orders.map(o => o.product_id))];
    const { data: products } = await supabaseAdmin
      .from("products")
      .select("*")
      .in("id", productIds);
    const productMap = new Map(products?.map(p => [p.id, p]) || []);

    // 3. Fetch creator names from KV
    const creators = (await kv.get<any[]>("trooflix:creators")) || [];
    const creatorMap = new Map(creators.map(c => [Number(c.id), c.name]));

    // 4. Combine and calculate financials
    const enrichedOrders = orders.map(o => {
      const gross = o.amount_cents;
      const platformFee = Math.round(gross * 0.10); // 10%
      const creatorPayout = gross - platformFee;    // 90%

      return {
        ...o,
        order_code: `TRF-${String(o.id).padStart(6, '0')}`,
        product: productMap.get(o.product_id) || null,
        creator_name: creatorMap.get(o.creator_id) || `Creator #${o.creator_id}`,
        platform_fee_cents: platformFee,
        creator_payout_cents: creatorPayout,
      };
    });

    return NextResponse.json({ orders: enrichedOrders });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
