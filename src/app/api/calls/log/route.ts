import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const { callerId, receiverId, status, duration } = await req.json();
    if (!callerId || !receiverId || !status) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    await supabaseAdmin.from("call_history").insert({
      caller_id: callerId,
      receiver_id: receiverId,
      status,
      duration_seconds: duration || 0,
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
