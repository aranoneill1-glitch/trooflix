import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";
import { kv } from "@vercel/kv";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
const CREATORS_KEY = "trooflix:creators";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) return NextResponse.json({ orders: [] });

    const { data: orders, error } = await supabaseAdmin
      .from("merch_orders")
      .select("*")
      .eq("buyer_user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!orders || orders.length === 0) return NextResponse.json({ orders: [] });

    const productIds = [...new Set(orders.map(o => o.product_id))];
    const { data: products } = await supabaseAdmin
      .from("products")
      .select("id, name, image_url")
      .in("id", productIds);

    const creatorsList = (await kv.get<any[]>(CREATORS_KEY)) || [];
    const creatorLookup = new Map<number, any>();
    creatorsList.forEach((c: any) => {
      if (c.id) creatorLookup.set(Number(c.id), c);
    });

    const enrichedOrders = orders.map(order => {
      const product = products?.find(p => p.id === order.product_id);
      const creator = creatorLookup.get(Number(order.creator_id));
      return {
        ...order,
        product: product || { name: "Unknown Item", image_url: "" },
        creator_name: creator?.name || "Creator",
        creator_slug: creator?.slug || "",
      };
    });

    return NextResponse.json({ orders: enrichedOrders });
  } catch (e: any) {
    console.error("Buyer orders error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
