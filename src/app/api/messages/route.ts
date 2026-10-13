import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const MAX_BODY = 2000;

// POST /api/messages — { senderId, creatorId, body }
export async function POST(req: Request) {
  try {
    const { senderId, creatorId, body } = await req.json();

    if (!senderId || !creatorId || !body) {
      return NextResponse.json(
        { error: "senderId, creatorId, body required" },
        { status: 400 }
      );
    }

    const trimmed = String(body).trim();
    if (trimmed.length === 0) {
      return NextResponse.json({ error: "Message is empty" }, { status: 400 });
    }
    if (trimmed.length > MAX_BODY) {
      return NextResponse.json(
        { error: `Message too long (max ${MAX_BODY} chars)` },
        { status: 400 }
      );
    }

    // Rate limit: 1 message per 30s per sender→creator
    const cutoff = new Date(Date.now() - 30_000).toISOString();
    const { data: recent } = await supabaseAdmin
      .from("podcaster_messages")
      .select("id")
      .eq("sender_id", senderId)
      .eq("creator_id", Number(creatorId))
      .gte("created_at", cutoff)
      .limit(1);

    if (recent && recent.length > 0) {
      return NextResponse.json(
        { error: "Please wait a moment before sending another message." },
        { status: 429 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("podcaster_messages")
      .insert({
        sender_id: senderId,
        creator_id: Number(creatorId),
        body: trimmed,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, message: data });
  } catch (e: any) {
    console.error("POST messages error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// GET /api/messages?creator_id=X  → inbox for a creator
// Optional: &unread=1 → only unread
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const creatorId = searchParams.get("creator_id");
    const unreadOnly = searchParams.get("unread") === "1";

    if (!creatorId) {
      return NextResponse.json({ messages: [] });
    }

    let query = supabaseAdmin
      .from("podcaster_messages")
      .select("id, sender_id, creator_id, body, created_at, read_at")
      .eq("creator_id", Number(creatorId))
      .order("created_at", { ascending: false })
      .limit(200);

    if (unreadOnly) query = query.is("read_at", null);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ messages: data || [] });
  } catch (e: any) {
    console.error("GET messages error:", e);
    return NextResponse.json({ messages: [] });
  }
}

// PATCH /api/messages — { id, read?: boolean } mark read/unread
export async function PATCH(req: Request) {
  try {
    const { id, read } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("podcaster_messages")
      .update({ read_at: read === false ? null : new Date().toISOString() })
      .eq("id", Number(id));

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("PATCH messages error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
