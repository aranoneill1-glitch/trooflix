import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const { blockerId, blockedId } = await req.json();
    if (!blockerId || !blockedId) return NextResponse.json({ error: "Missing data" }, { status: 400 });

    const { error } = await supabaseAdmin.from("blocked_users").insert({
      blocker_id: blockerId,
      blocked_id: blockedId
    });

    if (error && error.code !== "23505") throw error; // Ignore duplicate blocks
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const blockerId = searchParams.get("blockerId");
    const blockedId = searchParams.get("blockedId");

    if (!blockerId || !blockedId) return NextResponse.json({ error: "Missing data" }, { status: 400 });

    await supabaseAdmin.from("blocked_users")
      .delete()
      .eq("blocker_id", blockerId)
      .eq("blocked_id", blockedId);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
