import { NextResponse } from "next/server";
import { requireUser, assertSelf } from "@/lib/api-auth";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const mismatch = assertSelf(auth.user, userId);
  if (mismatch) return mismatch;

  const { data: wallet } = await supabaseAdmin.from("wallets").select("balance").eq("user_id", userId).single();
  const { data: transactions } = await supabaseAdmin.from("transactions").select("*").or(`sender_id.eq.${userId},receiver_id.eq.${userId}`).order("created_at", { ascending: false }).limit(20);

  if (transactions && transactions.length > 0) { const uids = new Set(); transactions.forEach(t => { if (t.sender_id) uids.add(t.sender_id); if (t.receiver_id) uids.add(t.receiver_id); }); const { data: profiles } = await supabaseAdmin.from("profiles").select("user_id, username, display_name").in("user_id", Array.from(uids)); const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []); const enriched = transactions.map(t => ({ ...t, sender_name: profileMap.get(t.sender_id)?.username || profileMap.get(t.sender_id)?.display_name || "User", receiver_name: profileMap.get(t.receiver_id)?.username || profileMap.get(t.receiver_id)?.display_name || "User" })); return NextResponse.json({ balance: wallet?.balance || 0, transactions: enriched }); } return NextResponse.json({ balance: wallet?.balance || 0, transactions: transactions || [] });
}
