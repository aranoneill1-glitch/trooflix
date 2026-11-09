import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const { data } = await supabaseAdmin.from("payout_methods").select("*").eq("user_id", userId).maybeSingle();
  return NextResponse.json({ bankDetails: data || null });
}

export async function POST(req: Request) {
  try {
    const { userId, accountName, bankName, accountNumber, sortCode } = await req.json();
    if (!userId || !accountName || !bankName || !accountNumber) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("payout_methods").upsert({
      user_id: userId,
      account_name: accountName,
      bank_name: bankName,
      account_number: accountNumber,
      sort_code: sortCode || null,
      updated_at: new Date().toISOString()
    });

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}