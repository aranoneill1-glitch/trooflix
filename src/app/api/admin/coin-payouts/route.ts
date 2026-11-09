import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function isAdmin() {
  const cookieStore = await cookies();
  return cookieStore.get("trooflix_admin")?.value === process.env.ADMIN_PASSWORD;
}

export async function GET() {
  try {
    if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const { data: txs, error } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("type", "payout")
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!txs || txs.length === 0) return NextResponse.json({ payouts: [] });

    const userIds = [...new Set(txs.map(t => t.sender_id).filter(Boolean))];
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("user_id, username, display_name")
      .in("user_id", userIds);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    const formatted = txs.map(t => {
      const profile = profileMap.get(t.sender_id);
      return {
        ...t,
        username: profile?.username || profile?.display_name || t.sender_id
      };
    });

    return NextResponse.json({ payouts: formatted });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id, action } = await req.json(); // action: "paid" or "cancel"
    
    const { data: tx } = await supabaseAdmin.from("transactions").select("*").eq("id", id).single();
    if (!tx || tx.status !== "pending") throw new Error("Payout not found or already processed.");

    if (action === "paid") {
      await supabaseAdmin.from("transactions").update({ status: "completed" }).eq("id", id);
    } else if (action === "cancel") {
      // Cancel and refund the coins to the creator
      await supabaseAdmin.from("transactions").update({ status: "cancelled" }).eq("id", id);
      
      const { data: wallet } = await supabaseAdmin.from("wallets").select("balance").eq("user_id", tx.sender_id).single();
      if (wallet) {
        await supabaseAdmin.from("wallets").update({ balance: wallet.balance + tx.amount }).eq("user_id", tx.sender_id);
      }
    } else {
      throw new Error("Invalid action.");
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}