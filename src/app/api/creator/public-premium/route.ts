import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const creatorId = searchParams.get("creatorId");
  if (!creatorId) return NextResponse.json({ enabled: false });

  try {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("premium_enabled, premium_price_cents")
      .eq("creator_id", creatorId)
      .maybeSingle();

    if (data?.premium_enabled) {
      return NextResponse.json({ enabled: true, price_cents: data.premium_price_cents });
    }
    return NextResponse.json({ enabled: false });
  } catch (e) {
    return NextResponse.json({ enabled: false });
  }
}
