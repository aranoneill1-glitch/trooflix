import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";
import { kv } from "@vercel/kv";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const VIDEOS_KEY = "trooflix:videos";
const CREATORS_KEY = "trooflix:creators";

async function findPostOwner(videoId: number): Promise<string | null> {
  try {
    // 1. Try KV first
    const videos = (await kv.get<any[]>(VIDEOS_KEY)) || [];
    const post = videos.find((v: any) => Number(v.id) === Number(videoId));
    
    if (post) {
      if (post.uploaderUserId) return post.uploaderUserId;
      if (post.creatorId) {
        const creators = (await kv.get<any[]>(CREATORS_KEY)) || [];
        const creator = creators.find((c: any) => Number(c.id) === Number(post.creatorId));
        if (creator?.ownerUserId) return creator.ownerUserId;
      }
    }

    // 2. Fallback to Supabase videos table if KV fails
    const { data: dbVideo } = await supabaseAdmin.from("videos").select("uploader_user_id, creator_id").eq("id", videoId).maybeSingle();
    if (dbVideo?.uploader_user_id) return dbVideo.uploader_user_id;

    return null;
  } catch (err) {
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");
    const anonId = searchParams.get("anon_id");

    if (!userId && !anonId) return NextResponse.json({ ids: [] });

    let query = supabaseAdmin.from("likes").select("video_id");
    if (userId) query = query.eq("user_id", userId);
    else if (anonId) query = query.eq("anon_id", anonId);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ ids: (data || []).map((r: any) => r.video_id) });
  } catch (e: any) {
    return NextResponse.json({ ids: [] });
  }
}

export async function POST(req: Request) {
  try {
    const { userId, anonId, videoId } = await req.json();
    if (!videoId) return NextResponse.json({ error: "videoId required" }, { status: 400 });
    if (!userId && !anonId) return NextResponse.json({ error: "userId or anonId required" }, { status: 400 });

    const vid = Number(videoId);
    let findQuery = supabaseAdmin.from("likes").select("id").eq("video_id", vid);
    if (userId) findQuery = findQuery.eq("user_id", userId);
    else findQuery = findQuery.eq("anon_id", anonId);

    const { data: existing } = await findQuery.maybeSingle();

    if (existing) {
      await supabaseAdmin.from("likes").delete().eq("id", existing.id);
      return NextResponse.json({ ok: true, liked: false });
    } else {
      const insertRow: any = { video_id: vid };
      if (userId) insertRow.user_id = userId;
      if (anonId) insertRow.anon_id = anonId;

      const { error } = await supabaseAdmin.from("likes").insert(insertRow);
      if (error) throw error;

      let dislikeQ = supabaseAdmin.from("dislikes").delete().eq("video_id", vid);
      if (userId) dislikeQ = dislikeQ.eq("user_id", userId);
      else if (anonId) dislikeQ = dislikeQ.eq("anon_id", anonId);
      await dislikeQ;

      if (userId) {
        const ownerId = await findPostOwner(vid);
        console.log(`[Like] User ${userId} liked video ${vid}. Owner found: ${ownerId}`);
        
        if (ownerId && ownerId !== userId) {
          try {
            await supabaseAdmin.from("notifications").insert({ user_id: ownerId, actor_id: userId, type: "like", post_id: vid });
            
            // Fetch liker's name for the push notification
            const { data: profile } = await supabaseAdmin.from("profiles").select("display_name, username").eq("user_id", userId).maybeSingle();
            const likerName = profile?.display_name || profile?.username || "Someone";

            await fetch(`${process.env.NEXT_PUBLIC_URL || "https://www.trooflixtv.com"}/api/push/send`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: ownerId,
                title: `${likerName} ❤️`,
                body: `liked your post`,
                url: `/feed?reel=${vid}`
              })
            });
            console.log(`[Like] Push sent successfully to ${ownerId}`);
          } catch (err) {
            console.error("[Like] Failed to insert notification or send push:", err);
          }
        } else {
          console.log(`[Like] Skipped notification (Liked own post or owner not found)`);
        }
      }
      return NextResponse.json({ ok: true, liked: true });
    }
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
