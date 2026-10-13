import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET /api/follow-count?creator_id=X
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const creatorId = searchParams.get("creator_id");

    if (!creatorId) return NextResponse.json({ count: 0 });

    const { count, error } = await supabaseAdmin
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("creator_id", Number(creatorId));

    if (error) throw error;
    return NextResponse.json({ count: count || 0 });
  } catch (e: any) {
    console.error("GET follow-count error:", e);
    return NextResponse.json({ count: 0 });
  }
}
