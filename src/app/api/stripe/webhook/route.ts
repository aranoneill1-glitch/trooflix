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
    // Handle subscription lifecycle events
    if (
      event.type === "checkout.session.completed" ||
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      let subscription: Stripe.Subscription;

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        if (!session.subscription) {
          return new NextResponse("No subscription on checkout", { status: 200 });
        }
        subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      } else {
        subscription = event.data.object as Stripe.Subscription;
      }

      const userId = subscription.metadata?.userId;
      if (!userId) {
        console.warn("No userId in subscription metadata");
        return new NextResponse("No userId", { status: 200 });
      }

      const status = subscription.status;
      const isActive = ["active", "trialing"].includes(status);
      // Stripe v2026: current_period_end lives on subscription items
      const firstItem = subscription.items.data[0];
      const periodEndUnix = (firstItem as any)?.current_period_end
        ?? (subscription as any).current_period_end
        ?? Math.floor(Date.now() / 1000);
      const currentPeriodEnd = new Date(periodEndUnix * 1000);

      // Compute pass_expires_at
      let passExpiresAt: string | null = null;
      if (isActive) {
        passExpiresAt = null; // no expiry while active
      } else {
        // cancelled / past_due / unpaid → grace period
        const graceEnd = new Date(currentPeriodEnd);
        graceEnd.setDate(graceEnd.getDate() + GRACE_PERIOD_DAYS);
        passExpiresAt = graceEnd.toISOString();
      }

      // Update profile
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({
          has_pass: isActive,
          pass_expires_at: passExpiresAt,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: subscription.customer as string,
          subscription_status: status,
        })
        .eq("user_id", userId);

      // Log event to subscriptions table
      const { error: subError } = await supabaseAdmin.from("subscriptions").upsert(
        {
          user_id: userId,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: subscription.customer as string,
          price_id: subscription.items.data[0].price.id,
          status,
          current_period_end: currentPeriodEnd.toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "stripe_subscription_id" }
      );

      if (updateError) {
        console.error(`[stripe] DB update FAILED for ${userId}:`, updateError);
        return new NextResponse("DB update failed", { status: 500 });
      }
      if (subError) {
        console.error(`[stripe] Subscriptions log FAILED for ${userId}:`, subError);
      }
      console.log(`[stripe] ${event.type}: user=${userId} status=${status} active=${isActive}`);
    }

    return new NextResponse("OK", { status: 200 });
  } catch (e: any) {
    console.error("Webhook error:", e);
    return new NextResponse("Error", { status: 500 });
  }
}
