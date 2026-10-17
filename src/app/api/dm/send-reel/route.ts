import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// POST /api/dm/send-reel — { fromUserId, toUserId, videoId }
// Sends a DM with body = "__REEL__:<videoId>"
export async function POST(req: Request) {
  try {
    const { fromUserId, toUserId, videoId } = await req.json();

    if (!fromUserId || !toUserId || !videoId) {
      return NextResponse.json(
        { error: "fromUserId, toUserId, videoId required" },
        { status: 400 }
      );
    }
    if (fromUserId === toUserId) {
      return NextResponse.json(
        { error: "You can't send a reel to yourself" },
        { status: 400 }
      );
    }

    const body = `__REEL__:${Number(videoId)}`;

    const { data, error } = await supabaseAdmin
      .from("direct_messages")
      .insert({
        sender_id: fromUserId,
        recipient_id: toUserId,
        body,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, message: data });
  } catch (e: any) {
    console.error("send-reel error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
