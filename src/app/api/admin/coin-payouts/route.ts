import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function isAdmin() {
  const cookieStore = await cookies();
  return cookieStore.get("trooflix_admin")?.value === process.env.ADMIN_PASSWORD;
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data } = await supabaseAdmin.from("transactions").select("*, profiles: sender_id(username)").eq("type", "payout").eq("status", "pending").order("created_at", { ascending: false });
  
  const formatted = (data || []).map(p => ({ ...p, username: (p.profiles as any)?.username }));
  return NextResponse.json({ payouts: formatted });
}

export async function PATCH(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  await supabaseAdmin.from("transactions").update({ status: "completed" }).eq("id", id);
  return NextResponse.json({ success: true });
}