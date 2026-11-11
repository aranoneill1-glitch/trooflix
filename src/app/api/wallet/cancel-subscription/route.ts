import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export async function POST(req: Request) {
  try {
    const { userId, creatorId } = await req.json();
    if (!userId || !creatorId) {
      return NextResponse.json({ error: "Missing userId or creatorId" }, { status: 400 });
    }

    const { data: sub } = await supabaseAdmin
      .from("creator_subscriptions")
      .select("id, status, current_period_end, price_cents")
      .eq("subscriber_user_id", userId)
      .eq("creator_id", Number(creatorId))
      .eq("status", "active")
      .maybeSingle();

    if (!sub) {
      return NextResponse.json({ error: "No active subscription found." }, { status: 404 });
    }

    // Mark subscription cancelled but keep access until current_period_end
    await supabaseAdmin
      .from("creator_subscriptions")
      .update({ status: "canceled", cancel_at_period_end: true })
      .eq("id", sub.id);

    return NextResponse.json({ success: true, access_until: sub.current_period_end });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
