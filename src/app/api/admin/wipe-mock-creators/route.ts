import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET() {
  try {
    // 1. Find all mock creators in the profiles table
    const { data: mocks, error: fetchError } = await supabaseAdmin
      .from("profiles")
      .select("user_id, username")
      .like("username", "mockcreator_%");

    if (fetchError) throw fetchError;
    if (!mocks || mocks.length === 0) {
      return NextResponse.json({ message: "No mock creators found to delete." });
    }

    // 2. Delete their auth accounts (this automatically cascades and deletes their profiles)
    let deletedCount = 0;
    const errors = [];

    for (const mock of mocks) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(mock.user_id);
      if (error) {
        errors.push(`${mock.username}: ${error.message}`);
      } else {
        deletedCount++;
      }
    }

    return NextResponse.json({ 
      ok: true, 
      message: `Successfully deleted ${deletedCount} mock creators.`,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
