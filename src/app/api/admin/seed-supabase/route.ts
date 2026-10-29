import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  // HARD STOP: this route creates auth users with a known password.
  // It must never run on Vercel/production. If you need to seed locally,
  // run `npm run dev` and hit this route from localhost.
  if (process.env.NODE_ENV === "production" || process.env.VERCEL === "1") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const results = [];

  for (let i = 1; i <= 50; i++) {
    const email = `mockcreator_${i}@trooflix.mock`;

    // 1. Create Auth User
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: "MockPassword123!",
      email_confirm: true,
    });

    if (authError) {
      results.push({ id: i, error: authError.message });
      continue;
    }

    // 2. Upsert Profile (in case the DB trigger already created it)
    const { error: profileError } = await supabase.from("profiles").upsert({
      user_id: authData.user.id,
      username: `mockcreator_${i}`,
      display_name: `Mock Creator ${i}`,
      avatar_url: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=400&h=400&fit=crop",
      bio: "This is a mock creator for preview purposes.",
      tier: "podcaster",
      is_verified: true,
    });

    if (profileError) {
      results.push({ id: i, error: profileError.message });
    } else {
      results.push({ id: i, success: true });
    }
  }

  return NextResponse.json({ results });
}
