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
    // === GRANT ACCESS: Only on successfully paid invoice ===
    if (event.type === "invoice.paid" || event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      // Stripe v2026: subscription lives in invoice.parent.subscription_details
      const subscriptionId =
        (invoice as any).subscription ||
        (invoice.parent as any)?.subscription_details?.subscription ||
        null;

      if (!subscriptionId) return new NextResponse("No subscription on invoice", { status: 200 });
      if (invoice.amount_paid === 0) return new NextResponse("No payment made", { status: 200 });

      const subscription = await stripe.subscriptions.retrieve(
        typeof subscriptionId === "string" ? subscriptionId : subscriptionId.id
      );
      const userId = subscription.metadata?.userId;
      if (!userId) return new NextResponse("No userId", { status: 200 });

      const firstItem = subscription.items.data[0];
      const periodEndUnix = (firstItem as any)?.current_period_end
        ?? (subscription as any).current_period_end
        ?? Math.floor(Date.now() / 1000);
      const currentPeriodEnd = new Date(periodEndUnix * 1000);

      // Grant access
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({
          has_pass: true,
          pass_expires_at: null,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: subscription.customer as string,
          subscription_status: subscription.status,
          tier: "pro",
          is_verified: true,
        })
        .eq("user_id", userId);

      if (updateError) {
        console.error(`[stripe] DB update FAILED for ${userId}:`, updateError);
        return new NextResponse("DB update failed", { status: 500 });
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
          updated_at: new Date().toISOString(),
        },
        { onConflict: "stripe_subscription_id" }
      );

      console.log(`[stripe] invoice.paid: user=${userId} amount=${invoice.amount_paid} status=${subscription.status}`);
    }

    // === REVOKE / GRACE: On subscription cancellation ===
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;
      if (!userId) return new NextResponse("No userId", { status: 200 });

      const firstItem = subscription.items.data[0];
      const periodEndUnix = (firstItem as any)?.current_period_end
        ?? (subscription as any).current_period_end
        ?? Math.floor(Date.now() / 1000);
      const currentPeriodEnd = new Date(periodEndUnix * 1000);
      const graceEnd = new Date(currentPeriodEnd);
      graceEnd.setDate(graceEnd.getDate() + GRACE_PERIOD_DAYS);

      await supabaseAdmin
        .from("profiles")
        .update({
          has_pass: false,
          pass_expires_at: graceEnd.toISOString(),
          subscription_status: subscription.status,
        })
        .eq("user_id", userId);

      await supabaseAdmin.from("subscriptions").upsert(
        {
          user_id: userId,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: subscription.customer as string,
          price_id: subscription.items.data[0].price.id,
          status: subscription.status,
          current_period_end: currentPeriodEnd.toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "stripe_subscription_id" }
      );

      console.log(`[stripe] subscription.deleted: user=${userId} grace_until=${graceEnd.toISOString()}`);
    }

    return new NextResponse("OK", { status: 200 });
  } catch (e: any) {
    console.error("Webhook error:", e);
    return new NextResponse("Error", { status: 500 });
  }
}
