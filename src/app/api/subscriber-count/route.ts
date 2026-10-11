import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase.rpc("get_user_count");
    if (error) throw error;
    return NextResponse.json({ count: data ?? 0 });
  } catch (e) {
    console.error("subscriber-count error:", e);
    return NextResponse.json({ count: 0 });
  }
}
