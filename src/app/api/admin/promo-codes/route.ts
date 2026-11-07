import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function isAuthed() {
  const cookieStore = await cookies();
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminCookie = cookieStore.get("trooflix_admin")?.value;
  return !!adminPassword && adminCookie === adminPassword;
}

export async function GET() {
  if (!(await isAuthed())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("promo_codes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ codes: data || [] });
}

export async function POST(req: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const cleanCode = String(body.code || "").trim().toUpperCase();
    const grantsTier = body.grants_tier;
    const maxUses = body.max_uses ? Number(body.max_uses) : null;

    if (!cleanCode || cleanCode.length < 3) {
      return NextResponse.json({ error: "Code must be at least 3 characters" }, { status: 400 });
    }
    if (!["plus", "creator"].includes(grantsTier)) {
      return NextResponse.json({ error: "Tier must be plus or creator" }, { status: 400 });
    }
    if (maxUses !== null && (isNaN(maxUses) || maxUses < 1)) {
      return NextResponse.json({ error: "Max uses must be a positive number" }, { status: 400 });
    }

    // Check for duplicate
    const { data: existing } = await supabaseAdmin
      .from("promo_codes")
      .select("id")
      .eq("code", cleanCode)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Code already exists" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("promo_codes")
      .insert({
        code: cleanCode,
        grants_tier: grantsTier,
        max_uses: maxUses,
        is_active: true,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ code: data });
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
