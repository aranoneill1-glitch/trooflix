import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const MAX_BODY = 2000;

export async function POST(req: Request) {
  try {
    const { senderId, recipientId, body } = await req.json();

    if (!senderId || !recipientId || !body) return NextResponse.json({ error: "senderId, recipientId, body required" }, { status: 400 });
    if (senderId === recipientId) return NextResponse.json({ error: "You can't message yourself" }, { status: 400 });

    const trimmed = String(body).trim();
    if (trimmed.length === 0) return NextResponse.json({ error: "Message is empty" }, { status: 400 });
    if (trimmed.length > MAX_BODY) return NextResponse.json({ error: `Message too long` }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from("direct_messages")
      .insert({
        sender_id: senderId,
        recipient_id: recipientId,
        body: trimmed,
      })
      .select()
      .single();

    if (error) throw error;

    // Fetch sender name for the push notification
    const { data: profile } = await supabaseAdmin.from("profiles").select("display_name, username").eq("user_id", senderId).maybeSingle();
    const senderName = profile?.display_name || profile?.username || "Someone";

    // Push Notification
    try {
      await fetch(`${process.env.NEXT_PUBLIC_URL || "https://www.trooflixtv.com"}/api/push/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: recipientId,
          title: `New Message from ${senderName}`,
          body: trimmed.substring(0, 80) + (trimmed.length > 80 ? "..." : ""),
          url: `/messages/${senderId}`
        })
      });
    } catch (err) {
      console.warn("Push notification failed", err);
    }

    return NextResponse.json({ ok: true, message: data });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function GET(req: Request) {
  // ... (Keep existing GET logic)
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");
    const withUser = searchParams.get("with");

    if (!userId) return NextResponse.json({ messages: [] });

    if (withUser) {
      const { data, error } = await supabaseAdmin
        .from("direct_messages")
        .select("id, sender_id, recipient_id, body, created_at, read_at")
        .or(`and(sender_id.eq.${userId},recipient_id.eq.${withUser}),and(sender_id.eq.${withUser},recipient_id.eq.${userId})`)
        .order("created_at", { ascending: true })
        .limit(500);

      if (error) throw error;
      await supabaseAdmin.from("direct_messages").update({ read_at: new Date().toISOString() }).eq("sender_id", withUser).eq("recipient_id", userId).is("read_at", null);
      return NextResponse.json({ messages: data || [] });
    }

    const { data, error } = await supabaseAdmin
      .from("direct_messages")
      .select("id, sender_id, recipient_id, body, created_at, read_at")
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) throw error;

    const conversations = new Map<string, any>();
    for (const m of data || []) {
      const other = m.sender_id === userId ? m.recipient_id : m.sender_id;
      const existing = conversations.get(other);
      if (!existing) {
        let preview = m.body;
        if (m.body && m.body.startsWith("__REEL__:")) preview = "📹 Reel";
        else if (m.body && /^https?:\/\/.+\.(gif|jpe?g|png|webp)(\?|$)/i.test(m.body)) preview = "📷 Photo";

        conversations.set(other, {
          other_user_id: other,
          last_message: preview,
          last_at: m.created_at,
          unread_count: m.recipient_id === userId && !m.read_at ? 1 : 0,
          last_from_me: m.sender_id === userId,
        });
      } else if (m.recipient_id === userId && !m.read_at) {
        existing.unread_count += 1;
      }
    }
    return NextResponse.json({ conversations: Array.from(conversations.values()) });
  } catch (e: any) {
    return NextResponse.json({ messages: [], conversations: [] });
  }
}

export async function PATCH(req: Request) {
  // ... (Keep existing PATCH logic)
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const { error } = await supabaseAdmin.from("direct_messages").update({ read_at: new Date().toISOString() }).eq("id", Number(id));
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function PUT(req: Request) {
  // ... (Keep existing PUT logic)
  try {
    const { id, senderId, body } = await req.json();
    if (!id || !senderId || body === undefined) return NextResponse.json({ error: "Missing data" }, { status: 400 });
    const trimmed = String(body).trim();
    const { data: existing } = await supabaseAdmin.from("direct_messages").select("sender_id").eq("id", Number(id)).maybeSingle();
    if (!existing || existing.sender_id !== senderId) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    const { data, error } = await supabaseAdmin.from("direct_messages").update({ body: trimmed }).eq("id", Number(id)).select().single();
    if (error) throw error;
    return NextResponse.json({ ok: true, message: data });
  } catch (e: any) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function DELETE(req: Request) {
  // ... (Keep existing DELETE logic)
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const userId = searchParams.get("userId");
    if (!id || !userId) return NextResponse.json({ error: "Missing data" }, { status: 400 });
    const { data: existing } = await supabaseAdmin.from("direct_messages").select("sender_id").eq("id", Number(id)).maybeSingle();
    if (!existing || existing.sender_id !== userId) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    const { error } = await supabaseAdmin.from("direct_messages").delete().eq("id", Number(id));
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
