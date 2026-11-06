import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const creatorId = searchParams.get("creatorId");
    if (!creatorId) return NextResponse.json({ orders: [] });

    // 1. Fetch the orders for this creator
    const { data: orders, error } = await supabaseAdmin
      .from("merch_orders")
      .select("*")
      .eq("creator_id", Number(creatorId))
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!orders || orders.length === 0) return NextResponse.json({ orders: [] });

    // 2. Fetch the products to show the item names/images
    const productIds = [...new Set(orders.map(o => o.product_id))];
    const { data: products } = await supabaseAdmin
      .from("products")
      .select("id, name, image_url")
      .in("id", productIds);

    // 3. Merge them
    const enrichedOrders = orders.map(order => {
      const product = products?.find(p => p.id === order.product_id);
      return {
        ...order,
        product_name: product?.name || "Unknown Item",
        product_image: product?.image_url || "",
      };
    });

    return NextResponse.json({ orders: enrichedOrders });
  } catch (e: any) {
    console.error("Fetch orders error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { orderId, trackingNumber } = await req.json();
    if (!orderId || !trackingNumber) return NextResponse.json({ error: "Missing data" }, { status: 400 });

    const { error } = await supabaseAdmin
      .from("merch_orders")
      .update({ 
        tracking_number: trackingNumber,
        status: "shipped"
      })
      .eq("id", orderId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
