import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const { data } = await supabaseAdmin.from("payout_methods").select("*").eq("user_id", userId).maybeSingle();
  return NextResponse.json({ bankDetails: data || null });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.userId || !body.payout_type) return NextResponse.json({ error: "Missing data" }, { status: 400 });

    const { error } = await supabaseAdmin.from("payout_methods").upsert({
      user_id: body.userId,
      payout_type: body.payout_type,
      account_name: body.accountName || null,
      bank_name: body.bankName || null,
      account_number: body.accountNumber || null,
      iban: body.iban || null,
      swift_bic: body.swiftBic || null,
      sort_code: body.sortCode || null,
      crypto_address: body.cryptoAddress || null,
      crypto_network: body.cryptoNetwork || null,
      updated_at: new Date().toISOString()
    });

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}