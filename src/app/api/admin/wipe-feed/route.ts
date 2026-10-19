import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { kv } from "@vercel/kv";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const VIDEOS_KEY = "trooflix:videos";

export async function POST(req: Request) {
  try {
    // Auth: admin cookie required
    const cookieStore = await cookies();
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminCookie = cookieStore.get("trooflix_admin")?.value;
    const isAdmin = adminPassword && adminCookie === adminPassword;

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    if (body.confirmation !== "DELETE") {
      return NextResponse.json(
        { error: 'Type "DELETE" to confirm' },
        { status: 400 }
      );
    }

    const videos = (await kv.get<any[]>(VIDEOS_KEY)) || [];

    // Keep Loose Change (featured video, main hero)
    const looseChange = videos.find(
      (v: any) =>
        (v.title && v.title.toLowerCase().includes("loose change")) ||
        v.id === 1791745100023
    );

    if (looseChange) {
      looseChange.featured = true;
      await kv.set(VIDEOS_KEY, [looseChange]);
    } else {
      await kv.set(VIDEOS_KEY, []);
    }

    // Wipe related user data (best-effort — some tables may not exist in all environments)
    try {
      await Promise.all([
        supabaseAdmin.from("likes").delete().neq("id", 0),
        supabaseAdmin.from("dislikes").delete().neq("id", 0),
        supabaseAdmin.from("comments").delete().neq("id", 0),
        supabaseAdmin.from("comment_likes").delete().neq("id", 0),
        supabaseAdmin.from("views").delete().neq("id", 0),
        supabaseAdmin.from("my_list").delete().neq("id", 0),
        supabaseAdmin.from("reposts").delete().neq("id", 0),
        supabaseAdmin.from("notifications").delete().neq("id", 0),
      ]);
    } catch (err) {
      console.warn("Some cleanup tables failed (non-fatal):", err);
    }

    return NextResponse.json({
      ok: true,
      kept: looseChange ? 1 : 0,
      deleted: videos.length - (looseChange ? 1 : 0),
    });
  } catch (e: any) {
    console.error("wipe-feed error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
