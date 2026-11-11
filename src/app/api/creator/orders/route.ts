import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/api-auth";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function ownsCreatorId(creatorId: number, userId: string) {
  const { data, error } = await supabaseAdmin.from("profiles").select("user_id").eq("creator_id", creatorId).maybeSingle();
  if (error) throw error;
  return String(data?.user_id || "") === String(userId);
}

export async function GET(req: Request) {
  try {
    const auth = await requireUser();
    if (auth instanceof Response) return auth;
    const { searchParams } = new URL(req.url);
    const creatorId = searchParams.get("creatorId");
    if (!creatorId) return NextResponse.json({ orders: [] });
    const numericCreatorId = Number(creatorId);
    if (!Number.isSafeInteger(numericCreatorId) || numericCreatorId <= 0) return NextResponse.json({ error: "Invalid creator" }, { status: 400 });
    if (!(await ownsCreatorId(numericCreatorId, auth.user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // 1. Fetch the orders for this creator
    const { data: orders, error } = await supabaseAdmin
      .from("merch_orders")
      .select("*")
      .eq("creator_id", numericCreatorId)
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
    const auth = await requireUser();
    if (auth instanceof Response) return auth;
    const { orderId, trackingNumber } = await req.json();
    const numericOrderId = Number(orderId);
    const cleanTrackingNumber = typeof trackingNumber === "string" ? trackingNumber.trim() : "";
    if (!Number.isSafeInteger(numericOrderId) || numericOrderId <= 0 || !cleanTrackingNumber || cleanTrackingNumber.length > 120) {
      return NextResponse.json({ error: "A valid order and tracking number are required" }, { status: 400 });
    }

    const { data: order, error: orderLookupError } = await supabaseAdmin.from("merch_orders").select("id, creator_id, status").eq("id", numericOrderId).maybeSingle();
    if (orderLookupError) throw orderLookupError;
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (!(await ownsCreatorId(Number(order.creator_id), auth.user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (order.status !== "paid") return NextResponse.json({ error: "Only paid, unshipped orders can be updated" }, { status: 409 });

    const { data: shippedOrder, error } = await supabaseAdmin
      .from("merch_orders")
      .update({ 
        tracking_number: cleanTrackingNumber,
        status: "shipped"
      })
      .eq("id", numericOrderId)
      .eq("status", "paid")
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!shippedOrder) return NextResponse.json({ error: "Order has already been processed" }, { status: 409 });

    // Release Escrow
    const { data: escrowTx } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("order_id", numericOrderId)
      .eq("type", "merch_sale")
      .eq("status", "pending")
      .maybeSingle();

    if (escrowTx) {
      const { data: claimedEscrow, error: claimError } = await supabaseAdmin
        .from("transactions")
        .update({ status: "processing" })
        .eq("id", escrowTx.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      if (claimError) throw claimError;

      if (claimedEscrow) {
        // Find creator UUID from KV
        const { kv } = await import("@vercel/kv");
        const creators = (await kv.get<any[]>("trooflix:creators")) || [];
        const creator = creators.find((c: any) => Number(c.id) === Number(order.creator_id));
        const receiverUserId = creator?.ownerUserId || creator?.user_id || escrowTx.receiver_id;
        if (!receiverUserId) throw new Error("Could not resolve creator payout account");

        const { data: wallet, error: walletError } = await supabaseAdmin.from("wallets").select("balance").eq("user_id", receiverUserId).maybeSingle();
        if (walletError) throw walletError;
        if (wallet) {
          const { error: creditError } = await supabaseAdmin.from("wallets").update({ balance: Number(wallet.balance) + Number(escrowTx.amount) }).eq("user_id", receiverUserId);
          if (creditError) throw creditError;
        } else {
          const { error: creditError } = await supabaseAdmin.from("wallets").insert({ user_id: receiverUserId, balance: escrowTx.amount });
          if (creditError) throw creditError;
        }
        const { error: finishError } = await supabaseAdmin.from("transactions").update({ status: "completed" }).eq("id", escrowTx.id).eq("status", "processing");
        if (finishError) throw finishError;
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
