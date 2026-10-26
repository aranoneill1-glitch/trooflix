import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";
import { kv } from "@vercel/kv";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const CREATORS_KEY = "trooflix:creators";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");
    if (!userId) return NextResponse.json({ ids: [] });

    const { data, error } = await supabaseAdmin.from("follows").select("creator_id").eq("follower_id", userId);
    if (error) throw error;
    return NextResponse.json({ ids: (data || []).map((r: any) => r.creator_id) });
  } catch (e: any) {
    return NextResponse.json({ ids: [] });
  }
}

export async function POST(req: Request) {
  try {
    const { userId, creatorId } = await req.json();
    if (!userId || !creatorId) return NextResponse.json({ error: "userId and creatorId required" }, { status: 400 });

    const { data: existing } = await supabaseAdmin.from("follows").select("id").eq("follower_id", userId).eq("creator_id", Number(creatorId)).maybeSingle();

    if (existing) {
      await supabaseAdmin.from("follows").delete().eq("id", existing.id);
      return NextResponse.json({ ok: true, following: false });
    } else {
      const { error } = await supabaseAdmin.from("follows").insert({ follower_id: userId, creator_id: Number(creatorId) });
      if (error) throw error;

      // Push Notification
      try {
        const creators = (await kv.get<any[]>(CREATORS_KEY)) || [];
        const creator = creators.find((c: any) => Number(c.id) === Number(creatorId));
        
        if (creator && creator.ownerUserId && creator.ownerUserId !== userId) {
          const { data: profile } = await supabaseAdmin.from("profiles").select("display_name, username").eq("user_id", userId).maybeSingle();
          const followerName = profile?.display_name || profile?.username || "Someone";

          await fetch(`${process.env.NEXT_PUBLIC_URL || "https://www.trooflixtv.com"}/api/push/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: creator.ownerUserId,
              title: "New Follower 🎉",
              body: `${followerName} started following you!`,
              url: `/podcaster/${creator.slug}`
            })
          });
        }
      } catch (err) {
        console.warn("Push notification failed", err);
      }

      return NextResponse.json({ ok: true, following: true });
    }
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
