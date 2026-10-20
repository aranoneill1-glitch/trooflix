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

    const { data, error } = await supabaseAdmin.rpc("user_has_creator_subscription", {
      p_subscriber_user_id: userId,
      p_creator_id: Number(creatorId),
    });

    if (error) {
      console.error("check-sub error:", error);
      return NextResponse.json({ hasSub: false });
    }

    return NextResponse.json({ hasSub: !!data });
  } catch (e) {
    return NextResponse.json({ hasSub: false });
  }
}
