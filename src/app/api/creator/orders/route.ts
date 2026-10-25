import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const creatorId = searchParams.get("creatorId");
  if (!creatorId) return NextResponse.json({ orders: [] });

  try {
    const { data: orders, error } = await supabaseAdmin
      .from("merch_orders")
      .select("*")
      .eq("creator_id", Number(creatorId))
      .order("created_at", { ascending: false });

    if (error) throw error;

    const productIds = [...new Set(orders?.map(o => o.product_id))];
    const { data: products } = await supabaseAdmin
      .from("products")
      .select("*")
      .in("id", productIds);

    const productsMap = new Map(products?.map(p => [p.id, p]) || []);

    const enrichedOrders = orders?.map(o => ({
      ...o,
      order_code: `TRF-${String(o.id).padStart(6, '0')}`,
      product: productsMap.get(o.product_id) || null
    }));

    return NextResponse.json({ orders: enrichedOrders || [] });
  } catch (e) {
    return NextResponse.json({ orders: [] });
  }
}

export async function PATCH(req: Request) {
  try {
    const { orderId, status, tracking_number } = await req.json();
    if (!orderId || !status) return NextResponse.json({ error: "Missing data" }, { status: 400 });

    const { error } = await supabaseAdmin
      .from("merch_orders")
      .update({ status, tracking_number })
      .eq("id", Number(orderId));

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
