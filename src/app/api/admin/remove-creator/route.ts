import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { kv } from "@vercel/kv";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const CREATORS_KEY = "trooflix:creators";

export async function POST(req: Request) {
  try {
    // Admin auth
    const cookieStore = await cookies();
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminCookie = cookieStore.get("trooflix_admin")?.value;
    const isAdmin = adminPassword && adminCookie === adminPassword;

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { creatorId } = await req.json();
    if (!creatorId) {
      return NextResponse.json({ error: "creatorId required" }, { status: 400 });
    }

    const id = Number(creatorId);

    // Find the creator record to get ownerUserId (needed to clean creator_applications)
    const creators = (await kv.get<any[]>(CREATORS_KEY)) || [];
    const target = creators.find((c: any) => Number(c.id) === id);

    // Remove from KV
    const filtered = creators.filter((c: any) => Number(c.id) !== id);
    await kv.set(CREATORS_KEY, filtered);

    // Remove creator_applications row (by user_id from the deleted creator)
    let appDeleted = 0;
    if (target?.ownerUserId) {
      const { data: deleted } = await supabaseAdmin
        .from("creator_applications")
        .delete()
        .eq("user_id", target.ownerUserId)
        .select("id");
      appDeleted = deleted?.length || 0;
    }

    return NextResponse.json({
      ok: true,
      removedCreator: target?.name || null,
      remainingCreators: filtered.length,
      applicationRowsDeleted: appDeleted,
    });
  } catch (e: any) {
    console.error("remove-creator error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
