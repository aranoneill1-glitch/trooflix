import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const { userId, username, displayName, tier } = await req.json();
    
    if (!userId || !username) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("profiles").upsert({
      user_id: userId,
      username: username,
      display_name: displayName,
      tier: tier === "creator" ? "creator" : "user", // Default to 'user' to match your database
    });

    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("Signup profile error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
