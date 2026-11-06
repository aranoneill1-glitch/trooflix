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
    const userId = searchParams.get("userId");
    if (!userId) return NextResponse.json({ orders: [] });

    // 1. Fetch all orders for this buyer
    const { data: orders, error } = await supabaseAdmin
      .from("merch_orders")
      .select("*")
      .eq("buyer_user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!orders || orders.length === 0) return NextResponse.json({ orders: [] });

    // 2. Fetch the products for these orders
    const productIds = [...new Set(orders.map(o => o.product_id))];
    const { data: products } = await supabaseAdmin
      .from("products")
      .select("id, name, image_url")
      .in("id", productIds);

    // 3. Fetch the creator profiles
    const creatorIds = [...new Set(orders.map(o => o.creator_id))];
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("creator_id, display_name, username")
      .in("creator_id", creatorIds);

    // 4. Merge them all together
    const enrichedOrders = orders.map(order => {
      const product = products?.find(p => p.id === order.product_id);
      const creator = profiles?.find(p => p.creator_id === order.creator_id);
      return {
        ...order,
        product: product || { name: "Unknown Item", image_url: "" },
        creator_name: creator?.display_name || creator?.username || "Creator",
      };
    });

    return NextResponse.json({ orders: enrichedOrders });
  } catch (e: any) {
    console.error("Buyer orders error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}