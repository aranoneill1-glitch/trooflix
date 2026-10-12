import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json({ ids: [] });
    }

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
    const { userId, videoId } = await req.json();
    if (!userId || !videoId) {
      return NextResponse.json({ error: "userId and videoId required" }, { status: 400 });
    }

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
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");
    const videoId = searchParams.get("videoId");

    if (!userId || !videoId) {
      return NextResponse.json({ error: "userId and videoId required" }, { status: 400 });
    }

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
