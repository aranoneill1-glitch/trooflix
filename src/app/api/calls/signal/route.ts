import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const { callId, senderId, recipientId, signalType, signalData } = await req.json();
    if (!callId || !senderId || !recipientId || !signalType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("webrtc_signals")
      .insert({
        call_id: callId,
        sender_id: senderId,
        recipient_id: recipientId,
        signal_type: signalType,
        signal_data: signalData || null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, signal: data });
  } catch (e: any) {
    console.error("Signal API error:", e);
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
