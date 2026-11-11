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
    const payoutAmount = Number(amount);
    const amountCents = Math.round(payoutAmount * 100);
    if (!Number.isFinite(payoutAmount) || !Number.isSafeInteger(amountCents) || Math.abs(payoutAmount - amountCents / 100) > 1e-8 || amountCents < 500) {
      return NextResponse.json({ error: "Minimum payout is $5.00; enter a valid amount to the nearest cent." }, { status: 400 });
    }
    if (method !== "bank" && method !== "crypto") {
      return NextResponse.json({ error: "Invalid payout method." }, { status: 400 });
    }

    const { data: payoutDetails } = await supabaseAdmin.from("payout_methods").select("payout_type").eq("user_id", userId).maybeSingle();
    if (!payoutDetails || payoutDetails.payout_type !== method) {
      return NextResponse.json({ error: "Add matching payout details before requesting a payout." }, { status: 400 });
    }

    const { data: wallet } = await supabaseAdmin.from("wallets").select("balance").eq("user_id", userId).maybeSingle();
    if (!wallet || Number(wallet.balance) < payoutAmount) return NextResponse.json({ error: "Insufficient balance." }, { status: 400 });

    const isCrypto = method === "crypto";
    const fee = isCrypto ? Math.round(amountCents * 0.15) / 100 : 0;
    const net_amount = payoutAmount - fee;

    // Deduct full amount from wallet
    await supabaseAdmin.from("wallets").update({ balance: Number(wallet.balance) - payoutAmount }).eq("user_id", userId);

    // Create transaction with fee tracking
    await supabaseAdmin.from("transactions").insert({
      sender_id: userId,
      receiver_id: null,
      amount: payoutAmount,
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
