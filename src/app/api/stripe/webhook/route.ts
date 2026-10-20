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
  if (!userId || !creatorIdRaw) {
    console.warn("[stripe] creator sub missing metadata", subscription.id);
    return;
  }
  const creatorId = Number(creatorIdRaw);
  if (!Number.isFinite(creatorId)) {
    console.error("[stripe] creatorId not numeric:", creatorIdRaw);
    return;
  }

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

  if (error) {
    console.error("[stripe] creator_subscriptions upsert failed:", error);
    throw error;
  }

  console.log(
    `[stripe] creator sub upserted: sub=${subscription.id} user=${userId} creator=${creatorId} status=${subscription.status}`
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
    console.error("Webhook signature failed:", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
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
        console.log(`[stripe] ${event.type}: creator sub user=${userId} creator=${subscription.metadata?.creatorId} amount=${invoice.amount_paid}`);
        return new NextResponse("OK", { status: 200 });
      }

      const periodEnd = getPeriodEnd(subscription);
      const currentPeriodEnd = new Date(periodEnd * 1000);

      if (type === "podcaster") {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("stripe_subscription_id, pass_expires_at, has_pass")
          .eq("user_id", userId)
          .maybeSingle();

        if (profile?.stripe_subscription_id && profile.stripe_subscription_id !== subscription.id) {
          try {
            await stripe.subscriptions.cancel(profile.stripe_subscription_id, {
              prorate: true,
            } as any);
            console.log(`[stripe] cancelled old Pass sub ${profile.stripe_subscription_id}`);
          } catch (err) {
            console.warn("Could not cancel old Pass sub:", err);
          }
        }

        await supabaseAdmin
          .from("profiles")
          .update({
            tier: "podcaster",
            is_verified: true,
            has_pass: true,
            podcaster_subscription_id: subscription.id,
            podcaster_subscription_status: subscription.status,
            podcaster_expires_at: null,
            subscription_status: subscription.status,
            stripe_subscription_id: subscription.id,
          })
          .eq("user_id", userId);
      } else {
        await supabaseAdmin
          .from("profiles")
          .update({
            tier: "pro",
            is_verified: true,
            has_pass: true,
            pass_expires_at: null,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer as string,
            subscription_status: subscription.status,
          })
          .eq("user_id", userId);
      }

      await supabaseAdmin.from("subscriptions").upsert(
        {
          user_id: userId,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: subscription.customer as string,
          price_id: subscription.items.data[0].price.id,
          status: subscription.status,
          current_period_end: currentPeriodEnd.toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          subscription_type: type === "podcaster" ? "podcaster" : "pass",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "stripe_subscription_id" }
      );

      console.log(`[stripe] ${event.type}: user=${userId} type=${type} amount=${invoice.amount_paid}`);
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const type = subscription.metadata?.type;

      if (type === "creator") {
        await upsertCreatorSubscription(subscription);
        console.log(`[stripe] creator sub updated: sub=${subscription.id} status=${subscription.status}`);
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;
      const type = subscription.metadata?.type;
      if (!userId) return new NextResponse("No userId", { status: 200 });

      if (type === "creator") {
        const { error } = await supabaseAdmin
          .from("creator_subscriptions")
          .update({
            status: "canceled",
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);
        if (error) {
          console.error("[stripe] creator_subscriptions cancel update failed:", error);
          throw error;
        }
        console.log(`[stripe] creator sub canceled: sub=${subscription.id} user=${userId}`);
        return new NextResponse("OK", { status: 200 });
      }

      const periodEnd = getPeriodEnd(subscription);
      const currentPeriodEnd = new Date(periodEnd * 1000);
      const graceEnd = new Date(currentPeriodEnd);
      graceEnd.setDate(graceEnd.getDate() + GRACE_PERIOD_DAYS);

      if (type === "podcaster") {
        await supabaseAdmin
          .from("profiles")
          .update({
            has_pass: false,
            pass_expires_at: graceEnd.toISOString(),
            podcaster_subscription_status: "cancelled",
            podcaster_expires_at: graceEnd.toISOString(),
            subscription_status: "cancelled",
          })
          .eq("user_id", userId);
      } else {
        await supabaseAdmin
          .from("profiles")
          .update({
            has_pass: false,
            pass_expires_at: graceEnd.toISOString(),
            subscription_status: "cancelled",
          })
          .eq("user_id", userId);
      }

      console.log(`[stripe] cancelled: user=${userId} type=${type} grace_until=${graceEnd.toISOString()}`);
    }

    return new NextResponse("OK", { status: 200 });
  } catch (e: any) {
    console.error("Webhook error:", e);
    return new NextResponse("Error", { status: 500 });
  }
}
