import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    // 1. Get my profile info (need creator_id for subs)
    const { data: myProfile } = await supabase.from("profiles").select("creator_id").eq("user_id", userId).single();
    const myCreatorId = myProfile?.creator_id || userId;

    // 2. Get my videos to check for likes/comments
    const { data: myVideos } = await supabase.from("videos").select("id, title").eq("uploaderUserId", userId);
    const videoIds = myVideos?.map(v => v.id) || [];

    // 3. Fetch ALL different types of activity in parallel
    const [
      { data: likes },
      { data: comments },
      { data: follows },
      { data: subs },
      { data: liveUsers },
      { data: followedUsers }
    ] = await Promise.all([
      // Likes on my videos
      videoIds.length > 0 ? supabase.from("likes").select("created_at, user_id, video_id").in("video_id", videoIds) : { data: [] },
      // Comments on my videos
      videoIds.length > 0 ? supabase.from("comments").select("created_at, user_id, video_id, text").in("video_id", videoIds) : { data: [] },
      // People following me
      supabase.from("follows").select("created_at, follower_id").eq("following_id", userId),
      // New subscribers
      supabase.from("creator_subscriptions").select("created_at, subscriber_user_id").eq("creator_id", myCreatorId),
      // People I follow who are LIVE right now
      supabase.from("profiles").select("user_id, display_name, avatar_url").eq("is_live", true),
      // People I follow (to get their new videos)
      supabase.from("follows").select("following_id").eq("follower_id", userId)
    ]);

    // Get profiles for everyone involved so we have names/avatars
    const allUserIds = new Set<string>();
    likes?.forEach(l => allUserIds.add(l.user_id));
    comments?.forEach(c => allUserIds.add(c.user_id));
    follows?.forEach(f => allUserIds.add(f.follower_id));
    subs?.forEach(s => allUserIds.add(s.subscriber_user_id));
    followedUsers?.forEach(f => allUserIds.add(f.following_id));
    liveUsers?.forEach(u => allUserIds.add(u.user_id));

    const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url, is_live").in("user_id", Array.from(allUserIds));
    const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

    // Get new videos from people I follow
    const followingIds = followedUsers?.map(f => f.following_id) || [];
    const { data: newVideos } = followingIds.length > 0 
      ? await supabase.from("videos").select("id, title, created_at, uploaderUserId").in("uploaderUserId", followingIds).order("created_at", { ascending: false }).limit(10)
      : { data: [] };

    // Format everything into a unified notification array
    const notifications: any[] = [];

    likes?.forEach(like => {
      const p = profileMap.get(like.user_id);
      if (p && like.user_id !== userId) {
        notifications.push({
          id: `like-${like.created_at}-${like.user_id}`,
          type: "like",
          title: `${p.display_name} liked your post`,
          message: myVideos?.find(v => v.id === like.video_id)?.title || "your video",
          created_at: like.created_at,
          sender_avatar: p.avatar_url,
          is_read: false
        });
      }
    });

    comments?.forEach(comment => {
      const p = profileMap.get(comment.user_id);
      if (p && comment.user_id !== userId) {
        notifications.push({
          id: `comment-${comment.created_at}-${comment.user_id}`,
          type: "comment",
          title: `${p.display_name} commented on your post`,
          message: comment.text || "a new comment",
          created_at: comment.created_at,
          sender_avatar: p.avatar_url,
          is_read: false
        });
      }
    });

    follows?.forEach(follow => {
      const p = profileMap.get(follow.follower_id);
      if (p) {
        notifications.push({
          id: `follow-${follow.created_at}-${follow.follower_id}`,
          type: "follow",
          title: `${p.display_name} started following you`,
          message: "You have a new follower.",
          created_at: follow.created_at,
          sender_avatar: p.avatar_url,
          is_read: false
        });
      }
    });

    subs?.forEach(sub => {
      const p = profileMap.get(sub.subscriber_user_id);
      if (p) {
        notifications.push({
          id: `sub-${sub.created_at}-${sub.subscriber_user_id}`,
          type: "system",
          title: `${p.display_name} subscribed to you!`,
          message: "You have a new paying subscriber.",
          created_at: sub.created_at,
          sender_avatar: p.avatar_url,
          is_read: false
        });
      }
    });

    liveUsers?.forEach(liveUser => {
      // Only notify if I follow them
      if (followingIds.includes(liveUser.user_id) && liveUser.user_id !== userId) {
        notifications.push({
          id: `live-${liveUser.user_id}`,
          type: "follow", // Reusing follow icon for live
          title: `${liveUser.display_name} is LIVE now!`,
          message: "Tap to join the live stream.",
          created_at: new Date().toISOString(),
          sender_avatar: liveUser.avatar_url,
          is_read: false
        });
      }
    });

    newVideos?.forEach(video => {
      const p = profileMap.get(video.uploaderUserId);
      if (p) {
        notifications.push({
          id: `video-${video.id}`,
          type: "comment", // Reusing comment icon for new video
          title: `${p.display_name} posted a new video`,
          message: video.title,
          created_at: video.created_at,
          sender_avatar: p.avatar_url,
          is_read: false
        });
      }
    });

    // Sort by date (newest first)
    notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ notifications });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
