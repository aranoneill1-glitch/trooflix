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

// Look up who owns a post. Returns the user_id to notify, or null.
async function findPostOwner(videoId: number): Promise<string | null> {
  try {
    const videos = (await kv.get<any[]>(VIDEOS_KEY)) || [];
    console.log("[findPostOwner] videos count:", videos.length, "looking for:", videoId);
    const post = videos.find((v: any) => Number(v.id) === Number(videoId));
    console.log("[findPostOwner] post found:", post ? "yes" : "no", post?.uploaderUserId || post?.creatorId);
    if (!post) return null;
    if (post.uploaderUserId) return post.uploaderUserId;
    if (post.creatorId) {
      const creators = (await kv.get<any[]>(CREATORS_KEY)) || [];
      const creator = creators.find((c: any) => Number(c.id) === Number(post.creatorId));
      if (creator?.ownerUserId) return creator.ownerUserId;
    }
    return null;
  } catch (err) {
    console.error("[findPostOwner] error:", err);
    return null;
  }
}

// GET: returns liked video IDs for a given user OR anon_id
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");
    const anonId = searchParams.get("anon_id");

    if (!userId && !anonId) {
      return NextResponse.json({ ids: [] });
    }

    let query = supabaseAdmin.from("likes").select("video_id");

    if (userId) {
      query = query.eq("user_id", userId);
    } else if (anonId) {
      query = query.eq("anon_id", anonId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      ids: (data || []).map((r: any) => r.video_id),
    });
  } catch (e: any) {
    console.error("GET likes error:", e);
    return NextResponse.json({ ids: [] });
  }
}

// POST: toggle a like. Body can include userId (for logged-in) or anonId (for anonymous).
export async function POST(req: Request) {
  try {
    const { userId, anonId, videoId } = await req.json();
    if (!videoId) {
      return NextResponse.json({ error: "videoId required" }, { status: 400 });
    }
    if (!userId && !anonId) {
      return NextResponse.json({ error: "userId or anonId required" }, { status: 400 });
    }

    const vid = Number(videoId);

    // Look for an existing like by this user OR anon_id on this video
    let findQuery = supabaseAdmin.from("likes").select("id").eq("video_id", vid);
    if (userId) {
      findQuery = findQuery.eq("user_id", userId);
    } else {
      findQuery = findQuery.eq("anon_id", anonId);
    }

    const { data: existing } = await findQuery.maybeSingle();

    if (existing) {
      // Unlike
      const { error } = await supabaseAdmin
        .from("likes")
        .delete()
        .eq("id", existing.id);
      if (error) throw error;
      return NextResponse.json({ ok: true, liked: false });
    } else {
      // Like
      const insertRow: any = { video_id: vid };
      if (userId) insertRow.user_id = userId;
      if (anonId) insertRow.anon_id = anonId;

      const { error } = await supabaseAdmin.from("likes").insert(insertRow);
      if (error) throw error;

      // Mutual exclusivity: remove any dislike for the same video by this user
      let dislikeQ = supabaseAdmin.from("dislikes").delete().eq("video_id", vid);
      if (userId) dislikeQ = dislikeQ.eq("user_id", userId);
      else if (anonId) dislikeQ = dislikeQ.eq("anon_id", anonId);
      await dislikeQ;

      // Fire a notification for the post owner (skip if user is liking their own post)
      if (userId) {
        const ownerId = await findPostOwner(vid);
        console.log("[like notification] ownerId:", ownerId, "userId:", userId, "skip?", !ownerId || ownerId === userId);
        if (ownerId && ownerId !== userId) {
          try {
            const result = await supabaseAdmin.from("notifications").insert({
              user_id: ownerId,
              actor_id: userId,
              type: "like",
              post_id: vid,
            });
            console.log("[like notification] insert result:", JSON.stringify(result));
          } catch (err) {
            console.error("[like notification] insert FAILED:", err);
          }
        }
      }

      return NextResponse.json({ ok: true, liked: true });
    }
  } catch (e: any) {
    console.error("POST likes error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
