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

function tierFromPriceId(priceId: string): "pro" | "podcaster" | "user" {
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return "pro";
  if (priceId === process.env.STRIPE_PODCASTER_PRICE_ID) return "podcaster";
  return "user";
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
    if (
      event.type === "checkout.session.completed" ||
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const obj = event.data.object as any;
      let userId: string | null = null;
      let tier: "pro" | "podcaster" | "user" = "user";
      let status = "inactive";

      if (event.type === "checkout.session.completed") {
        userId = obj.client_reference_id;
        const sub = await stripe.subscriptions.retrieve(obj.subscription as string);
        tier = tierFromPriceId(sub.items.data[0].price.id);
        status = sub.status;
      } else {
        const sub = obj as Stripe.Subscription;
        userId = sub.metadata?.userId || null;
        tier = tierFromPriceId(sub.items.data[0].price.id);
        status = sub.status;
      }

      if (userId) {
        const activeStatuses = ["active", "trialing"];
        const finalTier = activeStatuses.includes(status) ? tier : "user";

        await supabaseAdmin
          .from("profiles")
          .update({
            subscription_status: status,
            subscription_tier: finalTier,
            tier: finalTier,
            is_verified: finalTier !== "user",
          })
          .eq("user_id", userId);
      }
    }

    return new NextResponse("OK", { status: 200 });
  } catch (e: any) {
    console.error("Webhook error:", e);
    return new NextResponse("Error", { status: 500 });
  }
}
