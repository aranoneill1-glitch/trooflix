import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient as createServerClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const GRACE_PERIOD_DAYS = 14;

function getPeriodEnd(sub: Stripe.Subscription): number {
  const firstItem = sub.items.data[0];
  return (firstItem as any)?.current_period_end
    ?? (sub as any).current_period_end
    ?? Math.floor(Date.now() / 1000);
}

function getSubscriptionId(invoice: Stripe.Invoice): string | null {
  const id = (invoice as any).subscription
    || (invoice.parent as any)?.subscription_details?.subscription
    || null;
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
      subscriber_user_id: userId,
      creator_id: creatorId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer as string,
      stripe_price_id: subscription.items.data[0]?.price?.id ?? "",
      status: subscription.status,
      price_cents: priceCents,
      current_period_end: new Date(periodEnd * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" }
  );
  if (error) console.error("[stripe] creator_subscriptions upsert failed:", error);
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new NextResponse("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      if (session.metadata?.type === "merch") {
        const sessionDetails = session as any;
        const shipping = sessionDetails.collected_information?.shipping_details || sessionDetails.shipping_details;
        
        // CRITICAL FIX: Use upsert on stripe_session_id to prevent duplicate orders
        const { error } = await supabaseAdmin.from("merch_orders").upsert({
          buyer_user_id: session.metadata.userId,
          creator_id: Number(session.metadata.creatorId),
          product_id: Number(session.metadata.productId),
          stripe_session_id: session.id,
          amount_cents: session.amount_total || 0,
          status: "paid",
          shipping_name: shipping?.name || null,
          shipping_address: shipping?.address?.line1 || null,
          shipping_city: shipping?.address?.city || null,
          shipping_postal_code: shipping?.address?.postal_code || null,
          shipping_country: shipping?.address?.country || null,
        }, { onConflict: "stripe_session_id" }); // <-- The magic bullet

        if (error) {
          console.error("[stripe] merch_orders upsert failed:", error);
          // Force Stripe to retry later by returning a 500 error
          return new NextResponse(`Database Error: ${error.message}`, { status: 500 });
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

      if (type === "creator") {
        await upsertCreatorSubscription(subscription);
        return new NextResponse("OK", { status: 200 });
      }

      const periodEnd = getPeriodEnd(subscription);
      const currentPeriodEnd = new Date(periodEnd * 1000);

      if (type === "podcaster") {
        const { data: profile } = await supabaseAdmin.from("profiles").select("stripe_subscription_id").eq("user_id", userId).maybeSingle();
        if (profile?.stripe_subscription_id && profile.stripe_subscription_id !== subscription.id) {
          try { await stripe.subscriptions.cancel(profile.stripe_subscription_id, { prorate: true } as any); } catch (err) {}
        }
        await supabaseAdmin.from("profiles").update({ tier: "podcaster", is_verified: true, has_pass: true, podcaster_subscription_id: subscription.id, podcaster_subscription_status: subscription.status, stripe_subscription_id: subscription.id }).eq("user_id", userId);
      } else {
        await supabaseAdmin.from("profiles").update({ tier: "pro", is_verified: true, has_pass: true, pass_expires_at: null, stripe_subscription_id: subscription.id, stripe_customer_id: subscription.customer as string, subscription_status: subscription.status }).eq("user_id", userId);
      }

      await supabaseAdmin.from("subscriptions").upsert({ user_id: userId, stripe_subscription_id: subscription.id, stripe_customer_id: subscription.customer as string, price_id: subscription.items.data[0].price.id, status: subscription.status, current_period_end: currentPeriodEnd.toISOString(), cancel_at_period_end: subscription.cancel_at_period_end, subscription_type: type === "podcaster" ? "podcaster" : "pass", updated_at: new Date().toISOString() }, { onConflict: "stripe_subscription_id" });
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      if (subscription.metadata?.type === "creator") await upsertCreatorSubscription(subscription);
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;
      const type = subscription.metadata?.type;
      if (!userId) return new NextResponse("No userId", { status: 200 });

      if (type === "creator") {
        await supabaseAdmin.from("creator_subscriptions").update({ status: "canceled", updated_at: new Date().toISOString() }).eq("stripe_subscription_id", subscription.id);
        return new NextResponse("OK", { status: 200 });
      }

      const periodEnd = getPeriodEnd(subscription);
      const currentPeriodEnd = new Date(periodEnd * 1000);
      const graceEnd = new Date(currentPeriodEnd);
      graceEnd.setDate(graceEnd.getDate() + GRACE_PERIOD_DAYS);

      await supabaseAdmin.from("profiles").update({ has_pass: false, pass_expires_at: graceEnd.toISOString(), subscription_status: "cancelled", ...(type === "podcaster" ? { podcaster_subscription_status: "cancelled", podcaster_expires_at: graceEnd.toISOString() } : {}) }).eq("user_id", userId);
    }

    return new NextResponse("OK", { status: 200 });
  } catch (e: any) {
    console.error("Webhook fatal error:", e);
    return new NextResponse(`Fatal: ${e.message}`, { status: 500 });
  }
}
