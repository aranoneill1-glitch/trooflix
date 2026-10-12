import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function getUserIdFromCookies(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

export async function GET() {
  try {
    const userId = await getUserIdFromCookies();
    if (!userId) return NextResponse.json({ ids: [] });

    const { data, error } = await supabaseAdmin
      .from("my_list")
      .select("video_id")
      .eq("user_id", userId);

    if (error) throw error;
    return NextResponse.json({ ids: (data || []).map((r: any) => r.video_id) });
  } catch (e: any) {
    console.error("GET my-list error:", e);
    return NextResponse.json({ ids: [] });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getUserIdFromCookies();
    if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const { videoId } = await req.json();
    if (!videoId) return NextResponse.json({ error: "videoId required" }, { status: 400 });

    const { error } = await supabaseAdmin
      .from("my_list")
      .insert({ user_id: userId, video_id: Number(videoId) });

    if (error) {
      if (error.code === "23505") return NextResponse.json({ ok: true, alreadySaved: true });
      throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("POST my-list error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = await getUserIdFromCookies();
    if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get("videoId");
    if (!videoId) return NextResponse.json({ error: "videoId required" }, { status: 400 });

    const { error } = await supabaseAdmin
      .from("my_list")
      .delete()
      .eq("user_id", userId)
      .eq("video_id", Number(videoId));

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("DELETE my-list error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
