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
const WEBHOOK_DONE_TTL_SECONDS = 60 * 60 * 24 * 90;

async function claimWebhookWork(key: string): Promise<"claimed" | "done" | "busy"> {
  const state = await kv.get<string>(key);
  if (state === "done") return "done";
  const claim = await kv.set(key, "processing", { nx: true, ex: 300 });
  if (claim === "OK") return "claimed";
  return (await kv.get<string>(key)) === "done" ? "done" : "busy";
}

async function markWebhookWorkDone(key: string) {
  await kv.set(key, "done", { ex: WEBHOOK_DONE_TTL_SECONDS });
}

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

  const { error } = await supabaseAdmin.from("creator_subscriptions").upsert(
    {
      subscriber_user_id: userId, creator_id: creatorId, stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer as string, stripe_price_id: subscription.items.data[0]?.price?.id ?? "",
      status: subscription.status, price_cents: priceCents, current_period_end: new Date(periodEnd * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end, updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" }
  );
  if (error) throw error;
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

  let activeWorkKey: string | null = null;
  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;
      const checkoutType = session.metadata?.type;

      if ((checkoutType === "coin_topup" || checkoutType === "merch_cart") && session.payment_status !== "paid") {
        return new NextResponse("Payment is not complete", { status: 200 });
      }

      if (checkoutType === "coin_topup") {
        const userId = session.metadata?.userId;
        const coins = Number(session.metadata?.coins);
        const expectedAmountCents = Math.round(coins * 100);
        if (!userId || !Number.isFinite(coins) || coins <= 0 || session.mode !== "payment" || session.currency !== "usd" || session.amount_total !== expectedAmountCents) {
          console.error("Ignoring invalid Stripe coin top-up session", session.id);
          return new NextResponse("Invalid top-up metadata", { status: 200 });
        }

        const workKey = `stripe:checkout:${session.id}`;
        const claim = await claimWebhookWork(workKey);
        if (claim === "done") return new NextResponse("Already processed", { status: 200 });
        if (claim === "busy") return new NextResponse("Processing in progress", { status: 500 });
        activeWorkKey = workKey;

        const { data: wallet, error: walletError } = await supabaseAdmin.from("wallets").select("balance").eq("user_id", userId).maybeSingle();
        if (walletError) throw walletError;
        if (wallet) {
          const { error } = await supabaseAdmin.from("wallets").update({ balance: Number(wallet.balance) + coins }).eq("user_id", userId);
          if (error) throw error;
        } else {
          const { error } = await supabaseAdmin.from("wallets").insert({ user_id: userId, balance: coins });
          if (error) throw error;
        }
        const { error: transactionError } = await supabaseAdmin.from("transactions").insert({ sender_id: null, receiver_id: userId, amount: coins, type: "topup", description: `Purchased ${coins} TrooCoins` });
        if (transactionError) throw transactionError;
        await markWebhookWorkDone(workKey);
        activeWorkKey = null;
      }

      if (checkoutType === "merch_cart") {
        const sessionDetails = session as any;
        const shipping = sessionDetails.collected_information?.shipping_details || sessionDetails.shipping_details;
        const userId = session.metadata?.userId;
        const itemsJson = session.metadata?.items;
        if (!userId || userId !== session.client_reference_id || !itemsJson) return new NextResponse("Invalid order metadata", { status: 200 });
        const items = JSON.parse(itemsJson);
        if (!Array.isArray(items) || items.length === 0 || items.length > 10) return new NextResponse("Invalid order items", { status: 200 });
        let expectedAmountCents = 0;
        for (const item of items) {
          if (!Number.isSafeInteger(Number(item.id)) || !Number.isSafeInteger(Number(item.quantity)) || Number(item.quantity) <= 0 || Number(item.quantity) > 20) {
            return new NextResponse("Invalid order items", { status: 200 });
          }
          const { data: product, error } = await supabaseAdmin.from("products").select("price_cents").eq("id", item.id).maybeSingle();
          if (error) throw error;
          if (!product || !Number.isSafeInteger(product.price_cents) || product.price_cents <= 0) return new NextResponse("Invalid product in order", { status: 200 });
          expectedAmountCents += product.price_cents * Number(item.quantity);
        }
        if (session.mode !== "payment" || session.currency !== "usd" || session.amount_total !== expectedAmountCents) {
          console.error("Ignoring mismatched Stripe merchandise session", session.id);
          return new NextResponse("Order total mismatch", { status: 200 });
        }

        const workKey = `stripe:checkout:${session.id}`;
        const claim = await claimWebhookWork(workKey);
        if (claim === "done") return new NextResponse("Already processed", { status: 200 });
        if (claim === "busy") return new NextResponse("Processing in progress", { status: 500 });
        activeWorkKey = workKey;
        const orderCode = "TRF-" + Math.floor(100000 + Math.random() * 900000);
        for (const item of items) {
          const { data: product, error: productError } = await supabaseAdmin.from("products").select("creator_id, price_cents, inventory_count").eq("id", item.id).maybeSingle();
          if (productError) throw productError;
          if (!product) continue;
          const newInventory = Math.max(0, (product.inventory_count || 0) - item.quantity);
          const { error: inventoryError } = await supabaseAdmin.from("products").update({ inventory_count: newInventory }).eq("id", item.id);
          if (inventoryError) throw inventoryError;
          const { error: orderError } = await supabaseAdmin.from("merch_orders").insert({
            buyer_user_id: userId, creator_id: Number(product.creator_id), product_id: Number(item.id),
            stripe_session_id: session.id, amount_cents: (product.price_cents * item.quantity), status: "paid", order_code: orderCode,
            shipping_name: shipping?.name || null, shipping_address: shipping?.address?.line1 || null,
            shipping_city: shipping?.address?.city || null, shipping_postal_code: shipping?.address?.postal_code || null,
            shipping_country: shipping?.address?.country || null,
          });
          if (orderError) throw orderError;
        }
        await markWebhookWorkDone(workKey);
        activeWorkKey = null;
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
      // Older checkout sessions used `trooflix_pass`; keep accepting them while
      // new checkouts use the canonical `pass` value.
      if (type !== "pass" && type !== "trooflix_pass" && type !== "creator" && type !== "creator_premium") return new NextResponse("Unknown subscription type", { status: 200 });

      const invoiceWorkKey = `stripe:invoice:${invoice.id}`;
      const invoiceClaim = await claimWebhookWork(invoiceWorkKey);
      if (invoiceClaim === "done") return new NextResponse("Already processed", { status: 200 });
      if (invoiceClaim === "busy") return new NextResponse("Processing in progress", { status: 500 });
      activeWorkKey = invoiceWorkKey;

      if (type === "creator_premium") {
        await upsertCreatorSubscription(subscription);
        const creatorOwnerUserId = subscription.metadata?.creatorOwnerUserId;
        const amount = invoice.amount_paid / 100;
        if (creatorOwnerUserId && amount > 0) {
          const { data: wallet, error: walletError } = await supabaseAdmin.from("wallets").select("balance").eq("user_id", creatorOwnerUserId).maybeSingle();
          if (walletError) throw walletError;
          if (wallet) {
            const { error } = await supabaseAdmin.from("wallets").update({ balance: Number(wallet.balance) + amount }).eq("user_id", creatorOwnerUserId);
            if (error) throw error;
          } else {
            const { error } = await supabaseAdmin.from("wallets").insert({ user_id: creatorOwnerUserId, balance: amount });
            if (error) throw error;
          }
          const { error: notificationError } = await supabaseAdmin.from("notifications").insert({ user_id: creatorOwnerUserId, actor_id: userId, type: "subscription", title: "New Premium Subscriber!", message: "Someone subscribed to your premium content for $" + amount.toFixed(2) + "!" });
          if (notificationError) console.error("Creator subscription notification failed", notificationError);
        }
        await markWebhookWorkDone(invoiceWorkKey);
        activeWorkKey = null;
        return new NextResponse("OK", { status: 200 });
      }

      const periodEnd = getPeriodEnd(subscription);
      const currentPeriodEnd = new Date(periodEnd * 1000);
      const signupCoins = Number(subscription.metadata?.signupCoins || 0);

      if (signupCoins > 0 && invoice.billing_reason === "subscription_create") {
        const { data: wallet, error: walletError } = await supabaseAdmin.from("wallets").select("balance").eq("user_id", userId).maybeSingle();
        if (walletError) throw walletError;
        if (wallet) {
          const { error } = await supabaseAdmin.from("wallets").update({ balance: Number(wallet.balance) + signupCoins }).eq("user_id", userId);
          if (error) throw error;
        } else {
          const { error } = await supabaseAdmin.from("wallets").insert({ user_id: userId, balance: signupCoins });
          if (error) throw error;
        }
        const { error: transactionError } = await supabaseAdmin.from("transactions").insert({ sender_id: null, receiver_id: userId, amount: signupCoins, type: "topup", description: `Signup TrooCoins for invoice ${invoice.id}` });
        if (transactionError) throw transactionError;
      }

      if (type === "creator") {
        const { data: profile } = await supabaseAdmin.from("profiles").select("stripe_subscription_id").eq("user_id", userId).maybeSingle();
        if (profile?.stripe_subscription_id && profile.stripe_subscription_id !== subscription.id) {
          try { await stripe.subscriptions.cancel(profile.stripe_subscription_id, { prorate: true } as any); } catch (err) {}
        }
        const { error: profileError } = await supabaseAdmin.from("profiles").update({
          tier: "creator", verification_tick: "creator_gold", is_verified: true,
          has_pass: true, plus_expires_at: null,
          stripe_subscription_id: subscription.id,
        }).eq("user_id", userId);
        if (profileError) throw profileError;

        const creators = (await kv.get<any[]>(CREATORS_KEY)) || [];
        const existing = creators.find((c: any) => String(c.ownerUserId) === String(userId));
        if (!existing) {
          const { data: profile2 } = await supabaseAdmin.from("profiles").select("username, display_name").eq("user_id", userId).maybeSingle();
          const slug = profile2?.username || String(userId).slice(0, 8);
          creators.push({ id: Date.now(), name: profile2?.display_name || slug, slug, photoUrl: "", heroBackdropUrl: "", description: "", ownerUserId: userId, isVerified: true, createdAt: new Date().toISOString() });
          await kv.set(CREATORS_KEY, creators);
        }
      } else {
        const { error: profileError } = await supabaseAdmin.from("profiles").update({
          tier: "plus", verification_tick: "plus_red", is_verified: true,
          has_pass: true, pass_expires_at: null, plus_expires_at: null,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: subscription.customer as string,
          subscription_status: subscription.status
        }).eq("user_id", userId);
        if (profileError) throw profileError;
      }

      const { error: subscriptionError } = await supabaseAdmin.from("subscriptions").upsert({
        user_id: userId, stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer as string,
        price_id: subscription.items.data[0].price.id,
        status: subscription.status,
        current_period_end: currentPeriodEnd.toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        subscription_type: type === "creator" ? "creator" : "pass",
        updated_at: new Date().toISOString()
      }, { onConflict: "stripe_subscription_id" });
      if (subscriptionError) throw subscriptionError;
      await markWebhookWorkDone(invoiceWorkKey);
      activeWorkKey = null;
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
        const { error } = await supabaseAdmin.from("creator_subscriptions").update({ status: "canceled", updated_at: new Date().toISOString() }).eq("stripe_subscription_id", subscription.id);
        if (error) throw error;
        return new NextResponse("OK", { status: 200 });
      }
      const periodEnd = getPeriodEnd(subscription);
      const currentPeriodEnd = new Date(periodEnd * 1000);
      const graceEnd = new Date(currentPeriodEnd);
      graceEnd.setDate(graceEnd.getDate() + 14);
      const { error: profileError } = await supabaseAdmin.from("profiles").update({
        plus_expires_at: graceEnd.toISOString(),
        subscription_status: "cancelled"
      }).eq("user_id", userId);
      if (profileError) throw profileError;
    }

    return new NextResponse("OK", { status: 200 });
  } catch (e: any) {
    if (activeWorkKey) {
      console.error("Stripe webhook processing failed; idempotency key will expire for retry", activeWorkKey);
    }
    console.error("Stripe webhook processing error", e);
    return new NextResponse("Webhook processing failed", { status: 500 });
  }
}
