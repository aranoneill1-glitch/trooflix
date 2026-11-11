import { NextResponse } from "next/server";
import Stripe from "stripe";
import { assertSelf, requireUser } from "@/lib/api-auth";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const auth = await requireUser();
    if (auth instanceof Response) return auth;

    const { userId: claimedUserId, coins } = await req.json();
    const mismatch = assertSelf(auth.user, claimedUserId);
    if (mismatch) return mismatch;

    const coinAmount = Number(coins);
    const priceCents = Math.round(coinAmount * 100);
    if (!Number.isFinite(coinAmount) || !Number.isSafeInteger(priceCents) || Math.abs(coinAmount - priceCents / 100) > 1e-8) {
      return NextResponse.json({ error: "Invalid TrooCoin amount" }, { status: 400 });
    }
    if (priceCents < 500 || priceCents > 50000) {
      return NextResponse.json({ error: "Top-ups must be between $5 and $500" }, { status: 400 });
    }

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
      client_reference_id: auth.user.id,
      metadata: { userId: auth.user.id, coins: String(priceCents / 100), type: "coin_topup" }
    });
    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
