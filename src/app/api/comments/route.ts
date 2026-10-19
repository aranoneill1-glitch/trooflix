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

// GET /api/comments?video_id=X&sort=newest|oldest|top
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get("video_id");
    const sort = searchParams.get("sort") || "newest";

    if (!videoId) {
      return NextResponse.json({ comments: [] });
    }

    // Fetch all comments for this video
    const { data: comments, error } = await supabaseAdmin
      .from("comments")
      .select("id, video_id, user_id, user_email, text, created_at, parent_id")
      .eq("video_id", Number(videoId));

    if (error) throw error;

    // Fetch like counts for these comments
    const commentIds = (comments || []).map((c: any) => c.id);
    let likeCounts: Record<number, number> = {};
    if (commentIds.length > 0) {
      const { data: likes } = await supabaseAdmin
        .from("comment_likes")
        .select("comment_id")
        .in("comment_id", commentIds);
      (likes || []).forEach((row: any) => {
        likeCounts[row.comment_id] = (likeCounts[row.comment_id] || 0) + 1;
      });
    }

    // Fetch profiles (avatars + display names) for these user_ids
    const userIds = Array.from(new Set((comments || []).map((c: any) => c.user_id)));
    const profiles: Record<
      string,
      { avatar_url: string | null; display_name: string | null; is_verified: boolean }
    > = {};
    if (userIds.length > 0) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("user_id, avatar_url, display_name, is_verified")
        .in("user_id", userIds);
      (profs || []).forEach((p: any) => {
        profiles[p.user_id] = {
          avatar_url: p.avatar_url || null,
          display_name: p.display_name || null,
          is_verified: !!p.is_verified,
        };
      });
    }

    // Attach counts + avatar + display name + verified flag
    const withCounts = (comments || []).map((c: any) => ({
      ...c,
      like_count: likeCounts[c.id] || 0,
      avatar_url: profiles[c.user_id]?.avatar_url || null,
      display_name: profiles[c.user_id]?.display_name || null,
      is_verified: profiles[c.user_id]?.is_verified ?? false,
    }));

    // Sort
    if (sort === "oldest") {
      withCounts.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sort === "top") {
      withCounts.sort((a: any, b: any) => {
        if (b.like_count !== a.like_count) return b.like_count - a.like_count;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    } else {
      // newest
      withCounts.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return NextResponse.json({ comments: withCounts });
  } catch (e: any) {
    console.error("GET comments error:", e);
    return NextResponse.json({ comments: [] });
  }
}

// POST /api/comments — { videoId, userId, userEmail, text, parentId? }
export async function POST(req: Request) {
  try {
    const { videoId, userId, userEmail, text, parentId } = await req.json();

    if (!videoId || !userId || !text) {
      return NextResponse.json(
        { error: "videoId, userId, and text are required" },
        { status: 400 }
      );
    }

    const trimmed = String(text).trim();
    if (trimmed.length === 0) {
      return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 });
    }
    if (trimmed.length > 500) {
      return NextResponse.json({ error: "Comment too long (max 500)" }, { status: 400 });
    }

    const insertRow: any = {
      video_id: Number(videoId),
      user_id: userId,
      user_email: userEmail || "",
      text: trimmed,
    };
    if (parentId) insertRow.parent_id = Number(parentId);

    const { data, error } = await supabaseAdmin
      .from("comments")
      .insert(insertRow)
      .select()
      .single();

    if (error) throw error;

    // Fire notification for post owner (skip self-comments)
    const ownerId = await findPostOwner(Number(videoId));
    if (ownerId && ownerId !== userId) {
      try {
        await supabaseAdmin.from("notifications").insert({
          user_id: ownerId,
          actor_id: userId,
          type: "comment",
          post_id: Number(videoId),
        });
      } catch (err) {
        console.warn("notification insert failed:", err);
      }
    }

    return NextResponse.json({ ok: true, comment: { ...data, like_count: 0 } });
  } catch (e: any) {
    console.error("POST comments error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE /api/comments?id=X&userId=Y
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const userId = searchParams.get("userId");

    if (!id || !userId) {
      return NextResponse.json({ error: "id and userId required" }, { status: 400 });
    }

    // Only allow delete if the comment belongs to the user
    const { data: existing } = await supabaseAdmin
      .from("comments")
      .select("user_id")
      .eq("id", Number(id))
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }
    if (existing.user_id !== userId) {
      return NextResponse.json({ error: "You can only delete your own comments" }, { status: 403 });
    }

    // Cascade: delete replies + comment likes too
    await supabaseAdmin.from("comments").delete().eq("parent_id", Number(id));
    await supabaseAdmin.from("comment_likes").delete().eq("comment_id", Number(id));

    const { error } = await supabaseAdmin
      .from("comments")
      .delete()
      .eq("id", Number(id));

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("DELETE comments error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE /api/comments?id=X&userId=Y — delete own comment
