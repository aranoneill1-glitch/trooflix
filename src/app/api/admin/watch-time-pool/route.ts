import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient as createServerClient } from "@supabase/supabase-js";
import { kv } from "@vercel/kv";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const CREATORS_KEY = "trooflix:creators";

async function isAdmin() {
  const cookieStore = await cookies();
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminCookie = cookieStore.get("trooflix_admin")?.value;
  return adminPassword && adminCookie === adminPassword;
}

export async function GET(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const poolAmountCents = Number(searchParams.get("poolCents") || 100000); // Default $1,000

    // 1. Get all watch sessions for the current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: sessions, error } = await supabaseAdmin
      .from("video_watch_sessions")
      .select("creator_id, seconds_watched")
      .gte("created_at", startOfMonth.toISOString());

    if (error) throw error;

    // 2. Group by creator
    const watchTimeMap = new Map<number, number>();
    let totalPlatformSeconds = 0;

    for (const s of sessions || []) {
      const current = watchTimeMap.get(s.creator_id) || 0;
      watchTimeMap.set(s.creator_id, current + s.seconds_watched);
      totalPlatformSeconds += s.seconds_watched;
    }

    // 3. Get creator names from KV
    const creators = (await kv.get<any[]>(CREATORS_KEY)) || [];
    const creatorMap = new Map(creators.map(c => [Number(c.id), c.name]));

    // 4. Calculate earnings
    const rows = Array.from(watchTimeMap.entries()).map(([creatorId, seconds]) => {
      const percentage = totalPlatformSeconds > 0 ? (seconds / totalPlatformSeconds) : 0;
      const earningsCents = Math.floor(poolAmountCents * percentage);
      
      return {
        creator_id: creatorId,
        name: creatorMap.get(creatorId) || "Unknown Creator",
        total_seconds: seconds,
        total_minutes: Math.floor(seconds / 60),
        share_percentage: (percentage * 100).toFixed(2),
        earnings_cents: earningsCents,
      };
    }).sort((a, b) => b.total_seconds - a.total_seconds);

    return NextResponse.json({
      total_platform_seconds: totalPlatformSeconds,
      total_platform_minutes: Math.floor(totalPlatformSeconds / 60),
      pool_amount_cents: poolAmountCents,
      rows,
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
