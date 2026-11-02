import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET() {
  try {
    const { data: profiles } = await supabase.from("profiles").select("stripe_customer_id, user_id").not("stripe_customer_id", "is", null).limit(1);
    if (!profiles || profiles.length === 0) return NextResponse.json({ subscription: null });

    const customerId = profiles[0].stripe_customer_id;
    const subscriptions = await stripe.subscriptions.list({ customer: customerId, limit: 1, expand: ["data.default_payment_method"] });
    
    if (subscriptions.data.length === 0) return NextResponse.json({ subscription: null });

    const sub = subscriptions.data[0];
    const pm = sub.default_payment_method as Stripe.PaymentMethod;
    
    return NextResponse.json({
      subscription: {
        planName: sub.items.data[0].price.nickname || "Creator Tier",
        nextDate: new Date(sub.items.data[0].current_period_end * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
        amount: (sub.items.data[0].price.unit_amount! / 100).toFixed(2),
        cardBrand: pm?.card?.brand || "Visa",
        cardLast4: pm?.card?.last4 || "4242",
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
