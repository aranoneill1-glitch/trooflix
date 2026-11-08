import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);


const KV_URL = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL)!;
const KV_TOKEN = (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN)!;
const VIDEOS_KEY = "trooflix:videos";
const CREATORS_KEY = "trooflix:creators";

async function findPostOwner(videoId: number): Promise<string | null> {
  try {
    // 1. Direct fetch to Upstash (bypassing broken SDK)
    const getRes = await fetch(`${KV_URL}/get/${VIDEOS_KEY}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` }
    });
    const getData = await getRes.json();
    
    let videos = [];
    if (getData.result) {
      let parsed = JSON.parse(getData.result);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.value) {
        parsed = typeof parsed.value === 'string' ? JSON.parse(parsed.value) : parsed.value;
      }
      if (Array.isArray(parsed)) videos = parsed;
    }

    const post = videos.find((v: any) => Number(v.id) === Number(videoId));
    if (!post) return null;

    // 2. Uploader ID
    if (post.uploaderUserId) return post.uploaderUserId;

    // 3. Creator ID lookup
    if (post.creatorId) {
      const cRes = await fetch(`${KV_URL}/get/${CREATORS_KEY}`, {
        headers: { Authorization: `Bearer ${KV_TOKEN}` }
      });
      const cData = await cRes.json();
      
      let creators = [];
      if (cData.result) {
        let parsed = JSON.parse(cData.result);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.value) {
          parsed = typeof parsed.value === 'string' ? JSON.parse(parsed.value) : parsed.value;
        }
        if (Array.isArray(parsed)) creators = parsed;
      }
      
      const creator = creators.find((c: any) => Number(c.id) === Number(post.creatorId));
      if (creator?.ownerUserId) return creator.ownerUserId;

      // 4. Guaranteed DB fallback
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("user_id")
        .eq("creator_id", Number(post.creatorId))
        .maybeSingle();
      if (profile?.user_id) return profile.user_id;
    }
    return null;
  } catch (e) {
    console.error("[findPostOwner] Error:", e);
    return null;
  }
}


export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get("video_id");
    const sort = searchParams.get("sort") || "newest";
    if (!videoId) return NextResponse.json({ comments: [] });

    const { data: comments, error } = await supabaseAdmin.from("comments").select("id, video_id, user_id, user_email, text, created_at, parent_id").eq("video_id", Number(videoId));
    if (error) throw error;

    const commentIds = (comments || []).map((c: any) => c.id);
    let likeCounts: Record<number, number> = {};
    if (commentIds.length > 0) {
      const { data: likes } = await supabaseAdmin.from("comment_likes").select("comment_id").in("comment_id", commentIds);
      (likes || []).forEach((row: any) => { likeCounts[row.comment_id] = (likeCounts[row.comment_id] || 0) + 1; });
    }

    const userIds = Array.from(new Set((comments || []).map((c: any) => c.user_id)));
    const profiles: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: profs } = await supabaseAdmin.from("profiles").select("user_id, avatar_url, display_name, is_verified, verification_tick").in("user_id", userIds);
      (profs || []).forEach((p: any) => { profiles[p.user_id] = { avatar_url: p.avatar_url || null, display_name: p.display_name || null, is_verified: !!p.is_verified, verification_tick: p.verification_tick || "none" }; });
    }

    const withCounts = (comments || []).map((c: any) => ({
      ...c, like_count: likeCounts[c.id] || 0, avatar_url: profiles[c.user_id]?.avatar_url || null, display_name: profiles[c.user_id]?.display_name || null, is_verified: profiles[c.user_id]?.is_verified ?? false, verification_tick: profiles[c.user_id]?.verification_tick || "none",
    }));

    if (sort === "oldest") withCounts.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    else if (sort === "top") withCounts.sort((a: any, b: any) => b.like_count - a.like_count || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    else withCounts.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ comments: withCounts });
  } catch (e: any) { return NextResponse.json({ comments: [] }); }
}

export async function POST(req: Request) {
  try {
    const { videoId, userId, userEmail, text, parentId } = await req.json();
    if (!videoId || !userId || !text) return NextResponse.json({ error: "Missing data" }, { status: 400 });
    const trimmed = String(text).trim();
    if (trimmed.length === 0 || trimmed.length > 500) return NextResponse.json({ error: "Invalid comment length" }, { status: 400 });

    const insertRow: any = { video_id: Number(videoId), user_id: userId, user_email: userEmail || "", text: trimmed };
    if (parentId) insertRow.parent_id = Number(parentId);

    const { data, error } = await supabaseAdmin.from("comments").insert(insertRow).select().single();
    if (error) throw error;

    const ownerId = await findPostOwner(Number(videoId));
    if (ownerId && ownerId !== userId) {
      try {
        // Fetch commenter name FIRST so we can use it in both DB and Push
        const { data: profile } = await supabaseAdmin.from("profiles").select("display_name, username").eq("user_id", userId).maybeSingle();
        const commenterName = profile?.display_name || profile?.username || "Someone";

        await supabaseAdmin.from("notifications").insert({ 
          user_id: ownerId, 
          actor_id: userId, 
          type: "comment", 
          post_id: Number(videoId), 
          title: "New comment", 
          message: `${commenterName} commented on your post` 
        });

        // Push Notification
        await fetch(`${process.env.NEXT_PUBLIC_URL || "https://www.trooflixtv.com"}/api/push/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: ownerId,
            title: `${commenterName} 💬`,
            body: `commented: "${trimmed.substring(0, 40)}${trimmed.length > 40 ? '...' : ''}"`,
            url: `/feed?reel=${videoId}`
          })
        });
      } catch (err) { console.warn("Notification failed:", err); }
    }

    let enriched: any = { ...data, like_count: 0 };
    try {
      const { data: prof } = await supabaseAdmin.from("profiles").select("avatar_url, display_name, is_verified, verification_tick").eq("user_id", userId).maybeSingle();
      if (prof) {
        enriched.avatar_url = prof.avatar_url || null;
        enriched.display_name = prof.display_name || null;
        enriched.is_verified = !!prof.is_verified;
        enriched.verification_tick = prof.verification_tick || "none";
      }
    } catch {}
    return NextResponse.json({ ok: true, comment: enriched });
  } catch (e: any) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const userId = searchParams.get("userId");
    if (!id || !userId) return NextResponse.json({ error: "Missing data" }, { status: 400 });
    const { data: existing } = await supabaseAdmin.from("comments").select("user_id").eq("id", Number(id)).maybeSingle();
    if (!existing || existing.user_id !== userId) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    await supabaseAdmin.from("comments").delete().eq("parent_id", Number(id));
    await supabaseAdmin.from("comment_likes").delete().eq("comment_id", Number(id));
    const { error } = await supabaseAdmin.from("comments").delete().eq("id", Number(id));
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
