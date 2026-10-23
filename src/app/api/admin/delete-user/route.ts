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

export async function POST(req: Request) {
  try {
    // 1. Auth check
    const cookieStore = await cookies();
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminCookie = cookieStore.get("trooflix_admin")?.value;
    if (!adminPassword || adminCookie !== adminPassword) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    // 2. Remove from Vercel KV (Creators list)
    try {
      const creators = (await kv.get<any[]>(CREATORS_KEY)) || [];
      // Filter out any creator record owned by this user
      const filteredCreators = creators.filter(
        (c: any) => String(c.ownerUserId) !== String(userId)
      );
      if (filteredCreators.length !== creators.length) {
        await kv.set(CREATORS_KEY, filteredCreators);
        console.log(`[admin] Removed creator record for user ${userId} from KV`);
      }
    } catch (kvError) {
      console.warn("KV cleanup failed (continuing with Supabase delete):", kvError);
    }

    // 3. Delete the user's profile
    await supabaseAdmin.from("profiles").delete().eq("user_id", userId);

    // 4. Delete the Auth account (this cascades to videos, comments, etc.)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;

    return NextResponse.json({ ok: true, message: "User fully deleted from Auth, Database, and KV." });
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
