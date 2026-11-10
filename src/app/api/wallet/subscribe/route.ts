import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export async function POST(req: Request) {
  try {
    const { userId, creatorId, amount } = await req.json();
    if (userId === undefined || creatorId === undefined || amount === undefined) return NextResponse.json({ error: "Missing data" }, { status: 400 });

    const { data: wallet } = await supabaseAdmin.from("wallets").select("balance").eq("user_id", userId).maybeSingle();
    if (wallet === null || wallet.balance < amount) return NextResponse.json({ error: "Insufficient TrooCoins. Please top up your wallet." }, { status: 400 });

    await supabaseAdmin.from("wallets").update({ balance: wallet.balance - amount }).eq("user_id", userId);

    const { error } = await supabaseAdmin.from("creator_subscriptions").insert({
      subscriber_user_id: userId,
      creator_id: Number(creatorId),
      status: "active",
      price_cents: amount * 100,
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    if (error) throw error;

    await supabaseAdmin.from("transactions").insert({
      sender_id: userId,
      receiver_id: null,
      amount: amount,
      type: "subscription",
      description: "Subscribed to creator",
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
