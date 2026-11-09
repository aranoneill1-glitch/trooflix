import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: Request) {
  try {
    const { payoutId, userId } = await req.json();
    if (!payoutId || !userId) return NextResponse.json({ error: "Missing data" }, { status: 400 });

    const { data: tx } = await supabaseAdmin.from("transactions").select("*").eq("id", payoutId).eq("sender_id", userId).maybeSingle();
    if (!tx || tx.status !== "pending") throw new Error("Payout not found or already processed.");

    await supabaseAdmin.from("transactions").update({ status: "cancelled" }).eq("id", payoutId);
    const { data: wallet } = await supabaseAdmin.from("wallets").select("balance").eq("user_id", userId).single();
    if (wallet) {
      await supabaseAdmin.from("wallets").update({ balance: Number(wallet.balance) + Number(tx.amount) }).eq("user_id", userId);
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}