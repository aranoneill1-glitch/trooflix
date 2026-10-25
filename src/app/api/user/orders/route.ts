import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";
import { kv } from "@vercel/kv";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ orders: [] });

  try {
    const { data: orders } = await supabaseAdmin
      .from("merch_orders")
      .select("*")
      .eq("buyer_user_id", userId)
      .order("created_at", { ascending: false });

    if (!orders || orders.length === 0) return NextResponse.json({ orders: [] });

    const productIds = [...new Set(orders.map(o => o.product_id))];
    const { data: products } = await supabaseAdmin
      .from("products")
      .select("*")
      .in("id", productIds);
    const productMap = new Map(products?.map(p => [p.id, p]) || []);

    const creators = (await kv.get<any[]>("trooflix:creators")) || [];
    const creatorMap = new Map(creators.map(c => [Number(c.id), c.name]));

    const enrichedOrders = orders.map(o => ({
      ...o,
      order_code: `TRF-${String(o.id).padStart(6, '0')}`,
      product: productMap.get(o.product_id) || null,
      creator_name: creatorMap.get(o.creator_id) || "Creator"
    }));

    return NextResponse.json({ orders: enrichedOrders });
  } catch (e) {
    return NextResponse.json({ orders: [] });
  }
}
