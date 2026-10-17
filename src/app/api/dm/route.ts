import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const MAX_BODY = 2000;

// POST /api/dm — { senderId, recipientId, body }
export async function POST(req: Request) {
  try {
    const { senderId, recipientId, body } = await req.json();

    if (!senderId || !recipientId || !body) {
      return NextResponse.json(
        { error: "senderId, recipientId, body required" },
        { status: 400 }
      );
    }
    if (senderId === recipientId) {
      return NextResponse.json(
        { error: "You can't message yourself" },
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

    return NextResponse.json({ ok: true, message: data });
  } catch (e: any) {
    console.error("POST dm error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// GET /api/dm?user_id=X&with=Y   → thread between X and Y (marks Y→X as read)
// GET /api/dm?user_id=X          → inbox: list of conversations, newest first
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");
    const withUser = searchParams.get("with");

    if (!userId) return NextResponse.json({ messages: [] });

    // --- Thread mode ---
    if (withUser) {
      const { data, error } = await supabaseAdmin
        .from("direct_messages")
        .select("id, sender_id, recipient_id, body, created_at, read_at")
        .or(
          `and(sender_id.eq.${userId},recipient_id.eq.${withUser}),and(sender_id.eq.${withUser},recipient_id.eq.${userId})`
        )
        .order("created_at", { ascending: true })
        .limit(500);

      if (error) throw error;

      // Mark incoming as read
      await supabaseAdmin
        .from("direct_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("sender_id", withUser)
        .eq("recipient_id", userId)
        .is("read_at", null);

      return NextResponse.json({ messages: data || [] });
    }

    // --- Inbox mode ---
    // Pull all messages involving this user, ordered newest first
    const { data, error } = await supabaseAdmin
      .from("direct_messages")
      .select("id, sender_id, recipient_id, body, created_at, read_at")
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) throw error;

    // Collapse into conversations
    const conversations = new Map<
      string,
      {
        other_user_id: string;
        last_message: string;
        last_at: string;
        unread_count: number;
        last_from_me: boolean;
      }
    >();

    for (const m of data || []) {
      const other = m.sender_id === userId ? m.recipient_id : m.sender_id;
      const existing = conversations.get(other);
      if (!existing) {
        conversations.set(other, {
          other_user_id: other,
          last_message: m.body,
          last_at: m.created_at,
          unread_count:
            m.recipient_id === userId && !m.read_at ? 1 : 0,
          last_from_me: m.sender_id === userId,
        });
      } else if (m.recipient_id === userId && !m.read_at) {
        existing.unread_count += 1;
      }
    }

    return NextResponse.json({
      conversations: Array.from(conversations.values()),
    });
  } catch (e: any) {
    console.error("GET dm error:", e);
    return NextResponse.json({ messages: [], conversations: [] });
  }
}

// PATCH /api/dm — { id } mark a single message read
export async function PATCH(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const { error } = await supabaseAdmin
      .from("direct_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("id", Number(id));

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("PATCH dm error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PUT /api/dm — { id, senderId, body } — edit a message (only sender can edit)
export async function PUT(req: Request) {
  try {
    const { id, senderId, body } = await req.json();
    if (!id || !senderId || body === undefined) {
      return NextResponse.json({ error: "id, senderId, body required" }, { status: 400 });
    }

    const trimmed = String(body).trim();
    if (trimmed.length === 0) {
      return NextResponse.json({ error: "Message is empty" }, { status: 400 });
    }
    if (trimmed.length > MAX_BODY) {
      return NextResponse.json({ error: `Max ${MAX_BODY} chars` }, { status: 400 });
    }

    // Verify ownership
    const { data: existing } = await supabaseAdmin
      .from("direct_messages")
      .select("sender_id")
      .eq("id", Number(id))
      .maybeSingle();

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.sender_id !== senderId) {
      return NextResponse.json({ error: "Cannot edit someone else's message" }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("direct_messages")
      .update({ body: trimmed })
      .eq("id", Number(id))
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, message: data });
  } catch (e: any) {
    console.error("PUT dm error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE /api/dm — { id, userId } — delete a message (only sender can delete)
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const userId = searchParams.get("userId");

    if (!id || !userId) {
      return NextResponse.json({ error: "id and userId required" }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin
      .from("direct_messages")
      .select("sender_id")
      .eq("id", Number(id))
      .maybeSingle();

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.sender_id !== userId) {
      return NextResponse.json({ error: "Cannot delete someone else's message" }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from("direct_messages")
      .delete()
      .eq("id", Number(id));

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("DELETE dm error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
