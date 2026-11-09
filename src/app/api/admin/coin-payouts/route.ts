import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function isAdmin() {
  const cookieStore = await cookies();
  return cookieStore.get("trooflix_admin")?.value === process.env.ADMIN_PASSWORD;
}

export async function GET() {
  try {
    if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    // 1. Fetch pending payouts
    const { data: txs, error } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("type", "payout")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Admin Payouts GET Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!txs || txs.length === 0) {
      return NextResponse.json({ payouts: [] });
    }

    // 2. Fetch the profiles for these user IDs separately
    const userIds = [...new Set(txs.map(t => t.sender_id).filter(Boolean))];
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("user_id, username, display_name")
      .in("user_id", userIds);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    // 3. Merge them together
    const formatted = txs.map(t => {
      const profile = profileMap.get(t.sender_id);
      return {
        ...t,
        username: profile?.username || profile?.display_name || t.sender_id
      };
    });

    return NextResponse.json({ payouts: formatted });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await req.json();
    const { error } = await supabaseAdmin.from("transactions").update({ status: "completed" }).eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}