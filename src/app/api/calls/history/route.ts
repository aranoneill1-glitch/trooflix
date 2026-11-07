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
    if (!userId) return NextResponse.json({ calls: [] });

    // Fetch last 50 calls involving this user
    const { data: calls } = await supabaseAdmin
      .from("call_history")
      .select("*")
      .or(`caller_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!calls || calls.length === 0) return NextResponse.json({ calls: [] });

    // Get profiles for the "other" user in each call
    const otherIds = [...new Set(calls.map(c => c.caller_id === userId ? c.receiver_id : c.caller_id))];
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("user_id, display_name, username, avatar_url")
      .in("user_id", otherIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    const enriched = calls.map(c => {
      const isCaller = c.caller_id === userId;
      const otherId = isCaller ? c.receiver_id : c.caller_id;
      const other = profileMap.get(otherId);
      return {
        ...c,
        isCaller,
        otherName: other?.display_name || other?.username || "User",
        otherAvatar: other?.avatar_url || null,
        otherUserId: otherId,
      };
    });

    return NextResponse.json({ calls: enriched });
  } catch (e) {
    return NextResponse.json({ calls: [] });
  }
}
