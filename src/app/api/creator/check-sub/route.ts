import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const creatorId = searchParams.get("creatorId");

    if (!userId || !creatorId) {
      return NextResponse.json({ hasSub: false });
    }

    const { data: sub } = await supabaseAdmin
      .from("creator_subscriptions")
      .select("status, current_period_end")
      .eq("subscriber_user_id", userId)
      .eq("creator_id", Number(creatorId))
      .eq("status", "active")
      .maybeSingle();

    if (!sub) return NextResponse.json({ hasSub: false });

    if (sub.current_period_end) {
      const expiry = new Date(sub.current_period_end);
      if (expiry < new Date()) {
        await supabaseAdmin
          .from("creator_subscriptions")
          .update({ status: "canceled" })
          .eq("subscriber_user_id", userId)
          .eq("creator_id", Number(creatorId))
          .eq("status", "active");
        return NextResponse.json({ hasSub: false });
      }
    }

    return NextResponse.json({ hasSub: true, current_period_end: sub.current_period_end });
  } catch (e) {
    return NextResponse.json({ hasSub: false });
  }
}
