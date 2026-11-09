import { NextResponse } from "next/server";
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const { userId, coins, priceCents } = await req.json();
    if (!userId || !coins || !priceCents) return NextResponse.json({ error: "Missing data" }, { status: 400 });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: { name: `${coins} TrooCoins` },
          unit_amount: priceCents,
        },
        quantity: 1,
      }],
      success_url: `${process.env.NEXT_PUBLIC_URL || "https://www.trooflixtv.com"}/wallet?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL || "https://www.trooflixtv.com"}/wallet`,
      metadata: { userId, coins: String(coins), type: "coin_topup" }
    });
    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}