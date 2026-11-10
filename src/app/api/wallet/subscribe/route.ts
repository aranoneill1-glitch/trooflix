import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { kv } from "@vercel/kv";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

const CREATORS_KEY = "trooflix:creators";

export async function POST(req: Request) {
  try {
    const { userId, creatorId, amount } = await req.json();
    if (userId === undefined || creatorId === undefined || amount === undefined) return NextResponse.json({ error: "Missing data" }, { status: 400 });

    const { data: wallet } = await supabaseAdmin.from("wallets").select("balance").eq("user_id", userId).maybeSingle();
    if (wallet === null || wallet === undefined || wallet.balance < amount) return NextResponse.json({ error: "Insufficient TrooCoins. Please top up your wallet." }, { status: 400 });

    const creators = (await kv.get<any[]>(CREATORS_KEY)) || [];
    const creator = creators.find((c: any) => Number(c.id) === Number(creatorId));
    const receiverId = creator?.ownerUserId;

    if (receiverId === undefined || receiverId === null) return NextResponse.json({ error: "Creator not found." }, { status: 404 });

    await supabaseAdmin.from("wallets").update({ balance: wallet.balance - amount }).eq("user_id", userId);

    const { data: creatorWallet } = await supabaseAdmin.from("wallets").select("balance").eq("user_id", receiverId).maybeSingle();
    if (creatorWallet) {
      await supabaseAdmin.from("wallets").update({ balance: Number(creatorWallet.balance) + amount }).eq("user_id", receiverId);
    } else {
      await supabaseAdmin.from("wallets").insert({ user_id: receiverId, balance: amount });
    }

    const { error } = await supabaseAdmin.from("creator_subscriptions").insert({
      subscriber_user_id: userId,
      creator_id: Number(creatorId),
      status: "active",
      price_cents: amount * 100,
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    if (error) throw error;

    await supabaseAdmin.from("notifications").insert({
      user_id: receiverId,
      actor_id: userId,
      type: "purchase",
      title: "New Premium Subscriber!",
      message: "Someone subscribed to your premium content using " + amount + " TrooCoins!"
    });

    await supabaseAdmin.from("transactions").insert({
      sender_id: userId,
      receiver_id: receiverId,
      amount: amount,
      type: "subscription",
      description: "Premium subscription",
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
