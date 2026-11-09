import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { senderId, receiverId, amount, description } = await req.json();
    console.log("💰 TIP REQUEST:", { senderId, receiverId, amount });

    if (!senderId || !receiverId || !amount) return NextResponse.json({ error: "Missing data" }, { status: 400 });
    if (senderId === receiverId) return NextResponse.json({ error: "You cannot tip yourself." }, { status: 400 });
    if (amount <= 0 || (amount * 2) % 1 !== 0) return NextResponse.json({ error: "Invalid amount. Must be a multiple of 0.50." }, { status: 400 });

    let validReceiverId = receiverId;
    if (!String(receiverId).includes("-")) {
      const { data: profile, error: pErr } = await supabaseAdmin.from("profiles").select("user_id").eq("creator_id", Number(receiverId)).maybeSingle();
      console.log("🔍 Lookup:", receiverId, "->", profile?.user_id, pErr?.message);
      if (profile?.user_id) validReceiverId = profile.user_id;
      else return NextResponse.json({ error: "Creator profile not found." }, { status: 404 });
    }

    const { data: before } = await supabaseAdmin.from("wallets").select("balance").eq("user_id", senderId).maybeSingle();
    console.log("💵 Balance BEFORE:", before?.balance);

    const { error } = await supabaseAdmin.rpc("transfer_coins", {
      p_sender_id: senderId,
      p_receiver_id: validReceiverId,
      p_amount: amount,
      p_type: "tip",
      p_description: description || "Tipped on a post"
    });

    if (error) {
      console.error("❌ RPC ERROR:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: after } = await supabaseAdmin.from("wallets").select("balance").eq("user_id", senderId).maybeSingle();
    console.log("💵 Balance AFTER:", after?.balance);
    return NextResponse.json({ success: true, new_balance: after?.balance });
  } catch (e: any) {
    console.error("❌ TIP FAILED:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}