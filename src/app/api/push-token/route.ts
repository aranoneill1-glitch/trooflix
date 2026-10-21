import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const { userId, token } = await req.json();
    if (!userId || !token) return NextResponse.json({ error: "Missing data" }, { status: 400 });

    // Upsert the token (update if exists, insert if new)
    const { error } = await supabaseAdmin.from("push_tokens").upsert(
      { user_id: userId, token, platform: "ios" },
      { onConflict: "token" }
    );

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
