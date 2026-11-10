import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient as createServerClient } from "@supabase/supabase-js";
import { kv } from "@vercel/kv";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
const CREATORS_KEY = "trooflix:creators";

function getPeriodEnd(sub: Stripe.Subscription): number {
  const firstItem = sub.items.data[0];
  return (firstItem as any)?.current_period_end ?? (sub as any).current_period_end ?? Math.floor(Date.now() / 1000);
}

function getSubscriptionId(invoice: Stripe.Invoice): string | null {
  const id = (invoice as any).subscription || (invoice.parent as any)?.subscription_details?.subscription || null;
  if (!id) return null;
  return typeof id === "string" ? id : id.id;
}

async function upsertCreatorSubscription(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  const creatorIdRaw = subscription.metadata?.creatorId;
  if (!userId || !creatorIdRaw) return;
  const creatorId = Number(creatorIdRaw);
  if (!Number.isFinite(creatorId)) return;

  const periodEnd = getPeriodEnd(subscription);
  const priceCents = subscription.items.data[0]?.price?.unit_amount ?? 0;

  await supabaseAdmin.from("creator_subscriptions").upsert(
    {
      subscriber_user_id: userId, creator_id: creatorId, stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer as string, stripe_price_id: subscription.items.data[0]?.price?.id ?? "",
      status: subscription.status, price_cents: priceCents, current_period_end: new Date(periodEnd * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end, updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" }
  );
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new NextResponse("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.metadata?.type === "coin_topup") {
        const userId = session.metadata.userId;
        const coins = Number(session.metadata.coins);
        if (userId && coins) {
          const { data: wallet } = await supabaseAdmin.from("wallets").select("balance").eq("user_id", userId).maybeSingle();
          if (wallet) {
            await supabaseAdmin.from("wallets").update({ balance: wallet.balance + coins }).eq("user_id", userId);
          } else {
            await supabaseAdmin.from("wallets").insert({ user_id: userId, balance: coins });
          }
          await supabaseAdmin.from("transactions").insert({ sender_id: null, receiver_id: userId, amount: coins, type: "topup", description: `Purchased ${coins} TrooCoins` });
        }
      }

      if (session.metadata?.type === "merch_cart") {
        const sessionDetails = session as any;
        const shipping = sessionDetails.collected_information?.shipping_details || sessionDetails.shipping_details;
        const userId = session.metadata?.userId;
        const itemsJson = session.metadata?.items;
        if (!userId || !itemsJson) return new NextResponse("Missing metadata", { status: 400 });
        const items = JSON.parse(itemsJson);
        const orderCode = "TRF-" + Math.floor(100000 + Math.random() * 900000);
        for (const item of items) {
          const { data: product } = await supabaseAdmin.from("products").select("creator_id, price_cents, inventory_count").eq("id", item.id).maybeSingle();
          if (!product) continue;
          const newInventory = Math.max(0, (product.inventory_count || 0) - item.quantity);
          await supabaseAdmin.from("products").update({ inventory_count: newInventory }).eq("id", item.id);
          await supabaseAdmin.from("merch_orders").insert({
            buyer_user_id: userId, creator_id: Number(product.creator_id), product_id: Number(item.id),
            stripe_session_id: session.id, amount_cents: (product.price_cents * item.quantity), status: "paid", order_code: orderCode,
            shipping_name: shipping?.name || null, shipping_address: shipping?.address?.line1 || null,
            shipping_city: shipping?.address?.city || null, shipping_postal_code: shipping?.address?.postal_code || null,
            shipping_country: shipping?.address?.country || null,
          });
        }
      }
    }

    if (event.type === "invoice.paid" || event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = getSubscriptionId(invoice);
      if (!subscriptionId) return new NextResponse("No subscription", { status: 200 });
      if (invoice.amount_paid === 0) return new NextResponse("No payment", { status: 200 });

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const userId = subscription.metadata?.userId;
      const type = subscription.metadata?.type;
      if (!userId) return new NextResponse("No userId", { status: 200 });

      if (type === "creator_premium") {
        await upsertCreatorSubscription(subscription);
        const creatorOwnerUserId = subscription.metadata?.creatorOwnerUserId;
        const amount = invoice.amount_paid / 100;
        if (creatorOwnerUserId && amount > 0) {
          const { data: wallet } = await supabaseAdmin.from("wallets").select("balance").eq("user_id", creatorOwnerUserId).maybeSingle();
          if (wallet) {
            await supabaseAdmin.from("wallets").update({ balance: Number(wallet.balance) + amount }).eq("user_id", creatorOwnerUserId);
          } else {
            await supabaseAdmin.from("wallets").insert({ user_id: creatorOwnerUserId, balance: amount });
          }
          await supabaseAdmin.from("notifications").insert({ user_id: creatorOwnerUserId, actor_id: userId, type: "subscription", title: "New Premium Subscriber!", message: "Someone subscribed to your premium content for $" + amount.toFixed(2) + "!" });
        }
        return new NextResponse("OK", { status: 200 });
      }

      const periodEnd = getPeriodEnd(subscription);
      const currentPeriodEnd = new Date(periodEnd * 1000);
      const signupCoins = Number(subscription.metadata?.signupCoins || 0);

      if (signupCoins > 0) {
        const { data: wallet } = await supabaseAdmin.from("wallets").select("balance").eq("user_id", userId).maybeSingle();
        if (wallet) {
          await supabaseAdmin.from("wallets").update({ balance: Number(wallet.balance) + signupCoins }).eq("user_id", userId);
        } else {
          await supabaseAdmin.from("wallets").insert({ user_id: userId, balance: signupCoins });
        }
        await supabaseAdmin.from("transactions").insert({ sender_id: null, receiver_id: userId, amount: signupCoins, type: "topup", description: "Signup TrooCoins" });
      }

      if (type === "creator") {
        const { data: profile } = await supabaseAdmin.from("profiles").select("stripe_subscription_id").eq("user_id", userId).maybeSingle();
        if (profile?.stripe_subscription_id && profile.stripe_subscription_id !== subscription.id) {
          try { await stripe.subscriptions.cancel(profile.stripe_subscription_id, { prorate: true } as any); } catch (err) {}
        }
        await supabaseAdmin.from("profiles").update({
          tier: "creator", verification_tick: "creator_gold", is_verified: true,
          has_pass: true, plus_expires_at: null,
          stripe_subscription_id: subscription.id,
        }).eq("user_id", userId);

        const creators = (await kv.get<any[]>(CREATORS_KEY)) || [];
        const existing = creators.find((c: any) => String(c.ownerUserId) === String(userId));
        if (!existing) {
          const { data: profile2 } = await supabaseAdmin.from("profiles").select("username, display_name").eq("user_id", userId).maybeSingle();
          const slug = profile2?.username || String(userId).slice(0, 8);
          creators.push({ id: Date.now(), name: profile2?.display_name || slug, slug, photoUrl: "", heroBackdropUrl: "", description: "", ownerUserId: userId, isVerified: true, createdAt: new Date().toISOString() });
          await kv.set(CREATORS_KEY, creators);
        }
      } else {
        await supabaseAdmin.from("profiles").update({
          tier: "plus", verification_tick: "plus_red", is_verified: true,
          has_pass: true, pass_expires_at: null, plus_expires_at: null,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: subscription.customer as string,
          subscription_status: subscription.status
        }).eq("user_id", userId);
      }

      await supabaseAdmin.from("subscriptions").upsert({
        user_id: userId, stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer as string,
        price_id: subscription.items.data[0].price.id,
        status: subscription.status,
        current_period_end: currentPeriodEnd.toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        subscription_type: type === "creator" ? "creator" : "pass",
        updated_at: new Date().toISOString()
      }, { onConflict: "stripe_subscription_id" });
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      if (subscription.metadata?.type === "creator_premium") await upsertCreatorSubscription(subscription);
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;
      const type = subscription.metadata?.type;
      if (!userId) return new NextResponse("No userId", { status: 200 });
      if (type === "creator_premium") {
        await supabaseAdmin.from("creator_subscriptions").update({ status: "canceled", updated_at: new Date().toISOString() }).eq("stripe_subscription_id", subscription.id);
        return new NextResponse("OK", { status: 200 });
      }
      const periodEnd = getPeriodEnd(subscription);
      const currentPeriodEnd = new Date(periodEnd * 1000);
      const graceEnd = new Date(currentPeriodEnd);
      graceEnd.setDate(graceEnd.getDate() + 14);
      await supabaseAdmin.from("profiles").update({
        plus_expires_at: graceEnd.toISOString(),
        subscription_status: "cancelled"
      }).eq("user_id", userId);
    }

    return new NextResponse("OK", { status: 200 });
  } catch (e: any) {
    return new NextResponse(`Fatal: ${e.message}`, { status: 500 });
  }
}
