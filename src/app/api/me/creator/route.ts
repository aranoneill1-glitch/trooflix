import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";
import { kv } from "@vercel/kv";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const CREATORS_KEY = "trooflix:creators";

// GET /api/me/creator?user_id=X
// Returns { creator } if this user is an approved creator, else { creator: null }
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");
    if (!userId) return NextResponse.json({ creator: null });

    // 1. Verify their application is approved
    const { data: app, error: appErr } = await supabaseAdmin
      .from("creator_applications")
      .select("status")
      .eq("user_id", userId)
      .maybeSingle();

    if (appErr) throw appErr;
    if (!app || app.status !== "approved") {
      return NextResponse.json({ creator: null });
    }

    // 2. Find their creator record in KV (linked via ownerUserId)
    const creators = (await kv.get<any[]>(CREATORS_KEY)) || [];
    const creator = creators.find((c: any) => c.ownerUserId === userId) || null;

    return NextResponse.json({ creator });
  } catch (e: any) {
    console.error("GET /api/me/creator error:", e);
    return NextResponse.json({ creator: null });
  }
}
