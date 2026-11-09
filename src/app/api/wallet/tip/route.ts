import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { senderId, receiverId, amount, description } = await req.json();
    if (!senderId || !receiverId || !amount) return NextResponse.json({ error: "Missing data" }, { status: 400 });
    if (senderId === receiverId) return NextResponse.json({ error: "You cannot tip yourself." }, { status: 400 });

    // Fix: Translate KV numeric creator ID to Supabase UUID if needed
    let validReceiverId = receiverId;
    if (!String(receiverId).includes("-")) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("user_id")
        .eq("creator_id", Number(receiverId))
        .maybeSingle();
        
      if (profile?.user_id) {
        validReceiverId = profile.user_id;
      } else {
        return NextResponse.json({ error: "Creator profile not found." }, { status: 404 });
      }
    }

    // Check sender balance
    const { data: wallet } = await supabaseAdmin.from("wallets").select("balance").eq("user_id", senderId).maybeSingle();
    if (!wallet || wallet.balance < amount) {
      return NextResponse.json({ error: "Insufficient TrooCoins." }, { status: 400 });
    }

    // Execute transfer (Postgres function)
    const { error } = await supabaseAdmin.rpc("transfer_coins", {
      p_sender_id: senderId,
      p_receiver_id: validReceiverId,
      p_amount: amount,
      p_type: "tip",
      p_description: description || "Tipped on a post"
    });

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}