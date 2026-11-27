import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const { hostUserId, hostName, hostUsername, invitedUserId, liveInputId } = await req.json();
    if (!hostUserId || !invitedUserId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    if (hostUserId === invitedUserId) {
      return NextResponse.json({ error: "Cannot invite yourself" }, { status: 400 });
    }

    const link = hostUsername ? `/live/${hostUsername}` : "/live";
    const title = "Live invite";
    const message = `${hostName || "Someone"} invited you to join their live.`;

    const { error } = await supabaseAdmin.from("notifications").insert({
      user_id: invitedUserId,
      actor_id: hostUserId,
      type: "live_invite",
      title,
      message,
      post_id: null,
    });

    if (error) throw error;
    return NextResponse.json({ ok: true, link, liveInputId: liveInputId || null });
  } catch (e: any) {
    console.error("live invite error:", e);
    return NextResponse.json({ error: e?.message || "Failed to invite" }, { status: 500 });
  }
}
