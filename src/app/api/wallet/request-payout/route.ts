import { NextResponse } from "next/server";
import { requireUser, assertSelf } from "@/lib/api-auth";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: Request) {
  try {
    const { userId, amount, method } = await req.json();

    const auth = await requireUser();
    if (auth instanceof Response) return auth;
    const mismatch = assertSelf(auth.user, userId);
    if (mismatch) return mismatch;
    if (!userId || !amount || amount < 5) return NextResponse.json({ error: "Minimum payout is $5.00" }, { status: 400 });

    const { data: wallet } = await supabaseAdmin.from("wallets").select("balance").eq("user_id", userId).maybeSingle();
    if (!wallet || wallet.balance < amount) return NextResponse.json({ error: "Insufficient balance." }, { status: 400 });

    const isCrypto = method === "crypto";
    const fee = isCrypto ? amount * 0.15 : 0;
    const net_amount = amount - fee;

    // Deduct full amount from wallet
    await supabaseAdmin.from("wallets").update({ balance: wallet.balance - amount }).eq("user_id", userId);

    // Create transaction with fee tracking
    await supabaseAdmin.from("transactions").insert({
      sender_id: userId,
      receiver_id: null,
      amount: amount,
      fee: fee,
      net_amount: net_amount,
      type: "payout",
      status: "pending",
      description: `Payout via ${isCrypto ? "Crypto" : "Bank Transfer"}`
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
