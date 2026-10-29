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

export async function POST() {
  try {
    // 1. Auth check — must match delete-user/route.ts pattern exactly
    const cookieStore = await cookies();
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminCookie = cookieStore.get("trooflix_admin")?.value;
    if (!adminPassword || adminCookie !== adminPassword) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Find all mock creators in the profiles table
    const { data: mocks, error: fetchError } = await supabaseAdmin
      .from("profiles")
      .select("user_id, username")
      .like("username", "mockcreator_%");

    if (fetchError) throw fetchError;
    if (!mocks || mocks.length === 0) {
      return NextResponse.json({ message: "No mock creators found to delete." });
    }

    // 3. Delete their auth accounts (cascades to profiles, my_list, likes, etc.)
    let deletedCount = 0;
    const errors = [];
    const deletedUserIds: string[] = [];

    for (const mock of mocks) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(mock.user_id);
      if (error) {
        errors.push(`${mock.username}: ${error.message}`);
      } else {
        deletedCount++;
        deletedUserIds.push(mock.user_id);
      }
    }

    // 4. Remove them from Vercel KV creators cache (mirrors delete-user/route.ts)
    if (deletedUserIds.length > 0) {
      try {
        const creators = (await kv.get<any[]>(CREATORS_KEY)) || [];
        const filtered = creators.filter(
          (c: any) => !deletedUserIds.includes(String(c.ownerUserId))
        );
        if (filtered.length !== creators.length) {
          await kv.set(CREATORS_KEY, filtered);
        }
      } catch (kvError) {
        console.warn("KV cleanup failed (auth deletes already succeeded):", kvError);
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Successfully deleted ${deletedCount} mock creators.`,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
