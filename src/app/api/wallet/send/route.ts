import { NextResponse } from "next/server";
import { requireUser, assertSelf } from "@/lib/api-auth";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: Request) {
  try {
    const { senderId, recipientUsername, amount } = await req.json();

    const auth = await requireUser();
    if (auth instanceof Response) return auth;
    const mismatch = assertSelf(auth.user, senderId);
    if (mismatch) return mismatch;
    if (!senderId || !recipientUsername || !amount || amount <= 0) return NextResponse.json({ error: "Missing or invalid data" }, { status: 400 });

    const cleanUsername = recipientUsername.replace(/^@/, "").trim().toLowerCase();
    const { data: profile } = await supabaseAdmin.from("profiles").select("user_id").eq("username", cleanUsername).maybeSingle();
    if (!profile) return NextResponse.json({ error: "User not found." }, { status: 404 });
    if (profile.user_id === senderId) return NextResponse.json({ error: "You cannot send coins to yourself." }, { status: 400 });

    const { error } = await supabaseAdmin.rpc("transfer_coins", {
      p_sender_id: senderId,
      p_receiver_id: profile.user_id,
      p_amount: amount,
      p_type: "send",
      p_description: `Sent to @${cleanUsername}`,
      p_video_id: null
    });

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
