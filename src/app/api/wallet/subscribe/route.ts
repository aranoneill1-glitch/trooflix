import { NextResponse } from "next/server";
import { requireUser, assertSelf } from "@/lib/api-auth";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export async function POST(req: Request) {
  try {
    const { userId, creatorId } = await req.json();

    const auth = await requireUser();
    if (auth instanceof Response) return auth;
    const mismatch = assertSelf(auth.user, userId);
    if (mismatch) return mismatch;
    if (userId === undefined || creatorId === undefined) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    const numCreatorId = Number(creatorId);
    if (!Number.isFinite(numCreatorId)) {
      return NextResponse.json({ error: "Invalid creator ID." }, { status: 400 });
    }

    const { data: allCreators } = await supabaseAdmin
      .from("profiles")
      .select("user_id, display_name, username, tier, premium_enabled, premium_price_cents")
      .eq("tier", "creator");

    const creator = (allCreators || []).find((p: any) => {
      const hex = String(p.user_id).replace(/-/g, "").slice(0, 12);
      return (parseInt(hex, 16) || 0) === numCreatorId;
    });

    if (!creator) {
      return NextResponse.json({ error: "Creator not found." }, { status: 404 });
    }

    const premiumPriceCents = Number(creator.premium_price_cents);
    if (!creator.premium_enabled || !Number.isSafeInteger(premiumPriceCents) || premiumPriceCents < 50) {
      return NextResponse.json({ error: "This creator has not enabled a valid premium subscription." }, { status: 400 });
    }
    const amount = premiumPriceCents / 100;

    const { data: existingSubscriptions, error: existingSubscriptionError } = await supabaseAdmin
      .from("creator_subscriptions")
      .select("id")
      .eq("subscriber_user_id", userId)
      .eq("creator_id", numCreatorId)
      .in("status", ["active", "trialing"])
      .gt("current_period_end", new Date().toISOString())
      .limit(1);
    if (existingSubscriptionError) throw existingSubscriptionError;
    if (existingSubscriptions?.length) {
      return NextResponse.json({ error: "You already have an active subscription to this creator." }, { status: 409 });
    }

    const { data: wallet } = await supabaseAdmin.from("wallets").select("balance").eq("user_id", userId).maybeSingle();
    if (!wallet || Number(wallet.balance) < amount) {
      return NextResponse.json({ error: "Insufficient TrooCoins. Please top up your wallet." }, { status: 400 });
    }

    const receiverId = creator.user_id;

    if (String(receiverId) === String(userId)) {
      return NextResponse.json({ error: "You cannot subscribe to yourself." }, { status: 400 });
    }

    const { error: debitError } = await supabaseAdmin.from("wallets").update({ balance: Number(wallet.balance) - amount }).eq("user_id", userId);
    if (debitError) throw debitError;

    const { data: creatorWallet } = await supabaseAdmin.from("wallets").select("balance").eq("user_id", receiverId).maybeSingle();
    if (creatorWallet) {
      const { error } = await supabaseAdmin.from("wallets").update({ balance: Number(creatorWallet.balance) + amount }).eq("user_id", receiverId);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin.from("wallets").insert({ user_id: receiverId, balance: amount });
      if (error) throw error;
    }

    const { error: subscriptionError } = await supabaseAdmin.from("creator_subscriptions").insert({
      subscriber_user_id: userId,
      creator_id: numCreatorId,
      status: "active",
      price_cents: premiumPriceCents,
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      stripe_subscription_id: "TC_" + Date.now() + "_" + userId.slice(0, 8),
      stripe_customer_id: "TC_CUSTOMER_" + userId.slice(0, 8),
      stripe_price_id: "TC_PRICE_" + Date.now(),
    });

    if (subscriptionError) throw subscriptionError;

    const { data: subscriberProfile } = await supabaseAdmin
      .from("profiles")
      .select("display_name, username")
      .eq("user_id", userId)
      .maybeSingle();
    const subscriberName = subscriberProfile?.display_name || subscriberProfile?.username || "Someone";

    await supabaseAdmin.from("notifications").insert({
      user_id: receiverId,
      actor_id: userId,
      type: "purchase",
      title: "New Premium Subscriber!",
      message: `${subscriberName} subscribed to your premium content for ${amount} TrooCoins!`,
    });

    const { error: transactionError } = await supabaseAdmin.from("transactions").insert({
      sender_id: userId,
      receiver_id: receiverId,
      amount: amount,
      type: "subscription",
      description: `Subscribed to @${creator.username || creator.display_name || "creator"}`,
    });
    if (transactionError) throw transactionError;

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
