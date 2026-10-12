import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // 1. Diagnostic: what env vars does this function see?
    const envCheck = {
      hasUrl: !!url,
      urlPrefix: url?.slice(0, 30),
      hasServiceKey: !!key,
      keyPrefix: key?.slice(0, 12),
      keyLength: key?.length,
    };

    // 2. Who is the user?
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ step: "auth", error: "Not signed in", envCheck }, { status: 401 });
    }

    const { videoId } = await req.json();
    if (!videoId) {
      return NextResponse.json({ step: "parse", error: "videoId required", envCheck }, { status: 400 });
    }

    // 3. Try the insert with the service role client
    const supabaseAdmin = createServerClient(url!, key!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await supabaseAdmin
      .from("my_list")
      .insert({ user_id: user.id, video_id: Number(videoId) })
      .select();

    if (error) {
      return NextResponse.json({
        step: "insert",
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        envCheck,
      }, { status: 500 });
    }

    return NextResponse.json({ step: "success", inserted: data, envCheck });
  } catch (e: any) {
    return NextResponse.json({
      step: "exception",
      error: String(e),
      message: e?.message,
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ids: [] });
}

export async function DELETE() {
  return NextResponse.json({ ok: true });
}
