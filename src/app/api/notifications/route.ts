import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) return NextResponse.json({ notifications: [] });

    const { data: notifications, error } = await supabaseAdmin
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("id", { ascending: false });

    if (error) throw error;
    if (!notifications || notifications.length === 0) return NextResponse.json({ notifications: [] });

    const actorIds = [...new Set(notifications.map(n => n.actor_id).filter(Boolean))];
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("user_id, display_name, username, avatar_url")
      .in("user_id", actorIds);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    const enriched = notifications.map(n => {
      const actor = profileMap.get(n.actor_id);
      const title = n.title || (n.type === "like" ? "New like" : n.type === "comment" ? "New comment" : n.type === "follow" ? "New follower" : n.type === "purchase" ? "New order" : "Notification");
      const message = n.message || (n.type === "like" ? "Someone liked your post" : n.type === "comment" ? "Someone commented on your post" : n.type === "follow" ? "Someone started following you" : "");
      return {
        ...n,
        sender_avatar: actor ? (actor.avatar_url || null) : null,
        actor_name: actor ? (actor.display_name || actor.username || "Someone") : "Someone",
        title,
        message,
      };
    });

    return NextResponse.json({ notifications: enriched });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}