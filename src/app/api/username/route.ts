import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const RESERVED = new Set([
  "admin", "support", "trooflix", "help", "root",
  "api", "login", "signup", "account", "messages", "settings",
]);

function validate(raw: string): { ok: true; handle: string } | { ok: false; error: string } {
  if (typeof raw !== "string") return { ok: false, error: "Username required" };
  const handle = raw.trim().toLowerCase().replace(/^@+/, "");
  if (handle.length < 3) return { ok: false, error: "At least 3 characters" };
  if (handle.length > 20) return { ok: false, error: "At most 20 characters" };
  if (!/^[a-z0-9_]+$/.test(handle)) return { ok: false, error: "Only a–z, 0–9, and _" };
  if (RESERVED.has(handle)) return { ok: false, error: "That username is reserved" };
  return { ok: true, handle };
}

// GET /api/username?check=aran            → is it free?
// GET /api/username?check=aran&for=USERID → is it free OR already mine?
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const check = searchParams.get("check") || "";
    const forUser = searchParams.get("for");

    const v = validate(check);
    if (!v.ok) return NextResponse.json({ available: false, error: v.error });

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .ilike("username", v.handle)
      .maybeSingle();

    if (error) throw error;

    if (!data) return NextResponse.json({ available: true, handle: v.handle });
    if (forUser && data.user_id === forUser) {
      return NextResponse.json({ available: true, handle: v.handle, mine: true });
    }
    return NextResponse.json({ available: false, handle: v.handle, error: "Taken" });
  } catch (e: any) {
    console.error("GET username error:", e);
    return NextResponse.json({ available: false, error: "Server error" }, { status: 500 });
  }
}

// POST /api/username — { userId, username } → claim it
export async function POST(req: Request) {
  try {
    const { userId, username } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const v = validate(username);
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .ilike("username", v.handle)
      .maybeSingle();

    if (existing && existing.user_id !== userId) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }

    const { data: mine } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (mine) {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ username: v.handle, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin
        .from("profiles")
        .insert({ user_id: userId, username: v.handle, updated_at: new Date().toISOString() });
      if (error) throw error;
    }

    return NextResponse.json({ ok: true, username: v.handle });
  } catch (e: any) {
    console.error("POST username error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
