import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ids: [] });
    }

    const { data, error } = await supabase
      .from("my_list")
      .select("video_id")
      .eq("user_id", user.id);

    if (error) throw error;

    const ids = (data || []).map((row: any) => row.video_id);
    return NextResponse.json({ ids });
  } catch (e: any) {
    console.error("GET my-list error:", e);
    return NextResponse.json({ ids: [] });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const { videoId } = await req.json();
    if (!videoId) {
      return NextResponse.json({ error: "videoId required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("my_list")
      .insert({ user_id: user.id, video_id: videoId });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ ok: true, alreadySaved: true });
      }
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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get("videoId");

    if (!videoId) {
      return NextResponse.json({ error: "videoId required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("my_list")
      .delete()
      .eq("user_id", user.id)
      .eq("video_id", Number(videoId));

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("DELETE my-list error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}