import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const KEY = "trooflix:videos";

export async function GET() {
  try {
    const videos = (await kv.get<any[]>(KEY)) || [];
    let claimedCount = 0;

    // The user is 'ssecommodityacademy'. 
    // We'll look up their Supabase user_id and assign all orphaned videos to them.
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("username", "ssecommodityacademy")
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const targetUserId = profile.user_id;

    const updatedVideos = videos.map((v: any) => {
      // If the video is missing the uploaderUserId or creatorId, claim it
      if (!v.uploaderUserId && (!v.creatorId || v.creatorId === 'null')) {
        claimedCount++;
        return { ...v, uploaderUserId: targetUserId };
      }
      return v;
    });

    await kv.set(KEY, updatedVideos);

    return NextResponse.json({ 
      success: true, 
      message: `Successfully claimed ${claimedCount} orphaned videos for ssecommodityacademy.`,
      userId: targetUserId
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
