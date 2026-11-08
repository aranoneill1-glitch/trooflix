import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

const KV_URL = process.env.UPSTASH_REDIS_REST_URL!;
const KV_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;

async function readVideos(): Promise<any[]> {
  try {
    const res = await fetch(`${KV_URL}/get/trooflix:videos`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.result) return [];
    let parsed = JSON.parse(data.result);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && (parsed as any).value) {
      parsed = typeof (parsed as any).value === "string" ? JSON.parse((parsed as any).value) : (parsed as any).value;
    }
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const VIDEOS_KEY = "trooflix:videos";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "all";
    const userId = searchParams.get("userId");

    const all = (await readVideos()).filter((v: any) => !v.hidden);

    all.sort((a: any, b: any) => {
      const at = a.createdAt ? new Date(a.createdAt).getTime() : a.id;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : b.id;
      return bt - at;
    });

    if (filter === "all" || !userId) {
      return NextResponse.json({ posts: all, filter: "all" });
    }

    if (filter === "following") {
      const [{ data: userFollows }, { data: creatorFollows }] = await Promise.all([
        supabaseAdmin
          .from("user_follows")
          .select("following_id")
          .eq("follower_id", userId),
        supabaseAdmin
          .from("follows")
          .select("creator_id")
          .eq("follower_id", userId),
      ]);

      const followingUserIds = new Set(
        (userFollows || []).map((r: any) => r.following_id)
      );
      const followedCreatorIds = new Set(
        (creatorFollows || []).map((r: any) => r.creator_id)
      );

      const filtered = all.filter((v: any) => {
        if (v.uploaderUserId === userId) return true;
        if (v.uploaderUserId && followingUserIds.has(v.uploaderUserId)) return true;
        if (v.creatorId && followedCreatorIds.has(v.creatorId)) return true;
        return false;
      });

      return NextResponse.json({ posts: filtered, filter: "following" });
    }

    return NextResponse.json({ error: "Invalid filter" }, { status: 400 });
  } catch (e: any) {
    console.error("feed GET error:", e);
    return NextResponse.json({ posts: [], error: String(e) }, { status: 500 });
  }
}
