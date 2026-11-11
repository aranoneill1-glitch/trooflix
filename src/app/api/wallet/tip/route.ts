import { NextResponse } from "next/server";
import { requireUser, assertSelf } from "@/lib/api-auth";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { senderId, receiverId, amount, description } = await req.json();

    // Auth: verify the caller is the sender
    const auth = await requireUser();
    if (auth instanceof Response) return auth;
    const mismatch = assertSelf(auth.user, senderId);
    if (mismatch) return mismatch;

    if (!senderId || !receiverId || !amount) return NextResponse.json({ error: "Missing data" }, { status: 400 });
    if (amount <= 0 || (amount * 2) % 1 !== 0) return NextResponse.json({ error: "Invalid amount. Must be a multiple of 0.50." }, { status: 400 });

    let validReceiverId = receiverId;
    if (!String(receiverId).includes("-")) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("user_id")
        .eq("creator_id", Number(receiverId))
        .maybeSingle();
      if (profile?.user_id) validReceiverId = profile.user_id;
      else return NextResponse.json({ error: "Creator profile not found." }, { status: 404 });
    }

    if (String(senderId) === String(validReceiverId)) {
      return NextResponse.json({ error: "You cannot tip your own video." }, { status: 400 });
    }

    const { data: before } = await supabaseAdmin.from("wallets").select("balance").eq("user_id", senderId).maybeSingle();
    if (!before || before.balance < amount) {
      return NextResponse.json({ error: "Not enough credits. Please top up your balance." }, { status: 400 });
    }

    const { error } = await supabaseAdmin.rpc("transfer_coins", {
      p_sender_id: senderId,
      p_receiver_id: validReceiverId,
      p_amount: amount,
      p_type: "tip",
      p_description: description || "Tipped on a post",
      p_video_id: null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Notify the receiver
    try {
      const { data: senderProfile } = await supabaseAdmin
        .from("profiles")
        .select("display_name, username")
        .eq("user_id", senderId)
        .maybeSingle();
      const senderName = senderProfile?.display_name || senderProfile?.username || "Someone";

      await supabaseAdmin.from("notifications").insert({
        user_id: validReceiverId,
        actor_id: senderId,
        type: "tip",
        title: "New tip received",
        message: `${senderName} tipped you ${amount} TrooCoin${amount === 1 ? "" : "s"}!`,
      });
    } catch (notifErr) {
      console.warn("Tip notification failed:", notifErr);
    }

    const { data: after } = await supabaseAdmin.from("wallets").select("balance").eq("user_id", senderId).maybeSingle();
    return NextResponse.json({ success: true, new_balance: after?.balance });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
