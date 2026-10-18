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
    const videos = (await kv.get<any[]>(VIDEOS_KEY)) || [];
    const post = videos.find((v: any) => Number(v.id) === Number(videoId));
    if (!post) return null;
    if (post.uploaderUserId) return post.uploaderUserId;
    if (post.creatorId) {
      const creators = (await kv.get<any[]>(CREATORS_KEY)) || [];
      const creator = creators.find((c: any) => Number(c.id) === Number(post.creatorId));
      if (creator?.ownerUserId) return creator.ownerUserId;
    }
    return null;
  } catch {
    return null;
  }
}

// GET /api/reposts?user_id=X  → list of post IDs the user has reposted
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");
    if (!userId) return NextResponse.json({ ids: [] });

    const { data, error } = await supabaseAdmin
      .from("reposts")
      .select("post_id")
      .eq("user_id", userId);

    if (error) throw error;
    return NextResponse.json({ ids: (data || []).map((r: any) => Number(r.post_id)) });
  } catch (e: any) {
    console.error("GET reposts error:", e);
    return NextResponse.json({ ids: [] });
  }
}

// POST /api/reposts — { userId, postId } — toggle repost
export async function POST(req: Request) {
  try {
    const { userId, postId } = await req.json();
    if (!userId || !postId) {
      return NextResponse.json({ error: "userId and postId required" }, { status: 400 });
    }

    const pid = Number(postId);

    // Check if already reposted
    const { data: existing } = await supabaseAdmin
      .from("reposts")
      .select("id")
      .eq("user_id", userId)
      .eq("post_id", pid)
      .maybeSingle();

    if (existing) {
      // Un-repost
      await supabaseAdmin.from("reposts").delete().eq("id", existing.id);
      return NextResponse.json({ ok: true, reposted: false });
    }

    // Repost
    const { error } = await supabaseAdmin
      .from("reposts")
      .insert({ user_id: userId, post_id: pid });
    if (error) throw error;

    // Fire notification to post owner (skip self)
    try {
      const ownerId = await findPostOwner(pid);
      if (ownerId && ownerId !== userId) {
        await supabaseAdmin.from("notifications").insert({
          user_id: ownerId,
          actor_id: userId,
          type: "repost",
          post_id: pid,
        });
      }
    } catch (err) {
      console.warn("repost notification failed:", err);
    }

    return NextResponse.json({ ok: true, reposted: true });
  } catch (e: any) {
    console.error("POST reposts error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
