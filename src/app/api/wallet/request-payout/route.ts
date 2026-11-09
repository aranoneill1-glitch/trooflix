import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { userId, amount } = await req.json();
    if (!userId || !amount || amount < 1) return NextResponse.json({ error: "Minimum payout is $1.00" }, { status: 400 });

    const { data: wallet } = await supabaseAdmin.from("wallets").select("balance").eq("user_id", userId).maybeSingle();
    if (!wallet || wallet.balance < amount) {
      return NextResponse.json({ error: "Insufficient balance." }, { status: 400 });
    }

    // Deduct immediately so they cannot spend it
    await supabaseAdmin.from("wallets").update({ balance: wallet.balance - amount }).eq("user_id", userId);

    // Create pending transaction
    await supabaseAdmin.from("transactions").insert({
      sender_id: userId,
      receiver_id: null,
      amount: amount,
      type: "payout",
      status: "pending",
      description: "Requested manual payout"
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}