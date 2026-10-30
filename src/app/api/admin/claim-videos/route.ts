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
    let videos = (await kv.get<any[]>(KEY)) || [];
    let claimedCount = 0;

    // 1. Get your exact user UUID and numeric creator ID
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("username", "ssecommodityacademy")
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const targetUserId = profile.user_id;
    
    // Calculate the numeric creator ID (using the same logic as your app)
    const uuidHex = String(targetUserId).replace(/-/g, "").slice(0, 12);
    const targetCreatorId = parseInt(uuidHex, 16) || 0;

    // 2. Force every video to belong to this user
    videos = videos.map((v: any) => {
      claimedCount++;
      return { 
        ...v, 
        uploaderUserId: targetUserId,
        creatorId: targetCreatorId
      };
    });

    await kv.set(KEY, videos);

    return NextResponse.json({ 
      success: true, 
      message: `Successfully forced ${claimedCount} videos to belong to ssecommodityacademy.`,
      userId: targetUserId,
      creatorId: targetCreatorId
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
