import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET() {
  try {
    // Loop through all 50 mock creators and assign a unique face
    let updated = 0;
    for (let i = 1; i <= 50; i++) {
      const username = `mockcreator_${i}`;
      // Using pravatar to generate deterministic unique faces (1-70)
      const faceUrl = `https://i.pravatar.cc/400?img=${i}`;

      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ avatar_url: faceUrl })
        .eq("username", username);

      if (!error) updated++;
    }

    return NextResponse.json({ ok: true, message: `Updated ${updated} mock creators with real faces.` });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
